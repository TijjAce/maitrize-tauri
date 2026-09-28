import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { REGLAGES_PYRAMIDES, carreMagique, carreResoluble, htmlPyramides, pyramide, resoluble } from "./pyramides";

describe("les pyramides de nombres", () => {
  it("additionnent en montant, et donnent la base ou des briques mêlées qui suffisent", () => {
    const alea = hasard(2);
    for (let essai = 0; essai < 50; essai++) {
      const p = pyramide(4, 10, "bas", alea);
      expect(p.lignes.map((l) => l.length)).toEqual([4, 3, 2, 1]);
      for (const v of p.lignes[0]) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(10); }
      for (let k = 1; k < 4; k++) for (let i = 0; i < p.lignes[k].length; i++) expect(p.lignes[k][i]).toBe(p.lignes[k - 1][i] + p.lignes[k - 1][i + 1]);
      expect(p.donnees).toEqual([[true, true, true, true], [false, false, false], [false, false], [false]]);
      const m = pyramide(5, 20, "meles", alea);
      expect(m.donnees.flat().filter(Boolean)).toHaveLength(5);
      expect(resoluble(m)).toBe(true);
    }
    // Le sommet seul ne livre rien.
    expect(resoluble({ lignes: [[1, 2, 3], [3, 5], [8]], donnees: [[false, false, false], [false, false], [true]] })).toBe(false);
    // Le sommet et une brique de chaque étage : on redescend.
    expect(resoluble({ lignes: [[1, 2, 3], [3, 5], [8]], donnees: [[true, false, true], [false, false], [true]] })).toBe(false);
    expect(resoluble({ lignes: [[1, 2, 3], [3, 5], [8]], donnees: [[true, false, false], [true, false], [true]] })).toBe(true);
  });

  it("font des carrés magiques, à trous qu'on peut boucher", () => {
    const alea = hasard(5);
    for (const taille of [3, 4] as const) {
      for (let essai = 0; essai < 40; essai++) {
        const c = carreMagique(taille, 40, alea);
        const n = taille;
        for (let i = 0; i < n; i++) {
          expect(c.grille[i].reduce((a, b) => a + b, 0)).toBe(c.somme);
          expect(c.grille.reduce((a, l) => a + l[i], 0)).toBe(c.somme);
        }
        expect(c.grille.reduce((a, l, i) => a + l[i], 0)).toBe(c.somme);
        expect(c.grille.reduce((a, l, i) => a + l[n - 1 - i], 0)).toBe(c.somme);
        for (const v of c.grille.flat()) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(40); }
        expect(new Set(c.grille.flat()).size).toBe(n * n);
        expect(c.donnees.flat().filter((d) => !d).length).toBeGreaterThanOrEqual(taille === 3 ? 4 : 6);
        expect(carreResoluble(c.donnees)).toBe(true);
      }
    }
    expect(carreResoluble([[true, false, false], [true, true, true], [true, false, true]])).toBe(true);
    expect(carreResoluble([[false, false, false], [false, false, false], [true, true, true]])).toBe(false);
  });

  it("s'impriment avec leur corrigé, rejouables", () => {
    const html = htmlPyramides(REGLAGES_PYRAMIDES, 8);
    expect((html.match(/class="py-pyr"/g) ?? []).length).toBe(12);
    expect(html).toContain("Pyramides de nombres — corrigé");
    expect((html.match(/py-trouvee/g) ?? []).length).toBe(6 * 6);
    expect(htmlPyramides(REGLAGES_PYRAMIDES, 8)).toBe(html);
    const carres = htmlPyramides({ ...REGLAGES_PYRAMIDES, forme: "carre", combien: 4 }, 8);
    expect((carres.match(/Somme magique/g) ?? []).length).toBe(8);
    expect(carres).toContain("Carrés magiques — corrigé");
  });
});
