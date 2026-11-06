// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Les familles d'addition : l'affichage du mur de la classe (demande de
// l'enseignant, 2026-11-01, pour sa séance des nombres jusqu'à 9 : « crée un
// affichage pour la famille d'addition du 7, 8 et 9 »).
//
// La famille d'un nombre, ce sont toutes ses façons de le faire en deux
// parties : 7, c'est 1 et 6, 2 et 5, 3 et 4… Une page par nombre, en maison :
// le nombre sous le toit, une décomposition par étage, et la même dans
// l'autre sens à côté — 3 + 4 et 4 + 3. Les billes sont celles de « Deux tas
// de billes » : bleues pour la première partie, rouges pour la seconde, et
// les chiffres aux mêmes couleurs. Le programme de 2024 veut les tables
// d'addition « dans les deux sens » : l'écriture se choisit, 4 + 3 = 7 ou
// 7 = 4 + 3.
//
// Puis (2026-11-03) : « il me manque un générateur des tables d'addition,
// comme tu avais fait la feuille dans une séquence ; rajoute ensuite outil
// pour l'élève ». L'atelier fait aussi la table d'un nombre — 7 + 1 … 7 + 10 —
// et la table de Pythagore de l'addition, les doubles en couleur ; et chaque
// forme se fait pour le mur, une page chacune, ou pour l'élève : quatre par
// page, à découper et à coller dans le cahier.

import { feuille } from "./cartesImprimables";
import { BILLE_BLEUE, BILLE_ROUGE, bille } from "./numerationCP";
import { escapeHtml } from "./print";

/** Ce qu'on imprime : la maison d'un nombre — ses façons de le faire en deux parties —, sa table, ou la table de Pythagore. */
export type FormeDesTables = "maison" | "table" | "pythagore";
/** Pour le mur, une page chacune ; pour l'élève, quatre par page, à coller dans le cahier. */
export type FormatDesTables = "mur" | "eleve";

export interface ReglagesFamilles {
  /** Les nombres dont on affiche la famille ou la table, de 1 à 10 (la maison, à partir de 2) : une page chacun. */
  nombres: number[];
  /** 0 + 7 et 7 + 0 au premier étage. */
  avecZero: boolean;
  /** « 4 + 3 = 7 », ou « 7 = 4 + 3 ». */
  ecriture: "somme" | "decomposition";
  /** Le titre de chaque page, avant le nombre. */
  titre: string;
  forme: FormeDesTables;
  format: FormatDesTables;
}

export const NOMBRES_DES_FAMILLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
export const NOMBRES_DES_TABLES = [1, ...NOMBRES_DES_FAMILLES];
export const TITRE_DES_FAMILLES = "La famille du";
const TITRE_DES_TABLES = "La table du";
const TITRE_DE_PYTHAGORE = "La table d'addition";
export const REGLAGES_FAMILLES: ReglagesFamilles = { nombres: [7, 8, 9], avecZero: false, ecriture: "somme", titre: TITRE_DES_FAMILLES, forme: "maison", format: "mur" };

/** Des réglages lus de la mémoire, sans leur faire confiance ; sans nombre, ceux de l'exemple. */
export function reglagesFamillesSurs(brut: Partial<ReglagesFamilles> | null | undefined): ReglagesFamilles {
  const b = brut ?? {};
  const forme: FormeDesTables = b.forme === "table" || b.forme === "pythagore" ? b.forme : "maison";
  // La maison d'un nombre commence à 2 : 1 n'a pas de façon de se faire en deux parties.
  const permis = forme === "maison" ? NOMBRES_DES_FAMILLES : NOMBRES_DES_TABLES;
  const nombres = [...new Set((Array.isArray(b.nombres) ? b.nombres : [])
    .filter((n): n is number => typeof n === "number" && permis.includes(n)))].sort((x, y) => x - y);
  return {
    nombres: nombres.length ? nombres : REGLAGES_FAMILLES.nombres,
    avecZero: b.avecZero === true,
    ecriture: b.ecriture === "decomposition" ? "decomposition" : "somme",
    titre: typeof b.titre === "string" && b.titre.trim() ? b.titre.trim() : TITRE_DES_FAMILLES,
    forme,
    format: b.format === "eleve" ? "eleve" : "mur",
  };
}

/** Le titre d'une forme : celui qu'on a écrit, sinon le sien — « La famille du », « La table du », « La table d'addition ». */
const titreDeLaForme = (r: Pick<ReglagesFamilles, "titre" | "forme">) => (r.titre !== TITRE_DES_FAMILLES || r.forme === "maison" ? r.titre
  : r.forme === "table" ? TITRE_DES_TABLES : TITRE_DE_PYTHAGORE);

/** Les étages de la maison : chaque décomposition une fois, la plus petite partie d'abord — 1 et 6, 2 et 5, 3 et 4. */
export function decompositions(n: number, avecZero = false): [number, number][] {
  const sortie: [number, number][] = [];
  for (let a = avecZero ? 0 : 1; a <= n - a; a++) sortie.push([a, n - a]);
  return sortie;
}

/**
 * « La famille du 7 » ; « Les familles du 7, du 8 et du 9 » ; « Les tables du
 * 7 et du 8 » ; « La table d'addition » — un autre titre garde sa forme :
 * « La maison du 7, 8 et 9 ».
 */
export function titreFamilles(r: Pick<ReglagesFamilles, "nombres" | "titre"> & Partial<Pick<ReglagesFamilles, "forme">>): string {
  const forme = r.forme ?? "maison";
  const titre = titreDeLaForme({ titre: r.titre.trim() || TITRE_DES_FAMILLES, forme });
  if (forme === "pythagore") return titre;
  if (r.nombres.length === 1) return `${titre} ${r.nombres[0]}`;
  const liste = (mots: string[]) => `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
  return titre === TITRE_DES_FAMILLES ? `Les familles ${liste(r.nombres.map((n) => `du ${n}`))}`
    : titre === TITRE_DES_TABLES ? `Les tables ${liste(r.nombres.map((n) => `du ${n}`))}`
    : `${titre} ${liste(r.nombres.map(String))}`;
}

const NOIR = "#1c2233";
const n2 = (v: number) => String(Math.round(v * 100) / 100);

/**
 * La maison remplit la page : moins elle a d'étages, plus ils sont hauts, et
 * plus les billes et les chiffres sont gros — ce qui se lit du fond de la
 * classe. Sous le titre et le toit, 186 mm restent aux étages ; une bille ne
 * prend pas plus du tiers d'un étage, et une ligne de billes tient dans les
 * 80 mm d'une case.
 */
const HAUTEUR_DES_ETAGES = 186, LARGEUR_DES_BILLES = 80, ECART = 6;
const mesures = (n: number, etages: number) => {
  const hauteur = HAUTEUR_DES_ETAGES / etages;
  const pas = Math.min(12, (LARGEUR_DES_BILLES - ECART) / Math.max(1, n), (hauteur * 0.3) / 0.8);
  return { pas, ecrit: Math.min(18, hauteur * 0.3) };
};

/** Les billes d'un étage, en une ligne : les bleues, un trait, les rouges. */
function billes(a: number, b: number, pas: number): string {
  const r = pas * 0.4, haut = pas * 0.9;
  const largeur = (a + b) * pas + ECART;
  const rang = (n: number, x0: number, hex: string) => Array.from({ length: n }, (_, i) => bille(x0 + i * pas + pas / 2, haut / 2, r, hex)).join("");
  const trait = a * pas + ECART / 2;
  return `<svg class="fa-billes" viewBox="0 0 ${n2(largeur)} ${n2(haut)}" style="width:${n2(largeur)}mm;height:${n2(haut)}mm">`
    + rang(a, 0, BILLE_BLEUE)
    + `<line x1="${n2(trait)}" y1="0.3" x2="${n2(trait)}" y2="${n2(haut - 0.3)}" stroke="${NOIR}" stroke-width="0.4" stroke-dasharray="1 1"/>`
    + rang(b, a * pas + ECART, BILLE_ROUGE) + "</svg>";
}

/** Une décomposition : ses billes, puis son écriture, chaque partie à la couleur de ses billes. */
function etage(a: number, b: number, n: number, ecriture: ReglagesFamilles["ecriture"], pas: number): string {
  const parties = `<span class="fa-a">${a}</span> + <span class="fa-b">${b}</span>`;
  return `<div class="fa-case">${billes(a, b, pas)}<div class="fa-ecrit">${ecriture === "somme" ? `${parties} = ${n}` : `${n} = ${parties}`}</div></div>`;
}

/** Le toit : ses deux pentes au-dessus des murs, le nombre dessous. */
const toit = (n: number) => `<svg class="fa-toit" viewBox="0 0 180 44" style="width:180mm;height:44mm">`
  + `<path d="M0 44 L90 2 L180 44 Z" fill="#fff4dc"/>`
  + `<polyline points="0,44 90,2 180,44" fill="none" stroke="${NOIR}" stroke-width="1.2" stroke-linejoin="round"/>`
  + `<text x="90" y="38" font-size="30" font-weight="800" text-anchor="middle" fill="${NOIR}">${n}</text></svg>`;

/** La maison d'un nombre : un étage par décomposition, l'autre sens à côté ; le double, seul à son étage. */
function maison(n: number, r: ReglagesFamilles): string {
  const liste = decompositions(n, r.avecZero);
  const { pas, ecrit } = mesures(n, liste.length);
  const etages = liste.map(([a, b]) => (a === b
    ? `<div class="fa-etage fa-double">${etage(a, b, n, r.ecriture, pas)}</div>`
    : `<div class="fa-etage">${etage(a, b, n, r.ecriture, pas)}${etage(b, a, n, r.ecriture, pas)}</div>`)).join("");
  return `<div class="fa-titre">${escapeHtml(r.titre)} ${n}</div>${toit(n)}`
    + `<div class="fa-maison" style="--fa-ecrit:${n2(ecrit)}mm">${etages}</div>`;
}

/** Une écriture, chaque partie à sa couleur : « 7 + 3 = 10 », ou « 10 = 7 + 3 ». */
const ecriture = (a: number, b: number, e: ReglagesFamilles["ecriture"]) => {
  const parties = `<span class="fa-a">${a}</span> + <span class="fa-b">${b}</span>`;
  return e === "somme" ? `${parties} = ${a + b}` : `${a + b} = ${parties}`;
};

/** La table d'un nombre : 7 + 1, 7 + 2… 7 + 10 — 7 + 0 d'abord si on le demande —, une ligne chacun, qui remplissent la page. */
function table(n: number, r: ReglagesFamilles): string {
  const lignes = Array.from({ length: r.avecZero ? 11 : 10 }, (_, i) => i + (r.avecZero ? 0 : 1));
  return `<div class="fa-titre">${escapeHtml(titreDeLaForme(r))} ${n}</div>`
    + `<div class="fa-table" style="--fa-ecrit:${n2(Math.min(14, 200 / lignes.length * 0.55))}mm">`
    + lignes.map((k) => `<div class="fa-ligne">${ecriture(n, k, r.ecriture)}</div>`).join("") + `</div>`;
}

/** La table de Pythagore de l'addition : la première partie en ligne, en bleu, la seconde en colonne, en rouge ; les doubles en couleur. */
function pythagore(r: ReglagesFamilles): string {
  const valeurs = Array.from({ length: r.avecZero ? 11 : 10 }, (_, i) => i + (r.avecZero ? 0 : 1));
  const tete = `<div class="fa-pyth-coin">+</div>` + valeurs.map((b) => `<div class="fa-pyth-tete fa-b">${b}</div>`).join("");
  const lignes = valeurs.map((a) => `<div class="fa-pyth-tete fa-a">${a}</div>`
    + valeurs.map((b) => `<div class="fa-pyth-case${a === b ? " fa-pyth-double" : ""}">${a + b}</div>`).join("")).join("");
  return `<div class="fa-titre">${escapeHtml(titreDeLaForme(r))}</div>`
    + `<div class="fa-pyth" style="grid-template-columns: repeat(${valeurs.length + 1}, 1fr)">${tete}${lignes}</div>`;
}

/** Les pages d'une forme, avant de savoir où elles vont : une par nombre, ou la table de Pythagore seule. */
function contenus(r: ReglagesFamilles): string[] {
  if (r.forme === "pythagore") return [pythagore(r)];
  return r.forme === "table" ? r.nombres.map((n) => table(n, r)) : r.nombres.filter((n) => n >= 2).map((n) => maison(n, r));
}

/**
 * Pour le mur, chacune sur sa page ; pour l'élève, la même en petit, quatre
 * fois sur une planche, à découper le long du pointillé et à coller dans le
 * cahier — une planche pour quatre élèves.
 */
export function htmlFamilles(brut: Partial<ReglagesFamilles>): string {
  const r = reglagesFamillesSurs(brut);
  const pages = contenus(r);
  return feuille(r.format === "eleve"
    ? pages.map((c) => `<div class="page fa-planche">${`<div class="fa-petit"><div class="fa-page">${c}</div></div>`.repeat(4)}</div>`).join("")
    : pages.map((c) => `<div class="page fa-page">${c}</div>`).join(""), "fa");
}

// La page fait la hauteur utile de l'A4 — 269 mm entre les marges de 14 mm, moins la marge du corps du document
// imprimable (28 px en haut et en bas) — et un peu moins, pour ne jamais déborder sur la suivante.
export const STYLE_FAMILLES = `
  .feuille.fa .fa-page { display: flex; flex-direction: column; align-items: center; height: 250mm; box-sizing: border-box; }
  .feuille.fa .fa-titre { font-size: 9mm; font-weight: 800; line-height: 1.2; margin: 0 0 3mm; text-align: center; }
  .feuille.fa .fa-toit { display: block; flex: none; }
  .feuille.fa .fa-maison { width: 180mm; flex: 1; display: flex; flex-direction: column; box-sizing: border-box;
    border: 1.2mm solid ${NOIR}; border-radius: 0 0 2mm 2mm; background: #fff; }
  .feuille.fa .fa-etage { flex: 1; display: grid; grid-template-columns: 1fr 1fr; break-inside: avoid; page-break-inside: avoid; }
  .feuille.fa .fa-etage + .fa-etage { border-top: 0.5mm solid #c9cfdc; }
  .feuille.fa .fa-etage.fa-double { grid-template-columns: 1fr; }
  .feuille.fa .fa-case { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding: 2mm; }
  .feuille.fa .fa-case + .fa-case { border-left: 0.5mm dashed #c9cfdc; }
  .feuille.fa .fa-billes { display: block; }
  .feuille.fa .fa-ecrit { font-size: var(--fa-ecrit, 12mm); font-weight: 800; line-height: 1; white-space: nowrap; color: ${NOIR}; }
  .feuille.fa .fa-a { color: ${BILLE_BLEUE}; }
  .feuille.fa .fa-b { color: ${BILLE_ROUGE}; }
  .feuille.fa .fa-table { width: 150mm; flex: 1; display: flex; flex-direction: column; justify-content: space-around; margin-top: 4mm;
    border: 1.2mm solid ${NOIR}; border-radius: 3mm; padding: 4mm 0; box-sizing: border-box; }
  .feuille.fa .fa-ligne { font-size: var(--fa-ecrit, 12mm); font-weight: 800; line-height: 1; text-align: center; color: ${NOIR}; white-space: nowrap; }
  .feuille.fa .fa-pyth { display: grid; width: 180mm; margin-top: 6mm; border: 0.8mm solid ${NOIR}; }
  .feuille.fa .fa-pyth > div { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 6.5mm; font-weight: 800;
    border: 0.3mm solid #c9cfdc; color: ${NOIR}; }
  .feuille.fa .fa-pyth-coin, .feuille.fa .fa-pyth-tete { background: #f1f3f8; }
  .feuille.fa .fa-pyth-coin { color: #687087 !important; }
  .feuille.fa .fa-pyth-tete.fa-a { color: ${BILLE_BLEUE}; }
  .feuille.fa .fa-pyth-tete.fa-b { color: ${BILLE_ROUGE}; }
  .feuille.fa .fa-pyth-double { background: #fff4dc; }
  /* Pour l'élève : quatre par planche, centrées dans leur pointillé de découpe. Une case fait la moitié des 165 mm utiles de la page : la maison
     et la table de Pythagore, 180 mm au mur, y tiennent à 0,43 avec leurs murs. */
  .feuille.fa .fa-planche { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 250mm; box-sizing: border-box; }
  .feuille.fa .fa-petit { zoom: 0.43; outline: 0.6mm dashed #9aa0b4; outline-offset: -1mm; box-sizing: border-box; overflow: hidden;
    display: flex; align-items: center; justify-content: center; }
  .feuille.fa .fa-petit .fa-page { height: 246mm; }
`;
