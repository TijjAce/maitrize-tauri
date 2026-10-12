// ── Le code de la phrase : les couleurs et les marques de l'analyse ─────────
//
// Souligner le groupe sujet en bleu, entourer le verbe en rouge, encadrer les
// compléments en vert : chaque classe a son code, et l'élève doit le
// retrouver pareil d'une feuille à l'autre. L'enseignant choisit le sien une
// fois, dans Aides à la tâche ; la carte du code, les consignes et les
// corrigés des feuilles de grammaire le reprennent.
//
// La couleur n'est jamais seule : chaque constituant a aussi sa marque —
// souligné, entouré, encadré… —, qui reste lisible photocopiée en noir et
// blanc (Cap école inclusive ; WCAG 1.4.1). Les mots marqués portent leur
// style en ligne : l'aperçu, l'impression, le PDF et les tablettes les
// montrent pareil, sans feuille de style à transmettre.

import { escapeHtml } from "./print";

export type Marque = "souligner" | "double" | "pointilles" | "entourer" | "encadrer" | "crochets" | "surligner";

/** Les marques, et ce que la consigne fait faire pour chacune. */
export const MARQUES: { id: Marque; nom: string }[] = [
  { id: "souligner", nom: "souligné" },
  { id: "double", nom: "souligné deux fois" },
  { id: "pointilles", nom: "souligné en pointillés" },
  { id: "entourer", nom: "entouré" },
  { id: "encadrer", nom: "encadré" },
  { id: "crochets", nom: "entre crochets" },
  { id: "surligner", nom: "surligné" },
];

/** Des couleurs qu'on nomme dans une consigne — « en bleu » —, assez foncées pour un trait fin. */
export const COULEURS: { id: string; nom: string; hex: string }[] = [
  { id: "bleu", nom: "bleu", hex: "#1d4ed8" },
  { id: "rouge", nom: "rouge", hex: "#d33a32" },
  { id: "vert", nom: "vert", hex: "#1f9a48" },
  { id: "orange", nom: "orange", hex: "#e8590c" },
  { id: "violet", nom: "violet", hex: "#7c3aed" },
  { id: "rose", nom: "rose", hex: "#db2777" },
  { id: "marron", nom: "marron", hex: "#8b5a2b" },
  { id: "jaune", nom: "jaune", hex: "#d4a106" },
  { id: "noir", nom: "noir", hex: "#1c2233" },
];

export type IdConstituant = "sujet" | "verbe" | "complement";

export interface Constituant {
  id: IdConstituant;
  /** Comme la consigne le nomme : « le groupe sujet ». */
  nom: string;
  /** Au pluriel, quand la phrase en a plusieurs : « les compléments ». */
  pluriel: string;
  /** Sur la carte du code : « Le groupe sujet ». */
  libelle: string;
  /** Comment le trouver : la manipulation qui le fait reconnaître. */
  indice: string;
}

export const CONSTITUANTS: Constituant[] = [
  { id: "sujet", nom: "le groupe sujet", pluriel: "les groupes sujets", libelle: "Le groupe sujet",
    indice: "Je peux l'encadrer par « C'est… qui »." },
  { id: "verbe", nom: "le verbe", pluriel: "les verbes", libelle: "Le verbe",
    indice: "Je peux l'encadrer par « ne… pas » ; il change si je change le temps." },
  { id: "complement", nom: "les compléments", pluriel: "les compléments", libelle: "Les compléments",
    indice: "Je peux souvent les déplacer ou les supprimer." },
];

export interface MarqueDuConstituant { couleur: string; marque: Marque }

export type CodeDeLaPhrase = Record<IdConstituant, MarqueDuConstituant>;

/** Le code proposé d'abord : le bleu, le rouge et le vert que l'enseignant a choisis pour sa feuille de grammaire. */
export const CODE_PAR_DEFAUT: CodeDeLaPhrase = {
  sujet: { couleur: "bleu", marque: "souligner" },
  verbe: { couleur: "rouge", marque: "entourer" },
  complement: { couleur: "vert", marque: "encadrer" },
};

/** La clé du réglage, sous « fabriquer: » comme ceux des ateliers (voir useReglages). */
export const CLE_CODE = "codePhrase";

const couleurDe = (id: string) => COULEURS.find((c) => c.id === id) ?? COULEURS[COULEURS.length - 1];

/** Le code enregistré, réparé : ce qui manque ou ne se connaît pas reprend le code par défaut. */
export function lireCode(brut: unknown): CodeDeLaPhrase {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const code = { ...CODE_PAR_DEFAUT };
  for (const c of CONSTITUANTS) {
    const x = (o[c.id] && typeof o[c.id] === "object" ? o[c.id] : {}) as Record<string, unknown>;
    code[c.id] = {
      couleur: COULEURS.some((k) => k.id === x.couleur) ? String(x.couleur) : CODE_PAR_DEFAUT[c.id].couleur,
      marque: MARQUES.some((k) => k.id === x.marque) ? (x.marque as Marque) : CODE_PAR_DEFAUT[c.id].marque,
    };
  }
  return code;
}

/** Le code de cet ordinateur, tel que l'atelier l'a gardé ; le code par défaut s'il n'y en a pas. */
export function codeActuel(): CodeDeLaPhrase {
  try {
    const brut = localStorage.getItem(`fabriquer:${CLE_CODE}`);
    return lireCode(brut ? JSON.parse(brut) : undefined);
  } catch {
    return CODE_PAR_DEFAUT;
  }
}

/**
 * Ce que fait faire la consigne pour un constituant : « Souligne le groupe
 * sujet en bleu. » `quoi` le nomme autrement quand il le faut : « le
 * complément », « les verbes ».
 */
export function etapeDuCode(code: CodeDeLaPhrase, id: IdConstituant, quoi?: string): string {
  const c = CONSTITUANTS.find((x) => x.id === id)!;
  const { couleur, marque } = code[id];
  const nom = quoi ?? c.nom;
  const en = `en ${couleurDe(couleur).nom}`;
  switch (marque) {
    case "souligner": return `Souligne ${nom} ${en}.`;
    case "double": return `Souligne deux fois ${nom} ${en}.`;
    case "pointilles": return `Souligne ${nom} en pointillés, ${en}.`;
    case "entourer": return `Entoure ${nom} ${en}.`;
    case "encadrer": return `Encadre ${nom} ${en}.`;
    case "crochets": return `Mets ${nom} entre crochets, ${en}.`;
    case "surligner": return `Surligne ${nom} ${en}.`;
  }
}

/** Le style en ligne d'un mot marqué. */
function styleDe(m: MarqueDuConstituant): string {
  const c = couleurDe(m.couleur).hex;
  switch (m.marque) {
    case "souligner": return `border-bottom:2.5px solid ${c};padding-bottom:1px`;
    case "double": return `border-bottom:4.5px double ${c};padding-bottom:1px`;
    case "pointilles": return `border-bottom:2.5px dotted ${c};padding-bottom:1px`;
    case "entourer": return `border:2px solid ${c};border-radius:3mm;padding:0 1mm`;
    case "encadrer": return `border:2px solid ${c};padding:0 1mm`;
    case "crochets": return "";
    // Un fond clair de la couleur : le texte reste noir et lisible.
    case "surligner": return `background:${c}38;padding:0 0.6mm;-webkit-box-decoration-break:clone;box-decoration-break:clone`;
  }
}

/** Un groupe de mots marqué selon le code : déjà échappé, ou à échapper. */
export function marquer(code: CodeDeLaPhrase, id: IdConstituant, texte: string, dejaEchappe = false): string {
  const m = code[id];
  const t = dejaEchappe ? texte : escapeHtml(texte);
  if (m.marque === "crochets") {
    const c = couleurDe(m.couleur).hex;
    return `<span class="cp-${id}"><b style="color:${c}">[</b>${t}<b style="color:${c}">]</b></span>`;
  }
  return `<span class="cp-${id}" style="${styleDe(m)}">${t}</span>`;
}

/** La couleur d'un constituant, pour l'écran : sa pastille dans l'atelier. */
export const hexDe = (code: CodeDeLaPhrase, id: IdConstituant) => couleurDe(code[id].couleur).hex;

/** Une phrase analysée, sans ses marques : « Le chat boit son lait. » */
export const phraseSansAnalyse = (p: string) => p.replace(/\[[SVC]:([^\]]+)\]/g, "$1");

/** Une phrase analysée — « [S:Le chat] [V:boit] [C:son lait]. » —, chaque groupe marqué selon le code. */
export function phraseAnalysee(p: string, code: CodeDeLaPhrase): string {
  return escapeHtml(p).replace(/\[([SVC]):([^\]]+)\]/g, (_m, k: string, g: string) => marquer(code, k === "S" ? "sujet" : k === "V" ? "verbe" : "complement", g, true));
}

// ── La carte du code ──────────────────────────────────────────────────────
//
// L'aide à la tâche elle-même : le code, sous les yeux de l'élève pendant
// qu'il analyse. Une phrase d'exemple marquée, puis chaque groupe avec sa
// marque et ce qui le fait reconnaître. Une carte par élève, un bandeau pour
// la table, une affiche pour le mur.

export type FormatCarte = "cartes" | "bandeau" | "affiche";

export const FORMATS_CARTE: { id: FormatCarte; nom: string; quoi: string }[] = [
  { id: "cartes", nom: "Quatre cartes", quoi: "une par élève, à garder dans le cahier ou la trousse" },
  { id: "bandeau", nom: "Le bandeau de la table", quoi: "trois bandes par page, à coller sur la table" },
  { id: "affiche", nom: "L'affiche", quoi: "une page entière, pour le mur de la classe" },
];

/** Les phrases d'exemple, analysées : un complément, puis deux, dont un qu'on déplace. */
export const EXEMPLES_CODE = [
  "[S:Le petit chat] [V:boit] [C:son lait].",
  "[S:Les enfants] [V:jouent] [C:dans la cour].",
  "[C:Ce matin], [S:Léa] [V:prépare] [C:un gâteau].",
];

export interface ReglagesCarteCode {
  format: FormatCarte;
  /** La phrase d'exemple, dans EXEMPLES_CODE. */
  exemple: number;
  /** Ce qui fait reconnaître chaque groupe : « C'est… qui », « ne… pas »… */
  indices: boolean;
}

export const REGLAGES_CARTE_CODE: ReglagesCarteCode = { format: "cartes", exemple: 0, indices: true };

export function reglagesCarteSurs(brut: Partial<ReglagesCarteCode>): ReglagesCarteCode {
  return {
    format: FORMATS_CARTE.some((f) => f.id === brut.format) ? brut.format! : "cartes",
    exemple: Number.isInteger(brut.exemple) && brut.exemple! >= 0 && brut.exemple! < EXEMPLES_CODE.length ? brut.exemple! : 0,
    indices: brut.indices !== false,
  };
}

function carteDuCode(code: CodeDeLaPhrase, r: ReglagesCarteCode): string {
  const lignes = CONSTITUANTS.map((c) => `<div class="cp-ligne"><div class="cp-echantillon">${marquer(code, c.id, c.libelle)}</div>`
    + `${r.indices ? `<div class="cp-indice">${escapeHtml(c.indice)}</div>` : ""}</div>`).join("");
  return `<div class="cp-carte"><div class="cp-titre">Le code de la phrase</div>`
    + `<div class="cp-exemple">${phraseAnalysee(EXEMPLES_CODE[r.exemple] ?? EXEMPLES_CODE[0], code)}</div><div class="cp-lignes">${lignes}</div></div>`;
}

/** La carte du code, au format choisi : la feuille à imprimer. */
export function htmlCodeDeLaPhrase(code: CodeDeLaPhrase, r: ReglagesCarteCode): string {
  const carte = carteDuCode(code, r);
  const n = r.format === "cartes" ? 4 : r.format === "bandeau" ? 3 : 1;
  return `<div class="feuille cp cp-${r.format}"><div class="page"><div class="cp-planche">${Array.from({ length: n }, () => carte).join("")}</div></div></div>`;
}

export const STYLE_CODE_PHRASE = `
  .feuille.cp .cp-planche { display: grid; gap: 0; }
  .feuille.cp .cp-carte { border: 1px dashed #9aa0b4; padding: 6mm; display: flex; flex-direction: column; gap: 4mm; box-sizing: border-box; overflow: hidden; }
  .feuille.cp .cp-titre { font-weight: 800; color: #1c2233; }
  .feuille.cp .cp-exemple { line-height: 2.1; }
  .feuille.cp .cp-lignes { display: flex; flex-direction: column; gap: 3mm; }
  .feuille.cp .cp-echantillon { font-weight: 700; line-height: 1.9; }
  .feuille.cp .cp-indice { color: #4a5168; line-height: 1.35; }
  /* Quatre cartes : deux par rangée, la page partagée. */
  .feuille.cp-cartes .cp-planche { grid-template-columns: 1fr 1fr; grid-auto-rows: 128mm; }
  .feuille.cp-cartes .cp-carte { gap: 6mm; }
  .feuille.cp-cartes .cp-titre { font-size: 19px; }
  .feuille.cp-cartes .cp-exemple { font-size: 21px; }
  .feuille.cp-cartes .cp-lignes { gap: 5mm; }
  .feuille.cp-cartes .cp-echantillon { font-size: 19px; }
  .feuille.cp-cartes .cp-indice { font-size: 14px; }
  /* Le bandeau : la phrase à gauche, les groupes à droite, sur toute la largeur. */
  .feuille.cp-bandeau .cp-planche { grid-template-columns: 1fr; grid-auto-rows: 84mm; }
  .feuille.cp-bandeau .cp-carte { display: grid; grid-template-columns: 1fr 1.25fr; grid-template-rows: auto 1fr; column-gap: 6mm; row-gap: 3mm; }
  .feuille.cp-bandeau .cp-titre { grid-column: 1 / -1; font-size: 16px; }
  .feuille.cp-bandeau .cp-exemple { font-size: 18px; align-self: center; }
  .feuille.cp-bandeau .cp-lignes { align-self: center; }
  .feuille.cp-bandeau .cp-echantillon { font-size: 15px; }
  .feuille.cp-bandeau .cp-indice { font-size: 12px; }
  /* L'affiche : grand, lisible du fond de la classe. */
  .feuille.cp-affiche .cp-carte { border: none; padding: 4mm 2mm; gap: 10mm; }
  .feuille.cp-affiche .cp-titre { font-size: 34px; }
  .feuille.cp-affiche .cp-exemple { font-size: 30px; line-height: 2.2; }
  .feuille.cp-affiche .cp-lignes { gap: 8mm; }
  .feuille.cp-affiche .cp-echantillon { font-size: 28px; }
  .feuille.cp-affiche .cp-indice { font-size: 18px; margin-top: 1mm; }
`;
