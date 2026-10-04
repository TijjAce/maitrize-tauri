use serde::de::DeserializeOwned;
use tauri::{
    ipc::Channel,
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::{Fermeture, Gardees};

/// Où l'appareil écrit les pages, et par où il annonce chacune, tel que Swift le lit.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Appareil {
    dossier: String,
    sur_page: Channel,
}

/// L'adresse de la page de connexion, telle que Swift la lit.
#[derive(serde::Serialize)]
struct Page {
    url: String,
}

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_scanner);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<Scanner<R>, Box<dyn std::error::Error>> {
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_scanner)?;
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("fr.clementsapp.maitrize.scanner", "ScannerPlugin")?;
    Ok(Scanner(handle))
}

/// L'appareil et la page de connexion, côté téléphone.
pub struct Scanner<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Scanner<R> {
    pub fn photographier(&self, dossier: String, sur_page: Channel) -> Result<Gardees, String> {
        self.0
            .run_mobile_plugin::<Gardees>("photographier", Appareil { dossier, sur_page })
            .map_err(|e| e.to_string())
    }

    pub fn ouvrir_connexion(&self, url: String) -> Result<Fermeture, String> {
        self.0
            .run_mobile_plugin::<Fermeture>("ouvrirConnexion", Page { url })
            .map_err(|e| e.to_string())
    }

    pub fn fermer_connexion(&self) -> Result<(), String> {
        self.0
            .run_mobile_plugin::<Fermeture>("fermerConnexion", ())
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}
