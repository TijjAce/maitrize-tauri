use tauri::{AppHandle, Runtime};

use crate::{ListeDeVoix, ParoleExt};

/// Dit un texte, tout de suite : ce qui se disait encore s'arrête.
#[tauri::command]
pub(crate) fn dire<R: Runtime>(app: AppHandle<R>, texte: String, voix: Option<String>, debit: Option<f32>) -> Result<(), String> {
    app.parole().dire(texte, voix, debit)
}

/// Se tait.
#[tauri::command]
pub(crate) fn taire<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.parole().taire()
}

/// Les voix françaises de l'appareil.
#[tauri::command]
pub(crate) fn voix<R: Runtime>(app: AppHandle<R>) -> Result<ListeDeVoix, String> {
    app.parole().voix()
}
