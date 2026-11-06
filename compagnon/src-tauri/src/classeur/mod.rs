//! Le classeur de communication de l'élève.
//!
//! « Sur iOS, j'aimerais que tu construises une autre application pour créer
//! un PODD » (l'enseignant, 5 novembre 2026), puis « on va fusionner le
//! compagnon et le PODD » (le 6). L'enseignant crée le classeur — des pages
//! liées, sur les principes du PODD de Gayle Porter, sans en copier les pages,
//! qui sont protégées — et l'élève parle avec : chaque case se dit avec la voix
//! de l'appareil, même sans internet et en mode silencieux. L'écran est une
//! page à part (`classeur/` à la racine du dépôt), construite dans `public/`.
//!
//! Ce que Rust fait ici : garder les classeurs et leurs images dans le dossier
//! de l'application, sans jamais perdre la version d'avant (`stockage`) ;
//! chercher et prendre les pictos d'ARASAAC (`arasaac`) ; lire et écrire le
//! format ouvert des tableaux, celui que Maitrize écrit et relit (`obz`).

pub mod arasaac;
pub mod obz;
pub mod stockage;
