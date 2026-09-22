// Un seul bureau dans l'application.
//
// Ateliers, espaces, jeux, outils et affichages avaient leur propre bureau —
// d'abord un par onglet, puis un commun à la page. Ils rejoignent désormais le
// bureau du plan de travail : un dossier « cycle 1 » peut réunir une séquence,
// ses jeux, l'outil qui va avec et l'affichage du coin.
//
// Les dossiers vivent sur chaque fiche (son champ `dossier`) : ils se
// retrouvent d'eux-mêmes. Seuls leurs réglages — la couleur d'un dossier, et
// donc l'existence d'un dossier encore vide — étaient rangés à part ; ils sont
// versés une fois dans ceux du plan de travail.

/**
 * Ouvrir le bureau sur un élément précis, en le cherchant.
 *
 * Un jeu ou un outil n'a plus de page à lui : depuis ⌘K, c'est le bureau qui
 * mène jusqu'à l'élément trouvé — dans **son dossier**, et non à la racine
 * avec un filtre. Retrouver quelque chose, c'est aussi voir où il est rangé.
 */
export const EVT_CHERCHER_BUREAU = "maitrize:bureau-chercher";

/** Ce que ⌘K demande au bureau : cet élément-là, ou ce dossier-là. */
export interface DemandeBureau {
  /** L'identifiant de la ligne, quand on l'a : c'est lui qui situe le dossier. */
  id?: string;
  /** Un dossier à ouvrir, chemin complet — sans élément à désigner. */
  dossier?: string;
  /** À défaut, le titre — une vieille demande, ou un élément disparu. */
  titre: string;
}

/** Une demande, quelle que soit la forme reçue (un titre suffisait avant). */
export function lireDemandeBureau(detail: unknown): DemandeBureau {
  if (typeof detail === "string") return { titre: detail };
  if (detail && typeof detail === "object") {
    const o = detail as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : undefined,
      dossier: typeof o.dossier === "string" ? o.dossier : undefined,
      titre: typeof o.titre === "string" ? o.titre : "",
    };
  }
  return { titre: "" };
}

/** L'espace de réglages du bureau commun : « rangement:atelier:… ». */
export const ESPACE_COMMUN = "atelier";

/** Les anciens bureaux, un par onglet. */
export const ANCIENS_ESPACES = ["ateliers", "espaces", "jeux", "outils", "affichages"] as const;

const prefixeDossier = (espace: string) => `rangement:${espace}:dossier:`;

/** Posé une fois les dossiers versés dans le plan de travail. */
export const CLE_FUSION = `rangement:${ESPACE_COMMUN}:fusionne`;

/** Le préfixe des dossiers du plan de travail (voir `dossiers.ts`, PREFIXE_COULEUR). */
const PREFIXE_PLAN = "dossier:";

/**
 * Les réglages à écrire pour verser dans le plan de travail les dossiers du
 * bureau des ateliers — et ceux des anciens bureaux d'onglet, pour qui n'a
 * jamais ouvert le bureau commun. Rien si c'est déjà fait.
 *
 * Il n'y a désormais qu'un bureau dans l'application : un dossier « Maths »
 * du plan de travail et un dossier « Maths » des ateliers n'en font plus
 * qu'un, et c'est voulu. Un dossier déjà présent au plan de travail garde sa
 * couleur.
 */
export function fusionnerDansLePlanDeTravail(reglages: Record<string, string>): Record<string, string> {
  if (reglages[CLE_FUSION]) return {};
  const ecritures: Record<string, string> = {};
  for (const espace of [ESPACE_COMMUN, ...ANCIENS_ESPACES]) {
    const source = prefixeDossier(espace);
    for (const [cle, valeur] of Object.entries(reglages)) {
      if (!cle.startsWith(source) || !valeur) continue;
      const chemin = cle.slice(source.length);
      const nouvelle = PREFIXE_PLAN + chemin;
      if (chemin && !(nouvelle in reglages) && !(nouvelle in ecritures)) ecritures[nouvelle] = valeur;
    }
  }
  ecritures[CLE_FUSION] = "1";
  return ecritures;
}
