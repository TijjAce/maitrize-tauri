// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le tableau des nombres et la frise numérique ──────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026), d'après le guide « Pour
// enseigner les nombres, le calcul et la résolution de problèmes au CP »
// (Éduscol, 2021).
//
// Le tableau des nombres « met en lumière les régularités du système de
// numération écrite chiffrée » : une ligne par dizaine ; on le complète —
// quelques cases vides, des lignes entières —, on y joue aux portraits
// (p. 110). La frise numérique, disposée en ligne, est « un des éléments
// incontournables à mettre en place dans la classe de CP » (p. 109) ; ses
// sept sections s'affichent les unes après les autres et forment une seule
// file, pas un tableau (p. 37) : de 1 à 19, puis vingt, trente, quarante,
// cinquante, soixante — de 60 à 79 — et quatre-vingts — de 80 à 100 —, le
// nom écrit au début de chaque section, d'où l'on compte pour trouver celui
// d'un nombre. Une deuxième frise écrit les nombres en dizaines et unités
// (p. 110). Avec les cubes, ce sont des matériels à mettre à la disposition
// de chaque élève (p. 114) : chacun existe en grand pour le mur et en petit
// pour l'élève.

import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { escapeHtml } from "./print";

const NOIR = "#1c2233";
const BLEU = "#2a6fd6";
const ROUGE = "#d33a32";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
/** Une couleur douce par ligne, ou par section : dix teintes qui se distinguent. */
const TEINTES = ["#fde2e1", "#fdebd3", "#fdf6c9", "#e3f4d7", "#d6f1ee", "#dbeafe", "#e6e1fb", "#f6dff1", "#ececec", "#f9e3cf"];
const TRAITS = ["#e07a74", "#e8a050", "#d9bd2b", "#7cbf55", "#4fb6a9", "#5b8fe0", "#8a76d8", "#cf6fb4", "#9aa0b4", "#d38b4d"];

// ── Le tableau des nombres ──

export type CasesCachees = "aucune" | "quelques" | "moitie" | "lignes";

export interface ReglagesTableauNombres {
  /** 0 : une ligne par dizaine, de 0 à 99 ; 1 : de 1 à 100, chaque ligne finit par la dizaine. */
  depart: 0 | 1;
  /** La première centaine : 0 pour commencer à 0 (ou 1), 3 pour commencer à 300 — une fiche du CE1 sur une centaine plus loin. */
  de: number;
  /** Combien de centaines, une page chacune : jusqu'à 100, jusqu'à 1 000. */
  centaines: number;
  couleurs: boolean;
  /** Les cases à compléter : aucune pour le mur, quelques-unes ou la moitié, ou des lignes entières. */
  caches: CasesCachees;
  graine: number;
  format: "mur" | "cahier";
}

export const REGLAGES_TABLEAU_NOMBRES: ReglagesTableauNombres = { depart: 0, de: 0, centaines: 1, couleurs: true, caches: "aucune", graine: 0, format: "mur" };

export function reglagesTableauNombresSurs(brut: Partial<ReglagesTableauNombres> | null | undefined): ReglagesTableauNombres {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesTableauNombres>;
  const d = REGLAGES_TABLEAU_NOMBRES;
  const de = Number.isFinite(o.de) ? Math.max(0, Math.min(9, Math.round(Number(o.de)))) : d.de;
  // Jamais au-delà de mille : la dernière page est celle de 900 à 999.
  const centaines = Number.isFinite(o.centaines) ? Math.max(1, Math.min(10 - de, Math.round(Number(o.centaines)))) : Math.min(d.centaines, 10 - de);
  return {
    depart: o.depart === 1 ? 1 : 0,
    de,
    centaines,
    couleurs: typeof o.couleurs === "boolean" ? o.couleurs : d.couleurs,
    caches: o.caches === "quelques" || o.caches === "moitie" || o.caches === "lignes" ? o.caches : "aucune",
    graine: Number.isFinite(o.graine) ? Math.trunc(Number(o.graine)) : d.graine,
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Les nombres d'une page : dix lignes de dix, de la centaine `c`. */
export function lignesDuTableau(depart: 0 | 1, c: number): number[][] {
  const debut = c * 100 + depart;
  return Array.from({ length: 10 }, (_, l) => Array.from({ length: 10 }, (_, k) => debut + l * 10 + k));
}

/** Les nombres à cacher sur une page : jamais le premier, qui montre où l'on commence. */
export function nombresCaches(nombres: number[][], caches: CasesCachees, graine: number): Set<number> {
  if (caches === "aucune") return new Set();
  const alea = hasard(graine * 7919 + nombres[0][0] + 1);
  if (caches === "lignes") {
    const lignes = melanger(alea, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    return new Set(lignes.flatMap((l) => nombres[l]));
  }
  const tous = nombres.flat().slice(1);
  return new Set(melanger(alea, tous).slice(0, Math.round(tous.length * (caches === "moitie" ? 0.5 : 0.15))));
}

export function htmlTableauNombres(brut: Partial<ReglagesTableauNombres>): string {
  const r = reglagesTableauNombresSurs(brut);
  const pages: string[] = [];
  for (let c = r.de; c < r.de + r.centaines; c++) {
    const lignes = lignesDuTableau(r.depart, c);
    const caches = nombresCaches(lignes, r.caches, r.graine);
    const premier = lignes[0][0], dernier = lignes[9][9];
    const corps = lignes.map((ligne, l) => `<tr${r.couleurs ? ` style="background: ${TEINTES[l]}"` : ""}>`
      + ligne.map((n) => `<td${n % 10 === 0 ? ` class="tn-rond"` : ""}>${caches.has(n) ? "" : n}</td>`).join("") + `</tr>`).join("");
    pages.push(`<div class="tn-page${dernier >= 100 ? " tn-trois" : ""}"><div class="tn-titre">Le tableau des nombres</div>`
      + `<div class="tn-sous">de ${premier} à ${dernier}</div>`
      // Des cases vides : la feuille d'un élève, qui dit ce qu'on y fait.
      + (caches.size ? `<p class="consigne tn-consigne">J'écris les nombres qui manquent.</p>` : "")
      + `<table class="tn-table">${corps}</table></div>`);
  }
  if (r.format === "cahier") return feuille(pages.map((p) => `<div class="page tn-planche">${`<div class="tn-petit">${p}</div>`.repeat(4)}</div>`).join(""), "tn");
  return feuille(pages.map((p) => p.replace(`<div class="tn-page`, `<div class="page tn-page`)).join(""), "tn");
}

export const titreTableauNombres = (brut: Partial<ReglagesTableauNombres>) => {
  const r = reglagesTableauNombresSurs(brut);
  return `Le tableau des nombres, de ${r.de * 100 + r.depart} à ${(r.de + r.centaines) * 100 - 1 + r.depart}`;
};

export const STYLE_TABLEAU_NOMBRES = `
  @media print { body { padding: 0; } }
  .feuille.tn { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.tn .tn-page { width: 182mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.tn .tn-titre { font-size: 8.5mm; font-weight: 800; text-align: center; line-height: 1.2; }
  .feuille.tn .tn-sous { font-size: 5mm; text-align: center; color: #4a5068; margin: 1mm 0 5mm; }
  .feuille.tn .tn-consigne { margin: 0 0 5mm; font-size: 5mm; font-weight: 600; text-align: center; }
  .feuille.tn .tn-table { border-collapse: collapse; margin: 0 auto; table-layout: fixed; }
  .feuille.tn .tn-table td { width: 17mm; height: 17mm; border: 0.5mm solid #6b7186; text-align: center; vertical-align: middle; padding: 0;
    font-size: 8mm; font-weight: 700; line-height: 1; }
  .feuille.tn .tn-trois .tn-table td { font-size: 6.6mm; }
  .feuille.tn .tn-table td.tn-rond { color: ${BLEU}; font-weight: 800; }
  .feuille.tn .tn-planche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr));
    width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.tn .tn-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden; padding-top: 8mm; }
`;

// ── La frise numérique ──

/** Les sept sections du guide (p. 37), et le nom qu'on lit au début de chacune. */
export const SECTIONS: { debut: number; fin: number; nom: string }[] = [
  { debut: 1, fin: 19, nom: "" }, { debut: 20, fin: 29, nom: "vingt" }, { debut: 30, fin: 39, nom: "trente" },
  { debut: 40, fin: 49, nom: "quarante" }, { debut: 50, fin: 59, nom: "cinquante" }, { debut: 60, fin: 79, nom: "soixante" },
  { debut: 80, fin: 100, nom: "quatre-vingts" },
];

export interface ReglagesFrise {
  depart: 0 | 1;
  /** Le dernier nombre : 30 au début du CP, 100 à la fin. */
  jusqua: number;
  /** Les sept sections du guide, chacune à sa couleur ; sinon une seule file, coupée en bandes de dix. */
  sections: boolean;
  /** Le nom au début de chaque section : vingt, trente… */
  noms: boolean;
  /** La deuxième frise : chaque nombre en dizaines et unités. */
  unites: boolean;
  /** Pour le mur, en bandes à mettre bout à bout ; pour l'élève, en petit, une ligne par section. */
  format: "mur" | "eleve";
}

export const REGLAGES_FRISE: ReglagesFrise = { depart: 1, jusqua: 100, sections: true, noms: true, unites: false, format: "mur" };

export function reglagesFriseSurs(brut: Partial<ReglagesFrise> | null | undefined): ReglagesFrise {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesFrise>;
  const d = REGLAGES_FRISE;
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    depart: o.depart === 0 ? 0 : 1,
    jusqua: Number.isFinite(o.jusqua) ? Math.max(10, Math.min(100, Math.round(Number(o.jusqua)))) : d.jusqua,
    sections: oui(o.sections, d.sections), noms: oui(o.noms, d.noms), unites: oui(o.unites, d.unites),
    format: o.format === "eleve" ? "eleve" : "mur",
  };
}

/** Les morceaux de la frise : les sections du guide, ou des dizaines, jusqu'au dernier nombre choisi. */
export function morceauxDeLaFrise(r: ReglagesFrise): { nombres: number[]; nom: string; couleur: number }[] {
  if (r.sections) {
    return SECTIONS.map((s, i) => ({ nombres: intervalle(i === 0 ? r.depart : s.debut, Math.min(s.fin, r.jusqua)), nom: s.nom, couleur: i }))
      .filter((m) => m.nombres.length > 0);
  }
  const tous = intervalle(r.depart, r.jusqua);
  const morceaux: { nombres: number[]; nom: string; couleur: number }[] = [];
  for (let i = 0; i < tous.length; i += 10) morceaux.push({ nombres: tous.slice(i, i + 10), nom: "", couleur: 5 });
  return morceaux;
}

const intervalle = (a: number, b: number) => (b < a ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i));

/** « 4d 7u » : un nombre en dizaines et unités ; 100 : « 10d ». */
export const enDizainesEtUnites = (n: number) => {
  const d = Math.floor(n / 10), u = n % 10;
  return [d ? `${d}d` : "", u || !d ? `${u}u` : ""].filter(Boolean).join(" ");
};

/** Les bandes du mur : au plus onze cases ; une section plus longue se coupe en bandes égales, à mettre bout à bout. */
export function bandesDuMur(morceaux: { nombres: number[]; nom: string; couleur: number }[]): { nombres: number[]; nom: string; couleur: number; suite: boolean }[] {
  return morceaux.flatMap((m) => {
    const n = Math.ceil(m.nombres.length / 11);
    const par = Math.ceil(m.nombres.length / n);
    return Array.from({ length: n }, (_, i) => ({ nombres: m.nombres.slice(i * par, (i + 1) * par), nom: i === 0 ? m.nom : "", couleur: m.couleur, suite: i > 0 }));
  });
}

function caseDeLaFrise(n: number, nom: string, r: ReglagesFrise, couleur: number, premiere: boolean): string {
  return `<div class="nf-case${premiere ? " nf-premiere" : ""}" style="--nf-teinte: ${TEINTES[couleur % 10]}; --nf-trait: ${TRAITS[couleur % 10]}">`
    + `<span class="nf-n">${n}</span>${r.noms && nom && premiere ? `<span class="nf-nom">${escapeHtml(nom)}</span>` : ""}`
    + `${r.unites ? `<span class="nf-du">${enDizainesEtUnites(n)}</span>` : ""}</div>`;
}

const BANDES_PAR_PAGE = 4;

export function htmlFrise(brut: Partial<ReglagesFrise>): string {
  const r = reglagesFriseSurs(brut);
  const morceaux = morceauxDeLaFrise(r);
  if (r.format === "eleve") {
    const lignes = morceaux.map((m) => `<div class="nf-ligne">${m.nombres.map((n, i) => caseDeLaFrise(n, m.nom, r, m.couleur, i === 0)).join("")}</div>`).join("");
    return feuille(`<div class="page nf-eleve"><div class="nf-titre">La frise des nombres</div>${lignes}</div>`, "nf");
  }
  const bandes = bandesDuMur(morceaux);
  const pages: string[] = [];
  for (let i = 0; i < bandes.length; i += BANDES_PAR_PAGE) {
    pages.push(`<div class="page nf-mur">${bandes.slice(i, i + BANDES_PAR_PAGE).map((b) => `<div class="nf-bande">`
      + b.nombres.map((n, k) => caseDeLaFrise(n, b.nom, r, b.couleur, k === 0 && !b.suite)).join("") + `</div>`).join("")}</div>`);
  }
  return feuille(pages.join(""), "nf");
}

export const titreFrise = (brut: Partial<ReglagesFrise>) => {
  const r = reglagesFriseSurs(brut);
  return `La frise numérique, de ${r.depart} à ${r.jusqua}`;
};

export const styleFrise = (brut: Partial<ReglagesFrise>) => STYLE_FRISE_NUMERIQUE
  + (reglagesFriseSurs(brut).format === "mur" ? "@page { size: A4 landscape; margin: 10mm; }" : "");

export const STYLE_FRISE_NUMERIQUE = `
  @media print { body { padding: 0; } }
  .feuille.nf { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.nf .nf-case { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box;
    background: var(--nf-teinte); border: 0.6mm solid var(--nf-trait); border-left-width: 0; line-height: 1; }
  .feuille.nf .nf-case:first-child { border-left-width: 0.6mm; }
  .feuille.nf .nf-premiere { border-left: 1.4mm solid var(--nf-trait) !important; }
  .feuille.nf .nf-n { font-weight: 800; }
  .feuille.nf .nf-nom { font-weight: 800; color: ${ROUGE}; }
  .feuille.nf .nf-du { color: #4a5068; font-weight: 600; }
  /* Pour le mur : quatre bandes par page, en paysage, à découper et à mettre bout à bout. */
  .feuille.nf .nf-mur { width: 263mm; height: 170mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-around; }
  .feuille.nf .nf-bande { display: flex; height: 32mm; outline: 0.4mm dashed #9aa0b4; outline-offset: 2mm; width: max-content; }
  .feuille.nf .nf-mur .nf-case { width: 23.5mm; height: 32mm; gap: 1.5mm; }
  .feuille.nf .nf-mur .nf-n { font-size: 13mm; }
  .feuille.nf .nf-mur .nf-nom { font-size: 3.6mm; }
  .feuille.nf .nf-mur .nf-du { font-size: 4mm; }
  /* Pour l'élève : une ligne par section, en petit. */
  .feuille.nf .nf-eleve { width: 182mm; margin: 0 auto; }
  .feuille.nf .nf-titre { font-size: 7mm; font-weight: 800; text-align: center; margin: 0 0 6mm; }
  .feuille.nf .nf-ligne { display: flex; margin: 0 0 7mm; }
  .feuille.nf .nf-eleve .nf-case { width: 8.4mm; height: 14mm; gap: 0.6mm; }
  .feuille.nf .nf-eleve .nf-n { font-size: 4.4mm; }
  .feuille.nf .nf-eleve .nf-nom { position: absolute; top: -4.2mm; left: -0.5mm; font-size: 3mm; white-space: nowrap; }
  .feuille.nf .nf-eleve .nf-du { font-size: 2.1mm; }
`;
