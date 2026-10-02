//! Le téléphone relié par Nuage.
//!
//! On dicte en classe, l'ordinateur fermé dans le sac ; le soir, l'ordinateur
//! s'ouvre ailleurs, sur un autre réseau. Le partage WiFi demande que les deux
//! soient allumés ensemble, au même endroit. Ici, ils se parlent par un
//! dossier du Nuage de l'enseignant (voir `maitrize_relais`) : le téléphone y
//! dépose quand il a du réseau, l'ordinateur y relève quand il est ouvert.
//!
//! Ce module tient le côté ordinateur :
//!
//!   - **relier** : créer le dossier, un lien de partage qui n'ouvre que lui,
//!     une paire de clés. Le QR code porte le lien et la clé publique — ni
//!     l'identifiant ni le mot de passe du compte Nuage ;
//!   - **relever** : lire les dépôts, les rouvrir avec la clé privée, les
//!     ranger là où le partage WiFi les range, puis les effacer de Nuage ;
//!   - **publier** l'emploi du temps des jours à venir — une heure et un
//!     intitulé, personne dedans — pour que le téléphone sache sous quoi il
//!     enregistre.
//!
//! Le compte Nuage se garde à part (`CLE_COMPTE`) : c'est celui de Maitrize,
//! pas celui du téléphone. La synchronisation entre ordinateurs pourra s'en
//! servir à son tour, sans qu'on le redemande.

use crate::db::Db;
use crate::webdav::{self, Acces};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use maitrize_relais as relais;
use rand_core::{OsRng, RngCore};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, State};

type R<T> = Result<T, String>;

/// Le relais de cet ordinateur : le lien du dossier et les clés. Un secret (voir `journal::SECRETS`).
pub const CLE_RELAIS: &str = "telephoneRelais";
/// Le compte Nuage de Maitrize : serveur, identifiant, mot de passe d'application. Un secret.
pub const CLE_COMPTE: &str = "nuageCompte";
/// L'empreinte du dernier emploi du temps publié : on ne réécrit pas ce qui n'a pas changé.
pub const CLE_AGENDA: &str = "telephoneAgenda";

/// Le dossier du relais, à la racine du Nuage de l'enseignant.
const DOSSIER: &str = "Maitrize-Telephone";
/// Combien de jours d'emploi du temps le téléphone reçoit : de quoi tenir des
/// vacances de la Toussaint sans rouvrir l'ordinateur.
const JOURS_PUBLIES: i64 = 14;
/// Quand le lien arrive à échéance dans moins de jours que cela, on la repousse.
const MARGE_ECHEANCE: i64 = 10;
/// De combien de jours on repousse l'échéance d'un lien.
const PROLONGATION: i64 = 60;
/// Ce par quoi commence le code qu'un ordinateur donne à l'autre.
const PREFIXE_CODE_ORDINATEUR: &str = "maitrize-relais-ordinateur:";

/// Une relève à la fois : la suivante attend le prochain passage.
static EN_COURS: AtomicBool = AtomicBool::new(false);

// ── Ce que l'ordinateur garde ──────────────────────────────────────────────

/// Le relais, tel que cet ordinateur le connaît.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Relais {
    serveur: String,
    /// Le chemin WebDAV du lien, celui qui a répondu à l'appairage.
    base: String,
    jeton: String,
    #[serde(default)]
    mot_de_passe: String,
    /// La clé qui rouvre les dépôts. Elle ne quitte pas les ordinateurs de l'enseignant.
    cle_privee: String,
    cle_retour: String,
    /// Le numéro du lien chez Nuage, pour le révoquer. Vide sur l'ordinateur
    /// qui a reçu le relais par un code : seul celui qui l'a créé le révoque.
    #[serde(default)]
    lien_id: String,
    /// Le jour où Nuage fermera le lien, s'il en impose un.
    #[serde(default)]
    expire: String,
    #[serde(default)]
    cree_le: String,
}

impl Relais {
    /// De quoi joindre le dossier, par son lien.
    fn acces(&self) -> Acces {
        Acces {
            serveur: self.serveur.clone(),
            utilisateur: self.jeton.clone(),
            mot_de_passe: self.mot_de_passe.clone(),
            racine: String::new(),
            base: self.base.clone(),
        }
    }

    /// Ce que le téléphone reçoit : le lien, la clé publique, la clé du retour. Jamais la clé privée.
    fn appairage(&self) -> R<relais::Appairage> {
        let privee = relais::cle_de(&self.cle_privee)?;
        Ok(relais::Appairage {
            serveur: self.serveur.clone(),
            base: self.base.clone(),
            jeton: self.jeton.clone(),
            mot_de_passe: self.mot_de_passe.clone(),
            cle_depot: relais::cle_en_texte(&relais::publique_de(&privee)),
            cle_retour: self.cle_retour.clone(),
        })
    }
}

/// Le compte Nuage de Maitrize.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
struct CompteNuage {
    serveur: String,
    utilisateur: String,
    mot_de_passe: String,
}

impl CompteNuage {
    fn acces(&self) -> Acces {
        Acces {
            serveur: self.serveur.clone(),
            utilisateur: self.utilisateur.clone(),
            mot_de_passe: self.mot_de_passe.clone(),
            racine: String::new(),
            base: webdav::base_compte(&self.utilisateur),
        }
    }

    /// « prenom.nom — nuage03.apps.education.fr » : de quoi le reconnaître, sans rien de secret.
    fn libelle(&self) -> String {
        format!("{} — {}", self.utilisateur, hote(&self.serveur))
    }
}

fn hote(serveur: &str) -> String {
    serveur.trim_start_matches("https://").trim_start_matches("http://").trim_end_matches('/').to_string()
}

fn lire_relais(c: &Connection) -> Option<Relais> {
    serde_json::from_str::<Relais>(&crate::sync::get_setting(c, CLE_RELAIS)).ok().filter(|r| !r.jeton.is_empty())
}

fn ecrire_relais(c: &Connection, r: &Relais) -> R<()> {
    crate::sync::set_setting(c, CLE_RELAIS, &serde_json::to_string(r).map_err(|e| e.to_string())?)
}

fn lire_compte(c: &Connection) -> Option<CompteNuage> {
    serde_json::from_str::<CompteNuage>(&crate::sync::get_setting(c, CLE_COMPTE)).ok().filter(|k| !k.mot_de_passe.is_empty())
}

/// Un mot de passe pour le lien : Nuage en exige souvent un, long et mêlé.
fn mot_de_passe_du_lien() -> String {
    let mut octets = [0u8; 18];
    OsRng.fill_bytes(&mut octets);
    // Le début garantit une majuscule, une minuscule, un chiffre et un signe,
    // quel que soit le tirage : c'est ce que les règles de Nextcloud demandent.
    format!("Mz7-{}", URL_SAFE_NO_PAD.encode(octets))
}

// ── Ce que l'écran en voit ─────────────────────────────────────────────────

/// L'état du relais, pour les Réglages : rien de secret n'y figure.
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EtatRelais {
    pub relie: bool,
    /// « nuage03.apps.education.fr »
    pub serveur: String,
    /// Le dossier du relais dans Nuage, pour le reconnaître.
    pub dossier: String,
    /// Cet ordinateur a créé le lien : c'est lui qui peut le révoquer et le prolonger.
    pub proprietaire: bool,
    /// Le jour où Nuage fermera le lien, s'il en impose un.
    pub expire: String,
    pub cree_le: String,
    /// Le compte Nuage déjà connu de Maitrize, pour ne pas le redemander.
    pub compte: String,
}

fn etat(c: &Connection) -> EtatRelais {
    let compte = lire_compte(c);
    match lire_relais(c) {
        Some(r) => EtatRelais {
            relie: true,
            serveur: hote(&r.serveur),
            dossier: DOSSIER.into(),
            proprietaire: !r.lien_id.is_empty() && compte.is_some(),
            expire: r.expire,
            cree_le: r.cree_le,
            compte: compte.map(|k| k.libelle()).unwrap_or_default(),
        },
        None => EtatRelais { compte: compte.map(|k| k.libelle()).unwrap_or_default(), ..Default::default() },
    }
}

#[tauri::command]
pub fn telephone_etat(db: State<Db>) -> R<EtatRelais> {
    Ok(etat(&db.lock()))
}

/// Un compte Nuage que Maitrize connaît déjà par un bureau commun.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CompteConnu {
    /// Le bureau commun qui le porte.
    pub id: String,
    pub libelle: String,
}

/// Les comptes Nuage déjà connus : on peut relier le téléphone sans ressaisir de mot de passe.
#[tauri::command]
pub fn telephone_comptes(db: State<Db>) -> R<Vec<CompteConnu>> {
    Ok(crate::commun::comptes_nuage(&db)
        .into_iter()
        .map(|b| CompteConnu { id: b.id, libelle: format!("{} — {}", b.utilisateur, hote(&b.serveur)) })
        .collect())
}

// ── Relier ─────────────────────────────────────────────────────────────────

/// Un compte Nuage saisi à l'écran.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompteSaisi {
    serveur: String,
    utilisateur: String,
    mot_de_passe: String,
}

/**
 * Relie le téléphone : le dossier, son lien, les clés.
 *
 * Le compte Nuage vient d'un bureau commun déjà connu (`bureau`), d'une
 * saisie (`compte`), ou de ce que Maitrize a déjà gardé. Rien ne s'enregistre
 * avant que Nuage ait tout accepté : un identifiant erroné se voit tout de
 * suite, pas au premier dépôt.
 *
 * Relier à nouveau remplace le relais : l'ancien lien est révoqué, et le
 * téléphone doit scanner le nouveau QR code.
 */
#[tauri::command]
pub async fn telephone_relier(
    app: AppHandle, db: State<'_, Db>, bureau: Option<String>, compte: Option<CompteSaisi>,
) -> R<EtatRelais> {
    let (compte, ancien, compte_d_avant) = {
        let connu = lire_compte(&db.lock());
        let compte_d_avant = connu.clone();
        let ancien = lire_relais(&db.lock());
        let compte = match (bureau.filter(|b| !b.trim().is_empty()), compte) {
            (Some(id), _) => crate::commun::comptes_nuage(&db)
                .into_iter()
                .find(|b| b.id == id)
                .map(|b| CompteNuage { serveur: b.serveur, utilisateur: b.utilisateur, mot_de_passe: b.mot_de_passe })
                .ok_or("Ce bureau commun n'est plus sur cet ordinateur.")?,
            (None, Some(saisi)) => {
                let k = CompteNuage {
                    serveur: webdav::serveur_propre(&saisi.serveur),
                    utilisateur: saisi.utilisateur.trim().to_string(),
                    mot_de_passe: saisi.mot_de_passe.trim().to_string(),
                };
                if k.serveur.is_empty() || k.utilisateur.is_empty() || k.mot_de_passe.is_empty() {
                    return Err("Il manque l'adresse de Nuage, l'identifiant ou le mot de passe d'application.".into());
                }
                k
            }
            (None, None) => connu.ok_or("Indiquez le compte Nuage qui portera le dossier du téléphone.")?,
        };
        (compte, ancien, compte_d_avant)
    };
    if !compte.serveur.starts_with("https://") {
        // Le lien et les dépôts passeraient en clair : le téléphone le refuserait de toute façon.
        return Err("L'adresse de Nuage doit commencer par https://.".into());
    }
    let acces = compte.acces();
    webdav::tester(&acces).await?;

    // Ce que le téléphone a déposé pour l'ancien relais ne s'ouvrira plus avec
    // la nouvelle clé : on le relève une dernière fois, puis on ferme l'ancien
    // lien — avec le compte qui l'avait créé, qui n'est pas forcément celui
    // qu'on vient de choisir.
    if let Some(vieux) = &ancien {
        let _ = relever_avec(&app, &db, vieux, false).await;
        if !vieux.lien_id.is_empty() {
            let createur = compte_d_avant.as_ref().map(|k| k.acces()).unwrap_or_else(|| acces.clone());
            let _ = webdav::supprimer_lien(&createur, &vieux.lien_id).await;
        }
    }

    webdav::creer_dossiers(&acces, &format!("{DOSSIER}/{}", relais::DOSSIER_DEPOT)).await?;
    webdav::creer_dossiers(&acces, &format!("{DOSSIER}/{}", relais::DOSSIER_RETOUR)).await?;
    let mot_de_passe = mot_de_passe_du_lien();
    let lien = webdav::creer_lien_detaille(&acces, DOSSIER, &mot_de_passe, true).await?;
    if lien.jeton.is_empty() {
        return Err("Nuage n'a pas rendu le jeton du lien.".into());
    }
    let par_le_lien = Acces {
        serveur: compte.serveur.clone(),
        utilisateur: lien.jeton.clone(),
        mot_de_passe: mot_de_passe.clone(),
        racine: String::new(),
        base: String::new(),
    };
    let base = match webdav::base_qui_repond(&par_le_lien, &webdav::bases_lien(&lien.jeton)).await {
        Ok(base) => base,
        Err(e) => {
            // Un lien qu'on ne sait pas emprunter ne doit pas rester ouvert dans Nuage.
            let _ = webdav::supprimer_lien(&acces, &lien.id).await;
            return Err(format!("Le lien du dossier a été créé, mais il ne répond pas ({e}). Il a été retiré : rien n'est relié."));
        }
    };

    let (privee, _) = relais::nouvelle_paire();
    let nouveau = Relais {
        serveur: compte.serveur.clone(),
        base,
        jeton: lien.jeton,
        mot_de_passe,
        cle_privee: relais::cle_en_texte(&privee),
        cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
        lien_id: lien.id,
        expire: lien.expire,
        cree_le: crate::models::now_iso(),
    };
    // Les dépôts restés là ont été scellés pour l'ancienne clé : plus rien ne les rouvre.
    if ancien.is_some() {
        vider_les_depots(&nouveau).await;
    }
    {
        let c = db.lock();
        ecrire_relais(&c, &nouveau)?;
        crate::sync::set_setting(&c, CLE_COMPTE, &serde_json::to_string(&compte).map_err(|e| e.to_string())?)?;
        // L'emploi du temps doit repartir, chiffré avec la nouvelle clé.
        crate::sync::set_setting(&c, CLE_AGENDA, "")?;
    }
    // Le téléphone doit trouver l'emploi du temps dès son premier passage.
    let _ = publier_si_change(&db, &nouveau).await;
    Ok(etat(&db.lock()))
}

/// Retire du dossier les dépôts qu'aucune clé ne rouvrira plus.
async fn vider_les_depots(r: &Relais) {
    let Ok(entrees) = webdav::lister(&r.acces(), relais::DOSSIER_DEPOT).await else { return };
    for e in entrees.into_iter().filter(|e| !e.dossier && relais::genre_du_nom(&e.nom).is_some()) {
        let _ = webdav::supprimer(&r.acces(), &e.chemin).await;
    }
}

/// Le code du téléphone, et son QR code.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CodeTelephone {
    pub code: String,
    pub qr_svg: String,
}

/// Le QR code à scanner avec le dictaphone. Il ouvre le dossier du relais :
/// on ne l'affiche qu'à la demande.
#[tauri::command]
pub fn telephone_code(db: State<Db>) -> R<CodeTelephone> {
    let r = lire_relais(&db.lock()).ok_or("Le téléphone n'est pas relié.")?;
    let code = r.appairage()?.en_code();
    Ok(CodeTelephone { qr_svg: crate::portable::qr_svg(&code), code })
}

/**
 * Le code à saisir sur l'autre ordinateur, pour qu'il relève lui aussi.
 *
 * Il porte le lien et la clé qui rouvre les dépôts : aussi sensible qu'un mot
 * de passe, et l'écran le dit. Les secrets ne voyagent pas par la
 * synchronisation (voir `journal::SECRETS`) ; ils passent de main en main,
 * comme le code d'appairage des ordinateurs.
 */
#[tauri::command]
pub fn telephone_code_ordinateur(db: State<Db>) -> R<String> {
    let r = lire_relais(&db.lock()).ok_or("Le téléphone n'est pas relié.")?;
    // Sans le numéro du lien : l'autre ordinateur relève, il ne révoque pas.
    let pour_l_autre = Relais { lien_id: String::new(), ..r };
    let json = serde_json::to_vec(&pour_l_autre).map_err(|e| e.to_string())?;
    Ok(format!("{PREFIXE_CODE_ORDINATEUR}{}", URL_SAFE_NO_PAD.encode(json)))
}

fn relais_du_code(code: &str) -> R<Relais> {
    let propre: String = code.chars().filter(|c| !c.is_whitespace()).collect();
    if propre.starts_with(relais::PREFIXE_CODE) {
        return Err("Ce code est celui du téléphone. Il faut celui de l'autre ordinateur : Réglages › Partage › « Code pour l'autre ordinateur ».".into());
    }
    let corps = propre.strip_prefix(PREFIXE_CODE_ORDINATEUR).ok_or("Ce code ne vient pas de Maitrize.")?;
    let octets = URL_SAFE_NO_PAD.decode(corps).map_err(|_| "Ce code est incomplet ou mal recopié.".to_string())?;
    let r: Relais = serde_json::from_slice(&octets).map_err(|_| "Ce code est incomplet ou mal recopié.".to_string())?;
    if r.jeton.is_empty() || r.base.is_empty() || !r.serveur.starts_with("https://") {
        return Err("Ce code est incomplet ou mal recopié.".into());
    }
    relais::cle_de(&r.cle_privee)?;
    relais::cle_de(&r.cle_retour)?;
    Ok(Relais { lien_id: String::new(), ..r })
}

/// Applique le code reçu de l'autre ordinateur : celui-ci relèvera aussi.
#[tauri::command]
pub async fn telephone_code_appliquer(db: State<'_, Db>, code: String) -> R<EtatRelais> {
    let r = relais_du_code(&code)?;
    // Le lien répond-il ? Un code d'avant une révocation ne servirait à rien.
    webdav::tester(&r.acces()).await.map_err(|e| lien_mort(&e).unwrap_or(e))?;
    let c = db.lock();
    ecrire_relais(&c, &r)?;
    crate::sync::set_setting(&c, CLE_AGENDA, "")?;
    Ok(etat(&c))
}

/**
 * Oublie le relais : le lien est révoqué, les clés effacées.
 *
 * Sur l'ordinateur qui a créé le lien, la révocation passe d'abord : oublier
 * sans révoquer laisserait un lien ouvert qu'on croirait fermé. Sans réseau,
 * l'enseignant choisit — attendre, ou oublier ici et supprimer le lien dans
 * Nuage (`sans_revoquer`).
 */
#[tauri::command]
pub async fn telephone_oublier(db: State<'_, Db>, sans_revoquer: bool) -> R<EtatRelais> {
    let (r, compte) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c))
    };
    if let (Some(r), Some(compte), false) = (&r, &compte, sans_revoquer) {
        if !r.lien_id.is_empty() {
            webdav::supprimer_lien(&compte.acces(), &r.lien_id).await
                .map_err(|e| format!("Le lien n'a pas pu être révoqué ({e}) : le téléphone reste relié."))?;
        }
    }
    let c = db.lock();
    crate::sync::set_setting(&c, CLE_RELAIS, "")?;
    crate::sync::set_setting(&c, CLE_AGENDA, "")?;
    Ok(etat(&c))
}

// ── Relever ────────────────────────────────────────────────────────────────

/// Ce qu'une relève a rapporté.
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Bilan {
    pub relie: bool,
    /// Une relève tournait déjà : celle-ci n'a rien fait.
    pub occupe: bool,
    pub vocaux: usize,
    pub notes: usize,
    pub pages: usize,
    /// Les pages scannées restées sur Nuage : elles attendent qu'on ouvre « Scanner avec le compagnon ».
    pub pages_en_attente: usize,
    /// Les dépôts qui ne s'ouvrent pas avec la clé de cet ordinateur.
    pub illisibles: usize,
    pub agenda_publie: bool,
    /// Ce qui n'a pas pu se ranger, dit une fois.
    pub erreur: String,
}

/// Un refus de Nuage qui veut dire que le lien ne vaut plus.
fn lien_mort(erreur: &str) -> Option<String> {
    (erreur.contains("refuse") || erreur.contains("Introuvable") || erreur.contains("n'existe pas")).then(|| {
        "Le dossier du téléphone ne répond plus : son lien a été supprimé dans Nuage, ou il a expiré. Reliez à nouveau le téléphone.".to_string()
    })
}

/**
 * Relève les dépôts d'un relais, un par un : lire, rouvrir, ranger, effacer.
 *
 * `ranger` reçoit l'étiquette et le contenu, et dit si le dépôt était neuf.
 * Un dépôt n'est effacé de Nuage qu'une fois rangé : une coupure entre les
 * deux le fera relever une seconde fois, et il se reconnaîtra à son
 * identifiant. Un dépôt qui ne s'ouvre pas reste où il est, et se compte.
 *
 * `pages` choisit ce qu'on relève : les pages scannées seulement, ou tout le
 * reste. Les pages n'ont de sens que devant la fenêtre qui les attend.
 */
async fn relever_dans(
    r: &Relais, pages: bool, mut ranger: impl FnMut(&relais::Etiquette, &[u8]) -> R<bool>,
) -> R<Bilan> {
    let privee = relais::cle_de(&r.cle_privee)?;
    let acces = r.acces();
    let entrees = webdav::lister(&acces, relais::DOSSIER_DEPOT).await.map_err(|e| lien_mort(&e).unwrap_or(e))?;
    let mut bilan = Bilan { relie: true, ..Default::default() };
    for e in entrees.into_iter().filter(|e| !e.dossier) {
        let Some(genre) = relais::genre_du_nom(&e.nom) else { continue };
        if (genre == relais::Genre::Page) != pages {
            if genre == relais::Genre::Page {
                bilan.pages_en_attente += 1;
            }
            continue;
        }
        let blob = webdav::lire(&acces, &e.chemin).await?;
        let (etiquette, contenu) = match relais::ouvrir_depot(&privee, &blob) {
            Ok(ouvert) => ouvert,
            Err(_) => { bilan.illisibles += 1; continue; }
        };
        match ranger(&etiquette, &contenu) {
            Ok(neuf) => {
                if neuf {
                    match etiquette.genre {
                        relais::Genre::Vocal => bilan.vocaux += 1,
                        relais::Genre::Note => bilan.notes += 1,
                        relais::Genre::Page => bilan.pages += 1,
                    }
                }
                // S'il ne s'efface pas, on le reverra : il est rangé, il ne se rangera pas deux fois.
                let _ = webdav::supprimer(&acces, &e.chemin).await;
            }
            Err(message) => {
                if bilan.erreur.is_empty() {
                    bilan.erreur = message;
                }
            }
        }
    }
    Ok(bilan)
}

/// L'identifiant d'un dépôt, réduit à ce qu'un nom de fichier accepte.
fn id_propre(id: &str) -> String {
    id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').take(64).collect()
}

/// Range une dictée ou une note dans la base ; une page dans les fichiers.
/// Rend le nom du fichier d'une page, pour l'annoncer à la fenêtre qui l'attend.
fn ranger(c: &Connection, dossier: &std::path::Path, e: &relais::Etiquette, contenu: &[u8]) -> R<(bool, String)> {
    let id = id_propre(&e.id);
    if id.is_empty() {
        return Err("Dépôt sans identifiant.".into());
    }
    match e.genre {
        relais::Genre::Vocal => crate::portable::ranger_vocal(c, dossier, &id, &e.debut, e.duree_s, &e.creneau, contenu).map(|n| (n, String::new())),
        relais::Genre::Note => {
            let texte = String::from_utf8_lossy(contenu);
            crate::portable::ranger_note(c, &id, &e.debut, &e.creneau, &texte).map(|n| (n, String::new()))
        }
        relais::Genre::Page => {
            if contenu.is_empty() {
                return Err("Page vide.".into());
            }
            let ext = match e.ext.as_str() { "png" => "png", "pdf" => "pdf", _ => "jpg" };
            let fichier = format!("page-{id}.{ext}");
            let chemin = dossier.join(&fichier);
            // Relevée deux fois, la page est déjà là : on ne l'annonce pas une seconde fois.
            if chemin.exists() {
                return Ok((false, fichier));
            }
            std::fs::write(&chemin, contenu).map_err(|er| format!("Écriture impossible : {er}"))?;
            Ok((true, fichier))
        }
    }
}

/// La relève d'un relais, rangée dans l'application : la base, les fichiers, les fenêtres prévenues.
async fn relever_avec(app: &AppHandle, db: &State<'_, Db>, r: &Relais, pages: bool) -> R<Bilan> {
    let dossier = crate::db::fichiers_dir();
    relever_dans(r, pages, |etiquette, contenu| {
        let (neuf, fichier) = ranger(&db.lock(), &dossier, etiquette, contenu)?;
        if neuf {
            match etiquette.genre {
                relais::Genre::Page => { let _ = app.emit("photo:recue", fichier); }
                _ => { let _ = app.emit("vocal:recu", id_propre(&etiquette.id)); }
            }
        }
        Ok(neuf)
    })
    .await
}

/// Une garde qui rend la main à la relève suivante, quoi qu'il arrive à celle-ci.
struct Garde;
impl Drop for Garde {
    fn drop(&mut self) {
        EN_COURS.store(false, Ordering::SeqCst);
    }
}

/**
 * Relève ce que le téléphone a déposé, et publie l'emploi du temps s'il a changé.
 *
 * Appelée de loin en loin par la fenêtre. Sans relais, elle ne fait rien et
 * le dit ; sans réseau, elle échoue, et la fenêtre espace ses passages.
 */
#[tauri::command]
pub async fn telephone_relever(app: AppHandle, db: State<'_, Db>) -> R<Bilan> {
    let Some(mut r) = lire_relais(&db.lock()) else { return Ok(Bilan::default()) };
    if EN_COURS.swap(true, Ordering::SeqCst) {
        return Ok(Bilan { relie: true, occupe: true, ..Default::default() });
    }
    let _garde = Garde;
    let mut bilan = relever_avec(&app, &db, &r, false).await?;
    prolonger_si_besoin(&db, &mut r).await;
    bilan.agenda_publie = publier_si_change(&db, &r).await.unwrap_or(false);
    Ok(bilan)
}

/// Relève les pages scannées : appelée tant que « Scanner avec le compagnon » est ouvert.
#[tauri::command]
pub async fn telephone_relever_pages(app: AppHandle, db: State<'_, Db>) -> R<Bilan> {
    let Some(r) = lire_relais(&db.lock()) else { return Ok(Bilan::default()) };
    relever_avec(&app, &db, &r, true).await
}

// ── L'échéance du lien ─────────────────────────────────────────────────────

/// Faut-il repousser l'échéance ? Oui quand elle tombe dans moins de `MARGE_ECHEANCE` jours.
fn doit_prolonger(expire: &str, aujourd_hui: chrono::NaiveDate) -> bool {
    match chrono::NaiveDate::parse_from_str(expire, "%Y-%m-%d") {
        Ok(jour) => (jour - aujourd_hui).num_days() < MARGE_ECHEANCE,
        Err(_) => false,
    }
}

/// Repousse l'échéance du lien quand Nuage en impose une — sur l'ordinateur qui l'a créé.
async fn prolonger_si_besoin(db: &State<'_, Db>, r: &mut Relais) {
    let aujourd_hui = chrono::Local::now().date_naive();
    if r.lien_id.is_empty() || !doit_prolonger(&r.expire, aujourd_hui) {
        return;
    }
    let Some(compte) = lire_compte(&db.lock()) else { return };
    let jusqu_au = (aujourd_hui + chrono::Duration::days(PROLONGATION)).format("%Y-%m-%d").to_string();
    if let Ok(nouvelle) = webdav::prolonger_lien(&compte.acces(), &r.lien_id, &jusqu_au).await {
        if !nouvelle.is_empty() && nouvelle != r.expire {
            r.expire = nouvelle;
            let _ = ecrire_relais(&db.lock(), r);
        }
    }
}

// ── L'emploi du temps pour le téléphone ────────────────────────────────────

/**
 * Les créneaux des jours à venir : une heure et un intitulé, rien d'autre.
 *
 * Ni le prévu ni le bilan, qui parlent des élèves. Un jour sans créneau y
 * figure vide : le téléphone sait alors que c'est un jour sans classe.
 */
fn agenda(c: &Connection, depuis: chrono::NaiveDate, jours: i64) -> R<relais::Agenda> {
    let mut st = c
        .prepare("SELECT id, heure_debut, heure_fin, matiere FROM creneaux WHERE substr(date,1,10) = ?1 ORDER BY heure_debut")
        .map_err(|e| e.to_string())?;
    let mut sortie = Vec::new();
    for k in 0..jours {
        let jour = (depuis + chrono::Duration::days(k)).format("%Y-%m-%d").to_string();
        let creneaux = st
            .query_map([&jour], |l| {
                Ok(relais::Creneau {
                    id: l.get(0)?,
                    debut: l.get(1)?,
                    fin: l.get(2)?,
                    matiere: l.get::<_, Option<String>>(3)?.unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        sortie.push(relais::Journee { jour, creneaux });
    }
    Ok(relais::Agenda { publie: String::new(), jours: sortie })
}

/// De quoi savoir si l'emploi du temps a changé, sans le garder.
fn empreinte(a: &relais::Agenda) -> String {
    let json = serde_json::to_vec(&a.jours).unwrap_or_default();
    Sha256::digest(&json).iter().map(|o| format!("{o:02x}")).collect()
}

/// Publie l'emploi du temps s'il n'est plus celui qu'on a publié. Rend vrai s'il est parti.
async fn publier_si_change(db: &State<'_, Db>, r: &Relais) -> R<bool> {
    let (mut a, deja) = {
        let c = db.lock();
        (agenda(&c, chrono::Local::now().date_naive(), JOURS_PUBLIES)?, crate::sync::get_setting(&c, CLE_AGENDA))
    };
    let trace = empreinte(&a);
    if trace == deja {
        return Ok(false);
    }
    a.publie = crate::models::now_iso();
    publier(r, &a).await?;
    crate::sync::set_setting(&db.lock(), CLE_AGENDA, &trace)?;
    Ok(true)
}

/// Écrit l'emploi du temps, chiffré, dans le dossier du retour.
async fn publier(r: &Relais, a: &relais::Agenda) -> R<()> {
    let blob = relais::chiffrer_agenda(&relais::cle_de(&r.cle_retour)?, a)?;
    webdav::ecrire(&r.acces(), &format!("{}/{}", relais::DOSSIER_RETOUR, relais::FICHIER_AGENDA), blob).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use std::sync::{Arc, Mutex};

    /// Un Nuage de poche : il garde des fichiers, et répond comme un lien de partage.
    struct FauxNuage {
        adresse: String,
        fichiers: Arc<Mutex<BTreeMap<String, Vec<u8>>>>,
        arret: Arc<AtomicBool>,
    }

    const JETON: &str = "aBcD1234";
    const MOT_DE_PASSE: &str = "Mz7-secret";
    const BASE: &str = "public.php/webdav";

    impl FauxNuage {
        fn demarrer() -> FauxNuage {
            use base64::engine::general_purpose::STANDARD;
            let serveur = tiny_http::Server::http("127.0.0.1:0").unwrap();
            let adresse = format!("http://{}", serveur.server_addr().to_ip().unwrap());
            let fichiers: Arc<Mutex<BTreeMap<String, Vec<u8>>>> = Arc::default();
            let arret = Arc::new(AtomicBool::new(false));
            let (f, a) = (fichiers.clone(), arret.clone());
            let attendu = format!("Basic {}", STANDARD.encode(format!("{JETON}:{MOT_DE_PASSE}")));
            std::thread::spawn(move || {
                while !a.load(Ordering::Relaxed) {
                    let Ok(Some(mut req)) = serveur.recv_timeout(std::time::Duration::from_millis(50)) else { continue };
                    let autorise = req.headers().iter().any(|h| h.field.equiv("Authorization") && h.value.as_str() == attendu);
                    let chemin = req.url().trim_start_matches(&format!("/{BASE}")).trim_matches('/').to_string();
                    let methode = req.method().as_str().to_uppercase();
                    let profondeur = req.headers().iter().find(|h| h.field.equiv("Depth")).map(|h| h.value.as_str().to_string()).unwrap_or_default();
                    let mut corps = Vec::new();
                    let _ = std::io::Read::read_to_end(req.as_reader(), &mut corps);
                    let repondre = |req: tiny_http::Request, code: u16, texte: Vec<u8>| {
                        let _ = req.respond(tiny_http::Response::from_data(texte).with_status_code(code));
                    };
                    if !autorise {
                        repondre(req, 401, Vec::new());
                        continue;
                    }
                    let mut garde = f.lock().unwrap();
                    match methode.as_str() {
                        "PUT" => { garde.insert(chemin, corps); drop(garde); repondre(req, 201, Vec::new()); }
                        "GET" => match garde.get(&chemin).cloned() {
                            Some(octets) => { drop(garde); repondre(req, 200, octets); }
                            None => { drop(garde); repondre(req, 404, Vec::new()); }
                        },
                        "DELETE" => {
                            let code = if garde.remove(&chemin).is_some() { 204 } else { 404 };
                            drop(garde);
                            repondre(req, code, Vec::new());
                        }
                        "MKCOL" => { drop(garde); repondre(req, 201, Vec::new()); }
                        "PROPFIND" => {
                            let dossier = if chemin.is_empty() { String::new() } else { format!("{chemin}/") };
                            let mut xml = format!(
                                "<?xml version=\"1.0\"?><d:multistatus xmlns:d=\"DAV:\"><d:response><d:href>/{BASE}/{dossier}</d:href>\
                                 <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>");
                            if profondeur == "1" {
                                for (nom, octets) in garde.iter().filter(|(n, _)| n.starts_with(&dossier) && !n[dossier.len()..].contains('/')) {
                                    xml.push_str(&format!(
                                        "<d:response><d:href>/{BASE}/{nom}</d:href><d:propstat><d:prop><d:resourcetype/>\
                                         <d:getcontentlength>{}</d:getcontentlength><d:getlastmodified>Fri, 02 Oct 2026 10:00:00 GMT</d:getlastmodified>\
                                         </d:prop></d:propstat></d:response>", octets.len()));
                                }
                            }
                            xml.push_str("</d:multistatus>");
                            drop(garde);
                            repondre(req, 207, xml.into_bytes());
                        }
                        _ => { drop(garde); repondre(req, 405, Vec::new()); }
                    }
                }
            });
            FauxNuage { adresse, fichiers, arret }
        }

        fn noms(&self) -> Vec<String> {
            self.fichiers.lock().unwrap().keys().cloned().collect()
        }
    }

    impl Drop for FauxNuage {
        fn drop(&mut self) {
            self.arret.store(true, Ordering::Relaxed);
        }
    }

    fn relais_sur(nuage: &FauxNuage) -> Relais {
        let (privee, _) = relais::nouvelle_paire();
        Relais {
            serveur: nuage.adresse.clone(),
            base: BASE.into(),
            jeton: JETON.into(),
            mot_de_passe: MOT_DE_PASSE.into(),
            cle_privee: relais::cle_en_texte(&privee),
            cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
            lien_id: "42".into(),
            expire: String::new(),
            cree_le: "2026-10-02T08:00:00Z".into(),
        }
    }

    fn base_de_test() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }

    fn en_attendant<T>(f: impl std::future::Future<Output = T>) -> T {
        tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap().block_on(f)
    }

    fn etiquette(genre: relais::Genre, id: &str) -> relais::Etiquette {
        relais::Etiquette {
            genre, id: id.into(), debut: "2026-10-02T10:12:00".into(),
            duree_s: if genre == relais::Genre::Vocal { 4.5 } else { 0.0 },
            creneau: "c7".into(),
            ext: if genre == relais::Genre::Page { "jpg".into() } else { String::new() },
        }
    }

    /// Ce que fait le dictaphone : sceller, puis déposer par le lien.
    async fn deposer(a: &relais::Appairage, e: &relais::Etiquette, contenu: &[u8]) {
        let blob = relais::preparer_depot(a, e, contenu).unwrap();
        relais::porte::deposer(a, &relais::nom_du_depot(e.genre, &e.id), blob).await.unwrap();
    }

    fn vocaux(c: &Connection) -> Vec<(String, String, String, String, String)> {
        let mut st = c.prepare("SELECT id, fichier, texte, etat, creneau_id FROM vocaux ORDER BY id").unwrap();
        let lignes = st.query_map([], |l| Ok((l.get(0)?, l.get(1)?, l.get(2)?, l.get(3)?, l.get(4)?))).unwrap();
        lignes.map(|l| l.unwrap()).collect()
    }

    #[test]
    fn ce_que_le_telephone_depose_se_range_sur_l_ordinateur() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            deposer(&a, &etiquette(relais::Genre::Vocal, "v1"), &vec![9u8; 4000]).await;
            deposer(&a, &etiquette(relais::Genre::Note, "n1"), "Louison a compté jusqu'à 12.".as_bytes()).await;
            deposer(&a, &etiquette(relais::Genre::Page, "p1"), &[0xFF, 0xD8, 0xFF, 1, 2, 3]).await;
            // Sur Nuage : trois fichiers fermés, aux noms qui ne disent rien.
            assert_eq!(nuage.noms(), vec!["depot/n-n1.mtz", "depot/p-p1.mtz", "depot/v-v1.mtz"]);
            assert!(!nuage.fichiers.lock().unwrap().values().any(|o| o.windows(7).any(|w| w == b"Louison")));

            let bilan = relever_dans(&r, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(bilan, Bilan { relie: true, vocaux: 1, notes: 1, pages_en_attente: 1, ..Default::default() });
            // Rangés comme par le WiFi : le son dans un fichier, la note déjà transcrite, chacun à son créneau.
            assert_eq!(vocaux(&c), vec![
                ("n1".into(), String::new(), "Louison a compté jusqu'à 12.".into(), "transcrit".into(), "c7".into()),
                ("v1".into(), "vocal-v1.wav".into(), String::new(), "recu".into(), "c7".into()),
            ]);
            assert_eq!(std::fs::read(dossier.path().join("vocal-v1.wav")).unwrap(), vec![9u8; 4000]);
            // Ce qui est rangé a quitté Nuage ; la page attend la fenêtre qui la prendra.
            assert_eq!(nuage.noms(), vec!["depot/p-p1.mtz"]);

            // Rien de neuf : la relève suivante ne range rien.
            let encore = relever_dans(&r, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(encore, Bilan { relie: true, pages_en_attente: 1, ..Default::default() });

            // « Scanner avec le compagnon » est ouvert : la page arrive.
            let mut annoncees = Vec::new();
            let pages = relever_dans(&r, true, |e, contenu| {
                let (neuf, fichier) = ranger(&c, dossier.path(), e, contenu)?;
                annoncees.push(fichier);
                Ok(neuf)
            }).await.unwrap();
            assert_eq!(pages, Bilan { relie: true, pages: 1, ..Default::default() });
            assert_eq!(annoncees, vec!["page-p1.jpg"]);
            assert_eq!(std::fs::read(dossier.path().join("page-p1.jpg")).unwrap(), vec![0xFF, 0xD8, 0xFF, 1, 2, 3]);
            assert!(nuage.noms().is_empty());
        });
    }

    #[test]
    fn un_depot_releve_deux_fois_ne_se_range_qu_une_fois() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            let e = etiquette(relais::Genre::Vocal, "3f2a-77");
            deposer(&a, &e, &vec![1u8; 500]).await;
            let ranger_ici = |e: &relais::Etiquette, contenu: &[u8]| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n);
            assert_eq!(relever_dans(&r, false, ranger_ici).await.unwrap().vocaux, 1);
            // L'effacement n'a pas abouti, ou l'autre ordinateur relève à son tour : le même dépôt revient.
            deposer(&a, &e, &vec![1u8; 500]).await;
            let seconde = relever_dans(&r, false, ranger_ici).await.unwrap();
            assert_eq!(seconde.vocaux, 0);
            assert_eq!(vocaux(&c).len(), 1);
            // Reconnu, il quitte Nuage tout de même.
            assert!(nuage.noms().is_empty());
        });
    }

    #[test]
    fn un_depot_scelle_pour_une_autre_cle_reste_ferme_et_se_compte() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            // Un téléphone resté sur l'ancien QR code scelle pour une clé que plus personne n'a.
            let mut ancien = a.clone();
            ancien.cle_depot = relais::cle_en_texte(&relais::nouvelle_paire().1);
            deposer(&ancien, &etiquette(relais::Genre::Vocal, "vieux"), &vec![1u8; 500]).await;
            deposer(&a, &etiquette(relais::Genre::Vocal, "neuf"), &vec![2u8; 500]).await;
            // Ce que Nuage ou un curieux a posé là n'est pas un dépôt.
            relais::porte::deposer(&a, "Readme.md", b"bonjour".to_vec()).await.unwrap();
            let bilan = relever_dans(&r, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(bilan, Bilan { relie: true, vocaux: 1, illisibles: 1, ..Default::default() });
            assert_eq!(vocaux(&c).len(), 1);
            // L'illisible reste où il est : on ne détruit pas ce qu'on n'a pas su lire.
            assert_eq!(nuage.noms(), vec!["depot/Readme.md", "depot/v-vieux.mtz"]);
        });
    }

    #[test]
    fn un_depot_qui_ne_se_range_pas_reste_sur_nuage_et_se_dit() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            // Un enregistrement vide : trois octets ne font pas une dictée.
            deposer(&a, &etiquette(relais::Genre::Vocal, "vide"), &[1, 2, 3]).await;
            let bilan = relever_dans(&r, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(bilan.vocaux, 0);
            assert_eq!(bilan.erreur, "Enregistrement vide.");
            assert_eq!(nuage.noms(), vec!["depot/v-vide.mtz"]);
        });
    }

    #[test]
    fn un_lien_revoque_se_dit_clairement() {
        let nuage = FauxNuage::demarrer();
        let mut r = relais_sur(&nuage);
        r.mot_de_passe = "plus le bon".into();
        let erreur = en_attendant(relever_dans(&r, false, |_, _| Ok(true))).unwrap_err();
        assert!(erreur.contains("Reliez à nouveau le téléphone"), "{erreur}");
        // Sans réseau, c'est autre chose : on ne demande pas de tout refaire pour une coupure.
        let mut ailleurs = relais_sur(&nuage);
        ailleurs.serveur = "http://127.0.0.1:9".into();
        let coupure = en_attendant(relever_dans(&ailleurs, false, |_, _| Ok(true))).unwrap_err();
        assert!(coupure.contains("injoignable"), "{coupure}");
        assert!(!coupure.contains("Reliez"), "{coupure}");
    }

    #[test]
    fn l_emploi_du_temps_publie_se_lit_sur_le_telephone() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let c = base_de_test();
        let poser = |id: &str, date: &str, debut: &str, fin: &str, matiere: &str, prevu: &str| {
            c.execute(
                "INSERT INTO creneaux (id, date, heure_debut, heure_fin, matiere, couleur, eleves_json, nature, prevu, bilan)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'blue', '[]', 'classe', ?6, 'Bilan : Louison a réussi.')",
                rusqlite::params![id, date, debut, fin, matiere, prevu],
            ).unwrap();
        };
        poser("c2", "2026-10-05", "10:30", "11:15", "Numération", "Avec Louison et Nour.");
        poser("c1", "2026-10-05", "09:00", "10:00", "Lecture", "");
        poser("c3", "2026-10-07", "09:00", "10:00", "Arts", "");
        poser("c9", "2026-11-30", "09:00", "10:00", "Trop loin", "");
        let lundi = chrono::NaiveDate::from_ymd_opt(2026, 10, 5).unwrap();
        let publie = agenda(&c, lundi, 3).unwrap();
        assert_eq!(publie.jours.len(), 3);
        assert_eq!(publie.jours[0].creneaux.iter().map(|x| format!("{} {}", x.debut, x.matiere)).collect::<Vec<_>>(), vec!["09:00 Lecture", "10:30 Numération"]);
        // Le mardi n'a rien : il figure vide, pour que le téléphone le sache.
        assert!(publie.jours[1].creneaux.is_empty());
        // Ni le prévu ni le bilan ne partent : ils parlent des élèves.
        let json = serde_json::to_string(&publie).unwrap();
        assert!(!json.contains("Louison") && !json.contains("Nour"), "{json}");

        en_attendant(async {
            publier(&r, &publie).await.unwrap();
            assert_eq!(nuage.noms(), vec!["retour/agenda.mtz"]);
            assert!(!nuage.fichiers.lock().unwrap()["retour/agenda.mtz"].windows(7).any(|w| w == b"Lecture"));
            let blob = relais::porte::lire_agenda(&a).await.unwrap().unwrap();
            let relu = relais::dechiffrer_agenda(&relais::cle_de(&a.cle_retour).unwrap(), &blob).unwrap();
            assert_eq!(relu, publie);
            assert!(relais::porte::joignable(&a).await);
        });
        // L'empreinte ne bouge que si l'emploi du temps bouge.
        assert_eq!(empreinte(&publie), empreinte(&agenda(&c, lundi, 3).unwrap()));
        poser("c4", "2026-10-06", "14:00", "15:00", "Sport", "");
        assert_ne!(empreinte(&publie), empreinte(&agenda(&c, lundi, 3).unwrap()));
    }

    #[test]
    fn le_telephone_ne_recoit_ni_la_cle_privee_ni_le_compte() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let json = serde_json::to_string(&a).unwrap();
        assert!(!json.contains(&r.cle_privee));
        assert_eq!(relais::cle_de(&a.cle_depot).unwrap(), relais::publique_de(&relais::cle_de(&r.cle_privee).unwrap()));
        // Ce que l'écran reçoit ne porte aucun secret.
        let c = base_de_test();
        ecrire_relais(&c, &r).unwrap();
        crate::sync::set_setting(&c, CLE_COMPTE, r#"{"serveur":"https://nuage03.apps.education.fr","utilisateur":"prenom.nom","motDePasse":"abcd-efgh"}"#).unwrap();
        let vu = serde_json::to_string(&etat(&c)).unwrap();
        for secret in [r.cle_privee.as_str(), r.cle_retour.as_str(), MOT_DE_PASSE, JETON, "abcd-efgh"] {
            assert!(!vu.contains(secret), "{vu}");
        }
        assert!(vu.contains("prenom.nom — nuage03.apps.education.fr"));
        assert!(etat(&c).proprietaire);
    }

    #[test]
    fn le_code_pour_l_autre_ordinateur_porte_la_cle_mais_pas_le_droit_de_revoquer() {
        let mut r = relais_sur(&FauxNuage::demarrer());
        r.serveur = "https://nuage03.apps.education.fr".into();
        let json = serde_json::to_vec(&Relais { lien_id: String::new(), ..r.clone() }).unwrap();
        let code = format!("{PREFIXE_CODE_ORDINATEUR}{}", URL_SAFE_NO_PAD.encode(json));
        let recu = relais_du_code(&format!(" {}\n{} ", &code[..50], &code[50..])).unwrap();
        assert_eq!(recu.cle_privee, r.cle_privee);
        assert!(recu.lien_id.is_empty());
        // Le code du téléphone n'est pas celui de l'ordinateur : il n'a pas la clé qui rouvre.
        let erreur = relais_du_code(&r.appairage().unwrap().en_code()).unwrap_err();
        assert!(erreur.contains("celui du téléphone"), "{erreur}");
        assert!(relais_du_code("bonjour").is_err());
        assert!(relais_du_code(&format!("{PREFIXE_CODE_ORDINATEUR}abc")).is_err());
    }

    /// Écrit le QR code d'un relais vraisemblable, pour vérifier à la main qu'il se lit.
    /// Ignoré par défaut :
    ///   MAITRIZE_SORTIE=/un/dossier cargo test qr_du_relais -- --ignored
    #[test]
    #[ignore]
    fn qr_du_relais() {
        let Ok(sortie) = std::env::var("MAITRIZE_SORTIE") else { return };
        let (privee, _) = relais::nouvelle_paire();
        let r = Relais {
            serveur: "https://nuage03.apps.education.fr".into(),
            base: "public.php/dav/files/aBcD1234EfGh567".into(),
            jeton: "aBcD1234EfGh567".into(),
            mot_de_passe: mot_de_passe_du_lien(),
            cle_privee: relais::cle_en_texte(&privee),
            cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
            ..Default::default()
        };
        let code = r.appairage().unwrap().en_code();
        std::fs::write(format!("{sortie}/relais-code.txt"), &code).unwrap();
        std::fs::write(format!("{sortie}/relais-qr.svg"), crate::portable::qr_svg(&code)).unwrap();
        println!("{} caractères", code.len());
    }

    #[test]
    fn l_echeance_se_repousse_quand_elle_approche() {
        let jour = |a, m, j| chrono::NaiveDate::from_ymd_opt(a, m, j).unwrap();
        assert!(doit_prolonger("2026-10-08", jour(2026, 10, 2)));
        assert!(doit_prolonger("2026-10-01", jour(2026, 10, 2)));
        assert!(!doit_prolonger("2026-11-30", jour(2026, 10, 2)));
        // Pas d'échéance : rien à repousser.
        assert!(!doit_prolonger("", jour(2026, 10, 2)));
    }

    #[test]
    fn le_mot_de_passe_du_lien_passe_les_regles_de_nuage() {
        let m = mot_de_passe_du_lien();
        assert!(m.len() >= 24);
        assert!(m.chars().any(|c| c.is_ascii_uppercase()) && m.chars().any(|c| c.is_ascii_lowercase()));
        assert!(m.chars().any(|c| c.is_ascii_digit()) && m.chars().any(|c| !c.is_ascii_alphanumeric()));
        assert_ne!(m, mot_de_passe_du_lien());
    }

    #[test]
    fn un_identifiant_de_depot_ne_sort_pas_du_dossier() {
        assert_eq!(id_propre("3f2a-77"), "3f2a-77");
        assert_eq!(id_propre("../../etc/passwd"), "etcpasswd");
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        let mut e = etiquette(relais::Genre::Page, "../..");
        assert!(ranger(&c, dossier.path(), &e, b"x").is_err());
        e.id = "../../x".into();
        e.ext = "exe".into();
        // Une extension inattendue devient une image : rien d'exécutable ne se pose dans les fichiers.
        assert_eq!(ranger(&c, dossier.path(), &e, b"x").unwrap(), (true, "page-x.jpg".to_string()));
        assert!(dossier.path().join("page-x.jpg").exists());
    }
}
