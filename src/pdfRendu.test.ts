import { describe, it, expect } from "vitest";
import { cadragesAImprimer } from "./pdfRendu";

describe("le cadrage des pages jointes à une impression", () => {
  it("réduit chaque page à la hauteur de son contenu, toutes à la même largeur", () => {
    // Une feuille pleine, et une suite où ne débordent que deux exercices, plus étroits.
    const cadrages = cadragesAImprimer(
      [{ x0: 100, y0: 90, x1: 1400, y1: 1900 }, { x0: 100, y0: 90, x1: 760, y1: 420 }],
      1500, [2121, 2121],
    );
    expect(cadrages).toEqual([{ x0: 82, y0: 72, x1: 1418, y1: 1918 }, { x0: 82, y0: 72, x1: 1418, y1: 438 }]);
  });

  it("ne sort pas une page vide, et garde entière une page sans marge unie", () => {
    const cadrages = cadragesAImprimer([{ x0: 100, y0: 90, x1: 1400, y1: 1900 }, "vide", "entiere"], 1500, [2121, 2121, 2121]);
    expect(cadrages[1]).toBeNull();
    expect(cadrages[2]).toEqual({ x0: 0, y0: 0, x1: 1499, y1: 2120 });
    // Avec une page entière, les autres gardent leur pleine largeur : la même échelle pour toutes.
    expect(cadrages[0]).toEqual({ x0: 0, y0: 72, x1: 1499, y1: 1918 });
    expect(cadragesAImprimer(["vide", "vide"], 1500, [2121, 2121])).toEqual([null, null]);
  });

  it("ne sort pas de la page", () => {
    expect(cadragesAImprimer([{ x0: 3, y0: 2, x1: 1497, y1: 2119 }], 1500, [2121])).toEqual([{ x0: 0, y0: 0, x1: 1499, y1: 2120 }]);
  });
});
