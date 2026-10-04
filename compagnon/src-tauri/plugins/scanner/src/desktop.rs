use serde::de::DeserializeOwned;
use tauri::{ipc::Channel, plugin::PluginApi, AppHandle, Runtime};

use crate::{Fermeture, Gardees};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> Result<Scanner<R>, Box<dyn std::error::Error>> {
    Ok(Scanner(app.clone()))
}

/// Sur un ordinateur, il n'y a pas d'appareil : la commande le dit.
pub struct Scanner<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Scanner<R> {
    pub fn photographier(&self, _dossier: String, _sur_page: Channel) -> Result<Gardees, String> {
        Err("L'appareil des pages n'existe que sur le téléphone.".into())
    }

    pub fn ouvrir_connexion(&self, _url: String) -> Result<Fermeture, String> {
        Err("La page de connexion ne s'ouvre que sur le téléphone.".into())
    }

    pub fn fermer_connexion(&self) -> Result<(), String> {
        Ok(())
    }
}
