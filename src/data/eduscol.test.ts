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
    // cache.media : l'ancien hébergement du ministère, où éduscol envoie encore
    // pour le programme 2020 du cycle 2.
    const permis = ["eduscol.education.fr", "eduscol.education.gouv.fr", "www.education.gouv.fr", "cache.media.education.gouv.fr"];
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

  it("donne les programmes en vigueur à la rentrée 2026 dans chaque cycle", () => {
    const programmes = (cycle: string) => DOCS.filter((d) => d.categorie === cycle && d.sousCategorie === "Programmes & références");
    // Maternelle : programme du BO n° 19 du 7 mai 2026, et sa version consolidée.
    expect(programmes("Cycle 1").some((d) => d.url.includes("programme-cycle-1-consolide"))).toBe(true);
    expect(programmes("Cycle 1").some((d) => d.url.includes("ecole-maternelle-cycle-1-516107"))).toBe(true);
    // Élémentaire : les annexes 2026 de sciences, d'histoire-géographie, d'EPS et de langues.
    for (const [cycle, fichiers] of [
      ["Cycle 2", ["cycle-2-519020", "histoire-geographie-cycle-2", "sportive-cycle-2", "cycle%202%20-481187"]],
      ["Cycle 3", ["cycle-3-519023", "histoire-geographie-cycle-3", "sportive-cycle-3", "cycle%203%29-481190"]],
    ] as const) {
      for (const f of fichiers) expect(programmes(cycle).some((d) => d.url.includes(f)), `${cycle} : ${f}`).toBe(true);
    }
    // Les programmes abrogés n'y figurent plus.
    expect(DOCS.some((d) => /document\/(20062|7883)\/download/.test(d.url))).toBe(false);
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
