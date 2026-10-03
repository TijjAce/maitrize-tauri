//! Un bureau commun posé sur Nuage, sans rien installer.
//!
//! Nuage (apps.education.fr) est un Nextcloud : il parle WebDAV, c'est-à-dire
//! HTTP avec quelques verbes en plus (PROPFIND pour lister, MKCOL pour créer
//! un dossier). Maitrize s'y connecte directement, avec l'identifiant de
//! l'enseignant et un **mot de passe d'application** — révocable d'un clic
//! dans Nuage, et qui ne donne pas accès au compte lui-même.
//!
//! Rien n'est copié sur l'ordinateur : le dossier partagé vit chez Nuage, et
//! le Mac comme le PC y voient la même chose au même instant. En échange, il
//! faut du réseau : chaque geste est une requête.

use crate::commun::EntreeCommune;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use quick_xml::events::Event;
use quick_xml::Reader;

type R<T> = Result<T, String>;

/// De quoi joindre un dossier de Nuage.
#[derive(Clone, Debug)]
pub struct Acces {
    /// L'adresse du serveur, sans barre finale : « https://nuage03.apps.education.fr ».
    pub serveur: String,
    /// L'identifiant du compte, ou le jeton du lien de partage.
    pub utilisateur: String,
    /// Le mot de passe d'application, ou celui du lien. Il ne quitte pas cet ordinateur.
    pub mot_de_passe: String,
    /// Le dossier partagé, relatif à la racine atteinte ("" : toute la racine).
    pub racine: String,
    /// Le chemin WebDAV de départ : les fichiers d'un compte, ou un lien partagé.
    pub base: String,
}

/// Le chemin WebDAV des fichiers d'un compte.
pub fn base_compte(utilisateur: &str) -> String {
    format!("remote.php/dav/files/{}", encoder(utilisateur))
}

/// Les deux chemins qu'un lien de partage peut prendre, du plus récent au plus
/// ancien : Nextcloud a changé d'adresse en cours de route, et les serveurs de
/// l'Éducation nationale ne sont pas tous à la même version.
pub fn bases_lien(jeton: &str) -> Vec<String> {
    vec![format!("public.php/dav/files/{}", encoder(jeton)), "public.php/webdav".to_string()]
}

/// Le serveur et le jeton d'un lien de partage collé par un collègue.
///
/// « https://nuage03.apps.education.fr/s/aBcD1234 », avec ou sans « /download »,
/// avec ou sans barre finale.
pub fn lien_partage(brut: &str) -> R<(String, String)> {
    let t = brut.trim();
    let sans_protocole = t.trim_start_matches("https://").trim_start_matches("http://");
    let (hote, reste) = sans_protocole.split_once("/s/")
        .ok_or_else(|| "Ce n'est pas un lien de partage Nuage (il doit contenir « /s/ »).".to_string())?;
    let jeton: String = reste.split(['/', '?', '#']).next().unwrap_or("").trim().to_string();
    if hote.is_empty() || jeton.is_empty() {
        return Err("Ce lien de partage est incomplet.".into());
    }
    let protocole = if t.starts_with("http://") { "http://" } else { "https://" };
    Ok((format!("{protocole}{}", hote.trim_end_matches('/')), jeton))
}

/// Les caractères qu'une adresse accepte tels quels ; les autres s'écrivent « %XX ».
fn encoder(segment: &str) -> String {
    let mut sortie = String::with_capacity(segment.len());
    for o in segment.as_bytes() {
        let c = *o as char;
        if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '~') {
            sortie.push(c);
        } else {
            sortie.push_str(&format!("%{o:02X}"));
        }
    }
    sortie
}

/// Les morceaux de chemin qui appartiennent à la page web de Nextcloud, et
/// non au serveur : tout ce qui suit est à jeter.
const PAGES_WEB: &[&str] = &["/index.php", "/apps/", "/remote.php", "/public.php", "/login", "/settings", "/s/", "/f/"];

/**
 * L'adresse d'un serveur, telle qu'on peut la coller.
 *
 * L'enseignant copie souvent l'adresse de la page qu'il a sous les yeux —
 * « https://nuage17.apps.education.fr/index.php/apps/files/files/1167348?dir=/… ».
 * On n'en garde que le serveur, avec son éventuel sous-chemin
 * (« https://exemple.fr/nextcloud »), sans la page ni ses paramètres.
 */
pub fn serveur_propre(brut: &str) -> String {
    let t = brut.trim();
    if t.is_empty() {
        return String::new();
    }
    let avec_protocole = if t.starts_with("http://") || t.starts_with("https://") {
        t.to_string()
    } else {
        format!("https://{t}")
    };
    // Ni ancre, ni paramètres : ils décrivent la page, pas le serveur.
    let sans_suite = avec_protocole.split(['?', '#']).next().unwrap_or("").to_string();
    let debut = sans_suite.find("://").map(|i| i + 3).unwrap_or(0);
    let (protocole, reste) = sans_suite.split_at(debut);
    let mut chemin = reste.to_string();
    for marque in PAGES_WEB {
        // La marque se cherche après l'hôte : « /apps/ » ne peut pas être un domaine.
        if let Some(i) = chemin.find(marque) {
            if i > 0 {
                chemin.truncate(i);
            }
        }
    }
    format!("{protocole}{}", chemin.trim_end_matches('/'))
}

/**
 * Le dossier que désigne une adresse de page web : « ?dir=/Équipe IME ».
 *
 * Coller l'adresse du dossier qu'on regarde suffit alors à le désigner.
 */
pub fn dossier_de_l_adresse(brut: &str) -> String {
    let apres = match brut.split_once('?') {
        Some((_, q)) => q,
        None => return String::new(),
    };
    for parametre in apres.split(['&', '#']) {
        if let Some(valeur) = parametre.strip_prefix("dir=") {
            let chemin = decoder(&valeur.replace('+', " "));
            return chemin.trim_matches('/').to_string();
        }
    }
    String::new()
}

/// Le chemin WebDAV d'un élément, sans le serveur.
fn chemin_dav(acces: &Acces, relatif: &str) -> String {
    let mut segments: Vec<String> = acces.base.split('/').filter(|s| !s.is_empty()).map(String::from).collect();
    for s in acces.racine.split('/').chain(relatif.split('/')).filter(|s| !s.is_empty()) {
        segments.push(encoder(s));
    }
    format!("/{}", segments.join("/"))
}

/// L'adresse complète d'un élément du bureau commun.
pub fn url_de(acces: &Acces, relatif: &str) -> String {
    format!("{}{}", acces.serveur, chemin_dav(acces, relatif))
}

/// L'adresse de la page web de Nuage qui montre ce dossier.
pub fn url_web(acces: &Acces, relatif: &str) -> String {
    if acces.base.starts_with("public.php") {
        // Un lien de partage se rouvre tel quel, dans le navigateur.
        return format!("{}/s/{}", acces.serveur, encoder(&acces.utilisateur));
    }
    let chemin: Vec<String> = acces.racine.split('/').chain(relatif.split('/'))
        .filter(|s| !s.is_empty()).map(encoder).collect();
    format!("{}/apps/files/?dir=/{}", acces.serveur, chemin.join("/"))
}

fn client() -> R<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent("Maitrize")
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())
}

fn autorisation(acces: &Acces) -> String {
    format!("Basic {}", STANDARD.encode(format!("{}:{}", acces.utilisateur, acces.mot_de_passe)))
}

/// Vrai pour un accès par lien de partage, faux pour un compte.
fn par_lien(acces: &Acces) -> bool {
    acces.base.starts_with("public.php")
}

/**
 * Les en-têtes d'une demande WebDAV : qui l'on est, et, par un lien de
 * partage, la marque que Nuage exige.
 *
 * Depuis Nextcloud 29, tout ce qui n'est pas une lecture sur un lien public
 * (lister, écrire, supprimer) doit porter « X-Requested-With: XMLHttpRequest »,
 * sans quoi le serveur répond 401 — sauf là où le partage entre serveurs est
 * activé. Un refus qui ressemble à un mauvais mot de passe, et n'en est pas un.
 */
fn entetes(acces: &Acces) -> reqwest::header::HeaderMap {
    use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION};
    let mut sortie = HeaderMap::new();
    if let Ok(valeur) = HeaderValue::from_str(&autorisation(acces)) {
        sortie.insert(AUTHORIZATION, valeur);
    }
    if par_lien(acces) {
        sortie.insert(HeaderName::from_static("x-requested-with"), HeaderValue::from_static("XMLHttpRequest"));
    }
    sortie
}

/// Ce qu'on dit d'une réponse qui n'a pas abouti, en français.
fn erreur_http(statut: reqwest::StatusCode, quoi: &str) -> String {
    match statut.as_u16() {
        401 => "Nuage refuse l'identifiant ou le mot de passe d'application.".into(),
        403 => "Nuage refuse : ce lien de partage ou ce compte n'a pas le droit d'écrire ici.".into(),
        404 => format!("Introuvable sur Nuage : {quoi}."),
        405 => format!("Ce nom existe déjà sur Nuage : {quoi}."),
        507 => "L'espace de stockage de Nuage est plein.".into(),
        _ => format!("Nuage a répondu {statut} ({quoi})."),
    }
}

/// Le corps d'une demande de liste : juste ce qu'une tuile affiche.
const PROPFIND: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <nc:contained-file-count/>
    <nc:contained-folder-count/>
  </d:prop>
</d:propfind>"#;

async fn propfind(acces: &Acces, relatif: &str, profondeur: &str) -> R<String> {
    let methode = reqwest::Method::from_bytes(b"PROPFIND").map_err(|e| e.to_string())?;
    let rep = client()?
        .request(methode, url_de(acces, relatif))
        .headers(entetes(acces))
        .header("Depth", profondeur)
        .header("Content-Type", "application/xml; charset=utf-8")
        .body(PROPFIND)
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        let statut = rep.status();
        return Err(match statut.as_u16() {
            // PROPFIND n'a de sens que sur une adresse WebDAV : ailleurs, le
            // serveur répond « méthode interdite ».
            405 | 501 => "Cette adresse n'est pas celle d'un serveur Nuage. Gardez seulement le début, par exemple « nuage17.apps.education.fr ».".to_string(),
            404 if relatif.is_empty() => "Ce dossier n'existe pas dans votre Nuage : vérifiez son nom, accents et majuscules compris.".to_string(),
            _ => erreur_http(statut, if relatif.is_empty() { "le dossier partagé" } else { relatif }),
        });
    }
    rep.text().await.map_err(|e| e.to_string())
}

/// Le nom local d'une balise, sans son préfixe de langage (« d: », « oc: »…).
fn nom_local(brut: &[u8]) -> String {
    let s = String::from_utf8_lossy(brut);
    s.rsplit(':').next().unwrap_or(&s).to_lowercase()
}

/// Ce qu'une réponse PROPFIND décrit, avant d'en faire des tuiles.
#[derive(Default, Debug, Clone)]
pub struct Trouve {
    pub href: String,
    pub dossier: bool,
    pub octets: u64,
    pub modifie: String,
    pub elements: usize,
}

/// Lit une réponse PROPFIND. Écrit à part : cela se teste sans réseau.
pub fn analyser_propfind(xml: &str) -> R<Vec<Trouve>> {
    let mut lecteur = Reader::from_str(xml);
    lecteur.config_mut().trim_text(true);
    let mut sortie: Vec<Trouve> = Vec::new();
    let mut courant: Option<Trouve> = None;
    let mut balise = String::new();
    let mut dans_reponse = false;
    loop {
        match lecteur.read_event() {
            Ok(Event::Start(e)) => {
                balise = nom_local(e.name().as_ref());
                match balise.as_str() {
                    "response" => { dans_reponse = true; courant = Some(Trouve::default()); }
                    "collection" => { if let Some(t) = courant.as_mut() { t.dossier = true; } }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                if nom_local(e.name().as_ref()) == "collection" {
                    if let Some(t) = courant.as_mut() { t.dossier = true; }
                }
                balise.clear();
            }
            Ok(Event::Text(t)) => {
                let texte = t.unescape().unwrap_or_default().trim().to_string();
                if texte.is_empty() || !dans_reponse { continue; }
                if let Some(c) = courant.as_mut() {
                    match balise.as_str() {
                        "href" => c.href = texte,
                        "getcontentlength" => c.octets = texte.parse().unwrap_or(0),
                        "getlastmodified" => c.modifie = texte,
                        "contained-file-count" | "contained-folder-count" => {
                            c.elements += texte.parse::<usize>().unwrap_or(0);
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::End(e)) => {
                if nom_local(e.name().as_ref()) == "response" {
                    dans_reponse = false;
                    if let Some(t) = courant.take() { sortie.push(t); }
                }
                balise.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("Réponse de Nuage illisible : {e}")),
            _ => {}
        }
    }
    Ok(sortie)
}

/// Le nom d'un élément, tiré de son adresse (« …/Maths/exo%20 1.pdf » → « exo  1.pdf »).
pub fn nom_du_href(href: &str) -> String {
    let sans_barre = href.trim_end_matches('/');
    let dernier = sans_barre.rsplit('/').next().unwrap_or(sans_barre);
    decoder(dernier)
}

/// L'inverse de `encoder` : « %C3%A9 » redevient « é ».
fn decoder(texte: &str) -> String {
    let octets = texte.as_bytes();
    let mut sortie: Vec<u8> = Vec::with_capacity(octets.len());
    let mut i = 0;
    while i < octets.len() {
        if octets[i] == b'%' && i + 2 < octets.len() {
            if let Ok(v) = u8::from_str_radix(&texte[i + 1..i + 3], 16) {
                sortie.push(v);
                i += 3;
                continue;
            }
        }
        sortie.push(octets[i]);
        i += 1;
    }
    String::from_utf8_lossy(&sortie).to_string()
}

/// La date d'un fichier, telle qu'une tuile l'attend (RFC 3339).
fn date_iso(http: &str) -> String {
    chrono::DateTime::parse_from_rfc2822(http)
        .map(|d| d.to_rfc3339())
        .unwrap_or_default()
}

/// Ce que contient un dossier du bureau commun, dossiers d'abord puis par nom.
pub async fn lister(acces: &Acces, dossier: &str) -> R<Vec<EntreeCommune>> {
    let xml = propfind(acces, dossier, "1").await?;
    let trouves = analyser_propfind(&xml)?;
    // La première réponse est le dossier lui-même : elle ne se montre pas.
    let prefixe = if dossier.is_empty() { String::new() } else { format!("{}/", dossier.trim_matches('/')) };
    let mut sortie: Vec<EntreeCommune> = Vec::new();
    for (i, t) in trouves.iter().enumerate() {
        if i == 0 {
            continue;
        }
        let nom = nom_du_href(&t.href);
        if nom.is_empty() || crate::commun::est_parasite(&nom) {
            continue;
        }
        sortie.push(EntreeCommune {
            chemin: format!("{prefixe}{nom}"),
            nom,
            dossier: t.dossier,
            octets: if t.dossier { 0 } else { t.octets },
            modifie: date_iso(&t.modifie),
            elements: t.elements,
        });
    }
    sortie.sort_by(|a, b| b.dossier.cmp(&a.dossier).then_with(|| a.nom.to_lowercase().cmp(&b.nom.to_lowercase())));
    Ok(sortie)
}

/// Tous les fichiers d'un dossier, sous-dossiers compris (pour le récupérer entier).
pub async fn fichiers(acces: &Acces, dossier: &str) -> R<Vec<String>> {
    let mut sortie = Vec::new();
    let mut a_voir = vec![dossier.to_string()];
    // Un dossier partagé peut être profond : on borne la descente plutôt que
    // de risquer une promenade sans fin sur un serveur mal en point.
    let mut visites = 0;
    while let Some(d) = a_voir.pop() {
        visites += 1;
        if visites > 200 {
            break;
        }
        for e in lister(acces, &d).await? {
            if e.dossier { a_voir.push(e.chemin); } else { sortie.push(e.chemin); }
        }
    }
    sortie.sort();
    Ok(sortie)
}

/// Le contenu d'un fichier.
pub async fn lire(acces: &Acces, chemin: &str) -> R<Vec<u8>> {
    let rep = client()?
        .get(url_de(acces, chemin))
        .headers(entetes(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        return Err(erreur_http(rep.status(), chemin));
    }
    Ok(rep.bytes().await.map_err(|e| e.to_string())?.to_vec())
}

/// Le début d'un fichier seulement : de quoi lire l'en-tête d'un paquet sans
/// tirer les mégaoctets qui suivent.
pub async fn lire_debut(acces: &Acces, chemin: &str, octets: usize) -> R<Vec<u8>> {
    let rep = client()?
        .get(url_de(acces, chemin))
        .headers(entetes(acces))
        .header("Range", format!("bytes=0-{}", octets.saturating_sub(1)))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        return Err(erreur_http(rep.status(), chemin));
    }
    // Un serveur qui ignore « Range » renvoie tout : on ne garde que le début.
    let mut corps = rep.bytes().await.map_err(|e| e.to_string())?.to_vec();
    corps.truncate(octets);
    Ok(corps)
}

/// Pose un fichier (il remplace celui qui porterait le même nom).
pub async fn ecrire(acces: &Acces, chemin: &str, octets: Vec<u8>) -> R<()> {
    let rep = client()?
        .put(url_de(acces, chemin))
        .headers(entetes(acces))
        .body(octets)
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Crée un dossier. Un dossier déjà là n'est pas une erreur.
pub async fn creer_dossier(acces: &Acces, chemin: &str) -> R<()> {
    let methode = reqwest::Method::from_bytes(b"MKCOL").map_err(|e| e.to_string())?;
    let rep = client()?
        .request(methode, url_de(acces, chemin))
        .headers(entetes(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() || rep.status().as_u16() == 405 { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Supprime un fichier ou un dossier — pour tout le monde. Nuage le garde
/// dans sa corbeille.
pub async fn supprimer(acces: &Acces, chemin: &str) -> R<()> {
    let rep = client()?
        .delete(url_de(acces, chemin))
        .headers(entetes(acces))
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if rep.status().is_success() { Ok(()) } else { Err(erreur_http(rep.status(), chemin)) }
}

/// Crée un dossier et tous ceux qui le portent : « a/b/c » demande que « a »
/// et « a/b » existent d'abord, sans quoi Nuage refuse.
pub async fn creer_dossiers(acces: &Acces, chemin: &str) -> R<()> {
    let mut jusqu_ici = String::new();
    for segment in chemin.split('/').filter(|s| !s.is_empty()) {
        if !jusqu_ici.is_empty() {
            jusqu_ici.push('/');
        }
        jusqu_ici.push_str(segment);
        creer_dossier(acces, &jusqu_ici).await?;
    }
    Ok(())
}

/// Est-ce un dossier ? (pour savoir s'il faut l'ouvrir sur le web ou le lire)
pub async fn est_dossier(acces: &Acces, chemin: &str) -> R<bool> {
    let xml = propfind(acces, chemin, "0").await?;
    Ok(analyser_propfind(&xml)?.first().map(|t| t.dossier).unwrap_or(false))
}

/**
 * Crée un **lien de partage** sur le dossier du bureau commun, et rend son
 * adresse.
 *
 * C'est la réponse à « je ne veux pas donner mon mot de passe » : le lien
 * ouvre ce seul dossier, porte son propre mot de passe, et se révoque dans
 * Nuage quand on veut. Il passe par l'API de Nextcloud, pas par WebDAV.
 */
pub async fn creer_lien(acces: &Acces, sous_dossier: &str, mot_de_passe: &str, ecriture: bool) -> R<String> {
    creer_lien_detaille(acces, sous_dossier, mot_de_passe, ecriture).await.map(|l| l.url)
}

/// Un lien de partage tel que Nuage vient de le créer.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct LienCree {
    /// Son numéro chez Nuage : c'est par lui qu'on le révoque.
    pub id: String,
    /// L'adresse à donner : « https://nuage03.apps.education.fr/s/aBcD1234 ».
    pub url: String,
    /// Le jeton, qui sert d'identifiant en WebDAV.
    pub jeton: String,
    /// Le jour où Nuage le fermera, s'il en impose un (« 2026-11-01 ») ; vide sinon.
    pub expire: String,
}

/// Ce que Nuage répond à la création d'un lien : son numéro, son adresse, son jeton, son échéance.
pub fn lire_lien_cree(corps: &str) -> R<LienCree> {
    let v: serde_json::Value = serde_json::from_str(corps)
        .map_err(|_| "Réponse de Nuage illisible.".to_string())?;
    let donnees = &v["ocs"]["data"];
    let Some(url) = donnees["url"].as_str() else {
        let message = v["ocs"]["meta"]["message"].as_str().unwrap_or("").trim().to_string();
        // « Passwords are enforced… » : Nuage le dit avec ou sans majuscule, en anglais ou en français.
        let bas = message.to_lowercase();
        return Err(if message.is_empty() {
            "Nuage n'a pas rendu d'adresse pour ce lien.".to_string()
        } else if bas.contains("password") || bas.contains("mot de passe") {
            format!("Nuage demande un mot de passe pour ce lien : {message}")
        } else {
            format!("Nuage : {message}")
        });
    };
    // Le numéro arrive en nombre ou en texte selon la version du serveur.
    let id = match &donnees["id"] {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        _ => String::new(),
    };
    let jeton = donnees["token"].as_str().map(String::from)
        .or_else(|| lien_partage(url).ok().map(|(_, j)| j))
        .unwrap_or_default();
    // « 2026-11-01 00:00:00 » : on n'en garde que le jour.
    let expire = donnees["expiration"].as_str().unwrap_or("").chars().take(10).collect();
    Ok(LienCree { id, url: url.to_string(), jeton, expire })
}

/// Crée un lien de partage, et rend tout ce qu'il faut pour s'en servir puis le révoquer.
pub async fn creer_lien_detaille(acces: &Acces, sous_dossier: &str, mot_de_passe: &str, ecriture: bool) -> R<LienCree> {
    if acces.base.starts_with("public.php") {
        return Err("Ce bureau commun est déjà ouvert par un lien : c'est à son propriétaire d'en créer d'autres.".into());
    }
    // Le dossier partagé, et celui qu'on regarde : on partage ce qu'on voit.
    let chemin: String = acces.racine.split('/').chain(sous_dossier.split('/'))
        .filter(|s| !s.is_empty()).collect::<Vec<_>>().join("/");
    if chemin.is_empty() {
        return Err(
            "Nuage ne partage pas la racine de votre espace. Entrez dans un dossier du bureau commun (ou ajoutez-le en \
             précisant un dossier), puis créez le lien de là.".into());
    }
    let mut form: Vec<(&str, String)> = vec![
        ("path", format!("/{chemin}")),
        ("shareType", "3".into()),
        // 15 : lire, créer, modifier, supprimer — de quoi déposer à plusieurs.
        ("permissions", if ecriture { "15".into() } else { "1".into() }),
    ];
    if !mot_de_passe.trim().is_empty() {
        form.push(("password", mot_de_passe.trim().to_string()));
    }
    let rep = client()?
        // « format=json » : certains serveurs ignorent l'en-tête Accept.
        .post(format!("{}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json", acces.serveur))
        .header("Authorization", autorisation(acces))
        .header("OCS-APIRequest", "true")
        .header("Accept", "application/json")
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    let statut = rep.status();
    let corps = rep.text().await.unwrap_or_default();
    if !statut.is_success() {
        return Err(match statut.as_u16() {
            401 => "Nuage refuse l'identifiant ou le mot de passe d'application.".to_string(),
            // Deux causes possibles, et l'enseignant ne peut agir que sur la seconde.
            403 => "Nuage a refusé : soit les liens de partage sont désactivés pour ce compte, soit le mot de passe \
                    d'application est limité au seul accès aux fichiers. Dans Nuage › Paramètres › Sécurité, \
                    recréez-en un sans cocher cette limite."
                .to_string(),
            404 => "Ce dossier est introuvable sur Nuage.".to_string(),
            _ => format!("Nuage a refusé de créer le lien ({statut})."),
        });
    }
    // La réponse est un JSON d'OCS : l'adresse du lien est dans « data.url ».
    lire_lien_cree(&corps)
}

/// Révoque un lien de partage : celui qui le tenait n'entre plus.
pub async fn supprimer_lien(acces: &Acces, id: &str) -> R<()> {
    if id.trim().is_empty() {
        return Err("Ce lien n'a pas de numéro : supprimez-le depuis Nuage.".into());
    }
    let rep = client()?
        .delete(format!("{}/ocs/v2.php/apps/files_sharing/api/v1/shares/{}?format=json", acces.serveur, encoder(id.trim())))
        .header("Authorization", autorisation(acces))
        .header("OCS-APIRequest", "true")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    // Un lien déjà supprimé dans Nuage n'est pas une erreur : c'est ce qu'on voulait.
    if rep.status().is_success() || rep.status().as_u16() == 404 { Ok(()) } else { Err(erreur_http(rep.status(), "le lien de partage")) }
}

/**
 * Le nom du compte tel que Nuage l'écrit dans ses adresses (« prenom.nom »).
 *
 * L'identifiant qu'on saisit pour se connecter peut s'en écarter d'une
 * majuscule ; c'est ce nom-là que le téléphone devra retrouver en se
 * connectant à son tour.
 */
pub async fn identifiant_du_compte(acces: &Acces) -> R<String> {
    let rep = client()?
        .get(format!("{}/ocs/v2.php/cloud/user?format=json", acces.serveur))
        .header("Authorization", autorisation(acces))
        .header("OCS-APIRequest", "true")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Nuage injoignable : {e}"))?;
    if !rep.status().is_success() {
        return Err(erreur_http(rep.status(), "le compte"));
    }
    maitrize_relais::connexion::lire_compte(&rep.text().await.map_err(|e| e.to_string())?)
}

/// La connexion répond-elle, et le dossier existe-t-il ?
pub async fn tester(acces: &Acces) -> R<()> {
    propfind(acces, "", "0").await.map(|_| ())
}

/**
 * Essaie les adresses possibles d'un lien de partage et rend celle qui
 * répond : la base à enregistrer, pour ne plus chercher ensuite.
 */
pub async fn base_qui_repond(acces: &Acces, bases: &[String]) -> R<String> {
    let mut derniere = "Nuage n'a pas répondu.".to_string();
    for base in bases {
        let essai = Acces { base: base.clone(), ..acces.clone() };
        match tester(&essai).await {
            Ok(()) => return Ok(base.clone()),
            // Un refus d'identité ne se règle pas en changeant d'adresse.
            Err(e) if e.contains("refuse l'identifiant") => return Err(e),
            Err(e) => derniere = e,
        }
    }
    Err(derniere)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn acces() -> Acces {
        Acces {
            serveur: "https://nuage03.apps.education.fr".into(),
            utilisateur: "clement.titet".into(),
            mot_de_passe: "secret".into(),
            racine: "Équipe IME".into(),
            base: base_compte("clement.titet"),
        }
    }

    #[test]
    fn l_adresse_echappe_ce_qui_doit_l_etre() {
        assert_eq!(
            url_de(&acces(), "cycle 1/fiche é.pdf"),
            "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/%C3%89quipe%20IME/cycle%201/fiche%20%C3%A9.pdf"
        );
        // La racine seule, sans chemin relatif.
        assert_eq!(
            url_de(&acces(), ""),
            "https://nuage03.apps.education.fr/remote.php/dav/files/clement.titet/%C3%89quipe%20IME"
        );
        assert!(url_web(&acces(), "cycle 1").ends_with("/apps/files/?dir=/%C3%89quipe%20IME/cycle%201"));
    }

    #[test]
    fn l_adresse_collee_depuis_le_navigateur_se_ramene_au_serveur() {
        // Ce que l'on copie en regardant son dossier dans Nuage.
        let collee = "https://nuage17.apps.education.fr/index.php/apps/files/files/1167348?dir=/fichier%20commun&openfile=true";
        assert_eq!(serveur_propre(collee), "https://nuage17.apps.education.fr");
        assert_eq!(dossier_de_l_adresse(collee), "fichier commun");
        // Un Nextcloud installé dans un sous-dossier garde le sien.
        assert_eq!(serveur_propre("https://exemple.fr/nextcloud/index.php/apps/files"), "https://exemple.fr/nextcloud");
        // Et l'adresse simple reste simple.
        assert_eq!(serveur_propre("nuage03.apps.education.fr/"), "https://nuage03.apps.education.fr");
        assert_eq!(serveur_propre("  https://exemple.fr  "), "https://exemple.fr");
        assert_eq!(serveur_propre(""), "");
        assert_eq!(dossier_de_l_adresse("https://nuage17.apps.education.fr/apps/files"), "");
        assert_eq!(dossier_de_l_adresse("https://n.fr/apps/files?dir=/&x=1"), "");
    }

    #[test]
    fn un_lien_de_partage_se_lit_tel_qu_on_le_colle() {
        let attendu = ("https://nuage03.apps.education.fr".to_string(), "aBcD1234".to_string());
        assert_eq!(lien_partage("https://nuage03.apps.education.fr/s/aBcD1234").unwrap(), attendu);
        assert_eq!(lien_partage("  https://nuage03.apps.education.fr/s/aBcD1234/  ").unwrap(), attendu);
        assert_eq!(lien_partage("nuage03.apps.education.fr/s/aBcD1234/download").unwrap(), attendu);
        assert!(lien_partage("https://nuage03.apps.education.fr/apps/files").is_err());
        assert!(lien_partage("https://nuage03.apps.education.fr/s/").is_err());
        // Le lien mène au dossier partagé : pas de compte, pas d'identifiant.
        let a = Acces { base: bases_lien("aBcD1234")[0].clone(), utilisateur: "aBcD1234".into(),
            racine: String::new(), ..acces() };
        assert_eq!(url_de(&a, "Maths/exo.pdf"),
            "https://nuage03.apps.education.fr/public.php/dav/files/aBcD1234/Maths/exo.pdf");
        assert_eq!(url_web(&a, "Maths"), "https://nuage03.apps.education.fr/s/aBcD1234");
        // L'adresse d'avant reste proposée aux serveurs plus anciens.
        assert_eq!(bases_lien("x")[1], "public.php/webdav");
    }

    #[test]
    fn le_nom_se_relit_dans_l_adresse() {
        assert_eq!(nom_du_href("/remote.php/dav/files/c/%C3%89quipe/exo%20un.pdf"), "exo un.pdf");
        assert_eq!(nom_du_href("/remote.php/dav/files/c/Maths/"), "Maths");
    }

    /// Une réponse telle que Nextcloud la renvoie : le dossier demandé en
    /// premier, puis ce qu'il contient.
    const REPONSE: &str = r#"<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/Maths/</d:href>
    <d:propstat><d:prop>
      <d:resourcetype><d:collection/></d:resourcetype>
      <d:getlastmodified>Mon, 21 Sep 2026 08:30:00 GMT</d:getlastmodified>
      <nc:contained-file-count>3</nc:contained-file-count>
      <nc:contained-folder-count>1</nc:contained-folder-count>
    </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/fiche%20%C3%A9l%C3%A8ve.pdf</d:href>
    <d:propstat><d:prop>
      <d:resourcetype/>
      <d:getcontentlength>2048</d:getcontentlength>
      <d:getlastmodified>Sun, 20 Sep 2026 17:05:00 GMT</d:getlastmodified>
    </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/clement/%C3%89quipe%20IME/.DS_Store</d:href>
    <d:propstat><d:prop><d:resourcetype/><d:getcontentlength>6148</d:getcontentlength></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>
</d:multistatus>"#;

    #[test]
    fn la_reponse_de_nuage_se_lit_comme_une_liste_de_tuiles() {
        let trouves = analyser_propfind(REPONSE).unwrap();
        assert_eq!(trouves.len(), 4);
        assert!(trouves[1].dossier && trouves[1].elements == 4);
        assert_eq!(trouves[2].octets, 2048);
        assert!(!trouves[2].dossier);
        assert_eq!(nom_du_href(&trouves[2].href), "fiche élève.pdf");
        // Une date HTTP devient une date que l'interface sait lire.
        assert!(date_iso(&trouves[2].modifie).starts_with("2026-09-20T"));
        assert_eq!(date_iso("n'importe quoi"), "");
    }

    #[test]
    fn un_xml_abime_ne_fait_pas_tomber_l_application() {
        assert!(analyser_propfind("<d:multistatus><d:response>").is_ok());
        assert!(analyser_propfind("pas du xml").is_ok());
    }
    #[test]
    fn un_lien_cree_dit_son_numero_son_jeton_et_son_echeance() {
        // Tel que Nuage le rend : le numéro en nombre, l'échéance avec son heure.
        let lien = lire_lien_cree(r#"{"ocs":{"meta":{"status":"ok"},"data":{"id":1234,"token":"aBcD1234",
            "url":"https://nuage03.apps.education.fr/s/aBcD1234","expiration":"2026-11-01 00:00:00"}}}"#).unwrap();
        assert_eq!(lien, LienCree {
            id: "1234".into(), url: "https://nuage03.apps.education.fr/s/aBcD1234".into(),
            jeton: "aBcD1234".into(), expire: "2026-11-01".into(),
        });
        // Un serveur plus ancien : le numéro en texte, pas de jeton à part, pas d'échéance.
        let ancien = lire_lien_cree(r#"{"ocs":{"data":{"id":"77","url":"https://exemple.fr/nextcloud/s/XyZ9/","expiration":null}}}"#).unwrap();
        assert_eq!((ancien.id.as_str(), ancien.jeton.as_str(), ancien.expire.as_str()), ("77", "XyZ9", ""));
        // Un refus s'explique avec les mots de Nuage.
        let refus = lire_lien_cree(r#"{"ocs":{"meta":{"message":"Passwords are enforced for link and mail shares"},"data":[]}}"#).unwrap_err();
        assert!(refus.contains("mot de passe"), "{refus}");
        assert!(lire_lien_cree("<html>").unwrap_err().contains("illisible"));
    }

    #[test]
    fn un_lien_de_partage_porte_la_marque_que_nuage_exige() {
        let compte = acces();
        let par_le_compte = entetes(&compte);
        assert!(par_le_compte.get("authorization").unwrap().to_str().unwrap().starts_with("Basic "));
        assert!(par_le_compte.get("x-requested-with").is_none());
        // Par un lien : sans cette marque, lister ou écrire est refusé comme un mauvais mot de passe.
        let lien = Acces { utilisateur: "aBcD1234".into(), mot_de_passe: "Mz7-secret".into(), base: "public.php/dav/files/aBcD1234".into(), ..compte };
        let par_le_lien = entetes(&lien);
        assert_eq!(par_le_lien.get("x-requested-with").unwrap(), "XMLHttpRequest");
        assert_eq!(par_le_lien.get("authorization").unwrap().to_str().unwrap(), format!("Basic {}", STANDARD.encode("aBcD1234:Mz7-secret")));
        assert!(par_lien(&Acces { base: "public.php/webdav".into(), ..lien }));
    }

}
