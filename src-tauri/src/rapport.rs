//! Le rapport d'erreur, envoyé par e-mail à l'éditeur — par l'enseignant.
//!
//! « Si un utilisateur a un bug, que l'erreur m'arrive sur contact@maitrize.com »
//! (l'éditeur, octobre 2026), d'un clic : rien ne part tout seul. La messagerie
//! de l'enseignant s'ouvre sur un e-mail déjà écrit, qu'il relit, complète et
//! envoie lui-même. L'application garde sa promesse : rien n'est envoyé à
//! l'éditeur sans qu'on le fasse.
//!
//! Le journal d'incidents ne contient que des messages techniques, mais un nom
//! de fichier peut porter un prénom d'élève : les prénoms et noms de la classe
//! y deviennent « [élève] », et le dossier personnel « ~ ».

use crate::db::Db;
use serde::Serialize;
use std::collections::HashSet;
use tauri::State;

type R<T> = Result<T, String>;

/// Où vont les rapports.
pub const DESTINATAIRE: &str = "contact@maitrize.com";

/// La longueur d'une adresse `mailto:` qu'une messagerie accepte à coup sûr :
/// sous Windows, au-delà d'environ deux mille signes, elle est tronquée.
fn budget() -> usize {
    if cfg!(target_os = "windows") { 1900 } else { 8000 }
}

/// Les lignes du journal qui disent un problème ; les autres (démarrages,
/// copies, retours…) n'aident pas à le comprendre.
const MARQUES: &[&str] = &["ERREUR", "PROMESSE REJETÉE", "PANIQUE", "FIGÉ", "SANS RÉPONSE", "SESSION PRÉCÉDENTE INTERROMPUE", "ÉCHEC"];

/// Une lettre sans accent ni majuscule, signe pour signe.
fn plier(c: char) -> char {
    let c = c.to_lowercase().next().unwrap_or(c);
    match c {
        'à' | 'â' | 'ä' | 'á' | 'ã' => 'a',
        'é' | 'è' | 'ê' | 'ë' => 'e',
        'î' | 'ï' | 'í' | 'ì' => 'i',
        'ô' | 'ö' | 'ó' | 'ò' | 'õ' => 'o',
        'ù' | 'û' | 'ü' | 'ú' => 'u',
        'ç' => 'c',
        'ÿ' => 'y',
        'ñ' => 'n',
        autre => autre,
    }
}

fn plie(mot: &str) -> String {
    mot.chars().map(plier).collect()
}

/// Les mots des noms de la classe, pliés : chacun sera masqué partout.
pub(crate) fn mots_des_noms(noms: &[String]) -> HashSet<String> {
    noms.iter()
        .flat_map(|n| n.split(|c: char| !c.is_alphabetic()).map(plie).collect::<Vec<_>>())
        .filter(|m| m.chars().count() >= 2)
        .collect()
}

/// Une adresse web réduite à son hôte et à son premier segment : la suite
/// peut porter un identifiant de compte ou le jeton d'un lien de partage, qui
/// ouvre le dossier d'un collègue à qui le détient.
fn masquer_les_adresses(texte: &str) -> String {
    let mut sortie = String::new();
    let mut reste = texte;
    while let Some(i) = reste.find("http") {
        let (avant, depuis) = reste.split_at(i);
        sortie.push_str(avant);
        let schema = if depuis.starts_with("https://") { 8 } else if depuis.starts_with("http://") { 7 } else { 0 };
        if schema == 0 {
            sortie.push_str("http");
            reste = &depuis[4..];
            continue;
        }
        let fin = depuis.find(|c: char| c.is_whitespace() || matches!(c, ')' | '"' | '\'' | '>' | ',')).unwrap_or(depuis.len());
        let mut parties = depuis[schema..fin].splitn(3, '/');
        sortie.push_str(&depuis[..schema]);
        sortie.push_str(parties.next().unwrap_or(""));
        if let Some(premier) = parties.next() {
            let (chemin, requete) = premier.split_once('?').map_or((premier, false), |(c, _)| (c, true));
            sortie.push('/');
            sortie.push_str(chemin);
            if requete { sortie.push_str("?…") }
        }
        if parties.next().is_some() {
            sortie.push_str("/…");
        }
        reste = &depuis[fin..];
    }
    sortie.push_str(reste);
    sortie
}

/// Le texte, prénoms et noms de la classe remplacés par « [élève] », le
/// dossier personnel par « ~ », les adresses web réduites à leur hôte.
pub(crate) fn nettoyer(texte: &str, mots: &HashSet<String>, maison: Option<&str>) -> String {
    let texte = match maison {
        Some(m) if m.len() > 1 => texte.replace(m, "~"),
        _ => texte.to_string(),
    };
    let texte = masquer_les_adresses(&texte);
    let mut sortie = String::with_capacity(texte.len());
    let mut mot = String::new();
    let vider = |mot: &mut String, sortie: &mut String| {
        if !mot.is_empty() {
            if mots.contains(&plie(mot)) { sortie.push_str("[élève]") } else { sortie.push_str(mot) }
            mot.clear();
        }
    };
    for c in texte.chars() {
        if c.is_alphabetic() {
            mot.push(c);
        } else {
            vider(&mut mot, &mut sortie);
            sortie.push(c);
        }
    }
    vider(&mut mot, &mut sortie);
    sortie
}

/// La forme d'une ligne, sans son heure ni ses chiffres : deux échecs pareils se reconnaissent.
fn forme(ligne: &str) -> String {
    let sans_heure = ligne.get(15..).unwrap_or(ligne);
    sans_heure.chars().map(|c| if c.is_ascii_digit() { 'N' } else { c }).collect()
}

/// Les lignes d'incident du journal, de la plus ancienne à la plus récente ;
/// une même erreur répétée n'y paraît qu'une fois, à sa dernière occurrence,
/// avec son compte.
pub(crate) fn lignes_d_incident(journal: &str) -> Vec<String> {
    let lignes: Vec<&str> = journal.lines()
        .filter(|l| MARQUES.iter().any(|m| l.contains(m)))
        .filter(|l| !l.contains("SESSION PRÉCÉDENTE COUPÉE"))
        .collect();
    let mut vues: Vec<(String, String, usize)> = Vec::new(); // (forme, dernière ligne, fois)
    for l in lignes {
        let f = forme(l);
        if let Some(i) = vues.iter().position(|(x, _, _)| *x == f) {
            let (_, _, n) = vues.remove(i);
            vues.push((f, l.to_string(), n + 1));
        } else {
            vues.push((f, l.to_string(), 1));
        }
    }
    vues.into_iter()
        .map(|(_, l, n)| {
            let l: String = l.chars().take(300).collect();
            if n > 1 { format!("{l} (×{n})") } else { l }
        })
        .collect()
}

/// Encode une partie d'adresse `mailto:` (RFC 6068) : les retours à la ligne en %0D%0A.
fn encoder(texte: &str) -> String {
    let mut s = String::new();
    for octet in texte.replace("\r\n", "\n").replace('\n', "\r\n").bytes() {
        match octet {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => s.push(octet as char),
            _ => s.push_str(&format!("%{octet:02X}")),
        }
    }
    s
}

pub(crate) fn adresse(sujet: &str, corps: &str) -> String {
    format!("mailto:{DESTINATAIRE}?subject={}&body={}", encoder(sujet), encoder(corps))
}

/// Le sujet et le corps de l'e-mail : l'en-tête, puis autant de lignes
/// récentes que l'adresse en peut porter, les plus anciennes tombant d'abord.
pub(crate) fn rediger(version: &str, systeme: &str, quand: &str, motif: Option<&str>, lignes: &[String], budget: usize) -> (String, String) {
    let sujet = format!("Maitrize {version} — rapport d'erreur");
    let entete = format!(
        "Bonjour,\n\n[En une phrase : ce que vous faisiez quand le problème est arrivé.]\n\n\n\
         —— Rapport technique ——\nMaitrize {version} · {systeme} · {quand}\n{}\n",
        motif.map(|m| format!("Problème : {m}\n")).unwrap_or_default(),
    );
    let mut gardees: Vec<&String> = Vec::new();
    for l in lignes.iter().rev() {
        let mut essai: Vec<&String> = gardees.clone();
        essai.insert(0, l);
        let corps = format!("{entete}{}", essai.iter().map(|x| x.as_str()).collect::<Vec<_>>().join("\n"));
        if adresse(&sujet, &corps).len() > budget {
            break;
        }
        gardees = essai;
    }
    let corps = if gardees.is_empty() {
        format!("{entete}(aucune ligne d'incident dans le journal)")
    } else {
        format!("{entete}{}", gardees.iter().map(|x| x.as_str()).collect::<Vec<_>>().join("\n"))
    };
    (sujet, corps)
}

/// Ce que la session d'avant a laissé de grave : un plantage, une fenêtre
/// figée, une fermeture brutale. Rend la phrase à dire, et ce qui reconnaît
/// cet incident-là (l'heure du démarrage de cette session).
pub(crate) fn incident_precedent(journal: &str) -> Option<(String, String)> {
    let lignes: Vec<&str> = journal.lines().collect();
    let demarrages: Vec<usize> = lignes.iter().enumerate().filter(|(_, l)| l.contains("DÉMARRAGE v")).map(|(i, _)| i).collect();
    let (&actuel, &avant) = (demarrages.last()?, demarrages.get(demarrages.len().checked_sub(2)?)?);
    let session = &lignes[avant..actuel];
    let cle = lignes[avant].get(..14).unwrap_or(lignes[avant]).to_string();
    let a = |m: &str| session.iter().any(|l| l.contains(m));
    let phrase = if a("PANIQUE") {
        "Maitrize s'est arrêtée sur une erreur la dernière fois."
    } else if a("FIGÉ") {
        "La fenêtre de Maitrize s'est figée la dernière fois."
    } else if a("SESSION PRÉCÉDENTE INTERROMPUE") {
        "Maitrize s'est fermée brutalement la dernière fois."
    } else {
        return None;
    };
    Some((phrase.to_string(), cle))
}

fn lire_journal() -> String {
    let chemin = crate::commands::diag_chemin();
    let precedent = std::fs::read_to_string(chemin.with_file_name("diagnostic.1.log")).unwrap_or_default();
    precedent + &std::fs::read_to_string(&chemin).unwrap_or_default()
}

/// L'e-mail du rapport, et si la messagerie a pu s'ouvrir.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RapportCourriel {
    pub sujet: String,
    pub corps: String,
    pub ouvert: bool,
}

/// Ouvre la messagerie sur le rapport, adressé à l'éditeur. `motif` : ce qui
/// vient d'arriver, s'il y a lieu.
#[tauri::command]
pub fn diag_courriel(app: tauri::AppHandle, db: State<Db>, motif: Option<String>) -> R<RapportCourriel> {
    let noms: Vec<String> = {
        let c = db.lock();
        let mut st = c.prepare("SELECT nom FROM eleves").map_err(|e| e.to_string())?;
        let it = st.query_map([], |r| r.get::<_, String>(0)).map_err(|e| e.to_string())?;
        it.flatten().collect()
    };
    let mots = mots_des_noms(&noms);
    let maison = dirs::home_dir().map(|m| m.to_string_lossy().to_string());
    let propre = |t: &str| nettoyer(t, &mots, maison.as_deref());
    let lignes: Vec<String> = lignes_d_incident(&lire_journal()).iter().map(|l| propre(l)).collect();
    let motif = motif.map(|m| propre(&m.chars().take(300).collect::<String>()));
    let (sujet, corps) = rediger(
        &app.package_info().version.to_string(),
        &format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
        &chrono::Local::now().format("%d/%m/%Y %H:%M").to_string(),
        motif.as_deref(),
        &lignes,
        budget(),
    );
    let ouvert = tauri_plugin_opener::open_url(adresse(&sujet, &corps), None::<&str>).is_ok();
    Ok(RapportCourriel { sujet, corps, ouvert })
}

/// Ce que la session d'avant a laissé de grave, s'il y a lieu : `[phrase, clé]`.
#[tauri::command]
pub fn diag_incident_precedent() -> Option<(String, String)> {
    incident_precedent(&lire_journal())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn les_noms_de_la_classe_et_le_dossier_personnel_ne_partent_pas() {
        let mots = mots_des_noms(&["Élève Un".into(), "Zéphyrin-Ondée Pélicane".into(), "Li Wu".into()]);
        let t = "ÉCHEC fichier_read : /Users/prof/Bureau/PPI de ZEPHYRIN-ONDEE pelicane.pdf introuvable (eleve, un)";
        assert_eq!(
            nettoyer(t, &mots, Some("/Users/prof")),
            "ÉCHEC fichier_read : ~/Bureau/PPI de [élève]-[élève] [élève].pdf introuvable ([élève], [élève])"
        );
        // Un mot qui contient un prénom n'est pas un prénom.
        assert_eq!(nettoyer("Livraison", &mots_des_noms(&["Li".into()]), None), "Livraison");
    }

    #[test]
    fn une_adresse_web_ne_garde_que_son_hote_et_son_premier_segment() {
        let vide = HashSet::new();
        assert_eq!(
            nettoyer("Nuage injoignable : error sending request for url (https://nuage17.apps.education.fr/public.php/dav/files/gRpJ5rTZ)", &vide, None),
            "Nuage injoignable : error sending request for url (https://nuage17.apps.education.fr/public.php/…)"
        );
        assert_eq!(nettoyer("lien https://nuage.fr/s/AbC123 refusé", &vide, None), "lien https://nuage.fr/s/… refusé");
        assert_eq!(nettoyer("GET http://192.168.1.20:9000/maitrize?cle=secret", &vide, None), "GET http://192.168.1.20:9000/maitrize?…");
        assert_eq!(nettoyer("le protocole http, rien d'autre", &vide, None), "le protocole http, rien d'autre");
    }

    #[test]
    fn une_erreur_repetee_ne_parait_qu_une_fois() {
        let journal = "20/10 10:00:00 DÉMARRAGE v1.6.32 macos aarch64\n\
                       20/10 10:00:05 ÉCHEC sync_deltas : délai 4.02s\n\
                       20/10 10:00:35 ÉCHEC sync_deltas : délai 4.11s\n\
                       20/10 10:01:00 ERREUR TypeError: x is undefined @ Organisation.tsx:12\n\
                       20/10 10:01:30 SESSION PRÉCÉDENTE COUPÉE (build de développement)\n\
                       20/10 10:02:00 ÉCHEC sync_deltas : délai 3.99s";
        let l = lignes_d_incident(journal);
        assert_eq!(l.len(), 2, "{l:?}");
        assert!(l[0].contains("TypeError"));
        assert!(l[1].ends_with("3.99s (×3)"), "{}", l[1]);
    }

    #[test]
    fn l_adresse_tient_dans_le_budget_et_garde_les_lignes_recentes() {
        let lignes: Vec<String> = (1..=200).map(|i| format!("20/10 10:00:00 ERREUR numéro {i} — détail")).collect();
        let (sujet, corps) = rediger("1.6.32", "windows x86_64", "20/10/2026 10:42", Some("TypeError"), &lignes, 1900);
        let url = adresse(&sujet, &corps);
        assert!(url.len() <= 1900, "{}", url.len());
        assert!(url.starts_with("mailto:contact@maitrize.com?subject=Maitrize%201.6.32"));
        assert!(corps.contains("numéro 200"), "la plus récente reste");
        assert!(!corps.contains("numéro 1 —"), "les plus anciennes tombent");
        assert!(corps.contains("Problème : TypeError"));
        assert!(url.contains("%0D%0A"), "les retours à la ligne sont ceux d'un e-mail");
        assert!(!url.contains(' '));
    }

    #[test]
    fn la_session_d_avant_dit_son_plantage_une_seule_fois() {
        let journal = "19/10 09:00:00 DÉMARRAGE v1.6.31 macos aarch64\n\
                       19/10 09:30:00 FIGÉ la fenêtre ne répond plus depuis 10 s\n\
                       20/10 08:00:00 SESSION PRÉCÉDENTE INTERROMPUE (plantage, arrêt forcé ou coupure)\n\
                       20/10 08:00:00 DÉMARRAGE v1.6.32 macos aarch64";
        let (phrase, cle) = incident_precedent(journal).unwrap();
        assert!(phrase.contains("figée"));
        assert_eq!(cle, "19/10 09:00:00");
        // Une session sans histoire : rien à dire.
        assert_eq!(incident_precedent("19/10 09:00:00 DÉMARRAGE v1\n19/10 18:00:00 ARRÊT\n20/10 08:00:00 DÉMARRAGE v1"), None);
        // Le seul arrêt d'un build de développement n'est pas un plantage.
        assert_eq!(incident_precedent("19/10 09:00:00 DÉMARRAGE v1\n20/10 08:00:00 SESSION PRÉCÉDENTE COUPÉE (build de développement)\n20/10 08:00:00 DÉMARRAGE v1"), None);
        let brutal = "19/10 09:00:00 DÉMARRAGE v1\n20/10 08:00:00 SESSION PRÉCÉDENTE INTERROMPUE (plantage)\n20/10 08:00:00 DÉMARRAGE v1";
        assert!(incident_precedent(brutal).unwrap().0.contains("brutalement"));
    }
}
