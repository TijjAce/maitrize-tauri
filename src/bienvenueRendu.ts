// ── La page de bienvenue : son dessin ─────────────────────────────────────
//
// Une feuille blanche réglée comme un cahier, une soie de couleur qui coule doucement
// par-dessus, et des lettres de verre qui les dévient, comme de vrais tubes (voir
// bienvenue.ts). Tout est dessiné par la carte graphique (WebGL), sans image :
// net à toutes les tailles de fenêtre, et rien à télécharger.
//
// Les lettres sont en Marelle, la cursive du ministère. On les dessine une fois
// sur une toile cachée ; on les floute, et ce flou devient un relief : son
// sommet suit le trait, ses pentes donnent la façon dont chaque point du verre
// dévie le fond et prend la lumière. Un flou se lit bien à basse résolution :
// le relief n'a pas besoin d'autant de points que l'écran, et le bord des
// lettres reste net.

/** Une ligne du titre : où elle s'écrit, et quand (part de l'écriture, de 0 à 1). */
export interface LigneEcrite { texte: string; x: number; base: number; largeur: number; debut: number; fin: number }

export interface MiseEnPage {
  /** La taille des lettres, en pixels de la fenêtre. */
  taille: number;
  lignes: LigneEcrite[];
  /** Le cadre du titre et de ses ombres, dans la fenêtre. */
  boite: { x: number; y: number; l: number; h: number };
  /** Le bas des lettres : le crédit s'écrit en dessous. */
  bas: number;
  /** La réglure du cahier : une ligne d'écriture, et l'écart entre deux lignes (la hauteur des petites lettres). */
  reglure: { base: number; pas: number };
}

// Marelle pose ses petites lettres sur 0,48 de sa taille, ses boucles et ses majuscules montent à 1,44, ses jambages
// descendent à 0,96 (voir policesEcriture.ts).
const MONTE = 1.44, DESCEND = 0.96, PETITES_LETTRES = 0.48;

/**
 * Où écrire le titre dans une fenêtre : centré, sur une ligne si la fenêtre est assez large pour que les lettres
 * restent grandes, sinon sur deux. `mesure` donne la largeur d'un texte, en part de la taille des lettres.
 */
export function miseEnPage(largeur: number, hauteur: number, titre: [string, string], mesure: (texte: string) => number): MiseEnPage {
  const entier = `${titre[0]} ${titre[1]}`;
  const parLargeur = 0.8 * largeur;
  const parHauteur = 0.56 * hauteur;
  const surUne = Math.min(parLargeur / mesure(entier), parHauteur / (MONTE + DESCEND));
  // Quatre lignes du cahier d'une ligne d'écriture à l'autre : les boucles de la seconde ne touchent pas la première.
  const interligne = 4 * PETITES_LETTRES;
  const surDeux = Math.min(parLargeur / Math.max(mesure(titre[0]), mesure(titre[1])), parHauteur / (MONTE + interligne + DESCEND));
  // Deux lignes seulement si elles grandissent nettement : une seule tient mieux dans le regard.
  const deuxLignes = surDeux > 1.3 * surUne;
  const taille = Math.round(deuxLignes ? surDeux : surUne);
  const textes = deuxLignes ? titre : [entier];
  const centre = 0.43 * hauteur;
  // Le milieu des petites lettres de la ligne (ou de l'ensemble) tombe sur le centre visé.
  const premiereBase = centre + (PETITES_LETTRES / 2) * taille - (deuxLignes ? (interligne / 2) * taille : 0);
  const part = 1 / textes.length;
  const lignes: LigneEcrite[] = textes.map((texte, i) => {
    const l = mesure(texte) * taille;
    return {
      texte, largeur: l, x: (largeur - l) / 2, base: premiereBase + i * interligne * taille,
      // Les deux lignes se chevauchent un peu : la seconde commence quand la première finit de s'écrire.
      debut: Math.max(0, i * part - (i ? 0.06 : 0)), fin: (i + 1) * part,
    };
  });
  const marge = Math.ceil(0.32 * taille);
  const x = Math.max(0, Math.floor(Math.min(...lignes.map((l) => l.x)) - marge));
  const haut = Math.max(0, Math.floor(lignes[0].base - MONTE * taille - marge));
  const bas = lignes[lignes.length - 1].base + DESCEND * taille;
  const droite = Math.min(largeur, Math.ceil(Math.max(...lignes.map((l) => l.x + l.largeur)) + marge));
  return {
    taille, lignes, boite: { x, y: haut, l: droite - x, h: Math.min(hauteur, Math.ceil(bas + marge)) - haut }, bas,
    reglure: { base: premiereBase, pas: PETITES_LETTRES * taille },
  };
}

export interface TexteCuit {
  mp: MiseEnPage;
  relief: { l: number; h: number; rgba: Uint8Array };
  ombre: { l: number; h: number; rgba: Uint8Array };
  /** Le rayon du tube de verre, dans la fenêtre. */
  rayon: number;
}

/** Un flou en trois passages de boîte : presque gaussien, et sa durée ne dépend pas de sa largeur. */
function flouter(src: Float32Array, l: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  const largeur = 2 * r + 1;
  let a = src.slice(), b = new Float32Array(src.length);
  const ligne = (de: Float32Array, vers: Float32Array, n: number, depart: number, pas: number) => {
    let somme = 0;
    for (let i = -r; i <= r; i++) somme += de[depart + Math.min(n - 1, Math.max(0, i)) * pas];
    for (let i = 0; i < n; i++) {
      vers[depart + i * pas] = somme / largeur;
      somme += de[depart + Math.min(n - 1, i + r + 1) * pas] - de[depart + Math.max(0, i - r) * pas];
    }
  };
  for (let passe = 0; passe < 3; passe++) {
    for (let y = 0; y < h; y++) ligne(a, b, l, y * l, 1);
    [a, b] = [b, a];
    for (let x = 0; x < l; x++) ligne(a, b, h, x, l);
    [a, b] = [b, a];
  }
  return a;
}

/** Le seuil où s'arrête le verre, sur le relief : plus il est bas, plus le tube est large. */
export const SEUIL_DU_VERRE = 0.27;

/**
 * Le relief du titre : pour chaque point, les deux pentes du verre (R, G), la hauteur du flou (B), et quand ce point
 * s'écrit (A) ; et une ombre plus floue, à plus basse résolution.
 */
export function cuireLeTexte(mp: MiseEnPage, famille: string, echelle: number): TexteCuit {
  const l = Math.max(4, Math.ceil(mp.boite.l * echelle)), h = Math.max(4, Math.ceil(mp.boite.h * echelle));
  const toile = document.createElement("canvas");
  toile.width = l;
  toile.height = h;
  const ctx = toile.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("toile 2D indisponible");
  ctx.font = `${mp.taille * echelle}px "${famille}"`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  for (const li of mp.lignes) ctx.fillText(li.texte, (li.x - mp.boite.x) * echelle, (li.base - mp.boite.y) * echelle);
  const pixels = ctx.getImageData(0, 0, l, h).data;
  const encre = new Float32Array(l * h);
  for (let i = 0; i < encre.length; i++) encre[i] = pixels[i * 4 + 3] / 255;

  const sigma = 0.021 * mp.taille * echelle;
  const flou = flouter(encre, l, h, sigma);
  // Le sommet d'un trait droit : les croisements montent plus haut, on les écrête.
  const surLEncre: number[] = [];
  for (let i = 0; i < flou.length; i += 3) if (encre[i] > 0.9) surLEncre.push(flou[i]);
  surLEncre.sort((a, b) => a - b);
  const sommet = surLEncre[Math.floor(surLEncre.length * 0.8)] || 1;

  const hauteur = new Float32Array(l * h);
  for (let i = 0; i < flou.length; i++) hauteur[i] = Math.min(1, flou[i] / sommet);

  // Quand chaque point s'écrit : de gauche à droite, ligne après ligne, un peu en biais comme la main qui avance.
  const frontiere = mp.lignes.length > 1 ? (mp.lignes[0].base + 0.3 * mp.taille - mp.boite.y) * echelle : Infinity;
  const quand = (x: number, y: number): number => {
    const li = y < frontiere ? mp.lignes[0] : mp.lignes[mp.lignes.length - 1];
    const dx = (x / echelle + mp.boite.x - li.x + 0.22 * (li.base - mp.boite.y - y / echelle)) / li.largeur;
    return li.debut + (li.fin - li.debut) * Math.min(1, Math.max(0, dx));
  };

  const rayon = 0.058 * mp.taille;
  const rayonIci = rayon * echelle;
  const rgba = new Uint8Array(l * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const i = y * l + x;
      const gx = (hauteur[y * l + Math.min(l - 1, x + 1)] - hauteur[y * l + Math.max(0, x - 1)]) / 2;
      const gy = (hauteur[Math.min(h - 1, y + 1) * l + x] - hauteur[Math.max(0, y - 1) * l + x]) / 2;
      const t = Math.min(1, Math.max(0, (hauteur[i] - SEUIL_DU_VERRE) / (1 - SEUIL_DU_VERRE)));
      let nx: number, ny: number;
      if (t <= 0) {
        // Hors du verre : la pente tournée vers l'extérieur, pour que le bord se lise sans à-coup.
        const g = Math.hypot(gx, gy) || 1;
        nx = -gx / g; ny = -gy / g;
      } else {
        // La section d'un tube : un demi-cercle, dont la pente grandit vers le bord.
        const haut = Math.max(0.1, Math.sqrt(t * (2 - t)));
        const pente = ((1 - t) / haut / (1 - SEUIL_DU_VERRE)) * rayonIci;
        const px = -gx * pente, py = -gy * pente;
        const n = Math.hypot(px, py, 1);
        nx = px / n; ny = py / n;
      }
      const o = i * 4;
      rgba[o] = Math.round((nx * 0.5 + 0.5) * 255);
      rgba[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      rgba[o + 2] = Math.round(hauteur[i] * 255);
      rgba[o + 3] = Math.round(quand(x, y) * 0.94 * 255);
    }
  }

  // L'ombre : quatre fois moins de points, bien plus floue.
  const lo = Math.max(2, Math.floor(l / 4)), ho = Math.max(2, Math.floor(h / 4));
  const petit = new Float32Array(lo * ho);
  for (let y = 0; y < ho; y++) for (let x = 0; x < lo; x++) petit[y * lo + x] = hauteur[Math.min(h - 1, y * 4) * l + Math.min(l - 1, x * 4)];
  const flouOmbre = flouter(petit, lo, ho, (0.042 * mp.taille * echelle) / 4);
  const ombre = new Uint8Array(lo * ho * 4);
  for (let y = 0; y < ho; y++) {
    for (let x = 0; x < lo; x++) {
      const o = (y * lo + x) * 4;
      ombre[o] = Math.round(Math.min(1, flouOmbre[y * lo + x] * 2.1) * 255);
      ombre[o + 3] = Math.round(quand(x * 4, y * 4) * 0.94 * 255);
    }
  }
  return { mp, relief: { l, h, rgba }, ombre: { l: lo, h: ho, rgba: ombre }, rayon };
}

type Rvb = [number, number, number];

/** Les couleurs de la page : la soie, du plus clair au plus foncé, le verre des lettres, et les textes autour. */
export interface Palette {
  blanc: Rvb; nacre: Rvb; poudre: Rvb; teinte: Rvb; vif: Rvb; fonce: Rvb;
  /** Ce que l'ombre des lettres laisse passer. */
  ombre: Rvb;
  /** Le fil de lumière du bord de la soie, et sa clarté. */
  fil: Rvb; clarteDuFil: Rvb;
  /** Le corps du verre sur un fond foncé, sur un fond clair ; son bord de même ; la lueur au creux du tube. */
  verreSurFonce: Rvb; verreSurClair: Rvb; filtre: Rvb; bordSurFonce: Rvb; bordSurClair: Rvb; creux: Rvb;
  /** Le fond avant la première image, le crédit, la signature. */
  page: string; credit: string; signature: string;
  /** L'écriture aux couleurs des bandes du Z, de haut en bas : elles remplacent le corps et le bord du verre. */
  bandes?: Rvb[];
  /** Les lignes du cahier, si la soie est trop claire pour les tracer de sa couleur. */
  ligne?: Rvb;
}

/** « En rose et blanc », puis « un mauve », puis « orange pour voir » (l'enseignant, 6 novembre 2026). */
export const PALETTES = {
  rose: {
    blanc: [1.0, 0.994, 0.997], nacre: [0.998, 0.950, 0.970], poudre: [0.992, 0.860, 0.915], teinte: [0.972, 0.640, 0.780], vif: [0.925, 0.285, 0.600], fonce: [0.760, 0.120, 0.430],
    ombre: [0.80, 0.56, 0.70], fil: [1.0, 0.93, 0.97], clarteDuFil: [1.0, 0.82, 0.90],
    verreSurFonce: [1.0, 0.86, 0.92], verreSurClair: [0.965, 0.47, 0.68], filtre: [1.0, 0.90, 0.95], bordSurFonce: [1.0, 0.95, 0.975], bordSurClair: [0.76, 0.10, 0.42], creux: [1.0, 0.80, 0.90],
    page: "#fff6fa", credit: "#7d2350", signature: "#c2185b",
  },
  mauve: {
    blanc: [0.998, 0.996, 1.0], nacre: [0.970, 0.950, 0.998], poudre: [0.880, 0.825, 0.985], teinte: [0.735, 0.620, 0.950], vif: [0.520, 0.310, 0.860], fonce: [0.360, 0.150, 0.640],
    ombre: [0.70, 0.60, 0.86], fil: [0.96, 0.93, 1.0], clarteDuFil: [0.86, 0.80, 1.0],
    verreSurFonce: [0.91, 0.87, 1.0], verreSurClair: [0.62, 0.44, 0.93], filtre: [0.93, 0.90, 1.0], bordSurFonce: [0.97, 0.95, 1.0], bordSurClair: [0.33, 0.13, 0.62], creux: [0.86, 0.78, 1.0],
    page: "#faf8ff", credit: "#452a78", signature: "#5b2fb0",
  },
  orange: {
    blanc: [1.0, 0.997, 0.990], nacre: [1.0, 0.960, 0.905], poudre: [0.998, 0.870, 0.730], teinte: [0.990, 0.690, 0.420], vif: [0.950, 0.450, 0.110], fonce: [0.740, 0.270, 0.040],
    ombre: [0.90, 0.70, 0.52], fil: [1.0, 0.96, 0.90], clarteDuFil: [1.0, 0.85, 0.66],
    verreSurFonce: [1.0, 0.92, 0.82], verreSurClair: [0.975, 0.56, 0.19], filtre: [1.0, 0.93, 0.86], bordSurFonce: [1.0, 0.97, 0.93], bordSurClair: [0.68, 0.24, 0.02], creux: [1.0, 0.85, 0.66],
    page: "#fffaf4", credit: "#6e3a12", signature: "#b4500f",
  },
  lagon: {
    blanc: [0.995, 1.0, 0.998], nacre: [0.930, 0.985, 0.975], poudre: [0.780, 0.945, 0.925], teinte: [0.450, 0.850, 0.820], vif: [0.050, 0.620, 0.660], fonce: [0.020, 0.400, 0.470],
    ombre: [0.58, 0.80, 0.80], fil: [0.92, 1.0, 0.99], clarteDuFil: [0.70, 0.96, 0.94],
    verreSurFonce: [0.86, 0.98, 0.97], verreSurClair: [0.16, 0.68, 0.70], filtre: [0.88, 0.98, 0.97], bordSurFonce: [0.95, 1.0, 0.99], bordSurClair: [0.02, 0.36, 0.42], creux: [0.72, 0.96, 0.94],
    page: "#f4fdfb", credit: "#0d4a50", signature: "#0b7078",
  },
  sauge: {
    blanc: [0.998, 1.0, 0.990], nacre: [0.945, 0.980, 0.925], poudre: [0.830, 0.930, 0.780], teinte: [0.600, 0.820, 0.540], vif: [0.280, 0.620, 0.300], fonce: [0.120, 0.420, 0.200],
    ombre: [0.70, 0.82, 0.62], fil: [0.95, 1.0, 0.92], clarteDuFil: [0.80, 0.95, 0.72],
    verreSurFonce: [0.90, 0.98, 0.86], verreSurClair: [0.36, 0.68, 0.33], filtre: [0.92, 0.98, 0.88], bordSurFonce: [0.96, 1.0, 0.94], bordSurClair: [0.10, 0.36, 0.14], creux: [0.80, 0.95, 0.72],
    page: "#f7fcf3", credit: "#22492a", signature: "#2f7a3c",
  },
  ciel: {
    blanc: [0.995, 0.998, 1.0], nacre: [0.930, 0.965, 1.0], poudre: [0.780, 0.890, 0.995], teinte: [0.500, 0.740, 0.980], vif: [0.130, 0.460, 0.920], fonce: [0.060, 0.270, 0.700],
    ombre: [0.62, 0.74, 0.92], fil: [0.92, 0.97, 1.0], clarteDuFil: [0.72, 0.86, 1.0],
    verreSurFonce: [0.86, 0.93, 1.0], verreSurClair: [0.24, 0.55, 0.95], filtre: [0.88, 0.94, 1.0], bordSurFonce: [0.95, 0.98, 1.0], bordSurClair: [0.05, 0.24, 0.66], creux: [0.74, 0.87, 1.0],
    page: "#f5f9ff", credit: "#173a7a", signature: "#1f5fc4",
  },
  corail: {
    blanc: [1.0, 0.995, 0.990], nacre: [1.0, 0.945, 0.925], poudre: [0.995, 0.830, 0.780], teinte: [0.980, 0.620, 0.540], vif: [0.930, 0.340, 0.300], fonce: [0.720, 0.160, 0.180],
    ombre: [0.90, 0.64, 0.60], fil: [1.0, 0.95, 0.92], clarteDuFil: [1.0, 0.80, 0.74],
    verreSurFonce: [1.0, 0.90, 0.87], verreSurClair: [0.95, 0.47, 0.40], filtre: [1.0, 0.92, 0.89], bordSurFonce: [1.0, 0.96, 0.95], bordSurClair: [0.66, 0.14, 0.14], creux: [1.0, 0.80, 0.74],
    page: "#fff7f4", credit: "#6e2420", signature: "#b83a33",
  },
  miel: {
    blanc: [1.0, 0.998, 0.985], nacre: [1.0, 0.975, 0.870], poudre: [0.995, 0.920, 0.680], teinte: [0.980, 0.820, 0.380], vif: [0.930, 0.660, 0.080], fonce: [0.700, 0.450, 0.020],
    ombre: [0.90, 0.78, 0.50], fil: [1.0, 0.98, 0.88], clarteDuFil: [1.0, 0.92, 0.62],
    verreSurFonce: [1.0, 0.96, 0.80], verreSurClair: [0.93, 0.67, 0.12], filtre: [1.0, 0.96, 0.82], bordSurFonce: [1.0, 0.99, 0.92], bordSurClair: [0.62, 0.38, 0.0], creux: [1.0, 0.92, 0.62],
    page: "#fffcf0", credit: "#5f4208", signature: "#a36f06",
  },
  // La soie du miel, l'écriture violette : la couleur complémentaire. Le filtre retient le jaune, sinon le verre tourne au gris.
  mielViolet: {
    blanc: [1.0, 0.998, 0.985], nacre: [1.0, 0.975, 0.870], poudre: [0.995, 0.920, 0.680], teinte: [0.980, 0.820, 0.380], vif: [0.930, 0.660, 0.080], fonce: [0.700, 0.450, 0.020],
    ombre: [0.72, 0.58, 0.66], fil: [1.0, 0.98, 0.88], clarteDuFil: [1.0, 0.92, 0.62],
    verreSurFonce: [0.50, 0.24, 0.86], verreSurClair: [0.40, 0.14, 0.78], filtre: [0.62, 0.42, 0.98], bordSurFonce: [0.78, 0.66, 1.0], bordSurClair: [0.24, 0.06, 0.50], creux: [0.80, 0.68, 1.0],
    page: "#fffcf0", credit: "#3a2266", signature: "#5a2ca8",
  },
  ardoise: {
    blanc: [0.998, 0.998, 0.998], nacre: [0.945, 0.955, 0.965], poudre: [0.840, 0.865, 0.890], teinte: [0.660, 0.710, 0.760], vif: [0.360, 0.430, 0.510], fonce: [0.200, 0.260, 0.330],
    ombre: [0.72, 0.75, 0.79], fil: [0.95, 0.97, 0.99], clarteDuFil: [0.80, 0.85, 0.90],
    verreSurFonce: [0.90, 0.92, 0.95], verreSurClair: [0.45, 0.52, 0.60], filtre: [0.92, 0.94, 0.96], bordSurFonce: [0.97, 0.98, 0.99], bordSurClair: [0.16, 0.21, 0.28], creux: [0.80, 0.85, 0.90],
    page: "#f8f9fa", credit: "#2b3540", signature: "#46586b",
  },
  // Le logo, mesuré sur son icône : le crème du fond, et les bandes du Z, de l'orange au vert puis au bleu.
  logo: {
    blanc: [0.965, 0.942, 0.875], nacre: [0.945, 0.918, 0.835], poudre: [0.827, 0.702, 0.290], teinte: [0.431, 0.651, 0.286], vif: [0.235, 0.478, 0.714], fonce: [0.204, 0.451, 0.235],
    ombre: [0.62, 0.56, 0.40], fil: [1.0, 0.97, 0.88], clarteDuFil: [0.95, 0.85, 0.60],
    verreSurFonce: [0.99, 0.95, 0.82], verreSurClair: [0.827, 0.553, 0.220], filtre: [1.0, 0.96, 0.86], bordSurFonce: [1.0, 0.98, 0.90], bordSurClair: [0.62, 0.34, 0.08], creux: [0.98, 0.88, 0.62],
    page: "#f1ead5", credit: "#4a3d22", signature: "#8a5a22",
  },
  // Plusieurs teintes dans la même soie : le couchant réunit l'orange, le rose et le mauve ; la boréale, le vert et le bleu.
  couchant: {
    blanc: [1.0, 0.995, 0.985], nacre: [1.0, 0.955, 0.905], poudre: [0.995, 0.800, 0.620], teinte: [0.975, 0.560, 0.500], vif: [0.610, 0.240, 0.730], fonce: [0.400, 0.140, 0.600],
    ombre: [0.88, 0.62, 0.62], fil: [1.0, 0.95, 0.90], clarteDuFil: [1.0, 0.80, 0.70],
    verreSurFonce: [1.0, 0.90, 0.85], verreSurClair: [0.955, 0.430, 0.430], filtre: [1.0, 0.92, 0.90], bordSurFonce: [1.0, 0.96, 0.94], bordSurClair: [0.62, 0.14, 0.36], creux: [1.0, 0.82, 0.74],
    page: "#fff8f2", credit: "#5f1f3f", signature: "#b02a66",
  },
  boreale: {
    blanc: [0.995, 1.0, 0.998], nacre: [0.935, 0.990, 0.975], poudre: [0.700, 0.960, 0.850], teinte: [0.300, 0.820, 0.770], vif: [0.260, 0.330, 0.880], fonce: [0.310, 0.160, 0.660],
    ombre: [0.58, 0.80, 0.80], fil: [0.92, 1.0, 0.98], clarteDuFil: [0.70, 0.96, 0.92],
    verreSurFonce: [0.86, 0.98, 0.96], verreSurClair: [0.12, 0.62, 0.68], filtre: [0.88, 0.98, 0.97], bordSurFonce: [0.95, 1.0, 0.99], bordSurClair: [0.03, 0.30, 0.42], creux: [0.72, 0.96, 0.94],
    page: "#f4fdfa", credit: "#0f3f52", signature: "#0f6f86",
  },
  // L'écriture aux bandes du Z, de l'orange au bleu, sur un bleu très clair et le papier crème.
  bandesBleu: {
    blanc: [0.992, 0.984, 0.955], nacre: [0.982, 0.970, 0.930], poudre: [0.89, 0.94, 0.98], teinte: [0.78, 0.88, 0.96], vif: [0.62, 0.79, 0.93], fonce: [0.50, 0.70, 0.88],
    ombre: [0.70, 0.68, 0.68], fil: [1.0, 0.98, 0.92], clarteDuFil: [0.95, 0.88, 0.70], ligne: [0.52, 0.71, 0.87],
    verreSurFonce: [0.235, 0.478, 0.714], verreSurClair: [0.235, 0.478, 0.714], filtre: [0.45, 0.45, 0.45], bordSurFonce: [0.235, 0.478, 0.714], bordSurClair: [0.235, 0.478, 0.714], creux: [1.0, 0.96, 0.86],
    bandes: [[0.90, 0.50, 0.12], [0.86, 0.66, 0.16], [0.62, 0.70, 0.16], [0.24, 0.60, 0.24], [0.10, 0.50, 0.58], [0.12, 0.38, 0.78]],
    page: "#faf6ea", credit: "#1d3a5f", signature: "#23589a",
  },
} satisfies Record<string, Palette>;

/** Celle de la page ; le nom suffit pour en changer. */
export const PALETTE: Palette = PALETTES.bandesBleu;

const enGlsl = ([r, v, b]: Rvb) => `vec3(${r.toFixed(3)}, ${v.toFixed(3)}, ${b.toFixed(3)})`;

/** La couleur de l'écriture selon sa hauteur dans le titre : une bande après l'autre, fondues. */
const bandesEnGlsl = (bandes: Rvb[]) => {
  const pas = 0.82 / (bandes.length - 1);
  return bandes.slice(1).reduce((avant, couleur, i) => {
    const debut = 0.10 + i * pas;
    return `mix(${avant}, ${enGlsl(couleur)}, smoothstep(${debut.toFixed(3)}, ${(debut + pas).toFixed(3)}, ici.y))`;
  }, enGlsl(bandes[0]));
};

const SOMMETS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENTS = `
precision highp float;
varying vec2 vUv;
uniform float uT, uA, uPx, uEcriture, uAvecTexte;
uniform vec4 uBoite;
uniform vec2 uRayon, uReglure;
uniform sampler2D uRelief, uOmbre;

const vec3 BLANC = ${enGlsl(PALETTE.blanc)};
const vec3 NACRE = ${enGlsl(PALETTE.nacre)};
const vec3 POUDRE = ${enGlsl(PALETTE.poudre)};
const vec3 TEINTE = ${enGlsl(PALETTE.teinte)};
const vec3 VIF = ${enGlsl(PALETTE.vif)};
const vec3 FONCE = ${enGlsl(PALETTE.fonce)};

float cloche(float x, float centre, float largeur) { float d = (x - centre) / largeur; return exp(-d * d); }

// Le bord de la soie : une grande courbe, du bas à gauche vers le haut à droite, qui ondule à peine.
float courbe(float x, float t) { return 1.02 - 1.28 * x + 0.055 * sin(x * 4.1 + 0.4 + t * 0.14); }
float pente(float x, float t) { return -1.28 + 0.2255 * cos(x * 4.1 + 0.4 + t * 0.14); }

// net : le fil de lumière du bord et les lignes du cahier ; sans eux pour ce qu'on voit à travers le verre, qui serait haché.
vec3 fond(vec2 uv, float t, float net) {
  // Des ondes qui se déforment les unes les autres.
  vec2 q = vec2(uv.x * uA, uv.y);
  q += 0.050 * vec2(sin(q.y * 4.3 + t * 0.21 + 1.0), cos(q.x * 3.1 - t * 0.16));
  q += 0.024 * vec2(sin(q.y * 9.1 - t * 0.29 + 4.0), cos(q.x * 7.3 + t * 0.24 + 2.0));
  float x = q.x / uA, y = q.y;
  float d = (y - courbe(x, t)) / sqrt(1.0 + pente(x, t) * pente(x, t));

  // Au-dessus : la feuille blanche, à peine nacrée, et la clarté que la soie y laisse à son pied.
  vec3 haut = mix(BLANC, NACRE, 0.75 * smoothstep(0.0, 0.5, y + 0.07 * sin(x * 5.0 + t * 0.2)));
  float pied = smoothstep(0.72, 0.12, x);
  haut = mix(haut, POUDRE, 0.95 * smoothstep(0.26, 0.08, -d + 0.02 * sin(x * 13.0 + t * 0.4)) * pied);
  haut = mix(haut, TEINTE, 0.85 * smoothstep(0.10, 0.0, -d) * pied);

  // Dessous : des nappes de soie qui suivent son bord.
  float s = d + 0.035 * sin(x * 6.0 - t * 0.2 + 1.0);
  vec3 bas = TEINTE;
  float versLeHaut = smoothstep(0.32, 0.72, x);
  float bande = 0.5 + 0.5 * sin(s * 34.0 + 2.4 * sin(x * 4.6 + t * 0.2) + t * 0.26);
  float pres = smoothstep(0.30, 0.015, s);
  bas = mix(bas, mix(NACRE, BLANC, bande), pres * versLeHaut * (0.40 + 0.60 * bande));
  bas = mix(bas, VIF, 0.78 * cloche(s, 0.36, 0.17));
  bas = mix(bas, FONCE, 0.14 * cloche(s, 0.38, 0.07));
  float lueur = exp(-pow((x - 0.80) / 0.33, 2.0) - pow((y - 0.62) / 0.21, 2.0));
  bas = mix(bas, POUDRE, 0.86 * lueur);
  bas = mix(bas, POUDRE, 0.5 * smoothstep(0.06, 0.0, s) * (1.0 - versLeHaut));
  float nappe = y + 0.20 * sin(x * 4.6 + 0.7 + t * 0.1);
  bas = mix(bas, BLANC, 0.94 * smoothstep(0.93, 1.2, nappe));

  float bord = mix(0.008, uPx, net);
  vec3 col = mix(haut, bas, smoothstep(-bord, bord, d));
  if (net > 0.5) {
    // Les lignes du cahier, droites, sur la feuille seulement : la ligne d'écriture plus marquée, comme les grands carreaux.
    float k = (uv.y - uReglure.x) / uReglure.y;
    float loin = abs(fract(k + 0.5) - 0.5) * uReglure.y;
    float rang = mod(floor(k + 0.5), 4.0);
    float trait = smoothstep(uPx * 1.6, 0.0, loin) * (rang < 0.5 ? 0.62 : 0.30);
    col = mix(col, ${enGlsl(PALETTE.ligne ?? PALETTE.teinte)}, trait * uAvecTexte * smoothstep(0.012, 0.0, d));
    // Le fil de lumière du bord, et la clarté qu'il laisse dans la soie.
    float fil = max(uPx * 1.1, 0.0011);
    col += ${enGlsl(PALETTE.fil)} * 0.75 * exp(-d * d / (fil * fil));
    col += ${enGlsl(PALETTE.clarteDuFil)} * 0.16 * exp(-abs(d) / 0.012) * step(0.0, d);
  }
  return min(col, vec3(1.0));
}

float hasard(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 col = fond(uv, uT, 1.0);
  if (uAvecTexte > 0.5) {
    vec2 ici = (uv - uBoite.xy) / uBoite.zw;
    if (ici.x > 0.0 && ici.x < 1.0 && ici.y > 0.0 && ici.y < 1.0) {
      const float VAGUE = 0.06;
      // L'ombre des lettres, de la couleur de la soie.
      vec4 o = texture2D(uOmbre, ici - vec2(0.0, 0.016));
      col *= mix(vec3(1.0), ${enGlsl(PALETTE.ombre)}, o.r * clamp((uEcriture - o.a) / VAGUE, 0.0, 1.0));

      vec4 r = texture2D(uRelief, ici);
      float venue = clamp((uEcriture - r.a) / VAGUE, 0.0, 1.0);
      if (venue > 0.0) {
        // Le trait naît fin, et s'arrondit.
        float seuil = mix(0.86, ${SEUIL_DU_VERRE.toFixed(3)}, venue * venue * (3.0 - 2.0 * venue));
        float bord = DERIVEE;
        float a = smoothstep(seuil - bord, seuil + bord, r.b);
        if (a > 0.0) {
          vec2 nxy = r.rg * 2.0 - 1.0;
          float nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
          vec3 n = vec3(nxy.x, -nxy.y, nz);
          // Le verre dévie ce qu'il y a derrière.
          vec3 devie = fond(uv + nxy * uRayon * 3.2, uT, 0.0);
          float bordure = pow(1.0 - nz, 2.2);
          // Le corps du verre, teinté. Son bord foncé sur le clair, clair sur le foncé, comme une vraie vitre.
          float clarte = dot(devie, vec3(0.3, 0.45, 0.25));
          float surLeClair = smoothstep(0.55, 0.85, clarte);
          vec3 teinte = ${PALETTE.bandes ? bandesEnGlsl(PALETTE.bandes) : `mix(${enGlsl(PALETTE.verreSurFonce)}, ${enGlsl(PALETTE.verreSurClair)}, surLeClair)`};
          vec3 verre = mix(devie * ${enGlsl(PALETTE.filtre)}, teinte, ${PALETTE.bandes ? "0.84" : "mix(0.72, 0.62, surLeClair)"});
          vec3 cercle = ${PALETTE.bandes ? "teinte * 0.6" : `mix(${enGlsl(PALETTE.bordSurFonce)}, ${enGlsl(PALETTE.bordSurClair)}, surLeClair)`};
          verre = mix(verre, cercle, 0.82 * bordure);
          // La lumière : un reflet vif en haut à gauche, une lueur au creux du bas.
          float vif = pow(max(dot(n, normalize(vec3(-0.34, 0.58, 0.74))), 0.0), 46.0);
          float creux = pow(max(dot(n, normalize(vec3(0.20, -0.72, 0.66))), 0.0), 14.0);
          verre += vec3(1.0) * 0.95 * vif + ${enGlsl(PALETTE.creux)} * 0.26 * creux;
          col = mix(col, min(verre, vec3(1.0)), a);
        }
      }
    }
  }
  // Un grain imperceptible, pour que les dégradés ne fassent pas de marches.
  col += (hasard(gl_FragCoord.xy + fract(uT) * 91.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface Rendu {
  /** Dessine une image : `temps` en secondes, `ecriture` de 0 à 1,06. */
  dessiner(temps: number, ecriture: number): void;
  /** Attend que la carte graphique ait fini : la première image est la plus longue (elle prépare tout). */
  finir(): void;
  /** Pose le titre, une fois la police chargée. */
  poserLeTexte(t: TexteCuit): void;
  /** Suit la taille de la fenêtre. */
  ajuster(largeur: number, hauteur: number): void;
  liberer(): void;
}

/** Combien de points dessiner : ceux de l'écran, sans dépasser ce qu'une petite carte graphique tient à l'aise. */
export function densite(largeur: number, hauteur: number, ratio: number, plafond = 4_500_000): number {
  const voulu = Math.min(2, Math.max(1, ratio || 1));
  return Math.min(voulu, Math.sqrt(plafond / Math.max(1, largeur * hauteur)));
}

/** Le dessin, s'il y a de quoi : rien sans WebGL, et la page garde son dégradé. */
export function creerRendu(toile: HTMLCanvasElement): Rendu | null {
  const gl = toile.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const derivees = !!gl.getExtension("OES_standard_derivatives");
  const entete = derivees ? "#extension GL_OES_standard_derivatives : enable\n" : "";
  const source = entete + FRAGMENTS.replace("DERIVEE", derivees ? "max(fwidth(r.b) * 0.75, 0.002)" : "0.02");
  const nuanceur = (genre: number, texte: string) => {
    const n = gl.createShader(genre);
    if (!n) return null;
    gl.shaderSource(n, texte);
    gl.compileShader(n);
    if (!gl.getShaderParameter(n, gl.COMPILE_STATUS)) {
      console.warn("bienvenue :", gl.getShaderInfoLog(n));
      return null;
    }
    return n;
  };
  const vs = nuanceur(gl.VERTEX_SHADER, SOMMETS), fs = nuanceur(gl.FRAGMENT_SHADER, source);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("bienvenue :", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  const tampon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = (nom: string) => gl.getUniformLocation(prog, nom);
  const uT = u("uT"), uA = u("uA"), uPx = u("uPx"), uEcriture = u("uEcriture"), uAvecTexte = u("uAvecTexte");
  const uBoite = u("uBoite"), uRayon = u("uRayon"), uReglure = u("uReglure");
  gl.uniform1i(u("uRelief"), 0);
  gl.uniform1i(u("uOmbre"), 1);
  gl.uniform1f(uAvecTexte, 0);

  const poserTexture = (unite: number, image: { l: number; h: number; rgba: Uint8Array }) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unite);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.l, image.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.rgba);
  };

  let largeur = 1, hauteur = 1;
  let texte: TexteCuit | null = null;
  const poserLaBoite = () => {
    if (!texte) return;
    const b = texte.mp.boite;
    gl.uniform4f(uBoite, b.x / largeur, b.y / hauteur, b.l / largeur, b.h / hauteur);
    gl.uniform2f(uRayon, texte.rayon / largeur, texte.rayon / hauteur);
    gl.uniform2f(uReglure, texte.mp.reglure.base / hauteur, texte.mp.reglure.pas / hauteur);
  };
  return {
    ajuster(l, h) {
      largeur = l;
      hauteur = h;
      const d = densite(l, h, window.devicePixelRatio);
      toile.width = Math.round(l * d);
      toile.height = Math.round(h * d);
      gl.viewport(0, 0, toile.width, toile.height);
      gl.uniform1f(uA, l / Math.max(1, h));
      gl.uniform1f(uPx, 1 / Math.max(1, toile.height));
      poserLaBoite();
    },
    poserLeTexte(t) {
      texte = t;
      poserTexture(0, t.relief);
      poserTexture(1, t.ombre);
      gl.uniform1f(uAvecTexte, 1);
      poserLaBoite();
    },
    dessiner(temps, ecriture) {
      gl.uniform1f(uT, temps);
      gl.uniform1f(uEcriture, ecriture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    finir() { gl.finish(); },
    liberer() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
