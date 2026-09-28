// Lire l'heure, et la placer sur l'horloge.
//
// Des horloges à aiguilles à lire — heures pile, demies, quarts, puis les
// cinq minutes — et des cadrans vides où dessiner l'heure demandée. Avec
// l'après-midi, la même horloge se lit deux fois : 7 h 30, ou 19 h 30.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type PrecisionHeure = "heures" | "demies" | "quarts" | "cinq";
export const PRECISIONS_HEURE: { id: PrecisionHeure; libelle: string }[] = [
  { id: "heures", libelle: "Heures pile" }, { id: "demies", libelle: "Heures et demies" },
  { id: "quarts", libelle: "Quarts d'heure" }, { id: "cinq", libelle: "De cinq en cinq minutes" },
];
export type SensHeure = "lire" | "dessiner" | "mixte";

export interface ReglagesHeure {
  precision: PrecisionHeure;
  /** Lire l'heure sur le cadran, dessiner les aiguilles, ou l'un puis l'autre. */
  sens: SensHeure;
  combien: number;
  /** Les heures de l'après-midi aussi : 19 h 30 se lit sur le même cadran que 7 h 30. */
  apresMidi: boolean;
}
export const REGLAGES_HEURE: ReglagesHeure = { precision: "heures", sens: "lire", combien: 9, apresMidi: false };

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

/** « 7 h 05 », comme on l'écrit au tableau. */
export const lireHeure = (t: Heure) => `${t.h} h ${String(t.m).padStart(2, "0")}`;

/** L'autre lecture du même cadran : 7 h 30 et 19 h 30. */
export const autreLecture = (t: Heure): Heure => ({ h: (t.h + 12) % 24, m: t.m });

const p = (v: number) => v.toFixed(1);

/** Le cadran : les douze nombres, les soixante traits, et les aiguilles si on donne l'heure. */
export function horlogeSvg(t: Heure | null, mm = 40): string {
  const traits = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 * Math.PI) / 180, long = i % 5 === 0, r1 = long ? 40 : 43;
    return `<line x1="${p(50 + r1 * Math.sin(a))}" y1="${p(50 - r1 * Math.cos(a))}" x2="${p(50 + 46 * Math.sin(a))}" y2="${p(50 - 46 * Math.cos(a))}" stroke="#1c2233" stroke-width="${long ? 1.5 : 0.7}"/>`;
  }).join("");
  const nombres = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1, a = (n * 30 * Math.PI) / 180;
    return `<text x="${p(50 + 33 * Math.sin(a))}" y="${p(50 - 33 * Math.cos(a))}" text-anchor="middle" dominant-baseline="central" font-size="9.5" font-weight="700" font-family="Helvetica, Arial, sans-serif">${n}</text>`;
  }).join("");
  let aiguilles = "";
  if (t) {
    const am = (t.m * 6 * Math.PI) / 180, ah = (((t.h % 12) * 30 + t.m * 0.5) * Math.PI) / 180;
    aiguilles = `<line class="he-heures" x1="50" y1="50" x2="${p(50 + 22 * Math.sin(ah))}" y2="${p(50 - 22 * Math.cos(ah))}" stroke="#1c2233" stroke-width="4.5" stroke-linecap="round"/>`
      + `<line class="he-minutes" x1="50" y1="50" x2="${p(50 + 36 * Math.sin(am))}" y2="${p(50 - 36 * Math.cos(am))}" stroke="#1c2233" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return `<svg class="he-cadran" viewBox="0 0 100 100" width="${mm}mm" height="${mm}mm" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="47.5" fill="#fff" stroke="#1c2233" stroke-width="2"/>${traits}${nombres}${aiguilles}<circle cx="50" cy="50" r="2.2" fill="#1c2233"/></svg>`;
}

export function htmlHeure(liste: Heure[], r: ReglagesHeure): string {
  const lire = (i: number) => r.sens === "lire" || (r.sens === "mixte" && i % 2 === 0);
  const carte = (t: Heure, i: number) => lire(i)
    ? `<div class="he-carte"><div class="he-num">${i + 1}</div>${horlogeSvg(t)}${r.apresMidi
      ? `<div class="he-reponse">matin : ......... h .........</div><div class="he-reponse">après-midi : ......... h .........</div>`
      : `<div class="he-reponse">......... h .........</div>`}</div>`
    : `<div class="he-carte"><div class="he-num">${i + 1}</div>${horlogeSvg(null)}<div class="he-consigne">Dessine les aiguilles : <b>${lireHeure(t)}</b></div></div>`;
  const regle = `<div class="titre">Lire l'heure</div><div class="regle"><b>La règle</b>La petite aiguille dit l'heure, la grande dit les minutes : cinq minutes d'un nombre au suivant. ${r.sens === "dessiner" ? "Dessine les aiguilles à l'heure demandée." : r.sens === "mixte" ? "Écris l'heure qu'il est, ou dessine les aiguilles." : "Écris l'heure qu'il est."}${r.apresMidi ? " Le même cadran se lit le matin et l'après-midi : 7 h 30, ou 19 h 30." : ""}</div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, liste.length); i += 9) {
    pages.push(`<div class="page">${regle}<div class="he-grille">${liste.slice(i, i + 9).map((t, j) => carte(t, i + j)).join("")}</div></div>`);
  }
  const lecture = (t: Heure) => (r.apresMidi ? `${lireHeure(t.h < 12 ? t : autreLecture(t))} ou ${lireHeure(t.h < 12 ? autreLecture(t) : t)}` : lireHeure(t));
  const corrige = `<div class="page"><div class="titre">Lire l'heure — corrigé</div><div class="he-corrige">${liste.map((t, i) => `<span>${i + 1}. <b>${lecture(t)}</b></span>`).join("")}</div></div>`;
  return feuille(pages.join("") + corrige, "he");
}

export const STYLE_HEURE = `
  .feuille.he .he-grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .feuille.he .he-carte { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 3mm 2mm 2mm; text-align: center; position: relative; page-break-inside: avoid; }
  .feuille.he .he-num { position: absolute; top: 1.5mm; left: 2.5mm; font-size: 10px; color: #687087; }
  .feuille.he .he-cadran { display: block; margin: 0 auto; }
  .feuille.he .he-reponse { font-size: 13px; font-weight: 700; margin-top: 2mm; }
  .feuille.he .he-consigne { font-size: 12px; margin-top: 2mm; }
  .feuille.he .he-corrige { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 12px; font-size: 13px; }
`;
