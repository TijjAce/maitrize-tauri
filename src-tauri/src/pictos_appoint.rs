// ── Les banques d'appoint des consignes en pictos ─────────────────────────
//
// ARASAAC reste la banque de Maitrize, mais elle ne dessine pas tout ce que
// disent les consignes de classe : « décompose », parfois « encadre » ou
// « coche ». Deux banques d'usage libre en classe la complètent, dans cet
// ordre : les pictogrammes de consignes de François Bajard (36 images,
// CC BY-NC-SA 4.0), puis Sclera (près de 12 000, CC BY-NC 2.0 BE).
//
// Comme ARASAAC, elles se téléchargent sur cet ordinateur depuis leur site, à
// la demande de l'enseignant : Maitrize n'en distribue aucune image. Chacune
// arrive en un zip ; ses images se rangent dans un dossier, avec un index qui
// dit le mot de chaque image — celui de son nom de fichier.

use crate::db::data_dir;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, PoisonError};
use tauri::{AppHandle, Emitter};

/// Une banque d'appoint : où la prendre, où la ranger.
pub struct Source {
    pub cle: &'static str,
    nom: &'static str,
    url: &'static str,
    dossier: &'static str,
    /// Les noms de F. Bajard numérotent leurs variantes (« Barre01 », « Barre02 ») ;
    /// ceux de Sclera les suffixent (« compter_1 ») et gardent leurs chiffres (« 10 commandements »).
    numeros_colles: bool,
}

pub static SOURCES: [Source; 2] = [
    Source {
        cle: "bajard",
        nom: "les consignes de F. Bajard",
        url: "https://ressources-ecole-inclusive.org/wp-content/uploads/2021/01/Consignes.zip",
        dossier: "Bajard",
        numeros_colles: true,
    },
    Source {
        cle: "sclera",
        nom: "Sclera",
        url: "https://www.sclera.be/resources/download/picto_fr.zip",
        dossier: "Sclera",
        numeros_colles: false,
    },
];

fn source(cle: &str) -> Result<&'static Source, String> {
    SOURCES.iter().find(|s| s.cle == cle).ok_or_else(|| format!("Banque de pictos inconnue : {cle}"))
}

fn dossier_de(s: &Source) -> PathBuf {
    data_dir().join("Pictos").join(s.dossier)
}

const INDEX: &str = "index.json";

/// Une image de la banque : son fichier, et le mot qu'il dit.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Entree {
    pub fichier: String,
    pub mot: String,
}

/// Les index déjà lus : celui de Sclera compte près de 12 000 images.
static INDEX_LUS: Mutex<Option<HashMap<&'static str, Vec<Entree>>>> = Mutex::new(None);

/// Ce qu'on fait de l'index d'une banque ; il se lit une fois.
fn avec_index<T>(s: &'static Source, f: impl FnOnce(&[Entree]) -> T) -> Result<T, String> {
    let mut garde = INDEX_LUS.lock().unwrap_or_else(PoisonError::into_inner);
    let lus = garde.get_or_insert_with(HashMap::new);
    if !lus.contains_key(s.cle) {
        let brut = std::fs::read_to_string(dossier_de(s).join(INDEX))
            .map_err(|_| format!("La banque de {} n'est pas téléchargée sur cet ordinateur.", s.nom))?;
        let entrees: Vec<Entree> = serde_json::from_str(&brut).map_err(|e| format!("Index illisible : {e}"))?;
        lus.insert(s.cle, entrees);
    }
    Ok(f(&lus[s.cle]))
}

fn oublier_index(s: &Source) {
    if let Some(lus) = INDEX_LUS.lock().unwrap_or_else(PoisonError::into_inner).as_mut() {
        lus.remove(s.cle);
    }
}

// ── Les noms ──────────────────────────────────────────────────────────────

/// Un mot tel qu'on le compare : minuscules, sans accents, sans espaces en trop.
pub fn plat(mot: &str) -> String {
    let mut sortie = String::with_capacity(mot.len());
    for c in mot.to_lowercase().chars() {
        match c {
            'à' | 'â' | 'ä' | 'á' => sortie.push('a'),
            'é' | 'è' | 'ê' | 'ë' => sortie.push('e'),
            'î' | 'ï' | 'í' => sortie.push('i'),
            'ô' | 'ö' | 'ó' => sortie.push('o'),
            'ù' | 'û' | 'ü' | 'ú' => sortie.push('u'),
            'ç' => sortie.push('c'),
            'ÿ' => sortie.push('y'),
            'œ' => sortie.push_str("oe"),
            'æ' => sortie.push_str("ae"),
            _ => sortie.push(c),
        }
    }
    sortie.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Le nom d'une entrée du zip, sans son dossier ni son extension.
fn base_du_nom(nom: &str) -> &str {
    let base = nom.rsplit(['/', '\\']).next().unwrap_or(nom);
    match base.rfind('.') {
        Some(i) if base[i..].eq_ignore_ascii_case(".png") => &base[..i],
        _ => base,
    }
}

/// Le mot que dit le nom d'une image : « Colorie01.png » → « colorie »,
/// « Efface01 (1).png » → « efface », « francais/compter_1.png » → « compter ».
pub fn mot_du_nom(nom: &str, s: &Source) -> String {
    let mut m = base_du_nom(nom).trim().to_string();
    // « (1) » : une copie de fichier.
    if m.ends_with(')') {
        if let Some(i) = m.rfind(" (") {
            m.truncate(i);
        }
    }
    // « _1 » : une variante du même dessin.
    if let Some(i) = m.rfind('_') {
        if i > 0 && m[i + 1..].chars().all(|c| c.is_ascii_digit()) && i + 1 < m.len() {
            m.truncate(i);
        }
    }
    if s.numeros_colles {
        let sans = m.trim_end_matches(|c: char| c.is_ascii_digit());
        if !sans.trim().is_empty() {
            m = sans.to_string();
        }
    }
    m.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase()
}

/// Un nom de fichier qui passe partout : Windows refuse « : » ou « ? », et un
/// espace ou un point en fin de nom.
pub fn fichier_sur(nom: &str) -> String {
    let base: String = base_du_nom(nom)
        .chars()
        .map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '_' } else { c })
        .collect();
    let base = base.trim().trim_end_matches('.').trim();
    format!("{}.png", if base.is_empty() { "image" } else { base })
}

/// Range les images d'un zip dans `dossier`, et rend l'index, trié par mot.
///
/// Seuls les vrais PNG entrent : une image qu'on ne saurait pas lire
/// s'imprimerait en case vide. Deux noms qui reviennent au même fichier — le
/// disque du Mac ignore les majuscules — se départagent par « ~2 ».
pub fn extraire(s: &Source, zip: &[u8], dossier: &Path) -> Result<Vec<Entree>, String> {
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(zip)).map_err(|e| format!("Archive illisible : {e}"))?;
    std::fs::create_dir_all(dossier).map_err(|e| e.to_string())?;
    let mut pris: HashSet<String> = HashSet::new();
    let mut entrees = Vec::new();
    for i in 0..archive.len() {
        let mut f = archive.by_index(i).map_err(|e| format!("Archive illisible : {e}"))?;
        if f.is_dir() {
            continue;
        }
        let nom = f.name().to_string();
        if !nom.to_lowercase().ends_with(".png") {
            continue;
        }
        let mot = mot_du_nom(&nom, s);
        if mot.is_empty() {
            continue;
        }
        let mut octets = Vec::with_capacity(f.size() as usize);
        f.read_to_end(&mut octets).map_err(|e| format!("Image illisible ({nom}) : {e}"))?;
        if !octets.starts_with(b"\x89PNG") {
            continue;
        }
        let mut fichier = fichier_sur(&nom);
        let mut n = 2;
        while !pris.insert(fichier.to_lowercase()) {
            fichier = format!("{}~{n}.png", fichier_sur(&nom).trim_end_matches(".png"));
            n += 1;
        }
        std::fs::write(dossier.join(&fichier), &octets).map_err(|e| format!("Écriture : {e}"))?;
        entrees.push(Entree { fichier, mot });
    }
    entrees.sort_by(|a, b| a.mot.cmp(&b.mot).then_with(|| a.fichier.cmp(&b.fichier)));
    Ok(entrees)
}

// ── Chercher ──────────────────────────────────────────────────────────────

/// Une image trouvée : sa référence (« sclera:compter.png »), et le mot qui l'a trouvée.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PictoAppoint {
    pub reference: String,
    pub mot: String,
}

fn reference(s: &Source, e: &Entree) -> String {
    format!("{}:{}", s.cle, e.fichier)
}

/// Les images dont le nom dit exactement l'un des mots — accents et majuscules
/// mis à part —, dans l'ordre des mots. La première variante l'emporte ; un mot
/// sans image n'en ramène pas.
pub fn par_mots(s: &Source, entrees: &[Entree], mots: &[String]) -> Vec<PictoAppoint> {
    mots.iter()
        .filter_map(|m| {
            let cherche = plat(m);
            if cherche.is_empty() {
                return None;
            }
            entrees.iter().find(|e| plat(&e.mot) == cherche).map(|e| PictoAppoint { reference: reference(s, e), mot: m.trim().to_string() })
        })
        .collect()
}

/// Les images dont le nom répond à ce qu'on tape : le mot exact, puis ceux qui
/// commencent par lui, puis ceux qui le contiennent — et le nom par lequel
/// commence un mot plus long (« colorier » trouve « colorie », mais « entourer »
/// ne trouve pas « tour »). Rien tapé : toute la banque, dans l'ordre des mots.
pub fn chercher(s: &Source, entrees: &[Entree], q: &str, limite: usize) -> Vec<PictoAppoint> {
    let cherche = plat(q);
    let rang = |mot: &str| -> Option<u8> {
        let m = plat(mot);
        if cherche.is_empty() || m == cherche {
            Some(0)
        } else if m.starts_with(&cherche) {
            Some(1)
        } else if m.contains(&format!(" {cherche}")) {
            Some(2)
        } else if m.contains(&cherche) {
            Some(3)
        } else if m.chars().count() >= 4 && cherche.starts_with(&m) {
            Some(4)
        } else {
            None
        }
    };
    let mut trouves: Vec<(u8, &Entree)> = entrees.iter().filter_map(|e| rang(&e.mot).map(|r| (r, e))).collect();
    trouves.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.mot.chars().count().cmp(&b.1.mot.chars().count())).then_with(|| a.1.mot.cmp(&b.1.mot)));
    // Une variante (« compter_1 ») ne se montre pas à côté de son original.
    let mut vus = HashSet::new();
    trouves
        .into_iter()
        .filter(|(_, e)| vus.insert(e.mot.clone()))
        .take(limite)
        .map(|(_, e)| PictoAppoint { reference: reference(s, e), mot: e.mot.clone() })
        .collect()
}

// ── Les commandes ─────────────────────────────────────────────────────────

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EtatAppoint {
    pub banque: String,
    pub installee: bool,
    pub nombre: usize,
}

fn etat_de(s: &'static Source) -> EtatAppoint {
    let nombre = avec_index(s, |e| e.len()).unwrap_or(0);
    EtatAppoint { banque: s.cle.into(), installee: nombre > 0, nombre }
}

/// Ce que cet ordinateur a des banques d'appoint.
#[tauri::command(async)]
pub fn pictos_appoint_etat() -> Vec<EtatAppoint> {
    SOURCES.iter().map(etat_de).collect()
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Avancement {
    banque: String,
    recus: u64,
    total: u64,
}

/// Télécharge une banque depuis son site, et la range — en remplaçant l'ancienne d'un coup.
///
/// Les images s'écrivent d'abord à côté : une coupure en chemin laisse la
/// banque d'avant entière, jamais une banque à moitié.
#[tauri::command]
pub async fn pictos_appoint_telecharger(app: AppHandle, banque: String) -> Result<EtatAppoint, String> {
    let s = source(&banque)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(900))
        .build()
        .map_err(|e| e.to_string())?;
    let mut reponse = client
        .get(s.url)
        .send()
        .await
        .map_err(|e| format!("Réseau : {e}"))?
        .error_for_status()
        .map_err(|e| format!("Le site de {} a refusé la demande : {e}", s.nom))?;
    let total = reponse.content_length().unwrap_or(0);
    let mut octets: Vec<u8> = Vec::with_capacity(total as usize);
    let mut signale = 0u64;
    while let Some(morceau) = reponse.chunk().await.map_err(|e| format!("Réception : {e}"))? {
        octets.extend_from_slice(&morceau);
        let recus = octets.len() as u64;
        if recus - signale >= 512 * 1024 || recus == total {
            signale = recus;
            let _ = app.emit("pictos-appoint://avancement", Avancement { banque: s.cle.into(), recus, total });
        }
    }
    let dossier = dossier_de(s);
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let neuf = dossier.with_extension("neuf");
        let _ = std::fs::remove_dir_all(&neuf);
        let entrees = extraire(s, &octets, &neuf)?;
        if entrees.is_empty() {
            let _ = std::fs::remove_dir_all(&neuf);
            return Err(format!("L'archive de {} ne contient aucune image.", s.nom));
        }
        std::fs::write(neuf.join(INDEX), serde_json::to_string(&entrees).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Écriture : {e}"))?;
        let _ = std::fs::remove_dir_all(&dossier);
        std::fs::rename(&neuf, &dossier).map_err(|e| format!("Rangement : {e}"))
    })
    .await
    .map_err(|e| e.to_string())??;
    oublier_index(s);
    Ok(etat_de(s))
}

/// Les images d'une banque sous des mots exacts (voir `par_mots`).
#[tauri::command(async)]
pub fn pictos_appoint_par_mots(banque: String, mots: Vec<String>) -> Result<Vec<PictoAppoint>, String> {
    let s = source(&banque)?;
    avec_index(s, |e| par_mots(s, e, &mots))
}

/// Les images d'une banque qui répondent à ce qu'on tape (voir `chercher`).
#[tauri::command(async)]
pub fn pictos_appoint_chercher(banque: String, q: String, limite: usize) -> Result<Vec<PictoAppoint>, String> {
    let s = source(&banque)?;
    avec_index(s, |e| chercher(s, e, &q, limite))
}

/// L'image d'une référence, en base64.
#[tauri::command(async)]
pub fn pictos_appoint_image(reference: String) -> Result<String, String> {
    use base64::Engine;
    let (cle, fichier) = reference.split_once(':').ok_or("Référence de picto invalide.")?;
    let s = source(cle)?;
    if fichier.is_empty() || fichier.contains(['/', '\\']) || fichier.contains("..") {
        return Err("Référence de picto invalide.".into());
    }
    let octets = std::fs::read(dossier_de(s).join(fichier))
        .map_err(|_| format!("Cette image n'est pas dans la banque de {} de cet ordinateur.", s.nom))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(octets))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    static BAJARD: &Source = &SOURCES[0];
    static SCLERA: &Source = &SOURCES[1];

    fn entree(fichier: &str, mot: &str) -> Entree {
        Entree { fichier: fichier.into(), mot: mot.into() }
    }

    #[test]
    fn le_mot_d_une_image_se_lit_dans_son_nom() {
        assert_eq!(mot_du_nom("Colorie01.png", BAJARD), "colorie");
        assert_eq!(mot_du_nom("Barre02.png", BAJARD), "barre");
        assert_eq!(mot_du_nom("Efface01 (1).png", BAJARD), "efface");
        assert_eq!(mot_du_nom("ENcadre01.png", BAJARD), "encadre");
        assert_eq!(mot_du_nom("Range.png", BAJARD), "range");
        assert_eq!(mot_du_nom("Réfléchis01.png", BAJARD), "réfléchis");
        assert_eq!(mot_du_nom("francais/compter_1.png", SCLERA), "compter");
        assert_eq!(mot_du_nom("francais/lire .png", SCLERA), "lire");
        assert_eq!(mot_du_nom("francais/dessiner et  peinture_1.png", SCLERA), "dessiner et peinture");
        // Les chiffres de Sclera font partie du nom.
        assert_eq!(mot_du_nom("francais/10 commandements.png", SCLERA), "10 commandements");
        assert_eq!(mot_du_nom("francais/0.png", SCLERA), "0");
    }

    #[test]
    fn un_nom_de_fichier_passe_partout() {
        assert_eq!(fichier_sur("francais/lire .png"), "lire.png");
        assert_eq!(fichier_sur("francais/ battre la pâte .png"), "battre la pâte.png");
        assert_eq!(fichier_sur("a:b?.png"), "a_b_.png");
        assert_eq!(fichier_sur("francais/....png"), "image.png");
    }

    #[test]
    fn les_mots_se_comparent_sans_accents_ni_majuscules() {
        assert_eq!(plat("  Écris "), "ecris");
        assert_eq!(plat("Réfléchis"), "reflechis");
        assert_eq!(plat("dessiner et  peinture"), "dessiner et peinture");
        assert_eq!(plat("Cœur"), "coeur");
    }

    #[test]
    fn un_mot_exact_trouve_sa_premiere_variante_et_rien_d_approchant() {
        let entrees = vec![
            entree("Barre01.png", "barre"), entree("Barre02.png", "barre"),
            entree("ecrire.png", "ecrire"), entree("compter les gants.png", "compter les gants"),
        ];
        let mots: Vec<String> = ["barre", "écrire", "compter", "Barre"].iter().map(|m| m.to_string()).collect();
        assert_eq!(par_mots(BAJARD, &entrees, &mots), vec![
            PictoAppoint { reference: "bajard:Barre01.png".into(), mot: "barre".into() },
            PictoAppoint { reference: "bajard:ecrire.png".into(), mot: "écrire".into() },
            PictoAppoint { reference: "bajard:Barre01.png".into(), mot: "Barre".into() },
        ]);
    }

    #[test]
    fn la_recherche_range_le_mot_exact_d_abord_et_tait_les_variantes() {
        let entrees = vec![
            entree("compter les gants.png", "compter les gants"), entree("compter.png", "compter"), entree("compter_1.png", "compter"),
            entree("changement compter.png", "changement compter"), entree("recompter.png", "recompter"), entree("colorie.png", "colorie"),
        ];
        let mots: Vec<String> = chercher(SCLERA, &entrees, "Compter", 10).into_iter().map(|p| p.mot).collect();
        assert_eq!(mots, vec!["compter", "compter les gants", "changement compter", "recompter"]);
        // Un verbe à l'infinitif trouve la consigne à l'impératif par laquelle il commence…
        assert_eq!(chercher(BAJARD, &entrees, "colorier", 10)[0].reference, "bajard:colorie.png");
        // … mais pas un mot qu'il contient par hasard.
        assert!(chercher(SCLERA, &[entree("tour.png", "tour")], "entourer", 10).is_empty());
        // Rien tapé : toute la banque, sans les variantes.
        assert_eq!(chercher(BAJARD, &entrees, "", 50).len(), 5);
        assert_eq!(chercher(BAJARD, &entrees, "", 2).len(), 2);
    }

    #[test]
    fn un_zip_se_range_en_images_et_en_index() {
        let png = |n: u8| [b"\x89PNG\r\n\x1a\n".as_slice(), &[n; 8]].concat();
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        for (nom, octets) in [
            ("Colorie01.png", png(1)), ("Colorie02.png", png(2)), ("ENcadre01.png", png(3)), ("Encadre01.png", png(4)),
            ("lisez-moi.txt", b"texte".to_vec()), ("faux.png", b"pas une image".to_vec()),
        ] {
            zip.start_file(nom, options).unwrap();
            zip.write_all(&octets).unwrap();
        }
        let octets = zip.finish().unwrap().into_inner();
        let dossier = std::env::temp_dir().join(format!("maitrize-pictos-essai-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dossier);
        let entrees = extraire(BAJARD, &octets, &dossier).unwrap();
        assert_eq!(entrees, vec![
            entree("Colorie01.png", "colorie"), entree("Colorie02.png", "colorie"),
            entree("ENcadre01.png", "encadre"), entree("Encadre01~2.png", "encadre"),
        ]);
        assert_eq!(std::fs::read(dossier.join("Encadre01~2.png")).unwrap(), png(4));
        assert!(!dossier.join("faux.png").exists());
        let _ = std::fs::remove_dir_all(&dossier);
    }

    #[test]
    fn une_reference_ne_sort_pas_de_sa_banque() {
        assert!(pictos_appoint_image("sclera:../index.json".into()).is_err());
        assert!(pictos_appoint_image("sclera:".into()).is_err());
        assert!(pictos_appoint_image("autre:x.png".into()).is_err());
        assert!(pictos_appoint_image("sans-deux-points".into()).is_err());
    }
}
