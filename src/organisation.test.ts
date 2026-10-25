import { describe, it, expect } from "vitest";
import { organisationPour, tempsDeLaSemaineType, natureDuSlot, creneauxDuFichier } from "./organisation";

const edt = (annee: string, n = 1) => ({ id: annee, annee, slotsJson: JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: `s${i}` }))) });
const lundi14 = new Date(2026, 8, 14);

describe("organisationPour", () => {
  it("prend l'emploi du temps de l'année", () => {
    expect(organisationPour([edt("2025-2026"), edt("2026-2027")], lundi14)?.annee).toBe("2026-2027");
  });
  it("lit encore les organisations IME d'avant la fusion, à l'année puis à la semaine", () => {
    expect(organisationPour([edt("2026-2027·IME")], lundi14)?.annee).toBe("2026-2027·IME");
    expect(organisationPour([edt("IME:2026-09-14")], new Date(2026, 8, 16))?.annee).toBe("IME:2026-09-14");
    // L'emploi du temps de l'année passe avant elles.
    expect(organisationPour([edt("2026-2027·IME"), edt("2026-2027")], lundi14)?.annee).toBe("2026-2027");
  });
  it("ignore un emploi du temps vide ou d'une autre année", () => {
    expect(organisationPour([edt("2026-2027", 0), edt("2025-2026")], lundi14)).toBeNull();
  });
});

describe("tempsDeLaSemaineType", () => {
  const slots = [
    { id: "a", jour: "Lundi", heureDebut: "09:00", heureFin: "10:00", titre: "Zénon", couleur: "blue" },
    { id: "b", jour: "Lundi", heureDebut: "09:30", heureFin: "10:30", titre: "Eliot", couleur: "blue" },
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

describe("importer un emploi du temps", () => {
  it("ne prend qu'un fichier de créneaux, jamais une progression ou une programmation", () => {
    const creneau = { id: "a", jour: "Lundi", heureDebut: "08:30", heureFin: "09:15", titre: "Lecture", couleur: "blue" };
    expect(creneauxDuFichier({ annee: "2026-2027", slots: [creneau] })).toEqual([creneau]);
    expect(creneauxDuFichier([creneau])).toEqual([creneau]);
    expect(creneauxDuFichier({ version: 1, type: "programmation", lignes: [{ id: "l1", label: "Nombres" }] })).toBeNull();
    expect(creneauxDuFichier({ colonnesJson: "[]", cellulesJson: "{}" })).toBeNull();
    expect(creneauxDuFichier({ slots: [] })).toBeNull();
    expect(creneauxDuFichier([{ jour: "Lundi", titre: "x" }])).toBeNull();
  });
});
