import { describe, it, expect } from "vitest";
import {
  creneauDuVocal, jourDuVocal, minutesDuVocal, repereDuVocal, verserDansLeBilan, vocauxDuJour,
} from "./vocaux";
import type { Creneau } from "./api";

const c = (id: string, debut: string, fin: string, date = "2026-09-25"): Creneau =>
  ({ id, date, heureDebut: debut, heureFin: fin, matiere: id, seanceId: null, bilan: "" } as unknown as Creneau);

const jour = [c("langage", "09:00", "09:45"), c("maths", "10:00", "10:45"), c("motricite", "14:00", "15:00")];

describe("retrouver le créneau d'un vocal", () => {
  it("celui qui contient l'heure", () => {
    expect(creneauDuVocal("2026-09-25T10:12:00", jour)?.id).toBe("maths");
    expect(creneauDuVocal("2026-09-25T09:00:00", jour)?.id).toBe("langage");
  });

  it("la fin d'un créneau appartient au suivant, pas à lui", () => {
    // 09:45 est la fin de « langage » : le vocal de 9 h 45 n'est plus dedans.
    expect(creneauDuVocal("2026-09-25T09:45:00", jour)?.id).not.toBe("maths");
  });

  it("juste après la sortie, on rattache au créneau qui vient de finir", () => {
    // On enregistre rarement pendant ; on enregistre en sortant.
    expect(creneauDuVocal("2026-09-25T09:50:00", jour)?.id).toBe("langage");
    expect(creneauDuVocal("2026-09-25T10:55:00", jour)?.id).toBe("maths");
  });

  it("mais on ne devine pas au-delà d'une demi-heure", () => {
    expect(creneauDuVocal("2026-09-25T11:30:00", jour)).toBeNull();
    expect(creneauDuVocal("2026-09-25T12:30:00", jour)).toBeNull();
  });

  it("un autre jour ne compte pas, même à la bonne heure", () => {
    expect(creneauDuVocal("2026-09-24T10:12:00", jour)).toBeNull();
  });

  it("avant le premier créneau, personne", () => {
    expect(creneauDuVocal("2026-09-25T07:30:00", jour)).toBeNull();
  });

  it("une heure illisible ne fait pas tomber la lecture", () => {
    expect(creneauDuVocal("", jour)).toBeNull();
    expect(creneauDuVocal("2026-09-25", jour)).toBeNull();
    expect(minutesDuVocal("n'importe quoi")).toBe(-1);
  });
});

describe("verser un vocal dans un bilan", () => {
  it("ajoute à la suite sans rien écraser", () => {
    expect(verserDansLeBilan("Déjà écrit.", "La suite.")).toBe("Déjà écrit.\nLa suite.");
  });

  it("dans un bilan vide, il est seul", () => {
    expect(verserDansLeBilan("", "Le vocal.")).toBe("Le vocal.");
    expect(verserDansLeBilan("   ", "Le vocal.")).toBe("Le vocal.");
  });

  it("un vocal vide ne touche à rien", () => {
    expect(verserDansLeBilan("Déjà écrit.", "   ")).toBe("Déjà écrit.");
  });
});

describe("lire un vocal en attente", () => {
  it("dit l'heure et la durée", () => {
    expect(repereDuVocal({ debut: "2026-09-25T10:12:00", dureeS: 42 })).toBe("10h12 · 42 s");
    expect(repereDuVocal({ debut: "2026-09-25T10:12:00", dureeS: 95 })).toBe("10h12 · 1 min 35");
  });

  it("reste lisible quand l'heure manque", () => {
    expect(repereDuVocal({ debut: "", dureeS: 3 })).toContain("heure inconnue");
  });
});

describe("les vocaux d'un jour", () => {
  const v = (id: string, debut: string) =>
    ({ id, fichier: "", debut, dureeS: 1, texte: "", etat: "recu", erreur: "", dateCreation: "" });

  it("les rend dans l'ordre où ils ont été dits", () => {
    const liste = [v("b", "2026-09-25T11:00"), v("a", "2026-09-25T09:00"), v("x", "2026-09-24T10:00")];
    expect(vocauxDuJour(liste, "2026-09-25").map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("sait le jour d'un vocal", () => {
    expect(jourDuVocal({ debut: "2026-09-25T10:12:00" })).toBe("2026-09-25");
    expect(jourDuVocal({ debut: "" })).toBe("");
  });
});
