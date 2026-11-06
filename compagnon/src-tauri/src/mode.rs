//! Une seule application, deux usages.
//!
//! « Au lancement du compagnon pour la première fois, ou dans les réglages,
//! choisir si on est en mode élève ou en mode enseignant […] une seule même
//! application mais deux usages différents » (l'enseignant, 6 novembre 2026).
//!
//! - Enseignant : le cahier journal, les dictées, les tablettes. Rien ne s'ouvre
//!   sans Nuage, et c'est lui qui donne accès aux données de la classe.
//! - Élève : son classeur de communication, et le mode classe, qui montre ce que
//!   le téléphone de l'enseignant lui envoie sur le même réseau.
//!
//! Côté élève, rien de la classe n'est sur l'appareil : ni compte, ni cahier
//! journal. Seul reste ici le lien vers le portail de l'enseignant, qui ne sert
//! que l'aide montrée, jamais un prénom (voir `portail`). Le jeton reste côté
//! Rust : la page le demande sans le connaître, et ne peut rien lire d'autre que
//! ce que le portail sert à une tablette. C'est Rust qui parle au portail, parce
//! que les règles réseau d'iOS (App Transport Security) ne s'appliquent pas aux
//! sockets : aucune exception à déclarer pour lire une adresse en clair.

use crate::portail::{jeton_valide, PAGE_TABLETTE};
use serde::{Deserialize, Serialize};
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::Manager;

type R<T> = Result<T, String>;

/// Le portail de l'enseignant, tel que son QR code le donne.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
struct PortailRelie {
    origine: String,
    jeton: String,
}

/// Ce que l'appareil garde de son usage. Sans fiche ou abîmée : rien de choisi.
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
struct Fiche {
    #[serde(default)]
    mode: String,
    #[serde(default)]
    portail: Option<PortailRelie>,
}

/// Ce que les pages en savent : le jeton ne sort pas d'ici.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModeVu {
    /// « enseignant », « eleve », ou vide : pas encore choisi.
    pub mode: String,
    pub portail_relie: bool,
}

/// Ce que le portail a répondu.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct ReponseDuPortail {
    pub statut: u16,
    pub corps: String,
}

fn chemin_de_la_fiche(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = app.path().app_data_dir().map_err(|e| format!("Dossier de données introuvable : {e}"))?;
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d.join("mode.json"))
}

fn relire(chemin: &Path) -> Fiche {
    std::fs::read(chemin).ok().and_then(|o| serde_json::from_slice(&o).ok()).unwrap_or_default()
}

/// Écrit d'abord à côté, puis remplace d'un seul geste.
fn ecrire(chemin: &Path, fiche: &Fiche) -> R<()> {
    let octets = serde_json::to_vec(fiche).map_err(|e| e.to_string())?;
    let provisoire = chemin.with_extension("ecriture");
    std::fs::write(&provisoire, octets).map_err(|e| e.to_string())?;
    std::fs::rename(&provisoire, chemin).map_err(|e| e.to_string())
}

fn vu(fiche: &Fiche) -> ModeVu {
    ModeVu { mode: fiche.mode.clone(), portail_relie: fiche.portail.is_some() }
}

/// Une adresse du réseau local : celle du WiFi de la classe, ou du partage de connexion du téléphone. Rien d'autre
/// ne doit s'afficher en mode classe, même si un QR code l'indiquait.
fn du_reseau_local(ip: Ipv4Addr) -> bool {
    ip.is_private() || ip.is_link_local() || (cfg!(test) && ip.is_loopback())
}

/// Le QR code du portail : `http://<adresse locale>:<port>/?t=<jeton>`.
fn lire_le_qr_code(code: &str) -> R<PortailRelie> {
    const PAS_LE_BON: &str = "Ce n'est pas le QR code des tablettes : il est dans l'onglet Tablettes du téléphone de l'enseignant.";
    let reste = code.trim().strip_prefix("http://").ok_or(PAS_LE_BON)?;
    let (hote, requete) = reste.split_once("/?").ok_or(PAS_LE_BON)?;
    let (ip, port) = hote.split_once(':').ok_or(PAS_LE_BON)?;
    let ip: Ipv4Addr = ip.parse().map_err(|_| PAS_LE_BON)?;
    let port: u16 = port.parse().map_err(|_| PAS_LE_BON)?;
    if !du_reseau_local(ip) {
        return Err(PAS_LE_BON.into());
    }
    let jeton = requete.split('&').find_map(|p| p.strip_prefix("t=")).ok_or(PAS_LE_BON)?;
    if !jeton_valide(jeton) {
        return Err(PAS_LE_BON.into());
    }
    Ok(PortailRelie { origine: format!("http://{ip}:{port}"), jeton: jeton.to_string() })
}

/// L'adresse à demander au portail, d'après ce que la page demande : ses seules routes, sans le jeton, que la page
/// ne connaît pas. Elle ne peut rien viser d'autre.
fn adresse_au_portail(portail: &PortailRelie, demande: &str) -> R<String> {
    let (route, requete) = demande.split_once('?').unwrap_or((demande, ""));
    if !matches!(route, "/etat" | "/aide" | "/deroule") {
        return Err(format!("Le portail ne sert pas « {route} »."));
    }
    let mut adresse = format!("{}{route}?t={}", portail.origine, portail.jeton);
    for p in requete.split('&') {
        if let Some(tablette) = p.strip_prefix("tab=") {
            if (6..=32).contains(&tablette.len()) && tablette.bytes().all(|o| o.is_ascii_alphanumeric()) {
                adresse.push_str("&tab=");
                adresse.push_str(tablette);
            }
        } else if let Some(version) = p.strip_prefix("v=") {
            if !version.is_empty() && version.bytes().all(|o| o.is_ascii_digit()) {
                adresse.push_str("&v=");
                adresse.push_str(version);
            }
        }
    }
    Ok(adresse)
}

/// La page des tablettes, celle qu'une tablette ouvre dans son navigateur : la même, pour ne montrer qu'une chose
/// d'une seule façon. Ici, ce qu'elle demande passe par la page qui la contient, donc par Rust.
fn page_dans_l_application() -> String {
    const PAR_RUST: &str = "<head><script>window.fetch = function (adresse) { return parent.classeLire(String(adresse)); };</script>";
    PAGE_TABLETTE.replacen("<head>", PAR_RUST, 1)
}

async fn demander(adresse: &str, attente: Duration) -> R<ReponseDuPortail> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(attente)
        .build()
        .map_err(|e| e.to_string())?;
    // L'erreur peut citer l'adresse, et le jeton avec : elle reste ici.
    let reponse = client.get(adresse).send().await.map_err(|_| "Le téléphone de l'enseignant ne répond pas.".to_string())?;
    let statut = reponse.status().as_u16();
    let corps = reponse.text().await.map_err(|_| "Le téléphone de l'enseignant ne répond pas.".to_string())?;
    Ok(ReponseDuPortail { statut, corps })
}

/// Qui se sert de l'appareil, si on l'a dit.
#[tauri::command]
pub fn mode_lire(app: tauri::AppHandle) -> R<ModeVu> {
    Ok(vu(&relire(&chemin_de_la_fiche(&app)?)))
}

/// Dit qui se sert de l'appareil.
#[tauri::command]
pub fn mode_choisir(app: tauri::AppHandle, mode: String) -> R<ModeVu> {
    if !matches!(mode.as_str(), "enseignant" | "eleve") {
        return Err(format!("Mode inconnu : « {mode} »."));
    }
    let chemin = chemin_de_la_fiche(&app)?;
    let fiche = Fiche { mode, ..relire(&chemin) };
    ecrire(&chemin, &fiche)?;
    Ok(vu(&fiche))
}

/// Relie l'appareil au portail de l'enseignant, d'après son QR code. Une fois : le jeton est durable.
#[tauri::command]
pub fn classe_relier(app: tauri::AppHandle, code: String) -> R<ModeVu> {
    let portail = lire_le_qr_code(&code)?;
    let chemin = chemin_de_la_fiche(&app)?;
    let fiche = Fiche { portail: Some(portail), ..relire(&chemin) };
    ecrire(&chemin, &fiche)?;
    Ok(vu(&fiche))
}

/// Oublie le portail : le QR code sera à relire.
#[tauri::command]
pub fn classe_oublier(app: tauri::AppHandle) -> R<ModeVu> {
    let chemin = chemin_de_la_fiche(&app)?;
    let fiche = Fiche { portail: None, ..relire(&chemin) };
    ecrire(&chemin, &fiche)?;
    Ok(vu(&fiche))
}

/// La page du mode classe.
#[tauri::command]
pub fn classe_page() -> String {
    page_dans_l_application()
}

/// Ce que la page demande au portail de l'enseignant.
#[tauri::command]
pub async fn classe_lire(app: tauri::AppHandle, chemin: String) -> R<ReponseDuPortail> {
    let portail = relire(&chemin_de_la_fiche(&app)?).portail.ok_or("Aucun téléphone relié.")?;
    let adresse = adresse_au_portail(&portail, &chemin)?;
    // L'état se relit toutes les deux secondes ; une aide peut peser lourd, avec ses images et ses voix.
    let attente = if chemin.starts_with("/etat") { 4 } else { 30 };
    demander(&adresse, Duration::from_secs(attente)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};

    fn un_portail() -> PortailRelie {
        PortailRelie { origine: "http://172.20.10.1:8765".into(), jeton: "abc23def".into() }
    }

    #[test]
    fn le_qr_code_du_portail_se_lit_et_rien_d_autre() {
        assert_eq!(lire_le_qr_code(" http://172.20.10.1:8765/?t=abc23def ").unwrap(), un_portail());
        assert_eq!(lire_le_qr_code("http://192.168.1.12:9000/?t=abc23def").unwrap().origine, "http://192.168.1.12:9000");
        for faux in [
            "maitrize-relais:xyz",
            "https://172.20.10.1:8765/?t=abc23def",
            // Une adresse d'internet ne s'affiche pas en mode classe.
            "http://8.8.8.8:8765/?t=abc23def",
            "http://exemple.fr:8765/?t=abc23def",
            "http://172.20.10.1/?t=abc23def",
            "http://172.20.10.1:8765/",
            "http://172.20.10.1:8765/?t=trop",
            "http://172.20.10.1:8765/?t=avec0un0",
        ] {
            assert!(lire_le_qr_code(faux).is_err(), "{faux}");
        }
    }

    #[test]
    fn la_page_ne_peut_viser_que_les_routes_du_portail_et_ne_connait_pas_le_jeton() {
        let p = un_portail();
        // La page demande sans jeton : c'est Rust qui le met.
        assert_eq!(adresse_au_portail(&p, "/etat?t=&tab=k3x9q2").unwrap(), "http://172.20.10.1:8765/etat?t=abc23def&tab=k3x9q2");
        assert_eq!(adresse_au_portail(&p, "/aide?t=&tab=k3x9q2&v=17").unwrap(), "http://172.20.10.1:8765/aide?t=abc23def&tab=k3x9q2&v=17");
        assert_eq!(adresse_au_portail(&p, "/deroule").unwrap(), "http://172.20.10.1:8765/deroule?t=abc23def");
        for faux in ["/", "/icone.png", "http://8.8.8.8/etat", "/etat/../secret", "@8.8.8.8/etat"] {
            assert!(adresse_au_portail(&p, faux).is_err(), "{faux}");
        }
        // Ce qui n'a pas sa forme ne part pas, et la page ne peut pas imposer son jeton.
        assert_eq!(adresse_au_portail(&p, "/etat?t=autre&tab=a/b&v=1;x&q=2").unwrap(), "http://172.20.10.1:8765/etat?t=abc23def");
    }

    #[test]
    fn la_fiche_garde_le_mode_et_le_portail_et_une_fiche_abimee_ne_choisit_rien() {
        let d = std::env::temp_dir().join(format!("mode-essai-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&d).unwrap();
        let chemin = d.join("mode.json");
        assert_eq!(relire(&chemin), Fiche::default());
        assert_eq!(vu(&relire(&chemin)), ModeVu { mode: String::new(), portail_relie: false });
        let fiche = Fiche { mode: "eleve".into(), portail: Some(un_portail()) };
        ecrire(&chemin, &fiche).unwrap();
        assert_eq!(relire(&chemin), fiche);
        // Ce que les pages voient ne porte pas le jeton.
        assert!(!serde_json::to_string(&vu(&fiche)).unwrap().contains("abc23def"));
        std::fs::write(&chemin, b"pas du json").unwrap();
        assert_eq!(relire(&chemin), Fiche::default());
        std::fs::remove_dir_all(&d).unwrap();
    }

    #[test]
    fn la_page_des_tablettes_passe_par_la_page_qui_la_contient() {
        let page = page_dans_l_application();
        let ici = page.find("parent.classeLire").expect("le détour");
        // Avant le script de la page, qui lit l'état dès son chargement.
        assert!(ici < page.find("async function suivre").unwrap());
        assert_eq!(page.matches("<head>").count(), 1);
    }

    #[test]
    fn le_portail_repond_sur_le_reseau() {
        // Un petit portail : il répond ce qu'on lui demande, et dit la requête reçue.
        let ecoute = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = ecoute.local_addr().unwrap().port();
        let recu = std::thread::spawn(move || {
            let (mut flux, _) = ecoute.accept().unwrap();
            let mut tampon = [0u8; 2048];
            let n = flux.read(&mut tampon).unwrap();
            flux.write_all(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 2\r\nConnection: close\r\n\r\nno").unwrap();
            String::from_utf8_lossy(&tampon[..n]).to_string()
        });
        let portail = lire_le_qr_code(&format!("http://127.0.0.1:{port}/?t=abc23def")).unwrap();
        let adresse = adresse_au_portail(&portail, "/etat?t=&tab=k3x9q2").unwrap();
        let reponse = tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap()
            .block_on(demander(&adresse, Duration::from_secs(4))).unwrap();
        assert_eq!(reponse, ReponseDuPortail { statut: 403, corps: "no".into() });
        assert!(recu.join().unwrap().starts_with("GET /etat?t=abc23def&tab=k3x9q2 HTTP/1.1"));
    }

    #[test]
    fn un_telephone_absent_se_dit_sans_citer_le_jeton() {
        // Un port fermé : on en prend un, et on le rend.
        let port = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap().local_addr().unwrap().port();
        let adresse = format!("http://127.0.0.1:{port}/etat?t=abc23def");
        let erreur = tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap()
            .block_on(demander(&adresse, Duration::from_secs(4))).unwrap_err();
        assert!(!erreur.contains("abc23def"), "{erreur}");
    }
}
