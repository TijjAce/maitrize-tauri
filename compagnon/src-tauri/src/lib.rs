//! Le dictaphone de classe : enregistrer, garder, déposer — et montrer les
//! aides à la tâche aux tablettes des élèves.
//!
//! Ce que le téléphone dépose, il ne peut pas le relire : c'est scellé pour
//! l'ordinateur. Ce qu'il reçoit — l'emploi du temps, et le cahier journal
//! avec ses aides à la tâche, quand l'enseignant le publie — est chiffré pour
//! lui seul, et gardé dans le dossier de l'application. Il ne renvoie jamais
//! rien : il ne peut rien écraser.
//!
//! C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
//! cahier journal. Il transcrit sur place avec Whisper et range.
//!
//! Le dépôt prend deux chemins : droit sur l'ordinateur quand ils partagent
//! un WiFi, ou par un dossier de Nuage quand ils ne sont pas ensemble — scellé
//! alors pour l'ordinateur, que le téléphone lui-même ne peut pas rouvrir.

mod commandes;
mod portail;

use commandes::*;
use portail::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Le greffon des dialogues sert à demander confirmation avant
        // d'effacer un enregistrement — et il apporte au passage le pont
        // Swift de Tauri, que rien d'autre ne tire sur iPhone.
        .plugin(tauri_plugin_dialog::init())
        // L'appareil des pages d'un manuel, et la page de connexion à Nuage.
        .plugin(tauri_plugin_scanner::init())
        .invoke_handler(tauri::generate_handler![
            vocal_garder,
            vocaux_liste,
            vocal_lire,
            vocal_oublier,
            note_garder,
            notes_liste,
            note_oublier,
            // Le cahier journal publié par l'ordinateur, et ses aides à la tâche.
            journal_du_jour,
            aide_lire,
            // Le portail des tablettes : une aide montrée aux élèves, sur le réseau local.
            portail_ouvrir,
            portail_montrer,
            portail_cacher,
            portail_etat,
            portail_fermer,
            // Les photos nommées, pour Mes pictos.
            photo_garder,
            photos_liste,
            photo_lire,
            photo_oublier,
            creneaux_du_jour,
            creneau_maintenant,
            // Par Nuage : les dictées, les notes, l'emploi du temps.
            relais_lire,
            relais_ecrire,
            nuage_connexion_commencer,
            nuage_connexion_attendre,
            nuage_connexion_annuler,
            relais_oublier,
            relais_joignable,
            vocal_deposer,
            note_deposer,
            photo_deposer,
            creneaux_du_relais,
            // Par le WiFi, et seulement quand l'ordinateur le demande : pages et photos.
            demande_lire,
            demande_envoyer_photo,
            demande_terminer,
            // Les pages d'un manuel, gardées sur le téléphone jusqu'à ce qu'on les supprime.
            pages_etat,
            pages_envoyer,
            pages_oublier,
        ])
        .run(tauri::generate_context!())
        .expect("le dictaphone n'a pas pu démarrer");
}

