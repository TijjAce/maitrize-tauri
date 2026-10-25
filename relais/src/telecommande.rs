//! La télécommande : l'enseignant parle à son téléphone, et l'ordinateur — projeté au tableau — affiche.
//!
//! Ils se trouvent par le relais. À l'ouverture, l'ordinateur y laisse où le joindre sur le réseau local, et le
//! jeton de la séance, chiffrés avec la clé du retour (`FICHIER`) : seul le téléphone appairé les lit, et aucun
//! QR code ne s'affiche — il serait projeté avec le reste. Ensuite, ils se parlent en direct, sur le WiFi de la
//! classe ou le partage de connexion du téléphone. Chaque demande est scellée pour l'ordinateur : la voix et les
//! prénoms ne passent jamais en clair, même sur le WiFi de l'école. Chaque réponse est chiffrée avec la clé du
//! retour. Rien de plus sur l'iPhone : les mêmes `sceller` et `dechiffrer_retour` que le dictaphone.

use serde::{de::DeserializeOwned, Deserialize, Serialize};

type R<T> = Result<T, String>;

/// Dans le retour : la télécommande ouverte sur l'ordinateur.
pub const FICHIER: &str = "telecommande.mtz";

/// Ce que l'ordinateur laisse dans le relais en ouvrant la télécommande.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Ouverture {
    /// Où le joindre sur le réseau local : « http://192.168.1.20:8788 », puis par son nom.
    pub adresses: Vec<String>,
    /// Le jeton de la séance : un autre ne passe pas.
    pub jeton: String,
    /// Quand elle s'est ouverte (ISO 8601).
    pub ouverte: String,
    /// Le nom de l'ordinateur, pour le dire sur le téléphone.
    #[serde(default)]
    pub nom: String,
}

/// Ce que le téléphone demande.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum Genre {
    /// L'ordinateur est-il là ?
    #[default]
    Bonjour,
    /// Une phrase dite : `audio` en porte le son.
    Parole,
    /// Une phrase écrite : `texte`.
    Texte,
    /// Oui à la question posée (`id`).
    Confirmer,
    /// Non à la question posée (`id`).
    Annuler,
}

/// Une demande du téléphone, scellée pour l'ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Demande {
    pub jeton: String,
    /// Croît à chaque demande de la séance : une demande rejouée — relevée sur le réseau, renvoyée — ne passe pas.
    pub numero: u64,
    pub genre: Genre,
    /// Le son, en WAV 16 kHz mono, en base64.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub audio: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub texte: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub id: String,
}

/// Ce que l'ordinateur répond.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Reponse {
    pub ok: bool,
    /// Ce que l'ordinateur a entendu.
    #[serde(default)]
    pub entendu: String,
    /// Ce qu'il a fait, ou pourquoi il n'a rien fait.
    #[serde(default)]
    pub fait: String,
    /// La question à poser avant d'écrire — « Noter pour … ? » — ; vide sinon.
    #[serde(default)]
    pub a_confirmer: String,
    /// La demande en attente de cette réponse.
    #[serde(default)]
    pub id: String,
}

/// Une adresse du réseau local, et rien d'autre : la télécommande ne parle jamais qu'à un ordinateur de la classe
/// (10.x, 172.16-31.x, 192.168.x, 169.254.x, ou un nom en « .local »). Ce qu'elle envoie est scellé ; on refuse
/// quand même de l'envoyer ailleurs.
pub fn adresse_du_reseau_local(adresse: &str) -> bool {
    let Some(reste) = adresse.strip_prefix("http://") else { return false };
    let hote = reste.split(['/', '?']).next().unwrap_or("").rsplit_once(':').map_or(reste, |(h, _)| h);
    if let Ok(ip) = hote.parse::<std::net::Ipv4Addr>() {
        return ip.is_private() || ip.is_link_local();
    }
    hote.ends_with(".local") && hote.len() > ".local".len() && hote.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.')
}

/// Chiffre ce que l'ordinateur laisse ou répond au téléphone, avec la clé du retour.
#[cfg(not(target_os = "ios"))]
pub fn chiffrer<T: Serialize>(cle_retour: &[u8; 32], v: &T) -> R<Vec<u8>> {
    crate::chiffrer_retour(cle_retour, &serde_json::to_vec(v).map_err(|e| e.to_string())?)
}

/// Relit, sur le téléphone, ce que l'ordinateur a laissé ou répondu.
pub fn dechiffrer<T: DeserializeOwned>(cle_retour: &[u8; 32], blob: &[u8]) -> R<T> {
    let clair = crate::dechiffrer_retour(cle_retour, blob)?;
    serde_json::from_slice(&clair).map_err(|_| "Réponse de l'ordinateur illisible : mettez les deux applications à jour.".to_string())
}

/// Scelle une demande pour l'ordinateur (sa clé publique, celle des dépôts).
pub fn sceller(cle_depot: &[u8; 32], d: &Demande) -> R<Vec<u8>> {
    crate::sceller(cle_depot, &serde_json::to_vec(d).map_err(|e| e.to_string())?)
}

/// Rouvre, sur l'ordinateur, une demande du téléphone.
#[cfg(not(target_os = "ios"))]
pub fn ouvrir(privee: &[u8; 32], blob: &[u8]) -> R<Demande> {
    let clair = crate::desceller(privee, blob)?;
    serde_json::from_slice(&clair).map_err(|_| "Demande du téléphone illisible.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn l_ouverture_la_demande_et_la_reponse_font_l_aller_retour() {
        let (privee, publique) = crate::nouvelle_paire();
        let cle_retour = crate::nouvelle_cle();
        let ouverture = Ouverture {
            adresses: vec!["http://192.168.1.20:8788".into()], jeton: "j-1".into(), ouverte: "2026-10-25T16:40:00".into(), nom: "Mac de la classe".into(),
        };
        let blob = chiffrer(&cle_retour, &ouverture).unwrap();
        assert_eq!(dechiffrer::<Ouverture>(&cle_retour, &blob).unwrap(), ouverture);
        assert!(dechiffrer::<Ouverture>(&crate::nouvelle_cle(), &blob).is_err(), "une autre clé ne lit rien");

        let demande = Demande { jeton: "j-1".into(), numero: 3, genre: Genre::Parole, audio: "UklGRg==".into(), ..Default::default() };
        let scelle = sceller(&publique, &demande).unwrap();
        assert!(!String::from_utf8_lossy(&scelle).contains("UklGRg"), "le son ne passe pas en clair");
        assert_eq!(ouvrir(&privee, &scelle).unwrap(), demande);
        assert!(ouvrir(&crate::nouvelle_paire().0, &scelle).is_err());

        let reponse = Reponse { ok: true, entendu: "minuteur dix minutes".into(), fait: "Minuteur de 10 minutes lancé.".into(), ..Default::default() };
        assert_eq!(dechiffrer::<Reponse>(&cle_retour, &chiffrer(&cle_retour, &reponse).unwrap()).unwrap(), reponse);
    }

    #[test]
    fn la_telecommande_ne_parle_qu_au_reseau_local() {
        for bonne in ["http://192.168.1.20:8788", "http://10.0.0.5:8788/", "http://172.20.10.3:8788", "http://Mac-de-la-classe.local:8788"] {
            assert!(adresse_du_reseau_local(bonne), "{bonne}");
        }
        for mauvaise in ["https://192.168.1.20:8788", "http://93.184.216.34:8788", "http://exemple.fr:8788", "http://.local:8788", "http://172.32.0.1:8788", "ftp://10.0.0.1"] {
            assert!(!adresse_du_reseau_local(mauvaise), "{mauvaise}");
        }
    }

    #[test]
    fn une_demande_se_lit_meme_sans_ses_champs_vides() {
        let d: Demande = serde_json::from_str(r#"{"jeton":"j","numero":1,"genre":"confirmer","id":"q1"}"#).unwrap();
        assert_eq!((d.genre, d.id.as_str(), d.audio.as_str()), (Genre::Confirmer, "q1", ""));
        assert_eq!(serde_json::to_string(&Demande { jeton: "j".into(), numero: 2, ..Default::default() }).unwrap(),
            r#"{"jeton":"j","numero":2,"genre":"bonjour"}"#);
    }
}
