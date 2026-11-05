// Sur un ordinateur, pour les essais : l'application est faite pour l'iPad et l'iPhone.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    maitrize_classeur_lib::run()
}
