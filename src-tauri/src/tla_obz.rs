//! Le classeur de communication au format ouvert des tableaux (Open Board
//! Format, « .obz »).
//!
//! Un fichier `.obz` est une archive : un `manifest.json` qui dit où sont les
//! tableaux et les images, un `.obf` par tableau — ses boutons, sa grille, ses
//! images —, et les images elles-mêmes. LibreAAC, Cboard ou AsTeRICS Grid le
//! lisent : la voix de l'élève marche alors sur sa tablette, sans l'ordinateur
//! de l'enseignant. Une case liée devient un bouton qui ouvre l'autre tableau
//! (`load_board`) ; une case masquée, un bouton caché ; une case libre, une
//! place vide de la grille. Chaque image garde sa licence — ARASAAC en
//! CC BY-NC-SA, une banque d'appoint, une photo de l'enseignant. Le nom de
//! l'élève ne part pas dans le fichier : seul celui du tableau.

use crate::tla_pdf::{Gabarit, LicenceImage};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::io::{Cursor, Write};

const FORMAT: &str = "open-board-0.1";
/// Le côté d'une image dans l'archive, au plus : assez pour une tablette, sans alourdir le fichier.
const COTE: u32 = 300;

/// « #rrggbb » en « rgb(r, g, b) », la façon dont le format écrit les couleurs ; rien si la couleur est mal écrite.
fn rgb(hex: &str) -> Option<String> {
    let h = hex.trim().strip_prefix('#')?;
    if h.len() != 6 || !h.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let v = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok();
    Some(format!("rgb({}, {}, {})", v(0)?, v(2)?, v(4)?))
}

/// La licence d'une image, comme le format la décrit.
fn licence(l: &LicenceImage) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), Value::String(if l.sorte.is_empty() { "private".into() } else { l.sorte.clone() }));
    if !l.auteur.is_empty() {
        m.insert("author_name".into(), Value::String(l.auteur.clone()));
    }
    if !l.url.is_empty() {
        m.insert("author_url".into(), Value::String(l.url.clone()));
        m.insert("source_url".into(), Value::String(l.url.clone()));
    }
    Value::Object(m)
}

/// Une image relue, réduite et réécrite en PNG : un fichier qui n'est pas une image n'entre pas dans l'archive.
fn en_png(chemin: &str) -> Option<(Vec<u8>, u32, u32)> {
    let image = ::image::open(chemin).ok()?;
    let image = if image.width() > COTE || image.height() > COTE { image.thumbnail(COTE, COTE) } else { image };
    let mut octets = Cursor::new(Vec::new());
    image.write_to(&mut octets, ::image::ImageOutputFormat::Png).ok()?;
    Some((octets.into_inner(), image.width(), image.height()))
}

/// L'archive `.obz` du classeur : les pages dans l'ordre reçu, la première est l'accueil.
pub fn construire_obz(pages: &[Gabarit]) -> Result<Vec<u8>, String> {
    if pages.is_empty() {
        return Err("Le classeur n'a pas de page.".into());
    }
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let erreur = |e: std::io::Error| format!("Écriture de l'archive : {e}");
    let erreur_zip = |e: zip::result::ZipError| format!("Écriture de l'archive : {e}");

    // Une image par fichier : la même, posée sur plusieurs pages, n'entre qu'une fois dans l'archive.
    let mut images: HashMap<String, Option<Value>> = HashMap::new();
    let mut chemins_images = Map::new();
    let mut chemins_tableaux = Map::new();
    for (i, g) in pages.iter().enumerate() {
        let id = format!("page{}", i + 1);
        let mut boutons = Vec::new();
        let mut images_du_tableau: Vec<Value> = Vec::new();
        let mut ordre: Vec<Vec<Value>> = vec![Vec::new(); g.lignes as usize];
        for (k, c) in g.cases.iter().enumerate() {
            let rang = (k / g.colonnes.max(1) as usize).min(ordre.len().saturating_sub(1));
            if c.picto_id.is_none() && c.mot.trim().is_empty() {
                ordre[rang].push(Value::Null);
                continue;
            }
            let bouton_id = format!("{}-{}", i + 1, k + 1);
            let mut b = Map::new();
            b.insert("id".into(), Value::String(bouton_id.clone()));
            b.insert("label".into(), Value::String(c.mot.trim().to_string()));
            b.insert("background_color".into(), Value::String(rgb(&c.fond).unwrap_or_else(|| "rgb(255, 255, 255)".into())));
            b.insert("border_color".into(), Value::String(rgb(&c.bord).unwrap_or_else(|| "rgb(140, 140, 150)".into())));
            if c.masquee {
                b.insert("hidden".into(), Value::Bool(true));
            }
            if let Some(n) = c.page_liee.filter(|n| *n >= 1 && (*n as usize) <= pages.len()) {
                b.insert("load_board".into(), json!({ "id": format!("page{n}"), "path": format!("boards/page{n}.obf") }));
            }
            if !c.fichier.is_empty() {
                let image = images.entry(c.fichier.clone()).or_insert_with(|| None).clone();
                let image = match image {
                    Some(v) => Some(v),
                    None => {
                        // Lue une seule fois ; une image illisible laisse le bouton avec son seul mot.
                        let nouvelle = en_png(&c.fichier).map(|(png, largeur, hauteur)| {
                            let n = chemins_images.len() + 1;
                            let chemin = format!("images/image{n}.png");
                            chemins_images.insert(format!("image{n}"), Value::String(chemin.clone()));
                            let mut v = json!({
                                "id": format!("image{n}"), "path": chemin, "content_type": "image/png", "width": largeur, "height": hauteur,
                            });
                            if let Some(l) = &c.licence {
                                v["license"] = licence(l);
                            }
                            (v, png)
                        });
                        match nouvelle {
                            Some((v, png)) => {
                                zip.start_file(v["path"].as_str().unwrap_or_default(), options).map_err(erreur_zip)?;
                                zip.write_all(&png).map_err(erreur)?;
                                images.insert(c.fichier.clone(), Some(v.clone()));
                                Some(v)
                            }
                            None => None,
                        }
                    }
                };
                if let Some(v) = image {
                    b.insert("image_id".into(), v["id"].clone());
                    if !images_du_tableau.iter().any(|x| x["id"] == v["id"]) {
                        images_du_tableau.push(v);
                    }
                }
            }
            boutons.push(Value::Object(b));
            ordre[rang].push(Value::String(bouton_id));
        }
        let tableau = json!({
            "format": FORMAT, "id": id, "locale": "fr", "name": g.nom,
            "buttons": boutons,
            "grid": { "rows": g.lignes, "columns": g.colonnes, "order": ordre },
            "images": images_du_tableau, "sounds": [],
            "license": { "type": "private" },
        });
        let chemin = format!("boards/{id}.obf");
        zip.start_file(chemin.as_str(), options).map_err(erreur_zip)?;
        zip.write_all(&serde_json::to_vec_pretty(&tableau).map_err(|e| e.to_string())?).map_err(erreur)?;
        chemins_tableaux.insert(id, Value::String(chemin));
    }
    let manifeste = json!({
        "format": FORMAT, "root": "boards/page1.obf",
        "paths": { "boards": chemins_tableaux, "images": chemins_images, "sounds": {} },
    });
    zip.start_file("manifest.json", options).map_err(erreur_zip)?;
    zip.write_all(&serde_json::to_vec_pretty(&manifeste).map_err(|e| e.to_string())?).map_err(erreur)?;
    Ok(zip.finish().map_err(erreur_zip)?.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tla_pdf::CaseTla;
    use std::io::Read;

    fn case(mot: &str) -> CaseTla {
        CaseTla {
            picto_id: if mot.is_empty() { None } else { Some(1) },
            fichier: String::new(),
            mot: mot.into(),
            nature: "nom".into(),
            fond: "#fde6c9".into(),
            bord: String::new(),
            masquee: false,
            page_liee: None,
            licence: None,
        }
    }

    fn page(nom: &str, mots: &[&str]) -> Gabarit {
        Gabarit {
            nom: nom.into(),
            eleve: "Un élève".into(),
            colonnes: 2,
            lignes: 2,
            cases: mots.iter().map(|m| case(m)).collect(),
            paysage: true,
            ecart: 3.0,
            competences: vec![],
            place_mot: String::new(),
            corps_mot: None,
            mentions: String::new(),
            numero: None,
            total: None,
        }
    }

    fn lire(archive: &[u8], nom: &str) -> Value {
        let mut zip = zip::ZipArchive::new(Cursor::new(archive)).expect("archive");
        let mut texte = String::new();
        zip.by_name(nom).expect(nom).read_to_string(&mut texte).unwrap();
        serde_json::from_str(&texte).unwrap()
    }

    #[test]
    fn un_classeur_s_ecrit_au_format_ouvert() {
        let mut accueil = page("Accueil", &["je veux", "manger", "", "encore"]);
        accueil.cases[1].page_liee = Some(2);
        accueil.cases[3].masquee = true;
        let mut repas = page("Le repas", &["pain", "eau", "fini", ""]);
        repas.cases[2].page_liee = Some(1);
        let obz = construire_obz(&[accueil, repas]).expect("archive");

        let manifeste = lire(&obz, "manifest.json");
        assert_eq!(manifeste["format"], FORMAT);
        assert_eq!(manifeste["root"], "boards/page1.obf");
        assert_eq!(manifeste["paths"]["boards"]["page2"], "boards/page2.obf");

        let p1 = lire(&obz, "boards/page1.obf");
        assert_eq!(p1["name"], "Accueil");
        assert_eq!(p1["locale"], "fr");
        assert_eq!(p1["grid"]["rows"], 2);
        // La case libre reste une place vide ; la case liée ouvre la page 2 ; la masquée est cachée.
        assert_eq!(p1["grid"]["order"][1][0], Value::Null);
        let manger = p1["buttons"].as_array().unwrap().iter().find(|b| b["label"] == "manger").unwrap();
        assert_eq!(manger["load_board"]["path"], "boards/page2.obf");
        assert_eq!(manger["background_color"], "rgb(253, 230, 201)");
        let encore = p1["buttons"].as_array().unwrap().iter().find(|b| b["label"] == "encore").unwrap();
        assert_eq!(encore["hidden"], true);
        // Le nom de l'élève ne part pas dans le fichier.
        assert!(!String::from_utf8_lossy(&obz).contains("Un élève"));

        let p2 = lire(&obz, "boards/page2.obf");
        let fini = p2["buttons"].as_array().unwrap().iter().find(|b| b["label"] == "fini").unwrap();
        assert_eq!(fini["load_board"]["id"], "page1");
        assert!(construire_obz(&[]).is_err());
    }

    /// Un classeur de deux pages sur de vraies images, pour l'ouvrir dans LibreAAC ou AsTeRICS Grid :
    ///   MAITRIZE_BANQUE=/chemin/ARASAAC/images MAITRIZE_SORTIE=/tmp/classeur.obz cargo test rendu_obz -- --ignored
    #[test]
    #[ignore]
    fn rendu_obz() {
        let banque = std::path::PathBuf::from(std::env::var("MAITRIZE_BANQUE").expect("MAITRIZE_BANQUE"));
        let arasaac = LicenceImage { sorte: "CC BY-NC-SA 4.0".into(), auteur: "Sergio Palao, ARASAAC".into(), url: "https://arasaac.org".into() };
        let posee = |id: u32, mot: &str, page: Option<u32>| CaseTla {
            fichier: banque.join(format!("{id}.png")).to_string_lossy().into_owned(), page_liee: page, licence: Some(arasaac.clone()), ..case(mot)
        };
        let mut accueil = page("Accueil", &["", "", "", ""]);
        accueil.cases = vec![posee(2617, "je", None), posee(2349, "manger", Some(2)), posee(37163, "encore", None), posee(5358, "fini", None)];
        let mut repas = page("Le repas", &["", "", "", ""]);
        repas.cases = vec![posee(2494, "pain", None), posee(2248, "eau", None), posee(2462, "pomme", None), posee(38249, "retour", Some(1))];
        let obz = construire_obz(&[accueil, repas]).expect("archive");
        std::fs::write(std::env::var("MAITRIZE_SORTIE").unwrap_or_else(|_| "/tmp/classeur.obz".into()), obz).unwrap();
    }

    #[test]
    fn une_image_entre_une_fois_avec_sa_licence() {
        let dossier = std::env::temp_dir().join(format!("tla-obz-{}", std::process::id()));
        std::fs::create_dir_all(&dossier).unwrap();
        let chemin = dossier.join("picto.png");
        ::image::RgbaImage::from_pixel(500, 400, ::image::Rgba([10, 20, 30, 255])).save(&chemin).unwrap();
        let mut accueil = page("Accueil", &["boire", "boire", "", ""]);
        for c in accueil.cases.iter_mut().take(2) {
            c.fichier = chemin.to_string_lossy().into_owned();
            c.licence = Some(LicenceImage { sorte: "CC BY-NC-SA 4.0".into(), auteur: "Sergio Palao".into(), url: "https://arasaac.org".into() });
        }
        // Une image qui n'existe plus : le bouton garde son mot.
        accueil.cases[2] = CaseTla { fichier: dossier.join("absente.png").to_string_lossy().into_owned(), ..case("eau") };
        let obz = construire_obz(&[accueil]).expect("archive");
        let manifeste = lire(&obz, "manifest.json");
        assert_eq!(manifeste["paths"]["images"].as_object().unwrap().len(), 1);
        let p1 = lire(&obz, "boards/page1.obf");
        let image = &p1["images"][0];
        assert_eq!(image["license"]["type"], "CC BY-NC-SA 4.0");
        assert_eq!(image["license"]["author_name"], "Sergio Palao");
        assert!(image["width"].as_u64().unwrap() <= COTE as u64);
        let eau = p1["buttons"].as_array().unwrap().iter().find(|b| b["label"] == "eau").unwrap();
        assert!(eau.get("image_id").is_none());
        let mut zip = zip::ZipArchive::new(Cursor::new(&obz)).unwrap();
        assert!(zip.by_name("images/image1.png").is_ok());
        std::fs::remove_dir_all(&dossier).ok();
    }
}
