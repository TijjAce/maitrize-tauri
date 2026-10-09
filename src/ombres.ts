// ── Le jeu des ombres ──────────────────────────────────────────────────────
//
// Chaque image retrouve son ombre : une planche de silhouettes, les images
// à découper, et l'élève pose chacune sur la sienne — ou relie l'une à
// l'autre d'un trait. C'est de la discrimination visuelle : la forme sans
// la couleur ni le détail.
//
// L'ombre se tire de l'image elle-même. Un pictogramme a un fond
// transparent : tout ce qui est peint devient noir. Une photo n'en a pas :
// on prend pour fond ce qu'annoncent les bords — une couleur, ou une
// couleur qui glisse comme la lumière sur une feuille —, et l'on part des
// bords pour l'effacer : un blanc à l'intérieur du sujet reste donc dans
// l'ombre. Une photo sans fond donne un rectangle : l'ombre d'un cadre, pas
// d'un objet, et c'est à l'enseignant de choisir une image détourée.

import { HAUTEUR_UTILE_MM, attributionPour, feuille, CREDIT_ARASAAC } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

export type FormeOmbres = "poser" | "relier";

export interface ReglagesOmbres {
  /** Des images à découper et à poser sur la planche, ou une fiche où l'on relie. */
  forme: FormeOmbres;
  /** Ombres par planche, quand on pose. */
  parPage: 6 | 9 | 12;
  /** Le mot sous l'image et sous son ombre. */
  legendes: boolean;
  /** Une ombre grise plutôt que noire : moins d'encre, même forme. */
  grise: boolean;
}

export const REGLAGES_OMBRES: ReglagesOmbres = { forme: "poser", parPage: 6, legendes: false, grise: false };

/** Une image et son ombre, prêtes à imprimer ; `id` dit d'où vient l'image — la banque, ou l'enseignant. */
export interface ImageOmbre { id?: number | null; mot: string; image: string; ombre: string }

/** Combien d'images il faut pour que le jeu ait un sens. */
export const OMBRES_MINIMUM = 2;
/** Images par fiche, quand on relie : au-delà, les traits se croisent trop. */
export const RELIER_PAR_PAGE = 5;

/** La part de l'image que le fond doit occuper pour qu'on le prenne pour un fond. */
const FOND_MINIMUM = 0.12;
/** La part des bords que le fond doit tenir : en dessous, rien n'entoure le sujet — c'est une photo plein cadre. */
const BORDS_MINIMUM = 0.8;
/** Un éclat isolé plus petit que cette part du sujet est une poussière du fond, pas un morceau de l'objet. */
const POUSSIERE = 0.03;

const NOIR: [number, number, number] = [20, 22, 30];
const GRIS: [number, number, number] = [150, 154, 166];

/** La couleur de l'ombre. */
export const teinteDeLOmbre = (grise: boolean) => (grise ? GRIS : NOIR);

/** Le fond d'une photo : une couleur qui glisse d'un bord à l'autre, comme l'éclairage sur une feuille. */
type Fond = (x: number, y: number) => [number, number, number];

/** Ce dont la couleur du fond peut dépendre, du plus souple au plus simple : une surface courbe, une pente, une teinte. */
const BASES: ((x: number, y: number) => number[])[] = [
  (x, y) => [1, x, y, x * x, x * y, y * y],
  (x, y) => [1, x, y],
  () => [1],
];

/** La solution de `m · s = v` par élimination, colonne par colonne de `v` ; rien si le système ne se résout pas. */
function resoudre(m: number[][], v: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((ligne, i) => [...ligne, ...v[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(a[l][c]) > Math.abs(a[pivot][c])) pivot = l;
    if (Math.abs(a[pivot][c]) < 1e-7) return null;
    [a[c], a[pivot]] = [a[pivot], a[c]];
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const k = a[l][c] / a[c][c];
      if (k) for (let j = c; j < a[l].length; j++) a[l][j] -= k * a[c][j];
    }
  }
  return a.map((ligne, i) => ligne.slice(n).map((x) => x / ligne[i]));
}

/**
 * Le fond qu'annoncent les bords, ou rien s'ils n'en annoncent pas.
 *
 * Une feuille blanche photographiée n'est jamais d'un seul blanc : la lumière
 * tombe d'un côté, l'objectif assombrit les coins. On ajuste donc à la
 * couleur des bords une surface douce par canal, en écartant à chaque passe
 * les points qui s'en éloignent : un objet qui touche le bord ne tire pas le
 * fond vers lui. Si moins de `BORDS_MINIMUM` des bords suivent ce fond,
 * l'image n'a pas de fond.
 */
function fondDesBords(rgba: Uint8ClampedArray, largeur: number, hauteur: number, bords: number[], tolerance: number): Fond | null {
  const ex = Math.max(1, largeur - 1), ey = Math.max(1, hauteur - 1);
  const points = bords.map((i) => ({ i, x: (i % largeur) / ex, y: Math.floor(i / largeur) / ey }));
  const ecart = (f: Fond, q: { i: number; x: number; y: number }) => {
    const [r, v, b] = f(q.x, q.y);
    return Math.hypot(rgba[q.i * 4] - r, rgba[q.i * 4 + 1] - v, rgba[q.i * 4 + 2] - b);
  };
  const ajuster = (retenus: typeof points): Fond | null => {
    for (const base of BASES) {
      const k = base(0, 0).length;
      // Une surface courbe demande des points de tous les côtés ; à défaut, on se contente de plus simple.
      if (retenus.length < k * 2) continue;
      const m = Array.from({ length: k }, () => new Array<number>(k).fill(0));
      const v = Array.from({ length: k }, () => [0, 0, 0]);
      for (const q of retenus) {
        const f = base(q.x, q.y);
        for (let a = 0; a < k; a++) {
          for (let b = 0; b < k; b++) m[a][b] += f[a] * f[b];
          for (let c = 0; c < 3; c++) v[a][c] += f[a] * rgba[q.i * 4 + c];
        }
      }
      const s = resoudre(m, v);
      if (!s) continue;
      return (x, y) => {
        const f = base(x, y);
        const couleur: [number, number, number] = [0, 0, 0];
        for (let a = 0; a < k; a++) for (let c = 0; c < 3; c++) couleur[c] += f[a] * s[a][c];
        return couleur;
      };
    }
    return null;
  };
  let fond = ajuster(points);
  for (const seuil of [tolerance * 3, tolerance * 1.5, tolerance]) {
    if (!fond) return null;
    const f = fond;
    fond = ajuster(points.filter((q) => ecart(f, q) <= seuil));
  }
  if (!fond) return null;
  const f = fond;
  const fideles = points.filter((q) => ecart(f, q) <= tolerance).length;
  if (fideles < points.length * BORDS_MINIMUM) return null;
  return (x, y) => f(x / ex, y / ey);
}

/** Les morceaux d'un masque : chacun la liste de ses points, voisins par un côté. */
function morceaux(masque: Uint8Array, largeur: number, hauteur: number): number[][] {
  const vu = new Uint8Array(masque.length);
  const sortie: number[][] = [];
  for (let depart = 0; depart < masque.length; depart++) {
    if (!masque[depart] || vu[depart]) continue;
    const morceau = [depart];
    vu[depart] = 1;
    for (let k = 0; k < morceau.length; k++) {
      const i = morceau[k], x = i % largeur, y = (i - x) / largeur;
      const voisins = [x > 0 ? i - 1 : -1, x < largeur - 1 ? i + 1 : -1, y > 0 ? i - largeur : -1, y < hauteur - 1 ? i + largeur : -1];
      for (const v of voisins) if (v >= 0 && masque[v] && !vu[v]) { vu[v] = 1; morceau.push(v); }
    }
    sortie.push(morceau);
  }
  return sortie;
}

/**
 * La silhouette d'une image : la teinte là où est le sujet, rien ailleurs.
 *
 * `rgba` est l'image, quatre octets par pixel. Avec de la transparence, le
 * sujet est ce qui est peint, bords adoucis compris. Sans, le fond est ce
 * qu'annoncent les bords, effacé en partant des bords ; si rien ne se
 * détache — une photo plein cadre —, l'ombre est le cadre entier.
 */
export function silhouette(
  rgba: Uint8ClampedArray, largeur: number, hauteur: number, teinte: [number, number, number] = NOIR, tolerance = 42,
): Uint8ClampedArray {
  const n = largeur * hauteur;
  // L'opacité de l'ombre, point par point.
  const ombre = new Uint8Array(n);
  let transparents = 0;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] < 128) transparents++;
  if (transparents >= Math.max(4, n * 0.01)) {
    // Le contour d'un dessin détouré est à demi transparent : on garde ce
    // dégradé, en plus appuyé, pour une ombre au bord net et sans escalier.
    for (let i = 0; i < n; i++) { const a = rgba[i * 4 + 3]; ombre[i] = a < 24 ? 0 : Math.min(255, a * 2); }
  } else {
    const bords: number[] = [];
    for (let x = 0; x < largeur; x++) { bords.push(x); if (hauteur > 1) bords.push((hauteur - 1) * largeur + x); }
    for (let y = 1; y < hauteur - 1; y++) { bords.push(y * largeur); if (largeur > 1) bords.push(y * largeur + largeur - 1); }
    const fond = fondDesBords(rgba, largeur, hauteur, bords, tolerance);
    const sujet = new Uint8Array(n).fill(1);
    if (fond) {
      const estFond = (i: number) => {
        const x = i % largeur, [r, v, b] = fond(x, (i - x) / largeur);
        return Math.hypot(rgba[i * 4] - r, rgba[i * 4 + 1] - v, rgba[i * 4 + 2] - b) <= tolerance;
      };
      // On efface le fond en partant des bords : ce qui lui ressemble à l'intérieur du sujet reste.
      const pile: number[] = [];
      for (const i of bords) if (sujet[i] && estFond(i)) { sujet[i] = 0; pile.push(i); }
      while (pile.length) {
        const i = pile.pop()!;
        const x = i % largeur, y = (i - x) / largeur;
        if (x > 0 && sujet[i - 1] && estFond(i - 1)) { sujet[i - 1] = 0; pile.push(i - 1); }
        if (x < largeur - 1 && sujet[i + 1] && estFond(i + 1)) { sujet[i + 1] = 0; pile.push(i + 1); }
        if (y > 0 && sujet[i - largeur] && estFond(i - largeur)) { sujet[i - largeur] = 0; pile.push(i - largeur); }
        if (y < hauteur - 1 && sujet[i + largeur] && estFond(i + largeur)) { sujet[i + largeur] = 0; pile.push(i + largeur); }
      }
      // Les poussières : un éclat du fond resté seul, bien plus petit que l'objet.
      const parts = morceaux(sujet, largeur, hauteur);
      const plusGrand = Math.max(0, ...parts.map((m) => m.length));
      for (const m of parts) if (m.length < plusGrand * POUSSIERE) for (const i of m) sujet[i] = 0;
      let reste = 0;
      for (let i = 0; i < n; i++) reste += sujet[i];
      // Un fond qui n'occupe presque rien n'est pas un fond, et un sujet qui a
      // disparu n'en est plus un : l'ombre est le cadre.
      if (n - reste < n * FOND_MINIMUM || reste < n * 0.01) sujet.fill(1);
    }
    for (let i = 0; i < n; i++) ombre[i] = sujet[i] ? 255 : 0;
  }
  const sortie = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    if (!ombre[i]) continue;
    sortie[i * 4] = teinte[0]; sortie[i * 4 + 1] = teinte[1]; sortie[i * 4 + 2] = teinte[2]; sortie[i * 4 + 3] = ombre[i];
  }
  return sortie;
}

const GRILLES: Record<number, [number, number]> = { 6: [3, 2], 9: [3, 3], 12: [4, 3] };

const img = (src: string, mot: string) => `<img src="${src}" alt="${escapeHtml(mot)}">`;
const mot = (m: string, montre: boolean) => (montre && m.trim() ? `<div class="om-mot">${escapeHtml(m)}</div>` : "");

function pagesAPoser(items: ImageOmbre[], r: ReglagesOmbres, graine: number): string {
  const [colonnes] = GRILLES[r.parPage] ?? GRILLES[6];
  const grille = (cellules: string[]) => `<div class="om-grille" style="grid-template-columns: repeat(${colonnes}, 1fr)">${cellules.join("")}</div>`;
  const pages: string[] = [];
  for (let i = 0; i < items.length; i += r.parPage) {
    const tranche = items.slice(i, i + r.parPage);
    pages.push(`<div class="page"><div class="titre">Le jeu des ombres</div>`
      + `<p class="consigne">Découpe les images, puis pose chaque image sur son ombre.</p>`
      + grille(tranche.map((x) => `<div class="om-case">${img(x.ombre, `ombre : ${x.mot}`)}${mot(x.mot, r.legendes)}</div>`)) + `</div>`);
    // Les images dans un autre ordre que les ombres : découper ne doit pas donner la réponse.
    const melees = melanger(hasard(graine + i), tranche);
    pages.push(`<div class="page"><div class="titre">Les images à découper</div>`
      + `<div class="sous">De la taille des ombres : une image par case de la planche.</div>`
      + grille(melees.map((x) => `<div class="om-carte">${img(x.image, x.mot)}${mot(x.mot, r.legendes)}</div>`)) + `</div>`);
  }
  return pages.join("");
}

function pagesARelier(items: ImageOmbre[], r: ReglagesOmbres, graine: number): string {
  const pages: string[] = [];
  const corriges: string[] = [];
  const vignette = (src: string, m: string, legende: boolean) => `<div class="om-vignette">${img(src, m)}${mot(m, legende)}</div>`;
  for (let i = 0; i < items.length; i += RELIER_PAR_PAGE) {
    const tranche = items.slice(i, i + RELIER_PAR_PAGE);
    let ombres = melanger(hasard(graine + i), tranche);
    // Un tirage qui laisse tout en face de tout ne demande rien : on décale d'un cran.
    if (tranche.length > 1 && ombres.every((x, k) => x === tranche[k])) ombres = [...tranche.slice(1), tranche[0]];
    pages.push(`<div class="page"><div class="titre">Le jeu des ombres</div>`
      + `<div class="om-prenom">Prénom : .................................... Date : ....................</div>`
      + `<p class="consigne">Relie chaque image à son ombre.</p>`
      + `<div class="om-relier">${tranche.map((x, k) => `<div class="om-ligne">${vignette(x.image, x.mot, r.legendes)}<span class="om-point"></span>`
        + `<span class="om-espace"></span><span class="om-point"></span>${vignette(ombres[k].ombre, `ombre : ${ombres[k].mot}`, false)}</div>`).join("")}</div></div>`);
    corriges.push(...tranche.map((x) => `<div class="om-paire">${vignette(x.image, x.mot, true)}<span class="om-fleche">→</span>${vignette(x.ombre, `ombre : ${x.mot}`, false)}</div>`));
  }
  const corrige = `<div class="page corrige"><div class="titre">Le jeu des ombres — corrigé</div><div class="om-corrige">${corriges.join("")}</div></div>`;
  return pages.join("") + corrige;
}

/** L'ombre d'un pictogramme de la banque en est une adaptation : la licence demande de le dire. */
const MENTION_OMBRES = `<div class="attribution">${CREDIT_ARASAAC} Les ombres sont tirées de ces pictogrammes, sous la même licence.</div>`;

/** La feuille : la planche des ombres et ses images à découper, ou la fiche à relier et son corrigé. */
export function htmlOmbres(items: ImageOmbre[], r: ReglagesOmbres, graine: number): string {
  const prets = items.filter((x) => x.image && x.ombre);
  if (!prets.length) return feuille(`<div class="page"><div class="sous">Ajoutez des images : chacune aura son ombre.</div></div>`, "om");
  const pages = r.forme === "relier" ? pagesARelier(prets, r, graine) : pagesAPoser(prets, r, graine);
  return feuille(`${pages}${attributionPour(prets.map((x) => x.id), MENTION_OMBRES)}`, "om");
}

/** Combien de feuilles le jeu fera, pour le dire avant d'imprimer. */
export function feuillesDOmbres(combien: number, r: ReglagesOmbres): number {
  if (combien <= 0) return 0;
  return r.forme === "relier" ? Math.ceil(combien / RELIER_PAR_PAGE) + 1 : Math.ceil(combien / r.parPage) * 2;
}

const HAUTEUR_VIGNETTE = Math.floor((HAUTEUR_UTILE_MM - 50) / RELIER_PAR_PAGE) - 6;

export const STYLE_OMBRES = `
  .feuille.om .consigne { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .feuille.om .om-grille { display: grid; gap: 0; width: 100%; }
  .feuille.om .om-case, .feuille.om .om-carte { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1.5mm; padding: 3mm; overflow: hidden; min-width: 0; }
  .feuille.om .om-case { border: 1px solid #c4c9d6; }
  .feuille.om .om-carte { border: 1px dashed #9aa0b4; }
  .feuille.om .om-case img, .feuille.om .om-carte img { flex: 1 1 0; min-height: 0; width: 88%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.om .om-mot { flex: none; font-size: 13px; font-weight: 700; line-height: 1.1; text-align: center; }
  .feuille.om .om-prenom { font-size: 12px; color: #4a5065; margin: 0 0 6px; }
  .feuille.om .om-relier { display: flex; flex-direction: column; gap: 4mm; }
  .feuille.om .om-ligne { display: flex; align-items: center; gap: 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.om .om-vignette { flex: none; width: ${HAUTEUR_VIGNETTE}mm; height: ${HAUTEUR_VIGNETTE}mm; border: 1px solid #c4c9d6; border-radius: 3mm;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; padding: 2mm; overflow: hidden; }
  .feuille.om .om-vignette img { flex: 1 1 0; min-height: 0; width: 90%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.om .om-point { flex: none; width: 3mm; height: 3mm; border-radius: 50%; background: #1c2233; }
  .feuille.om .om-espace { flex: 1 1 auto; }
  .feuille.om .om-corrige { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
  .feuille.om .om-paire { display: flex; align-items: center; gap: 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.om .om-paire .om-vignette { width: 30mm; height: 30mm; }
  .feuille.om .om-fleche { font-size: 18px; color: #687087; }
`;
