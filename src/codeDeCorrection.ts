// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Le code de correction des écrits, pour le mur ─────────────────────────
//
// « Fais-en encore plus » (l'enseignant, 4 novembre 2026), après les tables
// de multiplication, la frise alphabétique et les tableaux de conjugaison.
//
// Le guide « Pour enseigner la lecture et l'écriture au CE1 » (Éduscol, 2019)
// donne à l'élève une typologie des erreurs : pour chaque sorte d'erreur, ce
// qu'il fait pour corriger son écrit ; au CE1, on s'en tient aux erreurs de
// sons, aux erreurs lexicales et aux erreurs d'accord dans le groupe nominal
// et entre le groupe nominal et le verbe (p. 106). L'exemple du guide vient
// d'un ouvrage publié ailleurs : on ne le recopie pas. Les mots, les
// stratégies et les exemples d'ici sont ceux de Maitrize ; les codes et les
// couleurs sont au choix de l'enseignant — aucun texte officiel n'en impose,
// comme pour le code de la phrase (voir codeDeLaPhrase.ts).

import { feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type TypeErreur = "son" | "dictionnaire" | "gn" | "verbe" | "homophones" | "decoupage";

export interface DefinitionErreur {
  id: TypeErreur;
  nom: string;
  /** Ce qui ne va pas, du point de vue de l'élève. */
  quoi: string;
  /** Ce qu'il fait pour corriger. */
  strategies: string[];
  /** Un exemple : ce qui est écrit, ce qu'il fallait écrire. */
  exemple: [string, string];
  code: string;
  couleur: string;
  /** Au CE1, les quatre premières seulement (guide CE1, p. 106). */
  ce1: boolean;
}

export const ERREURS: DefinitionErreur[] = [
  {
    id: "son", nom: "Le son", quoi: "Un son manque, ou ce n'est pas le bon.", ce1: true, code: "S", couleur: "#d33a32",
    strategies: ["Je relis le mot à voix basse, syllabe par syllabe.", "Je vérifie que chaque son est écrit."],
    exemple: ["la tabe", "la table"],
  },
  {
    id: "dictionnaire", nom: "Le dictionnaire", quoi: "Le mot se lit bien, mais il ne s'écrit pas comme ça.", ce1: true, code: "D", couleur: "#2a6fd6",
    strategies: ["Je cherche le mot dans le dictionnaire, mon répertoire ou les affichages.", "Je pense à un mot de la même famille : grand, grande."],
    exemple: ["un bato", "un bateau"],
  },
  {
    id: "gn", nom: "L'accord dans le groupe nominal", quoi: "Les mots du groupe nominal ne sont pas accordés.", ce1: true, code: "GN", couleur: "#2f855a",
    strategies: ["Je trouve le nom : singulier ou pluriel ? masculin ou féminin ?", "J'accorde le déterminant et l'adjectif avec lui."],
    exemple: ["les petit chat", "les petits chats"],
  },
  {
    id: "verbe", nom: "L'accord du verbe", quoi: "Le verbe n'est pas accordé avec son sujet.", ce1: true, code: "V", couleur: "#7e57c2",
    strategies: ["Je trouve le verbe et son sujet.", "Je remplace le sujet par il, elle, ils ou elles.", "J'écris la terminaison qui va avec."],
    exemple: ["les enfants joue", "les enfants jouent"],
  },
  {
    id: "homophones", nom: "Les mots qui se disent pareil", quoi: "Ce mot se dit comme un autre, mais ce n'est pas le bon.", ce1: false, code: "H", couleur: "#c05621",
    strategies: ["Je le remplace par un autre mot pour vérifier : est → était, a → avait."],
    exemple: ["il et content", "il est content"],
  },
  {
    id: "decoupage", nom: "Les mots à séparer", quoi: "Des mots sont collés, ou un mot est coupé.", ce1: false, code: "/", couleur: "#6b7287",
    strategies: ["Je cherche les mots que je connais dans ce que j'ai écrit.", "Je sépare l', d' ou qu' du mot qui suit."],
    exemple: ["lécole", "l'école"],
  },
];

export const erreur = (id: TypeErreur) => ERREURS.find((e) => e.id === id)!;

export interface ReglagesCodeCorrection {
  types: TypeErreur[];
  /** Les codes et les couleurs de la classe ; absents, ceux de départ. */
  codes: Partial<Record<TypeErreur, string>>;
  couleurs: Partial<Record<TypeErreur, string>>;
  strategies: boolean;
  exemples: boolean;
  titre: string;
  format: "mur" | "cahier";
}

export const REGLAGES_CODE_CORRECTION: ReglagesCodeCorrection = {
  types: ERREURS.filter((e) => e.ce1).map((e) => e.id), codes: {}, couleurs: {}, strategies: true, exemples: true,
  titre: "Je corrige mon écrit", format: "mur",
};

export function reglagesCodeCorrectionSurs(brut: Partial<ReglagesCodeCorrection> | null | undefined): ReglagesCodeCorrection {
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesCodeCorrection>;
  const d = REGLAGES_CODE_CORRECTION;
  const types = Array.isArray(o.types) ? ERREURS.map((e) => e.id).filter((id) => o.types!.includes(id)) : d.types;
  const codes: Partial<Record<TypeErreur, string>> = {};
  const couleurs: Partial<Record<TypeErreur, string>> = {};
  for (const e of ERREURS) {
    const c = o.codes?.[e.id];
    if (typeof c === "string" && c.trim()) codes[e.id] = c.trim().slice(0, 4);
    const k = o.couleurs?.[e.id];
    if (typeof k === "string" && /^#[0-9a-f]{6}$/i.test(k)) couleurs[e.id] = k;
  }
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    types: types.length ? types : d.types, codes, couleurs,
    strategies: oui(o.strategies, d.strategies), exemples: oui(o.exemples, d.exemples),
    titre: typeof o.titre === "string" ? o.titre.slice(0, 60) : d.titre,
    format: o.format === "cahier" ? "cahier" : "mur",
  };
}

export const codeDe = (e: DefinitionErreur, r: Pick<ReglagesCodeCorrection, "codes">) => r.codes[e.id] ?? e.code;
export const couleurDe = (e: DefinitionErreur, r: Pick<ReglagesCodeCorrection, "couleurs">) => r.couleurs[e.id] ?? e.couleur;

/**
 * La plus grande écriture (en mm) qui laisse la page d'un seul tenant : on
 * estime, pour chaque erreur, les lignes que feront son nom, sa phrase, ses
 * stratégies et son exemple à cette taille — une lettre fait environ la
 * moitié de sa hauteur en largeur —, et l'on descend jusqu'à ce que tout tienne.
 */
export function tailleDuCode(r: Pick<ReglagesCodeCorrection, "types" | "strategies" | "exemples">): number {
  const lignes = r.types.map(erreur);
  const largeurCorps = 182 - 8 - 17 - (r.exemples ? 44 + 4 : 0) - 4;
  const nbLignes = (texte: string, taille: number, largeur: number) => Math.max(1, Math.ceil((texte.length * 0.52 * taille) / largeur));
  const hauteur = (t: number) => 22 + 3.5 * (lignes.length - 1) + lignes.reduce((somme, e) => {
    const corps = nbLignes(e.nom, 1.12 * t, largeurCorps) * 1.15 * 1.12 * t + 1 + nbLignes(e.quoi, t, largeurCorps) * 1.3 * t
      + (r.strategies ? 1.5 + e.strategies.reduce((s, x) => s + nbLignes(x, 0.9 * t, largeurCorps - 5) * 1.3 * 0.9 * t, 0) : 0);
    const exemple = r.exemples ? (nbLignes(e.exemple[0], 0.95 * t, 44) + 1 + nbLignes(e.exemple[1], 0.95 * t, 44)) * 1.2 * 0.95 * t : 0;
    return somme + 7.6 + Math.max(17, corps, exemple);
  }, 0);
  let t = 6;
  while (t > 3.6 && hauteur(t) > 246) t -= 0.1;
  return Math.round(t * 10) / 10;
}

function pageDuCode(r: ReglagesCodeCorrection): string {
  const lignes = r.types.map(erreur);
  const taille = tailleDuCode(r);
  return `<div class="cc-page" style="--cc-ecrit:${Math.round(taille * 10) / 10}mm">`
    + `<div class="cc-titre">${escapeHtml(r.titre.trim() || "Je corrige mon écrit")}</div>`
    + `<div class="cc-lignes">`
    + lignes.map((e) => `<section class="cc-ligne" style="--cc-teinte:${couleurDe(e, r)}">`
      + `<div class="cc-code">${escapeHtml(codeDe(e, r))}</div>`
      + `<div class="cc-corps"><div class="cc-nom">${escapeHtml(e.nom)}</div><div class="cc-quoi">${escapeHtml(e.quoi)}</div>`
      + (r.strategies ? `<ul class="cc-strategies">${e.strategies.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "")
      + `</div>`
      + (r.exemples ? `<div class="cc-exemple"><span class="cc-faux">${escapeHtml(e.exemple[0])}</span>`
        + `<span class="cc-fleche">→</span><span class="cc-juste">${escapeHtml(e.exemple[1])}</span></div>` : "")
      + `</section>`).join("")
    + `</div></div>`;
}

export function htmlCodeCorrection(brut: Partial<ReglagesCodeCorrection>): string {
  const r = reglagesCodeCorrectionSurs(brut);
  const page = pageDuCode(r);
  return feuille(r.format === "cahier"
    ? `<div class="page cc-planche">${`<div class="cc-petit">${page}</div>`.repeat(4)}</div>`
    : `<div class="page">${page}</div>`, "cc");
}

export const titreCodeCorrection = (brut: Partial<ReglagesCodeCorrection>) =>
  reglagesCodeCorrectionSurs(brut).titre.trim() || "Je corrige mon écrit";

const NOIR = "#1c2233";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

export const STYLE_CODE_CORRECTION = `
  /* La page prend toute la largeur utile : sans la marge du document (voir print.ts), qui la faisait réduire et décentrer. */
  @media print { body { padding: 0; } }
  .feuille.cc .cc-page { width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 5mm;
    color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.cc .cc-titre { font-size: 10mm; font-weight: 800; text-align: center; line-height: 1.15; }
  .feuille.cc .cc-lignes { flex: 1; display: flex; flex-direction: column; gap: 3.5mm; min-height: 0; }
  .feuille.cc .cc-ligne { flex: 1 1 auto; display: flex; align-items: center; gap: 4mm; border: 0.8mm solid var(--cc-teinte); border-radius: 3mm; padding: 3mm 4mm;
    min-height: 0; break-inside: avoid; page-break-inside: avoid; }
  .feuille.cc .cc-code { flex: none; width: 17mm; height: 17mm; border-radius: 50%; background: var(--cc-teinte); color: #fff; display: flex;
    align-items: center; justify-content: center; font-size: 8mm; font-weight: 800; }
  .feuille.cc .cc-corps { flex: 1; min-width: 0; }
  .feuille.cc .cc-nom { font-size: calc(var(--cc-ecrit) * 1.12); font-weight: 800; color: var(--cc-teinte); line-height: 1.15; }
  .feuille.cc .cc-quoi { font-size: var(--cc-ecrit); line-height: 1.3; margin-top: 1mm; }
  .feuille.cc .cc-strategies { margin: 1.5mm 0 0; padding-left: 5mm; font-size: calc(var(--cc-ecrit) * 0.9); line-height: 1.3; color: #34394d; }
  .feuille.cc .cc-exemple { flex: none; width: 44mm; display: flex; flex-direction: column; align-items: center; gap: 0.5mm; text-align: center;
    font-size: calc(var(--cc-ecrit) * 0.95); line-height: 1.2; }
  .feuille.cc .cc-faux { color: #7d8399; text-decoration: line-through; text-decoration-thickness: 0.4mm; }
  .feuille.cc .cc-fleche { color: #9aa0b4; }
  .feuille.cc .cc-juste { font-weight: 700; color: var(--cc-teinte); }
  /* Pour le cahier : quatre par planche, dans leur pointillé de découpe. */
  .feuille.cc .cc-planche { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 250mm; box-sizing: border-box; }
  .feuille.cc .cc-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden;
    display: flex; align-items: center; justify-content: center; }
`;
