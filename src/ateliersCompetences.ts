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
//
// Certains ateliers travaillent autre chose selon ce qu'on y choisit : le
// calcul mental n'exerce pas la même compétence sur les compléments à 10 et
// sur les tables de multiplication. Ceux-là gardent une liste par objectif ;
// l'atelier dit lequel est à l'écran, et la feuille prend les compétences
// des objectifs retenus.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";

export const PREFIXE_COMPETENCES = "fabriquer:competences:";
/** Où se range la liste d'un atelier — ou celle d'un de ses objectifs. */
export const cleDesCompetences = (atelier: string, objectif?: string) =>
  `${PREFIXE_COMPETENCES}${atelier}${objectif ? `:${objectif}` : ""}`;
/** Émis quand les compétences d'un atelier changent : ce qui les résume ailleurs se relit. */
export const EVT_COMPETENCES_ATELIER = "maitrize:competences-atelier";

/** Un objectif qu'un atelier travaille à l'écran — le calcul mental en a un par procédure. */
export interface ObjectifTravaille { id: string; libelle: string }

const objectifs: Record<string, ObjectifTravaille[]> = {};
const abonnes = new Set<() => void>();
const RIEN: ObjectifTravaille[] = [];

/**
 * Les objectifs retenus dans chaque atelier, publiés par l'atelier lui-même :
 * le bandeau y lit lequel on règle, l'impression y lit lesquels s'impriment.
 */
export const objectifsDesAteliers = {
  lire: (atelier: string): ObjectifTravaille[] => objectifs[atelier] ?? RIEN,
  publier(atelier: string, liste: ObjectifTravaille[]) {
    if (!atelier || JSON.stringify(objectifs[atelier] ?? []) === JSON.stringify(liste)) return;
    if (liste.length) objectifs[atelier] = liste; else delete objectifs[atelier];
    abonnes.forEach((f) => f());
  },
  abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
};

/** Les listes d'un atelier, objectif par objectif, lues dans tous les réglages ; les vides ne comptent pas. */
export function competencesParObjectif(reglages: Record<string, string>, atelier: string): Record<string, CompetenceSelectionnee[]> {
  const prefixe = `${PREFIXE_COMPETENCES}${atelier}:`;
  const sortie: Record<string, CompetenceSelectionnee[]> = {};
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (!cle.startsWith(prefixe)) continue;
    const liste = lireCompetencesAtelier(valeur);
    if (liste.length) sortie[cle.slice(prefixe.length)] = liste;
  }
  return sortie;
}

/** Plusieurs listes en une, sans dire deux fois la même compétence. */
export function unionDesCompetences(listes: CompetenceSelectionnee[][]): CompetenceSelectionnee[] {
  const sortie: CompetenceSelectionnee[] = [];
  for (const c of listes.flat()) if (!sortie.some((x) => memeCompetence(x, c))) sortie.push(c);
  return sortie;
}

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
