//! Les bureaux communs : des dossiers partagés avec des collègues.
//!
//! Un bureau commun est un dossier de l'ordinateur, choisi par l'enseignant,
//! que son service de stockage — Nuage (apps.education.fr), OneDrive, Google
//! Drive, un Nextcloud… — partage et synchronise avec ses collègues. Maitrize
//! n'y fait que lire et écrire des fichiers. Le transport, les comptes, qui a
//! le droit d'y entrer : tout cela relève du service, où l'enseignant décide
//! de chaque partage, personne par personne. Maitrize ne garde aucune clé.
//!
//! Plusieurs bureaux communs peuvent coexister — l'équipe de l'IME, les
//! collègues de la circonscription, un binôme… Leur liste reste sur cet
//! ordinateur : le chemin du dossier partagé n'est pas le même sur un Mac et
//! sur un PC.
//!
//! Chaque commande désigne un bureau par son identifiant et un chemin
//! **relatif** à son dossier : rien ne peut lire ni écrire en dehors.

use crate::db::Db;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};
use tauri::State;

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

/// Le réglage qui garde la liste des bureaux communs de cet ordinateur.
pub const CLE_BUREAUX: &str = "bureauxCommuns";

/// Un bureau commun : un nom, et le dossier partagé qui le porte — sur cet
/// ordinateur, ou sur Nuage.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BureauCommun {
    pub id: String,
    pub nom: String,
    /// Le dossier sur cet ordinateur ; vide pour un bureau sur Nuage.
    #[serde(default)]
    pub chemin: String,
    /// Le dossier est-il là ? (le service de stockage peut ne pas l'avoir encore synchronisé)
    #[serde(default)]
    pub present: bool,
    /// « dossier » (cet ordinateur) ou « nuage » (connexion directe).
    #[serde(default = "sorte_dossier")]
    pub sorte: String,
    /// Nuage : l'adresse du serveur, l'identifiant, le dossier partagé.
    #[serde(default)]
    pub serveur: String,
    #[serde(default)]
    pub utilisateur: String,
    #[serde(default)]
    pub dossier_distant: String,
    /// Le chemin WebDAV de départ : les fichiers d'un compte, ou un lien partagé.
    #[serde(default)]
    pub base: String,
    /// Le mot de passe d'application. Il reste sur cet ordinateur : la liste
    /// des bureaux ne se synchronise pas, ne s'exporte pas, et l'interface ne
    /// le reçoit jamais (voir `communs_liste`).
    #[serde(default)]
    pub mot_de_passe: String,
}

fn sorte_dossier() -> String { "dossier".into() }

impl BureauCommun {
    /// Un bureau distant : un compte Nuage, ou un lien de partage.
    pub fn sur_nuage(&self) -> bool { self.sorte == "nuage" || self.sorte == "lien" }

    /// De quoi joindre Nuage, à partir de ce qui est enregistré.
    fn acces(&self) -> crate::webdav::Acces {
        crate::webdav::Acces {
            serveur: self.serveur.clone(),
            utilisateur: self.utilisateur.clone(),
            mot_de_passe: self.mot_de_passe.clone(),
            racine: self.dossier_distant.clone(),
            // Les bureaux d'avant les liens de partage n'ont pas de base écrite.
            base: if self.base.is_empty() { crate::webdav::base_compte(&self.utilisateur) } else { self.base.clone() },
        }
    }
}

/// Un élément d'un bureau commun : un dossier ou un fichier.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EntreeCommune {
    pub nom: String,
    /// Chemin relatif au bureau commun, avec des « / ».
    pub chemin: String,
    pub dossier: bool,
    pub octets: u64,
    /// Dernière modification, pour montrer ce qui vient d'arriver.
    pub modifie: String,
    /// Pour un dossier : combien d'éléments il contient.
    pub elements: usize,
}

fn lire_bureaux(db: &State<'_, Db>) -> Vec<BureauCommun> {
    let c = db.lock();
    serde_json::from_str(&crate::sync::get_setting(&c, CLE_BUREAUX)).unwrap_or_default()
}

fn ecrire_bureaux(db: &State<'_, Db>, liste: &[BureauCommun]) -> R<()> {
    let json = serde_json::to_string(liste).map_err(e)?;
    let c = db.lock();
    crate::sync::set_setting(&c, CLE_BUREAUX, &json)
}

/// Le bureau commun désigné, avec ce qu'il faut pour l'atteindre.
fn bureau_de(db: &State<'_, Db>, id: &str) -> R<BureauCommun> {
    lire_bureaux(db)
        .into_iter()
        .find(|b| b.id == id)
        .ok_or_else(|| "Bureau commun inconnu sur cet ordinateur.".to_string())
}

/// Le dossier d'un bureau commun, tel qu'il est sur le disque.
fn racine_de(b: &BureauCommun) -> R<PathBuf> {
    let p = PathBuf::from(&b.chemin);
    if !p.is_dir() {
        return Err(format!(
            "Le dossier de « {} » est introuvable : le service de stockage l'a-t-il synchronisé sur cet ordinateur ?",
            b.nom
        ));
    }
    p.canonicalize().map_err(e)
}

/// Le chemin relatif, vérifié, tel que Nuage l'attend.
fn relatif_sur(chemin: &str) -> R<String> {
    Ok(segments(chemin)?.join("/"))
}

/// Un chemin relatif sûr : pas de remontée, pas de chemin absolu, pas de
/// séparateur étranger. Seuls des noms simples, séparés par « / ».
pub fn segments(relatif: &str) -> R<Vec<String>> {
    let mut sortie = Vec::new();
    for seg in relatif.split('/').filter(|s| !s.is_empty()) {
        let refuse = seg == "." || seg == ".." || seg.contains('\\') || seg.contains(':')
            || seg.chars().any(|c| c.is_control());
        if refuse {
            return Err("Chemin refusé.".into());
        }
        sortie.push(seg.to_string());
    }
    Ok(sortie)
}

/// Le chemin, sous la racine, d'un élément désigné par son chemin relatif.
fn dans(racine: &Path, relatif: &str) -> R<PathBuf> {
    let mut p = racine.to_path_buf();
    for seg in segments(relatif)? {
        p.push(seg);
    }
    // Un lien symbolique ne doit pas faire sortir du dossier partagé : on
    // vérifie le plus proche ancêtre qui existe — le chemin lui-même, s'il
    // existe. Ce qui reste à créer dessous n'est fait que de noms simples.
    let existant = p.ancestors().find(|a| a.exists()).unwrap_or(racine);
    let verifie = existant.canonicalize().map_err(e)?;
    if !verifie.starts_with(racine) {
        return Err("Chemin refusé.".into());
    }
    Ok(p)
}

/// Ce qu'un service de synchronisation ou un système laisse traîner, et
/// qu'on ne montre pas : fichiers cachés, verrous, téléchargements en cours.
pub fn est_parasite(nom: &str) -> bool {
    let n = nom.to_lowercase();
    nom.starts_with('.') || nom.starts_with("~$") || n == "desktop.ini" || n == "thumbs.db"
        || n.ends_with(".part") || n.ends_with(".tmp") || n.ends_with(".crdownload")
        || n.ends_with(".icloud")
}

/// Un nom libre dans le dossier : « nom.ext », sinon « nom (2).ext »…
pub fn nom_libre(dossier: &Path, nom: &str) -> String {
    if !dossier.join(nom).exists() {
        return nom.to_string();
    }
    let (base, ext) = match nom.rfind('.') {
        Some(i) if i > 0 => (&nom[..i], &nom[i..]),
        _ => (nom, ""),
    };
    (2..)
        .map(|i| format!("{base} ({i}){ext}"))
        .find(|n| !dossier.join(n).exists())
        .unwrap_or_else(|| nom.to_string())
}

/// Un nom libre parmi ceux déjà pris : « nom.ext », sinon « nom (2).ext »…
pub fn nom_libre_parmi(pris: &[String], nom: &str) -> String {
    let existe = |n: &str| pris.iter().any(|x| x.eq_ignore_ascii_case(n));
    if !existe(nom) {
        return nom.to_string();
    }
    let (base, ext) = match nom.rfind('.') {
        Some(i) if i > 0 => (&nom[..i], &nom[i..]),
        _ => (nom, ""),
    };
    (2..)
        .map(|i| format!("{base} ({i}){ext}"))
        .find(|n| !existe(n))
        .unwrap_or_else(|| nom.to_string())
}

fn relatif(racine: &Path, p: &Path) -> String {
    p.strip_prefix(racine)
        .unwrap_or(p)
        .components()
        .filter_map(|c| match c { Component::Normal(s) => s.to_str(), _ => None })
        .collect::<Vec<_>>()
        .join("/")
}

/// Les éléments d'un dossier d'un bureau commun, dossiers d'abord puis par nom.
pub fn lister_dossier(racine: &Path, dossier: &Path) -> R<Vec<EntreeCommune>> {
    let mut sortie = Vec::new();
    for entree in std::fs::read_dir(dossier).map_err(e)?.flatten() {
        let nom = entree.file_name().to_string_lossy().to_string();
        if est_parasite(&nom) {
            continue;
        }
        // Les liens symboliques ne sont pas montrés : ils mènent ailleurs.
        let Ok(meta) = entree.metadata() else { continue };
        if meta.file_type().is_symlink() {
            continue;
        }
        let modifie = meta
            .modified()
            .ok()
            .map(|t| chrono::DateTime::<chrono::Local>::from(t).to_rfc3339())
            .unwrap_or_default();
        let elements = if meta.is_dir() {
            std::fs::read_dir(entree.path())
                .map(|it| it.flatten().filter(|x| !est_parasite(&x.file_name().to_string_lossy())).count())
                .unwrap_or(0)
        } else {
            0
        };
        sortie.push(EntreeCommune {
            chemin: relatif(racine, &entree.path()),
            nom,
            dossier: meta.is_dir(),
            octets: if meta.is_dir() { 0 } else { meta.len() },
            modifie,
            elements,
        });
    }
    sortie.sort_by(|a, b| b.dossier.cmp(&a.dossier).then_with(|| a.nom.to_lowercase().cmp(&b.nom.to_lowercase())));
    Ok(sortie)
}

/// Tous les fichiers d'un dossier, sous-dossiers compris, en chemins relatifs.
pub fn fichiers_du_dossier(racine: &Path, dossier: &Path) -> Vec<String> {
    let mut sortie = Vec::new();
    let mut a_voir = vec![dossier.to_path_buf()];
    while let Some(d) = a_voir.pop() {
        let Ok(it) = std::fs::read_dir(&d) else { continue };
        for x in it.flatten() {
            let nom = x.file_name().to_string_lossy().to_string();
            if est_parasite(&nom) {
                continue;
            }
            // Sans suivre les liens symboliques : un lien vers un dossier
            // parent ferait tourner en rond.
            let Ok(genre) = x.file_type() else { continue };
            if genre.is_dir() {
                a_voir.push(x.path());
            } else if genre.is_file() {
                sortie.push(relatif(racine, &x.path()));
            }
        }
    }
    sortie.sort();
    sortie
}

// ── Les commandes ─────────────────────────────────────────────────────────

/// Les bureaux communs de cet ordinateur.
#[tauri::command]
pub fn communs_liste(db: State<'_, Db>) -> R<Vec<BureauCommun>> {
    Ok(lire_bureaux(&db)
        .into_iter()
        .map(|mut b| {
            // Un bureau sur Nuage est « présent » tant que le réseau répond :
            // c'est chaque geste qui le dira, pas cette liste.
            b.present = if b.sur_nuage() { true } else { Path::new(&b.chemin).is_dir() };
            b.mot_de_passe = String::new();
            b
        })
        .collect())
}

/// Ajoute un bureau commun posé sur Nuage (ou un autre Nextcloud). La
/// connexion est essayée avant d'enregistrer quoi que ce soit : un identifiant
/// erroné se voit tout de suite, pas au premier dépôt.
#[tauri::command]
pub async fn commun_ajouter_nuage(
    db: State<'_, Db>, nom: String, serveur: String, utilisateur: String, mot_de_passe: String, dossier: String,
) -> R<BureauCommun> {
    let serveur = crate::webdav::serveur_propre(&serveur);
    if serveur.is_empty() || utilisateur.trim().is_empty() || mot_de_passe.trim().is_empty() {
        return Err("Il manque l'adresse de Nuage, l'identifiant ou le mot de passe d'application.".into());
    }
    let dossier_distant = segments(dossier.trim())?.join("/");
    let b = BureauCommun {
        id: uuid::Uuid::new_v4().to_string(),
        nom: if nom.trim().is_empty() {
            dossier_distant.rsplit('/').next().unwrap_or("Bureau commun").to_string()
        } else {
            nom.trim().to_string()
        },
        chemin: String::new(),
        present: true,
        sorte: "nuage".into(),
        serveur,
        utilisateur: utilisateur.trim().to_string(),
        dossier_distant,
        base: crate::webdav::base_compte(utilisateur.trim()),
        mot_de_passe: mot_de_passe.trim().to_string(),
    };
    crate::webdav::tester(&b.acces()).await?;
    let mut liste = lire_bureaux(&db);
    if liste.iter().any(|x| x.sur_nuage() && x.serveur == b.serveur && x.utilisateur == b.utilisateur && x.dossier_distant == b.dossier_distant) {
        return Err("Ce dossier de Nuage est déjà un de vos bureaux communs.".into());
    }
    liste.push(b.clone());
    ecrire_bureaux(&db, &liste)?;
    let mut vu = b;
    vu.mot_de_passe = String::new();
    Ok(vu)
}

/// Ajoute un bureau commun : un nom, et le dossier partagé choisi.
#[tauri::command]
pub fn commun_ajouter(db: State<'_, Db>, nom: String, chemin: String) -> R<BureauCommun> {
    let p = PathBuf::from(chemin.trim());
    if !p.is_dir() {
        return Err("Ce dossier n'existe pas sur cet ordinateur.".into());
    }
    // Le dossier des données de Maitrize n'est pas un dossier à partager.
    let donnees = crate::db::data_dir().canonicalize().unwrap_or_else(|_| crate::db::data_dir());
    let choisi = p.canonicalize().map_err(e)?;
    if choisi.starts_with(&donnees) || donnees.starts_with(&choisi) {
        return Err("Choisissez un dossier partagé, pas le dossier des données de Maitrize.".into());
    }
    let mut liste = lire_bureaux(&db);
    if liste.iter().any(|b| PathBuf::from(&b.chemin).canonicalize().ok().as_ref() == Some(&choisi)) {
        return Err("Ce dossier est déjà un de vos bureaux communs.".into());
    }
    let nom = if nom.trim().is_empty() {
        choisi.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "Bureau commun".into())
    } else {
        nom.trim().to_string()
    };
    let b = BureauCommun {
        id: uuid::Uuid::new_v4().to_string(),
        nom,
        chemin: choisi.to_string_lossy().to_string(),
        present: true,
        sorte: "dossier".into(),
        serveur: String::new(),
        utilisateur: String::new(),
        dossier_distant: String::new(),
        base: String::new(),
        mot_de_passe: String::new(),
    };
    liste.push(b.clone());
    ecrire_bureaux(&db, &liste)?;
    Ok(b)
}

/**
 * Ajoute un bureau commun ouvert par un **lien de partage** : le collègue n'a
 * besoin d'aucun compte, et personne ne donne son mot de passe. Le lien seul
 * — avec le mot de passe que le partage porte, s'il y en a un — suffit.
 */
#[tauri::command]
pub async fn commun_ajouter_lien(
    db: State<'_, Db>, nom: String, lien: String, mot_de_passe: String, dossier: String,
) -> R<BureauCommun> {
    let (serveur, jeton) = crate::webdav::lien_partage(&lien)?;
    let dossier_distant = segments(dossier.trim())?.join("/");
    let mut b = BureauCommun {
        id: uuid::Uuid::new_v4().to_string(),
        nom: if nom.trim().is_empty() { "Bureau partagé".into() } else { nom.trim().to_string() },
        chemin: String::new(),
        present: true,
        sorte: "lien".into(),
        serveur,
        utilisateur: jeton.clone(),
        dossier_distant,
        base: String::new(),
        mot_de_passe: mot_de_passe.trim().to_string(),
    };
    // Le serveur choisit son adresse : on garde celle qui a répondu.
    let bases = crate::webdav::bases_lien(&jeton);
    b.base = crate::webdav::base_qui_repond(&b.acces(), &bases).await?;
    let mut liste = lire_bureaux(&db);
    if liste.iter().any(|x| x.utilisateur == b.utilisateur && x.serveur == b.serveur && x.dossier_distant == b.dossier_distant) {
        return Err("Ce lien de partage est déjà un de vos bureaux communs.".into());
    }
    liste.push(b.clone());
    ecrire_bureaux(&db, &liste)?;
    let mut vu = b;
    vu.mot_de_passe = String::new();
    Ok(vu)
}

/**
 * Crée un lien de partage sur ce bureau commun, à donner à un collègue. Il
 * n'aura besoin d'aucun compte : le lien, et son mot de passe s'il en a un.
 */
#[tauri::command]
pub async fn commun_creer_lien(
    db: State<'_, Db>, bureau: String, mot_de_passe: String, ecriture: bool,
) -> R<String> {
    let b = bureau_de(&db, &bureau)?;
    if !b.sur_nuage() {
        return Err("Ce bureau commun est un dossier de cet ordinateur : le partage se fait dans votre service de stockage.".into());
    }
    crate::webdav::creer_lien(&b.acces(), &mot_de_passe, ecriture).await
}

/// Renomme un bureau commun dans Maitrize (le dossier, lui, garde son nom).
#[tauri::command]
pub fn commun_renommer(db: State<'_, Db>, id: String, nom: String) -> R<()> {
    let mut liste = lire_bureaux(&db);
    if let Some(b) = liste.iter_mut().find(|b| b.id == id) {
        if !nom.trim().is_empty() {
            b.nom = nom.trim().to_string();
        }
    }
    ecrire_bureaux(&db, &liste)
}

/// Oublie un bureau commun sur cet ordinateur. Le dossier partagé, et tout ce
/// qu'il contient, restent en place.
#[tauri::command]
pub fn commun_oublier(db: State<'_, Db>, id: String) -> R<()> {
    let liste: Vec<BureauCommun> = lire_bureaux(&db).into_iter().filter(|b| b.id != id).collect();
    ecrire_bureaux(&db, &liste)
}

/// Ce que contient un dossier d'un bureau commun ("" : sa racine).
#[tauri::command]
pub async fn commun_lister(db: State<'_, Db>, bureau: String, dossier: String) -> R<Vec<EntreeCommune>> {
    let b = bureau_de(&db, &bureau)?;
    if b.sur_nuage() {
        return crate::webdav::lister(&b.acces(), &relatif_sur(&dossier)?).await;
    }
    let r = racine_de(&b)?;
    let d = dans(&r, &dossier)?;
    if !d.is_dir() {
        return Err("Ce dossier n'est plus sur le bureau commun.".into());
    }
    lister_dossier(&r, &d)
}

/// Tous les fichiers d'un dossier du bureau commun, pour le récupérer entier.
#[tauri::command]
pub async fn commun_fichiers(db: State<'_, Db>, bureau: String, dossier: String) -> R<Vec<String>> {
    let b = bureau_de(&db, &bureau)?;
    if b.sur_nuage() {
        return crate::webdav::fichiers(&b.acces(), &relatif_sur(&dossier)?).await;
    }
    let r = racine_de(&b)?;
    let d = dans(&r, &dossier)?;
    Ok(fichiers_du_dossier(&r, &d))
}

/// Le contenu d'un fichier du bureau commun, en base64.
#[tauri::command]
pub async fn commun_lire(db: State<'_, Db>, bureau: String, chemin: String) -> R<String> {
    let b = bureau_de(&db, &bureau)?;
    if b.sur_nuage() {
        let octets = crate::webdav::lire(&b.acces(), &relatif_sur(&chemin)?).await?;
        return Ok(STANDARD.encode(octets));
    }
    let r = racine_de(&b)?;
    let p = dans(&r, &chemin)?;
    let octets = std::fs::read(&p).map_err(|_| "Ce fichier n'est plus sur le bureau commun.".to_string())?;
    Ok(STANDARD.encode(octets))
}

/// Pose un fichier sur le bureau commun, dans `dossier` (créé au besoin).
/// Sans `remplacer`, un nom déjà pris devient « nom (2) ». Rend le chemin écrit.
#[tauri::command]
pub async fn commun_ecrire(
    db: State<'_, Db>,
    bureau: String,
    dossier: String,
    nom: String,
    base64: String,
    remplacer: bool,
) -> R<String> {
    let b = bureau_de(&db, &bureau)?;
    let octets = STANDARD.decode(base64.trim()).map_err(|_| "Fichier illisible.".to_string())?;
    if b.sur_nuage() {
        let acces = b.acces();
        let d = relatif_sur(&dossier)?;
        let nom = segments(&nom)?.pop().ok_or_else(|| "Nom de fichier vide.".to_string())?;
        if !d.is_empty() {
            crate::webdav::creer_dossiers(&acces, &d).await?;
        }
        let nom = if remplacer {
            nom
        } else {
            // Un nom déjà pris devient « nom (2) » : on regarde ce qui est là.
            let pris: Vec<String> = crate::webdav::lister(&acces, &d).await.unwrap_or_default()
                .into_iter().map(|x| x.nom).collect();
            nom_libre_parmi(&pris, &nom)
        };
        let chemin = [d.as_str(), nom.as_str()].iter().filter(|x| !x.is_empty()).cloned().collect::<Vec<_>>().join("/");
        crate::webdav::ecrire(&acces, &chemin, octets).await?;
        return Ok(chemin);
    }
    let r = racine_de(&b)?;
    let d = dans(&r, &dossier)?;
    let nom = segments(&nom)?.pop().ok_or_else(|| "Nom de fichier vide.".to_string())?;
    std::fs::create_dir_all(&d).map_err(e)?;
    let nom = if remplacer { nom } else { nom_libre(&d, &nom) };
    let p = dans(&r, &format!("{dossier}/{nom}"))?;
    // Écrit à côté puis renomme : le service de synchronisation ne doit jamais
    // envoyer à vos collègues un fichier à moitié écrit.
    let provisoire = d.join(format!(".maitrize-{}.tmp", uuid::Uuid::new_v4()));
    std::fs::write(&provisoire, octets).map_err(e)?;
    std::fs::rename(&provisoire, &p).map_err(|err| {
        let _ = std::fs::remove_file(&provisoire);
        e(err)
    })?;
    Ok(relatif(&r, &p))
}

/// Crée un dossier sur le bureau commun. Rend son chemin.
#[tauri::command]
pub async fn commun_creer_dossier(db: State<'_, Db>, bureau: String, dossier: String, nom: String) -> R<String> {
    let b = bureau_de(&db, &bureau)?;
    if b.sur_nuage() {
        let acces = b.acces();
        let d = relatif_sur(&dossier)?;
        let nom = segments(&nom)?.pop().ok_or_else(|| "Nom de dossier vide.".to_string())?;
        let pris: Vec<String> = crate::webdav::lister(&acces, &d).await.unwrap_or_default()
            .into_iter().map(|x| x.nom).collect();
        let nom = nom_libre_parmi(&pris, &nom);
        let chemin = [d.as_str(), nom.as_str()].iter().filter(|x| !x.is_empty()).cloned().collect::<Vec<_>>().join("/");
        crate::webdav::creer_dossiers(&acces, &chemin).await?;
        return Ok(chemin);
    }
    let r = racine_de(&b)?;
    let d = dans(&r, &dossier)?;
    let nom = segments(&nom)?.pop().ok_or_else(|| "Nom de dossier vide.".to_string())?;
    let nom = nom_libre(&d, &nom);
    let p = dans(&r, &format!("{dossier}/{nom}"))?;
    std::fs::create_dir_all(&p).map_err(e)?;
    Ok(relatif(&r, &p))
}

/// Supprime un fichier ou un dossier du bureau commun — pour tout le monde.
/// L'interface le confirme ; le service de stockage en garde souvent une copie
/// dans sa corbeille (40 jours pour Nuage).
#[tauri::command]
pub async fn commun_supprimer(db: State<'_, Db>, bureau: String, chemin: String) -> R<()> {
    let b = bureau_de(&db, &bureau)?;
    if segments(&chemin)?.is_empty() {
        return Err("Le bureau commun lui-même ne se supprime pas d'ici.".into());
    }
    if b.sur_nuage() {
        return crate::webdav::supprimer(&b.acces(), &relatif_sur(&chemin)?).await;
    }
    let r = racine_de(&b)?;
    let p = dans(&r, &chemin)?;
    if p.is_dir() { std::fs::remove_dir_all(&p).map_err(e) } else { std::fs::remove_file(&p).map_err(e) }
}

/// Ouvre un fichier dans son application, ou un dossier dans le Finder ou l'Explorateur.
#[tauri::command]
pub async fn commun_ouvrir(db: State<'_, Db>, bureau: String, chemin: String) -> R<()> {
    let b = bureau_de(&db, &bureau)?;
    if b.sur_nuage() {
        let acces = b.acces();
        let relatif = relatif_sur(&chemin)?;
        let nom = relatif.rsplit('/').next().unwrap_or("").to_string();
        // Un dossier s'ouvre dans Nuage, sur le web ; un fichier se télécharge
        // et s'ouvre dans son application, en copie de travail.
        if nom.is_empty() || crate::webdav::est_dossier(&acces, &relatif).await.unwrap_or(false) {
            return tauri_plugin_opener::open_url(crate::webdav::url_web(&acces, &relatif), None::<&str>).map_err(e);
        }
        let octets = crate::webdav::lire(&acces, &relatif).await?;
        let dossier = std::env::temp_dir().join("maitrize-nuage");
        std::fs::create_dir_all(&dossier).map_err(e)?;
        let fichier = dossier.join(&nom);
        std::fs::write(&fichier, octets).map_err(e)?;
        return tauri_plugin_opener::open_path(&fichier, None::<&str>).map_err(e);
    }
    let r = racine_de(&b)?;
    let p = dans(&r, &chemin)?;
    tauri_plugin_opener::open_path(&p, None::<&str>).map_err(e)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dossier_d_essai() -> PathBuf {
        let d = std::env::temp_dir().join(format!("maitrize-commun-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&d).unwrap();
        d.canonicalize().unwrap()
    }

    #[test]
    fn rien_ne_sort_du_dossier_partage() {
        assert_eq!(segments("cycle 1/Maths").unwrap(), vec!["cycle 1", "Maths"]);
        assert!(segments("").unwrap().is_empty());
        assert!(segments("../Documents").is_err());
        assert!(segments("cycle 1/../../etc").is_err());
        assert!(segments("C:/Windows").is_err());
        assert!(segments("a\\..\\b").is_err());
        let r = dossier_d_essai();
        assert!(dans(&r, "cycle 1/fiche.pdf").unwrap().starts_with(&r));
        assert!(dans(&r, "../dehors").is_err());
        std::fs::remove_dir_all(&r).ok();
    }

    #[cfg(unix)]
    #[test]
    fn un_lien_symbolique_ne_fait_ni_sortir_ni_tourner_en_rond() {
        use std::os::unix::fs::symlink;
        let r = dossier_d_essai();
        let dehors = dossier_d_essai();
        symlink(&dehors, r.join("dehors")).unwrap();
        std::fs::create_dir(r.join("Maths")).unwrap();
        std::fs::write(r.join("Maths/exo.pdf"), b"x").unwrap();
        symlink(&r, r.join("Maths/boucle")).unwrap();
        // Ni pour lire, ni pour écrire, même sous des dossiers encore à créer.
        assert!(dans(&r, "dehors").is_err());
        assert!(dans(&r, "dehors/a/b/fiche.pdf").is_err());
        assert!(dans(&r, "Maths/nouveau/fiche.pdf").is_ok());
        // La liste des fichiers s'arrête, et les liens n'y sont pas.
        assert_eq!(fichiers_du_dossier(&r, &r), vec!["Maths/exo.pdf"]);
        let noms: Vec<String> = lister_dossier(&r, &r).unwrap().into_iter().map(|x| x.nom).collect();
        assert_eq!(noms, vec!["Maths"]);
        std::fs::remove_dir_all(&r).ok();
        std::fs::remove_dir_all(&dehors).ok();
    }

    #[test]
    fn un_nom_pris_devient_nom_2() {
        let r = dossier_d_essai();
        std::fs::write(r.join("fiche.pdf"), b"a").unwrap();
        std::fs::write(r.join("fiche (2).pdf"), b"b").unwrap();
        assert_eq!(nom_libre(&r, "fiche.pdf"), "fiche (3).pdf");
        assert_eq!(nom_libre(&r, "autre.pdf"), "autre.pdf");
        std::fs::create_dir(r.join("cycle 1")).unwrap();
        assert_eq!(nom_libre(&r, "cycle 1"), "cycle 1 (2)");
        std::fs::remove_dir_all(&r).ok();
    }

    #[test]
    fn la_liste_montre_dossiers_puis_fichiers_sans_les_parasites() {
        let r = dossier_d_essai();
        std::fs::create_dir(r.join("Maths")).unwrap();
        std::fs::write(r.join("Maths/exo.pdf"), b"x").unwrap();
        std::fs::write(r.join("Maths/.DS_Store"), b"x").unwrap();
        std::fs::write(r.join("bilan.docx"), b"xy").unwrap();
        std::fs::write(r.join("~$bilan.docx"), b"verrou").unwrap();
        std::fs::write(r.join("video.mp4.part"), b"...").unwrap();
        std::fs::write(r.join("cycle 1 (Clément).maitrize"), b"{}").unwrap();
        let l = lister_dossier(&r, &r).unwrap();
        let noms: Vec<&str> = l.iter().map(|x| x.nom.as_str()).collect();
        assert_eq!(noms, vec!["Maths", "bilan.docx", "cycle 1 (Clément).maitrize"]);
        assert!(l[0].dossier && l[0].elements == 1);
        assert_eq!(l[1].octets, 2);
        assert_eq!(l[0].chemin, "Maths");
        assert_eq!(fichiers_du_dossier(&r, &r.join("Maths")), vec!["Maths/exo.pdf"]);
        std::fs::remove_dir_all(&r).ok();
    }

    #[test]
    fn les_parasites_des_services_de_synchronisation_sont_reconnus() {
        for p in [".DS_Store", "~$fiche.docx", "desktop.ini", "Thumbs.db", "a.part", "b.tmp", "c.crdownload", ".~lock.x#"] {
            assert!(est_parasite(p), "{p}");
        }
        for ok in ["fiche.pdf", "cycle 1", "Loto (2).maitrize"] {
            assert!(!est_parasite(ok), "{ok}");
        }
    }
}
