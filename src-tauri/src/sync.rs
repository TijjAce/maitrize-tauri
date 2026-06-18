//! Transfert chiffré de bout en bout entre amis via un stockage S3-compatible.
//!
//! - En local (test) : MinIO. En production : Scaleway/Hetzner (même code, juste
//!   l'endpoint qui change).
//! - Chaque message est chiffré avec une clé dérivée du secret partagé X25519
//!   (Diffie-Hellman + HKDF) → le stockage ne voit que du ciphertext.
//! - Les blobs vont dans `mailbox/<mailbox_id>/…` ; chacun ne peut être déchiffré
//!   que par les deux amis de la paire.
//!
//! ⚠️ Étape de test : les identifiants S3 sont lus depuis la table `settings`
//!   (local). En production, ils ne seront PAS dans le client : un petit service
//!   « videur » délivrera des URLs présignées. Ici on vise juste à valider le
//!   chiffrement et l'aller-retour de bout en bout.

use crate::db::{fichiers_dir, Db};
use crate::models::{ProgrammationFinale, Projet, Seance, Sequence};
use aws_sdk_s3::{config::{BehaviorVersion, Credentials, Region}, primitives::ByteStream, Client};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use chacha20poly1305::{aead::{Aead, KeyInit}, Key, XChaCha20Poly1305, XNonce};
use hkdf::Hkdf;
use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::collections::HashSet;
use tauri::State;
use x25519_dalek::{PublicKey, StaticSecret};

type R<T> = Result<T, String>;
fn e<E: std::fmt::Display>(err: E) -> String { err.to_string() }

#[derive(Clone)]
struct S3Cfg { endpoint: String, region: String, bucket: String, access: String, secret: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig { endpoint: String, region: String, bucket: String, access: String, a_secret: bool }

#[derive(Serialize, Deserialize)]
struct Payload { de: String, nom: String, texte: String, ts: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncMessage { de: String, nom: String, texte: String, ts: String }

/// Enveloppe d'une séquence partagée (séquence + ses séances + image de couverture).
#[derive(Serialize, Deserialize)]
struct EnvSeq {
    de: String, nom: String, ts: String, kind: String,
    sequence: Sequence, seances: Vec<Seance>,
    #[serde(default)] image_b64: Option<String>,
}

/// Enveloppe d'une programmation finale partagée.
#[derive(Serialize, Deserialize)]
struct EnvProg { de: String, nom: String, ts: String, kind: String, programmation: ProgrammationFinale }

/// Une séquence empaquetée (utilisée dans un projet partagé).
#[derive(Serialize, Deserialize)]
struct SeqBundle { sequence: Sequence, seances: Vec<Seance>, #[serde(default)] image_b64: Option<String> }

/// Enveloppe d'un projet partagé (projet + son image + toutes ses séquences).
#[derive(Serialize, Deserialize)]
struct EnvProjet {
    de: String, nom: String, ts: String, kind: String,
    projet: Projet, #[serde(default)] projet_image_b64: Option<String>, sequences: Vec<SeqBundle>,
}

struct Ctx { priv_: [u8; 32], pub_: [u8; 32], nom: String, ami_pub: [u8; 32], mid: String, cfg: S3Cfg }

fn vers_32(v: Vec<u8>) -> R<[u8; 32]> {
    <[u8; 32]>::try_from(v.as_slice()).map_err(|_| "clé de taille invalide".to_string())
}

fn get_setting(c: &Connection, cle: &str) -> String {
    c.query_row("SELECT valeur FROM settings WHERE cle = ?1", [cle], |r| r.get(0))
        .optional().ok().flatten().unwrap_or_default()
}

fn lire_cfg(c: &Connection) -> R<S3Cfg> {
    let region = { let r = get_setting(c, "sync_region"); if r.is_empty() { "us-east-1".into() } else { r } };
    let cfg = S3Cfg {
        endpoint: get_setting(c, "sync_endpoint"),
        region,
        bucket: get_setting(c, "sync_bucket"),
        access: get_setting(c, "sync_access"),
        secret: get_setting(c, "sync_secret"),
    };
    if cfg.endpoint.is_empty() || cfg.bucket.is_empty() || cfg.access.is_empty() || cfg.secret.is_empty() {
        return Err("Configuration S3 incomplète (renseignez-la dans l'onglet Amis).".into());
    }
    Ok(cfg)
}

/// Lit identité + ami + config en une fois, puis relâche le verrou (rien d'async
/// ne doit conserver le MutexGuard).
fn contexte(db: &State<Db>, ami_id: &str) -> R<Ctx> {
    let c = db.0.lock().map_err(e)?;
    let (pv, pb): (Vec<u8>, Vec<u8>) = c
        .query_row("SELECT cle_privee, cle_publique FROM identite WHERE id = 1", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| "Identité absente — ouvrez l'onglet Amis d'abord.".to_string())?;
    let nom: String = c.query_row("SELECT nom FROM identite WHERE id = 1", [], |r| r.get(0)).unwrap_or_default();
    let (apub, mid): (Vec<u8>, String) = c
        .query_row("SELECT cle_publique, mailbox_id FROM amis WHERE id = ?1", [ami_id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| "Ami introuvable.".to_string())?;
    let cfg = lire_cfg(&c)?;
    Ok(Ctx { priv_: vers_32(pv)?, pub_: vers_32(pb)?, nom, ami_pub: vers_32(apub)?, mid, cfg })
}

fn client(cfg: &S3Cfg) -> Client {
    let creds = Credentials::new(cfg.access.clone(), cfg.secret.clone(), None, None, "maitrize");
    let conf = aws_sdk_s3::Config::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new(cfg.region.clone()))
        .endpoint_url(cfg.endpoint.clone())
        .credentials_provider(creds)
        .force_path_style(true) // requis par MinIO et la plupart des S3-compat
        .build();
    Client::from_conf(conf)
}

/// Clé symétrique de la paire : DH(X25519) → HKDF, déterministe des deux côtés.
fn cle_paire(priv32: [u8; 32], pub32: [u8; 32], mid: &str) -> [u8; 32] {
    let secret = StaticSecret::from(priv32);
    let public = PublicKey::from(pub32);
    let partage = secret.diffie_hellman(&public);
    let hk = Hkdf::<Sha256>::new(Some(mid.as_bytes()), partage.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(b"maitrize-payload-v1", &mut okm).expect("HKDF 32o");
    okm
}

fn chiffrer(key: &[u8; 32], data: &[u8]) -> R<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let ct = cipher.encrypt(XNonce::from_slice(&nonce), data).map_err(|_| "échec chiffrement".to_string())?;
    let mut out = nonce.to_vec();
    out.extend_from_slice(&ct);
    Ok(out)
}

fn dechiffrer(key: &[u8; 32], blob: &[u8]) -> R<Vec<u8>> {
    if blob.len() < 24 { return Err("blob trop court".into()); }
    let (nonce, ct) = blob.split_at(24);
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    cipher.decrypt(XNonce::from_slice(nonce), ct).map_err(|_| "échec déchiffrement".to_string())
}

// ============================================================
// COMMANDES
// ============================================================

#[tauri::command]
pub fn sync_config_get(db: State<Db>) -> R<SyncConfig> {
    let c = db.0.lock().map_err(e)?;
    Ok(SyncConfig {
        endpoint: get_setting(&c, "sync_endpoint"),
        region: get_setting(&c, "sync_region"),
        bucket: get_setting(&c, "sync_bucket"),
        access: get_setting(&c, "sync_access"),
        a_secret: !get_setting(&c, "sync_secret").is_empty(),
    })
}

#[tauri::command]
pub fn sync_config_set(db: State<Db>, endpoint: String, region: String, bucket: String, access: String, secret: Option<String>) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    let set = |k: &str, v: &str| {
        c.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)", params![k, v]).ok();
    };
    set("sync_endpoint", endpoint.trim());
    set("sync_region", region.trim());
    set("sync_bucket", bucket.trim());
    set("sync_access", access.trim());
    if let Some(s) = secret { if !s.is_empty() { set("sync_secret", s.trim()); } }
    Ok(())
}

#[tauri::command]
pub async fn sync_test(db: State<'_, Db>) -> R<String> {
    let cfg = { let c = db.0.lock().map_err(e)?; lire_cfg(&c)? };
    let cl = client(&cfg);
    cl.list_objects_v2().bucket(&cfg.bucket).max_keys(1).send().await
        .map_err(|er| format!("Échec connexion S3 : {er}"))?;
    Ok("Connexion S3 OK ✅".into())
}

#[tauri::command]
pub async fn sync_envoyer(db: State<'_, Db>, ami_id: String, texte: String) -> R<()> {
    let ctx = contexte(&db, &ami_id)?;
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let payload = Payload {
        de: STANDARD.encode(ctx.pub_),
        nom: ctx.nom.clone(),
        texte,
        ts: chrono::Utc::now().to_rfc3339(),
    };
    let blob = chiffrer(&key, &serde_json::to_vec(&payload).map_err(e)?)?;
    let nom_objet = format!("mailbox/{}/{}-{}.bin", ctx.mid, chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    client(&ctx.cfg)
        .put_object().bucket(&ctx.cfg.bucket).key(&nom_objet).body(ByteStream::from(blob)).send().await
        .map_err(|er| format!("Envoi : {er}"))?;
    Ok(())
}

#[tauri::command]
pub async fn sync_relever(db: State<'_, Db>, ami_id: String) -> R<Vec<SyncMessage>> {
    let ctx = contexte(&db, &ami_id)?;
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let mon_pub = STANDARD.encode(ctx.pub_);
    let cl = client(&ctx.cfg);
    let prefix = format!("mailbox/{}/", ctx.mid);
    let liste = cl.list_objects_v2().bucket(&ctx.cfg.bucket).prefix(&prefix).send().await
        .map_err(|er| format!("Liste : {er}"))?;

    let mut out = Vec::new();
    for obj in liste.contents() {
        let Some(k) = obj.key() else { continue };
        let resp = cl.get_object().bucket(&ctx.cfg.bucket).key(k).send().await
            .map_err(|er| format!("Téléchargement : {er}"))?;
        let bytes = resp.body.collect().await.map_err(e)?.into_bytes();
        let clear = match dechiffrer(&key, bytes.as_ref()) { Ok(c) => c, Err(_) => continue };
        let p: Payload = match serde_json::from_slice(&clear) { Ok(p) => p, Err(_) => continue };
        if p.de == mon_pub { continue; } // ignorer mes propres envois
        out.push(SyncMessage { de: p.de, nom: p.nom, texte: p.texte, ts: p.ts });
    }
    out.sort_by(|a, b| a.ts.cmp(&b.ts));
    Ok(out)
}

// ── Partage de séquences ────────────────────────────────────────────────────

fn lire_sequence(c: &Connection, sid: &str) -> R<(Sequence, Vec<Seance>)> {
    let seq = c.query_row("SELECT * FROM sequences WHERE id = ?1", [sid], Sequence::from_row)
        .map_err(|_| "Séquence introuvable.".to_string())?;
    let mut st = c.prepare("SELECT * FROM seances WHERE sequence_id = ?1 ORDER BY numero").map_err(e)?;
    let seances = st.query_map([sid], Seance::from_row).map_err(e)?
        .collect::<rusqlite::Result<Vec<_>>>().map_err(e)?;
    Ok((seq, seances))
}

fn lire_recus(c: &Connection) -> R<HashSet<String>> {
    let mut st = c.prepare("SELECT cle FROM sync_recus").map_err(e)?;
    let rows = st.query_map([], |r| r.get::<_, String>(0)).map_err(e)?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// Écrit l'image reçue dans le dossier des fichiers, renvoie son nouveau nom.
fn ecrire_image(b64: &str, ext: &str) -> Option<String> {
    let bytes = STANDARD.decode(b64).ok()?;
    let nom = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    std::fs::write(fichiers_dir().join(&nom), bytes).ok()?;
    Some(nom)
}

/// Insère une séquence reçue avec de NOUVEAUX identifiants (pas d'écrasement).
/// `projet_id` rattache la séquence à un projet importé (None sinon).
fn inserer_sequence(c: &Connection, mut s: Sequence, seances: Vec<Seance>, image_b64: Option<String>, projet_id: Option<String>) -> R<String> {
    let new_seq = uuid::Uuid::new_v4().to_string();
    let titre = s.titre.clone();
    s.id = new_seq.clone();
    s.date_creation = chrono::Utc::now().to_rfc3339();
    s.projet_id = projet_id;
    // Image de couverture : écrite localement si transmise, sinon on neutralise
    // le nom (sinon vignette cassée pointant vers un fichier absent).
    let ext = s.image_nom.as_deref()
        .and_then(|n| std::path::Path::new(n).extension().and_then(|e| e.to_str()))
        .unwrap_or("png").to_string();
    s.image_nom = image_b64.and_then(|b| ecrire_image(&b, &ext));
    c.execute(
        "INSERT OR REPLACE INTO sequences
         (id,titre,matiere,cycle,objectifs,competences,competence_visee,image_nom,couleur,
          date_creation,periode,annee,rating_engagement,rating_facilite,rating_apprentissage,
          rating_date_maj,projet_id,video)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![s.id, s.titre, s.matiere, s.cycle, s.objectifs, s.competences, s.competence_visee,
                s.image_nom, s.couleur, s.date_creation, s.periode, s.annee, s.rating_engagement,
                s.rating_facilite, s.rating_apprentissage, s.rating_date_maj, s.projet_id, s.video],
    ).map_err(e)?;
    for mut se in seances {
        se.id = uuid::Uuid::new_v4().to_string();
        se.sequence_id = Some(new_seq.clone());
        c.execute(
            "INSERT OR REPLACE INTO seances
             (id,titre,numero,objectifs,competences,deroulement,materiel,duree,date,
              tableau_deroulement,images_deroulement,bilan,bilan_date,sequence_id)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
            params![se.id, se.titre, se.numero, se.objectifs, se.competences, se.deroulement,
                    se.materiel, se.duree, se.date, se.tableau_deroulement, se.images_deroulement,
                    se.bilan, se.bilan_date, se.sequence_id],
        ).map_err(e)?;
    }
    Ok(titre)
}

/// Importe une séquence reçue (séquence isolée, sans projet).
fn importer_sequence(c: &Connection, env: EnvSeq) -> R<String> {
    inserer_sequence(c, env.sequence, env.seances, env.image_b64, None)
}

#[tauri::command]
pub async fn sequence_partager(db: State<'_, Db>, ami_id: String, sequence_id: String) -> R<()> {
    let ctx = contexte(&db, &ami_id)?;
    let (sequence, seances) = { let c = db.0.lock().map_err(e)?; lire_sequence(&c, &sequence_id)? };
    // Image de couverture : on lit ses octets pour les transmettre avec la séquence.
    let image_b64 = sequence.image_nom.as_deref()
        .filter(|n| !n.is_empty())
        .and_then(|n| std::fs::read(fichiers_dir().join(n)).ok())
        .map(|b| STANDARD.encode(b));
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let env = EnvSeq {
        de: STANDARD.encode(ctx.pub_),
        nom: ctx.nom.clone(),
        ts: chrono::Utc::now().to_rfc3339(),
        kind: "sequence".into(),
        sequence,
        seances,
        image_b64,
    };
    let blob = chiffrer(&key, &serde_json::to_vec(&env).map_err(e)?)?;
    let nom_objet = format!("mailbox/{}/seq-{}-{}.bin", ctx.mid, chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    client(&ctx.cfg)
        .put_object().bucket(&ctx.cfg.bucket).key(&nom_objet).body(ByteStream::from(blob)).send().await
        .map_err(|er| format!("Partage : {er}"))?;
    Ok(())
}

// ── Boîte de réception ──────────────────────────────────────────────────────
// On télécharge et déchiffre les éléments reçus, puis on les garde « en attente »
// dans `boite_recue`. L'utilisateur choisit ensuite de les récupérer (importer)
// ou de les jeter.

#[derive(Deserialize)]
struct EnvMeta { de: String, nom: String, ts: String, kind: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoiteItem {
    id: String,
    #[serde(rename = "type")] kind: String,
    de_nom: String,
    titre: String,
    ts: String,
}

fn titre_payload(kind: &str, clear: &[u8]) -> String {
    match kind {
        "sequence" => serde_json::from_slice::<EnvSeq>(clear).ok().map(|e| e.sequence.titre).unwrap_or_default(),
        "projet" => serde_json::from_slice::<EnvProjet>(clear).ok().map(|e| e.projet.titre).unwrap_or_default(),
        "programmation" => serde_json::from_slice::<EnvProg>(clear).ok().map(|e| e.programmation.annee).unwrap_or_default(),
        _ => String::new(),
    }
}

/// Relève la boîte d'un ami : télécharge les nouveaux messages, les déchiffre et
/// les met « en attente » (sans rien importer). Renvoie les nouveaux éléments.
#[tauri::command]
pub async fn boite_relever(db: State<'_, Db>, ami_id: String) -> R<Vec<BoiteItem>> {
    let ctx = contexte(&db, &ami_id)?;
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let mon_pub = STANDARD.encode(ctx.pub_);
    let deja = { let c = db.0.lock().map_err(e)?; lire_recus(&c)? };

    let cl = client(&ctx.cfg);
    let prefix = format!("mailbox/{}/", ctx.mid);
    let liste = cl.list_objects_v2().bucket(&ctx.cfg.bucket).prefix(&prefix).send().await
        .map_err(|er| format!("Liste : {er}"))?;

    // (clé S3, kind, de_nom, titre, ts, payload JSON déchiffré)
    let mut recues: Vec<(String, String, String, String, String, String)> = Vec::new();
    for obj in liste.contents() {
        let Some(k) = obj.key() else { continue };
        if deja.contains(k) { continue; }
        let resp = cl.get_object().bucket(&ctx.cfg.bucket).key(k).send().await
            .map_err(|er| format!("Téléchargement : {er}"))?;
        let bytes = resp.body.collect().await.map_err(e)?.into_bytes();
        let clear = match dechiffrer(&key, bytes.as_ref()) { Ok(c) => c, Err(_) => continue };
        let meta: EnvMeta = match serde_json::from_slice(&clear) { Ok(v) => v, Err(_) => continue };
        if meta.de == mon_pub || !matches!(meta.kind.as_str(), "sequence" | "projet" | "programmation") { continue; }
        let titre = titre_payload(&meta.kind, &clear);
        let payload = String::from_utf8_lossy(&clear).into_owned();
        recues.push((k.to_string(), meta.kind, meta.nom, titre, meta.ts, payload));
    }

    let mut out = Vec::new();
    let c = db.0.lock().map_err(e)?;
    let now = chrono::Utc::now().to_rfc3339();
    for (k, kind, de_nom, titre, ts, payload) in recues {
        let id = uuid::Uuid::new_v4().to_string();
        c.execute(
            "INSERT INTO boite_recue (id, type, de_nom, titre, ts, payload, recu_le) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![id, kind, de_nom, titre, ts, payload, now],
        ).map_err(e)?;
        c.execute("INSERT OR IGNORE INTO sync_recus (cle, date) VALUES (?1, ?2)", params![k, now]).ok();
        out.push(BoiteItem { id, kind, de_nom, titre, ts });
    }
    Ok(out)
}

/// Liste les éléments en attente dans la boîte de réception.
#[tauri::command]
pub fn boite_liste(db: State<Db>) -> R<Vec<BoiteItem>> {
    let c = db.0.lock().map_err(e)?;
    let mut st = c.prepare("SELECT id, type, de_nom, titre, ts FROM boite_recue ORDER BY recu_le DESC").map_err(e)?;
    let rows = st.query_map([], |r| Ok(BoiteItem {
        id: r.get(0)?, kind: r.get(1)?, de_nom: r.get(2)?, titre: r.get(3)?, ts: r.get(4)?,
    })).map_err(e)?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(e)
}

/// Récupère (importe) un élément en attente puis le retire de la boîte.
#[tauri::command]
pub fn boite_recuperer(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    let (kind, payload): (String, String) = c
        .query_row("SELECT type, payload FROM boite_recue WHERE id = ?1", [&id], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| "Élément introuvable.".to_string())?;
    match kind.as_str() {
        "sequence" => { importer_sequence(&c, serde_json::from_str(&payload).map_err(e)?)?; }
        "projet" => { importer_projet(&c, serde_json::from_str(&payload).map_err(e)?)?; }
        "programmation" => { importer_programmation(&c, serde_json::from_str(&payload).map_err(e)?)?; }
        _ => return Err("Type inconnu.".into()),
    }
    c.execute("DELETE FROM boite_recue WHERE id = ?1", [&id]).map_err(e)?;
    Ok(())
}

/// Jette un élément en attente sans l'importer.
#[tauri::command]
pub fn boite_supprimer(db: State<Db>, id: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    c.execute("DELETE FROM boite_recue WHERE id = ?1", [&id]).map_err(e)?;
    Ok(())
}

// ── Partage de la programmation finale ──────────────────────────────────────

fn lire_programmation(c: &Connection, annee: &str) -> R<ProgrammationFinale> {
    c.query_row("SELECT * FROM programmations_finale WHERE annee = ?1 AND est_importee = 0 LIMIT 1",
        [annee], ProgrammationFinale::from_row)
        .map_err(|_| "Aucune programmation à partager pour cette année.".to_string())
}

#[tauri::command]
pub async fn programmation_partager(db: State<'_, Db>, ami_id: String, annee: String) -> R<()> {
    let ctx = contexte(&db, &ami_id)?;
    let prog = { let c = db.0.lock().map_err(e)?; lire_programmation(&c, &annee)? };
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let env = EnvProg {
        de: STANDARD.encode(ctx.pub_), nom: ctx.nom.clone(),
        ts: chrono::Utc::now().to_rfc3339(), kind: "programmation".into(), programmation: prog,
    };
    let blob = chiffrer(&key, &serde_json::to_vec(&env).map_err(e)?)?;
    let nom_objet = format!("mailbox/{}/prog-{}-{}.bin", ctx.mid, chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    client(&ctx.cfg)
        .put_object().bucket(&ctx.cfg.bucket).key(&nom_objet).body(ByteStream::from(blob)).send().await
        .map_err(|er| format!("Partage : {er}"))?;
    Ok(())
}

/// Importe une programmation reçue (colonne « importée » pour comparaison).
fn importer_programmation(c: &Connection, env: EnvProg) -> R<String> {
    let mut p = env.programmation;
    let annee = p.annee.clone();
    p.id = uuid::Uuid::new_v4().to_string();
    p.est_importee = true;
    c.execute(
        "INSERT OR REPLACE INTO programmations_finale (id,annee,lignes_json,niveau,enseignant,est_importee)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![p.id, p.annee, p.lignes_json, p.niveau, p.enseignant, p.est_importee as i64],
    ).map_err(e)?;
    Ok(annee)
}

// ── Partage de projets (projet + ses séquences) ─────────────────────────────

fn lire_image_fichier(nom: &Option<String>) -> Option<String> {
    let n = nom.as_deref().filter(|n| !n.is_empty())?;
    std::fs::read(fichiers_dir().join(n)).ok().map(|b| STANDARD.encode(b))
}

fn lire_projet(c: &Connection, projet_id: &str) -> R<(Projet, Vec<SeqBundle>)> {
    let projet = c.query_row("SELECT * FROM projets WHERE id = ?1", [projet_id], Projet::from_row)
        .map_err(|_| "Projet introuvable.".to_string())?;
    let mut st = c.prepare("SELECT * FROM sequences WHERE projet_id = ?1").map_err(e)?;
    let seqs: Vec<Sequence> = st.query_map([projet_id], Sequence::from_row).map_err(e)?
        .collect::<rusqlite::Result<Vec<_>>>().map_err(e)?;
    drop(st);
    let mut bundles = Vec::new();
    for seq in seqs {
        let mut sts = c.prepare("SELECT * FROM seances WHERE sequence_id = ?1 ORDER BY numero").map_err(e)?;
        let seances: Vec<Seance> = sts.query_map([&seq.id], Seance::from_row).map_err(e)?
            .collect::<rusqlite::Result<Vec<_>>>().map_err(e)?;
        drop(sts);
        let image_b64 = lire_image_fichier(&seq.image_nom);
        bundles.push(SeqBundle { sequence: seq, seances, image_b64 });
    }
    Ok((projet, bundles))
}

#[tauri::command]
pub async fn projet_partager(db: State<'_, Db>, ami_id: String, projet_id: String) -> R<()> {
    let ctx = contexte(&db, &ami_id)?;
    let (projet, sequences) = { let c = db.0.lock().map_err(e)?; lire_projet(&c, &projet_id)? };
    let projet_image_b64 = lire_image_fichier(&projet.image_nom);
    let key = cle_paire(ctx.priv_, ctx.ami_pub, &ctx.mid);
    let env = EnvProjet {
        de: STANDARD.encode(ctx.pub_), nom: ctx.nom.clone(),
        ts: chrono::Utc::now().to_rfc3339(), kind: "projet".into(),
        projet, projet_image_b64, sequences,
    };
    let blob = chiffrer(&key, &serde_json::to_vec(&env).map_err(e)?)?;
    let nom_objet = format!("mailbox/{}/projet-{}-{}.bin", ctx.mid, chrono::Utc::now().timestamp_millis(), uuid::Uuid::new_v4());
    client(&ctx.cfg)
        .put_object().bucket(&ctx.cfg.bucket).key(&nom_objet).body(ByteStream::from(blob)).send().await
        .map_err(|er| format!("Partage : {er}"))?;
    Ok(())
}

/// Importe un projet reçu : nouveau projet + ses séquences rattachées.
fn importer_projet(c: &Connection, env: EnvProjet) -> R<String> {
    let mut p = env.projet;
    let titre = p.titre.clone();
    let new_projet = uuid::Uuid::new_v4().to_string();
    p.id = new_projet.clone();
    p.date_creation = chrono::Utc::now().to_rfc3339();
    let ext = p.image_nom.as_deref()
        .and_then(|n| std::path::Path::new(n).extension().and_then(|x| x.to_str()))
        .unwrap_or("png").to_string();
    p.image_nom = env.projet_image_b64.and_then(|b| ecrire_image(&b, &ext));
    c.execute(
        "INSERT OR REPLACE INTO projets (id,titre,descriptif,couleur,date_creation,annee,image_nom)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![p.id, p.titre, p.descriptif, p.couleur, p.date_creation, p.annee, p.image_nom],
    ).map_err(e)?;
    for b in env.sequences {
        inserer_sequence(c, b.sequence, b.seances, b.image_b64, Some(new_projet.clone()))?;
    }
    Ok(titre)
}
