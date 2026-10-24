// L'élève qu'on regarde dans Élèves : le Dossier, sa Synthèse et les onglets où s'ouvrent ses pièces
// (Dispositifs — PPI et GEVA-Sco compris —, grilles d'observation, synthèse de GS) le partagent. On passe de l'un
// à l'autre sans revenir au premier élève de la liste. Gardé le temps de la session.

import React from "react";

const CLE = "maitrize:eleve-du-dossier";

export function eleveDuDossier(): string {
  try { return sessionStorage.getItem(CLE) ?? ""; } catch { return ""; }
}

export function retenirEleveDuDossier(id: string): void {
  try { if (id) sessionStorage.setItem(CLE, id); } catch { /* sans stockage, chaque vue part du premier élève */ }
}

/** L'élève à montrer : celui qu'on regardait s'il est encore là, sinon le premier. */
export function eleveAMontrer(eleves: { id: string }[], voulu: string): string {
  return eleves.some((e) => e.id === voulu) ? voulu : eleves[0]?.id ?? "";
}

/**
 * L'élève d'un onglet d'Élèves, le même pour tous. Venu du dossier (« Voir »,
 * « Remplir »), l'onglet montre l'élève qu'on regardait — il ouvrait le premier
 * de la liste, et la saisie partait dans son dossier ; un choix fait ici suit
 * dans les autres onglets. `prefere` désigne l'élève montré à défaut (un élève
 * de GS pour la synthèse de GS), sinon le premier.
 */
export function useEleveDuDossier<E extends { id: string }>(
  eleves: E[] | null | undefined,
  prefere?: (e: E) => boolean,
): [string, (id: string) => void] {
  const [voulu, setVoulu] = React.useState(eleveDuDossier);
  const choisir = React.useCallback((id: string) => { setVoulu(id); retenirEleveDuDossier(id); }, []);
  return [eleveAChoisir(eleves ?? [], voulu, prefere), choisir];
}

/** L'élève voulu s'il est dans la liste, sinon celui que `prefere` désigne, sinon le premier. */
export function eleveAChoisir<E extends { id: string }>(eleves: E[], voulu: string, prefere?: (e: E) => boolean): string {
  if (eleves.some((e) => e.id === voulu)) return voulu;
  return ((prefere && eleves.find(prefere)) || eleves[0])?.id ?? "";
}
