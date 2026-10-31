// ── D'où vient chaque atelier de Fabriquer ─────────────────────────────────
//
// L'enseignant l'a demandé (31 octobre 2026) : sous le « ? » du titre de
// chaque jeu, dire d'où il vient — « ça permet de voir que ça vient pas de
// n'importe où ». Éduscol et les programmes officiels d'abord ; sinon le
// manuel ou la méthode dont l'atelier vient vraiment ; quand rien ne
// l'appuie, « Source inconnue ». Chaque source se retrouve dans le code de
// l'atelier — l'en-tête de son module, les références de ses feuilles, la
// démarche qu'il sert — ou dans le texte officiel qu'elle cite. Le « ? » du
// titre l'ajoute de lui-même (voir components/Aide.tsx).
//
// Un atelier nouveau a son entrée ici : un test y veille.

export const SOURCE_INCONNUE = "Source inconnue";

const CRPE = "Manuel « Réussir mon CRPE » (Nathan)";
const GUIDE_MATERNELLE_LECTURE = "Guide « Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle » (Éduscol, 2020)";
const GUIDE_CP_NOMBRES = "guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021)";
const MATHS_C2 = "Programme de mathématiques du cycle 2 (2024)";
const MATHS_C3 = "Programme de mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025)";
const FRANCAIS_C2 = "Programme de français du cycle 2 (2024)";
const HG_C2 = "Programme d'histoire-géographie du cycle 2, BO n° 22 du 28 mai 2026 (annexe 3)";
const CAP_ECOLE = "Cap école inclusive (Réseau Canopé)";
const MEMORISER = "il sert ce que le programme de l'école maternelle (2025) demande pour le vocabulaire : « faire mémoriser par des activités dédiées ».";

/** La source de chaque atelier, par son identifiant (voir catalogueAteliers.ts). Les dossiers de séquences n'en ont pas : chaque séquence dit la sienne. */
export const SOURCES_DES_ATELIERS: Record<string, string> = {
  // ── Images, mots et langage ──
  perso: `${SOURCE_INCONNUE} : ce sont vos générateurs, écrits par l'IA d'après votre demande.`,
  jeux: `${SOURCE_INCONNUE} pour le jeu lui-même ; ${MEMORISER}`,
  memory: `${SOURCE_INCONNUE} pour le jeu lui-même ; ${MEMORISER}`,
  imagier: "Programme de l'école maternelle (2025), qui s'en sert : « un imagier composé de paires distinctives » pour bien prononcer, "
    + "« un imagier bilingue » pour l'éveil à la diversité des langues.",
  categoriser: "Fiche Éduscol « Catégoriser : de la catégorisation d'objets à la catégorisation de mots » (octobre 2023) et guide « Pour enseigner "
    + "le vocabulaire à l'école maternelle » (Éduscol) ; programme de l'école maternelle (2025), « Organiser les mots en catégorie et en réseau ».",
  suites: "Programme de l'école maternelle (2025), « S'approprier la notion de chronologie » ; indicateurs de progrès d'Éduscol « Se repérer dans le "
    + "temps et l'espace » (2016).",
  vilainPetitCanard: "Guide « Pour enseigner le vocabulaire à l'école maternelle » (Éduscol, 2020), p. 71-76 : la séquence en moyenne et grande "
    + "sections à partir d'un conte traditionnel.",
  etiquettes: "Livrets d'accompagnement de français CP (2025) et CE1 (2026), Éduscol : la séquence « vocabulaire » et ses étiquettes à classer.",
  ombres: `${SOURCE_INCONNUE}.`,
  oeilDeLynx: `${SOURCE_INCONNUE}.`,
  carteMentale: `${SOURCE_INCONNUE}.`,
  taches: `${SOURCE_INCONNUE}.`,

  // ── Sons et lecture ──
  sons: `${SOURCE_INCONNUE} pour la fiche ; l'ordre des sons est celui des méthodes syllabiques Pilotis et Lecture Piano.`,
  lotoSyllabes: `${GUIDE_MATERNELLE_LECTURE}, qui nomme le loto des syllabes.`,
  dominos: `${GUIDE_MATERNELLE_LECTURE}, qui nomme le domino des syllabes.`,
  intrus: `${GUIDE_MATERNELLE_LECTURE}, qui nomme la chasse à l'intrus.`,
  paires: "Livret d'accompagnement « À partir de 5 ans » (Éduscol, 2025) — le jeu du trésor et le jeu du téléphone — ; programme de l'école "
    + "maternelle (2025) : « un imagier composé de paires distinctives ».",
  fluence: "Livrets d'accompagnement de français CP (2025) et CE1 (2026), Éduscol : la grille lue chaque jour, chronométrée ; la progression des guides "
    + "« Pour enseigner la lecture et l'écriture au CP » (2018) et « au CE1 » (2019).",
  voixHaute: "Livrets d'accompagnement de français CP (2025), CE1 (2026) et CE2, Éduscol, focus « Fluence et lecture à voix haute ».",
  syllabaire: "Livrets d'accompagnement de français CP (2025) et CE1 (2026), Éduscol : le syllabaire et le jeu de l'ascenseur, pour s'entraîner en autonomie.",
  lettres: "Livret d'accompagnement de français CP (Éduscol, 2025) : le loto, le mémory et le mistigri des lettres, le jeu de l'ophtalmologue.",
  gestes: "La méthode des gestes Borel-Maisonny, qui associe un geste à chaque son ; aucun texte officiel. Les images des gestes sont les vôtres.",
  motsGestes: "La méthode des gestes Borel-Maisonny, qui associe un geste à chaque son ; aucun texte officiel. Les images des gestes sont les vôtres.",
  syllabeManquante: `${SOURCE_INCONNUE} — sur le modèle des fichiers de lecture.`,

  // ── Lecture et écriture ──
  comprehension: `${FRANCAIS_C2}, « Comprendre un texte » : la longueur des textes, les questions, le retour au texte. Les textes sont écrits pour Maitrize.`,
  lecteur: `${FRANCAIS_C2}, « Devenir lecteur » : le carnet de lecteur, les personnages, la mise en réseau.`,
  orthographe: "Guides « Pour enseigner la lecture et l'écriture au CP » (Éduscol, 2018), p. 85-86, et « au CE1 » (2019), p. 97-106 : les dictées ; "
    + `${FRANCAIS_C2.charAt(0).toLowerCase()}${FRANCAIS_C2.slice(1)}.`,
  ecrire: `${FRANCAIS_C2}, « Produire des écrits » ; guide « Pour enseigner la lecture et l'écriture au CE1 » (Éduscol, 2019), « La rédaction », p. 77-89.`,
  grammaire: `${FRANCAIS_C2}, étude de la langue ; guide « Pour enseigner la lecture et l'écriture au CE1 » (Éduscol, 2019), p. 95-97.`,
  oral: `${FRANCAIS_C2}, « Oral » ; Éduscol, « Organiser l'enseignement de l'oral » ; guide « Pour enseigner la lecture et l'écriture au CP » `
    + "(Éduscol, 2018), p. 52-53 et 105.",
  tri: "Trier pour apprendre une notion, comme la leçon de grammaire du guide « Pour enseigner la lecture et l'écriture au CE1 » (Éduscol, 2019), "
    + "p. 95-97, qui part d'un corpus qu'on classe.",
  phrases: `${FRANCAIS_C2}, « Produire des écrits » : au CP, composer des phrases avec des étiquettes.`,
  trous: `${SOURCE_INCONNUE}.`,
  motsMeles: `${SOURCE_INCONNUE}.`,
  cursive: "Livret d'accompagnement de français CP (Éduscol, 2025), séquence n° 2 « Apprendre à écrire en écriture cursive » : les réglures de 3, "
    + "2,5 puis 2 mm.",

  // ── Calcul et problèmes ──
  martiniere: "Programmes de mathématiques du cycle 2 (2024) et du cycle 3 (2025) : les objectifs de calcul mental, classe par classe ; à l'oral, le "
    + "procédé La Martinière.",
  compteEstBon: "Le jeu télévisé « Le compte est bon » ; aucun texte officiel.",
  pyramides: `${SOURCE_INCONNUE}.`,
  partieTout: `${MATHS_C2} : « résoudre des problèmes additifs en une étape de type parties-tout » ; le schéma en barres de la séquence du livret `
    + "d'accompagnement de mathématiques CE1 (Éduscol, 2025).",
  multiplicatifs: `${MATHS_C2} : « résoudre des problèmes multiplicatifs de type parties-tout en une étape ».`,
  problemesAides: `${CRPE}, sujet n° 13 : la séquence des problèmes additifs du CE1.`,
  problemesCM: `${MATHS_C3}.`,
  coloriage: `${SOURCE_INCONNUE}.`,
  collections: "Guide « La construction du nombre à l'école maternelle » (Éduscol, 2023) et livrets d'accompagnement « Avant 4 ans » et « À partir de "
    + "4 ans » (Éduscol, 2025) ; programme de l'école maternelle (2025).",
  albumCalcul: `${CRPE}, sujet n° 6, « Décomposition additive GS », p. 116-118.`,
  problemeDuJour: "Programme de l'école maternelle (2025), « Utiliser les nombres pour résoudre des problèmes » ; livrets d'accompagnement « Avant 4 "
    + "ans », « À partir de 4 ans » et « À partir de 5 ans » (Éduscol, 2025) ; guide « La construction du nombre à l'école maternelle » (Éduscol, 2023).",
  motifs: "Livrets d'accompagnement de mathématiques de la maternelle (Éduscol, 2025), séquence 1 « Se familiariser avec les motifs organisés ».",
  tangram: `${CRPE}, sujet n° 5, « Formes et grandeurs GS », p. 104-106 ; les figures sont de Maitrize.`,

  // ── Nombres ──
  nombres: "Livret d'accompagnement de mathématiques CP (Éduscol, 2025) : passer d'une représentation du nombre à une autre.",
  cubes: `${MATHS_C2} — « Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre » — et ${GUIDE_CP_NOMBRES}.`,
  billes: `${CRPE}, oral 2025-2026 : la séance 4 de la séquence « La connaissance des nombres de 10 à 20 », étendue jusqu'à 100 comme le prévoit le `
    + "programme du CP.",
  abaque: `${CRPE}, oral 2025-2026 : la séance 4 de la séquence « La connaissance des nombres de 10 à 20 ».`,
  suiteNombres: `${CRPE}, oral 2025-2026 : la frise de la séance 4 de « La connaissance des nombres de 10 à 20 », étendue jusqu'à 100.`,
  demiDroite: `${MATHS_C2}, exemples de réussite : la demi-droite graduée.`,
  ordinaux: `${MATHS_C2}, exemples de réussite : les nombres ordinaux.`,
  comparer: `Programme de l'école maternelle (2025) et ${MATHS_C2.charAt(0).toLowerCase()}${MATHS_C2.slice(1)} ; ${GUIDE_CP_NOMBRES} ; au cours moyen, `
    + "le programme du cycle 3.",
  numeration: `${SOURCE_INCONNUE} pour les exercices, ceux que les manuels répètent ; les nombres suivent le programme de mathématiques du cycle 3.`,

  // ── Opérations ──
  calcul: "Livrets d'accompagnement de mathématiques CE1 et CE2 (Éduscol, 2025) : les cartes pour mémoriser les tables, recto-verso pour se tester.",
  arbre: "Livret d'accompagnement de mathématiques CP (Éduscol, 2025) : l'arbre à calcul pour ajouter deux nombres.",
  posees: `${MATHS_C2} et ${GUIDE_CP_NOMBRES}.`,
  rectangles: `${CRPE}, sujet n° 3, « Multiplication CE2 ».`,
  calculCM: `Programme de mathématiques du cycle 3 (2025), « Les quatre opérations » ; avant la potence, la séquence de la division du ${CRPE.charAt(0).toLowerCase()}${CRPE.slice(1)}.`,
  soustractionPosee: "Éduscol — fiches d'intervention des évaluations de début de CE2 (2026) et de CM1, fiches CE1 de mai 2020 — et programme de "
    + "mathématiques du cycle 2 (2024).",
  fractions: "Livrets d'accompagnement de mathématiques CE1 et CE2 (Éduscol, 2025) : le mémory et la bataille des fractions, la bande unité qu'on plie, "
    + "la règle graduée, la course des nageurs.",
  oie: "Programme de l'école maternelle (2025) : « des jeux de plateau comme le jeu de l'oie » ; livret « Résolution de problèmes » (Éduscol, 2025) : "
    + "la piste du type jeu de l'oie.",

  // ── Grandeurs, espace, données ──
  heure: `${MATHS_C2} — lire l'heure, les durées — et programme de mathématiques du cycle 3 (2025) pour les durées.`,
  monnaie: `${MATHS_C2} ; ${GUIDE_CP_NOMBRES}, l'exemple de la monnaie.`,
  mesures: `${MATHS_C2} ; Éduscol, « Grandeurs et mesures au cycle 2 » (ressources 2016).`,
  grandeursCM: `${MATHS_C3} ; pour les aires, la séquence du ${CRPE.charAt(0).toLowerCase()}${CRPE.slice(1)}.`,
  geometrie: `${MATHS_C2} ; Éduscol, « Espace et géométrie au cycle 2 » (document d'accompagnement, 2002).`,
  solides: `${MATHS_C2} ; Éduscol, « Espace et géométrie au cycle 2 » (document d'accompagnement, 2002).`,
  deplacements: `${MATHS_C2} ; Éduscol, « Initiation à la programmation aux cycles 2 et 3 » (2016) — « La fusée », « La tournée du facteur » — et `
    + "« Espace et géométrie au cycle 2 » (2002).",
  geometrieCM: `${MATHS_C3} ; le programme de construction de la séquence du ${CRPE.charAt(0).toLowerCase()}${CRPE.slice(1)}.`,
  donnees: `${MATHS_C2} : l'enquête, le relevé, le tableau, le diagramme en barres.`,

  // ── Histoire-géographie ──
  planClasse: "Éduscol, ressources 2016 — Questionner le monde, cycle 2 : la séquence « La classe, un espace organisé qui se représente » (CP).",
  frise: `${HG_C2} : la frise, « un instrument de repérage et de compréhension du temps long ».`,
  paysage: `${HG_C2} ; les photographies viennent de Wikimedia Commons, sous licence libre.`,

  // ── Aides à la tâche ──
  sequentiel: `${CAP_ECOLE}, fiches « Décomposition et séquentialisation de la tâche » et « Décomposer une tâche ».`,
  priseDeParole: `${CAP_ECOLE}, fiche « Organiser la prise de parole à l'oral ».`,
  codePhrase: "Programmes du cycle 2 (2024) et du cycle 3 (2025) ; « Terminologie grammaticale » (Éduscol, 2020) et guide « La grammaire du français "
    + "du CP à la 6e » (Éduscol, 2022). Éduscol ne fixe aucune couleur.",
  codeLecture: "Livrets d'accompagnement de français CP (2025) et CE1 (2026), Éduscol, focus « Fluence et lecture à voix haute » ; ils ne fixent ni "
    + "signe ni couleur.",
  resolution: `${CAP_ECOLE}, fiche « S'engager dans une démarche de résolution de problème, mise en équation et résolution ».`,
  modelisation: `${CAP_ECOLE}, fiche « Aider à la modélisation mathématique ».`,
  fonction: `${CAP_ECOLE}, fiche « Modéliser par une fonction une situation mathématique ».`,
};

/**
 * La ligne qui dit d'où vient l'atelier : « Source : … », ou « Source inconnue… » ; rien pour ce qui n'est pas un atelier
 * — un dossier de séquences, dont chaque séquence dit la sienne.
 */
export function sourceDeLAtelier(id: string): string | null {
  const s = SOURCES_DES_ATELIERS[id];
  if (!s) return null;
  return s.startsWith(SOURCE_INCONNUE) ? s : `Source : ${s}`;
}
