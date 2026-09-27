// Coloriages magiques : on calcule, le résultat dit la couleur, l'image apparaît.
//
// L'intérêt n'est pas le dessin : c'est qu'une erreur de calcul se voie. Une
// case de la mauvaise couleur crève les yeux au milieu d'un poisson, là où une
// ligne de calculs faux passe inaperçue. L'élève se corrige seul.
//
// Le dessin est une grille de cases, chacune d'une couleur — les cases vides
// restent blanches et ne portent aucun calcul. On tire ensuite, pour chaque
// case, une opération dont le résultat est celui de sa couleur.
//
// Tout est reproductible : à graine égale, même feuille. C'est ce qui permet
// de réimprimer la feuille d'un élève absent, et de montrer le corrigé.

import { hasard } from "./problemesBarres";

// ── Les dessins ───────────────────────────────────────────────────────────
//
// Huit cases sur huit, des chiffres pour les couleurs, un point pour le blanc.
// Huit sur huit parce qu'au-delà la feuille devient un pensum : ces motifs
// demandent entre trente-cinq et cinquante calculs, ce qui fait déjà une
// séance.

export interface Motif {
  id: string;
  nom: string;
  /** Une ligne par rangée, un caractère par case : « . » ou « 1 »…« 3 ». */
  grille: string[];
}

export const MOTIFS: Motif[] = [
  { id: "coeur", nom: "Un cœur", grille: [
    ".11..11.",
    "11111111",
    "11111111",
    "11111111",
    ".111111.",
    "..1111..",
    "...11...",
    "........",
  ] },
  { id: "maison", nom: "Une maison", grille: [
    "...11...",
    "..1111..",
    ".111111.",
    "11111111",
    ".222222.",
    ".222222.",
    ".223322.",
    ".223322.",
  ] },
  { id: "sapin", nom: "Un sapin", grille: [
    "...33...",
    "...11...",
    "..1111..",
    ".111111.",
    "..1111..",
    ".111111.",
    "11111111",
    "...22...",
  ] },
  { id: "poisson", nom: "Un poisson", grille: [
    "........",
    "..1111..",
    ".1111112",
    "11131112",
    "11111112",
    ".1111112",
    "..1111..",
    "........",
  ] },
  { id: "etoile", nom: "Une étoile", grille: [
    "...11...",
    "...11...",
    ".111111.",
    "11111111",
    ".111111.",
    "..1111..",
    "..1..1..",
    ".11..11.",
  ] },
  { id: "fleur", nom: "Une fleur", grille: [
    "..1111..",
    ".111111.",
    "11122111",
    "11122111",
    ".111111.",
    "..1331..",
    "...33...",
    "...33...",
  ] },
];

// ── Les couleurs ──────────────────────────────────────────────────────────
//
// Des feutres que tout le monde a dans sa trousse, nommés comme en classe.

export interface CouleurColoriage { id: string; nom: string; hex: string }

export const COULEURS: CouleurColoriage[] = [
  { id: "1", nom: "rouge", hex: "#e11d48" },
  { id: "2", nom: "bleu", hex: "#2563eb" },
  { id: "3", nom: "jaune", hex: "#eab308" },
];

export const couleurDe = (id: string) => COULEURS.find((c) => c.id === id);

/** Les couleurs qu'un motif emploie, dans l'ordre où on les rencontre. */
export function couleursDuMotif(m: Motif): CouleurColoriage[] {
  const vues: string[] = [];
  for (const ligne of m.grille) {
    for (const c of ligne) {
      if (c !== "." && !vues.includes(c)) vues.push(c);
    }
  }
  return vues.map((id) => couleurDe(id)).filter((c): c is CouleurColoriage => !!c);
}

/** Combien de calculs ce motif demande : une case coloriée, un calcul. */
export const casesAColorier = (m: Motif) =>
  m.grille.join("").split("").filter((c) => c !== ".").length;

// ── Les calculs ───────────────────────────────────────────────────────────

export type Operation = "addition" | "soustraction" | "melange" | "multiplication";

export const OPERATIONS: { id: Operation; libelle: string }[] = [
  { id: "addition", libelle: "Additions" },
  { id: "soustraction", libelle: "Soustractions" },
  { id: "melange", libelle: "Additions et soustractions" },
  { id: "multiplication", libelle: "Table de multiplication" },
];

export const PLAFONDS = [10, 20, 100];

export interface ReglagesColoriage {
  motif: string;
  operation: Operation;
  /** Pour les additions et soustractions : au-delà de quoi on ne va pas. */
  plafond: number;
  /** Pour la multiplication : la table travaillée. */
  table: number;
  titre: string;
}

export const REGLAGES_PAR_DEFAUT: ReglagesColoriage = {
  motif: "poisson", operation: "addition", plafond: 10, table: 2,
  titre: "Coloriage magique",
};

/**
 * Une opération dont le résultat est celui qu'on veut.
 *
 * Elle n'invente pas : on part du résultat et l'on remonte, sans quoi il
 * faudrait tirer au hasard jusqu'à tomber juste.
 */
export function operationPour(
  resultat: number, operation: Operation, plafond: number, table: number, r: () => number,
): string {
  const sorte = operation === "melange" ? (r() < 0.5 ? "addition" : "soustraction") : operation;
  if (sorte === "multiplication") {
    // Une table ne laisse qu'une écriture par résultat : toutes les cases
    // d'une couleur porteraient le même calcul. On retourne donc le produit
    // une fois sur deux — la commutativité est elle-même au programme.
    const autre = Math.round(resultat / Math.max(1, table));
    return r() < 0.5 ? `${table} × ${autre}` : `${autre} × ${table}`;
  }
  if (sorte === "soustraction") {
    // a − b = resultat, avec a au plus le plafond.
    const bMax = Math.max(1, plafond - resultat);
    const b = 1 + Math.floor(r() * bMax);
    return `${resultat + b} − ${b}`;
  }
  // a + b = resultat, les deux au moins 1 quand c'est possible.
  if (resultat < 2) return `${resultat} + 0`;
  const a = 1 + Math.floor(r() * (resultat - 1));
  return `${a} + ${resultat - a}`;
}

/**
 * Les résultats donnés aux couleurs : un par couleur, tous différents.
 *
 * Deux couleurs qui partageraient un résultat rendraient le coloriage
 * impossible — et c'est l'élève qui en pâtirait, pas nous.
 */
export function resultatsDesCouleurs(
  couleurs: CouleurColoriage[], operation: Operation, plafond: number, table: number, r: () => number,
): number[] {
  const possibles = operation === "multiplication"
    ? Array.from({ length: 10 }, (_, i) => table * (i + 1))
    : Array.from({ length: plafond - 1 }, (_, i) => i + 2);
  const melange = [...possibles];
  for (let i = melange.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [melange[i], melange[j]] = [melange[j], melange[i]];
  }
  // Moins de résultats que de couleurs ne devrait pas arriver ; on complète
  // plutôt que de rendre une feuille impossible à colorier.
  const pris = melange.slice(0, couleurs.length);
  while (pris.length < couleurs.length) pris.push(possibles[pris.length % possibles.length] ?? 2);
  return pris;
}

export interface CaseColoriage {
  /** Vide pour une case blanche, qui ne porte aucun calcul. */
  calcul: string;
  /** L'identifiant de la couleur, vide pour une case blanche. */
  couleur: string;
}

export interface Coloriage {
  motif: Motif;
  legende: { couleur: CouleurColoriage; resultat: number }[];
  lignes: CaseColoriage[][];
}

/** La feuille entière, reproductible à graine égale. */
export function fabriquerColoriage(reglages: ReglagesColoriage, graine: number): Coloriage {
  const motif = MOTIFS.find((m) => m.id === reglages.motif) ?? MOTIFS[0];
  const r = hasard(graine);
  const couleurs = couleursDuMotif(motif);
  const resultats = resultatsDesCouleurs(couleurs, reglages.operation, reglages.plafond, reglages.table, r);
  const legende = couleurs.map((couleur, i) => ({ couleur, resultat: resultats[i] }));
  const lignes = motif.grille.map((ligne) => [...ligne].map((c) => {
    const place = couleurs.findIndex((x) => x.id === c);
    if (place < 0) return { calcul: "", couleur: "" };
    return {
      calcul: operationPour(resultats[place], reglages.operation, reglages.plafond, reglages.table, r),
      couleur: c,
    };
  }));
  return { motif, legende, lignes };
}

/** Ce que la consigne dit à l'élève, selon ce qu'on lui fait calculer. */
export function consigne(reglages: ReglagesColoriage): string {
  const quoi = reglages.operation === "multiplication"
    ? `Calcule, puis colorie selon la table de ${reglages.table}.`
    : "Calcule chaque case, puis colorie-la selon son résultat.";
  return `${quoi} Une case sans calcul reste blanche.`;
}
