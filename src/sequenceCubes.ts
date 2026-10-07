// Les feuilles de cubes des séquences de numération, et ce que l'atelier
// travaille, classe par classe.
//
// La séquence se crée depuis sa compétence (voir feuillesDesSequences.ts) :
// la démarche « numeration-dizaine-cp » suit le guide CP — le jeu de la
// dizaine, la barre de dix, l'écriture chiffrée, les collections à
// regrouper, les unités de numération dans tous les sens, puis toutes les
// représentations —, ses prolongements font de même avec la centaine et le
// millier ; chaque séance reçoit ici les feuilles qui la servent, aux
// nombres et aux couleurs de l'atelier, et la note du matériel.

import type { Referentiel } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import {
  STYLE_CUBES, exercicesCubes, htmlAfficheCubes, htmlCubes, niveauCubes, type ExerciceCubes, type ReglagesCubes,
} from "./cubesNumeration";
import { unionDesCompetences } from "./ateliersCompetences";
import { STYLE_JEUX_MATHS } from "./jeuxMaths";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";

export const DEMARCHE_CUBES = "numeration-dizaine-cp";

export type FeuilleCubes = "grouper" | "affiche" | "ecrire" | "regrouper" | "dessiner" | "unites" | "facons" | "additive" | "relier" | "evaluation";

/** Une feuille de la séquence : la séance qui la reçoit, et son nom dans la séance. */
export interface FeuilleDeSequenceCubes { seance: number; quoi: FeuilleCubes; titre: string }

export const FEUILLES_DE_LA_SEQUENCE_CUBES: FeuilleDeSequenceCubes[] = [
  { seance: 0, quoi: "grouper", titre: "Grouper par dix, puis écrire le nombre" },
  { seance: 1, quoi: "affiche", titre: "Ce qu'on retient — l'affiche" },
  { seance: 2, quoi: "ecrire", titre: "Lire les cubes, écrire le nombre" },
  { seance: 3, quoi: "regrouper", titre: "Des collections à regrouper" },
  { seance: 4, quoi: "unites", titre: "Les unités de numération dans tous les sens" },
  { seance: 4, quoi: "facons", titre: "Faire un nombre de plusieurs façons" },
  { seance: 5, quoi: "relier", titre: "D'une représentation à l'autre" },
  { seance: 6, quoi: "evaluation", titre: "Évaluation" },
];

/** Toutes les feuilles de la séquence portent la même feuille de style. */
export const STYLE_SEQUENCE_CUBES = STYLE_FEUILLE + STYLE_JEUX_MATHS + STYLE_CUBES;

/**
 * Les réglages d'une feuille : ceux de l'atelier — le niveau, les couleurs,
 * les zéros — et l'exercice de la séance. `part` : la part des exercices à
 * regrouper ; toute la feuille quand c'est son objet.
 */
export function reglagesDeLaFeuille(quoi: Exclude<FeuilleCubes, "affiche">, r: ReglagesCubes): { reglages: ReglagesCubes; part: number } {
  const cp = niveauCubes(r.niveau).classe === "CP";
  const base: ReglagesCubes = { ...r, legende: true, numeros: true, retenir: false, desordre: false };
  const feuille = (p: Partial<ReglagesCubes>, part = 1 / 3) => ({ reglages: { ...base, ...p }, part });
  switch (quoi) {
    // Au CP, une grande collection en vrac à grouper — jusqu'à 59 au moins, comme les tas du défi ; ensuite, des centaines
    // par milliers de cubes ne se sèment pas : on écrit.
    case "grouper": return cp
      ? feuille({ titre: "Grouper par dix, puis écrire le nombre", exercice: "grouper", niveau: r.niveau === "cp-100" ? "cp-100" : "cp-59",
        ecritures: ["chiffres", "unites"], aRegrouper: true, nombre: 6 })
      : feuille({ titre: "Écrire le nombre d'une collection", exercice: "ecrire", ecritures: ["chiffres", "unites"], aRegrouper: true, nombre: 6 });
    case "ecrire": return feuille({ titre: "Lire les cubes, écrire le nombre", exercice: "ecrire", ecritures: ["chiffres", "unites"], aRegrouper: false, nombre: 8 });
    case "regrouper": return feuille({ titre: "Des collections à regrouper", exercice: "ecrire", ecritures: ["chiffres", "unites"], aRegrouper: true, nombre: 6 }, 1);
    case "dessiner": return feuille({ titre: "Lire le nombre, dessiner les cubes", exercice: "dessiner", ecritures: ["chiffres"], aRegrouper: false, nombre: 6 });
    case "additive": return feuille({ titre: "Les décompositions additives", exercice: "ecrire", ecritures: ["additive", "chiffres"], aRegrouper: false, nombre: 8 });
    case "unites": return feuille({ titre: "Les unités de numération dans tous les sens", exercice: "dessiner", ecritures: ["unites"], aRegrouper: true, desordre: true, nombre: 6 }, 0.5);
    case "facons": return feuille({ titre: "Faire un nombre de plusieurs façons", exercice: "facons", nombre: cp ? 6 : 4 });
    case "relier": return feuille({ titre: "D'une représentation à l'autre", exercice: "relier", ecritures: ["chiffres", "unites", "additive", "lettres"], aRegrouper: true, desordre: true, nombre: 6 });
    case "evaluation": return feuille({ titre: "Évaluation — les nombres en cubes", exercice: "ecrire", ecritures: ["chiffres", "unites", "additive"], aRegrouper: true, nombre: 6 }, 0.5);
  }
}

/** Le HTML d'une feuille, aux nombres de l'atelier ; `graine` fait le tirage. */
export function htmlDeLaFeuilleCubes(quoi: FeuilleCubes, r: ReglagesCubes, graine: number): string {
  if (quoi === "affiche") return htmlAfficheCubes(r);
  const { reglages, part } = reglagesDeLaFeuille(quoi, r);
  return htmlCubes(exercicesCubes(reglages, graine, part), reglages, graine);
}

/** Ce qu'il faut préparer, séance par séance : la note « matériel » de chacune. */
export function materielDesSeancesCubes(r: ReglagesCubes): string[] {
  const niv = niveauCubes(r.niveau);
  const pieces = niv.classe === "CP" ? "des cubes emboîtables d'une seule couleur, de quoi faire plusieurs barres de dix par élève"
    : niv.classe === "CE1" ? "du matériel multibase : plaques de cent, barres de dix et cubes" : "du matériel multibase : gros cubes de mille, plaques, barres et cubes";
  return [
    niv.classe === "CP"
      ? "Des jetons en quantité : deux tas de 40 à 60 jetons de deux couleurs pour le défi, un tas par groupe de trois ; des gobelets ou des barquettes ; un sablier de trois minutes ; la feuille « Grouper par dix » et des feutres pour entourer les paquets de dix."
      : `La feuille « Écrire le nombre d'une collection » ; ${pieces}.`,
    `${pieces[0].toUpperCase()}${pieces.slice(1)} ; l'affiche « Ce qu'on retient ».`,
    "La feuille « Lire les cubes, écrire le nombre » ; le matériel de numération ; les ardoises.",
    `La feuille « Des collections à regrouper » ; le matériel multibase pour échanger dix pièces contre une plus grande ; ${niv.classe === "CP" ? "un dé" : "deux dés"} pour le jeu du banquier.`,
    "Les feuilles « Les unités de numération dans tous les sens » et « Faire un nombre de plusieurs façons » ; le matériel pour valider.",
    "La feuille « D'une représentation à l'autre » ; des cartes des écritures pour le mémory.",
    "La feuille d'évaluation ; le matériel de numération pour la remédiation.",
  ];
}

/** Les compétences de numération du programme, d'une classe à l'autre : le même objectif sous des mots parfois différents. */
const FAMILLES_DE_COMPETENCES = [
  /diverses représentations d.un nombre/i, /dénombrer des collections/i, /construire des collections de cardinal donné/i,
  /valeur des chiffres/i, /relations? entre (les )?unités/i, /suite écrite et la suite orale/i,
];

/** Ce que travaille chaque exercice, dans les mots du programme ; les représentations, toujours. */
const DE_L_EXERCICE: Record<ExerciceCubes, RegExp> = {
  ecrire: /dénombrer des collections/i, grouper: /dénombrer des collections/i, relier: /valeur des chiffres/i,
  dessiner: /construire des collections de cardinal donné/i, facons: /construire des collections de cardinal donné/i,
};

/**
 * Les intitulés que l'exercice travaille : les représentations, toujours ;
 * le sien ; et, quand on échange dix unités contre une dizaine — des cubes à
 * regrouper, des façons de faire —, la valeur des chiffres au CP, la relation
 * entre les unités de numération au CE1 et au CE2.
 */
export function intitulesDeLExercice(r: ReglagesCubes): RegExp[] {
  const niv = niveauCubes(r.niveau);
  const sortie = [/diverses représentations d.un nombre/i, DE_L_EXERCICE[r.exercice]];
  const echanges = r.exercice === "facons" || (r.aRegrouper && r.exercice !== "grouper");
  if (echanges) sortie.push(niv.classe === "CP" ? /valeur des chiffres/i : /relations? entre (les )?unités/i);
  return sortie.filter((i, k) => sortie.findIndex((j) => j.source === i.source) === k);
}

/**
 * Ce que l'atelier propose de retenir, à la classe du niveau choisi : ce que
 * travaille l'exercice, et l'équivalent de ce qu'on avait retenu à une autre
 * classe — « Construire des collections de cardinal donné » du CE1 devient
 * celle du CP quand on choisit le CP.
 */
export function competencesProposees(referentiels: Referentiel[], r: ReglagesCubes, ailleurs: CompetenceSelectionnee[] = []): CompetenceSelectionnee[] {
  const niv = niveauCubes(r.niveau);
  const intitules = intitulesDeLExercice(r);
  for (const c of ailleurs) {
    const famille = FAMILLES_DE_COMPETENCES.find((f) => f.test(c.competenceTitre));
    if (famille && !intitules.some((i) => i.source === famille.source)) intitules.push(famille);
  }
  const trouvees = intitules.map((i) => competenceDuReferentiel(referentiels, niv.classe, i)).filter((c): c is CompetenceSelectionnee => !!c);
  return unionDesCompetences([trouvees]);
}
