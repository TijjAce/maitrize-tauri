//! Revenir à un état passé de l'application.
//!
//! L'enseignant veut « revenir à un état précis de l'application avec tout
//! ce qu'il existait à ce moment », et que rien ne puisse se perdre (octobre
//! 2026). Les instantanés de chaque heure (voir instantanes.rs) et les copies
//! d'avant une mise à jour ou d'avant une opération sont ces états.
//!
//! Revenir à l'une ne remplace pas la base : chaque table reprend ses lignes
//! d'alors par des écritures ordinaires. Le journal les voit, l'autre
//! ordinateur les reçoit et suit le même retour, au lieu de réécrire le
//! présent par-dessus. Une copie de l'état présent, prise juste avant, permet
//! d'annuler, de la même façon. Les fichiers joints effacés depuis reviennent
//! de la corbeille.

use crate::db::{sauvegardes_dir, Db};
use crate::instantanes::BaseOuverte;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::collections::BTreeSet;
use std::path::Path;
use tauri::State;

type R<T> = Result<T, String>;

/// Un état passé : une copie de la base, sa date et ce qui l'a fait naître.
#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EtatPasse {
    pub nom: String,
    /// « AAAA-MM-JJ » ou « AAAA-MM-JJTHH:MM:SS ».
    pub date: String,
    /// « jour » (au premier lancement de la journée), ou le motif : « avant-v1.6.33 », « avant-import », « avant-retour »…
    pub motif: String,
    pub octets: u64,
}

/// Ce qui changerait dans une table en revenant à un état.
#[derive(Serialize, Debug, Clone, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Ecart {
    pub table: String,
    /// Les lignes supprimées depuis, qui reviendraient.
    pub revenues: usize,
    /// Les lignes créées depuis, qui s'en iraient.
    pub parties: usize,
    /// Les lignes modifiées depuis, qui reprendraient leurs valeurs d'alors.
    pub changees: usize,
    /// Quelques titres ou noms de chaque sorte, pour s'y reconnaître.
    pub exemples_revenues: Vec<String>,
    pub exemples_parties: Vec<String>,
    pub exemples_changees: Vec<String>,
}

/// Ce qu'un retour a fait.
#[derive(Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BilanRetour {
    /// La copie de l'état d'avant le retour : y revenir l'annule.
    pub copie: String,
    pub ecarts: Vec<Ecart>,
    /// Fichiers joints revenus de la corbeille.
    pub fichiers: usize,
}

/// Lit le nom d'un état : « maitrize-2026-10-20.sqlite3 », « maitrize-2026-10-20-avant-import-101500.sqlite3 »
/// ou, compressé, « maitrize-2026-10-20-auto-140500.sqlite3.zip ».
pub fn lire_nom(nom: &str) -> Option<(String, String)> {
    let coeur = nom.strip_prefix("maitrize-")?;
    let coeur = coeur.strip_suffix(".sqlite3.zip").or_else(|| coeur.strip_suffix(".sqlite3"))?;
    let jour = coeur.get(..10)?;
    if !jour.chars().enumerate().all(|(i, c)| if i == 4 || i == 7 { c == '-' } else { c.is_ascii_digit() }) {
        return None;
    }
    let reste = coeur.get(10..)?;
    if reste.is_empty() {
        return Some((jour.to_string(), "jour".into()));
    }
    let reste = reste.strip_prefix('-')?;
    let (motif, heure) = reste.rsplit_once('-')?;
    if heure.len() != 6 || !heure.chars().all(|c| c.is_ascii_digit()) || motif.is_empty() {
        return None;
    }
    Some((format!("{jour}T{}:{}:{}", &heure[0..2], &heure[2..4], &heure[4..6]), motif.to_string()))
}

/// Les états passés rangés dans `dossier`, du plus récent au plus ancien.
pub fn etats_dans(dossier: &Path) -> Vec<EtatPasse> {
    let Ok(entrees) = std::fs::read_dir(dossier) else { return vec![] };
    let mut v: Vec<EtatPasse> = entrees.flatten().filter_map(|e| {
        let nom = e.file_name().to_string_lossy().to_string();
        let (date, motif) = lire_nom(&nom)?;
        Some(EtatPasse { nom, date, motif, octets: e.metadata().map(|m| m.len()).unwrap_or(0) })
    }).collect();
    v.sort_by(|a, b| b.date.cmp(&a.date).then_with(|| b.nom.cmp(&a.nom)));
    v
}

/// Une colonne : son nom, et ce qu'il faut y mettre quand l'état passé ne l'a pas.
struct Colonne {
    nom: String,
    /// Valeur neutre exigée (NOT NULL sans défaut), sinon rien : la valeur par défaut s'applique.
    neutre: Option<&'static str>,
}

fn colonnes(c: &Connection, schema: &str, table: &str) -> Vec<Colonne> {
    let Ok(mut st) = c.prepare(&format!("PRAGMA {schema}.table_info(\"{table}\")")) else { return vec![] };
    st.query_map([], |r| {
        let nom: String = r.get(1)?;
        let declare = r.get::<_, String>(2).unwrap_or_default().to_uppercase();
        let obligatoire = r.get::<_, i64>(3).unwrap_or(0) != 0;
        let defaut = r.get::<_, Option<String>>(4).unwrap_or(None).is_some();
        let neutre = (obligatoire && !defaut).then_some(if declare.contains("INT") || declare.contains("REAL") { "0" } else { "''" });
        Ok(Colonne { nom, neutre })
    })
    .map(|it| it.flatten().collect())
    .unwrap_or_default()
}

/// Une table que le retour reprend, et la part qu'il en reprend.
struct Reprise {
    table: String,
    /// La colonne qui doit valoir 0 pour qu'une ligne soit reprise : rien, toute la table.
    seulement: Option<&'static str>,
}

impl Reprise {
    /// La condition SQL de la part reprise, sur l'alias `a` (vide : la table de la requête).
    fn part(&self, a: &str) -> String {
        match self.seulement {
            None => "1".into(),
            Some(col) if a.is_empty() => format!("\"{col}\" = 0"),
            Some(col) => format!("{a}.\"{col}\" = 0"),
        }
    }
}

/// Les tables que le retour reprend : celles qui voyagent d'un ordinateur à
/// l'autre et ont un identifiant (une liaison n'en a pas : voir plus bas), et
/// les référentiels ajoutés par l'enseignant — ceux de l'application se
/// reposent d'eux-mêmes à chaque démarrage.
fn tables(c: &Connection) -> Vec<Reprise> {
    crate::journal::TABLES_SYNC.iter()
        .map(|t| Reprise { table: t.to_string(), seulement: None })
        .chain([Reprise { table: "referentiels".into(), seulement: Some("est_integre") }])
        .filter(|r| colonnes(c, "main", &r.table).iter().any(|x| x.nom == "id"))
        .collect()
}

/// Les liaisons, sans identifiant : un atelier rangé dans un espace. Elles existent ou non.
const LIAISONS: &[(&str, &str, &str)] = &[("atelier_espace", "atelier_id", "espace_id")];

fn compte(c: &Connection, sql: &str) -> rusqlite::Result<usize> {
    c.query_row(sql, [], |r| r.get::<_, i64>(0)).map(|n| n as usize)
}

/// Ce qui nomme une ligne de `table` dans le schéma `schema`, en SQL : son
/// titre, son nom… Rien si la table n'a rien de tel.
fn libelle(c: &Connection, schema: &str, table: &str, alias: &str) -> Option<String> {
    let cols: BTreeSet<String> = colonnes(c, schema, table).into_iter().map(|x| x.nom).collect();
    if table == "creneaux" && cols.contains("date") && cols.contains("matiere") {
        return Some(format!("substr({alias}.date, 1, 10) || ' · ' || {alias}.matiere"));
    }
    ["titre", "nom", "intitule", "label", "matiere"].iter()
        .find(|x| cols.contains(**x))
        .map(|x| format!("{alias}.\"{x}\""))
}

/// Au plus trois libellés non vides, rendus par `sql`.
fn exemples(c: &Connection, sql: &str) -> Vec<String> {
    let Ok(mut st) = c.prepare(sql) else { return vec![] };
    st.query_map([], |r| r.get::<_, Option<String>>(0))
        .map(|it| it.flatten().flatten().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).take(3).collect())
        .unwrap_or_default()
}

/// L'égalité des colonnes communes d'une ligne d'ici (`m`) et d'alors (`i`).
fn differe(communes: &[String]) -> String {
    let conditions: Vec<String> = communes.iter().filter(|c| *c != "id")
        .map(|c| format!("i.\"{c}\" IS NOT m.\"{c}\"")).collect();
    if conditions.is_empty() { "0".into() } else { conditions.join(" OR ") }
}

/// Le travail gardé dans des réglages qui ne voyagent pas d'un ordinateur à l'autre, mais fait partie de l'état de
/// l'application : les manuels importés, « Mes générateurs », les motifs du coloriage magique, les pages de garde,
/// le projet pédagogique, l'ordre des tableaux de la progression, l'échelle d'impression d'un matériel, les périodes
/// choisies des séquences toutes faites.
const REGLAGES_DU_TRAVAIL: &[&str] = &[
    "manuel:", "manuels:", "generateurs:", "coloriage:", "garde:", "projetPedagogique:", "ordreDesTableaux:", "impression:",
    "sequencesToutesFaites:",
];

/// Un réglage que le retour reprend : ceux qui voyagent, et le travail gardé sur ce poste. Ceux du poste lui-même,
/// les secrets, les repères et les caches restent.
fn repris(cle: &str) -> bool {
    crate::journal::reglage_partage(cle)
        || (REGLAGES_DU_TRAVAIL.iter().any(|p| cle.starts_with(p)) && !crate::journal::reglage_secret(cle))
}

/// Les réglages qui font partie de l'état de l'application.
fn reglages(c: &Connection, schema: &str) -> Vec<(String, String)> {
    let Ok(mut st) = c.prepare(&format!("SELECT cle, valeur FROM {schema}.settings")) else { return vec![] };
    st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?.unwrap_or_default())))
        .map(|it| it.flatten().filter(|(k, _)| repris(k)).collect())
        .unwrap_or_default()
}

fn existe(c: &Connection, schema: &str, table: &str) -> bool {
    compte(c, &format!("SELECT COUNT(*) FROM {schema}.sqlite_master WHERE type = 'table' AND name = '{table}'")).unwrap_or(0) > 0
}

/// Ce qui changerait, table par table, en revenant à l'état attaché sous le nom `instantane`.
pub fn ecarts(c: &Connection) -> rusqlite::Result<Vec<Ecart>> {
    let mut v = Vec::new();
    for r in tables(c) {
        let t = &r.table;
        let (pm, pi) = (r.part("m"), r.part("i"));
        let ici = libelle(c, "main", t, "m");
        let e = if !existe(c, "instantane", t) {
            Ecart {
                table: t.clone(),
                parties: compte(c, &format!("SELECT COUNT(*) FROM main.\"{t}\" m WHERE {pm}"))?,
                exemples_parties: ici.as_ref().map(|l| exemples(c, &format!("SELECT {l} FROM main.\"{t}\" m WHERE {pm}"))).unwrap_or_default(),
                ..Default::default()
            }
        } else {
            let alors: BTreeSet<String> = colonnes(c, "instantane", t).into_iter().map(|x| x.nom).collect();
            let communes: Vec<String> = colonnes(c, "main", t).into_iter().map(|x| x.nom).filter(|n| alors.contains(n)).collect();
            let revenues = format!("FROM instantane.\"{t}\" i WHERE {pi} AND i.id NOT IN (SELECT id FROM main.\"{t}\")");
            let parties = format!("FROM main.\"{t}\" m WHERE {pm} AND m.id NOT IN (SELECT id FROM instantane.\"{t}\")");
            let changees = format!("FROM main.\"{t}\" m JOIN instantane.\"{t}\" i ON i.id = m.id WHERE {pm} AND ({})", differe(&communes));
            let d_alors = libelle(c, "instantane", t, "i");
            Ecart {
                table: t.clone(),
                revenues: compte(c, &format!("SELECT COUNT(*) {revenues}"))?,
                parties: compte(c, &format!("SELECT COUNT(*) {parties}"))?,
                changees: compte(c, &format!("SELECT COUNT(*) {changees}"))?,
                exemples_revenues: d_alors.map(|l| exemples(c, &format!("SELECT {l} {revenues}"))).unwrap_or_default(),
                exemples_parties: ici.as_ref().map(|l| exemples(c, &format!("SELECT {l} {parties}"))).unwrap_or_default(),
                exemples_changees: ici.as_ref().map(|l| exemples(c, &format!("SELECT {l} {changees}"))).unwrap_or_default(),
            }
        };
        if e.revenues + e.parties + e.changees > 0 {
            v.push(e);
        }
    }
    for (t, a, b) in LIAISONS {
        if !existe(c, "main", t) || !existe(c, "instantane", t) {
            continue;
        }
        let e = Ecart {
            table: t.to_string(),
            revenues: compte(c, &format!("SELECT COUNT(*) FROM instantane.{t} WHERE ({a}, {b}) NOT IN (SELECT {a}, {b} FROM main.{t})"))?,
            parties: compte(c, &format!("SELECT COUNT(*) FROM main.{t} WHERE ({a}, {b}) NOT IN (SELECT {a}, {b} FROM instantane.{t})"))?,
            ..Default::default()
        };
        if e.revenues + e.parties > 0 {
            v.push(e);
        }
    }
    let (ici, alors) = (reglages(c, "main"), reglages(c, "instantane"));
    let r = Ecart {
        table: "settings".into(),
        revenues: alors.iter().filter(|(k, _)| !ici.iter().any(|(x, _)| x == k)).count(),
        parties: ici.iter().filter(|(k, _)| !alors.iter().any(|(x, _)| x == k)).count(),
        changees: alors.iter().filter(|(k, v)| ici.iter().any(|(x, w)| x == k && w != v)).count(),
        ..Default::default()
    };
    if r.revenues + r.parties + r.changees > 0 {
        v.push(r);
    }
    Ok(v)
}

/// Reprend, table par table, les lignes de l'état attaché sous le nom `instantane`.
///
/// À appeler dans une transaction, clés étrangères différées : un enfant peut
/// revenir avant son parent. Les mises à jour, et non des remplacements :
/// remplacer une ligne la supprime, et la suppression emporte en cascade ce
/// qui en dépend.
pub fn revenir(c: &Connection) -> rusqlite::Result<Vec<Ecart>> {
    let avant = ecarts(c)?;
    for r in tables(c) {
        let t = &r.table;
        let (p, pm, pi) = (r.part(""), r.part("m"), r.part("i"));
        if !existe(c, "instantane", t) {
            c.execute(&format!("DELETE FROM main.\"{t}\" WHERE {p}"), [])?;
            continue;
        }
        let alors: BTreeSet<String> = colonnes(c, "instantane", t).into_iter().map(|x| x.nom).collect();
        let ici = colonnes(c, "main", t);
        let communes: Vec<String> = ici.iter().map(|x| x.nom.clone()).filter(|n| alors.contains(n)).collect();
        // Ce qui n'existait pas alors s'en va.
        c.execute(&format!("DELETE FROM main.\"{t}\" WHERE {p} AND id NOT IN (SELECT id FROM instantane.\"{t}\")"), [])?;
        // Ce qui a été changé depuis reprend ses valeurs d'alors.
        let autres: Vec<&String> = communes.iter().filter(|x| *x != "id").collect();
        if !autres.is_empty() {
            let cibles = autres.iter().map(|x| format!("\"{x}\"")).collect::<Vec<_>>().join(", ");
            let sources = autres.iter().map(|x| format!("i.\"{x}\"")).collect::<Vec<_>>().join(", ");
            c.execute(&format!(
                "UPDATE main.\"{t}\" AS m SET ({cibles}) = (SELECT {sources} FROM instantane.\"{t}\" i WHERE i.id = m.id)
                  WHERE {pm} AND EXISTS (SELECT 1 FROM instantane.\"{t}\" i WHERE i.id = m.id AND ({}))", differe(&communes)), [])?;
        }
        // Ce qui a été supprimé depuis revient ; une colonne apparue depuis prend sa valeur neutre.
        let noms: Vec<String> = ici.iter().filter(|x| alors.contains(&x.nom) || x.neutre.is_some()).map(|x| format!("\"{}\"", x.nom)).collect();
        let valeurs: Vec<String> = ici.iter().filter(|x| alors.contains(&x.nom) || x.neutre.is_some())
            .map(|x| if alors.contains(&x.nom) { format!("i.\"{}\"", x.nom) } else { x.neutre.unwrap_or("''").to_string() }).collect();
        c.execute(&format!(
            "INSERT INTO main.\"{t}\" ({}) SELECT {} FROM instantane.\"{t}\" i WHERE {pi} AND i.id NOT IN (SELECT id FROM main.\"{t}\")",
            noms.join(", "), valeurs.join(", ")), [])?;
    }
    // Les liaisons (un atelier dans un espace) : elles existent ou non.
    for (t, a, b) in LIAISONS {
        if !existe(c, "main", t) || !existe(c, "instantane", t) {
            continue;
        }
        c.execute(&format!("DELETE FROM main.{t} WHERE ({a}, {b}) NOT IN (SELECT {a}, {b} FROM instantane.{t})"), [])?;
        c.execute(&format!("INSERT OR IGNORE INTO main.{t} ({a}, {b}) SELECT {a}, {b} FROM instantane.{t}"), [])?;
    }
    // Les réglages du travail ; ceux de ce poste et les secrets restent. Un réglage partagé qui s'en va part aussi
    // de l'autre ordinateur (le journal note sa suppression).
    let (ici, alors) = (reglages(c, "main"), reglages(c, "instantane"));
    for (k, _) in ici.iter().filter(|(k, _)| !alors.iter().any(|(x, _)| x == k)) {
        c.execute("DELETE FROM main.settings WHERE cle = ?1", params![k])?;
    }
    for (k, v) in alors.iter().filter(|(k, v)| !ici.iter().any(|(x, w)| x == k && w == v)) {
        c.execute("INSERT INTO main.settings (cle, valeur) VALUES (?1, ?2) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur", params![k, v])?;
    }
    Ok(avant)
}

/// Les fichiers de la corbeille que la base cite de nouveau : ils reviennent.
fn ramener_les_fichiers(c: &Connection, corbeille: &Path, fichiers: &Path) -> usize {
    let Ok(entrees) = std::fs::read_dir(corbeille) else { return 0 };
    let noms: Vec<String> = entrees.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect();
    if noms.is_empty() {
        return 0;
    }
    // Les noms des fichiers joints sont uniques (un identifiant) : les chercher dans le texte de la base suffit —
    // ses tables, et ses réglages, qui en citent aussi (la banque de gestes, les pages des manuels).
    let mut texte = String::new();
    for t in tables(c).into_iter().map(|r| r.table).chain(["settings".to_string()]) {
        let cols = colonnes(c, "main", &t);
        if cols.is_empty() {
            continue;
        }
        let liste = cols.iter().map(|x| format!("COALESCE(CAST(\"{}\" AS TEXT), '')", x.nom)).collect::<Vec<_>>().join(" || ' ' || ");
        if let Ok(mut st) = c.prepare(&format!("SELECT {liste} FROM main.\"{t}\"")) {
            if let Ok(lignes) = st.query_map([], |r| r.get::<_, String>(0)) {
                for l in lignes.flatten() {
                    texte.push_str(&l);
                    texte.push('\n');
                }
            }
        }
    }
    noms.iter().filter(|n| texte.contains(n.as_str()) && crate::db::ramener_dans(c, n, corbeille, fichiers)).count()
}

/// Revient à l'état contenu dans le fichier `copie` : attache, reprend, détache.
pub(crate) fn revenir_a(c: &Connection, copie: &Path, corbeille: &Path, fichiers: &Path) -> Result<(Vec<Ecart>, usize), String> {
    c.execute("ATTACH DATABASE ?1 AS instantane", params![copie.to_string_lossy()]).map_err(|e| format!("État illisible : {e}"))?;
    let fait = (|| -> rusqlite::Result<Vec<Ecart>> {
        c.execute_batch("BEGIN IMMEDIATE; PRAGMA defer_foreign_keys = ON;")?;
        let fait = revenir(c).and_then(|e| c.execute_batch("COMMIT").map(|_| e));
        if fait.is_err() {
            // Un COMMIT refusé — une clé étrangère différée qui manque — laisse la transaction ouverte : toutes les
            // écritures suivantes y seraient restées, perdues en quittant.
            c.execute_batch("ROLLBACK").ok();
        }
        fait
    })();
    c.execute("DETACH DATABASE instantane", []).ok();
    let ecarts = fait.map_err(|e| format!("Retour impossible, rien n'a changé : {e}"))?;
    Ok((ecarts, ramener_les_fichiers(c, corbeille, fichiers)))
}

/// Ce qui changerait, sans rien changer.
pub(crate) fn ecarts_avec(c: &Connection, copie: &Path) -> Result<Vec<Ecart>, String> {
    c.execute("ATTACH DATABASE ?1 AS instantane", params![copie.to_string_lossy()]).map_err(|e| format!("État illisible : {e}"))?;
    let v = ecarts(c).map_err(|e| e.to_string());
    c.execute("DETACH DATABASE instantane", []).ok();
    v
}

/// L'état `nom`, prêt à être attaché : décompressé s'il le faut.
fn etat_nomme(nom: &str) -> R<BaseOuverte> {
    if lire_nom(nom).is_none() || nom.contains('/') || nom.contains('\\') {
        return Err("État inconnu.".into());
    }
    let chemin = sauvegardes_dir().join(nom);
    if !chemin.is_file() {
        return Err("Cet état n'est plus sur l'ordinateur.".into());
    }
    crate::instantanes::ouvrir(&chemin, &std::env::temp_dir())
}

#[tauri::command(async)]
pub fn retour_etats() -> Vec<EtatPasse> {
    etats_dans(&sauvegardes_dir())
}

#[tauri::command(async)]
pub fn retour_ecarts(db: State<Db>, nom: String) -> R<Vec<Ecart>> {
    let etat = etat_nomme(&nom)?;
    ecarts_avec(&db.lock(), &etat.chemin)
}

#[tauri::command(async)]
pub fn retour_revenir(db: State<Db>, nom: String) -> R<BilanRetour> {
    let etat = etat_nomme(&nom)?;
    let copie = etat.chemin.clone();
    let c = db.lock();
    // L'état présent d'abord : y revenir annule ce retour.
    let avant = crate::db::copie_de_securite(&c, "avant-retour")?;
    let (ecarts, fichiers) = revenir_a(&c, &copie, &crate::db::corbeille_dir(), &crate::db::fichiers_dir())?;
    crate::commands::diag_ecrire(format!("RETOUR à {nom} : {} table(s) reprise(s), {fichiers} fichier(s) revenu(s) ; annulable par {avant}", ecarts.len()));
    Ok(BilanRetour { copie: avant, ecarts, fichiers })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn base(chemin: &Path, machine: &str) -> Connection {
        let c = Connection::open(chemin).unwrap();
        c.pragma_update(None, "foreign_keys", "ON").unwrap();
        crate::db::migrer_pour_test(&c);
        crate::journal::creer_table(&c);
        crate::journal::poser_declencheurs(&c, machine);
        c
    }
    fn dossier() -> PathBuf {
        let d = std::env::temp_dir().join(format!("maitrize-retour-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&d).unwrap();
        d
    }
    fn titres(c: &Connection, table: &str) -> Vec<String> {
        let mut st = c.prepare(&format!("SELECT titre FROM {table} ORDER BY titre")).unwrap();
        st.query_map([], |r| r.get(0)).unwrap().flatten().collect()
    }

    #[test]
    fn lit_les_noms_des_etats() {
        assert_eq!(lire_nom("maitrize-2026-10-20.sqlite3"), Some(("2026-10-20".into(), "jour".into())));
        assert_eq!(lire_nom("maitrize-2026-10-20-avant-v1.6.33-005754.sqlite3"), Some(("2026-10-20T00:57:54".into(), "avant-v1.6.33".into())));
        assert_eq!(lire_nom("maitrize-2026-10-20-avant-retour-101500.sqlite3").map(|x| x.1), Some("avant-retour".into()));
        assert_eq!(lire_nom("maitrize-2026-10-20-auto-140500.sqlite3.zip"), Some(("2026-10-20T14:05:00".into(), "auto".into())));
        assert_eq!(lire_nom("autre.sqlite3"), None);
        assert_eq!(lire_nom("maitrize-2026-1-20.sqlite3"), None);
    }

    #[test]
    fn revenir_a_un_etat_reprend_ses_lignes_par_des_ecritures_que_le_journal_voit() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        // L'état d'alors : une séquence et sa séance, un projet.
        c.execute_batch(
            "INSERT INTO sequences (id, titre, date_creation) VALUES ('s1', 'Les nombres', '2026-10-01');
             INSERT INTO seances (id, titre, sequence_id) VALUES ('se1', 'Compter jusqu''à 5', 's1');
             INSERT INTO projets (id, titre, date_creation) VALUES ('p1', 'Le potager', '2026-10-01');
             INSERT INTO settings (cle, valeur) VALUES ('matiereCouleursOverride', '{\"EPS\":\"red\"}');",
        ).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        // Depuis : la séquence renommée, le projet supprimé, un projet ajouté.
        c.execute_batch(
            "UPDATE sequences SET titre = 'Les grands nombres' WHERE id = 's1';
             DELETE FROM projets WHERE id = 'p1';
             INSERT INTO projets (id, titre, date_creation) VALUES ('p2', 'Le cirque', '2026-10-15');
             DELETE FROM seances WHERE id = 'se1';",
        ).unwrap();
        let avant: i64 = c.query_row("SELECT COUNT(*) FROM changements", [], |r| r.get(0)).unwrap();

        let ecarts = ecarts_avec(&c, &d.join("alors.sqlite3")).unwrap();
        let de = |t: &str| ecarts.iter().find(|e| e.table == t).cloned().unwrap_or_default();
        assert_eq!((de("projets").revenues, de("projets").parties), (1, 1));
        assert_eq!(de("sequences").changees, 1);
        assert_eq!(de("seances").revenues, 1);
        assert_eq!((de("projets").exemples_revenues.clone(), de("projets").exemples_parties.clone()), (vec!["Le potager".to_string()], vec!["Le cirque".to_string()]));
        assert_eq!(de("sequences").exemples_changees, vec!["Les grands nombres".to_string()]);

        let (fait, _) = revenir_a(&c, &d.join("alors.sqlite3"), &d.join("Corbeille"), &d.join("Fichiers")).unwrap();
        assert!(!fait.is_empty());
        assert_eq!(titres(&c, "sequences"), vec!["Les nombres"]);
        assert_eq!(titres(&c, "seances"), vec!["Compter jusqu'à 5"]);
        assert_eq!(titres(&c, "projets"), vec!["Le potager"]);
        let apres: i64 = c.query_row("SELECT COUNT(*) FROM changements", [], |r| r.get(0)).unwrap();
        assert!(apres > avant, "le retour s'écrit dans le journal : l'autre ordinateur le recevra");
        // Plus rien ne diffère.
        assert!(ecarts_avec(&c, &d.join("alors.sqlite3")).unwrap().is_empty());
        std::fs::remove_dir_all(&d).ok();
    }

    #[test]
    fn un_retour_s_annule_par_la_copie_prise_juste_avant_et_ramene_les_fichiers() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        let (corbeille, fichiers) = (d.join("Corbeille"), d.join("Fichiers"));
        std::fs::create_dir_all(&corbeille).unwrap();
        std::fs::create_dir_all(&fichiers).unwrap();
        c.execute("INSERT INTO eleves (id, nom, photo_fichier) VALUES ('e1', 'Élève Un', 'ph1.jpg')", []).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        // Depuis : la photo a été effacée (elle est dans la corbeille), l'élève renommé.
        std::fs::write(corbeille.join("ph1.jpg"), b"jpg").unwrap();
        c.execute("UPDATE eleves SET nom = 'Élève Un bis', photo_fichier = NULL WHERE id = 'e1'", []).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("maintenant.sqlite3").to_string_lossy()]).unwrap();

        let (_, revenus) = revenir_a(&c, &d.join("alors.sqlite3"), &corbeille, &fichiers).unwrap();
        assert_eq!(revenus, 1, "la photo citée de nouveau revient de la corbeille");
        assert!(fichiers.join("ph1.jpg").is_file());
        let nom: String = c.query_row("SELECT nom FROM eleves WHERE id = 'e1'", [], |r| r.get(0)).unwrap();
        assert_eq!(nom, "Élève Un");
        // Annuler : revenir à l'état d'avant le retour.
        revenir_a(&c, &d.join("maintenant.sqlite3"), &corbeille, &fichiers).unwrap();
        let nom: String = c.query_row("SELECT nom FROM eleves WHERE id = 'e1'", [], |r| r.get(0)).unwrap();
        assert_eq!(nom, "Élève Un bis");
        std::fs::remove_dir_all(&d).ok();
    }

    #[test]
    fn les_reglages_de_ce_poste_et_les_secrets_ne_reviennent_pas() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        c.execute_batch(
            "INSERT INTO settings (cle, valeur) VALUES ('identifiantMachine', 'A');
             INSERT INTO settings (cle, valeur) VALUES ('matiereCouleursOverride', '{\"EPS\":\"red\"}');",
        ).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        c.execute_batch(
            "UPDATE settings SET valeur = 'B' WHERE cle = 'identifiantMachine';
             UPDATE settings SET valeur = '{\"EPS\":\"blue\"}' WHERE cle = 'matiereCouleursOverride';",
        ).unwrap();
        revenir_a(&c, &d.join("alors.sqlite3"), &d.join("Corbeille"), &d.join("Fichiers")).unwrap();
        let lire = |k: &str| -> String { c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [k], |r| r.get(0)).unwrap() };
        assert_eq!(lire("matiereCouleursOverride"), "{\"EPS\":\"red\"}");
        assert_eq!(lire("identifiantMachine"), "B", "ce qui appartient à ce poste reste");
        std::fs::remove_dir_all(&d).ok();
    }

    fn reglage(c: &Connection, k: &str) -> Option<String> {
        c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [k], |r| r.get(0)).ok()
    }

    /// Le travail gardé dans des réglages qui ne voyagent pas — un manuel importé, « Mes générateurs » — et les
    /// référentiels ajoutés par l'enseignant reviennent aussi ; l'aperçu les montre. Ceux de l'application, non.
    #[test]
    fn le_travail_des_reglages_locaux_et_les_referentiels_ajoutes_reviennent() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        c.execute_batch(
            "INSERT INTO settings (cle, valeur) VALUES ('manuel:m1', '{\"titre\":\"Réussir mon CRPE\"}');
             INSERT INTO settings (cle, valeur) VALUES ('generateurs:perso', '[{\"id\":\"g1\"}]');
             INSERT INTO referentiels (id, nom, est_integre, date_ajout) VALUES ('r-perso', 'Mon référentiel', 0, '2026-10-01');
             INSERT INTO referentiels (id, nom, est_integre, date_ajout) VALUES ('r-app', 'Programme', 1, '2026-10-01');",
        ).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        // Depuis : le manuel supprimé, les générateurs retouchés, le référentiel supprimé ; l'application a mis à
        // jour le sien.
        c.execute_batch(
            "DELETE FROM settings WHERE cle = 'manuel:m1';
             UPDATE settings SET valeur = '[]' WHERE cle = 'generateurs:perso';
             DELETE FROM referentiels WHERE id = 'r-perso';
             UPDATE referentiels SET nom = 'Programme 2026' WHERE id = 'r-app';",
        ).unwrap();
        let ecarts = ecarts_avec(&c, &d.join("alors.sqlite3")).unwrap();
        let de = |t: &str| ecarts.iter().find(|e| e.table == t).cloned().unwrap_or_default();
        assert_eq!((de("settings").revenues, de("settings").changees), (1, 1), "l'aperçu les voit : {ecarts:?}");
        assert_eq!((de("referentiels").revenues, de("referentiels").changees), (1, 0), "{ecarts:?}");

        revenir_a(&c, &d.join("alors.sqlite3"), &d.join("Corbeille"), &d.join("Fichiers")).unwrap();
        assert!(reglage(&c, "manuel:m1").is_some_and(|v| v.contains("CRPE")));
        assert_eq!(reglage(&c, "generateurs:perso").as_deref(), Some("[{\"id\":\"g1\"}]"));
        let nom = |id: &str| -> Option<String> { c.query_row("SELECT nom FROM referentiels WHERE id = ?1", [id], |r| r.get(0)).ok() };
        assert_eq!(nom("r-perso").as_deref(), Some("Mon référentiel"));
        assert_eq!(nom("r-app").as_deref(), Some("Programme 2026"), "le référentiel de l'application ne recule pas");
        std::fs::remove_dir_all(&d).ok();
    }

    /// Un fichier que seul un réglage cite — une image de la banque de gestes — revient de la corbeille, et un
    /// atelier rangé dans un espace depuis compte dans l'aperçu.
    #[test]
    fn un_fichier_cite_par_un_reglage_revient_et_les_liaisons_se_voient() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        let (corbeille, fichiers) = (d.join("Corbeille"), d.join("Fichiers"));
        std::fs::create_dir_all(&corbeille).unwrap();
        std::fs::create_dir_all(&fichiers).unwrap();
        c.execute_batch(
            "INSERT INTO settings (cle, valeur) VALUES ('fabriquer:gestesBM', '{\"bonjour\":\"geste-1.png\"}');
             INSERT INTO ateliers (id, titre, date_creation) VALUES ('at1', 'Puzzles', '2026-10-01');
             INSERT INTO espaces (id, titre, date_creation) VALUES ('es1', 'Coin calme', '2026-10-01');",
        ).unwrap();
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        std::fs::write(corbeille.join("geste-1.png"), b"png").unwrap();
        c.execute_batch(
            "UPDATE settings SET valeur = '{}' WHERE cle = 'fabriquer:gestesBM';
             INSERT INTO atelier_espace (atelier_id, espace_id) VALUES ('at1', 'es1');",
        ).unwrap();
        let ecarts = ecarts_avec(&c, &d.join("alors.sqlite3")).unwrap();
        assert!(ecarts.iter().any(|e| e.table == "atelier_espace" && e.parties == 1), "{ecarts:?}");
        let (_, revenus) = revenir_a(&c, &d.join("alors.sqlite3"), &corbeille, &fichiers).unwrap();
        assert_eq!(revenus, 1);
        assert!(fichiers.join("geste-1.png").is_file());
        std::fs::remove_dir_all(&d).ok();
    }

    /// Un réglage partagé créé depuis l'état choisi s'en va, ici et chez l'autre : sa suppression entre au journal.
    #[test]
    fn un_reglage_partage_qui_s_en_va_part_aussi_de_l_autre_ordinateur() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        c.execute("VACUUM INTO ?1", params![d.join("alors.sqlite3").to_string_lossy()]).unwrap();
        c.execute("INSERT INTO settings (cle, valeur) VALUES ('salle:plan', '[]')", []).unwrap();
        revenir_a(&c, &d.join("alors.sqlite3"), &d.join("Corbeille"), &d.join("Fichiers")).unwrap();
        assert_eq!(reglage(&c, "salle:plan"), None);
        let op: String = c.query_row(
            "SELECT operation FROM changements WHERE table_nom = 'settings' AND ligne_id = 'salle:plan' ORDER BY seq DESC LIMIT 1",
            [], |r| r.get(0)).unwrap();
        assert_eq!(op, "suppr");
        std::fs::remove_dir_all(&d).ok();
    }

    /// Un état qu'on ne peut pas reprendre — une séance dont la séquence manque — ne change rien, et ne laisse pas
    /// la base dans une transaction ouverte : les écritures suivantes s'enregistrent.
    #[test]
    fn un_retour_refuse_ne_laisse_pas_la_base_en_suspens() {
        let d = dossier();
        let c = base(&d.join("ici.sqlite3"), "A");
        c.execute("INSERT INTO projets (id, titre, date_creation) VALUES ('p1', 'Le potager', '2026-10-01')", []).unwrap();
        // L'état d'alors porte une séance orpheline.
        let alors = Connection::open(d.join("alors.sqlite3")).unwrap();
        crate::db::migrer_pour_test(&alors);
        alors.pragma_update(None, "foreign_keys", "OFF").unwrap();
        alors.execute("INSERT INTO seances (id, titre, sequence_id) VALUES ('se1', 'Orpheline', 'absente')", []).unwrap();
        drop(alors);
        let err = revenir_a(&c, &d.join("alors.sqlite3"), &d.join("Corbeille"), &d.join("Fichiers")).unwrap_err();
        assert!(err.contains("rien n'a changé"), "{err}");
        assert!(c.is_autocommit(), "la transaction est défaite");
        assert_eq!(titres(&c, "projets"), vec!["Le potager"]);
        c.execute("INSERT INTO projets (id, titre, date_creation) VALUES ('p2', 'Le cirque', '2026-10-02')", []).unwrap();
        assert!(c.is_autocommit());
        std::fs::remove_dir_all(&d).ok();
    }
}
