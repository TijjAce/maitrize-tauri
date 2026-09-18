import { describe, it, expect } from "vitest";
import { CLE_REPRISE, cleDe, decouper, reprendreLesDossiers } from "./bureauAteliers";

describe("un seul bureau pour Ateliers & Espaces", () => {
  it("reprend les dossiers de chaque onglet, et fond ceux qui portent le même nom", () => {
    const reglages = {
      "rangement:jeux:dossier:cycle 1": "#a855f7",
      "rangement:jeux:dossier:cycle 2 et 3": "#a855f7",
      "rangement:outils:dossier:cycle 1": "#22c55e",
      "rangement:affichages:dossier:Coin lecture": "aucune",
      "rangement:jeux:place:": '{"j:skyjo":[5,0]}',
      "dossier:Maths": "#ff0000",
    };
    expect(reprendreLesDossiers(reglages)).toEqual({
      "rangement:atelier:dossier:cycle 1": "#a855f7",
      "rangement:atelier:dossier:cycle 2 et 3": "#a855f7",
      "rangement:atelier:dossier:Coin lecture": "aucune",
      [CLE_REPRISE]: "1",
    });
  });

  it("ne reprend qu'une fois, et ne touche pas à un dossier déjà présent", () => {
    expect(reprendreLesDossiers({ [CLE_REPRISE]: "1", "rangement:jeux:dossier:cycle 1": "#a855f7" })).toEqual({});
    expect(reprendreLesDossiers({
      "rangement:atelier:dossier:cycle 1": "#000000",
      "rangement:jeux:dossier:cycle 1": "#a855f7",
    })).toEqual({ [CLE_REPRISE]: "1" });
  });

  it("donne à chaque fiche une clé qui ne se confond avec aucune autre table", () => {
    expect(cleDe("jeu", "42")).toBe("j:42");
    expect(cleDe("outil", "42")).toBe("o:42");
    expect(decouper("o:42")).toEqual({ sorte: "outil", id: "42" });
    // Un identifiant peut contenir « : » : seul le premier compte.
    expect(decouper("a:x:y")).toEqual({ sorte: "atelier", id: "x:y" });
    expect(decouper("d:cycle 1")).toBeNull();
    expect(decouper("sans prefixe")).toBeNull();
  });
});
