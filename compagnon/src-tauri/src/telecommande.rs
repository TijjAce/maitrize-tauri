//! La télécommande, côté téléphone : l'enseignant parle, et l'ordinateur — projeté au tableau — affiche.
//!
//! Le format, et ce qui protège quoi, sont dans `relais::telecommande`. Le téléphone lit dans le relais où joindre
//! l'ordinateur — rien à scanner —, puis lui envoie chaque phrase en direct, scellée pour lui, sur le réseau de la
//! classe. Il ne garde de la séance que son lien : l'adresse, le jeton, les clés. Le son d'une phrase part scellé et
//! ne s'écrit nulle part ici.

use crate::commandes::{oublier_si_retire, relais_et_connexion};
use maitrize_relais as relais;
use relais::telecommande::{Demande, Genre, Ouverture, Reponse};
use std::sync::{Mutex, PoisonError};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

type R<T> = Result<T, String>;

const PAS_OUVERTE: &str = "La télécommande n'est pas ouverte sur l'ordinateur : Réglages › Téléphone › « Ouvrir la télécommande ».";
const INJOIGNABLE: &str = "L'ordinateur ne répond pas sur ce réseau : mettez l'iPhone et le Mac sur le même WiFi, ou le Mac sur le partage de connexion de l'iPhone.";

/// Où joindre l'ordinateur pour cette séance, et de quoi sceller et lire.
#[derive(Clone)]
struct Lien {
    origine: String,
    jeton: String,
    cle_depot: [u8; 32],
    cle_retour: [u8; 32],
}

static LIEN: Mutex<Option<Lien>> = Mutex::new(None);
static NUMERO: Mutex<u64> = Mutex::new(0);

/// Le numéro de la demande suivante : toujours plus grand, même après un redémarrage du téléphone — il part de
/// l'heure —, car l'ordinateur refuse ce qui n'avance pas.
fn prochain_numero() -> u64 {
    let maintenant = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    let mut n = NUMERO.lock().unwrap_or_else(PoisonError::into_inner);
    *n = (*n).max(maintenant) + 1;
    *n
}

fn lien() -> R<Lien> {
    LIEN.lock().unwrap_or_else(PoisonError::into_inner).clone().ok_or_else(|| "La télécommande n'est pas reliée.".to_string())
}

async fn envoyer(lien: &Lien, mut d: Demande, delai: Duration) -> R<Reponse> {
    d.jeton = lien.jeton.clone();
    d.numero = prochain_numero();
    let blob = relais::telecommande::sceller(&lien.cle_depot, &d)?;
    let client = reqwest::Client::builder().timeout(delai).build().map_err(|e| e.to_string())?;
    let reponse = client
        .post(format!("{}/telecommande", lien.origine))
        .header("Content-Type", "application/octet-stream")
        .body(blob)
        .send()
        .await
        .map_err(|_| INJOIGNABLE.to_string())?;
    match reponse.status().as_u16() {
        200 => {
            let corps = reponse.bytes().await.map_err(|_| INJOIGNABLE.to_string())?;
            relais::telecommande::dechiffrer(&lien.cle_retour, &corps)
        }
        403 => Err("L'ordinateur ne reconnaît plus cette séance : reliez de nouveau la télécommande.".into()),
        413 => Err("Phrase trop longue.".into()),
        code => Err(format!("L'ordinateur a refusé la demande ({code}).")),
    }
}

/// Relie la télécommande : lit dans le relais où joindre l'ordinateur, puis le cherche sur le réseau local.
#[tauri::command]
pub async fn telecommande_relier(app: tauri::AppHandle) -> R<Reponse> {
    let (a, k) = relais_et_connexion(&app)?;
    let blob = oublier_si_retire(relais::porte::lire_telecommande(&a, &k).await)?.ok_or(PAS_OUVERTE)?;
    let cle_retour = relais::cle_de(&a.cle_retour)?;
    let cle_depot = relais::cle_de(&a.cle_depot)?;
    let ouverture: Ouverture = relais::telecommande::dechiffrer(&cle_retour, &blob)?;
    for origine in ouverture.adresses.iter().filter(|o| relais::telecommande::adresse_du_reseau_local(o)) {
        let lien = Lien { origine: origine.trim_end_matches('/').to_string(), jeton: ouverture.jeton.clone(), cle_depot, cle_retour };
        if let Ok(r) = envoyer(&lien, Demande::default(), Duration::from_secs(4)).await {
            *LIEN.lock().unwrap_or_else(PoisonError::into_inner) = Some(lien);
            return Ok(r);
        }
    }
    Err(INJOIGNABLE.into())
}

/// Une phrase dite : WAV 16 kHz mono, en base64. L'ordinateur la transcrit, la comprend et agit.
#[tauri::command]
pub async fn telecommande_parler(audio_b64: String) -> R<Reponse> {
    // Transcrire puis agir prend quelques secondes ; la première phrase charge le modèle de l'ordinateur.
    envoyer(&lien()?, Demande { genre: Genre::Parole, audio: audio_b64, ..Default::default() }, Duration::from_secs(45)).await
}

/// Une phrase écrite, quand on ne peut pas parler.
#[tauri::command]
pub async fn telecommande_ecrire(texte: String) -> R<Reponse> {
    envoyer(&lien()?, Demande { genre: Genre::Texte, texte, ..Default::default() }, Duration::from_secs(20)).await
}

/// Oui, ou non, à la question de l'ordinateur — « Noter pour … ? ».
#[tauri::command]
pub async fn telecommande_decider(id: String, oui: bool) -> R<Reponse> {
    let genre = if oui { Genre::Confirmer } else { Genre::Annuler };
    envoyer(&lien()?, Demande { genre, id, ..Default::default() }, Duration::from_secs(20)).await
}

/// Ce que l'ordinateur comprend, pour « Que dire ? » : des phrases à dire, et ses pages par leur nom.
#[tauri::command]
pub async fn telecommande_aide() -> R<Reponse> {
    envoyer(&lien()?, Demande { genre: Genre::Aide, ..Default::default() }, Duration::from_secs(10)).await
}

/// Oublie la séance : il faudra la relier de nouveau.
#[tauri::command]
pub fn telecommande_delier() {
    *LIEN.lock().unwrap_or_else(PoisonError::into_inner) = None;
}

/// La télécommande est-elle reliée ?
#[tauri::command]
pub fn telecommande_reliee() -> bool {
    LIEN.lock().unwrap_or_else(PoisonError::into_inner).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn les_numeros_avancent_toujours() {
        let a = prochain_numero();
        let b = prochain_numero();
        assert!(b > a);
        let maintenant = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        assert!(a >= maintenant - 1000, "ils partent de l'heure : un téléphone redémarré ne repart pas de zéro");
    }
}
