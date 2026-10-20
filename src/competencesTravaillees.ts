// Compétences travaillées par un élève, citées depuis les programmes officiels.
//
// Deux provenances, une seule liste : une compétence choisie dans un
// référentiel intégré (tiré du BO), ou un passage sélectionné dans un PDF du
// coffre-fort. Dans les deux cas on garde la source — et la page quand il y en
// a une — pour pouvoir la retrouver dans le texte officiel.
//
// Rangées par élève dans ses documents (type « competences »), à côté de ses
// progressions.
//
// Troisième provenance, en IME : la programmation par élève. Ce qu'on a
// décidé d'y travailler avec un jeune se retrouve ici, pour dire où il en
// est — la programmation dit le projet, la progression dit le chemin.


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
  /** L'objectif de la programmation dont elle vient, pour la suivre sans la doubler. */
  objectifId?: string | null;
  statut: StatutCompetence;
  /** Date d'acquisition (AAAA-MM-JJ). */
  date: string;
  notes: string;
  citeeLe: string;
}

const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `c${Date.now()}${Math.random().toString(36).slice(2)}`);

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

/** La source sous laquelle la programmation d'une année se range. */
export const sourceProgrammation = (annee: string) => `Programmation ${annee}`;

/** Sans accents, sans casse, espaces et apostrophes unifiés : pour comparer et chercher. */
export const normaliser = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

export function lireCompetences(brut: string | null | undefined): CompetenceTravaillee[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x.texte === "string").map((x) => ({
      id: String(x.id ?? nouvelId()), texte: x.texte, source: String(x.source ?? ""), chemin: String(x.chemin ?? ""),
      niveau: x.niveau ?? null, page: String(x.page ?? ""), competenceRefId: x.competenceRefId ?? null,
      documentId: x.documentId ?? null, ...(x.objectifId ? { objectifId: String(x.objectifId) } : {}),
      statut: (["nonabordee", "encours", "acquise"].includes(x.statut) ? x.statut : "encours") as StatutCompetence,
      date: String(x.date ?? ""), notes: String(x.notes ?? ""), citeeLe: String(x.citeeLe ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Recherche sans accents ni casse : chaque mot cherché doit s'y trouver, dans n'importe quel ordre. */
export function correspond(texte: string, recherche: string): boolean {
  const t = normaliser(texte);
  return normaliser(recherche).split(" ").filter(Boolean).every((mot) => t.includes(mot));
}
