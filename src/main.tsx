// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Le relais de développement, avant tout le reste : dans le navigateur d'un autre ordinateur, le pont vers le Mac
// doit être là avant la première demande (voir relaisDev.ts). Rien dans l'application publiée.
import "./relaisDev";
import { accueillir } from "./bienvenue";

// La page de bienvenue d'abord ; l'application se charge quand le titre est écrit, pour ne pas le faire saccader (voir bienvenue.ts).
accueillir(({ appPrete }) => {
  void import("./lancement").then(({ lancer }) => { lancer(appPrete); }).catch((e) => {
    console.error(e);
    appPrete();
  });
});
