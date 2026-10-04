//! Un manuel photographié, en PDF : ses pages à la suite, chacune sur une
//! feuille A4 — en portrait ou en paysage, selon la photo —, pour l'imprimer,
//! le ranger sur le bureau ou l'envoyer.
//!
//! Une page en JPEG — celles du téléphone — passe telle quelle : le PDF sait
//! la lire, et un manuel de cent pages ne pèse que ses photos. Une page en
//! PNG est décodée et posée sur blanc. Un manuel importé en PDF garde le sien.

use crate::db::fichiers_dir;
use crate::jeux_pdf::{aplatir, entete_jpeg, Pixels};
use printpdf::*;

/// La feuille, en millimètres : A4.
const A4: (f32, f32) = (210.0, 297.0);
/// La marge autour de la page photographiée.
const MARGE: f32 = 6.0;

/// Une page du manuel, prête à poser.
fn page_de(octets: Vec<u8>) -> Result<Pixels, String> {
    if let Some((largeur, hauteur, composantes)) = entete_jpeg(&octets) {
        return Ok(Pixels::Jpeg { octets, largeur, hauteur, gris: composantes == 1 });
    }
    let brut = ::image::load_from_memory_with_format(&octets, ::image::ImageFormat::Png)
        .map_err(|_| "ni JPEG ni PNG".to_string())?;
    Ok(Pixels::Bruts(aplatir(brut)))
}

/// La feuille qui va à une photo : en paysage pour une photo plus large que haute.
fn feuille_pour(largeur: u32, hauteur: u32) -> (f32, f32) {
    if largeur > hauteur { (A4.1, A4.0) } else { A4 }
}

/// Les pages, à la suite, en PDF ; et le numéro de celles qu'on n'a pas pu lire.
pub fn pdf_des_pages(titre: &str, pages: Vec<Vec<u8>>) -> Result<(Vec<u8>, Vec<usize>), String> {
    let mut lues = Vec::new();
    let mut illisibles = Vec::new();
    for (i, octets) in pages.into_iter().enumerate() {
        match page_de(octets) {
            Ok(p) => lues.push(p),
            Err(_) => illisibles.push(i + 1),
        }
    }
    let Some(premiere) = lues.first() else {
        return Err("Aucune page lisible dans ce manuel.".into());
    };
    let (l0, h0) = { let (l, h) = premiere.dimensions(); feuille_pour(l, h) };
    let (doc, page, couche) = PdfDocument::new(titre, Mm(l0), Mm(h0), "Page");
    let mut feuilles = vec![(page, couche, l0, h0)];
    for p in lues.iter().skip(1) {
        let (l, h) = { let (iw, ih) = p.dimensions(); feuille_pour(iw, ih) };
        let (page, couche) = doc.add_page(Mm(l), Mm(h), "Page");
        feuilles.push((page, couche, l, h));
    }
    for (pixels, (page, couche, l, h)) in lues.into_iter().zip(feuilles) {
        let (iw, ih) = pixels.dimensions();
        let (iw, ih) = (iw as f32, ih as f32);
        // La photo tient dans la feuille, marges comprises, sans être déformée.
        let echelle = ((l - 2.0 * MARGE) / iw).min((h - 2.0 * MARGE) / ih);
        let (dl, dh) = (iw * echelle, ih * echelle);
        // printpdf place l'image en points par pouce : la taille voulue en mm devient un facteur sur les pixels.
        let dpi = 300.0;
        Image::from(pixels.en_objet()).add_to_layer(
            doc.get_page(page).get_layer(couche),
            ImageTransform {
                translate_x: Some(Mm((l - dl) / 2.0)),
                translate_y: Some(Mm((h - dh) / 2.0)),
                scale_x: Some(dl / (iw / dpi * 25.4)),
                scale_y: Some(dh / (ih / dpi * 25.4)),
                dpi: Some(dpi),
                ..Default::default()
            },
        );
    }
    let octets = doc.save_to_bytes().map_err(|e| format!("Écriture du PDF : {e}"))?;
    Ok((octets, illisibles))
}

/// Un nom de Fichiers/ tel qu'on l'accepte : sans chemin.
fn nom_sur(nom: &str) -> Result<(), String> {
    if nom.is_empty() || nom.contains('/') || nom.contains('\\') || nom.contains("..") {
        return Err("Nom de fichier invalide.".into());
    }
    Ok(())
}

/// Ce que rend la fabrication : le PDF rangé dans Fichiers/, et les pages laissées de côté.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuelPdf {
    pub fichier: String,
    pub illisibles: Vec<usize>,
}

/// Le manuel en PDF, rangé dans Fichiers/ sous un nom neuf.
///
/// `pdf` : le PDF d'un manuel importé, recopié tel quel. Sinon, `pages` :
/// les images des pages, dans l'ordre.
#[tauri::command]
pub async fn manuel_en_pdf(titre: String, pages: Vec<String>, pdf: Option<String>) -> Result<ManuelPdf, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dossier = fichiers_dir();
        let fichier = format!("{}.pdf", uuid::Uuid::new_v4());
        if let Some(source) = pdf.filter(|p| !p.is_empty()) {
            nom_sur(&source)?;
            std::fs::copy(dossier.join(&source), dossier.join(&fichier))
                .map_err(|e| format!("Le PDF du manuel n'a pas pu être recopié : {e}"))?;
            return Ok(ManuelPdf { fichier, illisibles: Vec::new() });
        }
        let mut octets = Vec::with_capacity(pages.len());
        for nom in &pages {
            nom_sur(nom)?;
            octets.push(std::fs::read(dossier.join(nom)).unwrap_or_default());
        }
        let (pdf, illisibles) = pdf_des_pages(&titre, octets)?;
        std::fs::write(dossier.join(&fichier), pdf).map_err(|e| format!("Écriture du PDF : {e}"))?;
        Ok(ManuelPdf { fichier, illisibles })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Recopie un fichier de Fichiers/ là où l'enseignant l'a demandé (« Enregistrer sous… »).
#[tauri::command(async)]
pub fn fichier_exporter(nom: String, chemin: String) -> Result<(), String> {
    nom_sur(&nom)?;
    std::fs::copy(fichiers_dir().join(&nom), &chemin)
        .map(|_| ())
        .map_err(|e| format!("Copie impossible : {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png(l: u32, h: u32) -> Vec<u8> {
        let image = ::image::RgbaImage::from_fn(l, h, |x, _| ::image::Rgba([200, (x % 255) as u8, 40, 255]));
        let mut octets = std::io::Cursor::new(Vec::new());
        ::image::DynamicImage::ImageRgba8(image).write_to(&mut octets, ::image::ImageOutputFormat::Png).unwrap();
        octets.into_inner()
    }

    /// Un JPEG minimal, assez vrai pour que son en-tête se lise : SOI, SOF0 (3 composantes), EOI.
    fn jpeg(l: u16, h: u16) -> Vec<u8> {
        let mut o = vec![0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08];
        o.extend_from_slice(&h.to_be_bytes());
        o.extend_from_slice(&l.to_be_bytes());
        o.extend_from_slice(&[0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9]);
        o
    }

    #[test]
    fn chaque_page_a_sa_feuille_et_son_sens() {
        let (pdf, illisibles) = pdf_des_pages("Essai", vec![jpeg(1500, 2000), png(40, 30), jpeg(2000, 1500)]).unwrap();
        assert!(illisibles.is_empty());
        let doc = lopdf::Document::load_mem(&pdf).unwrap();
        let pages = doc.get_pages();
        assert_eq!(pages.len(), 3);
        // Portrait, paysage, paysage : la feuille suit la photo.
        let largeurs: Vec<f32> = pages.values().map(|id| {
            let boite = doc.get_object(*id).unwrap().as_dict().unwrap().get(b"MediaBox").unwrap().as_array().unwrap().clone();
            boite[2].as_float().unwrap_or_else(|_| boite[2].as_i64().unwrap() as f32)
        }).collect();
        assert!(largeurs[0] < largeurs[1] && (largeurs[1] - largeurs[2]).abs() < 1.0, "{largeurs:?}");
        // Le JPEG passe tel quel : aucun décodage, aucun poids de plus.
        let jpeg_tels_quels = doc.objects.values().filter(|o| {
            o.as_stream().map(|s| format!("{:?}", s.dict.get(b"Filter")).contains("DCTDecode")).unwrap_or(false)
        }).count();
        assert_eq!(jpeg_tels_quels, 2);
    }

    #[test]
    fn une_page_illisible_est_dite_sans_arreter_le_manuel() {
        let (pdf, illisibles) = pdf_des_pages("Essai", vec![jpeg(100, 140), b"pas une image".to_vec(), Vec::new()]).unwrap();
        assert_eq!(illisibles, vec![2, 3]);
        assert_eq!(lopdf::Document::load_mem(&pdf).unwrap().get_pages().len(), 1);
        assert!(pdf_des_pages("Vide", vec![Vec::new()]).is_err());
    }

    #[test]
    fn un_nom_qui_sort_du_dossier_est_refuse() {
        for nom in ["", "../base.sqlite3", "a/b.pdf", "a\\b.pdf"] {
            assert!(nom_sur(nom).is_err(), "{nom}");
        }
        assert!(nom_sur("3f2a.jpg").is_ok());
    }
}
