// Le minuteur visuel, demandé d'ailleurs que de son écran : la télécommande du téléphone le règle, le lance et
// le passe en plein écran (voir telecommande.ts). La demande attend que l'écran du minuteur soit monté ; déjà
// monté, il la reçoit par un événement.

/** Une durée est demandée : l'écran du minuteur la prend. */
export const EVT_MINUTEUR_DEMANDE = "maitrize:minuteur-demande";
/** « Ferme » : ce qui s'affiche en grand se referme. */
export const EVT_FERMER_AFFICHAGE = "maitrize:fermer-affichage";

let enAttente: number | null = null;

/** Demande un minuteur de `secondes`, lancé tout de suite, en plein écran. */
export function demanderMinuteur(secondes: number) {
  enAttente = secondes;
  window.dispatchEvent(new Event(EVT_MINUTEUR_DEMANDE));
}

/** La durée demandée, une seule fois. */
export function prendreLaDemande(): number | null {
  const s = enAttente;
  enAttente = null;
  return s;
}
