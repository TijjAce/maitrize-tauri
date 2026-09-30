import { describe, it, expect } from "vitest";
import {
  USAGES, USAGE_PAR_DEFAUT, cleUsage, descriptionDe, estUnUsage, lireUsage, rangerParUsage, usageParDefaut, usagesDesReglages,
} from "./usageAtelier";

describe("les moments d'une séquence", () => {
  it("vont de la découverte au réinvestissement, le rituel à part", () => {
    expect(USAGES.map((u) => u.id)).toEqual(["manipulation", "entrainement", "reinvestissement", "rituel"]);
    for (const u of USAGES) {
      expect(u.nom.length, u.id).toBeGreaterThan(3);
      expect(u.quand.length, u.id).toBeGreaterThan(5);
      expect(u.aide.length, u.id).toBeGreaterThan(30);
    }
  });

  it("proposent un rangement valable pour chaque atelier connu", () => {
    expect(Object.keys(USAGE_PAR_DEFAUT).length).toBeGreaterThanOrEqual(29);
    for (const [atelier, u] of Object.entries(USAGE_PAR_DEFAUT)) expect(estUnUsage(u), atelier).toBe(true);
    expect(usageParDefaut("martiniere")).toBe("rituel");
    expect(usageParDefaut("etiquettes")).toBe("manipulation");
    expect(usageParDefaut("atelier-inconnu")).toBe("entrainement");
  });
});

describe("le rangement d'un atelier", () => {
  it("est celui qu'on a enregistré, s'il est valable", () => {
    expect(lireUsage("rituel", "phrases")).toBe("rituel");
    expect(lireUsage("n'importe quoi", "phrases")).toBe("entrainement");
    expect(lireUsage(null, "fluence")).toBe("rituel");
    expect(lireUsage(undefined, "tri")).toBe("manipulation");
  });

  it("se lit pour tous les ateliers d'un coup, depuis les réglages", () => {
    const reglages = { [cleUsage("fluence")]: "entrainement", [cleUsage("oie")]: "bidon", "autre:cle": "rituel" };
    expect(usagesDesReglages(reglages, ["fluence", "oie", "tri"])).toEqual({ fluence: "entrainement", oie: "reinvestissement", tri: "manipulation" });
    expect(cleUsage("tri")).toBe("fabriquer:usage:tri");
  });

  it("range les ateliers par moment, dans l'ordre de la séquence, sans moment vide", () => {
    const outils = [{ id: "oie" }, { id: "tri" }, { id: "fluence" }, { id: "phrases" }];
    const groupes = rangerParUsage(outils, { oie: "manipulation", fluence: "rituel", phrases: "rituel" });
    expect(groupes.map((g) => [g.usage.id, g.outils.map((o) => o.id)])).toEqual([
      ["manipulation", ["oie", "tri"]],
      ["rituel", ["fluence", "phrases"]],
    ]);
    expect(descriptionDe("rituel").nom).toBe("Rituel");
  });
});
