import { describe, it, expect } from "vitest";
import { fr } from "./nombres";

// Les sources de l'application, sans les tests.
const SOURCES = import.meta.glob(["./**/*.ts", "./**/*.tsx", "!./**/*.test.ts", "!./**/*.test.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("l'écriture des nombres", () => {
  it("groupe les milliers et garde les décimales demandées", () => {
    expect(fr(1234567)).toBe("1\u202f234\u202f567");
    expect(fr(2.5, 2)).toBe("2,50");
    expect(fr(-3)).toBe("−3");
  });

  it("ne se passe jamais telle quelle à map : l'index y deviendrait le nombre de décimales (« 2,0 ; 14,00 »)", () => {
    const fautifs = Object.entries(SOURCES).filter(([, texte]) => /\.map\(fr\)/.test(texte)).map(([chemin]) => chemin);
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
    expect(fautifs).toEqual([]);
  });
});
