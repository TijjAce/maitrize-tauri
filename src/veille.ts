// Veille : ce qui fige ne dit rien de lui-même.
//
// Une erreur laisse une trace : on la voit dans le journal d'incidents. Une
// boucle infinie, non — la fenêtre se fige, l'enseignant la ferme de force, et
// il ne reste rien à lire après coup. Or c'est précisément le genre de panne
// qu'on ne peut pas reproduire sur commande.
//
// Un battement régulier suffit à s'en apercevoir : si deux battements sont
// séparés de beaucoup plus que leur intervalle, c'est que le fil principal
// était bloqué entre les deux. Rien n'est interrompu — on ne fait que noter,
// avec l'écran où c'est arrivé.

import { battement, journal } from "./api";

/** Intervalle du battement. */
export const BATTEMENT_MS = 2000;

/** En dessous, c'est une lenteur ordinaire ; au-dessus, la fenêtre était bloquée. */
export const BLOCAGE_MS = 5000;

/**
 * Au-delà, ce n'est plus un blocage : l'ordinateur dormait.
 *
 * Refermer le portable arrête les minuteurs ; au réveil, l'écart se compte en
 * minutes. Le signaler comme un incident apprendrait surtout à ignorer le
 * journal.
 */
export const SOMMEIL_MS = 120_000;

/**
 * Ce qu'il faut écrire pour cet écart, ou rien du tout.
 *
 * Séparé du minuteur pour être vérifiable : c'est cette décision qui, en se
 * trompant, remplirait le journal de fausses alertes.
 */
export function messageDeBlocage(ecart: number, cache: boolean, ou: string): string | null {
  // Fenêtre masquée : le navigateur ralentit lui-même les minuteurs.
  if (cache) return null;
  if (ecart < BLOCAGE_MS || ecart > SOMMEIL_MS) return null;
  return `FIGÉ ${Math.round(ecart / 1000)} s${ou ? ` sur ${ou}` : ""}`;
}

/** L'écran où l'on se trouve, tel qu'il tient dans une ligne de journal. */
const ouSuisJe = () => (typeof location === "undefined" ? "" : location.hash.replace(/^#/, "") || "/");

/**
 * Démarre la veille. Rendre la fonction d'arrêt facilite les tests.
 *
 * Le battement part aussi au backend : lui n'est jamais bloqué, et peut donc
 * écrire *pendant* que la fenêtre est figée. Celle-ci, elle, ne sait le dire
 * qu'une fois débloquée — et jamais si l'enseignant l'a fermée de force.
 */
export function demarrerLaVeille(
  ecrire: (ligne: string) => void = journal,
  battre: (ou: string) => void = battement,
): () => void {
  let precedent = Date.now();
  // Minuteur global plutôt que `window` : la veille doit aussi tourner là où
  // il n'y a pas de fenêtre — dans les tests, par exemple.
  const id = setInterval(() => {
    const maintenant = Date.now();
    const ecart = maintenant - precedent - BATTEMENT_MS;
    precedent = maintenant;
    const ou = ouSuisJe();
    battre(ou);
    const ligne = messageDeBlocage(ecart, typeof document !== "undefined" && document.hidden, ou);
    if (ligne) ecrire(ligne);
  }, BATTEMENT_MS);
  return () => clearInterval(id);
}
