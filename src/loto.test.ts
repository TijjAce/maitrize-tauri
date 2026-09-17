import { describe, it, expect } from "vitest";
import { ajouter, completerAuHasard, imagesConseillees, motsDeLaListe, remplacer, uneImageParMot } from "./loto";

const p = (id: number, mot: string) => ({ id, mot });
const ids = (l: { id: number }[]) => l.map((x) => x.id);

describe("loto", () => {
  it("montre une image par mot, avec le nombre de dessins du même mot", () => {
    const famille = [p(1, "cousin"), p(2, "cousin"), p(3, "Cousin "), p(4, "cousine"), p(5, "maman")];
    expect(uneImageParMot(famille).map((x) => [x.picto.id, x.variantes])).toEqual([[1, 3], [4, 1], [5, 1]]);
  });

  it("lit une liste de mots écrite n'importe comment, sans doublon", () => {
    expect(motsDeLaListe("papa, maman ; bébé\n- frère\n• sœur\n\nPapa,  ")).toEqual(["papa", "maman", "bébé", "frère", "sœur"]);
    expect(motsDeLaListe("  ")).toEqual([]);
  });

  it("ajoute à la suite sans doublon, et remplace un dessin à sa place", () => {
    const sel = ajouter([p(1, "papa")], [p(2, "maman"), p(1, "papa"), p(3, "bébé")]);
    expect(ids(sel)).toEqual([1, 2, 3]);
    expect(ids(remplacer(sel, 2, p(9, "maman")))).toEqual([1, 9, 3]);
    // Le nouveau dessin était déjà choisi : l'ancien s'en va simplement.
    expect(ids(remplacer(sel, 2, p(3, "bébé")))).toEqual([1, 3]);
    expect(remplacer(sel, 2, p(2, "maman"))).toBe(sel);
  });

  it("complète au hasard avec d'autres mots, jamais une image retirée", () => {
    const theme = [p(1, "papa"), p(2, "papa"), p(3, "maman"), p(4, "bébé"), p(5, "frère"), p(6, "sœur")];
    let n = 0;
    const hasard = () => ((n++ * 7) % 10) / 10;
    const sel = completerAuHasard([p(1, "papa")], theme, new Set([4]), 4, hasard);
    expect(sel).toHaveLength(4);
    expect(sel[0].id).toBe(1);
    expect(ids(sel)).not.toContain(2);
    expect(ids(sel)).not.toContain(4);
    expect(new Set(sel.map((x) => x.mot)).size).toBe(4);
    // Le thème est épuisé : on rend ce qu'on a.
    expect(completerAuHasard([], theme, new Set([1, 2, 3, 4]), 10)).toHaveLength(2);
  });

  it("conseille assez d'images pour des planches différentes", () => {
    expect(imagesConseillees(6, 1)).toBe(6);
    expect(imagesConseillees(6, 6)).toBe(12);
    expect(imagesConseillees(4, 2)).toBe(8);
  });
});
