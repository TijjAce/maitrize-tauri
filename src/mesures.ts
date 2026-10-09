// Les grandeurs et leur mesure : longueurs, masses, contenances.
//
// Éduscol, « Grandeurs et mesures au cycle 2 » (ressources 2016) : construire
// chaque grandeur pour elle-même — comparer directement, puis indirectement —,
// avant d'introduire ses unités, « par report et comptage d'unités
// élémentaires, puis à l'aide d'instruments simples comme la règle graduée » ;
// se constituer « un répertoire de mesures de référence » pour estimer ; pas
// de tableau de conversion au cycle 2, mais les relations entre les quelques
// unités connues. L'activité « Masses » (même collection) : soupeser, comparer
// avec la balance Roberval, peser avec des masses marquées, construire des
// référents du kilogramme ; l'évaluation « Estimations — Masses » : choisir la
// mesure vraisemblable parmi quatre.
//
// Les segments et les figures se dessinent à leur taille réelle : la feuille
// s'imprime à 100 %, un trait de 10 cm permet de le vérifier.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type Grandeur = "longueur" | "masse" | "contenance";
export type ExerciceMesures =
  | "mesurer" | "tracer" | "comparerSegments" | "comparerObjets" | "unites" | "estimer" | "convertir" | "comparerMesures"
  | "perimetre" | "perimetreCompas" | "balances" | "pesees" | "ordonner" | "verres";

export const EXERCICES_MESURES: { id: ExerciceMesures; libelle: string; grandeurs: Grandeur[] }[] = [
  { id: "comparerObjets", libelle: "Comparer des objets : les crayons", grandeurs: ["longueur"] },
  { id: "comparerSegments", libelle: "Comparer des segments, sans règle", grandeurs: ["longueur"] },
  { id: "mesurer", libelle: "Mesurer des segments avec la règle", grandeurs: ["longueur"] },
  { id: "tracer", libelle: "Tracer des segments", grandeurs: ["longueur"] },
  { id: "perimetre", libelle: "Le périmètre, avec la règle (CE2)", grandeurs: ["longueur"] },
  { id: "perimetreCompas", libelle: "Comparer des périmètres au compas (CE2)", grandeurs: ["longueur"] },
  { id: "balances", libelle: "La balance : plus lourd, plus léger", grandeurs: ["masse"] },
  { id: "pesees", libelle: "Peser avec des masses marquées", grandeurs: ["masse"] },
  { id: "verres", libelle: "Combien de verres ? Comparer des contenances (CE2)", grandeurs: ["contenance"] },
  { id: "unites", libelle: "Choisir l'unité", grandeurs: ["longueur", "masse", "contenance"] },
  { id: "estimer", libelle: "Estimer : la mesure vraisemblable", grandeurs: ["longueur", "masse", "contenance"] },
  { id: "convertir", libelle: "Les relations entre les unités", grandeurs: ["longueur", "masse", "contenance"] },
  { id: "comparerMesures", libelle: "Comparer des mesures : <, > ou =", grandeurs: ["longueur", "masse", "contenance"] },
  { id: "ordonner", libelle: "Ranger quatre mesures écrites autrement", grandeurs: ["longueur", "masse", "contenance"] },
];

export interface ReglagesMesures {
  exercice: ExerciceMesures;
  grandeur: Grandeur;
  classe: Classe;
  /** Mesurer et tracer au millimètre (CE2). */
  millimetres: boolean;
  /** Des segments dans toutes les directions, pas seulement à l'horizontale. */
  obliques: boolean;
  /** Encadrer la longueur entre deux nombres entiers de centimètres (CE1). */
  encadrer: boolean;
  combien: number;
}

export const REGLAGES_MESURES: ReglagesMesures = { exercice: "mesurer", grandeur: "longueur", classe: "CE1", millimetres: false, obliques: false, encadrer: false, combien: 6 };

const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const LETTRES = "ABCDEFGHIJKL";
const NOIR = "#1c2233", ROUGE = "#d33a32";

const SOURCE = `<span class="reference">Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Grandeurs et mesures au cycle 2 », 2016.</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

/** Le trait de contrôle : 10 cm, si la feuille est imprimée à 100 %. */
const CONTROLE = `<div class="me-controle"><svg viewBox="0 0 102 4" width="102mm" height="4mm"><line x1="1" y1="2" x2="101" y2="2" stroke="#9aa0b4" stroke-width="0.5"/><line x1="1" y1="0.5" x2="1" y2="3.5" stroke="#9aa0b4" stroke-width="0.4"/><line x1="101" y1="0.5" x2="101" y2="3.5" stroke="#9aa0b4" stroke-width="0.4"/></svg><span>Ce trait mesure 10 cm : sinon, imprimez la feuille à 100 %, sans l'ajuster à la page.</span></div>`;

// ── Les segments, à leur taille réelle ────────────────────────────────────

/** Un segment de `mm` millimètres, incliné de `angle` degrés, ses extrémités marquées ; « départ » : seulement le point de départ. */
export function segmentSvg(mm: number, angle = 0, couleur = NOIR, depart = false): string {
  const a = (angle * Math.PI) / 180;
  const dx = mm * Math.cos(a), dy = -mm * Math.sin(a);
  const marge = 4;
  const w = Math.abs(dx) + 2 * marge, h = Math.abs(dy) + 2 * marge;
  const x0 = marge + (dx < 0 ? -dx : 0), y0 = marge + (dy < 0 ? -dy : 0);
  const x1 = x0 + dx, y1 = y0 + dy;
  // Les petits traits des extrémités, perpendiculaires au segment.
  const px = -Math.sin(a) * 1.8, py = -Math.cos(a) * 1.8;
  const bout = (x: number, y: number) => `<line x1="${(x - px).toFixed(2)}" y1="${(y - py).toFixed(2)}" x2="${(x + px).toFixed(2)}" y2="${(y + py).toFixed(2)}" stroke="${NOIR}" stroke-width="0.35"/>`;
  if (depart) return `<svg class="me-seg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm"><circle cx="${x0.toFixed(2)}" cy="${y0.toFixed(2)}" r="0.9" fill="${NOIR}"/></svg>`;
  return `<svg class="me-seg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm">`
    + `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${couleur}" stroke-width="0.45"/>${bout(x0, y0)}${bout(x1, y1)}</svg>`;
}

/** Une longueur en millimètres comme le programme l'écrit : « 7 cm », « 5 cm et 3 mm ». */
export function enCm(mm: number, millimetres: boolean): string {
  const cm = Math.floor(mm / 10), reste = mm % 10;
  if (!millimetres || !reste) return `${cm} cm`;
  return cm ? `${cm} cm et ${reste} mm` : `${reste} mm`;
}

/** Des longueurs différentes, en millimètres : des centimètres entiers, ou au millimètre ; de 2 à 15 cm. */
export function longueurs(r: Pick<ReglagesMesures, "millimetres" | "combien">, alea: () => number, de = 20, a = 150): number[] {
  const sortie = new Set<number>();
  for (let garde = 0; sortie.size < Math.max(1, Math.min(10, r.combien)) && garde < 500; garde++) {
    const mm = r.millimetres ? entre(alea, de, a) : 10 * entre(alea, Math.ceil(de / 10), Math.floor(a / 10));
    // Au millimètre, au moins une longueur sur deux tombe entre deux centimètres.
    if (r.millimetres && sortie.size % 2 === 0 && mm % 10 === 0) continue;
    sortie.add(mm);
  }
  return [...sortie];
}

/** Une inclinaison : à l'horizontale, ou dans tous les sens — la verticale seulement pour les segments courts, qui tiennent dans leur case. */
const angleAuHasard = (alea: () => number, obliques: boolean, mm = 0) => (!obliques ? 0
  : mm <= 50 && alea() < 0.2 ? 90 : [0, 15, 25, 35, -15, -25, -35][Math.floor(alea() * 7)]);

function feuilleMesurer(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  // Encadrer : des longueurs qui tombent entre deux graduations des centimètres.
  const encadrer = r.encadrer && !r.millimetres;
  // Dans tous les sens, les segments vont deux par ligne : 7 cm au plus.
  const liste = longueurs({ ...r, millimetres: r.millimetres || encadrer }, alea, 20, r.obliques ? 70 : 150)
    .map((mm) => (encadrer && mm % 10 === 0 ? Math.min(mm + entre(alea, 2, 8), r.obliques ? 72 : 158) : mm)).map((mm) => ({ mm, angle: angleAuHasard(alea, r.obliques, mm) }));
  const reponse = (l: string) => (encadrer ? `La longueur du segment ${l} est entre <span class="me-blanc"></span> cm et <span class="me-blanc"></span> cm.`
    : `Le segment ${l} mesure ${r.millimetres ? `<span class="me-blanc"></span> cm et <span class="me-blanc"></span> mm` : `<span class="me-blanc"></span> cm`}`);
  const lignes = r.obliques
    ? `<div class="me-cases">${liste.map((s, i) => `<div class="me-case me-case-seg"><b class="me-lettre">${LETTRES[i]}</b>${segmentSvg(s.mm, s.angle, ROUGE)}<div class="me-rep">${reponse(LETTRES[i])}</div></div>`).join("")}</div>`
    : liste.map((s, i) => `<div class="me-ligne"><b class="me-lettre">${LETTRES[i]}</b>${segmentSvg(s.mm, s.angle, ROUGE)}<div class="me-rep">${reponse(LETTRES[i])}</div></div>`).join("");
  const tete = entete("Mesurer des segments", `Pose le zéro de la règle sur une extrémité du segment, le long du segment ; lis la graduation à l'autre extrémité.${r.millimetres ? " Écris la longueur en centimètres et en millimètres." : encadrer ? " L'extrémité tombe entre deux graduations : entre quels nombres de centimètres est la longueur ?" : ""}`);
  const dire = (mm: number) => (encadrer ? `entre ${Math.floor(mm / 10)} cm et ${Math.floor(mm / 10) + 1} cm` : enCm(mm, r.millimetres));
  const corrige = `<div class="page corrige"><div class="titre">Mesurer des segments — corrigé</div><div class="me-corrige">${liste.map((s, i) => `<div>${LETTRES[i]}. <b>${dire(s.mm)}</b>${(r.millimetres || encadrer) && s.mm % 10 ? ` (${s.mm} mm)` : ""}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-liste">${lignes}</div>${CONTROLE}</div>${corrige}`;
}

function feuilleTracer(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const liste = longueurs(r, alea, 20, 150);
  const dire = (mm: number, i: number) => (r.millimetres && i % 3 === 2 ? `${mm} mm` : enCm(mm, r.millimetres));
  const lignes = liste.map((mm, i) => `<div class="me-ligne me-tracer"><div class="me-rep"><b class="me-lettre">${LETTRES[i]}</b> Trace un segment de <b>${dire(mm, i)}</b> à partir du point.</div>${segmentSvg(150, 0, NOIR, true)}</div>`).join("");
  const tete = entete("Tracer des segments", "Pose le zéro de la règle sur le point, trace le long de la règle jusqu'à la graduation demandée, puis marque l'extrémité d'un petit trait.");
  const corrige = `<div class="page corrige"><div class="titre">Tracer des segments — corrigé</div><div class="me-liste">${liste.map((mm, i) => `<div class="me-ligne"><b class="me-lettre">${LETTRES[i]}</b>${segmentSvg(mm, 0, ROUGE)}<span class="me-rep">${enCm(mm, r.millimetres)}</span></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-liste">${lignes}</div>${CONTROLE}</div>${corrige}`;
}

/** Comparer sans mesurer : des segments dans tous les sens, de longueurs voisines ; une bande de papier, ou le compas. */
function feuilleComparerSegments(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(3, Math.min(6, r.combien));
  const liste: number[] = [];
  for (let garde = 0; liste.length < combien && garde < 500; garde++) {
    const mm = entre(alea, 35, 75);
    // Des longueurs proches, mais qu'on distingue avec une bande : 4 mm au moins entre deux.
    if (liste.every((x) => Math.abs(x - mm) >= 4)) liste.push(mm);
  }
  const segments = liste.map((mm) => ({ mm, angle: [0, 20, 35, 50, -20, -35, -50][Math.floor(alea() * 7)] }));
  const cases = segments.map((s, i) => `<div class="me-case"><b class="me-lettre">${LETTRES[i]}</b>${segmentSvg(s.mm, s.angle, ROUGE)}</div>`).join("");
  const ordre = segments.map((s, i) => ({ ...s, l: LETTRES[i] })).sort((a, b) => a.mm - b.mm);
  const tete = entete("Comparer des segments", "Sans règle graduée : reporte la longueur de chaque segment sur une bande de papier (ou avec le compas), puis range les segments du plus court au plus long.");
  const reponse = `<div class="me-ranger">Du plus court au plus long : ${segments.map(() => `<span class="me-blanc me-blanc-court"></span>`).join(" &lt; ")}</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Comparer des segments — corrigé</div><div class="me-corrige"><div><b>${ordre.map((s) => s.l).join(" &lt; ")}</b></div>${ordre.map((s) => `<div>${s.l} : ${enCm(s.mm, true)}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-cases">${cases}</div>${reponse}</div>${corrige}`;
}

/** Un crayon, couché, de `mm` millimètres, à partir de `x`. */
function crayonSvg(mm: number, x: number, couleur: string): string {
  const corps = mm - 16;
  return `<g transform="translate(${x} 0)"><rect x="0" y="1.5" width="5" height="7" fill="#f2a7b8" stroke="${NOIR}" stroke-width="0.35"/>`
    + `<rect x="5" y="1.5" width="${corps}" height="7" fill="${couleur}" stroke="${NOIR}" stroke-width="0.35"/>`
    + `<path d="M${5 + corps} 1.5 L${mm} 5 L${5 + corps} 8.5 Z" fill="#f4dcb5" stroke="${NOIR}" stroke-width="0.35"/>`
    + `<path d="M${mm - 3.2} 4.1 L${mm} 5 L${mm - 3.2} 5.9 Z" fill="${NOIR}"/></g>`;
}

/** Les crayons : des longueurs voisines, des départs décalés — le plus à droite n'est pas forcément le plus long. */
function feuilleComparerObjets(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(3, Math.min(6, r.combien));
  const couleurs = ["#7fb2e5", "#f0c24b", "#8fd18f", "#e58f7f", "#c3a3e0", "#9fd6d2"];
  const liste: { mm: number; x: number }[] = [];
  for (let garde = 0; liste.length < combien && garde < 500; garde++) {
    const mm = entre(alea, 60, 130);
    if (liste.every((c) => Math.abs(c.mm - mm) >= 6)) liste.push({ mm, x: entre(alea, 0, 40) });
  }
  // Le piège : le crayon qui dépasse le plus à droite n'est pas le plus long.
  const finit = (c: { mm: number; x: number }) => c.x + c.mm;
  const plusLong = liste.reduce((a, b) => (b.mm > a.mm ? b : a));
  const plusADroite = liste.reduce((a, b) => (finit(b) > finit(a) ? b : a));
  if (plusLong === plusADroite) { plusLong.x = 0; const autre = liste.find((c) => c !== plusLong); if (autre) autre.x = Math.max(autre.x, plusLong.mm - autre.mm + 12); }
  const lignes = liste.map((c, i) => `<div class="me-crayon"><b class="me-lettre">${LETTRES[i]}</b><svg viewBox="0 0 175 10" width="175mm" height="10mm">${crayonSvg(c.mm, c.x, couleurs[i % couleurs.length])}</svg></div>`).join("");
  const ordre = liste.map((c, i) => ({ ...c, l: LETTRES[i] })).sort((a, b) => a.mm - b.mm);
  const tete = entete("Le plus long crayon", "Les crayons ne commencent pas tous au même endroit ! Compare leurs longueurs — avec une bande de papier, ou en les mesurant —, puis range-les du plus court au plus long.");
  const reponse = `<div class="me-ranger">Du plus court au plus long : ${liste.map(() => `<span class="me-blanc me-blanc-court"></span>`).join(" &lt; ")}</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Le plus long crayon — corrigé</div><div class="me-corrige"><div><b>${ordre.map((c) => c.l).join(" &lt; ")}</b></div>${ordre.map((c) => `<div>${c.l} : ${enCm(c.mm, true)}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-crayons">${lignes}</div>${reponse}</div>${corrige}`;
}

// ── Le périmètre (CE2) ────────────────────────────────────────────────────

type Point = [number, number];

/** Des polygones aux côtés entiers, en centimètres — des triangles 3-4-5 cachés dans les losanges, les toits et les trapèzes. */
export function polygoneAuHasard(alea: () => number, petit = false): { nom: string; points: Point[] } {
  const formes: (() => { nom: string; points: Point[] })[] = [
    () => { const a = entre(alea, 3, petit ? 5 : 7), b = entre(alea, 2, petit ? 3 : 4); return { nom: "un rectangle", points: [[0, 0], [a, 0], [a, b], [0, b]] }; },
    () => { const c = entre(alea, 3, petit ? 4 : 6); return { nom: "un carré", points: [[0, 0], [c, 0], [c, c], [0, c]] }; },
    () => ({ nom: "un triangle rectangle", points: [[0, 0], [4, 0], [0, 3]] }),
    () => ({ nom: "un triangle", points: [[0, 0], [6, 0], [3, 4]] }),
    () => (petit ? { nom: "un triangle rectangle", points: [[0, 0], [3, 0], [0, 4]] as Point[] } : { nom: "un losange", points: [[0, 3], [4, 0], [8, 3], [4, 6]] as Point[] }),
    () => { const h = entre(alea, 2, 3); return { nom: "une maison", points: [[0, 0], [6, 0], [6, h], [3, h + 4], [0, h]] }; },
    () => { const b = entre(alea, 2, 3); return { nom: "un trapèze", points: [[0, 0], [b + 6, 0], [b + 3, 4], [3, 4]] }; },
    () => { const a = entre(alea, 3, 5); return { nom: "un parallélogramme", points: [[0, 0], [a, 0], [a + 3, 4], [3, 4]] }; },
  ];
  const choix = petit ? [0, 1, 2, 4] : [0, 1, 2, 3, 4, 5, 6, 7];
  return formes[choix[Math.floor(alea() * choix.length)]]();
}

export const cotes = (points: Point[]) => points.map((p, i) => {
  const q = points[(i + 1) % points.length];
  return Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) * 10) / 10;
});

const tourner = (points: Point[], angle: number): Point[] => {
  const a = (angle * Math.PI) / 180;
  return points.map(([x, y]) => [10 * (x * Math.cos(a) - y * Math.sin(a)), -10 * (x * Math.sin(a) + y * Math.cos(a))] as Point);
};

/** Une inclinaison qui garde la figure dans sa case : 76 mm de large au plus ; à défaut, la plus étroite. */
export function orientation(points: Point[], alea: () => number, ecart = 25): number {
  const largeur = (angle: number) => { const xs = tourner(points, angle).map((p) => p[0]); return Math.max(...xs) - Math.min(...xs); };
  const essais = melanger(alea, Array.from({ length: 2 * ecart + 1 }, (_, i) => i - ecart));
  return essais.find((a) => largeur(a) <= 76) ?? [...essais, 90].sort((a, b) => largeur(a) - largeur(b))[0];
}

/** Le polygone à sa taille réelle, tourné de `angle` degrés, ses sommets marqués. */
function polygoneSvg(points: Point[], angle: number): string {
  const tournes = tourner(points, angle);
  const xs = tournes.map((p) => p[0]), ys = tournes.map((p) => p[1]);
  const minX = Math.min(...xs) - 4, minY = Math.min(...ys) - 4, w = Math.max(...xs) - minX + 4, h = Math.max(...ys) - minY + 4;
  const d = tournes.map(([x, y], i) => `${i ? "L" : "M"}${(x - minX).toFixed(2)} ${(y - minY).toFixed(2)}`).join(" ") + " Z";
  const sommets = tournes.map(([x, y]) => `<circle cx="${(x - minX).toFixed(2)}" cy="${(y - minY).toFixed(2)}" r="0.6" fill="${NOIR}"/>`).join("");
  return `<svg class="me-poly" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm"><path d="${d}" fill="#eef3fb" stroke="${NOIR}" stroke-width="0.45"/>${sommets}</svg>`;
}

function feuillePerimetre(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const liste = Array.from({ length: Math.max(1, Math.min(4, r.combien)) }, () => { const p = polygoneAuHasard(alea); return { ...p, angle: orientation(p.points, alea) }; });
  const cases = liste.map((p, i) => `<div class="me-case me-case-poly"><b class="me-lettre">${LETTRES[i]}</b>${polygoneSvg(p.points, p.angle)}
    <div class="me-rep">Les côtés : ……………………………………</div><div class="me-rep">Le périmètre de ${LETTRES[i]} : <span class="me-blanc"></span> cm</div></div>`).join("");
  const tete = entete("Le périmètre d'un polygone", "Le périmètre, c'est la longueur du tour de la figure. Mesure chaque côté avec la règle graduée, puis ajoute les longueurs.");
  const corrige = `<div class="page corrige"><div class="titre">Le périmètre — corrigé</div><div class="me-corrige">${liste.map((p, i) => { const c = cotes(p.points); return `<div>${LETTRES[i]} (${p.nom}) : ${c.map((x) => `${String(x).replace(".", ",")} cm`).join(" + ")} = <b>${String(c.reduce((s, x) => s + x, 0)).replace(".", ",")} cm</b></div>`; }).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-cases">${cases}</div>${CONTROLE}</div>${corrige}`;
}

/** Deux polygones, une demi-droite chacun : on y reporte les côtés au compas, bout à bout ; le plus long tour gagne. */
function feuillePerimetreCompas(_r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  let paire: { nom: string; points: Point[] }[] = [];
  for (let garde = 0; garde < 200; garde++) {
    paire = [polygoneAuHasard(alea, true), polygoneAuHasard(alea, true)];
    const [p, q] = paire.map((x) => cotes(x.points).reduce((s, c) => s + c, 0));
    if (p !== q && p <= 16 && q <= 16) break;
  }
  // La demi-droite tient dans la largeur de la page : 16 cm de tour au plus.
  const demiDroite = `<svg viewBox="0 0 164 8" width="164mm" height="8mm"><circle cx="2" cy="4" r="0.9" fill="${NOIR}"/><line x1="2" y1="4" x2="163.5" y2="4" stroke="${NOIR}" stroke-width="0.4"/></svg>`;
  const blocs = paire.map((p, i) => `<div class="me-compas"><div class="me-case me-case-poly"><b class="me-lettre">${LETTRES[i]}</b>${polygoneSvg(p.points, orientation(p.points, alea, 20))}</div>${demiDroite}</div>`).join("");
  const perimetres = paire.map((p) => cotes(p.points).reduce((s, c) => s + c, 0));
  const tete = entete("Comparer des périmètres au compas", "Sans règle graduée : prends l'écartement d'un côté avec le compas, reporte-le sur la demi-droite à partir du point, puis le côté suivant au bout du premier… Le tour de la figure se déroule sur la ligne. Quel polygone a le plus grand périmètre ?");
  const reponse = `<div class="me-ranger">Le polygone qui a le plus grand périmètre : <span class="me-blanc me-blanc-court"></span></div>`;
  const corrige = `<div class="page corrige"><div class="titre">Comparer des périmètres — corrigé</div><div class="me-corrige">${paire.map((p, i) => `<div>${LETTRES[i]} (${p.nom}) : ${perimetres[i]} cm</div>`).join("")}<div><b>${perimetres[0] > perimetres[1] ? "A" : "B"}</b> a le plus grand périmètre.</div></div></div>`;
  return `<div class="page">${tete}${blocs}${reponse}</div>${corrige}`;
}

// ── Les masses : la balance ───────────────────────────────────────────────

const COULEURS_BOITES = ["#f6c85f", "#6fa8dc", "#93c47d", "#e06666", "#b4a7d6"];

/** Un objet sur un plateau : une boîte à sa lettre. */
const boite = (x: number, y: number, lettre: string, i: number) =>
  `<rect x="${x - 9}" y="${y - 14}" width="18" height="14" rx="1.5" fill="${COULEURS_BOITES[i % COULEURS_BOITES.length]}" stroke="${NOIR}" stroke-width="0.6"/><text x="${x}" y="${y - 6.2}" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="8" fill="${NOIR}">${lettre}</text>`;

/**
 * Une balance Roberval : le fléau penche du côté le plus lourd, ou reste
 * horizontal à l'équilibre. Sur chaque plateau, ce qu'on y a posé.
 */
export function balanceSvg(gauche: string, droite: string, penche: -1 | 0 | 1, largeurMm = 74, demiPlateau = 16): string {
  const dy = penche * 6;
  const yG = 30 + dy, yD = 30 - dy;
  const plateau = (x: number, y: number) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 6}" stroke="${NOIR}" stroke-width="1"/><path d="M${x - demiPlateau} ${y} h${2 * demiPlateau}" stroke="${NOIR}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<svg class="me-balance" viewBox="0 0 100 62" width="${largeurMm}mm" height="${(largeurMm * 0.62).toFixed(1)}mm">`
    + `<path d="M28 60 L72 60 L64 52 L36 52 Z" fill="#d5d8de" stroke="${NOIR}" stroke-width="0.8"/>`
    + `<line x1="50" y1="52" x2="50" y2="38" stroke="${NOIR}" stroke-width="2"/>`
    + `<line x1="22" y1="${36 + dy}" x2="78" y2="${36 - dy}" stroke="${NOIR}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<circle cx="50" cy="36" r="1.8" fill="${NOIR}"/>`
    + `<path d="M47 37 L50 31 L53 37" fill="none" stroke="${ROUGE}" stroke-width="1"/>`
    + plateau(22, yG) + plateau(78, yD)
    + `<g>${gauche}</g><g>${droite}</g></svg>`;
}

/** Trois ou quatre objets, des pesées deux à deux qui suffisent à les ranger. */
export function pesesDeuxADeux(alea: () => number, n: number): { masses: number[]; pesees: [number, number][] } {
  const masses = melanger(alea, Array.from({ length: n }, (_, i) => i + 1));
  // Les objets voisins dans l'ordre se comparent : cela suffit, par transitivité.
  const ordre = masses.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m).map((x) => x.i);
  const pesees: [number, number][] = [];
  for (let k = 0; k + 1 < ordre.length; k++) pesees.push(alea() < 0.5 ? [ordre[k], ordre[k + 1]] : [ordre[k + 1], ordre[k]]);
  return { masses, pesees: melanger(alea, pesees) };
}

function feuilleBalances(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const series = Array.from({ length: Math.max(1, Math.min(3, Math.ceil(r.combien / 2))) }, () => pesesDeuxADeux(alea, r.classe === "CP" ? 3 : alea() < 0.5 ? 3 : 4));
  const blocs = series.map((s, k) => {
    const balances = s.pesees.map(([a, b]) => balanceSvg(boite(22, 30 + (s.masses[a] > s.masses[b] ? 6 : -6), LETTRES[a], a), boite(78, 30 - (s.masses[a] > s.masses[b] ? 6 : -6), LETTRES[b], b), s.masses[a] > s.masses[b] ? 1 : -1, 50)).join("");
    return `<div class="me-serie"><div class="me-serie-titre">${k + 1}. Les objets ${s.masses.map((_, i) => LETTRES[i]).join(", ")}</div><div class="me-balances">${balances}</div>
      <div class="me-ranger">Du plus léger au plus lourd : ${s.masses.map(() => `<span class="me-blanc me-blanc-court"></span>`).join(" &lt; ")}</div></div>`;
  }).join("");
  const tete = entete("La balance : plus lourd, plus léger", "Le plateau le plus bas porte l'objet le plus lourd. Lis chaque balance, puis range les objets du plus léger au plus lourd.");
  const corrige = `<div class="page corrige"><div class="titre">La balance — corrigé</div><div class="me-corrige">${series.map((s, k) => `<div>${k + 1}. <b>${s.masses.map((m, i) => ({ m, l: LETTRES[i] })).sort((a, b) => a.m - b.m).map((x) => x.l).join(" &lt; ")}</b></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}${blocs}</div>${corrige}`;
}

/** Les masses marquées de la boîte : du kilogramme au gramme. */
export const MASSES_MARQUEES = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const ecrireMasse = (g: number) => (g >= 1000 && g % 1000 === 0 ? `${g / 1000} kg` : g > 1000 ? `${Math.floor(g / 1000)} kg ${g % 1000} g` : `${g} g`);

/** La largeur et la hauteur d'une masse marquée sur le dessin : les grosses masses sont plus grandes. */
const largeurMasse = (g: number) => (g >= 1000 ? 9.5 : g >= 100 ? 9 : g >= 10 ? 8 : 7);
const hauteurMasse = (g: number) => (g >= 1000 ? 11 : g >= 100 ? 9.5 : g >= 10 ? 8 : 6.5);

/** Une masse marquée, debout sur le plateau. */
const masseMarquee = (x: number, y: number, g: number) => {
  const h = hauteurMasse(g), l = largeurMasse(g);
  return `<rect x="${(x - l / 2).toFixed(2)}" y="${(y - h).toFixed(2)}" width="${l}" height="${h}" rx="1" fill="#c8ccd4" stroke="${NOIR}" stroke-width="0.5"/><circle cx="${x}" cy="${(y - h - 1.2).toFixed(2)}" r="1.2" fill="#c8ccd4" stroke="${NOIR}" stroke-width="0.4"/>`
    + `<text x="${x}" y="${(y - h / 2).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${g >= 100 ? 3.3 : 3.5}" fill="${NOIR}">${g >= 1000 ? `${g / 1000} kg` : `${g} g`}</text>`;
};

/** Des objets à peser, et leur masse vraisemblable en grammes : une trousse ne pèse pas deux kilogrammes. */
const OBJETS_A_PESER: { nom: string; de: number; a: number }[] = [
  { nom: "le paquet de riz", de: 450, a: 1000 }, { nom: "la boîte de crayons", de: 100, a: 400 }, { nom: "le livre", de: 200, a: 900 },
  { nom: "la pomme", de: 120, a: 250 }, { nom: "le pot de confiture", de: 300, a: 450 }, { nom: "la trousse", de: 150, a: 400 },
  { nom: "le melon", de: 800, a: 1600 }, { nom: "le sac de billes", de: 200, a: 700 }, { nom: "le dictionnaire", de: 1000, a: 2500 },
  { nom: "la bouteille de lait", de: 1000, a: 1100 }, { nom: "le chou", de: 700, a: 1500 }, { nom: "le sac de pommes de terre", de: 2000, a: 2900 },
];

function feuillePesees(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const combien = Math.max(1, Math.min(6, r.combien));
  // Au CE1, des objets de moins d'un kilogramme ; au CE2, des kilogrammes aussi.
  const objets = melanger(alea, OBJETS_A_PESER.filter((o) => r.classe === "CE2" || o.a < 1000)).slice(0, combien);
  const liste = objets.map(({ nom, de, a }) => {
    // Une masse vraisemblable qu'on fait avec trois à six masses marquées.
    let g = 0, masses: number[] = [];
    for (let garde = 0; garde < 200; garde++) {
      g = 5 * entre(alea, Math.ceil(de / 5), Math.floor(a / 5));
      masses = [];
      let reste = g;
      for (const m of MASSES_MARQUEES) while (reste >= m) { masses.push(m); reste -= m; }
      if (masses.length >= 3 && masses.length <= 6) break;
    }
    return { nom, g, masses };
  });
  const blocs = liste.map((o, i) => {
    // Les masses côte à côte sur le plateau de droite (de 57 à 99) ; celles qui n'y tiennent pas, posées par-dessus.
    const rangees: number[][] = [[]];
    for (const m of o.masses) {
      const r0 = rangees[rangees.length - 1];
      const large = r0.reduce((t, x) => t + largeurMasse(x) + 0.8, 0) + largeurMasse(m);
      if (r0.length && large > 41) rangees.push([m]); else r0.push(m);
    }
    let base = 30;
    const posees = rangees.map((rangee) => {
      const total = rangee.reduce((t, m) => t + largeurMasse(m), 0) + 0.8 * (rangee.length - 1);
      let x = 78 - total / 2;
      const dessin = rangee.map((m) => { const centre = x + largeurMasse(m) / 2; x += largeurMasse(m) + 0.8; return masseMarquee(+centre.toFixed(2), base, m); }).join("");
      base -= Math.max(...rangee.map(hauteurMasse)) + 2.6;
      return dessin;
    }).join("");
    const objet = `<rect x="11" y="18" width="22" height="12" rx="2" fill="#f6c85f" stroke="${NOIR}" stroke-width="0.6"/>`;
    return `<div class="me-case me-pesee"><b class="me-lettre">${i + 1}</b>${balanceSvg(objet, posees, 0, 78, 21)}<div class="me-rep">${escapeHtml(o.nom.charAt(0).toUpperCase() + o.nom.slice(1))} pèse <span class="me-blanc"></span></div></div>`;
  }).join("");
  const tete = entete("Peser avec des masses marquées", "La balance est en équilibre : l'objet pèse autant que les masses marquées de l'autre plateau. Ajoute-les pour trouver sa masse.");
  const corrige = `<div class="page corrige"><div class="titre">Peser — corrigé</div><div class="me-corrige">${liste.map((o, i) => `<div>${i + 1}. ${o.masses.map(ecrireMasse).join(" + ")} = <b>${ecrireMasse(o.g)}</b></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-cases">${blocs}</div></div>${corrige}`;
}

// ── Les unités, les références, les estimations ───────────────────────────

/** Une mesure de référence : la phrase, quatre mesures dont une vraisemblable, la classe où toutes ses unités sont connues. */
export interface Reference { grandeur: Grandeur; classe: Classe; phrase: string; options: string[]; juste: number }

const R = (grandeur: Grandeur, classe: Classe, phrase: string, options: string[], juste: number): Reference => ({ grandeur, classe, phrase, options, juste });

/** Les références : celles de l'évaluation Éduscol « Estimations — Masses » et de l'activité « Masses », puis des objets du quotidien. */
export const REFERENCES: Reference[] = [
  R("longueur", "CP", "Un crayon neuf mesure", ["15 cm", "150 cm", "15 m", "1 cm"], 0),
  R("longueur", "CP", "La porte de la classe est haute de", ["2 cm", "20 cm", "2 m", "20 m"], 2),
  R("longueur", "CP", "Une fourchette mesure", ["2 cm", "20 cm", "2 m", "20 m"], 1),
  R("longueur", "CP", "Un bus est long de", ["12 cm", "120 cm", "12 m", "120 m"], 2),
  R("longueur", "CP", "Une gomme mesure", ["4 cm", "40 cm", "4 m", "40 m"], 0),
  R("longueur", "CP", "La cour de l'école est longue de", ["40 cm", "4 m", "40 m", "400 m"], 2),
  R("longueur", "CP", "Un timbre mesure", ["3 cm", "30 cm", "3 m", "30 m"], 0),
  R("longueur", "CP", "Un lit mesure", ["2 cm", "20 cm", "2 m", "20 m"], 2),
  R("longueur", "CP", "Une trousse mesure", ["2 cm", "20 cm", "1 m", "10 m"], 1),
  R("longueur", "CP", "La classe est large de", ["8 cm", "80 cm", "8 m", "80 m"], 2),
  R("longueur", "CP", "Le couloir de l'école est long de", ["30 cm", "3 m", "30 m", "300 m"], 2),
  R("longueur", "CE1", "La tour Eiffel est haute de", ["33 m", "330 m", "3 km", "33 km"], 1),
  R("longueur", "CE1", "Un marathon est une course de", ["42 m", "420 m", "42 km", "420 km"], 2),
  R("longueur", "CE1", "De Paris à Marseille, il y a environ", ["8 m", "80 m", "8 km", "800 km"], 3),
  R("longueur", "CE1", "Un terrain de football est long de", ["10 m", "100 m", "10 km", "100 km"], 1),
  R("longueur", "CE1", "Une piscine de quartier est longue de", ["25 cm", "25 m", "250 m", "25 km"], 1),
  R("longueur", "CE2", "Une fourmi mesure", ["5 mm", "5 cm", "5 dm", "5 m"], 0),
  R("longueur", "CE2", "Une règle d'écolier mesure", ["2 mm", "2 cm", "2 dm", "2 m"], 2),
  R("longueur", "CE2", "Une pièce de 1 € est épaisse de", ["2 mm", "2 cm", "2 dm", "2 m"], 0),
  R("longueur", "CE2", "Une coccinelle mesure", ["7 mm", "7 cm", "7 dm", "7 m"], 0),
  R("masse", "CE1", "Le cartable de Pierre, avec ses affaires, pèse", ["40 g", "400 g", "4 kg", "40 kg"], 2),
  R("masse", "CE1", "Le téléphone portable de Léo pèse", ["12 g", "120 g", "1 200 g", "12 kg"], 1),
  R("masse", "CE1", "Une pomme pèse environ", ["2 g", "20 g", "200 g", "2 kg"], 2),
  R("masse", "CE1", "Un pack de six bouteilles d'eau pèse", ["9 g", "90 g", "900 g", "9 kg"], 3),
  R("masse", "CE1", "Une bouteille d'un litre d'eau pèse", ["1 g", "10 g", "100 g", "1 kg"], 3),
  R("masse", "CE1", "Un élève de CE1 pèse environ", ["25 g", "250 g", "25 kg", "250 kg"], 2),
  R("masse", "CE1", "Une gomme pèse", ["20 g", "200 g", "2 kg", "20 kg"], 0),
  R("masse", "CE1", "Un chat pèse environ", ["4 g", "40 g", "4 kg", "40 kg"], 2),
  R("masse", "CE1", "Un croissant pèse", ["5 g", "50 g", "500 g", "5 kg"], 1),
  R("masse", "CE1", "Un paquet de sucre pèse", ["1 g", "10 g", "100 g", "1 kg"], 3),
  R("masse", "CE1", "Un sachet de levure pèse environ", ["1 g", "10 g", "100 g", "1 kg"], 1),
  R("masse", "CE2", "Une feuille de papier pèse environ", ["5 g", "50 g", "500 g", "5 kg"], 0),
  R("masse", "CE2", "Un dictionnaire pèse environ", ["2 g", "20 g", "200 g", "2 kg"], 3),
  R("masse", "CE2", "Un seau rempli d'eau pèse environ", ["10 g", "100 g", "10 kg", "100 kg"], 2),
  R("masse", "CE2", "Une voiture pèse environ", ["1 kg", "10 kg", "100 kg", "1 t"], 3),
  R("masse", "CE2", "Un éléphant pèse environ", ["5 kg", "50 kg", "500 kg", "5 t"], 3),
  R("masse", "CE2", "Un camion chargé pèse", ["20 g", "20 kg", "200 kg", "20 t"], 3),
  R("contenance", "CE2", "Une bouteille d'eau contient", ["1 cL", "1 dL", "1 L", "100 L"], 2),
  R("contenance", "CE2", "Une canette de soda contient", ["33 cL", "33 dL", "33 L", "330 L"], 0),
  R("contenance", "CE2", "Une baignoire contient environ", ["15 cL", "15 dL", "15 L", "150 L"], 3),
  R("contenance", "CE2", "Un verre contient environ", ["2 cL", "20 cL", "2 L", "20 L"], 1),
  R("contenance", "CE2", "Un seau contient", ["10 cL", "10 dL", "10 L", "100 L"], 2),
  R("contenance", "CE2", "Une cuillère à soupe contient environ", ["1 cL", "1 dL", "1 L", "10 L"], 0),
  R("contenance", "CE2", "Un arrosoir contient", ["5 cL", "5 dL", "5 L", "50 L"], 2),
  R("contenance", "CE2", "Une brique de lait contient", ["1 cL", "1 dL", "1 L", "10 L"], 2),
  R("contenance", "CE2", "Une tasse de chocolat contient environ", ["2 cL", "2 dL", "2 L", "20 L"], 1),
  R("contenance", "CE2", "L'aquarium de la classe contient", ["60 cL", "60 dL", "60 L", "600 L"], 2),
];

const RANG: Record<Classe, number> = { CP: 0, CE1: 1, CE2: 2 };

/** Les unités qu'une classe connaît pour une grandeur. */
export function unitesConnues(g: Grandeur, classe: Classe): string[] {
  if (g === "longueur") return classe === "CP" ? ["cm", "m"] : classe === "CE1" ? ["cm", "m", "km"] : ["mm", "cm", "dm", "m", "km"];
  if (g === "masse") return classe === "CE2" ? ["g", "kg", "t"] : ["g", "kg"];
  return ["cL", "dL", "L"];
}

/** Les références d'une grandeur que la classe peut lire : les siennes et celles des classes d'avant. */
export const referencesPour = (g: Grandeur, classe: Classe) => REFERENCES.filter((x) => x.grandeur === g && RANG[x.classe] <= RANG[classe]);

function feuilleEstimer(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const liste = melanger(alea, referencesPour(r.grandeur, r.classe)).slice(0, Math.max(1, Math.min(10, r.combien)));
  const lignes = liste.map((x, i) => `<div class="me-qcm"><div class="me-phrase"><span class="me-num">${LETTRES[i]}.</span> ${escapeHtml(x.phrase)} :</div><div class="me-options">${x.options.map((o) => `<span>${o.replace(/ /g, " ")}</span>`).join("")}</div></div>`).join("");
  const tete = entete("Estimer : la bonne mesure", "Pour chaque ligne, entoure la mesure qui te semble juste. Pense aux objets que tu connais : un litre d'eau pèse un kilogramme, la porte de la classe mesure deux mètres…");
  const corrige = `<div class="page corrige"><div class="titre">Estimer — corrigé</div><div class="me-corrige">${liste.map((x, i) => `<div>${LETTRES[i]}. ${escapeHtml(x.phrase)} <b>${x.options[x.juste]}</b>.</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-qcms">${lignes}</div></div>${corrige}`;
}

/** Choisir l'unité : la mesure juste sans son unité, et les unités que la classe connaît. */
function feuilleUnites(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const connues = unitesConnues(r.grandeur, r.classe);
  const liste = melanger(alea, referencesPour(r.grandeur, r.classe).filter((x) => /^[\d  ]+ [a-zA-Z]+$/.test(x.options[x.juste])))
    .slice(0, Math.max(1, Math.min(10, r.combien)));
  const lignes = liste.map((x, i) => {
    const [, nombre] = /^([\d  ]+) /.exec(x.options[x.juste])!;
    return `<div class="me-qcm"><div class="me-phrase"><span class="me-num">${LETTRES[i]}.</span> ${escapeHtml(x.phrase)} ${nombre.trim()} <span class="me-blanc me-blanc-court"></span></div><div class="me-options">${connues.map((u) => `<span>${u}</span>`).join("")}</div></div>`;
  }).join("");
  const tete = entete("Choisir l'unité", `Complète chaque phrase avec l'unité qui convient : entoure-la, puis écris-la. Les unités : ${connues.join(", ")}.`);
  const corrige = `<div class="page corrige"><div class="titre">Choisir l'unité — corrigé</div><div class="me-corrige">${liste.map((x, i) => `<div>${LETTRES[i]}. ${escapeHtml(x.phrase)} <b>${x.options[x.juste]}</b>.</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-qcms">${lignes}</div></div>${corrige}`;
}

/** Une conversion à compléter : l'énoncé avec ses blancs, et une réponse par blanc. */
export interface Conversion { enonce: string; reponses: string[] }

const trou = `<span class="me-blanc"></span>`;

/**
 * Les relations entre les unités qu'on connaît, sans tableau — « les élèves
 * n'utilisent pas de tableaux de conversion au cycle 2, mais s'appuient sur
 * les relations connues » —, écrites comme dans les exemples du programme :
 * « 1 m + 46 cm = 146 cm » (CE1) ; « 3 cm + 4 mm = 30 mm + 4 mm = 34 mm »,
 * « 5 km + 750 m = 5 750 m », « 5 462 g = 5 kg + 462 g », « 5 350 kg =
 * 5 t 350 kg », « 780 cL = 700 cL + 80 cL = 7 L + 80 cL » (CE2).
 */
export function conversions(g: Grandeur, classe: Classe, combien: number, graine: number): Conversion[] {
  const alea = hasard(graine);
  const n = (x: number) => milliers(x);
  const c = (enonce: string, ...reponses: (number | string)[]): Conversion => ({ enonce, reponses: reponses.map((x) => (typeof x === "number" ? n(x) : x)) });
  // Les relations de la classe d'abord, puis celles qu'on connaît depuis les classes d'avant.
  const parClasse: Record<Classe, (() => Conversion)[]> = { CP: [], CE1: [], CE2: [] };
  let pour: Classe = "CP";
  const ajouter = (...f: (() => Conversion)[]) => parClasse[pour].push(...f);
  if (g === "longueur") {
    ajouter(
      () => c(`1 m = ${trou} cm`, 100),
      () => { const x = 10 * entre(alea, 1, 9); return c(`${x} cm + ${trou} cm = 1 m`, 100 - x); },
    );
    pour = "CE1";
    ajouter(
      () => c(`1 km = ${trou} m`, 1000),
      () => { const m = entre(alea, 2, 9); return c(`${m} m = ${trou} cm`, 100 * m); },
      () => { const m = entre(alea, 2, 9); return c(`${n(100 * m)} cm = ${trou} m`, m); },
      () => { const m = entre(alea, 1, 4), x = entre(alea, 5, 95); return c(`${m} m + ${x} cm = ${trou} cm`, 100 * m + x); },
      () => { const m = entre(alea, 1, 4), x = entre(alea, 5, 95); return c(`${n(100 * m + x)} cm = ${trou} m + ${trou} cm`, m, x); },
      () => { const k = entre(alea, 2, 9); return c(`${k} km = ${trou} m`, 1000 * k); },
      () => { const m = 100 * entre(alea, 1, 9); return c(`${n(m)} m + ${trou} m = 1 km`, 1000 - m); },
    );
    pour = "CE2";
    ajouter(
      () => c(`1 cm = ${trou} mm`, 10),
      () => c(`1 m = ${trou} mm`, 1000),
      () => c(`1 dm = ${trou} cm`, 10),
      () => c(`1 m = ${trou} dm`, 10),
      () => { const x = entre(alea, 2, 14), m = entre(alea, 1, 9); return c(`${x} cm + ${m} mm = ${trou} mm`, 10 * x + m); },
      () => { const x = entre(alea, 2, 15); return c(`${x} cm = ${trou} mm`, 10 * x); },
      () => { const x = entre(alea, 2, 15), m = entre(alea, 1, 9); return c(`${10 * x + m} mm = ${trou} cm + ${trou} mm`, x, m); },
      () => { const m = entre(alea, 2, 19); return c(`${m} m = ${trou} dm`, 10 * m); },
      () => { const m = entre(alea, 1, 3), d = entre(alea, 1, 9), x = entre(alea, 1, 9); return c(`${100 * m + 10 * d + x} cm = ${trou} m + ${trou} dm + ${trou} cm`, m, d, x); },
      () => { const k = entre(alea, 1, 9), m = 50 * entre(alea, 1, 19); return c(`${k} km + ${n(m)} m = ${trou} m`, 1000 * k + m); },
    );
  } else if (g === "masse") {
    pour = "CE1";
    ajouter(
      () => c(`1 kg = ${trou} g`, 1000),
      () => { const k = entre(alea, 2, 9); return c(`${k} kg = ${trou} g`, 1000 * k); },
      () => { const k = entre(alea, 2, 9); return c(`${n(1000 * k)} g = ${trou} kg`, k); },
      () => { const k = entre(alea, 1, 4), x = 50 * entre(alea, 1, 19); return c(`${k} kg + ${x} g = ${trou} g`, 1000 * k + x); },
      () => { const x = 100 * entre(alea, 1, 9); return c(`${x} g + ${trou} g = 1 kg`, 1000 - x); },
      () => c(`500 g + 500 g = ${trou} kg`, 1),
    );
    pour = "CE2";
    ajouter(
      () => { const k = entre(alea, 1, 9), x = entre(alea, 101, 999); return c(`${n(1000 * k + x)} g = ${trou} kg + ${trou} g`, k, x); },
      () => c(`1 t = ${trou} kg`, 1000),
      () => { const t = entre(alea, 2, 9); return c(`${t} t = ${trou} kg`, 1000 * t); },
      () => { const t = entre(alea, 1, 9), k = 50 * entre(alea, 1, 19); return c(`${n(1000 * t + k)} kg = ${trou} t ${trou} kg`, t, k); },
    );
  } else {
    pour = "CE2";
    ajouter(
      () => c(`1 L = ${trou} dL`, 10),
      () => c(`1 L = ${trou} cL`, 100),
      () => c(`1 dL = ${trou} cL`, 10),
      () => { const l = entre(alea, 2, 9); return c(`${l} L = ${trou} dL`, 10 * l); },
      () => { const l = entre(alea, 2, 9); return c(`${l} L = ${trou} cL`, 100 * l); },
      () => { const d = entre(alea, 2, 9); return c(`${d} dL = ${trou} cL`, 10 * d); },
      () => { const l = entre(alea, 2, 9), x = 10 * entre(alea, 1, 9); return c(`${100 * l + x} cL = ${trou} L + ${trou} cL`, l, x); },
      () => { const l = entre(alea, 1, 3), x = 5 * entre(alea, 1, 19); return c(`${l} L + ${x} cL = ${trou} cL`, 100 * l + x); },
      () => { const x = [25, 50, 75, 20, 40, 60, 80][entre(alea, 0, 6)]; return c(`${x} cL + ${trou} cL = 1 L`, 100 - x); },
    );
  }
  const rang = RANG[classe];
  const propres = parClasse[classe].length ? parClasse[classe] : (["CE2", "CE1", "CP"] as Classe[]).filter((k) => RANG[k] <= rang).map((k) => parClasse[k]).find((l) => l.length) ?? [];
  const anciens = (["CP", "CE1", "CE2"] as Classe[]).filter((k) => RANG[k] <= rang).flatMap((k) => parClasse[k]).filter((f) => !propres.includes(f));
  // Une grandeur que la classe ne convertit pas encore (les masses au CP) : les relations de la classe suivante.
  const ordre = propres.length || anciens.length ? [...melanger(alea, propres), ...melanger(alea, anciens)] : melanger(alea, Object.values(parClasse).flat());
  const sortie: Conversion[] = [];
  const vus = new Set<string>();
  for (let garde = 0; ordre.length && sortie.length < Math.max(1, Math.min(12, combien)) && garde < 500; garde++) {
    const x = ordre[garde % ordre.length]();
    if (!vus.has(x.enonce)) { vus.add(x.enonce); sortie.push(x); }
  }
  return melanger(alea, sortie);
}

/** L'énoncé, ses blancs remplis par les réponses : pour le corrigé. */
export const rempli = (c: Conversion) => { let i = 0; return c.enonce.split(trou).map((morceau, k) => (k ? `<b>${c.reponses[i++] ?? ""}</b>` : "") + morceau).join(""); };

const RELATIONS: Record<Grandeur, Record<Classe, string>> = {
  longueur: { CP: "1 m = 100 cm.", CE1: "1 m = 100 cm ; 1 km = 1 000 m.", CE2: "1 cm = 10 mm ; 1 dm = 10 cm ; 1 m = 10 dm = 100 cm ; 1 km = 1 000 m." },
  masse: { CP: "1 kg = 1 000 g.", CE1: "1 kg = 1 000 g.", CE2: "1 kg = 1 000 g ; 1 t = 1 000 kg." },
  contenance: { CP: "1 L = 10 dL = 100 cL.", CE1: "1 L = 10 dL = 100 cL.", CE2: "1 L = 10 dL = 100 cL ; 1 dL = 10 cL." },
};

function feuilleConvertir(r: ReglagesMesures, graine: number): string {
  const liste = conversions(r.grandeur, r.classe, r.combien, graine);
  const lignes = liste.map((c, i) => `<div class="me-conv"><span class="me-num">${LETTRES[i]}.</span> ${c.enonce}</div>`).join("");
  const tete = entete("Les relations entre les unités", `Complète. Ce qu'on sait : ${RELATIONS[r.grandeur][r.classe]}`);
  const corrige = `<div class="page corrige"><div class="titre">Les relations entre les unités — corrigé</div><div class="me-corrige">${liste.map((c, i) => `<div>${LETTRES[i]}. ${rempli(c)}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-convs">${lignes}</div></div>${corrige}`;
}

/** Deux mesures de la même grandeur, écrites dans des unités différentes : laquelle est la plus grande ? */
export function mesuresAComparer(g: Grandeur, classe: Classe, combien: number, graine: number): { a: string; b: string; signe: "<" | ">" | "=" }[] {
  const alea = hasard(graine);
  // La mesure dans la plus petite unité de la classe : le millimètre au CE2, le centimètre avant ; le gramme ; le centilitre.
  const tirer = (): number => (g === "longueur" ? (classe === "CE2" ? 10 * entre(alea, 30, 400) + (alea() < 0.3 ? entre(alea, 1, 9) : 0) : entre(alea, 60, 400))
    : g === "masse" ? 10 * entre(alea, 50, 400) : 5 * entre(alea, 10, 80));
  const sortie: { a: string; b: string; signe: "<" | ">" | "=" }[] = [];
  for (let garde = 0; sortie.length < Math.max(1, Math.min(12, combien)) && garde < 1000; garde++) {
    const x = tirer();
    // Le piège : des nombres qui trompent — 1 m et 20 cm, 102 cm ; et parfois l'égalité.
    const choix = alea();
    const y = choix < 0.2 ? x : choix < 0.55 ? Math.max(1, x + (alea() < 0.5 ? -1 : 1) * entre(alea, 1, 30) * (g === "contenance" ? 5 : 1)) : tirer();
    const a = ecrireMesure(x, g, classe, "grande"), b = ecrireMesure(y, g, classe, "petite");
    if (a === b) continue;
    sortie.push({ a, b, signe: x < y ? "<" : x > y ? ">" : "=" });
  }
  return sortie;
}

function feuilleComparerMesures(r: ReglagesMesures, graine: number): string {
  const liste = mesuresAComparer(r.grandeur, r.classe, r.combien, graine);
  const lignes = liste.map((c, i) => `<div class="me-conv"><span class="me-num">${LETTRES[i]}.</span> ${c.a} <span class="me-signe"></span> ${c.b}</div>`).join("");
  const tete = entete("Comparer des mesures", `Écris &lt;, &gt; ou = entre les deux mesures. Pour comparer, écris-les d'abord dans la même unité. ${RELATIONS[r.grandeur][r.classe]}`);
  const corrige = `<div class="page corrige"><div class="titre">Comparer des mesures — corrigé</div><div class="me-corrige">${liste.map((c, i) => `<div>${LETTRES[i]}. ${c.a} <b>${c.signe === "<" ? "&lt;" : c.signe === ">" ? "&gt;" : "="}</b> ${c.b}</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="me-convs">${lignes}</div></div>${corrige}`;
}

/** Une mesure dans la plus petite unité de la classe, écrite « à la française » : « 1 kg et 300 g », « 2 m et 15 cm », « 1 L et 25 cL ». */
export function ecrireMesure(x: number, g: Grandeur, classe: Classe, forme: "grande" | "petite"): string {
  if (g === "longueur") {
    const mm = classe === "CE2";
    const cm = mm ? Math.floor(x / 10) : x, reste = mm ? x % 10 : 0;
    if (forme === "petite") return reste ? `${milliers(x)} mm` : `${milliers(cm)} cm`;
    const parties = [cm >= 100 ? `${Math.floor(cm / 100)} m` : "", cm % 100 ? `${cm % 100} cm` : "", reste ? `${reste} mm` : ""].filter(Boolean);
    return parties.length > 1 ? `${parties.slice(0, -1).join(" ")} et ${parties[parties.length - 1]}` : parties[0] ?? "0 cm";
  }
  if (g === "masse") {
    if (forme === "petite" || x < 1000) return `${milliers(x)} g`;
    return [`${Math.floor(x / 1000)} kg`, x % 1000 ? `${x % 1000} g` : ""].filter(Boolean).join(" et ");
  }
  if (forme === "petite" || x < 100) return `${x} cL`;
  return [`${Math.floor(x / 100)} L`, x % 100 ? `${x % 100} cL` : ""].filter(Boolean).join(" et ");
}

/**
 * Quatre mesures à ranger, écrites de façons différentes — « ordonner dans
 * l'ordre croissant : 1 kg et 300 g ; 1 000 g ; 50 kg ; 2 kg et 100 g »
 * (programme, CE1) —, dont une qui trompe : un grand nombre dans une petite
 * unité.
 */
export function mesuresARanger(g: Grandeur, classe: Classe, combien: number, graine: number): { valeurs: number[]; ecrits: string[] }[] {
  const alea = hasard(graine);
  const tirer = (): number => (g === "longueur" ? (classe === "CE2" ? 10 * entre(alea, 20, 400) + (alea() < 0.4 ? entre(alea, 1, 9) : 0) : entre(alea, 20, 400))
    : g === "masse" ? (alea() < 0.2 ? 1000 * entre(alea, 5, 60) : 50 * entre(alea, 4, 60)) : 5 * entre(alea, 6, 90));
  const sortie: { valeurs: number[]; ecrits: string[] }[] = [];
  for (let k = 0; k < Math.max(1, Math.min(6, Math.ceil(combien / 2))); k++) {
    const valeurs = new Set<number>();
    for (let garde = 0; valeurs.size < 4 && garde < 200; garde++) valeurs.add(tirer());
    const liste = [...valeurs];
    sortie.push({ valeurs: liste, ecrits: liste.map((x, i) => ecrireMesure(x, g, classe, (i + k) % 2 ? "petite" : "grande")) });
  }
  return sortie;
}

function feuilleOrdonner(r: ReglagesMesures, graine: number): string {
  const series = mesuresARanger(r.grandeur, r.classe, r.combien, graine);
  const blocs = series.map((s, i) => `<div class="me-serie"><div class="me-serie-titre">${i + 1}.</div><div class="me-etiquettes">${s.ecrits.map((e) => `<span class="me-etiquette">${e}</span>`).join("")}</div>
    <div class="me-ranger">Dans l'ordre croissant : ${s.ecrits.map(() => `<span class="me-blanc me-blanc-large"></span>`).join(" &lt; ")}</div></div>`).join("");
  const tete = entete("Ranger des mesures", `Range les mesures de la plus petite à la plus grande. Écris-les d'abord dans la même unité. ${RELATIONS[r.grandeur][r.classe]}`);
  const corrige = `<div class="page corrige"><div class="titre">Ranger des mesures — corrigé</div><div class="me-corrige">${series.map((s, i) => `<div>${i + 1}. <b>${s.valeurs.map((x, k) => ({ x, e: s.ecrits[k] })).sort((a, b) => a.x - b.x).map((y) => y.e).join(" &lt; ")}</b></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}${blocs}</div>${corrige}`;
}

/** Un verre, pour compter les contenances : l'étalon. */
const verreSvg = `<svg class="me-verre" viewBox="0 0 10 12" width="5mm" height="6mm"><path d="M1 1 L9 1 L7.6 11 L2.4 11 Z" fill="#dbeefe" stroke="${NOIR}" stroke-width="0.6"/><path d="M1.6 4.5 L8.4 4.5 L7.6 11 L2.4 11 Z" fill="#8ec5f0"/></svg>`;

/** Des récipients et leur silhouette. */
const RECIPIENTS: { nom: string; dessin: string }[] = [
  { nom: "la bouteille", dessin: `<path d="M8 2 h4 v5 l3 3 v18 h-10 v-18 l3 -3 Z" />` },
  { nom: "la carafe", dessin: `<path d="M8 2 h4 v6 c6 3 7 8 7 13 c0 5 -3 7 -9 7 c-6 0 -9 -2 -9 -7 c0 -5 1 -10 7 -13 Z" />` },
  { nom: "le pichet", dessin: `<path d="M3 4 h12 l1 -2 l1 3 v23 h-14 Z M17 9 c4 0 4 9 0 9" />` },
  { nom: "le vase", dessin: `<path d="M6 2 h8 l-1 4 c5 4 5 16 1 22 h-8 c-4 -6 -4 -18 1 -22 Z" />` },
  { nom: "la casserole", dessin: `<path d="M2 10 h16 v14 h-16 Z M18 12 h9" />` },
  { nom: "le seau", dessin: `<path d="M3 8 h16 l-2 20 h-12 Z M4 8 c0 -8 14 -8 14 0" />` },
];

/**
 * Comparer des contenances avec un étalon : « en déterminant le nombre de
 * verres que contient chacun de deux récipients » (programme, CE2).
 */
function feuilleVerres(r: ReglagesMesures, graine: number): string {
  const alea = hasard(graine);
  const series: { nom: string; dessin: string; verres: number }[][] = [];
  for (let k = 0; k < Math.max(1, Math.min(3, Math.ceil(r.combien / 3))); k++) {
    const recipients = melanger(alea, RECIPIENTS).slice(0, 3);
    const comptes = new Set<number>();
    while (comptes.size < 3) comptes.add(entre(alea, 3, 14));
    const liste = [...comptes];
    series.push(recipients.map((x, i) => ({ ...x, verres: liste[i] })));
  }
  const ligne = (x: { nom: string; dessin: string; verres: number }) => `<div class="me-recipient"><svg viewBox="-1 0 30 30" width="12mm" height="12mm"><g fill="#eef3fb" stroke="${NOIR}" stroke-width="0.8">${x.dessin}</g></svg>
    <div><div class="me-nom">${x.nom.charAt(0).toUpperCase() + x.nom.slice(1)} remplit ${x.verres} verres :</div><div class="me-verres">${verreSvg.repeat(x.verres)}</div></div></div>`;
  const blocs = series.map((s, k) => {
    const [a, b] = [...s].sort((x, y) => y.verres - x.verres);
    return `<div class="me-serie"><div class="me-serie-titre">${k + 1}.</div>${s.map(ligne).join("")}
      <div class="me-ranger">Du plus petit au plus grand : ${s.map(() => `<span class="me-blanc me-blanc-large"></span>`).join(" &lt; ")}</div>
      <div class="me-ranger">${a.nom.charAt(0).toUpperCase() + a.nom.slice(1)} contient <span class="me-blanc"></span> verres de plus que ${b.nom}.</div></div>`;
  }).join("");
  const tete = entete("Combien de verres ?", "On a rempli chaque récipient avec le même verre. Plus il faut de verres, plus le récipient contient. Range les récipients, puis compare.");
  const corrige = `<div class="page corrige"><div class="titre">Combien de verres ? — corrigé</div><div class="me-corrige">${series.map((s, k) => { const tri = [...s].sort((x, y) => x.verres - y.verres); return `<div>${k + 1}. <b>${tri.map((x) => `${x.nom} (${x.verres})`).join(" &lt; ")}</b> ; ${tri[2].verres} − ${tri[1].verres} = ${tri[2].verres - tri[1].verres} verres de plus.</div>`; }).join("")}</div></div>`;
  return `<div class="page">${tete}${blocs}</div>${corrige}`;
}

export function htmlMesures(r: ReglagesMesures, graine: number): string {
  const f: Record<ExerciceMesures, (r: ReglagesMesures, g: number) => string> = {
    mesurer: feuilleMesurer, tracer: feuilleTracer, comparerSegments: feuilleComparerSegments, comparerObjets: feuilleComparerObjets,
    perimetre: feuillePerimetre, perimetreCompas: feuillePerimetreCompas, balances: feuilleBalances, pesees: feuillePesees,
    unites: feuilleUnites, estimer: feuilleEstimer, convertir: feuilleConvertir, comparerMesures: feuilleComparerMesures,
    ordonner: feuilleOrdonner, verres: feuilleVerres,
  };
  return feuille((f[r.exercice] ?? feuilleMesurer)(r, graine), "me");
}

export const STYLE_MESURES = `
  .feuille.me .me-liste { display: block; }
  .feuille.me .me-ligne { display: flex; align-items: center; gap: 3mm; flex-wrap: wrap; margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.me .me-tracer { flex-direction: column; align-items: flex-start; gap: 1mm; }
  .feuille.me .me-lettre { font-size: 14px; font-weight: 800; min-width: 5mm; }
  .feuille.me .me-rep { font-size: 14px; line-height: 2; }
  .feuille.me .me-seg, .feuille.me .me-poly, .feuille.me .me-balance { display: block; flex: none; }
  .feuille.me .me-blanc { display: inline-block; width: 12mm; height: 6mm; margin: 0 1mm; border-bottom: 2px dotted #1c2233; }
  .feuille.me .me-blanc-court { width: 9mm; }
  .feuille.me .me-cases { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .feuille.me .me-case { position: relative; border: 1px dashed #9aa0b4; border-radius: 3mm; min-height: 38mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; padding: 4mm 3mm 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.me .me-case > .me-lettre { position: absolute; top: 1.5mm; left: 2.5mm; }
  .feuille.me .me-case-poly { min-height: 70mm; }
  .feuille.me .me-case-seg { min-height: 0; }
  .feuille.me .me-case-seg .me-rep { font-size: 12.5px; text-align: center; }
  .feuille.me .me-case-poly .me-rep { align-self: stretch; }
  .feuille.me .me-ranger { margin-top: 6mm; font-size: 15px; font-weight: 600; line-height: 2.2; }
  .feuille.me .me-crayons { display: block; margin-top: 3mm; }
  .feuille.me .me-crayon { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
  .feuille.me .me-compas { margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.me .me-compas .me-case { margin-bottom: 2mm; min-height: 0; }
  .feuille.me .me-serie { margin-bottom: 6mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.me .me-serie-titre { font-size: 14px; font-weight: 700; margin-bottom: 2mm; }
  .feuille.me .me-balances { display: block; line-height: 0; }
  .feuille.me .me-balances .me-balance { display: inline-block; margin: 0 4mm 3mm 0; }
  .feuille.me .me-pesee { min-height: 0; }
  .feuille.me .me-qcms { display: block; }
  .feuille.me .me-qcm { margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.me .me-phrase { font-size: 15px; line-height: 2; }
  .feuille.me .me-num { font-size: 12px; color: #687087; font-weight: 700; }
  .feuille.me .me-options { display: flex; gap: 8mm; margin: 1.5mm 0 0 6mm; font-size: 15px; font-weight: 600; }
  .feuille.me .me-convs { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; margin-top: 3mm; }
  .feuille.me .me-conv { font-size: 16px; font-weight: 600; line-height: 2.2; }
  .feuille.me .me-signe { display: inline-block; width: 9mm; height: 9mm; margin: 0 1.5mm; vertical-align: middle; border: 1.5px solid #1c2233; border-radius: 2mm; }
  .feuille.me .me-corrige { font-size: 13px; line-height: 1.7; }
  .feuille.me .me-blanc-large { width: 26mm; }
  .feuille.me .me-etiquettes { display: flex; flex-wrap: wrap; gap: 4mm; margin: 1mm 0 0; }
  .feuille.me .me-etiquette { border: 1.5px solid #1c2233; border-radius: 2mm; padding: 1.5mm 3mm; font-size: 15px; font-weight: 700; background: #fffbe8; }
  .feuille.me .me-recipient { display: flex; align-items: center; gap: 3mm; margin: 2mm 0; }
  .feuille.me .me-nom { font-size: 14px; font-weight: 600; }
  .feuille.me .me-verres { display: flex; flex-wrap: wrap; gap: 1mm; margin-top: 1mm; }
  .feuille.me .me-controle { display: flex; flex-direction: column; gap: 0.5mm; margin-top: 6mm; font-size: 9px; color: #9aa0b4; }
`;
