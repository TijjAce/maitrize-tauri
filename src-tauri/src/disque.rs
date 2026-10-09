//! Le disque de cet ordinateur est-il chiffré ?
//!
//! Les dossiers des élèves vivent sur ce disque. Si l'ordinateur est perdu ou
//! volé et que son disque n'est pas chiffré — FileVault sur Mac, BitLocker ou
//! « chiffrement de l'appareil » sur Windows —, ils se lisent sans mot de
//! passe. L'application ne peut pas chiffrer le disque à la place de
//! l'enseignant ; elle peut le lui dire, et l'y mener.

use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ChiffrementDisque {
    /// « actif », « en_cours », « inactif » ou « inconnu ».
    pub etat: &'static str,
    /// Le nom de la protection sur ce système : « FileVault », « BitLocker ».
    pub nom: &'static str,
}

/// L'état de FileVault d'après `fdesetup status` (toujours en anglais).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn etat_filevault(sortie: &str) -> &'static str {
    if sortie.contains("Decryption in progress") { "inactif" }
    else if sortie.contains("Encryption in progress") { "en_cours" }
    else if sortie.contains("FileVault is On") { "actif" }
    else if sortie.contains("FileVault is Off") { "inactif" }
    else { "inconnu" }
}

/// L'état de BitLocker d'après la propriété que l'Explorateur affiche.
/// Microsoft ne documente pas ses valeurs : on ne lit que les plus sûres
/// (1 activé, 2 désactivé, 3 chiffrement en cours) ; le reste est « inconnu »,
/// plutôt qu'une fausse alerte.
#[cfg_attr(not(windows), allow(dead_code))]
fn etat_bitlocker(sortie: &str) -> &'static str {
    match sortie.trim() {
        "1" => "actif",
        "3" => "en_cours",
        "2" => "inactif",
        _ => "inconnu",
    }
}

#[cfg(target_os = "macos")]
fn lire() -> ChiffrementDisque {
    // `fdesetup status` se lit sans droits d'administrateur.
    let sortie = std::process::Command::new("/usr/bin/fdesetup").arg("status").output()
        .map(|s| String::from_utf8_lossy(&s.stdout).into_owned())
        .unwrap_or_default();
    ChiffrementDisque { etat: etat_filevault(&sortie), nom: "FileVault" }
}

#[cfg(windows)]
fn lire() -> ChiffrementDisque {
    use std::os::windows::process::CommandExt;
    // `manage-bde` et la classe WMI de BitLocker demandent d'être
    // administrateur ; la propriété de l'Explorateur, non.
    let lecteur = lecteur_des_donnees();
    let script = format!(
        "(New-Object -ComObject Shell.Application).NameSpace('{lecteur}').Self.ExtendedProperty('System.Volume.BitLockerProtection')"
    );
    let (envoi, reception) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let sortie = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW : pas de console qui clignote
            .output()
            .map(|s| String::from_utf8_lossy(&s.stdout).into_owned())
            .unwrap_or_default();
        let _ = envoi.send(sortie);
    });
    // Un PowerShell bloqué ne doit pas laisser la carte en attente pour toujours.
    let sortie = reception.recv_timeout(std::time::Duration::from_secs(15)).unwrap_or_default();
    ChiffrementDisque { etat: etat_bitlocker(&sortie), nom: "BitLocker" }
}

/// Le lecteur où sont les données (« C: »), celui qu'il faut chiffrer.
#[cfg(windows)]
fn lecteur_des_donnees() -> String {
    let chemin = crate::db::data_dir().to_string_lossy().into_owned();
    let mut lettres = chemin.chars();
    match (lettres.next(), lettres.next()) {
        (Some(l), Some(':')) if l.is_ascii_alphabetic() => format!("{}:", l.to_ascii_uppercase()),
        _ => std::env::var("SystemDrive").unwrap_or_else(|_| "C:".into()),
    }
}

#[cfg(not(any(target_os = "macos", windows)))]
fn lire() -> ChiffrementDisque {
    ChiffrementDisque { etat: "inconnu", nom: "" }
}

#[tauri::command(async)]
pub fn chiffrement_disque() -> ChiffrementDisque {
    lire()
}

/// Ouvre le réglage de FileVault. Sur Windows, l'écran diffère selon
/// l'édition (Famille, Professionnel) : l'application dit le chemin.
#[tauri::command]
pub fn ouvrir_reglages_chiffrement() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("/usr/bin/open")
            .arg("x-apple.systempreferences:com.apple.preference.security?FileVault")
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Ouvrez les paramètres de chiffrement de Windows.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filevault_se_lit_dans_la_sortie_de_fdesetup() {
        assert_eq!(etat_filevault("FileVault is On.\n"), "actif");
        assert_eq!(etat_filevault("FileVault is Off.\n"), "inactif");
        assert_eq!(etat_filevault("FileVault is On.\nEncryption in progress: Percent completed = 12.5\n"), "en_cours");
        assert_eq!(etat_filevault("FileVault is On.\nDecryption in progress: Percent completed = 40\n"), "inactif");
        assert_eq!(etat_filevault(""), "inconnu");
    }

    #[test]
    fn bitlocker_ne_lit_que_les_valeurs_sures() {
        assert_eq!(etat_bitlocker("1\r\n"), "actif");
        assert_eq!(etat_bitlocker("2"), "inactif");
        assert_eq!(etat_bitlocker("3"), "en_cours");
        for incertain in ["", "0", "5", "6", "8", "erreur"] {
            assert_eq!(etat_bitlocker(incertain), "inconnu", "{incertain:?}");
        }
    }
}
