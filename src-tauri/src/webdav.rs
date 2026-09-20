//! Un bureau commun posé sur Nuage, sans rien installer.
//!
//! Nuage (apps.education.fr) est un Nextcloud : il parle WebDAV, c'est-à-dire
//! HTTP avec quelques verbes en plus (PROPFIND pour lister, MKCOL pour créer
//! un dossier). Maitrize s'y connecte directement, avec l'identifiant de
//! l'enseignant et un **mot de passe d'application** — révocable d'un clic
//! dans Nuage, et qui ne donne pas accès au compte lui-même.
//!
//! Rien n'est copié sur l'ordinateur : le dossier partagé vit chez Nuage, et
//! le Mac comme le PC y voient la même chose au même instant. En échange, il
//! faut du réseau : chaque geste est une requête.

use crate::commun::EntreeCommune;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use quick_xml::events::Event;
use quick_xml::Reader;

type R<T> = Result<T, String>;

/// De quoi joindre un dossier de Nuage.
#[derive(Clone, Debug)]
pub struct Acces {
    /// L'adresse du serveur, sans barre finale : « https://nuage03.apps.education.fr ».
    pub serveur: String,
    pub utilisateur: String,
    /// Le mot de passe d'application. Il ne quitte pas cet ordinateur.
    pub mot_de_passe: String,
    /// Le dossier partagé, relatif à la racine des fichiers ("" : toute la racine).
    pub racine: String,
}

/// Les caractères qu'une adresse accepte tels quels ; les autres s'écrivent « %XX ».
fn encoder(segment: &str) -> String {
    let mut sortie = String::with_capacity(segment.len());
    for o in segment.as_bytes() {
        let c = *o as char;
        if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '~') {
            sortie.push(c);
        } else {
            sortie.push_str(&format!("%{o:02X}"));
        }
    }
    sortie
}

/// L'adresse normalisée d'un serveur : sans barre finale, en https par défaut.
pub fn serveur_propre(brut: &str) -> String {
    let t = brut.trim().trim_end_matches('/');
    if t.is_empty() {
        return String::new();
    }
    if t.starts_with("http://") || t.starts_with("https://") {
        t.to_string()
    } else {
        format!("https://{t}")
    }
}

/// Le chemin WebDAV des fichiers d'un utilisateur, sans le serveur.
fn chemin_dav(acces: &Acces, relatif: &str) -> String {
    let mut segments: Vec<String> = vec!["remote.php".into(), "dav".into(), "files".into(), encoder(&acces.utilisateur)];
    for s in acces.racine.split('/').chain(relatif.split('/')).filter(|s| !s.is_empty()) {
        segments.push(encoder(s));
    }
    format!("/{}", segments.join("/"))
}

/// L'adresse complète d'un élément du bureau commun.
pub fn url_de(acces: &Acces, relatif: &str) -> String {
    format!("{}{}", acces.serveur, chemin_dav(acces, relatif))
}

/// L'adresse de la page web de Nuage qui montre ce dossier.
pub fn url_web(acces: &Acces, relatif: &str) -> String {
    let chemin: Vec<String> = acces.racine.split('/').chain(relatif.split('/'))
        .filter(|s| !s.is_empty()).map(encoder).collect();
    format!("{}/apps/files/?dir=/{}", acces.serveur, chemin.join("/"))
}

fn client() -> R<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent("Maitrize")
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())
}

fn autorisation(acces: &Acces) -> String {
    format!("Basic {}", STANDARD.encode(format!("{}:{}", acces.utilisateur, acces.mot_de_passe)))
}

/// Ce qu'on dit d'une réponse qui n'a pas abouti, en français.
fn erreur_http(statut: reqwest::StatusCode, quoi: &str) -> String {
    match statut.as_u16() {
        401 => "Nuage refuse l'identifiant ou le mot de passe d'application.".into(),
        403 => "Nuage refuse l'accès à ce dossier (droits insuffisants).".into(),
        404 => format!("Introuvable sur Nuage : {quoi}."),
        405 => format!("Ce nom existe déjà sur Nuage : {quoi}."),
        507 => "L'espace de stockage de Nuage est plein.".into(),
        _ => format!("Nuage a répondu {statut} ({quoi})."),
    }
}

/// Le corps d'une demande de liste : juste ce qu'une tuile affiche.
const PROPFIND: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <nc:contained-file-count/>
    <nc:contained-folder-count/>
  </d:prop>
</d:propfind>"#;

async fn propfind(acces: &Acces, relatif: &str, profondeur: &str) -> R<String> {
    let methode = reqwest::Method::from_bytes(b"PROPFIND").map_err(|e| e.to_string())?;
    let rep = client()?
        .request(methode, url_de(acces, relatif))
        .header("Authorization", autorisation(acces))
        .header("Depth", profondeur)
        .header("Content-Type", "application/xml; charset=utf-8")
        .body(PROPFIND)
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        return Err(erreur_http(rep.status(), if relatif.is_empty() { "le dossier partagé" } else { relatif }));
    }
    rep.text().await.map_err(|e| e.to_string())
}

/// Le nom local d'une balise, sans son préfixe de langage (« d: », « oc: »…).
fn nom_local(brut: &[u8]) -> String {
    let s = String::from_utf8_lossy(brut);
    s.rsplit(':').next().unwrap_or(&s).to_lowercase()
}

/// Ce qu'une réponse PROPFIND décrit, avant d'en faire des tuiles.
#[derive(Default, Debug, Clone)]
pub struct Trouve {
    pub href: String,
    pub dossier: bool,
    pub octets: u64,
    pub modifie: String,
    pub elements: usize,
}

/// Lit une réponse PROPFIND. Écrit à part : cela se teste sans réseau.
pub fn analyser_propfind(xml: &str) -> R<Vec<Trouve>> {
    let mut lecteur = Reader::from_str(xml);
    lecteur.config_mut().trim_text(true);
    let mut sortie: Vec<Trouve> = Vec::new();
    let mut courant: Option<Trouve> = None;
    let mut balise = String::new();
    let mut dans_reponse = false;
    loop {
        match lecteur.read_event() {
            Ok(Event::Start(e)) => {
                balise = nom_local(e.name().as_ref());
                match balise.as_str() {
                    "response" => { dans_reponse = true; courant = Some(Trouve::default()); }
                    "collection" => { if let Some(t) = courant.as_mut() { t.dossier = true; } }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                if nom_local(e.name().as_ref()) == "collection" {
                    if let Some(t) = courant.as_mut() { t.dossier = true; }
                }
                balise.clear();
            }
            Ok(Event::Text(t)) => {
                let texte = t.unescape().unwrap_or_default().trim().to_string();
                if texte.is_empty() || !dans_reponse { continue; }
                if let Some(c) = courant.as_mut() {
                    match balise.as_str() {
                        "href" => c.href = texte,
                        "getcontentlength" => c.octets = texte.parse().unwrap_or(0),
                        "getlastmodified" => c.modifie = texte,
                        "contained-file-count" | "contained-folder-count" => {
                            c.elements += texte.parse::<usize>().unwrap_or(0);
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::End(e)) => {
                if nom_local(e.name().as_ref()) == "response" {
                    dans_reponse = false;
                    if let Some(t) = courant.take() { sortie.push(t); }
                }
                balise.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("Réponse de Nuage illisible : {e}")),
            _ => {}
        }
    }
    Ok(sortie)
}

/// Le nom d'un élément, tiré de son adresse (« …/Maths/exo%20 1.pdf » → « exo  1.pdf »).
pub fn nom_du_href(href: &str) -> String {
    let sans_barre = href.trim_end_matches('/');
    let dernier = sans_barre.rsplit('/').next().unwrap_or(sans_barre);
    decoder(dernier)
}

/// L'inverse de `encoder` : « %C3%A9 » redevient « é ».
fn decoder(texte: &str) -> String {
    let octets = texte.as_bytes();
    let mut sortie: Vec<u8> = Vec::with_capacity(octets.len());
    let mut i = 0;
    while i < octets.len() {
        if octets[i] == b'%' && i + 2 < octets.len() {
            if let Ok(v) = u8::from_str_radix(&texte[i + 1..i + 3], 16) {
                sortie.push(v);
                i += 3;
                continue;
            }
        }
        sortie.push(octets[i]);
        i += 1;
    }
    String::from_utf8_lossy(&sortie).to_string()
}

/// La date d'un fichier, telle qu'une tuile l'attend (RFC 3339).
fn date_iso(http: &str) -> String {
    chrono::DateTime::parse_from_rfc2822(http)
        .map(|d| d.to_rfc3339())
        .unwrap_or_default()
}

/// Ce que contient un dossier du bureau commun, dossiers d'abord puis par nom.
pub async fn lister(acces: &Acces, dossier: &str) -> R<Vec<EntreeCommune>> {
    let xml = propfind(acces, dossier, "1").await?;
    let trouves = analyser_propfind(&xml)?;
    // La première réponse est le dossier lui-même : elle ne se montre pas.
    let prefixe = if dossier.is_empty() { String::new() } else { format!("{}/", dossier.trim_matches('/')) };
    let mut sortie: Vec<EntreeCommune> = Vec::new();
    for (i, t) in trouves.iter().enumerate() {
        if i == 0 {
            continue;
        }
        let nom = nom_du_href(&t.href);
        if nom.is_empty() || crate::commun::est_parasite(&nom) {
            continue;
        }
        sortie.push(EntreeCommune {
            chemin: format!("{prefixe}{nom}"),
            nom,
            dossier: t.dossier,
            octets: if t.dossier { 0 } else { t.octets },
            modifie: date_iso(&t.modifie),
            elements: t.elements,
        });
    }
    sortie.sort_by(|a, b| b.dossier.cmp(&a.dossier).then_with(|| a.nom.to_lowercase().cmp(&b.nom.to_lowercase())));
    Ok(sortie)
}

/// Tous les fichiers d'un dossier, sous-dossiers compris (pour le récupérer entier).
pub async fn fichiers(acces: &Acces, dossier: &str) -> R<Vec<String>> {
    let mut sortie = Vec::new();
    let mut a_voir = vec![dossier.to_string()];
    // Un dossier partagé peut être profond : on borne la descente plutôt que
    // de risquer une promenade sans fin sur un serveur mal en point.
    let mut visites = 0;
    while let Some(d) = a_voir.pop() {
        visites += 1;
        if visites > 200 {
            break;
        }
        for e in lister(acces, &d).await? {
            if e.dossier { a_voir.push(e.chemin); } else { sortie.push(e.chemin); }
        }
    }
    sortie.sort();
    Ok(sortie)
}

/// Le contenu d'un fichier.
pub async fn lire(acces: &Acces, chemin: &str) -> R<Vec<u8>> {
    let rep = client()?
        .get(url_de(acces, chemin))
        .header("Authorization", autorisation(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        return Err(erreur_http(rep.status(), chemin));
    }
    Ok(rep.bytes().await.map_err(|e| e.to_string())?.to_vec())
}

/// Pose un fichier (il remplace celui qui porterait le même nom).
pub async fn ecrire(acces: &Acces, chemin: &str, octets: Vec<u8>) -> R<()> {
    let rep = client()?
        .put(url_de(acces, chemin))
        .header("Authorization", autorisation(acces))
        .body(octets)
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Crée un dossier. Un dossier déjà là n'est pas une erreur.
pub async fn creer_dossier(acces: &Acces, chemin: &str) -> R<()> {
    let methode = reqwest::Method::from_bytes(b"MKCOL").map_err(|e| e.to_string())?;
    let rep = client()?
        .request(methode, url_de(acces, chemin))
        .header("Authorization", autorisation(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() || rep.status().as_u16() == 405 { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Supprime un fichier ou un dossier — pour tout le monde. Nuage le garde
/// dans sa corbeille.
pub async fn supprimer(acces: &Acces, chemin: &str) -> R<()> {
    let rep = client()?
        .delete(url_de(acces, chemin))
        .header("Authorization", autorisation(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Crée un dossier et tous ceux qui le portent : « a/b/c » demande que « a »
/// et « a/b » existent d'abord, sans quoi Nuage refuse.
pub async fn creer_dossiers(acces: &Acces, chemin: &str) -> R<()> {
    let mut jusqu_ici = String::new();
    for segment in chemin.split('/').filter(|s| !s.is_empty()) {
        if !jusqu_ici.is_empty() {
            jusqu_ici.push('/');
        }
        jusqu_ici.push_str(segment);
        creer_dossier(acces, &jusqu_ici).await?;
    }
    Ok(())
}

/// Est-ce un dossier ? (pour savoir s'il faut l'ouvrir sur le web ou le lire)
pub async fn est_dossier(acces: &Acces, chemin: &str) -> R<bool> {
    let xml = propfind(acces, chemin, "0").await?;
    Ok(analyser_propfind(&xml)?.first().map(|t| t.dossier).unwrap_or(false))
}

/// La connexion répond-elle, et le dossier existe-t-il ?
pub async fn tester(acces: &Acces) -> R<()> {
    propfind(acces, "", "0").await.map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn acces() -> Acces {
        Acces {
            serveur: "https://nuage03.apps.education.fr".into(),
            utilisateur: "clement.titet".into(),
            mot_de_passe: "secret".into(),
            racine: "Équipe IME".into(),
        }
    }

    #[test]
    fn l_adresse_echappe_ce_qui_doit_l_etre() {
        assert_eq!(
            url_de(&acces(), "cycle 1/fiche é.pdf"),
            "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/%C3%89quipe%20IME/cycle%201/fiche%20%C3%A9.pdf"
        );
        // La racine seule, sans chemin relatif.
        assert_eq!(
            url_de(&acces(), ""),
            "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/%C3%89quipe%20IME"
        );
        assert_eq!(serveur_propre("nuage03.apps.education.fr/"), "https://nuage03.apps.education.fr");
        assert_eq!(serveur_propre("  https://exemple.fr  "), "https://exemple.fr");
        assert_eq!(serveur_propre(""), "");
        assert!(url_web(&acces(), "cycle 1").ends_with("/apps/files/?dir=/%C3%89quipe%20IME/cycle%201"));
    }

    #[test]
    fn le_nom_se_relit_dans_l_adresse() {
        assert_eq!(nom_du_href("/remote.php/dav/files/c/%C3%89quipe/exo%20un.pdf"), "exo un.pdf");
        assert_eq!(nom_du_href("/remote.php/dav/files/c/Maths/"), "Maths");
    }

    /// Une réponse telle que Nextcloud la renvoie : le dossier demandé en
    /// premier, puis ce qu'il contient.
    const REPONSE: &str = r#"<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/Maths/</d:href>
    <d:propstat><d:prop>
      <d:resourcetype><d:collection/></d:resourcetype>
      <d:getlastmodified>Mon, 21 Sep 2026 08:30:00 GMT</d:getlastmodified>
      <nc:contained-file-count>3</nc:contained-file-count>
      <nc:contained-folder-count>1</nc:contained-folder-count>
    </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/fiche%20%C3%A9l%C3%A8ve.pdf</d:href>
    <d:propstat><d:prop>
      <d:resourcetype/>
      <d:getcontentlength>2048</d:getcontentlength>
      <d:getlastmodified>Sun, 20 Sep 2026 17:05:00 GMT</d:getlastmodified>
    </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/.DS_Store</d:href>
    <d:propstat><d:prop><d:resourcetype/><d:getcontentlength>6148</d:getcontentlength></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
</d:multistatus>"#;

    #[test]
    fn la_reponse_de_nuage_se_lit_comme_une_liste_de_tuiles() {
        let trouves = analyser_propfind(REPONSE).unwrap();
        assert_eq!(trouves.len(), 4);
        assert!(trouves[1].dossier && trouves[1].elements == 4);
        assert_eq!(trouves[2].octets, 2048);
        assert!(!trouves[2].dossier);
        assert_eq!(nom_du_href(&trouves[2].href), "fiche élève.pdf");
        // Une date HTTP devient une date que l'interface sait lire.
        assert!(date_iso(&trouves[2].modifie).starts_with("2026-09-20T"));
        assert_eq!(date_iso("n'importe quoi"), "");
    }

    #[test]
    fn un_xml_abime_ne_fait_pas_tomber_l_application() {
        assert!(analyser_propfind("<d:multistatus><d:response>").is_ok());
        assert!(analyser_propfind("pas du xml").is_ok());
    }
}
