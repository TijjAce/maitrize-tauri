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
/// Rayon des angles de case, en millimètres.
const RAYON: f32 = 6.0;

/// Mention imposée par la licence CC BY-NC-SA des pictogrammes.
const ATTRIBUTION: &str = "Pictogrammes ARASAAC (Sergio Palao) - Gouvernement d'Aragon - CC BY-NC-SA";

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

pub fn jeu(nom: &str) -> Option<Box<dyn Jeu>> {
    match nom {
        "loto" => Some(Box::new(Loto)),
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
    let brut = ::image::open(chemin).map_err(|e| format!("{chemin} : {e}"))?;
    let rgba = brut.to_rgba8();
    let mut sortie = ::image::RgbImage::new(rgba.width(), rgba.height());
    for (x, y, p) in rgba.enumerate_pixels() {
        let a = p[3] as f32 / 255.0;
        let melange = |c: u8| (c as f32 * a + 255.0 * (1.0 - a)).round() as u8;
        sortie.put_pixel(x, y, ::image::Rgb([melange(p[0]), melange(p[1]), melange(p[2])]));
    }
    Ok(sortie)
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

fn rendre_planche(
    doc: &PdfDocumentReference,
    page: PdfPageIndex,
    couche: PdfLayerIndex,
    planche: &Planche,
    o: &Options,
    police: &IndirectFontRef,
    largeur: f32,
    hauteur: f32,
) -> Result<(), String> {
    let c = doc.get_page(page).get_layer(couche);
    let (cols, lignes) = (planche.colonnes as f32, planche.lignes as f32);
    let case_l = (largeur - 2.0 * MARGE_PAGE - (cols - 1.0) * ECART) / cols;
    let case_h = (hauteur - 2.0 * MARGE_PAGE - (lignes - 1.0) * ECART) / lignes;

    for (i, picto) in planche.cases.iter().enumerate() {
        let col = (i % planche.colonnes as usize) as f32;
        let rang = (i / planche.colonnes as usize) as f32;
        let x = MARGE_PAGE + col * (case_l + ECART);
        let y = hauteur - MARGE_PAGE - (rang + 1.0) * case_h - rang * ECART;

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

        let img = charger_sur_blanc(&picto.fichier)?;
        let (iw, ih) = (img.width() as f32, img.height() as f32);
        let echelle = (place_l / iw).min(place_h / ih);
        let (dl, dh) = (iw * echelle, ih * echelle);
        // printpdf place l'image en points par pouce : on convertit la taille
        // voulue en mm vers un facteur d'échelle appliqué aux pixels.
        let dpi = 300.0;
        Image::from(ImageXObject {
            width: Px(img.width() as usize),
            height: Px(img.height() as usize),
            color_space: ColorSpace::Rgb,
            bits_per_component: ColorBits::Bit8,
            interpolate: true,
            image_data: img.into_raw(),
            image_filter: None,
            clipping_bbox: None,
            smask: None,
        })
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
            // printpdf ne centre pas : même estimation de largeur que les
            // autres exports de l'application (demi-cadratin par caractère).
            let largeur_mot = picto.mot.chars().count() as f32 * 13.0 * 0.5 * 0.3528;
            c.use_text(&picto.mot, 13.0, Mm(x + (case_l - largeur_mot) / 2.0), Mm(y + marge_h), police);
        }
    }

    // Attribution obligatoire, hors zone de jeu, la plus discrète possible.
    c.set_fill_color(couleur((0.6, 0.6, 0.6)));
    let largeur_mention = ATTRIBUTION.chars().count() as f32 * 6.0 * 0.5 * 0.3528;
    c.use_text(ATTRIBUTION, 6.0, Mm((largeur - largeur_mention) / 2.0), Mm(7.0), police);
    Ok(())
}

/// Produit le PDF complet d'un jeu.
pub fn construire(
    nom_jeu: &str,
    vivier: &[PictoChoisi],
    o: &Options,
) -> Result<Vec<u8>, String> {
    let jeu = jeu(nom_jeu).ok_or_else(|| format!("Jeu inconnu : {nom_jeu}"))?;
    let minimum = jeu.minimum(o);
    if vivier.len() < minimum {
        return Err(format!(
            "Il faut au moins {minimum} pictogrammes pour une planche {}×{} ; la sélection n'en donne que {}. \
             Élargissez la catégorie ou augmentez le vivier.",
            o.colonnes, o.lignes, vivier.len()
        ));
    }
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

    rendre_planche(&doc, page, couche, &planches[0], o, &police, l0, h0)?;
    for planche in &planches[1..] {
        let (l, h) = dimensions(planche);
        let (p, c) = doc.add_page(Mm(l), Mm(h), "Planche");
        rendre_planche(&doc, p, c, planche, o, &police, l, h)?;
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
            .map(|i| PictoChoisi { id: i as i64, mot: format!("mot{i}"), fichier: String::new() })
            .collect()
    }

    fn options() -> Options {
        Options { libelles: false, cartes: true, colonnes: 3, lignes: 2, planches: 6, graine: 42 }
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
    fn refuse_un_vivier_trop_maigre() {
        let e = construire("loto", &vivier(4), &options()).unwrap_err();
        assert!(e.contains("au moins 6"), "{e}");
        assert!(e.contains("Élargissez"), "le message doit dire quoi faire : {e}");
    }

    /// Rendu sur de vraies images, pour vérifier de l'œil ce qu'aucune
    /// assertion ne montre : cadrage, aplatissement du fond, lisibilité.
    /// Ignoré par défaut, il lui faut la banque :
    ///   MAITRIZE_BANQUE=/chemin/arasaac_fr cargo test rendu_reel -- --ignored --nocapture
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
                mot: format!("picto{i}"),
                fichier: e.path().to_string_lossy().into_owned(),
            })
            .collect();
        vivier.truncate(18);
        assert!(vivier.len() >= 6, "banque vide");
        let mut o = options();
        o.libelles = true;
        let pdf = construire("loto", &vivier, &o).expect("génération");
        let sortie = std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/loto-test.pdf".into());
        std::fs::write(&sortie, &pdf).unwrap();
        println!("PDF écrit : {sortie} ({} octets)", pdf.len());
    }

    #[test]
    fn refuse_un_jeu_inconnu() {
        assert!(construire("echecs", &vivier(20), &options()).is_err());
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
