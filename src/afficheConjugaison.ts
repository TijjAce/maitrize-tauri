// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les tableaux de conjugaison, pour le mur ──────────────────────────────
//
// « Dans les générateurs d'affichages, regarde les programmes et les guides
// Éduscol, et fais-en d'autres » (l'enseignant, 4 novembre 2026).
//
// Programme de français du cycle 2 (2024) : au CP, « apprendre à conjuguer
// être et avoir au présent de l'indicatif » (p. 20) ; au CE1, « au présent, à
// l'imparfait, au futur puis au passé composé de l'indicatif être et avoir et
// les verbes du premier groupe » (p. 21) ; au CE2, les mêmes temps, et « les
// verbes irréguliers du 3e groupe (faire, aller, dire, venir, pouvoir, voir,
// vouloir, prendre) » (p. 22). Le professeur y élabore avec les élèves « des
// outils d'aide à l'écriture (affichage, lutin, cahier de leçons ou de
// références) » (p. 9). Le guide « La grammaire du français du CP à la 6e »
// (Éduscol) range de même les pronoms personnels sujets dans un corpus
// constitué « collectivement et sous la forme d'affichage en classe » (p. 174).
//
// Une page par verbe, ses temps côte à côte ; ou une page par temps, ses
// verbes côte à côte. Les formes viennent de conjugaison.ts — celles des
// feuilles de l'atelier « Grammaire et conjugaison ». La terminaison se
// colore là où elle est la même pour tous les verbes, et pour les verbes du
// 1er groupe au présent : à l'imparfait, -ais, -ait, -ions… ; au futur, le r
// et sa terminaison, -rai, -ras, -ra… ; au passé composé, l'auxiliaire. Les
// pronoms peuvent porter leur pictogramme.

import { AU_PROGRAMME, TEMPS, VERBES_1ER_GROUPE, formes, radicalEtTerminaison, type Temps } from "./conjugaison";
import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type NiveauConjugaison = keyof typeof AU_PROGRAMME;
export const NIVEAUX_CONJUGAISON: NiveauConjugaison[] = ["CP", "CE1", "CE2"];

export interface ReglagesAfficheConjugaison {
  niveau: NiveauConjugaison;
  /** Les verbes affichés, parmi ceux du programme de la classe. */
  verbes: string[];
  /** Les temps affichés, parmi ceux du programme de la classe. */
  temps: Temps[];
  /** Une page par verbe, ses temps côte à côte ; ou une page par temps, ses verbes côte à côte. */
  disposition: "verbe" | "temps";
  /** La terminaison — l'auxiliaire au passé composé — en couleur. */
  couleurs: boolean;
  /** « il » et « ils », ou « il, elle, on » et « ils, elles ». */
  pronoms: "il" | "il-elle";
  /** Le pictogramme de chaque pronom, quand la banque est là. */
  pictos: boolean;
}

export const REGLAGES_AFFICHE_CONJUGAISON: ReglagesAfficheConjugaison = {
  niveau: "CE1", verbes: ["être", "avoir", "chanter"], temps: ["present"], disposition: "verbe", couleurs: true, pronoms: "il", pictos: false,
};

/** Des réglages lus de la mémoire, sans leur faire confiance : rien hors du programme de la classe, jamais une page vide. */
export function reglagesAfficheSurs(brut: Partial<ReglagesAfficheConjugaison> | null | undefined): ReglagesAfficheConjugaison {
  const b = brut ?? {};
  const niveau: NiveauConjugaison = NIVEAUX_CONJUGAISON.includes(b.niveau as NiveauConjugaison) ? b.niveau as NiveauConjugaison : "CE1";
  const prog = AU_PROGRAMME[niveau];
  const voulus = Array.isArray(b.verbes) ? b.verbes : REGLAGES_AFFICHE_CONJUGAISON.verbes;
  const verbes = prog.verbes.filter((v) => voulus.includes(v));
  const tempsVoulus = Array.isArray(b.temps) ? b.temps : REGLAGES_AFFICHE_CONJUGAISON.temps;
  const temps = TEMPS.map((t) => t.id).filter((t) => prog.temps.includes(t) && tempsVoulus.includes(t));
  return {
    niveau,
    verbes: verbes.length ? verbes : prog.verbes.slice(0, 2),
    temps: temps.length ? temps : ["present"],
    disposition: b.disposition === "temps" ? "temps" : "verbe",
    couleurs: b.couleurs !== false,
    pronoms: b.pronoms === "il-elle" ? "il-elle" : "il",
    pictos: b.pictos === true,
  };
}

/** Les pronoms de chaque personne, et les mots dont on cherche les pictogrammes. */
const PRONOMS = { il: ["je", "tu", "il", "nous", "vous", "ils"], "il-elle": ["je", "tu", "il, elle, on", "nous", "vous", "ils, elles"] };
export const PRONOMS_A_ILLUSTRER = ["je", "tu", "il", "elle", "nous", "vous", "ils", "elles"];
/** Les pictogrammes d'une personne : celui de « il » et celui de « elle » quand les deux s'écrivent. */
const pictosDeLaPersonne = (i: number, pronoms: ReglagesAfficheConjugaison["pronoms"]): string[] =>
  pronoms === "il-elle" && i === 2 ? ["il", "elle"] : pronoms === "il-elle" && i === 5 ? ["ils", "elles"] : [["je", "tu", "il", "nous", "vous", "ils"][i]];

/** Un morceau d'une forme : sa terminaison, son auxiliaire, ou le reste. */
export interface Morceau { texte: string; classe?: "term" | "aux" }

const IMPARFAIT = ["ais", "ais", "ait", "ions", "iez", "aient"];
const FUTUR = ["rai", "ras", "ra", "rons", "rez", "ront"];
const AUX_ETRE = /^(suis|es|est|sommes|êtes|sont) /;

/**
 * Une forme en morceaux, pour colorer ce qui se retient : l'auxiliaire au
 * passé composé ; à l'imparfait et au futur, la terminaison de tous les
 * verbes ; au présent, celle des verbes du 1er groupe. Le reste se lit d'un
 * seul tenant.
 */
export function morceauxDeLaForme(verbe: string, temps: Temps, personne: number, forme: string): Morceau[] {
  const coupe = (k: number, classe: Morceau["classe"]): Morceau[] => [{ texte: forme.slice(0, k) }, { texte: forme.slice(k), classe }].filter((m) => m.texte);
  if (temps === "passeCompose") {
    const k = forme.indexOf(" ");
    return k > 0 ? [{ texte: forme.slice(0, k), classe: "aux" }, { texte: forme.slice(k) }] : [{ texte: forme }];
  }
  if (temps === "imparfait" && forme.endsWith(IMPARFAIT[personne])) return coupe(forme.length - IMPARFAIT[personne].length, "term");
  if (temps === "futur" && forme.endsWith(FUTUR[personne])) return coupe(forme.length - FUTUR[personne].length, "term");
  if (temps === "present" && VERBES_1ER_GROUPE.includes(verbe)) return coupe(radicalEtTerminaison(verbe, forme).radical.length, "term");
  return [{ texte: forme }];
}

/** Avec « il, elle » : le participe d'un verbe conjugué avec être s'accorde — allé(e), allé(e)s. */
function accorde(forme: string, personne: number, pronoms: ReglagesAfficheConjugaison["pronoms"]): string {
  if (pronoms !== "il-elle" || !AUX_ETRE.test(forme)) return forme;
  return personne < 3 ? `${forme}(e)` : forme.replace(/s$/, "(e)s");
}

/** Une ligne : le pronom — « j' » devant une voyelle —, ses pictogrammes, puis la forme en morceaux. */
function ligne(verbe: string, temps: Temps, i: number, r: ReglagesAfficheConjugaison, images: Record<string, string>): string {
  const forme = accorde(formes(verbe, temps)[i], i, r.pronoms);
  const elide = i === 0 && /^[aeiouyéèêh]/i.test(forme);
  const pronom = elide ? "j'" : PRONOMS[r.pronoms][i];
  const pictos = r.pictos
    ? pictosDeLaPersonne(i, r.pronoms).map((p) => (images[p] ? `<img class="ac-picto" src="${images[p]}" alt="" />` : "")).join("")
    : "";
  const morceaux = morceauxDeLaForme(verbe, temps, i, forme)
    .map((m) => (r.couleurs && m.classe ? `<span class="ac-${m.classe}">${escapeHtml(m.texte)}</span>` : escapeHtml(m.texte))).join("");
  return `<div class="ac-ligne">${pictos ? `<span class="ac-pictos">${pictos}</span>` : ""}`
    + `<span class="ac-forme"><span class="ac-pronom">${escapeHtml(pronom)}</span>${elide ? "" : " "}<span class="ac-verbe">${morceaux}</span></span></div>`;
}

/** Le nom d'un temps en tête de colonne : « Présent », « Imparfait », « Futur », « Passé composé ». */
const nomDuTemps = (t: Temps) => {
  const nom = TEMPS.find((x) => x.id === t)!.nom.replace(/^(le |l')/, "");
  return nom.charAt(0).toUpperCase() + nom.slice(1);
};
/** « Le présent », « L'imparfait » : le titre d'une page par temps. */
const titreDuTemps = (t: Temps) => { const nom = TEMPS.find((x) => x.id === t)!.nom; return nom.charAt(0).toUpperCase() + nom.slice(1); };

/** Une colonne : son en-tête — un temps, ou un verbe —, puis les six personnes. */
const colonne = (tete: string, lignes: string) => `<div class="ac-colonne"><div class="ac-tete">${escapeHtml(tete)}</div><div class="ac-lignes">${lignes}</div></div>`;

/** Combien de colonnes au plus sur une page : au-delà, la page suivante. */
const COLONNES_PAR_PAGE = 4;

/** Une page en paysage dès trois colonnes : elles y tiennent côte à côte. */
export const enPaysage = (r: ReglagesAfficheConjugaison) =>
  Math.min(COLONNES_PAR_PAGE, r.disposition === "verbe" ? r.temps.length : r.verbes.length) >= 3;

/** La largeur d'une page, en millimètres : celle de l'A4 entre ses marges, en paysage ou en portrait. */
export const LARGEUR_PAYSAGE = 263, LARGEUR_PORTRAIT = 182;

/**
 * La taille de l'écriture : la plus longue ligne de la page doit tenir dans
 * sa colonne — une lettre grasse prend environ 0,62 de la taille —, après ses
 * pictogrammes, sans dépasser 12 mm. Trop longue malgré tout, elle passe à la
 * ligne entre le pronom et le verbe, plutôt que d'être coupée.
 */
function tailleDeLEcriture(lignes: string[], colonnes: number, paysage: boolean, pictos: number): number {
  const n = Math.max(1, colonnes);
  const largeur = ((paysage ? LARGEUR_PAYSAGE : LARGEUR_PORTRAIT) - (n - 1) * 5) / n - 10 - pictos * 13.5;
  const longueur = Math.max(6, ...lignes.map((l) => l.length));
  return Math.max(5, Math.min(12, largeur / (longueur * 0.62)));
}

/** Les pages : une par verbe, ses temps côte à côte ; ou une par temps, ses verbes côte à côte, quatre au plus par page. */
export function pagesDeConjugaison(r: ReglagesAfficheConjugaison, images: Record<string, string> = {}): string[] {
  const paysage = enPaysage(r);
  const texteDe = (verbe: string, t: Temps) => formes(verbe, t).map((f, i) => `${PRONOMS[r.pronoms][i]} ${accorde(f, i, r.pronoms)}`);
  const page = (titre: string, cols: { tete: string; verbe: string; temps: Temps }[]) => {
    const taille = tailleDeLEcriture(cols.flatMap((c) => texteDe(c.verbe, c.temps)), cols.length, paysage, r.pictos ? (r.pronoms === "il-elle" ? 2 : 1) : 0);
    return `<div class="page ac-page${paysage ? " ac-paysage" : ""}" style="--ac-ecrit:${Math.round(taille * 10) / 10}mm">`
      + `<div class="ac-titre">${escapeHtml(titre)}</div>`
      + `<div class="ac-colonnes" style="grid-template-columns: repeat(${cols.length}, 1fr)">`
      + cols.map((c) => colonne(c.tete, Array.from({ length: 6 }, (_, i) => ligne(c.verbe, c.temps, i, r, images)).join(""))).join("")
      // Des pictogrammes d'ARASAAC sur la page : la mention que demande leur licence.
      + `</div>${r.pictos && Object.keys(images).length ? ATTRIBUTION_ARASAAC : ""}</div>`;
  };
  if (r.disposition === "verbe") {
    return r.verbes.flatMap((verbe) => {
      const morceaux: Temps[][] = [];
      for (let i = 0; i < r.temps.length; i += COLONNES_PAR_PAGE) morceaux.push(r.temps.slice(i, i + COLONNES_PAR_PAGE));
      return morceaux.map((ts) => page(`Le verbe ${verbe}`, ts.map((t) => ({ tete: nomDuTemps(t), verbe, temps: t }))));
    });
  }
  return r.temps.flatMap((t) => {
    const pages: string[] = [];
    for (let i = 0; i < r.verbes.length; i += COLONNES_PAR_PAGE) {
      pages.push(page(titreDuTemps(t), r.verbes.slice(i, i + COLONNES_PAR_PAGE).map((verbe) => ({ tete: verbe, verbe, temps: t }))));
    }
    return pages;
  });
}

export const htmlAfficheConjugaison = (brut: Partial<ReglagesAfficheConjugaison>, images: Record<string, string> = {}) =>
  feuille(pagesDeConjugaison(reglagesAfficheSurs(brut), images).join(""), "ac");

/** « Le verbe être » ; « Les verbes être, avoir et chanter » ; « Le présent » ; « Le présent et le futur ». */
export function titreAfficheConjugaison(brut: Partial<ReglagesAfficheConjugaison>): string {
  const r = reglagesAfficheSurs(brut);
  const liste = (mots: string[]) => (mots.length === 1 ? mots[0] : `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`);
  if (r.disposition === "verbe") return r.verbes.length === 1 ? `Le verbe ${r.verbes[0]}` : `Les verbes ${liste(r.verbes)}`;
  return liste(r.temps.map((t, i) => (i === 0 ? titreDuTemps(t) : TEMPS.find((x) => x.id === t)!.nom)));
}

const NOIR = "#1c2233";
export const COULEUR_TERMINAISON = "#d33a32";
export const COULEUR_AUXILIAIRE = "#2a6fd6";

/** Le style : en paysage dès trois colonnes. */
export function styleAfficheConjugaison(brut: Partial<ReglagesAfficheConjugaison>): string {
  const r = reglagesAfficheSurs(brut);
  return STYLE_AFFICHE_CONJUGAISON + (enPaysage(r) ? "@page { size: A4 landscape; margin: 10mm; }" : "");
}

export const STYLE_AFFICHE_CONJUGAISON = `
  .feuille.ac .ac-page { display: flex; flex-direction: column; width: ${LARGEUR_PORTRAIT}mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ac .ac-page.ac-paysage { width: ${LARGEUR_PAYSAGE}mm; height: 170mm; }
  .feuille.ac .ac-titre { font-size: 11mm; font-weight: 800; line-height: 1.2; margin: 0 0 5mm; text-align: center; color: ${NOIR}; }
  .feuille.ac .ac-colonnes { flex: 1; display: grid; gap: 5mm; }
  .feuille.ac .ac-colonne { display: flex; flex-direction: column; border: 1mm solid ${NOIR}; border-radius: 3mm; overflow: hidden; min-width: 0; }
  .feuille.ac .ac-tete { font-size: 7.5mm; font-weight: 800; text-align: center; padding: 2.5mm 2mm; background: #f1f3f8; border-bottom: 0.6mm solid ${NOIR}; }
  .feuille.ac .ac-lignes { flex: 1; display: flex; flex-direction: column; }
  .feuille.ac .ac-ligne { flex: 1; display: flex; align-items: center; gap: 2.5mm; padding: 0 4mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ac .ac-ligne + .ac-ligne { border-top: 0.4mm solid #e1e5ee; }
  .feuille.ac .ac-forme { font-size: var(--ac-ecrit, 10mm); font-weight: 700; line-height: 1.1; color: ${NOIR}; min-width: 0; }
  .feuille.ac .ac-pronom { font-weight: 600; color: #4a5068; white-space: nowrap; }
  .feuille.ac .ac-verbe { white-space: nowrap; }
  .feuille.ac .ac-term { color: ${COULEUR_TERMINAISON}; font-weight: 800; }
  .feuille.ac .ac-aux { color: ${COULEUR_AUXILIAIRE}; font-weight: 800; }
  .feuille.ac .ac-pictos { display: flex; gap: 1mm; flex: none; }
  .feuille.ac .ac-picto { width: 12mm; height: 12mm; object-fit: contain; }
`;
