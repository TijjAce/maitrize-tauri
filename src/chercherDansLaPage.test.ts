import { describe, expect, it } from "vitest";
import { aplatirMorceaux, chercherDansLesMorceaux, ouOnEnEst } from "./chercherDansLaPage";

describe("⌘F partout (demande de l'enseignant, 2026-11-01)", () => {
  it("compare sans accents ni casse, et garde la place de chaque caractère dans son morceau", () => {
    const a = aplatirMorceaux(["Le  jeu", " des ", "Poissons"]);
    expect(a.texte).toBe("le jeu des poissons");
    // « P » de « Poissons » : le morceau 2, de 0 à 1.
    const p = a.texte.indexOf("p");
    expect([a.morceau[p], a.debut[p], a.fin[p]]).toEqual([2, 0, 1]);
    expect(aplatirMorceaux(["Séance", "Œuf"]).texte).toBe("seanceoeuf");
  });

  it("trouve un passage à cheval sur deux morceaux, et le rend morceau par morceau", () => {
    const morceaux = ["Mardi : le jeu ", "des poissons", ", puis le jeu des Poissons."];
    const t = chercherDansLesMorceaux(morceaux, "jeu des poissons");
    expect(t).toEqual([
      { de: 0, debut: 11, a: 1, fin: 12 },
      { de: 2, debut: 10, a: 2, fin: 26 },
    ]);
    expect(morceaux[2].slice(10, 26)).toBe("jeu des Poissons");
  });

  it("ne cherche qu'à partir de deux lettres, et ne lie pas la valeur d'un champ à ce qui l'entoure", () => {
    expect(chercherDansLesMorceaux(["Les poissons"], "p")).toEqual([]);
    expect(chercherDansLesMorceaux(["Les poissons"], "   ")).toEqual([]);
    // Le morceau 1 est un champ : « jeu » d'un côté, « des poissons » dans le champ, ne se trouvent pas ensemble.
    expect(chercherDansLesMorceaux(["le jeu ", "des poissons"], "jeu des", (i) => i === 1)).toEqual([]);
    expect(chercherDansLesMorceaux(["le jeu ", "des poissons"], "poissons", (i) => i === 1)).toEqual([{ de: 1, debut: 4, a: 1, fin: 12 }]);
  });

  it("dit où l'on en est", () => {
    expect(ouOnEnEst(2, 12, "jeu")).toBe("3 sur 12");
    expect(ouOnEnEst(0, 0, "jeu")).toBe("Aucun résultat");
    expect(ouOnEnEst(0, 0, "j")).toBe("");
  });
});
