import { describe, it, expect } from "vitest";
import { ecrireNiveaux, GROUPES_DE_STRUCTURES, lireNiveaux, nomDeStructure, STRUCTURES, structureDe } from "./classe";

describe("la structure", () => {
  it("lit le réglage, et l'ancien emploi du temps « Organisation IME » vaut l'IME", () => {
    expect(structureDe({ typeStructure: "sessad" }).court).toBe("SESSAD");
    expect(structureDe({ "edt:mode": "ime" }).id).toBe("ime");
    expect(structureDe({ typeStructure: "ordinaire", "edt:mode": "ime" }).id).toBe("ordinaire");
    expect(structureDe({}).id).toBe("ordinaire");
    // Une valeur inconnue — une version plus récente, un réglage abîmé — vaut la classe ordinaire.
    expect(structureDe({ typeStructure: "inconnue" }).id).toBe("ordinaire");
  });

  it("ne se nomme pas dans une classe ordinaire", () => {
    expect(nomDeStructure(structureDe({ typeStructure: "ulis-ecole" }))).toBe("ULIS école");
    expect(nomDeStructure(structureDe({}))).toBe("");
    expect(nomDeStructure(structureDe({ typeStructure: "autre" }))).toBe("");
  });

  it("propose chaque structure une fois, rangée dans un groupe", () => {
    expect(new Set(STRUCTURES.map((x) => x.id)).size).toBe(STRUCTURES.length);
    expect(GROUPES_DE_STRUCTURES[0]).toBe("École");
    expect(STRUCTURES.map((x) => x.id)).toEqual(expect.arrayContaining(["ime", "sessad", "ulis-ecole", "uema", "itep"]));
  });
});

describe("les niveaux", () => {
  it("se lisent dans l'ordre de l'école, quoi qu'on ait écrit", () => {
    expect(lireNiveaux("CE1, CP")).toEqual(["CP", "CE1"]);
    expect(lireNiveaux("ce2 / cm1")).toEqual(["CE2", "CM1"]);
    expect(lireNiveaux("CE1")).toEqual(["CE1"]);
    expect(lireNiveaux("")).toEqual([]);
    expect(lireNiveaux(null)).toEqual([]);
    expect(lireNiveaux("CP, 4e")).toEqual(["CP"]);
  });

  it("s'écrivent en une ligne, chacun une fois", () => {
    expect(ecrireNiveaux(["CE1", "CP", "CE1"])).toBe("CP, CE1");
    expect(ecrireNiveaux([])).toBe("");
  });
});
