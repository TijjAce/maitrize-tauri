// Arborescence de dossiers du plan de travail.
//
// Les dossiers ne sont pas une table mais un **chemin** écrit sur chaque
// élément : « Français/Lecture ». C'est ce qui permet d'avoir un vrai arbre
// sans rien à créer, renommer ou supprimer en base — un dossier existe tant
// que quelque chose s'y trouve, et disparaît quand on le vide.
//
// La contrepartie est qu'un dossier vide ne se garde pas. C'est assumé : sur
// un bureau, un dossier vide qu'on a oublié de remplir est du bruit.

/** Un élément rangeable : séquence ou matériel. */
export interface Rangeable {
  id: string;
  dossier: string;
}

export interface Noeud {
  /** Chemin complet : « Français/Lecture ». */
  chemin: string;
  /** Dernier segment : « Lecture ». */
  nom: string;
  profondeur: number;
  enfants: Noeud[];
  /** Éléments directement dedans. */
  directs: number;
  /** Éléments dedans et dans les sous-dossiers. */
  total: number;
}

export const SEPARATEUR = "/";

/** Nettoie un chemin saisi : segments vides retirés, espaces resserrés. */
export function normaliser(chemin: string): string {
  return chemin
    .split(SEPARATEUR)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(SEPARATEUR);
}

/** Le dossier parent d'un chemin, ou "" à la racine. */
export function parent(chemin: string): string {
  const i = chemin.lastIndexOf(SEPARATEUR);
  return i < 0 ? "" : chemin.slice(0, i);
}

/** Vrai si `chemin` est `sous` lui-même ou l'un de ses descendants. */
export function estDans(chemin: string, sous: string): boolean {
  if (!sous) return true; // la racine contient tout
  return chemin === sous || chemin.startsWith(sous + SEPARATEUR);
}

/**
 * Construit l'arbre à partir des chemins réellement employés.
 *
 * Les dossiers intermédiaires sont créés même si rien ne s'y trouve
 * directement : ranger dans « Français/Lecture » doit faire apparaître
 * « Français », sinon l'arbre a des trous et le chemin devient inatteignable.
 */
export function arbre(elements: Rangeable[]): Noeud[] {
  const par = new Map<string, Noeud>();
  const assurer = (chemin: string): Noeud => {
    const existant = par.get(chemin);
    if (existant) return existant;
    const n: Noeud = {
      chemin,
      nom: chemin.slice(chemin.lastIndexOf(SEPARATEUR) + 1),
      profondeur: chemin.split(SEPARATEUR).length - 1,
      enfants: [],
      directs: 0,
      total: 0,
    };
    par.set(chemin, n);
    const p = parent(chemin);
    if (p) assurer(p).enfants.push(n);
    return n;
  };

  for (const e of elements) {
    const chemin = normaliser(e.dossier);
    if (!chemin) continue;
    assurer(chemin).directs++;
    // Le total remonte jusqu'à la racine : un dossier replié doit dire
    // combien il contient, sinon il faut l'ouvrir pour le savoir.
    let courant: string | "" = chemin;
    while (courant) {
      assurer(courant).total++;
      courant = parent(courant);
    }
  }

  const trier = (l: Noeud[]) => {
    l.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    l.forEach((n) => trier(n.enfants));
  };
  const racines = [...par.values()].filter((n) => !parent(n.chemin));
  trier(racines);
  return racines;
}

/** Aplati l'arbre en respectant les dossiers dépliés. */
export function aplatir(racines: Noeud[], ouverts: Set<string>): Noeud[] {
  const sortie: Noeud[] = [];
  const descendre = (l: Noeud[]) => {
    for (const n of l) {
      sortie.push(n);
      if (ouverts.has(n.chemin)) descendre(n.enfants);
    }
  };
  descendre(racines);
  return sortie;
}

/**
 * Nouveau chemin d'un dossier renommé, et de ses descendants.
 *
 * Renommer « Français » doit emmener « Français/Lecture » avec lui : sans
 * cela, les sous-dossiers se retrouveraient orphelins à la racine.
 */
export function renommerChemin(chemin: string, ancien: string, nouveau: string): string {
  if (!estDans(chemin, ancien)) return chemin;
  const reste = chemin.slice(ancien.length);
  return normaliser(nouveau + reste);
}

/**
 * Empêche de déplacer un dossier dans l'un de ses propres descendants.
 *
 * « Français » glissé dans « Français/Lecture » produirait un chemin qui se
 * contient lui-même : le dossier disparaîtrait de l'arbre.
 */
export function deplacementValide(source: string, cible: string): boolean {
  if (!source) return false;
  if (source === cible) return false;
  if (estDans(cible, source)) return false;
  return parent(source) !== cible || false;
}
