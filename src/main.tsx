import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";
import { journal } from "./api";

// Filet global : une erreur de rendu ou une promesse rejetée laisse une trace
// sur le disque, faute de console dans la fenêtre de l'application.
window.addEventListener("error", (e) =>
  journal(`ERREUR ${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`));
window.addEventListener("unhandledrejection", (e) =>
  journal(`PROMESSE REJETÉE ${String((e.reason as Error)?.message ?? e.reason)}`));

// La vérification des mises à jour est gérée par <UpdateBanner /> (dans App) :
// téléchargement silencieux puis pastille « Relancer pour mettre à jour ».
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
