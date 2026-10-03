use tauri::{AppHandle, Runtime};

use crate::{Fermeture, Pages, ScannerExt};

/// Ouvre le scanner ; revient quand l'enseignant a fini, avec les pages.
///
/// La commande est asynchrone à dessein : l'appel natif attend que l'écran
/// du scanner se referme, et cette attente ne peut pas se faire sur le fil
/// principal, qui est justement celui de l'écran.
#[tauri::command]
pub(crate) async fn scanner<R: Runtime>(app: AppHandle<R>) -> Result<Pages, String> {
    tauri::async_runtime::spawn_blocking(move || app.scanner().scanner())
        .await
        .map_err(|e| e.to_string())?
}

/// Ouvre la page de connexion de Nuage ; revient quand elle se referme.
///
/// Asynchrone pour la même raison que le scanner : l'appel natif attend que
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
