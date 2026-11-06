// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le répertoire graphique de la classe ──────────────────────────────────
//
// « Fais-les tous » (l'enseignant, 4 novembre 2026). Le programme de l'école
// maternelle (2025) fait réaliser aux élèves « un répertoire graphique commun
// constitué de signes simples », dont ils se servent ensuite pour s'entraîner
// à reproduire différents motifs (p. 28). Chaque carte montre un signe, tracé
// en bande comme on le reproduit, et son nom ; une case peut attendre la
// photo de l'endroit où la classe l'a trouvé — dans l'école, le quartier, une
// œuvre. Les tracés sont dessinés ici, en vectoriel : ils restent nets à
// toutes les tailles.
//
// La même bande se repasse (demande de l'enseignant, 4 novembre 2026 :
// « ajoute encore des ateliers autonomes ») : le modèle en trait plein, puis
// deux lignes en pointillés, un point vert au départ de chaque trait — « Tracer
// quelques formes de base » avant 4 ans, s'entraîner « à reproduire différents
// motifs » ensuite (programme de l'école maternelle, p. 17 et 28). Les points
// et le quadrillage ne se repassent pas.

import { feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type Signe =
  | "verticales" | "horizontales" | "obliques" | "ponts" | "coupes" | "vagues" | "boucles" | "spirales"
  | "ronds" | "points" | "croix" | "zigzags" | "creneaux" | "quadrillage";

export const SIGNES: { id: Signe; nom: string }[] = [
  { id: "verticales", nom: "les lignes verticales" }, { id: "horizontales", nom: "les lignes horizontales" },
  { id: "obliques", nom: "les lignes obliques" }, { id: "points", nom: "les points" }, { id: "ronds", nom: "les ronds" },
  { id: "croix", nom: "les croix" }, { id: "ponts", nom: "les ponts" }, { id: "coupes", nom: "les coupes" },
  { id: "vagues", nom: "les vagues" }, { id: "zigzags", nom: "les zigzags" }, { id: "creneaux", nom: "les créneaux" },
  { id: "boucles", nom: "les boucles" }, { id: "spirales", nom: "les spirales" }, { id: "quadrillage", nom: "le quadrillage" },
];

export interface ReglagesRepertoire {
  signes: Signe[];
  /** Le nom en capitales, comme on l'écrit d'abord en maternelle. */
  capitales: boolean;
  /** Une case pour la photo de l'endroit où on l'a trouvé. */
  photo: boolean;
  /** Au mur ; en grandes cartes ; ou une fiche où l'élève repasse chaque signe. */
  format: "mur" | "etiquettes" | "repasser";
}

export const REGLAGES_REPERTOIRE: ReglagesRepertoire = {
  signes: ["verticales", "horizontales", "obliques", "ronds", "ponts", "coupes", "vagues", "zigzags", "boucles", "spirales"],
  capitales: true, photo: false, format: "mur",
};

export function reglagesRepertoireSurs(brut: Partial<ReglagesRepertoire> | null | undefined): ReglagesRepertoire {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesRepertoire>;
  const d = REGLAGES_REPERTOIRE;
  const connus = new Set(SIGNES.map((s) => s.id));
  const signes = Array.isArray(o.signes) ? [...new Set(o.signes.filter((s): s is Signe => connus.has(s as Signe)))] : d.signes;
  return {
    signes: signes.length ? signes : d.signes,
    capitales: typeof o.capitales === "boolean" ? o.capitales : d.capitales,
    photo: typeof o.photo === "boolean" ? o.photo : d.photo,
    format: o.format === "etiquettes" || o.format === "repasser" ? o.format : "mur",
  };
}

/** Les tracés d'un signe, dans une bande de 150 × 34 (unités du dessin). */
export function traceDuSigne(s: Signe): string {
  const L = 150, H = 34, m = 8;
  const chemin = (d: string) => `<path d="${d}"/>`;
  const pts = (f: (t: number) => [number, number], debut: number, fin: number, pas: number) => {
    const p: string[] = [];
    for (let t = debut; t <= fin + 1e-9; t += pas) { const [x, y] = f(t); p.push(`${x.toFixed(2)} ${y.toFixed(2)}`); }
    return `M ${p.join(" L ")}`;
  };
  switch (s) {
    case "verticales": return Array.from({ length: 12 }, (_, i) => chemin(`M ${m + i * 12} 6 L ${m + i * 12} ${H - 6}`)).join("");
    case "horizontales": return [7, 17, 27].map((y) => chemin(`M ${m} ${y} L ${L - m} ${y}`)).join("");
    case "obliques": return Array.from({ length: 11 }, (_, i) => chemin(`M ${m + i * 12} ${H - 6} L ${m + 10 + i * 12} 6`)).join("");
    case "points": return Array.from({ length: 24 }, (_, i) => `<circle cx="${m + (i % 12) * 12}" cy="${i < 12 ? 11 : 23}" r="1.6" class="rg-plein"/>`).join("");
    case "ronds": return Array.from({ length: 9 }, (_, i) => `<circle cx="${m + 6 + i * 15.5}" cy="${H / 2}" r="6.5"/>`).join("");
    case "croix": return Array.from({ length: 10 }, (_, i) => { const x = m + 5 + i * 14; return chemin(`M ${x - 5} 12 L ${x + 5} 22 M ${x + 5} 12 L ${x - 5} 22`); }).join("");
    case "ponts": return chemin(Array.from({ length: 9 }, (_, i) => `${i ? "" : `M ${m} ${H - 7} `}A 7.5 9 0 0 1 ${m + 15 * (i + 1)} ${H - 7}`).join(" "));
    case "coupes": return chemin(Array.from({ length: 9 }, (_, i) => `${i ? "" : `M ${m} 7 `}A 7.5 9 0 0 0 ${m + 15 * (i + 1)} 7`).join(" "));
    case "vagues": return chemin(pts((t) => [m + t, H / 2 - 8 * Math.sin((t / 22) * 2 * Math.PI)], 0, L - 2 * m, 1));
    case "zigzags": return chemin(`M ${m} ${H - 7} ` + Array.from({ length: 12 }, (_, i) => `L ${m + 5.6 + i * 11.2} 7 L ${m + 11.2 * (i + 1)} ${H - 7}`).join(" "));
    case "creneaux": return chemin(`M ${m} ${H - 7} ` + Array.from({ length: 7 }, (_, i) => { const x = m + i * 19; return `L ${x} 7 L ${x + 9.5} 7 L ${x + 9.5} ${H - 7} L ${x + 19} ${H - 7}`; }).join(" "));
    // Une cycloïde allongée : le trait avance, revient sur lui-même en haut, et fait sa boucle.
    case "boucles": return chemin(pts((t) => [m - 2 + 3.4 * (t - Math.PI) - 7 * Math.sin(t), H / 2 - 10 * Math.cos(t)], Math.PI, 13 * Math.PI, 0.08));
    case "spirales": return [0, 1, 2, 3].map((k) => chemin(pts((t) => [m + 15 + k * 36 + 1.25 * t * Math.cos(t), H / 2 + 1.25 * t * Math.sin(t)], 0, Math.PI * 4.2, 0.12))).join("");
    case "quadrillage": return [...Array.from({ length: 4 }, (_, i) => chemin(`M ${m} ${5 + i * 8} L ${m + 136} ${5 + i * 8}`)),
      ...Array.from({ length: 18 }, (_, i) => chemin(`M ${m + i * 8} 5 L ${m + i * 8} 29`))].join("");
  }
}

/** Le signe en bande ; trois bandes l'une sous l'autre dans une grande carte, qui est haute. */
const dessinDuSigne = (s: Signe, bandes = 1) =>
  `<svg class="rg-trace" viewBox="0 0 150 ${34 * bandes + 6 * (bandes - 1)}" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round">`
  + Array.from({ length: bandes }, (_, k) => `<g transform="translate(0 ${k * 40})">${traceDuSigne(s)}</g>`).join("") + `</svg>`;

/** Les signes qui se repassent : ni les points, ni le quadrillage. */
export const SIGNES_A_REPASSER: Signe[] = SIGNES.map((s) => s.id).filter((s) => s !== "points" && s !== "quadrillage");

/**
 * Le départ de chaque trait d'un signe, dans sa bande : en haut pour les
 * traits qui descendent — obliques comprises —, à gauche pour ceux qui
 * avancent, à « deux heures » pour un rond, qui tourne dans le sens de
 * l'écriture, au centre d'une spirale.
 */
export function departsDuSigne(s: Signe): [number, number][] {
  const H = 34, m = 8;
  switch (s) {
    case "verticales": return Array.from({ length: 12 }, (_, i) => [m + i * 12, 6]);
    case "horizontales": return [7, 17, 27].map((y) => [m, y]);
    case "obliques": return Array.from({ length: 11 }, (_, i) => [m + 10 + i * 12, 6]);
    case "ronds": return Array.from({ length: 9 }, (_, i) => [m + 6 + i * 15.5 + 6.5 * Math.cos(Math.PI / 3), H / 2 - 6.5 * Math.sin(Math.PI / 3)]);
    case "croix": return Array.from({ length: 10 }, (_, i): [number, number][] => [[m + i * 14, 12], [m + 10 + i * 14, 12]]).flat();
    case "ponts": case "zigzags": case "creneaux": return [[m, H - 7]];
    case "coupes": return [[m, 7]];
    case "vagues": return [[m, H / 2]];
    case "boucles": return [[m - 2, H / 2 + 10]];
    case "spirales": return [0, 1, 2, 3].map((k) => [m + 15 + k * 36, H / 2]);
    case "points": case "quadrillage": return [];
  }
}

/** Une ligne à repasser : le signe en pointillés, et le point vert de chaque départ. */
const ligneARepasser = (s: Signe) =>
  `<svg class="rg-trace rg-pointilles" viewBox="0 0 150 34" preserveAspectRatio="xMidYMid meet" fill="none" stroke-linecap="round" stroke-linejoin="round">`
  + `<g>${traceDuSigne(s)}</g>${departsDuSigne(s).map(([x, y]) => `<circle class="rg-depart" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.6"/>`).join("")}</svg>`;

/** La fiche à repasser : trois signes par page, chacun son nom, son modèle et deux lignes en pointillés. */
function htmlARepasser(r: ReglagesRepertoire): string {
  const signes = r.signes.filter((s) => SIGNES_A_REPASSER.includes(s));
  const choisis = signes.length ? signes : (["verticales", "horizontales", "ronds"] as Signe[]);
  const pages: string[] = [];
  for (let i = 0; i < choisis.length; i += 3) {
    const tranche = choisis.slice(i, i + 3);
    const cartes = tranche.map((id) => {
      const nom = SIGNES.find((s) => s.id === id)?.nom ?? id;
      return `<div class="rg-carte rg-a-repasser"><div class="rg-entete"><div class="rg-nom">${escapeHtml(r.capitales ? nom.toLocaleUpperCase("fr-FR") : nom)}</div>`
        + `<div class="rg-modele">${dessinDuSigne(id)}</div></div>${ligneARepasser(id)}${ligneARepasser(id)}</div>`;
    }).join("");
    const titre = r.capitales ? "JE REPASSE LES TRAITS" : "Je repasse les traits";
    pages.push(`<div class="page rg-page rg-repasser"><div class="rg-titre">${titre}</div>`
      + `<p class="consigne">Je regarde le modèle. Je pars du point vert et je repasse sur les pointillés.</p>`
      + `<div class="rg-grille" style="grid-template-rows: repeat(${tranche.length}, minmax(0, 1fr))">${cartes}</div></div>`);
  }
  return feuille(pages.join(""), "rg");
}

export function htmlRepertoire(brut: Partial<ReglagesRepertoire>): string {
  const r = reglagesRepertoireSurs(brut);
  if (r.format === "repasser") return htmlARepasser(r);
  const cartes = r.signes.map((id) => {
    const nom = SIGNES.find((s) => s.id === id)?.nom ?? id;
    const photo = r.photo ? `<div class="rg-photo"></div>` : "";
    const ecrit = `<div class="rg-nom">${escapeHtml(r.capitales ? nom.toLocaleUpperCase("fr-FR") : nom)}</div>`;
    // Au mur, la photo à gauche du tracé ; dans une grande carte, à côté du nom, sous les bandes.
    return r.format === "etiquettes"
      ? `<div class="rg-carte">${dessinDuSigne(id, 3)}<div class="rg-pied">${photo}${ecrit}</div></div>`
      : `<div class="rg-carte">${photo}${dessinDuSigne(id)}<div class="rg-pied">${ecrit}</div></div>`;
  });
  const parPage = r.format === "etiquettes" ? 4 : 6;
  const pages: string[] = [];
  for (let i = 0; i < cartes.length; i += parPage) {
    pages.push(`<div class="page rg-page rg-${r.format}">${i === 0 && r.format === "mur" ? `<div class="rg-titre">${r.capitales ? "NOTRE RÉPERTOIRE GRAPHIQUE" : "Notre répertoire graphique"}</div>` : ""}`
      + `<div class="rg-grille">${cartes.slice(i, i + parPage).join("")}</div></div>`);
  }
  return feuille(pages.join(""), "rg");
}

export const titreRepertoire = (brut?: Partial<ReglagesRepertoire>) =>
  (reglagesRepertoireSurs(brut).format === "repasser" ? "Je repasse les traits" : "Le répertoire graphique");

const NOIR = "#1c2233";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_REPERTOIRE = `
  @media print { body { padding: 0; } }
  .feuille.rg { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.rg .rg-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; }
  .feuille.rg .rg-titre { font-size: 8mm; font-weight: 800; text-align: center; margin: 0 0 4mm; }
  .feuille.rg .rg-grille { flex: 1; display: grid; gap: 4mm; min-height: 0; }
  .feuille.rg .rg-mur .rg-grille { grid-template-columns: 1fr; grid-template-rows: repeat(6, minmax(0, 1fr)); }
  .feuille.rg .rg-etiquettes .rg-grille { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
  /* Au mur, le tracé prend toute la hauteur de la carte, le nom à sa droite ; une grande carte les met l'un sous l'autre. */
  .feuille.rg .rg-carte { border: 0.6mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; box-sizing: border-box; display: flex; align-items: center;
    gap: 5mm; min-height: 0; overflow: hidden; }
  .feuille.rg .rg-etiquettes .rg-carte { flex-direction: column; align-items: stretch; gap: 4mm; }
  .feuille.rg .rg-etiquettes .rg-carte { border-style: dashed; }
  .feuille.rg .rg-trace { flex: 1; min-width: 0; min-height: 0; height: 100%; stroke: ${NOIR}; stroke-width: 1.8; }
  .feuille.rg .rg-etiquettes .rg-trace { width: 100%; height: auto; }
  .feuille.rg .rg-trace .rg-plein { fill: ${NOIR}; stroke: none; }
  .feuille.rg .rg-pied { flex: none; width: 52mm; display: flex; flex-direction: column; align-items: center; gap: 3mm; }
  .feuille.rg .rg-etiquettes .rg-pied { width: auto; flex-direction: row; justify-content: center; }
  .feuille.rg .rg-photo { flex: none; width: 30mm; height: 22mm; border: 0.5mm dashed #9aa0b4; border-radius: 2mm; }
  .feuille.rg .rg-nom { flex: 1; text-align: center; font-size: 6.5mm; font-weight: 800; }
  /* La fiche à repasser : le nom et le petit modèle sur une ligne, puis deux lignes en pointillés, aussi grandes que la place le permet. */
  .feuille.rg .rg-repasser .rg-titre { margin-bottom: 2mm; }
  .feuille.rg .rg-repasser .consigne { flex: none; margin: 0 0 4mm; font-size: 4.6mm; font-weight: 600; line-height: 1.4; }
  .feuille.rg .rg-repasser .rg-grille { grid-template-columns: 1fr; }
  .feuille.rg .rg-a-repasser { flex-direction: column; align-items: stretch; gap: 2mm; padding: 2.5mm 4mm; }
  .feuille.rg .rg-entete { flex: none; display: flex; align-items: center; gap: 5mm; }
  .feuille.rg .rg-entete .rg-nom { flex: none; text-align: left; font-size: 5mm; }
  .feuille.rg .rg-modele { flex: none; width: 44mm; height: 10mm; display: flex; }
  .feuille.rg .rg-modele .rg-trace { stroke-width: 2.2; }
  .feuille.rg .rg-pointilles { flex: 1 1 0; height: auto; min-height: 0; width: 100%; stroke: #8a91a8; stroke-width: 1.6; stroke-dasharray: 0.01 2.7; }
  .feuille.rg .rg-pointilles .rg-plein { fill: none; }
  .feuille.rg .rg-depart { fill: #2e9d4f; stroke: none; }
  .feuille.rg .rg-etiquettes .rg-nom { font-size: 7.5mm; }
`;
