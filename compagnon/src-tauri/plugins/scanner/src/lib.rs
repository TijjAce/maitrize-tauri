//! Ce que la page du dictaphone ne sait pas faire seule, sur l'iPhone.
//!
//! **Le scanner de documents.** VisionKit fait ce que fait l'application
//! Notes : il trouve les bords de la page, la prend au bon moment, la
//! redresse, en nettoie le fond — et enchaîne les pages. C'est exactement ce
//! qu'il faut pour un manuel, et rien de ce que peut faire une page web : la
//! caméra n'y est pas donnée en HTTP.
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

/// Ce que le scanner rend : les pages, en JPEG, dans le dossier temporaire.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Pages {
    pub fichiers: Vec<String>,
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
        .invoke_handler(tauri::generate_handler![commands::scanner, commands::ouvrir_connexion, commands::fermer_connexion])
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
