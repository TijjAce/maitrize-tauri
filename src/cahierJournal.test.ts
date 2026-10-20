import { describe, it, expect } from "vitest";
import { creneauDeLaSemainePrecedente, reprendrePrevu } from "./cahierJournal";
import type { Creneau } from "./api";

const creneau = (p: Partial<Creneau>): Creneau => ({
  id: "x", date: "2026-09-08", heureDebut: "15:00", heureFin: "16:00", matiere: "Yasmine", couleur: "orange",
  seanceId: null, atelierId: null, espaceId: null, elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...p,
});

describe("reprendre le prévu de la semaine dernière", () => {
  const ce_jour = creneau({ id: "auj", date: "2026-09-15" });

  it("retrouve le même créneau : même intitulé à la même heure d'abord", () => {
    const candidats = [
      creneau({ id: "a", heureDebut: "16:00", matiere: "Eliot", prevu: "Durées" }),
      creneau({ id: "b", heureDebut: "15:00", matiere: "yasmine", prevu: "Copie de mots" }),
      creneau({ id: "c", heureDebut: "10:00", matiere: "Yasmine", prevu: "Lecture" }),
    ];
    expect(creneauDeLaSemainePrecedente(ce_jour, candidats)?.id).toBe("b");
  });

  it("à défaut, le même intitulé à une autre heure, puis la même heure", () => {
    expect(creneauDeLaSemainePrecedente(ce_jour, [
      creneau({ id: "h", heureDebut: "15:00", matiere: "Mathématiques", prevu: "Additions" }),
      creneau({ id: "i", heureDebut: "09:00", matiere: "Yasmine", prevu: "Lecture" }),
    ])?.id).toBe("i");
    expect(creneauDeLaSemainePrecedente(ce_jour, [
      creneau({ id: "h", heureDebut: "15:00", matiere: "Mathématiques", prevu: "Additions" }),
    ])?.id).toBe("h");
  });

  it("ignore les créneaux où rien n'était prévu", () => {
    expect(creneauDeLaSemainePrecedente(ce_jour, [creneau({ id: "v", prevu: "  " })])).toBeNull();
  });

  it("ajoute à la suite, sans jamais effacer ni doubler ce qui est écrit", () => {
    expect(reprendrePrevu("", "Copie de mots")).toBe("Copie de mots");
    expect(reprendrePrevu("Évaluation diagnostique\n", "Copie de mots")).toBe("Évaluation diagnostique\nCopie de mots");
    expect(reprendrePrevu("Copie de mots", "Copie de mots")).toBe("Copie de mots");
  });
});

