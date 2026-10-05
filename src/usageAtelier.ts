// ── Où se range un atelier : le moment de la séquence qu'il sert ─────────
//
// Les phases d'une séquence d'apprentissage sont décrites de la même façon
// dans les fiches des circonscriptions et sur Éduscol : découverte —
// recherche, manipulation —, structuration, entraînement, réinvestissement
// (transfert), évaluation. Le guide « Pour enseigner les nombres, le calcul
// et la résolution de problèmes au CP » les résume en « manipuler,
// verbaliser, abstraire » ; l'enseignement explicite parle de pratique
// guidée puis autonome. Le rituel, lui, n'est pas une phase mais une
// organisation à part : un moment court et répété, fait pour automatiser.
//
// Un jeu fabriqué ici sert l'un de ces moments. On le range, une fois, et
// le catalogue se lit par moment : ce qu'on sort en début de séquence, ce
// qu'on donne à s'entraîner, ce qu'on garde pour la fin, ce qu'on fait
// chaque matin. Les rangements proposés sont un point de départ ; celui de
// l'enseignant l'emporte, et se partage entre ses ordinateurs.

export type Usage = "manipulation" | "entrainement" | "reinvestissement" | "rituel";

export interface DescriptionUsage {
  id: Usage;
  nom: string;
  ico: string;
  /** Quand, dans la séquence ou la semaine. */
  quand: string;
  /** Ce que c'est, en une phrase, d'après les phases d'apprentissage. */
  aide: string;
}

/** Les moments, dans l'ordre où on les vit dans une séquence ; le rituel à part, en dernier. */
export const USAGES: DescriptionUsage[] = [
  { id: "manipulation", nom: "Manipulation", ico: "🧪", quand: "en début de séquence",
    aide: "La phase de découverte : on cherche, on manipule, on tâtonne, avant que la notion ne soit posée — manipuler, avant de verbaliser et d'abstraire." },
  { id: "entrainement", nom: "Entraînement", ico: "✏️", quand: "après la leçon",
    aide: "La phase d'entraînement : la notion est posée, on s'exerce pour l'installer — la pratique autonome de l'enseignement explicite." },
  { id: "reinvestissement", nom: "Réinvestissement", ico: "🎯", quand: "en fin de séquence",
    aide: "La phase de transfert : on retrouve la notion dans un autre contexte — un jeu, une situation nouvelle." },
  { id: "rituel", nom: "Rituel", ico: "🔁", quand: "chaque jour, en quelques minutes",
    aide: "Un moment court et répété, à heure fixe, pour automatiser ce qui a déjà été appris." },
];

export const estUnUsage = (v: unknown): v is Usage => USAGES.some((u) => u.id === v);

export const descriptionDe = (u: Usage): DescriptionUsage => USAGES.find((x) => x.id === u) ?? USAGES[1];

/**
 * Le rangement proposé pour chaque atelier, tant que l'enseignant n'a pas
 * choisi : ce à quoi il sert le plus souvent. Un atelier inconnu est de
 * l'entraînement — c'est le cas le plus fréquent.
 */
export const USAGE_PAR_DEFAUT: Record<string, Usage> = {
  // Langage : le vocabulaire se rencontre en images, puis se rejoue.
  jeux: "reinvestissement", memory: "reinvestissement", imagier: "manipulation", categoriser: "manipulation", etiquettes: "manipulation", ombres: "manipulation",
  // Sons et lecture : la fluence et le syllabaire se font chaque jour.
  sons: "entrainement", lotoSyllabes: "manipulation", dominos: "reinvestissement", intrus: "entrainement", paires: "entrainement",
  fluence: "rituel", syllabaire: "rituel", lettres: "reinvestissement", gestes: "manipulation", motsGestes: "entrainement", syllabeManquante: "entrainement",
  // Lecture et écriture : on trie pour découvrir, on remet en ordre pour s'entraîner.
  tri: "manipulation", phrases: "entrainement", motsMeles: "reinvestissement",
  // Mathématiques : le calcul mental est le rituel par excellence.
  martiniere: "rituel", compteEstBon: "rituel", pyramides: "entrainement", partieTout: "entrainement", multiplicatifs: "entrainement",
  coloriage: "reinvestissement", collections: "manipulation", nombres: "manipulation", cubes: "manipulation", calcul: "entrainement", arbre: "entrainement",
  fractions: "manipulation", oie: "reinvestissement", heure: "entrainement", numeration: "entrainement",
};

export const usageParDefaut = (atelier: string): Usage => USAGE_PAR_DEFAUT[atelier] ?? "entrainement";

export const PREFIXE_USAGE = "fabriquer:usage:";
export const cleUsage = (atelier: string) => `${PREFIXE_USAGE}${atelier}`;
export const EVT_USAGE = "maitrize:usage-atelier";

/** Le rangement d'un atelier : celui qu'on a enregistré s'il est valable, le proposé sinon. */
export function lireUsage(valeur: string | null | undefined, atelier: string): Usage {
  return estUnUsage(valeur) ? valeur : usageParDefaut(atelier);
}

/** Les rangements de tous les ateliers, d'après les réglages : ce qu'on a rangé, et les rangements proposés pour le reste. */
export function usagesDesReglages(reglages: Record<string, string>, ateliers: readonly string[]): Record<string, Usage> {
  const sortie: Record<string, Usage> = {};
  for (const a of ateliers) sortie[a] = lireUsage(reglages[cleUsage(a)], a);
  return sortie;
}

/**
 * Les ateliers rangés par moment, dans l'ordre de la séquence. Un moment sans
 * atelier n'apparaît pas — sauf si on le demande, pour pouvoir y déposer.
 */
export function rangerParUsage<T extends { id: string }>(
  outils: T[], usages: Record<string, Usage>, avecVides = false,
): { usage: DescriptionUsage; outils: T[] }[] {
  return USAGES
    .map((usage) => ({ usage, outils: outils.filter((o) => (usages[o.id] ?? usageParDefaut(o.id)) === usage.id) }))
    .filter((g) => avecVides || g.outils.length > 0);
}
