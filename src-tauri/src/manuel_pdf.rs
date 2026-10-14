//! Un manuel photographié, en PDF : ses pages à la suite, chacune sur une
//! feuille A4 — en portrait ou en paysage, selon la photo —, pour l'imprimer,
//! le ranger sur le bureau ou l'envoyer.
//!
//! Une page en JPEG — celles du téléphone — passe telle quelle : le PDF sait
//! la lire, et un manuel de cent pages ne pèse que ses photos. Une page en
//! PNG est décodée et posée sur blanc. Un manuel importé en PDF garde le sien.
//!
//! Des photos telles quelles pèsent lourd : plus de 130 Mo pour un manuel de
//! 160 pages. Le PDF peut donc s'alléger, au choix de l'enseignant : chaque
//! page est ramenée à ce que la feuille en montre — 150 ou 100 points par
//! pouce — et réécrite en JPEG ; une page que cela alourdirait reste telle
//! quelle.

use crate::db::fichiers_dir;
use crate::jeux_pdf::{aplatir, entete_jpeg, Pixels};
use printpdf::*;

/// La feuille, en millimètres : A4.
const A4: (f32, f32) = (210.0, 297.0);
/// La marge autour de la page photographiée.
const MARGE: f32 = 6.0;

/// Le poids du PDF, au choix de l'enseignant.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Poids {
    /// Les photos telles qu'elles sont arrivées.
    #[default]
    Origine,
    /// Net à l'écran comme à l'impression : 150 points par pouce sur la feuille.
    Allege,
    /// Pour l'envoyer : 100 points par pouce, et une compression plus forte.
    Leger,
}

impl Poids {
    /// Les points par pouce gardés sur la feuille, et la qualité du JPEG réécrit.
    fn reglage(self) -> Option<(f32, u8)> {
        match self {
            Poids::Origine => None,
            Poids::Allege => Some((150.0, 75)),
            Poids::Leger => Some((100.0, 60)),
        }
    }
}

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

/// La taille que prend une photo sur sa feuille, en millimètres : elle y tient,
/// marges comprises, sans être déformée.
fn taille_posee(largeur: u32, hauteur: u32) -> (f32, f32) {
    let (l, h) = feuille_pour(largeur, hauteur);
    let (iw, ih) = (largeur as f32, hauteur as f32);
    let echelle = ((l - 2.0 * MARGE) / iw).min((h - 2.0 * MARGE) / ih);
    (iw * echelle, ih * echelle)
}

/// Une page allégée : ramenée à ce que la feuille en montre, puis réécrite en
/// JPEG. Une page que cela alourdirait, ou qu'on ne sait pas relire, reste
/// telle quelle.
fn alleger(pixels: Pixels, poids: Poids) -> Pixels {
    let Some((ppp, qualite)) = poids.reglage() else { return pixels };
    let (largeur, hauteur) = pixels.dimensions();
    let (dl, dh) = taille_posee(largeur, hauteur);
    let au_plus = |mm: f32| (mm / 25.4 * ppp).round().max(1.0) as u32;
    let (image, avant) = match &pixels {
        Pixels::Jpeg { octets, .. } => match ::image::load_from_memory_with_format(octets, ::image::ImageFormat::Jpeg) {
            Ok(image) => (image, octets.len()),
            Err(_) => return pixels,
        },
        Pixels::Bruts(image) => (::image::DynamicImage::ImageRgb8(image.clone()), usize::MAX),
    };
    let image = if largeur > au_plus(dl) || hauteur > au_plus(dh) {
        image.resize(au_plus(dl), au_plus(dh), ::image::imageops::FilterType::Triangle)
    } else {
        image
    };
    let gris = matches!(image, ::image::DynamicImage::ImageLuma8(_));
    let mut octets = Vec::new();
    let mut codeur = ::image::codecs::jpeg::JpegEncoder::new_with_quality(&mut octets, qualite);
    let ecrit = if gris { codeur.encode_image(&image.to_luma8()) } else { codeur.encode_image(&image.to_rgb8()) };
    if ecrit.is_err() || octets.len() >= avant {
        return pixels;
    }
    Pixels::Jpeg { largeur: image.width(), hauteur: image.height(), octets, gris }
}

/// Les pages lues, et allégées s'il le faut. Décoder, réduire et réécrire cent
/// photos prend du temps : plusieurs cœurs s'y mettent, quatre au plus, pour
/// la mémoire.
fn preparer_les_pages(pages: Vec<Vec<u8>>, poids: Poids) -> Vec<Result<Pixels, String>> {
    let preparer = |octets: Vec<u8>| page_de(octets).map(|p| alleger(p, poids));
    let fils = std::thread::available_parallelism().map_or(1, |n| n.get()).min(4);
    if poids == Poids::Origine || fils < 2 || pages.len() < 2 {
        return pages.into_iter().map(preparer).collect();
    }
    let n = pages.len();
    let file = std::sync::Mutex::new(pages.into_iter().enumerate());
    let faites = std::sync::Mutex::new(Vec::with_capacity(n));
    std::thread::scope(|s| {
        for _ in 0..fils {
            s.spawn(|| loop {
                let Some((i, octets)) = file.lock().unwrap().next() else { break };
                let page = preparer(octets);
                faites.lock().unwrap().push((i, page));
            });
        }
    });
    let mut faites = faites.into_inner().unwrap();
    faites.sort_by_key(|(i, _)| *i);
    faites.into_iter().map(|(_, page)| page).collect()
}

/// Les pages, à la suite, en PDF ; et le numéro de celles qu'on n'a pas pu lire.
pub fn pdf_des_pages(titre: &str, pages: Vec<Vec<u8>>, poids: Poids) -> Result<(Vec<u8>, Vec<usize>), String> {
    let mut lues = Vec::new();
    let mut illisibles = Vec::new();
    for (i, page) in preparer_les_pages(pages, poids).into_iter().enumerate() {
        match page {
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
        let (dl, dh) = taille_posee(iw, ih);
        let (iw, ih) = (iw as f32, ih as f32);
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

/// Ce que rend la fabrication : le PDF rangé dans Fichiers/, les pages laissées de côté, et ce qu'il pèse.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuelPdf {
    pub fichier: String,
    pub illisibles: Vec<usize>,
    /// Le poids du PDF, en octets.
    pub octets: u64,
}

/// Le manuel en PDF, rangé dans Fichiers/ sous un nom neuf.
///
/// `pdf` : le PDF d'un manuel importé, recopié tel quel. Sinon, `pages` :
/// les images des pages, dans l'ordre, au `poids` choisi.
#[tauri::command]
pub async fn manuel_en_pdf(titre: String, pages: Vec<String>, pdf: Option<String>, poids: Option<Poids>) -> Result<ManuelPdf, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dossier = fichiers_dir();
        let fichier = format!("{}.pdf", uuid::Uuid::new_v4());
        if let Some(source) = pdf.filter(|p| !p.is_empty()) {
            nom_sur(&source)?;
            let octets = std::fs::copy(dossier.join(&source), dossier.join(&fichier))
                .map_err(|e| format!("Le PDF du manuel n'a pas pu être recopié : {e}"))?;
            return Ok(ManuelPdf { fichier, illisibles: Vec::new(), octets });
        }
        let mut octets = Vec::with_capacity(pages.len());
        for nom in &pages {
            nom_sur(nom)?;
            octets.push(std::fs::read(dossier.join(nom)).unwrap_or_default());
        }
        let (pdf, illisibles) = pdf_des_pages(&titre, octets, poids.unwrap_or_default())?;
        std::fs::write(dossier.join(&fichier), &pdf).map_err(|e| format!("Écriture du PDF : {e}"))?;
        Ok(ManuelPdf { fichier, illisibles, octets: pdf.len() as u64 })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Ce que pèserait le PDF du manuel à chaque poids, en octets.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PoidsDuManuel {
    pub origine: u64,
    pub allege: u64,
    pub leger: u64,
}

/// Combien de pages, réparties dans le manuel, servent à estimer ce qu'il gagnerait.
const ECHANTILLON: usize = 6;

/// Ce que pèserait le PDF à chaque poids. Les photos telles quelles : le poids
/// de leurs fichiers. Allégé ou léger : ce que gagnent quelques pages réparties
/// dans le manuel, le manuel le gagne à peu près.
fn poids_estimes(pages: &[std::path::PathBuf]) -> PoidsDuManuel {
    let tailles: Vec<u64> = pages.iter().map(|p| std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)).collect();
    let origine: u64 = tailles.iter().sum();
    let n = pages.len();
    let choisies: Vec<usize> = if n <= ECHANTILLON { (0..n).collect() } else { (0..ECHANTILLON).map(|k| k * (n - 1) / (ECHANTILLON - 1)).collect() };
    let echantillon: Vec<(u64, Vec<u8>)> = choisies.into_iter().filter_map(|i| std::fs::read(&pages[i]).ok().map(|o| (tailles[i], o))).collect();
    let avant: u64 = echantillon.iter().map(|(t, _)| t).sum();
    let estime = |poids: Poids| -> u64 {
        if avant == 0 {
            return origine;
        }
        let apres: u64 = preparer_les_pages(echantillon.iter().map(|(_, o)| o.clone()).collect(), poids)
            .iter()
            .zip(&echantillon)
            .map(|(page, (taille, _))| match page {
                Ok(Pixels::Jpeg { octets, .. }) => octets.len() as u64,
                _ => *taille,
            })
            .sum();
        (origine as f64 * apres as f64 / avant as f64).round() as u64
    };
    PoidsDuManuel { origine, allege: estime(Poids::Allege), leger: estime(Poids::Leger) }
}

/// Ce que pèserait le PDF d'un manuel photographié, à chaque poids, pour choisir avant de le faire.
#[tauri::command]
pub async fn manuel_poids_pdf(pages: Vec<String>) -> Result<PoidsDuManuel, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dossier = fichiers_dir();
        let mut chemins = Vec::with_capacity(pages.len());
        for nom in &pages {
            nom_sur(nom)?;
            chemins.push(dossier.join(nom));
        }
        Ok(poids_estimes(&chemins))
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
        let (pdf, illisibles) = pdf_des_pages("Essai", vec![jpeg(1500, 2000), png(40, 30), jpeg(2000, 1500)], Poids::Origine).unwrap();
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
        let (pdf, illisibles) = pdf_des_pages("Essai", vec![jpeg(100, 140), b"pas une image".to_vec(), Vec::new()], Poids::Origine).unwrap();
        assert_eq!(illisibles, vec![2, 3]);
        assert_eq!(lopdf::Document::load_mem(&pdf).unwrap().get_pages().len(), 1);
        assert!(pdf_des_pages("Vide", vec![Vec::new()], Poids::Origine).is_err());
    }

    /// Une page photographiée, en JPEG : des lignes de texte figurées sur un papier un peu grenu.
    fn photo(l: u32, h: u32, qualite: u8) -> Vec<u8> {
        let image = ::image::RgbImage::from_fn(l, h, |x, y| {
            let grain = ((x.wrapping_mul(7919) ^ y.wrapping_mul(104_729)) % 23) as u8;
            if (y / 9) % 3 == 0 && (x / 7) % 5 != 0 { ::image::Rgb([30 + grain, 30, 40]) } else { ::image::Rgb([232 - grain, 228, 218]) }
        });
        let mut octets = Vec::new();
        ::image::codecs::jpeg::JpegEncoder::new_with_quality(&mut octets, qualite).encode_image(&image).unwrap();
        octets
    }

    /// La largeur de chaque feuille du PDF, en points.
    fn largeurs_des_feuilles(pdf: &[u8]) -> Vec<f32> {
        let doc = lopdf::Document::load_mem(pdf).unwrap();
        doc.get_pages().values().map(|id| {
            let boite = doc.get_object(*id).unwrap().as_dict().unwrap().get(b"MediaBox").unwrap().as_array().unwrap().clone();
            boite[2].as_float().unwrap_or_else(|_| boite[2].as_i64().unwrap() as f32)
        }).collect()
    }

    #[test]
    fn un_pdf_allege_garde_ses_feuilles_et_pese_moins() {
        let (portrait, paysage) = (photo(1100, 1700, 95), photo(1700, 1100, 95));
        let tailles: Vec<usize> = [Poids::Origine, Poids::Allege, Poids::Leger].into_iter().map(|poids| {
            let (pdf, illisibles) = pdf_des_pages("Essai", vec![portrait.clone(), paysage.clone()], poids).unwrap();
            assert!(illisibles.is_empty());
            // Les mêmes feuilles, dans le même sens : portrait, puis paysage.
            let largeurs = largeurs_des_feuilles(&pdf);
            assert!(largeurs.len() == 2 && largeurs[0] < largeurs[1], "{poids:?} : {largeurs:?}");
            pdf.len()
        }).collect();
        assert!(tailles[2] < tailles[1] && tailles[1] < tailles[0], "{tailles:?}");
    }

    #[test]
    fn une_page_est_ramenee_a_ce_que_la_feuille_en_montre() {
        // 285 mm de haut sur la feuille, marges ôtées : 1122 points à 100 par pouce.
        let Pixels::Jpeg { largeur, hauteur, gris, .. } = alleger(page_de(photo(780, 1200, 90)).unwrap(), Poids::Leger) else {
            panic!("un JPEG")
        };
        assert!(hauteur.abs_diff(1122) <= 1, "{hauteur}");
        // Sans être déformée, et toujours en couleurs.
        assert!((largeur as f32 / hauteur as f32 - 0.65).abs() < 0.01, "{largeur}×{hauteur}");
        assert!(!gris);
        // À 150 points par pouce, 1683 : cette page-là n'a rien à perdre en taille, seulement en poids.
        let Pixels::Jpeg { hauteur, .. } = alleger(page_de(photo(780, 1200, 90)).unwrap(), Poids::Allege) else { panic!("un JPEG") };
        assert_eq!(hauteur, 1200);
    }

    #[test]
    fn une_page_deja_legere_reste_telle_quelle() {
        // Petite et déjà très compressée : la réécrire l'alourdirait.
        let petite = photo(300, 420, 20);
        let Pixels::Jpeg { octets, largeur, hauteur, .. } = alleger(page_de(petite.clone()).unwrap(), Poids::Allege) else { panic!("un JPEG") };
        assert_eq!((octets, largeur, hauteur), (petite, 300, 420));
        // Le poids d'origine ne touche à rien.
        let grande = photo(600, 900, 95);
        let Pixels::Jpeg { octets, .. } = alleger(page_de(grande.clone()).unwrap(), Poids::Origine) else { panic!("un JPEG") };
        assert_eq!(octets, grande);
    }

    #[test]
    fn une_page_en_png_s_allege_en_jpeg() {
        assert!(matches!(alleger(page_de(png(900, 1300)).unwrap(), Poids::Leger), Pixels::Jpeg { .. }));
        assert!(matches!(alleger(page_de(png(900, 1300)).unwrap(), Poids::Origine), Pixels::Bruts(_)));
    }

    #[test]
    fn les_poids_s_estiment_d_apres_quelques_pages() {
        let dossier = std::env::temp_dir().join(format!("maitrize-poids-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dossier).unwrap();
        let page = photo(700, 1000, 95);
        let chemins: Vec<std::path::PathBuf> = (0..8).map(|i| {
            let chemin = dossier.join(format!("page-{i}.jpg"));
            std::fs::write(&chemin, &page).unwrap();
            chemin
        }).collect();
        let estime = poids_estimes(&chemins);
        std::fs::remove_dir_all(&dossier).ok();
        // Les photos telles quelles : le poids exact de leurs fichiers.
        assert_eq!(estime.origine, 8 * page.len() as u64);
        assert!(estime.leger < estime.allege && estime.allege < estime.origine, "{estime:?}");
        let vide = poids_estimes(&[]);
        assert_eq!((vide.origine, vide.allege, vide.leger), (0, 0, 0));
    }

    #[test]
    fn un_nom_qui_sort_du_dossier_est_refuse() {
        for nom in ["", "../base.sqlite3", "a/b.pdf", "a\\b.pdf"] {
            assert!(nom_sur(nom).is_err(), "{nom}");
        }
        assert!(nom_sur("3f2a.jpg").is_ok());
    }
}
