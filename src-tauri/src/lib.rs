mod ai;
mod arasaac;
mod jeux_pdf;
mod journal;
mod texte_crdt;
mod tla_pdf;
mod amis;
mod commands;
mod db;
mod models;
mod portable;
mod seed;
mod gevasco_pdf;
mod ppi_pdf;
mod sync;
mod synthese_pdf;

use commands::*;
use db::Db;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Une panique ne laissait aucune trace : la fenêtre n'a pas de console, et
    // l'on ne voyait que ses suites (« poisoned lock »). Elle s'écrit désormais
    // dans le journal d'incidents, avec l'endroit du code qui l'a produite.
    let habituel = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        commands::diag_ecrire(format!("PANIQUE {}", info.to_string().replace('\n', " — ")));
        habituel(info);
    }));

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
        .manage(arasaac::BanqueArasaac::default())
        .manage(portable::Portable(Mutex::new(None)))
        .manage(portable::PhotoCapture(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            // Séquences / séances
            sequences_list, sequence_save, sequence_delete,
            seances_list, seance_save, seance_delete,
            // Ateliers / espaces / progressions
            ateliers_list, atelier_save, atelier_delete,
            espaces_list, espace_save, espace_delete,
            atelier_espace_list, atelier_espace_set,
            jeux_list, jeu_save, jeu_delete,
            progressions_eleve_list, progression_eleve_save, progression_eleve_delete,
            // Planning
            creneaux_list, creneau_save, creneau_delete,
            // Élèves / appel / commentaires
            eleves_list, eleve_save, eleve_delete,
            document_eleve_get, document_eleve_set, documents_eleve_list,
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
            fichier_save, fichier_read, fichier_path, fichier_delete, fichier_importer_depuis_chemin, enregistrer_texte,
            imprimer_pdf, ouvrir_fichier, imprimer_planning, ouvrir_html, exporter_synthese_gs, exporter_bilan_ppi, exporter_gevasco,
            // Recherche
            recherche,
            // Export / Import
            export_data, import_data, exporter_base, sauvegardes_auto_list, sauvegardes_auto_ouvrir,
            // Vacances scolaires
            vacances_scolaires,
            // IA Mistral
            ai::mistral_chat, ai::mistral_test, ai::mistral_chat_stream, ai::transcrire_audio,
            ai::mistral_modeles_disponibles, ai::mistral_vision, ai::mistral_recherche_web,
            arasaac::arasaac_etat, arasaac::arasaac_telecharger, arasaac::arasaac_categories,
            arasaac::arasaac_selection, arasaac::arasaac_par_mots, arasaac::arasaac_image,
            arasaac::arasaac_chercher, arasaac::arasaac_nature,
            commands::jeu_generer, commands::tla_generer,
            commands::dossier_donnees_get, commands::dossier_donnees_set,
            commands::diag_ecrire, commands::diag_ouvrir, commands::fichier_ouvrir,
            commands::creneau_journal_save,
            commands::textes_list, commands::texte_save, commands::texte_delete,
            // Amis (appariement chiffré)
            amis::identite_get, amis::identite_set_nom,
            amis::invitation_creer, amis::invitation_accepter,
            amis::amis_list, amis::ami_set_verifie, amis::ami_supprimer,
            // Synchro chiffrée E2E (S3)
            sync::sync_config_get, sync::sync_config_set, sync::sync_test,
            sync::sync_envoyer, sync::sync_relever,
            sync::sequence_partager, sync::programmation_partager,
            sync::boite_relever, sync::boite_liste, sync::boite_recuperer, sync::boite_supprimer,
            // Sauvegarde chiffrée sur stockage S3/MinIO
            sync::sauvegarde_push, sync::sauvegarde_pull, sync::sauvegarde_liste, sync::sauvegarde_supprimer, sync::sync_etat, sync::sync_deltas, sync::sync_fichiers, sync::machines_liste, sync::machine_nom_set,
            sync::appairage_code, sync::appairage_appliquer,
            // Version portable (serveur local WiFi + QR)
            portable::portable_demarrer, portable::portable_arreter,
            // Capture photo depuis le téléphone
            portable::photo_capture_demarrer, portable::photo_capture_arreter,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
