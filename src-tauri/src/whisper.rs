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
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, State};

type R<T> = Result<T, String>;

/// Où l'enseignant a posé le moteur et le modèle.
pub struct Reglage {
    pub binaire: String,
    pub modele: String,
}

/// Les endroits où whisper.cpp se pose, selon le système.
///
/// Demander un chemin absolu à un enseignant, c'est lui demander d'ouvrir un
/// terminal : on regarde donc d'abord aux endroits habituels, et le réglage
/// ne sert plus qu'aux installations qui sortent de l'ordinaire.
fn candidats_binaire() -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = Vec::new();
    if cfg!(target_os = "windows") {
        for base in ["C:\\Program Files\\whisper.cpp", "C:\\whisper.cpp", "C:\\Program Files\\whisper"] {
            for nom in ["whisper-cli.exe", "main.exe"] {
                v.push(PathBuf::from(base).join(nom));
            }
        }
    } else {
        for base in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/opt/local/bin"] {
            for nom in ["whisper-cli", "whisper-cpp", "whisper"] {
                v.push(PathBuf::from(base).join(nom));
            }
        }
    }
    // Ce que l'enseignant aurait posé à côté de ses modèles.
    for nom in ["whisper-cli", "whisper-cli.exe", "main"] {
        v.push(dossier_modeles().join(nom));
    }
    v
}

/// Le programme trouvé sur cette machine, s'il y en a un.
pub fn detecter_binaire() -> Option<String> {
    candidats_binaire()
        .into_iter()
        .find(|p| p.is_file())
        .map(|p| p.to_string_lossy().to_string())
}

/// Le dossier des modèles, dans les données de l'application.
pub fn dossier_modeles() -> PathBuf {
    crate::db::data_dir().join("Whisper")
}

/// Le modèle trouvé : celui qu'on a téléchargé, ou celui d'une installation.
pub fn detecter_modele() -> Option<String> {
    let mut coins = vec![dossier_modeles()];
    if !cfg!(target_os = "windows") {
        coins.push(PathBuf::from("/opt/homebrew/share/whisper-cpp/models"));
        coins.push(PathBuf::from("/usr/local/share/whisper-cpp/models"));
    }
    if let Some(maison) = dirs::home_dir() {
        coins.push(maison.join("Models"));
        coins.push(maison.join("Modeles"));
        coins.push(maison.join(".cache/whisper"));
    }
    let mut trouves: Vec<PathBuf> = Vec::new();
    for coin in coins {
        let Ok(entrees) = std::fs::read_dir(&coin) else { continue };
        for e in entrees.flatten() {
            let p = e.path();
            let nom = p.file_name().unwrap_or_default().to_string_lossy().to_string();
            if nom.starts_with("ggml-") && nom.ends_with(".bin") && p.is_file() {
                trouves.push(p);
            }
        }
    }
    // Le plus gros d'abord : à taille de modèle, la qualité suit.
    trouves.sort_by_key(|p| std::cmp::Reverse(std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)));
    trouves.first().map(|p| p.to_string_lossy().to_string())
}

/**
 * Ce qui servira à transcrire : le réglage s'il est rempli, la détection sinon.
 *
 * Un réglage vide n'est pas une erreur tant que la machine porte un whisper
 * utilisable — c'est même le cas le plus fréquent, l'enseignant ayant installé
 * le moteur sans venir le déclarer.
 */
pub fn reglage(db: &State<Db>) -> R<Reglage> {
    let (binaire, modele) = {
        let c = db.lock();
        (
            get_setting(&c, "whisperBinaire").trim().to_string(),
            get_setting(&c, "whisperModele").trim().to_string(),
        )
    };
    let binaire = if binaire.is_empty() { detecter_binaire().unwrap_or_default() } else { binaire };
    let modele = if modele.is_empty() { detecter_modele().unwrap_or_default() } else { modele };
    if binaire.is_empty() {
        return Err("Whisper n'est pas installé sur cet ordinateur : voir Réglages · IA · Transcription des réunions.".into());
    }
    if modele.is_empty() {
        return Err("Aucun modèle de transcription : téléchargez-en un depuis Réglages · IA · Transcription des réunions.".into());
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

/// Ce qu'on peut dire de l'installation locale, sans rien lancer.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EtatWhisper {
    /// Ce qui servira vraiment, réglage ou détection.
    pub binaire: String,
    pub modele: String,
    /// Vrai quand la valeur vient de la détection, et non d'un réglage.
    pub binaire_trouve: bool,
    pub modele_trouve: bool,
    /// Où les modèles téléchargés se rangent.
    pub dossier_modeles: String,
    /// Les octets du modèle, pour dire sa taille sans la deviner.
    pub taille_modele: u64,
    /// La commande d'installation qui convient à ce système.
    pub installation: String,
}

/// Ce que l'écran des réglages montre de l'installation locale.
#[tauri::command]
pub fn whisper_etat(db: State<Db>) -> R<EtatWhisper> {
    let (reglee_bin, reglee_mod) = {
        let c = db.lock();
        (
            get_setting(&c, "whisperBinaire").trim().to_string(),
            get_setting(&c, "whisperModele").trim().to_string(),
        )
    };
    let binaire = if reglee_bin.is_empty() { detecter_binaire().unwrap_or_default() } else { reglee_bin.clone() };
    let modele = if reglee_mod.is_empty() { detecter_modele().unwrap_or_default() } else { reglee_mod.clone() };
    let taille_modele = std::fs::metadata(&modele).map(|m| m.len()).unwrap_or(0);
    Ok(EtatWhisper {
        binaire_trouve: reglee_bin.is_empty() && !binaire.is_empty(),
        modele_trouve: reglee_mod.is_empty() && !modele.is_empty(),
        dossier_modeles: dossier_modeles().to_string_lossy().to_string(),
        taille_modele,
        installation: if cfg!(target_os = "windows") {
            "winget install whisper-cpp  (ou téléchargez whisper.cpp et posez whisper-cli.exe dans C:\\whisper.cpp)".into()
        } else {
            "brew install whisper-cpp".to_string()
        },
        binaire,
        modele,
    })
}

/// Les modèles qu'on sait aller chercher, du plus léger au plus juste.
const MODELES: &[(&str, &str, &str)] = &[
    ("base", "ggml-base.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"),
    ("small", "ggml-small.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"),
    ("medium", "ggml-medium.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"),
];

#[derive(Clone, serde::Serialize)]
struct Avancement { faits: u64, total: u64 }

/**
 * Va chercher un modèle de transcription et le pose dans les données.
 *
 * C'est le seul moment où la transcription locale a besoin du réseau : on le
 * fait une fois, chez soi, et la réunion de mardi se passe de tout.
 *
 * Le fichier s'écrit sous un nom provisoire, renommé à la fin : une coupure
 * en cours de route ne laisse pas un modèle tronqué qui passerait pour bon.
 */
#[tauri::command]
pub async fn whisper_telecharger_modele(app: AppHandle, db: State<'_, Db>, nom: String) -> R<String> {
    let (_, fichier, url) = MODELES
        .iter()
        .find(|(n, _, _)| *n == nom)
        .ok_or_else(|| format!("Modèle inconnu : {nom}"))?;
    let dossier = dossier_modeles();
    std::fs::create_dir_all(&dossier).map_err(|e| format!("Dossier impossible à créer : {e}"))?;
    let cible = dossier.join(fichier);
    let provisoire = dossier.join(format!("{fichier}.part"));

    let mut reponse = reqwest::get(*url).await.map_err(|e| format!("Réseau : {e}"))?;
    if !reponse.status().is_success() {
        return Err(format!("Téléchargement refusé (HTTP {}).", reponse.status()));
    }
    let total = reponse.content_length().unwrap_or(0);
    let mut faits: u64 = 0;
    {
        use std::io::Write;
        let mut f = std::fs::File::create(&provisoire).map_err(|e| format!("Écriture impossible : {e}"))?;
        while let Some(morceau) = reponse.chunk().await.map_err(|e| format!("Téléchargement interrompu : {e}"))? {
            f.write_all(&morceau).map_err(|e| format!("Écriture impossible : {e}"))?;
            faits += morceau.len() as u64;
            let _ = app.emit("whisper://avancement", Avancement { faits, total });
        }
        f.flush().map_err(|e| format!("Écriture impossible : {e}"))?;
    }
    // Un modèle ggml fait au moins quelques dizaines de méga-octets : en deçà,
    // c'est une page d'erreur qu'on vient d'enregistrer.
    if faits < 20_000_000 {
        std::fs::remove_file(&provisoire).ok();
        return Err("Le fichier reçu est trop petit pour être un modèle : réessayez.".into());
    }
    std::fs::rename(&provisoire, &cible).map_err(|e| format!("Impossible de ranger le modèle : {e}"))?;

    let chemin = cible.to_string_lossy().to_string();
    {
        let c = db.lock();
        crate::sync::set_setting(&c, "whisperModele", &chemin).map_err(|e| e.to_string())?;
    }
    Ok(chemin)
}

/// Essaie la configuration et dit ce qui cloche, en clair.
#[tauri::command]
pub async fn whisper_tester(db: State<'_, Db>) -> R<String> {
    let Reglage { binaire, modele } = reglage(&db)?;
    if !Path::new(&modele).exists() {
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
