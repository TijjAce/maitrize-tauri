import { describe, it, expect } from "vitest";
import { aplatir, extraitAutour, morceauxCouverts, motifDe, occurrences } from "./rechercheDansPdf";

describe("aplatir le texte d'une page", () => {
  it("enlève accents et casse, garde la longueur utile", () => {
    expect(aplatir(["Élève à l’école"]).texte).toBe("eleve a l'ecole");
  });

  it("réduit les blancs à un seul espace, sans en laisser aux bouts", () => {
    expect(aplatir(["  Le\n\n vilain \t petit  "]).texte).toBe("le vilain petit");
  });

  it("chaque caractère sait de quel morceau il vient", () => {
    const { texte, origine } = aplatir(["Voca", "bulaire"]);
    expect(texte).toBe("vocabulaire");
    expect(origine).toHaveLength(texte.length);
    expect(origine[0]).toBe(0);
    expect(origine[texte.length - 1]).toBe(1);
  });

  it("les ligatures comptent double sans perdre leur origine", () => {
    const { texte, origine } = aplatir(["cœur"]);
    expect(texte).toBe("coeur");
    expect(origine).toEqual([0, 0, 0, 0, 0]);
  });

  it("le même texte, lu d'un bloc ou en morceaux, s'aplatit pareil", () => {
    // Sans cela, le nombre de trouvailles annoncé ne serait pas celui qu'on
    // surligne : le texte brut sépare par des retours, les morceaux non.
    expect(aplatir(["Jeux de\n", "construction "]).texte)
      .toBe(aplatir(["Jeux de construction"]).texte);
  });
});

describe("chercher", () => {
  const page = aplatir(["Entrer dans un vrai ", "échange conversationnel", " avec l'adulte"]);

  it("trouve sans les accents", () => {
    expect(occurrences(page.texte, "echange")).toHaveLength(1);
    expect(occurrences(page.texte, "ÉCHANGE")).toHaveLength(1);
  });

  it("trouve une phrase à cheval sur deux morceaux", () => {
    const o = occurrences(page.texte, "vrai échange");
    expect(o).toHaveLength(1);
    expect(morceauxCouverts(o[0], page.origine)).toEqual([0, 1]);
  });

  it("l'espace manquant entre deux morceaux n'empêche rien", () => {
    // Un PDF découpe « jeux de construction » sans toujours garder l'espace.
    const coupee = aplatir(["jeux de", "construction"]);
    expect(coupee.texte).toBe("jeux deconstruction");
    expect(occurrences(coupee.texte, "de construction")).toHaveLength(1);
  });

  it("compte chaque trouvaille", () => {
    const t = aplatir(["le mot, puis le mot, et encore le mot"]);
    expect(occurrences(t.texte, "le mot")).toHaveLength(3);
  });

  it("une recherche vide ou blanche ne cherche rien", () => {
    expect(motifDe("   ")).toBeNull();
    expect(occurrences(page.texte, "")).toEqual([]);
  });

  it("les caractères spéciaux se cherchent tels quels", () => {
    const t = aplatir(["coût (hors taxes) + 3"]);
    expect(occurrences(t.texte, "(hors taxes)")).toHaveLength(1);
    expect(occurrences(t.texte, "+ 3")).toHaveLength(1);
  });
});

describe("se reconnaître sans y aller", () => {
  it("rend le passage autour de la trouvaille", () => {
    const t = aplatir(["Les situations de communication permettront de servir de base a l'apprentissage"]);
    const [o] = occurrences(t.texte, "servir de base");
    expect(extraitAutour(t.texte, o, 10)).toContain("servir de base");
    expect(extraitAutour(t.texte, o, 10).startsWith("…")).toBe(true);
  });
});
