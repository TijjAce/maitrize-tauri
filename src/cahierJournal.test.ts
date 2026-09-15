import { describe, it, expect } from "vitest";
import { creneauDeLaSemainePrecedente, reprendrePrevu, elevesCites, dateObservation } from "./cahierJournal";
import type { Creneau, Eleve } from "./api";

const creneau = (p: Partial<Creneau>): Creneau => ({
  id: "x", date: "2026-09-08", heureDebut: "15:00", heureFin: "16:00", matiere: "Yolanda", couleur: "orange",
  seanceId: null, atelierId: null, espaceId: null, elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...p,
});
const eleve = (id: string, nom: string): Eleve => ({ id, nom, niveau: "", present: true, ine: "", dateNaissance: "", photoFichier: null });

describe("reprendre le prévu de la semaine dernière", () => {
  const ce_jour = creneau({ id: "auj", date: "2026-09-15" });

  it("retrouve le même créneau : même intitulé à la même heure d'abord", () => {
    const candidats = [
      creneau({ id: "a", heureDebut: "16:00", matiere: "Ethan", prevu: "Durées" }),
      creneau({ id: "b", heureDebut: "15:00", matiere: "yolanda", prevu: "Copie de mots" }),
      creneau({ id: "c", heureDebut: "10:00", matiere: "Yolanda", prevu: "Lecture" }),
    ];
    expect(creneauDeLaSemainePrecedente(ce_jour, candidats)?.id).toBe("b");
  });

  it("à défaut, le même intitulé à une autre heure, puis la même heure", () => {
    expect(creneauDeLaSemainePrecedente(ce_jour, [
      creneau({ id: "h", heureDebut: "15:00", matiere: "Mathématiques", prevu: "Additions" }),
      creneau({ id: "i", heureDebut: "09:00", matiere: "Yolanda", prevu: "Lecture" }),
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

describe("porter le bilan au dossier", () => {
  const eleves = [eleve("y", "Yolanda Martin"), eleve("e", "Ethan Roux"), eleve("a", "Aurélien Petit")];

  it("coche le seul élève du créneau", () => {
    expect(elevesCites("A bien copié les mots.", eleves, ["y"])).toEqual(["y"]);
  });

  it("sinon, coche les élèves dont le prénom est cité, accents ou non", () => {
    expect(elevesCites("Ethan a eu du mal ; aurelien a terminé.", eleves, [])).toEqual(["e", "a"]);
    expect(elevesCites("Travail en autonomie.", eleves, ["y", "e"])).toEqual([]);
    // Un prénom cité mais absent du créneau n'est pas coché d'office.
    expect(elevesCites("Aurélien est venu aider.", eleves, ["y", "e"])).toEqual([]);
  });

  it("date l'observation de la fin du créneau", () => {
    const d = new Date(dateObservation(creneau({ date: "2026-09-15", heureFin: "16:30" })));
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 15, 16, 30]);
  });
});
