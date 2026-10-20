import { describe, expect, it } from "vitest";
import { sansTrous } from "./gevasco";

const vide = () => ({ nom: "" });

describe("les listes du GEVA-Sco", () => {
  it("n'ont plus de trous : une ligne absente devient une ligne vide", () => {
    // La troisième ligne écrite seule, puis relue de la base : les deux premières sont « null ».
    const relue = JSON.parse(JSON.stringify(Object.assign([], { 2: { nom: "Autre responsable" } })));
    expect(relue).toEqual([null, null, { nom: "Autre responsable" }]);
    expect(sansTrous(relue, vide)).toEqual([{ nom: "" }, { nom: "" }, { nom: "Autre responsable" }]);
  });

  it("s'allongent jusqu'à la ligne qu'on écrit", () => {
    const liste = sansTrous([{ nom: "A" }], vide, 3);
    expect(liste).toHaveLength(3);
    expect(liste[0]).toEqual({ nom: "A" });
    expect(liste.every(Boolean)).toBe(true);
  });

  it("tiennent bon sans liste du tout", () => {
    expect(sansTrous(undefined, vide)).toEqual([]);
    expect(sansTrous(null, vide, 1)).toEqual([{ nom: "" }]);
  });
});
