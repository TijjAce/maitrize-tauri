import { describe, expect, it } from "vitest";
import { partsDuPrevu, prevuDeLEleve, segmentsDuPrevu } from "./prevuParEleve";

// Prénoms inventés : jamais ceux de la classe.
const prevu = [
  "matériel base 10",
  "Pour Lina: 📚 Les nombres de 10 à 20 · séance 1/6 : Les nombres jusqu'à 9",
  "",
  "Pour Tom :",
  "bande numérique jusqu'à 30 à plastifier.",
  "Pour la séance : le jeu de l'oie",
].join("\n");

describe("le prévu d'un créneau de groupe, élève par élève (demande de l'enseignant, 2026-11-02)", () => {
  it("partage le prévu aux lignes « Pour Prénom : » ; ce qui précède est à tous", () => {
    const { commun, parts } = partsDuPrevu(prevu, ["Lina", "Tom"]);
    expect(commun).toBe("matériel base 10");
    expect(parts.get("Lina")).toBe("📚 Les nombres de 10 à 20 · séance 1/6 : Les nombres jusqu'à 9");
    // « Pour la séance : » ne nomme pas d'élève : la ligne reste dans la part de Tom.
    expect(parts.get("Tom")).toBe("bande numérique jusqu'à 30 à plastifier.\nPour la séance : le jeu de l'oie");
  });

  it("donne à chaque élève ce qui est à tous, puis sa part ; un prévu sans parts reste entier", () => {
    expect(prevuDeLEleve(prevu, "Lina", ["Lina", "Tom"])).toBe("matériel base 10\n📚 Les nombres de 10 à 20 · séance 1/6 : Les nombres jusqu'à 9");
    expect(prevuDeLEleve(prevu, "tom", ["Lina", "Tom"])).toBe("matériel base 10\nbande numérique jusqu'à 30 à plastifier.\nPour la séance : le jeu de l'oie");
    expect(prevuDeLEleve("Lecture à deux", "Lina", ["Lina", "Tom"])).toBe("Lecture à deux");
    // Un élève sans part a ce qui est à tous.
    expect(prevuDeLEleve(prevu, "Zoé", ["Lina", "Tom", "Zoé"])).toBe("matériel base 10");
  });

  it("ouvre une part à plusieurs, sans tenir compte des accents ni des majuscules", () => {
    const { parts } = partsDuPrevu("pour LINA et Zoe : la frise\nPour Tom, Lina : le loto", ["Lina", "Tom", "Zoé"]);
    expect(parts.get("Lina")).toBe("la frise\nle loto");
    expect(parts.get("Zoé")).toBe("la frise");
    expect(parts.get("Tom")).toBe("le loto");
  });

  it("ouvre aussi une part au prénom seul, avec ou sans « : », mais pas à une phrase qui le cite", () => {
    const { commun, parts } = partsDuPrevu("Lina : la frise\nTom\nle loto\nLina et Tom rangent ensemble", ["Lina", "Tom"]);
    expect(parts.get("Lina")).toBe("la frise");
    expect(parts.get("Tom")).toBe("le loto\nLina et Tom rangent ensemble");
    expect(commun).toBe("");
  });

  it("encadre au cahier journal le prénom qui ouvre une part, et rien d'autre", () => {
    const texte = "matériel\nPour Lina : la frise\nTom et Lina : le loto\nLina range.";
    const segments = segmentsDuPrevu(texte, ["Lina", "Tom"]);
    expect(segments.map((s) => s.texte).join("")).toBe(texte);
    expect(segments.filter((s) => s.genre === "cadre").map((s) => s.texte)).toEqual(["Lina", "Tom", "Lina"]);
    expect(segmentsDuPrevu(texte, [])).toEqual([{ texte, genre: "" }]);
  });
});
