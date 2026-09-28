// Le zoom au pincement, comme sur la grille du planning.
//
// Le trackpad pince ; Safari et Chrome en font un événement wheel avec
// ctrlKey. On en tire un facteur borné, retenu par ordinateur — c'est une
// préférence d'affichage, pas une donnée de travail, elle ne se partage pas.
// La grille du planning et l'emploi du temps l'appliquent à la hauteur des
// heures ; le cahier journal, à tout son texte (zoom CSS).

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.5;

/** Le facteur, ramené entre ce qu'on lit encore et ce qui tient à l'écran. */
export const bornerZoom = (v: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

/** Le zoom retenu, tel qu'il est enregistré ; 1 s'il n'y en a pas ou qu'il n'est pas raisonnable. */
export function lireZoom(brut: string | null | undefined): number {
  const v = Number(brut);
  return v >= ZOOM_MIN && v <= ZOOM_MAX ? v : 1;
}

/** Le zoom après un cran de pincement : le trackpad donne un deltaY, négatif quand on écarte les doigts. */
export const zoomApresPincement = (zoom: number, deltaY: number) => bornerZoom(zoom - deltaY * 0.01);

/**
 * Le zoom réel du cahier journal pour le niveau affiché.
 *
 * Sur la grille du planning, le pourcentage n'étire que la hauteur des
 * heures : le texte garde sa taille, 60 % reste lisible. Le journal, lui,
 * n'est que du texte : au même chiffre, il fondrait deux fois plus. Pour
 * que les deux se répondent côte à côte, son chiffre bouge deux fois plus
 * que sa taille — 60 % affiché, c'est un journal à 80 % ; 250 %, à 175 %.
 */
export const zoomReelDuJournal = (niveau: number) => 1 + (niveau - 1) / 2;
