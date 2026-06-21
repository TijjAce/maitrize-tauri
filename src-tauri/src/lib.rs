mod ai;
mod amis;
mod commands;
mod db;
mod models;
mod portable;
mod seed;
mod sync;

use commands::*;
use db::Db;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let conn = db::open();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Fenêtre opaque standard (pas d'API privée macOS) → compatible
        // Mac App Store / Microsoft Store.
        .setup(|app| {
            // Mises à jour automatiques (distribution directe hors stores).
            // Plugins desktop uniquement.
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            Ok(())
        })
        .manage(Db(Mutex::new(conn)))
        .manage(portable::Portable(Mutex::new(None)))
        .manage(portable::PhotoCapture(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            // Projets
            projets_list, projet_save, projet_delete,
            // Séquences / séances
            sequences_list, sequence_save, sequence_delete,
            seances_list, seance_save, seance_delete,
            // Ateliers / espaces / progressions
            ateliers_list, atelier_save, atelier_delete,
            espaces_list, espace_save, espace_delete,
            atelier_espace_list, atelier_espace_set,
            progressions_eleve_list, progression_eleve_save, progression_eleve_delete,
            // Planning
            creneaux_list, creneau_save, creneau_delete,
            // Élèves / appel / commentaires
            eleves_list, eleve_save, eleve_delete,
            appels_list, appel_save, appel_delete,
            commentaires_list, commentaire_save, commentaire_delete,
            // Évaluations / notes
            evaluations_list, evaluation_save, evaluation_delete,
            notes_eleve_list, note_eleve_save, note_eleve_delete,
            // Matériel
            materiel_list, materiel_save, materiel_delete,
            // Papiers
            papiers_list, papier_save, papier_delete,
            // Référentiels / notes de compétence
            referentiels_list, referentiel_save, referentiel_delete,
            notes_competence_list, note_competence_save,
            // Organisation
            progressions_annuelle_list, progression_annuelle_save,
            programmations_finale_list, programmation_finale_save, programmation_finale_delete,
            edt_typique_list, edt_typique_save,
            // Pièces jointes
            pieces_jointes_list, piece_jointe_save, piece_jointe_delete,
            // Conversations IA
            conversations_list, conversation_save, conversation_delete,
            // Coffre-fort
            coffre_list, coffre_save, coffre_delete, coffre_download,
            // Réglages
            settings_all, setting_get, setting_set,
            // Fichiers
            fichier_save, fichier_read, fichier_path, fichier_delete, enregistrer_texte,
            imprimer_pdf, ouvrir_fichier, imprimer_planning, ouvrir_html,
            // Recherche
            recherche,
            // Export / Import
            export_data, import_data, exporter_base,
            // Vacances scolaires
            vacances_scolaires,
            // IA Mistral
            ai::mistral_chat, ai::mistral_test, ai::mistral_chat_stream,
            // Amis (appariement chiffré)
            amis::identite_get, amis::identite_set_nom,
            amis::invitation_creer, amis::invitation_accepter,
            amis::amis_list, amis::ami_set_verifie, amis::ami_supprimer,
            // Synchro chiffrée E2E (S3)
            sync::sync_config_get, sync::sync_config_set, sync::sync_test,
            sync::sync_envoyer, sync::sync_relever,
            sync::sequence_partager, sync::programmation_partager, sync::projet_partager,
            sync::boite_relever, sync::boite_liste, sync::boite_recuperer, sync::boite_supprimer,
            // Sauvegarde chiffrée sur stockage S3/MinIO
            sync::sauvegarde_push, sync::sauvegarde_pull,
            // Version portable (serveur local WiFi + QR)
            portable::portable_demarrer, portable::portable_arreter,
            // Capture photo depuis le téléphone
            portable::photo_capture_demarrer, portable::photo_capture_arreter,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
