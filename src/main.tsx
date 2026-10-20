import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";
import { journal } from "./api";
import { estUnBug, proposerLeRapport } from "./rapportErreur";

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

// La vérification des mises à jour est gérée par <UpdateBanner /> (dans App) :
// téléchargement silencieux puis pastille « Relancer pour mettre à jour ».
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
