import { describe, it, expect } from "vitest";
import { placeDeLaBulle } from "./CorrigerSelection";

const vue = { defilement: 0, largeur: 600, hauteur: 300 };
const bulle = { largeur: 132, hauteur: 30 };

describe("où poser le bouton de correction", () => {
  it("se pose juste au-dessus du passage, à son début", () => {
    const p = placeDeLaBulle({ x: 80, y: 120, ligne: 20 }, vue, bulle);
    expect(p).toEqual({ gauche: 80, haut: 120 - 30 - 4 });
  });

  it("passe dessous quand le passage touche le haut du champ", () => {
    const p = placeDeLaBulle({ x: 10, y: 4, ligne: 20 }, vue, bulle);
    expect(p!.haut).toBe(4 + 20 + 4);
  });

  it("ne sort jamais du champ par la droite", () => {
    const p = placeDeLaBulle({ x: 580, y: 120, ligne: 20 }, vue, bulle);
    expect(p!.gauche).toBe(600 - 132 - 4);
  });

  it("suit le défilement, et disparaît quand le passage sort de la vue", () => {
    // Le texte a défilé de 100 px : le passage remonte d'autant.
    expect(placeDeLaBulle({ x: 0, y: 200, ligne: 20 }, { ...vue, defilement: 100 }, bulle)!.haut).toBe(100 - 34);
    // Passage remonté au-dessus du champ, ou descendu en dessous : rien.
    expect(placeDeLaBulle({ x: 0, y: 10, ligne: 20 }, { ...vue, defilement: 200 }, bulle)).toBeNull();
    expect(placeDeLaBulle({ x: 0, y: 900, ligne: 20 }, vue, bulle)).toBeNull();
  });
});
