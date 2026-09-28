import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { nombreEnLettres } from "./nombresEnLettres";
import {
  REGLAGES_NUMERATION, chiffresDuTableau, comparer, decomposer, decomposerEnProduits, ecrireNombre, enLettres, encadrement, htmlNumeration,
  nombresNumeration, paireAComparer, type ReglagesNumeration,
} from "./numeration";

const decimaux: ReglagesNumeration = { ...REGLAGES_NUMERATION, decimaux: true, jusqua: 1000, decimales: 2 };

describe("les nombres en lettres au-delà de dix mille", () => {
  it("écrivent les mille, les millions et les milliards comme il faut", () => {
    const cas: [number, string][] = [
      [10000, "dix mille"], [12345, "douze mille trois cent quarante-cinq"], [80000, "quatre-vingt mille"], [200000, "deux cent mille"],
      [1000000, "un million"], [2000000, "deux millions"], [80000000, "quatre-vingts millions"], [200000000, "deux cents millions"],
      [3456789, "trois millions quatre cent cinquante-six mille sept cent quatre-vingt-neuf"], [1000000000, "un milliard"],
      [12000000021, "douze milliards vingt et un"],
    ];
    for (const [n, attendu] of cas) expect(nombreEnLettres(n), String(n)).toBe(attendu);
    expect(nombreEnLettres(1999)).toBe("mille neuf cent quatre-vingt-dix-neuf");
  });
});

describe("la numération du cycle 3", () => {
  it("tire des nombres de tailles variées, sans doublon, et les écrit comme au tableau", () => {
    const alea = hasard(1);
    const nombres = nombresNumeration(REGLAGES_NUMERATION, 10, alea);
    expect(nombres).toHaveLength(10);
    for (const n of nombres) { expect(n.entier).toBeGreaterThanOrEqual(100); expect(n.entier).toBeLessThan(100000); expect(n.dec).toBe(0); }
    expect(new Set(nombres.map((n) => n.entier)).size).toBe(10);
    const decs = nombresNumeration(decimaux, 10, alea);
    for (const n of decs) { expect(n.dec).toBeGreaterThanOrEqual(1); expect(n.dec).toBeLessThan(100); expect(n.dec % 10).not.toBe(0); }
    expect(ecrireNombre({ entier: 3456, dec: 0 }, REGLAGES_NUMERATION)).toBe("3 456");
    expect(ecrireNombre({ entier: 3, dec: 5 }, decimaux)).toBe("3,05");
  });

  it("écrit en lettres, décompose, compare et encadre — juste", () => {
    expect(enLettres({ entier: 3456, dec: 0 }, REGLAGES_NUMERATION)).toBe("trois mille quatre cent cinquante-six");
    expect(enLettres({ entier: 3, dec: 45 }, decimaux)).toBe("trois unités et quarante-cinq centièmes");
    expect(enLettres({ entier: 1, dec: 1 }, decimaux)).toBe("une unité et un centième");
    expect(enLettres({ entier: 21, dec: 5 }, { ...decimaux, decimales: 1 })).toBe("vingt et une unités et cinq dixièmes");
    expect(enLettres({ entier: 0, dec: 7 }, { ...decimaux, decimales: 3 })).toBe("sept millièmes");
    expect(decomposer({ entier: 3406, dec: 0 }, REGLAGES_NUMERATION)).toBe("3 000 + 400 + 6");
    expect(decomposerEnProduits({ entier: 3406, dec: 0 }, REGLAGES_NUMERATION)).toBe("(3 × 1 000) + (4 × 100) + 6");
    expect(decomposer({ entier: 3, dec: 45 }, decimaux)).toBe("3 + 0,4 + 0,05");
    expect(decomposerEnProduits({ entier: 12, dec: 5 }, decimaux)).toBe("(1 × 10) + 2 + (5 × 0,01)");
    expect(comparer({ entier: 3, dec: 5 }, { entier: 3, dec: 45 }, decimaux)).toBe("<");
    expect(comparer({ entier: 3456, dec: 0 }, { entier: 3546, dec: 0 }, REGLAGES_NUMERATION)).toBe("<");
    expect(comparer({ entier: 7, dec: 0 }, { entier: 7, dec: 0 }, REGLAGES_NUMERATION)).toBe("=");
    const alea = hasard(3);
    for (let i = 0; i < 100; i++) {
      const [a, b] = paireAComparer(REGLAGES_NUMERATION, alea);
      expect(a.entier).toBeGreaterThanOrEqual(100);
      expect(b.entier).toBeGreaterThanOrEqual(100);
      const e = encadrement({ entier: 3456, dec: 0 }, REGLAGES_NUMERATION, alea);
      const bas = Number(e.bas.replace(/ /g, "")), haut = Number(e.haut.replace(/ /g, ""));
      expect(bas).toBeLessThanOrEqual(3456);
      expect(haut).toBeGreaterThan(3456);
      expect(haut - bas).toBe(e.pas);
      expect(e.pas * 10).toBeLessThanOrEqual(100000);
    }
    for (let i = 0; i < 30; i++) expect([10, 100]).toContain(encadrement({ entier: 758, dec: 0 }, REGLAGES_NUMERATION, alea).pas);
    expect(encadrement({ entier: 7, dec: 0 }, REGLAGES_NUMERATION, alea).pas).toBe(10);
    const d = encadrement({ entier: 3, dec: 45 }, decimaux, () => 0.9);
    expect(d).toEqual({ pas: 1, bas: "3", haut: "4", libelle: "à l'unité près" });
    const dix = encadrement({ entier: 3, dec: 45 }, decimaux, () => 0.1);
    expect(dix).toEqual({ pas: 0.1, bas: "3,4", haut: "3,5", libelle: "au dixième près" });
  });

  it("place les chiffres dans le tableau, classe par classe", () => {
    expect(chiffresDuTableau({ entier: 3456, dec: 0 }, REGLAGES_NUMERATION, 2)).toEqual(["", "", "3", "4", "5", "6"]);
    expect(chiffresDuTableau({ entier: 12, dec: 5 }, decimaux, 1)).toEqual(["", "1", "2", "0", "5"]);
  });

  it("s'imprime : les exercices choisis, dans l'ordre, puis le corrigé", () => {
    const html = htmlNumeration(REGLAGES_NUMERATION, 9);
    expect(html).toContain("les grands nombres");
    expect(html).toContain("<b>1.</b> Place chaque nombre dans le tableau");
    expect(html).toContain("<b>4.</b> Compare");
    expect(html).not.toContain("Encadre");
    expect(html).toContain('<th colspan="3" class="nu-classe">mille</th>');
    expect(html).not.toContain("millions");
    expect(html).toContain("— corrigé");
    expect(htmlNumeration(REGLAGES_NUMERATION, 9)).toBe(html);
    const dec = htmlNumeration({ ...decimaux, exercices: ["tableau", "encadrer"] }, 2);
    expect(dec).toContain("nombres décimaux");
    expect(dec).toContain("centièmes");
    expect(dec).toContain("Encadre");
    const grands = htmlNumeration({ ...REGLAGES_NUMERATION, jusqua: 1000000000, exercices: ["tableau"] }, 2);
    expect(grands).toContain("millions");
    expect(grands).not.toContain("milliards");
    // Jusqu'à 1 000, les nombres n'ont pas de classe des mille.
    expect(htmlNumeration({ ...decimaux, exercices: ["tableau"] }, 2)).not.toContain(">mille<");
  });
});
