//! La télécommande, côté ordinateur : l'enseignant parle à son téléphone, et ce Mac — projeté au tableau — affiche.
//!
//! Le format et ce qui protège quoi sont dans `relais::telecommande`. Ici : on l'ouvre (Réglages › Téléphone, ou
//! ⌘K), un serveur écoute sur le réseau local avec un jeton neuf, et l'ouverture part, chiffrée, dans le relais —
//! le téléphone la lit là, sans QR code, qui serait projeté avec le reste. Une demande arrive scellée : on la
//! rouvre, on transcrit la parole sur cet ordinateur (ou en ligne, selon le réglage des dictées), puis la fenêtre
//! comprend et agit. Elle seule sait où mène une phrase : elle a le vocabulaire de ⌘K (voir telecommande.ts). Sa
//! réponse repart chiffrée pour le téléphone.
//!
//! La télécommande se ferme d'elle-même comme le partage WiFi : deux heures sans demande, dix heures au plus.

use crate::db::Db;
use base64::Engine as _;
use maitrize_relais as relais;
use relais::telecommande::{Demande, Genre, Ouverture, Reponse, VoixEnDirect};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex, PoisonError};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, Manager, State};

type R<T> = Result<T, String>;

/// Le port demandé d'abord ; pris, un autre au hasard — l'adresse voyage par le relais.
pub const PORT: u16 = 8788;
/// Une phrase d'une minute, scellée et en base64, tient largement.
const CORPS_MAX: u64 = 8_000_000;
/// Le temps que la fenêtre a pour comprendre et agir.
const ATTENTE_DE_LA_FENETRE: Duration = Duration::from_secs(15);

/// Ce que l'écran montre de la télécommande ouverte.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InfoTelecommande {
    pub adresses: Vec<String>,
    pub ouverte: String,
    /// Le téléphone s'est déjà présenté.
    pub reliee: bool,
}

/// La télécommande ouverte, et de quoi l'arrêter.
pub struct Telecommande(pub Mutex<Option<(Arc<AtomicBool>, InfoTelecommande)>>);

/// Les phrases confiées à la fenêtre, qui attendent sa réponse.
pub struct Attentes(pub Mutex<HashMap<String, mpsc::Sender<Reponse>>>);

/// Ce qu'une demande ouverte devient : une réponse tout de suite, ou une question à la fenêtre.
#[derive(Debug, PartialEq)]
pub(crate) enum Suite {
    Repondre(Reponse),
    /// Une phrase à comprendre : dite — le son, et ce qu'en a entendu l'écoute en direct, peut-être — ou écrite.
    Parole { son: Vec<u8>, direct: String },
    Phrase(String),
    /// Oui ou non à la question `id`.
    Decision { id: String, oui: bool },
    /// Ce que la fenêtre comprend, pour « Que dire ? » sur le téléphone.
    Aide,
    /// Un jeton pour écouter en direct (Voxtral Realtime).
    Voix,
}

/// Rouvre une demande et dit ce qu'il faut en faire ; refuse ce qui n'est pas de ce téléphone, de cette séance,
/// ou qui a déjà été vu — une demande relevée sur le réseau et renvoyée.
pub(crate) fn lire_demande(privee: &[u8; 32], jeton: &str, dernier_numero: &mut u64, corps: &[u8]) -> R<Suite> {
    let d: Demande = relais::telecommande::ouvrir(privee, corps)?;
    if d.jeton != jeton {
        return Err("Séance inconnue : rouvrez la télécommande sur l'ordinateur.".into());
    }
    if d.numero <= *dernier_numero {
        return Err("Demande déjà reçue.".into());
    }
    *dernier_numero = d.numero;
    Ok(match d.genre {
        Genre::Bonjour => Suite::Repondre(Reponse { ok: true, fait: format!("Relié à {}.", nom_du_mac()), ..Default::default() }),
        Genre::Parole => {
            let son = base64::engine::general_purpose::STANDARD.decode(d.audio.as_bytes()).map_err(|_| "Son illisible.".to_string())?;
            Suite::Parole { son, direct: d.texte }
        }
        Genre::Texte => Suite::Phrase(d.texte),
        Genre::Confirmer => Suite::Decision { id: d.id, oui: true },
        Genre::Annuler => Suite::Decision { id: d.id, oui: false },
        Genre::Aide => Suite::Aide,
        Genre::Voix => Suite::Voix,
    })
}

fn nom_du_mac() -> String {
    let nom = crate::portable::nom_local();
    let nom = nom.trim_end_matches(".local").replace('-', " ");
    if nom.trim().is_empty() { "l'ordinateur".into() } else { format!("« {nom} »") }
}

/// Transcrit une phrase dite, comme les dictées : sur cet ordinateur, ou en ligne si c'est le réglage.
///
/// Sur cet ordinateur, Whisper lit d'abord `invite` — des commandes, les pages qu'on nomme, les prénoms de la classe
/// (voir `inviteDeLaVoix` dans telecommande.ts) — comme s'il venait de les entendre : une commande de deux mots ne
/// s'écrit juste qu'à ce prix. Elle ne quitte jamais l'ordinateur.
fn transcrire(app: &AppHandle, octets: &[u8], invite: &str) -> R<String> {
    use crate::whisper_embarque::{choix_ici, transcrire_une_commande, Choix, Moteur, Usage};
    let choix = choix_ici(&app.state::<Db>().lock(), Usage::Dictees);
    match choix? {
        Choix::Local(modele) => transcrire_une_commande(&app.state::<Moteur>(), octets, &modele, invite),
        Choix::EnLigne => {
            let b64 = base64::engine::general_purpose::STANDARD.encode(octets);
            tauri::async_runtime::block_on(crate::ai::transcrire_audio(app.state::<Db>(), b64, "commande.wav".into()))
        }
    }
}

/// Le réglage : « oui », le téléphone écoute d'abord en direct chez Mistral (Voxtral Realtime).
const CLE_TEMPS_REEL: &str = "telecommande:realtime";

/// Un jeton d'écoute en direct pour le téléphone, s'il est voulu et si la clé Mistral l'ouvre. Sans lui, le
/// téléphone envoie le son seul, que cet ordinateur transcrit.
fn voix_en_direct(app: &AppHandle) -> Reponse {
    let voulue = crate::sync::get_setting(&app.state::<Db>().lock(), CLE_TEMPS_REEL) == "oui";
    if !voulue {
        return Reponse { ok: false, fait: "L'écoute en direct n'est pas cochée sur l'ordinateur.".into(), ..Default::default() };
    }
    let db = app.state::<Db>();
    match tauri::async_runtime::block_on(crate::ai::jeton_temps_reel(&db, crate::ai::MODELE_TEMPS_REEL)) {
        Ok(j) => Reponse {
            ok: true,
            voix: Some(VoixEnDirect { jeton: j.jeton, modele: j.modele, expire: j.expire }),
            ..Default::default()
        },
        Err(e) => Reponse { ok: false, fait: format!("Écoute en direct impossible : {e}"), ..Default::default() },
    }
}

/// Confie une phrase (ou une décision) à la fenêtre et attend sa réponse.
fn demander_a_la_fenetre(app: &AppHandle, evenement: &str, mut charge: serde_json::Value) -> Reponse {
    let attente = uuid::Uuid::new_v4().to_string();
    let (tx, rx) = mpsc::channel();
    app.state::<Attentes>().0.lock().unwrap_or_else(PoisonError::into_inner).insert(attente.clone(), tx);
    charge["attente"] = attente.clone().into();
    // À la fenêtre principale seule : une phrase peut porter un prénom.
    let reponse = if app.emit_to("main", evenement, charge).is_ok() {
        rx.recv_timeout(ATTENTE_DE_LA_FENETRE).ok()
    } else {
        None
    };
    app.state::<Attentes>().0.lock().unwrap_or_else(PoisonError::into_inner).remove(&attente);
    reponse.unwrap_or_else(|| Reponse { ok: false, fait: "Maitrize n'a pas répondu à temps sur l'ordinateur.".into(), ..Default::default() })
}

/// Ce dont le serveur a besoin de l'application : transcrire, confier à la fenêtre, dire que le téléphone est là.
/// À part de Tauri, pour que le serveur s'éprouve dans un essai, avec un faux téléphone.
pub(crate) struct Fil<'a> {
    pub transcrire: &'a dyn Fn(&[u8]) -> R<String>,
    pub fenetre: &'a dyn Fn(&str, serde_json::Value) -> Reponse,
    pub reliee: &'a dyn Fn(),
    /// Un jeton d'écoute en direct, si l'enseignant l'a voulu.
    pub voix: &'a dyn Fn() -> Reponse,
}

/// Ce que la demande devient, une fois la parole transcrite et la fenêtre consultée.
fn traiter(fil: &Fil, suite: Suite) -> Reponse {
    // `secours` : la fenêtre peut demander à Mistral, si l'enseignant l'a voulu ; pas pour un premier essai.
    let phrase = |texte: &str, secours: bool| {
        let mut r = (fil.fenetre)("telecommande:phrase", serde_json::json!({ "texte": texte, "secours": secours }));
        r.entendu = texte.to_string();
        r
    };
    match suite {
        Suite::Repondre(r) => r,
        Suite::Parole { son, direct } => {
            // L'écoute en direct d'abord : comprise, c'est fait — vite. Sinon, le même son transcrit ici, avec la
            // liste des commandes, a sa chance (à l'essai, l'écoute en direct se trompait plus souvent).
            if !direct.trim().is_empty() {
                let r = phrase(direct.trim(), false);
                if r.ok {
                    return r;
                }
            }
            match (fil.transcrire)(&son) {
                Ok(texte) if !texte.trim().is_empty() => phrase(texte.trim(), true),
                Ok(_) => Reponse { ok: false, fait: "Je n'ai rien entendu.".into(), ..Default::default() },
                Err(e) => Reponse { ok: false, fait: format!("Transcription impossible : {e}"), ..Default::default() },
            }
        }
        Suite::Phrase(texte) => phrase(texte.trim(), true),
        Suite::Decision { id, oui } => (fil.fenetre)("telecommande:decision", serde_json::json!({ "id": id, "oui": oui })),
        Suite::Aide => (fil.fenetre)("telecommande:aide", serde_json::json!({})),
        Suite::Voix => (fil.voix)(),
    }
}

/// Répond à une requête du réseau ; rend vrai si c'était bien le téléphone (une visite).
fn repondre(mut req: tiny_http::Request, fil: &Fil, cles: &([u8; 32], [u8; 32]), jeton: &str, dernier_numero: &mut u64) -> bool {
    let envoyer = |req: tiny_http::Request, code: u16, corps: Vec<u8>| {
        let entete = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/octet-stream"[..]).expect("en-tête valide");
        let _ = req.respond(tiny_http::Response::from_data(corps).with_status_code(code).with_header(entete));
    };
    if req.method() != &tiny_http::Method::Post || !req.url().starts_with("/telecommande") {
        envoyer(req, 404, Vec::new());
        return false;
    }
    let Some(corps) = crate::portable::lire_corps(&mut req, CORPS_MAX) else {
        envoyer(req, 413, Vec::new());
        return false;
    };
    let (privee, cle_retour) = cles;
    let suite = match lire_demande(privee, jeton, dernier_numero, &corps) {
        Ok(s) => s,
        Err(_) => {
            envoyer(req, 403, Vec::new());
            return false;
        }
    };
    if let Suite::Repondre(_) = &suite {
        (fil.reliee)();
    }
    let reponse = traiter(fil, suite);
    match relais::telecommande::chiffrer(cle_retour, &reponse) {
        Ok(blob) => envoyer(req, 200, blob),
        Err(_) => envoyer(req, 500, Vec::new()),
    }
    true
}

/// Le téléphone s'est présenté : l'écran le dit.
fn marquer_reliee(app: &AppHandle) {
    let tc = app.state::<Telecommande>();
    let mut garde = tc.0.lock().unwrap_or_else(PoisonError::into_inner);
    if let Some((_, info)) = garde.as_mut() {
        if !info.reliee {
            info.reliee = true;
            let _ = app.emit("telecommande:etat", Some(info.clone()));
        }
    }
}

/// Arrête la séance `stop` si c'est encore elle, efface son ouverture du relais, et le dit à l'écran.
fn fermer_la_seance(app: &AppHandle, stop: &Arc<AtomicBool>) {
    let tc = app.state::<Telecommande>();
    let mut garde = tc.0.lock().unwrap_or_else(PoisonError::into_inner);
    if garde.as_ref().is_some_and(|(s, _)| Arc::ptr_eq(s, stop)) {
        *garde = None;
        drop(garde);
        stop.store(true, Ordering::Relaxed);
        let _ = app.emit("telecommande:etat", None::<InfoTelecommande>);
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let db = app.state::<Db>();
            let _ = crate::telephone::ecrire_au_retour(&db, relais::telecommande::FICHIER, None).await;
        });
        crate::commands::diag_ecrire("TÉLÉCOMMANDE fermée".to_string());
    }
}

/// Sert les demandes jusqu'à l'arrêt, ou jusqu'à la fermeture d'elle-même : deux heures sans demande, dix au plus.
fn servir(server: tiny_http::Server, fil: &Fil, cles: &([u8; 32], [u8; 32]), jeton: &str, stop: &AtomicBool, fermer: &dyn Fn()) {
    let ouvert = SystemTime::now();
    let mut derniere_visite = ouvert;
    let mut dernier_numero = 0u64;
    loop {
        if stop.load(Ordering::Relaxed) {
            break;
        }
        if crate::portable::doit_se_fermer(ouvert, derniere_visite, SystemTime::now()) {
            fermer();
            break;
        }
        match server.recv_timeout(Duration::from_millis(300)) {
            Ok(Some(req)) => {
                if repondre(req, fil, cles, jeton, &mut dernier_numero) {
                    derniere_visite = SystemTime::now();
                }
            }
            Ok(None) => continue,
            Err(_) => break,
        }
    }
}

fn serveur() -> R<tiny_http::Server> {
    match tiny_http::Server::http(("0.0.0.0", PORT)) {
        Ok(s) => Ok(s),
        Err(_) => tiny_http::Server::http("0.0.0.0:0").map_err(|e| e.to_string()),
    }
}

/// Ouvre la télécommande : le serveur, le jeton, et l'ouverture déposée dans le relais pour le téléphone.
#[tauri::command]
pub async fn telecommande_ouvrir(
    app: AppHandle,
    db: State<'_, Db>,
    tc: State<'_, Telecommande>,
    invite: Option<String>,
) -> R<InfoTelecommande> {
    // Une séance d'avant, s'il en reste une, s'arrête : son jeton ne vaudra plus rien.
    if let Some((stop, _)) = tc.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    let cles = crate::telephone::cles_du_relais(&db.lock())?;
    let server = serveur()?;
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("port introuvable")?;
    let jeton = uuid::Uuid::new_v4().to_string();
    let mut adresses = vec![format!("http://{}:{port}", crate::portable::ip_locale())];
    let hote = crate::portable::nom_local();
    if !hote.is_empty() {
        adresses.push(format!("http://{hote}:{port}"));
    }
    let ouverture = Ouverture { adresses: adresses.clone(), jeton: jeton.clone(), ouverte: crate::models::now_iso(), nom: nom_du_mac() };
    let blob = relais::telecommande::chiffrer(&cles.1, &ouverture)?;
    crate::telephone::ecrire_au_retour(&db, relais::telecommande::FICHIER, Some(blob))
        .await
        .map_err(|e| format!("Le téléphone ne pourra pas trouver ce Mac : {e}"))?;

    let stop = Arc::new(AtomicBool::new(false));
    let info = InfoTelecommande { adresses, ouverte: ouverture.ouverte.clone(), reliee: false };
    *tc.0.lock().unwrap_or_else(PoisonError::into_inner) = Some((stop.clone(), info.clone()));
    let app_fil = app.clone();
    std::thread::spawn(move || {
        let fil = Fil {
            transcrire: &|octets| transcrire(&app_fil, octets, invite.as_deref().unwrap_or_default()),
            fenetre: &|evenement, charge| demander_a_la_fenetre(&app_fil, evenement, charge),
            reliee: &|| marquer_reliee(&app_fil),
            voix: &|| voix_en_direct(&app_fil),
        };
        servir(server, &fil, &cles, &jeton, &stop, &|| fermer_la_seance(&app_fil, &stop));
    });
    let _ = app.emit("telecommande:etat", Some(info.clone()));
    crate::commands::diag_ecrire("TÉLÉCOMMANDE ouverte".to_string());
    Ok(info)
}

/// Ferme la télécommande, et efface son ouverture du relais.
#[tauri::command]
pub async fn telecommande_fermer(app: AppHandle, db: State<'_, Db>, tc: State<'_, Telecommande>) -> R<()> {
    let ouverte = tc.0.lock().unwrap_or_else(PoisonError::into_inner).take();
    if let Some((stop, _)) = ouverte {
        stop.store(true, Ordering::Relaxed);
        let _ = app.emit("telecommande:etat", None::<InfoTelecommande>);
        crate::commands::diag_ecrire("TÉLÉCOMMANDE fermée".to_string());
    }
    // Même sans séance ici — l'application relancée —, une ouverture restée dans le relais s'en va.
    let _ = crate::telephone::ecrire_au_retour(&db, relais::telecommande::FICHIER, None).await;
    Ok(())
}

/// La télécommande est-elle ouverte, et le téléphone s'y est-il présenté ?
#[tauri::command]
pub fn telecommande_etat(tc: State<Telecommande>) -> Option<InfoTelecommande> {
    tc.0.lock().unwrap_or_else(PoisonError::into_inner).as_ref().map(|(_, info)| info.clone())
}

/// La réponse de la fenêtre à une phrase qu'on lui a confiée.
#[tauri::command]
pub fn telecommande_repondre(attentes: State<Attentes>, attente: String, reponse: Reponse) {
    if let Some(tx) = attentes.0.lock().unwrap_or_else(PoisonError::into_inner).remove(&attente) {
        let _ = tx.send(reponse);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::engine::general_purpose::STANDARD;

    fn demande(numero: u64, genre: Genre) -> Demande {
        Demande { jeton: "j-1".into(), numero, genre, ..Default::default() }
    }

    #[test]
    fn une_demande_du_telephone_se_lit_une_fois_et_pour_cette_seance_seulement() {
        let (privee, publique) = relais::nouvelle_paire();
        let mut dernier = 0;
        let mut parole = demande(1, Genre::Parole);
        parole.audio = STANDARD.encode(b"RIFF....WAVE");
        let scelle = relais::telecommande::sceller(&publique, &parole).unwrap();
        assert_eq!(
            lire_demande(&privee, "j-1", &mut dernier, &scelle).unwrap(),
            Suite::Parole { son: b"RIFF....WAVE".to_vec(), direct: String::new() }
        );
        // Rejouée — relevée sur le réseau et renvoyée — : refusée.
        assert!(lire_demande(&privee, "j-1", &mut dernier, &scelle).is_err());
        // Une autre séance : refusée.
        let autre = relais::telecommande::sceller(&publique, &Demande { jeton: "j-2".into(), numero: 5, ..Default::default() }).unwrap();
        assert!(lire_demande(&privee, "j-1", &mut dernier, &autre).is_err());
        // Scellée pour un autre ordinateur : refusée.
        let ailleurs = relais::telecommande::sceller(&relais::nouvelle_paire().1, &demande(9, Genre::Bonjour)).unwrap();
        assert!(lire_demande(&privee, "j-1", &mut dernier, &ailleurs).is_err());
        // La suite.
        let decision = relais::telecommande::sceller(&publique, &Demande { id: "q1".into(), ..demande(2, Genre::Annuler) }).unwrap();
        assert_eq!(lire_demande(&privee, "j-1", &mut dernier, &decision).unwrap(), Suite::Decision { id: "q1".into(), oui: false });
        let bonjour = relais::telecommande::sceller(&publique, &demande(3, Genre::Bonjour)).unwrap();
        assert!(matches!(lire_demande(&privee, "j-1", &mut dernier, &bonjour).unwrap(), Suite::Repondre(Reponse { ok: true, .. })));
        let aide = relais::telecommande::sceller(&publique, &demande(4, Genre::Aide)).unwrap();
        assert_eq!(lire_demande(&privee, "j-1", &mut dernier, &aide).unwrap(), Suite::Aide);
        let voix = relais::telecommande::sceller(&publique, &demande(5, Genre::Voix)).unwrap();
        assert_eq!(lire_demande(&privee, "j-1", &mut dernier, &voix).unwrap(), Suite::Voix);
    }

    /// Envoie un corps en POST, à la main, et rend le code et le corps de la réponse.
    fn poster(adresse: std::net::SocketAddr, corps: &[u8]) -> (u16, Vec<u8>) {
        use std::io::{Read, Write};
        let mut flux = std::net::TcpStream::connect(adresse).unwrap();
        write!(flux, "POST /telecommande HTTP/1.1\r\nHost: x\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", corps.len()).unwrap();
        flux.write_all(corps).unwrap();
        let mut tout = Vec::new();
        flux.read_to_end(&mut tout).unwrap();
        let fin = tout.windows(4).position(|w| w == b"\r\n\r\n").unwrap();
        let code = String::from_utf8_lossy(&tout[9..12]).parse().unwrap();
        (code, tout[fin + 4..].to_vec())
    }

    /// Le chemin entier : le téléphone scelle, le serveur rouvre, transcrit, confie à la fenêtre, et répond chiffré.
    #[test]
    fn le_serveur_transcrit_confie_a_la_fenetre_et_repond_chiffre() {
        let (privee, publique) = relais::nouvelle_paire();
        let cle_retour = relais::nouvelle_cle();
        let cles = (privee, cle_retour);
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let adresse = server.server_addr().to_ip().unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        let arret = stop.clone();
        let fil = std::thread::spawn(move || {
            let reliee = AtomicBool::new(false);
            let fil = Fil {
                transcrire: &|octets| Ok(format!("minuteur {} minutes", octets.len())),
                // Une fenêtre qui ne comprend pas « Malaka » ; « secours » dit si Mistral aurait pu servir.
                fenetre: &|evenement, charge| {
                    let texte = charge["texte"].as_str().unwrap_or("");
                    Reponse {
                        ok: texte != "Malaka",
                        fait: format!("{evenement} : {texte}{}", if charge["secours"] == false { " (sans secours)" } else { "" }),
                        ..Default::default()
                    }
                },
                reliee: &|| reliee.store(true, Ordering::Relaxed),
                voix: &|| Reponse {
                    ok: true,
                    voix: Some(VoixEnDirect { jeton: "rt_essai".into(), modele: "m".into(), ..Default::default() }),
                    ..Default::default()
                },
            };
            servir(server, &fil, &cles, "j-1", &arret, &|| {});
            reliee.load(Ordering::Relaxed)
        });

        let envoyer = |d: &Demande| poster(adresse, &relais::telecommande::sceller(&publique, d).unwrap());
        let (code, corps) = envoyer(&demande(1, Genre::Bonjour));
        assert_eq!(code, 200);
        assert!(relais::telecommande::dechiffrer::<Reponse>(&cle_retour, &corps).unwrap().ok);

        let mut parole = demande(2, Genre::Parole);
        parole.audio = STANDARD.encode([0u8; 5]);
        let (code, corps) = envoyer(&parole);
        assert_eq!(code, 200);
        let r: Reponse = relais::telecommande::dechiffrer(&cle_retour, &corps).unwrap();
        assert_eq!(r.entendu, "minuteur 5 minutes");
        assert_eq!(r.fait, "telecommande:phrase : minuteur 5 minutes");
        assert!(!String::from_utf8_lossy(&corps).contains("minuteur"), "la réponse ne passe pas en clair");

        // Dite et entendue en direct : le texte du direct d'abord, sans Mistral ; compris, le son n'est pas transcrit.
        let mut parole = demande(5, Genre::Parole);
        parole.audio = STANDARD.encode([0u8; 7]);
        parole.texte = "Va à la CAA".into();
        let r: Reponse = relais::telecommande::dechiffrer(&cle_retour, &envoyer(&parole).1).unwrap();
        assert_eq!((r.entendu.as_str(), r.fait.as_str()), ("Va à la CAA", "telecommande:phrase : Va à la CAA (sans secours)"));
        // Pas compris : le même son, transcrit ici, a sa chance — avec le secours, cette fois.
        let mut parole = demande(6, Genre::Parole);
        parole.audio = STANDARD.encode([0u8; 7]);
        parole.texte = "Malaka".into();
        let r: Reponse = relais::telecommande::dechiffrer(&cle_retour, &envoyer(&parole).1).unwrap();
        assert_eq!((r.entendu.as_str(), r.fait.as_str()), ("minuteur 7 minutes", "telecommande:phrase : minuteur 7 minutes"));

        // « Que dire ? » : la fenêtre répond.
        let (code, corps) = envoyer(&demande(7, Genre::Aide));
        assert_eq!(code, 200);
        assert_eq!(relais::telecommande::dechiffrer::<Reponse>(&cle_retour, &corps).unwrap().fait, "telecommande:aide : ");

        // Un jeton d'écoute en direct : il ne passe que chiffré.
        let (code, corps) = envoyer(&demande(8, Genre::Voix));
        assert_eq!(code, 200);
        assert!(!String::from_utf8_lossy(&corps).contains("rt_essai"));
        let r: Reponse = relais::telecommande::dechiffrer(&cle_retour, &corps).unwrap();
        assert_eq!(r.voix.map(|v| v.jeton), Some("rt_essai".to_string()));

        // Rejouée, ou d'une autre séance : refusée, sans rien dire.
        assert_eq!(envoyer(&parole).0, 403);
        assert_eq!(envoyer(&Demande { jeton: "j-2".into(), ..demande(9, Genre::Bonjour) }).0, 403);
        assert_eq!(poster(adresse, b"pas une demande").0, 403);

        stop.store(true, Ordering::Relaxed);
        assert!(fil.join().unwrap(), "le téléphone s'est présenté");
    }
}
