import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./theme.css";

// La vérification des mises à jour est gérée par <UpdateBanner /> (dans App) :
// téléchargement silencieux puis pastille « Relancer pour mettre à jour ».
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
