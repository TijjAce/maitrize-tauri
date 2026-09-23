// ── Ce que ⌘K met en tête ─────────────────────────────────────────────────
//
// Une palette se juge à sa première ligne. Deux défauts la rendaient pénible :
// elle comparait des libellés accentués à ce qu'on tape sans accents — « eleves »
// ne trouvait pas « Élèves » —, et elle rangeait par catégorie plutôt que par
// pertinence, si bien que le titre exact d'une séquence passait derrière trois
// actions qui contenaient vaguement le mot.
//
// Ici : on compare sans accents, on note ce qui colle le mieux, et l'on se
// souvient de ce qui a servi. Le reste de l'écran n'a plus qu'à afficher.

import { normaliser } from "./competencesTravaillees";

/** Ce que la palette sait classer : un libellé, un sous-titre, une origine. */
export interface Classable {
  id: string;
  label: string;
  sous?: string;
  /**
   * Le sous-titre s'affiche, mais ne se cherche pas.
   *
   * Un dossier porte le chemin de ses parents en sous-titre : sans cela,
   * chercher « vocabulaire » remonte le dossier **et** ses six enfants, qui
   * ne s'appellent pas comme ça. On cherche un dossier par son nom.
   */
  sousMuet?: boolean;
  /** Les résultats venus de la base passent après les commandes, à score égal. */
  donnee?: boolean;
  /**
   * Le moteur a déjà trouvé ce résultat : on le classe, on ne le rejette pas.
   *
   * La recherche en base lit le corps des textes, des bilans, des synthèses ;
   * la palette, elle, ne voit que le titre. Sans cela, un bilan trouvé sur un
   * mot écrit dedans disparaissait entre le moteur et l'écran.
   */
  dejaTrouve?: boolean;
}

/** Combien de commandes récentes la palette garde en mémoire. */
export const RECENTS_GARDES = 8;
/** Combien elle en montre à l'ouverture, avant qu'on tape quoi que ce soit. */
export const RECENTS_MONTRES = 5;

/**
 * La note d'une commande pour cette recherche, ou null si elle ne colle pas.
 *
 * Trois paliers, du plus franc au plus lâche : le libellé commence par ce
 * qu'on tape, un de ses mots commence par ce qu'on tape, ou le texte le
 * contient quelque part. Le sous-titre compte moins que le libellé : chercher
 * « élèves » ne doit pas remonter tout ce qui se range sous « Élèves ».
 */
export function note(c: Classable, recherche: string): number | null {
  const q = normaliser(recherche).trim();
  if (!q) return 0;
  const mots = q.split(/\s+/).filter(Boolean);
  const label = normaliser(c.label);
  const sous = c.sousMuet ? "" : normaliser(c.sous ?? "");
  let total = 0;
  for (const mot of mots) {
    const dans = (t: string) => {
      if (!t.includes(mot)) return 0;
      if (t.startsWith(mot)) return 100;
      // Début d'un mot : « synthese » trouve « Synthèse GS » comme « Ma synthèse ».
      if (new RegExp(`(^|[^\\p{L}\\p{N}])${mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(t)) return 60;
      return 25;
    };
    const n = Math.max(dans(label), Math.round(dans(sous) * 0.4));
    // Un seul mot qui manque, et la commande ne répond pas à la question —
    // sauf pour ce que le moteur a trouvé ailleurs que dans le titre : cela
    // se range en fin de liste plutôt que de disparaître.
    if (!n) {
      if (!c.dejaTrouve) return null;
      total += 8;
      continue;
    }
    total += n;
  }
  // Un libellé court qui contient tout est plus juste qu'un libellé fleuve.
  return total + Math.max(0, 40 - label.length) / 10;
}

/**
 * Les commandes qui répondent, les meilleures d'abord.
 *
 * `recents` remonte ce qui a déjà servi : à note égale, ce qu'on a fait hier
 * passe devant ce qu'on n'a jamais ouvert.
 */
export function classer<T extends Classable>(cmds: T[], recherche: string, recents: string[] = []): T[] {
  const rang = new Map(recents.map((id, i) => [id, recents.length - i]));
  return cmds
    .map((c, ordre) => ({ c, ordre, n: note(c, recherche) }))
    .filter((x): x is { c: T; ordre: number; n: number } => x.n !== null)
    .sort((a, b) => {
      const bonus = (x: typeof a) => x.n + (rang.get(x.c.id) ?? 0) * 3 + (x.c.donnee ? -1 : 0);
      return bonus(b) - bonus(a) || a.ordre - b.ordre;
    })
    .map((x) => x.c);
}

// ── Ce qu'on a déjà fait ──────────────────────────────────────────────────

/** Les identifiants gardés, du plus récent au plus ancien. */
export function lireRecents(brut: string | null): string[] {
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENTS_GARDES) : [];
  } catch {
    return [];
  }
}

/** Le même, avec cette commande en tête et sans doublon. */
export function ajouterRecent(recents: string[], id: string): string[] {
  return [id, ...recents.filter((x) => x !== id)].slice(0, RECENTS_GARDES);
}

/**
 * Ce que la palette montre quand on n'a rien tapé.
 *
 * Pas le catalogue — cinquante entrées n'apprennent rien et ne se lisent pas.
 * Ce qu'on fait d'habitude : les dernières commandes utilisées, complétées par
 * quelques départs francs pour qui ouvre la palette la première fois.
 */
export function ouverture<T extends Classable>(cmds: T[], recents: string[], toujours: string[]): T[] {
  const parId = new Map(cmds.map((c) => [c.id, c]));
  const vus = new Set<string>();
  const sortie: T[] = [];
  for (const id of [...recents.slice(0, RECENTS_MONTRES), ...toujours]) {
    const c = parId.get(id);
    if (c && !vus.has(id)) { vus.add(id); sortie.push(c); }
  }
  return sortie;
}
