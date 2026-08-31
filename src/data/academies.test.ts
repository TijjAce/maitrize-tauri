import { describe, it, expect } from "vitest";
import academies from "./academies.json";
import eduscol from "./eduscol.json";

interface Doc { titre: string; url: string; categorie: string; sousCategorie: string; source?: string }
const ACAD = academies as Doc[];
const EDUSCOL = eduscol as Doc[];

// Ces documents viennent de rectorats, DSDEN et circonscriptions : ils
// complètent Éduscol là où il est muet. Chaque adresse a été vérifiée ; ces
// tests gardent la cohérence du fichier avec le catalogue Éduscol.

describe("documents académiques", () => {
  it("est fourni", () => {
    expect(ACAD.length).toBeGreaterThanOrEqual(20);
  });

  it("renseigne les cinq champs de chaque entrée", () => {
    for (const d of ACAD) {
      expect(d.titre?.trim(), `titre manquant : ${JSON.stringify(d)}`).toBeTruthy();
      expect(d.url?.trim(), `URL manquante : ${d.titre}`).toBeTruthy();
      expect(d.categorie?.trim(), `catégorie manquante : ${d.titre}`).toBeTruthy();
      expect(d.sousCategorie?.trim(), `sous-catégorie manquante : ${d.titre}`).toBeTruthy();
      expect(d.source?.trim(), `source manquante : ${d.titre}`).toBeTruthy();
    }
  });

  it("n'utilise que des adresses https", () => {
    expect(ACAD.filter((d) => !d.url.startsWith("https://")).map((d) => d.titre)).toEqual([]);
  });

  it("ne provient que de domaines académiques", () => {
    // Un domaine hors « ac-… » signalerait une source non institutionnelle.
    const intrus = ACAD.filter((d) => !/^https:\/\/[^/]*\bac-[a-z-]+\.fr\//.test(d.url))
      .map((d) => `${d.titre} → ${d.url}`);
    expect(intrus).toEqual([]);
  });

  it("nomme l'académie de chaque document", () => {
    expect(ACAD.filter((d) => !/Académie/i.test(d.source ?? "")).map((d) => d.titre)).toEqual([]);
  });

  it("réutilise les rubriques d'Éduscol", () => {
    // L'intérêt de ce catalogue est de se ranger au même endroit : une
    // rubrique inventée ici obligerait à chercher à deux endroits.
    const connues = new Set(EDUSCOL.map((d) => d.categorie));
    const inconnues = [...new Set(ACAD.map((d) => d.categorie))].filter((c) => !connues.has(c));
    expect(inconnues).toEqual([]);
  });

  it("ne répète pas un document dans une même rubrique", () => {
    const cles = ACAD.map((d) => `${d.categorie}|${d.sousCategorie}|${d.url}`);
    expect(cles.filter((c, i) => cles.indexOf(c) !== i)).toEqual([]);
  });

  it("ne redit pas ce qu'Éduscol publie déjà", () => {
    const urls = new Set(EDUSCOL.map((d) => d.url));
    expect(ACAD.filter((d) => urls.has(d.url)).map((d) => d.titre)).toEqual([]);
  });
});
