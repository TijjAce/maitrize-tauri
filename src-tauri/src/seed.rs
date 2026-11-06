// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

//! Seed des référentiels de compétences officiels intégrés au binaire.
//! Exécuté au démarrage : insère les cycles s'ils ne sont pas déjà là
//! (idempotent via UUID stables), et met à jour leur contenu quand le binaire
//! embarque une version plus récente des programmes.
//! L'ancien référentiel de la maternelle, d'avant le programme de 2025, n'est
//! plus embarqué : il s'en va des bases qui l'ont encore (voir
//! `retirer_l_ancien_cycle_1`).

use rusqlite::{params, Connection};
use std::collections::HashSet;

struct RefIntegre {
    uuid: &'static str,
    nom: &'static str,
    cycle: &'static str,
    donnees: &'static str,
    actif: bool,
}

// include_str! embarque le JSON dans le binaire (cross-plateforme, aucun
// fichier externe à déployer).
const TOUS: &[RefIntegre] = &[
    RefIntegre {
        uuid: "DEADBEEF-0000-0000-0000-000000000004",
        nom: "Cycle 1 — Programme 2025 (v2)",
        cycle: "Cycle 1",
        donnees: include_str!("../referentiels/competences_cycle1_2025.json"),
        actif: true,
    },
    RefIntegre {
        uuid: "DEADBEEF-0000-0000-0000-000000000002",
        nom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)",
        cycle: "Cycle 2",
        donnees: include_str!("../referentiels/competences_cycle2.json"),
        actif: true,
    },
    RefIntegre {
        uuid: "DEADBEEF-0000-0000-0000-000000000003",
        nom: "Cycle 3 — CM1, CM2 (programmes 2026)",
        cycle: "Cycle 3",
        donnees: include_str!("../referentiels/competences_cycle3.json"),
        actif: true,
    },
];

/// L'ancien référentiel de la maternelle, d'avant le programme de 2025 : son identifiant et son nom, le seul
/// qu'il ait porté. « Supprime-le, lui, sans que ça casse tout » (l'enseignant, 5 novembre 2026).
const ANCIEN_CYCLE_1: (&str, &str) = ("DEADBEEF-0000-0000-0000-000000000001", "Cycle 1 — École maternelle (v1)");

pub fn seed_referentiels(conn: &Connection) {
    retirer_l_ancien_cycle_1(conn);
    let now = chrono::Utc::now().to_rfc3339();
    for r in TOUS {
        conn.execute(
            "INSERT OR IGNORE INTO referentiels
             (id, nom, cycle, donnees, est_integre, date_ajout, actif)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
            params![r.uuid, r.nom, r.cycle, r.donnees, now, r.actif as i64],
        )
        .ok();
        // Un référentiel intégré ne se modifie pas dans l'application — on le
        // duplique pour le personnaliser. Son contenu appartient donc au
        // binaire : quand les programmes officiels changent, la nouvelle
        // version remplace l'ancienne. Sans cela, une base existante garderait
        // pour toujours les compétences de son premier démarrage. L'état
        // actif ou masqué, lui, est un choix de l'enseignant et reste intact.
        // La comparaison évite d'écrire — et de journaliser — à chaque démarrage.
        conn.execute(
            "UPDATE referentiels SET donnees = ?2, nom = ?3, cycle = ?4
             WHERE id = ?1 AND est_integre = 1 AND (donnees <> ?2 OR nom <> ?3 OR cycle <> ?4)",
            params![r.uuid, r.donnees, r.nom, r.cycle],
        )
        .ok();
    }
}

/// Retire l'ancien référentiel de la maternelle d'une base qui l'a encore, sans rien casser de ce qui le cite.
/// Une séquence, une évaluation, une note… qui cite l'une de ses compétences — par le nom du référentiel ou par
/// l'identifiant de la compétence — la garde : le référentiel reste alors, devenu un référentiel à soi, que
/// l'enseignant supprime quand il le veut (et que ses sauvegardes emportent désormais). Sinon, il s'en va.
fn retirer_l_ancien_cycle_1(conn: &Connection) {
    let (id, nom) = ANCIEN_CYCLE_1;
    let Ok(donnees) = conn.query_row(
        "SELECT donnees FROM referentiels WHERE id = ?1 AND est_integre = 1", params![id], |r| r.get::<_, String>(0),
    ) else {
        return;
    };
    if est_cite(conn, nom, &ids_des_competences(&donnees)) {
        conn.execute("UPDATE referentiels SET est_integre = 0 WHERE id = ?1", params![id]).ok();
    } else {
        conn.execute("DELETE FROM referentiels WHERE id = ?1", params![id]).ok();
    }
}

/// Les identifiants des compétences d'un référentiel : ce qui, dans son arbre, a un identifiant et un texte.
fn ids_des_competences(donnees: &str) -> HashSet<String> {
    fn parcourir(v: &serde_json::Value, ids: &mut HashSet<String>) {
        match v {
            serde_json::Value::Object(o) => {
                if let (Some(serde_json::Value::String(id)), Some(serde_json::Value::String(_))) = (o.get("id"), o.get("texte")) {
                    ids.insert(id.to_ascii_lowercase());
                }
                o.values().for_each(|x| parcourir(x, ids));
            }
            serde_json::Value::Array(a) => a.iter().for_each(|x| parcourir(x, ids)),
            _ => {}
        }
    }
    let mut ids = HashSet::new();
    if let Ok(v) = serde_json::from_str(donnees) {
        parcourir(&v, &mut ids);
    }
    ids
}

/// Ce que l'enseignant a écrit — tout ce qui voyage d'un ordinateur à l'autre, et ses réglages — cite-t-il ce
/// référentiel, par son nom ou par l'identifiant de l'une de ses compétences, où qu'il soit écrit ? Les
/// identifiants sont des chiffres hexadécimaux : on les cherche dans chaque suite de tels chiffres, d'un seul
/// passage. Dans le doute — une colonne qu'on ne peut pas lire —, il est cité.
fn est_cite(conn: &Connection, nom: &str, ids: &HashSet<String>) -> bool {
    let longueurs: HashSet<usize> = ids.iter().map(|i| i.len()).collect();
    let cite_dans = |texte: &str| -> bool {
        if texte.contains(nom) {
            return true;
        }
        let octets = texte.as_bytes();
        let mut debut = 0;
        while debut < octets.len() {
            if !octets[debut].is_ascii_hexdigit() {
                debut += 1;
                continue;
            }
            let mut fin = debut;
            while fin < octets.len() && octets[fin].is_ascii_hexdigit() {
                fin += 1;
            }
            let suite = texte[debut..fin].to_ascii_lowercase();
            if longueurs.iter().any(|&n| n <= suite.len() && (0..=suite.len() - n).any(|k| ids.contains(&suite[k..k + n]))) {
                return true;
            }
            debut = fin;
        }
        false
    };
    for table in crate::journal::TABLES_SYNC.iter().copied().chain(["settings"]) {
        let colonnes: Vec<String> = match conn.prepare(&format!("PRAGMA table_info(\"{table}\")")) {
            Ok(mut st) => match st.query_map([], |r| Ok((r.get::<_, String>(1)?, r.get::<_, String>(2)?))) {
                Ok(l) => l.flatten().filter(|(_, t)| t.is_empty() || t.eq_ignore_ascii_case("TEXT")).map(|(n, _)| n).collect(),
                Err(_) => return true,
            },
            Err(_) => return true,
        };
        for col in colonnes {
            let Ok(mut st) = conn.prepare(&format!(
                "SELECT \"{col}\" FROM \"{table}\" WHERE typeof(\"{col}\") = 'text' AND \"{col}\" <> ''"
            )) else {
                return true;
            };
            let Ok(lignes) = st.query_map([], |r| r.get::<_, String>(0)) else {
                return true;
            };
            for v in lignes {
                match v {
                    Ok(v) if cite_dans(&v) => return true,
                    Ok(_) => {}
                    Err(_) => return true,
                }
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        c
    }

    /// Une base créée avec d'anciens programmes reçoit les nouveaux, sans perdre
    /// le choix « masqué » de l'enseignant.
    #[test]
    fn un_referentiel_integre_ancien_est_mis_a_jour() {
        let c = base();
        c.execute(
            "INSERT OR REPLACE INTO referentiels (id, nom, cycle, donnees, est_integre, date_ajout, actif)
             VALUES ('DEADBEEF-0000-0000-0000-000000000002', 'Cycle 2 — CP, CE1, CE2', 'Cycle 2', '{\"ancien\":1}', 1, 'x', 0)",
            [],
        )
        .unwrap();
        seed_referentiels(&c);
        let (donnees, nom, actif): (String, String, i64) = c
            .query_row("SELECT donnees, nom, actif FROM referentiels WHERE id = 'DEADBEEF-0000-0000-0000-000000000002'",
                       [], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .unwrap();
        assert!(donnees.contains("rentrée 2026"), "le contenu n'a pas été remplacé");
        assert!(nom.contains("2026"));
        assert_eq!(actif, 0, "le choix « masqué » de l'enseignant a été écrasé");
    }

    /// Une copie personnelle (non intégrée) n'est jamais touchée.
    #[test]
    fn une_copie_personnelle_reste_intacte() {
        let c = base();
        c.execute(
            "INSERT INTO referentiels (id, nom, cycle, donnees, est_integre, date_ajout, actif)
             VALUES ('perso', 'Cycle 2 (copie)', 'Cycle 2', '{\"a_moi\":1}', 0, 'x', 1)",
            [],
        )
        .unwrap();
        seed_referentiels(&c);
        let donnees: String = c
            .query_row("SELECT donnees FROM referentiels WHERE id = 'perso'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(donnees, "{\"a_moi\":1}");
    }

    /// L'ancien référentiel de la maternelle tel qu'une base d'avant le garde : intégré, masqué.
    fn poser_l_ancien(c: &Connection) {
        c.execute(
            "INSERT INTO referentiels (id, nom, cycle, donnees, est_integre, date_ajout, actif)
             VALUES (?1, ?2, 'Cycle 1', ?3, 1, 'x', 0)",
            params![ANCIEN_CYCLE_1.0, ANCIEN_CYCLE_1.1,
                    r#"{"domaines":[{"id":"D1","titre":"Langage","sousDomaines":[{"id":"SD1","titre":"Oral","competences":[
                        {"id":"5367357c","texte":"Oser entrer en communication"},{"id":"0c512b56","texte":"Comprendre et apprendre"}]}]}]}"#],
        )
        .unwrap();
    }

    fn l_ancien(c: &Connection) -> Option<i64> {
        c.query_row("SELECT est_integre FROM referentiels WHERE id = ?1", params![ANCIEN_CYCLE_1.0], |r| r.get(0)).ok()
    }

    /// « Supprime-le, lui, sans que ça casse tout » (l'enseignant, 5 novembre 2026) : l'ancien référentiel de la
    /// maternelle s'en va d'une base où rien ne le cite, ne revient pas au démarrage suivant, et les autres restent.
    #[test]
    fn l_ancien_cycle_1_s_en_va_quand_rien_ne_le_cite() {
        let c = base();
        poser_l_ancien(&c);
        // Une séquence qui vise une compétence du programme de 2025 ; des suites de chiffres qui ne sont pas les siennes.
        c.execute(
            "INSERT INTO sequences (id, titre, competence_visee, date_creation) VALUES ('536735-7c', 'Les couleurs', ?1, 'x')",
            params![r#"{"referentielNom":"Cycle 1 — Programme 2025 (v2)","competenceRefId":"d82ad7a9","competenceTitre":"Scander les syllabes"}"#],
        )
        .unwrap();
        c.execute("INSERT INTO settings (cle, valeur) VALUES ('teinte', '#0c512b')", []).unwrap();
        seed_referentiels(&c);
        assert_eq!(l_ancien(&c), None);
        seed_referentiels(&c);
        assert_eq!(l_ancien(&c), None, "il est revenu au démarrage suivant");
        let integres: i64 = c.query_row("SELECT COUNT(*) FROM referentiels WHERE est_integre = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(integres as usize, TOUS.len());
        assert!(TOUS.iter().all(|r| r.uuid != ANCIEN_CYCLE_1.0));
    }

    /// Ce qui le cite — une séquence par son nom, une note sur une compétence ou un réglage par l'identifiant
    /// de la compétence — garde sa compétence : il reste, devenu un référentiel à soi, que l'enseignant
    /// supprimera s'il le veut.
    #[test]
    fn l_ancien_cycle_1_reste_a_soi_quand_on_le_cite() {
        for (sql, par) in [
            (r#"INSERT INTO sequences (id, titre, competence_visee, date_creation) VALUES ('s', 'Les couleurs',
                '{"referentielNom":"Cycle 1 — École maternelle (v1)","competenceTitre":"Oser entrer en communication"}', 'x')"#, "son nom"),
            ("INSERT INTO notes_competence (id, competence_ref_id, texte, date_creation, date_modification)
              VALUES ('n', '5367357C', 'ma note', 'x', 'x')", "l'identifiant d'une compétence"),
            (r#"INSERT INTO settings (cle, valeur) VALUES ('grille', '{"colonnes":["0c512b56"]}')"#, "un réglage"),
        ] {
            let c = base();
            poser_l_ancien(&c);
            c.execute(sql, []).unwrap();
            seed_referentiels(&c);
            assert_eq!(l_ancien(&c), Some(0), "cité par {par}");
            seed_referentiels(&c);
            assert_eq!(l_ancien(&c), Some(0), "cité par {par}, au démarrage suivant");
        }
    }

    /// Les référentiels embarqués sont du JSON valide, à la structure attendue.
    #[test]
    fn les_referentiels_embarques_sont_valides() {
        for r in TOUS {
            let v: serde_json::Value = serde_json::from_str(r.donnees).unwrap_or_else(|e| panic!("{} : {e}", r.nom));
            let domaines = v["domaines"].as_array().unwrap_or_else(|| panic!("{} : pas de domaines", r.nom));
            assert!(!domaines.is_empty(), "{}", r.nom);
            let mut ids = std::collections::HashSet::new();
            for d in domaines {
                for sd in d["sousDomaines"].as_array().unwrap() {
                    let directes = sd["competences"].as_array().cloned().unwrap_or_default();
                    let generales = sd["competencesGenerales"].as_array().cloned().unwrap_or_default();
                    let toutes = directes.iter().chain(generales.iter().flat_map(|cg| cg["competences"].as_array().unwrap().iter()));
                    for comp in toutes {
                        let id = comp["id"].as_str().unwrap().to_string();
                        assert!(!comp["texte"].as_str().unwrap().is_empty());
                        assert!(ids.insert(id.clone()), "{} : identifiant en double {id}", r.nom);
                    }
                }
            }
        }
    }
}
