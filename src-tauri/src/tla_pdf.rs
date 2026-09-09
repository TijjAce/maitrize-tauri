//! Impression d'un tableau de langage assisté (TLA).
//!
//! Un TLA est l'exact contraire d'une planche de loto, et la mise en page le
//! reflète.
//!
//! Le loto est **aéré** : un picto par case, beaucoup de vide autour, parce
//! qu'un enfant avec autisme doit pouvoir isoler une image à la fois. Le TLA
//! est **dense** : les cases se touchent, les marges sont minces, parce que
//! chaque case perdue est un mot que l'enfant ne pourra pas dire.
//!
//! Le loto **rebat les cartes** à chaque tirage. Le TLA ne le fait jamais :
//! une case garde sa place pour que le geste s'automatise, et c'est ce qui
//! rend la communication fluide. Le gabarit vient donc de la fenêtre tel
//! quel — ce module ne réordonne rien, ne complète rien, ne devine rien.
//!
//! Les couleurs suivent l'usage (clé de Fitzgerald) : la nature du mot se lit
//! au fond de la case. Elles sont pâles, pour ne pas gêner la lecture du
//! pictogramme qu'elles portent.

use printpdf::*;
use serde::Deserialize;

/// Mention imposée par la licence CC BY-NC-SA des pictogrammes.
const ATTRIBUTION: &str =
    "Pictogrammes ARASAAC (Sergio Palao) - Gouvernement d'Aragon - CC BY-NC-SA";

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaseTla {
    /// Vide = case laissée libre. Une case libre se garde : elle réserve la
    /// place d'un mot à venir sans déplacer les autres.
    #[serde(default)]
    pub picto_id: Option<i64>,
    #[serde(default)]
    pub fichier: String,
    #[serde(default)]
    pub mot: String,
    /// Nature grammaticale, qui donne la couleur.
    #[serde(default)]
    pub nature: String,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Gabarit {
    pub nom: String,
    #[serde(default)]
    pub eleve: String,
    pub colonnes: u8,
    pub lignes: u8,
    /// Les cases dans l'ordre de lecture, gauche à droite puis ligne à ligne.
    pub cases: Vec<CaseTla>,
    #[serde(default)]
    pub paysage: bool,
}

/// Fond de case par nature grammaticale.
///
/// Teintes pâles : la couleur doit se voir d'un coup d'œil sans concurrencer
/// le pictogramme, qui reste l'information principale.
fn fond(nature: &str) -> (f32, f32, f32) {
    match nature {
        "personne" => (1.00, 0.95, 0.72),  // jaune
        "verbe" => (0.85, 0.94, 0.83),     // vert
        "adjectif" => (0.84, 0.90, 0.97),  // bleu
        "social" => (0.98, 0.87, 0.92),    // rose
        "petit mot" => (0.94, 0.94, 0.94), // gris
        _ => (0.99, 0.90, 0.79),           // orange : les noms
    }
}

fn couleur(c: (f32, f32, f32)) -> Color {
    Color::Rgb(Rgb::new(c.0, c.1, c.2, None))
}

/// Largeur approchée d'un texte, pour le centrer. Même estimation que les
/// autres exports de l'application.
fn largeur_texte(s: &str, corps: f32) -> f32 {
    s.chars().count() as f32 * corps * 0.5 * 0.3528
}

/// Charge un PNG et l'aplatit sur la couleur de fond de sa case.
///
/// Les pictogrammes ARASAAC sont transparents et printpdf gère mal le canal
/// alpha. Composer sur le fond réel de la case — et non sur du blanc — évite
/// le halo blanc qui cernerait chaque image sur les cases colorées.
fn charger_sur(chemin: &str, fond: (f32, f32, f32)) -> Result<::image::RgbImage, String> {
    let brut = ::image::open(chemin).map_err(|e| format!("{chemin} : {e}"))?;
    let rgba = brut.to_rgba8();
    let (fr, fg, fb) = (fond.0 * 255.0, fond.1 * 255.0, fond.2 * 255.0);
    let mut sortie = ::image::RgbImage::new(rgba.width(), rgba.height());
    for (x, y, p) in rgba.enumerate_pixels() {
        let a = p[3] as f32 / 255.0;
        let melange = |c: u8, f: f32| (c as f32 * a + f * (1.0 - a)).round() as u8;
        sortie.put_pixel(
            x,
            y,
            ::image::Rgb([melange(p[0], fr), melange(p[1], fg), melange(p[2], fb)]),
        );
    }
    Ok(sortie)
}

pub fn construire(g: &Gabarit) -> Result<Vec<u8>, String> {
    if g.colonnes == 0 || g.lignes == 0 {
        return Err("Le gabarit n'a pas de grille.".into());
    }
    let attendues = g.colonnes as usize * g.lignes as usize;
    if g.cases.len() != attendues {
        return Err(format!(
            "Le gabarit annonce {} × {} cases mais en fournit {}.",
            g.colonnes,
            g.lignes,
            g.cases.len()
        ));
    }

    let (largeur, hauteur) = if g.paysage { (297.0, 210.0) } else { (210.0, 297.0) };
    let (doc, page, couche) = PdfDocument::new(
        format!("Tableau de langage — {}", g.nom),
        Mm(largeur),
        Mm(hauteur),
        "Tableau",
    );
    let police = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| format!("Police : {e}"))?;
    let gras = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| format!("Police : {e}"))?;
    let c = doc.get_page(page).get_layer(couche);

    // Marges minces : chaque millimètre rendu est de la place pour un mot.
    const MARGE: f32 = 8.0;
    const HAUT: f32 = 9.0; // bandeau du titre
    const BAS: f32 = 6.0; // mention de licence
    let grille_h = hauteur - MARGE - HAUT - MARGE - BAS;
    let case_l = (largeur - 2.0 * MARGE) / g.colonnes as f32;
    let case_h = grille_h / g.lignes as f32;

    // Bandeau : à qui est ce tableau, et lequel c'est.
    c.set_fill_color(couleur((0.2, 0.2, 0.25)));
    let titre = if g.eleve.is_empty() { g.nom.clone() } else { format!("{} — {}", g.eleve, g.nom) };
    c.use_text(&titre, 10.0, Mm(MARGE), Mm(hauteur - MARGE - 3.0), &gras);

    let haut_grille = hauteur - MARGE - HAUT;
    for (i, case) in g.cases.iter().enumerate() {
        let col = (i % g.colonnes as usize) as f32;
        let rang = (i / g.colonnes as usize) as f32;
        let x = MARGE + col * case_l;
        let y = haut_grille - (rang + 1.0) * case_h;
        let teinte = fond(&case.nature);

        // Fond coloré, puis contour fin. Une case vide garde son cadre : elle
        // marque une place réservée, pas une absence.
        if case.picto_id.is_some() {
            c.set_fill_color(couleur(teinte));
            c.add_rect(
                Rect::new(Mm(x), Mm(y), Mm(x + case_l), Mm(y + case_h))
                    .with_mode(printpdf::path::PaintMode::Fill),
            );
        }
        c.set_outline_color(couleur((0.55, 0.55, 0.6)));
        c.set_outline_thickness(0.7);
        c.add_rect(
            Rect::new(Mm(x), Mm(y), Mm(x + case_l), Mm(y + case_h))
                .with_mode(printpdf::path::PaintMode::Stroke),
        );

        let Some(_) = case.picto_id else { continue };
        if case.fichier.is_empty() {
            continue;
        }

        // Le mot est écrit systématiquement : c'est l'adulte partenaire qui le
        // lit à voix haute, l'enfant n'a pas à savoir lire pour que ça serve.
        let corps = 7.0_f32.min(case_l * 0.9);
        let place_l = case_l - 3.0;
        let place_h = case_h - 3.0 - corps * 0.3528 * 1.6;

        let img = charger_sur(&case.fichier, teinte)?;
        let (iw, ih) = (img.width() as f32, img.height() as f32);
        let echelle = (place_l / iw).min(place_h / ih);
        let (dl, dh) = (iw * echelle, ih * echelle);
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
                translate_y: Some(Mm(y + case_h - 1.5 - dh)),
                scale_x: Some(dl / (iw / dpi * 25.4)),
                scale_y: Some(dh / (ih / dpi * 25.4)),
                dpi: Some(dpi),
                ..Default::default()
            },
        );

        c.set_fill_color(couleur((0.1, 0.1, 0.1)));
        let mot = &case.mot;
        c.use_text(
            mot,
            corps,
            Mm(x + (case_l - largeur_texte(mot, corps)) / 2.0),
            Mm(y + 1.6),
            &police,
        );
    }

    c.set_fill_color(couleur((0.6, 0.6, 0.6)));
    c.use_text(
        ATTRIBUTION,
        5.5,
        Mm((largeur - largeur_texte(ATTRIBUTION, 5.5)) / 2.0),
        Mm(4.0),
        &police,
    );

    doc.save_to_bytes().map_err(|e| format!("Écriture du PDF : {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gabarit(colonnes: u8, lignes: u8, n: usize) -> Gabarit {
        Gabarit {
            nom: "Cuisine".into(),
            eleve: "Quang".into(),
            colonnes,
            lignes,
            paysage: true,
            cases: (0..n)
                .map(|i| CaseTla {
                    picto_id: None,
                    fichier: String::new(),
                    mot: format!("mot{i}"),
                    nature: "nom".into(),
                })
                .collect(),
        }
    }

    #[test]
    fn refuse_un_gabarit_dont_la_grille_ne_colle_pas() {
        // Une case en trop ou en moins décalerait tout le tableau, et un
        // tableau décalé casse justement ce qu'il sert à construire.
        let e = construire(&gabarit(6, 5, 29)).unwrap_err();
        assert!(e.contains("6 × 5"), "{e}");
        assert!(e.contains("29"), "{e}");
    }

    #[test]
    fn refuse_une_grille_vide() {
        assert!(construire(&gabarit(0, 5, 0)).is_err());
    }

    #[test]
    fn produit_un_pdf_meme_sans_aucun_picto() {
        // Un gabarit se met en place avant d'être rempli : il doit s'imprimer
        // vide, cases dessinées, pour se travailler sur papier.
        let pdf = construire(&gabarit(6, 5, 30)).expect("gabarit vide");
        assert!(pdf.starts_with(b"%PDF"), "en-tête PDF absent");
        assert!(pdf.len() > 500);
    }

    /// Rendu sur de vraies images, pour juger de l'œil ce qu'aucune assertion
    /// ne montre : densité, lisibilité du mot, couleurs sous le pictogramme.
    ///   MAITRIZE_BANQUE=/chemin/arasaac_fr cargo test rendu_tla -- --ignored --nocapture
    #[test]
    #[ignore]
    fn rendu_tla() {
        let Ok(banque) = std::env::var("MAITRIZE_BANQUE") else { return };
        let images = std::path::Path::new(&banque).join("images");
        // Un tableau plausible : noyau à gauche, activité à droite.
        let mots: Vec<(&str, &str)> = vec![
            ("je", "personne"), ("tu", "personne"), ("veux", "verbe"), ("encore", "petit mot"),
            ("fini", "adjectif"), ("aide", "verbe"), ("regarde", "verbe"), ("non", "petit mot"),
            ("oui", "petit mot"), ("bonjour", "social"), ("merci", "social"), ("s'il te plaît", "social"),
            ("manger", "verbe"), ("boire", "verbe"), ("aller", "verbe"), ("arrêter", "verbe"),
            ("grand", "adjectif"), ("petit", "adjectif"), ("chaud", "adjectif"), ("froid", "adjectif"),
            ("farine", "nom"), ("sucre", "nom"), ("oeuf", "nom"), ("lait", "nom"),
            ("saladier", "nom"), ("cuillère", "nom"), ("four", "nom"), ("gâteau", "nom"),
            ("mélanger", "verbe"), ("verser", "verbe"),
        ];
        let mut fichiers: Vec<std::path::PathBuf> = std::fs::read_dir(&images)
            .expect("images")
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|x| x == "png"))
            .collect();
        fichiers.sort();
        let g = Gabarit {
            nom: "Cuisine".into(),
            eleve: "Quang".into(),
            colonnes: 6,
            lignes: 5,
            paysage: true,
            cases: mots
                .iter()
                .enumerate()
                .map(|(i, (mot, nat))| CaseTla {
                    picto_id: Some(i as i64),
                    fichier: fichiers[i * 7 % fichiers.len()].to_string_lossy().into_owned(),
                    mot: (*mot).into(),
                    nature: (*nat).into(),
                })
                .collect(),
        };
        let pdf = construire(&g).expect("génération");
        let sortie = std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/tla.pdf".into());
        std::fs::write(&sortie, &pdf).unwrap();
        println!("PDF écrit : {sortie} ({} octets)", pdf.len());
    }

    #[test]
    fn chaque_nature_a_sa_couleur() {
        let naturels = ["personne", "verbe", "adjectif", "social", "petit mot", "nom"];
        let mut vues = std::collections::HashSet::new();
        for n in naturels {
            let c = fond(n);
            assert!(vues.insert(format!("{c:?}")), "deux natures partagent la couleur de « {n} »");
        }
    }

    #[test]
    fn les_fonds_restent_pales() {
        // Une case trop saturée mange le pictogramme qu'elle porte.
        for n in ["personne", "verbe", "adjectif", "social", "petit mot", "nom"] {
            let (r, v, b) = fond(n);
            assert!(r.min(v).min(b) > 0.7, "« {n} » est trop sombre : {r},{v},{b}");
        }
    }
}
