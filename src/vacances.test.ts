import { describe, it, expect } from "vitest";
import { aRafraichir, lireCache, periodeDuJour, periodesDeLAnnee, prochaineVacance, repereDuCache, semainesDeClasse, vacanceDuJour, veille } from "./vacances";

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

describe("la période scolaire d'un jour", () => {
  const annee = [
    { description: "Vacances d'Été", debut: "2026-07-04", fin: "2026-09-01" },
    { description: "Vacances de la Toussaint", debut: "2026-10-17", fin: "2026-11-02" },
    { description: "Vacances de Noël", debut: "2026-12-19", fin: "2027-01-04" },
    { description: "Vacances d'Hiver", debut: "2027-02-06", fin: "2027-02-22" },
    { description: "Vacances de Printemps", debut: "2027-04-03", fin: "2027-04-19" },
    { description: "Pont de l'Ascension", debut: "2027-05-06", fin: "2027-05-10" },
  ];

  it("compte les vacances passées depuis la rentrée", () => {
    expect(periodeDuJour("2026-09-01", annee)).toBe(1);
    expect(periodeDuJour("2026-10-16", annee)).toBe(1);
    expect(periodeDuJour("2026-11-02", annee)).toBe(2);
    expect(periodeDuJour("2027-01-04", annee)).toBe(3);
    expect(periodeDuJour("2027-02-22", annee)).toBe(4);
    // Le pont de l'Ascension ne fait pas une sixième période.
    expect(periodeDuJour("2027-05-20", annee)).toBe(5);
    expect(periodeDuJour("2027-07-02", annee)).toBe(5);
  });

  it("sans le calendrier de l'année, s'en tient aux mois", () => {
    expect(periodeDuJour("2027-09-15", annee)).toBe(1);
    expect(periodeDuJour("2026-12-01", [])).toBe(2);
    expect(periodeDuJour("2027-02-10", [])).toBe(3);
    expect(periodeDuJour("2027-03-30", [])).toBe(4);
    expect(periodeDuJour("2027-06-15", [])).toBe(5);
  });
});

describe("les cinq périodes de l'année", () => {
  const calendrier = [
    { description: "Vacances d'Été", debut: "2026-07-04", fin: "2026-09-01" },
    { description: "Vacances de la Toussaint", debut: "2026-10-17", fin: "2026-11-02" },
    { description: "Vacances de Noël", debut: "2026-12-19", fin: "2027-01-04" },
    { description: "Vacances d'Hiver", debut: "2027-02-20", fin: "2027-03-08" },
    { description: "Vacances de Printemps", debut: "2027-04-17", fin: "2027-05-03" },
    { description: "Pont de l'Ascension", debut: "2027-05-06", fin: "2027-05-10" },
    { description: "Vacances d'Été", debut: "2027-07-03", fin: "2027-09-01" },
  ];

  it("vont de la rentrée à l'été, d'une vacance à l'autre, le dernier jour de classe compris", () => {
    expect(periodesDeLAnnee(calendrier, 2026)).toEqual([
      { numero: 1, debut: "2026-09-01", fin: "2026-10-16" },
      { numero: 2, debut: "2026-11-02", fin: "2026-12-18" },
      { numero: 3, debut: "2027-01-04", fin: "2027-02-19" },
      { numero: 4, debut: "2027-03-08", fin: "2027-04-16" },
      { numero: 5, debut: "2027-05-03", fin: "2027-07-02" },
    ]);
    expect(veille("2027-03-01")).toBe("2027-02-28");
    // 7 + 7 + 7 + 6 + 9 : les trente-six semaines de l'année scolaire.
    expect(semainesDeClasse(periodesDeLAnnee(calendrier, 2026))).toBe(36);
  });

  it("ne donnent rien quand le calendrier de l'année manque", () => {
    expect(periodesDeLAnnee(calendrier, 2027)).toEqual([]);
    expect(periodesDeLAnnee(calendrier.filter((v) => !/Hiver/.test(v.description)), 2026)).toEqual([]);
    expect(periodesDeLAnnee([], 2026)).toEqual([]);
  });
});
