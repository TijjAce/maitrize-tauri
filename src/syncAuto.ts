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

let minuteur: ReturnType<typeof setTimeout> | null = null;
let enCours = false;
let prochainDelai = PERIODE;

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
    // Ne prévenir les écrans que si quelque chose est réellement arrivé :
    // un rafraîchissement toutes les 30 secondes pour rien ferait clignoter
    // l'interface sans raison.
    if (r.appliques > 0) {
      window.dispatchEvent(new CustomEvent(EVT_DONNEES_DISTANTES));
    }
  } catch {
    /* silencieux : l'état s'affiche dans le bandeau */
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
  const auRetour = () => { if (!document.hidden) programmer(500); };
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
  prochainDelai = PERIODE;
  programmer(APRES_ECRITURE);
}
