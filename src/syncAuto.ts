// Synchronisation automatique, en tâche de fond.
//
// L'objectif est qu'il n'y ait plus rien à cliquer : on ferme le portable, on
// ouvre le bureau, tout est là. Le va-et-vient manuel reste possible depuis le
// tableau de bord, mais il ne devrait plus servir.

import { api } from "./api";
import { EVT_DONNEES_DISTANTES } from "./components/ui";

/** Intervalle de fond, en millisecondes. */
const PERIODE = 30_000;
/** Intervalle après une écriture locale : on part vite, sans marteler. */
const APRES_ECRITURE = 3_000;
/** Au-delà, on ne réessaie plus si souvent : le stockage ne répond pas. */
export const PERIODE_MAX = 5 * 60_000;

/**
 * Combien attendre après des échecs de suite.
 *
 * Sans cela, une matinée hors réseau recommence toutes les trente secondes —
 * cinquante-deux passages en une heure dans le journal d'incidents, chacun
 * s'obstinant auprès d'un stockage qui ne répond pas. L'attente double à
 * chaque échec, jusqu'à cinq minutes, et repart à zéro dès que ça marche.
 */
export function attenteApres(echecs: number): number {
  if (echecs <= 0) return PERIODE;
  return Math.min(PERIODE_MAX, PERIODE * 2 ** Math.min(echecs, 10));
}

let minuteur: ReturnType<typeof setTimeout> | null = null;
let enCours = false;
let prochainDelai = PERIODE;
/** Échecs consécutifs : c'est eux qui espacent les passages. */
let echecs = 0;

/**
 * Un passage de synchronisation.
 *
 * Silencieux par nature : un stockage injoignable ou une phrase manquante ne
 * doit pas interrompre l'enseignant en pleine séance. Les échecs se voient
 * dans le bandeau du tableau de bord, pas en surgissant.
 */
async function passage() {
  if (enCours || document.hidden) return;
  enCours = true;
  try {
    const r = await api.syncDeltas();
    // Les fichiers après les lignes : une ligne qui désigne une photo absente
    // affiche un cadre vide, l'inverse ne gêne personne.
    const f = await api.syncFichiers().catch(() => null);
    // Ne prévenir les écrans que si quelque chose est réellement arrivé :
    // un rafraîchissement toutes les 30 secondes pour rien ferait clignoter
    // l'interface sans raison.
    if (r.appliques > 0 || (f?.recus ?? 0) > 0) {
      window.dispatchEvent(new CustomEvent(EVT_DONNEES_DISTANTES));
    }
    // Gros lot de photos : on repasse vite plutôt que d'attendre 30 secondes.
    echecs = 0;
    prochainDelai = (f?.restants ?? 0) > 0 ? APRES_ECRITURE : PERIODE;
  } catch {
    // Silencieux : l'état s'affiche dans le bandeau. Mais on s'espace, pour
    // ne pas passer la matinée à parler à un stockage absent.
    echecs += 1;
    prochainDelai = attenteApres(echecs);
  } finally {
    enCours = false;
  }
}

function programmer(delai: number) {
  if (minuteur) clearTimeout(minuteur);
  minuteur = setTimeout(async () => { await passage(); programmer(prochainDelai); }, delai);
}

/** Démarre la boucle. Rendre la fonction d'arrêt facilite les tests. */
export function demarrerSyncAuto(): () => void {
  programmer(APRES_ECRITURE);
  // Retour sur la fenêtre : l'autre machine a pu travailler entre-temps, et
  // c'est le moment où l'enseignant regarde vraiment son écran.
  // Revenir sur la fenêtre, c'est souvent avoir retrouvé du réseau : on
  // reprend tout de suite, et sans l'attente accumulée.
  const auRetour = () => { if (!document.hidden) { echecs = 0; programmer(500); } };
  window.addEventListener("focus", auRetour);
  document.addEventListener("visibilitychange", auRetour);
  return () => {
    if (minuteur) clearTimeout(minuteur);
    minuteur = null;
    window.removeEventListener("focus", auRetour);
    document.removeEventListener("visibilitychange", auRetour);
  };
}

/** À appeler après une écriture locale pour faire partir le changement vite. */
export function synchroniserBientot() {
  echecs = 0;
  prochainDelai = PERIODE;
  programmer(APRES_ECRITURE);
}
