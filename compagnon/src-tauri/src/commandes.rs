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
//! Le dépôt part d'ici, en Rust, et non de la page : les règles réseau d'iOS
//! ne s'appliquent pas aux sockets, ce qui évite de déclarer une exception
//! pour parler en clair au Mac du réseau local.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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
}

/// Où l'on garde les vocaux et l'adresse de l'ordinateur.
fn dossier(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Dossier de données introuvable : {e}"))?;
    std::fs::create_dir_all(d.join("vocaux")).map_err(|e| e.to_string())?;
    Ok(d)
}

fn fiche(app: &tauri::AppHandle) -> R<PathBuf> {
    Ok(dossier(app)?.join("ordinateur.txt"))
}

/// L'adresse du Mac, telle qu'on l'a appairée. Vide tant qu'on ne l'a pas.
#[tauri::command]
pub fn ordinateur_lire(app: tauri::AppHandle) -> R<String> {
    Ok(std::fs::read_to_string(fiche(&app)?).unwrap_or_default().trim().to_string())
}

/// Retient l'adresse du Mac : elle vaudra encore demain.
#[tauri::command]
pub fn ordinateur_ecrire(app: tauri::AppHandle, url: String) -> R<()> {
    std::fs::write(fiche(&app)?, url.trim()).map_err(|e| e.to_string())
}

/**
 * Garde un enregistrement, avant toute tentative d'envoi.
 *
 * On garde d'abord, on envoie ensuite : un vocal ne se perd pas parce que
 * l'ordinateur était éteint dans le sac. Le nom du fichier porte l'heure et
 * la durée, ce qui évite un index à tenir à jour — et à désynchroniser.
 */
#[tauri::command]
pub fn vocal_garder(app: tauri::AppHandle, debut: String, duree_s: f64, wav_b64: String) -> R<Vocal> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(wav_b64.as_bytes())
        .map_err(|e| format!("Enregistrement illisible : {e}"))?;
    if octets.len() < 100 {
        return Err("Enregistrement vide.".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let nom = format!("{}__{}__{:.3}.wav", id, debut.replace(':', "-"), duree_s);
    std::fs::write(dossier(&app)?.join("vocaux").join(&nom), &octets)
        .map_err(|e| format!("Écriture impossible : {e}"))?;
    Ok(Vocal { id, debut, duree_s, octets: octets.len() as u64 })
}

/// Relit un nom de fichier : l'identifiant, l'heure et la durée.
fn depuis_le_nom(nom: &str) -> Option<(String, String, f64)> {
    let brut = nom.strip_suffix(".wav")?;
    let mut bouts = brut.split("__");
    let id = bouts.next()?.to_string();
    let debut = bouts.next()?.to_string();
    let duree = bouts.next()?.parse().ok()?;
    // L'heure a été écrite avec des tirets : « 10-12-00 » redevient « 10:12:00 ».
    let debut = match debut.split_once('T') {
        Some((jour, heure)) => format!("{jour}T{}", heure.replace('-', ":")),
        None => debut,
    };
    Some((id, debut, duree))
}

/// Ce qui attend, du plus ancien au plus récent.
#[tauri::command]
pub fn vocaux_liste(app: tauri::AppHandle) -> R<Vec<Vocal>> {
    let d = dossier(&app)?.join("vocaux");
    let mut sortie = Vec::new();
    let Ok(entrees) = std::fs::read_dir(&d) else { return Ok(sortie) };
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some((id, debut, duree_s)) = depuis_le_nom(&nom) else { continue };
        let octets = e.metadata().map(|m| m.len()).unwrap_or(0);
        sortie.push(Vocal { id, debut, duree_s, octets });
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

/// Oublie un vocal : le fichier part avec.
#[tauri::command]
pub fn vocal_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    let chemin = fichier_de(&app, &id)?;
    std::fs::remove_file(chemin).map_err(|e| e.to_string())
}

/**
 * Dépose un vocal sur l'ordinateur, et ne l'efface que s'il est arrivé.
 *
 * L'adresse gardée porte déjà le jeton : `http://192.168.x.x:8787/?t=…`. On en
 * reprend l'origine et le jeton pour bâtir l'adresse du dépôt.
 */
#[tauri::command]
pub async fn vocal_envoyer(app: tauri::AppHandle, id: String) -> R<()> {
    let base = ordinateur_lire(app.clone())?;
    if base.is_empty() {
        return Err("Aucun ordinateur appairé.".into());
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let chemin = fichier_de(&app, &id)?;
    let nom = chemin.file_name().unwrap_or_default().to_string_lossy().to_string();
    let (_, debut, duree) = depuis_le_nom(&nom).ok_or("Nom de fichier inattendu.")?;
    let octets = std::fs::read(&chemin).map_err(|e| e.to_string())?;

    let url = format!(
        "{origine}/api/vocal?t={}&debut={}&duree={duree}",
        urlencode(&jeton),
        urlencode(&debut)
    );
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let reponse = client
        .post(&url)
        .body(octets)
        .send()
        .await
        .map_err(|_| "L'ordinateur ne répond pas.".to_string())?;
    if !reponse.status().is_success() {
        return Err(format!("L'ordinateur a refusé ({}).", reponse.status()));
    }
    std::fs::remove_file(&chemin).map_err(|e| e.to_string())
}

/// L'ordinateur est-il joignable ? Une question, une réponse, pas de dépôt.
#[tauri::command]
pub async fn ordinateur_joignable(app: tauri::AppHandle) -> R<bool> {
    let base = ordinateur_lire(app)?;
    if base.is_empty() {
        return Ok(false);
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{origine}/api/bonjour?t={}", urlencode(&jeton));
    Ok(client.get(&url).send().await.map(|r| r.status().is_success()).unwrap_or(false))
}

/// Sépare l'origine du jeton dans l'adresse appairée.
pub fn decouper_adresse(url: &str) -> R<(String, String)> {
    let url = url.trim();
    let sans = url.strip_prefix("http://").or_else(|| url.strip_prefix("https://"))
        .ok_or("Adresse inattendue : elle doit commencer par http://")?;
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

    #[test]
    fn separe_l_origine_et_le_jeton() {
        let (o, j) = decouper_adresse("http://192.168.1.20:8787/?t=abc-123").unwrap();
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
        let (id, debut, duree) = depuis_le_nom("abcd__2026-09-25T10-12-00__4.010.wav").unwrap();
        assert_eq!(id, "abcd");
        // L'heure retrouve ses deux-points, que le système de fichiers refuse.
        assert_eq!(debut, "2026-09-25T10:12:00");
        assert!((duree - 4.01).abs() < 1e-6);
    }

    #[test]
    fn un_nom_inattendu_ne_fait_pas_tomber_la_liste() {
        assert!(depuis_le_nom("truc.wav").is_none());
        assert!(depuis_le_nom(".DS_Store").is_none());
    }

    #[test]
    fn echappe_ce_qu_il_faut_dans_l_adresse() {
        assert_eq!(urlencode("2026-09-25T10:12:00"), "2026-09-25T10%3A12%3A00");
        assert_eq!(urlencode("abc-123"), "abc-123");
    }
}
