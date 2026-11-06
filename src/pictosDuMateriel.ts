// ── Les pictos du matériel de la classe ───────────────────────────────────
//
// « Remplace les images du matériel par des images façon picto, c'est plus simple
// à visualiser ; si les pictos n'existent pas, crée-les » (l'enseignant, 6 novembre
// 2026, à la place des photographies). Chaque matériel réel a donc son picto :
//   — d'ARASAAC, regardé sur une planche : la banque est installée au premier
//     lancement ; tant qu'elle ne l'est pas, l'emoji de la famille tient la place ;
//   — dessiné pour Maitrize quand la banque n'a pas l'objet (src/assets/materiel) :
//     ni abaque triangulaire, ni poupées gigognes, ni robot de sol, ni boîte à odeurs.
//     Même esprit qu'elle : aplats francs, contour noir, sans cadre, jusqu'aux bords.

import type { FamilleMateriel } from "./materielDeClasse";

/** Le numéro du picto dans la banque ARASAAC. */
export const PICTOS_ARASAAC_DU_MATERIEL: Record<string, number> = {
  numeration: 4930, boulier: 23699, monnaie: 4630,
  balance: 4717, longueurs: 4675, regles: 2815, recipients: 32466, croissance: 33100,
  solides: 9109, construction: 4935, instrumentsTrace: 34065, formesModeles: 39129, blocsLogiques: 38110,
  horloge: 7229, durees: 11359, calendrier: 3071,
  thermometre: 37478, circuit: 25954, vivant: 38613, corps: 5727, aimants: 8138, objetsTechniques: 9172,
  globe: 27798, cartes: 5505,
  musique: 2616, matieres: 3283,
  transvasement: 39073, pinces: 6178, fermetures: 6957, enfilage: 5454, decoupage: 6664,
  toucher: 3293, couleurs: 5968,
  tracerDoigt: 39182, marionnettesDoigts: 38735, imagesSons: 11295,
};

const DESSINS = import.meta.glob<string>("./assets/materiel/*.svg", { eager: true, query: "?url", import: "default" });

/** Le dessin d'un matériel que la banque n'a pas ; rien s'il a son picto d'ARASAAC. */
export const dessinDuMateriel = (id: string): string | null => DESSINS[`./assets/materiel/${id}.svg`] ?? null;

/** Si les pictos ont été remis à plus tard, faute de connexion. */
export const EMOJI_DE_LA_FAMILLE: Record<FamilleMateriel, string> = {
  nombres: "🔢", grandeurs: "⚖️", geometrie: "📐", temps: "⏳", sciences: "🔬", monde: "🌍", arts: "🎨", viePratique: "🫙", sens: "👐", ecrit: "✏️",
};
