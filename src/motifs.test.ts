import { describe, it, expect } from "vitest";
import {
  ELEMENTS_PAR_DEFAUT, EXERCICES_MOTIFS, REGLAGES_MOTIFS, STRUCTURES, avecIntrus, cequiManque, dessinElement, htmlMotifs, nomElement,
  regleDuMotif, reglagesDuNiveau, reglagesMotifsSurs, suiteDuMotif, type ReglagesMotifs,
} from "./motifs";
import { hasard } from "./hasard";

const r = (p: Partial<ReglagesMotifs> = {}): ReglagesMotifs => reglagesMotifsSurs({ ...REGLAGES_MOTIFS, ...p });

describe("les motifs organisés, d'après les livrets de maternelle (2025)", () => {
  it("répètent le motif de base, ou le font grandir étape par étape", () => {
    expect(suiteDuMotif("AB", 6)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(suiteDuMotif("ABB", 6)).toEqual([0, 1, 1, 0, 1, 1]);
    expect(suiteDuMotif("ABBB", 8)).toEqual([0, 1, 1, 1, 0, 1, 1, 1]);
    expect(suiteDuMotif("ABC", 6)).toEqual([0, 1, 2, 0, 1, 2]);
    // A B AA BB AAA BBB ; A B A BB A BBB ; A B AA B AAA B ; A B C AA BB CC.
    expect(suiteDuMotif("evAB", 0)).toEqual([0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1]);
    expect(suiteDuMotif("evABn", 0)).toEqual([0, 1, 0, 1, 1, 0, 1, 1, 1]);
    expect(suiteDuMotif("evAnB", 0)).toEqual([0, 1, 0, 0, 1, 0, 0, 0, 1]);
    expect(suiteDuMotif("evABC", 0, 2)).toEqual([0, 1, 2, 0, 0, 1, 1, 2, 2]);
  });

  it("disent la règle avec les éléments, accordés", () => {
    expect(nomElement({ ...ELEMENTS_PAR_DEFAUT[0] }, "chaussettes")).toBe("une chaussette jaune");
    expect(nomElement({ ...ELEMENTS_PAR_DEFAUT[1] }, "chaussettes", 2)).toBe("deux chaussettes rouges");
    expect(nomElement({ forme: "etoile", couleur: "vert", picto: null, mot: "" }, "formes")).toBe("une étoile verte");
    expect(nomElement({ forme: "carre", couleur: "bleu", picto: null, mot: "" }, "formes", 2)).toBe("deux carrés bleus");
    expect(regleDuMotif(r({ structure: "AB", matiere: "chaussettes" })))
      .toBe("Une chaussette jaune, puis une chaussette rouge, et je recommence, toujours dans le même ordre.");
    expect(regleDuMotif(r({ structure: "ABB", matiere: "formes" }))).toBe("Un rond jaune, puis deux carrés rouges, et je recommence, toujours dans le même ordre.");
    expect(regleDuMotif(r({ niveau: "GS", structure: "evAB", matiere: "formes" })))
      .toBe("D'abord un rond jaune, puis un carré rouge ; puis le motif grandit : un de plus de chaque, à chaque fois.");
  });

  it("se lisent en noir et blanc : chaque chaussette a son tissu, chaque forme sa silhouette", () => {
    const tissus = [0, 1, 2].map((i) => dessinElement(ELEMENTS_PAR_DEFAUT[i], i, "chaussettes", {}));
    expect(tissus[0]).toContain("<circle");
    expect(tissus[1]).toContain('<rect width="12" height="5"');
    expect(tissus[2]).not.toContain("<pattern");
    expect(dessinElement(ELEMENTS_PAR_DEFAUT[0], 0, "formes", {})).toContain("<circle");
    expect(dessinElement(ELEMENTS_PAR_DEFAUT[1], 1, "formes", {})).toContain("<rect");
  });

  it("place l'intrus après les deux premières cases, et il ne suit pas la règle", () => {
    for (let g = 1; g <= 30; g++) {
      const suite = suiteDuMotif("ABB", 9);
      const { cases, place } = avecIntrus(suite, 2, hasard(g));
      expect(place).toBeGreaterThanOrEqual(2);
      expect(cases[place].el).not.toBe(suite[place]);
      expect(cases.filter((c) => c.intrus)).toHaveLength(1);
    }
  });

  it("se règle par niveau, et se répare", () => {
    expect(reglagesDuNiveau("PS")).toMatchObject({ exercice: "fil", structure: "AB", matiere: "chaussettes" });
    expect(reglagesDuNiveau("GS").structure).toBe("evAB");
    expect(reglagesMotifsSurs({ niveau: "XL" as never, structure: "ZZ" as never, combien: 99 })).toMatchObject({ niveau: "PS", structure: "AB", combien: 12 });
    expect(cequiManque(r({ elements: [{ ...ELEMENTS_PAR_DEFAUT[0] }, { ...ELEMENTS_PAR_DEFAUT[0] }, ELEMENTS_PAR_DEFAUT[2]] }))).toMatch(/couleurs différentes/);
    expect(cequiManque(r({ matiere: "pictos", exercice: "completer" }))).toMatch(/images/);
    expect(cequiManque(r())).toBeNull();
  });

  it("fabrique chaque exercice, à chaque niveau où il se fait, sans rien d'indéfini", () => {
    for (const e of EXERCICES_MOTIFS) for (const niveau of e.niveaux) {
      for (const s of STRUCTURES.filter((x) => x.niveaux.includes(niveau))) for (const matiere of ["chaussettes", "formes"] as const) {
        const html = htmlMotifs(r({ niveau, exercice: e.id, structure: s.id, matiere }), {}, hasard(3));
        const ou = `${e.id} ${niveau} ${s.id} ${matiere}`;
        expect(html, ou).not.toMatch(/undefined|NaN|\[object Object\]/);
        expect(html, ou).toContain('class="regle"');
        // Les consignes sont écrites à la première personne.
        expect(html, ou).toMatch(/<div class="regle">J(e |')/);
      }
    }
  });

  it("met dans chaque bande à compléter un trou avant 4 ans, deux à 4 ans, trois à 5 ans, et autant d'éléments à découper", () => {
    for (const [niveau, trous] of [["PS", 1], ["MS", 2], ["GS", 3]] as const) {
      const html = htmlMotifs(r({ niveau, exercice: "completer", structure: "AB", combien: 4 }), {}, hasard(5));
      const page = html.split('<div class="page')[1];
      expect((page.match(/mo-case mo-vide/g) ?? []).length, niveau).toBe(4 * trous);
      expect((html.match(/carte mo-piece/g) ?? []).length, niveau).toBe(4 * trous);
    }
  });

  it("imprime la bande autocorrective au dos, l'intrus repéré ; sans elle, le corrigé", () => {
    const auto = htmlMotifs(r({ niveau: "MS", exercice: "intrus", structure: "ABB", combien: 3 }), {}, hasard(2));
    expect(auto).toContain("Verso");
    expect((auto.match(/mo-intrus/g) ?? []).length).toBe(3);
    const sans = htmlMotifs(r({ niveau: "MS", exercice: "intrus", structure: "ABB", combien: 3, autocorrective: false }), {}, hasard(2));
    expect(sans).toContain('class="page corrige"');
  });
});
