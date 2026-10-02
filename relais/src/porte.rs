//! La porte du relais, vue du téléphone : déposer, et lire le retour.
//!
//! Le téléphone n'a qu'un lien de partage vers le dossier du relais. Il parle
//! WebDAV comme Nuage l'attend d'un lien : le jeton pour identifiant, le mot
//! de passe du lien s'il en a un.

use crate::{Appairage, DOSSIER_DEPOT, DOSSIER_RETOUR, FICHIER_AGENDA};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::time::Duration;

type R<T> = Result<T, String>;

fn autorisation(a: &Appairage) -> String {
    format!("Basic {}", STANDARD.encode(format!("{}:{}", a.jeton, a.mot_de_passe)))
}

/// L'adresse d'un fichier du relais.
pub fn adresse(a: &Appairage, dossier: &str, nom: &str) -> String {
    format!("{}/{}/{dossier}/{nom}", a.serveur.trim_end_matches('/'), a.base.trim_matches('/'))
}

fn client(secondes: u64) -> R<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent("Maitrize-Dictaphone")
        .timeout(Duration::from_secs(secondes))
        .build()
        .map_err(|e| e.to_string())
}

fn refus(statut: reqwest::StatusCode) -> String {
    match statut.as_u16() {
        // Le lien a été supprimé dans Nuage, a expiré, ou son mot de passe a changé.
        401 | 403 | 404 => "Nuage refuse ce relais : le lien a peut-être été supprimé ou a expiré. Reliez à nouveau le téléphone depuis l'ordinateur.".into(),
        507 => "L'espace de stockage de Nuage est plein.".into(),
        _ => format!("Nuage a répondu {statut}."),
    }
}

/// Le temps laissé à un dépôt, selon son poids : une minute, plus ce qu'il
/// faut à un réseau lent — quarante kilo-octets par seconde — pour le porter.
/// Une longue dictée par la 4G d'une cour d'école ne doit pas échouer à
/// chaque fois au même endroit.
pub fn delai_du_depot(octets: usize) -> u64 {
    (60 + octets as u64 / 40_000).min(3600)
}

/// Dépose un fichier scellé dans le dossier des dépôts.
pub async fn deposer(a: &Appairage, nom: &str, blob: Vec<u8>) -> R<()> {
    let reponse = client(delai_du_depot(blob.len()))?
        .put(adresse(a, DOSSIER_DEPOT, nom))
        .header("Authorization", autorisation(a))
        // Nuage l'exige pour tout ce qui n'est pas une lecture sur un lien public.
        .header("X-Requested-With", "XMLHttpRequest")
        .header("Content-Type", "application/octet-stream")
        .body(blob)
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    if !reponse.status().is_success() {
        return Err(refus(reponse.status()));
    }
    Ok(())
}

/// L'agenda chiffré que l'ordinateur a laissé, ou rien s'il n'en a pas encore publié.
pub async fn lire_agenda(a: &Appairage) -> R<Option<Vec<u8>>> {
    let reponse = client(20)?
        .get(adresse(a, DOSSIER_RETOUR, FICHIER_AGENDA))
        .header("Authorization", autorisation(a))
        .header("X-Requested-With", "XMLHttpRequest")
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    if reponse.status().as_u16() == 404 {
        return Ok(None);
    }
    if !reponse.status().is_success() {
        return Err(refus(reponse.status()));
    }
    reponse.bytes().await.map(|b| Some(b.to_vec())).map_err(|e| format!("Lecture interrompue : {e}"))
}

/// Nuage répond-il, et le lien vaut-il toujours ? Une question, pas de dépôt.
pub async fn joignable(a: &Appairage) -> bool {
    let Ok(client) = client(6) else { return false };
    let Ok(methode) = reqwest::Method::from_bytes(b"PROPFIND") else { return false };
    client
        .request(methode, adresse(a, DOSSIER_DEPOT, ""))
        .header("Authorization", autorisation(a))
        .header("X-Requested-With", "XMLHttpRequest")
        .header("Depth", "0")
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn un_gros_depot_a_le_temps_d_arriver() {
        // Une note : une minute suffit largement.
        assert_eq!(delai_du_depot(200), 60);
        // Trois minutes de dictée, six mégaoctets : trois minutes et demie.
        assert_eq!(delai_du_depot(6_000_000), 210);
        // Une heure de réunion : le temps qu'il faut, sans attendre indéfiniment.
        assert_eq!(delai_du_depot(115_000_000), 2935);
        assert_eq!(delai_du_depot(usize::MAX / 2), 3600);
    }

    #[test]
    fn l_adresse_d_un_fichier_suit_le_lien() {
        let a = Appairage {
            serveur: "https://nuage03.apps.education.fr/".into(),
            base: "/public.php/dav/files/aBcD1234/".into(),
            jeton: "aBcD1234".into(),
            mot_de_passe: String::new(),
            cle_depot: String::new(),
            cle_retour: String::new(),
        };
        assert_eq!(adresse(&a, DOSSIER_DEPOT, "v-1.mtz"), "https://nuage03.apps.education.fr/public.php/dav/files/aBcD1234/depot/v-1.mtz");
        assert_eq!(adresse(&a, DOSSIER_RETOUR, FICHIER_AGENDA), "https://nuage03.apps.education.fr/public.php/dav/files/aBcD1234/retour/agenda.mtz");
    }
}
