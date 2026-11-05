//! Le classeur de communication de Maitrize, sur l'iPad et l'iPhone.
//!
//! « Sur iOS, j'aimerais que tu construises une autre application pour créer
//! un PODD » (l'enseignant, 5 novembre 2026). L'enseignant crée le classeur —
//! des pages liées, sur les principes du PODD de Gayle Porter, sans en copier
//! les pages, qui sont protégées — et l'élève parle avec : chaque case se dit
//! avec la voix de l'appareil, même sans internet et en mode silencieux.
//!
//! Ce que Rust fait ici : garder les classeurs et leurs images dans le dossier
//! de l'application, sans jamais perdre la version d'avant (`stockage`) ;
//! chercher et prendre les pictos d'ARASAAC (`arasaac`) ; lire et écrire le
//! format ouvert des tableaux, celui que Maitrize écrit et relit (`obz`).

mod arasaac;
mod obz;
mod stockage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_parole::init())
        .invoke_handler(tauri::generate_handler![
            stockage::classeurs_lister,
            stockage::classeur_ecrire,
            stockage::classeur_supprimer,
            stockage::images_lire,
            stockage::image_ecrire,
            arasaac::arasaac_chercher,
            arasaac::arasaac_prendre,
            obz::obz_ouvrir,
            obz::obz_enregistrer,
        ])
        .run(tauri::generate_context!())
        .expect("le classeur n'a pas pu s'ouvrir");
}
