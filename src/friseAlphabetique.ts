// ── La frise alphabétique ─────────────────────────────────────────────────
//
// « Dans les générateurs d'affichages, regarde les programmes et les guides
// Éduscol, et fais-en d'autres » (l'enseignant, 4 novembre 2026).
//
// Programme de français du cycle 2 (2024) : l'élève « utilise les outils
// présents dans la classe (frise alphabétique, répertoire de mots,
// affichages, etc.) » (p. 10). Programme de l'école maternelle (2025) :
// « connaitre la correspondance entre les lettres scriptes majuscules et
// minuscules et les lettres cursives minuscules » (p. 13), puis « les
// différentes graphies d'une même lettre dans les trois graphies (majuscule
// lettre capitale ; minuscules scriptes ; cursives) », et « distinguer des
// lettres visuellement proches (b/d, c/e/o, p/q) grâce à leur écriture
// cursive » (p. 14).
//
// Chaque lettre dans les écritures qu'on choisit — capitale, script,
// cursive —, avec un mot qui commence par elle et son pictogramme. Trois
// façons de l'imprimer : la frise du mur, quelques lettres par page en
// paysage, à mettre bout à bout ; une lettre par page, en grand ; la bande
// de la table de l'élève, deux par page. Les voyelles peuvent se colorer.
// La cursive s'écrit avec la police d'écriture scolaire installée sur
// l'ordinateur, comme dans l'atelier « Écriture cursive ».

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { POLICE_CURSIVE } from "./ecritureCursive";
import { escapeHtml } from "./print";

export type EcritureDeLettre = "capitale" | "script" | "cursive";
export const ECRITURES: { id: EcritureDeLettre; nom: string }[] = [
  { id: "capitale", nom: "Capitale" }, { id: "script", nom: "Script" }, { id: "cursive", nom: "Cursive" },
];

export interface ReglagesFrise {
  /** Les écritures de chaque lettre, dans l'ordre capitale, script, cursive ; au moins une. */
  ecritures: EcritureDeLettre[];
  /** Les mots, une ligne par lettre : « a avion ». */
  mots: string;
  /** Le pictogramme de chaque mot, quand la banque est là. */
  images: boolean;
  /** Les voyelles en rouge, les consonnes en bleu. */
  voyelles: boolean;
  /** La frise du mur, une lettre par page, ou la bande de la table de l'élève. */
  format: "frise" | "lettre" | "bande";
  /** La frise : combien de lettres par page, en paysage. */
  parPage: 4 | 6 | 7;
}

export const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
export const VOYELLES = new Set(["a", "e", "i", "o", "u", "y"]);

/**
 * Un mot par lettre, de ceux qu'un élève de maternelle nomme et qu'ARASAAC
 * dessine. « wagon » cherche son dessin sous « wagonnet », le seul que la
 * banque ait pour w.
 */
export const MOTS_DE_LA_FRISE: Record<string, string> = {
  a: "avion", b: "ballon", c: "canard", d: "dé", e: "escargot", f: "fleur", g: "gâteau", h: "hibou", i: "igloo", j: "jupe", k: "kangourou",
  l: "lapin", m: "maison", n: "nuage", o: "orange", p: "pomme", q: "quille", r: "robot", s: "soleil", t: "tomate", u: "usine", v: "vélo",
  w: "wagon", x: "xylophone", y: "yaourt", z: "zèbre",
};
/** Les mots dont le dessin se cherche sous un autre nom. */
export const RECHERCHE_DU_DESSIN: Record<string, string> = { wagon: "wagonnet" };
export const motsParDefaut = () => ALPHABET.map((l) => `${l} ${MOTS_DE_LA_FRISE[l]}`).join("\n");

export const REGLAGES_FRISE: ReglagesFrise = {
  ecritures: ["capitale", "script", "cursive"], mots: motsParDefaut(), images: true, voyelles: false, format: "frise", parPage: 6,
};

/** Des réglages lus de la mémoire, sans leur faire confiance. */
export function reglagesFriseSurs(brut: Partial<ReglagesFrise> | null | undefined): ReglagesFrise {
  const b = brut ?? {};
  const voulues = Array.isArray(b.ecritures) ? b.ecritures : [];
  const ecritures = ECRITURES.map((e) => e.id).filter((e) => voulues.includes(e));
  return {
    ecritures: ecritures.length ? ecritures : REGLAGES_FRISE.ecritures,
    mots: typeof b.mots === "string" ? b.mots : REGLAGES_FRISE.mots,
    images: b.images !== false,
    voyelles: b.voyelles === true,
    format: b.format === "lettre" || b.format === "bande" ? b.format : "frise",
    parPage: b.parPage === 4 || b.parPage === 7 ? b.parPage : 6,
  };
}

const plier = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Les mots de chaque lettre, lus ligne à ligne : « a avion », « A : avion »,
 * ou le mot seul, rangé à sa première lettre. Une lettre écrite seule n'a pas
 * de mot ; une lettre absente du texte garde celui de la frise.
 */
export function motsDesLettres(texte: string): Record<string, string> {
  const sortie: Record<string, string> = { ...MOTS_DE_LA_FRISE };
  for (const brute of (texte ?? "").split("\n")) {
    const ligne = brute.trim();
    if (!ligne) continue;
    const avecLettre = /^([a-zA-Z])(?:\s*[:\-–—=]\s*|\s+)(.*)$/.exec(ligne);
    if (avecLettre) { sortie[avecLettre[1].toLowerCase()] = avecLettre[2].trim(); continue; }
    if (/^[a-zA-Z]$/.test(ligne)) { sortie[ligne.toLowerCase()] = ""; continue; }
    const lettre = plier(ligne).charAt(0);
    if (ALPHABET.includes(lettre)) sortie[lettre] = ligne;
  }
  return sortie;
}

/** Le mot sous lequel la banque cherche le dessin d'un mot de la frise. */
export const motDuDessin = (mot: string) => RECHERCHE_DU_DESSIN[plier(mot)] ?? mot;

const COULEUR_VOYELLE = "#d33a32", COULEUR_CONSONNE = "#2a6fd6", NOIR = "#1c2233";
const couleurDe = (lettre: string, r: ReglagesFrise) => (r.voyelles ? (VOYELLES.has(lettre) ? COULEUR_VOYELLE : COULEUR_CONSONNE) : NOIR);

/** Une lettre dans une écriture. */
function graphie(lettre: string, e: EcritureDeLettre): string {
  const texte = e === "capitale" ? lettre.toUpperCase() : lettre;
  return `<span class="ab-l ab-${e}">${escapeHtml(texte)}</span>`;
}

/** La case d'une lettre : ses écritures, puis le dessin et le mot, sa première lettre en gras. */
function caseDeLaLettre(lettre: string, mot: string, r: ReglagesFrise, images: Record<string, string>): string {
  const dessin = r.images && mot ? images[plier(mot)] : undefined;
  const motHtml = mot ? `<b>${escapeHtml(mot.charAt(0))}</b>${escapeHtml(mot.slice(1))}` : "";
  return `<div class="ab-case" style="--ab-couleur:${couleurDe(lettre, r)}">`
    + `<div class="ab-lettres">${r.ecritures.map((e) => graphie(lettre, e)).join("")}</div>`
    + `<div class="ab-mot">${dessin ? `<img class="ab-dessin" src="${dessin}" alt="" />` : ""}${motHtml ? `<span>${motHtml}</span>` : ""}</div>`
    + `</div>`;
}

/**
 * Les pages : la frise, `parPage` lettres par page en paysage — la dernière
 * garde la même largeur de case, pour mettre les pages bout à bout — ; une
 * lettre par page ; ou la bande de l'élève, deux rangées de treize, deux
 * bandes par page.
 */
export function htmlFrise(brut: Partial<ReglagesFrise>, images: Record<string, string> = {}): string {
  const r = reglagesFriseSurs(brut);
  const mots = motsDesLettres(r.mots);
  const cases = ALPHABET.map((l) => caseDeLaLettre(l, mots[l] ?? "", r, images));
  const avecDessins = r.images && ALPHABET.some((l) => mots[l] && images[plier(mots[l])]);
  const mention = avecDessins ? ATTRIBUTION_ARASAAC : "";
  const nb = `ab-${r.ecritures.length}`;
  if (r.format === "lettre") return feuille(cases.map((c) => `<div class="page ab-page-lettre ${nb}">${c}${mention}</div>`).join(""), "ab");
  if (r.format === "bande") {
    const bande = `<div class="ab-bande ${nb}"><div class="ab-rang">${cases.slice(0, 13).join("")}</div><div class="ab-rang">${cases.slice(13).join("")}</div></div>`;
    return feuille(`<div class="page ab-page-bandes">${bande}${bande}${mention}</div>`, "ab");
  }
  const pages: string[] = [];
  for (let i = 0; i < cases.length; i += r.parPage) {
    pages.push(`<div class="page ab-page-frise ${nb}" style="grid-template-columns: repeat(${r.parPage}, 1fr)">${cases.slice(i, i + r.parPage).join("")}</div>`
      + (i + r.parPage >= cases.length ? mention : ""));
  }
  return feuille(pages.join(""), "ab");
}

export const titreFrise = (brut: Partial<ReglagesFrise>) => {
  const r = reglagesFriseSurs(brut);
  return r.format === "bande" ? "La bande alphabétique" : r.format === "lettre" ? "Les lettres de l'alphabet" : "La frise alphabétique";
};

/** La police du script : une écriture d'école aux a et g d'un seul rond quand elle est installée, une sans empattement sinon. */
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

/** Le style : en paysage pour la frise et les bandes. */
export function styleFrise(brut: Partial<ReglagesFrise>): string {
  const r = reglagesFriseSurs(brut);
  return STYLE_FRISE + (r.format === "lettre" ? "" : "@page { size: A4 landscape; margin: 10mm; }");
}

export const STYLE_FRISE = `
  .feuille.ab .ab-case { display: flex; flex-direction: column; align-items: center; justify-content: space-between; box-sizing: border-box;
    border: 0.8mm solid ${NOIR}; border-radius: 3mm; background: #fff; overflow: hidden; min-width: 0; }
  .feuille.ab .ab-lettres { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; width: 100%; }
  .feuille.ab .ab-l { display: block; line-height: 1; color: var(--ab-couleur, ${NOIR}); font-weight: 700; }
  .feuille.ab .ab-capitale, .feuille.ab .ab-script { font-family: ${POLICE_SCRIPT}; }
  .feuille.ab .ab-cursive { font-family: ${POLICE_CURSIVE}; font-weight: 400; }
  .feuille.ab .ab-mot { display: flex; flex-direction: column; align-items: center; gap: 1mm; width: 100%; padding: 1.5mm 1mm 2mm;
    border-top: 0.4mm solid #e1e5ee; box-sizing: border-box; font-family: ${POLICE_SCRIPT}; color: ${NOIR}; }
  .feuille.ab .ab-mot span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .feuille.ab .ab-dessin { object-fit: contain; }
  /* La frise : une rangée de cases en paysage, de la hauteur de la page. */
  .feuille.ab .ab-page-frise { display: grid; gap: 0; width: 263mm; height: 170mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ab .ab-page-frise .ab-case { border-radius: 0; }
  .feuille.ab .ab-page-frise .ab-case + .ab-case { border-left-width: 0; }
  .feuille.ab .ab-page-frise .ab-capitale { font-size: 34mm; }
  .feuille.ab .ab-page-frise .ab-script { font-size: 30mm; }
  .feuille.ab .ab-page-frise .ab-cursive { font-size: 34mm; }
  .feuille.ab .ab-page-frise.ab-1 .ab-l { font-size: 56mm; }
  .feuille.ab .ab-page-frise.ab-2 .ab-l { font-size: 44mm; }
  .feuille.ab .ab-page-frise .ab-dessin { width: 26mm; height: 26mm; }
  .feuille.ab .ab-page-frise .ab-mot { font-size: 6mm; }
  /* Une lettre par page, en grand. */
  .feuille.ab .ab-page-lettre { display: flex; flex-direction: column; width: 182mm; height: 250mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ab .ab-page-lettre .ab-case { flex: 1; }
  .feuille.ab .ab-page-lettre .ab-lettres { flex-direction: row; flex-wrap: wrap; gap: 6mm; padding: 4mm; }
  .feuille.ab .ab-page-lettre .ab-l { font-size: 60mm; }
  .feuille.ab .ab-page-lettre.ab-1 .ab-l { font-size: 110mm; }
  .feuille.ab .ab-page-lettre .ab-dessin { width: 60mm; height: 60mm; }
  .feuille.ab .ab-page-lettre .ab-mot { font-size: 14mm; padding: 4mm; }
  /* La bande de l'élève : deux rangées de treize, deux bandes par page, à découper. */
  .feuille.ab .ab-page-bandes { display: flex; flex-direction: column; justify-content: space-between; width: 263mm; height: 170mm; margin: 0 auto;
    box-sizing: border-box; }
  .feuille.ab .ab-bande { display: flex; flex-direction: column; outline: 0.5mm dashed #9aa0b4; outline-offset: 1.5mm; }
  .feuille.ab .ab-rang { display: grid; grid-template-columns: repeat(13, 1fr); height: 39mm; }
  .feuille.ab .ab-bande .ab-case { border-radius: 0; border-width: 0.4mm; }
  .feuille.ab .ab-bande .ab-l { font-size: 6.5mm; }
  .feuille.ab .ab-bande.ab-1 .ab-l { font-size: 13mm; }
  .feuille.ab .ab-bande.ab-2 .ab-l { font-size: 9mm; }
  .feuille.ab .ab-bande .ab-dessin { width: 10mm; height: 10mm; }
  .feuille.ab .ab-bande .ab-mot { font-size: 2.6mm; padding: 0.5mm; gap: 0.3mm; }
`;
