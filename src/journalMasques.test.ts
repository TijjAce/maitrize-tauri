import { describe, it, expect } from "vitest";
import { aImprimer, basculerMasque, cleMasques, ecrireMasques, lireMasques, masqueJeu, masqueRituel, masqueSequence, masquesDesReglages } from "./journalMasques";

describe("ce qu'on cite sans l'imprimer", () => {
  it("se garde par créneau, sous des clés qui disent quoi", () => {
    expect(cleMasques("c1")).toBe("journal:masques:c1");
    expect(masqueJeu("j1")).toBe("jeu:j1");
    expect(masqueRituel("r1")).toBe("rituel:r1");
    // La séquence entière et l'une de ses séances sont deux blocs différents.
    expect(masqueSequence("q1")).toBe("sequence:q1|");
    expect(masqueSequence("q1", null)).toBe("sequence:q1|");
    expect(masqueSequence("q1", "s2")).toBe("sequence:q1|s2");
  });

  it("se relit sans faire confiance à ce qui est enregistré, et se coche comme une case", () => {
    expect(lireMasques(null)).toEqual([]);
    expect(lireMasques("{pas une liste")).toEqual([]);
    expect(lireMasques('["jeu:j1", 3, "", "jeu:j1", "rituel:r1"]')).toEqual(["jeu:j1", "rituel:r1"]);
    expect(lireMasques(ecrireMasques(["jeu:j1"]))).toEqual(["jeu:j1"]);
    expect(basculerMasque([], "jeu:j1")).toEqual(["jeu:j1"]);
    expect(basculerMasque(["jeu:j1", "rituel:r1"], "jeu:j1")).toEqual(["rituel:r1"]);
  });

  it("se retrouve pour tous les créneaux d'un coup, à l'impression", () => {
    const reglages = {
      "journal:masques:c1": '["jeu:j1"]', "journal:masques:c2": "[]", "journal:masques:": '["jeu:j9"]',
      "journal:masques:c3": '["rituel:r1","sequence:q1|s2"]', "echelle:m1": "0.8", "caa:consignes": "{}",
    };
    expect(masquesDesReglages(reglages)).toEqual({ c1: ["jeu:j1"], c3: ["rituel:r1", "sequence:q1|s2"] });
    expect(masquesDesReglages({})).toEqual({});
  });

  it("retire de l'impression ce qui est masqué, et rien d'autre", () => {
    const jeux = [{ id: "j1", titre: "La pêche au canard" }, { id: "j2", titre: "Le loto" }];
    expect(aImprimer(jeux, (j) => masqueJeu(j.id), ["jeu:j1"])).toEqual([jeux[1]]);
    expect(aImprimer(jeux, (j) => masqueJeu(j.id), ["rituel:j1"])).toEqual(jeux);
    expect(aImprimer(jeux, (j) => masqueJeu(j.id), [])).toBe(jeux);
    const citations = [{ sequence: { id: "q1" }, seance: { id: "s2" } }, { sequence: { id: "q1" }, seance: null }];
    expect(aImprimer(citations, (c) => masqueSequence(c.sequence.id, c.seance?.id), ["sequence:q1|"])).toEqual([citations[0]]);
  });
});
