//! Le dictaphone de classe : enregistrer, garder, déposer.
//!
//! Ce téléphone ne connaît rien de la classe. Ni les élèves, ni le planning,
//! ni les séances : il enregistre du son et l'heure où il a été dit, et c'est
//! tout. Perdu dans un couloir, il ne trahit personne ; n'ayant rien à
//! renvoyer, il ne peut rien écraser non plus.
//!
//! C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
//! cahier journal. Il transcrit sur place avec Whisper et range.
//!
//! Le dépôt prend deux chemins : droit sur l'ordinateur quand ils partagent
//! un WiFi, ou par un dossier de Nuage quand ils ne sont pas ensemble — scellé
//! alors pour l'ordinateur, que le téléphone lui-même ne peut pas rouvrir.

mod commandes;

use commandes::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Le greffon des dialogues sert à demander confirmation avant
        // d'effacer un enregistrement — et il apporte au passage le pont
        // Swift de Tauri, que rien d'autre ne tire sur iPhone.
        .plugin(tauri_plugin_dialog::init())
        // Le scanner de documents : VisionKit, le même écran que Notes.
        .plugin(tauri_plugin_scanner::init())
        .invoke_handler(tauri::generate_handler![
            vocal_garder,
            vocaux_liste,
            vocal_lire,
            vocal_oublier,
            note_garder,
            notes_liste,
            note_oublier,
            creneaux_du_jour,
            creneau_maintenant,
            // Par Nuage : les dictées, les notes, l'emploi du temps.
            relais_lire,
            relais_ecrire,
            relais_oublier,
            relais_joignable,
            vocal_deposer,
            note_deposer,
            creneaux_du_relais,
            // Par le WiFi, et seulement quand l'ordinateur le demande : pages et photos.
            demande_lire,
            demande_envoyer_pages,
            demande_envoyer_photo,
            demande_terminer,
        ])
        .run(tauri::generate_context!())
        .expect("le dictaphone n'a pas pu démarrer");
}

