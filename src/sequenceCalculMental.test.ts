import { describe, it, expect, vi, beforeEach } from "vitest";

const enregistres = { sequences: [] as any[], seances: [] as any[], feuilles: [] as any[] };
let compteur = 0;
vi.mock("./api", () => ({
  api: {
    sequenceSave: async (s: unknown) => { enregistres.sequences.push(s); },
    seanceSave: async (s: unknown) => { enregistres.seances.push(s); },
  },
  newId: () => `id-${++compteur}`,
  nowIso: () => "2026-10-05T08:00:00.000Z",
  anneeScolaireActuelle: () => "2026-2027",
  couleurPourMatiere: () => "indigo",
}));
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string) => {
    enregistres.feuilles.push({ atelier, titre, html, seanceId, sequenceId });
  },
}));
vi.mock("./vacances", () => ({ chargerVacances: async () => [], periodeDuJour: () => 1 }));

import { REGLAGES_MARTINIERE } from "./martiniere";
import { demarcheDe } from "./demarches";
import {
  DEMARCHE_CALCUL_MENTAL, FEUILLES_DE_LA_SEQUENCE, SEANCE_DES_PROBLEMES, creerLaSequenceDeCalcul, objectifsDeLaSequence, reglagesDeLaFeuille,
  titreDeLaSequence,
} from "./sequenceCalculMental";

const r = { ...REGLAGES_MARTINIERE, niveau: "CP" as const, objectifs: ["cp-complements-10"] };

describe("la séquence de calcul mental", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("pose une feuille dans chaque séance : découverte, entraînements, réinvestissement, évaluation finale", () => {
    const d = demarcheDe(DEMARCHE_CALCUL_MENTAL)!;
    const titres = FEUILLES_DE_LA_SEQUENCE.map((f) => d.seances[f.seance].titre);
    expect(titres[0]).toContain("Découverte");
    expect(FEUILLES_DE_LA_SEQUENCE[0].forme).toBe("decouverte");
    expect(titres.slice(1, 4).every((t) => t.includes("La Martinière"))).toBe(true);
    expect(titres[4]).toContain("Réinvestissement");
    expect(d.seances[SEANCE_DES_PROBLEMES].titre).toContain("Réinvestissement");
    expect(titres[5]).toBe("Évaluation finale");
    expect(FEUILLES_DE_LA_SEQUENCE[5].forme).toBe("evaluation");
  });

  it("se nomme d'après l'objectif, et dit l'attendu de fin d'année", () => {
    expect(titreDeLaSequence(r)).toMatch(/^Calcul mental — .+ \(CP\)$/);
    expect(objectifsDeLaSequence(r)).toMatch(/^Mémoriser des faits numériques : /);
  });

  it("garde un seul objectif, et prend la forme de chaque feuille", () => {
    const revision = { ...r, revision: true, objectifs: ["cp-complements-10", "autre"], series: 3 };
    const oral = reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[1]);
    expect(oral.revision).toBe(false);
    expect(oral.objectifs).toHaveLength(1);
    expect(oral.forme).toBe("oral");
    expect(reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[4])).toMatchObject({ forme: "ecrit", series: 1 });
    expect(reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[5])).toMatchObject({ forme: "evaluation", series: 3 });
    // Deux parties à l'évaluation : deux séries au moins.
    expect(reglagesDeLaFeuille({ ...r, series: 1 }, FEUILLES_DE_LA_SEQUENCE[5]).series).toBe(2);
  });

  it("crée la fiche, les six séances de la démarche, puis les feuilles et les problèmes à leur place", async () => {
    const competence = { competenceTitre: "Mémoriser les compléments à 10", domaineTitre: "Mathématiques" } as any;
    const { sequence, feuilles } = await creerLaSequenceDeCalcul(r, 42, "  Compléments à 10  ", [competence]);
    expect(sequence.titre).toBe("Compléments à 10");
    expect(sequence.cycle).toBe("Cycle 2");
    expect(sequence.nbSeancesPrevu).toBe(6);
    expect(JSON.parse(sequence.competenceVisee).competenceTitre).toBe("Mémoriser les compléments à 10");
    expect(enregistres.seances.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(enregistres.seances.every((s) => s.sequenceId === sequence.id)).toBe(true);
    expect(feuilles).toBe(7);
    expect(enregistres.feuilles.map((f) => enregistres.seances.findIndex((s) => s.id === f.seanceId))).toEqual([0, 1, 2, 3, 4, 5, 4]);
    expect(enregistres.feuilles.map((f) => f.titre)).toEqual([
      "Calcul mental — découverte", "Calcul mental — La Martinière", "Calcul mental — La Martinière", "Calcul mental — La Martinière",
      "Calcul mental — test de fluence", "Calcul mental — évaluation finale", "Problèmes — Compléments à 10",
    ]);
    expect(enregistres.feuilles[0].html).toContain("Ce que nous retenons");
    expect(enregistres.feuilles[1].html).toContain("procédé La Martinière");
    expect(enregistres.feuilles[5].html).toContain("En temps limité");
    expect(enregistres.feuilles[5].html).toContain("corrigé");
    // Les compléments à 10 se réinvestissent dans des problèmes partie-tout.
    expect(enregistres.feuilles[6].atelier).toBe("partieTout");
  });

  it("garde le tirage de l'écran pour la première feuille", async () => {
    await creerLaSequenceDeCalcul(r, 42, "A", []);
    const premiere = enregistres.feuilles[1].html;
    enregistres.feuilles = [];
    await creerLaSequenceDeCalcul(r, 42, "B", []);
    expect(enregistres.feuilles[1].html).toBe(premiere);
    expect(enregistres.sequences[1].competenceVisee).toBe("");
  });
});
