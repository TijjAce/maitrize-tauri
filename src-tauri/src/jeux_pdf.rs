//! Fabrique les jeux imprimables à partir d'une sélection de pictogrammes.
//!
//! Le module sépare volontairement trois choses :
//!
//!   1. **la sélection** — d'où viennent les pictos (voir `arasaac`) ;
//!   2. **le jeu** — comment ils se répartissent en planches (trait `Jeu`) ;
//!   3. **le rendu** — comment une planche devient une page (`rendre`).
//!
//! Seul le point 2 change d'un jeu à l'autre. Le loto en est la première
//! implémentation ; un memory, un domino ou un imagier s'ajoutent en écrivant
//! une seule fonction, sans toucher au reste.
//!
//! ## Sobriété visuelle
//!
//! Les planches sont destinées à des enfants avec autisme ou troubles du
//! développement. Fond blanc, pas de titre, pas de décor, pas de couleur, un
//! seul picto par case et beaucoup d'air autour : chaque élément graphique en
//! plus est un élément de plus à trier pour l'enfant. Les constantes qui
//! suivent ne sont pas des préférences esthétiques, ce sont des contraintes.

use crate::arasaac::{PictoChoisi, Tirage};
use printpdf::*;
use serde::Deserialize;

// ── Contraintes d'accessibilité, communes à tous les jeux ──────────────────

/// Bord de case : gris clair, présent pour délimiter, jamais pour décorer.
const GRIS_BORD: (f32, f32, f32) = (0.72, 0.72, 0.72);
/// Part de la case laissée vide autour du picto.
const MARGE_CASE: f32 = 0.14;
/// Marges de page et écart entre cases, en millimètres.
const MARGE_PAGE: f32 = 16.0;
const ECART: f32 = 12.0;
/// Hauteur réservée au mot quand les libellés sont demandés.
const HAUTEUR_MOT: f32 = 8.0;
/// Taille du mot, en points : la plus grande qui tient dans la case.
const TAILLE_MOT: f32 = 13.0;
/// Sur deux lignes, la taille est plafonnée pour tenir dans `HAUTEUR_MOT`.
const TAILLE_MOT_DEUX_LIGNES: f32 = 10.0;
const TAILLE_MOT_MIN: f32 = 7.0;
/// Blanc laissé de chaque côté du mot, dans la case.
const MARGE_MOT: f32 = 3.0;
const PT_EN_MM: f32 = 0.3528;
/// Rayon des angles de case, en millimètres.
const RAYON: f32 = 6.0;

/// Mention imposée par la licence CC BY-NC-SA des pictogrammes. Elle ne vaut
/// que pour eux : une planche faite des seules images de l'enseignant n'a
/// rien à attribuer à la banque.
const ATTRIBUTION: &str = "Pictogrammes ARASAAC (Sergio Palao, arasaac.org) - Gouvernement d'Aragon - CC BY-NC-SA 4.0 - Usage non commercial";
/// Les pictos gardés dans « Mes pictos » (voir mesPictos.ts) : la plage de
/// leur numéro dit d'où ils viennent. Un dessin de l'IA n'est pas d'ARASAAC,
/// et la feuille le dit ; Sclera et F. Bajard demandent leur nom.
const MENTION_IA: &str = "Pictogrammes dessinés par IA (Mistral AI) à la manière d'ARASAAC : ils n'en font pas partie";
const MENTION_SCLERA: &str = "Pictogrammes Sclera (www.sclera.be) - CC BY-NC 2.0 BE";
const MENTION_BAJARD: &str = "Pictogrammes F. Bajard (ressources-ecole-inclusive.org) - CC BY-NC-SA 4.0";

/// Les compétences travaillées, dans la marge haute : corps en points,
/// interligne en millimètres, et le nombre de lignes que la marge accepte
/// sans toucher à la zone de jeu.
const TAILLE_COMPETENCES: f32 = 7.0;
const INTERLIGNE_COMPETENCES: f32 = 3.0;
const LIGNES_COMPETENCES: usize = 3;

// ── Modèle commun ──────────────────────────────────────────────────────────

/// Une planche : une grille de cases sur une page.
pub struct Planche {
    pub colonnes: u8,
    pub lignes: u8,
    pub cases: Vec<PictoChoisi>,
    pub paysage: bool,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Options {
    /// Mot écrit sous le picto. Faux par défaut : les non-lecteurs n'en tirent
    /// rien, et le texte ajoute du bruit visuel.
    #[serde(default)]
    pub libelles: bool,
    #[serde(default = "vrai")]
    pub cartes: bool,
    #[serde(default = "trois")]
    pub colonnes: u8,
    #[serde(default = "deux")]
    pub lignes: u8,
    #[serde(default = "six")]
    pub planches: u8,
    #[serde(default)]
    pub graine: u64,
    /// Ce que l'atelier travaille, une compétence par ligne. Écrit dans la
    /// marge haute, en petit et en gris, pour l'adulte qui range la feuille :
    /// la zone de jeu n'en sait rien.
    #[serde(default)]
    pub competences: Vec<String>,
}

fn vrai() -> bool { true }
fn trois() -> u8 { 3 }
fn deux() -> u8 { 2 }
fn six() -> u8 { 6 }

/// Ce que tout jeu doit savoir faire : dire son nom, dire combien de pictos il
/// lui faut au minimum, et répartir un vivier en planches.
pub trait Jeu {
    fn nom(&self) -> &'static str;
    fn minimum(&self, o: &Options) -> usize;
    fn planches(&self, vivier: &[PictoChoisi], o: &Options) -> Vec<Planche>;
}

// ── Loto ───────────────────────────────────────────────────────────────────

pub struct Loto;

impl Jeu for Loto {
    fn nom(&self) -> &'static str {
        "loto"
    }

    fn minimum(&self, o: &Options) -> usize {
        (o.colonnes as usize) * (o.lignes as usize)
    }

    fn planches(&self, vivier: &[PictoChoisi], o: &Options) -> Vec<Planche> {
        let par_planche = self.minimum(o);
        let mut tirage = Tirage::nouveau(o.graine);
        let mut sorties = Vec::new();
        let mut utilises: Vec<PictoChoisi> = Vec::new();

        for _ in 0..o.planches {
            let mut vivier_melange = vivier.to_vec();
            tirage.melanger(&mut vivier_melange);
            let cases: Vec<PictoChoisi> = vivier_melange.into_iter().take(par_planche).collect();
            utilises.extend(cases.iter().cloned());
            sorties.push(Planche {
                colonnes: o.colonnes,
                lignes: o.lignes,
                cases,
                paysage: true,
            });
        }

        // Les cartes à piocher : chaque picto apparu sur une planche, une fois.
        if o.cartes {
            let mut vus = std::collections::HashSet::new();
            let uniques: Vec<PictoChoisi> = utilises
                .into_iter()
                .filter(|p| vus.insert(p.id))
                .collect();
            for lot in uniques.chunks(12) {
                sorties.push(Planche {
                    colonnes: 3,
                    lignes: 4,
                    cases: lot.to_vec(),
                    paysage: false,
                });
            }
        }
        sorties
    }
}

// ── Mémory ─────────────────────────────────────────────────────────────────

/// Des paires à retrouver : chaque image sort deux fois, mêlées au hasard.
///
/// Une planche de mémory n'est pas une grille de jeu mais une feuille de
/// cartes à découper : les deux cartes d'une paire ne doivent surtout pas
/// tomber côte à côte, ce dont le mélange se charge.
pub struct Memory;

impl Jeu for Memory {
    fn nom(&self) -> &'static str {
        "mémory"
    }

    /// Une planche pleine fait la moitié de ses cases en paires.
    fn minimum(&self, o: &Options) -> usize {
        ((o.colonnes as usize) * (o.lignes as usize) / 2).max(2)
    }

    fn planches(&self, vivier: &[PictoChoisi], o: &Options) -> Vec<Planche> {
        let par_planche = (o.colonnes as usize) * (o.lignes as usize);
        let voulu = (par_planche * o.planches.max(1) as usize) / 2;
        let mut tirage = Tirage::nouveau(o.graine);
        let mut choix = vivier.to_vec();
        tirage.melanger(&mut choix);
        choix.truncate(voulu.max(self.minimum(o)));
        // Chaque image en double, puis tout mêlé : les paires s'éparpillent.
        let mut cartes: Vec<PictoChoisi> = choix.iter().chain(choix.iter()).cloned().collect();
        tirage.melanger(&mut cartes);
        cartes
            .chunks(par_planche)
            .map(|lot| Planche {
                colonnes: o.colonnes,
                lignes: o.lignes,
                cases: lot.to_vec(),
                paysage: o.colonnes > o.lignes,
            })
            .collect()
    }
}

// ── Imagier ────────────────────────────────────────────────────────────────

/// Des fiches de nomenclature : une image, son mot, dans l'ordre choisi.
///
/// Rien n'est mélangé ni tiré au sort : l'enseignant a rangé sa sélection, et
/// l'imagier la suit. Le mot est toujours écrit — c'est tout l'objet.
pub struct Imagier;

impl Jeu for Imagier {
    fn nom(&self) -> &'static str {
        "imagier"
    }

    fn minimum(&self, _o: &Options) -> usize {
        1
    }

    fn planches(&self, vivier: &[PictoChoisi], o: &Options) -> Vec<Planche> {
        let par_page = ((o.colonnes as usize) * (o.lignes as usize)).max(1);
        vivier
            .chunks(par_page)
            .map(|lot| Planche {
                colonnes: o.colonnes,
                lignes: o.lignes,
                cases: lot.to_vec(),
                paysage: o.colonnes > o.lignes,
            })
            .collect()
    }
}

pub fn jeu(nom: &str) -> Option<Box<dyn Jeu>> {
    match nom {
        "loto" => Some(Box::new(Loto)),
        "memory" => Some(Box::new(Memory)),
        "imagier" => Some(Box::new(Imagier)),
        _ => None,
    }
}

// ── Rendu ──────────────────────────────────────────────────────────────────

/// Charge un PNG et l'aplatit sur blanc.
///
/// Les pictogrammes ARASAAC ont un fond transparent. printpdf gère mal le
/// canal alpha : sans cet aplatissement, les pictos sortent sur un carré noir.
/// Comme les planches sont blanches, composer sur blanc ne change rien à l'œil
/// et supprime le problème à la source.
fn charger_sur_blanc(chemin: &str) -> Result<::image::RgbImage, String> {
    Ok(aplatir(::image::open(chemin).map_err(|e| format!("{chemin} : {e}"))?))
}

pub(crate) fn aplatir(brut: ::image::DynamicImage) -> ::image::RgbImage {
    let rgba = brut.to_rgba8();
    let mut sortie = ::image::RgbImage::new(rgba.width(), rgba.height());
    for (x, y, p) in rgba.enumerate_pixels() {
        let a = p[3] as f32 / 255.0;
        let melange = |c: u8| (c as f32 * a + 255.0 * (1.0 - a)).round() as u8;
        sortie.put_pixel(x, y, ::image::Rgb([melange(p[0]), melange(p[1]), melange(p[2])]));
    }
    sortie
}

// ── Les images de l'enseignant ─────────────────────────────────────────────

/// Une image qui n'est pas dans la banque : une photo de l'objet réel, le
/// dessin d'un élève. Elle arrive avec la demande et ne passe pas par le
/// disque ; le pictogramme de même identifiant, dans la sélection, la porte.
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImageFournie {
    pub id: i64,
    /// Le fichier lui-même, en base64 : un PNG, ou un JPEG pour une photo.
    pub donnees: String,
}

/// Une image prête à poser dans une case.
#[derive(Clone)]
pub(crate) enum Pixels {
    /// Décodée et aplatie sur blanc : un pictogramme, un dessin détouré.
    Bruts(::image::RgbImage),
    /// Un JPEG posé tel quel : le PDF sait le lire, et une photo y pèse dix
    /// fois moins que ses pixels.
    Jpeg { octets: Vec<u8>, largeur: u32, hauteur: u32, gris: bool },
}

impl Pixels {
    pub(crate) fn dimensions(&self) -> (u32, u32) {
        match self {
            Pixels::Bruts(i) => (i.width(), i.height()),
            Pixels::Jpeg { largeur, hauteur, .. } => (*largeur, *hauteur),
        }
    }

    pub(crate) fn en_objet(self) -> ImageXObject {
        let (largeur, hauteur) = self.dimensions();
        let (color_space, image_data, image_filter) = match self {
            Pixels::Bruts(i) => (ColorSpace::Rgb, i.into_raw(), None),
            Pixels::Jpeg { octets, gris, .. } => {
                (if gris { ColorSpace::Greyscale } else { ColorSpace::Rgb }, octets, Some(ImageFilter::DCT))
            }
        };
        ImageXObject {
            width: Px(largeur as usize),
            height: Px(hauteur as usize),
            color_space,
            bits_per_component: ColorBits::Bit8,
            interpolate: true,
            image_data,
            image_filter,
            clipping_bbox: None,
            smask: None,
        }
    }
}

type Fournies = std::collections::HashMap<i64, Pixels>;

/// Largeur, hauteur et nombre de composantes d'un JPEG, lus dans son en-tête.
///
/// Seuls les JPEG que le PDF sait lire passent : séquentiels ou progressifs,
/// en gris ou en couleurs. Tout autre (sans perte, arithmétique, CMJN) est
/// refusé plutôt que d'imprimer une case vide.
pub(crate) fn entete_jpeg(o: &[u8]) -> Option<(u32, u32, u8)> {
    if o.len() < 4 || o[0] != 0xFF || o[1] != 0xD8 {
        return None;
    }
    let mut i = 2;
    while i + 3 < o.len() {
        if o[i] != 0xFF {
            return None;
        }
        let marqueur = o[i + 1];
        // Octets de remplissage, puis les marqueurs qui ne portent pas de longueur.
        if marqueur == 0xFF {
            i += 1;
            continue;
        }
        if marqueur == 0x01 || (0xD0..=0xD8).contains(&marqueur) {
            i += 2;
            continue;
        }
        let longueur = u16::from_be_bytes([o[i + 2], o[i + 3]]) as usize;
        match marqueur {
            0xC0..=0xC2 => {
                let c = o.get(i + 5..i + 10)?;
                let (hauteur, largeur) = (u16::from_be_bytes([c[0], c[1]]) as u32, u16::from_be_bytes([c[2], c[3]]) as u32);
                return (largeur > 0 && hauteur > 0 && matches!(c[4], 1 | 3)).then_some((largeur, hauteur, c[4]));
            }
            // Un autre codage, ou les données sans en-tête : pas pour nous.
            0xC3 | 0xC5..=0xC7 | 0xC9..=0xCB | 0xCD..=0xCF | 0xDA | 0xD9 => return None,
            _ => i += 2 + longueur.max(2),
        }
    }
    None
}

/// Les images de l'enseignant, prêtes à poser : un JPEG reste un JPEG, un PNG
/// est décodé et aplati sur blanc comme un pictogramme.
fn preparer(images: &[ImageFournie]) -> Result<Fournies, String> {
    use base64::Engine;
    let mut sortie = Fournies::new();
    for image in images {
        let octets = base64::engine::general_purpose::STANDARD
            .decode(image.donnees.trim())
            .map_err(|e| format!("Image illisible : {e}"))?;
        let pixels = if let Some((largeur, hauteur, composantes)) = entete_jpeg(&octets) {
            Pixels::Jpeg { octets, largeur, hauteur, gris: composantes == 1 }
        } else {
            let brut = ::image::load_from_memory_with_format(&octets, ::image::ImageFormat::Png)
                .map_err(|e| format!("Image illisible ({e}) : il faut un PNG ou un JPEG."))?;
            Pixels::Bruts(aplatir(brut))
        };
        sortie.insert(image.id, pixels);
    }
    Ok(sortie)
}

/// Vrai si la planche porte au moins un pictogramme de la banque : c'est à
/// lui que va la mention de licence.
fn doit_la_mention(planche: &Planche, fournies: &Fournies) -> bool {
    planche.cases.iter().any(|p| !fournies.contains_key(&p.id))
}

/// Les mentions qu'une planche doit porter, dans l'ordre : la banque, puis
/// les pictos gardés selon leur origine.
fn mentions(planche: &Planche, fournies: &Fournies) -> Vec<&'static str> {
    let porte = |haut: i64, bas: i64| planche.cases.iter().any(|p| p.id <= haut && p.id > bas);
    let mut m = Vec::new();
    if doit_la_mention(planche, fournies) {
        m.push(ATTRIBUTION);
    }
    if porte(-1_400_000_000, -1_800_000_000) {
        m.push(MENTION_SCLERA);
    }
    if porte(-1_800_000_000, -2_100_000_000) {
        m.push(MENTION_BAJARD);
    }
    if porte(-1_000_000_000, -1_400_000_000) {
        m.push(MENTION_IA);
    }
    m
}

/// Chasse d'un caractère en capitales dans l'Helvetica intégrée au PDF, en
/// millièmes de cadratin (métriques Adobe des 14 polices standard). Les
/// capitales accentuées ont la chasse de leur lettre de base.
fn chasse(c: char) -> f32 {
    let base = match c {
        'À' | 'Â' | 'Ä' | 'Á' | 'Ã' | 'Å' => 'A',
        'Ç' => 'C',
        'È' | 'É' | 'Ê' | 'Ë' => 'E',
        'Ì' | 'Í' | 'Î' | 'Ï' => 'I',
        'Ñ' => 'N',
        'Ò' | 'Ó' | 'Ô' | 'Õ' | 'Ö' => 'O',
        'Ù' | 'Ú' | 'Û' | 'Ü' => 'U',
        'Ý' | 'Ÿ' => 'Y',
        autre => autre,
    };
    match base {
        'A' | 'B' | 'E' | 'K' | 'P' | 'S' | 'V' | 'X' | 'Y' => 667.0,
        'C' | 'D' | 'H' | 'N' | 'R' | 'U' => 722.0,
        'F' | 'T' | 'Z' => 611.0,
        'G' | 'O' | 'Q' => 778.0,
        'I' => 278.0,
        'J' => 500.0,
        'L' => 556.0,
        'M' => 833.0,
        'W' => 944.0,
        'Œ' | 'Æ' => 1000.0,
        '0'..='9' => 556.0,
        ' ' | '.' | ',' | ':' | ';' | '!' | '/' => 278.0,
        '-' | '(' | ')' => 333.0,
        '\'' => 191.0,
        '’' => 222.0,
        _ => 667.0,
    }
}

/// Largeur d'un texte en capitales, en millimètres.
fn largeur_capitales(texte: &str, taille: f32) -> f32 {
    texte.chars().map(chasse).sum::<f32>() / 1000.0 * taille * PT_EN_MM
}

/// Le mot écrit sous le picto : en capitales d'imprimerie, les premières que
/// les élèves apprennent à reconnaître, à la plus grande taille qui tient dans
/// la case — sur deux lignes pour une expression trop longue.
///
/// Les capitales accentuées sont gardées (ÉCOLE) : l'Helvetica du PDF les
/// connaît toutes.
fn disposer_mot(mot: &str, largeur_dispo: f32) -> (Vec<String>, f32) {
    let texte = mot.split_whitespace().collect::<Vec<_>>().join(" ").to_uppercase();
    let a_taille_1 = largeur_capitales(&texte, 1.0);
    if a_taille_1 * TAILLE_MOT <= largeur_dispo {
        return (vec![texte], TAILLE_MOT);
    }
    let sur_une_ligne = largeur_dispo / a_taille_1;
    let mots: Vec<&str> = texte.split(' ').collect();
    if mots.len() < 2 || sur_une_ligne >= TAILLE_MOT_DEUX_LIGNES {
        return (vec![texte], sur_une_ligne.max(TAILLE_MOT_MIN));
    }
    // Coupure la plus équilibrée : la ligne la plus longue la plus courte possible.
    let (coupure, plus_longue) = (1..mots.len())
        .map(|i| (i, largeur_capitales(&mots[..i].join(" "), 1.0).max(largeur_capitales(&mots[i..].join(" "), 1.0))))
        .min_by(|a, b| a.1.total_cmp(&b.1))
        .unwrap();
    let taille = (largeur_dispo / plus_longue).clamp(TAILLE_MOT_MIN, TAILLE_MOT_DEUX_LIGNES);
    if taille <= sur_une_ligne {
        return (vec![texte], sur_une_ligne.max(TAILLE_MOT_MIN));
    }
    (vec![mots[..coupure].join(" "), mots[coupure..].join(" ")], taille)
}

fn couleur(c: (f32, f32, f32)) -> Color {
    Color::Rgb(Rgb::new(c.0, c.1, c.2, None))
}

/// Contour d'un rectangle aux angles arrondis.
///
/// printpdf ne connaît que les rectangles à angles vifs ; l'arrondi demandé
/// pour ces planches se construit donc à la main, un quart de cercle par coin.
/// La convention de printpdf pour une courbe cubique est : point de départ et
/// première poignée marqués `true`, seconde poignée et arrivée marqués `false`.
fn rect_arrondi(x: f32, y: f32, l: f32, h: f32, r: f32) -> Vec<(Point, bool)> {
    // Constante d'approximation d'un quart de cercle par une cubique.
    const K: f32 = 0.5523;
    let (d, p) = (r, r * (1.0 - K));
    let pt = |a: f32, b: f32, ctrl: bool| (Point::new(Mm(a), Mm(b)), ctrl);
    vec![
        pt(x + d, y, false),
        pt(x + l - d, y, true),
        pt(x + l - p, y, true),
        pt(x + l, y + p, false),
        pt(x + l, y + d, false),
        pt(x + l, y + h - d, true),
        pt(x + l, y + h - p, true),
        pt(x + l - p, y + h, false),
        pt(x + l - d, y + h, false),
        pt(x + d, y + h, true),
        pt(x + p, y + h, true),
        pt(x, y + h - p, false),
        pt(x, y + h - d, false),
        pt(x, y + d, true),
        pt(x, y + p, true),
        pt(x + p, y, false),
    ]
}

// Une planche de loto se décrit par ce qu'elle porte : la réduire à moins
// d'arguments demanderait une structure qui ne servirait qu'ici.
#[allow(clippy::too_many_arguments)]
fn rendre_planche(
    doc: &PdfDocumentReference,
    page: PdfPageIndex,
    couche: PdfLayerIndex,
    planche: &Planche,
    o: &Options,
    police: &IndirectFontRef,
    largeur: f32,
    hauteur: f32,
    fournies: &Fournies,
) -> Result<(), String> {
    let c = doc.get_page(page).get_layer(couche);
    let (cols, lignes) = (planche.colonnes as f32, planche.lignes as f32);
    // Des cases carrées, comme les pictos : le côté que la page permet dans
    // les deux sens, et la grille centrée dans ce qui reste.
    let cote = ((largeur - 2.0 * MARGE_PAGE - (cols - 1.0) * ECART) / cols)
        .min((hauteur - 2.0 * MARGE_PAGE - (lignes - 1.0) * ECART) / lignes);
    let (case_l, case_h) = (cote, cote);
    let x0 = (largeur - cols * cote - (cols - 1.0) * ECART) / 2.0;
    let haut = hauteur - (hauteur - lignes * cote - (lignes - 1.0) * ECART) / 2.0;

    for (i, picto) in planche.cases.iter().enumerate() {
        let col = (i % planche.colonnes as usize) as f32;
        let rang = (i / planche.colonnes as usize) as f32;
        let x = x0 + col * (case_l + ECART);
        let y = haut - (rang + 1.0) * case_h - rang * ECART;

        // Cadre discret.
        c.set_outline_color(couleur(GRIS_BORD));
        c.set_outline_thickness(1.0);
        c.add_line(Line { points: rect_arrondi(x, y, case_l, case_h, RAYON), is_closed: true });

        // Picto, agrandi au maximum de la place restante, centré.
        let marge_l = case_l * MARGE_CASE;
        let marge_h = case_h * MARGE_CASE;
        let place_l = case_l - 2.0 * marge_l;
        let hauteur_mot = if o.libelles { HAUTEUR_MOT } else { 0.0 };
        let place_h = case_h - 2.0 * marge_h - hauteur_mot;

        // L'image de l'enseignant si c'en est une, le fichier de la banque sinon.
        let img = match fournies.get(&picto.id) {
            Some(fournie) => fournie.clone(),
            None => Pixels::Bruts(charger_sur_blanc(&picto.fichier)?),
        };
        let (iw, ih) = img.dimensions();
        let (iw, ih) = (iw as f32, ih as f32);
        let echelle = (place_l / iw).min(place_h / ih);
        let (dl, dh) = (iw * echelle, ih * echelle);
        // printpdf place l'image en points par pouce : on convertit la taille
        // voulue en mm vers un facteur d'échelle appliqué aux pixels.
        let dpi = 300.0;
        Image::from(img.en_objet())
        .add_to_layer(
            c.clone(),
            ImageTransform {
                translate_x: Some(Mm(x + (case_l - dl) / 2.0)),
                translate_y: Some(Mm(y + marge_h + hauteur_mot + (place_h - dh) / 2.0)),
                scale_x: Some(dl / (iw / dpi * 25.4)),
                scale_y: Some(dh / (ih / dpi * 25.4)),
                dpi: Some(dpi),
                ..Default::default()
            },
        );

        if o.libelles {
            c.set_fill_color(couleur((0.1, 0.1, 0.1)));
            let (lignes, taille) = disposer_mot(&picto.mot, case_l - 2.0 * MARGE_MOT);
            let interligne = taille * 1.15 * PT_EN_MM;
            for (k, ligne) in lignes.iter().enumerate() {
                // printpdf ne centre pas : on centre d'après la chasse réelle des capitales.
                let dx = (case_l - largeur_capitales(ligne, taille)) / 2.0;
                let dy = (lignes.len() - 1 - k) as f32 * interligne;
                c.use_text(ligne, taille, Mm(x + dx), Mm(y + marge_h + dy), police);
            }
        }
    }

    // Attribution obligatoire, hors zone de jeu, la plus discrète possible :
    // une ligne, ou deux quand les mentions n'y tiennent pas.
    let a_dire = mentions(planche, fournies);
    if !a_dire.is_empty() {
        c.set_fill_color(couleur((0.6, 0.6, 0.6)));
        let chasse_mention = |texte: &str| texte.chars().count() as f32 * 6.0 * 0.5 * 0.3528;
        let une_ligne = a_dire.join(" - ");
        let lignes = if chasse_mention(&une_ligne) <= largeur - 20.0 {
            vec![une_ligne]
        } else {
            a_dire.iter().map(|s| s.to_string()).collect()
        };
        for (k, ligne) in lignes.iter().enumerate() {
            let y = 7.0 + (lignes.len() - 1 - k) as f32 * 2.6;
            c.use_text(ligne.as_str(), 6.0, Mm((largeur - chasse_mention(ligne)) / 2.0), Mm(y), police);
        }
    }
    ecrire_competences(&c, &o.competences, largeur, hauteur, police);
    Ok(())
}

/// Les compétences travaillées, dans la marge haute.
///
/// Elles s'adressent à l'adulte qui classe la feuille, pas à l'enfant qui
/// joue : même gris discret que l'attribution, hors de la zone de jeu, et
/// sur chaque page pour qu'une planche séparée du lot reste identifiable.
fn ecrire_competences(
    c: &PdfLayerReference,
    competences: &[String],
    largeur: f32,
    hauteur: f32,
    police: &IndirectFontRef,
) {
    let lignes = lignes_competences(competences, largeur - 2.0 * MARGE_PAGE, TAILLE_COMPETENCES, LIGNES_COMPETENCES);
    c.set_fill_color(couleur((0.42, 0.42, 0.47)));
    for (k, ligne) in lignes.iter().enumerate() {
        let y = hauteur - 7.5 - k as f32 * INTERLIGNE_COMPETENCES;
        c.use_text(ligne, TAILLE_COMPETENCES, Mm(MARGE_PAGE), Mm(y), police);
    }
}

/// Les lignes à écrire pour des compétences : coupées aux mots pour tenir
/// dans `largeur` (mm), `max` lignes au plus — la dernière finit par « … »
/// quand la place a manqué. Sert aussi au tableau de langage.
pub(crate) fn lignes_competences(competences: &[String], largeur: f32, corps: f32, max: usize) -> Vec<String> {
    let mut lignes: Vec<String> = competences
        .iter()
        .map(|c| c.trim())
        .filter(|c| !c.is_empty())
        .flat_map(|c| crate::synthese_pdf::wrap(c, largeur, corps))
        .collect();
    if lignes.len() > max {
        lignes.truncate(max);
        if let Some(derniere) = lignes.last_mut() {
            let garde = derniere.chars().count().saturating_sub(2);
            let mut coupee: String = derniere.chars().take(garde).collect();
            coupee.push('…');
            *derniere = coupee;
        }
    }
    lignes
}

/// Produit le PDF complet d'un jeu.
pub fn construire(
    nom_jeu: &str,
    vivier: &[PictoChoisi],
    images: &[ImageFournie],
    o: &Options,
) -> Result<Vec<u8>, String> {
    let jeu = jeu(nom_jeu).ok_or_else(|| format!("Jeu inconnu : {nom_jeu}"))?;
    let minimum = jeu.minimum(o);
    if vivier.len() < minimum {
        return Err(format!(
            "Il faut au moins {minimum} images pour une planche {}×{} ; la sélection n'en donne que {}. \
             Élargissez la catégorie ou ajoutez des images.",
            o.colonnes, o.lignes, vivier.len()
        ));
    }
    let fournies = preparer(images)?;
    let planches = jeu.planches(vivier, o);
    if planches.is_empty() {
        return Err("Aucune planche à produire.".into());
    }

    let (l0, h0) = dimensions(&planches[0]);
    let (doc, page, couche) =
        PdfDocument::new(format!("Maitrize — {}", jeu.nom()), Mm(l0), Mm(h0), "Planche");
    let police = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| format!("Police : {e}"))?;

    rendre_planche(&doc, page, couche, &planches[0], o, &police, l0, h0, &fournies)?;
    for planche in &planches[1..] {
        let (l, h) = dimensions(planche);
        let (p, c) = doc.add_page(Mm(l), Mm(h), "Planche");
        rendre_planche(&doc, p, c, planche, o, &police, l, h, &fournies)?;
    }

    doc.save_to_bytes().map_err(|e| format!("Écriture du PDF : {e}"))
}

fn dimensions(p: &Planche) -> (f32, f32) {
    if p.paysage { (297.0, 210.0) } else { (210.0, 297.0) }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vivier(n: usize) -> Vec<PictoChoisi> {
        (0..n)
            .map(|i| PictoChoisi { id: i as i64, mot: format!("mot{i}"), fichier: String::new(), nature: String::new() })
            .collect()
    }

    fn options() -> Options {
        Options { libelles: false, cartes: true, colonnes: 3, lignes: 2, planches: 6, graine: 42, competences: vec![] }
    }

    #[test]
    fn chaque_planche_porte_le_bon_nombre_de_cases() {
        let p = Loto.planches(&vivier(18), &options());
        let planches: Vec<&Planche> = p.iter().filter(|x| x.paysage).collect();
        assert_eq!(planches.len(), 6);
        for planche in planches {
            assert_eq!(planche.cases.len(), 6);
        }
    }

    #[test]
    fn une_planche_ne_repete_jamais_un_picto() {
        // Deux fois le même dessin sur une planche rend le loto injouable.
        for planche in Loto.planches(&vivier(18), &options()) {
            let mut vus = std::collections::HashSet::new();
            for c in &planche.cases {
                assert!(vus.insert(c.id), "picto {} en double sur une planche", c.id);
            }
        }
    }

    #[test]
    fn les_cartes_a_decouper_sont_uniques() {
        let p = Loto.planches(&vivier(18), &options());
        let cartes: Vec<i64> = p.iter().filter(|x| !x.paysage).flat_map(|x| x.cases.iter().map(|c| c.id)).collect();
        let uniques: std::collections::HashSet<i64> = cartes.iter().copied().collect();
        assert_eq!(cartes.len(), uniques.len(), "une carte tirée deux fois fausse la partie");
    }

    #[test]
    fn toute_carte_figure_sur_une_planche() {
        // Sinon on pioche une image que personne ne peut poser.
        let p = Loto.planches(&vivier(18), &options());
        let sur_planches: std::collections::HashSet<i64> =
            p.iter().filter(|x| x.paysage).flat_map(|x| x.cases.iter().map(|c| c.id)).collect();
        for carte in p.iter().filter(|x| !x.paysage).flat_map(|x| x.cases.iter()) {
            assert!(sur_planches.contains(&carte.id), "carte {} sans planche", carte.id);
        }
    }

    #[test]
    fn le_memory_sort_chaque_image_deux_fois_sans_les_coller() {
        let mut o = options();
        (o.colonnes, o.lignes, o.planches) = (4, 4, 2);
        let planches = Memory.planches(&vivier(40), &o);
        let cartes: Vec<i64> = planches.iter().flat_map(|p| p.cases.iter().map(|c| c.id)).collect();
        assert_eq!(cartes.len(), 32);
        // Chaque image apparaît exactement deux fois.
        let mut compte = std::collections::HashMap::new();
        for id in &cartes { *compte.entry(id).or_insert(0) += 1; }
        assert!(compte.values().all(|n| *n == 2), "des images ne sont pas en paire");
        assert_eq!(compte.len(), 16);
        // Une paire côte à côte se verrait par transparence : le mélange l'évite.
        assert!(cartes.windows(2).filter(|w| w[0] == w[1]).count() <= 1);
    }

    #[test]
    fn le_memory_se_contente_de_ce_qu_il_a() {
        let mut o = options();
        (o.colonnes, o.lignes, o.planches) = (4, 4, 4);
        // Six images seulement : on en fait six paires, pas trente-deux cartes.
        let planches = Memory.planches(&vivier(6), &o);
        let cartes: Vec<i64> = planches.iter().flat_map(|p| p.cases.iter().map(|c| c.id)).collect();
        assert_eq!(cartes.len(), 12);
    }

    #[test]
    fn l_imagier_garde_l_ordre_choisi_et_n_oublie_personne() {
        let mut o = options();
        (o.colonnes, o.lignes) = (2, 2);
        let v = vivier(7);
        let planches = Imagier.planches(&v, &o);
        assert_eq!(planches.len(), 2);
        let ordre: Vec<i64> = planches.iter().flat_map(|p| p.cases.iter().map(|c| c.id)).collect();
        assert_eq!(ordre, v.iter().map(|p| p.id).collect::<Vec<_>>());
        // La dernière page n'est pas complétée artificiellement.
        assert_eq!(planches[1].cases.len(), 3);
    }

    #[test]
    fn refuse_un_vivier_trop_maigre() {
        let e = construire("loto", &vivier(4), &[], &options()).unwrap_err();
        assert!(e.contains("au moins 6"), "{e}");
        assert!(e.contains("Élargissez"), "le message doit dire quoi faire : {e}");
    }

    /// Rendu sur de vraies images, pour vérifier de l'œil ce qu'aucune
    /// assertion ne montre : cadrage, aplatissement du fond, lisibilité.
    /// Ignoré par défaut, il lui faut la banque :
    ///   MAITRIZE_BANQUE=/chemin/arasaac_fr cargo test rendu_reel -- --ignored --nocapture
    /// `MAITRIZE_IMAGES=/un/dossier` y mêle des images de l'enseignant (PNG, JPEG).
    #[test]
    #[ignore]
    fn rendu_reel() {
        let Ok(banque) = std::env::var("MAITRIZE_BANQUE") else { return };
        let images = std::path::Path::new(&banque).join("images");
        let mut vivier: Vec<PictoChoisi> = std::fs::read_dir(&images)
            .expect("dossier images")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|x| x == "png"))
            .take(18)
            .enumerate()
            .map(|(i, e)| PictoChoisi {
                id: i as i64,
                // Mots réels, accents et expressions longues compris : c'est là
                // que les capitales et leur ajustement se voient.
                mot: ["éléphant", "se brosser les dents", "cœur", "l'école", "mettre la table", "chat",
                      "anticonstitutionnellement", "pomme", "île", "se laver les mains avec du savon"][i % 10].to_string(),
                fichier: e.path().to_string_lossy().into_owned(),
                nature: String::new(),
            })
            .collect();
        vivier.truncate(18);
        assert!(vivier.len() >= 6, "banque vide");
        // Des images de l'enseignant en tête de la sélection, si on en donne.
        let mut images = Vec::new();
        if let Ok(dossier) = std::env::var("MAITRIZE_IMAGES") {
            use base64::Engine;
            let mut chemins: Vec<_> = std::fs::read_dir(&dossier).expect("dossier d'images").filter_map(|e| e.ok()).map(|e| e.path()).collect();
            chemins.sort();
            for (i, chemin) in chemins.iter().filter(|c| c.extension().is_some_and(|x| x == "png" || x == "jpg" || x == "jpeg")).enumerate() {
                let id = -(i as i64) - 1;
                images.push(ImageFournie { id, donnees: base64::engine::general_purpose::STANDARD.encode(std::fs::read(chemin).unwrap()) });
                vivier.insert(i, PictoChoisi { id, mot: format!("photo {}", i + 1), fichier: String::new(), nature: String::new() });
            }
            if std::env::var("MAITRIZE_SANS_BANQUE").is_ok() {
                vivier.truncate(images.len());
            }
        }
        let mut o = options();
        o.libelles = true;
        o.competences = vec![
            "Communiquer avec les adultes et avec les autres enfants par le langage, en se faisant comprendre — Mobiliser le langage dans toutes ses dimensions › L'oral".into(),
        ];
        if let Ok(g) = std::env::var("MAITRIZE_GRILLE") {
            let (c, l) = g.split_once('x').expect("grille CxL");
            (o.colonnes, o.lignes) = (c.parse().unwrap(), l.parse().unwrap());
        }
        let jeu = std::env::var("MAITRIZE_JEU").unwrap_or_else(|_| "loto".into());
        let pdf = construire(&jeu, &vivier, &images, &o).expect("génération");
        let sortie = std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/loto-test.pdf".into());
        std::fs::write(&sortie, &pdf).unwrap();
        println!("PDF écrit : {sortie} ({} octets)", pdf.len());
    }

    /// Un PNG de `cote` pixels de côté, à moitié transparent, en base64.
    fn png_en_base64(cote: u32) -> String {
        use base64::Engine;
        let image = ::image::RgbaImage::from_fn(cote, cote, |x, y| ::image::Rgba([200, (x * 9) as u8, (y * 9) as u8, if x < cote / 2 { 0 } else { 255 }]));
        let mut octets = std::io::Cursor::new(Vec::new());
        ::image::DynamicImage::ImageRgba8(image).write_to(&mut octets, ::image::ImageOutputFormat::Png).unwrap();
        base64::engine::general_purpose::STANDARD.encode(octets.into_inner())
    }

    /// L'en-tête d'un JPEG, sans ses données : de quoi lire ses dimensions.
    fn entete(sof: u8, largeur: u16, hauteur: u16, composantes: u8) -> Vec<u8> {
        let mut o = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        o.extend_from_slice(b"JFIF\0\x01\x01\0\0\x01\0\x01\0\0");
        // Une table de quantification avant le cadre, comme dans un vrai fichier.
        o.extend_from_slice(&[0xFF, 0xDB, 0x00, 0x43]);
        o.extend(std::iter::repeat_n(1u8, 65));
        o.extend_from_slice(&[0xFF, sof, 0x00, 0x11, 0x08]);
        o.extend_from_slice(&hauteur.to_be_bytes());
        o.extend_from_slice(&largeur.to_be_bytes());
        o.push(composantes);
        o.extend(std::iter::repeat_n(0u8, 9));
        o.extend_from_slice(&[0xFF, 0xD9]);
        o
    }

    #[test]
    fn un_jpeg_dit_ses_dimensions_dans_son_en_tete() {
        assert_eq!(entete_jpeg(&entete(0xC0, 700, 525, 3)), Some((700, 525, 3)));
        // Progressif, en gris : le PDF les lit aussi.
        assert_eq!(entete_jpeg(&entete(0xC2, 64, 48, 1)), Some((64, 48, 1)));
        // Sans perte ou en quatre couleurs : pas pour une case de loto.
        assert_eq!(entete_jpeg(&entete(0xC3, 64, 48, 3)), None);
        assert_eq!(entete_jpeg(&entete(0xC0, 64, 48, 4)), None);
        assert_eq!(entete_jpeg(&entete(0xC0, 0, 48, 3)), None);
        // Ce qui n'est pas un JPEG, ou un fichier tronqué.
        assert_eq!(entete_jpeg(b"\x89PNG\r\n\x1a\n"), None);
        assert_eq!(entete_jpeg(&entete(0xC0, 700, 525, 3)[..30]), None);
        assert_eq!(entete_jpeg(&[]), None);
    }

    #[test]
    fn les_images_de_l_enseignant_se_posent_sans_fichier() {
        use base64::Engine;
        // Six images qui ne sont pas dans la banque : trois PNG, trois photos.
        let perso: Vec<PictoChoisi> = (1..=6)
            .map(|i| PictoChoisi { id: -i, mot: format!("photo {i}"), fichier: String::new(), nature: String::new() })
            .collect();
        let images: Vec<ImageFournie> = (1..=6)
            .map(|i| ImageFournie {
                id: -i,
                donnees: if i <= 3 { png_en_base64(24) } else { base64::engine::general_purpose::STANDARD.encode(entete(0xC0, 40, 30, 3)) },
            })
            .collect();
        let mut o = options();
        (o.planches, o.cartes) = (1, false);
        let pdf = construire("loto", &perso, &images, &o).expect("le loto se fait sans la banque");
        let doc = lopdf::Document::load_mem(&pdf).expect("relisible");
        assert_eq!(doc.get_pages().len(), 1);
        let flux: Vec<&lopdf::Stream> = doc.objects.values()
            .filter_map(|x| x.as_stream().ok())
            .filter(|s| s.dict.get(b"Subtype").and_then(|x| x.as_name_str()).ok() == Some("Image"))
            .collect();
        assert_eq!(flux.len(), 6);
        // Les photos restent des JPEG, à leurs dimensions ; les PNG sont décodés.
        let jpeg: Vec<&&lopdf::Stream> = flux.iter().filter(|s| format!("{:?}", s.dict.get(b"Filter")).contains("DCTDecode")).collect();
        assert_eq!(jpeg.len(), 3);
        for s in jpeg {
            assert_eq!(s.dict.get(b"Width").and_then(|x| x.as_i64()).unwrap(), 40);
            assert_eq!(s.dict.get(b"Height").and_then(|x| x.as_i64()).unwrap(), 30);
            assert_eq!(s.content, entete(0xC0, 40, 30, 3));
        }
        // Une image annoncée mais illisible se dit, au lieu d'une case vide.
        let abimee = vec![ImageFournie { id: -1, donnees: base64::engine::general_purpose::STANDARD.encode(b"pas une image") }];
        let e = construire("loto", &perso, &abimee, &o).unwrap_err();
        assert!(e.contains("PNG ou un JPEG"), "{e}");
    }

    #[test]
    fn la_mention_de_la_banque_ne_va_qu_a_ses_pictogrammes() {
        let fournies = preparer(&[ImageFournie { id: -1, donnees: png_en_base64(8) }, ImageFournie { id: -2, donnees: png_en_base64(8) }]).unwrap();
        let planche = |ids: &[i64]| Planche {
            colonnes: 2, lignes: 1, paysage: true,
            cases: ids.iter().map(|&id| PictoChoisi { id, mot: String::new(), fichier: String::new(), nature: String::new() }).collect(),
        };
        // Rien que des images de l'enseignant : rien à attribuer.
        assert!(!doit_la_mention(&planche(&[-1, -2]), &fournies));
        // Un seul pictogramme de la banque suffit à la devoir.
        assert!(doit_la_mention(&planche(&[-1, 2349]), &fournies));
        assert!(doit_la_mention(&planche(&[2349, 2350]), &Fournies::new()));
        // Un picto dessiné par l'IA ne doit rien à la banque, mais la feuille dit d'où il vient.
        let ia = preparer(&[ImageFournie { id: -1_000_000_007, donnees: png_en_base64(8) }]).unwrap();
        assert_eq!(mentions(&planche(&[-1_000_000_007]), &ia), vec![MENTION_IA]);
        assert_eq!(mentions(&planche(&[-1_000_000_007, 2349]), &ia), vec![ATTRIBUTION, MENTION_IA]);
        assert_eq!(mentions(&planche(&[-1_400_000_001]), &Fournies::new())[1..], [MENTION_SCLERA]);
        assert!(mentions(&planche(&[-1, -2]), &fournies).is_empty());
        // Le fond transparent d'un PNG devient blanc, pas noir.
        let Some(Pixels::Bruts(image)) = fournies.get(&-1) else { panic!("un PNG se décode") };
        assert_eq!(image.get_pixel(0, 0).0, [255, 255, 255]);
        assert_eq!(image.get_pixel(7, 0).0, [200, 63, 0]);
    }

    #[test]
    fn les_competences_tiennent_dans_la_marge_haute() {
        // Trois lignes au plus dans la marge : au-delà, on coupe et on le dit.
        let longue = "Identifier des mots de manière de plus en plus aisée : ".repeat(4);
        let lignes = lignes_competences(&[longue.clone(), longue], 265.0, TAILLE_COMPETENCES, LIGNES_COMPETENCES);
        assert_eq!(lignes.len(), LIGNES_COMPETENCES);
        assert!(lignes.last().unwrap().ends_with('…'), "{lignes:?}");
        for l in &lignes {
            assert!(l.chars().count() <= 195, "{l}");
        }
        // Une ligne vide ne prend pas de place ; une courte reste entière.
        let courtes = lignes_competences(&["  ".into(), "[CP] Lire des syllabes".into()], 265.0, 7.0, 3);
        assert_eq!(courtes, vec!["[CP] Lire des syllabes"]);
    }

    #[test]
    fn le_mot_s_ecrit_en_capitales_accents_compris() {
        let (lignes, taille) = disposer_mot("éléphant", 80.0);
        assert_eq!(lignes, vec!["ÉLÉPHANT"]);
        assert_eq!(taille, TAILLE_MOT);
        assert_eq!(disposer_mot("  cœur ", 80.0).0, vec!["CŒUR"]);
        assert_eq!(disposer_mot("l'école", 80.0).0, vec!["L'ÉCOLE"]);
    }

    #[test]
    fn toutes_les_capitales_francaises_passent_dans_le_pdf() {
        // Les polices intégrées du PDF ne savent écrire que le jeu Windows-1252 :
        // un caractère hors jeu disparaîtrait sans bruit de la planche.
        let capitales = "ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŸŒÆ’'-";
        let octets = lopdf::Document::encode_text(Some("WinAnsiEncoding"), capitales);
        assert_eq!(octets.len(), capitales.chars().count());
        assert_eq!("àâäçèéêëîïôöùûüÿœæ".to_uppercase(), "ÀÂÄÇÈÉÊËÎÏÔÖÙÛÜŸŒÆ");
    }

    #[test]
    fn un_mot_long_tient_dans_la_case() {
        // Case d'une grille 4 × 3 en paysage, la plus étroite.
        let dispo = (297.0 - 2.0 * MARGE_PAGE - 3.0 * ECART) / 4.0 - 2.0 * MARGE_MOT;
        for mot in ["se brosser les dents", "anticonstitutionnellement", "mettre la table", "chat"] {
            let (lignes, taille) = disposer_mot(mot, dispo);
            assert!((TAILLE_MOT_MIN..=TAILLE_MOT).contains(&taille), "{mot} : {taille}");
            assert!(lignes.len() <= 2, "{mot}");
            for l in &lignes {
                assert!(largeur_capitales(l, taille) <= dispo + 0.01, "{mot} déborde : {l} à {taille} pt");
            }
        }
        // Sur une ligne tant que la taille reste lisible (≥ 10 pt), sinon deux lignes équilibrées.
        assert_eq!(disposer_mot("se brosser les dents", dispo).0, vec!["SE BROSSER LES DENTS"]);
        let (lignes, taille) = disposer_mot("se brosser les dents", 35.0);
        assert_eq!(lignes, vec!["SE BROSSER", "LES DENTS"], "coupure équilibrée");
        assert_eq!(taille, TAILLE_MOT_DEUX_LIGNES);
        assert_eq!(disposer_mot("chat", dispo), (vec!["CHAT".to_string()], TAILLE_MOT));
    }

    #[test]
    fn refuse_un_jeu_inconnu() {
        assert!(construire("echecs", &vivier(20), &[], &options()).is_err());
    }

    #[test]
    fn la_meme_graine_redonne_les_memes_planches() {
        let empreinte = |g: u64| {
            let mut o = options();
            o.graine = g;
            Loto.planches(&vivier(18), &o)
                .iter()
                .map(|p| p.cases.iter().map(|c| c.id.to_string()).collect::<Vec<_>>().join(","))
                .collect::<Vec<_>>()
        };
        assert_eq!(empreinte(42), empreinte(42));
        assert_ne!(empreinte(42), empreinte(43));
    }
}
