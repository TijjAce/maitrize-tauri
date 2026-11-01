import { describe, expect, it } from "vitest";
import { enColoriage, hexEnRvb } from "./coloriages";

/** Des points RVBA, à la suite. */
const points = (...p: [number, number, number, number][]) => new Uint8ClampedArray(p.flat());
const lire = (t: Uint8ClampedArray) => Array.from({ length: t.length / 4 }, (_, i) => Array.from(t.slice(i * 4, i * 4 + 4)));

describe("une image en coloriage (demande de l'enseignant, 2026-11-01)", () => {
  // Un pictogramme : un fond transparent, un trait noir, un aplat orange, un aplat blanc.
  const picto = points([0, 0, 0, 0], [10, 10, 10, 255], [240, 150, 40, 255], [250, 250, 250, 255]);

  it("garde les traits en noir, blanchit les aplats, laisse le transparent", () => {
    expect(lire(enColoriage(picto))).toEqual([[0, 0, 0, 0], [28, 34, 51, 255], [255, 255, 255, 255], [255, 255, 255, 255]]);
  });

  it("colorie les aplats de la couleur voulue — le blanc d'un pictogramme aussi —, pas les traits", () => {
    expect(lire(enColoriage(picto, hexEnRvb("#e05252")))).toEqual([[0, 0, 0, 0], [28, 34, 51, 255], [224, 82, 82, 255], [224, 82, 82, 255]]);
  });

  it("prend un brun foncé pour un aplat, pas pour un trait : seul le presque noir sans couleur est un trait", () => {
    const pelage = points([110, 60, 25, 255], [40, 40, 45, 255], [20, 30, 90, 255]);
    expect(lire(enColoriage(pelage, hexEnRvb("#4a86e8")))).toEqual([[74, 134, 232, 255], [28, 34, 51, 255], [74, 134, 232, 255]]);
  });

  it("laisse blanc le fond presque blanc d'une photo, qui n'a pas de transparence", () => {
    const photo = points([252, 252, 252, 255], [20, 20, 20, 255], [120, 160, 200, 255]);
    expect(lire(enColoriage(photo, hexEnRvb("#38a169")))).toEqual([[255, 255, 255, 255], [28, 34, 51, 255], [56, 161, 105, 255]]);
    expect(hexEnRvb("#fff")).toEqual([255, 255, 255]);
  });
});
