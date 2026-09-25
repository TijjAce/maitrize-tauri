//! Le dictaphone de classe : enregistrer, garder, déposer.
//!
//! Ce téléphone ne connaît rien de la classe. Ni les élèves, ni le planning,
//! ni les séances : il enregistre du son et l'heure où il a été dit, et c'est
//! tout. Perdu dans un couloir, il ne trahit personne ; n'ayant rien à
//! renvoyer, il ne peut rien écraser non plus.
//!
//! C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
//! cahier journal. Il transcrit sur place avec Whisper et range.

mod commandes;

use commandes::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ordinateur_lire,
            ordinateur_ecrire,
            ordinateur_joignable,
            vocal_garder,
            vocaux_liste,
            vocal_oublier,
            vocal_envoyer,
        ])
        .run(tauri::generate_context!())
        .expect("le dictaphone n'a pas pu démarrer");
}

