import { describe, it, expect } from "vitest";
import { comparerVersions, NOUVEAUTES, nouveautesDepuis } from "./nouveautes";

const liste = [
  { version: "1.6.10", titre: "Dix", points: [{ quoi: "a" }] },
  { version: "1.7.0", titre: "Sept", points: [{ quoi: "b" }] },
  { version: "1.6.9", titre: "Neuf", points: [{ quoi: "c" }] },
];

describe("quoi de neuf", () => {
  it("compare les versions comme on les lit, pas comme du texte", () => {
    expect(comparerVersions("1.6.10", "1.6.9")).toBeGreaterThan(0);
    expect(comparerVersions("1.6.9", "1.6.9")).toBe(0);
    expect(comparerVersions("1.7.0", "1.10.0")).toBeLessThan(0);
    expect(comparerVersions("", "1.0.0")).toBeLessThan(0);
  });

  it("ne montre que ce qui est arrivé depuis la dernière fois, et jamais à la première ouverture", () => {
    expect(nouveautesDepuis("1.6.9", "1.6.10", liste).map((n) => n.version)).toEqual(["1.6.10"]);
    // Rien de plus récent que la version installée.
    expect(nouveautesDepuis("1.6.8", "1.6.10", liste).map((n) => n.version)).toEqual(["1.6.10", "1.6.9"]);
    expect(nouveautesDepuis("1.6.10", "1.6.10", liste)).toEqual([]);
    // Première ouverture : l'app est neuve tout entière, on n'annonce rien.
    expect(nouveautesDepuis("", "1.6.10", liste)).toEqual([]);
  });

  it("garde une liste utilisable : une version, un titre, des points", () => {
    expect(NOUVEAUTES.length).toBeGreaterThan(0);
    for (const n of NOUVEAUTES) {
      expect(n.version).toMatch(/^\d+\.\d+/);
      expect(n.titre.trim()).not.toBe("");
      expect(n.points.length).toBeGreaterThan(0);
      for (const p of n.points) expect(p.quoi.trim()).not.toBe("");
    }
  });
});
