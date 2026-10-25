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
use crate::noms_entendus;
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
    /// Le jeton qui annonce « ce qui a été dit avant » : les noms qu'on y
    /// glisse, le modèle les écrit ensuite comme on les lui a montrés.
    avant: Option<u32>,
}

/// Ce qu'on montre au modèle avant la seconde écoute : quelques prénoms, loin
/// de la moitié de son contexte (448 jetons), qu'il faut garder au texte.
const JETONS_DE_L_INVITE: usize = 100;

/// Les jetons d'une fenêtre de trente secondes, au plus.
const PLAFOND: usize = 224;

/// Les jetons d'une commande de la télécommande, au plus : une commande ne s'étire pas.
const JETONS_D_UNE_COMMANDE: usize = 48;

/// Ce qu'on montre au modèle avant une commande, au plus : guère plus, il écouterait moins le son.
const JETONS_DE_L_INVITE_COMMANDE: usize = 160;

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
        let avant = tokenizer.token_to_id("<|startofprev|>");
        let mut interdits = config.suppress_tokens.clone();
        for t in [m::SOT_TOKEN, m::TRANSCRIBE_TOKEN, m::TRANSLATE_TOKEN, m::NO_TIMESTAMPS_TOKEN, "<|startofprev|>"] {
            if let Some(id) = tokenizer.token_to_id(t) {
                interdits.push(id);
            }
        }
        Ok(Self { nom: nom.to_string(), modele, tokenizer, device, filtres, config, depart, fin, interdits, avant })
    }

    /// Transcrit un enregistrement, découpé en fenêtres de trente secondes.
    ///
    /// Whisper ne sait travailler que sur trente secondes : un passage plus
    /// court se complète de silence, un passage plus long se découpe.
    ///
    /// `noms` : ceux qu'il doit savoir écrire — les élèves de la classe (voir
    /// `noms_entendus`). Quand la première écoute a écrit un mot qui
    /// ressemble à l'un d'eux sans l'être, le même passage se réécoute, les
    /// prénoms montrés avant, et l'on n'en garde que les prénoms.
    pub fn transcrire(&mut self, pcm: &[f32], noms: &[String]) -> R<String> {
        let depart = self.depart.clone();
        let mut morceaux: Vec<String> = Vec::new();
        for fenetre in pcm.chunks(m::N_SAMPLES) {
            let mut plein = fenetre.to_vec();
            plein.resize(m::N_SAMPLES, 0.0);
            let son = self.ecouter(&plein)?;
            let mut texte = self.ecrire(&son, &depart, PLAFOND)?;
            let proches = noms_entendus::prenoms_proches(&texte, noms);
            if let Some(guide) = self.prefixe(&self.invite_qui_tient(&proches)?)? {
                // Guère plus long que la première : une écoute qui divague s'arrête là.
                let plafond = self.encoder(&texte)?.len() + 16;
                let reecoute = self.ecrire(&son, &guide, plafond)?;
                texte = noms_entendus::corriger_les_noms(&texte, &reecoute, noms);
            }
            if !texte.is_empty() {
                morceaux.push(texte);
            }
        }
        Ok(morceaux.join(" "))
    }

    /// Une commande de la télécommande : une phrase brève, écoutée après `invite` — des commandes du même genre,
    /// comme si elles venaient d'être dites. Sans elles, Whisper invente sur deux mots (« Plein écran » devenait
    /// « Médical ») ; avec, il écrit le vocabulaire qu'on lui a montré. Une seule fenêtre : une commande tient
    /// en trente secondes.
    pub fn transcrire_commande(&mut self, pcm: &[f32], invite: &str) -> R<String> {
        let mut plein = pcm[..pcm.len().min(m::N_SAMPLES)].to_vec();
        plein.resize(m::N_SAMPLES, 0.0);
        let son = self.ecouter(&plein)?;
        let invite = self.debut_qui_tient(invite, JETONS_DE_L_INVITE_COMMANDE)?;
        let guide = self.prefixe(&invite)?.unwrap_or_else(|| self.depart.clone());
        self.ecrire(&son, &guide, JETONS_D_UNE_COMMANDE)
    }

    /// Les premières phrases de `texte` qui tiennent en `max` jetons : une phrase entière, ou rien d'elle.
    fn debut_qui_tient(&self, texte: &str, max: usize) -> R<String> {
        let mut garde = String::new();
        for phrase in texte.split_inclusive(". ") {
            let essai = format!("{garde}{phrase}");
            if self.encoder(essai.trim_end())?.len() > max {
                break;
            }
            garde = essai;
        }
        Ok(garde.trim_end().to_string())
    }

    fn encoder(&self, texte: &str) -> R<Vec<u32>> {
        // L'espace en tête, comme dans le texte que le modèle a appris.
        Ok(self
            .tokenizer
            .encode(format!(" {texte}"), false)
            .map_err(|e| format!("Noms illisibles : {e}"))?
            .get_ids()
            .to_vec())
    }

    /// Les noms à montrer, sans dépasser la place qu'on leur donne : on retire
    /// les derniers plutôt que d'en couper un en deux, ce qui apprendrait au
    /// modèle une orthographe qui n'existe pas.
    fn invite_qui_tient(&self, noms: &[String]) -> R<String> {
        for n in (1..=noms.len()).rev() {
            let invite = invite_des_noms(&noms[..n]);
            if !invite.is_empty() && self.encoder(&invite)?.len() <= JETONS_DE_L_INVITE {
                return Ok(invite);
            }
        }
        Ok(String::new())
    }

    /// Ce qui précède l'audio pour la seconde écoute : les noms, comme un texte
    /// déjà entendu, puis les jetons de service. Rien sans nom.
    fn prefixe(&self, invite: &str) -> R<Option<Vec<u32>>> {
        let Some(avant) = self.avant.filter(|_| !invite.is_empty()) else {
            return Ok(None);
        };
        let mut prefixe = vec![avant];
        prefixe.extend(self.encoder(invite)?);
        prefixe.extend(&self.depart);
        Ok(Some(prefixe))
    }

    /// Le son d'une fenêtre, tel que le décodeur le lit — une fois pour les deux écoutes.
    fn ecouter(&mut self, pcm: &[f32]) -> R<Tensor> {
        let bandes = self.config.num_mel_bins;
        let brut = audio::pcm_to_mel(&self.config, pcm, &self.filtres);
        let mel = recadrer_mel(&brut, bandes, m::N_FRAMES);
        let mel = Tensor::from_vec(mel, (1, bandes, m::N_FRAMES), &self.device)
            .map_err(|e| format!("Spectrogramme impossible : {e}"))?;

        self.modele.reset_kv_cache();
        self.modele
            .encoder
            .forward(&mel, true)
            .map_err(|e| format!("Analyse du son impossible : {e}"))
    }

    /// Le texte d'une fenêtre, après `prefixe`, en `plafond` jetons au plus.
    fn ecrire(&mut self, audio_features: &Tensor, prefixe: &[u32], plafond: usize) -> R<String> {
        let mut jetons = prefixe.to_vec();
        // Le texte et ce qui le précède partagent les 448 positions du modèle.
        let plafond = self.config.max_target_positions.saturating_sub(prefixe.len()).min(plafond);
        for i in 0..plafond {
            let entree = Tensor::new(jetons.as_slice(), &self.device)
                .and_then(|t| t.unsqueeze(0))
                .map_err(|e| format!("Décodage impossible : {e}"))?;
            let ys = self
                .modele
                .decoder
                .forward(&entree, audio_features, i == 0)
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
            .decode(&jetons[prefixe.len()..], true)
            .map_err(|e| format!("Texte illisible : {e}"))?;
        Ok(nettoyer(&texte))
    }
}

/**
 * Un nom tel qu'il s'écrit dans une phrase : « THANH » devient « Thanh »,
 * « MARIE-PAULE » « Marie-Paule ».
 *
 * La liste des élèves est souvent tapée en capitales ; montrées telles
 * quelles, elles pousseraient le modèle à crier les prénoms. Un nom qui a
 * déjà ses minuscules reste comme on l'a écrit.
 */
pub fn comme_un_prenom(nom: &str) -> String {
    let nom = nom.split_whitespace().collect::<Vec<_>>().join(" ");
    if nom.chars().any(char::is_lowercase) {
        return nom;
    }
    let mut sortie = String::with_capacity(nom.len());
    let mut debut = true;
    for c in nom.chars() {
        if debut { sortie.extend(c.to_uppercase()) } else { sortie.extend(c.to_lowercase()) }
        debut = !c.is_alphabetic();
    }
    sortie
}

/**
 * Ce qu'on montre au modèle avant la seconde écoute : « Ce matin, j'ai
 * travaillé avec Thanh et Siaka. » ; rien sans nom.
 *
 * Une phrase comme celles qu'on dicte, et non une liste : sur les mêmes
 * enregistrements, « Thanh, Siaka. » ou « Les élèves : … » laissaient le
 * prénom mal écrit, la phrase le faisait écrire juste.
 */
pub fn invite_des_noms(noms: &[String]) -> String {
    let mut vus: Vec<String> = Vec::new();
    for nom in noms.iter().map(|n| comme_un_prenom(n)).filter(|n| !n.is_empty()) {
        // Ni virgule ni point dans un nom : ils servent à séparer.
        let nom = nom.replace([',', '.'], " ").split_whitespace().collect::<Vec<_>>().join(" ");
        if !nom.is_empty() && !vus.contains(&nom) {
            vus.push(nom);
        }
    }
    match vus.split_last() {
        None => String::new(),
        Some((seul, [])) => format!("Ce matin, j'ai travaillé avec {seul}."),
        Some((dernier, autres)) => format!("Ce matin, j'ai travaillé avec {} et {dernier}.", autres.join(", ")),
    }
}

/// Les élèves de la classe, que la transcription doit savoir écrire.
pub fn noms_de_la_classe(c: &rusqlite::Connection) -> Vec<String> {
    c.prepare("SELECT nom FROM eleves ORDER BY nom COLLATE NOCASE")
        .and_then(|mut st| st.query_map([], |r| r.get::<_, String>(0))?.collect())
        .unwrap_or_default()
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
// Trois usages : les réunions, les observations d'élève (le Dictaphone du
// téléphone) et les dictées au micro de l'application. Chacun a son réglage,
// mais Réglages les écrit ensemble d'un seul choix (demande de l'enseignant,
// octobre 2026) : sur cet ordinateur avec tel modèle, ou en ligne.

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
 * La voix parle d'élèves : elle ne part en ligne que si l'enseignant l'a
 * choisi — pour cet usage, ou dans l'ancien réglage commun. Sinon elle se
 * transcrit sur l'ordinateur ; sans modèle, l'usage refuse et dit comment
 * faire, plutôt que d'envoyer sans qu'on l'ait voulu.
 *
 * Un modèle choisi puis effacé laisse la place au plus juste de ceux qui
 * restent : l'audio ne sort toujours pas.
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
        // Les réunions suivaient l'ancien réglage commun : en ligne seulement s'il le disait.
        Usage::Reunions if ancien == Some("ligne") => Ok(Choix::EnLigne),
        _ if !installes.is_empty() => local(None),
        // Le reste : un modèle d'abord ; en ligne si on l'avait choisi autrefois ; sinon, on le dit.
        Usage::Observations | Usage::Dictees if ancien == Some("ligne") => Ok(Choix::EnLigne),
        _ => Err(SANS_MODELE.into()),
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
 *
 * `noms` : ceux qu'il doit savoir écrire (voir `Charge::transcrire`).
 */
pub fn transcrire_octets(moteur: &State<'_, Moteur>, octets: &[u8], modele: &str, noms: &[String]) -> R<String> {
    let pcm = pcm_du_wav(octets)?;
    if pcm.is_empty() {
        return Err("Enregistrement vide.".into());
    }
    avec_le_modele(moteur, &modele_voulu(modele)?, |c| c.transcrire(&pcm, noms))
}

/// Une commande de la télécommande, écoutée après `invite` (voir `Charge::transcrire_commande`).
pub fn transcrire_une_commande(moteur: &State<'_, Moteur>, octets: &[u8], modele: &str, invite: &str) -> R<String> {
    let pcm = pcm_du_wav(octets)?;
    if pcm.is_empty() {
        return Err("Enregistrement vide.".into());
    }
    avec_le_modele(moteur, &modele_voulu(modele)?, |c| c.transcrire_commande(&pcm, invite))
}

/// Ce modèle-là, ou, sans modèle nommé, le plus juste de ceux qui sont là.
fn modele_voulu(modele: &str) -> R<String> {
    if modele.is_empty() {
        le_plus_juste(&modeles_installes()).ok_or_else(|| SANS_MODELE.to_string())
    } else {
        Ok(modele.to_string())
    }
}

/**
 * Transcrit un enregistrement (WAV 16 kHz mono, en base64) sur la machine.
 *
 * `avec_les_noms` : les prénoms de la classe s'écrivent juste, au prix d'une
 * seconde écoute quand un mot leur ressemble. Une dictée le demande ; une
 * réunion, qui doit suivre la parole, non.
 */
#[tauri::command]
pub async fn transcrire_local(
    db: State<'_, Db>,
    moteur: State<'_, Moteur>,
    audio_b64: String,
    modele: Option<String>,
    avec_les_noms: Option<bool>,
) -> R<String> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(audio_b64.as_bytes())
        .map_err(|e| format!("Audio illisible : {e}"))?;
    let noms = if avec_les_noms.unwrap_or(false) { noms_de_la_classe(&db.lock()) } else { Vec::new() };
    transcrire_octets(&moteur, &octets, modele.as_deref().unwrap_or(""), &noms)
}

/// Charge un modèle et lui fait transcrire une seconde de silence : dit ce qui cloche, en clair.
#[tauri::command]
pub async fn whisper_tester(moteur: State<'_, Moteur>, modele: String) -> R<String> {
    let debut = std::time::Instant::now();
    avec_le_modele(&moteur, &modele, |c| c.transcrire(&vec![0f32; m::SAMPLE_RATE], &[]))?;
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
        // MAITRIZE_NOMS="THANH,SIAKA" : les élèves ; MAITRIZE_INVITE, pour
        // essayer une autre façon de les montrer à la seconde écoute.
        let noms: Vec<String> = std::env::var("MAITRIZE_NOMS")
            .map(|n| n.split(',').filter(|n| !n.is_empty()).map(str::to_string).collect())
            .unwrap_or_default();
        let debut = std::time::Instant::now();
        let texte = match std::env::var("MAITRIZE_INVITE") {
            Ok(gabarit) => {
                // Les deux écoutes d'une fenêtre, montrées l'une après l'autre ;
                // MAITRIZE_INVITE="Bilan avec {noms}." : la façon de montrer les prénoms.
                let mut plein = pcm.clone();
                plein.resize(m::N_SAMPLES, 0.0);
                let son = charge.ecouter(&plein).unwrap();
                let entendu = charge.ecrire(&son, &charge.depart.clone(), PLAFOND).unwrap();
                let proches = noms_entendus::prenoms_proches(&entendu, &noms);
                println!("1re écoute → {entendu}");
                println!("proches    → {proches:?}");
                if proches.is_empty() {
                    entendu
                } else {
                    let invite = gabarit.replace("{noms}", &proches.join(", "));
                    let guide = charge.prefixe(&invite).unwrap().unwrap();
                    let plafond = charge.encoder(&entendu).unwrap().len() + 16;
                    let reecoute = charge.ecrire(&son, &guide, plafond).unwrap();
                    println!("2e écoute  → {reecoute}");
                    noms_entendus::corriger_les_noms(&entendu, &reecoute, &noms)
                }
            }
            Err(_) => charge.transcrire(&pcm, &noms).unwrap(),
        };
        let mis = debut.elapsed();
        println!("{secondes:.1} s d'audio transcrites en {mis:?}");
        println!("→ {texte}");
        let attendu = std::env::var("MAITRIZE_ATTENDU").unwrap_or_else(|_| "famille".into());
        assert!(texte.to_lowercase().contains(&attendu.to_lowercase()), "texte obtenu : {texte}");
    }

    /**
     * Les commandes de la télécommande, transcrites pour de vrai : sans rien avant, puis après `MAITRIZE_INVITE_COMMANDE`.
     *   MAITRIZE_MODELE=/…/small MAITRIZE_DOSSIER=/…/voix MAITRIZE_INVITE_COMMANDE="Minuteur cinq minutes. …" \
     *     cargo test transcrit_des_commandes -- --ignored --nocapture
     */
    #[test]
    #[ignore]
    fn transcrit_des_commandes() {
        let dossier = std::env::var("MAITRIZE_MODELE").expect("MAITRIZE_MODELE");
        let voix = std::env::var("MAITRIZE_DOSSIER").expect("MAITRIZE_DOSSIER");
        let invite = std::env::var("MAITRIZE_INVITE_COMMANDE").unwrap_or_default();
        let mut charge = Charge::ouvrir_dossier("essai", Path::new(&dossier)).unwrap();
        let mut fichiers: Vec<_> = std::fs::read_dir(&voix)
            .unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().is_some_and(|x| x == "wav"))
            .collect();
        fichiers.sort();
        for f in fichiers {
            let pcm = pcm_du_wav(&std::fs::read(&f).unwrap()).unwrap();
            let seul = charge.transcrire_commande(&pcm, "").unwrap();
            let guide = charge.transcrire_commande(&pcm, &invite).unwrap();
            println!("{}\t{seul}\t{guide}", f.file_stem().unwrap().to_string_lossy());
        }
    }

    #[test]
    fn ecrit_les_noms_comme_dans_une_phrase() {
        assert_eq!(comme_un_prenom("THANH"), "Thanh");
        assert_eq!(comme_un_prenom("MARIE-PAULE"), "Marie-Paule");
        assert_eq!(comme_un_prenom("N'GOLO  KANTÉ"), "N'Golo Kanté");
        assert_eq!(comme_un_prenom("ÉLODIE"), "Élodie");
        // Des minuscules : on garde ce que l'enseignant a écrit.
        assert_eq!(comme_un_prenom("Siaka"), "Siaka");
        assert_eq!(comme_un_prenom("McKenzie"), "McKenzie");
    }

    #[test]
    fn l_invite_nomme_chaque_eleve_une_fois() {
        let classe = noms(&["THANH", "Siaka", "", "Thanh", "Lou, Anne"]);
        // La virgule d'un nom ne le coupe pas en deux élèves.
        assert_eq!(invite_des_noms(&classe), "Ce matin, j'ai travaillé avec Thanh, Siaka et Lou Anne.");
        assert_eq!(invite_des_noms(&noms(&["SIAKA"])), "Ce matin, j'ai travaillé avec Siaka.");
        assert_eq!(invite_des_noms(&[]), "");
    }

    #[test]
    fn lit_les_noms_de_la_classe() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        c.execute_batch("CREATE TABLE eleves (id TEXT, nom TEXT); INSERT INTO eleves VALUES ('1','siaka'),('2','THANH'),('3','Lou-Anne');")
            .unwrap();
        assert_eq!(noms_de_la_classe(&c), noms(&["Lou-Anne", "siaka", "THANH"]));
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
    fn un_usage_jamais_regle_ne_part_pas_en_ligne_sans_qu_on_l_ait_choisi() {
        let un = noms(&["base"]);
        // Les réunions : sur l'ordinateur ; en ligne seulement si l'ancien réglage commun le disait.
        assert_eq!(choix_de(Usage::Reunions, None, None, &un), Ok(Choix::Local("base".into())));
        assert_eq!(choix_de(Usage::Reunions, None, Some("ligne"), &un), Ok(Choix::EnLigne));
        assert!(choix_de(Usage::Reunions, None, None, &[]).is_err());
        assert!(choix_de(Usage::Reunions, None, Some("local"), &[]).is_err());
        // Le reste se transcrit sur l'ordinateur dès qu'un modèle y est, quel que soit l'ancien réglage…
        for usage in [Usage::Observations, Usage::Dictees] {
            assert_eq!(choix_de(usage, None, Some("ligne"), &un), Ok(Choix::Local("base".into())));
            assert_eq!(choix_de(usage, None, None, &noms(&["tiny", "small"])), Ok(Choix::Local("small".into())));
            // … et sans modèle, en ligne seulement si on l'avait choisi : sinon on le dit plutôt que d'envoyer.
            assert_eq!(choix_de(usage, None, Some("ligne"), &[]), Ok(Choix::EnLigne));
            let erreur = choix_de(usage, None, None, &[]).unwrap_err();
            assert!(erreur.contains("Réglages") && erreur.contains("en ligne"), "{erreur}");
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
