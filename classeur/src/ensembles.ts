// ── Les ensembles de pictos par thème ─────────────────────────────────────
//
// Après une case, quelques thèmes proposés, chacun avec ses pictos, dans une
// bande au-dessus de la grille : « je veux » → Manger (pain, pomme…), Jouer
// (ballon, puzzle…), Boire… Les poids sont calculés à l'avance, pour le
// classeur complet, par outils/classeur-par-defaut.py (les thèmes qui suivent
// chaque mot, le poids de chaque picto dans son thème) ; l'application ne
// fait que les lire : pas d'IA dedans, rien n'apprend, rien ne part.
//
// Les pictos de la grille ne bougent jamais : la bande est à part, et l'élève
// garde la mémoire des places.

import { pageDe, sectionDe, type Case, type Classeur } from "./modele";

export interface Ensemble {
  /** La page du thème : toucher le thème y mène. */
  page: string;
  nom: string;
  /** Le numéro de sa section (sa couleur). */
  section: number;
  poids: number;
  cases: Case[];
}

export const ENSEMBLES_MAX = 3;
export const PICTOS_PAR_ENSEMBLE = 4;

/**
 * Les ensembles à proposer après une case : ses thèmes, du plus lourd au plus léger, chacun avec les pictos les plus
 * lourds de sa page (puis de la suite de sa section, s'il en manque). Un thème dont la page est ouverte n'est pas
 * proposé ; sur la page suivante d'une section, sa première page l'est. Le poids d'un picto mêle sa fréquence en français parlé (Lexique 3.83) et son rang sur la page.
 */
export function ensemblesApres(
  c: Classeur, k: Case | null | undefined, pageOuverte: string, max = ENSEMBLES_MAX, parEnsemble = PICTOS_PAR_ENSEMBLE,
): Ensemble[] {
  if (!k?.suites?.length) return [];
  const sortie: Ensemble[] = [];
  for (const s of [...k.suites].sort((a, b) => b.poids - a.poids)) {
    const p = pageDe(c, s.page);
    const section = p && sectionDe(c, p.id);
    if (!p || !section || sortie.some((e) => e.page === p.id)) continue;
    if (p.id === pageOuverte) continue;
    // La page du thème et la suite de sa section, sauf la page ouverte : ses pictos sont déjà sous les yeux.
    const pages = section.pages.slice(section.pages.findIndex((x) => x.id === p.id)).filter((x) => x.id !== pageOuverte);
    // La page du thème d'abord, ses pictos les plus lourds en tête ; la suite de la section seulement s'il en manque.
    const cases = pages.flatMap((x, page) => x.cases.map((y, rang) => ({ x: y, page, rang })))
      .filter((y): y is { x: Case; page: number; rang: number } => !!y.x && !y.x.masquee && y.x.id !== k.id && !!(y.x.mot.trim() || y.x.image))
      .sort((a, b) => a.page - b.page || (b.x.poids ?? 0) - (a.x.poids ?? 0) || a.rang - b.rang)
      .slice(0, parEnsemble)
      .map(({ x }) => x);
    if (!cases.length) continue;
    sortie.push({ page: p.id, nom: p.nom, section: section.numero, poids: s.poids, cases });
    if (sortie.length >= max) break;
  }
  return sortie;
}
