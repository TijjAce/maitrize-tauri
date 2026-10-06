// Une séquence pour dénombrer en groupant par dix et passer d'une
// représentation du nombre à l'autre, avec ses feuilles.
//
// Comme pour « Comparer les nombres » : l'atelier fabrique les feuilles, la
// séquence les installe dans la durée. La démarche « numeration-dizaine-cp »
// (voir demarches.ts) suit le guide CP — le jeu de la dizaine, la barre de
// dix, l'écriture chiffrée, les collections à regrouper, les unités de
// numération dans tous les sens, puis toutes les représentations — ; chaque
// séance reçoit les feuilles qui la servent, aux nombres et aux couleurs de
// l'atelier, et la note du matériel.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import {
  STYLE_CUBES, exempleDuNiveau, exercicesCubes, htmlAfficheCubes, htmlCubes, niveauCubes, type NiveauCubes, type ReglagesCubes,
} from "./cubesNumeration";
import { STYLE_JEUX_MATHS } from "./jeuxMaths";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { graineAuHasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { chargerVacances, periodeDuJour } from "./vacances";
import { fr } from "./nombres";

export const DEMARCHE_CUBES = "numeration-dizaine-cp";

export type FeuilleCubes = "grouper" | "affiche" | "ecrire" | "regrouper" | "unites" | "facons" | "relier" | "evaluation";

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

/** Le titre proposé : « Dénombrer et représenter les nombres jusqu'à 100 (CP) ». */
export function titreDeLaSequenceCubes(r: ReglagesCubes): string {
  const niv = niveauCubes(r.niveau);
  return `Dénombrer et représenter les nombres jusqu'à ${fr(niv.max === 9999 ? 10000 : niv.max)} (${niv.classe})`;
}

/** Les unités de numération du niveau, en toutes lettres : « des dizaines et des unités ». */
const unitesDuNiveau = (niv: NiveauCubes) =>
  niv.classe === "CP" ? "dizaines et unités" : niv.classe === "CE1" ? "centaines, dizaines et unités" : "milliers, centaines, dizaines et unités";

/** Ce que la séquence vise : les compétences du programme, aux nombres et aux unités du niveau. */
export function objectifsDeLaSequenceCubes(r: ReglagesCubes): string {
  const niv = niveauCubes(r.niveau);
  const n = exempleDuNiveau(niv);
  return `Dénombrer des collections en les organisant en ${unitesDuNiveau(niv)} ; connaitre et utiliser diverses représentations des nombres `
    + `jusqu'à ${fr(niv.max === 9999 ? 10000 : niv.max)} et passer de l'une à l'autre — le matériel, l'écriture en chiffres (${fr(n)}), le nom, `
    + `les unités de numération même à regrouper, la décomposition additive, l'écriture en lettres.`;
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
    "La feuille « Des collections à regrouper » ; le matériel multibase pour échanger dix pièces contre une plus grande ; un dé pour le jeu du banquier.",
    "Les feuilles « Les unités de numération dans tous les sens » et « Faire un nombre de plusieurs façons » ; le matériel pour valider.",
    "La feuille « D'une représentation à l'autre » ; des cartes des écritures pour le mémory.",
    "La feuille d'évaluation ; le matériel de numération pour la remédiation.",
  ];
}

/** « Connaitre et utiliser diverses représentations d'un nombre… », à la classe du niveau, dans les référentiels actifs. */
export const competenceDuProgrammeCubes = (referentiels: Referentiel[], niv: NiveauCubes) =>
  competenceDuReferentiel(referentiels, niv.classe, /diverses représentations d.un nombre/i);

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Rend la séquence créée, et
 * combien de feuilles y sont.
 */
export async function creerLaSequenceDesCubes(
  r: ReglagesCubes, titre: string, competences: CompetenceSelectionnee[],
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_CUBES);
  if (!demarche) throw new Error("La démarche « grouper par dix, écrire le nombre » est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequenceCubes(r), matiere, cycle: "Cycle 2",
    objectifs: objectifsDeLaSequenceCubes(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(),
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const materiel = materielDesSeancesCubes(r);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => ({ ...s, competences: JSON.stringify(competences), materiel: materiel[i] ?? "" }));
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of FEUILLES_DE_LA_SEQUENCE_CUBES) {
    const seance = seances[f.seance];
    if (!seance) continue;
    await poserDansUneSeance("cubes", f.titre, htmlDeLaFeuilleCubes(f.quoi, r, graineAuHasard()), STYLE_SEQUENCE_CUBES, seance.id, sequence.id);
    posees++;
  }
  return { sequence, feuilles: posees };
}
