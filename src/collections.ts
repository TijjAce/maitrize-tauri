// Construire des collections de cardinal donné : le matériel de l'atelier.
//
// « Constituer une collection d'un cardinal donné » (programme de l'école
// maternelle, 2025) : jusqu'à trois, voire quatre objets avant 4 ans ; six à
// partir de 4 ans ; dix, voire au-delà, à partir de 5 ans. La collection à
// réaliser est donnée par une autre collection, par les doigts ou une
// constellation, par le nom du nombre — puis par son écriture chiffrée.
//
// Les situations viennent du guide « La construction du nombre à l'école
// maternelle » (2023) — les voyageurs, les bouchons des bouteilles — et des
// livrets d'accompagnement de 2025 — les poupées et leurs pommes avant
// 4 ans, le dortoir des oursons ensuite — : aller chercher, en un seul
// voyage, juste ce qu'il faut d'objets pour qu'il y en ait un sur chaque
// place, puis le commander, à l'oral et par écrit. L'atelier imprime ce
// qu'elles demandent : les fiches de places qu'on pose au fond de la boîte,
// les cartes-nombres des commandes, les bons de commande, la bande
// numérique, le bon panier de la grande section et la grille d'observation.
//
// Une fiche de places ne porte jamais son nombre : c'est à l'élève de le
// trouver. Une lettre discrète la désigne, et la clé est pour le maître.

import { escapeHtml } from "./print";
import { melanger } from "./hasard";
import { attributionPour, carte, feuille, pagesAvecRegle, pagesDeCartes, type FormatGrille } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import { reference } from "./references";

// ── Ce que l'atelier règle ────────────────────────────────────────────────

/** Jusqu'où va la collection à chaque âge, d'après le programme 2025. */
export const JUSQUA: Record<Niveau, number> = { PS: 3, MS: 6, GS: 10 };

/** Ce que le programme attend, âge par âge. */
export const REPERES: Record<Niveau, string> = {
  PS: "Constituer une collection de deux, trois, voire quatre objets : comme une collection donnée, comme des doigts ou une constellation, ou quand on dit combien — « Donne-moi trois voitures ».",
  MS: "Constituer une collection d'un cardinal donné jusqu'à six : d'après une collection, des doigts, une constellation ou le nom du nombre ; aller chercher en un seul trajet juste ce qu'il faut ; s'initier à l'écriture du nombre pour le commander.",
  GS: "Constituer une collection d'un cardinal donné jusqu'à dix, voire au-delà : d'après le nom du nombre ou son écriture chiffrée, et en réunissant des collections plus petites.",
};

export type Situation = "poupees" | "dortoir" | "voyageurs" | "garage" | "bouteilles" | "peinture";

/** Une situation de référence : les places qui attendent, les objets qu'on va chercher. */
export interface SituationDeReference {
  id: Situation;
  nom: string;
  /** Le mot et son picto ARASAAC. */
  place: { mot: string; pluriel: string; picto: number };
  objet: { mot: string; pluriel: string; picto: number; article: "un" | "une" };
  /** Ce qui doit être vrai à la fin, tel qu'on le dit aux élèves. */
  regle: string;
  /** « juste ce qu'il faut d'oursons ». */
  partitif: string;
  source: string;
}

export const SITUATIONS: SituationDeReference[] = [
  {
    id: "poupees", nom: "Les poupées à table",
    place: { mot: "assiette", pluriel: "assiettes", picto: 2532 }, objet: { mot: "pomme", pluriel: "pommes", picto: 2462, article: "une" },
    regle: "une pomme dans chaque assiette — pas d'assiette sans pomme, pas de pomme sans assiette", partitif: "de pommes",
    source: "le livret « Avant 4 ans » (2025)",
  },
  {
    id: "dortoir", nom: "Le dortoir des oursons",
    place: { mot: "lit", pluriel: "lits", picto: 2304 }, objet: { mot: "ourson", pluriel: "oursons", picto: 4945, article: "un" },
    regle: "un ourson dans chaque lit — pas de lit sans ourson, pas d'ourson sans lit", partitif: "d'oursons",
    source: "le livret « À partir de 4 ans » (2025)",
  },
  {
    id: "voyageurs", nom: "Le train des voyageurs",
    place: { mot: "siège", pluriel: "sièges", picto: 19520 }, objet: { mot: "voyageur", pluriel: "voyageurs", picto: 6628, article: "un" },
    regle: "un voyageur sur chaque siège — pas de siège sans voyageur, pas de voyageur sans siège", partitif: "de voyageurs",
    source: "le guide « La construction du nombre à l'école maternelle » (2023)",
  },
  {
    id: "garage", nom: "Le garage",
    place: { mot: "place", pluriel: "places", picto: 6283 }, objet: { mot: "voiture", pluriel: "voitures", picto: 2339, article: "une" },
    regle: "une voiture sur chaque place — pas de place sans voiture, pas de voiture sans place", partitif: "de voitures",
    source: "le guide « La construction du nombre à l'école maternelle » (2023), les voitures des oursons",
  },
  {
    id: "bouteilles", nom: "Les bouteilles et leurs bouchons",
    place: { mot: "bouteille", pluriel: "bouteilles", picto: 2288 }, objet: { mot: "bouchon", pluriel: "bouchons", picto: 7267, article: "un" },
    regle: "un bouchon sur chaque bouteille — pas de bouteille sans bouchon, pas de bouchon sans bouteille", partitif: "de bouchons",
    source: "le guide « La construction du nombre à l'école maternelle » (2023)",
  },
  {
    id: "peinture", nom: "Les pots de peinture",
    place: { mot: "pot", pluriel: "pots", picto: 4870 }, objet: { mot: "pinceau", pluriel: "pinceaux", picto: 2523, article: "un" },
    regle: "un pinceau dans chaque pot — pas de pot sans pinceau, pas de pinceau sans pot", partitif: "de pinceaux",
    source: "le livret « À partir de 4 ans » (2025), activités ritualisées",
  },
];

export const situationDe = (id: Situation) => SITUATIONS.find((s) => s.id === id) ?? SITUATIONS[0];

export type Forme = "fiches" | "cartes" | "bons" | "bande" | "panier" | "evaluation";

export const FORMES: { id: Forme; nom: string; quoi: string }[] = [
  { id: "fiches", nom: "Les fiches de places", quoi: "au fond de la boîte : les places où poser juste ce qu'il faut d'objets" },
  { id: "cartes", nom: "Les cartes-nombres", quoi: "« Donne-moi… » : la quantité en points, en doigts ou en chiffres" },
  { id: "bons", nom: "Les bons de commande", quoi: "commander à la mascotte, sans parler : le nombre écrit" },
  { id: "bande", nom: "La bande numérique", quoi: "pour lire et écrire le nombre qu'on commande" },
  { id: "panier", nom: "Le bon panier", quoi: "grande section : réunir deux collections pour trouver le bon panier" },
  { id: "evaluation", nom: "La grille d'observation", quoi: "l'évaluation : réussites et procédures de chaque élève" },
];

export const nomDeLaForme = (f: Forme) => FORMES.find((x) => x.id === f)?.nom ?? "Construire des collections";

export type Disposition = "rangee" | "constellation" | "vrac" | "groupes";

/** Comment les places sont disposées : une variable du guide, qui fait changer la procédure. */
export const DISPOSITIONS: { id: Disposition; nom: string; quoi: string }[] = [
  { id: "rangee", nom: "en rangée", quoi: "côte à côte, cinq par rangée : on peut faire correspondre un à un" },
  { id: "constellation", nom: "en constellation", quoi: "comme sur un dé — cinq et encore… au-delà de six : se reconnaît d'un coup d'œil" },
  { id: "vrac", nom: "en vrac", quoi: "sans ordre : il faut compter sans oublier ni recompter" },
  { id: "groupes", nom: "en deux groupes", quoi: "« quatre et encore un » : la quantité par ses parties" },
];

export type Representation = "points" | "doigts" | "chiffre";

export const REPRESENTATIONS: { id: Representation; nom: string }[] = [
  { id: "points", nom: "les points" },
  { id: "doigts", nom: "les doigts" },
  { id: "chiffre", nom: "le chiffre" },
];

export interface ReglagesCollections {
  niveau: Niveau;
  forme: Forme;
  situation: Situation;
  /** Les quantités travaillées, de… à… */
  de: number;
  a: number;
  dispositions: Disposition[];
  /** Les places dessinées comme dans la situation — lits, assiettes —, ou de simples ronds, vers l'abstraction. */
  places: "dessins" | "ronds";
  /** Une fiche par page, au fond d'une boîte de ramette ; sinon deux. */
  grandes: boolean;
  representations: Representation[];
  /** Le bon panier : les œufs des bons paniers rangés comme le message, en deux groupes — la première étape du guide. */
  commeLeMessage: boolean;
}

/** Ce qui change avec l'âge : les quantités du programme, la situation du livret, ce qui représente le nombre. */
export function reglagesDuNiveau(n: Niveau): Pick<ReglagesCollections, "de" | "a" | "situation" | "representations" | "places"> {
  return n === "PS" ? { de: 1, a: 3, situation: "poupees", representations: ["points", "doigts"], places: "dessins" }
    : n === "MS" ? { de: 1, a: 6, situation: "dortoir", representations: ["points", "doigts", "chiffre"], places: "dessins" }
    : { de: 4, a: 10, situation: "voyageurs", representations: ["points", "doigts", "chiffre"], places: "ronds" };
}

export const REGLAGES_COLLECTIONS: ReglagesCollections = {
  niveau: "MS", forme: "fiches", dispositions: ["rangee", "constellation"], grandes: true, commeLeMessage: true, ...reglagesDuNiveau("MS"),
};

export const QUANTITE_MAX = 10;

const parmi = <T extends string>(liste: readonly { id: T }[], v: unknown, defaut: T): T =>
  liste.some((x) => x.id === v) ? (v as T) : defaut;
const sousListe = <T extends string>(liste: readonly { id: T }[], v: unknown, defaut: T[]): T[] => {
  const gardes = liste.map((x) => x.id).filter((id) => Array.isArray(v) && v.includes(id));
  return gardes.length ? gardes : defaut;
};
const borne = (v: unknown, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.min(QUANTITE_MAX, Math.round(v))) : defaut;

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesCollections>): ReglagesCollections {
  const d = REGLAGES_COLLECTIONS;
  const niveau = NIVEAUX.some((n) => n.id === brut.niveau) ? (brut.niveau as Niveau) : d.niveau;
  const de = borne(brut.de, d.de);
  return {
    niveau,
    forme: parmi(FORMES, brut.forme, d.forme),
    situation: parmi(SITUATIONS, brut.situation, d.situation),
    de, a: Math.max(de, borne(brut.a, d.a)),
    dispositions: sousListe(DISPOSITIONS, brut.dispositions, d.dispositions),
    places: brut.places === "ronds" ? "ronds" : "dessins",
    grandes: brut.grandes !== false,
    representations: sousListe(REPRESENTATIONS, brut.representations, d.representations),
    commeLeMessage: brut.commeLeMessage !== false,
  };
}

/** Les quantités de la feuille, dans l'ordre. */
export const quantites = (r: Pick<ReglagesCollections, "de" | "a">): number[] =>
  Array.from({ length: Math.max(0, r.a - r.de + 1) }, (_, i) => r.de + i);

/** Les pictos que la feuille montre : la place et l'objet de la situation. */
export const idsDesImages = (r: Pick<ReglagesCollections, "situation">): number[] => {
  const s = situationDe(r.situation);
  return [s.place.picto, s.objet.picto];
};

/** Ce qui empêche la feuille de se faire, ou rien. */
export function cequiManque(r: ReglagesCollections): string | null {
  if (r.forme === "panier" && r.a < 2) return "Le bon panier réunit deux collections : il faut des quantités d'au moins deux.";
  return null;
}

// ── Les places d'une fiche ────────────────────────────────────────────────
//
// Les places se calculent dans une grille d'unités, puis à l'échelle de la
// zone : un rond y prend un peu moins d'une unité, et deux places voisines
// sont toujours à une unité au moins l'une de l'autre — rien ne se chevauche.

type Point = [number, number];

/** Les points d'un dé, sur trois colonnes et trois rangées. */
const FACES: Record<number, Point[]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
/** L'écart entre deux groupes : bien visible, pour qu'on voie deux parties. */
const ENTRE_GROUPES = 1.9;

const decale = (points: Point[], dx: number): Point[] => points.map(([x, y]) => [x + dx, y]);

/** Deux groupes : le second au plus de six, l'autre à sa droite. */
const deuxFaces = (a: number, b: number): Point[] => [...FACES[a], ...decale(FACES[b], 2 + ENTRE_GROUPES)];

/** La seconde partie d'une fiche « en deux groupes » : au moins un, et chaque groupe se lit comme un dé. */
export function partieDuGroupe(n: number, alea: () => number): number {
  const min = Math.max(1, n - 6);
  const max = Math.max(min, Math.floor(n / 2));
  return min + Math.floor(alea() * (max - min + 1));
}

/** La place qu'un rond prend dans son unité : moins en vrac, où les places bougent dans leur case. */
const PART_DU_ROND: Record<Disposition, number> = { rangee: 0.8, constellation: 0.8, groupes: 0.8, vrac: 0.6 };
/** De combien les places peuvent s'écarter quand la zone le permet : un dé se reconnaît serré. */
const AERATION: Record<Disposition, number> = { rangee: 1.25, constellation: 1, groupes: 1, vrac: 1.25 };

function motif(n: number, disposition: Disposition, rapport: number, alea: () => number): Point[] {
  if (n <= 1) return [[0, 0]];
  switch (disposition) {
    case "rangee":
      return Array.from({ length: n }, (_, i): Point => [i % 5, Math.floor(i / 5) * 1.3]);
    case "constellation":
      return n <= 6 ? FACES[n] : deuxFaces(5, n - 5);
    case "groupes": {
      const b = partieDuGroupe(n, alea);
      return deuxFaces(n - b, b);
    }
    case "vrac": {
      // Des cases deux fois plus nombreuses que les places, à la mesure de la zone ; on en prend au hasard, et la place bouge dans sa case.
      const cases = Math.ceil(n * 1.8) + 1;
      const colonnes = Math.max(2, Math.round(Math.sqrt(cases * rapport)));
      const lignes = Math.max(1, Math.ceil(cases / colonnes));
      const toutes = Array.from({ length: colonnes * lignes }, (_, i): Point => [i % colonnes, Math.floor(i / colonnes)]);
      return melanger(alea, toutes).slice(0, n).map(([x, y]): Point => [x + (alea() - 0.5) * 0.36, y + (alea() - 0.5) * 0.36]);
    }
  }
}

export interface Places {
  /** Le centre de chaque place, en mm depuis le coin de la zone. */
  centres: Point[];
  diametre: number;
}

/**
 * Les `n` places d'une fiche dans une zone de `largeur × hauteur` mm : le
 * motif de la disposition, à la plus grande échelle qui tient, centré. Les
 * places restent groupées quand elles sont peu nombreuses : une constellation
 * se reconnaît mieux serrée.
 */
export function placesDeLaFiche(n: number, disposition: Disposition, largeur: number, hauteur: number, diametreMax: number, alea: () => number): Places {
  const points = motif(n, disposition, largeur / hauteur, alea);
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const part = PART_DU_ROND[disposition];
  const echelleMax = Math.min(largeur / (maxX - minX + 1), hauteur / (maxY - minY + 1));
  const diametre = Math.min(diametreMax, echelleMax * part);
  const echelle = Math.min(echelleMax, (diametre / part) * AERATION[disposition]);
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
  return {
    diametre,
    centres: points.map(([x, y]): Point => [largeur / 2 + (x - cx) * echelle, hauteur / 2 + (y - cy) * echelle]),
  };
}

// ── Les dessins : constellations, doigts, paniers ─────────────────────────

const ENCRE = "#1c2233";

/** Une face de dé, cent unités de côté, décalée de `dx`. */
const faceDeDe = (k: number, dx: number, couleur = ENCRE) =>
  `<rect x="${dx + 3}" y="3" width="94" height="94" rx="16" fill="#fff" stroke="${ENCRE}" stroke-width="3"/>`
  + (FACES[k] ?? []).map(([x, y]) => `<circle cx="${dx + 25 + x * 25}" cy="${25 + y * 25}" r="9.5" fill="${couleur}"/>`).join("");

/** Les points d'un nombre : un dé jusqu'à six, puis cinq et encore… sur un second dé. */
export function pointsSvg(n: number, couleur = ENCRE): string {
  if (n <= 6) return `<svg class="cl-points" viewBox="0 0 100 100">${faceDeDe(n, 0, couleur)}</svg>`;
  return `<svg class="cl-points cl-deux" viewBox="0 0 212 100">${faceDeDe(5, 0, couleur)}${faceDeDe(n - 5, 112, couleur)}</svg>`;
}

/**
 * Une main, la paume vers nous, `leves` doigts levés en comptant comme on le
 * fait en France : le pouce d'abord, puis l'index, le majeur… La main gauche
 * est la droite retournée.
 */
function mainSvg(leves: number, gauche: boolean, dx: number): string {
  const trait = `fill="#fde3cf" stroke="${ENCRE}" stroke-width="2.2" stroke-linejoin="round"`;
  const leve = (rang: number) => leves > rang;
  // L'index, le majeur, l'annulaire, l'auriculaire : où ils sont, leur largeur, leur hauteur levés.
  const doigts = [{ x: 15, l: 9, haut: 9 }, { x: 25, l: 9, haut: 4 }, { x: 35, l: 9, haut: 8 }, { x: 45, l: 8, haut: 16 }];
  let corps = leve(0) ? `<rect x="0" y="0" width="9.5" height="27" rx="4.75" transform="translate(18 60) rotate(-32) translate(-4.75 -27)" ${trait}/>` : "";
  doigts.forEach((d, i) => {
    const haut = leve(i + 1) ? d.haut : 26;
    corps += `<rect x="${d.x}" y="${haut}" width="${d.l}" height="${48 - haut}" rx="${d.l / 2}" ${trait}/>`;
  });
  corps += `<rect x="13" y="34" width="42" height="40" rx="11" ${trait}/>`;
  if (!leve(0)) corps += `<rect x="17" y="49" width="23" height="9.5" rx="4.75" ${trait}/>`;
  return `<g transform="translate(${dx} 0)${gauche ? " translate(56 0) scale(-1 1)" : ""}">${corps}</g>`;
}

/** Le nombre sur les doigts : une main jusqu'à cinq, puis la main pleine et l'autre. */
export function doigtsSvg(n: number): string {
  if (n <= 5) return `<svg class="cl-doigts" viewBox="-4 0 64 76">${mainSvg(n, false, 0)}</svg>`;
  return `<svg class="cl-doigts cl-deux" viewBox="-4 0 134 76">${mainSvg(5, true, 0)}${mainSvg(n - 5, false, 66)}</svg>`;
}

/** Les points en rangées de cinq, comme dans une boîte de dix : sur la bande numérique. */
function rangeesDePointsSvg(n: number): string {
  const points = Array.from({ length: n }, (_, i) => `<circle cx="${6 + (i % 5) * 11}" cy="${6 + Math.floor(i / 5) * 11}" r="4.2" fill="${ENCRE}"/>`).join("");
  return `<svg class="cl-dix" viewBox="0 0 56 23">${points}</svg>`;
}

/** Un œuf à colorier, ou plein de sa couleur. */
const oeuf = (x: number, y: number, couleur = "#fff", taille = 1): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${6.2 * taille}" ry="${8 * taille}" fill="${couleur}" stroke="${ENCRE}" stroke-width="1.6"/>`;

/**
 * Un panier de `total` œufs à colorier. Rangés comme le message — deux
 * groupes —, ou en rangées de cinq, sans rien en dire.
 */
export function panierSvg(total: number, groupes: [number, number] | null): string {
  const centres: Point[] = [];
  let taille = 1;
  if (groupes) {
    const [a, b] = groupes;
    const colonnesA = Math.ceil(a / 2), colonnes = colonnesA + Math.ceil(b / 2);
    const pas = Math.min(13.6, 70 / (colonnes + 0.7));
    taille = Math.min(1, (pas - 1.4) / 12.4);
    const debut = 50 - ((colonnes - 1 + 0.7) * pas) / 2;
    const colonneDe = (i: number, groupe: number) => debut + (Math.floor(i / 2) + (groupe ? colonnesA + 0.7 : 0)) * pas;
    for (let i = 0; i < a; i++) centres.push([colonneDe(i, 0), 59 + (i % 2) * 19]);
    for (let i = 0; i < b; i++) centres.push([colonneDe(i, 1), 59 + (i % 2) * 19]);
  } else {
    for (let i = 0; i < total; i++) {
      const rang = Math.floor(i / 5), dansLeRang = Math.min(5, total - rang * 5);
      centres.push([50 + ((i % 5) - (dansLeRang - 1) / 2) * 13.6, 59 + rang * 19]);
    }
  }
  return `<svg class="cl-panier" viewBox="0 0 100 92">`
    + `<path d="M20 46 C20 6, 80 6, 80 46" fill="none" stroke="${ENCRE}" stroke-width="3.2"/>`
    + `<path d="M7 44 H93 L83 89 H17 Z" fill="#f4dfb2" stroke="${ENCRE}" stroke-width="2.2" stroke-linejoin="round"/>`
    + centres.map(([x, y]) => oeuf(x, y, "#fff", taille)).join("") + `</svg>`;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Des images, par identifiant de pictogramme. */
export type Images = Record<number, string>;

/** Le titre, sa ligne de sous-titre, et la référence de la feuille au bout — elle ne s'imprime pas (voir `references`). */
const titre = (t: string, sous = "", ref = "") =>
  `<div class="titre">${escapeHtml(t)}</div>${sous || ref ? `<div class="sous">${escapeHtml(sous)}${ref ? ` ${reference(ref)}` : ""}</div>` : ""}`;
const consigne = (t: string, quoi = "Consigne") => `<div class="regle"><b>${quoi}</b>${escapeHtml(t)}</div>`;
const jusqua = (r: ReglagesCollections) => (r.de === r.a ? `${r.a}` : `de ${r.de} à ${r.a}`);

/** L'objet et la place de la situation, côte à côte : « un ourson par lit ». */
function pairePictos(s: SituationDeReference, images: Images): string {
  const img = (p: { mot: string; picto: number }) => (images[p.picto] ? `<img src="${images[p.picto]}" alt="${escapeHtml(p.mot)}">` : "");
  return `<div class="cl-paire">${img(s.objet)}<span>${escapeHtml(`${s.objet.article} ${s.objet.mot} par ${s.place.mot}`)}</span>${img(s.place)}</div>`;
}

/** La consigne de la situation : « Va chercher, en une seule fois, juste ce qu'il faut d'oursons pour qu'il y ait… ». */
export const consigneDeLaSituation = (s: SituationDeReference) =>
  `Va chercher, en une seule fois, juste ce qu'il faut ${s.partitif} pour qu'il y ait ${s.regle}.`;

/** Le nom d'une fiche : une lettre, puis deux. Jamais son nombre. */
export const codeDeLaFiche = (i: number) => {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return i < 26 ? L[i] : L[Math.floor(i / 26) - 1] + L[i % 26];
};

/** Les fiches à imprimer : une par quantité et par disposition — une seule pour une place, où la disposition ne change rien. */
export function fichesDeLaFeuille(r: ReglagesCollections): { n: number; disposition: Disposition }[] {
  return quantites(r).flatMap((n) => (n === 1 ? [{ n, disposition: r.dispositions[0] }] : r.dispositions.map((disposition) => ({ n, disposition }))));
}

/** La hauteur d'une fiche, en mm : la page entière, ou sa moitié. */
const HAUTEUR_FICHE = { grande: 255, petite: 120 };
const LARGEUR_ZONE = 156;
/** Le plus grand rond : assez pour une figurine ; plus serait vide. */
const DIAMETRE_MAX = { grande: 46, petite: 34 };

function htmlFiches(r: ReglagesCollections, images: Images, alea: () => number): string {
  const s = situationDe(r.situation);
  const fiches = fichesDeLaFeuille(r);
  const format = r.grandes ? "grande" : "petite";
  const hauteurZone = HAUTEUR_FICHE[format] - 15;
  const dessin = r.places === "dessins" ? images[s.place.picto] : undefined;
  const fiche = (f: { n: number; disposition: Disposition }, i: number) => {
    const { centres, diametre } = placesDeLaFiche(f.n, f.disposition, LARGEUR_ZONE, hauteurZone, DIAMETRE_MAX[format], alea);
    const d = diametre.toFixed(1);
    const places = centres.map(([x, y]) => {
      const pos = `left:${(x - diametre / 2).toFixed(1)}mm;top:${(y - diametre / 2).toFixed(1)}mm;width:${d}mm;height:${d}mm`;
      return dessin ? `<img class="cl-dessin" src="${dessin}" alt="" style="${pos}">` : `<div class="cl-rond" style="${pos}"></div>`;
    }).join("");
    return `<div class="cl-fiche" style="height:${HAUTEUR_FICHE[format]}mm"><div class="cl-fiche-tete">${escapeHtml(s.nom)} · fiche ${codeDeLaFiche(i)}</div>`
      + `<div class="cl-zone" style="width:${LARGEUR_ZONE}mm;height:${hauteurZone}mm">${places}</div></div>`;
  };
  const toutes = fiches.map(fiche);
  const parPage = r.grandes ? 1 : 2;
  const pages: string[] = [];
  for (let i = 0; i < toutes.length; i += parPage) pages.push(`<div class="page"><div class="cl-fiches">${toutes.slice(i, i + parPage).join("")}</div></div>`);
  const nom = (d: Disposition) => DISPOSITIONS.find((x) => x.id === d)?.nom ?? d;
  // La clé, en colonnes : quarante fiches tiennent sur la première page, sous la consigne.
  const cle = `<div class="cl-cle corrige"><b>Pour le maître :</b><div class="cl-cle-fiches">${fiches.map((f, i) =>
    `<span><b>${codeDeLaFiche(i)}</b> ${f.n} ${escapeHtml(f.n > 1 ? s.place.pluriel : s.place.mot)}${f.n === 1 ? "" : `, ${nom(f.disposition)}`}</span>`).join("")}</div></div>`;
  const couverture = `<div class="page">${titre(`Les fiches de places — ${s.nom}`, `Une fiche au fond de chaque boîte, ${jusqua(r)} ${s.place.pluriel}.`, `${s.source.charAt(0).toUpperCase()}${s.source.slice(1)}.`)}`
    + pairePictos(s, images)
    + consigne(consigneDeLaSituation(s))
    + `<div class="cl-jeu"><b>Le jeu.</b> La réserve ${s.partitif} est loin des boîtes, hors de vue ; `
    + `on y retourne d'abord autant qu'on veut, puis une seule fois, avec un panier. Ce qu'on rapporte attend devant la boîte : `
    + `« Penses-tu avoir juste ce qu'il faut ? » — puis on pose un objet sur chaque place pour vérifier. Les fiches changent : plus de places, d'autres dispositions.</div>`
    + cle + `</div>`;
  return couverture + pages.join("");
}

/** Une représentation du nombre, dans une carte. */
const representation = (rep: Representation, n: number) =>
  rep === "points" ? pointsSvg(n) : rep === "doigts" ? doigtsSvg(n) : `<div class="cl-chiffre">${n}</div>`;

/** Les cartes-nombres : des carrés, trois par rangée. */
const CARTES_NOMBRES: FormatGrille = { colonnes: 3, lignes: 4, hauteurMm: 54, carre: true };

function htmlCartes(r: ReglagesCollections): string {
  const s = situationDe(r.situation);
  const reps = REPRESENTATIONS.map((x) => x.id).filter((id) => r.representations.includes(id));
  const cellules = quantites(r).map((n) => carte(reps.map((rep) => representation(rep, n)).join(""), `cl-carte r${reps.length}`));
  const regle = `« Donne-moi… » : le meneur tire une carte et demande autant ${s.partitif} qu'elle en montre ; `
    + `on vérifie en posant un objet sur chaque point, sur chaque doigt. Collée sur une boîte : « Mets dans la boîte autant de jetons qu'il y a de points ou de doigts. »`;
  return pagesAvecRegle(cellules, CARTES_NOMBRES, `${titre("Les cartes-nombres", `${jusqua(r)} : ${reps.map((x) => REPRESENTATIONS.find((y) => y.id === x)?.nom).join(", ")}.`)}${consigne(regle, "Règle du jeu")}`);
}

/** Les chiffres de 1 au plus grand nombre, pour recopier : un modèle au bas du bon. */
const modele = (a: number) => `<div class="cl-modele">${Array.from({ length: a }, (_, i) => `<span>${i + 1}</span>`).join("")}</div>`;

/** Les bons de commande : quatre par page, à découper. */
const BONS: FormatGrille = { colonnes: 2, lignes: 2, hauteurMm: 118, largeurMm: 80 };
const NOMBRE_DE_BONS = 6;

function htmlBons(r: ReglagesCollections, images: Images): string {
  const s = situationDe(r.situation);
  const picto = images[s.objet.picto] ? `<img src="${images[s.objet.picto]}" alt="${escapeHtml(s.objet.mot)}">` : `<span class="cl-bon-mot">${escapeHtml(s.objet.pluriel)}</span>`;
  const bon = `<div class="cl-bon"><div class="cl-bon-tete">Bon de commande</div><div class="cl-bon-prenom">Prénom : ………………………</div>`
    + `<div class="cl-bon-corps"><div class="cl-bon-case"></div>${picto}</div>${modele(r.a)}</div>`;
  const regle = `Compte les ${s.place.pluriel} de ta fiche, dis le nombre, puis écris-le sur ton bon : la mascotte ne comprend que les nombres écrits. `
    + `Elle te donne ce que tu as commandé ; tu vérifies en posant un objet sur chaque place.`;
  return pagesAvecRegle(Array.from({ length: NOMBRE_DE_BONS }, () => bon), BONS,
    `${titre(`Les bons de commande — ${s.nom}`, "Commander à la mascotte, sans parler.", "Livret « À partir de 4 ans » (2025).")}${consigne(regle)}`);
}

/** Une bande numérique de 1 au plus grand nombre : les points en rangées de cinq au-dessus de chaque chiffre. */
function htmlBande(r: ReglagesCollections): string {
  const a = Math.max(r.a, 3);
  const largeurCase = Math.min(18, Math.floor(160 / a));
  const bande = `<div class="cl-bande">${Array.from({ length: a }, (_, i) =>
    `<div class="cl-case" style="width:${largeurCase}mm">${rangeesDePointsSvg(i + 1)}<b>${i + 1}</b></div>`).join("")}</div>`;
  const format: FormatGrille = { colonnes: 1, lignes: 7, hauteurMm: 34, largeurMm: largeurCase * a + 2 };
  const regle = "Pour trouver le nombre à écrire, on pose la pince à linge sur 1, puis on l'avance d'une case pour chaque place, en disant les nombres ; "
    + "quand il n'y a plus de place, on s'arrête : c'est ce nombre-là qu'on recopie.";
  return pagesAvecRegle(Array.from({ length: 12 }, () => bande), format,
    `${titre(`La bande numérique, de 1 à ${a}`, "Une bande par élève, et la même en grand au mur.")}${consigne(regle, "Comment s'en servir")}`);
}

/** Les deux couleurs d'un message du bon panier. */
const COULEURS_PANIER: [string, string][][] = [[["vert", "#2f9e44"], ["rouge", "#e03131"]], [["bleu", "#1971c2"], ["jaune", "#f59f00"]]];

export interface MessagePanier { a: number; b: number; couleurs: [string, string][] }

/** Les messages du bon panier : deux quantités à colorier, dont la somme reste dans les nombres de la feuille. */
export function messagesDuPanier(r: ReglagesCollections, alea: () => number, combien = 6): MessagePanier[] {
  const totaux = quantites(r).filter((n) => n >= 2);
  const vus = new Set<string>();
  const messages: MessagePanier[] = [];
  for (let essai = 0; messages.length < combien && essai < 200 && totaux.length; essai++) {
    const total = totaux[Math.floor(alea() * totaux.length)];
    const a = 1 + Math.floor(alea() * (total - 1));
    if (vus.has(`${a}+${total - a}`) && essai < 150) continue;
    vus.add(`${a}+${total - a}`);
    messages.push({ a, b: total - a, couleurs: COULEURS_PANIER[messages.length % COULEURS_PANIER.length] });
  }
  return messages;
}

const MESSAGES: FormatGrille = { colonnes: 3, lignes: 4, hauteurMm: 54, carre: true };
const PANIERS: FormatGrille = { colonnes: 2, lignes: 3, hauteurMm: 80, carre: true };

function htmlPanier(r: ReglagesCollections, alea: () => number): string {
  const messages = messagesDuPanier(r, alea);
  const chiffres = r.representations.includes("chiffre");
  const partie = (n: number, [nom, teinte]: [string, string]) => chiffres
    ? `<div class="cl-partie"><b>${n}</b><svg viewBox="0 0 14 18" class="cl-oeuf">${oeuf(7, 9, teinte)}</svg><span>${escapeHtml(nom)}${n > 1 ? "s" : ""}</span></div>`
    : `<div class="cl-partie">${pointsSvg(n, teinte)}<span>${escapeHtml(nom)}${n > 1 ? "s" : ""}</span></div>`;
  const cartes = messages.map((m, i) => carte(`<div class="cl-numero">${i + 1}</div>${partie(m.a, m.couleurs[0])}<div class="cl-et">et</div>${partie(m.b, m.couleurs[1])}`, "cl-message"));
  // Le bon panier de chaque message, et des voisins : un œuf de moins, un œuf de plus.
  const bons = messages.map((m) => ({ total: m.a + m.b, groupes: r.commeLeMessage ? [m.a, m.b] as [number, number] : null }));
  const totaux = new Set(bons.map((p) => p.total));
  const voisins = [...totaux].flatMap((t) => [t - 1, t + 1]).filter((t) => t >= 2 && t <= QUANTITE_MAX && !totaux.has(t));
  const paniers = melanger(alea, [...bons, ...[...new Set(voisins)].slice(0, 4).map((total) => ({ total, groupes: null }))])
    .map((p) => carte(panierSvg(p.total, p.groupes), "cl-carte-panier"));
  const regle = "Lis ton message, et laisse-le sur ta table. Va chercher le panier qui a juste ce qu'il faut d'œufs pour faire ce que dit le message, "
    + "puis colorie. C'est réussi si les couleurs sont respectées et si tous les œufs sont coloriés.";
  const corrige = `<div class="page corrige">${titre("Le bon panier — pour le maître")}<ol class="cl-corrige">${messages.map((m) =>
    `<li>${m.a} ${m.couleurs[0][0]}${m.a > 1 ? "s" : ""} et ${m.b} ${m.couleurs[1][0]}${m.b > 1 ? "s" : ""} : le panier de ${m.a + m.b} œufs</li>`).join("")}</ol></div>`;
  return pagesAvecRegle(cartes, MESSAGES, `${titre("Le bon panier", "Les messages, puis les paniers, à poser loin des tables.", "Guide « La construction du nombre à l'école maternelle » (2023) : du nombre au calcul.")}${consigne(regle, "Règle du jeu")}`)
    + pagesDeCartes(paniers, PANIERS, titre("Les paniers")) + corrige;
}

/** Ce qu'on observe, d'après le programme 2025 et les livrets : la réussite, puis la procédure. */
export const OBSERVABLES: Record<Niveau, string[]> = {
  PS: ["Pose un objet sur chaque place", "Juste ce qu'il faut, en plusieurs trajets", "Juste ce qu'il faut, en un seul trajet (jusqu'à 3)", "« Donne-moi deux, trois… »", "D'après des doigts ou des points"],
  MS: ["Un seul trajet, jusqu'à 6", "« Donne-moi… », jusqu'à 6", "D'après des doigts ou une constellation", "Commande à l'oral", "Commande par écrit, en chiffres"],
  GS: ["Un seul trajet, jusqu'à 10", "« Donne-moi… », jusqu'à 10", "D'après l'écriture chiffrée", "En réunissant deux collections", "Commande par écrit"],
};

function htmlEvaluation(r: ReglagesCollections): string {
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  const colonnes = OBSERVABLES[r.niveau];
  const ligne = `<tr><td></td>${colonnes.map(() => "<td></td>").join("")}<td></td></tr>`;
  return `<div class="page">${titre("Grille d'observation — construire des collections", `Constituer une collection d'un cardinal donné · ${r.niveau}, ${age}.`, "Programme de l'école maternelle 2025.")}`
    + `<table class="cl-grille"><thead><tr><th>Prénom</th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}<th>Procédure</th></tr></thead>`
    + `<tbody>${Array.from({ length: 12 }, () => ligne).join("")}</tbody></table>`
    + `<div class="sous cl-pied">✓ réussi · ~ en cours · ✗ pas encore. Procédure : T un à un (terme à terme) · V d'un coup d'œil · D en décomposant (« deux et encore un ») · C en comptant · S en surcomptant. `
    + `Seul avec l'élève, une fiche de places et la réserve éloignée, un seul trajet ; puis « Donne-moi… ». Refaire l'observation quelques semaines plus tard.</div></div>`;
}

/** La feuille du matériel choisi, avec ses images ; `alea` place le vrac et mêle les paniers. */
export function htmlCollections(r: ReglagesCollections, images: Images, alea: () => number): string {
  const corps = {
    fiches: () => htmlFiches(r, images, alea),
    cartes: () => htmlCartes(r),
    bons: () => htmlBons(r, images),
    bande: () => htmlBande(r),
    panier: () => htmlPanier(r, alea),
    evaluation: () => htmlEvaluation(r),
  }[r.forme]();
  const ids = r.forme === "fiches" || r.forme === "bons" ? idsDesImages(r).filter((id) => images[id]) : [];
  return feuille(`${corps}${attributionPour(ids)}`, "cl");
}

export const STYLE_COLLECTIONS = `
  .feuille.cl .cl-paire { display: flex; align-items: center; gap: 3mm; margin: 0 0 4mm; font-size: 13px; color: #3b4256; }
  .feuille.cl .cl-paire img { width: 16mm; height: 16mm; object-fit: contain; margin: 0; }
  .feuille.cl .cl-jeu { font-size: 12px; line-height: 1.55; margin: 0 0 5mm; }
  .feuille.cl .cl-cle { font-size: 11.5px; border-top: 1px solid #cfd4e2; padding-top: 2mm; }
  .feuille.cl .cl-cle-fiches { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8mm 4mm; margin-top: 1.5mm; }
  .feuille.cl .cl-cle-fiches b { display: inline-block; min-width: 6mm; }
  .feuille.cl .cl-fiches { display: flex; flex-direction: column; gap: 6mm; }
  .feuille.cl .cl-fiche { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; gap: 2mm; overflow: hidden; }
  .feuille.cl .cl-fiche-tete { font-size: 8.5px; color: #9aa0b4; height: 4mm; line-height: 4mm; }
  .feuille.cl .cl-zone { position: relative; flex: none; }
  .feuille.cl .cl-rond { position: absolute; border: 0.8mm solid ${ENCRE}; border-radius: 50%; box-sizing: border-box; background: #fff; }
  .feuille.cl .cl-dessin { position: absolute; object-fit: contain; margin: 0; max-width: none; max-height: none; }
  .feuille.cl .cl-carte { gap: 2.5mm; }
  .feuille.cl .cl-carte svg { display: block; width: auto; flex: none; }
  .feuille.cl .cl-carte.r1 svg { height: 34mm; max-width: 46mm; }
  .feuille.cl .cl-carte.r1 svg.cl-deux { height: 22mm; }
  .feuille.cl .cl-carte.r2 svg { height: 20mm; max-width: 44mm; }
  .feuille.cl .cl-carte.r2 svg.cl-deux { height: 17mm; }
  .feuille.cl .cl-carte.r3 svg { height: 15mm; max-width: 44mm; }
  .feuille.cl .cl-carte.r3 svg.cl-deux { height: 13mm; }
  .feuille.cl .cl-chiffre { font-size: 30px; font-weight: 800; line-height: 1; }
  .feuille.cl .cl-carte.r1 .cl-chiffre { font-size: 96px; }
  .feuille.cl .cl-carte.r2 .cl-chiffre { font-size: 48px; }
  .feuille.cl .cl-bon { border: 1px dashed #9aa0b4; display: flex; flex-direction: column; gap: 3mm; padding: 5mm; box-sizing: border-box; }
  .feuille.cl .cl-bon-tete { font-size: 15px; font-weight: 800; }
  .feuille.cl .cl-bon-prenom { font-size: 11px; color: #687087; }
  .feuille.cl .cl-bon-corps { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5mm; }
  .feuille.cl .cl-bon-case { width: 36mm; height: 36mm; border: 0.8mm solid ${ENCRE}; border-radius: 3mm; }
  .feuille.cl .cl-bon-corps img { width: 24mm; height: 24mm; object-fit: contain; margin: 0; }
  .feuille.cl .cl-bon-mot { font-size: 14px; font-weight: 700; }
  .feuille.cl .cl-modele { display: flex; gap: 1.2mm; justify-content: center; flex-wrap: wrap; }
  .feuille.cl .cl-modele span { border: 1px solid #cfd4e2; border-radius: 1mm; min-width: 5mm; text-align: center; font-size: 12px; font-weight: 700; }
  .feuille.cl .cl-bande { display: flex; border: 0.6mm solid ${ENCRE}; border-radius: 1.5mm; overflow: hidden; height: 28mm; box-sizing: border-box; }
  .feuille.cl .cl-case { display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 1.5mm 0; box-sizing: border-box; }
  .feuille.cl .cl-case + .cl-case { border-left: 0.4mm solid ${ENCRE}; }
  .feuille.cl .cl-case b { font-size: 26px; line-height: 1; }
  .feuille.cl .cl-dix { width: 88%; height: auto; }
  .feuille.cl .cl-message { position: relative; gap: 2mm; }
  .feuille.cl .cl-numero { position: absolute; top: 2mm; left: 2.5mm; font-size: 10px; color: #9aa0b4; }
  .feuille.cl .cl-partie { display: flex; align-items: center; gap: 2mm; font-size: 12px; font-weight: 700; }
  .feuille.cl .cl-partie b { font-size: 34px; line-height: 1; }
  .feuille.cl .cl-partie .cl-points { height: 12mm; width: auto; }
  .feuille.cl .cl-partie .cl-points.cl-deux { height: 10mm; }
  .feuille.cl .cl-oeuf { width: 8mm; height: 10mm; }
  .feuille.cl .cl-et { font-size: 12px; color: #687087; }
  .feuille.cl .cl-carte-panier { padding: 3mm; }
  .feuille.cl .cl-panier { width: 100%; height: 100%; }
  .feuille.cl .cl-corrige { font-size: 13px; line-height: 1.7; }
  .feuille.cl .cl-grille { width: 100%; border-collapse: collapse; font-size: 11px; }
  .feuille.cl .cl-grille th, .feuille.cl .cl-grille td { border: 1px solid #9aa0b4; padding: 1.5mm; vertical-align: top; }
  .feuille.cl .cl-grille th { background: #f2f4f8; text-align: left; }
  .feuille.cl .cl-grille td { height: 11mm; }
  .feuille.cl .cl-grille th:first-child { width: 28mm; }
  .feuille.cl .cl-pied { margin-top: 3mm; }
`;
