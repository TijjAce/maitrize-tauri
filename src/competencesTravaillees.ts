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

import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import type { Objectif } from "./programmationIme";

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

/** La source sous laquelle la programmation d'une année se range. */
export const sourceProgrammation = (annee: string) => `Programmation ${annee}`;

/**
 * Un objectif de la programmation par élève, tel qu'on le suit ici.
 *
 * Non abordé tant qu'on n'a rien dit : c'est le projet de l'année, pas un
 * constat. L'origine et les périodes prévues restent lisibles sous le texte.
 */
export function depuisProgrammation(o: Objectif, annee: string, aujourdhui: string): CompetenceTravaillee {
  const periodes = o.periodes.length ? `période${o.periodes.length > 1 ? "s" : ""} ${o.periodes.join(", ")}` : "";
  return {
    id: nouvelId(), texte: o.competence.trim(), source: sourceProgrammation(annee),
    chemin: [o.origine.trim(), periodes].filter(Boolean).join(" · "),
    niveau: null, page: "", competenceRefId: o.source?.competenceRefId ?? null, documentId: null, objectifId: o.id,
    statut: "nonabordee", date: "", notes: "", citeeLe: aujourdhui,
  };
}

/**
 * Reprend dans la liste les objectifs de la programmation qui n'y sont pas
 * encore, et remet à jour ceux dont l'intitulé ou l'origine ont changé —
 * en gardant le statut, la date et les notes déjà posés.
 *
 * Un objectif retiré de la programmation reste ici : ce qu'on a travaillé a
 * été travaillé.
 */
export function synchroniserProgrammation(
  liste: CompetenceTravaillee[], objectifs: Objectif[], annee: string, aujourdhui: string,
): { liste: CompetenceTravaillee[]; ajoutees: number; misesAJour: number } {
  let ajoutees = 0, misesAJour = 0;
  const resultat = [...liste];
  for (const o of objectifs) {
    const voulu = depuisProgrammation(o, annee, aujourdhui);
    if (!voulu.texte) continue;
    const i = resultat.findIndex((x) => x.objectifId === o.id || memeCompetence(x, voulu));
    if (i < 0) { resultat.push(voulu); ajoutees++; continue; }
    const deja = resultat[i];
    if (deja.texte !== voulu.texte || deja.chemin !== voulu.chemin || deja.objectifId !== o.id) {
      resultat[i] = { ...deja, texte: voulu.texte, chemin: voulu.chemin, objectifId: o.id, competenceRefId: deja.competenceRefId ?? voulu.competenceRefId };
      misesAJour++;
    }
  }
  return { liste: resultat, ajoutees, misesAJour };
}

/** Sans accents, sans casse, espaces et apostrophes unifiés : pour comparer et chercher. */
export const normaliser = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

/** Même compétence : même entrée du référentiel, ou même texte de la même source. */
export function memeCompetence(a: CompetenceTravaillee, b: CompetenceTravaillee): boolean {
  if (a.objectifId && b.objectifId) return a.objectifId === b.objectifId;
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
      documentId: x.documentId ?? null, ...(x.objectifId ? { objectifId: String(x.objectifId) } : {}),
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
