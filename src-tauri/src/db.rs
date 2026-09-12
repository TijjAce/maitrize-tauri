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

/// Emplacement par défaut, propre à la plateforme.
///
/// macOS   → ~/Library/Application Support/fr.clementsapp.maitrize/
/// Windows → %APPDATA%\fr.clementsapp.maitrize\
/// Le crate `dirs` connaît la convention de chacune ; les coder en dur
/// casserait sur un compte dont le dossier personnel n'est pas à sa place
/// habituelle, ce qui arrive sur les postes d'établissement.
pub fn dossier_par_defaut() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| std::env::temp_dir());
    base.join("fr.clementsapp.maitrize")
}

/// Fichier qui mémorise un emplacement choisi par l'utilisateur.
///
/// Il ne peut pas vivre dans la base : c'est lui qui dit où la trouver. Il
/// reste donc à l'emplacement par défaut, et ne contient qu'un chemin.
fn marqueur_dossier() -> PathBuf {
    dossier_par_defaut().join("dossier-donnees.txt")
}

/// Chemin des données choisi par l'utilisateur, s'il en a défini un.
pub fn dossier_choisi() -> Option<PathBuf> {
    let brut = std::fs::read_to_string(marqueur_dossier()).ok()?;
    let chemin = brut.trim();
    if chemin.is_empty() { None } else { Some(PathBuf::from(chemin)) }
}

/// Enregistre (ou efface) l'emplacement des données.
pub fn definir_dossier(chemin: Option<&std::path::Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(dossier_par_defaut())?;
    match chemin {
        Some(p) => {
            std::fs::create_dir_all(p)?;
            std::fs::write(marqueur_dossier(), p.to_string_lossy().as_bytes())
        }
        None => {
            std::fs::remove_file(marqueur_dossier()).or_else(|e| {
                if e.kind() == std::io::ErrorKind::NotFound { Ok(()) } else { Err(e) }
            })
        }
    }
}

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
    // Emplacement choisi par l'enseignant — disque externe, autre partition.
    // S'il a disparu (clé retirée, volume non monté), on ne se rabat PAS en
    // silence sur le dossier par défaut : l'app repartirait d'une base vide et
    // ferait croire à une perte de données. On recrée le chemin, et s'il est
    // inaccessible l'ouverture échouera avec un message clair.
    if let Some(dir) = dossier_choisi() {
        std::fs::create_dir_all(&dir).ok();
        return dir;
    }
    let dir = dossier_par_defaut();
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Le chemin désigne-t-il un volume réseau ?
///
/// SQLite ne peut pas y vivre : le mode WAL qu'utilise l'application exige que
/// tous les processus partagent un segment de mémoire, ce que deux ordinateurs
/// ne peuvent pas faire. Et le verrouillage de fichier, sur lequel repose la
/// cohérence, est notoirement peu fiable sur SMB. Poser la base sur un partage
/// ne donne pas une synchronisation : ça donne une base corrompue, souvent
/// après plusieurs jours d'apparence normale.
pub fn est_chemin_reseau(chemin: &std::path::Path) -> bool {
    let s = chemin.to_string_lossy();
    // UNC Windows : \\serveur\partage
    if s.starts_with("\\\\") || s.starts_with("//") {
        return true;
    }
    // Volume monté sur macOS : /Volumes/… (le disque de démarrage excepté)
    if let Some(reste) = s.strip_prefix("/Volumes/") {
        return !reste.is_empty();
    }
    // Points de montage réseau courants sous Linux
    s.starts_with("/mnt/") || s.starts_with("/media/") || s.starts_with("/net/")
}

/// Dossier des sauvegardes automatiques (copies horodatées de la base).
pub fn sauvegardes_dir() -> PathBuf {
    let dir = data_dir().join("Sauvegardes");
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
    sauvegarde_auto(&conn);
    conn
}

/// Nombre de copies automatiques conservées (une par jour d'utilisation).
const SAUVEGARDES_GARDEES: usize = 7;

/// Copie quotidienne de la base, au lancement.
///
/// L'export manuel des Réglages ne protège que si on y pense ; cette copie
/// tourne toute seule et garde les sept derniers jours d'utilisation.
/// `VACUUM INTO` intègre le WAL et produit un fichier autonome, ouvrable tel
/// quel — pas un instantané à moitié écrit.
pub fn sauvegarde_auto(conn: &Connection) {
    let dir = sauvegardes_dir();
    let jour = jour_iso();
    let cible = dir.join(format!("maitrize-{jour}.sqlite3"));
    // Une seule copie par jour : relancer l'app dix fois ne recopie pas dix fois.
    if !cible.exists() {
        if let Err(err) = conn.execute("VACUUM INTO ?1", [cible.to_string_lossy().as_ref()]) {
            eprintln!("sauvegarde automatique impossible : {err}");
            return;
        }
    }
    conn.execute(
        "INSERT OR REPLACE INTO settings (cle, valeur) VALUES ('derniereSauvegardeAuto', ?1)",
        [&jour],
    ).ok();
    purger_sauvegardes(&dir);
}

/// Ne garde que les copies les plus récentes.
fn purger_sauvegardes(dir: &std::path::Path) {
    let Ok(entrees) = std::fs::read_dir(dir) else { return };
    let mut fichiers: Vec<PathBuf> = entrees
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.file_name().and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("maitrize-") && n.ends_with(".sqlite3")))
        .collect();
    if fichiers.len() <= SAUVEGARDES_GARDEES { return; }
    // Le nom porte la date ISO : l'ordre alphabétique est l'ordre chronologique.
    fichiers.sort();
    for vieux in &fichiers[..fichiers.len() - SAUVEGARDES_GARDEES] {
        std::fs::remove_file(vieux).ok();
    }
}

/// Date du jour en ISO (AAAA-MM-JJ), en heure locale : la copie doit changer
/// de nom au minuit de l'enseignant, pas à celui d'UTC.
fn jour_iso() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

/// Déplace les dossiers d'élèves rangés dans `settings` vers `documents_eleve`.
///
/// Historiquement, synthèse GS, PPI, GEVA-Sco, progressions et dispositifs
/// étaient enregistrés sous des clés `type:eleveId` (ou `dispositif:x:eleveId`).
/// On les transfère une fois pour toutes ; la table prend le relais ensuite.
/// Idempotent : ce qui est déplacé disparaît de `settings`.
pub(crate) fn migrer_documents_eleve(conn: &Connection) {
    let lignes: Vec<(String, String)> = {
        let Ok(mut st) = conn.prepare(
            "SELECT cle, valeur FROM settings
             WHERE cle LIKE 'syntheseGS:%' OR cle LIKE 'ppi:%' OR cle LIKE 'gevasco:%'
                OR cle LIKE 'progressions:%' OR cle LIKE 'dispositif:%'") else { return };
        let Ok(it) = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?))) else { return };
        it.flatten().collect()
    };
    if lignes.is_empty() { return; }

    let mut deplacees = 0usize;
    for (cle, valeur) in lignes {
        // `dispositif:pap:<élève>` → type « dispositif:pap » ; sinon `type:<élève>`.
        let Some((type_doc, eleve_id)) = cle.rsplit_once(':') else { continue };
        if eleve_id.is_empty() { continue; }
        // Un élève supprimé entre-temps n'a plus de dossier à reprendre.
        let existe: bool = conn.query_row("SELECT 1 FROM eleves WHERE id=?1", [eleve_id], |_| Ok(true))
            .unwrap_or(false);
        if existe {
            let ok = conn.execute(
                "INSERT OR REPLACE INTO documents_eleve (id, eleve_id, type, donnees, date_maj)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![format!("{eleve_id}:{type_doc}"), eleve_id, type_doc, valeur,
                    chrono::Utc::now().to_rfc3339()],
            ).is_ok();
            if !ok { continue; } // on garde la clé plutôt que de perdre la donnée
            deplacees += 1;
        }
        conn.execute("DELETE FROM settings WHERE cle=?1", [&cle]).ok();
    }
    if deplacees > 0 {
        println!("{deplacees} document(s) d'élève déplacé(s) des réglages vers la base.");
    }
}

pub(crate) fn migrate(conn: &Connection) {
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

        -- Jeux de la classe : ludothèque. Comme les ateliers, mais avec ce
        -- qu'on cherche quand on choisit un jeu — nombre de joueurs, durée,
        -- âge, et surtout où il est rangé.
        CREATE TABLE IF NOT EXISTS jeux (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL DEFAULT '',
            type_jeu TEXT NOT NULL DEFAULT '',
            description_jeu TEXT NOT NULL DEFAULT '',
            regles TEXT NOT NULL DEFAULT '',
            competences TEXT NOT NULL DEFAULT '',
            nb_joueurs_min INTEGER NOT NULL DEFAULT 2,
            nb_joueurs_max INTEGER NOT NULL DEFAULT 4,
            duree INTEGER NOT NULL DEFAULT 20,
            age_min INTEGER NOT NULL DEFAULT 3,
            rangement TEXT NOT NULL DEFAULT '',
            couleur TEXT NOT NULL DEFAULT 'purple',
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
            espace_id TEXT REFERENCES espaces(id) ON DELETE SET NULL,
            eleves_json TEXT NOT NULL DEFAULT '[]'
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

        -- Documents du dossier d'un élève (synthèse GS, PPI, GEVA-Sco,
        -- progressions, dispositifs). Auparavant rangés en JSON dans
        -- `settings` : impossibles à joindre, à chercher, ou à effacer avec
        -- l'élève. La clé étrangère fait le ménage toute seule.
        CREATE TABLE IF NOT EXISTS documents_eleve (
            id TEXT PRIMARY KEY,
            eleve_id TEXT NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
            type TEXT NOT NULL DEFAULT '',
            donnees TEXT NOT NULL DEFAULT '{}',
            date_maj TEXT NOT NULL DEFAULT '',
            UNIQUE (eleve_id, type)
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
        CREATE INDEX IF NOT EXISTS idx_docs_eleve ON documents_eleve(eleve_id);
        "#,
    )
    .expect("création schéma");

    // Migrations légères pour bases existantes (ignore l'erreur si déjà là).
    conn.execute("ALTER TABLE sequences ADD COLUMN video TEXT NOT NULL DEFAULT ''", []).ok();
    conn.execute("ALTER TABLE materiel_items ADD COLUMN seance_id TEXT", []).ok();
    conn.execute("ALTER TABLE materiel_items ADD COLUMN sequence_id TEXT", []).ok();
    conn.execute("ALTER TABLE projets ADD COLUMN image_nom TEXT", []).ok();
    migrer_documents_eleve(conn);

    // Élèves présents sur un créneau (organisation IME, groupes restreints).
    conn.execute("ALTER TABLE creneaux ADD COLUMN eleves_json TEXT NOT NULL DEFAULT '[]'", []).ok();
}

#[cfg(test)]
mod tests_dossier {
    use super::*;
    use std::path::Path;

    // Poser la base sur un partage réseau ne synchronise pas : ça corrompt.
    // Ce test garde le détecteur qui prévient l'enseignant avant le dégât.

    #[test]
    fn reconnait_un_partage_windows() {
        assert!(est_chemin_reseau(Path::new(r"\\BUREAU\maitrize-data")));
        assert!(est_chemin_reseau(Path::new("//bureau/maitrize-data")));
    }

    #[test]
    fn reconnait_un_volume_monte_sur_mac() {
        assert!(est_chemin_reseau(Path::new("/Volumes/maitrize-data/app")));
    }

    #[test]
    fn laisse_passer_un_chemin_local() {
        assert!(!est_chemin_reseau(Path::new("/Users/clement/Documents/maitrize")));
        assert!(!est_chemin_reseau(Path::new(r"C:\maitrize-data")));
        assert!(!est_chemin_reseau(Path::new("/Volumes/")));
    }

    #[test]
    fn le_defaut_suit_la_convention_de_la_plateforme() {
        let d = dossier_par_defaut();
        assert!(d.ends_with("fr.clementsapp.maitrize"), "{d:?}");
        if cfg!(target_os = "macos") {
            assert!(d.to_string_lossy().contains("Application Support"), "{d:?}");
        }
    }
}

#[cfg(test)]
mod tests_sauvegarde {
    use super::*;

    /// La copie du jour doit être créée, réutilisée sans doublon, et la
    /// rotation ne doit garder que les plus récentes.
    #[test]
    fn copie_quotidienne_et_rotation() {
        let dir = std::env::temp_dir().join(format!("maitrize-test-{}", std::process::id()));
        std::fs::remove_dir_all(&dir).ok();
        std::env::set_var("MAITRIZE_DATA_DIR", &dir);

        let conn = Connection::open(data_dir().join("maitrize.sqlite3")).unwrap();
        migrate(&conn);

        // Fausses copies anciennes, plus nombreuses que la limite.
        let sdir = sauvegardes_dir();
        for j in 1..=10 {
            std::fs::write(sdir.join(format!("maitrize-2026-01-{j:02}.sqlite3")), b"x").unwrap();
        }

        sauvegarde_auto(&conn);
        let cible = sdir.join(format!("maitrize-{}.sqlite3", jour_iso()));
        assert!(cible.exists(), "la copie du jour n'a pas été créée");
        let taille = std::fs::metadata(&cible).unwrap().len();
        assert!(taille > 0, "copie vide");

        let restantes = || std::fs::read_dir(&sdir).unwrap().count();
        assert_eq!(restantes(), SAUVEGARDES_GARDEES, "la rotation n'a pas purgé");

        // Deuxième lancement le même jour : pas de nouvelle copie.
        sauvegarde_auto(&conn);
        assert_eq!(restantes(), SAUVEGARDES_GARDEES);
        assert_eq!(std::fs::metadata(&cible).unwrap().len(), taille);

        // La date de dernière copie est enregistrée.
        let vu: String = conn.query_row("SELECT valeur FROM settings WHERE cle='derniereSauvegardeAuto'",
            [], |r| r.get(0)).unwrap();
        assert_eq!(vu, jour_iso());

        std::env::remove_var("MAITRIZE_DATA_DIR");
        std::fs::remove_dir_all(&dir).ok();
    }
}
