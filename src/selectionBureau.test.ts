import { describe, it, expect } from "vitest";
import { TYPE_SELECTION, basculer, lireSelectionGlissee, rectangle, touchees } from "./selectionBureau";

const glisse = (donnees: Record<string, string>) => ({ getData: (type: string) => donnees[type] ?? "" });

describe("la sélection du bureau", () => {
  it("⌘-clic : l'élément entre dans la sélection, ou en sort", () => {
    const une = basculer(new Set(["m:1"]), "s:2");
    expect([...une]).toEqual(["m:1", "s:2"]);
    expect([...basculer(une, "m:1")]).toEqual(["s:2"]);
  });

  it("le rectangle prend ce qu'il touche, tiré dans un sens ou dans l'autre", () => {
    const tuiles = [
      { cle: "d:A", boite: { gauche: 0, haut: 0, droite: 100, bas: 150 } },
      { cle: "m:1", boite: { gauche: 136, haut: 0, droite: 236, bas: 150 } },
      { cle: "m:2", boite: { gauche: 0, haut: 186, droite: 100, bas: 336 } },
    ];
    expect(touchees(rectangle(90, 140, 140, 10), tuiles)).toEqual(["d:A", "m:1"]);
    expect(touchees(rectangle(120, 160, 130, 170), tuiles)).toEqual([]);
    expect(touchees(rectangle(-5, -5, 500, 500), tuiles)).toEqual(["d:A", "m:1", "m:2"]);
  });

  it("se glisse d'un bloc, et se relit à l'arrivée", () => {
    const sel = { elements: [{ genre: "materiel", id: "1", titre: "Fiche" }], dossiers: ["Maths/Calcul"] };
    expect(lireSelectionGlissee(glisse({ [TYPE_SELECTION]: JSON.stringify(sel) }))).toEqual(sel);
    // Un seul élément glissé, à l'ancienne : pas de sélection.
    expect(lireSelectionGlissee(glisse({ "application/json": "{}" }))).toBeNull();
    expect(lireSelectionGlissee(glisse({ [TYPE_SELECTION]: "{abîmé" }))).toBeNull();
    // Ce qui est abîmé dedans s'écarte.
    expect(lireSelectionGlissee(glisse({ [TYPE_SELECTION]: JSON.stringify({ elements: [{ id: 3 }], dossiers: ["", "A"] }) })))
      .toEqual({ elements: [], dossiers: ["A"] });
  });
});
