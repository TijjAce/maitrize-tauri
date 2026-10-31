// Les séquences travaillées en profondeur, que le logo de Maitrize signale dans
// le tableau des séquences toutes faites (demande de l'enseignant, 30 octobre
// 2026 : « un petit logo Maitrize si tu as un peu plus bossé dessus »).
//
// Une séquence l'est quand ses séances ont été écrites phase par phase d'après
// une séquence d'Éduscol qui les détaille, avec ce que fait l'enseignant : ce
// qu'il observe, les erreurs attendues, les aides ; et que toutes ses feuilles
// naissent d'un atelier de Fabriquer. Ce sont la soustraction posée du CE1 et
// les séquences d'histoire-géographie du cycle 2 qui suivent une séquence
// d'Éduscol de 2016 (« oui mets le logo aussi sur celles d'histoire-géo »,
// puis « mets aussi le logo sur les deux séquences du temps », 31 octobre
// 2026). Les autres suivent le programme et ses repères, en phases plus
// brèves. Un essai veille à ce qu'une séquence aussi détaillée qu'elles ne
// reste pas sans le logo.

import { SEQUENCES_D_EDUSCOL_2016 } from "./demarchesHistoireGeo";
import { DEMARCHE_SOUSTRACTION_POSEE } from "./sequenceSoustractionPosee";

const APPROFONDIES: ReadonlySet<string> = new Set([DEMARCHE_SOUSTRACTION_POSEE.id, ...SEQUENCES_D_EDUSCOL_2016.map((d) => d.id)]);

export const estApprofondie = (idDemarche: string) => APPROFONDIES.has(idDemarche);

export const TRAVAILLEE_EN_PROFONDEUR = "Travaillée en profondeur par Maitrize";

/** Ce que dit le logo, au survol d'une séquence et dans l'aide du tableau. */
export const SENS_DU_LOGO = "ses séances écrites phase par phase d'après une séquence d'Éduscol qui les détaille, avec ce que fait "
  + "l'enseignant, les erreurs attendues et les aides ; toutes ses feuilles faites par un atelier de Fabriquer";
