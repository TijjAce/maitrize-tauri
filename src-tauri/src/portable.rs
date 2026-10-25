//! Version portable : l'app desktop sert un instantané de données sur le
//! réseau local (WiFi). Le téléphone l'ouvre dans son navigateur via un QR
//! code. Rien ne transite par internet : tout reste sur le réseau local.
//!
//! Le WiFi de l'école est partagé, et la page y passe en clair. D'où trois
//! précautions, choisies par l'enseignant (octobre 2026) : un code neuf à
//! chaque ouverture, qui ne vaut que jusqu'à la fermeture ; un arrêt tout
//! seul, deux heures après la dernière visite du téléphone et au plus tard
//! dix heures après l'ouverture ; et, de l'élève, rien que son nom et son
//! niveau — les temps d'observation n'y passent plus.
//!
//! Tout est en lecture, à une exception : une dictée enregistrée dans la page
//! se dépose sur l'ordinateur, qui la range.

use crate::db::Db;
use crate::models::{Creneau, Eleve, ProgrammationFinale, Seance, Sequence};
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{Duration, SystemTime};
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

/// État partagé : le serveur en cours — son drapeau d'arrêt, et son adresse.
///
/// L'adresse est gardée pour qu'un écran ouvert après coup puisse dire où
/// joindre l'ordinateur, sans relancer le serveur pour le savoir.
pub struct Portable(pub Mutex<Option<(Arc<AtomicBool>, PortableInfo)>>);

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PortableInfo {
    pub url: String,
    pub ip: String,
    pub port: u16,
    pub qr_svg: String,
    /// Le nom de l'ordinateur sur le réseau, vide s'il n'en a pas.
    #[serde(default)]
    pub hote: String,
    /// La même adresse, par le nom : celle-ci survit à un changement d'IP.
    #[serde(default)]
    pub url_nom: String,
}

/// Un élève tel que le téléphone le voit : son nom et son niveau, rien de plus.
/// Le partage passe par le Wi-Fi de l'école, en clair : l'INE, la date de
/// naissance, la photo ou ce qui touche au handicap n'ont rien à y faire —
/// la page n'en affiche rien.
#[derive(serde::Serialize)]
struct EleveVuDuTelephone {
    id: String,
    nom: String,
    niveau: String,
}

impl From<Eleve> for EleveVuDuTelephone {
    fn from(e: Eleve) -> Self {
        Self { id: e.id, nom: e.nom, niveau: e.niveau }
    }
}

/// Instantané des données envoyé au téléphone (lecture seule).
#[derive(serde::Serialize)]
struct Bundle {
    planning: Vec<Creneau>,
    sequences: Vec<Sequence>,
    seances: Vec<Seance>,
    eleves: Vec<EleveVuDuTelephone>,
    programmations: Vec<ProgrammationFinale>,
}

/**
 * Le nom de cet ordinateur sur le réseau local — « MacBook-de-Marie.local ».
 *
 * Une adresse IP change : la box en redistribue une autre après une coupure,
 * et le téléphone, qui avait retenu l'ancienne, ne trouve plus personne. Le
 * nom, lui, ne change pas — c'est macOS qui le publie, et iOS qui le résout,
 * sans rien à installer ni à configurer.
 *
 * Il peut manquer : sur un réseau qui bloque la découverte locale, ou hors
 * macOS. L'adresse IP reste alors le seul recours, et c'est pour cela qu'on
 * garde les deux.
 */
pub(crate) fn nom_local() -> String {
    #[cfg(target_os = "macos")]
    {
        // `scutil` donne le nom Bonjour, celui que publie le partage — et non
        // celui que la box a pu attribuer par DHCP.
        if let Ok(sortie) = std::process::Command::new("scutil").args(["--get", "LocalHostName"]).output() {
            let nom = String::from_utf8_lossy(&sortie.stdout).trim().to_string();
            if !nom.is_empty() {
                return format!("{nom}.local");
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        if let Ok(sortie) = std::process::Command::new("hostname").output() {
            let nom = String::from_utf8_lossy(&sortie.stdout).trim().to_string();
            if !nom.is_empty() {
                return nom;
            }
        }
    }
    String::new()
}

/// IP locale sans dépendance : « connecter » un socket UDP fixe la route locale
/// (aucune donnée n'est réellement envoyée).
pub(crate) fn ip_locale() -> String {
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".into())
}

pub(crate) fn qr_svg(data: &str) -> String {
    use qrcode::{render::svg, QrCode};
    match QrCode::new(data.as_bytes()) {
        Ok(code) => code
            .render::<svg::Color>()
            .min_dimensions(240, 240)
            .quiet_zone(true)
            .build(),
        Err(_) => String::new(),
    }
}

fn snapshot(db: &State<Db>) -> R<String> {
    let c = db.lock();

    let planning = {
        let mut st = c
            .prepare("SELECT * FROM creneaux ORDER BY date, heure_debut")
            .map_err(e)?;
        let rows = st.query_map([], Creneau::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };
    let sequences = {
        let mut st = c
            .prepare("SELECT * FROM sequences ORDER BY date_creation DESC")
            .map_err(e)?;
        let rows = st.query_map([], Sequence::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };
    let seances = {
        let mut st = c.prepare("SELECT * FROM seances ORDER BY numero").map_err(e)?;
        let rows = st.query_map([], Seance::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };
    let eleves = {
        let mut st = c
            .prepare("SELECT * FROM eleves ORDER BY niveau, nom")
            .map_err(e)?;
        let rows = st.query_map([], Eleve::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };
    // Les programmations de classe seules : celle par élève (IME) porte les
    // objectifs, les progrès et les notes de chacun — et la page du téléphone
    // ne sait pas l'afficher.
    let programmations = {
        let mut st = c
            .prepare("SELECT * FROM programmations_finale WHERE COALESCE(niveau, '') <> 'ime' ORDER BY annee")
            .map_err(e)?;
        let rows = st.query_map([], ProgrammationFinale::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };


    let bundle = Bundle {
        planning,
        sequences,
        seances,
        eleves: eleves.into_iter().map(EleveVuDuTelephone::from).collect(),
        programmations,
    };
    serde_json::to_string(&bundle).map_err(e)
}

// L'instantané parcourt planning, séquences et élèves : cela n'a pas sa place
// sur le fil qui dessine la fenêtre.
#[tauri::command(async)]
pub fn portable_demarrer(app: tauri::AppHandle, db: State<Db>, portable: State<Portable>) -> R<PortableInfo> {
    // Arrêter une instance précédente éventuelle.
    if let Some((stop, _)) = portable.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }

    // Instantané des données, figé au moment du clic (lecture seule).
    let data_json = snapshot(&db)?;

    // Un code neuf à chaque ouverture : celui d'hier ne vaut plus rien. Le
    // dictaphone, qui gardait l'adresse et revenait tout seul, passe par Nuage
    // depuis octobre 2026 ; la page du navigateur, elle, se rouvre en
    // rescannant le QR code.
    let token = Uuid::new_v4().to_string();
    oublier_le_jeton_durable(&db);
    let server = serveur_stable()?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|a| a.port())
        .ok_or("port introuvable")?;
    let ip = ip_locale();
    let url = format!("http://{ip}:{port}/?t={token}");
    // Par le nom, tant qu'on a encore le jeton sous la main : le fil du
    // serveur l'emporte juste après.
    let hote = nom_local();
    let url_nom = if hote.is_empty() { String::new() } else { format!("http://{hote}:{port}/?t={token}") };
    // C'est le nom qu'on encode dans le QR code : il survit à un changement
    // d'adresse IP tant que le partage reste ouvert.
    let a_scanner = if url_nom.is_empty() { url.clone() } else { url_nom.clone() };
    let qr = qr_svg(&a_scanner);

    let stop = Arc::new(AtomicBool::new(false));
    let stop_thread = stop.clone();
    let page = PAGE_HTML.to_string();
    std::thread::spawn(move || {
        // L'heure de l'horloge, pas celle du processeur : celle-ci s'arrête pendant la veille, et un partage ouvert
        // la veille, couvercle fermé, serait resté ouvert le lendemain.
        let ouvert = SystemTime::now();
        let mut derniere_visite = ouvert;
        loop {
            if stop_thread.load(Ordering::Relaxed) {
                break;
            }
            if doit_se_fermer(ouvert, derniere_visite, SystemTime::now()) {
                fermer_tout_seul(&app, &stop_thread);
                break;
            }
            match server.recv_timeout(Duration::from_millis(300)) {
                Ok(Some(req)) => {
                    if repondre(req, &token, &page, &data_json, &app) {
                        derniere_visite = SystemTime::now();
                    }
                }
                Ok(None) => continue,
                Err(_) => break,
            }
        }
    });

    let info = PortableInfo { url, ip, port, qr_svg: qr, hote, url_nom };
    *portable.0.lock().unwrap_or_else(PoisonError::into_inner) = Some((stop, info.clone()));
    Ok(info)
}

/// Le port qu'on demande d'abord : le même chaque jour, l'adresse ne change
/// que par son code.
pub const PORT_PORTABLE: u16 = 8787;

/// Sans visite du téléphone pendant ce temps, le partage se ferme tout seul.
const INACTIVITE_MAX: Duration = Duration::from_secs(2 * 3600);
/// Et au plus tard ce temps après son ouverture : la journée de classe, pas davantage.
const OUVERTURE_MAX: Duration = Duration::from_secs(10 * 3600);

/// Le partage ouvert à `ouvert`, visité pour la dernière fois à `visite`, doit-il se fermer à `maintenant` ? Une
/// horloge qu'on recule ne le garde pas ouvert plus longtemps.
pub(crate) fn doit_se_fermer(ouvert: SystemTime, visite: SystemTime, maintenant: SystemTime) -> bool {
    let depuis = |t: SystemTime| maintenant.duration_since(t).unwrap_or_default();
    depuis(visite) >= INACTIVITE_MAX || depuis(ouvert) >= OUVERTURE_MAX || maintenant < ouvert
}

/// Ferme le partage qui s'arrête de lui-même — s'il est encore celui qui est ouvert — et le dit à la fenêtre.
fn fermer_tout_seul(app: &tauri::AppHandle, stop: &Arc<AtomicBool>) {
    let portable = app.state::<Portable>();
    let mut garde = portable.0.lock().unwrap_or_else(PoisonError::into_inner);
    if garde.as_ref().is_some_and(|(s, _)| Arc::ptr_eq(s, stop)) {
        *garde = None;
        drop(garde);
        let _ = app.emit("portable:ferme", ());
        crate::commands::diag_ecrire("PARTAGE WIFI fermé tout seul".to_string());
    }
}

/// Le code du téléphone, s'il est le bon : le paramètre `t` de l'adresse, en entier.
fn autorise(url: &str, token: &str) -> bool {
    !token.is_empty() && parametre(url, "t") == token
}

/**
 * Le serveur, sur le port habituel si possible.
 *
 * S'il est pris — un autre programme, une instance qui n'a pas fini de se
 * fermer —, on en prend un au hasard plutôt que d'échouer : le QR code
 * marchera quand même, et seul le dictaphone demandera un nouvel appairage.
 */
fn serveur_stable() -> R<tiny_http::Server> {
    match tiny_http::Server::http(("0.0.0.0", PORT_PORTABLE)) {
        Ok(s) => Ok(s),
        Err(_) => tiny_http::Server::http("0.0.0.0:0").map_err(|err| err.to_string()),
    }
}

/// Le code permanent des versions d'avant (réglage « portableJeton ») : il ne sert plus, il s'en va.
fn oublier_le_jeton_durable(db: &State<Db>) {
    db.lock().execute("DELETE FROM settings WHERE cle = 'portableJeton'", []).ok();
}

#[tauri::command]
pub fn portable_arreter(portable: State<Portable>) -> R<()> {
    if let Some((stop, _)) = portable.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// Le partage tourne-t-il, et à quelle adresse ?
///
/// L'interrupteur de la barre du haut s'ouvre sur n'importe quelle page :
/// il lui faut l'état sans avoir à toucher au serveur.
#[tauri::command]
pub fn portable_etat(portable: State<Portable>) -> R<Option<PortableInfo>> {
    Ok(portable
        .0
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .as_ref()
        .map(|(_, info)| info.clone()))
}

/// Un paramètre de l'URL, tel qu'il est écrit.
fn parametre(url: &str, nom: &str) -> String {
    url.split(['?', '&'])
        .find_map(|p| p.strip_prefix(&format!("{nom}=")))
        .map(|v| v.replace("%3A", ":").replace("%20", " ").replace('+', " "))
        .unwrap_or_default()
}

/**
 * Reçoit un vocal du téléphone : du son, et l'heure où il a été dit.
 *
 * Rien d'autre ne traverse. Le téléphone ne sait ni qui est dans la classe,
 * ni ce qui s'y faisait à cette heure-là : c'est l'ordinateur qui le sait, et
 * qui rangera. Un téléphone perdu ne perd que des enregistrements.
 */
fn ecrire_vocal(app: &tauri::AppHandle, url: &str, octets: Vec<u8>) -> Result<String, String> {
    let debut = parametre(url, "debut");
    let duree: f64 = parametre(url, "duree").parse().unwrap_or(0.0);
    let id = crate::models::new_id();
    let db = app.state::<Db>();
    ranger_vocal(&db.lock(), &crate::db::fichiers_dir(), &id, &debut, duree, &parametre(url, "creneau"), "", &octets)?;
    let _ = app.emit("vocal:recu", id.clone());
    Ok(id)
}

/**
 * Range un vocal reçu, par le WiFi comme par le relais de Nuage.
 *
 * Rend faux s'il était déjà là : par le relais, le même dépôt peut être
 * relevé deux fois — par deux ordinateurs, ou après une coupure avant
 * l'effacement —, et il ne doit se ranger qu'une fois, même versé depuis
 * (voir `deja_range`).
 */
// Le Wi-Fi décrit un vocal par les paramètres de l'adresse, le relais par une
// étiquette : les grouper n'ajouterait qu'une structure de passage, pour deux
// appels.
#[allow(clippy::too_many_arguments)]
pub(crate) fn ranger_vocal(
    c: &rusqlite::Connection, dossier: &std::path::Path, id: &str, debut: &str, duree: f64, creneau: &str, destination: &str,
    octets: &[u8],
) -> Result<bool, String> {
    if octets.len() < 100 {
        return Err("Enregistrement vide.".into());
    }
    if deja_range(c, id) {
        return Ok(false);
    }
    let fichier = format!("vocal-{id}.wav");
    std::fs::write(dossier.join(&fichier), octets).map_err(|er| format!("Écriture impossible : {er}"))?;
    c.execute(
        "INSERT INTO vocaux (id,fichier,debut,duree_s,texte,etat,erreur,creneau_id,destination,date_creation)
         VALUES (?1,?2,?3,?4,'','recu','',?5,?6,?7)",
        rusqlite::params![id, fichier, debut, duree, creneau, destination_connue(destination), crate::models::now_iso()],
    )
    .map_err(|er| er.to_string())?;
    retenir(c, id);
    Ok(true)
}

/// Une destination qu'on sait servir — les notes rapides —, ou rien : le cahier journal.
fn destination_connue(destination: &str) -> &str {
    if destination == maitrize_relais::VERS_LES_NOTES { destination } else { "" }
}

/**
 * Vrai si ce dépôt est déjà passé par ici.
 *
 * Sa ligne dans `vocaux` ne suffit pas : une dictée ou une note versée, dans
 * le bilan ou les notes rapides, s'efface. Son dépôt, s'il n'avait pas pu
 * quitter Nuage, revenait alors comme neuf et se versait deux fois. Le
 * 14 octobre, une dictée revenue ainsi avait même perdu son son : la
 * synchronisation l'effaçait, son nom portant encore la marque d'effacement
 * de la première. D'où `depots_ranges`, qui retient chaque dépôt rangé ; et,
 * pour les dictées rangées avant elle, cette marque même.
 */
fn deja_range(c: &rusqlite::Connection, id: &str) -> bool {
    c.query_row(
        "SELECT EXISTS (SELECT 1 FROM vocaux WHERE id = ?1)
             OR EXISTS (SELECT 1 FROM depots_ranges WHERE id = ?1)
             OR EXISTS (SELECT 1 FROM fichiers_effaces WHERE nom = 'vocal-' || ?1 || '.wav')",
        [id],
        |r| r.get(0),
    )
    .unwrap_or(false)
}

/// Retient qu'un dépôt est rangé : sa ligne partie, il ne se rangera pas de nouveau.
fn retenir(c: &rusqlite::Connection, id: &str) {
    c.execute(
        "INSERT OR IGNORE INTO depots_ranges (id, date) VALUES (?1, ?2)",
        rusqlite::params![id, crate::models::now_iso()],
    )
    .ok();
}

/// Au-delà, ce n'est plus une note prise en classe.
const NOTE_MAX: usize = 4000;

/// Range une note reçue par le relais ; faux si elle était déjà là.
pub(crate) fn ranger_note(
    c: &rusqlite::Connection, id: &str, debut: &str, creneau: &str, destination: &str, texte: &str,
) -> Result<bool, String> {
    let texte = texte.trim();
    if texte.is_empty() {
        return Err("Note vide.".into());
    }
    if texte.len() > NOTE_MAX {
        return Err("Note trop longue.".into());
    }
    if deja_range(c, id) {
        return Ok(false);
    }
    c.execute(
        "INSERT INTO vocaux (id,fichier,debut,duree_s,texte,etat,erreur,creneau_id,destination,date_creation)
         VALUES (?1,'',?2,0,?3,'transcrit','',?4,?5,?6)",
        rusqlite::params![id, debut, texte, creneau, destination_connue(destination), crate::models::now_iso()],
    )
    .map_err(|er| er.to_string())?;
    retenir(c, id);
    Ok(true)
}

/// Ce que le téléphone envoie, plafonné : un vocal d'une heure, une page photographiée. Au-delà — ou si l'envoi
/// annonce lui-même plus —, rien n'est lu.
const MAX_VOCAL: u64 = 300_000_000;
const MAX_PHOTO: u64 = 60_000_000;

/// Le corps d'une requête, s'il ne dépasse pas `max` octets.
pub(crate) fn lire_corps(req: &mut tiny_http::Request, max: u64) -> Option<Vec<u8>> {
    if req.body_length().is_some_and(|n| n as u64 > max) {
        return None;
    }
    let mut octets = Vec::new();
    std::io::Read::read_to_end(&mut std::io::Read::take(req.as_reader(), max + 1), &mut octets).ok()?;
    (octets.len() as u64 <= max).then_some(octets)
}

/// Répond au téléphone ; rend vrai si c'était bien lui (le bon code) : une visite.
fn repondre(mut req: tiny_http::Request, token: &str, page: &str, data_json: &str, app: &tauri::AppHandle) -> bool {
    let url = req.url().to_string();
    let autorise = autorise(&url, token);
    // Le dépôt d'un vocal se lit avant toute réponse : le corps ne se relit pas.
    if autorise && url.starts_with("/api/vocal") {
        let (code, body) = match lire_corps(&mut req, MAX_VOCAL).map(|octets| ecrire_vocal(app, &url, octets)) {
            Some(Ok(id)) => (200, format!("{{\"ok\":true,\"id\":{}}}", serde_json::to_string(&id).unwrap_or_default())),
            Some(Err(message)) => (400, format!("{{\"ok\":false,\"erreur\":{}}}", serde_json::to_string(&message).unwrap_or_default())),
            None => (400, "{\"ok\":false}".to_string()),
        };
        let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..])
            .expect("en-tete valide");
        let _ = req.respond(tiny_http::Response::from_string(body).with_status_code(code).with_header(header));
        return true;
    }
    let (code, ctype, body): (u16, &str, String) = if !autorise {
        (
            403,
            "text/plain; charset=utf-8",
            "Acces refuse. Rescannez le QR code depuis l'ordinateur.".into(),
        )
    } else if url.starts_with("/api/data") {
        (200, "application/json; charset=utf-8", data_json.to_string())
    } else {
        (200, "text/html; charset=utf-8", page.to_string())
    };
    let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], ctype.as_bytes())
        .expect("en-tete valide");
    let resp = tiny_http::Response::from_string(body)
        .with_status_code(code)
        .with_header(header);
    let _ = req.respond(resp);
    autorise
}

// ── Capture photo depuis le téléphone ────────────────────────────────
// Le téléphone ouvre une page (via QR), prend une photo avec l'appareil natif
// (<input capture>, qui marche en HTTP sans HTTPS), et la POST au serveur local.
// La photo est enregistrée dans Fichiers/ et un événement `photo:recue` est
// émis vers le front avec le nom du fichier. La session s'arrête après 1 photo
// — sauf en série : un manuel se photographie page après page, et c'est le
// téléphone qui dit « terminé » (événement `photo:fin`).

pub struct PhotoCapture(pub Mutex<Option<Arc<AtomicBool>>>);

/// Vrai si l'adresse ouverte par le téléphone demande la série (`s=1`).
fn serie_demandee(url: &str) -> bool {
    parametre(url, "s") == "1"
}

#[tauri::command]
pub fn photo_capture_demarrer(app: tauri::AppHandle, photo: State<PhotoCapture>, serie: bool) -> R<PortableInfo> {
    if let Some(stop) = photo.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    let token = Uuid::new_v4().to_string();
    let server = tiny_http::Server::http("0.0.0.0:0").map_err(|err| err.to_string())?;
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("port introuvable")?;
    let ip = ip_locale();
    let url = format!("http://{ip}:{port}/?t={token}{}", if serie { "&s=1" } else { "" });
    let qr = qr_svg(&url);

    let stop = Arc::new(AtomicBool::new(false));
    let stop_thread = stop.clone();
    std::thread::spawn(move || loop {
        if stop_thread.load(Ordering::Relaxed) {
            break;
        }
        match server.recv_timeout(Duration::from_millis(300)) {
            Ok(Some(req)) => {
                if photo_repondre(req, &token, &app) {
                    stop_thread.store(true, Ordering::Relaxed); // photo reçue, ou série terminée → fin
                }
            }
            Ok(None) => continue,
            Err(_) => break,
        }
    });

    *photo.0.lock().unwrap_or_else(PoisonError::into_inner) = Some(stop);
    Ok(PortableInfo { url, ip, port, qr_svg: qr, hote: String::new(), url_nom: String::new() })
}

#[tauri::command]
pub fn photo_capture_arreter(photo: State<PhotoCapture>) -> R<()> {
    if let Some(stop) = photo.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// Traite une requête de capture. Renvoie true quand la session doit s'arrêter :
/// une photo reçue hors série, ou le téléphone qui dit « terminé ».
fn photo_repondre(mut req: tiny_http::Request, token: &str, app: &tauri::AppHandle) -> bool {
    let url = req.url().to_string();
    // En série, la page du téléphone le dit à chaque envoi (`s=1`) : on ne s'arrête pas après une photo.
    let serie = serie_demandee(&url);
    if !url.contains(&format!("t={token}")) {
        let _ = req.respond(tiny_http::Response::from_string("Acces refuse").with_status_code(403));
        return false;
    }
    if url.starts_with("/fin") {
        let _ = app.emit("photo:fin", ());
        let _ = req.respond(tiny_http::Response::from_string("OK"));
        return true;
    }
    if req.method() == &tiny_http::Method::Post && url.starts_with("/upload") {
        let ext = match parametre(&url, "ext").as_str() { "png" => "png", "pdf" => "pdf", _ => "jpg" };
        let buf = lire_corps(&mut req, MAX_PHOTO).unwrap_or_default();
        if !buf.is_empty() {
            let fichier = format!("{}.{}", Uuid::new_v4(), ext);
            if crate::db::ecrire_fichier_joint(&crate::db::fichiers_dir().join(&fichier), &buf).is_ok() {
                let _ = app.emit("photo:recue", fichier);
                let _ = req.respond(tiny_http::Response::from_string("OK"));
                return !serie;
            }
        }
        let _ = req.respond(tiny_http::Response::from_string("Erreur").with_status_code(500));
        return false;
    }
    let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
        .expect("en-tete valide");
    let _ = req.respond(tiny_http::Response::from_string(CAMERA_PAGE).with_header(header));
    false
}

/// Page « appareil photo » servie au téléphone.
const CAMERA_PAGE: &str = r##"<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Maitrize — photo</title>
<style>
 * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
 body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#f6f7fb; color:#1c2233; text-align:center; }
 header { background:#6366f1; color:#fff; padding:calc(14px + env(safe-area-inset-top)) 16px 14px; font-weight:700; font-size:17px; }
 main { padding:20px 16px; max-width:520px; margin:0 auto; }
 .big { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:18px; font-size:18px; font-weight:700;
   background:#6366f1; color:#fff; border:none; border-radius:14px; cursor:pointer; margin-bottom:16px; }
 img#prev { width:100%; border-radius:14px; margin-bottom:16px; }
 #send { width:100%; padding:16px; font-size:17px; font-weight:700; background:#22c55e; color:#fff; border:none; border-radius:14px; cursor:pointer; }
 #send:disabled { opacity:.6; }
 #msg { margin-top:14px; font-size:15px; line-height:1.4; color:#687087; }
</style>
</head>
<body>
<header>📷 Envoyer une photo à Maitrize</header>
<main>
 <p id="compte" style="display:none;font-weight:700;color:#6366f1;margin:0 0 12px"></p>
 <label class="big" id="lab"><input type="file" accept="image/*" capture="environment" id="f" hidden>📷 Prendre une photo</label>
 <label class="big" id="lab2" style="background:#fff;color:#1c2233;border:2px solid #cfd4e2"><input type="file" accept="application/pdf,image/*" id="f2" hidden>📄 Scanner avec Fichiers</label>
 <p id="aide2" style="font-size:13px;color:#687087;line-height:1.45;margin:-6px 0 16px">Le scanner de Notes, pour une page bien droite : « Choisir un fichier » → Parcourir → ⋯ en haut à droite → « Scanner des documents ». Scannez, « Enregistrer », puis choisissez le fichier.</p>
 <img id="prev" style="display:none" alt="">
 <button id="send" style="display:none">Envoyer à l'ordinateur ↗</button>
 <button id="fin" style="display:none;width:100%;padding:14px;font-size:16px;font-weight:700;background:#fff;color:#1c2233;border:2px solid #cfd4e2;border-radius:14px;margin-top:12px">✅ Terminer le manuel</button>
 <p id="msg"></p>
</main>
<script>
const params = new URLSearchParams(location.search);
const t = params.get('t') || '', serie = params.get('s') === '1';
const f = document.getElementById('f'), f2 = document.getElementById('f2'), prev = document.getElementById('prev'), compte = document.getElementById('compte'),
      send = document.getElementById('send'), msg = document.getElementById('msg'), lab = document.getElementById('lab'), fin = document.getElementById('fin');
let file = null, envoyees = 0;
if (serie) { lab.lastChild.textContent = '📷 Photographier la page 1'; fin.style.display = 'block'; msg.textContent = 'Une photo par page, dans l\'ordre du manuel. Terminez quand tout y est.'; }
const choisi = (entree) => {
  file = entree.files && entree.files[0];
  if (!file) return;
  const pdf = file.type === 'application/pdf';
  if (pdf) { prev.style.display = 'none'; msg.textContent = '📄 ' + (file.name || 'document scanné') + ' — prêt à envoyer.'; }
  else { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; prev.style.opacity = '1'; msg.textContent = ''; }
  send.style.display = 'block'; lab.lastChild.textContent = '📷 Reprendre la photo';
};
f.addEventListener('change', () => choisi(f));
f2.addEventListener('change', () => choisi(f2));
send.addEventListener('click', async () => {
  if (!file) return;
  send.disabled = true; msg.textContent = 'Envoi en cours…';
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
  try {
    const r = await fetch('/upload?t=' + encodeURIComponent(t) + '&ext=' + ext + (serie ? '&s=1' : ''), { method: 'POST', body: file });
    if (!r.ok) { msg.textContent = 'Échec de l\'envoi (' + r.status + ').'; send.disabled = false; return; }
    if (serie) {
      envoyees += 1; file = null; f.value = ''; f2.value = '';
      compte.style.display = 'block'; compte.textContent = '✅ ' + envoyees + ' page' + (envoyees > 1 ? 's' : '') + ' envoyée' + (envoyees > 1 ? 's' : '');
      prev.style.opacity = '.4'; send.style.display = 'none'; send.disabled = false;
      lab.lastChild.textContent = '📷 Photographier la page ' + (envoyees + 1); msg.textContent = '';
    } else {
      msg.textContent = '✅ Photo envoyée à l\'ordinateur ! Vous pouvez fermer cette page.'; send.style.display = 'none'; lab.style.display = 'none'; prev.style.opacity = '.5';
    }
  } catch (e) { msg.textContent = 'Connexion perdue. Vérifiez le WiFi et rescannez le QR.'; send.disabled = false; }
});
fin.addEventListener('click', async () => {
  fin.disabled = true;
  try { await fetch('/fin?t=' + encodeURIComponent(t) + '&s=1'); msg.textContent = '✅ Manuel terminé : ' + envoyees + ' page' + (envoyees > 1 ? 's' : '') + '. Vous pouvez fermer cette page.'; lab.style.display = 'none'; send.style.display = 'none'; fin.style.display = 'none'; }
  catch (e) { msg.textContent = 'Connexion perdue. Vérifiez le WiFi.'; fin.disabled = false; }
});
</script>
</body>
</html>
"##;

/// Page mobile servie au téléphone (lecture seule, 4 onglets).
const PAGE_HTML: &str = r##"<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Maitrize — version portable</title>
<style>
 :root { --bg:#f6f7fb; --card:#fff; --txt:#1c2233; --txt2:#687087; --acc:#6366f1; --bd:#e3e6ef; }
 * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
 body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--txt); padding-bottom:30px; }
 header { position:sticky; top:0; z-index:5; background:var(--acc); color:#fff; padding:calc(12px + env(safe-area-inset-top)) 16px 0; }
 header .t { font-weight:700; font-size:16px; padding-bottom:10px; }
 .tabs { display:flex; gap:4px; overflow-x:auto; }
 .tab { flex:1 0 auto; background:none; border:none; color:rgba(255,255,255,.7); font-size:13px; font-weight:600; padding:9px 12px; border-bottom:2.5px solid transparent; cursor:pointer; white-space:nowrap; }
 .tab.on { color:#fff; border-bottom-color:#fff; }
 main { padding:14px; max-width:680px; margin:0 auto; }
 section { display:none; }
 section.on { display:block; }
 .dicte-bouton { width:100%; padding:26px 16px; font-size:20px; font-weight:700; border:none; border-radius:16px;
   background:var(--acc); color:#fff; cursor:pointer; }
 .dicte-bouton.rouge { background:#dc2626; }
 .dicte-chrono { font-size:40px; font-weight:700; font-variant-numeric:tabular-nums; margin-bottom:4px; }
 .jour { margin:16px 0 8px; font-size:13px; font-weight:700; color:var(--txt2); text-transform:uppercase; letter-spacing:.04em; }
 .jour.auj { color:var(--acc); }
 .card { background:var(--card); border:1px solid var(--bd); border-radius:12px; padding:11px 13px; margin-bottom:9px; }
 .cr { border-left:4px solid var(--acc); display:flex; gap:12px; align-items:center; }
 .cr .h { font-variant-numeric:tabular-nums; font-weight:700; font-size:14px; white-space:nowrap; }
 .cr .m { flex:1; font-size:14px; }
 .daybar { display:flex; gap:7px; overflow-x:auto; padding:2px 0 12px; -webkit-overflow-scrolling:touch; }
 .chip { flex:0 0 auto; background:var(--card); border:1px solid var(--bd); border-radius:20px; padding:7px 14px; font-size:13px; font-weight:600; color:var(--txt2); cursor:pointer; text-transform:capitalize; }
 .chip.auj { border-color:var(--acc); color:var(--acc); }
 .chip.on { background:var(--acc); border-color:var(--acc); color:#fff; }
 .dhead { font-size:15px; font-weight:800; margin:2px 0 12px; text-transform:capitalize; }
 .dhead.auj { color:var(--acc); }
 .blk-card { background:var(--card); border:1px solid var(--bd); border-left:5px solid var(--acc); border-radius:12px; padding:0 14px; margin-bottom:9px; }
 .blk-head { display:flex; gap:14px; align-items:center; padding:12px 0; }
 .blk-head .bh { font-variant-numeric:tabular-nums; font-weight:800; font-size:15px; line-height:1.15; text-align:right; min-width:46px; flex:none; }
 .blk-head .bh small { display:block; font-weight:600; color:var(--txt2); font-size:12px; }
 .blk-head .bm { flex:1; font-size:15px; font-weight:600; }
 .blk-head .bm small.sub { display:block; font-size:12.5px; font-weight:500; color:var(--txt2); margin-top:2px; }
 .blk-card.sea-item .blk-head { cursor:pointer; user-select:none; }
 .blk-card.sea-item .blk-head::after { content:'▸'; color:var(--txt2); flex:none; transition:transform .15s; }
 .blk-card.sea-item.open .blk-head::after { transform:rotate(90deg); }
 .blk-card .sea-body { padding:0 0 12px; }
 .seq-h { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
 .seq-h b { font-size:15px; }
 .badge { font-size:11px; font-weight:700; padding:2px 7px; border-radius:20px; background:var(--acc); color:#fff; white-space:nowrap; }
 .badge.g { background:var(--bd); color:var(--txt2); }
 .obj { font-size:13px; color:var(--txt2); margin:2px 0 8px; line-height:1.4; }
 .sea { font-size:13px; padding:6px 0; border-top:1px dashed var(--bd); display:flex; gap:8px; align-items:center; }
 .sea .n { font-weight:700; color:var(--acc); flex:none; }
 .sea .d { color:var(--txt2); flex:none; font-variant-numeric:tabular-nums; }
 .sea-item { border-top:1px dashed var(--bd); }
 .sea-row { display:flex; gap:8px; align-items:center; padding:10px 0; cursor:pointer; font-size:13.5px; user-select:none; }
 .sea-row::before { content:'▸'; color:var(--txt2); flex:none; transition:transform .15s; }
 .sea-item.open .sea-row::before { transform:rotate(90deg); }
 .sea-row .n { font-weight:700; color:var(--acc); flex:none; }
 .sea-row .st { flex:1; }
 .sea-row .d { color:var(--txt2); flex:none; font-variant-numeric:tabular-nums; font-size:12px; }
 .sea-item.open .sea-row .st { font-weight:700; }
 .sea-body { display:none; padding:2px 0 12px 20px; }
 .sea-item.open .sea-body { display:block; }
 .sd-l { font-size:13px; margin-bottom:9px; line-height:1.5; }
 .sd-l:last-child { margin-bottom:2px; }
 .sd-l b { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--txt2); margin-bottom:2px; font-weight:700; }
 .el { display:flex; align-items:center; gap:10px; }
 .el .dot { width:9px; height:9px; border-radius:50%; flex:none; background:#cbd2e0; }
 .el .dot.p { background:#22c55e; }
 .el .nm { flex:1; font-size:14px; }
 table.prog { width:100%; border-collapse:collapse; font-size:12px; margin-top:6px; }
 table.prog th, table.prog td { border:1px solid var(--bd); padding:5px 6px; text-align:left; vertical-align:top; }
 table.prog th { background:var(--bg); color:var(--txt2); font-weight:700; }
 table.prog td.lbl { font-weight:600; }
 .vide,.err { color:var(--txt2); text-align:center; padding:34px 16px; line-height:1.5; }
 .err { color:#c0392b; }
 .scroll { overflow-x:auto; }
</style>
</head>
<body>
<header>
 <div class="t">📚 Maitrize — version portable</div>
 <div class="tabs" id="tabs"></div>
</header>
<main id="main"><p class="vide">Chargement…</p></main>
<script>
const T = new URLSearchParams(location.search).get('t') || '';
const main = document.getElementById('main');
const tabsEl = document.getElementById('tabs');
const J = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const M = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const fmtJour = iso => { const d = new Date(iso + 'T00:00:00'); return J[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()]; };
const auj = new Date().toISOString().slice(0,10);

let DATA = null;

const TABS = [
  ['dictaphone','🎙 Dicter', renderDictaphone],
  ['planning','🗓 Planning', renderPlanning],
  ['sequences','📚 Séquences', renderSequences],
  ['eleves','👧 Élèves', renderEleves],
  ['programmations','🗂 Programmations', renderProgrammations],
];

// ── Le dictaphone ────────────────────────────────────────────────────
//
// On dicte en classe, l'ordinateur fermé dans le sac. Le téléphone garde
// l'enregistrement et l'heure, rien d'autre — pas un nom, pas un créneau.
// Au retour, il les dépose et l'ordinateur range.
//
// Le son est capturé à 16 kHz mono et empaqueté en WAV ici même : c'est ce
// que Whisper attend de l'autre côté, et cela évite de décoder un format de
// téléphone sur le Mac.

const TAUX = 16000;
let micro = null, ctx = null, morceaux = [], debutDicte = null, minuteur = null;

/** Les vocaux en attente, gardés dans le téléphone tant qu'ils ne sont pas partis. */
function enAttente() {
  try { return JSON.parse(localStorage.getItem('vocaux') || '[]'); } catch (e) { return []; }
}
function poserEnAttente(l) { localStorage.setItem('vocaux', JSON.stringify(l)); }

/** L'heure locale au format que l'ordinateur attend. */
function maintenantIso() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** Rééchantillonne au taux de Whisper : un ratio simple suffit pour la parole. */
function reechantillonner(entree, deTaux) {
  if (deTaux === TAUX) return entree;
  const ratio = deTaux / TAUX, sortie = new Float32Array(Math.floor(entree.length / ratio));
  for (let i = 0; i < sortie.length; i++) sortie[i] = entree[Math.floor(i * ratio)] || 0;
  return sortie;
}

/** Un WAV 16 bits mono, tel quel : en-tête de quarante-quatre octets, puis les échantillons. */
function versWav(morceaux) {
  let n = 0; for (const m of morceaux) n += m.length;
  const tout = new Float32Array(n); let o = 0;
  for (const m of morceaux) { tout.set(m, o); o += m.length; }
  const buf = new ArrayBuffer(44 + tout.length * 2), vue = new DataView(buf);
  const txt = (p, s) => { for (let i = 0; i < s.length; i++) vue.setUint8(p + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); vue.setUint32(4, 36 + tout.length * 2, true); txt(8, 'WAVEfmt ');
  vue.setUint32(16, 16, true); vue.setUint16(20, 1, true); vue.setUint16(22, 1, true);
  vue.setUint32(24, TAUX, true); vue.setUint32(28, TAUX * 2, true);
  vue.setUint16(32, 2, true); vue.setUint16(34, 16, true);
  txt(36, 'data'); vue.setUint32(40, tout.length * 2, true);
  for (let i = 0; i < tout.length; i++) {
    const v = Math.max(-1, Math.min(1, tout[i]));
    vue.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

async function demarrerDicte() {
  try {
    micro = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    alert("Le micro n'est pas accessible. Autorisez-le pour ce site.");
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(micro);
  const noeud = ctx.createScriptProcessor(4096, 1, 1);
  morceaux = []; debutDicte = maintenantIso();
  noeud.onaudioprocess = (e) => {
    morceaux.push(reechantillonner(new Float32Array(e.inputBuffer.getChannelData(0)), ctx.sampleRate));
  };
  // Une sortie muette : sans elle, le nœud ne reçoit rien sur certains navigateurs.
  const muet = ctx.createGain(); muet.gain.value = 0;
  src.connect(noeud); noeud.connect(muet); muet.connect(ctx.destination);
  ctx._noeud = noeud;
  const depart = Date.now();
  minuteur = setInterval(() => {
    const s = Math.round((Date.now() - depart) / 1000);
    const el = document.getElementById('chrono');
    if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }, 500);
  rendreDicte();
}

async function arreterDicte() {
  if (!ctx) return;
  clearInterval(minuteur); minuteur = null;
  try { ctx._noeud.disconnect(); } catch (e) {}
  const taux = TAUX, blob = versWav(morceaux);
  let duree = 0; for (const m of morceaux) duree += m.length; duree = duree / taux;
  try { await ctx.close(); } catch (e) {}
  if (micro) micro.getTracks().forEach((t) => t.stop());
  ctx = null; micro = null; morceaux = [];
  if (duree < 0.5) { rendreDicte(); return; }
  // On garde d'abord, on envoie ensuite : un vocal ne se perd pas parce que
  // l'ordinateur était éteint.
  const lecture = new FileReader();
  lecture.onload = () => {
    const l = enAttente();
    l.push({ id: String(Date.now()), debut: debutDicte, duree: duree, b64: String(lecture.result).split(',')[1] });
    poserEnAttente(l);
    rendreDicte();
    envoyerLesVocaux();
  };
  lecture.readAsDataURL(blob);
}

function octetsDe(b64) {
  const bin = atob(b64), o = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  return o;
}

let envoiEnCours = false;
/** Dépose ce qui attend, et ne retire que ce qui est bien arrivé. */
async function envoyerLesVocaux() {
  if (envoiEnCours) return;
  envoiEnCours = true;
  try {
    for (const v of enAttente()) {
      const url = '/api/vocal?t=' + encodeURIComponent(T) +
        '&debut=' + encodeURIComponent(v.debut) + '&duree=' + encodeURIComponent(v.duree);
      let ok = false;
      try {
        const r = await fetch(url, { method: 'POST', body: octetsDe(v.b64) });
        ok = r.ok;
      } catch (e) { ok = false; }
      if (!ok) break; // l'ordinateur n'est pas là : on garde le reste pour plus tard
      poserEnAttente(enAttente().filter((x) => x.id !== v.id));
      rendreDicte();
    }
  } finally { envoiEnCours = false; }
}

/**
 * Rafraîchit la section du dictaphone, et elle seule.
 *
 * La page dessine toutes ses sections une fois au chargement, puis se
 * contente de les montrer ou de les cacher : il n'y a pas de rendu global à
 * rappeler. Le dictaphone, lui, change d'état — au repos, en train
 * d'enregistrer, avec des vocaux en attente —, donc il se redessine seul.
 */
function rendreDicte() {
  const el = document.getElementById('sec-dictaphone');
  if (el) el.innerHTML = renderDictaphone();
}

function renderDictaphone() {
  const attente = enAttente();
  const dicte = !!ctx;
  return '<div class="card" style="text-align:center;padding:20px 14px">' +
    (dicte
      ? '<div class="dicte-chrono" id="chrono">0:00</div>' +
        '<p class="meta" style="margin-top:0">Ça enregistre…</p>' +
        '<button class="dicte-bouton rouge" onclick="arreterDicte()">⏹ Terminer</button>'
      : '<button class="dicte-bouton" onclick="demarrerDicte()">🎙 Dicter</button>' +
        '<p class="meta" style="margin-bottom:0">L\'heure suffit : l\'ordinateur saura de quel créneau il s\'agit.</p>') +
    '</div>' +
    (attente.length
      ? '<p class="jour">En attente de l\'ordinateur (' + attente.length + ')</p>' +
        attente.map((v) => '<div class="card"><b>' + v.debut.slice(11, 16).replace(':', 'h') + '</b> · ' +
          Math.round(v.duree) + ' s</div>').join('') +
        '<button class="btn" onclick="envoyerLesVocaux()">↑ Envoyer maintenant</button>'
      : '<p class="vide">Rien en attente : tout est parti sur l\'ordinateur.</p>');
}

function show(id) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  document.querySelectorAll('section').forEach(s => s.classList.toggle('on', s.id === 'sec-' + id));
}

function renderPlanning(cr) {
  if (!cr.length) return '<p class="vide">Aucun créneau dans le planning.</p>';
  return '<div class="daybar" id="daybar"></div><div id="dayview"></div>';
}

function initPlanning() {
  const cr = DATA.planning || [];
  const bar = document.getElementById('daybar');
  if (!cr.length || !bar) return;
  const byDay = {};
  cr.forEach(c => { const k = (c.date || '').slice(0,10); (byDay[k] = byDay[k] || []).push(c); });
  const days = Object.keys(byDay).sort();
  const labChip = iso => { const d = new Date(iso + 'T00:00:00'); return ['dim','lun','mar','mer','jeu','ven','sam'][d.getDay()] + '. ' + d.getDate(); };
  const hd = c => c.heureDebut || c.heure_debut || '';
  const seaById = {};
  (DATA.seances || []).forEach(s => { seaById[s.id] = s; });
  bar.innerHTML = days.map(k => '<button class="chip' + (k === auj ? ' auj' : '') + '" data-d="' + k + '">' + labChip(k) + '</button>').join('');

  const renderJour = k => {
    bar.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b.dataset.d === k));
    const items = byDay[k].slice().sort((a,b) => hd(a).localeCompare(hd(b)));
    const blocs = items.map(c => {
      const f = c.heureFin || c.heure_fin || '';
      const col = /^#[0-9a-fA-F]{3,8}$/.test(c.couleur || '') ? c.couleur : '#6366f1';
      const sea = seaById[c.seanceId || c.seance_id || ''];
      const qui = prenomsDuCreneau(c);
      const head = '<div class="blk-head"><span class="bh">' + esc(hd(c)) + '<small>' + esc(f) + '</small></span><span class="bm">' + esc(c.matiere || '—')
        + (qui ? '<small class="sub">👥 ' + esc(qui) + '</small>' : '')
        + (sea && sea.titre ? '<small class="sub">' + esc(sea.titre) + '</small>' : '') + '</span></div>';
      // Le cahier journal, c'est le contenu du jour : il vient avant le reste.
      const journal = journalDuCreneau(c);
      const corps = journal + (sea ? seanceBody(sea) : '');
      if (corps) return '<div class="blk-card sea-item" style="border-left-color:' + col + '">' + head + '<div class="sea-body">' + corps + '</div></div>';
      return '<div class="blk-card" style="border-left-color:' + col + '">' + head + '</div>';
    }).join('') || '<p class="vide">Pas de créneau ce jour-là.</p>';
    document.getElementById('dayview').innerHTML = '<div class="dhead' + (k === auj ? ' auj' : '') + '">' + fmtJour(k) + (k === auj ? ' · aujourd\'hui' : '') + '</div>' + blocs;
    const onChip = bar.querySelector('.chip.on');
    if (onChip) onChip.scrollIntoView({ inline: 'center', block: 'nearest' });
  };

  bar.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => renderJour(b.dataset.d)));
  const def = days.includes(auj) ? auj : (days.find(d => d >= auj) || days[0]);
  renderJour(def);
}

/** Les prénoms des élèves d'un créneau, comme sur l'ordinateur. */
function prenomsDuCreneau(c) {
  let ids = [];
  try { ids = JSON.parse(c.elevesJson || c.eleves_json || '[]'); } catch (e) { ids = []; }
  if (!ids.length) return '';
  const par = {};
  (DATA.eleves || []).forEach(e => { par[e.id] = (e.nom || '').trim().split(/\s+/)[0]; });
  return ids.map(i => par[i]).filter(Boolean).join(', ');
}

/** Ce qui est écrit dans le cahier journal, sans les marqueurs d'images. */
function journalDuCreneau(c) {
  const sansImages = t => String(t || '').replace(/\[img:[^\]]+\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const prevu = sansImages(c.prevu);
  const bilan = sansImages(c.bilan);
  return (prevu ? '<div class="sd-l"><b>Prévu</b>' + nl(prevu) + '</div>' : '')
    + (bilan ? '<div class="sd-l"><b>Fait · bilan</b>' + nl(bilan) + '</div>' : '');
}

/** Les cases d'une rangée de tableau « | a | b | » : un « \| » reste dans sa case, comme le « | » d'un support cité ou d'une couleur. */
function casesDeLaLigne(l) {
  const t = l.trim(), cases = [];
  let ici = '';
  for (let i = 1; i < t.length; i++) {
    if (t.startsWith('[@', i) || t.startsWith('[cite:', i)) {
      const fin = t.indexOf(']', i);
      if (fin > 0) { ici += t.slice(i, fin + 1); i = fin; continue; }
    }
    const couleur = t[i] === '{' ? /^\{(?:rouge|orange|vert|bleu|violet|fond-jaune|fond-vert|fond-bleu|fond-rose)\|/.exec(t.slice(i)) : null;
    if (couleur) { ici += couleur[0]; i += couleur[0].length - 1; continue; }
    if (t[i] === '\\' && t[i + 1] === '|') { ici += '|'; i++; continue; }
    if (t[i] === '|') { cases.push(ici); ici = ''; continue; }
    ici += t[i];
  }
  return cases;
}

/** Le déroulement d'une séance en texte simple, comme l'imprime l'ordinateur (voir documentSeance.ts) :
    les phases numérotées, leur durée et leur organisation ; leurs champs nommés ; les supports cités par
    leur titre, sans images, couleurs ni mise en forme ; un tableau rangée par rangée. */
function deroulementLisible(t) {
  const sortie = [];
  let n = 0, titre = -1, champ = '', aNommer = false;
  const couleur = /\{(rouge|orange|vert|bleu|violet|fond-jaune|fond-vert|fond-bleu|fond-rose)\|([^{}]*)\}/g;
  const sansCouleurs = l => { let avant; do { avant = l; l = l.replace(couleur, '$2'); } while (l !== avant); return l; };
  const propre = l => sansCouleurs(l).replace(/^(\s*)\\(?=[#|])/, '$1').replace(/^\s*(?:[-•]|\*(?=\s))\s+/, '• ')
    .replace(/\[@[a-z]+:[^|\]]+\|([^\]]*)\]/g, '$1')
    .replace(/\[(img|cite):[^\]]+\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1$2');
  for (const l of String(t || '').split('\n')) {
    if (/^\s*\[img:[^\]]+\]\s*$/.test(l)) continue;
    const c = /^###\s*(.+?)\s*$/.exec(l);
    if (c) { champ = c[1]; aNommer = true; continue; }
    const p = /^##(?!#)\s*(.*)$/.exec(l);
    if (p) {
      n++; champ = ''; aNommer = false;
      const d = /\s*\(\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:min(?:utes?)?|h(?:\s*\d+)?|'))\s*\)\s*$/i.exec(p[1]);
      sortie.push(n + '. ' + ((d ? p[1].slice(0, d.index) : p[1]).trim() || 'Phase') + (d ? ' — ' + d[1].replace(/\s+/g, ' ') : ''));
      titre = sortie.length - 1;
      continue;
    }
    // Une rangée de tableau : ses cases remplies, séparées d'un point ; la ligne sous l'en-tête ne se lit pas.
    const rangee = /^\s*\|.*\|\s*$/.test(l) ? casesDeLaLigne(l).map(c => propre(c).trim()) : null;
    if (rangee && rangee.length && rangee.every(c => /^:?-+:?$/.test(c))) continue;
    const x = rangee ? rangee.filter(Boolean).join(' · ') : propre(l);
    if (/^organisation$/i.test(champ)) { if (x.trim() && titre >= 0) sortie[titre] += ' · ' + x.trim(); continue; }
    if (aNommer) { if (x.trim()) { sortie.push(champ + ' : ' + x); aNommer = false; } continue; }
    sortie.push(x);
  }
  return sortie.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function seanceBody(s) {
  const det = [];
  const deroulement = deroulementLisible(s.deroulement);
  if (s.objectifs) det.push('<div class="sd-l"><b>Objectifs</b>' + nl(s.objectifs) + '</div>');
  if (deroulement) det.push('<div class="sd-l"><b>Déroulement</b>' + nl(deroulement) + '</div>');
  if (s.materiel) det.push('<div class="sd-l"><b>Matériel</b>' + nl(s.materiel) + '</div>');
  return det.length ? det.join('') : '<div class="sd-l" style="color:var(--txt2)">Pas de détail saisi pour cette séance.</div>';
}

function renderSequences(seqs) {
  if (!seqs.length) return '<p class="vide">Aucune séquence.</p>';
  const seances = DATA.seances || [];
  return seqs.map(sq => {
    const ss = seances.filter(s => (s.sequenceId || s.sequence_id) === sq.id).sort((a,b) => (a.numero||0) - (b.numero||0));
    const lignes = ss.map(s =>
      '<div class="sea-item"><div class="sea-row"><span class="n">' + (s.numero || '•') + '.</span><span class="st">' + esc(s.titre || 'Séance') + '</span>'
      + (s.duree ? '<span class="d">' + s.duree + ' min</span>' : '') + '</div><div class="sea-body">' + seanceBody(s) + '</div></div>'
    ).join('');
    return '<div class="card"><div class="seq-h"><b>' + esc(sq.titre || 'Sans titre') + '</b></div>'
      + '<div class="seq-h">' + (sq.matiere ? '<span class="badge">' + esc(sq.matiere) + '</span>' : '') + (sq.cycle ? '<span class="badge g">' + esc(sq.cycle) + '</span>' : '') + '</div>'
      + (sq.objectifs ? '<div class="obj">' + esc(sq.objectifs) + '</div>' : '')
      + lignes + '</div>';
  }).join('');
}

function renderEleves(els) {
  if (!els.length) return '<p class="vide">Aucun élève.</p>';
  const parNiv = {};
  els.forEach(el => { const k = el.niveau || '—'; (parNiv[k] = parNiv[k] || []).push(el); });
  return Object.keys(parNiv).sort().map(niv => {
    const items = parNiv[niv].map(el => '<div class="card el"><span class="dot' + (el.present ? ' p' : '') + '"></span><span class="nm">' + esc(el.nom || '—') + '</span></div>').join('');
    return '<div class="jour">' + esc(niv) + ' · ' + parNiv[niv].length + ' élèves</div>' + items;
  }).join('');
}

function renderProgrammations(progs) {
  if (!progs.length) return '<p class="vide">Aucune programmation.</p>';
  const P = ['P1','P2','P3','P4','P5'];
  return progs.map(pr => {
    let lignes = [];
    try { lignes = JSON.parse(pr.lignesJson || pr.lignes_json || '[]'); } catch (e) { lignes = []; }
    const head = '<div class="jour">' + esc(pr.annee || '') + (pr.niveau ? ' · ' + esc(pr.niveau) : '') + '</div>';
    if (!lignes.length) return head + '<div class="card"><div class="obj">Programmation vide.</div></div>';
    const rows = lignes.map(l => '<tr><td class="lbl">' + esc(l.label || '') + '</td>'
      + P.map((_, i) => '<td>' + esc(l['p' + (i+1)] || '') + '</td>').join('') + '</tr>').join('');
    return head + '<div class="card scroll"><table class="prog"><thead><tr><th>Domaine</th>' + P.map(p => '<th>' + p + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }).join('');
}

fetch('/api/data?t=' + encodeURIComponent(T))
 .then(r => r.ok ? r.json() : Promise.reject(r.status))
 .then(d => {
   DATA = d;
   tabsEl.innerHTML = TABS.map(t => '<button class="tab" data-id="' + t[0] + '">' + t[1] + '</button>').join('');
   main.innerHTML = TABS.map(t => '<section id="sec-' + t[0] + '">' + t[2](d[t[0]] || []) + '</section>').join('');
   tabsEl.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => show(b.dataset.id)));
   initPlanning();
   main.addEventListener('click', ev => {
     if (ev.target.closest('.sea-body')) return;
     const it = ev.target.closest('.sea-item'); if (it) it.classList.toggle('open');
   });
   show('dictaphone');
 })
 .catch(() => { main.innerHTML = '<p class="err">Connexion perdue.<br>Vérifiez que le téléphone est sur le même WiFi que l\'ordinateur, puis rescannez le QR code.</p>'; });
</script>
</body>
</html>
"##;

#[cfg(test)]
mod tests {
    use super::{autorise, doit_se_fermer, lire_corps, parametre, PORT_PORTABLE, serie_demandee, INACTIVITE_MAX, OUVERTURE_MAX};
    use std::time::{Duration, SystemTime};

    #[test]
    fn un_envoi_trop_gros_n_est_pas_lu() {
        let mut req: tiny_http::Request = tiny_http::TestRequest::new().with_body("un vocal").into();
        assert_eq!(lire_corps(&mut req, 100).as_deref(), Some(&b"un vocal"[..]));
        let mut req: tiny_http::Request = tiny_http::TestRequest::new().with_body("un vocal bien trop long").into();
        assert_eq!(lire_corps(&mut req, 8), None);
    }

    #[test]
    fn le_port_habituel_ne_bouge_pas() {
        assert_eq!(PORT_PORTABLE, 8787);
    }

    /// Le code entier, et seulement lui : « t=abc » ne vaut pas pour « abcd », ni l'inverse.
    #[test]
    fn seul_le_bon_code_ouvre_le_partage() {
        assert!(autorise("/api/data?t=abc-123", "abc-123"));
        assert!(autorise("/?s=1&t=abc-123", "abc-123"));
        assert!(!autorise("/api/data?t=abc-1234", "abc-123"));
        assert!(!autorise("/api/data?t=abc", "abc-123"));
        assert!(!autorise("/api/data?x=t=abc-123", "abc-123"));
        assert!(!autorise("/api/data", ""));
    }

    /// Le partage se ferme tout seul : deux heures sans visite, ou dix heures après son ouverture.
    #[test]
    fn le_partage_se_ferme_tout_seul() {
        let ouvert = SystemTime::now();
        let minute = Duration::from_secs(60);
        assert!(!doit_se_fermer(ouvert, ouvert, ouvert + 30 * minute));
        assert!(doit_se_fermer(ouvert, ouvert, ouvert + INACTIVITE_MAX));
        // Une visite repousse la fermeture…
        let visite = ouvert + 100 * minute;
        assert!(!doit_se_fermer(ouvert, visite, visite + 60 * minute));
        // … mais pas au-delà de la journée.
        let tard = ouvert + OUVERTURE_MAX;
        assert!(doit_se_fermer(ouvert, tard - minute, tard));
        // Une horloge reculée avant l'ouverture ferme aussi.
        assert!(doit_se_fermer(ouvert, ouvert, ouvert - minute));
    }

    #[test]
    fn lit_les_parametres_de_l_url() {
        let url = "/api/vocal?t=abc&debut=2026-09-25T10%3A12%3A00&duree=42.5";
        assert_eq!(parametre(url, "t"), "abc");
        assert_eq!(parametre(url, "debut"), "2026-09-25T10:12:00");
        assert_eq!(parametre(url, "duree"), "42.5");
    }

    #[test]
    fn un_parametre_absent_rend_le_vide_plutot_qu_une_panique() {
        assert_eq!(parametre("/api/vocal?t=abc", "debut"), "");
        // La série se demande par l'adresse que le QR encode ; sans elle, une photo suffit.
        assert!(serie_demandee("/?t=abc&s=1"));
        assert!(!serie_demandee("/?t=abc"));
        assert!(!serie_demandee("/upload?t=abc&ext=jpg&s=0"));
        assert_eq!(parametre("", "t"), "");
    }

    #[test]
    fn ne_confond_pas_deux_parametres_qui_commencent_pareil() {
        // « dureeTotale » ne doit pas répondre pour « duree » : sans découpe
        // sur « & », le premier venu gagnait.
        let url = "/api/vocal?dureeTotale=9&duree=3";
        assert_eq!(parametre(url, "duree"), "3");
    }
}
