import { describe, expect, it } from "vitest";
import type { Demarche } from "./demarches";
import { DEMARCHES_HISTOIRE_GEO, SEQUENCES_D_EDUSCOL_2016 } from "./demarchesHistoireGeo";
import { DEMARCHE_SOUSTRACTION_POSEE } from "./sequenceSoustractionPosee";
import { estApprofondie } from "./sequencesApprofondies";
import { sequencesToutesFaites } from "./sequencesToutesFaites";

/** La part des phases qui disent ce que fait l'enseignant, et la longueur moyenne d'une phase, ce qu'il fait compris. */
function detail(d: Demarche) {
  const phases = d.seances.flatMap((s) => s.phases);
  const posture = phases.filter((p) => (p.posture ?? "").trim()).length / phases.length;
  const longueur = phases.reduce((n, p) => n + p.description.length + (p.posture ?? "").length, 0) / phases.length;
  return { posture, longueur };
}

describe("le logo de Maitrize sur les séquences travaillées en profondeur", () => {
  const marquees: Demarche[] = [DEMARCHE_SOUSTRACTION_POSEE, ...SEQUENCES_D_EDUSCOL_2016];

  it("la soustraction posée du CE1 et l'histoire-géographie d'après Éduscol le portent", () => {
    for (const d of marquees) expect(estApprofondie(d.id), d.nom).toBe(true);
    const toutes = sequencesToutesFaites();
    expect(toutes.filter((s) => estApprofondie(s.demarche.id)).length).toBeGreaterThanOrEqual(9);
    expect(toutes.filter((s) => !estApprofondie(s.demarche.id)).length).toBeGreaterThan(200);
    // Celles du CP au CM2 sont bien dans le tableau des séquences toutes faites.
    for (const d of marquees) {
      if (d.famille === "Maternelle") continue;
      expect(toutes.some((s) => s.demarche.id === d.id), d.nom).toBe(true);
    }
  });

  it("en histoire-géographie, toutes celles qui suivent une séquence d'Éduscol de 2016 ; pas celles bâties sur le programme", () => {
    for (const d of DEMARCHES_HISTOIRE_GEO) expect(estApprofondie(d.id), d.nom).toBe(d.source.startsWith("Éduscol, ressources 2016"));
    expect(SEQUENCES_D_EDUSCOL_2016).toHaveLength(8);
  });

  it("une séquence marquée dit, dans ses phases, ce que fait l'enseignant : au moins une phase sur trois", () => {
    for (const d of marquees) expect(detail(d).posture, d.nom).toBeGreaterThanOrEqual(1 / 3);
  });

  it("une séquence aussi détaillée que celles qui le portent ne reste pas sans le logo", () => {
    for (const s of sequencesToutesFaites()) {
      const { posture, longueur } = detail(s.demarche);
      if (posture >= 0.7 && longueur >= 300) expect(estApprofondie(s.demarche.id), `${s.demarche.nom} : détaillée comme celles qui le portent`).toBe(true);
    }
  });
});
