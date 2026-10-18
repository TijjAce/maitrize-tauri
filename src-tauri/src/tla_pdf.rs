//! Impression d'un tableau de langage assisté (TLA).
//!
//! Un TLA est l'exact contraire d'une planche de loto sur un point, et son
//! semblable sur un autre.
//!
//! Il est plus **dense** : les marges sont minces et les cases nombreuses,
//! parce que chaque case perdue est un mot que l'enfant ne pourra pas dire.
//!
//! Mais les cases restent **espacées**, comme sur une planche de loto : qui
//! ne pointe pas de l'index désigne du poing ou de plusieurs doigts, et il
//! lui faut de la marge pour viser. Le fond gris entre les cases fait par
//! ailleurs ressortir les pictogrammes, ce dont certains ont besoin. L'écart
//! se règle, jusqu'à zéro pour qui pointe finement et veut le maximum de mots.
//!
//! Le loto **rebat les cartes** à chaque tirage. Le TLA ne le fait jamais :
//! une case garde sa place pour que le geste s'automatise, et c'est ce qui
//! rend la communication fluide. Le gabarit vient donc de la fenêtre tel
//! quel — ce module ne réordonne rien, ne complète rien, ne devine rien.
//!
//! Les couleurs suivent l'usage (clé de Fitzgerald) : la nature du mot se lit
//! au fond de la case. Elles sont pâles, pour ne pas gêner la lecture du
//! pictogramme qu'elles portent. La fenêtre peut aussi les poser sur le cadre
//! de la case, ou n'en mettre aucune : chaque case arrive alors avec son fond
//! et son cadre déjà décidés, et ce module les dessine tels quels.

use printpdf::*;
use serde::Deserialize;

/// Mention imposée par la licence CC BY-NC-SA des pictogrammes.
const ATTRIBUTION: &str =
    "Pictogrammes ARASAAC (Sergio Palao, arasaac.org) - Gouvernement d'Aragon - CC BY-NC-SA 4.0 - Usage non commercial";

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
    /// Nature grammaticale, qui donne la couleur quand la fenêtre n'en donne pas.
    #[serde(default)]
    pub nature: String,
    /// Le fond de la case (« #rrggbb »), décidé par la fenêtre ; vide : celui de sa nature.
    #[serde(default)]
    pub fond: String,
    /// Le cadre de couleur (« #rrggbb ») ; vide : un filet gris.
    #[serde(default)]
    pub bord: String,
    /// Masquée : la case garde sa place, mais s'imprime blanche et vide.
    #[serde(default)]
    pub masquee: bool,
    /// Dans un classeur : le numéro de la page que la case ouvre ; la case le porte, dans un onglet.
    #[serde(default)]
    pub page_liee: Option<u32>,
    /// La licence de son image, pour l'export au format ouvert.
    #[serde(default)]
    pub licence: Option<LicenceImage>,
}

/// La licence d'une image, telle que la fenêtre la décrit : ARASAAC, une banque d'appoint, une photo…
#[derive(Deserialize, Clone, Default)]
pub struct LicenceImage {
    #[serde(rename = "type", default)]
    pub sorte: String,
    #[serde(default)]
    pub auteur: String,
    #[serde(default)]
    pub url: String,
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
    /// Écart entre les cases, en millimètres. Une case bien détachée se vise
    /// du poing ; un écart nul rend la place à des cases plus grandes.
    #[serde(default = "ecart_defaut")]
    pub ecart: f32,
    /// Ce que l'atelier travaille, une compétence par ligne : écrit sous le
    /// titre, dans le bandeau, qui s'agrandit d'autant.
    #[serde(default)]
    pub competences: Vec<String>,
    /// Où s'écrit le mot : « dessous » (par défaut), « dessus », ou « aucune ».
    #[serde(default)]
    pub place_mot: String,
    /// Le corps du mot, en points ; 7 par défaut.
    #[serde(default)]
    pub corps_mot: Option<f32>,
    /// La mention des images qui ne viennent pas d'ARASAAC : Sclera, l'IA…
    #[serde(default)]
    pub mentions: String,
    /// Dans un classeur : le numéro de cette page, et le nombre de pages ; écrits devant le titre.
    #[serde(default)]
    pub numero: Option<u32>,
    #[serde(default)]
    pub total: Option<u32>,
}

fn ecart_defaut() -> f32 {
    3.0
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
        "question" => (0.91, 0.87, 0.96),  // violet
        _ => (0.99, 0.90, 0.79),           // orange : les noms
    }
}

/// « #rrggbb » en trois teintes de 0 à 1 ; rien si la couleur est mal écrite.
fn depuis_hex(s: &str) -> Option<(f32, f32, f32)> {
    let h = s.trim().strip_prefix('#')?;
    if h.len() != 6 || !h.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let teinte = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok().map(|v| v as f32 / 255.0);
    Some((teinte(0)?, teinte(2)?, teinte(4)?))
}

const BLANC: (f32, f32, f32) = (1.0, 1.0, 1.0);
/// L'épaisseur d'un cadre de couleur, en points : il se voit d'un coup d'œil sans manger la case.
const CADRE: f32 = 4.0;

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

/// Une grille qui se tient : autant de cases que la grille en annonce.
fn verifier(g: &Gabarit) -> Result<(), String> {
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
    Ok(())
}

const fn format_de(g: &Gabarit) -> (f32, f32) {
    if g.paysage {
        (297.0, 210.0)
    } else {
        (210.0, 297.0)
    }
}

pub fn construire(g: &Gabarit) -> Result<Vec<u8>, String> {
    construire_classeur(std::slice::from_ref(g))
}

/// Un classeur de communication : une page par tableau, chacune à son orientation, dans l'ordre reçu — l'accueil d'abord.
pub fn construire_classeur(pages: &[Gabarit]) -> Result<Vec<u8>, String> {
    let premiere = pages.first().ok_or_else(|| "Le classeur n'a pas de page.".to_string())?;
    for g in pages {
        verifier(g)?;
    }
    let (largeur, hauteur) = format_de(premiere);
    let titre = if pages.len() > 1 {
        format!("Classeur de communication — {}", premiere.nom)
    } else {
        format!("Tableau de langage — {}", premiere.nom)
    };
    let (doc, page, couche) = PdfDocument::new(titre, Mm(largeur), Mm(hauteur), "Tableau");
    let police = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| format!("Police : {e}"))?;
    let gras = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| format!("Police : {e}"))?;
    dessiner(&doc.get_page(page).get_layer(couche), premiere, &police, &gras)?;
    for g in &pages[1..] {
        let (l, h) = format_de(g);
        let (page, couche) = doc.add_page(Mm(l), Mm(h), "Tableau");
        dessiner(&doc.get_page(page).get_layer(couche), g, &police, &gras)?;
    }
    doc.save_to_bytes().map_err(|e| format!("Écriture du PDF : {e}"))
}

/// Une page : le bandeau, la grille, les cases, les mentions au pied.
fn dessiner(c: &PdfLayerReference, g: &Gabarit, police: &IndirectFontRef, gras: &IndirectFontRef) -> Result<(), String> {
    let (largeur, hauteur) = format_de(g);

    // Marges minces : chaque millimètre rendu est de la place pour un mot.
    const MARGE: f32 = 8.0;
    const HAUT: f32 = 9.0; // bandeau du titre
    const CORPS_MENTION: f32 = 5.5;
    // Les compétences travaillées s'écrivent sous le titre : le bandeau
    // grandit d'une ligne par ligne, et la grille cède ces millimètres.
    const CORPS_COMPETENCES: f32 = 6.5;
    const INTERLIGNE_COMPETENCES: f32 = 3.0;
    let competences =
        crate::jeux_pdf::lignes_competences(&g.competences, largeur - 2.0 * MARGE, CORPS_COMPETENCES, 3);
    // Au pied, la licence d'ARASAAC ; au-dessus, celle des autres images s'il y en a.
    let mentions = crate::jeux_pdf::lignes_competences(
        std::slice::from_ref(&g.mentions),
        largeur - 2.0 * MARGE,
        CORPS_MENTION,
        2,
    );
    let bas = 6.0 + mentions.len() as f32 * 2.6;
    let haut = HAUT + competences.len() as f32 * INTERLIGNE_COMPETENCES;
    let ecart = g.ecart.clamp(0.0, 12.0);
    let grille_h = hauteur - MARGE - haut - MARGE - bas;
    let case_l = (largeur - 2.0 * MARGE - (g.colonnes as f32 - 1.0) * ecart) / g.colonnes as f32;
    let case_h = (grille_h - (g.lignes as f32 - 1.0) * ecart) / g.lignes as f32;

    // Fond gris derrière la grille : il détache les cases et fait ressortir
    // les pictogrammes pour qui en a besoin visuellement.
    if ecart > 0.0 {
        c.set_fill_color(couleur((0.80, 0.81, 0.84)));
        c.add_rect(
            Rect::new(
                Mm(MARGE - ecart / 2.0),
                Mm(MARGE + bas - ecart / 2.0),
                Mm(largeur - MARGE + ecart / 2.0),
                Mm(hauteur - MARGE - haut + ecart / 2.0),
            )
            .with_mode(printpdf::path::PaintMode::Fill),
        );
    }

    // Bandeau : à qui est ce tableau, et lequel c'est ; dans un classeur, son numéro de page d'abord.
    c.set_fill_color(couleur((0.2, 0.2, 0.25)));
    let nom = if g.eleve.is_empty() { g.nom.clone() } else { format!("{} — {}", g.eleve, g.nom) };
    let titre = match (g.numero, g.total) {
        (Some(n), Some(t)) if t > 1 => format!("Page {n} sur {t} — {nom}"),
        _ => nom,
    };
    c.use_text(&titre, 10.0, Mm(MARGE), Mm(hauteur - MARGE - 3.0), gras);
    c.set_fill_color(couleur((0.42, 0.42, 0.47)));
    for (k, ligne) in competences.iter().enumerate() {
        let y = hauteur - MARGE - 6.4 - k as f32 * INTERLIGNE_COMPETENCES;
        c.use_text(ligne, CORPS_COMPETENCES, Mm(MARGE), Mm(y), police);
    }

    let place_mot = g.place_mot.as_str();
    let corps_voulu = g.corps_mot.unwrap_or(7.0).clamp(5.0, 16.0);
    let haut_grille = hauteur - MARGE - haut;
    for (i, case) in g.cases.iter().enumerate() {
        let col = (i % g.colonnes as usize) as f32;
        let rang = (i / g.colonnes as usize) as f32;
        let x = MARGE + col * (case_l + ecart);
        let y = haut_grille - (rang + 1.0) * case_h - rang * ecart;
        // Une case vide garde son cadre : elle marque une place réservée, pas une absence. Une case masquée
        // aussi : son mot viendra plus tard, à la même place.
        let posee = case.picto_id.is_some() && !case.masquee;
        let teinte = if posee { depuis_hex(&case.fond).unwrap_or_else(|| fond(&case.nature)) } else { BLANC };
        let cadre = if posee { depuis_hex(&case.bord) } else { None };

        c.set_fill_color(couleur(teinte));
        c.add_rect(
            Rect::new(Mm(x), Mm(y), Mm(x + case_l), Mm(y + case_h))
                .with_mode(printpdf::path::PaintMode::Fill),
        );
        match cadre {
            // Le cadre de couleur reste dans la case : on le trace à une demi-épaisseur du bord.
            Some(bord) => {
                let d = CADRE * 0.3528 / 2.0;
                c.set_outline_color(couleur(bord));
                c.set_outline_thickness(CADRE);
                c.add_rect(
                    Rect::new(Mm(x + d), Mm(y + d), Mm(x + case_l - d), Mm(y + case_h - d))
                        .with_mode(printpdf::path::PaintMode::Stroke),
                );
            }
            None => {
                c.set_outline_color(couleur((0.55, 0.55, 0.6)));
                c.set_outline_thickness(0.7);
                c.add_rect(
                    Rect::new(Mm(x), Mm(y), Mm(x + case_l), Mm(y + case_h))
                        .with_mode(printpdf::path::PaintMode::Stroke),
                );
            }
        }
        if !posee {
            continue;
        }

        // Le mot est écrit, sauf si l'on n'en veut pas : c'est l'adulte partenaire qui le lit à voix haute,
        // l'enfant n'a pas à savoir lire pour que ça serve. Trop long pour la case, il rapetisse plutôt que
        // de déborder.
        let marge = if cadre.is_some() { 1.5 + CADRE * 0.3528 } else { 1.5 };
        let mot = case.mot.trim();
        let avec_mot = place_mot != "aucune" && !mot.is_empty();
        let corps = if avec_mot {
            corps_voulu.min((case_l - 2.0 * marge) / (mot.chars().count().max(1) as f32 * 0.5 * 0.3528))
        } else {
            0.0
        };
        let haut_mot = if avec_mot { corps * 0.3528 * 1.6 } else { 0.0 };
        let dessus = place_mot == "dessus";

        // Une image de Mes pictos qui n'existe plus laisse le mot seul dans sa case.
        if !case.fichier.is_empty() {
            let place_l = case_l - 2.0 * marge;
            let place_h = case_h - 2.0 * marge - haut_mot;
            let img = charger_sur(&case.fichier, teinte)?;
            let (iw, ih) = (img.width() as f32, img.height() as f32);
            let echelle = (place_l / iw).min(place_h / ih);
            let (dl, dh) = (iw * echelle, ih * echelle);
            let bas_image = if !avec_mot {
                y + (case_h - dh) / 2.0
            } else if dessus {
                y + case_h - marge - haut_mot - dh
            } else {
                y + case_h - marge - dh
            };
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
                    translate_y: Some(Mm(bas_image)),
                    scale_x: Some(dl / (iw / dpi * 25.4)),
                    scale_y: Some(dh / (ih / dpi * 25.4)),
                    dpi: Some(dpi),
                    ..Default::default()
                },
            );
        }

        if avec_mot {
            c.set_fill_color(couleur((0.1, 0.1, 0.1)));
            let ligne = if dessus { y + case_h - marge - corps * 0.3528 } else { y + marge + 0.1 };
            c.use_text(mot, corps, Mm(x + (case_l - largeur_texte(mot, corps)) / 2.0), Mm(ligne), police);
        }

        // Une case qui ouvre une autre page du classeur porte son numéro dans un onglet sombre, en haut à droite :
        // l'adulte partenaire tourne les pages sans chercher.
        if let Some(n) = case.page_liee {
            let texte = format!("p. {n}");
            let corps_onglet = 8.0;
            let l = largeur_texte(&texte, corps_onglet) + 2.6;
            let h = 5.0;
            let (ox, oy) = (x + case_l - l - 0.8, y + case_h - h - 0.8);
            c.set_fill_color(couleur((0.2, 0.2, 0.25)));
            c.add_rect(Rect::new(Mm(ox), Mm(oy), Mm(ox + l), Mm(oy + h)).with_mode(printpdf::path::PaintMode::Fill));
            c.set_fill_color(couleur(BLANC));
            c.use_text(&texte, corps_onglet, Mm(ox + 1.3), Mm(oy + 1.5), gras);
        }
    }

    c.set_fill_color(couleur((0.6, 0.6, 0.6)));
    for (k, ligne) in mentions.iter().enumerate() {
        let y = 4.0 + (mentions.len() - k) as f32 * 2.6;
        c.use_text(ligne, CORPS_MENTION, Mm((largeur - largeur_texte(ligne, CORPS_MENTION)) / 2.0), Mm(y), police);
    }
    c.use_text(
        ATTRIBUTION,
        CORPS_MENTION,
        Mm((largeur - largeur_texte(ATTRIBUTION, CORPS_MENTION)) / 2.0),
        Mm(4.0),
        police,
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gabarit(colonnes: u8, lignes: u8, n: usize) -> Gabarit {
        Gabarit {
            nom: "Cuisine".into(),
            eleve: "Quentin".into(),
            colonnes,
            lignes,
            paysage: true,
            ecart: 3.0,
            competences: vec![],
            place_mot: String::new(),
            corps_mot: None,
            mentions: String::new(),
            numero: None,
            total: None,
            cases: (0..n)
                .map(|i| CaseTla {
                    picto_id: None,
                    fichier: String::new(),
                    mot: format!("mot{i}"),
                    nature: "nom".into(),
                    fond: String::new(),
                    bord: String::new(),
                    masquee: false,
                    page_liee: None,
                    licence: None,
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

    #[test]
    fn les_competences_s_ecrivent_sous_le_titre_sans_casser_la_grille() {
        let mut g = gabarit(6, 5, 30);
        g.competences = vec![
            "Oser entrer en communication".into(),
            "Échanger et réfléchir avec les autres".into(),
        ];
        let pdf = construire(&g).expect("gabarit avec compétences");
        assert!(pdf.starts_with(b"%PDF"));
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
            eleve: "Quentin".into(),
            colonnes: 6,
            lignes: 5,
            paysage: true,
            ecart: std::env::var("MAITRIZE_ECART").ok().and_then(|v| v.parse().ok()).unwrap_or(3.0),
            competences: vec!["Communiquer avec les adultes et avec les autres enfants — Mobiliser le langage dans toutes ses dimensions".into()],
            place_mot: std::env::var("MAITRIZE_MOT").unwrap_or_default(),
            corps_mot: None,
            mentions: String::new(),
            numero: None,
            total: None,
            cases: mots
                .iter()
                .enumerate()
                .map(|(i, (mot, nat))| CaseTla {
                    picto_id: Some(i as i64),
                    fichier: fichiers[i * 7 % fichiers.len()].to_string_lossy().into_owned(),
                    mot: (*mot).into(),
                    nature: (*nat).into(),
                    fond: String::new(),
                    bord: std::env::var("MAITRIZE_CADRE").unwrap_or_default(),
                    masquee: i % 9 == 8,
                    page_liee: None,
                    licence: None,
                })
                .collect(),
        };
        let pdf = construire(&g).expect("génération");
        let sortie = std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/tla.pdf".into());
        std::fs::write(&sortie, &pdf).unwrap();
        println!("PDF écrit : {sortie} ({} octets)", pdf.len());
    }

    #[test]
    fn un_classeur_a_une_page_par_tableau() {
        let mut accueil = gabarit(5, 4, 20);
        accueil.numero = Some(1);
        accueil.total = Some(3);
        accueil.cases[3].page_liee = Some(2);
        accueil.cases[4].page_liee = Some(3);
        let mut manger = gabarit(4, 3, 12);
        manger.paysage = false;
        manger.numero = Some(2);
        manger.total = Some(3);
        manger.cases[0].page_liee = Some(1);
        let mut jouer = gabarit(4, 3, 12);
        jouer.numero = Some(3);
        jouer.total = Some(3);
        let pdf = construire_classeur(&[accueil, manger, jouer]).expect("classeur");
        assert_eq!(nombre_de_pages(&pdf), 3, "trois pages");
        assert_eq!(nombre_de_pages(&construire(&gabarit(5, 4, 20)).unwrap()), 1);
        assert!(construire_classeur(&[]).is_err(), "un classeur sans page");
    }

    /// Les pages d'un PDF : les objets « /Type /Page », pas « /Pages ».
    fn nombre_de_pages(pdf: &[u8]) -> usize {
        let t = String::from_utf8_lossy(pdf);
        t.match_indices("/Page")
            .filter(|(i, _)| !t[i + 5..].starts_with('s') && t[..*i].trim_end().ends_with("/Type"))
            .count()
    }

    /// Un classeur de deux pages sur de vraies images, pour juger de l'œil l'onglet des cases liées :
    ///   MAITRIZE_BANQUE=/chemin/ARASAAC/images MAITRIZE_SORTIE=/tmp/classeur.pdf cargo test rendu_classeur -- --ignored
    #[test]
    #[ignore]
    fn rendu_classeur() {
        let banque = std::path::PathBuf::from(std::env::var("MAITRIZE_BANQUE").expect("MAITRIZE_BANQUE"));
        let image = |id: u32| banque.join(format!("{id}.png")).to_string_lossy().into_owned();
        let case = |id: u32, mot: &str, page: Option<u32>| CaseTla { picto_id: Some(id as i64), fichier: image(id), mot: mot.into(), page_liee: page, ..case_posee("") };
        let mut accueil = gabarit(5, 2, 10);
        accueil.nom = "Accueil".into();
        accueil.eleve = String::new();
        accueil.cases = vec![case(2617, "je", None), case(2418, "vouloir", None), case(2349, "manger", Some(2)), case(2439, "jouer", Some(2)), case(4570, "aider", None),
            case(5583, "oui", None), case(5525, "non", None), case(37163, "encore", None), case(5358, "fini", None), case(2369, "dormir", None)];
        let mut repas = gabarit(3, 2, 6);
        repas.nom = "Le repas".into();
        repas.eleve = String::new();
        repas.cases = vec![case(2494, "pain", None), case(2462, "pomme", None), case(2445, "lait", None), case(2248, "eau", None), case(2276, "boire", None), case(38249, "retour", Some(1))];
        for (n, g) in [&mut accueil, &mut repas].into_iter().enumerate() {
            g.numero = Some(n as u32 + 1);
            g.total = Some(2);
        }
        let pdf = construire_classeur(&[accueil, repas]).expect("classeur");
        std::fs::write(std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/classeur.pdf".into()), pdf).unwrap();
    }

    #[test]
    fn l_ecart_reste_dans_des_bornes_utiles() {
        // Un écart démesuré mangerait les cases ; on le borne plutôt que de
        // produire une grille impossible.
        let mut g = gabarit(4, 3, 12);
        g.ecart = 999.0;
        assert!(construire(&g).is_ok());
        g.ecart = -5.0;
        assert!(construire(&g).is_ok());
    }

    /// Une case posée, avec une image qui n'existe pas : seule une case qui la dessine échoue.
    fn case_posee(fichier: &str) -> CaseTla {
        CaseTla {
            picto_id: Some(7),
            fichier: fichier.into(),
            mot: "encore".into(),
            nature: "petit mot".into(),
            fond: String::new(),
            bord: String::new(),
            masquee: false,
            page_liee: None,
            licence: None,
        }
    }

    #[test]
    fn une_couleur_bien_ecrite_se_lit_une_autre_s_ignore() {
        assert_eq!(depuis_hex("#ff8000"), Some((1.0, 128.0 / 255.0, 0.0)));
        assert_eq!(depuis_hex(" #FFFFFF "), Some((1.0, 1.0, 1.0)));
        assert_eq!(depuis_hex("rouge"), None);
        assert_eq!(depuis_hex("#12345"), None);
        assert_eq!(depuis_hex("#12345g"), None);
    }

    #[test]
    fn une_case_masquee_s_imprime_vide_sans_chercher_son_image() {
        // Le vocabulaire s'ouvre peu à peu : la case masquée garde sa place, et rien de son image n'est lu.
        let mut g = gabarit(2, 1, 1);
        g.cases.push(case_posee("/n/existe/pas.png"));
        g.cases[1].masquee = true;
        assert!(construire(&g).is_ok());
        g.cases[1].masquee = false;
        assert!(construire(&g).is_err(), "une image introuvable doit se dire");
    }

    #[test]
    fn un_mot_sans_image_s_imprime_seul() {
        // Une photo de Mes pictos retirée depuis : la case garde son mot.
        let mut g = gabarit(2, 1, 1);
        g.cases.push(case_posee(""));
        assert!(construire(&g).is_ok());
    }

    #[test]
    fn cadres_de_couleur_mot_au_dessus_ou_sans_mot_et_mentions() {
        let mut g = gabarit(3, 2, 0);
        g.cases = (0..6)
            .map(|_| CaseTla { fond: "#ffffff".into(), bord: "#2e9b3e".into(), ..case_posee("") })
            .collect();
        g.mentions = "Pictogrammes : Sclera (www.sclera.be). Usage non commercial. ".repeat(6);
        for place in ["dessous", "dessus", "aucune"] {
            g.place_mot = place.into();
            g.corps_mot = Some(12.0);
            let pdf = construire(&g).unwrap_or_else(|e| panic!("{place} : {e}"));
            assert!(pdf.starts_with(b"%PDF"));
        }
    }

    #[test]
    fn chaque_nature_a_sa_couleur() {
        let naturels = ["personne", "verbe", "adjectif", "social", "petit mot", "nom", "question"];
        let mut vues = std::collections::HashSet::new();
        for n in naturels {
            let c = fond(n);
            assert!(vues.insert(format!("{c:?}")), "deux natures partagent la couleur de « {n} »");
        }
    }

    #[test]
    fn les_fonds_restent_pales() {
        // Une case trop saturée mange le pictogramme qu'elle porte.
        for n in ["personne", "verbe", "adjectif", "social", "petit mot", "nom", "question"] {
            let (r, v, b) = fond(n);
            assert!(r.min(v).min(b) > 0.7, "« {n} » est trop sombre : {r},{v},{b}");
        }
    }
}
