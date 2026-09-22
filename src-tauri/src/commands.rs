//! Commandes Tauri exposées au frontend (invoke). CRUD par entité +
//! réglages, fichiers, recherche et passerelle Mistral.

use crate::db::{fichiers_dir, Db};
use crate::models::*;
use rusqlite::{params, OptionalExtension};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

// ============================================================
// SÉQUENCES
// ============================================================

#[tauri::command]
pub fn sequences_list(db: State<Db>) -> R<Vec<Sequence>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM sequences ORDER BY date_creation DESC").map_err(e)?;
    let rows = st.query_map([], Sequence::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn sequence_save(db: State<Db>, sequence: Sequence) -> R<Sequence> {
    let c = db.lock();
    ecrire_sequence(&c, sequence)
}

pub(crate) fn ecrire_sequence(c: &rusqlite::Connection, sequence: Sequence) -> R<Sequence> {
    c.execute(
        "INSERT INTO sequences (id,titre,matiere,cycle,objectifs,competences,competence_visee,image_nom,couleur,
          date_creation,periode,annee,rating_engagement,rating_facilite,rating_apprentissage,
          rating_date_maj,projet_id,video,dossier,nb_seances_prevu)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, matiere = excluded.matiere, cycle = excluded.cycle, objectifs = excluded.objectifs, competences = excluded.competences, competence_visee = excluded.competence_visee, image_nom = excluded.image_nom, couleur = excluded.couleur, date_creation = excluded.date_creation, periode = excluded.periode, annee = excluded.annee, rating_engagement = excluded.rating_engagement, rating_facilite = excluded.rating_facilite, rating_apprentissage = excluded.rating_apprentissage, rating_date_maj = excluded.rating_date_maj, projet_id = excluded.projet_id, video = excluded.video, dossier = excluded.dossier, nb_seances_prevu = excluded.nb_seances_prevu",
        params![sequence.id, sequence.titre, sequence.matiere, sequence.cycle,
                sequence.objectifs, sequence.competences, sequence.competence_visee,
                sequence.image_nom, sequence.couleur, sequence.date_creation, sequence.periode,
                sequence.annee, sequence.rating_engagement, sequence.rating_facilite,
                sequence.rating_apprentissage, sequence.rating_date_maj, sequence.projet_id,
                sequence.video, sequence.dossier, sequence.nb_seances_prevu],
    ).map_err(e)?;
    Ok(sequence)
}

#[tauri::command]
pub fn sequence_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM sequences WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// SÉANCES
// ============================================================

#[tauri::command]
pub fn seances_list(db: State<Db>, sequence_id: Option<String>) -> R<Vec<Seance>> {
    let c = db.lock();
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
    let c = db.lock();
    ecrire_seance(&c, seance)
}

pub(crate) fn ecrire_seance(c: &rusqlite::Connection, seance: Seance) -> R<Seance> {
    c.execute(
        "INSERT INTO seances (id,titre,numero,objectifs,competences,deroulement,materiel,duree,date,
          tableau_deroulement,images_deroulement,bilan,bilan_date,sequence_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, numero = excluded.numero, objectifs = excluded.objectifs, competences = excluded.competences, deroulement = excluded.deroulement, materiel = excluded.materiel, duree = excluded.duree, date = excluded.date, tableau_deroulement = excluded.tableau_deroulement, images_deroulement = excluded.images_deroulement, bilan = excluded.bilan, bilan_date = excluded.bilan_date, sequence_id = excluded.sequence_id",
        params![seance.id, seance.titre, seance.numero, seance.objectifs, seance.competences,
                seance.deroulement, seance.materiel, seance.duree, seance.date,
                seance.tableau_deroulement, seance.images_deroulement, seance.bilan,
                seance.bilan_date, seance.sequence_id],
    ).map_err(e)?;
    Ok(seance)
}

#[tauri::command]
pub fn seance_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM seances WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ATELIERS & ESPACES (+ M2M)
// ============================================================

#[tauri::command]
pub fn ateliers_list(db: State<Db>) -> R<Vec<Atelier>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM ateliers ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Atelier::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn atelier_save(db: State<Db>, atelier: Atelier) -> R<Atelier> {
    let c = db.lock();
    c.execute(
        "INSERT INTO ateliers (id,titre,matiere,objectifs,competences,materiel,nb_eleves_max,duree,couleur,
          date_creation,image_nom,dossier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, matiere = excluded.matiere, objectifs = excluded.objectifs, competences = excluded.competences, materiel = excluded.materiel, nb_eleves_max = excluded.nb_eleves_max, duree = excluded.duree, couleur = excluded.couleur, date_creation = excluded.date_creation, image_nom = excluded.image_nom, dossier = excluded.dossier",
        params![atelier.id, atelier.titre, atelier.matiere, atelier.objectifs,
                atelier.competences, atelier.materiel, atelier.nb_eleves_max, atelier.duree,
                atelier.couleur, atelier.date_creation, atelier.image_nom, atelier.dossier],
    ).map_err(e)?;
    Ok(atelier)
}

#[tauri::command]
pub fn atelier_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM ateliers WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn espaces_list(db: State<Db>) -> R<Vec<Espace>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM espaces ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Espace::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn espace_save(db: State<Db>, espace: Espace) -> R<Espace> {
    let c = db.lock();
    c.execute(
        "INSERT INTO espaces (id,titre,description_espace,nb_eleves_max,couleur,date_creation,image_nom,dossier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, description_espace = excluded.description_espace, nb_eleves_max = excluded.nb_eleves_max, couleur = excluded.couleur, date_creation = excluded.date_creation, image_nom = excluded.image_nom, dossier = excluded.dossier",
        params![espace.id, espace.titre, espace.description_espace, espace.nb_eleves_max,
                espace.couleur, espace.date_creation, espace.image_nom, espace.dossier],
    ).map_err(e)?;
    Ok(espace)
}

#[tauri::command]
pub fn espace_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM espaces WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ── Jeux (ludothèque de la classe) ───────────────────────────────────────

// ============================================================
// TEXTES (fichiers texte du plan de travail)
// ============================================================

#[tauri::command]
pub fn textes_list(db: State<Db>) -> R<Vec<Texte>> {
    let c = db.lock();
    lire_textes(&c)
}

pub(crate) fn lire_textes(c: &rusqlite::Connection) -> R<Vec<Texte>> {
    let mut st = c.prepare("SELECT * FROM textes ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Texte::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn texte_save(db: State<Db>, texte: Texte) -> R<Texte> {
    let c = db.lock();
    ecrire_texte(&c, texte)
}

pub(crate) fn ecrire_texte(c: &rusqlite::Connection, mut texte: Texte) -> R<Texte> {
    texte.date_modification = chrono::Utc::now().to_rfc3339();
    c.execute(
        "INSERT INTO textes (id,titre,contenu,dossier,date_creation,date_modification)
         VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, contenu = excluded.contenu, dossier = excluded.dossier, date_creation = excluded.date_creation, date_modification = excluded.date_modification",
        params![texte.id, texte.titre, texte.contenu, texte.dossier, texte.date_creation, texte.date_modification],
    ).map_err(e)?;
    Ok(texte)
}

#[tauri::command]
pub fn texte_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM textes WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn jeux_list(db: State<Db>) -> R<Vec<Jeu>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM jeux ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], Jeu::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn jeu_save(db: State<Db>, jeu: Jeu) -> R<Jeu> {
    ecrire_jeu(&db.lock(), jeu)
}

pub(crate) fn ecrire_jeu(c: &rusqlite::Connection, jeu: Jeu) -> R<Jeu> {
    c.execute(
        "INSERT INTO jeux (id,titre,type_jeu,description_jeu,regles,competences,nb_joueurs_min,nb_joueurs_max,
          duree,age_min,rangement,couleur,date_creation,image_nom,dossier,competences_bo)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, type_jeu = excluded.type_jeu, description_jeu = excluded.description_jeu, regles = excluded.regles, competences = excluded.competences, nb_joueurs_min = excluded.nb_joueurs_min, nb_joueurs_max = excluded.nb_joueurs_max, duree = excluded.duree, age_min = excluded.age_min, rangement = excluded.rangement, couleur = excluded.couleur, date_creation = excluded.date_creation, image_nom = excluded.image_nom, dossier = excluded.dossier, competences_bo = excluded.competences_bo",
        params![jeu.id, jeu.titre, jeu.type_jeu, jeu.description_jeu, jeu.regles, jeu.competences,
                jeu.nb_joueurs_min, jeu.nb_joueurs_max, jeu.duree, jeu.age_min, jeu.rangement,
                jeu.couleur, jeu.date_creation, jeu.image_nom, jeu.dossier, jeu.competences_bo],
    ).map_err(e)?;
    Ok(jeu)
}

// ── Outils pour l'élève et affichages ──────────────────────────────────────

#[tauri::command]
pub fn outils_classe_list(db: State<Db>) -> R<Vec<OutilClasse>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM outils_classe ORDER BY titre").map_err(e)?;
    let rows = st.query_map([], OutilClasse::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn outil_classe_save(db: State<Db>, outil: OutilClasse) -> R<OutilClasse> {
    ecrire_outil_classe(&db.lock(), outil)
}

pub(crate) fn ecrire_outil_classe(c: &rusqlite::Connection, o: OutilClasse) -> R<OutilClasse> {
    if !matches!(o.genre.as_str(), "outil" | "affichage" | "evaluation") {
        return Err("Genre inconnu.".into());
    }
    c.execute(
        "INSERT INTO outils_classe (id,genre,titre,categorie,usage,competences_bo,consignes,lieu,periode,eleves_json,
          documents_json,image_nom,couleur,dossier,date_creation)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15) ON CONFLICT(id) DO UPDATE SET genre = excluded.genre, titre = excluded.titre, categorie = excluded.categorie, usage = excluded.usage, competences_bo = excluded.competences_bo, consignes = excluded.consignes, lieu = excluded.lieu, periode = excluded.periode, eleves_json = excluded.eleves_json, documents_json = excluded.documents_json, image_nom = excluded.image_nom, couleur = excluded.couleur, dossier = excluded.dossier, date_creation = excluded.date_creation",
        params![o.id, o.genre, o.titre, o.categorie, o.usage, o.competences_bo, o.consignes, o.lieu, o.periode,
                o.eleves_json, o.documents_json, o.image_nom, o.couleur, o.dossier, o.date_creation],
    ).map_err(e)?;
    Ok(o)
}

#[tauri::command]
pub fn outil_classe_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM outils_classe WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn jeu_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM jeux WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

/// Liaisons atelier↔espace (paires). Renvoie [[atelierId, espaceId], …].
#[tauri::command]
pub fn atelier_espace_list(db: State<Db>) -> R<Vec<(String, String)>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT atelier_id, espace_id FROM atelier_espace").map_err(e)?;
    let rows = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn atelier_espace_set(db: State<Db>, espace_id: String, atelier_ids: Vec<String>) -> R<()> {
    let c = db.lock();
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
    let c = db.lock();
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
    let c = db.lock();
    c.execute(
        "INSERT INTO progressions_eleve (id,nom_eleve,eleve_id,fait,espace_id)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET nom_eleve = excluded.nom_eleve, eleve_id = excluded.eleve_id, fait = excluded.fait, espace_id = excluded.espace_id",
        params![progression.id, progression.nom_eleve, progression.eleve_id,
                progression.fait as i64, progression.espace_id],
    ).map_err(e)?;
    Ok(progression)
}

#[tauri::command]
pub fn progression_eleve_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM progressions_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// CRÉNEAUX (Planning)
// ============================================================

#[tauri::command]
pub fn creneaux_list(db: State<Db>, debut: Option<String>, fin: Option<String>) -> R<Vec<Creneau>> {
    let c = db.lock();
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
    let c = db.lock();
    ecrire_creneau(&c, creneau)
}

pub(crate) fn ecrire_creneau(c: &rusqlite::Connection, creneau: Creneau) -> R<Creneau> {
    c.execute(
        "INSERT INTO creneaux (id,date,heure_debut,heure_fin,matiere,couleur,seance_id,atelier_id,espace_id,eleves_json,
          nature,prevu,bilan)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13) ON CONFLICT(id) DO UPDATE SET date = excluded.date, heure_debut = excluded.heure_debut, heure_fin = excluded.heure_fin, matiere = excluded.matiere, couleur = excluded.couleur, seance_id = excluded.seance_id, atelier_id = excluded.atelier_id, espace_id = excluded.espace_id, eleves_json = excluded.eleves_json, nature = excluded.nature, prevu = excluded.prevu, bilan = excluded.bilan",
        params![creneau.id, creneau.date, creneau.heure_debut, creneau.heure_fin,
                creneau.matiere, creneau.couleur, creneau.seance_id, creneau.atelier_id,
                creneau.espace_id, creneau.eleves_json, creneau.nature, creneau.prevu, creneau.bilan],
    ).map_err(e)?;
    Ok(creneau)
}

/// Écrit le cahier journal d'un créneau, et rien d'autre.
///
/// Réécrire toute la ligne depuis l'écran du journal remettrait à son ancienne
/// place un créneau déplacé entre-temps dans la grille.
#[tauri::command]
pub fn creneau_journal_save(db: State<Db>, id: String, prevu: String, bilan: String) -> R<()> {
    let c = db.lock();
    ecrire_journal_creneau(&c, &id, &prevu, &bilan)
}

pub(crate) fn ecrire_journal_creneau(c: &rusqlite::Connection, id: &str, prevu: &str, bilan: &str) -> R<()> {
    let n = c.execute("UPDATE creneaux SET prevu = ?2, bilan = ?3 WHERE id = ?1", params![id, prevu, bilan]).map_err(e)?;
    if n == 0 {
        return Err("Ce créneau n'existe plus.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn creneau_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM creneaux WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ÉLÈVES
// ============================================================

#[tauri::command]
pub fn eleves_list(db: State<Db>) -> R<Vec<Eleve>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM eleves ORDER BY nom").map_err(e)?;
    let rows = st.query_map([], Eleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn eleve_save(db: State<Db>, eleve: Eleve) -> R<Eleve> {
    let c = db.lock();
    ecrire_eleve(&c, eleve)
}

pub(crate) fn ecrire_eleve(c: &rusqlite::Connection, eleve: Eleve) -> R<Eleve> {
    c.execute(
        "INSERT INTO eleves (id,nom,niveau,present,ine,date_naissance,photo_fichier)
         VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, niveau = excluded.niveau, present = excluded.present, ine = excluded.ine, date_naissance = excluded.date_naissance, photo_fichier = excluded.photo_fichier",
        params![eleve.id, eleve.nom, eleve.niveau, eleve.present as i64, eleve.ine,
                eleve.date_naissance, eleve.photo_fichier],
    ).map_err(e)?;
    Ok(eleve)
}

#[tauri::command]
pub fn eleve_delete(db: State<Db>, id: String) -> R<()> {
    let mut c = db.lock();
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
    let c = db.lock();
    c.query_row("SELECT donnees FROM documents_eleve WHERE eleve_id=?1 AND type=?2",
        params![eleve_id, type_doc], |r| r.get(0)).optional().map_err(e)
}

#[tauri::command]
pub fn document_eleve_set(db: State<Db>, eleve_id: String, type_doc: String, donnees: String) -> R<()> {
    let c = db.lock();
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
    let c = db.lock();
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
    let c = db.lock();
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
    let c = db.lock();
    c.execute(
        "INSERT INTO appels_journalier (id,date,statut_brut,eleve_id)
         VALUES (?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET date = excluded.date, statut_brut = excluded.statut_brut, eleve_id = excluded.eleve_id",
        params![appel.id, appel.date, appel.statut_brut, appel.eleve_id],
    ).map_err(e)?;
    Ok(appel)
}

#[tauri::command]
pub fn appel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM appels_journalier WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ── Commentaires / observations ──────────────────────────────────────────
#[tauri::command]
pub fn commentaires_list(db: State<Db>, eleve_id: Option<String>) -> R<Vec<CommentaireEleve>> {
    let c = db.lock();
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
    let c = db.lock();
    c.execute(
        "INSERT INTO commentaires_eleve (id,date,texte,type,eleve_id,objectifs)
         VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET date = excluded.date, texte = excluded.texte,
                type = excluded.type, eleve_id = excluded.eleve_id, objectifs = excluded.objectifs",
        params![commentaire.id, commentaire.date, commentaire.texte, commentaire.r#type,
                commentaire.eleve_id, commentaire.objectifs],
    ).map_err(e)?;
    Ok(commentaire)
}

#[tauri::command]
pub fn commentaire_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM commentaires_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// ÉVALUATIONS & NOTES
// ============================================================

#[tauri::command]
pub fn evaluations_list(db: State<Db>) -> R<Vec<Evaluation>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM evaluations ORDER BY date DESC").map_err(e)?;
    let rows = st.query_map([], Evaluation::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn evaluation_save(db: State<Db>, evaluation: Evaluation) -> R<Evaluation> {
    let c = db.lock();
    ecrire_evaluation(&c, evaluation)
}

pub(crate) fn ecrire_evaluation(c: &rusqlite::Connection, evaluation: Evaluation) -> R<Evaluation> {
    c.execute(
        "INSERT INTO evaluations (id,titre,matiere,date,bareme,periode,mode,competences_json,pdf_nom_fichier)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, matiere = excluded.matiere, date = excluded.date, bareme = excluded.bareme, periode = excluded.periode, mode = excluded.mode, competences_json = excluded.competences_json, pdf_nom_fichier = excluded.pdf_nom_fichier",
        params![evaluation.id, evaluation.titre, evaluation.matiere, evaluation.date,
                evaluation.bareme, evaluation.periode, evaluation.mode,
                evaluation.competences_json, evaluation.pdf_nom_fichier],
    ).map_err(e)?;
    Ok(evaluation)
}

#[tauri::command]
pub fn evaluation_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM evaluations WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn notes_eleve_list(db: State<Db>, evaluation_id: Option<String>) -> R<Vec<NoteEleve>> {
    let c = db.lock();
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
    let c = db.lock();
    c.execute(
        "INSERT INTO notes_eleve (id,eleve_nom,eleve_id,note,absent,commentaire,evaluation_id,niveaux_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(id) DO UPDATE SET eleve_nom = excluded.eleve_nom, eleve_id = excluded.eleve_id, note = excluded.note, absent = excluded.absent, commentaire = excluded.commentaire, evaluation_id = excluded.evaluation_id, niveaux_json = excluded.niveaux_json",
        params![note.id, note.eleve_nom, note.eleve_id, note.note, note.absent as i64,
                note.commentaire, note.evaluation_id, note.niveaux_json],
    ).map_err(e)?;
    Ok(note)
}

#[tauri::command]
pub fn note_eleve_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM notes_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// MATÉRIEL
// ============================================================

#[tauri::command]
pub fn materiel_list(db: State<Db>) -> R<Vec<MaterielItem>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM materiel_items ORDER BY date_creation DESC").map_err(e)?;
    let rows = st.query_map([], MaterielItem::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn materiel_save(db: State<Db>, materiel: MaterielItem) -> R<MaterielItem> {
    let c = db.lock();
    c.execute(
        "INSERT INTO materiel_items (id,titre,description_materiel,competence_id,competence_titre,domaine_titre,
          sous_domaine_titre,cycle,images_json,pdfs_json,date_creation,seance_id,sequence_id,
          dossier,videos_json,coffre_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, description_materiel = excluded.description_materiel, competence_id = excluded.competence_id, competence_titre = excluded.competence_titre, domaine_titre = excluded.domaine_titre, sous_domaine_titre = excluded.sous_domaine_titre, cycle = excluded.cycle, images_json = excluded.images_json, pdfs_json = excluded.pdfs_json, date_creation = excluded.date_creation, seance_id = excluded.seance_id, sequence_id = excluded.sequence_id, dossier = excluded.dossier, videos_json = excluded.videos_json, coffre_json = excluded.coffre_json",
        params![materiel.id, materiel.titre, materiel.description_materiel, materiel.competence_id,
                materiel.competence_titre, materiel.domaine_titre, materiel.sous_domaine_titre,
                materiel.cycle, materiel.images_json, materiel.pdfs_json, materiel.date_creation,
                materiel.seance_id, materiel.sequence_id,
                materiel.dossier, materiel.videos_json, materiel.coffre_json],
    ).map_err(e)?;
    Ok(materiel)
}

#[tauri::command]
pub fn materiel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM materiel_items WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// PAPIERS DES ÉLÈVES
// ============================================================

#[tauri::command]
pub fn papiers_list(db: State<Db>) -> R<Vec<PapierEleve>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM papiers_eleve ORDER BY date_ajout DESC").map_err(e)?;
    let rows = st.query_map([], PapierEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn papier_save(db: State<Db>, papier: PapierEleve) -> R<PapierEleve> {
    let c = db.lock();
    c.execute(
        "INSERT INTO papiers_eleve (id,intitule,eleve_id,type,nom_fichier,note,date_ajout)
         VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET intitule = excluded.intitule, eleve_id = excluded.eleve_id, type = excluded.type, nom_fichier = excluded.nom_fichier, note = excluded.note, date_ajout = excluded.date_ajout",
        params![papier.id, papier.intitule, papier.eleve_id, papier.r#type, papier.nom_fichier,
                papier.note, papier.date_ajout],
    ).map_err(e)?;
    Ok(papier)
}

#[tauri::command]
pub fn papier_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM papiers_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// RÉFÉRENTIELS & NOTES DE COMPÉTENCE
// ============================================================

#[tauri::command]
pub fn referentiels_list(db: State<Db>) -> R<Vec<Referentiel>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM referentiels ORDER BY cycle,nom").map_err(e)?;
    let rows = st.query_map([], Referentiel::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn referentiel_save(db: State<Db>, referentiel: Referentiel) -> R<Referentiel> {
    let c = db.lock();
    c.execute(
        "INSERT INTO referentiels (id,nom,cycle,donnees,est_integre,date_ajout,actif)
         VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, cycle = excluded.cycle, donnees = excluded.donnees, est_integre = excluded.est_integre, date_ajout = excluded.date_ajout, actif = excluded.actif",
        params![referentiel.id, referentiel.nom, referentiel.cycle, referentiel.donnees,
                referentiel.est_integre as i64, referentiel.date_ajout, referentiel.actif as i64],
    ).map_err(e)?;
    Ok(referentiel)
}

#[tauri::command]
pub fn referentiel_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM referentiels WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn notes_competence_list(db: State<Db>) -> R<Vec<NoteCompetence>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM notes_competence").map_err(e)?;
    let rows = st.query_map([], NoteCompetence::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn note_competence_save(db: State<Db>, note: NoteCompetence) -> R<NoteCompetence> {
    let c = db.lock();
    c.execute(
        "INSERT INTO notes_competence (id,competence_ref_id,texte,date_creation,date_modification)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET competence_ref_id = excluded.competence_ref_id, texte = excluded.texte, date_creation = excluded.date_creation, date_modification = excluded.date_modification",
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
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM progressions_annuelle ORDER BY annee,periode").map_err(e)?;
    let rows = st.query_map([], ProgressionAnnuelle::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn progression_annuelle_save(db: State<Db>, p: ProgressionAnnuelle) -> R<ProgressionAnnuelle> {
    let c = db.lock();
    c.execute(
        "INSERT INTO progressions_annuelle (id,annee,periode,colonnes_json,cellules_json)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET annee = excluded.annee, periode = excluded.periode, colonnes_json = excluded.colonnes_json, cellules_json = excluded.cellules_json",
        params![p.id, p.annee, p.periode, p.colonnes_json, p.cellules_json],
    ).map_err(e)?;
    Ok(p)
}

#[tauri::command]
pub fn programmations_finale_list(db: State<Db>) -> R<Vec<ProgrammationFinale>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM programmations_finale ORDER BY annee").map_err(e)?;
    let rows = st.query_map([], ProgrammationFinale::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn programmation_finale_save(db: State<Db>, p: ProgrammationFinale) -> R<ProgrammationFinale> {
    let c = db.lock();
    c.execute(
        "INSERT INTO programmations_finale (id,annee,lignes_json,niveau,enseignant,est_importee)
         VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET annee = excluded.annee, lignes_json = excluded.lignes_json, niveau = excluded.niveau, enseignant = excluded.enseignant, est_importee = excluded.est_importee",
        params![p.id, p.annee, p.lignes_json, p.niveau, p.enseignant, p.est_importee as i64],
    ).map_err(e)?;
    Ok(p)
}

#[tauri::command]
pub fn programmation_finale_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM programmations_finale WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn edt_typique_list(db: State<Db>) -> R<Vec<EdtTypique>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM edt_typique ORDER BY annee").map_err(e)?;
    let rows = st.query_map([], EdtTypique::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn edt_typique_save(db: State<Db>, edt: EdtTypique) -> R<EdtTypique> {
    let c = db.lock();
    c.execute(
        "INSERT INTO edt_typique (id,annee,slots_json) VALUES (?1,?2,?3) ON CONFLICT(id) DO UPDATE SET annee = excluded.annee, slots_json = excluded.slots_json",
        params![edt.id, edt.annee, edt.slots_json],
    ).map_err(e)?;
    Ok(edt)
}

// ============================================================
// PIÈCES JOINTES
// ============================================================

#[tauri::command]
pub fn pieces_jointes_list(db: State<Db>, seance_id: Option<String>) -> R<Vec<PieceJointe>> {
    let c = db.lock();
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
    let c = db.lock();
    c.execute(
        "INSERT INTO pieces_jointes (id,nom,type,nom_fichier,date_ajout,seance_id,a_imprimer)
         VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, type = excluded.type, nom_fichier = excluded.nom_fichier, date_ajout = excluded.date_ajout, seance_id = excluded.seance_id, a_imprimer = excluded.a_imprimer",
        params![piece.id, piece.nom, piece.r#type, piece.nom_fichier, piece.date_ajout,
                piece.seance_id, piece.a_imprimer as i64],
    ).map_err(e)?;
    Ok(piece)
}

#[tauri::command]
pub fn piece_jointe_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM pieces_jointes WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// CONVERSATIONS PILOTE (IA)
// ============================================================

#[tauri::command]
pub fn conversations_list(db: State<Db>) -> R<Vec<PiloteConversation>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM pilote_conversations ORDER BY date_maj DESC").map_err(e)?;
    let rows = st.query_map([], PiloteConversation::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn conversation_save(db: State<Db>, conversation: PiloteConversation) -> R<PiloteConversation> {
    let c = db.lock();
    c.execute(
        "INSERT INTO pilote_conversations (id,titre,messages_json,date_creation,date_maj)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, messages_json = excluded.messages_json, date_creation = excluded.date_creation, date_maj = excluded.date_maj",
        params![conversation.id, conversation.titre, conversation.messages_json,
                conversation.date_creation, conversation.date_maj],
    ).map_err(e)?;
    Ok(conversation)
}

#[tauri::command]
pub fn conversation_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM pilote_conversations WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// DOSSIERS DU BUREAU
// ============================================================

/**
 * Les dossiers du plan de travail, chemins complets.
 *
 * Un dossier n'est pas une ligne : il existe par le chemin de ce qu'il
 * contient, ou par un réglage quand il a été créé vide. Pour que ⌘K puisse y
 * mener, il faut donc les rassembler — en une fois, plutôt qu'en sept
 * requêtes depuis la fenêtre.
 *
 * Les parents sont ajoutés : « Langage/Vocabulaire » fait exister « Langage »,
 * même si rien n'y est posé directement.
 */
#[tauri::command]
pub fn dossiers_bureau(db: State<Db>) -> R<Vec<String>> {
    const SOURCES: &[&str] = &[
        "SELECT DISTINCT dossier FROM sequences",
        "SELECT DISTINCT dossier FROM materiel_items",
        "SELECT DISTINCT dossier FROM textes",
        "SELECT DISTINCT dossier FROM ateliers",
        "SELECT DISTINCT dossier FROM espaces",
        "SELECT DISTINCT dossier FROM jeux",
        "SELECT DISTINCT dossier FROM outils_classe",
    ];
    let c = db.lock();
    let mut tous: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    let mut poser = |chemin: &str| {
        let propre = chemin.trim().trim_matches('/');
        if propre.is_empty() || propre.starts_with('@') {
            return;
        }
        // Chaque parent existe aussi : on peut vouloir y aller.
        let mut cumul = String::new();
        for bout in propre.split('/') {
            if bout.trim().is_empty() {
                continue;
            }
            if !cumul.is_empty() {
                cumul.push('/');
            }
            cumul.push_str(bout.trim());
            tous.insert(cumul.clone());
        }
    };
    for sql in SOURCES {
        // Une table absente d'une vieille base ne doit pas vider la liste.
        let Ok(mut st) = c.prepare(sql) else { continue };
        let Ok(rows) = st.query_map([], |r| r.get::<_, String>(0)) else { continue };
        for chemin in rows.flatten() {
            poser(&chemin);
        }
    }
    // Les dossiers créés à la main, qui vivent dans les réglages.
    if let Ok(mut st) = c.prepare("SELECT cle FROM settings WHERE cle LIKE 'dossier:%'") {
        if let Ok(rows) = st.query_map([], |r| r.get::<_, String>(0)) {
            for cle in rows.flatten() {
                poser(cle.trim_start_matches("dossier:"));
            }
        }
    }
    Ok(tous.into_iter().collect())
}

#[cfg(test)]
mod tests_dossiers_bureau {
    use rusqlite::Connection;

    /// Le cœur de `dossiers_bureau`, sans la base : ce qui se range et ce qui
    /// se jette. Recopié tel quel dans la commande, qui n'a que les requêtes
    /// en plus.
    fn poser(tous: &mut std::collections::BTreeSet<String>, chemin: &str) {
        let propre = chemin.trim().trim_matches('/');
        if propre.is_empty() || propre.starts_with('@') {
            return;
        }
        let mut cumul = String::new();
        for bout in propre.split('/') {
            if bout.trim().is_empty() {
                continue;
            }
            if !cumul.is_empty() {
                cumul.push('/');
            }
            cumul.push_str(bout.trim());
            tous.insert(cumul.clone());
        }
    }

    fn dossiers(chemins: &[&str]) -> Vec<String> {
        let mut tous = std::collections::BTreeSet::new();
        for c in chemins {
            poser(&mut tous, c);
        }
        tous.into_iter().collect()
    }

    #[test]
    fn un_chemin_fait_exister_ses_parents() {
        // Sans cela, « Langage » n'apparaissait pas tant que rien n'y était
        // posé directement — et l'on ne pouvait pas y aller.
        assert_eq!(dossiers(&["Langage/Vocabulaire/Loto"]),
                   vec!["Langage", "Langage/Vocabulaire", "Langage/Vocabulaire/Loto"]);
    }

    #[test]
    fn la_racine_et_les_espaces_reserves_ne_sont_pas_des_dossiers() {
        assert_eq!(dossiers(&["", "   ", "/", "@garde", "@garde/Rentrée"]), Vec::<String>::new());
    }

    #[test]
    fn deux_fois_le_meme_dossier_n_en_font_qu_un() {
        assert_eq!(dossiers(&["Maths", "Maths/", " Maths "]), vec!["Maths"]);
    }

    #[test]
    fn les_dossiers_crees_a_la_main_vivent_dans_les_reglages() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE settings (cle TEXT PRIMARY KEY, valeur TEXT);
             INSERT INTO settings VALUES ('dossier:Arts/Peinture','aucune');
             INSERT INTO settings VALUES ('mistralApiKey','secret');",
        ).unwrap();
        let mut st = c.prepare("SELECT cle FROM settings WHERE cle LIKE 'dossier:%'").unwrap();
        let cles: Vec<String> = st.query_map([], |r| r.get(0)).unwrap().flatten().collect();
        assert_eq!(cles, vec!["dossier:Arts/Peinture"]);
        let mut tous = std::collections::BTreeSet::new();
        for cle in &cles {
            poser(&mut tous, cle.trim_start_matches("dossier:"));
        }
        assert_eq!(tous.into_iter().collect::<Vec<_>>(), vec!["Arts", "Arts/Peinture"]);
    }
}

// ============================================================
// TEMPS D'OBSERVATION (grille « Observer »)
// ============================================================

#[tauri::command]
pub fn observations_list(db: State<Db>, eleve_id: Option<String>) -> R<Vec<ObservationEleve>> {
    let c = db.lock();
    let (sql, params): (&str, Vec<String>) = match &eleve_id {
        Some(id) => ("SELECT * FROM observations_eleve WHERE eleve_id = ?1 ORDER BY date DESC, date_creation DESC", vec![id.clone()]),
        None => ("SELECT * FROM observations_eleve ORDER BY date DESC, date_creation DESC", vec![]),
    };
    let mut st = c.prepare(sql).map_err(e)?;
    let rows = st.query_map(rusqlite::params_from_iter(params), ObservationEleve::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn observation_save(db: State<Db>, observation: ObservationEleve) -> R<ObservationEleve> {
    let c = db.lock();
    c.execute(
        "INSERT INTO observations_eleve (id,eleve_id,date,creneau_id,contexte,axe,domaine,competence,note,
          reussites,difficultes,hypotheses,amenagements,reajustement,date_creation,date_maj)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16) ON CONFLICT(id) DO UPDATE SET eleve_id = excluded.eleve_id, date = excluded.date, creneau_id = excluded.creneau_id, contexte = excluded.contexte, axe = excluded.axe, domaine = excluded.domaine, competence = excluded.competence, note = excluded.note, reussites = excluded.reussites, difficultes = excluded.difficultes, hypotheses = excluded.hypotheses, amenagements = excluded.amenagements, reajustement = excluded.reajustement, date_maj = excluded.date_maj",
        params![observation.id, observation.eleve_id, observation.date, observation.creneau_id,
                observation.contexte, observation.axe, observation.domaine, observation.competence,
                observation.note, observation.reussites, observation.difficultes, observation.hypotheses,
                observation.amenagements, observation.reajustement,
                observation.date_creation, observation.date_maj],
    ).map_err(e)?;
    Ok(observation)
}

#[tauri::command]
pub fn observation_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM observations_eleve WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// RÉUNIONS ÉCOUTÉES (ESS, conseil de cycle…)
// ============================================================

#[tauri::command]
pub fn reunions_list(db: State<Db>) -> R<Vec<Reunion>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM reunions ORDER BY date DESC, date_creation DESC").map_err(e)?;
    let rows = st.query_map([], Reunion::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn reunion_save(db: State<Db>, reunion: Reunion) -> R<Reunion> {
    let c = db.lock();
    c.execute(
        "INSERT INTO reunions (id,titre,genre,date,participants,tranches_json,texte,resumes_json,compte_rendu,duree_s,date_creation,date_maj)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, genre = excluded.genre, date = excluded.date, participants = excluded.participants, tranches_json = excluded.tranches_json, texte = excluded.texte, resumes_json = excluded.resumes_json, compte_rendu = excluded.compte_rendu, duree_s = excluded.duree_s, date_maj = excluded.date_maj",
        params![reunion.id, reunion.titre, reunion.genre, reunion.date, reunion.participants,
                reunion.tranches_json, reunion.texte, reunion.resumes_json,
                reunion.compte_rendu, reunion.duree_s,
                reunion.date_creation, reunion.date_maj],
    ).map_err(e)?;
    Ok(reunion)
}

#[tauri::command]
pub fn reunion_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM reunions WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

// ============================================================
// COFFRE-FORT (documents PDF)
// ============================================================

#[tauri::command]
pub fn coffre_list(db: State<Db>) -> R<Vec<DocumentCoffre>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM documents_coffre ORDER BY date_ajout DESC").map_err(e)?;
    let rows = st.query_map([], DocumentCoffre::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn coffre_save(db: State<Db>, document: DocumentCoffre) -> R<DocumentCoffre> {
    let c = db.lock();
    c.execute(
        "INSERT INTO documents_coffre (id,nom,nom_fichier,taille_octets,date_ajout)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, nom_fichier = excluded.nom_fichier, taille_octets = excluded.taille_octets, date_ajout = excluded.date_ajout",
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
    let c = db.lock();
    c.execute(
        "INSERT INTO documents_coffre (id,nom,nom_fichier,taille_octets,date_ajout)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, nom_fichier = excluded.nom_fichier, taille_octets = excluded.taille_octets, date_ajout = excluded.date_ajout",
        params![doc.id, doc.nom, doc.nom_fichier, doc.taille_octets, doc.date_ajout],
    ).map_err(e)?;
    Ok(doc)
}

#[tauri::command]
pub fn coffre_delete(db: State<Db>, id: String, nom_fichier: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM documents_coffre WHERE id=?1", params![id]).map_err(e)?;
    if !nom_fichier.is_empty() { std::fs::remove_file(fichiers_dir().join(&nom_fichier)).ok(); }
    Ok(())
}

// ============================================================
// RÉGLAGES (clé/valeur, remplace UserDefaults/@AppStorage)
// ============================================================

#[tauri::command]
pub fn settings_all(db: State<Db>) -> R<std::collections::HashMap<String, String>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT cle, valeur FROM settings").map_err(e)?;
    let rows = st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).map_err(e)?;
    let mut map = std::collections::HashMap::new();
    for row in rows { let (k, v) = row.map_err(e)?; map.insert(k, v); }
    Ok(map)
}

#[tauri::command]
pub fn setting_get(db: State<Db>, cle: String) -> R<Option<String>> {
    let c = db.lock();
    let v = c.query_row("SELECT valeur FROM settings WHERE cle=?1", params![cle],
                        |r| r.get::<_, String>(0)).ok();
    Ok(v)
}

#[tauri::command]
pub fn setting_set(db: State<Db>, cle: String, valeur: String) -> R<()> {
    let c = db.lock();
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

/// Ouvre une pièce jointe dans l'application par défaut (Aperçu, Acrobat…).
///
/// Passe par le backend plutôt que par le greffon côté fenêtre : celui-ci
/// exigerait une permission d'ouverture de chemins, qui manquerait en silence.
/// Le nom est refusé s'il sort du dossier des fichiers.
#[tauri::command]
pub fn fichier_ouvrir(nom: String) -> R<()> {
    if nom.is_empty() || nom.contains('/') || nom.contains('\\') || nom.contains("..") {
        return Err("Nom de fichier invalide.".into());
    }
    let chemin = fichiers_dir().join(&nom);
    if !chemin.exists() {
        return Err("Ce fichier n'existe plus.".into());
    }
    tauri_plugin_opener::open_path(&chemin, None::<&str>).map_err(e)
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
    /// Cahier journal : ce qui est prévu, ce qui a été fait.
    #[serde(default)]
    pub prevu: String,
    #[serde(default)]
    pub bilan: String,
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
    let octets = construire_planning_pdf(&titre, &jours)?;
    let nom = format!(
        "planning-{}.pdf",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(nom);
    std::fs::write(&path, octets).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Le PDF du planning, sans l'ouvrir : de quoi le vérifier.
fn construire_planning_pdf(titre: &str, jours: &[PlanningJour]) -> R<Vec<u8>> {
    use printpdf::path::PaintMode;
    use printpdf::*;

    let semaine = jours.len() > 1;
    // Jour : A4 portrait. Semaine : A4 paysage.
    let (lw, lh) = if semaine { (297.0f32, 210.0f32) } else { (210.0f32, 297.0f32) };
    let (doc, page1, layer1) = PdfDocument::new(titre, Mm(lw), Mm(lh), "Calque 1");
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

        // ── Détail des séances (objectifs, déroulement, cahier journal) ──
        // Un créneau sans séance mais au cahier journal rempli a aussi son
        // détail : sinon ce qu'on y a écrit n'apparaissait nulle part.
        let details: Vec<&PlanningCreneau> = jour
            .rangs
            .iter()
            .flatten()
            .filter(|c| [&c.objectifs, &c.deroulement, &c.prevu, &c.bilan].iter().any(|t| !t.trim().is_empty()))
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
                    // Un texte long continue sur la page suivante au lieu de
                    // sortir par le bas de la feuille.
                    let page_suivante = |layer: &mut PdfLayerReference, y: &mut f32| {
                        let (p, l) = doc.add_page(Mm(lw), Mm(lh), "Calque 1");
                        *layer = doc.get_page(p).get_layer(l);
                        *y = lh - marge;
                    };
                    if *y < 24.0 {
                        page_suivante(layer, y);
                    }
                    layer.set_fill_color(gris.clone());
                    layer.use_text(intitule, 8.0, Mm(gauche + 5.0), Mm(*y), &gras);
                    *y -= 5.0;
                    layer.set_fill_color(noir.clone());
                    for para in texte.split('\n') {
                        let lignes = if para.trim().is_empty() { vec![String::new()] } else { wrap_texte(para, max_car) };
                        for ln in lignes {
                            if *y < 16.0 {
                                page_suivante(layer, y);
                                layer.set_fill_color(noir.clone());
                            }
                            layer.use_text(&ln, 10.0, Mm(gauche + 7.0), Mm(*y), &font);
                            *y -= 4.6;
                        }
                    }
                    *y -= 2.0;
                };
                bloc("OBJECTIFS", &c.objectifs, &mut layer, &mut y);
                bloc("DÉROULEMENT", &c.deroulement, &mut layer, &mut y);
                bloc("PRÉVU", &c.prevu, &mut layer, &mut y);
                bloc("FAIT · BILAN", &c.bilan, &mut layer, &mut y);
                y -= 4.0;
            }
        }
    }

    // Pied de page
    layer.set_fill_color(gris.clone());
    let pied = format!("Maitrize V2 · imprimé le {}", chrono::Local::now().format("%d/%m/%Y %H:%M"));
    layer.use_text(&pied, 8.0, Mm(marge), Mm(10.0), &font);

    doc.save_to_bytes().map_err(e)
}

#[cfg(test)]
mod tests_planning_pdf {
    use super::*;

    fn creneau(matiere: &str, prevu: &str) -> PlanningCreneau {
        PlanningCreneau {
            heure_debut: "15:00".into(), heure_fin: "16:00".into(), matiere: matiere.into(),
            seance: String::new(), couleur: "#f59e0b".into(), objectifs: String::new(), deroulement: String::new(),
            prevu: prevu.into(), bilan: String::new(),
        }
    }

    /// Le défaut signalé : un créneau sans séance, au cahier journal rempli,
    /// sortait vide à l'impression.
    #[test]
    fn le_cahier_journal_sort_a_limpression() {
        let long = "Écriture d'un court texte à partir d'un corpus de mots. ".repeat(160);
        // Le détail des créneaux est celui de la page d'un jour.
        let jours = vec![PlanningJour {
            jour: "mardi 15 septembre".into(),
            rangs: vec![vec![creneau("Yolanda", &long)], vec![creneau("Ethan", "évaluation diagnostique CM2 · vitesses et durées")]],
        }];
        let pdf = construire_planning_pdf("Planning — mardi 15 septembre", &jours).expect("le PDF se construit");
        let texte = String::from_utf8_lossy(&pdf);
        // Un texte long continue sur d'autres pages au lieu de sortir de la feuille.
        assert!(texte.matches("/Type/Page/").count() + texte.matches("/Type/Page>").count() > 2,
                "le texte long doit tenir sur plusieurs pages");
    }
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
/// Fabrique un jeu et ouvre le PDF, prêt à imprimer.
///
/// Le vivier de pictogrammes vient de la fenêtre : elle l'a obtenu par
/// `arasaac_selection`, et l'enseignant a pu en retirer ce qu'il ne voulait
/// pas. Rien n'est deviné ici.
#[tauri::command]
pub fn jeu_generer(
    jeu: String,
    pictos: Vec<crate::arasaac::PictoChoisi>,
    options: crate::jeux_pdf::Options,
    titre: String,
) -> R<String> {
    let bytes = crate::jeux_pdf::construire(&jeu, &pictos, &options)?;
    let propre: String = titre
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_lowercase();
    let nom = format!(
        "{}-{}-{}.pdf",
        jeu,
        if propre.is_empty() { "jeu".into() } else { propre },
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(&nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(path.to_string_lossy().into_owned())
}

/// Imprime un tableau de langage assisté.
///
/// Le gabarit arrive tel que l'enseignant l'a posé : ni tri, ni complétion.
/// Déplacer une case briserait l'automatisation du geste que le tableau sert
/// justement à installer.
#[tauri::command]
pub fn tla_generer(gabarit: crate::tla_pdf::Gabarit) -> R<String> {
    let bytes = crate::tla_pdf::construire(&gabarit)?;
    let propre: String = format!("{} {}", gabarit.eleve, gabarit.nom)
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_lowercase();
    let nom = format!(
        "tla-{}-{}.pdf",
        if propre.is_empty() { "tableau".into() } else { propre },
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = std::env::temp_dir().join(&nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(path.to_string_lossy().into_owned())
}

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

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResultatRecherche {
    /// « sequence », « seance », « creneau », « observation », « jeu »…
    pub kind: String,
    pub id: String,
    pub titre: String,
    pub sous_titre: String,
    /// La ligne où les mots ont été trouvés, telle qu'elle est écrite.
    pub extrait: String,
    /// Date de ce qu'on a trouvé, pour situer et pour trier.
    pub date: String,
    /// Ce dont ça dépend : la séquence d'une séance, l'élève d'une observation.
    pub parent: String,
}

/// Forme comparable : minuscules, sans accents.
///
/// Chercher « recre » doit trouver « récré » : personne ne tape les accents
/// dans une barre de recherche, et l'enseignant cherche en classe, vite.
fn normaliser(t: &str) -> String {
    let mut s = String::with_capacity(t.len());
    for c in t.to_lowercase().chars() {
        s.push_str(match c {
            'à' | 'â' | 'ä' | 'á' | 'ã' | 'å' => "a",
            'ç' => "c",
            'é' | 'è' | 'ê' | 'ë' => "e",
            'î' | 'ï' | 'í' | 'ì' => "i",
            'ô' | 'ö' | 'ó' | 'ò' | 'õ' => "o",
            'ù' | 'û' | 'ü' | 'ú' => "u",
            'ÿ' | 'ý' => "y",
            'ñ' => "n",
            'œ' => "oe",
            'æ' => "ae",
            _ => {
                s.push(c);
                continue;
            }
        });
    }
    s
}

/// Les mots cherchés : tous doivent se trouver, dans n'importe quel ordre.
fn mots_cherches(q: &str) -> Vec<String> {
    normaliser(q)
        .split(|c: char| !c.is_alphanumeric())
        .filter(|m| !m.is_empty())
        .map(str::to_string)
        .collect()
}

/// La ligne où les mots ont été trouvés, coupée à une longueur lisible.
///
/// Montrer le passage évite d'ouvrir trois fiches pour savoir laquelle est la
/// bonne : c'est la moitié de ce qu'on demande à une recherche.
fn extrait(texte: &str, mots: &[String]) -> String {
    let couper = |l: &str| {
        let l = l.trim();
        if l.chars().count() <= 160 {
            l.to_string()
        } else {
            format!("{}…", l.chars().take(160).collect::<String>().trim_end())
        }
    };
    for ligne in texte.split('\n') {
        if ligne.trim().is_empty() {
            continue;
        }
        let n = normaliser(ligne);
        if mots.iter().any(|m| n.contains(m.as_str())) {
            return couper(ligne);
        }
    }
    texte.split('\n').find(|l| !l.trim().is_empty()).map(couper).unwrap_or_default()
}

/// Où chercher : le genre, puis id, titre, sous-titre, texte, date, parent.
///
/// La recherche ne trouvait ni les séances, ni le cahier journal, ni les
/// observations — c'est-à-dire presque tout ce qu'on écrit. Elle les lit
/// maintenant toutes, et les tables absentes d'une base plus ancienne sont
/// simplement sautées.
const SOURCES: &[(&str, &str)] = &[
    ("sequence", "SELECT id, COALESCE(NULLIF(titre,''),'Séquence'), COALESCE(matiere,''),
                  COALESCE(objectifs,'') || '\n' || COALESCE(competence_visee,''),
                  COALESCE(date_creation,''), '' FROM sequences"),
    ("seance", "SELECT s.id, COALESCE(NULLIF(s.titre,''), 'Séance ' || s.numero),
                'Séance ' || s.numero || COALESCE(' · ' || NULLIF(q.titre,''), ''),
                COALESCE(s.objectifs,'') || '\n' || COALESCE(s.deroulement,'') || '\n' || COALESCE(s.materiel,'') || '\n' || COALESCE(s.bilan,''),
                COALESCE(s.date,''), COALESCE(s.sequence_id,'')
                FROM seances s LEFT JOIN sequences q ON q.id = s.sequence_id"),
    ("creneau", "SELECT id, COALESCE(NULLIF(matiere,''),'Créneau'),
                 COALESCE(heure_debut,'') || '–' || COALESCE(heure_fin,''),
                 COALESCE(prevu,'') || '\n' || COALESCE(bilan,''), COALESCE(date,''), COALESCE(date,'')
                 FROM creneaux"),
    ("observation", "SELECT c.id, COALESCE(NULLIF(e.nom,''),'Observation'), COALESCE(c.type,''),
                     COALESCE(c.texte,''), COALESCE(c.date,''), COALESCE(c.eleve_id,'')
                     FROM commentaires_eleve c LEFT JOIN eleves e ON e.id = c.eleve_id"),
    ("atelier", "SELECT id, COALESCE(NULLIF(titre,''),'Atelier'), COALESCE(matiere,''),
                 COALESCE(objectifs,'') || '\n' || COALESCE(materiel,''), '', '' FROM ateliers"),
    ("espace", "SELECT id, COALESCE(NULLIF(titre,''),'Espace'), '',
                COALESCE(description_espace,''), '', '' FROM espaces"),
    ("jeu", "SELECT id, COALESCE(NULLIF(titre,''),'Jeu'), COALESCE(type_jeu,''),
             COALESCE(regles,'') || '\n' || COALESCE(description_jeu,'') || '\n' || COALESCE(competences,''),
             COALESCE(date_creation,''), '' FROM jeux"),
    ("outil", "SELECT id, COALESCE(NULLIF(titre,''),'Outil'),
               CASE genre WHEN 'affichage' THEN 'Affichage' WHEN 'evaluation' THEN 'Évaluation' ELSE 'Outil' END
               || COALESCE(' · ' || NULLIF(categorie,''),''),
               COALESCE(usage,'') || '\n' || COALESCE(consignes,''), COALESCE(date_creation,''), COALESCE(genre,'') FROM outils_classe"),
    ("texte", "SELECT id, COALESCE(NULLIF(titre,''),'Texte'), COALESCE(dossier,''), COALESCE(contenu,''),
               COALESCE(NULLIF(date_modification,''), date_creation), '' FROM textes"),
    ("eleve", "SELECT id, COALESCE(NULLIF(nom,''),'Élève'), COALESCE(niveau,''), COALESCE(notes,''), '', '' FROM eleves"),
    ("materiel", "SELECT id, COALESCE(NULLIF(titre,''),'Matériel'), COALESCE(competence_titre,''),
                  COALESCE(description_materiel,''), '', '' FROM materiel_items"),
];

/// Combien de résultats on rend : au-delà, on ne lit plus, on fouille.
const RESULTATS_MAX: usize = 40;

/// Cherche dans tout ce qui est écrit dans l'application.
pub fn chercher(c: &rusqlite::Connection, q: &str) -> Vec<ResultatRecherche> {
    let mots = mots_cherches(q);
    if mots.is_empty() {
        return Vec::new();
    }
    // Rang : 0 le titre lui-même, 1 ce qui l'accompagne, 2 le corps du texte.
    // Puis la date, la plus récente d'abord — chercher, c'est d'abord retrouver
    // ce qu'on vient d'écrire.
    let mut trouves: Vec<(u8, String, ResultatRecherche)> = Vec::new();
    for (kind, sql) in SOURCES {
        let Ok(mut st) = c.prepare(sql) else { continue };
        let Ok(lignes) = st.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
            ))
        }) else { continue };
        for (id, titre, sous_titre, texte, date, parent) in lignes.flatten() {
            let tous = |champ: &str| {
                let n = normaliser(champ);
                mots.iter().all(|m| n.contains(m.as_str()))
            };
            let rang = if tous(&titre) {
                0
            } else if tous(&format!("{titre} {sous_titre}")) {
                1
            } else if tous(&format!("{titre} {sous_titre} {texte}")) {
                2
            } else {
                continue;
            };
            trouves.push((
                rang,
                date.clone(),
                ResultatRecherche {
                    kind: (*kind).to_string(),
                    id,
                    titre,
                    sous_titre,
                    extrait: extrait(&texte, &mots),
                    date,
                    parent,
                },
            ));
        }
    }
    trouves.sort_by(|a, b| a.0.cmp(&b.0).then(b.1.cmp(&a.1)));
    trouves.into_iter().take(RESULTATS_MAX).map(|(_, _, r)| r).collect()
}

#[tauri::command]
pub fn recherche(db: State<Db>, q: String) -> R<Vec<ResultatRecherche>> {
    let c = db.lock();
    Ok(chercher(&c, &q))
}

#[cfg(test)]
mod tests_recherche {
    use super::{chercher, extrait, mots_cherches, normaliser};
    use rusqlite::Connection;

    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE sequences (id TEXT PRIMARY KEY, titre TEXT, matiere TEXT, objectifs TEXT,
                 competence_visee TEXT, date_creation TEXT);
             CREATE TABLE seances (id TEXT PRIMARY KEY, titre TEXT, numero INTEGER, objectifs TEXT,
                 deroulement TEXT, materiel TEXT, bilan TEXT, date TEXT, sequence_id TEXT);
             CREATE TABLE creneaux (id TEXT PRIMARY KEY, date TEXT, heure_debut TEXT, heure_fin TEXT,
                 matiere TEXT, prevu TEXT, bilan TEXT);
             INSERT INTO sequences VALUES ('q1','Les fractions','Maths','Partager','','2026-09-01');
             INSERT INTO seances VALUES ('s1','Partager une pizza',1,'Comprendre le demi',
                 'On découpe une pizza en parts égales.','Pizza en carton','','2026-09-12','q1');
             INSERT INTO creneaux VALUES ('c1','2026-09-15','09:00','10:00','Atelier cuisine',
                 'Récré puis pâte à modeler','Aurélien a demandé de l''aide');",
        )
        .unwrap();
        c
    }

    #[test]
    fn la_recherche_trouve_ce_qui_est_ecrit_dans_les_seances_et_le_cahier_journal() {
        let c = base();
        // Ce que l'ancienne recherche ne trouvait pas : le déroulement d'une séance.
        let r = chercher(&c, "pizza");
        assert!(r.iter().any(|x| x.kind == "seance" && x.id == "s1"), "{:?}", r.iter().map(|x| &x.id).collect::<Vec<_>>());
        // Ni le prévu du cahier journal.
        let r = chercher(&c, "pâte à modeler");
        assert_eq!(r.first().map(|x| x.kind.as_str()), Some("creneau"));
        assert!(r[0].extrait.contains("pâte à modeler"), "{}", r[0].extrait);
        assert_eq!(r[0].date, "2026-09-15");
        // Ni le bilan.
        assert!(chercher(&c, "aurelien").iter().any(|x| x.kind == "creneau"));
    }

    #[test]
    fn elle_se_moque_des_accents_et_veut_tous_les_mots() {
        let c = base();
        assert!(!chercher(&c, "recre").is_empty(), "sans accent, « récré » doit se trouver");
        assert!(!chercher(&c, "pizza parts").is_empty(), "les mots peuvent être dans le désordre");
        assert!(chercher(&c, "pizza tricot").is_empty(), "tous les mots doivent y être");
        assert!(chercher(&c, "  ").is_empty());
    }

    #[test]
    fn un_titre_passe_devant_le_corps_du_texte_et_la_seance_sait_d_où_elle_vient() {
        let c = base();
        let r = chercher(&c, "fractions");
        assert_eq!(r.first().map(|x| x.kind.as_str()), Some("sequence"), "{r:?}");
        let s = chercher(&c, "demi").into_iter().find(|x| x.kind == "seance").unwrap();
        assert_eq!(s.parent, "q1", "la séance doit ramener à sa séquence");
        assert_eq!(s.sous_titre, "Séance 1 · Les fractions");
    }

    #[test]
    fn l_extrait_montre_la_ligne_trouvee_et_ne_s_étale_pas() {
        let mots = mots_cherches("Pâté");
        assert_eq!(mots, vec!["pate"]);
        assert_eq!(extrait("Une ligne\nla ligne au pâté\nune autre", &mots), "la ligne au pâté");
        let long = format!("début {}", "a".repeat(300));
        assert!(extrait(&long, &mots_cherches("debut")).chars().count() <= 161);
        assert_eq!(normaliser("Cœur ÉLÈVE"), "coeur eleve");
    }
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
pub(crate) const TABLES_EXPORT: &[&str] = &[
    "projets", "sequences", "seances", "ateliers", "espaces", "atelier_espace", "jeux", "outils_classe",
    "progressions_eleve", "creneaux", "eleves", "documents_eleve", "appels_journalier",
    "commentaires_eleve", "evaluations", "notes_eleve", "pieces_jointes",
    "materiel_items", "papiers_eleve", "notes_competence", "progressions_annuelle",
    "programmations_finale", "edt_typique", "pilote_conversations", "reunions",
    "observations_eleve",
    "referentiels", "documents_coffre", "textes", "settings",
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
/// Où vivent les données, et où elles pourraient vivre.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DossierDonnees {
    pub chemin: String,
    pub par_defaut: String,
    pub personnalise: bool,
    pub octets: u64,
}

#[tauri::command]
pub fn dossier_donnees_get() -> DossierDonnees {
    let chemin = crate::db::data_dir();
    let octets = std::fs::read_dir(&chemin)
        .map(|e| e.flatten().filter_map(|f| f.metadata().ok()).map(|m| m.len()).sum())
        .unwrap_or(0);
    DossierDonnees {
        chemin: chemin.to_string_lossy().into_owned(),
        par_defaut: crate::db::dossier_par_defaut().to_string_lossy().into_owned(),
        personnalise: crate::db::dossier_choisi().is_some(),
        octets,
    }
}

/// Déplace l'emplacement des données.
///
/// Un chemin réseau est refusé, pas seulement déconseillé. SQLite en mode WAL
/// exige que tous les processus partagent un segment de mémoire, ce que deux
/// ordinateurs ne peuvent pas faire ; et le verrouillage de fichier sur SMB
/// est réputé peu fiable. Accepter mènerait à une base corrompue, souvent
/// plusieurs jours après le changement, quand plus personne ne fait le lien.
#[tauri::command]
pub fn dossier_donnees_set(chemin: Option<String>) -> R<DossierDonnees> {
    match chemin.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(c) => {
            let p = std::path::PathBuf::from(c);
            if crate::db::est_chemin_reseau(&p) {
                return Err(
                    "Ce dossier est sur un volume réseau. Une base SQLite ne peut pas y vivre : \
                     deux ordinateurs ne peuvent pas partager les verrous ni la mémoire qu'elle \
                     exige, et le fichier finirait corrompu. Choisissez un dossier local, et \
                     servez-vous de la sauvegarde chiffrée pour passer d'une machine à l'autre."
                        .into(),
                );
            }
            crate::db::definir_dossier(Some(&p)).map_err(e)?;
        }
        None => crate::db::definir_dossier(None).map_err(e)?,
    }
    Ok(dossier_donnees_get())
}

/// Journal de diagnostic, dans le dossier de données.
///
/// Une fenêtre d'application n'a pas de console visible : quand une action ne
/// fait rien, il ne reste aucune trace et l'on en est réduit à deviner. Ce
/// fichier garde les erreurs de la fenêtre, horodatées, pour qu'on puisse les
/// lire après coup.
#[tauri::command]
pub fn diag_ecrire(ligne: String) {
    use std::io::Write;
    let chemin = crate::db::data_dir().join("diagnostic.log");
    // Borne la taille : un journal qui grossit sans fin finit par gêner.
    if std::fs::metadata(&chemin).map(|m| m.len() > 512_000).unwrap_or(false) {
        std::fs::remove_file(&chemin).ok();
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&chemin) {
        // Avec la date : le fichier garde plusieurs jours, et « 15:14 » ne dit
        // pas lequel — ni si le gel d'hier s'est reproduit aujourd'hui.
        let _ = writeln!(f, "{} {}", chrono::Local::now().format("%d/%m %H:%M:%S"), ligne);
    }
}

/// Le fichier du journal d'incidents.
pub(crate) fn diag_chemin() -> std::path::PathBuf {
    crate::db::data_dir().join("diagnostic.log")
}

/**
 * Marque le début d'une session, et dit si la précédente s'est mal terminée.
 *
 * Une fermeture normale écrit « ARRÊT ». Si la dernière ligne du journal n'en
 * est pas une, c'est que l'application a été tuée ou qu'elle a planté : on le
 * note, car c'est justement ce qu'on cherche après coup.
 */
pub fn diag_demarrage(version: &str) {
    let precedente_interrompue = std::fs::read_to_string(diag_chemin())
        .ok()
        .and_then(|t| t.lines().rev().find(|l| l.contains("DÉMARRAGE") || l.contains("ARRÊT")).map(|l| l.to_string()))
        .map(|derniere| derniere.contains("DÉMARRAGE"))
        .unwrap_or(false);
    if precedente_interrompue {
        diag_ecrire("SESSION PRÉCÉDENTE INTERROMPUE (plantage, arrêt forcé ou coupure)".into());
    }
    diag_ecrire(format!("DÉMARRAGE v{version} {} {}", std::env::consts::OS, std::env::consts::ARCH));
}

/// Marque une fermeture normale : la session suivante saura qu'il n'y a rien eu.
pub fn diag_arret() {
    diag_ecrire("ARRÊT".into());
}

/**
 * Le rapport à envoyer : de quoi aider quelqu'un dont la fenêtre s'est figée.
 *
 * Les dernières lignes du journal, précédées de ce qui situe la machine. Rien
 * d'un élève n'y figure : le journal ne contient que des messages techniques.
 */
#[tauri::command]
pub fn diag_rapport(lignes: usize) -> R<String> {
    let chemin = diag_chemin();
    let contenu = std::fs::read_to_string(&chemin).unwrap_or_default();
    let n = lignes.clamp(20, 2000);
    let dernieres: Vec<&str> = contenu.lines().rev().take(n).collect();
    let corps = dernieres.into_iter().rev().collect::<Vec<_>>().join("\n");
    Ok(format!(
        "Rapport Maitrize — {}\nSystème : {} {}\nJournal : {}\n\n{}",
        chrono::Local::now().format("%d/%m/%Y %H:%M"),
        std::env::consts::OS,
        std::env::consts::ARCH,
        chemin.display(),
        if corps.trim().is_empty() { "(aucun incident enregistré)".to_string() } else { corps },
    ))
}

/// Ouvre le journal de diagnostic dans l'application par défaut.
#[tauri::command]
pub fn diag_ouvrir() -> R<()> {
    let chemin = crate::db::data_dir().join("diagnostic.log");
    if !chemin.exists() {
        return Err("Aucun incident enregistré pour l'instant.".into());
    }
    tauri_plugin_opener::open_path(&chemin, None::<&str>).map_err(e)
}

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
    let c = db.lock();
    std::fs::remove_file(&chemin).ok(); // VACUUM INTO échoue si la cible existe
    c.execute("VACUUM INTO ?1", params![chemin]).map_err(e)?;
    Ok(())
}

/// Un réglage part-il dans une sauvegarde ? Ni la clé API, ni ce qui
/// appartient à ce poste : son identifiant, ses repères de synchronisation.
fn reglage_exportable(cle: &str) -> bool {
    cle != "mistralApiKey" && !crate::journal::REGLAGES_DU_POSTE.contains(&cle)
}

/// Sérialise toutes les données utilisateur en un JSON unique (sauvegarde).
#[tauri::command]
pub fn export_data(db: State<Db>) -> R<String> {
    let c = db.lock();
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
            rows.into_iter().filter(|r| reglage_exportable(r.get("cle").and_then(|v| v.as_str()).unwrap_or_default())).collect()
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
pub fn import_data(db: State<Db>, json: String) -> R<String> {
    let c = db.lock();
    let copie = crate::db::copie_de_securite(&c, "avant-import")?;
    import_json(&c, &json)?;
    Ok(copie)
}

/// Restaure depuis un JSON d'export, sur une connexion (réutilisable, sous verrou).
/// Restaure depuis un JSON d'export.
///
/// Une restauration réécrit toutes les tables : les déclencheurs du journal y
/// voient des dizaines de milliers d'écritures locales, qui repartiraient vers
/// l'autre machine comme si on venait de tout ressaisir. On relève donc le
/// repère avant, et l'on marque comme distant tout ce que la restauration a
/// produit — ce n'est pas du travail neuf, c'est une remise en état.
pub fn import_json(c: &rusqlite::Connection, json: &str) -> R<()> {
    let avant = crate::journal::dernier_seq(c);
    // Les dossiers du plan de travail d'ici : une sauvegarde de l'autre
    // ordinateur les ferait disparaître, même vides.
    let dossiers = crate::journal::reglages_des_dossiers(c);
    let resultat = import_json_brut(c, json);
    crate::journal::marquer_distants(c, avant);
    // Remis après le marquage : ce sont des dossiers d'ici que l'autre
    // ordinateur ne connaît pas, ils doivent partir vers lui.
    if resultat.is_ok() {
        crate::journal::retablir_dossiers(c, &dossiers).map_err(e)?;
    }
    resultat
}

fn import_json_brut(c: &rusqlite::Connection, json: &str) -> R<()> {
    let root: serde_json::Value = serde_json::from_str(json).map_err(e)?;
    let obj = root.as_object().ok_or("JSON racine invalide")?;

    for t in TABLES_EXPORT {
        let Some(arr) = obj.get(*t).and_then(|v| v.as_array()) else { continue };
        // Ne pas vider les référentiels intégrés (table non listée). Pour
        // settings on garde la clé API existante.
        if *t == "settings" {
            // La clé API et les réglages du poste restent ceux d'ici : une
            // sauvegarde faite sur un autre ordinateur (ou avant ce correctif)
            // porte les siens, qui donneraient à ce poste l'identité de l'autre.
            let du_poste = crate::journal::REGLAGES_DU_POSTE.iter().map(|k| format!("'{k}'")).collect::<Vec<_>>().join(", ");
            c.execute(&format!("DELETE FROM settings WHERE cle != 'mistralApiKey' AND cle NOT IN ({du_poste})"), [])
                .map_err(e)?;
        } else if *t == "referentiels" {
            // Ne touche pas aux référentiels intégrés (seedés au démarrage).
            c.execute("DELETE FROM referentiels WHERE est_integre=0", []).map_err(e)?;
        } else {
            c.execute(&format!("DELETE FROM {t}"), []).map_err(e)?;
        }
        for row in arr {
            let Some(o) = row.as_object() else { continue };
            if *t == "settings" && o.get("cle").and_then(|v| v.as_str())
                .is_some_and(|k| crate::journal::REGLAGES_DU_POSTE.contains(&k)) {
                continue;
            }
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
mod tests_sequences {
    use crate::models::Sequence;

    /// Le nombre de séances prévu doit survivre à l'enregistrement : c'est lui
    /// qui fait écrire « séance 3/6 » dans le cahier journal.
    #[test]
    fn le_nombre_de_seances_prevu_est_garde() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let seq: Sequence = serde_json::from_value(serde_json::json!({
            "id": "q1", "titre": "Loto des animaux", "nbSeancesPrevu": 6
        })).unwrap();
        super::ecrire_sequence(&c, seq).unwrap();
        let lu = c.query_row("SELECT * FROM sequences WHERE id='q1'", [], Sequence::from_row).unwrap();
        assert_eq!(lu.nb_seances_prevu, 6);
        // Une séquence d'une version plus ancienne n'en annonce aucune.
        c.execute("INSERT INTO sequences (id, titre, date_creation) VALUES ('q2', 'Avant', '2026-01-01')", []).unwrap();
        let ancienne = c.query_row("SELECT * FROM sequences WHERE id='q2'", [], Sequence::from_row).unwrap();
        assert_eq!(ancienne.nb_seances_prevu, 0);
    }
}

#[cfg(test)]
mod tests_fiches_de_classe {
    use crate::models::OutilClasse;

    /// Outils, affichages et évaluations partagent une table : une évaluation
    /// doit y entrer, avec sa compétence et son sujet, et un genre inventé
    /// doit être refusé plutôt qu'écrit en silence.
    #[test]
    fn une_evaluation_s_enregistre_comme_un_outil() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let bo = r#"[{"id":"c1","referentielNom":"Cycle 2","competenceTitre":"Lire les nombres jusqu'à 100"}]"#;
        let sujet = r#"[{"nom":"Sujet.pdf","fichier":"sujet-1.pdf"}]"#;
        let ev: OutilClasse = serde_json::from_value(serde_json::json!({
            "id": "ev1", "genre": "evaluation", "titre": "Lire les nombres jusqu'à 100",
            "competencesBo": bo, "documentsJson": sujet, "categorie": "Bilan de fin de séquence",
        })).unwrap();
        super::ecrire_outil_classe(&c, ev).unwrap();
        let lu = c.query_row("SELECT * FROM outils_classe WHERE id='ev1'", [], OutilClasse::from_row).unwrap();
        assert_eq!(lu.genre, "evaluation");
        assert_eq!(lu.competences_bo, bo);
        assert_eq!(lu.documents_json, sujet);

        let inconnu: OutilClasse = serde_json::from_value(serde_json::json!({
            "id": "x1", "genre": "chose", "titre": "?"
        })).unwrap();
        assert!(super::ecrire_outil_classe(&c, inconnu).is_err());
    }
}

#[cfg(test)]
mod tests_jeux {
    use crate::models::Jeu;

    /// Les compétences du BO d'un jeu survivent à l'enregistrement ; un jeu
    /// venu d'une version plus ancienne, sans elles, n'en a aucune.
    #[test]
    fn les_competences_du_bo_d_un_jeu_sont_gardees() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let bo = r#"[{"id":"c1","referentielNom":"Cycle 2","competenceTitre":"Dénombrer jusqu'à 30"}]"#;
        let jeu: Jeu = serde_json::from_value(serde_json::json!({
            "id": "j1", "titre": "Loto des nombres", "competences": "Reconnaissance verbale des nombres", "competencesBo": bo
        })).unwrap();
        super::ecrire_jeu(&c, jeu).unwrap();
        let lu = c.query_row("SELECT * FROM jeux WHERE id='j1'", [], Jeu::from_row).unwrap();
        assert_eq!(lu.competences_bo, bo);
        assert_eq!(lu.competences, "Reconnaissance verbale des nombres");

        // Ligne écrite sans la colonne (synchronisation depuis une version plus ancienne).
        c.execute("INSERT INTO jeux (id, titre, date_creation) VALUES ('j2', 'Memory', '2026-01-01')", []).unwrap();
        let ancien = c.query_row("SELECT * FROM jeux WHERE id='j2'", [], Jeu::from_row).unwrap();
        assert_eq!(ancien.competences_bo, "[]");
        let sans: Jeu = serde_json::from_value(serde_json::json!({"id": "j3", "titre": "Uno"})).unwrap();
        assert_eq!(sans.competences_bo, "[]");
    }
}

#[cfg(test)]
mod tests_cahier_journal {
    use crate::models::Creneau;

    /// Un déplacement de créneau réécrit toute la ligne : s'il oubliait une
    /// colonne, le cahier journal de ce créneau s'effacerait en silence.
    #[test]
    fn prevu_bilan_et_nature_survivent_a_l_enregistrement() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let cr: Creneau = serde_json::from_value(serde_json::json!({
            "id": "cr1", "date": "2026-09-14", "heureDebut": "09:00", "heureFin": "10:00",
            "matiere": "Synthèse", "nature": "reunion",
            "prevu": "Préparer les bilans.", "bilan": "Bilans relus avec l'équipe."
        })).unwrap();
        super::ecrire_creneau(&c, cr).unwrap();
        let lu = c.query_row("SELECT * FROM creneaux WHERE id='cr1'", [], Creneau::from_row).unwrap();
        assert_eq!(lu.nature, "reunion");
        assert_eq!(lu.prevu, "Préparer les bilans.");
        assert_eq!(lu.bilan, "Bilans relus avec l'équipe.");
        // Le journal s'écrit seul, sans toucher à l'horaire.
        super::ecrire_journal_creneau(&c, "cr1", "Prévu modifié.", "").unwrap();
        let lu2 = c.query_row("SELECT * FROM creneaux WHERE id='cr1'", [], Creneau::from_row).unwrap();
        assert_eq!((lu2.prevu.as_str(), lu2.heure_debut.as_str(), lu2.nature.as_str()), ("Prévu modifié.", "09:00", "reunion"));
        assert!(super::ecrire_journal_creneau(&c, "absent", "x", "y").is_err());
        // Un créneau d'une ancienne version, sans ces champs, reste un créneau de classe.
        let ancien: Creneau = serde_json::from_value(serde_json::json!({"id": "cr2", "date": "2026-09-14"})).unwrap();
        assert_eq!(ancien.nature, "classe");
        assert_eq!(ancien.prevu, "");
    }
}

#[cfg(test)]
mod tests_restauration {
    fn poste(id: &str, repere: &str) -> rusqlite::Connection {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        crate::journal::creer_table(&c);
        c.execute("INSERT INTO settings (cle, valeur) VALUES ('identifiantMachine', ?1), ('syncSeqEnvoyee', ?2), ('ecole', 'École d''ici')",
                  [id, repere]).unwrap();
        c
    }

    fn reglage(c: &rusqlite::Connection, cle: &str) -> String {
        c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [cle], |r| r.get(0)).unwrap()
    }

    /// Le défaut réel : restaurer la sauvegarde faite sur l'autre ordinateur
    /// lui prenait son identifiant et son repère d'envoi. Les deux machines
    /// s'ignoraient ensuite, et plus rien de ce qui s'écrivait ici ne partait.
    /// Les sauvegardes déjà sur le stockage portent encore ces réglages.
    #[test]
    fn une_restauration_garde_lidentite_du_poste() {
        let mac = poste("id-du-mac", "913");
        let sauvegarde_du_pc = r#"{"_format":"maitrize-backup-v1","settings":[
            {"cle":"identifiantMachine","valeur":"id-du-pc"},
            {"cle":"syncSeqEnvoyee","valeur":"3003"},
            {"cle":"syncDeltasVus","valeur":"[]"},
            {"cle":"ecole","valeur":"École restaurée"}]}"#;
        super::import_json(&mac, sauvegarde_du_pc).unwrap();
        assert_eq!(reglage(&mac, "identifiantMachine"), "id-du-mac");
        assert_eq!(reglage(&mac, "syncSeqEnvoyee"), "913");
        assert_eq!(reglage(&mac, "ecole"), "École restaurée", "les données, elles, sont restaurées");
    }

    /// Le défaut signalé : passer d'un ordinateur à l'autre effaçait les
    /// dossiers du plan de travail, même vides.
    #[test]
    fn une_restauration_garde_les_dossiers_dici() {
        let ici = poste("id-ici", "0");
        ici.execute_batch(
            "INSERT INTO settings (cle, valeur) VALUES
                ('dossier:Évaluations', 'aucune'), ('dossier:Lecture', 'green'), ('dossier:Sons', 'aucune'),
                ('bureau:', '{\"d:Évaluations\":[3,0]}');
             INSERT INTO materiel_items (id, titre, dossier, date_creation) VALUES ('m1', 'Fiche', 'Maths / Géométrie', '2026-09-14');",
        ).unwrap();
        crate::journal::creer_table(&ici);
        crate::journal::poser_declencheurs(&ici, "id-ici");

        // La sauvegarde de l'autre poste : « Lecture » y est rouge, « Sons » y a
        // été supprimé, et elle ne connaît ni « Évaluations » ni la fiche.
        let sauvegarde = r#"{"_format":"maitrize-backup-v1",
            "materiel_items":[],
            "settings":[{"cle":"dossier:Lecture","valeur":"red"},{"cle":"dossier:Sons","valeur":""},{"cle":"ecole","valeur":"École"}]}"#;
        super::import_json(&ici, sauvegarde).unwrap();

        assert_eq!(reglage(&ici, "dossier:Évaluations"), "aucune", "le dossier vide d'ici doit rester");
        assert_eq!(reglage(&ici, "bureau:"), "{\"d:Évaluations\":[3,0]}", "sa place sur le bureau aussi");
        assert_eq!(reglage(&ici, "dossier:Maths/Géométrie"), "aucune", "un dossier qui ne tenait que par son contenu reste, vide");
        assert_eq!(reglage(&ici, "dossier:Lecture"), "red", "ce que la sauvegarde dit d'un dossier l'emporte");
        assert_eq!(reglage(&ici, "dossier:Sons"), "", "une suppression faite là-bas aussi");
        // Ces dossiers d'ici doivent partir vers l'autre ordinateur.
        let a_envoyer: i64 = ici.query_row(
            "SELECT COUNT(*) FROM changements WHERE ligne_id = 'dossier:Évaluations' AND distant = 0", [], |r| r.get(0)).unwrap();
        assert_eq!(a_envoyer, 1);
    }

    #[test]
    fn une_sauvegarde_nemporte_pas_lidentite_du_poste() {
        for cle in ["identifiantMachine", "syncSeqEnvoyee", "syncDeltasVus", "derniereSync", "nomMachine", "mistralApiKey"] {
            assert!(!super::reglage_exportable(cle), "« {cle} » part dans la sauvegarde");
        }
        for cle in ["ecole", "enseignantNom", "edt:mode", "bureau:", "sync_endpoint", "sauvegarde_phrase"] {
            assert!(super::reglage_exportable(cle), "« {cle} » manque à la sauvegarde");
        }
    }
}

#[cfg(test)]
mod tests_textes {
    use crate::models::Texte;

    /// Un texte s'enregistre sur la base réelle, se relit, et son écriture est
    /// journalisée — sans quoi il ne passerait jamais sur l'autre machine.
    #[test]
    fn un_texte_senregistre_et_voyage() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        crate::journal::creer_table(&c);
        crate::journal::poser_declencheurs(&c, "machine-test");
        let t = Texte {
            id: "t1".into(), titre: "Compte rendu".into(), contenu: "Apolline a lu seule.".into(),
            dossier: "Réunions".into(), date_creation: "2026-09-13T10:00:00Z".into(), date_modification: String::new(),
        };
        let enregistre = super::ecrire_texte(&c, t).unwrap();
        assert!(!enregistre.date_modification.is_empty(), "la date de modification n'est pas posée");
        let lus = super::lire_textes(&c).unwrap();
        assert_eq!(lus.len(), 1);
        assert_eq!(lus[0].contenu, "Apolline a lu seule.");
        assert_eq!(lus[0].dossier, "Réunions");
        let n: i64 = c.query_row("SELECT count(*) FROM changements WHERE table_nom = 'textes'", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1, "l'écriture d'un texte n'est pas journalisée");
    }
}

#[cfg(test)]
mod tests_materiel {
    use crate::models::MaterielItem;

    /// Enregistre un matériel sur une base créée par la vraie migration.
    ///
    /// Le plan de travail crée un dossier en y posant un matériel : si cette
    /// écriture échoue, le dossier n'apparaît jamais et rien ne le dit.
    #[test]
    fn un_materiel_range_dans_un_dossier_senregistre() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);

        let m = MaterielItem {
            id: "m1".into(), titre: "Nouveau matériel".into(), description_materiel: String::new(),
            competence_id: String::new(), competence_titre: String::new(),
            domaine_titre: String::new(), sous_domaine_titre: String::new(), cycle: String::new(),
            images_json: "[]".into(), pdfs_json: "[]".into(),
            date_creation: "2026-09-12T20:00:00Z".into(), seance_id: None, sequence_id: None,
            dossier: "Français/Lecture".into(), videos_json: "[]".into(), coffre_json: "[]".into(),
        };
        c.execute(
            "INSERT INTO materiel_items (id,titre,description_materiel,competence_id,competence_titre,domaine_titre,
              sous_domaine_titre,cycle,images_json,pdfs_json,date_creation,seance_id,sequence_id,
              dossier,videos_json,coffre_json)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, description_materiel = excluded.description_materiel, competence_id = excluded.competence_id, competence_titre = excluded.competence_titre, domaine_titre = excluded.domaine_titre, sous_domaine_titre = excluded.sous_domaine_titre, cycle = excluded.cycle, images_json = excluded.images_json, pdfs_json = excluded.pdfs_json, date_creation = excluded.date_creation, seance_id = excluded.seance_id, sequence_id = excluded.sequence_id, dossier = excluded.dossier, videos_json = excluded.videos_json, coffre_json = excluded.coffre_json",
            rusqlite::params![m.id, m.titre, m.description_materiel, m.competence_id,
                m.competence_titre, m.domaine_titre, m.sous_domaine_titre, m.cycle,
                m.images_json, m.pdfs_json, m.date_creation, m.seance_id, m.sequence_id,
                m.dossier, m.videos_json, m.coffre_json],
        ).expect("l'écriture doit réussir sur le schéma réel");

        let (titre, dossier): (String, String) = c
            .query_row("SELECT titre, dossier FROM materiel_items WHERE id='m1'", [],
                       |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap();
        assert_eq!(titre, "Nouveau matériel");
        assert_eq!(dossier, "Français/Lecture");

        // Et la relecture doit rendre les mêmes champs.
        let relu = c.query_row("SELECT * FROM materiel_items WHERE id='m1'", [],
                               MaterielItem::from_row).unwrap();
        assert_eq!(relu.dossier, "Français/Lecture");
        assert_eq!(relu.videos_json, "[]");
    }

    #[test]
    fn une_sequence_rangee_dans_un_dossier_senregistre() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c.execute(
            "INSERT INTO sequences (id,titre,matiere,cycle,objectifs,competences,competence_visee,
             image_nom,couleur,date_creation,periode,annee,rating_engagement,rating_facilite,
             rating_apprentissage,rating_date_maj,projet_id,video,dossier)
             VALUES ('s1','T','','','','[]','',NULL,'blue','2026-09-12',1,'',0,0,0,NULL,NULL,'','Maths')",
            [],
        ).expect("l'écriture doit réussir");
        let d: String = c.query_row("SELECT dossier FROM sequences WHERE id='s1'", [], |r| r.get(0)).unwrap();
        assert_eq!(d, "Maths");
    }
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

#[cfg(test)]
mod tests_cascades {
    //! Enregistrer une ligne ne doit jamais effacer ce qui en dépend.
    //!
    //! Avec « INSERT OR REPLACE », SQLite supprime puis recrée la ligne : la
    //! suppression déclenchait les ON DELETE CASCADE. Déplacer une séquence
    //! effaçait ses séances ; enregistrer un élève, ses documents.
    use crate::models::*;
    use rusqlite::Connection;

    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.pragma_update(None, "foreign_keys", "ON").unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }

    fn compter(c: &Connection, sql: &str) -> i64 {
        c.query_row(sql, [], |r| r.get(0)).unwrap()
    }

    #[test]
    fn deplacer_une_sequence_garde_ses_seances() {
        let c = base();
        let seq: Sequence = serde_json::from_value(serde_json::json!({"id": "s1", "titre": "Jardinage"})).unwrap();
        super::ecrire_sequence(&c, seq.clone()).unwrap();
        let se: Seance = serde_json::from_value(serde_json::json!({"id": "se1", "titre": "Semis", "sequenceId": "s1"})).unwrap();
        super::ecrire_seance(&c, se).unwrap();
        super::ecrire_sequence(&c, Sequence { dossier: "Sciences".into(), ..seq }).unwrap();
        assert_eq!(compter(&c, "SELECT count(*) FROM seances WHERE sequence_id='s1'"), 1, "les séances ont été effacées");
        assert_eq!(compter(&c, "SELECT count(*) FROM sequences WHERE id='s1' AND dossier='Sciences'"), 1);
    }

    #[test]
    fn enregistrer_une_seance_la_laisse_au_planning() {
        let c = base();
        let se: Seance = serde_json::from_value(serde_json::json!({"id": "se1", "titre": "Semis"})).unwrap();
        super::ecrire_seance(&c, se.clone()).unwrap();
        let cr: Creneau = serde_json::from_value(serde_json::json!({"id": "cr1", "date": "2026-09-14", "seanceId": "se1"})).unwrap();
        super::ecrire_creneau(&c, cr).unwrap();
        super::ecrire_seance(&c, Seance { titre: "Semis de radis".into(), ..se }).unwrap();
        assert_eq!(compter(&c, "SELECT count(*) FROM creneaux WHERE seance_id='se1'"), 1, "la séance a été détachée du créneau");
    }

    #[test]
    fn enregistrer_un_eleve_garde_ses_documents() {
        let c = base();
        let el: Eleve = serde_json::from_value(serde_json::json!({"id": "e1", "nom": "Apolline Martin"})).unwrap();
        super::ecrire_eleve(&c, el.clone()).unwrap();
        c.execute("INSERT INTO documents_eleve (id, eleve_id, type, donnees, date_maj) VALUES ('d1','e1','ppi','{}','x')", []).unwrap();
        super::ecrire_eleve(&c, Eleve { nom: "Apolline M.".into(), ..el }).unwrap();
        assert_eq!(compter(&c, "SELECT count(*) FROM documents_eleve WHERE eleve_id='e1'"), 1, "les documents de l'élève ont été effacés");
    }

    #[test]
    fn enregistrer_une_evaluation_garde_ses_notes() {
        let c = base();
        let ev: Evaluation = serde_json::from_value(serde_json::json!({"id": "ev1", "titre": "Lecture"})).unwrap();
        super::ecrire_evaluation(&c, ev.clone()).unwrap();
        c.execute("INSERT INTO notes_eleve (id, eleve_nom, evaluation_id) VALUES ('n1','Apolline','ev1')", []).unwrap();
        super::ecrire_evaluation(&c, Evaluation { titre: "Lecture CP".into(), ..ev }).unwrap();
        assert_eq!(compter(&c, "SELECT count(*) FROM notes_eleve WHERE evaluation_id='ev1'"), 1, "les notes ont été effacées");
    }

    /// La synchronisation applique les changements reçus : elle ne doit pas non
    /// plus effacer, sur l'autre machine, les séances d'une séquence modifiée.
    #[test]
    fn une_sequence_recue_garde_ses_seances() {
        let a = base();
        let mut b = base();
        for (c, nom) in [(&a, "A"), (&b, "B")] {
            crate::journal::creer_table(c);
            crate::journal::poser_declencheurs(c, nom);
        }
        let seq: Sequence = serde_json::from_value(serde_json::json!({"id": "s1", "titre": "Jardinage"})).unwrap();
        let se: Seance = serde_json::from_value(serde_json::json!({"id": "se1", "titre": "Semis", "sequenceId": "s1"})).unwrap();
        super::ecrire_sequence(&a, seq.clone()).unwrap();
        super::ecrire_seance(&a, se).unwrap();
        let (tout, _) = crate::journal::changements_locaux(&a, 0).unwrap();
        crate::journal::appliquer(&mut b, &tout).unwrap();
        assert_eq!(compter(&b, "SELECT count(*) FROM seances WHERE sequence_id='s1'"), 1);
        // A range la séquence ; B reçoit la modification.
        let apres = crate::journal::dernier_seq(&a);
        super::ecrire_sequence(&a, Sequence { dossier: "Sciences".into(), ..seq }).unwrap();
        let (nouveaux, _) = crate::journal::changements_locaux(&a, apres).unwrap();
        crate::journal::appliquer(&mut b, &nouveaux).unwrap();
        assert_eq!(compter(&b, "SELECT count(*) FROM sequences WHERE dossier='Sciences'"), 1, "la modification n'est pas arrivée");
        assert_eq!(compter(&b, "SELECT count(*) FROM seances WHERE sequence_id='s1'"), 1, "la synchronisation a effacé les séances");
    }
}
