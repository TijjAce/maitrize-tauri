import { describe, it, expect } from "vitest";
import { objectifParId } from "./faitsNumeriques";
import { problemesAssocies, problemesDe, reglagesDeLAtelier } from "./problemesAssocies";

const assoc = (id: string, tables: number[] = []) => problemesAssocies(objectifParId(id)!, tables);

describe("les problèmes qui réinvestissent un calcul", () => {
  it("sont des problèmes partie-tout pour l'addition et la soustraction, à la taille des nombres", () => {
    expect(assoc("cp-complements-10")).toMatchObject({ atelier: "partieTout", inconnue: "partie", max: 10 });
    expect(assoc("cp-sommes-10")).toMatchObject({ atelier: "partieTout", inconnue: "melange", max: 10 });
    expect(assoc("cp-ajouter-9")).toMatchObject({ atelier: "partieTout", inconnue: "tout", max: 100 });
    expect(assoc("ce1-soustraire-9")).toMatchObject({ atelier: "partieTout", inconnue: "partie", max: 1000 });
  });

  it("sont des problèmes multiplicatifs pour les tables, les produits et les divisions", () => {
    expect(assoc("ce1-table-multiplication", [7])).toMatchObject({ atelier: "multiplicatifs", valeurs: [7, 7], types: ["tout", "part", "nombre"] });
    expect(assoc("cm1-tables-envers", [6])).toMatchObject({ atelier: "multiplicatifs", types: ["part", "nombre", "petit"] });
    expect(assoc("ce2-fois-4-8")).toMatchObject({ atelier: "multiplicatifs", types: ["tout", "grand"] });
  });

  it("font des comparaisons « 2 fois plus » des doubles et des moitiés, et se taisent pour décimaux et fractions", () => {
    expect(assoc("cp-doubles")).toMatchObject({ atelier: "multiplicatifs", types: ["grand", "petit"], parts: [2, 2] });
    expect(assoc("ce1-doubles")).toMatchObject({ atelier: "multiplicatifs", parts: [2, 2] });
    expect(assoc("6e-fraction-decimale")).toBeNull();
    expect(assoc("cm2-somme-decimaux")).toBeNull();
    expect(assoc("6e-fraction-quantite")).toBeNull();
  });

  it("se tirent, et règlent l'atelier de problèmes pour s'y ouvrir", () => {
    const a = assoc("cp-sommes-10")!;
    const problemes = problemesDe(a, 4, 3);
    expect(problemes).toHaveLength(4);
    expect(problemes.every((p) => p.enonce.length > 0)).toBe(true);
    expect(reglagesDeLAtelier(a, "Problèmes — sommes")).toEqual({ titre: "Problèmes — sommes", parties: 2, inconnue: "melange", max: 10, perso: false });
    const m = assoc("ce1-table-multiplication", [7])!;
    expect(reglagesDeLAtelier(m, "T")).toMatchObject({ perso: true, valeurMin: 7, valeurMax: 7, partsMin: 2, partsMax: 10 });
    expect(problemesDe(m, 3, 5).every((p) => p.enonce.length > 0)).toBe(true);
  });
});
