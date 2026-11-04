// ── Les étiquettes des prénoms ────────────────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). « L'écriture à l'école
// maternelle » (Éduscol, 2015) range la liste des élèves, en listes et en
// étiquettes, parmi les affichages incontournables (p. 21) ; en moyenne
// section, la correspondance entre capitales et script s'appuie sur les
// étiquettes des prénoms (p. 8), et la cursive se généralise ensuite avec le
// prénom (p. 13). Le programme de l'école maternelle fait utiliser l'étiquette
// de son prénom pour marquer sa présence (p. 13). Chaque étiquette écrit le
// prénom dans les écritures choisies — capitales, script, cursive de la
// classe —, avec une place pour la photo si l'on veut.
//
// Les prénoms viennent de la liste de la classe, au moment d'imprimer : ils
// ne sont gardés nulle part ailleurs.
//
// L'atelier fait aussi, pour chaque élève, la fiche des lettres de son prénom
// (demande de l'enseignant, 4 novembre 2026 : « ajoute encore des ateliers
// autonomes ») : son prénom en capitales pour modèle, et des cases où il
// colorie chacune de ses lettres, parmi d'autres. Le programme fait
// « reconnaitre et nommer certaines lettres de son prénom écrit en
// capitales » avant 4 ans, puis « nommer les lettres de son prénom » (p. 13) :
// douze grandes cases en petite section, vingt en moyenne.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { POLICE_CURSIVE, tailleCursive } from "./policesEcriture";
import { escapeHtml } from "./print";

export type EcriturePrenom = "capitales" | "script" | "cursive";
export const ECRITURES_PRENOM: { id: EcriturePrenom; nom: string }[] = [
  { id: "capitales", nom: "Capitales" }, { id: "script", nom: "Script" }, { id: "cursive", nom: "Cursive" },
];

export interface ReglagesEtiquettesPrenoms {
  ecritures: EcriturePrenom[];
  photo: boolean;
  /** Grandes : huit par page, pour la présence ou le portemanteau ; petites : vingt-quatre, pour les casiers et les cahiers. */
  taille: "grandes" | "petites";
  /** Des étiquettes ; ou, pour chaque élève, la fiche où il retrouve les lettres de son prénom. */
  forme: "etiquettes" | "lettres";
  /** Les cases de cette fiche : douze en petite section, vingt en moyenne. */
  cases: 12 | 20;
  /** Le tirage des cases. */
  graine: number;
}

export const REGLAGES_ETIQUETTES_PRENOMS: ReglagesEtiquettesPrenoms = {
  ecritures: ["capitales", "script", "cursive"], photo: false, taille: "grandes", forme: "etiquettes", cases: 12, graine: 0,
};

export function reglagesEtiquettesPrenomsSurs(brut: Partial<ReglagesEtiquettesPrenoms> | null | undefined): ReglagesEtiquettesPrenoms {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesEtiquettesPrenoms>;
  const d = REGLAGES_ETIQUETTES_PRENOMS;
  const ecritures = Array.isArray(o.ecritures) ? ECRITURES_PRENOM.map((e) => e.id).filter((e) => o.ecritures?.includes(e)) : d.ecritures;
  return {
    ecritures: ecritures.length ? ecritures : d.ecritures, photo: typeof o.photo === "boolean" ? o.photo : d.photo, taille: o.taille === "petites" ? "petites" : "grandes",
    forme: o.forme === "lettres" ? "lettres" : "etiquettes", cases: o.cases === 20 ? 20 : 12,
    graine: Number.isFinite(o.graine) ? Math.trunc(Number(o.graine)) : d.graine,
  };
}

/** Les prénoms d'une saisie, un par ligne, sans doublon, dans l'ordre alphabétique. */
export const lirePrenoms = (saisie: string) =>
  [...new Set(saisie.split("\n").map((p) => p.trim()).filter(Boolean))].slice(0, 60).sort((a, b) => a.localeCompare(b, "fr"));

const FORMATS = {
  grandes: { colonnes: 2, rangees: 4, largeur: 89, capitales: 9, script: 8, x: 3 },
  petites: { colonnes: 3, rangees: 8, largeur: 58.6, capitales: 5.6, script: 5, x: 1.5 },
};

/** La réduction d'un long prénom, pour qu'il tienne en capitales sur la largeur de l'étiquette. */
export function reductionDuPrenom(prenom: string, taille: "grandes" | "petites", photo: boolean): number {
  const f = FORMATS[taille];
  const place = f.largeur - 8 - (photo ? (taille === "grandes" ? 30 : 18) : 0);
  return Math.min(1, place / Math.max(1, prenom.length * 0.82 * f.capitales));
}

/** Les lettres d'un prénom, en capitales, chacune une fois, dans l'ordre : ce que l'élève cherche. */
export function lettresDuPrenom(prenom: string): string[] {
  return [...new Set([...prenom.toLocaleUpperCase("fr-FR")].filter((c) => /\p{L}/u.test(c)))];
}

const sansAccent = (c: string) => c.normalize("NFD").replace(/\p{M}/gu, "");

/** Une case de la fiche : sa lettre, et si elle est du prénom. */
export interface CaseDuPrenom { lettre: string; aColorier: boolean }

/** Les cases qui ne sont pas du prénom, au moins : sans elles, il n'y a rien à distinguer. */
export const PIEGES_MINIMUM: Record<12 | 20, number> = { 12: 4, 20: 6 };

/**
 * Les cases de la fiche : chaque lettre du prénom au moins une fois — deux
 * fois quand la place le permet, en moyenne section —, puis des lettres qui
 * n'en sont pas, jamais la même sans son accent : qui cherche le É ne doit pas
 * se demander s'il colorie le E. Un très long prénom garde ses premières
 * lettres : il faut laisser la place des autres.
 */
export function casesDuPrenom(prenom: string, cases: 12 | 20, graine: number): CaseDuPrenom[] {
  const alea = hasard(graine * 7919 + prenom.length + 1);
  const cibles = lettresDuPrenom(prenom).slice(0, cases - PIEGES_MINIMUM[cases]);
  const voulues = cases === 20 ? Math.max(cibles.length, Math.min(cases / 2, cibles.length * 2)) : cibles.length;
  const aColorier = [...cibles, ...melanger(alea, cibles)].slice(0, voulues);
  const bases = new Set(cibles.map(sansAccent));
  const autres = melanger(alea, [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((c) => !bases.has(c)));
  const pieges = Array.from({ length: cases - aColorier.length }, (_, i) => autres[i % autres.length]);
  return melanger(alea, [...aColorier.map((lettre) => ({ lettre, aColorier: true })), ...pieges.map((lettre) => ({ lettre, aColorier: false }))]);
}

/** La fiche d'un élève : son prénom pour modèle, et les cases où il colorie ses lettres. */
function ficheDesLettres(prenom: string, r: ReglagesEtiquettesPrenoms, graine: number): string {
  const capitales = prenom.toLocaleUpperCase("fr-FR");
  const k = Math.min(1, 150 / Math.max(1, capitales.length * 0.9 * 16)).toFixed(3);
  const cases = casesDuPrenom(prenom, r.cases, graine).map((c) => `<div class="ep-case">${escapeHtml(c.lettre)}</div>`).join("");
  return `<div class="page ep-page ep-lettres ep-lettres-${r.cases}"><div class="ep-titre">Les lettres de mon prénom</div>`
    + `<p class="consigne">Je regarde mon prénom. Je colorie les cases où je trouve ses lettres.</p>`
    + `<div class="ep-modele" style="--ep-k: ${k}">${escapeHtml(capitales)}</div><div class="ep-grille">${cases}</div></div>`;
}

export function htmlEtiquettesPrenoms(prenoms: string[], brut: Partial<ReglagesEtiquettesPrenoms>): string {
  const r = reglagesEtiquettesPrenomsSurs(brut);
  const f = FORMATS[r.taille];
  if (!prenoms.length) return feuille(`<div class="page ep-page"><div class="ep-vide">Écrivez un prénom par ligne, ou reprenez la liste de la classe.</div></div>`, "ep");
  if (r.forme === "lettres") return feuille(prenoms.map((p, i) => ficheDesLettres(p, r, r.graine + i)).join(""), "ep");
  const etiquette = (p: string) => {
    const k = reductionDuPrenom(p, r.taille, r.photo).toFixed(3);
    const lignes = r.ecritures.map((e) => `<div class="ep-${e}">${escapeHtml(e === "capitales" ? p.toLocaleUpperCase("fr-FR") : p)}</div>`).join("");
    return `<div class="ep-etiquette" style="--ep-k: ${k}">${r.photo ? `<div class="ep-photo"></div>` : ""}<div class="ep-ecritures">${lignes}</div></div>`;
  };
  const parPage = f.colonnes * f.rangees;
  const pages: string[] = [];
  for (let i = 0; i < prenoms.length; i += parPage) {
    pages.push(`<div class="page ep-page ep-${r.taille}">${prenoms.slice(i, i + parPage).map(etiquette).join("")}</div>`);
  }
  return feuille(pages.join(""), "ep");
}

export const titreEtiquettesPrenoms = (brut?: Partial<ReglagesEtiquettesPrenoms>) =>
  (reglagesEtiquettesPrenomsSurs(brut).forme === "lettres" ? "Les lettres de mon prénom" : "Les étiquettes des prénoms");

/** Le style des étiquettes ; la cursive seulement quand on l'a choisie : un document qui la nomme emporte sa police. */
export const styleEtiquettesPrenoms = (brut: Partial<ReglagesEtiquettesPrenoms>) => STYLE_ETIQUETTES_PRENOMS
  + (reglagesEtiquettesPrenomsSurs(brut).ecritures.includes("cursive") ? `
  .feuille.ep .ep-cursive { font-family: ${POLICE_CURSIVE}; font-weight: 400; font-size: calc(${tailleCursive(FORMATS.grandes.x, "mm")} * var(--ep-k, 1));
    line-height: calc(${FORMATS.grandes.x * 6}mm * var(--ep-k, 1)); white-space: nowrap; }
  .feuille.ep .ep-petites .ep-cursive { font-size: calc(${tailleCursive(FORMATS.petites.x, "mm")} * var(--ep-k, 1)); line-height: calc(${FORMATS.petites.x * 6}mm * var(--ep-k, 1)); }` : "");

const NOIR = "#1c2233";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_ETIQUETTES_PRENOMS = `
  @media print { body { padding: 0; } }
  .feuille.ep { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.ep .ep-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: grid; gap: 4mm; }
  .feuille.ep .ep-grandes { grid-template-columns: repeat(${FORMATS.grandes.colonnes}, minmax(0, 1fr)); grid-template-rows: repeat(${FORMATS.grandes.rangees}, minmax(0, 1fr)); }
  .feuille.ep .ep-petites { grid-template-columns: repeat(${FORMATS.petites.colonnes}, minmax(0, 1fr)); grid-template-rows: repeat(${FORMATS.petites.rangees}, minmax(0, 1fr)); gap: 2mm; }
  .feuille.ep .ep-etiquette { border: 0.6mm dashed #9aa0b4; border-radius: 3mm; display: flex; align-items: center; gap: 3mm; padding: 2mm 4mm;
    box-sizing: border-box; min-height: 0; overflow: hidden; }
  .feuille.ep .ep-photo { flex: none; width: 24mm; height: 30mm; border: 0.5mm dashed #9aa0b4; border-radius: 2mm; }
  .feuille.ep .ep-petites .ep-photo { width: 14mm; height: 18mm; }
  .feuille.ep .ep-ecritures { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .feuille.ep .ep-capitales { font-size: calc(${FORMATS.grandes.capitales}mm * var(--ep-k, 1)); font-weight: 800; line-height: 1.15; letter-spacing: 0.04em; white-space: nowrap; }
  .feuille.ep .ep-script { font-size: calc(${FORMATS.grandes.script}mm * var(--ep-k, 1)); font-weight: 600; line-height: 1.15; white-space: nowrap; }
  .feuille.ep .ep-petites .ep-capitales { font-size: calc(${FORMATS.petites.capitales}mm * var(--ep-k, 1)); }
  .feuille.ep .ep-petites .ep-script { font-size: calc(${FORMATS.petites.script}mm * var(--ep-k, 1)); }
  .feuille.ep .ep-vide { color: #687087; font-size: 5mm; padding: 10mm 0; text-align: center; grid-column: 1 / -1; }
  /* La fiche des lettres du prénom : le modèle encadré, puis les cases à colorier. */
  .feuille.ep .ep-lettres { display: flex; flex-direction: column; gap: 5mm; }
  .feuille.ep .ep-titre { font-size: 7mm; font-weight: 800; text-align: center; }
  .feuille.ep .ep-lettres .consigne { margin: 0; font-size: 4.6mm; font-weight: 600; line-height: 1.4; }
  .feuille.ep .ep-modele { align-self: center; border: 0.8mm solid ${NOIR}; border-radius: 3mm; padding: 3mm 8mm; font-size: calc(16mm * var(--ep-k, 1));
    font-weight: 800; letter-spacing: 0.08em; line-height: 1.2; white-space: nowrap; }
  .feuille.ep .ep-grille { flex: 1; min-height: 0; display: grid; gap: 4mm; }
  .feuille.ep .ep-lettres-12 .ep-grille { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); }
  .feuille.ep .ep-lettres-20 .ep-grille { grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); }
  .feuille.ep .ep-case { border: 0.7mm solid #6b7186; border-radius: 4mm; display: flex; align-items: center; justify-content: center; font-weight: 800;
    min-height: 0; line-height: 1; }
  .feuille.ep .ep-lettres-12 .ep-case { font-size: 26mm; }
  .feuille.ep .ep-lettres-20 .ep-case { font-size: 18mm; }
`;
