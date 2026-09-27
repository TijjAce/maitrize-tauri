//! Le scanner de documents de l'iPhone.
//!
//! VisionKit fait ce que fait l'application Notes : il trouve les bords de
//! la page, la prend au bon moment, la redresse, en nettoie le fond — et
//! enchaîne les pages. C'est exactement ce qu'il faut pour un manuel, et
//! rien de ce que peut faire une page web : la caméra n'y est pas donnée en
//! HTTP. D'où ce greffon, minuscule : une commande, qui rend des fichiers.

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

/// Ce que le scanner rend : les pages, en JPEG, dans le dossier temporaire.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Pages {
    pub fichiers: Vec<String>,
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
        .invoke_handler(tauri::generate_handler![commands::scanner])
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
