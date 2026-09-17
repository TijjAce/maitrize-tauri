//! Journal des changements : ce qui rend la synchronisation fine possible.
//!
//! Jusqu'ici, synchroniser voulait dire envoyer toute la base — 31 Mo — et
//! l'écraser à l'arrivée. Impossible de fusionner quoi que ce soit : la
//! dernière machine à parler gagnait tout, y compris ce qu'elle ignorait.
//!
//! Ce module enregistre chaque écriture ligne à ligne. Seuls les écarts
//! voyagent ensuite, et surtout ils deviennent **fusionnables** : deux
//! machines qui modifient deux élèves différents ne se marchent plus dessus.
//!
//! ## Pourquoi des déclencheurs SQLite
//!
//! L'application écrit dans ses tables depuis des dizaines d'endroits. Les
//! instrumenter un à un serait long et, surtout, on en oublierait — un oubli
//! invisible, puisqu'il produit simplement une donnée qui ne voyage jamais.
//! Les déclencheurs attrapent tout, y compris les suppressions en cascade.
//!
//! ## Ce qui n'est pas suivi
//!
//! `settings` est délibérément absent : il contient la clé API Mistral, les
//! identifiants du stockage et l'emplacement local des données. Les
//! synchroniser ferait voyager des secrets et imposerait à une machine les
//! chemins de l'autre. Même chose pour l'identité et les amis.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// Tables dont les lignes voyagent d'une machine à l'autre.
///
/// Toutes ont une clé primaire `id` en TEXT (un UUID) : deux machines ne
/// peuvent pas fabriquer le même identifiant, et une ligne créée de chaque
/// côté reste deux lignes distinctes au lieu de se percuter.
pub const TABLES_SYNC: &[&str] = &[
    "projets", "sequences", "seances", "ateliers", "espaces", "atelier_espace",
    "progressions_eleve", "creneaux", "eleves", "appels_journalier",
    "commentaires_eleve", "evaluations", "notes_eleve", "pieces_jointes",
    "materiel_items", "papiers_eleve", "notes_competence", "progressions_annuelle",
    "programmations_finale", "edt_typique", "documents_coffre", "documents_eleve",
    "jeux", "pilote_conversations", "textes", "outils_classe",
];

/// Tables apparues après les versions qui ignoraient les annonces (1.6.9 et
/// avant).
///
/// Un ordinateur pas encore mis à jour jette en silence les changements d'une
/// table qu'il ne connaît pas, et ne les reverra jamais : l'autre ordinateur
/// lui annonce donc une fois toutes les lignes de la table dès que sa fiche de
/// présence montre qu'il la connaît (voir `annoncer_tables`).
///
/// N'y mettre qu'une table inconnue des versions sans annonces : une version
/// ancienne qui connaîtrait la table prendrait l'annonce pour une
/// modification, et écraserait un travail plus récent.
pub const TABLES_ANNONCEES: &[&str] = &["outils_classe"];

/// Préfixes de réglages apparus après les versions sans annonces : même
/// traitement que `TABLES_ANNONCEES`. Les dossiers et la disposition des
/// onglets d'Ateliers & Espaces (« rangement: ») n'arrivaient pas sur un
/// ordinateur pas encore à jour.
pub const REGLAGES_ANNONCES: &[&str] = &["rangement:"];

/// Ce que cette version synchronise, tel que la fiche de présence l'annonce :
/// les tables, et les préfixes de réglages récents (« reglages:<préfixe> »).
pub fn tables_connues() -> Vec<String> {
    TABLES_SYNC.iter().map(|t| t.to_string())
        .chain(REGLAGES_ANNONCES.iter().map(|p| format!("reglages:{p}")))
        .collect()
}

/// Tables de liaison, sans colonne `id`.
///
/// `atelier_espace` associe un atelier à un espace par un couple de clés. Les
/// déclencheurs généraux, qui s'appuient sur `NEW.id`, ne pouvaient donc rien
/// y poser : la table était listée comme synchronisée et ne l'était pas — un
/// atelier rangé dans un espace ici restait sans espace là-bas, sans que rien
/// ne le signale. On lui fabrique un identifiant à partir de ses deux clés.
const LIAISONS: &[(&str, &str, &str)] = &[("atelier_espace", "atelier_id", "espace_id")];

/// Réglages qui voyagent, nommés un par un.
///
/// `settings` mêle trois choses : du travail (emploi du temps, plan de salle,
/// tableaux de langage), des préférences, et des secrets. Tout exclure — ce
/// que je faisais — laissait le nom de l'enseignant, son école et son emploi
/// du temps sur une seule machine. Tout inclure enverrait la clé API et la
/// phrase secrète à l'autre bout.
///
/// La liste est donc **blanche**, jamais noire : un réglage ajouté demain ne
/// partira pas tant qu'on ne l'aura pas nommé. L'oubli fait rester une donnée
/// sur place — ennuyeux ; l'inverse ferait fuiter un secret — grave.
const REGLAGES_PARTAGES: &[&str] = &[
    "enseignantNom", "ecole", "anneeCourante", "typeStructure", "zoneVacances",
    "notesRapides", "mistralModel", "iaContexte",
    "apparence", "accent", "styleInterface", "liseret",
    // Couleurs choisies des matières et des intitulés de l'emploi du temps.
    "matiereCouleursOverride",
];

/// Familles de réglages qui voyagent, par préfixe : emploi du temps, plan de
/// salle, tableaux de langage, couleurs des dossiers, disposition du bureau
/// du plan de travail et présentations enregistrées de Fabriquer. Ce sont des
/// données de travail, pas des préférences d'affichage.
const PREFIXES_PARTAGES: &[&str] = &["edt:", "salle:", "tla:", "dossier:", "bureau:", "fabriquer:", "rangement:"];

/// Réglages qui appartiennent à l'ordinateur lui-même, pas aux données.
///
/// Ni la synchronisation, ni une sauvegarde, ni une restauration ne doivent
/// les faire passer d'un poste à l'autre. Une restauration les copiait : le
/// second ordinateur prenait l'identifiant du premier, et chacun écartait
/// ensuite ce que l'autre envoyait en le croyant sien — plus rien ne passait.
/// Le repère d'envoi copié, lui, dépassait le journal local : plus aucune
/// modification ne partait.
pub const REGLAGES_DU_POSTE: &[&str] = &[
    "identifiantMachine", "nomMachine", "derniereSync", "derniereSauvegardeAuto",
    "syncSeqEnvoyee", "syncDeltasVus", CLE_DOSSIERS_ANNONCES,
    // La copie du bureau vit dans un dossier de cet ordinateur-ci.
    crate::copie_bureau::CLE_ACTIVE, crate::copie_bureau::CLE_EMPLACEMENT,
];

// ── Dossiers du plan de travail ────────────────────────────────────────────
//
// Un dossier n'est pas une ligne : il existe par le chemin de ce qu'il
// contient, ou par son réglage « dossier:<chemin> » (sa couleur, ou « aucune »
// pour un dossier créé vide). Deux façons de le perdre en passant d'un
// ordinateur à l'autre : une restauration remplace les réglages et le contenu
// par ceux de l'autre poste ; et, tant que les deux postes portaient le même
// identifiant, un dossier créé d'un côté n'arrivait jamais de l'autre.

const PREFIXE_DOSSIER: &str = "dossier:";
/// Valeur d'un dossier qui existe sans couleur (`SANS_COULEUR` côté fenêtre).
const SANS_COULEUR: &str = "aucune";
/// Tables dont les éléments se rangent dans les dossiers du plan de travail.
const TABLES_RANGEES: &[&str] = &["sequences", "materiel_items", "textes"];
/// Repère du poste : ses dossiers ont été annoncés à l'autre ordinateur.
pub const CLE_DOSSIERS_ANNONCES: &str = "syncDossiersAnnonces";

fn normaliser_chemin(chemin: &str) -> String {
    chemin.split('/').map(str::trim).filter(|s| !s.is_empty()).collect::<Vec<_>>().join("/")
}

/// Les réglages qui font exister les dossiers du plan de travail ici : ceux
/// des dossiers créés (couleur ou « aucune ») et la disposition de leur bureau,
/// plus « aucune » pour chaque dossier qui ne tient que par son contenu.
pub fn reglages_des_dossiers(conn: &Connection) -> Vec<(String, String)> {
    let mut sortie = std::collections::BTreeMap::new();
    for table in TABLES_RANGEES {
        let Ok(mut st) = conn.prepare(&format!("SELECT DISTINCT dossier FROM {table} WHERE dossier <> ''")) else { continue };
        let chemins: Vec<String> = st.query_map([], |r| r.get(0)).map(|it| it.flatten().collect()).unwrap_or_default();
        for chemin in chemins.iter().map(|c| normaliser_chemin(c)) {
            // « @… » : dossiers réservés, hors du bureau.
            if !chemin.is_empty() && !chemin.starts_with('@') {
                sortie.entry(format!("{PREFIXE_DOSSIER}{chemin}")).or_insert_with(|| SANS_COULEUR.to_string());
            }
        }
    }
    if let Ok(mut st) = conn.prepare(
        "SELECT cle, valeur FROM settings WHERE (cle LIKE 'dossier:%' OR cle LIKE 'bureau:%') AND valeur <> ''",
    ) {
        let lignes: Vec<(String, String)> = st.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .map(|it| it.flatten().collect()).unwrap_or_default();
        sortie.extend(lignes);
    }
    sortie.into_iter().collect()
}

/// Remet, après une restauration, les dossiers d'ici que la sauvegarde ne
/// connaissait pas — vides si leur contenu n'y était pas. Ce que la sauvegarde
/// dit d'un dossier (sa couleur, sa disposition, sa suppression) l'emporte.
pub fn retablir_dossiers(conn: &Connection, reglages: &[(String, String)]) -> rusqlite::Result<usize> {
    let mut n = 0;
    for (cle, valeur) in reglages {
        n += conn.execute("INSERT OR IGNORE INTO settings (cle, valeur) VALUES (?1, ?2)", params![cle, valeur])?;
    }
    Ok(n)
}

/// Annonce une fois les dossiers d'ici à l'autre ordinateur.
///
/// Ceux créés pendant que les deux postes portaient le même identifiant n'y
/// sont jamais arrivés. L'annonce n'y crée que ce qui manque : elle n'écrase ni
/// une couleur choisie là-bas, ni un dossier qu'on y a supprimé.
pub fn annoncer_dossiers(conn: &Connection, machine: &str) {
    let deja: String = conn
        .query_row("SELECT valeur FROM settings WHERE cle = ?1", params![CLE_DOSSIERS_ANNONCES], |r| r.get(0))
        .unwrap_or_default();
    if deja == "1" {
        return;
    }
    for (cle, valeur) in reglages_des_dossiers(conn) {
        if !cle.starts_with(PREFIXE_DOSSIER) {
            continue; // la disposition d'un bureau ne s'impose pas à l'autre poste
        }
        conn.execute(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
             VALUES ('settings', ?1, 'annonce', json_object('cle', ?1, 'valeur', ?2), '',
                     strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?3)",
            params![cle, valeur, machine],
        ).ok();
    }
    conn.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, '1')", params![CLE_DOSSIERS_ANNONCES]).ok();
}

/// Annonce les lignes des tables récentes aux ordinateurs qui viennent de les
/// connaître, une fois par ordinateur. `autres` donne, pour chaque autre
/// ordinateur, les tables que sa version connaît.
///
/// L'annonce ne crée là-bas que les lignes absentes : elle n'écrase rien et
/// ne ressuscite pas une ligne supprimée (voir `appliquer`).
pub fn annoncer_tables(conn: &Connection, machine: &str, autres: &[(String, Vec<String>)]) -> usize {
    let mut n = 0;
    for (autre, tables) in autres {
        for table in TABLES_ANNONCEES {
            if !tables.iter().any(|t| t == table) {
                continue; // pas encore à jour : on attendra qu'il la connaisse
            }
            let cle = format!("sync_annonce_{table}_{autre}");
            let deja: String = conn
                .query_row("SELECT valeur FROM settings WHERE cle = ?1", params![cle], |r| r.get(0))
                .unwrap_or_default();
            if deja == "1" {
                continue;
            }
            let cols = colonnes(conn, table);
            if !cols.iter().any(|c| c == "id") {
                continue;
            }
            let objet = cols.iter().map(|c| format!("'{c}', \"{c}\"")).collect::<Vec<_>>().join(", ");
            let Ok(ecrites) = conn.execute(
                &format!(
                    "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
                     SELECT '{table}', id, 'annonce', json_object({objet}), '', strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?1
                       FROM {table}"
                ),
                params![machine],
            ) else {
                continue;
            };
            n += ecrites;
            conn.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, '1')", params![cle]).ok();
        }
        for prefixe in REGLAGES_ANNONCES {
            let marque = format!("reglages:{prefixe}");
            if !tables.iter().any(|t| *t == marque) {
                continue;
            }
            let cle = format!("sync_annonce_{marque}_{autre}");
            let deja: String = conn
                .query_row("SELECT valeur FROM settings WHERE cle = ?1", params![cle], |r| r.get(0))
                .unwrap_or_default();
            if deja == "1" {
                continue;
            }
            // Comme `annoncer_dossiers` : là-bas, l'annonce ne crée que ce qui manque.
            let Ok(ecrites) = conn.execute(
                "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
                 SELECT 'settings', cle, 'annonce', json_object('cle', cle, 'valeur', valeur), '',
                        strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?2
                   FROM settings WHERE substr(cle, 1, length(?1)) = ?1 AND valeur <> ''",
                params![prefixe, machine],
            ) else {
                continue;
            };
            n += ecrites;
            conn.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, '1')", params![cle]).ok();
        }
    }
    n
}

/// Ce qui ne doit jamais partir, quoi qu'il arrive.
///
/// `identifiantMachine` en particulier : c'est lui qui départage deux
/// écritures simultanées. Le synchroniser donnerait le même identifiant aux
/// deux machines, et le départage cesserait de fonctionner au moment précis
/// où il sert.
pub fn reglage_partage(cle: &str) -> bool {
    const JAMAIS: &[&str] = &[
        "mistralApiKey", "sauvegarde_phrase", "cgu", "onboardingVu", "vacancesCache",
    ];
    if JAMAIS.contains(&cle) || REGLAGES_DU_POSTE.contains(&cle) || cle.starts_with("sync_") {
        return false;
    }
    REGLAGES_PARTAGES.contains(&cle) || PREFIXES_PARTAGES.iter().any(|p| cle.starts_with(p))
}

/// Une écriture, telle que le journal la retient.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Changement {
    pub table_nom: String,
    pub ligne_id: String,
    /// « maj » (insertion ou modification) ou « suppr ».
    pub operation: String,
    /// La ligne entière en JSON pour « maj », vide pour « suppr ».
    pub donnees: String,
    /// La ligne **avant** l'écriture, pour une modification. Vide à la
    /// création. C'est elle qui dit quels champs l'auteur a réellement
    /// touchés : sans elle, on ne voit que le résultat et on ne peut plus
    /// distinguer « j'ai changé le niveau » de « j'ai laissé le niveau ».
    #[serde(default)]
    pub avant: String,
    /// Horodatage UTC à la milliseconde.
    pub horodatage: String,
    /// Machine d'origine. Départage les horodatages identiques.
    #[serde(default)]
    pub origine: String,
    /// États CRDT des champs de prose, en base64, par nom de champ.
    ///
    /// Ils accompagnent la ligne : c'est ce qui permet de fusionner deux
    /// rédactions du même déroulé de séance au lieu d'en perdre une.
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub textes: std::collections::HashMap<String, String>,
}

/// Départage deux écritures concurrentes sur la même ligne.
///
/// L'horodatage seul ne suffit pas. Deux écritures peuvent tomber dans la même
/// milliseconde, et surtout deux ordinateurs n'ont pas la même horloge : rien
/// ne garantit qu'un « plus tard » d'une machine soit postérieur au « plus
/// tôt » de l'autre. À égalité d'horodatage, l'identifiant de machine tranche
/// — arbitrairement, mais **de la même façon des deux côtés**, ce qui est la
/// seule chose qui compte : sans ce départage commun, chaque machine garderait
/// sa version et elles divergeraient sans jamais se rejoindre.
fn gagne(a: (&str, &str), b: (&str, &str)) -> bool {
    a.0 > b.0 || (a.0 == b.0 && a.1 > b.1)
}

pub fn creer_table(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS textes_crdt (
            table_nom TEXT NOT NULL,
            ligne_id TEXT NOT NULL,
            champ TEXT NOT NULL,
            etat BLOB NOT NULL,
            PRIMARY KEY (table_nom, ligne_id, champ)
         );",
    )
    .ok();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS changements (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            table_nom TEXT NOT NULL,
            ligne_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            donnees TEXT NOT NULL DEFAULT '',
            avant TEXT NOT NULL DEFAULT '',
            horodatage TEXT NOT NULL,
            origine TEXT NOT NULL DEFAULT '',
            distant INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_changements_ligne
            ON changements(table_nom, ligne_id);",
    )
    .ok();
    completer_changements(conn);
}

/// Ajoute à `changements` les colonnes apparues après coup.
///
/// `CREATE TABLE IF NOT EXISTS` ne touche pas une table déjà présente : sur une
/// base créée par une version antérieure, une colonne ajoutée depuis manquerait
/// pour toujours. Les déclencheurs, eux, sont recréés à chaque démarrage et
/// citent la colonne — l'écriture échoue alors sur **toutes** les tables
/// journalisées, et l'application entière devient incapable d'enregistrer quoi
/// que ce soit. Le dommage est hors de proportion avec la cause : on complète
/// donc la table plutôt que de supposer qu'elle est à jour.
fn completer_changements(conn: &Connection) {
    const ATTENDUES: &[(&str, &str)] = &[
        ("donnees", "TEXT NOT NULL DEFAULT ''"),
        ("avant", "TEXT NOT NULL DEFAULT ''"),
        ("origine", "TEXT NOT NULL DEFAULT ''"),
        ("distant", "INTEGER NOT NULL DEFAULT 0"),
    ];
    let presentes = colonnes(conn, "changements");
    for (col, decl) in ATTENDUES {
        if !presentes.iter().any(|c| c == col) {
            conn.execute(&format!("ALTER TABLE changements ADD COLUMN {col} {decl}"), [])
                .ok();
        }
    }
}

/// Colonnes d'une table, lues dans le schéma réel.
fn colonnes(conn: &Connection, table: &str) -> Vec<String> {
    let Ok(mut st) = conn.prepare(&format!("PRAGMA table_info({table})")) else {
        return Vec::new();
    };
    st.query_map([], |r| r.get::<_, String>(1))
        .map(|it| it.flatten().collect())
        .unwrap_or_default()
}

/// (Re)pose les déclencheurs sur toutes les tables suivies.
///
/// Ils sont régénérés à chaque démarrage depuis le schéma : ajouter une
/// colonne suffit, le journal la reprend sans qu'on y pense.
pub fn poser_declencheurs(conn: &Connection, machine: &str) {
    // L'identifiant de machine est constant : on le grave dans le déclencheur,
    // SQLite n'ayant pas de variable de session à interroger.
    let machine = machine.replace('\'', "");
    poser_declencheurs_liaisons(conn, &machine);
    poser_declencheurs_reglages(conn, &machine);
    for table in TABLES_SYNC {
        let cols = colonnes(conn, table);
        if cols.is_empty() || !cols.iter().any(|c| c == "id") {
            continue;
        }
        let objet = |prefixe: &str| {
            cols.iter()
                .map(|c| format!("'{c}', {prefixe}.\"{c}\""))
                .collect::<Vec<_>>()
                .join(", ")
        };
        let creation = format!(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
             VALUES ('{table}', NEW.id, 'maj', json_object({}), '', strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');",
            objet("NEW")
        );
        let modification = format!(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
             VALUES ('{table}', NEW.id, 'maj', json_object({}), json_object({}), strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');",
            objet("NEW"), objet("OLD")
        );
        let suppr = format!(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
             VALUES ('{table}', OLD.id, 'suppr', '', '', strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');"
        );
        let sql = format!(
            "DROP TRIGGER IF EXISTS jrn_{table}_i;
             DROP TRIGGER IF EXISTS jrn_{table}_u;
             DROP TRIGGER IF EXISTS jrn_{table}_d;
             CREATE TRIGGER jrn_{table}_i AFTER INSERT ON {table} BEGIN {creation} END;
             CREATE TRIGGER jrn_{table}_u AFTER UPDATE ON {table} BEGIN {modification} END;
             CREATE TRIGGER jrn_{table}_d AFTER DELETE ON {table} BEGIN {suppr} END;"
        );
        conn.execute_batch(&sql).ok();
    }
}

/// Déclencheur des réglages partagés.
///
/// La clé primaire est `cle`, pas `id` : les déclencheurs généraux ne
/// s'appliquent pas. La clause WHEN reprend la liste blanche, de sorte qu'un
/// secret n'entre jamais dans le journal — même pas pour être filtré plus tard.
fn poser_declencheurs_reglages(conn: &Connection, machine: &str) {
    let noms = REGLAGES_PARTAGES.iter().map(|c| format!("'{c}'")).collect::<Vec<_>>().join(", ");
    let prefixes = PREFIXES_PARTAGES
        .iter()
        .map(|p| format!("NEW.cle LIKE '{p}%'"))
        .collect::<Vec<_>>()
        .join(" OR ");
    let condition = format!("NEW.cle IN ({noms}) OR {prefixes}");
    let insertion = format!(
        "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
         VALUES ('settings', NEW.cle, 'maj', json_object('cle', NEW.cle, 'valeur', NEW.valeur), '',
                 strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');"
    );
    let sql = format!(
        "DROP TRIGGER IF EXISTS jrn_settings_i;
         DROP TRIGGER IF EXISTS jrn_settings_u;
         CREATE TRIGGER jrn_settings_i AFTER INSERT ON settings WHEN {condition} BEGIN {insertion} END;
         CREATE TRIGGER jrn_settings_u AFTER UPDATE ON settings WHEN {condition} BEGIN {insertion} END;"
    );
    conn.execute_batch(&sql).ok();
}

/// Déclencheurs des tables de liaison, dont la clé est un couple.
fn poser_declencheurs_liaisons(conn: &Connection, machine: &str) {
    for (table, a, b) in LIAISONS {
        let objet = |p: &str| format!("'{a}', {p}.\"{a}\", '{b}', {p}.\"{b}\"");
        let id = |p: &str| format!("{p}.\"{a}\" || '|' || {p}.\"{b}\"");
        let ligne = |op: &str, p: &str, donnees: String| {
            format!(
                "INSERT INTO changements (table_nom, ligne_id, operation, donnees, avant, horodatage, origine)
                 VALUES ('{table}', {}, '{op}', {donnees}, '', strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');",
                id(p)
            )
        };
        let sql = format!(
            "DROP TRIGGER IF EXISTS jrn_{table}_i;
             DROP TRIGGER IF EXISTS jrn_{table}_d;
             CREATE TRIGGER jrn_{table}_i AFTER INSERT ON {table} BEGIN {} END;
             CREATE TRIGGER jrn_{table}_d AFTER DELETE ON {table} BEGIN {} END;",
            ligne("maj", "NEW", format!("json_object({})", objet("NEW"))),
            ligne("suppr", "OLD", "''".into()),
        );
        conn.execute_batch(&sql).ok();
    }
}

/// Les changements d'origine locale postérieurs à `depuis`, avec le repère
/// auquel se replacer.
///
/// Les lignes marquées `distant` sont écartées : ce sont celles qu'on vient de
/// recevoir, et les renvoyer ferait rebondir chaque modification entre les
/// deux machines sans fin.
pub fn changements_locaux(
    conn: &Connection,
    depuis: i64,
) -> rusqlite::Result<(Vec<Changement>, i64)> {
    let mut st = conn.prepare(
        "SELECT table_nom, ligne_id, operation, donnees, horodatage, origine, avant
           FROM changements WHERE seq > ?1 AND distant = 0 ORDER BY seq",
    )?;
    let lignes = st
        .query_map(params![depuis], |r| {
            Ok(Changement {
                table_nom: r.get(0)?,
                ligne_id: r.get(1)?,
                operation: r.get(2)?,
                donnees: r.get(3)?,
                horodatage: r.get(4)?,
                origine: r.get(5)?,
                avant: r.get(6)?,
                textes: Default::default(),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(st);
    let mut lignes = lignes;
    for ch in &mut lignes {
        if ch.operation == "maj" || ch.operation == "annonce" {
            enrichir_textes(conn, ch);
        }
    }
    // Le repère avance jusqu'au bout du journal, y compris sur les lignes
    // distantes écartées : sinon on les relirait à chaque envoi.
    Ok((lignes, dernier_seq(conn).max(depuis)))
}

/// Lit l'état CRDT d'un champ, ou rien s'il n'en a pas encore.
fn etat_crdt(c: &Connection, table: &str, ligne: &str, champ: &str) -> Vec<u8> {
    c.query_row(
        "SELECT etat FROM textes_crdt WHERE table_nom=?1 AND ligne_id=?2 AND champ=?3",
        params![table, ligne, champ],
        |r| r.get(0),
    )
    .unwrap_or_default()
}

fn poser_crdt(c: &Connection, table: &str, ligne: &str, champ: &str, etat: &[u8]) {
    c.execute(
        "INSERT OR REPLACE INTO textes_crdt (table_nom, ligne_id, champ, etat) VALUES (?1,?2,?3,?4)",
        params![table, ligne, champ, etat],
    )
    .ok();
}

/// Enrichit un changement sortant des états CRDT de ses champs de prose.
///
/// L'édition se déduit de l'avant et de l'après que le journal a déjà : nul
/// besoin d'instrumenter les écrans de saisie, qui écrivent des chaînes
/// entières sans savoir ce qu'ils ont changé.
pub fn enrichir_textes(c: &Connection, ch: &mut Changement) {
    use base64::Engine;
    let Ok(apres) = serde_json::from_str::<serde_json::Value>(&ch.donnees) else { return };
    let avant: serde_json::Value = serde_json::from_str(&ch.avant).unwrap_or(serde_json::Value::Null);
    for (champ, valeur) in apres.as_object().into_iter().flatten() {
        if !crate::texte_crdt::est_texte_libre(&ch.table_nom, champ) {
            continue;
        }
        let neuf = valeur.as_str().unwrap_or_default();
        let vieux = avant.get(champ).and_then(|v| v.as_str()).unwrap_or_default();
        if neuf == vieux {
            continue;
        }
        let etat = etat_crdt(c, &ch.table_nom, &ch.ligne_id, champ);
        let Some(nouvel) = sans_panique(|| crate::texte_crdt::enregistrer_edition(&etat, vieux, neuf)) else {
            continue; // le champ voyage sans son état, en fusion champ par champ
        };
        poser_crdt(c, &ch.table_nom, &ch.ligne_id, champ, &nouvel);
        ch.textes.insert(
            champ.clone(),
            base64::engine::general_purpose::STANDARD.encode(&nouvel),
        );
    }
}

/// Fusionne les états CRDT reçus et renvoie les textes qui en résultent.
fn fusionner_textes(
    c: &Connection,
    ch: &Changement,
) -> std::collections::HashMap<String, String> {
    use base64::Engine;
    let mut sortie = std::collections::HashMap::new();
    for (champ, b64) in &ch.textes {
        let Ok(entrant) = base64::engine::general_purpose::STANDARD.decode(b64) else { continue };
        let local = etat_crdt(c, &ch.table_nom, &ch.ligne_id, champ);
        let Some((fusionne, texte)) = sans_panique(|| crate::texte_crdt::fusionner(&local, &entrant)) else {
            continue; // la valeur que porte la ligne s'applique, champ par champ
        };
        poser_crdt(c, &ch.table_nom, &ch.ligne_id, champ, &fusionne);
        sortie.insert(champ.clone(), texte);
    }
    sortie
}

/// Un calcul de fusion de texte, sans laisser une panique remonter.
///
/// Ces calculs tournent pendant que la synchronisation tient la base. Une
/// panique de `yrs` y « empoisonnait » le verrou : toutes les commandes
/// suivantes échouaient (« poisoned lock ») jusqu'au redémarrage, et le
/// changement fautif, jamais envoyé, recommençait au passage suivant. Mieux
/// vaut perdre la fusion fine d'un champ que l'usage de l'application.
fn sans_panique<T>(calcul: impl FnOnce() -> T) -> Option<T> {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(calcul)).ok()
}

/// Les champs qu'une écriture a réellement modifiés.
///
/// Sans l'état d'avant — à la création d'une ligne — tout est nouveau.
fn champs_touches(avant: &str, apres: &serde_json::Value) -> std::collections::HashSet<String> {
    let Some(apres_o) = apres.as_object() else { return Default::default() };
    let avant_v: Option<serde_json::Value> = serde_json::from_str(avant).ok();
    let Some(avant_o) = avant_v.as_ref().and_then(|v| v.as_object()) else {
        return apres_o.keys().cloned().collect();
    };
    apres_o
        .iter()
        .filter(|(k, v)| avant_o.get(*k) != Some(*v))
        .map(|(k, _)| k.clone())
        .collect()
}

/// Fusionne une ligne locale et une ligne entrante, **champ par champ**.
///
/// La fusion ligne par ligne perdait du travail sans le dire : corriger le
/// niveau d'un élève sur le bureau pendant qu'on change son nom sur le
/// portable, et l'une des deux modifications disparaissait — alors qu'elles
/// ne se contredisent pas.
///
/// On n'applique donc de l'entrant que **ce qu'il a lui-même modifié**. Un
/// champ touché des deux côtés est le seul vrai conflit : il revient au camp
/// gagnant, désigné par l'horodatage puis par la machine.
fn fusionner_champs(
    locale: &serde_json::Value,
    entrant: &serde_json::Value,
    touches_entrant: &std::collections::HashSet<String>,
    touches_local: &std::collections::HashSet<String>,
    entrant_gagne: bool,
) -> serde_json::Value {
    let (Some(loc), Some(ent)) = (locale.as_object(), entrant.as_object()) else {
        return entrant.clone();
    };
    let mut sortie = loc.clone();
    for (cle, valeur) in ent {
        if !touches_entrant.contains(cle) {
            continue; // l'entrant n'a pas touché ce champ : on garde le nôtre
        }
        if touches_local.contains(cle) && !entrant_gagne {
            continue; // touché des deux côtés, et c'est nous qui l'emportons
        }
        sortie.insert(cle.clone(), valeur.clone());
    }
    serde_json::Value::Object(sortie)
}

/// Applique des changements venus d'ailleurs.
///
/// Règle : la ligne est fusionnée champ par champ. Chacun garde ce qu'il est
/// seul à avoir modifié ; un champ touché des deux côtés revient au plus
/// récent, départagé par la machine.
pub fn appliquer(conn: &mut Connection, recus: &[Changement]) -> rusqlite::Result<usize> {
    let avant_tout = dernier_seq(conn);
    let tx = conn.transaction()?;
    let mut n = 0;
    for c in recus {
        // Repère avant écriture : les traces que nos propres déclencheurs vont
        // laisser doivent porter la provenance réelle du changement, pas la
        // nôtre. Sans cela, une modification reçue paraîtrait écrite ici et
        // maintenant, donc plus récente que les changements suivants du même
        // envoi — qui seraient alors rejetés.
        let avant_ligne: i64 = tx
            .query_row("SELECT COALESCE(MAX(seq), 0) FROM changements", [], |r| r.get(0))
            .unwrap_or(0);
        // Table inconnue : on ignore plutôt que d'écrire au hasard.
        if c.table_nom == "settings" {
            // Deuxième contrôle à l'arrivée : une machine mal réglée, ou une
            // version plus ancienne, ne doit pas pouvoir nous imposer une clé
            // que nous considérons comme un secret.
            if !reglage_partage(&c.ligne_id) {
                continue;
            }
            let valeur: Option<String> = serde_json::from_str::<serde_json::Value>(&c.donnees)
                .ok()
                .and_then(|v| v.get("valeur").and_then(|x| x.as_str()).map(str::to_string));
            if let Some(v) = valeur {
                // Une annonce ne crée que ce qui manque ici (voir `annoncer_dossiers`).
                let sql = if c.operation == "annonce" {
                    "INSERT OR IGNORE INTO settings (cle, valeur) VALUES (?1, ?2)"
                } else {
                    "INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)"
                };
                n += tx.execute(sql, params![c.ligne_id, v])?;
            }
            continue;
        }
        if !TABLES_SYNC.contains(&c.table_nom.as_str()) {
            continue;
        }
        if c.operation == "annonce" {
            // Une annonce ne crée que ce qui manque ici, et jamais une ligne
            // qu'on y a supprimée.
            if !TABLES_ANNONCEES.contains(&c.table_nom.as_str()) {
                continue;
            }
            let existe = tx
                .query_row(&format!("SELECT 1 FROM {} WHERE id = ?1", c.table_nom), params![c.ligne_id], |_| Ok(()))
                .is_ok();
            let supprimee = tx
                .query_row(
                    "SELECT 1 FROM changements WHERE table_nom = ?1 AND ligne_id = ?2 AND operation = 'suppr' LIMIT 1",
                    params![c.table_nom, c.ligne_id],
                    |_| Ok(()),
                )
                .is_ok();
            if existe || supprimee {
                continue;
            }
        }
        // Qui l'emporte sur les champs disputés — et ce que nous avons
        // nous-même modifié depuis, pour ne pas l'écraser.
        let local: Option<(String, String, String, String)> = tx
            .query_row(
                // Nos annonces ne sont pas des modifications : elles ne
                // doivent pas l'emporter sur un travail fait là-bas.
                "SELECT horodatage, origine, donnees, avant FROM changements
                  WHERE table_nom = ?1 AND ligne_id = ?2 AND operation <> 'annonce'
                  ORDER BY horodatage DESC, origine DESC LIMIT 1",
                params![c.table_nom, c.ligne_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .ok();
        let entrant_gagne = match &local {
            Some((h, o, _, _)) => !gagne((h, o), (&c.horodatage, &c.origine)),
            None => true,
        };

        if c.operation == "suppr" {
            // Une suppression est totale : elle ne se fusionne pas. Elle ne
            // s'applique donc que si elle l'emporte, sinon une suppression
            // ancienne effacerait un travail plus récent.
            if entrant_gagne {
                if let Some((_, a, b)) = LIAISONS.iter().find(|(t, _, _)| *t == c.table_nom) {
                    let Some((ga, gb)) = c.ligne_id.split_once('|') else { continue };
                    tx.execute(
                        &format!("DELETE FROM {} WHERE \"{a}\" = ?1 AND \"{b}\" = ?2", c.table_nom),
                        params![ga, gb],
                    )?;
                    n += 1;
                    continue;
                }
                tx.execute(
                    &format!("DELETE FROM {} WHERE id = ?1", c.table_nom),
                    params![c.ligne_id],
                )?;
            } else {
                continue;
            }
        } else if LIAISONS.iter().any(|(t, _, _)| *t == c.table_nom) {
            // Une liaison n'a pas de champ à fusionner : elle existe ou non.
            let cols = colonnes(&tx, &c.table_nom);
            let noms = cols.iter().map(|x| format!("\"{x}\"")).collect::<Vec<_>>().join(", ");
            let valeurs = cols.iter().map(|x| format!("json_extract(?1, '$.{x}')")).collect::<Vec<_>>().join(", ");
            tx.execute(
                &format!("INSERT OR REPLACE INTO {} ({noms}) VALUES ({valeurs})", c.table_nom),
                params![c.donnees],
            )?;
        } else {
            let cols = colonnes(&tx, &c.table_nom);
            if cols.is_empty() {
                continue;
            }
            let ch_a_des_textes = !c.textes.is_empty();
            let entrant: serde_json::Value =
                serde_json::from_str(&c.donnees).unwrap_or(serde_json::Value::Null);
            let objet = cols.iter().map(|x| format!("'{x}', \"{x}\"")).collect::<Vec<_>>().join(", ");
            let ici: Option<serde_json::Value> = tx
                .query_row(
                    &format!("SELECT json_object({objet}) FROM {} WHERE id = ?1", c.table_nom),
                    params![c.ligne_id],
                    |r| r.get::<_, String>(0),
                )
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok());

            // Les champs de prose passent par le CRDT : leur valeur fusionnée
            // remplace celle que transporte la ligne, laquelle ne représente
            // que la vue de l'expéditeur.
            let textes = if ch_a_des_textes { fusionner_textes(&tx, c) } else { Default::default() };

            let a_ecrire = match ici {
                Some(locale) => {
                    let touches_entrant = champs_touches(&c.avant, &entrant);
                    let touches_local = local
                        .as_ref()
                        .map(|(_, _, d, a)| {
                            let apres: serde_json::Value =
                                serde_json::from_str(d).unwrap_or(serde_json::Value::Null);
                            champs_touches(a, &apres)
                        })
                        .unwrap_or_default();
                    fusionner_champs(&locale, &entrant, &touches_entrant, &touches_local, entrant_gagne)
                }
                // Ligne absente ici : rien à fusionner, on la crée.
                None => entrant,
            };
            let mut a_ecrire = a_ecrire;
            if let Some(o) = a_ecrire.as_object_mut() {
                for (champ, texte) in &textes {
                    o.insert(champ.clone(), serde_json::Value::String(texte.clone()));
                }
            }
            let json = a_ecrire.to_string();
            let noms = cols.iter().map(|x| format!("\"{x}\"")).collect::<Vec<_>>().join(", ");
            let valeurs = cols
                .iter()
                .map(|x| format!("json_extract(?1, '$.{x}')"))
                .collect::<Vec<_>>()
                .join(", ");
            // Mise à jour sur place, jamais « remplacer » : pour SQLite, remplacer
            // une ligne, c'est la supprimer puis la recréer — et la suppression
            // emporte en cascade tout ce qui en dépend (les séances d'une
            // séquence, les documents d'un élève, les notes d'une évaluation).
            let maj = cols
                .iter()
                .filter(|x| x.as_str() != "id")
                .map(|x| format!("\"{x}\" = excluded.\"{x}\""))
                .collect::<Vec<_>>()
                .join(", ");
            tx.execute(
                &format!(
                    "INSERT INTO {} ({noms}) VALUES ({valeurs}) ON CONFLICT(id) DO UPDATE SET {maj}",
                    c.table_nom
                ),
                params![json],
            )?;
        }
        // Réattribuer la trace qu'on vient de produire à son véritable auteur.
        tx.execute(
            "UPDATE changements SET horodatage = ?1, origine = ?2, distant = 1
              WHERE seq > ?3",
            params![c.horodatage, c.origine, avant_ligne],
        )?;
        n += 1;
    }
    tx.commit()?;
    // Filet : toute trace restante produite pendant l'application est
    // distante et ne doit pas repartir d'où elle vient.
    marquer_distants(conn, avant_tout);
    Ok(n)
}

/// Marque comme distants les changements postérieurs à `apres`.
pub fn marquer_distants(conn: &Connection, apres: i64) {
    conn.execute("UPDATE changements SET distant = 1 WHERE seq > ?1", params![apres])
        .ok();
}

/// Dernier numéro du journal.
pub fn dernier_seq(conn: &Connection) -> i64 {
    conn.query_row("SELECT COALESCE(MAX(seq), 0) FROM changements", [], |r| r.get(0))
        .unwrap_or(0)
}

/// Le repère d'où reprendre l'envoi des changements locaux.
///
/// Un repère au-delà du journal vient d'une autre base : une restauration
/// l'avait copié. Tel quel, plus aucune modification faite ici ne partait tant
/// que le journal ne l'avait pas rattrapé — des centaines d'écritures plus
/// tard. On repart alors de la dernière écriture reçue ou restaurée : ce qui
/// la suit est du travail neuf ; ce qui la précède est déjà parti, ou a été
/// remplacé par la restauration.
pub fn repere_envoi(conn: &Connection, repere: i64) -> i64 {
    if repere <= dernier_seq(conn) {
        return repere;
    }
    conn.query_row("SELECT COALESCE(MAX(seq), 0) FROM changements WHERE distant = 1", [], |r| r.get(0))
        .unwrap_or(0)
}

/// Élague le journal, qui n'a pas vocation à grandir sans fin.
pub fn elaguer(conn: &Connection, avant: i64) {
    conn.execute("DELETE FROM changements WHERE seq <= ?1", params![avant]).ok();
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Deux bases indépendantes, comme deux machines.
    fn machine() -> Connection { machine_nommee("A") }

    fn machine_nommee(nom: &str) -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE eleves (id TEXT PRIMARY KEY, nom TEXT, niveau TEXT);
             CREATE TABLE commentaires_eleve (id TEXT PRIMARY KEY, texte TEXT, eleve_id TEXT);",
        )
        .unwrap();
        creer_table(&c);
        poser_declencheurs(&c, nom);
        c
    }

    fn ajouter(c: &Connection, id: &str, nom: &str) {
        c.execute("INSERT INTO eleves (id, nom, niveau) VALUES (?1, ?2, 'CE2')", params![id, nom])
            .unwrap();
    }

    fn noms(c: &Connection) -> Vec<String> {
        let mut st = c.prepare("SELECT nom FROM eleves ORDER BY nom").unwrap();
        st.query_map([], |r| r.get(0)).unwrap().flatten().collect()
    }

    #[test]
    fn une_ecriture_laisse_une_trace() {
        let c = machine();
        ajouter(&c, "e1", "Quang");
        let (ch, _) = changements_locaux(&c, 0).unwrap();
        assert_eq!(ch.len(), 1);
        assert_eq!(ch[0].table_nom, "eleves");
        assert_eq!(ch[0].operation, "maj");
        assert!(ch[0].donnees.contains("Quang"), "{}", ch[0].donnees);
    }

    #[test]
    fn une_suppression_aussi() {
        let c = machine();
        ajouter(&c, "e1", "Quang");
        c.execute("DELETE FROM eleves WHERE id='e1'", []).unwrap();
        let (ch, _) = changements_locaux(&c, 0).unwrap();
        assert_eq!(ch.last().unwrap().operation, "suppr");
    }

    #[test]
    fn deux_machines_fusionnent_leurs_travaux_distincts() {
        // Le cœur de l'affaire : chacune garde ce que l'autre ignorait.
        let a = machine();
        let mut b = machine();
        ajouter(&a, "e1", "Quang");
        ajouter(&b, "e2", "Lina");
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        assert_eq!(noms(&b), vec!["Lina", "Quang"]);
    }

    #[test]
    fn ce_quon_recoit_ne_repart_pas() {
        // Sans cette règle, chaque modification rebondirait indéfiniment.
        let a = machine();
        let mut b = machine();
        ajouter(&a, "e1", "Quang");
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        let (de_b, _) = changements_locaux(&b, 0).unwrap();
        assert!(de_b.is_empty(), "b renvoie ce qu'il a reçu : {de_b:?}");
    }

    #[test]
    fn la_derniere_ecriture_gagne_sur_la_meme_ligne() {
        let a = machine_nommee("A");
        let mut b = machine_nommee("B");
        ajouter(&a, "e1", "Quang");
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        // b renomme après coup : son écriture est postérieure. L'attente
        // dépasse la milliseconde, résolution de l'horodatage SQLite.
        std::thread::sleep(std::time::Duration::from_millis(3));
        b.execute("UPDATE eleves SET nom='Quang N.' WHERE id='e1'", []).unwrap();
        // a renvoie sa version d'origine, plus ancienne : elle ne doit pas gagner.
        appliquer(&mut b, &de_a).unwrap();
        assert_eq!(noms(&b), vec!["Quang N."]);
    }

    #[test]
    fn a_horodatage_egal_les_deux_machines_tranchent_pareil() {
        // Sans départage commun, chacune garderait sa version et elles
        // divergeraient définitivement.
        let t = "2026-09-12T10:00:00.000Z";
        assert!(gagne((t, "B"), (t, "A")));
        assert!(!gagne((t, "A"), (t, "B")));
        // Et l'horodatage prime toujours sur le nom de la machine.
        assert!(gagne(("2026-09-12T10:00:01.000Z", "A"), (t, "Z")));
    }

    #[test]
    fn un_conflit_simultane_converge_des_deux_cotes() {
        let mut a = machine_nommee("A");
        let mut b = machine_nommee("B");
        ajouter(&a, "e1", "version de A");
        ajouter(&b, "e1", "version de B");
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        let (de_b, _) = changements_locaux(&b, 0).unwrap();
        appliquer(&mut a, &de_b).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        assert_eq!(noms(&a), noms(&b), "les deux machines doivent se rejoindre");
    }

    fn ens(v: &[&str]) -> std::collections::HashSet<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn on_napplique_que_ce_que_lentrant_a_touche() {
        // Le portable n'a changé que la photo : le niveau corrigé ici ne doit
        // pas revenir à l'ancienne valeur que le portable transporte encore.
        let locale = serde_json::json!({"id":"e1","niveau":"CM1","photo":null});
        let entrant = serde_json::json!({"id":"e1","niveau":"CE2","photo":"p.jpg"});
        let r = fusionner_champs(&locale, &entrant, &ens(&["photo"]), &ens(&["niveau"]), true);
        assert_eq!(r["photo"], "p.jpg");
        assert_eq!(r["niveau"], "CM1", "le niveau local ne doit pas régresser");
    }

    #[test]
    fn un_champ_touche_des_deux_cotes_revient_au_gagnant() {
        let locale = serde_json::json!({"id":"e1","nom":"Quang"});
        let entrant = serde_json::json!({"id":"e1","nom":"Quang N."});
        let (te, tl) = (ens(&["nom"]), ens(&["nom"]));
        assert_eq!(fusionner_champs(&locale, &entrant, &te, &tl, true)["nom"], "Quang N.");
        assert_eq!(fusionner_champs(&locale, &entrant, &te, &tl, false)["nom"], "Quang");
    }

    #[test]
    fn vider_un_champ_est_une_intention_respectee() {
        let locale = serde_json::json!({"id":"e1","note":"ancienne"});
        let entrant = serde_json::json!({"id":"e1","note":""});
        let r = fusionner_champs(&locale, &entrant, &ens(&["note"]), &ens(&[]), true);
        assert_eq!(r["note"], "");
    }

    #[test]
    fn champs_touches_compare_avant_et_apres() {
        let apres = serde_json::json!({"id":"e1","nom":"Quang","niveau":"CM1"});
        let avant = r#"{"id":"e1","nom":"Quang","niveau":"CE2"}"#;
        assert_eq!(champs_touches(avant, &apres), ens(&["niveau"]));
        // À la création, il n'y a pas d'avant : tout est nouveau.
        assert_eq!(champs_touches("", &apres).len(), 3);
    }

    #[test]
    fn deux_machines_modifient_deux_champs_du_meme_eleve() {
        let a = machine_nommee("A");
        let mut b = machine_nommee("B");
        ajouter(&a, "e1", "Quang");
        let (depart, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &depart).unwrap();
        // A change le niveau, B change le nom, chacun de son côté.
        std::thread::sleep(std::time::Duration::from_millis(3));
        a.execute("UPDATE eleves SET niveau='CM1' WHERE id='e1'", []).unwrap();
        b.execute("UPDATE eleves SET nom='Quang N.' WHERE id='e1'", []).unwrap();
        let (de_a, _) = changements_locaux(&a, depart.len() as i64).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        let (nom, niveau): (String, String) = b
            .query_row("SELECT nom, niveau FROM eleves WHERE id='e1'", [], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap();
        assert_eq!(niveau, "CM1", "la modification de A doit arriver");
        assert_eq!(nom, "Quang N.", "celle de B ne doit pas disparaître");
    }

    /// Le cas que la fusion champ par champ ne savait pas traiter : deux
    /// rédactions du **même** déroulé de séance. L'une écrasait l'autre.
    #[test]
    fn deux_redactions_du_meme_deroule_se_fusionnent() {
        let neuve = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch("CREATE TABLE seances (id TEXT PRIMARY KEY, titre TEXT, deroulement TEXT);").unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let mut a = neuve("A");
        let mut b = neuve("B");

        // Départ commun.
        a.execute("INSERT INTO seances (id, titre, deroulement) VALUES ('s1','Lecture','Phase 1.\nPhase 2.')", []).unwrap();
        let (depart, repere_a) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &depart).unwrap();
        let (_, repere_b) = changements_locaux(&b, 0).unwrap();

        // Chacun complète une phase différente, sans voir l'autre.
        std::thread::sleep(std::time::Duration::from_millis(3));
        a.execute("UPDATE seances SET deroulement='Phase 1 : rituel.\nPhase 2.' WHERE id='s1'", []).unwrap();
        b.execute("UPDATE seances SET deroulement='Phase 1.\nPhase 2 : ateliers.' WHERE id='s1'", []).unwrap();

        let (de_a, _) = changements_locaux(&a, repere_a).unwrap();
        let (de_b, _) = changements_locaux(&b, repere_b).unwrap();
        assert!(!de_a[0].textes.is_empty(), "l'état CRDT doit accompagner le changement");

        appliquer(&mut b, &de_a).unwrap();
        appliquer(&mut a, &de_b).unwrap();

        let lire = |c: &Connection| -> String {
            c.query_row("SELECT deroulement FROM seances WHERE id='s1'", [], |r| r.get(0)).unwrap()
        };
        let (ta, tb) = (lire(&a), lire(&b));
        assert!(tb.contains("rituel"), "l'ajout de A doit survivre chez B : {tb}");
        assert!(tb.contains("ateliers"), "celui de B doit rester : {tb}");
        assert_eq!(ta, tb, "les deux machines doivent afficher le même texte");
    }

    /// Un déroulé rédigé avant la synchronisation : ni trace dans le journal,
    /// ni état CRDT, des deux côtés. Le raccourcir faisait paniquer la
    /// synchronisation, base verrouillée — et toute l'application échouait
    /// ensuite sur « poisoned lock ».
    #[test]
    fn un_texte_ecrit_avant_la_synchronisation_voyage() {
        let ancienne = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch(
                "CREATE TABLE seances (id TEXT PRIMARY KEY, titre TEXT, deroulement TEXT);
                 INSERT INTO seances VALUES ('s1', 'Lecture', 'Phase 1.\nPhase 2.\nPhase 3.');",
            ).unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let lire = |c: &Connection| -> String {
            c.query_row("SELECT deroulement FROM seances WHERE id='s1'", [], |r| r.get(0)).unwrap()
        };
        let mut a = ancienne("A");
        let mut b = ancienne("B");

        std::thread::sleep(std::time::Duration::from_millis(3));
        // A retire la phase 3, B complète la phase 2.
        a.execute("UPDATE seances SET deroulement='Phase 1.\nPhase 2.' WHERE id='s1'", []).unwrap();
        b.execute("UPDATE seances SET deroulement='Phase 1.\nPhase 2 : ateliers.\nPhase 3.' WHERE id='s1'", []).unwrap();

        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        let (de_b, _) = changements_locaux(&b, 0).unwrap();
        assert!(!de_a[0].textes.is_empty(), "l'état CRDT doit accompagner le changement");

        appliquer(&mut b, &de_a).unwrap();
        appliquer(&mut a, &de_b).unwrap();
        let (ta, tb) = (lire(&a), lire(&b));
        assert_eq!(ta, tb, "les deux machines doivent afficher le même texte");
        assert_eq!(ta, "Phase 1.\nPhase 2 : ateliers.",
                   "chacun garde sa modification, sans doublon de l'ancien texte");
    }

    #[test]
    fn une_table_de_liaison_voyage_aussi() {
        // Sans déclencheur adapté, ranger un atelier dans un espace ici
        // n'arrivait jamais là-bas : la table était annoncée comme
        // synchronisée et ne l'était pas.
        let neuve = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch(
                "CREATE TABLE atelier_espace (atelier_id TEXT NOT NULL, espace_id TEXT NOT NULL,
                                              PRIMARY KEY (atelier_id, espace_id));",
            ).unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let a = neuve("A");
        let mut b = neuve("B");
        a.execute("INSERT INTO atelier_espace VALUES ('at1','es1')", []).unwrap();
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        assert_eq!(de_a.len(), 1, "la liaison doit laisser une trace");
        assert_eq!(de_a[0].ligne_id, "at1|es1");
        appliquer(&mut b, &de_a).unwrap();
        let n: i64 = b.query_row("SELECT COUNT(*) FROM atelier_espace", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 1, "la liaison doit arriver");

        // Et sa suppression aussi.
        std::thread::sleep(std::time::Duration::from_millis(3));
        a.execute("DELETE FROM atelier_espace", []).unwrap();
        let (suppr, _) = changements_locaux(&a, de_a.len() as i64).unwrap();
        appliquer(&mut b, &suppr).unwrap();
        let n: i64 = b.query_row("SELECT COUNT(*) FROM atelier_espace", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 0, "la suppression doit arriver");
    }

    #[test]
    fn les_secrets_ne_partent_jamais() {
        // Le test le plus important du fichier : ces clés, sur le stockage ou
        // sur l'autre machine, seraient une fuite.
        for secret in ["mistralApiKey", "sauvegarde_phrase", "sync_secret",
                       "sync_endpoint", "sync_access", "sync_bucket"] {
            assert!(!reglage_partage(secret), "« {secret} » ne doit pas voyager");
        }
    }

    #[test]
    fn lidentifiant_de_machine_reste_local() {
        // C'est lui qui départage deux écritures simultanées : le partager
        // donnerait le même identifiant aux deux machines, et le départage
        // cesserait de fonctionner au moment où il sert.
        assert!(!reglage_partage("identifiantMachine"));
        assert!(!reglage_partage("nomMachine"));
        // Les repères de synchronisation sont locaux eux aussi.
        assert!(!reglage_partage("derniereSync"));
        assert!(!reglage_partage("syncSeqEnvoyee"));
    }

    #[test]
    fn le_travail_de_lenseignant_voyage() {
        for cle in ["enseignantNom", "ecole", "anneeCourante", "typeStructure",
                    "notesRapides", "edt:mode", "edt:horaires:2025-2026",
                    "salle:profils", "tla:gabarits", "dossier:Lecture", "bureau:", "bureau:Français/Lecture",
                    "fabriquer:presentations", "matiereCouleursOverride"] {
            assert!(reglage_partage(cle), "« {cle} » devrait voyager");
        }
    }

    #[test]
    fn un_reglage_inconnu_reste_sur_place() {
        // Liste blanche : ce qu'on n'a pas nommé ne part pas. Un oubli fait
        // rester une donnée sur place ; l'inverse ferait fuiter un secret.
        assert!(!reglage_partage("nouveauReglageAjouteDemain"));
    }

    #[test]
    fn les_reglages_partages_traversent() {
        let neuve = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch("CREATE TABLE settings (cle TEXT PRIMARY KEY, valeur TEXT);").unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let a = neuve("A");
        let mut b = neuve("B");
        a.execute("INSERT INTO settings VALUES ('enseignantNom','Clément T.')", []).unwrap();
        a.execute("INSERT INTO settings VALUES ('ecole','IME Bourg-la-Reine')", []).unwrap();
        a.execute("INSERT INTO settings VALUES ('mistralApiKey','SECRET')", []).unwrap();
        a.execute("INSERT INTO settings VALUES ('identifiantMachine','uuid-de-A')", []).unwrap();
        a.execute("INSERT INTO settings VALUES ('dossier:Français/Lecture','green')", []).unwrap();

        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        let cles: Vec<&str> = de_a.iter().map(|c| c.ligne_id.as_str()).collect();
        assert!(cles.contains(&"enseignantNom") && cles.contains(&"ecole"));
        assert!(cles.contains(&"dossier:Français/Lecture"), "la couleur d'un dossier ne voyage pas : {cles:?}");
        assert!(!cles.contains(&"mistralApiKey"), "la clé API est dans le journal : {cles:?}");
        assert!(!cles.contains(&"identifiantMachine"), "l'identifiant de machine voyage : {cles:?}");

        appliquer(&mut b, &de_a).unwrap();
        let nom: String = b.query_row("SELECT valeur FROM settings WHERE cle='enseignantNom'", [], |r| r.get(0)).unwrap();
        assert_eq!(nom, "Clément T.");
        let secret: Option<String> = b.query_row("SELECT valeur FROM settings WHERE cle='mistralApiKey'", [], |r| r.get(0)).ok();
        assert!(secret.is_none(), "la clé API a traversé");
    }

    #[test]
    fn un_secret_force_de_lexterieur_est_refuse() {
        // Une machine mal réglée, ou une version plus ancienne, ne doit pas
        // pouvoir nous imposer une clé que nous tenons pour un secret.
        let mut b = Connection::open_in_memory().unwrap();
        b.execute_batch("CREATE TABLE settings (cle TEXT PRIMARY KEY, valeur TEXT);").unwrap();
        creer_table(&b);
        poser_declencheurs(&b, "B");
        let intrus = Changement {
            table_nom: "settings".into(), ligne_id: "mistralApiKey".into(),
            operation: "maj".into(),
            donnees: r#"{"cle":"mistralApiKey","valeur":"VOLEE"}"#.into(),
            avant: String::new(), horodatage: "2030-01-01T00:00:00.000Z".into(),
            origine: "X".into(), textes: Default::default(),
        };
        assert_eq!(appliquer(&mut b, &[intrus]).unwrap(), 0);
        let n: i64 = b.query_row("SELECT COUNT(*) FROM settings", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 0);
    }

    /// Deux machines qui connaissent la table des outils, avec les réglages.
    fn machine_avec_outils(nom: &str) -> Connection {
        let c = machine_nommee(nom);
        c.execute_batch(
            "CREATE TABLE settings (cle TEXT PRIMARY KEY, valeur TEXT);
             CREATE TABLE outils_classe (id TEXT PRIMARY KEY, genre TEXT NOT NULL DEFAULT 'outil', titre TEXT NOT NULL DEFAULT '');",
        )
        .unwrap();
        poser_declencheurs(&c, nom);
        c
    }

    fn titres_outils(c: &Connection) -> Vec<String> {
        let mut st = c.prepare("SELECT titre FROM outils_classe ORDER BY titre").unwrap();
        st.query_map([], |r| r.get(0)).unwrap().flatten().collect()
    }

    /// Le défaut évité : un ordinateur pas encore à jour jetait les outils
    /// créés sur l'autre, et ne les revoyait jamais après sa mise à jour.
    #[test]
    fn une_table_recente_est_annoncee_quand_l_autre_ordinateur_la_connait() {
        let a = machine_avec_outils("A");
        let mut b = machine_avec_outils("B");
        a.execute("INSERT INTO outils_classe (id, titre) VALUES ('o1', 'Bande numérique')", []).unwrap();
        a.execute("INSERT INTO outils_classe (id, titre) VALUES ('o2', 'Casque anti-bruit')", []).unwrap();
        // B était encore à l'ancienne version : il n'a rien gardé de ces envois.
        let (envoyes, repere) = changements_locaux(&a, 0).unwrap();
        assert_eq!(envoyes.len(), 2);

        // Tant que B ne connaît pas la table, rien n'est annoncé.
        let ancien = vec![("B".to_string(), vec!["eleves".to_string()])];
        assert_eq!(annoncer_tables(&a, "A", &ancien), 0);

        // B est à jour : A annonce ses lignes, une seule fois.
        let a_jour = vec![("B".to_string(), vec!["eleves".to_string(), "outils_classe".to_string()])];
        assert_eq!(annoncer_tables(&a, "A", &a_jour), 2);
        assert_eq!(annoncer_tables(&a, "A", &a_jour), 0);
        let (annonces, _) = changements_locaux(&a, repere).unwrap();
        assert!(annonces.iter().all(|c| c.operation == "annonce"));

        // B avait entre-temps supprimé o2 ? Il n'est pas ressuscité. Et un
        // outil déjà là n'est pas écrasé.
        b.execute("INSERT INTO outils_classe (id, titre) VALUES ('o2', 'x')", []).unwrap();
        b.execute("DELETE FROM outils_classe WHERE id = 'o2'", []).unwrap();
        b.execute("INSERT INTO outils_classe (id, titre) VALUES ('o1', 'Bande numérique jusqu''à 30')", []).unwrap();
        appliquer(&mut b, &annonces).unwrap();
        assert_eq!(titres_outils(&b), vec!["Bande numérique jusqu'à 30"]);

        // Sur une machine vierge, tout arrive.
        let mut c = machine_avec_outils("C");
        appliquer(&mut c, &annonces).unwrap();
        assert_eq!(titres_outils(&c), vec!["Bande numérique", "Casque anti-bruit"]);
    }

    /// Une annonce ne compte pas comme une modification : une retouche faite
    /// sur l'autre ordinateur, même datée d'avant l'annonce, n'est pas rejetée.
    #[test]
    fn les_reglages_de_rangement_sont_annonces_quand_l_autre_ordinateur_les_connait() {
        let a = machine_avec_outils("A");
        let mut b = machine_avec_outils("B");
        poser_declencheurs(&b, "B");
        a.execute("INSERT INTO settings (cle, valeur) VALUES ('rangement:jeux:dossier:Maths', 'aucune')", []).unwrap();
        a.execute("INSERT INTO settings (cle, valeur) VALUES ('rangement:jeux:place:', '{\"j:1\":[0,0]}')", []).unwrap();
        a.execute("INSERT INTO settings (cle, valeur) VALUES ('mistralApiKey', 'secret')", []).unwrap();
        let (_, repere) = changements_locaux(&a, 0).unwrap();
        // Une version sans le marqueur n'en reçoit rien.
        assert_eq!(annoncer_tables(&a, "A", &[("B".to_string(), vec!["outils_classe".to_string()])]), 0);
        let a_jour = vec![("B".to_string(), tables_connues())];
        assert_eq!(annoncer_tables(&a, "A", &a_jour), 2, "les deux réglages de rangement, pas le secret");
        assert_eq!(annoncer_tables(&a, "A", &a_jour), 0);
        // B a déjà choisi une couleur pour « Maths » : elle reste.
        b.execute("INSERT INTO settings (cle, valeur) VALUES ('rangement:jeux:dossier:Maths', '#ff0000')", []).unwrap();
        let (annonces, _) = changements_locaux(&a, repere).unwrap();
        appliquer(&mut b, &annonces).unwrap();
        let lire = |c: &Connection, cle: &str| c.query_row("SELECT valeur FROM settings WHERE cle = ?1", params![cle], |r| r.get::<_, String>(0)).ok();
        assert_eq!(lire(&b, "rangement:jeux:dossier:Maths").as_deref(), Some("#ff0000"));
        assert_eq!(lire(&b, "rangement:jeux:place:").as_deref(), Some("{\"j:1\":[0,0]}"));
        assert_eq!(lire(&b, "mistralApiKey"), None);
    }

    #[test]
    fn une_annonce_ne_l_emporte_pas_sur_une_retouche() {
        let mut a = machine_avec_outils("A");
        let mut b = machine_avec_outils("B");
        a.execute("INSERT INTO outils_classe (id, titre) VALUES ('o1', 'Bande numérique')", []).unwrap();
        let (creation, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &creation).unwrap();
        b.execute("UPDATE outils_classe SET titre = 'Bande numérique jusqu''à 30' WHERE id = 'o1'", []).unwrap();
        let (de_b, _) = changements_locaux(&b, 0).unwrap();
        // A annonce ensuite ses lignes, bien après la retouche de B.
        assert_eq!(annoncer_tables(&a, "A", &[("B".to_string(), vec!["outils_classe".to_string()])]), 1);
        a.execute("UPDATE changements SET horodatage = '2099-01-01T00:00:00.000Z' WHERE operation = 'annonce'", []).unwrap();
        appliquer(&mut a, &de_b).unwrap();
        assert_eq!(titres_outils(&a), vec!["Bande numérique jusqu'à 30"]);
    }

    #[test]
    fn un_changement_dune_table_inconnue_est_ignore() {
        let mut b = machine();
        let intrus = Changement {
            table_nom: "settings".into(),
            ligne_id: "mistralApiKey".into(),
            operation: "maj".into(),
            donnees: "{}".into(),
            horodatage: "2030-01-01T00:00:00.000Z".into(),
            origine: "Z".into(),
            avant: String::new(),
            textes: Default::default(),
        };
        assert_eq!(appliquer(&mut b, &[intrus]).unwrap(), 0);
    }

    #[test]
    fn le_repere_avance_meme_sans_rien_a_envoyer() {
        let a = machine();
        let mut b = machine();
        ajouter(&a, "e1", "Quang");
        let (de_a, _) = changements_locaux(&a, 0).unwrap();
        appliquer(&mut b, &de_a).unwrap();
        let (rien, repere) = changements_locaux(&b, 0).unwrap();
        assert!(rien.is_empty());
        assert!(repere > 0, "le repère doit dépasser les lignes distantes");
    }

    /// Le défaut réel : une restauration avait copié le repère d'envoi d'une
    /// base plus longue. Plus rien de ce qui s'écrivait ici ne partait.
    #[test]
    fn un_repere_venu_dune_autre_base_ne_bloque_plus_lenvoi() {
        let c = machine();
        ajouter(&c, "e1", "Quang");
        // La restauration : ses écritures sont marquées distantes.
        let avant = dernier_seq(&c);
        ajouter(&c, "e2", "Lina");
        marquer_distants(&c, avant);
        // Du travail neuf après la restauration.
        ajouter(&c, "e3", "Apolline");

        assert_eq!(repere_envoi(&c, 1), 1, "un repère valable ne bouge pas");
        let repere = repere_envoi(&c, 3003);
        let (a_envoyer, _) = changements_locaux(&c, repere).unwrap();
        assert_eq!(a_envoyer.len(), 1, "seul le travail d'après la restauration part : {a_envoyer:?}");
        assert!(a_envoyer[0].donnees.contains("Apolline"));
    }

    /// Des dossiers créés pendant que les deux postes se confondaient ne sont
    /// jamais passés : ils sont annoncés une fois, sans rien écraser là-bas.
    #[test]
    fn les_dossiers_dici_sont_annonces_une_fois_sans_rien_ecraser() {
        let neuve = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch("CREATE TABLE settings (cle TEXT PRIMARY KEY, valeur TEXT);").unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let valeur = |c: &Connection, cle: &str| -> Option<String> {
            c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [cle], |r| r.get(0)).ok()
        };
        let a = neuve("A");
        let mut b = neuve("B");
        a.execute_batch("INSERT INTO settings VALUES ('dossier:Évaluations','aucune'), ('dossier:Lecture','green'), ('dossier:Sons','aucune');").unwrap();
        b.execute_batch("INSERT INTO settings VALUES ('dossier:Lecture','red'), ('dossier:Sons','');").unwrap();
        // Déjà « envoyés » du temps où rien ne passait.
        let (_, repere) = changements_locaux(&a, 0).unwrap();

        annoncer_dossiers(&a, "A");
        let (annonces, repere2) = changements_locaux(&a, repere).unwrap();
        assert_eq!(annonces.len(), 3);
        assert!(annonces.iter().all(|c| c.operation == "annonce"));
        appliquer(&mut b, &annonces).unwrap();

        assert_eq!(valeur(&b, "dossier:Évaluations").as_deref(), Some("aucune"), "le dossier manquant arrive");
        assert_eq!(valeur(&b, "dossier:Lecture").as_deref(), Some("red"), "la couleur choisie là-bas reste");
        assert_eq!(valeur(&b, "dossier:Sons").as_deref(), Some(""), "un dossier supprimé là-bas ne revient pas");

        annoncer_dossiers(&a, "A");
        assert!(changements_locaux(&a, repere2).unwrap().0.is_empty(), "une seule annonce");
        assert!(!reglage_partage(CLE_DOSSIERS_ANNONCES), "le repère reste propre au poste");
    }

    #[test]
    fn elaguer_vide_ce_qui_a_deja_voyage() {
        let c = machine();
        ajouter(&c, "e1", "Quang");
        ajouter(&c, "e2", "Lina");
        let (_, repere) = changements_locaux(&c, 0).unwrap();
        elaguer(&c, repere);
        assert_eq!(changements_locaux(&c, 0).unwrap().0.len(), 0);
        assert_eq!(noms(&c).len(), 2, "élaguer le journal ne touche pas aux données");
    }

    /// Une base créée par une version antérieure — sans les colonnes ajoutées
    /// depuis — doit rester inscriptible. Le défaut réel : les déclencheurs
    /// citaient `avant`, la table ne l'avait pas, et plus aucune écriture ne
    /// passait nulle part dans l'application.
    #[test]
    fn une_base_ancienne_reste_inscriptible() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE eleves (id TEXT PRIMARY KEY, nom TEXT, niveau TEXT);
             CREATE TABLE changements (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                table_nom TEXT NOT NULL,
                ligne_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                horodatage TEXT NOT NULL
             );",
        )
        .unwrap();

        creer_table(&c);
        poser_declencheurs(&c, "machine-1");

        c.execute("INSERT INTO eleves (id, nom, niveau) VALUES ('e1', 'Lina', 'CP')", [])
            .expect("l'écriture doit passer sur une base ancienne");

        let n: i64 = c
            .query_row("SELECT count(*) FROM changements WHERE table_nom = 'eleves'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1, "le changement doit être journalisé");
    }
}
