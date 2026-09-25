//! Version portable : l'app desktop sert un instantané de données sur le
//! réseau local (WiFi). Le téléphone l'ouvre dans son navigateur via un QR
//! code. Protégé par un jeton, démarré/arrêté à la demande. Rien ne transite
//! par internet : tout reste sur le réseau local.
//!
//! Tout est en lecture, à une exception : les temps d'observation. Une
//! observation se remplit en classe, debout, à côté de l'élève — c'est le
//! téléphone qu'on a en main à ce moment-là, pas l'ordinateur. Le téléphone
//! ne peut que **remplir les colonnes d'une fiche déjà posée** : il ne crée
//! rien, ne change ni l'élève ni l'axe, et ne touche à rien d'autre.

use crate::db::Db;
use crate::models::{Creneau, Eleve, ObservationEleve, ProgrammationFinale, Seance, Sequence};
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;
use serde::Deserialize;
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

/// État partagé : le drapeau d'arrêt du serveur en cours, s'il y en a un.
pub struct Portable(pub Mutex<Option<Arc<AtomicBool>>>);

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortableInfo {
    pub url: String,
    pub ip: String,
    pub port: u16,
    pub qr_svg: String,
}

/// Instantané des données envoyé au téléphone (lecture seule).
#[derive(serde::Serialize)]
struct Bundle {
    planning: Vec<Creneau>,
    sequences: Vec<Sequence>,
    seances: Vec<Seance>,
    eleves: Vec<Eleve>,
    programmations: Vec<ProgrammationFinale>,
    /// Les temps d'observation posés : le téléphone, lui, peut les remplir.
    observations: Vec<ObservationEleve>,
}

/// IP locale sans dépendance : « connecter » un socket UDP fixe la route locale
/// (aucune donnée n'est réellement envoyée).
fn ip_locale() -> String {
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".into())
}

fn qr_svg(data: &str) -> String {
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
    let programmations = {
        let mut st = c
            .prepare("SELECT * FROM programmations_finale ORDER BY annee")
            .map_err(e)?;
        let rows = st.query_map([], ProgrammationFinale::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };

    let observations = {
        let mut st = c
            .prepare("SELECT * FROM observations_eleve ORDER BY date DESC, date_creation DESC LIMIT 60")
            .map_err(e)?;
        let rows = st.query_map([], ObservationEleve::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };

    let bundle = Bundle {
        planning,
        sequences,
        seances,
        eleves,
        programmations,
        observations,
    };
    serde_json::to_string(&bundle).map_err(e)
}

#[tauri::command]
pub fn portable_demarrer(app: tauri::AppHandle, db: State<Db>, portable: State<Portable>) -> R<PortableInfo> {
    // Arrêter une instance précédente éventuelle.
    if let Some(stop) = portable.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }

    // Instantané des données, figé au moment du clic (lecture seule).
    let data_json = snapshot(&db)?;

    let token = Uuid::new_v4().to_string();
    let server = tiny_http::Server::http("0.0.0.0:0").map_err(|err| err.to_string())?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|a| a.port())
        .ok_or("port introuvable")?;
    let ip = ip_locale();
    let url = format!("http://{ip}:{port}/?t={token}");
    let qr = qr_svg(&url);

    let stop = Arc::new(AtomicBool::new(false));
    let stop_thread = stop.clone();
    let page = PAGE_HTML.to_string();
    std::thread::spawn(move || loop {
        if stop_thread.load(Ordering::Relaxed) {
            break;
        }
        match server.recv_timeout(Duration::from_millis(300)) {
            Ok(Some(req)) => repondre(req, &token, &page, &data_json, &app),
            Ok(None) => continue,
            Err(_) => break,
        }
    });

    *portable.0.lock().unwrap_or_else(PoisonError::into_inner) = Some(stop);
    Ok(PortableInfo {
        url,
        ip,
        port,
        qr_svg: qr,
    })
}

#[tauri::command]
pub fn portable_arreter(portable: State<Portable>) -> R<()> {
    if let Some(stop) = portable.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// Ce que le téléphone a le droit d'écrire : les colonnes d'une fiche déjà
/// posée, rien d'autre. Il ne crée pas de fiche, ne change pas d'élève, ne
/// touche pas à l'axe — le cadre de l'observation se décide sur l'ordinateur.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservationRemplie {
    id: String,
    #[serde(default)]
    note: String,
    #[serde(default)]
    reussites: String,
    #[serde(default)]
    difficultes: String,
    #[serde(default)]
    hypotheses: String,
    #[serde(default)]
    amenagements: String,
    #[serde(default)]
    reajustement: String,
}

/// Écrit ce que le téléphone envoie, et dit si c'est passé.
fn ecrire_observation(app: &tauri::AppHandle, corps: &str) -> Result<(), String> {
    let o: ObservationRemplie = serde_json::from_str(corps).map_err(e)?;
    let db = app.state::<Db>();
    let c = db.lock();
    let touchees = c
        .execute(
            "UPDATE observations_eleve SET note=?2, reussites=?3, difficultes=?4, hypotheses=?5,
             amenagements=?6, reajustement=?7, date_maj=?8 WHERE id=?1",
            rusqlite::params![
                o.id, o.note, o.reussites, o.difficultes, o.hypotheses, o.amenagements,
                o.reajustement, crate::models::now_iso()
            ],
        )
        .map_err(e)?;
    if touchees == 0 {
        return Err("Cette observation n'existe plus sur l'ordinateur.".into());
    }
    Ok(())
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
    if octets.len() < 100 {
        return Err("Enregistrement vide.".into());
    }
    let debut = parametre(url, "debut");
    let duree: f64 = parametre(url, "duree").parse().unwrap_or(0.0);
    let id = crate::models::new_id();
    let fichier = format!("vocal-{id}.wav");
    std::fs::write(crate::db::fichiers_dir().join(&fichier), &octets)
        .map_err(|er| format!("Écriture impossible : {er}"))?;
    let db = app.state::<Db>();
    let c = db.lock();
    c.execute(
        "INSERT INTO vocaux (id,fichier,debut,duree_s,texte,etat,erreur,date_creation)
         VALUES (?1,?2,?3,?4,'','recu','',?5)",
        rusqlite::params![id, fichier, debut, duree, crate::models::now_iso()],
    )
    .map_err(|er| er.to_string())?;
    let _ = app.emit("vocal:recu", id.clone());
    Ok(id)
}

fn repondre(mut req: tiny_http::Request, token: &str, page: &str, data_json: &str, app: &tauri::AppHandle) {
    let url = req.url().to_string();
    let autorise = url.contains(&format!("t={token}"));
    // Le dépôt d'un vocal se lit avant toute réponse : le corps ne se relit pas.
    if autorise && url.starts_with("/api/vocal") {
        let mut octets = Vec::new();
        let lu = std::io::Read::read_to_end(req.as_reader(), &mut octets).is_ok();
        let (code, body) = match lu.then(|| ecrire_vocal(app, &url, octets)) {
            Some(Ok(id)) => (200, format!("{{\"ok\":true,\"id\":{}}}", serde_json::to_string(&id).unwrap_or_default())),
            Some(Err(message)) => (400, format!("{{\"ok\":false,\"erreur\":{}}}", serde_json::to_string(&message).unwrap_or_default())),
            None => (400, "{\"ok\":false}".to_string()),
        };
        let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..])
            .expect("en-tete valide");
        let _ = req.respond(tiny_http::Response::from_string(body).with_status_code(code).with_header(header));
        return;
    }
    // Le compagnon demande seulement si l'ordinateur est là.
    if url.starts_with("/api/bonjour") {
        let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..])
            .expect("en-tete valide");
        let body = if autorise { "{\"ok\":true}" } else { "{\"ok\":false}" };
        let _ = req.respond(tiny_http::Response::from_string(body).with_status_code(if autorise { 200 } else { 403 }).with_header(header));
        return;
    }
    // L'écriture se lit avant toute réponse : le corps ne se relit pas.
    if autorise && url.starts_with("/api/observation") {
        let mut corps = String::new();
        let lu = std::io::Read::read_to_string(req.as_reader(), &mut corps).is_ok();
        let (code, body) = match lu.then(|| ecrire_observation(app, &corps)) {
            Some(Ok(())) => (200, "{\"ok\":true}".to_string()),
            Some(Err(message)) => (400, format!("{{\"ok\":false,\"erreur\":{}}}", serde_json::to_string(&message).unwrap_or_default())),
            None => (400, "{\"ok\":false}".to_string()),
        };
        let header = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..])
            .expect("en-tete valide");
        let _ = req.respond(tiny_http::Response::from_string(body).with_status_code(code).with_header(header));
        return;
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
}

// ── Capture photo depuis le téléphone ────────────────────────────────
// Le téléphone ouvre une page (via QR), prend une photo avec l'appareil natif
// (<input capture>, qui marche en HTTP sans HTTPS), et la POST au serveur local.
// La photo est enregistrée dans Fichiers/ et un événement `photo:recue` est
// émis vers le front avec le nom du fichier. La session s'arrête après 1 photo.

pub struct PhotoCapture(pub Mutex<Option<Arc<AtomicBool>>>);

#[tauri::command]
pub fn photo_capture_demarrer(app: tauri::AppHandle, photo: State<PhotoCapture>) -> R<PortableInfo> {
    if let Some(stop) = photo.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    let token = Uuid::new_v4().to_string();
    let server = tiny_http::Server::http("0.0.0.0:0").map_err(|err| err.to_string())?;
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("port introuvable")?;
    let ip = ip_locale();
    let url = format!("http://{ip}:{port}/?t={token}");
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
                    stop_thread.store(true, Ordering::Relaxed); // photo reçue → fin
                }
            }
            Ok(None) => continue,
            Err(_) => break,
        }
    });

    *photo.0.lock().unwrap_or_else(PoisonError::into_inner) = Some(stop);
    Ok(PortableInfo { url, ip, port, qr_svg: qr })
}

#[tauri::command]
pub fn photo_capture_arreter(photo: State<PhotoCapture>) -> R<()> {
    if let Some(stop) = photo.0.lock().unwrap_or_else(PoisonError::into_inner).take() {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// Traite une requête de capture. Renvoie true si une photo a bien été reçue.
fn photo_repondre(mut req: tiny_http::Request, token: &str, app: &tauri::AppHandle) -> bool {
    let url = req.url().to_string();
    if !url.contains(&format!("t={token}")) {
        let _ = req.respond(tiny_http::Response::from_string("Acces refuse").with_status_code(403));
        return false;
    }
    if req.method() == &tiny_http::Method::Post && url.starts_with("/upload") {
        let ext = if url.contains("ext=png") { "png" } else { "jpg" };
        let mut buf = Vec::new();
        if req.as_reader().read_to_end(&mut buf).is_ok() && !buf.is_empty() {
            let fichier = format!("{}.{}", Uuid::new_v4(), ext);
            if std::fs::write(crate::db::fichiers_dir().join(&fichier), &buf).is_ok() {
                let _ = app.emit("photo:recue", fichier);
                let _ = req.respond(tiny_http::Response::from_string("OK"));
                return true;
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
 <label class="big" id="lab"><input type="file" accept="image/*" capture="environment" id="f" hidden>📷 Prendre une photo</label>
 <img id="prev" style="display:none" alt="">
 <button id="send" style="display:none">Envoyer à l'ordinateur ↗</button>
 <p id="msg"></p>
</main>
<script>
const t = new URLSearchParams(location.search).get('t') || '';
const f = document.getElementById('f'), prev = document.getElementById('prev'),
      send = document.getElementById('send'), msg = document.getElementById('msg'), lab = document.getElementById('lab');
let file = null;
f.addEventListener('change', () => {
  file = f.files && f.files[0];
  if (!file) return;
  prev.src = URL.createObjectURL(file); prev.style.display = 'block';
  send.style.display = 'block'; lab.lastChild.textContent = '📷 Reprendre la photo'; msg.textContent = '';
});
send.addEventListener('click', async () => {
  if (!file) return;
  send.disabled = true; msg.textContent = 'Envoi en cours…';
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  try {
    const r = await fetch('/upload?t=' + encodeURIComponent(t) + '&ext=' + ext, { method: 'POST', body: file });
    if (r.ok) { msg.textContent = '✅ Photo envoyée à l\'ordinateur ! Vous pouvez fermer cette page.'; send.style.display = 'none'; lab.style.display = 'none'; prev.style.opacity = '.5'; }
    else { msg.textContent = 'Échec de l\'envoi (' + r.status + ').'; send.disabled = false; }
  } catch (e) { msg.textContent = 'Connexion perdue. Vérifiez le WiFi et rescannez le QR.'; send.disabled = false; }
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
 .obs .obs-h { font-size:14.5px; margin-bottom:2px; }
 .obs .obs-h small { color:var(--txt2); font-weight:500; }
 .obs .obs-axe { font-size:12.5px; color:var(--txt2); margin-bottom:8px; line-height:1.4; }
 .obs-l { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--txt2); font-weight:700; margin-bottom:8px; }
 .obs-l textarea { display:block; width:100%; margin-top:3px; box-sizing:border-box; background:var(--bg); color:var(--txt); border:1px solid var(--bd); border-radius:9px; padding:9px 10px; font:inherit; font-size:15px; text-transform:none; letter-spacing:0; font-weight:400; line-height:1.45; }
 .obs-save { width:100%; padding:11px; border:none; border-radius:10px; background:var(--acc); color:#fff; font:inherit; font-size:15px; font-weight:700; cursor:pointer; }
 .obs-save:disabled { opacity:.7; }
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
  ['planning','🗓 Planning', renderPlanning],
  ['observations','👁 Observer', renderObservations],
  ['sequences','📚 Séquences', renderSequences],
  ['eleves','👧 Élèves', renderEleves],
  ['programmations','🗂 Programmations', renderProgrammations],
];

/** Les colonnes de la grille « Observer », dans l'ordre du document. */
const COLS = [
  ['note','Ce qui s\'est passé'],
  ['reussites','Réussites, points d\'appui'],
  ['difficultes','Difficultés, obstacles'],
  ['hypotheses','Besoin identifié — hypothèses'],
  ['amenagements','Propositions — aménagements'],
  ['reajustement','Évaluation — réajustement'],
];

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

function seanceBody(s) {
  const det = [];
  if (s.objectifs) det.push('<div class="sd-l"><b>Objectifs</b>' + nl(s.objectifs) + '</div>');
  if (s.deroulement) det.push('<div class="sd-l"><b>Déroulement</b>' + nl(s.deroulement) + '</div>');
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

/**
 * Les temps d'observation, remplissables ici.
 *
 * C'est le seul endroit du téléphone où l'on écrit : une observation se note
 * debout, à côté de l'élève, et c'est le téléphone qu'on a en main à ce
 * moment-là. La fiche, elle, a été posée sur l'ordinateur — le téléphone ne
 * fait que la remplir.
 */
function renderObservations(obs) {
  if (!obs.length) return '<p class="vide">Aucun temps d\'observation.<br>Posez-en un depuis le cahier journal, sur l\'ordinateur : bouton « 👁 Observer » d\'un créneau.</p>';
  const nomDe = id => {
    const e = (DATA.eleves || []).find(x => x.id === id);
    return e ? (e.nom || '').split(' ')[0] : 'Élève';
  };
  const parJour = {};
  obs.forEach(o => { (parJour[o.date || ''] = parJour[o.date || ''] || []).push(o); });
  return Object.keys(parJour).sort().reverse().map(j => {
    const cartes = parJour[j].map(o => {
      const champs = COLS.map(c => '<label class="obs-l">' + esc(c[1])
        + '<textarea data-k="' + c[0] + '" rows="2">' + esc(o[c[0]] || '') + '</textarea></label>').join('');
      return '<div class="card obs" id="obs-' + esc(o.id) + '">'
        + '<div class="obs-h"><b>' + esc(nomDe(o.eleveId || o.eleve_id)) + '</b>'
        + (o.contexte ? '<small> · ' + esc(o.contexte) + '</small>' : '') + '</div>'
        + (o.axe ? '<div class="obs-axe">👁 ' + esc(o.axe) + '</div>' : '')
        + champs
        + '<button class="obs-save" data-id="' + esc(o.id) + '">Enregistrer</button>'
        + '</div>';
    }).join('');
    return '<div class="jour' + (j === auj ? ' auj' : '') + '">' + esc(fmtJour(j)) + (j === auj ? ' · aujourd\'hui' : '') + '</div>' + cartes;
  }).join('');
}

async function enregistrerObs(id, btn) {
  const carte = document.getElementById('obs-' + id);
  if (!carte) return;
  const lire = k => { const z = carte.querySelector('[data-k="' + k + '"]'); return z ? z.value : ''; };
  const corps = { id: id };
  COLS.forEach(c => { corps[c[0]] = lire(c[0]); });
  const libelle = btn.textContent;
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const r = await fetch('/api/observation?t=' + encodeURIComponent(T), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    let j = {};
    try { j = await r.json(); } catch (e) { j = {}; }
    btn.textContent = (r.ok && j.ok) ? '✓ Enregistré sur l\'ordinateur' : ('⚠️ ' + (j.erreur || 'Non enregistré'));
  } catch (e) {
    btn.textContent = '⚠️ Hors réseau — réessayez';
  }
  setTimeout(() => { btn.disabled = false; btn.textContent = libelle; }, 2600);
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
     const save = ev.target.closest('.obs-save');
     if (save) { enregistrerObs(save.dataset.id, save); return; }
     if (ev.target.closest('.sea-body')) return;
     const it = ev.target.closest('.sea-item'); if (it) it.classList.toggle('open');
   });
   show('planning');
 })
 .catch(() => { main.innerHTML = '<p class="err">Connexion perdue.<br>Vérifiez que le téléphone est sur le même WiFi que l\'ordinateur, puis rescannez le QR code.</p>'; });
</script>
</body>
</html>
"##;

#[cfg(test)]
mod tests {
    use super::parametre;

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
