//! Le trousseau : les secrets de cet ordinateur, chiffrés dans la base.
//!
//! La base garde quelques secrets — la clé de l'IA, l'accès au stockage, la
//! phrase des sauvegardes, les comptes Nuage et les mots de passe des bureaux
//! communs, la clé privée de l'identité. En clair, ils partaient avec chaque
//! copie du fichier : les copies quotidiennes, un dossier recopié pour changer
//! d'ordinateur. Ils y sont désormais chiffrés (XChaCha20-Poly1305), avec une
//! clé que garde le système : le trousseau de macOS, ou la protection des
//! données de Windows (DPAPI), liée à la session de l'utilisateur. Sans elle,
//! une copie de la base ne livre aucun secret.
//!
//! Une valeur qu'on ne sait plus ouvrir — base venue d'un autre ordinateur,
//! clé effacée — se lit vide : l'application redemande le secret au lieu de
//! planter. Là où le système n'offre rien, les secrets restent comme avant.
//!
//! En développement (`tauri dev`), rien n'est chiffré ni migré : macOS
//! redemanderait l'accès au trousseau à chaque compilation, le programme
//! changeant de signature. Un secret déjà chiffré par l'application installée
//! se lit quand même, après un « Autoriser ».

use base64::Engine;
use chacha20poly1305::{aead::{Aead, KeyInit, Payload}, Key, XChaCha20Poly1305, XNonce};
use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension};
use std::sync::OnceLock;

/// Ce qui précède un secret chiffré dans un réglage (du texte)…
const PREFIXE: &str = "trousseau1:";
/// … et dans une colonne binaire (la clé privée de l'identité).
const MAGIQUE: &[u8] = b"MTZT1";
/// Le nom sous lequel la clé privée de l'identité est chiffrée.
pub const CLE_PRIVEE: &str = "identite.cle_privee";

/// Les réglages chiffrés : les secrets, et la liste des bureaux communs, qui
/// porte leurs mots de passe.
pub fn reglage_chiffre(cle: &str) -> bool {
    crate::journal::reglage_secret(cle) || cle == crate::commun::CLE_BUREAUX
}

/// Les secrets que l'interface lit elle-même, dans Réglages. Les autres ne
/// servent qu'ici : l'interface ne les reçoit pas.
const LUS_PAR_L_INTERFACE: &[&str] = &["mistralApiKey", "sauvegarde_phrase"];

/// Un réglage tel que l'interface doit le recevoir : en clair s'il est
/// ordinaire ou si elle s'en sert, pas du tout sinon.
pub fn pour_l_interface(cle: &str, valeur: String) -> Option<String> {
    if !reglage_chiffre(cle) { return Some(valeur); }
    LUS_PAR_L_INTERFACE.contains(&cle).then(|| ouvrir(cle, &valeur))
}

/// Chiffrer ? Pas en développement (voir plus haut) ; les essais, si.
fn chiffrer() -> bool {
    !cfg!(debug_assertions) || cfg!(test)
}

/// La clé, cherchée une fois par lancement : un refus ne se redemande pas.
fn cle() -> Option<&'static [u8; 32]> {
    static CLE: OnceLock<Option<[u8; 32]>> = OnceLock::new();
    CLE.get_or_init(systeme::cle).as_ref()
}

// Les essais et les systèmes sans trousseau n'en créent jamais.
#[cfg_attr(any(test, not(any(target_os = "macos", windows))), allow(dead_code))]
fn cle_neuve() -> [u8; 32] {
    let mut k = [0u8; 32];
    OsRng.fill_bytes(&mut k);
    k
}

/// Le nom du secret est lié au chiffré : une valeur recopiée sous un autre
/// nom ne s'ouvre pas.
fn sceller_avec(cle: &[u8; 32], nom: &str, clair: &[u8]) -> Option<Vec<u8>> {
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let chiffre = XChaCha20Poly1305::new(Key::from_slice(cle))
        .encrypt(XNonce::from_slice(&nonce), Payload { msg: clair, aad: nom.as_bytes() })
        .ok()?;
    let mut sortie = nonce.to_vec();
    sortie.extend_from_slice(&chiffre);
    Some(sortie)
}

fn ouvrir_avec(cle: &[u8; 32], nom: &str, scelle: &[u8]) -> Option<Vec<u8>> {
    if scelle.len() < 24 { return None; }
    let (nonce, chiffre) = scelle.split_at(24);
    XChaCha20Poly1305::new(Key::from_slice(cle))
        .decrypt(XNonce::from_slice(nonce), Payload { msg: chiffre, aad: nom.as_bytes() })
        .ok()
}

/// Chiffre un réglage secret. Sans clé, il reste tel quel, comme avant.
pub fn sceller(nom: &str, clair: &str) -> String {
    if clair.is_empty() || !chiffrer() { return clair.to_string(); }
    match cle().and_then(|k| sceller_avec(k, nom, clair.as_bytes())) {
        Some(octets) => format!("{PREFIXE}{}", base64::engine::general_purpose::STANDARD.encode(octets)),
        None => clair.to_string(),
    }
}

/// Le réglage en clair : déchiffré s'il l'a été, tel quel sinon (un secret
/// d'avant le trousseau). Vide si la clé manque ou ne l'ouvre pas.
pub fn ouvrir(nom: &str, valeur: &str) -> String {
    let Some(texte) = valeur.strip_prefix(PREFIXE) else { return valeur.to_string() };
    base64::engine::general_purpose::STANDARD.decode(texte).ok()
        .and_then(|scelle| ouvrir_avec(cle()?, nom, &scelle))
        .and_then(|clair| String::from_utf8(clair).ok())
        .unwrap_or_default()
}

/// Chiffre une valeur binaire (la clé privée de l'identité).
pub fn sceller_octets(nom: &str, clair: &[u8]) -> Vec<u8> {
    if !chiffrer() { return clair.to_vec(); }
    match cle().and_then(|k| sceller_avec(k, nom, clair)) {
        Some(octets) => [MAGIQUE, octets.as_slice()].concat(),
        None => clair.to_vec(),
    }
}

/// La valeur binaire en clair. Une erreur, et non du vide, si elle ne s'ouvre
/// pas : une identité illisible ne doit pas passer pour absente — elle serait
/// remplacée, et les amis appariés perdus.
pub fn ouvrir_octets(nom: &str, valeur: &[u8]) -> Result<Vec<u8>, String> {
    let Some(scelle) = valeur.strip_prefix(MAGIQUE) else { return Ok(valeur.to_vec()) };
    cle().and_then(|k| ouvrir_avec(k, nom, scelle))
        .ok_or_else(|| "La clé de cet ordinateur ne s'ouvre pas : le trousseau du système ne la reconnaît pas.".to_string())
}

/// Chiffre ce qui est encore en clair : les secrets d'avant le trousseau.
///
/// Chaque valeur est relue avant d'être remplacée : un secret ne doit jamais
/// céder la place à ce qu'on ne sait pas rouvrir. Sans rien à chiffrer, le
/// trousseau n'est même pas consulté.
pub fn migrer(c: &Connection) {
    if !chiffrer() { return; }
    let noms: Vec<&str> = crate::journal::SECRETS.iter().copied().chain([crate::commun::CLE_BUREAUX]).collect();
    let marques = noms.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let en_clair: Vec<(String, String)> = c
        .prepare(&format!("SELECT cle, valeur FROM settings WHERE cle IN ({marques}) AND valeur <> ''"))
        .and_then(|mut st| {
            st.query_map(rusqlite::params_from_iter(noms.iter()), |r| Ok((r.get(0)?, r.get(1)?)))?
                .collect::<Result<Vec<(String, String)>, _>>()
        })
        .unwrap_or_default()
        .into_iter()
        .filter(|(_, v)| !v.starts_with(PREFIXE))
        .collect();
    let identite: Option<Vec<u8>> = c
        .query_row("SELECT cle_privee FROM identite WHERE id = 1", [], |r| r.get(0))
        .optional().ok().flatten()
        .filter(|v: &Vec<u8>| !v.is_empty() && !v.starts_with(MAGIQUE));
    if en_clair.is_empty() && identite.is_none() { return; }
    if cle().is_none() { return; }

    let mut faits = 0;
    for (nom, clair) in en_clair {
        let scelle = sceller(&nom, &clair);
        if scelle != clair && ouvrir(&nom, &scelle) == clair {
            faits += c.execute("UPDATE settings SET valeur = ?1 WHERE cle = ?2 AND valeur = ?3", params![scelle, nom, clair])
                .unwrap_or(0);
        }
    }
    if let Some(clair) = identite {
        let scelle = sceller_octets(CLE_PRIVEE, &clair);
        if scelle != clair && ouvrir_octets(CLE_PRIVEE, &scelle).as_deref() == Ok(clair.as_slice()) {
            faits += c.execute("UPDATE identite SET cle_privee = ?1 WHERE id = 1 AND cle_privee = ?2", params![scelle, clair])
                .unwrap_or(0);
        }
    }
    if faits > 0 {
        println!("{faits} secret(s) rangé(s) sous la clé du trousseau.");
    }
}

// ── Où le système garde la clé ─────────────────────────────────────────────

/// Les essais ne touchent jamais au vrai trousseau : une clé fixe.
#[cfg(test)]
mod systeme {
    pub fn cle() -> Option<[u8; 32]> { Some([7u8; 32]) }
}

#[cfg(all(not(test), target_os = "macos"))]
use macos as systeme;

/// macOS : un mot de passe du trousseau de session, que seule l'application
/// (signée) lit sans rien demander.
#[cfg(target_os = "macos")]
mod macos {
    use base64::Engine;
    use security_framework::passwords::{generic_password, set_generic_password_options, PasswordOptions};

    const SERVICE: &str = "Maitrize";
    const COMPTE: &str = "clé des secrets";
    /// errSecItemNotFound : la clé n'a jamais été créée.
    const INTROUVABLE: i32 = -25300;

    fn lire(service: &str) -> Result<Option<[u8; 32]>, security_framework::base::Error> {
        let octets = generic_password(PasswordOptions::new_generic_password(service, COMPTE))?;
        let texte = String::from_utf8(octets).unwrap_or_default();
        Ok(base64::engine::general_purpose::STANDARD.decode(texte.trim()).ok()
            .and_then(|o| <[u8; 32]>::try_from(o.as_slice()).ok()))
    }

    #[cfg_attr(test, allow(dead_code))]
    pub fn cle() -> Option<[u8; 32]> {
        cle_sous(SERVICE)
    }

    pub(super) fn cle_sous(service: &str) -> Option<[u8; 32]> {
        match lire(service) {
            Ok(cle) => cle,
            // Créée seulement si elle n'existe pas : un accès refusé ne doit
            // jamais la remplacer, tout ce qu'elle a chiffré serait perdu.
            Err(err) if err.code() == INTROUVABLE && super::chiffrer() => {
                let neuve = super::cle_neuve();
                let mut options = PasswordOptions::new_generic_password(service, COMPTE);
                options.set_label("Maitrize — clé des secrets");
                options.set_comment("Chiffre les mots de passe et les clés que Maitrize garde sur cet ordinateur.");
                let texte = base64::engine::general_purpose::STANDARD.encode(neuve);
                if let Err(err) = set_generic_password_options(texte.as_bytes(), options) {
                    eprintln!("trousseau : clé impossible à enregistrer ({err:?})");
                    return None;
                }
                // Relue : une clé qui ne se relit pas ne doit rien chiffrer.
                lire(service).ok().flatten().filter(|relue| relue == &neuve)
            }
            Err(err) => {
                eprintln!("trousseau inaccessible ({err:?}) : les secrets restent comme ils sont");
                None
            }
        }
    }
}

/// Windows : la clé, protégée par DPAPI pour cette session Windows, dans un
/// fichier à côté de la base. Recopié ailleurs, il ne s'ouvre pas.
#[cfg(all(not(test), windows))]
mod systeme {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    fn fichier() -> std::path::PathBuf {
        crate::db::data_dir().join("trousseau.cle")
    }

    pub fn cle() -> Option<[u8; 32]> {
        match std::fs::read(fichier()) {
            Ok(protege) => {
                if let Some(cle) = deproteger(&protege).and_then(|o| <[u8; 32]>::try_from(o.as_slice()).ok()) {
                    return Some(cle);
                }
                // Une clé d'une autre session ou d'un autre ordinateur : ce
                // qu'elle a chiffré est perdu ici. Elle est mise de côté, pas
                // effacée, et une nouvelle prend le relais.
                if !super::chiffrer() { return None; }
                std::fs::rename(fichier(), fichier().with_extension("cle.illisible")).ok()?;
                creer()
            }
            Err(err) if err.kind() == std::io::ErrorKind::NotFound && super::chiffrer() => creer(),
            Err(_) => None,
        }
    }

    fn creer() -> Option<[u8; 32]> {
        let neuve = super::cle_neuve();
        let protege = proteger(&neuve)?;
        // Écrite à côté puis renommée : jamais de fichier à moitié écrit.
        let provisoire = fichier().with_extension("cle.tmp");
        std::fs::write(&provisoire, &protege).ok()?;
        std::fs::rename(&provisoire, fichier()).ok()?;
        (deproteger(&protege)?.as_slice() == neuve.as_slice()).then_some(neuve)
    }

    fn proteger(clair: &[u8]) -> Option<Vec<u8>> {
        let entree = CRYPT_INTEGER_BLOB { cbData: clair.len() as u32, pbData: clair.as_ptr() as *mut u8 };
        let mut sortie = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = unsafe {
            CryptProtectData(&entree, std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN, &mut sortie)
        };
        recopier(ok, sortie)
    }

    fn deproteger(protege: &[u8]) -> Option<Vec<u8>> {
        let entree = CRYPT_INTEGER_BLOB { cbData: protege.len() as u32, pbData: protege.as_ptr() as *mut u8 };
        let mut sortie = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = unsafe {
            CryptUnprotectData(&entree, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN, &mut sortie)
        };
        recopier(ok, sortie)
    }

    /// Recopie ce que Windows a alloué, puis le lui rend.
    fn recopier(ok: i32, sortie: CRYPT_INTEGER_BLOB) -> Option<Vec<u8>> {
        if ok == 0 || sortie.pbData.is_null() { return None; }
        let octets = unsafe { std::slice::from_raw_parts(sortie.pbData, sortie.cbData as usize) }.to_vec();
        unsafe { LocalFree(sortie.pbData as *mut core::ffi::c_void) };
        Some(octets)
    }
}

/// Ailleurs : pas de trousseau, les secrets restent comme avant.
#[cfg(all(not(test), not(target_os = "macos"), not(windows)))]
mod systeme {
    pub fn cle() -> Option<[u8; 32]> { None }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }

    #[test]
    fn un_secret_se_chiffre_et_se_rouvre() {
        let s = sceller("mistralApiKey", "sk-123");
        assert!(s.starts_with(PREFIXE) && !s.contains("sk-123"));
        assert_eq!(ouvrir("mistralApiKey", &s), "sk-123");
        // Deux chiffrements du même secret ne se ressemblent pas.
        assert_ne!(s, sceller("mistralApiKey", "sk-123"));
    }

    #[test]
    fn un_chiffre_ne_s_ouvre_ni_sous_un_autre_nom_ni_avec_une_autre_cle() {
        let s = sceller("sync_secret", "abc");
        assert_eq!(ouvrir("mistralApiKey", &s), "");
        let brut = base64::engine::general_purpose::STANDARD.decode(s.strip_prefix(PREFIXE).unwrap()).unwrap();
        assert!(ouvrir_avec(&[8u8; 32], "sync_secret", &brut).is_none());
        assert_eq!(ouvrir("sync_secret", "trousseau1:pas du base64"), "");
    }

    #[test]
    fn un_secret_d_avant_le_trousseau_se_lit_tel_quel() {
        assert_eq!(ouvrir("mistralApiKey", "sk-ancien"), "sk-ancien");
        assert_eq!(ouvrir_octets(CLE_PRIVEE, &[1u8; 32]).unwrap(), vec![1u8; 32]);
    }

    #[test]
    fn une_identite_illisible_est_une_erreur_pas_une_absence() {
        let s = sceller_octets(CLE_PRIVEE, &[3u8; 32]);
        assert!(s.starts_with(MAGIQUE));
        assert_eq!(ouvrir_octets(CLE_PRIVEE, &s).unwrap(), vec![3u8; 32]);
        let mut abime = s.clone();
        *abime.last_mut().unwrap() ^= 1;
        assert!(ouvrir_octets(CLE_PRIVEE, &abime).is_err());
    }

    #[test]
    fn l_interface_ne_recoit_que_les_secrets_qu_elle_affiche() {
        let cle_api = sceller("mistralApiKey", "sk-123");
        assert_eq!(pour_l_interface("mistralApiKey", cle_api).as_deref(), Some("sk-123"));
        assert_eq!(pour_l_interface("sync_secret", sceller("sync_secret", "x")), None);
        assert_eq!(pour_l_interface(crate::commun::CLE_BUREAUX, "[]".into()), None);
        assert_eq!(pour_l_interface("ecole", "École d'ici".into()).as_deref(), Some("École d'ici"));
    }

    #[test]
    fn la_migration_chiffre_les_secrets_en_clair_et_seulement_eux() {
        let c = base();
        c.execute_batch(
            "INSERT INTO settings (cle, valeur) VALUES ('mistralApiKey', 'sk-123'), ('sync_secret', ''),
               ('telephoneRelais', '{\"cle\":\"x\"}'), ('bureauxCommuns', '[{\"motDePasse\":\"m\"}]'), ('ecole', 'École d''ici');",
        ).unwrap();
        c.execute("INSERT INTO identite (id, cle_privee, cle_publique, nom) VALUES (1, ?1, ?2, '')", params![vec![5u8; 32], vec![6u8; 32]]).unwrap();
        migrer(&c);
        let lire = |cle: &str| c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [cle], |r| r.get::<_, String>(0)).unwrap();
        for (cle, clair) in [("mistralApiKey", "sk-123"), ("telephoneRelais", "{\"cle\":\"x\"}"), ("bureauxCommuns", "[{\"motDePasse\":\"m\"}]")] {
            let v = lire(cle);
            assert!(v.starts_with(PREFIXE), "{cle} est resté en clair");
            assert_eq!(ouvrir(cle, &v), clair);
        }
        assert_eq!(lire("sync_secret"), "");
        assert_eq!(lire("ecole"), "École d'ici");
        let pv: Vec<u8> = c.query_row("SELECT cle_privee FROM identite WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert!(pv.starts_with(MAGIQUE));
        assert_eq!(ouvrir_octets(CLE_PRIVEE, &pv).unwrap(), vec![5u8; 32]);
        let pb: Vec<u8> = c.query_row("SELECT cle_publique FROM identite WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(pb, vec![6u8; 32], "la clé publique n'a rien de secret");
        // Une seconde fois : rien ne bouge.
        let avant = lire("mistralApiKey");
        migrer(&c);
        assert_eq!(lire("mistralApiKey"), avant);
    }

    /// Le vrai trousseau de ce Mac, sous un nom d'essai que l'essai retire :
    /// `cargo test --lib trousseau -- --ignored`.
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore]
    fn sur_ce_mac_la_cle_se_cree_une_fois_puis_se_relit() {
        use security_framework::passwords::delete_generic_password;
        let service = "Maitrize (essai du trousseau)";
        let _ = delete_generic_password(service, "clé des secrets");
        let premiere = super::macos::cle_sous(service).expect("clé créée");
        let relue = super::macos::cle_sous(service).expect("clé relue");
        delete_generic_password(service, "clé des secrets").expect("essai retiré du trousseau");
        assert_eq!(premiere, relue, "une seconde lecture ne doit pas créer une autre clé");
        assert_ne!(premiere, [0u8; 32]);
    }

    #[test]
    fn les_reglages_passent_par_le_trousseau() {
        let c = base();
        crate::sync::set_setting(&c, "sync_secret", "s3-secret").unwrap();
        let brut: String = c.query_row("SELECT valeur FROM settings WHERE cle = 'sync_secret'", [], |r| r.get(0)).unwrap();
        assert!(!brut.contains("s3-secret"));
        assert_eq!(crate::sync::get_setting(&c, "sync_secret"), "s3-secret");
        crate::sync::set_setting(&c, "ecole", "École d'ici").unwrap();
        let ecole: String = c.query_row("SELECT valeur FROM settings WHERE cle = 'ecole'", [], |r| r.get(0)).unwrap();
        assert_eq!(ecole, "École d'ici");
    }
}
