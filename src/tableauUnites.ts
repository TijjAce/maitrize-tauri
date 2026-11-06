// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les unités de mesure ──────────────────────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). Au cycle 2, « les élèves
// n'utilisent pas de tableaux de conversion », ils s'appuient sur les
// relations connues entre les unités (programme de mathématiques du cycle 2,
// CE2) : l'affiche les écrit, celles du CE1 — 1 m = 100 cm, 1 km = 1 000 m,
// 1 kg = 1 000 g — puis celles du CE2 — 1 cm = 10 mm, 1 m = 1 000 mm, 1 t =
// 1 000 kg, 1 L = 10 dL et 100 cL. Au cours moyen, « un tableau peut être
// utilisé pour présenter les différentes unités multiples et sous-multiples
// du mètre, du gramme ou du litre et leurs relations », mais pas pour
// convertir (programme du cycle 3, CM1 et CM2) : le tableau présente chaque
// unité, son nom et ce qu'elle vaut.

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type NiveauUnites = "CE1" | "CE2" | "CM";
export type Grandeur = "longueurs" | "masses" | "contenances";

export const GRANDEURS: { id: Grandeur; nom: string; picto: string }[] = [
  { id: "longueurs", nom: "Les longueurs", picto: "mètre" },
  { id: "masses", nom: "Les masses", picto: "balance" },
  { id: "contenances", nom: "Les contenances", picto: "verre doseur" },
];

const M = " "; // les milliers ne se séparent pas de leur nombre
/** Les relations que le programme du cycle 2 fait connaître, année par année. */
export const RELATIONS: Record<"CE1" | "CE2", Record<Grandeur, string[]>> = {
  CE1: { longueurs: ["1 m = 100 cm", `1 km = 1${M}000 m`], masses: [`1 kg = 1${M}000 g`], contenances: [] },
  CE2: {
    longueurs: [`1 km = 1${M}000 m`, "1 m = 10 dm", "1 m = 100 cm", "1 dm = 10 cm", "1 cm = 10 mm", `1 m = 1${M}000 mm`],
    masses: [`1 t = 1${M}000 kg`, `1 kg = 1${M}000 g`],
    contenances: ["1 L = 10 dL", "1 L = 100 cL", "1 dL = 10 cL"],
  },
};

/** Le tableau du cours moyen : chaque unité, son nom, ce qu'elle vaut — sans virgule, la relation dite par l'unité la plus grande. */
export const UNITES_CM: Record<Grandeur, { symbole: string; nom: string; relation: string }[]> = {
  longueurs: [
    { symbole: "km", nom: "kilomètre", relation: `1 km = 1${M}000 m` }, { symbole: "hm", nom: "hectomètre", relation: "1 hm = 100 m" },
    { symbole: "dam", nom: "décamètre", relation: "1 dam = 10 m" }, { symbole: "m", nom: "mètre", relation: "" },
    { symbole: "dm", nom: "décimètre", relation: "1 m = 10 dm" }, { symbole: "cm", nom: "centimètre", relation: "1 m = 100 cm" },
    { symbole: "mm", nom: "millimètre", relation: `1 m = 1${M}000 mm` },
  ],
  masses: [
    { symbole: "kg", nom: "kilogramme", relation: `1 kg = 1${M}000 g` }, { symbole: "hg", nom: "hectogramme", relation: "1 hg = 100 g" },
    { symbole: "dag", nom: "décagramme", relation: "1 dag = 10 g" }, { symbole: "g", nom: "gramme", relation: "" },
    { symbole: "dg", nom: "décigramme", relation: "1 g = 10 dg" }, { symbole: "cg", nom: "centigramme", relation: "1 g = 100 cg" },
    { symbole: "mg", nom: "milligramme", relation: `1 g = 1${M}000 mg` },
  ],
  contenances: [
    { symbole: "hL", nom: "hectolitre", relation: "1 hL = 100 L" }, { symbole: "daL", nom: "décalitre", relation: "1 daL = 10 L" },
    { symbole: "L", nom: "litre", relation: "" }, { symbole: "dL", nom: "décilitre", relation: "1 L = 10 dL" },
    { symbole: "cL", nom: "centilitre", relation: "1 L = 100 cL" }, { symbole: "mL", nom: "millilitre", relation: `1 L = 1${M}000 mL` },
  ],
};
/** Ce que le tableau des masses ne montre pas : la tonne, mille fois le kilogramme. */
export const AU_DELA_CM: Partial<Record<Grandeur, string>> = { masses: `et la tonne : 1 t = 1${M}000 kg` };

export interface ReglagesUnites {
  niveau: NiveauUnites;
  grandeurs: Grandeur[];
  pictos: boolean;
  format: "mur" | "cahier";
}

export const REGLAGES_UNITES: ReglagesUnites = { niveau: "CE2", grandeurs: ["longueurs", "masses", "contenances"], pictos: true, format: "mur" };

export function reglagesUnitesSurs(brut: Partial<ReglagesUnites> | null | undefined): ReglagesUnites {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesUnites>;
  const d = REGLAGES_UNITES;
  const niveau: NiveauUnites = o.niveau === "CE1" || o.niveau === "CM" ? o.niveau : "CE2";
  const connues = new Set(GRANDEURS.map((g) => g.id));
  const grandeurs = Array.isArray(o.grandeurs) ? GRANDEURS.map((g) => g.id).filter((g) => o.grandeurs?.includes(g) && connues.has(g)) : d.grandeurs;
  return { niveau, grandeurs: grandeurs.length ? grandeurs : d.grandeurs, pictos: typeof o.pictos === "boolean" ? o.pictos : d.pictos, format: o.format === "cahier" ? "cahier" : "mur" };
}

/** Les grandeurs qu'on montre : au CE1, le programme n'a pas encore de contenances. */
export const grandeursMontrees = (r: ReglagesUnites) => r.grandeurs.filter((g) => r.niveau !== "CE1" || g !== "contenances");

export const motsADessinerUnites = (brut: Partial<ReglagesUnites>) => {
  const r = reglagesUnitesSurs(brut);
  return r.pictos ? grandeursMontrees(r).map((g) => GRANDEURS.find((x) => x.id === g)!.picto) : [];
};

export function htmlUnites(brut: Partial<ReglagesUnites>, images: Record<string, string> = {}): string {
  const r = reglagesUnitesSurs(brut);
  const vues = r.pictos ? images : {};
  const blocs = grandeursMontrees(r).map((g) => {
    const info = GRANDEURS.find((x) => x.id === g)!;
    const tete = `<div class="tu-tete">${vues[info.picto] ? `<img src="${escapeHtml(vues[info.picto])}" alt="">` : ""}<span>${info.nom}</span></div>`;
    if (r.niveau !== "CM") {
      return `<div class="tu-bloc">${tete}<div class="tu-relations">${RELATIONS[r.niveau][g].map((x) => `<div>${escapeHtml(x)}</div>`).join("")}</div></div>`;
    }
    const unites = UNITES_CM[g];
    const ligne = (f: (u: (typeof unites)[number]) => string, classe: string) =>
      `<tr class="${classe}">${unites.map((u) => `<td${u.relation ? "" : ` class="tu-reference"`}>${f(u)}</td>`).join("")}</tr>`;
    return `<div class="tu-bloc">${tete}<table class="tu-table">${ligne((u) => escapeHtml(u.symbole), "tu-symboles")}${ligne((u) => escapeHtml(u.nom), "tu-noms")}`
      + `${ligne((u) => escapeHtml(u.relation || "l'unité"), "tu-valeurs")}</table>${AU_DELA_CM[g] ? `<div class="tu-plus">${escapeHtml(AU_DELA_CM[g]!)}</div>` : ""}</div>`;
  }).join("");
  const page = `<div class="tu-page tu-${r.niveau === "CM" ? "cm" : "c2"}"><div class="tu-titre">Les unités de mesure</div>${blocs}</div>`;
  const credit = Object.keys(vues).length && motsADessinerUnites(r).some((m) => vues[m]) ? ATTRIBUTION_ARASAAC : "";
  if (r.format === "cahier") return feuille(`<div class="page tu-planche">${`<div class="tu-petit">${page}</div>`.repeat(4)}</div>${credit}`, "tu");
  return feuille(page.replace(`<div class="tu-page`, `<div class="page tu-page`) + credit, "tu");
}

export const titreUnites = (brut: Partial<ReglagesUnites>) => `Les unités de mesure (${reglagesUnitesSurs(brut).niveau})`;

const NOIR = "#1c2233";
const BLEU = "#2a6fd6";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_UNITES = `
  @media print { body { padding: 0; } }
  .feuille.tu { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.tu .tu-page { width: 182mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.tu .tu-titre { font-size: 8.5mm; font-weight: 800; text-align: center; line-height: 1.2; margin: 0 0 5mm; }
  .feuille.tu .tu-bloc { border: 0.6mm solid #cfd4e2; border-radius: 3mm; padding: 4mm; margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.tu .tu-tete { display: flex; align-items: center; gap: 3mm; font-size: 6.5mm; font-weight: 800; color: ${BLEU}; margin: 0 0 3mm; }
  .feuille.tu .tu-tete img { width: 16mm; height: 16mm; object-fit: contain; margin: 0; }
  .feuille.tu .tu-relations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm 8mm; font-size: 8mm; font-weight: 800; padding: 0 4mm; }
  .feuille.tu .tu-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .feuille.tu .tu-table td { border: 0.5mm solid #6b7186; text-align: center; vertical-align: middle; padding: 1.5mm 0.5mm; }
  .feuille.tu .tu-symboles td { font-size: 8mm; font-weight: 800; }
  .feuille.tu .tu-noms td { font-size: 3.6mm; font-weight: 600; }
  .feuille.tu .tu-valeurs td { font-size: 3.4mm; color: #4a5068; }
  .feuille.tu .tu-table td.tu-reference { background: #fff6cf; color: ${NOIR}; }
  .feuille.tu .tu-plus { font-size: 4.2mm; margin: 2mm 0 0; color: #4a5068; }
  .feuille.tu .tu-planche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr));
    width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.tu .tu-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden; padding-top: 6mm; }
`;
