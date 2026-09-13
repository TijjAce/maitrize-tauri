//! Seed des référentiels de compétences officiels intégrés au binaire.
//! Exécuté au démarrage : insère les cycles s'ils ne sont pas déjà là
//! (idempotent via UUID stables), et met à jour leur contenu quand le binaire
//! embarque une version plus récente des programmes.

use rusqlite::{params, Connection};

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
        uuid: "DEADBEEF-0000-0000-0000-000000000001",
        nom: "Cycle 1 — École maternelle (v1)",
        cycle: "Cycle 1",
        donnees: include_str!("../referentiels/competences_cycle1.json"),
        actif: false,
    },
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

pub fn seed_referentiels(conn: &Connection) {
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
