// Arborescence de dossiers du plan de travail.
//
// Les dossiers ne sont pas une table mais un **chemin** écrit sur chaque
// élément : « Français/Lecture ». C'est ce qui permet d'avoir un vrai arbre
// sans rien à créer, renommer ou supprimer en base — un dossier existe tant
// que quelque chose s'y trouve, et disparaît quand on le vide.
//
// Un dossier créé à la main existe pourtant avant d'avoir un contenu : il est
// noté dans les réglages, sous la même clé que sa couleur (voir SANS_COULEUR).
// On ne dépose plus un « Nouveau matériel » vide pour le faire tenir.

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
export function sousDossiers(elements: Rangeable[], courant: string, crees: Iterable<string> = []): SousDossier[] {
  const prefixe = courant ? courant + SEPARATEUR : "";
  const totaux = new Map<string, number>();
  // Les dossiers créés à la main paraissent même vides.
  for (const c of crees) {
    const chemin = normaliser(c);
    if (!chemin || !chemin.startsWith(prefixe) || chemin === courant) continue;
    const complet = prefixe + chemin.slice(prefixe.length).split(SEPARATEUR)[0];
    if (!totaux.has(complet)) totaux.set(complet, 0);
  }
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
export function filDAriane(chemin: string, racine = "Bureau"): { chemin: string; nom: string }[] {
  const fil = [{ chemin: "", nom: racine }];
  let courant = "";
  for (const segment of normaliser(chemin).split(SEPARATEUR).filter(Boolean)) {
    courant = courant ? `${courant}${SEPARATEUR}${segment}` : segment;
    fil.push({ chemin: courant, nom: segment });
  }
  return fil;
}

/**
 * Où arrive le dossier `chemin` lâché dans `vers`, ou `null` s'il ne bouge pas.
 *
 * Deux refus : le lâcher là où il est déjà, et le lâcher dans lui-même ou
 * l'un de ses descendants — ce qui le détacherait de l'arbre.
 */
export function destinationDossier(chemin: string, vers: string): string | null {
  const cible = normaliser(vers);
  const nom = chemin.slice(chemin.lastIndexOf(SEPARATEUR) + 1);
  const arrivee = normaliser(cible ? cible + SEPARATEUR + nom : nom);
  if (!chemin || arrivee === chemin) return null;
  if (cible && estDans(cible, chemin)) return null;
  return arrivee;
}

/** Préfixe des réglages qui gardent la couleur d'un dossier. */
export const PREFIXE_COULEUR = "dossier:";

/**
 * Valeur du réglage d'un dossier qui existe sans couleur.
 *
 * La clé d'un dossier dit qu'il existe ; sa valeur, sa couleur. Un dossier
 * créé à la main, ou dont on a retiré la couleur, garde ainsi sa place même
 * vide — et suit, comme une couleur, les renommages et les déplacements.
 */
export const SANS_COULEUR = "aucune";

/** La couleur à peindre, ou rien. */
export const couleurDe = (valeur: string | undefined) => (valeur && valeur !== SANS_COULEUR ? valeur : undefined);

/** Ce que doit contenir un matériel pour être autre chose qu'un matériel vide. */
export interface MaterielRangeable extends Rangeable {
  titre: string; descriptionMateriel: string; competenceId: string;
  imagesJson: string; pdfsJson: string; videosJson: string; coffreJson: string;
  seanceId: string | null; sequenceId: string | null;
}

const vide = (json: string) => { try { return !(JSON.parse(json || "[]") as unknown[]).length; } catch { return !json; } };

/**
 * Les « Nouveau matériel » vides qu'une création de dossier déposait pour que
 * le dossier tienne : seuls dans leur dossier, jamais remplis.
 *
 * On les retire en gardant le dossier (voir SANS_COULEUR). Un matériel vide
 * posé à côté d'autres éléments reste : celui-là, on l'a peut-être voulu.
 */
export function materielsDeCreationDeDossier(materiels: MaterielRangeable[], elements: Rangeable[]): MaterielRangeable[] {
  return materiels.filter((m) => {
    const chemin = normaliser(m.dossier);
    return chemin && m.titre === "Nouveau matériel" && !m.descriptionMateriel.trim() && !m.competenceId
      && vide(m.imagesJson) && vide(m.pdfsJson) && vide(m.videosJson) && vide(m.coffreJson)
      && !m.seanceId && !m.sequenceId
      && !elements.some((e) => e.id !== m.id && normaliser(e.dossier) === chemin);
  });
}

/**
 * Les couleurs à réécrire quand `ancien` devient `nouveau`.
 *
 * Un dossier n'existe que par ses chemins : sa couleur, rangée sous son
 * chemin, doit le suivre — sous-dossiers compris — sinon renommer ou déplacer
 * un dossier lui ferait perdre sa couleur. Rend les écritures à faire : les
 * nouvelles clés, et les anciennes vidées.
 */
export function reporterCouleurs(
  couleurs: Record<string, string>, ancien: string, nouveau: string, prefixe = PREFIXE_COULEUR,
): Record<string, string> {
  const ecritures: Record<string, string> = {};
  for (const [chemin, couleur] of Object.entries(couleurs)) {
    if (!couleur || !estDans(chemin, ancien)) continue;
    const arrivee = renommerChemin(chemin, ancien, nouveau);
    if (arrivee === chemin) continue;
    ecritures[prefixe + chemin] = ecritures[prefixe + chemin] ?? "";
    ecritures[prefixe + arrivee] = couleur;
  }
  return ecritures;
}

/** Les couleurs des dossiers, lues dans l'ensemble des réglages. */
export function lireCouleurs(reglages: Record<string, string>, prefixe = PREFIXE_COULEUR): Record<string, string> {
  const couleurs: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(reglages)) {
    if (cle.startsWith(prefixe) && valeur) couleurs[cle.slice(prefixe.length)] = valeur;
  }
  return couleurs;
}
