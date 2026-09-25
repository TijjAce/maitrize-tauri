import { describe, it, expect } from "vitest";
import { aRafraichir, lireCache, prochaineVacance, repereDuCache, vacanceDuJour } from "./vacances";

const periodes = [
  { description: "Vacances de la Toussaint", debut: "2026-10-17", fin: "2026-11-02" },
  { description: "Vacances de Noël", debut: "2026-12-19", fin: "2027-01-04" },
];

describe("vacances scolaires", () => {
  it("ne redemande qu'une fois par jour, et si la zone change", () => {
    const hier = repereDuCache("2026-09-24", "A");
    expect(aRafraichir(hier, "2026-09-25", "A")).toBe(true);
    expect(aRafraichir(repereDuCache("2026-09-25", "A"), "2026-09-25", "A")).toBe(false);
    // La zone a changé dans les réglages : le cache ne vaut plus.
    expect(aRafraichir(repereDuCache("2026-09-25", "A"), "2026-09-25", "C")).toBe(true);
    // Jamais demandé.
    expect(aRafraichir("", "2026-09-25", "A")).toBe(true);
  });

  it("supporte un cache vide ou abîmé", () => {
    expect(lireCache(null)).toEqual([]);
    expect(lireCache("")).toEqual([]);
    expect(lireCache("{pas du json")).toEqual([]);
    expect(lireCache('{"description":"seule"}')).toEqual([]);
    expect(lireCache(JSON.stringify(periodes))).toHaveLength(2);
  });

  it("dit si l'on est en vacances, et quelles sont les prochaines", () => {
    expect(vacanceDuJour(periodes, "2026-10-20")).toBe("Vacances de la Toussaint");
    // Le jour de la rentrée n'est plus des vacances.
    expect(vacanceDuJour(periodes, "2026-11-02")).toBeUndefined();
    expect(vacanceDuJour(periodes, "2026-09-25")).toBeUndefined();
    expect(prochaineVacance(periodes, "2026-09-25")?.description).toBe("Vacances de la Toussaint");
    expect(prochaineVacance(periodes, "2026-11-05")?.description).toBe("Vacances de Noël");
    expect(prochaineVacance(periodes, "2027-08-01")).toBeUndefined();
  });
});
