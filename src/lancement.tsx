// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// L'application elle-même : chargée à part, derrière la page de bienvenue (voir main.tsx et bienvenue.ts).
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";
import { journal } from "./api";
import { estUnBug, proposerLeRapport } from "./rapportErreur";
import { installerAnnulation } from "./annulation";
import { chargerLesLignes, poserSurLaPage } from "./policesEcriture";

// Filet global : une erreur de rendu ou une promesse rejetée laisse une trace
// sur le disque, faute de console dans la fenêtre de l'application ; un vrai
// bug propose en plus d'en envoyer le rapport à l'éditeur, d'un clic.
window.addEventListener("error", (e) => {
  const message = `${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`;
  journal(`ERREUR ${message}`);
  proposerLeRapport(message);
});
window.addEventListener("unhandledrejection", (e) => {
  journal(`PROMESSE REJETÉE ${String((e.reason as Error)?.message ?? e.reason)}`);
  if (estUnBug(e.reason)) proposerLeRapport((e.reason as Error).message);
});

// ⌘Z, un seul écouteur pour toute l'application (voir annulation.ts).
installerAnnulation();

// La police cursive choisie, pour les aperçus des feuilles (voir policesEcriture.ts) ; ses
// variantes à lignes Seyès, lourdes, un peu après le démarrage.
poserSurLaPage();
setTimeout(() => { void chargerLesLignes(); }, 1500);

/** Son effet arrive quand l'application est à l'écran : c'est le signal attendu par la page de bienvenue. */
function Montee({ onMontee }: { onMontee: () => void }) {
  React.useEffect(() => { onMontee(); }, [onMontee]);
  return null;
}

/** Monte l'application ; `onMontee` : elle est à l'écran. */
export function lancer(onMontee: () => void) {
  // La vérification des mises à jour est gérée par <UpdateBanner /> (dans App) :
  // téléchargement silencieux puis pastille « Relancer pour mettre à jour ».
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
      <Montee onMontee={onMontee} />
    </React.StrictMode>
  );
}
