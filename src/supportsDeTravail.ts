// ── Mes photos, supports de travail ────────────────────────────────────────
//
// L'enseignant photographie avec le dictaphone l'objet ou le jeu de la
// classe (Mes pictos, d'origine « photo ») : pour l'élève qui n'entre pas
// dans l'abstraction d'un pictogramme, c'est un support de travail (demande
// de l'enseignant, octobre 2026). Chaque photo reçoit, dans Réglages ›
// Personnalisation, son nom, sa matière, son niveau de classe, le jeu de la
// ludothèque dont elle prend les règles, la séquence où elle sert. La
// séquence la montre avec son matériel ; « En retard » la donne à tout élève
// de son niveau, comme une fiche : c'est un atelier, que chaque élève reçoit
// dès qu'il y en a un à son niveau. Le jeu cité au cahier journal la montre
// avec sa règle, à l'écran et sur le papier, et sa carte la prend pour image
// sur les tablettes et dans les bandes (demande de l'enseignant, 2026-11-01).
// Elle peut aussi montrer un élément du plan de travail — du matériel, un
// outil pour l'élève, un affichage — : elle lui sert alors d'image dans la
// séance qui le pose et au cahier journal du créneau (même jour).
//
// Un niveau suffit — « tous les niveaux » compris — ; la matière ne fait que
// s'écrire au-dessus de la photo sur les tablettes. L'enseignant voulait voir
// ses ateliers en photo proposés sans avoir à leur chercher une matière
// (demande de l'enseignant, octobre 2026).

import type { MonPicto } from "./mesPictos";

/** Le niveau d'un support qui sert à tous les élèves. */
export const TOUS_LES_NIVEAUX = "tous";

/** Une photo devient un support de travail quand elle a son niveau ; sa matière est facultative. */
export const estUnSupport = (p: MonPicto): boolean => p.origine === "photo" && !!p.niveau;

/** Les photos rattachées à une séquence. */
export const supportsDeLaSequence = (photos: MonPicto[], sequenceId: string): MonPicto[] =>
  photos.filter((p) => p.origine === "photo" && p.sequenceId === sequenceId);

/** Ce qu'il faut d'une photo pour la carte de son jeu. */
export type PhotoDeJeu = Pick<MonPicto, "id" | "origine" | "jeuId">;

/** La photo d'un jeu, pour sa carte : la première qu'on lui a donnée. */
export const photoDuJeu = (photos: PhotoDeJeu[], jeuId: string): number | undefined =>
  photos.find((p) => p.origine === "photo" && p.jeuId === jeuId)?.id;

/** Ce qu'une photo peut montrer du plan de travail, dans l'ordre de son menu : le matériel, les outils pour l'élève, les affichages. */
export const GENRES_MONTRES = ["materiel", "outil", "affichage"] as const;

/** Un élément du plan de travail tel qu'une photo le garde : « outil:<id> ». */
export const cleDeLElement = (r: { genre: string; source: string }) => `${r.genre}:${r.source}`;

/** Les photos liées à un jeu ou à un élément du plan de travail. */
export const photosLiees = (photos: MonPicto[]): MonPicto[] => photos.filter((p) => p.origine === "photo" && (!!p.jeuId || !!p.elementId));

/** La photo d'un élément du plan de travail : la première qu'on lui a donnée. */
export const photoDeLElement = (photos: Pick<MonPicto, "id" | "origine" | "elementId">[], r: { genre: string; source: string }): number | undefined =>
  photos.find((p) => p.origine === "photo" && p.elementId === cleDeLElement(r))?.id;
