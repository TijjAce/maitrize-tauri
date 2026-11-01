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

/** Un point plus sombre que ce seuil (luminance de 0 à 255) et presque sans couleur est un trait. */
export const SEUIL_DU_TRAIT = 50;
/** L'écart entre la plus forte et la plus faible des trois couleurs d'un point : au-delà, il a une couleur, ce n'est pas un trait. */
export const ECART_DU_TRAIT = 50;
/** Le noir des traits, celui des feuilles. */
const TRAIT: [number, number, number] = [28, 34, 51];

const luminance = (r: number, v: number, b: number) => 0.299 * r + 0.587 * v + 0.114 * b;

export function hexEnRvb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Le dessin, point par point : les traits en noir, le reste en blanc — ou de
 * la couleur `aplat` quand on le veut colorié. Rend un nouveau tableau RVBA.
 */
export function enColoriage(rgba: Uint8ClampedArray, aplat: [number, number, number] = [255, 255, 255]): Uint8ClampedArray {
  const sortie = new Uint8ClampedArray(rgba.length);
  let transparent = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) { transparent = true; break; }
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 40) continue; // transparent : il le reste
    const l = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
    const ecart = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) - Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    // Une photo, sans transparence : son fond presque blanc reste blanc, il n'est pas à colorier.
    const couleur = l < SEUIL_DU_TRAIT && ecart < ECART_DU_TRAIT ? TRAIT : !transparent && l > 235 ? [255, 255, 255] : aplat;
    sortie[i] = couleur[0]; sortie[i + 1] = couleur[1]; sortie[i + 2] = couleur[2]; sortie[i + 3] = 255;
  }
  return sortie;
}
