import { describe, it, expect } from "vitest";
import { CLE_FUSION, fusionnerDansLePlanDeTravail, lireDemandeBureau } from "./bureauAteliers";

describe("un seul bureau dans l'application", () => {
  it("verse les dossiers des ateliers dans le plan de travail, une fois, sans écraser les siens", () => {
    const reglages = {
      "dossier:Maths": "#ff0000",
      "rangement:atelier:dossier:Maths": "#00ff00",
      "rangement:atelier:dossier:cycle 1": "#a855f7",
      // Jamais ouvert le bureau commun : l'ancien dossier d'onglet vient aussi.
      "rangement:outils:dossier:Coin lecture": "aucune",
      "rangement:atelier:place:": '{"j:1":[0,0]}',
    };
    expect(fusionnerDansLePlanDeTravail(reglages)).toEqual({
      "dossier:cycle 1": "#a855f7",
      "dossier:Coin lecture": "aucune",
      [CLE_FUSION]: "1",
    });
    expect(fusionnerDansLePlanDeTravail({ ...reglages, [CLE_FUSION]: "1" })).toEqual({});
  });
});

describe("la demande venue de ⌘K", () => {
  it("lit un identifiant et un titre", () => {
    expect(lireDemandeBureau({ id: "j1", titre: "Loto des couleurs" }))
      .toEqual({ id: "j1", titre: "Loto des couleurs" });
  });

  it("accepte encore un simple titre : c'était la forme d'avant", () => {
    expect(lireDemandeBureau("Loto des couleurs")).toEqual({ titre: "Loto des couleurs" });
  });

  it("une demande vide ou abîmée ne casse pas le bureau", () => {
    expect(lireDemandeBureau(null)).toEqual({ titre: "" });
    expect(lireDemandeBureau(42)).toEqual({ titre: "" });
    expect(lireDemandeBureau({})).toEqual({ id: undefined, titre: "" });
  });
});
