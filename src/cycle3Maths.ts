// Les mathématiques du cours moyen : la séquence d'une compétence du CM1 ou du
// CM2, d'après le programme du cycle 3 (2025) — voir cycle3Nombres.ts et les
// modules qui le suivent. Rien quand le cours moyen n'a pas encore de séquence
// pour la compétence : la démarche générale du guide la prend.

import { DEMARCHES_NOMBRES_CM, demarcheDesNombresCM } from "./cycle3Nombres";
import type { Demarche } from "./demarches";

export const DEMARCHES_MATHS_CM: Demarche[] = [...DEMARCHES_NOMBRES_CM];

/** La séquence d'une compétence de mathématiques du CM1 ou du CM2 ; en minuscules sans accents. */
export function demarcheDesMathsCM(classe: string, cg: string, comp: string, periode = 0): string | null {
  if (/nombres entiers|fractions|nombres decimaux/.test(cg)) return demarcheDesNombresCM(classe, cg, comp, periode);
  return null;
}
