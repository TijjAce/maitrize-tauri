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
// Puis : « il faut quand même que le mot de la catégorie soit dans les mots
// en dessous », « proposer seulement ce qui est en bas » (le même jour). La
// bande ne propose que les catégories dont la case est dans la grille de la
// page ouverte : elle la montre, un peu grisée, avec son picto et son mot, et
// la toucher fait comme toucher cette case. L'élève apprend ainsi où elle est.
//
// Les pictos de la grille ne bougent jamais : la bande est à part, et l'élève
// garde la mémoire des places.

import { pageDe, pictoDeLaPage, sectionDe, type Case, type Classeur, type Suite } from "./modele";

export interface CategorieProposee {
  /** La case de la grille, sur la page ouverte, qui mène à la catégorie : la toucher en haut fait comme elle. */
  caseId: string;
  /** La page où mène cette case. */
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
 * Les catégories à proposer après une case : ses suites, de la plus lourde à la plus légère, une par section, et
 * seulement celles qu'une case de la page ouverte ouvre — vers leur page, ou une autre page de leur section. Chacune
 * reprend le mot et le picto de cette case (sinon le picto de la catégorie). La page ouverte n'est pas proposée.
 */
export function categoriesApres(c: Classeur, k: Case | null | undefined, pageOuverte: string, max = CATEGORIES_MAX): CategorieProposee[] {
  const ouverte = pageDe(c, pageOuverte);
  if (!k?.suites?.length || !ouverte) return [];
  const liens = ouverte.cases.filter((x): x is Case => !!x && !x.masquee && !!x.lien && x.lien !== pageOuverte && !!pageDe(c, x.lien));
  const sortie: CategorieProposee[] = [];
  const sections = new Set<number>();
  for (const s of [...k.suites].sort((a, b) => b.poids - a.poids)) {
    const p = pageDe(c, s.page);
    const section = p && sectionDe(c, p.id);
    if (!p || !section || p.id === pageOuverte || sections.has(section.numero)) continue;
    const en = liens.find((x) => x.lien === p.id) ?? liens.find((x) => sectionDe(c, x.lien!)?.numero === section.numero);
    if (!en) continue;
    sections.add(section.numero);
    sortie.push({ caseId: en.id, page: en.lien!, nom: en.mot, section: section.numero, poids: s.poids, image: en.image ?? pictoDeLaPage(c, en.lien!) });
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
