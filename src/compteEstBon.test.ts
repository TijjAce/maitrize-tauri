import { describe, it, expect } from "vitest";
import { REGLAGES_COMPTE, REGLAGES_COMPTE_CYCLE, comptes, htmlCompteEstBon, type Compte } from "./compteEstBon";

const nombre = (t: string) => Number(t.replace(/ /g, ""));

/** Rejoue la solution : chaque étape est juste, enchaîne la précédente, et n'use chaque nombre qu'une fois. */
function verifier(c: Compte) {
  const restants = [...c.nombres];
  let acc: number | null = null;
  for (const etape of c.solution) {
    const m = etape.match(/^(\S+) ([+−×÷]) (\S+) = (\S+)$/);
    expect(m, etape).not.toBeNull();
    const [, x, op, y, res] = m!;
    const a = nombre(x), b = nombre(y), r = nombre(res);
    expect(op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b).toBe(r);
    const operandes = [a, b];
    if (acc !== null) {
      const k = operandes.indexOf(acc);
      expect(k, `${etape} n'enchaîne pas ${acc}`).toBeGreaterThanOrEqual(0);
      operandes.splice(k, 1);
    }
    for (const o of operandes) {
      const k = restants.indexOf(o);
      expect(k, `${o} n'est pas disponible dans ${etape}`).toBeGreaterThanOrEqual(0);
      restants.splice(k, 1);
    }
    acc = r;
  }
  expect(acc).toBe(c.cible);
}

describe("le compte est bon", () => {
  it("donne des cibles atteignables, jamais l'un des nombres, jamais deux fois la même", () => {
    const liste = comptes(REGLAGES_COMPTE, 3);
    expect(liste).toHaveLength(6);
    for (const c of liste) {
      expect(c.nombres).toHaveLength(4);
      expect(c.nombres).not.toContain(c.cible);
      expect(c.cible).toBeGreaterThanOrEqual(10);
      expect(c.solution.length).toBeGreaterThanOrEqual(2);
      // Cycle 2 : additions et soustractions seulement.
      for (const e of c.solution) expect(e).not.toMatch(/[×÷]/);
      verifier(c);
    }
    expect(new Set(liste.map((c) => c.cible)).size).toBe(6);
    expect(comptes(REGLAGES_COMPTE, 3)).toEqual(liste);
    expect(comptes(REGLAGES_COMPTE, 4)).not.toEqual(liste);
  });

  it("au cycle 3, sort les grandes plaques et les quatre opérations", () => {
    const r = { ...REGLAGES_COMPTE, cycle: 3 as const, problemes: 20, ...REGLAGES_COMPTE_CYCLE[3] };
    const liste = comptes(r, 9);
    expect(liste).toHaveLength(20);
    for (const c of liste) { expect(c.nombres).toHaveLength(5); verifier(c); }
    const etapes = liste.flatMap((c) => c.solution).join("\n");
    expect(etapes).toMatch(/×/);
    expect(etapes).toMatch(/÷/);
    expect(liste.some((c) => c.nombres.some((n) => n >= 25))).toBe(true);
  });

  it("s'imprime six cartes par page, puis le corrigé", () => {
    const r = { ...REGLAGES_COMPTE, problemes: 8 };
    const html = htmlCompteEstBon(comptes(r, 1), r);
    expect((html.match(/class="cb-carte"/g) ?? []).length).toBe(8);
    expect((html.match(/class="page"/g) ?? []).length).toBe(2);
    expect((html.match(/class="page corrige"/g) ?? []).length).toBe(1);
    expect(html).toContain("une solution parmi d'autres");
    expect(html).toContain("Opérations permises : +  −.");
  });
});
