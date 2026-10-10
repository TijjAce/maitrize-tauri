//! Le portail des tablettes.
//!
//! Pendant l'activité, le téléphone montre une aide à la tâche aux tablettes
//! des élèves : elles ouvrent l'adresse que le téléphone affiche — par son QR
//! code —, sur le même réseau que lui, qu'il soit le WiFi de la classe ou le
//! partage de connexion du téléphone. L'enseignant choisit l'aide ; toutes
//! les tablettes la montrent dans les deux secondes, et l'élève y coche ses
//! étapes d'un toucher.
//!
//! Le portail ne sert que l'aide montrée : jamais le cahier journal, ni rien
//! d'autre du téléphone. L'adresse porte un jeton tiré à l'ouverture ; sans
//! lui, rien ne répond. Il se ferme quand on le ferme, ou quand le
//! dictaphone se ferme.

use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

type R<T> = Result<T, String>;

/// Le port du portail ; un autre s'il est pris.
const PORT: u16 = 8765;
/// Une tablette qui ne s'est pas manifestée depuis ce délai n'est plus comptée.
const TABLETTE_PARTIE: Duration = Duration::from_secs(10);

/// L'aide que les tablettes montrent.
struct Montree {
    id: String,
    titre: String,
    html: String,
}

/// Ce que le portail sait, partagé entre l'écran et le serveur.
#[derive(Default)]
struct Etat {
    montree: Option<Montree>,
    /// Change à chaque aide montrée : les tablettes rechargent quand il change.
    version: u64,
    tablettes: HashMap<IpAddr, Instant>,
}

struct Portail {
    port: u16,
    jeton: String,
    etat: Arc<Mutex<Etat>>,
    arret: Arc<AtomicBool>,
}

static PORTAIL: Mutex<Option<Portail>> = Mutex::new(None);

/// Ce que l'écran du téléphone montre du portail.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EtatPortail {
    pub ouvert: bool,
    /// Les adresses à ouvrir sur les tablettes, la meilleure d'abord.
    pub adresses: Vec<String>,
    /// Le QR code de la première adresse, en SVG.
    pub qr: String,
    pub tablettes: usize,
    pub montree: String,
    pub montree_id: String,
}

const FERME: EtatPortail = EtatPortail { ouvert: false, adresses: Vec::new(), qr: String::new(), tablettes: 0, montree: String::new(), montree_id: String::new() };

/// Les adresses IPv4 de ce téléphone sur un réseau local : le partage de
/// connexion (« bridge ») d'abord — c'est le réseau des tablettes quand le
/// téléphone le partage —, puis le WiFi (« en »). Ni le réseau mobile, ni
/// les tunnels.
pub fn adresses_locales() -> Vec<Ipv4Addr> {
    let mut trouvees: Vec<(String, Ipv4Addr)> = Vec::new();
    // SAFETY: getifaddrs remplit une liste chaînée que l'on parcourt sans la modifier, puis que l'on rend avec freeifaddrs.
    unsafe {
        let mut liste: *mut libc::ifaddrs = std::ptr::null_mut();
        if libc::getifaddrs(&mut liste) != 0 {
            return Vec::new();
        }
        let mut p = liste;
        while !p.is_null() {
            let ifa = &*p;
            if !ifa.ifa_addr.is_null() && i32::from((*ifa.ifa_addr).sa_family) == libc::AF_INET {
                let nom = std::ffi::CStr::from_ptr(ifa.ifa_name).to_string_lossy().to_string();
                let sin = &*(ifa.ifa_addr as *const libc::sockaddr_in);
                let ip = Ipv4Addr::from(u32::from_be(sin.sin_addr.s_addr));
                if (nom.starts_with("bridge") || nom.starts_with("en")) && !ip.is_loopback() && !ip.is_link_local() && !ip.is_unspecified() {
                    trouvees.push((nom, ip));
                }
            }
            p = ifa.ifa_next;
        }
        libc::freeifaddrs(liste);
    }
    trouvees.sort_by_key(|(nom, _)| (!nom.starts_with("bridge"), nom.clone()));
    let mut vues = Vec::new();
    for (_, ip) in trouvees {
        if !vues.contains(&ip) {
            vues.push(ip);
        }
    }
    vues
}

/// Un jeton de huit lettres et chiffres, tiré au hasard.
fn jeton() -> String {
    const SIGNES: &[u8] = b"abcdefghjkmnpqrstuvwxyz23456789";
    let graine = uuid::Uuid::new_v4().into_bytes();
    graine.iter().take(8).map(|o| SIGNES[*o as usize % SIGNES.len()] as char).collect()
}

/// Le QR code d'une adresse, en SVG, noir sur blanc.
pub fn qr_svg(adresse: &str) -> String {
    match qrcode::QrCode::new(adresse.as_bytes()) {
        Ok(code) => code.render::<qrcode::render::svg::Color>().min_dimensions(220, 220).quiet_zone(true).build(),
        Err(_) => String::new(),
    }
}

/// Ce qu'une requête demande : le chemin, et le jeton qu'elle porte.
pub fn lire_requete(premiere_ligne: &str) -> Option<(String, String)> {
    let mut morceaux = premiere_ligne.split_whitespace();
    if morceaux.next()? != "GET" {
        return None;
    }
    let cible = morceaux.next()?;
    let (chemin, requete) = cible.split_once('?').unwrap_or((cible, ""));
    let jeton = requete.split('&').find_map(|p| p.strip_prefix("t=")).unwrap_or("").to_string();
    Some((chemin.to_string(), jeton))
}

/// La page que les tablettes ouvrent : elle attend l'aide, la montre, et suit quand elle change.
pub const PAGE_TABLETTE: &str = r#"<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maitrize — en classe</title>
<style>
  html, body { margin: 0; height: 100%; background: #f2f2f7; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; }
  #attente { display: flex; align-items: center; justify-content: center; height: 100%; padding: 24px; box-sizing: border-box;
    text-align: center; font-size: 24px; line-height: 1.5; color: #4b5563; }
  iframe { display: none; border: 0; width: 100%; height: 100%; background: #fff; }
</style></head>
<body>
<div id="attente">L'aide va s'afficher ici, dès que l'enseignant la montre.</div>
<iframe id="aide" title="Aide à la tâche"></iframe>
<script>
  const jeton = new URLSearchParams(location.search).get("t") || "";
  let version = -1;
  async function suivre() {
    try {
      const r = await fetch("/etat?t=" + encodeURIComponent(jeton), { cache: "no-store" });
      if (r.ok) {
        const e = await r.json();
        if (e.version !== version) {
          version = e.version;
          const aide = document.getElementById("aide"), attente = document.getElementById("attente");
          if (e.montree) {
            aide.srcdoc = await (await fetch("/aide?t=" + encodeURIComponent(jeton) + "&v=" + e.version, { cache: "no-store" })).text();
            aide.style.display = "block"; attente.style.display = "none";
          } else {
            aide.style.display = "none"; attente.style.display = "flex";
          }
        }
      } else if (r.status === 403) {
        document.getElementById("attente").textContent = "Ce lien ne vaut plus : scannez le nouveau QR code du téléphone.";
      }
    } catch (_) { /* le téléphone s'est éloigné : on réessaie */ }
    setTimeout(suivre, 2000);
  }
  suivre();
</script>
</body></html>"#;

/// Ce que la page d'une aide reçoit en plus sur la tablette : toucher une étape la coche.
pub const COCHER: &str = r#"<style>
  .sv-s-etape, .at-etape, .cs-etape, .at-case { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .sv-s-etape.fait, .at-etape.fait, .cs-etape.fait { background: #dcfce7 !important; }
  .at-case.fait { background: #16a34a !important; border-color: #16a34a !important; position: relative; }
  .at-case.fait::after { content: "✓"; position: absolute; inset: 0; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .sv-s-etape.fait .sv-s-numero, .at-etape.fait .at-num { background: #16a34a !important; }
</style>
<script>
  document.addEventListener("click", function (e) {
    var ligne = e.target.closest(".at-etape, .sv-s-etape, .cs-etape");
    if (ligne) {
      var fait = !ligne.classList.contains("fait");
      ligne.classList.toggle("fait", fait);
      var c = ligne.querySelector(".at-case");
      if (c) c.classList.toggle("fait", fait);
      return;
    }
    var seule = e.target.closest(".at-case");
    if (seule) seule.classList.toggle("fait");
  });
</script>"#;

/// La page d'une aide, prête pour une tablette : on y glisse de quoi cocher.
pub fn page_pour_tablette(html: &str) -> String {
    match html.rfind("</body>") {
        Some(i) => format!("{}{COCHER}{}", &html[..i], &html[i..]),
        None => format!("{html}{COCHER}"),
    }
}

fn repondre(flux: &mut TcpStream, code: u16, type_: &str, corps: &[u8]) {
    let raison = match code { 200 => "OK", 403 => "Forbidden", 404 => "Not Found", _ => "Bad Request" };
    let tete = format!(
        "HTTP/1.1 {code} {raison}\r\nContent-Type: {type_}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
        corps.len()
    );
    let _ = flux.write_all(tete.as_bytes());
    let _ = flux.write_all(corps);
}

/// Répond à une tablette : la page, l'état, ou l'aide montrée.
fn servir(mut flux: TcpStream, jeton: &str, etat: &Mutex<Etat>) {
    let _ = flux.set_read_timeout(Some(Duration::from_secs(5)));
    let mut tampon = [0u8; 4096];
    let n = flux.read(&mut tampon).unwrap_or(0);
    let texte = String::from_utf8_lossy(&tampon[..n]);
    let Some((chemin, porte)) = lire_requete(texte.lines().next().unwrap_or("")) else {
        return repondre(&mut flux, 400, "text/plain; charset=utf-8", b"");
    };
    if porte != jeton {
        return repondre(&mut flux, 403, "text/plain; charset=utf-8", "Ce lien ne vaut plus.".as_bytes());
    }
    if let Ok(pair) = flux.peer_addr() {
        etat.lock().unwrap().tablettes.insert(pair.ip(), Instant::now());
    }
    match chemin.as_str() {
        "/" => repondre(&mut flux, 200, "text/html; charset=utf-8", PAGE_TABLETTE.as_bytes()),
        "/etat" => {
            let e = etat.lock().unwrap();
            let json = serde_json::json!({ "version": e.version, "montree": e.montree.as_ref().map(|m| m.titre.clone()) });
            repondre(&mut flux, 200, "application/json", json.to_string().as_bytes());
        }
        "/aide" => {
            let page = etat.lock().unwrap().montree.as_ref().map(|m| page_pour_tablette(&m.html));
            match page {
                Some(p) => repondre(&mut flux, 200, "text/html; charset=utf-8", p.as_bytes()),
                None => repondre(&mut flux, 404, "text/plain; charset=utf-8", b""),
            }
        }
        _ => repondre(&mut flux, 404, "text/plain; charset=utf-8", b""),
    }
}

/// Écoute, jusqu'à ce qu'on l'arrête : une connexion à la fois suffit à une classe.
fn ecouter(ecoute: TcpListener, jeton: String, etat: Arc<Mutex<Etat>>, arret: Arc<AtomicBool>) {
    let _ = ecoute.set_nonblocking(true);
    while !arret.load(Ordering::SeqCst) {
        match ecoute.accept() {
            Ok((flux, _)) => {
                let _ = flux.set_nonblocking(false);
                let (jeton, etat) = (jeton.clone(), etat.clone());
                std::thread::spawn(move || servir(flux, &jeton, &etat));
            }
            Err(_) => std::thread::sleep(Duration::from_millis(60)),
        }
    }
}

/// L'état tel que l'écran le montre.
fn etat_de(p: &Portail) -> EtatPortail {
    let mut e = p.etat.lock().unwrap();
    e.tablettes.retain(|_, vu| vu.elapsed() < TABLETTE_PARTIE);
    let adresses: Vec<String> = adresses_locales().iter().map(|ip| format!("http://{ip}:{}/?t={}", p.port, p.jeton)).collect();
    EtatPortail {
        ouvert: true,
        qr: adresses.first().map(|a| qr_svg(a)).unwrap_or_default(),
        adresses,
        tablettes: e.tablettes.len(),
        montree: e.montree.as_ref().map(|m| m.titre.clone()).unwrap_or_default(),
        montree_id: e.montree.as_ref().map(|m| m.id.clone()).unwrap_or_default(),
    }
}

/// Ouvre le portail s'il ne l'est pas ; rend son état.
#[tauri::command]
pub fn portail_ouvrir() -> R<EtatPortail> {
    let mut garde = PORTAIL.lock().unwrap();
    if let Some(p) = garde.as_ref() {
        return Ok(etat_de(p));
    }
    let ecoute = TcpListener::bind(("0.0.0.0", PORT)).or_else(|_| TcpListener::bind(("0.0.0.0", 0)))
        .map_err(|e| format!("Le portail ne peut pas s'ouvrir : {e}"))?;
    let port = ecoute.local_addr().map_err(|e| e.to_string())?.port();
    let p = Portail { port, jeton: jeton(), etat: Arc::new(Mutex::new(Etat::default())), arret: Arc::new(AtomicBool::new(false)) };
    let (j, e, a) = (p.jeton.clone(), p.etat.clone(), p.arret.clone());
    std::thread::spawn(move || ecouter(ecoute, j, e, a));
    let etat = etat_de(&p);
    *garde = Some(p);
    Ok(etat)
}

/// Montre une aide aux tablettes : celle que l'écran vient de relire.
#[tauri::command]
pub fn portail_montrer(id: String, titre: String, html: String) -> R<EtatPortail> {
    let garde = PORTAIL.lock().unwrap();
    let p = garde.as_ref().ok_or("Le portail est fermé.")?;
    {
        let mut e = p.etat.lock().unwrap();
        e.montree = Some(Montree { id, titre, html });
        e.version += 1;
    }
    Ok(etat_de(p))
}

/// Plus rien de montré : les tablettes attendent.
#[tauri::command]
pub fn portail_cacher() -> R<EtatPortail> {
    let garde = PORTAIL.lock().unwrap();
    let p = garde.as_ref().ok_or("Le portail est fermé.")?;
    {
        let mut e = p.etat.lock().unwrap();
        e.montree = None;
        e.version += 1;
    }
    Ok(etat_de(p))
}

/// L'état du portail, pour l'écran : combien de tablettes, ce qu'elles montrent.
#[tauri::command]
pub fn portail_etat() -> EtatPortail {
    PORTAIL.lock().unwrap().as_ref().map(etat_de).unwrap_or(FERME)
}

/// Ferme le portail : le serveur s'arrête, l'adresse ne vaut plus.
#[tauri::command]
pub fn portail_fermer() -> EtatPortail {
    if let Some(p) = PORTAIL.lock().unwrap().take() {
        p.arret.store(true, Ordering::SeqCst);
    }
    FERME
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn une_requete_dit_son_chemin_et_son_jeton() {
        assert_eq!(lire_requete("GET /etat?t=abc23 HTTP/1.1"), Some(("/etat".into(), "abc23".into())));
        assert_eq!(lire_requete("GET /aide?v=3&t=abc23 HTTP/1.1"), Some(("/aide".into(), "abc23".into())));
        assert_eq!(lire_requete("GET / HTTP/1.1"), Some(("/".into(), String::new())));
        assert_eq!(lire_requete("POST /etat?t=abc HTTP/1.1"), None);
        assert_eq!(lire_requete(""), None);
    }

    #[test]
    fn la_page_d_une_aide_recoit_de_quoi_cocher_avant_sa_fin() {
        let p = page_pour_tablette("<html><body><p>1. J'écoute.</p></body></html>");
        assert!(p.contains("classList.toggle(\"fait\", fait)"));
        assert!(p.ends_with("</body></html>"));
        assert!(page_pour_tablette("<p>sans corps</p>").contains("classList.toggle"));
    }

    #[test]
    fn le_qr_code_est_un_svg_et_le_jeton_huit_signes() {
        assert!(qr_svg("http://172.20.10.1:8765/?t=abcdefgh").starts_with("<?xml"));
        let j = jeton();
        assert_eq!(j.len(), 8);
        assert_ne!(j, jeton());
    }

    #[test]
    fn le_portail_ne_sert_que_l_aide_montree_et_seulement_avec_son_jeton() {
        // Un portail d'essai, sur un port libre, servi comme le vrai.
        let ecoute = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = ecoute.local_addr().unwrap().port();
        let etat = Arc::new(Mutex::new(Etat::default()));
        let arret = Arc::new(AtomicBool::new(false));
        let (e2, a2) = (etat.clone(), arret.clone());
        std::thread::spawn(move || ecouter(ecoute, "jeton123".into(), e2, a2));
        let demander = |cible: &str| -> (u16, String) {
            let mut f = TcpStream::connect(("127.0.0.1", port)).unwrap();
            write!(f, "GET {cible} HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
            let mut r = String::new();
            f.read_to_string(&mut r).unwrap();
            let code = r.split_whitespace().nth(1).unwrap().parse().unwrap();
            (code, r.split("\r\n\r\n").nth(1).unwrap_or("").to_string())
        };
        assert_eq!(demander("/?t=autre").0, 403);
        assert_eq!(demander("/journal.json?t=jeton123").0, 404);
        let (code, page) = demander("/?t=jeton123");
        assert_eq!(code, 200);
        assert!(page.contains("L'aide va s'afficher ici"));
        assert_eq!(demander("/aide?t=jeton123").0, 404);
        {
            let mut e = etat.lock().unwrap();
            e.montree = Some(Montree { id: "a1".into(), titre: "Le séquentiel".into(), html: "<body><p>Je lis.</p></body>".into() });
            e.version += 1;
        }
        let (_, json) = demander("/etat?t=jeton123");
        assert!(json.contains("\"montree\":\"Le séquentiel\"") && json.contains("\"version\":1"), "{json}");
        let (code, aide) = demander("/aide?t=jeton123&v=1");
        assert_eq!(code, 200);
        assert!(aide.contains("<p>Je lis.</p>") && aide.contains("classList.toggle"));
        assert_eq!(etat.lock().unwrap().tablettes.len(), 1);
        arret.store(true, Ordering::SeqCst);
    }
}
