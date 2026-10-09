// Les cartes à tâches : une série de cartes, et la feuille qui les imprime.
//
// Une question par carte, rien autour. Deux façons de répondre :
//
// - à pinces : trois propositions sur le bord droit, l'élève pose une pince à
//   linge sur la bonne ; au dos, un point marque l'endroit où elle devait
//   aller — l'élève se corrige seul en retournant la carte. Le dos s'imprime à
//   côté de la carte, et l'on plie : une impression recto-verso décale le dos
//   d'une page à l'autre, le pli le pose exactement derrière ;
// - à écrire : une ligne, sur la carte plastifiée (au feutre effaçable) ou sur
//   la fiche réponse, où chaque carte a son numéro.
//
// Les cartes sont numérotées : le numéro relie la carte, la fiche réponse et
// le corrigé. Un mot dans le coin — « Niveau 1 », « Série A » — range les
// séries entre elles.

import {
  CLASSES, DOMAINES, type Carte, type Classe, type Contexte, type Format, type TypeDeCarte,
} from "./cartesATachesOutils";
import { TYPES_MATHS } from "./cartesATachesMaths";
import { TYPES_FRANCAIS } from "./cartesATachesFrancais";
import { hasard, melanger } from "./hasard";
import { carte, pagesAvecRegle, pagesDeCartes, type FormatGrille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export { CLASSES, DOMAINES };
export type { Carte, Classe, Format, TypeDeCarte };

export const TYPES: TypeDeCarte[] = [...TYPES_MATHS, ...TYPES_FRANCAIS];
export const typeDe = (id: string) => TYPES.find((t) => t.id === id);
export const typesDeLaClasse = (c: Classe) => TYPES.filter((t) => t.classes.includes(c));

export const COULEURS: { nom: string; hex: string }[] = [
  { nom: "bleu", hex: "#2c5f9e" }, { nom: "vert", hex: "#2e7d4f" }, { nom: "orange", hex: "#d9822b" },
  { nom: "violet", hex: "#6d4bb5" }, { nom: "framboise", hex: "#c2416b" }, { nom: "noir", hex: "#1c2233" },
];

export interface ReglagesCartes {
  classe: Classe;
  type: string;
  format: Format;
  combien: number;
  /** Les cartes à écrire, par page : six, ou quatre plus grandes. */
  parPage: 4 | 6;
  couleur: string;
  /** Ce qui s'écrit dans le coin de chaque carte : « Niveau 1 », « Série A ». */
  marque: string;
  /** La question sur les cartes à pinces ; sans elle, on la dit à l'oral. */
  question: boolean;
  /** Le point de la bonne réponse au dos des cartes à pinces : la carte et son dos côte à côte, à plier. */
  dos: boolean;
  /** La fiche où l'élève écrit ses réponses, carte par carte. */
  fiche: boolean;
  /** Les étiquettes-réponses à découper, pour les devinettes. */
  etiquettes: boolean;
  /** Les options de chaque type, rangées par type. */
  options: Record<string, Record<string, string>>;
}

export const REGLAGES_CARTES: ReglagesCartes = {
  classe: "CE1", type: "solide", format: "pinces", combien: 12, parPage: 6, couleur: COULEURS[0].hex, marque: "",
  question: true, dos: true, fiche: true, etiquettes: true, options: {},
};

export const COMBIEN_MAX = 48;

/** Des réglages qu'on peut suivre, quoi qu'on ait gardé : un type qui n'est pas de la classe laisse la place au premier qui l'est. */
export function reglagesSurs(brut: Partial<ReglagesCartes>): ReglagesCartes {
  const r = { ...REGLAGES_CARTES, ...brut };
  const classe = CLASSES.includes(r.classe) ? r.classe : REGLAGES_CARTES.classe;
  const types = typesDeLaClasse(classe);
  const type = types.some((t) => t.id === r.type) ? r.type : types[0].id;
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    classe, type,
    format: r.format === "tache" ? "tache" : "pinces",
    combien: Math.max(1, Math.min(COMBIEN_MAX, Math.round(Number(r.combien)) || REGLAGES_CARTES.combien)),
    parPage: r.parPage === 4 ? 4 : 6,
    couleur: COULEURS.some((c) => c.hex === r.couleur) ? r.couleur : REGLAGES_CARTES.couleur,
    marque: typeof r.marque === "string" ? r.marque.slice(0, 30) : "",
    question: oui(r.question, true), dos: oui(r.dos, true), fiche: oui(r.fiche, true), etiquettes: oui(r.etiquettes, true),
    options: r.options && typeof r.options === "object" && !Array.isArray(r.options) ? r.options : {},
  };
}

/** Les options d'un type, réglées : ce qu'on a gardé quand c'est permis pour la classe, sinon la valeur par défaut. */
export function optionsDe(t: TypeDeCarte, r: Pick<ReglagesCartes, "classe" | "options">): Record<string, string> {
  const gardees = r.options[t.id] ?? {};
  const sortie: Record<string, string> = {};
  for (const o of t.options ?? []) {
    const permises = o.valeurs(r.classe).map(([v]) => v);
    const v = gardees[o.cle];
    sortie[o.cle] = typeof v === "string" && permises.includes(v) ? v : o.defaut(r.classe);
    if (!permises.includes(sortie[o.cle])) sortie[o.cle] = permises[0];
  }
  return sortie;
}

/** Le format qu'on garde : celui qu'on demande, si le type le permet. */
export const formatDe = (t: TypeDeCarte, f: Format): Format => (t.formats.includes(f) ? f : t.formats[0]);

// ── La mise en page ───────────────────────────────────────────────────────

/** Deux colonnes de cartes ; leur hauteur, en millimètres, selon le format. */
const HAUTEUR_PINCES = 55;
const HAUTEUR_TACHE: Record<4 | 6, number> = { 6: 80, 4: 120 };

/** La place du dessin sur une carte, en millimètres, pour les dessins à taille réelle. */
export function placeDe(format: Format, parPage: 4 | 6): { l: number; h: number } {
  if (format === "pinces") return { l: 46, h: 34 };
  return parPage === 4 ? { l: 70, h: 84 } : { l: 70, h: 46 };
}

export interface Serie { type: TypeDeCarte; format: Format; cartes: Carte[] }

/**
 * La série : des cartes toutes différentes, tirées de la graine — la même
 * graine redonne les mêmes cartes. Une banque finie s'épuise : la série
 * s'arrête alors avant le nombre demandé.
 */
export function cartesDeLaSerie(r: ReglagesCartes, graine: number): Serie {
  const type = typeDe(r.type) ?? TYPES[0];
  const format = formatDe(type, r.format);
  const alea = hasard(graine);
  const banques = new Map<string, { liste: unknown[]; i: number }>();
  const pioche = <T,>(cle: string, liste: readonly T[]): T => {
    let b = banques.get(cle);
    if (!b || b.i >= b.liste.length) {
      b = { liste: melanger(alea, liste), i: 0 };
      banques.set(cle, b);
    }
    return b.liste[b.i++] as T;
  };
  const ctx: Contexte = { alea, classe: r.classe, format, place: placeDe(format, r.parPage), options: optionsDe(type, r), pioche };
  const combien = Math.max(1, Math.min(COMBIEN_MAX, r.combien));
  const vues = new Set<string>();
  const cartes: Carte[] = [];
  for (let essai = 0; cartes.length < combien && essai < combien * 40; essai++) {
    let c: Carte | null = null;
    try { c = type.tirer(ctx); } catch { c = null; }
    if (!c || vues.has(c.cle)) continue;
    if (format === "pinces" && (c.choix.length < 2 || c.juste < 0 || c.juste >= c.choix.length)) continue;
    vues.add(c.cle);
    cartes.push(c);
  }
  return { type, format, cartes };
}

/** Le texte d'une proposition, sans ses balises : c'est sa longueur qui règle la largeur de la colonne. */
const longueur = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, "x").length;

/** La largeur de la colonne des propositions : étroite pour des nombres, large pour des mots. */
export function largeurDesChoix(choix: string[]): "s" | "m" | "l" | "xl" {
  const plus = Math.max(0, ...choix.map(longueur));
  return plus <= 4 ? "s" : plus <= 9 ? "m" : plus <= 15 ? "l" : "xl";
}

const coin = (i: number, marque: string) =>
  `<div class="ct-coin"><span class="ct-n">${i + 1}</span>${marque ? `<span class="ct-marque">${escapeHtml(marque)}</span>` : ""}</div>`;

function cartePinces(c: Carte, i: number, r: ReglagesCartes, largeur: string): string {
  return `<div class="ct-c ct-pinces ct-choix-${largeur}">
    <div class="ct-gauche">${coin(i, r.marque)}${r.question ? `<div class="ct-question">${escapeHtml(c.question)}</div>` : ""}<div class="ct-visuel">${c.visuel}</div></div>
    <div class="ct-choix">${c.choix.map((x) => `<div>${x}</div>`).join("")}</div>
  </div>`;
}

/**
 * Le dos d'une carte à pinces, imprimé à sa droite : pliée sur le trait du
 * milieu, la carte se retourne et sa colonne de propositions passe à gauche,
 * au même niveau ; le point dit où la pince devait aller.
 */
function dosPinces(c: Carte, i: number, largeur: string): string {
  return `<div class="ct-c ct-pinces ct-dos ct-choix-${largeur}">
    <div class="ct-choix">${c.choix.map((_, k) => `<div>${k === c.juste ? `<span class="ct-point"></span>` : ""}</div>`).join("")}</div>
    <div class="ct-gauche"><div class="ct-dos-num">${i + 1}</div></div>
  </div>`;
}

function carteTache(c: Carte, i: number, r: ReglagesCartes): string {
  const ligne = c.ligne === "" ? "" : `<div class="ct-ligne">${c.ligne ?? `<span class="ct-pointilles"></span>`}</div>`;
  return `<div class="ct-c ct-tache">
    <div class="ct-tete"><span class="ct-num">${i + 1}</span><span class="ct-q">${escapeHtml(c.question)}</span>${r.marque ? `<span class="ct-marque">${escapeHtml(r.marque)}</span>` : ""}</div>
    <div class="ct-visuel">${c.visuel}</div>${ligne}
  </div>`;
}

/** Ce qu'on dit à l'enseignant en tête de la première page : comment s'en servir. */
export function regleDeLaSerie(s: Serie, r: ReglagesCartes): string {
  const comment = s.format === "pinces"
    ? r.dos
      ? "Découpez chaque bande, pliez-la en deux sur le pointillé du milieu, collez les deux moitiés dos à dos, puis plastifiez. L'élève lit la carte et pose une pince à linge sur la bonne réponse ; il retourne la carte pour vérifier : la pince doit être sur le point."
      : "Découpez les cartes, plastifiez-les si vous voulez. L'élève lit la carte et pose une pince à linge sur la bonne réponse."
    : "Découpez les cartes. L'élève écrit sa réponse sur la carte plastifiée, au feutre effaçable, ou sur sa fiche réponse, en face du numéro de la carte.";
  return `<div class="titre">${escapeHtml(s.type.nom)} — ${r.classe}</div>
    <div class="regle"><b>${s.format === "pinces" ? "Cartes à pinces" : "Cartes à tâches"}</b>${comment}${s.type.note ? ` ${escapeHtml(s.type.note)}` : ""} <span class="reference">${escapeHtml(s.type.source)}.</span></div>`;
}

function ficheReponse(s: Serie): string {
  const lignes = s.cartes.map((_, i) => `<div class="ct-f"><span class="ct-f-n">${i + 1}</span><span class="ct-f-blanc"></span><span class="ct-f-coche"></span></div>`).join("");
  return `<div class="page ct-fiche"><div class="titre">Fiche réponse — ${escapeHtml(s.type.nom)}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="ct-f-grille">${lignes}</div>
    <div class="ct-f-score">Réussi : ........ sur ${s.cartes.length}</div></div>`;
}

function corrige(s: Serie): string {
  return `<div class="page corrige"><div class="titre">Corrigé — ${escapeHtml(s.type.nom)}</div>
    <div class="ct-corrige">${s.cartes.map((c, i) => `<div><b>${i + 1}.</b> ${c.reponse}</div>`).join("")}</div></div>`;
}

/** Les étiquettes-réponses des devinettes, et un leurre par carte, mélangés. */
function etiquettes(s: Serie, graine: number): string {
  const textes = melanger(hasard(graine + 1), [...s.cartes.flatMap((c) => (c.etiquette ? [c.etiquette] : [])), ...s.cartes.flatMap((c) => c.leurres ?? [])]);
  if (!textes.length) return "";
  const cellules = textes.map((t) => carte(`<div class="ct-etiq">${escapeHtml(t)}</div>`, "ct-etiq-cellule"));
  const tete = `<div class="titre">Les étiquettes-réponses</div><div class="sous">À découper : chaque devinette retrouve son nombre. Certaines étiquettes ne vont avec aucune carte.</div>`;
  return pagesDeCartes(cellules, { colonnes: 4, lignes: 7, hauteurMm: 30 }, tete);
}

/** La couleur des cartes : une de la palette, rien d'autre ne va dans le style. */
const couleurSure = (c: string) => (COULEURS.some((x) => x.hex === c) ? c : COULEURS[0].hex);

/** La feuille entière : les cartes (et leur dos), la fiche réponse, le corrigé, les étiquettes. */
export function htmlDeLaSerie(s: Serie, r: ReglagesCartes, graine: number): string {
  const tete = regleDeLaSerie(s, r);
  let corps: string;
  if (s.format === "pinces") {
    const format: FormatGrille = { colonnes: 2, lignes: 4, hauteurMm: HAUTEUR_PINCES };
    // Une seule largeur de colonne pour toute la série : les cartes se ressemblent, et les dos aussi.
    const largeur = largeurDesChoix(s.cartes.flatMap((c) => c.choix));
    const rectos = s.cartes.map((c, i) => carte(cartePinces(c, i, r, largeur), "ct-cellule"));
    corps = r.dos
      ? pagesAvecRegle(s.cartes.map((c, i) => `<div class="carte ct-paire"><div class="ct-moitie">${cartePinces(c, i, r, largeur)}</div>`
        + `<div class="ct-pli" title="Plier ici"></div><div class="ct-moitie">${dosPinces(c, i, largeur)}</div></div>`), { ...format, colonnes: 1 }, tete)
      : pagesAvecRegle(rectos, format, tete);
  } else {
    const lignes = r.parPage === 4 ? 2 : 3;
    corps = pagesAvecRegle(s.cartes.map((c, i) => carte(carteTache(c, i, r), "ct-cellule")), { colonnes: 2, lignes, hauteurMm: HAUTEUR_TACHE[r.parPage] }, tete);
  }
  const avecEtiquettes = r.etiquettes && s.cartes.some((c) => c.etiquette);
  return `<div class="feuille ct" style="--ct:${couleurSure(r.couleur)}">${corps}${avecEtiquettes ? etiquettes(s, graine) : ""}${r.fiche ? ficheReponse(s) : ""}${corrige(s)}</div>`;
}

export const STYLE_CARTES_A_TACHES = `
  .feuille.ct { --ct: #2c5f9e; }
  .feuille.ct *, .feuille.ct *::before, .feuille.ct *::after { box-sizing: border-box; }
  .feuille.ct .carte.ct-cellule { display: block; padding: 2.2mm; gap: 0; }
  .feuille.ct .carte.ct-paire { display: flex; flex-direction: row; align-items: stretch; padding: 0; gap: 0; }
  .ct-moitie { flex: 1 1 0; min-width: 0; padding: 2.2mm; }
  .ct-pli { flex: none; width: 0; border-left: 0.35mm dashed #9aa0b4; position: relative; }
  .ct-pli::after { content: "pli"; position: absolute; top: 50%; left: -2.6mm; transform: translateY(-50%) rotate(-90deg);
    font-size: 6.5px; color: #9aa0b4; background: #fff; padding: 0 .6mm; }
  .ct-c { position: relative; width: 100%; height: 100%; border: 0.6mm solid #1c2233; border-radius: 3mm; background: #fff;
    overflow: hidden; text-align: center; color: #1c2233; }
  .ct-pinces { display: grid; grid-template-columns: minmax(0, 1fr) var(--choix); }
  .ct-pinces.ct-dos { grid-template-columns: var(--choix) minmax(0, 1fr); }
  .ct-choix-s { --choix: 20mm; } .ct-choix-m { --choix: 28mm; } .ct-choix-l { --choix: 37mm; } .ct-choix-xl { --choix: 45mm; }
  .ct-gauche { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 5mm 2mm 2mm; gap: 1mm; }
  .ct-question { flex: none; font-size: 10px; font-weight: 700; line-height: 1.2; color: #3b4256; }
  .ct-visuel { flex: 1 1 0; min-height: 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
  .ct-dessin { width: 100%; height: 100%; min-height: 0; }
  .ct-dessin > svg { width: 100%; height: 100%; display: block; }
  .ct-reel svg { display: block; }
  .ct-choix { display: flex; flex-direction: column; border-left: 0.6mm solid #1c2233; min-height: 0; }
  .ct-dos .ct-choix { border-left: 0; border-right: 0.6mm solid #1c2233; }
  .ct-choix > div { flex: 1 1 0; display: flex; align-items: center; justify-content: center; border-top: 0.6mm solid #1c2233;
    font-size: 17px; font-weight: 600; line-height: 1.1; padding: 0 1.5mm; min-height: 0; overflow-wrap: anywhere; }
  .ct-choix > div:first-child { border-top: 0; }
  .ct-choix-l .ct-choix > div { font-size: 14px; } .ct-choix-xl .ct-choix > div { font-size: 12px; }
  .ct-coin { position: absolute; top: 1.3mm; left: 2mm; display: flex; gap: 1.5mm; align-items: center; }
  .ct-n { font-size: 8.5px; font-weight: 800; color: var(--ct); }
  .ct-marque { font-size: 7.5px; font-weight: 700; color: var(--ct); border: 0.3mm solid var(--ct); border-radius: 10mm; padding: 0 1.6mm; line-height: 1.5; white-space: nowrap; }
  .ct-point { display: inline-block; width: 7mm; height: 7mm; border-radius: 50%; background: var(--ct); }
  .ct-dos-num { margin: auto; font-size: 30px; font-weight: 800; color: #e3e6ef; }

  .ct-tache { display: flex; flex-direction: column; padding: 2.5mm 3mm 3mm; gap: 2mm; }
  .ct-tete { flex: none; display: flex; align-items: center; gap: 2mm; text-align: left; }
  .ct-num { flex: none; width: 7.5mm; height: 7.5mm; border-radius: 50%; background: var(--ct); color: #fff; font-size: 13px; font-weight: 800;
    display: flex; align-items: center; justify-content: center; }
  .ct-q { flex: 1; min-width: 0; font-size: 12px; font-weight: 700; line-height: 1.25; background: #eef1f6; border-radius: 3mm; padding: 1.3mm 2.5mm; }
  .ct-tache .ct-marque { flex: none; }
  .ct-ligne { flex: none; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 1.5mm; flex-wrap: wrap; }
  .ct-pointilles { display: inline-block; width: 42mm; height: 6mm; border-bottom: 0.4mm dotted #1c2233; }
  .ct-ligne .ct-blanc { width: 20mm; }
  .ct-blanc.ct-blanc-lettre { width: 7mm; margin: 0 .3mm; }
  .ct-nombre.ct-texte-moyen { font-size: 16px; }
  .ct-blanc { display: inline-block; width: 15mm; height: 7.5mm; border: 0.4mm solid #1c2233; border-radius: 1.2mm; vertical-align: middle; margin: 0 1mm; background: #fff; }

  .ct-texte { font-size: 22px; font-weight: 700; line-height: 1.25; max-width: 100%; overflow-wrap: anywhere; }
  .ct-texte-moyen { font-size: 15px; } .ct-texte-long { font-size: 12.5px; }
  .ct-nombre { font-size: 23px; font-weight: 800; }
  .ct-pinces .ct-nombre { font-size: 20px; }
  .ct-phrase { font-size: 15px; font-weight: 600; line-height: 1.4; }
  .ct-pinces .ct-phrase { font-size: 13px; }
  .ct-mot { font-size: 26px; font-weight: 700; letter-spacing: .4px; }
  .ct-lettre { font-size: 64px; font-weight: 700; line-height: 1; }
  .ct-son { font-size: 34px; font-weight: 800; color: var(--ct); }
  .ct-consigne-grande { font-size: 20px; font-weight: 800; color: var(--ct); line-height: 1.15; }
  .ct-enonce { font-size: 12.5px; line-height: 1.4; text-align: left; font-weight: 500; overflow-wrap: anywhere; }
  .ct-pinces .ct-enonce { font-size: 10px; line-height: 1.3; }
  .ct-devinette { font-size: 13px; line-height: 1.4; text-align: left; font-weight: 600; }
  .ct-devinette div + div { margin-top: 1mm; }
  .ct-pinces .ct-devinette { font-size: 10px; line-height: 1.3; }
  .ct-aide { font-size: 11px; color: #687087; margin-top: 1mm; font-weight: 600; }
  .ct-signe { font-size: 28px; font-weight: 800; line-height: 1; }
  .ct-frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; line-height: 1.05; font-weight: 700; margin: 0 .5mm; }
  .ct-frac > span:first-child { border-bottom: 0.4mm solid currentColor; padding: 0 1mm; }
  .ct-objets { display: flex; flex-wrap: wrap; gap: 1.2mm; align-items: center; justify-content: center; }
  .ct-objets svg { flex: none; }
  .ct-deux { display: flex; align-items: stretch; gap: 1.5mm; width: 100%; height: 100%; }
  .ct-deux > div { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; min-width: 0; min-height: 0; }
  .ct-deux > div > span { flex: none; font-size: 8.5px; font-weight: 700; color: #687087; text-transform: uppercase; letter-spacing: .3px; }
  .ct-deux .ct-dessin { flex: 1 1 0; }
  .ct-deux > b { align-self: center; font-size: 18px; color: var(--ct); }

  .ct-fiche .ct-f-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm 10mm; margin-top: 6mm; }
  .ct-f { display: flex; align-items: center; gap: 3mm; }
  .ct-f-n { flex: none; width: 8mm; height: 8mm; border-radius: 50%; background: var(--ct); color: #fff; font-weight: 800; font-size: 12px;
    display: flex; align-items: center; justify-content: center; }
  .ct-f-blanc { flex: 1; height: 8mm; border-bottom: 0.4mm dotted #1c2233; }
  .ct-f-coche { flex: none; width: 6mm; height: 6mm; border: 0.4mm solid #9aa0b4; border-radius: 1mm; }
  .ct-f-score { margin-top: 8mm; font-size: 14px; font-weight: 700; text-align: right; }
  .ct-corrige { columns: 2; column-gap: 10mm; font-size: 12.5px; line-height: 1.7; }
  .ct-corrige > div { break-inside: avoid; }
  .feuille.ct .carte.ct-etiq-cellule { display: block; padding: 2mm; }
  .ct-etiq { width: 100%; height: 100%; background: var(--ct); color: #fff; font-size: 19px; font-weight: 800; padding-bottom: 4mm;
    display: flex; align-items: center; justify-content: center; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
`;
