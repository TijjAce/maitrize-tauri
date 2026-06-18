//! Seed des référentiels de compétences officiels intégrés au binaire.
//! Exécuté au démarrage : insère les 4 cycles s'ils ne sont pas déjà là
//! (idempotent via UUID stables). Miroir de `ReferentielIntegre.tous` (Swift).

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
        nom: "Cycle 2 — CP, CE1, CE2",
        cycle: "Cycle 2",
        donnees: include_str!("../referentiels/competences_cycle2.json"),
        actif: true,
    },
    RefIntegre {
        uuid: "DEADBEEF-0000-0000-0000-000000000003",
        nom: "Cycle 3 — CM1, CM2",
        cycle: "Cycle 3",
        donnees: include_str!("../referentiels/competences_cycle3.json"),
        actif: true,
    },
];

pub fn seed_referentiels(conn: &Connection) {
    let now = chrono::Utc::now().to_rfc3339();
    for r in TOUS {
        // INSERT OR IGNORE : ne touche pas un référentiel déjà présent
        // (l'utilisateur a pu changer son état actif / le contenu).
        conn.execute(
            "INSERT OR IGNORE INTO referentiels
             (id, nom, cycle, donnees, est_integre, date_ajout, actif)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
            params![r.uuid, r.nom, r.cycle, r.donnees, now, r.actif as i64],
        )
        .ok();
    }
}
