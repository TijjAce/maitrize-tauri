// Des problèmes de la vie de la classe, et leurs outils d'aide.
//
// La séance de la séquence des problèmes additifs du manuel du CRPE de
// l'enseignant (« Réussir mon CRPE », Nathan, sujet n° 13) part de problèmes
// que la classe se pose — une rencontre sportive se prépare — : chacun les
// cherche seul, puis en groupe, sur une fiche où chaque problème a son cadre.
// Qui en a besoin reçoit un outil d'aide : pour chercher le tout, deux ronds
// dans un même cadre et une flèche vers ce qu'on cherche ; pour les plus
// fragiles, les mêmes ronds remplis de croix ; pour chercher ce qu'il manque,
// le tout et la partie connue, ou une bande en deux parties.
//
// Les énoncés s'écrivent ici, avec leurs nombres : la fiche, puis les outils
// d'aide à découper, puis le corrigé. La version des groupes, c'est la même
// fiche imprimée en A3.

import { feuille } from "./cartesImprimables";
import { STYLE_CLASSE, schemaSvg } from "./problemesBarres";
import { escapeHtml } from "./print";

/** Un problème de composition : on cherche le tout, ou la partie qui manque. */
export interface ProblemeAide {
  enonce: string;
  cherche: "tout" | "partie";
  /** Les deux nombres connus : les deux parties ; ou le tout, puis la partie connue. */
  nombres: [number, number];
  /** Ce que comptent les nombres : élèves, places, ballons. */
  unite: string;
  /** Le nom des deux parties : celle qu'on connaît d'abord, puis l'autre — « notre classe », « la classe invitée » ; « les places occupées », « les places libres ». */
  noms: [string, string];
}

export type OutilDAide = "ronds" | "croix" | "bande";
export const OUTILS_D_AIDE: { id: OutilDAide; libelle: string }[] = [
  { id: "ronds", libelle: "Les ronds" }, { id: "croix", libelle: "Les ronds remplis de croix" }, { id: "bande", libelle: "La bande" },
];

export interface ReglagesProblemesAides { problemes: ProblemeAide[]; aides: OutilDAide[]; titre?: string }

/** La rencontre sportive de la séance du manuel : ses trois problèmes, leurs nombres, sans prénom. */
export const PROBLEMES_DE_LA_RENCONTRE: ProblemeAide[] = [
  { enonce: "Notre classe a 24 élèves, la classe invitée en a 18. Combien d'enfants seront à la rencontre ?",
    cherche: "tout", nombres: [24, 18], unite: "enfants", noms: ["notre classe", "la classe invitée"] },
  { enonce: "Le car de la classe invitée a 30 places. Une fois ses 18 élèves assis, combien de places resteront libres ?",
    cherche: "partie", nombres: [30, 18], unite: "places", noms: ["les places occupées", "les places libres"] },
  { enonce: "L'école a 15 ballons ; il en faut 25 pour les jeux. Combien de ballons faut-il demander aux invités d'apporter ?",
    cherche: "partie", nombres: [25, 15], unite: "ballons", noms: ["les ballons de l'école", "les ballons à apporter"] },
];

export const REGLAGES_PROBLEMES_AIDES: ReglagesProblemesAides = { problemes: PROBLEMES_DE_LA_RENCONTRE, aides: ["ronds", "croix", "bande"] };

/** Le plus de problèmes sur une fiche. */
export const PROBLEMES_AIDES_MAX = 4;

const nombreSur = (v: unknown, defaut: number) => { const n = Math.round(Number(v)); return n >= 0 && n <= 9999 ? n : defaut; };

/** Un problème tel qu'on le relit : un tout jamais plus petit que sa partie. */
function problemeSur(b: Partial<ProblemeAide> | null | undefined, defaut: ProblemeAide): ProblemeAide {
  const p = b ?? {};
  const cherche = p.cherche === "partie" ? "partie" : "tout";
  let nombres: [number, number] = Array.isArray(p.nombres) ? [nombreSur(p.nombres[0], defaut.nombres[0]), nombreSur(p.nombres[1], defaut.nombres[1])] : defaut.nombres;
  if (cherche === "partie" && nombres[1] > nombres[0]) nombres = [nombres[1], nombres[0]];
  const noms: [string, string] = Array.isArray(p.noms) ? [String(p.noms[0] ?? "").slice(0, 60), String(p.noms[1] ?? "").slice(0, 60)] : defaut.noms;
  return { enonce: typeof p.enonce === "string" ? p.enonce.slice(0, 500) : defaut.enonce, cherche, nombres, unite: typeof p.unite === "string" ? p.unite.slice(0, 30) : defaut.unite, noms };
}

/** Les réglages tels que l'atelier les relit : de un à quatre problèmes, des outils connus. */
export function reglagesProblemesAidesSurs(brut: Partial<ReglagesProblemesAides> | null | undefined): ReglagesProblemesAides {
  const b = brut ?? {};
  const problemes = Array.isArray(b.problemes) && b.problemes.length
    ? b.problemes.slice(0, PROBLEMES_AIDES_MAX).map((p, i) => problemeSur(p, PROBLEMES_DE_LA_RENCONTRE[i % PROBLEMES_DE_LA_RENCONTRE.length]))
    : REGLAGES_PROBLEMES_AIDES.problemes;
  const aides = Array.isArray(b.aides) ? b.aides.filter((a) => OUTILS_D_AIDE.some((o) => o.id === a)) : REGLAGES_PROBLEMES_AIDES.aides;
  return { ...b, problemes, aides };
}

/** La réponse, et le calcul qui y mène. */
export function reponseDe(p: ProblemeAide): { resultat: number; calcul: string } {
  const [a, b] = p.nombres;
  return p.cherche === "tout"
    ? { resultat: a + b, calcul: `${a} + ${b} = ${a + b}` }
    : { resultat: a - b, calcul: `${a} − ${b} = ${a - b}, ou ${b} + ${a - b} = ${a}` };
}

// ── Les outils d'aide ─────────────────────────────────────────────────────

const NOIR = "#1c2233", ROUGE = "#d33a32", BLEU = "#2438d6";
const esc = (t: string) => escapeHtml(t);

/** Des croix rangées dans un rond de rayon `r`, autant que `n` ; au-delà de quarante, le nombre seul. */
function croix(cx: number, cy: number, r: number, n: number): string {
  if (n > 40 || n <= 0) return "";
  const colonnes = Math.ceil(Math.sqrt(n)), lignes = Math.ceil(n / colonnes);
  const pas = Math.min((1.3 * r) / colonnes, (1.3 * r) / lignes), t = pas * 0.28;
  let s = "";
  for (let k = 0; k < n; k++) {
    const i = k % colonnes, j = Math.floor(k / colonnes);
    const x = cx + (i - (colonnes - 1) / 2) * pas, y = cy + (j - (lignes - 1) / 2) * pas;
    s += `<path d="M${(x - t).toFixed(2)} ${(y - t).toFixed(2)} L${(x + t).toFixed(2)} ${(y + t).toFixed(2)} M${(x - t).toFixed(2)} ${(y + t).toFixed(2)} L${(x + t).toFixed(2)} ${(y - t).toFixed(2)}" stroke="${NOIR}" stroke-width="0.45"/>`;
  }
  return s;
}

/** Un rond et ce qu'il contient : son nom et son nombre, ou des croix, ou rien. */
function rond(cx: number, cy: number, r: number, nom: string, n: number | null, avecCroix: boolean, couleur: string): string {
  const texte = (y: number, t: string, taille: number, gras = false) =>
    `<text x="${cx}" y="${y}" font-size="${taille}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"${gras ? ' font-weight="700"' : ""} fill="${NOIR}">${esc(t)}</text>`;
  const dedans = n === null ? texte(cy + 2, "?", 9, true) : avecCroix ? croix(cx, cy, r, n) : texte(cy + 3, String(n), 9, true);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${couleur}" stroke-width="0.7"/>${dedans}${texte(cy + r + 5.5, nom, 4.4)}`;
}

/** Deux ronds dans un même cadre : pour chercher le tout, une flèche vers la case « ? » ; pour chercher ce qui manque, le tout écrit au cadre. */
function rondsSvg(p: ProblemeAide, avecCroix: boolean): string {
  const [a, b] = p.nombres, r = 17;
  const tout = p.cherche === "tout";
  const gauche = rond(28, 30, r, p.noms[0], tout ? a : b, avecCroix, ROUGE);
  const droite = rond(72, 30, r, p.noms[1], tout ? b : null, avecCroix, "#a23b6b");
  const cadre = `<rect x="4" y="4" width="92" height="58" rx="4" fill="none" stroke="${BLEU}" stroke-width="0.8"/>`;
  if (tout) {
    const fleche = `<line x1="96" y1="33" x2="110" y2="33" stroke="${NOIR}" stroke-width="0.7"/><path d="M110 30 L115 33 L110 36 Z" fill="${NOIR}"/>`;
    const caseTout = `<rect x="116" y="23" width="30" height="20" rx="3" fill="#fff" stroke="${BLEU}" stroke-width="0.8"/><text x="131" y="35" font-size="5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${NOIR}">? ${esc(p.unite)}</text>`;
    return `<svg viewBox="0 0 150 68" width="100mm" height="45.3mm">${cadre}${gauche}${droite}${fleche}${caseTout}</svg>`;
  }
  const enTout = `<text x="50" y="72" font-size="4.6" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${BLEU}">En tout : ${a} ${esc(p.unite)}</text>`;
  return `<svg viewBox="0 0 100 76" width="70mm" height="53.2mm">${cadre}${gauche}${droite}${enTout}</svg>`;
}

/** La bande du tout, coupée en ses deux parties : le modèle en barres de l'atelier « Problèmes partie-tout ». */
function bandeSvg(p: ProblemeAide): string {
  const [a, b] = p.nombres;
  const schema = p.cherche === "tout"
    ? { forme: "parties" as const, tout: { valeur: a + b, connue: false }, parties: [{ valeur: a, connue: true }, { valeur: b, connue: true }] }
    : { forme: "parties" as const, tout: { valeur: a, connue: true }, parties: [{ valeur: b, connue: true }, { valeur: a - b, connue: false }] };
  return schemaSvg(schema, "nombres", STYLE_CLASSE);
}

// ── La feuille ───────────────────────────────────────────────────────────

export function htmlProblemesAides(r: ReglagesProblemesAides): string {
  const titre = r.titre?.trim() || "Des problèmes et leurs outils d'aide";
  const fiche = r.problemes.map((p, i) => `<section class="pa-probleme"><div class="pa-numero">${i + 1}</div><div class="pa-contenu">`
    + `<p class="pa-enonce">${esc(p.enonce)}</p><div class="pa-cadre"></div><div class="pa-reponse">Je réponds : <span class="pa-trait"></span></div></div></section>`).join("");
  const outils = r.problemes.flatMap((p, i) => r.aides
    // Les croix ne se comptent plus au-delà de quarante : on garde alors les ronds et leurs nombres.
    .filter((a) => a !== "croix" || Math.max(...p.nombres) <= 40)
    .map((a) => `<div class="pa-outil"><div class="pa-outil-titre">Problème ${i + 1} — ${esc(OUTILS_D_AIDE.find((o) => o.id === a)!.libelle.toLowerCase())}</div>`
      + `${a === "bande" ? `<div class="pa-bande">${bandeSvg(p)}</div>` : rondsSvg(p, a === "croix")}</div>`)).join("");
  const corrige = r.problemes.map((p, i) => {
    const { resultat, calcul } = reponseDe(p);
    return `<section class="pa-probleme"><div class="pa-numero">${i + 1}</div><div class="pa-contenu"><p class="pa-enonce pa-rappel">${esc(p.enonce)}</p>`
      + `<p class="pa-solution"><b>On cherche ${p.cherche === "tout" ? "le tout" : "ce qu'il manque"} :</b> ${esc(calcul)} · <b>Réponse :</b> ${resultat} ${esc(p.unite)}</p></div></section>`;
  }).join("");
  return feuille(`<div class="page"><div class="titre">${esc(titre)}</div><div class="sous">Prénom : ........................................ Date : ........................</div>`
    + `<div class="regle"><b>Cherche</b>Je lis chaque problème. Je cherche seul, puis avec mon groupe. J'explique dans le cadre comment j'ai trouvé. J'écris la réponse.</div>${fiche}</div>`
    + (outils ? `<div class="page"><div class="titre">${esc(titre)} — les outils d'aide, à découper</div><div class="pa-outils">${outils}</div></div>` : "")
    + `<div class="page corrige"><div class="titre">${esc(titre)} — corrigé</div>${corrige}</div>`, "pa");
}

export const STYLE_PROBLEMES_AIDES = `
  .feuille.pa .pa-probleme { display: flex; gap: 3mm; margin: 0 0 6mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.pa .pa-numero { flex: none; width: 7mm; height: 7mm; border-radius: 50%; background: #1c2233; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .feuille.pa .pa-contenu { flex: 1; }
  .feuille.pa .pa-enonce { font-size: 15.5px; line-height: 1.55; margin: 0 0 2.5mm; }
  .feuille.pa .pa-rappel { font-size: 13px; color: #4b5266; }
  .feuille.pa .pa-cadre { height: 46mm; border: 1.2px dashed #9aa0b4; border-radius: 2mm; margin: 0 0 2.5mm; }
  .feuille.pa .pa-reponse { display: flex; gap: 2mm; align-items: flex-end; font-size: 14px; }
  .feuille.pa .pa-trait { flex: 1; border-bottom: 1px dotted #9aa0b4; height: 5mm; }
  .feuille.pa .pa-solution { font-size: 13.5px; line-height: 1.5; margin: 0; }
  .feuille.pa .pa-outils { display: block; }
  .feuille.pa .pa-outil { display: inline-block; vertical-align: top; margin: 0 4mm 5mm 0; padding: 2.5mm 3mm; border: 1px dashed #9aa0b4; border-radius: 3mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.pa .pa-outil-titre { font-size: 12.5px; font-weight: 700; margin-bottom: 1.5mm; }
  .feuille.pa .pa-outil svg { display: block; }
  .feuille.pa .pa-bande { width: 90mm; }
  .feuille.pa .pa-bande svg { width: 100%; height: auto; }
`;
