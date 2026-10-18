// Le français du cours moyen : la séquence d'une compétence du CM1 ou du CM2,
// bâtie sur le programme de français du cycle 3 (2025) et ses exemples de
// réussite. Rien quand le cours moyen n'a pas encore de séquence pour la
// compétence : la démarche générale du guide la prend.

import { DEMARCHES_LANGUE_CM, demarcheDeLaLangueCM } from "./cycle3Langue";
import { DEMARCHES_LECTURE_CM, demarcheDeLaLectureCM } from "./cycle3Lecture";
import { DEMARCHES_ECRITURE_CM, demarcheDeLEcritureCM } from "./cycle3Ecriture";
import { DEMARCHES_ORAL_CM, demarcheDeLOralCM } from "./cycle3Oral";
import type { Demarche } from "./demarches";

export const DEMARCHES_FRANCAIS_CM: Demarche[] = [...DEMARCHES_LECTURE_CM, ...DEMARCHES_ECRITURE_CM, ...DEMARCHES_ORAL_CM, ...DEMARCHES_LANGUE_CM];

/** La séquence d'une compétence de français du CM1 ou du CM2 ; en minuscules sans accents. */
export function demarcheDuFrancaisCM(classe: string, sd: string, cg: string, comp: string): string | null {
  // La lecture : la fluidité, la voix haute, la compréhension, les documents, les œuvres (voir cycle3Lecture.ts).
  if (/^lecture/.test(sd)) return demarcheDeLaLectureCM(classe, cg);
  // L'écriture : la copie, les écrits de travail, les écrits variés, la révision (voir cycle3Ecriture.ts).
  if (/^ecriture/.test(sd)) return demarcheDeLEcritureCM(classe, cg, comp);
  // L'oral : écouter, dire, échanger (voir cycle3Oral.ts).
  if (/^oral/.test(sd)) return demarcheDeLOralCM(classe, cg);
  // La grammaire, l'orthographe grammaticale et la conjugaison (voir cycle3Langue.ts).
  if (/grammaire/.test(sd)) return demarcheDeLaLangueCM(classe, cg, comp);
  return null;
}
