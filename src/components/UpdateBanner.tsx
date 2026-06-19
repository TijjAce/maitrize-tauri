import React from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import logo from "../assets/logo.png";

// Mise à jour façon Claude Desktop : on vérifie et on télécharge en SILENCE,
// puis on affiche une petite pastille « Relancer pour mettre à jour · vX »
// que l'utilisateur clique quand il veut. Aucune pop-up bloquante.

type Etat = "idle" | "downloading" | "ready" | "installing";

const INTERVALLE_MS = 1000 * 60 * 60 * 4; // re-vérifie toutes les 4 h

export function UpdateBanner() {
  const [etat, setEtat] = React.useState<Etat>("idle");
  const [version, setVersion] = React.useState("");
  const updateRef = React.useRef<Update | null>(null);
  const enCours = React.useRef(false);

  const verifierEtTelecharger = React.useCallback(async () => {
    // déjà en cours, ou une mise à jour est déjà prête à être installée
    if (enCours.current || updateRef.current) return;
    enCours.current = true;
    try {
      const u = await check();
      if (u) {
        updateRef.current = u;
        setVersion(u.version);
        setEtat("downloading");
        await u.download(); // téléchargement silencieux en arrière-plan
        setEtat("ready");
      }
    } catch (e) {
      console.error("updater:", e); // hors-ligne / pas de release : on ignore
    } finally {
      enCours.current = false;
    }
  }, []);

  React.useEffect(() => {
    if (!import.meta.env.PROD) return; // pas d'appel réseau en `tauri dev`
    verifierEtTelecharger();
    const id = window.setInterval(verifierEtTelecharger, INTERVALLE_MS);
    return () => window.clearInterval(id);
  }, [verifierEtTelecharger]);

  const installer = async () => {
    const u = updateRef.current;
    if (!u || etat === "installing") return;
    try {
      setEtat("installing");
      await u.install(); // applique le paquet déjà téléchargé
      await relaunch(); // redémarre sur la nouvelle version
    } catch (e) {
      console.error("updater install:", e);
      setEtat("ready"); // on laisse réessayer
    }
  };

  if (etat !== "ready" && etat !== "installing") return null;

  const installation = etat === "installing";
  return (
    <button
      className="update-pill"
      onClick={installer}
      disabled={installation}
      aria-live="polite"
      title={`Mettre à jour Maitrize vers la version ${version}`}
    >
      <img className="update-pill-ico" src={logo} alt="" />
      <span className="update-pill-text">
        <span className="update-pill-title">
          {installation ? "Mise à jour…" : "Relancer pour mettre à jour"}
        </span>
        <span className="update-pill-ver">v{version}</span>
      </span>
      <span className="update-pill-arrow" aria-hidden="true">{installation ? "↻" : "→"}</span>
    </button>
  );
}
