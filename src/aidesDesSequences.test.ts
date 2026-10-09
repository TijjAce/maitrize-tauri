import { describe, it, expect } from "vitest";
import { aidesDeLaSequence, paroleDeLaSequence, seanceDeLaParole } from "./aidesDesSequences";

const s = (titre: string, ...phases: string[]) => ({ titre, phases: phases.map((phase) => ({ phase })) });

describe("les aides à la tâche d'une séquence qu'on crée", () => {
  it("préparent la prise de parole dans la dernière séance qui a un bilan, hors évaluation", () => {
    expect(seanceDeLaParole([s("Découvrir", "Rappel", "Recherche"), s("S'entraîner", "Entraînement", "Bilan"), s("Réinvestir", "Jeu"), s("Évaluation", "Évaluation")])).toBe(1);
    // Sans bilan : celle qui précède l'évaluation ; sans évaluation : la dernière.
    expect(seanceDeLaParole([s("Un", "Jeu"), s("Deux", "Jeu"), s("Évaluation", "Évaluation")])).toBe(1);
    expect(seanceDeLaParole([s("Un", "Jeu"), s("Deux", "Jeu")])).toBe(1);
    expect(seanceDeLaParole([])).toBe(0);
  });

  it("donnent un séquentiel à chaque séance qui a des étapes, et la prise de parole à la séance choisie", () => {
    const tableau = (...phases: string[]) => JSON.stringify([["Phase", "Durée", "Description", "Posture"], ...phases.map((p) => [p, "", "", ""])]);
    const seances = [
      { titre: "Découvrir", numero: 1, tableauDeroulement: tableau("Rappel", "Situation de découverte") },
      { titre: "Sans phases", numero: 2, tableauDeroulement: "[]" },
      { titre: "Bilan", numero: 3, consignes: "Dis ce que tu as appris.", tableauDeroulement: tableau("Bilan") },
    ];
    const aides = aidesDeLaSequence(seances, { titre: "Les doubles" }, { sequentiel: true, parole: 2 });
    expect(aides.map((a) => [a.seance, a.atelier, a.titre])).toEqual([
      [0, "sequentiel", "Ce que je vais faire — Découvrir"],
      [2, "sequentiel", "Ce que je vais faire — Bilan"],
      [2, "priseDeParole", "Je prépare ma prise de parole — Les doubles"],
    ]);
    expect(aidesDeLaSequence(seances, { titre: "x" }, { sequentiel: false, parole: -1 })).toEqual([]);
  });

  it("font dire ce qu'on a appris, le titre de la séquence au centre", () => {
    expect(paroleDeLaSequence({ titre: "  Les doubles  " })).toMatchObject({
      sujet: "Les doubles", modele: "appris", carte: true, debuts: true, cartes: false, de: "aucun",
      branches: ["J'ai appris…", "Je fais comme ça", "Un exemple", "Je me demande…"],
    });
  });
});
