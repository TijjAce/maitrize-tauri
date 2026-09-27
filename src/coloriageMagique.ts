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
import { contientLeSon, SONS, sonDe, type Son } from "./lectureSons";

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

/**
 * Ce qu'on met dans les cases.
 *
 * Le calcul n'est qu'une façon de faire : un coloriage magique marche aussi
 * bien avec des mots, la couleur étant donnée par le graphème qu'on y lit.
 * C'est alors du déchiffrage, et l'erreur se voit toujours aussi bien.
 */
export type Matiere = "calcul" | "lettres";

export type Operation = "addition" | "soustraction" | "melange" | "multiplication";

export const OPERATIONS: { id: Operation; libelle: string }[] = [
  { id: "addition", libelle: "Additions" },
  { id: "soustraction", libelle: "Soustractions" },
  { id: "melange", libelle: "Additions et soustractions" },
  { id: "multiplication", libelle: "Table de multiplication" },
];

export const PLAFONDS = [10, 20, 100];

export interface ReglagesColoriage {
  matiere: Matiere;
  /** Les sons ou graphèmes donnés aux couleurs, en mode « lettres ». */
  sons: string[];
  motif: string;
  operation: Operation;
  /** Pour les additions et soustractions : au-delà de quoi on ne va pas. */
  plafond: number;
  /** Pour la multiplication : la table travaillée. */
  table: number;
  titre: string;
}

export const REGLAGES_PAR_DEFAUT: ReglagesColoriage = {
  matiere: "calcul", sons: ["ch", "ou", "oi"],
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
  /**
   * Ce que dit la légende : un résultat en mode calcul, un graphème en mode
   * lettres. `resultat` reste renseigné pour le calcul, `graphème` pour les
   * lettres — jamais les deux.
   */
  legende: { couleur: CouleurColoriage; resultat?: number; grapheme?: string }[];
  lignes: CaseColoriage[][];
}

/**
 * Les mots donnés à chaque son, sans ambiguïté possible.
 *
 * Un mot qui porterait deux des graphèmes coloriés serait de deux couleurs à
 * la fois : « chou » ne peut pas servir quand on oppose [ʃ] et [u]. On les
 * écarte, et l'on préfère se retrouver à court de mots plutôt que de poser à
 * l'élève une question sans réponse.
 */
export function motsSansAmbiguite(son: Son, autres: Son[]): string[] {
  return son.mots.filter((m) => !autres.some((a) => a.id !== son.id && contientLeSon(m, a)));
}

/** Les sons proposés au coloriage : ceux dont le corpus tient debout. */
export const SONS_COLORIAGE = SONS;

/** La feuille entière, reproductible à graine égale. */
export function fabriquerColoriage(reglages: ReglagesColoriage, graine: number): Coloriage {
  const motif = MOTIFS.find((m) => m.id === reglages.motif) ?? MOTIFS[0];
  const r = hasard(graine);
  const couleurs = couleursDuMotif(motif);
  if (reglages.matiere === "lettres") return coloriageDesLettres(motif, couleurs, reglages, r);
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

/**
 * Le coloriage des lettres : un mot par case, le graphème donne la couleur.
 *
 * Chaque couleur reçoit un son, et chaque case un mot qui le porte — et lui
 * seul. Les mots tournent : une couleur qui n'aurait que trois mots les
 * reprend, plutôt que de laisser des cases vides.
 */
function coloriageDesLettres(
  motif: Motif, couleurs: CouleurColoriage[], reglages: ReglagesColoriage, r: () => number,
): Coloriage {
  const choisis = reglages.sons.map((id) => sonDe(id)).filter((s): s is Son => !!s);
  const pris = couleurs.map((_, i) => choisis[i] ?? choisis[i % Math.max(1, choisis.length)]);
  const viviers = pris.map((son) => (son ? melanger(r, motsSansAmbiguite(son, pris)) : []));
  const compteurs = pris.map(() => 0);
  const legende = couleurs.map((couleur, i) => ({
    couleur, grapheme: pris[i] ? pris[i].graphemes[0] : "",
  }));
  const lignes = motif.grille.map((ligne) => [...ligne].map((c) => {
    const place = couleurs.findIndex((x) => x.id === c);
    if (place < 0) return { calcul: "", couleur: "" };
    const vivier = viviers[place];
    if (!vivier.length) return { calcul: "?", couleur: c };
    const mot = vivier[compteurs[place] % vivier.length];
    compteurs[place] += 1;
    return { calcul: mot, couleur: c };
  }));
  return { motif, legende, lignes };
}

/** Mélange reproductible. */
function melanger<T>(r: () => number, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Ce que la consigne dit à l'élève, selon ce qu'on lui demande. */
export function consigne(reglages: ReglagesColoriage): string {
  if (reglages.matiere === "lettres") {
    return "Lis chaque mot, puis colorie la case selon ce que tu y entends. "
      + "Une case sans mot reste blanche.";
  }
  const quoi = reglages.operation === "multiplication"
    ? `Calcule, puis colorie selon la table de ${reglages.table}.`
    : "Calcule chaque case, puis colorie-la selon son résultat.";
  return `${quoi} Une case sans calcul reste blanche.`;
}
