use tauri::{AppHandle, Runtime};

use crate::{Pages, ScannerExt};

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
