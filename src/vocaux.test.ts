import { describe, it, expect } from "vitest";
import {
  creneauDuVocal, creneauRetenu, jourDuVocal, minutesDuVocal, repereDuVocal, verserDansLeBilan,
  vocauxDuJour,
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

describe("une note écrite", () => {
  it("se lit comme une note, pas comme un enregistrement de zéro seconde", () => {
    expect(repereDuVocal({ debut: "2026-09-25T10:12:00", dureeS: 0 })).toBe("10h12 · note écrite");
    expect(repereDuVocal({ debut: "2026-09-25T10:12:00", dureeS: 4 })).toBe("10h12 · 4 s");
  });
});

describe("le créneau retenu", () => {
  const creneaux = [
    { id: "c1", date: "2026-09-25", heureDebut: "09:00", heureFin: "10:00", matiere: "Numération" },
    { id: "c2", date: "2026-09-25", heureDebut: "10:00", heureFin: "11:00", matiere: "Sport" },
  ] as unknown as Creneau[];

  it("suit le téléphone quand il a dit sous quoi il enregistrait", () => {
    // Dicté à 10 h 30, mais sur le créneau de 9 h : on repensait à la séance.
    const v = { debut: "2026-09-25T10:30:00", creneauId: "c1" };
    expect(creneauRetenu(v, creneaux)?.id).toBe("c1");
    expect(creneauDuVocal(v.debut, creneaux)?.id).toBe("c2");
  });

  it("devine à l'heure quand le téléphone n'a rien dit", () => {
    expect(creneauRetenu({ debut: "2026-09-25T10:30:00" }, creneaux)?.id).toBe("c2");
    expect(creneauRetenu({ debut: "2026-09-25T10:30:00", creneauId: "" }, creneaux)?.id).toBe("c2");
  });

  it("ne s'accroche pas à un créneau disparu depuis", () => {
    // Le créneau a été supprimé sur l'ordinateur entre-temps.
    expect(creneauRetenu({ debut: "2026-09-25T09:30:00", creneauId: "parti" }, creneaux)?.id).toBe("c1");
  });
});
