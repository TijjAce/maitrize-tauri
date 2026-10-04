import { describe, it, expect } from "vitest";
import { chercheDans, consignesPour, motsAReprendre } from "./consignesCalcul";

describe("ce que l'élève cherche dans une égalité à trou", () => {
  it("nomme le résultat d'une opération — somme, différence, produit, quotient —", () => {
    expect(chercheDans("6 + 1 = …")).toBe("somme");
    expect(chercheDans("98 − 10 = …")).toBe("difference");
    expect(chercheDans("2 × 6 = …")).toBe("produit");
    expect(chercheDans("14 ÷ 2 = …")).toBe("quotient");
    expect(chercheDans("1/2 + 1/4 = …")).toBe("somme");
    expect(chercheDans("100 × 1/100 = …")).toBe("produit");
  });

  it("reconnaît le terme, le facteur, et ce qui n'est ni l'un ni l'autre", () => {
    expect(chercheDans("4 + … = 5")).toBe("terme");
    expect(chercheDans("9 = 8 + …")).toBe("terme");
    expect(chercheDans("5 760 – … = 5 360")).toBe("terme");
    expect(chercheDans("2 × … = 12")).toBe("facteur");
    expect(chercheDans("60 = 4 × …")).toBe("facteur");
    expect(chercheDans("0,75 = …/4")).toBe("autre");
    expect(chercheDans("double de … = 12")).toBe("autre");
  });

  it("reconnaît doubles, moitiés, écritures décimales et fractions d'une quantité", () => {
    expect(chercheDans("double de 6 = …")).toBe("double");
    expect(chercheDans("moitié de 38 = …")).toBe("moitie");
    expect(chercheDans("9/10 = …")).toBe("decimale");
    expect(chercheDans("5 + 406/1 000 = …")).toBe("decimale");
    expect(chercheDans("2 + 55/100 = …")).toBe("decimale");
    expect(chercheDans("3/10 de 80 = …")).toBe("fractionDe");
  });
});

describe("la consigne juste", () => {
  const sommesJusqua10 = ["2 = 1 + …", "6 + … = 8", "6 + 1 = …", "7 + 2 = …", "3 + … = 5"];

  it("complète des égalités dès que le nombre qui manque est parfois un terme", () => {
    expect(consignesPour(sommesJusqua10)[0]).toBe("Complète les égalités.");
    expect(consignesPour(sommesJusqua10, true)[0]).toBe("Écris le nombre qui manque.");
  });

  it("nomme le résultat quand c'est toujours le même", () => {
    expect(consignesPour(["12 + 9 = …", "87 + 9 = …"])).toEqual(["Calcule les sommes.", "Écris le résultat de chaque addition.", "Complète les égalités."]);
    expect(consignesPour(["889 − 9 = …"])[0]).toBe("Calcule les différences.");
    expect(consignesPour(["4 × 14 = …", "8 × 45 = …"])[0]).toBe("Calcule les produits.");
    expect(consignesPour(["32 ÷ 4 = …"])[0]).toBe("Calcule les quotients.");
    expect(consignesPour(["5 − 1 = …", "69 + 2 = …"])[0]).toBe("Calcule les sommes et les différences.");
    expect(consignesPour(["12 + 9 = …"], true)[0]).toBe("Écris la somme.");
    expect(consignesPour(["double de 6 = …", "moitié de 10 = …"])[0]).toBe("Écris le double ou la moitié de chaque nombre.");
    expect(consignesPour(["9/10 = …", "5 + 406/1 000 = …"])[0]).toBe("Écris chaque nombre en écriture décimale.");
    expect(consignesPour(["3/10 de 80 = …"])[0]).toBe("Calcule la fraction de chaque quantité.");
  });
});

describe("les mots d'une consigne qui ne vont pas à la feuille", () => {
  it("relève « additions » quand on cherche un terme, et propose la consigne juste", () => {
    const [m] = motsAReprendre("Complète les additions:", ["2 = 1 + …", "6 + 1 = …"]);
    expect(m.mot).toBe("additions");
    expect(m.pourquoi).toContain("la somme");
    expect(m.pourquoi).toContain("« 2 = 1 + … », l'élève cherche un terme");
    expect(m.mieux).toBe("Complète les égalités.");
  });

  it("laisse les mots justes : « sommes » sur une feuille de sommes, « égalités » partout", () => {
    expect(motsAReprendre("Calcule les sommes.", ["12 + 9 = …", "87 + 9 = …"])).toEqual([]);
    expect(motsAReprendre("Complète les égalités.", ["2 = 1 + …", "6 + 1 = …"])).toEqual([]);
    expect(motsAReprendre("Écris le résultat.", ["12 + 9 = …", "double de 6 = …"])).toEqual([]);
    expect(motsAReprendre("Écris le résultat.", ["4 + … = 5"]).map((m) => m.mot)).toEqual(["résultat"]);
    expect(motsAReprendre("Calcule les produits.", ["2 × … = 12"]).map((m) => m.mot)).toEqual(["produits"]);
  });
});
