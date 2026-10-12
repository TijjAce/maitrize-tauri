// Un même picto, de toutes les tailles.
//
// Le picto du classeur de communication ne se pose pas à la même taille que
// celui de l'emploi du temps, de la porte de la classe ou du porte-clés : on
// l'imprime une fois à toutes les mesures, et l'on découpe celle qu'il faut.
// La taille est le côté de la carte carrée, trait de découpe compris.

import { CREDIT_ARASAAC, feuille } from "./cartesImprimables";
import { mentionDeMesPictos } from "./mesPictos";
import { escapeHtml } from "./print";
import { cleImage, estVide, normaliserPicto, pictoVide, type Images, type PictoPose } from "./supportsVisuels";

/** Les tailles proposées, en mm : de la plus petite qui se découpe à la plus grande qui tient deux fois sur la largeur. */
export const TAILLES_PLANCHE_MM = [15, 20, 25, 30, 40, 50, 60, 70, 80, 100];
export const PICTOS_PLANCHE_MAX = 8;
export const EXEMPLAIRES_PLANCHE_MAX = 12;

export interface ReglagesPlanche {
  /** Les pictos, chacun sur sa planche — ou des photos d'objets. */
  pictos: PictoPose[];
  /** Les côtés des cartes, en mm, du plus grand au plus petit. */
  tailles: number[];
  /** Combien de cartes de chaque taille. */
  exemplaires: number;
  /** Écrire le mot sous le picto. */
  mot: boolean;
  capitales: boolean;
  /** Un cadre arrondi, plutôt que le seul pointillé de découpe. */
  cadre: boolean;
}

export const PLANCHE_PAR_DEFAUT: ReglagesPlanche = {
  pictos: [pictoVide()], tailles: [80, 60, 50, 40, 30, 20], exemplaires: 1, mot: true, capitales: false, cadre: false,
};

/** « 1,5 cm », « 4 cm ». */
export const libelleTaille = (mm: number) => `${(mm / 10).toLocaleString("fr-FR")} cm`;

const booleen = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);

/** Les réglages, d'où qu'ils viennent : une version plus ancienne, l'autre ordinateur, une main maladroite. */
export function normaliserPlanche(brut: unknown): ReglagesPlanche {
  const o = brut && typeof brut === "object" && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  const d = PLANCHE_PAR_DEFAUT;
  const pictos = Array.isArray(o.pictos) ? o.pictos.slice(0, PICTOS_PLANCHE_MAX).map(normaliserPicto) : d.pictos.map((p) => ({ ...p }));
  const tailles = Array.isArray(o.tailles)
    ? [...new Set(o.tailles.filter((t): t is number => typeof t === "number" && TAILLES_PLANCHE_MM.includes(t)))]
    : [...d.tailles];
  const exemplaires = typeof o.exemplaires === "number" && Number.isFinite(o.exemplaires)
    ? Math.max(1, Math.min(EXEMPLAIRES_PLANCHE_MAX, Math.round(o.exemplaires))) : d.exemplaires;
  return {
    pictos: pictos.length ? pictos : [pictoVide()],
    tailles: tailles.sort((a, b) => b - a),
    exemplaires,
    mot: booleen(o.mot, d.mot),
    capitales: booleen(o.capitales, d.capitales),
    cadre: booleen(o.cadre, d.cadre),
  };
}

/** Les pictos qui s'impriment : ceux qui ont une image ou un mot. */
export const pictosDeLaPlanche = (r: ReglagesPlanche) => r.pictos.filter((p) => !estVide(p));

/** Combien de cartes en tout. */
export const nombreDeCartes = (r: ReglagesPlanche) => pictosDeLaPlanche(r).length * r.tailles.length * r.exemplaires;

/** La mention des pictogrammes posés : ARASAAC pour les siens, et celle de Mes pictos ; rien pour des photos seules. */
function mention(pictos: PictoPose[]): string {
  const ids = pictos.filter((p) => !p.photo && p.id != null).map((p) => p.id);
  const miens = mentionDeMesPictos(ids);
  return (ids.some((id) => id != null && id >= 0) ? `<div class="attribution">${CREDIT_ARASAAC}</div>` : "")
    + (miens ? `<div class="attribution">${escapeHtml(miens)}</div>` : "");
}

/**
 * Les planches : pour chaque picto, ses cartes de la plus grande à la plus
 * petite, autant de chaque taille qu'on en demande. Les cartes s'enchaînent
 * d'une page à l'autre sans jamais se couper.
 */
export function htmlPlanche(r: ReglagesPlanche, images: Images): string {
  const pictos = pictosDeLaPlanche(r);
  if (!pictos.length || !r.tailles.length) {
    const quoi = !pictos.length ? "Choisissez un picto : il s'imprime ici à toutes les tailles cochées." : "Cochez au moins une taille.";
    return feuille(`<div class="page"><div class="sous">${quoi}</div></div>`, "pp");
  }
  const carte = (p: PictoPose, mm: number) => {
    const cle = cleImage(p);
    const src = cle !== null ? images[cle] : undefined;
    const mot = p.mot.trim();
    const image = src ? `<img src="${src}" alt="${escapeHtml(mot)}">` : `<span class="pp-manque">${escapeHtml(mot || "?")}</span>`;
    return `<div class="pp-carte" style="--c: ${mm}mm">${image}${r.mot && mot && src ? `<div class="pp-mot">${escapeHtml(mot)}</div>` : ""}</div>`;
  };
  const groupes = pictos.map((p) => `<div class="pp-groupe">`
    + r.tailles.flatMap((mm) => Array.from({ length: r.exemplaires }, () => carte(p, mm))).join("") + `</div>`);
  const classes = ["pp-planche", r.cadre && "pp-cadre", r.capitales && "pp-capitales"].filter(Boolean).join(" ");
  return feuille(`<div class="${classes}">${groupes.join("")}</div>${mention(pictos)}`, "pp");
}

/** La page : en hauteur, des marges étroites, pour que les grandes cartes tiennent. */
export const STYLE_PLANCHE = `
  @page { size: A4 portrait; margin: 10mm; }
  @media print { body { padding: 0; } }
  .feuille.pp .pp-planche { display: flex; flex-direction: column; gap: 5mm; }
  .feuille.pp .pp-groupe { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 3mm; }
  .feuille.pp .pp-groupe + .pp-groupe { border-top: 1px solid #e3e6ef; padding-top: 5mm; }
  .feuille.pp .pp-carte { width: var(--c); height: var(--c); box-sizing: border-box; border: 1px dashed #9aa0b4;
    padding: calc(var(--c) * 0.07); display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: calc(var(--c) * 0.03); overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .feuille.pp .pp-cadre .pp-carte { border: 0.5mm solid #333; border-radius: calc(var(--c) * 0.1); }
  .feuille.pp .pp-carte img { flex: 1 1 0; min-height: 0; width: 100%; object-fit: contain; margin: 0; max-height: none; }
  .feuille.pp .pp-mot { flex: none; max-width: 100%; font-size: calc(var(--c) * 0.13); font-weight: 700; line-height: 1.1;
    text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .feuille.pp .pp-capitales .pp-mot { text-transform: uppercase; }
  .feuille.pp .pp-manque { flex: 1 1 0; align-self: stretch; display: flex; align-items: center; justify-content: center; text-align: center;
    border: 1.5px dashed #c4c9d6; border-radius: 2mm; color: #9aa0b4; font-weight: 700; font-size: calc(var(--c) * 0.12); }
`;
