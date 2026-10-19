// L'aperçu d'un loto, d'un jeu de mémoire, d'un imagier : leur PDF se
// fabrique de l'autre côté (jeux_pdf.rs), et rien ne le montrait avant qu'on
// l'ouvre. Cette page en HTML en reprend la géométrie — la page A4, ses
// marges de 16 mm, 12 mm entre les cases, les cases à bord gris et coins
// arrondis, le dessin à 14 % du bord, le mot dessous quand on le veut —, en
// proportions : elle se met à la largeur de l'aperçu. Pas de titre ni de
// décor, comme le PDF.

import { attributionPour, feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export type JeuDImages = "loto" | "memory" | "imagier";
export interface OptionsDeLApercu { colonnes: number; lignes: number; libelles: boolean; cartes: boolean }
interface Image { id: number; mot: string }

/** Une page : sa grille de cases, en paysage ou en portrait. */
function page(cases: Image[], colonnes: number, lignes: number, paysage: boolean, mots: boolean, images: Record<number, string>): string {
  const [l, h] = paysage ? [297, 210] : [210, 297];
  // Les marges et l'écart du PDF, en part de la page.
  // Un pourcentage de marge se compte sur la largeur de la page, en haut comme sur les côtés.
  const style = `aspect-ratio:${l}/${h};padding:${(16 / l) * 100}%;`
    + `--aj-colonnes:${colonnes};--aj-lignes:${lignes};--aj-ecart:${(12 / l) * 100}cqw`;
  const cellules = Array.from({ length: colonnes * lignes }, (_, k) => {
    const c = cases[k];
    if (!c) return '<div class="aj-case aj-vide"></div>';
    const src = images[c.id];
    return `<div class="aj-case">${src ? `<img src="${src}" alt="">` : '<span class="aj-sans"></span>'}${mots ? `<span class="aj-mot">${escapeHtml(c.mot)}</span>` : ""}</div>`;
  }).join("");
  return `<div class="page aj-page" style="${style}"><div class="aj-grille">${cellules}</div></div>`;
}

/**
 * La première planche, comme le PDF la fera — et, pour un loto, la première
 * page de ses cartes à piocher. Les images manquent ? On en reprend.
 */
export function htmlApercuJeu(jeu: JeuDImages, choisies: Image[], o: OptionsDeLApercu, images: Record<number, string>): string {
  if (!choisies.length) return "";
  const n = o.colonnes * o.lignes;
  const autant = (k: number) => Array.from({ length: k }, (_, i) => choisies[i % choisies.length]);
  let pages: string;
  if (jeu === "loto") {
    pages = page(autant(n), o.colonnes, o.lignes, true, o.libelles, images)
      + (o.cartes ? page(choisies.slice(0, 12), 3, 4, false, o.libelles, images) : "");
  } else if (jeu === "memory") {
    // Chaque image en double, mêlées : les deux cartes d'une paire ne se suivent pas.
    const paires = autant(Math.max(1, Math.floor(n / 2)));
    pages = page(melanger(hasard(7), [...paires, ...paires]), o.colonnes, o.lignes, o.colonnes > o.lignes, o.libelles, images);
  } else {
    // L'imagier écrit toujours le mot : c'est tout son objet.
    pages = page(choisies.slice(0, n), o.colonnes, o.lignes, o.colonnes > o.lignes, true, images);
  }
  return feuille(pages + attributionPour(choisies.map((c) => c.id)), "aj");
}

export const STYLE_APERCU_JEUX = `
  .feuille.aj .aj-page { position: relative; width: 100%; box-sizing: border-box; border: 1px solid #e3e6ee; margin: 0 0 12px; container-type: inline-size; }
  .feuille.aj .aj-grille { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(var(--aj-colonnes), 1fr); grid-template-rows: repeat(var(--aj-lignes), 1fr); gap: var(--aj-ecart); }
  .feuille.aj .aj-case { border: 1.5px solid #b8b8b8; border-radius: 2cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; overflow: hidden; }
  .feuille.aj .aj-case.aj-vide { border-style: dashed; }
  .feuille.aj .aj-case img { width: 72%; height: 72%; min-height: 0; object-fit: contain; margin: 0; max-height: none; }
  .feuille.aj .aj-case img + .aj-mot { margin-top: -4%; }
  .feuille.aj .aj-sans { width: 60%; height: 60%; border: 1px dashed #c4c9d6; border-radius: 1cqw; }
  .feuille.aj .aj-mot { font-size: 2.6cqw; font-weight: 700; text-align: center; line-height: 1.1; padding: 0 3%; }
`;
