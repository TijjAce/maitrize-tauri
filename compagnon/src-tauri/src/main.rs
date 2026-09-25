// Les fenêtres de Windows n'ouvrent pas de console en mode release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    maitrize_dictaphone_lib::run()
}
