// Ouvrir le scanner et rendre les pages ; ouvrir puis refermer la page de
// connexion à Nuage. Le dossier `ios/` contient l'enveloppe Swift, que Tauri
// compile et lie lui-même.
const COMMANDS: &[&str] = &["scanner", "ouvrir_connexion", "fermer_connexion"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
