//! Se connecter au compte Nuage, depuis le téléphone.
//!
//! Le dossier du relais n'est ouvert qu'au compte de l'enseignant. Le
//! téléphone ne reçoit donc aucun mot de passe de l'ordinateur : il en
//! demande un à Nuage, par le chemin que suivent les applications de
//! Nextcloud (« Login Flow v2 ») :
//!
//!   1. il demande une page de connexion (`commencer`) ;
//!   2. l'enseignant s'y connecte avec son compte académique, et accepte que
//!      le Dictaphone accède à son Nuage ;
//!   3. pendant ce temps, le téléphone demande toutes les deux secondes si
//!      c'est fait (`interroger`) : Nuage lui remet alors un mot de passe
//!      d'application, à lui seul.
//!
//! Ce mot de passe ne s'affiche nulle part. Il figure dans Nuage ›
//! Paramètres › Sécurité › « Appareils et sessions », sous le nom du
//! Dictaphone : c'est de là qu'on le retire, ou du téléphone (`revoquer`).

use crate::Appairage;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::time::Duration;

type R<T> = Result<T, String>;

/// Le nom sous lequel le téléphone figure dans « Appareils et sessions » :
/// Nuage le tire de l'en-tête User-Agent de la demande de connexion.
pub const NOM_DE_L_APPAREIL: &str = "Maitrize Dictaphone (iPhone)";

/// Une connexion en cours : la page à ouvrir, et de quoi demander si c'est fait.
#[derive(Clone, Debug, PartialEq)]
pub struct Demande {
    /// La page de connexion de Nuage, à ouvrir dans le navigateur.
    pub page: String,
    /// L'adresse où demander si c'est fait, et le jeton qui désigne cette connexion-ci.
    pub attente: String,
    pub jeton: String,
}

/// Ce que le téléphone garde de sa connexion : un mot de passe d'application, à lui seul.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Connexion {
    /// Le serveur où ce mot de passe vaut, sans barre finale.
    pub serveur: String,
    /// L'identifiant de connexion, et le mot de passe d'application que Nuage a remis.
    pub identifiant: String,
    pub mot_de_passe: String,
}

pub(crate) fn autorisation(k: &Connexion) -> String {
    format!("Basic {}", STANDARD.encode(format!("{}:{}", k.identifiant, k.mot_de_passe)))
}

fn client(secondes: u64) -> R<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(NOM_DE_L_APPAREIL)
        .timeout(Duration::from_secs(secondes))
        // Suivie par le client, une redirection changerait la demande de
        // connexion en simple lecture : on la suit soi-même (voir `commencer`).
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())
}

/// « https:// » ou « http:// » : une réponse ne doit pas faire passer en clair ce qui ne l'était pas.
fn schema(adresse: &str) -> &str {
    if adresse.starts_with("https://") { "https://" } else { "http://" }
}

/// Une adresse de redirection, rendue complète : Nuage peut n'en donner que le chemin.
fn adresse_complete(depuis: &str, location: &str) -> String {
    if location.starts_with("http://") || location.starts_with("https://") {
        return location.to_string();
    }
    let sans_schema = &depuis[schema(depuis).len()..];
    let hote = sans_schema.split('/').next().unwrap_or(sans_schema);
    format!("{}{hote}/{}", schema(depuis), location.trim_start_matches('/'))
}

/// Ce que Nuage répond à la demande de connexion : la page, et où attendre.
pub fn lire_demande(json: &str) -> R<Demande> {
    let refus = || "Nuage n'a pas proposé de page de connexion.".to_string();
    let v: serde_json::Value = serde_json::from_str(json).map_err(|_| refus())?;
    let texte = |valeur: &serde_json::Value| valeur.as_str().unwrap_or_default().to_string();
    let d = Demande { page: texte(&v["login"]), attente: texte(&v["poll"]["endpoint"]), jeton: texte(&v["poll"]["token"]) };
    if d.page.is_empty() || d.attente.is_empty() || d.jeton.is_empty() {
        return Err(refus());
    }
    Ok(d)
}

/**
 * Demande à Nuage une page de connexion pour le téléphone.
 *
 * Les serveurs de l'Éducation nationale renvoient la demande vers leur porte
 * d'entrée commune (« nuage03 » vers « nuage.apps.education.fr ») : on la
 * refait là où l'on est renvoyé, quelques fois au plus.
 */
pub async fn commencer(serveur: &str) -> R<Demande> {
    crate::adresse_chiffree(serveur)?;
    let client = client(20)?;
    let mut adresse = format!("{}/index.php/login/v2", serveur.trim_end_matches('/'));
    for _ in 0..4 {
        let reponse = client.post(&adresse).send().await.map_err(|_| "Nuage ne répond pas.".to_string())?;
        let statut = reponse.status();
        if statut.is_redirection() {
            let suite = reponse.headers().get("location").and_then(|v| v.to_str().ok()).unwrap_or_default();
            if suite.is_empty() {
                break;
            }
            adresse = adresse_complete(&adresse, suite);
            if !adresse.starts_with(schema(serveur)) {
                return Err("Nuage renvoie la connexion vers une adresse non chiffrée : elle est refusée.".into());
            }
            continue;
        }
        if !statut.is_success() {
            return Err(format!("Nuage refuse d'ouvrir une connexion ({statut})."));
        }
        let d = lire_demande(&reponse.text().await.map_err(|e| e.to_string())?)?;
        if !d.page.starts_with(schema(serveur)) || !d.attente.starts_with(schema(serveur)) {
            return Err("Nuage propose une connexion non chiffrée : elle est refusée.".into());
        }
        return Ok(d);
    }
    Err("Nuage renvoie la demande de connexion de porte en porte.".into())
}

/// Ce que Nuage remet quand la connexion est acceptée.
pub fn lire_connexion(json: &str) -> R<Connexion> {
    let refus = || "Nuage a répondu sans mot de passe d'application.".to_string();
    let v: serde_json::Value = serde_json::from_str(json).map_err(|_| refus())?;
    let texte = |cle: &str| v[cle].as_str().unwrap_or_default().trim().to_string();
    let k = Connexion { serveur: texte("server").trim_end_matches('/').to_string(), identifiant: texte("loginName"), mot_de_passe: texte("appPassword") };
    if k.serveur.is_empty() || k.identifiant.is_empty() || k.mot_de_passe.is_empty() {
        return Err(refus());
    }
    Ok(k)
}

/// La connexion est-elle faite ? `None` tant que l'enseignant ne l'a pas acceptée.
pub async fn interroger(d: &Demande) -> R<Option<Connexion>> {
    crate::adresse_chiffree(&d.attente)?;
    let reponse = client(15)?
        .post(&d.attente)
        .form(&[("token", d.jeton.as_str())])
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    match reponse.status().as_u16() {
        200 => lire_connexion(&reponse.text().await.map_err(|e| e.to_string())?).map(Some),
        // Rien encore : la page attend qu'on s'y connecte.
        404 => Ok(None),
        s => Err(format!("Nuage a répondu {s} pendant la connexion.")),
    }
}

/// L'identifiant du compte dans une réponse de Nuage sur l'utilisateur connecté.
pub fn lire_compte(json: &str) -> R<String> {
    let v: serde_json::Value = serde_json::from_str(json).map_err(|_| "Réponse de Nuage illisible.".to_string())?;
    match v["ocs"]["data"]["id"].as_str().map(str::trim) {
        Some(id) if !id.is_empty() => Ok(id.to_string()),
        _ => Err("Nuage n'a pas dit à quel compte ce téléphone est connecté.".into()),
    }
}

/// Le compte auquel cette connexion ouvre, tel que Nuage le nomme dans ses adresses.
pub async fn compte(k: &Connexion) -> R<String> {
    crate::adresse_chiffree(&k.serveur)?;
    let reponse = client(20)?
        .get(format!("{}/ocs/v2.php/cloud/user?format=json", k.serveur))
        .header("Authorization", autorisation(k))
        .header("OCS-APIRequest", "true")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    if !reponse.status().is_success() {
        return Err(format!("Nuage ne reconnaît pas ce téléphone ({}).", reponse.status()));
    }
    lire_compte(&reponse.text().await.map_err(|e| e.to_string())?)
}

/// Deux noms du même compte ? Nuage ne distingue pas les majuscules à la connexion.
pub fn meme_compte(a: &str, b: &str) -> bool {
    !a.trim().is_empty() && a.trim().eq_ignore_ascii_case(b.trim())
}

/**
 * Vérifie une connexion que Nuage vient de remettre, avant de la garder.
 *
 * Elle doit ouvrir le compte qui porte le dossier — un autre compte ne
 * mènerait nulle part — et le dossier doit lui répondre. Une connexion qui ne
 * convient pas est retirée aussitôt : on ne laisse pas traîner dans Nuage un
 * accès qui ne sert à rien.
 *
 * Le serveur qui remet le mot de passe n'est pas toujours celui du QR code :
 * la porte d'entrée commune de l'Éducation nationale renvoie chacun vers son
 * serveur. On essaie l'un, puis l'autre.
 */
pub async fn valider(a: &Appairage, k: Connexion) -> R<Connexion> {
    let du_code = Connexion { serveur: a.serveur.trim_end_matches('/').to_string(), ..k.clone() };
    // Nuage ne remet pas d'adresse en clair ; si cela arrivait, le mot de
    // passe ne partirait pas vers elle — pas même pour le retirer.
    let k = if k.serveur.starts_with(schema(&a.serveur)) { k } else { du_code.clone() };
    let mut essais = vec![k.clone()];
    if du_code.serveur != k.serveur {
        essais.push(du_code.clone());
    }
    let mut refus = "Nuage ne répond pas.".to_string();
    for essai in essais {
        match compte(&essai).await {
            Ok(nom) if !meme_compte(&nom, &a.compte) => {
                retirer(&k, &du_code).await;
                return Err(format!(
                    "Vous vous êtes connecté au compte « {nom} », mais le dossier du téléphone est dans le compte « {} » : \
                     reconnectez-vous avec celui-ci.",
                    a.compte
                ));
            }
            Ok(_) => match crate::porte::verifier(a, &essai).await {
                Ok(()) => return Ok(essai),
                Err(e) => refus = e,
            },
            Err(e) => refus = e,
        }
    }
    retirer(&k, &du_code).await;
    Err(refus)
}

/// Retire un mot de passe qu'on ne garde pas, là où Nuage l'a remis — ou, à défaut, au serveur du QR code.
async fn retirer(k: &Connexion, du_code: &Connexion) {
    if revoquer(k).await.is_err() {
        let _ = revoquer(du_code).await;
    }
}

/// Retire au téléphone son mot de passe d'application : il n'entre plus dans Nuage.
pub async fn revoquer(k: &Connexion) -> R<()> {
    crate::adresse_chiffree(&k.serveur)?;
    let reponse = client(20)?
        .delete(format!("{}/ocs/v2.php/core/apppassword", k.serveur))
        .header("Authorization", autorisation(k))
        .header("OCS-APIRequest", "true")
        .send()
        .await
        .map_err(|_| "Nuage ne répond pas.".to_string())?;
    // Déjà retiré depuis Nuage : c'est ce qu'on voulait.
    match reponse.status().as_u16() {
        s if (200..300).contains(&s) || s == 401 => Ok(()),
        s => Err(format!("Nuage a répondu {s} : retirez l'accès du Dictaphone dans Nuage › Paramètres › Sécurité.")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn la_demande_de_connexion_se_lit() {
        let d = lire_demande(r#"{"poll":{"token":"jeton-128","endpoint":"https://nuage.apps.education.fr/index.php/login/v2/poll"},"login":"https://nuage.apps.education.fr/index.php/login/v2/flow/abc"}"#).unwrap();
        assert_eq!(d.page, "https://nuage.apps.education.fr/index.php/login/v2/flow/abc");
        assert_eq!(d.attente, "https://nuage.apps.education.fr/index.php/login/v2/poll");
        assert_eq!(d.jeton, "jeton-128");
        assert!(lire_demande("<html>Maintenance</html>").is_err());
        assert!(lire_demande(r#"{"login":"https://x/flow"}"#).is_err());
    }

    #[test]
    fn la_connexion_acceptee_donne_un_mot_de_passe_a_soi() {
        let k = lire_connexion(r#"{"server":"https://nuage03.apps.education.fr/","loginName":"clement.titet","appPassword":"aBc-123"}"#).unwrap();
        assert_eq!(k, Connexion { serveur: "https://nuage03.apps.education.fr".into(), identifiant: "clement.titet".into(), mot_de_passe: "aBc-123".into() });
        assert!(lire_connexion(r#"{"server":"https://x","loginName":"a"}"#).is_err());
        assert_eq!(autorisation(&k), format!("Basic {}", STANDARD.encode("clement.titet:aBc-123")));
    }

    #[test]
    fn le_compte_se_reconnait_sans_regarder_aux_majuscules() {
        assert_eq!(lire_compte(r#"{"ocs":{"meta":{"status":"ok"},"data":{"id":"clement.titet","display-name":"Clément"}}}"#).unwrap(), "clement.titet");
        assert!(lire_compte(r#"{"ocs":{"data":[]}}"#).is_err());
        assert!(meme_compte("Clement.Titet", " clement.titet "));
        assert!(!meme_compte("clement.titet", "nour.ben"));
        assert!(!meme_compte("", ""));
    }

    #[test]
    fn une_redirection_garde_son_serveur_et_son_chiffrement() {
        assert_eq!(adresse_complete("https://nuage03.apps.education.fr/index.php/login/v2", "https://nuage.apps.education.fr/index.php/login/v2"),
            "https://nuage.apps.education.fr/index.php/login/v2");
        assert_eq!(adresse_complete("https://nuage03.apps.education.fr/index.php/login/v2", "/index.php/login/v2"),
            "https://nuage03.apps.education.fr/index.php/login/v2");
        assert_eq!(schema("http://127.0.0.1:8080"), "http://");
    }
}
