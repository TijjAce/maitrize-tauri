import { describe, it, expect } from "vitest";
import eduscol from "./eduscol.json";

interface Doc { titre: string; url: string; categorie: string; sousCategorie: string }
const DOCS = eduscol as Doc[];

// Chaque entrée est un lien ouvert dans le navigateur de l'enseignant, et
// parfois téléchargé dans le coffre-fort. Les adresses ont été relevées sur
// Éduscol puis vérifiées une à une ; ces tests gardent la forme du fichier.

describe("catalogue Éduscol", () => {
  it("est fourni", () => {
    expect(DOCS.length).toBeGreaterThan(200);
  });

  it("renseigne les quatre champs de chaque entrée", () => {
    for (const d of DOCS) {
      expect(d.titre?.trim(), `titre manquant : ${JSON.stringify(d)}`).toBeTruthy();
      expect(d.url?.trim(), `URL manquante : ${d.titre}`).toBeTruthy();
      expect(d.categorie?.trim(), `catégorie manquante : ${d.titre}`).toBeTruthy();
      expect(d.sousCategorie?.trim(), `sous-catégorie manquante : ${d.titre}`).toBeTruthy();
    }
  });

  it("n'utilise que des adresses https", () => {
    expect(DOCS.filter((d) => !d.url.startsWith("https://")).map((d) => d.titre)).toEqual([]);
  });

  it("ne pointe que vers des domaines officiels", () => {
    const permis = ["eduscol.education.fr", "eduscol.education.gouv.fr", "www.education.gouv.fr"];
    const intrus = DOCS.filter((d) => !permis.some((h) => d.url.startsWith(`https://${h}/`)))
      .map((d) => `${d.titre} → ${d.url}`);
    expect(intrus).toEqual([]);
  });

  it("ne répète pas un document dans une même rubrique", () => {
    // Un même document PEUT figurer sous deux cycles : « Cycles 2, 3, 4 »
    // doit se trouver aussi bien depuis le cycle 2 que depuis le cycle 3.
    // Ce qui n'a pas de sens, c'est de le voir deux fois au même endroit.
    const cles = DOCS.map((d) => `${d.categorie}|${d.sousCategorie}|${d.url.replace(/\/$/, "")}`);
    expect(cles.filter((c, i) => cles.indexOf(c) !== i)).toEqual([]);
  });

  it("ne répète pas un titre dans une même rubrique", () => {
    const cles = DOCS.map((d) => `${d.categorie}|${d.sousCategorie}|${d.titre}`);
    expect(cles.filter((c, i) => cles.indexOf(c) !== i)).toEqual([]);
  });

  it("couvre les dispositifs de scolarisation adaptée", () => {
    // Utile en IME et en Ulis : ces rubriques manquaient entièrement.
    const inclusion = DOCS.filter((d) => d.categorie === "Inclusion");
    expect(inclusion.length).toBeGreaterThanOrEqual(30);
    const sous = new Set(inclusion.map((d) => d.sousCategorie));
    for (const attendu of ["Dispositifs", "AESH", "Handicap", "École inclusive"]) {
      expect(sous.has(attendu), `sous-catégorie absente : ${attendu}`).toBe(true);
    }
  });
});
