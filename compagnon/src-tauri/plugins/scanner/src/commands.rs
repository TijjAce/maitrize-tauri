use tauri::{ipc::Channel, AppHandle, Runtime};

use crate::{Fermeture, Gardees, ScannerExt};

/// Ouvre l'appareil des pages ; revient quand l'enseignant a fini.
///
/// Chaque page gardée est écrite dans `dossier`, puis annoncée sur
/// `sur_page` : la page web l'envoie sans attendre la fin. La commande est
/// asynchrone à dessein : l'appel natif attend que l'appareil se referme, et
/// cette attente ne peut pas se faire sur le fil principal, qui est justement
/// celui de l'écran.
#[tauri::command]
pub(crate) async fn photographier<R: Runtime>(app: AppHandle<R>, dossier: String, sur_page: Channel) -> Result<Gardees, String> {
    tauri::async_runtime::spawn_blocking(move || app.scanner().photographier(dossier, sur_page))
        .await
        .map_err(|e| e.to_string())?
}

/// Ouvre la page de connexion de Nuage ; revient quand elle se referme.
///
/// Asynchrone pour la même raison que l'appareil : l'appel natif attend que
/// la feuille se referme. Pendant ce temps, Rust demande à Nuage si la
/// connexion est faite, et la referme lui-même quand elle l'est.
#[tauri::command]
pub(crate) async fn ouvrir_connexion<R: Runtime>(app: AppHandle<R>, url: String) -> Result<Fermeture, String> {
    tauri::async_runtime::spawn_blocking(move || app.scanner().ouvrir_connexion(url))
        .await
        .map_err(|e| e.to_string())?
}

/// Referme la page de connexion : le compte est relié, elle n'a plus rien à montrer.
#[tauri::command]
pub(crate) async fn fermer_connexion<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || app.scanner().fermer_connexion())
        .await
        .map_err(|e| e.to_string())?
}
