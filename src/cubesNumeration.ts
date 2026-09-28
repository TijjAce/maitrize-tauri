// Les nombres en cubes : le matériel de numération à convertir.
//
// Le matériel multibase — cube unité, barre de dix, plaque de cent, gros cube
// de mille — donne à voir ce que vaut chaque chiffre selon sa place. Le guide
// « Pour enseigner les nombres, le calcul et la résolution de problèmes au
// CP » (Éduscol 2020) et le livret Mathématiques CP (2025) font passer de ce
// matériel à l'écriture chiffrée, et retour, les groupements par dix comme
// fil conducteur.
//
// Ici, une feuille d'exercices : l'élève lit les cubes et écrit le nombre —
// en chiffres, en unités de numération (3c 2d 5u), en décomposition additive
// ou en lettres — ; ou il lit le nombre et dessine les cubes ; ou il relie
// des dessins aux nombres. Chaque groupement a sa couleur, au choix de
// l'enseignant, pour que l'œil trie avant de compter.
//
// Les dessins sont du SVG en millimètres : la même feuille à l'écran et sur
// le papier, sans dépendre d'images.

import { escapeHtml } from "./print";
import { hasard, melanger, piocher } from "./hasard";
import { feuille } from "./cartesImprimables";
import { nombreEnLettres } from "./nombresEnLettres";

// ── Ce qui se règle ────────────────────────────────────────────────────────

/** Un groupement du matériel : unité, dizaine, centaine, millier. */
export type Groupement = "u" | "d" | "c" | "m";
export const GROUPEMENTS: { id: Groupement; nom: string; valeur: number }[] = [
  { id: "m", nom: "milliers", valeur: 1000 },
  { id: "c", nom: "centaines", valeur: 100 },
  { id: "d", nom: "dizaines", valeur: 10 },
  { id: "u", nom: "unités", valeur: 1 },
];

export type EcritureNombre = "chiffres" | "unites" | "additive" | "lettres";
export const ECRITURES: { id: EcritureNombre; libelle: string; exemple: string }[] = [
  { id: "chiffres", libelle: "en chiffres", exemple: "325" },
  { id: "unites", libelle: "en unités de numération", exemple: "3c 2d 5u" },
  { id: "additive", libelle: "en décomposition", exemple: "300 + 20 + 5" },
  { id: "lettres", libelle: "en lettres", exemple: "trois cent vingt-cinq" },
];

export type ExerciceCubes = "ecrire" | "dessiner" | "relier";
export const EXERCICES: { id: ExerciceCubes; libelle: string; consigne: string }[] = [
  { id: "ecrire", libelle: "Lire les cubes, écrire le nombre", consigne: "Compte les cubes et écris le nombre." },
  { id: "dessiner", libelle: "Lire le nombre, dessiner les cubes", consigne: "Dessine les cubes qui font ce nombre." },
  { id: "relier", libelle: "Relier les cubes au nombre", consigne: "Relie chaque dessin au nombre qu'il représente." },
];

/** Les couleurs qu'on peut donner aux cubes ; « blanc » pour une impression sans couleur. */
export const PALETTE_CUBES: { nom: string; hex: string }[] = [
  { nom: "jaune", hex: "#ffe14d" }, { nom: "orange", hex: "#ff9f1a" }, { nom: "rouge", hex: "#e8402f" },
  { nom: "rose", hex: "#f28ab2" }, { nom: "violet", hex: "#9b6bdc" }, { nom: "bleu", hex: "#2454e6" },
  { nom: "bleu clair", hex: "#5ec8f2" }, { nom: "vert", hex: "#62d93a" }, { nom: "vert foncé", hex: "#1f9a48" },
  { nom: "marron", hex: "#a8704a" }, { nom: "gris", hex: "#b9bdc7" }, { nom: "blanc", hex: "#ffffff" },
];

export type CouleursCubes = Record<Groupement, string>;

/** Les bornes proposées : on ne tape pas un nombre, on choisit un ordre de grandeur. */
export const PLANCHERS = [1, 10, 100, 1000] as const;
export const PLAFONDS = [9, 19, 99, 999, 9999] as const;
export const EXERCICES_MAX = 12;

export interface ReglagesCubes {
  titre: string;
  exercice: ExerciceCubes;
  /** Les nombres se tirent entre `de` et `a`, bornes comprises. */
  de: number;
  a: number;
  /** Combien d'exercices sur la feuille. */
  nombre: number;
  /** Les écritures demandées (écrire) ou données (dessiner, relier). */
  ecritures: EcritureNombre[];
  couleurs: CouleursCubes;
  /** Garder les nombres qui ont un zéro (30, 105) : les plus difficiles à lire. */
  zeros: boolean;
  legende: boolean;
  corrige: boolean;
  /** Le numéro de chaque exercice dans son coin ; on peut s'en passer. */
  numeros: boolean;
}

export const REGLAGES_CUBES: ReglagesCubes = {
  titre: "Les nombres en cubes", exercice: "ecrire", de: 10, a: 99, nombre: 6, ecritures: ["chiffres"],
  // Les couleurs du matériel le plus répandu : le jaune des unités, le vert
  // des barres, le bleu des plaques, le rouge du gros cube.
  couleurs: { u: "#ffe14d", d: "#62d93a", c: "#2454e6", m: "#e8402f" },
  zeros: true, legende: true, corrige: false, numeros: true,
};

/** Le numéro d'un exercice, dans son coin — ou rien. */
const numero = (r: ReglagesCubes, i: number) => (r.numeros !== false ? `<span class="cu-num">${i + 1}</span>` : "");

// ── Le nombre et ses écritures ─────────────────────────────────────────────

/** Combien de cubes de chaque sorte : 2 305 → 2 milliers, 3 centaines, 0 dizaine, 5 unités. */
export function decomposer(n: number): Record<Groupement, number> {
  const entier = Math.max(0, Math.floor(n));
  return { m: Math.floor(entier / 1000), c: Math.floor(entier / 100) % 10, d: Math.floor(entier / 10) % 10, u: entier % 10 };
}

/** Les groupements qu'un nombre au plus égal à `a` peut contenir, du plus grand au plus petit. */
export const groupementsJusqua = (a: number) => GROUPEMENTS.filter((g) => g.valeur <= Math.max(1, a));

/** « 2 305 » : l'espace fine tous les trois chiffres, comme à l'école. */
export const enChiffres = (n: number) =>
  n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, "0")}` : String(n);

/** Le nombre dans l'écriture demandée. */
export function ecrireNombre(n: number, ecriture: EcritureNombre): string {
  const parts = decomposer(n);
  switch (ecriture) {
    case "chiffres":
      return enChiffres(n);
    case "unites": {
      // Du plus grand groupement présent jusqu'aux unités, zéros compris :
      // 305 → « 3c 0d 5u », la dizaine vide s'écrit, c'est elle qui piège.
      const depuis = GROUPEMENTS.findIndex((g) => parts[g.id] > 0);
      const utiles = depuis < 0 ? GROUPEMENTS.slice(-1) : GROUPEMENTS.slice(depuis);
      return utiles.map((g) => `${parts[g.id]}${g.id}`).join(" ");
    }
    case "additive": {
      const termes = GROUPEMENTS.filter((g) => parts[g.id] > 0).map((g) => enChiffres(parts[g.id] * g.valeur));
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
}

/** Les écritures retenues ; sans choix, les chiffres. */
export const ecrituresChoisies = (r: ReglagesCubes): EcritureNombre[] =>
  r.ecritures.length ? r.ecritures : ["chiffres"];

/** Les bornes mises d'aplomb : `de` ne dépasse pas `a`. */
export function bornes(r: ReglagesCubes): [number, number] {
  const a = Math.max(1, Math.floor(r.a));
  const de = Math.min(Math.max(1, Math.floor(r.de)), a);
  return [de, a];
}

/**
 * Les nombres de la feuille.
 *
 * Tous différents tant que l'intervalle le permet ; sans zéro quand on l'a
 * demandé, et si cela vide l'intervalle (de 10 à 10), on repasse sur tout.
 */
export function tirerNombres(r: ReglagesCubes, h: () => number): number[] {
  const [de, a] = bornes(r);
  const combien = Math.max(1, Math.min(EXERCICES_MAX, Math.floor(r.nombre) || 1));
  const tous = Array.from({ length: a - de + 1 }, (_, i) => de + i);
  const filtres = r.zeros ? tous : tous.filter((n) => !String(n).includes("0"));
  const vivier = filtres.length ? filtres : tous;
  if (vivier.length >= combien) return piocher(h, vivier, combien);
  return Array.from({ length: combien }, () => vivier[Math.floor(h() * vivier.length)]);
}

/** La feuille tirée : ses nombres, et l'écriture montrée pour chacun. */
export function exercicesCubes(r: ReglagesCubes, graine: number): ExerciceCube[] {
  const h = hasard(graine);
  const ecritures = ecrituresChoisies(r);
  return tirerNombres(r, h).map((n) => ({ n, ecriture: ecritures[Math.floor(h() * ecritures.length)] }));
}

// ── Les dessins ────────────────────────────────────────────────────────────

/** La taille du petit cube, en millimètres : plus les nombres sont grands, plus il rapetisse. */
export function taille(a: number): number {
  return a < 100 ? 2.4 : a < 1000 ? 1.5 : 1.3;
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

/** Combien de pièces par rangée : les plaques et les gros cubes se rangent en carré, les barres côte à côte. */
function colonnes(g: Groupement, combien: number): number {
  if (g === "d") return combien;
  if (g === "u") return Math.min(3, combien);
  return combien <= 1 ? 1 : combien <= 4 ? 2 : 3;
}

export interface Dessin { svg: string; largeur: number; hauteur: number }

/**
 * Le nombre en cubes : ses groupements côte à côte, du plus grand au plus
 * petit, posés sur une même ligne de base comme sur la table.
 */
export function dessinerCubes(n: number, u: number, couleurs: CouleursCubes): Dessin {
  const parts = decomposer(n);
  const ecartGroupes = 2.5 * u;
  type Groupe = { g: Groupement; largeur: number; hauteur: number; positions: [number, number][] };
  const groupes: Groupe[] = [];
  for (const { id: g } of GROUPEMENTS) {
    const combien = parts[g];
    if (!combien) continue;
    const [pl, ph] = DIMENSIONS[g];
    const ecart = g === "u" || g === "d" ? 0.4 * u : 0.6 * u;
    const cols = colonnes(g, combien);
    const positions: [number, number][] = [];
    for (let i = 0; i < combien; i++) positions.push([(i % cols) * (pl * u + ecart), Math.floor(i / cols) * (ph * u + ecart)]);
    const rangees = Math.ceil(combien / cols);
    groupes.push({ g, positions, largeur: cols * pl * u + (cols - 1) * ecart, hauteur: rangees * ph * u + (rangees - 1) * ecart });
  }
  const hauteur = Math.max(u, ...groupes.map((x) => x.hauteur));
  const largeur = Math.max(u, groupes.reduce((s, x) => s + x.largeur, 0) + Math.max(0, groupes.length - 1) * ecartGroupes);
  let x = 0;
  const corps = groupes.map((gr) => {
    const y0 = hauteur - gr.hauteur;
    const pieces = gr.positions.map(([dx, dy]) => piece(gr.g, x + dx, y0 + dy, u, couleurs[gr.g])).join("");
    x += gr.largeur + ecartGroupes;
    return pieces;
  }).join("");
  const marge = 0.3; // le trait du bord ne doit pas être rogné
  const L = f(largeur + 2 * marge), H = f(hauteur + 2 * marge);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="${-marge} ${-marge} ${L} ${H}" role="img" aria-label="${n} en cubes">${corps}</svg>`,
    largeur: L, hauteur: H,
  };
}

// ── La feuille ─────────────────────────────────────────────────────────────

const consigneDe = (r: ReglagesCubes) => EXERCICES.find((e) => e.id === r.exercice)?.consigne ?? "";

/** Les cases à remplir pour une écriture : le nombre, les unités de numération, la somme, la ligne. */
function reponse(ecriture: EcritureNombre, a: number): string {
  const groupes = groupementsJusqua(a);
  switch (ecriture) {
    case "chiffres":
      return `<div class="cu-rep"><span class="cu-lib">En chiffres :</span><span class="cu-case cu-large"></span></div>`;
    case "unites":
      return `<div class="cu-rep"><span class="cu-lib">En unités :</span>${groupes.map((g) => `<span class="cu-case"></span><span class="cu-unite">${g.id}</span>`).join("")}</div>`;
    case "additive":
      return `<div class="cu-rep"><span class="cu-lib">Décomposition :</span>${groupes.map((_, i) => `${i ? `<span class="cu-plus">+</span>` : ""}<span class="cu-case cu-moyen"></span>`).join("")}</div>`;
    case "lettres":
      return `<div class="cu-rep"><span class="cu-lib">En lettres :</span><span class="cu-trait"></span></div>`;
  }
}

/** La légende : chaque pièce et ce qu'elle vaut, pour les groupements en jeu. */
function legende(a: number, couleurs: CouleursCubes): string {
  const u = 1.1;
  const items = [...groupementsJusqua(a)].reverse().map((g) => {
    const [pl, ph] = DIMENSIONS[g.id];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(pl * u + 0.6)}mm" height="${f(ph * u + 0.6)}mm" viewBox="-0.3 -0.3 ${f(pl * u + 0.6)} ${f(ph * u + 0.6)}">${piece(g.id, 0, 0, u, couleurs[g.id])}</svg>`;
    return `<span class="cu-item">${svg}= ${enChiffres(g.valeur)}</span>`;
  });
  return `<div class="cu-legende">${items.join("")}</div>`;
}

const rangees = <T,>(liste: T[], parRangee: number): T[][] => {
  const sortie: T[][] = [];
  for (let i = 0; i < liste.length; i += parRangee) sortie.push(liste.slice(i, i + parRangee));
  return sortie;
};

const grille = (cellules: string[], parRangee: number, classe = "") =>
  `<table class="cu-grille ${classe}">${rangees(cellules, parRangee).map((r) =>
    `<tr>${r.map((c) => `<td>${c}</td>`).join("")}${r.length < parRangee ? `<td></td>`.repeat(parRangee - r.length) : ""}</tr>`).join("")}</table>`;

/** Écrire : les cubes, puis les cases de chaque écriture demandée. */
function exercicesEcrire(exos: ExerciceCube[], r: ReglagesCubes, a: number, u: number): string {
  const ecritures = ecrituresChoisies(r);
  const cellules = exos.map((e, i) => {
    const d = dessinerCubes(e.n, u, r.couleurs);
    return `<div class="cu-exo">${numero(r, i)}<div class="cu-cubes">${d.svg}</div>${ecritures.map((x) => reponse(x, a)).join("")}</div>`;
  });
  return grille(cellules, a < 1000 ? 2 : 1);
}

/** Dessiner : le nombre écrit, et un cadre de la taille du plus grand dessin possible. */
function exercicesDessiner(exos: ExerciceCube[], r: ReglagesCubes, a: number, u: number): string {
  const plusGrand = dessinerCubes(a, u, r.couleurs);
  const cadre = { largeur: Math.max(30, plusGrand.largeur), hauteur: Math.max(16, plusGrand.hauteur + 4) };
  const cellules = exos.map((e, i) =>
    `<div class="cu-exo">${numero(r, i)}<div class="cu-nombre">${escapeHtml(ecrireNombre(e.n, e.ecriture))}</div>`
    + `<div class="cu-cadre" style="height:${f(cadre.hauteur)}mm"></div></div>`);
  return grille(cellules, cadre.largeur > 85 ? 1 : 2);
}

/** Relier : les dessins à gauche dans l'ordre, les nombres à droite mélangés. */
function exercicesRelier(exos: ExerciceCube[], r: ReglagesCubes, u: number, h: () => number): string {
  const ordre = exos.map((_, i) => i);
  let melange = melanger(h, ordre);
  // Une colonne de droite dans le même ordre que la gauche ne fait rien relier.
  if (exos.length > 1 && melange.every((v, i) => v === i)) melange = [...melange.slice(1), melange[0]];
  const lignes = exos.map((e, i) => {
    const d = dessinerCubes(e.n, u, r.couleurs);
    const droite = exos[melange[i]];
    return `<tr><td class="cu-r-cubes"><div class="cu-cubes">${d.svg}</div></td>`
      + `<td class="cu-r-point"><span class="cu-point"></span></td><td class="cu-r-point"><span class="cu-point"></span></td>`
      + `<td class="cu-r-nombre"><span class="cu-relie-nombre">${escapeHtml(ecrireNombre(droite.n, droite.ecriture))}</span></td></tr>`;
  });
  return `<table class="cu-grille cu-relier">${lignes.join("")}</table>`;
}

/** Le corrigé : chaque nombre sous ses quatre écritures. */
function corrige(exos: ExerciceCube[], titre: string): string {
  // La liste numérote elle-même : le numéro est celui de l'exercice.
  const lignes = exos.map((e) => `<li>${ECRITURES.map((x) => escapeHtml(ecrireNombre(e.n, x.id))).join(" · ")}</li>`);
  return `<div class="page cu-corrige"><div class="titre">Corrigé${titre ? ` · ${escapeHtml(titre)}` : ""}</div><ol>${lignes.join("")}</ol></div>`;
}

export function htmlCubes(exos: ExerciceCube[], r: ReglagesCubes, graine = 1): string {
  const [, a] = bornes(r);
  const u = taille(a);
  const titre = r.titre.trim() || REGLAGES_CUBES.titre;
  const corps = r.exercice === "ecrire" ? exercicesEcrire(exos, r, a, u)
    : r.exercice === "dessiner" ? exercicesDessiner(exos, r, a, u)
    : exercicesRelier(exos, r, u, hasard(graine + 1));
  const page = `<div class="page"><div class="titre">${escapeHtml(titre)}</div>`
    + `<div class="cu-nom">Prénom : ........................................ Date : ........................</div>`
    + `<div class="sous cu-consigne">${escapeHtml(consigneDe(r))}</div>`
    + (r.legende ? legende(a, r.couleurs) : "")
    + corps + `</div>`;
  return feuille(page + (r.corrige ? corrige(exos, titre) : ""), "cu");
}

export const STYLE_CUBES = `
  .feuille.cu .cu-nom { font-size: 13px; color: #444; margin: 0 0 2mm; }
  .feuille.cu .cu-consigne { font-size: 14px; color: #1c2233; font-weight: 600; }
  .feuille.cu .cu-legende { display: flex; gap: 7mm; align-items: flex-end; flex-wrap: wrap; font-size: 12px; margin: 0 0 4mm;
    padding: 2mm 3mm; border: 1px solid #cfd4e2; border-radius: 3mm; }
  .feuille.cu .cu-item { display: inline-flex; align-items: flex-end; gap: 1.5mm; }
  .feuille.cu .cu-item svg { display: block; }
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
  .feuille.cu .cu-cadre { border: 1.5px dashed #9aa0b4; border-radius: 3mm; }
  .feuille.cu table.cu-relier { border-spacing: 0 3mm; }
  .feuille.cu table.cu-relier td { vertical-align: middle; }
  .feuille.cu table.cu-relier .cu-r-cubes { width: 50%; }
  .feuille.cu table.cu-relier .cu-r-point { width: 12%; text-align: center; }
  .feuille.cu table.cu-relier .cu-r-nombre { width: 26%; text-align: left; }
  .feuille.cu .cu-point { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; }
  .feuille.cu .cu-relie-nombre { font-size: 22px; font-weight: 700; }
  .feuille.cu .cu-corrige ol { font-size: 13px; line-height: 1.8; padding-left: 6mm; }
`;
