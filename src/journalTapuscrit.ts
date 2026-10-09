// Le tapuscrit d'une séance dans le cahier journal imprimé.
//
// Les consignes d'une séance, traduites en pictogrammes (voir tapuscrit.ts),
// peuvent s'imprimer sous son créneau. C'est un choix par créneau, et par
// défaut non : le cahier journal est la feuille de l'enseignant, et ce n'est
// pas tous les jours qu'on veut y voir le tapuscrit. Le choix se garde dans
// un réglage partagé entre les ordinateurs (préfixe « journal: »).

export const PREFIXE_TAPUSCRIT = "journal:tapuscrit:";

/** Où se garde le choix d'un créneau : « 1 » pour imprimer son tapuscrit. */
export const cleTapuscritDuCreneau = (creneauId: string) => `${PREFIXE_TAPUSCRIT}${creneauId}`;

/** Émis quand un choix change : le journal ouvert ailleurs se met à jour. */
export const EVT_TAPUSCRIT_JOURNAL = "maitrize:journal-tapuscrit";

/** Les créneaux dont le tapuscrit s'imprime, d'après l'ensemble des réglages. */
export function creneauxAvecTapuscrit(reglages: Record<string, string>): Set<string> {
  const sortie = new Set<string>();
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (cle.startsWith(PREFIXE_TAPUSCRIT) && cle.length > PREFIXE_TAPUSCRIT.length && valeur === "1") {
      sortie.add(cle.slice(PREFIXE_TAPUSCRIT.length));
    }
  }
  return sortie;
}
