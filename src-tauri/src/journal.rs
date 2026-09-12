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
    "jeux",
];

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
    /// Horodatage UTC à la milliseconde.
    pub horodatage: String,
    /// Machine d'origine. Départage les horodatages identiques.
    #[serde(default)]
    pub origine: String,
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
        "CREATE TABLE IF NOT EXISTS changements (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            table_nom TEXT NOT NULL,
            ligne_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            donnees TEXT NOT NULL DEFAULT '',
            horodatage TEXT NOT NULL,
            origine TEXT NOT NULL DEFAULT '',
            distant INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_changements_ligne
            ON changements(table_nom, ligne_id);",
    )
    .ok();
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
        let maj = format!(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, horodatage, origine)
             VALUES ('{table}', NEW.id, 'maj', json_object({}), strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');",
            objet("NEW")
        );
        let suppr = format!(
            "INSERT INTO changements (table_nom, ligne_id, operation, donnees, horodatage, origine)
             VALUES ('{table}', OLD.id, 'suppr', '', strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{machine}');"
        );
        let sql = format!(
            "DROP TRIGGER IF EXISTS jrn_{table}_i;
             DROP TRIGGER IF EXISTS jrn_{table}_u;
             DROP TRIGGER IF EXISTS jrn_{table}_d;
             CREATE TRIGGER jrn_{table}_i AFTER INSERT ON {table} BEGIN {maj} END;
             CREATE TRIGGER jrn_{table}_u AFTER UPDATE ON {table} BEGIN {maj} END;
             CREATE TRIGGER jrn_{table}_d AFTER DELETE ON {table} BEGIN {suppr} END;"
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
        "SELECT table_nom, ligne_id, operation, donnees, horodatage, origine
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
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    // Le repère avance jusqu'au bout du journal, y compris sur les lignes
    // distantes écartées : sinon on les relirait à chaque envoi.
    Ok((lignes, dernier_seq(conn).max(depuis)))
}

/// Applique des changements venus d'ailleurs.
///
/// Règle : la plus récente écriture gagne, **ligne par ligne**. Deux machines
/// qui touchent deux élèves différents gardent chacune son travail ; deux
/// machines qui touchent le même élève laissent gagner la dernière. C'est le
/// socle sur lequel une fusion plus fine — champ par champ, puis caractère par
/// caractère — viendra s'appuyer.
pub fn appliquer(conn: &mut Connection, recus: &[Changement]) -> rusqlite::Result<usize> {
    let avant = dernier_seq(conn);
    let tx = conn.transaction()?;
    let mut n = 0;
    for c in recus {
        // Table inconnue : on ignore plutôt que d'écrire au hasard.
        if !TABLES_SYNC.contains(&c.table_nom.as_str()) {
            continue;
        }
        // Une écriture locale qui l'emporte fait ignorer le changement reçu.
        let local: Option<(String, String)> = tx
            .query_row(
                "SELECT horodatage, origine FROM changements
                  WHERE table_nom = ?1 AND ligne_id = ?2
                  ORDER BY horodatage DESC, origine DESC LIMIT 1",
                params![c.table_nom, c.ligne_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        if local.is_some_and(|(h, o)| gagne((&h, &o), (&c.horodatage, &c.origine))) {
            continue;
        }

        if c.operation == "suppr" {
            tx.execute(
                &format!("DELETE FROM {} WHERE id = ?1", c.table_nom),
                params![c.ligne_id],
            )?;
        } else {
            let cols = colonnes(&tx, &c.table_nom);
            if cols.is_empty() {
                continue;
            }
            let noms = cols.iter().map(|x| format!("\"{x}\"")).collect::<Vec<_>>().join(", ");
            let valeurs = cols
                .iter()
                .map(|x| format!("json_extract(?1, '$.{x}')"))
                .collect::<Vec<_>>()
                .join(", ");
            tx.execute(
                &format!("INSERT OR REPLACE INTO {} ({noms}) VALUES ({valeurs})", c.table_nom),
                params![c.donnees],
            )?;
        }
        n += 1;
    }
    tx.commit()?;
    // Les déclencheurs viennent d'enregistrer nos écritures : elles sont
    // d'origine distante et ne doivent pas repartir d'où elles viennent.
    marquer_distants(conn, avant);
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
}
