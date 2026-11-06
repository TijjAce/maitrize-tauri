// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Une image en coloriage ────────────────────────────────────────────────
//
// Demande de l'enseignant (2026-11-01), pour le tableau à double entrée :
// « on peut également mettre des coloriages noir et blanc dans les images ».
// Un pictogramme de la banque a des traits noirs et des aplats de couleur :
// on garde les traits, on blanchit le reste, et l'on a le dessin à colorier.
// Pour la case faite et le corrigé, le même dessin, ses aplats de la couleur
// de la colonne. Ce qui est transparent le reste ; une photo, sans
// transparence, garde blanc son fond presque blanc.
//
// Un trait est presque noir, et sans couleur : essayé sur les pictogrammes de
// la banque (singe, zèbre, hippopotame, 2026-11-01), un simple seuil de
// luminance prenait pour un trait le pelage brun foncé du singe, qui sortait
// noir ; ainsi, il prend la couleur, et seuls les contours restent noirs.
//
// Puis (le même jour) : « améliore le manchot et le panda ». Surtout noirs,
// ils restaient noirs une fois recoloriés, à peine teintés — et en coloriage,
// rien à colorier. Une grande surface noire — le corps du manchot, les pattes
// du panda — n'est pas un trait : elle prend la couleur, bordée d'un trait.
// Les traits, les rayures du zèbre et les petites taches — un œil, un nez, les
// oreilles du panda — restent noirs : c'est à eux qu'on reconnaît l'animal.
// Mesuré sur la banque, en pixels sur 500 : un trait a 3 à 5 de
// demi-épaisseur, une rayure du zèbre jusqu'à 11, le corps du manchot 39.

/** Un point plus sombre que ce seuil (luminance de 0 à 255) et presque sans couleur est un trait. */
export const SEUIL_DU_TRAIT = 50;
/** L'écart entre la plus forte et la plus faible des trois couleurs d'un point : au-delà, il a une couleur, ce n'est pas un trait. */
export const ECART_DU_TRAIT = 50;
/** Plus épaisse que deux fois ceci (en part du côté de l'image : 12 pixels sur 500), une zone sombre n'est plus un trait. */
export const DEMI_EPAISSEUR_D_UNE_SURFACE = 0.024;
/** Le trait qui borde une surface sombre devenue couleur : 6 pixels sur 500, comme les autres. */
export const BORD_D_UNE_SURFACE = 0.012;
/** Plus petite que ceci (en part de l'image dessinée), une surface sombre reste noire : un œil, un nez, une oreille. */
export const AIRE_D_UNE_SURFACE = 0.01;
/** Le noir des traits, celui des feuilles. */
const TRAIT: [number, number, number] = [28, 34, 51];
const BLANC: [number, number, number] = [255, 255, 255];

/** Ce que devient un point du dessin. */
const TRANSPARENT = 0, EN_TRAIT = 1, EN_BLANC = 2, EN_APLAT = 3;

const luminance = (r: number, v: number, b: number) => 0.299 * r + 0.587 * v + 0.114 * b;

export function hexEnRvb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * La distance de chaque point au plus proche des points `source`, en pixels,
 * par le chanfrein 3-4 : un passage descendant, un passage montant.
 * `dehorsSource` : le dehors de l'image compte comme une source.
 */
function distances(source: Uint8Array, l: number, h: number, dehorsSource: boolean): Float32Array {
  const LOIN = 1e9, dehors = dehorsSource ? 0 : LOIN;
  const d = new Float32Array(l * h);
  for (let i = 0; i < d.length; i++) d[i] = source[i] ? 0 : LOIN;
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const i = y * l + x;
    if (d[i]) d[i] = Math.min(d[i], (x ? d[i - 1] : dehors) + 3, (y ? d[i - l] : dehors) + 3,
      (x && y ? d[i - l - 1] : dehors) + 4, (y && x < l - 1 ? d[i - l + 1] : dehors) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = l - 1; x >= 0; x--) {
    const i = y * l + x;
    if (d[i]) d[i] = Math.min(d[i], (x < l - 1 ? d[i + 1] : dehors) + 3, (y < h - 1 ? d[i + l] : dehors) + 3,
      (x < l - 1 && y < h - 1 ? d[i + l + 1] : dehors) + 4, (y < h - 1 && x ? d[i + l - 1] : dehors) + 4);
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/**
 * Les points des grandes surfaces sombres, qui prennent la couleur ; null
 * s'il n'y en a pas. Leurs cœurs sont les points sombres loin du clair — un
 * trait n'en a pas — ; on garde les grands, et la surface est ce qui les
 * entoure, moins un bord qui reste un trait.
 */
function grandesSurfaces(sombre: Uint8Array, l: number, h: number, dessines: number): Uint8Array | null {
  const n = l * h, cote = Math.max(l, h);
  // Sur une toute petite image, aucun point n'est une surface : deux points d'épaisseur au moins, et un de bord.
  const rayon = Math.max(2, cote * DEMI_EPAISSEUR_D_UNE_SURFACE), bord = Math.max(1, cote * BORD_D_UNE_SURFACE);
  const clair = new Uint8Array(n);
  for (let i = 0; i < n; i++) clair[i] = sombre[i] ? 0 : 1;
  const auClair = distances(clair, l, h, true);
  const vu = new Uint8Array(n), coeurs = new Uint8Array(n);
  let aucun = true;
  for (let i = 0; i < n; i++) {
    if (vu[i] || auClair[i] <= rayon) continue;
    const composante: number[] = [];
    const pile = [i];
    vu[i] = 1;
    while (pile.length) {
      const j = pile.pop()!;
      composante.push(j);
      const x = j % l;
      const voisin = (k: number) => { if (!vu[k] && auClair[k] > rayon) { vu[k] = 1; pile.push(k); } };
      if (x > 0) voisin(j - 1);
      if (x < l - 1) voisin(j + 1);
      if (j >= l) voisin(j - l);
      if (j + l < n) voisin(j + l);
    }
    if (composante.length < AIRE_D_UNE_SURFACE * dessines) continue;
    for (const j of composante) coeurs[j] = 1;
    aucun = false;
  }
  if (aucun) return null;
  const auCoeur = distances(coeurs, l, h, false);
  const surface = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (sombre[i] && auCoeur[i] <= rayon - bord) surface[i] = 1;
  return surface;
}

/**
 * Ce que devient chaque point du dessin — transparent, trait, blanc ou
 * aplat —, de quoi le peindre de chaque couleur sans le relire.
 */
export function masqueDuColoriage(rgba: Uint8ClampedArray, largeur: number): Uint8Array {
  const n = rgba.length / 4;
  let transparent = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) { transparent = true; break; }
  const sombre = new Uint8Array(n);
  let dessines = 0;
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 40) continue;
    dessines++;
    const r = rgba[i * 4], v = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    if (luminance(r, v, b) < SEUIL_DU_TRAIT && Math.max(r, v, b) - Math.min(r, v, b) < ECART_DU_TRAIT) sombre[i] = 1;
  }
  const surface = grandesSurfaces(sombre, largeur, Math.round(n / largeur), dessines);
  const masque = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 40) continue; // transparent : il le reste
    // Une photo, sans transparence : son fond presque blanc reste blanc, il n'est pas à colorier.
    masque[i] = sombre[i] && !surface?.[i] ? EN_TRAIT
      : !transparent && luminance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) > 235 ? EN_BLANC : EN_APLAT;
  }
  return masque;
}

/** Le dessin peint : les traits en noir, le reste en blanc — ou de la couleur `aplat` quand on le veut colorié. Rend un tableau RVBA. */
export function peindreLeMasque(masque: Uint8Array, aplat: [number, number, number] = BLANC): Uint8ClampedArray {
  const sortie = new Uint8ClampedArray(masque.length * 4);
  for (let i = 0; i < masque.length; i++) {
    if (masque[i] === TRANSPARENT) continue;
    const c = masque[i] === EN_TRAIT ? TRAIT : masque[i] === EN_BLANC ? BLANC : aplat;
    sortie[i * 4] = c[0]; sortie[i * 4 + 1] = c[1]; sortie[i * 4 + 2] = c[2]; sortie[i * 4 + 3] = 255;
  }
  return sortie;
}

/** Le dessin d'une image de `largeur` points de large, en coloriage : ses traits seuls, ou ses aplats de la couleur `aplat`. */
export const enColoriage = (rgba: Uint8ClampedArray, largeur: number, aplat?: [number, number, number]) =>
  peindreLeMasque(masqueDuColoriage(rgba, largeur), aplat);
