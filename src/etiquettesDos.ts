// Les étiquettes de dos des classeurs : une par matière ou par domaine, à ses couleurs.
//
// Les couleurs sont celles que l'enseignant a choisies dans les réglages
// (Couleurs des matières) : le classeur de mathématiques prend la couleur des
// créneaux de mathématiques, de leurs séquences, de leurs fiches. Le nom se
// lit de bas en haut, comme sur le dos d'un livre, à la plus grande taille
// qui tient ; en haut, la classe et l'année. Le porte-étiquette d'un
// classeur à levier mesure 61 × 192 mm (dos de 8 cm) ou 38 × 192 mm (dos de
// 5 cm) ; sinon, on mesure le sien.

import { escapeHtml } from "./print";

export interface FormatDos { id: string; nom: string; largeur: number; hauteur: number }

export const FORMATS_DOS: FormatDos[] = [
  { id: "levier80", nom: "Classeur à levier, dos de 8 cm", largeur: 61, hauteur: 192 },
  { id: "levier50", nom: "Classeur à levier, dos de 5 cm", largeur: 38, hauteur: 192 },
  { id: "mesure", nom: "Sur mesure", largeur: 30, hauteur: 150 },
];

/** Une étiquette : le nom écrit au dos, et sa couleur. */
export interface EtiquetteDos { texte: string; couleur: string }

export interface ReglagesDos {
  format: string;
  /** Sur mesure : en mm. */
  largeur: number;
  hauteur: number;
  /** Les matières, domaines ou intitulés cochés, dans l'ordre où on les a cochés. */
  choisies: string[];
  /** Des étiquettes en plus, avec leur couleur : « Évaluations », « Cahier de liaison ». */
  autres: EtiquetteDos[];
  /** Ce qui s'écrit en haut de chaque étiquette : « CE1 · 2026-2027 ». */
  haut: string;
}

export const REGLAGES_DOS: ReglagesDos = { format: "levier50", largeur: 30, hauteur: 150, choisies: [], autres: [], haut: "" };

const LIMITES = { largeur: [15, 90], hauteur: [60, 255] } as const;
const borne = (v: unknown, [min, max]: readonly [number, number], defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : defaut;
const COULEUR = /^#[0-9a-f]{6}$/i;

/** Les réglages enregistrés, réparés. */
export function reglagesSurs(brut: Partial<ReglagesDos>): ReglagesDos {
  const d = REGLAGES_DOS;
  return {
    format: FORMATS_DOS.some((f) => f.id === brut.format) ? (brut.format as string) : d.format,
    largeur: borne(brut.largeur, LIMITES.largeur, d.largeur),
    hauteur: borne(brut.hauteur, LIMITES.hauteur, d.hauteur),
    choisies: Array.isArray(brut.choisies) ? [...new Set(brut.choisies.filter((m): m is string => typeof m === "string" && m.trim() !== ""))] : [],
    autres: Array.isArray(brut.autres)
      ? brut.autres.filter((e): e is EtiquetteDos => Boolean(e) && typeof e.texte === "string" && typeof e.couleur === "string" && COULEUR.test(e.couleur))
      : [],
    haut: typeof brut.haut === "string" ? brut.haut : d.haut,
  };
}

/** Les mesures de l'étiquette, en mm : celles du format, ou celles qu'on a prises. */
export function mesures(r: ReglagesDos): { largeur: number; hauteur: number } {
  const f = FORMATS_DOS.find((x) => x.id === r.format);
  return f && f.id !== "mesure" ? { largeur: f.largeur, hauteur: f.hauteur } : { largeur: r.largeur, hauteur: r.hauteur };
}

/** Le nom d'un domaine sans son numéro : « 1. Mobiliser le langage… » s'écrit « Mobiliser le langage… ». */
export const nomAuDos = (m: string) => m.replace(/^\s*\d+\s*[.)–-]\s*/, "").trim();

/**
 * La taille du nom, en mm, pour qu'il tienne dans la longueur de l'étiquette
 * sur aussi peu de lignes que possible : grand quand il est court, sur deux
 * ou trois lignes quand il est long et que l'étiquette est large.
 */
export function tailleDuNom(texte: string, longueur: number, epaisseur: number): number {
  const n = Math.max(1, texte.trim().length);
  for (let f = Math.min(16, epaisseur * 0.62); f > 4; f -= 0.5) {
    // Une lettre prend un peu plus d'une demi-hauteur ; les mots ne se coupent pas : on garde de la marge.
    const lignes = Math.ceil((0.62 * f * n) / (longueur * 0.9));
    if (lignes * 1.18 * f <= epaisseur) return f;
  }
  return 4;
}

/** Du texte clair sur une couleur foncée, foncé sur une couleur claire. */
export function encreSur(fond: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fond.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#1c2233" : "#ffffff";
}

/** Combien d'étiquettes par page A4, posée en hauteur : autant qu'il en tient côte à côte, sur une ou deux rangées. */
export function parPage(largeur: number, hauteur: number): { colonnes: number; rangees: number } {
  const ECART = 4;
  return {
    colonnes: Math.max(1, Math.floor((165 + ECART) / (largeur + ECART))),
    rangees: Math.max(1, Math.floor((250 + ECART) / (hauteur + ECART))),
  };
}

/** La planche des étiquettes, page par page : chacune à découper le long de son pointillé. */
export function htmlEtiquettesDos(etiquettes: EtiquetteDos[], r: ReglagesDos): string {
  const { largeur, hauteur } = mesures(r);
  const haut = r.haut.trim();
  const tete = haut ? Math.min(22, Math.max(9, hauteur * 0.1)) : 0;
  const { colonnes, rangees } = parPage(largeur, hauteur);
  const une = (e: EtiquetteDos) => {
    const texte = e.texte.trim() || "…";
    const longueur = hauteur - tete - 8;
    const taille = tailleDuNom(texte, longueur, largeur - 6);
    return `<div class="dos" style="width:${largeur}mm;height:${hauteur}mm;background:${e.couleur};color:${encreSur(e.couleur)}">`
      + (haut ? `<div class="dos-haut" style="height:${tete}mm;font-size:${Math.min(4.2, largeur * 0.12).toFixed(1)}mm">${escapeHtml(haut)}</div>` : "")
      + `<div class="dos-nom" style="height:${longueur}mm;font-size:${taille}mm">${escapeHtml(texte)}</div></div>`;
  };
  const pages: string[] = [];
  const n = colonnes * rangees;
  for (let i = 0; i < Math.max(1, etiquettes.length); i += n) {
    pages.push(`<div class="page"><div class="dos-planche" style="grid-template-columns:repeat(${colonnes}, ${largeur}mm);grid-auto-rows:${hauteur}mm">`
      + etiquettes.slice(i, i + n).map(une).join("") + `</div></div>`);
  }
  return `<div class="feuille dos-feuille">${pages.join("")}</div>`;
}

export const STYLE_DOS = `
  .dos-feuille .page { page-break-after: always; break-after: page; }
  .dos-feuille .page:last-child { page-break-after: auto; break-after: auto; }
  .dos-planche { display: grid; gap: 4mm; justify-content: center; }
  .dos { box-sizing: border-box; border: 0.3mm dashed #6b7280; display: flex; flex-direction: column; align-items: stretch; overflow: hidden;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .dos-haut { flex: none; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700; line-height: 1.1;
    background: rgba(255, 255, 255, 0.92); color: #1c2233; padding: 0 1mm; border-bottom: 0.3mm solid rgba(0, 0, 0, 0.15); }
  .dos-nom { flex: none; margin: 4mm auto; writing-mode: vertical-rl; transform: rotate(180deg); display: flex; align-items: center;
    justify-content: center; text-align: center; font-weight: 800; line-height: 1.12; letter-spacing: 0.02em; overflow: hidden; }
`;
