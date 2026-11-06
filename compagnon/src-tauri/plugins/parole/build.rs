// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Dire un mot, se taire, lister les voix. Le dossier `ios/` contient l'enveloppe Swift.
const COMMANDS: &[&str] = &["dire", "taire", "voix"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).ios_path("ios").build();
}
