// La géométrie plane au cycle 2 : reproduire, compléter, reconnaître, tracer.
//
// Programme de mathématiques du cycle 2 (2024) et Éduscol, « Espace et
// géométrie au cycle 2 » (document d'accompagnement des programmes, 2002) :
// reproduire sur quadrillage, la validation par un calque qu'on superpose ;
// des figures dont les côtés suivent les lignes, puis passent en diagonale par
// les nœuds, puis joignent des nœuds quelconques ; compléter un carré dont un
// côté est tracé, un rectangle dont deux côtés consécutifs le sont ; des
// points alignés à vérifier à la règle ; l'angle droit au gabarit puis à
// l'équerre ; au CE2, les axes de symétrie — « cœur, carreau, cerf-volant,
// rectangle, panneaux routiers, lettres majuscules » — et la figure à
// compléter par symétrie, sur quadrillage ou papier pointé.
//
// Tout se dessine à sa taille réelle, en millimètres : le calque et les
// constructions se vérifient en superposant.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceGeometrie =
  | "reproduire" | "completer" | "symetrie" | "axes" | "trier" | "alignements" | "anglesDroits" | "angles" | "construire" | "cercles";

export const EXERCICES_GEOMETRIE: { id: ExerciceGeometrie; libelle: string }[] = [
  { id: "reproduire", libelle: "Reproduire sur quadrillage ou papier pointé" },
  { id: "completer", libelle: "Compléter un carré, un rectangle" },
  { id: "trier", libelle: "Reconnaître et nommer les figures" },
  { id: "alignements", libelle: "Points alignés et droites (CP, CE1)" },
  { id: "anglesDroits", libelle: "Trouver et coder les angles droits (CE1, CE2)" },
  { id: "angles", libelle: "Angle droit, aigu ou obtus ? (CE1, CE2)" },
  { id: "cercles", libelle: "Tracer des cercles au compas (CE1, CE2)" },
  { id: "construire", libelle: "Programmes de construction (CE2)" },
  { id: "axes", libelle: "Les axes de symétrie (CE2)" },
  { id: "symetrie", libelle: "Compléter par symétrie (CE2)" },
];

/** Le niveau des figures à reproduire : côtés sur les lignes, en diagonale des carreaux, ou d'un nœud quelconque à l'autre. */
export type NiveauReproduction = "lignes" | "diagonales" | "obliques";

export interface ReglagesGeometrie {
  exercice: ExerciceGeometrie;
  classe: Classe;
  /** Le support : papier quadrillé, ou papier pointé. */
  support: "quadrille" | "pointe";
  niveau: NiveauReproduction;
  /** Compléter sur papier uni, la figure inclinée, plutôt que sur quadrillage. */
  uni: boolean;
  combien: number;
}

export const REGLAGES_GEOMETRIE: ReglagesGeometrie = { exercice: "reproduire", classe: "CE1", support: "quadrille", niveau: "lignes", uni: false, combien: 3 };

const NOIR = "#1c2233", ROUGE = "#d33a32", GRIS = "#b9c2d6", BLEU = "#2454e6";
const LETTRES = "ABCDEFGHIJKLMNOP";
const f2 = (x: number) => x.toFixed(2);
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

const SOURCE = `<span style="color:#687087">— Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Espace et géométrie au cycle 2 ».</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

type P = [number, number];

// ── Les quadrillages ──────────────────────────────────────────────────────

/** Un quadrillage — ou un papier pointé — de `cols` × `lignes` carreaux de `pas` millimètres, et ce qu'on y dessine. */
export function grilleSvg(cols: number, lignes: number, pas: number, support: "quadrille" | "pointe", dessin = ""): string {
  const w = cols * pas, h = lignes * pas, m = 1;
  let fond = "";
  if (support === "quadrille") {
    for (let i = 0; i <= cols; i++) fond += `<line x1="${f2(m + i * pas)}" y1="${m}" x2="${f2(m + i * pas)}" y2="${f2(m + h)}" stroke="${GRIS}" stroke-width="0.22"/>`;
    for (let j = 0; j <= lignes; j++) fond += `<line x1="${m}" y1="${f2(m + j * pas)}" x2="${f2(m + w)}" y2="${f2(m + j * pas)}" stroke="${GRIS}" stroke-width="0.22"/>`;
  } else {
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= lignes; j++) fond += `<circle cx="${f2(m + i * pas)}" cy="${f2(m + j * pas)}" r="0.42" fill="#7d869c"/>`;
  }
  return `<svg class="ge-grille" viewBox="0 0 ${f2(w + 2 * m)} ${f2(h + 2 * m)}" width="${f2(w + 2 * m)}mm" height="${f2(h + 2 * m)}mm">${fond}<g transform="translate(${m} ${m})">${dessin}</g></svg>`;
}

/** Des traits sur les nœuds d'un quadrillage : des polygones fermés et des lignes ouvertes. */
const traits = (figure: Figure, pas: number, couleur = NOIR, epaisseur = 0.55) =>
  figure.map((t) => `<path d="${t.points.map(([x, y], i) => `${i ? "L" : "M"}${f2(x * pas)} ${f2(y * pas)}`).join(" ")}${t.ferme ? " Z" : ""}" fill="${t.ferme ? "rgba(36,84,230,0.06)" : "none"}" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linejoin="round"/>`).join("");

export type Figure = { points: P[]; ferme: boolean }[];
const poly = (...points: P[]) => ({ points, ferme: true });
const ligne = (...points: P[]) => ({ points, ferme: false });

/**
 * Les figures à reproduire, sur un quadrillage de 8 × 8 carreaux. D'abord des
 * côtés qui suivent les lignes, et des assemblages de carrés et de rectangles
 * (CP) ; puis des segments qui coupent les lignes aux nœuds, en diagonale
 * (« niveau 1 », CE1) ; puis des nœuds quelconques (« niveau 2 », fin de
 * cycle) — « la reproduction d'un triangle dont aucun côté n'est porté par une
 * ligne du quadrillage est une tâche suffisante en fin de cycle 2 ».
 */
export const FIGURES_A_REPRODUIRE: Record<NiveauReproduction, { nom: string; figure: Figure }[]> = {
  lignes: [
    { nom: "un carré", figure: [poly([2, 2], [6, 2], [6, 6], [2, 6])] },
    { nom: "un rectangle", figure: [poly([1, 2], [7, 2], [7, 5], [1, 5])] },
    { nom: "un L", figure: [poly([1, 1], [3, 1], [3, 5], [6, 5], [6, 7], [1, 7])] },
    { nom: "un T", figure: [poly([1, 1], [7, 1], [7, 3], [5, 3], [5, 7], [3, 7], [3, 3], [1, 3])] },
    { nom: "une croix", figure: [poly([3, 1], [5, 1], [5, 3], [7, 3], [7, 5], [5, 5], [5, 7], [3, 7], [3, 5], [1, 5], [1, 3], [3, 3])] },
    { nom: "un escalier", figure: [poly([1, 7], [1, 5], [3, 5], [3, 3], [5, 3], [5, 1], [7, 1], [7, 7])] },
    { nom: "deux carrés accolés", figure: [poly([1, 2], [4, 2], [4, 5], [1, 5]), poly([4, 2], [7, 2], [7, 5], [4, 5])] },
    { nom: "un carré sur un rectangle", figure: [poly([1, 4], [7, 4], [7, 7], [1, 7]), poly([2, 1], [5, 1], [5, 4], [2, 4])] },
    { nom: "un carré partagé en quatre", figure: [poly([1, 1], [7, 1], [7, 7], [1, 7]), ligne([4, 1], [4, 7]), ligne([1, 4], [7, 4])] },
  ],
  diagonales: [
    { nom: "une maison", figure: [poly([1, 4], [4, 1], [7, 4], [7, 7], [1, 7])] },
    { nom: "un triangle rectangle", figure: [poly([1, 1], [1, 7], [7, 7])] },
    { nom: "un losange", figure: [poly([4, 1], [7, 4], [4, 7], [1, 4])] },
    { nom: "une flèche", figure: [poly([1, 3], [4, 3], [4, 1], [7, 4], [4, 7], [4, 5], [1, 5])] },
    { nom: "un sapin", figure: [poly([4, 1], [6, 3], [5, 3], [7, 5], [5, 5], [5, 7], [3, 7], [3, 5], [1, 5], [3, 3], [2, 3])] },
    { nom: "un bateau", figure: [poly([1, 5], [7, 5], [5, 7], [3, 7]), poly([4, 1], [7, 4], [4, 4]), ligne([4, 4], [4, 5])] },
    { nom: "un carré dans un carré", figure: [poly([1, 1], [7, 1], [7, 7], [1, 7]), poly([4, 1], [7, 4], [4, 7], [1, 4])] },
  ],
  obliques: [
    { nom: "un triangle", figure: [poly([1, 1], [6, 3], [2, 7])] },
    { nom: "un parallélogramme", figure: [poly([1, 2], [5, 1], [7, 5], [3, 6])] },
    { nom: "un cerf-volant", figure: [poly([4, 1], [6, 3], [4, 7], [2, 3])] },
    { nom: "un trapèze", figure: [poly([1, 6], [7, 6], [5, 2], [2, 2])] },
    { nom: "un quadrilatère", figure: [poly([1, 2], [6, 1], [7, 6], [2, 5])] },
    { nom: "un triangle rectangle penché", figure: [poly([1, 3], [5, 1], [7, 5])] },
    { nom: "un carré penché", figure: [poly([2, 1], [6, 2], [5, 6], [1, 5])] },
  ],
};

/** Le pas du quadrillage : de grands carreaux au CP. */
const pasDe = (classe: Classe) => (classe === "CP" ? 7 : 6);

function feuilleReproduire(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const pas = pasDe(r.classe);
  const liste = melanger(alea, FIGURES_A_REPRODUIRE[r.niveau]).slice(0, Math.max(1, Math.min(6, r.combien)));
  const rangee = (f: { figure: Figure }, i: number, montrer: boolean) => `<div class="ge-rangee"><b class="ge-lettre">${LETTRES[i]}</b>
    <div class="ge-paire"><div><div class="ge-etiquette">${montrer ? "" : "Le modèle"}</div>${grilleSvg(8, 8, pas, r.support, montrer ? "" : traits(f.figure, pas))}</div>
    <div><div class="ge-etiquette">${montrer ? "Le calque : superpose-le à ta reproduction" : "Ta reproduction"}</div>${grilleSvg(8, 8, pas, r.support, montrer ? traits(f.figure, pas, ROUGE) : "")}</div></div></div>`;
  const pages = (montrer: boolean) => {
    const sortie: string[] = [];
    for (let i = 0; i < liste.length; i += 3) {
      const tete = montrer ? `<div class="titre">Reproduire — le calque de vérification</div><div class="sous">Imprimez cette page sur un transparent ou un calque, à 100 % : posée sur la feuille de l'élève, elle montre si la reproduction est exacte.</div>`
        : entete("Reproduire une figure", `Reproduis chaque figure sur ${r.support === "quadrille" ? "le quadrillage" : "le papier pointé"}, exactement pareille. Compte les carreaux, repère les points de départ${r.niveau === "lignes" ? "" : " et les nœuds par où passent les traits"} ; trace à la règle. Ensuite, on superpose le calque pour vérifier.`);
      sortie.push(`<div class="page${montrer ? " corrige" : ""}">${tete}${liste.slice(i, i + 3).map((f, k) => rangee(f, i + k, montrer)).join("")}</div>`);
    }
    return sortie.join("");
  };
  return pages(false) + pages(true);
}

// ── Compléter un carré, un rectangle ──────────────────────────────────────

const tourner = ([x, y]: P, a: number): P => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Un cadre de `w` × `h` mm, ses tracés centrés. */
function cadreSvg(points: P[][], w: number, h: number, dessin: (decale: (p: P) => P) => string): string {
  const tous = points.flat();
  const minX = Math.min(...tous.map((p) => p[0])), maxX = Math.max(...tous.map((p) => p[0]));
  const minY = Math.min(...tous.map((p) => p[1])), maxY = Math.max(...tous.map((p) => p[1]));
  const dx = (w - (maxX - minX)) / 2 - minX, dy = (h - (maxY - minY)) / 2 - minY;
  return `<svg class="ge-uni" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">${dessin(([x, y]) => [x + dx, y + dy])}</svg>`;
}

export interface ACompleter { quoi: "carré" | "rectangle" | "triangle rectangle"; sommets: P[]; donnes: number; mesures: string }

/**
 * Les figures à compléter. Sur quadrillage, au CP : « compléter un rectangle
 * dont deux côtés consécutifs sont déjà tracés, et compléter un carré dont un
 * côté est déjà tracé ». Sur papier uni, au CE1 et au CE2 : la figure
 * inclinée, un côté tracé, l'amorce du suivant — « elle a pour but de mettre
 * en évidence que respecter cette propriété n'est pas suffisant pour tracer
 * un carré » (Éduscol, 2002, étape 4) —, la règle et l'équerre.
 */
export function figuresACompleter(r: Pick<ReglagesGeometrie, "classe" | "uni" | "combien">, graine: number): ACompleter[] {
  const alea = hasard(graine);
  const sortie: ACompleter[] = [];
  const types: ACompleter["quoi"][] = r.classe === "CP" ? ["carré", "rectangle"] : ["carré", "rectangle", "triangle rectangle"];
  for (let i = 0; i < Math.max(1, Math.min(6, r.combien)); i++) {
    const quoi = types[i % types.length];
    if (!r.uni) {
      // Sur le quadrillage, en carreaux : les côtés suivent les lignes, ou, au CE1 et au CE2, les diagonales (2 sur 1).
      const oblique = r.classe !== "CP" && alea() < 0.5;
      const [ux, uy]: P = oblique ? [2, 1] : [1, 0];
      const a = oblique ? 2 : entre(alea, 3, 5), b = quoi === "carré" ? a : oblique ? 1 : entre(alea, 2, 3);
      const p0: P = [oblique ? 2 : 1, oblique ? 1 : 1];
      const u: P = [ux * a, uy * a], v: P = [-uy * b, ux * b];
      const sommets: P[] = quoi === "triangle rectangle" ? [p0, [p0[0] + u[0], p0[1] + u[1]], [p0[0] + v[0], p0[1] + v[1]]]
        : [p0, [p0[0] + u[0], p0[1] + u[1]], [p0[0] + u[0] + v[0], p0[1] + u[1] + v[1]], [p0[0] + v[0], p0[1] + v[1]]];
      sortie.push({ quoi, sommets, donnes: quoi === "carré" ? 1 : 2, mesures: "" });
    } else {
      // Sur papier uni, en millimètres, incliné.
      // Des figures qui tiennent dans leur case, même inclinées ; un rectangle n'est pas un carré.
      const angle = (entre(alea, -25, 25) * Math.PI) / 180;
      const a = 10 * entre(alea, 4, quoi === "carré" ? 5 : 6), b = quoi === "carré" ? a : 10 * entre(alea, 2, Math.min(4, a / 10 - 1));
      const brut: P[] = quoi === "triangle rectangle" ? [[0, 0], [a, 0], [0, -b]] : [[0, 0], [a, 0], [a, -b], [0, -b]];
      const mesures = quoi === "carré" ? `de ${a / 10} cm de côté` : quoi === "rectangle" ? `de longueur ${a / 10} cm et de largeur ${b / 10} cm` : `dont les côtés de l'angle droit mesurent ${a / 10} cm et ${b / 10} cm`;
      sortie.push({ quoi, sommets: brut.map((p) => tourner(p, angle)), donnes: 1, mesures });
    }
  }
  return sortie;
}

function feuilleCompleter(r: ReglagesGeometrie, graine: number): string {
  const liste = figuresACompleter(r, graine);
  const pas = pasDe(r.classe);
  const dessinQuadrillage = (f: ACompleter, complet: boolean) => {
    const s = f.sommets;
    // Le carré : un côté ; le rectangle : deux côtés consécutifs ; le triangle rectangle : les deux côtés de l'angle droit.
    const donnes = f.quoi === "triangle rectangle" ? [s[1], s[0], s[2]] : s.slice(0, f.donnes + 1);
    const trace = complet ? traits([poly(...s)], pas, ROUGE) : traits([ligne(...donnes)], pas);
    return grilleSvg(10, 8, pas, r.support, trace);
  };
  const dessinUni = (f: ACompleter, complet: boolean) => cadreSvg([f.sommets], 80, 74, (d) => {
    const s = f.sommets.map(d);
    if (complet) return `<path d="M${s.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")} Z" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>`;
    // Un côté entier, et l'amorce du côté suivant, au sommet de l'angle droit.
    const [a, b] = [s[0], s[1]];
    const suivant = f.quoi === "triangle rectangle" ? s[2] : s[s.length - 1];
    const amorce: P = [a[0] + (suivant[0] - a[0]) * 0.25, a[1] + (suivant[1] - a[1]) * 0.25];
    return `<path d="M${f2(amorce[0])} ${f2(amorce[1])} L${f2(a[0])} ${f2(a[1])} L${f2(b[0])} ${f2(b[1])}" fill="none" stroke="${NOIR}" stroke-width="0.5"/>`;
  });
  const consigne = r.uni
    ? "Termine chaque figure à partir de ce qui est tracé : la règle graduée pour les longueurs, l'équerre pour les angles droits. Un carré a quatre côtés de même longueur et quatre angles droits."
    : "Termine chaque figure sur le quadrillage : le carré dont un côté est tracé ; le rectangle dont deux côtés sont tracés ; le triangle rectangle. Trace à la règle.";
  const carte = (f: ACompleter, i: number, complet: boolean) => `<div class="ge-carte"><b class="ge-lettre">${LETTRES[i]}</b><div class="ge-quoi">Termine le ${f.quoi}${f.mesures ? ` ${f.mesures}` : ""}.</div>${r.uni ? dessinUni(f, complet) : dessinQuadrillage(f, complet)}</div>`;
  return `<div class="page">${entete(`Compléter des figures${r.uni ? " sur papier uni" : ""}`, consigne)}<div class="ge-cartes">${liste.map((f, i) => carte(f, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Compléter des figures — corrigé</div><div class="ge-cartes">${liste.map((f, i) => carte(f, i, true)).join("")}</div></div>`;
}

// ── La symétrie (CE2) ─────────────────────────────────────────────────────

/**
 * Des moitiés de figures, à compléter par symétrie : chaque point est donné
 * par sa distance à l'axe et sa hauteur, en carreaux. La figure s'ouvre et se
 * ferme sur l'axe.
 */
export const MOITIES: { nom: string; traits: P[][] }[] = [
  { nom: "un sapin", traits: [[[0, 0], [2, 2], [1, 2], [3, 4], [1, 4], [1, 6], [0, 6]]] },
  { nom: "un vase", traits: [[[0, 0], [2, 0], [1, 1], [3, 4], [2, 6], [0, 6]]] },
  { nom: "une maison", traits: [[[0, 0], [3, 3], [3, 6], [0, 6]], [[0, 6], [1, 6], [1, 4], [0, 4]]] },
  { nom: "un cœur", traits: [[[0, 1], [1, 0], [2, 0], [3, 1], [3, 3], [0, 6]]] },
  { nom: "une fusée", traits: [[[0, 0], [1, 2], [1, 5], [2, 6], [0, 6]]] },
  { nom: "un château", traits: [[[0, 1], [1, 1], [1, 0], [2, 0], [2, 1], [3, 1], [3, 6], [0, 6]]] },
  { nom: "un papillon", traits: [[[0, 1], [3, 0], [3, 3], [1, 3], [3, 5], [1, 6], [0, 4]]] },
  { nom: "une étoile", traits: [[[0, 0], [1, 2], [3, 2], [2, 4], [3, 6], [0, 5]]] },
];

function feuilleSymetrie(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const pas = 6;
  const liste = melanger(alea, MOITIES).slice(0, Math.max(1, Math.min(4, r.combien))).map((m) => ({ ...m, horizontal: alea() < 0.35 }));
  // L'axe au milieu d'un quadrillage de 10 × 8 carreaux (vertical) ou de 8 × 10 (horizontal) ; la moitié à gauche, ou en haut.
  const dessin = (m: (typeof liste)[number], entiere: boolean) => {
    const vers = (d: number, h: number, cote: 1 | -1): P => (m.horizontal ? [1 + h, 5 + cote * d] : [5 + cote * d, 1 + h]);
    const moitie = m.traits.map((t) => ({ points: t.map(([d, h]) => vers(d, h, -1)), ferme: false }));
    const autre = m.traits.map((t) => ({ points: t.map(([d, h]) => vers(d, h, 1)), ferme: false }));
    const axe = m.horizontal ? `<line x1="0" y1="${5 * pas}" x2="${8 * pas}" y2="${5 * pas}" stroke="${ROUGE}" stroke-width="0.8" stroke-dasharray="3 2"/>`
      : `<line x1="${5 * pas}" y1="0" x2="${5 * pas}" y2="${8 * pas}" stroke="${ROUGE}" stroke-width="0.8" stroke-dasharray="3 2"/>`;
    return (m.horizontal ? grilleSvg(8, 10, pas, r.support, "") : grilleSvg(10, 8, pas, r.support, "")).replace("</g></svg>", `${axe}${traits(moitie, pas)}${entiere ? traits(autre, pas, BLEU) : ""}</g></svg>`);
  };
  const carte = (m: (typeof liste)[number], i: number, entiere: boolean) => `<div class="ge-carte"><b class="ge-lettre">${LETTRES[i]}</b>${dessin(m, entiere)}</div>`;
  return `<div class="page">${entete("Compléter par symétrie", "La droite rouge est l'axe de symétrie. Complète chaque figure pour qu'elle soit symétrique : chaque point a son symétrique de l'autre côté, à la même distance de l'axe. Vérifie en pliant la feuille sur l'axe.")}
    <div class="ge-cartes">${liste.map((m, i) => carte(m, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Compléter par symétrie — corrigé</div><div class="ge-cartes">${liste.map((m, i) => carte(m, i, true)).join("")}</div></div>`;
}

// ── Les axes de symétrie (CE2) ────────────────────────────────────────────

/** Une figure dans une case de 40 × 40 mm, et ses axes de symétrie (deux points chacun). */
interface FigureAxes { nom: string; dessin: string; axes: [P, P][] }

const contour = (points: P[], fond = "rgba(36,84,230,0.06)") => `<path d="M${points.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")} Z" fill="${fond}" stroke="${NOIR}" stroke-width="0.55"/>`;
const lettreBloc = (traitsLettre: P[][]) => traitsLettre.map((t) => `<path d="M${t.map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")}" fill="none" stroke="${NOIR}" stroke-width="3.2" stroke-linecap="square" stroke-linejoin="miter"/>`).join("");
const V: [P, P] = [[20, 1], [20, 39]], H: [P, P] = [[1, 20], [39, 20]], D1: [P, P] = [[3, 3], [37, 37]], D2: [P, P] = [[37, 3], [3, 37]];

export const FIGURES_AXES: FigureAxes[] = [
  { nom: "le carré", dessin: contour([[6, 6], [34, 6], [34, 34], [6, 34]]), axes: [V, H, D1, D2] },
  { nom: "le rectangle", dessin: contour([[3, 11], [37, 11], [37, 29], [3, 29]]), axes: [V, H] },
  { nom: "le carreau", dessin: contour([[20, 3], [32, 20], [20, 37], [8, 20]], "rgba(211,58,50,0.2)"), axes: [V, H] },
  { nom: "le cerf-volant", dessin: contour([[20, 3], [32, 14], [20, 37], [8, 14]]), axes: [V] },
  { nom: "le triangle isocèle", dessin: contour([[20, 4], [33, 35], [7, 35]]), axes: [V] },
  { nom: "le triangle équilatéral", dessin: contour([[3, 34.5], [37, 34.5], [20, 5.06]]), axes: [[[20, 1], [20, 38]], [[3, 34.5], [31.46, 18.06]], [[37, 34.5], [8.54, 18.06]]] },
  { nom: "le parallélogramme", dessin: contour([[3, 30], [11, 10], [37, 10], [29, 30]]), axes: [] },
  { nom: "le trapèze isocèle", dessin: contour([[3, 32], [37, 32], [28, 9], [12, 9]]), axes: [V] },
  { nom: "le triangle", dessin: contour([[4, 33], [36, 28], [14, 6]]), axes: [] },
  { nom: "le cœur", dessin: `<path d="M20 36 C 4 25, 2 14, 8 9 C 13 5, 18 8, 20 13 C 22 8, 27 5, 32 9 C 38 14, 36 25, 20 36 Z" fill="rgba(211,58,50,0.2)" stroke="${NOIR}" stroke-width="0.55"/>`, axes: [V] },
  { nom: "le panneau « sens interdit »", dessin: `<circle cx="20" cy="20" r="16" fill="rgba(211,58,50,0.35)" stroke="${NOIR}" stroke-width="0.55"/><rect x="9" y="17" width="22" height="6" fill="#fff" stroke="${NOIR}" stroke-width="0.4"/>`, axes: [V, H] },
  { nom: "la lettre A", dessin: lettreBloc([[[8, 35], [20, 5], [32, 35]], [[13, 24], [27, 24]]]), axes: [V] },
  { nom: "la lettre H", dessin: lettreBloc([[[9, 6], [9, 34]], [[31, 6], [31, 34]], [[9, 20], [31, 20]]]), axes: [V, H] },
  { nom: "la lettre E", dessin: lettreBloc([[[30, 6], [10, 6], [10, 34], [30, 34]], [[10, 20], [26, 20]]]), axes: [H] },
  { nom: "la lettre T", dessin: lettreBloc([[[7, 7], [33, 7]], [[20, 7], [20, 34]]]), axes: [V] },
  { nom: "la lettre N", dessin: lettreBloc([[[10, 34], [10, 6], [30, 34], [30, 6]]]), axes: [] },
  { nom: "la lettre X", dessin: lettreBloc([[[9, 6], [31, 34]], [[31, 6], [9, 34]]]), axes: [V, H] },
  { nom: "la lettre Z", dessin: lettreBloc([[[9, 7], [31, 7], [9, 33], [31, 33]]]), axes: [] },
  { nom: "la lettre M", dessin: lettreBloc([[[8, 34], [8, 6], [20, 22], [32, 6], [32, 34]]]), axes: [V] },
];

function feuilleAxes(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const liste = melanger(alea, FIGURES_AXES).slice(0, Math.max(4, Math.min(16, r.combien < 6 ? 12 : r.combien)));
  const carte = (f: FigureAxes, i: number, corrige: boolean) => {
    const axes = corrige ? f.axes.map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ROUGE}" stroke-width="0.7" stroke-dasharray="2.4 1.6"/>`).join("") : "";
    const legende = corrige ? `${f.axes.length ? `${f.axes.length} axe${f.axes.length > 1 ? "s" : ""}` : "aucun axe"}` : "";
    return `<div class="ge-axe"><b class="ge-lettre">${LETTRES[i]}</b><svg viewBox="0 0 40 40" width="38mm" height="38mm">${f.dessin}${axes}</svg>${corrige ? `<div class="ge-legende">${f.nom} : ${legende}</div>` : ""}</div>`;
  };
  return `<div class="page">${entete("Les axes de symétrie", "Trace en rouge, à la règle, le ou les axes de symétrie de chaque figure. Si elle n'en a pas, barre-la. Vérifie en pliant, ou avec un calque que tu retournes.")}
    <div class="ge-axes">${liste.map((f, i) => carte(f, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Les axes de symétrie — corrigé</div><div class="ge-axes">${liste.map((f, i) => carte(f, i, true)).join("")}</div></div>`;
}

// ── Reconnaître et nommer les figures ─────────────────────────────────────

export type NomFigure = "carré" | "rectangle" | "triangle" | "triangle rectangle" | "disque" | "losange" | "quadrilatère" | "pentagone" | "hexagone";

/** Une figure tirée au hasard, en millimètres, centrée sur l'origine : son nom, ses sommets (ou son rayon). */
export function figureAuHasard(alea: () => number, nom: NomFigure): { nom: NomFigure; sommets: P[]; rayon?: number } {
  const a = entre(alea, 14, 26), b = entre(alea, 9, 14);
  const angle = (entre(alea, 0, 7) * 15 * Math.PI) / 180;
  const centrer = (pts: P[]) => { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length; return pts.map(([x, y]) => tourner([x - cx, y - cy], angle)); };
  switch (nom) {
    case "carré": return { nom, sommets: centrer([[0, 0], [a, 0], [a, a], [0, a]]) };
    case "rectangle": return { nom, sommets: centrer([[0, 0], [a + 6, 0], [a + 6, b], [0, b]]) };
    case "triangle rectangle": return { nom, sommets: centrer([[0, 0], [a, 0], [0, b + 6]]) };
    case "triangle": return { nom, sommets: centrer([[0, 0], [a + 4, 3], [entre(alea, 2, a - 2), -(b + 6)]]) };
    case "losange": { const d1 = a + 8, d2 = entre(alea, 12, 18); return { nom, sommets: centrer([[0, -d2 / 2], [d1 / 2, 0], [0, d2 / 2], [-d1 / 2, 0]]) }; }
    case "quadrilatère": return { nom, sommets: centrer([[0, 0], [a + 4, 2], [a + 1, b + 8], [3, b + 3]]) };
    case "pentagone": { const rr = 14; return { nom, sommets: centrer(Array.from({ length: 5 }, (_, k) => [rr * Math.cos((2 * Math.PI * k) / 5 + 0.3) * (k % 2 ? 1 : 0.85), rr * Math.sin((2 * Math.PI * k) / 5 + 0.3)] as P)) }; }
    case "hexagone": { const rr = 14; return { nom, sommets: centrer(Array.from({ length: 6 }, (_, k) => [rr * Math.cos((Math.PI * k) / 3), rr * Math.sin((Math.PI * k) / 3)] as P)) }; }
    default: return { nom: "disque", sommets: [], rayon: entre(alea, 8, 14) };
  }
}

/** Les figures que chaque classe nomme ; au CE1, des « presque carrés » à vérifier à l'équerre. */
export const FIGURES_DE_LA_CLASSE: Record<Classe, NomFigure[]> = {
  CP: ["carré", "rectangle", "triangle", "disque"],
  CE1: ["carré", "rectangle", "triangle", "triangle rectangle", "disque", "quadrilatère"],
  CE2: ["carré", "rectangle", "triangle", "triangle rectangle", "losange", "quadrilatère", "pentagone", "hexagone"],
};

const COULEURS_CP: Record<string, string> = { carré: "bleu", rectangle: "vert", triangle: "jaune", disque: "rouge" };

function feuilleTrier(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const noms = FIGURES_DE_LA_CLASSE[r.classe];
  const combien = Math.max(noms.length, Math.min(16, r.combien < 6 ? 12 : r.combien));
  const liste = melanger(alea, Array.from({ length: combien }, (_, i) => figureAuHasard(alea, noms[i % noms.length])));
  const dessin = (f: ReturnType<typeof figureAuHasard>) => (f.rayon
    ? `<circle cx="20" cy="20" r="${f.rayon}" fill="rgba(36,84,230,0.06)" stroke="${NOIR}" stroke-width="0.55"/>`
    : contour(f.sommets.map(([x, y]) => [x + 20, y + 20] as P)));
  const carte = (f: ReturnType<typeof figureAuHasard>, i: number, corrige: boolean) => `<div class="ge-axe"><b class="ge-lettre">${LETTRES[i]}</b><svg viewBox="0 0 40 40" width="38mm" height="38mm">${dessin(f)}</svg>
    <div class="ge-legende">${corrige ? f.nom : r.classe === "CP" ? "" : "………………………"}</div></div>`;
  const consigne = r.classe === "CP"
    ? `Colorie ${Object.entries(COULEURS_CP).map(([n, c]) => `les ${n}s en ${c}`).join(", ")}. Compte les côtés et les sommets.`
    : `Écris le nom de chaque figure. Vérifie les angles droits avec l'équerre et les longueurs avec la règle : un carré a quatre côtés de même longueur et quatre angles droits.${r.classe === "CE2" ? " Un losange a quatre côtés de même longueur." : ""}`;
  return `<div class="page">${entete("Reconnaître et nommer les figures", consigne)}<div class="ge-axes">${liste.map((f, i) => carte(f, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Reconnaître les figures — corrigé</div><div class="ge-axes">${liste.map((f, i) => carte(f, i, true)).join("")}</div></div>`;
}

// ── Les alignements (CP, CE1) ─────────────────────────────────────────────

/** Une petite croix, comme le programme représente les points sur la feuille. */
const croix = ([x, y]: P, nom = "") => `<path d="M${f2(x - 1.6)} ${f2(y - 1.6)} L${f2(x + 1.6)} ${f2(y + 1.6)} M${f2(x - 1.6)} ${f2(y + 1.6)} L${f2(x + 1.6)} ${f2(y - 1.6)}" stroke="${NOIR}" stroke-width="0.45"/>`
  + (nom ? `<text x="${f2(x + 2)}" y="${f2(y - 2)}" font-size="4" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${NOIR}">${nom}</text>` : "");

/**
 * Trois points, alignés ou non. Les cas douteux s'écartent de deux
 * millimètres seulement : « l'élève sait dire si trois points sont alignés ou
 * non en utilisant la règle dans les cas où la réponse n'est pas perceptible
 * de façon évidente ».
 */
export function triplets(alea: () => number, combien: number): { points: P[]; alignes: boolean }[] {
  const sortie: { points: P[]; alignes: boolean }[] = [];
  for (let i = 0; i < combien; i++) {
    const alignes = i % 2 === 0;
    const angle = (entre(alea, -40, 40) * Math.PI) / 180;
    const d1 = entre(alea, 14, 26), d2 = entre(alea, 14, 26);
    const ecart = alignes ? 0 : (alea() < 0.5 ? -1 : 1) * (i % 4 === 1 ? 2 : 6);
    const brut: P[] = [[-d1, 0], [0, ecart], [d2, 0]];
    sortie.push({ points: melanger(alea, brut.map((p) => tourner(p, angle))), alignes });
  }
  return melanger(alea, sortie);
}

function feuilleAlignements(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  // Cinq triplets au plus et trois droites : huit cases, une page.
  const liste = triplets(alea, Math.max(2, Math.min(5, r.combien)));
  const centre = (pts: P[]) => cadreSvg([pts], 78, 30, (d) => pts.map((p) => croix(d(p))).join(""));
  const cases = liste.map((t, i) => `<div class="ge-carte"><b class="ge-lettre">${LETTRES[i]}</b>${centre(t.points)}<div class="ge-quoi">Alignés ? &nbsp; oui &nbsp;·&nbsp; non</div></div>`).join("");
  // Puis des droites à tracer, par deux points : horizontale, verticale, oblique.
  const paires: P[][] = [[[-25, 0], [20, 0]], [[0, -11], [0, 12]], [[-22, 9], [24, -10]]];
  const droites = paires.map((pts, i) => `<div class="ge-carte"><b class="ge-lettre">${LETTRES[liste.length + i]}</b>${cadreSvg([pts], 78, 30, (d) => croix(d(pts[0])) + croix(d(pts[1])))}<div class="ge-quoi">Trace la droite qui passe par les deux points.</div></div>`).join("");
  const corrige = `<div class="page corrige"><div class="titre">Les alignements — corrigé</div><div class="ge-corrige">${liste.map((t, i) => `<div>${LETTRES[i]}. ${t.alignes ? "<b>alignés</b>" : "<b>pas alignés</b>"}</div>`).join("")}<div>${LETTRES[liste.length]} à ${LETTRES[liste.length + 2]} : la droite dépasse les deux points, des deux côtés.</div></div></div>`;
  return `<div class="page">${entete("Des points alignés", "Pose ta règle sur deux points : le troisième est-il le long de la règle ? Entoure oui ou non. Puis trace, à la règle, la droite qui passe par deux points : elle continue des deux côtés.")}<div class="ge-cartes">${cases}${droites}</div></div>${corrige}`;
}

// ── Les angles (CE1, CE2) ─────────────────────────────────────────────────

/** Le petit carré qui code un angle droit, au sommet `s`, entre les directions `u` et `v` (unitaires). */
const codeAngleDroit = (s: P, u: P, v: P, c = 3) => `<path d="M${f2(s[0] + u[0] * c)} ${f2(s[1] + u[1] * c)} L${f2(s[0] + (u[0] + v[0]) * c)} ${f2(s[1] + (u[1] + v[1]) * c)} L${f2(s[0] + v[0] * c)} ${f2(s[1] + v[1] * c)}" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>`;
const unitaire = (a: P, b: P): P => { const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / n, (b[1] - a[1]) / n]; };

/** Des polygones qui ont des angles droits, et d'autres pas : le rectangle, le trapèze rectangle, le triangle rectangle… */
export function polygonesAngles(alea: () => number): { nom: string; sommets: P[] }[] {
  const formes: { nom: string; sommets: P[] }[] = [
    { nom: "un rectangle", sommets: [[0, 0], [30, 0], [30, 16], [0, 16]] },
    { nom: "un trapèze rectangle", sommets: [[0, 0], [30, 0], [22, 18], [0, 18]] },
    { nom: "un triangle rectangle", sommets: [[0, 0], [28, 0], [0, 20]] },
    { nom: "un quadrilatère", sommets: [[0, 0], [30, 4], [24, 20], [0, 16]] },
    { nom: "un pentagone", sommets: [[0, 0], [24, 0], [30, 12], [16, 22], [0, 16]] },
    { nom: "un losange", sommets: [[0, 10], [16, 0], [32, 10], [16, 20]] },
    { nom: "une maison", sommets: [[0, 8], [14, 0], [28, 8], [28, 24], [0, 24]] },
    { nom: "un parallélogramme", sommets: [[0, 18], [8, 0], [34, 0], [26, 18]] },
  ];
  return melanger(alea, formes).map((f) => { const a = (entre(alea, -30, 30) * Math.PI) / 180; return { ...f, sommets: f.sommets.map((p) => tourner(p, a)) }; });
}

const estDroit = (a: P, s: P, b: P) => Math.abs((a[0] - s[0]) * (b[0] - s[0]) + (a[1] - s[1]) * (b[1] - s[1])) < 1e-6;

function feuilleAnglesDroits(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const liste = polygonesAngles(alea).slice(0, Math.max(2, Math.min(8, r.combien < 4 ? 6 : r.combien)));
  const dessin = (f: { sommets: P[] }, codes: boolean) => cadreSvg([f.sommets], 78, 44, (d) => {
    const s = f.sommets.map(d);
    const angles = codes ? s.map((p, k) => { const a = s[(k + s.length - 1) % s.length], b = s[(k + 1) % s.length]; return estDroit(a, p, b) ? codeAngleDroit(p, unitaire(p, a), unitaire(p, b)) : ""; }).join("") : "";
    return contour(s) + angles;
  });
  const droits = (f: { sommets: P[] }) => f.sommets.filter((p, k) => estDroit(f.sommets[(k + f.sommets.length - 1) % f.sommets.length], p, f.sommets[(k + 1) % f.sommets.length])).length;
  const carte = (f: { nom: string; sommets: P[] }, i: number, corrige: boolean) => `<div class="ge-carte"><b class="ge-lettre">${LETTRES[i]}</b>${dessin(f, corrige)}<div class="ge-quoi">${corrige ? `${f.nom} : ${droits(f) || "aucun"} angle${droits(f) > 1 ? "s" : ""} droit${droits(f) > 1 ? "s" : ""}` : "Angles droits : ……"}</div></div>`;
  return `<div class="page">${entete("Les angles droits", "Avec ton équerre — ou ton gabarit d'angle droit —, cherche les angles droits de chaque figure. Code chacun d'un petit carré, et écris combien il y en a.")}<div class="ge-cartes">${liste.map((f, i) => carte(f, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Les angles droits — corrigé</div><div class="ge-cartes">${liste.map((f, i) => carte(f, i, true)).join("")}</div></div>`;
}

/** Des angles de toutes sortes, dans tous les sens : droit, aigu ou obtus. */
export function anglesAuHasard(alea: () => number, combien: number): { mesure: number; depart: number }[] {
  // Autant d'angles droits, aigus et obtus, dans le désordre.
  const aigus = [30, 45, 60, 75], obtus = [105, 120, 135, 150];
  return melanger(alea, Array.from({ length: combien }, (_, i) => ({
    mesure: i % 3 === 0 ? 90 : i % 3 === 1 ? aigus[Math.floor(alea() * 4)] : obtus[Math.floor(alea() * 4)],
    depart: entre(alea, 0, 23) * 15,
  })));
}

export const natureAngle = (m: number) => (m === 90 ? "droit" : m < 90 ? "aigu" : "obtus");

function feuilleAngles(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const liste = anglesAuHasard(alea, Math.max(3, Math.min(12, r.combien < 6 ? 9 : r.combien)));
  const dessin = (a: { mesure: number; depart: number }, code: boolean) => {
    const d = (a.depart * Math.PI) / 180, e = ((a.depart + a.mesure) * Math.PI) / 180;
    const s: P = [22, 22], u: P = [Math.cos(d), -Math.sin(d)], v: P = [Math.cos(e), -Math.sin(e)];
    const bout = (w: P): P => [s[0] + w[0] * 19, s[1] + w[1] * 19];
    const arc = code && a.mesure !== 90 ? `<path d="M${f2(s[0] + u[0] * 5)} ${f2(s[1] + u[1] * 5)} A5 5 0 0 0 ${f2(s[0] + v[0] * 5)} ${f2(s[1] + v[1] * 5)}" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>` : "";
    return `<svg viewBox="0 0 44 44" width="40mm" height="40mm"><path d="M${f2(bout(u)[0])} ${f2(bout(u)[1])} L${s[0]} ${s[1]} L${f2(bout(v)[0])} ${f2(bout(v)[1])}" fill="none" stroke="${NOIR}" stroke-width="0.6"/>${code && a.mesure === 90 ? codeAngleDroit(s, u, v) : ""}${arc}</svg>`;
  };
  const carte = (a: { mesure: number; depart: number }, i: number, corrige: boolean) => `<div class="ge-axe"><b class="ge-lettre">${LETTRES[i]}</b>${dessin(a, corrige)}<div class="ge-legende">${corrige ? `<b>${natureAngle(a.mesure)}</b>` : "droit · aigu · obtus"}</div></div>`;
  return `<div class="page">${entete("Droit, aigu ou obtus ?", "Pose ton équerre — ou ton gabarit — sur chaque angle. Il est droit ? aigu, plus petit qu'un angle droit ? obtus, plus grand ? Entoure le bon mot ; quand il n'y a aucun doute, on peut répondre sans équerre.")}<div class="ge-axes">${liste.map((a, i) => carte(a, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Droit, aigu ou obtus ? — corrigé</div><div class="ge-axes">${liste.map((a, i) => carte(a, i, true)).join("")}</div></div>`;
}

// ── Construire (CE2), tracer des cercles (CE1, CE2) ───────────────────────

/** Un programme de construction : la consigne, et la figure en millimètres pour le corrigé. */
export interface Construction { consigne: string; sommets: P[][]; cercles: { c: P; r: number }[]; angleDroit?: [P, P, P] }

/**
 * Des constructions sur papier uni, d'après les exemples du programme (CE2) :
 * « Un rectangle de longueur 7 cm et de largeur 3 cm » ; « Un carré dont les
 * côtés ont pour longueur 6 cm et un cercle de rayon 4 cm ayant pour centre
 * un des sommets du carré » ; « Un triangle rectangle dont les côtés de
 * l'angle droit mesurent 10 cm et 4 cm ».
 */
export function constructions(alea: () => number, combien: number): Construction[] {
  const modeles: (() => Construction)[] = [
    () => { const l = entre(alea, 5, 8), L = entre(alea, 2, 4); return { consigne: `Trace un rectangle de longueur ${l} cm et de largeur ${L} cm.`, sommets: [[[0, 0], [10 * l, 0], [10 * l, 10 * L], [0, 10 * L]]], cercles: [] }; },
    () => { const c = entre(alea, 4, 6), r = entre(alea, 2, c - 1); return { consigne: `Trace un carré dont les côtés ont pour longueur ${c} cm, et un cercle de rayon ${r} cm ayant pour centre un des sommets du carré.`, sommets: [[[0, 0], [10 * c, 0], [10 * c, 10 * c], [0, 10 * c]]], cercles: [{ c: [0, 0], r: 10 * r }] }; },
    () => { const a = entre(alea, 6, 10), b = entre(alea, 3, 5); return { consigne: `Trace un triangle rectangle dont les côtés de l'angle droit mesurent ${a} cm et ${b} cm.`, sommets: [[[0, 10 * b], [10 * a, 10 * b], [0, 0]]], cercles: [] }; },
    () => { const c = entre(alea, 3, 6); return { consigne: `Trace un carré de ${c} cm de côté, puis ses deux diagonales.`, sommets: [[[0, 0], [10 * c, 0], [10 * c, 10 * c], [0, 10 * c]], [[0, 0], [10 * c, 10 * c]], [[10 * c, 0], [0, 10 * c]]], cercles: [] }; },
  ];
  return Array.from({ length: combien }, (_, i) => modeles[i % modeles.length]());
}

function feuilleConstruire(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const liste = constructions(alea, Math.max(1, Math.min(4, r.combien)));
  const dessin = (c: Construction) => {
    const tous = [...c.sommets.flat(), ...c.cercles.flatMap((k) => [[k.c[0] - k.r, k.c[1] - k.r], [k.c[0] + k.r, k.c[1] + k.r]] as P[])];
    const w = Math.max(...tous.map((p) => p[0])) - Math.min(...tous.map((p) => p[0])) + 12, h = Math.max(...tous.map((p) => p[1])) - Math.min(...tous.map((p) => p[1])) + 12;
    return cadreSvg([tous], Math.max(60, w), Math.max(30, h), (d) => c.sommets.map((s, k) => `<path d="M${s.map(d).map((p) => `${f2(p[0])} ${f2(p[1])}`).join(" L")}${k === 0 ? " Z" : ""}" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>`).join("")
      + c.cercles.map((k) => { const cc = d(k.c); return `<circle cx="${f2(cc[0])}" cy="${f2(cc[1])}" r="${k.r}" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>`; }).join(""));
  };
  const blocs = liste.map((c, i) => `<div class="ge-construction"><div class="ge-quoi"><b class="ge-lettre">${LETTRES[i]}</b> ${c.consigne}</div><div class="ge-place"></div></div>`).join("");
  return `<div class="page">${entete("Programmes de construction", "Lis le programme, puis construis la figure sur la feuille blanche avec la règle graduée, l'équerre et le compas. Code les angles droits et les côtés de même longueur.")}${blocs}</div>
    <div class="page corrige"><div class="titre">Programmes de construction — corrigé, à la taille réelle</div>${liste.map((c, i) => `<div class="ge-solution"><b class="ge-lettre">${LETTRES[i]}</b>${dessin(c)}</div>`).join("")}</div>`;
}

/**
 * Des cercles : « tracer le cercle de centre un point donné et passant par un
 * autre point donné » (CE1) ; puis, au CE2, de rayon donné.
 */
function feuilleCercles(r: ReglagesGeometrie, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(2, Math.min(6, r.combien < 4 ? 4 : r.combien));
  const liste = Array.from({ length: combien }, (_, i) => {
    const rayon = entre(alea, 12, 25), angle = (entre(alea, 0, 11) * 30 * Math.PI) / 180;
    return { rayon, a: [Math.cos(angle) * rayon, Math.sin(angle) * rayon] as P, donneRayon: r.classe === "CE2" && i % 2 === 1 };
  });
  const carte = (c: (typeof liste)[number], i: number, corrige: boolean) => {
    const o: P = [39, 28];
    const a: P = [o[0] + c.a[0], o[1] + c.a[1]];
    const nom = (p: P, n: string) => `<text x="${f2(p[0] + 1.8)}" y="${f2(p[1] - 1.8)}" font-size="4" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">${n}</text>`;
    const points = `<circle cx="${o[0]}" cy="${o[1]}" r="0.8" fill="${NOIR}"/>${nom(o, "O")}${c.donneRayon ? "" : `<circle cx="${f2(a[0])}" cy="${f2(a[1])}" r="0.8" fill="${NOIR}"/>${nom(a, "A")}`}`;
    const cercle = corrige ? `<circle cx="${o[0]}" cy="${o[1]}" r="${c.rayon}" fill="none" stroke="${ROUGE}" stroke-width="0.5"/>` : "";
    const consigne = c.donneRayon ? `Trace le cercle de centre O et de rayon ${String(c.rayon / 10).replace(".", ",")} cm.` : "Trace le cercle de centre O qui passe par A.";
    return `<div class="ge-carte"><b class="ge-lettre">${LETTRES[i]}</b><div class="ge-quoi">${consigne}</div><svg viewBox="0 0 78 56" width="78mm" height="56mm">${cercle}${points}</svg></div>`;
  };
  return `<div class="page">${entete("Tracer des cercles", "Pique la pointe du compas sur le centre O, ouvre le compas jusqu'au point A — ou de la longueur du rayon, sur la règle —, puis tourne sans changer l'écartement.")}<div class="ge-cartes">${liste.map((c, i) => carte(c, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Tracer des cercles — corrigé</div><div class="ge-cartes">${liste.map((c, i) => carte(c, i, true)).join("")}</div></div>`;
}

export function htmlGeometrie(r: ReglagesGeometrie, graine: number): string {
  const f: Record<ExerciceGeometrie, (r: ReglagesGeometrie, g: number) => string> = {
    reproduire: feuilleReproduire, completer: feuilleCompleter, symetrie: feuilleSymetrie, axes: feuilleAxes, trier: feuilleTrier,
    alignements: feuilleAlignements, anglesDroits: feuilleAnglesDroits, angles: feuilleAngles, construire: feuilleConstruire, cercles: feuilleCercles,
  };
  return feuille((f[r.exercice] ?? feuilleReproduire)(r, graine), "ge");
}

export const STYLE_GEOMETRIE = `
  .feuille.ge svg { display: block; }
  .feuille.ge .ge-lettre { font-size: 14px; font-weight: 800; }
  .feuille.ge .ge-rangee { display: grid; grid-template-columns: 6mm 1fr; align-items: start; margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ge .ge-paire { display: flex; gap: 10mm; }
  .feuille.ge .ge-etiquette { font-size: 11px; color: #687087; min-height: 14px; margin-bottom: 1mm; }
  .feuille.ge .ge-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.ge .ge-carte { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 2.5mm 3mm; display: flex; flex-direction: column; align-items: center; gap: 1.5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ge .ge-carte > .ge-lettre { align-self: flex-start; }
  .feuille.ge .ge-quoi { font-size: 13px; text-align: center; line-height: 1.4; }
  .feuille.ge .ge-axes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
  .feuille.ge .ge-axe { border: 1px dashed #c4c9d6; border-radius: 3mm; padding: 1.5mm; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ge .ge-axe > .ge-lettre { align-self: flex-start; font-size: 12px; }
  .feuille.ge .ge-legende { font-size: 11.5px; text-align: center; min-height: 15px; margin-top: 1mm; }
  .feuille.ge .ge-construction { margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ge .ge-construction .ge-quoi { text-align: left; font-size: 14px; }
  .feuille.ge .ge-place { height: 105mm; border: 1px dashed #c4c9d6; border-radius: 3mm; margin-top: 2mm; }
  .feuille.ge .ge-solution { margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.ge .ge-corrige { font-size: 13px; line-height: 1.7; }
`;
