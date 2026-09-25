// Génère l'export « Synthèse des acquis fin GS » en reconstruisant le tableau
// officiel (mise en page très proche du gabarit MEN) avec printpdf, mais avec
// des cellules d'observation qui s'agrandissent selon le texte et un saut de
// page automatique. Approche choisie plutôt que la superposition sur le PDF
// d'origine, afin que les commentaires longs ne soient jamais tronqués.

use printpdf::*;
use serde::Deserialize;

// ── Données reçues du frontend ──────────────────────────────────────────────
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynItemIn {
    #[serde(default)]
    pub bloc: Option<String>,
    pub label: String,
    #[serde(default)]
    pub position: u8, // 0 = vide, 1..3
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynDomIn {
    pub titre: String,
    #[serde(default)]
    pub titre_observations: String,
    #[serde(default)]
    pub items: Vec<SynItemIn>,
    #[serde(default)]
    pub enonces: Vec<String>,
    #[serde(default)]
    pub observation: String,
}

pub struct SyntheseDonnees {
    pub ecole: String,
    pub eleve_nom: String,
    pub domaines: Vec<SynDomIn>,
    pub date_visa_enseignant: String,
    pub enseignant_nom: String,
    pub directeur_nom: String,
    pub date_visa_directeur: String,
}

// ── Géométrie (mm), page A4 paysage ─────────────────────────────────────────
const W: f32 = 297.0;
const H: f32 = 210.0;
const MT: f32 = 10.0;
const MB: f32 = 10.0;

// Colonnes (x de gauche, largeur) — mesurées sur les coordonnées exactes du
// gabarit officiel (positions des mots extraites du PDF, converties en mm).
const C_BLOC: (f32, f32) = (11.0, 30.0);
const C_ITEM: (f32, f32) = (41.0, 101.0);
const C_POS: [(f32, f32); 3] = [(142.0, 23.3), (165.3, 23.3), (188.6, 23.3)];
const C_OBS: (f32, f32) = (211.9, 65.1);
const X_FIN: f32 = C_OBS.0 + C_OBS.1; // bord droit du tableau = 277

// Couleurs
fn c(r: f32, g: f32, b: f32) -> Color { Color::Rgb(Rgb::new(r, g, b, None)) }
fn col_line() -> Color { c(0.55, 0.62, 0.74) }
fn col_band() -> Color { c(0.86, 0.90, 0.97) }
fn col_band_tx() -> Color { c(0.11, 0.20, 0.69) }
fn col_pos() -> Color { c(0.80, 0.88, 0.95) }
fn col_bloc() -> Color { c(0.95, 0.96, 0.99) }
fn col_txt() -> Color { c(0.10, 0.12, 0.16) }
fn col_peach() -> Color { c(0.98, 0.86, 0.74) }
fn col_peach_head() -> Color { c(0.96, 0.78, 0.60) }

// Commandes de dessin (calculées d'abord, dessinées ensuite).
enum Cmd {
    Rect { x: f32, y: f32, w: f32, h: f32, fill: Color },
    Text { x: f32, y: f32, size: f32, bold: bool, color: Color, s: String },
    TextCenter { cx: f32, y: f32, size: f32, bold: bool, color: Color, s: String },
}

pub(crate) fn lh(size: f32) -> f32 { size * 0.3528 * 1.18 }

/// Découpe un texte pour tenir dans une largeur (mm), en coupant aussi les mots
/// trop longs pour ne jamais déborder horizontalement.
pub(crate) fn wrap(text: &str, col_w: f32, size: f32) -> Vec<String> {
    let avail_pt = (col_w - 3.0).max(2.0) * 2.83465;
    let max_chars = ((avail_pt / (size * 0.55)).floor() as usize).max(4);
    let mut out: Vec<String> = vec![];
    for para in text.split('\n') {
        let mut cur = String::new();
        for mot in para.split_whitespace() {
            let mut mot = mot.to_string();
            while mot.chars().count() > max_chars {
                if !cur.is_empty() { out.push(std::mem::take(&mut cur)); }
                out.push(mot.chars().take(max_chars).collect());
                mot = mot.chars().skip(max_chars).collect();
            }
            let essai = if cur.is_empty() { mot.clone() } else { format!("{cur} {mot}") };
            if essai.chars().count() > max_chars && !cur.is_empty() {
                out.push(std::mem::take(&mut cur));
                cur = mot;
            } else {
                cur = essai;
            }
        }
        if !cur.is_empty() { out.push(cur); }
    }
    if out.is_empty() { out.push(String::new()); }
    out
}

struct Layout {
    pages: Vec<Vec<Cmd>>,
    y: f32,
    prenom: String,
    ecole: String,
    eleve: String,
}

impl Layout {
    fn cur(&mut self) -> &mut Vec<Cmd> { self.pages.last_mut().unwrap() }
    fn rect(&mut self, x: f32, y: f32, w: f32, h: f32, fill: Color) { self.cur().push(Cmd::Rect { x, y, w, h, fill }); }
    fn hline(&mut self, x: f32, y: f32, w: f32) { self.rect(x, y - 0.1, w, 0.2, col_line()); }
    fn vline(&mut self, x: f32, y: f32, h: f32) { self.rect(x - 0.1, y, 0.2, h, col_line()); }
    fn text(&mut self, x: f32, y: f32, size: f32, bold: bool, color: Color, s: &str) {
        self.cur().push(Cmd::Text { x, y: y + size * 0.3528 * 0.82, size, bold, color, s: s.to_string() });
    }
    fn text_center(&mut self, cx: f32, y: f32, size: f32, bold: bool, color: Color, s: &str) {
        self.cur().push(Cmd::TextCenter { cx, y: y + size * 0.3528 * 0.82, size, bold, color, s: s.to_string() });
    }
    fn reste(&self) -> f32 { (H - MB) - self.y }

    fn nouvelle_page(&mut self, premiere: bool) {
        self.pages.push(vec![]);
        self.y = MT;
        // L'en-tête (logo, titre, ligne des colonnes) n'apparaît que sur la 1re
        // page, comme dans le gabarit officiel ; les pages suivantes continuent
        // directement le tableau.
        if premiere {
            self.y = 45.0;
            self.text_center(W / 2.0, self.y, 11.0, true, col_txt(),
                "Synthèse des acquis scolaires de l'élève à l'issue de la dernière année de la scolarité à l'école maternelle");
            self.y += lh(11.0) + 4.0;
            self.entete();
        }
    }

    fn entete(&mut self) {
        let p = self.prenom.clone();
        // En-têtes de positionnement sur 3 lignes (prénom / … / …), comme l'officiel.
        let titres: [[String; 3]; 3] = [
            [p.clone(), "ne réussit".into(), "pas encore".into()],
            [p.clone(), "est en voie".into(), "de réussite".into()],
            [p.clone(), "réussit".into(), "souvent".into()],
        ];
        let head_h = 15.0_f32;
        let y0 = self.y;
        self.rect(C_BLOC.0, y0, C_ITEM.0 + C_ITEM.1 - C_BLOC.0, head_h, col_band());
        for pc in C_POS { self.rect(pc.0, y0, pc.1, head_h, col_band()); }
        self.rect(C_OBS.0, y0, C_OBS.1, head_h, col_band());
        let ecole = self.ecole.clone();
        let eleve = self.eleve.clone();
        self.text(C_BLOC.0 + 2.0, y0 + 2.5, 8.0, true, col_txt(), "École :");
        self.text(C_BLOC.0 + 17.0, y0 + 2.5, 8.0, false, col_txt(), &ecole);
        self.text(C_BLOC.0 + 2.0, y0 + 8.0, 8.0, true, col_txt(), "Prénom et nom de l'enfant :");
        self.text(C_BLOC.0 + 55.0, y0 + 8.0, 8.0, false, col_txt(), &eleve);
        for (i, pc) in C_POS.iter().enumerate() {
            let total = 3.0 * lh(7.0);
            let mut yy = y0 + (head_h - total) / 2.0;
            for l in &titres[i] { self.text_center(pc.0 + pc.1 / 2.0, yy, 7.0, true, col_txt(), l); yy += lh(7.0); }
        }
        let oh = wrap("Les réussites observées par l'enseignant", C_OBS.1, 7.5);
        let total = oh.len() as f32 * lh(7.5);
        let mut yy = y0 + (head_h - total) / 2.0;
        for l in &oh { self.text_center(C_OBS.0 + C_OBS.1 / 2.0, yy, 7.5, true, col_txt(), l); yy += lh(7.5); }
        self.cadre(y0, head_h, true);
        self.y += head_h;
    }

    /// Cadre d'une bande (horizontales haut/bas + verticales des colonnes).
    fn cadre(&mut self, y0: f32, h: f32, avec_positions: bool) {
        self.hline(C_BLOC.0, y0, X_FIN - C_BLOC.0);
        self.hline(C_BLOC.0, y0 + h, X_FIN - C_BLOC.0);
        self.vline(C_BLOC.0, y0, h);
        self.vline(C_ITEM.0, y0, h);
        if avec_positions { for pc in C_POS { self.vline(pc.0, y0, h); } }
        self.vline(C_OBS.0, y0, h);
        self.vline(X_FIN, y0, h);
    }

    /// Bande de titre de domaine (pleine largeur, fond bleu, texte bleu gras).
    fn bande_titre(&mut self, titre: &str) {
        let h = 6.5;
        if self.reste() < h + 8.0 { self.nouvelle_page(false); }
        let y0 = self.y;
        self.rect(C_BLOC.0, y0, X_FIN - C_BLOC.0, h, col_band());
        self.text(C_POS[0].0 + 2.0, y0 + 1.4, 9.0, true, col_band_tx(), titre);
        self.cadre(y0, h, false);
        self.y += h;
    }

    /// Domaine standard : items à gauche (bloc/label/3 positions) + une cellule
    /// d'observation unique à droite, le tout à hauteur extensible.
    fn domaine(&mut self, dom: &SynDomIn) {
        self.bande_titre(&dom.titre);

        // Pré-calcule la hauteur de chaque item et celle de l'observation.
        let mut item_lignes: Vec<Vec<String>> = vec![];
        let mut item_h: Vec<f32> = vec![];
        for it in &dom.items {
            let l = wrap(&it.label, C_ITEM.1, 8.0);
            let h = (l.len() as f32 * lh(8.0) + 2.4).max(7.0);
            item_lignes.push(l);
            item_h.push(h);
        }
        let somme_items: f32 = item_h.iter().sum();
        let obs_lignes = wrap(&dom.observation, C_OBS.1, 8.0);
        let obs_h = if dom.observation.trim().is_empty() { 0.0 } else { obs_lignes.len() as f32 * lh(8.0) + 3.0 };
        let bloc_total = somme_items.max(obs_h).max(7.0);

        // Saut de page si le domaine ne tient pas (et qu'il peut tenir sur une
        // page entière) : on évite de couper au milieu d'un domaine.
        let page_utile = (H - MB) - MT - 15.0; // moins l'en-tête répété
        if self.reste() < bloc_total + 2.0 && bloc_total <= page_utile {
            self.nouvelle_page(false);
        }

        let y0 = self.y;
        // Cellule observation (fond blanc) sur toute la hauteur du domaine.
        self.rect(C_OBS.0, y0, C_OBS.1, bloc_total, c(1.0, 1.0, 1.0));
        if !obs_lignes.is_empty() {
            let mut yy = y0 + 1.5;
            for l in &obs_lignes { self.text(C_OBS.0 + 2.0, yy, 8.0, false, col_txt(), l); yy += lh(8.0); }
        }

        // Items (gauche). Regroupe les blocs identiques consécutifs.
        let mut yy = y0;
        let mut i = 0usize;
        while i < dom.items.len() {
            let bloc = dom.items[i].bloc.clone();
            // étendue du groupe de bloc
            let mut span = 1usize;
            if bloc.is_some() {
                while i + span < dom.items.len() && dom.items[i + span].bloc == bloc { span += 1; }
            }
            let groupe_h: f32 = item_h[i..i + span].iter().sum();
            // Fond + libellé de bloc (fusionné sur le groupe)
            if let Some(b) = &bloc {
                self.rect(C_BLOC.0, yy, C_BLOC.1, groupe_h, col_bloc());
                let bl = wrap(b, C_BLOC.1, 8.0);
                let mut by = yy + 1.5;
                for l in &bl { self.text(C_BLOC.0 + 2.0, by, 8.0, true, col_txt(), l); by += lh(8.0); }
            }
            // Lignes d'items du groupe
            for k in 0..span {
                let idx = i + k;
                let h = item_h[idx];
                // libellé item
                let mut ly = yy + 1.5;
                for l in &item_lignes[idx] { self.text(C_ITEM.0 + 2.0, ly, 8.0, false, col_txt(), l); ly += lh(8.0); }
                // 3 cases de position
                for (pi, pc) in C_POS.iter().enumerate() {
                    self.rect(pc.0, yy, pc.1, h, col_pos());
                    if dom.items[idx].position as usize == pi + 1 {
                        self.text_center(pc.0 + pc.1 / 2.0, yy + (h - lh(9.0)) / 2.0, 9.0, true, col_txt(), "X");
                    }
                }
                // séparateur d'item (sauf tout en haut)
                if !(k == 0 && bloc.is_none() && idx == 0) { self.hline(C_ITEM.0, yy, C_POS[2].0 + C_POS[2].1 - C_ITEM.0); }
                yy += h;
            }
            // séparateur de groupe de bloc côté bloc
            self.hline(C_BLOC.0, yy, C_BLOC.1);
            i += span;
        }

        self.cadre(y0, bloc_total, true);
        // verticales internes des positions sur toute la hauteur
        for pc in C_POS { self.vline(pc.0, y0, bloc_total); }
        self.y += bloc_total;
    }

    /// Bloc « Apprendre ensemble et vivre ensemble » : énoncés à gauche (pleine
    /// largeur jusqu'à la colonne obs) + observation à droite.
    fn domaine_enonces(&mut self, dom: &SynDomIn) {
        let gauche_w = C_OBS.0 - C_BLOC.0;
        // En-tête en deux cellules : titre à gauche, "Observations…" à droite.
        let bh = 6.5;
        if self.reste() < bh + 12.0 { self.nouvelle_page(false); }
        let yb = self.y;
        self.rect(C_BLOC.0, yb, gauche_w, bh, col_band());
        self.rect(C_OBS.0, yb, C_OBS.1, bh, col_band());
        self.text_center((C_BLOC.0 + C_OBS.0) / 2.0, yb + 1.4, 9.0, true, col_band_tx(), &dom.titre);
        let to = if dom.titre_observations.is_empty() { "Observations réalisées par l'enseignant" } else { &dom.titre_observations };
        self.text_center(C_OBS.0 + C_OBS.1 / 2.0, yb + 1.7, 7.5, true, col_txt(), to);
        self.hline(C_BLOC.0, yb, X_FIN - C_BLOC.0);
        self.hline(C_BLOC.0, yb + bh, X_FIN - C_BLOC.0);
        self.vline(C_BLOC.0, yb, bh);
        self.vline(C_OBS.0, yb, bh);
        self.vline(X_FIN, yb, bh);
        self.y += bh;
        let mut lignes_en: Vec<Vec<String>> = vec![];
        let mut hs: Vec<f32> = vec![];
        for e in &dom.enonces {
            let l = wrap(e, gauche_w, 8.0);
            let h = (l.len() as f32 * lh(8.0) + 2.4).max(7.0);
            lignes_en.push(l); hs.push(h);
        }
        let somme: f32 = hs.iter().sum();
        let obs_lignes = wrap(&dom.observation, C_OBS.1, 8.0);
        let obs_h = if dom.observation.trim().is_empty() { 0.0 } else { obs_lignes.len() as f32 * lh(8.0) + 3.0 };
        let total = somme.max(obs_h).max(7.0);
        let page_utile = (H - MB) - MT - 15.0;
        if self.reste() < total + 2.0 && total <= page_utile { self.nouvelle_page(false); }

        let y0 = self.y;
        self.rect(C_OBS.0, y0, C_OBS.1, total, c(1.0, 1.0, 1.0));
        if !obs_lignes.is_empty() {
            let mut yy = y0 + 1.5;
            for l in &obs_lignes { self.text(C_OBS.0 + 2.0, yy, 8.0, false, col_txt(), l); yy += lh(8.0); }
        }
        let mut yy = y0;
        for (i, l) in lignes_en.iter().enumerate() {
            let mut ly = yy + 1.5;
            for ligne in l { self.text(C_BLOC.0 + 2.0, ly, 8.0, false, col_txt(), ligne); ly += lh(8.0); }
            if i > 0 { self.hline(C_BLOC.0, yy, gauche_w); }
            yy += hs[i];
        }
        // cadre (sans les verticales de positions)
        self.hline(C_BLOC.0, y0, X_FIN - C_BLOC.0);
        self.hline(C_BLOC.0, y0 + total, X_FIN - C_BLOC.0);
        self.vline(C_BLOC.0, y0, total);
        self.vline(C_OBS.0, y0, total);
        self.vline(X_FIN, y0, total);
        self.y += total;
    }

    /// Tableau des visas (enseignant / direction / parents).
    fn visas(&mut self, d: &SyntheseDonnees) {
        let h = 34.0;
        let head_h = 7.0;
        if self.reste() < h + head_h + 4.0 { self.nouvelle_page(false); }
        self.y += 4.0;
        let y0 = self.y;
        let larg = (X_FIN - C_BLOC.0) / 3.0;
        let titres = [
            "Visa de l'enseignante / de l'enseignant de la classe",
            "Visa de la directrice / du directeur de l'école",
            "Visa des parents / responsables légaux",
        ];
        let dates = [d.date_visa_enseignant.as_str(), d.date_visa_directeur.as_str(), ""];
        let noms = [d.enseignant_nom.as_str(), d.directeur_nom.as_str(), ""];
        let sign = ["Signature", "Signature et cachet de l'école", "Signature"];
        let label_date = ["Date :", "Date :", "Pris connaissance le :"];
        for i in 0..3 {
            let x = C_BLOC.0 + larg * i as f32;
            self.rect(x, y0, larg, head_h, col_peach_head());
            self.rect(x, y0 + head_h, larg, h, col_peach());
            let t = wrap(titres[i], larg, 8.0);
            let mut ty = y0 + 1.2;
            for l in &t { self.text(x + 2.0, ty, 8.0, true, col_txt(), l); ty += lh(8.0); }
            self.text(x + 2.0, y0 + head_h + 3.0, 9.0, false, col_txt(), &format!("{} {}", label_date[i], dates[i]));
            self.text(x + 2.0, y0 + head_h + 10.0, 9.0, false, col_txt(), &format!("Nom : {}", noms[i]));
            self.text(x + 2.0, y0 + head_h + 24.0, 9.0, false, col_txt(), sign[i]);
            self.vline(x, y0, head_h + h);
        }
        self.vline(X_FIN, y0, head_h + h);
        self.hline(C_BLOC.0, y0, X_FIN - C_BLOC.0);
        self.hline(C_BLOC.0, y0 + head_h, X_FIN - C_BLOC.0);
        self.hline(C_BLOC.0, y0 + head_h + h, X_FIN - C_BLOC.0);
        self.y += head_h + h;
    }
}

pub fn generer(data: &SyntheseDonnees) -> Result<Vec<u8>, String> {
    let prenom = data.eleve_nom.split_whitespace().next().unwrap_or("L'élève").to_string();
    let mut lay = Layout {
        pages: vec![], y: MT, prenom,
        ecole: data.ecole.clone(), eleve: data.eleve_nom.clone(),
    };
    lay.nouvelle_page(true);
    for dom in &data.domaines {
        if dom.items.is_empty() && !dom.enonces.is_empty() {
            lay.domaine_enonces(dom);
        } else {
            lay.domaine(dom);
        }
    }
    lay.visas(data);

    // ── Dessin sur printpdf ────────────────────────────────────────────────
    let (doc, p1, l1) = PdfDocument::new("Synthèse GS", Mm(W), Mm(H), "Calque 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;
    let gras = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;

    let dessiner = |layer: &PdfLayerReference, cmds: &[Cmd]| {
        // Fonds et traits d'abord, textes ensuite (lisibilité).
        for cmd in cmds {
            if let Cmd::Rect { x, y, w, h, fill } = cmd {
                layer.set_fill_color(fill.clone());
                layer.add_rect(Rect::new(Mm(*x), Mm(H - (y + h)), Mm(x + w), Mm(H - y)).with_mode(printpdf::path::PaintMode::Fill));
            }
        }
        for cmd in cmds {
            match cmd {
                Cmd::Text { x, y, size, bold, color, s } => {
                    layer.set_fill_color(color.clone());
                    layer.use_text(s, *size, Mm(*x), Mm(H - y), if *bold { &gras } else { &font });
                }
                Cmd::TextCenter { cx, y, size, bold, color, s } => {
                    layer.set_fill_color(color.clone());
                    let w_pt = s.chars().count() as f32 * size * 0.5;
                    let w_mm = w_pt * 0.3528;
                    layer.use_text(s, *size, Mm(cx - w_mm / 2.0), Mm(H - y), if *bold { &gras } else { &font });
                }
                _ => {}
            }
        }
    };

    for (i, cmds) in lay.pages.iter().enumerate() {
        let layer = if i == 0 {
            doc.get_page(p1).get_layer(l1)
        } else {
            let (pp, ll) = doc.add_page(Mm(W), Mm(H), "Calque 1");
            doc.get_page(pp).get_layer(ll)
        };
        dessiner(&layer, cmds);
    }

    let bytes = doc.save_to_bytes().map_err(|e| e.to_string())?;
    ajouter_logo(bytes)
}

// Intègre le logo officiel (Ministère de l'Éducation nationale) en haut à
// gauche de la 1re page. printpdf est compilé sans support image : on post-
// traite donc le PDF avec lopdf (déjà présent) en injectant un XObject image
// (RGB brut compressé FlateDecode) et une commande de dessin.
fn ajouter_logo(bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    use lopdf::{Document, Object, Stream};
    const LOGO: &[u8] = include_bytes!("../resources/logo_men.rgb.flate");
    const LW: i64 = 461;
    const LH: i64 = 337;

    let mut doc = Document::load_mem(&bytes).map_err(|e| e.to_string())?;
    let page1 = match doc.get_pages().get(&1) { Some(id) => *id, None => return Ok(bytes) };

    let mut img_dict = lopdf::Dictionary::new();
    img_dict.set("Type", "XObject");
    img_dict.set("Subtype", "Image");
    img_dict.set("Width", LW);
    img_dict.set("Height", LH);
    img_dict.set("ColorSpace", Object::Name(b"DeviceRGB".to_vec()));
    img_dict.set("BitsPerComponent", 8i64);
    img_dict.set("Filter", Object::Name(b"FlateDecode".to_vec()));
    let img_id = doc.add_object(Stream::new(img_dict, LOGO.to_vec()));

    // Ajoute /MtzLogo dans les ressources XObject de la page.
    let page = doc.get_dictionary(page1).map_err(|e| e.to_string())?.clone();
    let res_id = match page.get(b"Resources") { Ok(Object::Reference(r)) => Some(*r), _ => None };
    let ajoute = |rdict: &mut lopdf::Dictionary, img_id: lopdf::ObjectId| {
        let mut xo = rdict.get(b"XObject").and_then(|o| o.as_dict()).cloned().unwrap_or_default();
        xo.set("MtzLogo", Object::Reference(img_id));
        rdict.set("XObject", Object::Dictionary(xo));
    };
    if let Some(rid) = res_id {
        let rdict = doc.get_object_mut(rid).and_then(Object::as_dict_mut).map_err(|e| e.to_string())?;
        ajoute(rdict, img_id);
    } else {
        let pdict = doc.get_object_mut(page1).and_then(Object::as_dict_mut).map_err(|e| e.to_string())?;
        if let Ok(rdict) = pdict.get_mut(b"Resources").and_then(Object::as_dict_mut) {
            ajoute(rdict, img_id);
        } else {
            let mut rd = lopdf::Dictionary::new();
            let mut xo = lopdf::Dictionary::new();
            xo.set("MtzLogo", Object::Reference(img_id));
            rd.set("XObject", Object::Dictionary(xo));
            pdict.set("Resources", Object::Dictionary(rd));
        }
    }

    // Dessine le logo en haut à gauche (mm → points). Largeur 40 mm.
    let mm = 2.834645_f32;
    let w_mm = 40.0_f32;
    let h_mm = w_mm * LH as f32 / LW as f32;
    let x_mm = 10.0_f32;
    let y_haut = 7.0_f32; // depuis le haut de la page
    let y_bas = H - y_haut - h_mm; // depuis le bas (origine PDF)
    let contenu = format!(
        "q {:.2} 0 0 {:.2} {:.2} {:.2} cm /MtzLogo Do Q",
        w_mm * mm, h_mm * mm, x_mm * mm, y_bas * mm
    );
    doc.add_page_contents(page1, contenu.into_bytes()).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    doc.save_to(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    // Rend un exemple complet à partir du VRAI fichier de domaines du frontend,
    // pour comparer fidèlement au gabarit officiel (multi-pages).
    #[test]
    fn ecrire_exemple() {
        let json = std::fs::read_to_string("../src/data/syntheseGS.json").unwrap();
        let brut: serde_json::Value = serde_json::from_str(&json).unwrap();
        let mut domaines = vec![];
        for (di, d) in brut.as_array().unwrap().iter().enumerate() {
            let items: Vec<SynItemIn> = d["items"].as_array().unwrap().iter().enumerate().map(|(ii, it)| SynItemIn {
                bloc: it["bloc"].as_str().map(|s| s.to_string()),
                label: it["label"].as_str().unwrap_or("").to_string(),
                position: ((ii + di) % 3 + 1) as u8, // positions variées pour l'exemple
            }).collect();
            let enonces: Vec<String> = d["enonces"].as_array().unwrap().iter().map(|e| e.as_str().unwrap_or("").to_string()).collect();
            domaines.push(SynDomIn {
                titre: d["titre"].as_str().unwrap_or("").to_string(),
                titre_observations: d["titreObservations"].as_str().unwrap_or("").to_string(),
                items, enonces,
                observation: "Brune a développé de réelles compétences dans ce domaine, avec une belle persévérance. Elle progresse régulièrement.".to_string(),
            });
        }
        let data = SyntheseDonnees {
            ecole: "École des Lilas".into(), eleve_nom: "Brune Martin".into(),
            domaines,
            date_visa_enseignant: "27/06/2026".into(), enseignant_nom: "Mme Dupont".into(),
            directeur_nom: "Mme Leroy".into(), date_visa_directeur: "28/06/2026".into(),
        };
        let bytes = generer(&data).unwrap();
        std::fs::write("/tmp/test_synthese.pdf", bytes).unwrap();
    }
}
