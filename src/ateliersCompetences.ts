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

const propositions: Record<string, { objectif: string; liste: CompetenceSelectionnee[] }> = {};
const abonnesPropositions = new Set<() => void>();
const AUCUNE: CompetenceSelectionnee[] = [];
const signature = (liste: CompetenceSelectionnee[]) =>
  liste.map((c) => [c.referentielNom, c.sousDomaineTitre, c.competenceRefId ?? c.competenceTitre].join("|")).join("\n");

/**
 * Ce qu'un atelier propose de retenir pour l'objectif à l'écran — les
 * compétences de la classe choisie, quand l'atelier sait les trouver dans les
 * référentiels. Une proposition, pas un choix : seul ce qu'on retient
 * s'imprime et se garde.
 */
export const propositionsDesAteliers = {
  lire: (atelier: string, objectif = ""): CompetenceSelectionnee[] =>
    propositions[atelier]?.objectif === objectif ? propositions[atelier].liste : AUCUNE,
  publier(atelier: string, objectif: string, liste: CompetenceSelectionnee[]) {
    const avant = propositions[atelier];
    if (avant ? avant.objectif === objectif && signature(avant.liste) === signature(liste) : !liste.length) return;
    if (liste.length) propositions[atelier] = { objectif, liste }; else delete propositions[atelier];
    abonnesPropositions.forEach((f) => f());
  },
  abonner(f: () => void) { abonnesPropositions.add(f); return () => { abonnesPropositions.delete(f); }; },
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
  // Une ligne du référentiel se reconnaît à son identifiant, qui ne sert qu'une fois : le titre de sa partie a pu être corrigé.
  && (a.competenceRefId && b.competenceRefId ? a.competenceRefId === b.competenceRefId
    : a.sousDomaineTitre === b.sousDomaineTitre && (a.competenceRefId ?? a.competenceTitre) === (b.competenceRefId ?? b.competenceTitre));

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

// ── Le catalogue par compétence ───────────────────────────────────────────
//
// Fabriquer peut se lire depuis les programmes : chaque compétence, et les
// ateliers qui la travaillent. C'est la même donnée que « Ce que cela
// travaille », lue dans l'autre sens : ce qu'on rattache d'un côté se voit
// de l'autre, et les séquences y piochent pareil.

/** Un atelier rattaché à une compétence, et la liste qui l'y rattache : vide pour « tous niveaux », sinon une classe ou un objectif. */
export interface LienAtelier { atelier: string; objectif: string }

/** Une ligne de référentiel, reconnue d'une liste à l'autre : son référentiel et son identifiant. */
export const identiteCompetence = (referentielNom: string, competenceRefId: string) => `${referentielNom}#${competenceRefId}`;

/** Les listes d'un atelier — tous niveaux, par classe, par objectif —, lues dans les réglages. */
function listesDe(reglages: Record<string, string>, atelier: string): [string, CompetenceSelectionnee[]][] {
  const base = cleDesCompetences(atelier);
  return Object.entries(reglages)
    .filter(([cle]) => cle === base || cle.startsWith(`${base}:`))
    .map(([cle, valeur]): [string, CompetenceSelectionnee[]] => [cle, lireCompetencesAtelier(valeur)]);
}

/**
 * Les ateliers de chaque compétence, d'après toutes les listes. Une ligne
 * gardée sans identifiant — choisie avant qu'ils existent — ne se retrouve
 * pas dans l'arbre : l'arbre ne la coche pas non plus.
 */
export function liensParCompetence(reglages: Record<string, string>): Map<string, LienAtelier[]> {
  const sortie = new Map<string, LienAtelier[]>();
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (!cle.startsWith(PREFIXE_COMPETENCES)) continue;
    const [atelier, ...reste] = cle.slice(PREFIXE_COMPETENCES.length).split(":");
    if (!atelier) continue;
    const objectif = reste.join(":");
    for (const c of lireCompetencesAtelier(valeur)) {
      if (!c.competenceRefId) continue;
      const id = identiteCompetence(c.referentielNom, c.competenceRefId);
      const liens = sortie.get(id) ?? [];
      if (!liens.some((l) => l.atelier === atelier && l.objectif === objectif)) liens.push({ atelier, objectif });
      sortie.set(id, liens);
    }
  }
  return sortie;
}

/** Combien de compétences différentes chaque atelier travaille, toutes listes confondues. */
export function nombreDeCompetences(reglages: Record<string, string>): Record<string, number> {
  const parAtelier: Record<string, Set<string>> = {};
  for (const [id, liens] of liensParCompetence(reglages)) {
    for (const l of liens) (parAtelier[l.atelier] ??= new Set()).add(id);
  }
  return Object.fromEntries(Object.entries(parAtelier).map(([a, s]) => [a, s.size]));
}

/**
 * Ce qu'il faut écrire pour rattacher la compétence à l'atelier : sa liste
 * « tous niveaux », celle que l'atelier montre d'abord et que sa feuille
 * imprime. La compétence dit déjà sa classe : une séquence d'une autre
 * classe ne la vise pas. Rien à écrire si l'atelier l'a déjà, dans une
 * liste ou une autre.
 */
export function rattacherAtelier(reglages: Record<string, string>, atelier: string, c: CompetenceSelectionnee): Record<string, string> {
  if (listesDe(reglages, atelier).some(([, liste]) => liste.some((x) => memeCompetence(x, c)))) return {};
  const cle = cleDesCompetences(atelier);
  return { [cle]: ecrireCompetencesAtelier([...lireCompetencesAtelier(reglages[cle]), c]) };
}

/** Ce qu'il faut écrire pour détacher la compétence de l'atelier : retirée de toutes ses listes, puisqu'on la voyait d'un seul tenant. */
export function detacherAtelier(reglages: Record<string, string>, atelier: string, c: CompetenceSelectionnee): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const [cle, liste] of listesDe(reglages, atelier)) {
    if (liste.some((x) => memeCompetence(x, c))) sortie[cle] = ecrireCompetencesAtelier(liste.filter((x) => !memeCompetence(x, c)));
  }
  return sortie;
}

export const ORDRE_DES_NIVEAUX = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"];

/** Les niveaux d'une ligne de référentiel : « CE1 », une plage « CP-CE2 », ou aucun quand elle vaut pour tout le cycle. */
export function niveauxDeLaLigne(niveau: string | null | undefined): string[] {
  const n = (niveau ?? "").trim();
  if (!n) return [];
  const [a, b = a] = n.split("-").map((x) => x.trim());
  const i = ORDRE_DES_NIVEAUX.indexOf(a), j = ORDRE_DES_NIVEAUX.indexOf(b);
  return i < 0 || j < i ? [n] : ORDRE_DES_NIVEAUX.slice(i, j + 1);
}

/** La ligne vaut pour ce niveau : le sien, une plage qui le contient, ou tout le cycle. */
export function vautPourLeNiveau(niveau: string | null | undefined, filtre: string): boolean {
  const niveaux = niveauxDeLaLigne(niveau);
  return !filtre || !niveaux.length || niveaux.includes(filtre);
}
