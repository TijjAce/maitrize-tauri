import React from "react";
import { api, isMac, journal, texteErreur, type BilanCopie } from "../api";
import { EVT_DONNEES_DISTANTES } from "./ui";
import { toast } from "./Toaster";
import { planDeCopie, type DonneesBureau } from "../copieBureau";

// ── La copie du bureau se tient à jour seule ───────────────────────────────
//
// Toutes les deux minutes, on compare le bureau à sa copie dans le dossier de
// l'ordinateur ; s'il a changé, les fichiers concernés sont réécrits (voir
// copieBureau.ts pour le contenu, copie_bureau.rs pour l'écriture). Le
// premier passage attend que l'application ait fini de démarrer.

const PREMIER_PASSAGE = 20_000;
const INTERVALLE = 2 * 60_000;

export interface ResultatCopie { bilan: BilanCopie | null; aJour: boolean; desactivee: boolean }

async function lireBureau(): Promise<DonneesBureau> {
  const [sequences, seances, piecesJointes, materiels, textes, coffre, reglages, jeux, ateliers, espaces, outils] = await Promise.all([
    api.sequencesList(), api.seancesList(), api.piecesJointesList(), api.materielList(),
    api.textesList(), api.coffreList(), api.settingsAll(), api.jeuxList(),
    api.ateliersList(), api.espacesList(), api.outilsClasseList(),
  ]);
  return { sequences, seances, piecesJointes, materiels, textes, coffre, reglages, jeux, ateliers, espaces, outils };
}

let enCours: Promise<ResultatCopie> | null = null;
const abonnes = new Set<(r: ResultatCopie) => void>();

/** Suivre les passages de la copie (écran des réglages). */
export function suivreLaCopie(f: (r: ResultatCopie) => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/** Met la copie à jour si le bureau a changé. Un seul passage à la fois. */
export function copierLeBureau(): Promise<ResultatCopie> {
  if (enCours) return enCours;
  enCours = (async (): Promise<ResultatCopie> => {
    const info = await api.copieBureauInfo();
    if (!info.active) return { bilan: null, aJour: false, desactivee: true };
    const plan = planDeCopie(await lireBureau(), isMac ? "mac" : "windows");
    const squelette = plan.fichiers.map((f) => ({
      chemin: f.chemin, empreinte: f.empreinte, fichier: f.source.genre === "fichier" ? f.source.nom : undefined,
    }));
    const preparation = await api.copieBureauPreparer(squelette, plan.dossiers);
    if (!preparation.travail) return { bilan: info.derniere, aJour: true, desactivee: false };
    // Seuls les contenus à écrire sont fabriqués et envoyés.
    const aEcrire = new Set(preparation.aEcrire);
    const entrees = plan.fichiers.map((f, i) => ({
      ...squelette[i],
      contenu: f.source.genre === "contenu" && aEcrire.has(f.chemin) ? f.source.creer() : undefined,
    }));
    const bilan = await api.copieBureauAppliquer(entrees, plan.dossiers);
    return { bilan, aJour: false, desactivee: false };
  })();
  const passage = enCours;
  passage
    .then((r) => abonnes.forEach((f) => f(r)))
    .catch(() => {})
    .finally(() => { if (enCours === passage) enCours = null; });
  return passage;
}

/** Après un échec d'écriture, les passages automatiques s'espacent. */
const PAUSE_APRES_ECHEC = 30 * 60_000;

/** Monté une fois dans l'application : lance les passages. */
export function CopieDuBureau() {
  React.useEffect(() => {
    let refusSignale = false;
    let pauseJusqua = 0;
    const passer = () => {
      if (Date.now() < pauseJusqua) return;
      copierLeBureau()
        .then(({ bilan }) => {
          pauseJusqua = bilan && bilan.erreurs.length ? Date.now() + PAUSE_APRES_ECHEC : 0;
          if (bilan?.autorisationRefusee && !refusSignale) {
            refusSignale = true;
            toast(isMac
              ? "La copie du bureau n'a pas pu écrire sur votre Bureau : autorisez Maitrize dans Réglages Système → Confidentialité et sécurité → Fichiers et dossiers."
              : "La copie du bureau n'a pas pu écrire dans son dossier : choisissez un autre emplacement dans Réglages → Données & synchro.",
            { icone: "🖥", duree: 12000 });
          }
        })
        .catch((e) => journal(`COPIE BUREAU ${texteErreur(e)}`));
    };
    const premier = window.setTimeout(passer, PREMIER_PASSAGE);
    const intervalle = window.setInterval(passer, INTERVALLE);
    // Des données arrivent de l'autre ordinateur : la copie suit peu après.
    let differe: number | undefined;
    const distant = () => { window.clearTimeout(differe); differe = window.setTimeout(passer, 15_000); };
    window.addEventListener(EVT_DONNEES_DISTANTES, distant);
    return () => {
      window.clearTimeout(premier);
      window.clearInterval(intervalle);
      window.clearTimeout(differe);
      window.removeEventListener(EVT_DONNEES_DISTANTES, distant);
    };
  }, []);
  return null;
}
