//! La porte du relais, vue du téléphone : déposer, et lire le retour.
//!
//! Le téléphone entre dans le dossier du relais avec le compte de
//! l'enseignant, par le mot de passe d'application que Nuage lui a remis à la
//! connexion (voir `connexion`). Il parle WebDAV comme toute application de
//! Nextcloud.

use crate::connexion::{autorisation, Connexion};
use crate::{Appairage, DOSSIER_DEPOT, DOSSIER_RETOUR, FICHIER_AGENDA};
use std::time::Duration;

type R<T> = Result<T, String>;

/// Un morceau d'adresse : ce qui n'est ni lettre, ni chiffre, ni « -_.~ » s'écrit « %XX ».
fn segment(texte: &str) -> String {
    texte.bytes().map(|o| {
        if o.is_ascii_alphanumeric() || matches!(o, b'-' | b'_' | b'.' | b'~') { (o as char).to_string() } else { format!("%{o:02X}") }
    }).collect()
}

/// L'adresse d'un fichier du relais : dans le dossier du compte, sur le serveur où vaut la connexion.
pub fn adresse(a: &Appairage, k: &Connexion, dossier: &str, nom: &str) -> String {
    format!("{}/remote.php/dav/files/{}/{}/{dossier}/{nom}", k.serveur.trim_end_matches('/'), segment(&a.compte), segment(&a.dossier))
}

fn client(secondes: u64) -> R<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent("Maitrize-Dictaphone")
        .timeout(Duration::from_secs(secondes))
        .build()
        .map_err(|e| e.to_string())
}

/// Le mot de passe du téléphone a été retiré dans Nuage : la connexion ne vaut plus, il faut la refaire.
pub const ACCES_RETIRE: &str = "Nuage ne reconnaît plus ce téléphone : son accès a pu être retiré. Reconnectez-le à votre compte Nuage.";

fn refus(statut: reqwest::StatusCode) -> String {
    match statut.as_u16() {
        401 => ACCES_RETIRE.into(),
        403 => "Nuage refuse l'accès au dossier du téléphone.".into(),
        404 => "Le dossier du téléphone n'est plus dans votre Nuage : sur l'ordinateur, refaites le lien, puis scannez le nouveau QR code.".into(),
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
pub async fn deposer(a: &Appairage, k: &Connexion, nom: &str, blob: Vec<u8>) -> R<()> {
    let reponse = client(delai_du_depot(blob.len()))?
        .put(adresse(a, k, DOSSIER_DEPOT, nom))
        .header("Authorization", autorisation(k))
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
pub async fn lire_agenda(a: &Appairage, k: &Connexion) -> R<Option<Vec<u8>>> {
    let reponse = client(20)?
        .get(adresse(a, k, DOSSIER_RETOUR, FICHIER_AGENDA))
        .header("Authorization", autorisation(k))
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

/// Le dossier des dépôts répond-il à ce téléphone ? Dit pourquoi sinon.
pub async fn verifier(a: &Appairage, k: &Connexion) -> R<()> {
    let methode = reqwest::Method::from_bytes(b"PROPFIND").map_err(|e| e.to_string())?;
    let reponse = client(10)?
        .request(methode, adresse(a, k, DOSSIER_DEPOT, ""))
        .header("Authorization", autorisation(k))
        .header("Depth", "0")
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    if reponse.status().is_success() { Ok(()) } else { Err(refus(reponse.status())) }
}

/// Nuage répond-il, et le téléphone y entre-t-il toujours ? Une question, pas de dépôt.
pub async fn joignable(a: &Appairage, k: &Connexion) -> bool {
    verifier(a, k).await.is_ok()
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
    fn l_adresse_d_un_fichier_est_dans_le_dossier_du_compte() {
        let a = Appairage {
            serveur: "https://nuage03.apps.education.fr".into(),
            compte: "clement.titet".into(),
            dossier: "Maitrize-Telephone".into(),
            cle_depot: String::new(),
            cle_retour: String::new(),
        };
        let k = Connexion { serveur: "https://nuage03.apps.education.fr/".into(), identifiant: "clement.titet".into(), mot_de_passe: "x".into() };
        assert_eq!(adresse(&a, &k, DOSSIER_DEPOT, "v-1.mtz"), "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/Maitrize-Telephone/depot/v-1.mtz");
        assert_eq!(adresse(&a, &k, DOSSIER_RETOUR, FICHIER_AGENDA), "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/Maitrize-Telephone/retour/agenda.mtz");
        // Un compte qui porte une adresse électronique reste un seul morceau de chemin.
        let courriel = Appairage { compte: "c.titet@ac-versailles.fr".into(), ..a };
        assert!(adresse(&courriel, &k, DOSSIER_DEPOT, "").contains("/files/c.titet%40ac-versailles.fr/Maitrize-Telephone/depot/"));
    }
}
