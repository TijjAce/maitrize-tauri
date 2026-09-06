//! Passerelle Assistant IA → API Mistral (en ligne, hébergée).
//! La clé API est stockée dans la table `settings` (clé `mistralApiKey`).

use crate::db::Db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{State, Emitter, AppHandle};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String, // "system" | "user" | "assistant"
    pub content: String,
}

/// Modèle par défaut quand la fenêtre n'en impose pas.
///
/// Ministral 8B est servi à tous les comptes, abonnement gratuit compris.
/// Les modèles « large » et « medium » ne le sont pas : les prendre par
/// défaut faisait échouer l'assistant chez qui n'y a pas droit.
pub(crate) const MODELE_DEFAUT: &str = "ministral-8b-latest";

/// Nombre de réessais après un refus passager pour cause de débit.
const REESSAIS_429: u32 = 3;

/// Attente avant le n-ième réessai : 1 s, 2 s, 4 s.
fn attente_avant_reessai(essai: u32) -> std::time::Duration {
    std::time::Duration::from_millis(1000u64 << (essai.saturating_sub(1).min(3)))
}

#[derive(Serialize)]
struct MistralRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
}

#[derive(Deserialize)]
struct MistralResponse {
    choices: Vec<MistralChoice>,
}

#[derive(Deserialize)]
struct MistralChoice {
    message: ChatMessage,
}

/// Traduit une erreur de l'API en message actionnable.
///
/// L'API renvoie un JSON technique en anglais ; affiché tel quel, il n'aide
/// pas à savoir quoi faire. Les trois cas courants ont une réponse concrète.
pub(crate) fn message_erreur(code: u16, corps: &str, quota_minute: Option<u64>) -> String {
    let type_err = serde_json::from_str::<serde_json::Value>(corps)
        .ok()
        .and_then(|v| v.get("type").and_then(|t| t.as_str()).map(str::to_string))
        .unwrap_or_default();
    match (code, type_err.as_str()) {
        (403, "tier_not_allowed") | (403, _) if corps.contains("subscription tier") =>
            "Ce modèle n'est pas inclus dans votre abonnement Mistral. \
             Choisissez-en un autre dans Réglages → Assistant IA (les modèles Ministral \
             fonctionnent sur tous les comptes)."
                .to_string(),
        // Mistral annonce « Rate limit exceeded » aussi bien pour une rafale
        // passagère que pour un modèle auquel l'abonnement n'a pas droit : dans
        // ce second cas l'en-tête plafonne les requêtes à zéro par minute, et
        // attendre ne sert à rien. Les deux situations n'appellent pas la même
        // réaction, le message doit donc les séparer.
        (429, _) if quota_minute == Some(0) =>
            "Votre abonnement Mistral n'autorise aucune requête sur ce modèle. \
             Attendre ne changera rien : choisissez un modèle Ministral dans \
             Réglages → Assistant IA, ou passez à un abonnement payant."
                .to_string(),
        (429, _) => "Trop de demandes d'affilée pour votre abonnement Mistral. \
                     Patientez quelques secondes avant de réessayer.".to_string(),
        (401, _) => "Clé API Mistral refusée. Vérifiez-la dans Réglages → Assistant IA.".to_string(),
        (402, _) => "Crédit Mistral épuisé. Vérifiez votre compte sur console.mistral.ai.".to_string(),
        (404, _) => "Ce modèle n'existe plus chez Mistral. \
                     Choisissez-en un autre dans Réglages → Assistant IA.".to_string(),
        _ => {
            let extrait: String = corps.chars().take(200).collect();
            format!("Mistral a refusé la demande (code {code}) : {extrait}")
        }
    }
}

/// Plafond de requêtes par minute annoncé par l'API pour ce modèle.
///
/// Vaut zéro quand l'abonnement ne donne pas accès au modèle : c'est ce qui
/// permet de ne pas conseiller d'attendre pour rien.
fn quota_minute(entetes: &reqwest::header::HeaderMap) -> Option<u64> {
    entetes
        .get("x-ratelimit-limit-req-minute")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.trim().parse().ok())
}

fn cle_mistral(db: &State<Db>) -> Result<String, String> {
    let c = db.0.lock().map_err(|e| e.to_string())?;
    let cle: Option<String> = c
        .query_row("SELECT valeur FROM settings WHERE cle='mistralApiKey'", params![],
                   |r| r.get(0))
        .ok();
    match cle {
        Some(k) if !k.trim().is_empty() => Ok(k),
        _ => Err("Clé API Mistral absente. Ajoutez-la dans Réglages.".into()),
    }
}

/// Envoie une conversation à Mistral et renvoie la réponse de l'assistant.
#[tauri::command]
pub async fn mistral_chat(
    db: State<'_, Db>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let cle = cle_mistral(&db)?;
    let model = model.unwrap_or_else(|| MODELE_DEFAUT.to_string());

    let body = MistralRequest {
        model,
        messages,
        temperature: Some(0.4),
    };

    let client = reqwest::Client::new();
    // Une rafale de requêtes (dicter puis classer, par exemple) dépasse le débit
    // autorisé et se solde par un 429 alors qu'une seconde d'attente suffisait.
    // On réessaie donc avant de déranger l'enseignant, sauf quand le quota est
    // nul : là, le refus est définitif et réessayer ne ferait que faire patienter.
    let mut essai = 0u32;
    let resp = loop {
        let resp = client
            .post("https://api.mistral.ai/v1/chat/completions")
            .bearer_auth(&cle)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Réseau : {e}"))?;

        if resp.status().is_success() {
            break resp;
        }
        let code = resp.status().as_u16();
        let quota = quota_minute(resp.headers());
        if code == 429 && quota != Some(0) && essai < REESSAIS_429 {
            essai += 1;
            tokio::time::sleep(attente_avant_reessai(essai)).await;
            continue;
        }
        let txt = resp.text().await.unwrap_or_default();
        return Err(message_erreur(code, &txt, quota));
    };

    let parsed: MistralResponse = resp.json().await.map_err(|e| format!("Réponse : {e}"))?;
    parsed
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "Réponse vide de Mistral".into())
}

/// Vérifie que la clé fonctionne (petit ping).
#[tauri::command]
pub async fn mistral_test(db: State<'_, Db>, model: Option<String>) -> Result<bool, String> {
    let _ = cle_mistral(&db)?;
    let msgs = vec![ChatMessage { role: "user".into(), content: "ping".into() }];
    mistral_chat(db, msgs, model).await.map(|_| true)
}

/// État d'un modèle pour le compte en cours : utilisable ou non, et pourquoi.
#[derive(Serialize, Clone)]
pub struct EtatModele {
    pub id: String,
    pub disponible: bool,
    pub detail: String,
}

/// Essaie chaque modèle et dit lequel répond.
///
/// L'API annonce dans `/v1/models` des modèles que l'abonnement refuse ensuite
/// à l'usage : seul un vrai appel tranche. Une requête d'un jeton par modèle
/// suffit, et l'écran des réglages peut alors montrer la liste utilisable.
#[tauri::command]
pub async fn mistral_modeles_disponibles(
    db: State<'_, Db>,
    modeles: Vec<String>,
) -> Result<Vec<EtatModele>, String> {
    let cle = cle_mistral(&db)?;
    let client = reqwest::Client::new();
    let mut etats = Vec::with_capacity(modeles.len());
    for id in modeles {
        let body = serde_json::json!({
            "model": id,
            "messages": [{ "role": "user", "content": "ping" }],
            "max_tokens": 1,
        });
        let rep = client
            .post("https://api.mistral.ai/v1/chat/completions")
            .bearer_auth(&cle)
            .json(&body)
            .send()
            .await;
        let etat = match rep {
            Ok(r) if r.status().is_success() => EtatModele { id, disponible: true, detail: "Disponible".into() },
            Ok(r) => {
                let code = r.status().as_u16();
                let quota = quota_minute(r.headers());
                let corps = r.text().await.unwrap_or_default();
                EtatModele { id, disponible: false, detail: message_erreur(code, &corps, quota) }
            }
            Err(e) => EtatModele { id, disponible: false, detail: format!("Réseau : {e}") },
        };
        etats.push(etat);
    }
    Ok(etats)
}

// ── Streaming (réponse au fil de l'eau via événements Tauri) ─────────────────
#[derive(Serialize, Clone)]
struct ChunkEvt { id: String, delta: String }
#[derive(Serialize, Clone)]
struct DoneEvt { id: String }
#[derive(Serialize, Clone)]
struct ErrEvt { id: String, message: String }

#[derive(Deserialize)]
struct StreamChunk { choices: Vec<StreamChoice> }
#[derive(Deserialize)]
struct StreamChoice { delta: Delta }
#[derive(Deserialize)]
struct Delta { content: Option<String> }

/// Variante streaming : émet `mistral://chunk` au fil des tokens, puis
/// `mistral://done` (ou `mistral://error`). Le frontend filtre par `request_id`.
#[tauri::command]
pub async fn mistral_chat_stream(
    app: AppHandle,
    db: State<'_, Db>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
    request_id: String,
) -> Result<(), String> {
    let cle = cle_mistral(&db)?;
    let model = model.unwrap_or_else(|| MODELE_DEFAUT.to_string());
    let body = serde_json::json!({ "model": model, "messages": messages, "temperature": 0.4, "stream": true });

    let envoyer_err = |msg: String| { let _ = app.emit("mistral://error", ErrEvt { id: request_id.clone(), message: msg.clone() }); msg };

    let mut resp = reqwest::Client::new()
        .post("https://api.mistral.ai/v1/chat/completions")
        .bearer_auth(&cle)
        .json(&body)
        .send().await
        .map_err(|e| envoyer_err(format!("Réseau : {e}")))?;

    if !resp.status().is_success() {
        let code = resp.status().as_u16();
        let quota = quota_minute(resp.headers());
        let txt = resp.text().await.unwrap_or_default();
        return Err(envoyer_err(message_erreur(code, &txt, quota)));
    }

    // Les données arrivent en SSE : lignes « data: {json} », séparées par \n.
    let mut buf = String::new();
    loop {
        match resp.chunk().await {
            Ok(Some(bytes)) => {
                buf.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buf.find('\n') {
                    let ligne: String = buf.drain(..=pos).collect();
                    let ligne = ligne.trim();
                    let Some(data) = ligne.strip_prefix("data:") else { continue };
                    let data = data.trim();
                    if data == "[DONE]" {
                        let _ = app.emit("mistral://done", DoneEvt { id: request_id.clone() });
                        return Ok(());
                    }
                    if let Ok(chunk) = serde_json::from_str::<StreamChunk>(data) {
                        if let Some(delta) = chunk.choices.into_iter().next().and_then(|c| c.delta.content) {
                            if !delta.is_empty() {
                                let _ = app.emit("mistral://chunk", ChunkEvt { id: request_id.clone(), delta });
                            }
                        }
                    }
                }
            }
            Ok(None) => break,
            Err(e) => return Err(envoyer_err(format!("Flux : {e}"))),
        }
    }
    let _ = app.emit("mistral://done", DoneEvt { id: request_id });
    Ok(())
}

// ── Transcription audio (dictée d'atelier) ───────────────────────────────
//
// L'audio part chez Mistral (Voxtral) et n'est jamais écrit sur le disque :
// il arrive en mémoire depuis la fenêtre, part dans la requête, et disparaît.
// L'écran appelant prévient l'enseignant avant tout enregistrement.

/// Transcrit un enregistrement audio en texte français.
///
/// `audio_b64` est le contenu du fichier encodé en base64 (webm/opus produit
/// par la fenêtre). Renvoie le texte brut, sans ponctuation garantie.
#[tauri::command]
pub async fn transcrire_audio(
    db: State<'_, Db>,
    audio_b64: String,
    nom_fichier: String,
) -> Result<String, String> {
    use base64::Engine;
    let cle = cle_mistral(&db)?;
    let octets = base64::engine::general_purpose::STANDARD
        .decode(audio_b64.as_bytes())
        .map_err(|e| format!("Audio illisible : {e}"))?;
    if octets.is_empty() {
        return Err("Enregistrement vide.".into());
    }

    let partie = reqwest::multipart::Part::bytes(octets)
        .file_name(nom_fichier)
        .mime_str("application/octet-stream")
        .map_err(|e| e.to_string())?;
    let formulaire = reqwest::multipart::Form::new()
        .text("model", "voxtral-mini-latest")
        .text("language", "fr")
        .part("file", partie);

    let rep = reqwest::Client::new()
        .post("https://api.mistral.ai/v1/audio/transcriptions")
        .bearer_auth(cle)
        .multipart(formulaire)
        .send()
        .await
        .map_err(|e| format!("Envoi impossible : {e}"))?;

    let statut = rep.status();
    let quota = quota_minute(rep.headers());
    let corps = rep.text().await.map_err(|e| e.to_string())?;
    if !statut.is_success() {
        return Err(message_erreur(statut.as_u16(), &corps, quota));
    }
    let json: serde_json::Value = serde_json::from_str(&corps)
        .map_err(|e| format!("Réponse illisible : {e}"))?;
    json.get("text")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .ok_or_else(|| "Réponse sans transcription.".to_string())
}


#[cfg(test)]
mod tests_erreurs {
    use super::message_erreur;

    // Le message brut de l'API ne dit pas quoi faire ; ces traductions si.

    #[test]
    fn explique_un_modele_hors_abonnement() {
        let corps = r#"{"object":"error","message":"This model is not available in your subscription tier","type":"tier_not_allowed","code":"1910"}"#;
        let m = message_erreur(403, corps, None);
        assert!(m.contains("abonnement"), "{m}");
        assert!(m.contains("Réglages"), "doit dire où changer de modèle : {m}");
        assert!(!m.contains("tier_not_allowed"), "le jargon ne doit pas ressortir : {m}");
    }

    #[test]
    fn explique_une_limite_de_debit() {
        let corps = r#"{"object":"error","message":"Rate limit exceeded","type":"rate_limited","code":"1300"}"#;
        let m = message_erreur(429, corps, None);
        assert!(m.contains("Patientez"), "{m}");
    }

    #[test]
    fn ne_conseille_pas_d_attendre_quand_le_quota_est_nul() {
        // Même corps que la limite passagère : seul l'en-tête les distingue.
        let corps = r#"{"object":"error","message":"Rate limit exceeded","type":"rate_limited","code":"1300"}"#;
        let m = message_erreur(429, corps, Some(0));
        assert!(!m.contains("Patientez"), "attendre ne sert à rien ici : {m}");
        assert!(m.contains("Réglages"), "doit renvoyer vers le choix du modèle : {m}");
    }

    #[test]
    fn les_reessais_espacent_les_tentatives() {
        use super::attente_avant_reessai;
        let d: Vec<u64> = (1..=3).map(|n| attente_avant_reessai(n).as_millis() as u64).collect();
        assert_eq!(d, vec![1000, 2000, 4000], "l'attente doit doubler à chaque essai");
    }

    #[test]
    fn explique_une_cle_refusee() {
        assert!(message_erreur(401, r#"{"message":"Unauthorized"}"#, None).contains("Clé API"));
    }

    #[test]
    fn reste_lisible_sur_un_code_inconnu() {
        // Cas non prévu : on garde un extrait, jamais la réponse entière.
        let m = message_erreur(500, &"x".repeat(1000), None);
        assert!(m.contains("code 500"), "{m}");
        assert!(m.len() < 300, "extrait trop long : {}", m.len());
    }
}
