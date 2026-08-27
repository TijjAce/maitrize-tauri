import { describe, it, expect } from "vitest";
import {
  isoJour, lundiDe, plusJours, jourPlanningInitial, anneeDe,
  toMin, minToHHMM, hhmm, seChevauchent,
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

describe("seChevauchent", () => {
  const a = { debut: "09:00", fin: "10:30" };

  it("détecte un recouvrement partiel", () => {
    expect(seChevauchent(a, { debut: "10:00", fin: "11:00" })).toBe(true);
  });

  it("ignore deux créneaux qui se touchent", () => {
    expect(seChevauchent(a, { debut: "10:30", fin: "11:30" })).toBe(false);
  });

  it("détecte un créneau entièrement contenu dans l'autre", () => {
    expect(seChevauchent(a, { debut: "09:15", fin: "09:45" })).toBe(true);
  });

  it("est symétrique", () => {
    const b = { debut: "10:00", fin: "11:00" };
    expect(seChevauchent(a, b)).toBe(seChevauchent(b, a));
  });
});
