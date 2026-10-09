// Se repérer et se déplacer : coder et décoder des déplacements, les mots des positions.
//
// Programme de mathématiques du cycle 2 (2024) : au CP, « avancer, reculer,
// tourner à droite, tourner à gauche » ; sur un tapis quadrillé, « avancer
// d'une case », « pivoter d'un quart de tour à droite », « pivoter d'un quart
// de tour à gauche » ; « au maximum dix instructions, dont deux virages » ;
// au CE1, « au maximum quinze instructions, dont quatre virages ». Le
// vocabulaire des positions : gauche, droite, sur, sous, entre, devant,
// derrière, au-dessus, en dessous. Éduscol, « Initiation à la programmation
// aux cycles 2 et 3 » (2016) : « La fusée », des déplacements absolus sur
// quadrillage — appliquer, construire ou corriger un codage — ; « La tournée
// du facteur », des déplacements relatifs, qui dépendent de l'orientation de
// celui qui se déplace. Éduscol, « Espace et géométrie au cycle 2 » (2002) :
// le jeu de loto où l'on décrit une carte « sans la montrer ».

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1";
export type ExerciceDeplacements = "fusee" | "robot" | "positions";
export type ModeCodage = "decoder" | "coder" | "corriger";

export const EXERCICES_DEPLACEMENTS: { id: ExerciceDeplacements; libelle: string }[] = [
  { id: "fusee", libelle: "La fusée : des flèches sur le quadrillage" },
  { id: "robot", libelle: "Le robot : avancer, pivoter" },
  { id: "positions", libelle: "Les positions : à gauche, au-dessus, entre…" },
];

export interface ReglagesDeplacements {
  exercice: ExerciceDeplacements;
  classe: Classe;
  /** Décoder (tracer le chemin), coder (écrire le code), corriger (trouver l'erreur). */
  mode: ModeCodage;
  combien: number;
}

export const REGLAGES_DEPLACEMENTS: ReglagesDeplacements = { exercice: "fusee", classe: "CP", mode: "decoder", combien: 4 };

const NOIR = "#1c2233", ROUGE = "#d33a32", GRIS = "#b9c2d6", BLEU = "#2454e6";
const f2 = (x: number) => x.toFixed(2);
const entre = (alea: () => number, a: number, b: number) => a + Math.floor(alea() * (b - a + 1));

const SOURCE = `<span class="reference">Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Initiation à la programmation aux cycles 2 et 3 », 2016.</span>`;
const entete = (titre: string, consigne: string) => `<div class="titre">${titre}</div>
  <div class="sous">Prénom : ........................................ Date : ........................</div>
  <div class="regle">${consigne} ${SOURCE}</div>`;

type Case = [number, number];
export type Direction = "haut" | "bas" | "gauche" | "droite";
const PAS: Record<Direction, Case> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
export const FLECHE: Record<Direction, string> = { haut: "↑", bas: "↓", gauche: "←", droite: "→" };
const COLS = 8, LIGNES = 6, C = 8;

/** Le quadrillage du jeu, ses cases de 8 mm, et ce qu'on y dessine. */
function plateauSvg(dessin: string): string {
  let fond = "";
  for (let i = 0; i <= COLS; i++) fond += `<line x1="${i * C}" y1="0" x2="${i * C}" y2="${LIGNES * C}" stroke="${GRIS}" stroke-width="0.3"/>`;
  for (let j = 0; j <= LIGNES; j++) fond += `<line x1="0" y1="${j * C}" x2="${COLS * C}" y2="${j * C}" stroke="${GRIS}" stroke-width="0.3"/>`;
  return `<svg class="de-plateau" viewBox="-1 -1 ${COLS * C + 2} ${LIGNES * C + 2}" width="${COLS * C + 2}mm" height="${LIGNES * C + 2}mm">${fond}${dessin}</svg>`;
}

const centre = ([x, y]: Case): [number, number] => [x * C + C / 2, y * C + C / 2];

/** La fusée, ou le robot tourné dans sa direction, au départ ; l'étoile à l'arrivée. */
const depart = (c: Case, dir?: Direction) => {
  const [x, y] = centre(c);
  if (!dir) return `<path d="M${x} ${y - 3.2} L${x + 2.2} ${y + 1.8} L${x} ${y + 0.9} L${x - 2.2} ${y + 1.8} Z" fill="${BLEU}" stroke="${NOIR}" stroke-width="0.3"/>`;
  const angle = { haut: 0, droite: 90, bas: 180, gauche: 270 }[dir];
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><circle r="3.2" fill="#dbe6ff" stroke="${NOIR}" stroke-width="0.35"/><path d="M0 -2.6 L1.6 0.4 L-1.6 0.4 Z" fill="${BLEU}"/></g>`;
};
const etoile = (c: Case) => {
  const [x, y] = centre(c);
  const pts = Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 1.3 : 3.1, a = (Math.PI / 5) * k - Math.PI / 2; return `${f2(x + r * Math.cos(a))} ${f2(y + r * Math.sin(a))}`; });
  return `<path d="M${pts.join(" L")} Z" fill="#f6c85f" stroke="${NOIR}" stroke-width="0.3"/>`;
};
const chemin = (cases: Case[], couleur = ROUGE, pointille = false) => `<path d="M${cases.map((c) => centre(c).map(f2).join(" ")).join(" L")}" fill="none" stroke="${couleur}" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"${pointille ? ' stroke-dasharray="1.6 1.4"' : ""}/>`;

/** Un chemin sur le quadrillage, sans repasser deux fois par la même case. */
export function cheminAuHasard(alea: () => number, pas: number): { depart: Case; directions: Direction[]; cases: Case[] } {
  for (let garde = 0; garde < 500; garde++) {
    const debut: Case = [entre(alea, 0, COLS - 1), entre(alea, 0, LIGNES - 1)];
    const cases: Case[] = [debut];
    const directions: Direction[] = [];
    let ok = true;
    for (let i = 0; i < pas && ok; i++) {
      const [x, y] = cases[cases.length - 1];
      // On garde souvent la même direction : des lignes droites, comme « avancer de deux pas ».
      const precedente = directions[directions.length - 1];
      const choix = (Object.keys(PAS) as Direction[]).filter((d) => { const [nx, ny] = [x + PAS[d][0], y + PAS[d][1]]; return nx >= 0 && ny >= 0 && nx < COLS && ny < LIGNES && !cases.some((c) => c[0] === nx && c[1] === ny); });
      if (!choix.length) { ok = false; break; }
      const d = precedente && choix.includes(precedente) && alea() < 0.55 ? precedente : choix[Math.floor(alea() * choix.length)];
      directions.push(d);
      cases.push([x + PAS[d][0], y + PAS[d][1]]);
    }
    if (ok && directions.length === pas) return { depart: debut, directions, cases };
  }
  return { depart: [0, 0], directions: ["droite"], cases: [[0, 0], [1, 0]] };
}

/** Le code en flèches, dans des cases. */
const codeHtml = (dirs: (Direction | null)[]) => `<div class="de-code">${dirs.map((d) => `<span class="de-fleche">${d ? FLECHE[d] : ""}</span>`).join("")}</div>`;

function feuilleFusee(r: ReglagesDeplacements, graine: number): string {
  const alea = hasard(graine);
  const pas = (i: number) => (r.classe === "CP" ? entre(alea, 4, 8) : entre(alea, 7, 12)) + (i % 2);
  const liste = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, (_, i) => {
    const c = cheminAuHasard(alea, Math.min(r.classe === "CP" ? 10 : 15, pas(i)));
    // Pour corriger : une flèche fausse, qui reste dans le quadrillage.
    const k = Math.floor(alea() * c.directions.length);
    const fausse = (Object.keys(PAS) as Direction[]).filter((d) => d !== c.directions[k])[Math.floor(alea() * 3)];
    return { ...c, k, fausse };
  });
  const fin = (c: (typeof liste)[number]) => c.cases[c.cases.length - 1];
  const carte = (c: (typeof liste)[number], i: number, corrige: boolean) => {
    const plateau = r.mode === "decoder"
      ? plateauSvg((corrige ? chemin(c.cases) + etoile(fin(c)) : "") + depart(c.depart))
      : plateauSvg(chemin(c.cases, r.mode === "coder" ? BLEU : ROUGE, false) + depart(c.depart) + etoile(fin(c)));
    const code = r.mode === "decoder" ? codeHtml(c.directions)
      : r.mode === "coder" ? (corrige ? codeHtml(c.directions) : codeHtml(c.directions.map(() => null)))
        : codeHtml(c.directions.map((d, k) => (k === c.k ? c.fausse : d)));
    const note = corrige && r.mode === "corriger" ? `<div class="de-note">La flèche n° ${c.k + 1} est fausse : il fallait <b>${FLECHE[c.directions[c.k]]}</b>.</div>` : "";
    return `<div class="de-carte"><b class="de-lettre">${String.fromCharCode(65 + i)}</b>${plateau}${code}${note}</div>`;
  };
  const consignes: Record<ModeCodage, string> = {
    decoder: "La fusée part de sa case. Suis le code, une flèche pour une case, et trace son chemin. Dessine une étoile là où elle arrive.",
    coder: "Le chemin de la fusée est tracé jusqu'à l'étoile. Écris son code : une flèche pour chaque case.",
    corriger: "Le code devait mener la fusée à l'étoile en suivant le chemin, mais une flèche est fausse. Barre-la et écris la bonne au-dessous.",
  };
  return `<div class="page">${entete("La fusée", consignes[r.mode])}<div class="de-cartes">${liste.map((c, i) => carte(c, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">La fusée — corrigé</div><div class="de-cartes">${liste.map((c, i) => carte(c, i, true)).join("")}</div></div>`;
}

// ── Le robot : des déplacements relatifs ──────────────────────────────────

export type Instruction = "A" | "D" | "G";
const TOURNER_DROITE: Record<Direction, Direction> = { haut: "droite", droite: "bas", bas: "gauche", gauche: "haut" };
const TOURNER_GAUCHE: Record<Direction, Direction> = { haut: "gauche", gauche: "bas", bas: "droite", droite: "haut" };

/** Exécuter un programme : les cases parcourues et la direction finale. */
export function executer(debut: Case, dir: Direction, programme: Instruction[]): { cases: Case[]; dir: Direction } {
  const cases: Case[] = [debut];
  let d = dir;
  for (const i of programme) {
    if (i === "D") d = TOURNER_DROITE[d];
    else if (i === "G") d = TOURNER_GAUCHE[d];
    else { const [x, y] = cases[cases.length - 1]; cases.push([x + PAS[d][0], y + PAS[d][1]]); }
  }
  return { cases, dir: d };
}

/**
 * Un programme pour le robot, dans les limites du programme : dix
 * instructions dont deux virages au CP, quinze dont quatre au CE1. Le chemin
 * reste sur le tapis et ne repasse pas par une case.
 */
export function programmeAuHasard(alea: () => number, classe: Classe): { debut: Case; dir: Direction; programme: Instruction[]; cases: Case[] } {
  const maxInstructions = classe === "CP" ? 10 : 15, maxVirages = classe === "CP" ? 2 : 4;
  for (let garde = 0; garde < 2000; garde++) {
    const debut: Case = [entre(alea, 0, COLS - 1), entre(alea, 0, LIGNES - 1)];
    const dir = (["haut", "bas", "gauche", "droite"] as Direction[])[Math.floor(alea() * 4)];
    const virages = entre(alea, 1, maxVirages);
    const programme: Instruction[] = [];
    for (let v = 0; v <= virages; v++) {
      for (let k = entre(alea, 1, classe === "CP" ? 3 : 4); k > 0; k--) programme.push("A");
      if (v < virages) programme.push(alea() < 0.5 ? "D" : "G");
    }
    if (programme.length > maxInstructions) continue;
    const { cases } = executer(debut, dir, programme);
    const dedans = cases.every(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < LIGNES);
    const distinctes = new Set(cases.map((c) => `${c[0]},${c[1]}`)).size === cases.length;
    if (dedans && distinctes) return { debut, dir, programme, cases };
  }
  return { debut: [0, 0], dir: "droite", programme: ["A", "A"], cases: [[0, 0], [1, 0], [2, 0]] };
}

const ICONE: Record<Instruction, string> = { A: "⬆", D: "↻", G: "↺" };
const programmeHtml = (p: (Instruction | null)[]) => `<div class="de-code">${p.map((i) => `<span class="de-fleche">${i ? ICONE[i] : ""}</span>`).join("")}</div>`;

function feuilleRobot(r: ReglagesDeplacements, graine: number): string {
  const alea = hasard(graine);
  const liste = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, () => programmeAuHasard(alea, r.classe));
  const coder = r.mode === "coder";
  const carte = (p: (typeof liste)[number], i: number, corrige: boolean) => {
    const fin = p.cases[p.cases.length - 1];
    const plateau = coder ? plateauSvg(chemin(p.cases, BLEU) + depart(p.debut, p.dir) + etoile(fin))
      : plateauSvg((corrige ? chemin(p.cases) + etoile(fin) : "") + depart(p.debut, p.dir));
    const code = coder && !corrige ? programmeHtml(Array.from({ length: p.programme.length }, () => null)) : programmeHtml(p.programme);
    return `<div class="de-carte"><b class="de-lettre">${String.fromCharCode(65 + i)}</b>${plateau}${code}</div>`;
  };
  const legende = `<div class="de-legende"><span><b>⬆</b> avance d'une case</span><span><b>↻</b> pivote d'un quart de tour à droite</span><span><b>↺</b> pivote d'un quart de tour à gauche</span></div>`;
  const consigne = coder
    ? "Le chemin du robot est tracé jusqu'à l'étoile. Écris son programme, une instruction par case. Attention : le robot regarde dans la direction de sa flèche ; « pivoter » le fait tourner sans avancer."
    : "Le robot regarde dans la direction de sa flèche. Suis le programme, une instruction après l'autre, et trace son chemin ; dessine une étoile là où il s'arrête. Tu peux tourner la feuille, ou te mettre à sa place.";
  return `<div class="page">${entete("Le robot", consigne)}${legende}<div class="de-cartes">${liste.map((p, i) => carte(p, i, false)).join("")}</div></div>
    <div class="page corrige"><div class="titre">Le robot — corrigé</div><div class="de-cartes">${liste.map((p, i) => carte(p, i, true)).join("")}</div></div>`;
}

// ── Les positions ─────────────────────────────────────────────────────────

export type Forme = "rond" | "carré" | "triangle";
export type Disposition = Record<Forme, Case>;
const FORMES: Forme[] = ["rond", "carré", "triangle"];
const ARTICLE: Record<Forme, string> = { rond: "le rond", carré: "le carré", triangle: "le triangle" };
const DU: Record<Forme, string> = { rond: "du rond", carré: "du carré", triangle: "du triangle" };

/** Une relation qui se lit sur la carte : sur la même ligne (à gauche, à droite), sur la même colonne (au-dessus, en dessous), ou entre les deux autres. */
export interface Relation { texte: string; vraie: (d: Disposition) => boolean; formes: string }

export function relationsVraies(d: Disposition): Relation[] {
  const sortie: Relation[] = [];
  for (const a of FORMES) for (const b of FORMES) {
    if (a === b) continue;
    const [pa, pb] = [d[a], d[b]];
    const formes = [a, b].sort().join("+");
    if (pa[1] === pb[1] && pa[0] > pb[0]) sortie.push({ formes, texte: `${ARTICLE[a]} est à droite ${DU[b]}`, vraie: (x) => x[a][1] === x[b][1] && x[a][0] > x[b][0] });
    if (pa[1] === pb[1] && pa[0] < pb[0]) sortie.push({ formes, texte: `${ARTICLE[a]} est à gauche ${DU[b]}`, vraie: (x) => x[a][1] === x[b][1] && x[a][0] < x[b][0] });
    if (pa[0] === pb[0] && pa[1] < pb[1]) sortie.push({ formes, texte: `${ARTICLE[a]} est au-dessus ${DU[b]}`, vraie: (x) => x[a][0] === x[b][0] && x[a][1] < x[b][1] });
    if (pa[0] === pb[0] && pa[1] > pb[1]) sortie.push({ formes, texte: `${ARTICLE[a]} est en dessous ${DU[b]}`, vraie: (x) => x[a][0] === x[b][0] && x[a][1] > x[b][1] });
  }
  for (const m of FORMES) {
    const [b, c] = FORMES.filter((f) => f !== m);
    const entreDeux = (x: Disposition) => (x[m][1] === x[b][1] && x[m][1] === x[c][1] && (x[m][0] - x[b][0]) * (x[m][0] - x[c][0]) < 0)
      || (x[m][0] === x[b][0] && x[m][0] === x[c][0] && (x[m][1] - x[b][1]) * (x[m][1] - x[c][1]) < 0);
    if (entreDeux(d)) sortie.push({ formes: "les trois", texte: `${ARTICLE[m]} est entre ${ARTICLE[b]} et ${ARTICLE[c]}`, vraie: entreDeux });
  }
  return sortie;
}

const dispositionAuHasard = (alea: () => number): Disposition => {
  const cases = melanger(alea, Array.from({ length: 9 }, (_, k) => [k % 3, Math.floor(k / 3)] as Case)).slice(0, 3);
  return { rond: cases[0], carré: cases[1], triangle: cases[2] };
};

/**
 * Une question : une description en deux relations, et quatre cartes dont
 * une seule lui correspond — « la carte où le triangle est à droite du carré
 * et le rond en dessous du carré ».
 */
export function questionDePositions(alea: () => number): { description: string; cartes: Disposition[]; bonne: number } {
  for (let garde = 0; garde < 500; garde++) {
    const cible = dispositionAuHasard(alea);
    // Deux relations qui disent des choses différentes : « le rond est au-dessus du triangle » ne se répète pas en « le triangle est en dessous du rond ».
    const relations = melanger(alea, relationsVraies(cible));
    const r1 = relations[0], r2 = relations.find((r) => r.formes !== r1?.formes);
    if (!r1 || !r2) continue;
    const correspond = (d: Disposition) => r1.vraie(d) && r2.vraie(d);
    const leurres: Disposition[] = [];
    for (let k = 0; k < 400 && leurres.length < 3; k++) {
      const d = dispositionAuHasard(alea);
      // Des leurres proches : ils respectent une des deux relations, pas les deux.
      if (!correspond(d) && (r1.vraie(d) || r2.vraie(d) || k > 200)) leurres.push(d);
    }
    if (leurres.length < 3) continue;
    const cartes = melanger(alea, [cible, ...leurres]);
    const description = `${r1.texte.charAt(0).toUpperCase()}${r1.texte.slice(1)}, et ${r2.texte}.`;
    return { description, cartes, bonne: cartes.indexOf(cible) };
  }
  return { description: "", cartes: [], bonne: 0 };
}

const formeSvg = (f: Forme, [x, y]: Case, s = 9) => {
  const cx = x * s + s / 2, cy = y * s + s / 2;
  if (f === "rond") return `<circle cx="${cx}" cy="${cy}" r="${s * 0.33}" fill="#e06666" stroke="${NOIR}" stroke-width="0.4"/>`;
  if (f === "carré") return `<rect x="${f2(cx - s * 0.32)}" y="${f2(cy - s * 0.32)}" width="${f2(s * 0.64)}" height="${f2(s * 0.64)}" fill="#6fa8dc" stroke="${NOIR}" stroke-width="0.4"/>`;
  return `<path d="M${cx} ${f2(cy - s * 0.36)} L${f2(cx + s * 0.36)} ${f2(cy + s * 0.3)} L${f2(cx - s * 0.36)} ${f2(cy + s * 0.3)} Z" fill="#f6c85f" stroke="${NOIR}" stroke-width="0.4"/>`;
};
const carteSvg = (d: Disposition) => `<svg class="de-mini" viewBox="-1 -1 29 29" width="29mm" height="29mm"><rect x="-0.5" y="-0.5" width="28" height="28" rx="2" fill="#fff" stroke="${NOIR}" stroke-width="0.4"/>${FORMES.map((f) => formeSvg(f, d[f])).join("")}</svg>`;

function feuillePositions(r: ReglagesDeplacements, graine: number): string {
  const alea = hasard(graine);
  const liste = Array.from({ length: Math.max(1, Math.min(6, r.combien)) }, () => questionDePositions(alea));
  const question = (q: (typeof liste)[number], i: number, corrige: boolean) => `<div class="de-question"><div class="de-description"><b>${i + 1}.</b> ${q.description}</div>
    <div class="de-mini-cartes">${q.cartes.map((d, k) => `<div class="de-mini-carte${corrige && k === q.bonne ? " de-bonne" : ""}">${carteSvg(d)}</div>`).join("")}</div></div>`;
  return `<div class="page">${entete("Où sont les formes ?", "Écoute — ou lis — la description, puis entoure la seule carte qui lui correspond. Regarde bien : à gauche, à droite, au-dessus, en dessous, entre.")}${liste.map((q, i) => question(q, i, false)).join("")}</div>
    <div class="page corrige"><div class="titre">Où sont les formes ? — corrigé</div>${liste.map((q, i) => question(q, i, true)).join("")}</div>`;
}

export function htmlDeplacements(r: ReglagesDeplacements, graine: number): string {
  const corps = r.exercice === "robot" ? feuilleRobot(r, graine) : r.exercice === "positions" ? feuillePositions(r, graine) : feuilleFusee(r, graine);
  return feuille(corps, "de");
}

export const STYLE_DEPLACEMENTS = `
  .feuille.de svg { display: block; }
  .feuille.de .de-lettre { font-size: 14px; font-weight: 800; align-self: flex-start; }
  .feuille.de .de-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .feuille.de .de-carte { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 2.5mm; display: flex; flex-direction: column; align-items: center; gap: 2mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.de .de-code { display: flex; flex-wrap: wrap; gap: 1mm; justify-content: center; }
  .feuille.de .de-fleche { display: inline-flex; align-items: center; justify-content: center; width: 6.5mm; height: 7mm; border: 1px solid #9aa0b4; border-radius: 1mm; font-size: 16px; font-weight: 800; }
  .feuille.de .de-note { font-size: 12px; }
  .feuille.de .de-legende { display: flex; gap: 6mm; flex-wrap: wrap; font-size: 12px; margin: 0 0 4mm; }
  .feuille.de .de-legende b { font-size: 16px; margin-right: 1mm; }
  .feuille.de .de-question { margin-bottom: 5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.de .de-description { font-size: 14px; margin-bottom: 2mm; }
  .feuille.de .de-mini-cartes { display: flex; gap: 6mm; }
  .feuille.de .de-mini-carte { padding: 1.5mm; border: 2px solid transparent; border-radius: 3mm; }
  .feuille.de .de-bonne { border-color: #d33a32; }
`;
