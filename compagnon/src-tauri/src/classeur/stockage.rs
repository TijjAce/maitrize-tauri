//! Les classeurs et leurs images, dans le dossier de l'application.
//!
//! Le classeur d'un élève, c'est sa voix : il ne doit jamais se perdre. Chaque
//! classeur est un fichier JSON, écrit d'abord à côté puis mis à sa place d'un
//! seul geste (un arrêt en pleine écriture laisse l'ancien intact) ; la
//! version d'avant reste dans `<id>.precedent.json`. Un classeur supprimé part
//! dans `corbeille/`, d'où il se reprend. Les images — pictos d'ARASAAC,
//! photos — sont des fichiers à part, une fois chacune, partagées entre les
//! classeurs.

use base64::{engine::general_purpose::STANDARD, Engine};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

/// Un identifiant sûr pour un nom de fichier : lettres, chiffres, tirets.
pub(crate) fn id_sur(id: &str) -> Result<String, String> {
    let t = id.trim();
    if t.is_empty() || t.len() > 120 || !t.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err(format!("Identifiant illisible : « {t} »."));
    }
    Ok(t.to_string())
}

fn dossier<R: Runtime>(app: &AppHandle<R>, nom: &str) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?.join(nom);
    fs::create_dir_all(&d).map_err(|e| format!("Dossier {nom} : {e}"))?;
    Ok(d)
}

pub(crate) fn dossier_images<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    dossier(app, "images")
}

/// Écrit d'abord à côté, puis remplace d'un seul geste.
pub(crate) fn ecrire_sur(chemin: &PathBuf, octets: &[u8]) -> Result<(), String> {
    let provisoire = chemin.with_extension("ecriture");
    fs::write(&provisoire, octets).map_err(|e| format!("Écriture : {e}"))?;
    fs::rename(&provisoire, chemin).map_err(|e| format!("Écriture : {e}"))
}

/// Tous les classeurs, tels qu'ils sont gardés (du JSON, sans les images).
#[tauri::command]
pub fn classeurs_lister<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let d = dossier(&app, "classeurs")?;
    let mut tous = Vec::new();
    for entree in fs::read_dir(&d).map_err(|e| e.to_string())?.flatten() {
        let p = entree.path();
        let nom = p.file_name().and_then(|n| n.to_str()).unwrap_or_default();
        if nom.ends_with(".json") && !nom.ends_with(".precedent.json") {
            if let Ok(texte) = fs::read_to_string(&p) {
                tous.push(texte);
            }
        }
    }
    Ok(tous)
}

/// Garde un classeur ; la version d'avant reste à côté.
#[tauri::command]
pub fn classeur_ecrire<R: Runtime>(app: AppHandle<R>, id: String, contenu: String) -> Result<(), String> {
    let id = id_sur(&id)?;
    serde_json::from_str::<serde_json::Value>(&contenu).map_err(|e| format!("Classeur illisible : {e}"))?;
    let d = dossier(&app, "classeurs")?;
    let chemin = d.join(format!("{id}.json"));
    if chemin.exists() {
        let _ = fs::copy(&chemin, d.join(format!("{id}.precedent.json")));
    }
    ecrire_sur(&chemin, contenu.as_bytes())
}

/// Met un classeur à la corbeille : il ne disparaît pas.
#[tauri::command]
pub fn classeur_supprimer<R: Runtime>(app: AppHandle<R>, id: String) -> Result<(), String> {
    let id = id_sur(&id)?;
    let d = dossier(&app, "classeurs")?;
    let corbeille = dossier(&app, "corbeille")?;
    let chemin = d.join(format!("{id}.json"));
    if chemin.exists() {
        let quand = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        fs::rename(&chemin, corbeille.join(format!("{id}-{quand}.json"))).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Le type d'une image, à ses premiers octets.
fn type_image(octets: &[u8]) -> &'static str {
    if octets.starts_with(&[0x89, b'P', b'N', b'G']) {
        "image/png"
    } else if octets.starts_with(&[0xFF, 0xD8]) {
        "image/jpeg"
    } else if octets.len() > 12 && &octets[8..12] == b"WEBP" {
        "image/webp"
    } else {
        "image/png"
    }
}

pub(crate) fn data_url(octets: &[u8]) -> String {
    format!("data:{};base64,{}", type_image(octets), STANDARD.encode(octets))
}

/// Les images demandées, en adresses `data:` ; celles qui manquent n'y sont pas. Asynchrone : un classeur complet
/// en a des centaines, que le fil principal (celui de l'écran) n'a pas à lire. Les écritures, elles, restent dans
/// l'ordre où elles arrivent (des commandes ordinaires) : une version plus ancienne d'un classeur ne doit jamais
/// passer après une plus récente.
#[tauri::command]
pub async fn images_lire<R: Runtime>(app: AppHandle<R>, ids: Vec<String>) -> Result<HashMap<String, String>, String> {
    let d = dossier_images(&app)?;
    let mut lues = HashMap::new();
    for id in ids {
        let Ok(sur) = id_sur(&id) else { continue };
        if let Ok(octets) = fs::read(d.join(&sur)) {
            lues.insert(id, data_url(&octets));
        }
    }
    Ok(lues)
}

/// Garde une image (une photo, une image d'un classeur importé), en base64 ou en adresse `data:`.
#[tauri::command]
pub fn image_ecrire<R: Runtime>(app: AppHandle<R>, id: String, donnees: String) -> Result<(), String> {
    let id = id_sur(&id)?;
    let b64 = donnees.split_once(',').map(|(_, b)| b).unwrap_or(&donnees);
    let octets = STANDARD.decode(b64.trim()).map_err(|e| format!("Image illisible : {e}"))?;
    ecrire_sur(&dossier_images(&app)?.join(id), &octets)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn un_identifiant_ne_sort_pas_du_dossier() {
        assert!(id_sur("arasaac-2486").is_ok());
        assert!(id_sur("photo-1f3a_b").is_ok());
        assert!(id_sur("../classeurs").is_err());
        assert!(id_sur("a/b").is_err());
        assert!(id_sur("").is_err());
    }

    #[test]
    fn une_image_dit_son_type() {
        assert!(data_url(&[0x89, b'P', b'N', b'G', 0, 0]).starts_with("data:image/png;base64,"));
        assert!(data_url(&[0xFF, 0xD8, 0xFF]).starts_with("data:image/jpeg;base64,"));
    }
}
