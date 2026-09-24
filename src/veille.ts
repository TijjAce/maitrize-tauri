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

import { battement, commandesEnCours, journal } from "./api";

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
 * trompant, remplirait le journal de fausses alertes. Et elle s'est trompée :
 * sur cent vingt gels relevés, presque tous ont été écrits pendant que la
 * fenêtre était derrière une autre. macOS ralentit alors les minuteurs de
 * lui-même — l'application ne bloquait rien, et personne ne regardait.
 */
export function messageDeBlocage(
  ecart: number, cache: boolean, ou: string, auPremierPlan = true,
): string | null {
  // Fenêtre masquée ou en arrière-plan : le système ralentit les minuteurs.
  if (cache || !auPremierPlan) return null;
  if (ecart < BLOCAGE_MS || ecart > SOMMEIL_MS) return null;
  return `FIGÉ ${Math.round(ecart / 1000)} s${ou ? ` sur ${ou}` : ""}`;
}

/** L'écran où l'on se trouve, tel qu'il tient dans une ligne de journal. */
const ouSuisJe = () => (typeof location === "undefined" ? "" : location.hash.replace(/^#/, "") || "/");

/**
 * L'écran, et ce qui tourne dessus.
 *
 * « FIGÉ 94 s sur /plan » ne dit pas quoi chercher ; « FIGÉ 94 s sur /plan
 * (sync_deltas 46s) » désigne le coupable. Le battement l'emporte au backend,
 * qui pourra le citer pendant le blocage — c'est le seul moment où la fenêtre,
 * elle, ne peut plus rien écrire.
 */
export function ouEtQuoi(ou: string, enCours: string): string {
  return enCours ? `${ou} (${enCours})` : ou;
}

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
  // Un gel ne se compte que si la fenêtre est restée devant d'un battement à
  // l'autre : passer derrière suffit à faire traîner les minuteurs, et l'on
  // prenait ce ralentissement pour un blocage.
  let resteeDevant = typeof document === "undefined" || document.hasFocus();
  const devant = () => { resteeDevant = true; };
  const derriere = () => { resteeDevant = false; };
  if (typeof window !== "undefined") {
    window.addEventListener("focus", devant);
    window.addEventListener("blur", derriere);
  }
  // Minuteur global plutôt que `window` : la veille doit aussi tourner là où
  // il n'y a pas de fenêtre — dans les tests, par exemple.
  const id = setInterval(() => {
    const maintenant = Date.now();
    const ecart = maintenant - precedent - BATTEMENT_MS;
    precedent = maintenant;
    const ou = ouEtQuoi(ouSuisJe(), commandesEnCours());
    battre(ou);
    const ligne = messageDeBlocage(
      ecart, typeof document !== "undefined" && document.hidden, ou, resteeDevant);
    if (ligne) ecrire(ligne);
    // Le battement suivant repart de l'état d'aujourd'hui, pas d'hier.
    resteeDevant = typeof document === "undefined" || document.hasFocus();
  }, BATTEMENT_MS);
  return () => {
    clearInterval(id);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", devant);
      window.removeEventListener("blur", derriere);
    }
  };
}
