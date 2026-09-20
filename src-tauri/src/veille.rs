//! Voir la fenêtre se figer, et le dire — même si elle ne se réveille pas.
//!
//! Le battement de la fenêtre (voir `veille.ts`) ne peut rien noter tant
//! qu'elle est bloquée : il ne parle qu'une fois débloqué. Si l'enseignant
//! force la fermeture avant, il ne reste rien.
//!
//! Ici, le battement arrive de la fenêtre et c'est le **backend** qui le
//! surveille, sur son propre fil. Il n'est jamais bloqué par le sien : quand
//! le battement cesse, il l'écrit tout de suite dans le journal d'incidents,
//! puis à intervalles réguliers tant que ça dure. Après coup, on lit combien
//! de temps la fenêtre est restée figée, et sur quel écran.
//!
//! Une session qui se termine sans « ARRÊT » a donc été tuée : la suivante le
//! signale au démarrage, ce qui distingue une fermeture normale d'un plantage.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Date du dernier battement reçu de la fenêtre, en millisecondes.
static DERNIER: AtomicU64 = AtomicU64::new(0);
/// Écran annoncé au dernier battement, pour dire où ça s'est figé.
static OU: std::sync::Mutex<String> = std::sync::Mutex::new(String::new());

pub fn maintenant_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Au-delà, la fenêtre ne répond plus.
pub const BLOCAGE_MS: u64 = 10_000;
/// Au-delà, ce n'est plus un blocage : l'ordinateur dormait, ou la fenêtre était fermée.
pub const SOMMEIL_MS: u64 = 120_000;
/// À quelle cadence redire qu'elle est toujours figée.
pub const RAPPEL_MS: u64 = 15_000;

/**
 * Ce qu'il faut écrire pour ce silence, ou rien du tout.
 *
 * Séparé du fil de surveillance pour être vérifiable : c'est cette décision
 * qui, en se trompant, remplirait le journal de fausses alertes.
 */
pub fn message_de_silence(silence: u64, deja_dit: bool, ou: &str) -> Option<String> {
    if silence < BLOCAGE_MS || silence > SOMMEIL_MS {
        return None;
    }
    let lieu = if ou.is_empty() { String::new() } else { format!(" sur {ou}") };
    Some(if deja_dit {
        format!("FIGÉ toujours, {} s{lieu}", silence / 1000)
    } else {
        format!("FIGÉ la fenêtre ne répond plus depuis {} s{lieu}", silence / 1000)
    })
}

/// Le battement de la fenêtre : elle est vivante, et voici où elle en est.
#[tauri::command]
pub fn diag_battement(ou: String) {
    DERNIER.store(maintenant_ms(), Ordering::Relaxed);
    if let Ok(mut place) = OU.lock() {
        *place = ou;
    }
}

/// Démarre la surveillance, sur son propre fil.
pub fn surveiller() {
    DERNIER.store(maintenant_ms(), Ordering::Relaxed);
    std::thread::spawn(|| {
        let mut dit_a = 0u64;
        loop {
            std::thread::sleep(Duration::from_millis(2000));
            let dernier = DERNIER.load(Ordering::Relaxed);
            // Tant que la fenêtre n'a jamais battu, il n'y a rien à surveiller.
            if dernier == 0 {
                continue;
            }
            let silence = maintenant_ms().saturating_sub(dernier);
            let deja_dit = dit_a > dernier;
            // Un rappel toutes les quinze secondes, pas à chaque tour.
            if deja_dit && maintenant_ms().saturating_sub(dit_a) < RAPPEL_MS {
                continue;
            }
            let ou = OU.lock().map(|x| x.clone()).unwrap_or_default();
            if let Some(ligne) = message_de_silence(silence, deja_dit, &ou) {
                crate::commands::diag_ecrire(ligne);
                dit_a = maintenant_ms();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn une_lenteur_ordinaire_ne_remplit_pas_le_journal() {
        assert_eq!(message_de_silence(3_000, false, "/plan"), None);
        assert_eq!(message_de_silence(9_999, false, "/plan"), None);
        // Un ordinateur qui dort n'est pas une panne.
        assert_eq!(message_de_silence(300_000, false, "/plan"), None);
    }

    #[test]
    fn un_blocage_se_dit_une_fois_puis_se_rappelle() {
        let premier = message_de_silence(12_000, false, "/plan").unwrap();
        assert_eq!(premier, "FIGÉ la fenêtre ne répond plus depuis 12 s sur /plan");
        let suivant = message_de_silence(30_000, true, "/plan").unwrap();
        assert_eq!(suivant, "FIGÉ toujours, 30 s sur /plan");
        // Sans écran connu, la ligne reste lisible.
        assert_eq!(message_de_silence(12_000, false, "").unwrap(), "FIGÉ la fenêtre ne répond plus depuis 12 s");
    }
}
