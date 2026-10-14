//! Le portail des tablettes.
//!
//! Pendant l'activité, le téléphone montre une aide à la tâche aux tablettes
//! des élèves — ou à l'ordinateur de la classe, au tableau : elles ouvrent
//! l'adresse que le téléphone affiche — par son QR code —, sur le même réseau
//! que lui, qu'il soit le WiFi de la classe ou le partage de connexion du
//! téléphone. L'enseignant choisit l'aide ; toutes les tablettes la montrent
//! dans les deux secondes, et l'élève y coche ses étapes d'un toucher.
//!
//! L'aide se montre telle qu'elle s'imprime, ou en déroulé : ses étapes en
//! grand, lisibles de loin, l'étape en cours surlignée — l'enseignant passe à
//! la suivante depuis le téléphone. Un minuteur s'y ajoute, seul ou avec
//! l'aide : un disque qui se vide, comme un Time Timer, et le temps qui reste.
//!
//! Le portail ne sert que l'aide montrée : jamais le cahier journal, ni rien
//! d'autre du téléphone. L'adresse porte un jeton ; sans lui, rien ne répond,
//! que l'icône de l'écran d'accueil. Le jeton est tiré une fois et gardé sur
//! le téléphone : chaque tablette scanne le QR code une seule fois, garde la
//! page sur son écran d'accueil, et la retrouve chaque jour. « Changer le
//! code » en tire un autre et coupe toutes les tablettes d'un coup — une
//! tablette perdue. Le portail se ferme quand on le ferme, ou quand le
//! dictaphone se ferme.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::Manager;

type R<T> = Result<T, String>;

/// Le port du portail ; un autre s'il est pris.
const PORT: u16 = 8765;
/// Une tablette qui ne s'est pas manifestée depuis ce délai n'est plus comptée.
const TABLETTE_PARTIE: Duration = Duration::from_secs(10);

/// Une étape du déroulé, telle que les tablettes l'affichent : son texte, son picto (une image en data URL, ou rien),
/// et, pour une fiche du déroulement d'un créneau, sa matière, écrite au-dessus.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct EtapeDuDeroule {
    pub texte: String,
    #[serde(default)]
    pub image: String,
    #[serde(default)]
    pub matiere: String,
}

/// L'aide que les tablettes montrent, et ses étapes pour le déroulé.
struct Montree {
    id: String,
    titre: String,
    html: String,
    etapes: Vec<EtapeDuDeroule>,
}

/// L'heure, en millisecondes : celle du téléphone, que les tablettes rattrapent.
fn maintenant_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Le minuteur : sa durée, et l'heure où il finit — ou, en pause, ce qui lui reste.
#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Minuteur {
    /// En secondes.
    pub duree: u64,
    /// L'heure de la fin, en millisecondes ; rien en pause.
    pub fin: Option<u64>,
    /// Ce qui reste, en millisecondes, au moment de la pause.
    pub reste: u64,
}

impl Minuteur {
    /// Le plus long qu'on règle : deux heures.
    const DUREE_MAX: u64 = 7200;

    pub fn lancer(secondes: u64, maintenant: u64) -> Minuteur {
        let duree = secondes.clamp(1, Self::DUREE_MAX);
        Minuteur { duree, fin: Some(maintenant + duree * 1000), reste: duree * 1000 }
    }
    pub fn pause(self, maintenant: u64) -> Minuteur {
        match self.fin {
            Some(fin) => Minuteur { fin: None, reste: fin.saturating_sub(maintenant), ..self },
            None => self,
        }
    }
    pub fn reprendre(self, maintenant: u64) -> Minuteur {
        match self.fin {
            None => Minuteur { fin: Some(maintenant + self.reste), ..self },
            Some(_) => self,
        }
    }
    /// Ce qui reste, en millisecondes.
    pub fn reste_a(self, maintenant: u64) -> u64 {
        self.fin.map(|fin| fin.saturating_sub(maintenant)).unwrap_or(self.reste)
    }
}

/// Ce que les tablettes affichent de l'aide montrée : la fiche, ou son déroulé en grand.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Affichage {
    #[default]
    Fiche,
    Deroule,
}

/// Ce que le portail sait, partagé entre l'écran et le serveur.
#[derive(Default)]
struct Etat {
    montree: Option<Montree>,
    /// Change à chaque aide montrée : les tablettes rechargent quand il change.
    version: u64,
    tablettes: HashMap<IpAddr, Instant>,
    affichage: Affichage,
    /// L'étape où en est la classe, dans le déroulé ; aucune : pas de repère.
    etape: Option<usize>,
    minuteur: Option<Minuteur>,
    /// Le créneau du cahier journal qui a envoyé ce que les tablettes montrent ; vide : envoyé d'ailleurs.
    creneau: String,
    /// Les étapes sont le déroulement du créneau — ses fiches dans l'ordre —, pas celles de l'aide : les tablettes
    /// les montrent à côté de la fiche, et n'en surlignent rien dans la fiche.
    plan: bool,
    /// L'adresse où la dernière tablette est venue, « http://172.20.10.1:8765/ » : celle que les tablettes ont gardée.
    adresse_connue: String,
    /// Une tablette est venue à une autre adresse : le téléphone la gardera pour la fois suivante.
    adresse_a_garder: bool,
}

impl Etat {
    /// Ce que les tablettes relisent toutes les deux secondes : léger — l'aide et le déroulé se chargent à part.
    fn en_json(&self, maintenant: u64) -> serde_json::Value {
        serde_json::json!({
            "version": self.version,
            "montree": self.montree.as_ref().map(|m| m.titre.clone()),
            "affichage": self.affichage,
            "etape": self.etape,
            "etapes": self.montree.as_ref().map(|m| m.etapes.len()).unwrap_or(0),
            "minuteur": self.minuteur.map(|t| serde_json::json!({ "duree": t.duree, "fin": t.fin, "reste": t.reste_a(maintenant), "enPause": t.fin.is_none() })),
            "plan": self.plan,
            "maintenant": maintenant,
        })
    }
}

struct Portail {
    port: u16,
    /// Partagé avec le serveur, qui le relit à chaque requête : « Changer le code » le remplace sans rouvrir.
    jeton: Arc<Mutex<String>>,
    etat: Arc<Mutex<Etat>>,
    arret: Arc<AtomicBool>,
    /// Où le téléphone garde le jeton et l'adresse des tablettes.
    fiche: PathBuf,
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
    /// La première adresse n'est pas celle que les tablettes ont gardée, et aucune n'y est encore venue :
    /// un autre réseau, par exemple. Elles doivent rescanner le QR code.
    pub adresse_changee: bool,
    pub tablettes: usize,
    pub montree: String,
    pub montree_id: String,
    pub affichage: Affichage,
    pub etape: Option<usize>,
    /// Combien d'étapes a le déroulé de l'aide montrée.
    pub etapes: usize,
    /// Le texte de l'étape surlignée : l'enseignant voit sur le téléphone où en sont les tablettes.
    pub texte_etape: String,
    pub minuteur: Option<Minuteur>,
    /// Le créneau qui a envoyé l'aide et le minuteur : c'est sous lui que l'écran montre le temps qui reste.
    pub creneau: String,
    /// Les étapes sont le déroulement du créneau : l'écran dit « fiche 2 sur 4 ».
    pub plan: bool,
}

const FERME: EtatPortail = EtatPortail {
    ouvert: false, adresses: Vec::new(), qr: String::new(), adresse_changee: false, tablettes: 0, montree: String::new(), montree_id: String::new(),
    affichage: Affichage::Fiche, etape: None, etapes: 0, texte_etape: String::new(), minuteur: None, creneau: String::new(), plan: false,
};

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

/// Les signes d'un jeton : ni 0 ni o, ni 1 ni i ni l, qu'on confondrait en le recopiant.
const SIGNES: &[u8] = b"abcdefghjkmnpqrstuvwxyz23456789";

/// Un jeton de huit lettres et chiffres, tiré au hasard.
fn jeton() -> String {
    let graine = uuid::Uuid::new_v4().into_bytes();
    graine.iter().take(8).map(|o| SIGNES[*o as usize % SIGNES.len()] as char).collect()
}

/// Un jeton bien formé : huit signes du tirage.
fn jeton_valide(j: &str) -> bool {
    j.len() == 8 && j.bytes().all(|o| SIGNES.contains(&o))
}

/// Un autre jeton que celui-ci.
fn autre_jeton(ancien: &str) -> String {
    loop {
        let j = jeton();
        if j != ancien {
            return j;
        }
    }
}

/// Ce que le téléphone garde du portail d'une fois sur l'autre : le jeton que les tablettes ont mis sur
/// leur écran d'accueil, et l'adresse où elles sont venues.
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
struct Souvenir {
    jeton: String,
    #[serde(default)]
    adresse: String,
}

/// Relit le souvenir du portail. La première fois — ou si la fiche est abîmée —, un jeton est tiré et gardé.
fn relire_souvenir(fiche: &Path) -> Souvenir {
    let lu: Souvenir = std::fs::read(fiche).ok().and_then(|o| serde_json::from_slice(&o).ok()).unwrap_or_default();
    if jeton_valide(&lu.jeton) {
        return lu;
    }
    let neuf = Souvenir { jeton: jeton(), ..lu };
    // Sans disque, le jeton vaut quand même jusqu'à la fermeture.
    let _ = ecrire_souvenir(fiche, &neuf);
    neuf
}

/// Écrit la fiche d'un coup — à côté, puis renommée : jamais une fiche à moitié écrite.
fn ecrire_souvenir(fiche: &Path, souvenir: &Souvenir) -> R<()> {
    let provisoire = fiche.with_extension("tmp");
    std::fs::write(&provisoire, serde_json::to_vec(souvenir).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    std::fs::rename(&provisoire, fiche).map_err(|e| e.to_string())
}

/// La fiche du portail, dans le dossier de l'application.
fn fiche_du_portail(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = app.path().app_data_dir().map_err(|e| format!("Dossier de données introuvable : {e}"))?;
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d.join("portail.json"))
}

/// Faut-il rescanner ? Oui quand les tablettes ont gardé une autre adresse et qu'aucune n'est encore venue
/// à la nouvelle. Ni la première fois, ni sans réseau : l'écran le dit autrement.
fn adresse_changee(connue: &str, actuelle: Option<&str>, tablettes: usize) -> bool {
    tablettes == 0 && !connue.is_empty() && actuelle.is_some_and(|a| a != connue)
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

/// La page que les tablettes ouvrent : elle attend l'aide, la montre — la fiche, ou son déroulé en grand —,
/// suit quand elle change, et fait tourner le minuteur à l'heure du téléphone. Mise sur l'écran d'accueil,
/// elle s'ouvre en plein écran sous l'icône de Maitrize ; quand le téléphone ne répond pas, elle l'attend.
pub const PAGE_TABLETTE: &str = r##"<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maitrize</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Maitrize"><meta name="theme-color" content="#f2f2f7">
<link rel="apple-touch-icon" href="/icone.png"><link rel="icon" href="/icone.png">
<style>
  html, body { margin: 0; height: 100%; background: #f2f2f7; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1c2233; }
  #attente { display: flex; align-items: center; justify-content: center; height: 100%; padding: 24px; box-sizing: border-box;
    text-align: center; font-size: 24px; line-height: 1.5; color: #4b5563; }
  iframe { display: none; border: 0; width: 100%; height: 100%; background: #fff; }
  /* Le minuteur a sa colonne : il ne cache rien de la fiche. */
  body.avec-minuteur iframe { width: calc(100% - 30vmin); }
  #deroule { display: none; height: 100%; box-sizing: border-box; padding: 3vmin 4vmin; overflow: auto; }
  body.avec-minuteur #deroule { padding-right: 32vmin; }
  #deroule h1 { font-size: 4.6vmin; margin: 0 0 2.4vmin; }
  .etape { display: flex; align-items: center; gap: 2.6vmin; padding: 1.6vmin 2.4vmin; margin: 0; background: #fff;
    border: .5vmin solid #3a3a3a; border-radius: 2vmin; font-size: 4.2vmin; line-height: 1.25; }
  /* D'une étape à la suivante, une flèche, de haut en bas. */
  .fleche { display: block; margin: .5vmin auto; width: 3.6vmin; height: 5.6vmin; }
  .sur { display: block; font-size: .5em; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  /* Le déroulement du créneau, à gauche de la fiche : ce qui va se passer, dans l'ordre. */
  #plan { display: none; position: fixed; left: 0; top: 0; bottom: 0; width: 25vmin; box-sizing: border-box; padding: 1.2vmin 1.4vmin;
    overflow: auto; background: #f2f2f7; }
  body.avec-plan iframe { margin-left: 25vmin; width: calc(100% - 25vmin); }
  body.avec-plan.avec-minuteur iframe { width: calc(100% - 55vmin); }
  .pl { background: #fff; border: .45vmin solid #3a3a3a; border-radius: 2vmin; padding: 1vmin; text-align: center; font-size: 2.3vmin; }
  .pl img { display: block; width: 9vmin; height: 9vmin; object-fit: contain; margin: 0 auto .5vmin; }
  #plan .fleche { height: 3.6vmin; margin: .2vmin auto; }
  .pl .nom { display: block; font-weight: 700; line-height: 1.2; }
  .pl .sur { font-size: 1.8vmin; }
  /* Cinq étapes ou plus — le rituel et quatre fiches — : la colonne se resserre pour les montrer toutes. */
  #plan.serre .pl { padding: .7vmin; font-size: 2vmin; }
  #plan.serre .pl img { width: 7vmin; height: 7vmin; margin-bottom: .3vmin; }
  #plan.serre .pl .sur { font-size: 1.6vmin; }
  #plan.serre .fleche { height: 2.8vmin; }
  .pl.en-cours { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 .7vmin #fde68a; }
  .pl.passee { opacity: .45; }
  .etape img { width: 12vmin; height: 12vmin; object-fit: contain; flex: none; }
  .etape .num { flex: none; width: 7vmin; height: 7vmin; border-radius: 50%; background: #1d4ed8; color: #fff; font-weight: 800;
    display: flex; align-items: center; justify-content: center; font-size: 3.8vmin; }
  .etape.passee { opacity: .45; }
  .etape.passee .num { background: #16a34a; }
  .etape.en-cours { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 .7vmin #fde68a; font-size: 5vmin; }
  #minuteur { display: none; position: fixed; right: 2vmin; top: 2vmin; width: 26vmin; box-sizing: border-box; padding: 1.6vmin;
    text-align: center; background: rgba(255,255,255,.96); border-radius: 3vmin; box-shadow: 0 1vmin 3vmin rgba(0,0,0,.15); z-index: 5; }
  #minuteur svg { display: block; width: 100%; height: auto; }
  #reste { font-size: 5.4vmin; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: .6vmin; }
  body.minuteur-seul #minuteur { position: static; width: 64vmin; margin: 5vh auto 0; background: none; box-shadow: none; }
  body.minuteur-seul #reste { font-size: 12vmin; }
  /* En pause : deux barres dessinées (le signe ⏸ deviendrait un émoji sur iPad), et le disque pâlit. */
  #minuteur.en-pause #reste::after { content: ""; display: inline-block; width: .5em; height: .68em; margin-left: .3em; box-sizing: border-box;
    border-left: .17em solid currentColor; border-right: .17em solid currentColor; }
  #minuteur.en-pause #secteur { opacity: .45; }
  #minuteur.fini #reste { color: #16a34a; font-size: 4.4vmin; }
  #minuteur.fini svg circle:first-child { fill: #dcfce7; }
  body.minuteur-seul #minuteur.fini #reste { font-size: 10vmin; }
  #minuteur.fini { animation: fini 1s ease-in-out 6; }
  @keyframes fini { 50% { box-shadow: 0 0 0 2vmin #bbf7d0; } }
</style></head>
<body>
<div id="attente">L'aide va s'afficher ici, dès que l'enseignant la montre.</div>
<iframe id="aide" title="Aide à la tâche"></iframe>
<div id="deroule"><h1 id="titre"></h1><div id="etapes"></div></div>
<aside id="plan" aria-label="Ce qui va se passer"></aside>
<div id="minuteur" aria-live="polite"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#9ca3af" stroke-width="1.5"/>
  <path id="secteur" fill="#e11d48"/><circle cx="50" cy="50" r="4" fill="#1c2233"/></svg><div id="reste"></div></div>
<script>
  const jeton = new URLSearchParams(location.search).get("t") || "";
  const q = (chemin) => chemin + "?t=" + encodeURIComponent(jeton);
  const $ = (id) => document.getElementById(id);
  let version = -1, decalage = 0, minuteur = null, etat = null;
  const ATTENTE = "L'aide va s'afficher ici, dès que l'enseignant la montre.";
  // Le téléphone ne répond pas — portail fermé, téléphone loin : la page l'attend, et se reconnecte seule.
  const SANS_TELEPHONE = "En attente du téléphone… Le portail s'ouvre dans le dictaphone.";
  // Les étapes d'une aide, dans l'ordre : celles du séquentiel, sinon les actions de sa consigne — comme le téléphone les compte.
  const etapesDe = (doc) => { const l = doc.querySelectorAll(".at-etape:not(.at-cachee), .sv-s-etape"); return l.length ? [...l] : [...doc.querySelectorAll(".cs-etape.cs-action")]; };
  const echapper = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // La flèche d'une étape à la suivante, dessinée : pas de signe que l'iPad changerait en émoji.
  const FLECHE = '<svg class="fleche" viewBox="0 0 24 44" aria-hidden="true"><path d="M12 3v36M4 30l8 9 8-9" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  async function charger(e) {
    const aide = $("aide");
    aide.srcdoc = await (await fetch(q("/aide") + "&v=" + version, { cache: "no-store" })).text();
    const d = await (await fetch(q("/deroule") + "&v=" + version, { cache: "no-store" })).json();
    // Les étapes d'un créneau : ses fiches, ce qui va se passer ; sinon celles de l'aide, sous son titre.
    $("titre").textContent = e.plan ? "Ce qui va se passer" : d.titre || "";
    const sur = (x) => (x.matiere ? '<span class="sur">' + echapper(x.matiere) + "</span>" : "");
    const image = (x) => (x.image ? '<img alt="" src="' + echapper(x.image) + '">' : "");
    $("etapes").innerHTML = d.etapes.map((x, i) => (i ? FLECHE : "") + '<div class="etape"><span class="num">' + (i + 1) + "</span>"
      + image(x) + "<span>" + sur(x) + echapper(x.texte) + "</span></div>").join("");
    $("plan").innerHTML = e.plan ? d.etapes.map((x, i) => (i ? FLECHE : "") + '<div class="pl">' + image(x) + sur(x)
      + '<span class="nom">' + echapper(x.texte) + "</span></div>").join("") : "";
    $("plan").classList.toggle("serre", d.etapes.length >= 5);
  }
  function appliquer() {
    const e = etat; if (!e) return;
    const fiche = e.montree && e.affichage !== "deroule", deroule = e.montree && e.affichage === "deroule";
    $("aide").style.display = fiche ? "block" : "none";
    $("deroule").style.display = deroule ? "block" : "none";
    $("attente").style.display = !e.montree && !e.minuteur ? "flex" : "none";
    document.body.classList.toggle("minuteur-seul", !e.montree && !!e.minuteur);
    document.body.classList.toggle("avec-minuteur", !!e.minuteur);
    // Le déroulement du créneau se tient à côté de la fiche.
    const avecPlan = !!e.plan && fiche;
    $("plan").style.display = avecPlan ? "block" : "none";
    document.body.classList.toggle("avec-plan", avecPlan);
    // L'étape en cours : surlignée dans le déroulé, en grand ou à côté ; celles d'avant, faites.
    const marquer = (liste) => { liste.forEach((el, i) => { el.classList.toggle("en-cours", i === e.etape); el.classList.toggle("passee", e.etape != null && i < e.etape); }); return liste[e.etape]; };
    const enCours = marquer([...$("etapes").querySelectorAll(".etape")]); if (deroule && enCours) enCours.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const dansLePlan = marquer([...$("plan").querySelectorAll(".pl")]); if (avecPlan && dansLePlan) dansLePlan.scrollIntoView({ block: "nearest" });
    // Les étapes d'un créneau ne sont pas celles de la fiche : rien ne s'y surligne alors.
    if (!e.plan) { try { etapesDe($("aide").contentDocument).forEach((el, i) => el.classList.toggle("en-cours", i === e.etape)); } catch (_) { /* pas encore chargée */ } }
  }
  function dessinerMinuteur() {
    const boite = $("minuteur");
    if (!minuteur) { boite.style.display = "none"; return; }
    boite.style.display = "block";
    const reste = minuteur.fin != null ? Math.max(0, minuteur.fin - (Date.now() + decalage)) : minuteur.reste;
    const part = Math.min(1, reste / (minuteur.duree * 1000));
    const a = part * 2 * Math.PI, x = 50 + 46 * Math.sin(a), y = 50 - 46 * Math.cos(a);
    $("secteur").setAttribute("d", part >= 0.9999 ? "M50,4 A46,46 0 1,1 49.99,4 Z" : part <= 0 ? "" : "M50,50 L50,4 A46,46 0 " + (part > 0.5 ? 1 : 0) + ",1 " + x.toFixed(2) + "," + y.toFixed(2) + " Z");
    const s = Math.ceil(reste / 1000), fini = minuteur.fin != null && reste === 0;
    $("reste").textContent = fini ? "C'est fini\u00a0!" : Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    boite.classList.toggle("fini", fini);
    boite.classList.toggle("en-pause", minuteur.fin == null);
  }
  // Le code du portail a changé : plus rien ne s'affiche, la tablette doit rescanner.
  function perime() {
    etat = null; minuteur = null;
    for (const id of ["aide", "deroule", "minuteur", "plan"]) $(id).style.display = "none";
    document.body.classList.remove("minuteur-seul", "avec-minuteur", "avec-plan");
    $("attente").style.display = "flex";
    $("attente").textContent = "Le code du portail a changé : scannez le nouveau QR code du téléphone, puis remplacez l'icône de l'écran d'accueil.";
  }
  async function suivre() {
    try {
      const r = await fetch(q("/etat"), { cache: "no-store" });
      if (r.ok) {
        const e = await r.json();
        $("attente").textContent = ATTENTE;
        decalage = e.maintenant - Date.now();
        if (e.version !== version) { version = e.version; if (e.montree) await charger(e); }
        etat = e; minuteur = e.minuteur; appliquer(); dessinerMinuteur();
      } else if (r.status === 403) {
        return perime();
      }
    } catch (_) { $("attente").textContent = SANS_TELEPHONE; }
    setTimeout(suivre, 2000);
  }
  $("aide").addEventListener("load", appliquer);
  setInterval(dessinerMinuteur, 250);
  suivre();
</script>
</body></html>"##;

/// Ce que la page d'une aide reçoit en plus sur la tablette : toucher une étape la coche,
/// et la case de « J'ai réussi si » se coche avec elle.
pub const COCHER: &str = r#"<style>
  .sv-s-etape, .at-etape, .cs-etape, .at-case { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .sv-s-etape.fait, .at-etape.fait, .cs-etape.fait { background: #dcfce7 !important; }
  .at-case.fait { background: #16a34a !important; border-color: #16a34a !important; position: relative; }
  .at-case.fait::after { content: "✓"; position: absolute; inset: 0; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .sv-s-etape.fait .sv-s-numero, .at-etape.fait .at-num { background: #16a34a !important; }
  .sv-s-etape.en-cours, .at-etape.en-cours, .cs-etape.en-cours { outline: 4px solid #f59e0b; outline-offset: 2px; background: #fffbeb !important; }
  .cs-critere.fait .cs-marque-critere { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='2.2' y='2.2' width='15.6' height='15.6' rx='2.4' fill='%23166534' stroke='%23166534' stroke-width='2.2'/%3E%3Cpath d='M5.6 10.4l3 3 5.8-6.6' fill='none' stroke='%23fff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important; }
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

/// Ce qu'une tablette lit quand son lien porte un ancien code : la page ne s'ouvre plus, elle dit quoi faire.
pub const PAGE_PERIMEE: &str = r#"<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Maitrize</title>
<style>html, body { margin: 0; height: 100%; background: #f2f2f7; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1c2233; }
  body { display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; text-align: center; font-size: 24px; line-height: 1.5; }</style></head>
<body><p>Le code du portail a changé.<br>Scannez le nouveau QR code du téléphone, puis remplacez l'icône de l'écran d'accueil.</p></body></html>"#;

/// L'icône de Maitrize, pour l'écran d'accueil des tablettes : 180 px, la taille que l'iPad demande.
const ICONE: &[u8] = include_bytes!("../icons/ios/AppIcon-60x60@3x.png");

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
fn servir(mut flux: TcpStream, jeton: &Mutex<String>, etat: &Mutex<Etat>) {
    let _ = flux.set_read_timeout(Some(Duration::from_secs(5)));
    let lu = lire_entetes(&mut flux);
    let texte = String::from_utf8_lossy(&lu);
    let Some((chemin, porte)) = lire_requete(texte.lines().next().unwrap_or("")) else {
        return repondre(&mut flux, 400, "text/plain; charset=utf-8", b"");
    };
    // L'icône se demande sans jeton, au moment de la mettre sur l'écran d'accueil : elle ne dit rien de la classe.
    if chemin == "/icone.png" {
        return repondre(&mut flux, 200, "image/png", ICONE);
    }
    let attendu = jeton.lock().unwrap().clone();
    if porte != attendu {
        return match chemin.as_str() {
            "/" => repondre(&mut flux, 403, "text/html; charset=utf-8", PAGE_PERIMEE.as_bytes()),
            _ => repondre(&mut flux, 403, "text/plain; charset=utf-8", "Ce lien ne vaut plus.".as_bytes()),
        };
    }
    {
        let mut e = etat.lock().unwrap();
        if let Ok(pair) = flux.peer_addr() {
            e.tablettes.insert(pair.ip(), Instant::now());
        }
        // L'adresse par laquelle la tablette est venue : celle qu'elle a gardée.
        if let Ok(ici) = flux.local_addr() {
            let adresse = format!("http://{}:{}/", ici.ip(), ici.port());
            if e.adresse_connue != adresse {
                e.adresse_connue = adresse;
                e.adresse_a_garder = true;
            }
        }
    }
    match chemin.as_str() {
        "/" => repondre(&mut flux, 200, "text/html; charset=utf-8", PAGE_TABLETTE.as_bytes()),
        "/etat" => {
            let json = etat.lock().unwrap().en_json(maintenant_ms());
            repondre(&mut flux, 200, "application/json", json.to_string().as_bytes());
        }
        "/deroule" => {
            let deroule = etat.lock().unwrap().montree.as_ref().map(|m| serde_json::json!({ "titre": m.titre, "etapes": m.etapes }));
            match deroule {
                Some(d) => repondre(&mut flux, 200, "application/json", d.to_string().as_bytes()),
                None => repondre(&mut flux, 404, "text/plain; charset=utf-8", b""),
            }
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

/// Lit la requête jusqu'à la fin de ses en-têtes : elle peut arriver en plusieurs morceaux, et répondre
/// avant de tout lire ferait couper la connexion — la tablette perdrait la réponse.
fn lire_entetes(flux: &mut TcpStream) -> Vec<u8> {
    let mut lu = Vec::new();
    let mut tampon = [0u8; 2048];
    while lu.len() < 16 * 1024 && !lu.windows(4).any(|w| w == b"\r\n\r\n") {
        match flux.read(&mut tampon) {
            Ok(0) | Err(_) => break,
            Ok(n) => lu.extend_from_slice(&tampon[..n]),
        }
    }
    lu
}

/// Écoute, jusqu'à ce qu'on l'arrête : une connexion à la fois suffit à une classe.
fn ecouter(ecoute: TcpListener, jeton: Arc<Mutex<String>>, etat: Arc<Mutex<Etat>>, arret: Arc<AtomicBool>) {
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
    let jeton = p.jeton.lock().unwrap().clone();
    let mut e = p.etat.lock().unwrap();
    e.tablettes.retain(|_, vu| vu.elapsed() < TABLETTE_PARTIE);
    // Une tablette est venue par une autre adresse : le téléphone s'en souviendra la fois suivante.
    if e.adresse_a_garder {
        e.adresse_a_garder = false;
        let _ = ecrire_souvenir(&p.fiche, &Souvenir { jeton: jeton.clone(), adresse: e.adresse_connue.clone() });
    }
    let adresses: Vec<String> = adresses_locales().iter().map(|ip| format!("http://{ip}:{}/?t={jeton}", p.port)).collect();
    let premiere = adresses.first().map(|a| a.split('?').next().unwrap_or(a));
    let changee = adresse_changee(&e.adresse_connue, premiere, e.tablettes.len());
    EtatPortail {
        ouvert: true,
        qr: adresses.first().map(|a| qr_svg(a)).unwrap_or_default(),
        adresse_changee: changee,
        adresses,
        tablettes: e.tablettes.len(),
        montree: e.montree.as_ref().map(|m| m.titre.clone()).unwrap_or_default(),
        montree_id: e.montree.as_ref().map(|m| m.id.clone()).unwrap_or_default(),
        affichage: e.affichage,
        etape: e.etape,
        etapes: e.montree.as_ref().map(|m| m.etapes.len()).unwrap_or(0),
        texte_etape: e.montree.as_ref().zip(e.etape).and_then(|(m, k)| m.etapes.get(k)).map(|x| x.texte.clone()).unwrap_or_default(),
        minuteur: e.minuteur,
        creneau: e.creneau.clone(),
        plan: e.plan,
    }
}

/// Ouvre le portail s'il ne l'est pas, avec le jeton gardé ; rend son état.
#[tauri::command]
pub fn portail_ouvrir(app: tauri::AppHandle) -> R<EtatPortail> {
    let mut garde = PORTAIL.lock().unwrap();
    if let Some(p) = garde.as_ref() {
        return Ok(etat_de(p));
    }
    let fiche = fiche_du_portail(&app)?;
    let souvenir = relire_souvenir(&fiche);
    let ecoute = TcpListener::bind(("0.0.0.0", PORT)).or_else(|_| TcpListener::bind(("0.0.0.0", 0)))
        .map_err(|e| format!("Le portail ne peut pas s'ouvrir : {e}"))?;
    let port = ecoute.local_addr().map_err(|e| e.to_string())?.port();
    // La version part de l'heure : une tablette restée ouverte depuis la veille recharge l'aide, même si son numéro
    // retombait sur celui d'hier.
    let etat = Etat { version: maintenant_ms(), adresse_connue: souvenir.adresse, ..Etat::default() };
    let p = Portail {
        port,
        jeton: Arc::new(Mutex::new(souvenir.jeton)),
        etat: Arc::new(Mutex::new(etat)),
        arret: Arc::new(AtomicBool::new(false)),
        fiche,
    };
    let (j, e, a) = (p.jeton.clone(), p.etat.clone(), p.arret.clone());
    std::thread::spawn(move || ecouter(ecoute, j, e, a));
    let etat = etat_de(&p);
    *garde = Some(p);
    Ok(etat)
}

/// Change l'état du portail ouvert, et rend ce que l'écran en montre.
fn changer(f: impl FnOnce(&mut Etat)) -> R<EtatPortail> {
    let garde = PORTAIL.lock().unwrap();
    let p = garde.as_ref().ok_or("Le portail est fermé.")?;
    f(&mut p.etat.lock().unwrap());
    Ok(etat_de(p))
}

/// Pose l'aide que les tablettes montreront ; la classe commence à la première étape.
fn montrer(e: &mut Etat, aide: AideAEnvoyer) {
    let AideAEnvoyer { id, titre, html, etapes } = aide;
    e.etape = if etapes.is_empty() { None } else { Some(0) };
    if etapes.is_empty() { e.affichage = Affichage::Fiche; }
    e.montree = Some(Montree { id, titre, html, etapes });
    e.version += 1;
}

/// Montre une aide aux tablettes : celle que l'écran vient de relire, avec les étapes de son déroulé.
/// La classe commence à la première.
#[tauri::command]
pub fn portail_montrer(id: String, titre: String, html: String, etapes: Option<Vec<EtapeDuDeroule>>) -> R<EtatPortail> {
    changer(|e| {
        montrer(e, AideAEnvoyer { id, titre, html, etapes: etapes.unwrap_or_default() });
        e.creneau.clear();
        e.plan = false;
    })
}

/// Plus rien de montré : les tablettes attendent — ou ne gardent que le minuteur.
#[tauri::command]
pub fn portail_cacher() -> R<EtatPortail> {
    changer(|e| {
        e.montree = None;
        e.etape = None;
        e.version += 1;
        e.creneau.clear();
        e.plan = false;
    })
}

/// L'aide qu'un créneau envoie, relue par l'écran avec les étapes de son déroulé.
#[derive(Deserialize, Clone, Debug)]
pub struct AideAEnvoyer {
    pub id: String,
    pub titre: String,
    pub html: String,
    #[serde(default)]
    pub etapes: Vec<EtapeDuDeroule>,
}

/// Ce qu'un créneau du cahier journal envoie aux tablettes : son aide, ou aucune — celle d'avant s'en
/// va —, et son minuteur, lancé aussitôt, ou aucun. Tout change d'un coup : les tablettes reçoivent
/// l'aide et le minuteur à la même relecture.
///
/// `plan` : les étapes de l'aide sont le déroulement du créneau — ses fiches, dans l'ordre —, et
/// `etape` la place de la fiche envoyée. Les tablettes montrent la fiche, et le déroulement à côté.
fn envoyer(e: &mut Etat, creneau: String, aide: Option<AideAEnvoyer>, secondes: u64, etape: Option<usize>, plan: bool, maintenant: u64) {
    let avec_plan = plan && aide.as_ref().is_some_and(|a| !a.etapes.is_empty());
    match aide {
        Some(a) => montrer(e, a),
        None => {
            e.montree = None;
            e.etape = None;
            e.version += 1;
        }
    }
    e.plan = avec_plan;
    if avec_plan {
        let n = e.montree.as_ref().map(|m| m.etapes.len()).unwrap_or(0);
        e.etape = etape.filter(|k| *k < n);
        e.affichage = Affichage::Fiche;
    }
    e.minuteur = (secondes > 0).then(|| Minuteur::lancer(secondes, maintenant));
    e.creneau = creneau;
}

/// Envoie aux tablettes l'aide et le minuteur d'un créneau du cahier journal — et son déroulement.
#[tauri::command]
pub fn portail_envoyer(creneau: String, aide: Option<AideAEnvoyer>, secondes: u64, etape: Option<usize>, plan: Option<bool>) -> R<EtatPortail> {
    changer(|e| envoyer(e, creneau, aide, secondes, etape, plan.unwrap_or(false), maintenant_ms()))
}

/// La fiche telle qu'elle s'imprime, ou le déroulé en grand.
#[tauri::command]
pub fn portail_affichage(affichage: String) -> R<EtatPortail> {
    changer(|e| e.affichage = if affichage == "deroule" { Affichage::Deroule } else { Affichage::Fiche })
}

/// L'étape où en est la classe — bornée aux étapes de l'aide ; aucune pour ôter le repère.
#[tauri::command]
pub fn portail_etape(etape: Option<usize>) -> R<EtatPortail> {
    changer(|e| {
        let n = e.montree.as_ref().map(|m| m.etapes.len()).unwrap_or(0);
        e.etape = etape.filter(|_| n > 0).map(|k| k.min(n - 1));
    })
}

/// Lance le minuteur pour tant de secondes ; il remplace celui qui tournait.
#[tauri::command]
pub fn portail_minuteur(secondes: u64) -> R<EtatPortail> {
    changer(|e| e.minuteur = Some(Minuteur::lancer(secondes, maintenant_ms())))
}

#[tauri::command]
pub fn portail_minuteur_pause() -> R<EtatPortail> {
    changer(|e| e.minuteur = e.minuteur.map(|t| t.pause(maintenant_ms())))
}

#[tauri::command]
pub fn portail_minuteur_reprendre() -> R<EtatPortail> {
    changer(|e| e.minuteur = e.minuteur.map(|t| t.reprendre(maintenant_ms())))
}

#[tauri::command]
pub fn portail_minuteur_arreter() -> R<EtatPortail> {
    changer(|e| e.minuteur = None)
}

/// L'état du portail, pour l'écran : combien de tablettes, ce qu'elles montrent.
#[tauri::command]
pub fn portail_etat() -> EtatPortail {
    PORTAIL.lock().unwrap().as_ref().map(etat_de).unwrap_or(FERME)
}

/// Un nouveau code : l'ancien ne vaut plus sur aucune tablette — une tablette perdue, un QR code photographié.
/// Le portail ouvert le prend aussitôt ; chaque tablette rescanne, et remplace son icône.
#[tauri::command]
pub fn portail_changer_code(app: tauri::AppHandle) -> R<EtatPortail> {
    let fiche = fiche_du_portail(&app)?;
    let garde = PORTAIL.lock().unwrap();
    let mut souvenir = relire_souvenir(&fiche);
    if let Some(p) = garde.as_ref() {
        souvenir.adresse = p.etat.lock().unwrap().adresse_connue.clone();
    }
    souvenir.jeton = autre_jeton(&souvenir.jeton);
    ecrire_souvenir(&fiche, &souvenir)?;
    Ok(match garde.as_ref() {
        Some(p) => {
            *p.jeton.lock().unwrap() = souvenir.jeton;
            // Plus aucune tablette n'est reliée : on ne les compte plus.
            p.etat.lock().unwrap().tablettes.clear();
            etat_de(p)
        }
        None => FERME,
    })
}

/// Ferme le portail : le serveur s'arrête. L'adresse revaudra à la prochaine ouverture, avec le même code.
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
        assert!(jeton_valide(&j));
        assert_ne!(j, jeton());
        assert_ne!(autre_jeton(&j), j);
        assert!(!jeton_valide("abc") && !jeton_valide("<script>") && !jeton_valide("abcdefg1"));
    }

    #[test]
    fn le_code_se_garde_d_une_ouverture_a_l_autre() {
        let d = std::env::temp_dir().join(format!("maitrize-portail-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        let fiche = d.join("portail.json");
        // La première fois, un jeton est tiré et gardé ; le lendemain, c'est le même.
        let premier = relire_souvenir(&fiche);
        assert!(jeton_valide(&premier.jeton));
        assert_eq!(relire_souvenir(&fiche), premier);
        // L'adresse des tablettes se garde avec lui.
        let avec_adresse = Souvenir { jeton: premier.jeton.clone(), adresse: "http://172.20.10.1:8765/".into() };
        ecrire_souvenir(&fiche, &avec_adresse).unwrap();
        assert_eq!(relire_souvenir(&fiche), avec_adresse);
        // Une fiche abîmée donne un nouveau jeton, bien formé — et garde ce qu'elle peut.
        std::fs::write(&fiche, br#"{"jeton":"<script>","adresse":"http://172.20.10.1:8765/"}"#).unwrap();
        let repare = relire_souvenir(&fiche);
        assert!(jeton_valide(&repare.jeton));
        assert_eq!(repare.adresse, "http://172.20.10.1:8765/");
        std::fs::write(&fiche, b"pas du json").unwrap();
        assert!(jeton_valide(&relire_souvenir(&fiche).jeton));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn il_faut_rescanner_quand_l_adresse_n_est_plus_celle_des_tablettes() {
        let partage = "http://172.20.10.1:8765/";
        let ecole = "http://10.0.4.27:8765/";
        assert!(adresse_changee(partage, Some(ecole), 0));
        // Ni à la même adresse, ni une fois qu'une tablette y est venue, ni la toute première fois, ni sans réseau.
        assert!(!adresse_changee(partage, Some(partage), 0));
        assert!(!adresse_changee(partage, Some(ecole), 1));
        assert!(!adresse_changee("", Some(ecole), 0));
        assert!(!adresse_changee(partage, None, 0));
    }

    #[test]
    fn le_portail_ne_sert_que_l_aide_montree_et_seulement_avec_son_jeton() {
        // Un portail d'essai, sur un port libre, servi comme le vrai.
        let ecoute = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = ecoute.local_addr().unwrap().port();
        let etat = Arc::new(Mutex::new(Etat::default()));
        let arret = Arc::new(AtomicBool::new(false));
        let jeton_partage = Arc::new(Mutex::new("jeton123".to_string()));
        let (j2, e2, a2) = (jeton_partage.clone(), etat.clone(), arret.clone());
        std::thread::spawn(move || ecouter(ecoute, j2, e2, a2));
        let demander = |cible: &str| -> (u16, String) {
            let mut f = TcpStream::connect(("127.0.0.1", port)).unwrap();
            write!(f, "GET {cible} HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
            let mut r = String::new();
            f.read_to_string(&mut r).unwrap();
            let code = r.split_whitespace().nth(1).unwrap().parse().unwrap();
            (code, r.split("\r\n\r\n").nth(1).unwrap_or("").to_string())
        };
        assert_eq!(demander("/?t=autre").0, 403);
        // Une requête qui arrive en deux morceaux est lue en entier.
        {
            let mut f = TcpStream::connect(("127.0.0.1", port)).unwrap();
            f.write_all(b"GET /?t=jeton").unwrap();
            std::thread::sleep(Duration::from_millis(80));
            f.write_all(b"123 HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
            let mut r = String::new();
            f.read_to_string(&mut r).unwrap();
            assert!(r.starts_with("HTTP/1.1 200"), "{r}");
        }
        assert_eq!(demander("/journal.json?t=jeton123").0, 404);
        let (code, page) = demander("/?t=jeton123");
        assert_eq!(code, 200);
        assert!(page.contains("L'aide va s'afficher ici"));
        assert_eq!(demander("/aide?t=jeton123").0, 404);
        assert_eq!(demander("/deroule?t=jeton123").0, 404);
        {
            let mut e = etat.lock().unwrap();
            let etapes = vec![EtapeDuDeroule { texte: "Je lis.".into(), image: String::new(), matiere: String::new() }, EtapeDuDeroule { texte: "J'écris.".into(), image: "data:image/png;base64,AA".into(), matiere: String::new() }];
            e.montree = Some(Montree { id: "a1".into(), titre: "Le séquentiel".into(), html: "<body><p>Je lis.</p></body>".into(), etapes });
            e.etape = Some(1);
            e.affichage = Affichage::Deroule;
            e.minuteur = Some(Minuteur::lancer(300, maintenant_ms()));
            e.version += 1;
        }
        let (_, json) = demander("/etat?t=jeton123");
        assert!(json.contains("\"montree\":\"Le séquentiel\"") && json.contains("\"version\":1"), "{json}");
        assert!(json.contains("\"affichage\":\"deroule\"") && json.contains("\"etape\":1") && json.contains("\"etapes\":2"), "{json}");
        assert!(json.contains("\"duree\":300") && json.contains("\"enPause\":false") && json.contains("\"maintenant\":"), "{json}");
        let (code, aide) = demander("/aide?t=jeton123&v=1");
        assert_eq!(code, 200);
        assert!(aide.contains("<p>Je lis.</p>") && aide.contains("classList.toggle"));
        let (code, deroule) = demander("/deroule?t=jeton123&v=1");
        assert_eq!(code, 200);
        assert!(deroule.contains("\"texte\":\"J'écris.\"") && deroule.contains("data:image/png;base64,AA"), "{deroule}");
        assert_eq!(etat.lock().unwrap().tablettes.len(), 1);
        // Le téléphone lit l'étape surlignée en toutes lettres.
        let fiche = std::env::temp_dir().join(format!("maitrize-portail-essai-{}.json", std::process::id()));
        let vu = etat_de(&Portail { port, jeton: jeton_partage.clone(), etat: etat.clone(), arret: arret.clone(), fiche: fiche.clone() });
        assert_eq!((vu.etape, vu.etapes, vu.texte_etape.as_str()), (Some(1), 2, "J'écris."));
        // L'adresse par laquelle la tablette est venue est gardée avec le jeton, pour la fois suivante.
        let garde: Souvenir = serde_json::from_slice(&std::fs::read(&fiche).unwrap()).unwrap();
        assert_eq!(garde, Souvenir { jeton: "jeton123".into(), adresse: format!("http://127.0.0.1:{port}/") });
        let _ = std::fs::remove_file(&fiche);
        // Un nouveau code : l'ancien lien ne vaut plus, et la page dit quoi faire ; le nouveau sert aussitôt.
        *jeton_partage.lock().unwrap() = "neufneuf".into();
        let (code_page, page) = demander("/?t=jeton123");
        assert_eq!(code_page, 403);
        assert!(page.contains("Le code du portail a changé"), "{page}");
        assert_eq!(demander("/etat?t=jeton123").0, 403);
        assert_eq!(demander("/etat?t=neufneuf").0, 200);
        // L'icône de l'écran d'accueil se donne sans jeton.
        {
            let mut f = TcpStream::connect(("127.0.0.1", port)).unwrap();
            f.write_all(b"GET /icone.png HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
            let mut r = Vec::new();
            f.read_to_end(&mut r).unwrap();
            assert!(r.starts_with(b"HTTP/1.1 200") && r.windows(4).any(|w| w == b"\x89PNG"));
        }
        arret.store(true, Ordering::SeqCst);
    }

    #[test]
    fn un_creneau_envoie_son_aide_et_son_minuteur_d_un_coup() {
        let mut e = Etat::default();
        let aide = |id: &str| AideAEnvoyer {
            id: id.into(), titre: format!("Aide {id}"), html: "<p>1. Je lis.</p>".into(),
            etapes: vec![EtapeDuDeroule { texte: "Je lis.".into(), image: String::new(), matiere: String::new() }],
        };
        envoyer(&mut e, "c1".into(), Some(aide("a1")), 900, None, false, 1_000);
        assert_eq!((e.montree.as_ref().map(|m| m.id.as_str()), e.etape, e.creneau.as_str()), (Some("a1"), Some(0), "c1"));
        // Le minuteur démarre aussitôt, de toute sa durée.
        assert_eq!(e.minuteur.map(|t| (t.duree, t.fin)), Some((900, Some(901_000))));
        let version = e.version;
        // Un autre créneau, sans aide : l'aide d'avant s'en va, son minuteur prend la place.
        envoyer(&mut e, "c2".into(), None, 300, None, false, 5_000);
        assert!(e.montree.is_none() && e.etape.is_none() && e.version > version);
        assert_eq!((e.minuteur.map(|t| t.duree), e.creneau.as_str()), (Some(300), "c2"));
        // Un créneau sans minuteur arrête celui qui tournait : les tablettes ne montrent que ce créneau.
        envoyer(&mut e, "c3".into(), Some(aide("a3")), 0, None, false, 9_000);
        assert_eq!((e.minuteur, e.creneau.as_str()), (None, "c3"));
        // Une fiche d'un créneau qui en a trois : son déroulement part avec elle, la fiche à sa place.
        let deroule = |n: usize| (0..n).map(|i| EtapeDuDeroule { texte: format!("Fiche {i}"), image: String::new(), matiere: "Français".into() }).collect::<Vec<_>>();
        e.affichage = Affichage::Deroule;
        envoyer(&mut e, "c4".into(), Some(AideAEnvoyer { etapes: deroule(3), ..aide("f2") }), 600, Some(1), true, 12_000);
        assert_eq!((e.plan, e.etape, e.affichage), (true, Some(1), Affichage::Fiche));
        assert!(e.en_json(12_000).to_string().contains("\"plan\":true"));
        // Une place hors du déroulement ne surligne rien ; une aide montrée d'ailleurs n'a plus de déroulement.
        envoyer(&mut e, "c4".into(), Some(AideAEnvoyer { etapes: deroule(3), ..aide("f9") }), 600, Some(7), true, 13_000);
        assert_eq!((e.plan, e.etape), (true, None));
        envoyer(&mut e, "c5".into(), Some(aide("a5")), 0, None, false, 14_000);
        assert_eq!((e.plan, e.etape), (false, Some(0)));
    }

    #[test]
    fn le_minuteur_se_lance_s_arrete_et_reprend_sans_perdre_de_temps() {
        let t = Minuteur::lancer(60, 1_000);
        assert_eq!(t.reste_a(31_000), 30_000);
        let pause = t.pause(31_000);
        assert_eq!((pause.fin, pause.reste_a(99_000)), (None, 30_000));
        let repris = pause.reprendre(100_000);
        assert_eq!(repris.reste_a(110_000), 20_000);
        assert_eq!(repris.reste_a(500_000), 0);
        // Ni zéro ni plus de deux heures.
        assert_eq!(Minuteur::lancer(0, 0).duree, 1);
        assert_eq!(Minuteur::lancer(99_999, 0).duree, 7200);
    }
}
