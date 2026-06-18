# Maîtrize — version cross-plateforme (Tauri)

Portage de l'app macOS native (SwiftUI/SwiftData) vers **Tauri** pour viser
**Windows et macOS** (et Linux) avec une seule base de code.

## Stack

| Couche       | Techno                                             |
|--------------|----------------------------------------------------|
| UI           | React 19 + TypeScript + Vite                       |
| Backend      | Rust (commandes Tauri)                             |
| Persistance  | SQLite (`rusqlite`, base embarquée)                |
| Assistant IA | **Mistral en ligne** (clé API dans les Réglages)   |
| Fichiers     | Dossier de données applicatif (`dirs`)             |

Les données vivent localement, sans compte ni serveur :
`~/Library/Application Support/fr.clementsapp.maitrize/` (macOS) ou
`%APPDATA%\fr.clementsapp.maitrize\` (Windows) — base `maitrize.sqlite3` +
dossier `Fichiers/` pour les pièces jointes.

## Lancer en développement

```bash
cd maitrize-tauri
npm install
npm run tauri dev
```

## Compiler les binaires de distribution

```bash
npm run tauri build      # .dmg/.app (macOS) ou .msi/.exe (Windows)
```

## Fonctionnalités portées

Tableau de bord · Séquences (+ séances, notation, bilan) · Projets ·
Ateliers & Espaces · Planning hebdomadaire · Organisation (programmation
annuelle P1–P5, EDT type) · Élèves (appel, observations, évaluations &
notes, papiers) · Référentiels (import JSON, arbre des compétences, notes) ·
Matériel · Recherche transversale · Assistant IA Mistral · Réglages ·
fichiers joints.

## Volontairement abandonné (spécifique Apple)

Apple Intelligence local (`FoundationModels`) → remplacé par Mistral en ligne ·
Siri / App Intents · StoreKit (dons) · synchronisation iCloud/CloudKit ·
`SFSpeechRecognizer` (saisie vocale on-device).

## Architecture backend (`src-tauri/src/`)

- `db.rs` — connexion SQLite + schéma (toutes les tables)
- `models.rs` — structs serde miroir des tables (camelCase côté JS)
- `commands.rs` — commandes CRUD exposées via `invoke`
- `ai.rs` — passerelle API Mistral
- `lib.rs` — enregistrement des commandes + état partagé
