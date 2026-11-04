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
// séance qui le pose et au cahier journal du créneau (même jour). Un outil
// pour l'enseignant ou un espace de la classe aussi — ses classeurs,
// l'armoire… : « il faudrait également ajouter, espace de classe et outils
// pour l'enseignant » (l'enseignant, 4 novembre 2026). Sur le bureau du plan
// de travail, elle sert d'image à ce qu'elle montre.
//
// Un niveau suffit — « tous les niveaux » compris — ; la matière ne fait que
// s'écrire au-dessus de la photo sur les tablettes. L'enseignant voulait voir
// ses ateliers en photo proposés sans avoir à leur chercher une matière
// (demande de l'enseignant, octobre 2026).

import type { Espace } from "./api";
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

/**
 * Ce qu'une photo peut montrer du plan de travail, dans l'ordre de son menu :
 * le matériel, les outils pour l'élève et pour l'enseignant, les affichages ;
 * puis les espaces de la classe (voir espacesMontres).
 */
export const GENRES_MONTRES = ["materiel", "outil", "enseignant", "affichage"] as const;

/** Un élément du plan de travail tel qu'une photo le garde : « outil:<id> », « espace:<id> ». */
export const cleDeLElement = (r: { genre: string; source: string }) => `${r.genre}:${r.source}`;

/** Le groupe des espaces, dans le menu d'une photo. */
export const ESPACES_DE_LA_CLASSE = "Espaces de la classe";

const comparer = new Intl.Collator("fr", { sensitivity: "base", numeric: true }).compare;

/**
 * Les espaces de la classe — l'armoire, le coin regroupement… — qu'une photo
 * peut montrer, tels qu'elle les garde (« espace:<id> ») : par ordre
 * alphabétique, sans ceux qui n'ont pas de nom.
 */
export const espacesMontres = (espaces: Pick<Espace, "id" | "titre">[]): { cle: string; titre: string }[] =>
  espaces.filter((e) => e.titre.trim())
    .map((e) => ({ cle: cleDeLElement({ genre: "espace", source: e.id }), titre: e.titre }))
    .sort((a, b) => comparer(a.titre, b.titre));

/** Les photos liées à un jeu ou à un élément du plan de travail. */
export const photosLiees = (photos: MonPicto[]): MonPicto[] => photos.filter((p) => p.origine === "photo" && (!!p.jeuId || !!p.elementId));

/** La photo d'un élément du plan de travail : la première qu'on lui a donnée. */
export const photoDeLElement = (photos: Pick<MonPicto, "id" | "origine" | "elementId">[], r: { genre: string; source: string }): number | undefined =>
  photos.find((p) => p.origine === "photo" && p.elementId === cleDeLElement(r))?.id;
