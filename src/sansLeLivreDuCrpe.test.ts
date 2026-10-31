import { describe, expect, it } from "vitest";

// Un livre de préparation au concours, retiré de l'application et du dépôt (31 octobre 2026) : l'enseignant n'a pas
// les droits d'en adapter le contenu — « tu retires de partout ». Cet essai veille à ce que rien n'en revienne : ni son
// titre, ni ses auteurs, ni un ouvrage qu'on ne connaît que par lui, ni le registre de ses séquences.
//
// Les mots cherchés sont écrits à l'envers : ce fichier ne les contient pas lui-même.
const INTERDITS = ["EPRC nom rissuéR", "uaettoM", "snoP-ciréM", "nedageJ", "shtaM mednaT", "EPRC ud leunam", "leunaMuDsecneuqes"]
  .map((m) => [...m].reverse().join(""));

// Tout ce que src contient en texte, tests compris : le code, les données, les styles, les images vectorielles.
const FICHIERS = import.meta.glob(["./**/*.ts", "./**/*.tsx", "./**/*.json", "./**/*.css", "./**/*.svg"], {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;
/** Ce fichier-ci, par son nom : Vite le laisse déjà hors de sa propre recherche ; on l'écarte quand même, s'il y revenait. */
const CE_FICHIER = `./${new URL(import.meta.url).pathname.split("/").pop()}`;

const plat = (t: string) => t.normalize("NFC").toLowerCase();

describe("le livre de préparation au concours, retiré de partout", () => {
  it("ne laisse aucune trace dans src : ni titre, ni auteurs, ni registre", () => {
    expect(Object.keys(FICHIERS).length).toBeGreaterThan(500);
    const traces = Object.entries(FICHIERS).filter(([chemin]) => chemin !== CE_FICHIER).flatMap(([chemin, texte]) => {
      const t = plat(texte);
      return INTERDITS.filter((m) => t.includes(plat(m))).map((m) => `${chemin} : ${m}`);
    });
    expect(traces).toEqual([]);
  });

  it("cherche bien ce qu'il faut, partout sauf ici", () => {
    expect(CE_FICHIER).toMatch(/^\.\/[^/]+\.test\.ts$/);
    expect(INTERDITS).toHaveLength(7);
    expect(INTERDITS.every((m) => m.length >= 6 && !m.includes("  "))).toBe(true);
    // Un texte qui le citerait serait pris, quelle que soit sa casse.
    const cite = INTERDITS[0].toUpperCase();
    expect(INTERDITS.some((m) => plat(cite).includes(plat(m)))).toBe(true);
  });
});
