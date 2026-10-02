//! Banque de pictogrammes ARASAAC, stockée localement une fois pour toutes.
//!
//! Deux choix de conception structurent ce module.
//!
//! D'abord, **aucune IA dans la boucle de sélection**. Demander à un modèle
//! quels mots illustrent un thème, ou quel picto illustre un mot, produit des
//! intrus : un dinosaure dans « l'espace », un drapeau à la place d'un astre.
//! On part donc des catégories de la banque elle-même. Un picto rangé dans
//! `terrestrial animal` par ARASAAC est un animal terrestre, sans discussion.
//!
//! Ensuite, **hors ligne**. La banque descend une fois (13 800 pictos, environ
//! 330 Mo) dans le dossier de données de l'application ; ni la fabrication des
//! jeux ni leur impression ne demandent ensuite de réseau. C'est la condition
//! pour s'en servir dans une classe dont la connexion est incertaine.

use crate::db::data_dir;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::path::PathBuf;
use std::sync::{Mutex, PoisonError};
use tauri::{AppHandle, Emitter};

const API_METADATA: &str = "https://api.arasaac.org/api/pictograms/all/fr";
const IMAGE_BASE: &str = "https://static.arasaac.org/pictograms";
/// Requêtes d'images menées de front. Au-delà, l'API commence à refuser.
const PARALLELE: usize = 8;

pub fn banque_dir() -> PathBuf {
    let dir = data_dir().join("ARASAAC");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn images_dir() -> PathBuf {
    let dir = banque_dir().join("images");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn metadata_path() -> PathBuf {
    banque_dir().join("metadata.json")
}

// ── Lecture des métadonnées ────────────────────────────────────────────────
//
// Le fichier est un unique tableau JSON sur une seule ligne : il se parse d'un
// bloc, jamais ligne à ligne.

#[derive(Deserialize, Default)]
struct MotCle {
    #[serde(default)]
    keyword: String,
    /// La nature du mot chez ARASAAC : 2 pour un nom commun, 3 pour un verbe.
    #[serde(default, rename = "type")]
    sorte: Option<i64>,
    #[serde(default)]
    plural: Option<String>,
}

#[derive(Deserialize, Default)]
struct PictoBrut {
    #[serde(rename = "_id")]
    id: i64,
    #[serde(default)]
    keywords: Vec<MotCle>,
    #[serde(default)]
    categories: Vec<String>,
    /// Les deux marques qu'ARASAAC pose sur les dessins à ne pas montrer sans y penser.
    #[serde(default)]
    sex: bool,
    #[serde(default)]
    violence: bool,
}

/// Un picto tel que le module s'en sert : un identifiant, un mot, des rayons.
///
/// ARASAAC donne plusieurs mots-clés à un même dessin — « peindre » et
/// « colorier », « rayer » et « barrer ». Le premier fait le libellé ; tous
/// servent à chercher, sans quoi « colorier » ne trouvait rien.
#[derive(Clone, Default)]
pub struct Picto {
    pub id: i64,
    pub mot: String,
    /// Tous les mots-clés français, en minuscules, le libellé en tête.
    pub mots: Vec<String>,
    pub categories: Vec<String>,
    /// Ceux de ses mots qui sont des noms communs d'un seul mot : ce qu'on
    /// propose de soi-même pour un exercice de lecture.
    pub noms: Vec<String>,
    /// Marqué « sexualité » ou « violence » par ARASAAC : il se cherche, il ne se propose pas.
    pub sensible: bool,
}

/// L'index en mémoire. Reconstruit uniquement quand la banque change.
#[derive(Default)]
pub struct Index {
    pub pictos: Vec<Picto>,
    /// Les pluriels qui s'écrivent autrement que leur singulier : « mains », pas « souris ».
    pub pluriels: HashSet<String>,
    /// Empreinte du fichier lu, pour savoir s'il faut relire.
    signature: (u64, i64),
}

#[derive(Default)]
pub struct BanqueArasaac(pub Mutex<Index>);

fn signature_fichier(p: &PathBuf) -> (u64, i64) {
    match std::fs::metadata(p) {
        Ok(m) => (
            m.len(),
            m.modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
        ),
        Err(_) => (0, 0),
    }
}

/// Les mots-clés français non vides, en minuscules, sans doublon ; le premier est le libellé du picto.
fn mots_du_picto(p: &PictoBrut) -> Vec<String> {
    let mut mots: Vec<String> = Vec::new();
    for k in p.keywords.iter().map(|k| k.keyword.trim().to_lowercase()) {
        if !k.is_empty() && !mots.contains(&k) {
            mots.push(k);
        }
    }
    mots
}

/// Un seul mot, fait de lettres : ni locution, ni mot composé.
fn est_un_mot_seul(m: &str) -> bool {
    !m.is_empty() && m.chars().all(char::is_alphabetic)
}

/// Les noms communs d'un seul mot que porte un picto, en minuscules, sans doublon.
fn noms_du_picto(p: &PictoBrut) -> Vec<String> {
    let mut noms: Vec<String> = Vec::new();
    for k in p.keywords.iter().filter(|k| k.sorte == Some(2)) {
        let mot = k.keyword.trim().to_lowercase();
        if est_un_mot_seul(&mot) && !noms.contains(&mot) {
            noms.push(mot);
        }
    }
    noms
}

/// Le pluriel d'un mot-clé, quand il s'écrit autrement que lui.
fn pluriel_distinct(k: &MotCle) -> Option<String> {
    let pluriel = k.plural.as_deref()?.trim().to_lowercase();
    (!pluriel.is_empty() && pluriel != k.keyword.trim().to_lowercase()).then_some(pluriel)
}

/// Les mots proposés pour un exercice tiennent dans une case et se lisent : de trois à douze lettres.
const LETTRES_D_UN_NOM: std::ops::RangeInclusive<usize> = 3..=12;

/// Un nom que la banque propose : son dessin, et s'il est du vocabulaire de base.
#[derive(Debug, Clone, PartialEq)]
pub struct NomPropose {
    pub id: i64,
    pub mot: String,
    /// ARASAAC range ce mot dans son « vocabulaire de base » : un mot que les élèves connaissent.
    pub de_base: bool,
}

/// L'ordre dans lequel on propose : le vocabulaire de base d'abord, puis les
/// mots les plus courts — ce sont les plus faciles à lire.
fn ordre_des_noms(a: &NomPropose, b: &NomPropose) -> std::cmp::Ordering {
    b.de_base
        .cmp(&a.de_base)
        .then_with(|| a.mot.chars().count().cmp(&b.mot.chars().count()))
        .then_with(|| a.mot.cmp(&b.mot))
}

/// Les noms communs d'un seul mot où l'on lit cette suite de lettres : « ma »
/// donne lama, malle, mamie.
///
/// De quoi proposer des mots à compléter pour une syllabe. On écarte les
/// pluriels (« mains » quand « main » existe), les pictos qu'ARASAAC marque
/// sensibles, ceux dont l'image manque. Un mot que plusieurs pictos portent
/// prend celui dont il est le libellé — le dessin fait pour lui.
pub fn noms_contenant(index: &Index, morceau: &str, a_une_image: &dyn Fn(i64) -> bool) -> Vec<NomPropose> {
    let cherche = morceau.trim().to_lowercase();
    if cherche.is_empty() {
        return Vec::new();
    }
    // Par mot : le dessin retenu, s'il en est le libellé, et si l'un de ses dessins est du vocabulaire de base.
    let mut par_mot: BTreeMap<&str, (bool, i64, bool)> = BTreeMap::new();
    for p in index.pictos.iter().filter(|p| !p.sensible) {
        let de_base = p.categories.iter().any(|c| c.starts_with("core vocabulary"));
        for nom in p.noms.iter().filter(|n| n.contains(&cherche)) {
            if !LETTRES_D_UN_NOM.contains(&nom.chars().count()) || index.pluriels.contains(nom) || !a_une_image(p.id) {
                continue;
            }
            let libelle = p.mot == *nom;
            match par_mot.get_mut(nom.as_str()) {
                None => {
                    par_mot.insert(nom, (libelle, p.id, de_base));
                }
                Some(deja) => {
                    if libelle && !deja.0 {
                        (deja.0, deja.1) = (true, p.id);
                    }
                    deja.2 |= de_base;
                }
            }
        }
    }
    let mut sortie: Vec<NomPropose> =
        par_mot.into_iter().map(|(mot, (_, id, de_base))| NomPropose { id, mot: mot.to_string(), de_base }).collect();
    sortie.sort_by(ordre_des_noms);
    sortie
}

/// Comment un picto répond à ce qu'on cherche : 0 si un de ses mots est
/// exactement cela, 1 s'il commence ainsi, 2 s'il le contient — et le mot
/// qui a répondu, pour l'écrire sous le dessin quand il est exact.
pub fn reponse_du_picto(p: &Picto, cherche: &str) -> Option<(u8, String)> {
    let mut meilleure: Option<(u8, String)> = None;
    for m in &p.mots {
        let rang = if m == cherche {
            0
        } else if m.starts_with(cherche) {
            1
        } else if m.contains(cherche) {
            2
        } else {
            continue;
        };
        let libelle = if rang == 0 { m.clone() } else { p.mot.clone() };
        if meilleure.as_ref().is_none_or(|(r, _)| rang < *r) {
            meilleure = Some((rang, libelle));
        }
        if rang == 0 {
            break;
        }
    }
    meilleure
}

/// Le picto dont l'un des mots est exactement celui-là — le libellé d'abord, puis les autres.
pub fn picto_par_mot<'a>(index: &'a Index, cherche: &str) -> Option<&'a Picto> {
    index
        .pictos
        .iter()
        .find(|p| p.mot == cherche)
        .or_else(|| index.pictos.iter().find(|p| p.mots.iter().any(|m| m == cherche)))
}

/// Ce que l'index garde des métadonnées : les pictos utilisables, et les pluriels à ne pas proposer.
///
/// Un picto sans mot ou sans catégorie ne sert à rien ici : il ne peut ni
/// s'afficher sous un libellé, ni se retrouver par une sélection.
fn indexer(liste: Vec<PictoBrut>) -> (Vec<Picto>, HashSet<String>) {
    let pluriels = liste.iter().flat_map(|p| p.keywords.iter().filter_map(pluriel_distinct)).collect();
    let pictos = liste
        .into_iter()
        .filter(|p| !p.categories.is_empty())
        .filter_map(|p| {
            let mots = mots_du_picto(&p);
            let noms = noms_du_picto(&p);
            mots.first().cloned().map(|mot| Picto {
                id: p.id,
                mot,
                mots,
                categories: p.categories.iter().map(|c| c.to_lowercase()).collect(),
                noms,
                sensible: p.sex || p.violence,
            })
        })
        .collect();
    (pictos, pluriels)
}

fn charger_index(etat: &BanqueArasaac) -> Result<std::sync::MutexGuard<'_, Index>, String> {
    let chemin = metadata_path();
    let sig = signature_fichier(&chemin);
    let mut index = etat.0.lock().unwrap_or_else(PoisonError::into_inner);
    if index.signature == sig && !index.pictos.is_empty() {
        return Ok(index);
    }
    if sig.0 == 0 {
        return Err("La banque ARASAAC n'est pas encore téléchargée.".into());
    }
    let brut = std::fs::read_to_string(&chemin).map_err(|e| format!("Lecture : {e}"))?;
    let liste: Vec<PictoBrut> =
        serde_json::from_str(&brut).map_err(|e| format!("metadata.json illisible : {e}"))?;
    (index.pictos, index.pluriels) = indexer(liste);
    index.signature = sig;
    Ok(index)
}

// ── État de la banque ──────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EtatBanque {
    pub installee: bool,
    pub pictos: usize,
    pub images: usize,
    pub octets: u64,
    pub derniere_maj: String,
}

#[tauri::command(async)]
pub fn arasaac_etat(etat: tauri::State<BanqueArasaac>) -> EtatBanque {
    let (taille, horodatage) = signature_fichier(&metadata_path());
    let (images, octets) = match std::fs::read_dir(images_dir()) {
        Ok(e) => e.filter_map(|f| f.ok()).fold((0usize, 0u64), |(n, o), f| {
            (n + 1, o + f.metadata().map(|m| m.len()).unwrap_or(0))
        }),
        Err(_) => (0, 0),
    };
    let pictos = charger_index(&etat).map(|i| i.pictos.len()).unwrap_or(0);
    EtatBanque {
        installee: taille > 0 && images > 0,
        pictos,
        images,
        octets: octets + taille,
        derniere_maj: if horodatage == 0 {
            String::new()
        } else {
            chrono::DateTime::from_timestamp(horodatage, 0)
                .map(|d| d.with_timezone(&chrono::Local).format("%d/%m/%Y").to_string())
                .unwrap_or_default()
        },
    }
}

// ── Téléchargement ─────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct Avancement {
    etape: String,
    faits: usize,
    total: usize,
}

/// Télécharge (ou complète) la banque.
///
/// Reprenable : une image déjà présente est sautée, ce qui permet de relancer
/// après une coupure sans tout refaire. C'est aussi le mécanisme de
/// resynchronisation, la banque ARASAAC s'enrichissant au fil du temps.
#[tauri::command]
pub async fn arasaac_telecharger(
    app: AppHandle,
    etat: tauri::State<'_, BanqueArasaac>,
) -> Result<EtatBanque, String> {
    let signaler = |etape: &str, faits: usize, total: usize| {
        let _ = app.emit(
            "arasaac://avancement",
            Avancement { etape: etape.into(), faits, total },
        );
    };

    signaler("Métadonnées", 0, 1);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let corps = client
        .get(API_METADATA)
        .send()
        .await
        .map_err(|e| format!("Réseau : {e}"))?
        .error_for_status()
        .map_err(|e| format!("ARASAAC a refusé la demande : {e}"))?
        .text()
        .await
        .map_err(|e| format!("Réception : {e}"))?;
    let liste: Vec<PictoBrut> =
        serde_json::from_str(&corps).map_err(|e| format!("Réponse illisible : {e}"))?;
    // Écriture après validation : un fichier tronqué par une coupure vaut moins
    // qu'un fichier absent, qui se redemande sans ambiguïté.
    std::fs::write(metadata_path(), &corps).map_err(|e| format!("Écriture : {e}"))?;
    signaler("Métadonnées", 1, 1);

    let dossier = images_dir();
    let manquants: Vec<i64> = liste
        .iter()
        .filter(|p| !p.categories.is_empty() && !mots_du_picto(p).is_empty())
        .map(|p| p.id)
        .filter(|id| !dossier.join(format!("{id}.png")).exists())
        .collect();

    let total = manquants.len();
    signaler("Images", 0, total);
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(PARALLELE));
    let faits = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let mut taches = tokio::task::JoinSet::new();
    for id in manquants {
        let (client, dossier, semaphore, faits, app) = (
            client.clone(), dossier.clone(), semaphore.clone(), faits.clone(), app.clone(),
        );
        taches.spawn(async move {
            let _permis = semaphore.acquire().await;
            let url = format!("{IMAGE_BASE}/{id}/{id}_500.png");
            if let Ok(r) = client.get(&url).send().await {
                if r.status().is_success() {
                    if let Ok(octets) = r.bytes().await {
                        // Fichier temporaire puis renommage : une image à demi
                        // écrite ne doit jamais passer pour téléchargée.
                        let tmp = dossier.join(format!("{id}.part"));
                        if std::fs::write(&tmp, &octets).is_ok() {
                            std::fs::rename(&tmp, dossier.join(format!("{id}.png"))).ok();
                        }
                    }
                }
            }
            let n = faits.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
            if n % 25 == 0 || n == total {
                let _ = app.emit(
                    "arasaac://avancement",
                    Avancement { etape: "Images".into(), faits: n, total },
                );
            }
        });
    }
    while taches.join_next().await.is_some() {}

    // L'index en mémoire décrit l'ancienne banque : on le force à se relire.
    {
        let mut i = etat.0.lock().unwrap_or_else(PoisonError::into_inner);
        i.signature = (0, 0);
        i.pictos.clear();
    }
    Ok(arasaac_etat(etat))
}

// ── Catégories ─────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct Categorie {
    pub nom: String,
    pub nombre: usize,
}

/// Les catégories de la banque, avec leur effectif, par ordre alphabétique.
///
/// Les noms sont les étiquettes internes d'ARASAAC, en anglais ; la traduction
/// pour l'enseignant se fait côté fenêtre, où elle se corrige sans recompiler.
#[tauri::command(async)]
pub fn arasaac_categories(etat: tauri::State<BanqueArasaac>) -> Result<Vec<Categorie>, String> {
    let index = charger_index(&etat)?;
    let mut compte: BTreeMap<&str, usize> = BTreeMap::new();
    for p in &index.pictos {
        for c in &p.categories {
            *compte.entry(c.as_str()).or_insert(0) += 1;
        }
    }
    Ok(compte
        .into_iter()
        .map(|(nom, nombre)| Categorie { nom: nom.to_string(), nombre })
        .collect())
}

// ── Sélection ──────────────────────────────────────────────────────────────

#[derive(Serialize, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PictoChoisi {
    pub id: i64,
    pub mot: String,
    pub fichier: String,
    /// Nature grammaticale, utile aux tableaux de langage ; ignorée des jeux.
    #[serde(default)]
    pub nature: String,
}

/// Tirage reproductible sans dépendance : un générateur congruentiel suffit
/// pour mélanger une liste, et la même graine redonne les mêmes planches.
pub struct Tirage(u64);

impl Tirage {
    pub fn nouveau(graine: u64) -> Self {
        Tirage(if graine == 0 { 0x2545_F491_4F6C_DD1D } else { graine })
    }
    fn suivant(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    pub fn melanger<T>(&mut self, v: &mut [T]) {
        for i in (1..v.len()).rev() {
            v.swap(i, (self.suivant() % (i as u64 + 1)) as usize);
        }
    }
}

/// Les pictos d'une sélection de catégories, en union ou en intersection.
///
/// L'intersection est ce qui permet le sur-mesure sans intrus : `mammal` seul
/// ramène les baleines, `mammal` + `domestic animal` donne la ferme.
pub fn selection(
    index: &Index,
    categories: &[String],
    exclues: &[String],
    intersection: bool,
    combien: usize,
    graine: u64,
) -> Vec<PictoChoisi> {
    let voulues: HashSet<String> = categories.iter().map(|c| c.trim().to_lowercase()).collect();
    let bannies: HashSet<String> = exclues.iter().map(|c| c.trim().to_lowercase()).collect();
    if voulues.is_empty() {
        return Vec::new();
    }
    let dossier = images_dir();
    let mut retenus: Vec<PictoChoisi> = index
        .pictos
        .iter()
        .filter(|p| {
            let siennes: HashSet<&String> = p.categories.iter().collect();
            let dedans = if intersection {
                voulues.iter().all(|v| siennes.contains(v))
            } else {
                voulues.iter().any(|v| siennes.contains(v))
            };
            // Les catégories d'ARASAAC mélangent les objets et les actions :
            // « clothes » contient l'anorak, mais aussi « baisser le pantalon ».
            // Écarter `verb` suffit à ne garder que ce qui se montre sur une
            // carte. Le filtre est une exclusion par catégorie, jamais un
            // jugement sur le mot.
            dedans && !siennes.iter().any(|c| bannies.contains(*c))
        })
        // L'index vient du JSON, les images du disque : la présence de l'une ne
        // garantit pas celle de l'autre, et une planche ne peut pas montrer un
        // fichier absent.
        .filter(|p| dossier.join(format!("{}.png", p.id)).exists())
        .map(|p| PictoChoisi {
            id: p.id,
            mot: p.mot.clone(),
            fichier: dossier.join(format!("{}.png", p.id)).to_string_lossy().into_owned(),
            nature: nature(&p.categories),
        })
        .collect();

    let mut tirage = Tirage::nouveau(graine);
    tirage.melanger(&mut retenus);
    if combien > 0 && retenus.len() > combien {
        retenus.truncate(combien);
    }
    retenus.sort_by(|a, b| a.mot.cmp(&b.mot));
    retenus
}

#[tauri::command(async)]
pub fn arasaac_selection(
    etat: tauri::State<BanqueArasaac>,
    categories: Vec<String>,
    exclues: Vec<String>,
    intersection: bool,
    combien: usize,
    graine: u64,
) -> Result<Vec<PictoChoisi>, String> {
    let index = charger_index(&etat)?;
    Ok(selection(&index, &categories, &exclues, intersection, combien, graine))
}

/// Les catégories où sont rangés les pictogrammes qui portent l'un de ces
/// mots — de quoi deviner les thèmes d'un projet depuis son titre : « soupe »
/// mène aux aliments, « vache » aux animaux domestiques. Tout se lit dans
/// l'index local ; rien ne part.
#[tauri::command(async)]
pub fn arasaac_themes_des_mots(
    etat: tauri::State<BanqueArasaac>,
    mots: Vec<String>,
) -> Result<Vec<Categorie>, String> {
    let index = charger_index(&etat)?;
    Ok(themes_des_mots(&index, &mots))
}

/// Compte, par catégorie, les pictogrammes dont le mot est l'un de ceux donnés
/// (à la lettre, sans tenir compte de la casse) ; les plus fréquentes en tête.
pub fn themes_des_mots(index: &Index, mots: &[String]) -> Vec<Categorie> {
    let cherches: HashSet<String> = mots
        .iter()
        .map(|m| m.trim().to_lowercase())
        .filter(|m| m.chars().count() >= 3)
        .collect();
    if cherches.is_empty() {
        return Vec::new();
    }
    let mut compte: BTreeMap<&str, usize> = BTreeMap::new();
    for p in index.pictos.iter().filter(|p| p.mots.iter().any(|m| cherches.contains(m))) {
        for c in &p.categories {
            *compte.entry(c.as_str()).or_insert(0) += 1;
        }
    }
    let mut sortie: Vec<Categorie> = compte
        .into_iter()
        .map(|(nom, nombre)| Categorie { nom: nom.to_string(), nombre })
        .collect();
    sortie.sort_by(|a, b| b.nombre.cmp(&a.nombre).then_with(|| a.nom.cmp(&b.nom)));
    sortie
}

/// Cherche un pictogramme par son mot, pour l'éditeur de tableau.
///
/// La correspondance partielle est ici **volontaire**, à l'inverse de la
/// sélection des jeux. La règle qui l'interdisait visait le choix automatique :
/// deviner seul qu'un drapeau illustre « terre » produisait des aberrations.
/// Ici l'enseignant voit les candidats et désigne le bon ; la machine propose,
/// elle ne tranche pas. Les résultats sont classés du plus exact au plus vague
/// pour que le bon soit presque toujours en tête.
#[tauri::command(async)]
pub fn arasaac_chercher(
    etat: tauri::State<BanqueArasaac>,
    q: String,
    limite: usize,
) -> Result<Vec<PictoChoisi>, String> {
    let index = charger_index(&etat)?;
    let cherche = q.trim().to_lowercase();
    if cherche.len() < 2 {
        return Ok(Vec::new());
    }
    let dossier = images_dir();
    let mut candidats: Vec<(u8, String, &Picto)> = index
        .pictos
        .iter()
        .filter_map(|p| reponse_du_picto(p, &cherche).map(|(rang, libelle)| (rang, libelle, p)))
        .filter(|(_, _, p)| dossier.join(format!("{}.png", p.id)).exists())
        .collect();
    candidats.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.len().cmp(&b.1.len())));
    Ok(candidats
        .into_iter()
        .take(if limite == 0 { 40 } else { limite })
        .map(|(_, libelle, p)| PictoChoisi {
            id: p.id,
            mot: libelle,
            fichier: dossier.join(format!("{}.png", p.id)).to_string_lossy().into_owned(),
            nature: nature(&p.categories),
        })
        .collect())
}

/// Nature grammaticale d'un picto, d'après ses catégories ARASAAC.
///
/// C'est ce qui donne la couleur de la case dans un tableau de langage : le
/// code couleur usuel (clé de Fitzgerald) range les mots par nature, et la
/// banque étiquette déjà les siens. Rien n'est déduit du mot lui-même.
#[tauri::command(async)]
pub fn arasaac_nature(etat: tauri::State<BanqueArasaac>, id: i64) -> Result<String, String> {
    let index = charger_index(&etat)?;
    let picto = index.pictos.iter().find(|p| p.id == id);
    Ok(picto.map(|p| nature(&p.categories)).unwrap_or_else(|| "nom".into()))
}

/// Des mots à proposer pour une syllabe : les noms communs de la banque où on
/// la lit, avec leur dessin. `limite` vaut pour chaque syllabe — « mu » n'a
/// pas à céder sa place aux deux cents mots en « ma ». L'écran vérifie ensuite
/// qu'on l'y entend : « main » s'écrit avec « ma », et ne se dit pas ainsi.
#[tauri::command(async)]
pub fn arasaac_noms_contenant(
    etat: tauri::State<BanqueArasaac>,
    morceaux: Vec<String>,
    limite: usize,
) -> Result<Vec<PictoChoisi>, String> {
    let index = charger_index(&etat)?;
    let dossier = images_dir();
    let image = |id: i64| dossier.join(format!("{id}.png"));
    let mut vus: HashSet<String> = HashSet::new();
    let mut proposes: Vec<NomPropose> = Vec::new();
    for morceau in &morceaux {
        let trouves = noms_contenant(&index, morceau, &|id| image(id).exists());
        proposes.extend(trouves.into_iter().take(if limite == 0 { 300 } else { limite }).filter(|n| vus.insert(n.mot.clone())));
    }
    // D'une syllabe à l'autre, le même ordre : un mot qui en porte deux se range à sa place dans chacune.
    proposes.sort_by(ordre_des_noms);
    Ok(proposes
        .into_iter()
        .map(|n| PictoChoisi { fichier: image(n.id).to_string_lossy().into_owned(), id: n.id, mot: n.mot, nature: "nom".into() })
        .collect())
}

/// Nature grammaticale déduite des catégories, ou « nom » à défaut.
pub fn nature(categories: &[String]) -> String {
    let a = |c: &str| categories.iter().any(|x| x == c);
    if a("personal pronoun") || a("pronoun") {
        "personne"
    } else if a("verb") || a("usual verbs") {
        "verbe"
    } else if a("qualifying adjective") || a("numeral adjective") || a("ordinal adjective") {
        "adjectif"
    } else if a("polite set expression") {
        "social"
    } else if a("preposition") || a("adverb of time") {
        "petit mot"
    } else {
        "nom"
    }
    .to_string()
}

/// Image d'un picto, en base64, pour l'aperçu à l'écran.
///
/// L'application lit déjà ses pièces jointes ainsi ; passer par la même voie
/// évite d'ouvrir un accès au système de fichiers depuis la fenêtre.
#[tauri::command(async)]
pub fn arasaac_image(id: i64) -> Result<String, String> {
    use base64::Engine;
    let chemin = images_dir().join(format!("{id}.png"));
    let octets = std::fs::read(&chemin).map_err(|e| format!("Image {id} : {e}"))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(octets))
}

/// Mode secours : une liste de mots fournie à la main.
///
/// La correspondance est **exacte**. Chercher « le mot est contenu dans un
/// mot-clé » ramenait des pictos aberrants — un drapeau pour « terre », parce
/// que « Terre-Neuve » contient le mot. Un mot sans picto est signalé, jamais
/// remplacé par une approximation.
#[tauri::command(async)]
pub fn arasaac_par_mots(
    etat: tauri::State<BanqueArasaac>,
    mots: Vec<String>,
) -> Result<(Vec<PictoChoisi>, Vec<String>), String> {
    let index = charger_index(&etat)?;
    let dossier = images_dir();
    let mut trouves = Vec::new();
    let mut absents = Vec::new();
    for mot in mots {
        let cherche = mot.trim().to_lowercase();
        if cherche.is_empty() {
            continue;
        }
        let picto = picto_par_mot(&index, &cherche);
        match picto {
            // Le mot de l'enseignant fait le libellé : « colorier », pas « peindre ».
            Some(p) if dossier.join(format!("{}.png", p.id)).exists() => trouves.push(PictoChoisi {
                id: p.id,
                mot: cherche.clone(),
                fichier: dossier.join(format!("{}.png", p.id)).to_string_lossy().into_owned(),
                nature: nature(&p.categories),
            }),
            _ => absents.push(cherche),
        }
    }
    Ok((trouves, absents))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn picto(id: i64, mot: &str, cats: &[&str]) -> Picto {
        Picto { id, mot: mot.into(), mots: vec![mot.into()], categories: cats.iter().map(|c| c.to_string()).collect(), ..Default::default() }
    }

    fn picto_mots(id: i64, mots: &[&str], cats: &[&str]) -> Picto {
        Picto {
            id,
            mot: mots[0].into(),
            mots: mots.iter().map(|m| m.to_string()).collect(),
            categories: cats.iter().map(|c| c.to_string()).collect(),
            ..Default::default()
        }
    }

    #[test]
    fn un_picto_se_trouve_par_chacun_de_ses_mots() {
        let peindre = picto_mots(2348, &["peindre", "colorier"], &["verb", "educational task"]);
        assert_eq!(reponse_du_picto(&peindre, "colorier"), Some((0, "colorier".into())), "le mot exact fait le libellé");
        assert_eq!(reponse_du_picto(&peindre, "peindre"), Some((0, "peindre".into())));
        assert_eq!(reponse_du_picto(&peindre, "color"), Some((1, "peindre".into())), "un début : le libellé reste le premier mot");
        assert_eq!(reponse_du_picto(&peindre, "lori"), Some((2, "peindre".into())));
        assert_eq!(reponse_du_picto(&peindre, "souligner"), None);

        let mut i = index_exemple();
        i.pictos.push(peindre);
        assert_eq!(picto_par_mot(&i, "colorier").map(|p| p.id), Some(2348));
        assert_eq!(picto_par_mot(&i, "vache").map(|p| p.id), Some(1));
        assert!(picto_par_mot(&i, "vaches").is_none());
        // Les thèmes aussi répondent à tous les mots.
        let t = themes_des_mots(&i, &["colorier".into()]);
        assert_eq!(t.iter().map(|c| c.nom.as_str()).collect::<Vec<_>>(), vec!["educational task", "verb"]);
    }

    #[test]
    fn les_mots_cles_se_lisent_sans_doublon_ni_vide() {
        let brut = PictoBrut {
            id: 1,
            keywords: vec![
                MotCle { keyword: " Peindre ".into(), ..Default::default() },
                MotCle { keyword: "".into(), ..Default::default() },
                MotCle { keyword: "colorier".into(), ..Default::default() },
                MotCle { keyword: "peindre".into(), ..Default::default() },
            ],
            ..Default::default()
        };
        assert_eq!(mots_du_picto(&brut), vec!["peindre".to_string(), "colorier".to_string()]);
    }

    fn index_exemple() -> Index {
        Index {
            pictos: vec![
                picto(1, "vache", &["mammal", "domestic animal", "terrestrial animal"]),
                picto(2, "baleine", &["mammal", "marine animal"]),
                picto(3, "poule", &["oviparous", "domestic animal"]),
                picto(4, "pantalon", &["clothes"]),
            ],
            signature: (1, 1),
            ..Default::default()
        }
    }

    fn mot_cle(mot: &str, sorte: i64, pluriel: &str) -> MotCle {
        MotCle { keyword: mot.into(), sorte: Some(sorte), plural: (!pluriel.is_empty()).then(|| pluriel.to_string()) }
    }

    #[test]
    fn un_picto_donne_ses_noms_communs_d_un_seul_mot() {
        let brut = PictoBrut {
            id: 1,
            keywords: vec![
                mot_cle("Grand-mère", 2, "grands-mères"),
                mot_cle("mamie", 2, "mamies"),
                mot_cle("tricoter", 3, ""),
                mot_cle("pomme de terre", 2, ""),
                mot_cle("Mamie", 2, ""),
                MotCle { keyword: "mémé".into(), ..Default::default() },
            ],
            ..Default::default()
        };
        // Ni le mot composé, ni la locution, ni le verbe, ni le mot sans nature ; « mamie » une fois.
        assert_eq!(noms_du_picto(&brut), vec!["mamie".to_string()]);
        assert_eq!(pluriel_distinct(&mot_cle("Main", 2, " Mains ")), Some("mains".into()));
        assert_eq!(pluriel_distinct(&mot_cle("souris", 2, "souris")), None, "un pluriel qui s'écrit comme le singulier n'écarte rien");
        assert_eq!(pluriel_distinct(&mot_cle("lama", 2, "")), None);
    }

    #[test]
    fn l_index_lit_les_noms_les_pluriels_et_les_marques_d_arasaac() {
        let json = r#"[
            {"_id": 1, "keywords": [{"type": 2, "keyword": "Main", "plural": "mains"}], "categories": ["Body"], "sex": false, "violence": false},
            {"_id": 2, "keywords": [{"type": 2, "keyword": "arme", "plural": "armes"}], "categories": ["object"], "violence": true},
            {"_id": 3, "keywords": [{"type": 3, "keyword": "manger"}, {"type": null, "keyword": "repas"}], "categories": ["verb"]},
            {"_id": 4, "keywords": [{"type": 2, "keyword": "orphelin"}], "categories": []},
            {"_id": 5, "keywords": [{"type": 2, "keyword": "souris", "plural": "souris"}], "categories": ["animal"], "sex": true}
        ]"#;
        let (pictos, pluriels) = indexer(serde_json::from_str(json).unwrap());
        // Le picto sans catégorie est écarté ; les autres gardent leur libellé, leurs noms et leur marque.
        let vus: Vec<(i64, &str, Vec<&str>, bool)> =
            pictos.iter().map(|p| (p.id, p.mot.as_str(), p.noms.iter().map(String::as_str).collect(), p.sensible)).collect();
        assert_eq!(vus, vec![(1, "main", vec!["main"], false), (2, "arme", vec!["arme"], true), (3, "manger", vec![], false), (5, "souris", vec!["souris"], true)]);
        assert_eq!(pictos[0].categories, vec!["body".to_string()]);
        // « souris » s'écrit de même au pluriel : il ne s'écarte pas lui-même.
        let mut tries: Vec<&String> = pluriels.iter().collect();
        tries.sort();
        assert_eq!(tries, vec!["armes", "mains"]);
    }

    /// Ce que la vraie banque propose pour des syllabes, à lire de l'œil. Ignoré par défaut :
    ///   MAITRIZE_BANQUE=/chemin/ARASAAC MAITRIZE_SYLLABES=ma,mi,mu cargo test propositions_reelles -- --ignored --nocapture
    #[test]
    #[ignore]
    fn propositions_reelles() {
        let Ok(banque) = std::env::var("MAITRIZE_BANQUE") else { return };
        let dossier = std::path::Path::new(&banque);
        let brut = std::fs::read_to_string(dossier.join("metadata.json")).expect("metadata.json");
        let (pictos, pluriels) = indexer(serde_json::from_str(&brut).expect("métadonnées"));
        let index = Index { pictos, pluriels, signature: (1, 1) };
        let syllabes = std::env::var("MAITRIZE_SYLLABES").unwrap_or_else(|_| "ma,mi,mu".into());
        for s in syllabes.split(',') {
            let trouves = noms_contenant(&index, s, &|id| dossier.join("images").join(format!("{id}.png")).exists());
            let base = trouves.iter().filter(|n| n.de_base).count();
            println!("{s} : {} noms, dont {base} de base", trouves.len());
            println!("  {}", trouves.iter().take(60).map(|n| format!("{}{}", n.mot, if n.de_base { "*" } else { "" })).collect::<Vec<_>>().join(", "));
        }
    }

    fn picto_noms(id: i64, libelle: &str, noms: &[&str]) -> Picto {
        Picto { id, mot: libelle.into(), mots: vec![libelle.into()], noms: noms.iter().map(|n| n.to_string()).collect(), categories: vec!["x".into()], ..Default::default() }
    }

    #[test]
    fn les_noms_ou_l_on_lit_une_syllabe() {
        let mut i = Index {
            pictos: vec![
                picto_noms(10, "marguerite", &["marguerite"]),
                picto_noms(11, "lama", &["lama"]),
                picto_noms(12, "grand-mère", &["mamie"]),
                picto_noms(13, "mamie", &["mamie"]),
                picto_noms(14, "mains", &["mains"]),
                picto_noms(15, "main", &["main"]),
                picto_noms(16, "anticonstitutionnalisme", &["anticonstitutionnalisme"]),
                picto_noms(17, "ma", &["ma"]),
                picto_noms(18, "mur", &["mur"]),
                Picto { sensible: true, ..picto_noms(19, "mari", &["mari"]) },
                picto_noms(20, "malle", &["malle"]),
                Picto { categories: vec!["core vocabulary-feeding".into()], ..picto_noms(21, "tomate", &["tomate"]) },
            ],
            signature: (1, 1),
            ..Default::default()
        };
        i.pluriels.insert("mains".into());
        let tout = |_: i64| true;
        let mots = |liste: &[NomPropose]| liste.iter().map(|n| n.mot.clone()).collect::<Vec<_>>();
        let id_de = |liste: &[NomPropose], mot: &str| liste.iter().find(|n| n.mot == mot).map(|n| n.id);
        let trouves = noms_contenant(&i, " MA ", &tout);
        // Le vocabulaire de base d'abord, puis les plus courts ; ni le pluriel, ni le trop long, ni le trop court, ni le dessin sensible.
        assert_eq!(mots(&trouves), vec!["tomate", "lama", "main", "malle", "mamie", "marguerite"]);
        assert!(trouves[0].de_base && !trouves[1].de_base);
        // « mamie » prend le dessin dont c'est le libellé, pas celui de « grand-mère ».
        assert_eq!(id_de(&trouves, "mamie"), Some(13));
        // Sans l'image de celui-là, l'autre le remplace ; sans aucune, le mot ne se propose pas.
        assert_eq!(id_de(&noms_contenant(&i, "ma", &|id| id != 13), "mamie"), Some(12));
        assert_eq!(id_de(&noms_contenant(&i, "ma", &|id| id != 13 && id != 12), "mamie"), None);
        assert_eq!(noms_contenant(&i, "mu", &tout), vec![NomPropose { id: 18, mot: "mur".into(), de_base: false }]);
        assert!(noms_contenant(&i, "  ", &tout).is_empty());
        assert!(noms_contenant(&i, "zz", &tout).is_empty());
        // Un mot de base par l'un de ses dessins l'est pour tous : le libellé garde le dessin, le mot garde son rang.
        i.pictos.push(Picto { categories: vec!["core vocabulary-living being".into()], ..picto_noms(22, "mémé", &["mamie"]) });
        let avec = noms_contenant(&i, "ma", &tout);
        assert_eq!(mots(&avec)[..2], ["mamie".to_string(), "tomate".to_string()]);
        assert_eq!(id_de(&avec, "mamie"), Some(13));
    }

    #[test]
    fn les_mots_d_un_titre_revelent_leurs_themes() {
        let i = index_exemple();
        let t = themes_des_mots(&i, &["Vache".into(), "poule".into(), "xx".into(), "licorne".into()]);
        let vus: Vec<(&str, usize)> = t.iter().map(|c| (c.nom.as_str(), c.nombre)).collect();
        // « domestic animal » porte les deux, puis les autres par ordre alphabétique.
        assert_eq!(vus, vec![("domestic animal", 2), ("mammal", 1), ("oviparous", 1), ("terrestrial animal", 1)]);
        assert!(themes_des_mots(&i, &["pantalons".into()]).is_empty(), "le pluriel n'est pas le mot");
        assert!(themes_des_mots(&i, &[]).is_empty());
    }

    // Les images n'existent pas sur le disque en test : `selection` les filtre.
    // On teste donc la logique d'appartenance directement.
    fn appartient(p: &Picto, voulues: &[&str], intersection: bool) -> bool {
        let v: HashSet<String> = voulues.iter().map(|c| c.to_lowercase()).collect();
        let s: HashSet<&String> = p.categories.iter().collect();
        if intersection { v.iter().all(|x| s.contains(x)) } else { v.iter().any(|x| s.contains(x)) }
    }

    #[test]
    fn l_union_elargit() {
        let i = index_exemple();
        let n = i.pictos.iter().filter(|p| appartient(p, &["mammal", "oviparous"], false)).count();
        assert_eq!(n, 3, "vache, baleine et poule");
    }

    #[test]
    fn l_intersection_ecarte_les_intrus() {
        let i = index_exemple();
        let noms: Vec<&str> = i
            .pictos
            .iter()
            .filter(|p| appartient(p, &["mammal", "domestic animal"], true))
            .map(|p| p.mot.as_str())
            .collect();
        assert_eq!(noms, vec!["vache"], "la baleine n'est pas un animal domestique");
    }

    #[test]
    fn une_categorie_absente_ne_ramene_rien() {
        let i = index_exemple();
        assert!(!i.pictos.iter().any(|p| appartient(p, &["dinosaur"], false)));
    }

    #[test]
    fn l_exclusion_ecarte_les_actions() {
        // « clothes » contient l'anorak et « baisser le pantalon » : sans
        // exclusion des verbes, la planche mélange objets et actions.
        let mut i = index_exemple();
        i.pictos.push(picto(5, "baisser le pantalon", &["clothes", "verb"]));
        let bannies: HashSet<String> = ["verb".to_string()].into_iter().collect();
        let gardes: Vec<&str> = i
            .pictos
            .iter()
            .filter(|p| appartient(p, &["clothes"], false))
            .filter(|p| !p.categories.iter().any(|c| bannies.contains(c)))
            .map(|p| p.mot.as_str())
            .collect();
        assert_eq!(gardes, vec!["pantalon"]);
    }

    #[test]
    fn la_nature_vient_des_categories_pas_du_mot() {
        assert_eq!(nature(&["personal pronoun".into()]), "personne");
        assert_eq!(nature(&["usual verbs".into(), "clothes".into()]), "verbe");
        assert_eq!(nature(&["qualifying adjective".into()]), "adjectif");
        assert_eq!(nature(&["polite set expression".into()]), "social");
        assert_eq!(nature(&["preposition".into()]), "petit mot");
        // Tout le reste est un nom : c'est le cas le plus fréquent.
        assert_eq!(nature(&["terrestrial animal".into()]), "nom");
        assert_eq!(nature(&[]), "nom");
    }

    #[test]
    fn le_verbe_l_emporte_sur_le_theme() {
        // « baisser le pantalon » est rangé dans les vêtements ET dans les
        // verbes : sur un tableau, c'est un verbe qu'il faut colorer.
        assert_eq!(nature(&["clothes".into(), "routine".into(), "verb".into()]), "verbe");
    }

    #[test]
    fn le_tirage_est_reproductible() {
        let mut a: Vec<u8> = (0..40).collect();
        let mut b = a.clone();
        Tirage::nouveau(7).melanger(&mut a);
        Tirage::nouveau(7).melanger(&mut b);
        assert_eq!(a, b, "même graine, même ordre");
        let mut c: Vec<u8> = (0..40).collect();
        Tirage::nouveau(8).melanger(&mut c);
        assert_ne!(a, c, "une autre graine doit rebattre les cartes");
    }

    #[test]
    fn le_melange_ne_perd_ni_ne_duplique() {
        let mut v: Vec<u8> = (0..60).collect();
        Tirage::nouveau(3).melanger(&mut v);
        v.sort();
        assert_eq!(v, (0..60).collect::<Vec<u8>>());
    }
}
