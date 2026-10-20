//! Copie du bureau sur l'ordinateur.
//!
//! Le bureau de Maitrize vit dans sa base et dans son dossier « Fichiers »,
//! sous des noms que seul Maitrize comprend. Cette copie en fait un vrai
//! dossier — sur le Bureau de l'ordinateur par défaut — où chaque dossier est
//! un dossier et chaque document un fichier qui s'ouvre d'un double-clic : si
//! les données de Maitrize venaient à manquer, le travail reste là.
//!
//! La fenêtre décrit ce que la copie doit contenir ; ce module l'applique. Il
//! ne détruit rien : un fichier remplacé, ou qui n'a plus sa place, part dans
//! « Anciennes versions/<date> », où il reste trois mois.

use crate::db::{fichiers_dir, Db};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Mutex;
use tauri::State;

type R<T> = Result<T, String>;

/// Le dossier créé dans l'emplacement choisi : tout le travail, rangé par parties.
pub const NOM_RACINE: &str = "Maitrize";
/// Le dossier d'avant, quand la copie ne couvrait que le plan de travail : il
/// devient « Maitrize/Plan de travail » (voir `migrer_ancienne_racine`).
const ANCIENNE_RACINE: &str = "Maitrize — copie du bureau";
/// Le plan de travail, dans le dossier de tout le travail.
pub const DOSSIER_PLAN: &str = "Plan de travail";
/// Les parties du dossier : chacune est gardée telle quelle si ses données manquent.
const PARTIES: &[&str] = &[DOSSIER_PLAN, "Élèves", "Organisation", "Cahier journal", "Ressources"];
pub const DOSSIER_ARCHIVES: &str = "Anciennes versions";
/// Le journal d'incidents, recopié à côté du travail : on le trouve sans ouvrir Maitrize.
pub const DOSSIER_INCIDENTS: &str = "Rapport d'incidents";
const FICHIER_INCIDENTS: &str = "Journal d'incidents.txt";
const MANIFESTE: &str = ".maitrize-copie.json";
const A_LIRE: &str = "À lire.txt";
/// Durée de conservation des anciennes versions.
const JOURS_ARCHIVES: i64 = 90;

/// Réglages propres à chaque ordinateur (voir `journal::REGLAGES_DU_POSTE`).
pub const CLE_ACTIVE: &str = "copieBureauActive";
pub const CLE_EMPLACEMENT: &str = "copieBureauEmplacement";

const TEXTE_A_LIRE: &str = "\u{feff}Le travail de Maitrize
======================

Ce dossier est une copie de sécurité de tout le travail rangé dans Maitrize,
en fichiers qui s'ouvrent sans l'application. Elle se tient à jour toute
seule sur cet ordinateur, quelques minutes après chaque modification.

- « Plan de travail » : le bureau de Maitrize, dossier pour dossier.
- « Élèves » : un dossier par élève, sa fiche et ses documents.
- « Organisation » : emploi du temps, progressions, programmation.
- « Cahier journal » : une page par semaine.
- « Ressources » : les documents du coffre.

Ces dossiers parlent d'élèves : si ce dossier est synchronisé (iCloud Drive,
OneDrive…), ils partent avec lui.

Dans le plan de travail :
- Chaque dossier du bureau est un dossier ici.
- Les documents déposés (PDF, Word, Excel, images…) sont recopiés tels quels.
- Les textes et les séquences sont des pages web (.html) : un double-clic les
  ouvre dans le navigateur, d'où l'on peut les lire et les imprimer.
- Les liens et les vidéos sont des raccourcis vers leur adresse.
- Un matériel qui contient plusieurs documents est un dossier à son nom.

Ce que vous modifiez ici ne revient pas dans Maitrize : c'est une copie. Un
fichier retouché ici reste tel quel ; si Maitrize en a ensuite une nouvelle
version, la vôtre est d'abord rangée dans « Anciennes versions ».

Rien n'est effacé sans filet : ce qui est supprimé, déplacé ou remplacé dans
Maitrize est rangé dans « Anciennes versions », à la date du jour, et y reste
trois mois.

« Rapport d'incidents » contient le journal des incidents de l'application,
tenu à jour tout seul : joignez-le à un message si quelque chose ne va pas.
Il note les erreurs, jamais ce que vous écrivez.
";

/// Un fichier que la copie doit contenir.
#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Entree {
    /// Chemin dans la copie, séparé par « / » : « Français/Lecture/Fiche.pdf ».
    pub chemin: String,
    /// Change quand le contenu change.
    pub empreinte: String,
    /// Un fichier de Maitrize à recopier tel quel…
    #[serde(default)]
    pub fichier: Option<String>,
    /// … ou le contenu à écrire, quand la fenêtre l'a fourni.
    #[serde(default)]
    pub contenu: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
struct Trace {
    empreinte: String,
    taille: u64,
    /// Date de modification du fichier écrit, en millisecondes.
    modifie: i64,
}

#[derive(Serialize, Deserialize, Default)]
struct Manifeste {
    #[serde(default)]
    fichiers: BTreeMap<String, Trace>,
    #[serde(default)]
    dossiers: BTreeSet<String>,
    #[serde(default)]
    derniere: Option<Bilan>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Bilan {
    pub date: String,
    pub fichiers: usize,
    pub ecrits: usize,
    pub archives: usize,
    pub erreurs: Vec<String>,
    /// Documents cités par le bureau mais absents de Maitrize (pas encore
    /// arrivés de l'autre ordinateur, ou perdus avant la copie) : rien à recopier.
    #[serde(default)]
    pub manquants: Vec<String>,
    /// Le système refuse l'écriture : sur Mac, l'accès au Bureau n'a pas été accordé.
    pub autorisation_refusee: bool,
}

#[derive(Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Preparation {
    /// Chemins dont la fenêtre doit fournir le contenu.
    pub a_ecrire: Vec<String>,
    /// Faux si la copie est déjà à jour : rien à envoyer.
    pub travail: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfoCopie {
    pub active: bool,
    /// Le dossier où est posée la copie (le dossier personnel, par défaut).
    pub emplacement: String,
    pub par_defaut: bool,
    /// Le service qui synchronise ce dossier, s'il y en a un : la copie part avec lui.
    pub synchronise: Option<String>,
    /// Le dossier de la copie elle-même.
    pub racine: String,
    pub derniere: Option<Bilan>,
}

// ── Chemins ────────────────────────────────────────────────────────────────

/// Un chemin relatif sûr : pas de remontée, pas de chemin absolu, rien qui
/// touche aux fichiers propres à la copie.
fn chemin_valide(chemin: &str) -> Option<PathBuf> {
    if chemin.is_empty() || chemin.contains('\\') || chemin.contains('\0') || chemin.starts_with('/') {
        return None;
    }
    let segments: Vec<&str> = chemin.split('/').collect();
    if segments.iter().any(|s| s.is_empty() || *s == "." || *s == ".." || s.contains(':')) {
        return None;
    }
    let premier = segments[0].to_lowercase();
    if [DOSSIER_ARCHIVES, MANIFESTE, A_LIRE, DOSSIER_INCIDENTS].iter().any(|r| r.to_lowercase() == premier) {
        return None;
    }
    Some(segments.iter().collect())
}

fn millis(t: std::time::SystemTime) -> i64 {
    t.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

fn trace_de(chemin: &Path, empreinte: &str) -> Option<Trace> {
    let m = std::fs::metadata(chemin).ok()?;
    Some(Trace { empreinte: empreinte.to_string(), taille: m.len(), modifie: m.modified().map(millis).unwrap_or(0) })
}

/// Le fichier est-il encore celui que la copie a écrit ?
fn intact(chemin: &Path, trace: &Trace) -> bool {
    match std::fs::metadata(chemin) {
        Ok(m) => m.is_file() && m.len() == trace.taille && m.modified().map(millis).unwrap_or(0) == trace.modifie,
        Err(_) => false,
    }
}

fn lire_manifeste(racine: &Path) -> Manifeste {
    std::fs::read_to_string(racine.join(MANIFESTE))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

fn ecrire_atomique(cible: &Path, octets: &[u8]) -> std::io::Result<()> {
    let nom = cible.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let temporaire = cible.with_file_name(format!(".{nom}.maitrize-tmp"));
    std::fs::write(&temporaire, octets)?;
    std::fs::rename(&temporaire, cible).inspect_err(|_| {
        std::fs::remove_file(&temporaire).ok();
    })
}

fn copier_atomique(source: &Path, cible: &Path) -> std::io::Result<()> {
    let nom = cible.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let temporaire = cible.with_file_name(format!(".{nom}.maitrize-tmp"));
    std::fs::copy(source, &temporaire)?;
    std::fs::rename(&temporaire, cible).inspect_err(|_| {
        std::fs::remove_file(&temporaire).ok();
    })
}

/// Un nom de fichier de Maitrize : un identifiant et une extension, rien d'autre.
fn nom_stocke_valide(nom: &str) -> bool {
    !nom.is_empty() && !nom.starts_with('.') && nom.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
}

/// Les images citées dans une page (`maitrize-fichier:<nom>`) y sont intégrées :
/// la page reste lisible seule, où qu'on la copie.
fn integrer_images(html: &str, fichiers: &Path) -> String {
    use base64::Engine;
    const MARQUE: &str = "maitrize-fichier:";
    let mut sortie = String::with_capacity(html.len());
    let mut reste = html;
    while let Some(i) = reste.find(MARQUE) {
        sortie.push_str(&reste[..i]);
        let apres = &reste[i + MARQUE.len()..];
        let fin = apres.find(|c: char| !(c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')).unwrap_or(apres.len());
        let nom = &apres[..fin];
        if !nom_stocke_valide(nom) {
            // Pas un nom de Maitrize : le texte reste tel quel.
            sortie.push_str(MARQUE);
            sortie.push_str(nom);
        } else if let Ok(octets) = std::fs::read(fichiers.join(nom)) {
            let ext = nom.rsplit('.').next().unwrap_or("png").to_lowercase();
            let genre = match ext.as_str() { "jpg" => "jpeg".to_string(), "svg" => "svg+xml".to_string(), autre => autre.to_string() };
            sortie.push_str(&format!("data:image/{genre};base64,{}", base64::engine::general_purpose::STANDARD.encode(octets)));
        }
        reste = &apres[fin..];
    }
    sortie.push_str(reste);
    sortie
}

/// Range un fichier dans « Anciennes versions/<date>/<chemin> », sans écraser
/// une version déjà rangée le même jour.
fn archiver(racine: &Path, relatif: &Path, maintenant: chrono::DateTime<chrono::Local>) -> std::io::Result<()> {
    let source = racine.join(relatif);
    let jour = racine.join(DOSSIER_ARCHIVES).join(maintenant.format("%Y-%m-%d").to_string());
    let mut cible = jour.join(relatif);
    if cible.exists() {
        let base = cible.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = cible.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        let heure = maintenant.format("%Hh%M").to_string();
        let mut n = 1;
        loop {
            let suffixe = if n == 1 { heure.clone() } else { format!("{heure} {n}") };
            let essai = cible.with_file_name(format!("{base} ({suffixe}){ext}"));
            if !essai.exists() {
                cible = essai;
                break;
            }
            n += 1;
        }
    }
    if let Some(parent) = cible.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::rename(&source, &cible).or_else(|_| {
        if source.is_dir() {
            return Err(std::io::Error::other("dossier"));
        }
        std::fs::copy(&source, &cible)?;
        std::fs::remove_file(&source)
    })
}

/// Les anciennes versions de plus de trois mois s'en vont.
fn purger_archives(racine: &Path, maintenant: chrono::DateTime<chrono::Local>) {
    let Ok(jours) = std::fs::read_dir(racine.join(DOSSIER_ARCHIVES)) else { return };
    let limite = maintenant.date_naive() - chrono::Duration::days(JOURS_ARCHIVES);
    for jour in jours.flatten() {
        let nom = jour.file_name().to_string_lossy().to_string();
        if let Ok(date) = chrono::NaiveDate::parse_from_str(&nom, "%Y-%m-%d") {
            if date < limite && jour.path().is_dir() {
                std::fs::remove_dir_all(jour.path()).ok();
            }
        }
    }
}

fn parents(relatif: &str) -> impl Iterator<Item = String> + '_ {
    relatif.match_indices('/').map(move |(i, _)| relatif[..i].to_string())
}

/// Retient une erreur d'écriture ; un refus du système est signalé à part.
fn noter(bilan: &mut Bilan, chemin: &str, err: &std::io::Error) {
    if err.kind() == std::io::ErrorKind::PermissionDenied {
        bilan.autorisation_refusee = true;
    }
    if bilan.erreurs.len() < 20 {
        bilan.erreurs.push(format!("{chemin} : {err}"));
    }
}

// ── Préparer, appliquer ────────────────────────────────────────────────────

/// Ce qu'il reste à faire pour que la copie corresponde au bureau.
fn preparer(racine: &Path, fichiers: &Path, entrees: &[Entree], dossiers: &[String]) -> Preparation {
    let manifeste = lire_manifeste(racine);
    let mut prep = Preparation::default();
    let voulus: BTreeSet<&str> = entrees.iter().map(|e| e.chemin.as_str()).collect();
    for e in entrees {
        let Some(relatif) = chemin_valide(&e.chemin) else { continue };
        // Un document absent de Maitrize ne relance pas la copie à chaque passage.
        if e.fichier.as_deref().is_some_and(|nom| !nom_stocke_valide(nom) || !fichiers.join(nom).is_file()) {
            continue;
        }
        // Un fichier retouché à la main dans la copie compte comme à jour tant
        // que Maitrize n'en a pas de nouvelle version.
        let a_jour = manifeste.fichiers.get(&e.chemin)
            .is_some_and(|t| t.empreinte == e.empreinte && racine.join(&relatif).is_file());
        if !a_jour {
            prep.travail = true;
            if e.fichier.is_none() {
                prep.a_ecrire.push(e.chemin.clone());
            }
        }
    }
    if manifeste.fichiers.keys().any(|c| !voulus.contains(c.as_str())) {
        prep.travail = true;
    }
    let tous: BTreeSet<String> = dossiers.iter().cloned()
        .chain(entrees.iter().flat_map(|e| parents(&e.chemin).collect::<Vec<_>>()))
        .collect();
    if tous.iter().any(|d| chemin_valide(d).is_some_and(|p| !racine.join(p).is_dir()))
        || manifeste.dossiers.iter().any(|d| !tous.contains(d))
        || !racine.join(A_LIRE).is_file()
    {
        prep.travail = true;
    }
    prep
}

/// Met la copie en accord avec le bureau.
fn appliquer(racine: &Path, fichiers: &Path, entrees: &[Entree], dossiers: &[String], maintenant: chrono::DateTime<chrono::Local>) -> Bilan {
    let mut bilan = Bilan { date: maintenant.to_rfc3339(), ..Default::default() };
    if let Err(err) = std::fs::create_dir_all(racine) {
        noter(&mut bilan, &racine.to_string_lossy(), &err);
        return bilan;
    }
    let ancien = lire_manifeste(racine);
    let mut nouveau = Manifeste::default();

    // Un bureau vide alors que la copie ne l'est pas : des données absentes
    // (disque débranché, base neuve) plutôt qu'un bureau vidé. Rien ne bouge.
    if entrees.is_empty() && !ancien.fichiers.is_empty() {
        bilan.erreurs.push("Le bureau paraît vide : par précaution, la copie n'a rien retiré.".into());
        bilan.fichiers = ancien.fichiers.len();
        let garde = Manifeste { derniere: Some(bilan.clone()), ..ancien };
        if let Ok(octets) = serde_json::to_vec_pretty(&garde) {
            ecrire_atomique(&racine.join(MANIFESTE), &octets).ok();
        }
        return bilan;
    }

    // Les dossiers d'abord : un dossier vide du bureau existe aussi ici.
    let mut voulus_dossiers: BTreeSet<String> = BTreeSet::new();
    for d in dossiers.iter().cloned().chain(entrees.iter().flat_map(|e| parents(&e.chemin).collect::<Vec<_>>())) {
        if chemin_valide(&d).is_some() {
            voulus_dossiers.extend(parents(&d));
            voulus_dossiers.insert(d);
        }
    }

    let voulus: BTreeMap<&str, &Entree> = entrees.iter().map(|e| (e.chemin.as_str(), e)).collect();

    // Une partie (« Élèves », « Plan de travail »…) qui avait des fichiers et
    // n'en a plus aucun : des données absentes plutôt qu'une partie vidée.
    // Elle reste telle quelle, et rien d'une autre partie n'en dépend.
    let partie = |c: &str| c.split('/').next().unwrap_or_default().to_string();
    let parties_voulues: BTreeSet<String> = entrees.iter().map(|e| partie(&e.chemin)).collect();
    let parties_absentes: BTreeSet<String> = ancien.fichiers.keys().map(|c| partie(c))
        .filter(|p| PARTIES.contains(&p.as_str()) && !parties_voulues.contains(p)).collect();
    let garde = |c: &str| parties_absentes.contains(&partie(c));
    for p in &parties_absentes {
        bilan.erreurs.push(format!("« {p} » paraît vide : par précaution, la copie n'en a rien retiré."));
    }
    for (chemin, trace) in ancien.fichiers.iter().filter(|(c, _)| garde(c)) {
        nouveau.fichiers.insert(chemin.clone(), trace.clone());
    }
    voulus_dossiers.extend(ancien.dossiers.iter().filter(|d| garde(d)).cloned());

    // Un document rangé ailleurs ou renommé dans Maitrize est déplacé tel quel
    // dans la copie : ni recopié, ni rangé aux anciennes versions.
    let mut deplaces: BTreeSet<String> = BTreeSet::new();
    for (chemin, e) in &voulus {
        let Some(relatif) = chemin_valide(chemin) else { continue };
        let cible = racine.join(&relatif);
        if ancien.fichiers.contains_key(*chemin) || cible.exists() {
            continue;
        }
        // Jamais depuis une partie gardée : ses fichiers restent où ils sont.
        let depart = ancien.fichiers.iter().find(|(c, t)| {
            !voulus.contains_key(c.as_str()) && !deplaces.contains(*c) && !garde(c) && t.empreinte == e.empreinte
                && chemin_valide(c).is_some_and(|r| intact(&racine.join(r), t))
        });
        let Some((ancien_chemin, trace)) = depart else { continue };
        let Some(ancien_relatif) = chemin_valide(ancien_chemin) else { continue };
        let deplace = cible.parent().map_or(Ok(()), std::fs::create_dir_all)
            .and_then(|_| std::fs::rename(racine.join(ancien_relatif), &cible));
        if deplace.is_ok() {
            deplaces.insert(ancien_chemin.clone());
            nouveau.fichiers.insert(chemin.to_string(), Trace { ..trace.clone() });
        }
    }

    // Ce qui n'a plus sa place part aux anciennes versions — avant d'écrire,
    // pour qu'un fichier qui en remplace un autre trouve la place libre.
    for (chemin, trace) in &ancien.fichiers {
        if voulus.contains_key(chemin.as_str()) || deplaces.contains(chemin) || garde(chemin) {
            continue;
        }
        let Some(relatif) = chemin_valide(chemin) else { continue };
        let cible = racine.join(&relatif);
        if cible.is_file() {
            match archiver(racine, &relatif, maintenant) {
                Ok(()) => bilan.archives += 1,
                Err(err) => {
                    noter(&mut bilan, chemin, &err);
                    nouveau.fichiers.insert(chemin.clone(), trace.clone());
                }
            }
        }
    }

    for d in &voulus_dossiers {
        if let Some(relatif) = chemin_valide(d) {
            let cible = racine.join(&relatif);
            // Un fichier porte le nom d'un dossier voulu : il s'écarte.
            if cible.is_file() {
                if let Err(err) = archiver(racine, &relatif, maintenant) {
                    noter(&mut bilan, d, &err);
                    continue;
                }
                bilan.archives += 1;
            }
            if let Err(err) = std::fs::create_dir_all(&cible) {
                noter(&mut bilan, d, &err);
            }
        }
    }

    for (chemin, e) in &voulus {
        let Some(relatif) = chemin_valide(chemin) else {
            bilan.erreurs.push(format!("{chemin} : chemin refusé"));
            continue;
        };
        bilan.fichiers += 1;
        let cible = racine.join(&relatif);
        if nouveau.fichiers.get(*chemin).is_some_and(|t| t.empreinte == e.empreinte && intact(&cible, t)) {
            continue;
        }
        if let Some(t) = ancien.fichiers.get(*chemin) {
            if t.empreinte == e.empreinte && intact(&cible, t) {
                nouveau.fichiers.insert(chemin.to_string(), t.clone());
                continue;
            }
            // Retouché à la main dans la copie alors que Maitrize n'a rien de
            // plus récent : la version de l'enseignant reste en place.
            if t.empreinte == e.empreinte && cible.is_file() {
                if let Some(retouche) = trace_de(&cible, &e.empreinte) {
                    nouveau.fichiers.insert(chemin.to_string(), retouche);
                }
                continue;
            }
        }
        // Le nouveau contenu, recopié ou écrit.
        let octets: Option<Vec<u8>> = match (&e.fichier, &e.contenu) {
            (Some(nom), _) => {
                if !nom_stocke_valide(nom) || !fichiers.join(nom).is_file() {
                    if bilan.manquants.len() < 20 {
                        bilan.manquants.push(chemin.to_string());
                    }
                    // On garde ce qui est déjà copié, s'il y en a.
                    if let Some(t) = ancien.fichiers.get(*chemin) {
                        nouveau.fichiers.insert(chemin.to_string(), t.clone());
                    }
                    continue;
                }
                None
            }
            (None, Some(contenu)) => Some(if contenu.contains("maitrize-fichier:") {
                integrer_images(contenu, fichiers).into_bytes()
            } else {
                contenu.clone().into_bytes()
            }),
            (None, None) => {
                // Contenu non fourni (la copie a changé entre deux passages) : au prochain.
                if let Some(t) = ancien.fichiers.get(*chemin) {
                    nouveau.fichiers.insert(chemin.to_string(), t.clone());
                }
                continue;
            }
        };
        if cible.is_dir() {
            bilan.erreurs.push(format!("{chemin} : un dossier porte déjà ce nom"));
            continue;
        }
        if cible.is_file() {
            // Déjà le bon contenu (copie reconstruite sans son registre) : on l'adopte.
            let identique = match (&octets, &e.fichier) {
                (Some(o), _) => std::fs::read(&cible).map(|x| x == *o).unwrap_or(false),
                (None, Some(nom)) => memes_fichiers(&fichiers.join(nom), &cible),
                _ => false,
            };
            if identique {
                if let Some(t) = trace_de(&cible, &e.empreinte) {
                    nouveau.fichiers.insert(chemin.to_string(), t);
                }
                continue;
            }
            match archiver(racine, &relatif, maintenant) {
                Ok(()) => bilan.archives += 1,
                Err(err) => {
                    noter(&mut bilan, chemin, &err);
                    continue;
                }
            }
        }
        if let Some(parent) = cible.parent() {
            if let Err(err) = std::fs::create_dir_all(parent) {
                noter(&mut bilan, chemin, &err);
                continue;
            }
        }
        let ecrit = match (&octets, &e.fichier) {
            (Some(o), _) => ecrire_atomique(&cible, o),
            (None, Some(nom)) => copier_atomique(&fichiers.join(nom), &cible),
            _ => continue,
        };
        match ecrit {
            Ok(()) => {
                bilan.ecrits += 1;
                if let Some(t) = trace_de(&cible, &e.empreinte) {
                    nouveau.fichiers.insert(chemin.to_string(), t);
                }
            }
            Err(err) => noter(&mut bilan, chemin, &err),
        }
    }

    // Les dossiers qui n'ont plus lieu d'être s'effacent s'ils sont vides —
    // jamais s'il y reste quelque chose.
    let mut a_retirer: Vec<String> = ancien.dossiers.iter()
        .filter(|d| !voulus_dossiers.contains(*d))
        .cloned()
        .chain(ancien.fichiers.keys().filter(|c| !voulus.contains_key(c.as_str()) && !garde(c)).flat_map(|c| parents(c).collect::<Vec<_>>()))
        .filter(|d| !voulus_dossiers.contains(d))
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    a_retirer.sort_by_key(|d| std::cmp::Reverse(d.matches('/').count()));
    for d in a_retirer {
        if let Some(relatif) = chemin_valide(&d) {
            std::fs::remove_dir(racine.join(relatif)).ok();
        }
    }
    nouveau.dossiers = voulus_dossiers;

    let a_lire = racine.join(A_LIRE);
    if std::fs::read_to_string(&a_lire).map(|t| t != TEXTE_A_LIRE).unwrap_or(true) {
        if let Err(err) = ecrire_atomique(&a_lire, TEXTE_A_LIRE.as_bytes()) {
            noter(&mut bilan, A_LIRE, &err);
        }
    }
    purger_archives(racine, maintenant);

    nouveau.derniere = Some(bilan.clone());
    match serde_json::to_vec_pretty(&nouveau) {
        Ok(octets) => {
            if let Err(err) = ecrire_atomique(&racine.join(MANIFESTE), &octets) {
                noter(&mut bilan, MANIFESTE, &err);
            }
        }
        Err(err) => bilan.erreurs.push(format!("{MANIFESTE} : {err}")),
    }
    bilan
}

/// Deux fichiers au contenu identique (tailles, puis octets par blocs).
fn memes_fichiers(a: &Path, b: &Path) -> bool {
    use std::io::Read;
    let (Ok(ma), Ok(mb)) = (std::fs::metadata(a), std::fs::metadata(b)) else { return false };
    if ma.len() != mb.len() {
        return false;
    }
    let (Ok(mut fa), Ok(mut fb)) = (std::fs::File::open(a), std::fs::File::open(b)) else { return false };
    let (mut ba, mut bb) = (vec![0u8; 64 * 1024], vec![0u8; 64 * 1024]);
    loop {
        let (Ok(na), Ok(nb)) = (fa.read(&mut ba), fb.read(&mut bb)) else { return false };
        if na != nb || ba[..na] != bb[..nb] {
            return false;
        }
        if na == 0 {
            return true;
        }
    }
}

// ── Réglages et commandes ──────────────────────────────────────────────────

fn reglage(db: &Db, cle: &str) -> String {
    db.lock()
        .query_row("SELECT valeur FROM settings WHERE cle=?1", [cle], |r| r.get::<_, String>(0))
        .unwrap_or_default()
}

/// Le dossier personnel par défaut : ni iCloud ni OneDrive ne le synchronisent
/// d'eux-mêmes, quand le Bureau l'est souvent — et la copie serait partie avec
/// lui sans qu'on y pense. Une copie déjà posée sur le Bureau y reste : on ne la
/// déplace pas sans le dire, les Réglages préviennent.
fn emplacement_par_defaut() -> PathBuf {
    let bureau = dirs::desktop_dir();
    if let Some(b) = bureau.as_ref().filter(|b| b.join(NOM_RACINE).join(MANIFESTE).is_file() || b.join(ANCIENNE_RACINE).is_dir()) {
        return b.clone();
    }
    dirs::home_dir().or(bureau).unwrap_or_else(std::env::temp_dir)
}

fn emplacement(db: &Db) -> (PathBuf, bool) {
    let choisi = reglage(db, CLE_EMPLACEMENT);
    if choisi.trim().is_empty() {
        (emplacement_par_defaut(), true)
    } else {
        (PathBuf::from(choisi.trim()), false)
    }
}

fn info(db: &Db) -> InfoCopie {
    retenir_les_noms(db);
    let (lieu, par_defaut) = emplacement(db);
    let racine = lieu.join(NOM_RACINE);
    let active = reglage(db, CLE_ACTIVE) != "non";
    if let Ok(mut r) = RACINE_ACTIVE.lock() {
        *r = active.then(|| racine.clone());
    }
    InfoCopie {
        active,
        emplacement: lieu.to_string_lossy().to_string(),
        par_defaut,
        synchronise: crate::db::service_de_synchro(&lieu).map(str::to_string),
        derniere: lire_manifeste(&racine).derniere,
        racine: racine.to_string_lossy().to_string(),
    }
}

/// Une seule copie à la fois : deux passages simultanés se disputeraient les fichiers.
static EN_COURS: Mutex<()> = Mutex::new(());

/// La copie d'avant devient « Maitrize/Plan de travail » : un renommage sur le
/// même disque, rien n'est recopié — dans iCloud, même un fichier retiré du
/// Mac se déplace sans être téléchargé. Ses anciennes versions et son rapport
/// d'incidents montent d'un cran ; son manifeste suit, ses chemins préfixés.
/// Rend vrai si quelque chose a été déplacé.
fn migrer_ancienne_racine(lieu: &Path) -> std::io::Result<bool> {
    let ancienne = lieu.join(ANCIENNE_RACINE);
    let racine = lieu.join(NOM_RACINE);
    let plan = racine.join(DOSSIER_PLAN);
    if !ancienne.is_dir() || racine.join(MANIFESTE).exists() || plan.exists() {
        return Ok(false);
    }
    std::fs::create_dir_all(&racine)?;
    std::fs::rename(&ancienne, &plan)?;
    for nom in [DOSSIER_ARCHIVES, DOSSIER_INCIDENTS] {
        if plan.join(nom).exists() && !racine.join(nom).exists() {
            std::fs::rename(plan.join(nom), racine.join(nom)).ok();
        }
    }
    std::fs::remove_file(plan.join(A_LIRE)).ok();
    let ancien = lire_manifeste(&plan);
    let prefixe = |c: &str| format!("{DOSSIER_PLAN}/{c}");
    let nouveau = Manifeste {
        fichiers: ancien.fichiers.iter().map(|(c, t)| (prefixe(c), t.clone())).collect(),
        dossiers: ancien.dossiers.iter().map(|d| prefixe(d)).chain(std::iter::once(DOSSIER_PLAN.to_string())).collect(),
        derniere: ancien.derniere,
    };
    let octets = serde_json::to_vec_pretty(&nouveau).map_err(std::io::Error::other)?;
    ecrire_atomique(&racine.join(MANIFESTE), &octets)?;
    std::fs::remove_file(plan.join(MANIFESTE)).ok();
    Ok(true)
}

/// Fait la migration avant un passage, et la note dans le journal.
fn migrer_si_besoin(racine: &Path) {
    let Some(lieu) = racine.parent() else { return };
    match migrer_ancienne_racine(lieu) {
        Ok(true) => crate::commands::diag_ecrire(format!("COPIE : « {ANCIENNE_RACINE} » devient « {NOM_RACINE}/{DOSSIER_PLAN} »")),
        Ok(false) => {}
        Err(err) => crate::commands::diag_ecrire(format!("COPIE : déplacement de « {ANCIENNE_RACINE} » impossible ({err})")),
    }
}

// ── Le rapport d'incidents, à côté du travail ─────────────────────────────
//
// Le journal d'incidents vit dans les données de Maitrize, qu'on n'ouvre pas.
// Il est recopié dans la copie du travail (demande de l'enseignant, octobre
// 2026) : au démarrage, après chaque copie, et quand un incident s'écrit — au
// plus une fois par minute, le reste attend la suivante.

/// Le dossier de la copie, retenu dès qu'on l'a lu : le journal s'écrit sans la base sous la main.
static RACINE_ACTIVE: Mutex<Option<PathBuf>> = Mutex::new(None);
/// Le dernier miroir, en secondes.
static DERNIER_MIROIR: AtomicI64 = AtomicI64::new(0);
/// Les mots des noms des élèves, retenus avec le dossier : le journal recopié
/// à côté du travail — sur un Bureau souvent synchronisé — les masque, comme
/// le rapport envoyé par e-mail ; un chemin d'erreur porte le nom d'un élève.
static MOTS_A_MASQUER: Mutex<Option<std::collections::HashSet<String>>> = Mutex::new(None);

fn retenir_les_noms(db: &Db) {
    let noms: Vec<String> = {
        let c = db.lock();
        let Ok(mut st) = c.prepare("SELECT nom FROM eleves") else { return };
        let Ok(lignes) = st.query_map([], |r| r.get::<_, String>(0)) else { return };
        lignes.flatten().collect()
    };
    if let Ok(mut m) = MOTS_A_MASQUER.lock() {
        *m = Some(crate::rapport::mots_des_noms(&noms));
    }
}

/// Le journal tel qu'il se recopie : sans les noms des élèves, le dossier de
/// l'utilisateur ni les adresses (voir `rapport::nettoyer`).
fn journal_masque(rapport: &str) -> String {
    let mots = MOTS_A_MASQUER.lock().ok().and_then(|m| m.clone()).unwrap_or_default();
    let maison = dirs::home_dir().map(|m| m.to_string_lossy().to_string());
    crate::rapport::nettoyer(rapport, &mots, maison.as_deref())
}

/// Écrit le rapport dans « Rapport d'incidents » s'il a changé ; vrai s'il a été écrit.
///
/// Le rapport commence par sa date : on compare ce qui suit, sans quoi
/// chaque passage réécrirait le même journal.
fn ecrire_rapport(racine: &Path, rapport: &str) -> bool {
    let corps = |r: &str| r.split_once("\n\n").map(|(_, c)| c.to_string()).unwrap_or_default();
    let dossier = racine.join(DOSSIER_INCIDENTS);
    let cible = dossier.join(FICHIER_INCIDENTS);
    if std::fs::read_to_string(&cible).map(|ancien| corps(&ancien) == corps(rapport)).unwrap_or(false) {
        return false;
    }
    std::fs::create_dir_all(&dossier).is_ok() && ecrire_atomique(&cible, rapport.as_bytes()).is_ok()
}

/// Recopie le journal d'incidents à côté du travail, si la copie est active.
///
/// `tout_de_suite` passe outre l'attente d'une minute. Un échec ne s'écrit pas
/// dans le journal : il recommencerait à chaque ligne.
pub fn miroir_incidents(tout_de_suite: bool) {
    let maintenant = chrono::Local::now().timestamp();
    if !tout_de_suite && maintenant - DERNIER_MIROIR.load(Ordering::Relaxed) < 60 {
        return;
    }
    let Some(racine) = RACINE_ACTIVE.lock().ok().and_then(|r| r.clone()) else { return };
    if !racine.is_dir() {
        return;
    }
    DERNIER_MIROIR.store(maintenant, Ordering::Relaxed);
    if let Ok(rapport) = crate::commands::diag_rapport(2000) {
        ecrire_rapport(&racine, &journal_masque(&rapport));
    }
}

/// Au démarrage : retenir où est la copie, et y recopier le journal.
pub fn au_demarrage(db: &Db) {
    info(db);
    miroir_incidents(true);
}

#[tauri::command(async)]
pub fn copie_bureau_info(db: State<Db>) -> R<InfoCopie> {
    Ok(info(&db))
}

#[tauri::command(async)]
pub fn copie_bureau_regler(db: State<Db>, active: bool, emplacement: Option<String>) -> R<InfoCopie> {
    if let Some(lieu) = emplacement.as_deref().map(str::trim).filter(|l| !l.is_empty()) {
        let chemin = Path::new(lieu);
        if !chemin.is_absolute() || !chemin.is_dir() {
            return Err("Choisissez un dossier existant.".into());
        }
        // Dans les données de Maitrize, la copie se recopierait elle-même.
        if chemin.starts_with(crate::db::data_dir()) {
            return Err("Ce dossier est celui des données de Maitrize : choisissez-en un autre.".into());
        }
    }
    {
        let c = db.lock();
        c.execute(
            "INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)",
            [CLE_ACTIVE, if active { "oui" } else { "non" }],
        ).map_err(|e| e.to_string())?;
        if let Some(lieu) = &emplacement {
            c.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)", [CLE_EMPLACEMENT, lieu.trim()])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(info(&db))
}

#[tauri::command]
pub async fn copie_bureau_preparer(db: State<'_, Db>, entrees: Vec<Entree>, dossiers: Vec<String>) -> R<Preparation> {
    let i = info(&db);
    if !i.active {
        return Ok(Preparation::default());
    }
    let racine = PathBuf::from(i.racine);
    tauri::async_runtime::spawn_blocking(move || {
        migrer_si_besoin(&racine);
        preparer(&racine, &fichiers_dir(), &entrees, &dossiers)
    })
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copie_bureau_appliquer(db: State<'_, Db>, entrees: Vec<Entree>, dossiers: Vec<String>) -> R<Bilan> {
    let i = info(&db);
    if !i.active {
        return Err("La copie du bureau est désactivée sur cet ordinateur.".into());
    }
    let racine = PathBuf::from(i.racine);
    tauri::async_runtime::spawn_blocking(move || {
        let Ok(_verrou) = EN_COURS.try_lock() else {
            return Err("Une copie est déjà en cours.".to_string());
        };
        migrer_si_besoin(&racine);
        let bilan = std::panic::catch_unwind(|| appliquer(&racine, &fichiers_dir(), &entrees, &dossiers, chrono::Local::now()))
            .map_err(|_| "La copie s'est interrompue.".to_string())?;
        if !bilan.erreurs.is_empty() {
            crate::commands::diag_ecrire(format!("COPIE BUREAU {} erreur(s) : {}", bilan.erreurs.len(), bilan.erreurs.join(" | ")));
        }
        miroir_incidents(true);
        Ok(bilan)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command(async)]
pub fn copie_bureau_ouvrir(db: State<Db>) -> R<()> {
    let racine = PathBuf::from(info(&db).racine);
    std::fs::create_dir_all(&racine).map_err(|e| e.to_string())?;
    tauri_plugin_opener::open_path(&racine, None::<&str>).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn le_rapport_d_incidents_se_recopie_a_cote_du_travail_sans_se_reecrire_pour_rien() {
        let racine = std::env::temp_dir().join(format!("maitrize-incidents-{}", uuid::Uuid::new_v4()));
        assert!(ecrire_rapport(&racine, "Rapport Maitrize — 20/10/2026 10:00\n\n20/10 09:59:00 ERREUR x"));
        let fichier = racine.join(DOSSIER_INCIDENTS).join(FICHIER_INCIDENTS);
        assert!(std::fs::read_to_string(&fichier).unwrap().contains("ERREUR x"));
        // Même journal, autre heure de rapport : rien à réécrire.
        assert!(!ecrire_rapport(&racine, "Rapport Maitrize — 20/10/2026 10:05\n\n20/10 09:59:00 ERREUR x"));
        assert!(ecrire_rapport(&racine, "Rapport Maitrize — 20/10/2026 10:06\n\n20/10 09:59:00 ERREUR x\n20/10 10:06:00 ERREUR y"));
        // Le bureau ne peut pas écrire dans ce dossier.
        assert!(chemin_valide("Rapport d'incidents/autre.txt").is_none());
        std::fs::remove_dir_all(&racine).ok();
    }

    #[test]
    fn le_journal_recopie_ne_garde_ni_les_noms_ni_le_dossier_personnel() {
        *MOTS_A_MASQUER.lock().unwrap() = Some(crate::rapport::mots_des_noms(&["Barnabé Quillévic".to_string()]));
        let maison = dirs::home_dir().unwrap().to_string_lossy().to_string();
        let ligne = format!("20/10 10:00:00 ERREUR COPIE : {maison}/Desktop/Maitrize/Élèves/Barnabé Quillévic/bilan.pdf illisible");
        let propre = journal_masque(&ligne);
        assert!(!propre.contains("Barnabé") && !propre.contains("Quillévic"), "{propre}");
        assert!(!propre.contains(&maison), "{propre}");
        assert!(propre.contains("bilan.pdf illisible"), "{propre}");
    }

    struct Bac {
        racine: PathBuf,
        fichiers: PathBuf,
    }
    impl Bac {
        fn nouveau(nom: &str) -> Bac {
            let base = std::env::temp_dir().join(format!("maitrize-copie-{nom}-{}", uuid::Uuid::new_v4()));
            let bac = Bac { racine: base.join("copie"), fichiers: base.join("Fichiers") };
            std::fs::create_dir_all(&bac.fichiers).unwrap();
            bac
        }
        fn stocker(&self, nom: &str, contenu: &[u8]) {
            std::fs::write(self.fichiers.join(nom), contenu).unwrap();
        }
        fn lire(&self, chemin: &str) -> Option<String> {
            std::fs::read_to_string(self.racine.join(chemin)).ok()
        }
        fn appliquer(&self, entrees: &[Entree], dossiers: &[&str], jour: &str) -> Bilan {
            let date = chrono::NaiveDateTime::parse_from_str(&format!("{jour} 10:00"), "%Y-%m-%d %H:%M").unwrap()
                .and_local_timezone(chrono::Local).unwrap();
            let dossiers: Vec<String> = dossiers.iter().map(|d| d.to_string()).collect();
            appliquer(&self.racine, &self.fichiers, entrees, &dossiers, date)
        }
        fn archives(&self, jour: &str) -> Vec<String> {
            let mut vus = vec![];
            fn parcourir(p: &Path, base: &Path, vus: &mut Vec<String>) {
                for e in std::fs::read_dir(p).into_iter().flatten().flatten() {
                    if e.path().is_dir() {
                        parcourir(&e.path(), base, vus);
                    } else {
                        vus.push(e.path().strip_prefix(base).unwrap().to_string_lossy().replace('\\', "/"));
                    }
                }
            }
            let base = self.racine.join(DOSSIER_ARCHIVES).join(jour);
            parcourir(&base, &base, &mut vus);
            vus.sort();
            vus
        }
    }
    impl Drop for Bac {
        fn drop(&mut self) {
            if let Some(base) = self.racine.parent() {
                std::fs::remove_dir_all(base).ok();
            }
        }
    }

    fn texte(chemin: &str, contenu: &str) -> Entree {
        Entree { chemin: chemin.into(), empreinte: format!("t-{contenu}"), fichier: None, contenu: Some(contenu.into()) }
    }

    #[test]
    fn l_ancienne_copie_devient_le_plan_de_travail_sans_rien_recopier() {
        let base = std::env::temp_dir().join(format!("maitrize-migration-{}", uuid::Uuid::new_v4()));
        let ancienne = base.join(ANCIENNE_RACINE);
        let fichiers = base.join("Fichiers");
        std::fs::create_dir_all(&fichiers).unwrap();
        // L'ancienne copie, écrite par l'ancienne version : chemins sans partie.
        appliquer(&ancienne, &fichiers, &[texte("Maths/Notes.html", "<p>notes</p>")], &["Maths".into()], chrono::Local::now());
        std::fs::create_dir_all(ancienne.join(DOSSIER_ARCHIVES).join("2026-10-01")).unwrap();
        std::fs::create_dir_all(ancienne.join(DOSSIER_INCIDENTS)).unwrap();

        assert!(migrer_ancienne_racine(&base).unwrap());
        let racine = base.join(NOM_RACINE);
        assert!(!ancienne.exists());
        assert!(racine.join(DOSSIER_PLAN).join("Maths/Notes.html").is_file());
        assert!(racine.join(DOSSIER_ARCHIVES).join("2026-10-01").is_dir(), "les anciennes versions montent d'un cran");
        assert!(racine.join(DOSSIER_INCIDENTS).is_dir());
        // Le passage suivant, aux chemins préfixés, ne réécrit rien.
        let bilan = appliquer(&racine, &fichiers, &[texte("Plan de travail/Maths/Notes.html", "<p>notes</p>")],
            &["Plan de travail/Maths".into()], chrono::Local::now());
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0));
        // Une seconde fois : rien à faire.
        assert!(!migrer_ancienne_racine(&base).unwrap());
        std::fs::remove_dir_all(&base).ok();
    }

    #[test]
    fn une_partie_dont_les_donnees_manquent_reste_telle_quelle() {
        let bac = Bac::nouveau("partie-absente");
        bac.appliquer(&[texte("Élèves/A/Fiche.html", "<p>A</p>"), texte("Plan de travail/Maths/N.html", "<p>n</p>")],
            &[], "2026-10-20");
        // Les élèves ne sont pas arrivés à ce passage : leur partie ne bouge pas.
        let bilan = bac.appliquer(&[texte("Plan de travail/Maths/N.html", "<p>n</p>")], &[], "2026-10-20");
        assert_eq!(bilan.archives, 0);
        assert!(bilan.erreurs.iter().any(|e| e.contains("Élèves")), "{:?}", bilan.erreurs);
        assert_eq!(bac.lire("Élèves/A/Fiche.html").as_deref(), Some("<p>A</p>"));
        // Un même document demandé hors de la partie gardée : il est recopié, pas pris à la partie.
        let bilan = bac.appliquer(&[texte("Plan de travail/Maths/N.html", "<p>n</p>"), texte("A/Fiche.html", "<p>A</p>")], &[], "2026-10-20");
        assert_eq!(bac.lire("Élèves/A/Fiche.html").as_deref(), Some("<p>A</p>"), "la partie gardée n'a pas bougé");
        assert_eq!(bac.lire("A/Fiche.html").as_deref(), Some("<p>A</p>"));
        assert_eq!(bilan.archives, 0);
        // Elle revient : tout est en ordre.
        let bilan = bac.appliquer(&[texte("Élèves/A/Fiche.html", "<p>A</p>"), texte("Plan de travail/Maths/N.html", "<p>n</p>")],
            &[], "2026-10-20");
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
    }
    fn fichier(chemin: &str, nom: &str) -> Entree {
        Entree { chemin: chemin.into(), empreinte: nom.into(), fichier: Some(nom.into()), contenu: None }
    }

    #[test]
    fn recopie_les_dossiers_et_les_documents_tels_quels() {
        let bac = Bac::nouveau("recopie");
        bac.stocker("a1b2.xlsx", b"classeur");
        let bilan = bac.appliquer(&[fichier("Maths/Suivi.xlsx", "a1b2.xlsx"), texte("Maths/Notes.html", "<p>notes</p>")],
            &["Maths", "Français/Lecture"], "2026-09-16");
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
        assert_eq!((bilan.fichiers, bilan.ecrits, bilan.archives), (2, 2, 0));
        assert_eq!(bac.lire("Maths/Suivi.xlsx").as_deref(), Some("classeur"));
        assert_eq!(bac.lire("Maths/Notes.html").as_deref(), Some("<p>notes</p>"));
        assert!(bac.racine.join("Français/Lecture").is_dir(), "un dossier vide existe aussi");
        assert!(bac.lire(A_LIRE).unwrap().contains("copie de sécurité"));
    }

    #[test]
    fn ne_reecrit_pas_ce_qui_est_a_jour() {
        let bac = Bac::nouveau("a-jour");
        bac.stocker("f1.pdf", b"pdf");
        let entrees = [fichier("Fiche.pdf", "f1.pdf")];
        bac.appliquer(&entrees, &[], "2026-09-16");
        let prep = preparer(&bac.racine, &bac.fichiers, &[Entree { contenu: None, ..entrees[0].clone() }], &[]);
        assert!(!prep.travail, "rien à faire");
        let bilan = bac.appliquer(&entrees, &[], "2026-09-16");
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0));
    }

    #[test]
    fn un_element_supprime_part_aux_anciennes_versions() {
        let bac = Bac::nouveau("supprime");
        bac.stocker("f1.pdf", b"fiche");
        bac.appliquer(&[fichier("Lecture/Fiche.pdf", "f1.pdf"), texte("Lecture/Notes.html", "v1")], &["Lecture"], "2026-09-16");
        // La fiche est rangée ailleurs, les notes sont supprimées, le dossier Lecture aussi.
        let bilan = bac.appliquer(&[fichier("Maths/Fiche.pdf", "f1.pdf")], &[], "2026-09-17");
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
        assert_eq!(bac.lire("Maths/Fiche.pdf").as_deref(), Some("fiche"));
        assert_eq!(bac.archives("2026-09-17"), vec!["Lecture/Notes.html"]);
        assert!(!bac.racine.join("Lecture").exists(), "le dossier vidé s'efface");
    }

    #[test]
    fn un_document_range_ailleurs_est_deplace_sans_copie_ni_archive() {
        let bac = Bac::nouveau("deplace");
        bac.stocker("f1.pdf", b"fiche");
        bac.stocker("f2.pdf", b"autre");
        bac.appliquer(&[fichier("Lecture/Fiche.pdf", "f1.pdf"), fichier("Lecture/Autre.pdf", "f2.pdf")], &[], "2026-09-16");
        let bilan = bac.appliquer(&[fichier("Maths/Géométrie/Fiche.pdf", "f1.pdf"), fichier("Lecture/Autre renommé.pdf", "f2.pdf")], &[], "2026-09-17");
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0));
        assert_eq!(bac.lire("Maths/Géométrie/Fiche.pdf").as_deref(), Some("fiche"));
        assert_eq!(bac.lire("Lecture/Autre renommé.pdf").as_deref(), Some("autre"));
        assert!(!bac.racine.join("Lecture/Fiche.pdf").exists());
        assert!(!bac.racine.join(DOSSIER_ARCHIVES).exists());
        let prep = preparer(&bac.racine, &bac.fichiers, &[fichier("Maths/Géométrie/Fiche.pdf", "f1.pdf"), fichier("Lecture/Autre renommé.pdf", "f2.pdf")], &[]);
        assert!(!prep.travail, "la copie est à jour après le déplacement");
    }

    #[test]
    fn un_document_absent_de_maitrize_n_est_pas_une_erreur_et_ne_relance_rien() {
        let bac = Bac::nouveau("absent");
        let entrees = [fichier("Fiche.pdf", "pas-encore-arrive.pdf"), texte("Notes.html", "notes")];
        let bilan = bac.appliquer(&entrees, &[], "2026-09-16");
        assert!(bilan.erreurs.is_empty(), "{:?}", bilan.erreurs);
        assert_eq!(bilan.manquants, vec!["Fiche.pdf"]);
        assert!(!preparer(&bac.racine, &bac.fichiers, &entrees, &[]).travail);
        // Le document arrive : la copie le prend au passage suivant.
        bac.stocker("pas-encore-arrive.pdf", b"fiche");
        assert!(preparer(&bac.racine, &bac.fichiers, &entrees, &[]).travail);
        bac.appliquer(&entrees, &[], "2026-09-16");
        assert_eq!(bac.lire("Fiche.pdf").as_deref(), Some("fiche"));
    }

    #[test]
    fn un_bureau_soudain_vide_ne_vide_pas_la_copie() {
        let bac = Bac::nouveau("vide");
        bac.stocker("f1.pdf", b"fiche");
        bac.appliquer(&[fichier("Lecture/Fiche.pdf", "f1.pdf")], &["Lecture"], "2026-09-16");
        let bilan = bac.appliquer(&[], &[], "2026-09-17");
        assert_eq!(bilan.erreurs.len(), 1);
        assert_eq!(bac.lire("Lecture/Fiche.pdf").as_deref(), Some("fiche"));
        assert!(!bac.racine.join(DOSSIER_ARCHIVES).exists());
        // Le bureau revient : rien n'est réécrit.
        let bilan = bac.appliquer(&[fichier("Lecture/Fiche.pdf", "f1.pdf")], &["Lecture"], "2026-09-18");
        assert_eq!((bilan.ecrits, bilan.archives, bilan.erreurs.len()), (0, 0, 0));
    }

    #[test]
    fn un_contenu_remplace_garde_sa_version_precedente() {
        let bac = Bac::nouveau("remplace");
        bac.appliquer(&[texte("Notes.html", "version 1")], &[], "2026-09-16");
        bac.appliquer(&[texte("Notes.html", "version 2")], &[], "2026-09-16");
        bac.appliquer(&[texte("Notes.html", "version 3")], &[], "2026-09-16");
        assert_eq!(bac.lire("Notes.html").as_deref(), Some("version 3"));
        let archives = bac.archives("2026-09-16");
        assert_eq!(archives.len(), 2, "{archives:?}");
        let contenus: BTreeSet<String> = archives.iter()
            .map(|a| std::fs::read_to_string(bac.racine.join(DOSSIER_ARCHIVES).join("2026-09-16").join(a)).unwrap())
            .collect();
        assert_eq!(contenus, ["version 1".to_string(), "version 2".to_string()].into_iter().collect());
    }

    #[test]
    fn un_fichier_retouche_dans_la_copie_est_garde_puis_range_avant_une_nouvelle_version() {
        let bac = Bac::nouveau("modifie");
        bac.appliquer(&[texte("Notes.html", "de Maitrize")], &[], "2026-09-16");
        std::fs::write(bac.racine.join("Notes.html"), "retouché à la main").unwrap();
        // Maitrize n'a rien changé : la retouche reste.
        let bilan = bac.appliquer(&[texte("Notes.html", "de Maitrize")], &[], "2026-09-16");
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0));
        assert_eq!(bac.lire("Notes.html").as_deref(), Some("retouché à la main"));
        let prep = preparer(&bac.racine, &bac.fichiers, &[texte("Notes.html", "de Maitrize")], &[]);
        assert!(!prep.travail);
        // Maitrize en a une nouvelle version : la retouche part d'abord aux anciennes versions.
        let bilan = bac.appliquer(&[texte("Notes.html", "nouvelle version")], &[], "2026-09-17");
        assert_eq!((bilan.ecrits, bilan.archives), (1, 1));
        assert_eq!(bac.lire("Notes.html").as_deref(), Some("nouvelle version"));
        assert_eq!(std::fs::read_to_string(bac.racine.join(DOSSIER_ARCHIVES).join("2026-09-17/Notes.html")).unwrap(), "retouché à la main");
    }

    #[test]
    fn une_copie_effacee_se_reconstruit_et_un_registre_perdu_n_archive_rien() {
        let bac = Bac::nouveau("reconstruit");
        bac.stocker("f1.pdf", b"fiche");
        let entrees = [fichier("A/Fiche.pdf", "f1.pdf"), texte("A/Notes.html", "notes")];
        bac.appliquer(&entrees, &[], "2026-09-16");
        std::fs::remove_file(bac.racine.join(MANIFESTE)).unwrap();
        let bilan = bac.appliquer(&entrees, &[], "2026-09-16");
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0), "les fichiers identiques sont repris tels quels");
        std::fs::remove_dir_all(&bac.racine).unwrap();
        let bilan = bac.appliquer(&entrees, &[], "2026-09-16");
        assert_eq!(bilan.ecrits, 2);
        assert_eq!(bac.lire("A/Fiche.pdf").as_deref(), Some("fiche"));
    }

    #[test]
    fn refuse_les_chemins_qui_sortent_de_la_copie() {
        for mauvais in ["../evasion.txt", "/etc/passwd", "A/../../x", "C:/x", "a\\b", "", "A//B",
                        "Anciennes versions/x.pdf", ".maitrize-copie.json", "à lire.txt"] {
            assert!(chemin_valide(mauvais).is_none(), "{mauvais}");
        }
        assert!(chemin_valide("Français/Lecture/Fiche (2).pdf").is_some());
        let bac = Bac::nouveau("chemins");
        let bilan = bac.appliquer(&[texte("../evasion.txt", "non")], &["../dehors"], "2026-09-16");
        assert_eq!(bilan.erreurs.len(), 1);
        assert!(!bac.racine.parent().unwrap().join("evasion.txt").exists());
        assert!(!bac.racine.parent().unwrap().join("dehors").exists());
    }

    #[test]
    fn integre_les_images_des_pages() {
        let bac = Bac::nouveau("images");
        bac.stocker("img-1.png", &[137, 80, 78, 71]);
        let bilan = bac.appliquer(&[texte("Séquence.html", "<img src=\"maitrize-fichier:img-1.png\"><img src=\"maitrize-fichier:absente.png\">")], &[], "2026-09-16");
        assert!(bilan.erreurs.is_empty());
        let page = bac.lire("Séquence.html").unwrap();
        assert!(page.contains("src=\"data:image/png;base64,iVBORw==\""), "{page}");
        assert!(page.contains("src=\"\""), "une image absente laisse une source vide");
        assert_eq!(integrer_images("maitrize-fichier:../../secret", &bac.fichiers), "maitrize-fichier:../../secret");
    }

    #[test]
    fn les_anciennes_versions_de_plus_de_trois_mois_s_en_vont() {
        let bac = Bac::nouveau("purge");
        std::fs::create_dir_all(bac.racine.join(DOSSIER_ARCHIVES).join("2026-01-02")).unwrap();
        std::fs::create_dir_all(bac.racine.join(DOSSIER_ARCHIVES).join("2026-08-01")).unwrap();
        std::fs::create_dir_all(bac.racine.join(DOSSIER_ARCHIVES).join("Mes notes")).unwrap();
        bac.appliquer(&[], &[], "2026-09-16");
        assert!(!bac.racine.join(DOSSIER_ARCHIVES).join("2026-01-02").exists());
        assert!(bac.racine.join(DOSSIER_ARCHIVES).join("2026-08-01").exists());
        assert!(bac.racine.join(DOSSIER_ARCHIVES).join("Mes notes").exists(), "seuls les dossiers datés");
    }

    #[test]
    fn un_contenu_non_fourni_ne_detruit_rien() {
        let bac = Bac::nouveau("non-fourni");
        bac.appliquer(&[texte("Notes.html", "v1")], &[], "2026-09-16");
        let sans = Entree { chemin: "Notes.html".into(), empreinte: "t-v2".into(), fichier: None, contenu: None };
        let bilan = bac.appliquer(&[sans], &[], "2026-09-16");
        assert_eq!((bilan.ecrits, bilan.archives), (0, 0));
        assert_eq!(bac.lire("Notes.html").as_deref(), Some("v1"));
        let prep = preparer(&bac.racine, &bac.fichiers, &[Entree { chemin: "Notes.html".into(), empreinte: "t-v2".into(), fichier: None, contenu: None }], &[]);
        assert_eq!(prep.a_ecrire, vec!["Notes.html"]);
    }
}
