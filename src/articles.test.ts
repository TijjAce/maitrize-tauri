import { describe, it, expect } from "vitest";
import { articleDe, articleEcrit, articleProbable } from "./articles";

describe("« un » ou « une »", () => {
  it("devine le genre des noms courants", () => {
    const un = ["lama", "mur", "marteau", "manège", "masque", "dromadaire", "chat", "vélo", "arbre", "livre", "tigre", "singe", "légume", "nuage", "fromage",
      "téléphone", "squelette", "parapluie", "musée", "camion", "avion", "lion", "crayon", "papillon", "exercice", "cercle", "temple", "problème", "fantôme",
      "été", "pâté", "comité", "père", "hélicoptère", "ventre", "sucre", "coffre", "verre", "âne", "piano", "pyjama", "bateau", "genou", "cheval", "nez"];
    const une = ["mamie", "malle", "fourmi", "musique", "cheminée", "marguerite", "maison", "main", "souris", "table", "chaise", "pomme", "fleur", "nuit", "forêt",
      "voiture", "école", "lune", "banane", "tortue", "robe", "girafe", "vache", "bouche", "télévision", "addition", "région", "santé", "moitié", "image", "plage",
      "cage", "crème", "fenêtre", "lettre", "montre", "chèvre", "chambre", "mère", "sorcière", "terre", "pierre", "police", "actrice", "boucle", "règle", "moto",
      "photo", "eau", "peau", "clé", "pizza", "caméra", "dent", "mer", "couleur", "sœur"];
    for (const m of un) expect([m, articleProbable(m)]).toEqual([m, "un"]);
    for (const m of une) expect([m, articleProbable(m)]).toEqual([m, "une"]);
  });

  it("lit le mot qui commande dans une locution ou un mot composé", () => {
    expect(articleProbable("pomme de terre")).toBe("une");
    expect(articleProbable("grand-mère")).toBe("une");
    expect(articleProbable("grand-père")).toBe("un");
    expect(articleProbable("arc-en-ciel")).toBe("un");
    expect(articleProbable("  La Maison ")).toBe("une");
    expect(articleProbable("")).toBe("");
  });

  it("laisse le dernier mot à l'enseignant", () => {
    expect(articleDe("élève", {})).toBe("un");
    expect(articleDe("Élève", { "élève": "une" })).toBe("une");
    expect(articleDe("ciseaux", { ciseaux: "des" })).toBe("des");
    expect(articleDe("papa", { papa: "" })).toBe("");
    // Un choix qu'on ne connaît pas ne compte pas.
    expect(articleDe("lama", { lama: "le" })).toBe("un");
    expect(articleEcrit("une")).toBe("Une");
    expect(articleEcrit("")).toBe("");
  });
});
