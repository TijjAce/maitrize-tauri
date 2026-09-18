// Un seul bureau pour Ateliers & Espaces.
//
// Chaque onglet avait son propre bureau : ses dossiers, ses places. Or un
// dossier « cycle 1 » a vocation à réunir un jeu, l'outil qui va avec et
// l'affichage du coin lecture — ce que cinq bureaux séparés interdisaient.
// Tout se range donc sur un bureau commun, sans onglets : la recherche et les
// filtres propres à chaque sorte (nombre de joueurs, catégorie, élève)
// suffisent à retrouver ce qu'on cherche.
//
// Les dossiers vivent déjà sur chaque fiche (son champ `dossier`) : ils se
// retrouvent d'eux-mêmes. Seuls leurs réglages — la couleur d'un dossier, et
// donc l'existence d'un dossier encore vide — étaient rangés par onglet ; ils
// sont repris une fois dans l'espace commun.

/**
 * Ouvrir la page sur un élément précis, en le cherchant.
 *
 * La page n'a plus d'onglets où envoyer quelqu'un : depuis ⌘K, c'est la
 * recherche de la page qui mène jusqu'à l'élément trouvé.
 */
export const EVT_CHERCHER_ATELIERS = "maitrize:ateliers-chercher";

/** L'espace de réglages du bureau commun : « rangement:atelier:… ». */
export const ESPACE_COMMUN = "atelier";

/** Les anciens bureaux, un par onglet. */
export const ANCIENS_ESPACES = ["ateliers", "espaces", "jeux", "outils", "affichages"] as const;

/** Posé une fois la reprise faite : supprimer tous ses dossiers ne doit pas faire revenir les anciens. */
export const CLE_REPRISE = `rangement:${ESPACE_COMMUN}:repris`;

const prefixeDossier = (espace: string) => `rangement:${espace}:dossier:`;

/**
 * Les réglages à écrire pour reprendre, dans le bureau commun, les dossiers
 * des anciens bureaux d'onglet. Rien si la reprise est déjà faite.
 *
 * Deux onglets qui avaient un dossier du même nom n'en font plus qu'un : c'est
 * le but. Sa couleur est celle du premier onglet qui l'avait, dans l'ordre des
 * onglets.
 */
export function reprendreLesDossiers(reglages: Record<string, string>): Record<string, string> {
  if (reglages[CLE_REPRISE]) return {};
  const cible = prefixeDossier(ESPACE_COMMUN);
  const ecritures: Record<string, string> = {};
  for (const ancien of ANCIENS_ESPACES) {
    const source = prefixeDossier(ancien);
    for (const [cle, valeur] of Object.entries(reglages)) {
      if (!cle.startsWith(source) || !valeur) continue;
      const chemin = cle.slice(source.length);
      const nouvelle = cible + chemin;
      // Un dossier déjà présent dans le bureau commun garde sa couleur.
      if (chemin && !(nouvelle in reglages) && !(nouvelle in ecritures)) ecritures[nouvelle] = valeur;
    }
  }
  ecritures[CLE_REPRISE] = "1";
  return ecritures;
}

/** Les sortes d'éléments du bureau, chacune avec son préfixe de clé. */
export type Sorte = "atelier" | "espace" | "jeu" | "outil";

const PREFIXES: Record<Sorte, string> = { atelier: "a", espace: "e", jeu: "j", outil: "o" };

/**
 * La clé d'un élément sur le bureau commun.
 *
 * Deux fiches de tables différentes peuvent porter le même identifiant : sans
 * préfixe, un jeu et un outil se disputeraient la même case.
 */
export const cleDe = (sorte: Sorte, id: string) => `${PREFIXES[sorte]}:${id}`;

/** La sorte et l'identifiant d'une clé du bureau, ou null si elle n'en est pas une. */
export function decouper(cle: string): { sorte: Sorte; id: string } | null {
  const i = cle.indexOf(":");
  if (i < 0) return null;
  const sorte = (Object.keys(PREFIXES) as Sorte[]).find((s) => PREFIXES[s] === cle.slice(0, i));
  const id = cle.slice(i + 1);
  return sorte && id ? { sorte, id } : null;
}
