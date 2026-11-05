use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::ListeDeVoix;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> Result<Parole<R>, Box<dyn std::error::Error>> {
    Ok(Parole(app.clone()))
}

/// Sur un ordinateur, la page parle elle-même (synthèse de WebKit) : la commande le dit.
pub struct Parole<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Parole<R> {
    pub fn dire(&self, _texte: String, _voix: Option<String>, _debit: Option<f32>) -> Result<(), String> {
        Err("La voix de l'appareil n'existe que sur l'iPad et l'iPhone.".into())
    }

    pub fn taire(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn voix(&self) -> Result<ListeDeVoix, String> {
        Ok(ListeDeVoix { voix: Vec::new() })
    }
}
