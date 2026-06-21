//! Connexion SQLite + schéma. Remplace SwiftData/CoreData.
//!
//! La base vit dans le dossier de données applicatif (cross-plateforme via
//! `dirs`): macOS → ~/Library/Application Support/fr.clementsapp.maitrize/,
//! Windows → %APPDATA%/fr.clementsapp.maitrize/.
//! Les fichiers joints (images, PDF, photos) vont dans Fichiers/.

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

/// Dossier racine des données de l'app (créé si absent).
pub fn data_dir() -> PathBuf {
    // Override pour tests multi-utilisateurs : lancer une 2e instance avec
    // MAITRIZE_DATA_DIR=/chemin/autre simule un second utilisateur (identité,
    // base et amis distincts).
    if let Ok(custom) = std::env::var("MAITRIZE_DATA_DIR") {
        if !custom.is_empty() {
            let dir = PathBuf::from(custom);
            std::fs::create_dir_all(&dir).ok();
            return dir;
        }
    }
    let base = dirs::data_dir().unwrap_or_else(|| std::env::temp_dir());
    let dir = base.join("fr.clementsapp.maitrize");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Dossier des fichiers joints (images, PDF, photos d'élèves…).
pub fn fichiers_dir() -> PathBuf {
    let dir = data_dir().join("Fichiers");
    std::fs::create_dir_all(&dir).ok();
    dir
}

pub fn open() -> Connection {
    let path = data_dir().join("maitrize.sqlite3");
    let conn = Connection::open(path).expect("ouverture base SQLite");
    conn.pragma_update(None, "journal_mode", "WAL").ok();
    conn.pragma_update(None, "foreign_keys", "ON").ok();
    migrate(&conn);
    crate::seed::seed_referentiels(&conn);
    conn
}

fn migrate(conn: &Connection) {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS projets (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            descriptif TEXT NOT NULL DEFAULT '',
            couleur TEXT NOT NULL DEFAULT 'indigo',
            date_creation TEXT NOT NULL,
            annee TEXT NOT NULL DEFAULT '',
            image_nom TEXT
        );

        CREATE TABLE IF NOT EXISTS sequences (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            matiere TEXT NOT NULL DEFAULT '',
            cycle TEXT NOT NULL DEFAULT '',
            objectifs TEXT NOT NULL DEFAULT '',
            competences TEXT NOT NULL DEFAULT '',
            competence_visee TEXT NOT NULL DEFAULT '',
            image_nom TEXT,
            couleur TEXT NOT NULL DEFAULT 'blue',
            date_creation TEXT NOT NULL,
            periode INTEGER NOT NULL DEFAULT 1,
            annee TEXT NOT NULL DEFAULT '',
            rating_engagement INTEGER NOT NULL DEFAULT 0,
            rating_facilite INTEGER NOT NULL DEFAULT 0,
            rating_apprentissage INTEGER NOT NULL DEFAULT 0,
            rating_date_maj TEXT,
            projet_id TEXT REFERENCES projets(id) ON DELETE SET NULL,
            video TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS seances (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            numero INTEGER NOT NULL DEFAULT 1,
            objectifs TEXT NOT NULL DEFAULT '',
            competences TEXT NOT NULL DEFAULT '',
            deroulement TEXT NOT NULL DEFAULT '',
            materiel TEXT NOT NULL DEFAULT '',
            duree INTEGER NOT NULL DEFAULT 45,
            date TEXT,
            tableau_deroulement TEXT NOT NULL DEFAULT '[]',
            images_deroulement TEXT NOT NULL DEFAULT '[]',
            bilan TEXT NOT NULL DEFAULT '',
            bilan_date TEXT,
            sequence_id TEXT REFERENCES sequences(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ateliers (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            matiere TEXT NOT NULL DEFAULT 'Français',
            objectifs TEXT NOT NULL DEFAULT '',
            competences TEXT NOT NULL DEFAULT '',
            materiel TEXT NOT NULL DEFAULT '',
            nb_eleves_max INTEGER NOT NULL DEFAULT 6,
            duree INTEGER NOT NULL DEFAULT 30,
            couleur TEXT NOT NULL DEFAULT 'blue',
            date_creation TEXT NOT NULL,
            image_nom TEXT,
            dossier TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS espaces (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            description_espace TEXT NOT NULL DEFAULT '',
            nb_eleves_max INTEGER NOT NULL DEFAULT 6,
            couleur TEXT NOT NULL DEFAULT 'teal',
            date_creation TEXT NOT NULL,
            image_nom TEXT,
            dossier TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS atelier_espace (
            atelier_id TEXT NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
            espace_id TEXT NOT NULL REFERENCES espaces(id) ON DELETE CASCADE,
            PRIMARY KEY (atelier_id, espace_id)
        );

        CREATE TABLE IF NOT EXISTS progressions_eleve (
            id TEXT PRIMARY KEY,
            nom_eleve TEXT NOT NULL DEFAULT '',
            eleve_id TEXT,
            fait INTEGER NOT NULL DEFAULT 0,
            espace_id TEXT REFERENCES espaces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS creneaux (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            heure_debut TEXT NOT NULL DEFAULT '',
            heure_fin TEXT NOT NULL DEFAULT '',
            matiere TEXT NOT NULL DEFAULT '',
            couleur TEXT NOT NULL DEFAULT 'blue',
            seance_id TEXT REFERENCES seances(id) ON DELETE SET NULL,
            atelier_id TEXT REFERENCES ateliers(id) ON DELETE SET NULL,
            espace_id TEXT REFERENCES espaces(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS eleves (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL DEFAULT '',
            niveau TEXT NOT NULL DEFAULT '',
            present INTEGER NOT NULL DEFAULT 1,
            ine TEXT NOT NULL DEFAULT '',
            date_naissance TEXT NOT NULL DEFAULT '',
            photo_fichier TEXT
        );

        CREATE TABLE IF NOT EXISTS appels_journalier (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            statut_brut TEXT NOT NULL DEFAULT 'present',
            eleve_id TEXT
        );

        CREATE TABLE IF NOT EXISTS commentaires_eleve (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            texte TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'divers',
            eleve_id TEXT
        );

        CREATE TABLE IF NOT EXISTS evaluations (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            matiere TEXT NOT NULL DEFAULT '',
            date TEXT NOT NULL,
            bareme REAL NOT NULL DEFAULT 20,
            periode INTEGER NOT NULL DEFAULT 1,
            mode TEXT NOT NULL DEFAULT 'note',
            competences_json TEXT NOT NULL DEFAULT '[]',
            pdf_nom_fichier TEXT
        );

        CREATE TABLE IF NOT EXISTS notes_eleve (
            id TEXT PRIMARY KEY,
            eleve_nom TEXT NOT NULL DEFAULT '',
            eleve_id TEXT,
            note REAL,
            absent INTEGER NOT NULL DEFAULT 0,
            commentaire TEXT NOT NULL DEFAULT '',
            evaluation_id TEXT REFERENCES evaluations(id) ON DELETE CASCADE,
            niveaux_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS pieces_jointes (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT '',
            nom_fichier TEXT NOT NULL DEFAULT '',
            date_ajout TEXT NOT NULL,
            seance_id TEXT,
            a_imprimer INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS materiel_items (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            description_materiel TEXT NOT NULL DEFAULT '',
            competence_id TEXT NOT NULL DEFAULT '',
            competence_titre TEXT NOT NULL DEFAULT '',
            domaine_titre TEXT NOT NULL DEFAULT '',
            sous_domaine_titre TEXT NOT NULL DEFAULT '',
            cycle TEXT NOT NULL DEFAULT '',
            images_json TEXT NOT NULL DEFAULT '[]',
            pdfs_json TEXT NOT NULL DEFAULT '[]',
            date_creation TEXT NOT NULL,
            seance_id TEXT
        );

        CREATE TABLE IF NOT EXISTS papiers_eleve (
            id TEXT PRIMARY KEY,
            intitule TEXT NOT NULL DEFAULT '',
            eleve_id TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'coche',
            nom_fichier TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',
            date_ajout TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS referentiels (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL DEFAULT '',
            cycle TEXT NOT NULL DEFAULT '',
            donnees TEXT NOT NULL DEFAULT '',
            est_integre INTEGER NOT NULL DEFAULT 0,
            date_ajout TEXT NOT NULL,
            actif INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS notes_competence (
            id TEXT PRIMARY KEY,
            competence_ref_id TEXT NOT NULL DEFAULT '',
            texte TEXT NOT NULL DEFAULT '',
            date_creation TEXT NOT NULL,
            date_modification TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS progressions_annuelle (
            id TEXT PRIMARY KEY,
            annee TEXT NOT NULL DEFAULT '',
            periode INTEGER NOT NULL DEFAULT 1,
            colonnes_json TEXT NOT NULL DEFAULT '[]',
            cellules_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS programmations_finale (
            id TEXT PRIMARY KEY,
            annee TEXT NOT NULL DEFAULT '',
            lignes_json TEXT NOT NULL DEFAULT '[]',
            niveau TEXT NOT NULL DEFAULT '',
            enseignant TEXT NOT NULL DEFAULT '',
            est_importee INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS edt_typique (
            id TEXT PRIMARY KEY,
            annee TEXT NOT NULL DEFAULT '',
            slots_json TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS pilote_conversations (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            messages_json TEXT NOT NULL DEFAULT '[]',
            date_creation TEXT NOT NULL,
            date_maj TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents_coffre (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL DEFAULT '',
            nom_fichier TEXT NOT NULL DEFAULT '',
            taille_octets INTEGER NOT NULL DEFAULT 0,
            date_ajout TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            cle TEXT PRIMARY KEY,
            valeur TEXT NOT NULL DEFAULT ''
        );

        -- Identité cryptographique de cet appareil (clé privée X25519, ne quitte
        -- jamais la machine). Une seule ligne (id = 1).
        CREATE TABLE IF NOT EXISTS identite (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            cle_privee BLOB NOT NULL,
            cle_publique BLOB NOT NULL,
            nom TEXT NOT NULL DEFAULT ''
        );

        -- Amis appariés : clé publique de l'autre + identifiant de boîte aux
        -- lettres partagée (dérivé) + numéro de sécurité à comparer hors-bande.
        CREATE TABLE IF NOT EXISTS amis (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL DEFAULT '',
            cle_publique BLOB NOT NULL UNIQUE,
            mailbox_id TEXT NOT NULL DEFAULT '',
            numero_securite TEXT NOT NULL DEFAULT '',
            verifie INTEGER NOT NULL DEFAULT 0,
            date_ajout TEXT NOT NULL
        );

        -- Objets de boîte aux lettres déjà importés (évite de réimporter une
        -- séquence reçue à chaque relève).
        CREATE TABLE IF NOT EXISTS sync_recus (
            cle TEXT PRIMARY KEY,
            date TEXT NOT NULL DEFAULT ''
        );

        -- Boîte de réception : éléments reçus en attente, que l'utilisateur
        -- choisit de récupérer (importer) ou de jeter.
        CREATE TABLE IF NOT EXISTS boite_recue (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            de_nom TEXT NOT NULL DEFAULT '',
            titre TEXT NOT NULL DEFAULT '',
            ts TEXT NOT NULL DEFAULT '',
            payload TEXT NOT NULL,
            recu_le TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_seances_seq ON seances(sequence_id);
        CREATE INDEX IF NOT EXISTS idx_creneaux_date ON creneaux(date);
        CREATE INDEX IF NOT EXISTS idx_appels_date ON appels_journalier(date);
        CREATE INDEX IF NOT EXISTS idx_appels_eleve ON appels_journalier(eleve_id);
        CREATE INDEX IF NOT EXISTS idx_notes_eval ON notes_eleve(evaluation_id);
        CREATE INDEX IF NOT EXISTS idx_pj_seance ON pieces_jointes(seance_id);
        CREATE INDEX IF NOT EXISTS idx_seq_projet ON sequences(projet_id);
        "#,
    )
    .expect("création schéma");

    // Migrations légères pour bases existantes (ignore l'erreur si déjà là).
    conn.execute("ALTER TABLE sequences ADD COLUMN video TEXT NOT NULL DEFAULT ''", []).ok();
    conn.execute("ALTER TABLE materiel_items ADD COLUMN seance_id TEXT", []).ok();
    conn.execute("ALTER TABLE materiel_items ADD COLUMN sequence_id TEXT", []).ok();
    conn.execute("ALTER TABLE projets ADD COLUMN image_nom TEXT", []).ok();
}
