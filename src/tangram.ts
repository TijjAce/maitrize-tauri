// Le tangram de la grande section : le grand carré à découper, des modèles à
// recouvrir, les sept pièces en désordre, le parallélogramme tourné ou retourné.
//
// Des modèles de plus en plus difficiles : ce qui différencie, c'est le nombre
// de pièces, les contours des pièces dessinés ou non, des pièces en couleur ou
// toutes noires, un modèle à la taille des pièces ou plus petit. Un modèle se
// recouvre avec les pièces de la classe : il s'imprime à leur taille, donnée
// par le côté du carré qu'elles forment. Trop grand pour la page, il s'imprime
// plus petit, et l'atelier le dit.
//
// Les figures — la fusée, les voiliers, la maison… — sont de Maitrize. Leurs
// sommets sont exacts : dans un quadrillage dont le carreau est le petit
// carré, ou dans le grand carré, en quarts de son côté. Un essai vérifie que
// chaque pièce a sa forme et qu'aucune n'en chevauche une autre.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

// ── Les pièces et les figures ─────────────────────────────────────────────

export type PieceTangram = "grand1" | "grand2" | "moyen" | "carre" | "para" | "petit1" | "petit2";
/** Les sept pièces, des plus grandes aux plus petites : l'ordre où l'on conseille de les poser. */
export const PIECES_TANGRAM: PieceTangram[] = ["grand1", "grand2", "moyen", "carre", "para", "petit1", "petit2"];

export type Pt = [number, number];
export interface PiecePosee { piece: PieceTangram; points: Pt[] }

export interface FigureTangram {
  id: string;
  nom: string;
  /**
   * L'unité des sommets : « petit », le côté du petit carré — les petits
   * triangles ont deux côtés de 1 — ; « quart », le quart du côté du grand carré.
   */
  unite: "petit" | "quart";
  pieces: PiecePosee[];
}

type Coin = "hg" | "hd" | "bg" | "bd";

/** Un triangle rectangle isocèle, ses côtés de l'angle droit — de longueur `c` — le long des bords, l'angle droit au coin dit : en haut ou en bas, à gauche ou à droite. */
function triangle(piece: PieceTangram, x: number, y: number, c: number, coin: Coin): PiecePosee {
  const hg: Pt = [x, y], hd: Pt = [x + c, y], bd: Pt = [x + c, y + c], bg: Pt = [x, y + c];
  const points = coin === "hg" ? [hg, hd, bg] : coin === "hd" ? [hg, hd, bd] : coin === "bd" ? [hd, bd, bg] : [hg, bd, bg];
  return { piece, points };
}
const grand = (piece: "grand1" | "grand2", x: number, y: number, coin: Coin) => triangle(piece, x, y, 2, coin);
const petit = (piece: "petit1" | "petit2", x: number, y: number, coin: Coin) => triangle(piece, x, y, 1, coin);

/** Le triangle moyen, son grand côté le long d'un bord, sa pointe vers le haut, le bas, la gauche ou la droite. */
function moyen(x: number, y: number, pointe: "haut" | "bas" | "gauche" | "droite"): PiecePosee {
  const points: Pt[] = pointe === "haut" ? [[x, y + 1], [x + 2, y + 1], [x + 1, y]]
    : pointe === "bas" ? [[x, y], [x + 2, y], [x + 1, y + 1]]
      : pointe === "gauche" ? [[x + 1, y], [x + 1, y + 2], [x, y + 1]]
        : [[x, y], [x, y + 2], [x + 1, y + 1]];
  return { piece: "moyen", points };
}

const carre = (x: number, y: number): PiecePosee => ({ piece: "carre", points: [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] });

/** Le parallélogramme, ses petits côtés à l'horizontale ; en descendant, il penche vers la droite ou vers la gauche. */
function para(x: number, y: number, penche: "droite" | "gauche"): PiecePosee {
  const points: Pt[] = penche === "droite" ? [[x, y], [x + 1, y], [x + 2, y + 1], [x + 1, y + 1]] : [[x + 1, y], [x + 2, y], [x + 1, y + 1], [x, y + 1]];
  return { piece: "para", points };
}

/** Le grand carré, en quarts de son côté : les deux grands triangles en haut et à gauche, le moyen au coin d'en bas. */
const GRAND_CARRE: PiecePosee[] = [
  { piece: "grand1", points: [[0, 0], [4, 0], [2, 2]] },
  { piece: "grand2", points: [[0, 0], [2, 2], [0, 4]] },
  { piece: "moyen", points: [[4, 2], [4, 4], [2, 4]] },
  { piece: "carre", points: [[2, 2], [3, 1], [4, 2], [3, 3]] },
  { piece: "para", points: [[0, 4], [1, 3], [3, 3], [2, 4]] },
  { piece: "petit1", points: [[4, 0], [4, 2], [3, 1]] },
  { piece: "petit2", points: [[2, 2], [3, 3], [1, 3]] },
];

/** Les figures à recouvrir, de deux à sept pièces. */
export const FIGURES_TANGRAM: FigureTangram[] = [
  { id: "carre-2", nom: "Un carré, avec les deux petits triangles", unite: "petit", pieces: [petit("petit1", 0, 0, "hg"), petit("petit2", 0, 0, "bd")] },
  { id: "triangle-2", nom: "Un triangle, avec les deux petits triangles", unite: "petit", pieces: [petit("petit1", 0, 0, "bd"), petit("petit2", 1, 0, "bg")] },
  { id: "para-2", nom: "Un parallélogramme, avec les deux petits triangles", unite: "petit", pieces: [petit("petit1", 0, 0, "hd"), petit("petit2", 1, 0, "bg")] },
  { id: "maison-3", nom: "La petite maison", unite: "petit", pieces: [grand("grand1", 0, 1, "hg"), grand("grand2", 0, 1, "bd"), moyen(0, 0, "haut")] },
  { id: "triangle-3", nom: "Un grand triangle, avec le moyen et les deux petits", unite: "petit",
    pieces: [moyen(0, 0, "droite"), petit("petit1", 0, 1, "bd"), petit("petit2", 1, 1, "bg")] },
  { id: "bateau-4", nom: "Le bateau", unite: "petit", pieces: [grand("grand1", 1, 0, "bg"), carre(1, 2), petit("petit1", 0, 2, "hd"), petit("petit2", 2, 2, "hg")] },
  { id: "poisson-4", nom: "Le poisson", unite: "petit", pieces: [grand("grand1", 0, 0, "bd"), grand("grand2", 0, 2, "hd"), moyen(2, 1, "gauche"), petit("petit1", 2, 0, "hg")] },
  { id: "bateau-5", nom: "Le bateau à deux voiles", unite: "petit",
    pieces: [grand("grand1", 1, 0, "bg"), moyen(0, 0, "gauche"), carre(1, 2), petit("petit1", 0, 2, "hd"), petit("petit2", 2, 2, "hg")] },
  { id: "maison-7", nom: "La maison", unite: "petit",
    pieces: [grand("grand1", 0, 0, "bd"), grand("grand2", 2, 0, "bg"), moyen(1, 2, "droite"), carre(2, 2), para(1, 3, "gauche"), petit("petit1", 1, 2, "hd"), petit("petit2", 2, 3, "bd")] },
  { id: "fusee-7", nom: "La fusée", unite: "petit",
    pieces: [grand("grand1", 0, 1, "hg"), grand("grand2", 0, 1, "bd"), moyen(0, 0, "haut"), carre(0.5, 3), para(-0.5, 4, "gauche"), petit("petit1", -1, 2, "bd"), petit("petit2", 2, 2, "bg")] },
  { id: "voilier-7", nom: "Le voilier", unite: "petit",
    pieces: [grand("grand1", 1, 0, "bg"), grand("grand2", 1, 2, "hg"), moyen(0, 1, "gauche"), carre(0, 4), para(1, 4, "gauche"), petit("petit1", -1, 4, "hd"), petit("petit2", 1, 4, "hg")] },
  { id: "voilier-bis-7", nom: "L'autre voilier", unite: "petit",
    pieces: [grand("grand1", 0, 0, "bd"), grand("grand2", 2, 0, "bg"), moyen(2, 2, "bas"), carre(1, 2), para(3, 2, "gauche"), petit("petit1", 0, 2, "hd"), petit("petit2", 2, 2, "bg")] },
  { id: "carre-7", nom: "Le grand carré", unite: "quart", pieces: GRAND_CARRE },
];

export const figureTangram = (id: string | undefined): FigureTangram => FIGURES_TANGRAM.find((f) => f.id === id) ?? FIGURES_TANGRAM.find((f) => f.id === "fusee-7")!;

// ── Les réglages ──────────────────────────────────────────────────────────

export type ExerciceTangram = "carre" | "modele" | "desordre" | "parallelogrammes";

export const EXERCICES_TANGRAM: { id: ExerciceTangram; libelle: string }[] = [
  { id: "modele", libelle: "Un modèle à recouvrir" },
  { id: "carre", libelle: "Le grand carré, à découper" },
  { id: "desordre", libelle: "Les sept pièces en désordre" },
  { id: "parallelogrammes", libelle: "Le parallélogramme, tourné ou retourné" },
];

/**
 * Comment les pièces sont dessinées : grises, séparées par un trait blanc —
 * on voit chaque pièce — ; chacune de sa couleur ; ou la silhouette, toute
 * noire, sans les contours.
 */
export type DessinTangram = "contours" | "couleur" | "silhouette";

export const DESSINS_TANGRAM: { id: DessinTangram; libelle: string; exercices: ExerciceTangram[] }[] = [
  { id: "contours", libelle: "On voit chaque pièce", exercices: ["modele", "carre", "desordre", "parallelogrammes"] },
  { id: "couleur", libelle: "Chaque pièce de sa couleur", exercices: ["modele", "carre", "desordre", "parallelogrammes"] },
  { id: "silhouette", libelle: "Tout en noir, sans les contours des pièces", exercices: ["modele", "carre", "desordre", "parallelogrammes"] },
];

export interface ReglagesTangram {
  exercice: ExerciceTangram;
  /** Le côté du grand carré que forment les sept pièces de la classe, en millimètres : les modèles sont à leur taille. */
  cote: number;
  figure: string;
  dessin: DessinTangram;
  /** Le modèle plus petit que les pièces : à moitié de leur taille. */
  petit?: boolean;
  /** Un modèle en petit livre : une pièce de plus à chaque page. */
  etapes?: boolean;
  titre?: string;
}

export const REGLAGES_TANGRAM: ReglagesTangram = { exercice: "modele", cote: 120, figure: "fusee-7", dessin: "contours" };

export const COTE_MIN = 60, COTE_MAX = 180;

/** Les réglages tels que l'atelier les relit : ce qui ne se lit pas reprend sa valeur par défaut. */
export function reglagesTangramSurs(brut: Partial<ReglagesTangram> | null | undefined): ReglagesTangram {
  const b = brut ?? {};
  const exercice = EXERCICES_TANGRAM.some((e) => e.id === b.exercice) ? b.exercice! : REGLAGES_TANGRAM.exercice;
  const cote = Math.round(Number(b.cote));
  const dessin = DESSINS_TANGRAM.find((d) => d.id === b.dessin)?.exercices.includes(exercice) ? b.dessin! : "contours";
  return {
    ...b, exercice, dessin,
    cote: Number.isFinite(cote) && cote > 0 ? Math.min(COTE_MAX, Math.max(COTE_MIN, cote)) : REGLAGES_TANGRAM.cote,
    figure: figureTangram(b.figure).id,
    petit: b.petit === true, etapes: b.etapes === true,
  };
}

/** Le titre d'une feuille qu'on n'a pas nommée. */
export function titreTangram(r: ReglagesTangram): string {
  if (r.exercice === "carre") return "Le grand carré du tangram";
  if (r.exercice === "desordre") return "Les sept pièces du tangram";
  if (r.exercice === "parallelogrammes") return "Le parallélogramme, tourné ou retourné";
  return figureTangram(r.figure).nom;
}

// ── La page ───────────────────────────────────────────────────────────────

/** Ce qu'une page A4 laisse au dessin, en millimètres, marges de 10 mm, titre et consigne ôtés. */
const PAGE = { portrait: { largeur: 190, hauteur: 240 }, paysage: { largeur: 277, hauteur: 150 } };

const mmParUnite = (f: FigureTangram, cote: number) => (f.unite === "quart" ? cote / 4 : cote / (2 * Math.SQRT2));

function boite(points: Pt[]) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Le modèle sur sa page : à l'horizontale s'il y tient mieux ; à quelle part de sa taille, s'il ne tient pas en entier. */
export function miseEnPageDuModele(r: ReglagesTangram): { paysage: boolean; reduction: number } {
  if (r.exercice !== "modele") return { paysage: false, reduction: 1 };
  const f = figureTangram(r.figure);
  const b = boite(f.pieces.flatMap((p) => p.points));
  const e = mmParUnite(f, r.cote) * (r.petit ? 0.5 : 1);
  const [l, h] = [b.l * e + 2, b.h * e + 2];
  const { portrait: P, paysage: L } = PAGE;
  if (l <= P.largeur && h <= P.hauteur) return { paysage: false, reduction: 1 };
  if (l <= L.largeur && h <= L.hauteur) return { paysage: true, reduction: 1 };
  const [sp, sl] = [Math.min(P.largeur / l, P.hauteur / h), Math.min(L.largeur / l, L.hauteur / h)];
  return { paysage: sl > sp, reduction: Math.max(sp, sl) };
}

/** Ce que l'atelier signale : un modèle qui ne tient pas sur la page à la taille des pièces. */
export function avertissementTangram(r: ReglagesTangram): string | null {
  const { reduction } = miseEnPageDuModele(r);
  if (reduction >= 1) return null;
  return `À la taille des pièces, ce modèle ne tient pas sur une page A4 : il s'imprime à ${Math.floor(reduction * 100)} % de leur taille, et les pièces `
    + "le déborderont. Prenez un tangram plus petit, ou faites construire à côté, avec le modèle « plus petit ».";
}

// ── Le dessin ─────────────────────────────────────────────────────────────

const ENCRE = "#1c2233", NOIR = "#111111", GRIS = "#a9afbb", PALE = "#e9ebf1";
/** Les couleurs des pièces : celles du grand carré imprimé en couleur, que les modèles reprennent. */
export const COULEURS_TANGRAM: Record<PieceTangram, string> = {
  grand1: "#e53935", grand2: "#1e88e5", moyen: "#43a047", carre: "#8e24aa", para: "#ec407a", petit1: "#fdd835", petit2: "#fb8c00",
};

const n2 = (x: number) => Number(x.toFixed(2));

/** Une pièce dessinée, ses sommets en millimètres. */
interface Trace { points: Pt[]; fond: string; trait: string; epaisseur: number }

const polygone = (t: Trace) => `<polygon points="${t.points.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ")}" fill="${t.fond}" stroke="${t.trait}"`
  + ` stroke-width="${n2(t.epaisseur)}" stroke-linejoin="round"/>`;

/** Les pièces dans un dessin en millimètres, à sa taille réelle. */
const svgMm = (traces: Trace[], largeur: number, hauteur: number, classe = "tg-dessin") =>
  `<svg class="${classe}" viewBox="0 0 ${n2(largeur)} ${n2(hauteur)}" width="${n2(largeur)}mm" height="${n2(hauteur)}mm">${traces.map(polygone).join("")}</svg>`;

/** Comment se dessine une pièce : grise et séparée des autres par un trait blanc, de sa couleur, ou fondue dans la silhouette. */
function aspect(piece: PieceTangram, dessin: DessinTangram): Pick<Trace, "fond" | "trait" | "epaisseur"> {
  if (dessin === "silhouette") return { fond: NOIR, trait: NOIR, epaisseur: 0.3 };
  return { fond: dessin === "contours" ? GRIS : COULEURS_TANGRAM[piece], trait: "#fff", epaisseur: 0.8 };
}

/**
 * Le dessin d'une figure, à `e` millimètres par unité. Les pièces `cachees`
 * ne se voient que fondues dans une silhouette pâle — les pages du petit livre
 * qui ne les ont pas encore — ; la pièce `nouvelle` est cernée.
 */
function svgFigure(f: FigureTangram, e: number, dessin: DessinTangram, o: { cachees?: Set<PieceTangram>; nouvelle?: PieceTangram } = {}): string {
  const b = boite(f.pieces.flatMap((p) => p.points));
  const marge = 1;
  const mm = (p: Pt): Pt => [(p[0] - b.x) * e + marge, (p[1] - b.y) * e + marge];
  const pale = f.pieces.filter((p) => o.cachees?.has(p.piece)).map((p): Trace => ({ points: p.points.map(mm), fond: PALE, trait: PALE, epaisseur: 0.3 }));
  const vues = f.pieces.filter((p) => !o.cachees?.has(p.piece)).map((p): Trace => ({ points: p.points.map(mm), ...aspect(p.piece, dessin) }));
  const cernee = f.pieces.filter((p) => p.piece === o.nouvelle).map((p): Trace => ({ points: p.points.map(mm), fond: "none", trait: ENCRE, epaisseur: 1.2 }));
  return svgMm([...pale, ...vues, ...cernee], b.l * e + 2 * marge, b.h * e + 2 * marge);
}

// ── Les pièces en désordre ────────────────────────────────────────────────

/** Les sept pièces, chacune à plat, en petits carreaux : le grand triangle a deux côtés de 2. */
const FORMES: Record<PieceTangram, Pt[]> = {
  grand1: [[0, 0], [2, 0], [0, 2]], grand2: [[0, 0], [2, 0], [0, 2]], moyen: [[0, 0], [2, 0], [1, 1]],
  carre: [[0, 0], [1, 0], [1, 1], [0, 1]], para: [[0, 0], [1, 0], [2, 1], [1, 1]], petit1: [[0, 0], [1, 0], [0, 1]], petit2: [[0, 0], [1, 0], [0, 1]],
};

/** Une pièce tournée de `degres`, retournée ou non, à `e` millimètres par carreau ; ramenée contre le coin de sa boîte. */
function tournee(piece: PieceTangram, degres: number, retournee: boolean, e: number): { piece: PieceTangram; points: Pt[]; l: number; h: number } {
  const a = (degres * Math.PI) / 180, [c, s] = [Math.cos(a), Math.sin(a)];
  const points = FORMES[piece].map(([x, y]): Pt => { const xx = retournee ? -x : x; return [(xx * c - y * s) * e, (xx * s + y * c) * e]; });
  const b = boite(points);
  return { piece, points: points.map(([x, y]): Pt => [x - b.x, y - b.y]), l: b.l, h: b.h };
}

type Posee = { piece: PieceTangram; points: Pt[] };
type Forme = ReturnType<typeof tournee>;

/** La plus courte distance d'un sommet de `a` à un côté de `b`, et inversement : celle de deux pièces qui ne se chevauchent pas. */
function distanceEntre(a: Pt[], b: Pt[]): number {
  const auCote = (m: Pt, p: Pt, q: Pt) => {
    const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
    const t = Math.max(0, Math.min(1, ((m[0] - p[0]) * dx + (m[1] - p[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(m[0] - p[0] - t * dx, m[1] - p[1] - t * dy);
  };
  const d = (u: Pt[], v: Pt[]) => Math.min(...u.flatMap((m) => v.map((p, i) => auCote(m, p, v[(i + 1) % v.length]))));
  return Math.min(d(a, b), d(b, a));
}

/**
 * Deux pièces à `ecart` millimètres l'une de l'autre au moins. Les pièces du
 * tangram sont convexes : deux d'entre elles sont séparées quand l'un de
 * leurs côtés les sépare, et alors leur distance est celle d'un sommet à un
 * côté.
 */
function assezLoin(a: Pt[], b: Pt[], ecart: number): boolean {
  // Le plus souvent, leurs boîtes suffisent à le dire.
  const [ba, bb] = [boite(a), boite(b)];
  if (bb.x - (ba.x + ba.l) >= ecart || ba.x - (bb.x + bb.l) >= ecart || bb.y - (ba.y + ba.h) >= ecart || ba.y - (bb.y + bb.h) >= ecart) return true;
  let separees = false;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
      const n: Pt = [q[1] - p[1], p[0] - q[0]], l = Math.hypot(n[0], n[1]);
      const proj = (u: Pt[]) => u.map(([x, y]) => (x * n[0] + y * n[1]) / l);
      const [pa, pb] = [proj(a), proj(b)];
      const jour = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
      if (jour >= ecart) return true;
      if (jour > 0) separees = true;
    }
  }
  return separees && distanceEntre(a, b) >= ecart;
}

/**
 * Des pièces posées au hasard sur la page, les plus grandes d'abord, chacune
 * à `ecart` millimètres des autres au moins : en désordre, comme on les
 * étale sur la table. Rien, si l'une d'elles ne trouve pas de place.
 */
function auHasard(formes: Forme[], alea: () => number, largeur: number, hauteur: number, ecart = 8): Posee[] | null {
  const posees: Posee[] = [];
  for (const f of [...formes].sort((a, b) => b.l * b.h - a.l * a.h)) {
    if (f.l > largeur || f.h > hauteur) return null;
    let place: Pt[] | null = null;
    for (let essai = 0; essai < 200 && !place; essai++) {
      const [x, y] = [alea() * (largeur - f.l), alea() * (hauteur - f.h)];
      const points = f.points.map(([px, py]): Pt => [px + x, py + y]);
      if (posees.every((p) => assezLoin(p.points, points, ecart))) place = points;
    }
    if (!place) return null;
    posees.push({ piece: f.piece, points: place });
  }
  return posees;
}

/**
 * Des pièces rangées sur des pages, quand elles ne tiennent pas toutes sur
 * une : en rangées — les plus hautes d'abord, pour perdre le moins de
 * place —, mêlées dans leur rangée, à des hauteurs un peu différentes. Une
 * rangée qui ne tient plus va sur la page suivante.
 */
function enRangees(formes: Forme[], alea: () => number, largeur: number, hauteur: number, ecart = 8): { posees: Posee[]; hauteur: number }[] {
  const rangees: Forme[][] = [];
  for (const f of [...formes].sort((a, b) => b.h - a.h)) {
    const r = rangees.find((x) => x.reduce((n, y) => n + y.l + ecart, 0) + f.l <= largeur);
    if (r) r.push(f);
    else rangees.push([f]);
  }
  const pages: { posees: Posee[]; hauteur: number }[] = [];
  let page: { posees: Posee[]; hauteur: number } | null = null;
  for (const r of rangees.map((x) => melanger(alea, x))) {
    const h = Math.max(...r.map((f) => f.h));
    if (!page || (page.hauteur > 0 && page.hauteur + ecart + h > hauteur)) pages.push(page = { posees: [], hauteur: 0 });
    const y0 = page.hauteur > 0 ? page.hauteur + ecart : 0;
    // Au moins l'écart entre deux pièces ; ce qui reste de la largeur se partage entre les deux bords.
    const libre = Math.max(0, largeur - r.reduce((n, f) => n + f.l, 0));
    const entre = r.length > 1 ? Math.max(ecart, libre / (r.length + 1)) : 0;
    let x = (libre - entre * (r.length - 1)) / 2;
    for (const f of r) {
      const dy = (h - f.h) * alea();
      page.posees.push({ piece: f.piece, points: f.points.map(([px, py]): Pt => [px + x, py + y0 + dy]) });
      x += f.l + entre;
    }
    page.hauteur = y0 + h;
  }
  return pages;
}

/**
 * Les pièces en désordre sur une page, tournées chaque fois autrement tant
 * qu'elles n'y trouvent pas toutes leur place ; sur deux pages, en rangées,
 * pour un tangram trop grand.
 */
function eparpiller(tirer: () => Forme[], alea: () => number): { posees: Posee[]; hauteur: number }[] {
  const { largeur, hauteur } = { largeur: PAGE.portrait.largeur, hauteur: PAGE.portrait.hauteur - 8 };
  // Au hasard, tant que les pièces couvrent moins d'un bon tiers de la page : au-delà, elles n'y trouveraient pas toutes leur place.
  const aire = (p: Pt[]) => Math.abs(p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0)) / 2;
  const premieres = tirer();
  if (premieres.reduce((n, f) => n + aire(f.points), 0) <= 0.36 * largeur * hauteur) {
    for (let i = 0; i < 12; i++) {
      const posees = auHasard(i === 0 ? premieres : tirer(), alea, largeur, hauteur);
      if (posees) return [{ posees, hauteur: Math.max(...posees.flatMap((p) => p.points.map((x) => x[1]))) }];
    }
  }
  let meilleur: ReturnType<typeof enRangees> | null = null;
  const cle = (p: ReturnType<typeof enRangees>) => p.length * 1e4 + p.reduce((n, x) => n + x.hauteur, 0);
  for (let i = 0; i < 30; i++) {
    const pages = enRangees(tirer(), alea, largeur, hauteur);
    if (!meilleur || cle(pages) < cle(meilleur)) meilleur = pages;
  }
  return meilleur!;
}

/** L'angle d'une pièce en désordre : par pas de 15°, jamais tout à fait comme elle est rangée dans sa boîte. */
const angleAuHasard = (alea: () => number) => 15 * (1 + Math.floor(alea() * 23));

// ── La feuille ────────────────────────────────────────────────────────────

const consigne = (t: string) => `<div class="regle"><b>Consigne</b>${escapeHtml(t)}</div>`;
const LIGNE_DU_PRENOM = '<div class="sous">Prénom : ........................................</div>';

/** La feuille : un modèle — ou son petit livre —, le grand carré à découper, les pièces en désordre, ou les parallélogrammes. */
export function htmlTangram(r: ReglagesTangram, graine: number): string {
  const alea = hasard(graine);
  const titre = r.titre?.trim() || titreTangram(r);
  const page = (t: string, corps: string, avant = "") => `<div class="page tg-page"><div class="titre">${escapeHtml(t)}</div>${avant}${corps}</div>`;
  const e = r.cote / (2 * Math.SQRT2);

  if (r.exercice === "carre") {
    // Autant de grands carrés que la page en tient, chacun à la taille des pièces de la classe.
    const f = figureTangram("carre-7");
    const parLigne = Math.max(1, Math.floor((PAGE.portrait.largeur + 8) / (r.cote + 8)));
    const lignes = Math.max(1, Math.floor((PAGE.portrait.hauteur + 25 + 8) / (r.cote + 8)));
    const un = svgCarreADecouper(f, r.cote, r.dessin);
    const grille = Array.from({ length: lignes }, () => `<div class="tg-ligne">${Array.from({ length: parLigne }, () => un).join("")}</div>`).join("");
    return feuille(page(titre, `<div class="tg-carres">${grille}</div>`, consigne("Je découpe les sept pièces en suivant les traits.")), "tg");
  }

  if (r.exercice === "desordre" || r.exercice === "parallelogrammes") {
    const paras = r.exercice === "parallelogrammes";
    const tirer = () => {
      if (!paras) return melanger(alea, PIECES_TANGRAM).map((p) => tournee(p, angleAuHasard(alea), p === "para" && alea() < 0.5, e));
      // Six parallélogrammes : trois retournés, trois seulement tournés, mêlés.
      return melanger(alea, [true, true, true, false, false, false]).map((retourne) => tournee("para", angleAuHasard(alea), retourne, e));
    };
    const pages = eparpiller(tirer, alea);
    const texte = paras ? "Je pose ma pièce sur chaque forme, pour la cacher tout entière. Je peux la tourner, ou la retourner."
      : "Je pose chaque pièce du tangram sur la forme qui est la même.";
    return feuille(pages.map((p, i) => {
      const traces = p.posees.map((x): Trace => ({ points: x.points, ...aspect(x.piece, r.dessin) }));
      const dessin = svgMm(traces, PAGE.portrait.largeur, p.hauteur + 1);
      return page(pages.length > 1 ? `${titre} — ${i + 1}/${pages.length}` : titre, dessin, i === 0 ? LIGNE_DU_PRENOM + consigne(texte) : "");
    }).join(""), "tg");
  }

  // Un modèle à recouvrir, à la taille des pièces, plus petit, ou réduit pour tenir sur la page.
  const f = figureTangram(r.figure);
  const { reduction } = miseEnPageDuModele(r);
  const echelle = mmParUnite(f, r.cote) * (r.petit ? 0.5 : 1) * reduction;
  const n = f.pieces.length;
  const texte = r.petit ? "Je construis la figure à côté du modèle, avec les pièces du tangram."
    : r.dessin === "silhouette" ? "Je recouvre la silhouette avec les pièces du tangram : rien ne dépasse, aucun blanc ne reste."
      : "Je pose chaque pièce sur sa forme : rien ne dépasse, aucun blanc ne reste.";
  if (r.etapes && (r.dessin === "contours" || r.dessin === "couleur") && !r.petit) {
    // Le petit livre : une page par pièce, des plus grandes aux plus petites ; la pièce de la page est cernée.
    const ordre = [...f.pieces].sort((a, b) => PIECES_TANGRAM.indexOf(a.piece) - PIECES_TANGRAM.indexOf(b.piece)).map((p) => p.piece);
    return feuille(ordre.map((nouvelle, k) => {
      const cachees = new Set(ordre.slice(k + 1));
      return page(`${titre} — ${k + 1}/${n}`, `<div class="tg-modele">${svgFigure(f, echelle, r.dessin, { cachees, nouvelle })}</div>`,
        k === 0 ? consigne("Je pose les pièces dans l'ordre des pages : une pièce de plus à chaque page.") : "");
    }).join(""), "tg");
  }
  return feuille(page(titre, `<div class="tg-modele">${svgFigure(f, echelle, r.dessin)}</div>`, consigne(texte)), "tg");
}

/** Le grand carré à découper : les sept pièces, les traits bien marqués — noirs, ou blancs sur le tangram noir. */
function svgCarreADecouper(f: FigureTangram, cote: number, dessin: DessinTangram): string {
  const e = cote / 4, marge = 1;
  const traces = f.pieces.map((p): Trace => {
    const points = p.points.map(([x, y]): Pt => [x * e + marge, y * e + marge]);
    if (dessin === "silhouette") return { points, fond: NOIR, trait: "#fff", epaisseur: 1 };
    return { points, fond: dessin === "couleur" ? COULEURS_TANGRAM[p.piece] : "#fff", trait: ENCRE, epaisseur: 1.2 };
  });
  return svgMm(traces, cote + 2 * marge, cote + 2 * marge, "tg-carre");
}

/** Les marges de la page : 10 mm, sans la marge intérieure du document ; à l'horizontale pour un modèle qui y tient mieux. */
export function styleTangram(r: ReglagesTangram): string {
  const { paysage } = miseEnPageDuModele(r);
  return STYLE_TANGRAM + `\n  @page { size: A4 ${paysage ? "landscape" : "portrait"}; margin: 10mm; }\n  @media print { body { padding: 0; } }\n`;
}

export const STYLE_TANGRAM = `
  .feuille.tg .tg-page { text-align: center; }
  .feuille.tg .tg-page .titre, .feuille.tg .tg-page .sous, .feuille.tg .tg-page .regle { text-align: left; }
  .feuille.tg .tg-dessin, .feuille.tg .tg-carre { display: inline-block; vertical-align: top; }
  .feuille.tg .tg-modele { margin: 2mm 0 0; }
  .feuille.tg .tg-ligne { white-space: nowrap; }
  .feuille.tg .tg-ligne + .tg-ligne { margin-top: 6mm; }
  .feuille.tg .tg-ligne .tg-carre + .tg-carre { margin-left: 6mm; }
  @media screen { .feuille.tg svg { max-width: 100%; height: auto; } }
`;
