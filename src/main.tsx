import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { verifierMisesAJour } from "./updater";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// Vérifie les mises à jour au démarrage (uniquement en build de production,
// pour ne pas interroger le serveur en `tauri dev`).
if (import.meta.env.PROD) {
  void verifierMisesAJour(true);
}
