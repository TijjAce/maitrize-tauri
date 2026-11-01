# wry 0.55.1, corrigé pour Maitrize

Copie de [wry 0.55.1](https://crates.io/crates/wry/0.55.1) (licences Apache-2.0 et MIT, jointes), celle que Tauri 2.11
emploie, avec une seule fonction changée : `collect_paths`, dans `src/wkwebview/drag_drop.rs`.

**Le défaut (2026-11-01).** Glisser dans la fenêtre une vignette de capture d'écran, ou une photo depuis Photos, arrêtait
l'application :

    thread 'main' panicked at wry-0.55.1/src/wkwebview/drag_drop.rs:24:63:
    called `Option::unwrap()` on a `None` value

Un fichier « promis » annonce `NSFilenamesPboardType` sans pouvoir le donner : `propertyListForType` rend `None`, et
wry le déballait sans vérifier. Le réglage `dragDropEnabled: false` n'y change rien : wry lit les chemins avant de
demander à Tauri.

**La correction.** Sans chemins lisibles, la fonction rend une liste vide ; le dépôt passe alors au glisser-déposer du
web, celui qu'emploie l'application (voir `src/dragdrop.ts`).

**À retirer** en passant à Tauri 2.12 : il emploie wry 0.57.1, où le défaut est corrigé autrement
(`readObjectsForClasses`). Supprimer ce dossier et la section `[patch.crates-io]` de `Cargo.toml`.
