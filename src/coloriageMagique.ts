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
import { escapeHtml } from "./print";
import { contientLeSon, SONS, sonDe, type Son } from "./lectureSons";

// ── Les dessins ───────────────────────────────────────────────────────────
//
// Des grilles carrées, de huit à douze cases de côté : un chiffre par couleur,
// un point pour le blanc. Huit cases font une séance ; dix en font une
// longue ; au-delà, on découpe en deux fois. On peut aussi dessiner le sien,
// ou le tirer d'une photo (voir plus bas).

/** Les familles de la galerie : on y cherche un animal, puis une fête, puis un objet. */
export type FamilleMotif = "animaux" | "nature" | "objets";
export const FAMILLES_MOTIFS: { id: FamilleMotif; nom: string }[] = [
  { id: "animaux", nom: "Les animaux" }, { id: "nature", nom: "La nature et les fêtes" }, { id: "objets", nom: "Les objets" },
];

export interface Motif {
  id: string;
  nom: string;
  /** Une ligne par rangée, un caractère par case : « . » ou « 1 »…« 6 ». */
  grille: string[];
  /** Où le ranger dans la galerie ; un dessin de l'enseignant n'en a pas. */
  famille?: FamilleMotif;
  /** Vrai pour un dessin de l'enseignant, gardé sur cet ordinateur. */
  perso?: boolean;
  /** Le crédit de l'image dont il est tiré — un pictogramme ARASAAC : la licence le demande sur la feuille. */
  credit?: string;
}

export const MOTIFS: Motif[] = [
  { id: "coeur", nom: "Un cœur", famille: "nature", grille: [
    ".11..11.",
    "11111111",
    "11111111",
    "11111111",
    ".111111.",
    "..1111..",
    "...11...",
    "........",
  ] },
  { id: "maison", nom: "Une maison", famille: "objets", grille: [
    "...11...",
    "..1111..",
    ".111111.",
    "11111111",
    ".222222.",
    ".222222.",
    ".223322.",
    ".223322.",
  ] },
  { id: "sapin", nom: "Un sapin", famille: "nature", grille: [
    "...33...",
    "...11...",
    "..1111..",
    ".111111.",
    "..1111..",
    ".111111.",
    "11111111",
    "...22...",
  ] },
  { id: "poisson", nom: "Un poisson", famille: "animaux", grille: [
    "........",
    "..1111..",
    ".1111112",
    "11131112",
    "11111112",
    ".1111112",
    "..1111..",
    "........",
  ] },
  { id: "etoile", nom: "Une étoile", famille: "nature", grille: [
    "...11...",
    "...11...",
    ".111111.",
    "11111111",
    ".111111.",
    "..1111..",
    "..1..1..",
    ".11..11.",
  ] },
  { id: "fleur", nom: "Une fleur", famille: "nature", grille: [
    "..1111..",
    ".111111.",
    "11122111",
    "11122111",
    ".111111.",
    "..1331..",
    "...33...",
    "...33...",
  ] },
  { id: "pomme", nom: "Une pomme", famille: "nature", grille: [
    "....4...",
    "...4....",
    ".111111.",
    "11111111",
    "11111111",
    "11111111",
    ".111111.",
    "..11.11.",
  ] },
  { id: "champignon", nom: "Un champignon", famille: "nature", grille: [
    "..1111..",
    ".131131.",
    "11111111",
    "13111131",
    "11111111",
    "...55...",
    "...55...",
    "...55...",
  ] },
  { id: "ballon", nom: "Un ballon", famille: "objets", grille: [
    "..1111..",
    ".111111.",
    "11311311",
    "11111111",
    "11111111",
    "11311311",
    ".111111.",
    "..1111..",
  ] },
  { id: "soleil", nom: "Un soleil", famille: "nature", grille: [
    "3...3...3.",
    ".3..3..3..",
    "..33333...",
    "..355553..",
    "33355553.3",
    "..355553..",
    "..355553..",
    "..33333...",
    ".3..3..3..",
    "3...3...3.",
  ] },
  { id: "papillon", nom: "Un papillon", famille: "animaux", grille: [
    "6........6",
    ".6......6.",
    "11.6..6.11",
    "1331611331",
    "1111611111",
    "1111611111",
    "1331611331",
    "11.16.1.11",
    ".11.6..11.",
    "....6.....",
  ] },
  { id: "voiture", nom: "Une voiture", famille: "objets", grille: [
    "..........",
    "..........",
    "...2222...",
    "..233332..",
    "2222222222",
    "2222222222",
    "2222222222",
    ".66....66.",
    ".66....66.",
    "..........",
  ] },
  { id: "bateau", nom: "Un bateau", famille: "objets", grille: [
    "....6.....",
    "....61....",
    "....611...",
    "....6111..",
    "....61111.",
    "....611111",
    "....6.....",
    "2222222222",
    ".22222222.",
    "..222222..",
  ] },
  { id: "fusee", nom: "Une fusée", famille: "objets", grille: [
    "....11....",
    "...1111...",
    "...1221...",
    "...1221...",
    "...1111...",
    "..111111..",
    ".11111111.",
    "11.1111.11",
    "...3333...",
    "..33..33..",
  ] },
  { id: "chat", nom: "Un chat", famille: "animaux", grille: [
    ".5......5.",
    ".55....55.",
    ".555555555",
    ".55655655.",
    ".55555555.",
    ".55151155.",
    "..555555..",
    "...5555...",
    "..555555..",
    ".55555555.",
  ] },
  { id: "tortue", nom: "Une tortue", famille: "animaux", grille: [
    "..........",
    "...4444...",
    "..444444..",
    ".44344344.",
    "444444444.",
    "4443443444",
    ".4444444.4",
    "..444444.4",
    "..44..44..",
    "..44..44..",
  ] },
  { id: "arc", nom: "Un arc-en-ciel", famille: "nature", grille: [
    "...1111...",
    ".11555511.",
    "1155335511",
    "1533223351",
    "1532..2351",
    "153......3",
    "15........",
    "1.........",
    "..........",
    "..........",
  ] },
  { id: "bonhomme", nom: "Un bonhomme de neige", famille: "nature", grille: [
    "...6666...",
    "....66....",
    "...2222...",
    "..266662..",
    "..225522..",
    "..222222..",
    ".22222222.",
    ".22212222.",
    ".22222222.",
    "..222222..",
  ] },
  // ── Les animaux de la savane, du jardin, de la ferme et de la mer ──
  { id: "zebre", nom: "Un zèbre", famille: "animaux", grille: [
    "..........6.6.",
    "..........666.",
    ".........66666",
    ".........6.6.6",
    "..666666666666",
    ".6.6.6.6.6.66.",
    "66.6.6.6.6.6..",
    "6.6.6.6.6.6...",
    "..666666666...",
    "..6.6...6.6...",
    "..6.6...6.6...",
    "44444444444444",
  ] },
  { id: "lion", nom: "Un lion", famille: "animaux", grille: [
    "....55....",
    "..555555..",
    ".55533555.",
    ".55333355.",
    "5536336355",
    "5533333355",
    ".53366335.",
    ".55311355.",
    "..555555..",
    "....55....",
  ] },
  { id: "elephant", nom: "Un éléphant", famille: "animaux", grille: [
    "............",
    ".222.22.222.",
    ".2222222222.",
    "222262262222",
    "222222222222",
    ".22.2222222.",
    "..2..22..2..",
    ".....22.....",
    ".....22.....",
    ".....22.....",
    "......22....",
  ] },
  { id: "girafe", nom: "Une girafe", famille: "animaux", grille: [
    ".6.6........",
    ".333........",
    "33363.......",
    "..333.......",
    "..353.......",
    "..335.......",
    "..533.......",
    "..3353333...",
    "..335335336.",
    "..353333536.",
    "..3.3...3.3.",
    "..3.3...3.3.",
  ] },
  { id: "coccinelle", nom: "Une coccinelle", famille: "animaux", grille: [
    "..6.....6..",
    "...6...6...",
    "....666....",
    "..1116111..",
    ".166161661.",
    ".111161111.",
    ".116161611.",
    ".111161111.",
    "..1661661..",
    "...11611...",
  ] },
  { id: "abeille", nom: "Une abeille", famille: "animaux", grille: [
    ".6...........",
    "..6..22.22...",
    "..6.222.222..",
    ".66.222.222..",
    "6666.22.22...",
    "666333663336.",
    "6663336633366",
    "666333663336.",
    ".66..........",
  ] },
  { id: "grenouille", nom: "Une grenouille", famille: "animaux", grille: [
    "..44....44..",
    ".4664..4664.",
    ".4444444444.",
    "444444444444",
    "441111111144",
    ".4444444444.",
    "..44444444..",
    ".444....444.",
    "44........44",
    "4..........4",
  ] },
  { id: "poussin", nom: "Un poussin", famille: "animaux", grille: [
    "...333......",
    "..33333.....",
    "..33633.....",
    "..333355....",
    "..33333.....",
    ".3333333....",
    "333333333...",
    "3333333333..",
    ".33333333...",
    "..333333....",
    "...5..5.....",
    "..55.55.....",
  ] },
  { id: "manchot", nom: "Un manchot", famille: "animaux", grille: [
    "...6666...",
    "..666666..",
    "..6.66.6..",
    "..665566..",
    ".66....66.",
    "666....666",
    "66......66",
    "66......66",
    ".66....66.",
    "..666666..",
    "..55..55..",
  ] },
  { id: "renard", nom: "Un renard", famille: "animaux", grille: [
    "6........6",
    "56......65",
    "555....555",
    "5555555555",
    "5565555655",
    ".55555555.",
    "...5555...",
    "....66....",
  ] },
  { id: "escargot", nom: "Un escargot", famille: "animaux", grille: [
    "...555......",
    "..55555.....",
    ".556665..6.6",
    ".5655565.6.6",
    ".5656565.333",
    ".5655565.363",
    ".556665..333",
    "..55555..33.",
    "333333333333",
  ] },
  { id: "baleine", nom: "Une baleine", famille: "animaux", grille: [
    "..2.2.......",
    "...2........",
    "...2........",
    "..222222....",
    ".22222222..2",
    "2262222222.2",
    "222222222222",
    "2222222222.2",
    ".22222222...",
    "............",
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
  { id: "4", nom: "vert", hex: "#16a34a" },
  { id: "5", nom: "orange", hex: "#f97316" },
  { id: "6", nom: "noir", hex: "#1f2937" },
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
export type Matiere = "calcul" | "lettres" | "graphies";

// ── Les graphies : une même lettre sous plusieurs formes ──────────────────
//
// Reconnaître « a » qu'il soit A, a ou en cursive, c'est ce que demande la
// lecture des affichages, des livres et des cahiers. Chaque couleur reçoit
// une lettre ; chaque case la montre sous une forme tirée au sort parmi
// celles qu'on a cochées — et parfois dans une police différente.

export type Graphie = "majuscule" | "script" | "cursive" | "cursiveMajuscule";

export const GRAPHIES: { id: Graphie; libelle: string }[] = [
  { id: "majuscule", libelle: "Majuscule d'imprimerie (A)" },
  { id: "script", libelle: "Minuscule d'imprimerie (a)" },
  { id: "cursive", libelle: "Cursive minuscule" },
  { id: "cursiveMajuscule", libelle: "Cursive majuscule" },
];

/** Des polices que tout Mac a : on y reconnaît la lettre malgré le dessin. */
export const POLICES_VARIEES = ["Arial", "Georgia", "Verdana", "Times New Roman", "Courier New", "Trebuchet MS", "Chalkboard SE", "Comic Sans MS", "Marker Felt"];

/**
 * Des polices cursives d'école, si l'enseignant en a installé une — et à
 * défaut la cursive du système, qui n'a pas les formes de l'école mais
 * reste une cursive.
 */
export const POLICES_CURSIVES_CONNUES = ["Écriture A", "Ecriture A", "Écriture B", "Ecriture B", "Belle Allure GS", "Belle Allure CE", "Belle Allure CM", "Cursive standard", "Ecolier", "ScolaCursive", "Snell Roundhand"];

/** Ce qu'on écrit dans la case : la lettre sous la graphie voulue. */
export const lettreSousGraphie = (lettre: string, g: Graphie) =>
  (g === "majuscule" || g === "cursiveMajuscule" ? lettre.toUpperCase() : lettre.toLowerCase());

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
  /** Les lettres données aux couleurs, en mode « graphies ». */
  lettres: string[];
  /** Les formes sous lesquelles les lettres se montrent. */
  graphies: Graphie[];
  /** Mêler les polices d'imprimerie, pour reconnaître la lettre malgré le dessin. */
  polices: boolean;
  /** La police de la cursive, telle qu'elle est installée. */
  policeCursive: string;
  motif: string;
  operation: Operation;
  /** Pour les additions et soustractions : au-delà de quoi on ne va pas. */
  plafond: number;
  /** Pour la multiplication : la table travaillée. */
  table: number;
  titre: string;
}

export const REGLAGES_PAR_DEFAUT: ReglagesColoriage = {
  matiere: "calcul", sons: ["ch", "ou", "oi", "an", "on", "in"],
  lettres: ["a", "e", "i", "o", "u", "m"], graphies: ["majuscule", "script", "cursive"], polices: false, policeCursive: "Snell Roundhand",
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
  /** En mode « graphies » : la forme sous laquelle la lettre se montre. */
  graphie?: Graphie;
  /** En mode « graphies », polices mêlées : la police de cette case. */
  police?: string;
}

export interface Coloriage {
  motif: Motif;
  /**
   * Ce que dit la légende : un résultat en mode calcul, un graphème en mode
   * lettres. `resultat` reste renseigné pour le calcul, `graphème` pour les
   * lettres — jamais les deux.
   */
  legende: { couleur: CouleurColoriage; resultat?: number; grapheme?: string; lettre?: string }[];
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

/** La feuille entière, reproductible à graine égale. Les dessins de l'enseignant passent en plus des nôtres. */
export function fabriquerColoriage(reglages: ReglagesColoriage, graine: number, motifsPerso: Motif[] = []): Coloriage {
  const motif = [...MOTIFS, ...motifsPerso].find((m) => m.id === reglages.motif) ?? MOTIFS[0];
  const r = hasard(graine);
  const couleurs = couleursDuMotif(motif);
  if (reglages.matiere === "lettres") return coloriageDesLettres(motif, couleurs, reglages, r);
  if (reglages.matiere === "graphies") return coloriageDesGraphies(motif, couleurs, reglages, r);
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

/**
 * Le coloriage des graphies : une lettre par couleur, montrée sous une forme
 * tirée au sort — majuscule, script, cursive — et parfois dans une autre
 * police. Deux lettres qui se ressemblent (b et d, p et q) font un bon
 * exercice de discrimination : c'est l'enseignant qui les choisit.
 */
function coloriageDesGraphies(
  motif: Motif, couleurs: CouleurColoriage[], reglages: ReglagesColoriage, r: () => number,
): Coloriage {
  const formes = reglages.graphies.length ? reglages.graphies : ["script" as Graphie];
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const lettres = couleurs.map((_, i) => {
    const voulue = (reglages.lettres[i] ?? "").trim().toLowerCase().charAt(0);
    return voulue || alphabet[i % alphabet.length];
  });
  const legende = couleurs.map((couleur, i) => ({ couleur, lettre: lettres[i] }));
  const lignes = motif.grille.map((ligne) => [...ligne].map((c) => {
    const place = couleurs.findIndex((x) => x.id === c);
    if (place < 0) return { calcul: "", couleur: "" };
    const graphie = formes[Math.floor(r() * formes.length)];
    const police = reglages.polices && (graphie === "majuscule" || graphie === "script")
      ? POLICES_VARIEES[Math.floor(r() * POLICES_VARIEES.length)] : undefined;
    return { calcul: lettreSousGraphie(lettres[place], graphie), couleur: c, graphie, police };
  }));
  return { motif, legende, lignes };
}

// ── Un dessin à soi : dessiné, ou tiré d'une photo ────────────────────────
//
// Une photo d'un dessin d'élève, d'un pictogramme, d'un objet sur fond
// clair, ramenée à dix cases de côté : chaque case prend la couleur de
// feutre la plus proche de ce qu'elle contient, ou reste blanche si c'est
// clair. Le résultat se retouche case par case avant d'être gardé.

/** Les cases du grand côté d'un dessin tiré d'une image ; l'autre côté suit ses proportions. */
export const TAILLES_MOTIF = [8, 10, 12, 14];

export interface ImageBrute {
  largeur: number;
  hauteur: number;
  /** RGBA, quatre nombres par pixel, comme `ImageData.data`. */
  pixels: ArrayLike<number>;
}

/** La distance entre deux couleurs, pondérée comme l'œil le fait. */
const ecart = (a: [number, number, number], b: [number, number, number]) =>
  Math.sqrt(2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2);

const rgbDe = (hex: string): [number, number, number] =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

export interface OptionsDessin {
  /** Les cases du grand côté. */
  taille: number;
  /** Ce qui reste blanc : le clair, de 0 à 1. */
  seuilBlanc: number;
  /** Les feutres. Sans le noir, les traits noirs ne comptent pas : seules les couleurs font la grille. */
  palette: CouleurColoriage[];
  /** Retirer d'abord les marges claires autour du dessin. */
  recadrer: boolean;
  /**
   * Le feutre de l'intérieur clair du dessin — le gris ou le blanc qu'un
   * trait entoure, comme le corps d'un picto au trait ; rien pour qu'il reste
   * blanc.
   */
  remplissage?: string | null;
}

/**
 * La grille d'un dessin d'après une image : l'image entière, à ses
 * proportions, sans ses marges claires si l'on veut.
 *
 * Le fond, c'est le clair qui touche le bord de l'image ; le clair qu'un
 * trait entoure appartient au dessin, et prend le feutre de remplissage.
 * Chaque case prend ensuite la couleur qui la couvre le plus — un feutre, ou
 * le blanc : la couleur qui domine plutôt que la moyenne, pour des aplats
 * nets, sans couleurs salies.
 */
export function motifDepuisImage(image: ImageBrute, o: OptionsDessin): string[] {
  const { largeur, hauteur, pixels } = image;
  const total = largeur * hauteur;
  const couleurs = o.palette.map((c) => ({ id: c.id, rgb: rgbDe(c.hex) }));
  const avecNoir = o.palette.some((c) => c.id === "6");
  const remplissage = o.remplissage && o.palette.some((c) => c.id === o.remplissage) ? o.remplissage : null;
  // Chaque pixel lu une fois : la transparence compte comme du blanc.
  const clair = new Uint8Array(total), sombre = new Uint8Array(total);
  const teintes: [number, number, number][] = new Array(total);
  for (let i = 0; i < total; i++) {
    const alpha = (pixels[i * 4 + 3] ?? 255) / 255;
    const rgb = [0, 1, 2].map((k) => pixels[i * 4 + k] * alpha + 255 * (1 - alpha)) as [number, number, number];
    const clarte = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    const saturation = (Math.max(...rgb) - Math.min(...rgb)) / 255;
    // Le clair — et le gris clair d'une feuille photographiée, même un peu à l'ombre.
    clair[i] = (clarte >= o.seuilBlanc && saturation < 0.25) || (saturation < 0.12 && clarte >= 0.6) ? 1 : 0;
    sombre[i] = clarte < 0.32 && saturation < 0.25 ? 1 : 0;
    teintes[i] = rgb;
  }
  // Le fond : le clair relié au bord de l'image.
  const fond = new Uint8Array(total);
  const pile: number[] = [];
  const pousser = (i: number) => { if (clair[i] && !fond[i]) { fond[i] = 1; pile.push(i); } };
  for (let x = 0; x < largeur; x++) { pousser(x); pousser((hauteur - 1) * largeur + x); }
  for (let y = 0; y < hauteur; y++) { pousser(y * largeur); pousser(y * largeur + largeur - 1); }
  while (pile.length) {
    const i = pile.pop()!;
    const x = i % largeur, y = (i - x) / largeur;
    if (x > 0) pousser(i - 1);
    if (x < largeur - 1) pousser(i + 1);
    if (y > 0) pousser(i - largeur);
    if (y < hauteur - 1) pousser(i + largeur);
  }
  // Ce que chaque pixel devient : « . » le blanc, un feutre, ou rien — un trait noir qu'on ignore.
  const classes: (string | null)[] = new Array(total);
  for (let i = 0; i < total; i++) {
    if (fond[i]) classes[i] = ".";
    else if (clair[i]) classes[i] = remplissage ?? ".";
    else if (sombre[i] && !avecNoir) classes[i] = null;
    else {
      let meilleur = couleurs[0], distance = Infinity;
      for (const c of couleurs) {
        const d = ecart(teintes[i], c.rgb);
        if (d < distance) { distance = d; meilleur = c; }
      }
      classes[i] = meilleur?.id ?? ".";
    }
  }
  // Le cadre du dessin : tout, ou ce qui n'est pas le fond, avec un peu d'air.
  let [x0, y0, x1, y1] = [0, 0, largeur, hauteur];
  if (o.recadrer) {
    let [gauche, haut, droite, bas] = [largeur, hauteur, -1, -1];
    for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) {
      if (fond[y * largeur + x]) continue;
      gauche = Math.min(gauche, x); droite = Math.max(droite, x); haut = Math.min(haut, y); bas = Math.max(bas, y);
    }
    if (droite >= 0) {
      const air = Math.round(0.03 * Math.max(droite - gauche, bas - haut));
      [x0, y0, x1, y1] = [Math.max(0, gauche - air), Math.max(0, haut - air), Math.min(largeur, droite + 1 + air), Math.min(hauteur, bas + 1 + air)];
    }
  }
  const [l, h] = [x1 - x0, y1 - y0];
  const colonnes = l >= h ? o.taille : Math.max(4, Math.round((o.taille * l) / h));
  const lignes = l >= h ? Math.max(4, Math.round((o.taille * h) / l)) : o.taille;
  const grille: string[] = [];
  for (let gy = 0; gy < lignes; gy++) {
    let ligne = "";
    for (let gx = 0; gx < colonnes; gx++) {
      const xa = x0 + Math.floor((gx * l) / colonnes), xb = Math.max(xa + 1, x0 + Math.floor(((gx + 1) * l) / colonnes));
      const ya = y0 + Math.floor((gy * h) / lignes), yb = Math.max(ya + 1, y0 + Math.floor(((gy + 1) * h) / lignes));
      const voix = new Map<string, number>();
      for (let y = ya; y < Math.min(yb, hauteur); y++) for (let x = xa; x < Math.min(xb, largeur); x++) {
        const c = classes[y * largeur + x];
        if (c !== null) voix.set(c, (voix.get(c) ?? 0) + 1);
      }
      // La couleur la plus présente ; à égalité avec le blanc, la couleur.
      let gagnante = ".", plus = voix.get(".") ?? 0;
      for (const [c, n] of voix) if (c !== "." && n >= plus && (gagnante === "." || n > plus)) { gagnante = c; plus = n; }
      ligne += gagnante;
    }
    grille.push(ligne);
  }
  return grille;
}

/** Les colonnes et les rangées d'une grille. */
export const dimensionsDe = (grille: string[]) => ({ colonnes: grille[0]?.length ?? 0, lignes: grille.length });

/** La case passe à la couleur suivante de la palette, puis redevient blanche. */
export function basculerCase(grille: string[], x: number, y: number, palette: CouleurColoriage[]): string[] {
  const ordre = [".", ...palette.map((c) => c.id)];
  return grille.map((ligne, gy) => gy !== y ? ligne : [...ligne].map((c, gx) => {
    if (gx !== x) return c;
    const i = ordre.indexOf(c);
    return ordre[(i + 1) % ordre.length];
  }).join(""));
}

/** Une grille tient debout : de 4 à 16 cases de côté, ses rangées de même longueur, faite de points et de chiffres de couleur. */
export function grilleValide(grille: string[]): boolean {
  const { colonnes, lignes } = dimensionsDe(grille);
  if (lignes < 4 || lignes > 16 || colonnes < 4 || colonnes > 16) return false;
  return grille.every((l) => l.length === colonnes && /^[.1-6]+$/.test(l));
}

export function lireMotifsPerso(brut: string | null | undefined): Motif[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    if (!Array.isArray(v)) return [];
    return v.filter((m) => m && typeof m.id === "string" && Array.isArray(m.grille) && grilleValide(m.grille))
      .map((m) => ({
        id: m.id, nom: String(m.nom || "Mon dessin"), grille: m.grille.map(String), perso: true,
        ...(typeof m.credit === "string" && m.credit ? { credit: m.credit } : {}),
      }));
  } catch { return []; }
}

export const ecrireMotifsPerso = (liste: Motif[]) => JSON.stringify(liste.map(({ id, nom, grille }) => ({ id, nom, grille })));

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
  if (reglages.matiere === "graphies") {
    return "Regarde bien chaque lettre : en majuscule, en script ou en cursive, c'est la même lettre. "
      + "Colorie la case de la couleur de sa lettre. Une case vide reste blanche.";
  }
  if (reglages.matiere === "lettres") {
    return "Lis chaque mot, puis colorie la case selon ce que tu y entends. "
      + "Une case sans mot reste blanche.";
  }
  const quoi = {
    addition: "Calcule la somme écrite dans chaque case, puis colorie la case selon cette somme.",
    soustraction: "Calcule la différence écrite dans chaque case, puis colorie la case selon cette différence.",
    multiplication: "Calcule le produit écrit dans chaque case, puis colorie la case selon ce produit.",
    melange: "Effectue le calcul écrit dans chaque case, puis colorie la case selon son résultat.",
  }[reglages.operation];
  return `${quoi} Une case sans calcul reste blanche.`;
}

// ── La feuille ────────────────────────────────────────────────────────────
//
// La même pour l'impression, le PDF du bureau et les fiches d'autonomie
// (voir `fichesAutonomie`) : elle ne dépend que du coloriage et de ses
// réglages.

/** Ce qu'une case porte, avec sa graphie et sa police quand il y en a. */
export function styleDeLaCase(x: CaseColoriage, policeCursive: string): { fontFamily?: string; fontSize?: number; fontWeight?: number } {
  if (!x.graphie) return {};
  const cursive = x.graphie === "cursive" || x.graphie === "cursiveMajuscule";
  return {
    fontFamily: cursive ? `"${policeCursive}", "Snell Roundhand", cursive` : x.police ? `"${x.police}", Arial, sans-serif` : undefined,
    fontSize: cursive ? 26 : 22,
    fontWeight: x.graphie === "majuscule" ? 700 : 500,
  };
}

/**
 * Le style d'une case dans un attribut HTML. Les noms de police y passent
 * entre apostrophes : entre guillemets, ils fermaient l'attribut, et la
 * cursive ne s'imprimait pas.
 */
function styleEnLigne(st: ReturnType<typeof styleDeLaCase>, fond = ""): string {
  return [
    fond ? `background:${fond};color:#fff` : "",
    st.fontFamily ? `font-family:${st.fontFamily.replace(/"/g, "'")}` : "", st.fontSize ? `font-size:${st.fontSize}px` : "", st.fontWeight ? `font-weight:${st.fontWeight}` : "",
  ].filter(Boolean).join(";");
}

/**
 * La feuille — titre, corps et style. Le corrigé remplit les couleurs ;
 * `consigneAutre` remplace celle des réglages (les chiffres d'un coloriage de
 * maternelle ne sont pas des lettres).
 */
export function feuilleDuColoriage(c: Coloriage, r: ReglagesColoriage, avecCorrige: boolean, consigneAutre?: string): { titre: string; corps: string; style: string } {
  const colonnes = c.lignes[0]?.length ?? 1, rangees = c.lignes.length;
  // Des cases à la taille de la grille, carrée ou non, dans la largeur de la page.
  const cote = Math.max(36, Math.min(62, Math.floor(640 / colonnes), Math.floor(760 / rangees)));
  // Un calcul tient sur une ligne : plus la case est étroite, plus il s'écrit petit.
  const police = cote >= 56 ? 15 : cote >= 48 ? 14 : cote >= 42 ? 12 : 11;
  const cases = c.lignes.map((ligne) => `<tr>${ligne.map((x) => {
    const fond = avecCorrige && x.couleur ? couleurDe(x.couleur)?.hex : "";
    const style = styleEnLigne(styleDeLaCase(x, r.policeCursive), fond);
    return `<td${style ? ` style="${style}"` : ""}>${escapeHtml(x.calcul)}</td>`;
  }).join("")}</tr>`).join("");
  const formes = r.graphies.length ? r.graphies : ["script" as Graphie];
  const legende = c.legende.map(({ couleur, resultat, grapheme, lettre }) => {
    const texte = lettre !== undefined
      ? formes.map((g) => {
        const st = styleDeLaCase({ calcul: "", couleur: "", graphie: g }, r.policeCursive);
        return `<span style="${styleEnLigne({ ...st, fontFamily: st.fontFamily ?? "Arial" })};margin-right:8px">${escapeHtml(lettreSousGraphie(lettre, g))}</span>`;
      }).join("")
      : `<b>${escapeHtml(grapheme !== undefined ? grapheme : String(resultat))}</b>`;
    return `<span class="lg"><i style="background:${couleur.hex}"></i> ${texte} ${escapeHtml(couleur.nom)}</span>`;
  }).join("");
  return { titre: r.titre || "Coloriage magique", corps:
    `<h1>${escapeHtml(r.titre || "Coloriage magique")}</h1>
     <p class="nom">Prénom : ........................................ Date : ........................</p>
     <p class="consigne">${escapeHtml(consigneAutre ?? consigne(r))}</p>
     <div class="legende">${legende}</div>
     <table class="grille"><tbody>${cases}</tbody></table>${c.motif.credit
       ? `<p class="attribution">${escapeHtml(c.motif.credit)}</p>` : ""}`, style:
    `.consigne { font-size: 14px; margin-bottom: 10px; }
     .legende { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; font-size: 14px; align-items: center; }
     .lg i { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; vertical-align: -2px; }
     .grille { border-collapse: collapse; margin: 0 auto; }
     .grille td { border: 1.2px solid #222; width: ${cote}px; height: ${cote}px; text-align: center;
       font-size: ${police}px; white-space: nowrap; vertical-align: middle; }
     .nom { margin: 0 0 10px; font-size: 13px; color: #555; }
     .attribution { font-size: 8px; color: #888; margin-top: 10px; text-align: center; }` };
}
