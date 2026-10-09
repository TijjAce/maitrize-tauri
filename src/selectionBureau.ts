// Plusieurs éléments du bureau à la fois, comme sur un vrai bureau.
//
// Un clic choisit un élément ; ⌘ ou ⇧ en ajoute ou en retire un ; un
// rectangle tiré à la souris sur le fond du bureau prend tout ce qu'il
// touche ; ⌘A prend tout. Ce qu'on a choisi se glisse d'un bloc — dans un
// dossier, sur le fil d'Ariane, sur le bureau commun, ou ailleurs sur le
// bureau, où les éléments gardent leurs places les uns par rapport aux
// autres —, se range ou se supprime en une fois.

/** Le type de glisser d'une sélection : ses éléments et ses dossiers, à côté du type de l'élément saisi. */
export const TYPE_SELECTION = "application/x-maitrize-selection";

export interface SelectionGlissee {
  elements: { genre: string; id: string; titre: string }[];
  /** Les chemins des dossiers. */
  dossiers: string[];
}

/** La sélection glissée, ou rien si l'on ne glisse qu'un élément. */
export function lireSelectionGlissee(dt: Pick<DataTransfer, "getData">): SelectionGlissee | null {
  try {
    const v: unknown = JSON.parse(dt.getData(TYPE_SELECTION) || "null");
    if (!v || typeof v !== "object") return null;
    const { elements, dossiers } = v as Record<string, unknown>;
    if (!Array.isArray(elements) || !Array.isArray(dossiers)) return null;
    return {
      elements: elements.filter((e): e is SelectionGlissee["elements"][number] =>
        Boolean(e) && typeof e.genre === "string" && typeof e.id === "string" && typeof e.titre === "string"),
      dossiers: dossiers.filter((d): d is string => typeof d === "string" && d !== ""),
    };
  } catch {
    return null;
  }
}

/** La sélection après un clic avec ⌘ ou ⇧ : l'élément y entre, ou en sort. */
export function basculer(selection: ReadonlySet<string>, cle: string): Set<string> {
  const suite = new Set(selection);
  if (suite.has(cle)) suite.delete(cle); else suite.add(cle);
  return suite;
}

export interface Boite { gauche: number; haut: number; droite: number; bas: number }

/** Le rectangle tiré à la souris, quel que soit le sens où on l'a tiré. */
export const rectangle = (x0: number, y0: number, x1: number, y1: number): Boite =>
  ({ gauche: Math.min(x0, x1), haut: Math.min(y0, y1), droite: Math.max(x0, x1), bas: Math.max(y0, y1) });

/** Ce que touche le rectangle : chaque tuile qu'il recouvre, même en partie. */
export function touchees(r: Boite, tuiles: { cle: string; boite: Boite }[]): string[] {
  return tuiles
    .filter(({ boite: b }) => b.gauche < r.droite && b.droite > r.gauche && b.haut < r.bas && b.bas > r.haut)
    .map((t) => t.cle);
}
