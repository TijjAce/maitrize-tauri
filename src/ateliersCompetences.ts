// Les compétences qu'un atelier travaille — celles que l'enseignant choisit.
//
// On a d'abord essayé de les deviner à partir de mots-clés : « addition »
// suffisait à faire remonter « poser et effectuer des additions en colonnes »
// pour un coloriage magique, où l'on ne pose aucune opération. Un moteur ne
// juge pas de cela ; l'enseignant, si.
//
// Chaque atelier garde donc la liste qu'on lui attache, dans un réglage
// préfixé « fabriquer: » — donc partagé entre les ordinateurs, comme le reste
// de ce qui se prépare.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";

/** Où se range la liste d'un atelier. */
export const cleDesCompetences = (atelier: string) => `fabriquer:competences:${atelier}`;
/** Émis quand les compétences d'un atelier changent : ce qui les résume ailleurs se relit. */
export const EVT_COMPETENCES_ATELIER = "maitrize:competences-atelier";

/** Deux lignes désignent la même compétence : même référentiel, même entrée. */
export const memeCompetence = (a: CompetenceSelectionnee, b: CompetenceSelectionnee) =>
  a.referentielNom === b.referentielNom
  && a.sousDomaineTitre === b.sousDomaineTitre
  && (a.competenceRefId ?? a.competenceTitre) === (b.competenceRefId ?? b.competenceTitre);

/**
 * La liste enregistrée, telle qu'on peut s'y fier.
 *
 * Un réglage se synchronise, se restaure, se modifie à la main : on ne
 * suppose rien de sa forme, et une ligne sans intitulé ne sert à personne.
 */
export function lireCompetencesAtelier(brut: string | null | undefined): CompetenceSelectionnee[] {
  if (!brut) return [];
  let lu: unknown;
  try { lu = JSON.parse(brut); } catch { return []; }
  if (!Array.isArray(lu)) return [];
  const chaine = (v: unknown) => (typeof v === "string" ? v : "");
  return lu.flatMap((x): CompetenceSelectionnee[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const titre = chaine(o.competenceTitre).trim();
    if (!titre) return [];
    return [{
      id: chaine(o.id) || titre,
      referentielNom: chaine(o.referentielNom),
      domaineId: chaine(o.domaineId),
      domaineTitre: chaine(o.domaineTitre),
      sousDomaineTitre: chaine(o.sousDomaineTitre),
      competenceGeneraleTitre: chaine(o.competenceGeneraleTitre) || null,
      competenceTitre: titre,
      niveau: chaine(o.niveau) || null,
      competenceRefId: chaine(o.competenceRefId) || null,
    }];
  });
}

export const ecrireCompetencesAtelier = (liste: CompetenceSelectionnee[]) => JSON.stringify(liste);

/** Ajoute la compétence, ou la retire si elle y est déjà. */
export function basculerCompetence(
  liste: CompetenceSelectionnee[], c: CompetenceSelectionnee,
): CompetenceSelectionnee[] {
  return liste.some((x) => memeCompetence(x, c))
    ? liste.filter((x) => !memeCompetence(x, c))
    : [...liste, c];
}
