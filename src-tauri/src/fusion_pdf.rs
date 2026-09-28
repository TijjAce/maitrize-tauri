//! Joindre des PDF à la suite d'un autre : le matériel d'une séance après
//! le cahier journal, prêt à sortir de l'imprimante d'un seul geste.
//!
//! printpdf ne sait qu'écrire ; lopdf, déjà là, sait relire. On charge donc
//! le cahier journal qu'on vient de produire, puis chaque document joint :
//! ses pages passent une à une sous l'arbre de pages du journal, avec ce
//! qu'elles héritaient de leurs ancêtres (ressources, format), car ces
//! ancêtres ne les suivent pas.
//!
//! Un petit bandeau gris s'écrit en haut de la première page de chaque
//! document joint — le jour, l'heure, la séance, le titre — pour que la
//! pile de feuilles se trie sans le journal sous les yeux. Il se dessine
//! par-dessus le contenu existant, entre un `q` et un `Q` qui le protègent
//! de l'état graphique dans lequel la page s'est arrêtée.

use lopdf::content::{Content, Operation};
use lopdf::{Dictionary, Document, Object, ObjectId, Stream, StringFormat};
use std::path::PathBuf;

/// Un document à joindre, et ce qu'on écrit en haut de sa première page.
pub struct Joint {
    pub titre: String,
    /// « lundi 28 septembre · 09:00 · Lecture » : d'où vient la feuille.
    pub quand: String,
    pub chemin: PathBuf,
    /// L'échelle à l'impression : 1 = telle quelle ; 0,8 réduit autour du centre de la page.
    pub echelle: f32,
}

/// Le nom, dans les ressources d'une page, de la police du bandeau.
const POLICE_BANDEAU: &[u8] = b"MtzBandeau";

/// Le journal suivi de ses documents joints, et ceux qu'on n'a pas pu joindre
/// (fichier absent, PDF protégé ou abîmé) — le journal sort quand même.
pub fn joindre(journal: &[u8], joints: &[Joint]) -> Result<(Vec<u8>, Vec<String>), String> {
    let mut cible = Document::load_mem(journal).map_err(|e| format!("cahier journal illisible : {e}"))?;
    let mut manques = Vec::new();
    for j in joints {
        let resultat = Document::load(&j.chemin)
            .map_err(|e| e.to_string())
            .and_then(|source| ajouter_pages(&mut cible, source));
        match resultat {
            Ok(pages) => {
                let echelle = if j.echelle.is_finite() { j.echelle.clamp(0.25, 3.0) } else { 1.0 };
                if (echelle - 1.0).abs() > 0.001 {
                    for &page in &pages {
                        let _ = mettre_a_l_echelle(&mut cible, page, echelle);
                    }
                }
                if let Some(&premiere) = pages.first() {
                    let texte = if j.quand.is_empty() { j.titre.clone() } else { format!("{} · {}", j.quand, j.titre) };
                    // Un bandeau qui échoue ne retire pas la feuille.
                    let _ = ecrire_bandeau(&mut cible, premiere, &texte);
                }
            }
            Err(e) => manques.push(format!("{} : {e}", j.titre)),
        }
    }
    cible.prune_objects();
    cible.renumber_objects();
    let mut sortie = Vec::new();
    cible.save_to(&mut sortie).map_err(|e| e.to_string())?;
    Ok((sortie, manques))
}

/// Les pages de `source`, dans l'ordre, à la suite de celles de `cible`.
fn ajouter_pages(cible: &mut Document, mut source: Document) -> Result<Vec<ObjectId>, String> {
    if source.is_encrypted() {
        // Bien des PDF « protégés » n'ont qu'un mot de passe propriétaire :
        // ils s'ouvrent avec le mot de passe vide.
        source.decrypt("").map_err(|_| "PDF protégé par un mot de passe".to_string())?;
    }
    source.renumber_objects_with(cible.max_id + 1);
    let pages: Vec<ObjectId> = source.page_iter().collect();
    if pages.is_empty() {
        return Err("aucune page".into());
    }
    // Ce qu'une page hérite de ses ancêtres se pose sur elle : ses ancêtres
    // restent derrière.
    for &page in &pages {
        for cle in [b"Resources".as_slice(), b"MediaBox".as_slice(), b"CropBox".as_slice(), b"Rotate".as_slice()] {
            let deja = source.get_dictionary(page).map(|d| d.has(cle)).unwrap_or(false);
            if deja {
                continue;
            }
            if let Some(valeur) = herite(&source, page, cle) {
                if let Ok(d) = source.get_dictionary_mut(page) {
                    d.set(cle.to_vec(), valeur);
                }
            }
        }
    }
    let racine = cible
        .catalog()
        .and_then(|c| c.get(b"Pages"))
        .and_then(Object::as_reference)
        .map_err(|e| format!("arbre de pages du journal : {e}"))?;
    let max = source.max_id;
    cible.objects.extend(std::mem::take(&mut source.objects));
    cible.max_id = cible.max_id.max(max);
    for &page in &pages {
        cible.get_dictionary_mut(page).map_err(|e| e.to_string())?.set("Parent", Object::Reference(racine));
    }
    let noeud = cible.get_dictionary_mut(racine).map_err(|e| e.to_string())?;
    let mut enfants = noeud.get(b"Kids").and_then(Object::as_array).cloned().unwrap_or_default();
    let compte = noeud.get(b"Count").and_then(Object::as_i64).unwrap_or(enfants.len() as i64);
    enfants.extend(pages.iter().map(|&p| Object::Reference(p)));
    noeud.set("Kids", Object::Array(enfants));
    noeud.set("Count", compte + pages.len() as i64);
    Ok(pages)
}

/// La valeur d'une clé sur la page ou, à défaut, sur le premier ancêtre qui la porte.
fn herite(doc: &Document, page: ObjectId, cle: &[u8]) -> Option<Object> {
    let mut courant = page;
    for _ in 0..64 {
        let d = doc.get_dictionary(courant).ok()?;
        if let Ok(v) = d.get(cle) {
            return Some(v.clone());
        }
        courant = d.get(b"Parent").ok()?.as_reference().ok()?;
    }
    None
}

/// Les quatre bords d'une boîte de page, en points.
fn boite(doc: &Document, page: &Dictionary) -> Option<[f32; 4]> {
    let brut = page.get(b"CropBox").or_else(|_| page.get(b"MediaBox")).ok()?;
    let tableau = match brut {
        Object::Reference(id) => doc.get_object(*id).ok()?.as_array().ok()?.clone(),
        autre => autre.as_array().ok()?.clone(),
    };
    if tableau.len() != 4 {
        return None;
    }
    let mut sortie = [0.0; 4];
    for (i, v) in tableau.iter().enumerate() {
        sortie[i] = match v {
            Object::Integer(n) => *n as f32,
            Object::Real(r) => *r,
            _ => return None,
        };
    }
    Some([sortie[0].min(sortie[2]), sortie[1].min(sortie[3]), sortie[0].max(sortie[2]), sortie[1].max(sortie[3])])
}

/// Réduit ou agrandit le contenu d'une page autour de son centre, la page
/// gardant son format : une feuille trop grande pour l'imprimante rentre,
/// une feuille trop petite se lit. Ce qui dépasse le bord est perdu.
fn mettre_a_l_echelle(doc: &mut Document, page: ObjectId, echelle: f32) -> Result<(), String> {
    let dict = doc.get_dictionary(page).map_err(|e| e.to_string())?.clone();
    let Some([x0, y0, x1, y1]) = boite(doc, &dict) else { return Ok(()) };
    let (cx, cy) = ((x0 + x1) / 2.0, (y0 + y1) / 2.0);
    let (tx, ty) = (cx * (1.0 - echelle), cy * (1.0 - echelle));
    let avant = format!("q\n{echelle:.4} 0 0 {echelle:.4} {tx:.3} {ty:.3} cm\n");
    let existants = doc.get_page_contents(page);
    let ouverture = doc.add_object(Stream::new(Dictionary::new(), avant.into_bytes()));
    let fermeture = doc.add_object(Stream::new(Dictionary::new(), b"\nQ\n".to_vec()));
    let mut contenus = vec![Object::Reference(ouverture)];
    contenus.extend(existants.into_iter().map(Object::Reference));
    contenus.push(Object::Reference(fermeture));
    doc.get_dictionary_mut(page).map_err(|e| e.to_string())?.set("Contents", Object::Array(contenus));
    Ok(())
}

/// Écrit `texte` en petit gris dans la marge haute de la page.
fn ecrire_bandeau(doc: &mut Document, page: ObjectId, texte: &str) -> Result<(), String> {
    let dict = doc.get_dictionary(page).map_err(|e| e.to_string())?.clone();
    // Une page tournée aurait son haut sur un côté : on la laisse sans bandeau.
    if dict.get(b"Rotate").and_then(Object::as_i64).unwrap_or(0) % 360 != 0 {
        return Ok(());
    }
    let Some([x0, _, x1, y1]) = boite(doc, &dict) else { return Ok(()) };

    let mut police = Dictionary::new();
    police.set("Type", Object::Name(b"Font".to_vec()));
    police.set("Subtype", Object::Name(b"Type1".to_vec()));
    police.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
    police.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
    let police_id = doc.add_object(police);
    ajouter_ressource(doc, page, b"Font", POLICE_BANDEAU, police_id)?;

    // Coupé s'il déborde : la marge d'une feuille n'est pas un journal.
    let corps = 7.5_f32;
    let place = ((x1 - x0 - 56.0) / (corps * 0.5)).max(10.0) as usize;
    let texte: String = if texte.chars().count() > place {
        texte.chars().take(place.saturating_sub(1)).chain(std::iter::once('…')).collect()
    } else {
        texte.to_string()
    };
    let contenu = Content {
        operations: vec![
            Operation::new("BT", vec![]),
            Operation::new("Tf", vec![Object::Name(POLICE_BANDEAU.to_vec()), corps.into()]),
            Operation::new("rg", vec![0.42_f32.into(), 0.44_f32.into(), 0.53_f32.into()]),
            Operation::new("Td", vec![(x0 + 28.0).into(), (y1 - 16.0).into()]),
            Operation::new("Tj", vec![Object::String(Document::encode_text(Some("WinAnsiEncoding"), &texte), StringFormat::Literal)]),
            Operation::new("ET", vec![]),
        ],
    }
    .encode()
    .map_err(|e| e.to_string())?;

    // L'existant entre `q` et `Q`, le bandeau après : quel que soit l'état
    // graphique où la page s'est arrêtée, le bandeau part d'un état neuf.
    let existants = doc.get_page_contents(page);
    let avant = doc.add_object(Stream::new(Dictionary::new(), b"q\n".to_vec()));
    let apres = doc.add_object(Stream::new(Dictionary::new(), [b"\nQ\n".to_vec(), contenu].concat()));
    let mut contenus = vec![Object::Reference(avant)];
    contenus.extend(existants.into_iter().map(Object::Reference));
    contenus.push(Object::Reference(apres));
    doc.get_dictionary_mut(page).map_err(|e| e.to_string())?.set("Contents", Object::Array(contenus));
    Ok(())
}

/// Ajoute `nom → id` dans la catégorie (`Font`, `XObject`…) des ressources
/// de la page, où qu'elles soient : dans la page, ou partagées par référence.
fn ajouter_ressource(doc: &mut Document, page: ObjectId, categorie: &[u8], nom: &[u8], id: ObjectId) -> Result<(), String> {
    let ressources = doc.get_dictionary(page).map_err(|e| e.to_string())?.get(b"Resources").ok().cloned();
    let (ressources_id, dict) = match ressources {
        Some(Object::Reference(rid)) => (Some(rid), doc.get_dictionary(rid).map_err(|e| e.to_string())?.clone()),
        Some(Object::Dictionary(d)) => (None, d),
        _ => (None, Dictionary::new()),
    };
    // La catégorie partagée par référence se complète sur place.
    if let Ok(Object::Reference(cid)) = dict.get(categorie) {
        doc.get_dictionary_mut(*cid).map_err(|e| e.to_string())?.set(nom.to_vec(), Object::Reference(id));
        return Ok(());
    }
    let mut cat = dict.get(categorie).and_then(Object::as_dict).cloned().unwrap_or_default();
    cat.set(nom.to_vec(), Object::Reference(id));
    match ressources_id {
        Some(rid) => doc.get_dictionary_mut(rid).map_err(|e| e.to_string())?.set(categorie.to_vec(), Object::Dictionary(cat)),
        None => {
            let mut dict = dict;
            dict.set(categorie.to_vec(), Object::Dictionary(cat));
            doc.get_dictionary_mut(page).map_err(|e| e.to_string())?.set("Resources", Object::Dictionary(dict));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::dictionary;
    use printpdf::*;

    /// Un PDF de `pages` pages portant chacune un mot, comme printpdf les écrit.
    fn pdf(titre: &str, pages: usize) -> Vec<u8> {
        let (doc, p1, c1) = PdfDocument::new(titre, Mm(210.0), Mm(297.0), "Calque");
        let police = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
        doc.get_page(p1).get_layer(c1).use_text(format!("{titre} 1"), 12.0, Mm(20.0), Mm(270.0), &police);
        for i in 2..=pages {
            let (p, c) = doc.add_page(Mm(210.0), Mm(297.0), "Calque");
            doc.get_page(p).get_layer(c).use_text(format!("{titre} {i}"), 12.0, Mm(20.0), Mm(270.0), &police);
        }
        doc.save_to_bytes().unwrap()
    }

    fn fichier(nom: &str, octets: &[u8]) -> PathBuf {
        let chemin = std::env::temp_dir().join(format!("maitrize-fusion-{}-{nom}", std::process::id()));
        std::fs::write(&chemin, octets).unwrap();
        chemin
    }

    fn joint(titre: &str, chemin: PathBuf) -> Joint {
        Joint { titre: titre.into(), quand: "lundi 28 septembre · 09:00 · Lecture".into(), chemin, echelle: 1.0 }
    }

    #[test]
    fn une_feuille_reduite_garde_son_format_et_se_recentre() {
        let journal = pdf("Journal", 1);
        let fiche = fichier("reduite.pdf", &pdf("Fiche", 2));
        let mut j = joint("Fiche réduite", fiche.clone());
        j.echelle = 0.8;
        let (sortie, manques) = joindre(&journal, &[j]).expect("fusion");
        assert!(manques.is_empty(), "{manques:?}");
        if let Ok(chemin) = std::env::var("MAITRIZE_SORTIE_REDUITE") {
            std::fs::write(chemin, &sortie).unwrap();
        }
        let doc = Document::load_mem(&sortie).unwrap();
        let pages = doc.get_pages();
        assert_eq!(pages.len(), 3);
        for n in 2..=3 {
            let contenu = String::from_utf8_lossy(&doc.get_page_content(pages[&n]).unwrap()).into_owned();
            // Le contenu d'origine est pris entre un changement d'échelle centré et son Q.
            assert!(contenu.contains("0.8000 0 0 0.8000 59.528 84.189 cm"), "page {n} : {contenu}");
            let page = doc.get_dictionary(pages[&n]).unwrap();
            assert!(page.has(b"MediaBox"), "le format ne change pas");
        }
        // Le bandeau, lui, reste à sa taille : il vient après le Q de l'échelle.
        let deux = String::from_utf8_lossy(&doc.get_page_content(pages[&2]).unwrap()).into_owned();
        assert!(deux.rfind("/MtzBandeau").unwrap() > deux.rfind("cm").unwrap());
        let _ = std::fs::remove_file(fiche);
    }

    #[test]
    fn le_materiel_suit_le_journal_avec_son_bandeau() {
        let journal = pdf("Journal", 2);
        let fiche = fichier("fiche.pdf", &pdf("Fiche", 3));
        let (sortie, manques) = joindre(&journal, &[joint("Fiche syllabes", fiche)]).expect("fusion");
        assert!(manques.is_empty(), "{manques:?}");
        // MAITRIZE_SORTIE=/chemin/fusion.pdf : pour juger le bandeau de l'œil.
        if let Ok(chemin) = std::env::var("MAITRIZE_SORTIE") {
            std::fs::write(chemin, &sortie).unwrap();
        }
        let doc = Document::load_mem(&sortie).expect("le résultat se relit");
        let pages = doc.get_pages();
        assert_eq!(pages.len(), 5);
        // Le bandeau est sur la première page jointe, pas sur la suivante.
        let troisieme = doc.get_page_content(pages[&3]).unwrap();
        assert!(String::from_utf8_lossy(&troisieme).contains("/MtzBandeau"));
        assert!(String::from_utf8_lossy(&troisieme).starts_with("q\n"), "l'existant est protégé par q … Q");
        let quatrieme = doc.get_page_content(pages[&4]).unwrap();
        assert!(!String::from_utf8_lossy(&quatrieme).contains("/MtzBandeau"));
        // Chaque page jointe a gardé son format et ses ressources.
        for n in 3..=5 {
            let page = doc.get_dictionary(pages[&n]).unwrap();
            assert!(page.has(b"MediaBox"), "page {n} sans MediaBox");
            assert!(page.has(b"Resources"), "page {n} sans ressources");
        }
        let _ = std::fs::remove_file(std::env::temp_dir().join(format!("maitrize-fusion-{}-fiche.pdf", std::process::id())));
    }

    #[test]
    fn un_document_absent_ou_abime_ne_retient_pas_le_journal() {
        let journal = pdf("Journal", 1);
        let abime = fichier("abime.pdf", b"pas un pdf du tout");
        let joints = vec![
            joint("Introuvable", PathBuf::from("/nulle/part/fiche.pdf")),
            joint("Abîmé", abime.clone()),
            joint("Bonne fiche", fichier("bonne.pdf", &pdf("Bonne", 1))),
        ];
        let (sortie, manques) = joindre(&journal, &joints).expect("fusion");
        assert_eq!(manques.len(), 2, "{manques:?}");
        assert!(manques[0].starts_with("Introuvable : "));
        assert!(manques[1].starts_with("Abîmé : "));
        assert_eq!(Document::load_mem(&sortie).unwrap().get_pages().len(), 2);
        let _ = std::fs::remove_file(abime);
    }

    #[test]
    fn une_page_herite_de_ses_ancetres_avant_de_changer_de_parent() {
        // Un PDF où le format et les ressources sont sur le nœud Pages, comme
        // beaucoup de générateurs les écrivent : la page, seule sous le
        // journal, doit les avoir emportés.
        let mut src = Document::with_version("1.5");
        let police_id = src.add_object(dictionary! { "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Helvetica" });
        let pages_id = src.new_object_id();
        let contenu = Content { operations: vec![
            Operation::new("BT", vec![]),
            Operation::new("Tf", vec![Object::Name(b"F1".to_vec()), 12.into()]),
            Operation::new("Td", vec![50.into(), 700.into()]),
            Operation::new("Tj", vec![Object::string_literal("Fiche")]),
            Operation::new("ET", vec![]),
        ] };
        let contenu_id = src.add_object(Stream::new(Dictionary::new(), contenu.encode().unwrap()));
        let page_id = src.add_object(dictionary! { "Type" => "Page", "Parent" => pages_id, "Contents" => contenu_id });
        src.objects.insert(pages_id, Object::Dictionary(dictionary! {
            "Type" => "Pages", "Kids" => vec![page_id.into()], "Count" => 1,
            "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
            "Resources" => dictionary! { "Font" => dictionary! { "F1" => police_id } },
        }));
        let catalogue = src.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        src.trailer.set("Root", catalogue);
        let mut octets = Vec::new();
        src.save_to(&mut octets).unwrap();

        let (sortie, manques) = joindre(&pdf("Journal", 1), &[joint("Héritage", fichier("heritage.pdf", &octets))]).unwrap();
        assert!(manques.is_empty(), "{manques:?}");
        let doc = Document::load_mem(&sortie).unwrap();
        let pages = doc.get_pages();
        assert_eq!(pages.len(), 2);
        let page = doc.get_dictionary(pages[&2]).unwrap();
        assert!(page.has(b"MediaBox"));
        let ressources = page.get(b"Resources").and_then(Object::as_dict).expect("ressources posées sur la page");
        let polices = ressources.get(b"Font").and_then(Object::as_dict).unwrap();
        assert!(polices.has(b"F1"), "la police d'origine est gardée");
        assert!(polices.has(POLICE_BANDEAU), "celle du bandeau s'y ajoute");
        let _ = std::fs::remove_file(std::env::temp_dir().join(format!("maitrize-fusion-{}-heritage.pdf", std::process::id())));
    }
}
