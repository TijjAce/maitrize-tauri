import { describe, expect, it } from "vitest";
import { enColoriage, hexEnRvb } from "./coloriages";

/** Des points RVBA, à la suite : une image d'une ligne. */
const points = (...p: [number, number, number, number][]) => new Uint8ClampedArray(p.flat());
const lire = (t: Uint8ClampedArray) => Array.from({ length: t.length / 4 }, (_, i) => Array.from(t.slice(i * 4, i * 4 + 4)));

describe("une image en coloriage (demande de l'enseignant, 2026-11-01)", () => {
  // Un pictogramme : un fond transparent, un trait noir, un aplat orange, un aplat blanc.
  const picto = points([0, 0, 0, 0], [10, 10, 10, 255], [240, 150, 40, 255], [250, 250, 250, 255]);

  it("garde les traits en noir, blanchit les aplats, laisse le transparent", () => {
    expect(lire(enColoriage(picto, 4))).toEqual([[0, 0, 0, 0], [28, 34, 51, 255], [255, 255, 255, 255], [255, 255, 255, 255]]);
  });

  it("colorie les aplats de la couleur voulue — le blanc d'un pictogramme aussi —, pas les traits", () => {
    expect(lire(enColoriage(picto, 4, hexEnRvb("#e05252")))).toEqual([[0, 0, 0, 0], [28, 34, 51, 255], [224, 82, 82, 255], [224, 82, 82, 255]]);
  });

  it("prend un brun foncé pour un aplat, pas pour un trait : seul le presque noir sans couleur est un trait", () => {
    const pelage = points([110, 60, 25, 255], [40, 40, 45, 255], [20, 30, 90, 255]);
    expect(lire(enColoriage(pelage, 3, hexEnRvb("#4a86e8")))).toEqual([[74, 134, 232, 255], [28, 34, 51, 255], [74, 134, 232, 255]]);
  });

  it("laisse blanc le fond presque blanc d'une photo, qui n'a pas de transparence", () => {
    const photo = points([252, 252, 252, 255], [20, 20, 20, 255], [120, 160, 200, 255]);
    expect(lire(enColoriage(photo, 3, hexEnRvb("#38a169")))).toEqual([[255, 255, 255, 255], [28, 34, 51, 255], [56, 161, 105, 255]]);
    expect(hexEnRvb("#fff")).toEqual([255, 255, 255]);
  });

  it("colorie une grande surface noire — le corps du manchot —, bordée d'un trait ; les traits, les rayures et les petites taches restent noirs", () => {
    // 120 × 120 points, sur fond transparent : un disque noir (le corps), un trait fin, une rayure épaisse, une petite tache (un œil), un carré blanc.
    const l = 120;
    const p = new Uint8ClampedArray(l * l * 4);
    const poser = (x: number, y: number, c: number) => p.set([c, c, c, 255], (y * l + x) * 4);
    for (let y = 0; y < l; y++) for (let x = 0; x < l; x++) {
      if ((x - 40) ** 2 + (y - 60) ** 2 <= 35 ** 2) poser(x, y, 10);
      else if ((x - 100) ** 2 + (y - 20) ** 2 <= 4 ** 2) poser(x, y, 10);
      else if (x >= 88 && x <= 112 && y >= 38 && y <= 62) poser(x, y, 250);
      else if (x >= 10 && x <= 110 && (y === 104 || y === 105)) poser(x, y, 10);
      else if (x >= 10 && x <= 110 && y >= 110 && y <= 113) poser(x, y, 10);
    }
    const sortie = enColoriage(p, l, hexEnRvb("#e05252"));
    const en = (x: number, y: number) => Array.from(sortie.slice((y * l + x) * 4, (y * l + x) * 4 + 4));
    const ROUGE = [224, 82, 82, 255], NOIR = [28, 34, 51, 255];
    expect(en(40, 60)).toEqual(ROUGE);
    expect(en(40, 30)).toEqual(ROUGE);
    expect(en(75, 60)).toEqual(NOIR); // le bord du corps
    expect(en(60, 104)).toEqual(NOIR); // le trait fin
    expect(en(60, 111)).toEqual(NOIR); // la rayure, deux fois plus épaisse que le trait, mais moins qu'une surface
    expect(en(100, 20)).toEqual(NOIR); // la petite tache
    expect(en(100, 50)).toEqual(ROUGE);
    expect(en(2, 2)).toEqual([0, 0, 0, 0]);
    // En coloriage, le corps devient blanc, à colorier, et garde son bord.
    const dessin = enColoriage(p, l);
    expect(Array.from(dessin.slice((60 * l + 40) * 4, (60 * l + 40) * 4 + 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(dessin.slice((60 * l + 75) * 4, (60 * l + 75) * 4 + 4))).toEqual(NOIR);
  });
});
