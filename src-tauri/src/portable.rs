//! Version portable : l'app desktop sert un instantané de données sur le
//! réseau local (WiFi). Le téléphone l'ouvre dans son navigateur via un QR
//! code. Lecture seule, protégé par un jeton, démarré/arrêté à la demande.
//! Rien ne transite par internet : tout reste sur le réseau local.

use crate::db::Db;
use crate::models::{Creneau, Eleve, ProgrammationFinale, Seance, Sequence};
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, State};
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
    let c = db.0.lock().map_err(e)?;

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

    let bundle = Bundle {
        planning,
        sequences,
        seances,
        eleves,
        programmations,
    };
    serde_json::to_string(&bundle).map_err(e)
}

#[tauri::command]
pub fn portable_demarrer(db: State<Db>, portable: State<Portable>) -> R<PortableInfo> {
    // Arrêter une instance précédente éventuelle.
    if let Some(stop) = portable.0.lock().map_err(e)?.take() {
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
            Ok(Some(req)) => repondre(req, &token, &page, &data_json),
            Ok(None) => continue,
            Err(_) => break,
        }
    });

    *portable.0.lock().map_err(e)? = Some(stop);
    Ok(PortableInfo {
        url,
        ip,
        port,
        qr_svg: qr,
    })
}

#[tauri::command]
pub fn portable_arreter(portable: State<Portable>) -> R<()> {
    if let Some(stop) = portable.0.lock().map_err(e)?.take() {
        stop.store(true, Ordering::Relaxed);
    }
    Ok(())
}

fn repondre(req: tiny_http::Request, token: &str, page: &str, data_json: &str) {
    let url = req.url().to_string();
    let autorise = url.contains(&format!("t={token}"));
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
    if let Some(stop) = photo.0.lock().map_err(e)?.take() {
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

    *photo.0.lock().map_err(e)? = Some(stop);
    Ok(PortableInfo { url, ip, port, qr_svg: qr })
}

#[tauri::command]
pub fn photo_capture_arreter(photo: State<PhotoCapture>) -> R<()> {
    if let Some(stop) = photo.0.lock().map_err(e)?.take() {
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
  ['sequences','📚 Séquences', renderSequences],
  ['eleves','👧 Élèves', renderEleves],
  ['programmations','🗂 Programmations', renderProgrammations],
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
      const head = '<div class="blk-head"><span class="bh">' + esc(hd(c)) + '<small>' + esc(f) + '</small></span><span class="bm">' + esc(c.matiere || '—')
        + (sea && sea.titre ? '<small class="sub">' + esc(sea.titre) + '</small>' : '') + '</span></div>';
      if (sea) return '<div class="blk-card sea-item" style="border-left-color:' + col + '">' + head + '<div class="sea-body">' + seanceBody(sea) + '</div></div>';
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

fetch('/api/data?t=' + encodeURIComponent(T))
 .then(r => r.ok ? r.json() : Promise.reject(r.status))
 .then(d => {
   DATA = d;
   tabsEl.innerHTML = TABS.map(t => '<button class="tab" data-id="' + t[0] + '">' + t[1] + '</button>').join('');
   main.innerHTML = TABS.map(t => '<section id="sec-' + t[0] + '">' + t[2](d[t[0]] || []) + '</section>').join('');
   tabsEl.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => show(b.dataset.id)));
   initPlanning();
   main.addEventListener('click', ev => { if (ev.target.closest('.sea-body')) return; const it = ev.target.closest('.sea-item'); if (it) it.classList.toggle('open'); });
   show('planning');
 })
 .catch(() => { main.innerHTML = '<p class="err">Connexion perdue.<br>Vérifiez que le téléphone est sur le même WiFi que l\'ordinateur, puis rescannez le QR code.</p>'; });
</script>
</body>
</html>
"##;
