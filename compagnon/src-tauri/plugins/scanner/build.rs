// Photographier les pages d'un manuel ; ouvrir puis refermer la page de
// connexion à Nuage. Le dossier `ios/` contient l'enveloppe Swift, que Tauri
// compile et lie lui-même.
const COMMANDS: &[&str] = &["photographier", "ouvrir_connexion", "fermer_connexion"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
