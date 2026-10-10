//! Le téléphone relié par Nuage.
//!
//! On dicte en classe, l'ordinateur fermé dans le sac ; le soir, l'ordinateur
//! s'ouvre ailleurs, sur un autre réseau. Le partage WiFi demande que les deux
//! soient allumés ensemble, au même endroit. Ici, ils se parlent par un
//! dossier du Nuage de l'enseignant (voir `maitrize_relais`) : le téléphone y
//! dépose quand il a du réseau, l'ordinateur y relève quand il est ouvert.
//!
//! Ce dossier n'est ouvert qu'au compte de l'enseignant : ni lien de partage,
//! ni mot de passe qui circule. L'ordinateur y entre avec le compte que
//! Maitrize garde ; le téléphone, avec un mot de passe d'application que Nuage
//! lui remet quand l'enseignant s'y connecte depuis le téléphone.
//!
//! Ce module tient le côté ordinateur :
//!
//!   - **relier** : créer le dossier et une paire de clés. Le QR code porte
//!     la clé publique et le nom du compte — aucun mot de passe ;
//!   - **relever** : lire les dépôts, les rouvrir avec la clé privée, les
//!     ranger là où le partage WiFi les range, puis les effacer de Nuage ;
//!   - **publier** l'emploi du temps des jours à venir — une heure et un
//!     intitulé, personne dedans — pour que le téléphone sache sous quoi il
//!     enregistre.
//!
//! Jusqu'en octobre 2026, le dossier s'ouvrait aussi par un lien de partage
//! protégé par un mot de passe, que le QR code portait. Un tel relais se
//! reconnaît encore (`jeton`), le temps de refermer son lien.
//!
//! Le compte Nuage se garde à part (`CLE_COMPTE`) : c'est celui de Maitrize,
//! pas celui du téléphone. La synchronisation entre ordinateurs pourra s'en
//! servir à son tour, sans qu'on le redemande.

use crate::db::Db;
use crate::webdav::{self, Acces};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use maitrize_relais as relais;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, State};

type R<T> = Result<T, String>;

/// Le relais de cet ordinateur : le compte qui porte le dossier, et les clés. Un secret (voir `journal::SECRETS`).
pub const CLE_RELAIS: &str = "telephoneRelais";
/// Le compte Nuage de Maitrize : serveur, identifiant, mot de passe d'application. Un secret.
pub const CLE_COMPTE: &str = "nuageCompte";
/// L'empreinte du dernier emploi du temps publié : on ne réécrit pas ce qui n'a pas changé.
pub const CLE_AGENDA: &str = "telephoneAgenda";
/// Quand il est parti : l'écran le dit, sinon on ne sait pas si le téléphone l'a.
pub const CLE_AGENDA_PUBLIE: &str = "telephoneAgendaPublie";
/// L'empreinte du dernier cahier journal publié pour le téléphone.
pub const CLE_JOURNAL: &str = "telephoneJournal";

/// Le dossier du relais, à la racine du Nuage de l'enseignant.
const DOSSIER: &str = "Maitrize-Telephone";
/// Combien de jours d'emploi du temps le téléphone reçoit : de quoi tenir des
/// vacances de la Toussaint sans rouvrir l'ordinateur.
const JOURS_PUBLIES: i64 = 14;
/// Et combien de jours passés : on dicte aussi sur la veille, ou sur la
/// semaine écoulée — le téléphone remonte jusqu'à deux semaines.
const JOURS_PASSES: i64 = 14;

/// Les jours que l'emploi du temps publié couvre : le premier, et combien.
fn fenetre_publiee(aujourdhui: chrono::NaiveDate) -> (chrono::NaiveDate, i64) {
    (aujourdhui - chrono::Duration::days(JOURS_PASSES), JOURS_PASSES + JOURS_PUBLIES)
}
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
    /// Le compte qui porte le dossier, tel que Nuage le nomme : le seul qui y entre.
    #[serde(default)]
    compte: String,
    /// La clé qui rouvre les dépôts. Elle ne quitte pas les ordinateurs de l'enseignant.
    cle_privee: String,
    cle_retour: String,
    #[serde(default)]
    cree_le: String,
    /// Un relais d'avant octobre 2026, ouvert par un lien de partage : son
    /// jeton le désigne, son numéro chez Nuage permet de le refermer. Vides
    /// depuis ; le mot de passe du lien, lui, ne se relit plus.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    jeton: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    lien_id: String,
}

impl Relais {
    /// Un relais d'avant, encore ouvert par un lien de partage.
    fn par_lien(&self) -> bool {
        !self.jeton.is_empty()
    }

    /// Ce que le téléphone reçoit : où est le dossier, la clé publique, la clé
    /// du retour. Ni la clé privée, ni aucun mot de passe.
    fn appairage(&self) -> R<relais::Appairage> {
        let privee = relais::cle_de(&self.cle_privee)?;
        Ok(relais::Appairage {
            serveur: self.serveur.clone(),
            compte: self.compte.clone(),
            dossier: DOSSIER.into(),
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

/// De quoi entrer dans le dossier du relais : le compte de Maitrize, dans le dossier de ce compte-là.
fn acces_au_dossier(r: &Relais, compte: &CompteNuage) -> Acces {
    // Un relais d'avant ne savait pas le nom du compte : son dossier est à la racine de celui de Maitrize.
    let porteur = if r.compte.is_empty() { &compte.utilisateur } else { &r.compte };
    Acces {
        serveur: compte.serveur.clone(),
        utilisateur: compte.utilisateur.clone(),
        mot_de_passe: compte.mot_de_passe.clone(),
        racine: DOSSIER.into(),
        base: webdav::base_compte(porteur),
    }
}

fn hote(serveur: &str) -> String {
    serveur.trim_start_matches("https://").trim_start_matches("http://").trim_end_matches('/').to_string()
}

fn lire_relais(c: &Connection) -> Option<Relais> {
    serde_json::from_str::<Relais>(&crate::sync::get_setting(c, CLE_RELAIS)).ok().filter(|r| !r.compte.is_empty() || r.par_lien())
}

fn ecrire_relais(c: &Connection, r: &Relais) -> R<()> {
    crate::sync::set_setting(c, CLE_RELAIS, &serde_json::to_string(r).map_err(|e| e.to_string())?)
}

fn lire_compte(c: &Connection) -> Option<CompteNuage> {
    serde_json::from_str::<CompteNuage>(&crate::sync::get_setting(c, CLE_COMPTE)).ok().filter(|k| !k.mot_de_passe.is_empty())
}

/// Ce qu'on dit quand le compte manque : sans lui, rien n'entre dans le dossier.
const SANS_COMPTE: &str = "Cet ordinateur ne connaît pas le compte Nuage du dossier du téléphone. Reliez à nouveau le téléphone depuis Réglages › Téléphone.";
/// Ce qu'on dit d'un relais d'avant, tant que son lien reste ouvert.
const PAR_LIEN: &str = "Le dossier du téléphone s'ouvre encore par un lien de partage : réservez-le d'abord à votre compte (Réglages › Téléphone).";

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
    /// Le compte qui seul ouvre ce dossier (« prenom.nom ») ; vide pour un relais d'avant.
    pub compte_du_dossier: String,
    /// Un relais d'avant, encore ouvert par un lien de partage : à réserver au compte.
    pub par_lien: bool,
    /// Cet ordinateur connaît le compte : c'est lui qui peut refaire le lien,
    /// et refermer celui d'un relais d'avant.
    pub proprietaire: bool,
    pub cree_le: String,
    /// Le compte Nuage déjà connu de Maitrize, pour ne pas le redemander.
    pub compte: String,
    /// Quand l'emploi du temps est parti pour la dernière fois vers le téléphone ; vide tant qu'il n'est pas parti.
    pub agenda_publie_le: String,
}

fn etat(c: &Connection) -> EtatRelais {
    let compte = lire_compte(c);
    let libelle = compte.as_ref().map(|k| k.libelle()).unwrap_or_default();
    match lire_relais(c) {
        Some(r) => EtatRelais {
            relie: true,
            serveur: hote(&r.serveur),
            dossier: DOSSIER.into(),
            proprietaire: compte.is_some() && (!r.par_lien() || !r.lien_id.is_empty()),
            par_lien: r.par_lien(),
            compte_du_dossier: r.compte,
            cree_le: r.cree_le,
            compte: libelle,
            agenda_publie_le: crate::sync::get_setting(c, CLE_AGENDA_PUBLIE),
        },
        None => EtatRelais { compte: libelle, ..Default::default() },
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

/// Le compte choisi à l'écran : celui d'un bureau commun déjà connu (`bureau`),
/// une saisie (`saisi`), ou celui que Maitrize garde déjà.
fn compte_choisi(db: &State<'_, Db>, bureau: Option<String>, saisi: Option<CompteSaisi>) -> R<CompteNuage> {
    let compte = match (bureau.filter(|b| !b.trim().is_empty()), saisi) {
        (Some(id), _) => crate::commun::comptes_nuage(db)
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
        (None, None) => lire_compte(&db.lock()).ok_or("Indiquez le compte Nuage qui portera le dossier du téléphone.")?,
    };
    if !compte.serveur.starts_with("https://") {
        // Les dépôts passeraient en clair : le téléphone le refuserait de toute façon.
        return Err("L'adresse de Nuage doit commencer par https://.".into());
    }
    Ok(compte)
}

/// Le nom du compte tel que Nuage l'écrit dans ses adresses : c'est à celui-là
/// que le téléphone devra se connecter. À défaut de réponse, l'identifiant
/// saisi, qui vient d'ouvrir les fichiers du compte.
async fn nom_du_compte(compte: &CompteNuage) -> String {
    webdav::identifiant_du_compte(&compte.acces()).await.unwrap_or_else(|_| compte.utilisateur.clone())
}

/**
 * Relie le téléphone : le dossier, les clés.
 *
 * Le compte Nuage vient d'un bureau commun déjà connu (`bureau`), d'une
 * saisie (`compte`), ou de ce que Maitrize a déjà gardé. Rien ne s'enregistre
 * avant que Nuage ait tout accepté : un identifiant erroné se voit tout de
 * suite, pas au premier dépôt.
 *
 * Relier à nouveau remplace le relais : les clés changent, et le téléphone
 * doit scanner le nouveau QR code. Un relais d'avant voit son lien de partage
 * refermé : plus personne n'entre par là.
 */
#[tauri::command]
pub async fn telephone_relier(
    app: AppHandle, db: State<'_, Db>, bureau: Option<String>, compte: Option<CompteSaisi>,
) -> R<EtatRelais> {
    let compte = compte_choisi(&db, bureau, compte)?;
    let (ancien, compte_d_avant) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c))
    };
    let acces = compte.acces();
    webdav::tester(&acces).await?;
    let nom = nom_du_compte(&compte).await;

    // L'ancien relais : on referme d'abord son lien s'il en avait un — avec le
    // compte qui l'avait créé, qui n'est pas forcément celui qu'on vient de
    // choisir —, puis on relève ce qu'il reste, avec ses clés : ce qui a été
    // scellé pour elles ne s'ouvrira plus ensuite.
    if let Some(vieux) = &ancien {
        let porteur = compte_d_avant.clone().unwrap_or_else(|| compte.clone());
        if vieux.par_lien() && !vieux.lien_id.is_empty() {
            webdav::supprimer_lien(&porteur.acces(), &vieux.lien_id).await
                .map_err(|e| format!("Le lien de partage de l'ancien relais n'a pas pu être refermé ({e}) : rien n'a changé."))?;
        }
        let _ = relever_avec(&app, &db, vieux, &porteur, false).await;
    }

    webdav::creer_dossiers(&acces, &format!("{DOSSIER}/{}", relais::DOSSIER_DEPOT)).await?;
    webdav::creer_dossiers(&acces, &format!("{DOSSIER}/{}", relais::DOSSIER_RETOUR)).await?;
    let (privee, _) = relais::nouvelle_paire();
    let nouveau = Relais {
        serveur: compte.serveur.clone(),
        compte: nom,
        cle_privee: relais::cle_en_texte(&privee),
        cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
        cree_le: crate::models::now_iso(),
        ..Default::default()
    };
    // Les dépôts restés là ont été scellés pour l'ancienne clé : plus rien ne les rouvre.
    if ancien.is_some() {
        vider_les_depots(&acces_au_dossier(&nouveau, &compte)).await;
    }
    {
        let c = db.lock();
        ecrire_relais(&c, &nouveau)?;
        crate::sync::set_setting(&c, CLE_COMPTE, &serde_json::to_string(&compte).map_err(|e| e.to_string())?)?;
        // L'emploi du temps doit repartir, chiffré avec la nouvelle clé.
        crate::sync::set_setting(&c, CLE_AGENDA, "")?;
        crate::sync::set_setting(&c, CLE_AGENDA_PUBLIE, "")?;
        crate::sync::set_setting(&c, CLE_JOURNAL, "")?;
    }
    // Le téléphone doit trouver l'emploi du temps dès son premier passage.
    let _ = publier_si_change(&db, &nouveau, &compte).await;
    Ok(etat(&db.lock()))
}

/// Retire du dossier les dépôts qu'aucune clé ne rouvrira plus.
async fn vider_les_depots(acces: &Acces) {
    let Ok(entrees) = webdav::lister(acces, relais::DOSSIER_DEPOT).await else { return };
    for e in entrees.into_iter().filter(|e| !e.dossier && relais::genre_du_nom(&e.nom).is_some()) {
        let _ = webdav::supprimer(acces, &e.chemin).await;
    }
}

/// Le QR code du téléphone.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CodeTelephone {
    pub qr_svg: String,
}

/// Le QR code à scanner avec le dictaphone. Il ne porte aucun mot de passe,
/// mais la clé de l'emploi du temps : on ne l'affiche qu'à la demande.
#[tauri::command]
pub fn telephone_code(db: State<Db>) -> R<CodeTelephone> {
    let r = lire_relais(&db.lock()).ok_or("Le téléphone n'est pas relié.")?;
    if r.par_lien() {
        return Err(PAR_LIEN.into());
    }
    Ok(CodeTelephone { qr_svg: crate::portable::qr_svg(&r.appairage()?.en_code()) })
}

/**
 * Le code à saisir sur l'autre ordinateur, pour qu'il relève lui aussi.
 *
 * Il porte la clé qui rouvre les dépôts : aussi sensible qu'un mot de passe,
 * et l'écran le dit. Pas le compte Nuage : l'autre ordinateur entre dans le
 * dossier avec le sien, qui doit être le même. Les secrets ne voyagent pas par
 * la synchronisation (voir `journal::SECRETS`) ; ils passent de main en main,
 * comme le code d'appairage des ordinateurs.
 */
#[tauri::command]
pub fn telephone_code_ordinateur(db: State<Db>) -> R<String> {
    let r = lire_relais(&db.lock()).ok_or("Le téléphone n'est pas relié.")?;
    if r.par_lien() {
        return Err(PAR_LIEN.into());
    }
    let json = serde_json::to_vec(&r).map_err(|e| e.to_string())?;
    Ok(format!("{PREFIXE_CODE_ORDINATEUR}{}", URL_SAFE_NO_PAD.encode(json)))
}

fn relais_du_code(code: &str) -> R<Relais> {
    let propre: String = code.chars().filter(|c| !c.is_whitespace()).collect();
    if propre.starts_with(relais::PREFIXE_CODE) {
        return Err("Ce code est celui du téléphone. Il faut celui de l'autre ordinateur : Réglages › Téléphone › « Un second ordinateur doit relever aussi ? ».".into());
    }
    let corps = propre.strip_prefix(PREFIXE_CODE_ORDINATEUR).ok_or("Ce code ne vient pas de Maitrize.")?;
    let octets = URL_SAFE_NO_PAD.decode(corps).map_err(|_| "Ce code est incomplet ou mal recopié.".to_string())?;
    let r: Relais = serde_json::from_slice(&octets).map_err(|_| "Ce code est incomplet ou mal recopié.".to_string())?;
    if r.par_lien() {
        return Err("Ce code vient d'un relais qui s'ouvrait par un lien de partage. Sur l'autre ordinateur, réservez d'abord le dossier à votre compte, puis recopiez le nouveau code.".into());
    }
    if r.compte.is_empty() || !r.serveur.starts_with("https://") {
        return Err("Ce code est incomplet ou mal recopié.".into());
    }
    relais::cle_de(&r.cle_privee)?;
    relais::cle_de(&r.cle_retour)?;
    Ok(r)
}

/// Applique le code reçu de l'autre ordinateur : celui-ci relèvera aussi, avec
/// le compte Nuage choisi ici — le même, puisque seul ce compte ouvre le dossier.
#[tauri::command]
pub async fn telephone_code_appliquer(
    db: State<'_, Db>, code: String, bureau: Option<String>, compte: Option<CompteSaisi>,
) -> R<EtatRelais> {
    let r = relais_du_code(&code)?;
    let compte = compte_choisi(&db, bureau, compte)?;
    webdav::tester(&compte.acces()).await?;
    let nom = nom_du_compte(&compte).await;
    if !relais::connexion::meme_compte(&nom, &r.compte) {
        return Err(format!(
            "Le dossier du téléphone est dans le compte « {} », et vous avez choisi « {nom} » : choisissez le même compte que sur l'autre ordinateur.",
            r.compte
        ));
    }
    // Le dossier est-il toujours là ? Un code d'avant un nouveau lien ne servirait à rien.
    webdav::tester(&acces_au_dossier(&r, &compte)).await.map_err(|e| acces_perdu(&e).unwrap_or(e))?;
    let c = db.lock();
    ecrire_relais(&c, &r)?;
    crate::sync::set_setting(&c, CLE_COMPTE, &serde_json::to_string(&compte).map_err(|e| e.to_string())?)?;
    crate::sync::set_setting(&c, CLE_AGENDA, "")?;
    crate::sync::set_setting(&c, CLE_AGENDA_PUBLIE, "")?;
    crate::sync::set_setting(&c, CLE_JOURNAL, "")?;
    Ok(etat(&c))
}

/**
 * Oublie le relais sur cet ordinateur : les clés s'effacent.
 *
 * Le téléphone, lui, garde son accès au compte jusqu'à ce qu'on l'oublie sur
 * le téléphone ou qu'on le retire dans Nuage : l'ordinateur n'a pas la main
 * sur les mots de passe d'application des autres appareils.
 *
 * Un relais d'avant voit d'abord son lien de partage refermé : oublier sans
 * le refermer laisserait ouvert un dossier qu'on croirait fermé. Sans
 * réseau, l'enseignant choisit — attendre, ou oublier ici et supprimer le
 * lien dans Nuage (`sans_revoquer`).
 */
#[tauri::command]
pub async fn telephone_oublier(db: State<'_, Db>, sans_revoquer: bool) -> R<EtatRelais> {
    let (r, compte) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c))
    };
    if let (Some(r), Some(compte), false) = (&r, &compte, sans_revoquer) {
        if r.par_lien() && !r.lien_id.is_empty() {
            webdav::supprimer_lien(&compte.acces(), &r.lien_id).await
                .map_err(|e| format!("Le lien n'a pas pu être révoqué ({e}) : le téléphone reste relié."))?;
        }
    }
    let c = db.lock();
    crate::sync::set_setting(&c, CLE_RELAIS, "")?;
    crate::sync::set_setting(&c, CLE_AGENDA, "")?;
    crate::sync::set_setting(&c, CLE_AGENDA_PUBLIE, "")?;
    crate::sync::set_setting(&c, CLE_JOURNAL, "")?;
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
    /// Les photos nommées, rangées dans Mes pictos.
    pub photos: usize,
    /// Les pages scannées restées sur Nuage : elles attendent qu'on ouvre « Scanner avec le compagnon ».
    pub pages_en_attente: usize,
    /// Les dépôts qui ne s'ouvrent pas avec la clé de cet ordinateur.
    pub illisibles: usize,
    pub agenda_publie: bool,
    /// Pourquoi l'emploi du temps n'a pas pu partir vers le téléphone ; vide s'il est parti, ou n'avait pas à partir.
    pub agenda_erreur: String,
    /// Ce qui n'a pas pu se ranger, dit une fois.
    pub erreur: String,
}

/// Un refus de Nuage qui veut dire que le relais ne vaut plus : il faut le refaire, pas réessayer.
fn acces_perdu(erreur: &str) -> Option<String> {
    if erreur.contains("refuse l'identifiant") {
        return Some("Nuage refuse le compte que Maitrize garde pour le téléphone : son mot de passe d'application a pu être retiré. \
                     Reliez à nouveau le téléphone, avec un nouveau mot de passe d'application.".into());
    }
    (erreur.contains("Introuvable") || erreur.contains("n'existe pas")).then(|| {
        "Le dossier du téléphone n'est plus dans votre Nuage. Reliez à nouveau le téléphone.".to_string()
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
    r: &Relais, acces: &Acces, pages: bool, mut ranger: impl FnMut(&relais::Etiquette, &[u8]) -> R<bool>,
) -> R<Bilan> {
    let privee = relais::cle_de(&r.cle_privee)?;
    let entrees = webdav::lister(acces, relais::DOSSIER_DEPOT).await.map_err(|e| acces_perdu(&e).unwrap_or(e))?;
    let mut bilan = Bilan { relie: true, ..Default::default() };
    for e in entrees.into_iter().filter(|e| !e.dossier) {
        let Some(genre) = relais::genre_du_nom(&e.nom) else { continue };
        if (genre == relais::Genre::Page) != pages {
            if genre == relais::Genre::Page {
                bilan.pages_en_attente += 1;
            }
            continue;
        }
        let blob = webdav::lire(acces, &e.chemin).await?;
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
                        relais::Genre::Photo => bilan.photos += 1,
                    }
                }
                // S'il ne s'efface pas, on le reverra : il est rangé, il ne se rangera pas deux fois.
                let _ = webdav::supprimer(acces, &e.chemin).await;
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

// ── Les photos pour Mes pictos ─────────────────────────────────────────────
//
// Une photo prise sur le téléphone arrive avec son nom. Elle se range comme
// les pictos que l'enseignant garde (voir `mesPictos.ts`) : l'image parmi les
// fichiers de l'application, sa fiche dans le réglage « pictos:<numéro> »,
// qui voyage d'un ordinateur à l'autre. Le numéro est pris dans la plage des
// photos : une feuille sait ainsi, sans rien relire, qu'elle porte une photo
// de l'enseignant et non un pictogramme d'ARASAAC.

/// La plage des numéros de photos dans Mes pictos, la première borne comprise — la même que `mesPictos.ts`.
pub const PLAGE_PHOTOS: (i64, i64) = (-2_100_000_000, -2_147_000_000);

/// Le nom d'une photo, sur une ligne, sans blancs en trop.
fn nom_de_photo(brut: &str) -> String {
    brut.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(60).collect()
}

/**
 * La fiche d'une photo dans Mes pictos ; rien si une fiche porte déjà ce
 * fichier. Le numéro part d'une empreinte de l'identifiant du dépôt, et
 * avance tant qu'il est pris.
 */
fn ficher_la_photo(c: &Connection, fichier: &str, nom: &str, date: &str, depot: &str) -> R<bool> {
    let deja: i64 = c.query_row(
        "SELECT COUNT(*) FROM settings WHERE substr(cle, 1, 7) = 'pictos:' AND valeur LIKE ?1",
        [format!("%\"fichier\":\"{fichier}\"%")], |r| r.get(0),
    ).map_err(|er| er.to_string())?;
    if deja > 0 {
        return Ok(false);
    }
    let (haut, bas) = PLAGE_PHOTOS;
    let largeur = (haut - bas - 1) as u64;
    let empreinte = depot.bytes().fold(0xcbf2_9ce4_8422_2325u64, |h, b| (h ^ b as u64).wrapping_mul(0x0000_0100_0000_01b3));
    let mut numero = haut - (empreinte % largeur) as i64;
    while crate::sync::get_setting(c, &format!("pictos:{numero}")) != "" {
        numero = if numero - 1 > bas { numero - 1 } else { haut };
    }
    let fiche = serde_json::json!({ "mot": nom, "fichier": fichier, "date": date });
    crate::sync::set_setting(c, &format!("pictos:{numero}"), &fiche.to_string())?;
    Ok(true)
}

/// Range une dictée ou une note dans la base ; une page dans les fichiers ; une photo dans Mes pictos.
/// Rend le nom du fichier d'une page, ou le nom d'une photo, pour l'annoncer à la fenêtre.
fn ranger(c: &Connection, dossier: &std::path::Path, e: &relais::Etiquette, contenu: &[u8]) -> R<(bool, String)> {
    let id = id_propre(&e.id);
    if id.is_empty() {
        return Err("Dépôt sans identifiant.".into());
    }
    match e.genre {
        relais::Genre::Vocal => crate::portable::ranger_vocal(c, dossier, &id, &e.debut, e.duree_s, &e.creneau, &e.destination, contenu)
            .map(|n| (n, String::new())),
        relais::Genre::Note => {
            let texte = String::from_utf8_lossy(contenu);
            crate::portable::ranger_note(c, &id, &e.debut, &e.creneau, &e.destination, &texte).map(|n| (n, String::new()))
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
        relais::Genre::Photo => {
            let nom = nom_de_photo(&e.nom);
            if nom.is_empty() {
                return Err("Photo sans nom.".into());
            }
            if contenu.len() < 100 || !contenu.starts_with(&[0xFF, 0xD8, 0xFF]) {
                return Err("Photo illisible.".into());
            }
            let fichier = format!("photo-{id}.jpg");
            let chemin = dossier.join(&fichier);
            // Relevée deux fois, l'image est déjà là ; sa fiche aussi, sauf si l'écriture s'était arrêtée entre les deux.
            if !chemin.exists() {
                std::fs::write(&chemin, contenu).map_err(|er| format!("Écriture impossible : {er}"))?;
            }
            let date = if e.debut.len() >= 10 && e.debut.is_char_boundary(10) { e.debut[..10].to_string() } else { chrono::Local::now().format("%Y-%m-%d").to_string() };
            let neuf = ficher_la_photo(c, &fichier, &nom, &date, &id)?;
            Ok((neuf, nom))
        }
    }
}

/// La relève d'un relais, par le compte : rangée dans l'application — la base,
/// les fichiers, les fenêtres prévenues.
async fn relever_avec(app: &AppHandle, db: &State<'_, Db>, r: &Relais, compte: &CompteNuage, pages: bool) -> R<Bilan> {
    let dossier = crate::db::fichiers_dir();
    relever_dans(r, &acces_au_dossier(r, compte), pages, |etiquette, contenu| {
        // Le fichier d'une page, le nom d'une photo : ce que la fenêtre annonce.
        let (neuf, annonce) = ranger(&db.lock(), &dossier, etiquette, contenu)?;
        if neuf {
            match etiquette.genre {
                relais::Genre::Page => { let _ = app.emit("photo:recue", annonce); }
                relais::Genre::Photo => { let _ = app.emit("picto:recu", annonce); }
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
 *
 * Un relais d'avant se relève lui aussi par le compte, et non plus par son
 * lien : ce que l'ancien dictaphone dépose arrive, en attendant qu'on
 * réserve le dossier au compte.
 */
#[tauri::command]
pub async fn telephone_relever(app: AppHandle, db: State<'_, Db>) -> R<Bilan> {
    let (r, compte) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c))
    };
    let Some(r) = r else { return Ok(Bilan::default()) };
    let compte = compte.ok_or(SANS_COMPTE)?;
    if EN_COURS.swap(true, Ordering::SeqCst) {
        return Ok(Bilan { relie: true, occupe: true, ..Default::default() });
    }
    let _garde = Garde;
    let mut bilan = relever_avec(&app, &db, &r, &compte, false).await?;
    // Un envoi manqué se dit : sinon le téléphone garde un emploi du temps périmé sans que personne le sache.
    match publier_si_change(&db, &r, &compte).await {
        Ok(parti) => bilan.agenda_publie = parti,
        Err(e) => bilan.agenda_erreur = e,
    }
    Ok(bilan)
}

/// Relève les pages scannées : appelée tant que « Scanner avec le compagnon » est ouvert.
#[tauri::command]
pub async fn telephone_relever_pages(app: AppHandle, db: State<'_, Db>) -> R<Bilan> {
    let (r, compte) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c))
    };
    let Some(r) = r else { return Ok(Bilan::default()) };
    relever_avec(&app, &db, &r, &compte.ok_or(SANS_COMPTE)?, true).await
}

// ── L'emploi du temps pour le téléphone ────────────────────────────────────

/**
 * Les créneaux des jours publiés : une heure et un intitulé, rien d'autre.
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
async fn publier_si_change(db: &State<'_, Db>, r: &Relais, compte: &CompteNuage) -> R<bool> {
    let (mut a, deja, date_connue) = {
        let c = db.lock();
        let (depuis, jours) = fenetre_publiee(chrono::Local::now().date_naive());
        (agenda(&c, depuis, jours)?, crate::sync::get_setting(&c, CLE_AGENDA), !crate::sync::get_setting(&c, CLE_AGENDA_PUBLIE).is_empty())
    };
    let trace = empreinte(&a);
    // Déjà parti, et l'on sait quand : rien à refaire. Parti avant qu'on note l'heure : on le renvoie une fois, pour la dire.
    if trace == deja && date_connue {
        return Ok(false);
    }
    a.publie = crate::models::now_iso();
    publier(r, &acces_au_dossier(r, compte), &a).await?;
    let c = db.lock();
    crate::sync::set_setting(&c, CLE_AGENDA, &trace)?;
    crate::sync::set_setting(&c, CLE_AGENDA_PUBLIE, &a.publie)?;
    Ok(true)
}

/// Écrit l'emploi du temps, chiffré, dans le dossier du retour.
async fn publier(r: &Relais, acces: &Acces, a: &relais::Agenda) -> R<()> {
    let blob = relais::chiffrer_agenda(&relais::cle_de(&r.cle_retour)?, a)?;
    webdav::ecrire(acces, &format!("{}/{}", relais::DOSSIER_RETOUR, relais::FICHIER_AGENDA), blob).await
}

// ── Le cahier journal pour le téléphone ────────────────────────────────────
//
// L'interface fabrique le cahier journal des jours publiés — le prévu, le
// bilan, la séance posée et ses aides à la tâche, dessinées comme à
// l'impression — et le confie ici : on le chiffre avec la clé du retour, et
// l'on n'envoie que ce qui a changé. Les aides vont chacune dans son fichier,
// nommé par l'empreinte de son contenu ; celles qu'aucun créneau ne cite plus
// s'en vont. Le téléphone peut ensuite les montrer aux tablettes des élèves.

/// Une aide que l'interface confie : la clé par laquelle le journal envoyé la cite, son titre, sa page.
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AideAPublier {
    pub cle: String,
    pub titre: String,
    pub html: String,
}

/// Ce qu'une publication a fait.
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BilanJournal {
    pub relie: bool,
    /// Le texte du journal est reparti.
    pub journal: bool,
    pub aides_envoyees: usize,
    pub aides_retirees: usize,
}

/**
 * Le journal tel qu'il part : chaque aide citée par l'empreinte de son contenu
 * plutôt que par la clé de l'interface ; les aides, par empreinte, une fois
 * chacune. Une citation sans aide connue disparaît.
 */
pub fn journal_a_publier(mut j: relais::Journal, aides: &[AideAPublier]) -> (relais::Journal, std::collections::BTreeMap<String, relais::Aide>) {
    let mut par_cle = std::collections::HashMap::new();
    let mut par_id = std::collections::BTreeMap::new();
    for a in aides {
        let aide = relais::Aide { titre: a.titre.clone(), html: a.html.clone() };
        let id = relais::id_de_l_aide(&aide);
        par_cle.insert(a.cle.clone(), id.clone());
        par_id.insert(id, aide);
    }
    for jour in &mut j.jours {
        for c in &mut jour.creneaux {
            c.aides = c.aides.drain(..).filter_map(|x| par_cle.get(&x.id).map(|id| relais::AideDuJournal { id: id.clone(), titre: x.titre })).collect();
        }
    }
    (j, par_id)
}

/// De quoi savoir si le journal a changé, sans le garder.
fn empreinte_du_journal(j: &relais::Journal) -> String {
    let json = serde_json::to_vec(&j.jours).unwrap_or_default();
    Sha256::digest(&json).iter().map(|o| format!("{o:02x}")).collect()
}

/// Publie le journal et ses aides dans le retour ; rend ce qui est parti, et l'empreinte du journal publié.
async fn publier_journal_dans(
    r: &Relais, acces: &Acces, j: &relais::Journal, aides: &std::collections::BTreeMap<String, relais::Aide>, deja: &str,
) -> R<(BilanJournal, String)> {
    let cle = relais::cle_de(&r.cle_retour)?;
    let dossier = format!("{}/{}", relais::DOSSIER_RETOUR, relais::DOSSIER_AIDES);
    // Ce qui est déjà sur Nuage : un dossier absent se crée, vide.
    let presents: Vec<String> = match webdav::lister(acces, &dossier).await {
        Ok(entrees) => entrees.into_iter().filter(|e| !e.dossier).filter_map(|e| e.nom.strip_suffix(".mtz").map(str::to_string)).collect(),
        Err(_) => { webdav::creer_dossiers(acces, &dossier).await?; Vec::new() }
    };
    let mut bilan = BilanJournal { relie: true, ..Default::default() };
    for (id, aide) in aides {
        if presents.contains(id) { continue; }
        let nom = relais::nom_de_l_aide(id).ok_or("Aide sans empreinte.")?;
        webdav::ecrire(acces, &format!("{dossier}/{nom}"), relais::chiffrer_aide(&cle, aide)?).await?;
        bilan.aides_envoyees += 1;
    }
    for id in presents.iter().filter(|id| !aides.contains_key(*id)) {
        if let Some(nom) = relais::nom_de_l_aide(id) {
            if webdav::supprimer(acces, &format!("{dossier}/{nom}")).await.is_ok() { bilan.aides_retirees += 1; }
        }
    }
    let trace = empreinte_du_journal(j);
    if trace != deja {
        let publie = relais::Journal { publie: crate::models::now_iso(), jours: j.jours.clone() };
        webdav::ecrire(acces, &format!("{}/{}", relais::DOSSIER_RETOUR, relais::FICHIER_JOURNAL), relais::chiffrer_journal(&cle, &publie)?).await?;
        bilan.journal = true;
    }
    Ok((bilan, trace))
}

/**
 * Publie le cahier journal pour le téléphone, s'il a changé, et ses aides à
 * la tâche. Sans relais, rien ; appelée par la relève de fond.
 */
#[tauri::command]
pub async fn telephone_publier_journal(db: State<'_, Db>, journal: relais::Journal, aides: Vec<AideAPublier>) -> R<BilanJournal> {
    let (r, compte, deja) = {
        let c = db.lock();
        (lire_relais(&c), lire_compte(&c), crate::sync::get_setting(&c, CLE_JOURNAL))
    };
    let Some(r) = r else { return Ok(BilanJournal::default()) };
    let compte = compte.ok_or(SANS_COMPTE)?;
    let (j, par_id) = journal_a_publier(journal, &aides);
    let (bilan, trace) = publier_journal_dans(&r, &acces_au_dossier(&r, &compte), &j, &par_id, &deja).await?;
    if bilan.journal {
        crate::sync::set_setting(&db.lock(), CLE_JOURNAL, &trace)?;
    }
    Ok(bilan)
}

#[cfg(test)]
mod tests {
    use super::*;
    use relais::connexion::Connexion;
    use std::collections::BTreeMap;
    use std::sync::{Arc, Mutex};

    /// Un Nuage de poche : il garde des fichiers, connaît deux mots de passe
    /// d'application du même compte — celui de l'ordinateur, celui du
    /// téléphone —, et sait mener une connexion comme le fait Nextcloud.
    struct FauxNuage {
        adresse: String,
        fichiers: Arc<Mutex<BTreeMap<String, Vec<u8>>>>,
        /// Les accès retirés, par compte.
        retires: Arc<Mutex<Vec<String>>>,
        arret: Arc<AtomicBool>,
    }

    const COMPTE: &str = "clement.titet";
    const MDP_ORDI: &str = "ordi-Mz7-secret";
    const MDP_TEL: &str = "tel-Mz7-secret";
    const BASE: &str = "remote.php/dav/files/clement.titet/Maitrize-Telephone";
    /// Combien de fois la connexion répond « pas encore » avant que l'enseignant l'accepte.
    const ATTENTES: usize = 2;

    fn basic(compte: &str, mdp: &str) -> String {
        use base64::engine::general_purpose::STANDARD;
        format!("Basic {}", STANDARD.encode(format!("{compte}:{mdp}")))
    }

    impl FauxNuage {
        fn demarrer() -> FauxNuage {
            FauxNuage::demarrer_pour(COMPTE)
        }

        /// `connecte` : le compte qu'on saisit dans la page de connexion, depuis le téléphone.
        fn demarrer_pour(connecte: &'static str) -> FauxNuage {
            let serveur = tiny_http::Server::http("127.0.0.1:0").unwrap();
            let adresse = format!("http://{}", serveur.server_addr().to_ip().unwrap());
            let fichiers: Arc<Mutex<BTreeMap<String, Vec<u8>>>> = Arc::default();
            let retires: Arc<Mutex<Vec<String>>> = Arc::default();
            let arret = Arc::new(AtomicBool::new(false));
            let (f, ret, a, ici) = (fichiers.clone(), retires.clone(), arret.clone(), adresse.clone());
            std::thread::spawn(move || {
                let mut interrogations = 0;
                while !a.load(Ordering::Relaxed) {
                    let Ok(Some(mut req)) = serveur.recv_timeout(std::time::Duration::from_millis(50)) else { continue };
                    let entete = |nom: &'static str| req.headers().iter().find(|h| h.field.equiv(nom)).map(|h| h.value.as_str().to_string()).unwrap_or_default();
                    let autorisation = entete("Authorization");
                    let profondeur = entete("Depth");
                    // Qui frappe : l'ordinateur, ou le téléphone tant qu'on ne lui a pas retiré son accès.
                    let qui = if autorisation == basic(COMPTE, MDP_ORDI) {
                        Some(COMPTE)
                    } else if autorisation == basic(connecte, MDP_TEL) && !ret.lock().unwrap().contains(&connecte.to_string()) {
                        Some(connecte)
                    } else {
                        None
                    };
                    let url = req.url().to_string();
                    let methode = req.method().as_str().to_uppercase();
                    let mut corps = Vec::new();
                    let _ = std::io::Read::read_to_end(req.as_reader(), &mut corps);
                    let repondre = |req: tiny_http::Request, code: u16, texte: Vec<u8>| {
                        let _ = req.respond(tiny_http::Response::from_data(texte).with_status_code(code));
                    };

                    // La connexion du téléphone, comme Nextcloud la mène.
                    match (methode.as_str(), url.as_str()) {
                        // La porte d'entrée commune renvoie vers le serveur de chacun, d'un chemin seul.
                        ("POST", "/index.php/login/v2") => {
                            let renvoi = tiny_http::Header::from_bytes("Location", "/porte/index.php/login/v2").unwrap();
                            let _ = req.respond(tiny_http::Response::empty(302).with_header(renvoi));
                            continue;
                        }
                        ("POST", "/porte/index.php/login/v2") => {
                            let json = format!(r#"{{"poll":{{"token":"jeton-1","endpoint":"{ici}/porte/index.php/login/v2/poll"}},"login":"{ici}/porte/index.php/login/v2/flow/jeton-1"}}"#);
                            repondre(req, 200, json.into_bytes());
                            continue;
                        }
                        ("POST", "/porte/index.php/login/v2/poll") => {
                            interrogations += 1;
                            if corps != b"token=jeton-1" || interrogations <= ATTENTES {
                                repondre(req, 404, Vec::new());
                            } else {
                                let json = format!(r#"{{"server":"{ici}","loginName":"{connecte}","appPassword":"{MDP_TEL}"}}"#);
                                repondre(req, 200, json.into_bytes());
                            }
                            continue;
                        }
                        ("GET", "/ocs/v2.php/cloud/user?format=json") => {
                            match qui {
                                Some(id) => repondre(req, 200, format!(r#"{{"ocs":{{"data":{{"id":"{id}"}}}}}}"#).into_bytes()),
                                None => repondre(req, 401, Vec::new()),
                            }
                            continue;
                        }
                        ("DELETE", "/ocs/v2.php/core/apppassword") => {
                            match qui {
                                Some(id) => { ret.lock().unwrap().push(id.to_string()); repondre(req, 200, Vec::new()); }
                                None => repondre(req, 401, Vec::new()),
                            }
                            continue;
                        }
                        _ => {}
                    }

                    // Le dossier du relais, en WebDAV : il n'est ouvert qu'au compte qui le porte.
                    if qui != Some(COMPTE) {
                        repondre(req, 401, Vec::new());
                        continue;
                    }
                    let Some(reste) = url.strip_prefix(&format!("/{BASE}")) else {
                        repondre(req, 404, Vec::new());
                        continue;
                    };
                    let chemin = reste.trim_matches('/').to_string();
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
            FauxNuage { adresse, fichiers, retires, arret }
        }

        fn noms(&self) -> Vec<String> {
            self.fichiers.lock().unwrap().keys().cloned().collect()
        }

        /// Le compte de Maitrize sur cet ordinateur.
        fn compte(&self) -> CompteNuage {
            CompteNuage { serveur: self.adresse.clone(), utilisateur: COMPTE.into(), mot_de_passe: MDP_ORDI.into() }
        }

        /// Ce que le téléphone a reçu de Nuage en se connectant.
        fn connexion(&self) -> Connexion {
            Connexion { serveur: self.adresse.clone(), identifiant: COMPTE.into(), mot_de_passe: MDP_TEL.into() }
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
            compte: COMPTE.into(),
            cle_privee: relais::cle_en_texte(&privee),
            cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
            cree_le: "2026-10-03T08:00:00Z".into(),
            ..Default::default()
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
            destination: String::new(),
            nom: String::new(),
        }
    }

    /// Ce que fait le dictaphone : sceller, puis déposer avec sa connexion au compte.
    async fn deposer(a: &relais::Appairage, k: &Connexion, e: &relais::Etiquette, contenu: &[u8]) {
        let blob = relais::preparer_depot(a, e, contenu).unwrap();
        relais::porte::deposer(a, k, &relais::nom_du_depot(e.genre, &e.id), blob).await.unwrap();
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
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            deposer(&a, &k, &etiquette(relais::Genre::Vocal, "v1"), &vec![9u8; 4000]).await;
            deposer(&a, &k, &etiquette(relais::Genre::Note, "n1"), "Louison a compté jusqu'à 12.".as_bytes()).await;
            deposer(&a, &k, &etiquette(relais::Genre::Page, "p1"), &[0xFF, 0xD8, 0xFF, 1, 2, 3]).await;
            // Sur Nuage : trois fichiers fermés, aux noms qui ne disent rien.
            assert_eq!(nuage.noms(), vec!["depot/n-n1.mtz", "depot/p-p1.mtz", "depot/v-v1.mtz"]);
            assert!(!nuage.fichiers.lock().unwrap().values().any(|o| o.windows(7).any(|w| w == b"Louison")));

            let bilan = relever_dans(&r, &acces, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
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
            let encore = relever_dans(&r, &acces, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(encore, Bilan { relie: true, pages_en_attente: 1, ..Default::default() });

            // « Scanner avec le compagnon » est ouvert : la page arrive.
            let mut annoncees = Vec::new();
            let pages = relever_dans(&r, &acces, true, |e, contenu| {
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
    fn le_cahier_journal_part_chiffre_avec_ses_aides_et_rien_ne_repart_pour_rien() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let acces = acces_au_dossier(&r, &nuage.compte());
        let retour = relais::cle_de(&r.cle_retour).unwrap();
        let aide = |cle: &str, html: &str| AideAPublier { cle: cle.into(), titre: format!("Aide {cle}"), html: html.into() };
        let journal = |aides: Vec<&str>| relais::Journal { publie: String::new(), jours: vec![relais::JourDuJournal { jour: "2026-10-12".into(), creneaux: vec![relais::CreneauDuJournal {
            id: "c1".into(), debut: "09:00".into(), fin: "10:00".into(), matiere: "Maths".into(), prevu: "Les dizaines".into(),
            bilan: "Lina a compté jusqu'à 40.".into(), seance: "Séance 2".into(),
            aides: aides.into_iter().map(|k| relais::AideDuJournal { id: k.into(), titre: format!("Aide {k}") }).collect(),
        }] }] };
        en_attendant(async {
            let (j, par_id) = journal_a_publier(journal(vec!["a", "b", "inconnue"]), &[aide("a", "<p>1</p>"), aide("b", "<p>2</p>")]);
            assert_eq!(j.jours[0].creneaux[0].aides.len(), 2, "une citation sans aide disparaît");
            let (bilan, trace) = publier_journal_dans(&r, &acces, &j, &par_id, "").await.unwrap();
            assert_eq!(bilan, BilanJournal { relie: true, journal: true, aides_envoyees: 2, aides_retirees: 0 });
            let noms = nuage.noms();
            assert!(noms.contains(&"retour/journal.mtz".to_string()));
            assert_eq!(noms.iter().filter(|n| n.starts_with("retour/aides/")).count(), 2);
            // Rien de lisible sur Nuage ; le téléphone, lui, relit tout avec la clé du retour.
            assert!(!nuage.fichiers.lock().unwrap().values().any(|o| o.windows(4).any(|w| w == b"Lina")));
            let lu = relais::dechiffrer_journal(&retour, &nuage.fichiers.lock().unwrap()["retour/journal.mtz"]).unwrap();
            assert_eq!(lu.jours[0].creneaux[0].bilan, "Lina a compté jusqu'à 40.");
            let id = lu.jours[0].creneaux[0].aides[0].id.clone();
            let blob = nuage.fichiers.lock().unwrap()[&format!("retour/aides/{id}.mtz")].clone();
            assert_eq!(relais::dechiffrer_aide(&retour, &blob).unwrap().html, "<p>1</p>");
            // Republier la même chose : rien ne repart.
            let (encore, _) = publier_journal_dans(&r, &acces, &j, &par_id, &trace).await.unwrap();
            assert_eq!(encore, BilanJournal { relie: true, ..Default::default() });
            // Une aide qui change : la nouvelle part, l'ancienne s'en va, le journal repart.
            let (j2, par_id2) = journal_a_publier(journal(vec!["a", "b"]), &[aide("a", "<p>1</p>"), aide("b", "<p>2 bis</p>")]);
            let (change, _) = publier_journal_dans(&r, &acces, &j2, &par_id2, &trace).await.unwrap();
            assert_eq!(change, BilanJournal { relie: true, journal: true, aides_envoyees: 1, aides_retirees: 1 });
            assert_eq!(nuage.noms().iter().filter(|n| n.starts_with("retour/aides/")).count(), 2);
        });
    }

    #[test]
    fn une_photo_du_telephone_se_range_dans_mes_pictos_sous_son_nom() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        let jpeg = [&[0xFF, 0xD8, 0xFF, 0xE0][..], &[5u8; 300][..]].concat();
        let photo = relais::Etiquette { nom: "  les   ciseaux ".into(), ext: "jpg".into(), ..etiquette(relais::Genre::Photo, "ph1") };
        en_attendant(async {
            deposer(&a, &k, &photo, &jpeg).await;
            assert_eq!(nuage.noms(), vec!["depot/i-ph1.mtz"]);
            // Elle n'attend pas la fenêtre des pages : la relève ordinaire la prend.
            let mut annoncees = Vec::new();
            let bilan = relever_dans(&r, &acces, false, |e, contenu| {
                let (neuf, annonce) = ranger(&c, dossier.path(), e, contenu)?;
                annoncees.push(annonce);
                Ok(neuf)
            }).await.unwrap();
            assert_eq!(bilan, Bilan { relie: true, photos: 1, ..Default::default() });
            assert_eq!(annoncees, vec!["les ciseaux"]);
            assert!(nuage.noms().is_empty());
        });
        assert_eq!(std::fs::read(dossier.path().join("photo-ph1.jpg")).unwrap(), jpeg);
        let fiches: Vec<(String, String)> = c.prepare("SELECT cle, valeur FROM settings WHERE cle LIKE 'pictos:%'").unwrap()
            .query_map([], |l| Ok((l.get(0)?, l.get(1)?))).unwrap().map(|l| l.unwrap()).collect();
        assert_eq!(fiches.len(), 1);
        let numero: i64 = fiches[0].0["pictos:".len()..].parse().unwrap();
        assert!(numero <= PLAGE_PHOTOS.0 && numero > PLAGE_PHOTOS.1, "{numero}");
        let fiche: serde_json::Value = serde_json::from_str(&fiches[0].1).unwrap();
        assert_eq!(fiche, serde_json::json!({ "mot": "les ciseaux", "fichier": "photo-ph1.jpg", "date": "2026-10-02" }));
        // Relevée une seconde fois — Nuage n'avait pas effacé —, elle ne se range pas deux fois.
        assert_eq!(ranger(&c, dossier.path(), &photo, &jpeg).unwrap(), (false, "les ciseaux".into()));
        let combien: i64 = c.query_row("SELECT COUNT(*) FROM settings WHERE cle LIKE 'pictos:%'", [], |l| l.get(0)).unwrap();
        assert_eq!(combien, 1);
        // Sans nom, ou sans image, rien ne se range.
        assert!(ranger(&c, dossier.path(), &relais::Etiquette { nom: " ".into(), ..photo.clone() }, &jpeg).is_err());
        assert!(ranger(&c, dossier.path(), &relais::Etiquette { id: "ph2".into(), ..photo }, b"pas une photo, assez longue pour passer la taille minimale de cent octets, ce qui n'en fait pas un JPEG pour autant.").is_err());
    }

    #[test]
    fn ce_qui_va_aux_notes_rapides_garde_sa_destination() {
        fn vers(genre: relais::Genre, id: &str, destination: &str) -> relais::Etiquette {
            relais::Etiquette { creneau: String::new(), destination: destination.into(), ..etiquette(genre, id) }
        }
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            deposer(&a, &k, &vers(relais::Genre::Note, "n2", relais::VERS_LES_NOTES), "Acheter des feutres".as_bytes()).await;
            deposer(&a, &k, &vers(relais::Genre::Vocal, "v2", relais::VERS_LES_NOTES), &vec![3u8; 800]).await;
            deposer(&a, &k, &etiquette(relais::Genre::Note, "n3"), "Louison a lu seul.".as_bytes()).await;
            // Une destination que cet ordinateur ne connaît pas : le cahier journal, comme avant.
            deposer(&a, &k, &vers(relais::Genre::Note, "n4", "ailleurs"), "Une note".as_bytes()).await;
            relever_dans(&r, &acces, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            let mut st = c.prepare("SELECT id, creneau_id, destination FROM vocaux ORDER BY id").unwrap();
            let rangees: Vec<(String, String, String)> =
                st.query_map([], |l| Ok((l.get(0)?, l.get(1)?, l.get(2)?))).unwrap().map(|l| l.unwrap()).collect();
            assert_eq!(rangees, vec![
                ("n2".into(), String::new(), "notes".into()),
                ("n3".into(), "c7".into(), String::new()),
                ("n4".into(), String::new(), String::new()),
                ("v2".into(), String::new(), "notes".into()),
            ]);
        });
    }

    #[test]
    fn un_depot_releve_deux_fois_ne_se_range_qu_une_fois() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            let e = etiquette(relais::Genre::Vocal, "3f2a-77");
            deposer(&a, &k, &e, &vec![1u8; 500]).await;
            let ranger_ici = |e: &relais::Etiquette, contenu: &[u8]| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n);
            assert_eq!(relever_dans(&r, &acces, false, ranger_ici).await.unwrap().vocaux, 1);
            // L'effacement n'a pas abouti, ou l'autre ordinateur relève à son tour : le même dépôt revient.
            deposer(&a, &k, &e, &vec![1u8; 500]).await;
            let seconde = relever_dans(&r, &acces, false, ranger_ici).await.unwrap();
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
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            // Un téléphone resté sur l'ancien QR code scelle pour une clé que plus personne n'a.
            let mut ancien = a.clone();
            ancien.cle_depot = relais::cle_en_texte(&relais::nouvelle_paire().1);
            deposer(&ancien, &k, &etiquette(relais::Genre::Vocal, "vieux"), &vec![1u8; 500]).await;
            deposer(&a, &k, &etiquette(relais::Genre::Vocal, "neuf"), &vec![2u8; 500]).await;
            // Ce que Nuage ou l'enseignant a posé là n'est pas un dépôt.
            relais::porte::deposer(&a, &k, "Readme.md", b"bonjour".to_vec()).await.unwrap();
            let bilan = relever_dans(&r, &acces, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
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
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
        let c = base_de_test();
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            // Un enregistrement vide : trois octets ne font pas une dictée.
            deposer(&a, &k, &etiquette(relais::Genre::Vocal, "vide"), &[1, 2, 3]).await;
            let bilan = relever_dans(&r, &acces, false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(bilan.vocaux, 0);
            assert_eq!(bilan.erreur, "Enregistrement vide.");
            assert_eq!(nuage.noms(), vec!["depot/v-vide.mtz"]);
        });
    }

    #[test]
    fn un_compte_refuse_se_dit_clairement() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        // Le mot de passe d'application de Maitrize a été retiré dans Nuage.
        let retire = CompteNuage { mot_de_passe: "plus le bon".into(), ..nuage.compte() };
        let erreur = en_attendant(relever_dans(&r, &acces_au_dossier(&r, &retire), false, |_, _| Ok(true))).unwrap_err();
        assert!(erreur.contains("Reliez à nouveau le téléphone"), "{erreur}");
        // Le dossier a disparu de Nuage : il faut le refaire, et on le dit.
        let ailleurs = Relais { compte: "nour.ben".into(), ..r.clone() };
        let disparu = en_attendant(relever_dans(&ailleurs, &acces_au_dossier(&ailleurs, &nuage.compte()), false, |_, _| Ok(true))).unwrap_err();
        assert!(disparu.contains("n'est plus dans votre Nuage"), "{disparu}");
        // Sans réseau, c'est autre chose : on ne demande pas de tout refaire pour une coupure.
        let coupe = CompteNuage { serveur: "http://127.0.0.1:9".into(), ..nuage.compte() };
        let coupure = en_attendant(relever_dans(&r, &acces_au_dossier(&r, &coupe), false, |_, _| Ok(true))).unwrap_err();
        assert!(coupure.contains("injoignable"), "{coupure}");
        assert!(!coupure.contains("Reliez"), "{coupure}");
    }

    #[test]
    fn l_ordinateur_ne_parle_a_nuage_qu_en_chiffre() {
        // Un compte saisi en http : refusé avant toute demande — l'identifiant ne part pas.
        let en_clair = CompteNuage { serveur: "http://nuage17.apps.education.fr".into(), utilisateur: "clementtitet".into(), mot_de_passe: "secret".into() };
        let erreur = en_attendant(webdav::tester(&en_clair.acces())).unwrap_err();
        assert!(erreur.contains("non chiffrée"), "{erreur}");
        let r = relais_sur(&FauxNuage::demarrer());
        let erreur = en_attendant(relever_dans(&r, &acces_au_dossier(&r, &en_clair), false, |_, _| Ok(true))).unwrap_err();
        assert!(erreur.contains("non chiffrée"), "{erreur}");
    }

    #[test]
    fn le_telephone_se_connecte_au_compte_du_dossier_et_a_lui_seul() {
        use relais::connexion;
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        en_attendant(async {
            // La demande est renvoyée vers la porte de chacun, et refaite là — pas changée en lecture.
            let d = connexion::commencer(&nuage.adresse).await.unwrap();
            assert_eq!(d.page, format!("{}/porte/index.php/login/v2/flow/jeton-1", nuage.adresse));
            // Tant que l'enseignant n'a pas accepté, Nuage n'a rien à remettre.
            for _ in 0..ATTENTES {
                assert_eq!(connexion::interroger(&d).await.unwrap(), None);
            }
            let k = connexion::interroger(&d).await.unwrap().unwrap();
            assert_eq!(k, nuage.connexion());
            // Le bon compte, et le dossier répond : la connexion se garde, et l'on dépose.
            let k = connexion::valider(&a, k).await.unwrap();
            deposer(&a, &k, &etiquette(relais::Genre::Note, "n1"), b"Une note.").await;
            assert_eq!(nuage.noms(), vec!["depot/n-n1.mtz"]);
            // Oublié sur le téléphone : son accès est retiré dans Nuage, et il n'entre plus.
            connexion::revoquer(&k).await.unwrap();
            assert_eq!(*nuage.retires.lock().unwrap(), vec![COMPTE.to_string()]);
            let blob = relais::preparer_depot(&a, &etiquette(relais::Genre::Note, "n2"), b"x").unwrap();
            let refus = relais::porte::deposer(&a, &k, "n-n2.mtz", blob).await.unwrap_err();
            assert!(refus.contains("Reconnectez-le à votre compte"), "{refus}");
        });

        // Un autre compte dans la page de connexion : refusé, et son accès retiré aussitôt.
        let ailleurs = FauxNuage::demarrer_pour("nour.ben");
        let a = relais::Appairage { serveur: ailleurs.adresse.clone(), ..r.appairage().unwrap() };
        en_attendant(async {
            let d = connexion::commencer(&ailleurs.adresse).await.unwrap();
            let mut k = None;
            while k.is_none() {
                k = connexion::interroger(&d).await.unwrap();
            }
            let erreur = connexion::valider(&a, k.unwrap()).await.unwrap_err();
            assert!(erreur.contains("« nour.ben »") && erreur.contains("« clement.titet »"), "{erreur}");
            assert_eq!(*ailleurs.retires.lock().unwrap(), vec!["nour.ben".to_string()]);
        });
    }

    #[test]
    fn l_emploi_du_temps_publie_se_lit_sur_le_telephone() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let (a, k, acces) = (r.appairage().unwrap(), nuage.connexion(), acces_au_dossier(&r, &nuage.compte()));
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
            publier(&r, &acces, &publie).await.unwrap();
            assert_eq!(nuage.noms(), vec!["retour/agenda.mtz"]);
            assert!(!nuage.fichiers.lock().unwrap()["retour/agenda.mtz"].windows(7).any(|w| w == b"Lecture"));
            let blob = relais::porte::lire_agenda(&a, &k).await.unwrap().unwrap();
            let relu = relais::dechiffrer_agenda(&relais::cle_de(&a.cle_retour).unwrap(), &blob).unwrap();
            assert_eq!(relu, publie);
            assert!(relais::porte::joignable(&a, &k).await);
        });
        // L'empreinte ne bouge que si l'emploi du temps bouge.
        assert_eq!(empreinte(&publie), empreinte(&agenda(&c, lundi, 3).unwrap()));
        poser("c4", "2026-10-06", "14:00", "15:00", "Sport", "");
        assert_ne!(empreinte(&publie), empreinte(&agenda(&c, lundi, 3).unwrap()));
    }

    #[test]
    fn l_emploi_du_temps_publie_couvre_les_deux_semaines_passees_et_les_deux_a_venir() {
        let vendredi = chrono::NaiveDate::from_ymd_opt(2026, 10, 2).unwrap();
        let (depuis, jours) = fenetre_publiee(vendredi);
        assert_eq!(depuis, chrono::NaiveDate::from_ymd_opt(2026, 9, 18).unwrap());
        assert_eq!(jours, 28);
        // La veille y est, et le dernier jour publié est dans treize jours.
        let dernier = depuis + chrono::Duration::days(jours - 1);
        assert_eq!(dernier, chrono::NaiveDate::from_ymd_opt(2026, 10, 15).unwrap());
        assert!(depuis < vendredi.pred_opt().unwrap());
    }

    #[test]
    fn le_telephone_ne_recoit_ni_la_cle_privee_ni_aucun_mot_de_passe() {
        let nuage = FauxNuage::demarrer();
        let r = relais_sur(&nuage);
        let a = r.appairage().unwrap();
        let json = serde_json::to_string(&a).unwrap();
        assert!(!json.contains(&r.cle_privee));
        assert_eq!(relais::cle_de(&a.cle_depot).unwrap(), relais::publique_de(&relais::cle_de(&r.cle_privee).unwrap()));
        // Le QR code dit où est le dossier, et dans quel compte : seul ce compte l'ouvrira.
        assert_eq!((a.compte.as_str(), a.dossier.as_str()), (COMPTE, DOSSIER));
        let octets = URL_SAFE_NO_PAD.decode(a.en_code().strip_prefix(relais::PREFIXE_CODE).unwrap()).unwrap();
        assert!(!octets.windows(MDP_ORDI.len()).any(|w| w == MDP_ORDI.as_bytes()));
        // Ce que l'écran reçoit ne porte aucun secret.
        let c = base_de_test();
        ecrire_relais(&c, &r).unwrap();
        crate::sync::set_setting(&c, CLE_COMPTE, r#"{"serveur":"https://nuage03.apps.education.fr","utilisateur":"prenom.nom","motDePasse":"abcd-efgh"}"#).unwrap();
        let vu = serde_json::to_string(&etat(&c)).unwrap();
        for secret in [r.cle_privee.as_str(), r.cle_retour.as_str(), "abcd-efgh"] {
            assert!(!vu.contains(secret), "{vu}");
        }
        assert!(vu.contains("prenom.nom — nuage03.apps.education.fr"));
        let e = etat(&c);
        assert!(e.proprietaire && !e.par_lien);
        assert_eq!(e.compte_du_dossier, COMPTE);
    }

    #[test]
    fn un_relais_d_avant_se_reconnait_se_releve_par_le_compte_et_oublie_son_mot_de_passe() {
        let nuage = FauxNuage::demarrer();
        let (privee, publique) = relais::nouvelle_paire();
        let c = base_de_test();
        // Tel que Maitrize le gardait en septembre 2026 : un lien de partage et son mot de passe.
        let avant = serde_json::json!({
            "serveur": nuage.adresse, "base": "public.php/webdav", "jeton": "aBcD1234", "motDePasse": "Mz7-ancien",
            "clePrivee": relais::cle_en_texte(&privee), "cleRetour": relais::cle_en_texte(&relais::nouvelle_cle()),
            "lienId": "42", "expire": "2026-11-01", "creeLe": "2026-09-28T08:00:00Z",
        });
        crate::sync::set_setting(&c, CLE_RELAIS, &avant.to_string()).unwrap();
        crate::sync::set_setting(&c, CLE_COMPTE, &serde_json::to_string(&nuage.compte()).unwrap()).unwrap();
        let r = lire_relais(&c).unwrap();
        assert!(r.par_lien() && r.compte.is_empty());
        assert_eq!(r.lien_id, "42");
        let e = etat(&c);
        assert!(e.relie && e.par_lien && e.proprietaire);
        // Réécrit, il ne garde plus le mot de passe du lien.
        ecrire_relais(&c, &r).unwrap();
        assert!(!crate::sync::get_setting(&c, CLE_RELAIS).contains("Mz7-ancien"));

        // Ce que l'ancien dictaphone a déposé arrive, par le compte : le dossier est le même.
        let a = relais::Appairage {
            serveur: nuage.adresse.clone(), compte: COMPTE.into(), dossier: DOSSIER.into(),
            cle_depot: relais::cle_en_texte(&publique), cle_retour: r.cle_retour.clone(),
        };
        let dossier = tempfile::tempdir().unwrap();
        en_attendant(async {
            deposer(&a, &nuage.connexion(), &etiquette(relais::Genre::Vocal, "v-avant"), &vec![3u8; 600]).await;
            let bilan = relever_dans(&r, &acces_au_dossier(&r, &nuage.compte()), false, |e, contenu| ranger(&c, dossier.path(), e, contenu).map(|(n, _)| n)).await.unwrap();
            assert_eq!(bilan.vocaux, 1);
        });
    }

    #[test]
    fn le_code_pour_l_autre_ordinateur_porte_la_cle_mais_aucun_mot_de_passe() {
        let mut r = relais_sur(&FauxNuage::demarrer());
        r.serveur = "https://nuage03.apps.education.fr".into();
        let json = serde_json::to_vec(&r).unwrap();
        assert!(!String::from_utf8_lossy(&json).contains(MDP_ORDI));
        let code = format!("{PREFIXE_CODE_ORDINATEUR}{}", URL_SAFE_NO_PAD.encode(json));
        let recu = relais_du_code(&format!(" {}\n{} ", &code[..50], &code[50..])).unwrap();
        assert_eq!(recu, r);
        // Le code du téléphone n'est pas celui de l'ordinateur : il n'a pas la clé qui rouvre.
        let erreur = relais_du_code(&r.appairage().unwrap().en_code()).unwrap_err();
        assert!(erreur.contains("celui du téléphone"), "{erreur}");
        // Le code d'un relais d'avant, qui passait par un lien, dit quoi faire.
        let avant = Relais { jeton: "aBcD1234".into(), ..r.clone() };
        let code_d_avant = format!("{PREFIXE_CODE_ORDINATEUR}{}", URL_SAFE_NO_PAD.encode(serde_json::to_vec(&avant).unwrap()));
        assert!(relais_du_code(&code_d_avant).unwrap_err().contains("réservez d'abord le dossier à votre compte"));
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
            compte: "prenom.nom".into(),
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
