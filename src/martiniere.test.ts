import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { fr } from "./nombres";
import { FAMILLES_CALCUL, REGLAGES_MARTINIERE, calculsMartiniere, dixiemes, htmlMartiniere, resumeMartiniere, unCalcul, type ReglagesMartiniere } from "./martiniere";

const nombre = (t: string) => Number(t.replace(/ /g, "").replace(",", "."));

describe("le calcul mental La Martinière", () => {
  it("écrit les nombres comme au tableau", () => {
    expect(fr(7)).toBe("7");
    expect(fr(1234)).toBe("1 234");
    expect(fr(1234567)).toBe("1 234 567");
    expect(fr(2.5, 1)).toBe("2,5");
    expect(dixiemes(25)).toBe("2,5");
    expect(dixiemes(40)).toBe("4");
    expect(dixiemes(105)).toBe("10,5");
  });

  it("fait des séries à la taille demandée, rejouables, sans deux fois le même calcul", () => {
    const series = calculsMartiniere(REGLAGES_MARTINIERE, 42);
    expect(series).toHaveLength(2);
    for (const s of series) {
      expect(s).toHaveLength(10);
      for (const c of s) expect(REGLAGES_MARTINIERE.familles).toContain(c.famille);
    }
    const ecrits = series.flat().map((c) => c.ecrit);
    expect(new Set(ecrits).size).toBe(ecrits.length);
    expect(calculsMartiniere(REGLAGES_MARTINIERE, 42)).toEqual(series);
    expect(calculsMartiniere(REGLAGES_MARTINIERE, 43)).not.toEqual(series);
  });

  it("reste dans les bornes de chaque famille, et les réponses sont justes", () => {
    const alea = hasard(7);
    const c2: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, jusqua: 20, tables: [7] };
    for (let i = 0; i < 200; i++) {
      const c = unCalcul("complements", c2, alea)!;
      const a = nombre(c.ecrit.split(" ")[0]);
      expect(c.ecrit).toBe(`${a} + … = 10`);
      expect(nombre(c.reponse)).toBe(10 - a);
      const add = unCalcul("additions", c2, alea)!;
      const [x, y] = add.ecrit.split(" + ").map(nombre);
      expect(x + y).toBeLessThanOrEqual(20);
      expect(nombre(add.reponse)).toBe(x + y);
      const sous = unCalcul("soustractions", c2, alea)!;
      const [m, n] = sous.ecrit.split(" − ").map(nombre);
      expect(m).toBeLessThanOrEqual(20);
      expect(nombre(sous.reponse)).toBe(m - n);
      expect(nombre(sous.reponse)).toBeGreaterThan(0);
      const t = unCalcul("tables", c2, alea)!;
      expect(t.ecrit).toMatch(/^7 × (10|[1-9])$/);
      expect(nombre(t.reponse)).toBe(7 * nombre(t.ecrit.split(" × ")[1]));
      const d = unCalcul("doubles", c2, alea)!;
      expect(nombre(d.reponse)).toBeLessThanOrEqual(20);
      const mo = unCalcul("moities", c2, alea)!;
      expect(nombre(mo.reponse) * 2).toBe(nombre(mo.ecrit.split(" ÷ ")[0]));
    }
    // Les dizaines n'ont pas de sens jusqu'à 10 ; les tables sans table non plus.
    expect(unCalcul("dizaines", { ...c2, jusqua: 10 }, alea)).toBeNull();
    expect(unCalcul("tables", { ...c2, tables: [] }, alea)).toBeNull();
  });

  it("au cycle 3, divise, multiplie par 10, complète à 100 et à 1 000, et calcule en dixièmes", () => {
    const alea = hasard(11);
    const c3: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, cycle: 3, jusqua: 1000, tables: [6, 8] };
    const cibles = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const div = unCalcul("divisions", c3, alea)!;
      const [p, q] = div.ecrit.split(" ÷ ").map(nombre);
      expect([6, 8]).toContain(q);
      expect(p / q).toBe(nombre(div.reponse));
      const f = unCalcul("fois10", c3, alea)!;
      const [n, k] = f.ecrit.split(" × ").map(nombre);
      expect([10, 100, 1000]).toContain(k);
      expect(nombre(f.reponse)).toBe(n * k);
      const c = unCalcul("complements", c3, alea)!;
      cibles.add(nombre(c.ecrit.split(" = ")[1]));
      const dec = unCalcul("decimaux", c3, alea)!;
      expect(dec.reponse).toMatch(/^\d+(,\d)?$/);
      const [u, v] = dec.ecrit.split(/ [+−] /).map(nombre);
      expect(Math.round((dec.ecrit.includes("+") ? u + v : u - v) * 10)).toBe(Math.round(nombre(dec.reponse) * 10));
      expect(nombre(dec.reponse)).toBeGreaterThan(0);
    }
    expect([...cibles].sort()).toEqual([100, 1000]);
  });

  it("s'imprime : la fiche du maître, puis deux ardoises par page", () => {
    const series = calculsMartiniere(REGLAGES_MARTINIERE, 5);
    const html = htmlMartiniere(series, REGLAGES_MARTINIERE);
    expect(html).toContain("procédé La Martinière");
    expect(html).toContain("<caption>Série 1</caption>");
    expect(html).toContain("<caption>Série 2</caption>");
    expect(html).toContain("5 secondes");
    expect((html.match(/class="ma-case"/g) ?? []).length).toBe(2 * 20);
    expect((html.match(/class="ma-ardoise"/g) ?? []).length).toBe(2);
    expect(htmlMartiniere(series, { ...REGLAGES_MARTINIERE, ardoises: false })).not.toContain("ma-case");
    // Au-delà de quarante calculs, une seule ardoise par page.
    const longues = calculsMartiniere({ ...REGLAGES_MARTINIERE, parSerie: 15, series: 3 }, 5);
    expect((htmlMartiniere(longues, { ...REGLAGES_MARTINIERE, parSerie: 15, series: 3 }).match(/class="ma-ardoise"/g) ?? []).length).toBe(1);
    expect(resumeMartiniere(REGLAGES_MARTINIERE)).toBe("Cycle 2 · compléments, additions, soustractions, doubles · nombres jusqu'à 20 · 2 séries de 10 calculs.");
    expect(FAMILLES_CALCUL.filter((f) => f.cycles.includes(2)).length).toBe(8);
  });
});
