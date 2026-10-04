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
  DEMARCHE_CALCUL_MENTAL, FEUILLES_DE_LA_SEQUENCE, creerLaSequenceDeCalcul, objectifsDeLaSequence, reglagesDeLaFeuille, titreDeLaSequence,
} from "./sequenceCalculMental";

const r = { ...REGLAGES_MARTINIERE, niveau: "CP" as const, objectifs: ["cp-complements-10"] };

describe("la séquence de calcul mental", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("pose ses feuilles dans les séances d'entraînement, de réinvestissement et d'évaluation", () => {
    const d = demarcheDe(DEMARCHE_CALCUL_MENTAL)!;
    const titres = FEUILLES_DE_LA_SEQUENCE.map((f) => d.seances[f.seance].titre);
    expect(titres.slice(0, 3).every((t) => t.includes("La Martinière"))).toBe(true);
    expect(titres[3]).toContain("Réinvestissement");
    expect(titres[4]).toContain("fluence");
    // La découverte se cherche : pas de feuille.
    expect(FEUILLES_DE_LA_SEQUENCE.some((f) => f.seance === 0)).toBe(false);
  });

  it("se nomme d'après l'objectif, et dit l'attendu de fin d'année", () => {
    expect(titreDeLaSequence(r)).toMatch(/^Calcul mental — .+ \(CP\)$/);
    expect(objectifsDeLaSequence(r)).toMatch(/^Mémoriser des faits numériques : /);
  });

  it("garde un seul objectif, et prend la forme de chaque feuille", () => {
    const revision = { ...r, revision: true, objectifs: ["cp-complements-10", "autre"], series: 3 };
    const oral = reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[0]);
    expect(oral.revision).toBe(false);
    expect(oral.objectifs).toHaveLength(1);
    expect(oral.forme).toBe("oral");
    expect(reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[3])).toMatchObject({ forme: "ecrit", series: 1 });
    expect(reglagesDeLaFeuille(revision, FEUILLES_DE_LA_SEQUENCE[4])).toMatchObject({ forme: "ecrit", series: 3 });
  });

  it("crée la fiche, les six séances de la démarche, puis cinq feuilles à leur place", async () => {
    const competence = { competenceTitre: "Mémoriser les compléments à 10", domaineTitre: "Mathématiques" } as any;
    const { sequence, feuilles } = await creerLaSequenceDeCalcul(r, 42, "  Compléments à 10  ", [competence]);
    expect(sequence.titre).toBe("Compléments à 10");
    expect(sequence.cycle).toBe("Cycle 2");
    expect(sequence.nbSeancesPrevu).toBe(6);
    expect(JSON.parse(sequence.competenceVisee).competenceTitre).toBe("Mémoriser les compléments à 10");
    expect(enregistres.seances.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(enregistres.seances.every((s) => s.sequenceId === sequence.id)).toBe(true);
    expect(feuilles).toBe(5);
    expect(enregistres.feuilles.map((f) => enregistres.seances.findIndex((s) => s.id === f.seanceId))).toEqual([1, 2, 3, 4, 5]);
    expect(enregistres.feuilles.map((f) => f.titre)).toEqual([
      "Calcul mental — La Martinière", "Calcul mental — La Martinière", "Calcul mental — La Martinière",
      "Calcul mental — test de fluence", "Calcul mental — test de fluence",
    ]);
    expect(enregistres.feuilles[0].html).toContain("procédé La Martinière");
    expect(enregistres.feuilles[4].html).toContain("corrigé");
  });

  it("garde le tirage de l'écran pour la première feuille", async () => {
    await creerLaSequenceDeCalcul(r, 42, "A", []);
    const premiere = enregistres.feuilles[0].html;
    enregistres.feuilles = [];
    await creerLaSequenceDeCalcul(r, 42, "B", []);
    expect(enregistres.feuilles[0].html).toBe(premiere);
    expect(enregistres.sequences[1].competenceVisee).toBe("");
  });
});
