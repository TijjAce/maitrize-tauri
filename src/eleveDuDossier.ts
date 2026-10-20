// L'élève qu'on regarde dans le dossier : le Dossier et sa Synthèse le partagent, pour qu'on passe de
// l'un à l'autre sans revenir au premier élève de la liste. Gardé le temps de la session.

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
