// Lire l'heure, et la placer sur l'horloge.
//
// Des horloges à aiguilles à lire — heures pile, demies, quarts, puis les
// cinq minutes — et des cadrans vides où dessiner l'heure demandée. Avec
// l'après-midi, la même horloge se lit deux fois : 7 h 30, ou 19 h 30.
//
// Les aides se choisissent : les aiguilles en couleur — la petite et la
// grande ne se confondent plus, et la réponse reprend leurs couleurs —, les
// minutes écrites autour du cadran, le « h » déjà posé dans la réponse ou
// laissé à l'élève. La consigne tient en une phrase ; l'enseignant la réécrit
// depuis le bandeau de l'atelier s'il veut en dire plus.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type PrecisionHeure = "heures" | "demies" | "quarts" | "cinq" | "minutes";
export const PRECISIONS_HEURE: { id: PrecisionHeure; libelle: string }[] = [
  { id: "heures", libelle: "Heures pile" }, { id: "demies", libelle: "Heures et demies" },
  { id: "quarts", libelle: "Quarts d'heure" }, { id: "cinq", libelle: "De cinq en cinq minutes" }, { id: "minutes", libelle: "À la minute près" },
];
export type SensHeure = "lire" | "dessiner" | "mixte";
/** Les horloges à lire ou à régler ; deux horloges et la durée écoulée ; des problèmes de durées ; les moments de la journée. */
export type ExerciceHeure = "horloges" | "durees" | "problemes" | "moments";

/** Des couleurs qui se lisent en trait fin, sur le papier comme au tableau. */
export const COULEURS_AIGUILLES: { nom: string; hex: string }[] = [
  { nom: "rouge", hex: "#d94033" }, { nom: "bleu", hex: "#2454e6" }, { nom: "vert", hex: "#1f9a48" },
  { nom: "orange", hex: "#e07b00" }, { nom: "violet", hex: "#8e44ad" }, { nom: "noir", hex: "#1c2233" },
];
const NOIR = "#1c2233";

/** Une couleur enregistrée n'est reprise que si c'en est une : un réglage se synchronise, se restaure, se modifie à la main. */
export const couleurSure = (c: string | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : NOIR);

export interface ReglagesHeure {
  exercice: ExerciceHeure;
  precision: PrecisionHeure;
  /** Lire l'heure sur le cadran, dessiner les aiguilles, ou l'un puis l'autre. */
  sens: SensHeure;
  combien: number;
  /** Les heures de l'après-midi aussi : 19 h 30 se lit sur le même cadran que 7 h 30. */
  apresMidi: boolean;
  /** Les aiguilles en couleur ; la réponse reprend la couleur de chacune. */
  couleurs: boolean;
  couleurHeures: string;
  couleurMinutes: string;
  /** Le « h » déjà écrit entre les heures et les minutes de la réponse. */
  avecH: boolean;
  /** Les minutes écrites autour du cadran : 5, 10, 15… */
  minutesAutour: boolean;
}
export const REGLAGES_HEURE: ReglagesHeure = {
  exercice: "horloges", precision: "heures", sens: "lire", combien: 9, apresMidi: false,
  couleurs: false, couleurHeures: "#d94033", couleurMinutes: "#2454e6", avecH: true, minutesAutour: false,
};

export interface Heure { h: number; m: number }

const MINUTES: Record<PrecisionHeure, number[]> = {
  heures: [0], demies: [0, 30], quarts: [0, 15, 30, 45], cinq: Array.from({ length: 12 }, (_, i) => 5 * i), minutes: Array.from({ length: 60 }, (_, i) => i),
};

/** Les heures de la feuille, toutes différentes tant que la précision le permet. */
export function heures(r: ReglagesHeure, graine: number): Heure[] {
  const alea = hasard(graine);
  const possibles: Heure[] = [];
  for (let h = r.apresMidi ? 0 : 1; h <= (r.apresMidi ? 23 : 12); h++) for (const m of MINUTES[r.precision]) possibles.push({ h, m });
  const combien = Math.max(1, Math.min(24, r.combien));
  const sortie: Heure[] = [];
  while (sortie.length < combien) sortie.push(...melanger(alea, possibles).slice(0, combien - sortie.length));
  return sortie;
}

const deux = (m: number) => String(m).padStart(2, "0");

/** « 7 h 05 », comme on l'écrit au tableau. */
export const lireHeure = (t: Heure) => `${t.h} h ${deux(t.m)}`;

/** L'autre lecture du même cadran : 7 h 30 et 19 h 30. */
export const autreLecture = (t: Heure): Heure => ({ h: (t.h + 12) % 24, m: t.m });

/** La consigne de la feuille, en une phrase. */
export const consigneHeure = (r: Pick<ReglagesHeure, "sens"> & Partial<Pick<ReglagesHeure, "apresMidi">>) => {
  const lire = r.apresMidi ? "Écris l'heure qu'il est le matin, puis l'après-midi" : "Écris l'heure qu'il est";
  return r.sens === "dessiner" ? "Dessine les aiguilles." : r.sens === "mixte" ? `${lire}, ou dessine les aiguilles.` : `${lire}.`;
};

/** Les couleurs des deux aiguilles : celles qu'on a choisies, ou le noir. */
export const couleursDe = (r: Pick<ReglagesHeure, "couleurs" | "couleurHeures" | "couleurMinutes">) =>
  (r.couleurs ? { heures: couleurSure(r.couleurHeures), minutes: couleurSure(r.couleurMinutes) } : { heures: NOIR, minutes: NOIR });

export interface OptionsCadran { mm?: number; heures?: string; minutes?: string; minutesAutour?: boolean }

const p = (v: number) => v.toFixed(1);

/**
 * Le cadran : les douze nombres, les soixante traits, et les aiguilles si on
 * donne l'heure. Les aiguilles s'arrêtent avant les nombres : à midi pile, le
 * 12 reste lisible.
 */
export function horlogeSvg(t: Heure | null, o: OptionsCadran = {}): string {
  const cH = couleurSure(o.heures), cM = couleurSure(o.minutes);
  const traits = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 * Math.PI) / 180, long = i % 5 === 0, r1 = long ? 42.5 : 44.5;
    return `<line x1="${p(50 + r1 * Math.sin(a))}" y1="${p(50 - r1 * Math.cos(a))}" x2="${p(50 + 46.5 * Math.sin(a))}" y2="${p(50 - 46.5 * Math.cos(a))}" stroke="${NOIR}" stroke-width="${long ? 1.5 : 0.7}"/>`;
  }).join("");
  const nombres = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1, a = (n * 30 * Math.PI) / 180;
    return `<text x="${p(50 + 36 * Math.sin(a))}" y="${p(50 - 36 * Math.cos(a))}" text-anchor="middle" dominant-baseline="central" font-size="9.5" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${NOIR}">${n}</text>`;
  }).join("");
  const autour = o.minutesAutour ? Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return `<text class="he-minute" x="${p(50 + 53.5 * Math.sin(a))}" y="${p(50 - 53.5 * Math.cos(a))}" text-anchor="middle" dominant-baseline="central" font-size="5.6" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="${cM}">${i * 5}</text>`;
  }).join("") : "";
  let aiguilles = "";
  if (t) {
    const am = (t.m * 6 * Math.PI) / 180, ah = (((t.h % 12) * 30 + t.m * 0.5) * Math.PI) / 180;
    aiguilles = `<line class="he-minutes" x1="50" y1="50" x2="${p(50 + 29 * Math.sin(am))}" y2="${p(50 - 29 * Math.cos(am))}" stroke="${cM}" stroke-width="2.8" stroke-linecap="round"/>`
      + `<line class="he-heures" x1="50" y1="50" x2="${p(50 + 19 * Math.sin(ah))}" y2="${p(50 - 19 * Math.cos(ah))}" stroke="${cH}" stroke-width="4.6" stroke-linecap="round"/>`;
  }
  // Les minutes débordent du cercle : le cadre s'élargit, et le dessin avec lui pour que le cadran garde sa taille.
  const mm = (o.mm ?? 40) * (o.minutesAutour ? 1.18 : 1);
  const cadre = o.minutesAutour ? "-9 -9 118 118" : "0 0 100 100";
  return `<svg class="he-cadran" viewBox="${cadre}" width="${p(mm)}mm" height="${p(mm)}mm" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="47.5" fill="#fff" stroke="${NOIR}" stroke-width="2"/>${traits}${nombres}${autour}${aiguilles}<circle cx="50" cy="50" r="2.4" fill="${NOIR}"/></svg>`;
}

/** La ligne où l'élève écrit l'heure : deux blancs autour du « h », ou un seul blanc si on le lui laisse. */
function reponse(r: ReglagesHeure, moment = ""): string {
  const c = couleursDe(r);
  const blanc = (couleur: string, large = false) => `<span class="he-blanc${large ? " he-blanc-large" : ""}" style="border-color:${couleur}"></span>`;
  const corps = r.avecH ? `${blanc(c.heures)}<b class="he-h">h</b>${blanc(c.minutes)}`
    : r.couleurs ? `${blanc(c.heures)}${blanc(c.minutes)}` : blanc(NOIR, true);
  return `<div class="he-reponse">${moment ? `<span class="he-moment">${moment}</span>` : ""}${corps}</div>`;
}

/** L'heure qu'on donne à dessiner, chaque nombre dans la couleur de son aiguille. */
function heureDonnee(t: Heure, r: ReglagesHeure): string {
  const c = couleursDe(r);
  const h = `<span style="color:${c.heures}">${t.h}</span>`, m = `<span style="color:${c.minutes}">${deux(t.m)}</span>`;
  return `<div class="he-donnee">${r.avecH ? `${h} h ${m}` : `${h}:${m}`}</div>`;
}

export function htmlHeure(liste: Heure[], r: ReglagesHeure): string {
  const c = couleursDe(r);
  const cadran = (t: Heure | null) => horlogeSvg(t, { heures: c.heures, minutes: c.minutes, minutesAutour: r.minutesAutour });
  const lire = (i: number) => r.sens === "lire" || (r.sens === "mixte" && i % 2 === 0);
  const carte = (t: Heure, i: number) => `<div class="he-carte"><div class="he-num">${i + 1}</div>${lire(i)
    ? cadran(t) + (r.apresMidi ? reponse(r, "matin") + reponse(r, "après-midi") : reponse(r))
    : cadran(null) + heureDonnee(t, r)}</div>`;
  const tete = `<div class="titre">Lire l'heure</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">${consigneHeure(r)}</div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, liste.length); i += 9) {
    pages.push(`<div class="page">${tete}<div class="he-grille">${liste.slice(i, i + 9).map((t, j) => carte(t, i + j)).join("")}</div></div>`);
  }
  const lecture = (t: Heure) => (r.apresMidi ? `${lireHeure(t.h < 12 ? t : autreLecture(t))} ou ${lireHeure(t.h < 12 ? autreLecture(t) : t)}` : lireHeure(t));
  const corrige = `<div class="page corrige"><div class="titre">Lire l'heure — corrigé</div><div class="he-corrige">${liste.map((t, i) => `<span>${i + 1}. <b>${lecture(t)}</b></span>`).join("")}</div></div>`;
  return feuille(pages.join("") + corrige, "he");
}

export const STYLE_HEURE = `
  .feuille.he .consigne { font-size: 15px; font-weight: 700; color: #1c2233; margin: 0 0 4mm; }
  .feuille.he .he-grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .feuille.he .he-carte { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 3mm 2mm; text-align: center; position: relative; page-break-inside: avoid; }
  .feuille.he .he-num { position: absolute; top: 1.5mm; left: 2.5mm; font-size: 10px; color: #687087; }
  .feuille.he .he-cadran { display: block; margin: 0 auto; }
  .feuille.he .he-reponse { display: flex; align-items: flex-end; justify-content: center; gap: 1.5mm; margin-top: 2mm; min-height: 8mm; }
  .feuille.he .he-moment { font-size: 10.5px; font-weight: 600; color: #687087; width: 17mm; text-align: right; margin-right: 1mm; }
  .feuille.he .he-blanc { display: inline-block; width: 13mm; height: 7mm; border-bottom: 2px dotted #1c2233; }
  .feuille.he .he-blanc-large { width: 34mm; }
  .feuille.he .he-h { font-size: 15px; font-weight: 800; line-height: 1; }
  .feuille.he .he-donnee { font-size: 18px; font-weight: 800; margin-top: 2.5mm; }
  .feuille.he .he-corrige { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 12px; font-size: 13px; }
`;

// ── Les durées, les moments de la journée ─────────────────────────────────
//
// Programme de mathématiques du cycle 2 (2024) : au CP, associer une heure à
// un moment de la journée ; au CE1, les unités heure et minute (h, min), et
// « comparer et mesurer des durées écoulées entre deux instants affichés sur
// une horloge », dans une même journée, à l'heure, à la demi-heure ou au
// quart d'heure ; au CE2, à la minute, et des problèmes à une ou deux étapes
// impliquant des durées. Éduscol, « Grandeurs et mesures au cycle 2 » (2016) :
// la durée entre deux horaires se calcule ; le système sexagésimal reste un
// travail « modeste ».

/** Le pas des heures et des durées, selon la précision : une heure, une demi-heure, un quart d'heure, cinq minutes. */
/** Une heure comme on la dit dans un énoncé : « 9 h », « 9 h 05 ». */
export const direHeure = (t: Heure) => (t.m ? lireHeure(t) : `${t.h} h`);

export const PAS_MINUTES: Record<PrecisionHeure, number> = { heures: 60, demies: 30, quarts: 15, cinq: 5, minutes: 1 };

/** Une durée en minutes comme on la dit : « 1 h 30 min », « 45 min », « 2 h ». */
export function ecrireDuree(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const enMinutes = (t: Heure) => 60 * t.h + t.m;
const depuisMinutes = (x: number): Heure => ({ h: Math.floor(x / 60), m: x % 60 });

/** Ce qui dure, et combien de temps à peu près, en minutes. */
const ACTIVITES: { quoi: string; de: number; a: number }[] = [
  { quoi: "La récréation", de: 15, a: 30 }, { quoi: "La séance de piscine", de: 45, a: 90 }, { quoi: "Le film", de: 75, a: 120 },
  { quoi: "Le trajet en car", de: 30, a: 180 }, { quoi: "La cuisson du gâteau", de: 30, a: 60 }, { quoi: "Le match de football", de: 60, a: 120 },
  { quoi: "La visite du musée", de: 60, a: 180 }, { quoi: "La promenade", de: 30, a: 150 }, { quoi: "La sieste", de: 30, a: 120 },
  { quoi: "Le spectacle", de: 45, a: 120 }, { quoi: "La séance de sport", de: 45, a: 90 }, { quoi: "La fête de l'école", de: 120, a: 240 },
];

export interface Duree { quoi: string; debut: Heure; fin: Heure; minutes: number }

/**
 * Deux instants d'une même journée et la durée qui les sépare : au pas de la
 * précision choisie, entre 7 h et 19 h. Sans l'après-midi, on ne passe pas
 * midi : les deux horloges se lisent le matin, ou toutes deux l'après-midi.
 */
export function durees(r: Pick<ReglagesHeure, "precision" | "combien" | "apresMidi">, graine: number): Duree[] {
  const alea = hasard(graine);
  const pas = PAS_MINUTES[r.precision];
  const sortie: Duree[] = [];
  const vus = new Set<string>();
  for (let garde = 0; sortie.length < Math.max(1, Math.min(12, r.combien)) && garde < 3000; garde++) {
    const a = ACTIVITES[Math.floor(alea() * ACTIVITES.length)];
    const possibles = Array.from({ length: Math.floor(a.a / pas) }, (_, i) => (i + 1) * pas).filter((d) => d >= a.de);
    if (!possibles.length || vus.has(a.quoi)) continue;
    const minutes = possibles[Math.floor(alea() * possibles.length)];
    const debut = 7 * 60 + pas * Math.floor(alea() * ((12 * 60) / pas));
    const fin = debut + minutes;
    if (fin > 19 * 60) continue;
    if (!r.apresMidi && debut < 12 * 60 && fin > 12 * 60) continue;
    vus.add(a.quoi);
    sortie.push({ quoi: a.quoi, debut: depuisMinutes(debut), fin: depuisMinutes(fin), minutes });
  }
  return sortie;
}

const moment = (t: Heure) => (t.h < 12 ? "le matin" : t.h < 18 ? "l'après-midi" : "le soir");

function feuilleDurees(r: ReglagesHeure, graine: number): string {
  const liste = durees(r, graine);
  const c = couleursDe(r);
  const cadran = (t: Heure) => horlogeSvg(t, { mm: 34, heures: c.heures, minutes: c.minutes, minutesAutour: r.minutesAutour });
  const blanc = `<span class="he-blanc"></span>`;
  const carte = (d: Duree, i: number) => `<div class="he-duree"><div class="he-num">${i + 1}</div>
    <div class="he-quoi">${d.quoi}, ${moment(d.debut)}${moment(d.fin) !== moment(d.debut) ? ` et ${moment(d.fin)}` : ""}.</div>
    <div class="he-deux"><div><div class="he-etiquette">Ça commence</div>${cadran(d.debut)}</div><div class="he-fleche">→</div><div><div class="he-etiquette">Ça finit</div>${cadran(d.fin)}</div></div>
    <div class="he-reponse">Ça dure ${blanc}<b class="he-h">h</b>${blanc}<b class="he-h">min</b></div></div>`;
  const tete = `<div class="titre">Combien de temps ?</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">Lis l'heure du début et l'heure de la fin. Combien de temps s'est-il écoulé ? Avance d'heure en heure, puis compte les minutes.</div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, liste.length); i += 6) pages.push(`<div class="page">${tete}<div class="he-durees">${liste.slice(i, i + 6).map((d, j) => carte(d, i + j)).join("")}</div></div>`);
  const corrige = `<div class="page corrige"><div class="titre">Combien de temps ? — corrigé</div><div class="he-corrige-l">${liste.map((d, i) => `<div>${i + 1}. De ${direHeure(d.debut)} à ${direHeure(d.fin)} : <b>${ecrireDuree(d.minutes)}</b>.</div>`).join("")}</div></div>`;
  return pages.join("") + corrige;
}

/** Un problème de durée : l'énoncé, la réponse, et le chemin du calcul. */
export interface ProblemeDuree { enonce: string; reponse: string; calcul: string }

const PRENOMS_HEURE: [string, "il" | "elle"][] = [["Léa", "elle"], ["Tom", "il"], ["Inès", "elle"], ["Noah", "il"], ["Jade", "elle"], ["Adam", "il"], ["Lina", "elle"], ["Sacha", "il"]];

/** Le chemin d'un horaire à l'autre : jusqu'à l'heure ronde, puis les heures, puis les minutes. */
export function cheminDuree(debut: Heure, fin: Heure): string {
  const a = enMinutes(debut), b = enMinutes(fin);
  if (debut.m === 0 || b - a < 60 || Math.floor(b / 60) === debut.h) return `de ${direHeure(debut)} à ${direHeure(fin)} : ${ecrireDuree(b - a)}`;
  const ronde = (debut.h + 1) * 60;
  const etapes = [`de ${direHeure(debut)} à ${direHeure(depuisMinutes(ronde))} : ${ecrireDuree(ronde - a)}`];
  if (b > ronde) etapes.push(`de ${direHeure(depuisMinutes(ronde))} à ${direHeure(fin)} : ${ecrireDuree(b - ronde)}`);
  return `${etapes.join(" ; ")} ; en tout, ${ecrireDuree(b - a)}`;
}

/** Les durées du CE1, en mots : « un quart d'heure », « une demi-heure »… */
const EN_MOTS: [number, string][] = [[15, "un quart d'heure"], [30, "une demi-heure"], [45, "trois quarts d'heure"], [60, "une heure"], [90, "une heure et demie"]];
const enMots = (m: number) => EN_MOTS.find(([x]) => x === m)?.[1] ?? ecrireDuree(m);

/**
 * Des problèmes de durées. Au CE1, des durées en quarts d'heure et demi-heures
 * à ajouter — « Mamie a passé un quart d'heure à tailler ses rosiers et une
 * demi-heure à bêcher son potager. Combien de temps est-elle restée dans le
 * jardin ? » —, la durée entre deux instants, « 2 heures et 130 minutes » à
 * comparer. Au CE2, des problèmes à une ou deux étapes — trouver la fin, la
 * durée ou le début —, sur le modèle de ceux du programme : Lucie partie à
 * 8 h 30 et rentrée à 12 h 30, le train parti à 7 h 10.
 */
export function problemesDeDurees(r: Pick<ReglagesHeure, "precision" | "combien">, graine: number, niveau: "CE1" | "CE2" = "CE2"): ProblemeDuree[] {
  const alea = hasard(graine);
  const pas = niveau === "CE1" ? 15 : Math.min(10, PAS_MINUTES[r.precision]);
  const entre = (a: number, b: number) => a + Math.floor(alea() * (b - a + 1));
  const prenom = () => PRENOMS_HEURE[Math.floor(alea() * PRENOMS_HEURE.length)];
  const instant = (de: number, a: number) => depuisMinutes(de * 60 + pas * Math.floor(alea() * (((a - de) * 60) / pas)));
  const duree = (de: number, a: number) => pas * Math.max(1, Math.round((de + alea() * (a - de)) / pas));
  const modelesCE1: (() => ProblemeDuree)[] = [
    () => {
      const [qui, il] = ([["Mamie", "elle"], ["Papi", "il"], ["Tonton", "il"], ["Tata", "elle"]] as const)[entre(0, 3)];
      const [d1, d2] = [[15, 30], [30, 15], [15, 45], [30, 30], [45, 15], [15, 15]][entre(0, 5)];
      return { enonce: `${qui} a passé ${enMots(d1)} à tailler ses rosiers et ${enMots(d2)} à bêcher son potager. Combien de temps ${il === "il" ? "est-il resté" : "est-elle restée"} dans le jardin ?`, reponse: `${enMots(d1 + d2)}, soit ${d1 + d2} min`, calcul: `${d1} min + ${d2} min = ${d1 + d2} min` };
    },
    () => { const d = instant(14, 17), t = 15 * entre(1, 4), f = depuisMinutes(enMinutes(d) + t); return { enonce: `Le cours de judo commence à ${direHeure(d)} et finit à ${direHeure(f)}. Combien de temps dure-t-il ?`, reponse: ecrireDuree(t), calcul: cheminDuree(d, f) }; },
    () => { const h = entre(1, 3), plus = alea() < 0.5; const m = 60 * h + (plus ? 10 : -10); return { enonce: `Qu'est-ce qui dure le plus longtemps : ${h} heure${h > 1 ? "s" : ""} ou ${m} minutes ?`, reponse: plus ? `${m} minutes` : `${h} heure${h > 1 ? "s" : ""}`, calcul: `${h} heure${h > 1 ? "s" : ""} = ${60 * h} minutes, et ${m} ${plus ? ">" : "<"} ${60 * h}` }; },
    () => { const [a, b] = [[30, 15], [60, 30], [60, 15], [30, 30]][entre(0, 3)]; return { enonce: `Combien de minutes y a-t-il dans ${enMots(a)} et ${enMots(b)} ?`, reponse: `${a + b} minutes`, calcul: `${a} min + ${b} min = ${a + b} min` }; },
    () => { const f = entre(14, 20); return { enonce: `Il est midi. Le spectacle commence à ${f} h. Combien de temps faut-il attendre ?`, reponse: `${f - 12} heure${f - 12 > 1 ? "s" : ""}`, calcul: `de 12 h à ${f} h : ${f - 12} h` }; },
  ];
  const modelesCE2: (() => ProblemeDuree)[] = [
    () => { const [p, il] = prenom(), d = instant(8, 10), t = 60 * entre(2, 4), f = depuisMinutes(enMinutes(d) + t); return { enonce: `${p} est ${il === "il" ? "parti" : "partie"} de chez ${il === "il" ? "lui" : "elle"} à ${direHeure(d)}. ${il === "il" ? "Il est rentré" : "Elle est rentrée"} à ${direHeure(f)}. Combien de temps ${il === "il" ? "est-il sorti" : "est-elle sortie"} ?`, reponse: ecrireDuree(t), calcul: cheminDuree(d, f) }; },
    () => { const [p, il] = prenom(), f = instant(11, 13), t = 60 * entre(2, 4), d = depuisMinutes(enMinutes(f) - t); return { enonce: `${p} est ${il === "il" ? "sorti" : "sortie"} pendant ${ecrireDuree(t)}. ${il === "il" ? "Il est rentré" : "Elle est rentrée"} à ${direHeure(f)}. À quelle heure ${il === "il" ? "est-il parti" : "est-elle partie"} ?`, reponse: `à ${direHeure(d)}`, calcul: cheminDuree(d, f) }; },
    () => {
      const d = instant(7, 9), t1 = duree(60, 120), t2 = duree(20, 50), f = depuisMinutes(enMinutes(d) + t1 + t2);
      return { enonce: `Le train est parti à ${direHeure(d)}. Il a mis ${ecrireDuree(t1)} pour arriver à la première gare et il est arrivé à la deuxième gare ${ecrireDuree(t2)} plus tard. À quelle heure le train est-il arrivé dans la deuxième gare ?`, reponse: `à ${direHeure(f)}`, calcul: `${ecrireDuree(t1)} + ${ecrireDuree(t2)} = ${ecrireDuree(t1 + t2)} ; ${cheminDuree(d, f)}` };
    },
    () => { const d = instant(13, 16), t = duree(45, 120), f = depuisMinutes(enMinutes(d) + t); return { enonce: `Le match commence à ${direHeure(d)} et se termine à ${direHeure(f)}. Combien de temps dure-t-il ?`, reponse: ecrireDuree(t), calcul: cheminDuree(d, f) }; },
    () => { const f = instant(16, 18), t = duree(30, 60), d = depuisMinutes(enMinutes(f) - t); return { enonce: `Le gâteau doit cuire ${ecrireDuree(t)}. Il doit être prêt à ${direHeure(f)}. À quelle heure faut-il le mettre au four ?`, reponse: `à ${direHeure(d)}`, calcul: cheminDuree(d, f) }; },
    () => {
      const [p, il] = prenom(), d = instant(17, 18), t1 = duree(15, 30), pause = 10, t2 = duree(15, 30);
      const f = depuisMinutes(enMinutes(d) + t1 + pause + t2);
      return { enonce: `${p} commence ses devoirs à ${direHeure(d)}. ${il === "il" ? "Il" : "Elle"} travaille ${ecrireDuree(t1)}, fait une pause de ${ecrireDuree(pause)}, puis travaille encore ${ecrireDuree(t2)}. À quelle heure ${p} a-t-${il} fini ?`, reponse: `à ${direHeure(f)}`, calcul: `${ecrireDuree(t1)} + ${ecrireDuree(pause)} + ${ecrireDuree(t2)} = ${ecrireDuree(t1 + pause + t2)} ; ${cheminDuree(d, f)}` };
    },
    () => { const h = entre(1, 3), m = 10 * entre(1, 5); return { enonce: `Combien y a-t-il de minutes dans ${h} heure${h > 1 ? "s" : ""} et ${m} minutes ?`, reponse: `${60 * h + m} minutes`, calcul: `${h} × 60 min + ${m} min = ${60 * h + m} min` }; },
  ];
  const modeles = niveau === "CE1" ? modelesCE1 : modelesCE2;
  const sortie: ProblemeDuree[] = [];
  for (let i = 0; sortie.length < Math.max(1, Math.min(8, r.combien)); i++) sortie.push(modeles[i % modeles.length]());
  return sortie;
}

/** L'axe du temps, orienté : on y place les instants, on y lit la durée (programme, CE2). */
const AXE_DU_TEMPS = `<svg class="he-axe" viewBox="0 0 170 10" width="170mm" height="10mm"><line x1="2" y1="5" x2="164" y2="5" stroke="#1c2233" stroke-width="0.5"/><path d="M164 2.5 L169 5 L164 7.5 Z" fill="#1c2233"/><text x="150" y="1.8" font-size="3" font-family="Helvetica, Arial, sans-serif" fill="#687087">le temps</text></svg>`;

function feuilleProblemesDurees(r: ReglagesHeure, graine: number): string {
  // Au quart d'heure, le CE1 ; à cinq minutes ou à la minute près, le CE2 et sa ligne du temps.
  const niveau = r.precision === "cinq" || r.precision === "minutes" ? "CE2" : "CE1";
  const liste = problemesDeDurees(r, graine, niveau);
  const blocs = liste.map((p, i) => `<div class="he-probleme"><div class="he-enonce"><b>${i + 1}.</b> ${p.enonce}</div>${niveau === "CE2" ? AXE_DU_TEMPS : ""}<div class="he-calculs">Mes calculs</div><div class="he-phrase">Réponse : ........................................................................</div></div>`).join("");
  const consigne = niveau === "CE2"
    ? "Lis chaque problème. Place les instants sur la ligne du temps, puis cherche la durée : avance jusqu'à l'heure ronde, puis d'heure en heure, puis les minutes."
    : "Lis chaque problème. Rappelle-toi : 1 heure = 60 minutes ; une demi-heure = 30 minutes ; un quart d'heure = 15 minutes.";
  const tete = `<div class="titre">Problèmes de durées</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">${consigne}</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Problèmes de durées — corrigé</div><div class="he-corrige-l">${liste.map((p, i) => `<div>${i + 1}. <b>${p.reponse}</b> — ${p.calcul}.</div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="he-problemes">${blocs}</div></div>${corrige}`;
}

/** Les moments d'une journée d'écolier, et l'heure ronde qu'affiche l'horloge. */
export const MOMENTS: { quoi: string; h: number }[] = [
  { quoi: "Je me réveille.", h: 7 }, { quoi: "Je pars à l'école.", h: 8 }, { quoi: "C'est la récréation du matin.", h: 10 },
  { quoi: "Je mange à la cantine.", h: 12 }, { quoi: "La classe reprend, l'après-midi.", h: 2 }, { quoi: "Je prends mon goûter.", h: 4 },
  { quoi: "Je prends mon bain.", h: 6 }, { quoi: "Je dîne en famille.", h: 7 }, { quoi: "Je me couche.", h: 9 },
];

/** Cinq moments aux heures toutes différentes sur le cadran, et leurs horloges dans le désordre. */
export function momentsDeLaJournee(graine: number, combien = 5): { moments: { quoi: string; h: number }[]; horloges: number[] } {
  const alea = hasard(graine);
  const moments: { quoi: string; h: number }[] = [];
  for (const m of melanger(alea, MOMENTS)) if (moments.length < combien && !moments.some((x) => x.h === m.h)) moments.push(m);
  const dansLaJournee = (q: string) => MOMENTS.findIndex((m) => m.quoi === q);
  moments.sort((a, b) => dansLaJournee(a.quoi) - dansLaJournee(b.quoi));
  return { moments, horloges: melanger(alea, moments.map((m) => m.h)) };
}

function feuilleMoments(r: ReglagesHeure, graine: number): string {
  const { moments, horloges } = momentsDeLaJournee(graine, Math.max(3, Math.min(6, r.combien)));
  const c = couleursDe(r);
  const lignes = moments.map((m, i) => `<div class="he-moment-l"><span>${m.quoi}</span><span class="he-point"></span></div>
    <div></div><div class="he-moment-r"><span class="he-point"></span>${horlogeSvg({ h: horloges[i], m: 0 }, { mm: 30, heures: c.heures, minutes: c.minutes })}</div>`).join("");
  const tete = `<div class="titre">Les moments de la journée</div><div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">Relie chaque moment de la journée à l'horloge qui montre son heure.</div>`;
  const corrige = `<div class="page corrige"><div class="titre">Les moments de la journée — corrigé</div><div class="he-corrige-l">${moments.map((m) => `<div>${m.quoi} — <b>${m.h} h</b></div>`).join("")}</div></div>`;
  return `<div class="page">${tete}<div class="he-relier">${lignes}</div></div>${corrige}`;
}

/** La feuille de l'atelier, selon l'exercice choisi. */
export function htmlAtelierHeure(r: ReglagesHeure, graine: number): string {
  if (r.exercice === "durees") return feuille(feuilleDurees(r, graine), "he");
  if (r.exercice === "problemes") return feuille(feuilleProblemesDurees(r, graine), "he");
  if (r.exercice === "moments") return feuille(feuilleMoments(r, graine), "he");
  return htmlHeure(heures(r, graine), r);
}

export const STYLE_DUREES = `
  .feuille.he .he-durees { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .feuille.he .he-duree { position: relative; border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 4mm 3mm 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.he .he-quoi { font-size: 13px; font-weight: 600; margin: 0 0 2mm 3mm; }
  .feuille.he .he-deux { display: flex; align-items: center; justify-content: center; gap: 3mm; text-align: center; }
  .feuille.he .he-etiquette { font-size: 10.5px; color: #687087; margin-bottom: 1mm; }
  .feuille.he .he-fleche { font-size: 20px; font-weight: 700; color: #687087; }
  .feuille.he .he-corrige-l { font-size: 13px; line-height: 1.7; }
  .feuille.he .he-problemes { display: block; }
  .feuille.he .he-probleme { margin-bottom: 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.he .he-enonce { font-size: 14px; line-height: 1.5; }
  .feuille.he .he-calculs { border: 1.5px dashed #c4c9d6; border-radius: 3mm; min-height: 22mm; font-size: 10.5px; color: #9aa0b4; padding: 1.5mm 2mm; margin: 2mm 0; }
  .feuille.he .he-phrase { font-size: 13px; }
  .feuille.he .he-relier { display: grid; grid-template-columns: 1fr 30mm 1fr; row-gap: 5mm; align-items: center; margin-top: 4mm; }
  .feuille.he .he-moment-l { display: flex; justify-content: flex-end; align-items: center; gap: 3mm; font-size: 15px; font-weight: 600; text-align: right; }
  .feuille.he .he-moment-r { display: flex; align-items: center; gap: 3mm; }
  .feuille.he .he-point { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; flex: none; }
`;
