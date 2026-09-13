import React from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import logo from "../assets/logo.png";
import { journal, texteErreur } from "../api";

// Mise à jour façon Claude Desktop : on vérifie et on télécharge en SILENCE,
// puis on affiche une petite pastille « Relancer pour mettre à jour · vX »
// que l'utilisateur clique quand il veut. Aucune pop-up bloquante.
//
// Un échec, en revanche, ne doit plus passer en silence : c'est ce qui rendait
// une mise à jour bloquée indiscernable d'une absence de mise à jour.

type Etat = "idle" | "downloading" | "ready" | "installing" | "echec";

const INTERVALLE_MS = 1000 * 60 * 60 * 4; // re-vérifie toutes les 4 h
const PAGE_VERSIONS = "https://github.com/TijjAce/maitrize-tauri/releases/latest";
const CLE_TENTATIVE = "maj_tentee";

/**
 * Une installation lancée puis restée sans effet.
 *
 * Sur Windows, l'application se ferme AVANT que l'installateur ne tourne : si
 * le système bloque celui-ci, plus personne n'est là pour le dire. On note donc
 * la version visée avant de partir, et l'on compare au redémarrage.
 */
export function tentativeRestee(noteJson: string | null, versionActuelle: string): string | null {
  if (!noteJson) return null;
  try {
    const { version } = JSON.parse(noteJson) as { version?: string };
    return version && version !== versionActuelle ? version : null;
  } catch { return null; }
}

const lire = (cle: string) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle: string, v: string | null) => {
  try { v === null ? localStorage.removeItem(cle) : localStorage.setItem(cle, v); } catch { /* stockage indisponible */ }
};

export function UpdateBanner() {
  const [etat, setEtat] = React.useState<Etat>("idle");
  const [version, setVersion] = React.useState("");
  const [echec, setEchec] = React.useState("");
  const updateRef = React.useRef<Update | null>(null);
  const enCours = React.useRef(false);

  const echouer = (message: string, err?: unknown) => {
    journal(`MISE À JOUR ${message}${err !== undefined ? ` : ${texteErreur(err)}` : ""}`);
    setEchec(message);
    setEtat("echec");
  };

  const verifierEtTelecharger = React.useCallback(async () => {
    // déjà en cours, ou une mise à jour est déjà prête à être installée
    if (enCours.current || updateRef.current) return;
    enCours.current = true;
    let u: Update | null = null;
    try {
      u = await check();
    } catch (e) {
      // Hors ligne, le plus souvent : rien à montrer, mais une trace.
      journal(`MISE À JOUR vérification impossible : ${texteErreur(e)}`);
      enCours.current = false;
      return;
    }
    try {
      if (u) {
        updateRef.current = u;
        setVersion(u.version);
        setEtat("downloading");
        await u.download(); // téléchargement silencieux en arrière-plan
        setEtat("ready");
      }
    } catch (e) {
      updateRef.current = null;
      echouer("Téléchargement de la mise à jour impossible", e);
    } finally {
      enCours.current = false;
    }
  }, []);

  React.useEffect(() => {
    if (!import.meta.env.PROD) return; // pas d'appel réseau en `tauri dev`
    getVersion().then((actuelle) => {
      const visee = tentativeRestee(lire(CLE_TENTATIVE), actuelle);
      ecrire(CLE_TENTATIVE, null);
      if (visee) {
        setVersion(visee);
        echouer(`La mise à jour vers la v${visee} ne s'est pas installée`);
      }
    }).catch(() => {});
    verifierEtTelecharger();
    const id = window.setInterval(verifierEtTelecharger, INTERVALLE_MS);
    return () => window.clearInterval(id);
  }, [verifierEtTelecharger]);

  const installer = async () => {
    const u = updateRef.current;
    if (!u || etat === "installing") return;
    try {
      setEtat("installing");
      ecrire(CLE_TENTATIVE, JSON.stringify({ version: u.version, le: new Date().toISOString() }));
      await u.install(); // sur Windows, l'application se ferme ici
      await relaunch(); // redémarre sur la nouvelle version
    } catch (e) {
      ecrire(CLE_TENTATIVE, null);
      echouer("Installation de la mise à jour impossible", e);
    }
  };

  if (etat === "echec") {
    return (
      <div className="update-pill update-pill-echec" role="alert">
        <img className="update-pill-ico" src={logo} alt="" />
        <span className="update-pill-text">
          <span className="update-pill-title">{echec}</span>
          <span className="update-pill-ver">Installez-la à la main depuis la page des versions.</span>
        </span>
        <span className="update-pill-actions">
          <button className="btn sm primary" onClick={() => openUrl(PAGE_VERSIONS).catch(() => window.open(PAGE_VERSIONS, "_blank"))}>
            Télécharger
          </button>
          <button className="btn ghost sm" onClick={() => setEtat("idle")}>Plus tard</button>
        </span>
      </div>
    );
  }

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
