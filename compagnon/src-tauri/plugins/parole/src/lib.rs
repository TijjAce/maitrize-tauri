// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

//! La voix du classeur, sur l'iPad et l'iPhone.
//!
//! La synthèse vocale de la page (celle de WebKit) se tait quand l'iPhone est
//! en mode silencieux : un élève qui parle avec son classeur ne doit pas
//! devenir muet parce qu'un bouton est baissé. La voix passe donc par
//! AVSpeechSynthesizer, dans une session audio « lecture » qui ignore le mode
//! silencieux, comme une application de communication.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

#[cfg(desktop)]
use desktop::Parole;
#[cfg(mobile)]
use mobile::Parole;

/// Une voix française de l'appareil.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Voix {
    pub id: String,
    pub nom: String,
    pub langue: String,
    /// 1 : par défaut ; 2 : améliorée ; 3 : premium.
    pub qualite: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ListeDeVoix {
    pub voix: Vec<Voix>,
}

pub trait ParoleExt<R: Runtime> {
    fn parole(&self) -> &Parole<R>;
}

impl<R: Runtime, T: Manager<R>> ParoleExt<R> for T {
    fn parole(&self) -> &Parole<R> {
        self.state::<Parole<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("parole")
        .invoke_handler(tauri::generate_handler![commands::dire, commands::taire, commands::voix])
        .setup(|app, api| {
            #[cfg(mobile)]
            let parole = mobile::init(app, api)?;
            #[cfg(desktop)]
            let parole = desktop::init(app, api)?;
            app.manage(parole);
            Ok(())
        })
        .build()
}
