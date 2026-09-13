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
use crate::models::{ProgrammationFinale, Seance, Sequence};
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

/// Une séquence empaquetée (dans un projet partagé par une ancienne version).
#[derive(Serialize, Deserialize)]
struct SeqBundle { sequence: Sequence, seances: Vec<Seance>, #[serde(default)] image_b64: Option<String> }

/// Enveloppe d'un projet partagé.
///
/// Les projets ont disparu, mais un ami resté sur une ancienne version peut
/// encore en envoyer : on en garde les séquences, seul le regroupement se perd.
#[derive(Deserialize)]
struct EnvProjet {
    projet: ProjetRecu, sequences: Vec<SeqBundle>,
}

#[derive(Deserialize)]
struct ProjetRecu { #[serde(default)] titre: String }

struct Ctx { priv_: [u8; 32], pub_: [u8; 32], nom: String, ami_pub: [u8; 32], mid: String, cfg: S3Cfg }

fn vers_32(v: Vec<u8>) -> R<[u8; 32]> {
    <[u8; 32]>::try_from(v.as_slice()).map_err(|_| "clé de taille invalide".to_string())
}

fn set_setting(c: &Connection, cle: &str, valeur: &str) -> R<()> {
    c.execute(
        "INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)",
        params![cle, valeur],
    ).map_err(e)?;
    Ok(())
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
        // Le message nomme l'écran où agir : le stockage s'est déplacé dans
        // les Réglages, et renvoyer vers un onglet qui n'en parle plus laissait
        // l'enseignant chercher.
        return Err("Aucun stockage configuré. Réglages → Données & synchro → \
                    Sauvegarde sur mon stockage.".into());
    }
    Ok(cfg)
}

/// Lit identité + ami + config en une fois, puis relâche le verrou (rien d'async
/// ne doit conserver le MutexGuard).
fn contexte(db: &State<Db>, ami_id: &str) -> R<Ctx> {
    let c = db.0.lock().map_err(e)?;
    let (pv, pb): (Vec<u8>, Vec<u8>) = c
        .query_row("SELECT cle_privee, cle_publique FROM identite WHERE id = 1", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|_| "Identité absente — ouvrez la page Amis d'abord.".to_string())?;
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
    ecrire_cfg(&c, &endpoint, &region, &bucket, &access, secret.as_deref())
}

/// Écrit la configuration du stockage. Partagée avec l'appariement, qui pose
/// exactement les mêmes réglages depuis un code.
fn ecrire_cfg(c: &Connection, endpoint: &str, region: &str, bucket: &str,
              access: &str, secret: Option<&str>) -> R<()> {
    let set = |k: &str, v: &str| {
        c.execute("INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)", params![k, v]).ok();
    };
    set("sync_endpoint", endpoint.trim());
    set("sync_region", region.trim());
    set("sync_bucket", bucket.trim());
    set("sync_access", access.trim());
    // Un secret vide veut dire « garde celui déjà enregistré », pas « efface ».
    if let Some(s) = secret { if !s.trim().is_empty() { set("sync_secret", s.trim()); } }
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
        "INSERT INTO sequences (id,titre,matiere,cycle,objectifs,competences,competence_visee,image_nom,couleur,
          date_creation,periode,annee,rating_engagement,rating_facilite,rating_apprentissage,
          rating_date_maj,projet_id,video)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, matiere = excluded.matiere, cycle = excluded.cycle, objectifs = excluded.objectifs, competences = excluded.competences, competence_visee = excluded.competence_visee, image_nom = excluded.image_nom, couleur = excluded.couleur, date_creation = excluded.date_creation, periode = excluded.periode, annee = excluded.annee, rating_engagement = excluded.rating_engagement, rating_facilite = excluded.rating_facilite, rating_apprentissage = excluded.rating_apprentissage, rating_date_maj = excluded.rating_date_maj, projet_id = excluded.projet_id, video = excluded.video",
        params![s.id, s.titre, s.matiere, s.cycle, s.objectifs, s.competences, s.competence_visee,
                s.image_nom, s.couleur, s.date_creation, s.periode, s.annee, s.rating_engagement,
                s.rating_facilite, s.rating_apprentissage, s.rating_date_maj, s.projet_id, s.video],
    ).map_err(e)?;
    for mut se in seances {
        se.id = uuid::Uuid::new_v4().to_string();
        se.sequence_id = Some(new_seq.clone());
        c.execute(
            "INSERT INTO seances (id,titre,numero,objectifs,competences,deroulement,materiel,duree,date,
              tableau_deroulement,images_deroulement,bilan,bilan_date,sequence_id)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) ON CONFLICT(id) DO UPDATE SET titre = excluded.titre, numero = excluded.numero, objectifs = excluded.objectifs, competences = excluded.competences, deroulement = excluded.deroulement, materiel = excluded.materiel, duree = excluded.duree, date = excluded.date, tableau_deroulement = excluded.tableau_deroulement, images_deroulement = excluded.images_deroulement, bilan = excluded.bilan, bilan_date = excluded.bilan_date, sequence_id = excluded.sequence_id",
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
        "INSERT INTO programmations_finale (id,annee,lignes_json,niveau,enseignant,est_importee)
         VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET annee = excluded.annee, lignes_json = excluded.lignes_json, niveau = excluded.niveau, enseignant = excluded.enseignant, est_importee = excluded.est_importee",
        params![p.id, p.annee, p.lignes_json, p.niveau, p.enseignant, p.est_importee as i64],
    ).map_err(e)?;
    Ok(annee)
}

/// Importe un projet reçu d'une ancienne version : ses séquences seules.
fn importer_projet(c: &Connection, env: EnvProjet) -> R<String> {
    for b in env.sequences {
        inserer_sequence(c, b.sequence, b.seances, b.image_b64, None)?;
    }
    Ok(env.projet.titre)
}

// ── Sauvegarde personnelle chiffrée sur S3/MinIO ─────────────────────
// Réutilise la même config S3 (endpoint local MinIO aujourd'hui ; en ligne
// plus tard = juste l'endpoint qui change). Toute la base (export complet,
// fichiers joints inclus) est chiffrée avec une clé dérivée d'une phrase
// secrète, puis poussée comme un seul objet. Le stockage ne voit que du
// ciphertext — donc tes données élèves restent protégées même sur le NAS.

// ── Sauvegarde complète chiffrée ───────────────────────────────────────────

/// Préfixe des objets de sauvegarde. Le nom porte ensuite l'horodatage.
const PREFIXE_SAUVEGARDE: &str = "maitrize/sauvegarde-";
/// Ancien objet unique, écrasé à chaque envoi. Encore lu, jamais plus écrit.
const OBJET_SAUVEGARDE_V1: &str = "maitrize/sauvegarde.enc";
/// Nombre de sauvegardes conservées sur le stockage.
const SAUVEGARDES_DISTANTES: usize = 10;
/// Marqueur de format, en tête du blob chiffré.
const MAGIE_V2: &[u8; 4] = b"MZB2";

/// Dérive la clé de sauvegarde depuis la phrase secrète.
///
/// Argon2id et non HKDF. HKDF étire un secret **déjà aléatoire** — c'est le
/// bon outil pour la clé partagée X25519 entre amis, dont l'entropie vient de
/// la courbe. Une phrase choisie par un humain n'a pas cette entropie : qui
/// obtient le fichier chiffré peut énumérer les phrases probables, et une
/// dérivation instantanée lui permet d'en essayer des milliards. Argon2 rend
/// chaque essai coûteux en temps et en mémoire.
///
/// Le sel est tiré au hasard à chaque sauvegarde et voyage dans le blob :
/// deux sauvegardes de la même base ne donnent pas la même clé, et une table
/// précalculée ne sert à rien.
fn cle_sauvegarde_v2(phrase: &str, sel: &[u8]) -> R<[u8; 32]> {
    let mut cle = [0u8; 32];
    argon2::Argon2::default()
        .hash_password_into(phrase.as_bytes(), sel, &mut cle)
        .map_err(|_| "Dérivation de la clé impossible.".to_string())?;
    Ok(cle)
}

/// Ancienne dérivation, conservée pour relire les sauvegardes déjà envoyées.
fn cle_sauvegarde_v1(phrase: &str) -> [u8; 32] {
    let hk = Hkdf::<Sha256>::new(Some(b"maitrize-backup-salt-v1"), phrase.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(b"maitrize-backup-key-v1", &mut okm).expect("HKDF 32o");
    okm
}

/// Chiffre une sauvegarde : `MZB2 || sel(16) || nonce(24) || chiffré`.
fn chiffrer_sauvegarde(phrase: &str, clair: &[u8]) -> R<Vec<u8>> {
    let mut sel = [0u8; 16];
    OsRng.fill_bytes(&mut sel);
    let cle = cle_sauvegarde_v2(phrase, &sel)?;
    let mut out = Vec::with_capacity(4 + 16 + 24 + clair.len() + 16);
    out.extend_from_slice(MAGIE_V2);
    out.extend_from_slice(&sel);
    out.extend_from_slice(&chiffrer(&cle, clair)?);
    Ok(out)
}

/// Déchiffre une sauvegarde, quel que soit son format.
///
/// Une sauvegarde faite avant ce changement reste lisible : sans le marqueur
/// de tête, on retombe sur l'ancienne dérivation. Refuser de les ouvrir aurait
/// transformé une amélioration en perte de données.
fn dechiffrer_sauvegarde(phrase: &str, blob: &[u8]) -> R<Vec<u8>> {
    if blob.len() > 4 + 16 && &blob[..4] == MAGIE_V2 {
        let cle = cle_sauvegarde_v2(phrase, &blob[4..20])?;
        return dechiffrer(&cle, &blob[20..]);
    }
    dechiffrer(&cle_sauvegarde_v1(phrase), blob)
}

/// Horodatage de la dernière synchronisation réussie, dans les réglages.
const CLE_DERNIERE_SYNC: &str = "derniereSync";

/// Dernière écriture réelle dans la base, au format des noms de sauvegarde.
///
/// On regarde aussi le journal WAL : en mode WAL, le fichier principal ne
/// bouge qu'aux points de contrôle, si bien qu'une journée de saisie peut ne
/// pas le rajeunir. Ne regarder que lui ferait croire que rien n'a changé.
fn derniere_ecriture_locale() -> Option<String> {
    let base = crate::db::data_dir().join("maitrize.sqlite3");
    let wal = crate::db::data_dir().join("maitrize.sqlite3-wal");
    [base, wal]
        .iter()
        .filter_map(|p| std::fs::metadata(p).ok()?.modified().ok())
        .max()
        .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d-%H%M%S").to_string())
}

/// Ce que l'enseignant doit savoir en ouvrant l'application.
#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EtatSync {
    pub configure: bool,
    /// Du travail fait ici n'est pas encore parti.
    pub a_envoyer: bool,
    /// Une sauvegarde plus récente que la dernière synchro attend en ligne.
    pub a_recuperer: bool,
    /// Les deux à la fois : il faudra choisir, et l'un des deux sera perdu.
    pub conflit: bool,
    pub derniere_sync: String,
    pub derniere_distante: String,
    /// Renseigné quand le stockage n'a pas répondu : on ne prétend pas savoir.
    pub hors_ligne: String,
}

/// Décide, à partir de trois horodatages, dans quel sens va la copie.
///
/// Isolée du réseau et du disque pour être vérifiable : c'est elle qui, en se
/// trompant, ferait perdre une soirée de saisie.
///
/// Sans repère de synchronisation, on ne conclut rien : une base jamais
/// synchronisée n'a pas de « depuis quand ». Annoncer du travail à envoyer
/// dès la première ouverture apprendrait surtout à ignorer le bandeau.
fn decider(locale: &str, derniere_sync: &str, distante: &str) -> (bool, bool) {
    if derniere_sync.is_empty() {
        return (false, !distante.is_empty());
    }
    (
        !locale.is_empty() && locale > derniere_sync,
        !distante.is_empty() && distante > derniere_sync,
    )
}

/// Compare l'état local et l'état du stockage.
///
/// Aucune action : cette commande ne fait que regarder. C'est elle qui permet
/// de proposer le bon bouton — envoyer ou récupérer — au lieu de laisser
/// l'enseignant deviner dans quel sens va la copie.
#[tauri::command]
pub async fn sync_etat(db: State<'_, Db>) -> R<EtatSync> {
    let (cfg, derniere_sync) = {
        let c = db.0.lock().map_err(e)?;
        let derniere = get_setting(&c, CLE_DERNIERE_SYNC);
        match lire_cfg(&c) {
            Ok(cfg) => (cfg, derniere),
            // Stockage non configuré : ce n'est pas une erreur, juste un état.
            Err(_) => return Ok(EtatSync::default()),
        }
    };

    let locale = derniere_ecriture_locale().unwrap_or_default();
    let (a_envoyer, _) = decider(&locale, &derniere_sync, "");

    let distantes = match lister_distantes(&client(&cfg), &cfg).await {
        Ok(l) => l,
        Err(err) => {
            return Ok(EtatSync {
                configure: true,
                a_envoyer,
                derniere_sync,
                hors_ligne: format!("Stockage injoignable : {err}"),
                ..Default::default()
            })
        }
    };
    let derniere_distante = distantes.first().map(|s| s.date.clone()).unwrap_or_default();
    let (a_envoyer, a_recuperer) = decider(&locale, &derniere_sync, &derniere_distante);

    Ok(EtatSync {
        configure: true,
        a_envoyer,
        a_recuperer,
        conflit: a_envoyer && a_recuperer,
        derniere_sync,
        derniere_distante,
        hors_ligne: String::new(),
    })
}

/// Nom d'objet horodaté, trié chronologiquement par ordre alphabétique.
fn nom_sauvegarde() -> String {
    format!("{PREFIXE_SAUVEGARDE}{}.enc", chrono::Local::now().format("%Y-%m-%d-%H%M%S"))
}

/// Une sauvegarde présente sur le stockage.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SauvegardeDistante {
    pub cle: String,
    /// Date lisible tirée du nom, ou vide pour l'ancienne sauvegarde unique.
    pub date: String,
    pub octets: i64,
    /// Vrai si la base locale a été modifiée après cette sauvegarde.
    ///
    /// C'est le seul garde-fou d'un va-et-vient entre deux machines : restaurer
    /// une sauvegarde plus ancienne que son travail en cours efface ce travail
    /// sans rien demander. Mieux vaut le dire avant.
    pub travail_local_plus_recent: bool,
}

#[tauri::command]
pub async fn sauvegarde_push(db: State<'_, Db>) -> R<String> {
    let (cfg, phrase, json) = {
        let c = db.0.lock().map_err(e)?;
        let phrase = get_setting(&c, "sauvegarde_phrase");
        if phrase.trim().is_empty() {
            return Err("Définissez d'abord une phrase secrète de sauvegarde.".into());
        }
        let cfg = lire_cfg(&c)?;
        let json = crate::commands::export_json(&c)?;
        (cfg, phrase.trim().to_string(), json)
    };
    let taille = json.len();
    let blob = chiffrer_sauvegarde(&phrase, json.as_bytes())?;
    let cl = client(&cfg);
    let cle = nom_sauvegarde();
    cl.put_object()
        .bucket(&cfg.bucket)
        .key(&cle)
        .body(ByteStream::from(blob))
        .send()
        .await
        .map_err(|err| format!("Envoi vers le stockage échoué : {err}"))?;

    // Purge après coup : si elle échoue, la sauvegarde qu'on vient d'envoyer
    // est déjà en place. L'inverse aurait pu supprimer sans rien déposer.
    {
        let c = db.0.lock().map_err(e)?;
        let horodatage = cle.trim_start_matches(PREFIXE_SAUVEGARDE).trim_end_matches(".enc");
        set_setting(&c, CLE_DERNIERE_SYNC, horodatage)?;
    }
    let supprimees = purger_distantes(&cl, &cfg).await;
    Ok(format!(
        "✅ Sauvegarde envoyée ({} Ko){}.",
        taille / 1024,
        if supprimees > 0 { format!(", {supprimees} ancienne(s) retirée(s)") } else { String::new() }
    ))
}

/// Les sauvegardes du stockage, la plus récente d'abord.
async fn lister_distantes(cl: &Client, cfg: &S3Cfg) -> R<Vec<SauvegardeDistante>> {
    // Date de dernière écriture de la base locale, au même format que les noms
    // de sauvegarde, pour que la comparaison soit une simple comparaison de
    // chaînes.
    let date_locale = std::fs::metadata(crate::db::data_dir().join("maitrize.sqlite3"))
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d-%H%M%S").to_string());

    let resp = cl
        .list_objects_v2()
        .bucket(&cfg.bucket)
        .prefix("maitrize/")
        .send()
        .await
        .map_err(|err| format!("Lecture du stockage impossible : {err}"))?;
    let mut liste: Vec<SauvegardeDistante> = resp
        .contents()
        .iter()
        .filter_map(|o| {
            let cle = o.key()?.to_string();
            let ancienne = cle == OBJET_SAUVEGARDE_V1;
            if !ancienne && !cle.starts_with(PREFIXE_SAUVEGARDE) {
                return None;
            }
            let date = if ancienne {
                String::new()
            } else {
                cle.trim_start_matches(PREFIXE_SAUVEGARDE).trim_end_matches(".enc").to_string()
            };
            let travail_local_plus_recent = date_locale
                .as_deref()
                .is_some_and(|locale| !date.is_empty() && date.as_str() < locale);
            Some(SauvegardeDistante { cle, date, octets: o.size().unwrap_or(0), travail_local_plus_recent })
        })
        .collect();
    // Le nom porte l'horodatage : l'ordre alphabétique est l'ordre du temps.
    liste.sort_by(|a, b| b.cle.cmp(&a.cle));
    Ok(liste)
}

#[tauri::command]
pub async fn sauvegarde_liste(db: State<'_, Db>) -> R<Vec<SauvegardeDistante>> {
    let cfg = { let c = db.0.lock().map_err(e)?; lire_cfg(&c)? };
    lister_distantes(&client(&cfg), &cfg).await
}

/// Ne garde que les plus récentes. Renvoie le nombre de suppressions.
///
/// Écraser une sauvegarde unique, comme le faisait la version précédente,
/// laissait sans recours : sauvegarder une base abîmée effaçait la bonne
/// copie. Garder un historique est ce qui distingue une sauvegarde d'une
/// simple synchronisation.
async fn purger_distantes(cl: &Client, cfg: &S3Cfg) -> usize {
    let Ok(liste) = lister_distantes(cl, cfg).await else { return 0 };
    let trop: Vec<&SauvegardeDistante> = liste
        .iter()
        .filter(|s| s.cle != OBJET_SAUVEGARDE_V1)
        .skip(SAUVEGARDES_DISTANTES)
        .collect();
    let mut n = 0;
    for s in trop {
        if cl.delete_object().bucket(&cfg.bucket).key(&s.cle).send().await.is_ok() {
            n += 1;
        }
    }
    n
}

/// Restaure une sauvegarde : celle qu'on désigne, ou la plus récente.
#[tauri::command]
pub async fn sauvegarde_pull(db: State<'_, Db>, cle: Option<String>) -> R<String> {
    let (cfg, phrase) = {
        let c = db.0.lock().map_err(e)?;
        let phrase = get_setting(&c, "sauvegarde_phrase");
        if phrase.trim().is_empty() {
            return Err("Renseignez la phrase secrète de sauvegarde.".into());
        }
        (lire_cfg(&c)?, phrase.trim().to_string())
    };
    let cl = client(&cfg);
    let cible = match cle {
        Some(k) if !k.trim().is_empty() => k,
        _ => lister_distantes(&cl, &cfg)
            .await?
            .into_iter()
            .next()
            .map(|s| s.cle)
            .ok_or_else(|| "Aucune sauvegarde sur le stockage.".to_string())?,
    };
    let resp = cl
        .get_object()
        .bucket(&cfg.bucket)
        .key(&cible)
        .send()
        .await
        .map_err(|_| format!("Sauvegarde « {cible} » introuvable (ou accès refusé)."))?;
    let bytes = resp.body.collect().await.map_err(e)?.into_bytes();
    let clair = dechiffrer_sauvegarde(&phrase, bytes.as_ref())
        .map_err(|_| "Déchiffrement impossible — la phrase secrète ne correspond pas.".to_string())?;
    let json = String::from_utf8(clair).map_err(|_| "Sauvegarde corrompue.".to_string())?;
    {
        let c = db.0.lock().map_err(e)?;
        crate::commands::import_json(&c, &json)?;
        // L'import réécrit les réglages : le repère de synchro se pose après,
        // sinon il serait remplacé par celui de la machine d'origine.
        let horodatage = cible.trim_start_matches(PREFIXE_SAUVEGARDE).trim_end_matches(".enc");
        set_setting(&c, CLE_DERNIERE_SYNC, horodatage)?;
    }
    Ok("✅ Sauvegarde restaurée. Rechargez l'application pour voir les données.".into())
}

#[cfg(test)]
mod tests_sauvegarde {
    use super::*;

    #[test]
    fn un_aller_retour_rend_le_texte_dorigine() {
        let blob = chiffrer_sauvegarde("mon ours mange des myrtilles", b"{\"eleves\":[]}").unwrap();
        let clair = dechiffrer_sauvegarde("mon ours mange des myrtilles", &blob).unwrap();
        assert_eq!(clair, b"{\"eleves\":[]}");
    }

    #[test]
    fn une_mauvaise_phrase_ne_dechiffre_pas() {
        let blob = chiffrer_sauvegarde("bonne phrase", b"secret").unwrap();
        assert!(dechiffrer_sauvegarde("mauvaise phrase", &blob).is_err());
    }

    #[test]
    fn deux_sauvegardes_identiques_donnent_des_blobs_differents() {
        // Sel tiré à chaque fois : sans cela, le stockage verrait que deux
        // sauvegardes ont le même contenu.
        let a = chiffrer_sauvegarde("phrase", b"meme contenu").unwrap();
        let b = chiffrer_sauvegarde("phrase", b"meme contenu").unwrap();
        assert_ne!(a, b);
        assert_eq!(dechiffrer_sauvegarde("phrase", &a).unwrap(),
                   dechiffrer_sauvegarde("phrase", &b).unwrap());
    }

    #[test]
    fn une_ancienne_sauvegarde_reste_lisible() {
        // Le changement de dérivation ne doit pas rendre illisible ce qui est
        // déjà sur le stockage.
        let ancien = chiffrer(&cle_sauvegarde_v1("phrase"), b"donnees v1").unwrap();
        assert_eq!(dechiffrer_sauvegarde("phrase", &ancien).unwrap(), b"donnees v1");
    }

    #[test]
    fn le_format_annonce_sa_version() {
        let blob = chiffrer_sauvegarde("phrase", b"x").unwrap();
        assert_eq!(&blob[..4], MAGIE_V2);
        assert!(blob.len() > 4 + 16 + 24);
    }

    #[test]
    fn le_nom_dune_sauvegarde_se_trie_chronologiquement() {
        let nom = nom_sauvegarde();
        assert!(nom.starts_with(PREFIXE_SAUVEGARDE) && nom.ends_with(".enc"), "{nom}");
        // AAAA-MM-JJ-HHMMSS : comparer les chaînes revient à comparer les dates.
        let date = nom.trim_start_matches(PREFIXE_SAUVEGARDE).trim_end_matches(".enc");
        assert_eq!(date.len(), 17, "{date}");
        assert!(date < "2100-01-01-000000");
    }

    /// Aller-retour complet contre un vrai serveur S3, que seul un essai réel
    /// peut valider : lecture du listing, ordre chronologique, purge.
    ///   MAITRIZE_S3=http://127.0.0.1:9100 MAITRIZE_S3_CLE=… MAITRIZE_S3_SECRET=… \
    ///   cargo test aller_retour_s3 -- --ignored --nocapture
    #[tokio::test]
    #[ignore]
    async fn aller_retour_s3() {
        let Ok(endpoint) = std::env::var("MAITRIZE_S3") else { return };
        let cfg = S3Cfg {
            endpoint,
            region: "us-east-1".into(),
            bucket: std::env::var("MAITRIZE_S3_BUCKET").unwrap_or_else(|_| "maitrize".into()),
            access: std::env::var("MAITRIZE_S3_CLE").unwrap_or_default(),
            secret: std::env::var("MAITRIZE_S3_SECRET").unwrap_or_default(),
        };
        let cl = client(&cfg);
        cl.create_bucket().bucket(&cfg.bucket).send().await.ok();

        // Déposer douze sauvegardes horodatées, une de plus que la limite.
        for i in 0..12 {
            let cle = format!("{PREFIXE_SAUVEGARDE}2026-09-12-1200{i:02}.enc");
            let blob = chiffrer_sauvegarde("phrase de test", format!("{{\"n\":{i}}}").as_bytes()).unwrap();
            cl.put_object().bucket(&cfg.bucket).key(&cle)
                .body(ByteStream::from(blob)).send().await.expect("dépôt");
        }

        let liste = lister_distantes(&cl, &cfg).await.expect("listing");
        assert_eq!(liste.len(), 12, "les douze doivent être vues");
        assert!(liste[0].cle > liste[1].cle, "la plus récente doit venir en tête");
        assert!(liste[0].octets > 0, "la taille doit remonter");

        let supprimees = purger_distantes(&cl, &cfg).await;
        assert_eq!(supprimees, 12 - SAUVEGARDES_DISTANTES);
        let apres = lister_distantes(&cl, &cfg).await.expect("listing");
        assert_eq!(apres.len(), SAUVEGARDES_DISTANTES, "la purge garde les plus récentes");
        assert_eq!(apres[0].cle, liste[0].cle, "la plus récente survit");

        // Relire vraiment le contenu de la plus récente.
        let obj = cl.get_object().bucket(&cfg.bucket).key(&apres[0].cle).send().await.expect("lecture");
        let octets = obj.body.collect().await.unwrap().into_bytes();
        let clair = dechiffrer_sauvegarde("phrase de test", octets.as_ref()).expect("déchiffrement");
        assert_eq!(String::from_utf8(clair).unwrap(), "{\"n\":11}");

        for s in apres { cl.delete_object().bucket(&cfg.bucket).key(&s.cle).send().await.ok(); }
        println!("aller-retour S3 validé sur {}", cfg.bucket);
    }

    #[test]
    fn sans_repere_on_ne_reclame_pas_denvoi() {
        // Première ouverture : rien n'a jamais été synchronisé, donc rien ne
        // permet de dire que du travail attend d'être envoyé.
        assert_eq!(decider("2026-09-12-100000", "", ""), (false, false));
        // En revanche une sauvegarde existante mérite d'être proposée.
        assert_eq!(decider("2026-09-12-100000", "", "2026-09-11-200000"), (false, true));
    }

    #[test]
    fn du_travail_local_apres_la_synchro_est_a_envoyer() {
        assert_eq!(decider("2026-09-12-180000", "2026-09-12-090000", "2026-09-12-090000"), (true, false));
    }

    #[test]
    fn une_sauvegarde_plus_recente_est_a_recuperer() {
        assert_eq!(decider("2026-09-12-090000", "2026-09-12-090000", "2026-09-12-200000"), (false, true));
    }

    #[test]
    fn les_deux_cotes_modifies_donnent_un_conflit() {
        let (envoyer, recuperer) = decider("2026-09-12-180000", "2026-09-12-090000", "2026-09-12-200000");
        assert!(envoyer && recuperer, "les deux doivent être signalés");
    }

    #[test]
    fn rien_a_faire_quand_tout_colle() {
        assert_eq!(decider("2026-09-12-090000", "2026-09-12-090000", "2026-09-12-090000"), (false, false));
    }

    #[test]
    fn une_sauvegarde_anterieure_a_la_synchro_ne_se_propose_pas() {
        // Elle existe, mais on l'a déjà dépassée : la reproposer ferait
        // revenir en arrière.
        assert_eq!(decider("2026-09-12-090000", "2026-09-12-090000", "2026-09-01-080000"), (false, false));
    }

    /// Le trajet complet d'un changement : journal → JSON → chiffrement →
    /// déchiffrement → JSON → application. Les tests du journal valident la
    /// fusion, celui-ci valide que rien ne se perd en chemin — notamment le
    /// champ `avant`, sans lequel la fusion champ par champ redeviendrait une
    /// fusion ligne par ligne, en silence.
    #[test]
    fn un_changement_survit_au_trajet_chiffre() {
        use crate::journal::{appliquer, changements_locaux, creer_table, poser_declencheurs, Changement};
        let neuve = |nom: &str| {
            let c = Connection::open_in_memory().unwrap();
            c.execute_batch("CREATE TABLE eleves (id TEXT PRIMARY KEY, nom TEXT, niveau TEXT);").unwrap();
            creer_table(&c);
            poser_declencheurs(&c, nom);
            c
        };
        let a = neuve("A");
        let mut b = neuve("B");
        a.execute("INSERT INTO eleves (id, nom, niveau) VALUES ('e1','Quang','CE2')", []).unwrap();
        a.execute("UPDATE eleves SET niveau='CM1' WHERE id='e1'", []).unwrap();

        let (locaux, _) = changements_locaux(&a, 0).unwrap();
        assert!(locaux.iter().any(|c| !c.avant.is_empty()), "l'état d'avant doit être enregistré");

        let json = serde_json::to_string(&locaux).unwrap();
        let blob = chiffrer_sauvegarde("phrase de test", json.as_bytes()).unwrap();
        let clair = dechiffrer_sauvegarde("phrase de test", &blob).unwrap();
        let recus: Vec<Changement> = serde_json::from_slice(&clair).unwrap();
        assert_eq!(recus.len(), locaux.len());
        assert_eq!(recus.last().unwrap().avant, locaux.last().unwrap().avant,
                   "le champ « avant » doit traverser le chiffrement");

        appliquer(&mut b, &recus).unwrap();
        let niveau: String = b.query_row("SELECT niveau FROM eleves WHERE id='e1'", [], |r| r.get(0)).unwrap();
        assert_eq!(niveau, "CM1");
    }

    #[test]
    fn un_code_dappairage_fait_laller_retour() {
        use base64::Engine;
        let code = CodeAppairage {
            endpoint: "http://192.168.1.20:9000".into(), region: "us-east-1".into(),
            bucket: "maitrize".into(), access: "cle".into(), secret: "secret".into(),
            phrase: "quatre mots sans rapport".into(),
        };
        let encode = base64::engine::general_purpose::STANDARD
            .encode(serde_json::to_string(&code).unwrap());
        let relu: CodeAppairage = serde_json::from_slice(
            &base64::engine::general_purpose::STANDARD.decode(&encode).unwrap()).unwrap();
        assert_eq!(relu.bucket, "maitrize");
        // La phrase voyage avec : sans elle, la seconde machine se
        // connecterait au bon endroit sans rien pouvoir déchiffrer, et
        // l'échec ressemblerait à « l'autre n'a rien modifié ».
        assert_eq!(relu.phrase, "quatre mots sans rapport");
    }

    #[test]
    fn un_code_abime_est_refuse_clairement() {
        use base64::Engine;
        // Recopié de travers : le message doit le dire, pas parler de JSON.
        assert!(base64::engine::general_purpose::STANDARD.decode("pas du base64 !!").is_err());
        let pas_maitrize = base64::engine::general_purpose::STANDARD.encode("{\"x\":1}");
        let octets = base64::engine::general_purpose::STANDARD.decode(pas_maitrize).unwrap();
        assert!(serde_json::from_slice::<CodeAppairage>(&octets).is_err());
    }

    #[test]
    fn la_plateforme_est_nommee_lisiblement() {
        assert!(["Windows", "macOS", "Linux"].contains(&plateforme()));
    }

    #[test]
    fn la_derivation_est_volontairement_lente() {
        // Si Argon2 devenait instantané, la phrase secrète ne protégerait plus
        // rien : une phrase courte s'énumère en quelques heures.
        let debut = std::time::Instant::now();
        cle_sauvegarde_v2("phrase", b"0123456789abcdef").unwrap();
        assert!(debut.elapsed() >= std::time::Duration::from_millis(10),
                "dérivation trop rapide : {:?}", debut.elapsed());
    }
}


// ── Synchronisation fine : transport des écarts ────────────────────────────
//
// Chaque machine dépose ses changements dans un journal partagé, sous forme
// d'objets horodatés qu'on n'écrase jamais. Chacune relit ceux qu'elle n'a pas
// encore vus. C'est un journal en ajout seul : pas d'état central à tenir à
// jour, donc rien à réparer si une machine s'arrête au mauvais moment.

const PREFIXE_DELTA: &str = "maitrize/deltas/";
/// Repère local : jusqu'où le journal a déjà été envoyé.
const CLE_SEQ_ENVOYEE: &str = "syncSeqEnvoyee";
/// Objets déjà relus, pour ne pas réappliquer en boucle.
const CLE_DELTAS_VUS: &str = "syncDeltasVus";
/// Nombre d'objets de deltas conservés sur le stockage.
const DELTAS_GARDES: usize = 400;

#[derive(Serialize, Deserialize)]
struct Lot {
    machine: String,
    changements: Vec<crate::journal::Changement>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResultatSync {
    pub envoyes: usize,
    pub recus: usize,
    pub appliques: usize,
    /// Renseigné quand rien n'a pu se faire : à afficher discrètement.
    pub message: String,
}

fn deltas_vus(c: &Connection) -> std::collections::HashSet<String> {
    serde_json::from_str::<Vec<String>>(&get_setting(c, CLE_DELTAS_VUS))
        .unwrap_or_default()
        .into_iter()
        .collect()
}

fn noter_vus(c: &Connection, vus: &std::collections::HashSet<String>) -> R<()> {
    // Bornée : les clés sont horodatées, les plus anciennes ne reviendront pas.
    let mut liste: Vec<&String> = vus.iter().collect();
    liste.sort();
    let garde: Vec<&&String> = liste.iter().rev().take(DELTAS_GARDES * 2).collect();
    let json = serde_json::to_string(&garde).map_err(e)?;
    set_setting(c, CLE_DELTAS_VUS, &json)
}

/// Envoie les changements locaux, relit ceux des autres machines, applique.
///
/// Les deux sens dans le même passage : c'est ce qui permet de l'appeler
/// périodiquement sans que l'enseignant ait à savoir dans quel sens va la
/// copie. Rien ne s'écrase — chaque machine ajoute au journal partagé.
#[tauri::command]
pub async fn sync_deltas(db: State<'_, Db>) -> R<ResultatSync> {
    let (cfg, phrase, machine, repere, vus, lot) = {
        let c = db.0.lock().map_err(e)?;
        let phrase = get_setting(&c, "sauvegarde_phrase");
        if phrase.trim().is_empty() {
            return Ok(ResultatSync { message: "Phrase secrète non définie.".into(), ..Default::default() });
        }
        let Ok(cfg) = lire_cfg(&c) else {
            return Ok(ResultatSync { message: "Stockage non configuré.".into(), ..Default::default() });
        };
        let machine = crate::db::identifiant_machine(&c);
        let depuis: i64 = get_setting(&c, CLE_SEQ_ENVOYEE).parse().unwrap_or(0);
        let (changements, repere) = crate::journal::changements_locaux(&c, depuis).map_err(e)?;
        (cfg, phrase.trim().to_string(), machine.clone(), repere, deltas_vus(&c),
         Lot { machine, changements })
    };

    let cl = client(&cfg);
    let mut res = ResultatSync::default();

    // 1. Déposer nos changements, s'il y en a.
    if !lot.changements.is_empty() {
        res.envoyes = lot.changements.len();
        let json = serde_json::to_string(&lot).map_err(e)?;
        let blob = chiffrer_sauvegarde(&phrase, json.as_bytes())?;
        let cle = format!(
            "{PREFIXE_DELTA}{}-{}.enc",
            chrono::Utc::now().format("%Y%m%d%H%M%S%3f"),
            &machine[..8.min(machine.len())]
        );
        cl.put_object().bucket(&cfg.bucket).key(&cle)
            .body(ByteStream::from(blob)).send().await
            .map_err(|err| format!("Envoi impossible : {err}"))?;
        // Le repère n'avance qu'après un dépôt réussi : une coupure fait
        // renvoyer, jamais perdre.
        let c = db.0.lock().map_err(e)?;
        set_setting(&c, CLE_SEQ_ENVOYEE, &repere.to_string())?;
    }

    // 2. Relire ce que les autres ont déposé.
    let liste = cl.list_objects_v2().bucket(&cfg.bucket).prefix(PREFIXE_DELTA)
        .send().await.map_err(|err| format!("Lecture impossible : {err}"))?;
    let mut cles: Vec<String> = liste.contents().iter()
        .filter_map(|o| o.key().map(str::to_string))
        .filter(|k| !vus.contains(k))
        .collect();
    cles.sort(); // horodatées : l'ordre alphabétique est l'ordre des écritures

    let mut vus = vus;
    let mut a_appliquer: Vec<crate::journal::Changement> = Vec::new();
    for cle in &cles {
        let Ok(obj) = cl.get_object().bucket(&cfg.bucket).key(cle).send().await else { continue };
        let Ok(octets) = obj.body.collect().await else { continue };
        let Ok(clair) = dechiffrer_sauvegarde(&phrase, octets.into_bytes().as_ref()) else { continue };
        let Ok(lot) = serde_json::from_slice::<Lot>(&clair) else { continue };
        // Nos propres dépôts : déjà chez nous, rien à appliquer.
        if lot.machine != machine {
            a_appliquer.extend(lot.changements);
        }
        vus.insert(cle.clone());
    }
    res.recus = a_appliquer.len();

    if !a_appliquer.is_empty() || !cles.is_empty() {
        let mut c = db.0.lock().map_err(e)?;
        if !a_appliquer.is_empty() {
            res.appliques = crate::journal::appliquer(&mut c, &a_appliquer).map_err(e)?;
        }
        noter_vus(&c, &vus)?;
        set_setting(&c, CLE_DERNIERE_SYNC,
                    &chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string())?;
    }

    // 3. Se signaler à l'autre machine : c'est ce qui rend la liaison visible
    // dans les réglages, et une configuration erronée repérable.
    {
        let m = {
            let c = db.0.lock().map_err(e)?;
            Machine {
                id: machine.clone(),
                nom: nom_machine(&c),
                plateforme: plateforme().into(),
                vue_le: chrono::Local::now().format("%Y-%m-%d-%H%M%S").to_string(),
                moi: false,
            }
        };
        publier_presence(&cl, &cfg, &phrase, &m).await;
    }

    // 4. Élaguer le journal partagé, qui n'a pas à grandir sans fin.
    if cles.len() > DELTAS_GARDES {
        let mut toutes: Vec<String> = liste.contents().iter()
            .filter_map(|o| o.key().map(str::to_string)).collect();
        toutes.sort();
        for vieille in toutes.iter().rev().skip(DELTAS_GARDES) {
            cl.delete_object().bucket(&cfg.bucket).key(vieille).send().await.ok();
        }
    }
    Ok(res)
}


// ── Pièces jointes ─────────────────────────────────────────────────────────
//
// Photos d'élèves, PDF, images de séances. Le journal transporte les lignes,
// pas les fichiers : une ligne peut donc arriver en désignant une image
// absente, et l'écran afficherait un cadre vide sans expliquer pourquoi.
//
// Ces fichiers ont une propriété qui simplifie tout : ils sont **immuables**.
// Remplacer la photo d'un élève écrit un nouveau fichier sous un nouveau nom
// plutôt que de modifier l'ancien. Il n'y a donc jamais de conflit à arbitrer,
// seulement des fichiers présents d'un côté et pas de l'autre.

const PREFIXE_FICHIER: &str = "maitrize/fichiers/";
/// Au-delà, on ne bloque pas la synchronisation sur un seul passage.
const FICHIERS_PAR_PASSAGE: usize = 20;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResultatFichiers {
    pub envoyes: usize,
    pub recus: usize,
    pub restants: usize,
    pub message: String,
}

fn fichiers_locaux() -> std::collections::HashSet<String> {
    std::fs::read_dir(crate::db::fichiers_dir())
        .map(|d| {
            d.flatten()
                .filter(|e| e.path().is_file())
                .filter_map(|e| e.file_name().to_str().map(str::to_string))
                // Les fichiers temporaires d'un téléchargement interrompu ne
                // doivent ni partir ni compter comme présents.
                .filter(|n| !n.starts_with('.') && !n.ends_with(".part"))
                .collect()
        })
        .unwrap_or_default()
}

/// Échange les pièces jointes manquantes de part et d'autre.
///
/// Chiffrées comme le reste : le stockage ne voit passer ni les photos
/// d'élèves ni les notifications MDPH en clair.
#[tauri::command]
pub async fn sync_fichiers(db: State<'_, Db>) -> R<ResultatFichiers> {
    let (cfg, phrase) = {
        let c = db.0.lock().map_err(e)?;
        let phrase = get_setting(&c, "sauvegarde_phrase");
        if phrase.trim().is_empty() {
            return Ok(ResultatFichiers { message: "Phrase secrète non définie.".into(), ..Default::default() });
        }
        let Ok(cfg) = lire_cfg(&c) else {
            return Ok(ResultatFichiers { message: "Stockage non configuré.".into(), ..Default::default() });
        };
        (cfg, phrase.trim().to_string())
    };

    let cl = client(&cfg);
    let ici = fichiers_locaux();
    let liste = cl.list_objects_v2().bucket(&cfg.bucket).prefix(PREFIXE_FICHIER)
        .send().await.map_err(|err| format!("Lecture impossible : {err}"))?;
    let la_bas: std::collections::HashSet<String> = liste.contents().iter()
        .filter_map(|o| o.key()?.strip_prefix(PREFIXE_FICHIER).map(str::to_string))
        .filter(|n| !n.is_empty())
        .collect();

    let mut res = ResultatFichiers::default();
    let dossier = crate::db::fichiers_dir();

    // 1. Déposer ce que nous avons et qu'eux n'ont pas.
    let a_envoyer: Vec<&String> = ici.difference(&la_bas).collect();
    res.restants = a_envoyer.len().saturating_sub(FICHIERS_PAR_PASSAGE);
    for nom in a_envoyer.into_iter().take(FICHIERS_PAR_PASSAGE) {
        let Ok(octets) = std::fs::read(dossier.join(nom)) else { continue };
        let blob = chiffrer_sauvegarde(&phrase, &octets)?;
        if cl.put_object().bucket(&cfg.bucket).key(format!("{PREFIXE_FICHIER}{nom}"))
            .body(ByteStream::from(blob)).send().await.is_ok() {
            res.envoyes += 1;
        }
    }

    // 2. Récupérer ce qu'ils ont et que nous n'avons pas.
    let a_recevoir: Vec<&String> = la_bas.difference(&ici).collect();
    res.restants += a_recevoir.len().saturating_sub(FICHIERS_PAR_PASSAGE);
    for nom in a_recevoir.into_iter().take(FICHIERS_PAR_PASSAGE) {
        let Ok(obj) = cl.get_object().bucket(&cfg.bucket).key(format!("{PREFIXE_FICHIER}{nom}"))
            .send().await else { continue };
        let Ok(corps) = obj.body.collect().await else { continue };
        let Ok(clair) = dechiffrer_sauvegarde(&phrase, corps.into_bytes().as_ref()) else { continue };
        // Écrire à côté puis renommer : une coupure ne doit pas laisser une
        // photo à demi écrite, qui passerait ensuite pour reçue.
        let tmp = dossier.join(format!("{nom}.part"));
        if std::fs::write(&tmp, &clair).is_ok() && std::fs::rename(&tmp, dossier.join(nom)).is_ok() {
            res.recus += 1;
        }
    }
    Ok(res)
}


// ── Mes appareils ──────────────────────────────────────────────────────────
//
// Deux machines se « connaissent » dès lors qu'elles pointent vers le même
// stockage avec la même phrase secrète. Il n'y a donc rien à apparier au sens
// cryptographique — la phrase est l'appariement.
//
// Ce qui manque n'est pas de la sécurité, c'est de la **confirmation** :
// savoir que l'autre ordinateur parle bien au même endroit, et quand il l'a
// fait pour la dernière fois. Sans cela, une configuration erronée ressemble
// exactement à « je n'ai rien modifié là-bas ».

const PREFIXE_MACHINE: &str = "maitrize/machines/";

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Machine {
    pub id: String,
    pub nom: String,
    pub plateforme: String,
    /// Dernière synchronisation, au format lisible.
    pub vue_le: String,
    #[serde(default)]
    pub moi: bool,
}

fn nom_machine(c: &Connection) -> String {
    let nom = get_setting(c, "nomMachine");
    if !nom.trim().is_empty() {
        return nom;
    }
    // À défaut, le nom réseau de l'ordinateur : plus parlant qu'un UUID.
    hostname().unwrap_or_else(|| "Cet ordinateur".into())
}

fn hostname() -> Option<String> {
    std::env::var("COMPUTERNAME") // Windows
        .or_else(|_| std::env::var("HOSTNAME")) // Linux
        .ok()
        .or_else(|| {
            // macOS : pas de variable d'environnement fiable.
            std::process::Command::new("scutil")
                .args(["--get", "ComputerName"])
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        })
        .filter(|s| !s.is_empty())
}

fn plateforme() -> &'static str {
    if cfg!(target_os = "windows") { "Windows" }
    else if cfg!(target_os = "macos") { "macOS" }
    else { "Linux" }
}

/// Signale à l'autre machine qu'on est passé par là.
async fn publier_presence(cl: &Client, cfg: &S3Cfg, phrase: &str, m: &Machine) {
    let Ok(json) = serde_json::to_string(m) else { return };
    let Ok(blob) = chiffrer_sauvegarde(phrase, json.as_bytes()) else { return };
    cl.put_object().bucket(&cfg.bucket).key(format!("{PREFIXE_MACHINE}{}.enc", m.id))
        .body(ByteStream::from(blob)).send().await.ok();
}

/// Les machines qui partagent ce stockage.
#[tauri::command]
pub async fn machines_liste(db: State<'_, Db>) -> R<Vec<Machine>> {
    let (cfg, phrase, moi) = {
        let c = db.0.lock().map_err(e)?;
        let phrase = get_setting(&c, "sauvegarde_phrase");
        let moi = Machine {
            id: crate::db::identifiant_machine(&c),
            nom: nom_machine(&c),
            plateforme: plateforme().into(),
            vue_le: get_setting(&c, CLE_DERNIERE_SYNC),
            moi: true,
        };
        if phrase.trim().is_empty() {
            return Ok(vec![moi]);
        }
        match lire_cfg(&c) {
            Ok(cfg) => (cfg, phrase.trim().to_string(), moi),
            Err(_) => return Ok(vec![moi]),
        }
    };

    let cl = client(&cfg);
    let mut sortie = vec![moi.clone()];
    if let Ok(liste) = cl.list_objects_v2().bucket(&cfg.bucket).prefix(PREFIXE_MACHINE).send().await {
        for o in liste.contents() {
            let Some(cle) = o.key() else { continue };
            let Ok(obj) = cl.get_object().bucket(&cfg.bucket).key(cle).send().await else { continue };
            let Ok(corps) = obj.body.collect().await else { continue };
            let Ok(clair) = dechiffrer_sauvegarde(&phrase, corps.into_bytes().as_ref()) else { continue };
            let Ok(mut m) = serde_json::from_slice::<Machine>(&clair) else { continue };
            if m.id == moi.id {
                continue; // c'est nous, déjà en tête
            }
            m.moi = false;
            sortie.push(m);
        }
    }
    Ok(sortie)
}

#[tauri::command]
pub fn machine_nom_set(db: State<Db>, nom: String) -> R<()> {
    let c = db.0.lock().map_err(e)?;
    set_setting(&c, "nomMachine", nom.trim())
}

// ── Appariement ────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
struct CodeAppairage {
    endpoint: String,
    region: String,
    bucket: String,
    access: String,
    secret: String,
    phrase: String,
}

/// Fabrique le code à saisir sur l'autre ordinateur.
///
/// Il porte tout ce qu'il faut pour rejoindre le même stockage, y compris la
/// phrase secrète : sans elle, la seconde machine se connecterait au bon
/// endroit sans pouvoir rien déchiffrer — un échec silencieux, qui ressemble
/// à « l'autre n'a rien modifié ».
///
/// Il est donc aussi sensible qu'un mot de passe, et l'écran le dit.
#[tauri::command]
pub fn appairage_code(db: State<Db>) -> R<String> {
    use base64::Engine;
    let c = db.0.lock().map_err(e)?;
    let cfg = lire_cfg(&c)?;
    let phrase = get_setting(&c, "sauvegarde_phrase");
    if phrase.trim().is_empty() {
        return Err("Définissez d'abord une phrase secrète de sauvegarde.".into());
    }
    let code = CodeAppairage {
        endpoint: cfg.endpoint, region: cfg.region, bucket: cfg.bucket,
        access: cfg.access, secret: cfg.secret, phrase: phrase.trim().into(),
    };
    let json = serde_json::to_string(&code).map_err(e)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(json))
}

/// Applique un code reçu de l'autre ordinateur.
#[tauri::command]
pub fn appairage_appliquer(db: State<Db>, code: String) -> R<()> {
    use base64::Engine;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(code.trim())
        .map_err(|_| "Ce code est incomplet ou mal recopié.".to_string())?;
    let c: CodeAppairage = serde_json::from_slice(&octets)
        .map_err(|_| "Ce code ne vient pas de Maitrize.".to_string())?;
    let conn = db.0.lock().map_err(e)?;
    ecrire_cfg(&conn, &c.endpoint, &c.region, &c.bucket, &c.access, Some(&c.secret))?;
    set_setting(&conn, "sauvegarde_phrase", &c.phrase)
}
