// ── Le tétraèdre des émotions ──────────────────────────────────────────────
//
// Demande de l'enseignant (3 novembre 2026) : « Faire tétraèdre des émotions
// (générateur dans CAA) », avec pour exemple le tétra'aide de Bruce
// Demaugé-Bost (bdemauge.free.fr). C'est un tétraèdre de papier que l'élève
// pose sur sa table. Chacun de ses quatre sommets est un état — content,
// triste, en colère, j'ai peur ; ou bien tout va bien, je travaille avec
// quelqu'un, j'ai une question qui peut attendre, j'ai besoin d'aide tout de
// suite —, et le sommet tourné vers le haut dit où en est l'élève.
// L'enseignant le voit de loin, à sa couleur ; l'élève le dit sans parler.
//
// Chaque face est partagée en trois zones, une autour de chacun de ses coins.
// La zone du coin V prend la couleur de l'état de V, son picto et son mot,
// écrits pour se lire quand V est en haut. Posé sur une face, le tétraèdre en
// montre trois, et chacune porte en haut la couleur et le mot du sommet levé.
//
// Le patron est le classique : un grand triangle fait de quatre petits. Celui
// du milieu a pour sommets A, B, C ; les trois autres ont pour pointe le
// quatrième sommet, D, que l'on refait en les rapprochant. Trois languettes,
// une par arête à coller. Le patron tient sur une page A4 à l'italienne, aussi
// grand qu'elle le permet ; la légende, les consignes de montage et la mention
// des pictos se logent dans les coins que le triangle laisse libres.
//
// Rien n'est repris du tétra'aide, ni le dessin ni les phrases : tout est
// dessiné et écrit pour Maitrize, et l'idée est citée sous le « ? ».

import { escapeHtml } from "./print";
import { attributionPour, feuille } from "./cartesImprimables";
import { PAGE_PAYSAGE, cleImage, normaliserPicto, type Images, type PictoPose } from "./supportsVisuels";

// ── Les états ─────────────────────────────────────────────────────────────

/** Les couleurs des sommets, celles des feutres de la classe : la légende dit leur nom, pour colorier la version en noir et blanc. */
export const COULEURS_TETRAEDRE = [
  { nom: "jaune", hex: "#fcc419" },
  { nom: "orange", hex: "#fd7e14" },
  { nom: "rouge", hex: "#d63031" },
  { nom: "rose", hex: "#f06595" },
  { nom: "violet", hex: "#9c36b5" },
  { nom: "bleu", hex: "#1971c2" },
  { nom: "turquoise", hex: "#0b7285" },
  { nom: "vert", hex: "#2f9e44" },
  { nom: "marron", hex: "#a0522d" },
  { nom: "gris", hex: "#adb5bd" },
  { nom: "noir", hex: "#343a40" },
] as const;
export type NomCouleur = (typeof COULEURS_TETRAEDRE)[number]["nom"];

export const hexDe = (nom: NomCouleur): string => COULEURS_TETRAEDRE.find((c) => c.nom === nom)?.hex ?? "#adb5bd";

/** L'encre des feuilles : un presque noir. */
const ENCRE = "#1c2233";

/** La luminance relative d'une couleur (WCAG), de 0 pour le noir à 1 pour le blanc. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}

/** L'encre qui se lit le mieux sur un fond : le blanc, ou le presque noir des feuilles. */
export const encreSur = (fond: string): string => (contraste(fond, "#ffffff") > contraste(fond, ENCRE) ? "#ffffff" : ENCRE);

/** Un état : ce que dit un sommet quand il est en haut — sa couleur, son picto, son mot. */
export interface EtatDuSommet { couleur: NomCouleur; picto: PictoPose; mot: string }

export const MODELES_TETRAEDRE = ["emotions", "ouJenSuis"] as const;
export type ModeleTetraedre = (typeof MODELES_TETRAEDRE)[number];

/**
 * Les deux modèles. Leurs pictos sont ceux d'ARASAAC, choisis dans la
 * banque : les visages ronds de la même série pour les émotions, dessinés
 * pareil ; le pouce levé, le travail à deux, le point d'interrogation et
 * l'appel à l'aide pour l'autre. Les couleurs suivent les usages des
 * classes — la joie en jaune, la colère en rouge, la peur en violet ; le
 * vert pour ce qui va, le rouge pour ce qui presse.
 */
export const LES_MODELES: Record<ModeleTetraedre, { nom: string; titre: string; usage: string; etats: EtatDuSommet[] }> = {
  emotions: {
    nom: "Les émotions", titre: "Le tétraèdre des émotions", usage: "comment je me sens",
    etats: [
      { couleur: "jaune", picto: { id: 35547, mot: "content" }, mot: "content" },
      { couleur: "bleu", picto: { id: 35545, mot: "triste" }, mot: "triste" },
      { couleur: "rouge", picto: { id: 35539, mot: "en colère" }, mot: "en colère" },
      { couleur: "violet", picto: { id: 35535, mot: "effrayé" }, mot: "j'ai peur" },
    ],
  },
  ouJenSuis: {
    nom: "Où j'en suis", titre: "Le tétraèdre «\u00a0Où j'en suis\u00a0»", usage: "où j'en suis",
    etats: [
      { couleur: "vert", picto: { id: 5397, mot: "bien" }, mot: "tout va bien" },
      { couleur: "bleu", picto: { id: 33050, mot: "travail en équipe" }, mot: "je travaille avec quelqu'un" },
      { couleur: "jaune", picto: { id: 7217, mot: "question" }, mot: "j'ai une question qui peut attendre" },
      { couleur: "rouge", picto: { id: 19524, mot: "aide" }, mot: "j'ai besoin d'aide tout de suite" },
    ],
  },
};

/** Les quatre états d'un modèle, neufs : rien n'est partagé avec le modèle. */
export const etatsDuModele = (m: ModeleTetraedre): EtatDuSommet[] => LES_MODELES[m].etats.map((e) => ({ ...e, picto: { ...e.picto } }));

export interface ReglagesTetraedre {
  modele: ModeleTetraedre;
  /** Les quatre états de chaque modèle : on passe de l'un à l'autre sans perdre ce qu'on a changé. */
  etats: Record<ModeleTetraedre, EtatDuSommet[]>;
  /** Noir et blanc : les zones restent blanches, à colorier, et les pictos passent en gris. */
  colorier: boolean;
  capitales: boolean;
}

export const TETRAEDRE_PAR_DEFAUT: ReglagesTetraedre = {
  modele: "emotions",
  etats: { emotions: etatsDuModele("emotions"), ouJenSuis: etatsDuModele("ouJenSuis") },
  colorier: false,
  capitales: false,
};

export const titreDuTetraedre = (r: Pick<ReglagesTetraedre, "modele">) => LES_MODELES[r.modele].titre;

// Les réglages reviennent du stockage de l'ordinateur ou de l'autre poste,
// parfois d'une version plus ancienne : chaque champ est vérifié.
const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});

function etatSur(brut: unknown, neuf: EtatDuSommet): EtatDuSommet {
  const o = objet(brut);
  return {
    couleur: COULEURS_TETRAEDRE.some((c) => c.nom === o.couleur) ? o.couleur as NomCouleur : neuf.couleur,
    // Un état sans picto du tout vient d'un stockage abîmé : celui du modèle. Un picto vidé reste vide.
    picto: o.picto === undefined ? neuf.picto : normaliserPicto(o.picto),
    mot: typeof o.mot === "string" ? o.mot : neuf.mot,
  };
}

/** Les réglages enregistrés, réparés : quatre états par modèle, toujours — ceux qui manquent reprennent ceux du modèle. */
export function normaliserTetraedre(brut: unknown): ReglagesTetraedre {
  const o = objet(brut), etats = objet(o.etats);
  const lire = (m: ModeleTetraedre) => {
    const lus = Array.isArray(etats[m]) ? (etats[m] as unknown[]) : [];
    return etatsDuModele(m).map((neuf, i) => (i < lus.length ? etatSur(lus[i], neuf) : neuf));
  };
  return {
    modele: MODELES_TETRAEDRE.includes(o.modele as ModeleTetraedre) ? o.modele as ModeleTetraedre : "emotions",
    etats: { emotions: lire("emotions"), ouJenSuis: lire("ouJenSuis") },
    colorier: o.colorier === true,
    capitales: o.capitales === true,
  };
}

// ── Le patron ─────────────────────────────────────────────────────────────
//
// En millimètres, sur la page imprimée : A4 à l'italienne moins ses marges
// de 10 mm, et 4 mm de jeu pour que rien ne passe sur une seconde page. Le
// grand triangle pointe vers le haut ; ses trois coins P, Q, R sont les trois
// copies de D, et les milieux de ses bords sont A, B, C.

export interface Point { x: number; y: number }

export const PAGE_TETRAEDRE = { largeur: 277, hauteur: 186 } as const;
/** La hauteur d'une languette de collage. */
export const LANGUETTE = 8;
/** L'angle des côtés d'une languette avec son bord : moins que les 60° d'un coin, pour qu'elle tienne dans la face où elle se colle. */
export const ANGLE_LANGUETTE = 50;
const RACINE3 = Math.sqrt(3);
/** Le côté d'une face : le plus grand qui tienne en hauteur, avec la languette du bas et un millimètre pour les traits. */
export const COTE = Math.floor((PAGE_TETRAEDRE.hauteur - LANGUETTE - 1) / RACINE3);

const milieu = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const centreDe = (ps: Point[]): Point => ({ x: ps.reduce((t, p) => t + p.x, 0) / ps.length, y: ps.reduce((t, p) => t + p.y, 0) / ps.length });
const unitaire = (p: Point): Point => { const l = Math.hypot(p.x, p.y) || 1; return { x: p.x / l, y: p.y / l }; };

/** Les points du patron : P en haut, Q en bas à gauche, R en bas à droite ; A, B, C au milieu de PQ, QR, RP. */
export function pointsDuPatron(s = COTE): Record<"P" | "Q" | "R" | "A" | "B" | "C", Point> {
  const h = s * RACINE3;
  const haut = (PAGE_TETRAEDRE.hauteur - h - LANGUETTE) / 2;
  const P = { x: PAGE_TETRAEDRE.largeur / 2, y: haut };
  const Q = { x: P.x - s, y: haut + h };
  const R = { x: P.x + s, y: haut + h };
  return { P, Q, R, A: milieu(P, Q), B: milieu(Q, R), C: milieu(R, P) };
}

/** Les sommets du tétraèdre : A, B, C, ceux du triangle du milieu ; D, la pointe que refont les trois autres. */
export type Sommet = "A" | "B" | "C" | "D";
/** Le sommet de chaque état, dans l'ordre des états : le premier aux trois pointes du patron, le haut de la page compris. */
export const SOMMETS: Sommet[] = ["D", "A", "B", "C"];

export interface FaceDuPatron { coins: [Point, Point, Point]; sommets: [Sommet, Sommet, Sommet] }

export function facesDuPatron(s = COTE): FaceDuPatron[] {
  const { P, Q, R, A, B, C } = pointsDuPatron(s);
  return [
    { coins: [A, B, C], sommets: ["A", "B", "C"] },
    { coins: [P, A, C], sommets: ["D", "A", "C"] },
    { coins: [Q, B, A], sommets: ["D", "B", "A"] },
    { coins: [R, C, B], sommets: ["D", "C", "B"] },
  ];
}

/** La zone d'un coin de face : un cerf-volant — le coin, le milieu d'un bord, le centre de la face, le milieu de l'autre bord. */
export interface Zone {
  sommet: Sommet;
  face: number;
  polygone: [Point, Point, Point, Point];
  coin: Point;
  centre: Point;
  /** La rotation de son contenu, en degrés : le haut du texte regarde le coin, le bas le centre de la face. */
  angle: number;
}

/** L'angle qui tourne le bas d'un contenu vers `centre`, donc son haut vers `coin`. */
const angleVers = (coin: Point, centre: Point) => (Math.atan2(-(centre.x - coin.x), centre.y - coin.y) * 180) / Math.PI;

export function zonesDuPatron(s = COTE): Zone[] {
  return facesDuPatron(s).flatMap((f, k) => {
    const centre = centreDe(f.coins);
    return f.coins.map((coin, i): Zone => ({
      sommet: f.sommets[i],
      face: k,
      polygone: [coin, milieu(coin, f.coins[(i + 1) % 3]), centre, milieu(coin, f.coins[(i + 2) % 3])],
      coin,
      centre,
      angle: angleVers(coin, centre),
    }));
  });
}

/**
 * Les six demi-bords du grand triangle, dans l'ordre du contour : deux à
 * deux, ils refont une arête qui part de D, et l'un des deux porte la
 * languette. Elles sont sur les moitiés basses : le haut de la page reste
 * libre pour la légende et les consignes.
 */
export function demiBords(s = COTE): { de: Point; vers: Point; arete: "AD" | "BD" | "CD"; languette: boolean }[] {
  const { P, Q, R, A, B, C } = pointsDuPatron(s);
  return [
    { de: P, vers: A, arete: "AD", languette: false },
    { de: A, vers: Q, arete: "AD", languette: true },
    { de: Q, vers: B, arete: "BD", languette: false },
    { de: B, vers: R, arete: "BD", languette: true },
    { de: R, vers: C, arete: "CD", languette: true },
    { de: C, vers: P, arete: "CD", languette: false },
  ];
}

/** La languette d'un demi-bord : un trapèze tourné vers l'extérieur du patron, ses côtés à `ANGLE_LANGUETTE` du bord. */
export function languette(de: Point, vers: Point, s = COTE): { contour: [Point, Point, Point, Point]; normale: Point } {
  const d = unitaire({ x: vers.x - de.x, y: vers.y - de.y });
  const { P, Q, R } = pointsDuPatron(s);
  const centre = centreDe([P, Q, R]), m = milieu(de, vers);
  const n0 = { x: d.y, y: -d.x };
  const n = n0.x * (m.x - centre.x) + n0.y * (m.y - centre.y) >= 0 ? n0 : { x: -n0.x, y: -n0.y };
  const k = LANGUETTE / Math.tan((ANGLE_LANGUETTE * Math.PI) / 180);
  return {
    contour: [
      de,
      { x: de.x + n.x * LANGUETTE + d.x * k, y: de.y + n.y * LANGUETTE + d.y * k },
      { x: vers.x + n.x * LANGUETTE - d.x * k, y: vers.y + n.y * LANGUETTE - d.y * k },
      vers,
    ],
    normale: n,
  };
}

/** Le trait à découper — le tour du patron, languettes comprises — et les plis : le triangle du milieu et le pied des languettes. */
export function traitsDuPatron(s = COTE): { contour: Point[]; languettes: [Point, Point, Point, Point][]; plis: [Point, Point][] } {
  const { P, A, B, C } = pointsDuPatron(s);
  const contour: Point[] = [P];
  const languettes: [Point, Point, Point, Point][] = [];
  const plis: [Point, Point][] = [[A, B], [B, C], [C, A]];
  for (const b of demiBords(s)) {
    if (b.languette) {
      const l = languette(b.de, b.vers, s).contour;
      languettes.push(l);
      plis.push([b.de, b.vers]);
      contour.push(l[1], l[2]);
    }
    contour.push(b.vers);
  }
  return { contour: contour.slice(0, -1), languettes, plis };
}

// ── Mesurer un texte dessiné ──────────────────────────────────────────────
//
// Un texte de SVG ne se coupe pas tout seul : ses lignes se calculent ici,
// sur les largeurs des lettres d'Arial — la police du dessin —, en millièmes
// de la taille. Helvetica a les mêmes. Une lettre inconnue compte large,
// pour ne jamais déborder.

const MINUSCULES = "abcdefghijklmnopqrstuvwxyz";
const MAJUSCULES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SIGNES = " '’,.:;!?-«»()/…–— ";
const lettres = (chaine: string, largeurs: number[]): Record<string, number> => Object.fromEntries([...chaine].map((c, i) => [c, largeurs[i]]));
const LARGEURS: Record<"normal" | "gras", Record<string, number>> = {
  normal: {
    ...lettres(MINUSCULES, [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500]),
    ...lettres(MAJUSCULES, [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]),
    ...lettres(SIGNES, [278, 191, 222, 278, 278, 278, 278, 278, 556, 333, 556, 556, 333, 333, 278, 1000, 556, 1000, 278]),
    "œ": 944, "Œ": 1000, "æ": 889, "Æ": 1000,
  },
  gras: {
    ...lettres(MINUSCULES, [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500]),
    ...lettres(MAJUSCULES, [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]),
    ...lettres(SIGNES, [278, 238, 278, 278, 278, 333, 333, 333, 611, 333, 556, 556, 333, 333, 278, 1000, 556, 1000, 278]),
    "œ": 944, "Œ": 1000, "æ": 889, "Æ": 1000,
  },
};

/** La largeur d'un texte en Arial, en mm, à la taille `taille` (mm) ; un peu large, pour les écarts du rendu. */
export function largeurDuTexte(texte: string, taille: number, gras = false): number {
  const table = LARGEURS[gras ? "gras" : "normal"];
  let total = 0;
  for (const c of texte) total += table[c] ?? table[c.normalize("NFD")[0]] ?? (/\d/.test(c) ? 556 : 750);
  return (total * taille * 1.03) / 1000;
}

// ── Ce qu'on écrit dans une zone ──────────────────────────────────────────
//
// La zone d'un coin est un cerf-volant : pointue vers le coin, large aux
// milieux des bords, pointue vers le centre de la face. Dans son repère — le
// coin en (0, 0), le centre de la face en bas, en (0, yG) —, le mot se pose
// au plus bas qu'il peut et le picto juste au-dessus, au plus large de la
// pointe. La taille du mot est celle qui équilibre le mieux sa lisibilité et
// celle du picto. Tout reste à une marge des bords.

/** Les mesures du dessin, en part du côté d'une face. */
const MARGE = 0.012, ECART = 0.012;
const TAILLE_MIN = 0.03, TAILLE_MAX = 0.058, TAILLE_MAX_SEULE = 0.085, TAILLE_VISEE = 0.05;
const PICTO_MIN = 0.12, PICTO_MAX = 0.26, PICTO_MAX_SEUL = 0.27, PICTO_VISE = 0.22;
/** La hauteur d'une ligne, et sa ligne de base sous le haut de la ligne, en part de la taille des lettres. */
const INTERLIGNE = 1.18, BASE = 0.93;
/** Le pas des essais de place, en mm. */
const PAS = 0.2;

/** La demi-largeur utile de la zone à la hauteur y, marge déduite : deux bords à 30° de l'axe vers le coin, deux à 60° vers le centre. */
export function demiLargeur(y: number, s = COTE): number {
  const yG = s / RACINE3, marge = MARGE * s;
  return Math.max(0, Math.min(y / RACINE3 - (2 * marge) / RACINE3, (yG - y) * RACINE3 - 2 * marge));
}

/** Un carré centré sur l'axe, de `haut` à `haut + cote`, tient-il dans la zone ? La zone est convexe : ses deux bords suffisent. */
export const carreTient = (haut: number, cote: number, s = COTE) =>
  haut >= 0 && demiLargeur(haut, s) >= cote / 2 - 1e-9 && demiLargeur(haut + cote, s) >= cote / 2 - 1e-9;

export interface DispositionDeZone {
  /** Le carré du picto, dans le repère de la zone. */
  picto: { x: number; y: number; cote: number } | null;
  /** Les lignes du mot, centrées sur l'axe ; `y` est leur ligne de base. */
  lignes: { texte: string; y: number }[];
  /** La taille des lettres, en mm. */
  taille: number;
  /** Le mot est trop long : il a pris la place du picto, ou il déborde même en petit. */
  tropLong: boolean;
}

/** Les mots en lignes, de haut en bas à partir de `haut` : chaque ligne prend autant de mots que sa largeur en laisse passer ; rien s'il en reste. */
function lignesDansLaZone(mots: string[], taille: number, haut: number, s: number): { texte: string; y: number }[] | null {
  const interligne = INTERLIGNE * taille;
  const lignes: { texte: string; y: number }[] = [];
  let i = 0;
  while (i < mots.length) {
    const y1 = haut + lignes.length * interligne;
    const place = 2 * Math.min(demiLargeur(y1, s), demiLargeur(y1 + interligne, s));
    let texte = mots[i];
    if (largeurDuTexte(texte, taille, true) > place) return null;
    for (i++; i < mots.length && largeurDuTexte(`${texte} ${mots[i]}`, taille, true) <= place; i++) texte += ` ${mots[i]}`;
    lignes.push({ texte, y: y1 + BASE * taille });
  }
  return lignes;
}

/** Les hauteurs essayées, de `de` à `a`, au pas. */
const hauteurs = (de: number, a: number) => Array.from({ length: Math.max(0, Math.floor((a - de) / PAS) + 1) }, (_, k) => de + k * PAS);
/** La hauteur du milieu d'une liste de hauteurs possibles : celle qui est la plus près du milieu de la plus haute et de la plus basse. */
const auMilieu = (liste: number[]) => {
  const visee = (liste[0] + liste[liste.length - 1]) / 2;
  return liste.reduce((m, y) => (Math.abs(y - visee) < Math.abs(m - visee) ? y : m), liste[0]);
};

/** Le plus grand carré qui tienne au-dessus de `bas` : son bas en `bas` ou un peu plus haut, s'il y gagne. */
function carreAuDessus(bas: number, max: number, s: number): { x: number; y: number; cote: number } | null {
  let meilleur: { x: number; y: number; cote: number } | null = null;
  for (const b of hauteurs(Math.max(0, bas - 0.12 * s), bas).reverse()) {
    let [petit, grand] = [0, max];
    if (!carreTient(b - petit, petit, s)) continue;
    for (let k = 0; k < 24; k++) {
      const c = (petit + grand) / 2;
      if (carreTient(b - c, c, s)) petit = c; else grand = c;
    }
    if (!meilleur || petit > meilleur.cote + 0.05) meilleur = { x: -petit / 2, y: b - petit, cote: petit };
  }
  return meilleur;
}

/** Les mots d'un texte : coupés aux espaces, jamais aux espaces insécables — « : » reste avec ce qui le précède. */
const enMots = (texte: string) => texte.split(/[ \t\r\n]+/).filter(Boolean);

const deja = new Map<string, DispositionDeZone>();

/**
 * La mise en page d'une zone, la même pour les trois zones d'un sommet :
 * le picto et le mot, ou l'un des deux. Trop long pour laisser sa place au
 * picto, le mot reste seul ; trop long même seul, il déborde, en petit, et
 * l'atelier le signale.
 */
export function disposerLaZone(texte: string, avecPicto: boolean, s = COTE): DispositionDeZone {
  const cle = JSON.stringify([texte, avecPicto, s]);
  const connue = deja.get(cle);
  if (connue) return connue;
  const d = calculerLaZone(texte, avecPicto, s);
  if (deja.size > 400) deja.clear();
  deja.set(cle, d);
  return d;
}

function calculerLaZone(texte: string, avecPicto: boolean, s: number): DispositionDeZone {
  const mots = enMots(texte);
  const yG = s / RACINE3;
  const tailles = (max: number) => Array.from({ length: Math.round((max - TAILLE_MIN) * s * 10) + 1 }, (_, k) => Math.round(max * s * 10 - k) / 10);
  if (!mots.length) {
    if (!avecPicto) return { picto: null, lignes: [], taille: 0, tropLong: false };
    // Le picto seul : le plus grand carré, au milieu de ses places possibles.
    for (let cote = Math.round(PICTO_MAX_SEUL * s * 10) / 10; cote > 0; cote = Math.round((cote - 0.1) * 10) / 10) {
      const places = hauteurs(0, yG - cote).filter((y) => carreTient(y, cote, s));
      if (places.length) return { picto: { x: -cote / 2, y: auMilieu(places), cote }, lignes: [], taille: 0, tropLong: false };
    }
    return { picto: null, lignes: [], taille: 0, tropLong: false };
  }
  if (avecPicto) {
    // Pour chaque taille, le mot au plus bas, puis le plus grand picto au-dessus ; on garde le meilleur équilibre des deux.
    let meilleur: { d: DispositionDeZone; note: number } | null = null;
    for (const taille of tailles(TAILLE_MAX)) {
      const interligne = INTERLIGNE * taille;
      let bloc: { haut: number; lignes: { texte: string; y: number }[] } | null = null;
      for (const haut of hauteurs(0, yG - interligne).reverse()) {
        const lignes = lignesDansLaZone(mots, taille, haut, s);
        if (lignes) { bloc = { haut, lignes }; break; }
      }
      if (!bloc) continue;
      const picto = carreAuDessus(bloc.haut - ECART * s, PICTO_MAX * s, s);
      if (!picto || picto.cote < PICTO_MIN * s) continue;
      const note = Math.min(picto.cote / (PICTO_VISE * s), taille / (TAILLE_VISEE * s));
      if (!meilleur || note > meilleur.note + 1e-9) meilleur = { d: { picto, lignes: bloc.lignes, taille, tropLong: false }, note };
    }
    if (meilleur) return meilleur.d;
  }
  // Le mot seul — sans picto, ou trop long pour lui laisser sa place — : le plus grand, au milieu de ses places possibles.
  for (const taille of tailles(avecPicto ? TAILLE_MAX : TAILLE_MAX_SEULE)) {
    const places = hauteurs(0, yG - INTERLIGNE * taille).filter((h) => lignesDansLaZone(mots, taille, h, s));
    if (places.length) return { picto: null, lignes: lignesDansLaZone(mots, taille, auMilieu(places), s)!, taille, tropLong: avecPicto };
  }
  // Rien ne tient : la plus petite taille, au plus large de la zone ; le mot déborde.
  const taille = Math.round(TAILLE_MIN * s * 10) / 10, interligne = INTERLIGNE * taille;
  const lignes = couperEnLignes(mots.map((m) => ({ texte: m, gras: true })), taille, 2 * demiLargeur((s * RACINE3) / 4, s));
  const haut = (s * RACINE3) / 4 - (lignes.length * interligne) / 2;
  return {
    picto: null,
    lignes: lignes.map((l, i) => ({ texte: l.map((m) => m.texte).join(" "), y: haut + i * interligne + BASE * taille })),
    taille,
    tropLong: true,
  };
}

/** Les sommets dont le mot est trop long pour sa zone, par leur rang : l'atelier les signale. */
export function motsTropLongs(r: ReglagesTetraedre, images: Images): number[] {
  return r.etats[r.modele].flatMap((e, i) => (disposerLaZone(motDeLEtat(r, e), Boolean(imageDe(e, images))).tropLong ? [i] : []));
}

// ── Les blocs de texte ────────────────────────────────────────────────────

interface Morceau { texte: string; gras?: boolean; couleur?: string }

/** Des morceaux de texte en lignes de `largeur` au plus : chaque mot garde sa graisse et sa couleur ; un mot trop long a sa ligne. */
function couperEnLignes(morceaux: Morceau[], taille: number, largeur: number): Morceau[][] {
  const mots = morceaux.flatMap((m) => enMots(m.texte).map((texte) => ({ ...m, texte })));
  const lignes: Morceau[][] = [];
  let ligne: Morceau[] = [], large = 0;
  for (const m of mots) {
    const l = largeurDuTexte(m.texte, taille, m.gras);
    const espace = ligne.length ? largeurDuTexte(" ", taille, m.gras) : 0;
    if (ligne.length && large + espace + l > largeur) { lignes.push(ligne); ligne = []; large = 0; }
    large += (ligne.length ? largeurDuTexte(" ", taille, m.gras) : 0) + l;
    ligne.push(m);
  }
  if (ligne.length) lignes.push(ligne);
  return lignes;
}

const n2 = (v: number) => String(Math.round(v * 100) / 100);

/** Une ligne de morceaux, en un texte : les mots de même graisse et de même couleur vont ensemble. */
function texteDeLaLigne(ligne: Morceau[], x: number, y: number, taille: number): string {
  const groupes: Morceau[] = [];
  for (const m of ligne) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && Boolean(dernier.gras) === Boolean(m.gras) && dernier.couleur === m.couleur) dernier.texte += ` ${m.texte}`;
    else groupes.push({ ...m, texte: groupes.length ? ` ${m.texte}` : m.texte });
  }
  return `<text x="${n2(x)}" y="${n2(y)}" font-size="${n2(taille)}" fill="${ENCRE}">`
    + groupes.map((g) => `<tspan${g.gras ? ` font-weight="700"` : ""}${g.couleur ? ` fill="${g.couleur}"` : ""}>${escapeHtml(g.texte)}</tspan>`).join("")
    + `</text>`;
}

/** Un paragraphe dessiné : ses lignes, de `y` vers le bas ; sa hauteur avec. */
function paragraphe(morceaux: Morceau[], x: number, y: number, largeur: number, taille: number, interligne = 1.25): { svg: string; hauteur: number } {
  const lignes = couperEnLignes(morceaux, taille, largeur);
  return {
    svg: lignes.map((l, i) => texteDeLaLigne(l, x, y + i * interligne * taille + 0.93 * taille, taille)).join(""),
    hauteur: lignes.length * interligne * taille,
  };
}

/** Le bleu des verbes et du cadre des consignes, celui de toutes les feuilles (voir consignesStructurees). */
const BLEU_CONSIGNE = "#1d4ed8";

/** Les consignes de montage, en « Je + verbe » : une action par étape, le verbe en couleur. */
export function etapesDeMontage(colorier: boolean): { verbe: string; suite: string }[] {
  return [
    ...(colorier ? [{ verbe: "Je colorie", suite: "chaque zone de la couleur de son mot, comme sur la légende." }] : []),
    { verbe: "Je découpe", suite: "le patron en suivant le trait épais, sans couper les languettes grises." },
    { verbe: "Je plie", suite: "sur chaque pointillé, vers l'arrière\u00a0: les dessins restent dehors." },
    { verbe: "Je rapproche", suite: "les trois pointes jusqu'à ce qu'elles se touchent\u00a0: elles font le quatrième sommet." },
    { verbe: "Je colle", suite: "chaque languette à l'intérieur, sous le bord qui la touche." },
  ];
}

/** Le mot d'un état tel qu'il s'écrit. */
const motDeLEtat = (r: Pick<ReglagesTetraedre, "capitales">, e: EtatDuSommet) => (r.capitales ? e.mot.trim().toLocaleUpperCase("fr-FR") : e.mot.trim());
const imageDe = (e: EtatDuSommet, images: Images) => { const cle = cleImage(e.picto); return cle !== null ? images[cle] : undefined; };

/** Une image de picto dans son carré blanc ; en gris pour la version à colorier. */
const imagePicto = (src: string, x: number, y: number, cote: number, gris: boolean) => {
  const p = cote * 0.06;
  return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(cote)}" height="${n2(cote)}" rx="${n2(cote * 0.08)}" fill="#fff"/>`
    + `<image href="${escapeHtml(src)}" x="${n2(x + p)}" y="${n2(y + p)}" width="${n2(cote - 2 * p)}" height="${n2(cote - 2 * p)}" preserveAspectRatio="xMidYMid meet"${gris ? ` filter="url(#te-gris)"` : ""}/>`;
};

/** La légende : le titre, à quoi sert le tétraèdre, et chaque état — sa couleur et son nom, son picto, son mot. */
function blocLegende(r: ReglagesTetraedre, images: Images, x: number, y: number, largeur: number): { svg: string; hauteur: number } {
  const modele = LES_MODELES[r.modele];
  let svg = "", h = 0;
  const titre = paragraphe([{ texte: modele.titre, gras: true }], x, y, largeur, 6, 1.2);
  svg += titre.svg; h += titre.hauteur + 1.5;
  const usage = paragraphe([{ texte: `Je pose le tétraèdre sur ma table\u00a0: le sommet du haut dit ${modele.usage}.` }], x, y + h, largeur, 3.4);
  svg += usage.svg; h += usage.hauteur + 3;
  for (const e of r.etats[r.modele]) {
    const src = imageDe(e, images);
    const hex = hexDe(e.couleur);
    // Un sommet sans mot n'a que sa couleur et son picto.
    const mot = paragraphe([{ texte: motDeLEtat(r, e), gras: true }], x + 20, y + h, largeur - 20, 3.6, 1.2);
    const nom = paragraphe([{ texte: e.couleur, couleur: "#687087" }], x + 20, y + h + (mot.hauteur ? mot.hauteur + 0.3 : 0), largeur - 20, 3);
    const ligne = Math.max(10, (mot.hauteur ? mot.hauteur + 0.3 : 0) + nom.hauteur);
    svg += `<circle cx="${n2(x + 3)}" cy="${n2(y + h + 5)}" r="2.8" fill="${r.colorier ? "#fff" : hex}" stroke="${ENCRE}" stroke-width="0.3"/>`
      + (src ? imagePicto(src, x + 7.5, y + h, 10, r.colorier) : "")
      + mot.svg + nom.svg;
    h += ligne + 1.8;
  }
  return { svg, hauteur: h - 1.8 };
}

/** Les consignes de montage, dans le cadre de toutes les consignes : la barre bleue à gauche, les étapes numérotées. */
function blocConsignes(colorier: boolean, x: number, y: number, largeur: number): { svg: string; hauteur: number } {
  const taille = 3.4, barre = 1.6, marge = 2.4, rayon = 0.625 * taille;
  const gauche = x + barre + marge, texte = gauche + 2 * rayon + 1.6, droite = x + largeur - marge;
  let corps = "", h = marge;
  const titre = paragraphe([{ texte: "Pour monter le tétraèdre", gras: true }], gauche, y + h, droite - gauche, 3.8, 1.2);
  corps += titre.svg; h += titre.hauteur + 1.4;
  etapesDeMontage(colorier).forEach((etape, i) => {
    const p = paragraphe([{ texte: etape.verbe, gras: true, couleur: BLEU_CONSIGNE }, { texte: etape.suite }], texte, y + h, droite - texte, taille, 1.3);
    const cy = y + h + 0.93 * taille - 0.36 * taille;
    corps += `<circle cx="${n2(gauche + rayon)}" cy="${n2(cy)}" r="${n2(rayon)}" fill="${BLEU_CONSIGNE}"/>`
      + `<text x="${n2(gauche + rayon)}" y="${n2(cy + 0.36 * taille * 0.85)}" font-size="${n2(taille * 0.85)}" font-weight="700" text-anchor="middle" fill="#fff">${i + 1}</text>`
      + p.svg;
    h += p.hauteur + 1;
  });
  h += marge - 1;
  // Le cadre arrondi, en bleu ; le fond clair par-dessus, sauf la barre de gauche ; le filet gris autour du fond.
  const fond = `M${n2(x + barre)} ${n2(y)} H${n2(x + largeur - 2)} A2 2 0 0 1 ${n2(x + largeur)} ${n2(y + 2)} V${n2(y + h - 2)} `
    + `A2 2 0 0 1 ${n2(x + largeur - 2)} ${n2(y + h)} H${n2(x + barre)}`;
  const cadre = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(largeur)}" height="${n2(h)}" rx="2" fill="${BLEU_CONSIGNE}"/>`
    + `<path d="${fond} Z" fill="#f7f8fc"/><path d="${fond}" fill="none" stroke="#cfd4e2" stroke-width="0.3"/>`;
  return { svg: cadre + corps, hauteur: h };
}

/** La mention des images, celle qu'écrit `attributionPour`, en lignes de texte : la page est pleine, elle se dessine dans un coin. */
export function mentionsDesImages(r: ReglagesTetraedre, images: Images): string[] {
  const ids = r.etats[r.modele].map((e) => e.picto).filter((p) => !p.photo && p.id != null && images[p.id] !== undefined).map((p) => p.id);
  const entites: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };
  return attributionPour(ids).split(/<\/div>/)
    .map((m) => m.replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => entites[e]).trim())
    .filter(Boolean);
}

/** L'écart entre un bloc de texte et le grand triangle. */
const DEGAGEMENT = 6;

/** La largeur libre entre le bord de la page et le grand triangle, à la hauteur `y` : le triangle s'élargit en descendant. */
function placeLibre(y: number, s: number): number {
  const { P } = pointsDuPatron(s);
  return P.x - Math.max(0, y - P.y) / RACINE3 - DEGAGEMENT;
}

export interface Bloc { x: number; y: number; largeur: number; hauteur: number; svg: string }

/**
 * Les deux blocs de texte, chacun dans un coin du haut : à gauche la
 * légende, à droite les consignes de montage et la mention des pictos.
 * Chacun prend la plus grande largeur que lui laisse le triangle.
 */
export function blocsDeLaPage(r: ReglagesTetraedre, images: Images, s = COTE): { legende: Bloc; consignes: Bloc } {
  const enPlace = (faire: (x: number, largeur: number) => { svg: string; hauteur: number }, aDroite: boolean): Bloc => {
    let dernier: Bloc | null = null;
    for (let largeur = 104; largeur >= 50; largeur -= 2) {
      const x = aDroite ? PAGE_TETRAEDRE.largeur - largeur : 0;
      const b = faire(x, largeur);
      dernier = { x, y: 1, largeur, hauteur: b.hauteur, svg: b.svg };
      if (largeur <= placeLibre(1 + b.hauteur, s)) return dernier;
    }
    return dernier!;
  };
  const legende = enPlace((x, largeur) => blocLegende(r, images, x, 1, largeur), false);
  const consignes = enPlace((x, largeur) => {
    const cadre = blocConsignes(r.colorier, x, 1, largeur);
    const mentions = mentionsDesImages(r, images).map((m) => ({ texte: m, couleur: "#868e96" }));
    let svg = cadre.svg, h = cadre.hauteur;
    for (const m of mentions) {
      const p = paragraphe([m], x, 1 + h + 2, largeur, 2.2, 1.25);
      svg += p.svg; h += p.hauteur + 2;
    }
    return { svg, hauteur: h };
  }, true);
  return { legende, consignes };
}

// ── La page ───────────────────────────────────────────────────────────────

/** Le patron et ses blocs, en un seul dessin à l'échelle : 1 unité = 1 mm sur le papier. */
export function svgDuTetraedre(r: ReglagesTetraedre, images: Images): string {
  const s = COTE;
  const etats = r.etats[r.modele];
  const etatDe = (x: Sommet) => etats[SOMMETS.indexOf(x)];
  const points = (ps: Point[]) => ps.map((p) => `${n2(p.x)},${n2(p.y)}`).join(" ");
  const { contour, languettes, plis } = traitsDuPatron(s);
  const zones = zonesDuPatron(s);
  // Une mise en page par état : les trois zones d'un sommet ont la même, tournée vers lui.
  const dispositions = new Map(SOMMETS.map((x) => [x, disposerLaZone(motDeLEtat(r, etatDe(x)), Boolean(imageDe(etatDe(x), images)), s)]));

  const fonds = zones.map((z) => `<polygon class="te-zone" data-sommet="${z.sommet}" points="${points(z.polygone)}" fill="${r.colorier ? "#fff" : hexDe(etatDe(z.sommet).couleur)}"/>`).join("");
  // Les séparations des zones, du centre de chaque face aux milieux de ses bords : blanches sur les couleurs, grises à colorier.
  const separations = facesDuPatron(s).flatMap((f) => {
    const c = centreDe(f.coins);
    return f.coins.map((p, i) => milieu(p, f.coins[(i + 1) % 3])).map((m) => `M${n2(c.x)} ${n2(c.y)} L${n2(m.x)} ${n2(m.y)}`);
  }).join(" ");
  const contenus = zones.map((z) => {
    const e = etatDe(z.sommet), d = dispositions.get(z.sommet)!, src = imageDe(e, images);
    const encre = r.colorier ? ENCRE : encreSur(hexDe(e.couleur));
    const picto = d.picto && src ? imagePicto(src, d.picto.x, d.picto.y, d.picto.cote, r.colorier) : "";
    const mots = d.lignes.map((l) => `<text x="0" y="${n2(l.y)}" font-size="${n2(d.taille)}" font-weight="700" text-anchor="middle" fill="${encre}">${escapeHtml(l.texte)}</text>`).join("");
    return picto || mots ? `<g transform="translate(${n2(z.coin.x)} ${n2(z.coin.y)}) rotate(${n2(z.angle)})">${picto}${mots}</g>` : "";
  }).join("");
  const traitsDePli = plis.map(([a, b]) => `M${n2(a.x)} ${n2(a.y)} L${n2(b.x)} ${n2(b.y)}`).join(" ");
  // « colle », écrit dans chaque languette, le long de son bord.
  const colles = languettes.map((l) => {
    const c = centreDe(l), n = unitaire({ x: c.x - milieu(l[0], l[3]).x, y: c.y - milieu(l[0], l[3]).y });
    const angle = (Math.atan2(-n.x, n.y) * 180) / Math.PI;
    return `<text transform="translate(${n2(c.x)} ${n2(c.y)}) rotate(${n2(angle)})" y="1" font-size="3" text-anchor="middle" fill="#868e96">colle</text>`;
  }).join("");
  const { legende, consignes } = blocsDeLaPage(r, images, s);
  const { largeur, hauteur } = PAGE_TETRAEDRE;
  return `<svg class="te-page" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}mm" height="${hauteur}mm" `
    + `font-family="Arial, Helvetica, sans-serif" role="img" aria-label="${escapeHtml(`Patron : ${titreDuTetraedre(r).toLowerCase()}`)}">`
    + `<defs><filter id="te-gris"><feColorMatrix type="saturate" values="0"/></filter></defs>`
    + languettes.map((l) => `<polygon points="${points(l)}" fill="#e9ecef"/>`).join("")
    + fonds
    + `<path d="${separations}" stroke="${r.colorier ? "#868e96" : "#fff"}" stroke-width="${r.colorier ? 0.3 : 0.5}" fill="none"/>`
    + contenus
    // Les plis : des pointillés sombres sur un trait blanc, visibles sur toutes les couleurs.
    + (r.colorier ? "" : `<path d="${traitsDePli}" stroke="#fff" stroke-width="0.7" fill="none"/>`)
    + `<path d="${traitsDePli}" stroke="${ENCRE}" stroke-width="0.4" stroke-dasharray="2.2 1.6" fill="none"/>`
    + colles
    + `<polygon points="${points(contour)}" fill="none" stroke="${ENCRE}" stroke-width="0.55" stroke-linejoin="round"/>`
    + legende.svg + consignes.svg
    + `</svg>`;
}

/** La feuille : le dessin, sous sa racine, prêt à imprimer. */
export const htmlTetraedre = (r: ReglagesTetraedre, images: Images): string =>
  feuille(svgDuTetraedre(r, images), `te${r.colorier ? " te-colorier" : ""}`);

/** Une page A4 à l'italienne, ses marges de 10 mm ; le dessin a sa taille en mm. */
export const STYLE_TETRAEDRE = `${PAGE_PAYSAGE}
  .feuille.te .te-page { display: block; margin: 0 auto; }
`;
