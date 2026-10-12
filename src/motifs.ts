// ── Les motifs organisés : reproduire, compléter, prolonger, trouver l'intrus ──
//
// « Se familiariser avec les motifs organisés » ouvre les trois livrets
// d'accompagnement de mathématiques de la maternelle (Éduscol, 2025) :
// - avant 4 ans (séquence 1, p. 6-15) : un seul type de motif, le motif
//   répétitif — A B, A BB, A BBB —, qu'on mémorise et qu'on reproduit à
//   l'identique : le fil à linge de la mascotte, modèle à distance, plusieurs
//   voyages puis un seul ;
// - à partir de 4 ans (séquence 1, p. 7-13) : reconnaître, décrire,
//   compléter, prolonger un motif répétitif, y repérer un intrus — avec la
//   bande autocorrective, le motif d'un côté, l'intrus repéré de l'autre ;
// - à partir de 5 ans (séquence 1, p. 7-16) : le motif évolutif — A B AA BB
//   AAA BBB, A B A BB A BBB, A B AA B AAA B, A B C AA BB CC… —, sa structure
//   indépendante des objets, et les motifs de même structure parmi quatre.
//
// L'atelier imprime ce que ces séances demandent : le fil modèle, les fils
// des élèves et les chaussettes à découper ; des bandes modèles, des bandes à
// compléter, à prolonger, avec un intrus ; les éléments à découper ; le
// corrigé. Les éléments sont des chaussettes, des formes ou des pictos : une
// chaussette a un tissu qui la distingue — à pois, rayée, unie —, une forme
// sa silhouette : le motif se lit aussi photocopié en noir et blanc.

import { escapeHtml } from "./print";
import { HAUTEUR_UTILE_MM, attributionPour, feuille, pagesDeCartes, pagesRectoVerso, type FormatGrille } from "./cartesImprimables";
import { melanger } from "./hasard";

export type NiveauMotifs = "PS" | "MS" | "GS";
export const NIVEAUX_MOTIFS: { id: NiveauMotifs; age: string; repere: string }[] = [
  { id: "PS", age: "avant 4 ans", repere: "Mémoriser un motif répétitif très simple et le reproduire à l'identique." },
  { id: "MS", age: "à partir de 4 ans", repere: "Reconnaître un motif répétitif à ses régularités, le décrire, le compléter, le prolonger, y repérer un intrus." },
  { id: "GS", age: "à partir de 5 ans", repere: "Repérer et décrire la structure d'un motif évolutif ; la reconnaître avec d'autres objets ; créer des motifs." },
];

export type ExerciceMotifs = "fil" | "reproduire" | "completer" | "prolonger" | "intrus" | "structure";

export const EXERCICES_MOTIFS: { id: ExerciceMotifs; nom: string; quoi: string; niveaux: NiveauMotifs[] }[] = [
  { id: "fil", nom: "Le fil à linge de la mascotte", quoi: "le fil modèle à poser loin, les fils des élèves et les chaussettes à découper", niveaux: ["PS", "MS"] },
  { id: "reproduire", nom: "Reproduire de mémoire", quoi: "la bande modèle à poser loin ou à cacher, les bandes des élèves et les éléments à découper", niveaux: ["PS", "MS", "GS"] },
  { id: "completer", nom: "Compléter", quoi: "des bandes à trous, et ce qui manque à découper", niveaux: ["PS", "MS", "GS"] },
  { id: "prolonger", nom: "Prolonger", quoi: "le début du motif et les cases de la suite", niveaux: ["MS", "GS"] },
  { id: "intrus", nom: "Trouver l'intrus", quoi: "une case ne suit pas la règle ; la bande autocorrective au dos", niveaux: ["MS", "GS"] },
  { id: "structure", nom: "La même règle", quoi: "parmi quatre motifs, ceux qui suivent la règle du modèle, avec d'autres dessins", niveaux: ["GS"] },
];

export type StructureMotif = "AB" | "ABB" | "ABBB" | "AAB" | "AABB" | "ABC" | "evAB" | "evABn" | "evAnB" | "evABC";

export const STRUCTURES: { id: StructureMotif; nom: string; evolutif: boolean; niveaux: NiveauMotifs[] }[] = [
  { id: "AB", nom: "A B A B…", evolutif: false, niveaux: ["PS", "MS", "GS"] },
  { id: "ABB", nom: "A BB A BB…", evolutif: false, niveaux: ["PS", "MS", "GS"] },
  { id: "ABBB", nom: "A BBB A BBB…", evolutif: false, niveaux: ["PS", "MS", "GS"] },
  { id: "AAB", nom: "AA B AA B…", evolutif: false, niveaux: ["MS", "GS"] },
  { id: "AABB", nom: "AA BB AA BB…", evolutif: false, niveaux: ["MS", "GS"] },
  { id: "ABC", nom: "A B C A B C…", evolutif: false, niveaux: ["MS", "GS"] },
  { id: "evAB", nom: "A B AA BB AAA BBB (évolutif)", evolutif: true, niveaux: ["GS"] },
  { id: "evABn", nom: "A B A BB A BBB (évolutif)", evolutif: true, niveaux: ["GS"] },
  { id: "evAnB", nom: "A B AA B AAA B (évolutif)", evolutif: true, niveaux: ["GS"] },
  { id: "evABC", nom: "A B C AA BB CC AAA BBB CCC (évolutif)", evolutif: true, niveaux: ["GS"] },
];

export const estEvolutif = (s: StructureMotif) => STRUCTURES.find((x) => x.id === s)?.evolutif ?? false;

/** Les lettres du motif de base d'un motif répétitif : « ABB » → A, B, B. */
const BASE: Partial<Record<StructureMotif, number[]>> = {
  AB: [0, 1], ABB: [0, 1, 1], ABBB: [0, 1, 1, 1], AAB: [0, 0, 1], AABB: [0, 0, 1, 1], ABC: [0, 1, 2],
};

/** Les étapes d'un motif évolutif : à l'étape k, ce qui s'ajoute. */
function etape(s: StructureMotif, k: number): number[] {
  const n = (i: number, fois: number) => Array.from({ length: fois }, () => i);
  switch (s) {
    case "evAB": return [...n(0, k), ...n(1, k)];
    case "evABn": return [0, ...n(1, k)];
    case "evAnB": return [...n(0, k), 1];
    case "evABC": return [...n(0, k), ...n(1, k), ...n(2, k)];
    default: return BASE[s] ?? [0, 1];
  }
}

/**
 * La suite du motif, élément par élément (0 pour A, 1 pour B, 2 pour C) :
 * le motif de base répété jusqu'à `longueur` cases ; un motif évolutif, ses
 * `etapes` premières étapes.
 */
export function suiteDuMotif(s: StructureMotif, longueur: number, etapes = 3): number[] {
  if (estEvolutif(s)) return Array.from({ length: etapes }, (_, k) => etape(s, k + 1)).flat();
  const base = BASE[s] ?? [0, 1];
  return Array.from({ length: longueur }, (_, i) => base[i % base.length]);
}

/** Combien d'éléments différents le motif emploie : deux, ou trois. */
export const elementsEmployes = (s: StructureMotif) => (s === "ABC" || s === "evABC" ? 3 : 2);

// ── Les éléments ──────────────────────────────────────────────────────────

export type Matiere = "chaussettes" | "formes" | "pictos";
export const MATIERES: { id: Matiere; nom: string }[] = [
  { id: "chaussettes", nom: "Des chaussettes" },
  { id: "formes", nom: "Des formes" },
  { id: "pictos", nom: "Des images" },
];

export type Forme = "rond" | "carre" | "triangle" | "etoile" | "coeur" | "losange";
export const FORMES_MOTIFS: { id: Forme; nom: string; feminin: boolean; pluriel: string }[] = [
  { id: "rond", nom: "rond", feminin: false, pluriel: "ronds" },
  { id: "carre", nom: "carré", feminin: false, pluriel: "carrés" },
  { id: "triangle", nom: "triangle", feminin: false, pluriel: "triangles" },
  { id: "etoile", nom: "étoile", feminin: true, pluriel: "étoiles" },
  { id: "coeur", nom: "cœur", feminin: false, pluriel: "cœurs" },
  { id: "losange", nom: "losange", feminin: false, pluriel: "losanges" },
];

/** Les couleurs, et leurs accords : « une étoile verte », « deux chaussettes rouges ». */
export const COULEURS_MOTIFS: { id: string; hex: string; m: string; f: string; mp: string; fp: string }[] = [
  { id: "rouge", hex: "#e03131", m: "rouge", f: "rouge", mp: "rouges", fp: "rouges" },
  { id: "jaune", hex: "#fcc419", m: "jaune", f: "jaune", mp: "jaunes", fp: "jaunes" },
  { id: "bleu", hex: "#1c7ed6", m: "bleu", f: "bleue", mp: "bleus", fp: "bleues" },
  { id: "vert", hex: "#37b24d", m: "vert", f: "verte", mp: "verts", fp: "vertes" },
  { id: "orange", hex: "#f76707", m: "orange", f: "orange", mp: "orange", fp: "orange" },
  { id: "violet", hex: "#7048e8", m: "violet", f: "violette", mp: "violets", fp: "violettes" },
  { id: "rose", hex: "#f06595", m: "rose", f: "rose", mp: "roses", fp: "roses" },
  { id: "marron", hex: "#8b5a2b", m: "marron", f: "marron", mp: "marron", fp: "marron" },
];

export interface ElementMotif {
  forme: Forme;
  couleur: string;
  /** Le picto, quand la matière est « des images ». */
  picto: number | null;
  mot: string;
}

const couleurDe = (id: string) => COULEURS_MOTIFS.find((c) => c.id === id) ?? COULEURS_MOTIFS[0];
const formeDe = (id: Forme) => FORMES_MOTIFS.find((f) => f.id === id) ?? FORMES_MOTIFS[0];

/** Le tissu d'une chaussette, d'après sa place : à pois, rayée, unie — un motif qui se voit sans la couleur. */
const TISSUS = ["pois", "rayures", "uni"] as const;

let numero = 0;

/** Une chaussette dessinée, pointe à droite, de sa couleur et de son tissu. */
function chaussette(couleur: string, tissu: (typeof TISSUS)[number]): string {
  const id = `mo-ch-${++numero}`;
  const forme = "M30 6 H62 V50 Q62 58 70 62 L84 69 Q95 75 90 86 Q85 95 72 91 L40 78 Q30 74 30 62 Z";
  const motif = tissu === "pois"
    ? `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.6" fill="#fff"/></pattern>`
    : tissu === "rayures"
      ? `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="5" fill="#fff" fill-opacity=".85"/></pattern>`
      : "";
  return `<svg class="mo-svg" viewBox="0 0 100 100" aria-hidden="true">${motif ? `<defs>${motif}</defs>` : ""}`
    + `<path d="${forme}" fill="${couleur}" stroke="#1c2233" stroke-width="3" stroke-linejoin="round"/>`
    + (motif ? `<path d="${forme}" fill="url(#${id})"/>` : "")
    + `<rect x="30" y="6" width="32" height="10" fill="#fff" fill-opacity=".55" stroke="#1c2233" stroke-width="3"/></svg>`;
}

/** Une forme dessinée, de sa couleur, cernée de noir. */
function formeSvg(f: Forme, couleur: string): string {
  const trait = `fill="${couleur}" stroke="#1c2233" stroke-width="4" stroke-linejoin="round"`;
  const dessin = {
    rond: `<circle cx="50" cy="50" r="36" ${trait}/>`,
    carre: `<rect x="16" y="16" width="68" height="68" rx="3" ${trait}/>`,
    triangle: `<polygon points="50,12 88,84 12,84" ${trait}/>`,
    etoile: `<polygon points="50,8 61,38 93,38 67,57 77,89 50,70 23,89 33,57 7,38 39,38" ${trait}/>`,
    coeur: `<path d="M50 86 C18 64 8 46 14 32 C20 18 40 16 50 32 C60 16 80 18 86 32 C92 46 82 64 50 86 Z" ${trait}/>`,
    losange: `<polygon points="50,8 90,50 50,92 10,50" ${trait}/>`,
  }[f];
  return `<svg class="mo-svg" viewBox="0 0 100 100" aria-hidden="true">${dessin}</svg>`;
}

/** Le dessin d'un élément du motif, à sa place (0, 1 ou 2) : la place donne son tissu à une chaussette. */
export function dessinElement(e: ElementMotif, place: number, matiere: Matiere, images: Record<number, string>): string {
  if (matiere === "chaussettes") return chaussette(couleurDe(e.couleur).hex, TISSUS[place % TISSUS.length]);
  if (matiere === "formes") return formeSvg(e.forme, couleurDe(e.couleur).hex);
  const src = e.picto != null ? images[e.picto] : undefined;
  return src ? `<img src="${src}" alt="${escapeHtml(e.mot)}">` : `<span class="mo-mot">${escapeHtml(e.mot || "?")}</span>`;
}

/** L'élément nommé, au singulier ou au pluriel : « une chaussette jaune », « deux carrés bleus ». */
export function nomElement(e: ElementMotif, matiere: Matiere, combien = 1): string {
  const nombre = ["", "une", "deux", "trois", "quatre"][combien] ?? String(combien);
  if (matiere === "pictos") return combien === 1 ? (e.mot || "une image") : `${nombre} fois : ${e.mot || "l'image"}`;
  const c = couleurDe(e.couleur);
  if (matiere === "chaussettes") return combien === 1 ? `une chaussette ${c.f}` : `${nombre} chaussettes ${c.fp}`;
  const f = formeDe(e.forme);
  const article = combien === 1 ? (f.feminin ? "une" : "un") : nombre;
  return combien === 1 ? `${article} ${f.nom} ${f.feminin ? c.f : c.m}` : `${article} ${f.pluriel} ${f.feminin ? c.fp : c.mp}`;
}

// ── Les réglages ──────────────────────────────────────────────────────────

export interface ReglagesMotifs {
  niveau: NiveauMotifs;
  exercice: ExerciceMotifs;
  structure: StructureMotif;
  matiere: Matiere;
  elements: ElementMotif[];
  /** Combien de bandes, de fils ou de cartes pour les élèves. */
  combien: number;
  /** Les éléments à découper, pour les poser au lieu de les dessiner. */
  decouper: boolean;
  /** Trouver l'intrus : la bande autocorrective, imprimée au dos. */
  autocorrective: boolean;
}

export const ELEMENTS_PAR_DEFAUT: ElementMotif[] = [
  { forme: "rond", couleur: "jaune", picto: null, mot: "" },
  { forme: "carre", couleur: "rouge", picto: null, mot: "" },
  { forme: "triangle", couleur: "bleu", picto: null, mot: "" },
];

/** Ce que chaque niveau prend d'abord : le fil à linge et A B avant 4 ans, compléter A BB à 4 ans, le motif évolutif à 5 ans. */
export function reglagesDuNiveau(n: NiveauMotifs): Pick<ReglagesMotifs, "exercice" | "structure" | "matiere" | "combien"> {
  return n === "PS" ? { exercice: "fil", structure: "AB", matiere: "chaussettes", combien: 6 }
    : n === "MS" ? { exercice: "completer", structure: "ABB", matiere: "formes", combien: 6 }
      : { exercice: "reproduire", structure: "evAB", matiere: "formes", combien: 4 };
}

export const REGLAGES_MOTIFS: ReglagesMotifs = {
  niveau: "PS", ...reglagesDuNiveau("PS"), elements: ELEMENTS_PAR_DEFAUT, decouper: true, autocorrective: true,
};

/** Les réglages enregistrés, réparés : ce qui manque ou ne se connaît pas reprend sa valeur par défaut. */
export function reglagesMotifsSurs(brut: Partial<ReglagesMotifs>): ReglagesMotifs {
  const niveau = NIVEAUX_MOTIFS.some((n) => n.id === brut.niveau) ? brut.niveau! : REGLAGES_MOTIFS.niveau;
  const defaut = reglagesDuNiveau(niveau);
  const exercice = EXERCICES_MOTIFS.some((e) => e.id === brut.exercice) ? brut.exercice! : defaut.exercice;
  const structure = STRUCTURES.some((s) => s.id === brut.structure) ? brut.structure! : defaut.structure;
  const elements = ELEMENTS_PAR_DEFAUT.map((d, i) => {
    const e = (Array.isArray(brut.elements) ? brut.elements[i] : undefined) as Partial<ElementMotif> | undefined;
    return {
      forme: FORMES_MOTIFS.some((f) => f.id === e?.forme) ? e!.forme! : d.forme,
      couleur: COULEURS_MOTIFS.some((c) => c.id === e?.couleur) ? e!.couleur! : d.couleur,
      picto: typeof e?.picto === "number" ? e.picto : null,
      mot: typeof e?.mot === "string" ? e.mot : "",
    };
  });
  return {
    niveau, exercice, structure, elements,
    matiere: MATIERES.some((m) => m.id === brut.matiere) ? brut.matiere! : defaut.matiere,
    combien: Number.isInteger(brut.combien) ? Math.max(1, Math.min(12, brut.combien!)) : defaut.combien,
    decouper: brut.decouper !== false,
    autocorrective: brut.autocorrective !== false,
  };
}

/** Ce qui manque pour fabriquer la feuille, ou rien. */
export function cequiManque(r: ReglagesMotifs): string | null {
  const n = elementsEmployes(r.structure);
  const elements = r.elements.slice(0, n);
  if (r.matiere === "pictos" && elements.some((e) => e.picto == null && !e.mot.trim())) return `Choisissez les ${n} images du motif.`;
  if (r.matiere !== "pictos") {
    const vus = new Set(elements.map((e) => (r.matiere === "chaussettes" ? e.couleur : `${e.forme}-${e.couleur}`)));
    if (vus.size < n) return r.matiere === "chaussettes" ? "Les chaussettes doivent être de couleurs différentes." : "Les formes du motif doivent être différentes.";
  }
  return null;
}

/** Les images à charger : celles des éléments, quand ce sont des pictos. */
export const idsDesImages = (r: ReglagesMotifs): number[] =>
  r.matiere === "pictos" ? [...new Set(r.elements.map((e) => e.picto).filter((x): x is number => x != null))] : [];

// ── Les bandes ────────────────────────────────────────────────────────────

/** La taille d'une case, en mm : grande avant 4 ans, plus petite quand le motif s'allonge. */
function tailleDeCase(r: ReglagesMotifs, cases: number): number {
  const max = r.niveau === "PS" ? 26 : r.niveau === "MS" ? 21 : 18;
  // Une bande tient sur sa ligne jusqu'à 12 cases ; au-delà, elle passe à la ligne suivante.
  return Math.max(12, Math.min(max, Math.floor(162 / Math.min(12, Math.max(1, cases))) - 1));
}

/** La longueur d'un motif répétitif : assez pour voir trois fois le motif de base, pas plus que la ligne. */
function longueurRepetitive(r: ReglagesMotifs): number {
  const base = (BASE[r.structure] ?? [0, 1]).length;
  const cible = r.niveau === "PS" ? 6 : r.niveau === "MS" ? 8 : 12;
  return Math.max(cible, base * 3 > 12 ? base * 2 : Math.ceil(cible / base) * base);
}

export type Case = { el: number | null; intrus?: boolean; trou?: boolean };

/** Une bande de cases : chaque case dessine son élément, ou reste vide, en pointillés. */
function bande(r: ReglagesMotifs, cases: Case[], images: Record<number, string>, marquerIntrus = false): string {
  const t = tailleDeCase(r, cases.length);
  return `<div class="mo-bande" style="--case:${t}mm">${cases.map((c) => {
    const classe = c.el == null ? "mo-case mo-vide" : `mo-case${marquerIntrus && c.intrus ? " mo-intrus" : ""}`;
    return `<span class="${classe}">${c.el == null ? "" : dessinElement(r.elements[c.el], c.el, r.matiere, images)}</span>`;
  }).join("")}</div>`;
}

const pleine = (suite: number[]): Case[] => suite.map((el) => ({ el }));

/** La hauteur d'une bande sur la page, en mm : ses rangées de cases, et l'écart qui la suit. */
function hauteurDeBande(r: ReglagesMotifs, cases: number): number {
  const t = tailleDeCase(r, cases);
  return Math.ceil(cases / Math.max(1, Math.floor(162 / t))) * t + 5;
}

/** Ce que prennent le titre, la ligne du prénom et la consigne en haut de la première page. */
const ENTETE_MM = 48;

/**
 * Des bandes, des fils ou des cartes répartis en pages, chacun entier : la
 * première page a l'en-tête, les suivantes la place qu'il laisse. Rien ne
 * passe seul en bas d'une page ni ne s'y coupe.
 */
function enPages(entete: string, blocs: { html: string; hauteur: number }[], classe = "mo-bandes", pageClasse = "page"): string {
  const pages: string[][] = [[]];
  let reste = HAUTEUR_UTILE_MM - ENTETE_MM;
  for (const b of blocs) {
    if (b.hauteur > reste && pages[pages.length - 1].length) { pages.push([]); reste = HAUTEUR_UTILE_MM - 12; }
    pages[pages.length - 1].push(b.html);
    reste -= b.hauteur;
  }
  return pages.map((p, i) => `<div class="${pageClasse}">${i === 0 ? entete : ""}<div class="${classe}">${p.join("")}</div></div>`).join("");
}

/** Des trous dans la suite, hors des deux premières cases : un avant 4 ans, deux ou trois ensuite. */
function avecTrous(suite: number[], niveau: NiveauMotifs, alea: () => number): Case[] {
  const n = niveau === "PS" ? 1 : niveau === "MS" ? 2 : 3;
  const places = melanger(alea, suite.map((_, i) => i).slice(2)).slice(0, n);
  return suite.map((el, i) => (places.includes(i) ? { el: null, trou: true } : { el }));
}

/** Un intrus dans la suite, hors des deux premières cases : un autre élément que celui qu'attend la règle. */
export function avecIntrus(suite: number[], employes: number, alea: () => number): { cases: Case[]; place: number } {
  const place = 2 + Math.floor(alea() * (suite.length - 2));
  // Un élément du motif à la mauvaise place, ou un élément qu'il n'emploie pas : le troisième, quand il n'en a que deux.
  const possibles = [0, 1, 2].filter((x) => x !== suite[place]);
  const el = possibles[Math.floor(alea() * possibles.length)];
  void employes;
  return { cases: suite.map((x, i) => (i === place ? { el, intrus: true } : { el: x })), place };
}

/** Les éléments à découper : un par case vide, mélangés, en cartes carrées. */
function aDecouper(r: ReglagesMotifs, manquants: number[], images: Record<number, string>, titre: string): string {
  if (!r.decouper || !manquants.length) return "";
  const cote = Math.min(26, tailleDeCase(r, 1) + 2);
  const format: FormatGrille = { colonnes: Math.floor(165 / cote), lignes: Math.floor(250 / cote), hauteurMm: cote, carre: true };
  const cellules = manquants.map((el) => `<div class="carte mo-piece">${dessinElement(r.elements[el], el, r.matiere, images)}</div>`);
  return pagesDeCartes(cellules, format, `<div class="titre">${escapeHtml(titre)}</div>`);
}

// ── Les consignes ─────────────────────────────────────────────────────────

const regle = (t: string) => `<div class="regle">${t}</div>`;
/** Ce qu'il faut savoir — la règle du motif —, à part de la consigne : il ne s'imprime que si on le demande (voir optionsFeuille). */
const rappel = (t: string) => `<div class="rappel">${t}</div>`;
const titre = (t: string, sous = "") => `<div class="titre">${escapeHtml(t)}</div>${sous ? `<div class="sous">${escapeHtml(sous)}</div>` : ""}`;
const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';

/** La règle du motif, dite avec ses éléments : « Une chaussette jaune, puis deux chaussettes rouges, et je recommence. » */
export function regleDuMotif(r: ReglagesMotifs): string {
  const nom = (el: number, n: number) => nomElement(r.elements[el], r.matiere, n);
  if (!estEvolutif(r.structure)) {
    const base = BASE[r.structure] ?? [0, 1];
    const groupes: { el: number; n: number }[] = [];
    for (const el of base) {
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.el === el) dernier.n++; else groupes.push({ el, n: 1 });
    }
    const texte = groupes.map((g) => nom(g.el, g.n)).join(", puis ");
    return `${texte.charAt(0).toUpperCase()}${texte.slice(1)}, et je recommence, toujours dans le même ordre.`;
  }
  const premiere = etape(r.structure, 1).map((el) => nom(el, 1)).join(", puis ");
  const plus = r.structure === "evABn" ? `${nom(1, 1)} de plus à chaque fois`
    : r.structure === "evAnB" ? `${nom(0, 1)} de plus à chaque fois`
      : r.structure === "evABC" ? "un de plus de chaque, à chaque fois"
        : "un de plus de chaque, à chaque fois";
  return `D'abord ${premiere} ; puis le motif grandit : ${plus}.`;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Le fil à linge : la mascotte y a étendu ses chaussettes selon la règle ; les fils des élèves n'ont que la première. */
function filALinge(r: ReglagesMotifs, suite: number[], vide: boolean, images: Record<number, string>): string {
  const t = r.niveau === "PS" ? 25 : 21;
  return `<div class="mo-fil" style="--case:${t}mm">${suite.map((el, i) => `<span class="mo-pince">${!vide || i === 0
    ? `<span class="mo-linge">${dessinElement(r.elements[el], el, "chaussettes", images)}</span>` : `<span class="mo-linge mo-vide"></span>`}</span>`).join("")}</div>`;
}

function feuilleFil(r: ReglagesMotifs, images: Record<number, string>): string {
  const suite = suiteDuMotif(r.structure, r.niveau === "PS" ? 6 : 7);
  // La page du modèle est celle de l'adulte : la règle s'y dit, comme dans le livret, pour la verbaliser avec les élèves.
  const modele = `<div class="page">${titre("Le fil à linge de la mascotte", "Le modèle : à accrocher loin des élèves — au coin poupées —, ou à cacher.")}
    ${filALinge(r, suite, false, images)}
    <div class="mo-note">La règle, à dire avec les élèves : « ${escapeHtml(regleDuMotif({ ...r, matiere: "chaussettes" }))} »<br>
    Séance 2 : plusieurs voyages pour regarder le modèle. Séance 3 : un seul voyage.</div></div>`;
  const hauteurFil = (r.niveau === "PS" ? 25 : 21) + 22;
  const fils = Array.from({ length: r.combien }, () => ({ html: `<div class="mo-fil-eleve">${filALinge(r, suite, true, images)}</div>`, hauteur: hauteurFil }));
  const eleves = enPages(`${titre("Mon fil à linge")}${TETE}${regle("Je regarde comment la mascotte a étendu ses chaussettes. Je retiens la règle. J'étends mes chaussettes comme elle, sur mon fil. Je compare avec son fil, chaussette par chaussette.")}`, fils, "mo-fils");
  const manquants = Array.from({ length: r.combien }, () => suite.slice(1)).flat();
  return modele + eleves + aDecouper({ ...r, matiere: "chaussettes" }, manquants, images, "Les chaussettes à découper");
}

function feuilleReproduire(r: ReglagesMotifs, images: Record<number, string>): string {
  const suite = suiteDuMotif(r.structure, longueurRepetitive(r));
  const modele = `<div class="page">${titre("Le modèle", "À poser loin des élèves, ou à cacher : on le regarde, on le retient, on revient le refaire.")}
    ${bande(r, pleine(suite), images)}<div class="mo-note">La règle, à dire avec les élèves : « ${escapeHtml(regleDuMotif(r))} »</div></div>`;
  const bandes = Array.from({ length: r.combien }, () => ({ html: bande(r, suite.map((el, i) => ({ el: i === 0 ? el : null })), images), hauteur: hauteurDeBande(r, suite.length) }));
  const eleves = enPages(`${titre("Je refais le motif")}${TETE}${regle("Je regarde le modèle et je retiens sa règle. Je refais le même motif sur ma bande, sans le modèle sous les yeux. Je compare avec le modèle, case par case.")}`, bandes);
  const manquants = Array.from({ length: r.combien }, () => suite.slice(1)).flat();
  return modele + eleves + aDecouper(r, manquants, images, "Les éléments à découper");
}

function feuilleCompleter(r: ReglagesMotifs, images: Record<number, string>, alea: () => number): string {
  const lignes = Array.from({ length: r.combien }, () => {
    const suite = suiteDuMotif(r.structure, longueurRepetitive(r));
    return { suite, cases: avecTrous(suite, r.niveau, alea) };
  });
  const page = enPages(`${titre("Je complète le motif")}${TETE}${rappel(regleDuMotif(r))}`
    + `${regle(`Je trouve la règle du motif. Je complète chaque case vide${r.decouper ? " avec l'élément qui manque" : " : je dessine l'élément qui manque"}.`)}`,
    lignes.map((l) => ({ html: bande(r, l.cases, images), hauteur: hauteurDeBande(r, l.cases.length) })));
  const manquants = melanger(alea, lignes.flatMap((l) => l.cases.flatMap((c, i) => (c.trou ? [l.suite[i]] : []))));
  const corrige = enPages(titre("Je complète le motif — corrigé"), lignes.map((l) => ({ html: bande(r, pleine(l.suite), images), hauteur: hauteurDeBande(r, l.suite.length) })),
    "mo-bandes", "page corrige");
  return page + aDecouper(r, manquants, images, "Les éléments à découper") + corrige;
}

function feuilleProlonger(r: ReglagesMotifs, images: Record<number, string>): string {
  const evolutif = estEvolutif(r.structure);
  // Un motif répétitif : deux fois le motif de base, puis la suite ; un motif évolutif : deux étapes, puis la troisième.
  const debut = evolutif ? suiteDuMotif(r.structure, 0, 2) : suiteDuMotif(r.structure, (BASE[r.structure] ?? [0, 1]).length * 2);
  const suite = evolutif ? suiteDuMotif(r.structure, 0, 3) : suiteDuMotif(r.structure, Math.max(longueurRepetitive(r), debut.length + 4));
  const cases: Case[] = suite.map((el, i) => (i < debut.length ? { el } : { el: null }));
  const bandes = Array.from({ length: r.combien }, () => ({ html: bande(r, cases, images), hauteur: hauteurDeBande(r, cases.length) }));
  const page = enPages(`${titre("Je continue le motif")}${TETE}${rappel(regleDuMotif(r))}`
    + `${regle(evolutif ? "Je trouve comment le motif grandit. Je fais l'étape suivante dans les cases vides." : "Je trouve la règle du motif. Je le continue jusqu'au bout de la bande.")}`, bandes);
  const manquants = Array.from({ length: r.combien }, () => suite.slice(debut.length)).flat();
  const corrige = `<div class="page corrige">${titre("Je continue le motif — corrigé")}${bande(r, pleine(suite), images)}</div>`;
  return page + aDecouper(r, manquants, images, "Les éléments à découper") + corrige;
}

function feuilleIntrus(r: ReglagesMotifs, images: Record<number, string>, alea: () => number): string {
  const evolutif = estEvolutif(r.structure);
  const lignes = Array.from({ length: r.combien }, () => avecIntrus(evolutif ? suiteDuMotif(r.structure, 0, 3) : suiteDuMotif(r.structure, longueurRepetitive(r)), elementsEmployes(r.structure), alea));
  const consigne = regle(`Je trouve la règle du motif. J'entoure l'intrus : la case qui ne suit pas la règle.${r.autocorrective ? " Je retourne la bande pour vérifier." : ""}`);
  if (r.autocorrective) {
    // La bande autocorrective : le motif avec son intrus au recto, l'intrus repéré au verso, à découper.
    const rectos = lignes.map((l) => `<div class="carte mo-auto">${bande(r, l.cases, images)}</div>`);
    const versos = lignes.map((l) => `<div class="carte mo-auto">${bande(r, l.cases, images, true)}</div>`);
    const format: FormatGrille = { colonnes: 1, lignes: Math.min(6, Math.max(1, lignes.length)), hauteurMm: Math.min(40, tailleDeCase(r, lignes[0]?.cases.length ?? 8) + 14) };
    return pagesRectoVerso(rectos, versos, format, `${titre("Trouve l'intrus")}${TETE}${consigne}`);
  }
  const page = enPages(`${titre("Trouve l'intrus")}${TETE}${consigne}`, lignes.map((l) => ({ html: bande(r, l.cases, images), hauteur: hauteurDeBande(r, l.cases.length) })));
  const corrige = enPages(titre("Trouve l'intrus — corrigé"), lignes.map((l) => ({ html: bande(r, l.cases, images, true), hauteur: hauteurDeBande(r, l.cases.length) })),
    "mo-bandes", "page corrige");
  return page + corrige;
}

/** D'autres formes et d'autres couleurs pour la même règle : la structure ne dépend pas des objets. */
function autresElements(alea: () => number): ElementMotif[] {
  const formes = melanger(alea, FORMES_MOTIFS.map((f) => f.id));
  const couleurs = melanger(alea, COULEURS_MOTIFS.map((c) => c.id));
  return [0, 1, 2].map((i) => ({ forme: formes[i], couleur: couleurs[i], picto: null, mot: "" }));
}

function feuilleStructure(r: ReglagesMotifs, images: Record<number, string>, alea: () => number): string {
  const memeFamille = STRUCTURES.filter((s) => s.evolutif === estEvolutif(r.structure) && s.id !== r.structure && elementsEmployes(s.id) <= 3);
  const cartes = Array.from({ length: r.combien }, () => {
    const autres = melanger(alea, memeFamille).slice(0, 2).map((s) => s.id);
    const choix = melanger(alea, [r.structure, r.structure, ...autres]).map((s) => ({ s, bon: s === r.structure, elements: autresElements(alea) }));
    return choix;
  });
  const motif = (rr: ReglagesMotifs, s: StructureMotif, marque = false) =>
    bande({ ...rr, structure: s }, pleine(estEvolutif(s) ? suiteDuMotif(s, 0, 3) : suiteDuMotif(s, 9)), images, marque);
  const modele = motif(r, r.structure);
  const carte = (choix: (typeof cartes)[number], corrige: boolean) => `<div class="mo-carte-structure"><div class="mo-modele"><b>Le modèle</b>${modele}</div>`
    + choix.map((c, i) => `<div class="mo-choix${corrige && c.bon ? " mo-bon" : ""}"><b>${"ABCD"[i]}</b>${motif({ ...r, matiere: "formes", elements: c.elements }, c.s)}</div>`).join("") + "</div>";
  const HAUTEUR_CARTE = 46;
  const page = enPages(`${titre("La même règle")}${TETE}${regle("Je regarde le motif modèle et je trouve sa règle. J'entoure les motifs qui suivent la même règle, même avec d'autres dessins.")}`,
    cartes.map((c) => ({ html: carte(c, false), hauteur: HAUTEUR_CARTE })), "mo-cartes");
  const corrige = enPages(titre("La même règle — corrigé"), cartes.map((c) => ({ html: carte(c, true), hauteur: HAUTEUR_CARTE })), "mo-cartes", "page corrige");
  return page + corrige;
}

/** La feuille de l'exercice choisi ; `alea` place les trous, les intrus, les motifs à comparer. */
export function htmlMotifs(r: ReglagesMotifs, images: Record<number, string>, alea: () => number): string {
  numero = 0;
  const corps = {
    fil: () => feuilleFil(r, images),
    reproduire: () => feuilleReproduire(r, images),
    completer: () => feuilleCompleter(r, images, alea),
    prolonger: () => feuilleProlonger(r, images),
    intrus: () => feuilleIntrus(r, images, alea),
    structure: () => feuilleStructure(r, images, alea),
  }[r.exercice]();
  return feuille(`${corps}${attributionPour(idsDesImages(r))}`, "mo");
}

export const STYLE_MOTIFS = `
  .feuille.mo .mo-bandes { display: flex; flex-direction: column; gap: 5mm; margin-top: 2mm; }
  .feuille.mo .mo-bande { display: flex; flex-wrap: wrap; gap: 0; }
  .feuille.mo .mo-case { width: var(--case); height: var(--case); border: 1.5px solid #1c2233; margin: 0 -1.5px -1.5px 0; display: flex;
    align-items: center; justify-content: center; box-sizing: border-box; padding: 1mm; background: #fff; }
  /* La case à remplir se voit : pointillés foncés, fond gris clair — même photocopiée. */
  .feuille.mo .mo-case.mo-vide { border: 2px dashed #4a5168; background: #f1f3f8; }
  .feuille.mo .mo-case.mo-intrus { position: relative; }
  .feuille.mo .mo-case.mo-intrus::after { content: ""; position: absolute; inset: -1.2mm; border: 1mm solid #e03131; border-radius: 50%; }
  .feuille.mo .mo-svg { width: 100%; height: 100%; display: block; }
  .feuille.mo .mo-case img, .feuille.mo .mo-piece img { max-width: 100%; max-height: 100%; object-fit: contain; margin: 0; }
  .feuille.mo .mo-mot { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.1; }
  .feuille.mo .mo-piece { padding: 1.5mm; }
  .feuille.mo .mo-fil { position: relative; display: flex; gap: 1.5mm; padding-top: 6mm; margin: 6mm 0 2mm; border-top: 2.5px solid #8b5a2b; }
  .feuille.mo .mo-pince { position: relative; width: var(--case); display: flex; justify-content: center; }
  .feuille.mo .mo-pince::before { content: ""; position: absolute; top: -9mm; left: 50%; width: 2.6mm; height: 7mm; margin-left: -1.3mm;
    background: #d9a066; border: 1px solid #8b5a2b; border-radius: 1mm; }
  .feuille.mo .mo-linge { width: var(--case); height: var(--case); display: block; }
  .feuille.mo .mo-linge.mo-vide { border: 2px dashed #4a5168; border-radius: 3mm; box-sizing: border-box; background: #f1f3f8; }
  .feuille.mo .mo-fil-eleve { margin-bottom: 8mm; page-break-inside: avoid; }
  .feuille.mo .mo-fils { padding-top: 3mm; }
  .feuille.mo .mo-note { font-size: 12px; color: #687087; margin-top: 4mm; }
  .feuille.mo .mo-auto { justify-content: center; padding: 3mm; }
  .feuille.mo .mo-carte-structure { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 2.5mm 3mm; margin-bottom: 3mm; page-break-inside: avoid;
    display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; }
  .feuille.mo .mo-modele { grid-column: 1 / -1; background: #f7f8fc; border-radius: 2mm; padding: 1.5mm 2mm; display: flex; align-items: center; gap: 3mm; }
  .feuille.mo .mo-modele b, .feuille.mo .mo-choix b { font-size: 12px; flex: none; }
  .feuille.mo .mo-choix { padding: 1mm; border-radius: 2mm; display: flex; align-items: center; gap: 2mm; }
  .feuille.mo .mo-choix.mo-bon { outline: 1mm solid #37b24d; }
  .feuille.mo .mo-carte-structure .mo-case { width: 8mm; height: 8mm; padding: 0.5mm; }
`;
