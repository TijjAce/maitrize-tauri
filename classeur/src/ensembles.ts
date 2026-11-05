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

import { pageDe, sectionDe, type Case, type Classeur, type Suite } from "./modele";

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
  const parId = new Map(c.pages.flatMap((pg) => pg.cases.flatMap((x) => (x ? [[x.id, x] as const] : []))));
  const sortie: Ensemble[] = [];
  for (const s of [...k.suites].sort((a, b) => b.poids - a.poids)) {
    const p = pageDe(c, s.page);
    const section = p && sectionDe(c, p.id);
    if (!p || !section || sortie.some((e) => e.page === p.id)) continue;
    if (p.id === pageOuverte) continue;
    const ouverte = new Set((pageDe(c, pageOuverte)?.cases ?? []).flatMap((x) => (x ? [x.id] : [])));
    const montrable = (x: Case | null | undefined): x is Case =>
      !!x && !x.masquee && x.id !== k.id && !ouverte.has(x.id) && !!(x.mot.trim() || x.image);
    // Les pictos choisis pour cette suite d'abord (« bonjour » → maman, papa…), dans leur ordre.
    const choisies = (s.cases ?? []).map((id) => parId.get(id)).filter(montrable);
    // Puis, s'il en manque, la page du thème, ses pictos les plus lourds en tête, et la suite de sa section.
    const pages = section.pages.slice(section.pages.findIndex((x) => x.id === p.id)).filter((x) => x.id !== pageOuverte);
    const lourdes = pages.flatMap((x, page) => x.cases.map((y, rang) => ({ x: y, page, rang })))
      .filter((y): y is { x: Case; page: number; rang: number } => montrable(y.x) && !choisies.includes(y.x))
      .sort((a, b) => a.page - b.page || (b.x.poids ?? 0) - (a.x.poids ?? 0) || a.rang - b.rang)
      .map(({ x }) => x);
    const cases = [...choisies, ...lourdes].slice(0, parEnsemble);
    if (!cases.length) continue;
    sortie.push({ page: p.id, nom: p.nom, section: section.numero, poids: s.poids, cases });
    if (sortie.length >= max) break;
  }
  return sortie;
}

// ── Les suites choisies par l'enseignant, dans la fiche d'une case ────────

/** Une ligne de la fiche : un thème (une page), et les pictos choisis, dans l'ordre. */
export interface LigneDeSuite { page: string; cases: string[] }

/** Les lignes de la fiche, d'après les suites d'une case : la plus lourde d'abord. */
export const lignesDeSuites = (suites: Suite[] | undefined): LigneDeSuite[] =>
  [...(suites ?? [])].sort((a, b) => b.poids - a.poids).slice(0, ENSEMBLES_MAX).map((s) => ({ page: s.page, cases: [...(s.cases ?? [])] }));

/** Les suites d'après les lignes de la fiche : le rang fait le poids (la première d'abord) ; quatre pictos au plus. */
export function suitesDeLaFiche(lignes: LigneDeSuite[]): Suite[] {
  const retenues = lignes.filter((l, i) => l.page && lignes.findIndex((x) => x.page === l.page) === i).slice(0, ENSEMBLES_MAX);
  const parts = retenues.map((_, i) => retenues.length - i);
  const total = parts.reduce((a, b) => a + b, 0);
  return retenues.map((l, i) => ({
    page: l.page, poids: Math.round((parts[i] / total) * 1000) / 1000,
    ...(l.cases.length ? { cases: l.cases.slice(0, PICTOS_PAR_ENSEMBLE) } : {}),
  }));
}

/** Les pictos d'un thème, à choisir dans la fiche : toute sa section. */
export function casesDuTheme(c: Classeur, pageId: string): Case[] {
  const section = sectionDe(c, pageId);
  return (section?.pages ?? []).flatMap((p) => p.cases).filter((k): k is Case => !!k && !!(k.mot.trim() || k.image));
}

