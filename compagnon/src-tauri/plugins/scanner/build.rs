// Une seule commande : ouvrir le scanner et rendre les pages. Le dossier
// `ios/` contient l'enveloppe Swift, que Tauri compile et lie lui-même.
const COMMANDS: &[&str] = &["scanner"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
