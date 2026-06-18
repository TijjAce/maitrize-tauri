//! Appariement chiffré entre utilisateurs (« amis »).
//!
//! Chaque appareil possède une identité X25519 générée localement ; la clé
//! privée ne quitte jamais la machine. On relie deux utilisateurs en échangeant
//! un **code d'invitation** (qui contient la clé publique). Une fois les deux
//! clés publiques connues de part et d'autre, on dérive :
//!   - un secret partagé (Diffie-Hellman X25519) — jamais stocké en clair,
//!   - un identifiant de boîte aux lettres (déterministe, identique des 2 côtés),
//!   - un « numéro de sécurité » à comparer hors-bande pour exclure tout
//!     intercepteur (anti-MITM, comme Signal).
//!
//! ⚠️ Cette couche est 100 % locale : aucun réseau, rien n'est exposé sur
//! internet. La synchro via stockage objet chiffré viendra ensuite.

use crate::db::Db;
use base64::{engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}, Engine as _};
use rand_core::OsRng;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::State;
use x25519_dalek::{PublicKey, StaticSecret};

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

const PREFIXE_CODE: &str = "MZ1.";

/// Identité publique exposée au frontend (jamais la clé privée).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Identite {
    pub cle_publique: String, // base64
    pub nom: String,
    pub empreinte: String, // hex court, pour affichage
}

/// Un ami appairé.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ami {
    pub id: String,
    pub nom: String,
    pub cle_publique: String, // base64
    pub mailbox_id: String,
    pub numero_securite: String,
    pub verifie: bool,
    pub date_ajout: String,
}

/// Contenu encodé dans un code d'invitation.
#[derive(Serialize, Deserialize)]
struct Charge {
    v: u8,
    pk: String, // clé publique base64
    nom: String,
}

fn vers_32(v: Vec<u8>) -> R<[u8; 32]> {
    <[u8; 32]>::try_from(v.as_slice()).map_err(|_| "clé de taille invalide".to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Charge l'identité de l'appareil, la crée à la volée si absente.
/// Renvoie (clé privée 32o, clé publique 32o).
fn charger_identite(c: &rusqlite::Connection) -> R<([u8; 32], [u8; 32])> {
    let existant: Option<(Vec<u8>, Vec<u8>)> = c
        .query_row("SELECT cle_privee, cle_publique FROM identite WHERE id = 1", [],
            |r| Ok((r.get(0)?, r.get(1)?)))
        .optional()
        .map_err(e)?;
    if let Some((priv_, pub_)) = existant {
        return Ok((vers_32(priv_)?, vers_32(pub_)?));
    }
    let secret = StaticSecret::random_from_rng(OsRng);
    let public = PublicKey::from(&secret);
    c.execute(
        "INSERT INTO identite (id, cle_privee, cle_publique, nom) VALUES (1, ?1, ?2, '')",
        params![secret.to_bytes().to_vec(), public.to_bytes().to_vec()],
    ).map_err(e)?;
    Ok((secret.to_bytes(), public.to_bytes()))
}

/// Numéro de sécurité (SAS) : déterministe et identique des deux côtés.
/// 6 groupes de 5 chiffres dérivés du hash des deux clés publiques triées.
fn numero_securite(a: &[u8; 32], b: &[u8; 32]) -> String {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut h = Sha256::new();
    h.update(b"maitrize-sas-v1");
    h.update(lo);
    h.update(hi);
    let d = h.finalize();
    (0..6)
        .map(|i| {
            let n = u32::from_be_bytes([d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]]) % 100_000;
            format!("{:05}", n)
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Identifiant de boîte aux lettres partagée : déterministe, même valeur des
/// deux côtés. Sert plus tard de préfixe de chemin dans le stockage chiffré.
fn mailbox_id(a: &[u8; 32], b: &[u8; 32]) -> String {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut h = Sha256::new();
    h.update(b"maitrize-mailbox-v1");
    h.update(lo);
    h.update(hi);
    hex(&h.finalize()[..16])
}

fn empreinte(pub_: &[u8; 32]) -> String {
    let mut h = Sha256::new();
    h.update(b"maitrize-fp-v1");
    h.update(pub_);
    hex(&h.finalize()[..6])
}

// ============================================================
// COMMANDES
// ============================================================

#[tauri::command]
pub fn identite_get(db: State<Db>) -> R<Identite> {
    let c = db.0.lock().map_err(e)?;
    let (_, pub_) = charger_identite(&c)?;
    let nom: String = c
        .query_row("SELECT nom FROM identite WHERE id = 1", [], |r| r.get(0))
        .map_err(e)?;
    Ok(Identite { cle_publique: STANDARD.encode(pub_), empreinte: empreinte(&pub_), nom })
}

#[tauri::command]
pub fn identite_set_nom(db: State<Db>, nom: String) -> R<Identite> {
    {
        let c = db.0.lock().map_err(e)?;
        charger_identite(&c)?; // garantit l'existence
        c.execute("UPDATE identite SET nom = ?1 WHERE id = 1", params![nom]).map_err(e)?;
    }
    identite_get(db)
}

/// Génère un code d'invitation à transmettre par un autre canal (mail, SMS…).
#[tauri::command]
pub fn invitation_creer(db: State<Db>) -> R<String> {
    let c = db.0.lock().map_err(e)?;
    let (_, pub_) = charger_identite(&c)?;
    let nom: String = c
        .query_row("SELECT nom FROM identite WHERE id = 1", [], |r| r.get(0))
        .map_err(e)?;
    let charge = Charge { v: 1, pk: STANDARD.encode(pub_), nom };
    let json = serde_json::to_vec(&charge).map_err(e)?;
    Ok(format!("{}{}", PREFIXE_CODE, URL_SAFE_NO_PAD.encode(json)))
}

/// Accepte le code d'invitation d'un ami : enregistre sa clé publique et dérive
/// boîte aux lettres + numéro de sécurité.
#[tauri::command]
pub fn invitation_accepter(db: State<Db>, code: String) -> R<Ami> {
    let brut = code.trim();
    let corps = brut.strip_prefix(PREFIXE_CODE)
        .ok_or_else(|| "Code d'invitation non reconnu.".to_string())?;
    let json = URL_SAFE_NO_PAD.decode(corps).map_err(|_| "Code d'invitation illisible.".to_string())?;
    let charge: Charge = serde_json::from_slice(&json).map_err(|_| "Code d'invitation invalide.".to_string())?;
    let pub_ami = vers_32(STANDARD.decode(&charge.pk).map_err(|_| "Clé invalide dans le code.".to_string())?)?;

    let c = db.0.lock().map_err(e)?;
    let (_, mon_pub) = charger_identite(&c)?;
    if pub_ami == mon_pub {
        return Err("C'est votre propre code d'invitation.".to_string());
    }

    let mid = mailbox_id(&mon_pub, &pub_ami);
    let sas = numero_securite(&mon_pub, &pub_ami);
    let date = chrono::Utc::now().to_rfc3339();

    // Déjà ami ? on met à jour le nom, sinon on insère.
    let existant: Option<String> = c
        .query_row("SELECT id FROM amis WHERE cle_publique = ?1", params![pub_ami.to_vec()],
            |r| r.get(0))
        .optional()
        .map_err(e)?;
    let id = match existant {
        Some(id) => {
            c.execute("UPDATE amis SET nom = ?1 WHERE id = ?2", params![charge.nom, id]).map_err(e)?;
            id
        }
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            c.execute(
                "INSERT INTO amis (id, nom, cle_publique, mailbox_id, numero_securite, verifie, date_ajout)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                params![id, charge.nom, pub_ami.to_vec(), mid, sas, date],
            ).map_err(e)?;
            id
        }
    };

    Ok(Ami {
        id, nom: charge.nom, cle_publique: charge.pk, mailbox_id: mid,
        numero_securite: sas, verifie: false, date_ajout: date,
    })
}

#[tauri::command]
pub fn amis_list(db: State<Db>) -> R<Vec<Ami>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare(
        "SELECT id, nom, cle_publique, mailbox_id, numero_securite, verifie, date_ajout
         FROM amis ORDER BY nom COLLATE NOCASE",
    ).map_err(e)?;
    let rows = st.query_map([], |r| {
        let pub_: Vec<u8> = r.get(2)?;
        Ok(Ami {
            id: r.get(0)?,
            nom: r.get(1)?,
            cle_publique: STANDARD.encode(pub_),
            mailbox_id: r.get(3)?,
            numero_securite: r.get(4)?,
            verifie: r.get::<_, i64>(5)? != 0,
            date_ajout: r.get(6)?,
        })
    }).map_err(e)?;
    rows.collect::<rusqlite::Result<_>>().map_err(e)
}

#[tauri::command]
pub fn ami_set_verifie(db: State<Db>, id: String, verifie: bool) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("UPDATE amis SET verifie = ?1 WHERE id = ?2",
        params![if verifie { 1 } else { 0 }, id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn ami_supprimer(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM amis WHERE id = ?1", params![id]).map_err(e)?;
    Ok(())
}
