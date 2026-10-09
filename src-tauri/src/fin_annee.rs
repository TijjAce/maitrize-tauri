//! La fin de l'année scolaire : garder une trace des élèves qui partent.
//!
//! Les élèves d'une année n'ont pas à rester dans Maitrize une fois partis :
//! leurs dossiers parlent de santé, de handicap, de familles. À l'été, une
//! fenêtre propose de les supprimer pour laisser place à la classe suivante
//! (voir `finDAnnee.ts`) — et, avant, d'exporter leurs données : un dossier
//! par élève, lisible sans Maitrize, à remettre à l'équipe ou à archiver.
//!
//! Chaque dossier contient :
//!   - `dossier.html`, le dossier de l'élève tel qu'il s'imprime, avec ses
//!     temps d'observation et le contenu de ses documents (PPI, GEVA-Sco,
//!     dispositifs…), mis en page par l'interface ;
//!   - `donnees.json`, tout ce que la base sait de lui, sans perte ;
//!   - `fichiers/`, sa photo et les fichiers de ses papiers.

use crate::db::Db;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

/// L'année scolaire d'un jour (« 2026-2027 ») : elle change au 1er septembre.
/// En juillet et en août, les élèves présents sont encore ceux de l'année
/// qui finit.
pub fn annee_en_cours(jour: chrono::NaiveDate) -> String {
    use chrono::Datelike;
    let a = jour.year();
    if jour.month() >= 9 { format!("{a}-{}", a + 1) } else { format!("{}-{a}", a - 1) }
}

/// Un nom de dossier sûr, tiré du nom de l'élève : ni séparateur, ni
/// caractère que Windows refuse, ni nom vide.
pub fn nom_de_dossier(nom: &str, repli: &str) -> String {
    let propre: String = nom
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() { '-' } else { c })
        .collect();
    let propre = propre.trim().trim_matches('.').trim().to_string();
    let propre: String = propre.chars().take(80).collect();
    if propre.is_empty() { repli.to_string() } else { propre }
}

/// Le premier chemin libre : « nom », puis « nom (2) », « nom (3) »…
fn chemin_libre(parent: &Path, nom: &str) -> PathBuf {
    let premier = parent.join(nom);
    if !premier.exists() {
        return premier;
    }
    (2..).map(|i| parent.join(format!("{nom} ({i})"))).find(|p| !p.exists()).unwrap_or(premier)
}

/// Les lignes d'une requête, en objets JSON nommés par leurs colonnes.
fn lignes(c: &rusqlite::Connection, sql: &str, id: &str) -> Vec<serde_json::Value> {
    let Ok(mut st) = c.prepare(sql) else { return Vec::new() };
    let noms: Vec<String> = st.column_names().iter().map(|n| n.to_string()).collect();
    let Ok(rows) = st.query_map([id], |r| {
        let mut o = serde_json::Map::new();
        for (i, nom) in noms.iter().enumerate() {
            use rusqlite::types::ValueRef;
            let v = match r.get_ref(i)? {
                ValueRef::Null => serde_json::Value::Null,
                ValueRef::Integer(n) => serde_json::Value::from(n),
                ValueRef::Real(x) => serde_json::Value::from(x),
                ValueRef::Text(t) => serde_json::Value::from(String::from_utf8_lossy(t).into_owned()),
                ValueRef::Blob(b) => {
                    use base64::Engine;
                    serde_json::Value::from(base64::engine::general_purpose::STANDARD.encode(b))
                }
            };
            o.insert(nom.clone(), v);
        }
        Ok(serde_json::Value::Object(o))
    }) else { return Vec::new() };
    rows.flatten().collect()
}

/// Tout ce que la base sait d'un élève, sans perte : de quoi le retrouver
/// entier dans un an, ou le transmettre.
pub(crate) fn donnees_de_l_eleve(c: &rusqlite::Connection, id: &str, annee: &str) -> serde_json::Value {
    let documents: Vec<serde_json::Value> = lignes(c,
        "SELECT type, donnees, date_maj FROM documents_eleve WHERE eleve_id = ?1 ORDER BY type", id)
        .into_iter()
        .map(|mut d| {
            // Un document est rangé en JSON dans du texte : on le rend lisible tel quel.
            if let Some(brut) = d.get("donnees").and_then(|v| v.as_str()).map(str::to_string) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&brut) {
                    d["donnees"] = v;
                }
            }
            d
        })
        .collect();
    serde_json::json!({
        "format": "maitrize-eleve-v1",
        "anneeScolaire": annee,
        "exporteLe": chrono::Local::now().to_rfc3339(),
        "eleve": lignes(c, "SELECT * FROM eleves WHERE id = ?1", id).into_iter().next(),
        "observations": lignes(c, "SELECT * FROM commentaires_eleve WHERE eleve_id = ?1 ORDER BY date", id),
        "tempsDObservation": lignes(c, "SELECT * FROM observations_eleve WHERE eleve_id = ?1 ORDER BY date", id),
        "notes": lignes(c,
            "SELECT n.*, e.titre AS evaluation_titre, e.matiere AS evaluation_matiere, e.date AS evaluation_date,
                    e.bareme AS evaluation_bareme
               FROM notes_eleve n LEFT JOIN evaluations e ON e.id = n.evaluation_id
              WHERE n.eleve_id = ?1", id),
        "appels": lignes(c, "SELECT * FROM appels_journalier WHERE eleve_id = ?1 ORDER BY date", id),
        "papiers": lignes(c, "SELECT * FROM papiers_eleve WHERE eleve_id = ?1", id),
        "progressions": lignes(c, "SELECT * FROM progressions_eleve WHERE eleve_id = ?1", id),
        "documents": documents,
    })
}

/// Ce que l'interface envoie pour chaque élève : son dossier, mis en page.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DossierAExporter {
    pub id: String,
    pub html: String,
}

#[derive(Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BilanExport {
    /// Le dossier créé, qui contient un dossier par élève.
    pub racine: String,
    pub eleves: usize,
    pub fichiers: usize,
    /// Le service qui synchronise le dossier choisi, s'il y en a un.
    pub synchronise: Option<String>,
}

/// Écrit l'export dans `parent` ; les fichiers joints viennent de `fichiers`.
pub(crate) fn exporter(
    c: &rusqlite::Connection, parent: &Path, fichiers: &Path, annee: &str, eleves: &[DossierAExporter],
) -> R<BilanExport> {
    let racine = chemin_libre(parent, &nom_de_dossier(&format!("Maitrize — élèves {annee}"), "Maitrize — élèves"));
    std::fs::create_dir_all(&racine).map_err(e)?;
    let mut bilan = BilanExport { racine: racine.to_string_lossy().into_owned(), ..Default::default() };
    for d in eleves {
        let Ok((nom, photo)) = c.query_row("SELECT nom, photo_fichier FROM eleves WHERE id = ?1", [&d.id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?))) else { continue };
        let dossier = chemin_libre(&racine, &nom_de_dossier(&nom, &d.id));
        std::fs::create_dir_all(&dossier).map_err(e)?;
        std::fs::write(dossier.join("dossier.html"), &d.html).map_err(e)?;
        let donnees = serde_json::to_string_pretty(&donnees_de_l_eleve(c, &d.id, annee)).map_err(e)?;
        std::fs::write(dossier.join("donnees.json"), donnees).map_err(e)?;

        // Sa photo et les fichiers de ses papiers, sous leur nom d'origine dans l'application.
        let mut joints: Vec<String> = photo.into_iter().filter(|p| !p.is_empty()).collect();
        if let Ok(mut st) = c.prepare("SELECT nom_fichier FROM papiers_eleve WHERE eleve_id = ?1 AND nom_fichier <> ''") {
            if let Ok(noms) = st.query_map([&d.id], |r| r.get::<_, String>(0)) {
                joints.extend(noms.flatten());
            }
        }
        for nom_fichier in joints {
            let simple = Path::new(&nom_fichier).file_name().is_some_and(|f| f == std::ffi::OsStr::new(&nom_fichier));
            let source = fichiers.join(&nom_fichier);
            if !simple || !source.is_file() { continue; }
            let cible = dossier.join("fichiers");
            std::fs::create_dir_all(&cible).map_err(e)?;
            if std::fs::copy(&source, cible.join(&nom_fichier)).is_ok() {
                bilan.fichiers += 1;
            }
        }
        bilan.eleves += 1;
    }
    Ok(bilan)
}

/// Exporte les dossiers des élèves dans le dossier choisi.
#[tauri::command(async)]
pub fn eleves_exporter(db: State<Db>, dossier: String, annee: String, eleves: Vec<DossierAExporter>) -> R<BilanExport> {
    let parent = PathBuf::from(dossier.trim());
    if !parent.is_absolute() || !parent.is_dir() {
        return Err("Choisissez un dossier existant.".into());
    }
    if parent.starts_with(crate::db::data_dir()) {
        return Err("Ce dossier est celui des données de Maitrize : choisissez-en un autre.".into());
    }
    let c = db.lock();
    let mut bilan = exporter(&c, &parent, &crate::db::fichiers_dir(), &annee, &eleves)?;
    bilan.synchronise = crate::db::service_de_synchro(&parent).map(str::to_string);
    Ok(bilan)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};

    #[test]
    fn l_annee_scolaire_change_en_septembre() {
        let jour = |a, m, j| chrono::NaiveDate::from_ymd_opt(a, m, j).unwrap();
        assert_eq!(annee_en_cours(jour(2026, 10, 9)), "2026-2027");
        assert_eq!(annee_en_cours(jour(2027, 7, 15)), "2026-2027");
        assert_eq!(annee_en_cours(jour(2027, 8, 31)), "2026-2027");
        assert_eq!(annee_en_cours(jour(2027, 9, 1)), "2027-2028");
    }

    #[test]
    fn un_nom_d_eleve_devient_un_nom_de_dossier_sur() {
        assert_eq!(nom_de_dossier("Apolline Martin", "x"), "Apolline Martin");
        assert_eq!(nom_de_dossier("Léo / Durand: \"le grand\"", "x"), "Léo - Durand- -le grand-");
        assert_eq!(nom_de_dossier("  ..  ", "repli"), "repli");
        assert_eq!(nom_de_dossier(&"a".repeat(200), "x").chars().count(), 80);
    }

    #[test]
    fn chaque_eleve_part_dans_son_dossier_avec_ses_donnees_et_ses_fichiers() {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c.execute("INSERT INTO eleves (id, nom, niveau, photo_fichier) VALUES ('a', 'Apolline Martin', 'CE1', 'photo-a.jpg')", []).unwrap();
        c.execute("INSERT INTO eleves (id, nom, niveau) VALUES ('b', 'Apolline Martin', 'CE1')", []).unwrap();
        c.execute("INSERT INTO commentaires_eleve (id, date, eleve_id, texte, type) VALUES ('co1', '2027-03-01', 'a', 'Lit seule', 'scolaire')", []).unwrap();
        c.execute("INSERT INTO documents_eleve (id, eleve_id, type, donnees, date_maj) VALUES ('a:ppi', 'a', 'ppi', ?1, '2027-01-10')",
            params![r#"{"besoins":"Repères dans le temps"}"#]).unwrap();
        let fichiers = tempfile::tempdir().unwrap();
        std::fs::write(fichiers.path().join("photo-a.jpg"), b"jpeg").unwrap();
        let sortie = tempfile::tempdir().unwrap();

        let eleves = vec![
            DossierAExporter { id: "a".into(), html: "<html>Apolline</html>".into() },
            DossierAExporter { id: "b".into(), html: "<html>l'autre Apolline</html>".into() },
            DossierAExporter { id: "inconnu".into(), html: String::new() },
        ];
        let bilan = exporter(&c, sortie.path(), fichiers.path(), "2026-2027", &eleves).unwrap();
        assert_eq!((bilan.eleves, bilan.fichiers), (2, 1));
        let racine = PathBuf::from(&bilan.racine);
        assert_eq!(racine.file_name().unwrap(), "Maitrize — élèves 2026-2027");
        // Deux élèves du même nom : deux dossiers.
        let a = racine.join("Apolline Martin");
        assert!(a.join("dossier.html").is_file() && racine.join("Apolline Martin (2)").join("dossier.html").is_file());
        assert_eq!(std::fs::read(a.join("fichiers/photo-a.jpg")).unwrap(), b"jpeg");
        let json: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(a.join("donnees.json")).unwrap()).unwrap();
        assert_eq!(json["eleve"]["nom"], "Apolline Martin");
        assert_eq!(json["observations"][0]["texte"], "Lit seule");
        // Le document se lit comme un objet, pas comme du texte échappé.
        assert_eq!(json["documents"][0]["donnees"]["besoins"], "Repères dans le temps");

        // Un second export ne recouvre pas le premier.
        let bis = exporter(&c, sortie.path(), fichiers.path(), "2026-2027", &eleves[..1]).unwrap();
        assert!(bis.racine.ends_with("Maitrize — élèves 2026-2027 (2)"));
    }

    #[test]
    fn un_eleve_cree_garde_son_jour_et_son_annee() {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        let el = crate::models::Eleve {
            id: "x".into(), nom: "Rose".into(), niveau: "CP".into(), present: true, ine: String::new(),
            date_naissance: String::new(), photo_fichier: None, non_verbal: false,
            annee_scolaire: None, date_creation: None,
        };
        let cree = crate::commands::ecrire_eleve(&c, el.clone()).unwrap();
        assert!(cree.date_creation.is_some(), "le jour de création se pose à la création");
        // Gardé pour l'année suivante, puis renvoyé par un écran qui ne connaît ni l'un ni l'autre.
        crate::commands::ecrire_eleve(&c, crate::models::Eleve { annee_scolaire: Some("2027-2028".into()), ..el.clone() }).unwrap();
        crate::commands::ecrire_eleve(&c, crate::models::Eleve { nom: "Rose P.".into(), ..el }).unwrap();
        let (annee, jour): (Option<String>, Option<String>) = c.query_row(
            "SELECT annee_scolaire, date_creation FROM eleves WHERE id = 'x'", [], |r| Ok((r.get(0)?, r.get(1)?))).unwrap();
        assert_eq!(annee.as_deref(), Some("2027-2028"));
        assert_eq!(jour, cree.date_creation);
    }
}
