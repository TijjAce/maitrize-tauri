import { describe, it, expect } from "vitest";
import { minutesParNature, natureDepuisTitre, duree, plageGrille } from "./heures";

describe("minutesParNature", () => {
  it("additionne les créneaux de classe et de réunion séparément", () => {
    expect(minutesParNature([
      { date: "2026-09-14", heureDebut: "09:00", heureFin: "10:00" },
      { date: "2026-09-14", heureDebut: "10:00", heureFin: "11:30", nature: "classe" },
      { date: "2026-09-15", heureDebut: "16:30", heureFin: "18:00", nature: "reunion" },
    ])).toEqual({ classe: 150, reunion: 90 });
  });

  it("deux groupes pris en même temps ne comptent qu'une fois", () => {
    expect(minutesParNature([
      { date: "2026-09-14", heureDebut: "14:00", heureFin: "15:00" },
      { date: "2026-09-14", heureDebut: "14:30", heureFin: "15:30" },
    ]).classe).toBe(90);
  });

  it("le même horaire deux jours différents compte deux fois", () => {
    expect(minutesParNature([
      { date: "2026-09-14", heureDebut: "09:00", heureFin: "10:00" },
      { date: "2026-09-15T00:00:00", heureDebut: "09:00", heureFin: "10:00" },
    ]).classe).toBe(120);
  });

  it("ignore un créneau à l'envers ou vide", () => {
    expect(minutesParNature([{ date: "2026-09-14", heureDebut: "10:00", heureFin: "09:00" }]).classe).toBe(0);
  });
});

describe("natureDepuisTitre", () => {
  it("reconnaît les réunions et formations", () => {
    for (const t of ["Réunion d’équipe", "Synthèse Apolline", "Formation autisme", "Conseil de cycle",
                     "ESS Léo", "Équipe de suivi", "Concertation", "Animation pédagogique"]) {
      expect(natureDepuisTitre(t), t).toBe("reunion");
    }
  });
  it("laisse en classe les intitulés ambigus ou ordinaires", () => {
    for (const t of ["Zéphir", "Jeux d’équipe", "Projet jardin", "Français", "Conseil des élèves"]) {
      expect(natureDepuisTitre(t), t).toBe("classe");
    }
  });
});

describe("duree", () => {
  it("écrit les durées comme on les dit", () => {
    expect(duree(1470)).toBe("24 h 30");
    expect(duree(180)).toBe("3 h");
    expect(duree(45)).toBe("45 min");
    expect(duree(0)).toBe("0 h");
  });
});

describe("plageGrille", () => {
  it("va de 8h à 20h par défaut", () => {
    expect(plageGrille([])).toEqual({ debut: 8, fin: 20 });
    expect(plageGrille([{ heureDebut: "17:00", heureFin: "18:30" }])).toEqual({ debut: 8, fin: 20 });
  });

  it("s'élargit pour qu'aucun créneau ne déborde", () => {
    expect(plageGrille([{ heureDebut: "19:30", heureFin: "20:15" }])).toEqual({ debut: 8, fin: 21 });
    expect(plageGrille([{ heureDebut: "07:45", heureFin: "08:30" }])).toEqual({ debut: 7, fin: 20 });
    // Un créneau mal saisi (fin avant le début) n'étire rien.
    expect(plageGrille([{ heureDebut: "23:00", heureFin: "01:00" }])).toEqual({ debut: 8, fin: 20 });
  });
});

