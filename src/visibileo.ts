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

import { escapeHtml } from "./print";
import { attributionPour, feuille } from "./cartesImprimables";
import { cleImage, estVide, normaliserPicto, type Images, type PictoPose } from "./supportsVisuels";

export type Genre = "cadre" | "nuage" | "bulle";
export const GENRES: Genre[] = ["cadre", "nuage", "bulle"];

export interface Personnage { nom: string; image: PictoPose; couleur: string }

export interface Piece {
  genre: Genre;
  texte: string;
  image: PictoPose;
  /** Le personnage qui pense ou qui parle, par son rang ; -1 : aucun. */
  qui: number;
}

/** Les mots du mémo : ceux de la classe, qui construit son codage avec l'enseignant. */
export type Signe = Genre | "rouge" | "bleue";

export interface ReglagesVisibileo {
  titre: string;
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
}

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

export const personnageVide = (i: number): Personnage => ({ nom: "", image: { id: null, mot: "" }, couleur: couleurDuPersonnage(i) });
export const pieceVide = (genre: Genre, qui = -1): Piece => ({ genre, texte: "", image: { id: null, mot: "" }, qui });

export const REGLAGES_VISIBILEO: ReglagesVisibileo = {
  titre: "",
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
};

// ── Les réglages ──────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;
const nombre = (v: unknown, max: number, defaut: number) =>
  (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : defaut);
const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesVisibileo>): ReglagesVisibileo {
  const personnages = Array.isArray(brut.personnages)
    ? brut.personnages.slice(0, PERSONNAGES_MAX).map((p, i): Personnage => {
      const o = objet(p);
      return {
        nom: typeof o.nom === "string" ? o.nom : "",
        image: normaliserPicto(o.image),
        couleur: typeof o.couleur === "string" && HEX.test(o.couleur) ? o.couleur : couleurDuPersonnage(i),
      };
    })
    : REGLAGES_VISIBILEO.personnages;
  const pieces = Array.isArray(brut.pieces)
    ? brut.pieces.slice(0, PIECES_MAX).flatMap((p): Piece[] => {
      const o = objet(p);
      if (!GENRES.includes(o.genre as Genre)) return [];
      const qui = typeof o.qui === "number" && Number.isInteger(o.qui) && o.qui >= 0 && o.qui < personnages.length ? o.qui : -1;
      return [{ genre: o.genre as Genre, texte: typeof o.texte === "string" ? o.texte : "", image: normaliserPicto(o.image), qui }];
    })
    : [];
  const v = objet(brut.vierges), f = objet(brut.fleches), l = objet(brut.libelles), fe = objet(brut.feuilles);
  return {
    titre: typeof brut.titre === "string" ? brut.titre : "",
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

const forme = (genre: "nuage" | "bulle", couleur: string) => genre === "nuage"
  ? `<svg class="vb-forme" viewBox="0 0 200 128" preserveAspectRatio="none" aria-hidden="true"><path d="${NUAGE}" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
    + `<circle cx="30" cy="112" r="7" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
    + `<circle cx="14" cy="123" r="4" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`
  : `<svg class="vb-forme" viewBox="0 0 200 122" preserveAspectRatio="none" aria-hidden="true"><path d="${BULLE}" fill="#fff" stroke="${couleur}" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;

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

function piece(r: ReglagesVisibileo, p: Piece, images: Images): string {
  const c = couleurDe(r, p.qui);
  const dedans = contenu(r, p.texte, p.image, images, p.genre === "bulle");
  if (p.genre === "cadre") return `<div class="vb-piece vb-cadre"><div class="vb-dedans">${dedans}</div></div>`;
  return `<div class="vb-piece vb-${p.genre}">${forme(p.genre, c)}<div class="vb-dedans">${dedans}</div></div>`;
}

const section = (titre: string, corps: string) => (corps ? `<section class="vb-section"><h3>${escapeHtml(titre)}</h3><div class="vb-grille">${corps}</div></section>` : "");

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Les pièces à découper et à plastifier : les personnages, les cadres, les nuages, les bulles, les vierges, les flèches. */
export function htmlPieces(r: ReglagesVisibileo, images: Images): string {
  const nommes = r.personnages.map((p, i) => ({ p, i })).filter(({ p }) => estNomme(p));
  const pleines = r.pieces.filter(estPleine);
  const persos = nommes.map(({ p }) => {
    const src = r.images ? imageDe(p.image, images) : undefined;
    return `<div class="vb-piece vb-personnage" style="--c:${p.couleur}">${src ? `<img src="${src}" alt="">` : ""}<span class="vb-texte">${escapeHtml(p.nom.trim())}</span></div>`;
  }).join("");
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

// ── L'exemple ─────────────────────────────────────────────────────────────
//
// « Le Corbeau et le Renard », de La Fontaine (domaine public) : une ruse, des
// mobiles que le texte ne dit pas, une chaîne de causes jusqu'au fromage qui
// tombe — tout ce qu'un Visibiléo fait voir.

export const EXEMPLE_VISIBILEO = {
  titre: "Le Corbeau et le Renard",
  personnages: [{ nom: "Le corbeau", image: "corbeau" }, { nom: "Le renard", image: "renard" }],
  pieces: [
    { genre: "cadre", texte: "Le corbeau tient un fromage dans son bec.", image: "fromage", qui: -1 },
    { genre: "cadre", texte: "Le renard parle au corbeau.", image: "parler", qui: -1 },
    { genre: "cadre", texte: "Le corbeau ouvre son bec pour chanter.", image: "chanter", qui: -1 },
    { genre: "cadre", texte: "Le fromage tombe ; le renard le prend.", image: "tomber", qui: -1 },
    { genre: "nuage", texte: "Je veux ce fromage.", image: "vouloir", qui: 1 },
    { genre: "nuage", texte: "S'il chante, il lâchera le fromage.", image: "penser", qui: 1 },
    { genre: "nuage", texte: "Je veux montrer ma belle voix.", image: "fier", qui: 0 },
    { genre: "bulle", texte: "Que vous êtes joli !", image: "", qui: 1 },
  ] as { genre: Genre; texte: string; image: string; qui: number }[],
};

/** Les mots dont l'exemple cherche les pictos. */
export const motsDeLExemple = () =>
  [...EXEMPLE_VISIBILEO.personnages.map((p) => p.image), ...EXEMPLE_VISIBILEO.pieces.map((p) => p.image)].filter(Boolean);
