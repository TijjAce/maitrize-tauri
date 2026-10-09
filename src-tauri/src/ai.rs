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
    /// Ce que la réponse a coûté. Lu en JSON libre : voir `jetons_de`.
    #[serde(default)]
    usage: Option<serde_json::Value>,
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
    let c = db.lock();
    let cle = crate::sync::get_setting(&c, "mistralApiKey");
    if cle.trim().is_empty() {
        return Err("Clé API Mistral absente. Ajoutez-la dans Réglages.".into());
    }
    Ok(cle)
}

// ── Les jetons dépensés ────────────────────────────────────────────────────
//
// Mistral facture au jeton, et chaque réponse dit ce qu'elle a coûté. On les
// additionne, par mois, pour que les réglages montrent ce que l'IA a dépensé
// sans passer par console.mistral.ai — et leur équivalent en euros, au tarif
// public de chaque modèle : une estimation, pas une facture. Le compte est
// celui de cet ordinateur : il ne voyage ni par la synchronisation ni par une
// sauvegarde.

/// Réglage où s'additionnent les jetons de cet ordinateur.
pub const CLE_JETONS: &str = "mistralJetons";

/// Le dollar en euros, au cours de référence de la BCE du 1er octobre 2026 (1 € = 1,1298 $).
const EUROS_PAR_DOLLAR: f64 = 1.0 / 1.1298;

/// Le tarif public d'un modèle, en dollars par million de jetons, en entrée
/// et en sortie (mistral.ai/pricing/api, octobre 2026). Un modèle inconnu
/// prend celui du modèle par défaut, Ministral 8B.
fn tarif(modele: &str) -> (f64, f64) {
    let m = modele.to_ascii_lowercase();
    if m.contains("ministral-3b") {
        (0.10, 0.10)
    } else if m.contains("ministral-14b") {
        (0.20, 0.20)
    } else if m.contains("ministral") {
        (0.15, 0.15)
    } else if m.contains("small") {
        (0.15, 0.60)
    } else if m.contains("medium") {
        (1.5, 7.5)
    } else if m.contains("large") {
        (0.5, 1.5)
    } else {
        (0.15, 0.15)
    }
}

/// Une recherche sur le web se paie en plus des jetons : 30 $ les mille.
const DOLLARS_PAR_RECHERCHE: f64 = 0.03;
/// La transcription en ligne se paie à la minute d'audio, pas au jeton.
const DOLLARS_PAR_MINUTE_AUDIO: f64 = 0.003;

/// Le compte, tel que le réglage le garde.
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub(crate) struct Jetons {
    #[serde(default)]
    total: u64,
    /// Par mois : « 2026-10 » → jetons.
    #[serde(default)]
    mois: std::collections::BTreeMap<String, u64>,
    /// Le jour où le compte a commencé : avant, rien n'était compté.
    #[serde(default)]
    depuis: String,
    /// Par mois, leur équivalent en euros au tarif public.
    #[serde(default)]
    euros: std::collections::BTreeMap<String, f64>,
}

/// Ce qu'une réponse a coûté : ses jetons, et leur prix au tarif public.
#[derive(Default, Clone, Copy, Debug, PartialEq)]
pub(crate) struct Depense {
    pub jetons: u64,
    pub dollars: f64,
}

/// Un nombre du champ `usage`, lu sans exigence : un compte mal formé ne
/// doit jamais faire échouer la réponse qu'il accompagne.
fn nombre(u: &serde_json::Value, nom: &str) -> u64 {
    u.get(nom).and_then(|x| x.as_u64().or_else(|| x.as_f64().map(|f| f.max(0.0) as u64))).unwrap_or(0)
}

/// Les jetons qu'une réponse a coûtés, d'après son champ `usage`.
pub(crate) fn jetons_de(usage: Option<&serde_json::Value>) -> u64 {
    let Some(u) = usage else { return 0 };
    match nombre(u, "total_tokens") {
        0 => nombre(u, "prompt_tokens").saturating_add(nombre(u, "completion_tokens")),
        t => t,
    }
}

/// Ce qu'une réponse de texte a coûté avec ce modèle : l'entrée et la sortie n'ont pas le même prix.
pub(crate) fn depense_texte(usage: Option<&serde_json::Value>, modele: &str) -> Depense {
    let jetons = jetons_de(usage);
    let Some(u) = usage else { return Depense::default() };
    let (entree, sortie) = tarif(modele);
    let (question, reponse) = (nombre(u, "prompt_tokens"), nombre(u, "completion_tokens"));
    // Sans le détail, tout se compte au prix de l'entrée.
    let dollars = if question + reponse > 0 {
        (question as f64 * entree + reponse as f64 * sortie) / 1e6
    } else {
        jetons as f64 * entree / 1e6
    };
    Depense { jetons, dollars }
}

/// Ce qu'une transcription a coûté : ses jetons pour le compte, sa durée pour le prix.
pub(crate) fn depense_audio(usage: Option<&serde_json::Value>) -> Depense {
    let secondes = usage
        .and_then(|u| u.get("prompt_audio_seconds"))
        .and_then(|x| x.as_f64())
        .unwrap_or(0.0)
        .max(0.0);
    Depense { jetons: jetons_de(usage), dollars: secondes / 60.0 * DOLLARS_PAR_MINUTE_AUDIO }
}

/// Le mois d'un jour « AAAA-MM-JJ ».
fn mois_de(jour: &str) -> String {
    jour.get(..7).unwrap_or(jour).to_string()
}

/// Le compte, une dépense de plus, faite le `jour` (« AAAA-MM-JJ »).
pub(crate) fn ajouter_jetons(mut compte: Jetons, d: Depense, jour: &str) -> Jetons {
    if d.jetons == 0 && d.dollars <= 0.0 {
        return compte;
    }
    compte.total = compte.total.saturating_add(d.jetons);
    let mois = compte.mois.entry(mois_de(jour)).or_default();
    *mois = mois.saturating_add(d.jetons);
    *compte.euros.entry(mois_de(jour)).or_default() += d.dollars.max(0.0) * EUROS_PAR_DOLLAR;
    if compte.depuis.is_empty() {
        compte.depuis = jour.to_string();
    }
    compte
}

/// Les mois comptés avant qu'on chiffre en euros : estimés au prix du modèle par défaut.
pub(crate) fn avec_euros_estimes(mut compte: Jetons) -> Jetons {
    let (entree, _) = tarif(MODELE_DEFAUT);
    for (mois, jetons) in &compte.mois {
        compte.euros.entry(mois.clone()).or_insert(*jetons as f64 * entree / 1e6 * EUROS_PAR_DOLLAR);
    }
    compte
}

fn lire_jetons(c: &rusqlite::Connection) -> Jetons {
    avec_euros_estimes(serde_json::from_str(&crate::sync::get_setting(c, CLE_JETONS)).unwrap_or_default())
}

/// Ajoute au compte de cet ordinateur ce qu'une réponse a coûté.
fn noter_depense(db: &Db, d: Depense) {
    if d.jetons == 0 && d.dollars <= 0.0 {
        return;
    }
    let c = db.lock();
    let jour = chrono::Local::now().format("%Y-%m-%d").to_string();
    let compte = ajouter_jetons(lire_jetons(&c), d, &jour);
    if let Ok(json) = serde_json::to_string(&compte) {
        let _ = crate::sync::set_setting(&c, CLE_JETONS, &json);
    }
}

/// Ce que l'IA a dépensé sur cet ordinateur.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BilanJetons {
    pub ce_mois: u64,
    pub total: u64,
    /// « AAAA-MM-JJ », vide tant que rien n'a été compté.
    pub depuis: String,
    /// L'équivalent en euros, au tarif public de Mistral : une estimation.
    pub euros_ce_mois: f64,
    pub euros_total: f64,
}

#[tauri::command]
pub fn mistral_jetons(db: State<Db>) -> BilanJetons {
    let compte = lire_jetons(&db.lock());
    let mois = chrono::Local::now().format("%Y-%m").to_string();
    BilanJetons {
        ce_mois: compte.mois.get(&mois).copied().unwrap_or(0),
        total: compte.total,
        depuis: compte.depuis.clone(),
        euros_ce_mois: compte.euros.get(&mois).copied().unwrap_or(0.0),
        euros_total: compte.euros.values().sum(),
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
    let modele = model.clone();

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
    noter_depense(&db, depense_texte(parsed.usage.as_ref(), &modele));
    parsed
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "Réponse vide de Mistral".into())
}

/// Interroge le modèle sur une image.
///
/// Analyser une fiche d'exercice demande de la **voir** : le texte extrait ne
/// dit rien du décor, de la densité ni de la place laissée pour répondre, qui
/// sont précisément ce qui surcharge. Les modèles Ministral acceptent une
/// image en entrée, ce que la version texte de `mistral_chat` ne sait pas
/// exprimer — d'où cette commande séparée plutôt qu'un paramètre de plus.
#[tauri::command]
pub async fn mistral_vision(
    db: State<'_, Db>,
    consigne: String,
    image_b64: String,
    model: Option<String>,
) -> Result<String, String> {
    let cle = cle_mistral(&db)?;
    let model = model.unwrap_or_else(|| MODELE_DEFAUT.to_string());
    let modele = model.clone();
    let body = serde_json::json!({
        "model": model,
        "temperature": 0.2,
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": consigne },
                { "type": "image_url", "image_url": format!("data:image/png;base64,{image_b64}") },
            ],
        }],
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;
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
    noter_depense(&db, depense_texte(parsed.usage.as_ref(), &modele));
    parsed
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "Réponse vide de Mistral".into())
}

// ── Recherche sur le web ───────────────────────────────────────────────────
//
// L'assistant répond de mémoire : il ignore tout ce qui suit son entraînement
// et ne peut citer aucune source. Pour une date de vacances ou une référence
// Éduscol, c'est exactement ce qu'il ne faut pas.
//
// Mistral expose un connecteur `web_search`, utilisable via un « agent ». Deux
// contraintes le cadrent : seuls certains modèles l'acceptent — aucun Ministral
// ne le fait — et l'agent se crée une fois puis se réutilise.

/// Modèle capable d'utiliser les connecteurs. Les Ministral en sont incapables,
/// quel que soit leur niveau : ce n'est pas une question de puissance.
const MODELE_RECHERCHE: &str = "mistral-medium-latest";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub titre: String,
    pub url: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReponseWeb {
    pub texte: String,
    pub sources: Vec<Source>,
    /// Vrai si le modèle a réellement interrogé le web.
    ///
    /// Sans cette distinction, une réponse de mémoire s'afficherait sous un
    /// bandeau « recherche web » et paraîtrait vérifiée alors qu'elle ne l'est
    /// pas — pire que pas de recherche du tout.
    pub a_cherche: bool,
}

/// Récupère l'agent gardé sous le réglage `reglage`, ou le crée d'après
/// `corps` à la première utilisation. `renouveler` en crée un autre : celui
/// qu'on gardait n'existe plus chez Mistral (effacé depuis la console).
async fn agent_garde(
    db: &State<'_, Db>,
    cle: &str,
    reglage: &str,
    corps: serde_json::Value,
    renouveler: bool,
) -> Result<String, String> {
    if !renouveler {
        let c = db.lock();
        let existant: Option<String> = c
            .query_row("SELECT valeur FROM settings WHERE cle=?1", params![reglage], |r| r.get(0))
            .ok()
            .filter(|v: &String| !v.trim().is_empty());
        if let Some(id) = existant {
            return Ok(id);
        }
    }
    let rep = reqwest::Client::new()
        .post("https://api.mistral.ai/v1/agents")
        .bearer_auth(cle)
        .json(&corps)
        .send()
        .await
        .map_err(|e| format!("Réseau : {e}"))?;
    if !rep.status().is_success() {
        let code = rep.status().as_u16();
        let txt = rep.text().await.unwrap_or_default();
        return Err(message_erreur(code, &txt, None));
    }
    let v: serde_json::Value = rep.json().await.map_err(|e| format!("Réponse : {e}"))?;
    let id = v.get("id").and_then(|x| x.as_str()).unwrap_or_default().to_string();
    if id.is_empty() {
        return Err("Mistral n'a pas renvoyé d'agent.".into());
    }
    let c = db.lock();
    c.execute(
        "INSERT OR REPLACE INTO settings (cle, valeur) VALUES (?1, ?2)",
        params![reglage, id],
    ).ok();
    Ok(id)
}

/// Récupère l'agent de recherche, ou le crée à la première utilisation.
async fn agent_recherche(db: &State<'_, Db>, cle: &str) -> Result<String, String> {
    agent_garde(db, cle, "agentRechercheId", serde_json::json!({
        "model": MODELE_RECHERCHE,
        "name": "Maitrize — recherche web",
        "description": "Répond aux questions d'un enseignant en citant ses sources.",
        "instructions": "Tu aides un enseignant spécialisé français. Cherche sur le web avant \
             de répondre, cite tes sources, et dis clairement quand tu ne trouves pas. \
             Privilégie les sources officielles : education.gouv.fr, eduscol, service-public.",
        "tools": [{ "type": "web_search" }],
    }), false).await
}

/// Pose une question en cherchant sur le web, et rapporte les sources.
#[tauri::command]
pub async fn mistral_recherche_web(
    db: State<'_, Db>,
    question: String,
) -> Result<ReponseWeb, String> {
    let cle = cle_mistral(&db)?;
    let agent = agent_recherche(&db, &cle).await?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;
    // La question n'a pas à rester chez Mistral : « store: false » lui demande
    // de ne pas garder la conversation. Si son API refusait le champ, la
    // recherche ne doit pas en pâtir : on redemande sans.
    let envoyer = |garder: bool| {
        let mut corps = serde_json::json!({ "agent_id": agent, "inputs": question });
        if !garder { corps["store"] = serde_json::Value::Bool(false); }
        client.post("https://api.mistral.ai/v1/conversations").bearer_auth(&cle).json(&corps).send()
    };
    let mut rep = envoyer(false).await.map_err(|e| format!("Réseau : {e}"))?;
    if matches!(rep.status().as_u16(), 400 | 422) {
        rep = envoyer(true).await.map_err(|e| format!("Réseau : {e}"))?;
    }
    if !rep.status().is_success() {
        let code = rep.status().as_u16();
        let quota = quota_minute(rep.headers());
        let txt = rep.text().await.unwrap_or_default();
        return Err(message_erreur(code, &txt, quota));
    }
    let v: serde_json::Value = rep.json().await.map_err(|e| format!("Réponse : {e}"))?;
    let mut depense = depense_texte(v.get("usage"), MODELE_RECHERCHE);
    depense.dollars += recherches_faites(&v) as f64 * DOLLARS_PAR_RECHERCHE;
    noter_depense(&db, depense);
    Ok(lire_reponse_web(&v))
}

/// Combien de fois l'agent a cherché sur le web : chaque recherche se paie.
pub(crate) fn recherches_faites(v: &serde_json::Value) -> usize {
    v.get("outputs").and_then(|x| x.as_array()).map(|sorties| sorties.iter().filter(|o| {
        o.get("type").and_then(|x| x.as_str()) == Some("tool.execution")
            && o.get("name").and_then(|x| x.as_str()) == Some("web_search")
    }).count()).unwrap_or(0)
}

/// Extrait texte, sources et preuve de recherche d'une conversation d'agent.
///
/// Isolée pour être testable : la forme de la réponse est imbriquée, et une
/// erreur de lecture ferait passer une réponse de mémoire pour une réponse
/// sourcée.
pub(crate) fn lire_reponse_web(v: &serde_json::Value) -> ReponseWeb {
    let sorties = v.get("outputs").and_then(|x| x.as_array()).cloned().unwrap_or_default();
    let a_cherche = sorties.iter().any(|o| {
        o.get("type").and_then(|x| x.as_str()) == Some("tool.execution")
            && o.get("name").and_then(|x| x.as_str()) == Some("web_search")
    });

    let mut texte = String::new();
    let mut sources: Vec<Source> = Vec::new();
    for o in &sorties {
        if o.get("type").and_then(|x| x.as_str()) != Some("message.output") {
            continue;
        }
        match o.get("content") {
            Some(serde_json::Value::String(s)) => texte.push_str(s),
            Some(serde_json::Value::Array(morceaux)) => {
                for m in morceaux {
                    match m.get("type").and_then(|x| x.as_str()) {
                        Some("text") => {
                            if let Some(s) = m.get("text").and_then(|x| x.as_str()) {
                                texte.push_str(s);
                            }
                        }
                        Some("tool_reference") => {
                            let url = m.get("url").and_then(|x| x.as_str()).unwrap_or_default();
                            if url.is_empty() {
                                continue;
                            }
                            // Une même source citée trois fois n'est qu'une source.
                            if sources.iter().any(|s| s.url == url) {
                                continue;
                            }
                            sources.push(Source {
                                titre: m.get("title").and_then(|x| x.as_str())
                                    .filter(|t| !t.trim().is_empty())
                                    .unwrap_or(url).to_string(),
                                url: url.to_string(),
                            });
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }
    ReponseWeb { texte: texte.trim().to_string(), sources, a_cherche }
}

// ── Dessiner un pictogramme ────────────────────────────────────────────────
//
// Quand ni ARASAAC ni Sclera n'ont le mot, l'enseignant peut en demander un
// dessin à la manière d'ARASAAC. Mistral dessine par un connecteur, comme il
// cherche sur le web : un agent, créé une fois, qui appelle l'outil
// `image_generation`. L'image revient comme un fichier de son espace : on la
// rapatrie, puis on l'y efface. La demande ne porte que le mot, et ce qu'on
// veut y voir.

/// Modèle de l'agent qui dessine : les Ministral n'appellent pas les connecteurs.
const MODELE_DESSIN: &str = "mistral-medium-latest";
/// Une image dessinée se paie à l'unité : 100 $ les mille (tarif public, octobre 2026).
const DOLLARS_PAR_IMAGE: f64 = 0.10;

/// Récupère l'agent qui dessine, ou le crée à la première utilisation.
async fn agent_dessin(db: &State<'_, Db>, cle: &str, renouveler: bool) -> Result<String, String> {
    agent_garde(db, cle, "agentDessinId", serde_json::json!({
        "model": MODELE_DESSIN,
        "name": "Maitrize — pictogrammes",
        "description": "Dessine des pictogrammes pour la classe, à la manière d'ARASAAC.",
        "instructions": "Tu dessines des pictogrammes pour des enfants, à la manière des pictogrammes \
             ARASAAC. À chaque demande, appelle une seule fois l'outil de génération d'image, avec une \
             description en anglais fidèle à la demande : flat vector pictogram in the style of ARASAAC \
             AAC symbols, thick uniform black outlines, flat bright colors, plain white background, no \
             text, no letters, no shadows, no gradients, one single centered subject. Ne réponds rien d'autre.",
        "tools": [{ "type": "image_generation" }],
    }), renouveler).await
}

/// Ce qu'on demande à l'agent : le mot, ce qu'on doit y voir, le style d'ARASAAC.
pub(crate) fn consigne_picto(mot: &str, precision: &str) -> String {
    let voir = match precision.trim() {
        "" => String::new(),
        p => format!(" On doit y voir : {p}."),
    };
    format!(
        "Dessine le pictogramme du mot français « {} ».{voir} Style des pictogrammes ARASAAC : \
         dessin vectoriel plat, contours noirs épais et réguliers, aplats de couleurs franches, \
         sans dégradé ni ombre, fond blanc uni, un seul sujet centré et vu en entier, formes simples, \
         lisible en petit par un enfant. Aucun texte, aucune lettre, aucun chiffre. Image carrée.",
        mot.trim()
    )
}

/// Les fichiers qu'une conversation a dessinés, dans l'ordre, chacun une fois.
///
/// Un identifiant qui n'a pas la forme attendue est écarté : il entre dans
/// l'adresse où l'on télécharge l'image.
pub(crate) fn fichiers_dessines(v: &serde_json::Value) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();
    let Some(sorties) = v.get("outputs").and_then(|x| x.as_array()) else { return ids };
    for o in sorties {
        if o.get("type").and_then(|x| x.as_str()) != Some("message.output") {
            continue;
        }
        let Some(morceaux) = o.get("content").and_then(|x| x.as_array()) else { continue };
        for m in morceaux {
            if m.get("type").and_then(|x| x.as_str()) != Some("tool_file") {
                continue;
            }
            let id = m.get("file_id").and_then(|x| x.as_str()).unwrap_or_default();
            let sur = !id.is_empty() && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
            if sur && !ids.iter().any(|x| x == id) {
                ids.push(id.to_string());
            }
        }
    }
    ids
}

/// Dessine le pictogramme d'un mot, à la manière d'ARASAAC ; renvoie l'image en base64.
#[tauri::command]
pub async fn mistral_dessiner_picto(
    db: State<'_, Db>,
    mot: String,
    precision: Option<String>,
) -> Result<String, String> {
    use base64::Engine;
    let mot = mot.trim().to_string();
    if mot.is_empty() {
        return Err("Écrivez d'abord le mot à dessiner.".into());
    }
    let cle = cle_mistral(&db)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;
    let consigne = consigne_picto(&mot, precision.as_deref().unwrap_or(""));
    let mut renouveler = false;
    let v: serde_json::Value = loop {
        let agent = agent_dessin(&db, &cle, renouveler).await?;
        let rep = client
            .post("https://api.mistral.ai/v1/conversations")
            .bearer_auth(&cle)
            .json(&serde_json::json!({ "agent_id": agent, "inputs": consigne }))
            .send()
            .await
            .map_err(|e| format!("Réseau : {e}"))?;
        if rep.status().is_success() {
            break rep.json().await.map_err(|e| format!("Réponse : {e}"))?;
        }
        let code = rep.status().as_u16();
        let quota = quota_minute(rep.headers());
        let txt = rep.text().await.unwrap_or_default();
        // L'agent gardé a pu être effacé depuis la console Mistral : on en crée un autre, une fois.
        if code == 404 && !renouveler {
            renouveler = true;
            continue;
        }
        return Err(message_erreur(code, &txt, quota));
    };

    let fichiers = fichiers_dessines(&v);
    let mut depense = depense_texte(v.get("usage"), MODELE_DESSIN);
    depense.dollars += fichiers.len() as f64 * DOLLARS_PAR_IMAGE;
    noter_depense(&db, depense);
    let Some(premier) = fichiers.first() else {
        return Err("Mistral n'a pas dessiné d'image cette fois-ci. Réessayez, ou précisez ce qu'on doit y voir.".into());
    };
    let rep = client
        .get(format!("https://api.mistral.ai/v1/files/{premier}/content"))
        .bearer_auth(&cle)
        .send()
        .await
        .map_err(|e| format!("Réseau : {e}"))?;
    if !rep.status().is_success() {
        let code = rep.status().as_u16();
        let txt = rep.text().await.unwrap_or_default();
        return Err(message_erreur(code, &txt, None));
    }
    let octets = rep.bytes().await.map_err(|e| format!("Image : {e}"))?;
    // Rien ne reste chez Mistral : le dessin rapatrié, sa copie là-bas s'efface.
    for f in &fichiers {
        let _ = client
            .delete(format!("https://api.mistral.ai/v1/files/{f}"))
            .bearer_auth(&cle)
            .send()
            .await;
    }
    if octets.is_empty() {
        return Err("Mistral a renvoyé une image vide. Réessayez.".into());
    }
    Ok(base64::engine::general_purpose::STANDARD.encode(&octets))
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
            Ok(r) if r.status().is_success() => {
                // Un jeton de réponse, mais la question se paie aussi.
                if let Ok(v) = r.json::<serde_json::Value>().await {
                    noter_depense(&db, depense_texte(v.get("usage"), &id));
                }
                EtatModele { id, disponible: true, detail: "Disponible".into() }
            }
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

/// Un morceau du flux. Le dernier porte `usage`, le compte de toute la réponse.
#[derive(Deserialize)]
struct StreamChunk {
    #[serde(default)]
    choices: Vec<StreamChoice>,
    #[serde(default)]
    usage: Option<serde_json::Value>,
}
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
    let modele = model.clone();
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
                        noter_depense(&db, depense_texte(chunk.usage.as_ref(), &modele));
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
    noter_depense(&db, depense_audio(json.get("usage")));
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

    // ── Lecture d'une réponse d'agent ────────────────────────────────────
    //
    // La forme est imbriquée, et une erreur de lecture ferait passer une
    // réponse de mémoire pour une réponse sourcée — pire que pas de recherche.

    use super::lire_reponse_web;

    fn conversation(avec_recherche: bool, contenu: serde_json::Value) -> serde_json::Value {
        let mut sorties = vec![];
        if avec_recherche {
            sorties.push(serde_json::json!({ "type": "tool.execution", "name": "web_search" }));
        }
        sorties.push(serde_json::json!({ "type": "message.output", "content": contenu }));
        serde_json::json!({ "outputs": sorties })
    }

    #[test]
    fn reconnait_une_vraie_recherche() {
        let v = conversation(true, serde_json::json!([
            { "type": "text", "text": "Du 17 octobre au 2 novembre." },
            { "type": "tool_reference", "title": "Service Public", "url": "https://service-public.gouv.fr/x" },
        ]));
        let r = lire_reponse_web(&v);
        assert!(r.a_cherche);
        assert_eq!(r.sources.len(), 1);
        assert_eq!(r.sources[0].titre, "Service Public");
        assert!(r.texte.contains("17 octobre"));
    }

    #[test]
    fn signale_une_reponse_sans_recherche() {
        // Le modèle a répondu de mémoire : le dire, plutôt que d'afficher la
        // réponse sous un bandeau « recherche web » qui la ferait croire
        // vérifiée.
        let v = conversation(false, serde_json::json!([{ "type": "text", "text": "Je crois que…" }]));
        assert!(!lire_reponse_web(&v).a_cherche);
    }

    #[test]
    fn une_source_citee_plusieurs_fois_ne_compte_quune_fois() {
        let v = conversation(true, serde_json::json!([
            { "type": "text", "text": "a" },
            { "type": "tool_reference", "title": "Éduscol", "url": "https://eduscol.education.fr/p" },
            { "type": "text", "text": "b" },
            { "type": "tool_reference", "title": "Éduscol", "url": "https://eduscol.education.fr/p" },
        ]));
        assert_eq!(lire_reponse_web(&v).sources.len(), 1);
    }

    #[test]
    fn une_source_sans_titre_montre_son_adresse() {
        let v = conversation(true, serde_json::json!([
            { "type": "tool_reference", "title": "", "url": "https://exemple.fr/doc" },
        ]));
        assert_eq!(lire_reponse_web(&v).sources[0].titre, "https://exemple.fr/doc");
    }

    #[test]
    fn une_source_sans_adresse_est_ecartee() {
        // Une source qu'on ne peut pas ouvrir n'est pas une source.
        let v = conversation(true, serde_json::json!([
            { "type": "tool_reference", "title": "Quelque part", "url": "" },
        ]));
        assert!(lire_reponse_web(&v).sources.is_empty());
    }

    #[test]
    fn accepte_un_contenu_en_texte_simple() {
        let v = conversation(true, serde_json::json!("réponse brute"));
        assert_eq!(lire_reponse_web(&v).texte, "réponse brute");
    }

    #[test]
    fn ne_panique_pas_sur_une_reponse_vide() {
        for brut in ["{}", r#"{"outputs":[]}"#, r#"{"outputs":[{"type":"autre"}]}"#] {
            let v: serde_json::Value = serde_json::from_str(brut).unwrap();
            let r = lire_reponse_web(&v);
            assert!(r.texte.is_empty() && !r.a_cherche);
        }
    }

    // ── Les jetons dépensés ──────────────────────────────────────────────

    use super::{ajouter_jetons, avec_euros_estimes, depense_audio, depense_texte, jetons_de, recherches_faites, Depense, Jetons};

    #[test]
    fn lit_le_cout_de_chaque_sorte_de_reponse() {
        // Conversation, agent, transcription : chacun écrit son compte à sa façon.
        let chat = serde_json::json!({ "prompt_tokens": 120, "completion_tokens": 30, "total_tokens": 150 });
        let audio = serde_json::json!({ "prompt_audio_seconds": 203, "prompt_tokens": 4, "completion_tokens": 635, "total_tokens": 3264 });
        let sans_total = serde_json::json!({ "prompt_tokens": 10, "completion_tokens": 5 });
        assert_eq!(jetons_de(Some(&chat)), 150);
        assert_eq!(jetons_de(Some(&audio)), 3264);
        assert_eq!(jetons_de(Some(&sans_total)), 15);
    }

    #[test]
    fn un_compte_absent_ou_abime_ne_compte_rien() {
        for brut in ["null", "{}", r#"{"total_tokens":"beaucoup"}"#, r#"{"total_tokens":-3}"#] {
            let v: serde_json::Value = serde_json::from_str(brut).unwrap();
            assert_eq!(jetons_de(Some(&v)), 0, "{brut}");
        }
        assert_eq!(jetons_de(None), 0);
    }

    fn jetons(n: u64) -> Depense {
        Depense { jetons: n, dollars: 0.0 }
    }

    #[test]
    fn additionne_par_mois_et_retient_le_premier_jour() {
        let compte = ajouter_jetons(Jetons::default(), jetons(150), "2026-09-28");
        let compte = ajouter_jetons(compte, jetons(0), "2026-09-29");
        let compte = ajouter_jetons(compte, jetons(50), "2026-10-04");
        let compte = ajouter_jetons(compte, jetons(25), "2026-10-05");
        assert_eq!(compte.total, 225);
        assert_eq!(compte.mois.get("2026-09"), Some(&150));
        assert_eq!(compte.mois.get("2026-10"), Some(&75));
        assert_eq!(compte.depuis, "2026-09-28", "le compte commence au premier jeton, pas avant");
    }

    #[test]
    fn chaque_modele_a_son_prix_en_entree_et_en_sortie() {
        let usage = serde_json::json!({ "prompt_tokens": 1_000_000, "completion_tokens": 1_000_000, "total_tokens": 2_000_000 });
        let prix = |m: &str| (depense_texte(Some(&usage), m).dollars * 100.0).round() / 100.0;
        assert_eq!(prix("ministral-8b-latest"), 0.30);
        assert_eq!(prix("ministral-3b-latest"), 0.20);
        assert_eq!(prix("ministral-14b-latest"), 0.40);
        assert_eq!(prix("mistral-medium-latest"), 9.0, "la sortie de Medium coûte cinq fois l'entrée");
        assert_eq!(prix("mistral-large-latest"), 2.0);
        assert_eq!(prix("un-modele-inconnu"), 0.30, "un modèle inconnu prend le prix du modèle par défaut");
        assert_eq!(depense_texte(Some(&usage), "ministral-8b-latest").jetons, 2_000_000);
        assert_eq!(depense_texte(None, "ministral-8b-latest"), Depense::default());
    }

    #[test]
    fn la_transcription_se_paie_a_la_minute_et_la_recherche_a_l_appel() {
        let audio = serde_json::json!({ "prompt_audio_seconds": 600, "prompt_tokens": 4, "completion_tokens": 635, "total_tokens": 3264 });
        let d = depense_audio(Some(&audio));
        assert_eq!(d.jetons, 3264);
        assert!((d.dollars - 0.03).abs() < 1e-9, "dix minutes à 0,003 $ : {}", d.dollars);
        let agent = serde_json::json!({ "outputs": [
            { "type": "tool.execution", "name": "web_search" },
            { "type": "tool.execution", "name": "web_search" },
            { "type": "message.output", "content": "…" },
        ] });
        assert_eq!(recherches_faites(&agent), 2);
        assert_eq!(recherches_faites(&serde_json::json!({})), 0);
    }

    #[test]
    fn les_euros_suivent_les_jetons_et_les_mois_d_avant_s_estiment() {
        let compte = ajouter_jetons(Jetons::default(), Depense { jetons: 1000, dollars: 1.1298 }, "2026-10-04");
        assert!((compte.euros["2026-10"] - 1.0).abs() < 1e-9, "1,1298 $ font 1 € au cours retenu");
        // Un compte tenu avant qu'on chiffre en euros : ses jetons s'estiment au prix du modèle par défaut.
        let ancien: Jetons = serde_json::from_str(r#"{"total":1000000,"mois":{"2026-10":1000000},"depuis":"2026-10-04"}"#).unwrap();
        let estime = avec_euros_estimes(ancien);
        assert!((estime.euros["2026-10"] - 0.15 / 1.1298).abs() < 1e-9, "{:?}", estime.euros);
        // Un mois déjà chiffré ne se réestime pas.
        assert_eq!(avec_euros_estimes(compte.clone()).euros, compte.euros);
    }

    #[test]
    fn un_reglage_illisible_repart_de_zero() {
        let lu: Jetons = serde_json::from_str("pas du json").unwrap_or_default();
        assert_eq!(lu, Jetons::default());
        let partiel: Jetons = serde_json::from_str(r#"{"total":12}"#).unwrap();
        assert_eq!((partiel.total, partiel.mois.len(), partiel.depuis.as_str()), (12, 0, ""));
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

#[cfg(test)]
mod tests_dessin {
    use super::{consigne_picto, fichiers_dessines};
    use serde_json::json;

    #[test]
    fn la_consigne_porte_le_mot_le_style_et_ce_qu_on_doit_voir() {
        let c = consigne_picto("  trottinette ", "");
        assert!(c.contains("« trottinette »"));
        assert!(c.contains("ARASAAC"));
        assert!(c.contains("Aucun texte"));
        assert!(!c.contains("On doit y voir"));
        let p = consigne_picto("avocat", "le fruit coupé en deux");
        assert!(p.contains("On doit y voir : le fruit coupé en deux."));
    }

    #[test]
    fn retrouve_l_image_dessinee_dans_la_reponse() {
        let v = json!({ "outputs": [
            { "type": "tool.execution", "name": "image_generation" },
            { "type": "message.output", "content": [
                { "type": "text", "text": "Voici le pictogramme." },
                { "type": "tool_file", "tool": "image_generation", "file_id": "a1b2-c3_d4", "file_name": "image_generated_0", "file_type": "png" },
                { "type": "tool_file", "tool": "image_generation", "file_id": "a1b2-c3_d4" },
            ]},
        ]});
        assert_eq!(fichiers_dessines(&v), vec!["a1b2-c3_d4".to_string()]);
    }

    #[test]
    fn ecarte_ce_qui_n_est_pas_une_image_ou_n_a_pas_la_forme_d_un_identifiant() {
        let v = json!({ "outputs": [
            { "type": "message.output", "content": "Je ne peux pas dessiner cela." },
            { "type": "message.output", "content": [
                { "type": "tool_file", "file_id": "../agents" },
                { "type": "tool_file", "file_id": "" },
                { "type": "tool_file" },
                { "type": "text", "text": "file_id" },
            ]},
        ]});
        assert!(fichiers_dessines(&v).is_empty());
        assert!(fichiers_dessines(&json!({})).is_empty());
    }
}
