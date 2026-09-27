//! Les commandes du dictaphone.
//!
//!
//! Ce téléphone ne connaît rien de la classe. Ni les élèves, ni le planning,
//! ni les séances : il enregistre du son et l'heure où il a été dit, et c'est
//! tout. Perdu dans un couloir, il ne trahit personne ; n'ayant rien à
//! renvoyer, il ne peut rien écraser non plus.
//!
//! C'est l'ordinateur qui sait ce qui se passait à 10 h 12, parce qu'il a le
//! cahier journal. Il transcrit sur place avec Whisper et range.
//!
//! Le dépôt part d'ici, en Rust, et non de la page : les règles réseau d'iOS
//! ne s'appliquent pas aux sockets, ce qui évite de déclarer une exception
//! pour parler en clair au Mac du réseau local.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

type R<T> = Result<T, String>;

/// Un enregistrement qui attend son ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Vocal {
    pub id: String,
    /// Quand l'enregistrement a commencé, en heure locale (« 2026-09-25T10:12:00 »).
    pub debut: String,
    pub duree_s: f64,
    /// Ce qu'il pèse, pour le dire à l'écran.
    pub octets: u64,
    /// Le créneau retenu au moment de dicter, vide si on n'en savait rien.
    #[serde(default)]
    pub creneau: String,
}

/// Où l'on garde les vocaux et l'adresse de l'ordinateur.
fn dossier(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Dossier de données introuvable : {e}"))?;
    std::fs::create_dir_all(d.join("vocaux")).map_err(|e| e.to_string())?;
    Ok(d)
}

fn fiche(app: &tauri::AppHandle) -> R<PathBuf> {
    Ok(dossier(app)?.join("ordinateur.txt"))
}

/// L'adresse du Mac, telle qu'on l'a appairée. Vide tant qu'on ne l'a pas.
#[tauri::command]
pub fn ordinateur_lire(app: tauri::AppHandle) -> R<String> {
    Ok(std::fs::read_to_string(fiche(&app)?).unwrap_or_default().trim().to_string())
}

/// Retient l'adresse du Mac : elle vaudra encore demain.
#[tauri::command]
pub fn ordinateur_ecrire(app: tauri::AppHandle, url: String) -> R<()> {
    std::fs::write(fiche(&app)?, url.trim()).map_err(|e| e.to_string())
}

/**
 * Garde un enregistrement, avant toute tentative d'envoi.
 *
 * On garde d'abord, on envoie ensuite : un vocal ne se perd pas parce que
 * l'ordinateur était éteint dans le sac. Le nom du fichier porte l'heure et
 * la durée, ce qui évite un index à tenir à jour — et à désynchroniser.
 */
#[tauri::command]
pub fn vocal_garder(
    app: tauri::AppHandle, debut: String, duree_s: f64, wav_b64: String, creneau: Option<String>,
) -> R<Vocal> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(wav_b64.as_bytes())
        .map_err(|e| format!("Enregistrement illisible : {e}"))?;
    if octets.len() < 100 {
        return Err("Enregistrement vide.".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let creneau = creneau.unwrap_or_default();
    let nom = format!("{}__{}__{:.3}__{creneau}.wav", id, debut.replace(':', "-"), duree_s);
    std::fs::write(dossier(&app)?.join("vocaux").join(&nom), &octets)
        .map_err(|e| format!("Écriture impossible : {e}"))?;
    Ok(Vocal { id, debut, duree_s, octets: octets.len() as u64, creneau })
}

/// Relit un nom de fichier : l'identifiant, l'heure, la durée, le créneau.
///
/// Les enregistrements d'avant le choix du créneau n'ont que trois parties :
/// ils restent lisibles, sans créneau.
fn depuis_le_nom(nom: &str) -> Option<(String, String, f64, String)> {
    let brut = nom.strip_suffix(".wav")?;
    let mut bouts = brut.split("__");
    let id = bouts.next()?.to_string();
    let debut = bouts.next()?.to_string();
    let duree = bouts.next()?.parse().ok()?;
    let creneau = bouts.next().unwrap_or_default().to_string();
    // L'heure a été écrite avec des tirets : « 10-12-00 » redevient « 10:12:00 ».
    let debut = match debut.split_once('T') {
        Some((jour, heure)) => format!("{jour}T{}", heure.replace('-', ":")),
        None => debut,
    };
    Some((id, debut, duree, creneau))
}

/// Ce qui attend, du plus ancien au plus récent.
#[tauri::command]
pub fn vocaux_liste(app: tauri::AppHandle) -> R<Vec<Vocal>> {
    let d = dossier(&app)?.join("vocaux");
    let mut sortie = Vec::new();
    let Ok(entrees) = std::fs::read_dir(&d) else { return Ok(sortie) };
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some((id, debut, duree_s, creneau)) = depuis_le_nom(&nom) else { continue };
        let octets = e.metadata().map(|m| m.len()).unwrap_or(0);
        sortie.push(Vocal { id, debut, duree_s, octets, creneau });
    }
    sortie.sort_by(|a, b| a.debut.cmp(&b.debut));
    Ok(sortie)
}

fn fichier_de(app: &tauri::AppHandle, id: &str) -> R<PathBuf> {
    let d = dossier(app)?.join("vocaux");
    let entrees = std::fs::read_dir(&d).map_err(|e| e.to_string())?;
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        if nom.starts_with(&format!("{id}__")) {
            return Ok(e.path());
        }
    }
    Err("Cet enregistrement n'est plus là.".into())
}

/**
 * Rend un vocal tel quel, pour l'écouter avant qu'il parte.
 *
 * On dicte en marchant, dans le bruit d'une classe : savoir si la phrase est
 * audible avant de rentrer vaut mieux que de le découvrir le soir, devant une
 * transcription vide. Le son ne quitte pas le téléphone pour autant.
 */
#[tauri::command]
pub fn vocal_lire(app: tauri::AppHandle, id: String) -> R<String> {
    use base64::Engine;
    let octets = std::fs::read(fichier_de(&app, &id)?).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(octets))
}

/// Oublie un vocal : le fichier part avec.
#[tauri::command]
pub fn vocal_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    let chemin = fichier_de(&app, &id)?;
    std::fs::remove_file(chemin).map_err(|e| e.to_string())
}

/**
 * Dépose un vocal sur l'ordinateur, et ne l'efface que s'il est arrivé.
 *
 * L'adresse gardée porte déjà le jeton : `http://192.168.x.x:8787/?t=…`. On en
 * reprend l'origine et le jeton pour bâtir l'adresse du dépôt.
 */
#[tauri::command]
pub async fn vocal_envoyer(app: tauri::AppHandle, id: String) -> R<()> {
    let base = ordinateur_lire(app.clone())?;
    if base.is_empty() {
        return Err("Aucun ordinateur appairé.".into());
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let chemin = fichier_de(&app, &id)?;
    let nom = chemin.file_name().unwrap_or_default().to_string_lossy().to_string();
    let (_, debut, duree, creneau) = depuis_le_nom(&nom).ok_or("Nom de fichier inattendu.")?;
    let octets = std::fs::read(&chemin).map_err(|e| e.to_string())?;

    let url = format!(
        "{origine}/api/vocal?t={}&debut={}&duree={duree}&creneau={}",
        urlencode(&jeton),
        urlencode(&debut),
        urlencode(&creneau)
    );
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let reponse = client
        .post(&url)
        .body(octets)
        .send()
        .await
        .map_err(|_| "L'ordinateur ne répond pas.".to_string())?;
    if !reponse.status().is_success() {
        return Err(format!("L'ordinateur a refusé ({}).", reponse.status()));
    }
    std::fs::remove_file(&chemin).map_err(|e| e.to_string())
}

// ── Les créneaux du jour ──────────────────────────────────────────────────
//
// Le téléphone reste ignorant de la classe, à une exception près, demandée :
// savoir sous quoi il enregistre. « 10h12 » ne dit rien, « Numération » si —
// et l'heure seule se trompe quand on dicte en sortant de la salle, ou une
// heure plus tard en y repensant.
//
// Ce qu'il garde est donc un emploi du temps sans personne dedans : une heure
// et un intitulé, pour le jour même. Le fichier d'un autre jour est effacé au
// premier rafraîchissement : un téléphone perdu ne porte pas l'année.

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Creneau {
    pub id: String,
    pub debut: String,
    pub fin: String,
    #[serde(default)]
    pub matiere: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Journee {
    pub jour: String,
    pub creneaux: Vec<Creneau>,
}

fn fiche_creneaux(app: &tauri::AppHandle) -> R<PathBuf> {
    Ok(dossier(app)?.join("creneaux.json"))
}

/// Les créneaux gardés, s'ils sont bien ceux du jour demandé.
#[tauri::command]
pub fn creneaux_du_jour(app: tauri::AppHandle, jour: String) -> R<Vec<Creneau>> {
    let brut = std::fs::read_to_string(fiche_creneaux(&app)?).unwrap_or_default();
    let Ok(journee) = serde_json::from_str::<Journee>(&brut) else { return Ok(Vec::new()) };
    Ok(if journee.jour == jour { journee.creneaux } else { Vec::new() })
}

/// Redemande les créneaux à l'ordinateur, et remplace ce qu'on avait.
#[tauri::command]
pub async fn creneaux_rafraichir(app: tauri::AppHandle, jour: String) -> R<Vec<Creneau>> {
    let base = ordinateur_lire(app.clone())?;
    if base.is_empty() {
        return Err("Aucun ordinateur appairé.".into());
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let url = format!("{origine}/api/creneaux?t={}&jour={}", urlencode(&jeton), urlencode(&jour));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;
    // Le corps se lit en texte puis se décode ici : la fonctionnalité `json`
    // de reqwest n'est pas activée, et une dépendance de plus sur iPhone se
    // paie à chaque compilation.
    let corps = client
        .get(&url)
        .send()
        .await
        .map_err(|_| "L'ordinateur ne répond pas.".to_string())?
        .text()
        .await
        .map_err(|e| format!("Réponse illisible : {e}"))?;
    let journee: Journee =
        serde_json::from_str(&corps).map_err(|e| format!("Réponse inattendue : {e}"))?;
    // On n'en garde qu'un jour : celui-ci remplace le précédent.
    std::fs::write(
        fiche_creneaux(&app)?,
        serde_json::to_string(&journee).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(journee.creneaux)
}

/// Les minutes depuis minuit d'un « 09:30 », ou -1.
fn en_minutes(hhmm: &str) -> i64 {
    let mut bouts = hhmm.split(':');
    match (bouts.next().and_then(|h| h.parse::<i64>().ok()),
           bouts.next().and_then(|m| m.parse::<i64>().ok())) {
        (Some(h), Some(m)) => h * 60 + m,
        _ => -1,
    }
}

/**
 * Le créneau où l'on se trouve, à cette heure-là.
 *
 * La même règle que l'ordinateur : d'abord celui qui contient l'heure, sinon
 * le dernier fini dans la demi-heure — on enregistre souvent juste après, en
 * sortant. Au-delà, on ne devine pas : l'enseignant choisira.
 */
pub fn creneau_pour(heure_iso: &str, creneaux: &[Creneau], tolerance: i64) -> Option<String> {
    let heure = heure_iso.split_once('T')?.1;
    let minute = en_minutes(&heure[..heure.len().min(5)]);
    if minute < 0 {
        return None;
    }
    let mut tries: Vec<&Creneau> = creneaux.iter().collect();
    tries.sort_by_key(|c| en_minutes(&c.debut));
    if let Some(c) = tries.iter().find(|c| {
        let (d, f) = (en_minutes(&c.debut), en_minutes(&c.fin));
        d >= 0 && f >= 0 && d <= minute && minute < f
    }) {
        return Some(c.id.clone());
    }
    tries
        .iter()
        .rfind(|c| {
            let f = en_minutes(&c.fin);
            f >= 0 && f <= minute && minute - f <= tolerance
        })
        .map(|c| c.id.clone())
}

/// Le créneau de l'instant, tel que l'écran l'affiche.
#[tauri::command]
pub fn creneau_maintenant(app: tauri::AppHandle, heure_iso: String) -> R<String> {
    let jour = heure_iso.split('T').next().unwrap_or_default().to_string();
    let creneaux = creneaux_du_jour(app, jour)?;
    Ok(creneau_pour(&heure_iso, &creneaux, 30).unwrap_or_default())
}

// ── Les notes écrites ─────────────────────────────────────────────────────
//
// Tout ne se dicte pas : en réunion, dans un couloir, dans une salle où l'on
// ne va pas parler tout seul, on tape deux lignes. Elles suivent le même
// chemin qu'un vocal — gardées d'abord, déposées ensuite — et se rangent au
// créneau de l'heure. L'ordinateur n'a rien à transcrire : le texte est là.

/// Une note qui attend son ordinateur.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub debut: String,
    pub texte: String,
    #[serde(default)]
    pub creneau: String,
}

/// Au-delà, ce n'est plus une note prise en classe.
const NOTE_MAX: usize = 4000;

fn dossier_notes(app: &tauri::AppHandle) -> R<PathBuf> {
    let d = dossier(app)?.join("notes");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

/// Garde une note avant toute tentative d'envoi.
#[tauri::command]
pub fn note_garder(
    app: tauri::AppHandle, debut: String, texte: String, creneau: Option<String>,
) -> R<Note> {
    let texte = texte.trim().to_string();
    if texte.is_empty() {
        return Err("Note vide.".into());
    }
    if texte.len() > NOTE_MAX {
        return Err("Note trop longue.".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let creneau = creneau.unwrap_or_default();
    let nom = format!("{id}__{}__{creneau}.txt", debut.replace(':', "-"));
    std::fs::write(dossier_notes(&app)?.join(&nom), &texte)
        .map_err(|e| format!("Écriture impossible : {e}"))?;
    Ok(Note { id, debut, texte, creneau })
}

/// Relit le nom d'une note : l'identifiant et l'heure.
fn note_depuis_le_nom(nom: &str) -> Option<(String, String, String)> {
    let brut = nom.strip_suffix(".txt")?;
    let mut bouts = brut.split("__");
    let id = bouts.next()?.to_string();
    let debut = bouts.next()?;
    let creneau = bouts.next().unwrap_or_default().to_string();
    let debut = match debut.split_once('T') {
        Some((jour, heure)) => format!("{jour}T{}", heure.replace('-', ":")),
        None => debut.to_string(),
    };
    Some((id, debut, creneau))
}

/// Ce qui attend, du plus ancien au plus récent.
#[tauri::command]
pub fn notes_liste(app: tauri::AppHandle) -> R<Vec<Note>> {
    let mut sortie = Vec::new();
    let Ok(entrees) = std::fs::read_dir(dossier_notes(&app)?) else { return Ok(sortie) };
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some((id, debut, creneau)) = note_depuis_le_nom(&nom) else { continue };
        let texte = std::fs::read_to_string(e.path()).unwrap_or_default();
        sortie.push(Note { id, debut, texte, creneau });
    }
    sortie.sort_by(|a, b| a.debut.cmp(&b.debut));
    Ok(sortie)
}

fn note_fichier(app: &tauri::AppHandle, id: &str) -> R<PathBuf> {
    let entrees = std::fs::read_dir(dossier_notes(app)?).map_err(|e| e.to_string())?;
    for e in entrees.flatten() {
        if e.file_name().to_string_lossy().starts_with(&format!("{id}__")) {
            return Ok(e.path());
        }
    }
    Err("Cette note n'est plus là.".into())
}

/// Oublie une note : le fichier part avec.
#[tauri::command]
pub fn note_oublier(app: tauri::AppHandle, id: String) -> R<()> {
    std::fs::remove_file(note_fichier(&app, &id)?).map_err(|e| e.to_string())
}

/// Dépose une note sur l'ordinateur, et ne l'efface que si elle est arrivée.
#[tauri::command]
pub async fn note_envoyer(app: tauri::AppHandle, id: String) -> R<()> {
    let base = ordinateur_lire(app.clone())?;
    if base.is_empty() {
        return Err("Aucun ordinateur appairé.".into());
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let chemin = note_fichier(&app, &id)?;
    let nom = chemin.file_name().unwrap_or_default().to_string_lossy().to_string();
    let (_, debut, creneau) = note_depuis_le_nom(&nom).ok_or("Nom de fichier inattendu.")?;
    let texte = std::fs::read_to_string(&chemin).map_err(|e| e.to_string())?;

    let url = format!(
        "{origine}/api/note?t={}&debut={}&creneau={}",
        urlencode(&jeton), urlencode(&debut), urlencode(&creneau)
    );
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let reponse = client
        .post(&url)
        .body(texte)
        .send()
        .await
        .map_err(|_| "L'ordinateur ne répond pas.".to_string())?;
    if !reponse.status().is_success() {
        return Err(format!("L'ordinateur a refusé ({}).", reponse.status()));
    }
    std::fs::remove_file(&chemin).map_err(|e| e.to_string())
}

/// L'ordinateur est-il joignable ? Une question, une réponse, pas de dépôt.
#[tauri::command]
pub async fn ordinateur_joignable(app: tauri::AppHandle) -> R<bool> {
    let base = ordinateur_lire(app)?;
    if base.is_empty() {
        return Ok(false);
    }
    let (origine, jeton) = decouper_adresse(&base)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{origine}/api/bonjour?t={}", urlencode(&jeton));
    Ok(client.get(&url).send().await.map(|r| r.status().is_success()).unwrap_or(false))
}

/// Sépare l'origine du jeton dans l'adresse appairée.
pub fn decouper_adresse(url: &str) -> R<(String, String)> {
    // Une adresse arrive d'un collage : espaces, retours à la ligne, et
    // parfois sans « http:// » parce qu'iOS le masque quand on copie depuis
    // Safari. On accepte tout cela plutôt que d'envoyer l'enseignant retaper
    // quarante caractères sur un clavier de téléphone.
    let url: String = url.chars().filter(|c| !c.is_whitespace()).collect();
    let url = url.as_str();
    let sans = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))
        .unwrap_or(url);
    let (hote, reste) = match sans.split_once('/') {
        Some((h, r)) => (h, r),
        None => (sans, ""),
    };
    if hote.is_empty() {
        return Err("Adresse sans ordinateur.".into());
    }
    let jeton = reste
        .split(['?', '&'])
        .find_map(|p| p.strip_prefix("t="))
        .unwrap_or_default()
        .to_string();
    if jeton.is_empty() {
        return Err("Adresse sans jeton : rescannez le QR code.".into());
    }
    let schema = if url.starts_with("https://") { "https" } else { "http" };
    Ok((format!("{schema}://{hote}"), jeton))
}

/// Ce qu'il faut échapper dans une adresse, et rien de plus.
fn urlencode(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ':' => "%3A".to_string(),
            ' ' => "%20".to_string(),
            c => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{decouper_adresse, depuis_le_nom, urlencode};

    #[test]
    fn separe_l_origine_et_le_jeton() {
        let (o, j) = decouper_adresse("http://192.168.1.20:8787/?t=abc-123").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
    }

    #[test]
    fn accepte_une_adresse_collee_telle_quelle() {
        // Retours à la ligne et espaces ajoutés par le collage.
        let (o, j) = decouper_adresse("  http://192.168.1.20:8787/?t=abc-123\n").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
        // Sans schéma : Safari le masque quand on copie l'adresse.
        let (o, j) = decouper_adresse("192.168.1.20:8787/?t=abc-123").unwrap();
        assert_eq!(o, "http://192.168.1.20:8787");
        assert_eq!(j, "abc-123");
    }

    #[test]
    fn refuse_une_adresse_sans_jeton() {
        // Sans jeton, l'ordinateur répondrait « accès refusé » à chaque dépôt :
        // autant le dire au moment de l'appairage.
        assert!(decouper_adresse("http://192.168.1.20:8787/").is_err());
        assert!(decouper_adresse("192.168.1.20").is_err());
    }

    #[test]
    fn relit_le_nom_d_un_fichier() {
        let (id, debut, duree, creneau) =
            depuis_le_nom("abcd__2026-09-25T10-12-00__4.010__c7.wav").unwrap();
        assert_eq!(id, "abcd");
        // L'heure retrouve ses deux-points, que le système de fichiers refuse.
        assert_eq!(debut, "2026-09-25T10:12:00");
        assert!((duree - 4.01).abs() < 1e-6);
        assert_eq!(creneau, "c7");
        // Un enregistrement d'avant le choix du créneau reste lisible.
        let (_, _, _, sans) = depuis_le_nom("abcd__2026-09-25T10-12-00__4.010.wav").unwrap();
        assert_eq!(sans, "");
    }

    fn creneaux() -> Vec<super::Creneau> {
        let c = |id: &str, d: &str, f: &str, m: &str| super::Creneau {
            id: id.into(), debut: d.into(), fin: f.into(), matiere: m.into(),
        };
        vec![
            c("c1", "09:00", "10:00", "Numération"),
            c("c2", "10:00", "11:00", "Sport"),
            c("c3", "14:00", "15:00", "Arts"),
        ]
    }

    #[test]
    fn trouve_le_creneau_de_l_heure() {
        let cs = creneaux();
        let quand = |h: &str| super::creneau_pour(&format!("2026-09-25T{h}"), &cs, 30);
        assert_eq!(quand("09:30:00").as_deref(), Some("c1"));
        // La fin d'un créneau appartient au suivant.
        assert_eq!(quand("10:00:00").as_deref(), Some("c2"));
        // Juste après la sortie : le créneau qui vient de finir.
        assert_eq!(quand("11:20:00").as_deref(), Some("c2"));
        // Au-delà de la demi-heure, on ne devine plus.
        assert_eq!(quand("11:45:00"), None);
        // Avant le premier, et sur une heure illisible.
        assert_eq!(quand("07:00:00"), None);
        assert_eq!(super::creneau_pour("2026-09-25", &cs, 30), None);
        assert_eq!(super::creneau_pour("2026-09-25Tmidi", &cs, 30), None);
    }

    #[test]
    fn sans_creneau_connu_on_ne_devine_rien() {
        assert_eq!(super::creneau_pour("2026-09-25T09:30:00", &[], 30), None);
    }

    #[test]
    fn relit_le_nom_d_une_note() {
        let (id, debut, creneau) =
            super::note_depuis_le_nom("abcd__2026-09-25T10-12-00__c7.txt").unwrap();
        assert_eq!(id, "abcd");
        assert_eq!(debut, "2026-09-25T10:12:00");
        assert_eq!(creneau, "c7");
        // Une note d'avant le créneau reste lisible.
        assert_eq!(super::note_depuis_le_nom("abcd__2026-09-25T10-12-00.txt").unwrap().2, "");
        assert!(super::note_depuis_le_nom("abcd.txt").is_none());
        // Un vocal n'est pas une note : les deux dossiers ne se mélangent pas.
        assert!(super::note_depuis_le_nom("abcd__2026-09-25T10-12-00__4.010.wav").is_none());
    }

    #[test]
    fn un_nom_inattendu_ne_fait_pas_tomber_la_liste() {
        assert!(depuis_le_nom("truc.wav").is_none());
        assert!(depuis_le_nom(".DS_Store").is_none());
    }

    #[test]
    fn echappe_ce_qu_il_faut_dans_l_adresse() {
        assert_eq!(urlencode("2026-09-25T10:12:00"), "2026-09-25T10%3A12%3A00");
        assert_eq!(urlencode("abc-123"), "abc-123");
    }
}
