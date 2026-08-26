// Export PDF du bilan de PPI (Projet Personnalisé Individualisé) — mode
// IME/inclusion. Document A4 portrait à sections fluides (hauteurs
// extensibles, saut de page automatique), destiné aux ESS, familles et MDPH.

use crate::synthese_pdf::{lh, wrap};
use printpdf::*;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectifIn {
    pub domaine: String,
    pub intitule: String,
    #[serde(default)]
    pub critere: String,
    #[serde(default)]
    pub echeance: String,
    #[serde(default)]
    pub statut: String, // "En cours" | "Atteint" | "À reprendre" (déjà libellé)
    #[serde(default)]
    pub notes: String,
}

pub struct BilanPpi {
    pub eleve_nom: String,
    pub ecole: String,
    pub enseignant_nom: String,
    pub date: String,
    pub besoins: String,
    pub amenagements: String,
    pub prises_en_charge: Vec<String>,
    pub objectifs: Vec<ObjectifIn>,
    pub bilan_texte: String,
}

// Page A4 portrait (mm)
const W: f32 = 210.0;
const H: f32 = 297.0;
const ML: f32 = 16.0;
const MR: f32 = 16.0;
const MT: f32 = 16.0;
const MB: f32 = 18.0;
const CW: f32 = W - ML - MR; // largeur utile

fn c(r: f32, g: f32, b: f32) -> Color { Color::Rgb(Rgb::new(r, g, b, None)) }
fn col_txt() -> Color { c(0.10, 0.12, 0.16) }
fn col_tete() -> Color { c(0.11, 0.20, 0.69) }
fn col_bande() -> Color { c(0.86, 0.90, 0.97) }
fn col_ligne() -> Color { c(0.55, 0.62, 0.74) }
fn col_gris() -> Color { c(0.40, 0.44, 0.53) }

fn col_statut(s: &str) -> Color {
    let s = s.to_lowercase();
    if s.contains("atteint") { c(0.13, 0.55, 0.30) }
    else if s.contains("reprendre") { c(0.78, 0.22, 0.22) }
    else { c(0.80, 0.52, 0.10) }
}

enum Cmd {
    Rect { x: f32, y: f32, w: f32, h: f32, fill: Color },
    Text { x: f32, y: f32, size: f32, bold: bool, color: Color, s: String },
}

struct Doc {
    pages: Vec<Vec<Cmd>>,
    y: f32,
}

impl Doc {
    fn cur(&mut self) -> &mut Vec<Cmd> { self.pages.last_mut().unwrap() }
    fn rect(&mut self, x: f32, y: f32, w: f32, h: f32, fill: Color) { self.cur().push(Cmd::Rect { x, y, w, h, fill }); }
    fn hline(&mut self, x: f32, y: f32, w: f32) { self.rect(x, y - 0.1, w, 0.2, col_ligne()); }
    fn text(&mut self, x: f32, y: f32, size: f32, bold: bool, color: Color, s: &str) {
        self.cur().push(Cmd::Text { x, y: y + size * 0.3528 * 0.82, size, bold, color, s: s.to_string() });
    }
    fn reste(&self) -> f32 { (H - MB) - self.y }
    fn saut(&mut self, besoin: f32) {
        if self.reste() < besoin { self.pages.push(vec![]); self.y = MT; }
    }

    /// Titre de section sur bande bleue.
    fn section(&mut self, titre: &str) {
        self.saut(14.0);
        self.y += 3.0;
        let h = 7.0;
        self.rect(ML, self.y, CW, h, col_bande());
        self.text(ML + 2.5, self.y + 1.6, 9.5, true, col_tete(), titre);
        self.y += h + 2.0;
    }

    /// Paragraphe multi-lignes avec saut de page par ligne.
    fn paragraphe(&mut self, texte: &str, size: f32) {
        let t = if texte.trim().is_empty() { "—" } else { texte };
        for ligne in wrap(t, CW, size) {
            self.saut(lh(size) + 2.0);
            self.text(ML + 1.0, self.y, size, false, col_txt(), &ligne);
            self.y += lh(size);
        }
        self.y += 1.5;
    }
}

pub fn generer(d: &BilanPpi) -> Result<Vec<u8>, String> {
    let mut doc = Doc { pages: vec![vec![]], y: MT };

    // ── En-tête ────────────────────────────────────────────────────────────
    doc.text(ML, doc.y, 14.0, true, col_txt(), "Projet Personnalisé Individualisé — Bilan");
    doc.y += lh(14.0) + 1.5;
    let sous = [
        format!("Élève : {}", d.eleve_nom),
        if d.ecole.is_empty() { String::new() } else { format!("École / établissement : {}", d.ecole) },
        if d.enseignant_nom.is_empty() { String::new() } else { format!("Enseignant·e : {}", d.enseignant_nom) },
        format!("Date du bilan : {}", d.date),
    ];
    for l in sous.iter().filter(|l| !l.is_empty()) {
        doc.text(ML, doc.y, 9.5, false, col_gris(), l);
        doc.y += lh(9.5);
    }
    doc.y += 1.0;
    doc.hline(ML, doc.y, CW);
    doc.y += 2.0;

    // ── Besoins & aménagements ─────────────────────────────────────────────
    doc.section("Besoins particuliers");
    doc.paragraphe(&d.besoins, 9.5);
    doc.section("Aménagements mis en place");
    doc.paragraphe(&d.amenagements, 9.5);

    // ── Prises en charge extérieures ───────────────────────────────────────
    doc.section("Prises en charge extérieures");
    if d.prises_en_charge.is_empty() {
        doc.paragraphe("—", 9.5);
    } else {
        for p in &d.prises_en_charge {
            for (i, ligne) in wrap(p, CW - 5.0, 9.5).into_iter().enumerate() {
                doc.saut(lh(9.5) + 2.0);
                let puce = if i == 0 { "•  " } else { "   " };
                doc.text(ML + 1.0, doc.y, 9.5, false, col_txt(), &format!("{puce}{ligne}"));
                doc.y += lh(9.5);
            }
        }
        doc.y += 1.5;
    }

    // ── Objectifs individualisés (tableau extensible) ──────────────────────
    doc.section("Objectifs individualisés");
    if d.objectifs.is_empty() {
        doc.paragraphe("Aucun objectif défini.", 9.5);
    } else {
        // Colonnes : Domaine 28 · Objectif 58 · Critère 42 · Échéance 24 · Statut 26
        let cols = [(ML, 28.0f32), (ML + 28.0, 58.0), (ML + 86.0, 42.0), (ML + 128.0, 24.0), (ML + 152.0, 26.0)];
        let titres = ["Domaine", "Objectif", "Critère de réussite", "Échéance", "Statut"];
        let entete = |doc: &mut Doc| {
            let h = 6.0;
            doc.rect(ML, doc.y, CW, h, col_bande());
            for (i, (x, _)) in cols.iter().enumerate() {
                doc.text(x + 1.5, doc.y + 1.3, 8.0, true, col_txt(), titres[i]);
            }
            doc.hline(ML, doc.y, CW);
            doc.hline(ML, doc.y + h, CW);
            doc.y += h;
        };
        entete(&mut doc);
        for o in &d.objectifs {
            let cells = [o.domaine.as_str(), o.intitule.as_str(), o.critere.as_str(), o.echeance.as_str(), o.statut.as_str()];
            let lignes: Vec<Vec<String>> = cells.iter().enumerate()
                .map(|(i, t)| wrap(t, cols[i].1 - 3.0, 8.5)).collect();
            let nmax = lignes.iter().map(|l| l.len()).max().unwrap_or(1);
            let rh = (nmax as f32) * lh(8.5) + 2.4;
            if doc.reste() < rh + 2.0 { doc.pages.push(vec![]); doc.y = MT; entete(&mut doc); }
            let y0 = doc.y;
            for (i, (x, _)) in cols.iter().enumerate() {
                let color = if i == 4 { col_statut(&o.statut) } else { col_txt() };
                let bold = i == 4;
                let mut yy = y0 + 1.2;
                for l in &lignes[i] { doc.text(x + 1.5, yy, 8.5, bold, color.clone(), l); yy += lh(8.5); }
            }
            doc.y += rh;
            doc.hline(ML, doc.y, CW);
            // Notes éventuelles sous la ligne, en petit italique gris.
            if !o.notes.trim().is_empty() {
                for ligne in wrap(&format!("Note : {}", o.notes), CW - 34.0, 8.0) {
                    doc.saut(lh(8.0) + 2.0);
                    doc.text(ML + 31.5, doc.y + 0.6, 8.0, false, col_gris(), &ligne);
                    doc.y += lh(8.0);
                }
                doc.y += 1.0;
                doc.hline(ML, doc.y, CW);
            }
        }
        doc.y += 2.0;
    }

    // ── Bilan rédigé ───────────────────────────────────────────────────────
    doc.section("Bilan de la période");
    doc.paragraphe(&d.bilan_texte, 9.5);

    // ── Signatures ─────────────────────────────────────────────────────────
    doc.saut(30.0);
    doc.y += 4.0;
    let demi = CW / 2.0;
    doc.text(ML, doc.y, 9.0, true, col_txt(), "L'enseignant·e");
    doc.text(ML + demi, doc.y, 9.0, true, col_txt(), "La famille / le représentant légal");
    doc.y += lh(9.0) + 14.0;
    doc.hline(ML, doc.y, demi - 12.0);
    doc.hline(ML + demi, doc.y, demi - 12.0);
    doc.y += 2.0;

    // ── Rendu printpdf ─────────────────────────────────────────────────────
    let (pdf, p1, l1) = PdfDocument::new("Bilan PPI", Mm(W), Mm(H), "Calque 1");
    let font = pdf.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;
    let gras = pdf.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;
    for (i, cmds) in doc.pages.iter().enumerate() {
        let layer = if i == 0 {
            pdf.get_page(p1).get_layer(l1)
        } else {
            let (pp, ll) = pdf.add_page(Mm(W), Mm(H), "Calque 1");
            pdf.get_page(pp).get_layer(ll)
        };
        for cmd in cmds {
            if let Cmd::Rect { x, y, w, h, fill } = cmd {
                layer.set_fill_color(fill.clone());
                layer.add_rect(printpdf::Rect::new(Mm(*x), Mm(H - (y + h)), Mm(x + w), Mm(H - y)).with_mode(printpdf::path::PaintMode::Fill));
            }
        }
        for cmd in cmds {
            if let Cmd::Text { x, y, size, bold, color, s } = cmd {
                layer.set_fill_color(color.clone());
                layer.use_text(s, *size, Mm(*x), Mm(H - y), if *bold { &gras } else { &font });
            }
        }
    }
    pdf.save_to_bytes().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ecrire_exemple_ppi() {
        let data = BilanPpi {
            eleve_nom: "Yanis Bensaïd".into(),
            ecole: "IME Les Peupliers".into(),
            enseignant_nom: "M. Titet".into(),
            date: "30/06/2026".into(),
            besoins: "Yanis présente des troubles du spectre autistique avec un retard de langage. Il a besoin d'un cadre prévisible, de consignes courtes appuyées sur des pictogrammes, et de temps de retour au calme réguliers.".into(),
            amenagements: "Emploi du temps visuel individualisé, timer visuel, coin calme accessible, consignes doublées en pictogrammes, tutorat par un pair sur les temps collectifs.".into(),
            prises_en_charge: vec![
                "Orthophonie — Mardi 10h30 (Mme Robert)".into(),
                "Psychomotricité — Jeudi 14h00 (M. Lefèvre)".into(),
            ],
            objectifs: vec![
                ObjectifIn { domaine: "Langage / communication".into(), intitule: "Demander de l'aide avec un pictogramme ou un mot plutôt que de crier".into(), critere: "Réussi 3 fois sur 4 sur deux semaines".into(), echeance: "15/12/2026".into(), statut: "En cours".into(), notes: "Le pictogramme « aide » est maintenant sur sa table.".into() },
                ObjectifIn { domaine: "Autonomie".into(), intitule: "S'habiller seul pour la récréation (manteau, chaussures)".into(), critere: "Sans aide adulte 4 jours sur 5".into(), echeance: "30/11/2026".into(), statut: "Atteint".into(), notes: String::new() },
                ObjectifIn { domaine: "Mathématiques".into(), intitule: "Dénombrer une collection jusqu'à 5 en correspondance terme à terme".into(), critere: "3 réussites consécutives en atelier dirigé".into(), echeance: "15/12/2026".into(), statut: "À reprendre".into(), notes: "Passer par la manipulation d'objets du quotidien.".into() },
            ],
            bilan_texte: "Yanis a réalisé de nets progrès en communication au cours de cette période. Il utilise désormais spontanément son classeur de pictogrammes pour exprimer ses besoins essentiels. Les temps de crise ont fortement diminué. La priorité de la période suivante portera sur le dénombrement et l'entrée dans les premières correspondances graphème-phonème.".into(),
        };
        let bytes = generer(&data).unwrap();
        std::fs::write("/tmp/test_ppi.pdf", bytes).unwrap();
    }
}
