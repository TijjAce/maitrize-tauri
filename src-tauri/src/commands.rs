//! Commandes Tauri exposées au frontend (invoke). CRUD par entité +
//! réglages, fichiers, recherche et passerelle Mistral.

use crate::db::{fichiers_dir, Db};
use crate::models::*;
use rusqlite::{params, OptionalExtension};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

/// Le dossier où le plan de travail range ce qu'on y jette. Un élément y garde,
/// derrière ce nom, le chemin d'où il vient, et se remet en place tel quel
/// (voir `versLaPoubelle`, dans dossiers.ts).
pub const POUBELLE: &str = "🗑 Poubelle";

/// Ce qui n'est pas à la poubelle, en SQL — écrit en toutes lettres pour
/// entrer dans les requêtes constantes de la recherche, et donc à tenir
/// d'accord avec `POUBELLE`.
macro_rules! hors_poubelle {
    ($colonne:literal) => {
        concat!("(", $colonne, " IS NULL OR (", $colonne, " <> '🗑 Poubelle' AND ", $colonne, " NOT LIKE '🗑 Poubelle/%'))")
    };
}

/// Ce qu'on a jeté ne paraît nulle part ailleurs que sur le plan de travail,
/// qui seul demande à voir la poubelle : ni dans le cahier journal, ni dans
/// Fabriquer, ni dans une liste à choisir.
fn sauf_poubelle(avec_poubelle: Option<bool>) -> &'static str {
    if avec_poubelle == Some(true) { "" } else { concat!(" WHERE ", hors_poubelle!("dossier")) }
}

// ============================================================
// SÉQUENCES
// ============================================================

#[tauri::command]
pub fn sequences_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<Sequence>> {
    let c = db.lock();
    let sql = format!("SELECT * FROM sequences{} ORDER BY date_creation DESC", sauf_poubelle(avec_poubelle));
    let mut st = c.prepare(&sql).map_err(e)?;
    let rows = st.query_map([], Sequence::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn sequence_save(db: State<Db>, sequence: Sequence) -> R<Sequence> {
    let c = db.lock();
    ecrire_sequence(&c, sequence)
}

/// L'instant présent, tel que la fenêtre l'écrit (`new Date().toISOString()`).
pub(crate) fn maintenant() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub(crate) fn ecrire_sequence(c: &rusqlite::Connection, sequence: Sequence) -> R<Sequence> {
    // La date de modification s'écrit ici, pas dans la fenêtre : aucun enregistrement ne l'oublie.
    let sequence = Sequence { date_maj: maintenant(), ..sequence };
    c.execute(
        "INSERT INTO sequences (id,titre,matiere,cycle,objectifs,competences,competence_visee,image_nom,couleur,
          date_creation,periode,annee,rating_engagement,rating_facilite,rating_apprentissage,
          rating_date_maj,projet_id,video,dossier,nb_seances_prevu,etat,date_maj,niveau)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, matiere = excluded.matiere, cycle = excluded.cycle, objectifs = excluded.objectifs, competences = excluded.competences, competence_visee = excluded.competence_visee, image_nom = excluded.image_nom, couleur = excluded.couleur, date_creation = excluded.date_creation, periode = excluded.periode, annee = excluded.annee, rating_engagement = excluded.rating_engagement, rating_facilite = excluded.rating_facilite, rating_apprentissage = excluded.rating_apprentissage, rating_date_maj = excluded.rating_date_maj, projet_id = excluded.projet_id, video = excluded.video, dossier = excluded.dossier, nb_seances_prevu = excluded.nb_seances_prevu, etat = excluded.etat, date_maj = excluded.date_maj, niveau = excluded.niveau",
        params![sequence.id, sequence.titre, sequence.matiere, sequence.cycle,
                sequence.objectifs, sequence.competences, sequence.competence_visee,
                sequence.image_nom, sequence.couleur, sequence.date_creation, sequence.periode,
                sequence.annee, sequence.rating_engagement, sequence.rating_facilite,
                sequence.rating_apprentissage, sequence.rating_date_maj, sequence.projet_id,
                sequence.video, sequence.dossier, sequence.nb_seances_prevu, sequence.etat, sequence.date_maj, sequence.niveau],
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
    let seance = Seance { date_maj: maintenant(), ..seance };
    c.execute(
        "INSERT INTO seances (id,titre,numero,objectifs,competences,deroulement,materiel,duree,date,
          tableau_deroulement,images_deroulement,bilan,bilan_date,sequence_id,date_maj,consignes)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, numero = excluded.numero, objectifs = excluded.objectifs, competences = excluded.competences, deroulement = excluded.deroulement, materiel = excluded.materiel, duree = excluded.duree, date = excluded.date, tableau_deroulement = excluded.tableau_deroulement, images_deroulement = excluded.images_deroulement, bilan = excluded.bilan, bilan_date = excluded.bilan_date, sequence_id = excluded.sequence_id, date_maj = excluded.date_maj, consignes = excluded.consignes",
        params![seance.id, seance.titre, seance.numero, seance.objectifs, seance.competences,
                seance.deroulement, seance.materiel, seance.duree, seance.date,
                seance.tableau_deroulement, seance.images_deroulement, seance.bilan,
                seance.bilan_date, seance.sequence_id, seance.date_maj, seance.consignes],
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
pub fn ateliers_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<Atelier>> {
    let c = db.lock();
    let mut st = c.prepare(&format!("SELECT * FROM ateliers{} ORDER BY titre", sauf_poubelle(avec_poubelle))).map_err(e)?;
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
pub fn espaces_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<Espace>> {
    let c = db.lock();
    let mut st = c.prepare(&format!("SELECT * FROM espaces{} ORDER BY titre", sauf_poubelle(avec_poubelle))).map_err(e)?;
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
pub fn textes_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<Texte>> {
    let c = db.lock();
    lire_textes(&c, avec_poubelle)
}

pub(crate) fn lire_textes(c: &rusqlite::Connection, avec_poubelle: Option<bool>) -> R<Vec<Texte>> {
    let mut st = c.prepare(&format!("SELECT * FROM textes{} ORDER BY titre", sauf_poubelle(avec_poubelle))).map_err(e)?;
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
pub fn jeux_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<Jeu>> {
    let c = db.lock();
    let mut st = c.prepare(&format!("SELECT * FROM jeux{} ORDER BY titre", sauf_poubelle(avec_poubelle))).map_err(e)?;
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
pub fn outils_classe_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<OutilClasse>> {
    let c = db.lock();
    let mut st = c.prepare(&format!("SELECT * FROM outils_classe{} ORDER BY titre", sauf_poubelle(avec_poubelle))).map_err(e)?;
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

/// Le minuteur des tablettes ne s'écrit ici qu'à la création — un créneau
/// dupliqué garde le sien. Ensuite, seul le cahier journal le règle
/// (`creneau_minuteur_save`) : une grille restée ouverte, qui déplace le
/// créneau, ne le remet pas à son ancienne valeur.
///
/// Le prévu et le bilan, de même : écrits ici à la création, ensuite par le
/// seul cahier journal (`creneau_journal_save`). La grille et la fiche du
/// créneau renvoient la ligne chargée à l'ouverture du planning ; déplacer le
/// créneau, lui lier une séance ou l'enregistrer tel quel effaçait le bilan
/// écrit depuis (trouvé en octobre 2026).
pub(crate) fn ecrire_creneau(c: &rusqlite::Connection, creneau: Creneau) -> R<Creneau> {
    c.execute(
        "INSERT INTO creneaux (id,date,heure_debut,heure_fin,matiere,couleur,seance_id,atelier_id,espace_id,eleves_json,
          nature,prevu,bilan,minuteur)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) ON CONFLICT(id) DO UPDATE SET date = excluded.date, heure_debut = excluded.heure_debut, heure_fin = excluded.heure_fin, matiere = excluded.matiere, couleur = excluded.couleur, seance_id = excluded.seance_id, atelier_id = excluded.atelier_id, espace_id = excluded.espace_id, eleves_json = excluded.eleves_json, nature = excluded.nature",
        params![creneau.id, creneau.date, creneau.heure_debut, creneau.heure_fin,
                creneau.matiere, creneau.couleur, creneau.seance_id, creneau.atelier_id,
                creneau.espace_id, creneau.eleves_json, creneau.nature, creneau.prevu, creneau.bilan,
                creneau.minuteur.min(crate::models::MINUTEUR_MAX)],
    ).map_err(e)?;
    Ok(creneau)
}

/// Règle le minuteur des tablettes d'un créneau, en minutes (0 : aucun), et rien d'autre.
#[tauri::command]
pub fn creneau_minuteur_save(db: State<Db>, id: String, minutes: u32) -> R<()> {
    let c = db.lock();
    ecrire_minuteur_creneau(&c, &id, minutes)
}

pub(crate) fn ecrire_minuteur_creneau(c: &rusqlite::Connection, id: &str, minutes: u32) -> R<()> {
    let n = c.execute("UPDATE creneaux SET minuteur = ?2 WHERE id = ?1", params![id, minutes.min(crate::models::MINUTEUR_MAX)]).map_err(e)?;
    if n == 0 {
        return Err("Ce créneau n'existe plus.".into());
    }
    Ok(())
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

pub(crate) fn ecrire_eleve(c: &rusqlite::Connection, mut eleve: Eleve) -> R<Eleve> {
    // Le jour de création ne se pose qu'à la création. Un écran qui renvoie
    // l'élève sans son année ni ce jour ne les efface pas pour autant.
    let existe = c.query_row("SELECT 1 FROM eleves WHERE id=?1", params![eleve.id], |_| Ok(())).is_ok();
    if !existe && eleve.date_creation.is_none() {
        eleve.date_creation = Some(now_iso());
    }
    c.execute(
        "INSERT INTO eleves (id,nom,niveau,present,ine,date_naissance,photo_fichier,non_verbal,annee_scolaire,date_creation,fiches_exclues)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, niveau = excluded.niveau, present = excluded.present, ine = excluded.ine, date_naissance = excluded.date_naissance, photo_fichier = excluded.photo_fichier, non_verbal = excluded.non_verbal,
           fiches_exclues = excluded.fiches_exclues,
           annee_scolaire = COALESCE(excluded.annee_scolaire, eleves.annee_scolaire),
           date_creation = COALESCE(eleves.date_creation, excluded.date_creation)",
        params![eleve.id, eleve.nom, eleve.niveau, eleve.present as i64, eleve.ine,
                eleve.date_naissance, eleve.photo_fichier, eleve.non_verbal as i64,
                eleve.annee_scolaire, eleve.date_creation, serde_json::to_string(&eleve.fiches_exclues).map_err(e)?],
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

    const TABLES_DE_L_ELEVE: [&str; 7] = ["appels_journalier", "commentaires_eleve", "notes_eleve", "papiers_eleve",
                                          "progressions_eleve", "observations_eleve", "documents_eleve"];
    // Ses lignes, relevées avant de partir : le journal en garde des copies.
    let mut lignes: Vec<(&str, String)> = vec![("eleves", id.to_string())];
    for table in TABLES_DE_L_ELEVE {
        let mut st = c.prepare(&format!("SELECT id FROM {table} WHERE eleve_id=?1")).map_err(e)?;
        let ids = st.query_map(params![id], |r| r.get::<_, String>(0)).map_err(e)?;
        lignes.extend(ids.flatten().map(|lid| (table, lid)));
    }

    let tx = c.transaction().map_err(e)?;

    // Les temps d'observation et les documents (PPI, GEVA-Sco, dispositifs…) partent aussi : les
    // documents ont une clé étrangère, mais elle ne vaut que si SQLite l'applique — on n'en dépend pas.
    for table in TABLES_DE_L_ELEVE {
        tx.execute(&format!("DELETE FROM {table} WHERE eleve_id=?1"), params![id]).map_err(e)?;
    }
    tx.execute("DELETE FROM eleves WHERE id=?1", params![id]).map_err(e)?;

    // Le journal de synchronisation gardait chaque état de ces lignes, et
    // l'historique d'édition de leurs textes : il n'en reste que la marque de
    // suppression, qui fait effacer l'élève sur les autres ordinateurs. Les
    // lignes qui restent (créneaux, outils, programmation) gardent leurs états
    // d'avant jusqu'à la purge du journal : ils servent à fusionner.
    for (table, lid) in &lignes {
        tx.execute("DELETE FROM changements WHERE table_nom=?1 AND ligne_id=?2 AND operation <> 'suppr'",
            params![table, lid]).ok();
        tx.execute("DELETE FROM textes_crdt WHERE table_nom=?1 AND ligne_id=?2", params![table, lid]).ok();
    }

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
    retirer_des_outils(&tx, id)?;
    retirer_des_programmations(&tx, id)?;

    tx.commit().map_err(e)?;

    for nom in fichiers {
        effacer_fichier_joint(c, &nom);
    }
    Ok(())
}

/// Retire l'élève des outils de classe qui le citent (`outils_classe.eleves_json`).
fn retirer_des_outils(c: &rusqlite::Connection, id: &str) -> R<()> {
    let lignes: Vec<(String, String)> = {
        let mut st = c.prepare("SELECT id, eleves_json FROM outils_classe WHERE eleves_json LIKE '%'||?1||'%'").map_err(e)?;
        let it = st.query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)?
    };
    for (oid, brut) in lignes {
        let Ok(mut ids) = serde_json::from_str::<Vec<String>>(&brut) else { continue };
        let avant = ids.len();
        ids.retain(|x| x != id);
        if ids.len() != avant {
            let json = serde_json::to_string(&ids).unwrap_or_else(|_| "[]".into());
            c.execute("UPDATE outils_classe SET eleves_json=?1 WHERE id=?2", params![json, oid]).map_err(e)?;
        }
    }
    Ok(())
}

/// Retire l'élève de la programmation par élève (IME) : de ses groupes, et de
/// ses objectifs — un objectif qui ne visait que lui part avec lui, ses notes
/// le concernaient.
fn retirer_des_programmations(c: &rusqlite::Connection, id: &str) -> R<()> {
    let lignes: Vec<(String, String)> = {
        let mut st = c.prepare("SELECT id, lignes_json FROM programmations_finale WHERE lignes_json LIKE '%'||?1||'%'")
            .map_err(e)?;
        let it = st.query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)?
    };
    let marque = format!("eleve:{id}");
    for (pid, brut) in lignes {
        let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&brut) else { continue };
        let avant = v.clone();
        if let Some(groupes) = v.get_mut("groupes").and_then(|g| g.as_array_mut()) {
            for g in groupes {
                if let Some(ids) = g.get_mut("eleveIds").and_then(|x| x.as_array_mut()) {
                    ids.retain(|x| x.as_str() != Some(id));
                }
            }
        }
        if let Some(objectifs) = v.get_mut("objectifs").and_then(|o| o.as_array_mut()) {
            objectifs.retain_mut(|o| {
                let Some(pour) = o.get_mut("pour").and_then(|p| p.as_array_mut()) else { return true };
                let visait = pour.iter().any(|x| x.as_str() == Some(marque.as_str()));
                pour.retain(|x| x.as_str() != Some(marque.as_str()));
                !(visait && pour.is_empty())
            });
        }
        if v != avant {
            c.execute("UPDATE programmations_finale SET lignes_json=?1 WHERE id=?2",
                params![v.to_string(), pid]).map_err(e)?;
        }
    }
    Ok(())
}

/// Efface un fichier joint, et s'en souvient : la synchronisation le retire
/// alors du stockage et des autres ordinateurs. Sans cette trace, elle le
/// ferait revenir — il manque ici, il est là-bas.
pub(crate) fn effacer_fichier_joint(c: &rusqlite::Connection, nom: &str) {
    let Ok(chemin) = fichier_de_l_application(nom) else { return };
    // Par la corbeille : revenir à un état passé le retrouvera.
    crate::db::mettre_a_la_corbeille(&chemin);
    c.execute("INSERT OR REPLACE INTO fichiers_effaces (nom, date, publie) VALUES (?1, ?2, 0)", params![nom, now_iso()]).ok();
    c.execute("DELETE FROM fichiers_rendus WHERE nom=?1", params![nom]).ok();
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

// ============================================================
// MATÉRIEL
// ============================================================

#[tauri::command]
pub fn materiel_list(db: State<Db>, avec_poubelle: Option<bool>) -> R<Vec<MaterielItem>> {
    let c = db.lock();
    let sql = format!("SELECT * FROM materiel_items{} ORDER BY date_creation DESC", sauf_poubelle(avec_poubelle));
    let mut st = c.prepare(&sql).map_err(e)?;
    let rows = st.query_map([], MaterielItem::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

/// Le dossier des documents qu'on ouvre pour les lire ou les imprimer — bilans de PPI, GEVA-Sco,
/// synthèses, feuilles : à part dans le dossier temporaire, pour qu'on puisse le vider.
pub(crate) fn dossier_temporaire() -> std::path::PathBuf {
    let d = std::env::temp_dir().join("Maitrize");
    std::fs::create_dir_all(&d).ok();
    d
}

/// Un document nominatif n'a pas à traîner sur le disque : au lancement, ce qui a plus d'un jour
/// part — dans le dossier des documents, et ce que les versions d'avant laissaient à la racine du
/// dossier temporaire.
pub fn purger_temporaires() {
    let limite = std::time::Duration::from_secs(24 * 3600);
    let vieux = |e: &std::fs::DirEntry| e.metadata().and_then(|m| m.modified()).ok()
        .and_then(|t| t.elapsed().ok()).is_some_and(|age| age > limite);
    if let Ok(entrees) = std::fs::read_dir(dossier_temporaire()) {
        for e in entrees.flatten().filter(|e| vieux(e)) { std::fs::remove_file(e.path()).ok(); }
    }
    // « .etat-… » : une copie de la base décompressée pour revenir en arrière, effacée après usage — sauf si
    // l'application s'est fermée entre-temps.
    let anciens = ["maitrize-", "synthese-gs-", "GEVA-Sco", "bilan-ppi-", "tla-", ".etat-"];
    if let Ok(entrees) = std::fs::read_dir(std::env::temp_dir()) {
        for e in entrees.flatten() {
            let nom = e.file_name().to_string_lossy().to_string();
            let fichier = e.file_type().is_ok_and(|f| f.is_file());
            if fichier && anciens.iter().any(|p| nom.starts_with(p)) && vieux(&e) { std::fs::remove_file(e.path()).ok(); }
        }
    }
    // Les fichiers d'un bureau commun ouverts depuis Nuage, en copie de travail.
    if let Ok(entrees) = std::fs::read_dir(std::env::temp_dir().join("maitrize-nuage")) {
        for e in entrees.flatten().filter(|e| vieux(e) && e.file_type().is_ok_and(|f| f.is_file())) { std::fs::remove_file(e.path()).ok(); }
    }
}

/// Écrit un matériel : créé, ou mis à jour sur place.
pub(crate) fn ecrire_materiel(c: &rusqlite::Connection, m: &MaterielItem) -> rusqlite::Result<usize> {
    c.execute(
        "INSERT INTO materiel_items (id,titre,description_materiel,competence_id,competence_titre,domaine_titre,
          sous_domaine_titre,cycle,images_json,pdfs_json,date_creation,seance_id,sequence_id,
          dossier,videos_json,coffre_json,fabrication_json,support_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, description_materiel = excluded.description_materiel, competence_id = excluded.competence_id, competence_titre = excluded.competence_titre, domaine_titre = excluded.domaine_titre, sous_domaine_titre = excluded.sous_domaine_titre, cycle = excluded.cycle, images_json = excluded.images_json, pdfs_json = excluded.pdfs_json, date_creation = excluded.date_creation, seance_id = excluded.seance_id, sequence_id = excluded.sequence_id, dossier = excluded.dossier, videos_json = excluded.videos_json, coffre_json = excluded.coffre_json, fabrication_json = excluded.fabrication_json, support_json = excluded.support_json",
        params![m.id, m.titre, m.description_materiel, m.competence_id,
                m.competence_titre, m.domaine_titre, m.sous_domaine_titre,
                m.cycle, m.images_json, m.pdfs_json, m.date_creation,
                m.seance_id, m.sequence_id,
                m.dossier, m.videos_json, m.coffre_json, m.fabrication_json, m.support_json],
    )
}

#[tauri::command]
pub fn materiel_save(db: State<Db>, materiel: MaterielItem) -> R<MaterielItem> {
    let c = db.lock();
    ecrire_materiel(&c, &materiel).map_err(e)?;
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
    // Le fichier joint part avec la ligne : il n'était plus rattaché à rien.
    let fichier: String = c
        .query_row("SELECT nom_fichier FROM papiers_eleve WHERE id=?1", params![id], |r| r.get::<_, Option<String>>(0))
        .ok().flatten().unwrap_or_default();
    c.execute("DELETE FROM papiers_eleve WHERE id=?1", params![id]).map_err(e)?;
    if !fichier.is_empty() { effacer_fichier_joint(&c, &fichier); }
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
    // À année, niveau et période égaux, la plus ancienne d'abord : c'est elle
    // que l'écran montre, et elle que `ecrire_progression` complète.
    let mut st = c.prepare("SELECT * FROM progressions_annuelle ORDER BY annee, niveau, periode, rowid").map_err(e)?;
    let rows = st.query_map([], ProgressionAnnuelle::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

/// Une progression telle que l'écran la voit : ses colonnes et ses cases, en JSON.
#[derive(serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EtatProgression {
    #[serde(default)]
    pub colonnes_json: String,
    #[serde(default)]
    pub cellules_json: String,
    /// Absent d'un écran d'avant les séances placées : rien n'y change alors.
    #[serde(default)]
    pub seances_json: String,
}

/// Une collection JSON modifiée par un écran, fusionnée avec ce que la base a.
///
/// Ce que l'écran a changé depuis `avant` l'emporte ; le reste garde la
/// valeur de la base, où une case, une ligne ou un créneau arrivés d'un
/// autre ordinateur entre-temps restent. L'ordre est celui de l'écran s'il
/// a déplacé quelque chose.
fn fusionner_ecran(ici: &str, avant: &str, apres: &str) -> String {
    let lire = |s: &str| serde_json::from_str::<serde_json::Value>(s).ok();
    match (lire(ici), lire(apres)) {
        (Some(i), Some(a)) => crate::journal::fusion_trois(&i, lire(avant).as_ref(), &a, true).to_string(),
        _ => apres.to_string(),
    }
}

/// Écrit une modification de la progression d'une année, d'un niveau et d'une période.
///
/// L'écran envoie ce qu'il montrait avant et ce qu'il montre après : seul
/// l'écart s'écrit. Une case remplie sur un autre ordinateur, et reçue
/// pendant qu'on tapait ici, reste donc dans la base au lieu d'être écrasée
/// par un écran qui ne l'avait pas encore. La progression se crée à la
/// première écriture, une seule fois : chercher puis créer sous le même
/// verrou évite les doublons que deux écritures rapprochées fabriquaient.
pub(crate) fn ecrire_progression(
    c: &rusqlite::Connection,
    annee: &str,
    niveau: &str,
    periode: i64,
    avant: &EtatProgression,
    apres: &EtatProgression,
) -> rusqlite::Result<ProgressionAnnuelle> {
    let existante = c
        .query_row(
            "SELECT * FROM progressions_annuelle WHERE annee = ?1 AND niveau = ?2 AND periode = ?3 ORDER BY rowid LIMIT 1",
            params![annee, niveau, periode],
            ProgressionAnnuelle::from_row,
        )
        .optional()?;
    let (id, colonnes_ici, cellules_ici, seances_ici) = match existante {
        Some(p) => (p.id, p.colonnes_json, p.cellules_json, p.seances_json),
        None => (new_id(), "[]".to_string(), "{}".to_string(), "{}".to_string()),
    };
    let ou_vide = |s: &str, vide: &str| if s.trim().is_empty() { vide.to_string() } else { s.to_string() };
    let colonnes = fusionner_ecran(&colonnes_ici, &ou_vide(&avant.colonnes_json, "[]"), &ou_vide(&apres.colonnes_json, "[]"));
    let cellules = fusionner_ecran(&cellules_ici, &ou_vide(&avant.cellules_json, "{}"), &ou_vide(&apres.cellules_json, "{}"));
    let seances = fusionner_ecran(&ou_vide(&seances_ici, "{}"), &ou_vide(&avant.seances_json, "{}"), &ou_vide(&apres.seances_json, "{}"));
    let p = ProgressionAnnuelle {
        id, annee: annee.to_string(), periode, colonnes_json: colonnes, cellules_json: cellules, niveau: niveau.to_string(),
        seances_json: seances,
    };
    c.execute(
        "INSERT INTO progressions_annuelle (id,annee,periode,colonnes_json,cellules_json,niveau,seances_json)
         VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(id) DO UPDATE SET colonnes_json = excluded.colonnes_json, cellules_json = excluded.cellules_json, seances_json = excluded.seances_json",
        params![p.id, p.annee, p.periode, p.colonnes_json, p.cellules_json, p.niveau, p.seances_json],
    )?;
    Ok(p)
}

#[cfg(test)]
mod tests_progression {
    use super::{ecrire_progression, EtatProgression};

    fn base() -> rusqlite::Connection {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }
    fn etat(colonnes: &str, cellules: &str) -> EtatProgression {
        EtatProgression { colonnes_json: colonnes.into(), cellules_json: cellules.into(), seances_json: String::new() }
    }
    fn cases(c: &rusqlite::Connection, niveau: &str) -> serde_json::Value {
        let s: String = c.query_row(
            "SELECT cellules_json FROM progressions_annuelle WHERE niveau = ?1", [niveau], |r| r.get(0),
        ).unwrap();
        serde_json::from_str(&s).unwrap()
    }
    const EPS: &str = r#"[{"id":"c1","titre":"EPS","couleur":"red"}]"#;

    #[test]
    fn la_premiere_ecriture_cree_la_progression_une_seule_fois() {
        let c = base();
        let vide = etat("[]", "{}");
        let p1 = ecrire_progression(&c, "2026-2027", "", 1, &vide, &etat(EPS, "{}")).unwrap();
        let p2 = ecrire_progression(&c, "2026-2027", "", 1, &etat(EPS, "{}"), &etat(EPS, r#"{"w1_c1":"Courir"}"#)).unwrap();
        assert_eq!(p1.id, p2.id);
        let n: i64 = c.query_row("SELECT COUNT(*) FROM progressions_annuelle", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1, "deux écritures rapprochées ne doivent pas fabriquer deux progressions");
        assert_eq!(cases(&c, "")["w1_c1"], "Courir");
    }

    #[test]
    fn une_case_arrivee_d_ailleurs_n_est_pas_ecrasee_par_l_ecran() {
        let c = base();
        ecrire_progression(&c, "2026-2027", "", 1, &etat("[]", "{}"), &etat(EPS, r#"{"w1_c1":"Courir"}"#)).unwrap();
        // Un autre ordinateur remplit la semaine 2 ; l'écran d'ici ne l'a pas encore.
        c.execute(r#"UPDATE progressions_annuelle SET cellules_json = '{"w1_c1":"Courir","w2_c1":"Sauter"}'"#, []).unwrap();
        ecrire_progression(&c, "2026-2027", "", 1,
            &etat(EPS, r#"{"w1_c1":"Courir"}"#), &etat(EPS, r#"{"w1_c1":"Courir vite"}"#)).unwrap();
        let v = cases(&c, "");
        assert_eq!(v["w1_c1"], "Courir vite", "la modification de l'écran s'écrit");
        assert_eq!(v["w2_c1"], "Sauter", "la case reçue reste");
        // Vider une case la retire.
        ecrire_progression(&c, "2026-2027", "", 1,
            &etat(EPS, r#"{"w1_c1":"Courir vite"}"#), &etat(EPS, "{}")).unwrap();
        let v = cases(&c, "");
        assert!(v.get("w1_c1").is_none(), "{v}");
        assert_eq!(v["w2_c1"], "Sauter");
    }

    #[test]
    fn chaque_niveau_a_sa_progression() {
        let c = base();
        ecrire_progression(&c, "2026-2027", "CP", 1, &etat("[]", "{}"), &etat(EPS, r#"{"w1_c1":"Ramper"}"#)).unwrap();
        ecrire_progression(&c, "2026-2027", "CE1", 1, &etat("[]", "{}"), &etat(EPS, r#"{"w1_c1":"Grimper"}"#)).unwrap();
        assert_eq!(cases(&c, "CP")["w1_c1"], "Ramper");
        assert_eq!(cases(&c, "CE1")["w1_c1"], "Grimper");
    }

    #[test]
    fn l_ordre_des_colonnes_est_celui_de_l_ecran_et_une_colonne_venue_d_ailleurs_reste() {
        let c = base();
        let deux = r#"[{"id":"c1","titre":"EPS","couleur":"red"},{"id":"c2","titre":"Rituel","couleur":"indigo"}]"#;
        ecrire_progression(&c, "2026-2027", "", 1, &etat("[]", "{}"), &etat(deux, "{}")).unwrap();
        // Une troisième colonne arrive d'un autre ordinateur.
        c.execute(
            r#"UPDATE progressions_annuelle SET colonnes_json = '[{"id":"c1","titre":"EPS","couleur":"red"},{"id":"c2","titre":"Rituel","couleur":"indigo"},{"id":"c3","titre":"Français","couleur":"blue"}]'"#,
            [],
        ).unwrap();
        // L'écran, qui ne la connaît pas, échange les deux siennes.
        let inverse = r#"[{"id":"c2","titre":"Rituel","couleur":"indigo"},{"id":"c1","titre":"EPS","couleur":"red"}]"#;
        let p = ecrire_progression(&c, "2026-2027", "", 1, &etat(deux, "{}"), &etat(inverse, "{}")).unwrap();
        let ids: Vec<String> = serde_json::from_str::<Vec<serde_json::Value>>(&p.colonnes_json).unwrap()
            .iter().map(|x| x["id"].as_str().unwrap().to_string()).collect();
        assert_eq!(ids, vec!["c2", "c1", "c3"]);
    }

    #[test]
    fn les_progressions_de_la_classe_prennent_un_niveau_pour_toute_l_annee() {
        let c = base();
        let etat = |col: &str, cel: &str| EtatProgression { colonnes_json: col.into(), cellules_json: cel.into(), seances_json: String::new() };
        let vide = etat("[]", "{}");
        ecrire_progression(&c, "2026-2027", "", 1, &vide, &etat(r#"[{"id":"c1","titre":"EPS"}]"#, "{}")).unwrap();
        ecrire_progression(&c, "2026-2027", "", 2, &vide, &etat(r#"[{"id":"c1","titre":"EPS"}]"#, r#"{"w1_c1":"Courir"}"#)).unwrap();
        // Le CP a déjà une ligne vide en P2, et une remplie en P3.
        ecrire_progression(&c, "2026-2027", "CP", 2, &vide, &vide).unwrap();
        ecrire_progression(&c, "2026-2027", "CP", 3, &vide, &etat(r#"[{"id":"c2","titre":"Lecture"}]"#, "{}")).unwrap();
        assert_eq!(super::changer_niveau_progressions(&c, "2026-2027", "", "CP").unwrap(), 2);
        let lignes: Vec<(String, i64)> = c.prepare("SELECT niveau, periode FROM progressions_annuelle ORDER BY periode").unwrap()
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?))).unwrap().flatten().collect();
        assert_eq!(lignes, vec![("CP".into(), 1), ("CP".into(), 2), ("CP".into(), 3)], "une seule progression par période");
        let p2: String = c.query_row("SELECT cellules_json FROM progressions_annuelle WHERE periode = 2", [], |r| r.get(0)).unwrap();
        assert!(p2.contains("Courir"), "la progression remplie est celle qui reste");
        // Deux progressions remplies dans une même période ne se mélangent pas.
        ecrire_progression(&c, "2026-2027", "CE1", 3, &vide, &etat(r#"[{"id":"c3","titre":"Maths"}]"#, "{}")).unwrap();
        let refus = super::changer_niveau_progressions(&c, "2026-2027", "CE1", "CP").unwrap_err();
        assert!(refus.contains("CP a déjà une progression en P3"), "{refus}");
    }

    #[test]
    fn les_seances_placees_dans_une_case_se_gardent_des_deux_cotes() {
        let c = base();
        let etat = |sea: &str| EtatProgression { colonnes_json: r#"[{"id":"c1","titre":"Maths"}]"#.into(), cellules_json: "{}".into(), seances_json: sea.into() };
        ecrire_progression(&c, "2026-2027", "", 1, &etat(""), &etat(r#"{"w1_c1":["s1"]}"#)).unwrap();
        // L'autre ordinateur a placé une séance dans la même case.
        c.execute(r#"UPDATE progressions_annuelle SET seances_json = '{"w1_c1":["s1","s2"]}'"#, []).unwrap();
        // L'écran, qui ne la connaît pas, en place une troisième.
        let p = ecrire_progression(&c, "2026-2027", "", 1, &etat(r#"{"w1_c1":["s1"]}"#), &etat(r#"{"w1_c1":["s1","s3"]}"#)).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p.seances_json).unwrap();
        let mut ids: Vec<&str> = v["w1_c1"].as_array().unwrap().iter().map(|x| x.as_str().unwrap()).collect();
        ids.sort();
        assert_eq!(ids, vec!["s1", "s2", "s3"]);
        // Un écran d'avant les séances placées ne les touche pas.
        let ancien = EtatProgression { colonnes_json: r#"[{"id":"c1","titre":"Maths"}]"#.into(), cellules_json: "{}".into(), seances_json: String::new() };
        let p = ecrire_progression(&c, "2026-2027", "", 1, &ancien, &ancien).unwrap();
        assert!(p.seances_json.contains("s3"));
    }
}

#[tauri::command]
pub fn progression_annuelle_ecrire(
    db: State<Db>,
    annee: String,
    niveau: String,
    periode: i64,
    avant: EtatProgression,
    apres: EtatProgression,
) -> R<ProgressionAnnuelle> {
    let c = db.lock();
    ecrire_progression(&c, &annee, &niveau, periode, &avant, &apres).map_err(e)
}

/// Vrai si un JSON range quelque chose : une liste non vide, ou un objet
/// dont une valeur n'est ni vide ni nulle.
fn json_rempli(s: &str) -> bool {
    match serde_json::from_str::<serde_json::Value>(s) {
        Ok(serde_json::Value::Array(a)) => !a.is_empty(),
        Ok(serde_json::Value::Object(o)) => o.values().any(|x| match x {
            serde_json::Value::String(s) => !s.is_empty(),
            serde_json::Value::Array(a) => !a.is_empty(),
            serde_json::Value::Null => false,
            _ => true,
        }),
        _ => false,
    }
}

/// « La classe » pour le niveau vide, sinon le niveau lui-même.
fn nom_du_niveau(niveau: &str) -> String {
    if niveau.is_empty() { "La classe".into() } else { niveau.to_string() }
}

/// Passe d'un niveau à l'autre : les lignes de `de` prennent le niveau `vers`.
///
/// Une ligne `(identifiant, période, remplie)` par progression ou
/// programmation. Refusé si les deux niveaux ont quelque chose dans une même
/// période : deux tableaux ne se mélangent pas en silence. Sinon, la ligne
/// vide de chaque période s'efface — jamais deux pour une même période —, et
/// celles de `de` changent de niveau.
fn changer_de_niveau(
    c: &rusqlite::Connection, table: &str, depart: &[(String, i64, bool)], arrivee: &[(String, i64, bool)], vers: &str, quoi: &str,
) -> Result<usize, String> {
    let remplie = |ls: &[(String, i64, bool)], p: i64| ls.iter().any(|(_, q, r)| *q == p && *r);
    let mut conflits: Vec<i64> = depart.iter().filter(|(_, p, r)| *r && remplie(arrivee, *p)).map(|(_, p, _)| *p).collect();
    conflits.sort();
    conflits.dedup();
    if !conflits.is_empty() {
        let ou = if table == "progressions_annuelle" {
            format!(" en {}", conflits.iter().map(|p| format!("P{p}")).collect::<Vec<_>>().join(", "))
        } else {
            String::new()
        };
        return Err(format!("{} a déjà {quoi}{ou} : retirez-la d'abord, ou choisissez un autre niveau.", nom_du_niveau(vers)));
    }
    let faire = || -> rusqlite::Result<usize> {
        for (id, p, _) in depart {
            if remplie(arrivee, *p) {
                c.execute(&format!("DELETE FROM {table} WHERE id = ?1"), params![id])?;
            }
        }
        for (id, p, _) in arrivee {
            if !remplie(arrivee, *p) {
                c.execute(&format!("DELETE FROM {table} WHERE id = ?1"), params![id])?;
            }
        }
        let mut n = 0;
        for (id, p, _) in depart {
            if !remplie(arrivee, *p) {
                n += c.execute(&format!("UPDATE {table} SET niveau = ?2 WHERE id = ?1"), params![id, vers])?;
            }
        }
        Ok(n)
    };
    c.execute_batch("BEGIN IMMEDIATE").map_err(e)?;
    match faire() {
        Ok(n) => c.execute_batch("COMMIT").map(|_| n).map_err(e),
        Err(err) => {
            c.execute_batch("ROLLBACK").ok();
            Err(err.to_string())
        }
    }
}

/// Donne un autre niveau aux progressions d'une année, pour toutes ses
/// périodes : la classe (niveau vide) devient « CP », un niveau en devient
/// un autre. Rend le nombre de progressions passées au nouveau niveau.
pub(crate) fn changer_niveau_progressions(c: &rusqlite::Connection, annee: &str, de: &str, vers: &str) -> Result<usize, String> {
    let (de, vers) = (de.trim(), vers.trim());
    if de == vers {
        return Ok(0);
    }
    let lignes = |niveau: &str| -> Result<Vec<(String, i64, bool)>, String> {
        let mut st = c.prepare(
            "SELECT id, periode, colonnes_json, cellules_json, seances_json FROM progressions_annuelle WHERE annee = ?1 AND niveau = ?2",
        ).map_err(e)?;
        let it = st.query_map(params![annee, niveau], |r| {
            let (col, cel, sea): (String, String, String) = (r.get(2)?, r.get(3)?, r.get(4)?);
            Ok((r.get(0)?, r.get(1)?, json_rempli(&col) || json_rempli(&cel) || json_rempli(&sea)))
        }).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)
    };
    let (depart, arrivee) = (lignes(de)?, lignes(vers)?);
    changer_de_niveau(c, "progressions_annuelle", &depart, &arrivee, vers, "une progression")
}

#[tauri::command]
pub fn progression_annuelle_niveau(db: State<Db>, annee: String, de: String, vers: String) -> R<usize> {
    let c = db.lock();
    changer_niveau_progressions(&c, &annee, &de, &vers)
}

/// Donne un autre niveau à la programmation d'une année : celle de la classe
/// devient celle du CP, celle d'un niveau celle d'un autre. Ni celle par
/// élève (« ime ») ni celles reçues des collègues ne bougent.
pub(crate) fn changer_niveau_programmations(c: &rusqlite::Connection, annee: &str, de: &str, vers: &str) -> Result<usize, String> {
    let (de, vers) = (de.trim(), vers.trim());
    if de.eq_ignore_ascii_case("ime") || vers.eq_ignore_ascii_case("ime") {
        return Err("« ime » est la programmation par élève : elle ne change pas de niveau.".into());
    }
    if de == vers {
        return Ok(0);
    }
    let lignes = |niveau: &str| -> Result<Vec<(String, i64, bool)>, String> {
        let mut st = c.prepare(
            "SELECT id, lignes_json FROM programmations_finale WHERE annee = ?1 AND est_importee = 0 AND COALESCE(niveau, '') = ?2",
        ).map_err(e)?;
        let it = st.query_map(params![annee, niveau], |r| Ok((r.get(0)?, 0, json_rempli(&r.get::<_, String>(1)?)))).map_err(e)?;
        it.collect::<rusqlite::Result<_>>().map_err(e)
    };
    let (depart, arrivee) = (lignes(de)?, lignes(vers)?);
    changer_de_niveau(c, "programmations_finale", &depart, &arrivee, vers, "sa programmation")
}

#[tauri::command]
pub fn programmation_finale_niveau(db: State<Db>, annee: String, de: String, vers: String) -> R<usize> {
    let c = db.lock();
    changer_niveau_programmations(&c, &annee, &de, &vers)
}

#[tauri::command]
pub fn programmations_finale_list(db: State<Db>) -> R<Vec<ProgrammationFinale>> {
    let c = db.lock();
    // La plus ancienne d'abord : c'est elle que l'écran montre et qu'`ecrire_programmation` complète.
    let mut st = c.prepare("SELECT * FROM programmations_finale ORDER BY annee, rowid").map_err(e)?;
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

/// Écrit une modification d'une programmation de l'année : celle de la
/// classe (`niveau` vide), celle d'un niveau (« CP »…) dans une classe à
/// plusieurs niveaux, ou celle par élève (`ime`). Comme pour la progression,
/// seul l'écart avec ce que l'écran montrait s'écrit, et chaque programmation
/// se crée une seule fois.
pub(crate) fn ecrire_programmation(c: &rusqlite::Connection, annee: &str, ime: bool, niveau: &str, avant: &str, apres: &str) -> rusqlite::Result<ProgrammationFinale> {
    let niveau = if ime { "ime" } else { niveau.trim() };
    // « ime » nomme la programmation par élève : un niveau ne peut pas s'appeler ainsi.
    if !ime && niveau.eq_ignore_ascii_case("ime") {
        return Err(rusqlite::Error::InvalidParameterName(format!("niveau réservé : {niveau}")));
    }
    let existante = c.query_row(
        "SELECT * FROM programmations_finale WHERE annee = ?1 AND est_importee = 0 AND COALESCE(niveau, '') = ?2 ORDER BY rowid LIMIT 1",
        params![annee, niveau], ProgrammationFinale::from_row,
    ).optional()?;
    let vide = if ime { "{}" } else { "[]" };
    let mut p = existante.unwrap_or_else(|| ProgrammationFinale {
        id: new_id(), annee: annee.to_string(), lignes_json: vide.to_string(),
        niveau: niveau.to_string(), enseignant: String::new(), est_importee: false,
    });
    let avant = if avant.trim().is_empty() { vide } else { avant };
    p.lignes_json = fusionner_ecran(&p.lignes_json, avant, apres);
    c.execute(
        "INSERT INTO programmations_finale (id,annee,lignes_json,niveau,enseignant,est_importee)
         VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET lignes_json = excluded.lignes_json",
        params![p.id, p.annee, p.lignes_json, p.niveau, p.enseignant, p.est_importee as i64],
    )?;
    Ok(p)
}

#[tauri::command]
pub fn programmation_finale_ecrire(db: State<Db>, annee: String, ime: bool, avant: String, apres: String, niveau: Option<String>) -> R<ProgrammationFinale> {
    let c = db.lock();
    ecrire_programmation(&c, &annee, ime, niveau.as_deref().unwrap_or(""), &avant, &apres).map_err(e)
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
    // Le plus ancien d'abord : c'est lui que l'écran montre et qu'`ecrire_emploi_du_temps` complète.
    let mut st = c.prepare("SELECT * FROM edt_typique ORDER BY annee, rowid").map_err(e)?;
    let rows = st.query_map([], EdtTypique::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

/// Écrit une modification de l'emploi du temps de l'année, par écart : un
/// créneau posé sur un autre ordinateur entre-temps reste.
pub(crate) fn ecrire_emploi_du_temps(c: &rusqlite::Connection, annee: &str, avant: &str, apres: &str) -> rusqlite::Result<EdtTypique> {
    let existant = c
        .query_row("SELECT * FROM edt_typique WHERE annee = ?1 ORDER BY rowid LIMIT 1", params![annee], EdtTypique::from_row)
        .optional()?;
    let mut edt = existant.unwrap_or_else(|| EdtTypique { id: new_id(), annee: annee.to_string(), slots_json: "[]".into() });
    let avant = if avant.trim().is_empty() { "[]" } else { avant };
    edt.slots_json = fusionner_ecran(&edt.slots_json, avant, apres);
    c.execute(
        "INSERT INTO edt_typique (id,annee,slots_json) VALUES (?1,?2,?3) ON CONFLICT(id) DO UPDATE SET slots_json = excluded.slots_json",
        params![edt.id, edt.annee, edt.slots_json],
    )?;
    Ok(edt)
}

#[tauri::command]
pub fn edt_typique_ecrire(db: State<Db>, annee: String, avant: String, apres: String) -> R<EdtTypique> {
    let c = db.lock();
    ecrire_emploi_du_temps(&c, &annee, &avant, &apres).map_err(e)
}

#[cfg(test)]
mod tests_ecritures_par_ecart {
    use super::{ecrire_emploi_du_temps, ecrire_programmation};

    fn base() -> rusqlite::Connection {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }
    fn json(s: &str) -> serde_json::Value { serde_json::from_str(s).unwrap() }

    #[test]
    fn une_ligne_ajoutee_ailleurs_reste_quand_l_ecran_modifie_une_autre_ligne() {
        let c = base();
        let depart = r#"[{"id":"d1","estDomaine":true,"label":"Français"},{"id":"l1","estDomaine":false,"label":"Lecture","p1":""}]"#;
        let p1 = ecrire_programmation(&c, "2026-2027", false, "", "[]", depart).unwrap();
        // Un autre ordinateur ajoute une activité sous « Français ».
        let ailleurs = r#"[{"id":"d1","estDomaine":true,"label":"Français"},{"id":"l2","estDomaine":false,"label":"Écriture"},{"id":"l1","estDomaine":false,"label":"Lecture","p1":""}]"#;
        c.execute("UPDATE programmations_finale SET lignes_json = ?1", [ailleurs]).unwrap();
        // L'écran, qui ne la connaît pas, remplit P1 de « Lecture ».
        let ecran = r#"[{"id":"d1","estDomaine":true,"label":"Français"},{"id":"l1","estDomaine":false,"label":"Lecture","p1":"Albums"}]"#;
        let p2 = ecrire_programmation(&c, "2026-2027", false, "", depart, ecran).unwrap();
        assert_eq!(p1.id, p2.id, "une seule programmation de classe");
        let v = json(&p2.lignes_json);
        let labels: Vec<&str> = v.as_array().unwrap().iter().map(|l| l["label"].as_str().unwrap()).collect();
        assert_eq!(labels, vec!["Français", "Écriture", "Lecture"], "la ligne reçue reste à sa place");
        assert_eq!(v[2]["p1"], "Albums");
    }

    #[test]
    fn la_programmation_par_eleve_vit_a_part_de_celle_de_la_classe() {
        let c = base();
        ecrire_programmation(&c, "2026-2027", false, "", "[]", r#"[{"id":"l1","label":"Lecture"}]"#).unwrap();
        let ime = ecrire_programmation(&c, "2026-2027", true, "", "{}", r#"{"objectifs":[{"id":"o1","titre":"Se repérer"}],"groupes":[]}"#).unwrap();
        assert_eq!(ime.niveau, "ime");
        let n: i64 = c.query_row("SELECT COUNT(*) FROM programmations_finale", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 2);
        // Deux champs d'un même objectif, modifiés de chaque côté, se gardent.
        c.execute(
            r#"UPDATE programmations_finale SET lignes_json = '{"objectifs":[{"id":"o1","titre":"Se repérer","periodes":[1]}],"groupes":[]}' WHERE niveau = 'ime'"#,
            [],
        ).unwrap();
        let p = ecrire_programmation(&c, "2026-2027", true, "",
            r#"{"objectifs":[{"id":"o1","titre":"Se repérer"}],"groupes":[]}"#,
            r#"{"objectifs":[{"id":"o1","titre":"Se repérer dans la classe"}],"groupes":[]}"#).unwrap();
        let v = json(&p.lignes_json);
        assert_eq!(v["objectifs"][0]["titre"], "Se repérer dans la classe");
        assert_eq!(v["objectifs"][0]["periodes"], json("[1]"));
    }

    #[test]
    fn chaque_niveau_a_sa_programmation_a_cote_de_celle_de_la_classe() {
        let c = base();
        let classe = ecrire_programmation(&c, "2026-2027", false, "", "[]", r#"[{"id":"l1","label":"Lecture"}]"#).unwrap();
        let cp = ecrire_programmation(&c, "2026-2027", false, "CP", "[]", r#"[{"id":"l2","label":"Les sons"}]"#).unwrap();
        let ce1 = ecrire_programmation(&c, "2026-2027", false, "CE1", "[]", r#"[{"id":"l3","label":"Les accords"}]"#).unwrap();
        assert_eq!((classe.niveau.as_str(), cp.niveau.as_str(), ce1.niveau.as_str()), ("", "CP", "CE1"));
        // Écrire au CP ne touche ni la classe ni le CE1.
        let cp2 = ecrire_programmation(&c, "2026-2027", false, "CP",
            r#"[{"id":"l2","label":"Les sons"}]"#, r#"[{"id":"l2","label":"Les sons complexes"}]"#).unwrap();
        assert_eq!(cp2.id, cp.id);
        let lire = |id: &str| -> String { c.query_row("SELECT lignes_json FROM programmations_finale WHERE id = ?1", [id], |r| r.get(0)).unwrap() };
        assert_eq!(json(&lire(&classe.id))[0]["label"], "Lecture");
        assert_eq!(json(&lire(&ce1.id))[0]["label"], "Les accords");
        assert_eq!(json(&lire(&cp.id))[0]["label"], "Les sons complexes");
        // Une programmation importée d'un collègue, de même niveau, n'est jamais la sienne.
        c.execute("INSERT INTO programmations_finale (id, annee, lignes_json, niveau, enseignant, est_importee)
                   VALUES ('x', '2026-2027', '[]', 'CP', 'Collègue', 1)", []).unwrap();
        assert_eq!(ecrire_programmation(&c, "2026-2027", false, "CP", "[]", "[]").unwrap().id, cp.id);
        assert!(ecrire_programmation(&c, "2026-2027", false, "IME", "[]", "[]").is_err(), "« ime » est réservé");
    }

    #[test]
    fn la_programmation_de_la_classe_prend_un_niveau_sans_jamais_en_ecraser_une_autre() {
        let c = base();
        ecrire_programmation(&c, "2026-2027", false, "", "[]", r#"[{"id":"l1","label":"Lecture"}]"#).unwrap();
        // Une ligne vide du CP, laissée par un niveau ajouté puis retiré.
        ecrire_programmation(&c, "2026-2027", false, "CP", "[]", "[]").unwrap();
        assert_eq!(super::changer_niveau_programmations(&c, "2026-2027", "", "CP").unwrap(), 1);
        let niveaux: Vec<String> = c.prepare("SELECT niveau FROM programmations_finale ORDER BY niveau").unwrap()
            .query_map([], |r| r.get(0)).unwrap().flatten().collect();
        assert_eq!(niveaux, vec!["CP"], "une seule programmation du CP, celle qui était remplie");
        // Le CE1 rempli ne peut pas devenir CP : il l'écraserait.
        ecrire_programmation(&c, "2026-2027", false, "CE1", "[]", r#"[{"id":"l2","label":"Accords"}]"#).unwrap();
        assert!(super::changer_niveau_programmations(&c, "2026-2027", "CE1", "CP").unwrap_err().contains("CP a déjà"));
        assert!(super::changer_niveau_programmations(&c, "2026-2027", "CE1", "ime").is_err());
    }

    #[test]
    fn un_creneau_pose_ailleurs_reste_quand_l_ecran_en_supprime_un_autre() {
        let c = base();
        let depart = r#"[{"id":"s1","jour":"Lundi","titre":"Accueil"},{"id":"s2","jour":"Lundi","titre":"Lecture"}]"#;
        ecrire_emploi_du_temps(&c, "2026-2027", "[]", depart).unwrap();
        c.execute(
            r#"UPDATE edt_typique SET slots_json = '[{"id":"s1","jour":"Lundi","titre":"Accueil"},{"id":"s2","jour":"Lundi","titre":"Lecture"},{"id":"s3","jour":"Mardi","titre":"Piscine"}]'"#,
            [],
        ).unwrap();
        let edt = ecrire_emploi_du_temps(&c, "2026-2027", depart, r#"[{"id":"s1","jour":"Lundi","titre":"Accueil"}]"#).unwrap();
        let titres: Vec<String> = json(&edt.slots_json).as_array().unwrap().iter().map(|s| s["titre"].as_str().unwrap().to_string()).collect();
        assert_eq!(titres, vec!["Accueil", "Piscine"]);
        let n: i64 = c.query_row("SELECT COUNT(*) FROM edt_typique", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1);
    }
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
#[tauri::command(async)]
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
    for sql in SOURCES {
        // Une table absente d'une vieille base ne doit pas vider la liste.
        let Ok(mut st) = c.prepare(sql) else { continue };
        let Ok(rows) = st.query_map([], |r| r.get::<_, String>(0)) else { continue };
        for chemin in rows.flatten() {
            poser_dossier(&mut tous, &chemin);
        }
    }
    // Les dossiers créés à la main, qui vivent dans les réglages.
    if let Ok(mut st) = c.prepare("SELECT cle FROM settings WHERE cle LIKE 'dossier:%'") {
        if let Ok(rows) = st.query_map([], |r| r.get::<_, String>(0)) {
            for cle in rows.flatten() {
                poser_dossier(&mut tous, cle.trim_start_matches("dossier:"));
            }
        }
    }
    Ok(tous.into_iter().collect())
}

/// Ajoute un dossier et ses parents à ceux du bureau. Les dossiers réservés
/// (« @… ») n'en sont pas, ni la poubelle : elle ne se visite que depuis le
/// plan de travail.
fn poser_dossier(tous: &mut std::collections::BTreeSet<String>, chemin: &str) {
    let propre = chemin.trim().trim_matches('/');
    let jete = propre == POUBELLE || propre.strip_prefix(POUBELLE).is_some_and(|r| r.starts_with('/'));
    if propre.is_empty() || propre.starts_with('@') || jete {
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
}

#[cfg(test)]
mod tests_dossiers_bureau {
    use rusqlite::Connection;

    fn dossiers(chemins: &[&str]) -> Vec<String> {
        let mut tous = std::collections::BTreeSet::new();
        for c in chemins {
            super::poser_dossier(&mut tous, c);
        }
        tous.into_iter().collect()
    }

    #[test]
    fn la_poubelle_n_est_pas_un_dossier_ou_aller() {
        assert_eq!(dossiers(&["🗑 Poubelle", "🗑 Poubelle/Maths/Calcul", "Maths"]), vec!["Maths"]);
        // Un dossier qui ne fait que commencer pareil reste un dossier.
        assert_eq!(dossiers(&["🗑 Poubelles de tri"]), vec!["🗑 Poubelles de tri"]);
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
            super::poser_dossier(&mut tous, cle.trim_start_matches("dossier:"));
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

// ── Vocaux déposés par le téléphone ──────────────────────────────────────

#[tauri::command]
pub fn vocaux_list(db: State<Db>) -> R<Vec<Vocal>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM vocaux ORDER BY debut").map_err(e)?;
    let rows = st.query_map([], Vocal::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

/**
 * Transcrit un vocal, et garde le texte.
 *
 * Par le moteur réglé pour les observations d'élève (voir
 * `whisper_embarque::choix_de`). Un échec s'écrit à côté du vocal plutôt que
 * de le faire disparaître — on saura pourquoi, et on pourra réessayer. Un
 * vocal sans son passe à « perdu » (voir `son_du_vocal`).
 */
#[tauri::command]
pub async fn vocal_transcrire(
    db: State<'_, Db>,
    moteur: State<'_, crate::whisper_embarque::Moteur>,
    id: String,
) -> R<Vocal> {
    use crate::whisper_embarque::{choix_ici, noms_de_la_classe, transcrire_octets, Choix, Usage};
    let (octets, fichier, choix, noms) = {
        let c = db.lock();
        let fichier = c
            .query_row("SELECT fichier FROM vocaux WHERE id=?1", params![id], |r| r.get::<_, String>(0))
            .map_err(|_| "Ce vocal n'existe plus.".to_string())?;
        // Sans son, le vocal vient de changer d'état : c'est lui qu'on rend.
        let Some(octets) = son_du_vocal(&c, &fichiers_dir(), &id, &fichier)? else {
            return c.query_row("SELECT * FROM vocaux WHERE id=?1", params![id], Vocal::from_row).map_err(e);
        };
        (octets, fichier, choix_ici(&c, Usage::Observations), noms_de_la_classe(&c))
    };
    let resultat = match choix {
        // Les noms de la classe aident Whisper, sur cet ordinateur ; ils ne
        // partent pas avec l'audio quand on transcrit en ligne.
        Ok(Choix::Local(modele)) => transcrire_octets(&moteur, &octets, &modele, &noms),
        Ok(Choix::EnLigne) => {
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&octets);
            crate::ai::transcrire_audio(db.clone(), b64, fichier.clone()).await
        }
        Err(message) => Err(message),
    };
    let c = db.lock();
    match resultat {
        Ok(texte) => {
            c.execute(
                "UPDATE vocaux SET texte=?2, etat='transcrit', erreur='' WHERE id=?1",
                params![id, texte],
            ).map_err(e)?;
        }
        Err(message) => {
            c.execute(
                "UPDATE vocaux SET etat='echec', erreur=?2 WHERE id=?1",
                params![id, message],
            ).map_err(e)?;
        }
    }
    c.query_row("SELECT * FROM vocaux WHERE id=?1", params![id], Vocal::from_row).map_err(e)
}

/// Retire un vocal : la ligne et le son, qui n'a plus de raison d'être.
#[tauri::command]
pub fn vocal_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    let fichier: String = c
        .query_row("SELECT fichier FROM vocaux WHERE id=?1", params![id], |r| r.get(0))
        .unwrap_or_default();
    c.execute("DELETE FROM vocaux WHERE id=?1", params![id]).map_err(e)?;
    if !fichier.is_empty() {
        effacer_fichier_joint(&c, &fichier);
    }
    Ok(())
}

/// Ce qu'on lit sous un vocal dont le son a disparu.
const SON_INTROUVABLE: &str = "Enregistrement introuvable sur cet ordinateur.";

/**
 * Le son d'un vocal, lu dans `dossier` — ou rien, le vocal ayant changé d'état.
 *
 * Un son absent ne reviendra pas : le vocal passe à « perdu », que la
 * transcription de fond ne reprend plus (voir vocauxEnFond.ts). Resté
 * « reçu », il se reprenait à chaque ouverture pour échouer de même —
 * quatre-vingt-onze fois en six jours chez son auteur, pour une dictée
 * relevée une seconde fois sur Nuage, dont la synchronisation avait effacé le
 * son. Un son présent mais illisible est un échec comme un autre : il se
 * reprendra une fois, à l'ouverture suivante.
 */
fn son_du_vocal(c: &rusqlite::Connection, dossier: &std::path::Path, id: &str, fichier: &str) -> R<Option<Vec<u8>>> {
    let lu = if fichier.is_empty() {
        Err(std::io::Error::from(std::io::ErrorKind::NotFound))
    } else {
        std::fs::read(dossier.join(fichier))
    };
    let (etat, erreur) = match lu {
        Ok(octets) => return Ok(Some(octets)),
        Err(er) if er.kind() == std::io::ErrorKind::NotFound => {
            diag_ecrire(format!("VOCAL PERDU {id} : enregistrement introuvable ({er}), il ne sera plus repris"));
            ("perdu", SON_INTROUVABLE.to_string())
        }
        Err(er) => ("echec", format!("Enregistrement illisible : {er}")),
    };
    c.execute("UPDATE vocaux SET etat=?2, erreur=?3 WHERE id=?1", params![id, etat, erreur]).map_err(e)?;
    Ok(None)
}

#[cfg(test)]
mod tests_vocaux {
    use super::*;

    fn base_et_dossier() -> (rusqlite::Connection, tempfile::TempDir) {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        (c, tempfile::tempdir().unwrap())
    }

    fn etat_de(c: &rusqlite::Connection, id: &str) -> (String, String) {
        c.query_row("SELECT etat, erreur FROM vocaux WHERE id=?1", params![id], |r| Ok((r.get(0)?, r.get(1)?))).unwrap()
    }

    #[test]
    fn un_vocal_dont_le_son_a_disparu_passe_a_perdu() {
        let (c, dossier) = base_et_dossier();
        // Rangé comme par le relais de Nuage : le son se lit, rien ne change.
        assert!(crate::portable::ranger_vocal(&c, dossier.path(), "v1", "2026-10-14T10:18:18", 14.7, "c1", "", &[7u8; 4000]).unwrap());
        assert_eq!(son_du_vocal(&c, dossier.path(), "v1", "vocal-v1.wav").unwrap(), Some(vec![7u8; 4000]));
        assert_eq!(etat_de(&c, "v1"), ("recu".into(), String::new()));
        // Puis la synchronisation efface le fichier : le vocal ne se reprendra plus.
        std::fs::remove_file(dossier.path().join("vocal-v1.wav")).unwrap();
        assert_eq!(son_du_vocal(&c, dossier.path(), "v1", "vocal-v1.wav").unwrap(), None);
        assert_eq!(etat_de(&c, "v1"), ("perdu".into(), SON_INTROUVABLE.into()));
        // Sans nom de fichier, pas davantage de son.
        c.execute("INSERT INTO vocaux (id, fichier, etat) VALUES ('v2', '', 'recu')", []).unwrap();
        assert_eq!(son_du_vocal(&c, dossier.path(), "v2", "").unwrap(), None);
        assert_eq!(etat_de(&c, "v2").0, "perdu");
    }

    #[test]
    fn un_son_present_mais_illisible_est_un_echec_qui_se_reprendra() {
        let (c, dossier) = base_et_dossier();
        c.execute("INSERT INTO vocaux (id, fichier, etat) VALUES ('v3', 'vocal-v3.wav', 'recu')", []).unwrap();
        // Un dossier à la place du fichier : il est là, mais ne se lit pas.
        std::fs::create_dir(dossier.path().join("vocal-v3.wav")).unwrap();
        assert_eq!(son_du_vocal(&c, dossier.path(), "v3", "vocal-v3.wav").unwrap(), None);
        let (etat, erreur) = etat_de(&c, "v3");
        assert_eq!(etat, "echec");
        assert!(erreur.starts_with("Enregistrement illisible"), "{erreur}");
    }
}

// ── Projets de classe ────────────────────────────────────────────────────

#[tauri::command]
pub fn projets_list(db: State<Db>) -> R<Vec<Projet>> {
    let c = db.lock();
    // Par mois d'abord : c'est ainsi qu'on les regarde, l'année scolaire
    // commençant en septembre — d'où le tri qui met 09 avant 01.
    let mut st = c
        .prepare(
            "SELECT * FROM projets
             ORDER BY CASE WHEN mois >= '09' THEN 0 ELSE 1 END, mois, date_creation DESC",
        )
        .map_err(e)?;
    let rows = st.query_map([], Projet::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn projet_save(db: State<Db>, projet: Projet) -> R<Projet> {
    enregistrer_projet(&db.lock(), &projet)?;
    Ok(projet)
}

/// Écrit un projet, neuf ou repris — son corpus compris.
fn enregistrer_projet(c: &rusqlite::Connection, projet: &Projet) -> R<()> {
    c.execute(
        "INSERT INTO projets (id,titre,descriptif,couleur,date_creation,annee,image_nom,mois,semaine,etat,etapes_json,domaines,origine,mots,phrases)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
         ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, descriptif = excluded.descriptif,
           couleur = excluded.couleur, annee = excluded.annee, image_nom = excluded.image_nom,
           mois = excluded.mois, semaine = excluded.semaine, etat = excluded.etat, etapes_json = excluded.etapes_json,
           domaines = excluded.domaines, origine = excluded.origine, mots = excluded.mots, phrases = excluded.phrases",
        params![projet.id, projet.titre, projet.descriptif, projet.couleur, projet.date_creation,
                projet.annee, projet.image_nom, projet.mois, projet.semaine, projet.etat, projet.etapes_json,
                projet.domaines, projet.origine, projet.mots, projet.phrases],
    ).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn projet_delete(db: State<Db>, id: String) -> R<()> {
    let c = db.lock();
    // Les séquences rattachées restent : c'est le lien qui tombe, pas le
    // travail (ON DELETE SET NULL sur `sequences.projet_id`).
    c.execute("DELETE FROM projets WHERE id=?1", params![id]).map_err(e)?;
    Ok(())
}

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

#[tauri::command(async)]
pub fn coffre_list(db: State<Db>) -> R<Vec<DocumentCoffre>> {
    let c = db.lock();
    let mut st = c.prepare("SELECT * FROM documents_coffre ORDER BY date_ajout DESC").map_err(e)?;
    let rows = st.query_map([], DocumentCoffre::from_row).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command(async)]
pub fn coffre_save(db: State<Db>, document: DocumentCoffre) -> R<DocumentCoffre> {
    let c = db.lock();
    c.execute(
        "INSERT INTO documents_coffre (id,nom,nom_fichier,taille_octets,date_ajout)
         VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, nom_fichier = excluded.nom_fichier, taille_octets = excluded.taille_octets, date_ajout = excluded.date_ajout",
        params![document.id, document.nom, document.nom_fichier, document.taille_octets, document.date_ajout],
    ).map_err(e)?;
    Ok(document)
}

/// Le plus lourd des documents officiels du coffre fait une trentaine de mégaoctets.
const COFFRE_MAX_OCTETS: usize = 200 * 1024 * 1024;

/// Un PDF commence par « %PDF- » (la norme le tolère dans le premier kilooctet).
fn est_un_pdf(octets: &[u8]) -> bool {
    octets[..octets.len().min(1024)].windows(5).any(|f| f == b"%PDF-")
}

/// Télécharge un PDF distant (URL) dans le coffre-fort.
///
/// En https seulement, redirections comprises, au plus `COFFRE_MAX_OCTETS`,
/// et seulement un PDF : l'adresse vient de l'interface, et le fichier
/// s'ouvre ensuite d'un clic.
#[tauri::command]
pub async fn coffre_download(db: State<'_, Db>, url: String, nom: String) -> R<DocumentCoffre> {
    if !url.starts_with("https://") {
        return Err("Seuls les documents servis en https se téléchargent.".into());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::custom(|essai| {
            if essai.url().scheme() == "https" && essai.previous().len() < 10 { essai.follow() } else { essai.stop() }
        }))
        .build()
        .map_err(|e| format!("Réseau : {e}"))?;
    let mut resp = client.get(&url).send().await.map_err(|e| format!("Réseau : {e}"))?;
    if !resp.status().is_success() { return Err(format!("HTTP {}", resp.status())); }
    if resp.content_length().is_some_and(|n| n as usize > COFFRE_MAX_OCTETS) {
        return Err("Document trop lourd pour le coffre.".into());
    }
    let mut bytes = Vec::new();
    while let Some(morceau) = resp.chunk().await.map_err(|e| format!("Téléchargement : {e}"))? {
        bytes.extend_from_slice(&morceau);
        if bytes.len() > COFFRE_MAX_OCTETS {
            return Err("Document trop lourd pour le coffre.".into());
        }
    }
    if !est_un_pdf(&bytes) {
        return Err("Ce document n'est pas un PDF.".into());
    }
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

#[tauri::command(async)]
pub fn coffre_delete(db: State<Db>, id: String, nom_fichier: String) -> R<()> {
    let c = db.lock();
    c.execute("DELETE FROM documents_coffre WHERE id=?1", params![id]).map_err(e)?;
    if !nom_fichier.is_empty() { effacer_fichier_joint(&c, &nom_fichier); }
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
    for row in rows {
        let (k, v) = row.map_err(e)?;
        // Les secrets que l'interface n'affiche pas ne lui parviennent pas.
        if let Some(v) = crate::trousseau::pour_l_interface(&k, v) { map.insert(k, v); }
    }
    Ok(map)
}

/// Les réglages non vides d'une famille (« pictos: »…), sans lire tous les autres.
#[tauri::command]
pub fn settings_prefixe(db: State<Db>, prefixe: String) -> R<std::collections::HashMap<String, String>> {
    let c = db.lock();
    let mut st = c
        .prepare("SELECT cle, valeur FROM settings WHERE substr(cle, 1, length(?1)) = ?1 AND valeur <> ''")
        .map_err(e)?;
    let rows = st.query_map(params![prefixe], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).map_err(e)?;
    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(e)?;
        if let Some(v) = crate::trousseau::pour_l_interface(&k, v) { map.insert(k, v); }
    }
    Ok(map)
}

#[tauri::command]
pub fn setting_get(db: State<Db>, cle: String) -> R<Option<String>> {
    let c = db.lock();
    let v = c.query_row("SELECT valeur FROM settings WHERE cle=?1", params![cle],
                        |r| r.get::<_, String>(0)).ok();
    Ok(v.and_then(|v| crate::trousseau::pour_l_interface(&cle, v)))
}

#[tauri::command]
pub fn setting_set(db: State<Db>, cle: String, valeur: String) -> R<()> {
    let c = db.lock();
    crate::sync::set_setting(&c, &cle, &valeur)
}

/// Écrit un réglage qui tient toute une collection — les plans de salle, les agencements — par écart : ce que
/// l'écran a changé depuis `avant` l'emporte, le reste garde ce que la base a, reçu d'un autre ordinateur
/// entre-temps compris. L'écran lisait ces réglages en s'ouvrant et les réécrivait d'un bloc : un placement fait
/// sur l'autre ordinateur disparaissait au placement suivant ici, et des deux côtés. Rend la valeur en base.
#[tauri::command]
pub fn setting_ecart(db: State<Db>, cle: String, avant: String, apres: String) -> R<String> {
    let c = db.lock();
    let valeur = reglage_par_ecart(&crate::sync::get_setting(&c, &cle), &avant, &apres);
    crate::sync::set_setting(&c, &cle, &valeur)?;
    Ok(valeur)
}

pub(crate) fn reglage_par_ecart(ici: &str, avant: &str, apres: &str) -> String {
    if ici.trim().is_empty() { apres.to_string() } else { fusionner_ecran(ici, avant, apres) }
}

/// Les notes rapides, dans les réglages partagés : le panneau 📝 les écrit là.
const NOTES_RAPIDES: &str = "notesRapides";

/**
 * Ajoute un point aux notes rapides : ce que le téléphone y envoie.
 *
 * Lu et écrit d'un seul tenant, sous le verrou de la base : deux dictées qui
 * arrivent ensemble ne s'écrasent pas. Rend les notes telles qu'elles sont
 * désormais, pour le panneau ouvert.
 */
#[tauri::command]
pub fn notes_rapides_ajouter(db: State<Db>, texte: String) -> R<String> {
    ajouter_aux_notes_rapides(&db.lock(), &texte)
}

pub(crate) fn ajouter_aux_notes_rapides(c: &rusqlite::Connection, texte: &str) -> R<String> {
    let notes = avec_un_point_de_plus(&crate::sync::get_setting(c, NOTES_RAPIDES), texte);
    crate::sync::set_setting(c, NOTES_RAPIDES, &notes)?;
    Ok(notes)
}

/**
 * Les notes avec un point de plus, à la ligne sous ce qui est écrit : « - … ».
 * Une note de plusieurs lignes reste un seul point : les lignes suivantes se
 * décalent sous le tiret. Le même calcul existe côté interface
 * (`avecUnPointDePlus`, notesRapides.ts) : les deux doivent rester d'accord.
 */
pub(crate) fn avec_un_point_de_plus(notes: &str, texte: &str) -> String {
    let lignes: Vec<&str> = texte.lines().map(str::trim).filter(|l| !l.is_empty()).collect();
    if lignes.is_empty() {
        return notes.to_string();
    }
    let point = format!("- {}", lignes.join("\n  "));
    let avant = notes.trim_end();
    if avant.is_empty() { point } else { format!("{avant}\n{point}") }
}

#[cfg(test)]
mod tests_notes_rapides {
    use super::{ajouter_aux_notes_rapides, avec_un_point_de_plus};

    #[test]
    fn un_point_s_ajoute_a_la_ligne_sous_ce_qui_est_ecrit() {
        assert_eq!(avec_un_point_de_plus("", "acheter des feutres"), "- acheter des feutres");
        assert_eq!(avec_un_point_de_plus("- appeler le SESSAD", " rendre les cahiers \n"), "- appeler le SESSAD\n- rendre les cahiers");
        // Les lignes vides du bas ne s'empilent pas ; le texte de l'enseignant n'est pas touché au-dessus.
        assert_eq!(avec_un_point_de_plus("Idées\n  - un atelier\n\n\n", "photos"), "Idées\n  - un atelier\n- photos");
        // Plusieurs lignes : un seul point, la suite décalée sous le tiret.
        assert_eq!(avec_un_point_de_plus("", "Sortie au musée\n\n  prévoir 3 accompagnateurs"), "- Sortie au musée\n  prévoir 3 accompagnateurs");
        // Rien à dire : rien ne change.
        assert_eq!(avec_un_point_de_plus("- a", "  \n "), "- a");
    }

    #[test]
    fn les_points_arrives_ensemble_s_ajoutent_tous() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        crate::sync::set_setting(&c, "notesRapides", "penser aux photos").unwrap();
        assert_eq!(ajouter_aux_notes_rapides(&c, "acheter des feutres").unwrap(), "penser aux photos\n- acheter des feutres");
        assert_eq!(ajouter_aux_notes_rapides(&c, "réunion jeudi").unwrap(), "penser aux photos\n- acheter des feutres\n- réunion jeudi");
        assert_eq!(crate::sync::get_setting(&c, "notesRapides"), "penser aux photos\n- acheter des feutres\n- réunion jeudi");
    }
}

// ============================================================
// FICHIERS (images, PDF) — copie dans le dossier de données
// ============================================================

/// Écrit des octets (base64) dans Fichiers/ et renvoie le nom de fichier.
#[tauri::command(async)]
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
#[tauri::command(async)]
pub fn fichier_read(nom: String) -> R<String> {
    use base64::Engine;
    let bytes = std::fs::read(fichier_de_l_application(&nom)?).map_err(e)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

/// Ouvre une pièce jointe dans l'application par défaut (Aperçu, Acrobat…).
///
/// Passe par le backend plutôt que par le greffon côté fenêtre : celui-ci
/// exigerait une permission d'ouverture de chemins, qui manquerait en silence.
/// Le nom est refusé s'il sort du dossier des fichiers.
#[tauri::command(async)]
pub fn fichier_ouvrir(nom: String) -> R<()> {
    let chemin = fichier_de_l_application(&nom)?;
    if !chemin.exists() {
        return Err("Ce fichier n'existe plus.".into());
    }
    ouvrir_ou_montrer(&chemin)
}

/// Les sortes de fichiers qu'on ouvre d'un clic dans leur application :
/// documents, images, son, vidéo. Une pièce jointe peut venir d'un collègue,
/// d'un bureau commun, du téléphone : un programme, un script, un raccourci
/// (`.command`, `.terminal`, `.app`, `.exe`, `.lnk`…) ou un document à macros
/// ne doit pas se lancer d'un clic.
const OUVERTS_D_UN_CLIC: &[&str] = &[
    "pdf", "png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "bmp", "tif", "tiff",
    "txt", "md", "rtf", "csv", "odt", "ods", "odp", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "pages", "numbers", "key", "epub", "obz", "obf",
    "mp3", "m4a", "wav", "aac", "ogg", "opus", "flac", "mp4", "mov", "m4v", "webm", "avi", "mkv",
];

pub(crate) fn s_ouvre_d_un_clic(chemin: &std::path::Path) -> bool {
    chemin.extension().and_then(|x| x.to_str())
        .is_some_and(|x| OUVERTS_D_UN_CLIC.contains(&x.to_ascii_lowercase().as_str()))
}

/// Ouvre un fichier dans son application s'il est d'une sorte sûre ; sinon le
/// montre dans le Finder ou l'Explorateur, sans le lancer.
pub(crate) fn ouvrir_ou_montrer(chemin: &std::path::Path) -> R<()> {
    if s_ouvre_d_un_clic(chemin) {
        tauri_plugin_opener::open_path(chemin, None::<&str>).map_err(e)
    } else {
        tauri_plugin_opener::reveal_item_in_dir(chemin).map_err(e)
    }
}

/// Copie un fichier externe (chemin absolu, ex. glisser-déposer depuis le
/// Finder/Aperçu) dans Fichiers/ et renvoie le nom généré. Évite l'aller-retour
/// en base64 pour les PDF/images potentiellement volumineux.
#[tauri::command(async)]
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

/// Un fichier d'une archive à écrire : son chemin dans l'archive, et son texte.
#[derive(serde::Deserialize)]
pub struct FichierArchive { nom: String, contenu: String }

/// Les noms de fichiers d'une archive : des chemins relatifs, sans remonter d'un dossier.
fn nom_d_archive_sur(nom: &str) -> bool {
    !nom.is_empty() && !nom.starts_with('/') && !nom.contains('\\') && nom.split('/').all(|p| !p.is_empty() && p != "..")
}

/// Écrit une archive zip de fichiers texte au chemin choisi — un document Word
/// (.docx) en est une : l'écran en fabrique les parties, d'ici on les range.
#[tauri::command]
pub fn enregistrer_archive(chemin: String, fichiers: Vec<FichierArchive>) -> R<()> {
    use std::io::Write;
    if let Some(f) = fichiers.iter().find(|f| !nom_d_archive_sur(&f.nom)) {
        return Err(format!("Nom refusé dans l'archive : {}", f.nom));
    }
    let mut zip = zip::ZipWriter::new(std::fs::File::create(&chemin).map_err(e)?);
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for f in fichiers {
        zip.start_file(f.nom, options).map_err(e)?;
        zip.write_all(f.contenu.as_bytes()).map_err(e)?;
    }
    zip.finish().map_err(e)?;
    Ok(())
}

/// Écrit un document HTML temporaire et l'ouvre dans le navigateur par défaut
/// (rendu riche : blocs positionnés, tableaux, images → imprimable / PDF natif).
#[tauri::command]
pub fn ouvrir_html(html: String, scripts: Option<Vec<String>>) -> R<()> {
    let nom = format!(
        "maitrize-{}.html",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = dossier_temporaire().join(nom);
    std::fs::write(&path, avec_politique(&html, &scripts.unwrap_or_default())).map_err(e)?;
    // Ouverture via NSWorkspace (plugin opener) → compatible App Sandbox.
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/**
 * La page qu'on ouvre dans le navigateur n'exécute que les scripts que l'application y a mis, reconnus à leur
 * empreinte, et ne charge rien d'ailleurs : ce qu'elle cite — un bilan, une réponse de l'IA, le titre d'un document
 * reçu d'un ami — ne peut rien y lancer. La règle se pose en tête de `<head>`, avant tout le reste.
 */
pub(crate) fn avec_politique(html: &str, scripts: &[String]) -> String {
    use base64::Engine;
    use sha2::Digest;
    let empreintes: Vec<String> = scripts
        .iter()
        .map(|s| format!("'sha256-{}'", base64::engine::general_purpose::STANDARD.encode(sha2::Sha256::digest(s.as_bytes()))))
        .collect();
    let permis = if empreintes.is_empty() { "'none'".to_string() } else { empreintes.join(" ") };
    let regle = format!(
        "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; \
         font-src data:; script-src {permis}; base-uri 'none'; form-action 'none'\">"
    );
    // Après la balise <head> (pas <header>) ; à défaut, après le doctype : une balise avant lui ferait passer la page
    // en mode dégradé.
    let bas = html.to_ascii_lowercase();
    let fin_de_balise = |debut: usize| bas[debut..].find('>').map(|i| debut + i + 1);
    let tete = bas.match_indices("<head").map(|(i, _)| i).find(|&i| matches!(bas.as_bytes().get(i + 5), Some(b'>' | b' ' | b'\t' | b'\n' | b'\r')));
    let ou = match tete {
        Some(i) => fin_de_balise(i),
        None => bas.find("<!doctype").and_then(fin_de_balise),
    };
    match ou {
        Some(i) => format!("{}{regle}{}", &html[..i], &html[i..]),
        None => format!("{regle}{html}"),
    }
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
    /// Les titres du matériel à imprimer de la séance : il suit le journal.
    #[serde(default)]
    pub materiel: Vec<String>,
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

/// Un PDF à joindre au planning : le matériel d'une séance.
#[derive(serde::Deserialize)]
pub struct AnnexePlanning {
    pub titre: String,
    /// « lundi 28 septembre · 09:00 · Lecture » : d'où vient la feuille.
    #[serde(default)]
    pub quand: String,
    /// Le nom du fichier dans le dossier des fichiers.
    pub fichier: String,
    /// L'échelle à l'impression : 1 par défaut.
    #[serde(default)]
    pub echelle: Option<f32>,
    /// Le bandeau gris en haut de sa première page ; pas sur la fiche d'un
    /// élève, qui lui est donnée telle quelle. Présent par défaut.
    #[serde(default = "avec_bandeau")]
    pub bandeau: bool,
}

fn avec_bandeau() -> bool {
    true
}

/// Construit un PDF du planning (mise en page inspirée de l'app native) et
/// l'ouvre dans l'app PDF par défaut (Aperçu sur macOS) → visualisation,
/// impression AirPrint et sauvegarde.
///
/// Le matériel des séances vient à sa suite. Renvoie les documents qu'on n'a
/// pas pu joindre : le planning sort quand même.
#[tauri::command(async)]
pub fn imprimer_planning(titre: String, jours: Vec<PlanningJour>, annexes: Vec<AnnexePlanning>) -> R<Vec<String>> {
    let journal = construire_planning_pdf(&titre, &jours)?;
    let (octets, manques) = if annexes.is_empty() {
        (journal, Vec::new())
    } else {
        let joints: Vec<crate::fusion_pdf::Joint> = annexes
            .into_iter()
            .map(|a| crate::fusion_pdf::Joint {
                titre: a.titre,
                quand: a.quand,
                chemin: fichiers_dir().join(a.fichier),
                echelle: a.echelle.unwrap_or(1.0),
                bandeau: a.bandeau,
            })
            .collect();
        crate::fusion_pdf::joindre(&journal, &joints)?
    };
    let nom = format!(
        "planning-{}.pdf",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = dossier_temporaire().join(nom);
    std::fs::write(&path, octets).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(manques)
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
    layer.use_text(titre.replace("Planning — ", ""), if semaine { 18.0 } else { 22.0 }, Mm(marge), Mm(y), &gras);
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
            layer.use_text(j.jour.to_uppercase(), 9.0, Mm(x), Mm(cy), &gras);
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
                layer.use_text(format!("{} – {}", c.heure_debut, c.heure_fin), 7.0, Mm(x + 3.0), Mm(cy), &gras);
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
            .filter(|c| [&c.objectifs, &c.deroulement, &c.prevu, &c.bilan].iter().any(|t| !t.trim().is_empty()) || !c.materiel.is_empty())
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
                layer.use_text(format!("{} – {}   {}", c.heure_debut, c.heure_fin, titre_c), 12.0, Mm(gauche + 5.0), Mm(y), &gras);
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
                // Le matériel est joint à la suite du journal : on le dit ici,
                // pour que la pile se lise dans l'ordre.
                let materiel = c.materiel.iter().map(|m| format!("• {m}")).collect::<Vec<_>>().join("\n");
                bloc("MATÉRIEL À IMPRIMER · JOINT À LA SUITE", &materiel, &mut layer, &mut y);
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
            prevu: prevu.into(), bilan: String::new(), materiel: vec![],
        }
    }

    /// Le matériel d'une séance s'annonce dans le détail du journal.
    #[test]
    fn le_materiel_joint_s_annonce_dans_le_detail() {
        let mut c = creneau("Lecture", "");
        c.materiel = vec!["Fiche syllabes".into()];
        let jours = vec![PlanningJour { jour: "lundi 28 septembre".into(), rangs: vec![vec![c]] }];
        let pdf = construire_planning_pdf("Planning — lundi 28 septembre", &jours).expect("le PDF se construit");
        let doc = lopdf::Document::load_mem(&pdf).expect("relisible");
        let flux: String = doc.get_pages().values().map(|p| String::from_utf8_lossy(&doc.get_page_content(*p)).into_owned()).collect();
        // printpdf écrit chaque texte en hexadécimal : <4A4F494E54> Tj.
        let lisible: String = flux
            .split('<')
            .skip(1)
            .filter_map(|bout| bout.split('>').next())
            .filter_map(|hex| (0..hex.len()).step_by(2).map(|i| u8::from_str_radix(hex.get(i..i + 2)?, 16).ok()).collect::<Option<Vec<u8>>>())
            .map(|octets| String::from_utf8_lossy(&octets).into_owned() + " ")
            .collect();
        assert!(lisible.contains("JOINT"), "l'intitulé du bloc matériel est écrit : {lisible}");
        assert!(lisible.contains("Fiche syllabes"), "{lisible}");
    }

    /// Le défaut signalé : un créneau sans séance, au cahier journal rempli,
    /// sortait vide à l'impression.
    #[test]
    fn le_cahier_journal_sort_a_limpression() {
        let long = "Écriture d'un court texte à partir d'un corpus de mots. ".repeat(160);
        // Le détail des créneaux est celui de la page d'un jour.
        let jours = vec![PlanningJour {
            jour: "mardi 15 septembre".into(),
            rangs: vec![vec![creneau("Yasmine", &long)], vec![creneau("Eliot", "évaluation diagnostique CM2 · vitesses et durées")]],
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
#[tauri::command(async)]
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
    let path = dossier_temporaire().join(nom);
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
#[tauri::command(async)]
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
        eleve_nom.chars().map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' { c } else { '_' }).collect::<String>().trim()
    );
    let path = dossier_temporaire().join(nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    Ok(())
}

/// Exporte le bilan de PPI (mode IME/inclusion) en PDF et l'ouvre dans Aperçu.
#[tauri::command(async)]
// Un bilan de PPI porte neuf champs saisis dans la fenêtre : les grouper
// n'ajouterait qu'une structure de passage.
#[allow(clippy::too_many_arguments)]
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
    let path = dossier_temporaire().join(nom);
    std::fs::write(&path, &bytes).map_err(e)?;
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
    // Faux pour ranger le PDF sans l'ouvrir (sur le bureau).
    ouvrir: Option<bool>,
    // Les images de l'enseignant, que la banque n'a pas : elles arrivent avec la demande.
    images: Option<Vec<crate::jeux_pdf::ImageFournie>>,
) -> R<String> {
    let bytes = crate::jeux_pdf::construire(&jeu, &pictos, images.as_deref().unwrap_or(&[]), &options)?;
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
    let path = dossier_temporaire().join(&nom);
    std::fs::write(&path, &bytes).map_err(e)?;
    if ouvrir.unwrap_or(true) {
        tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    }
    Ok(path.to_string_lossy().into_owned())
}

/// Imprime un tableau de langage assisté.
///
/// Le gabarit arrive tel que l'enseignant l'a posé : ni tri, ni complétion.
/// Déplacer une case briserait l'automatisation du geste que le tableau sert
/// justement à installer.
#[tauri::command]
pub fn tla_generer(mut gabarit: crate::tla_pdf::Gabarit, ouvrir: Option<bool>) -> R<String> {
    images_du_tableau(&mut gabarit)?;
    let bytes = crate::tla_pdf::construire(&gabarit)?;
    ecrire_pdf_du_tableau("tla", &gabarit, &bytes, ouvrir)
}

/// Une image de Mes pictos — une photo prise au téléphone — arrive par son seul nom : elle se cherche
/// parmi les fichiers de l'application, sans jamais en sortir.
fn images_du_tableau(gabarit: &mut crate::tla_pdf::Gabarit) -> R<()> {
    for case in gabarit.cases.iter_mut() {
        if !case.fichier.is_empty() && !std::path::Path::new(&case.fichier).is_absolute() {
            case.fichier = fichier_de_l_application(&case.fichier)?.to_string_lossy().into_owned();
        }
    }
    Ok(())
}

/// Le PDF d'un tableau ou d'un classeur, dans le dossier temporaire, ouvert si on le demande ; son chemin.
fn ecrire_pdf_du_tableau(prefixe: &str, gabarit: &crate::tla_pdf::Gabarit, bytes: &[u8], ouvrir: Option<bool>) -> R<String> {
    let propre: String = format!("{} {}", gabarit.eleve, gabarit.nom)
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .trim_matches('_')
        .to_lowercase();
    let nom = format!(
        "{prefixe}-{}-{}.pdf",
        if propre.is_empty() { "tableau".into() } else { propre },
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
    );
    let path = dossier_temporaire().join(&nom);
    std::fs::write(&path, bytes).map_err(e)?;
    if ouvrir.unwrap_or(true) {
        tauri_plugin_opener::open_path(&path, None::<&str>).map_err(e)?;
    }
    Ok(path.to_string_lossy().into_owned())
}

/// Imprime un classeur de communication : l'accueil, puis chaque page où mènent ses cases, en un seul PDF.
#[tauri::command]
pub fn tla_classeur(mut pages: Vec<crate::tla_pdf::Gabarit>, ouvrir: Option<bool>) -> R<String> {
    for page in pages.iter_mut() {
        images_du_tableau(page)?;
    }
    let bytes = crate::tla_pdf::construire_classeur(&pages)?;
    let accueil = pages.first().ok_or_else(|| "Le classeur n'a pas de page.".to_string())?;
    ecrire_pdf_du_tableau("classeur", accueil, &bytes, ouvrir)
}

/// Écrit le classeur au format ouvert OBZ, au chemin choisi dans la fenêtre « Enregistrer sous ».
#[tauri::command(async)]
pub fn tla_exporter_obz(mut pages: Vec<crate::tla_pdf::Gabarit>, chemin: String) -> R<()> {
    for page in pages.iter_mut() {
        images_du_tableau(page)?;
    }
    let octets = crate::tla_obz::construire_obz(&pages)?;
    std::fs::write(&chemin, octets).map_err(e)
}

#[tauri::command(async)]
pub fn imprimer_pdf(nom: String) -> R<()> {
    let path = fichier_de_l_application(&nom)?;
    if !path.exists() {
        return Err("Fichier introuvable".to_string());
    }
    ouvrir_ou_montrer(&path)
}

#[tauri::command(async)]
pub fn fichier_delete(db: State<Db>, nom: String) -> R<()> {
    fichier_de_l_application(&nom)?;
    effacer_fichier_joint(&db.lock(), &nom);
    Ok(())
}

/// Ramène de la corbeille des fichiers qu'on venait d'effacer : « Annuler » (ou ⌘Z) après une
/// suppression. Leur marque d'effacement tombe, comme après une restauration. Rend combien sont revenus.
#[tauri::command]
pub fn fichiers_ramener(db: State<Db>, noms: Vec<String>) -> R<usize> {
    let c = db.lock();
    let (corbeille, fichiers) = (crate::db::corbeille_dir(), crate::db::fichiers_dir());
    Ok(noms.iter().filter(|nom| nom_de_fichier_simple(nom) && crate::db::ramener_dans(&c, nom, &corbeille, &fichiers)).count())
}

/// Un fichier du dossier de l'application, d'après son nom : un nom seul, jamais un chemin. Une page
/// détournée ne peut ainsi ni lire ni effacer ailleurs sur l'ordinateur (« ../../ », chemin absolu).
pub(crate) fn fichier_de_l_application(nom: &str) -> R<std::path::PathBuf> {
    if !nom_de_fichier_simple(nom) {
        return Err("Nom de fichier invalide.".into());
    }
    Ok(fichiers_dir().join(nom))
}

/// Un nom de fichier seul : ni dossier, ni remontée, ni chemin absolu.
pub(crate) fn nom_de_fichier_simple(nom: &str) -> bool {
    let simple = std::path::Path::new(nom).file_name().is_some_and(|f| f == std::ffi::OsStr::new(nom));
    !nom.is_empty() && simple && !nom.contains('/') && !nom.contains('\\') && !nom.contains("..")
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
    ("sequence", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Séquence'), COALESCE(matiere,''),
                  COALESCE(objectifs,'') || '\n' || COALESCE(competence_visee,''),
                  COALESCE(date_creation,''), '' FROM sequences WHERE ", hors_poubelle!("dossier"))),
    ("seance", concat!("SELECT s.id, COALESCE(NULLIF(s.titre,''), 'Séance ' || s.numero),
                'Séance ' || s.numero || COALESCE(' · ' || NULLIF(q.titre,''), ''),
                COALESCE(s.objectifs,'') || '\n' || COALESCE(s.deroulement,'') || '\n' || COALESCE(s.materiel,'') || '\n' || COALESCE(s.bilan,''),
                COALESCE(s.date,''), COALESCE(s.sequence_id,'')
                FROM seances s LEFT JOIN sequences q ON q.id = s.sequence_id WHERE ", hors_poubelle!("q.dossier"))),
    ("creneau", "SELECT id, COALESCE(NULLIF(matiere,''),'Créneau'),
                 COALESCE(heure_debut,'') || '–' || COALESCE(heure_fin,''),
                 COALESCE(prevu,'') || '\n' || COALESCE(bilan,''), COALESCE(date,''), COALESCE(date,'')
                 FROM creneaux"),
    ("observation", "SELECT c.id, COALESCE(NULLIF(e.nom,''),'Observation'), COALESCE(c.type,''),
                     COALESCE(c.texte,''), COALESCE(c.date,''), COALESCE(c.eleve_id,'')
                     FROM commentaires_eleve c LEFT JOIN eleves e ON e.id = c.eleve_id"),
    ("atelier", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Atelier'), COALESCE(matiere,''),
                 COALESCE(objectifs,'') || '\n' || COALESCE(materiel,''), '', '' FROM ateliers WHERE ", hors_poubelle!("dossier"))),
    ("espace", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Espace'), '',
                COALESCE(description_espace,''), '', '' FROM espaces WHERE ", hors_poubelle!("dossier"))),
    ("jeu", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Jeu'), COALESCE(type_jeu,''),
             COALESCE(regles,'') || '\n' || COALESCE(description_jeu,'') || '\n' || COALESCE(competences,''),
             COALESCE(date_creation,''), '' FROM jeux WHERE ", hors_poubelle!("dossier"))),
    ("outil", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Outil'),
               CASE genre WHEN 'affichage' THEN 'Affichage' WHEN 'evaluation' THEN 'Évaluation' ELSE 'Outil' END
               || COALESCE(' · ' || NULLIF(categorie,''),''),
               COALESCE(usage,'') || '\n' || COALESCE(consignes,''), COALESCE(date_creation,''), COALESCE(genre,'') FROM outils_classe WHERE ", hors_poubelle!("dossier"))),
    ("texte", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Texte'), COALESCE(dossier,''), COALESCE(contenu,''),
               COALESCE(NULLIF(date_modification,''), date_creation), '' FROM textes WHERE ", hors_poubelle!("dossier"))),
    ("eleve", "SELECT id, COALESCE(NULLIF(nom,''),'Élève'), COALESCE(niveau,''), COALESCE(notes,''), '', '' FROM eleves"),
    ("materiel", concat!("SELECT id, COALESCE(NULLIF(titre,''),'Matériel'), COALESCE(competence_titre,''),
                  COALESCE(description_materiel,''), '', '' FROM materiel_items WHERE ", hors_poubelle!("dossier"))),
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
                 competence_visee TEXT, date_creation TEXT, dossier TEXT NOT NULL DEFAULT '');
             CREATE TABLE seances (id TEXT PRIMARY KEY, titre TEXT, numero INTEGER, objectifs TEXT,
                 deroulement TEXT, materiel TEXT, bilan TEXT, date TEXT, sequence_id TEXT);
             CREATE TABLE creneaux (id TEXT PRIMARY KEY, date TEXT, heure_debut TEXT, heure_fin TEXT,
                 matiere TEXT, prevu TEXT, bilan TEXT);
             INSERT INTO sequences VALUES ('q1','Les fractions','Maths','Partager','','2026-09-01','');
             INSERT INTO seances VALUES ('s1','Partager une pizza',1,'Comprendre le demi',
                 'On découpe une pizza en parts égales.','Pizza en carton','','2026-09-12','q1');
             INSERT INTO creneaux VALUES ('c1','2026-09-15','09:00','10:00','Atelier cuisine',
                 'Récré puis pâte à modeler','Amédée a demandé de l''aide');",
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
        assert!(chercher(&c, "amedee").iter().any(|x| x.kind == "creneau"));
    }

    #[test]
    fn la_recherche_ne_trouve_rien_de_ce_qui_est_a_la_poubelle() {
        let c = base();
        c.execute("UPDATE sequences SET dossier = '🗑 Poubelle/Maths' WHERE id = 'q1'", []).unwrap();
        // Ni la séquence jetée, ni ses séances.
        assert!(chercher(&c, "fractions").is_empty());
        assert!(chercher(&c, "pizza").is_empty());
        // Remise en place, elle se retrouve.
        c.execute("UPDATE sequences SET dossier = 'Maths' WHERE id = 'q1'", []).unwrap();
        assert_eq!(chercher(&c, "fractions").first().map(|x| x.id.as_str()), Some("q1"));
        // Un dossier qui ne fait que commencer comme la poubelle n'en est pas une.
        c.execute("UPDATE sequences SET dossier = '🗑 Poubelles de tri' WHERE id = 'q1'", []).unwrap();
        assert!(!chercher(&c, "fractions").is_empty());
    }

    #[test]
    fn la_poubelle_ne_parait_que_si_on_la_demande() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE jeux (id TEXT, titre TEXT, dossier TEXT);
             INSERT INTO jeux VALUES ('a','Loto','Maths'), ('b','Memory','🗑 Poubelle'),
                                     ('c','Dominos','🗑 Poubelle/Maths/Calcul'), ('d','Uno', NULL);",
        ).unwrap();
        let ids = |avec: Option<bool>| -> Vec<String> {
            let sql = format!("SELECT id FROM jeux{} ORDER BY id", super::sauf_poubelle(avec));
            c.prepare(&sql).unwrap().query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect()
        };
        assert_eq!(ids(None), ["a", "d"]);
        assert_eq!(ids(Some(false)), ["a", "d"]);
        assert_eq!(ids(Some(true)), ["a", "b", "c", "d"]);
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
///
/// Le jeu de données a une ligne par académie : demander les lignes une à une
/// (cent au plus) coupait l'année en cours — ni Noël, ni printemps, ni été.
/// L'export regroupé rend chaque vacance une seule fois, toutes années comprises.
#[tauri::command]
pub async fn vacances_scolaires(zone: String) -> R<Vec<VacancePeriode>> {
    let url = format!(
        "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/exports/json?select=description,start_date,end_date,population&group_by=description,start_date,end_date,population&order_by=start_date&refine=zones%3AZone%20{}&timezone=Europe%2FParis&lang=fr",
        zone
    );
    let resp = reqwest::get(&url).await.map_err(|e| format!("Réseau : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let v: serde_json::Value = resp.json().await.map_err(|e| format!("JSON : {e}"))?;
    Ok(vacances_de_la_reponse(&v))
}

/// Les vacances des élèves, une fois chacune, dans l'ordre. L'été existe aussi
/// pour les enseignants, qui reprennent un jour plus tôt : on l'écarte, la
/// rentrée d'une classe est celle des élèves.
fn vacances_de_la_reponse(v: &serde_json::Value) -> Vec<VacancePeriode> {
    let lignes = v.as_array().or_else(|| v.get("results").and_then(|r| r.as_array()));
    let mut out = Vec::new();
    let mut vus = std::collections::HashSet::new();
    for rec in lignes.into_iter().flatten() {
        let champ = |nom: &str| rec.get(nom).and_then(|x| x.as_str()).unwrap_or("");
        let (desc, start, end) = (champ("description"), champ("start_date"), champ("end_date"));
        if desc.is_empty() || start.is_empty() || end.is_empty() { continue; }
        if champ("population").to_lowercase().contains("enseignant") { continue; }
        let periode = VacancePeriode {
            description: desc.to_string(),
            debut: start.chars().take(10).collect(),
            fin: end.chars().take(10).collect(),
        };
        if !vus.insert(format!("{}|{}|{}", periode.description, periode.debut, periode.fin)) { continue; }
        out.push(periode);
    }
    out.sort_by(|a, b| a.debut.cmp(&b.debut));
    out
}

#[cfg(test)]
mod tests_reglage_par_ecart {
    use super::reglage_par_ecart;

    #[test]
    fn ce_que_l_autre_ordinateur_a_ajoute_reste() {
        // L'écran avait lu le plan du lundi ; l'autre ordinateur a ajouté celui du mardi ; on place quelqu'un lundi.
        let ici = r#"{"lundi":{"a":"p1"},"mardi":{"b":"p2"}}"#;
        let fusion: serde_json::Value = serde_json::from_str(&reglage_par_ecart(ici, r#"{"lundi":{"a":"p1"}}"#, r#"{"lundi":{"a":"p1","c":"p3"}}"#)).unwrap();
        assert_eq!(fusion, serde_json::json!({"lundi":{"a":"p1","c":"p3"},"mardi":{"b":"p2"}}));
        // Ce que l'écran retire s'en va ; une base vide prend ce que l'écran montre.
        let retire: serde_json::Value = serde_json::from_str(&reglage_par_ecart(ici, r#"{"lundi":{"a":"p1"}}"#, "{}")).unwrap();
        assert_eq!(retire, serde_json::json!({"mardi":{"b":"p2"}}));
        assert_eq!(reglage_par_ecart("", "{}", r#"{"x":1}"#), r#"{"x":1}"#);
        // Des agencements, élément par élément.
        let profils: serde_json::Value = serde_json::from_str(&reglage_par_ecart(
            r#"[{"id":"s1","nom":"Salle"},{"id":"s2","nom":"Là-bas"}]"#, r#"[{"id":"s1","nom":"Salle"}]"#, r#"[{"id":"s1","nom":"Ma salle"}]"#)).unwrap();
        assert_eq!(profils, serde_json::json!([{"id":"s1","nom":"Ma salle"},{"id":"s2","nom":"Là-bas"}]));
    }
}

#[cfg(test)]
mod tests_page_ouverte {
    use super::avec_politique;

    #[test]
    fn la_regle_se_pose_en_tete_et_ne_permet_que_les_scripts_de_l_application() {
        let page = avec_politique("<!doctype html><html><head><meta charset=\"utf-8\"></head><body><header>x</header></body></html>", &[]);
        assert!(page.starts_with("<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\""));
        assert!(page.contains("script-src 'none'"));
        // L'empreinte d'un script est celle de son texte : « alert(1) » → sha256 bien connu.
        let avec = avec_politique("<html><head></head></html>", &["alert(1)".to_string()]);
        assert!(avec.contains("script-src 'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='"));
        // Sans <head>, après le doctype ; sans rien, en tête.
        assert!(avec_politique("<!DOCTYPE html><body><header>x</header></body>", &[]).starts_with("<!DOCTYPE html><meta"));
        assert!(avec_politique("<p>x</p>", &[]).starts_with("<meta"));
    }
}

#[cfg(test)]
mod tests_vacances {
    use super::*;

    #[test]
    fn l_ete_des_eleves_seulement_et_chaque_vacance_une_fois() {
        let v = serde_json::json!([
            { "description": "Vacances de Noël", "start_date": "2026-12-19T00:00:00+01:00", "end_date": "2027-01-04T00:00:00+01:00", "population": "-" },
            { "description": "Vacances d'Été", "start_date": "2026-07-04T00:00:00+02:00", "end_date": "2026-08-31T00:00:00+02:00", "population": "Enseignants" },
            { "description": "Vacances d'Été", "start_date": "2026-07-04T00:00:00+02:00", "end_date": "2026-09-01T00:00:00+02:00", "population": "Élèves" },
            { "description": "Vacances de Noël", "start_date": "2026-12-19T00:00:00+01:00", "end_date": "2027-01-04T00:00:00+01:00", "population": "Élèves" },
        ]);
        let out = vacances_de_la_reponse(&v);
        let lu: Vec<(&str, &str, &str)> = out.iter().map(|p| (p.description.as_str(), p.debut.as_str(), p.fin.as_str())).collect();
        assert_eq!(lu, vec![
            ("Vacances d'Été", "2026-07-04", "2026-09-01"),
            ("Vacances de Noël", "2026-12-19", "2027-01-04"),
        ]);
    }

    #[test]
    fn l_ancienne_forme_de_reponse_se_lit_encore() {
        let v = serde_json::json!({ "results": [
            { "description": "Vacances de la Toussaint", "start_date": "2026-10-17T00:00:00+02:00", "end_date": "2026-11-02T00:00:00+01:00" },
        ] });
        assert_eq!(vacances_de_la_reponse(&v).len(), 1);
    }

    #[test]
    fn l_annee_entiere_de_la_zone_c_sans_l_ete_des_enseignants() {
        // Un extrait fidèle de l'export de la zone C pour 2026-2027.
        let v = serde_json::json!([
            { "description": "Vacances d'Été", "start_date": "2026-07-04T00:00:00+02:00", "end_date": "2026-08-31T00:00:00+02:00", "population": "Enseignants" },
            { "description": "Vacances d'Été", "start_date": "2026-07-04T00:00:00+02:00", "end_date": "2026-09-01T00:00:00+02:00", "population": "Élèves" },
            { "description": "Vacances de la Toussaint", "start_date": "2026-10-17T00:00:00+02:00", "end_date": "2026-11-02T00:00:00+01:00", "population": "-" },
            { "description": "Vacances de Noël", "start_date": "2026-12-19T00:00:00+01:00", "end_date": "2027-01-04T00:00:00+01:00", "population": "-" },
            { "description": "Vacances d'Hiver", "start_date": "2027-02-06T00:00:00+01:00", "end_date": "2027-02-22T00:00:00+01:00", "population": "-" },
            { "description": "Vacances de Printemps", "start_date": "2027-04-03T00:00:00+02:00", "end_date": "2027-04-19T00:00:00+02:00", "population": "-" },
            { "description": "Pont de l'Ascension", "start_date": "2027-05-07T00:00:00+02:00", "end_date": "2027-05-07T00:00:00+02:00", "population": "-" },
            { "description": "Vacances d'Été", "start_date": "2027-07-03T00:00:00+02:00", "end_date": "2027-09-01T00:00:00+02:00", "population": "Enseignants" },
            { "description": "Vacances d'Été", "start_date": "2027-07-03T00:00:00+02:00", "end_date": "2027-09-02T00:00:00+02:00", "population": "Élèves" },
        ]);
        let out = vacances_de_la_reponse(&v);
        assert_eq!(out.len(), 7);
        assert!(out.iter().all(|p| p.fin != "2026-08-31" && p.fin != "2027-09-01"));
    }
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

/// Où vivent les données, et où elles pourraient vivre.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DossierDonnees {
    pub chemin: String,
    pub par_defaut: String,
    pub personnalise: bool,
    pub octets: u64,
    /// Le service qui synchronise ce dossier, s'il y en a un (choisi avant que ce soit refusé).
    pub synchronise: Option<String>,
}

#[tauri::command(async)]
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
        synchronise: crate::db::service_de_synchro(&chemin).map(str::to_string),
    }
}

/// Déplace l'emplacement des données.
///
/// Un chemin réseau est refusé, pas seulement déconseillé. SQLite en mode WAL
/// exige que tous les processus partagent un segment de mémoire, ce que deux
/// ordinateurs ne peuvent pas faire ; et le verrouillage de fichier sur SMB
/// est réputé peu fiable. Accepter mènerait à une base corrompue, souvent
/// plusieurs jours après le changement, quand plus personne ne fait le lien.
#[tauri::command(async)]
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
            if let Some(service) = crate::db::service_de_synchro(&p) {
                return Err(format!(
                    "Ce dossier est synchronisé par {service}. La base y serait recopiée pendant qu'elle \
                     s'écrit, et finirait corrompue ; et les dossiers des élèves partiraient chez ce service. \
                     Choisissez un dossier de l'ordinateur qui n'est pas synchronisé, et servez-vous de la \
                     sauvegarde chiffrée pour passer d'une machine à l'autre."));
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
    // Les essais n'écrivent pas dans le vrai journal de l'enseignant.
    if cfg!(test) {
        return;
    }
    let chemin = crate::db::data_dir().join("diagnostic.log");
    // Borne la taille : un journal qui grossit sans fin finit par gêner. Il
    // passe à « diagnostic.1.log » plutôt que de partir d'un coup : effacé,
    // il emportait les incidents de la veille, ceux qu'on cherche.
    if std::fs::metadata(&chemin).map(|m| m.len() > 512_000).unwrap_or(false) {
        std::fs::rename(&chemin, chemin.with_file_name("diagnostic.1.log")).ok();
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&chemin) {
        // Avec la date : le fichier garde plusieurs jours, et « 15:14 » ne dit
        // pas lequel — ni si le gel d'hier s'est reproduit aujourd'hui.
        let _ = writeln!(f, "{} {}", chrono::Local::now().format("%d/%m %H:%M:%S"), ligne);
    }
    // Et à côté du travail, dans « Rapport d'incidents » (au plus une fois par minute).
    crate::copie_bureau::miroir_incidents(false);
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
        // En développement, `tauri dev` tue le processus à chaque
        // recompilation : la marque d'arrêt n'a pas le temps de s'écrire, et
        // le journal criait au plantage quarante fois en quatre jours. Le
        // dire, plutôt que d'alarmer pour rien.
        diag_ecrire(if cfg!(debug_assertions) {
            "SESSION PRÉCÉDENTE COUPÉE (build de développement : un redémarrage suffit à l'expliquer)".into()
        } else {
            "SESSION PRÉCÉDENTE INTERROMPUE (plantage, arrêt forcé ou coupure)".to_string()
        });
    }
    diag_ecrire(format!(
        "DÉMARRAGE v{version} {} {}{}",
        std::env::consts::OS,
        std::env::consts::ARCH,
        if cfg!(debug_assertions) { " (dév)" } else { "" },
    ));
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
    // Juste après une rotation, le journal est court : le précédent le complète.
    let precedent = std::fs::read_to_string(chemin.with_file_name("diagnostic.1.log")).unwrap_or_default();
    let contenu = precedent + &std::fs::read_to_string(&chemin).unwrap_or_default();
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

/// Exporte une copie consistante de la base SQLite vers un chemin choisi.
/// `VACUUM INTO` intègre le WAL et produit un fichier unique et propre.
#[tauri::command(async)]
pub fn exporter_base(db: State<Db>, chemin: String) -> R<()> {
    let c = db.lock();
    std::fs::remove_file(&chemin).ok(); // VACUUM INTO échoue si la cible existe
    c.execute("VACUUM INTO ?1", params![chemin]).map_err(e)?;
    Ok(())
}

/// Un réglage part-il dans une sauvegarde ? Ni la clé API, ni ce qui
/// appartient à ce poste : son identifiant, ses repères de synchronisation.
/// Ce qu'une sauvegarde emporte : tout, sauf les secrets et le poste lui-même.
fn reglage_exportable(cle: &str) -> bool {
    !crate::journal::reglage_secret(cle) && !crate::journal::REGLAGES_DU_POSTE.contains(&cle)
}

/// Sérialise toutes les données utilisateur en un JSON unique (sauvegarde).
#[tauri::command(async)]
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
        let rows = table_to_json(c, t)?;
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
#[tauri::command(async)]
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
            // Les secrets et les réglages du poste restent ceux d'ici. Une
            // sauvegarde faite sur un autre ordinateur (ou avant ce correctif)
            // porte les siens, qui donneraient à ce poste l'identité de
            // l'autre ; et une sauvegarde récente n'en contient plus aucun —
            // les effacer couperait la synchronisation à la première
            // restauration.
            let garder = crate::journal::REGLAGES_DU_POSTE.iter().copied()
                .chain(crate::journal::SECRETS.iter().copied())
                .map(|k| format!("'{k}'")).collect::<Vec<_>>().join(", ");
            c.execute(&format!("DELETE FROM settings WHERE cle NOT IN ({garder})"), []).map_err(e)?;
        } else if *t == "referentiels" {
            // Ne touche pas aux référentiels intégrés (seedés au démarrage).
            c.execute("DELETE FROM referentiels WHERE est_integre=0", []).map_err(e)?;
        } else {
            c.execute(&format!("DELETE FROM {t}"), []).map_err(e)?;
        }
        // Les colonnes viennent du fichier : seules celles de la table passent.
        // Un nom de colonne piégé (« cle,valeur) SELECT … -- ») aurait réécrit la
        // requête — de quoi poser un réglage du poste, ou copier une autre table.
        let colonnes: std::collections::HashSet<String> = {
            let mut st = c.prepare(&format!("PRAGMA table_info({t})")).map_err(e)?;
            let noms = st.query_map([], |r| r.get::<_, String>(1)).map_err(e)?;
            noms.filter_map(|n| n.ok()).collect()
        };
        for row in arr {
            let Some(o) = row.as_object() else { continue };
            if *t == "settings" && o.get("cle").and_then(|v| v.as_str())
                .is_some_and(|k| crate::journal::REGLAGES_DU_POSTE.contains(&k)
                    || crate::journal::reglage_secret(k)) {
                continue;
            }
            let cols: Vec<&String> = o.keys().filter(|k| colonnes.contains(k.as_str())).collect();
            if cols.is_empty() { continue; }
            let placeholders: Vec<String> = (1..=cols.len()).map(|i| format!("?{i}")).collect();
            let sql = format!("INSERT OR REPLACE INTO {t} ({}) VALUES ({})",
                cols.iter().map(|s| format!("\"{s}\"")).collect::<Vec<_>>().join(","),
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
        for (nom, val) in fichiers {
            // Un nom qui sortirait du dossier des fichiers n'est pas écrit.
            let Ok(chemin) = fichier_de_l_application(nom) else { continue };
            if let Some(b64) = val.as_str() {
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64) {
                    if std::fs::write(&chemin, bytes).is_ok() {
                        // Ramené par la restauration : s'il avait été effacé, sa marque tombe.
                        c.execute("DELETE FROM fichiers_effaces WHERE nom=?1", params![nom]).ok();
                        c.execute("INSERT OR IGNORE INTO fichiers_rendus (nom) VALUES (?1)", params![nom]).ok();
                    }
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
        let relue: Sequence = c.query_row("SELECT * FROM sequences WHERE id = 'q1'", [], Sequence::from_row).unwrap();
        assert_eq!(relue.nb_seances_prevu, 6);
        // La date de modification s'écrit toute seule ; l'état choisi se garde.
        assert!(relue.date_maj.ends_with('Z') && relue.date_maj.len() >= 20, "{}", relue.date_maj);
        assert_eq!(relue.etat, "");
        super::ecrire_sequence(&c, Sequence { etat: "pause".into(), ..relue }).unwrap();
        let relue: Sequence = c.query_row("SELECT * FROM sequences WHERE id = 'q1'", [], Sequence::from_row).unwrap();
        assert_eq!(relue.etat, "pause");
        let lu = c.query_row("SELECT * FROM sequences WHERE id='q1'", [], Sequence::from_row).unwrap();
        assert_eq!(lu.nb_seances_prevu, 6);
        // Une séquence d'une version plus ancienne n'en annonce aucune.
        c.execute("INSERT INTO sequences (id, titre, date_creation) VALUES ('q2', 'Avant', '2026-01-01')", []).unwrap();
        let ancienne = c.query_row("SELECT * FROM sequences WHERE id='q2'", [], Sequence::from_row).unwrap();
        assert_eq!(ancienne.nb_seances_prevu, 0);
        assert_eq!(ancienne.niveau, "", "une séquence d'avant n'a pas de niveau");
    }

    /// La programmation d'une séquence — son niveau, à côté de sa période — se garde.
    #[test]
    fn le_niveau_de_la_programmation_est_garde() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let seq: Sequence = serde_json::from_value(serde_json::json!({
            "id": "q3", "titre": "La centaine", "niveau": "CE1", "periode": 2
        })).unwrap();
        super::ecrire_sequence(&c, seq).unwrap();
        let relue: Sequence = c.query_row("SELECT * FROM sequences WHERE id = 'q3'", [], Sequence::from_row).unwrap();
        assert_eq!((relue.niveau.as_str(), relue.periode), ("CE1", 2));
        super::ecrire_sequence(&c, Sequence { niveau: "CE2".into(), ..relue }).unwrap();
        let relue: Sequence = c.query_row("SELECT * FROM sequences WHERE id = 'q3'", [], Sequence::from_row).unwrap();
        assert_eq!(relue.niveau, "CE2");
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
        assert_eq!(ancien.minuteur, 0);
    }

    /// Le bilan écrit au cahier journal reste quand la grille ou la fiche du
    /// créneau réécrit la ligne chargée avant lui : on déplace le créneau, on
    /// change sa matière, on l'enregistre tel quel.
    #[test]
    fn deplacer_ou_modifier_un_creneau_garde_son_prevu_et_son_bilan() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let cr: Creneau = serde_json::from_value(serde_json::json!({
            "id": "cr1", "date": "2026-10-13", "heureDebut": "08:45", "heureFin": "10:00",
            "matiere": "Français", "prevu": "Lecture de l'album."
        })).unwrap();
        super::ecrire_creneau(&c, cr.clone()).unwrap();
        super::ecrire_journal_creneau(&c, "cr1", "Lecture de l'album, pages 4 à 9.", "Album lu jusqu'à la page 9.").unwrap();
        // La fiche, ouverte avec la ligne d'avant le bilan : on déplace le créneau, on change sa matière.
        super::ecrire_creneau(&c, Creneau { heure_debut: "09:00".into(), matiere: "Lecture".into(), ..cr.clone() }).unwrap();
        let lu = c.query_row("SELECT * FROM creneaux WHERE id='cr1'", [], Creneau::from_row).unwrap();
        assert_eq!((lu.heure_debut.as_str(), lu.matiere.as_str()), ("09:00", "Lecture"));
        assert_eq!((lu.prevu.as_str(), lu.bilan.as_str()), ("Lecture de l'album, pages 4 à 9.", "Album lu jusqu'à la page 9."));
        // Un créneau neuf, lui, s'écrit avec son prévu.
        super::ecrire_creneau(&c, Creneau { id: "cr2".into(), prevu: "Rituel.".into(), ..cr }).unwrap();
        let neuf: String = c.query_row("SELECT prevu FROM creneaux WHERE id='cr2'", [], |r| r.get(0)).unwrap();
        assert_eq!(neuf, "Rituel.");
    }

    /// Le minuteur des tablettes se règle au cahier journal ; la grille, qui
    /// réécrit toute la ligne avec ce qu'elle a chargé avant, ne l'efface pas.
    #[test]
    fn le_minuteur_des_tablettes_se_regle_au_journal_et_la_grille_ne_l_efface_pas() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let cr: Creneau = serde_json::from_value(serde_json::json!({
            "id": "cr1", "date": "2026-10-13", "heureDebut": "10:00", "heureFin": "11:00", "matiere": "Autonomie"
        })).unwrap();
        super::ecrire_creneau(&c, cr.clone()).unwrap();
        let lu = |c: &rusqlite::Connection| c.query_row("SELECT * FROM creneaux WHERE id='cr1'", [], Creneau::from_row).unwrap();
        assert_eq!(lu(&c).minuteur, 0, "aucun minuteur tant qu'on n'en règle pas");
        super::ecrire_minuteur_creneau(&c, "cr1", 15).unwrap();
        assert_eq!(lu(&c).minuteur, 15);
        // La grille déplace le créneau avec la ligne chargée avant le réglage.
        super::ecrire_creneau(&c, Creneau { heure_debut: "10:30".into(), ..cr.clone() }).unwrap();
        assert_eq!((lu(&c).heure_debut.as_str(), lu(&c).minuteur), ("10:30", 15));
        // Dupliqué, le créneau garde son minuteur ; trop long, il s'arrête à deux heures.
        super::ecrire_creneau(&c, Creneau { id: "cr3".into(), ..lu(&c) }).unwrap();
        assert_eq!(c.query_row("SELECT minuteur FROM creneaux WHERE id='cr3'", [], |r| r.get::<_, i64>(0)).unwrap(), 15);
        super::ecrire_minuteur_creneau(&c, "cr1", 600).unwrap();
        assert_eq!(lu(&c).minuteur, crate::models::MINUTEUR_MAX);
        super::ecrire_minuteur_creneau(&c, "cr1", 0).unwrap();
        assert_eq!(lu(&c).minuteur, 0);
        assert!(super::ecrire_minuteur_creneau(&c, "absent", 5).is_err());
        // Une ligne venue d'un ordinateur pas encore mis à jour : la colonne est vide.
        c.execute("UPDATE creneaux SET minuteur = NULL WHERE id='cr1'", []).unwrap();
        assert_eq!(lu(&c).minuteur, 0);
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
        for cle in ["identifiantMachine", "syncSeqEnvoyee", "syncDeltasVus", "derniereSync", "nomMachine"] {
            assert!(!super::reglage_exportable(cle), "« {cle} » part dans la sauvegarde");
        }
        // Ni la clé du stockage, ni la phrase qui protège ce qu'il contient :
        // le fichier vit sur une clé USB, les deux ensemble n'y ont pas leur
        // place. On les ressaisit après une restauration.
        for cle in crate::journal::SECRETS {
            assert!(!super::reglage_exportable(cle), "« {cle} » part dans la sauvegarde");
        }
        for cle in ["ecole", "enseignantNom", "edt:mode", "bureau:", "sync_endpoint", "sync_bucket"] {
            assert!(super::reglage_exportable(cle), "« {cle} » manque à la sauvegarde");
        }
    }
}

#[cfg(test)]
mod tests_import_piege {
    /// Une sauvegarde piégée ne réécrit pas la requête d'import par ses noms de colonnes.
    #[test]
    fn un_nom_de_colonne_piege_est_ignore() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let piege = "cle,valeur) SELECT 'copieBureauEmplacement', ?1 --";
        let json = serde_json::json!({ "settings": [
            { "cle": "ecole", "valeur": "École des Lilas" },
            { piege: "/tmp/ailleurs" },
            { piege: "/tmp/ailleurs", "cle": "theme", "valeur": "aurore" },
        ]}).to_string();
        super::import_json_brut(&c, &json).unwrap();
        let lu = |cle: &str| c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [cle], |r| r.get::<_, String>(0)).ok();
        assert_eq!(lu("ecole").as_deref(), Some("École des Lilas"));
        assert_eq!(lu("theme").as_deref(), Some("aurore"));
        assert_eq!(lu("copieBureauEmplacement"), None, "le réglage du poste a été posé par la sauvegarde");
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
            id: "t1".into(), titre: "Compte rendu".into(), contenu: "Amandine a lu seule.".into(),
            dossier: "Réunions".into(), date_creation: "2026-09-13T10:00:00Z".into(), date_modification: String::new(),
        };
        let enregistre = super::ecrire_texte(&c, t).unwrap();
        assert!(!enregistre.date_modification.is_empty(), "la date de modification n'est pas posée");
        let lus = super::lire_textes(&c, None).unwrap();
        assert_eq!(lus.len(), 1);
        assert_eq!(lus[0].contenu, "Amandine a lu seule.");
        assert_eq!(lus[0].dossier, "Réunions");
        let n: i64 = c.query_row("SELECT count(*) FROM changements WHERE table_nom = 'textes'", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1, "l'écriture d'un texte n'est pas journalisée");
    }
}

#[cfg(test)]
mod tests_fichiers {
    #[test]
    fn un_fichier_de_l_application_ne_se_designe_que_par_son_nom() {
        assert!(super::fichier_de_l_application("a1b2c3.pdf").is_ok());
        for mauvais in ["", "..", "../maitrize.sqlite3", "../../.ssh/id_rsa", "/etc/passwd", "sous/dossier.pdf", "..\\x.pdf", "C:\\x.pdf"] {
            assert!(super::fichier_de_l_application(mauvais).is_err(), "{mauvais} doit être refusé");
        }
    }

    #[test]
    fn le_coffre_ne_garde_que_des_pdf() {
        assert!(super::est_un_pdf(b"%PDF-1.7\n..."));
        assert!(super::est_un_pdf(b"\xef\xbb\xbf\n%PDF-1.4"));
        assert!(!super::est_un_pdf(b"<!doctype html><html>"));
        assert!(!super::est_un_pdf(b""));
    }

    #[test]
    fn un_programme_recu_ne_se_lance_pas_d_un_clic() {
        use std::path::Path;
        for sur in ["fiche.pdf", "photo.JPG", "bilan.docx", "dictee.m4a", "classeur.obz"] {
            assert!(super::s_ouvre_d_un_clic(Path::new(sur)), "{sur} s'ouvre");
        }
        for piege in ["lancer.command", "x.terminal", "Appli.app", "setup.exe", "raccourci.lnk", "script.sh",
                      "macros.docm", "page.html", "dessin.svg", "sans-extension", "archive.zip"] {
            assert!(!super::s_ouvre_d_un_clic(Path::new(piege)), "{piege} se montre sans se lancer");
        }
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
            fabrication_json: String::new(), support_json: String::new(),
        };
        super::ecrire_materiel(&c, &m).expect("l'écriture doit réussir sur le schéma réel");

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

    /// D'où vient une feuille fabriquée : gardé à l'écriture, rendu à la
    /// lecture ; une ligne d'avant la colonne — ou reçue d'une version qui ne
    /// la connaît pas, donc à NULL — se lit sans erreur, simplement vide.
    #[test]
    fn la_fabrication_d_une_feuille_se_garde_et_une_ligne_ancienne_se_lit() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let mut m = MaterielItem {
            id: "f1".into(), titre: "Les cartes des trois jeux".into(), description_materiel: String::new(),
            competence_id: String::new(), competence_titre: String::new(),
            domaine_titre: String::new(), sous_domaine_titre: String::new(), cycle: String::new(),
            images_json: "[]".into(), pdfs_json: "[\"a.pdf\"]".into(),
            date_creation: "2026-10-09T08:00:00Z".into(), seance_id: Some("s1".into()), sequence_id: Some("q1".into()),
            dossier: String::new(), videos_json: "[]".into(), coffre_json: "[]".into(),
            fabrication_json: r#"{"atelier":"comparer","cle":"comparer","reglages":{"niveau":"cp-59"},"graine":7}"#.into(),
            support_json: String::new(),
        };
        super::ecrire_materiel(&c, &m).unwrap();
        // La feuille refaite remplace le PDF, sur place : même matériel, nouvelle fabrication.
        m.pdfs_json = "[\"b.pdf\"]".into();
        m.fabrication_json = r#"{"atelier":"comparer","graine":8}"#.into();
        super::ecrire_materiel(&c, &m).unwrap();
        let relu = c.query_row("SELECT * FROM materiel_items WHERE id='f1'", [], MaterielItem::from_row).unwrap();
        assert_eq!(relu.pdfs_json, "[\"b.pdf\"]");
        assert_eq!(relu.fabrication_json, r#"{"atelier":"comparer","graine":8}"#);
        assert_eq!(relu.seance_id.as_deref(), Some("s1"));
        assert_eq!(c.query_row("SELECT COUNT(*) FROM materiel_items", [], |r| r.get::<_, i64>(0)).unwrap(), 1);

        c.execute("INSERT INTO materiel_items (id, titre, date_creation, fabrication_json) VALUES ('f2', 'Ancien', '2026-01-01', NULL)", []).unwrap();
        let ancien = c.query_row("SELECT * FROM materiel_items WHERE id='f2'", [], MaterielItem::from_row).unwrap();
        assert_eq!(ancien.fabrication_json, "");
        // Un matériel envoyé sans le champ — une version plus ancienne de l'application — n'en a pas.
        let sans: MaterielItem = serde_json::from_str(r#"{"id":"f3","titre":"x"}"#).unwrap();
        assert_eq!(sans.fabrication_json, "");
        assert_eq!(sans.support_json, "");
    }

    /// Un support posé dans une séance renvoie à un élément du bureau : sa sorte
    /// et son identifiant se gardent ; une ligne d'avant la colonne se lit vide.
    #[test]
    fn un_support_de_seance_garde_l_element_du_bureau_auquel_il_renvoie() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let m = MaterielItem {
            id: "lien1".into(), titre: "La bande numérique".into(), description_materiel: String::new(),
            competence_id: String::new(), competence_titre: String::new(),
            domaine_titre: String::new(), sous_domaine_titre: String::new(), cycle: String::new(),
            images_json: "[]".into(), pdfs_json: "[]".into(),
            date_creation: "2026-10-21T08:00:00Z".into(), seance_id: Some("s1".into()), sequence_id: Some("q1".into()),
            dossier: String::new(), videos_json: "[]".into(), coffre_json: "[]".into(),
            fabrication_json: String::new(), support_json: r#"{"genre":"outil","source":"o42"}"#.into(),
        };
        super::ecrire_materiel(&c, &m).unwrap();
        let relu = c.query_row("SELECT * FROM materiel_items WHERE id='lien1'", [], MaterielItem::from_row).unwrap();
        assert_eq!(relu.support_json, r#"{"genre":"outil","source":"o42"}"#);
        c.execute("INSERT INTO materiel_items (id, titre, date_creation, support_json) VALUES ('ancien', 'Ancien', '2026-01-01', NULL)", []).unwrap();
        let ancien = c.query_row("SELECT * FROM materiel_items WHERE id='ancien'", [], MaterielItem::from_row).unwrap();
        assert_eq!(ancien.support_json, "");
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
        c.execute("INSERT INTO eleves (id, nom) VALUES ('e1','Amandine')", []).unwrap();
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
            c.execute("INSERT INTO observations_eleve (id, eleve_id, date, date_creation, date_maj) VALUES (?1,?2,'2026-01-01','2026-01-01','2026-01-01')",
                params![format!("ob-{id}"), id]).unwrap();
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
        for t in ["appels_journalier", "commentaires_eleve", "notes_eleve", "papiers_eleve", "progressions_eleve", "observations_eleve"] {
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

    #[test]
    fn suppression_ne_laisse_ni_copie_au_journal_ni_fichier_qui_revienne() {
        let mut c = base();
        crate::journal::creer_table(&c);
        crate::journal::poser_declencheurs(&c, "ici");
        let (a, b) = ("el-a", "el-b");
        // Un nom de fichier qui n'existe nulle part : l'essai ne touche à aucun vrai fichier.
        let photo = format!("essai-{}.jpg", uuid::Uuid::new_v4());
        c.execute("INSERT INTO eleves (id, nom, photo_fichier) VALUES (?1, 'Amandine Martin', ?2)", params![a, photo]).unwrap();
        c.execute("INSERT INTO eleves (id, nom) VALUES (?1, 'Rose Petit')", params![b]).unwrap();
        c.execute("UPDATE eleves SET nom = 'Amandine Martin-Durand' WHERE id = ?1", params![a]).unwrap();
        c.execute("INSERT INTO commentaires_eleve (id, date, eleve_id, texte) VALUES ('co-a','2026-01-01',?1,'Amandine a lu seule')",
            params![a]).unwrap();
        c.execute("INSERT INTO textes_crdt (table_nom, ligne_id, champ, etat) VALUES ('commentaires_eleve','co-a','texte', x'00')", []).unwrap();
        c.execute("INSERT INTO outils_classe (id, titre, eleves_json) VALUES ('ou1', 'Tableau', ?1)",
            params![format!("[\"{a}\",\"{b}\"]")]).unwrap();
        let ime = serde_json::json!({
            "groupes": [{ "id": "g1", "nom": "Les grands", "eleveIds": [a, b] }],
            "objectifs": [
                { "id": "o1", "competence": "Lire son prénom", "pour": [format!("eleve:{a}")], "notes": "Amandine progresse" },
                { "id": "o2", "competence": "Demander de l'aide", "pour": [format!("eleve:{a}"), format!("eleve:{b}")], "notes": "" },
                { "id": "o3", "competence": "Ranger", "pour": ["groupe:g1"], "notes": "" }
            ]
        });
        c.execute("INSERT INTO programmations_finale (id, annee, lignes_json, niveau) VALUES ('pf1','2026-2027',?1,'ime')",
            params![ime.to_string()]).unwrap();

        effacer_eleve(&mut c, a).unwrap();

        // Le journal ne garde que la marque de suppression : plus le nom, ni l'ancien, ni le nouveau.
        for (table, ligne) in [("eleves", a), ("commentaires_eleve", "co-a")] {
            let ops: Vec<String> = c.prepare("SELECT operation FROM changements WHERE table_nom=?1 AND ligne_id=?2").unwrap()
                .query_map(params![table, ligne], |r| r.get(0)).unwrap().flatten().collect();
            assert_eq!(ops, vec!["suppr".to_string()], "{table} : le journal garde des copies ({ops:?})");
        }
        // Une ligne qui reste — la programmation — garde ses états d'avant le
        // temps que le journal les purge (30 jours après leur envoi) : ils
        // servent à fusionner champ par champ. Celles de l'élève, aucun.
        let traces = compte(&c, "SELECT COUNT(*) FROM changements WHERE table_nom <> 'programmations_finale'
                                   AND (donnees LIKE '%Amandine%' OR avant LIKE '%Amandine%')");
        assert_eq!(traces, 0, "le nom de l'élève reste dans le journal");
        assert!(compte(&c, &format!("SELECT COUNT(*) FROM changements WHERE ligne_id='{b}' AND operation='maj'")) > 0,
            "l'autre élève doit rester au journal");
        assert_eq!(compte(&c, "SELECT COUNT(*) FROM textes_crdt WHERE ligne_id='co-a'"), 0, "l'historique d'édition reste");

        let outils: String = c.query_row("SELECT eleves_json FROM outils_classe WHERE id='ou1'", [], |r| r.get(0)).unwrap();
        assert_eq!(outils, format!("[\"{b}\"]"), "outil de classe : élève non retiré");

        let prog: serde_json::Value = serde_json::from_str(
            &c.query_row("SELECT lignes_json FROM programmations_finale WHERE id='pf1'", [], |r| r.get::<_, String>(0)).unwrap()).unwrap();
        assert_eq!(prog["groupes"][0]["eleveIds"], serde_json::json!([b]));
        let objectifs: Vec<&str> = prog["objectifs"].as_array().unwrap().iter().map(|o| o["id"].as_str().unwrap()).collect();
        assert_eq!(objectifs, vec!["o2", "o3"], "l'objectif qui ne visait que l'élève part avec lui");
        assert_eq!(prog["objectifs"][0]["pour"], serde_json::json!([format!("eleve:{b}")]));

        // Sa photo est notée effacée : la synchronisation la retirera du stockage au lieu de la ramener.
        assert_eq!(compte(&c, &format!("SELECT COUNT(*) FROM fichiers_effaces WHERE nom='{photo}' AND publie=0")), 1);
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
    fn les_consignes_d_une_seance_se_gardent() {
        let c = base();
        let se: Seance = serde_json::from_value(serde_json::json!({
            "id": "se1", "titre": "Semis", "consignes": "Prends un pot.\nMets la terre."
        })).unwrap();
        super::ecrire_seance(&c, se).unwrap();
        let lue = |c: &Connection| c.query_row("SELECT * FROM seances WHERE id='se1'", [], Seance::from_row).unwrap();
        assert_eq!(lue(&c).consignes, "Prends un pot.\nMets la terre.");
        // Reçue d'un ordinateur d'avant les consignes : le champ manque, la séance se lit quand même.
        c.execute("UPDATE seances SET consignes = NULL WHERE id='se1'", []).unwrap();
        assert_eq!(lue(&c).consignes, "");
    }

    #[test]
    fn enregistrer_un_eleve_garde_ses_documents() {
        let c = base();
        let el: Eleve = serde_json::from_value(serde_json::json!({"id": "e1", "nom": "Amandine Martin"})).unwrap();
        super::ecrire_eleve(&c, el.clone()).unwrap();
        c.execute("INSERT INTO documents_eleve (id, eleve_id, type, donnees, date_maj) VALUES ('d1','e1','ppi','{}','x')", []).unwrap();
        super::ecrire_eleve(&c, Eleve { nom: "Amandine M.".into(), ..el }).unwrap();
        assert_eq!(compter(&c, "SELECT count(*) FROM documents_eleve WHERE eleve_id='e1'"), 1, "les documents de l'élève ont été effacés");
    }

    #[test]
    fn un_eleve_non_verbal_le_reste_et_une_ligne_ancienne_ne_l_est_pas() {
        let c = base();
        let el: Eleve = serde_json::from_value(serde_json::json!({"id": "e1", "nom": "Yasmine", "nonVerbal": true})).unwrap();
        super::ecrire_eleve(&c, el).unwrap();
        // Une ligne venue d'une version sans la colonne : rien n'y est écrit.
        c.execute("INSERT INTO eleves (id, nom, niveau, non_verbal) VALUES ('e2', 'Jules', 'CE1', NULL)", []).unwrap();
        let lus: Vec<Eleve> = c.prepare("SELECT * FROM eleves ORDER BY id").unwrap()
            .query_map([], Eleve::from_row).unwrap().collect::<rusqlite::Result<_>>().unwrap();
        assert_eq!(lus.iter().map(|e| (e.id.as_str(), e.non_verbal)).collect::<Vec<_>>(), vec![("e1", true), ("e2", false)]);
        let sans: Eleve = serde_json::from_value(serde_json::json!({"id": "e3", "nom": "Eliot"})).unwrap();
        assert!(!sans.non_verbal, "un élève envoyé sans le champ n'est pas non verbal");
    }

    #[test]
    fn les_fiches_qu_un_eleve_ne_recoit_pas_se_gardent() {
        let c = base();
        let el: Eleve = serde_json::from_value(serde_json::json!({"id": "e1", "nom": "Salimata", "fichesExclues": ["coloriage"]})).unwrap();
        super::ecrire_eleve(&c, el.clone()).unwrap();
        // Une ligne d'avant la colonne, ou abîmée : rien n'est écarté.
        c.execute("INSERT INTO eleves (id, nom, niveau, fiches_exclues) VALUES ('e2', 'Jules', 'CE1', NULL)", []).unwrap();
        c.execute("INSERT INTO eleves (id, nom, niveau, fiches_exclues) VALUES ('e3', 'Léa', 'CE1', 'pas du json')", []).unwrap();
        let lus: Vec<Eleve> = c.prepare("SELECT * FROM eleves ORDER BY id").unwrap()
            .query_map([], Eleve::from_row).unwrap().collect::<rusqlite::Result<_>>().unwrap();
        assert_eq!(lus.iter().map(|e| e.fiches_exclues.clone()).collect::<Vec<_>>(), vec![vec!["coloriage".to_string()], vec![], vec![]]);
        // On les retire : la liste se vide pour de bon.
        super::ecrire_eleve(&c, Eleve { fiches_exclues: vec![], ..el }).unwrap();
        let relu: Eleve = c.query_row("SELECT * FROM eleves WHERE id='e1'", [], Eleve::from_row).unwrap();
        assert!(relu.fiches_exclues.is_empty());
    }

    #[test]
    fn enregistrer_une_evaluation_garde_ses_notes() {
        let c = base();
        let ev: Evaluation = serde_json::from_value(serde_json::json!({"id": "ev1", "titre": "Lecture"})).unwrap();
        super::ecrire_evaluation(&c, ev.clone()).unwrap();
        c.execute("INSERT INTO notes_eleve (id, eleve_nom, evaluation_id) VALUES ('n1','Amandine','ev1')", []).unwrap();
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

#[cfg(test)]
mod tests_projets {
    use super::enregistrer_projet;
    use crate::models::Projet;
    use rusqlite::Connection;

    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }

    fn lire(c: &Connection, id: &str) -> Projet {
        c.query_row("SELECT * FROM projets WHERE id = ?1", [id], Projet::from_row).unwrap()
    }

    #[test]
    fn le_corpus_du_projet_se_garde_et_se_reprend() {
        let c = base();
        let p: Projet = serde_json::from_str(
            r#"{"id":"p1","titre":"La soupe","dateCreation":"2026-09-01","mois":"10",
                "mots":"citrouille\nsoupe","phrases":"La soupe est chaude."}"#,
        )
        .unwrap();
        enregistrer_projet(&c, &p).unwrap();
        let relu = lire(&c, "p1");
        assert_eq!(relu.mots, "citrouille\nsoupe");
        assert_eq!(relu.phrases, "La soupe est chaude.");
        assert_eq!(relu.etapes_json, "[]");

        // Reprendre le même projet remplace son corpus, sans doublon de ligne.
        let suite = Projet { mots: "citrouille\nsoupe\nlouche".into(), phrases: String::new(), ..p };
        enregistrer_projet(&c, &suite).unwrap();
        let relu = lire(&c, "p1");
        assert_eq!(relu.mots, "citrouille\nsoupe\nlouche");
        assert_eq!(relu.phrases, "");
        let n: i64 = c.query_row("SELECT COUNT(*) FROM projets", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn un_projet_venu_d_une_ancienne_version_a_un_corpus_vide() {
        let c = base();
        // La ligne d'un ordinateur pas encore à jour : sans les colonnes du corpus.
        c.execute(
            "INSERT INTO projets (id, titre, date_creation) VALUES ('p2', 'Le marché', '2026-09-02')",
            [],
        )
        .unwrap();
        let relu = lire(&c, "p2");
        assert_eq!(relu.mots, "");
        assert_eq!(relu.phrases, "");
    }
}

#[cfg(test)]
mod tests_archive {
    use super::*;

    #[test]
    fn une_archive_s_ecrit_et_se_relit_sans_chemin_qui_remonte() {
        let chemin = std::env::temp_dir().join(format!("maitrize-archive-{}.docx", std::process::id()));
        let chemin = chemin.to_string_lossy().to_string();
        enregistrer_archive(chemin.clone(), vec![
            FichierArchive { nom: "[Content_Types].xml".into(), contenu: "<Types/>".into() },
            FichierArchive { nom: "word/document.xml".into(), contenu: "<w:document>é</w:document>".into() },
        ]).unwrap();
        let mut archive = zip::ZipArchive::new(std::fs::File::open(&chemin).unwrap()).unwrap();
        let mut texte = String::new();
        std::io::Read::read_to_string(&mut archive.by_name("word/document.xml").unwrap(), &mut texte).unwrap();
        assert_eq!(texte, "<w:document>é</w:document>");
        let _ = std::fs::remove_file(&chemin);
        for refuse in ["../x.xml", "/etc/x", "a//b", "a\\b", ""] {
            assert!(enregistrer_archive(chemin.clone(), vec![FichierArchive { nom: refuse.into(), contenu: String::new() }]).is_err(), "{refuse}");
        }
        assert!(!std::path::Path::new(&chemin).exists());
    }
}
