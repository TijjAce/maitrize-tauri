// Compétences travaillées par un élève, citées depuis les programmes officiels.
//
// Deux provenances, une seule liste : une compétence choisie dans un
// référentiel intégré (tiré du BO), ou un passage sélectionné dans un PDF du
// coffre-fort. Dans les deux cas on garde la source — et la page quand il y en
// a une — pour pouvoir la retrouver dans le texte officiel.
//
// Rangées par élève dans ses documents (type « competences »), à côté de ses
// progressions.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";

export const TYPE_DOC_COMPETENCES = "competences";

export type StatutCompetence = "nonabordee" | "encours" | "acquise";

export interface CompetenceTravaillee {
  id: string;
  /** Intitulé de la compétence, ou passage cité. */
  texte: string;
  /** Référentiel ou document du coffre-fort d'où elle vient. */
  source: string;
  /** Domaine › sous-domaine › compétence générale, pour un référentiel. */
  chemin: string;
  niveau: string | null;
  /** Page du PDF, pour une citation du coffre-fort. */
  page: string;
  competenceRefId: string | null;
  documentId: string | null;
  statut: StatutCompetence;
  /** Date d'acquisition (AAAA-MM-JJ). */
  date: string;
  notes: string;
  citeeLe: string;
}

const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `c${Date.now()}${Math.random().toString(36).slice(2)}`);

export function depuisReferentiel(c: CompetenceSelectionnee, aujourdhui: string): CompetenceTravaillee {
  return {
    id: nouvelId(), texte: c.competenceTitre.trim(), source: c.referentielNom,
    chemin: [c.domaineTitre, c.sousDomaineTitre, c.competenceGeneraleTitre].filter(Boolean).join(" › "),
    niveau: c.niveau ?? null, page: "", competenceRefId: c.competenceRefId ?? null, documentId: null,
    statut: "encours", date: "", notes: "", citeeLe: aujourdhui,
  };
}

export function depuisDocument(texte: string, doc: { id: string; nom: string }, page: number | string, aujourdhui: string): CompetenceTravaillee {
  return {
    id: nouvelId(), texte: nettoyerExtrait(texte), source: doc.nom, chemin: "", niveau: null,
    page: String(page), competenceRefId: null, documentId: doc.id,
    statut: "encours", date: "", notes: "", citeeLe: aujourdhui,
  };
}

/**
 * Texte sélectionné dans un PDF, rendu citable.
 *
 * Une sélection rapporte les retours à la ligne du document et les puces de
 * liste ; on garde les mots, pas la mise en page.
 */
export function nettoyerExtrait(s: string): string {
  return s
    .replace(/\u00AD/g, "") // césure invisible
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•▪◦●■–—\-*]\s+/u, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sans accents, sans casse, espaces et apostrophes unifiés : pour comparer et chercher. */
export const normaliser = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

/** Même compétence : même entrée du référentiel, ou même texte de la même source. */
export function memeCompetence(a: CompetenceTravaillee, b: CompetenceTravaillee): boolean {
  if (a.source !== b.source) return false;
  if (a.competenceRefId && b.competenceRefId) return a.competenceRefId === b.competenceRefId && a.chemin === b.chemin;
  return normaliser(a.texte) === normaliser(b.texte);
}

/** Ajoute sans doublon ; une compétence déjà citée garde son statut et ses notes. */
export function ajouterCompetences(liste: CompetenceTravaillee[], nouvelles: CompetenceTravaillee[]):
  { liste: CompetenceTravaillee[]; ajoutees: number } {
  const resultat = [...liste];
  let ajoutees = 0;
  for (const n of nouvelles) {
    if (!n.texte.trim() || resultat.some((x) => memeCompetence(x, n))) continue;
    resultat.push(n);
    ajoutees++;
  }
  return { liste: resultat, ajoutees };
}

export function lireCompetences(brut: string | null | undefined): CompetenceTravaillee[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x.texte === "string").map((x) => ({
      id: String(x.id ?? nouvelId()), texte: x.texte, source: String(x.source ?? ""), chemin: String(x.chemin ?? ""),
      niveau: x.niveau ?? null, page: String(x.page ?? ""), competenceRefId: x.competenceRefId ?? null,
      documentId: x.documentId ?? null,
      statut: (["nonabordee", "encours", "acquise"].includes(x.statut) ? x.statut : "encours") as StatutCompetence,
      date: String(x.date ?? ""), notes: String(x.notes ?? ""), citeeLe: String(x.citeeLe ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Regroupées par source, dans l'ordre où les sources apparaissent. */
export function parSource(liste: CompetenceTravaillee[]): [string, CompetenceTravaillee[]][] {
  const groupes = new Map<string, CompetenceTravaillee[]>();
  for (const c of liste) (groupes.get(c.source) ?? groupes.set(c.source, []).get(c.source)!).push(c);
  return [...groupes];
}

/** Recherche sans accents ni casse : chaque mot cherché doit s'y trouver, dans n'importe quel ordre. */
export function correspond(texte: string, recherche: string): boolean {
  const t = normaliser(texte);
  return normaliser(recherche).split(" ").filter(Boolean).every((mot) => t.includes(mot));
}
