// Les séquences travaillées en profondeur, que le logo de Maitrize signale dans
// le tableau des séquences toutes faites (demande de l'enseignant, 30 octobre
// 2026 : « un petit logo Maitrize si tu as un peu plus bossé dessus »).
//
// Une séquence l'est quand chacune de ses séances a été écrite phase par
// phase d'après un texte qui la détaille — la séance d'un manuel, une séquence
// d'Éduscol —, avec ce que fait l'enseignant : ce qu'il observe, les erreurs
// attendues, les aides ; et que toutes ses feuilles naissent d'un atelier de
// Fabriquer. Ce sont les séquences du manuel du CRPE de l'enseignant, et la
// soustraction posée du CE1, d'après Éduscol. Les autres suivent le programme
// et ses repères, en phases plus brèves. Un essai veille à ce qu'une séquence
// aussi détaillée qu'elles ne reste pas sans le logo.

import { DEMARCHE_DIX_A_VINGT } from "./demarcheDixAVingt";
import { DEMARCHE_SOUSTRACTION_RETENUE } from "./demarcheSoustractionRetenue";
import { DEMARCHE_SOUSTRACTION_POSEE } from "./sequenceSoustractionPosee";
import { DEMARCHES_DU_MANUEL } from "./sequencesDuManuel";

const APPROFONDIES: ReadonlySet<string> = new Set([
  DEMARCHE_DIX_A_VINGT, DEMARCHE_SOUSTRACTION_RETENUE, ...DEMARCHES_DU_MANUEL.map((d) => d.id), DEMARCHE_SOUSTRACTION_POSEE.id,
]);

export const estApprofondie = (idDemarche: string) => APPROFONDIES.has(idDemarche);

export const TRAVAILLEE_EN_PROFONDEUR = "Travaillée en profondeur par Maitrize";

/** Ce que dit le logo, au survol d'une séquence et dans l'aide du tableau. */
export const SENS_DU_LOGO = "chaque séance écrite phase par phase d'après un texte qui la détaille — la séance d'un manuel, une séquence "
  + "d'Éduscol —, avec ce que fait l'enseignant, les erreurs attendues et les aides ; toutes ses feuilles faites par un atelier de Fabriquer";
