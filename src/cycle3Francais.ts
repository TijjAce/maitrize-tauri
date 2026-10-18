// Le français du cours moyen : la séquence d'une compétence du CM1 ou du CM2,
// bâtie sur le programme de français du cycle 3 (2025) et ses exemples de
// réussite. Rien quand le cours moyen n'a pas encore de séquence pour la
// compétence : la démarche générale du guide la prend.

import { DEMARCHES_LANGUE_CM, demarcheDeLaLangueCM } from "./cycle3Langue";
import { DEMARCHES_LECTURE_CM, demarcheDeLaLectureCM } from "./cycle3Lecture";
import type { Demarche } from "./demarches";

export const DEMARCHES_FRANCAIS_CM: Demarche[] = [...DEMARCHES_LECTURE_CM, ...DEMARCHES_LANGUE_CM];

/** La séquence d'une compétence de français du CM1 ou du CM2 ; en minuscules sans accents. */
export function demarcheDuFrancaisCM(classe: string, sd: string, cg: string, comp: string): string | null {
  // La lecture : la fluidité, la voix haute, la compréhension, les documents, les œuvres (voir cycle3Lecture.ts).
  if (/^lecture/.test(sd)) return demarcheDeLaLectureCM(classe, cg);
  // La grammaire, l'orthographe grammaticale et la conjugaison (voir cycle3Langue.ts).
  if (/grammaire/.test(sd)) return demarcheDeLaLangueCM(classe, cg, comp);
  return null;
}
