// Génère l'export "Synthèse des acquis fin GS" en superposant les données de
// l'app directement sur le PDF officiel (gabarit MEN), plutôt que de recréer
// la mise en page : coordonnées extraites une fois pour toutes du PDF source
// (voir notes de dev) afin de garantir une correspondance pixel-exacte.
//
// Repère PDF : origine en bas à gauche, y croissant vers le haut. Les
// coordonnées ci-dessous sont issues d'une extraction texte (origine en haut,
// y croissant vers le bas) ; `flip()` convertit vers le repère PDF.

use lopdf::content::{Content, Operation};
use lopdf::{dictionary, Dictionary, Document, Object, ObjectId};

const TEMPLATE: &[u8] = include_bytes!("../resources/synthese_gs_template.pdf");
const PAGE_H: f32 = 595.32;

fn flip(y_haut_bas: f32) -> f32 {
    PAGE_H - y_haut_bas
}

// Centres horizontaux des 3 colonnes de positionnement (communs aux 2 pages
// de la grille, le tableau Word conserve les mêmes largeurs de colonnes).
const COL_X: [f32; 3] = [458.9, 525.0, 591.2];
// Colonne « Les réussites observées par l'enseignant » (grille principale).
const OBS_X0: f32 = 645.0;
const OBS_X1: f32 = 784.0;
// Colonne « Observations » du bloc Apprendre ensemble et vivre ensemble (page 3).
const AEVE_OBS_X0: f32 = 435.0;
const AEVE_OBS_X1: f32 = 784.0;

/// (page, y0, y1) de chaque ligne d'item, dans l'ordre exact du JSON
/// `syntheseGS.json` (mêmes domaines, même ordre d'items).
const D1_ROWS: &[(u32, f32, f32)] = &[
    (0, 235.0, 255.4), (0, 256.7, 277.1), (0, 278.5, 298.8), (0, 300.2, 341.2),
    (0, 342.6, 362.9), (0, 364.3, 384.6), (0, 389.1, 409.5), (0, 415.5, 435.9),
];
const D2_ROWS: &[(u32, f32, f32)] = &[(0, 458.3, 468.3), (0, 470.8, 480.8)];
const D3_ROWS: &[(u32, f32, f32)] = &[(0, 501.7, 522.1)];
const D4_ROWS: &[(u32, f32, f32)] = &[
    (1, 55.0, 127.2), (1, 133.6, 174.7), (1, 181.3, 253.3),
    (1, 254.7, 275.1), (1, 286.7, 327.9), (1, 334.3, 354.8),
];
const D5_ROWS: &[(u32, f32, f32)] = &[
    (1, 376.8, 386.8), (1, 389.2, 399.3), (1, 401.7, 411.8), (1, 414.3, 424.4),
    (1, 426.8, 436.8), (1, 438.7, 459.1), (1, 461.0, 471.1),
];
const DOMAINES_ROWS: &[&[(u32, f32, f32)]] = &[D1_ROWS, D2_ROWS, D3_ROWS, D4_ROWS, D5_ROWS];

/// Cellule « Observations » fusionnée par domaine de la grille : (page, y0, y1).
const DOMAINES_OBS: &[(u32, f32, f32)] = &[
    (0, 235.0, 435.9), // d1
    (0, 458.3, 480.8), // d2
    (0, 501.7, 522.1), // d3
    (1, 55.0, 354.8),  // d4
    (1, 376.8, 471.1), // d5
];
// Bloc « Apprendre ensemble et vivre ensemble » (page 3, page index 2).
const AEVE_OBS_PAGE: u32 = 2;
const AEVE_OBS_Y0: f32 = 53.0;
const AEVE_OBS_Y1: f32 = 131.4;

// École / nom de l'enfant (page 1, page index 0).
const ECOLE_XY: (f32, f32) = (74.0, 192.9);
const ENFANT_XY: (f32, f32) = (172.0, 204.5);

// Visa (page 3, page index 2). (x, yBaseline)
const VISA_ENS_DATE_XY: (f32, f32) = (70.0, 193.8);
const VISA_ENS_DATE_MASK: (f32, f32, f32, f32) = (66.0, 180.5, 120.0, 195.0);
const VISA_ENS_NOM_XY: (f32, f32) = (71.0, 219.1);
const VISA_ENS_NOM_MASK: (f32, f32, f32, f32) = (69.0, 205.5, 296.0, 220.5);
const VISA_DIR_DATE_XY: (f32, f32) = (334.0, 193.8);
const VISA_DIR_DATE_MASK: (f32, f32, f32, f32) = (330.0, 180.5, 396.0, 195.0);
const VISA_DIR_NOM_XY: (f32, f32) = (335.0, 219.1);
const VISA_DIR_NOM_MASK: (f32, f32, f32, f32) = (332.0, 205.5, 560.0, 220.5);
const VISA_PAGE: u32 = 2;

pub struct SyntheseDonnees {
    pub ecole: String,
    pub eleve_nom: String,
    /// 5 domaines (d1..d5), chacun la liste des positions (0 = vide, 1..3) des items, dans l'ordre du JSON.
    pub positions: Vec<Vec<u8>>,
    /// 6 commentaires : d1, d2, d3, d4, d5, aeve (dans cet ordre).
    pub observations: Vec<String>,
    pub date_visa_enseignant: String,
    pub enseignant_nom: String,
    pub directeur_nom: String,
    pub date_visa_directeur: String,
}

fn esc(s: &str) -> Vec<u8> {
    let mut out = Vec::with_capacity(s.len());
    for b in s.replace('\\', "\\\\").replace('(', "\\(").replace(')', "\\)").bytes() {
        out.push(b);
    }
    out
}

fn op_text(font_res: &str, size: f32, x: f32, y: f32, text: &str) -> Vec<Operation> {
    vec![
        Operation::new("rg", vec![Object::Real(0.0), Object::Real(0.0), Object::Real(0.0)]),
        Operation::new("BT", vec![]),
        Operation::new("Tf", vec![Object::Name(font_res.as_bytes().to_vec()), Object::Real(size)]),
        Operation::new("Td", vec![Object::Real(x), Object::Real(y)]),
        Operation::new("Tj", vec![Object::String(esc(text), lopdf::StringFormat::Literal)]),
        Operation::new("ET", vec![]),
    ]
}

/// Texte noir avec retour à la ligne approximatif (estimation de largeur, pas
/// de métriques de police exactes : suffisant pour des annotations libres).
fn texte_multiligne(font_res: &str, size: f32, x: f32, y_top: f32, max_w: f32, max_h: f32, text: &str) -> Vec<Operation> {
    if text.trim().is_empty() {
        return vec![];
    }
    let chars_par_ligne = ((max_w / (size * 0.52)).floor() as usize).max(4);
    let interligne = size * 1.25;
    let max_lignes = ((max_h / interligne).floor() as usize).max(1);
    let mut lignes: Vec<String> = vec![];
    let mut cur = String::new();
    for mot in text.split_whitespace() {
        let essai = if cur.is_empty() { mot.to_string() } else { format!("{cur} {mot}") };
        if essai.chars().count() > chars_par_ligne && !cur.is_empty() {
            lignes.push(std::mem::take(&mut cur));
            cur = mot.to_string();
        } else {
            cur = essai;
        }
    }
    if !cur.is_empty() {
        lignes.push(cur);
    }
    lignes.truncate(max_lignes);
    let mut ops = vec![Operation::new("rg", vec![Object::Real(0.0), Object::Real(0.0), Object::Real(0.0)])];
    for (i, ligne) in lignes.iter().enumerate() {
        let y = y_top - (i as f32) * interligne;
        ops.push(Operation::new("BT", vec![]));
        ops.push(Operation::new("Tf", vec![Object::Name(font_res.as_bytes().to_vec()), Object::Real(size)]));
        ops.push(Operation::new("Td", vec![Object::Real(x), Object::Real(y)]));
        ops.push(Operation::new("Tj", vec![Object::String(esc(ligne), lopdf::StringFormat::Literal)]));
        ops.push(Operation::new("ET", vec![]));
    }
    ops
}

fn op_rect_blanc(x0: f32, y0: f32, x1: f32, y1: f32) -> Vec<Operation> {
    vec![
        Operation::new("q", vec![]),
        Operation::new("rg", vec![Object::Real(1.0), Object::Real(1.0), Object::Real(1.0)]),
        Operation::new("re", vec![Object::Real(x0), Object::Real(y0), Object::Real(x1 - x0), Object::Real(y1 - y0)]),
        Operation::new("f", vec![]),
        Operation::new("Q", vec![]),
    ]
}

/// Enregistre une police Helvetica standard sous le nom `/COvF1` dans les
/// ressources de la page (créées si absentes).
fn assurer_font(doc: &mut Document, page_id: ObjectId, font_id: ObjectId) {
    let page_dict = match doc.get_dictionary(page_id) {
        Ok(d) => d.clone(),
        Err(_) => return,
    };
    let res_id_existant = page_dict.get(b"Resources").ok().and_then(|o| o.as_reference().ok());

    if let Some(res_id) = res_id_existant {
        if let Ok(res_dict) = doc.get_dictionary_mut(res_id) {
            let mut font_dict = match res_dict.get(b"Font").and_then(|o| o.as_dict()) {
                Ok(d) => d.clone(),
                Err(_) => Dictionary::new(),
            };
            font_dict.set("COvF1", Object::Reference(font_id));
            res_dict.set("Font", Object::Dictionary(font_dict));
        }
    } else {
        // Resources inline (Dictionary directement dans la page, pas de référence indirecte) :
        // on fusionne notre police dans le dictionnaire EXISTANT au lieu de le remplacer,
        // sous peine d'effacer les polices d'origine (texte du gabarit) du rendu.
        let mut res_dict = page_dict.get(b"Resources").and_then(|o| o.as_dict()).cloned().unwrap_or_default();
        let mut font_dict = res_dict.get(b"Font").and_then(|o| o.as_dict()).cloned().unwrap_or_default();
        font_dict.set("COvF1", Object::Reference(font_id));
        res_dict.set("Font", Object::Dictionary(font_dict));
        if let Ok(page_mut) = doc.get_object_mut(page_id).and_then(Object::as_dict_mut) {
            page_mut.set("Resources", Object::Dictionary(res_dict));
        }
    }
}

pub fn generer(data: &SyntheseDonnees) -> Result<Vec<u8>, String> {
    let mut doc = Document::load_mem(TEMPLATE).map_err(|e| e.to_string())?;
    let pages: Vec<ObjectId> = doc.get_pages().values().copied().collect();
    if pages.len() < 3 {
        return Err("Gabarit PDF invalide (moins de 3 pages)".into());
    }

    let font_id = doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica-Bold",
    });
    for &p in &pages {
        assurer_font(&mut doc, p, font_id);
    }

    let mut par_page: Vec<Vec<Operation>> = vec![vec![], vec![], vec![]];

    // École / nom de l'enfant.
    par_page[0].extend(op_text("COvF1", 9.0, ECOLE_XY.0, flip(ECOLE_XY.1), &data.ecole));
    par_page[0].extend(op_text("COvF1", 9.0, ENFANT_XY.0, flip(ENFANT_XY.1), &data.eleve_nom));

    // Grille des 5 domaines : coches de positionnement + commentaires.
    for (di, rows) in DOMAINES_ROWS.iter().enumerate() {
        let positions = data.positions.get(di).cloned().unwrap_or_default();
        for (ii, &(page, y0, y1)) in rows.iter().enumerate() {
            let pos = positions.get(ii).copied().unwrap_or(0);
            if pos >= 1 && pos <= 3 {
                let cx = COL_X[(pos - 1) as usize];
                let cy = flip((y0 + y1) / 2.0) - 3.2;
                par_page[page as usize].extend(op_text("COvF1", 9.0, cx - 3.0, cy, "X"));
            }
        }
        let (page, y0, y1) = DOMAINES_OBS[di];
        let obs = data.observations.get(di).cloned().unwrap_or_default();
        par_page[page as usize].extend(texte_multiligne(
            "COvF1", 7.5, OBS_X0, flip(y0) - 8.0, OBS_X1 - OBS_X0, y1 - y0, &obs,
        ));
    }

    // Bloc « Apprendre ensemble et vivre ensemble » : observations à droite.
    if let Some(obs_aeve) = data.observations.get(5) {
        par_page[AEVE_OBS_PAGE as usize].extend(texte_multiligne(
            "COvF1", 8.0, AEVE_OBS_X0, flip(AEVE_OBS_Y0) - 8.0, AEVE_OBS_X1 - AEVE_OBS_X0, AEVE_OBS_Y1 - AEVE_OBS_Y0, obs_aeve,
        ));
    }

    // Visa enseignant + direction (on masque les pointillés d'origine avant d'écrire).
    let page_visa = VISA_PAGE as usize;
    par_page[page_visa].extend(op_rect_blanc(VISA_ENS_DATE_MASK.0, flip(VISA_ENS_DATE_MASK.3), VISA_ENS_DATE_MASK.2, flip(VISA_ENS_DATE_MASK.1)));
    par_page[page_visa].extend(op_text("COvF1", 9.0, VISA_ENS_DATE_XY.0, flip(VISA_ENS_DATE_XY.1), &data.date_visa_enseignant));
    par_page[page_visa].extend(op_rect_blanc(VISA_ENS_NOM_MASK.0, flip(VISA_ENS_NOM_MASK.3), VISA_ENS_NOM_MASK.2, flip(VISA_ENS_NOM_MASK.1)));
    par_page[page_visa].extend(op_text("COvF1", 9.0, VISA_ENS_NOM_XY.0, flip(VISA_ENS_NOM_XY.1), &data.enseignant_nom));
    par_page[page_visa].extend(op_rect_blanc(VISA_DIR_DATE_MASK.0, flip(VISA_DIR_DATE_MASK.3), VISA_DIR_DATE_MASK.2, flip(VISA_DIR_DATE_MASK.1)));
    par_page[page_visa].extend(op_text("COvF1", 9.0, VISA_DIR_DATE_XY.0, flip(VISA_DIR_DATE_XY.1), &data.date_visa_directeur));
    par_page[page_visa].extend(op_rect_blanc(VISA_DIR_NOM_MASK.0, flip(VISA_DIR_NOM_MASK.3), VISA_DIR_NOM_MASK.2, flip(VISA_DIR_NOM_MASK.1)));
    par_page[page_visa].extend(op_text("COvF1", 9.0, VISA_DIR_NOM_XY.0, flip(VISA_DIR_NOM_XY.1), &data.directeur_nom));

    for (i, ops) in par_page.into_iter().enumerate() {
        if ops.is_empty() {
            continue;
        }
        let content = Content { operations: ops };
        let encoded = content.encode().map_err(|e| e.to_string())?;
        doc.add_page_contents(pages[i], encoded).map_err(|e| e.to_string())?;
    }

    let mut buf = Vec::new();
    doc.save_to(&mut buf).map_err(|e| e.to_string())?;
    Ok(buf)
}
