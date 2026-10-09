import { describe, it, expect } from "vitest";
import { cleTapuscritDuCreneau, creneauxAvecTapuscrit } from "./journalTapuscrit";

describe("le tapuscrit dans le cahier journal", () => {
  it("ne s'imprime que sous les créneaux cochés : par défaut, non", () => {
    const reglages = {
      [cleTapuscritDuCreneau("c1")]: "1",
      [cleTapuscritDuCreneau("c2")]: "",
      "journal:tapuscrit:": "1",
      "journal:masques:c3": "[\"jeu:j1\"]",
      notesRapides: "- penser aux photos",
    };
    expect([...creneauxAvecTapuscrit(reglages)]).toEqual(["c1"]);
    expect(creneauxAvecTapuscrit({}).size).toBe(0);
  });
});
