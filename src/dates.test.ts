import { describe, it, expect } from "vitest";
import {
  isoJour, lundiDe, plusJours, moisVoisin, jourPlanningInitial, anneeDe,
  toMin, minToHHMM, hhmm,
} from "./dates";

// Le 1er janvier 2026 est un jeudi ; le 24 août 2026 un lundi.
const jeudi = new Date(2026, 0, 1);
const lundi = new Date(2026, 7, 24);

describe("isoJour", () => {
  it("formate en date locale", () => {
    expect(isoJour(jeudi)).toBe("2026-01-01");
    expect(isoJour(new Date(2026, 8, 5))).toBe("2026-09-05");
  });

  it("ne bascule pas au lendemain le soir (piège de toISOString)", () => {
    // 23 h heure locale : en UTC+2, toISOString donnerait déjà le 2 janvier.
    const soir = new Date(2026, 0, 1, 23, 30);
    expect(isoJour(soir)).toBe("2026-01-01");
  });
});

describe("lundiDe", () => {
  it("recule jusqu'au lundi de la semaine", () => {
    expect(isoJour(lundiDe(jeudi))).toBe("2025-12-29");
  });

  it("laisse un lundi en place", () => {
    expect(isoJour(lundiDe(lundi))).toBe("2026-08-24");
  });

  it("rattache le dimanche à la semaine qui s'achève", () => {
    const dimanche = new Date(2026, 7, 30);
    expect(isoJour(lundiDe(dimanche))).toBe("2026-08-24");
  });

  it("remet l'heure à minuit et ne modifie pas la date reçue", () => {
    const source = new Date(2026, 7, 26, 15, 42, 7);
    const l = lundiDe(source);
    expect([l.getHours(), l.getMinutes(), l.getSeconds()]).toEqual([0, 0, 0]);
    expect(source.getHours()).toBe(15);
  });
});

describe("plusJours", () => {
  it("franchit les fins de mois", () => {
    expect(isoJour(plusJours(new Date(2026, 0, 30), 3))).toBe("2026-02-02");
  });

  it("recule avec un nombre négatif", () => {
    expect(isoJour(plusJours(jeudi, -1))).toBe("2025-12-31");
  });

  it("gère le 29 février d'une année bissextile", () => {
    expect(isoJour(plusJours(new Date(2028, 1, 28), 1))).toBe("2028-02-29");
  });
});

describe("moisVoisin", () => {
  it("ne saute pas de mois les 29, 30 et 31", () => {
    expect(isoJour(moisVoisin(new Date(2027, 0, 31, 12), 1))).toBe("2027-02-28");
    expect(isoJour(moisVoisin(new Date(2028, 0, 31, 12), 1))).toBe("2028-02-29");
    expect(isoJour(moisVoisin(new Date(2026, 9, 31, 12), 1))).toBe("2026-11-30");
  });

  it("recule bien d'un mois, même depuis un 31", () => {
    expect(isoJour(moisVoisin(new Date(2026, 9, 31, 12), -1))).toBe("2026-09-30");
    expect(isoJour(moisVoisin(new Date(2027, 2, 31, 12), -1))).toBe("2027-02-28");
  });

  it("franchit l'année et garde le jour et l'heure", () => {
    const d = moisVoisin(new Date(2026, 11, 15, 12), 1);
    expect(isoJour(d)).toBe("2027-01-15");
    expect(d.getHours()).toBe(12);
  });
});

describe("jourPlanningInitial", () => {
  it("propose aujourd'hui en journée", () => {
    expect(isoJour(jourPlanningInitial(new Date(2026, 7, 26, 10, 0)))).toBe("2026-08-26");
  });

  it("passe au lendemain après 18 h", () => {
    expect(isoJour(jourPlanningInitial(new Date(2026, 7, 26, 18, 30)))).toBe("2026-08-27");
  });

  it("saute le week-end : samedi → lundi", () => {
    expect(isoJour(jourPlanningInitial(new Date(2026, 7, 29, 10, 0)))).toBe("2026-08-31");
  });

  it("saute le week-end : dimanche → lundi", () => {
    expect(isoJour(jourPlanningInitial(new Date(2026, 7, 30, 10, 0)))).toBe("2026-08-31");
  });

  it("vendredi soir renvoie au lundi, pas au samedi", () => {
    expect(isoJour(jourPlanningInitial(new Date(2026, 7, 28, 19, 0)))).toBe("2026-08-31");
  });
});

describe("anneeDe", () => {
  it("bascule au 1er août, pas en septembre", () => {
    expect(anneeDe("2026-07-31")).toBe("2025-2026");
    expect(anneeDe("2026-08-01")).toBe("2026-2027");
    expect(anneeDe("2026-09-01")).toBe("2026-2027");
  });

  it("place le cœur de l'année dans l'année entamée", () => {
    expect(anneeDe("2026-03-15")).toBe("2025-2026");
  });
});

describe("horaires", () => {
  it("convertit dans les deux sens", () => {
    expect(toMin("09:30")).toBe(570);
    expect(minToHHMM(570)).toBe("09:30");
    expect(minToHHMM(toMin("16:05"))).toBe("16:05");
  });

  it("ne casse pas sur une valeur vide", () => {
    expect(toMin("")).toBe(0);
  });

  it("abrège pour l'affichage", () => {
    expect(hhmm("09:00:00")).toBe("09h00");
    expect(hhmm("14:45")).toBe("14h45");
  });
});

