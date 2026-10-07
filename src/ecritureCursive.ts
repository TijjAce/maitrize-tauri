// L'écriture cursive : des modèles, et des lignes à réglure pour écrire.
//
// Livret Français CP (Éduscol, 2025), séquence n° 2 « Apprendre à écrire en
// écriture cursive » : chaque jour, la lettre de la progression en décodage,
// tracée puis enchaînée dans des syllabes, des mots, des phrases, « sur un
// petit cahier (réglures de 3, puis 2,5, puis 2 mm) » ; plusieurs fois par
// semaine, transcrire du script vers la cursive ; dès la période 2, copier
// une phrase, puis deux ou trois. Le modèle s'écrit avec la police d'écriture
// scolaire installée sur l'ordinateur — Écriture A, Belle Allure… —, comme
// dans l'atelier des gestes Borel-Maisonny.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { etapeDe, motsDe, syllabesDe } from "./progressionCgp";
import { hasard, melanger } from "./hasard";

export interface ReglagesCursive {
  /** Les modèles, un par ligne : une lettre, une syllabe, un mot, une phrase. */
  modeles: string;
  /** L'écart des petites lignes de la réglure, en millimètres. */
  reglure: 3 | 2.5 | 2;
  /** Les lignes d'écriture sous chaque modèle. */
  lignes: number;
  /** Transcrire, copier : le modèle en script au-dessus des lignes, à écrire en cursive. */
  transcrire: boolean;
}

export const REGLAGES_CURSIVE: ReglagesCursive = { modeles: "l\nli\nla\nlilas", reglure: 3, lignes: 2, transcrire: false };

export const REGLURES: ReglagesCursive["reglure"][] = [3, 2.5, 2];

/** Les polices d'écriture scolaire, la première installée l'emporte ; une cursive du système à défaut. */
export const POLICE_CURSIVE = `"Écriture A", "Ecriture A", "Écriture B", "Ecriture B", "Belle Allure GS", "Belle Allure CE", "Belle Allure CM", "Cursive standard", "Ecolier", "ScolaCursive", "Snell Roundhand", cursive`;

export const modelesSaisis = (texte: string) => (texte ?? "").split("\n").map((m) => m.trim()).filter(Boolean);

const LARGEUR = 180;

/**
 * Une ligne d'écriture, en millimètres : la ligne d'écriture en gras, trois
 * interlignes au-dessus — le corps des petites lettres, puis les boucles —,
 * deux au-dessous pour les jambages ; la marge rouge du cahier ; le modèle en
 * cursive au début, la hauteur de ses petites lettres sur un interligne.
 */
export function ligneDEcriture(reglure: number, modele = ""): string {
  // Six lignes espacées d'un interligne, une demi-interligne de marge en haut et en bas : les rangées se suivent sans rupture.
  const base = 3.5 * reglure;
  const hauteur = 6 * reglure;
  const lignes = [-3, -2, -1, 0, 1, 2].map((k) => {
    const y = (base + k * reglure).toFixed(2);
    const [couleur, epaisseur] = k === 0 ? ["#1c2233", 0.35] : k === -1 ? ["#7c88b4", 0.22] : ["#c9cede", 0.18];
    return `<line x1="0" y1="${y}" x2="${LARGEUR}" y2="${y}" stroke="${couleur}" stroke-width="${epaisseur}"/>`;
  }).join("");
  const marge = `<line x1="16" y1="0" x2="16" y2="${hauteur.toFixed(2)}" stroke="#d33a32" stroke-width="0.25"/>`;
  // Les petites lettres d'une cursive scolaire font environ 0,4 de la taille de la police.
  const texte = modele
    ? `<text x="18" y="${base.toFixed(2)}" font-family='${POLICE_CURSIVE}' font-size="${(reglure / 0.4).toFixed(2)}" fill="#1c2233">${escapeHtml(modele)}</text>` : "";
  return `<svg class="cu-ligne" viewBox="0 0 ${LARGEUR} ${hauteur.toFixed(2)}" width="${LARGEUR}mm" height="${hauteur.toFixed(2)}mm">${lignes}${marge}${texte}</svg>`;
}

export function htmlEcritureCursive(r: ReglagesCursive): string {
  const modeles = modelesSaisis(r.modeles);
  const lignes = Math.max(1, Math.min(6, r.lignes));
  const bloc = (m: string) => r.transcrire
    ? `<div class="cu-bloc"><div class="cu-script">${escapeHtml(m)}</div>${Array.from({ length: lignes }, () => ligneDEcriture(r.reglure)).join("")}</div>`
    : `<div class="cu-bloc">${ligneDEcriture(r.reglure, m)}${Array.from({ length: lignes - 1 }, () => ligneDEcriture(r.reglure)).join("")}</div>`;
  const consigne = r.transcrire
    ? "Lis le modèle, repère ce qui est difficile, puis écris-le en cursive, en revenant le moins possible au modèle."
    : "Regarde le modèle, puis écris en cursive sur les lignes, en levant le moins possible le crayon.";
  return feuille(`<div class="page"><div class="titre">${r.transcrire ? "Copier en cursive" : "Écriture cursive"}</div>
    <div class="sous">Prénom : ........................................ Date : ........................ · réglure de ${String(r.reglure).replace(".", ",")} mm</div>
    <div class="regle">${consigne} <span style="color:#687087">— Livret Français CP, Éduscol 2025.</span></div>
    ${modeles.map(bloc).join("")}</div>`, "cu");
}

export const STYLE_CURSIVE = `
  .feuille.cu .cu-bloc { margin: 0 0 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.cu .cu-ligne { display: block; }
  .feuille.cu .cu-script { font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 1mm 18mm; }
`;

/**
 * Les modèles d'une étape de la progression des graphèmes : le graphème,
 * puis des syllabes, puis des mots — ce que la séquence fait écrire le jour 1
 * (la lettre) et le jour 2 (l'enchaîner).
 */
export function modelesDeLEtape(etapeId: string, quoi: "lettre" | "mots", graine: number): string[] {
  const e = etapeDe(etapeId);
  const graphemes = e.titre.split(/[,\s]+/).filter((g) => /^[a-zàâäéèêëîïôöùûüç]+$/i.test(g)).slice(0, 2);
  const alea = hasard(graine);
  const syllabes = melanger(alea, syllabesDe(e)).filter((s) => s.length <= 4).slice(0, 3);
  if (quoi === "lettre") return [...graphemes, ...syllabes].slice(0, 5);
  const mots = melanger(alea, motsDe(e, []).corpus).filter((m) => m.length <= 8).slice(0, 4);
  return [...syllabes.slice(0, 2), ...mots];
}
