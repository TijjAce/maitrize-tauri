import { describe, it, expect } from "vitest";
import {
  NATURES, couleurNature, nouveauGabarit, redimensionner,
  casesPerdues, poser, remplies, verifier, lireGabarit,
} from "./tla";
import type { CaseTla, Gabarit } from "./api";

// Un tableau de langage vaut par la stabilité de ses emplacements : l'élève
// atteint un mot sans le chercher parce qu'il est toujours à la même case.
// Ces tests protègent cette propriété, que rien à l'écran ne rend visible.

const mot = (m: string, id = 1): CaseTla => ({ pictoId: id, fichier: `${id}.png`, mot: m, nature: "nom" });

function garni(): Gabarit {
  // Grille 4 × 3 avec trois mots posés en (0,0), (3,0) et (1,2).
  let g = nouveauGabarit(4, 3);
  g = poser(g, 0, mot("je", 10));
  g = poser(g, 3, mot("encore", 11));
  g = poser(g, 9, mot("fini", 12));
  return g;
}

const coord = (g: Gabarit, c: number, l: number) => g.cases[l * g.colonnes + c];

describe("gabarit de tableau de langage", () => {
  it("crée une grille complète", () => {
    const g = nouveauGabarit(6, 5);
    expect(g.cases).toHaveLength(30);
    expect(g.cases.every((c) => c.pictoId === null)).toBe(true);
  });

  it("agrandir ne déplace aucune case posée", () => {
    // Le piège : réempiler les cases de gauche à droite décalerait tout.
    const avant = garni();
    const apres = redimensionner(avant, 6, 4);
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 3, 0).mot).toBe("encore");
    expect(coord(apres, 1, 2).mot).toBe("fini");
    expect(apres.cases).toHaveLength(24);
  });

  it("rétrécir puis réagrandir conserve ce qui est resté dans le cadre", () => {
    const avant = garni();
    const apres = redimensionner(redimensionner(avant, 3, 3), 4, 3);
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 1, 2).mot).toBe("fini");
    expect(coord(apres, 3, 0).pictoId).toBeNull(); // sorti du cadre, perdu
  });

  it("annonce les cases perdues avant de rétrécir", () => {
    const g = garni();
    expect(casesPerdues(g, 3, 3)).toBe(1);  // « encore » en colonne 3
    expect(casesPerdues(g, 4, 2)).toBe(1);  // « fini » en ligne 2
    expect(casesPerdues(g, 3, 2)).toBe(2);
    expect(casesPerdues(g, 4, 3)).toBe(0);
    expect(casesPerdues(g, 8, 6)).toBe(0);
  });

  it("poser une case ne touche pas les autres", () => {
    const g = garni();
    const apres = poser(g, 5, mot("aide", 13));
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 3, 0).mot).toBe("encore");
    expect(remplies(apres)).toBe(4);
  });

  it("compte les cases remplies, pas les cases réservées", () => {
    expect(remplies(nouveauGabarit(4, 3))).toBe(0);
    expect(remplies(garni())).toBe(3);
  });
});

describe("contrôle d'un gabarit", () => {
  it("accepte un gabarit sain", () => {
    expect(verifier(garni())).toEqual([]);
  });

  it("refuse une grille qui ne correspond pas au nombre de cases", () => {
    const g = { ...garni(), colonnes: 5 };
    expect(verifier(g).join(" ")).toMatch(/5 × 3/);
  });

  it("refuse un pictogramme sans mot", () => {
    // Le mot est lu à voix haute par l'adulte : une case muette ne sert à rien.
    const g = poser(garni(), 1, { pictoId: 9, fichier: "9.png", mot: "  ", nature: "nom" });
    expect(verifier(g).join(" ")).toMatch(/sans mot/);
  });

  it("refuse un tableau sans nom", () => {
    expect(verifier({ ...garni(), nom: " " }).join(" ")).toMatch(/nom/);
  });
});

describe("import d'un gabarit", () => {
  it("relit un gabarit exporté à l'identique", () => {
    const g = garni();
    const relu = lireGabarit(JSON.stringify(g));
    expect(relu.colonnes).toBe(g.colonnes);
    expect(relu.lignes).toBe(g.lignes);
    expect(relu.cases.map((c) => c.mot)).toEqual(g.cases.map((c) => c.mot));
  });

  it("donne un identifiant neuf, pour ne pas écraser un tableau existant", () => {
    const g = garni();
    expect(lireGabarit(JSON.stringify(g)).id).not.toBe(g.id);
  });

  it("refuse un fichier incohérent plutôt que de le rafistoler", () => {
    // Un gabarit réparé de travers décalerait les cases : c'est exactement le
    // défaut que le tableau doit ne jamais avoir.
    expect(() => lireGabarit(JSON.stringify({ nom: "X", colonnes: 4, lignes: 3, cases: [] })))
      .toThrow(/4 × 3/);
  });

  it("refuse un fichier qui n'est pas un gabarit", () => {
    expect(() => lireGabarit("{}")).toThrow();
  });

  it("ramène une nature inconnue sur « nom »", () => {
    const json = JSON.stringify({
      nom: "X", colonnes: 1, lignes: 1,
      cases: [{ pictoId: 3, fichier: "3.png", mot: "chat", nature: "bidule" }],
    });
    expect(lireGabarit(json).cases[0].nature).toBe("nom");
  });
});

describe("code couleur", () => {
  it("donne une couleur distincte à chaque nature", () => {
    const vues = new Set(NATURES.map((n) => n.couleur));
    expect(vues.size).toBe(NATURES.length);
  });

  it("retombe sur la couleur des noms si la nature est inconnue", () => {
    expect(couleurNature("bidule" as any)).toBe(couleurNature("nom"));
  });

});
