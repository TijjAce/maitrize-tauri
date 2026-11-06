// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

use tauri::{AppHandle, Runtime};

use crate::{ListeDeVoix, ParoleExt};

// Des commandes `async` : une commande ordinaire tourne sur le fil principal de l'iPhone, et y attend la réponse
// de Swift — qui ne peut venir que de ce même fil. Le fil s'arrête, et iOS tue l'application au bout de dix
// secondes (0x8BADF00D, « quand je clique sur un picto ça plante », 5 novembre 2026). Asynchrones, elles attendent
// ailleurs, comme celles du compagnon.

/// Dit un texte, tout de suite : ce qui se disait encore s'arrête.
#[tauri::command]
pub(crate) async fn dire<R: Runtime>(app: AppHandle<R>, texte: String, voix: Option<String>, debit: Option<f32>) -> Result<(), String> {
    app.parole().dire(texte, voix, debit)
}

/// Se tait.
#[tauri::command]
pub(crate) async fn taire<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.parole().taire()
}

/// Les voix françaises de l'appareil.
#[tauri::command]
pub(crate) async fn voix<R: Runtime>(app: AppHandle<R>) -> Result<ListeDeVoix, String> {
    app.parole().voix()
}
