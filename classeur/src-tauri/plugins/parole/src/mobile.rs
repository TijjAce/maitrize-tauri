use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::ListeDeVoix;

/// Ce que Swift lit pour dire un texte.
#[derive(serde::Serialize)]
struct ADire {
    texte: String,
    voix: Option<String>,
    debit: Option<f32>,
}

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_parole);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<Parole<R>, Box<dyn std::error::Error>> {
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_parole)?;
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("fr.clementsapp.maitrize.parole", "ParolePlugin")?;
    Ok(Parole(handle))
}

/// La voix, côté appareil.
pub struct Parole<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Parole<R> {
    pub fn dire(&self, texte: String, voix: Option<String>, debit: Option<f32>) -> Result<(), String> {
        self.0
            .run_mobile_plugin::<serde_json::Value>("dire", ADire { texte, voix, debit })
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn taire(&self) -> Result<(), String> {
        self.0.run_mobile_plugin::<serde_json::Value>("taire", ()).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn voix(&self) -> Result<ListeDeVoix, String> {
        self.0.run_mobile_plugin::<ListeDeVoix>("voix", ()).map_err(|e| e.to_string())
    }
}
