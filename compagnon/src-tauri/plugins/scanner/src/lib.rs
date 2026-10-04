//! Ce que la page du dictaphone ne sait pas faire seule, sur l'iPhone.
//!
//! **Les pages d'un manuel.** Une photo, et l'on ajuste aussitôt les coins de
//! la page, que Vision a déjà posés ; la page est redressée, nettoyée, et
//! écrite tout de suite dans le dossier de l'application. Le scanner de Notes
//! (VisionKit) ne rendait ses pages qu'à la fin, toutes ensemble : une
//! application fermée en chemin les perdait toutes, et ses cadrages se
//! reprenaient après coup, page par page.
//!
//! **La page de connexion à Nuage.** Le téléphone entre dans le dossier du
//! relais avec le compte de l'enseignant ; il s'y connecte par la page de
//! Nuage, ouverte dans une feuille de Safari propre à l'application, que
//! l'on referme une fois la connexion faite.

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
use desktop::Scanner;
#[cfg(mobile)]
use mobile::Scanner;

/// Ce que l'appareil rend en se refermant : combien de pages ont été gardées.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Gardees {
    pub gardees: u32,
}

/// Comment la page de connexion s'est refermée : par l'enseignant
/// (« Annuler »), ou par l'application, une fois la connexion faite.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Fermeture {
    pub annulee: bool,
}

pub trait ScannerExt<R: Runtime> {
    fn scanner(&self) -> &Scanner<R>;
}

impl<R: Runtime, T: Manager<R>> ScannerExt<R> for T {
    fn scanner(&self) -> &Scanner<R> {
        self.state::<Scanner<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("scanner")
        .invoke_handler(tauri::generate_handler![commands::photographier, commands::ouvrir_connexion, commands::fermer_connexion])
        .setup(|app, api| {
            #[cfg(mobile)]
            let scanner = mobile::init(app, api)?;
            #[cfg(desktop)]
            let scanner = desktop::init(app, api)?;
            app.manage(scanner);
            Ok(())
        })
        .build()
}
