import { describe, it, expect } from "vitest";
import {
  DEMANDE_CORPUS, corpusDeLaReponse, motsChoisisDeLaReponse, promptChoisirLesMots, promptChoisirLesThemes, promptCorpus, themesChoisisDeLaReponse,
} from "./corpusIa";

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

  it("ne demande que les phrases quand les mots sont déjà là, et les donne", () => {
    const [systeme, user] = promptCorpus({ titre: "Les animaux", descriptif: "", domaines: "", etapes: [] }, { cycle: 2, mots: 0, phrases: 4, avec: ["vache", " poule ", ""] });
    expect(systeme.content).toContain("4 phrases");
    expect(systeme.content).toContain("seulement les phrases");
    expect(systeme.content).toContain("chaque phrase en emploie un ou deux");
    expect(systeme.content).not.toContain("« MOTS »");
    expect(user.content).toBe("Projet : Les animaux\nLes mots du projet : vache, poule");
  });

  it("revient aux mots quand on ne demande rien", () => {
    expect(promptCorpus({ titre: "x", descriptif: "", domaines: "", etapes: [] }, { cycle: 2, mots: 0, phrases: 0 })[0].content).toContain("16 mots");
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

describe("choisir dans la banque", () => {
  const projet = { titre: "La ferme", descriptif: "", domaines: "", etapes: [] };

  it("soumet les mots de la banque et ne garde que ceux-là, dans l'ordre du modèle, sans doublon", () => {
    const [systeme, user] = promptChoisirLesMots(projet, ["vache", "poule", "cochon d'Inde"], 2, 3, ["âne"]);
    expect(systeme.content).toContain("Choisis les 2 mots");
    expect(systeme.content).toContain("cycle 3");
    expect(systeme.content).toContain("Écarte les mots déjà pris");
    expect(user.content).toBe("Projet : La ferme\n\nMots disponibles : vache, poule, cochon d'Inde\nDéjà pris : âne");
    expect(motsChoisisDeLaReponse("1. Poule\n- cochon  d'inde.\nlicorne\npoule\nvache", ["vache", "poule", "cochon d'Inde"], 5))
      .toEqual(["poule", "cochon d'Inde", "vache"]);
    expect(motsChoisisDeLaReponse("vache, poule, cochon d'Inde", ["vache", "poule", "cochon d'Inde"], 2)).toEqual(["vache", "poule"]);
    expect(motsChoisisDeLaReponse("", ["vache"], 3)).toEqual([]);
  });

  it("soumet les thèmes par leur libellé et les rend par leur nom de banque, trois au plus", () => {
    const proposables = [{ nom: "food", libelle: "Aliments" }, { nom: "vegetable", libelle: "Légumes" }, { nom: "fruit", libelle: "Fruits" }, { nom: "clothes", libelle: "Vêtements" }];
    const [systeme, user] = promptChoisirLesThemes(projet, proposables.map((p) => p.libelle));
    expect(systeme.content).toContain("Choisis au plus 3 thèmes");
    expect(user.content).toBe("Projet : La ferme\n\nThèmes : Aliments ; Légumes ; Fruits ; Vêtements");
    expect(themesChoisisDeLaReponse("- Légumes\nlégumes\nAliments\nFruits\nVêtements\nJouets", proposables)).toEqual(["vegetable", "food", "fruit"]);
    expect(themesChoisisDeLaReponse("Rien de tout ça", proposables)).toEqual([]);
  });
});
