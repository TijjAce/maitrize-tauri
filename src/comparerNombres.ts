// ── Comparer, encadrer, intercaler : la bataille, la file, le nombre caché ──
//
// Toute la progression des programmes, de la maternelle au CM2 :
//
// - Cycle 1 (programme de 2025) : comparer des quantités. Avant 4 ans,
//   globalement — des collections qui diffèrent au moins du simple au
//   double — ou un objet en face d'un autre, avec « plus que » et « moins
//   que » ; à partir de 4 ans, en dénombrant chacune, jusqu'à six ; à partir
//   de 5 ans, jusqu'à dix, « autant que », et des quantités données par leur
//   écriture chiffrée. Pas de signes.
// - Cycle 2 (programme de 2024) : « comparer, encadrer, intercaler des
//   nombres entiers en utilisant les symboles =, < et > », ordonner cinq
//   nombres — jusqu'à 59 puis 100 au CP, 1 000 au CE1, 10 000 au CE2, sous
//   des écritures variées (5d 1u, 3u 4d, 5d 17u ; 6 centaines et 3 dizaines
//   et 5 unités, ou 5 centaines et 13 dizaines et 5 unités…).
// - Cycle 3 (programme de 2024) : les entiers jusqu'à 999 999 au CM1 (quatre
//   chiffres en périodes 1 et 2), 999 999 999 au CM2 ; les décimaux jusqu'aux
//   centièmes au CM1, aux millièmes au CM2, sous forme de fractions
//   décimales comme d'écritures à virgule.
//
// Le guide « Pour enseigner les nombres, le calcul et la résolution de
// problèmes au CP » (Éduscol) fait comparer par la valeur des chiffres —
// « 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68
// il y a seulement 6 dizaines » — et valider au matériel ; il demande au jeu
// une règle simple, un dialogue (« Comment le sais-tu ? ») et une trace
// écrite. Un seul paquet sert trois jeux : la bataille (comparer), la file
// des nombres (ordonner, intercaler) et le nombre caché (encadrer). Chaque
// nombre y est deux fois, sous deux formes : c'est ce qui fait les égalités.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { feuille, pagesDeCartes } from "./cartesImprimables";
import { REGLAGES_CUBES, dessinerGroupes, piece, type Groupement } from "./cubesNumeration";
import { nombreEnLettres } from "./nombresEnLettres";
import { doigtsSvg, pointsSvg } from "./collections";
import { boiteDeDixSvg } from "./jeuxMaths";
import { fr } from "./nombres";

// ── Les formes d'un nombre ────────────────────────────────────────────────

export type FormeNombre =
  // Cycle 1 : des quantités
  | "enVrac" | "constellation" | "doigts" | "boite"
  // Les entiers
  | "chiffres" | "cubes" | "vrac" | "unites" | "desordre" | "plusDeDix" | "somme" | "lettres"
  // Les grands nombres
  | "classes"
  // Les décimaux
  | "virgule" | "fraction" | "fractions" | "unitesDec";

/** Ce qu'on représente : des quantités, des entiers en unités de numération, de grands entiers, des décimaux. */
export type FamilleNiveau = "collections" | "entiers" | "grands" | "decimaux";

export type IdNiveau =
  | "c1-avant4" | "c1-4ans" | "c1-5ans"
  | "cp-30" | "cp-59" | "cp-100" | "ce1" | "ce2"
  | "cm1-entiers" | "cm1-grands" | "cm1-decimaux" | "cm2-grands" | "cm2-decimaux";

export interface Niveau {
  id: IdNiveau;
  cycle: 1 | 2 | 3;
  /** La classe, pour les titres et les référentiels : « CP », « CE1 »… */
  classe: string;
  libelle: string;
  famille: FamilleNiveau;
  /** Les valeurs : de `min` à `max` ; pour les décimaux, en centièmes ou en millièmes (345 pour 3,45). */
  min: number;
  max: number;
  /** Des valeurs imposées : avant 4 ans, 1, 2, 4 et 8, qui diffèrent toujours au moins du simple au double. */
  valeurs?: number[];
  decimales: 0 | 2 | 3;
  formes: FormeNombre[];
  parDefaut: FormeNombre[];
}

const FORMES_CP: FormeNombre[] = ["chiffres", "cubes", "vrac", "unites", "desordre", "plusDeDix", "somme", "lettres"];
const FORMES_MILLIERS: FormeNombre[] = ["chiffres", "unites", "desordre", "plusDeDix", "somme", "lettres"];
const FORMES_GRANDS: FormeNombre[] = ["chiffres", "classes", "somme", "lettres"];
const FORMES_DECIMAUX: FormeNombre[] = ["virgule", "fraction", "fractions", "unitesDec", "lettres"];

export const NIVEAUX: Niveau[] = [
  { id: "c1-avant4", cycle: 1, classe: "PS", libelle: "Avant 4 ans — plus ou moins, d'un coup d'œil", famille: "collections", min: 1, max: 8,
    valeurs: [1, 2, 4, 8], decimales: 0, formes: ["enVrac", "constellation"], parDefaut: ["enVrac", "constellation"] },
  { id: "c1-4ans", cycle: 1, classe: "MS", libelle: "À partir de 4 ans — jusqu'à 6, en comptant", famille: "collections", min: 1, max: 6,
    decimales: 0, formes: ["enVrac", "constellation", "doigts"], parDefaut: ["enVrac", "constellation", "doigts"] },
  { id: "c1-5ans", cycle: 1, classe: "GS", libelle: "À partir de 5 ans — jusqu'à 10, et les chiffres", famille: "collections", min: 1, max: 10,
    decimales: 0, formes: ["enVrac", "constellation", "doigts", "boite", "chiffres"], parDefaut: ["constellation", "doigts", "chiffres"] },
  { id: "cp-30", cycle: 2, classe: "CP", libelle: "CP, période 1 — jusqu'à 30", famille: "entiers", min: 1, max: 30,
    decimales: 0, formes: FORMES_CP, parDefaut: ["chiffres", "cubes", "unites", "desordre"] },
  { id: "cp-59", cycle: 2, classe: "CP", libelle: "CP, période 2 — jusqu'à 59", famille: "entiers", min: 1, max: 59,
    decimales: 0, formes: FORMES_CP, parDefaut: ["chiffres", "cubes", "unites", "desordre"] },
  { id: "cp-100", cycle: 2, classe: "CP", libelle: "CP, dès la période 3 — jusqu'à 100", famille: "entiers", min: 1, max: 100,
    decimales: 0, formes: FORMES_CP, parDefaut: ["chiffres", "cubes", "unites", "desordre"] },
  { id: "ce1", cycle: 2, classe: "CE1", libelle: "CE1 — jusqu'à 1 000", famille: "entiers", min: 1, max: 1000,
    decimales: 0, formes: FORMES_CP, parDefaut: ["chiffres", "cubes", "unites", "desordre"] },
  { id: "ce2", cycle: 2, classe: "CE2", libelle: "CE2 — jusqu'à 10 000", famille: "entiers", min: 1, max: 10000,
    decimales: 0, formes: FORMES_MILLIERS, parDefaut: ["chiffres", "unites", "desordre", "somme"] },
  { id: "cm1-entiers", cycle: 3, classe: "CM1", libelle: "CM1, périodes 1 et 2 — jusqu'à 9 999", famille: "entiers", min: 1, max: 9999,
    decimales: 0, formes: FORMES_MILLIERS, parDefaut: ["chiffres", "unites", "somme", "lettres"] },
  { id: "cm1-grands", cycle: 3, classe: "CM1", libelle: "CM1, dès la période 3 — jusqu'à 999 999", famille: "grands", min: 1000, max: 999999,
    decimales: 0, formes: FORMES_GRANDS, parDefaut: ["chiffres", "classes", "lettres"] },
  { id: "cm1-decimaux", cycle: 3, classe: "CM1", libelle: "CM1 — nombres décimaux, jusqu'aux centièmes", famille: "decimaux", min: 1, max: 9999,
    decimales: 2, formes: FORMES_DECIMAUX, parDefaut: ["virgule", "fraction", "fractions"] },
  { id: "cm2-grands", cycle: 3, classe: "CM2", libelle: "CM2 — jusqu'à 999 999 999", famille: "grands", min: 1000, max: 999999999,
    decimales: 0, formes: FORMES_GRANDS, parDefaut: ["chiffres", "classes", "lettres"] },
  { id: "cm2-decimaux", cycle: 3, classe: "CM2", libelle: "CM2 et 6e — nombres décimaux, jusqu'aux millièmes", famille: "decimaux", min: 1, max: 99999,
    decimales: 3, formes: FORMES_DECIMAUX, parDefaut: ["virgule", "fraction", "fractions"] },
];

export const GROUPES_DE_NIVEAUX = [
  { cycle: 1, nom: "Cycle 1 — maternelle" },
  { cycle: 2, nom: "Cycle 2" },
  { cycle: 3, nom: "Cycle 3" },
] as const;

export const niveauParId = (id: string): Niveau => NIVEAUX.find((n) => n.id === id) ?? NIVEAUX[3];

export const NOMBRES_DE_CARTES = [24, 32, 40, 48] as const;

export interface ReglagesComparer {
  titre: string;
  niveau: IdNiveau;
  formes: FormeNombre[];
  cartes: number;
  /** Des nombres qui se ressemblent : 47 et 74, 49 et 51, 3,5 et 3,45. */
  pieges: boolean;
  /** Douze cartes par page au lieu de vingt, pour les petites mains. */
  grandes: boolean;
  /** La règle des jeux et le savoir à retenir. */
  regle: boolean;
  /** Les cartes des signes <, > et = (pas avant le CP). */
  signes: boolean;
  /** La feuille où l'on écrit ses comparaisons, sa file, ses encadrements (pas avant le CP). */
  feuilleDeJeu: boolean;
}

export const REGLAGES_COMPARER: ReglagesComparer = {
  titre: "Comparer les nombres", niveau: "cp-30", formes: ["chiffres", "cubes", "unites", "desordre"], cartes: 32,
  pieges: true, grandes: false, regle: true, signes: true, feuilleDeJeu: true,
};

export const niveauDe = (r: Pick<ReglagesComparer, "niveau">) => niveauParId(r.niveau);

/** Les champs du CP d'avant les niveaux : 30, 59, 100. */
const ANCIENS_CHAMPS: Record<number, IdNiveau> = { 30: "cp-30", 59: "cp-59", 100: "cp-100" };

/** Des réglages relus de la mémoire : ce qui n'a plus de sens revient au défaut ; l'ancien champ du CP devient son niveau. */
export function reglagesComparerSurs(brut: Partial<ReglagesComparer> & { jusqua?: number }): ReglagesComparer {
  const r = { ...REGLAGES_COMPARER, ...brut };
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  // Un ancien réglage (« jusqu'à 100 ») passe avant le niveau par défaut, que la mémoire a mêlé aux réglages gardés ;
  // il s'efface dès qu'on choisit un niveau.
  const id = typeof brut.jusqua === "number" && ANCIENS_CHAMPS[brut.jusqua] ? ANCIENS_CHAMPS[brut.jusqua]
    : NIVEAUX.some((n) => n.id === brut.niveau) ? brut.niveau as IdNiveau : REGLAGES_COMPARER.niveau;
  const niveau = niveauParId(id);
  const formes = Array.isArray(r.formes) ? niveau.formes.filter((f) => r.formes.includes(f)) : [];
  return {
    titre: typeof r.titre === "string" ? r.titre : REGLAGES_COMPARER.titre,
    niveau: id,
    formes: formes.length ? formes : niveau.parDefaut,
    cartes: (NOMBRES_DE_CARTES as readonly number[]).includes(r.cartes) ? r.cartes : REGLAGES_COMPARER.cartes,
    pieges: oui(r.pieges, true), grandes: oui(r.grandes, false),
    regle: oui(r.regle, true), signes: oui(r.signes, true), feuilleDeJeu: oui(r.feuilleDeJeu, true),
  };
}

// ── Les unités de numération ──────────────────────────────────────────────

interface Rang { id: Groupement; valeur: number; singulier: string; pluriel: string }
const RANGS: Rang[] = [
  { id: "m", valeur: 1000, singulier: "millier", pluriel: "milliers" },
  { id: "c", valeur: 100, singulier: "centaine", pluriel: "centaines" },
  { id: "d", valeur: 10, singulier: "dizaine", pluriel: "dizaines" },
  { id: "u", valeur: 1, singulier: "unité", pluriel: "unités" },
];

/** Les unités qu'un niveau écrit : dizaines et unités au CP, les centaines au CE1, les milliers ensuite. */
export function rangsDe(niv: Niveau): Rang[] {
  if (niv.max <= 100) return RANGS.slice(2);
  if (niv.max <= 1000) return RANGS.slice(1);
  return RANGS;
}

/** Combien de chaque unité, au plus juste : la plus grande peut dépasser neuf (1 000 au CE1, c'est 10 centaines). */
export function parties(n: number, rangs: Rang[]): number[] {
  let reste = n;
  return rangs.map((r, i) => {
    const k = i === 0 ? Math.floor(reste / r.valeur) : Math.floor(reste / r.valeur) % 10;
    reste -= k * r.valeur;
    return k;
  });
}

/** Une unité défaite en dix de la suivante : 47 → 3d 17u ; 635 → 5c 13d 5u. Null s'il n'y a rien à défaire. */
export function avecUneUniteDefaite(n: number, rangs: Rang[]): number[] | null {
  const p = parties(n, rangs);
  const i = p.findIndex((k, j) => k > 0 && j < p.length - 1);
  if (i < 0) return null;
  p[i] -= 1;
  p[i + 1] += 10;
  return p;
}

const ecrireParties = (p: number[], rangs: Rang[], ordre: "normal" | "inverse" = "normal") => {
  const morceaux = p.map((k, i) => (k ? `${k}${rangs[i].id}` : "")).filter(Boolean);
  return (ordre === "inverse" ? morceaux.reverse() : morceaux).join(" ");
};

// ── Les décimaux ──────────────────────────────────────────────────────────

/** Un décimal en entiers : sa partie entière, ses chiffres après la virgule sans zéro au bout. */
export function decimal(v: number, d: number): { entier: number; chiffres: number[] } {
  const p = 10 ** d;
  const chiffres = String(v % p).padStart(d, "0").split("").map(Number);
  while (chiffres.length && chiffres[chiffres.length - 1] === 0) chiffres.pop();
  return { entier: Math.floor(v / p), chiffres };
}

const PARTIES_DECIMALES = [
  { singulier: "dixième", pluriel: "dixièmes" },
  { singulier: "centième", pluriel: "centièmes" },
  { singulier: "millième", pluriel: "millièmes" },
];

/** « 3,45 », « 0,7 », « 12 ». */
export function ecrireVirgule(v: number, d: number): string {
  const { entier, chiffres } = decimal(v, d);
  return chiffres.length ? `${fr(entier)},${chiffres.join("")}` : fr(entier);
}

/** La fraction décimale : 345/100 ; null pour un entier. */
export function fractionDecimale(v: number, d: number): { numerateur: number; denominateur: number } | null {
  const { entier, chiffres } = decimal(v, d);
  if (!chiffres.length) return null;
  const k = chiffres.length;
  return { numerateur: entier * 10 ** k + Number(chiffres.join("")), denominateur: 10 ** k };
}

/** La somme : 3 + 4/10 + 5/100, les termes en fractions [numérateur, dénominateur], l'entier à part. */
export function sommeDeFractions(v: number, d: number): { entier: number; termes: [number, number][] } {
  const { entier, chiffres } = decimal(v, d);
  return { entier, termes: chiffres.map((c, i) => [c, 10 ** (i + 1)] as [number, number]).filter(([c]) => c > 0) };
}

function decimalEnLettres(v: number, d: number): string {
  const { entier, chiffres } = decimal(v, d);
  if (!chiffres.length) return nombreEnLettres(entier);
  const k = chiffres.length;
  const n = Number(chiffres.join(""));
  const partie = PARTIES_DECIMALES[k - 1];
  const decimales = n === 1 ? `un ${partie.singulier}` : `${nombreEnLettres(n)} ${partie.pluriel}`;
  if (entier === 0) return decimales;
  // « unité » est féminin : « vingt et une unités ».
  const unites = entier === 1 ? "une unité" : `${nombreEnLettres(entier).replace(/\bun$/, "une")} unités`;
  return `${unites} et ${decimales}`;
}

// ── Écrire un nombre sous une forme ───────────────────────────────────────

/** Toutes les formes ne vont pas à tous les nombres : « 7u 4d » demande deux unités de numération. */
export function convient(n: number, forme: FormeNombre, niv: Niveau): boolean {
  if (niv.famille === "decimaux") {
    const { entier, chiffres } = decimal(n, niv.decimales);
    switch (forme) {
      case "fraction": case "unitesDec": return chiffres.length > 0;
      case "fractions": return chiffres.length > 0 && (entier > 0 || chiffres.filter((c) => c > 0).length > 1);
      default: return true;
    }
  }
  const rangs = rangsDe(niv);
  const nonNuls = parties(n, rangs).filter((k) => k > 0).length;
  switch (forme) {
    case "enVrac": case "constellation": case "doigts": return n >= 1 && n <= 10;
    case "boite": return n >= 1 && n <= 20;
    case "vrac": case "plusDeDix": return avecUneUniteDefaite(n, rangs) !== null;
    case "desordre": return nonNuls >= 2;
    case "somme": return niv.famille === "grands" ? [Math.floor(n / 1e6), Math.floor(n / 1000) % 1000, n % 1000].filter(Boolean).length >= 2 : nonNuls >= 2;
    case "classes": return n >= 1000;
    default: return n >= 1;
  }
}

/** « 1 456 789 » → « 1 million 456 mille 789 ». */
function parClasses(n: number): string {
  const millions = Math.floor(n / 1e6), milliers = Math.floor(n / 1000) % 1000, reste = n % 1000;
  return [millions ? `${millions} million${millions > 1 ? "s" : ""}` : "", milliers ? `${milliers} mille` : "", reste ? String(reste) : ""]
    .filter(Boolean).join(" ");
}

/**
 * Le nombre écrit sous une forme : 47 → « 4d 7u », « 7u 4d », « 3d 17u »,
 * « 40 + 7 » ; 635 → « 6c 3d 5u », « 5c 13d 5u » ; 3,45 → « 345/100 »,
 * « 3 + 4/10 + 5/100 ». Comme dans le guide, une dizaine entière s'écrit « 6d ».
 */
export function ecrireForme(n: number, forme: FormeNombre, niv: Niveau): string {
  if (niv.famille === "decimaux") {
    const d = niv.decimales;
    switch (forme) {
      case "fraction": { const f = fractionDecimale(n, d); return f ? `${fr(f.numerateur)}/${fr(f.denominateur)}` : ecrireVirgule(n, d); }
      case "fractions": {
        const s = sommeDeFractions(n, d);
        return [s.entier ? fr(s.entier) : "", ...s.termes.map(([a, b]) => `${a}/${fr(b)}`)].filter(Boolean).join(" + ");
      }
      case "unitesDec": {
        const { entier, chiffres } = decimal(n, d);
        const morceaux = chiffres.map((c, i) => (c ? `${c} ${c > 1 ? PARTIES_DECIMALES[i].pluriel : PARTIES_DECIMALES[i].singulier}` : "")).filter(Boolean);
        return [entier ? `${fr(entier)} unité${entier > 1 ? "s" : ""}` : "", ...morceaux].filter(Boolean).join(" ");
      }
      case "lettres": return decimalEnLettres(n, d);
      default: return ecrireVirgule(n, d);
    }
  }
  const rangs = rangsDe(niv);
  switch (forme) {
    case "unites": return ecrireParties(parties(n, rangs), rangs);
    case "desordre": return ecrireParties(parties(n, rangs), rangs, "inverse");
    case "plusDeDix": { const p = avecUneUniteDefaite(n, rangs); return p ? ecrireParties(p, rangs) : ecrireParties(parties(n, rangs), rangs); }
    case "somme":
      // Les grands nombres se décomposent par classes : 8 000 000 + 701 000 + 978.
      if (niv.famille === "grands") return [Math.floor(n / 1e6) * 1e6, (Math.floor(n / 1000) % 1000) * 1000, n % 1000].filter(Boolean).map((k) => fr(k)).join(" + ");
      return parties(n, rangs).map((k, i) => (k ? fr(k * rangs[i].valeur) : "")).filter(Boolean).join(" + ");
    case "lettres": return nombreEnLettres(n);
    case "classes": return parClasses(n);
    default: return fr(n);
  }
}

/** Le nombre tel qu'on l'écrit en chiffres, à virgule pour un décimal : « 4 635 », « 3,45 ». */
export const enChiffres = (n: number, niv: Niveau) => (niv.famille === "decimaux" ? ecrireVirgule(n, niv.decimales) : fr(n));

/** Le nom d'une forme, au niveau choisi : les « barres et cubes » du CP deviennent des plaques au CE1. */
export function libelleForme(forme: FormeNombre, niv: Niveau): string {
  const cp = niv.max <= 100;
  switch (forme) {
    case "enVrac": return "points en vrac";
    case "constellation": return "points du dé";
    case "doigts": return "doigts";
    case "boite": return "boîte de dix";
    case "chiffres": return "en chiffres";
    case "cubes": return cp ? "barres et cubes" : "plaques, barres et cubes";
    case "vrac": return cp ? "barres et cubes pas tous groupés" : "matériel pas tout groupé";
    case "unites": return cp ? "dizaines et unités" : niv.max <= 1000 ? "centaines, dizaines, unités" : "milliers, centaines…";
    case "desordre": return cp ? "les unités d'abord" : "dans le désordre";
    case "plusDeDix": return cp ? "plus de dix unités" : "plus de dix d'une unité";
    case "somme": return "décomposition";
    case "lettres": return "en lettres";
    case "classes": return "par classes";
    case "virgule": return "écriture à virgule";
    case "fraction": return "fraction décimale";
    case "fractions": return "somme de fractions";
    case "unitesDec": return "dixièmes, centièmes…";
  }
}

/** Un nombre d'exemple, pour dire chaque forme : 6, 47, 635, 4 635, 456 789, 3,45. */
export function nombreDExemple(niv: Niveau): number {
  switch (niv.famille) {
    case "collections": return 6;
    case "decimaux": return niv.decimales === 2 ? 345 : 3456;
    case "grands": return niv.max >= 1e6 ? 12456789 : 456789;
    default: return niv.max <= 100 ? 47 : niv.max <= 1000 ? 635 : 4635;
  }
}

/** Ce que montre une forme, en mots : « 6 points du dé », « 4 barres, 7 cubes », « 3d 17u ». */
export function exempleForme(forme: FormeNombre, niv: Niveau): string {
  const n = nombreDExemple(niv);
  const rangs = rangsDe(niv);
  const materiel = (p: number[]) => p.map((k, i) => (k ? `${k} ${rangs[i].id === "c" ? "plaque" : rangs[i].id === "d" ? "barre" : "cube"}${k > 1 ? "s" : ""}` : ""))
    .filter(Boolean).join(", ");
  switch (forme) {
    case "enVrac": return `${n} points en vrac`;
    case "constellation": return `${n} points du dé`;
    case "doigts": return `${n} doigts levés`;
    case "boite": return `${n} cases pleines`;
    case "cubes": return materiel(parties(n, rangs));
    case "vrac": return materiel(avecUneUniteDefaite(n, rangs) ?? parties(n, rangs));
    default: return ecrireForme(n, forme, niv);
  }
}

// ── Les dessins ───────────────────────────────────────────────────────────

const f2 = (x: number) => Number(x.toFixed(2));

/**
 * Des barres de dix et des cubes, en millimètres : les barres côte à côte,
 * les cubes par rangées de cinq posées depuis le bas — trois rangées de cinq
 * et deux se voient sans compter un à un.
 */
export function barresEtCubes(barres: number, cubes: number, u = 2.4): string {
  const ecart = 0.4 * u, entre = 1.8 * u, parRangee = 5;
  const couleurs = REGLAGES_CUBES.couleurs;
  const largeurBarres = barres > 0 ? barres * u + (barres - 1) * ecart : 0;
  const colonnes = Math.min(parRangee, cubes);
  const largeurCubes = cubes > 0 ? colonnes * u + (colonnes - 1) * ecart : 0;
  const rangees = Math.ceil(cubes / parRangee);
  const hauteur = Math.max(barres > 0 ? 10 * u : 0, rangees * u + Math.max(0, rangees - 1) * ecart, u);
  const decalage = barres > 0 && cubes > 0 ? entre : 0;
  const morceaux: string[] = [];
  for (let i = 0; i < barres; i++) morceaux.push(piece("d", i * (u + ecart), hauteur - 10 * u, u, couleurs.d));
  for (let i = 0; i < cubes; i++) {
    const rangee = Math.floor(i / parRangee), colonne = i % parRangee;
    morceaux.push(piece("u", largeurBarres + decalage + colonne * (u + ecart), hauteur - u - rangee * (u + ecart), u, couleurs.u));
  }
  const marge = 0.3;
  const L = f2(largeurBarres + decalage + largeurCubes + 2 * marge), H = f2(hauteur + 2 * marge);
  const titre = `${barres} barre${barres > 1 ? "s" : ""} de dix et ${cubes} cube${cubes > 1 ? "s" : ""}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="${-marge} ${-marge} ${L} ${H}" role="img" aria-label="${titre}">${morceaux.join("")}</svg>`;
}

/** Le matériel d'un nombre du CE1 : plaques, barres et cubes, au plus juste ou une unité défaite. */
function materielSvg(p: number[], rangs: Rang[], u: number): string {
  const groupes: Record<Groupement, number> = { m: 0, c: 0, d: 0, u: 0 };
  rangs.forEach((r, i) => { groupes[r.id] = p[i]; });
  const titre = rangs.map((r, i) => (p[i] ? `${p[i]} ${p[i] > 1 ? r.pluriel : r.singulier}` : "")).filter(Boolean).join(", ");
  return dessinerGroupes(groupes, u, REGLAGES_CUBES.couleurs, titre).svg;
}

/** Des points semés sans ordre, toujours les mêmes pour un même nombre : une case par point, un peu décalé. */
export function pointsEnVracSvg(n: number): string {
  const alea = hasard(n * 7919 + 13);
  const cases = melanger(alea, Array.from({ length: 16 }, (_, i) => i)).slice(0, Math.min(n, 16));
  const points = cases.map((k) => {
    const cx = 12.5 + (k % 4) * 25 + (alea() - 0.5) * 8, cy = 12.5 + Math.floor(k / 4) * 25 + (alea() - 0.5) * 8;
    return `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="8" fill="#1c2233"/>`;
  });
  return `<svg class="cn-vrac" viewBox="0 0 100 100" role="img" aria-label="${n} points">${points.join("")}</svg>`;
}

/** Une fraction écrite comme à l'école, le trait entre les deux nombres. */
const fractionHtml = (a: number, b: number) => `<span class="cn-frac"><span>${fr(a)}</span><span>${fr(b)}</span></span>`;

/** La face d'une carte. `u` : le côté d'un cube, en millimètres. */
export function faceDeCarte(c: CarteNombre, niv: Niveau, u = 2.4): string {
  const texte = (t: string) => {
    if (c.forme === "chiffres" || c.forme === "virgule") {
      // Plus le nombre est long, plus il s'écrit petit : 999 999 999 tient dans la carte comme 47.
      const taille = t.length <= 4 ? "" : t.length <= 7 ? " cn-t2" : t.length <= 11 ? " cn-t3" : " cn-t4";
      return `<div class="cn-chiffres${taille}">${escapeHtml(t)}</div>`;
    }
    return `<div class="${c.forme === "lettres" ? "cn-lettres" : t.length > 12 ? "cn-long" : "cn-unites"}">${escapeHtml(t)}</div>`;
  };
  if (niv.famille === "decimaux") {
    if (c.forme === "fraction") {
      const f = fractionDecimale(c.n, niv.decimales);
      if (f) return `<div class="cn-fractions">${fractionHtml(f.numerateur, f.denominateur)}</div>`;
    }
    if (c.forme === "fractions") {
      const s = sommeDeFractions(c.n, niv.decimales);
      const termes = [s.entier ? `<span class="cn-terme">${fr(s.entier)}</span>` : "", ...s.termes.map(([a, b]) => fractionHtml(a, b))].filter(Boolean);
      return `<div class="cn-fractions cn-somme">${termes.join(`<span class="cn-plus">+</span>`)}</div>`;
    }
    return texte(ecrireForme(c.n, c.forme, niv));
  }
  const rangs = rangsDe(niv);
  switch (c.forme) {
    case "enVrac": return `<div class="cn-visuel">${pointsEnVracSvg(c.n)}</div>`;
    case "constellation": return `<div class="cn-visuel">${pointsSvg(c.n)}</div>`;
    case "doigts": return `<div class="cn-visuel">${doigtsSvg(c.n)}</div>`;
    case "boite": return `<div class="cn-visuel cn-boite">${boiteDeDixSvg(c.n)}</div>`;
    case "cubes":
      if (rangs.length === 2) return `<div class="cn-cubes">${barresEtCubes(Math.floor(c.n / 10), c.n % 10, u)}</div>`;
      return `<div class="cn-cubes">${materielSvg(parties(c.n, rangs), rangs, u * 0.62)}</div>`;
    case "vrac": {
      const p = avecUneUniteDefaite(c.n, rangs) ?? parties(c.n, rangs);
      if (rangs.length === 2) return `<div class="cn-cubes">${barresEtCubes(p[0], p[1], u)}</div>`;
      return `<div class="cn-cubes">${materielSvg(p, rangs, u * 0.62)}</div>`;
    }
    default: return texte(ecrireForme(c.n, c.forme, niv));
  }
}

// ── Le paquet ──────────────────────────────────────────────────────────────

export interface CarteNombre { n: number; forme: FormeNombre }

const entre = (alea: () => number, min: number, max: number) => min + Math.floor(alea() * (max - min + 1));

/** Un nombre du niveau, d'une taille variée : au CE1 surtout des centaines, au CM des nombres de toutes les longueurs. */
export function tirerNombre(niv: Niveau, alea: () => number): number {
  if (niv.valeurs) return niv.valeurs[Math.floor(alea() * niv.valeurs.length)];
  if (niv.famille === "decimaux") {
    const p = 10 ** niv.decimales;
    const entier = alea() < 0.75 ? entre(alea, 0, 20) : entre(alea, 21, Math.floor(niv.max / p));
    // Un, deux ou trois chiffres après la virgule, jamais de zéro au bout.
    const k = entre(alea, 1, niv.decimales);
    let chiffres = Array.from({ length: k }, () => entre(alea, 0, 9));
    chiffres[k - 1] = entre(alea, 1, 9);
    if (entier === 0 && chiffres.every((c) => c === 0)) chiffres = [entre(alea, 1, 9)];
    return entier * p + Number(chiffres.join("").padEnd(niv.decimales, "0"));
  }
  if (niv.famille === "grands" || niv.max > 100) {
    const plus = String(niv.max).length;
    const moins = Math.max(String(niv.min).length, niv.famille === "grands" ? plus - 3 : plus - 2);
    const longueur = entre(alea, moins, niv.max >= 10 ** (plus - 1) && niv.max < 10 ** plus - 1 ? plus - 1 : plus);
    return Math.min(niv.max, entre(alea, 10 ** (longueur - 1), 10 ** longueur - 1));
  }
  return entre(alea, niv.min, niv.max);
}

/** Échange deux chiffres voisins, différents : 352 → 325 ; null si le nombre change de longueur ou sort du niveau. */
function chiffresEchanges(n: number, niv: Niveau, alea: () => number): number | null {
  const c = String(n).split("");
  const possibles = c.map((_, i) => i).filter((i) => i < c.length - 1 && c[i] !== c[i + 1] && !(i === 0 && c[1] === "0"));
  if (!possibles.length) return null;
  const i = possibles[Math.floor(alea() * possibles.length)];
  [c[i], c[i + 1]] = [c[i + 1], c[i]];
  const v = Number(c.join(""));
  return v >= niv.min && v <= niv.max ? v : null;
}

/**
 * Un nombre qui ressemble à `n` sans lui être égal — les comparaisons où
 * l'on se trompe en regardant mal : au CP 47 et 74, 49 et 51, 45 et 48, 40
 * et 4 ; plus loin 352 et 325, 398 et 401, 456 789 et 45 678 ; pour les
 * décimaux 3,5 et 3,45, 3,5 et 3,05, 2,1 et 2,09. En maternelle, une
 * quantité voisine — ou, avant 4 ans, une autre du simple au double.
 */
export function ressemblant(n: number, niv: Niveau, alea: () => number): number | null {
  const choix: number[] = [];
  const garder = (v: number | null) => { if (v != null && v !== n && v >= niv.min && v <= niv.max) choix.push(v); };
  if (niv.famille === "collections") {
    if (niv.valeurs) niv.valeurs.forEach(garder);
    else { garder(n + 1); garder(n - 1); }
  } else if (niv.famille === "decimaux") {
    const p = 10 ** niv.decimales;
    const { entier, chiffres } = decimal(n, niv.decimales);
    const valeur = (cs: number[]) => entier * p + Number(cs.join("").padEnd(niv.decimales, "0").slice(0, niv.decimales));
    const premier = chiffres[0] ?? 0;
    // Plus de chiffres, et pourtant plus petit : 3,5 et 3,45.
    if (premier > 0 && niv.decimales >= 2) garder(valeur([premier - 1, entre(alea, 1, 9)]));
    // Le zéro qui décale : 3,5 et 3,05.
    if (premier > 0 && niv.decimales >= 2) garder(valeur([0, premier]));
    // Un chiffre de plus au bout : 2,1 et 2,09 ; 3,45 et 3,46.
    if (chiffres.length) garder(n + (alea() < 0.5 ? 1 : -1) * p / 10 ** chiffres.length);
    if (chiffres.length >= 2 && chiffres[0] !== chiffres[1]) garder(valeur([chiffres[1], chiffres[0], ...chiffres.slice(2)]));
  } else if (niv.max <= 100) {
    const d = Math.floor(n / 10), u = n % 10;
    if (d > 0 && u > 0 && d !== u) garder(u * 10 + d);
    if (u >= 7) garder((d + 1) * 10 + Math.floor(alea() * 3));
    if (d > 0) garder(d * 10 + ((u + 1 + Math.floor(alea() * 8)) % 10));
    if (u === 0 && d > 0) garder(d);
  } else {
    garder(chiffresEchanges(n, niv, alea));
    // Le même début, le dernier chiffre seul qui change.
    garder(n - (n % 10) + ((n % 10) + entre(alea, 1, 9)) % 10);
    // De part et d'autre d'une centaine, d'un millier : 398 et 401.
    const rang = niv.famille === "grands" ? 1000 : 100;
    if (n % rang >= rang - rang / 10) garder(n - (n % rang) + rang + entre(alea, 0, rang / 50));
    // Un chiffre de moins : 45 678 et 456 789 — le nombre de chiffres compte d'abord.
    if (niv.famille === "grands") garder(Math.floor(n / 10));
  }
  return choix.length ? choix[Math.floor(alea() * choix.length)] : null;
}

/**
 * Le paquet : la moitié des cartes en nombres différents, chacun sous deux
 * formes — tirées parmi celles qui lui vont —, puis mélangé. Avec les
 * pièges, un nombre sur deux environ amène son ressemblant. En maternelle,
 * où il y a moins de nombres que de paires, chaque quantité revient.
 */
export function paquet(r: ReglagesComparer, graine: number): CarteNombre[] {
  const niv = niveauDe(r);
  const alea = hasard(graine);
  const voulus = r.cartes / 2;
  const nombres: number[] = [];
  const distincts = niv.valeurs?.length ?? niv.max - niv.min + 1;
  if (distincts < voulus) {
    const valeurs = niv.valeurs ?? Array.from({ length: distincts }, (_, i) => niv.min + i);
    for (let i = 0; nombres.length < voulus; i++) nombres.push(valeurs[i % valeurs.length]);
  } else {
    const pris = new Set<number>();
    const prendre = (n: number) => { if (!pris.has(n) && nombres.length < voulus) { pris.add(n); nombres.push(n); } };
    for (let essais = 0; nombres.length < voulus && essais < 4000; essais++) {
      const n = tirerNombre(niv, alea);
      if (pris.has(n)) continue;
      prendre(n);
      if (r.pieges && alea() < 0.6) {
        const voisin = ressemblant(n, niv, alea);
        if (voisin != null) prendre(voisin);
      }
    }
  }
  const cartes: CarteNombre[] = [];
  for (const n of nombres) {
    const possibles = r.formes.filter((f) => convient(n, f, niv));
    const [a, b] = melanger(alea, possibles.length ? possibles : [niv.famille === "decimaux" ? "virgule" : "chiffres"] as FormeNombre[]);
    cartes.push({ n, forme: a }, { n, forme: b ?? a });
  }
  return melanger(alea, cartes);
}

// ── Ce qu'on retient ──────────────────────────────────────────────────────

/** Les signes, et ce qu'on dit en les lisant de gauche à droite. */
export const SIGNES = [
  { signe: "<", lecture: "est plus petit que" },
  { signe: ">", lecture: "est plus grand que" },
  { signe: "=", lecture: "est égal à" },
] as const;

/**
 * Les deux nombres du savoir à retenir, le plus grand d'abord : 71 et 68
 * comme dans le guide (51 et 48, 21 et 18 au CP selon le champ), 412 et 398,
 * 4 012 et 3 998, 3,5 et 3,45 ; en maternelle, deux quantités.
 */
export function exempleDuSavoir(niv: Niveau): [number, number] {
  switch (niv.famille) {
    case "collections": return niv.valeurs ? [8, 2] : niv.max <= 6 ? [6, 4] : [7, 5];
    case "decimaux": return niv.decimales === 2 ? [350, 345] : [3500, 3450];
    case "grands": return niv.max >= 1e6 ? [1000000, 999999] : [100000, 99999];
    default: {
      if (niv.max > 1000) return [4012, 3998];
      if (niv.max > 100) return [412, 398];
      const t = Math.min(7, Math.floor((niv.max - 1) / 10));
      return [t * 10 + 1, (t - 1) * 10 + 8];
    }
  }
}

// Une espace insécable : « 7 » ne reste pas seul en fin de ligne, loin de ses dizaines.
const compte = (k: number, r: Rang) => `${k} ${k > 1 ? r.pluriel : r.singulier}`;
const dizaines = (k: number) => compte(k, RANGS[2]);
const NOMS_PETITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

/** La phrase du savoir : pourquoi le premier est le plus grand. */
export function phraseDuSavoir(niv: Niveau): string {
  const [a, b] = exempleDuSavoir(niv);
  switch (niv.famille) {
    case "collections":
      if (niv.valeurs) return "Ici, il y a plus de points que là : ça se voit d'un coup d'œil. Pour en être sûr, on met les points un en face de l'autre.";
      if (niv.max <= 6) return `Je compte : ${NOMS_PETITS[a]} points, ${NOMS_PETITS[b]} points. ${NOMS_PETITS[a].replace(/^./, (x) => x.toUpperCase())}, c'est plus que ${NOMS_PETITS[b]} : il y a plus de points sur la première carte.`;
      return `${NOMS_PETITS[a].replace(/^./, (x) => x.toUpperCase())}, c'est plus que ${NOMS_PETITS[b]} : quand on compte, ${NOMS_PETITS[a]} vient après ${NOMS_PETITS[b]}. Le même nombre de points, c'est autant.`;
    case "decimaux":
      return `${enChiffres(a, niv)} est plus grand que ${enChiffres(b, niv)} : les deux ont 3 unités, et 5 dixièmes, c'est plus que 4 dixièmes. Le nombre de chiffres après la virgule ne dit pas lequel est le plus grand.`;
    case "grands":
      return `${fr(a)} est plus grand que ${fr(b)} : il a plus de chiffres. Quand deux nombres ont autant de chiffres, on les compare chiffre à chiffre en partant de la gauche.`;
    default: {
      const rangs = rangsDe(niv);
      const r0 = rangs[0];
      const [ka, kb] = [Math.floor(a / r0.valeur), Math.floor(b / r0.valeur)];
      return `${fr(a)} est plus grand que ${fr(b)}, car dans ${fr(a)} il y a ${compte(ka, r0)} alors que dans ${fr(b)} il y a seulement ${compte(kb, r0)}.`;
    }
  }
}

/**
 * Ce qu'on retient, la trace du guide : les deux nombres dessinés ou écrits
 * en unités, le signe, et la phrase qui dit pourquoi. `u` grandit pour
 * l'affiche. En maternelle, ni signe ni chiffre avant 5 ans.
 */
export function blocDuSavoir(niv: Niveau, u = 2.6): string {
  const [a, b] = exempleDuSavoir(niv);
  const rangs = rangsDe(niv);
  const cote = (n: number): string => {
    switch (niv.famille) {
      case "collections": {
        const dessin = niv.valeurs ? pointsEnVracSvg(n) : pointsSvg(n);
        return `<div class="cn-savoir-nombre cn-savoir-visuel">${dessin}${niv.max >= 10 ? `<div class="cn-savoir-chiffre">${n}</div>` : ""}</div>`;
      }
      case "decimaux": {
        const s = sommeDeFractions(n, niv.decimales);
        return `<div class="cn-savoir-nombre"><div class="cn-savoir-chiffre">${enChiffres(n, niv)}</div><div>${fr(s.entier)} unités ${s.termes.map(([c], i) => `${c} ${PARTIES_DECIMALES[i] ? (c > 1 ? PARTIES_DECIMALES[i].pluriel : PARTIES_DECIMALES[i].singulier) : ""}`).join(" ")}</div></div>`;
      }
      case "grands":
        return `<div class="cn-savoir-nombre"><div class="cn-savoir-chiffre">${fr(n)}</div><div>${String(n).length} chiffres</div></div>`;
      default: {
        const p = parties(n, rangs);
        const enUnites = p.map((k, i) => compte(k, rangs[i])).join(" ");
        if (rangs.length === 2) return `<div class="cn-savoir-nombre">${barresEtCubes(p[0], p[1], u)}<div>${enUnites}</div></div>`;
        if (rangs.length === 3) return `<div class="cn-savoir-nombre">${materielSvg(p, rangs, u * 0.62)}<div>${enUnites}</div></div>`;
        return `<div class="cn-savoir-nombre"><div class="cn-savoir-chiffre">${fr(n)}</div><div>${enUnites}</div></div>`;
      }
    }
  };
  const signes = niv.cycle === 1 ? "" : `<div class="cn-savoir-signes">${enChiffres(a, niv)} &gt; ${enChiffres(b, niv)}</div>`;
  return `<div class="cn-savoir">
      <div class="cn-savoir-titre">Ce qu'on retient</div>
      <div class="cn-savoir-dessins">${cote(a)}${cote(b)}</div>
      ${signes}
      <p>${escapeHtml(phraseDuSavoir(niv))}</p>
    </div>`;
}

// ── La règle des jeux ─────────────────────────────────────────────────────

interface Exemples { petit: number; grand: number; parce: string; file: [number, number, number]; cadres: [string, string] }

/** Des exemples pris dans les nombres du niveau, pour que la règle parle des nombres du paquet. */
function exemplesDe(niv: Niveau): Exemples {
  const lt = (a: string, b: string) => `${a} &lt; ? &lt; ${b}`;
  switch (niv.id) {
    case "cp-30": return { petit: 17, grand: 21, parce: `${dizaines(1)}, c'est moins que ${dizaines(2)}`, file: [12, 16, 23], cadres: [lt("10", "20"), lt("15", "20")] };
    case "cp-59": return { petit: 47, grand: 52, parce: `${dizaines(4)}, c'est moins que ${dizaines(5)}`, file: [34, 37, 41], cadres: [lt("20", "40"), lt("30", "40")] };
    case "cp-100": return { petit: 68, grand: 71, parce: `${dizaines(6)}, c'est moins que ${dizaines(7)}`, file: [54, 58, 63], cadres: [lt("50", "80"), lt("60", "70")] };
    case "ce1": return { petit: 325, grand: 352, parce: `autant de centaines, et ${dizaines(2)}, c'est moins que ${dizaines(5)}`, file: [229, 234, 243], cadres: [lt("200", "400"), lt("300", "350")] };
    case "ce2": case "cm1-entiers": return { petit: 6239, grand: 6243, parce: `autant de milliers et de centaines, et ${dizaines(3)}, c'est moins que ${dizaines(4)}`, file: [5229, 6234, 6300], cadres: [lt("6 000", "7 000"), lt("6 200", "6 300")] };
    case "cm1-grands": return { petit: 456789, grand: 456798, parce: "les mêmes chiffres jusqu'aux centaines, puis 8 dizaines, c'est moins que 9 dizaines", file: [45678, 99999, 100000], cadres: [lt("400 000", "500 000"), lt("450 000", "460 000")] };
    case "cm2-grands": return { petit: 12456789, grand: 12465789, parce: "les mêmes chiffres jusqu'aux centaines de mille, puis 5 dizaines de mille, c'est moins que 6", file: [9999999, 10000000, 12000000], cadres: [lt("12 000 000", "13 000 000"), lt("12 400 000", "12 500 000")] };
    case "cm1-decimaux": return { petit: 345, grand: 350, parce: "autant d'unités, et 4 dixièmes, c'est moins que 5 dixièmes", file: [209, 210, 215], cadres: [lt("3", "4"), lt("3,4", "3,5")] };
    case "cm2-decimaux": return { petit: 3456, grand: 3500, parce: "autant d'unités, et 4 dixièmes, c'est moins que 5 dixièmes", file: [2099, 2100, 2150], cadres: [lt("3,4", "3,5"), lt("3,45", "3,46")] };
    default: return { petit: 4, grand: 6, parce: "", file: [2, 4, 6], cadres: ["", ""] };
  }
}

/** La règle de la maternelle : la bataille des points, puis ranger — sans signes, avec les mots. */
function regleMaternelle(niv: Niveau): string {
  const verifier = niv.valeurs
    ? "Pour vérifier, on met un jeton sur chaque point, et l'on pose les jetons un en face de l'autre : il en reste d'un côté, il y en a plus."
    : "Pour vérifier, on compte les points de chaque carte, ou l'on met un jeton sur chaque point et l'on pose les jetons un en face de l'autre.";
  return `<div class="cn-jeu-regle">
      <b>La bataille des points</b><span class="cn-pour">2 joueurs · comparer des quantités</span>
      <ol>
        <li>On partage les cartes. Chacun retourne la carte du dessus de son paquet.</li>
        <li>On dit qui en a le plus : « J'en ai plus que toi », « J'en ai moins »${niv.max >= 10 ? ", « Nous en avons autant »" : ""}.</li>
        <li>Celui qui a le plus de points emporte les deux cartes.${niv.valeurs ? "" : " Autant : chacun retourne une autre carte."}</li>
      </ol>
      <p class="cn-verifier">${verifier}</p>
    </div>${niv.valeurs ? "" : `
    <div class="cn-jeu-regle">
      <b>La file des points</b><span class="cn-pour">2 à 4 joueurs · ranger des quantités</span>
      <ol>
        <li>Les cartes face visible : on les range de celle qui a le moins de points à celle qui en a le plus.</li>
        <li>Chacun pose une carte à son tour, au bon endroit dans la file, et dit pourquoi : « Il y en a plus que là, et moins que là. »</li>
      </ol>
    </div>`}`;
}

function regleDesNombres(niv: Niveau): string {
  const e = exemplesDe(niv);
  const n = (v: number) => enChiffres(v, niv);
  const [x, y, z] = e.file;
  const verifier = niv.famille === "decimaux"
    ? "on écrit les deux nombres l'un sous l'autre, virgule sous virgule, et l'on compare chiffre à chiffre en partant de la gauche — ou on les place sur une demi-droite graduée."
    : niv.famille === "grands" || niv.max > 1000
      ? "on écrit les deux nombres dans le tableau de numération, et l'on compare chiffre à chiffre en partant de la gauche."
      : niv.max > 100
        ? "on construit les deux nombres avec des plaques, des barres et des cubes, et l'on compare centaine contre centaine, puis dizaine contre dizaine."
        : "on construit les deux nombres avec des barres et des cubes, et l'on compare dizaine contre dizaine, puis unité contre unité.";
  return `<div class="cn-jeu-regle">
      <b>La bataille des nombres</b><span class="cn-pour">2 joueurs · comparer avec =, &lt; et &gt;</span>
      <ol>
        <li>On partage les cartes. Chacun retourne la carte du dessus de son paquet.</li>
        <li>On pose entre les deux cartes le signe qui convient, et on lit : « ${n(e.petit)} est plus petit que ${n(e.grand)} ».</li>
        <li>L'autre joueur demande : « Comment le sais-tu ? » — « ${e.parce.replace(/^./, (c) => c.toUpperCase())}. »</li>
        <li>Le plus grand nombre emporte les deux cartes. Le même nombre sous deux formes : on pose =, et c'est la bataille !</li>
      </ol>
    </div>
    <div class="cn-jeu-regle">
      <b>La file des nombres</b><span class="cn-pour">2 à 4 joueurs · ordonner, intercaler</span>
      <ol>
        <li>Une carte au milieu de la table ; chacun en reçoit cinq, le reste fait la pioche.</li>
        <li>À son tour, on pose une carte dans la file : les plus petits à gauche, les plus grands à droite — ou entre deux cartes, en disant les signes : « ${n(x)} &lt; ${n(y)} &lt; ${n(z)} ». Le même nombre se pose dessus : =.</li>
        <li>Les autres vérifient. Une carte mal placée revient dans la main, et l'on pioche une carte de plus. Le premier qui n'a plus de cartes a gagné.</li>
      </ol>
    </div>
    <div class="cn-jeu-regle">
      <b>Le nombre caché</b><span class="cn-pour">2 joueurs · encadrer</span>
      <ol>
        <li>L'un tire une carte sans la montrer. L'autre propose un nombre ; on lui répond « plus grand » ou « plus petit ».</li>
        <li>Il écrit à chaque fois ce qu'il sait : ${e.cadres[0]}, puis ${e.cadres[1]}… jusqu'à le trouver. Moins de questions, mieux c'est.</li>
      </ol>
    </div>
    <p class="cn-verifier"><b>Pour vérifier :</b> ${verifier}</p>`;
}

const SOURCES: Record<1 | 2 | 3, string> = {
  1: "D'après le programme de l'école maternelle (2025), « Découvrir les nombres », et le guide « Pour enseigner la construction du nombre à l'école maternelle » (Éduscol).",
  2: "D'après le programme de mathématiques du cycle 2 (2024) et le guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol).",
  3: "D'après le programme de mathématiques du cycle 3 (2024).",
};

function pageDeRegle(niv: Niveau, titre: string): string {
  return `<div class="page cn-regle">
    <div class="titre">${escapeHtml(titre)} — ${escapeHtml(niv.libelle)}</div>
    ${blocDuSavoir(niv)}
    ${niv.cycle === 1 ? regleMaternelle(niv) : regleDesNombres(niv)}
    <p class="cn-source">${SOURCES[niv.cycle]}</p>
  </div>`;
}

function pageDeJeu(titre: string): string {
  const paire = `<div class="cn-paire"><span class="cn-case"></span><span class="cn-rond"></span><span class="cn-case"></span></div>`;
  const file = `<div class="cn-file">${Array.from({ length: 6 }, () => `<span class="cn-case"></span>`).join(`<span class="cn-signe-file">&lt;</span>`)}</div>`;
  const cadre = `<div class="cn-cadre"><span class="cn-case"></span><span class="cn-signe-file">&lt;</span><span class="cn-cache">?</span><span class="cn-signe-file">&lt;</span><span class="cn-case"></span></div>`;
  return `<div class="page cn-feuille-jeu">
    <div class="titre">Ma feuille de jeu — ${escapeHtml(titre.toLowerCase())}</div>
    <div class="cn-nom">Prénom : ........................................ Date : ........................</div>
    <h3>La bataille des nombres</h3>
    <p class="cn-consigne">J'écris en chiffres le nombre de chaque carte, et le signe qui convient : &lt;, &gt; ou =.</p>
    <div class="cn-paires">${Array.from({ length: 8 }, () => paire).join("")}</div>
    <h3>La file des nombres</h3>
    <p class="cn-consigne">Je recopie la file, du plus petit au plus grand.</p>
    ${file}${file}
    <h3>Le nombre caché</h3>
    <p class="cn-consigne">J'écris ce que je sais du nombre caché.</p>
    <div class="cn-cadres">${Array.from({ length: 4 }, () => cadre).join("")}</div>
  </div>`;
}

/** Les signes et la feuille de jeu s'impriment à partir du CP : la maternelle compare avec des mots. */
export const avecLesSignes = (niv: Niveau) => niv.cycle > 1;

export function htmlComparer(cartes: CarteNombre[], r: ReglagesComparer): string {
  const niv = niveauDe(r);
  const titre = r.titre.trim() || REGLAGES_COMPARER.titre;
  const format = r.grandes ? { colonnes: 3, lignes: 4 } : { colonnes: 4, lignes: 5 };
  const u = r.grandes ? 2.6 : 2.4;
  const entete = (quoi: string) => `<div class="titre">${escapeHtml(titre)} — ${quoi}</div>`;
  const faces = cartes.map((c) => `<div class="carte">${faceDeCarte(c, niv, u)}</div>`);
  const signes = SIGNES.flatMap((s) => Array.from({ length: 4 }, () =>
    `<div class="carte"><div class="cn-signe">${escapeHtml(s.signe)}</div><div class="cn-lecture">${s.lecture}</div></div>`));
  const symboles = avecLesSignes(niv);
  return feuille(
    (r.regle ? pageDeRegle(niv, titre) : "")
    + pagesDeCartes(faces, format, entete(`les cartes, à découper (${escapeHtml(niv.libelle)})`))
    + (symboles && r.signes ? pagesDeCartes(signes, { colonnes: 3, lignes: 4 }, entete("les signes, à découper")) : "")
    + (symboles && r.feuilleDeJeu ? pageDeJeu(titre) : ""),
    `cn${r.grandes ? " cn-grandes" : ""}`,
  );
}

export const STYLE_COMPARER = `
  .feuille.cn .carte { gap: 1.5mm; padding: 2.5mm; }
  .feuille.cn .cn-chiffres { font-size: 44px; font-weight: 800; line-height: 1; white-space: nowrap; }
  .feuille.cn .cn-chiffres.cn-t2 { font-size: 32px; }
  .feuille.cn .cn-chiffres.cn-t3 { font-size: 22px; }
  .feuille.cn .cn-chiffres.cn-t4 { font-size: 18px; }
  .feuille.cn .cn-unites { font-size: 27px; font-weight: 800; line-height: 1.1; white-space: nowrap; }
  .feuille.cn .cn-long { font-size: 17px; font-weight: 800; line-height: 1.25; overflow-wrap: anywhere; }
  .feuille.cn .cn-lettres { font-size: 17px; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .feuille.cn .cn-cubes { max-width: 100%; }
  .feuille.cn .cn-cubes svg { display: block; max-width: 100%; height: auto; }
  .feuille.cn .cn-visuel { width: 100%; display: flex; justify-content: center; }
  .feuille.cn .cn-visuel svg { display: block; width: 26mm; max-width: 100%; height: auto; }
  .feuille.cn .cn-visuel svg.cl-deux { width: 36mm; }
  .feuille.cn .cn-visuel.cn-boite svg { width: 30mm; }
  .feuille.cn .cn-fractions { display: inline-flex; align-items: center; gap: 1.5mm; font-size: 26px; font-weight: 800; }
  .feuille.cn .cn-fractions.cn-somme { font-size: 18px; flex-wrap: wrap; justify-content: center; }
  .feuille.cn .cn-frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.05; }
  .feuille.cn .cn-frac > span:first-child { border-bottom: 2px solid #1c2233; padding: 0 1mm; }
  .feuille.cn .cn-plus { font-weight: 800; }
  .feuille.cn.cn-grandes .cn-chiffres { font-size: 58px; }
  .feuille.cn.cn-grandes .cn-chiffres.cn-t2 { font-size: 42px; }
  .feuille.cn.cn-grandes .cn-chiffres.cn-t3 { font-size: 29px; }
  .feuille.cn.cn-grandes .cn-chiffres.cn-t4 { font-size: 24px; }
  .feuille.cn.cn-grandes .cn-unites { font-size: 34px; }
  .feuille.cn.cn-grandes .cn-lettres, .feuille.cn.cn-grandes .cn-long { font-size: 21px; }
  .feuille.cn.cn-grandes .cn-visuel svg { width: 34mm; }
  .feuille.cn.cn-grandes .cn-visuel svg.cl-deux { width: 46mm; }
  .feuille.cn .cn-signe { font-size: 72px; font-weight: 800; line-height: 1; }
  .feuille.cn .cn-lecture { font-size: 14px; font-weight: 700; color: #444; }
  .feuille.cn .cn-savoir { border: 2px solid #1c2233; border-radius: 4mm; padding: 4mm 5mm; margin: 0 0 5mm; text-align: center; }
  .feuille.cn .cn-savoir-titre { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #687087; }
  .feuille.cn .cn-savoir-dessins { display: flex; justify-content: center; align-items: flex-end; gap: 16mm; margin: 3mm 0 2mm; }
  .feuille.cn .cn-savoir-nombre { display: flex; flex-direction: column; align-items: center; gap: 2mm; font-size: 13px; font-weight: 600; }
  .feuille.cn .cn-savoir-nombre svg { display: block; }
  .feuille.cn .cn-savoir-visuel svg { width: 30mm; height: auto; }
  .feuille.cn .cn-savoir-visuel svg.cl-deux { width: 42mm; }
  .feuille.cn .cn-savoir-chiffre { font-size: 30px; font-weight: 800; }
  .feuille.cn .cn-savoir-signes { font-size: 34px; font-weight: 800; margin: 1mm 0; }
  .feuille.cn .cn-savoir p { font-size: 15px; font-weight: 600; margin: 1mm 0 0; line-height: 1.4; }
  .feuille.cn .cn-jeu-regle { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 3mm; background: #f7f8fc;
    font-size: 13px; line-height: 1.45; break-inside: avoid; page-break-inside: avoid; }
  .feuille.cn .cn-jeu-regle b { font-size: 15px; }
  .feuille.cn .cn-pour { margin-left: 3mm; color: #687087; font-size: 12px; }
  .feuille.cn .cn-jeu-regle ol { margin: 1.5mm 0 0; padding-left: 6mm; }
  .feuille.cn .cn-jeu-regle li { margin: 0.8mm 0; }
  .feuille.cn .cn-verifier { font-size: 13px; margin: 3mm 0 1mm; }
  .feuille.cn .cn-source { font-size: 10.5px; color: #687087; margin: 2mm 0 0; }
  .feuille.cn .cn-nom { font-size: 13px; color: #444; margin: 0 0 3mm; }
  .feuille.cn .cn-feuille-jeu h3 { font-size: 16px; margin: 6mm 0 1mm; }
  .feuille.cn .cn-consigne { font-size: 13px; margin: 0 0 3mm; color: #1c2233; }
  .feuille.cn .cn-case { display: inline-block; width: 16mm; height: 12mm; border: 1.5px solid #1c2233; border-radius: 2mm; background: #fff; }
  .feuille.cn .cn-rond { display: inline-block; width: 10mm; height: 10mm; border: 1.5px solid #1c2233; border-radius: 50%; }
  .feuille.cn .cn-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
  .feuille.cn .cn-paire, .feuille.cn .cn-cadre { display: flex; align-items: center; gap: 3mm; }
  .feuille.cn .cn-file { display: flex; align-items: center; gap: 1.5mm; margin: 0 0 4mm; }
  .feuille.cn .cn-file .cn-case { width: 19mm; }
  .feuille.cn .cn-signe-file { font-size: 22px; font-weight: 800; }
  .feuille.cn .cn-cache { font-size: 24px; font-weight: 800; width: 10mm; text-align: center; }
  .feuille.cn .cn-cadres { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
`;
