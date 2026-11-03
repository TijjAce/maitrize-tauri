// ── Le Visibiléo : les pièces pour construire, avec la classe, la trace d'un récit ──
//
// Demande de l'enseignant (3 novembre 2026) : « ajoute des créateurs de
// Visibiléo dans les générateurs ». Le Visibiléo est une trace collective
// d'un récit, construite avec les élèves, qui rend visible ce qu'il faut
// comprendre — l'implicite compris — et comment cela se tient : des cadres
// pour ce qui se passe, des nuages pour ce que pensent et veulent les
// personnages — leurs mobiles, que le texte ne dit pas —, des bulles pour ce
// qu'ils disent, des flèches rouges pour les causes, des flèches bleues pour
// l'ordre des événements. On le pose d'abord dans l'ordre du récit, puis
// selon les liens ; on le relit de la conséquence vers la cause. Il a été
// conçu par Marie-France Bishop et Laure Dappe, avec une équipe d'enseignantes
// et de conseillères pédagogiques (université de Cergy ; IFÉ, Centre
// Alain-Savary, 2018), et s'emploie de la grande section au cycle 3, en ULIS
// et en IME, avec des photos et des pictogrammes.
//
// Les décisions se prennent en classe : ce qui est important, ce qu'on
// représente, où va chaque pièce. Maitrize ne fabrique donc pas un Visibiléo
// tout fait, mais ses pièces, à découper et à plastifier — on les pose au
// tableau avec des aimants ou de la pâte à fixe, on écrit au feutre effaçable
// dans les vierges —, le mémo des signes de la classe, et la fiche qui prépare
// la séance. Rien n'est repris des documents de l'IFÉ, dont les droits sont
// réservés : les pièces, le mémo et la fiche sont dessinés et écrits pour
// Maitrize.
//
// Puis (même jour) : « il faudrait pouvoir mettre le tapuscrit et elle se
// construit toute seule avec l'IA, et depuis le téléphone je puisse lui
// envoyer le texte ». Le texte se colle, ou se photographie page à page avec
// le compagnon (le QR code de Fabriquer) et se lit ; Mistral en tire un
// premier jet — personnages, cadres, nuages, bulles —, que l'enseignant
// relit avant de préparer sa séance.

import { escapeHtml } from "./print";
import { attributionPour, feuille } from "./cartesImprimables";
import { cleImage, estVide, normaliserPicto, type Images, type PictoPose } from "./supportsVisuels";

export type Genre = "cadre" | "nuage" | "bulle";
export const GENRES: Genre[] = ["cadre", "nuage", "bulle"];

/** `id` : ce à quoi s'accrochent sa place sur l'affiche et ses flèches. */
export interface Personnage { id: string; nom: string; image: PictoPose; couleur: string }

export interface Piece {
  id: string;
  genre: Genre;
  texte: string;
  image: PictoPose;
  /** Le personnage qui pense ou qui parle, par son rang ; -1 : aucun. */
  qui: number;
  /** Pour une étape (un cadre) : les personnages qui y agissent, par leur rang — leurs pastilles se greffent sur son bord. */
  acteurs: number[];
  /** Pour un nuage ou une bulle : l'étape où cela se passe, par son identifiant ; « » : aucune. */
  etape: string;
}

/** Les mots du mémo : ceux de la classe, qui construit son codage avec l'enseignant. */
export type Signe = Genre | "rouge" | "bleue";

export interface ReglagesVisibileo {
  titre: string;
  /** Le texte de l'histoire, le tapuscrit : collé, ou lu sur les pages photographiées. */
  texte: string;
  personnages: Personnage[];
  pieces: Piece[];
  /** Les pièces vierges en plus, pour ce que la classe décidera : les cadres en tout, les nuages et les bulles par personnage. */
  vierges: Record<Genre, number>;
  /** Les flèches à découper : rouges, les causes ; bleues, l'ordre des événements. */
  fleches: { rouges: number; bleues: number };
  libelles: Record<Signe, string>;
  /** Les feuilles qui s'impriment. */
  feuilles: { pieces: boolean; memo: boolean; preparation: boolean };
  /** Les images sur les pièces. */
  images: boolean;
  /** Les mots sur les pièces : sans eux, l'image seule, pour qui ne lit pas encore. */
  mots: boolean;
  capitales: boolean;
  /** Deux pièces par ligne, ou une seule, plus grande, pour le tableau de la classe. */
  grandes: boolean;
  /** L'affiche : les places qu'on a données aux pièces, et les flèches qui les relient. */
  affichage: Affichage;
}

// ── L'affichage ───────────────────────────────────────────────────────────
//
// « Il faut également pouvoir avoir une visualisation de l'affichage, avec des
// flèches qui peuvent être courbes » (l'enseignant, 3 novembre 2026). Les
// pièces se posent sur l'affiche — une page A3 à l'italienne, en millimètres —,
// se déplacent et s'agrandissent ; une flèche relie deux pièces, rouge pour une
// cause (« parce que » : de ce qui arrive vers ce qui l'explique), bleue pour
// l'ordre (« et puis »), droite ou courbée à la main. Ce qu'on n'a pas encore
// placé prend une place rangée : les personnages à gauche, les étapes dans
// l'ordre du récit, et au-dessus de chacune ce qu'on y pense et ce qu'on y dit.

export const AFFICHE = { largeur: 400, hauteur: 277 } as const;
export const PLACE_MIN = { largeur: 30, hauteur: 20 } as const;
export const FLECHES_AFFICHE_MAX = 60;

/** Une place sur l'affiche, en millimètres depuis son coin haut gauche. */
export interface Place { x: number; y: number; largeur: number; hauteur: number }
export type CouleurFleche = "rouge" | "bleue";
export interface Fleche {
  de: string;
  vers: string;
  couleur: CouleurFleche;
  /** 0 : droite ; sinon, son milieu tiré sur le côté, en part de sa longueur — positif à gauche du trait, négatif à droite. */
  courbe: number;
}
export interface Affichage { places: Record<string, Place>; fleches: Fleche[] }

export const PERSONNAGES_MAX = 6;
export const PIECES_MAX = 30;
export const VIERGES_MAX = 12;
export const FLECHES_MAX = 16;

/** Les couleurs des personnages : franches et distinctes — ni le rouge ni le bleu, qui sont ceux des flèches. */
export const COULEURS: { nom: string; hex: string }[] = [
  { nom: "orange", hex: "#e8590c" }, { nom: "vert", hex: "#2f9e44" }, { nom: "violet", hex: "#9c36b5" },
  { nom: "turquoise", hex: "#0c8599" }, { nom: "rose", hex: "#c2255c" }, { nom: "brun", hex: "#a0522d" },
];
export const ROUGE = "#e03131";
export const BLEU = "#1971c2";
/** Une pensée ou une parole qu'on n'attribue à personne. */
const NEUTRE = "#495057";

export const couleurDuPersonnage = (i: number) => COULEURS[i % COULEURS.length].hex;

export const LIBELLES: Record<Signe, string> = {
  cadre: "Ce qui se passe",
  nuage: "Ce qu'il pense, ce qu'il veut",
  bulle: "Ce qu'il dit",
  rouge: "parce que",
  bleue: "et puis",
};

export const personnageVide = (i: number, id = `p${i + 1}`): Personnage => ({ id, nom: "", image: { id: null, mot: "" }, couleur: couleurDuPersonnage(i) });
export const pieceVide = (genre: Genre, qui = -1, id = ""): Piece => ({ id, genre, texte: "", image: { id: null, mot: "" }, qui, acteurs: [], etape: "" });

/** Un identifiant que personne ne porte encore : « p3 » pour un personnage, « q12 » pour une pièce. */
export function idLibre(r: Pick<ReglagesVisibileo, "personnages" | "pieces">, prefixe: "p" | "q"): string {
  const pris = new Set([...r.personnages.map((p) => p.id), ...r.pieces.map((p) => p.id)]);
  let n = 1;
  while (pris.has(`${prefixe}${n}`)) n++;
  return `${prefixe}${n}`;
}

export const REGLAGES_VISIBILEO: ReglagesVisibileo = {
  titre: "",
  texte: "",
  personnages: [personnageVide(0), personnageVide(1)],
  pieces: [],
  vierges: { cadre: 4, nuage: 2, bulle: 1 },
  fleches: { rouges: 6, bleues: 4 },
  libelles: { ...LIBELLES },
  feuilles: { pieces: true, memo: true, preparation: true },
  images: true,
  mots: true,
  capitales: false,
  grandes: false,
  affichage: { places: {}, fleches: [] },
};

// ── Les réglages ──────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;
const nombre = (v: unknown, max: number, defaut: number) =>
  (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : defaut);
const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
const dixieme = (v: number) => Math.round(v * 10) / 10;

/** Une place telle qu'on peut s'y fier : sur l'affiche, pas plus petite que permis ; rien si elle est illisible. */
export function placeSure(v: unknown): Place | undefined {
  const o = objet(v);
  const [x, y, l, h] = [o.x, o.y, o.largeur, o.hauteur].map((n) => (typeof n === "number" && Number.isFinite(n) ? n : NaN));
  if ([x, y, l, h].some(Number.isNaN)) return undefined;
  const largeur = Math.min(AFFICHE.largeur, Math.max(PLACE_MIN.largeur, l)), hauteur = Math.min(AFFICHE.hauteur, Math.max(PLACE_MIN.hauteur, h));
  return {
    x: dixieme(Math.min(AFFICHE.largeur - largeur, Math.max(0, x))), y: dixieme(Math.min(AFFICHE.hauteur - hauteur, Math.max(0, y))),
    largeur: dixieme(largeur), hauteur: dixieme(hauteur),
  };
}

/** Des identifiants uniques : celui qu'on a gardé s'il est libre, sinon le premier libre du préfixe. */
function avecDesIds<T extends { id: string }>(liste: Omit<T, "id">[], ids: unknown[], prefixe: string, pris: Set<string>): T[] {
  return liste.map((x, i) => {
    let id = typeof ids[i] === "string" && /^[a-z]\d{1,4}$/.test(ids[i] as string) ? ids[i] as string : "";
    if (!id || pris.has(id)) { let n = 1; while (pris.has(`${prefixe}${n}`)) n++; id = `${prefixe}${n}`; }
    pris.add(id);
    return { ...x, id } as T;
  });
}

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesVisibileo>): ReglagesVisibileo {
  const pris = new Set<string>();
  const bruts = Array.isArray(brut.personnages) ? brut.personnages.slice(0, PERSONNAGES_MAX) : null;
  const personnages = bruts
    ? avecDesIds<Personnage>(bruts.map((p, i) => {
      const o = objet(p);
      return {
        nom: typeof o.nom === "string" ? o.nom : "",
        image: normaliserPicto(o.image),
        couleur: typeof o.couleur === "string" && HEX.test(o.couleur) ? o.couleur : couleurDuPersonnage(i),
      };
    }), bruts.map((p) => objet(p).id), "p", pris)
    : REGLAGES_VISIBILEO.personnages.map((p) => { pris.add(p.id); return p; });
  const piecesBrutes = (Array.isArray(brut.pieces) ? brut.pieces.slice(0, PIECES_MAX) : []).map(objet).filter((o) => GENRES.includes(o.genre as Genre));
  const rang = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < personnages.length;
  const avantEtapes = avecDesIds<Piece>(piecesBrutes.map((o) => {
    const cadre = o.genre === "cadre";
    return {
      genre: o.genre as Genre, texte: typeof o.texte === "string" ? o.texte : "", image: normaliserPicto(o.image), qui: rang(o.qui) ? o.qui : -1,
      acteurs: cadre && Array.isArray(o.acteurs) ? [...new Set(o.acteurs.filter(rang))] : [],
      etape: !cadre && typeof o.etape === "string" ? o.etape : "",
    };
  }), piecesBrutes.map((o) => o.id), "q", pris);
  // L'étape d'un nuage ou d'une bulle est un cadre qui existe encore.
  const cadres = new Set(avantEtapes.filter((x) => x.genre === "cadre").map((x) => x.id));
  const pieces = avantEtapes.map((x) => (x.etape && !cadres.has(x.etape) ? { ...x, etape: "" } : x));
  // L'affiche : les places et les flèches de ce qui existe encore.
  const a = objet(brut.affichage);
  const places = Object.fromEntries(Object.entries(objet(a.places)).flatMap(([id, x]): [string, Place][] => {
    const place = pris.has(id) ? placeSure(x) : undefined;
    return place ? [[id, place]] : [];
  }));
  const flechesDeLAffiche = (Array.isArray(a.fleches) ? a.fleches : []).flatMap((x): Fleche[] => {
    const o = objet(x);
    if (typeof o.de !== "string" || typeof o.vers !== "string" || o.de === o.vers || !pris.has(o.de) || !pris.has(o.vers)) return [];
    const courbe = typeof o.courbe === "number" && Number.isFinite(o.courbe) ? Math.round(Math.max(-1.5, Math.min(1.5, o.courbe)) * 100) / 100 : 0;
    return [{ de: o.de, vers: o.vers, couleur: o.couleur === "bleue" ? "bleue" : "rouge", courbe }];
  }).slice(0, FLECHES_AFFICHE_MAX);
  const v = objet(brut.vierges), f = objet(brut.fleches), l = objet(brut.libelles), fe = objet(brut.feuilles);
  return {
    titre: typeof brut.titre === "string" ? brut.titre : "",
    texte: typeof brut.texte === "string" ? brut.texte : "",
    personnages,
    pieces,
    vierges: {
      cadre: nombre(v.cadre, VIERGES_MAX, REGLAGES_VISIBILEO.vierges.cadre),
      nuage: nombre(v.nuage, VIERGES_MAX, REGLAGES_VISIBILEO.vierges.nuage),
      bulle: nombre(v.bulle, VIERGES_MAX, REGLAGES_VISIBILEO.vierges.bulle),
    },
    fleches: { rouges: nombre(f.rouges, FLECHES_MAX, REGLAGES_VISIBILEO.fleches.rouges), bleues: nombre(f.bleues, FLECHES_MAX, REGLAGES_VISIBILEO.fleches.bleues) },
    libelles: Object.fromEntries((Object.keys(LIBELLES) as Signe[])
      .map((k) => [k, typeof l[k] === "string" && (l[k] as string).trim() ? l[k] as string : LIBELLES[k]])) as Record<Signe, string>,
    feuilles: { pieces: fe.pieces !== false, memo: fe.memo !== false, preparation: fe.preparation !== false },
    images: brut.images !== false,
    mots: brut.mots !== false,
    capitales: brut.capitales === true,
    grandes: brut.grandes === true,
    affichage: { places, fleches: flechesDeLAffiche },
  };
}

/** Un personnage qui s'imprime : il a un nom ou une image. */
const estNomme = (p: Personnage) => Boolean(p.nom.trim() || !estVide(p.image));
/** Une pièce qui s'imprime : elle a un texte ou une image. */
const estPleine = (p: Piece) => Boolean(p.texte.trim() || !estVide(p.image));

export const personnagesNommes = (r: Pick<ReglagesVisibileo, "personnages">) => r.personnages.filter(estNomme);

export function cequiManque(r: ReglagesVisibileo): string | null {
  if (!r.feuilles.pieces && !r.feuilles.memo && !r.feuilles.preparation) return "Cochez au moins une feuille à imprimer.";
  if (!r.titre.trim() && !r.pieces.some(estPleine) && !personnagesNommes(r).length) return "Écrivez le titre de l'histoire, ses personnages ou ses pièces.";
  return null;
}

/** Les images à charger : celles des personnages et des pièces. */
export function idsDesImages(r: ReglagesVisibileo): (number | string)[] {
  const cles = [...r.personnages.map((p) => p.image), ...r.pieces.map((p) => p.image)].map(cleImage).filter((k): k is number | string => k !== null);
  return [...new Set(cles)];
}

// ── Les formes ────────────────────────────────────────────────────────────
//
// Le nuage et la bulle sont dessinés en SVG, étirés à la taille de la pièce ;
// leur trait garde son épaisseur (`vector-effect`). Le texte et l'image se
// posent par-dessus, dans la part intérieure de la forme.

const NUAGE = "M40 96 A20 20 0 0 1 26 60 A24 24 0 0 1 62 32 A30 30 0 0 1 120 24 A26 26 0 0 1 166 46 A22 22 0 0 1 176 88 "
  + "A20 20 0 0 1 144 102 A26 26 0 0 1 98 106 A24 24 0 0 1 60 102 A16 16 0 0 1 40 96 Z";
const BULLE = "M16 6 H184 A12 12 0 0 1 196 18 V84 A12 12 0 0 1 184 96 H74 L46 120 L52 96 H16 A12 12 0 0 1 4 84 V18 A12 12 0 0 1 16 6 Z";

/** La bulle sans sa queue : sur l'affiche, la queue se dessine vers qui parle (voir `svgDesQueues`). */
const BULLE_SEULE = "M16 6 H184 A12 12 0 0 1 196 18 V104 A12 12 0 0 1 184 116 H16 A12 12 0 0 1 4 104 V18 A12 12 0 0 1 16 6 Z";

const forme = (genre: "nuage" | "bulle", couleur: string, sansQueue = false) => genre === "nuage"
  ? `<svg class="vb-forme" viewBox="0 0 200 128" preserveAspectRatio="none" aria-hidden="true"><path d="${NUAGE}" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
    + (sansQueue ? "" : `<circle cx="30" cy="112" r="7" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
      + `<circle cx="14" cy="123" r="4" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/>`) + `</svg>`
  : `<svg class="vb-forme" viewBox="0 0 200 122" preserveAspectRatio="none" aria-hidden="true"><path d="${sansQueue ? BULLE_SEULE : BULLE}" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;

/** Une flèche, de la longueur voulue : son trait et sa pointe, de sa couleur. */
const fleche = (couleur: string, longue: boolean) =>
  `<div class="vb-piece vb-fleche${longue ? " vb-longue" : ""}"><svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">`
  + `<path d="M6 20 H166" stroke="${couleur}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M160 4 L196 20 L160 36 Z" fill="${couleur}"/></svg></div>`;

const imageDe = (p: PictoPose, images: Images) => {
  const cle = cleImage(p);
  return cle !== null ? images[cle] : undefined;
};

/** Ce qu'une pièce montre : son image, ses mots — ou l'un des deux. Une pièce vierge reste vide, pour le feutre. */
function contenu(r: ReglagesVisibileo, texte: string, image: PictoPose, images: Images, guillemets = false): string {
  const src = r.images ? imageDe(image, images) : undefined;
  const mots = r.mots || !src ? texte.trim() : "";
  return (src ? `<img src="${src}" alt="${escapeHtml(image.mot || texte)}">` : "")
    + (mots ? `<span class="vb-texte">${escapeHtml(guillemets ? `« ${mots} »` : mots)}</span>` : "");
}

const couleurDe = (r: ReglagesVisibileo, qui: number) => (qui >= 0 && r.personnages[qui] ? r.personnages[qui].couleur : NEUTRE);

function piece(r: ReglagesVisibileo, p: Piece, images: Images, sansQueue = false): string {
  const c = couleurDe(r, p.qui);
  const dedans = contenu(r, p.texte, p.image, images, p.genre === "bulle");
  if (p.genre === "cadre") return `<div class="vb-piece vb-cadre"><div class="vb-dedans">${dedans}</div></div>`;
  return `<div class="vb-piece vb-${p.genre}${sansQueue ? " vb-sans-queue" : ""}">${forme(p.genre, c, sansQueue)}<div class="vb-dedans">${dedans}</div></div>`;
}

/** La carte d'un personnage : son image et son nom, dans un cadre de sa couleur. */
function carteDuPersonnage(r: ReglagesVisibileo, p: Personnage, images: Images): string {
  const src = r.images ? imageDe(p.image, images) : undefined;
  return `<div class="vb-piece vb-personnage" style="--c:${p.couleur}">${src ? `<img src="${src}" alt="">` : ""}<span class="vb-texte">${escapeHtml(p.nom.trim())}</span></div>`;
}

const section = (titre: string, corps: string) => (corps ? `<section class="vb-section"><h3>${escapeHtml(titre)}</h3><div class="vb-grille">${corps}</div></section>` : "");

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Les pièces à découper et à plastifier : les personnages, les cadres, les nuages, les bulles, les vierges, les flèches. */
export function htmlPieces(r: ReglagesVisibileo, images: Images): string {
  const nommes = r.personnages.map((p, i) => ({ p, i })).filter(({ p }) => estNomme(p));
  const pleines = r.pieces.filter(estPleine);
  const persos = nommes.map(({ p }) => carteDuPersonnage(r, p, images)).join("");
  const deGenre = (g: Genre) => pleines.filter((p) => p.genre === g).map((p) => piece(r, p, images)).join("");
  // Les vierges : des cadres en tout ; des nuages et des bulles pour chaque personnage, à sa couleur — sinon sans couleur.
  const pour = nommes.length ? nommes.map(({ i }) => i) : [-1];
  const vierges = [
    ...Array.from({ length: r.vierges.cadre }, () => piece(r, pieceVide("cadre"), images)),
    ...pour.flatMap((i) => Array.from({ length: r.vierges.nuage }, () => piece(r, pieceVide("nuage", i), images))),
    ...pour.flatMap((i) => Array.from({ length: r.vierges.bulle }, () => piece(r, pieceVide("bulle", i), images))),
  ].join("");
  const fleches = [
    ...Array.from({ length: r.fleches.rouges }, (_, k) => fleche(ROUGE, k % 2 === 0)),
    ...Array.from({ length: r.fleches.bleues }, (_, k) => fleche(BLEU, k % 2 === 0)),
  ].join("");
  const titre = r.titre.trim();
  return `<div class="vb-page vb-pieces${r.grandes ? " vb-grandes" : ""}">`
    + `<h2>${titre ? `${escapeHtml(titre)} — ` : ""}les pièces du Visibiléo</h2>`
    + `<p class="vb-consigne">À découper et à plastifier ; on écrit au feutre effaçable dans les pièces vierges.</p>`
    + section("Les personnages", persos)
    + section(r.libelles.cadre, deGenre("cadre"))
    + section(r.libelles.nuage, deGenre("nuage"))
    + section(r.libelles.bulle, deGenre("bulle"))
    + section("Pièces vierges", vierges)
    + section(`Les flèches — rouges : ${r.libelles.rouge} ; bleues : ${r.libelles.bleue}`, fleches)
    + `</div>`;
}

/** Le mémo des signes, à afficher : ce que veut dire chaque forme, dans les mots de la classe, et la couleur de chaque personnage. */
export function htmlMemo(r: ReglagesVisibileo, images: Images): string {
  const signe = (dessin: string, mot: string) => `<div class="vb-signe"><div class="vb-dessin">${dessin}</div><div class="vb-mot">${escapeHtml(mot)}</div></div>`;
  const mini = (genre: "nuage" | "bulle") => `<div class="vb-piece vb-${genre} vb-mini">${forme(genre, NEUTRE)}</div>`;
  const persos = personnagesNommes(r).map((p) => {
    const src = r.images ? imageDe(p.image, images) : undefined;
    return `<div class="vb-signe"><div class="vb-dessin"><span class="vb-pastille" style="background:${p.couleur}"></span>`
      + `${src ? `<img src="${src}" alt="">` : ""}</div><div class="vb-mot">${escapeHtml(p.nom.trim() || p.image.mot)}</div></div>`;
  }).join("");
  const titre = r.titre.trim();
  return `<div class="vb-page vb-memo">`
    + `<h2>${titre ? `${escapeHtml(titre)} — ` : ""}les signes de notre Visibiléo</h2>`
    + signe(`<div class="vb-piece vb-cadre vb-mini"></div>`, r.libelles.cadre)
    + signe(mini("nuage"), r.libelles.nuage)
    + signe(mini("bulle"), r.libelles.bulle)
    + signe(fleche(ROUGE, false), r.libelles.rouge)
    + signe(fleche(BLEU, false), r.libelles.bleue)
    + (persos ? `<h3>Les personnages</h3>${persos}` : "")
    + `</div>`;
}

/** La fiche de l'enseignant : ce qu'il y a à comprendre, en quatre colonnes, et les questions de la séance. */
export function htmlPreparation(r: ReglagesVisibileo): string {
  const pleines = r.pieces.filter(estPleine);
  const nom = (qui: number) => (qui >= 0 && r.personnages[qui] ? r.personnages[qui].nom.trim() : "");
  const ligne = (p: Piece) => {
    const qui = nom(p.qui);
    const texte = p.texte.trim() || p.image.mot;
    return `<li>${qui ? `<b>${escapeHtml(qui)}</b> : ` : ""}${escapeHtml(p.genre === "bulle" ? `« ${texte} »` : texte)}</li>`;
  };
  const liste = (ps: Piece[], vides: number) => `<ul>${ps.map(ligne).join("")}${"<li class=\"vb-vide\"></li>".repeat(vides)}</ul>`;
  const cadres = pleines.filter((p) => p.genre === "cadre");
  const pensees = pleines.filter((p) => p.genre !== "cadre");
  const titre = r.titre.trim();
  return `<div class="vb-page vb-preparation">`
    + `<h2>Préparer le Visibiléo${titre ? ` — ${escapeHtml(titre)}` : ""}</h2>`
    + `<table><thead><tr><th>Ce qui est important<small>les cadres</small></th><th>Ce que pensent, croient, veulent les personnages — ce que le texte ne dit pas<small>les nuages, et les bulles des paroles qui comptent</small></th>`
    + `<th>Ce qui explique quoi<small>les flèches rouges : … parce que …</small></th><th>Ce sur quoi les élèves s'appuieront<small>une image, un mot, une phrase du texte</small></th></tr></thead>`
    + `<tbody><tr><td>${liste(cadres, Math.max(2, 6 - cadres.length))}</td><td>${liste(pensees, Math.max(2, 6 - pensees.length))}</td>`
    + `<td>${liste([], 6)}</td><td>${liste([], 6)}</td></tr></tbody></table>`
    + `<h3>Les questions de la séance</h3><ol>`
    + `<li>Qu'est-ce qui est important dans cette histoire ? Pourquoi ?</li>`
    + `<li>Que pense ce personnage ? Que croit-il ? Que veut-il ?</li>`
    + `<li>Pourquoi est-ce arrivé ? Qu'est-ce qui l'explique ?</li>`
    + `<li>Relisons le Visibiléo en partant de la fin : de ce qui arrive, remontons à ce qui l'a causé.</li></ol>`
    + `<h3>Les trois temps</h3><ol>`
    + `<li>Rappeler ce qu'on va faire, et les Visibiléos déjà construits.</li>`
    + `<li>Lire, puis construire ensemble : les élèves disent ce qui est important et pourquoi ; l'enseignant pose les pièces, écrit sous leur dictée, trace les flèches.</li>`
    + `<li>Dire ce qu'on a compris, comment on l'a compris, et à quelle autre histoire celle-ci fait penser. Ensuite : la raconter avec le Visibiléo, la jouer.</li></ol>`
    + `</div>`;
}

/** Les feuilles cochées, à la suite, prêtes à imprimer. */
export function htmlVisibileo(r: ReglagesVisibileo, images: Images): string {
  const pages = [
    r.feuilles.pieces ? htmlPieces(r, images) : "",
    r.feuilles.memo ? htmlMemo(r, images) : "",
    r.feuilles.preparation ? htmlPreparation(r) : "",
  ].filter(Boolean);
  const ids = [...r.personnages.map((p) => p.image), ...r.pieces.map((p) => p.image)]
    .filter((p) => r.images && !p.photo && p.id != null && images[p.id]).map((p) => p.id);
  return feuille(`${pages.join("")}${attributionPour(ids)}`, `vb${r.capitales ? " vb-capitales" : ""}`);
}

// Deux pièces par ligne (ou une, grandes) ; chacune se découpe le long de son
// pointillé et ne se coupe jamais entre deux pages.
export const STYLE_VISIBILEO = `
  @page { size: A4 portrait; margin: 10mm; }
  .feuille.vb { color: #1c2233; }
  .feuille.vb.vb-capitales .vb-texte, .feuille.vb.vb-capitales .vb-mot { text-transform: uppercase; }
  .feuille.vb .vb-page { break-after: page; }
  .feuille.vb .vb-page:last-of-type { break-after: auto; }
  .feuille.vb h2 { font-size: 20px; margin: 0 0 2mm; }
  .feuille.vb h3 { font-size: 14px; margin: 5mm 0 2mm; color: #495057; break-after: avoid; }
  .feuille.vb .vb-consigne { font-size: 12px; color: #495057; margin: 0 0 2mm; }
  .feuille.vb .vb-grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; }
  .feuille.vb .vb-grandes .vb-grille { grid-template-columns: 1fr; }
  .feuille.vb .vb-piece { position: relative; box-sizing: border-box; break-inside: avoid; outline: 0.3mm dashed #adb5bd; outline-offset: 1.5mm; }
  .feuille.vb .vb-dedans { position: absolute; display: flex; align-items: center; justify-content: center; gap: 3mm; text-align: center; }
  .feuille.vb .vb-dedans img, .feuille.vb .vb-personnage img { width: 22mm; height: 22mm; object-fit: contain; margin: 0; max-height: none; flex: none; }
  .feuille.vb .vb-grandes .vb-dedans img, .feuille.vb .vb-grandes .vb-personnage img { width: 34mm; height: 34mm; }
  .feuille.vb .vb-texte { font-size: 17px; font-weight: 700; line-height: 1.2; }
  .feuille.vb .vb-grandes .vb-texte { font-size: 24px; }
  .feuille.vb .vb-cadre { height: 46mm; border: 0.8mm solid #1c2233; border-radius: 2mm; }
  .feuille.vb .vb-grandes .vb-cadre { height: 64mm; }
  .feuille.vb .vb-cadre .vb-dedans { inset: 3mm; }
  .feuille.vb .vb-nuage { height: 54mm; }
  .feuille.vb .vb-grandes .vb-nuage { height: 76mm; }
  .feuille.vb .vb-nuage .vb-dedans { left: 18%; right: 14%; top: 22%; bottom: 22%; }
  .feuille.vb .vb-bulle { height: 50mm; }
  .feuille.vb .vb-grandes .vb-bulle { height: 70mm; }
  .feuille.vb .vb-bulle .vb-dedans { left: 6%; right: 6%; top: 8%; bottom: 26%; }
  .feuille.vb .vb-forme { position: absolute; inset: 0; width: 100%; height: 100%; }
  .feuille.vb .vb-personnage { height: 46mm; border: 1.2mm solid var(--c); border-radius: 4mm; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2mm; }
  .feuille.vb .vb-fleche { height: 14mm; }
  .feuille.vb .vb-fleche svg { width: 100%; height: 100%; display: block; }
  .feuille.vb .vb-fleche:not(.vb-longue) { width: 62%; }
  .feuille.vb .vb-memo .vb-signe { display: flex; align-items: center; gap: 8mm; margin: 0 0 6mm; break-inside: avoid; }
  .feuille.vb .vb-memo .vb-dessin { width: 62mm; flex: none; display: flex; align-items: center; gap: 3mm; }
  .feuille.vb .vb-memo .vb-dessin img { width: 18mm; height: 18mm; object-fit: contain; margin: 0; max-height: none; }
  .feuille.vb .vb-memo .vb-mot { font-size: 24px; font-weight: 800; }
  .feuille.vb .vb-memo .vb-mini { width: 56mm; height: 30mm; outline: none; }
  .feuille.vb .vb-memo .vb-fleche { width: 56mm; height: 12mm; outline: none; }
  .feuille.vb .vb-pastille { width: 12mm; height: 12mm; border-radius: 50%; flex: none; }
  .feuille.vb .vb-preparation table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
  .feuille.vb .vb-preparation th, .feuille.vb .vb-preparation td { border: 0.3mm solid #868e96; padding: 2mm; vertical-align: top; text-align: left; }
  .feuille.vb .vb-preparation th small { display: block; font-weight: 400; color: #495057; margin-top: 1mm; }
  .feuille.vb .vb-preparation ul { margin: 0; padding-left: 4mm; }
  .feuille.vb .vb-preparation li { margin: 0 0 2mm; }
  .feuille.vb .vb-preparation li.vb-vide { list-style: none; border-bottom: 0.3mm dotted #adb5bd; height: 6mm; margin-left: -4mm; }
  .feuille.vb .vb-preparation ol { font-size: 13px; margin: 0; padding-left: 6mm; }
  .feuille.vb .vb-preparation ol li { margin: 0 0 1.5mm; }
`;

// ── L'affiche ─────────────────────────────────────────────────────────────
//
// « Pour la chronologie on peut mettre des nombres pour les étapes
// chronologiques, et après les personnages se greffent dessus ; par contre la
// bulle doit partir du personnage » (l'enseignant, 3 novembre 2026). Chaque
// cadre est une étape, numérotée dans l'ordre du récit : le numéro dit l'ordre,
// sans flèche bleue. Sur son bord se greffent les personnages qui y agissent,
// et ceux qui y pensent ou y parlent ; la bulle et le nuage partent de la
// pastille de leur personnage — la queue de l'une, les petits ronds de
// l'autre —, ou de sa carte s'ils ne sont d'aucune étape.

const MARGE = 8;
/** Où commencent les étapes, à droite de la colonne des personnages. */
const GAUCHE = 72;
const TAILLES: Record<Genre | "personnage", { largeur: number; hauteur: number }> = {
  personnage: { largeur: 56, hauteur: 36 }, nuage: { largeur: 74, hauteur: 40 }, bulle: { largeur: 74, hauteur: 36 }, cadre: { largeur: 74, hauteur: 42 },
};
/** Les étapes d'une rangée. */
const COLONNES = 4;
/** D'une ligne de nuages et de bulles à la suivante. */
const LIGNE = TAILLES.nuage.hauteur + 4;
/** Entre les nuages et les bulles et les étapes qu'ils surmontent : la place des pastilles et des queues. */
const AU_DESSUS = 16;
/** Au-dessus d'une rangée sans nuage ni bulle : la place des pastilles. */
const PASTILLES = 9;

/** Ce que montre l'affiche : les personnages nommés et les pièces écrites, chacun avec son identifiant. */
export function elementsDeLAffiche(r: ReglagesVisibileo): ({ id: string; personnage: Personnage } | { id: string; piece: Piece })[] {
  return [
    ...r.personnages.filter(estNomme).map((personnage) => ({ id: personnage.id, personnage })),
    ...r.pieces.filter(estPleine).map((piece) => ({ id: piece.id, piece })),
  ];
}

/** Le numéro de chaque étape dans l'ordre du récit : les cadres écrits, à la suite. */
export const numerosDesEtapes = (r: Pick<ReglagesVisibileo, "pieces">) =>
  new Map(r.pieces.filter((p) => p.genre === "cadre" && estPleine(p)).map((p, k) => [p.id, k + 1]));

/** Des cases dans l'ordre : chacune au plus près de celle qu'elle vise, sans en doubler une autre ni sortir de la ligne. */
function cases(voulues: number[], n: number): number[] {
  const s: number[] = [];
  voulues.forEach((v, i) => s.push(Math.max(v, i ? s[i - 1] + 1 : 0)));
  for (let i = s.length - 1; i >= 0; i--) s[i] = Math.min(s[i], n - (s.length - i));
  return s;
}

/**
 * La place de chaque élément : celle qu'on lui a donnée, sinon sa place rangée —
 * les personnages à gauche ; les étapes dans l'ordre du récit, quatre par
 * rangée ; au-dessus de chacune, les nuages et les bulles qui s'y passent ; sous
 * le tout, ceux d'aucune étape. Le tout s'étire ou se resserre à la hauteur de
 * l'affiche.
 */
export function placesDeLAffiche(r: ReglagesVisibileo): Record<string, Place> {
  const places: Record<string, Place> = {};
  r.personnages.filter(estNomme).forEach((p, i) => {
    places[p.id] = { x: MARGE, y: Math.min(AFFICHE.hauteur - TAILLES.personnage.hauteur, MARGE + i * (TAILLES.personnage.hauteur + 6)), ...TAILLES.personnage };
  });
  const pleines = r.pieces.filter(estPleine);
  const etapes = pleines.filter((p) => p.genre === "cadre");
  // Les étapes se partagent la largeur ; les nuages et les bulles ont toujours quatre cases par ligne.
  const colonnes = Math.max(1, Math.min(COLONNES, etapes.length));
  const largeur = AFFICHE.largeur - GAUCHE - MARGE, pas = largeur / colonnes, case_ = largeur / COLONNES;
  const poser = (p: Piece, x: number, y: number) => { places[p.id] = { x, y, ...TAILLES[p.genre] }; };
  const enCase = (p: Piece, c: number, y: number) => poser(p, GAUCHE + c * case_ + (case_ - TAILLES[p.genre].largeur) / 2, y);
  const rang = new Map(etapes.map((p, k) => [p.id, k]));
  let y = MARGE;
  for (let debut = 0; debut < etapes.length; debut += colonnes) {
    const rangee = etapes.slice(debut, debut + colonnes);
    // Les nuages et les bulles de ces étapes, dans l'ordre des étapes, ceux d'une même étape centrés au-dessus d'elle ;
    // une ligne de plus quand ils sont plus nombreux que les cases.
    const dessus = pleines.filter((p) => p.genre !== "cadre" && rangee.some((e) => e.id === p.etape))
      .map((p) => ({ p, milieu: ((rang.get(p.etape)! - debut + 0.5) * pas) / case_ - 0.5 })).sort((a, b) => a.milieu - b.milieu);
    const parEtape = new Map<string, number>();
    for (const { p } of dessus) parEtape.set(p.etape, (parEtape.get(p.etape) ?? 0) + 1);
    const deja = new Map<string, number>();
    const voulues = dessus.map(({ p, milieu }) => {
      const j = deja.get(p.etape) ?? 0;
      deja.set(p.etape, j + 1);
      return Math.max(0, Math.min(COLONNES - 1, Math.round(milieu - (parEtape.get(p.etape)! - 1) / 2 + j)));
    });
    const lignes = Math.ceil(dessus.length / COLONNES);
    for (let l = 0; l < lignes; l++) {
      // La ligne 0, la plus proche des étapes.
      const siennes = dessus.map((x, i) => ({ ...x, i })).filter(({ i }) => i % lignes === l);
      cases(siennes.map(({ i }) => voulues[i]), COLONNES).forEach((c, k) => {
        const p = siennes[k].p;
        enCase(p, c, y + (lignes - 1 - l) * LIGNE + TAILLES.nuage.hauteur - TAILLES[p.genre].hauteur);
      });
    }
    y += lignes ? lignes * LIGNE - 4 + AU_DESSUS : PASTILLES;
    rangee.forEach((p, k) => poser(p, GAUCHE + k * pas + (pas - TAILLES.cadre.largeur) / 2, y));
    y += TAILLES.cadre.hauteur + 8;
  }
  // Les nuages et les bulles d'aucune étape : dessous, à la suite.
  pleines.filter((p) => p.genre !== "cadre" && !rang.has(p.etape))
    .forEach((p, k) => enCase(p, k % COLONNES, y + Math.floor(k / COLONNES) * LIGNE));
  // À la hauteur de l'affiche : resserré s'il dépasse, un peu étiré et descendu s'il reste de la place.
  if (pleines.length) {
    const bas = Math.max(...pleines.map((p) => places[p.id].y + places[p.id].hauteur));
    const libre = AFFICHE.hauteur - 2 * MARGE;
    const f = Math.max(0.5, Math.min(1.25, libre / (bas - MARGE)));
    const decalage = Math.max(0, Math.min(24, (libre - (bas - MARGE) * f) / 2));
    for (const p of pleines) {
      const pl = places[p.id];
      places[p.id] = { ...pl, y: MARGE + decalage + (pl.y - MARGE) * f, hauteur: Math.max(PLACE_MIN.hauteur, pl.hauteur * f) };
    }
  }
  for (const [id, place] of Object.entries(r.affichage.places)) if (places[id]) places[id] = place;
  return places;
}

export interface Point { x: number; y: number }
const centre = (p: Place): Point => ({ x: p.x + p.largeur / 2, y: p.y + p.hauteur / 2 });

/** Le point du bord de `p` sur le trait qui va de son centre vers `vers`. */
export function bord(p: Place, vers: Point): Point {
  const c = centre(p), dx = vers.x - c.x, dy = vers.y - c.y;
  if (!dx && !dy) return c;
  const t = Math.min(dx ? Math.abs(p.largeur / 2 / dx) : Infinity, dy ? Math.abs(p.hauteur / 2 / dy) : Infinity);
  return { x: c.x + dx * Math.min(1, t), y: c.y + dy * Math.min(1, t) };
}

const mm = (v: number) => v.toFixed(1);
const style = (p: Place) => `left:${mm(p.x)}mm;top:${mm(p.y)}mm;width:${mm(p.largeur)}mm;height:${mm(p.hauteur)}mm`;

// ── Les étapes : leur numéro, et les personnages qui s'y greffent ─────────

/** Un personnage greffé sur une étape : sa pastille, à cheval sur le bord haut du cadre — son image, sinon son nom. */
export interface Greffe extends Place { qui: number; image: boolean }
/** Une étape de l'affiche : son numéro dans l'ordre du récit, sa pastille, et ses personnages. */
export interface Etape { id: string; numero: number; rond: Place; greffes: Greffe[] }

const nomDe = (p: Personnage) => p.nom.trim() || p.image.mot;

/** Les personnages d'une étape : ceux qui y agissent, puis ceux qui y pensent ou y parlent. */
const personnagesDeLEtape = (r: ReglagesVisibileo, cadre: Piece) => [...new Set([
  ...cadre.acteurs,
  ...r.pieces.filter((p) => p.genre !== "cadre" && p.etape === cadre.id && estPleine(p)).map((p) => p.qui),
])].filter((i) => i >= 0 && Boolean(r.personnages[i]) && estNomme(r.personnages[i]));

/** Les étapes posées sur l'affiche : le numéro au coin haut gauche du cadre, les pastilles des personnages sur son bord haut, à droite. */
export function etapesDeLAffiche(r: ReglagesVisibileo, places: Record<string, Place>): Etape[] {
  const numeros = numerosDesEtapes(r);
  return r.pieces.flatMap((cadre): Etape[] => {
    const numero = numeros.get(cadre.id), pl = places[cadre.id];
    if (!numero || !pl) return [];
    const d = Math.max(9, Math.min(15, Math.min(pl.largeur, pl.hauteur) * 0.34));
    const n = d * 0.72;
    const qui = personnagesDeLEtape(r, cadre);
    const image = (i: number) => r.images && !estVide(r.personnages[i].image);
    const tailles = qui.map((i) => (image(i)
      ? { l: d, h: d }
      : { l: Math.min(pl.largeur * 0.6, Math.max(d, 1.9 * nomDe(r.personnages[i]).length + 5)), h: d * 0.62 }));
    // Les pastilles tiennent sur le bord, à droite du numéro : serrées s'il le faut.
    const ecart = 1.5;
    const total = tailles.reduce((s, t) => s + t.l, 0) + ecart * Math.max(0, qui.length - 1);
    const f = Math.min(1, (pl.largeur - n - 6) / (total || 1));
    let x = pl.x + pl.largeur - 3 - total * f;
    const greffes = qui.map((i, j): Greffe => {
      const l = tailles[j].l * f, h = tailles[j].h * f;
      const g = { qui: i, image: image(i), x, y: pl.y + 0.5 - h / 2, largeur: l, hauteur: h };
      x += l + ecart * f;
      return g;
    });
    return [{ id: cadre.id, numero, rond: { x: pl.x - n * 0.25, y: pl.y - n * 0.25, largeur: n, hauteur: n }, greffes }];
  });
}

/** Les numéros des étapes et les pastilles des personnages, posés sur les cadres. */
export function htmlDesEtapes(r: ReglagesVisibileo, places: Record<string, Place>, images: Images): string {
  return etapesDeLAffiche(r, places).map((e) => `<div class="vb-numero" style="${style(e.rond)};font-size:${mm(e.rond.hauteur * 0.6)}mm">${e.numero}</div>`
    + e.greffes.map((g) => {
      const p = r.personnages[g.qui], nom = nomDe(p);
      const src = g.image ? imageDe(p.image, images) : undefined;
      return src
        ? `<div class="vb-greffe" style="${style(g)};--c:${p.couleur}"><img src="${src}" alt="${escapeHtml(nom)}"></div>`
        : `<div class="vb-greffe vb-nom" style="${style(g)};--c:${p.couleur};font-size:${mm(Math.min(g.hauteur * 0.5, (g.largeur * 1.7) / Math.max(4, nom.length)))}mm">${escapeHtml(nom)}</div>`;
    }).join("")).join("");
}

// ── Les queues des bulles et les ronds des nuages ─────────────────────────

/** Une bulle ou un nuage qui part de quelqu'un : un personnage qui pense ou qui parle, et qui est sur l'affiche. */
const aUnAuteur = (r: ReglagesVisibileo, p: Piece) => p.genre !== "cadre" && p.qui >= 0 && Boolean(r.personnages[p.qui]) && estNomme(r.personnages[p.qui]);

/** Où va la queue : la pastille du personnage sur l'étape où cela se passe, sinon sa carte. `rayon` : ce qui reste entre la queue et lui. */
function cibleDeLaQueue(r: ReglagesVisibileo, p: Piece, places: Record<string, Place>, etapes: Etape[]): { point: Point; rayon: number } | null {
  const ici = places[p.id];
  if (!ici || !aUnAuteur(r, p)) return null;
  const g = etapes.find((e) => e.id === p.etape)?.greffes.find((x) => x.qui === p.qui);
  if (g) return g.image ? { point: centre(g), rayon: g.largeur / 2 + 1 } : { point: bord(g, centre(ici)), rayon: 1 };
  const carte = places[r.personnages[p.qui].id];
  return carte ? { point: bord(carte, centre(ici)), rayon: 1 } : null;
}

/** Le trait des queues : celui des formes, qui garde son épaisseur. */
const trait = (couleur: string) => `stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"`;
const borne = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Ce qui se dessine sous les pièces — une queue qui croise une autre pièce passe derrière elle —, et ce qui se dessine par-dessus. */
export interface Queues { dessous: string; dessus: string }

/**
 * La queue d'une bulle : un triangle qui sort de son bord, du côté de qui parle,
 * et s'arrête juste avant lui. Il passe sous les pièces ; par-dessus, un raccord
 * blanc ouvre le bord de la bulle à sa naissance.
 */
function queueDeBulle(ici: Place, cible: Point, rayon: number, couleur: string): Queues {
  // Le corps de la bulle sans queue (BULLE_SEULE), dans sa place.
  const corps = { x: ici.x + ici.largeur * 0.02, y: ici.y + (ici.hauteur * 6) / 122, largeur: ici.largeur * 0.96, hauteur: (ici.hauteur * 110) / 122 };
  const depart = bord(corps, cible);
  const dx = cible.x - depart.x, dy = cible.y - depart.y, l = Math.hypot(dx, dy);
  if (l < rayon + 2) return { dessous: "", dessus: "" };
  const pointe = { x: cible.x - (dx / l) * rayon, y: cible.y - (dy / l) * rayon };
  // Sa base, sur le côté d'où elle sort, loin des coins arrondis.
  const enHaut = Math.abs(depart.y - corps.y) < 0.01, enBas = Math.abs(depart.y - corps.y - corps.hauteur) < 0.01;
  const coinX = (ici.largeur * 12) / 200, coinY = (ici.hauteur * 12) / 122;
  let b1: Point, b2: Point, dedans: Point;
  if (enHaut || enBas) {
    const demi = Math.min(4, corps.largeur / 6);
    const x = borne(depart.x, corps.x + coinX + demi, corps.x + corps.largeur - coinX - demi);
    b1 = { x: x - demi, y: depart.y }; b2 = { x: x + demi, y: depart.y }; dedans = { x: 0, y: enHaut ? 1 : -1 };
  } else {
    const demi = Math.min(4, corps.hauteur / 6);
    const y = borne(depart.y, corps.y + coinY + demi, corps.y + corps.hauteur - coinY - demi);
    b1 = { x: depart.x, y: y - demi }; b2 = { x: depart.x, y: y + demi }; dedans = { x: Math.abs(depart.x - corps.x) < 0.01 ? 1 : -1, y: 0 };
  }
  const pt = (p: Point) => `${mm(p.x)} ${mm(p.y)}`;
  const decale = (p: Point, k: number) => pt({ x: p.x + dedans.x * k, y: p.y + dedans.y * k });
  // Le raccord : le blanc couvre le trait de la bulle entre les deux pieds de la queue, puis le début de ses côtés se retrace.
  const pied = (b: Point) => {
    const vx = pointe.x - b.x, vy = pointe.y - b.y, k = Math.min(1, 3 / (Math.hypot(vx, vy) || 1));
    return `M${pt(b)} L${pt({ x: b.x + vx * k, y: b.y + vy * k })}`;
  };
  return {
    dessous: `<path d="M${pt(b1)} L${pt(pointe)} L${pt(b2)} Z" fill="#fff"/>`
      + `<path d="M${pt(b1)} L${pt(pointe)} L${pt(b2)}" fill="none" stroke-linejoin="round" ${trait(couleur)}/>`,
    dessus: `<path d="M${decale(b1, 1)} L${decale(b1, -0.7)} L${decale(b2, -0.7)} L${decale(b2, 1)} Z" fill="#fff"/>`
      + `<path d="${pied(b1)} ${pied(b2)}" fill="none" ${trait(couleur)}/>`,
  };
}

/** Les petits ronds d'un nuage : de son bord jusqu'à qui pense, de plus en plus petits. */
function rondsDuNuage(ici: Place, cible: Point, rayon: number, couleur: string): string {
  // Le nuage (NUAGE), à peu près : l'ellipse qui passe par ses bosses.
  const c = { x: ici.x + ici.largeur * 0.517, y: ici.y + ici.hauteur * 0.477 };
  const dx = cible.x - c.x, dy = cible.y - c.y;
  const t = 1 / Math.hypot(dx / (ici.largeur * 0.43), dy / (ici.hauteur * 0.44));
  if (!Number.isFinite(t) || t >= 1) return "";
  const depart = { x: c.x + dx * t, y: c.y + dy * t };
  const vx = cible.x - depart.x, vy = cible.y - depart.y, loin = Math.hypot(vx, vy), l = loin - rayon;
  if (l < 5) return "";
  const n = Math.max(2, Math.min(10, Math.round(l / 8)));
  const echelle = Math.min(1, l / 14);
  return Array.from({ length: n }, (_, k) => {
    const s = (1.6 + ((k + 0.5) * (l - 1.6)) / n) / loin;
    const r = Math.max(0.8, (2.4 - (1.4 * k) / (n - 1)) * echelle);
    return `<circle cx="${mm(depart.x + vx * s)}" cy="${mm(depart.y + vy * s)}" r="${mm(r)}" fill="#fff" ${trait(couleur)}/>`;
  }).join("");
}

/** Les queues des bulles et les ronds des nuages, chacun vers son personnage. */
export function queuesDeLAffiche(r: ReglagesVisibileo, places: Record<string, Place>): Queues {
  const etapes = etapesDeLAffiche(r, places);
  const toutes = r.pieces.filter(estPleine).map((p): Queues => {
    const cible = cibleDeLaQueue(r, p, places, etapes);
    if (!cible) return { dessous: "", dessus: "" };
    const couleur = couleurDe(r, p.qui);
    return p.genre === "bulle"
      ? queueDeBulle(places[p.id], cible.point, cible.rayon, couleur)
      : { dessous: rondsDuNuage(places[p.id], cible.point, cible.rayon, couleur), dessus: "" };
  });
  return { dessous: toutes.map((q) => q.dessous).join(""), dessus: toutes.map((q) => q.dessus).join("") };
}

// ── Les flèches ───────────────────────────────────────────────────────────

/**
 * La flèche de `a` vers `b` : une courbe du bord de l'une au bord de l'autre,
 * que son point de contrôle tire sur le côté — d'autant plus que `courbe` est
 * grande. `milieu` : le point de la courbe qu'on saisit pour la plier.
 */
export function traitDeFleche(a: Place, b: Place, courbe: number): { d: string; milieu: Point } {
  const ca = centre(a), cb = centre(b);
  const dx = cb.x - ca.x, dy = cb.y - ca.y, l = Math.hypot(dx, dy) || 1;
  const controle = { x: (ca.x + cb.x) / 2 - (dy / l) * courbe * l * 0.5, y: (ca.y + cb.y) / 2 + (dx / l) * courbe * l * 0.5 };
  const depart = bord(a, controle), arrivee = bord(b, controle);
  const milieu = { x: 0.25 * depart.x + 0.5 * controle.x + 0.25 * arrivee.x, y: 0.25 * depart.y + 0.5 * controle.y + 0.25 * arrivee.y };
  return { d: `M${mm(depart.x)} ${mm(depart.y)} Q${mm(controle.x)} ${mm(controle.y)} ${mm(arrivee.x)} ${mm(arrivee.y)}`, milieu };
}

/** La courbe qui fait passer le milieu de la flèche par `point` : son écart au trait droit, en part de sa longueur. */
export function courbeVers(a: Place, b: Place, point: Point): number {
  const ca = centre(a), cb = centre(b);
  const dx = cb.x - ca.x, dy = cb.y - ca.y, l = Math.hypot(dx, dy) || 1;
  const ecart = ((point.x - (ca.x + cb.x) / 2) * -dy + (point.y - (ca.y + cb.y) / 2) * dx) / l;
  const courbe = ecart / (0.25 * l);
  return Math.abs(courbe) < 0.04 ? 0 : Math.round(Math.max(-1.5, Math.min(1.5, courbe)) * 100) / 100;
}

/** Les pointes des flèches, une par couleur. */
export const POINTES = `<defs>${(["rouge", "bleue"] as CouleurFleche[]).map((c) => `<marker id="vb-pointe-${c}" viewBox="0 0 10 10" refX="8.5" refY="5" `
  + `markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c === "rouge" ? ROUGE : BLEU}"/></marker>`).join("")}</defs>`;

/** Une flèche de l'affiche, en SVG. */
export const cheminDeFleche = (f: Fleche, a: Place, b: Place, attributs = "") =>
  `<path d="${traitDeFleche(a, b, f.courbe).d}" stroke="${f.couleur === "rouge" ? ROUGE : BLEU}" stroke-width="1.4" fill="none" stroke-linecap="round" `
  + `marker-end="url(#vb-pointe-${f.couleur})"${attributs}/>`;

/** Un élément de l'affiche, tel qu'il s'imprime : la carte du personnage, ou la pièce — sans sa queue toute faite quand elle part d'un personnage. */
export const htmlDeLElement = (r: ReglagesVisibileo, e: ReturnType<typeof elementsDeLAffiche>[number], images: Images) =>
  ("personnage" in e ? carteDuPersonnage(r, e.personnage, images) : piece(r, e.piece, images, aUnAuteur(r, e.piece)));

/** L'affiche entière, prête à imprimer en A3 à l'italienne : les queues dessous, les pièces à leur place, les étapes, puis les flèches par-dessus. */
export function htmlAffichage(r: ReglagesVisibileo, images: Images): string {
  const places = placesDeLAffiche(r);
  const elements = elementsDeLAffiche(r);
  const fleches = r.affichage.fleches.filter((f) => places[f.de] && places[f.vers]).map((f) => cheminDeFleche(f, places[f.de], places[f.vers])).join("");
  const queues = queuesDeLAffiche(r, places);
  const ids = [...r.personnages.map((p) => p.image), ...r.pieces.map((p) => p.image)]
    .filter((p) => r.images && !p.photo && p.id != null && images[p.id]).map((p) => p.id);
  const calque = (contenu: string) =>
    `<svg class="vb-traits" viewBox="0 0 ${AFFICHE.largeur} ${AFFICHE.hauteur}" width="${AFFICHE.largeur}mm" height="${AFFICHE.hauteur}mm">${contenu}</svg>`;
  return feuille(`<div class="vb-affiche" style="width:${AFFICHE.largeur}mm;height:${AFFICHE.hauteur}mm">`
    + calque(queues.dessous)
    + elements.map((e) => `<div class="vb-pose" style="${style(places[e.id])}">${htmlDeLElement(r, e, images)}</div>`).join("")
    + `<div class="vb-etapes">${htmlDesEtapes(r, places, images)}</div>`
    + calque(`${POINTES}${queues.dessus}${fleches}`)
    + `</div>${attributionPour(ids)}`, `vb vb-affichage${r.capitales ? " vb-capitales" : ""}`);
}

// Sur l'affiche, une pièce prend toute sa place, et son image et son texte en suivent la taille.
export const STYLE_AFFICHAGE = `
  @page { size: A3 landscape; margin: 10mm; }
  .feuille.vb .vb-affiche { position: relative; margin: 0 auto; }
  .feuille.vb .vb-pose { position: absolute; box-sizing: border-box; }
  .feuille.vb .vb-pose > .vb-piece { width: 100%; height: 100%; outline: none; }
  .feuille.vb .vb-affiche .vb-dedans img, .feuille.vb .vb-affiche .vb-personnage img { width: auto; height: 52%; max-width: 42%; }
  .feuille.vb .vb-affiche .vb-texte { font-size: 14px; }
  .feuille.vb .vb-affiche .vb-cadre .vb-dedans { inset: 2mm; }
  .feuille.vb .vb-affiche .vb-cadre, .feuille.vb .vb-affiche .vb-personnage { background: #fff; }
  .feuille.vb .vb-affiche .vb-bulle.vb-sans-queue .vb-dedans { bottom: 8%; }
  .feuille.vb .vb-etapes { position: absolute; inset: 0; pointer-events: none; }
  .feuille.vb .vb-numero { position: absolute; box-sizing: border-box; border-radius: 50%; background: #1c2233; color: #fff; font-weight: 800;
    display: flex; align-items: center; justify-content: center; line-height: 1; }
  .feuille.vb .vb-greffe { position: absolute; box-sizing: border-box; border-radius: 50%; background: #fff; border: 0.9mm solid var(--c);
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .feuille.vb .vb-greffe img { width: 82%; height: 82%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.vb .vb-greffe.vb-nom { border-radius: 99mm; color: var(--c); font-weight: 800; white-space: nowrap; line-height: 1; }
  .feuille.vb.vb-capitales .vb-greffe.vb-nom { text-transform: uppercase; }
  .feuille.vb .vb-traits { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
`;

// ── Le premier jet de l'IA ────────────────────────────────────────────────
//
// Mistral lit le texte et propose ce qu'il y a à comprendre : les personnages,
// ce qui se passe, ce qu'ils pensent et veulent, ce qu'ils disent. Il répond
// en JSON ; chaque pièce porte un mot pour trouver son picto. Ce qu'il rend se
// relit avant d'être cru : un genre inconnu, un personnage qui n'existe pas,
// une pièce vide s'écartent ; les nombres restent dans les bornes de l'atelier.

/** Ce qu'on demande à Mistral : la méthode, ses signes, et la forme de la réponse. */
export const CONSIGNE_VISIBILEO = [
  "Tu prépares un Visibiléo : la trace d'un récit qu'une classe construit avec son enseignant pour comprendre l'histoire, ce qui est dit comme ce qui ne l'est pas.",
  "Ses signes : des cadres pour ce qui se passe — les situations et les actions importantes ; des nuages pour ce que pense, croit ou veut un personnage — ses mobiles, souvent implicites, ce que le texte ne dit pas mais qui explique ce qu'il fait ; des bulles pour ce qu'un personnage dit d'important, recopié du texte.",
  "Réponds par un objet JSON, sans rien autour : {\"titre\": texte, \"personnages\": [{\"nom\": texte, \"images\": [mots], \"sens\": texte}], \"pieces\": [{\"genre\": \"cadre\" | \"nuage\" | \"bulle\", \"texte\": texte, \"qui\": nombre, \"acteurs\": [nombres], \"etape\": nombre, \"images\": [mots], \"sens\": texte}], \"causes\": [{\"de\": nombre, \"vers\": nombre}]}.",
  "« causes » : les flèches rouges, « parce que » — de ce qui arrive vers ce qui l'explique, souvent un nuage (« le fromage tombe » parce que « le corbeau ouvre son bec », parce qu'« il veut montrer sa belle voix ») ; « de » et « vers » sont les rangs des pièces dans la liste, à partir de 0 ; de 2 à 10 flèches, celles qui font comprendre l'histoire.",
  `Règles : de 1 à ${PERSONNAGES_MAX} personnages, les principaux ; de 3 à 8 cadres, dans l'ordre du récit, seulement ce qu'il faut pour comprendre ; pour chaque personnage principal, les nuages de ses mobiles qui expliquent ses actions, surtout ce que le texte ne dit pas ; de 0 à 3 bulles, les paroles qui comptent ; ${PIECES_MAX} pièces au plus.`,
  "Phrases courtes — douze mots au plus —, simples, au présent, pour de jeunes élèves ; les nuages à la première personne (« Je veux… », « Je crois que… »).",
  "« qui » : pour un nuage ou une bulle, le rang du personnage qui pense ou qui parle, dans la liste des personnages, à partir de 0 ; -1 pour un cadre.",
  "Les cadres sont les étapes de l'histoire, numérotées dans leur ordre. « acteurs » : pour un cadre, les rangs des personnages qui y agissent — un ou deux, ceux qu'on verra sur cette étape ; [] pour un nuage ou une bulle.",
  "« etape » : pour un nuage ou une bulle, le rang — dans la liste des pièces, à partir de 0 — du cadre où le personnage pense ou dit cela ; -1 pour un cadre.",
  "« images » : de 1 à 3 mots pour trouver un pictogramme, au singulier, du plus précis au plus courant — le dernier, un mot très courant de tous les jours, nom ou verbe à l'infinitif (« vieillard », « vieil homme », « vieux » ; « bréviaire », « livre », « prier ») ; pour un personnage, ce qu'il est (« cheval », « mouche ») ; pour une pièce, ce qu'on voit dans la scène. Méfie-toi des mots à plusieurs sens : des chevaux qui « tirent » une voiture ne tirent pas au pistolet.",
  "« sens » : en quelques mots, ce que l'image doit montrer dans cette histoire (« des chevaux qui tirent une voiture ») : c'est lui qui départagera les pictogrammes d'un même mot.",
].join("\n");

/** Ce qu'on demande à Mistral pour lire une page photographiée : son texte, rien d'autre. */
export const CONSIGNE_LECTURE_PAGE = "Recopie exactement le texte du récit écrit sur cette page de livre, dans l'ordre de lecture, avec ses paragraphes. "
  + "N'ajoute rien, ne commente rien, ne corrige rien ; laisse les numéros de page et ce qui n'est pas le texte du récit. S'il n'y a pas de texte, ne réponds rien.";

export interface PremierJet {
  titre: string;
  /** Les flèches rouges : la pièce `de` arrive parce que la pièce `vers` — par leurs rangs dans `pieces`. */
  causes: { de: number; vers: number }[];
  /** `images` : les mots qui cherchent son picto, du plus précis au plus courant. */
  personnages: { nom: string; images: string[]; sens: string }[];
  /** `acteurs` : les personnages d'une étape ; `etape` : le rang, dans `pieces`, du cadre d'un nuage ou d'une bulle — -1 : aucun. */
  pieces: { genre: Genre; texte: string; qui: number; acteurs: number[]; etape: number; images: string[]; sens: string }[];
}

const chaine = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
/** Les mots qui cherchent le picto : trois au plus, en minuscules, sans doublon — une liste, ou un seul mot pour une réponse ancienne. */
const motsDImage = (o: Record<string, unknown>) => [...new Set((Array.isArray(o.images) ? o.images : [o.image])
  .map((m) => chaine(m).toLocaleLowerCase("fr")).filter(Boolean))].slice(0, 3);

/** La réponse de Mistral, relue : ce qui ne tient pas s'écarte ; null si rien n'en sort. */
export function lirePremierJet(brut: string): PremierJet | null {
  let v: unknown;
  try { v = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1)); } catch { return null; }
  const o = objet(v);
  // Les rangs de la réponse deviennent ceux de ce qu'on garde : ce qui s'écarte ne décale ni les personnages, ni les étapes, ni les causes.
  const rangDuPersonnage = new Map<number, number>();
  const personnages: PremierJet["personnages"] = [];
  (Array.isArray(o.personnages) ? o.personnages : []).forEach((p, k) => {
    const x = objet(p), nom = chaine(x.nom);
    if (!nom || personnages.length >= PERSONNAGES_MAX) return;
    rangDuPersonnage.set(k, personnages.length);
    personnages.push({ nom, images: motsDImage(x), sens: chaine(x.sens) });
  });
  const personnage = (n: unknown) => (typeof n === "number" ? rangDuPersonnage.get(n) : undefined);
  const rangDeLaPiece = new Map<number, number>();
  const pieces: PremierJet["pieces"] = [];
  const etapes: unknown[] = [];
  (Array.isArray(o.pieces) ? o.pieces : []).forEach((p, k) => {
    const x = objet(p);
    const genre = x.genre as Genre;
    const texte = chaine(x.texte).replace(/^[«"“]\s*|\s*[»"”]$/g, "");
    if (!GENRES.includes(genre) || !texte || pieces.length >= PIECES_MAX) return;
    rangDeLaPiece.set(k, pieces.length);
    etapes.push(x.etape);
    pieces.push({
      genre, texte,
      qui: genre !== "cadre" ? personnage(x.qui) ?? -1 : -1,
      acteurs: genre === "cadre" && Array.isArray(x.acteurs) ? [...new Set(x.acteurs.map(personnage).filter((n): n is number => n !== undefined))] : [],
      etape: -1,
      images: motsDImage(x), sens: chaine(x.sens),
    });
  });
  if (!pieces.length && !personnages.length) return null;
  const piece = (n: unknown) => (typeof n === "number" ? rangDeLaPiece.get(n) : undefined);
  // L'étape d'un nuage ou d'une bulle : un cadre qu'on a gardé.
  pieces.forEach((p, i) => {
    const e = piece(etapes[i]);
    if (p.genre !== "cadre" && e !== undefined && pieces[e].genre === "cadre") p.etape = e;
  });
  const causes = (Array.isArray(o.causes) ? o.causes : []).flatMap((c) => {
    const x = objet(c), de = piece(x.de), vers = piece(x.vers);
    return de !== undefined && vers !== undefined && de !== vers ? [{ de, vers }] : [];
  }).slice(0, FLECHES_AFFICHE_MAX);
  return { titre: chaine(o.titre), causes, personnages, pieces };
}

// ── Le bon picto, dans le sens de l'histoire ──────────────────────────────
//
// « Faut faire gaffe aux homonymes : tirer, dans ce cas-là, c'est pas tirer au
// pistolet » (l'enseignant, 3 novembre 2026, sur « La Mouche et le Coche »). Un
// mot ramène de la banque plusieurs pictos — « tirer » : shooter, remorquer,
// tirer les cheveux… — et le premier n'est pas toujours le bon. Mistral reçoit
// donc, pour chaque image, le sens voulu dans l'histoire et les pictos du mot
// avec leurs mots-clés, et choisit ; si aucun ne montre ce sens — « cocher »
// n'est dans la banque que comme verbe, cocher une case —, la pièce reste sans
// image : mieux vaut aucune image qu'une fausse.

/** Une image à trouver : son rang (les personnages, puis les pièces), ses mots, son sens, et les pictos de ses mots. */
export interface ImageACherche {
  n: number;
  mots: string[];
  sens: string;
  /** `nature` : « verbe », « nom »… ce que la banque en dit ; c'est elle qui sépare le cocher de l'action de cocher. */
  candidats: { id: number; mots: string[]; nature?: string }[];
}

export const CONSIGNE_IMAGES = [
  "Pour chaque image d'un récit, tu choisis le pictogramme qui montre le sens voulu dans l'histoire, d'après sa nature et ses mots-clés.",
  "Méfie-toi des homonymes : « tirer » une voiture n'est pas « tirer » au pistolet ; le cocher d'une voiture est une personne — un nom —, pas l'action de cocher une case — un verbe.",
  "Les mots-clés disent ce que montre le pictogramme : s'ils parlent d'autre chose que le sens voulu — « injecter » pour une mouche qui pique, « acouphène » pour une mouche qui bourdonne, « moineau » pour un moine, « côtelette » pour une côte à monter —, il ne convient pas.",
  "Un pictogramme qui montre l'élément principal de la pièce convient — un cheval pour « six chevaux tirent le coche », une personne qui prie pour « le moine prie » — : il n'a pas à montrer toute la scène.",
  "Réponds null seulement si aucun pictogramme ne montre ce qu'il faut : mieux vaut aucune image qu'une fausse.",
  "Réponds par un objet JSON, sans rien autour : {\"choix\": [{\"n\": nombre, \"id\": nombre ou null}]}.",
].join("\n");

/** Les images à départager, en une demande : celles qui ont des pictos. */
export const demandeDesImages = (images: ImageACherche[]) => JSON.stringify(images.filter((i) => i.candidats.length).map((i) => ({
  n: i.n, mots: i.mots, sens: i.sens,
  pictogrammes: i.candidats.map((c) => ({ id: c.id, ...(c.nature ? { nature: c.nature } : {}), motsCles: c.mots.slice(0, 6).join(", ") })),
})));

/** Le choix de Mistral, relu : seulement des pictos qu'on lui a proposés pour cette image ; ce qu'il ne dit pas reste sans image. */
export function lireChoixDesImages(brut: string, images: ImageACherche[]): Map<number, number | null> {
  const choix = new Map<number, number | null>(images.map((i) => [i.n, null]));
  let v: unknown;
  try { v = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1)); } catch { return choix; }
  for (const c of Array.isArray(objet(v).choix) ? objet(v).choix as unknown[] : []) {
    const o = objet(c);
    const image = images.find((i) => i.n === o.n);
    if (image && typeof o.id === "number" && image.candidats.some((x) => x.id === o.id)) choix.set(image.n, o.id);
  }
  return choix;
}

/** Le texte d'une page lue ajouté à ce qu'on a déjà, une ligne vide entre deux pages. */
export const ajouterPage = (texte: string, page: string) => [texte.trim(), page.trim()].filter(Boolean).join("\n\n");

// ── L'exemple ─────────────────────────────────────────────────────────────
//
// « Le Corbeau et le Renard », de La Fontaine (domaine public) : une ruse, des
// mobiles que le texte ne dit pas, une chaîne de causes jusqu'au fromage qui
// tombe — tout ce qu'un Visibiléo fait voir.

export const EXEMPLE_VISIBILEO = {
  titre: "Le Corbeau et le Renard",
  personnages: [{ nom: "Le corbeau", image: "corbeau" }, { nom: "Le renard", image: "renard" }],
  /** `acteurs` : qui agit dans une étape ; `etape` : le rang du cadre où l'on pense ou parle. */
  pieces: [
    { genre: "cadre", texte: "Le corbeau tient un fromage dans son bec.", image: "fromage", qui: -1, acteurs: [0], etape: -1 },
    { genre: "cadre", texte: "Le renard parle au corbeau.", image: "parler", qui: -1, acteurs: [1], etape: -1 },
    { genre: "cadre", texte: "Le corbeau ouvre son bec pour chanter.", image: "chanter", qui: -1, acteurs: [0], etape: -1 },
    { genre: "cadre", texte: "Le fromage tombe ; le renard le prend.", image: "tomber", qui: -1, acteurs: [1], etape: -1 },
    { genre: "nuage", texte: "Je veux ce fromage.", image: "vouloir", qui: 1, acteurs: [], etape: 0 },
    { genre: "nuage", texte: "S'il chante, il lâchera le fromage.", image: "penser", qui: 1, acteurs: [], etape: 1 },
    { genre: "nuage", texte: "Je veux montrer ma belle voix.", image: "fier", qui: 0, acteurs: [], etape: 2 },
    { genre: "bulle", texte: "Que vous êtes joli !", image: "", qui: 1, acteurs: [], etape: 1 },
  ] as { genre: Genre; texte: string; image: string; qui: number; acteurs: number[]; etape: number }[],
  /** Les flèches rouges de l'affiche, par les rangs des pièces : ce qui explique quoi. L'ordre, ce sont les numéros des étapes. */
  fleches: [
    { de: 3, vers: 2, couleur: "rouge", courbe: -1.2 }, { de: 2, vers: 6, couleur: "rouge", courbe: -0.3 },
    { de: 6, vers: 7, couleur: "rouge", courbe: 0.3 }, { de: 7, vers: 4, couleur: "rouge", courbe: 0.5 },
  ] as { de: number; vers: number; couleur: CouleurFleche; courbe: number }[],
};

/** Les mots dont l'exemple cherche les pictos. */
export const motsDeLExemple = () =>
  [...EXEMPLE_VISIBILEO.personnages.map((p) => p.image), ...EXEMPLE_VISIBILEO.pieces.map((p) => p.image)].filter(Boolean);
