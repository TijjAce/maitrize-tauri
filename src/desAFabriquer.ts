// ── Les dés personnalisés ───────────────────────────────────────────────────
//
// Demande de l'enseignant (2026-11-01) : « un autre générateur pour des dés
// modifiés, avec des images » — le jeu « Dessine-moi… » : le premier dé dit
// ce qu'on dessine, le second de quelle couleur. Un dé a six faces : des
// images de la banque ou les siennes, des couleurs, des formes, des points,
// des chiffres ou des mots ; avec moins de six, elles reviennent dans l'ordre
// (trois couleurs : chacune deux fois). Il s'imprime en patron à découper,
// plier et coller — un cube de 3, 4 ou 5 cm —, ou en six cartes pour un dé à
// pochettes. Les points et les chiffres se font face à 7, comme sur un vrai dé.

import { feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";
import { FORMES_DU_TABLEAU, couleurDuTableau, traceDeLaForme, type FormeDuTableau } from "./tableauDoubleEntree";

export const SORTES_DE_DES = [
  { id: "images", nom: "Des images", titre: "Le dé des images" },
  { id: "couleurs", nom: "Des couleurs", titre: "Le dé des couleurs" },
  { id: "formes", nom: "Des formes", titre: "Le dé des formes" },
  { id: "points", nom: "Des points, de 1 à 6", titre: "Le dé à points" },
  { id: "chiffres", nom: "Des chiffres, de 1 à 6", titre: "Le dé des chiffres" },
  { id: "mots", nom: "Des mots", titre: "Le dé des mots" },
] as const;
export type SorteDeDe = (typeof SORTES_DE_DES)[number]["id"];

export interface DeAFabriquer {
  sorte: SorteDeDe;
  couleurs: string[];
  formes: FormeDuTableau[];
  /** Les mots du dé de mots, un par ligne. */
  mots: string;
}

export interface ReglagesDes {
  des: DeAFabriquer[];
  /** Le côté du dé, en centimètres. */
  taille: 3 | 4 | 5;
  /** Un patron à plier, ou six cartes pour un dé à pochettes. */
  forme: "patron" | "pochettes";
  /** Le mot sous l'image, la couleur ou la forme. */
  motsEcrits: boolean;
  /** La règle du jeu « Dessine-moi… », quand un dé de couleurs suit un dé d'images ou de formes. */
  regle: boolean;
}

export const MAX_DES = 3;
export const DE_NEUF: DeAFabriquer = { sorte: "images", couleurs: [], formes: [], mots: "" };
export const REGLAGES_DES: ReglagesDes = {
  des: [{ ...DE_NEUF }, { ...DE_NEUF, sorte: "couleurs", couleurs: ["rouge", "bleu", "vert", "jaune", "violet", "orange"] }],
  taille: 4, forme: "patron", motsEcrits: false, regle: true,
};

const lireDe = (b: Partial<DeAFabriquer> | null | undefined): DeAFabriquer => {
  const d = b ?? {};
  return {
    sorte: SORTES_DE_DES.some((s) => s.id === d.sorte) ? d.sorte as SorteDeDe : "images",
    couleurs: [...new Set((Array.isArray(d.couleurs) ? d.couleurs : []).filter((c) => !!couleurDuTableau(c)))].slice(0, 6),
    formes: [...new Set((Array.isArray(d.formes) ? d.formes : []).filter((f): f is FormeDuTableau => FORMES_DU_TABLEAU.includes(f as FormeDuTableau)))].slice(0, 6),
    mots: typeof d.mots === "string" ? d.mots : "",
  };
};

/** Des réglages lus de la mémoire, sans leur faire confiance. */
export function reglagesDesSurs(brut: Partial<ReglagesDes> | null | undefined): ReglagesDes {
  const b = brut ?? {};
  const des = (Array.isArray(b.des) ? b.des : []).slice(0, MAX_DES).map(lireDe);
  return {
    des: des.length ? des : REGLAGES_DES.des.map((d) => ({ ...d })),
    taille: b.taille === 3 || b.taille === 5 ? b.taille : 4,
    forme: b.forme === "pochettes" ? "pochettes" : "patron",
    motsEcrits: b.motsEcrits === true,
    regle: b.regle !== false,
  };
}

/** Une image d'un dé : son mot, et sa source prête à imprimer. */
export interface ImageDeDe { mot: string; src: string }

/** Ce que montre une face. */
export type Face =
  | { sorte: "couleur"; nom: string; hex: string }
  | { sorte: "forme"; forme: FormeDuTableau }
  | { sorte: "image"; mot: string; src: string }
  | { sorte: "nombre"; n: number; points: boolean }
  | { sorte: "mot"; mot: string };

/**
 * Les six faces d'un dé, dans l'ordre de son patron — en haut, à gauche, au
 * centre, à droite, en bas, tout en bas — ; rien s'il n'a rien à montrer.
 * Les nombres se font face à 7 : 1 au centre et 6 tout en bas, 2 et 5, 3 et 4.
 */
export function facesDuDe(d: DeAFabriquer, images: ImageDeDe[]): Face[] {
  if (d.sorte === "points" || d.sorte === "chiffres") return [2, 3, 1, 4, 5, 6].map((n) => ({ sorte: "nombre", n, points: d.sorte === "points" }));
  const valeurs: Face[] = d.sorte === "couleurs" ? d.couleurs.map((nom) => ({ sorte: "couleur", nom, hex: couleurDuTableau(nom)!.hex }))
    : d.sorte === "formes" ? d.formes.map((forme) => ({ sorte: "forme", forme }))
      : d.sorte === "images" ? images.slice(0, 6).map((i) => ({ sorte: "image", mot: i.mot, src: i.src }))
        : d.mots.split("\n").map((m) => m.trim()).filter(Boolean).slice(0, 6).map((mot) => ({ sorte: "mot", mot }));
  return valeurs.length ? Array.from({ length: 6 }, (_, i) => valeurs[i % valeurs.length]) : [];
}

const NOIR = "#1c2233";
const n2 = (v: number) => String(Math.round(v * 100) / 100);
const CLAIRES = new Set(["jaune", "rose", "orange"]);
/** Les points d'une face, dans un carré de côté 1. */
const POINTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

/** Une face, dans un carré de côté `s` posé en (x, y) : son fond, ce qu'elle montre, et son mot s'il est écrit. */
function dessinDeLaFace(f: Face, x: number, y: number, s: number, motsEcrits: boolean): string {
  const cadre = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(s)}" height="${n2(s)}" fill="${f.sorte === "couleur" ? f.hex : "#fff"}" stroke="${NOIR}" stroke-width="0.4"/>`;
  const mot = (t: string, couleur = NOIR) => `<text x="${n2(x + s / 2)}" y="${n2(y + s * 0.92)}" font-size="${n2(Math.min(s * 0.15, (s * 1.5) / Math.max(4, t.length)))}" `
    + `font-weight="700" text-anchor="middle" fill="${couleur}">${escapeHtml(t)}</text>`;
  const p = s * 0.12, haut = motsEcrits ? s * 0.68 : s - 2 * p;
  const zone = { x: x + p, y: y + p, l: s - 2 * p, h: haut };
  switch (f.sorte) {
    case "couleur": return cadre + (motsEcrits ? mot(f.nom, CLAIRES.has(f.nom) ? NOIR : "#fff") : "");
    case "forme": return cadre + `<svg x="${n2(zone.x)}" y="${n2(zone.y)}" width="${n2(zone.l)}" height="${n2(zone.h)}" viewBox="0 0 20 20">${traceDeLaForme(f.forme, "#fff", 0.9)}</svg>`
      + (motsEcrits ? mot(f.forme) : "");
    case "image": return cadre + `<image href="${escapeHtml(f.src)}" x="${n2(zone.x)}" y="${n2(zone.y)}" width="${n2(zone.l)}" height="${n2(zone.h)}" preserveAspectRatio="xMidYMid meet"/>`
      + (motsEcrits ? mot(f.mot) : "");
    case "nombre":
      return cadre + (f.points
        ? POINTS[f.n].map(([u, v]) => `<circle cx="${n2(x + u * s)}" cy="${n2(y + v * s)}" r="${n2(s * 0.08)}" fill="${NOIR}"/>`).join("")
        : `<text x="${n2(x + s / 2)}" y="${n2(y + s * 0.7)}" font-size="${n2(s * 0.58)}" font-weight="800" text-anchor="middle" fill="${NOIR}">${f.n}</text>`);
    case "mot": return cadre + `<text x="${n2(x + s / 2)}" y="${n2(y + s * 0.58)}" font-size="${n2(Math.min(s * 0.26, (s * 1.7) / Math.max(3, f.mot.length)))}" `
      + `font-weight="800" text-anchor="middle" fill="${NOIR}">${escapeHtml(f.mot)}</text>`;
  }
}

/**
 * Le patron en croix : en haut, la ligne gauche-centre-droite, puis le bas et
 * tout en bas, et sept languettes grises — une par arête à coller.
 */
export function patronDuDe(faces: Face[], s: number, motsEcrits: boolean): string {
  const t = s * 0.2;
  const places: [number, number][] = [[t + s, t], [t, t + s], [t + s, t + s], [t + 2 * s, t + s], [t + s, t + 2 * s], [t + s, t + 3 * s]];
  // Une languette sur l'arête de (x1, y1) à (x2, y2), vers l'extérieur (nx, ny).
  const languette = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    const l = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / l, dy = (y2 - y1) / l, k = t * 0.7;
    const pts = [[x1, y1], [x1 + nx * t + dx * k, y1 + ny * t + dy * k], [x2 + nx * t - dx * k, y2 + ny * t - dy * k], [x2, y2]];
    return `<path class="de-languette" d="M${pts.map(([a, b]) => `${n2(a)} ${n2(b)}`).join(" L")} Z" fill="#e9ebf2" stroke="#9aa0b4" stroke-width="0.3"/>`;
  };
  const languettes = [
    languette(t + s, t, t + 2 * s, t, 0, -1), languette(t, t + s, t + s, t + s, 0, -1), languette(t + 2 * s, t + s, t + 3 * s, t + s, 0, -1),
    languette(t, t + 2 * s, t + s, t + 2 * s, 0, 1), languette(t + 2 * s, t + 2 * s, t + 3 * s, t + 2 * s, 0, 1),
    languette(t, t + s, t, t + 2 * s, -1, 0), languette(t + 3 * s, t + s, t + 3 * s, t + 2 * s, 1, 0),
  ].join("");
  const l = 3 * s + 2 * t, h = 4 * s + t;
  return `<svg class="de-patron" viewBox="0 0 ${n2(l)} ${n2(h)}" style="width:${n2(l)}mm;height:${n2(h)}mm">${languettes}`
    + faces.map((f, i) => dessinDeLaFace(f, places[i][0], places[i][1], s, motsEcrits)).join("") + "</svg>";
}

/** Les six cartes d'un dé à pochettes, à découper en suivant les pointillés. */
const cartesDuDe = (faces: Face[], s: number, motsEcrits: boolean) =>
  `<div class="de-cartes">${faces.map((f) => `<svg class="de-carte" viewBox="0 0 ${s} ${s}" style="width:${s}mm;height:${s}mm">${dessinDeLaFace(f, 0, 0, s, motsEcrits)}</svg>`).join("")}</div>`;

/** Le titre d'un dé : « Le dé des couleurs » ; numéroté quand il y en a plusieurs. */
export const titreDuDe = (d: Pick<DeAFabriquer, "sorte">, rang: number, combien: number) => {
  const t = SORTES_DE_DES.find((x) => x.id === d.sorte)!.titre;
  return combien > 1 ? `Dé ${rang + 1} — ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t;
};

/** Le jeu « Dessine-moi… » : un dé d'images ou de formes, puis un dé de couleurs. */
export const aLaRegleDuJeu = (r: Pick<ReglagesDes, "des" | "regle">) =>
  r.regle && r.des.length >= 2 && (r.des[0].sorte === "images" || r.des[0].sorte === "formes") && r.des[1].sorte === "couleurs";

/**
 * Les dés, chacun sur sa page — le patron, ou ses six cartes —, puis la
 * règle du jeu quand elle vaut. Un dé sans rien à montrer n'a pas de page.
 */
export function htmlDes(brut: Partial<ReglagesDes>, imagesParDe: ImageDeDe[][]): string {
  const r = reglagesDesSurs(brut);
  const s = r.taille * 10;
  const pages = r.des.flatMap((d, i) => {
    const faces = facesDuDe(d, imagesParDe[i] ?? []);
    if (!faces.length) return [];
    const titre = escapeHtml(titreDuDe(d, i, r.des.length));
    return [r.forme === "patron"
      ? `<div class="page"><div class="titre">${titre}</div>
        <div class="regle">Je découpe le patron en suivant le contour. Je plie sur chaque trait. Je colle les languettes grises à l'intérieur du dé.</div>
        <div class="de-place">${patronDuDe(faces, s, r.motsEcrits)}</div></div>`
      : `<div class="page"><div class="titre">${titre} — les faces</div>
        <div class="regle">Je découpe les six cartes en suivant les pointillés. Je glisse chacune dans une pochette du dé.</div>${cartesDuDe(faces, s, r.motsEcrits)}</div>`];
  });
  if (!pages.length) return "";
  // La règle est ce que la page montre, pas sa consigne : elle s'imprime même quand les consignes partent aux tablettes.
  const regle = aLaRegleDuJeu(r) && pages.length >= 2
    ? `<div class="page"><div class="titre">Le jeu : dessine-moi…</div>
      <ol class="de-regle"><li>Je lance les deux dés.</li><li>Je dessine ce que montre le premier dé, de la couleur que montre le deuxième.</li></ol></div>`
    : "";
  return feuille(pages.join("") + regle, "de");
}

export const STYLE_DES = `
  .feuille.de .de-place { display: flex; justify-content: center; margin-top: 6mm; }
  .feuille.de svg { display: block; }
  .feuille.de svg text { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .feuille.de .de-cartes { display: flex; flex-wrap: wrap; justify-content: center; gap: 0; margin-top: 6mm; }
  .feuille.de .de-carte { outline: 0.3mm dashed #9aa0b4; break-inside: avoid; page-break-inside: avoid; }
  .feuille.de .de-regle { font-size: 22px; line-height: 1.7; margin-top: 10mm; padding-left: 9mm; }
`;
