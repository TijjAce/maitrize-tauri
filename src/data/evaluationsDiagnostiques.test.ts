import { describe, it, expect } from "vitest";
import { GRILLES, compterRenseignes, compterTotal, type Grille } from "./evaluationsDiagnostiques";

// Ces grilles pilotent un écran générique : une coquille ici ne provoque
// aucune erreur de compilation, mais un item qui en écrase un autre à la
// saisie. D'où ces garde-fous.

describe("catalogue des grilles", () => {
  it("propose les deux grilles attendues", () => {
    expect(GRILLES.map((g) => g.id).sort()).toEqual(["besoins", "observation"]);
  });

  it("cite sa source pour chaque grille", () => {
    // Les deux reprennent un travail publié : l'origine doit rester visible.
    for (const g of GRILLES) expect(g.source.trim(), g.id).not.toBe("");
  });
});

describe.each(GRILLES.map((g) => [g.id, g] as const))("grille %s", (_id, g: Grille) => {
  it("est nommée et présentée", () => {
    expect(g.nom.trim()).not.toBe("");
    expect(g.sousTitre.trim()).not.toBe("");
    expect(g.blocs.length).toBeGreaterThan(0);
  });

  it("n'utilise jamais deux fois le même identifiant de bloc", () => {
    const ids = g.blocs.map((b) => b.id);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
  });

  it("ne répète pas un item à l'intérieur d'un bloc", () => {
    // Deux items identiques partageraient la même case : cocher l'un
    // cocherait l'autre.
    for (const b of g.blocs) {
      const l = b.t === "cases" || b.t === "echelle" ? b.items
        : b.t === "choix" ? b.options
        : b.champs.map((c) => c.id);
      expect(l.filter((x, i) => l.indexOf(x) !== i), `doublon dans ${b.id}`).toEqual([]);
    }
  });

  it("titre et remplit chaque bloc", () => {
    for (const b of g.blocs) {
      expect(b.titre.trim(), `bloc ${b.id} sans titre`).not.toBe("");
      const n = b.t === "cases" || b.t === "echelle" ? b.items.length
        : b.t === "choix" ? b.options.length : b.champs.length;
      expect(n, `bloc ${b.id} vide`).toBeGreaterThan(0);
    }
  });

  it("donne des niveaux si elle contient une échelle", () => {
    const aEchelle = g.blocs.some((b) => b.t === "echelle");
    if (aEchelle) expect(g.niveaux?.length ?? 0).toBeGreaterThan(1);
  });
});

describe("grille des besoins", () => {
  const g = GRILLES.find((x) => x.id === "besoins")!;

  it("couvre les cinq domaines du socle commun", () => {
    const echelles = g.blocs.filter((b) => b.t === "echelle");
    expect(echelles).toHaveLength(5);
  });

  it("reprend les 25 domaines d'observation de Cap école inclusive", () => {
    const items = g.blocs.flatMap((b) => (b.t === "echelle" ? b.items : []));
    expect(items).toHaveLength(25);
    expect(items).toContain("Attention");
    expect(items).toContain("Fluidité de la lecture");
    expect(items).toContain("Respect des règles de vie");
  });

  it("renvoie vers l'outil en ligne, qui seul donne les adaptations", () => {
    expect(g.lien).toMatch(/^https:\/\/www\.reseau-canope\.fr\//);
  });
});

describe("comptage de complétion", () => {
  const g = GRILLES.find((x) => x.id === "observation")!;

  it("compte zéro sur une grille vide", () => {
    expect(compterRenseignes(g, {})).toBe(0);
  });

  it("compte les cases cochées", () => {
    expect(compterRenseignes(g, { motricite: { marche: true, court: true } })).toBe(2);
  });

  it("compte un choix pour un seul point", () => {
    expect(compterRenseignes(g, { lateralite: "droitier" })).toBe(1);
  });

  it("ignore un champ laissé vide ou blanc", () => {
    expect(compterRenseignes(g, { synthese: { remarques: "   " } })).toBe(0);
  });

  it("ne compte pas « Non observé » comme renseigné", () => {
    const b = GRILLES.find((x) => x.id === "besoins")!;
    expect(compterRenseignes(b, { d2: { Attention: "Non observé", Mémoire: "Réussi" } })).toBe(1);
  });

  it("annonce un total cohérent avec le contenu", () => {
    expect(compterTotal(g)).toBeGreaterThan(80);
    expect(compterRenseignes(g, {})).toBeLessThanOrEqual(compterTotal(g));
  });
});
