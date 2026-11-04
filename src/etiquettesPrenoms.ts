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

import { feuille } from "./cartesImprimables";
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
}

export const REGLAGES_ETIQUETTES_PRENOMS: ReglagesEtiquettesPrenoms = { ecritures: ["capitales", "script", "cursive"], photo: false, taille: "grandes" };

export function reglagesEtiquettesPrenomsSurs(brut: Partial<ReglagesEtiquettesPrenoms> | null | undefined): ReglagesEtiquettesPrenoms {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesEtiquettesPrenoms>;
  const d = REGLAGES_ETIQUETTES_PRENOMS;
  const ecritures = Array.isArray(o.ecritures) ? ECRITURES_PRENOM.map((e) => e.id).filter((e) => o.ecritures?.includes(e)) : d.ecritures;
  return { ecritures: ecritures.length ? ecritures : d.ecritures, photo: typeof o.photo === "boolean" ? o.photo : d.photo, taille: o.taille === "petites" ? "petites" : "grandes" };
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

export function htmlEtiquettesPrenoms(prenoms: string[], brut: Partial<ReglagesEtiquettesPrenoms>): string {
  const r = reglagesEtiquettesPrenomsSurs(brut);
  const f = FORMATS[r.taille];
  if (!prenoms.length) return feuille(`<div class="page ep-page"><div class="ep-vide">Écrivez un prénom par ligne, ou reprenez la liste de la classe.</div></div>`, "ep");
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

export const titreEtiquettesPrenoms = () => "Les étiquettes des prénoms";

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
`;
