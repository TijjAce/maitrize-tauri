//! Les pictos d'ARASAAC : chercher un mot, prendre un picto.
//!
//! La recherche demande internet ; un picto pris est gardé dans le dossier de
//! l'application et sert ensuite hors ligne, pour toujours. Les pictogrammes
//! d'ARASAAC sont de Sergio Palao, propriété du Gouvernement d'Aragon, sous
//! licence Creative Commons BY-NC-SA : l'application le dit dans ses crédits,
//! et chaque image exportée le porte.

use crate::stockage::{data_url, dossier_images, ecrire_sur};
use tauri::{AppHandle, Runtime};

#[derive(serde::Serialize)]
pub struct Trouve {
    pub id: u64,
    pub mot: String,
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())
}

/// Encode un mot pour l'adresse de recherche.
fn encoder(mot: &str) -> String {
    mot.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

/// Les pictos d'ARASAAC pour un mot, en français : quarante au plus, chacun avec son premier mot.
#[tauri::command]
pub async fn arasaac_chercher(mot: String) -> Result<Vec<Trouve>, String> {
    let m = mot.trim();
    if m.is_empty() {
        return Ok(Vec::new());
    }
    let url = format!("https://api.arasaac.org/v1/pictograms/fr/search/{}", encoder(m));
    let reponse = client()?.get(url).send().await.map_err(|e| format!("ARASAAC ne répond pas : {e}"))?;
    if reponse.status().as_u16() == 404 {
        return Ok(Vec::new());
    }
    let liste: serde_json::Value = reponse.json().await.map_err(|e| format!("Réponse d'ARASAAC illisible : {e}"))?;
    Ok(liste
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|p| {
                    let id = p["_id"].as_u64()?;
                    let mot = p["keywords"].as_array().and_then(|k| k.first()).and_then(|k| k["keyword"].as_str()).unwrap_or(m);
                    Some(Trouve { id, mot: mot.to_string() })
                })
                .take(40)
                .collect()
        })
        .unwrap_or_default())
}

/// Prend un picto : téléchargé une fois, gardé ensuite. Rend son adresse `data:`.
#[tauri::command]
pub async fn arasaac_prendre<R: Runtime>(app: AppHandle<R>, id: u64) -> Result<String, String> {
    let chemin = dossier_images(&app)?.join(format!("arasaac-{id}"));
    if let Ok(octets) = std::fs::read(&chemin) {
        return Ok(data_url(&octets));
    }
    let url = format!("https://static.arasaac.org/pictograms/{id}/{id}_300.png");
    let reponse = client()?.get(url).send().await.map_err(|e| format!("ARASAAC ne répond pas : {e}"))?;
    if !reponse.status().is_success() {
        return Err(format!("ARASAAC n'a pas ce picto ({}).", reponse.status()));
    }
    let octets = reponse.bytes().await.map_err(|e| e.to_string())?;
    ecrire_sur(&chemin, &octets)?;
    Ok(data_url(&octets))
}

#[cfg(test)]
mod tests {
    #[test]
    fn un_mot_s_encode_pour_l_adresse() {
        assert_eq!(super::encoder("pomme de terre"), "pomme%20de%20terre");
        assert_eq!(super::encoder("été"), "%C3%A9t%C3%A9");
    }
}
