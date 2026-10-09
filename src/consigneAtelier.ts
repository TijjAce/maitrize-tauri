// La consigne d'une feuille, réécrite par l'enseignant.
//
// Chaque atelier imprime sa consigne — « Compte les cubes et écris le
// nombre. », la règle du loto, la ligne « Chaque jour de la semaine » de la
// grille de fluence. Les mots de l'application ne sont pas toujours ceux
// de la classe : l'enseignant garde les siens, une fois par atelier, dans un
// réglage partagé entre ses ordinateurs. La feuille les prend à
// l'impression comme dans l'aperçu ; vide, elle garde sa consigne d'origine.
//
// On travaille sur le HTML des feuilles telles que l'application les écrit :
// la consigne est le premier élément qui en porte la classe.

import { escapeHtml } from "./print";
import { CLASSES_CONSIGNE } from "./caa";
import { referencesDe, sansReferences } from "./references";

/** Où se garde la consigne d'un atelier — préfixe « fabriquer: », donc partagé. */
export const cleConsigne = (atelier: string) => `fabriquer:consigne:${atelier}`;

/** Émis quand une consigne change : les aperçus ouverts se mettent à jour. */
export const EVT_CONSIGNE = "maitrize:consigne-atelier";

// ── Les pictos ajoutés à la main ──────────────────────────────────────────
//
// Les verbes que la consigne dit ont leur picto d'eux-mêmes (voir `caa`).
// Ceux qu'on veut montrer sans que la consigne les dise se gardent par
// atelier, dans un réglage partagé comme la consigne réécrite.

/** Où se gardent les verbes ajoutés pour un atelier. */
export const clePictos = (atelier: string) => `fabriquer:pictos:${atelier}`;

/** Émis quand les pictos d'un atelier changent : l'aperçu se met à jour. */
export const EVT_PICTOS = "maitrize:pictos-atelier";

/** Les verbes ajoutés, tels qu'on peut s'y fier : des mots, sans doublon. */
export function lirePictosAjoutes(brut: string | null | undefined): string[] {
  if (!brut) return [];
  try {
    const lu = JSON.parse(brut);
    return Array.isArray(lu) ? [...new Set(lu.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()))] : [];
  } catch {
    return [];
  }
}

export const ecrirePictosAjoutes = (verbes: string[]) => JSON.stringify(verbes);

/** Les classes qui portent la consigne d'une feuille : celles des consignes, et les règles encadrées. */
export const CLASSES_CONSIGNE_FEUILLE = [...CLASSES_CONSIGNE, "regle"];

const OUVERTURE = /<(h[1-6]|p|div|span)\b([^>]*\bclass="([^"]*)"[^>]*)>/g;

/** Le premier élément de consigne : ses bornes et sa balise. */
function premiereConsigne(html: string): { debut: number; fin: number; balise: string; regle: boolean } | null {
  OUVERTURE.lastIndex = 0;
  for (let m = OUVERTURE.exec(html); m; m = OUVERTURE.exec(html)) {
    const classes = m[3].split(/\s+/);
    if (!classes.some((c) => CLASSES_CONSIGNE_FEUILLE.includes(c))) continue;
    const debut = m.index + m[0].length;
    const fin = html.indexOf(`</${m[1]}>`, debut);
    if (fin < 0) return null;
    return { debut, fin, balise: m[1], regle: classes.includes("regle") };
  }
  return null;
}

const decoder = (t: string) =>
  t.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/**
 * Le texte de la consigne d'origine, tel qu'on le donnera à réécrire :
 * le titre en gras sur sa ligne, les retours à la ligne gardés, les pictos
 * et le reste des balises retirés.
 */
export function consigneParDefaut(html: string): string | null {
  const place = premiereConsigne(html);
  if (!place) return null;
  // Les retours à la ligne du HTML ne sont que de la mise en forme : seuls
  // le titre en gras et les <br> font des lignes.
  // La référence n'est pas la consigne : elle reste derrière son « ? ».
  const interieur = sansReferences(html.slice(place.debut, place.fin))
    .replace(/<span class="consigne-pictos">[\s\S]*?<\/span><\/span>/g, "")
    .replace(/\s+/g, " ")
    .replace(/<\/b>/g, "\n").replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]*>/g, "");
  return decoder(interieur).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

/** Le HTML d'une consigne réécrite : pour une règle encadrée, la première ligne en gras. */
export function htmlDeConsigne(texte: string, regle: boolean): string {
  const lignes = texte.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return "";
  if (regle && lignes.length > 1) return `<b>${escapeHtml(lignes[0])}</b>${lignes.slice(1).map(escapeHtml).join("<br>")}`;
  return lignes.map(escapeHtml).join("<br>");
}

/**
 * La feuille avec la consigne de l'enseignant à la place de la première ;
 * telle quelle si le texte est vide. La référence de la consigne d'origine
 * reste à sa place, après la nouvelle.
 */
export function remplacerConsigne(html: string, texte: string | null | undefined): string {
  if (!texte || !texte.trim()) return html;
  const place = premiereConsigne(html);
  if (!place) return html;
  const references = referencesDe(html.slice(place.debut, place.fin));
  return html.slice(0, place.debut) + htmlDeConsigne(texte, place.regle) + (references.length ? ` ${references.join(" ")}` : "") + html.slice(place.fin);
}

// ── Les consignes d'origine, publiées par les aperçus ──────────────────────
//
// L'éditeur de consigne est dans le bandeau de l'atelier ; c'est l'aperçu,
// plus bas, qui connaît la feuille. Il dit ici sa consigne d'origine, pour
// que l'éditeur la propose à réécrire.

const defauts: Record<string, string> = {};
const abonnes = new Set<() => void>();

export const consignesParDefaut = {
  lire: (atelier: string): string => defauts[atelier] ?? "",
  publier(atelier: string, texte: string | null) {
    const propre = texte ?? "";
    if (!atelier || defauts[atelier] === propre) return;
    defauts[atelier] = propre;
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
};

// ── Les consignes justes, publiées par les ateliers de calcul ─────────────
//
// Un atelier qui connaît ses calculs dit ici les consignes qui leur vont —
// « Complète les égalités. » quand le nombre qui manque est parfois un terme,
// « Calcule les sommes. » quand c'est toujours une somme (voir
// consignesCalcul) —, et ses calculs, pour que l'éditeur relève un mot de la
// consigne qui ne leur irait pas.

export interface ConsignesJustes { propositions: string[]; ecrits: string[] }

const justes: Record<string, ConsignesJustes> = {};
const abonnesJustes = new Set<() => void>();
const VIDE: ConsignesJustes = { propositions: [], ecrits: [] };

export const consignesJustes = {
  lire: (atelier: string): ConsignesJustes => justes[atelier] ?? VIDE,
  publier(atelier: string, valeur: ConsignesJustes | null) {
    if (!atelier) return;
    const avant = justes[atelier];
    if (!valeur) { if (!avant) return; delete justes[atelier]; }
    else {
      if (avant && avant.propositions.join("|") === valeur.propositions.join("|") && avant.ecrits.join("|") === valeur.ecrits.join("|")) return;
      justes[atelier] = valeur;
    }
    abonnesJustes.forEach((f) => f());
  },
  abonner(f: () => void) { abonnesJustes.add(f); return () => { abonnesJustes.delete(f); }; },
};
