// L'écriture cursive : des modèles, et des lignes à réglure pour écrire.
//
// Livret Français CP (Éduscol, 2025), séquence n° 2 « Apprendre à écrire en
// écriture cursive » : chaque jour, la lettre de la progression en décodage,
// tracée puis enchaînée dans des syllabes, des mots, des phrases, « sur un
// petit cahier (réglures de 3, puis 2,5, puis 2 mm) » ; plusieurs fois par
// semaine, transcrire du script vers la cursive ; dès la période 2, copier
// une phrase, puis deux ou trois. Le modèle s'écrit en Marelle, la police
// cursive du ministère, ou dans celle que l'enseignant a choisie (voir
// policesEcriture.ts), ses petites lettres sur un interligne.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { etapeDe, motsDe, syllabesDe } from "./progressionCgp";
import { hasard, melanger } from "./hasard";
import { POLICE_CURSIVE, POLICE_LIGNES, tailleCursive } from "./policesEcriture";

export { POLICE_CURSIVE };

export interface ReglagesCursive {
  /** Les modèles, un par ligne : une lettre, une syllabe, un mot, une phrase. */
  modeles: string;
  /** L'écart des petites lignes de la réglure, en millimètres. */
  reglure: 3 | 2.5 | 2;
  /** Les lignes d'écriture sous chaque modèle. */
  lignes: number;
  /** Transcrire, copier : le modèle en script au-dessus des lignes, à écrire en cursive. */
  transcrire: boolean;
  /**
   * Les lignes : le cahier Seyès ; le ciel, l'herbe et la terre — trois bandes illustrées, pour les premières lettres ; ou les
   * lignes Seyès en couleur que trace la police Marelle elle-même.
   */
  guide: "seyes" | "ciel" | "marelle";
  /** Ciel, herbe, terre : la hauteur de l'herbe, celle des petites lettres, en millimètres. */
  herbe: 15 | 10 | 8 | 5;
  /** Ciel, herbe, terre : les trois bandes teintées sur toute la ligne, et pas seulement dans l'image du bord. */
  bandes: boolean;
}

export const REGLAGES_CURSIVE: ReglagesCursive = {
  modeles: "l\nli\nla\nlilas", reglure: 3, lignes: 2, transcrire: false, guide: "seyes", herbe: 10, bandes: false,
};

export const REGLURES: ReglagesCursive["reglure"][] = [3, 2.5, 2];

export const HAUTEURS_HERBE: { mm: ReglagesCursive["herbe"]; label: string }[] = [
  { mm: 15, label: "Très grande — 1,5 cm" },
  { mm: 10, label: "Grande — 1 cm" },
  { mm: 8, label: "Moyenne — 8 mm" },
  { mm: 5, label: "Petite — 5 mm" },
];

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
  // Les petites lettres sur un interligne : la taille vient de la police choisie (0,48 pour Marelle).
  const texte = modele
    ? `<text x="18" y="${base.toFixed(2)}" style='font-family: ${POLICE_CURSIVE}; font-size: ${tailleCursive(reglure)}' fill="#1c2233">${escapeHtml(modele)}</text>` : "";
  return `<svg class="cu-ligne" viewBox="0 0 ${LARGEUR} ${hauteur.toFixed(2)}" width="${LARGEUR}mm" height="${hauteur.toFixed(2)}mm">${lignes}${marge}${texte}</svg>`;
}

// ── Le ciel, l'herbe, la terre ──
//
// Pour les premières lettres, et pour qui ne voit pas encore les lignes du
// cahier : chaque ligne d'écriture devient un paysage. Les petites lettres
// restent dans l'herbe ; les grandes boucles montent dans le ciel ; les
// jambages descendent dans la terre. Les bandes gardent les proportions de la
// réglure Seyès — deux hauteurs d'herbe pour le ciel, deux pour la terre —,
// si bien qu'une police d'écriture scolaire y pose ses lettres sans retouche :
// Marelle, la police du ministère, exactement.
// Au bord de chaque ligne, l'image des trois bandes ; les lignes sont celles
// des cartes de classe : bleue en haut du ciel, verte sur l'herbe, marron au
// sol, rouge au fond de la terre.

/** Les couleurs des quatre lignes, du haut du ciel au fond de la terre. */
export const LIGNES_CIEL = { ciel: "#2a6fd6", herbe: "#2f9e44", sol: "#a8642a", terre: "#d33a32" };

/** Des cailloux posés une fois pour toutes : toutes les lignes ont la même terre. */
function cailloux(l: number, haut: number, h: number): string {
  let graine = 7;
  const suivant = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  const n = Math.max(6, Math.round((l * h) / 9));
  return Array.from({ length: n }, (_, i) => {
    const cx = (0.6 + suivant() * (l - 1.2)).toFixed(2), cy = (haut + 0.6 + suivant() * (h - 1.2)).toFixed(2);
    const r = (0.35 + suivant() * 0.55).toFixed(2);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(Number(r) * 0.75).toFixed(2)}" fill="${i % 3 === 0 ? "#e2c49c" : "#6f4524"}"/>`;
  }).join("");
}

/** L'image du bord : le ciel et ses nuages, l'herbe et ses brins, la terre et ses cailloux. Lisible aussi photocopiée en gris. */
function imageCielHerbeTerre(l: number, haut: number, u: number): string {
  const yHerbe = haut + 2 * u, ySol = haut + 3 * u;
  const nuage = (cx: number, cy: number, k: number) =>
    `<g fill="#ffffff" stroke="#8fb2d6" stroke-width="0.15"><circle cx="${cx}" cy="${cy}" r="${k}"/><circle cx="${cx + k}" cy="${cy - k * 0.45}" r="${k * 1.15}"/><circle cx="${cx + k * 2.1}" cy="${cy}" r="${k * 0.9}"/></g>`;
  const k = Math.min(l, 2 * u) / 7;
  const n = Math.max(4, Math.round(l / 1.4)), w = l / n;
  const brins = Array.from({ length: n }, (_, i) => {
    const x = (i + 0.5) * w;
    const h = u * (0.55 + 0.35 * ((i * 37) % 7) / 6);
    return `<path d="M${(x - w * 0.45).toFixed(2)} ${ySol.toFixed(2)} L${x.toFixed(2)} ${(ySol - h).toFixed(2)} L${(x + w * 0.45).toFixed(2)} ${ySol.toFixed(2)} Z" fill="#3f8a2b"/>`;
  }).join("");
  return `<g class="cu-image">
    <rect x="0" y="${haut.toFixed(2)}" width="${l.toFixed(2)}" height="${(2 * u).toFixed(2)}" fill="#cfe6fb"/>
    ${nuage(l * 0.18, haut + u * 0.7, k)}${nuage(l * 0.42, haut + u * 1.45, k * 0.8)}
    <rect x="0" y="${yHerbe.toFixed(2)}" width="${l.toFixed(2)}" height="${u.toFixed(2)}" fill="#9fd27c"/>${brins}
    <rect x="0" y="${ySol.toFixed(2)}" width="${l.toFixed(2)}" height="${(2 * u).toFixed(2)}" fill="#a87346"/>${cailloux(l, ySol, 2 * u)}
    <rect x="0" y="${haut.toFixed(2)}" width="${l.toFixed(2)}" height="${(5 * u).toFixed(2)}" fill="none" stroke="#5b6170" stroke-width="0.2"/>
  </g>`;
}

/**
 * Une ligne ciel, herbe, terre, en millimètres : le ciel sur deux hauteurs
 * d'herbe, l'herbe — le corps des petites lettres —, la terre sur deux
 * hauteurs ; l'image au bord, les quatre lignes de couleur, et le modèle posé
 * au sol, ses petites lettres de la hauteur de l'herbe.
 */
export function ligneCielHerbeTerre(herbe: number, modele = "", bandes = false): string {
  const u = herbe;
  const marge = u * 0.25;
  const hauteur = 5 * u + 2 * marge;
  const l = Math.max(8, u * 1.1);
  const haut = marge, yHerbe = haut + 2 * u, ySol = haut + 3 * u, bas = haut + 5 * u;
  const teintes = bandes
    ? `<rect x="${l}" y="${haut.toFixed(2)}" width="${(LARGEUR - l).toFixed(2)}" height="${(2 * u).toFixed(2)}" fill="#eef6fe"/>`
      + `<rect x="${l}" y="${yHerbe.toFixed(2)}" width="${(LARGEUR - l).toFixed(2)}" height="${u.toFixed(2)}" fill="#ecf7e4"/>`
      + `<rect x="${l}" y="${ySol.toFixed(2)}" width="${(LARGEUR - l).toFixed(2)}" height="${(2 * u).toFixed(2)}" fill="#f6eee5"/>`
    : "";
  const ligne = (y: number, couleur: string, epaisseur: number) =>
    `<line x1="0" y1="${y.toFixed(2)}" x2="${LARGEUR}" y2="${y.toFixed(2)}" stroke="${couleur}" stroke-width="${epaisseur}"/>`;
  const texte = modele
    // Un peu d'air après l'image : la queue d'un f, d'un j revient vers la gauche.
    ? `<text x="${(l + Math.max(2, u * 0.4)).toFixed(2)}" y="${ySol.toFixed(2)}" style='font-family: ${POLICE_CURSIVE}; font-size: ${tailleCursive(u)}' fill="#1c2233">${escapeHtml(modele)}</text>` : "";
  return `<svg class="cu-ligne cu-ciel" viewBox="0 0 ${LARGEUR} ${hauteur.toFixed(2)}" width="${LARGEUR}mm" height="${hauteur.toFixed(2)}mm">${teintes}`
    + `${imageCielHerbeTerre(l, haut, u)}`
    + `${ligne(haut, LIGNES_CIEL.ciel, 0.35)}${ligne(yHerbe, LIGNES_CIEL.herbe, 0.35)}${ligne(ySol, LIGNES_CIEL.sol, 0.5)}${ligne(bas, LIGNES_CIEL.terre, 0.35)}`
    + `${texte}</svg>`;
}

// ── Les lignes Seyès de Marelle ──
//
// La police Marelle « LIGNES » trace, sous chaque lettre et sous chaque espace,
// les six lignes de la réglure Seyès en couleur (voir policesEcriture.ts). Un
// bloc de texte suffit : une rangée par ligne d'écriture — le modèle puis des
// espaces jusqu'au bout, ou des espaces seulement —, les rangées à quatre
// interlignes l'une de l'autre (1,92 fois la taille de la police), si bien que
// les lignes se raccordent. La marge rouge du cahier se dessine par-dessus.

const INSECABLE = "\u00a0";

/** Un bloc de lignes Marelle : une rangée par texte, la taille de la police met une petite lettre sur un interligne. */
export function blocMarelle(reglure: number, rangees: string[]): string {
  const taille = reglure / 0.48;
  // Une espace de Marelle fait 0,45 de sa taille : de quoi aller jusqu'à la marge, puis jusqu'au bout de la ligne. Des
  // espaces insécables, qui portent les mêmes lignes : les espaces ordinaires d'une fin de bloc sont retirés à l'impression
  // (voir references.ts), et la dernière rangée disparaissait avec.
  const espace = 0.45 * taille;
  const marge = INSECABLE.repeat(Math.max(1, Math.round(18 / espace)));
  const suite = INSECABLE.repeat(Math.ceil(LARGEUR / espace) + 4);
  const texte = rangees.map((m) => `${marge}${escapeHtml(m)}${suite}`).join("\n");
  // La police écrite ici, et non dans le style de l'atelier : seule une feuille qui s'en sert emporte son fichier (voir policesEcriture.ts).
  return `<div class="cu-marelle" style='font-family: ${POLICE_LIGNES}; font-size: ${taille.toFixed(3)}mm; --cu-interligne: ${reglure}mm'>${texte}</div>`;
}

export function htmlEcritureCursive(r: ReglagesCursive): string {
  const modeles = modelesSaisis(r.modeles);
  const lignes = Math.max(1, Math.min(6, r.lignes));
  const ciel = r.guide === "ciel";
  const marelle = r.guide === "marelle";
  const herbe = HAUTEURS_HERBE.some((h) => h.mm === r.herbe) ? r.herbe : REGLAGES_CURSIVE.herbe;
  const ligne = (m = "") => (ciel ? ligneCielHerbeTerre(herbe, m, !!r.bandes) : ligneDEcriture(r.reglure, m));
  const vides = (n: number) => Array.from({ length: n }, () => "");
  const bloc = (m: string) => marelle
    ? r.transcrire
      ? `<div class="cu-bloc"><div class="cu-script">${escapeHtml(m)}</div>${blocMarelle(r.reglure, vides(lignes))}</div>`
      : `<div class="cu-bloc">${blocMarelle(r.reglure, [m, ...vides(lignes - 1)])}</div>`
    : r.transcrire
      ? `<div class="cu-bloc"><div class="cu-script">${escapeHtml(m)}</div>${Array.from({ length: lignes }, () => ligne()).join("")}</div>`
      : `<div class="cu-bloc">${ligne(m)}${Array.from({ length: lignes - 1 }, () => ligne()).join("")}</div>`;
  const consigne = r.transcrire
    ? "Lis le modèle, repère ce qui est difficile, puis écris-le en cursive, en revenant le moins possible au modèle."
    : ciel
      ? "Regarde le modèle, puis écris en cursive : les petites lettres restent dans l'herbe, les grandes montent dans le ciel, les autres descendent dans la terre."
      : "Regarde le modèle, puis écris en cursive sur les lignes, en levant le moins possible le crayon.";
  const reperes = ciel ? "ciel, herbe, terre" : `${marelle ? "lignes Seyès de Marelle, " : ""}réglure de ${String(r.reglure).replace(".", ",")} mm`;
  return feuille(`<div class="page"><div class="titre">${r.transcrire ? "Copier en cursive" : "Écriture cursive"}</div>
    <div class="sous">Prénom : ........................................ Date : ........................ · ${reperes}</div>
    <div class="regle">${consigne} <span class="reference">Livret Français CP, Éduscol 2025.</span></div>
    ${modeles.map(bloc).join("")}</div>`, "cu");
}

/**
 * Le style des lignes de Marelle (voir `blocMarelle`), pour toute feuille qui
 * s'en sert : la ligne du haut et les jambages de la dernière rangée ont leur
 * place dans le bloc ; les espaces au-delà de la page sont coupés ; la marge
 * rouge du cahier par-dessus.
 */
export const STYLE_LIGNES_MARELLE = `
  .feuille .cu-marelle { position: relative; line-height: 1.92; white-space: pre; overflow: hidden; width: ${LARGEUR}mm;
    color: #1c2233; padding: 0.6mm 0 calc(var(--cu-interligne, 3mm) + 0.6mm); }
  .feuille .cu-marelle::after { content: ""; position: absolute; top: 0; bottom: 0; left: 16mm; width: 0.25mm; background: #d33a32; }
`;

export const STYLE_CURSIVE = `
  .feuille.cu .cu-bloc { margin: 0 0 4mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.cu .cu-ligne { display: block; }
  .feuille.cu .cu-script { font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 1mm 18mm; }
${STYLE_LIGNES_MARELLE}`;

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
