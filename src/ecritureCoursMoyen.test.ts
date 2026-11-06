// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { RANGEES_DE_LA_COPIE, REGLAGES_ECRITURE_CM, STYLE_ECRITURE_CM, htmlEcritureCM } from "./ecritureCoursMoyen";

describe("La copie du cours moyen sur les lignes Seyès de Marelle (demande de l'enseignant, 4 novembre 2026)", () => {
  it("donne au verso une page « Ma copie » sur les lignes de Marelle, à la réglure de 2 mm", () => {
    for (const classe of ["CM1", "CM2"] as const) {
      const html = htmlEcritureCM({ ...REGLAGES_ECRITURE_CM, classe, exercice: "copie" }, 1);
      const verso = html.slice(html.indexOf("Ma copie"));
      const bloc = verso.match(/<div class="cu-marelle" style='font-family: var\(--police-lignes[^;]*; font-size: ([\d.]+)mm; --cu-interligne: 2mm'>([^<]*)<\/div>/);
      expect(bloc, classe).not.toBeNull();
      // Une petite lettre sur un interligne de 2 mm : Marelle à 2 / 0,48 mm.
      expect(Number(bloc![1])).toBeCloseTo(4.167, 2);
      const rangees = bloc![2].split("\n");
      expect(rangees).toHaveLength(RANGEES_DE_LA_COPIE);
      expect(rangees.every((x) => x.trim() === "")).toBe(true);
    }
    expect(STYLE_ECRITURE_CM).toContain(".feuille .cu-marelle");
  });
});
