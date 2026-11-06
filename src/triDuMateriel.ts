// ── Trier son matériel en balayant ────────────────────────────────────────
//
// « Il faudrait pouvoir avoir une sorte de Tinder, swipe right and left, du
// matériel » (l'enseignant, 6 novembre 2026, pour la première connexion). Le
// catalogue du matériel de la classe passe carte par carte : à droite, je l'ai ;
// à gauche, je ne l'ai pas. C'est l'inventaire que les séances relisent —
// « à sortir », ou « à se procurer » (voir materielDeClasse.ts) —, rempli d'un
// geste au lieu d'une liste à cocher.

import { FAMILLES_MATERIEL, MATERIEL_REEL, type FamilleMateriel, type Inventaire, type MaterielReel } from "./materielDeClasse";

/**
 * Le matériel sans photographie montre un picto d'ARASAAC, choisi à l'œil (les photos de Commons ne montraient pas le
 * bon objet, voir photosMateriel.ts) ; les pictos viennent d'être installés, juste avant cette étape.
 */
export const PICTOS_DU_MATERIEL: Record<string, number> = {
  abaque: 36389, monnaie: 4630, calendrier: 3071, circuit: 25954, globe: 27798,
  transvasement: 39073, pinces: 6178, fermetures: 6957, enfilage: 5454, decoupage: 2591,
  toucher: 3293, sonsOdeurs: 2486, couleurs: 5968, taillesGigognes: 36379, formesModeles: 39129,
  blocsLogiques: 38110, collectionsPinces: 8466, tracerDoigt: 15475, lettresMobiles: 3050,
  marionnettesDoigts: 3282, imagesSons: 27659, dessinsGuides: 37872,
};

/** Si les pictos ont été remis à plus tard, faute de connexion. */
export const EMOJI_DE_LA_FAMILLE: Record<FamilleMateriel, string> = {
  nombres: "🔢", grandeurs: "⚖️", geometrie: "📐", temps: "⏳", sciences: "🔬", monde: "🌍", arts: "🎨", viePratique: "🫙", sens: "👐", ecrit: "✏️",
};

export const nomDeLaFamille = (f: FamilleMateriel): string => FAMILLES_MATERIEL.find((x) => x.id === f)?.libelle ?? "";

/** Les cartes à trier, famille par famille : celles dont on n'a encore rien dit. */
export function cartesATrier(inv: Inventaire): MaterielReel[] {
  const rang = (m: MaterielReel) => FAMILLES_MATERIEL.findIndex((f) => f.id === m.famille);
  return MATERIEL_REEL.filter((m) => !inv[m.id]).map((m, i) => ({ m, i })).sort((a, b) => rang(a.m) - rang(b.m) || a.i - b.i).map((x) => x.m);
}

/** Au-delà, la carte part ; en deçà, elle revient. */
export const SEUIL_DU_GESTE = 110;

/** Ce que veut dire un geste relâché : assez loin, ou plus court mais vif. */
export function sensDuGeste(dx: number, vitesse: number): "oui" | "non" | null {
  const loin = Math.abs(dx) > SEUIL_DU_GESTE || (Math.abs(dx) > 36 && vitesse > 0.5);
  return !loin ? null : dx > 0 ? "oui" : "non";
}

/** L'inventaire, une carte décidée : ce qu'on avait dit de son rangement reste. */
export const decider = (inv: Inventaire, id: string, a: boolean): Inventaire => ({ ...inv, [id]: { a, lieu: inv[id]?.lieu ?? "" } });

/** L'inventaire, une décision reprise : on n'a plus rien dit de cette carte. */
export function reprendre(inv: Inventaire, id: string): Inventaire {
  const suite = { ...inv };
  delete suite[id];
  return suite;
}

/** Combien la classe en a. */
export const dansLaClasse = (inv: Inventaire): number => MATERIEL_REEL.filter((m) => inv[m.id]?.a).length;
