use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{Fermeture, Pages};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> Result<Scanner<R>, Box<dyn std::error::Error>> {
    Ok(Scanner(app.clone()))
}

/// Sur un ordinateur, il n'y a pas de scanner : la commande le dit.
pub struct Scanner<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Scanner<R> {
    pub fn scanner(&self) -> Result<Pages, String> {
        Err("Le scanner de documents n'existe que sur le téléphone.".into())
    }

    pub fn ouvrir_connexion(&self, _url: String) -> Result<Fermeture, String> {
        Err("La page de connexion ne s'ouvre que sur le téléphone.".into())
    }

    pub fn fermer_connexion(&self) -> Result<(), String> {
        Ok(())
    }
}
