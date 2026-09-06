import { describe, it, expect } from "vitest";
import { SECTIONS, compterRempli } from "./ProjetPedagogique";

// Le projet est un document de cadrage rempli une fois par an : sa structure
// doit rester cohérente, et le compteur d'avancement honnête.

describe("trame du projet pédagogique", () => {
  it("suit la classification des fonctionnements de Bruno Egron", () => {
    expect(SECTIONS.map((s) => s.titre)).toEqual([
      "Contexte",
      "Conditions de vie familiales",
      "Fonctionnement sensori-moteur",
      "Fonctionnement psycho-affectif",
      "Fonctionnement psycho-social",
      "Fonctionnement cognitif",
      "Relation au savoir",
      "Fonctionnement instrumental",
      "Organisation pédagogique",
      "Partenariats",
      "Évaluation du projet",
    ]);
  });

  it("rappelle sur chaque axe ce que la grille invite à observer", () => {
    // Sans ces repères, la trame ne serait qu'une liste de titres : c'est
    // l'apport de la grille d'Egron.
    const axes = SECTIONS.filter((s) => s.titre.startsWith("Fonctionnement") || s.titre.startsWith("Relation"));
    expect(axes).toHaveLength(6);
    for (const a of axes) {
      expect(a.observer?.length ?? 0, `${a.titre} sans repères d'observation`).toBeGreaterThan(2);
      expect(a.besoins?.length ?? 0, `${a.titre} sans besoins suggérés`).toBeGreaterThan(4);
    }
  });

  it("reprend les items de la grille, pas des intitulés inventés", () => {
    const tout = SECTIONS.flatMap((s) => s.observer ?? []);
    for (const item of ["Coordination motrice globale", "L'estime de soi", "Respecter les règles de vie",
                        "Fatigabilité et attention", "Prise d'informations"]) {
      expect(tout, `item absent : ${item}`).toContain(item);
    }
  });

  it("pose les deux mêmes questions sur chaque axe", () => {
    // « Ce que j'ai observé » puis « ce que je mets en place » : l'ordre que
    // défend Egron, l'analyse après le constat.
    for (const s of SECTIONS.filter((x) => x.observer && x.besoins)) {
      const ids = s.champs.map((c) => c.id);
      expect(ids.some((i) => i.endsWith("Besoins")), `${s.titre} sans champ besoins`).toBe(true);
      expect(ids.some((i) => i.endsWith("Reponses")), `${s.titre} sans champ réponses`).toBe(true);
    }
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
    expect(compterRempli({ etablissement: "IME Les Tilleuls", cognitifBesoins: "Attention courte" }).remplis).toBe(2);
  });

  it("ignore une rubrique qui ne contient que des espaces", () => {
    expect(compterRempli({ etablissement: "   " }).remplis).toBe(0);
  });

  it("ignore une clé étrangère à la trame", () => {
    expect(compterRempli({ inconnu: "texte" }).remplis).toBe(0);
  });
});
