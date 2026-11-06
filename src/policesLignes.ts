// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Les variantes de Marelle qui tracent elles-mêmes la réglure Seyès, en couleur
// (voir policesEcriture.ts) : chargées à part, après le démarrage — elles pèsent
// plus d'un mégaoctet à elles quatre.

import lignes from "./assets/polices/marelle/MarelleLIGNES-Regular.woff2?inline";
import lignes2 from "./assets/polices/marelle/MarelleLIGNES2-Regular.woff2?inline";
import lignesBaton from "./assets/polices/marelle/MarelleLIGNESBaton-Regular.woff2?inline";
import lignesBaton2 from "./assets/polices/marelle/MarelleLIGNESBaton2-Regular.woff2?inline";

/** Le fichier de chaque police à lignes, par le nom de sa famille. */
export const FICHIERS_DES_LIGNES: Record<string, string> = {
  "Marelle LIGNES": lignes,
  "Marelle LIGNES 2": lignes2,
  "Marelle LIGNES Bâton": lignesBaton,
  "Marelle LIGNES Bâton 2": lignesBaton2,
};
