import { describe, it, expect } from "vitest";
import { SECTIONS, compterRempli } from "./ProjetPedagogique";

// Le projet est un document de cadrage rempli une fois par an : sa structure
// doit rester cohérente, et le compteur d'avancement honnête.

describe("trame du projet pédagogique", () => {
  it("couvre les étapes attendues d'un projet", () => {
    expect(SECTIONS.map((s) => s.titre)).toEqual([
      "Contexte", "Le groupe", "Axes de travail", "Organisation pédagogique",
      "Démarches et supports", "Partenariats", "Évaluation du projet",
    ]);
  });

  it("titre et remplit chaque section", () => {
    for (const s of SECTIONS) {
      expect(s.titre.trim()).not.toBe("");
      expect(s.champs.length, `section ${s.titre} vide`).toBeGreaterThan(0);
    }
  });

  it("n'utilise jamais deux fois le même identifiant de champ", () => {
    // Deux champs de même identifiant écriraient au même endroit : saisir
    // l'un effacerait l'autre.
    const ids = SECTIONS.flatMap((s) => s.champs.map((c) => c.id));
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
  });

  it("étiquette tous ses champs", () => {
    for (const s of SECTIONS) {
      for (const c of s.champs) {
        expect(c.label.trim(), `champ ${c.id} sans étiquette`).not.toBe("");
        expect(c.id.trim()).not.toBe("");
      }
    }
  });

  it("porte les champs pré-remplissables attendus", () => {
    // « Pré-remplir » cherche ces identifiants exacts.
    const ids = SECTIONS.flatMap((s) => s.champs.map((c) => c.id));
    expect(ids).toContain("etablissement");
    expect(ids).toContain("anneeScolaire");
  });
});

describe("compterRempli", () => {
  it("compte zéro sur un projet vierge", () => {
    const { remplis, total } = compterRempli({});
    expect(remplis).toBe(0);
    expect(total).toBeGreaterThan(15);
  });

  it("compte les rubriques renseignées", () => {
    expect(compterRempli({ etablissement: "IME Les Tilleuls", axe1: "Autonomie" }).remplis).toBe(2);
  });

  it("ignore une rubrique qui ne contient que des espaces", () => {
    expect(compterRempli({ etablissement: "   " }).remplis).toBe(0);
  });

  it("ignore une clé étrangère à la trame", () => {
    expect(compterRempli({ inconnu: "texte" }).remplis).toBe(0);
  });
});
