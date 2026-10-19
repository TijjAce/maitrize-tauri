// Se repérer avec les nombres au cycle 2 : la demi-droite graduée et les
// nombres ordinaux.
//
// Programme de mathématiques du cycle 2 (2024), exemples de réussite. La
// demi-droite : au CP, « associer un nombre à un point sur une demi-droite
// graduée, en faisant le lien avec la distance qui sépare ce point de
// l'origine du repère » — la règle graduée en est le point d'appui — ; au
// CE1 et au CE2, placer un nombre ou trouver celui d'un point sur une
// demi-droite graduée « de un en un, ou de dix en dix, ou de cent en cent »,
// de mille en mille au CE2, et compléter une bande lacunaire. Les ordinaux :
// « La voiture blanche est la quatrième voiture » ; « Le jeton est caché sous
// le sixième gobelet en partant de la gauche » ; le rang d'un nombre dans une
// liste ; « Je suis le troisième dans la file. Combien y a-t-il de personnes
// devant moi ? » ; au CE1, la course d'EPS et le Tour de France ; les suites
// répétitives puis évolutives — « quelle est la dix-neuvième lettre ? ». Les
// nombres sont tirés au sort ; le corrigé suit, sur sa page.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { choisir, entier, fr } from "./nombres";
import { nombreEnLettres } from "./nombresEnLettres";

export type ClasseReperage = "CP" | "CE1" | "CE2";
export type ExerciceReperage =
  | "dd-unites" | "dd-placer" | "dd-lire" | "dd-manquants" | "dd-pas" | "bande-lacunaire" | "dd-evaluation"
  | "ord-file" | "ord-gobelets" | "ord-ecrire" | "ord-devant" | "ord-liste" | "ord-suites" | "ord-suites-evolutives" | "ord-evaluation";

export interface ReglagesReperage {
  exercice: ExerciceReperage;
  classe: ClasseReperage;
  /** Le titre de la feuille, quand on en écrit un ; sinon, celui de l'exercice. */
  titre?: string;
}

// ── Les deux ateliers de Fabriquer ────────────────────────────────────────
//
// « La demi-droite graduée » et « Les nombres ordinaux » fabriquent les
// feuilles des séquences de la demi-droite et des ordinaux (voir
// demarchesReperage.ts), qui s'y rouvrent telles qu'elles sont : chaque
// feuille de séquence a son générateur (demande de l'enseignant, octobre
// 2026).

export type AtelierReperage = "demiDroite" | "ordinaux";

/** Les exercices de chaque atelier, et les classes où les exemples du programme les placent. */
export const EXERCICES_REPERAGE: Record<AtelierReperage, { id: ExerciceReperage; classes: ClasseReperage[] }[]> = {
  demiDroite: [
    { id: "dd-unites", classes: ["CP", "CE1"] }, { id: "dd-placer", classes: ["CP", "CE1", "CE2"] }, { id: "dd-lire", classes: ["CP", "CE1", "CE2"] },
    { id: "dd-manquants", classes: ["CP", "CE1", "CE2"] }, { id: "dd-pas", classes: ["CE1", "CE2"] }, { id: "bande-lacunaire", classes: ["CP", "CE1", "CE2"] },
    { id: "dd-evaluation", classes: ["CP", "CE1", "CE2"] },
  ],
  ordinaux: [
    { id: "ord-file", classes: ["CP", "CE1"] }, { id: "ord-gobelets", classes: ["CP"] }, { id: "ord-ecrire", classes: ["CP", "CE1"] },
    { id: "ord-devant", classes: ["CP", "CE1"] }, { id: "ord-liste", classes: ["CP", "CE1"] }, { id: "ord-suites", classes: ["CP", "CE1"] },
    { id: "ord-suites-evolutives", classes: ["CE1"] }, { id: "ord-evaluation", classes: ["CP", "CE1"] },
  ],
};

/** Les classes de chaque atelier : la demi-droite du CP au CE2, les ordinaux au CP et au CE1, comme le programme. */
export const CLASSES_REPERAGE: Record<AtelierReperage, ClasseReperage[]> = { demiDroite: ["CP", "CE1", "CE2"], ordinaux: ["CP", "CE1"] };

export const REGLAGES_DEMI_DROITE: ReglagesReperage = { exercice: "dd-placer", classe: "CP", titre: "" };
export const REGLAGES_ORDINAUX: ReglagesReperage = { exercice: "ord-file", classe: "CP", titre: "" };

/** L'atelier d'un exercice. */
export const atelierDeLExercice = (e: ExerciceReperage): AtelierReperage => (e.startsWith("ord-") ? "ordinaux" : "demiDroite");

/** Des réglages lisibles, quoi qu'on ait gardé : une classe de l'atelier, et un exercice qui y a cours. */
export function reglagesReperageSurs(atelier: AtelierReperage, brut: Partial<ReglagesReperage> | null | undefined): ReglagesReperage {
  const classes = CLASSES_REPERAGE[atelier];
  const classe = classes.find((c) => c === brut?.classe) ?? classes[0];
  const permis = EXERCICES_REPERAGE[atelier].filter((e) => e.classes.includes(classe));
  const exercice = permis.find((e) => e.id === brut?.exercice)?.id ?? permis[0].id;
  return { exercice, classe, titre: typeof brut?.titre === "string" ? brut.titre : "" };
}

/** Le titre d'un exercice, à sa classe : celui que la feuille imprime quand on n'en a pas écrit. */
export function titreParDefaut(r: Pick<ReglagesReperage, "exercice" | "classe">): string {
  switch (r.exercice) {
    case "dd-unites": return "Compter les unités depuis 0";
    case "dd-placer": return "Placer des nombres sur la demi-droite";
    case "dd-lire": return "Lire le nombre d'un point";
    case "dd-manquants": return "Les nombres qui manquent";
    case "dd-pas": return "Trouver le pas de la graduation";
    case "bande-lacunaire": return "La bande des nombres";
    case "dd-evaluation": return "Évaluation — la demi-droite graduée";
    case "ord-file": return r.classe === "CP" ? "Le train et ses wagons" : "L'arrivée de la course";
    case "ord-gobelets": return "Sous quel gobelet ?";
    case "ord-ecrire": return "Écrire les nombres ordinaux";
    case "ord-devant": return "Devant moi, derrière moi";
    case "ord-liste": return "Le rang d'un nombre dans une liste";
    case "ord-suites": return "Les suites qui se répètent";
    case "ord-suites-evolutives": return "Les suites qui grandissent";
    case "ord-evaluation": return "Évaluation — les nombres ordinaux";
  }
}

/** Le titre de la feuille : celui qu'on a écrit, ou celui de l'exercice. */
export const titreReperage = (r: ReglagesReperage) => r.titre?.trim() || titreParDefaut(r);

const NOIR = "#1c2233", BLEU = "#2f6fd1", ROUGE = "#d64545", GRIS = "#9aa0b4";
const COULEURS: { nom: string; hex: string }[] = [
  { nom: "rouge", hex: "#e05252" }, { nom: "bleu", hex: "#4a86e8" }, { nom: "vert", hex: "#38a169" }, { nom: "jaune", hex: "#f2c94c" },
];

const SOURCE = '<span class="reference">Programme de mathématiques du cycle 2, 2024.</span>';
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;
const corrige = (titre: string, corps: string) => `<div class="page corrige"><div class="titre">${titre} — corrigé</div>${corps}</div>`;
const BLANC = '<span class="rp-blanc"></span>';
const n2 = (v: number) => String(Math.round(v * 100) / 100);

// ── Les ordinaux ──────────────────────────────────────────────────────────

/** « premier », « deuxième », « vingt et unième », « quatre-vingtième », « centième ». */
export function ordinalEnLettres(n: number): string {
  if (n === 1) return "premier";
  // « quatre-vingts », « deux cents » perdent leur s ; « trois » garde le sien.
  const t = nombreEnLettres(n).replace(/(vingt|cent)s$/, "$1");
  if (/cinq$/.test(t)) return `${t}uième`;
  if (/neuf$/.test(t)) return `${t.slice(0, -1)}vième`;
  if (/e$/.test(t)) return `${t.slice(0, -1)}ième`;
  return `${t}ième`;
}

/** « 1<sup>er</sup> », « 3<sup>e</sup> ». */
export const ordinalEnChiffres = (n: number) => `${n}<sup>${n === 1 ? "er" : "e"}</sup>`;

// ── La demi-droite graduée ────────────────────────────────────────────────

/** Une demi-droite graduée, ou une portion : ses graduations, ce qui est écrit dessous, ses cases, ses points. */
interface Droite {
  /** Le nombre de la première graduation, et l'écart d'une graduation à la suivante. */
  debut: number;
  pas: number;
  graduations: number;
  /** La première graduation est l'origine — 0 — : le trait commence là ; sinon, il continue à gauche, en pointillés. */
  origine: boolean;
  /** Les graduations dont le nombre est écrit dessous. */
  ecrits: number[];
  /** Les graduations qui ont une case à remplir dessous. */
  cases?: number[];
  /** Les points nommés, montrés : leur nombre est à trouver. */
  points?: { nom: string; g: number }[];
  /** Les points à placer : le corrigé seul les montre. */
  aPlacer?: { nom: string; g: number }[];
  /** Une graduation sur `majeures` est plus longue. */
  majeures?: number;
  /** L'unité, montrée sur le premier intervalle. */
  unite?: boolean;
}

const valeur = (d: Droite, g: number) => d.debut + g * d.pas;

/** La demi-droite en SVG, en millimètres : 180 de large. Au corrigé, les cases sont remplies et les points placés. */
function svgDroite(d: Droite, corrige: boolean): string {
  const W = 180, H = 30, y = 15;
  const x0 = d.origine ? 8 : 16, x1 = 168;
  const e = (x1 - x0) / d.graduations;
  const X = (g: number) => x0 + g * e;
  const p: string[] = [];
  if (!d.origine) p.push(`<line x1="2" y1="${y}" x2="${x0}" y2="${y}" stroke="${NOIR}" stroke-width="0.6" stroke-dasharray="1.2 1.2"/>`);
  p.push(`<line x1="${x0}" y1="${y}" x2="${x1 + 7}" y2="${y}" stroke="${NOIR}" stroke-width="0.6"/>`,
    `<polygon points="${x1 + 10},${y} ${x1 + 6.5},${y - 1.8} ${x1 + 6.5},${y + 1.8}" fill="${NOIR}"/>`);
  for (let g = 0; g <= d.graduations; g++) {
    const longue = d.ecrits.includes(g) || (d.majeures ? g % d.majeures === 0 : false);
    const h = longue ? 3.4 : 2.2;
    p.push(`<line x1="${n2(X(g))}" y1="${y - h}" x2="${n2(X(g))}" y2="${y + h}" stroke="${NOIR}" stroke-width="${longue ? 0.55 : 0.35}"/>`);
  }
  if (d.unite) {
    p.push(`<path d="M${n2(X(0))} ${y - 4.5}l0 -1.4l${n2(e)} 0l0 1.4" fill="none" stroke="${BLEU}" stroke-width="0.4"/>`,
      `<text x="${n2(X(0) + e / 2)}" y="${y - 7}" font-size="3" text-anchor="middle" fill="${BLEU}">1 unité</text>`);
  }
  for (const g of d.ecrits) p.push(`<text x="${n2(X(g))}" y="${y + 8.6}" font-size="3.8" text-anchor="middle" fill="${NOIR}">${fr(valeur(d, g))}</text>`);
  const largeurCase = Math.min(e - 1.2, 15);
  for (const g of d.cases ?? []) {
    p.push(`<rect x="${n2(X(g) - largeurCase / 2)}" y="${y + 4.2}" width="${n2(largeurCase)}" height="6.6" rx="0.8" fill="#fff" stroke="${NOIR}" stroke-width="0.4"/>`);
    if (corrige) p.push(`<text x="${n2(X(g))}" y="${y + 8.9}" font-size="${largeurCase < 9 ? 3.2 : 3.6}" font-weight="700" text-anchor="middle" fill="${BLEU}">${fr(valeur(d, g))}</text>`);
  }
  for (const pt of d.points ?? []) {
    p.push(`<circle cx="${n2(X(pt.g))}" cy="${y}" r="1.1" fill="${BLEU}"/><text x="${n2(X(pt.g))}" y="${y - 5}" font-size="4.2" font-weight="800" text-anchor="middle" fill="${BLEU}">${pt.nom}</text>`);
    if (corrige) p.push(`<text x="${n2(X(pt.g))}" y="${y - 9.5}" font-size="3.3" text-anchor="middle" fill="${NOIR}">${fr(valeur(d, pt.g))}</text>`);
  }
  if (corrige) {
    for (const pt of d.aPlacer ?? []) {
      p.push(`<line x1="${n2(X(pt.g))}" y1="${y - 3.2}" x2="${n2(X(pt.g))}" y2="${y + 3.2}" stroke="${ROUGE}" stroke-width="0.9"/>`,
        `<text x="${n2(X(pt.g))}" y="${y - 5}" font-size="4.2" font-weight="800" text-anchor="middle" fill="${ROUGE}">${pt.nom}</text>`);
    }
  }
  return `<svg class="rp-droite" viewBox="0 0 ${W} ${H}" style="width:${W}mm;height:${H}mm">${p.join("")}</svg>`;
}

/** Des graduations tirées au sort, distinctes, hors de celles qu'on évite, rangées. */
function tirer(alea: () => number, n: number, de: number, a: number, eviter: number[]): number[] {
  const possibles = Array.from({ length: a - de + 1 }, (_, i) => de + i).filter((g) => !eviter.includes(g));
  return melanger(alea, possibles).slice(0, n).sort((x, y) => x - y);
}
const NOMS = ["A", "B", "C", "D"];
const nommer = (gs: number[]) => melanger(hasard(gs.reduce((s, g) => s * 31 + g, 7)), gs).map((g, i) => ({ nom: NOMS[i], g })).sort((a, b) => a.nom.localeCompare(b.nom));

/**
 * Les demi-droites d'une classe : au CP, de un en un — de 0 à 20, puis une
 * portion jusqu'à cent — ; au CE1, de dix en dix, de cent en cent, de un en
 * un, jusqu'à mille ; au CE2, de mille en mille jusqu'à 10 000.
 */
function droitesDeLaClasse(alea: () => number, classe: ClasseReperage): Omit<Droite, "points" | "aPlacer" | "cases">[] {
  if (classe === "CP") {
    const dizaine = 10 * entier(alea, 3, 7);
    return [
      { debut: 0, pas: 1, graduations: 20, origine: true, ecrits: [0, 5, 10, 15, 20], majeures: 5 },
      { debut: 0, pas: 1, graduations: 20, origine: true, ecrits: [0, 10, 20], majeures: 5 },
      { debut: dizaine, pas: 1, graduations: 20, origine: false, ecrits: [0, 10, 20], majeures: 5 },
    ];
  }
  if (classe === "CE1") {
    return [
      { debut: 0, pas: 10, graduations: 10, origine: true, ecrits: [0, 5, 10], majeures: 5 },
      { debut: 100 * entier(alea, 1, 8), pas: 10, graduations: 10, origine: false, ecrits: [0, 10], majeures: 5 },
      { debut: 0, pas: 100, graduations: 10, origine: true, ecrits: [0, 5, 10], majeures: 5 },
      { debut: 10 * entier(alea, 20, 97), pas: 1, graduations: 20, origine: false, ecrits: [0, 10, 20], majeures: 5 },
    ];
  }
  return [
    { debut: 0, pas: 1000, graduations: 10, origine: true, ecrits: [0, 5, 10], majeures: 5 },
    { debut: 1000 * entier(alea, 1, 8), pas: 100, graduations: 10, origine: false, ecrits: [0, 10], majeures: 5 },
    { debut: 100 * entier(alea, 10, 98), pas: 10, graduations: 10, origine: false, ecrits: [0, 10], majeures: 5 },
    { debut: 10 * entier(alea, 100, 980), pas: 1, graduations: 20, origine: false, ecrits: [0, 10, 20], majeures: 5 },
  ];
}

const listeDesPoints = (d: Droite, pts: { nom: string; g: number }[], reponses: boolean) =>
  `<div class="rp-points">${pts.map((p) => `<span><b>${p.nom}</b> : ${reponses || d.aPlacer ? fr(valeur(d, p.g)) : BLANC}</span>`).join("")}</div>`;

function feuilleUnites(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const n = r.classe === "CP" ? 15 : 20;
  const droites: Droite[] = [0, 1].map(() => ({ debut: 0, pas: 1, graduations: n, origine: true, ecrits: [0], majeures: 5, unite: true, points: nommer(tirer(alea, 3, 2, n - 1, [])) }));
  const questions = (d: Droite, corr: boolean) => `<div class="rp-questions">${d.points!.map((p) => `<div><b>${p.nom}</b> est à ${corr ? `<b>${p.g}</b>` : BLANC} unités de 0 : son nombre est ${corr ? `<b>${p.g}</b>` : BLANC}.</div>`).join("")}</div>`;
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "Je compte les unités de 0 jusqu'à chaque point. Le nombre du point, c'est le nombre d'unités depuis 0 : je l'écris.")}`
    + droites.map((d) => `<div class="rp-bloc">${svgDroite(d, false)}${questions(d, false)}</div>`).join("") + "</div>"
    + corrige(titre, droites.map((d) => `<div class="rp-bloc">${svgDroite(d, true)}${questions(d, true)}</div>`).join(""));
}

function feuillePlacer(r: ReglagesReperage, graine: number, combien = 99): string {
  const alea = hasard(graine);
  const droites: Droite[] = droitesDeLaClasse(alea, r.classe).slice(0, combien).map((d) => ({ ...d, aPlacer: nommer(tirer(alea, d.graduations > 10 ? 4 : 3, 1, d.graduations - 1, d.ecrits)) }));
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "Je place chaque nombre sur la demi-droite : à sa graduation, je trace un petit trait et j'écris sa lettre au-dessus.")}`
    + droites.map((d) => `<div class="rp-bloc">${listeDesPoints(d, d.aPlacer!, true)}${svgDroite(d, false)}</div>`).join("") + "</div>"
    + corrige(titre, droites.map((d) => `<div class="rp-bloc">${listeDesPoints(d, d.aPlacer!, true)}${svgDroite(d, true)}</div>`).join(""));
}

function feuilleLire(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const droites: Droite[] = droitesDeLaClasse(alea, r.classe).map((d) => ({ ...d, points: nommer(tirer(alea, d.graduations > 10 ? 4 : 3, 1, d.graduations - 1, d.ecrits)) }));
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "J'écris le nombre de chaque point. Je regarde d'abord les nombres écrits, puis de combien on avance d'une graduation à la suivante.")}`
    + droites.map((d) => `<div class="rp-bloc">${svgDroite(d, false)}${listeDesPoints(d, d.points!, false)}</div>`).join("") + "</div>"
    + corrige(titre, droites.map((d) => `<div class="rp-bloc">${svgDroite(d, true)}${listeDesPoints(d, d.points!, true)}</div>`).join(""));
}

function feuilleManquants(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const droites: Droite[] = droitesDeLaClasse(alea, r.classe).map((d) => ({ ...d, cases: tirer(alea, d.graduations > 10 ? 5 : 4, 1, d.graduations - 1, d.ecrits) }));
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "J'écris dans chaque case le nombre de sa graduation.")}`
    + droites.map((d) => `<div class="rp-bloc">${svgDroite(d, false)}</div>`).join("") + "</div>"
    + corrige(titre, droites.map((d) => `<div class="rp-bloc">${svgDroite(d, true)}</div>`).join(""));
}

/**
 * Trouver le pas : deux graduations voisines écrites — 470 et 480, 242 et
 * 243, comme dans les exemples du programme —, des cases plus loin, à
 * gauche ou à droite.
 */
function feuillePas(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const pas = r.classe === "CE2" ? [1, 10, 100, 1000] : r.classe === "CE1" ? [1, 10, 100, 10] : [1, 1, 10, 10];
  const max = r.classe === "CE2" ? 10_000 : r.classe === "CE1" ? 1000 : 100;
  const droites: Droite[] = melanger(alea, pas).map((p) => {
    const graduations = 10;
    const voisine = entier(alea, 1, graduations - 2);
    const debutMax = Math.floor((max - graduations * p) / p);
    const debut = debutMax < 1 ? 0 : p * entier(alea, 1, debutMax);
    return { debut, pas: p, graduations, origine: debut === 0, ecrits: [voisine, voisine + 1], cases: tirer(alea, 3, 0, graduations, [voisine, voisine + 1]) };
  });
  const titre = titreReperage(r);
  const ligne = (d: Droite, corr: boolean) => `<div class="rp-bloc">${svgDroite(d, corr)}<div class="rp-points"><span>Le pas : ${corr ? `<b>${fr(d.pas)}</b>` : BLANC}</span></div></div>`;
  return `<div class="page">${entete(titre, "Je cherche de combien on avance d'une graduation à la suivante : c'est le pas. Puis j'écris le nombre de chaque case.")}`
    + droites.map((d) => ligne(d, false)).join("") + "</div>" + corrige(titre, droites.map((d) => ligne(d, true)).join(""));
}

/** Une bande de dix nombres qui se suivent — de un en un, de dix en dix, de cent en cent — dont quelques-uns manquent. */
function bandes(alea: () => number, classe: ClasseReperage, combien: number): { nombres: number[]; trous: number[] }[] {
  const sortes: { pas: number; max: number }[] = classe === "CP" ? [{ pas: 1, max: 100 }, { pas: 1, max: 100 }, { pas: 10, max: 100 }]
    : classe === "CE1" ? [{ pas: 1, max: 1000 }, { pas: 10, max: 1000 }, { pas: 100, max: 1000 }]
      : [{ pas: 1, max: 10_000 }, { pas: 10, max: 10_000 }, { pas: 100, max: 10_000 }, { pas: 1000, max: 10_000 }];
  return Array.from({ length: combien }, (_, i) => {
    const s = sortes[i % sortes.length];
    const longueur = 10;
    const depart = s.pas * entier(alea, 0, Math.max(1, Math.floor(s.max / s.pas) - longueur));
    const nombres = Array.from({ length: longueur }, (_, k) => depart + k * s.pas);
    return { nombres, trous: tirer(alea, i < 2 ? 3 : 4, 1, longueur - 1, []) };
  });
}
const htmlBande = (b: { nombres: number[]; trous: number[] }, corr: boolean) =>
  `<table class="rp-bande"><tr>${b.nombres.map((x, k) => (b.trous.includes(k)
    ? `<td class="rp-trou">${corr ? `<b>${fr(x)}</b>` : ""}</td>` : `<td>${fr(x)}</td>`)).join("")}</tr></table>`;

function feuilleBande(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const liste = bandes(alea, r.classe, 6);
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "J'écris les nombres qui manquent dans chaque bande. Je regarde d'abord de combien on avance d'une case à la suivante.")}`
    + liste.map((b) => htmlBande(b, false)).join("") + "</div>" + corrige(titre, liste.map((b) => htmlBande(b, true)).join(""));
}

/** Une consigne d'exercice, numérotée : elle prend le cadre des consignes (voir consignesStructurees.ts). */
const consigneNumerotee = (n: number, texte: string) => `<div class="rp-consigne"><b>${n}.</b> ${texte}</div>`;

function feuilleEvaluationDemiDroite(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const [a, b, c] = droitesDeLaClasse(alea, r.classe);
  const placer: Droite = { ...a, aPlacer: nommer(tirer(alea, 3, 1, a.graduations - 1, a.ecrits)) };
  const lire: Droite = { ...b, points: nommer(tirer(alea, 3, 1, b.graduations - 1, b.ecrits)) };
  const cases: Droite = { ...c, cases: tirer(alea, 4, 1, c.graduations - 1, c.ecrits) };
  const liste = bandes(alea, r.classe, 2);
  const parties = (corr: boolean) => consigneNumerotee(1, "Je place chaque nombre sur la demi-droite : je trace un petit trait et j'écris sa lettre.")
    + `<div class="rp-bloc">${listeDesPoints(placer, placer.aPlacer!, true)}${svgDroite(placer, corr)}</div>`
    + consigneNumerotee(2, "J'écris le nombre de chaque point.")
    + `<div class="rp-bloc">${svgDroite(lire, corr)}${listeDesPoints(lire, lire.points!, corr)}</div>`
    + consigneNumerotee(3, "J'écris dans chaque case le nombre de sa graduation.") + `<div class="rp-bloc">${svgDroite(cases, corr)}</div>`
    + consigneNumerotee(4, "J'écris les nombres qui manquent dans chaque bande.") + liste.map((x) => htmlBande(x, corr)).join("");
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "Je fais les exercices dans l'ordre. Je relis mes réponses.")}${parties(false)}</div>` + corrige(titre, parties(true));
}

// ── Les nombres ordinaux ──────────────────────────────────────────────────

/** Des formes simples, dessinées dans un carré de 8 mm centré sur (0, 0) : ce que portent les wagons, et les motifs des suites. */
const FORMES: Record<string, { nom: string; du: string; svg: (couleur: string) => string }> = {
  rond: { nom: "rond", du: "du rond", svg: (c) => `<circle r="3.2" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  carre: { nom: "carré", du: "du carré", svg: (c) => `<rect x="-3" y="-3" width="6" height="6" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  triangle: { nom: "triangle", du: "du triangle", svg: (c) => `<polygon points="0,-3.5 3.4,2.8 -3.4,2.8" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  etoile: { nom: "étoile", du: "de l'étoile", svg: (c) => `<polygon points="0,-3.6 1,-1.1 3.5,-1.1 1.5,0.5 2.2,3 0,1.5 -2.2,3 -1.5,0.5 -3.5,-1.1 -1,-1.1" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  coeur: { nom: "cœur", du: "du cœur", svg: (c) => `<path d="M0 3.2C-4.6 0 -3.6 -3.6 -1.6 -3.2C-0.7 -3 0 -2.2 0 -1.5C0 -2.2 0.7 -3 1.6 -3.2C3.6 -3.6 4.6 0 0 3.2z" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  losange: { nom: "losange", du: "du losange", svg: (c) => `<polygon points="0,-3.6 2.6,0 0,3.6 -2.6,0" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  croix: { nom: "croix", du: "de la croix", svg: (c) => `<polygon points="-1,-3.4 1,-3.4 1,-1 3.4,-1 3.4,1 1,1 1,3.4 -1,3.4 -1,1 -3.4,1 -3.4,-1 -1,-1" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  lune: { nom: "lune", du: "de la lune", svg: (c) => `<path d="M1.2 -3.4A3.6 3.6 0 1 0 1.2 3.4A2.6 2.6 0 1 1 1.2 -3.4z" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  maison: { nom: "maison", du: "de la maison", svg: (c) => `<polygon points="0,-3.6 3.2,-0.6 3.2,3.2 -3.2,3.2 -3.2,-0.6" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
  goutte: { nom: "goutte", du: "de la goutte", svg: (c) => `<path d="M0 -3.6C1.6 -1.2 2.8 0.2 2.8 1.2A2.8 2.8 0 0 1 -2.8 1.2C-2.8 0.2 -1.6 -1.2 0 -3.6z" fill="${c}" stroke="${NOIR}" stroke-width="0.4"/>` },
};
const IDS_FORMES = Object.keys(FORMES);

/** Le train : la locomotive devant, à gauche, et les wagons derrière ; chacun porte une forme, et sa couleur au corrigé. */
function svgTrain(formes: string[], couleurs: Map<number, string>): string {
  const W = 180, H = 26, l = 15, x0 = 26, y = 6;
  const loco = `<g><rect x="6" y="${y + 2}" width="17" height="10" rx="1.2" fill="#fff" stroke="${NOIR}" stroke-width="0.5"/>`
    + `<rect x="14" y="${y - 3}" width="7" height="5" fill="#fff" stroke="${NOIR}" stroke-width="0.5"/><rect x="8" y="${y - 1.5}" width="2.6" height="3.5" fill="${NOIR}"/>`
    + `<polygon points="6,${y + 12} 2,${y + 12} 6,${y + 7}" fill="${NOIR}"/><circle cx="10" cy="${y + 13.5}" r="1.8" fill="${NOIR}"/><circle cx="19" cy="${y + 13.5}" r="1.8" fill="${NOIR}"/></g>`;
  const sens = `<path d="M18 ${y + 19}l-12 0" stroke="${BLEU}" stroke-width="0.5"/><polygon points="4,${y + 19} 7,${y + 17.6} 7,${y + 20.4}" fill="${BLEU}"/>`
    + `<text x="9" y="${y + 18}" font-size="2.6" fill="${BLEU}">le train avance</text>`;
  const wagons = formes.map((f, i) => {
    const x = x0 + i * l;
    return `<line x1="${x - 2}" y1="${y + 8}" x2="${x}" y2="${y + 8}" stroke="${NOIR}" stroke-width="0.5"/>`
      + `<rect x="${x}" y="${y + 2}" width="${l - 2}" height="10" rx="0.8" fill="${couleurs.get(i + 1) ?? "#fff"}" stroke="${NOIR}" stroke-width="0.5"/>`
      + `<g transform="translate(${n2(x + (l - 2) / 2)} ${y + 7})">${FORMES[f].svg("#fff")}</g>`
      + `<circle cx="${x + 3}" cy="${y + 13.5}" r="1.4" fill="${NOIR}"/><circle cx="${x + l - 5}" cy="${y + 13.5}" r="1.4" fill="${NOIR}"/>`;
  }).join("");
  return `<svg class="rp-dessin" viewBox="0 0 ${W} ${H}" style="width:${W}mm;height:${H}mm">${loco}${wagons}${sens}</svg>`;
}

/** Au CP, le train de dix wagons ; au CE1, l'arrivée d'une course de vingt coureurs, repérés par leur dossard. */
function feuilleFile(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  if (r.classe !== "CP") {
    const c = course(alea);
    const titre = titreReperage(r);
    return `<div class="page">${entete(titre, "Vingt coureurs sont arrivés. Le premier arrivé est à gauche, sur la première ligne ; le onzième commence la deuxième ligne. Je réponds aux questions.")}${c(false)}</div>`
      + corrige(titre, c(true));
  }
  const formes = melanger(alea, IDS_FORMES);
  const [k1, k2, k3] = melanger(alea, tirer(alea, 3, 2, 10, []));
  const [c1, c2, c3] = melanger(alea, COULEURS);
  const [f1, f2, f3] = melanger(alea, [...Array(10).keys()].filter((i) => ![k1, k2, k3].includes(i + 1))).slice(0, 3);
  const couleurs = new Map([[k1, c1.hex], [k2, c2.hex], [k3, c3.hex]]);
  const questions = (corr: boolean) => [
    `Je colorie en ${c1.nom} le ${ordinalEnChiffres(k1)} wagon.`,
    `Je colorie en ${c2.nom} le ${ordinalEnChiffres(k2)} wagon.`,
    `Je colorie en ${c3.nom} le ${ordinalEnLettres(k3)} wagon.`,
    `Le wagon ${FORMES[formes[f1]].du} est le ${corr ? `<b>${ordinalEnChiffres(f1 + 1)}</b>` : BLANC} wagon.`,
    `Le wagon ${FORMES[formes[f2]].du} est le ${corr ? `<b>${ordinalEnLettres(f2 + 1)}</b>` : BLANC} wagon.`,
    `Combien de wagons y a-t-il devant le wagon ${FORMES[formes[f3]].du} ? ${corr ? `<b>${f3}</b>` : BLANC}`,
  ];
  const titre = titreReperage(r);
  const liste = (corr: boolean) => `<ol class="rp-liste">${questions(corr).map((q) => `<li>${q}</li>`).join("")}</ol>`;
  return `<div class="page">${entete(titre, "La locomotive est devant : le premier wagon est juste derrière elle. Je lis chaque phrase et je fais ce qu'elle demande.")}`
    + `<div class="rp-centre">${svgTrain(formes, new Map())}</div>${liste(false)}</div>`
    + corrige(titre, `<div class="rp-centre">${svgTrain(formes, couleurs)}</div>${liste(true)}`);
}

/** L'arrivée d'une course de vingt coureurs : leurs dossards dans l'ordre d'arrivée, et cinq questions ; pour l'élève, ou corrigée. */
function course(alea: () => number): (corr: boolean) => string {
  const dossards = melanger(alea, Array.from({ length: 60 }, (_, i) => i + 1)).slice(0, 20);
  const [r1, r2, r3, r4] = melanger(alea, tirer(alea, 4, 3, 19, []));
  const couleur = COULEURS[1];
  const grille = (corr: boolean) => `<div class="rp-course"><div class="rp-arrivee">L'arrivée : le premier à gauche</div>`
    + [0, 1].map((ligne) => `<div class="rp-coureurs">${dossards.slice(ligne * 10, ligne * 10 + 10).map((d, i) => {
      const rang = ligne * 10 + i + 1;
      return `<span class="rp-dossard"${corr && rang === r4 ? ` style="background:${couleur.hex}"` : ""}>${d}</span>`;
    }).join("")}</div>`).join("") + "</div>";
  const questions = (corr: boolean) => [
    `Quel dossard est arrivé ${ordinalEnLettres(r1)} ? ${corr ? `<b>Le dossard ${dossards[r1 - 1]}.</b>` : BLANC}`,
    `En quelle position est arrivé le dossard ${dossards[r2 - 1]} ? ${corr ? `<b>${ordinalEnChiffres(r2)} (${ordinalEnLettres(r2)})</b>` : BLANC}`,
    `Combien de coureurs sont arrivés avant le dossard ${dossards[r3 - 1]} ? ${corr ? `<b>${r3 - 1}</b>` : BLANC}`,
    `Combien de coureurs sont arrivés après le dossard ${dossards[r3 - 1]} ? ${corr ? `<b>${20 - r3}</b>` : BLANC}`,
    `Je colorie en ${couleur.nom} le dossard arrivé ${ordinalEnLettres(r4)}.`,
  ];
  return (corr) => `${grille(corr)}<ol class="rp-liste">${questions(corr).map((q) => `<li>${q}</li>`).join("")}</ol>`;
}

/** Une rangée de dix gobelets, sans sens : on part de la gauche ou de la droite. L'un est déjà vert. */
function feuilleGobelets(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const g1 = entier(alea, 3, 9), d2 = entier(alea, 2, 5);
  const gauche2 = 11 - d2;
  const v = choisir(alea, [...Array(10).keys()].map((i) => i + 1).filter((k) => k !== g1 && k !== gauche2));
  const couleurs = new Map([[g1, COULEURS[0].hex], [gauche2, COULEURS[1].hex]]);
  const svg = (corr: boolean) => {
    const W = 180, H = 30;
    const gobelets = Array.from({ length: 10 }, (_, i) => {
      const k = i + 1, x = 12 + i * 16;
      const fond = k === v ? COULEURS[2].hex : corr ? couleurs.get(k) ?? "#fff" : "#fff";
      return `<polygon points="${x},6 ${x + 11},6 ${x + 9.5},20 ${x + 1.5},20" fill="${fond}" stroke="${NOIR}" stroke-width="0.5"/>`
        + `<line x1="${x - 0.6}" y1="6" x2="${x + 11.6}" y2="6" stroke="${NOIR}" stroke-width="0.9"/>`;
    }).join("");
    return `<svg class="rp-dessin" viewBox="0 0 ${W} ${H}" style="width:${W}mm;height:${H}mm">${gobelets}`
      + `<text x="12" y="27" font-size="3" fill="${GRIS}">← la gauche</text><text x="173" y="27" font-size="3" text-anchor="end" fill="${GRIS}">la droite →</text></svg>`;
  };
  const questions = (corr: boolean) => [
    `Le jeton est caché sous le ${ordinalEnLettres(g1)} gobelet en partant de la gauche : je colorie ce gobelet en rouge.`,
    `Un autre jeton est sous le ${ordinalEnLettres(d2)} gobelet en partant de la droite : je le colorie en bleu.`,
    `Le gobelet vert est le ${corr ? `<b>${ordinalEnChiffres(v)}</b>` : BLANC} en partant de la gauche, et le ${corr ? `<b>${ordinalEnChiffres(11 - v)}</b>` : BLANC} en partant de la droite.`,
  ];
  const titre = titreReperage(r);
  const liste = (corr: boolean) => `<ol class="rp-liste">${questions(corr).map((q) => `<li>${q}</li>`).join("")}</ol>`;
  return `<div class="page">${entete(titre, "Les gobelets n'ont pas de sens : je regarde d'où l'on part, de la gauche ou de la droite. Je compte à partir de là.")}`
    + `<div class="rp-centre">${svg(false)}</div>${liste(false)}</div>`
    + corrige(titre, `<div class="rp-centre">${svg(true)}</div>${liste(true)}`);
}

/** Écrire les ordinaux : en chiffres — 3<sup>e</sup> — et en lettres — troisième. */
function feuilleEcrire(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const nombres = r.classe === "CP"
    ? [1, ...tirer(alea, 7, 2, 20, [])]
    : tirer(alea, 8, 21, 100, []);
  const lignes = (corr: boolean) => nombres.map((n, i) => {
    const enChiffres = i % 2 === 0;
    const chiffres = enChiffres || corr ? ordinalEnChiffres(n) : "";
    const lettres = !enChiffres || corr ? ordinalEnLettres(n) : "";
    return `<tr><td${!enChiffres ? ' class="rp-a-ecrire"' : ""}>${corr && !enChiffres ? `<b>${chiffres}</b>` : chiffres}</td>`
      + `<td${enChiffres ? ' class="rp-a-ecrire"' : ""}>${corr && enChiffres ? `<b>${lettres}</b>` : lettres}</td></tr>`;
  }).join("");
  const tableau = (corr: boolean) => `<table class="rp-tableau"><tr><th>En chiffres</th><th>En lettres</th></tr>${lignes(corr)}</table>`;
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, `J'écris chaque rang en lettres, ou en chiffres. Premier s'écrit 1<sup>er</sup> ; les autres prennent un e : 3<sup>e</sup>, troisième.`)}`
    + `${tableau(false)}</div>` + corrige(titre, tableau(true));
}

/** Des problèmes de rang : combien devant, combien derrière, quel rang. Au CE1, la course et le Tour de France. */
function problemesDeRang(alea: () => number, classe: ClasseReperage, combien: number): { enonce: string; reponse: string }[] {
  const cp = classe === "CP";
  const modeles = cp ? [
    () => { const n = entier(alea, 5, 12), k = entier(alea, 2, n - 1); return { enonce: `Il y a ${n} personnes qui font la queue à la caisse. Je suis le ${ordinalEnLettres(k)} dans la file. Combien y a-t-il de personnes devant moi ?`, reponse: `${k - 1} personnes : ${k} − 1 = ${k - 1}.` }; },
    () => { const n = entier(alea, 5, 12), k = entier(alea, 2, n - 1); return { enonce: `Il y a ${n} enfants dans la file de la cantine. Je suis le ${ordinalEnLettres(k)}. Combien d'enfants y a-t-il derrière moi ?`, reponse: `${n - k} enfants : ${n} − ${k} = ${n - k}.` }; },
    () => { const a = entier(alea, 2, 9); return { enonce: `Dans la file du bus, il y a ${a} personnes devant moi. À quel rang suis-je ?`, reponse: `Le ${ordinalEnLettres(a + 1)} : ${a} + 1 = ${a + 1}.` }; },
    () => { const k = entier(alea, 3, 15); return { enonce: `Le chat est le ${ordinalEnLettres(k)} animal de la file. Combien d'animaux sont devant lui ?`, reponse: `${k - 1} animaux : ${k} − 1 = ${k - 1}.` }; },
  ] : [
    () => { const n = entier(alea, 150, 198), k = entier(alea, 21, 99); return { enonce: `Dans une étape du Tour de France parcourue par ${n} cyclistes, combien de cyclistes sont arrivés avant le ${ordinalEnLettres(k)} coureur ?`, reponse: `${k - 1} cyclistes : ${k} − 1 = ${k - 1}.` }; },
    () => { const n = entier(alea, 40, 99), k = entier(alea, 11, n - 5); return { enonce: `${n} coureurs participent au cross de l'école. J'arrive ${ordinalEnLettres(k)}. Combien de coureurs arrivent après moi ?`, reponse: `${n - k} coureurs : ${n} − ${k} = ${n - k}.` }; },
    () => { const a = entier(alea, 12, 70); return { enonce: `${a} coureurs sont arrivés avant moi. Quel est mon rang ?`, reponse: `Le ${ordinalEnLettres(a + 1)} : ${a} + 1 = ${a + 1}.` }; },
    () => { const k = entier(alea, 20, 90), j = entier(alea, k + 5, k + 30); return { enonce: `Au marathon, ma sœur arrive ${ordinalEnLettres(k)} et mon frère ${ordinalEnLettres(j)}. Combien de coureurs sont arrivés entre eux ?`, reponse: `${j - k - 1} coureurs : de ${k + 1} à ${j - 1}.` }; },
  ];
  return Array.from({ length: combien }, (_, i) => modeles[i % modeles.length]());
}

function feuilleDevant(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const pbs = problemesDeRang(alea, r.classe, r.classe === "CP" ? 4 : 4);
  const titre = titreReperage(r);
  const html = (corr: boolean) => pbs.map((p, i) => `<div class="rp-probleme"><b>${i + 1}.</b> ${p.enonce}`
    + (corr ? `<div class="rp-reponse">${p.reponse}</div>` : `<div class="rp-dessiner">Je peux dessiner la file.</div><div class="rp-phrase">Réponse : ${BLANC}</div>`) + "</div>").join("");
  return `<div class="page">${entete(titre, "Je lis le problème. Je dessine la file si j'en ai besoin, puis j'écris la réponse.")}${html(false)}</div>` + corrige(titre, html(true));
}

/** Le rang d'un nombre dans une liste : « pour la liste 2, 6, 10, 14, 18, 10 est en troisième position ». */
function feuilleListe(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const listes = Array.from({ length: 4 }, (_, i) => {
    if (i === 0 && r.classe === "CP") return [2, 6, 10, 14, 18];
    const longueur = r.classe === "CP" ? entier(alea, 6, 8) : entier(alea, 8, 10);
    const pas = r.classe === "CP" ? entier(alea, 2, 5) : choisir(alea, [5, 9, 11, 15, 20, 25]);
    const depart = r.classe === "CP" ? entier(alea, 1, 20) : entier(alea, 10, 300);
    return Array.from({ length: longueur }, (_, k) => depart + k * pas);
  });
  const items = listes.map((l) => {
    const k = entier(alea, 2, l.length - 1), j = choisir(alea, [...Array(l.length).keys()].map((x) => x + 1).filter((x) => x !== k));
    return { l, k, j };
  });
  const titre = titreReperage(r);
  const html = (corr: boolean) => items.map(({ l, k, j }, i) => `<div class="rp-probleme"><b>${i + 1}.</b> La liste : <span class="rp-nombres">${l.map((x) => fr(x)).join(", ")}</span>`
    + `<div>Le nombre ${fr(l[k - 1])} est en ${corr ? `<b>${ordinalEnLettres(k)}</b>` : BLANC} position.</div>`
    + `<div>Le ${ordinalEnLettres(j)} nombre est ${corr ? `<b>${fr(l[j - 1])}</b>` : BLANC}.</div></div>`).join("");
  return `<div class="page">${entete(titre, "Je compte les nombres de la liste depuis le premier, à gauche. Je réponds aux deux questions.")}${html(false)}</div>` + corrige(titre, html(true));
}

// ── Les suites ────────────────────────────────────────────────────────────

/** Une suite : comment on la lit dans la question, ce qu'on cherche, son terme de rang k, la longueur de son motif, le rang demandé, les termes donnés. */
interface Suite { texte: string; quoi: "lettre" | "symbole" | "nombre"; termes: (k: number) => string; periode: number; rang: number; donnes: number }

const motif = (texte: string, quoi: Suite["quoi"], elements: string[], rang: number): Suite =>
  ({ texte, quoi, termes: (k) => elements[(k - 1) % elements.length], periode: elements.length, rang, donnes: elements.length * 2 });

/** « Dans la suite « ABABAB… », quelle est la dix-neuvième lettre ? » : la question du programme. */
const question = (s: Suite) => `Dans la suite ${s.texte}, ${s.quoi === "lettre" ? "quelle est la" : "quel est le"} ${ordinalEnLettres(s.rang)} ${s.quoi} ?`;
/** « le rond », « la croix », « l'étoile » : la forme avec son article, tiré de « du rond », « de la croix ». */
const avecArticle = (id: string) => (FORMES[id].du.startsWith("du ") ? `le ${FORMES[id].nom}` : FORMES[id].du.replace(/^de /, ""));
const reponseDe = (s: Suite) => (s.quoi === "symbole" ? avecArticle(s.termes(s.rang)) : s.termes(s.rang));

/** Les suites répétitives des exemples du programme : au CP, jusqu'au vingtième ; au CE1, jusqu'au centième. */
function suitesRepetitives(alea: () => number, classe: ClasseReperage): Suite[] {
  const cp = classe === "CP";
  const impairs: Suite = { texte: "« 1, 3, 5, 7, 9… »", quoi: "nombre", termes: (k) => String(2 * k - 1), periode: 1, rang: cp ? 7 : 17, donnes: 5 };
  const toutes: Suite[] = [
    motif("« ABABAB… »", "lettre", ["A", "B"], cp ? 19 : 89),
    motif("« triangle, carré, rond, triangle, carré, rond… »", "symbole", ["triangle", "carre", "rond"], cp ? 20 : 60),
    impairs,
    motif("« triangle, croix, carré, rond, triangle, croix… »", "symbole", ["triangle", "croix", "carre", "rond"], cp ? 20 : 80),
    motif("« ABGFABGFAB… »", "lettre", ["A", "B", "G", "F"], 17),
  ];
  return melanger(alea, toutes).slice(0, 4);
}

/** Les suites évolutives du CE1 : les exemples du programme. */
function suitesEvolutives(): Suite[] {
  const triangles = new Set([1, 3, 6, 10, 15, 21, 28]);
  return [
    { texte: "« 1, 2, 4, 7, 11, 16… »", quoi: "nombre", termes: (k) => String(1 + ((k - 1) * k) / 2), periode: 1, rang: 11, donnes: 6 },
    { texte: "« triangle, croix, triangle, croix, croix, triangle, croix, croix, croix… »", quoi: "symbole", termes: (k) => (triangles.has(k) ? "triangle" : "croix"), periode: 1, rang: 20, donnes: 10 },
    { texte: "« 1, 2, 4, 8, 16… »", quoi: "nombre", termes: (k) => String(2 ** (k - 1)), periode: 1, rang: 9, donnes: 5 },
  ];
}

/**
 * La grille d'une suite : des cases numérotées jusqu'au rang demandé, les
 * premières remplies. Les colonnes sont un multiple de la longueur du motif :
 * chaque colonne garde le même terme, et l'on voit où tombe le rang.
 */
function grilleDeSuite(s: Suite, corr: boolean, colonnesMax: number): string {
  const colonnes = s.periode > 1 ? Math.floor(colonnesMax / s.periode) * s.periode : colonnesMax;
  const contenu = (k: number) => {
    const t = s.termes(k);
    if (s.quoi !== "symbole") return `<span>${t}</span>`;
    return `<svg viewBox="-4 -4 8 8" style="width:4.6mm;height:4.6mm">${FORMES[t].svg(k === s.rang && corr ? COULEURS[3].hex : "#fff")}</svg>`;
  };
  const lignes: string[] = [];
  for (let debut = 1; debut <= s.rang; debut += colonnes) {
    const cases = Array.from({ length: Math.min(colonnes, s.rang - debut + 1) }, (_, i) => debut + i);
    lignes.push(`<tr>${cases.map((k) => `<td${k === s.rang ? ' class="rp-rang"' : ""}><i>${k}</i>${k <= s.donnes || corr ? contenu(k) : ""}</td>`).join("")}</tr>`);
  }
  return `<table class="rp-suite">${lignes.join("")}</table>`;
}

function feuilleSuites(r: ReglagesReperage, graine: number, evolutives = false): string {
  const alea = hasard(graine);
  const suites = evolutives ? suitesEvolutives() : suitesRepetitives(alea, r.classe);
  const titre = titreReperage(r);
  const html = (corr: boolean) => `<div class="rp-suites${r.classe === "CP" ? "" : " rp-deux"}">` + suites.map((s, i) => `<div class="rp-probleme"><b>${i + 1}.</b> ${question(s)}`
    + grilleDeSuite(s, corr, 10)
    + `<div class="rp-phrase">Réponse : ${corr ? `<b>${reponseDe(s)}</b>` : BLANC}</div></div>`).join("") + "</div>";
  return `<div class="page">${entete(titre, evolutives
    ? "Je cherche comment la suite grandit d'une case à la suivante. Je continue la suite jusqu'à la case entourée, puis j'écris la réponse."
    : "Je cherche le motif qui se répète. Je continue la suite jusqu'à la case entourée, ou je cherche dans quelle colonne elle tombe. J'écris la réponse.")}${html(false)}</div>`
    + corrige(titre, html(true));
}

function feuilleEvaluationOrdinaux(r: ReglagesReperage, graine: number): string {
  const alea = hasard(graine);
  const cp = r.classe === "CP";
  const formes = melanger(alea, IDS_FORMES);
  const [k1, k2] = tirer(alea, 2, 2, 10, []);
  const f1 = choisir(alea, [...Array(10).keys()].filter((i) => i + 1 !== k1 && i + 1 !== k2));
  const c = cp ? null : course(alea);
  const pb = problemesDeRang(alea, r.classe, 1)[0];
  // Une suite courte — jusqu'au vingtième — : la grille tient sur la page de l'évaluation.
  const suite = suitesRepetitives(alea, r.classe).find((x) => x.rang <= 20) ?? suitesRepetitives(alea, "CP")[0];
  const parties = (corr: boolean) => (c
    ? consigneNumerotee(1, "Je réponds aux questions sur l'arrivée de la course.") + c(corr)
    : consigneNumerotee(1, `Je colorie en rouge le ${ordinalEnChiffres(k1)} wagon, et en bleu le ${ordinalEnLettres(k2)} wagon. Puis j'écris le rang du wagon ${FORMES[formes[f1]].du}.`)
      + `<div class="rp-centre">${svgTrain(formes, corr ? new Map([[k1, COULEURS[0].hex], [k2, COULEURS[1].hex]]) : new Map())}</div>`
      + `<div class="rp-phrase">Le wagon ${FORMES[formes[f1]].du} est le ${corr ? `<b>${ordinalEnChiffres(f1 + 1)}</b>` : BLANC} wagon.</div>`)
    + consigneNumerotee(2, "Je lis le problème et j'écris la réponse.")
    + `<div class="rp-probleme">${pb.enonce}${corr ? `<div class="rp-reponse">${pb.reponse}</div>` : `<div class="rp-phrase">Réponse : ${BLANC}</div>`}</div>`
    + consigneNumerotee(3, `Je continue la suite jusqu'à la case entourée et je réponds.`)
    + `<div class="rp-probleme">${question(suite)}${grilleDeSuite(suite, corr, 10)}<div class="rp-phrase">Réponse : ${corr ? `<b>${reponseDe(suite)}</b>` : BLANC}</div></div>`;
  const titre = titreReperage(r);
  return `<div class="page">${entete(titre, "Je fais les exercices dans l'ordre. Je relis mes réponses.")}${parties(false)}</div>` + corrige(titre, parties(true));
}

// ── La feuille ────────────────────────────────────────────────────────────

export function htmlReperage(r: ReglagesReperage, graine: number): string {
  const f: Record<ExerciceReperage, (r: ReglagesReperage, g: number) => string> = {
    "dd-unites": feuilleUnites, "dd-placer": (x, g) => feuillePlacer(x, g), "dd-lire": feuilleLire, "dd-manquants": feuilleManquants, "dd-pas": feuillePas,
    "bande-lacunaire": feuilleBande, "dd-evaluation": feuilleEvaluationDemiDroite,
    "ord-file": feuilleFile, "ord-gobelets": feuilleGobelets, "ord-ecrire": feuilleEcrire, "ord-devant": feuilleDevant, "ord-liste": feuilleListe,
    "ord-suites": (x, g) => feuilleSuites(x, g), "ord-suites-evolutives": (x, g) => feuilleSuites(x, g, true), "ord-evaluation": feuilleEvaluationOrdinaux,
  };
  return feuille(f[r.exercice](r, graine), "rp");
}

export const STYLE_REPERAGE = `
  .feuille.rp svg { display: block; }
  .feuille.rp .rp-bloc { margin: 0 0 4mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.rp .rp-centre { display: flex; justify-content: center; margin: 3mm 0; }
  .feuille.rp .rp-points { display: flex; flex-wrap: wrap; gap: 2mm 8mm; font-size: 14px; margin: 1mm 0 1mm 4mm; }
  .feuille.rp .rp-points b { color: #2f6fd1; }
  .feuille.rp .rp-blanc { display: inline-block; width: 22mm; height: 6mm; border-bottom: 2px dotted #1c2233; vertical-align: bottom; }
  .feuille.rp .rp-questions { font-size: 14px; line-height: 2.2; margin: 0 0 0 4mm; }
  .feuille.rp .rp-liste { font-size: 14px; line-height: 2.3; padding-left: 7mm; margin: 2mm 0; }
  .feuille.rp .rp-bande { border-collapse: collapse; margin: 0 auto 5mm; font-size: 14px; }
  .feuille.rp .rp-bande td { border: 1.2px solid #1c2233; width: 16mm; height: 10mm; text-align: center; vertical-align: middle; }
  .feuille.rp .rp-bande td.rp-trou { background: #f7f8fc; }
  .feuille.rp .rp-tableau { border-collapse: collapse; margin: 3mm auto; font-size: 15px; }
  .feuille.rp .rp-tableau th, .feuille.rp .rp-tableau td { border: 1.2px solid #1c2233; padding: 1.5mm 4mm; height: 10mm; min-width: 40mm; text-align: center; }
  .feuille.rp .rp-tableau th { background: #f0f2f8; font-size: 13px; }
  .feuille.rp .rp-tableau td.rp-a-ecrire { background: #f7f8fc; }
  .feuille.rp .rp-probleme { font-size: 14px; line-height: 1.6; margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.rp .rp-dessiner { border: 1.5px dashed #c4c9d6; border-radius: 3mm; height: 16mm; font-size: 10.5px; color: #9aa0b4; padding: 1mm 2mm; margin: 2mm 0; }
  .feuille.rp .rp-phrase { margin: 2mm 0 0; }
  .feuille.rp .rp-reponse { margin: 1mm 0 0 5mm; font-weight: 700; color: #2f6fd1; }
  .feuille.rp .rp-nombres { font-weight: 700; letter-spacing: 0.02em; }
  .feuille.rp .rp-course { margin: 2mm 0 3mm; }
  .feuille.rp .rp-arrivee { font-size: 12px; font-weight: 700; margin: 0 0 1mm; }
  .feuille.rp .rp-coureurs { display: flex; gap: 1.5mm; margin: 0 0 2mm; }
  .feuille.rp .rp-dossard { flex: 1; border: 1.2px solid #1c2233; border-radius: 1.5mm; text-align: center; font-weight: 800; font-size: 15px; padding: 2mm 0; }
  .feuille.rp .rp-suites.rp-deux { display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; }
  .feuille.rp table.rp-suite, .feuille.rp table.rp-bande, .feuille.rp table.rp-tableau { width: auto; }
  .feuille.rp .rp-suite { border-collapse: collapse; margin: 2mm 0; }
  .feuille.rp .rp-suite td { border: 1px solid #1c2233; width: 7.6mm; height: 7.6mm; text-align: center; vertical-align: middle; position: relative; font-size: 12px; font-weight: 700; padding: 2mm 0 0; }
  .feuille.rp .rp-suite td i { position: absolute; top: 0.4mm; left: 0.8mm; font-size: 8px; font-style: normal; font-weight: 400; color: #687087; letter-spacing: normal; }
  .feuille.rp .rp-suite td svg { margin: 0 auto; }
  .feuille.rp .rp-suite td.rp-rang { border: 2px solid #d64545; }
  .feuille.rp .rp-consigne { font-size: 13.5px; font-weight: 700; margin: 5mm 0 2mm; }
  .feuille.rp sup { font-size: 0.7em; }
`;
