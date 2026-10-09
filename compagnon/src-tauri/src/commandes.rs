//! Les commandes du dictaphone.
//!
//!
//! Ce téléphone ne connaît rien de la classe. Ni les élèves, ni le planning,
//! ni les séances : il enregistre du son et l'heure où il a été dit, et c'est
//! tout. Perdu dans un couloir, il ne trahit personne ; n'ayant rien à
//! renvoyer, il ne peut rien écraser non plus.
//!
//! C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
//! cahier journal. Il transcrit sur place avec Whisper et range.
//!
//! Deux chemins, chacun pour son usage. Les dictées et les notes passent par
//! Nuage, scellées pour l'ordinateur — où qu'il soit. Le WiFi ne sert qu'aux
//! demandes de l'ordinateur : les pages d'un manuel, une photo, envoyées au
//! QR code qu'il affiche.
//!
//! Les envois partent d'ici, en Rust, et non de la page : les règles réseau
//! d'iOS ne s'appliquent pas aux sockets, ce qui évite de déclarer une
//! exception pour parler en clair au Mac du réseau local.

use maitrize_relais as relais;
use relais::connexion::{self, Connexion};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

type R<T> = Result<T, String>;

/// Un enregistrement qui attend son ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Vocal {
    pub id: String,
    /// Quand l'enregistrement a commencé, en heure locale (« 2026-09-25T10:12:00 »).
    pub debut: String,
    pub duree_s: f64,
    /// Ce qu'il pèse, pour le dire à l'écran.
    pub octets: u64,
    /// Le créneau retenu au moment de dicter, vide si on n'en savait rien.
    #[serde(default)]
    pub creneau: String,
    /// « notes » pour les notes rapides de l'ordinateur ; vide pour le cahier journal.
    #[serde(default)]
    pub destination: String,
}

/// La destination demandée, telle qu'on la garde : les notes rapides, ou rien — le cahier journal.
fn destination_sure(destination: Option<String>) -> String {
    match destination.as_deref() {
        Some(relais::VERS_LES_NOTES) => relais::VERS_LES_NOTES.into(),
        _ => String::new(),
    }
}

/**
 * La destination d'un fichier, lue au bout de son nom : « …__notes.wav ».
 * Les fichiers d'avant n'ont rien au bout : ils vont au cahier journal.
 */
fn destination_du_nom(nom: &str) -> String {
    let brut = nom.rsplit_once('.').map(|(b, _)| b).unwrap_or(nom);
    if brut.split("__").count() > 2 && brut.ends_with(&format!("__{}", relais::VERS_LES_NOTES)) { relais::VERS_LES_NOTES.into() } else { String::new() }
}

/// Le bout de nom d'une destination : rien pour le cahier journal.
fn suffixe_de(destination: &str) -> String {
    if destination.is_empty() { String::new() } else { format!("__{destination}") }
}

/// Où l'on garde les vocaux, les notes et le relais.
fn dossier(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Dossier de données introuvable : {e}"))?;
    std::fs::create_dir_all(d.join("vocaux")).map_err(|e| e.to_string())?;
    Ok(d)
}

/**
 * Garde un enregistrement, avant toute tentative d'envoi.
 *
 * On garde d'abord, on envoie ensuite : un vocal ne se perd pas parce que
 * l'ordinateur était éteint dans le sac. Le nom du fichier porte l'heure et
 * la durée, ce qui évite un index à tenir à jour — et à désynchroniser.
 */
#[tauri::command]
pub fn vocal_garder(
    app: tauri::AppHandle, debut: String, duree_s: f64, wav_b64: String, creneau: Option<String>, destination: Option<String>,
) -> R<Vocal> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(wav_b64.as_bytes())
        .map_err(|e| format!("Enregistrement illisible : {e}"))?;
    if octets.len() < 100 {
        return Err("Enregistrement vide.".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    // Pour les notes rapides, le créneau ne compte pas : rien ne va au cahier journal.
    let destination = destination_sure(destination);
    let creneau = if destination.is_empty() { creneau.unwrap_or_default() } else { String::new() };
    let nom = format!("{}__{}__{:.3}__{creneau}{}.wav", id, debut.replace(':', "-"), duree_s, suffixe_de(&destination));
    std::fs::write(dossier(&app)?.join("vocaux").join(&nom), &octets)
        .map_err(|e| format!("Écriture impossible : {e}"))?;
    Ok(Vocal { id, debut, duree_s, octets: octets.len() as u64, creneau, destination })
}

/// Relit un nom de fichier : l'identifiant, l'heure, la durée, le créneau.
///
/// Les enregistrements d'avant le choix du créneau n'ont que trois parties :
/// ils restent lisibles, sans créneau.
fn depuis_le_nom(nom: &str) -> Option<(String, String, f64, String)> {
    let brut = nom.strip_suffix(".wav")?;
    let mut bouts = brut.split("__");
    let id = bouts.next()?.to_string();
    let debut = bouts.next()?.to_string();
    let duree = bouts.next()?.parse().ok()?;
    let creneau = bouts.next().unwrap_or_default().to_string();
    // L'heure a été écrite avec des tirets : « 10-12-00 » redevient « 10:12:00 ».
    let debut = match debut.split_once('T') {
        Some((jour, heure)) => format!("{jour}T{}", heure.replace('-', ":")),
        None => debut,
    };
    Some((id, debut, duree, creneau))
}

/// Ce qui attend, du plus ancien au plus récent.
#[tauri::command]
pub fn vocaux_liste(app: tauri::AppHandle) -> R<Vec<Vocal>> {
    let d = dossier(&app)?.join("vocaux");
    let mut sortie = Vec::new();
    let Ok(entrees) = std::fs::read_dir(&d) else { return Ok(sortie) };
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some((id, debut, duree_s, creneau)) = depuis_le_nom(&nom) else { continue };
        let octets = e.metadata().map(|m| m.len()).unwrap_or(0);
        sortie.push(Vocal { id, debut, duree_s, octets, creneau, destination: destination_du_nom(&nom) });
    }
    sortie.sort_by(|a, b| a.debut.cmp(&b.debut));
    Ok(sortie)
}

fn fichier_de(app: &tauri::AppHandle, id: &str) -> R<PathBuf> {
    let d = dossier(app)?.join("vocaux");
    let entrees = std::fs::read_dir(&d).map_err(|e| e.to_string())?;
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        if nom.starts_with(&format!("{id}__")) {
            return Ok(e.path());
        }
    }
    Err("Cet enregistrement n'est plus là.".into())
}

/**
 * Rend un vocal tel quel, pour l'écouter avant qu'il parte.
 *
 * On dicte en marchant, dans le bruit d'une classe : savoir si la phrase est
 * audible avant de rentrer vaut mieux que de le découvrir le soir, devant une
 * transcription vide. Le son ne quitte pas le téléphone pour autant.
 */
#[tauri::command]
pub fn vocal_lire(app: tauri::AppHandle, id: String) -> R<String> {
    use base64::Engine;
    let octets = std::fs::read(fichier_de(&app, &id)?).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(octets))
}

/// Oublie un vocal : le fichier part avec.
#[tauri::command]
pub fn vocal_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    let chemin = fichier_de(&app, &id)?;
    std::fs::remove_file(chemin).map_err(|e| e.to_string())
}

// ── Ce que l'ordinateur demande, par le WiFi ─────────────────────────────
//
// Le WiFi ne sert plus qu'à cela : quand l'ordinateur a besoin des pages d'un
// manuel ou d'une photo, il affiche un QR code ; le téléphone le lit, envoie,
// et c'est fini. Rien n'est retenu : la demande suivante viendra avec son
// propre QR code. C'est le serveur de capture de l'ordinateur qui reçoit —
// `/upload`, et `/fin` pour clore une série de pages.

/// Une demande de l'ordinateur : où envoyer, et s'il attend une série de pages.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DemandeWifi {
    pub origine: String,
    pub jeton: String,
    /// Une série de pages — un manuel — plutôt qu'une seule photo.
    pub serie: bool,
}

/// Lit le QR code d'une demande de l'ordinateur : « http://…/?t=…&s=1 ».
pub fn lire_demande(url: &str) -> R<DemandeWifi> {
    let propre: String = url.chars().filter(|c| !c.is_whitespace()).collect();
    if !propre.starts_with("http://") && !propre.starts_with("https://") {
        return Err("Ce QR code n'est pas celui d'une demande de l'ordinateur.".into());
    }
    let (origine, jeton) = decouper_adresse(&propre)?;
    let serie = propre.split(['?', '&']).any(|p| p == "s=1");
    Ok(DemandeWifi { origine, jeton, serie })
}

#[tauri::command]
pub fn demande_lire(url: String) -> R<DemandeWifi> {
    lire_demande(&url)
}

fn client_wifi() -> R<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())
}

/// L'adresse d'envoi d'une image, telle que le serveur de capture l'attend.
pub fn adresse_d_envoi(d: &DemandeWifi, ext: &str) -> String {
    format!("{}/upload?t={}&ext={ext}{}", d.origine, urlencode(&d.jeton), if d.serie { "&s=1" } else { "" })
}

async fn poster(client: &reqwest::Client, url: &str, octets: Vec<u8>, deja: u32) -> R<()> {
    let reponse = client
        .post(url)
        .body(octets)
        .send()
        .await
        .map_err(|_| format!("L'ordinateur ne répond pas ({deja} envoyée(s)) : êtes-vous sur le même WiFi ?"))?;
    if !reponse.status().is_success() {
        return Err(format!("L'ordinateur a refusé ({}) : sa demande est peut-être close, affichez un nouveau QR code.", reponse.status()));
    }
    Ok(())
}

// ── Les pages d'un manuel ─────────────────────────────────────────────────
//
// L'appareil écrit chaque page gardée dans `pages/`, dans le dossier de
// l'application. Elles étaient avant dans le dossier temporaire, et n'y
// arrivaient qu'à la fin, toutes ensemble : une application fermée en chemin
// perdait la série entière. Une page envoyée passe dans `pages/envoyees/` et
// y reste : c'est l'enseignant qui décide quand le téléphone l'oublie.

/// Le dossier des pages qui attendent l'ordinateur ; celles déjà parties sont dans `envoyees/`.
fn dossier_pages(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = dossier(app)?.join("pages");
    std::fs::create_dir_all(d.join("envoyees")).map_err(|e| e.to_string())?;
    Ok(d)
}

/// Les pages d'un dossier, dans l'ordre où on les a prises : leur nom porte l'heure.
pub fn pages_du_dossier(d: &std::path::Path) -> Vec<PathBuf> {
    let mut pages: Vec<PathBuf> = std::fs::read_dir(d)
        .map(|entrees| {
            entrees
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.is_file() && p.extension().is_some_and(|x| x.eq_ignore_ascii_case("jpg")))
                .collect()
        })
        .unwrap_or_default();
    pages.sort();
    pages
}

/// Les pages gardées sur le téléphone, et où l'appareil les écrit.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EtatPages {
    pub dossier: String,
    pub a_envoyer: u32,
    pub envoyees: u32,
}

fn etat_des_pages(d: &std::path::Path) -> EtatPages {
    EtatPages {
        dossier: d.to_string_lossy().into_owned(),
        a_envoyer: pages_du_dossier(d).len() as u32,
        envoyees: pages_du_dossier(&d.join("envoyees")).len() as u32,
    }
}

#[tauri::command]
pub fn pages_etat(app: tauri::AppHandle) -> R<EtatPages> {
    Ok(etat_des_pages(&dossier_pages(&app)?))
}

/// Une seule tournée d'envoi à la fois : l'appareil annonce chaque page, et
/// deux tournées en même temps enverraient la même page deux fois.
static TOURNEE: std::sync::LazyLock<tauri::async_runtime::Mutex<()>> =
    std::sync::LazyLock::new(|| tauri::async_runtime::Mutex::new(()));

/// Envoie les pages qui attendent, dans l'ordre, à l'ordinateur qui les a
/// demandées ; rend combien sont parties. Chaque page arrivée passe aussitôt
/// dans `envoyees/` : si le WiFi tombe en chemin, la suite attend la prochaine fois.
#[tauri::command]
pub async fn pages_envoyer(app: tauri::AppHandle, url: String) -> R<u32> {
    let d = lire_demande(&url)?;
    let _seule = TOURNEE.lock().await;
    let client = client_wifi()?;
    let dossier = dossier_pages(&app)?;
    let mut envoyees = 0u32;
    for chemin in pages_du_dossier(&dossier) {
        let octets = std::fs::read(&chemin).map_err(|e| e.to_string())?;
        poster(&client, &adresse_d_envoi(&d, "jpg"), octets, envoyees).await?;
        if let Some(nom) = chemin.file_name() {
            std::fs::rename(&chemin, dossier.join("envoyees").join(nom)).map_err(|e| e.to_string())?;
        }
        envoyees += 1;
    }
    Ok(envoyees)
}

/// Supprime les pages déjà envoyées — et celles qui attendent encore, si `toutes`.
#[tauri::command]
pub fn pages_oublier(app: tauri::AppHandle, toutes: bool) -> R<EtatPages> {
    let d = dossier_pages(&app)?;
    oublier_les_pages(&d, toutes)?;
    Ok(etat_des_pages(&d))
}

fn oublier_les_pages(d: &std::path::Path, toutes: bool) -> R<()> {
    let mut a_effacer = pages_du_dossier(&d.join("envoyees"));
    if toutes {
        a_effacer.extend(pages_du_dossier(d));
    }
    for p in a_effacer {
        std::fs::remove_file(&p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Envoie une photo prise à la demande de l'ordinateur.
#[tauri::command]
pub async fn demande_envoyer_photo(url: String, image_b64: String, ext: String) -> R<()> {
    use base64::Engine;
    let d = lire_demande(&url)?;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(image_b64.as_bytes())
        .map_err(|e| format!("Photo illisible : {e}"))?;
    let ext = match ext.as_str() { "png" => "png", _ => "jpg" };
    poster(&client_wifi()?, &adresse_d_envoi(&d, ext), octets, 0).await
}

/// Dit à l'ordinateur que la série de pages est complète.
#[tauri::command]
pub async fn demande_terminer(url: String) -> R<()> {
    let d = lire_demande(&url)?;
    client_wifi()?
        .get(format!("{}/fin?t={}&s=1", d.origine, urlencode(&d.jeton)))
        .send()
        .await
        .map_err(|_| "L'ordinateur ne répond pas.".to_string())?;
    Ok(())
}

// ── Les créneaux du jour ──────────────────────────────────────────────────
//
// Le téléphone reste ignorant de la classe, à une exception près, demandée :
// savoir sous quoi il enregistre. « 10h12 » ne dit rien, « Numération » si —
// et l'heure seule se trompe quand on dicte en sortant de la salle, ou une
// heure plus tard en y repensant.
//
// Ce qu'il garde est donc un emploi du temps sans personne dedans : une heure
// et un intitulé, pour le jour même. Le fichier d'un autre jour est effacé au
// premier rafraîchissement : un téléphone perdu ne porte pas l'année. On peut
// regarder un autre jour — on dicte le soir sur la journée, le lendemain sur
// la veille — : ses créneaux se demandent alors, et ne se gardent pas.

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Creneau {
    pub id: String,
    pub debut: String,
    pub fin: String,
    #[serde(default)]
    pub matiere: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Journee {
    pub jour: String,
    pub creneaux: Vec<Creneau>,
}

fn fiche_creneaux(app: &tauri::AppHandle) -> R<PathBuf> {
    Ok(dossier(app)?.join("creneaux.json"))
}

/// Le jour d'aujourd'hui, à l'heure du téléphone.
fn aujourdhui() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// Seul aujourd'hui se garde : regarder la veille ne remplace pas la journée en cours.
fn a_garder(jour: &str, aujourdhui: &str) -> bool {
    jour == aujourdhui
}

/// Garde la journée reçue si c'est aujourd'hui ; elle remplace alors la précédente.
fn garder_la_journee(app: &tauri::AppHandle, journee: &Journee) -> R<()> {
    if !a_garder(&journee.jour, &aujourdhui()) {
        return Ok(());
    }
    std::fs::write(fiche_creneaux(app)?, serde_json::to_string(journee).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

/// Ce qu'on sait du jour : si l'ordinateur nous l'a dit, et ce qu'il a dit.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreneauxConnus {
    /// Faux tant que l'ordinateur ne nous a rien dit de ce jour-là.
    pub connus: bool,
    pub creneaux: Vec<Creneau>,
}

/**
 * Les créneaux gardés, s'ils sont bien ceux du jour demandé.
 *
 * Une liste vide n'est pas une ignorance : un dimanche n'a pas de créneau, et
 * l'écran ne doit pas accuser le réseau d'un silence qui n'existe pas.
 */
#[tauri::command]
pub fn creneaux_du_jour(app: tauri::AppHandle, jour: String) -> R<CreneauxConnus> {
    let brut = std::fs::read_to_string(fiche_creneaux(&app)?).unwrap_or_default();
    let rien = CreneauxConnus { connus: false, creneaux: Vec::new() };
    let Ok(journee) = serde_json::from_str::<Journee>(&brut) else { return Ok(rien) };
    Ok(if journee.jour == jour {
        CreneauxConnus { connus: true, creneaux: journee.creneaux }
    } else {
        rien
    })
}

/// Les minutes depuis minuit d'un « 09:30 », ou -1.
fn en_minutes(hhmm: &str) -> i64 {
    let mut bouts = hhmm.split(':');
    match (bouts.next().and_then(|h| h.parse::<i64>().ok()),
           bouts.next().and_then(|m| m.parse::<i64>().ok())) {
        (Some(h), Some(m)) => h * 60 + m,
        _ => -1,
    }
}

/**
 * Le créneau où l'on se trouve, à cette heure-là.
 *
 * La même règle que l'ordinateur : d'abord celui qui contient l'heure, sinon
 * le dernier fini dans la demi-heure — on enregistre souvent juste après, en
 * sortant. Au-delà, on ne devine pas : l'enseignant choisira.
 */
pub fn creneau_pour(heure_iso: &str, creneaux: &[Creneau], tolerance: i64) -> Option<String> {
    let heure = heure_iso.split_once('T')?.1;
    let minute = en_minutes(&heure[..heure.len().min(5)]);
    if minute < 0 {
        return None;
    }
    let mut tries: Vec<&Creneau> = creneaux.iter().collect();
    tries.sort_by_key(|c| en_minutes(&c.debut));
    if let Some(c) = tries.iter().find(|c| {
        let (d, f) = (en_minutes(&c.debut), en_minutes(&c.fin));
        d >= 0 && f >= 0 && d <= minute && minute < f
    }) {
        return Some(c.id.clone());
    }
    tries
        .iter()
        .rfind(|c| {
            let f = en_minutes(&c.fin);
            f >= 0 && f <= minute && minute - f <= tolerance
        })
        .map(|c| c.id.clone())
}

/// Le créneau de l'instant, tel que l'écran l'affiche.
#[tauri::command]
pub fn creneau_maintenant(app: tauri::AppHandle, heure_iso: String) -> R<String> {
    let jour = heure_iso.split('T').next().unwrap_or_default().to_string();
    let connus = creneaux_du_jour(app, jour)?;
    Ok(creneau_pour(&heure_iso, &connus.creneaux, 30).unwrap_or_default())
}

// ── Les notes écrites ─────────────────────────────────────────────────────
//
// Tout ne se dicte pas : en réunion, dans un couloir, dans une salle où l'on
// ne va pas parler tout seul, on tape deux lignes. Elles suivent le même
// chemin qu'un vocal — gardées d'abord, déposées ensuite — et se rangent au
// créneau de l'heure. L'ordinateur n'a rien à transcrire : le texte est là.

/// Une note qui attend son ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub debut: String,
    pub texte: String,
    #[serde(default)]
    pub creneau: String,
    /// « notes » pour les notes rapides de l'ordinateur ; vide pour le cahier journal.
    #[serde(default)]
    pub destination: String,
}

/// Au-delà, ce n'est plus une note prise en classe.
const NOTE_MAX: usize = 4000;

fn dossier_notes(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = dossier(app)?.join("notes");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

/// Garde une note avant toute tentative d'envoi.
#[tauri::command]
pub fn note_garder(
    app: tauri::AppHandle, debut: String, texte: String, creneau: Option<String>, destination: Option<String>,
) -> R<Note> {
    let texte = texte.trim().to_string();
    if texte.is_empty() {
        return Err("Note vide.".into());
    }
    if texte.len() > NOTE_MAX {
        return Err("Note trop longue.".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let destination = destination_sure(destination);
    let creneau = if destination.is_empty() { creneau.unwrap_or_default() } else { String::new() };
    let nom = format!("{id}__{}__{creneau}{}.txt", debut.replace(':', "-"), suffixe_de(&destination));
    std::fs::write(dossier_notes(&app)?.join(&nom), &texte)
        .map_err(|e| format!("Écriture impossible : {e}"))?;
    Ok(Note { id, debut, texte, creneau, destination })
}

/// Relit le nom d'une note : l'identifiant et l'heure.
fn note_depuis_le_nom(nom: &str) -> Option<(String, String, String)> {
    let brut = nom.strip_suffix(".txt")?;
    let mut bouts = brut.split("__");
    let id = bouts.next()?.to_string();
    let debut = bouts.next()?;
    let creneau = bouts.next().unwrap_or_default().to_string();
    let debut = match debut.split_once('T') {
        Some((jour, heure)) => format!("{jour}T{}", heure.replace('-', ":")),
        None => debut.to_string(),
    };
    Some((id, debut, creneau))
}

/// Ce qui attend, du plus ancien au plus récent.
#[tauri::command]
pub fn notes_liste(app: tauri::AppHandle) -> R<Vec<Note>> {
    let mut sortie = Vec::new();
    let Ok(entrees) = std::fs::read_dir(dossier_notes(&app)?) else { return Ok(sortie) };
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some((id, debut, creneau)) = note_depuis_le_nom(&nom) else { continue };
        let texte = std::fs::read_to_string(e.path()).unwrap_or_default();
        sortie.push(Note { id, debut, texte, creneau, destination: destination_du_nom(&nom) });
    }
    sortie.sort_by(|a, b| a.debut.cmp(&b.debut));
    Ok(sortie)
}

fn note_fichier(app: &tauri::AppHandle, id: &str) -> R<PathBuf> {
    let entrees = std::fs::read_dir(dossier_notes(app)?).map_err(|e| e.to_string())?;
    for e in entrees.flatten() {
        if e.file_name().to_string_lossy().starts_with(&format!("{id}__")) {
            return Ok(e.path());
        }
    }
    Err("Cette note n'est plus là.".into())
}

/// Oublie une note : le fichier part avec.
#[tauri::command]
pub fn note_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    std::fs::remove_file(note_fichier(&app, &id)?).map_err(|e| e.to_string())
}

// ── Les photos pour Mes pictos ────────────────────────────────────────────
//
// Certains élèves n'entrent pas dans l'abstraction d'un pictogramme : il leur
// faut la photo de l'objet, celui de la classe. On la prend ici, on lui donne
// son nom — « les ciseaux », « la cantine » —, et elle part par Nuage,
// scellée comme une dictée. L'ordinateur la range dans Mes pictos sous ce
// nom : elle se montre ensuite partout où un picto se montre.
//
// Chaque photo attend dans `photos/` : l'image, `<id>.jpg`, et sa fiche,
// `<id>.json`. Le nom peut porter des accents et des espaces : il vit dans la
// fiche, pas dans le nom du fichier.

/// Une photo qui attend son ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Photo {
    pub id: String,
    /// Quand on l'a gardée, en heure locale.
    pub debut: String,
    /// Le mot sous lequel elle se rangera dans Mes pictos.
    pub nom: String,
    pub octets: u64,
}

/// Un nom de picto tient sur une étiquette.
const NOM_PHOTO_MAX: usize = 60;
/// La page réduit la photo avant de la confier : au-delà, ce n'en est pas une.
const PHOTO_MAX: usize = 6 * 1024 * 1024;

fn dossier_photos(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = dossier(app)?.join("photos");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

/// Le nom donné, sur une ligne, sans blancs en trop ; refusé vide ou trop long.
pub fn nom_de_photo(brut: &str) -> R<String> {
    let nom = brut.split_whitespace().collect::<Vec<_>>().join(" ");
    if nom.is_empty() {
        return Err("Donnez un nom à la photo : c'est le mot sous lequel vous la retrouverez.".into());
    }
    if nom.chars().count() > NOM_PHOTO_MAX {
        return Err(format!("Un nom de {NOM_PHOTO_MAX} caractères au plus."));
    }
    Ok(nom)
}

/// Un identifiant de photo, tel qu'un nom de fichier l'accepte sans détour.
fn id_de_photo(id: &str) -> R<&str> {
    let sur = !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
    if sur { Ok(id) } else { Err("Photo inconnue.".into()) }
}

/// Garde une photo et sa fiche dans ce dossier ; rend la fiche.
pub fn garder_photo_dans(d: &std::path::Path, debut: &str, nom: &str, octets: &[u8]) -> R<Photo> {
    let nom = nom_de_photo(nom)?;
    if octets.len() < 100 || !octets.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Err("Cette image n'est pas une photo lisible (JPEG).".into());
    }
    if octets.len() > PHOTO_MAX {
        return Err("Photo trop lourde.".into());
    }
    let p = Photo { id: uuid::Uuid::new_v4().to_string(), debut: debut.to_string(), nom, octets: octets.len() as u64 };
    std::fs::write(d.join(format!("{}.jpg", p.id)), octets).map_err(|e| format!("Écriture impossible : {e}"))?;
    let fiche = serde_json::to_vec(&p).map_err(|e| e.to_string())?;
    if let Err(e) = std::fs::write(d.join(format!("{}.json", p.id)), fiche) {
        let _ = std::fs::remove_file(d.join(format!("{}.jpg", p.id)));
        return Err(format!("Écriture impossible : {e}"));
    }
    Ok(p)
}

/// Les photos qui attendent dans ce dossier, de la plus ancienne à la plus récente ; une fiche sans image est écartée.
pub fn photos_du_dossier(d: &std::path::Path) -> Vec<Photo> {
    let Ok(entrees) = std::fs::read_dir(d) else { return Vec::new() };
    let mut sortie: Vec<Photo> = entrees.flatten()
        .filter(|e| e.file_name().to_string_lossy().ends_with(".json"))
        .filter_map(|e| serde_json::from_slice::<Photo>(&std::fs::read(e.path()).ok()?).ok())
        .filter(|p| id_de_photo(&p.id).is_ok() && d.join(format!("{}.jpg", p.id)).exists())
        .collect();
    sortie.sort_by(|a, b| a.debut.cmp(&b.debut).then_with(|| a.id.cmp(&b.id)));
    sortie
}

/// Oublie une photo de ce dossier : l'image et sa fiche.
pub fn oublier_photo_dans(d: &std::path::Path, id: &str) -> R<()> {
    let id = id_de_photo(id)?;
    let _ = std::fs::remove_file(d.join(format!("{id}.json")));
    match std::fs::remove_file(d.join(format!("{id}.jpg"))) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Garde une photo nommée avant toute tentative d'envoi. `image_b64` : un JPEG déjà réduit par la page.
#[tauri::command]
pub fn photo_garder(app: tauri::AppHandle, debut: String, nom: String, image_b64: String) -> R<Photo> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(image_b64.as_bytes())
        .map_err(|_| "Photo illisible.".to_string())?;
    garder_photo_dans(&dossier_photos(&app)?, &debut, &nom, &octets)
}

/// Les photos qui attendent, de la plus ancienne à la plus récente.
#[tauri::command]
pub fn photos_liste(app: tauri::AppHandle) -> R<Vec<Photo>> {
    Ok(photos_du_dossier(&dossier_photos(&app)?))
}

/// Une photo qui attend, en base64 : pour la revoir avant qu'elle parte.
#[tauri::command]
pub fn photo_lire(app: tauri::AppHandle, id: String) -> R<String> {
    use base64::Engine;
    let chemin = dossier_photos(&app)?.join(format!("{}.jpg", id_de_photo(&id)?));
    let octets = std::fs::read(chemin).map_err(|_| "Cette photo n'est plus là.".to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(octets))
}

/// Oublie une photo : l'image et sa fiche partent.
#[tauri::command]
pub fn photo_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    oublier_photo_dans(&dossier_photos(&app)?, &id)
}

// ── Le relais de Nuage ────────────────────────────────────────────────────
//
// L'ordinateur n'est pas toujours là quand on a du réseau : on dicte en
// classe, il dort dans le sac ; on rentre, il s'ouvre ailleurs. Par Nuage,
// chacun passe quand il peut. Le téléphone y dépose ce qui attend, scellé
// pour l'ordinateur — lui-même ne peut pas le rouvrir —, et y lit l'emploi du
// temps que l'ordinateur lui laisse.
//
// Le dossier du relais n'est ouvert qu'au compte Nuage de l'enseignant. Le
// QR code de l'ordinateur dit où il est, et dans quel compte, avec deux clés :
// aucun mot de passe. Le téléphone se connecte ensuite lui-même à ce compte,
// par la page de connexion de Nuage, et Nuage lui remet un mot de passe
// d'application à lui, gardé dans le trousseau de l'iPhone.

fn fiche_relais(app: &tauri::AppHandle) -> R<PathBuf> {
    Ok(dossier(app)?.join("relais.txt"))
}

/// Le relais gardé, s'il y en a un et qu'il se lit encore.
fn relais_garde(app: &tauri::AppHandle) -> Option<relais::Appairage> {
    let code = std::fs::read_to_string(fiche_relais(app).ok()?).ok()?;
    relais::Appairage::depuis_code(&code).ok()
}

/**
 * Le trousseau de l'iPhone, où dort le mot de passe d'application du téléphone.
 *
 * Chiffré par le système, lisible par cette seule application, dès le premier
 * déverrouillage après un redémarrage — un dépôt peut partir l'écran éteint —,
 * et jamais copié dans une sauvegarde ni sur un autre appareil.
 */
#[cfg(target_vendor = "apple")]
mod trousseau {
    use security_framework::access_control::{ProtectionMode, SecAccessControl};
    use security_framework::passwords::{delete_generic_password, generic_password, set_generic_password_options, PasswordOptions};

    const SERVICE: &str = "fr.clementsapp.maitrize.dictaphone.nuage";
    const ENTREE: &str = "connexion";

    pub fn lire() -> Option<String> {
        let octets = generic_password(PasswordOptions::new_generic_password(SERVICE, ENTREE)).ok()?;
        String::from_utf8(octets).ok()
    }

    pub fn ecrire(texte: &str) -> Result<(), String> {
        // Effacer d'abord : une mise à jour ne changerait pas la protection d'une entrée déjà là.
        effacer();
        let mut options = PasswordOptions::new_generic_password(SERVICE, ENTREE);
        let protection = SecAccessControl::create_with_protection(Some(ProtectionMode::AccessibleAfterFirstUnlockThisDeviceOnly), 0)
            .map_err(|e| format!("Trousseau indisponible : {e}"))?;
        options.set_access_control(protection);
        set_generic_password_options(texte.as_bytes(), options).map_err(|e| format!("Le trousseau de l'iPhone a refusé : {e}"))
    }

    pub fn effacer() {
        let _ = delete_generic_password(SERVICE, ENTREE);
    }
}

/// Ailleurs qu'un appareil Apple, pas de trousseau : le téléphone ne se connecte pas.
#[cfg(not(target_vendor = "apple"))]
mod trousseau {
    pub fn lire() -> Option<String> {
        None
    }
    pub fn ecrire(_texte: &str) -> Result<(), String> {
        Err("Pas de trousseau sur cet appareil.".into())
    }
    pub fn effacer() {}
}

/// La connexion au compte, si le téléphone en a une.
fn connexion_gardee() -> Option<Connexion> {
    serde_json::from_str(&trousseau::lire()?).ok()
}

/// Ce que l'écran montre du relais : s'il est là, chez qui, et si le
/// téléphone est connecté au compte. Rien de secret.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RelaisVu {
    pub relie: bool,
    /// Le téléphone est connecté au compte qui porte le dossier.
    pub connecte: bool,
    /// « nuage03.apps.education.fr »
    pub serveur: String,
    /// Le compte qui seul ouvre le dossier : celui auquel se connecter.
    pub compte: String,
}

fn vue_du_relais(a: Option<&relais::Appairage>, k: Option<&Connexion>) -> RelaisVu {
    match a {
        Some(a) => RelaisVu {
            relie: true,
            connecte: k.is_some(),
            serveur: a.serveur.trim_start_matches("https://").trim_end_matches('/').to_string(),
            compte: a.compte.clone(),
        },
        None => RelaisVu::default(),
    }
}

/// Le relais est-il configuré, et le téléphone connecté ?
#[tauri::command]
pub fn relais_lire(app: tauri::AppHandle) -> R<RelaisVu> {
    Ok(vue_du_relais(relais_garde(&app).as_ref(), connexion_gardee().as_ref()))
}

/**
 * Retient le relais scanné ; un code qui n'en est pas un est refusé tout de suite.
 *
 * Un nouveau QR code du même compte — l'ordinateur a refait le lien — garde
 * la connexion : inutile de se reconnecter. Celui d'un autre compte la retire.
 */
#[tauri::command]
pub async fn relais_ecrire(app: tauri::AppHandle, code: String) -> R<RelaisVu> {
    let a = relais::Appairage::depuis_code(&code)?;
    let mut k = connexion_gardee();
    if let Some(ancienne) = k.as_ref().filter(|_| !relais_garde(&app).is_some_and(|avant| connexion::meme_compte(&avant.compte, &a.compte))) {
        let _ = connexion::revoquer(ancienne).await;
        trousseau::effacer();
        k = None;
    }
    std::fs::write(fiche_relais(&app)?, a.en_code()).map_err(|e| e.to_string())?;
    Ok(vue_du_relais(Some(&a), k.as_ref()))
}

/// La connexion en cours : la page ouverte, et de quoi demander si c'est fait.
static DEMANDE: Mutex<Option<connexion::Demande>> = Mutex::new(None);
/// L'enseignant a refermé la page : on cesse d'attendre.
static ANNULEE: AtomicBool = AtomicBool::new(false);
/// Toutes les combien on demande à Nuage si c'est fait.
const INTERVALLE: Duration = Duration::from_secs(2);
/// Nuage oublie une demande de connexion au bout de vingt minutes.
const PATIENCE: Duration = Duration::from_secs(20 * 60);

/// Demande à Nuage une page de connexion ; rend son adresse, à ouvrir.
#[tauri::command]
pub async fn nuage_connexion_commencer(app: tauri::AppHandle) -> R<String> {
    let a = relais_requis(&app)?;
    let d = connexion::commencer(&a.serveur).await?;
    let page = d.page.clone();
    *DEMANDE.lock().map_err(|e| e.to_string())? = Some(d);
    ANNULEE.store(false, Ordering::SeqCst);
    Ok(page)
}

/**
 * Attend que l'enseignant se connecte dans la page, puis garde la connexion.
 *
 * Nuage ne remet le mot de passe qu'une fois la connexion acceptée ; on le lui
 * demande toutes les deux secondes. Le mot de passe remis doit ouvrir le
 * compte du dossier (voir `connexion::valider`) : sinon il est retiré
 * aussitôt, et on le dit.
 */
#[tauri::command]
pub async fn nuage_connexion_attendre(app: tauri::AppHandle) -> R<RelaisVu> {
    let a = relais_requis(&app)?;
    let d = DEMANDE.lock().map_err(|e| e.to_string())?.take().ok_or("Aucune connexion en cours.")?;
    let fin = std::time::Instant::now() + PATIENCE;
    let k = loop {
        if ANNULEE.load(Ordering::SeqCst) {
            return Err("Connexion annulée.".into());
        }
        match connexion::interroger(&d).await {
            Ok(Some(k)) => break k,
            Ok(None) => {}
            // Le réseau d'une salle de classe flanche : on redemandera.
            Err(e) if e == "Nuage ne répond pas." => {}
            Err(e) => return Err(e),
        }
        if std::time::Instant::now() >= fin {
            return Err("La page de connexion a expiré : recommencez.".into());
        }
        tokio::time::sleep(INTERVALLE).await;
    };
    let k = connexion::valider(&a, k).await?;
    trousseau::ecrire(&serde_json::to_string(&k).map_err(|e| e.to_string())?)?;
    Ok(vue_du_relais(Some(&a), Some(&k)))
}

/// La page de connexion a été refermée sans aboutir.
#[tauri::command]
pub fn nuage_connexion_annuler() {
    ANNULEE.store(true, Ordering::SeqCst);
}

/// Oublie le relais : le téléphone rend son accès à Nuage, et ne dépose plus.
#[tauri::command]
pub async fn relais_oublier(app: tauri::AppHandle) -> R<()> {
    if let Some(k) = connexion_gardee() {
        // Sans réseau, l'accès reste dans Nuage : il se retire de là, dans « Appareils et sessions ».
        let _ = connexion::revoquer(&k).await;
    }
    trousseau::effacer();
    let _ = std::fs::remove_file(fiche_relais(&app)?);
    Ok(())
}

/// Nuage répond-il, et le téléphone y entre-t-il toujours ?
#[tauri::command]
pub async fn relais_joignable(app: tauri::AppHandle) -> R<bool> {
    match (relais_garde(&app), connexion_gardee()) {
        (Some(a), Some(k)) => Ok(oublier_si_retire(relais::porte::verifier(&a, &k).await).is_ok()),
        _ => Ok(false),
    }
}

/// Un accès retiré dans Nuage ne reviendra pas : on l'oublie, et l'écran
/// redemandera de se connecter au lieu de réessayer sans fin.
fn oublier_si_retire<T>(resultat: R<T>) -> R<T> {
    if matches!(&resultat, Err(e) if e == relais::porte::ACCES_RETIRE) {
        trousseau::effacer();
    }
    resultat
}

fn relais_requis(app: &tauri::AppHandle) -> R<relais::Appairage> {
    relais_garde(app).ok_or_else(|| "Le téléphone n'est pas relié par Nuage.".to_string())
}

/// Le relais, et la connexion qui y fait entrer.
fn relais_et_connexion(app: &tauri::AppHandle) -> R<(relais::Appairage, Connexion)> {
    let a = relais_requis(app)?;
    let k = connexion_gardee().ok_or("Le téléphone n'est pas encore connecté à votre compte Nuage.")?;
    Ok((a, k))
}

/// Dépose un vocal sur Nuage, scellé pour l'ordinateur, et ne l'efface que s'il est arrivé.
#[tauri::command]
pub async fn vocal_deposer(app: tauri::AppHandle, id: String) -> R<()> {
    let (a, k) = relais_et_connexion(&app)?;
    let chemin = fichier_de(&app, &id)?;
    let nom = chemin.file_name().unwrap_or_default().to_string_lossy().to_string();
    let (_, debut, duree_s, creneau) = depuis_le_nom(&nom).ok_or("Nom de fichier inattendu.")?;
    let octets = std::fs::read(&chemin).map_err(|e| e.to_string())?;
    let etiquette = relais::Etiquette {
        genre: relais::Genre::Vocal, id: id.clone(), debut, duree_s, creneau, ext: String::new(), destination: destination_du_nom(&nom),
        nom: String::new(),
    };
    let blob = relais::preparer_depot(&a, &etiquette, &octets)?;
    oublier_si_retire(relais::porte::deposer(&a, &k, &relais::nom_du_depot(relais::Genre::Vocal, &id), blob).await)?;
    std::fs::remove_file(&chemin).map_err(|e| e.to_string())
}

/// Dépose une note sur Nuage, scellée pour l'ordinateur.
#[tauri::command]
pub async fn note_deposer(app: tauri::AppHandle, id: String) -> R<()> {
    let (a, k) = relais_et_connexion(&app)?;
    let chemin = note_fichier(&app, &id)?;
    let nom = chemin.file_name().unwrap_or_default().to_string_lossy().to_string();
    let (_, debut, creneau) = note_depuis_le_nom(&nom).ok_or("Nom de fichier inattendu.")?;
    let texte = std::fs::read_to_string(&chemin).map_err(|e| e.to_string())?;
    let etiquette = relais::Etiquette {
        genre: relais::Genre::Note, id: id.clone(), debut, duree_s: 0.0, creneau, ext: String::new(), destination: destination_du_nom(&nom),
        nom: String::new(),
    };
    let blob = relais::preparer_depot(&a, &etiquette, texte.as_bytes())?;
    oublier_si_retire(relais::porte::deposer(&a, &k, &relais::nom_du_depot(relais::Genre::Note, &id), blob).await)?;
    std::fs::remove_file(&chemin).map_err(|e| e.to_string())
}

/// Dépose une photo sur Nuage, scellée pour l'ordinateur, avec son nom.
#[tauri::command]
pub async fn photo_deposer(app: tauri::AppHandle, id: String) -> R<()> {
    let (a, k) = relais_et_connexion(&app)?;
    let d = dossier_photos(&app)?;
    let p = photos_du_dossier(&d).into_iter().find(|p| p.id == id).ok_or("Cette photo n'est plus là.")?;
    let octets = std::fs::read(d.join(format!("{}.jpg", p.id))).map_err(|e| e.to_string())?;
    let etiquette = relais::Etiquette {
        genre: relais::Genre::Photo, id: p.id.clone(), debut: p.debut.clone(), duree_s: 0.0, creneau: String::new(),
        ext: "jpg".into(), destination: String::new(), nom: p.nom.clone(),
    };
    let blob = relais::preparer_depot(&a, &etiquette, &octets)?;
    oublier_si_retire(relais::porte::deposer(&a, &k, &relais::nom_du_depot(relais::Genre::Photo, &p.id), blob).await)?;
    oublier_photo_dans(&d, &p.id)
}

/// Les créneaux d'un jour, lus dans l'emploi du temps que l'ordinateur a laissé sur Nuage.
///
/// Seuls ceux d'aujourd'hui se gardent.
#[tauri::command]
pub async fn creneaux_du_relais(app: tauri::AppHandle, jour: String) -> R<Vec<Creneau>> {
    let (a, k) = relais_et_connexion(&app)?;
    let blob = oublier_si_retire(relais::porte::lire_agenda(&a, &k).await)?
        .ok_or("L'ordinateur n'a pas encore laissé son emploi du temps sur Nuage.")?;
    let agenda = relais::dechiffrer_agenda(&relais::cle_de(&a.cle_retour)?, &blob)?;
    let journee = journee_de(&agenda, &jour)
        .ok_or("L'emploi du temps laissé sur Nuage ne couvre pas ce jour.")?;
    garder_la_journee(&app, &journee)?;
    Ok(journee.creneaux)
}

/// La journée d'un agenda, telle que le téléphone la garde.
fn journee_de(agenda: &relais::Agenda, jour: &str) -> Option<Journee> {
    agenda.du_jour(jour).map(|j| Journee {
        jour: j.jour.clone(),
        creneaux: j.creneaux.iter().map(|c| Creneau { id: c.id.clone(), debut: c.debut.clone(), fin: c.fin.clone(), matiere: c.matiere.clone() }).collect(),
    })
}

/// Sépare l'origine du jeton dans l'adresse appairée.
pub fn decouper_adresse(url: &str) -> R<(String, String)> {
    // Une adresse arrive d'un collage : espaces, retours à la ligne, et
    // parfois sans « http:// » parce qu'iOS le masque quand on copie depuis
    // Safari. On accepte tout cela plutôt que d'envoyer l'enseignant retaper
    // quarante caractères sur un clavier de téléphone.
    let url: String = url.chars().filter(|c| !c.is_whitespace()).collect();
    let url = url.as_str();
    let sans = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))
        .unwrap_or(url);
    let (hote, reste) = match sans.split_once('/') {
        Some((h, r)) => (h, r),
        None => (sans, ""),
    };
    if hote.is_empty() {
        return Err("Adresse sans ordinateur.".into());
    }
    let jeton = reste
        .split(['?', '&'])
        .find_map(|p| p.strip_prefix("t="))
        .unwrap_or_default()
        .to_string();
    if jeton.is_empty() {
        return Err("Adresse sans jeton : rescannez le QR code.".into());
    }
    let schema = if url.starts_with("https://") { "https" } else { "http" };
    Ok((format!("{schema}://{hote}"), jeton))
}

/// Ce qu'il faut échapper dans une adresse, et rien de plus.
fn urlencode(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ':' => "%3A".to_string(),
            ' ' => "%20".to_string(),
            c => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{decouper_adresse, depuis_le_nom, urlencode};

    /// Un dossier de pages, vide, à soi : chaque essai a le sien.
    fn dossier_d_essai(nom: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("maitrize-pages-{nom}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(d.join("envoyees")).unwrap();
        d
    }

    #[test]
    fn les_pages_se_suivent_dans_l_ordre_ou_on_les_a_prises() {
        let d = dossier_d_essai("ordre");
        for nom in ["page-20261004-153712-500.jpg", "page-20261004-153705-001.jpg", "page-20261004-153712-499.jpg", "notes.txt", "page.JPG.tmp"] {
            std::fs::write(d.join(nom), b"x").unwrap();
        }
        let noms: Vec<String> = super::pages_du_dossier(&d).iter().map(|p| p.file_name().unwrap().to_string_lossy().into_owned()).collect();
        assert_eq!(noms, ["page-20261004-153705-001.jpg", "page-20261004-153712-499.jpg", "page-20261004-153712-500.jpg"]);
        // Le dossier des envoyées n'est pas une page.
        assert_eq!(super::etat_des_pages(&d).a_envoyer, 3);
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn on_oublie_les_envoyees_et_l_on_garde_celles_qui_attendent() {
        let d = dossier_d_essai("oubli");
        std::fs::write(d.join("page-1.jpg"), b"x").unwrap();
        std::fs::write(d.join("envoyees").join("page-0.jpg"), b"x").unwrap();
        assert_eq!((super::etat_des_pages(&d).a_envoyer, super::etat_des_pages(&d).envoyees), (1, 1));
        super::oublier_les_pages(&d, false).unwrap();
        assert_eq!((super::etat_des_pages(&d).a_envoyer, super::etat_des_pages(&d).envoyees), (1, 0));
        super::oublier_les_pages(&d, true).unwrap();
        assert_eq!((super::etat_des_pages(&d).a_envoyer, super::etat_des_pages(&d).envoyees), (0, 0));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn une_photo_se_garde_avec_son_nom_puis_s_oublie() {
        let d = dossier_d_essai("photos");
        let jpeg = [&[0xFF, 0xD8, 0xFF, 0xE0][..], &[7u8; 200][..]].concat();
        let p = super::garder_photo_dans(&d, "2026-10-09T10:40:00", "  les   ciseaux\n", &jpeg).unwrap();
        assert_eq!(p.nom, "les ciseaux");
        assert_eq!(super::photos_du_dossier(&d), vec![p.clone()]);
        // Une fiche sans image ne compte pas.
        std::fs::write(d.join("orpheline.json"), br#"{"id":"orpheline","debut":"","nom":"x","octets":1}"#).unwrap();
        assert_eq!(super::photos_du_dossier(&d).len(), 1);
        super::oublier_photo_dans(&d, &p.id).unwrap();
        assert!(super::photos_du_dossier(&d).is_empty());
        // Oublier deux fois n'est pas une erreur ; sortir du dossier, si.
        assert!(super::oublier_photo_dans(&d, &p.id).is_ok());
        assert!(super::oublier_photo_dans(&d, "../relais").is_err());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn une_photo_sans_nom_ou_qui_n_en_est_pas_une_est_refusee() {
        let d = dossier_d_essai("photos-refus");
        let jpeg = [&[0xFF, 0xD8, 0xFF, 0xE0][..], &[7u8; 200][..]].concat();
        assert!(super::garder_photo_dans(&d, "", "   ", &jpeg).is_err());
        assert!(super::garder_photo_dans(&d, "", &"x".repeat(61), &jpeg).is_err());
        assert!(super::garder_photo_dans(&d, "", "un PNG", &[0x89, b'P', b'N', b'G', 0, 0, 0, 0]).is_err());
        assert!(super::photos_du_dossier(&d).is_empty());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn sans_dossier_il_n_y_a_pas_de_page() {
        assert!(super::pages_du_dossier(std::path::Path::new("/nulle/part/ici")).is_empty());
    }

    #[test]
    fn separe_l_origine_et_le_jeton() {
        let (o, j) = decouper_adresse("http://192.168.1.20:8787/?t=abc-123").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
    }

    #[test]
    fn accepte_une_adresse_collee_telle_quelle() {
        // Retours à la ligne et espaces ajoutés par le collage.
        let (o, j) = decouper_adresse("  http://192.168.1.20:8787/?t=abc-123\n").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
        // Sans schéma : Safari le masque quand on copie l'adresse.
        let (o, j) = decouper_adresse("192.168.1.20:8787/?t=abc-123").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
    }

    #[test]
    fn refuse_une_adresse_sans_jeton() {
        // Sans jeton, l'ordinateur répondrait « accès refusé » à chaque dépôt :
        // autant le dire au moment de l'appairage.
        assert!(decouper_adresse("http://192.168.1.20:8787/").is_err());
        assert!(decouper_adresse("192.168.1.20").is_err());
    }

    #[test]
    fn relit_le_nom_d_un_fichier() {
        let (id, debut, duree, creneau) =
            depuis_le_nom("abcd__2026-09-25T10-12-00__4.010__c7.wav").unwrap();
        assert_eq!(id, "abcd");
        // L'heure retrouve ses deux-points, que le système de fichiers refuse.
        assert_eq!(debut, "2026-09-25T10:12:00");
        assert!((duree - 4.01).abs() < 1e-6);
        assert_eq!(creneau, "c7");
        // Un enregistrement d'avant le choix du créneau reste lisible.
        let (_, _, _, sans) = depuis_le_nom("abcd__2026-09-25T10-12-00__4.010.wav").unwrap();
        assert_eq!(sans, "");
    }

    fn creneaux() -> Vec<super::Creneau> {
        let c = |id: &str, d: &str, f: &str, m: &str| super::Creneau {
            id: id.into(), debut: d.into(), fin: f.into(), matiere: m.into(),
        };
        vec![
            c("c1", "09:00", "10:00", "Numération"),
            c("c2", "10:00", "11:00", "Sport"),
            c("c3", "14:00", "15:00", "Arts"),
        ]
    }

    #[test]
    fn trouve_le_creneau_de_l_heure() {
        let cs = creneaux();
        let quand = |h: &str| super::creneau_pour(&format!("2026-09-25T{h}"), &cs, 30);
        assert_eq!(quand("09:30:00").as_deref(), Some("c1"));
        // La fin d'un créneau appartient au suivant.
        assert_eq!(quand("10:00:00").as_deref(), Some("c2"));
        // Juste après la sortie : le créneau qui vient de finir.
        assert_eq!(quand("11:20:00").as_deref(), Some("c2"));
        // Au-delà de la demi-heure, on ne devine plus.
        assert_eq!(quand("11:45:00"), None);
        // Avant le premier, et sur une heure illisible.
        assert_eq!(quand("07:00:00"), None);
        assert_eq!(super::creneau_pour("2026-09-25", &cs, 30), None);
        assert_eq!(super::creneau_pour("2026-09-25Tmidi", &cs, 30), None);
    }

    #[test]
    fn sans_creneau_connu_on_ne_devine_rien() {
        assert_eq!(super::creneau_pour("2026-09-25T09:30:00", &[], 30), None);
    }

    #[test]
    fn relit_le_nom_d_une_note() {
        let (id, debut, creneau) =
            super::note_depuis_le_nom("abcd__2026-09-25T10-12-00__c7.txt").unwrap();
        assert_eq!(id, "abcd");
        assert_eq!(debut, "2026-09-25T10:12:00");
        assert_eq!(creneau, "c7");
        // Une note d'avant le créneau reste lisible.
        assert_eq!(super::note_depuis_le_nom("abcd__2026-09-25T10-12-00.txt").unwrap().2, "");
        assert!(super::note_depuis_le_nom("abcd.txt").is_none());
        // Un vocal n'est pas une note : les deux dossiers ne se mélangent pas.
        assert!(super::note_depuis_le_nom("abcd__2026-09-25T10-12-00__4.010.wav").is_none());
    }

    #[test]
    fn la_destination_se_lit_au_bout_du_nom() {
        // Une dictée pour les notes rapides : pas de créneau, « notes » au bout.
        let vocal = "abcd__2026-10-09T18-02-00__3.500____notes.wav";
        let (id, debut, _, creneau) = depuis_le_nom(vocal).unwrap();
        assert_eq!((id.as_str(), debut.as_str(), creneau.as_str()), ("abcd", "2026-10-09T18:02:00", ""));
        assert_eq!(super::destination_du_nom(vocal), "notes");
        let note = "abcd__2026-10-09T18-02-00____notes.txt";
        assert_eq!(super::note_depuis_le_nom(note).unwrap().2, "");
        assert_eq!(super::destination_du_nom(note), "notes");
        // Les noms d'avant, et ceux du cahier journal, n'ont pas de destination.
        assert_eq!(super::destination_du_nom("abcd__2026-09-25T10-12-00__4.010__c7.wav"), "");
        assert_eq!(super::destination_du_nom("abcd__2026-09-25T10-12-00__c7.txt"), "");
        assert_eq!(super::destination_du_nom("abcd__2026-09-25T10-12-00.txt"), "");
        // Une destination inconnue ne s'écrit pas : seules les notes rapides en sont une.
        assert_eq!(super::destination_sure(Some("ailleurs".into())), "");
        assert_eq!(super::destination_sure(Some("notes".into())), "notes");
        assert_eq!(super::suffixe_de(""), "");
    }

    #[test]
    fn un_nom_inattendu_ne_fait_pas_tomber_la_liste() {
        assert!(depuis_le_nom("truc.wav").is_none());
        assert!(depuis_le_nom(".DS_Store").is_none());
    }

    #[test]
    fn le_relais_se_montre_sans_ses_cles_ni_mot_de_passe() {
        use super::relais;
        let (_, publique) = relais::nouvelle_paire();
        let a = relais::Appairage {
            serveur: "https://nuage03.apps.education.fr".into(),
            compte: "clement.titet".into(),
            dossier: "Maitrize-Telephone".into(),
            cle_depot: relais::cle_en_texte(&publique),
            cle_retour: relais::cle_en_texte(&relais::nouvelle_cle()),
        };
        let k = super::Connexion { serveur: "https://nuage03.apps.education.fr".into(), identifiant: "clement.titet".into(), mot_de_passe: "Mz7-secret".into() };
        let vu = super::vue_du_relais(Some(&a), Some(&k));
        assert_eq!(vu, super::RelaisVu { relie: true, connecte: true, serveur: "nuage03.apps.education.fr".into(), compte: "clement.titet".into() });
        let json = serde_json::to_string(&vu).unwrap();
        assert!(!json.contains("Mz7-secret") && !json.contains(&a.cle_retour) && !json.contains(&a.cle_depot));
        // Relié mais pas encore connecté : l'écran demandera de se connecter au compte.
        assert!(!super::vue_du_relais(Some(&a), None).connecte);
        assert_eq!(super::vue_du_relais(None, Some(&k)), super::RelaisVu::default());
    }

    #[test]
    fn une_demande_de_l_ordinateur_se_lit_dans_son_qr_code() {
        let pages = super::lire_demande("http://192.168.1.31:51234/?t=abc-123&s=1").unwrap();
        assert_eq!(pages, super::DemandeWifi { origine: "http://192.168.1.31:51234".into(), jeton: "abc-123".into(), serie: true });
        assert_eq!(super::adresse_d_envoi(&pages, "jpg"), "http://192.168.1.31:51234/upload?t=abc-123&ext=jpg&s=1");
        let photo = super::lire_demande(" http://192.168.1.31:51234/?t=abc-123 ").unwrap();
        assert!(!photo.serie);
        assert_eq!(super::adresse_d_envoi(&photo, "png"), "http://192.168.1.31:51234/upload?t=abc-123&ext=png");
        // Ni un code de Nuage, ni une adresse sans jeton.
        assert!(super::lire_demande("maitrize-relais:AAAA").is_err());
        assert!(super::lire_demande("http://192.168.1.31:51234/").is_err());
        // « s=10 » n'est pas une série.
        assert!(!super::lire_demande("http://h:1/?t=x&s=10").unwrap().serie);
    }

    #[test]
    fn seule_la_journee_d_aujourd_hui_se_garde() {
        assert!(super::a_garder("2026-10-02", "2026-10-02"));
        assert!(!super::a_garder("2026-10-01", "2026-10-02"), "la veille se regarde, elle ne remplace pas aujourd'hui");
        assert!(!super::a_garder("", "2026-10-02"));
        assert_eq!(super::aujourdhui().len(), 10);
    }

    #[test]
    fn l_agenda_du_relais_donne_la_journee_et_rien_d_autre() {
        use super::relais;
        let agenda = relais::Agenda {
            publie: String::new(),
            jours: vec![
                relais::Journee { jour: "2026-10-05".into(), creneaux: vec![relais::Creneau { id: "c1".into(), debut: "09:00".into(), fin: "10:00".into(), matiere: "Lecture".into() }] },
                relais::Journee { jour: "2026-10-06".into(), creneaux: vec![] },
            ],
        };
        let lundi = super::journee_de(&agenda, "2026-10-05").unwrap();
        assert_eq!(lundi.jour, "2026-10-05");
        assert_eq!(lundi.creneaux.len(), 1);
        assert_eq!(lundi.creneaux[0].matiere, "Lecture");
        // Un jour publié vide est connu : pas de classe, pas de panne.
        assert!(super::journee_de(&agenda, "2026-10-06").unwrap().creneaux.is_empty());
        // Un jour que l'agenda ne couvre pas reste inconnu.
        assert!(super::journee_de(&agenda, "2026-10-30").is_none());
    }

    #[test]
    fn echappe_ce_qu_il_faut_dans_l_adresse() {
        assert_eq!(urlencode("2026-09-25T10:12:00"), "2026-09-25T10%3A12%3A00");
        assert_eq!(urlencode("abc-123"), "abc-123");
    }
}
