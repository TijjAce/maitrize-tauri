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


/** Un sous-dossier visible depuis un dossier courant. */
export interface SousDossier {
  chemin: string;
  nom: string;
  /** Éléments dedans, sous-dossiers compris. */
  total: number;
}

/**
 * Les sous-dossiers directement sous `courant`.
 *
 * Un bureau ne montre pas l'arbre entier : il montre ce qui est ici, et l'on
 * entre. « Français/Lecture/Sons » vu depuis la racine n'est donc que
 * « Français » — mais il compte les trois niveaux dans son total, sinon un
 * dossier plein paraîtrait vide.
 */
export function sousDossiers(elements: Rangeable[], courant: string): SousDossier[] {
  const prefixe = courant ? courant + SEPARATEUR : "";
  const totaux = new Map<string, number>();
  for (const e of elements) {
    const chemin = normaliser(e.dossier);
    if (!chemin || !chemin.startsWith(prefixe) || chemin === courant) continue;
    const reste = chemin.slice(prefixe.length);
    if (!reste) continue;
    const premier = reste.split(SEPARATEUR)[0];
    const complet = prefixe + premier;
    totaux.set(complet, (totaux.get(complet) ?? 0) + 1);
  }
  return [...totaux.entries()]
    .map(([chemin, total]) => ({ chemin, nom: chemin.slice(chemin.lastIndexOf(SEPARATEUR) + 1), total }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Le fil d'Ariane d'un chemin : chaque ancêtre, racine comprise. */
export function filDAriane(chemin: string): { chemin: string; nom: string }[] {
  const fil = [{ chemin: "", nom: "Bureau" }];
  let courant = "";
  for (const segment of normaliser(chemin).split(SEPARATEUR).filter(Boolean)) {
    courant = courant ? `${courant}${SEPARATEUR}${segment}` : segment;
    fil.push({ chemin: courant, nom: segment });
  }
  return fil;
}
