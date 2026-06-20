//! Version portable : l'app desktop sert un instantané de données sur le
//! réseau local (WiFi). Le téléphone l'ouvre dans son navigateur via un QR
//! code. Lecture seule, protégé par un jeton, démarré/arrêté à la demande.
//! Rien ne transite par internet : tout reste sur le réseau local.

use crate::db::Db;
use crate::models::Creneau;
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;
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

#[tauri::command]
pub fn portable_demarrer(db: State<Db>, portable: State<Portable>) -> R<PortableInfo> {
    // Arrêter une instance précédente éventuelle.
    if let Some(stop) = portable.0.lock().map_err(e)?.take() {
        stop.store(true, Ordering::Relaxed);
    }

    // Instantané des données (lecture seule), figé au moment du clic.
    let creneaux: Vec<Creneau> = {
        let c = db.0.lock().map_err(e)?;
        let mut st = c
            .prepare("SELECT * FROM creneaux ORDER BY date, heure_debut")
            .map_err(e)?;
        let rows = st.query_map([], Creneau::from_row).map_err(e)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)?
    };
    let data_json = serde_json::to_string(&creneaux).map_err(e)?;

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

/// Page mobile servie au téléphone (lecture seule).
const PAGE_HTML: &str = r##"<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Maitrize — version portable</title>
<style>
 :root { --bg:#f6f7fb; --card:#fff; --txt:#1c2233; --txt2:#687087; --acc:#6366f1; --bd:#e3e6ef; }
 * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
 body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--txt); }
 header { position:sticky; top:0; background:var(--acc); color:#fff; padding:calc(14px + env(safe-area-inset-top)) 16px 14px; font-weight:700; font-size:17px; }
 main { padding:14px; max-width:640px; margin:0 auto; }
 .jour { margin:18px 0 8px; font-size:13px; font-weight:700; color:var(--txt2); text-transform:uppercase; letter-spacing:.04em; }
 .jour.auj { color:var(--acc); }
 .cr { background:var(--card); border:1px solid var(--bd); border-left:4px solid var(--acc); border-radius:12px; padding:10px 12px; margin-bottom:8px; display:flex; gap:12px; align-items:center; }
 .cr .h { font-variant-numeric:tabular-nums; font-weight:700; font-size:14px; white-space:nowrap; }
 .cr .m { flex:1; font-size:14px; }
 .vide,.err { color:var(--txt2); text-align:center; padding:40px 16px; line-height:1.5; }
 .err { color:#c0392b; }
</style>
</head>
<body>
<header>📚 Maitrize — version portable</header>
<main id="app"><p class="vide">Chargement…</p></main>
<script>
const t = new URLSearchParams(location.search).get('t') || '';
const app = document.getElementById('app');
const J = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const M = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const fmtJour = iso => { const d = new Date(iso + 'T00:00:00'); return J[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()]; };
const auj = new Date().toISOString().slice(0,10);
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
fetch('/api/data?t=' + encodeURIComponent(t))
 .then(r => r.ok ? r.json() : Promise.reject(r.status))
 .then(cr => {
   if (!cr.length) { app.innerHTML = '<p class="vide">Aucun créneau dans le planning.</p>'; return; }
   const parJour = {};
   cr.forEach(c => { const k = (c.date || '').slice(0,10); (parJour[k] = parJour[k] || []).push(c); });
   app.innerHTML = Object.keys(parJour).sort().map(k => {
     const items = parJour[k].map(c => {
       const hd = c.heureDebut || c.heure_debut || '';
       const hf = c.heureFin || c.heure_fin || '';
       return '<div class="cr"><span class="h">' + esc(hd) + '–' + esc(hf) + '</span><span class="m">' + esc(c.matiere || '—') + '</span></div>';
     }).join('');
     return '<div class="jour' + (k === auj ? ' auj' : '') + '">' + fmtJour(k) + (k === auj ? ' · aujourd\'hui' : '') + '</div>' + items;
   }).join('');
 })
 .catch(() => { app.innerHTML = '<p class="err">Connexion perdue.<br>Vérifiez que le téléphone est sur le même WiFi que l\'ordinateur, puis rescannez le QR code.</p>'; });
</script>
</body>
</html>
"##;
