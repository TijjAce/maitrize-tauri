// Fabriquer une feuille pour une séance (demande de l'enseignant, octobre
// 2026). Depuis la séance, « ✨ Fabriquer une feuille » ouvre les générateurs
// de Fabriquer ; tant qu'on y travaille pour elle, la feuille qu'on enregistre
// va dans la séance au lieu de la racine du plan de travail — elle s'imprime
// alors avec le cahier journal du jour où la séance est posée. Le bandeau de
// Fabriquer le dit ; « Terminé » rend aux générateurs leur enregistrement
// habituel, sur le bureau.

import React from "react";

export interface PourLaSeance {
  seanceId: string;
  sequenceId: string | null;
  /** Ce que le bandeau et le bouton en disent : « Séance 3 — Les nombres jusqu'à 10 ». */
  titre: string;
}

const CLE_SESSION = "maitrize:feuille-pour-la-seance";

function lireSession(): PourLaSeance | null {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION);
    const p = brut ? JSON.parse(brut) as Partial<PourLaSeance> : null;
    return p && typeof p.seanceId === "string" && p.seanceId && typeof p.titre === "string"
      ? { seanceId: p.seanceId, sequenceId: typeof p.sequenceId === "string" ? p.sequenceId : null, titre: p.titre } : null;
  } catch {
    return null;
  }
}

// Gardée pour la fenêtre : un rechargement ne la perd pas, un redémarrage l'oublie.
let courante: PourLaSeance | null = lireSession();
const abonnes = new Set<() => void>();

export const feuillePourLaSeance = {
  lire: (): PourLaSeance | null => courante,
  poser(p: PourLaSeance) {
    courante = p;
    try { sessionStorage.setItem(CLE_SESSION, JSON.stringify(p)); } catch { /* stockage indisponible */ }
    abonnes.forEach((f) => f());
  },
  finir() {
    if (!courante) return;
    courante = null;
    try { sessionStorage.removeItem(CLE_SESSION); } catch { /* idem */ }
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) {
    abonnes.add(f);
    return () => { abonnes.delete(f); };
  },
};

export const usePourLaSeance = (): PourLaSeance | null =>
  React.useSyncExternalStore(feuillePourLaSeance.abonner, feuillePourLaSeance.lire);

/** Ouvre les générateurs de Fabriquer pour cette séance. */
export function fabriquerPourLaSeance(p: PourLaSeance, aller: (chemin: string) => void) {
  feuillePourLaSeance.poser(p);
  aller("/jeux");
}

/** Le chemin de la séance, pour y revenir : sa séquence. */
export const cheminDeLaSeance = (p: PourLaSeance) => (p.sequenceId ? `/sequences/${p.sequenceId}` : "/plan");
