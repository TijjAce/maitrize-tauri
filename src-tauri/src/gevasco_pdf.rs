// Remplissage du formulaire officiel GEVA-Sco.
//
// Les supports officiels (CNSA / Éducation nationale) sont de vrais formulaires
// PDF interactifs : plutôt que de redessiner le document, on renseigne
// directement leurs champs AcroForm. Le fichier produit est donc le formulaire
// officiel lui-même, rempli et encore modifiable dans un lecteur PDF.

use lopdf::{Document, Object, ObjectId, StringFormat};

const REEXAMEN: &[u8] = include_bytes!("../resources/gevasco_reexamen.pdf");
const PREMIERE: &[u8] = include_bytes!("../resources/gevasco_premiere.pdf");

/// État demandé pour un champ bouton (case à cocher ou groupe de boutons radio).
pub enum Etat {
    /// Nom d'état exact tel qu'il figure dans le PDF (« A », « Oui », « Partielle »…).
    Exact(String),
    /// Choisit l'état dont le nom contient (ou non) un motif : utile quand le
    /// formulaire encode des libellés longs et accentués dans le nom d'état.
    Motif { contient: String, present: bool },
}

#[derive(Default)]
pub struct Champs {
    pub textes: Vec<(String, String)>,
    pub boutons: Vec<(String, Etat)>,
}

impl Champs {
    pub fn texte(&mut self, nom: &str, valeur: impl Into<String>) {
        let v: String = valeur.into();
        if !v.trim().is_empty() {
            self.textes.push((nom.to_string(), v));
        }
    }
    pub fn bouton(&mut self, nom: &str, etat: &str) {
        if !etat.is_empty() {
            self.boutons.push((nom.to_string(), Etat::Exact(etat.to_string())));
        }
    }
    pub fn bouton_motif(&mut self, nom: &str, contient: &str, present: bool) {
        self.boutons.push((nom.to_string(), Etat::Motif { contient: contient.to_string(), present }));
    }
}

/// Encode une chaîne pour un champ texte PDF : UTF-16BE préfixé du BOM, seul
/// format qui restitue fidèlement les accents dans tous les lecteurs.
fn texte_pdf(s: &str) -> Vec<u8> {
    let mut out = vec![0xFE, 0xFF];
    for u in s.encode_utf16() {
        out.extend_from_slice(&u.to_be_bytes());
    }
    out
}

/// Reconstruit la « default appearance » d'un champ en conservant la police
/// déclarée par le formulaire mais en imposant une taille fixe.
fn police_da(doc: &Document, id: ObjectId, taille: u8) -> String {
    let actuelle = doc.get_object(id).ok()
        .and_then(|o| o.as_dict().ok())
        .and_then(|d| d.get(b"DA").ok().cloned())
        .and_then(|o| o.as_str().ok().map(|b| String::from_utf8_lossy(b).to_string()))
        .unwrap_or_default();
    // Forme attendue : « /Police <taille> Tf <couleur> »
    let police = actuelle.split_whitespace().next().filter(|p| p.starts_with('/')).unwrap_or("/Helv").to_string();
    let couleur = if actuelle.contains(" g") || actuelle.contains(" rg") { "" } else { " 0 g" };
    let reste = actuelle.split("Tf").nth(1).unwrap_or("").trim().to_string();
    format!("{police} {taille} Tf {}{couleur}", reste).trim().to_string()
}

fn nom_champ(doc: &Document, id: ObjectId) -> Option<String> {
    let dict = doc.get_object(id).ok()?.as_dict().ok()?;
    let t = dict.get(b"T").ok()?;
    let bytes = t.as_str().ok()?;
    Some(String::from_utf8_lossy(bytes).to_string())
}

/// Widgets enfants d'un champ (/Kids), vide si le champ porte lui-même l'apparence.
fn enfants(doc: &Document, id: ObjectId) -> Vec<ObjectId> {
    doc.get_object(id).ok()
        .and_then(|o| o.as_dict().ok())
        .and_then(|d| d.get(b"Kids").ok().cloned())
        .and_then(|o| o.as_array().ok().cloned())
        .map(|a| a.iter().filter_map(|o| o.as_reference().ok()).collect())
        .unwrap_or_default()
}

/// États disponibles d'un widget (clés du dictionnaire /AP /N), hors « Off ».
fn etats_widget(doc: &Document, id: ObjectId) -> Vec<String> {
    let mut out = vec![];
    if let Ok(dict) = doc.get_object(id).and_then(|o| o.as_dict()) {
        if let Ok(ap) = dict.get(b"AP").and_then(|o| o.as_dict()) {
            if let Ok(n) = ap.get(b"N").and_then(|o| o.as_dict()) {
                for (k, _) in n.iter() {
                    let s = String::from_utf8_lossy(k).to_string();
                    if s != "Off" { out.push(s); }
                }
            }
        }
    }
    out
}

pub fn remplir(reexamen: bool, champs: &Champs) -> Result<Vec<u8>, String> {
    let modele = if reexamen { REEXAMEN } else { PREMIERE };
    let mut doc = Document::load_mem(modele).map_err(|e| e.to_string())?;

    // Index des objets porteurs d'un /T (champs de formulaire).
    let ids: Vec<ObjectId> = doc.objects.keys().copied().collect();
    let mut par_nom: std::collections::HashMap<String, Vec<ObjectId>> = Default::default();
    for id in ids {
        if let Some(n) = nom_champ(&doc, id) {
            par_nom.entry(n).or_default().push(id);
        }
    }

    // ── Champs texte ───────────────────────────────────────────────────────
    for (nom, valeur) in &champs.textes {
        let Some(cibles) = par_nom.get(nom) else { continue };
        for id in cibles.clone() {
            // Taille de police explicite : le support utilise la taille
            // automatique (« 0 Tf »), que certains lecteurs rendent
            // démesurément grande. On fixe une valeur lisible, réduite pour
            // les longs commentaires.
            let taille = if valeur.chars().count() > 260 { 6 } else if valeur.chars().count() > 90 { 7 } else { 9 };
            let da = police_da(&doc, id, taille);
            if let Ok(dict) = doc.get_object_mut(id).and_then(Object::as_dict_mut) {
                dict.set("V", Object::String(texte_pdf(valeur), StringFormat::Literal));
                dict.set("DA", Object::String(da.clone().into_bytes(), StringFormat::Literal));
                dict.remove(b"AP"); // force le lecteur à régénérer l'apparence
            }
            // Un champ répété sur plusieurs pages (« nom de l'élève » en pied
            // de page) porte un widget par page : chacun doit être rafraîchi.
            for kid in enfants(&doc, id) {
                if let Ok(kd) = doc.get_object_mut(kid).and_then(Object::as_dict_mut) {
                    kd.set("DA", Object::String(da.clone().into_bytes(), StringFormat::Literal));
                    kd.remove(b"AP");
                }
            }
        }
    }

    // ── Cases à cocher et boutons radio ────────────────────────────────────
    for (nom, etat) in &champs.boutons {
        let Some(cibles) = par_nom.get(nom) else { continue };
        for id in cibles.clone() {
            // Les widgets porteurs des apparences : les enfants, ou le champ lui-même.
            let kids = enfants(&doc, id);
            let widgets = if kids.is_empty() { vec![id] } else { kids };

            // Résout l'état voulu parmi ceux réellement proposés par le PDF.
            let dispo: Vec<String> = widgets.iter().flat_map(|w| etats_widget(&doc, *w)).collect();
            let choisi = match etat {
                Etat::Exact(s) => dispo.iter().find(|d| *d == s).cloned(),
                Etat::Motif { contient, present } => dispo.iter()
                    .find(|d| d.contains(contient.as_str()) == *present).cloned(),
            };
            let Some(choisi) = choisi else { continue };

            if let Ok(dict) = doc.get_object_mut(id).and_then(Object::as_dict_mut) {
                dict.set("V", Object::Name(choisi.clone().into_bytes()));
            }
            for w in widgets {
                let actif = etats_widget(&doc, w).contains(&choisi);
                if let Ok(wd) = doc.get_object_mut(w).and_then(Object::as_dict_mut) {
                    wd.set("AS", Object::Name(if actif { choisi.clone().into_bytes() } else { b"Off".to_vec() }));
                }
            }
        }
    }

    // Demande au lecteur de recalculer l'apparence des champs renseignés.
    if let Ok(racine) = doc.catalog_mut() {
        if let Ok(af) = racine.get_mut(b"AcroForm").and_then(Object::as_dict_mut) {
            af.set("NeedAppearances", Object::Boolean(true));
        }
    }

    let mut out = Vec::new();
    doc.save_to(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Remplit un exemplaire de test et vérifie que les valeurs sont bien
    /// inscrites dans le PDF produit (texte, cotation, case à cocher, radio).
    #[test]
    fn remplir_exemple() {
        let mut c = Champs::default();
        c.texte("Nom-et-prenom-de-l-eleve", "Ayyûb Kader");
        c.texte("Nom-eleve", "Ayyûb Kader");
        c.texte("Numero-dossier-MDPH", "2026-00471");
        c.texte("Annee-scolaire-debut", "26");
        c.texte("Annee-scolaire-fin", "27");
        c.texte("Etablissement-scolaire", "IME Les Peupliers");
        c.texte("Classe-frequentee", "Unité d'enseignement");
        c.texte("Lundi-matin", "Scolarité 9h-10h30 · Psychomotricité 11h");
        c.texte("Communication_Cadre1", "Parler : phrases courtes, peu d'initiative spontanée.");
        c.texte("Communication_Cadre2", "Parler : très bon appui sur les pictogrammes.");
        c.bouton("Parler", "C");
        c.bouton("Lire", "D");
        c.bouton("Prendre-ses-repas", "A");
        c.bouton("PAI", "Oui");
        c.bouton("SESSAD", "Oui");
        c.bouton("Accessibilite-du-bati", "Partielle");
        c.bouton_motif("Scolarite", "avec", true);

        let bytes = remplir(true, &c).unwrap();
        std::fs::write("/tmp/gevasco_rempli.pdf", &bytes).unwrap();

        // Relit le PDF produit et contrôle les valeurs enregistrées.
        let doc = Document::load_mem(&bytes).unwrap();
        let mut vus: std::collections::HashMap<String, String> = Default::default();
        for id in doc.objects.keys().copied().collect::<Vec<_>>() {
            let Some(nom) = nom_champ(&doc, id) else { continue };
            let Ok(dict) = doc.get_object(id).and_then(|o| o.as_dict()) else { continue };
            let Ok(v) = dict.get(b"V") else { continue };
            let rendu = match v {
                Object::Name(n) => String::from_utf8_lossy(n).to_string(),
                Object::String(s, _) => {
                    if s.starts_with(&[0xFE, 0xFF]) {
                        let u: Vec<u16> = s[2..].chunks(2).map(|p| u16::from_be_bytes([p[0], *p.get(1).unwrap_or(&0)])).collect();
                        String::from_utf16_lossy(&u)
                    } else { String::from_utf8_lossy(s).to_string() }
                }
                _ => continue,
            };
            vus.insert(nom, rendu);
        }
        assert_eq!(vus.get("Nom-et-prenom-de-l-eleve").map(String::as_str), Some("Ayyûb Kader"), "accents perdus");
        assert_eq!(vus.get("Parler").map(String::as_str), Some("C"));
        assert_eq!(vus.get("Lire").map(String::as_str), Some("D"));
        assert_eq!(vus.get("PAI").map(String::as_str), Some("Oui"));
        assert_eq!(vus.get("Accessibilite-du-bati").map(String::as_str), Some("Partielle"));
        assert!(vus.get("Scolarite").map(|s| s.contains("avec")).unwrap_or(false), "radio acquisitions non résolue");
        assert!(vus.get("Communication_Cadre1").map(|s| s.contains("initiative")).unwrap_or(false));
        println!("{} champs renseignés dans le PDF produit", vus.len());
    }

    /// Inventaire des champs : sert à vérifier la correspondance nom → type.
    #[test]
    fn inventaire_champs() {
        for (label, modele) in [("réexamen", REEXAMEN), ("1re demande", PREMIERE)] {
            let doc = Document::load_mem(modele).unwrap();
            let mut textes = 0; let mut boutons = 0; let mut noms = vec![];
            for id in doc.objects.keys().copied().collect::<Vec<_>>() {
                if let Some(n) = nom_champ(&doc, id) {
                    let ft = doc.get_object(id).ok().and_then(|o| o.as_dict().ok())
                        .and_then(|d| d.get(b"FT").ok().cloned())
                        .and_then(|o| o.as_name().ok().map(|b| String::from_utf8_lossy(b).to_string()));
                    match ft.as_deref() {
                        Some("Tx") => textes += 1,
                        Some("Btn") => boutons += 1,
                        _ => {}
                    }
                    noms.push(n);
                }
            }
            noms.sort(); noms.dedup();
            println!("{label} : {} champs uniques ({textes} texte, {boutons} bouton)", noms.len());
            assert!(noms.len() > 100, "{label} : trop peu de champs détectés");
        }
    }
}
