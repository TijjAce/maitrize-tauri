//! Les instantanés : l'état de toute l'application, heure par heure.
//!
//! L'enseignant veut pouvoir « revenir à un état précis de l'application »
//! (octobre 2026). La copie de chaque jour ne le permettait qu'au jour près,
//! et sur sept jours. Un instantané est la base entière, compressée (4 Mo pour
//! 28) : on en prend un par heure d'utilisation quand quelque chose a changé,
//! et l'on en garde de moins en moins en remontant le temps — tous ceux des
//! deux derniers jours, puis un par jour sur un mois, un par semaine sur six
//! mois, un par mois sur un an.
//!
//! Les fichiers joints n'y sont pas : ils ne changent jamais une fois écrits,
//! et un fichier effacé passe par la corbeille (voir `db::mettre_a_la_corbeille`).

use crate::db::Db;
use crate::retour::{etats_dans, EtatPasse};
use chrono::{Datelike, Duration, NaiveDateTime};
use rusqlite::Connection;
use std::collections::HashSet;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// La base, dans l'archive.
const ENTREE: &str = "maitrize.sqlite3";
/// Le motif des instantanés pris tout seuls, dans leur nom.
pub const MOTIF_AUTO: &str = "auto";
/// Le motif d'un instantané pris juste avant d'appliquer un gros lot reçu de l'autre ordinateur.
pub const MOTIF_AVANT_SYNCHRO: &str = "avant-synchro";
/// Au moins une heure entre deux instantanés.
const INTERVALLE_MINUTES: i64 = 60;
/// Réglage de ce poste : le numéro du journal au dernier instantané.
pub const CLE_MARQUE: &str = "instantaneMarque";

/// Le numéro du dernier changement, fait ici ou reçu de l'autre ordinateur :
/// il ne fait que croître, même quand le journal se replie.
pub fn marque(c: &Connection) -> i64 {
    c.query_row("SELECT seq FROM sqlite_sequence WHERE name = 'changements'", [], |r| r.get(0)).unwrap_or(0)
}

fn derniere_marque(c: &Connection) -> Option<i64> {
    c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [CLE_MARQUE], |r| r.get::<_, String>(0))
        .ok()
        .and_then(|v| v.parse().ok())
}

/// La date d'un état, telle que son nom la donne ; une copie d'un jour sans heure compte pour minuit.
pub fn quand(e: &EtatPasse) -> Option<NaiveDateTime> {
    NaiveDateTime::parse_from_str(&e.date, "%Y-%m-%dT%H:%M:%S")
        .ok()
        .or_else(|| chrono::NaiveDate::parse_from_str(&e.date, "%Y-%m-%d").ok().and_then(|d| d.and_hms_opt(0, 0, 0)))
}

/// Le nom de l'instantané pris à `maintenant`.
pub fn nom_auto(maintenant: NaiveDateTime) -> String {
    nom_d_instantane(MOTIF_AUTO, maintenant)
}

fn nom_d_instantane(motif: &str, maintenant: NaiveDateTime) -> String {
    format!("maitrize-{}-{motif}-{}.sqlite3.zip", maintenant.format("%Y-%m-%d"), maintenant.format("%H%M%S"))
}

/// Un instantané compressé — pris tout seul, ou avant un gros lot reçu — : la frise les garde et les éclaircit
/// ensemble.
fn est_auto(e: &EtatPasse) -> bool {
    (e.motif == MOTIF_AUTO || e.motif == MOTIF_AVANT_SYNCHRO) && e.nom.ends_with(".zip")
}

/// Un instantané est dû si quelque chose a changé depuis le dernier, et que
/// le dernier a au moins une heure.
fn du(c: &Connection, dossier: &Path, maintenant: NaiveDateTime) -> bool {
    if derniere_marque(c) == Some(marque(c)) {
        return false;
    }
    let dernier = etats_dans(dossier).into_iter().filter(est_auto).filter_map(|e| quand(&e)).max();
    dernier.is_none_or(|d| maintenant - d >= Duration::minutes(INTERVALLE_MINUTES))
}

/// Copie la base dans un fichier provisoire du dossier : le seul moment où il
/// faut tenir la base, un quart de seconde pour 28 Mo.
pub(crate) fn copier(c: &Connection, dossier: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dossier).map_err(|e| format!("Instantané impossible : {e}"))?;
    let brut = dossier.join(format!(".instantane-{}.sqlite3", uuid::Uuid::new_v4()));
    c.execute("VACUUM INTO ?1", [brut.to_string_lossy().as_ref()])
        .map_err(|e| format!("Instantané impossible : {e}"))?;
    Ok(brut)
}

/// Compresse la base `brut` en l'archive `nom`, relue avant d'être rangée :
/// une archive abîmée ne prend jamais la place de rien. `brut` reste.
pub(crate) fn compresser(brut: &Path, dossier: &Path, nom: &str) -> Result<(), String> {
    let fin = dossier.join(nom);
    if fin.exists() {
        return Err(format!("{nom} existe déjà"));
    }
    let partiel = dossier.join(format!(".{nom}.partiel"));
    let taille = std::fs::metadata(brut).map_err(|e| e.to_string())?.len();
    let ecrire = || -> Result<(), String> {
        let mut zip = zip::ZipWriter::new(std::fs::File::create(&partiel).map_err(|e| e.to_string())?);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .large_file(taille >= u32::MAX as u64);
        zip.start_file(ENTREE, options).map_err(|e| e.to_string())?;
        std::io::copy(&mut std::fs::File::open(brut).map_err(|e| e.to_string())?, &mut zip).map_err(|e| e.to_string())?;
        let mut f = zip.finish().map_err(|e| e.to_string())?;
        f.flush().map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
        Ok(())
    };
    let fait = ecrire().and_then(|_| {
        // Relire tout : le zip vérifie l'empreinte de ce qu'il rend.
        let lus = decompresser_vers(&partiel, &mut std::io::sink())?;
        if lus == taille { Ok(()) } else { Err(format!("archive relue incomplète ({lus} octets sur {taille})")) }
    }).and_then(|_| std::fs::rename(&partiel, &fin).map_err(|e| e.to_string()));
    if fait.is_err() {
        std::fs::remove_file(&partiel).ok();
    }
    fait
}

/// Recopie la base d'une archive dans `vers` ; rend le nombre d'octets.
fn decompresser_vers(archive: &Path, vers: &mut impl Write) -> Result<u64, String> {
    let mut a = zip::ZipArchive::new(std::fs::File::open(archive).map_err(|e| e.to_string())?)
        .map_err(|e| format!("archive illisible : {e}"))?;
    let mut entree = a.by_name(ENTREE).map_err(|e| format!("archive illisible : {e}"))?;
    let mut tampon = vec![0u8; 1 << 16];
    let mut total = 0u64;
    loop {
        let n = entree.read(&mut tampon).map_err(|e| format!("archive abîmée : {e}"))?;
        if n == 0 {
            return Ok(total);
        }
        vers.write_all(&tampon[..n]).map_err(|e| e.to_string())?;
        total += n as u64;
    }
}

/// Une base d'état prête à être attachée : la copie elle-même, ou sa base
/// décompressée dans un fichier provisoire, effacé quand on n'en a plus besoin.
pub struct BaseOuverte {
    pub chemin: PathBuf,
    provisoire: bool,
}

impl Drop for BaseOuverte {
    fn drop(&mut self) {
        if self.provisoire {
            std::fs::remove_file(&self.chemin).ok();
        }
    }
}

pub(crate) fn ouvrir(etat: &Path, provisoires: &Path) -> Result<BaseOuverte, String> {
    if !etat.to_string_lossy().ends_with(".zip") {
        return Ok(BaseOuverte { chemin: etat.to_path_buf(), provisoire: false });
    }
    std::fs::create_dir_all(provisoires).map_err(|e| e.to_string())?;
    let chemin = provisoires.join(format!(".etat-{}.sqlite3", uuid::Uuid::new_v4()));
    let base = BaseOuverte { chemin, provisoire: true };
    let mut f = std::fs::File::create(&base.chemin).map_err(|e| e.to_string())?;
    decompresser_vers(etat, &mut f).map_err(|e| format!("État illisible : {e}"))?;
    Ok(base)
}

/// Les instantanés automatiques à effacer : on garde tous ceux des deux
/// derniers jours, puis le plus récent de chaque jour sur un mois, de chaque
/// semaine sur six mois, de chaque mois sur un an.
pub(crate) fn a_effacer(etats: &[(String, NaiveDateTime)], maintenant: NaiveDateTime) -> Vec<String> {
    let mut tries: Vec<&(String, NaiveDateTime)> = etats.iter().collect();
    tries.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| b.0.cmp(&a.0)));
    let mut cases = HashSet::new();
    let mut effaces = Vec::new();
    for (nom, quand) in tries {
        let age = maintenant - *quand;
        let case = if age < Duration::hours(48) {
            continue;
        } else if age < Duration::days(30) {
            format!("jour {}", quand.date())
        } else if age < Duration::days(183) {
            let s = quand.iso_week();
            format!("semaine {}-{}", s.year(), s.week())
        } else if age < Duration::days(366) {
            format!("mois {}-{}", quand.year(), quand.month())
        } else {
            effaces.push(nom.clone());
            continue;
        };
        if !cases.insert(case) {
            effaces.push(nom.clone());
        }
    }
    effaces
}

/// Efface les instantanés que l'âge a rendus de trop, et les restes d'une
/// copie interrompue.
pub(crate) fn purger(dossier: &Path, maintenant: NaiveDateTime) {
    let auto: Vec<(String, NaiveDateTime)> = etats_dans(dossier).into_iter()
        .filter(est_auto)
        .filter_map(|e| quand(&e).map(|q| (e.nom, q)))
        .collect();
    for nom in a_effacer(&auto, maintenant) {
        std::fs::remove_file(dossier.join(nom)).ok();
    }
    if let Ok(entrees) = std::fs::read_dir(dossier) {
        for e in entrees.flatten() {
            let nom = e.file_name().to_string_lossy().to_string();
            if nom.starts_with(".instantane-") || (nom.starts_with(".maitrize-") && nom.ends_with(".partiel")) {
                std::fs::remove_file(e.path()).ok();
            }
        }
    }
    crate::db::purger_sauvegardes(dossier);
}

/// Les copies de chaque jour d'avant les instantanés — la base entière, 28 Mo
/// chacune — deviennent des instantanés : 4 Mo, et la même frise. Rend le
/// nombre de copies transformées ; une copie qui ne se compresse pas reste.
pub(crate) fn convertir_les_copies_du_jour(dossier: &Path) -> usize {
    let Ok(entrees) = std::fs::read_dir(dossier) else { return 0 };
    let mut faites = 0;
    for e in entrees.flatten() {
        let nom = e.file_name().to_string_lossy().to_string();
        let Some(jour) = nom.strip_prefix("maitrize-").and_then(|n| n.strip_suffix(".sqlite3")) else { continue };
        let Ok(date) = chrono::NaiveDate::parse_from_str(jour, "%Y-%m-%d") else { continue };
        // L'heure de la copie, si le fichier la garde ; sinon minuit.
        let heure = e.metadata().and_then(|m| m.modified()).ok()
            .map(|t| chrono::DateTime::<chrono::Local>::from(t).naive_local())
            .filter(|t| t.date() == date)
            .unwrap_or_else(|| date.and_hms_opt(0, 0, 0).unwrap_or_default());
        let cible = nom_auto(heure);
        if compresser(&e.path(), dossier, &cible).is_ok() {
            std::fs::remove_file(e.path()).ok();
            faites += 1;
        }
    }
    faites
}

/// Prend l'instantané dû, s'il l'est ; rend son nom.
pub fn prendre_si_du(db: &Db, dossier: &Path, maintenant: NaiveDateTime) -> Option<String> {
    let copie = {
        let c = db.lock();
        if !du(&c, dossier, maintenant) {
            return None;
        }
        copier_l_etat(&c, dossier)?
    };
    // La compression se fait base relâchée : on peut travailler pendant ce temps.
    ranger(db, copie, dossier, MOTIF_AUTO, maintenant)
}

/// La base copiée pour un instantané, pas encore compressée, et le numéro du journal à ce moment.
pub struct CopieDeLEtat {
    brut: PathBuf,
    marque: i64,
}

/// Copie la base pour un instantané — le seul moment où il faut la tenir.
fn copier_l_etat(c: &Connection, dossier: &Path) -> Option<CopieDeLEtat> {
    match copier(c, dossier) {
        Ok(brut) => Some(CopieDeLEtat { brut, marque: marque(c) }),
        Err(err) => {
            crate::commands::diag_ecrire(format!("INSTANTANÉ : {err}"));
            None
        }
    }
}

/// Avant d'appliquer un gros lot reçu de l'autre ordinateur, l'état d'ici — s'il a changé depuis le dernier
/// instantané : sinon, ce dernier le garde déjà. À ranger ensuite, base relâchée (`ranger`).
///
/// Une restauration de travers ou une vieille base, là-bas, se répand ici par la synchronisation : sans cet
/// instantané, l'état d'avant pouvait n'exister nulle part, le dernier datant de près d'une heure.
pub fn copier_avant_un_lot(c: &Connection, dossier: &Path) -> Option<CopieDeLEtat> {
    if derniere_marque(c) == Some(marque(c)) {
        return None;
    }
    copier_l_etat(c, dossier)
}

/// Compresse une copie en instantané `motif`, la range dans la frise et note sa marque ; rend son nom.
pub fn ranger(db: &Db, copie: CopieDeLEtat, dossier: &Path, motif: &str, maintenant: NaiveDateTime) -> Option<String> {
    let nom = nom_d_instantane(motif, maintenant);
    let fait = compresser(&copie.brut, dossier, &nom);
    std::fs::remove_file(&copie.brut).ok();
    match fait {
        Ok(()) => {
            db.lock().execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)", [CLE_MARQUE, &copie.marque.to_string()]).ok();
            purger(dossier, maintenant);
            Some(nom)
        }
        Err(err) => {
            crate::commands::diag_ecrire(format!("INSTANTANÉ {nom} : {err}"));
            None
        }
    }
}

// ── Réparer au démarrage ───────────────────────────────────────────────────
//
// « L'application revient même à un état passé si jamais il y a un problème »
// (l'enseignant, octobre 2026). Une base qui ne se lit plus empêchait même
// d'ouvrir la fenêtre : on la met de côté, jamais on ne l'efface, et l'on
// repart du plus récent état qui se lit.

/// Ce que le démarrage a dû réparer, à dire une fois la fenêtre ouverte.
static REPARATION: Mutex<Option<String>> = Mutex::new(None);

/// Le dossier où vont les bases mises de côté.
pub const DOSSIER_DE_COTE: &str = "Bases mises de côté";

/// Une erreur qui dit que le fichier lui-même est abîmé. Une base occupée
/// (l'application ouverte deux fois), un disque plein ou un droit refusé ne
/// sont pas des défauts de la base : on n'y touche pas.
fn abimee(e: &rusqlite::Error) -> bool {
    matches!(e.sqlite_error_code(), Some(rusqlite::ErrorCode::DatabaseCorrupt | rusqlite::ErrorCode::NotADatabase))
}

/// Le défaut de la base, si elle en a un sûr.
fn defaut(c: &Connection) -> Option<String> {
    c.busy_timeout(std::time::Duration::from_secs(5)).ok();
    match c.query_row("PRAGMA quick_check", [], |r| r.get::<_, String>(0)) {
        Ok(r) if r == "ok" => None,
        Ok(r) => Some(format!("abîmée ({r})")),
        Err(e) if abimee(&e) => Some(format!("illisible ({e})")),
        Err(_) => None,
    }
}

/// Une copie qui se lit entière.
fn lisible(chemin: &Path) -> bool {
    Connection::open(chemin).is_ok_and(|c| c.query_row("PRAGMA quick_check", [], |r| r.get::<_, String>(0)).is_ok_and(|r| r == "ok"))
}

/// Pourquoi la base ne peut pas servir telle quelle, s'il y a lieu. Une base
/// absente ou vide n'est un défaut que si des états existent : sans eux,
/// c'est un premier lancement.
fn defaut_de_la_base(chemin: &Path, il_y_a_des_etats: bool) -> Option<String> {
    let taille = std::fs::metadata(chemin).map(|m| m.len()).unwrap_or(0);
    if taille == 0 {
        return il_y_a_des_etats.then(|| "la base avait disparu".to_string());
    }
    match Connection::open(chemin) {
        Ok(c) => defaut(&c).map(|e| format!("la base était {e}")),
        Err(e) if abimee(&e) => Some(format!("la base était illisible ({e})")),
        Err(_) => None,
    }
}

/// « 20/10 à 08:56 », d'après la date d'un état.
fn date_en_clair(e: &EtatPasse) -> String {
    match quand(e) {
        Some(q) if e.date.len() > 10 => q.format("%d/%m à %H:%M").to_string(),
        Some(q) => q.format("%d/%m").to_string(),
        None => e.date.clone(),
    }
}

/// Si la base de `chemin` a disparu ou ne se lit plus : la met de côté dans
/// `de_cote` et la remplace par le plus récent état de `etats` qui se lit.
/// Rend ce qui a été fait, s'il y a eu quelque chose à faire.
pub(crate) fn reparer_si_besoin(chemin: &Path, etats: &Path, de_cote: &Path, provisoires: &Path) -> Option<String> {
    let liste = etats_dans(etats);
    let defaut = defaut_de_la_base(chemin, !liste.is_empty())?;
    // Mettre de côté, avec son journal d'écriture : rien ne s'efface.
    let horodatage = chrono::Local::now().format("%Y-%m-%d-%H%M%S");
    for suffixe in ["", "-wal", "-shm"] {
        let source = PathBuf::from(format!("{}{suffixe}", chemin.display()));
        if !source.exists() {
            continue;
        }
        let cible = de_cote.join(format!("maitrize-{horodatage}.sqlite3{suffixe}"));
        if std::fs::create_dir_all(de_cote).and_then(|_| std::fs::rename(&source, &cible)).is_err() {
            return Some(format!("{defaut}, et elle n'a pas pu être mise de côté : rien n'a été touché"));
        }
    }
    for e in &liste {
        let Ok(base) = ouvrir(&etats.join(&e.nom), provisoires) else { continue };
        if lisible(&base.chemin) && std::fs::copy(&base.chemin, chemin).is_ok() {
            return Some(format!("{defaut} : Maitrize est reparti de l'état du {}, et l'a gardée à part", date_en_clair(e)));
        }
    }
    Some(format!("{defaut}, et aucun état passé ne se lit : Maitrize repart d'une base vide, et l'a gardée à part"))
}

/// Retient ce que le démarrage a réparé, pour la fenêtre.
pub fn annoncer(texte: String) {
    if let Ok(mut r) = REPARATION.lock() {
        *r = Some(texte);
    }
}

/// Ce que le démarrage a réparé, une seule fois.
#[tauri::command]
pub fn reparation_annonce() -> Option<String> {
    REPARATION.lock().ok()?.take()
}

fn maintenant() -> NaiveDateTime {
    chrono::Local::now().naive_local()
}

/// Au démarrage, puis toutes les cinq minutes : l'instantané dû, s'il l'est.
pub fn surveiller(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let dossier = crate::db::sauvegardes_dir();
        let converties = convertir_les_copies_du_jour(&dossier);
        if converties > 0 {
            crate::commands::diag_ecrire(format!("INSTANTANÉS : {converties} copie(s) de jour compressée(s)"));
        }
        loop {
            let db = tauri::Manager::state::<Db>(&app);
            prendre_si_du(&db, &dossier, maintenant());
            std::thread::sleep(std::time::Duration::from_secs(300));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    fn dossier() -> PathBuf {
        let d = std::env::temp_dir().join(format!("maitrize-instantanes-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&d).unwrap();
        d
    }
    fn base(d: &Path) -> Db {
        let c = Connection::open(d.join("ici.sqlite3")).unwrap();
        crate::db::migrer_pour_test(&c);
        crate::journal::creer_table(&c);
        crate::journal::poser_declencheurs(&c, "A");
        Db(Mutex::new(c))
    }
    fn le(s: &str) -> NaiveDateTime {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M").unwrap()
    }
    fn auto(d: &Path) -> Vec<String> {
        etats_dans(d).into_iter().filter(est_auto).map(|e| e.nom).collect()
    }

    #[test]
    fn un_instantane_par_heure_et_seulement_quand_quelque_chose_a_change() {
        let d = dossier();
        let db = base(&d);
        let s = d.join("Sauvegardes");
        db.lock().execute("INSERT INTO projets (id, titre, date_creation) VALUES ('p1', 'Le potager', '2026-10-01')", []).unwrap();
        let premier = prendre_si_du(&db, &s, le("2026-10-20 09:00")).expect("le premier");
        // Rien n'a changé : pas d'autre instantané, même deux heures après.
        assert_eq!(prendre_si_du(&db, &s, le("2026-10-20 11:00")), None);
        db.lock().execute("UPDATE projets SET titre = 'Le jardin' WHERE id = 'p1'", []).unwrap();
        // Quelque chose a changé, mais le dernier n'a qu'une demi-heure.
        assert_eq!(prendre_si_du(&db, &s, le("2026-10-20 09:30")), None);
        let second = prendre_si_du(&db, &s, le("2026-10-20 10:05")).expect("une heure après");
        assert_eq!(auto(&s), vec![second.clone(), premier.clone()]);
        // L'instantané se rouvre : c'est la base d'alors.
        let ouverte = ouvrir(&s.join(&premier), &d).unwrap();
        let alors = Connection::open(&ouverte.chemin).unwrap();
        let titre: String = alors.query_row("SELECT titre FROM projets WHERE id = 'p1'", [], |r| r.get(0)).unwrap();
        assert_eq!(titre, "Le potager");
        let provisoire = ouverte.chemin.clone();
        drop(alors);
        drop(ouverte);
        assert!(!provisoire.exists(), "la base décompressée s'efface après usage");
        std::fs::remove_dir_all(&d).ok();
    }

    /// Avant un gros lot reçu de l'autre ordinateur : l'état d'ici, s'il a changé depuis le dernier instantané. Il
    /// entre dans la frise avec son motif, et compte comme un instantané pour l'heure qui suit.
    #[test]
    fn un_instantane_se_prend_avant_un_gros_lot_recu() {
        let d = dossier();
        let db = base(&d);
        let s = d.join("Sauvegardes");
        db.lock().execute("INSERT INTO projets (id, titre, date_creation) VALUES ('p1', 'Le potager', '2026-10-01')", []).unwrap();
        prendre_si_du(&db, &s, le("2026-10-20 09:00")).expect("le premier");
        // Rien n'a changé depuis : le dernier instantané garde déjà l'état d'ici.
        assert!(copier_avant_un_lot(&db.lock(), &s).is_none());
        db.lock().execute("UPDATE projets SET titre = 'Le jardin' WHERE id = 'p1'", []).unwrap();
        let copie = copier_avant_un_lot(&db.lock(), &s).expect("l'état d'ici a changé");
        // Le lot s'applique pendant que la copie attend d'être rangée.
        db.lock().execute("UPDATE projets SET titre = 'Reçu de là-bas' WHERE id = 'p1'", []).unwrap();
        let nom = ranger(&db, copie, &s, MOTIF_AVANT_SYNCHRO, le("2026-10-20 09:20")).expect("rangé");
        assert_eq!(nom, "maitrize-2026-10-20-avant-synchro-092000.sqlite3.zip");
        let etat = etats_dans(&s).into_iter().find(|e| e.nom == nom).unwrap();
        assert_eq!(etat.motif, "avant-synchro");
        let ouverte = ouvrir(&s.join(&nom), &d).unwrap();
        let titre: String = Connection::open(&ouverte.chemin).unwrap().query_row("SELECT titre FROM projets WHERE id = 'p1'", [], |r| r.get(0)).unwrap();
        assert_eq!(titre, "Le jardin", "l'état d'avant le lot");
        // Le lot appliqué compte comme un changement ; l'instantané de l'heure suivante viendra.
        assert_eq!(prendre_si_du(&db, &s, le("2026-10-20 10:00")), None, "moins d'une heure après");
        assert!(prendre_si_du(&db, &s, le("2026-10-20 10:25")).is_some());
        assert!(!std::fs::read_dir(&s).unwrap().flatten().any(|e| e.file_name().to_string_lossy().starts_with(".instantane-")));
        std::fs::remove_dir_all(&d).ok();
    }

    #[test]
    fn on_en_garde_de_moins_en_moins_en_remontant_le_temps() {
        let maintenant = le("2026-10-20 12:00");
        let mut etats = Vec::new();
        // Toutes les heures de 8 h à 17 h, chaque jour, sur quatorze mois.
        let mut jour = maintenant.date() - Duration::days(430);
        while jour <= maintenant.date() {
            for h in 8..=17 {
                let q = jour.and_hms_opt(h, 0, 0).unwrap();
                if q <= maintenant {
                    etats.push((nom_auto(q), q));
                }
            }
            jour += Duration::days(1);
        }
        let effaces: HashSet<String> = a_effacer(&etats, maintenant).into_iter().collect();
        let restent: Vec<NaiveDateTime> = etats.iter().filter(|(n, _)| !effaces.contains(n)).map(|(_, q)| *q).collect();
        let entre = |a: i64, b: i64| restent.iter().filter(|q| {
            let age = maintenant - **q;
            age >= Duration::days(a) && age < Duration::days(b)
        }).count();
        assert!(restent.iter().filter(|q| maintenant - **q < Duration::hours(48)).count() >= 20, "les deux derniers jours, heure par heure");
        assert_eq!(entre(3, 30), 27, "un par jour sur le mois");
        assert!((20..=23).contains(&entre(31, 183)), "un par semaine sur six mois : {}", entre(31, 183));
        assert!((5..=7).contains(&entre(184, 366)), "un par mois sur l'année : {}", entre(184, 366));
        assert_eq!(entre(366, 1000), 0, "rien au-delà d'un an");
        // Le plus récent de chaque jour reste : celui de 17 h.
        assert!(restent.contains(&le("2026-10-10 17:00")) && !restent.contains(&le("2026-10-10 16:00")));
        // Repasser ne change rien : ce qui reste est stable.
        let reste: Vec<(String, NaiveDateTime)> = etats.iter().filter(|(n, _)| !effaces.contains(n)).cloned().collect();
        assert!(a_effacer(&reste, maintenant).is_empty());
    }

    #[test]
    fn une_base_illisible_est_mise_de_cote_et_l_application_repart_du_dernier_etat_sain() {
        let d = dossier();
        let db = base(&d);
        let s = d.join("Sauvegardes");
        db.lock().execute("INSERT INTO projets (id, titre, date_creation) VALUES ('p1', 'Le potager', '2026-10-01')", []).unwrap();
        prendre_si_du(&db, &s, le("2026-10-20 09:00")).unwrap();
        drop(db);
        let chemin = d.join("ici.sqlite3");
        // Une base saine ne bouge pas.
        assert_eq!(reparer_si_besoin(&chemin, &s, &d.join("De côté"), &d), None);
        // Une base dont le début est écrasé ne se lit plus.
        let mut octets = std::fs::read(&chemin).unwrap();
        for o in octets.iter_mut().take(4096) {
            *o = 0x5a;
        }
        std::fs::write(&chemin, &octets).unwrap();
        let dit = reparer_si_besoin(&chemin, &s, &d.join("De côté"), &d).expect("une réparation");
        assert!(dit.contains("20/10 à 09:00"), "{dit}");
        let c = Connection::open(&chemin).unwrap();
        let titre: String = c.query_row("SELECT titre FROM projets WHERE id = 'p1'", [], |r| r.get(0)).unwrap();
        assert_eq!(titre, "Le potager");
        let gardees: Vec<_> = std::fs::read_dir(d.join("De côté")).unwrap().flatten().collect();
        assert!(!gardees.is_empty(), "la base abîmée est gardée");
        // Une base disparue revient aussi ; sans aucun état, c'est un premier lancement.
        drop(c);
        std::fs::remove_file(&chemin).unwrap();
        assert!(reparer_si_besoin(&chemin, &s, &d.join("De côté"), &d).is_some());
        assert!(chemin.exists());
        let vide = d.join("neuf");
        std::fs::create_dir_all(&vide).unwrap();
        assert_eq!(reparer_si_besoin(&vide.join("maitrize.sqlite3"), &vide.join("Sauvegardes"), &vide.join("De côté"), &d), None);
        std::fs::remove_dir_all(&d).ok();
    }

    #[test]
    fn les_copies_de_jour_deviennent_des_instantanes_et_une_archive_abimee_ne_remplace_rien() {
        let d = dossier();
        let db = base(&d);
        let s = d.join("Sauvegardes");
        std::fs::create_dir_all(&s).unwrap();
        let brut = copier(&db.lock(), &s).unwrap();
        std::fs::rename(&brut, s.join("maitrize-2026-10-19.sqlite3")).unwrap();
        std::fs::write(s.join("maitrize-2026-10-18-avant-import-101500.sqlite3"), b"x").unwrap();
        assert_eq!(convertir_les_copies_du_jour(&s), 1);
        let restent: Vec<String> = etats_dans(&s).into_iter().map(|e| e.nom).collect();
        assert!(restent.iter().any(|n| n.starts_with("maitrize-2026-10-19-auto-") && n.ends_with(".sqlite3.zip")), "{restent:?}");
        assert!(!restent.contains(&"maitrize-2026-10-19.sqlite3".to_string()));
        assert!(restent.contains(&"maitrize-2026-10-18-avant-import-101500.sqlite3".to_string()), "les copies de sécurité restent telles quelles");
        // Une archive tronquée ne se relit pas.
        let nom = restent.iter().find(|n| n.ends_with(".zip")).unwrap();
        let octets = std::fs::read(s.join(nom)).unwrap();
        std::fs::write(d.join("abimee.zip"), &octets[..octets.len() / 2]).unwrap();
        assert!(ouvrir(&d.join("abimee.zip"), &d).is_err());
        std::fs::remove_dir_all(&d).ok();
    }
}
