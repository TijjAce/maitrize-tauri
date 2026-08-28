//! Commandes Tauri exposées au frontend (invoke). CRUD par entité +
//! réglages, fichiers, recherche et passerelle Mistral.

use crate::db::{fichiers_dir, Db};
use crate::models::*;
use rusqlite::{params, OptionalExtension};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

// ============================================================
// PROJETS
// ============================================================

#[tauri::command]
pub fn projets_list(db: State<Db>) -> R<Vec<Projet>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM projets ORDER BY date_creation DESC").map_err(e)?;
    let rows = st.query_map([], Projet::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn projet_save(db: State<Db>, projet: Projet) -> R<Projet> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO projets (id,titre,descriptif,couleur,date_creation,annee,image_nom)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![projet.id, projet.titre, projet.descriptif, projet.couleur,
                projet.date_creation, projet.annee, projet.image_nom],
    ).map_err(e)?;
    Ok(projet)
}

#[tauri::command]
pub fn projet_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM projets WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// SÉQUENCES
// ============================================================

#[tauri::command]
pub fn sequences_list(db: State<Db>) -> R<Vec<Sequence>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM sequences ORDER BY date_creation DESC").map_err(e)?;
    let rows = st.query_map([], Sequence::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn sequence_save(db: State<Db>, sequence: Sequence) -> R<Sequence> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO sequences
         (id,titre,matiere,cycle,objectifs,competences,competence_visee,image_nom,couleur,
          date_creation,periode,annee,rating_engagement,rating_facilite,rating_apprentissage,
          rating_date_maj,projet_id,video)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![sequence.id, sequence.titre, sequence.matiere, sequence.cycle,
                sequence.objectifs, sequence.competences, sequence.competence_visee,
                sequence.image_nom, sequence.couleur, sequence.date_creation, sequence.periode,
                sequence.annee, sequence.rating_engagement, sequence.rating_facilite,
                sequence.rating_apprentissage, sequence.rating_date_maj, sequence.projet_id, sequence.video],
    ).map_err(e)?;
    Ok(sequence)
}

#[tauri::command]
pub fn sequence_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM sequences WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// SÉANCES
// ============================================================

#[tauri::command]
pub fn seances_list(db: State<Db>, sequence_id: Option<String>) -> R<Vec<Seance>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &sequence_id {
        Some(sid) => ("SELECT * FROM seances WHERE sequence_id=?1 ORDER BY numero", vec![sid]),
        None => ("SELECT * FROM seances ORDER BY numero", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), Seance::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn seance_save(db: State<Db>, seance: Seance) -> R<Seance> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO seances
         (id,titre,numero,objectifs,competences,deroulement,materiel,duree,date,
          tableau_deroulement,images_deroulement,bilan,bilan_date,sequence_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![seance.id, seance.titre, seance.numero, seance.objectifs, seance.competences,
                seance.deroulement, seance.materiel, seance.duree, seance.date,
                seance.tableau_deroulement, seance.images_deroulement, seance.bilan,
                seance.bilan_date, seance.sequence_id],
    ).map_err(e)?;
    Ok(seance)
}

#[tauri::command]
pub fn seance_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM seances WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ATELIERS & ESPACES (+ M2M)
// ============================================================

#[tauri::command]
pub fn ateliers_list(db: State<Db>) -> R<Vec<Atelier>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM ateliers ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Atelier::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn atelier_save(db: State<Db>, atelier: Atelier) -> R<Atelier> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO ateliers
         (id,titre,matiere,objectifs,competences,materiel,nb_eleves_max,duree,couleur,
          date_creation,image_nom,dossier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![atelier.id, atelier.titre, atelier.matiere, atelier.objectifs,
                atelier.competences, atelier.materiel, atelier.nb_eleves_max, atelier.duree,
                atelier.couleur, atelier.date_creation, atelier.image_nom, atelier.dossier],
    ).map_err(e)?;
    Ok(atelier)
}

#[tauri::command]
pub fn atelier_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM ateliers WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn espaces_list(db: State<Db>) -> R<Vec<Espace>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM espaces ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Espace::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn espace_save(db: State<Db>, espace: Espace) -> R<Espace> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO espaces
         (id,titre,description_espace,nb_eleves_max,couleur,date_creation,image_nom,dossier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![espace.id, espace.titre, espace.description_espace, espace.nb_eleves_max,
                espace.couleur, espace.date_creation, espace.image_nom, espace.dossier],
    ).map_err(e)?;
    Ok(espace)
}

#[tauri::command]
pub fn espace_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM espaces WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ── Jeux (ludothèque de la classe) ───────────────────────────────────────

#[tauri::command]
pub fn jeux_list(db: State<Db>) -> R<Vec<Jeu>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM jeux ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Jeu::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn jeu_save(db: State<Db>, jeu: Jeu) -> R<Jeu> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO jeux
         (id,titre,type_jeu,description_jeu,regles,competences,nb_joueurs_min,nb_joueurs_max,
          duree,age_min,rangement,couleur,date_creation,image_nom,dossier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
        params![jeu.id, jeu.titre, jeu.type_jeu, jeu.description_jeu, jeu.regles, jeu.competences,
                jeu.nb_joueurs_min, jeu.nb_joueurs_max, jeu.duree, jeu.age_min, jeu.rangement,
                jeu.couleur, jeu.date_creation, jeu.image_nom, jeu.dossier],
    ).map_err(e)?;
    Ok(jeu)
}

#[tauri::command]
pub fn jeu_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM jeux WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

/// Liaisons atelier↔espace (paires). Renvoie [[atelierId, espaceId], …].
#[tauri::command]
pub fn atelier_espace_list(db: State<Db>) -> R<Vec<(String, String)>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT atelier_id, espace_id FROM atelier_espace").map_err(e)?;
    let rows = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn atelier_espace_set(db: State<Db>, espace_id: String, atelier_ids: Vec<String>) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM atelier_espace WHERE espace_id=?1", params![espace_id]).map_err(e)?;
    for aid in atelier_ids {
        c.execute("INSERT OR IGNORE INTO atelier_espace (atelier_id,espace_id) VALUES (?1,?2)",
                  params![aid, espace_id]).map_err(e)?;
    }
    Ok(())
}

// ── Progressions d'élève (suivi par espace) ──────────────────────────────
#[tauri::command]
pub fn progressions_eleve_list(db: State<Db>, espace_id: Option<String>) -> R<Vec<ProgressionEleve>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &espace_id {
        Some(id) => ("SELECT * FROM progressions_eleve WHERE espace_id=?1", vec![id]),
        None => ("SELECT * FROM progressions_eleve", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), ProgressionEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn progression_eleve_save(db: State<Db>, progression: ProgressionEleve) -> R<ProgressionEleve> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO progressions_eleve (id,nom_eleve,eleve_id,fait,espace_id)
         VALUES (?1,?2,?3,?4,?5)",
        params![progression.id, progression.nom_eleve, progression.eleve_id,
                progression.fait as i64, progression.espace_id],
    ).map_err(e)?;
    Ok(progression)
}

#[tauri::command]
pub fn progression_eleve_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM progressions_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// CRÉNEAUX (Planning)
// ============================================================

#[tauri::command]
pub fn creneaux_list(db: State<Db>, debut: Option<String>, fin: Option<String>) -> R<Vec<Creneau>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match (&debut, &fin) {
        (Some(d), Some(f)) =>
            ("SELECT * FROM creneaux WHERE date>=?1 AND date<=?2 ORDER BY date,heure_debut", vec![d, f]),
        _ => ("SELECT * FROM creneaux ORDER BY date,heure_debut", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), Creneau::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn creneau_save(db: State<Db>, creneau: Creneau) -> R<Creneau> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO creneaux
         (id,date,heure_debut,heure_fin,matiere,couleur,seance_id,atelier_id,espace_id,eleves_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![creneau.id, creneau.date, creneau.heure_debut, creneau.heure_fin,
                creneau.matiere, creneau.couleur, creneau.seance_id, creneau.atelier_id,
                creneau.espace_id, creneau.eleves_json],
    ).map_err(e)?;
    Ok(creneau)
}

#[tauri::command]
pub fn creneau_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM creneaux WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ÉLÈVES
// ============================================================

#[tauri::command]
pub fn eleves_list(db: State<Db>) -> R<Vec<Eleve>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM eleves ORDER BY nom").map_err(e)?;
    let rows = st.query_map([], Eleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn eleve_save(db: State<Db>, eleve: Eleve) -> R<Eleve> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO eleves (id,nom,niveau,present,ine,date_naissance,photo_fichier)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![eleve.id, eleve.nom, eleve.niveau, eleve.present as i64, eleve.ine,
                eleve.date_naissance, eleve.photo_fichier],
    ).map_err(e)?;
    Ok(eleve)
}

#[tauri::command]
pub fn eleve_delete(db: State<Db>, id: String) -> R<()> {
    let mut c = db.0.lock().map_err(e)?;
    effacer_eleve(&mut c, &id)
}

/// Efface un élève **et tout son dossier** : lignes liées, documents rangés
/// dans les réglages, fichiers joints, et présence dans les listes JSON
/// (créneaux, EDT type, plans de salle).
///
/// Les tables portant un `eleve_id` ne déclarent pas de clé étrangère vers
/// `eleves` — SQLite ne peut donc pas cascader. La suppression est faite ici,
/// en une transaction, pour qu'un dossier effacé le soit vraiment : un
/// enseignant doit pouvoir retirer un élève sans que ses données subsistent
/// dans les sauvegardes.
fn effacer_eleve(c: &mut rusqlite::Connection, id: &str) -> R<()> {
    // Fichiers à retirer du disque : relevés avant suppression des lignes.
    let mut fichiers: Vec<String> = Vec::new();
    if let Ok(Some(photo)) = c.query_row("SELECT photo_fichier FROM eleves WHERE id=?1", params![id],
        |r| r.get::<_, Option<String>>(0)) { fichiers.push(photo); }
    {
        let mut st = c.prepare("SELECT nom_fichier FROM papiers_eleve WHERE eleve_id=?1").map_err(e)?;
        let noms = st.query_map(params![id], |r| r.get::<_, String>(0)).map_err(e)?;
        for n in noms.flatten() { if !n.is_empty() { fichiers.push(n); } }
    }

    let tx = c.transaction().map_err(e)?;

    for table in ["appels_journalier", "commentaires_eleve", "notes_eleve", "papiers_eleve", "progressions_eleve"] {
        tx.execute(&format!("DELETE FROM {table} WHERE eleve_id=?1"), params![id]).map_err(e)?;
    }
    tx.execute("DELETE FROM eleves WHERE id=?1", params![id]).map_err(e)?;

    // Documents rangés dans `settings` : préfixés par l'élève (synthèse GS,
    // PPI, progressions, GEVA-Sco) ou suffixés (dispositif:<type>:<élève>).
    tx.execute(
        "DELETE FROM settings WHERE cle IN ('syntheseGS:'||?1, 'ppi:'||?1, 'progressions:'||?1, 'gevasco:'||?1)
            OR cle LIKE 'dispositif:%:'||?1",
        params![id]).map_err(e)?;

    // Listes d'élèves stockées en JSON : créneaux du planning, EDT type,
    // plans de salle. On réécrit uniquement les lignes réellement modifiées.
    retirer_des_creneaux(&tx, id)?;
    retirer_des_edt(&tx, id)?;
    retirer_des_plans(&tx, id)?;

    tx.commit().map_err(e)?;

    for nom in fichiers {
        std::fs::remove_file(fichiers_dir().join(&nom)).ok();
    }
    Ok(())
}

/// Retire l'élève des groupes restreints du planning (`creneaux.eleves_json`).
fn retirer_des_creneaux(c: &rusqlite::Connection, id: &str) -> R<()> {
    let lignes: Vec<(String, String)> = {
        let mut st = c.prepare("SELECT id, eleves_json FROM creneaux WHERE eleves_json LIKE '%'||?1||'%'").map_err(e)?;
        let it = st.query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)?
    };
    for (cid, brut) in lignes {
        let Ok(mut ids) = serde_json::from_str::<Vec<String>>(&brut) else { continue };
        let avant = ids.len();
        ids.retain(|x| x != id);
        if ids.len() != avant {
            let json = serde_json::to_string(&ids).unwrap_or_else(|_| "[]".into());
            c.execute("UPDATE creneaux SET eleves_json=?1 WHERE id=?2", params![json, cid]).map_err(e)?;
        }
    }
    Ok(())
}

/// Retire l'élève des créneaux de l'EDT type / organisation IME.
fn retirer_des_edt(c: &rusqlite::Connection, id: &str) -> R<()> {
    let lignes: Vec<(String, String)> = {
        let mut st = c.prepare("SELECT id, slots_json FROM edt_typique WHERE slots_json LIKE '%'||?1||'%'").map_err(e)?;
        let it = st.query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)?
    };
    for (eid, brut) in lignes {
        let Ok(mut slots) = serde_json::from_str::<Vec<serde_json::Value>>(&brut) else { continue };
        let mut touche = false;
        for slot in slots.iter_mut() {
            let Some(liste) = slot.get_mut("eleves").and_then(|v| v.as_array_mut()) else { continue };
            let avant = liste.len();
            liste.retain(|v| v.as_str() != Some(id));
            touche |= liste.len() != avant;
        }
        if touche {
            let json = serde_json::to_string(&slots).unwrap_or(brut);
            c.execute("UPDATE edt_typique SET slots_json=?1 WHERE id=?2", params![json, eid]).map_err(e)?;
        }
    }
    Ok(())
}

/// Libère les places occupées par l'élève dans les plans de salle.
fn retirer_des_plans(c: &rusqlite::Connection, id: &str) -> R<()> {
    for cle in ["salle:plans", "salle:plansMatiere"] {
        let brut: Option<String> = c.query_row("SELECT valeur FROM settings WHERE cle=?1", params![cle],
            |r| r.get(0)).optional().map_err(e)?;
        let Some(brut) = brut else { continue };
        let Ok(mut plans) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&brut) else { continue };
        let mut touche = false;
        for (_, plan) in plans.iter_mut() {
            let Some(places) = plan.get_mut("places").and_then(|v| v.as_object_mut()) else { continue };
            let vides: Vec<String> = places.iter()
                .filter(|(_, v)| v.as_str() == Some(id))
                .map(|(k, _)| k.clone()).collect();
            for k in vides { places.remove(&k); touche = true; }
        }
        if touche {
            let json = serde_json::to_string(&plans).unwrap_or(brut);
            c.execute("UPDATE settings SET valeur=?1 WHERE cle=?2", params![json, cle]).map_err(e)?;
        }
    }
    Ok(())
}

// ── Dossier de l'élève (documents) ───────────────────────────────────────
// Synthèse GS, PPI, GEVA-Sco, progressions, dispositifs : un enregistrement
// par élève et par type. La clé étrangère les efface avec l'élève.

/// Contenu d'un document, ou `None` s'il n'a jamais été rempli.
#[tauri::command]
pub fn document_eleve_get(db: State<Db>, eleve_id: String, type_doc: String) -> R<Option<String>> {
    let c = db.0.lock().map_err(e)?;
    c.query_row("SELECT donnees FROM documents_eleve WHERE eleve_id=?1 AND type=?2",
        params![eleve_id, type_doc], |r| r.get(0)).optional().map_err(e)
}

#[tauri::command]
pub fn document_eleve_set(db: State<Db>, eleve_id: String, type_doc: String, donnees: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT INTO documents_eleve (id, eleve_id, type, donnees, date_maj) VALUES (?1,?2,?3,?4,?5)
         ON CONFLICT(eleve_id, type) DO UPDATE SET donnees=excluded.donnees, date_maj=excluded.date_maj",
        params![format!("{eleve_id}:{type_doc}"), eleve_id, type_doc, donnees, now_iso()],
    ).map_err(e)?;
    Ok(())
}

/// Documents existants : tous, ceux d'un élève, ou tous ceux d'un type.
/// C'est ce qui permet de répondre à « quels élèves ont un PAP ? ».
#[tauri::command]
pub fn documents_eleve_list(db: State<Db>, eleve_id: Option<String>, type_doc: Option<String>) -> R<Vec<DocumentEleve>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match (&eleve_id, &type_doc) {
        (Some(id), Some(t)) => ("SELECT * FROM documents_eleve WHERE eleve_id=?1 AND type=?2", vec![id, t]),
        (Some(id), None) => ("SELECT * FROM documents_eleve WHERE eleve_id=?1", vec![id]),
        (None, Some(t)) => ("SELECT * FROM documents_eleve WHERE type=?1", vec![t]),
        (None, None) => ("SELECT * FROM documents_eleve", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), DocumentEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

// ── Appel journalier ─────────────────────────────────────────────────────
#[tauri::command]
pub fn appels_list(db: State<Db>, date: Option<String>) -> R<Vec<AppelJournalier>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &date {
        Some(d) => ("SELECT * FROM appels_journalier WHERE date=?1", vec![d]),
        None => ("SELECT * FROM appels_journalier ORDER BY date DESC", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), AppelJournalier::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn appel_save(db: State<Db>, appel: AppelJournalier) -> R<AppelJournalier> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO appels_journalier (id,date,statut_brut,eleve_id)
         VALUES (?1,?2,?3,?4)",
        params![appel.id, appel.date, appel.statut_brut, appel.eleve_id],
    ).map_err(e)?;
    Ok(appel)
}

#[tauri::command]
pub fn appel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM appels_journalier WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ── Commentaires / observations ──────────────────────────────────────────
#[tauri::command]
pub fn commentaires_list(db: State<Db>, eleve_id: Option<String>) -> R<Vec<CommentaireEleve>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &eleve_id {
        Some(id) => ("SELECT * FROM commentaires_eleve WHERE eleve_id=?1 ORDER BY date DESC", vec![id]),
        None => ("SELECT * FROM commentaires_eleve ORDER BY date DESC", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), CommentaireEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn commentaire_save(db: State<Db>, commentaire: CommentaireEleve) -> R<CommentaireEleve> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO commentaires_eleve (id,date,texte,type,eleve_id)
         VALUES (?1,?2,?3,?4,?5)",
        params![commentaire.id, commentaire.date, commentaire.texte, commentaire.r#type,
                commentaire.eleve_id],
    ).map_err(e)?;
    Ok(commentaire)
}

#[tauri::command]
pub fn commentaire_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM commentaires_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ÉVALUATIONS & NOTES
// ============================================================

#[tauri::command]
pub fn evaluations_list(db: State<Db>) -> R<Vec<Evaluation>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM evaluations ORDER BY date DESC").map_err(e)?;
    let rows = st.query_map([], Evaluation::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn evaluation_save(db: State<Db>, evaluation: Evaluation) -> R<Evaluation> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO evaluations
         (id,titre,matiere,date,bareme,periode,mode,competences_json,pdf_nom_fichier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![evaluation.id, evaluation.titre, evaluation.matiere, evaluation.date,
                evaluation.bareme, evaluation.periode, evaluation.mode,
                evaluation.competences_json, evaluation.pdf_nom_fichier],
    ).map_err(e)?;
    Ok(evaluation)
}

#[tauri::command]
pub fn evaluation_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM evaluations WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn notes_eleve_list(db: State<Db>, evaluation_id: Option<String>) -> R<Vec<NoteEleve>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &evaluation_id {
        Some(id) => ("SELECT * FROM notes_eleve WHERE evaluation_id=?1", vec![id]),
        None => ("SELECT * FROM notes_eleve", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), NoteEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn note_eleve_save(db: State<Db>, note: NoteEleve) -> R<NoteEleve> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO notes_eleve
         (id,eleve_nom,eleve_id,note,absent,commentaire,evaluation_id,niveaux_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![note.id, note.eleve_nom, note.eleve_id, note.note, note.absent as i64,
                note.commentaire, note.evaluation_id, note.niveaux_json],
    ).map_err(e)?;
    Ok(note)
}

#[tauri::command]
pub fn note_eleve_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM notes_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// MATÉRIEL
// ============================================================

#[tauri::command]
pub fn materiel_list(db: State<Db>) -> R<Vec<MaterielItem>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM materiel_items ORDER BY date_creation DESC").map_err(e)?;
    let rows = st.query_map([], MaterielItem::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn materiel_save(db: State<Db>, materiel: MaterielItem) -> R<MaterielItem> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO materiel_items
         (id,titre,description_materiel,competence_id,competence_titre,domaine_titre,
          sous_domaine_titre,cycle,images_json,pdfs_json,date_creation,seance_id,sequence_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        params![materiel.id, materiel.titre, materiel.description_materiel, materiel.competence_id,
                materiel.competence_titre, materiel.domaine_titre, materiel.sous_domaine_titre,
                materiel.cycle, materiel.images_json, materiel.pdfs_json, materiel.date_creation,
                materiel.seance_id, materiel.sequence_id],
    ).map_err(e)?;
    Ok(materiel)
}

#[tauri::command]
pub fn materiel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM materiel_items WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// PAPIERS DES ÉLÈVES
// ============================================================

#[tauri::command]
pub fn papiers_list(db: State<Db>) -> R<Vec<PapierEleve>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM papiers_eleve ORDER BY date_ajout DESC").map_err(e)?;
    let rows = st.query_map([], PapierEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn papier_save(db: State<Db>, papier: PapierEleve) -> R<PapierEleve> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO papiers_eleve (id,intitule,eleve_id,type,nom_fichier,note,date_ajout)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![papier.id, papier.intitule, papier.eleve_id, papier.r#type, papier.nom_fichier,
                papier.note, papier.date_ajout],
    ).map_err(e)?;
    Ok(papier)
}

#[tauri::command]
pub fn papier_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM papiers_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// RÉFÉRENTIELS & NOTES DE COMPÉTENCE
// ============================================================

#[tauri::command]
pub fn referentiels_list(db: State<Db>) -> R<Vec<Referentiel>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM referentiels ORDER BY cycle,nom").map_err(e)?;
    let rows = st.query_map([], Referentiel::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn referentiel_save(db: State<Db>, referentiel: Referentiel) -> R<Referentiel> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO referentiels (id,nom,cycle,donnees,est_integre,date_ajout,actif)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![referentiel.id, referentiel.nom, referentiel.cycle, referentiel.donnees,
                referentiel.est_integre as i64, referentiel.date_ajout, referentiel.actif as i64],
    ).map_err(e)?;
    Ok(referentiel)
}

#[tauri::command]
pub fn referentiel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM referentiels WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn notes_competence_list(db: State<Db>) -> R<Vec<NoteCompetence>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM notes_competence").map_err(e)?;
    let rows = st.query_map([], NoteCompetence::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn note_competence_save(db: State<Db>, note: NoteCompetence) -> R<NoteCompetence> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO notes_competence
         (id,competence_ref_id,texte,date_creation,date_modification)
         VALUES (?1,?2,?3,?4,?5)",
        params![note.id, note.competence_ref_id, note.texte, note.date_creation,
                note.date_modification],
    ).map_err(e)?;
    Ok(note)
}

// ============================================================
// ORGANISATION (progression annuelle, programmation finale, EDT type)
// ============================================================

#[tauri::command]
pub fn progressions_annuelle_list(db: State<Db>) -> R<Vec<ProgressionAnnuelle>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM progressions_annuelle ORDER BY annee,periode").map_err(e)?;
    let rows = st.query_map([], ProgressionAnnuelle::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn progression_annuelle_save(db: State<Db>, p: ProgressionAnnuelle) -> R<ProgressionAnnuelle> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO progressions_annuelle (id,annee,periode,colonnes_json,cellules_json)
         VALUES (?1,?2,?3,?4,?5)",
        params![p.id, p.annee, p.periode, p.colonnes_json, p.cellules_json],
    ).map_err(e)?;
    Ok(p)
}

#[tauri::command]
pub fn programmations_finale_list(db: State<Db>) -> R<Vec<ProgrammationFinale>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM programmations_finale ORDER BY annee").map_err(e)?;
    let rows = st.query_map([], ProgrammationFinale::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn programmation_finale_save(db: State<Db>, p: ProgrammationFinale) -> R<ProgrammationFinale> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO programmations_finale (id,annee,lignes_json,niveau,enseignant,est_importee)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![p.id, p.annee, p.lignes_json, p.niveau, p.enseignant, p.est_importee as i64],
    ).map_err(e)?;
    Ok(p)
}

#[tauri::command]
pub fn programmation_finale_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM programmations_finale WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn edt_typique_list(db: State<Db>) -> R<Vec<EdtTypique>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM edt_typique ORDER BY annee").map_err(e)?;
    let rows = st.query_map([], EdtTypique::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn edt_typique_save(db: State<Db>, edt: EdtTypique) -> R<EdtTypique> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO edt_typique (id,annee,slots_json) VALUES (?1,?2,?3)",
        params![edt.id, edt.annee, edt.slots_json],
    ).map_err(e)?;
    Ok(edt)
}

// ============================================================
// PIÈCES JOINTES
// ============================================================

#[tauri::command]
pub fn pieces_jointes_list(db: State<Db>, seance_id: Option<String>) -> R<Vec<PieceJointe>> {
    let c = db.0.lock().map_err(e)?;
    let (sql, p): (&str, Vec<&dyn rusqlite::ToSql>) = match &seance_id {
        Some(id) => ("SELECT * FROM pieces_jointes WHERE seance_id=?1 ORDER BY date_ajout", vec![id]),
        None => ("SELECT * FROM pieces_jointes ORDER BY date_ajout", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(p.as_slice(), PieceJointe::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn piece_jointe_save(db: State<Db>, piece: PieceJointe) -> R<PieceJointe> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO pieces_jointes
         (id,nom,type,nom_fichier,date_ajout,seance_id,a_imprimer)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![piece.id, piece.nom, piece.r#type, piece.nom_fichier, piece.date_ajout,
                piece.seance_id, piece.a_imprimer as i64],
    ).map_err(e)?;
    Ok(piece)
}

#[tauri::command]
pub fn piece_jointe_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM pieces_jointes WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// CONVERSATIONS PILOTE (IA)
// ============================================================

#[tauri::command]
pub fn conversations_list(db: State<Db>) -> R<Vec<PiloteConversation>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM pilote_conversations ORDER BY date_maj DESC").map_err(e)?;
    let rows = st.query_map([], PiloteConversation::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn conversation_save(db: State<Db>, conversation: PiloteConversation) -> R<PiloteConversation> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO pilote_conversations
         (id,titre,messages_json,date_creation,date_maj)
         VALUES (?1,?2,?3,?4,?5)",
        params![conversation.id, conversation.titre, conversation.messages_json,
                conversation.date_creation, conversation.date_maj],
    ).map_err(e)?;
    Ok(conversation)
}

#[tauri::command]
pub fn conversation_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM pilote_conversations WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// COFFRE-FORT (documents PDF)
// ============================================================

#[tauri::command]
pub fn coffre_list(db: State<Db>) -> R<Vec<DocumentCoffre>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT * FROM documents_coffre ORDER BY date_ajout DESC").map_err(e)?;
    let rows = st.query_map([], DocumentCoffre::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn coffre_save(db: State<Db>, document: DocumentCoffre) -> R<DocumentCoffre> {
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO documents_coffre (id,nom,nom_fichier,taille_octets,date_ajout)
         VALUES (?1,?2,?3,?4,?5)",
        params![document.id, document.nom, document.nom_fichier, document.taille_octets, document.date_ajout],
    ).map_err(e)?;
    Ok(document)
}

/// Télécharge un PDF distant (URL) dans le coffre-fort.
#[tauri::command]
pub async fn coffre_download(db: State<'_, Db>, url: String, nom: String) -> R<DocumentCoffre> {
    let resp = reqwest::get(&url).await.map_err(|e| format!("Réseau : {e}"))?;
    if !resp.status().is_success() { return Err(format!("HTTP {}", resp.status())); }
    let bytes = resp.bytes().await.map_err(|e| format!("Téléchargement : {e}"))?;
    let fichier = format!("{}.pdf", new_id());
    std::fs::write(fichiers_dir().join(&fichier), &bytes).map_err(e)?;
    let doc = DocumentCoffre {
        id: new_id(), nom, nom_fichier: fichier, taille_octets: bytes.len() as i64, date_ajout: now_iso(),
    };
    let c = db.0.lock().map_err(e)?;
    c.execute(
        "INSERT OR REPLACE INTO documents_coffre (id,nom,nom_fichier,taille_octets,date_ajout)
         VALUES (?1,?2,?3,?4,?5)",
        params![doc.id, doc.nom, doc.nom_fichier, doc.taille_octets, doc.date_ajout],
    ).map_err(e)?;
    Ok(doc)
}

#[tauri::command]
pub fn coffre_delete(db: State<Db>, id: String, nom_fichier: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM documents_coffre WHERE id=?1", params![id]).map_err(e)?;
    if !nom_fichier.is_empty() { std::fs::remove_file(fichiers_dir().join(&nom_fichier)).ok(); }
    Ok(())
}

// ============================================================
// RÉGLAGES (clé/valeur, remplace UserDefaults/@AppStorage)
// ============================================================

#[tauri::command]
pub fn settings_all(db: State<Db>) -> R<std::collections::HashMap<String, String>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT cle, valeur FROM settings").map_err(e)?;
    let rows = st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).map_err(e)?;
    let mut map = std::collections::HashMap::new();
    for row in rows { let (k, v) = row.map_err(e)?; map.insert(k, v); }
    Ok(map)
}

#[tauri::command]
pub fn setting_get(db: State<Db>, cle: String) -> R<Option<String>> {
    let c = db.0.lock().map_err(e)?;
    let v = c.query_row("SELECT valeur FROM settings WHERE cle=?1", params![cle],
                        |r| r.get::<_, String>(0)).ok();
    Ok(v)
}

#[tauri::command]
pub fn setting_set(db: State<Db>, cle: String, valeur: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("INSERT OR REPLACE INTO settings (cle,valeur) VALUES (?1,?2)",
              params![cle, valeur]).map_err(e)?;
    Ok(())
}

// ============================================================
// FICHIERS (images, PDF) — copie dans le dossier de données
// ============================================================

/// Écrit des octets (base64) dans Fichiers/ et renvoie le nom de fichier.
#[tauri::command]
pub fn fichier_save(nom: String, base64: String) -> R<String> {
    use base64::Engine;
    let data = base64::engine::general_purpose::STANDARD.decode(&base64).map_err(e)?;
    let ext = std::path::Path::new(&nom).extension()
        .and_then(|s| s.to_str()).unwrap_or("bin");
    let fichier = format!("{}.{}", new_id(), ext);
    std::fs::write(fichiers_dir().join(&fichier), data).map_err(e)?;
    Ok(fichier)
}

/// Lit un fichier joint et renvoie son contenu en base64 (pour <img>/PDF).
#[tauri::command]
pub fn fichier_read(nom: String) -> R<String> {
    use base64::Engine;
    let bytes = std::fs::read(fichiers_dir().join(&nom)).map_err(e)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

/// Chemin absolu d'un fichier joint (pour convertFileSrc côté frontend).
#[tauri::command]
pub fn fichier_path(nom: String) -> R<String> {
    Ok(fichiers_dir().join(&nom).to_string_lossy().to_string())
}

/// Copie un fichier externe (chemin absolu, ex. glisser-déposer depuis le
/// Finder/Aperçu) dans Fichiers/ et renvoie le nom généré. Évite l'aller-retour
/// en base64 pour les PDF/images potentiellement volumineux.
#[tauri::command]
pub fn fichier_importer_depuis_chemin(chemin: String) -> R<String> {
    let src = std::path::Path::new(&chemin);
    let ext = src.extension().and_then(|s| s.to_str()).unwrap_or("bin");
    let fichier = format!("{}.{}", new_id(), ext);
    std::fs::copy(src, fichiers_dir().join(&fichier)).map_err(e)?;
    Ok(fichier)
}

/// Écrit du texte à un chemin absolu choisi par l'utilisateur (dialog save).
/// Sert aux exports JSON (le téléchargement <a download> ne marche pas en WKWebView).
#[tauri::command]
pub fn enregistrer_texte(chemin: String, contenu: String) -> R<()> {
    std::fs::write(&chemin, contenu).map_err(e)?;
    Ok(())
}

/// Écrit un document HTML temporaire et l'ouvre dans le navigateur par défaut
/// (rendu riche : blocs positionnés, tableaux, images → imprimable / PDF natif).
#[tauri::command]
pub fn ouvrir_html(html: String) -> R<()> {
    let nom = format!(
        "maitrize-{}.html",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(nom);
    std::fs::write(&path, html).map_err(e)?;
    // Ouverture via NSWorkspace (plugin opener) → compatible App Sandbox.
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

// ── Impression du planning : génère un vrai PDF puis l'ouvre dans Aperçu ─────
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningCreneau {
    pub heure_debut: String,
    pub heure_fin: String,
    pub matiere: String,
    #[serde(default)]
    pub seance: String,
    #[serde(default)]
    pub couleur: String, // hex "#rrggbb"
    #[serde(default)]
    pub objectifs: String,
    #[serde(default)]
    pub deroulement: String, // texte nettoyé (sans marqueurs image/citation)
}
#[derive(serde::Deserialize)]
pub struct PlanningJour {
    pub jour: String,
    // Chaque « rang » regroupe des créneaux de même horaire (chevauchants),
    // affichés côte à côte. Les rangs s'empilent verticalement.
    pub rangs: Vec<Vec<PlanningCreneau>>,
}

fn hex_rgb(h: &str) -> (f32, f32, f32) {
    let s = h.trim_start_matches('#');
    if s.len() >= 6 {
        let p = |i: usize| u8::from_str_radix(&s[i..i + 2], 16).unwrap_or(120) as f32 / 255.0;
        (p(0), p(2), p(4))
    } else {
        (0.42, 0.44, 0.53)
    }
}
fn wrap_texte(s: &str, max: usize) -> Vec<String> {
    let mut lignes = vec![];
    let mut cur = String::new();
    for mot in s.split_whitespace() {
        if cur.is_empty() {
            cur = mot.to_string();
        } else if cur.chars().count() + 1 + mot.chars().count() <= max {
            cur.push(' ');
            cur.push_str(mot);
        } else {
            lignes.push(std::mem::take(&mut cur));
            cur = mot.to_string();
        }
    }
    if !cur.is_empty() {
        lignes.push(cur);
    }
    lignes
}

/// Construit un PDF du planning (mise en page inspirée de l'app native) et
/// l'ouvre dans l'app PDF par défaut (Aperçu sur macOS) → visualisation,
/// impression AirPrint et sauvegarde.
#[tauri::command]
pub fn imprimer_planning(titre: String, jours: Vec<PlanningJour>) -> R<()> {
    use printpdf::path::PaintMode;
    use printpdf::*;
    use std::fs::File;
    use std::io::BufWriter;

    let semaine = jours.len() > 1;
    // Jour : A4 portrait. Semaine : A4 paysage.
    let (lw, lh) = if semaine { (297.0f32, 210.0f32) } else { (210.0f32, 297.0f32) };
    let (doc, page1, layer1) = PdfDocument::new(&titre, Mm(lw), Mm(lh), "Calque 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(e)?;
    let gras = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(e)?;
    let mut layer = doc.get_page(page1).get_layer(layer1);

    let noir = Color::Rgb(Rgb::new(0.11, 0.13, 0.20, None));
    let gris = Color::Rgb(Rgb::new(0.42, 0.44, 0.53, None));
    let gris_clair = Color::Rgb(Rgb::new(0.80, 0.82, 0.88, None));
    let fond_ligne = Color::Rgb(Rgb::new(0.96, 0.965, 0.975, None));

    let rect_plein = |l: &PdfLayerReference, col: Color, x1: f32, y1: f32, x2: f32, y2: f32| {
        l.set_fill_color(col);
        l.add_rect(Rect::new(Mm(x1), Mm(y1), Mm(x2), Mm(y2)).with_mode(PaintMode::Fill));
    };

    // En-tête commun
    let marge = if semaine { 14.0 } else { 18.0 };
    let droite = lw - marge;
    let mut y = lh - marge;
    layer.set_fill_color(gris.clone());
    layer.use_text(if semaine { "PLANNING DE LA SEMAINE" } else { "PLANNING DU JOUR" }, 9.0, Mm(marge), Mm(y), &gras);
    y -= 8.0;
    layer.set_fill_color(noir.clone());
    layer.use_text(&titre.replace("Planning — ", ""), if semaine { 18.0 } else { 22.0 }, Mm(marge), Mm(y), &gras);
    y -= 6.0;
    layer.set_outline_color(gris_clair.clone());
    layer.set_outline_thickness(0.5);
    layer.add_line(Line { points: vec![(Point::new(Mm(marge), Mm(y)), false), (Point::new(Mm(droite), Mm(y)), false)], is_closed: false });
    y -= 8.0;

    let teinte = |c: &str| { let (r, g, b) = hex_rgb(c); Color::Rgb(Rgb::new(r * 0.2 + 0.8, g * 0.2 + 0.8, b * 0.2 + 0.8, None)) };
    let plein = |c: &str| { let (r, g, b) = hex_rgb(c); Color::Rgb(Rgb::new(r, g, b, None)) };

    if semaine {
        // Grille 5 colonnes (créneaux empilés par jour).
        let gap = 5.0f32;
        let col_w = (droite - marge - gap * (jours.len() as f32 - 1.0)) / jours.len() as f32;
        let haut_grille = y;
        for (i, j) in jours.iter().enumerate() {
            let x = marge + i as f32 * (col_w + gap);
            let mut cy = haut_grille;
            layer.set_fill_color(gris.clone());
            layer.use_text(&j.jour.to_uppercase(), 9.0, Mm(x), Mm(cy), &gras);
            cy -= 6.0;
            let vide = j.rangs.iter().all(|r| r.is_empty());
            if vide {
                layer.set_fill_color(gris_clair.clone());
                layer.use_text("—", 10.0, Mm(x), Mm(cy), &font);
                cy -= 6.0;
            }
            for c in j.rangs.iter().flatten() {
                let titre_c = if c.seance.is_empty() { c.matiere.clone() } else { c.seance.clone() };
                let lignes = wrap_texte(&titre_c, ((col_w - 6.0) / 1.8) as usize);
                let h = 7.0 + lignes.len() as f32 * 4.0;
                rect_plein(&layer, teinte(&c.couleur), x, cy - h + 2.0, x + col_w, cy + 4.0);
                rect_plein(&layer, plein(&c.couleur), x, cy - h + 2.0, x + 1.2, cy + 4.0);
                layer.set_fill_color(gris.clone());
                layer.use_text(&format!("{} – {}", c.heure_debut, c.heure_fin), 7.0, Mm(x + 3.0), Mm(cy), &gras);
                cy -= 4.0;
                layer.set_fill_color(noir.clone());
                for ln in &lignes {
                    layer.use_text(ln, 9.0, Mm(x + 3.0), Mm(cy), &font);
                    cy -= 4.0;
                }
                cy -= 4.0;
            }
        }
    } else {
        // Liste verticale (jour). Chaque rang = créneaux de même horaire côte à côte.
        let gauche = marge;
        let jour = &jours[0];
        if jour.rangs.iter().all(|r| r.is_empty()) {
            layer.set_fill_color(gris.clone());
            layer.use_text("Aucun créneau ce jour-là.", 12.0, Mm(gauche + 2.0), Mm(y - 8.0), &font);
        }
        for rang in &jour.rangs {
            if rang.is_empty() || y < 28.0 {
                continue;
            }
            let n = rang.len();
            if n == 1 {
                // Ligne pleine largeur : heures à gauche, titre à droite.
                let c = &rang[0];
                let top = y;
                let bas = top - 13.0;
                rect_plein(&layer, fond_ligne.clone(), gauche, bas, droite, top);
                rect_plein(&layer, plein(&c.couleur), gauche, bas, gauche + 1.6, top);
                layer.set_fill_color(noir.clone());
                layer.use_text(&c.heure_debut, 11.0, Mm(gauche + 5.0), Mm(top - 5.0), &gras);
                layer.set_fill_color(gris.clone());
                layer.use_text(&c.heure_fin, 9.0, Mm(gauche + 5.0), Mm(top - 10.0), &font);
                let titre_c = if c.seance.is_empty() { c.matiere.clone() } else { c.seance.clone() };
                layer.set_fill_color(noir.clone());
                layer.use_text(&titre_c, 12.0, Mm(gauche + 26.0), Mm(top - 5.0), &gras);
                if !c.seance.is_empty() && !c.matiere.is_empty() {
                    layer.set_fill_color(gris.clone());
                    layer.use_text(&c.matiere, 9.0, Mm(gauche + 26.0), Mm(top - 10.0), &font);
                }
                y = bas - 3.0;
            } else {
                // Plusieurs créneaux à la même horaire : colonnes côte à côte.
                let top = y;
                let h = 24.0;
                let bas = top - h;
                let gap = 4.0;
                let colw = (droite - gauche + gap) / n as f32;
                for (i, c) in rang.iter().enumerate() {
                    let x = gauche + i as f32 * colw;
                    let cw = colw - gap;
                    rect_plein(&layer, fond_ligne.clone(), x, bas, x + cw, top);
                    rect_plein(&layer, plein(&c.couleur), x, bas, x + 1.6, top);
                    layer.set_fill_color(noir.clone());
                    layer.use_text(&c.heure_debut, 10.0, Mm(x + 5.0), Mm(top - 5.0), &gras);
                    layer.set_fill_color(gris.clone());
                    layer.use_text(&c.heure_fin, 8.0, Mm(x + 5.0), Mm(top - 9.0), &font);
                    let titre_c = if c.seance.is_empty() { c.matiere.clone() } else { c.seance.clone() };
                    let mut ty = top - 15.0;
                    layer.set_fill_color(noir.clone());
                    for ln in wrap_texte(&titre_c, ((cw - 8.0) / 1.9).max(6.0) as usize).into_iter().take(2) {
                        layer.use_text(&ln, 10.0, Mm(x + 5.0), Mm(ty), &gras);
                        ty -= 4.0;
                    }
                    if !c.seance.is_empty() && !c.matiere.is_empty() {
                        layer.set_fill_color(gris.clone());
                        layer.use_text(&c.matiere, 8.0, Mm(x + 5.0), Mm(ty), &font);
                    }
                }
                y = bas - 3.0;
            }
        }

        // ── Détail des séances (objectifs + déroulement) ─────────────────
        let details: Vec<&PlanningCreneau> = jour
            .rangs
            .iter()
            .flatten()
            .filter(|c| !c.objectifs.trim().is_empty() || !c.deroulement.trim().is_empty())
            .collect();
        if !details.is_empty() {
            macro_rules! saut {
                ($min:expr) => {
                    if y < $min {
                        let (p, l) = doc.add_page(Mm(lw), Mm(lh), "Calque 1");
                        layer = doc.get_page(p).get_layer(l);
                        y = lh - marge;
                    }
                };
            }
            let max_car = ((droite - gauche - 6.0) / 1.95) as usize;
            y -= 6.0;
            saut!(40.0);
            layer.set_fill_color(gris.clone());
            layer.use_text("DÉTAIL DES SÉANCES", 9.0, Mm(gauche), Mm(y), &gras);
            y -= 5.0;
            layer.set_outline_color(gris_clair.clone());
            layer.set_outline_thickness(0.5);
            layer.add_line(Line { points: vec![(Point::new(Mm(gauche), Mm(y)), false), (Point::new(Mm(droite), Mm(y)), false)], is_closed: false });
            y -= 8.0;

            for c in details {
                saut!(34.0);
                let titre_c = if c.seance.is_empty() { c.matiere.clone() } else { c.seance.clone() };
                rect_plein(&layer, plein(&c.couleur), gauche, y - 1.0, gauche + 1.6, y + 4.0);
                layer.set_fill_color(noir.clone());
                layer.use_text(&format!("{} – {}   {}", c.heure_debut, c.heure_fin, titre_c), 12.0, Mm(gauche + 5.0), Mm(y), &gras);
                y -= 7.0;

                let bloc = |intitule: &str, texte: &str, layer: &mut PdfLayerReference, y: &mut f32| {
                    if texte.trim().is_empty() {
                        return;
                    }
                    layer.set_fill_color(gris.clone());
                    layer.use_text(intitule, 8.0, Mm(gauche + 5.0), Mm(*y), &gras);
                    *y -= 5.0;
                    layer.set_fill_color(noir.clone());
                    for para in texte.split('\n') {
                        let lignes = if para.trim().is_empty() { vec![String::new()] } else { wrap_texte(para, max_car) };
                        for ln in lignes {
                            layer.use_text(&ln, 10.0, Mm(gauche + 7.0), Mm(*y), &font);
                            *y -= 4.6;
                        }
                    }
                    *y -= 2.0;
                };
                // Objectifs puis déroulement ; saut de page géré entre les blocs.
                saut!(24.0);
                bloc("OBJECTIFS", &c.objectifs, &mut layer, &mut y);
                saut!(24.0);
                bloc("DÉROULEMENT", &c.deroulement, &mut layer, &mut y);
                y -= 4.0;
            }
        }
    }

    // Pied de page
    layer.set_fill_color(gris.clone());
    let pied = format!("Maitrize V2 · imprimé le {}", chrono::Local::now().format("%d/%m/%Y %H:%M"));
    layer.use_text(&pied, 8.0, Mm(marge), Mm(10.0), &font);

    let nom = format!(
        "planning-{}.pdf",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(nom);
    doc.save(&mut BufWriter::new(File::create(&path).map_err(e)?)).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Exporte la "Synthèse des acquis fin GS" en reconstruisant le tableau (mise
/// en page proche du gabarit MEN) avec des cellules d'observation extensibles.
#[tauri::command]
pub fn exporter_synthese_gs(
    ecole: String,
    eleve_nom: String,
    domaines: Vec<crate::synthese_pdf::SynDomIn>,
    date_visa_enseignant: String,
    enseignant_nom: String,
    directeur_nom: String,
    date_visa_directeur: String,
) -> R<()> {
    let donnees = crate::synthese_pdf::SyntheseDonnees {
        ecole,
        eleve_nom: eleve_nom.clone(),
        domaines,
        date_visa_enseignant,
        enseignant_nom,
        directeur_nom,
        date_visa_directeur,
    };
    let bytes = crate::synthese_pdf::generer(&donnees)?;
    let nom = format!(
        "synthese-gs-{}-{}.pdf",
        eleve_nom.replace(' ', "_"),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Remplit le formulaire officiel GEVA-Sco (support interactif CNSA) avec les
/// données saisies dans l'app, puis l'ouvre. Le fichier produit reste le
/// formulaire officiel, modifiable ensuite dans n'importe quel lecteur PDF.
///
/// `boutons` accepte trois formes de valeur : un nom d'état exact (« A »,
/// « Oui »…), `~motif` pour choisir l'état contenant le motif, `!motif` pour
/// celui qui ne le contient pas (les états longs et accentués du formulaire
/// sont ainsi désignés sans dépendre de leur encodage interne).
#[tauri::command]
pub fn exporter_gevasco(
    reexamen: bool,
    eleve_nom: String,
    textes: Vec<(String, String)>,
    boutons: Vec<(String, String)>,
) -> R<()> {
    use crate::gevasco_pdf::Champs;
    let mut champs = Champs::default();
    for (nom, valeur) in textes {
        champs.texte(&nom, valeur);
    }
    for (nom, etat) in boutons {
        if let Some(motif) = etat.strip_prefix('~') {
            champs.bouton_motif(&nom, motif, true);
        } else if let Some(motif) = etat.strip_prefix('!') {
            champs.bouton_motif(&nom, motif, false);
        } else {
            champs.bouton(&nom, &etat);
        }
    }
    let bytes = crate::gevasco_pdf::remplir(reexamen, &champs)?;
    let nom = format!(
        "GEVA-Sco {} {}.pdf",
        if reexamen { "reexamen" } else { "1re demande" },
        // Nom de fichier stable par élève : réimprimer remplace le même
        // document au lieu d'empiler une fenêtre d'Aperçu à chaque clic.
        eleve_nom.chars().map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' { c } else { '_' }).collect::<String>().trim().to_string()
    );
    let path = std::env::temp_dir().join(nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Exporte le bilan de PPI (mode IME/inclusion) en PDF et l'ouvre dans Aperçu.
#[tauri::command]
pub fn exporter_bilan_ppi(
    eleve_nom: String,
    ecole: String,
    enseignant_nom: String,
    date: String,
    besoins: String,
    amenagements: String,
    prises_en_charge: Vec<String>,
    objectifs: Vec<crate::ppi_pdf::ObjectifIn>,
    bilan_texte: String,
) -> R<()> {
    let donnees = crate::ppi_pdf::BilanPpi {
        eleve_nom: eleve_nom.clone(),
        ecole,
        enseignant_nom,
        date,
        besoins,
        amenagements,
        prises_en_charge,
        objectifs,
        bilan_texte,
    };
    let bytes = crate::ppi_pdf::generer(&donnees)?;
    let nom = format!(
        "bilan-ppi-{}-{}.pdf",
        eleve_nom.replace(' ', "_"),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Ouvre un fichier joint dans l'app par défaut du système (Aperçu pour un PDF
/// sur macOS), plutôt que dans une visionneuse interne.
#[tauri::command]
pub fn ouvrir_fichier(nom: String) -> R<()> {
    let path = fichiers_dir().join(&nom);
    if !path.exists() {
        return Err("Fichier introuvable".to_string());
    }
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Ouvre un PDF (fichier joint) dans l'app PDF par défaut (Aperçu sur macOS),
/// d'où l'utilisateur peut imprimer (⌘P → AirPrint, choix des pages). Passe par
/// NSWorkspace (plugin opener) → compatible App Sandbox / Mac App Store.
#[tauri::command]
pub fn imprimer_pdf(nom: String) -> R<()> {
    let path = fichiers_dir().join(&nom);
    if !path.exists() {
        return Err("Fichier introuvable".to_string());
    }
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn fichier_delete(nom: String) -> R<()> {
    std::fs::remove_file(fichiers_dir().join(&nom)).ok();
    Ok(())
}

// ============================================================
// RECHERCHE transversale (simple LIKE multi-tables)
// ============================================================

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultatRecherche {
    pub kind: String,   // "sequence" | "atelier" | "espace" | "eleve" | "materiel"
    pub id: String,
    pub titre: String,
    pub sous_titre: String,
}

#[tauri::command]
pub fn recherche(db: State<Db>, q: String) -> R<Vec<ResultatRecherche>> {
    let c = db.0.lock().map_err(e)?;
    let like = format!("%{}%", q);
    let mut out = Vec::new();

    let mut push = |sql: &str, kind: &str| -> R<()> {
        let mut st = c.prepare(sql).map_err(e)?;
        let rows = st.query_map(params![like], |r| {
            Ok(ResultatRecherche {
                kind: kind.to_string(),
                id: r.get(0)?, titre: r.get(1)?, sous_titre: r.get(2)?,
            })
        }).map_err(e)?;
        for row in rows { out.push(row.map_err(e)?); }
        Ok(())
    };

    push("SELECT id,titre,matiere FROM sequences WHERE titre LIKE ?1 OR objectifs LIKE ?1", "sequence")?;
    push("SELECT id,titre,matiere FROM ateliers WHERE titre LIKE ?1 OR objectifs LIKE ?1", "atelier")?;
    push("SELECT id,titre,description_espace FROM espaces WHERE titre LIKE ?1", "espace")?;
    push("SELECT id,nom,niveau FROM eleves WHERE nom LIKE ?1", "eleve")?;
    push("SELECT id,titre,competence_titre FROM materiel_items WHERE titre LIKE ?1", "materiel")?;
    Ok(out)
}

// ============================================================
// VACANCES SCOLAIRES (API officielle data.education.gouv.fr)
// ============================================================

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VacancePeriode {
    pub description: String,
    pub debut: String, // yyyy-mm-dd
    pub fin: String,
}

/// Récupère les vacances scolaires d'une zone ("A"|"B"|"C") via l'API ODS v2.1.
#[tauri::command]
pub async fn vacances_scolaires(zone: String) -> R<Vec<VacancePeriode>> {
    let url = format!(
        "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=100&refine=zones%3AZone%20{}&timezone=Europe%2FParis&lang=fr",
        zone
    );
    let resp = reqwest::get(&url).await.map_err(|e| format!("Réseau : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let v: serde_json::Value = resp.json().await.map_err(|e| format!("JSON : {e}"))?;
    let mut out = Vec::new();
    let mut vus = std::collections::HashSet::new();
    if let Some(results) = v.get("results").and_then(|r| r.as_array()) {
        for rec in results {
            let desc = rec.get("description").and_then(|x| x.as_str()).unwrap_or("");
            let start = rec.get("start_date").and_then(|x| x.as_str()).unwrap_or("");
            let end = rec.get("end_date").and_then(|x| x.as_str()).unwrap_or("");
            if desc.is_empty() || start.is_empty() || end.is_empty() { continue; }
            let cle = format!("{desc}|{start}|{end}");
            if !vus.insert(cle) { continue; }
            out.push(VacancePeriode {
                description: desc.to_string(),
                debut: start.chars().take(10).collect(),
                fin: end.chars().take(10).collect(),
            });
        }
    }
    Ok(out)
}

// ============================================================
// EXPORT / IMPORT (sauvegarde JSON de toutes les données)
// ============================================================

// Tables exportées (les référentiels intégrés sont exclus : re-seedés).
const TABLES_EXPORT: &[&str] = &[
    "projets", "sequences", "seances", "ateliers", "espaces", "atelier_espace", "jeux",
    "progressions_eleve", "creneaux", "eleves", "documents_eleve", "appels_journalier",
    "commentaires_eleve", "evaluations", "notes_eleve", "pieces_jointes",
    "materiel_items", "papiers_eleve", "notes_competence", "progressions_annuelle",
    "programmations_finale", "edt_typique", "pilote_conversations",
    "referentiels", "documents_coffre", "settings",
];

fn rusqlite_value_to_json(v: rusqlite::types::Value) -> serde_json::Value {
    use rusqlite::types::Value as V;
    match v {
        V::Null => serde_json::Value::Null,
        V::Integer(i) => serde_json::Value::from(i),
        V::Real(f) => serde_json::Value::from(f),
        V::Text(s) => serde_json::Value::from(s),
        V::Blob(b) => {
            use base64::Engine;
            serde_json::Value::from(base64::engine::general_purpose::STANDARD.encode(b))
        }
    }
}

fn table_to_json(c: &rusqlite::Connection, table: &str) -> R<Vec<serde_json::Value>> {
    let mut st = c.prepare(&format!("SELECT * FROM {table}")).map_err(e)?;
    let cols: Vec<String> = st.column_names().iter().map(|s| s.to_string()).collect();
    let n = cols.len();
    let rows = st.query_map([], |row| {
        let mut obj = serde_json::Map::new();
        for (i, name) in cols.iter().enumerate() {
            let v: rusqlite::types::Value = row.get(i)?;
            obj.insert(name.clone(), rusqlite_value_to_json(v));
        }
        let _ = n;
        Ok(serde_json::Value::Object(obj))
    }).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

/// Une copie automatique de la base (nom, date, taille).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SauvegardeAuto {
    pub nom: String,
    pub jour: String,
    pub octets: u64,
}

/// Liste les copies quotidiennes, de la plus récente à la plus ancienne.
#[tauri::command]
pub fn sauvegardes_auto_list() -> R<Vec<SauvegardeAuto>> {
    let dir = crate::db::sauvegardes_dir();
    let Ok(entrees) = std::fs::read_dir(&dir) else { return Ok(vec![]) };
    let mut out: Vec<SauvegardeAuto> = entrees
        .flatten()
        .filter_map(|f| {
            let nom = f.file_name().to_string_lossy().to_string();
            let jour = nom.strip_prefix("maitrize-")?.strip_suffix(".sqlite3")?.to_string();
            let octets = f.metadata().map(|m| m.len()).unwrap_or(0);
            Some(SauvegardeAuto { nom, jour, octets })
        })
        .collect();
    out.sort_by(|a, b| b.jour.cmp(&a.jour));
    Ok(out)
}

/// Ouvre le dossier des copies automatiques dans le Finder / l'Explorateur.
#[tauri::command]
pub fn sauvegardes_auto_ouvrir() -> R<()> {
    tauri_plugin_opener::open_path(crate::db::sauvegardes_dir(), None::<&str>).map_err(e)
}

/// Exporte une copie consistante de la base SQLite vers un chemin choisi.
/// `VACUUM INTO` intègre le WAL et produit un fichier unique et propre.
#[tauri::command]
pub fn exporter_base(db: State<Db>, chemin: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    std::fs::remove_file(&chemin).ok(); // VACUUM INTO échoue si la cible existe
    c.execute("VACUUM INTO ?1", params![chemin]).map_err(e)?;
    Ok(())
}

/// Sérialise toutes les données utilisateur en un JSON unique (sauvegarde).
#[tauri::command]
pub fn export_data(db: State<Db>) -> R<String> {
    let c = db.0.lock().map_err(e)?;
    export_json(&c)
}

/// Construit le JSON d'export complet depuis une connexion (réutilisable, sous verrou).
pub fn export_json(c: &rusqlite::Connection) -> R<String> {
    let mut root = serde_json::Map::new();
    root.insert("_format".into(), serde_json::Value::from("maitrize-backup-v1"));
    root.insert("_date".into(), serde_json::Value::from(now_iso()));
    for t in TABLES_EXPORT {
        // settings : on n'exporte pas la clé API (sensible).
        let rows = table_to_json(&c, t)?;
        let rows = if *t == "settings" {
            rows.into_iter().filter(|r| r.get("cle").and_then(|v| v.as_str()) != Some("mistralApiKey")).collect()
        } else if *t == "referentiels" {
            // N'exporte que les référentiels personnalisés (les intégrés sont re-seedés).
            rows.into_iter().filter(|r| r.get("est_integre").and_then(|v| v.as_i64()) != Some(1)).collect()
        } else { rows };
        root.insert((*t).to_string(), serde_json::Value::Array(rows));
    }

    // Fichiers joints (photos, PDF) embarqués en base64 → sauvegarde complète.
    use base64::Engine;
    let mut fichiers = serde_json::Map::new();
    if let Ok(entries) = std::fs::read_dir(fichiers_dir()) {
        for entry in entries.flatten() {
            if let Ok(bytes) = std::fs::read(entry.path()) {
                if let Some(nom) = entry.file_name().to_str() {
                    fichiers.insert(nom.to_string(),
                        serde_json::Value::from(base64::engine::general_purpose::STANDARD.encode(bytes)));
                }
            }
        }
    }
    root.insert("_fichiers".into(), serde_json::Value::Object(fichiers));

    serde_json::to_string_pretty(&serde_json::Value::Object(root)).map_err(e)
}

/// Restaure depuis un JSON produit par export_data (remplace les données).
#[tauri::command]
pub fn import_data(db: State<Db>, json: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    import_json(&c, &json)
}

/// Restaure depuis un JSON d'export, sur une connexion (réutilisable, sous verrou).
pub fn import_json(c: &rusqlite::Connection, json: &str) -> R<()> {
    let root: serde_json::Value = serde_json::from_str(json).map_err(e)?;
    let obj = root.as_object().ok_or("JSON racine invalide")?;

    for t in TABLES_EXPORT {
        let Some(arr) = obj.get(*t).and_then(|v| v.as_array()) else { continue };
        // Ne pas vider les référentiels intégrés (table non listée). Pour
        // settings on garde la clé API existante.
        if *t == "settings" {
            c.execute("DELETE FROM settings WHERE cle != 'mistralApiKey'", []).map_err(e)?;
        } else if *t == "referentiels" {
            // Ne touche pas aux référentiels intégrés (seedés au démarrage).
            c.execute("DELETE FROM referentiels WHERE est_integre=0", []).map_err(e)?;
        } else {
            c.execute(&format!("DELETE FROM {t}"), []).map_err(e)?;
        }
        for row in arr {
            let Some(o) = row.as_object() else { continue };
            let cols: Vec<&String> = o.keys().collect();
            if cols.is_empty() { continue; }
            let placeholders: Vec<String> = (1..=cols.len()).map(|i| format!("?{i}")).collect();
            let sql = format!("INSERT OR REPLACE INTO {t} ({}) VALUES ({})",
                cols.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(","),
                placeholders.join(","));
            let vals: Vec<rusqlite::types::Value> = cols.iter().map(|k| {
                match &o[*k] {
                    serde_json::Value::Null => rusqlite::types::Value::Null,
                    serde_json::Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
                    serde_json::Value::Number(n) => {
                        if let Some(i) = n.as_i64() { rusqlite::types::Value::Integer(i) }
                        else { rusqlite::types::Value::Real(n.as_f64().unwrap_or(0.0)) }
                    }
                    serde_json::Value::String(s) => rusqlite::types::Value::Text(s.clone()),
                    other => rusqlite::types::Value::Text(other.to_string()),
                }
            }).collect();
            let refs: Vec<&dyn rusqlite::ToSql> = vals.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
            c.execute(&sql, refs.as_slice()).map_err(e)?;
        }
    }

    // Restaure les fichiers joints (photos, PDF).
    if let Some(fichiers) = obj.get("_fichiers").and_then(|v| v.as_object()) {
        use base64::Engine;
        let dir = fichiers_dir();
        for (nom, val) in fichiers {
            if let Some(b64) = val.as_str() {
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64) {
                    std::fs::write(dir.join(nom), bytes).ok();
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests_eleve {
    use super::*;
    use rusqlite::Connection;

    /// Base en mémoire avec le schéma réel.
    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.pragma_update(None, "foreign_keys", "ON").ok();
        crate::db::migrate(&c);
        c
    }

    fn set(c: &Connection, cle: &str, val: &str) {
        c.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)", params![cle, val]).unwrap();
    }
    fn compte(c: &Connection, sql: &str) -> i64 {
        c.query_row(sql, [], |r| r.get(0)).unwrap()
    }

    /// Les dossiers rangés jadis dans `settings` doivent rejoindre la table
    /// au démarrage, sans perte, et sans traîner de clés orphelines.
    #[test]
    fn migration_des_documents_depuis_les_reglages() {
        let c = Connection::open_in_memory().unwrap();
        c.pragma_update(None, "foreign_keys", "ON").ok();
        // La table `eleves` doit exister avant que la migration ne cherche
        // à qui rattacher les documents.
        crate::db::migrate(&c);
        c.execute("INSERT INTO eleves (id, nom) VALUES ('e1','Apolline')", []).unwrap();
        // Documents à l'ancienne, dont un appartenant à un élève disparu.
        set(&c, "syntheseGS:e1", r#"{"a":1}"#);
        set(&c, "dispositif:pap:e1", r#"{"b":2}"#);
        set(&c, "gevasco:fantome", "{}");
        set(&c, "anneeCourante", "2026-2027"); // réglage normal : à ne pas toucher

        crate::db::migrer_documents_eleve(&c);

        let lu = |t: &str| -> Option<String> {
            c.query_row("SELECT donnees FROM documents_eleve WHERE eleve_id='e1' AND type=?1",
                params![t], |r| r.get(0)).optional().unwrap()
        };
        assert_eq!(lu("syntheseGS").as_deref(), Some(r#"{"a":1}"#));
        assert_eq!(lu("dispositif:pap").as_deref(), Some(r#"{"b":2}"#), "le type composé doit être conservé");
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM documents_eleve"), 2, "l'élève disparu ne doit rien créer");
        // Les anciennes clés ont disparu, les réglages normaux sont intacts.
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM settings WHERE cle LIKE '%:e1'"), 0);
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM settings WHERE cle='gevasco:fantome'"), 0);
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM settings WHERE cle='anneeCourante'"), 1);

        // Relancer ne casse rien.
        crate::db::migrer_documents_eleve(&c);
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM documents_eleve"), 2);
    }

    /// La clé étrangère doit emporter les documents avec l'élève.
    #[test]
    fn suppression_emporte_les_documents() {
        let mut c = base();
        c.execute("INSERT INTO eleves (id, nom) VALUES ('e1','A'), ('e2','B')", []).unwrap();
        for id in ["e1", "e2"] {
            c.execute("INSERT INTO documents_eleve (id, eleve_id, type, donnees, date_maj)
                       VALUES (?1, ?2, 'gevasco', '{}', '')", params![format!("{id}:gevasco"), id]).unwrap();
        }
        effacer_eleve(&mut c, "e1").unwrap();
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM documents_eleve WHERE eleve_id='e1'"), 0);
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM documents_eleve WHERE eleve_id='e2'"), 1);
    }

    /// Supprimer un élève doit vider tout son dossier : lignes liées,
    /// documents des réglages et présence dans les listes JSON. Sans quoi ces
    /// données ressortent dans les sauvegardes.
    #[test]
    fn suppression_efface_tout_le_dossier() {
        let mut c = base();
        let (a, b) = ("el-a", "el-b");
        for id in [a, b] {
            c.execute("INSERT INTO eleves (id, nom) VALUES (?1, ?2)", params![id, id]).unwrap();
            c.execute("INSERT INTO appels_journalier (id, date, eleve_id) VALUES (?1,'2026-01-01',?2)",
                params![format!("ap-{id}"), id]).unwrap();
            c.execute("INSERT INTO commentaires_eleve (id, date, eleve_id) VALUES (?1,'2026-01-01',?2)",
                params![format!("co-{id}"), id]).unwrap();
            c.execute("INSERT INTO notes_eleve (id, eleve_id) VALUES (?1,?2)", params![format!("no-{id}"), id]).unwrap();
            c.execute("INSERT INTO papiers_eleve (id, eleve_id, date_ajout) VALUES (?1,?2,'2026-01-01')",
                params![format!("pa-{id}"), id]).unwrap();
            c.execute("INSERT INTO progressions_eleve (id, eleve_id) VALUES (?1,?2)", params![format!("pr-{id}"), id]).unwrap();
            set(&c, &format!("syntheseGS:{id}"), "{}");
            set(&c, &format!("gevasco:{id}"), "{}");
            set(&c, &format!("ppi:{id}"), "{}");
            set(&c, &format!("progressions:{id}"), "[]");
            set(&c, &format!("dispositif:pap:{id}"), "{}");
        }
        c.execute("INSERT INTO creneaux (id, date, eleves_json) VALUES ('cr1','2026-01-01',?1)",
            params![format!("[\"{a}\",\"{b}\"]")]).unwrap();
        c.execute("INSERT INTO edt_typique (id, annee, slots_json) VALUES ('edt1','IME:2026-01-05',?1)",
            params![format!("[{{\"id\":\"s1\",\"eleves\":[\"{a}\",\"{b}\"]}}]")]).unwrap();
        set(&c, "salle:plans", &format!("{{\"cr1\":{{\"places\":{{\"p1\":\"{a}\",\"p2\":\"{b}\"}},\"notes\":{{}}}}}}"));
        set(&c, "salle:plansMatiere", &format!("{{\"Scolarité\":{{\"places\":{{\"p1\":\"{a}\"}},\"notes\":{{}}}}}}"));

        effacer_eleve(&mut c, a).unwrap();

        // Plus aucune trace de l'élève supprimé…
        for t in ["appels_journalier", "commentaires_eleve", "notes_eleve", "papiers_eleve", "progressions_eleve"] {
            let n = compte(&c, &format!("SELECT COUNT(*) FROM {t} WHERE eleve_id='{a}'"));
            assert_eq!(n, 0, "{t} garde des lignes orphelines");
            assert_eq!(compte(&c, &format!("SELECT COUNT(*) FROM {t} WHERE eleve_id='{b}'")), 1,
                "{t} : l'autre élève ne doit pas être touché");
        }
        assert_eq!(compte(&c, &format!("SELECT COUNT(*) FROM eleves WHERE id='{a}'")), 0);
        assert_eq!(compte(&c, &format!("SELECT COUNT(*) FROM settings WHERE cle LIKE '%{a}'")), 0,
            "des documents restent dans les réglages");
        assert_eq!(compte(&c, &format!("SELECT COUNT(*) FROM settings WHERE cle LIKE '%{b}'")), 5,
            "les documents de l'autre élève doivent survivre");

        // …y compris dans les listes JSON.
        let cren: String = c.query_row("SELECT eleves_json FROM creneaux WHERE id='cr1'", [], |r| r.get(0)).unwrap();
        assert_eq!(cren, format!("[\"{b}\"]"), "créneau : élève non retiré");
        let edt: String = c.query_row("SELECT slots_json FROM edt_typique WHERE id='edt1'", [], |r| r.get(0)).unwrap();
        assert!(!edt.contains(a) && edt.contains(b), "EDT type : élève non retiré ({edt})");
        let plans: String = c.query_row("SELECT valeur FROM settings WHERE cle='salle:plans'", [], |r| r.get(0)).unwrap();
        assert!(!plans.contains(a) && plans.contains(b), "plan de salle : place non libérée ({plans})");
        let mat: String = c.query_row("SELECT valeur FROM settings WHERE cle='salle:plansMatiere'", [], |r| r.get(0)).unwrap();
        assert!(!mat.contains(a), "plan par matière : place non libérée ({mat})");
    }
}
