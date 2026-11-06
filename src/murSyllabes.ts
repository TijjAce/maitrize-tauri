// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le mur de syllabes ─────────────────────────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). Le guide « Pour
// enseigner la lecture et l'écriture au CP » range le tableau de syllabes
// parmi les outils de la classe, avec les mots-référents et les familles de
// mots (p. 100) ; celui du CE1 fait lire chaque jour des « gammes » sur les
// murs de syllabes (p. 98). Une ligne par consonne, une colonne par voyelle,
// et à leur croisement la syllabe : en script, dans la cursive de la classe,
// ou les deux. Les voyelles peuvent être des graphèmes — ou, on, an, oi —
// pour les syllabes complexes du CE1.

import { feuille } from "./cartesImprimables";
import { POLICE_CURSIVE, tailleCursive } from "./policesEcriture";
import { escapeHtml } from "./print";

export type EcritureSyllabes = "script" | "cursive" | "deux";

export interface ReglagesMurSyllabes {
  consonnes: string;
  voyelles: string;
  ecriture: EcritureSyllabes;
  format: "mur" | "cahier";
}

/** Les consonnes des deux premières périodes de la progression, et les voyelles. */
export const CONSONNES_PAR_DEFAUT = "l, r, m, s, f, ch, v, p, t, b, d, n, j";
export const VOYELLES_SIMPLES = "a, e, i, o, u, é";
export const VOYELLES_COMPLEXES = "ou, on, an, in, oi, eu";

export const REGLAGES_MUR_SYLLABES: ReglagesMurSyllabes = { consonnes: CONSONNES_PAR_DEFAUT, voyelles: VOYELLES_SIMPLES, ecriture: "script", format: "mur" };

export function reglagesMurSyllabesSurs(brut: Partial<ReglagesMurSyllabes> | null | undefined): ReglagesMurSyllabes {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesMurSyllabes>;
  const d = REGLAGES_MUR_SYLLABES;
  return {
    consonnes: typeof o.consonnes === "string" ? o.consonnes.slice(0, 300) : d.consonnes,
    voyelles: typeof o.voyelles === "string" ? o.voyelles.slice(0, 200) : d.voyelles,
    ecriture: o.ecriture === "cursive" || o.ecriture === "deux" ? o.ecriture : "script",
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

/** Une liste écrite « l, r, m » ou « l r m » : ses éléments, une fois chacun, en minuscules. */
export const elementsDe = (texte: string, combien: number) =>
  [...new Set(texte.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, combien);

/** La hauteur d'une rangée, en mm, selon l'écriture : la cursive réserve ses boucles et ses jambages. */
export const hauteurDeRangee = (ecriture: EcritureSyllabes) => (ecriture === "script" ? 15 : ecriture === "cursive" ? 15 : 23);

const HAUTEUR = 250;
const TITRE = 16;

/** Les rangées de chaque page : l'en-tête des voyelles revient en haut de chacune. */
export function pagesDuMur(consonnes: string[], ecriture: EcritureSyllabes): string[][] {
  const h = hauteurDeRangee(ecriture);
  const parPage = Math.max(1, Math.floor((HAUTEUR - TITRE - 12) / h));
  const pages: string[][] = [];
  for (let i = 0; i < consonnes.length; i += parPage) pages.push(consonnes.slice(i, i + parPage));
  return pages.length ? pages : [[]];
}

function syllabe(s: string, ecriture: EcritureSyllabes): string {
  const script = `<span class="ms-script">${escapeHtml(s)}</span>`;
  const cursive = `<span class="ms-cursive">${escapeHtml(s)}</span>`;
  return ecriture === "script" ? script : ecriture === "cursive" ? cursive : script + cursive;
}

export function htmlMurSyllabes(brut: Partial<ReglagesMurSyllabes>): string {
  const r = reglagesMurSyllabesSurs(brut);
  const consonnes = elementsDe(r.consonnes, 30);
  const voyelles = elementsDe(r.voyelles, 8);
  if (!consonnes.length || !voyelles.length) return feuille(`<div class="page ms-page"><div class="ms-vide">Écrivez des consonnes et des voyelles.</div></div>`, "ms");
  const h = hauteurDeRangee(r.ecriture);
  const pages = pagesDuMur(consonnes, r.ecriture).map((lot, k) => {
    const entete = `<tr><th class="ms-coin"></th>${voyelles.map((v) => `<th class="ms-voyelle">${escapeHtml(v)}</th>`).join("")}</tr>`;
    const lignes = lot.map((c) => `<tr style="height: ${h}mm"><th class="ms-consonne">${escapeHtml(c)}</th>`
      + voyelles.map((v) => `<td>${syllabe(c + v, r.ecriture)}</td>`).join("") + `</tr>`).join("");
    return `<div class="ms-page">${k === 0 ? `<div class="ms-titre">Le mur des syllabes</div>` : ""}<table class="ms-table">${entete}${lignes}</table></div>`;
  });
  if (r.format === "cahier") return feuille(pages.map((p) => `<div class="page ms-planche">${`<div class="ms-petit">${p}</div>`.repeat(4)}</div>`).join(""), "ms");
  return feuille(pages.map((p) => p.replace(`<div class="ms-page">`, `<div class="page ms-page">`)).join(""), "ms");
}

export const titreMurSyllabes = () => "Le mur des syllabes";

/**
 * Le style de la feuille ; la cursive seulement quand elle s'écrit : un
 * document qui la nomme emporte sa police (voir policeDuDocument).
 */
export const styleMurSyllabes = (brut: Partial<ReglagesMurSyllabes>) => STYLE_MUR_SYLLABES
  + (reglagesMurSyllabesSurs(brut).ecriture === "script" ? ""
    // La cursive de la classe (voir policesEcriture.ts) : 2,2 mm de hauteur d'x, ses boucles et ses jambages dans la case.
    : `.feuille.ms .ms-cursive { display: block; font-family: ${POLICE_CURSIVE}; font-size: ${tailleCursive(2.2, "mm")}; line-height: 13mm; font-weight: 400; }`);

const NOIR = "#1c2233";
const BLEU = "#2a6fd6";
const ROUGE = "#d33a32";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_MUR_SYLLABES = `
  @media print { body { padding: 0; } }
  .feuille.ms { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.ms .ms-page { width: 182mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ms .ms-titre { font-size: 8.5mm; font-weight: 800; text-align: center; line-height: 1.2; margin: 0 0 4mm; }
  .feuille.ms .ms-table { border-collapse: collapse; margin: 0 auto; table-layout: fixed; width: 100%; }
  .feuille.ms .ms-table th, .feuille.ms .ms-table td { border: 0.5mm solid #6b7186; text-align: center; vertical-align: middle; padding: 0 1mm; }
  .feuille.ms .ms-coin { width: 16mm; border: none !important; }
  .feuille.ms .ms-voyelle { height: 12mm; font-size: 8mm; font-weight: 800; color: ${ROUGE}; background: #fdecea; }
  .feuille.ms .ms-consonne { font-size: 8mm; font-weight: 800; color: ${BLEU}; background: #e8f0fd; }
  .feuille.ms .ms-script { display: block; font-size: 7mm; font-weight: 700; line-height: 1.1; }
  .feuille.ms .ms-vide { color: #687087; font-size: 5mm; padding: 10mm 0; text-align: center; }
  .feuille.ms .ms-planche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr));
    width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ms .ms-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden; padding-top: 6mm; }
`;
