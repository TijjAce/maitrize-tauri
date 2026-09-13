import { describe, it, expect } from "vitest";
import { organisationPour, tempsDeLaSemaineType, natureDuSlot } from "./organisation";

const edt = (annee: string, n = 1) => ({ id: annee, annee, slotsJson: JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: `s${i}` }))) });
const lundi14 = new Date(2026, 8, 14);

describe("organisationPour", () => {
  it("en IME, prend l'organisation fixe de l'année", () => {
    const r = organisationPour([edt("2026-2027"), edt("2026-2027·IME")], lundi14, true);
    expect(r?.edt.annee).toBe("2026-2027·IME");
    expect(r?.source).toBe("ime");
  });
  it("retrouve encore une ancienne organisation IME semaine par semaine", () => {
    expect(organisationPour([edt("IME:2026-09-14")], new Date(2026, 8, 16), true)?.edt.annee).toBe("IME:2026-09-14");
  });
  it("en classe, prend la trame de classe, puis l'IME à défaut", () => {
    expect(organisationPour([edt("2026-2027"), edt("2026-2027·IME")], lundi14, false)?.edt.annee).toBe("2026-2027");
    expect(organisationPour([edt("2026-2027·IME")], lundi14, false)?.edt.annee).toBe("2026-2027·IME");
  });
  it("ignore une organisation vide ou d'une autre année", () => {
    expect(organisationPour([edt("2026-2027·IME", 0), edt("2025-2026·IME")], lundi14, true)).toBeNull();
  });
});

describe("tempsDeLaSemaineType", () => {
  const slots = [
    { id: "a", jour: "Lundi", heureDebut: "09:00", heureFin: "10:00", titre: "Zéphir", couleur: "blue" },
    { id: "b", jour: "Lundi", heureDebut: "09:30", heureFin: "10:30", titre: "Ethan", couleur: "blue" },
    { id: "c", jour: "Mardi", heureDebut: "16:30", heureFin: "18:00", titre: "Synthèse", couleur: "blue" },
    { id: "d", jour: "Jeudi", heureDebut: "13:30", heureFin: "14:00", titre: "Temps d’échange", couleur: "blue", nature: "reunion" as const },
    { id: "e", jour: "Jeudi", heureDebut: "13:00", heureFin: "13:45", titre: "Piscine", couleur: "blue" },
    { id: "f", jour: "Samedi", heureDebut: "09:00", heureFin: "12:00", titre: "Hors semaine", couleur: "blue" },
  ];
  it("compte classe et réunions, nature choisie ou devinée, groupes simultanés une fois", () => {
    const { semaine, jours } = tempsDeLaSemaineType(slots);
    expect(jours.Lundi).toEqual({ classe: 90, reunion: 0, total: 90 });
    expect(jours.Mardi).toEqual({ classe: 0, reunion: 90, total: 90 });
    // Jeudi : 13:00–13:45 en classe, 13:30–14:00 en réunion → 1 h couverte.
    expect(jours.Jeudi).toEqual({ classe: 45, reunion: 30, total: 60 });
    expect(semaine).toEqual({ classe: 135, reunion: 120, total: 240 });
  });
  it("devine la nature d'après l'intitulé si elle n'est pas choisie", () => {
    expect(natureDuSlot(slots[2])).toBe("reunion");
    expect(natureDuSlot({ ...slots[2], nature: "classe" })).toBe("classe");
  });
});
