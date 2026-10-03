//! Transcrire dans l'application, sans rien installer autour.
//!
//! La version précédente appelait `whisper-cli` : il fallait ouvrir un
//! terminal, installer whisper.cpp, et retenir deux chemins. Un enseignant ne
//! fait pas cela, et une ESS en zone blanche ne se rattrape pas.
//!
//! Whisper tourne donc **dans** l'application, en Rust : candle porte le
//! modèle, et rien d'autre n'est requis — pas de bibliothèque C++, pas de
//! programme à côté, et la chaîne de publication reste une compilation Rust
//! ordinaire pour les deux plateformes.
//!
//! Seuls les poids se téléchargent, une fois, depuis les Réglages. Ensuite
//! l'audio ne sort plus jamais de la machine : ni pendant la réunion, ni
//! après.

use candle_core::{Device, IndexOp, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::whisper::{self as m, audio, model::Whisper, Config};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tokenizers::Tokenizer;

type R<T> = Result<T, String>;

/// Le banc de filtres mel de Whisper : 80 bandes sur 201 fréquences.
///
/// Les mêmes octets que le modèle de référence — un banc recalculé à la main
/// donnerait un spectrogramme légèrement différent, et une transcription
/// silencieusement dégradée.
const FILTRES_MEL: &[u8] = include_bytes!("../assets/melfilters.bytes");

/// Les modèles qu'on sait aller chercher, du plus rapide au plus juste.
pub const MODELES: &[(&str, &str, u64)] = &[
    ("tiny", "openai/whisper-tiny", 154_000_000),
    ("base", "openai/whisper-base", 293_000_000),
    ("small", "openai/whisper-small", 970_000_000),
];

/// Les trois fichiers d'un modèle : les poids, le vocabulaire, la forme.
const FICHIERS: [&str; 3] = ["model.safetensors", "tokenizer.json", "config.json"];

/// Le dossier d'un modèle téléchargé.
pub fn dossier_modele(nom: &str) -> PathBuf {
    crate::db::data_dir().join("Whisper").join(nom)
}

/// Les modèles complets sur cet ordinateur, du plus rapide au plus juste.
pub fn modeles_installes() -> Vec<String> {
    MODELES
        .iter()
        .map(|(nom, _, _)| *nom)
        .filter(|nom| est_complet(&dossier_modele(nom)))
        .map(str::to_string)
        .collect()
}

/// Un nom de modèle qu'on connaît : il finit dans un chemin, on ne prend pas n'importe quoi.
fn connu(nom: &str) -> R<()> {
    if MODELES.iter().any(|(n, _, _)| *n == nom) { Ok(()) } else { Err(format!("Modèle inconnu : {nom}")) }
}

/// Un modèle n'est utilisable que si ses trois fichiers sont là.
pub fn est_complet(dossier: &Path) -> bool {
    FICHIERS.iter().all(|f| {
        dossier
            .join(f)
            .metadata()
            .map(|m| m.len() > 0)
            .unwrap_or(false)
    })
}

/// Le modèle chargé en mémoire, gardé d'une réunion à l'autre.
pub struct Charge {
    pub nom: String,
    modele: Whisper,
    tokenizer: Tokenizer,
    device: Device,
    filtres: Vec<f32>,
    config: Config,
    /// Les jetons de service : début, langue, tâche, fin.
    depart: Vec<u32>,
    fin: u32,
    interdits: Vec<u32>,
}

/// Le moteur, partagé : charger 300 Mo à chaque phrase serait absurde.
#[derive(Default)]
pub struct Moteur(pub Mutex<Option<Charge>>);

/**
 * Le processeur, partout.
 *
 * Mesuré sur un portable : huit secondes de parole transcrites en deux
 * secondes avec le modèle « base ». C'est quatre fois plus rapide que la
 * parole — inutile d'exiger une carte graphique, ni d'ajouter une variante
 * de compilation par plateforme.
 */
fn appareil() -> Device {
    Device::Cpu
}

fn jeton(tokenizer: &Tokenizer, texte: &str) -> R<u32> {
    tokenizer
        .token_to_id(texte)
        .ok_or_else(|| format!("Jeton absent du vocabulaire : {texte}"))
}

impl Charge {
    /// Ouvre un modèle téléchargé. Quelques secondes, une fois par session.
    pub fn ouvrir(nom: &str) -> R<Self> {
        Self::ouvrir_dossier(nom, &dossier_modele(nom))
    }

    /// Le même, depuis un dossier donné : c'est par là que passent les essais.
    pub fn ouvrir_dossier(nom: &str, dossier: &Path) -> R<Self> {
        if !est_complet(dossier) {
            return Err(format!("Modèle « {nom} » incomplet : retéléchargez-le."));
        }
        let config: Config = serde_json::from_slice(
            &std::fs::read(dossier.join("config.json")).map_err(|e| format!("Lecture du modèle : {e}"))?,
        )
        .map_err(|e| format!("Forme du modèle illisible : {e}"))?;
        let tokenizer = Tokenizer::from_file(dossier.join("tokenizer.json"))
            .map_err(|e| format!("Vocabulaire illisible : {e}"))?;
        let device = appareil();
        let poids = dossier.join("model.safetensors");
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[poids], m::DTYPE, &device)
                .map_err(|e| format!("Poids illisibles : {e}"))?
        };
        let modele = Whisper::load(&vb, config.clone()).map_err(|e| format!("Modèle illisible : {e}"))?;

        let filtres: Vec<f32> = FILTRES_MEL
            .as_chunks::<4>().0.iter()
            .map(|o| f32::from_le_bytes([o[0], o[1], o[2], o[3]]))
            .collect();

        // Toujours le français, toujours la transcription (jamais la
        // traduction), et sans horodatage : on veut du texte à ranger.
        let depart = vec![
            jeton(&tokenizer, m::SOT_TOKEN)?,
            jeton(&tokenizer, "<|fr|>")?,
            jeton(&tokenizer, m::TRANSCRIBE_TOKEN)?,
            jeton(&tokenizer, m::NO_TIMESTAMPS_TOKEN)?,
        ];
        let fin = jeton(&tokenizer, m::EOT_TOKEN)?;
        let mut interdits = config.suppress_tokens.clone();
        for t in [m::SOT_TOKEN, m::TRANSCRIBE_TOKEN, m::TRANSLATE_TOKEN, m::NO_TIMESTAMPS_TOKEN] {
            if let Some(id) = tokenizer.token_to_id(t) {
                interdits.push(id);
            }
        }
        Ok(Self { nom: nom.to_string(), modele, tokenizer, device, filtres, config, depart, fin, interdits })
    }

    /// Transcrit un enregistrement, découpé en fenêtres de trente secondes.
    ///
    /// Whisper ne sait travailler que sur trente secondes : un passage plus
    /// court se complète de silence, un passage plus long se découpe.
    pub fn transcrire(&mut self, pcm: &[f32]) -> R<String> {
        let mut morceaux: Vec<String> = Vec::new();
        for fenetre in pcm.chunks(m::N_SAMPLES) {
            let mut plein = fenetre.to_vec();
            plein.resize(m::N_SAMPLES, 0.0);
            let texte = self.une_fenetre(&plein)?;
            if !texte.is_empty() {
                morceaux.push(texte);
            }
        }
        Ok(morceaux.join(" "))
    }

    fn une_fenetre(&mut self, pcm: &[f32]) -> R<String> {
        let bandes = self.config.num_mel_bins;
        let brut = audio::pcm_to_mel(&self.config, pcm, &self.filtres);
        let mel = recadrer_mel(&brut, bandes, m::N_FRAMES);
        let mel = Tensor::from_vec(mel, (1, bandes, m::N_FRAMES), &self.device)
            .map_err(|e| format!("Spectrogramme impossible : {e}"))?;

        self.modele.reset_kv_cache();
        let audio_features = self
            .modele
            .encoder
            .forward(&mel, true)
            .map_err(|e| format!("Analyse du son impossible : {e}"))?;

        let mut jetons = self.depart.clone();
        let plafond = self.config.max_target_positions.min(224);
        for i in 0..plafond {
            let entree = Tensor::new(jetons.as_slice(), &self.device)
                .and_then(|t| t.unsqueeze(0))
                .map_err(|e| format!("Décodage impossible : {e}"))?;
            let ys = self
                .modele
                .decoder
                .forward(&entree, &audio_features, i == 0)
                .map_err(|e| format!("Décodage impossible : {e}"))?;
            let (_, longueur, _) = ys.dims3().map_err(|e| e.to_string())?;
            let logits = ys
                .i((..1, longueur - 1.., ..))
                .and_then(|x| self.modele.decoder.final_linear(&x))
                .and_then(|x| x.i(0))
                .and_then(|x| x.i(0))
                .map_err(|e| format!("Décodage impossible : {e}"))?;
            let mut scores: Vec<f32> = logits.to_vec1().map_err(|e| e.to_string())?;
            for &t in &self.interdits {
                if let Some(v) = scores.get_mut(t as usize) {
                    *v = f32::NEG_INFINITY;
                }
            }
            let suivant = scores
                .iter()
                .enumerate()
                .max_by(|a, b| a.1.total_cmp(b.1))
                .map(|(i, _)| i as u32)
                .unwrap_or(self.fin);
            if suivant == self.fin {
                break;
            }
            jetons.push(suivant);
        }

        let texte = self
            .tokenizer
            .decode(&jetons[self.depart.len()..], true)
            .map_err(|e| format!("Texte illisible : {e}"))?;
        Ok(nettoyer(&texte))
    }
}

/**
 * Ramène le spectrogramme aux trames qu'attend l'encodeur.
 *
 * Le calcul ajoute d'office une fenêtre de silence — 4 500 trames pour les
 * 3 000 d'une demi-minute. Mais le tableau est rangé **bande par bande**, et
 * non trame par trame : le couper d'un bloc gardait cinquante-trois bandes
 * entières et jetait les vingt-sept autres. Le modèle ne recevait plus un
 * spectre, et répondait « ... » à toute parole.
 */
pub fn recadrer_mel(brut: &[f32], bandes: usize, trames_voulues: usize) -> Vec<f32> {
    let trames = brut.len().checked_div(bandes).unwrap_or(0);
    let mut sortie = Vec::with_capacity(bandes * trames_voulues);
    for bande in 0..bandes {
        for trame in 0..trames_voulues {
            sortie.push(if trame < trames { brut[bande * trames + trame] } else { 0.0 });
        }
    }
    sortie
}

/**
 * Ce que Whisper ajoute quand il n'a rien entendu.
 *
 * Sur un silence, le modèle invente : un sous-titrage de fin de film, un
 * remerciement. Ces phrases toutes faites n'ont rien à faire dans le compte
 * rendu d'une ESS.
 */
pub fn nettoyer(texte: &str) -> String {
    let propre = texte.split_whitespace().collect::<Vec<_>>().join(" ");
    let sans_accent = propre
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'à' | 'â' => 'a',
            'ô' | 'ö' => 'o',
            'î' | 'ï' => 'i',
            'ù' | 'û' | 'ü' => 'u',
            'ç' => 'c',
            c => c,
        })
        .collect::<String>();
    const HALLUCINATIONS: [&str; 6] = [
        "sous-titrage",
        "sous titrage",
        "merci d'avoir regarde",
        "merci a tous",
        "abonnez-vous",
        "amara.org",
    ];
    if HALLUCINATIONS.iter().any(|h| sans_accent.contains(h)) {
        return String::new();
    }
    propre
}

/**
 * Les échantillons d'un WAV 16 bits mono, ramenés entre -1 et 1.
 *
 * L'écoute envoie déjà du 16 kHz mono : on lit l'en-tête pour trouver les
 * données, sans supposer qu'elles commencent au quarante-cinquième octet —
 * certains encodeurs glissent d'autres morceaux avant.
 */
pub fn pcm_du_wav(octets: &[u8]) -> R<Vec<f32>> {
    if octets.len() < 12 || &octets[0..4] != b"RIFF" || &octets[8..12] != b"WAVE" {
        return Err("Ce n'est pas un enregistrement WAV.".into());
    }
    let mut i = 12;
    while i + 8 <= octets.len() {
        let nom = &octets[i..i + 4];
        let taille = u32::from_le_bytes([octets[i + 4], octets[i + 5], octets[i + 6], octets[i + 7]]) as usize;
        let debut = i + 8;
        let fin = debut.saturating_add(taille).min(octets.len());
        if nom == b"data" {
            return Ok(octets[debut..fin]
                .as_chunks::<2>().0.iter()
                .map(|o| i16::from_le_bytes([o[0], o[1]]) as f32 / 32768.0)
                .collect());
        }
        // Les morceaux sont alignés sur deux octets.
        i = debut + taille + (taille & 1);
    }
    Err("Enregistrement sans données audio.".into())
}

// ── Quel moteur, pour quoi ────────────────────────────────────────────────
//
// Trois usages, réglés chacun pour soi : les réunions, les observations
// d'élève (le Dictaphone du téléphone, la dictée d'atelier) et les dictées
// au micro de l'application. Chacun se transcrit sur cet ordinateur avec le
// modèle qu'on lui a choisi, ou en ligne — « small » pour une ESS qu'on veut
// juste, « base » pour les vocaux de la journée, qui ne font pas chauffer.

/// Ce à quoi sert une transcription.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Usage {
    Reunions,
    Observations,
    Dictees,
}

impl Usage {
    pub const TOUS: [Usage; 3] = [Usage::Reunions, Usage::Observations, Usage::Dictees];

    pub fn nom(self) -> &'static str {
        match self {
            Usage::Reunions => "reunions",
            Usage::Observations => "observations",
            Usage::Dictees => "dictees",
        }
    }

    pub fn depuis(nom: &str) -> R<Usage> {
        Usage::TOUS.into_iter().find(|u| u.nom() == nom).ok_or_else(|| format!("Usage de transcription inconnu : {nom}"))
    }

    /// Son réglage. Il reste sur cet ordinateur, comme les modèles : il n'est
    /// pas dans la liste de ce que la synchronisation emporte.
    pub fn cle(self) -> String {
        format!("transcription:{}", self.nom())
    }
}

/// Le réglage d'avant, commun à tous : « local » ou « ligne ». Il vaut encore
/// pour un usage qu'on n'a pas réglé.
pub const CLE_ANCIENNE: &str = "moteurTranscription";

/// Par quoi transcrire.
#[derive(Debug, PartialEq, Eq)]
pub enum Choix {
    /// Whisper, dans l'application, avec ce modèle : le son ne sort pas.
    Local(String),
    /// Le service en ligne.
    EnLigne,
}

const SANS_MODELE: &str = "Aucun modèle de transcription sur cet ordinateur. Dans Réglages › Assistant IA, \
    téléchargez-en un — ou choisissez la transcription en ligne.";

/// Le plus juste des modèles installés.
fn le_plus_juste(installes: &[String]) -> Option<String> {
    MODELES.iter().rev().map(|(n, _, _)| *n).find(|n| installes.iter().any(|i| i == n)).map(str::to_string)
}

/**
 * Le moteur d'un usage, d'après son réglage, l'ancien réglage commun et les
 * modèles présents.
 *
 * Un modèle choisi puis effacé laisse la place au plus juste de ceux qui
 * restent : l'audio ne sort toujours pas. Sans aucun modèle, un usage réglé
 * sur cet ordinateur refuse plutôt que d'envoyer en ligne ce qu'on voulait
 * garder.
 *
 * Un usage jamais réglé fait comme avant qu'on les distingue : les réunions
 * suivent l'ancien réglage, en ligne par défaut ; le reste se transcrit sur
 * l'ordinateur dès qu'un modèle y est.
 */
pub fn choix_de(usage: Usage, valeur: Option<&str>, ancien: Option<&str>, installes: &[String]) -> R<Choix> {
    let local = |voulu: Option<&str>| -> R<Choix> {
        voulu
            .filter(|m| installes.iter().any(|i| i == m))
            .map(str::to_string)
            .or_else(|| le_plus_juste(installes))
            .map(Choix::Local)
            .ok_or_else(|| SANS_MODELE.to_string())
    };
    match valeur {
        Some("ligne") => return Ok(Choix::EnLigne),
        Some(m) if connu(m).is_ok() => return local(Some(m)),
        _ => {}
    }
    match usage {
        Usage::Reunions if ancien == Some("local") => local(None),
        Usage::Reunions => Ok(Choix::EnLigne),
        _ if !installes.is_empty() => local(None),
        _ if ancien == Some("local") => Err(SANS_MODELE.into()),
        _ => Ok(Choix::EnLigne),
    }
}

/// Le moteur d'un usage, sur cet ordinateur, maintenant.
pub fn choix_ici(c: &rusqlite::Connection, usage: Usage) -> R<Choix> {
    let lire = |cle: &str| Some(crate::sync::get_setting(c, cle)).filter(|v| !v.is_empty());
    choix_de(usage, lire(&usage.cle()).as_deref(), lire(CLE_ANCIENNE).as_deref(), &modeles_installes())
}

// ── Ce que l'application demande ──────────────────────────────────────────

use crate::db::Db;
use tauri::{AppHandle, Emitter, State};

/// Ce que l'écran des réglages montre de la transcription sur cet ordinateur.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EtatWhisper {
    /// Les modèles sur cet ordinateur, et ce que chacun pèse sur le disque.
    pub installes: Vec<(String, u64)>,
    /// Les modèles qu'on peut aller chercher : nom, libellé, octets.
    pub disponibles: Vec<(String, String, u64)>,
    /// Où ils se rangent, pour qui veut aller voir.
    pub dossier: String,
    /// Ce que chaque usage emploie maintenant : un modèle, « ligne », ou rien
    /// s'il attend un modèle qui n'est pas là.
    pub usages: Vec<(String, String)>,
}

#[tauri::command]
pub fn whisper_etat(db: State<'_, Db>) -> R<EtatWhisper> {
    let poids = |nom: &str| std::fs::metadata(dossier_modele(nom).join("model.safetensors")).map(|m| m.len()).unwrap_or(0);
    let c = db.lock();
    let usages = Usage::TOUS
        .iter()
        .map(|u| {
            let vaut = match choix_ici(&c, *u) {
                Ok(Choix::Local(m)) => m,
                Ok(Choix::EnLigne) => "ligne".into(),
                Err(_) => String::new(),
            };
            (u.nom().to_string(), vaut)
        })
        .collect();
    Ok(EtatWhisper {
        installes: modeles_installes().into_iter().map(|n| { let o = poids(&n); (n, o) }).collect(),
        disponibles: MODELES.iter().map(|(n, d, o)| (n.to_string(), d.to_string(), *o)).collect(),
        dossier: crate::db::data_dir().join("Whisper").to_string_lossy().to_string(),
        usages,
    })
}

/// Ce que l'écran doit savoir pour transcrire un usage : où, et avec quel modèle.
#[derive(serde::Serialize)]
pub struct ChoixVu {
    pub moteur: &'static str,
    pub modele: String,
}

#[tauri::command]
pub fn transcription_choix(db: State<'_, Db>, usage: String) -> R<ChoixVu> {
    let usage = Usage::depuis(&usage)?;
    Ok(match choix_ici(&db.lock(), usage)? {
        Choix::Local(modele) => ChoixVu { moteur: "local", modele },
        Choix::EnLigne => ChoixVu { moteur: "ligne", modele: String::new() },
    })
}

#[derive(Clone, serde::Serialize)]
struct Avancement {
    fichier: String,
    faits: u64,
    total: u64,
}

/**
 * Va chercher un modèle et le pose dans les données de l'application.
 *
 * C'est le seul moment où la transcription a besoin du réseau : on le fait
 * une fois, chez soi, et la réunion de mardi se passe de tout. Chaque fichier
 * s'écrit sous un nom provisoire, renommé à la fin : une coupure ne laisse
 * pas un modèle tronqué qui passerait pour bon.
 */
#[tauri::command]
pub async fn whisper_telecharger_modele(app: AppHandle, db: State<'_, Db>, nom: String) -> R<String> {
    let (_, depot, _) = MODELES
        .iter()
        .find(|(n, _, _)| *n == nom)
        .ok_or_else(|| format!("Modèle inconnu : {nom}"))?;
    let dossier = dossier_modele(&nom);
    std::fs::create_dir_all(&dossier).map_err(|e| format!("Dossier impossible à créer : {e}"))?;

    for fichier in FICHIERS {
        let cible = dossier.join(fichier);
        if cible.metadata().map(|m| m.len() > 0).unwrap_or(false) {
            continue; // déjà là : on ne retélécharge pas trois cents méga-octets
        }
        let url = format!("https://huggingface.co/{depot}/resolve/main/{fichier}");
        let provisoire = dossier.join(format!("{fichier}.part"));
        let mut reponse = reqwest::get(&url).await.map_err(|e| format!("Réseau : {e}"))?;
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
                let _ = app.emit("whisper://avancement", Avancement { fichier: fichier.to_string(), faits, total });
            }
            f.flush().map_err(|e| format!("Écriture impossible : {e}"))?;
        }
        std::fs::rename(&provisoire, &cible).map_err(|e| format!("Impossible de ranger le fichier : {e}"))?;
    }

    // Télécharger un modèle, c'est vouloir s'en servir : les réunions qu'on
    // n'a pas réglées passent sur cet ordinateur sans le redemander. Un usage
    // réglé garde son choix (voir `choix_de`).
    {
        let c = db.lock();
        crate::sync::set_setting(&c, "moteurTranscription", "local").map_err(|e| e.to_string())?;
    }
    Ok(nom)
}

/// Le modèle demandé, chargé en mémoire s'il ne l'est pas déjà.
fn avec_le_modele<T>(moteur: &State<'_, Moteur>, nom: &str, f: impl FnOnce(&mut Charge) -> R<T>) -> R<T> {
    connu(nom)?;
    let mut garde = moteur.0.lock().map_err(|_| "Moteur occupé.".to_string())?;
    if garde.as_ref().map(|c| c.nom != nom).unwrap_or(true) {
        *garde = Some(Charge::ouvrir(nom)?);
    }
    f(garde.as_mut().expect("chargé juste au-dessus"))
}

/**
 * Transcrit un WAV déjà en mémoire, sur cette machine, avec ce modèle — ou,
 * sans modèle nommé, avec le plus juste de ceux qui sont là.
 *
 * Le modèle reste chargé d'un passage à l'autre : relire trois cents
 * méga-octets à chaque phrase coûterait plus cher que la transcription.
 */
pub fn transcrire_octets(moteur: &State<'_, Moteur>, octets: &[u8], modele: &str) -> R<String> {
    let pcm = pcm_du_wav(octets)?;
    if pcm.is_empty() {
        return Err("Enregistrement vide.".into());
    }
    let voulu = if modele.is_empty() {
        le_plus_juste(&modeles_installes()).ok_or(SANS_MODELE)?
    } else {
        modele.to_string()
    };
    avec_le_modele(moteur, &voulu, |c| c.transcrire(&pcm))
}

/// Transcrit un enregistrement (WAV 16 kHz mono, en base64) sur la machine.
#[tauri::command]
pub async fn transcrire_local(moteur: State<'_, Moteur>, audio_b64: String, modele: Option<String>) -> R<String> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(audio_b64.as_bytes())
        .map_err(|e| format!("Audio illisible : {e}"))?;
    transcrire_octets(&moteur, &octets, modele.as_deref().unwrap_or(""))
}

/// Charge un modèle et lui fait transcrire une seconde de silence : dit ce qui cloche, en clair.
#[tauri::command]
pub async fn whisper_tester(moteur: State<'_, Moteur>, modele: String) -> R<String> {
    let debut = std::time::Instant::now();
    avec_le_modele(&moteur, &modele, |c| c.transcrire(&vec![0f32; m::SAMPLE_RATE]))?;
    Ok(format!("« {modele} » prêt en {} s", debut.elapsed().as_secs_f32().round()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wav(echantillons: &[i16]) -> Vec<u8> {
        let donnees: Vec<u8> = echantillons.iter().flat_map(|e| e.to_le_bytes()).collect();
        let mut v = Vec::new();
        v.extend(b"RIFF");
        v.extend(((36 + donnees.len()) as u32).to_le_bytes());
        v.extend(b"WAVEfmt ");
        v.extend(16u32.to_le_bytes());
        v.extend(1u16.to_le_bytes());
        v.extend(1u16.to_le_bytes());
        v.extend(16000u32.to_le_bytes());
        v.extend(32000u32.to_le_bytes());
        v.extend(2u16.to_le_bytes());
        v.extend(16u16.to_le_bytes());
        v.extend(b"data");
        v.extend((donnees.len() as u32).to_le_bytes());
        v.extend(donnees);
        v
    }

    #[test]
    fn lit_les_echantillons_d_un_wav() {
        let p = pcm_du_wav(&wav(&[0, 16384, -32768])).unwrap();
        assert_eq!(p.len(), 3);
        assert!((p[1] - 0.5).abs() < 1e-6);
        assert!((p[2] + 1.0).abs() < 1e-6);
    }

    #[test]
    fn saute_un_morceau_inattendu_avant_les_donnees() {
        // Un encodeur glisse parfois « LIST » avant « data » : compter
        // quarante-quatre octets donnerait du bruit.
        let mut v = wav(&[1000, 2000]);
        let mut avec_liste = v[..36].to_vec();
        avec_liste.extend(b"LIST");
        avec_liste.extend(4u32.to_le_bytes());
        avec_liste.extend(b"INFO");
        avec_liste.extend(&v.split_off(36));
        assert_eq!(pcm_du_wav(&avec_liste).unwrap().len(), 2);
    }

    #[test]
    fn refuse_ce_qui_n_est_pas_un_wav() {
        assert!(pcm_du_wav(b"pas du tout").is_err());
        assert!(pcm_du_wav(&[]).is_err());
    }

    #[test]
    fn recadre_bande_par_bande_et_non_d_un_bloc() {
        // Deux bandes de quatre trames : on en veut trois par bande. Couper
        // le tableau d'un bloc rendrait [0,1,2,3,10,11] — la première bande
        // entière, puis le début de la seconde.
        let brut = vec![0., 1., 2., 3., 10., 11., 12., 13.];
        assert_eq!(recadrer_mel(&brut, 2, 3), vec![0., 1., 2., 10., 11., 12.]);
    }

    #[test]
    fn complete_de_silence_une_bande_trop_courte() {
        assert_eq!(recadrer_mel(&[0., 1., 10., 11.], 2, 3), vec![0., 1., 0., 10., 11., 0.]);
        assert!(recadrer_mel(&[], 0, 3).is_empty());
    }

    #[test]
    fn le_banc_de_filtres_a_la_bonne_forme() {
        // 80 bandes sur 201 fréquences : une erreur ici passerait inaperçue et
        // dégraderait toutes les transcriptions.
        assert_eq!(FILTRES_MEL.len(), 80 * 201 * 4);
    }

    /**
     * Transcrire pour de vrai, avec un modèle téléchargé.
     *
     * Ignoré par défaut : il faut les poids, qui pèsent trois cents méga-octets.
     *   MAITRIZE_MODELE=/…/base MAITRIZE_WAV=/…/essai.wav \
     *     cargo test transcrit_vraiment -- --ignored --nocapture
     */
    #[test]
    #[ignore]
    fn transcrit_vraiment() {
        let dossier = std::env::var("MAITRIZE_MODELE").expect("MAITRIZE_MODELE");
        let wav = std::env::var("MAITRIZE_WAV").expect("MAITRIZE_WAV");
        let debut = std::time::Instant::now();
        let mut charge = Charge::ouvrir_dossier("essai", Path::new(&dossier)).unwrap();
        println!("chargement : {:?}", debut.elapsed());
        let pcm = pcm_du_wav(&std::fs::read(&wav).unwrap()).unwrap();
        let crete = pcm.iter().fold(0f32, |a, b| a.max(b.abs()));
        let rms = (pcm.iter().map(|x| x * x).sum::<f32>() / pcm.len() as f32).sqrt();
        println!("pcm : {} échantillons, crête {crete:.3}, rms {rms:.4}", pcm.len());
        let secondes = pcm.len() as f32 / 16000.0;
        let debut = std::time::Instant::now();
        let texte = charge.transcrire(&pcm).unwrap();
        let mis = debut.elapsed();
        println!("{secondes:.1} s d'audio transcrites en {mis:?}");
        println!("→ {texte}");
        assert!(texte.to_lowercase().contains("famille"), "texte obtenu : {texte}");
    }

    fn noms(n: &[&str]) -> Vec<String> {
        n.iter().map(|x| x.to_string()).collect()
    }

    #[test]
    fn chaque_usage_prend_le_modele_qu_on_lui_a_choisi() {
        let deux = noms(&["base", "small"]);
        assert_eq!(choix_de(Usage::Observations, Some("base"), None, &deux), Ok(Choix::Local("base".into())));
        assert_eq!(choix_de(Usage::Reunions, Some("small"), Some("ligne"), &deux), Ok(Choix::Local("small".into())));
        assert_eq!(choix_de(Usage::Dictees, Some("ligne"), Some("local"), &deux), Ok(Choix::EnLigne));
        // Un modèle choisi puis effacé : un autre de cet ordinateur, jamais le réseau.
        assert_eq!(choix_de(Usage::Dictees, Some("tiny"), None, &deux), Ok(Choix::Local("small".into())));
        let erreur = choix_de(Usage::Dictees, Some("tiny"), None, &[]).unwrap_err();
        assert!(erreur.contains("Réglages") && erreur.contains("en ligne"), "{erreur}");
    }

    #[test]
    fn un_usage_jamais_regle_fait_comme_avant() {
        let un = noms(&["base"]);
        // Les réunions suivent l'ancien réglage commun, en ligne par défaut.
        assert_eq!(choix_de(Usage::Reunions, None, None, &un), Ok(Choix::EnLigne));
        assert_eq!(choix_de(Usage::Reunions, None, Some("local"), &un), Ok(Choix::Local("base".into())));
        assert!(choix_de(Usage::Reunions, None, Some("local"), &[]).is_err());
        // Le reste se transcrit sur l'ordinateur dès qu'un modèle y est, quel que soit l'ancien réglage…
        for usage in [Usage::Observations, Usage::Dictees] {
            assert_eq!(choix_de(usage, None, Some("ligne"), &un), Ok(Choix::Local("base".into())));
            assert_eq!(choix_de(usage, None, None, &noms(&["tiny", "small"])), Ok(Choix::Local("small".into())));
            // … et en ligne sans modèle, sauf si l'on avait voulu le local : on le dit plutôt que d'envoyer.
            assert_eq!(choix_de(usage, None, None, &[]), Ok(Choix::EnLigne));
            assert!(choix_de(usage, None, Some("local"), &[]).is_err());
        }
        // Une valeur qu'on ne connaît pas compte pour rien.
        assert_eq!(choix_de(Usage::Dictees, Some("../../ailleurs"), None, &un), Ok(Choix::Local("base".into())));
    }

    #[test]
    fn les_usages_et_leurs_reglages() {
        assert_eq!(Usage::depuis("observations"), Ok(Usage::Observations));
        assert!(Usage::depuis("autre").is_err());
        assert_eq!(Usage::Dictees.cle(), "transcription:dictees");
        assert!(connu("small").is_ok() && connu("../small").is_err());
    }

    #[test]
    fn ecarte_les_phrases_inventees_sur_un_silence() {
        assert_eq!(nettoyer("Sous-titrage Société Radio-Canada"), "");
        assert_eq!(nettoyer("  Merci d'avoir regardé  cette vidéo "), "");
        assert_eq!(nettoyer("La famille  est arrivée"), "La famille est arrivée");
    }
}
