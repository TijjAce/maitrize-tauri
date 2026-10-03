//! Le relais du téléphone.
//!
//! Le dictaphone et l'ordinateur ne sont presque jamais allumés ensemble sur
//! le même WiFi : on dicte en classe, l'ordinateur fermé dans le sac. Ils se
//! parlent donc par un dossier de Nuage, que chacun visite quand il a du
//! réseau — le téléphone y dépose, l'ordinateur y relève.
//!
//! Le dossier n'est ouvert qu'au compte Nuage de l'enseignant : aucun lien de
//! partage, aucun mot de passe qui circulerait. Le téléphone s'y connecte
//! lui-même, avec ce compte (voir `connexion`), et Nuage lui donne un mot de
//! passe d'application à lui, qu'on retire depuis Nuage quand on veut.
//!
//! Ce qui s'y pose est illisible pour Nuage, et pour le téléphone lui-même :
//!
//!   - un **dépôt** (dictée, note, page scannée) est scellé pour l'ordinateur,
//!     avec sa clé publique. Seule la clé privée, qui ne quitte pas
//!     l'ordinateur, le rouvre : un téléphone perdu ne relit pas ce qu'il a
//!     déposé, et Nuage ne garde que des fichiers fermés ;
//!   - le **retour** (l'emploi du temps des jours à venir, sans personne
//!     dedans) est chiffré avec une clé que le téléphone reçoit à l'appairage.
//!
//! Cette bibliothèque est commune aux deux applications : le format ne peut
//! pas diverger entre celui qui écrit et celui qui lit.

use base64::{engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}, Engine as _};
use chacha20poly1305::{aead::{Aead, KeyInit, Payload}, Key, XChaCha20Poly1305, XNonce};
use hkdf::Hkdf;
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

pub mod connexion;
pub mod porte;

type R<T> = Result<T, String>;

/// Dans le dossier partagé : ce que le téléphone dépose, ce que l'ordinateur lui laisse.
pub const DOSSIER_DEPOT: &str = "depot";
pub const DOSSIER_RETOUR: &str = "retour";
/// L'emploi du temps des jours à venir, pour le téléphone.
pub const FICHIER_AGENDA: &str = "agenda.mtz";
/// Ce par quoi commence un code d'appairage : un QR code quelconque ne passe pas pour un relais.
pub const PREFIXE_CODE: &str = "maitrize-relais:";

const MARQUE_DEPOT: &[u8; 4] = b"MTZ1";
const MARQUE_RETOUR: &[u8; 4] = b"MTZR";
const CONTEXTE_DEPOT: &[u8] = b"maitrize-relais-depot-v1";

// ── L'appairage ────────────────────────────────────────────────────────────

/// Ce que le téléphone reçoit en scannant le QR code de l'ordinateur.
///
/// Où est le dossier du relais, et dans quel compte ; la clé publique pour
/// sceller les dépôts, et la clé du retour. Aucun mot de passe : le dossier
/// n'est ouvert qu'à ce compte, et le téléphone doit s'y connecter lui-même
/// (voir `connexion`). Un QR code photographié par-dessus l'épaule n'ouvre
/// rien.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Appairage {
    /// L'adresse de Nuage, sans barre finale : « https://nuage03.apps.education.fr ».
    pub serveur: String,
    /// Le compte qui porte le dossier, tel que Nuage le nomme : le seul qui y entre.
    pub compte: String,
    /// Le dossier du relais dans ce compte : « Maitrize-Telephone ».
    pub dossier: String,
    /// La clé publique de l'ordinateur (X25519, base64) : on scelle pour elle.
    pub cle_depot: String,
    /// La clé du retour (32 octets, base64).
    pub cle_retour: String,
}

/// La version du code d'appairage : un téléphone d'une version plus ancienne le refuse proprement.
const VERSION_CODE: u8 = 2;
/// La première, en septembre 2026, portait un lien de partage et son mot de passe.
const VERSION_PAR_LIEN: u8 = 1;
const HTTPS: &str = "https://";

impl Appairage {
    /**
     * Le texte du QR code.
     *
     * Serré : un QR code se lit d'autant mieux, sur un écran, qu'il a peu de
     * modules. Les clés y sont en octets et non en texte, et « https:// » ne
     * s'écrit pas — un relais est toujours en HTTPS.
     */
    pub fn en_code(&self) -> String {
        let mut o = vec![VERSION_CODE];
        o.extend_from_slice(&cle_de(&self.cle_depot).unwrap_or([0; 32]));
        o.extend_from_slice(&cle_de(&self.cle_retour).unwrap_or([0; 32]));
        for s in [self.serveur.strip_prefix(HTTPS).unwrap_or(&self.serveur), &self.compte, &self.dossier] {
            let octets = s.as_bytes();
            o.push(octets.len().min(255) as u8);
            o.extend_from_slice(&octets[..octets.len().min(255)]);
        }
        format!("{PREFIXE_CODE}{}", URL_SAFE_NO_PAD.encode(o))
    }

    /// Relit un code scanné ; dit pourquoi il ne convient pas.
    pub fn depuis_code(brut: &str) -> R<Appairage> {
        let abime = || "Ce code est incomplet ou abîmé.".to_string();
        let propre: String = brut.chars().filter(|c| !c.is_whitespace()).collect();
        let corps = propre.strip_prefix(PREFIXE_CODE)
            .ok_or("Ce code n'est pas celui d'un relais Maitrize.")?;
        let o = URL_SAFE_NO_PAD.decode(corps).map_err(|_| abime())?;
        match o.first() {
            Some(&VERSION_CODE) => {}
            Some(&VERSION_PAR_LIEN) => return Err(
                "Ce QR code ouvrait le dossier par un lien de partage, qui n'a plus cours. Sur l'ordinateur, \
                 Réglages › Téléphone : réservez le dossier à votre compte, puis scannez le nouveau QR code.".into()),
            Some(_) => return Err("Ce code vient d'une version plus récente de Maitrize : mettez le dictaphone à jour.".into()),
            None => return Err(abime()),
        }
        let mut suite = Lecteur { octets: &o, position: 1 };
        let cle_depot: [u8; 32] = suite.prendre(32).and_then(|m| m.try_into().ok()).ok_or_else(abime)?;
        let cle_retour: [u8; 32] = suite.prendre(32).and_then(|m| m.try_into().ok()).ok_or_else(abime)?;
        let hote = suite.texte().ok_or_else(abime)?;
        let compte = suite.texte().ok_or_else(abime)?;
        let dossier = suite.texte().ok_or_else(abime)?;
        if hote.is_empty() || compte.is_empty() || dossier.is_empty() {
            return Err("Ce code ne dit pas où déposer.".into());
        }
        // Le code ne sait écrire que du HTTPS : le mot de passe du téléphone
        // ne passera jamais en clair.
        Ok(Appairage {
            serveur: format!("{HTTPS}{hote}"),
            compte,
            dossier,
            cle_depot: cle_en_texte(&cle_depot),
            cle_retour: cle_en_texte(&cle_retour),
        })
    }
}

/// Ce qui reste à lire d'un code : des octets, et des textes précédés de leur longueur.
struct Lecteur<'a> {
    octets: &'a [u8],
    position: usize,
}

impl<'a> Lecteur<'a> {
    fn prendre(&mut self, n: usize) -> Option<&'a [u8]> {
        let morceau = self.octets.get(self.position..self.position + n)?;
        self.position += n;
        Some(morceau)
    }

    fn texte(&mut self) -> Option<String> {
        let n = self.prendre(1)?[0] as usize;
        String::from_utf8(self.prendre(n)?.to_vec()).ok()
    }
}

// ── Le transport ───────────────────────────────────────────────────────────

/**
 * Une adresse vers laquelle on peut envoyer : chiffrée (https), ou sur cet
 * appareil même (127.0.0.1, localhost), d'où rien ne sort — c'est ainsi que
 * les essais imitent Nuage. Tout le reste est refusé avant le moindre envoi.
 */
pub fn adresse_chiffree(adresse: &str) -> R<()> {
    if adresse.starts_with("https://") {
        return Ok(());
    }
    let sur_cet_appareil = reqwest::Url::parse(adresse).ok()
        .filter(|u| u.scheme() == "http")
        .and_then(|u| u.host_str().map(|h| matches!(h, "127.0.0.1" | "localhost" | "[::1]")))
        .unwrap_or(false);
    if sur_cet_appareil { Ok(()) } else { Err("Adresse non chiffrée : Maitrize ne parle à Nuage qu'en https.".into()) }
}

/**
 * Les redirections qu'un client vers Nuage suit : cinq au plus, et jamais
 * d'une adresse chiffrée (https) vers une adresse en clair (http).
 *
 * Nuage ne redirige pas ainsi, mais un réseau mal intentionné pourrait le
 * tenter. Le client retirerait de lui-même l'identifiant en changeant de
 * port ; ce qu'on dépose est déjà scellé. On refuse quand même : rien de ce
 * qui part vers Nuage ne doit passer en clair, pas même une requête vide.
 */
pub fn redirections_chiffrees() -> reqwest::redirect::Policy {
    reqwest::redirect::Policy::custom(|essai| {
        let vers_le_clair = essai.url().scheme() != "https" && essai.previous().iter().any(|u| u.scheme() == "https");
        if vers_le_clair {
            essai.error("Nuage renvoie vers une adresse non chiffrée : refusé.")
        } else if essai.previous().len() > 5 {
            essai.error("Trop de redirections.")
        } else {
            essai.follow()
        }
    })
}

/// Trente-deux octets écrits en base64.
pub fn cle_de(b64: &str) -> R<[u8; 32]> {
    let octets = STANDARD.decode(b64.trim()).map_err(|_| "Clé illisible.".to_string())?;
    octets.try_into().map_err(|_| "Clé de mauvaise longueur.".to_string())
}

/// Une clé en base64, pour l'écrire dans un réglage ou un code.
pub fn cle_en_texte(cle: &[u8; 32]) -> String {
    STANDARD.encode(cle)
}

/// Une paire de clés neuve pour un relais : la privée reste sur l'ordinateur, la publique part dans le QR code.
pub fn nouvelle_paire() -> ([u8; 32], [u8; 32]) {
    let privee = StaticSecret::random_from_rng(OsRng);
    let publique = PublicKey::from(&privee);
    (privee.to_bytes(), publique.to_bytes())
}

/// Trente-deux octets tirés au hasard : la clé du retour.
pub fn nouvelle_cle() -> [u8; 32] {
    let mut cle = [0u8; 32];
    OsRng.fill_bytes(&mut cle);
    cle
}

/// La clé publique d'une clé privée : pour vérifier qu'une paire va ensemble.
pub fn publique_de(privee: &[u8; 32]) -> [u8; 32] {
    PublicKey::from(&StaticSecret::from(*privee)).to_bytes()
}

// ── Sceller un dépôt ───────────────────────────────────────────────────────

fn cle_du_scelle(partage: &[u8; 32], ephemere: &[u8; 32], destinataire: &[u8; 32]) -> R<[u8; 32]> {
    // Le sel lie la clé aux deux clés publiques : un dépôt rejoué pour un autre destinataire ne s'ouvre pas.
    let mut sel = Vec::with_capacity(64);
    sel.extend_from_slice(ephemere);
    sel.extend_from_slice(destinataire);
    let mut cle = [0u8; 32];
    Hkdf::<Sha256>::new(Some(&sel), partage)
        .expand(CONTEXTE_DEPOT, &mut cle)
        .map_err(|_| "Dérivation de clé impossible.".to_string())?;
    Ok(cle)
}

/// Scelle un contenu pour la clé publique de l'ordinateur.
///
/// Une clé jetable est tirée pour chaque dépôt : celui qui scelle ne garde
/// rien qui permette de rouvrir. Le blob porte la marque, la clé publique
/// jetable, le nonce, puis le contenu chiffré et authentifié.
pub fn sceller(destinataire: &[u8; 32], clair: &[u8]) -> R<Vec<u8>> {
    let jetable = StaticSecret::random_from_rng(OsRng);
    let ephemere = PublicKey::from(&jetable).to_bytes();
    let partage = jetable.diffie_hellman(&PublicKey::from(*destinataire));
    let cle = cle_du_scelle(partage.as_bytes(), &ephemere, destinataire)?;
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let chiffre = XChaCha20Poly1305::new(Key::from_slice(&cle))
        .encrypt(XNonce::from_slice(&nonce), Payload { msg: clair, aad: MARQUE_DEPOT })
        .map_err(|_| "Chiffrement impossible.".to_string())?;
    let mut blob = Vec::with_capacity(4 + 32 + 24 + chiffre.len());
    blob.extend_from_slice(MARQUE_DEPOT);
    blob.extend_from_slice(&ephemere);
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&chiffre);
    Ok(blob)
}

/// Rouvre un dépôt avec la clé privée de l'ordinateur.
pub fn desceller(privee: &[u8; 32], blob: &[u8]) -> R<Vec<u8>> {
    if blob.len() < 4 + 32 + 24 + 16 || &blob[..4] != MARQUE_DEPOT {
        return Err("Ce fichier n'est pas un dépôt du téléphone.".into());
    }
    let ephemere: [u8; 32] = blob[4..36].try_into().map_err(|_| "Dépôt abîmé.".to_string())?;
    let secret = StaticSecret::from(*privee);
    let destinataire = PublicKey::from(&secret).to_bytes();
    let partage = secret.diffie_hellman(&PublicKey::from(ephemere));
    let cle = cle_du_scelle(partage.as_bytes(), &ephemere, &destinataire)?;
    XChaCha20Poly1305::new(Key::from_slice(&cle))
        .decrypt(XNonce::from_slice(&blob[36..60]), Payload { msg: &blob[60..], aad: MARQUE_DEPOT })
        .map_err(|_| "Ce dépôt ne s'ouvre pas : il n'a pas été scellé pour cet ordinateur, ou il est abîmé.".to_string())
}

// ── Chiffrer le retour ─────────────────────────────────────────────────────

/// Chiffre ce que l'ordinateur laisse au téléphone, avec la clé du retour.
pub fn chiffrer_retour(cle: &[u8; 32], clair: &[u8]) -> R<Vec<u8>> {
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let chiffre = XChaCha20Poly1305::new(Key::from_slice(cle))
        .encrypt(XNonce::from_slice(&nonce), Payload { msg: clair, aad: MARQUE_RETOUR })
        .map_err(|_| "Chiffrement impossible.".to_string())?;
    let mut blob = Vec::with_capacity(4 + 24 + chiffre.len());
    blob.extend_from_slice(MARQUE_RETOUR);
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&chiffre);
    Ok(blob)
}

/// Relit ce que l'ordinateur a laissé.
pub fn dechiffrer_retour(cle: &[u8; 32], blob: &[u8]) -> R<Vec<u8>> {
    if blob.len() < 4 + 24 + 16 || &blob[..4] != MARQUE_RETOUR {
        return Err("Ce fichier n'est pas un retour de l'ordinateur.".into());
    }
    XChaCha20Poly1305::new(Key::from_slice(cle))
        .decrypt(XNonce::from_slice(&blob[4..28]), Payload { msg: &blob[28..], aad: MARQUE_RETOUR })
        .map_err(|_| "Ce retour ne s'ouvre pas avec la clé de ce téléphone.".to_string())
}

// ── Ce qu'on dépose ────────────────────────────────────────────────────────

/// Les trois choses que le téléphone dépose.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Genre {
    /// Une dictée : du son, en WAV.
    Vocal,
    /// Une note écrite : du texte.
    Note,
    /// Une page scannée : une image.
    Page,
}

impl Genre {
    /// La lettre qui ouvre le nom du fichier : l'ordinateur trie sans rien ouvrir.
    fn lettre(self) -> char {
        match self { Genre::Vocal => 'v', Genre::Note => 'n', Genre::Page => 'p' }
    }
}

/// Ce qui accompagne un dépôt : de quoi le ranger, rien sur la classe.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Etiquette {
    pub genre: Genre,
    /// L'identifiant donné par le téléphone : le même dépôt relevé deux fois ne se range qu'une fois.
    pub id: String,
    /// Quand cela a été dit ou écrit, en heure locale (« 2026-09-25T10:12:00 »).
    #[serde(default)]
    pub debut: String,
    #[serde(default)]
    pub duree_s: f64,
    /// Le créneau choisi sur le téléphone, vide si on laisse l'ordinateur décider.
    #[serde(default)]
    pub creneau: String,
    /// L'extension d'une page : « jpg », « png », « pdf ».
    #[serde(default)]
    pub ext: String,
}

/// Le nom du fichier d'un dépôt dans le dossier : « v-<id>.mtz ».
pub fn nom_du_depot(genre: Genre, id: &str) -> String {
    let propre: String = id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').collect();
    format!("{}-{propre}.mtz", genre.lettre())
}

/// Ce qu'un nom de fichier annonce, sans rien ouvrir ; rien pour un fichier qui n'est pas un dépôt.
pub fn genre_du_nom(nom: &str) -> Option<Genre> {
    let corps = nom.strip_suffix(".mtz")?;
    match corps.split_once('-')? {
        ("v", id) if !id.is_empty() => Some(Genre::Vocal),
        ("n", id) if !id.is_empty() => Some(Genre::Note),
        ("p", id) if !id.is_empty() => Some(Genre::Page),
        _ => None,
    }
}

/// L'étiquette et le contenu, d'un seul tenant : c'est cela qu'on scelle.
pub fn emballer(etiquette: &Etiquette, contenu: &[u8]) -> R<Vec<u8>> {
    let tete = serde_json::to_vec(etiquette).map_err(|e| e.to_string())?;
    let mut sortie = Vec::with_capacity(4 + tete.len() + contenu.len());
    sortie.extend_from_slice(&(tete.len() as u32).to_le_bytes());
    sortie.extend_from_slice(&tete);
    sortie.extend_from_slice(contenu);
    Ok(sortie)
}

/// Sépare l'étiquette du contenu.
pub fn deballer(octets: &[u8]) -> R<(Etiquette, Vec<u8>)> {
    let abime = || "Dépôt abîmé.".to_string();
    let longueur = u32::from_le_bytes(octets.get(..4).ok_or_else(abime)?.try_into().map_err(|_| abime())?) as usize;
    let tete = octets.get(4..4 + longueur).ok_or_else(abime)?;
    let etiquette: Etiquette = serde_json::from_slice(tete).map_err(|_| abime())?;
    Ok((etiquette, octets[4 + longueur..].to_vec()))
}

/// Un dépôt prêt à partir : emballé, puis scellé pour l'ordinateur.
pub fn preparer_depot(appairage: &Appairage, etiquette: &Etiquette, contenu: &[u8]) -> R<Vec<u8>> {
    sceller(&cle_de(&appairage.cle_depot)?, &emballer(etiquette, contenu)?)
}

/// Un dépôt relevé : rouvert, puis déballé.
pub fn ouvrir_depot(privee: &[u8; 32], blob: &[u8]) -> R<(Etiquette, Vec<u8>)> {
    deballer(&desceller(privee, blob)?)
}

// ── Ce que l'ordinateur laisse ─────────────────────────────────────────────

/// Un créneau, tel que le téléphone le connaît : une heure et un intitulé, personne dedans.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Creneau {
    pub id: String,
    pub debut: String,
    pub fin: String,
    #[serde(default)]
    pub matiere: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Journee {
    pub jour: String,
    pub creneaux: Vec<Creneau>,
}

/// L'emploi du temps des jours à venir. Un jour sans créneau y figure vide :
/// le téléphone sait alors que c'est un jour sans classe, et non un silence.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
pub struct Agenda {
    /// Quand l'ordinateur l'a publié.
    #[serde(default)]
    pub publie: String,
    pub jours: Vec<Journee>,
}

impl Agenda {
    /// Les créneaux d'un jour, ou rien si l'agenda ne le couvre pas.
    pub fn du_jour(&self, jour: &str) -> Option<&Journee> {
        self.jours.iter().find(|j| j.jour == jour)
    }
}

/// L'agenda, chiffré pour le téléphone.
pub fn chiffrer_agenda(cle: &[u8; 32], agenda: &Agenda) -> R<Vec<u8>> {
    chiffrer_retour(cle, &serde_json::to_vec(agenda).map_err(|e| e.to_string())?)
}

/// L'agenda, relu sur le téléphone.
pub fn dechiffrer_agenda(cle: &[u8; 32], blob: &[u8]) -> R<Agenda> {
    serde_json::from_slice(&dechiffrer_retour(cle, blob)?).map_err(|_| "Agenda illisible.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn appairage() -> (Appairage, [u8; 32], [u8; 32]) {
        let (privee, publique) = nouvelle_paire();
        let retour = nouvelle_cle();
        let a = Appairage {
            serveur: "https://nuage03.apps.education.fr".into(),
            compte: "clement.titet".into(),
            dossier: "Maitrize-Telephone".into(),
            cle_depot: cle_en_texte(&publique),
            cle_retour: cle_en_texte(&retour),
        };
        (a, privee, retour)
    }

    #[test]
    fn un_depot_ne_se_rouvre_qu_avec_la_cle_de_l_ordinateur() {
        let (a, privee, _) = appairage();
        let etiquette = Etiquette { genre: Genre::Vocal, id: "abc-123".into(), debut: "2026-10-02T10:12:00".into(), duree_s: 4.5, creneau: "c7".into(), ext: String::new() };
        let son = vec![7u8; 5000];
        let blob = preparer_depot(&a, &etiquette, &son).unwrap();
        // Rien de lisible dans ce qui voyage : ni l'identifiant, ni l'heure.
        assert!(!blob.windows(7).any(|w| w == b"abc-123"));
        assert!(!blob.windows(10).any(|w| w == b"2026-10-02"));
        let (relue, contenu) = ouvrir_depot(&privee, &blob).unwrap();
        assert_eq!(relue, etiquette);
        assert_eq!(contenu, son);
        // Une autre clé privée — celle d'un autre ordinateur, ou rien du tout : le dépôt reste fermé.
        let (autre, _) = nouvelle_paire();
        assert!(ouvrir_depot(&autre, &blob).is_err());
        // Le téléphone, lui, n'a que la clé publique et la clé du retour : ni l'une ni l'autre n'ouvre.
        assert!(ouvrir_depot(&cle_de(&a.cle_depot).unwrap(), &blob).is_err());
        assert!(ouvrir_depot(&cle_de(&a.cle_retour).unwrap(), &blob).is_err());
    }

    #[test]
    fn un_depot_modifie_en_route_est_refuse() {
        let (a, privee, _) = appairage();
        let etiquette = Etiquette { genre: Genre::Note, id: "n1".into(), debut: String::new(), duree_s: 0.0, creneau: String::new(), ext: String::new() };
        let blob = preparer_depot(&a, &etiquette, "Deux lignes.".as_bytes()).unwrap();
        for i in [0, 5, 40, 61, blob.len() - 1] {
            let mut abime = blob.clone();
            abime[i] ^= 1;
            assert!(ouvrir_depot(&privee, &abime).is_err(), "octet {i} modifié : le dépôt ne doit plus s'ouvrir");
        }
        assert!(ouvrir_depot(&privee, &blob[..40]).is_err());
        assert!(ouvrir_depot(&privee, b"").is_err());
        // Deux dépôts du même contenu ne se ressemblent pas : la clé jetable change à chaque fois.
        assert_ne!(blob, preparer_depot(&a, &etiquette, "Deux lignes.".as_bytes()).unwrap());
    }

    #[test]
    fn le_code_d_appairage_fait_l_aller_retour() {
        let (a, _, _) = appairage();
        let code = a.en_code();
        assert!(code.starts_with(PREFIXE_CODE));
        assert_eq!(Appairage::depuis_code(&code).unwrap(), a);
        // Collé depuis un message : des retours à la ligne s'y glissent.
        let coupe = format!("  {}\n{} ", &code[..40], &code[40..]);
        assert_eq!(Appairage::depuis_code(&coupe).unwrap(), a);
        // Ce qui n'est pas un relais se dit, plutôt que d'échouer plus tard au premier dépôt.
        assert!(Appairage::depuis_code("http://192.168.1.20:8787/?t=abc").unwrap_err().contains("relais"));
        assert!(Appairage::depuis_code("maitrize-relais:pas-du-base64!").is_err());
        assert!(Appairage::depuis_code("maitrize-relais:").is_err());
        // Tronqué par un collage : on le dit, on ne retient pas un relais bancal.
        assert!(Appairage::depuis_code(&code[..code.len() - 12]).unwrap_err().contains("incomplet"));
        // Le code ne sait écrire que du HTTPS : un relais en clair n'en sort jamais.
        let mut clair = a.clone();
        clair.serveur = "http://nuage.exemple.fr".into();
        assert!(Appairage::depuis_code(&clair.en_code()).unwrap().serveur.starts_with("https://"));
        // Un code d'une version à venir se refuse avec la marche à suivre.
        let avec_version = |v: u8| {
            let mut octets = URL_SAFE_NO_PAD.decode(code.strip_prefix(PREFIXE_CODE).unwrap()).unwrap();
            octets[0] = v;
            Appairage::depuis_code(&format!("{PREFIXE_CODE}{}", URL_SAFE_NO_PAD.encode(octets))).unwrap_err()
        };
        assert!(avec_version(9).contains("mettez le dictaphone à jour"));
        // Celui d'avant, qui portait un lien de partage, dit où trouver le nouveau.
        assert!(avec_version(1).contains("réservez le dossier à votre compte"));
    }

    #[test]
    fn le_code_ne_porte_aucun_mot_de_passe() {
        let (a, _, _) = appairage();
        let octets = URL_SAFE_NO_PAD.decode(a.en_code().strip_prefix(PREFIXE_CODE).unwrap()).unwrap();
        // Une version, deux clés, puis l'hôte, le compte et le dossier, chacun précédé de sa longueur : rien d'autre.
        let textes = ["nuage03.apps.education.fr", "clement.titet", "Maitrize-Telephone"];
        assert_eq!(octets.len(), 1 + 64 + textes.iter().map(|t| 1 + t.len()).sum::<usize>());
        // Moins de deux cents caractères : un QR code d'une cinquantaine de modules de côté.
        assert!(a.en_code().len() < 200, "{} caractères", a.en_code().len());
        // Un compte sans hôte ou sans dossier ne dit pas où déposer.
        let sans_compte = Appairage { compte: String::new(), ..a.clone() };
        assert!(Appairage::depuis_code(&sans_compte.en_code()).unwrap_err().contains("où déposer"));
    }

    #[test]
    fn l_agenda_se_lit_avec_la_cle_du_retour_et_elle_seule() {
        let (_, _, retour) = appairage();
        let agenda = Agenda {
            publie: "2026-10-02T07:30:00".into(),
            jours: vec![
                Journee { jour: "2026-10-02".into(), creneaux: vec![Creneau { id: "c1".into(), debut: "09:00".into(), fin: "10:00".into(), matiere: "Numération".into() }] },
                Journee { jour: "2026-10-03".into(), creneaux: vec![] },
            ],
        };
        let blob = chiffrer_agenda(&retour, &agenda).unwrap();
        assert!(!blob.windows(10).any(|w| w == "Numération".as_bytes().get(..10).unwrap()));
        let relu = dechiffrer_agenda(&retour, &blob).unwrap();
        assert_eq!(relu, agenda);
        assert_eq!(relu.du_jour("2026-10-02").unwrap().creneaux.len(), 1);
        // Un samedi publié vide n'est pas un jour inconnu.
        assert!(relu.du_jour("2026-10-03").unwrap().creneaux.is_empty());
        assert!(relu.du_jour("2026-10-20").is_none());
        assert!(dechiffrer_agenda(&nouvelle_cle(), &blob).is_err());
        // Un dépôt n'est pas un retour, et inversement : les deux formats ne se confondent pas.
        assert!(dechiffrer_retour(&retour, &sceller(&nouvelle_paire().1, b"x").unwrap()).is_err());
    }

    #[test]
    fn le_nom_d_un_depot_dit_son_genre_sans_rien_trahir() {
        assert_eq!(nom_du_depot(Genre::Vocal, "3f2a-77"), "v-3f2a-77.mtz");
        assert_eq!(nom_du_depot(Genre::Page, "../../etc/x"), "p-etcx.mtz");
        assert_eq!(genre_du_nom("v-3f2a-77.mtz"), Some(Genre::Vocal));
        assert_eq!(genre_du_nom("n-1.mtz"), Some(Genre::Note));
        assert_eq!(genre_du_nom("p-1.mtz"), Some(Genre::Page));
        // Ce que Nuage ou un curieux pose là n'est pas un dépôt.
        for nom in ["agenda.mtz", "v-.mtz", "x-1.mtz", "v-1.txt", ".DS_Store", "Readme.md"] {
            assert_eq!(genre_du_nom(nom), None, "{nom}");
        }
    }

    #[test]
    fn seules_les_adresses_chiffrees_ou_locales_sont_permises() {
        for bonne in ["https://nuage17.apps.education.fr", "http://127.0.0.1:8080/x", "http://localhost:3000", "http://[::1]:9"] {
            assert!(adresse_chiffree(bonne).is_ok(), "{bonne}");
        }
        for mauvaise in ["http://nuage17.apps.education.fr", "http://127.0.0.1.exemple.fr/", "http://localhost.exemple.fr", "ftp://127.0.0.1", "nuage17.apps.education.fr", ""] {
            assert!(adresse_chiffree(mauvaise).unwrap_err().contains("https"), "{mauvaise}");
        }
    }

    #[test]
    fn une_paire_de_cles_va_ensemble() {
        let (privee, publique) = nouvelle_paire();
        assert_eq!(publique_de(&privee), publique);
        assert_eq!(cle_de(&cle_en_texte(&publique)).unwrap(), publique);
        assert!(cle_de("???").is_err());
    }
}
