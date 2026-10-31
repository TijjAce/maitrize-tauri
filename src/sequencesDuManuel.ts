// Les séquences toutes faites d'après le manuel du CRPE de l'enseignant — « Réussir mon CRPE —
// Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel,
// S. Méric-Pons ; Nathan) —, une par sujet, chacune dans son module (manuel<Notion><Classe>.ts).
// Il les a demandées l'une après l'autre (octobre 2026) : « continue de faire des séances et des
// séquences dans séquences toutes faites à l'aide du manuel de préparation du CRPE ».
//
// Les deux premières, faites avant ce registre, gardent leur place dans les listes de leur domaine :
// les nombres de 10 à 20 (demarcheDixAVingt.ts) et la soustraction posée avec retenue
// (demarcheSoustractionRetenue.ts).
//
// Le registre dit, pour chacune, son domaine — la ligne où elle se range parmi les séquences toutes
// faites et dans la bibliothèque — et ses feuilles. La période que le manuel lui donne est citée
// dans programmation.ts ; celles qui posent des problèmes s'ouvrent sur la séance de leurs mots
// (motsDesProblemes.ts).

import type { Demarche } from "./demarches";
import type { ContexteFeuilles, PlanDesFeuilles } from "./feuillesDesSequences";
import { DEMARCHE_AIRES_CM1_CM2, planAiresCm1Cm2 } from "./manuelAiresCm1Cm2";
import { DEMARCHE_DECIMAUX_CM2, planDecimauxCm2 } from "./manuelDecimauxCm2";
import { DEMARCHE_DECOMPOSITION_GS, planDecompositionGs } from "./manuelDecompositionGs";
import { DEMARCHE_DIVISION_EUCLIDIENNE_CM1, planDivisionEuclidienneCm1 } from "./manuelDivisionCm1";
import { DEMARCHE_ESPACE_GEOMETRIE_CM1, planEspaceGeometrieCm1 } from "./manuelEspaceGeometrieCm1";
import { DEMARCHE_FORMES_GRANDEURS_GS, planFormesGrandeursGs } from "./manuelFormesGrandeursGs";
import { DEMARCHE_FRACTIONS_SIMPLES_CM1, planFractionsSimplesCm1 } from "./manuelFractionsCm1";
import { DEMARCHE_LONGUEURS_CP_CE1, planLongueursCpCe1 } from "./manuelLongueursCpCe1";
import { DEMARCHE_MULTIPLICATION_CE2, planMultiplicationCe2 } from "./manuelMultiplicationCe2";
import { DEMARCHE_PROBLEMES_ADDITIFS_CE1, planProblemesAdditifsCe1 } from "./manuelProblemesAdditifsCe1";
import { DEMARCHE_PROPORTIONNALITE_CM1, planProportionnaliteCm1 } from "./manuelProportionnaliteCm1";
import { DEMARCHE_SINGAPOUR_CE2, planSingapourCe2 } from "./manuelSingapourCe2";
import { DEMARCHE_SYMETRIE_CE2, planSymetrieCe2 } from "./manuelSymetrieCe2";

export interface SequenceDuManuel {
  demarche: Demarche;
  /** L'un des domaines de sequencesToutesFaites.ts : « calcul », « grandeurs »… ; aucun en maternelle. */
  domaine?: string;
  /**
   * En maternelle, la matière de l'emploi du temps, qui donne sa couleur au livre de la bibliothèque : ses séquences n'ont pas de
   * domaine de l'école ; elles vont dans le dossier de la grande section (voir sequencesDeMaternelle.ts).
   */
  matiere?: string;
  /** Ses feuilles et son matériel ; en maternelle, le matériel seul. */
  plan: (ctx: ContexteFeuilles) => PlanDesFeuilles;
}

/** Dans l'ordre des sujets du manuel. */
export const SEQUENCES_DU_MANUEL: SequenceDuManuel[] = [
  { demarche: DEMARCHE_MULTIPLICATION_CE2, domaine: "calcul", plan: planMultiplicationCe2 }, // sujet 3
  { demarche: DEMARCHE_DIVISION_EUCLIDIENNE_CM1, domaine: "calcul", plan: planDivisionEuclidienneCm1 }, // sujet 4
  { demarche: DEMARCHE_FORMES_GRANDEURS_GS, matiere: "Structurer sa pensée", plan: planFormesGrandeursGs }, // sujet 5
  { demarche: DEMARCHE_DECOMPOSITION_GS, matiere: "Structurer sa pensée", plan: planDecompositionGs }, // sujet 6
  { demarche: DEMARCHE_FRACTIONS_SIMPLES_CM1, domaine: "fractions", plan: planFractionsSimplesCm1 }, // sujet 7
  { demarche: DEMARCHE_DECIMAUX_CM2, domaine: "decimaux", plan: planDecimauxCm2 }, // sujet 8
  { demarche: DEMARCHE_LONGUEURS_CP_CE1, domaine: "grandeurs", plan: planLongueursCpCe1 }, // sujet 9
  { demarche: DEMARCHE_AIRES_CM1_CM2, domaine: "grandeurs", plan: planAiresCm1Cm2 }, // sujet 10
  { demarche: DEMARCHE_SYMETRIE_CE2, domaine: "geometrie", plan: planSymetrieCe2 }, // sujet 11
  { demarche: DEMARCHE_PROPORTIONNALITE_CM1, domaine: "proportionnalite", plan: planProportionnaliteCm1 }, // sujet 12
  { demarche: DEMARCHE_PROBLEMES_ADDITIFS_CE1, domaine: "problemes", plan: planProblemesAdditifsCe1 }, // sujet 13
  { demarche: DEMARCHE_ESPACE_GEOMETRIE_CM1, domaine: "geometrie", plan: planEspaceGeometrieCm1 }, // sujet 14
  { demarche: DEMARCHE_SINGAPOUR_CE2, domaine: "problemes", plan: planSingapourCe2 }, // sujet 15
];

export const DEMARCHES_DU_MANUEL: Demarche[] = SEQUENCES_DU_MANUEL.map((s) => s.demarche);

export const sequenceDuManuel = (id: string): SequenceDuManuel | null => SEQUENCES_DU_MANUEL.find((s) => s.demarche.id === id) ?? null;
