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
// dès qu'il y en a un à son niveau.
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
