//! Le bureau commun : des dossiers qu'on partage avec des collègues.
//!
//! Chacun garde son propre bureau. Le bureau commun reçoit des dossiers entiers
//! — séquences, matériel, jeux, outils, avec leurs fichiers — que chacun peut
//! déposer et récupérer, dans les deux sens. Déposer à nouveau un dossier du
//! même nom remplace le précédent dépôt de la même personne.
//!
//! Il vit sur un stockage S3 **à part**, distinct de celui des sauvegardes :
//! les amis y ont accès, et ne doivent jamais avoir celui de l'endroit où
//! dorment les sauvegardes de chacun.
//!
//! Tout y est chiffré avec la clé du bureau commun (XChaCha20-Poly1305) : le
//! stockage ne voit que du bruit. La clé voyage dans le **code** du bureau
//! commun, avec l'accès au stockage — qui a le code peut lire et déposer, comme
//! on confie une clé de salle. Il se transmet en main propre ou par un message
//! privé, et se colle sur chaque ordinateur.
//!
//! Le paquet d'un dossier est fabriqué et relu par l'interface, qui connaît les
//! fiches ; ce module ne fait que le chiffrer, le poser et le reprendre.

use crate::db::Db;
use crate::sync::{chiffrer, client, dechiffrer, S3Cfg};
use aws_sdk_s3::primitives::ByteStream;
use base64::{engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}, Engine as _};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

/// Le réglage où l'ordinateur garde le bureau commun. Il ne voyage pas, ni par
/// la synchronisation ni dans une sauvegarde : c'est une clé (voir journal.rs).
pub const CLE_COMMUN: &str = "commun";

/// Préfixe d'un code de bureau commun, pour le reconnaître d'un coup d'œil.
const PREFIXE_CODE: &str = "MZC1.";

/// Ce que contient le code d'un bureau commun : son nom, sa clé, son stockage.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Commun {
    pub v: u8,
    pub id: String,
    pub nom: String,
    /// Clé de chiffrement du bureau, 32 octets en base64.
    pub cle: String,
    pub endpoint: String,
    pub region: String,
    pub bucket: String,
    pub access: String,
    pub secret: String,
}

impl Commun {
    fn cle_32(&self) -> R<[u8; 32]> {
        let octets = STANDARD.decode(&self.cle).map_err(|_| "Clé du bureau commun illisible.".to_string())?;
        <[u8; 32]>::try_from(octets.as_slice()).map_err(|_| "Clé du bureau commun de taille invalide.".to_string())
    }
    fn stockage(&self) -> S3Cfg {
        S3Cfg {
            endpoint: self.endpoint.clone(),
            region: self.region.clone(),
            bucket: self.bucket.clone(),
            access: self.access.clone(),
            secret: self.secret.clone(),
        }
    }
    /// Le dossier du stockage qui appartient à ce bureau commun.
    fn racine(&self) -> String {
        format!("maitrize-commun/{}/", self.id)
    }
}

/// Le code à transmettre aux collègues.
pub fn encoder(c: &Commun) -> String {
    let json = serde_json::to_vec(c).unwrap_or_default();
    format!("{PREFIXE_CODE}{}", URL_SAFE_NO_PAD.encode(json))
}

/// Relit un code collé. Un code abîmé est refusé clairement, jamais « réparé ».
pub fn decoder(code: &str) -> R<Commun> {
    let brut = code.trim();
    let corps = brut
        .strip_prefix(PREFIXE_CODE)
        .ok_or_else(|| "Ce n'est pas un code de bureau commun : il commence par « MZC1. ».".to_string())?;
    let json = URL_SAFE_NO_PAD
        .decode(corps.trim())
        .map_err(|_| "Code incomplet : copiez-le en entier, sans espace ni retour à la ligne.".to_string())?;
    let c: Commun = serde_json::from_slice(&json).map_err(|_| "Code illisible.".to_string())?;
    if c.v != 1 {
        return Err("Ce code vient d'une version plus récente de Maitrize : mettez l'application à jour.".into());
    }
    if c.id.trim().is_empty() || c.endpoint.trim().is_empty() || c.bucket.trim().is_empty()
        || c.access.trim().is_empty() || c.secret.trim().is_empty()
    {
        return Err("Code incomplet : il manque l'accès au stockage.".into());
    }
    c.cle_32()?;
    Ok(c)
}

/// L'identifiant d'un dépôt : le même dossier déposé par la même personne
/// remplace le précédent, deux personnes ne s'écrasent pas.
pub fn identifiant_depot(bureau: &str, auteur: &str, dossier: &str) -> String {
    let normal = |s: &str| s.trim().to_lowercase();
    let mut h = Sha256::new();
    h.update(format!("{bureau}\u{1f}{}\u{1f}{}", normal(auteur), normal(dossier)).as_bytes());
    h.finalize().iter().take(12).map(|b| format!("{b:02x}")).collect()
}

/// Ce qu'on sait d'un dossier déposé, sans en télécharger le contenu.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Depot {
    pub id: String,
    pub dossier: String,
    pub auteur: String,
    pub date: String,
    pub elements: usize,
    pub octets: usize,
}

/// Ce que l'interface montre du bureau commun : jamais la clé seule, mais le
/// code entier, pour qu'on puisse le transmettre.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfoCommun {
    pub nom: String,
    pub code: String,
    pub endpoint: String,
    pub bucket: String,
}

fn info(c: &Commun) -> InfoCommun {
    InfoCommun { nom: c.nom.clone(), code: encoder(c), endpoint: c.endpoint.clone(), bucket: c.bucket.clone() }
}

fn lire(db: &State<'_, Db>) -> R<Commun> {
    let c = db.lock();
    let brut = crate::sync::get_setting(&c, CLE_COMMUN);
    if brut.trim().is_empty() {
        return Err("Aucun bureau commun sur cet ordinateur : créez-en un, ou collez le code reçu.".into());
    }
    serde_json::from_str(&brut).map_err(|_| "Réglage du bureau commun illisible : collez de nouveau le code.".to_string())
}

fn noter(db: &State<'_, Db>, c: &Commun) -> R<()> {
    let json = serde_json::to_string(c).map_err(e)?;
    let conn = db.lock();
    crate::sync::set_setting(&conn, CLE_COMMUN, &json)
}

/// Vérifie qu'on atteint bien le stockage, pour échouer tout de suite plutôt
/// qu'au premier dépôt.
async fn essayer(c: &Commun) -> R<()> {
    client(&c.stockage())
        .list_objects_v2()
        .bucket(&c.bucket)
        .prefix(c.racine())
        .max_keys(1)
        .send()
        .await
        .map(|_| ())
        .map_err(|err| format!("Stockage injoignable avec ces accès : {err}"))
}

#[tauri::command]
pub fn commun_info(db: State<'_, Db>) -> R<Option<InfoCommun>> {
    Ok(lire(&db).ok().map(|c| info(&c)))
}

/// Crée un bureau commun sur un stockage à part.
#[tauri::command]
pub async fn commun_creer(
    db: State<'_, Db>,
    nom: String,
    endpoint: String,
    region: String,
    bucket: String,
    access: String,
    secret: String,
) -> R<InfoCommun> {
    let mut cle = [0u8; 32];
    OsRng.fill_bytes(&mut cle);
    let c = Commun {
        v: 1,
        id: uuid::Uuid::new_v4().to_string(),
        nom: if nom.trim().is_empty() { "Bureau commun".into() } else { nom.trim().to_string() },
        cle: STANDARD.encode(cle),
        endpoint: endpoint.trim().to_string(),
        region: if region.trim().is_empty() { "us-east-1".into() } else { region.trim().to_string() },
        bucket: bucket.trim().to_string(),
        access: access.trim().to_string(),
        secret: secret.trim().to_string(),
    };
    if c.endpoint.is_empty() || c.bucket.is_empty() || c.access.is_empty() || c.secret.is_empty() {
        return Err("Renseignez l'adresse, le bucket et les deux clés du stockage partagé.".into());
    }
    essayer(&c).await?;
    noter(&db, &c)?;
    Ok(info(&c))
}

/// Rejoint un bureau commun avec le code reçu d'un collègue.
#[tauri::command]
pub async fn commun_rejoindre(db: State<'_, Db>, code: String) -> R<InfoCommun> {
    let c = decoder(&code)?;
    essayer(&c).await?;
    noter(&db, &c)?;
    Ok(info(&c))
}

/// Oublie le bureau commun sur cet ordinateur. Rien n'est effacé du stockage.
#[tauri::command]
pub fn commun_quitter(db: State<'_, Db>) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM settings WHERE cle = ?1", [CLE_COMMUN]).map_err(e)?;
    Ok(())
}

/// Les dossiers déposés, du plus récent au plus ancien.
#[tauri::command]
pub async fn commun_lister(db: State<'_, Db>) -> R<Vec<Depot>> {
    let c = lire(&db)?;
    let cle = c.cle_32()?;
    let cl = client(&c.stockage());
    let prefixe = format!("{}index/", c.racine());
    let mut depots = Vec::new();
    let mut suite: Option<String> = None;
    loop {
        let mut req = cl.list_objects_v2().bucket(&c.bucket).prefix(&prefixe);
        if let Some(s) = &suite {
            req = req.continuation_token(s);
        }
        let page = req.send().await.map_err(|err| format!("Bureau commun injoignable : {err}"))?;
        for objet in page.contents() {
            let Some(nom) = objet.key() else { continue };
            let Ok(reponse) = cl.get_object().bucket(&c.bucket).key(nom).send().await else { continue };
            let Ok(corps) = reponse.body.collect().await else { continue };
            // Un dépôt illisible (autre clé, fichier abîmé) est ignoré, pas fatal.
            let Ok(clair) = dechiffrer(&cle, corps.into_bytes().as_ref()) else { continue };
            if let Ok(d) = serde_json::from_slice::<Depot>(&clair) {
                depots.push(d);
            }
        }
        if page.is_truncated() == Some(true) {
            suite = page.next_continuation_token().map(str::to_string);
            if suite.is_none() {
                break;
            }
        } else {
            break;
        }
    }
    depots.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(depots)
}

/// Pose (ou remplace) un dossier sur le bureau commun.
///
/// `paquet` est le dossier entier, fichiers compris, tel que l'interface l'a
/// empaqueté. Le contenu part d'abord, l'annonce ensuite : un collègue ne voit
/// jamais un dépôt dont le contenu manquerait.
#[tauri::command]
pub async fn commun_deposer(
    db: State<'_, Db>,
    dossier: String,
    auteur: String,
    elements: usize,
    paquet: String,
) -> R<Depot> {
    let c = lire(&db)?;
    let cle = c.cle_32()?;
    let cl = client(&c.stockage());
    let id = identifiant_depot(&c.id, &auteur, &dossier);
    let contenu = chiffrer(&cle, paquet.as_bytes())?;
    let depot = Depot {
        id: id.clone(),
        dossier: dossier.trim().to_string(),
        auteur: auteur.trim().to_string(),
        date: chrono::Utc::now().to_rfc3339(),
        elements,
        octets: paquet.len(),
    };
    cl.put_object()
        .bucket(&c.bucket)
        .key(format!("{}dossiers/{id}.enc", c.racine()))
        .body(ByteStream::from(contenu))
        .send()
        .await
        .map_err(|err| format!("Dépôt échoué : {err}"))?;
    let annonce = chiffrer(&cle, &serde_json::to_vec(&depot).map_err(e)?)?;
    cl.put_object()
        .bucket(&c.bucket)
        .key(format!("{}index/{id}.enc", c.racine()))
        .body(ByteStream::from(annonce))
        .send()
        .await
        .map_err(|err| format!("Dépôt échoué : {err}"))?;
    Ok(depot)
}

/// Reprend le contenu d'un dossier déposé, pour le poser sur son propre bureau.
#[tauri::command]
pub async fn commun_recuperer(db: State<'_, Db>, id: String) -> R<String> {
    let c = lire(&db)?;
    let cle = c.cle_32()?;
    let cl = client(&c.stockage());
    let reponse = cl
        .get_object()
        .bucket(&c.bucket)
        .key(format!("{}dossiers/{}.enc", c.racine(), nettoyer(&id)?))
        .send()
        .await
        .map_err(|_| "Ce dossier n'est plus sur le bureau commun.".to_string())?;
    let corps = reponse.body.collect().await.map_err(e)?.into_bytes();
    let clair = dechiffrer(&cle, corps.as_ref())
        .map_err(|_| "Contenu illisible : il a été déposé avec un autre code.".to_string())?;
    String::from_utf8(clair).map_err(|_| "Contenu abîmé.".to_string())
}

/// Retire un dépôt du bureau commun (son annonce d'abord, puis son contenu).
#[tauri::command]
pub async fn commun_retirer(db: State<'_, Db>, id: String) -> R<()> {
    let c = lire(&db)?;
    let cl = client(&c.stockage());
    let id = nettoyer(&id)?;
    for partie in ["index", "dossiers"] {
        cl.delete_object()
            .bucket(&c.bucket)
            .key(format!("{}{partie}/{id}.enc", c.racine()))
            .send()
            .await
            .map_err(|err| format!("Retrait échoué : {err}"))?;
    }
    Ok(())
}

/// Un identifiant de dépôt ne peut désigner que ce qu'il désigne.
fn nettoyer(id: &str) -> R<&str> {
    if !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_hexdigit()) {
        Ok(id)
    } else {
        Err("Dépôt inconnu.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn exemple() -> Commun {
        Commun {
            v: 1,
            id: "b1".into(),
            nom: "Collègues de l'IME".into(),
            cle: STANDARD.encode([7u8; 32]),
            endpoint: "https://s3.fr-par.scw.cloud".into(),
            region: "fr-par".into(),
            bucket: "partages".into(),
            access: "AKIA".into(),
            secret: "chut".into(),
        }
    }

    #[test]
    fn un_code_se_relit_a_l_identique() {
        let c = exemple();
        let code = encoder(&c);
        assert!(code.starts_with("MZC1."));
        assert_eq!(decoder(&code).unwrap(), c);
        // Collé avec des espaces autour, il passe encore.
        assert_eq!(decoder(&format!("  {code}\n")).unwrap(), c);
    }

    #[test]
    fn un_code_abime_est_refuse_clairement() {
        assert!(decoder("MZ1.abc").unwrap_err().contains("MZC1."));
        assert!(decoder("MZC1.!!!").is_err());
        let mut sans_acces = exemple();
        sans_acces.secret = String::new();
        assert!(decoder(&encoder(&sans_acces)).unwrap_err().contains("stockage"));
        let mut mauvaise_cle = exemple();
        mauvaise_cle.cle = STANDARD.encode([1u8; 5]);
        assert!(decoder(&encoder(&mauvaise_cle)).is_err());
        let mut futur = exemple();
        futur.v = 2;
        assert!(decoder(&encoder(&futur)).unwrap_err().contains("mettez l'application à jour"));
    }

    #[test]
    fn redeposer_remplace_son_propre_depot_sans_toucher_a_celui_des_autres() {
        let a = identifiant_depot("b1", "Clément", "cycle 1");
        assert_eq!(a, identifiant_depot("b1", " clément ", "Cycle 1"));
        assert_ne!(a, identifiant_depot("b1", "Louise", "cycle 1"));
        assert_ne!(a, identifiant_depot("b1", "Clément", "cycle 2"));
        assert_ne!(a, identifiant_depot("b2", "Clément", "cycle 1"));
        assert!(nettoyer(&a).is_ok());
        assert!(nettoyer("../sauvegarde").is_err());
    }

    #[test]
    fn un_paquet_ne_se_relit_qu_avec_la_cle_du_bureau() {
        let c = exemple();
        let cle = c.cle_32().unwrap();
        let clair: &[u8] = br#"{"dossier":"cycle 1"}"#;
        let chiffre = chiffrer(&cle, clair).unwrap();
        assert_eq!(dechiffrer(&cle, &chiffre).unwrap(), clair);
        assert!(dechiffrer(&[9u8; 32], &chiffre).is_err());
    }
}
