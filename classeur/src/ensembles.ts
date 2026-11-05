// ── Les catégories proposées en haut ──────────────────────────────────────
//
// Après une case, quelques catégories proposées dans une bande au-dessus de
// la grille, chacune avec son picto : « je veux » → Manger, Jouer, Boire…
// Toucher une catégorie ouvre sa page. « En haut, il faut que des
// propositions de catégories avec des pictos représentatifs » (l'enseignant,
// 5 novembre 2026) : la bande ne montre plus les pictos d'une catégorie, mais
// la catégorie elle-même, avec le sien (voir `pictoDeLaPage`).
//
// Les catégories qui suivent chaque mot et leur poids sont calculés à
// l'avance, pour le classeur complet, par outils/classeur-par-defaut.py ;
// l'enseignant les choisit lui-même dans la fiche d'une case. L'application ne
// fait que les lire : pas d'IA dedans, rien n'apprend, rien ne part.
//
// Les pictos de la grille ne bougent jamais : la bande est à part, et l'élève
// garde la mémoire des places.

import { pageDe, pictoDeLaPage, sectionDe, type Case, type Classeur, type Suite } from "./modele";

export interface CategorieProposee {
  /** La page de la catégorie : la toucher y mène. */
  page: string;
  nom: string;
  /** Le numéro de sa section (sa couleur). */
  section: number;
  poids: number;
  /** Son picto, s'il y en a un. */
  image?: string;
}

/** Combien de catégories une case peut proposer. */
export const CATEGORIES_MAX = 5;

/**
 * Les catégories à proposer après une case : ses suites, de la plus lourde à la plus légère, une par section — la
 * deuxième page d'une section ne double pas la première. La page ouverte n'est pas proposée.
 */
export function categoriesApres(c: Classeur, k: Case | null | undefined, pageOuverte: string, max = CATEGORIES_MAX): CategorieProposee[] {
  if (!k?.suites?.length) return [];
  const sortie: CategorieProposee[] = [];
  const sections = new Set<number>();
  for (const s of [...k.suites].sort((a, b) => b.poids - a.poids)) {
    const p = pageDe(c, s.page);
    const section = p && sectionDe(c, p.id);
    if (!p || !section || p.id === pageOuverte || sections.has(section.numero)) continue;
    sections.add(section.numero);
    sortie.push({ page: p.id, nom: p.nom, section: section.numero, poids: s.poids, image: pictoDeLaPage(c, p.id) });
    if (sortie.length >= max) break;
  }
  return sortie;
}

// ── Les catégories choisies par l'enseignant, dans la fiche d'une case ────

/** Les catégories d'une case, telles que la fiche les montre : la plus lourde d'abord. */
export const categoriesDeLaCase = (suites: Suite[] | undefined): string[] =>
  [...(suites ?? [])].sort((a, b) => b.poids - a.poids).slice(0, CATEGORIES_MAX).map((s) => s.page);

/** Les suites d'après les catégories de la fiche : le rang fait le poids (la première d'abord) ; une catégorie en double ne compte qu'une fois. */
export function suitesDeLaFiche(pages: string[]): Suite[] {
  const retenues = pages.filter((p, i) => p && pages.indexOf(p) === i).slice(0, CATEGORIES_MAX);
  const parts = retenues.map((_, i) => retenues.length - i);
  const total = parts.reduce((a, b) => a + b, 0);
  return retenues.map((page, i) => ({ page, poids: Math.round((parts[i] / total) * 1000) / 1000 }));
}
