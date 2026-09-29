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

export type PrecisionHeure = "heures" | "demies" | "quarts" | "cinq";
export const PRECISIONS_HEURE: { id: PrecisionHeure; libelle: string }[] = [
  { id: "heures", libelle: "Heures pile" }, { id: "demies", libelle: "Heures et demies" },
  { id: "quarts", libelle: "Quarts d'heure" }, { id: "cinq", libelle: "De cinq en cinq minutes" },
];
export type SensHeure = "lire" | "dessiner" | "mixte";

/** Des couleurs qui se lisent en trait fin, sur le papier comme au tableau. */
export const COULEURS_AIGUILLES: { nom: string; hex: string }[] = [
  { nom: "rouge", hex: "#d94033" }, { nom: "bleu", hex: "#2454e6" }, { nom: "vert", hex: "#1f9a48" },
  { nom: "orange", hex: "#e07b00" }, { nom: "violet", hex: "#8e44ad" }, { nom: "noir", hex: "#1c2233" },
];
const NOIR = "#1c2233";

/** Une couleur enregistrée n'est reprise que si c'en est une : un réglage se synchronise, se restaure, se modifie à la main. */
export const couleurSure = (c: string | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : NOIR);

export interface ReglagesHeure {
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
  precision: "heures", sens: "lire", combien: 9, apresMidi: false,
  couleurs: false, couleurHeures: "#d94033", couleurMinutes: "#2454e6", avecH: true, minutesAutour: false,
};

export interface Heure { h: number; m: number }

const MINUTES: Record<PrecisionHeure, number[]> = {
  heures: [0], demies: [0, 30], quarts: [0, 15, 30, 45], cinq: Array.from({ length: 12 }, (_, i) => 5 * i),
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
export const consigneHeure = (r: Pick<ReglagesHeure, "sens">) =>
  r.sens === "dessiner" ? "Dessine les aiguilles." : r.sens === "mixte" ? "Écris l'heure qu'il est, ou dessine les aiguilles." : "Écris l'heure qu'il est.";

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
  const corrige = `<div class="page"><div class="titre">Lire l'heure — corrigé</div><div class="he-corrige">${liste.map((t, i) => `<span>${i + 1}. <b>${lecture(t)}</b></span>`).join("")}</div></div>`;
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
