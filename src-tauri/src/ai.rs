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
    let model = model.unwrap_or_else(|| "mistral-large-latest".to_string());

    let body = MistralRequest {
        model,
        messages,
        temperature: Some(0.4),
    };

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.mistral.ai/v1/chat/completions")
        .bearer_auth(cle)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Réseau : {e}"))?;

    if !resp.status().is_success() {
        let code = resp.status();
        let txt = resp.text().await.unwrap_or_default();
        return Err(format!("Mistral {code} : {txt}"));
    }

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
pub async fn mistral_test(db: State<'_, Db>) -> Result<bool, String> {
    let _ = cle_mistral(&db)?;
    let msgs = vec![ChatMessage { role: "user".into(), content: "ping".into() }];
    mistral_chat(db, msgs, Some("mistral-small-latest".into())).await.map(|_| true)
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
    let model = model.unwrap_or_else(|| "mistral-large-latest".to_string());
    let body = serde_json::json!({ "model": model, "messages": messages, "temperature": 0.4, "stream": true });

    let envoyer_err = |msg: String| { let _ = app.emit("mistral://error", ErrEvt { id: request_id.clone(), message: msg.clone() }); msg };

    let mut resp = reqwest::Client::new()
        .post("https://api.mistral.ai/v1/chat/completions")
        .bearer_auth(&cle)
        .json(&body)
        .send().await
        .map_err(|e| envoyer_err(format!("Réseau : {e}")))?;

    if !resp.status().is_success() {
        let code = resp.status();
        let txt = resp.text().await.unwrap_or_default();
        return Err(envoyer_err(format!("Mistral {code} : {txt}")));
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
