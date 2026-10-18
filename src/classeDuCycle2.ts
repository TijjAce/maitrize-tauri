import type { Classe, ClasseC2 } from "./feuillesDesSequences";

/** Une classe du cycle 3, ramenée au CE2 pour les ateliers et les séquences du cycle 2 qui ne connaissent pas le cours moyen. */
export const classeDuCycle2 = (c: Classe): ClasseC2 => (c === "CM1" || c === "CM2" ? "CE2" : c);
