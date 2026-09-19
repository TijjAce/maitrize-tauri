import { describe, it, expect } from "vitest";
import { CLE_FUSION, fusionnerDansLePlanDeTravail } from "./bureauAteliers";

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
