import { describe, it, expect } from "vitest";
import { objectifParId } from "./faitsNumeriques";
import { htmlMateriel, materielPour } from "./materielManipulation";

const pieces = (id: string, tables: number[] = []) => materielPour(objectifParId(id)!, tables).pieces;

describe("le matériel de manipulation de la découverte", () => {
  it("prend boîtes de dix, jetons, cartes à points et bande numérique pour les faits jusqu'à 20", () => {
    expect(pieces("cp-complements-10")).toEqual(["boitesDeDix", "jetons", "cartesAPoints", "bandeNumerique"]);
    expect(pieces("cp-sommes-10")).toEqual(["boitesDeDix", "jetons", "cartesAPoints", "bandeNumerique"]);
    expect(pieces("cp-doubles")).toEqual(["boitesDeDix", "jetons"]);
  });

  it("prend barres et cubes jusqu'à 100, plaques et tableau de numération au-delà", () => {
    expect(pieces("cp-ajouter-9")).toEqual(["barresEtCubes", "tableauCent"]);
    expect(pieces("cp-dix")).toEqual(["barresEtCubes", "tableauCent"]);
    expect(pieces("ce1-dizaines-centaines")).toEqual(["plaquesBarresCubes", "tableauNumeration"]);
  });

  it("prend quadrillages et jetons pour les tables, le glisse-nombre pour multiplier par 10", () => {
    expect(pieces("ce1-table-multiplication", [7])).toEqual(["quadrillages", "jetons"]);
    expect(pieces("cm1-tables-envers", [6])).toEqual(["quadrillages", "jetons"]);
    expect(pieces("ce1-fois-10")).toEqual(["glisseNombre"]);
    expect(pieces("cm1-decimal-fois-10")).toEqual(["glisseNombre", "carreCent"]);
  });

  it("prend bandes unités pour les fractions, carré de cent pour leurs écritures décimales", () => {
    expect(pieces("6e-quarts-demis")).toEqual(["bandesUnites"]);
    // Les relations du CM1 vont jusqu'aux centièmes : le carré de cent s'ajoute aux bandes.
    expect(pieces("cm1-fractions")).toEqual(["carreCent", "bandesUnites"]);
    expect(pieces("6e-fraction-quantite")).toEqual(["bandesUnites", "jetons"]);
    expect(pieces("cm1-ecritures-decimales")).toEqual(["carreCent", "bandesUnites"]);
    expect(pieces("6e-fraction-decimale")).toEqual(["carreCent", "bandesUnites"]);
  });

  it("s'imprime : ce qu'on en fait d'abord, puis chaque pièce sur sa page", () => {
    const m = materielPour(objectifParId("cp-complements-10")!);
    const html = htmlMateriel(m, "CP · Compléments à 10");
    expect((html.match(/<div class="page">/g) ?? []).length).toBe(4);
    expect(html).toContain("Pour la découverte");
    expect(html).toContain("complément à 10");
    expect((html.match(/<circle cx="8"/g) ?? []).length).toBe(40);
    expect(html).toContain("Bande numérique de 0 à 20");
  });
});
