import { describe, it, expect } from "vitest";
import {
  CRITERES, GRAVITES, consigneAnalyse, lireConstats, zoneValide, resume,
} from "./adaptation";

// La réponse d'un modèle n'est jamais garantie : ces tests vérifient qu'une
// sortie abîmée donne moins de constats, jamais un écran cassé ni une zone
// aberrante dessinée sur la fiche de l'enseignant.

const constat = (extra: Record<string, unknown> = {}) => JSON.stringify([{
  element: "Mascotte écureuil", critere: "decor", gravite: "surcharge",
  pourquoi: "Capte l'attention.", suggestion: "Masquer.", zone: [0.8, 0.05, 0.1, 0.1],
  ...extra,
}]);

describe("lecture de la réponse du modèle", () => {
  it("lit un tableau JSON propre", () => {
    const [c] = lireConstats(constat());
    expect(c.element).toBe("Mascotte écureuil");
    expect(c.critere.label).toBe("Décor inutile");
    expect(c.gravite).toBe("surcharge");
    expect(c.zone).toEqual([0.8, 0.05, 0.1, 0.1]);
  });

  it("retrouve le tableau noyé dans du texte ou des balises", () => {
    // Les modèles encadrent volontiers leur JSON ; l'exiger nu ferait perdre
    // une analyse entière pour trois caractères.
    expect(lireConstats("Voici mon analyse :\n```json\n" + constat() + "\n```\nBon courage !")).toHaveLength(1);
  });

  it("rend une liste vide plutôt qu'une erreur sur une réponse illisible", () => {
    for (const mauvais of ["", "je ne sais pas", "[", "[{", "{\"a\":1}", "null", "[1,2,3]"]) {
      expect(() => lireConstats(mauvais)).not.toThrow();
      expect(lireConstats(mauvais)).toEqual([]);
    }
  });

  it("écarte un constat sans élément nommé", () => {
    expect(lireConstats(JSON.stringify([{ critere: "decor", pourquoi: "..." }]))).toEqual([]);
  });

  it("ramène un critère inconnu sur une famille existante", () => {
    const [c] = lireConstats(constat({ critere: "licorne" }));
    expect(CRITERES.some((x) => x.id === c.critere.id)).toBe(true);
  });

  it("ramène une gravité inconnue sur la plus faible", () => {
    expect(lireConstats(constat({ gravite: "catastrophique" }))[0].gravite).toBe("gene");
  });

  it("classe les constats du plus grave au moins grave", () => {
    const json = JSON.stringify([
      { element: "a", gravite: "gene" },
      { element: "b", gravite: "bloquant" },
      { element: "c", gravite: "surcharge" },
    ]);
    expect(lireConstats(json).map((c) => c.element)).toEqual(["b", "c", "a"]);
  });

  it("retient le doute quand le modèle le signale", () => {
    // C'est le garde-fou central : un élément qui porte peut-être l'exercice
    // ne doit pas être coché d'office.
    expect(lireConstats(constat({ incertain: true }))[0].incertain).toBe(true);
    expect(lireConstats(constat())[0].incertain).toBe(false);
  });
});

describe("zones dessinées sur la page", () => {
  it("accepte une zone plausible", () => {
    expect(zoneValide([0.1, 0.2, 0.3, 0.4])).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it("refuse une zone qui couvrirait presque toute la fiche", () => {
    // Encadrer la page entière n'apprend rien et masque le reste.
    expect(zoneValide([0, 0, 1, 1])).toBeUndefined();
    expect(zoneValide([0, 0, 0.95, 0.95])).toBeUndefined();
  });

  it("refuse une zone plate", () => {
    expect(zoneValide([0.5, 0.5, 0, 0.3])).toBeUndefined();
    expect(zoneValide([0.5, 0.5, 0.3, 0.005])).toBeUndefined();
  });

  it("ramène une zone débordante dans la page", () => {
    const z = zoneValide([0.8, 0.9, 0.5, 0.5])!;
    expect(z[0] + z[2]).toBeLessThanOrEqual(1);
    expect(z[1] + z[3]).toBeLessThanOrEqual(1);
  });

  it("refuse ce qui n'est pas quatre nombres", () => {
    for (const mauvais of [undefined, null, [], [1, 2], "0,0,1,1", [0, 0, "a", 1]]) {
      expect(zoneValide(mauvais)).toBeUndefined();
    }
  });
});

describe("consigne envoyée au modèle", () => {
  it("énumère toutes les familles cherchées", () => {
    const c = consigneAnalyse("CE2");
    for (const critere of CRITERES) expect(c).toContain(critere.id);
  });

  it("interdit d'inventer et impose de douter", () => {
    // Ces deux phrases font la valeur de l'outil : sans elles, le modèle
    // proposerait de retirer ce qui porte l'exercice.
    const c = consigneAnalyse("");
    expect(c).toMatch(/N'invente rien/);
    expect(c).toMatch(/incertain/);
    expect(c).toMatch(/Ne conseille jamais de retirer/);
  });

  it("reprend le niveau quand il est donné, et se tait sinon", () => {
    expect(consigneAnalyse("CP")).toContain("de niveau CP");
    expect(consigneAnalyse("")).not.toContain("de niveau");
  });
});

describe("résumé", () => {
  it("compte par gravité et signale les doutes", () => {
    const json = JSON.stringify([
      { element: "a", gravite: "bloquant" },
      { element: "b", gravite: "gene", incertain: true },
      { element: "c", gravite: "gene" },
    ]);
    expect(resume(lireConstats(json))).toEqual({ total: 3, bloquant: 1, surcharge: 0, gene: 2, incertains: 1 });
  });

  it("donne une couleur et un rang à chaque gravité", () => {
    const rangs = Object.values(GRAVITES).map((g) => g.rang);
    expect(new Set(rangs).size).toBe(rangs.length);
  });
});
