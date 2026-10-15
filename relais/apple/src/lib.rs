//! Le chiffrement du relais sur l'iPhone : CryptoKit, la bibliothèque d'Apple.
//!
//! Le paquet Swift de `swift/` fait le travail ; ce module le présente au
//! reste du relais. Le format, et pourquoi il a changé : voir `relais`
//! (lib.rs, « Sceller un dépôt »).

extern "C" {
    fn maitrize_sceller(destinataire: *const u8, clair: *const u8, longueur: isize, sortie: *mut u8) -> i32;
    fn maitrize_ouvrir_retour(cle: *const u8, blob: *const u8, longueur: isize, sortie: *mut u8) -> i32;
}

/// Ce qu'un dépôt ajoute au contenu : la marque, la clé jetable, le nonce et l'étiquette.
pub const SURCOUT_DEPOT: usize = 4 + 32 + 12 + 16;
/// Ce qu'un retour ajoute au contenu : la marque, le nonce et l'étiquette.
pub const SURCOUT_RETOUR: usize = 4 + 12 + 16;

/// Scelle un contenu pour la clé publique de l'ordinateur.
pub fn sceller(destinataire: &[u8; 32], clair: &[u8]) -> Result<Vec<u8>, String> {
    let mut sortie = vec![0u8; clair.len() + SURCOUT_DEPOT];
    // SAFETY : la clé fait 32 octets, et `sortie` a exactement la place que le Swift remplit.
    let code = unsafe { maitrize_sceller(destinataire.as_ptr(), clair.as_ptr(), clair.len() as isize, sortie.as_mut_ptr()) };
    if code == 0 { Ok(sortie) } else { Err("Chiffrement impossible : la clé de l'ordinateur ne va pas.".into()) }
}

/// Ouvre un retour de l'ordinateur avec la clé du retour.
pub fn ouvrir_retour(cle: &[u8; 32], blob: &[u8]) -> Result<Vec<u8>, String> {
    let ne_s_ouvre_pas = || "Ce retour ne s'ouvre pas avec la clé de ce téléphone.".to_string();
    let longueur = blob.len().checked_sub(SURCOUT_RETOUR).ok_or_else(ne_s_ouvre_pas)?;
    let mut sortie = vec![0u8; longueur];
    // SAFETY : la clé fait 32 octets, et `sortie` a la place du contenu, marque, nonce et étiquette ôtés.
    let code = unsafe { maitrize_ouvrir_retour(cle.as_ptr(), blob.as_ptr(), blob.len() as isize, sortie.as_mut_ptr()) };
    if code == 0 { Ok(sortie) } else { Err(ne_s_ouvre_pas()) }
}
