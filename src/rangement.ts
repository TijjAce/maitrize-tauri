// Ranger le bureau : dans quel ordre les icônes se posent.
//
// Le bureau garde la disposition qu'on lui donne à la main (voir
// disposition.ts). « Ranger » l'oublie et pose les icônes dans un ordre : par
// nom, les plus récentes d'abord, par nombre d'éléments, ou par type. L'ordre
// choisi se garde pour chaque dossier — ce qui s'ajoute ensuite se range à sa
// place, comme dans le Finder —, jusqu'à ce qu'on déplace une icône à la main.
//
// Les dossiers restent devant, quel que soit l'ordre : on les cherche d'abord.

import { lireCouleurs } from "./dossiers";

export type ModeRangement = "nom" | "recent" | "nombre" | "type";

export const MODES_RANGEMENT: { id: ModeRangement; ico: string; label: string }[] = [
  { id: "nom", ico: "🔤", label: "Par nom" },
  { id: "recent", ico: "🕒", label: "Les plus récents d'abord" },
  { id: "nombre", ico: "🔢", label: "Par nombre d'éléments" },
  { id: "type", ico: "🧩", label: "Par type" },
];

/**
 * L'ordre d'un dossier se garde dans « ordre:<chemin> » (le bureau lui-même :
 * « ordre: »). Pas « rangement: » : les anciens bureaux des ateliers et des
 * jeux s'en servent encore pour leurs couleurs et leurs dispositions.
 */
export const PREFIXE_RANGEMENT = "ordre:";

const MODES = new Set<string>(MODES_RANGEMENT.map((m) => m.id));

/** L'ordre de chaque dossier, lu dans l'ensemble des réglages ; un dossier absent se range par nom. */
export function lireRangements(reglages: Record<string, string>): Record<string, ModeRangement> {
  const res: Record<string, ModeRangement> = {};
  for (const [chemin, mode] of Object.entries(lireCouleurs(reglages, PREFIXE_RANGEMENT))) {
    if (MODES.has(mode)) res[chemin] = mode as ModeRangement;
  }
  return res;
}

/** Ce qu'il faut savoir d'une icône pour la ranger. */
export interface Icone {
  cle: string;
  nom: string;
  dossier: boolean;
  /** Sa dernière modification ; pour un dossier, la plus récente de ce qu'il contient. */
  date: string;
  /** Ce qu'un dossier contient, sous-dossiers compris. */
  total: number;
  /** Le rang de son genre quand on range par type : séquences, matériel, textes… */
  rangDuGenre: number;
}

const instant = (date: string) => {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
};

const parNom = (a: Icone, b: Icone) => a.nom.localeCompare(b.nom, "fr", { numeric: true });

/** Les clés des icônes, dans l'ordre où elles se posent. */
export function ordonner(icones: Icone[], mode: ModeRangement): string[] {
  const comparer = (a: Icone, b: Icone): number => {
    if (a.dossier !== b.dossier) return a.dossier ? -1 : 1;
    switch (mode) {
      case "recent": return instant(b.date) - instant(a.date) || parNom(a, b);
      case "nombre": return b.total - a.total || parNom(a, b);
      case "type": return a.rangDuGenre - b.rangDuGenre || parNom(a, b);
      default: return parNom(a, b);
    }
  };
  return [...icones].sort(comparer).map((i) => i.cle);
}
