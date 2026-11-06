// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Fenetre } from "./Fenetre";
import { allerEnClasse, dansLApplication, passerEnEnseignant } from "./pont";

// ── La roue ───────────────────────────────────────────────────────────────
//
// « En haut à gauche, il y a une roue avec les réglages, qui s'ouvre pour passer
// en mode classe ou en mode enseignant » (l'enseignant, 6 novembre 2026). Le
// mode enseignant ne montre rien sans Nuage : un élève n'y trouve rien.

/** La roue : dessinée, pas de signe qu'iOS changerait en émoji. */
export function RoueDesReglages({ onClick }: { onClick: () => void }) {
  return (
    <button className="bouton roue" aria-label="Réglages" onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0-1.17-2.82H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.17-2.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 2.82-1.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0 1.17 2.82H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}

export function FenetreDesReglages({ onFermer, onMesClasseurs, avantDePartir }: {
  onFermer: () => void;
  /** Revenir à la liste des classeurs, depuis un classeur ouvert. */
  onMesClasseurs?: () => void;
  /** Ce qu'il faut garder avant de quitter le classeur. */
  avantDePartir?: () => Promise<void>;
}) {
  const partir = async (aller: () => void | Promise<void>) => {
    await avantDePartir?.();
    await aller();
  };
  return (
    <Fenetre titre="Réglages" onFermer={onFermer}>
      <div className="reglages">
        {onMesClasseurs && <button className="bouton reglage" onClick={onMesClasseurs}>Mes classeurs</button>}
        {dansLApplication() && (
          <>
            <button className="bouton reglage" onClick={() => { void partir(allerEnClasse); }}>Mode classe</button>
            <button className="bouton reglage" onClick={() => { void partir(passerEnEnseignant); }}>Mode enseignant</button>
          </>
        )}
      </div>
    </Fenetre>
  );
}
