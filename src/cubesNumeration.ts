// Les nombres en cubes : le matériel de numération à convertir.
//
// Le matériel multibase — cube unité, barre de dix, plaque de cent, gros cube
// de mille — donne à voir ce que vaut chaque chiffre selon sa place. Le
// programme du cycle 2 (2024) en fait une compétence de chaque année :
// « Connaitre et utiliser diverses représentations d'un nombre et passer de
// l'une à l'autre » — au CP jusqu'à 100, avec la dizaine et l'unité ; au CE1
// jusqu'à 1 000, la centaine dès la période 1 ; au CE2 jusqu'à 10 000.
//
// Le guide « Pour enseigner les nombres, le calcul et la résolution de
// problèmes au CP » (Éduscol, 2021) dit comment s'en servir, et la feuille le
// suit :
// - montrer régulièrement des collections partiellement groupées, avec plus
//   de dix d'une unité (5 dizaines et 13 unités) : s'en tenir à moins de dix
//   unités et moins de dix dizaines est la dérive qu'il signale ;
// - les unités de numération dans tous les sens : 5 dizaines 6 unités,
//   6 unités 5 dizaines, 4 dizaines 16 unités, 16 unités 4 dizaines ;
// - au début, des cubes d'une seule couleur, pour voir la dizaine comme dix
//   unités ; les cubes isolés rangés par cinq, qu'on lit sans les compter ;
// - au CP, grouper soi-même par dix une collection en vrac.
//
// Les dessins sont du SVG en millimètres : la même feuille à l'écran et sur
// le papier, sans dépendre d'images.

import { escapeHtml } from "./print";
import { hasard, melanger, piocher } from "./hasard";
import { feuille } from "./cartesImprimables";
import { nombreEnLettres } from "./nombresEnLettres";

// ── Les groupements et les écritures ───────────────────────────────────────

/** Un groupement du matériel : unité, dizaine, centaine, millier. */
export type Groupement = "u" | "d" | "c" | "m";
export const GROUPEMENTS: { id: Groupement; nom: string; valeur: number }[] = [
  { id: "m", nom: "milliers", valeur: 1000 },
  { id: "c", nom: "centaines", valeur: 100 },
  { id: "d", nom: "dizaines", valeur: 10 },
  { id: "u", nom: "unités", valeur: 1 },
];
/** Du plus grand au plus petit. */
const ORDRE: Groupement[] = ["m", "c", "d", "u"];
const VALEUR: Record<Groupement, number> = { m: 1000, c: 100, d: 10, u: 1 };

export type Parts = Record<Groupement, number>;

/** Les unités de numération en toutes lettres : « 1 dizaine », « 0 unité », « 16 unités ». */
const NOMS: Record<Groupement, [string, string]> = {
  m: ["millier", "milliers"], c: ["centaine", "centaines"], d: ["dizaine", "dizaines"], u: ["unité", "unités"],
};
/** Les pièces du matériel : « 1 barre », « 14 cubes ». */
const PIECES: Record<Groupement, [string, string]> = {
  m: ["gros cube", "gros cubes"], c: ["plaque", "plaques"], d: ["barre", "barres"], u: ["cube", "cubes"],
};
const accorde = (k: number, [un, plusieurs]: [string, string]) => `${k} ${k > 1 ? plusieurs : un}`;

export type EcritureNombre = "chiffres" | "unites" | "additive" | "lettres";
export const ECRITURES: { id: EcritureNombre; libelle: string }[] = [
  { id: "chiffres", libelle: "en chiffres" },
  { id: "unites", libelle: "en unités de numération" },
  { id: "additive", libelle: "en décomposition" },
  { id: "lettres", libelle: "en lettres" },
];

export type ExerciceCubes = "ecrire" | "grouper" | "dessiner" | "relier" | "facons";
export const EXERCICES: { id: ExerciceCubes; libelle: string; consigne: string; cpSeulement?: boolean }[] = [
  { id: "ecrire", libelle: "Lire les cubes, écrire le nombre", consigne: "Trouve le nombre que représente chaque dessin, et écris-le." },
  { id: "grouper", libelle: "Grouper par dix, puis écrire le nombre", consigne: "Entoure des paquets de dix cubes, puis écris le nombre.", cpSeulement: true },
  { id: "dessiner", libelle: "Lire le nombre, dessiner les cubes", consigne: "Dessine les cubes qui font ce nombre." },
  { id: "relier", libelle: "Relier les cubes au nombre", consigne: "Relie chaque dessin au nombre qu'il représente." },
  { id: "facons", libelle: "Faire un nombre de plusieurs façons", consigne: "" },
];

/** Les couleurs qu'on peut donner aux cubes ; « blanc » pour une impression sans couleur. */
export const PALETTE_CUBES: { nom: string; hex: string }[] = [
  { nom: "jaune", hex: "#ffe14d" }, { nom: "orange", hex: "#ff9f1a" }, { nom: "rouge", hex: "#e8402f" },
  { nom: "rose", hex: "#f28ab2" }, { nom: "violet", hex: "#9b6bdc" }, { nom: "bleu", hex: "#2454e6" },
  { nom: "bleu clair", hex: "#5ec8f2" }, { nom: "vert", hex: "#62d93a" }, { nom: "vert foncé", hex: "#1f9a48" },
  { nom: "marron", hex: "#a8704a" }, { nom: "gris", hex: "#b9bdc7" }, { nom: "blanc", hex: "#ffffff" },
];

export type CouleursCubes = Record<Groupement, string>;

// ── Les niveaux : la progression du programme ──────────────────────────────

export type IdNiveauCubes = "cp-19" | "cp-30" | "cp-59" | "cp-100" | "ce1" | "ce2";

export interface NiveauCubes {
  id: IdNiveauCubes;
  classe: "CP" | "CE1" | "CE2";
  libelle: string;
  min: number;
  max: number;
  /** La plus grande unité de numération : la dizaine au CP (100, c'est 10 dizaines), la centaine au CE1, le millier au CE2. */
  plusGrand: Groupement;
  /** Les unités de numération en toutes lettres au CP (3 dizaines 4 unités), en abrégé ensuite (6c 3d 5u). */
  enMots: boolean;
  /** Une seule couleur au début, comme les cubes emboîtables. */
  memeCouleur: boolean;
  /** Ce que disent le programme et le guide à ce moment de l'année, en une phrase. */
  repere: string;
}

export const NIVEAUX_CUBES: NiveauCubes[] = [
  { id: "cp-19", classe: "CP", libelle: "jusqu'à 19 : dix et quelques", min: 1, max: 19, plusGrand: "d", enMots: true, memeCouleur: true,
    repere: "Dès la période 1, des collections organisées en groupes de dix et en unités isolées : une dizaine, c'est dix unités." },
  { id: "cp-30", classe: "CP", libelle: "jusqu'à 30 (période 1)", min: 10, max: 30, plusGrand: "d", enMots: true, memeCouleur: true,
    repere: "Au début, des cubes d'une seule couleur, pour voir la dizaine comme dix cubes pareils." },
  { id: "cp-59", classe: "CP", libelle: "jusqu'à 59 (période 2)", min: 10, max: 59, plusGrand: "d", enMots: true, memeCouleur: false,
    repere: "Au plus tard en période 2, les nombres jusqu'à 59 ; des collections partiellement groupées, à organiser." },
  { id: "cp-100", classe: "CP", libelle: "jusqu'à 100 (période 3)", min: 10, max: 100, plusGrand: "d", enMots: true, memeCouleur: false,
    repere: "Au plus tard en période 3, jusqu'à 100 : 100, c'est 10 dizaines ; la centaine viendra au CE1." },
  { id: "ce1", classe: "CE1", libelle: "jusqu'à 1 000", min: 100, max: 1000, plusGrand: "c", enMots: false, memeCouleur: false,
    repere: "La centaine dès la période 1, jusqu'à 1 000 en période 2 ; régulièrement plus de dix d'une unité (17 unités, 8 dizaines, 2 centaines)." },
  { id: "ce2", classe: "CE2", libelle: "jusqu'à 10 000", min: 1000, max: 9999, plusGrand: "m", enMots: false, memeCouleur: false,
    repere: "Le millier, jusqu'à 10 000 en période 2 ; 4 635, c'est aussi 46 centaines 3 dizaines 5 unités." },
];

export const niveauCubes = (id: string): NiveauCubes => NIVEAUX_CUBES.find((n) => n.id === id) ?? NIVEAUX_CUBES[3];
export const CLASSES_CUBES = ["CP", "CE1", "CE2"] as const;

/** Les groupements en jeu à un niveau, du plus grand au plus petit. */
export const groupementsDuNiveau = (niv: NiveauCubes) => GROUPEMENTS.filter((g) => VALEUR[g.id] <= VALEUR[niv.plusGrand]);

// ── Ce qui se règle ────────────────────────────────────────────────────────

export const EXERCICES_MAX = 12;

export interface ReglagesCubes {
  titre: string;
  exercice: ExerciceCubes;
  niveau: IdNiveauCubes;
  /** Combien d'exercices sur la feuille. */
  nombre: number;
  /** Les écritures demandées (écrire) ou données (dessiner, relier). */
  ecritures: EcritureNombre[];
  couleurs: CouleursCubes;
  /** Toutes les pièces de la couleur des cubes, comme les cubes emboîtables du début. */
  memeCouleur: boolean;
  /** Plus de dix d'une unité : des collections à regrouper (2 barres et 14 cubes), des écritures comme 4 dizaines 16 unités. */
  aRegrouper: boolean;
  /** Les unités de numération montrées dans le désordre : 6 unités 5 dizaines. */
  desordre: boolean;
  /** Garder les nombres qui ont un zéro (30, 105) : les plus difficiles à lire. */
  zeros: boolean;
  legende: boolean;
  /** « Ce qu'on retient », en haut de la feuille. */
  retenir: boolean;
  /** Le numéro de chaque exercice dans son coin ; on peut s'en passer. */
  numeros: boolean;
}

export const REGLAGES_CUBES: ReglagesCubes = {
  titre: "Les nombres en cubes", exercice: "ecrire", niveau: "cp-100", nombre: 6, ecritures: ["chiffres"],
  // Les couleurs du matériel le plus répandu : le jaune des unités, le vert
  // des barres, le bleu des plaques, le rouge du gros cube.
  couleurs: { u: "#ffe14d", d: "#62d93a", c: "#2454e6", m: "#e8402f" },
  memeCouleur: false, aRegrouper: true, desordre: false, zeros: true, legende: true, retenir: false, numeros: true,
};

/** Les anciens réglages bornaient les nombres (de 10 à 99) : le niveau qui leur ressemble. */
export type AnciensReglagesCubes = { de?: number; a?: number };
const niveauDesBornes = (a: number): IdNiveauCubes =>
  a <= 19 ? "cp-19" : a <= 30 ? "cp-30" : a <= 59 ? "cp-59" : a <= 100 ? "cp-100" : a <= 1000 ? "ce1" : "ce2";

/**
 * Des réglages lisibles, quoi qu'on ait gardé : un ancien « de 1 à 19 »
 * devient le niveau « jusqu'à 19 » tant qu'on n'a pas choisi de niveau.
 */
export function reglagesCubesSurs(brut: Partial<ReglagesCubes> & AnciensReglagesCubes): ReglagesCubes {
  const r = { ...REGLAGES_CUBES, ...brut };
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  const niveau = typeof brut.a === "number" ? niveauDesBornes(brut.a)
    : NIVEAUX_CUBES.some((n) => n.id === r.niveau) ? r.niveau : REGLAGES_CUBES.niveau;
  const niv = niveauCubes(niveau);
  const exercice = EXERCICES.find((e) => e.id === r.exercice && (!e.cpSeulement || niv.classe === "CP"))?.id ?? "ecrire";
  return {
    titre: typeof r.titre === "string" ? r.titre : REGLAGES_CUBES.titre,
    exercice, niveau,
    nombre: Math.max(1, Math.min(EXERCICES_MAX, Math.floor(Number(r.nombre)) || REGLAGES_CUBES.nombre)),
    ecritures: Array.isArray(r.ecritures) ? ECRITURES.map((e) => e.id).filter((id) => r.ecritures.includes(id)) : [],
    couleurs: { ...REGLAGES_CUBES.couleurs, ...(r.couleurs ?? {}) },
    memeCouleur: oui(r.memeCouleur, false), aRegrouper: oui(r.aRegrouper, true), desordre: oui(r.desordre, false),
    zeros: oui(r.zeros, true), legende: oui(r.legende, true), retenir: oui(r.retenir, false), numeros: oui(r.numeros, true),
  };
}

/** Le numéro d'un exercice, dans son coin — ou rien. */
const numero = (r: ReglagesCubes, i: number) => (r.numeros !== false ? `<span class="cu-num">${i + 1}</span>` : "");

/** Les couleurs du dessin : celle des cubes partout, quand on l'a demandé. */
export const couleursDe = (r: Pick<ReglagesCubes, "couleurs" | "memeCouleur">): CouleursCubes =>
  r.memeCouleur ? { u: r.couleurs.u, d: r.couleurs.u, c: r.couleurs.u, m: r.couleurs.u } : r.couleurs;

// ── Le nombre et ses écritures ─────────────────────────────────────────────

/**
 * Combien de pièces de chaque sorte : 2 305 → 2 milliers, 3 centaines, 0
 * dizaine, 5 unités. Sans unité plus grande que `plusGrand` : au CP, 100,
 * c'est 10 dizaines.
 */
export function decomposer(n: number, plusGrand: Groupement = "m"): Parts {
  const p: Parts = { m: 0, c: 0, d: 0, u: 0 };
  let reste = Math.max(0, Math.floor(n));
  for (const g of ORDRE.slice(ORDRE.indexOf(plusGrand))) {
    p[g] = Math.floor(reste / VALEUR[g]);
    reste -= p[g] * VALEUR[g];
  }
  return p;
}

export const valeurDe = (p: Parts) => ORDRE.reduce((s, g) => s + p[g] * VALEUR[g], 0);

/** Défaire `k` pièces d'une sorte en dix de la suivante : une barre devient dix cubes. */
export function defaire(p: Parts, g: Groupement, k = 1): Parts {
  const plusPetit = ORDRE[ORDRE.indexOf(g) + 1];
  if (!plusPetit || k < 1 || p[g] < k) return p;
  return { ...p, [g]: p[g] - k, [plusPetit]: p[plusPetit] + 10 * k };
}

/** Les groupements qu'un nombre au plus égal à `a` peut contenir, du plus grand au plus petit. */
export const groupementsJusqua = (a: number) => GROUPEMENTS.filter((g) => g.valeur <= Math.max(1, a));

/** « 2 305 » : l'espace fine tous les trois chiffres, comme à l'école. */
export const enChiffres = (n: number) =>
  n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, "0")}` : String(n);

/** L'ordre habituel : du premier groupement présent jusqu'aux unités, zéros compris (3c 0d 5u). */
export function ordreHabituel(p: Parts): Groupement[] {
  const depuis = ORDRE.findIndex((g) => p[g] > 0);
  return depuis < 0 ? ["u"] : ORDRE.slice(depuis);
}

/** Les unités de numération dans le désordre, jamais dans l'ordre habituel, sans les zéros : 6 unités 5 dizaines. */
export function ordreMelange(p: Parts, alea: () => number): Groupement[] {
  const presents = ORDRE.filter((g) => p[g] > 0);
  if (presents.length < 2) return presents.length ? presents : ["u"];
  const ordre = melanger(alea, presents);
  return ordre.every((g, i) => g === presents[i]) ? [...ordre.slice(1), ordre[0]] : ordre;
}

/** « 4 dizaines 16 unités » au CP, « 2c 12d 5u » ensuite. */
export const ecrireUnites = (p: Parts, ordre: Groupement[], enMots: boolean) =>
  ordre.map((g) => (enMots ? accorde(p[g], NOMS[g]) : `${p[g]}${g}`)).join(" ");

/** « 2 barres et 14 cubes ». */
export function ecrirePieces(p: Parts): string {
  const morceaux = ORDRE.filter((g) => p[g] > 0).map((g) => accorde(p[g], PIECES[g]));
  if (!morceaux.length) return "0 cube";
  return morceaux.length > 1 ? `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}` : morceaux[0];
}

export interface OptionsEcriture {
  plusGrand?: Groupement;
  /** Les unités de numération en toutes lettres : 3 dizaines 4 unités. */
  enMots?: boolean;
}

/** Le nombre dans l'écriture demandée. */
export function ecrireNombre(n: number, ecriture: EcritureNombre, options: OptionsEcriture = {}): string {
  const parts = decomposer(n, options.plusGrand ?? "m");
  switch (ecriture) {
    case "chiffres":
      return enChiffres(n);
    case "unites":
      // Zéros compris : 305 → « 3c 0d 5u », la dizaine vide s'écrit, c'est elle qui piège.
      return ecrireUnites(parts, ordreHabituel(parts), !!options.enMots);
    case "additive": {
      const termes = ORDRE.filter((g) => parts[g] > 0).map((g) => enChiffres(parts[g] * VALEUR[g]));
      return termes.length ? termes.join(" + ") : "0";
    }
    case "lettres":
      return nombreEnLettres(n);
  }
}

// ── Le tirage ──────────────────────────────────────────────────────────────

export interface ExerciceCube {
  n: number;
  /** L'écriture montrée (dessiner, relier) ; sans objet quand l'élève écrit. */
  ecriture: EcritureNombre;
  /** Ce que montre le dessin : pas toujours au plus juste (2 barres et 14 cubes). */
  parts: Parts;
  /** Le dessin en vrac : des cubes semés, à grouper par dix. */
  enVrac: boolean;
  /** Les unités de numération montrées : au plus juste, ou à regrouper, dans l'ordre ou non. */
  unites: { parts: Parts; ordre: Groupement[] };
}

/** Les écritures retenues ; sans choix, les chiffres. */
export const ecrituresChoisies = (r: ReglagesCubes): EcritureNombre[] =>
  r.ecritures.length ? r.ecritures : ["chiffres"];

/**
 * Les nombres de la feuille.
 *
 * Tous différents tant que l'intervalle le permet ; sans zéro quand on l'a
 * demandé (si cela vide l'intervalle, on repasse sur tout). Un nombre sous
 * dix n'a pas de barre : un exercice sur trois au plus, et aucun quand il
 * faut grouper ou faire plusieurs façons.
 */
export function tirerNombres(r: ReglagesCubes, h: () => number): number[] {
  const niv = niveauCubes(r.niveau);
  const combien = Math.max(1, Math.min(EXERCICES_MAX, Math.floor(r.nombre) || 1));
  const tous = Array.from({ length: niv.max - niv.min + 1 }, (_, i) => niv.min + i);
  const filtres = r.zeros ? tous : tous.filter((n) => !String(n).includes("0"));
  const vivier = filtres.length ? filtres : tous;
  const grands = vivier.filter((n) => n >= 10);
  const petits = r.exercice === "grouper" || r.exercice === "facons" ? [] : vivier.filter((n) => n < 10);
  const tirer = (liste: number[], k: number) =>
    liste.length >= k ? piocher(h, liste, k) : Array.from({ length: k }, () => liste[Math.floor(h() * liste.length)]);
  if (!grands.length) return tirer(petits.length ? petits : vivier, combien);
  const k = Math.min(petits.length, Math.floor(combien / 3));
  return melanger(h, [...tirer(petits, k), ...tirer(grands, combien - k)]);
}

/**
 * Une collection à regrouper, pour un dessin : une barre en dix cubes, ou
 * une plaque en dix barres — jamais un gros cube en plaques, trop grand à
 * dessiner. Rien si le nombre n'a rien à défaire (7).
 */
export function aRegrouperPourDessin(n: number, niv: NiveauCubes, alea: () => number): Parts | null {
  const p = decomposer(n, niv.plusGrand);
  const possibles = (["d", "c"] as Groupement[]).filter((g) => p[g] > 0 && VALEUR[g] <= VALEUR[niv.plusGrand]);
  return possibles.length ? defaire(p, possibles[Math.floor(alea() * possibles.length)], 1) : null;
}

/** Une écriture à regrouper : 4 dizaines 16 unités au CP ; au CE1 et au CE2, une à trois pièces défaites (2c 27d 14u). */
export function aRegrouperPourEcriture(n: number, niv: NiveauCubes, alea: () => number): Parts | null {
  const p = decomposer(n, niv.plusGrand);
  const possibles = ORDRE.filter((g) => g !== "u" && p[g] > 0 && VALEUR[g] <= VALEUR[niv.plusGrand]);
  if (!possibles.length) return null;
  const g = possibles[Math.floor(alea() * possibles.length)];
  const k = niv.classe === "CP" ? 1 : Math.min(p[g], 1 + Math.floor(alea() * (g === "m" ? 3 : 2)));
  return defaire(p, g, k);
}

/** La part des exercices qui montrent une collection ou une écriture à regrouper, quand on l'a demandé. */
export const PART_A_REGROUPER = 1 / 3;

/** La feuille tirée : ses nombres, l'écriture montrée pour chacun, ce que montre son dessin. */
export function exercicesCubes(r: ReglagesCubes, graine: number, partARegrouper = PART_A_REGROUPER): ExerciceCube[] {
  const niv = niveauCubes(r.niveau);
  const h = hasard(graine);
  const ecritures = ecrituresChoisies(r);
  const nombres = tirerNombres(r, h);
  const indices = nombres.map((_, i) => i);
  const regroupes = new Set(r.aRegrouper ? piocher(h, indices, Math.max(1, Math.round(nombres.length * partARegrouper))) : []);
  return nombres.map((n, i) => {
    const juste = decomposer(n, niv.plusGrand);
    const ecriture = ecritures[Math.floor(h() * ecritures.length)];
    let parts = juste;
    let enVrac = false;
    if (r.exercice === "grouper") {
      // Tout en vrac ; ou, à regrouper, quelques barres déjà faites et plus de dix cubes semés.
      const faites = regroupes.has(i) && juste.d >= 2 ? 1 + Math.floor(h() * (juste.d - 1)) : 0;
      parts = { m: 0, c: 0, d: faites, u: n - 10 * faites };
      enVrac = true;
    } else if (regroupes.has(i) && (r.exercice === "ecrire" || r.exercice === "relier")) {
      parts = aRegrouperPourDessin(n, niv, h) ?? juste;
    }
    let unites = { parts: juste, ordre: ordreHabituel(juste) };
    if (r.exercice === "dessiner" || r.exercice === "relier") {
      const regroupee = regroupes.has(i) || (r.aRegrouper && h() < partARegrouper) ? aRegrouperPourEcriture(n, niv, h) : null;
      if (regroupee) unites = { parts: regroupee, ordre: ordreHabituel(regroupee) };
      if (r.desordre && h() < 0.6) unites = { ...unites, ordre: ordreMelange(unites.parts, h) };
    }
    return { n, ecriture, parts, enVrac, unites };
  });
}

/** L'écriture montrée d'un exercice, au niveau de la feuille. */
export function ecritureMontree(e: ExerciceCube, niv: NiveauCubes): string {
  return e.ecriture === "unites" ? ecrireUnites(e.unites.parts, e.unites.ordre, niv.enMots)
    : ecrireNombre(e.n, e.ecriture, { plusGrand: niv.plusGrand, enMots: niv.enMots });
}

/** Des façons de faire un nombre : au plus juste, puis une barre défaite en cubes, une plaque en barres, deux barres en cubes… */
export function facons(n: number, niv: NiveauCubes, combien: number): Parts[] {
  const juste = decomposer(n, niv.plusGrand);
  const sortes = ORDRE.filter((g) => g !== "u" && VALEUR[g] <= VALEUR[niv.plusGrand]).reverse();
  const candidats: Parts[] = [juste];
  for (const k of [1, 2]) for (const g of sortes) candidats.push(defaire(juste, g, k));
  for (const g of sortes) candidats.push(defaire(juste, g, juste[g]));
  const vus = new Set<string>();
  return candidats.filter((p) => {
    const cle = ORDRE.map((g) => p[g]).join(",");
    if (vus.has(cle) || valeurDe(p) !== n) return false;
    vus.add(cle);
    return true;
  }).slice(0, combien);
}

// ── Les dessins ────────────────────────────────────────────────────────────

/** La taille du petit cube, en millimètres : plus les nombres sont grands, plus il rapetisse. */
export function taille(a: number): number {
  return a <= 100 ? 2.4 : a <= 1000 ? 1.4 : 1.3;
}

/** Un tiers de blanc ou de noir mêlé à la couleur, pour les faces du gros cube. */
export function teinte(hex: string, vers: "clair" | "sombre"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const canaux = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const cible = vers === "clair" ? 255 : 0;
  return "#" + canaux.map((c) => Math.round(c + (cible - c) * 0.3).toString(16).padStart(2, "0")).join("");
}

const BORD = "#222";
const estBlanc = (hex: string) => hex.trim().toLowerCase() === "#ffffff";
/** Le quadrillage : blanc sur la couleur, gris sur du blanc. */
const trait = (hex: string) => (estBlanc(hex) ? "#8a8f9c" : "rgba(255,255,255,.85)");

const f = (x: number) => Number(x.toFixed(2));
const ligne = (x1: number, y1: number, x2: number, y2: number, couleur: string, epaisseur: number) =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${couleur}" stroke-width="${epaisseur}"/>`;
const rect = (x: number, y: number, l: number, h: number, fond: string) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(l)}" height="${f(h)}" fill="${fond}" stroke="${BORD}" stroke-width="0.25" stroke-linejoin="round"/>`;

/** Un quadrillage de `n` lignes dans un rectangle, dans les deux sens. */
function quadrillage(x: number, y: number, l: number, h: number, pas: number, couleur: string): string {
  const s: string[] = [];
  for (let k = 1; k * pas < l - 0.01; k++) s.push(ligne(x + k * pas, y, x + k * pas, y + h, couleur, 0.2));
  for (let k = 1; k * pas < h - 0.01; k++) s.push(ligne(x, y + k * pas, x + l, y + k * pas, couleur, 0.2));
  return s.join("");
}

/** Le gros cube de mille : trois faces quadrillées, la profondeur à 45° sur la moitié d'un côté. */
function grosCube(x: number, y: number, u: number, hex: string): string {
  const c = 10 * u, p = 5 * u, q = trait(hex);
  const dessus = `<polygon points="${f(x)},${f(y + p)} ${f(x + c)},${f(y + p)} ${f(x + c + p)},${f(y)} ${f(x + p)},${f(y)}" fill="${teinte(hex, "clair")}" stroke="${BORD}" stroke-width="0.25" stroke-linejoin="round"/>`;
  const cote = `<polygon points="${f(x + c)},${f(y + p)} ${f(x + c + p)},${f(y)} ${f(x + c + p)},${f(y + c)} ${f(x + c)},${f(y + p + c)}" fill="${teinte(hex, "sombre")}" stroke="${BORD}" stroke-width="0.25" stroke-linejoin="round"/>`;
  const lignes: string[] = [];
  for (let k = 1; k < 10; k++) {
    // Dessus : les lignes qui fuient, puis celles qui suivent le bord.
    lignes.push(ligne(x + k * u, y + p, x + p + k * u, y, q, 0.2));
    lignes.push(ligne(x + k * u * 0.5, y + p - k * u * 0.5, x + c + k * u * 0.5, y + p - k * u * 0.5, q, 0.2));
    // Côté droit : idem.
    lignes.push(ligne(x + c + k * u * 0.5, y + p - k * u * 0.5, x + c + k * u * 0.5, y + p + c - k * u * 0.5, q, 0.2));
    lignes.push(ligne(x + c, y + p + k * u, x + c + p, y + k * u, q, 0.2));
  }
  return dessus + cote + lignes.join("") + rect(x, y + p, c, c, hex) + quadrillage(x, y + p, c, c, u, q);
}

/** Une pièce du matériel, son coin haut-gauche en (x, y). */
export function piece(g: Groupement, x: number, y: number, u: number, hex: string): string {
  switch (g) {
    case "u": return rect(x, y, u, u, hex);
    case "d": return rect(x, y, u, 10 * u, hex) + quadrillage(x, y, u, 10 * u, u, trait(hex));
    case "c": return rect(x, y, 10 * u, 10 * u, hex) + quadrillage(x, y, 10 * u, 10 * u, u, trait(hex));
    case "m": return grosCube(x, y, u, hex);
  }
}

/** L'encombrement d'une pièce, en unités. */
const DIMENSIONS: Record<Groupement, [number, number]> = { u: [1, 1], d: [1, 10], c: [10, 10], m: [15, 15] };

/**
 * Combien de pièces par rangée : les plaques et les gros cubes se rangent en
 * carré, les barres côte à côte par dix au plus — dix barres font une
 * plaque —, les cubes par cinq : on lit 8 comme 5 et 3 sans compter, et deux
 * rangées pleines font une dizaine.
 */
function colonnes(g: Groupement, combien: number): number {
  if (g === "d") return Math.min(10, combien);
  if (g === "u") return Math.min(5, combien);
  return combien <= 1 ? 1 : combien <= 4 ? 2 : 3;
}

export interface Dessin { svg: string; largeur: number; hauteur: number }

/**
 * Le nombre en cubes : ses groupements côte à côte, du plus grand au plus
 * petit, posés sur une même ligne de base comme sur la table.
 */
export function dessinerCubes(n: number, u: number, couleurs: CouleursCubes, plusGrand: Groupement = "m"): Dessin {
  return dessinerGroupes(decomposer(n, plusGrand), u, couleurs, `${n} en cubes`);
}

/** Les pièces d'un groupe, rangées : leurs positions et l'encombrement du groupe. */
function rangerGroupe(g: Groupement, combien: number, u: number) {
  const [pl, ph] = DIMENSIONS[g];
  const ecart = g === "u" || g === "d" ? 0.4 * u : 0.6 * u;
  const cols = colonnes(g, combien);
  const positions: [number, number][] = [];
  for (let i = 0; i < combien; i++) positions.push([(i % cols) * (pl * u + ecart), Math.floor(i / cols) * (ph * u + ecart)]);
  const rangees = Math.ceil(combien / cols);
  return { positions, largeur: cols * pl * u + (cols - 1) * ecart, hauteur: rangees * ph * u + (rangees - 1) * ecart };
}

function svgDe(corps: string, largeur: number, hauteur: number, titre: string): Dessin {
  const marge = 0.3; // le trait du bord ne doit pas être rogné
  const L = f(largeur + 2 * marge), H = f(hauteur + 2 * marge);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="${-marge} ${-marge} ${L} ${H}" role="img" aria-label="${escapeHtml(titre)}">${corps}</svg>`,
    largeur: L, hauteur: H,
  };
}

/**
 * Des groupements donnés, pas forcément au plus juste : 5 plaques, 13 barres
 * et 5 cubes font 635, comme dans les exemples du programme de CE1.
 */
export function dessinerGroupes(parts: Record<Groupement, number>, u: number, couleurs: CouleursCubes, titre: string): Dessin {
  const ecartGroupes = 2.5 * u;
  const groupes = ORDRE.filter((g) => parts[g] > 0).map((g) => ({ g, ...rangerGroupe(g, parts[g], u) }));
  const hauteur = Math.max(u, ...groupes.map((x) => x.hauteur));
  const largeur = Math.max(u, groupes.reduce((s, x) => s + x.largeur, 0) + Math.max(0, groupes.length - 1) * ecartGroupes);
  let x = 0;
  const corps = groupes.map((gr) => {
    const y0 = hauteur - gr.hauteur;
    const pieces = gr.positions.map(([dx, dy]) => piece(gr.g, x + dx, y0 + dy, u, couleurs[gr.g])).join("");
    x += gr.largeur + ecartGroupes;
    return pieces;
  }).join("");
  return svgDe(corps, largeur, hauteur, titre);
}

/**
 * Une collection à grouper : les barres déjà faites à gauche, puis les cubes
 * semés au hasard sans se toucher, dans un champ assez large pour qu'on y
 * entoure des paquets de dix.
 */
export function dessinerEnVrac(parts: Parts, u: number, couleurs: CouleursCubes, graine: number, titre: string): Dessin {
  const alea = hasard(graine);
  const pas = 1.7 * u;
  const cellules = Math.ceil(parts.u * 1.5);
  const cols = Math.max(4, Math.ceil(Math.sqrt(cellules * 1.6)));
  const rangees = Math.max(1, Math.ceil(cellules / cols));
  const cases = melanger(alea, Array.from({ length: cols * rangees }, (_, i) => i)).slice(0, parts.u);
  const jeu = pas - 1.2 * u;
  const barres = parts.d > 0 ? rangerGroupe("d", parts.d, u) : null;
  const decalage = barres ? barres.largeur + 3 * u : 0;
  const champ = { largeur: cols * pas, hauteur: rangees * pas };
  const hauteur = Math.max(champ.hauteur, barres?.hauteur ?? 0);
  const corps = (barres ? barres.positions.map(([dx, dy]) => piece("d", dx, hauteur - barres.hauteur + dy, u, couleurs.d)).join("") : "")
    + cases.map((k) => piece("u", decalage + (k % cols) * pas + alea() * jeu,
      hauteur - champ.hauteur + Math.floor(k / cols) * pas + alea() * jeu, u, couleurs.u)).join("");
  return svgDe(corps, decalage + champ.largeur, hauteur, titre);
}

/** Le dessin d'un exercice. */
function dessinDe(e: ExerciceCube, u: number, couleurs: CouleursCubes, graine: number): Dessin {
  return e.enVrac ? dessinerEnVrac(e.parts, u, couleurs, graine, `${e.n} cubes à grouper`) : dessinerGroupes(e.parts, u, couleurs, `${e.n} en cubes`);
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La consigne de la feuille, d'après l'exercice et le niveau. */
export function consigneDe(r: ReglagesCubes): string {
  if (r.exercice !== "facons") return EXERCICES.find((e) => e.id === r.exercice)?.consigne ?? "";
  const sortes = groupementsDuNiveau(niveauCubes(r.niveau)).map((g) => PIECES[g.id][1]);
  return `Fais chaque nombre de plusieurs façons, avec des ${sortes.slice(0, -1).join(", des ")} et des ${sortes[sortes.length - 1]} : écris combien il en faut.`;
}

/** Les cases à remplir pour une écriture : le nombre, les unités de numération, la somme, la ligne. */
function reponse(ecriture: EcritureNombre, niv: NiveauCubes): string {
  const groupes = groupementsDuNiveau(niv);
  switch (ecriture) {
    case "chiffres":
      return `<div class="cu-rep"><span class="cu-lib">En chiffres :</span><span class="cu-case cu-large"></span></div>`;
    case "unites":
      return `<div class="cu-rep"><span class="cu-lib">En unités :</span>${groupes.map((g) => `<span class="cu-case"></span><span class="cu-unite">${niv.enMots ? NOMS[g.id][1] : g.id}</span>`).join("")}</div>`;
    case "additive":
      return `<div class="cu-rep"><span class="cu-lib">Décomposition :</span>${groupes.map((_, i) => `${i ? `<span class="cu-plus">+</span>` : ""}<span class="cu-case cu-moyen"></span>`).join("")}</div>`;
    case "lettres":
      return `<div class="cu-rep"><span class="cu-lib">En lettres :</span><span class="cu-trait"></span></div>`;
  }
}

/** Une pièce seule, en petit, pour la légende et les tableaux. */
function icone(g: Groupement, couleurs: CouleursCubes, u = 1.1): string {
  const [pl, ph] = DIMENSIONS[g];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(pl * u + 0.6)}mm" height="${f(ph * u + 0.6)}mm" viewBox="-0.3 -0.3 ${f(pl * u + 0.6)} ${f(ph * u + 0.6)}">${piece(g, 0, 0, u, couleurs[g])}</svg>`;
}

/** La légende : chaque pièce et ce qu'elle vaut, pour les groupements du niveau. */
function legende(niv: NiveauCubes, couleurs: CouleursCubes): string {
  const items = [...groupementsDuNiveau(niv)].reverse().map((g) => `<span class="cu-item">${icone(g.id, couleurs)}= ${enChiffres(g.valeur)}</span>`);
  return `<div class="cu-legende">${items.join("")}</div>`;
}

/**
 * L'exemple du programme, à chaque classe : trois barres et quatre cubes ;
 * six plaques, trois barres, cinq cubes ; 4 635. Au début du CP, un nombre
 * qu'on connaît déjà : 14, puis 24.
 */
const EXEMPLES: Record<NiveauCubes["classe"], number> = { CP: 34, CE1: 635, CE2: 4635 };
export const exempleDuNiveau = (niv: NiveauCubes) =>
  niv.classe !== "CP" ? EXEMPLES[niv.classe] : niv.max >= 34 ? 34 : niv.max >= 24 ? 24 : 14;

/** Ce qu'on retient, à la classe du niveau. */
export function phrasesARetenir(niv: NiveauCubes): string[] {
  const n = exempleDuNiveau(niv);
  const p = decomposer(n, niv.plusGrand);
  const juste = ecrireUnites(p, ordreHabituel(p), true);
  switch (niv.classe) {
    case "CP": return [
      "Dix cubes, c'est une barre : une dizaine. 1 dizaine = 10 unités.",
      `${n}, c'est ${juste} : ${ecrirePieces(p)}.`,
      "Le premier chiffre dit les dizaines, le second les unités : 23 et 32, ce n'est pas le même nombre.",
    ];
    case "CE1": return [
      "Dix barres, c'est une plaque : une centaine. 1 centaine = 10 dizaines = 100 unités.",
      `${n}, c'est ${juste} : ${ecrirePieces(p)}. C'est aussi 63 dizaines et 5 unités.`,
    ];
    case "CE2": return [
      "Dix plaques, c'est un gros cube : un millier. 1 millier = 10 centaines = 100 dizaines = 1 000 unités.",
      `${enChiffres(n)}, c'est ${juste}. C'est aussi 46 centaines, 3 dizaines et 5 unités.`,
    ];
  }
}

function aRetenir(niv: NiveauCubes, couleurs: CouleursCubes): string {
  const d = dessinerCubes(exempleDuNiveau(niv), niv.classe === "CE2" ? 0.9 : niv.classe === "CE1" ? 1.1 : 1.8, couleurs, niv.plusGrand);
  return `<div class="cu-retenir"><div><b>Ce qu'on retient</b>${phrasesARetenir(niv).map((t) => `<p>${escapeHtml(t)}</p>`).join("")}</div>`
    + `<div class="cu-cubes">${d.svg}</div></div>`;
}

const rangees = <T,>(liste: T[], parRangee: number): T[][] => {
  const sortie: T[][] = [];
  for (let i = 0; i < liste.length; i += parRangee) sortie.push(liste.slice(i, i + parRangee));
  return sortie;
};

const grille = (cellules: string[], parRangee: number, classe = "") =>
  `<table class="cu-grille ${classe}">${rangees(cellules, parRangee).map((r) =>
    `<tr>${r.map((c) => `<td>${c}</td>`).join("")}${r.length < parRangee ? `<td></td>`.repeat(parRangee - r.length) : ""}</tr>`).join("")}</table>`;

/** Écrire, ou grouper puis écrire : les cubes, puis les cases de chaque écriture demandée. */
function exercicesEcrire(exos: ExerciceCube[], r: ReglagesCubes, niv: NiveauCubes, u: number, graine: number): string {
  const ecritures = ecrituresChoisies(r);
  const couleurs = couleursDe(r);
  const cellules = exos.map((e, i) => {
    const d = dessinDe(e, u, couleurs, graine + i);
    return `<div class="cu-exo">${numero(r, i)}<div class="cu-cubes">${d.svg}</div>${ecritures.map((x) => reponse(x, niv)).join("")}</div>`;
  });
  // Deux colonnes, sauf avec les gros cubes de mille, trop larges.
  return grille(cellules, niv.plusGrand === "m" ? 1 : 2);
}

/** La hauteur d'un cadre à dessiner, au plus : l'élève dessine à main levée, plaques et barres en schéma, pas au millimètre. */
const CADRE_MAX: Record<NiveauCubes["classe"], number> = { CP: 34, CE1: 48, CE2: 56 };

/** Dessiner : le nombre écrit, et un cadre de la taille du plus grand dessin à faire, sans démesure. */
function exercicesDessiner(exos: ExerciceCube[], r: ReglagesCubes, niv: NiveauCubes, u: number): string {
  const dessins = [dessinerCubes(Math.min(niv.max, 999 * VALEUR[niv.plusGrand] / 100), u, r.couleurs, niv.plusGrand), ...exos.map((e) => dessinerGroupes(e.unites.parts, u, r.couleurs, ""))];
  const cadre = {
    largeur: Math.max(30, ...dessins.map((d) => d.largeur)),
    hauteur: Math.min(CADRE_MAX[niv.classe], Math.max(16, ...dessins.map((d) => d.hauteur + 4))),
  };
  const cellules = exos.map((e, i) =>
    `<div class="cu-exo">${numero(r, i)}<div class="cu-nombre${e.ecriture === "unites" || e.ecriture === "lettres" ? " cu-nombre-texte" : ""}">${escapeHtml(ecritureMontree(e, niv))}</div>`
    + `<div class="cu-cadre" style="height:${f(cadre.hauteur)}mm"></div></div>`);
  return grille(cellules, cadre.largeur > 85 ? 1 : 2);
}

/** Relier : les dessins à gauche dans l'ordre, les écritures à droite mélangées. */
function exercicesRelier(exos: ExerciceCube[], r: ReglagesCubes, niv: NiveauCubes, u: number, h: () => number): string {
  const ordre = exos.map((_, i) => i);
  let melange = melanger(h, ordre);
  // Une colonne de droite dans le même ordre que la gauche ne fait rien relier.
  if (exos.length > 1 && melange.every((v, i) => v === i)) melange = [...melange.slice(1), melange[0]];
  const couleurs = couleursDe(r);
  const lignes = exos.map((e, i) => {
    const d = dessinerGroupes(e.parts, u, couleurs, `${e.n} en cubes`);
    const droite = exos[melange[i]];
    return `<tr><td class="cu-r-cubes"><div class="cu-cubes">${d.svg}</div></td>`
      + `<td class="cu-r-point"><span class="cu-point"></span></td><td class="cu-r-point"><span class="cu-point"></span></td>`
      + `<td class="cu-r-nombre"><span class="cu-relie-nombre${droite.ecriture === "unites" || droite.ecriture === "lettres" ? " cu-relie-texte" : ""}">${escapeHtml(ecritureMontree(droite, niv))}</span></td></tr>`;
  });
  return `<table class="cu-grille cu-relier">${lignes.join("")}</table>`;
}

/** Combien de façons demander : trois au CP, quatre ensuite — le programme de CE1 en demande quatre. */
export const nombreDeFacons = (niv: NiveauCubes) => (niv.classe === "CP" ? 3 : 4);

/** Plusieurs façons : le nombre, puis un tableau à remplir, une colonne par sorte de pièce. */
function exercicesFacons(exos: ExerciceCube[], r: ReglagesCubes, niv: NiveauCubes): string {
  const couleurs = couleursDe(r);
  const sortes = groupementsDuNiveau(niv);
  const tailleIcone: Record<Groupement, number> = { u: 1.6, d: 0.8, c: 0.55, m: 0.45 };
  const tete = `<tr>${sortes.map((g) => `<th><span class="cu-icone">${icone(g.id, couleurs, tailleIcone[g.id])}</span>${PIECES[g.id][1]}</th>`).join("")}</tr>`;
  const corps = Array.from({ length: nombreDeFacons(niv) }, () => `<tr>${sortes.map(() => "<td></td>").join("")}</tr>`).join("");
  const cellules = exos.map((e, i) =>
    `<div class="cu-exo">${numero(r, i)}<div class="cu-nombre">${escapeHtml(enChiffres(e.n))}</div><table class="cu-facons"><thead>${tete}</thead><tbody>${corps}</tbody></table></div>`);
  return grille(cellules, sortes.length > 3 ? 1 : 2);
}

/** Le corrigé : chaque nombre sous ses écritures, et ce que montrait son dessin quand il était à regrouper. */
function corrige(exos: ExerciceCube[], r: ReglagesCubes, niv: NiveauCubes, titre: string): string {
  const options = { plusGrand: niv.plusGrand, enMots: niv.enMots };
  const lignes = exos.map((e) => {
    if (r.exercice === "facons") {
      return `<li><b>${escapeHtml(enChiffres(e.n))}</b> — par exemple : ${facons(e.n, niv, nombreDeFacons(niv) + 1).map((p) => escapeHtml(ecrirePieces(p))).join(" ; ")}</li>`;
    }
    const ecritures = ECRITURES.map((x) => escapeHtml(ecrireNombre(e.n, x.id, options))).join(" · ");
    const juste = decomposer(e.n, niv.plusGrand);
    const autre = (p: Parts) => ORDRE.some((g) => p[g] !== juste[g]);
    const dessin = r.exercice !== "dessiner" && autre(e.parts) ? ` — le dessin : ${escapeHtml(ecrirePieces(e.parts))}` : "";
    const montree = (r.exercice === "dessiner" || r.exercice === "relier") && e.ecriture === "unites"
      && (autre(e.unites.parts) || e.unites.ordre.join() !== ordreHabituel(juste).join())
      ? ` — « ${escapeHtml(ecritureMontree(e, niv))} »` : "";
    return `<li>${ecritures}${dessin}${montree}</li>`;
  });
  return `<div class="page cu-corrige corrige"><div class="titre">Corrigé${titre ? ` · ${escapeHtml(titre)}` : ""}</div><ol>${lignes.join("")}</ol></div>`;
}

export function htmlCubes(exos: ExerciceCube[], r: ReglagesCubes, graine = 1): string {
  const niv = niveauCubes(r.niveau);
  const u = taille(niv.max);
  const titre = r.titre.trim() || REGLAGES_CUBES.titre;
  const corps = r.exercice === "ecrire" || r.exercice === "grouper" ? exercicesEcrire(exos, r, niv, u, graine)
    : r.exercice === "dessiner" ? exercicesDessiner(exos, r, niv, u)
    : r.exercice === "facons" ? exercicesFacons(exos, r, niv)
    : exercicesRelier(exos, r, niv, u, hasard(graine + 1));
  const page = `<div class="page"><div class="titre">${escapeHtml(titre)}</div>`
    + `<div class="cu-nom">Prénom : ........................................ Date : ........................</div>`
    + `<div class="sous cu-consigne consigne">${escapeHtml(consigneDe(r))}</div>`
    + (r.retenir ? aRetenir(niv, couleursDe(r)) : "")
    + (r.legende ? legende(niv, couleursDe(r)) : "")
    + corps + `</div>`;
  return feuille(page + corrige(exos, r, niv, titre), "cu");
}

/**
 * L'affiche de la classe : les pièces et ce qu'elles valent, ce qu'on
 * retient, et l'exemple du programme sous ses écritures — dont une à
 * regrouper (2 dizaines 14 unités).
 */
export function htmlAfficheCubes(r: ReglagesCubes): string {
  const niv = niveauCubes(r.niveau);
  const couleurs = couleursDe(r);
  const n = exempleDuNiveau(niv);
  const juste = decomposer(n, niv.plusGrand);
  const regroupee = defaire(juste, "d", 1);
  const ecritures = [
    enChiffres(n), ecrireUnites(juste, ordreHabituel(juste), true), ecrireUnites(regroupee, ordreHabituel(regroupee), true),
    ecrireNombre(n, "additive", { plusGrand: niv.plusGrand }), nombreEnLettres(n),
  ];
  const dessin = dessinerCubes(n, niv.classe === "CE2" ? 1.6 : niv.classe === "CE1" ? 2.2 : 4.5, couleurs, niv.plusGrand);
  return feuille(`<div class="page cu-affiche"><div class="titre">Ce qu'on retient — les nombres en cubes</div>`
    + legende(niv, couleurs)
    + phrasesARetenir(niv).map((t) => `<p class="cu-affiche-phrase">${escapeHtml(t)}</p>`).join("")
    + `<div class="cu-affiche-dessin">${dessin.svg}</div>`
    + `<div class="cu-affiche-ecritures">${ecritures.map((t) => `<span>${escapeHtml(t)}</span>`).join("<b>=</b>")}</div></div>`, "cu");
}

export const STYLE_CUBES = `
  .feuille.cu .cu-nom { font-size: 13px; color: #444; margin: 0 0 2mm; }
  .feuille.cu .cu-consigne { font-size: 14px; color: #1c2233; font-weight: 600; }
  .feuille.cu .cu-legende { display: flex; gap: 7mm; align-items: flex-end; flex-wrap: wrap; font-size: 12px; margin: 0 0 4mm;
    padding: 2mm 3mm; border: 1px solid #cfd4e2; border-radius: 3mm; }
  .feuille.cu .cu-item { display: inline-flex; align-items: flex-end; gap: 1.5mm; }
  .feuille.cu .cu-item svg { display: block; }
  .feuille.cu .cu-retenir { display: flex; gap: 5mm; align-items: center; justify-content: space-between; margin: 0 0 4mm; padding: 2.5mm 3.5mm;
    border: 1.5px solid #8fb3ff; background: #f3f7ff; border-radius: 3mm; font-size: 12.5px; break-inside: avoid; page-break-inside: avoid; }
  .feuille.cu .cu-retenir p { margin: 1mm 0 0; }
  .feuille.cu .cu-retenir svg { display: block; max-width: 70mm; height: auto; }
  .feuille.cu table.cu-grille { border-collapse: separate; border-spacing: 0 4mm; width: 100%; margin: -2mm 0 0; table-layout: fixed; }
  .feuille.cu table.cu-grille td { border: 0; padding: 0 1.5mm; vertical-align: top; font-size: inherit; }
  .feuille.cu table.cu-grille tr { break-inside: avoid; page-break-inside: avoid; }
  .feuille.cu .cu-exo { position: relative; border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 3mm 2.5mm; min-height: 18mm;
    break-inside: avoid; page-break-inside: avoid; }
  /* Dans le cadre, pas à cheval dessus : ce qui dépasse d'un cadre poussé en
     haut d'une page s'imprimerait au bas de la précédente. */
  .feuille.cu .cu-num { position: absolute; top: 1.5mm; right: 2mm; background: #1c2233; color: #fff; border-radius: 100px;
    font-size: 11px; font-weight: 700; padding: 0 2mm; line-height: 5mm; }
  .feuille.cu .cu-cubes { margin: 1.5mm 0; }
  .feuille.cu .cu-cubes svg { display: block; max-width: 100%; height: auto; }
  .feuille.cu .cu-rep { display: flex; align-items: center; gap: 2mm; margin-top: 2.5mm; font-size: 13px; flex-wrap: wrap; }
  .feuille.cu .cu-lib { color: #444; }
  .feuille.cu .cu-case { display: inline-block; width: 9mm; height: 9mm; border: 1.5px solid #1c2233; border-radius: 1.5mm; background: #fff; }
  .feuille.cu .cu-case.cu-moyen { width: 14mm; }
  .feuille.cu .cu-case.cu-large { width: 30mm; }
  .feuille.cu .cu-unite { font-weight: 700; margin-right: 1.5mm; }
  .feuille.cu .cu-plus { font-weight: 700; }
  .feuille.cu .cu-trait { flex: 1; min-width: 30mm; border-bottom: 1.5px solid #1c2233; height: 8mm; }
  .feuille.cu .cu-nombre { font-size: 26px; font-weight: 800; text-align: center; margin: 2mm 0; }
  .feuille.cu .cu-nombre.cu-nombre-texte { font-size: 17px; font-weight: 700; }
  .feuille.cu .cu-cadre { border: 1.5px dashed #9aa0b4; border-radius: 3mm; }
  .feuille.cu table.cu-relier { border-spacing: 0 3mm; }
  .feuille.cu table.cu-relier td { vertical-align: middle; }
  .feuille.cu table.cu-relier .cu-r-cubes { width: 50%; }
  .feuille.cu table.cu-relier .cu-r-point { width: 12%; text-align: center; }
  .feuille.cu table.cu-relier .cu-r-nombre { width: 26%; text-align: left; }
  .feuille.cu .cu-point { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; }
  .feuille.cu .cu-relie-nombre { font-size: 22px; font-weight: 700; }
  .feuille.cu .cu-relie-nombre.cu-relie-texte { font-size: 15px; }
  .feuille.cu table.cu-facons { border-collapse: collapse; width: 100%; margin-top: 1.5mm; table-layout: fixed; }
  .feuille.cu table.cu-facons th { font-size: 11.5px; font-weight: 600; color: #444; border: 1px solid #9aa0b4; padding: 1mm; text-align: center; vertical-align: bottom; }
  .feuille.cu table.cu-facons .cu-icone { display: block; margin: 0 auto 0.5mm; width: fit-content; }
  .feuille.cu table.cu-facons .cu-icone svg { display: block; }
  .feuille.cu table.cu-facons td { border: 1px solid #9aa0b4; height: 9mm; }
  .feuille.cu .cu-corrige ol { font-size: 13px; line-height: 1.8; padding-left: 6mm; }
  .feuille.cu .cu-affiche .cu-legende { font-size: 15px; }
  .feuille.cu .cu-affiche-phrase { font-size: 19px; line-height: 1.45; margin: 3mm 0; }
  .feuille.cu .cu-affiche-dessin { margin: 6mm 0; }
  .feuille.cu .cu-affiche-dessin svg { display: block; max-width: 100%; height: auto; }
  .feuille.cu .cu-affiche-ecritures { display: flex; flex-wrap: wrap; gap: 3mm; align-items: center; font-size: 20px; }
  .feuille.cu .cu-affiche-ecritures span { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 1.5mm 3mm; }
`;
