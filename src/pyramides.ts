// Pyramides et carrés magiques : du calcul réfléchi, à compléter.
//
// La pyramide additive : chaque brique est la somme des deux briques du
// dessous. Base donnée, on additionne en montant ; briques mêlées, on
// ajoute et on retranche, dans l'ordre qu'on trouve. Le carré magique :
// chaque ligne, chaque colonne et les deux diagonales font la même somme,
// et l'on cherche les nombres qui manquent. Les deux se corrigent seuls :
// chaque case n'a qu'une valeur possible, et c'est vérifié avant d'imprimer.

import { feuille } from "./cartesImprimables";
import { hasard, piocher } from "./hasard";
import { entier, fr } from "./nombres";

export type FormeCalcul = "pyramide" | "carre";

export interface ReglagesPyramides {
  forme: FormeCalcul;
  /** Les étages de la pyramide : trois à six briques à la base. */
  etages: number;
  taille: 3 | 4;
  combien: number;
  /** Le plus grand nombre de la base, ou du carré. */
  jusqua: number;
  trous: "bas" | "meles";
}
export const REGLAGES_PYRAMIDES: ReglagesPyramides = { forme: "pyramide", etages: 4, taille: 3, combien: 6, jusqua: 10, trous: "bas" };

/** `lignes[0]` est la base ; chaque brique du dessus est la somme des deux d'en dessous. */
export interface Pyramide { lignes: number[][]; donnees: boolean[][] }

/** Vrai si, de brique connue en brique connue, on retrouve toute la pyramide. */
export function resoluble(p: Pyramide): boolean {
  const connu = p.donnees.map((l) => [...l]);
  let progres = true;
  while (progres) {
    progres = false;
    for (let k = 1; k < connu.length; k++) for (let i = 0; i < connu[k].length; i++) {
      // Une brique vient de ses deux dessous ; un dessous, de la brique et de l'autre dessous.
      const trio: [number, number][] = [[k, i], [k - 1, i], [k - 1, i + 1]];
      const inconnues = trio.filter(([a, b]) => !connu[a][b]);
      if (inconnues.length === 1) { connu[inconnues[0][0]][inconnues[0][1]] = true; progres = true; }
    }
  }
  return connu.every((l) => l.every(Boolean));
}

export function pyramide(etages: number, jusqua: number, trous: "bas" | "meles", alea: () => number): Pyramide {
  const n = Math.max(2, Math.min(6, etages));
  const lignes = [Array.from({ length: n }, () => entier(alea, 1, Math.max(1, jusqua)))];
  for (let k = 1; k < n; k++) lignes.push(lignes[k - 1].slice(0, -1).map((v, i) => v + lignes[k - 1][i + 1]));
  const baseSeule = () => lignes.map((l, k) => l.map(() => k === 0));
  if (trous === "bas") return { lignes, donnees: baseSeule() };
  // Briques mêlées : autant de briques données que d'étages, tirées au sort jusqu'à ce qu'elles suffisent.
  const toutes = lignes.flatMap((l, k) => l.map((_, i) => [k, i] as const));
  for (let essai = 0; essai < 300; essai++) {
    const donnees = lignes.map((l) => l.map(() => false));
    for (const [k, i] of piocher(alea, toutes, n)) donnees[k][i] = true;
    if (resoluble({ lignes, donnees })) return { lignes, donnees };
  }
  return { lignes, donnees: baseSeule() };
}

// ── Carrés magiques ───────────────────────────────────────────────────────

export interface Carre { grille: number[][]; donnees: boolean[][]; somme: number }

const LO_SHU = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
const DURER = [[16, 3, 2, 13], [5, 10, 11, 8], [9, 6, 7, 12], [4, 15, 14, 1]];

const tourner = (m: number[][]) => m[0].map((_, j) => m.map((l) => l[j]).reverse());

/** Le même carré, tourné ou retourné : huit carrés pour le prix d'un. */
function symetrie(m: number[][], alea: () => number): number[][] {
  let s = m.map((l) => [...l]);
  for (let t = entier(alea, 0, 3); t > 0; t--) s = tourner(s);
  return alea() < 0.5 ? s.map((l) => [...l].reverse()) : s;
}

const cases = (n: number): [number, number][] => Array.from({ length: n * n }, (_, k) => [Math.floor(k / n), k % n]);

/** Vrai si chaque ligne, colonne ou diagonale à une seule inconnue finit par tout livrer. */
export function carreResoluble(donnees: boolean[][]): boolean {
  const n = donnees.length;
  const connu = donnees.map((l) => [...l]);
  const lignes: [number, number][][] = [];
  for (let i = 0; i < n; i++) {
    lignes.push(Array.from({ length: n }, (_, j) => [i, j] as [number, number]));
    lignes.push(Array.from({ length: n }, (_, j) => [j, i] as [number, number]));
  }
  lignes.push(Array.from({ length: n }, (_, i) => [i, i] as [number, number]));
  lignes.push(Array.from({ length: n }, (_, i) => [i, n - 1 - i] as [number, number]));
  let progres = true;
  while (progres) {
    progres = false;
    for (const l of lignes) {
      const inconnues = l.filter(([i, j]) => !connu[i][j]);
      if (inconnues.length === 1) { connu[inconnues[0][0]][inconnues[0][1]] = true; progres = true; }
    }
  }
  return connu.every((l) => l.every(Boolean));
}

export function carreMagique(taille: 3 | 4, jusqua: number, alea: () => number): Carre {
  const base = symetrie(taille === 3 ? LO_SHU : DURER, alea);
  const max = taille * taille;
  const plafond = Math.max(jusqua, max);
  // Un carré magique le reste quand on multiplie tout par k et qu'on ajoute c.
  const k = entier(alea, 1, Math.max(1, Math.floor(plafond / max)));
  const c = entier(alea, 0, Math.max(0, plafond - k * max));
  const grille = base.map((l) => l.map((v) => k * v + c));
  const somme = grille[0].reduce((a, b) => a + b, 0);
  // Au-delà, une ligne à une seule inconnue ne se trouve plus : neuf trous sur seize ne se bouchent jamais ainsi.
  const caches = taille === 3 ? entier(alea, 4, 5) : entier(alea, 6, 8);
  for (let essai = 0; essai < 300; essai++) {
    const donnees = grille.map((l) => l.map(() => true));
    for (const [i, j] of piocher(alea, cases(taille), caches)) donnees[i][j] = false;
    if (carreResoluble(donnees)) return { grille, donnees, somme };
  }
  // La diagonale cachée : une inconnue par ligne, toujours soluble.
  return { grille, donnees: grille.map((l, i) => l.map((_, j) => i !== j)), somme };
}

// ── La feuille ────────────────────────────────────────────────────────────

const brique = (v: number, donnee: boolean, corrige: boolean) =>
  `<span class="py-brique${donnee ? " py-donnee" : corrige ? " py-trouvee" : ""}">${donnee || corrige ? fr(v) : ""}</span>`;

const dessinPyramide = (p: Pyramide, corrige: boolean) =>
  `<div class="py-pyr">${[...p.lignes].map((l, k) => ({ l, k })).reverse().map(({ l, k }) =>
    `<div class="py-ligne">${l.map((v, i) => brique(v, p.donnees[k][i], corrige)).join("")}</div>`).join("")}</div>`;

const dessinCarre = (c: Carre, corrige: boolean) =>
  `<div class="py-pyr"><div class="py-somme">Somme magique : <b>${fr(c.somme)}</b></div><table class="py-carre">${c.grille.map((l, i) =>
    `<tr>${l.map((v, j) => `<td class="${c.donnees[i][j] ? "py-donnee" : corrige ? "py-trouvee" : ""}">${c.donnees[i][j] || corrige ? fr(v) : ""}</td>`).join("")}</tr>`).join("")}</table></div>`;

export function htmlPyramides(r: ReglagesPyramides, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(1, Math.min(12, r.combien));
  if (r.forme === "pyramide") {
    const liste = Array.from({ length: combien }, () => pyramide(r.etages, r.jusqua, r.trous, alea));
    const consigne = r.trous === "bas"
      ? "Chaque brique est la somme des deux briques du dessous. Complète la pyramide en montant."
      : "Chaque brique est la somme des deux briques du dessous. Retrouve les briques qui manquent : parfois on ajoute, parfois on retranche.";
    return feuille(`<div class="page"><div class="titre">Pyramides de nombres</div><div class="regle"><b>La règle</b>${consigne}</div>
      <div class="py-grille">${liste.map((p) => dessinPyramide(p, false)).join("")}</div></div>
      <div class="page corrige"><div class="titre">Pyramides de nombres — corrigé</div><div class="py-grille">${liste.map((p) => dessinPyramide(p, true)).join("")}</div></div>`, "py");
  }
  const liste = Array.from({ length: combien }, () => carreMagique(r.taille, r.jusqua, alea));
  return feuille(`<div class="page"><div class="titre">Carrés magiques</div><div class="regle"><b>La règle</b>Dans un carré magique, chaque ligne, chaque colonne et les deux diagonales font la même somme. Retrouve les nombres qui manquent — commence par une ligne où il n'en manque qu'un.</div>
    <div class="py-grille py-carres">${liste.map((c) => dessinCarre(c, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Carrés magiques — corrigé</div><div class="py-grille py-carres">${liste.map((c) => dessinCarre(c, true)).join("")}</div></div>`, "py");
}

export const STYLE_PYRAMIDES = `
  .feuille.py .py-grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7mm 8mm; margin-top: 4mm; }
  .feuille.py .py-carres { grid-template-columns: repeat(3, 1fr); }
  .feuille.py .py-pyr { display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; }
  .feuille.py .py-ligne { display: flex; }
  .feuille.py .py-brique { width: 14mm; height: 9mm; border: 1.5px solid #1c2233; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; background: #fff; margin: 0 -0.75px -0.75px; }
  .feuille.py .py-donnee { background: #eef0f6; }
  .feuille.py .py-trouvee { color: #c0392b; }
  .feuille.py .py-carre { border-collapse: collapse; }
  .feuille.py .py-carre td { width: 13mm; height: 13mm; border: 1.5px solid #1c2233; text-align: center; font-size: 16px; font-weight: 700; }
  .feuille.py .py-somme { font-size: 11px; color: #687087; margin-bottom: 1.5mm; }
`;
