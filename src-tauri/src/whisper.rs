//! Transcrire sans que rien ne sorte de l'ordinateur.
//!
//! En réunion, l'audio est ce qu'il y a de plus sensible : une famille qui
//! parle de son enfant, des professionnels qui évoquent un dossier. Le
//! masquage des prénoms n'y peut rien — on ne masque pas une voix. La seule
//! réponse honnête est que l'audio ne parte pas.
//!
//! Whisper tourne sur la machine. On n'embarque pas le moteur : l'enseignant
//! installe `whisper-cli` (whisper.cpp) et un modèle, et l'application s'en
//! sert. C'est une contrainte à l'installation, mais cela évite d'imposer une
//! bibliothèque C++ à toutes les plateformes de la chaîne de publication — et
//! surtout, cela laisse le choix du modèle à celui qui connaît sa machine.
//!
//! L'audio passe par un fichier temporaire : whisper-cli lit un fichier, pas
//! un flux. Il est effacé dès la transcription finie, réussie ou non — et
//! l'écran de la réunion le dit, plutôt que de promettre l'inverse.

use crate::db::Db;
use crate::sync::get_setting;
use tauri::State;

type R<T> = Result<T, String>;

/// Où l'enseignant a posé le moteur et le modèle.
pub struct Reglage {
    pub binaire: String,
    pub modele: String,
}

pub fn reglage(db: &State<Db>) -> R<Reglage> {
    let c = db.lock();
    let binaire = get_setting(&c, "whisperBinaire").trim().to_string();
    let modele = get_setting(&c, "whisperModele").trim().to_string();
    if binaire.is_empty() || modele.is_empty() {
        return Err("Transcription locale non configurée : indiquez le programme whisper et le modèle dans Réglages.".into());
    }
    Ok(Reglage { binaire, modele })
}

/**
 * Ce que whisper a réellement dit.
 *
 * Sa sortie porte des lignes de service — chargement du modèle, durée,
 * `[BLANK_AUDIO]` quand personne ne parle — qui n'ont rien à faire dans un
 * compte rendu. Séparé pour être vérifiable : c'est ici qu'une ligne de trop
 * se glisserait dans la réunion.
 */
pub fn texte_de_la_sortie(sortie: &str) -> String {
    sortie
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        // Les annotations entre crochets : bruit, silence, musique.
        .filter(|l| !(l.starts_with('[') && l.ends_with(']')))
        .filter(|l| !l.starts_with("whisper_") && !l.starts_with("main:") && !l.starts_with("ggml_"))
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Le fichier temporaire de cette transcription, effacé quoi qu'il arrive.
struct FichierEphemere(std::path::PathBuf);

impl Drop for FichierEphemere {
    fn drop(&mut self) {
        std::fs::remove_file(&self.0).ok();
    }
}

/// Transcrit un enregistrement (WAV 16 kHz mono, en base64) sur la machine.
#[tauri::command]
pub async fn transcrire_local(db: State<'_, Db>, audio_b64: String) -> R<String> {
    use base64::Engine;
    let Reglage { binaire, modele } = reglage(&db)?;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(audio_b64.as_bytes())
        .map_err(|e| format!("Audio illisible : {e}"))?;
    if octets.is_empty() {
        return Err("Enregistrement vide.".into());
    }

    let chemin = std::env::temp_dir().join(format!("maitrize-{}.wav", uuid::Uuid::new_v4()));
    let _ephemere = FichierEphemere(chemin.clone());
    std::fs::write(&chemin, &octets).map_err(|e| format!("Écriture impossible : {e}"))?;

    let sortie = tokio::process::Command::new(&binaire)
        .arg("-m").arg(&modele)
        .arg("-f").arg(&chemin)
        .arg("-l").arg("fr")
        // Sans horodatage, sans fichier de sortie : le texte sur la sortie standard.
        .arg("-nt")
        .arg("-np")
        .output()
        .await
        .map_err(|e| format!("Whisper n'a pas pu être lancé ({binaire}) : {e}"))?;

    if !sortie.status.success() {
        let erreur = String::from_utf8_lossy(&sortie.stderr);
        let derniere = erreur.lines().rev().find(|l| !l.trim().is_empty()).unwrap_or("");
        return Err(format!("Whisper a échoué : {derniere}"));
    }
    let texte = texte_de_la_sortie(&String::from_utf8_lossy(&sortie.stdout));
    Ok(texte)
}

/// Essaie la configuration et dit ce qui cloche, en clair.
#[tauri::command]
pub async fn whisper_tester(db: State<'_, Db>) -> R<String> {
    let Reglage { binaire, modele } = reglage(&db)?;
    if !std::path::Path::new(&modele).exists() {
        return Err(format!("Modèle introuvable : {modele}"));
    }
    let sortie = tokio::process::Command::new(&binaire)
        .arg("--help")
        .output()
        .await
        .map_err(|e| format!("Programme introuvable ou non exécutable ({binaire}) : {e}"))?;
    if !sortie.status.success() && sortie.stdout.is_empty() {
        return Err(format!("Le programme n'a pas répondu comme attendu : {binaire}"));
    }
    let taille = std::fs::metadata(&modele).map(|m| m.len()).unwrap_or(0) / 1_048_576;
    Ok(format!("Whisper répond, modèle trouvé ({taille} Mo). L'audio des réunions restera sur cet ordinateur."))
}

#[cfg(test)]
mod tests {
    use super::texte_de_la_sortie;

    #[test]
    fn garde_la_parole_et_jette_le_service() {
        let brut = "whisper_init_from_file_with_params_no_state: loading model\n\
                    \n\
                    Bonjour à tous, on commence l'ESS.\n\
                    La famille est arrivée.\n\
                    main: total time = 1234.00 ms\n";
        assert_eq!(
            texte_de_la_sortie(brut),
            "Bonjour à tous, on commence l'ESS. La famille est arrivée."
        );
    }

    #[test]
    fn un_silence_ne_devient_pas_une_phrase() {
        // Sans ce tri, « [BLANK_AUDIO] » arrivait dans le compte rendu d'une ESS.
        assert_eq!(texte_de_la_sortie("[BLANK_AUDIO]\n"), "");
        assert_eq!(texte_de_la_sortie("[Musique]\nIl reprend.\n"), "Il reprend.");
    }

    #[test]
    fn une_sortie_vide_ne_casse_rien() {
        assert_eq!(texte_de_la_sortie(""), "");
        assert_eq!(texte_de_la_sortie("   \n\n"), "");
    }
}
