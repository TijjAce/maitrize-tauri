import { MATIERES } from "./api";
import type { Lexique } from "./caa";

// ── Les matières et les domaines, en pictos ───────────────────────────────
//
// Ceux du planning — les matières de l'élémentaire, les domaines de la
// maternelle, et les moments de la journée (accueil, récréation, temps
// calme) —, chacun avec le picto que la classe connaît : de quoi faire un
// emploi du temps en images, ou dire ce qui vient. Ils se choisissent comme
// ceux des verbes et s'impriment avec eux, en cartes à découper.

/** Ce qui reçoit un picto : tout le planning, sauf « Autre ». */
export const MATIERES_EN_PICTOS: string[] = MATIERES.filter((m) => m !== "Autre");

/**
 * Les mots sous lesquels ARASAAC range chaque matière, dans l'ordre où l'on
 * préfère : le picto de la matière d'abord (« mathématiques », « EPS »),
 * puis ce qui s'y fait (« compter », « chanter »).
 */
export const MOTS_DES_MATIERES: Record<string, string[]> = {
  "Français": ["français", "langage", "lire"],
  "Mathématiques": ["mathématiques", "maths", "compter"],
  "Questionner le monde": ["sciences de la nature", "monde"],
  // « histoire » tout court, c'est aussi le livre de contes : le cours d'histoire montre le globe.
  "Histoire-Géographie": ["cours d'histoire", "sciences sociales", "carte"],
  "Sciences et techno.": ["sciences naturelles", "technologie", "expérience"],
  "EMC": ["éducation morale et civique"],
  "Arts plastiques": ["éducation plastique et visuelle", "arts plastiques", "peindre"],
  "Éducation musicale": ["cours de musique", "musique", "chanter"],
  "EPS": ["éducation physique et sportive", "eps", "sport"],
  "LVE / Anglais": ["anglais", "cours de langues"],
  "Mobiliser le langage": ["langage", "parler"],
  "Activité physique": ["psychomotricité", "activité physique", "sport"],
  "Activités artistiques": ["éducation artistique", "dessin", "peindre"],
  "Structurer sa pensée": ["compter", "nombre", "mathématiques"],
  "Explorer le monde": ["monde", "sciences de la nature"],
  // L'« accueil » d'ARASAAC, ce sont des clés et des maisons : on dit bonjour.
  "Accueil": ["bonjour"],
  "Rituel": ["calendrier"],
  "Récréation": ["récréation", "cour de récréation"],
  "Pause méridienne": ["cantine", "déjeuner", "repas"],
  // « aide » montre quelqu'un en détresse ; « appui », deux mains qui se tendent.
  "APC": ["appui", "aide"],
  "Temps calme": ["se reposer", "calme", "repos"],
};

export const motsDeLaMatiere = (matiere: string): string[] => MOTS_DES_MATIERES[matiere] ?? [matiere.toLowerCase()];

/**
 * Le picto proposé à chaque matière : celui du premier de ses mots
 * qu'ARASAAC connaît. Pas de préférence pour les dessins « de la classe »,
 * comme pour les verbes : elle ferait passer « compter » devant le picto des
 * mathématiques.
 */
export function pictosDesMatieresProposes(matieres: string[], trouves: { id: number; mot: string }[]): Record<string, number> {
  const parMot = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const sortie: Record<string, number> = {};
  for (const m of matieres) {
    const id = motsDeLaMatiere(m).map((mot) => parMot.get(mot.toLowerCase())).find((x) => x !== undefined);
    if (id !== undefined) sortie[m] = id;
  }
  return sortie;
}

/** Le lexique des matières, dans un réglage à lui : partagé entre les ordinateurs, comme celui des verbes. */
export const CLE_MATIERES = "caa:matieres";

/** Ce qu'on écrit sous le picto : le nom du planning, sans ses abréviations. */
const ETIQUETTES: Record<string, string> = { "LVE / Anglais": "Anglais", "Sciences et techno.": "Sciences et technologie" };
export const etiquetteDeMatiere = (matiere: string) => ETIQUETTES[matiere] ?? matiere;

/** Les matières qui ont un picto, dans l'ordre du planning. */
export const matieresAvecPicto = (lexique: Lexique): string[] => MATIERES_EN_PICTOS.filter((m) => lexique[m] != null);
