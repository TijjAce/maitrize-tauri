import { describe, it, expect } from "vitest";
import { DEMANDE_CORPUS, corpusDeLaReponse, promptCorpus } from "./corpusIa";

describe("demander un corpus au modèle", () => {
  const projet = { titre: "La soupe de la classe", descriptif: "On cuisine une soupe.", domaines: "Sciences, Autonomie", etapes: ["Acheter les légumes", " ", "Éplucher"] };

  it("décrit le projet, et rien d'autre", () => {
    const [systeme, user] = promptCorpus(projet, DEMANDE_CORPUS);
    expect(systeme.role).toBe("system");
    expect(user.content).toBe("Projet : La soupe de la classe\nDe quoi il s'agit : On cuisine une soupe.\nDomaines : Sciences, Autonomie\nÉtapes : Acheter les légumes ; Éplucher");
    expect(systeme.content).toContain("16 mots");
    expect(systeme.content).toContain("6 phrases");
    expect(systeme.content).toContain("cycle 2");
    expect(systeme.content).toContain("Pas de prénom");
  });

  it("se passe de phrases quand on n'en veut pas, et parle du cycle 3", () => {
    const [systeme, user] = promptCorpus({ titre: "", descriptif: "", domaines: "", etapes: [] }, { cycle: 3, mots: 100, phrases: 0 });
    expect(user.content).toBe("Projet : sans titre");
    expect(systeme.content).toContain("40 mots");
    expect(systeme.content).toContain("Pas de phrases");
    expect(systeme.content).toContain("cycle 3");
  });
});

describe("lire le corpus proposé", () => {
  it("sépare les mots des phrases par leurs en-têtes, et nettoie", () => {
    const rep = "MOTS\n- citrouille\n2. soupe\n**louche**\ncitrouille\nle grand potager de l'école\n\nPHRASES :\n1. « Nous coupons la citrouille. »\n- La soupe est chaude\nNous coupons la citrouille.\n";
    expect(corpusDeLaReponse(rep)).toEqual({
      mots: ["citrouille", "soupe", "louche"],
      phrases: ["Nous coupons la citrouille.", "La soupe est chaude."],
    });
  });

  it("déplie une ligne de mots séparés par des virgules, et lit les en-têtes bavards", () => {
    const rep = "Voici les mots :\ncarotte, poireau, navet.\n\n### Les phrases\nMaman épluche les carottes.";
    expect(corpusDeLaReponse(rep)).toEqual({ mots: ["carotte", "poireau", "navet"], phrases: ["Maman épluche les carottes."] });
  });

  it("devine la partie quand le modèle n'en met pas", () => {
    expect(corpusDeLaReponse("pomme\nJe mange une pomme.\npoire")).toEqual({ mots: ["pomme", "poire"], phrases: ["Je mange une pomme."] });
  });

  it("ne garde ni les marqueurs, ni les vides", () => {
    expect(corpusDeLaReponse("MOTS\n[P1]\n\nPHRASES\n[P1] mange une pomme.\n")).toEqual({ mots: [], phrases: [] });
  });
});
