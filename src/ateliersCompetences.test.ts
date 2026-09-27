import { describe, it, expect } from "vitest";
import { competencesDeLAtelier, competencesDesReferentiels } from "./ateliersCompetences";
import type { Referentiel } from "./api";

const referentiel = (id: string, nom: string, actif = true): Referentiel => ({
  id, nom, cycle: "Cycle 2", actif, estIntegre: true, dateAjout: "2026-01-01",
  donnees: JSON.stringify({
    titre: nom,
    domaines: [
      {
        id: "D1", titre: "Lire et écrire",
        sousDomaines: [
          { id: "S1", titre: "Identifier des mots", competences: [
            { id: "c1", texte: "Établir les correspondances graphophonologiques", niveau: "CP" },
            { id: "c2", texte: "Décoder des syllabes simples", niveau: "CP" },
          ] },
          { id: "S2", titre: "Comprendre", competencesGenerales: [
            { id: "g1", titre: "Lire avec fluidité", competences: [
              { id: "c3", texte: "Lire un texte court à voix haute", niveau: "CE1" },
            ] },
          ] },
        ],
      },
      {
        id: "D2", titre: "Nombres et calculs",
        sousDomaines: [
          { id: "S3", titre: "Résoudre des problèmes", competences: [
            { id: "c4", texte: "Résoudre des problèmes additifs en une étape", niveau: "CP" },
            { id: "c5", texte: "Mémoriser les tables de multiplication", niveau: "CE2" },
          ] },
        ],
      },
    ],
  }),
} as Referentiel);

describe("les compétences des référentiels", () => {
  it("les met à plat, chemin et niveau compris", () => {
    const toutes = competencesDesReferentiels([referentiel("r1", "Cycle 2")]);
    expect(toutes).toHaveLength(5);
    const decoder = toutes.find((c) => c.competenceTitre.startsWith("Décoder"))!;
    expect(decoder.domaineTitre).toBe("Lire et écrire");
    expect(decoder.sousDomaineTitre).toBe("Identifier des mots");
    expect(decoder.niveau).toBe("CP");
    expect(decoder.referentielNom).toBe("Cycle 2");
    // Celles rangées sous une compétence générale en gardent le titre.
    const fluide = toutes.find((c) => c.competenceTitre.startsWith("Lire un texte"))!;
    expect(fluide.competenceGeneraleTitre).toBe("Lire avec fluidité");
  });

  it("ignore un référentiel désactivé ou illisible", () => {
    expect(competencesDesReferentiels([referentiel("r1", "Cycle 2", false)])).toHaveLength(0);
    const casse = { ...referentiel("r2", "Abîmé"), donnees: "{pas du json" } as Referentiel;
    expect(competencesDesReferentiels([casse])).toHaveLength(0);
  });
});

describe("les compétences d'un atelier", () => {
  const refs = [referentiel("r1", "Cycle 2")];

  it("retient celles que ses mots-clés désignent", () => {
    const sons = competencesDeLAtelier(refs, ["correspondance", "syllabe"]);
    expect(sons.map((c) => c.competenceTitre)).toEqual([
      "Établir les correspondances graphophonologiques",
      "Décoder des syllabes simples",
    ]);
    // Les mots-clés portent aussi sur le chemin, pas seulement l'intitulé.
    const problemes = competencesDeLAtelier(refs, ["problèmes additifs"]);
    expect(problemes.map((c) => c.competenceTitre)).toEqual(["Résoudre des problèmes additifs en une étape"]);
    expect(competencesDeLAtelier(refs, ["tables de multiplication"])).toHaveLength(1);
  });

  it("ne raconte rien sans référentiel, ni sans mot-clé", () => {
    expect(competencesDeLAtelier([], ["syllabe"])).toEqual([]);
    expect(competencesDeLAtelier(refs, [])).toEqual([]);
    expect(competencesDeLAtelier(refs, ["trombone"])).toEqual([]);
  });

  it("ne montre pas deux fois le même intitulé, et plafonne la liste", () => {
    const deux = [referentiel("r1", "Cycle 2"), referentiel("r2", "Cycle 2 bis")];
    // Le même intitulé dans deux référentiels ne compte qu'une fois.
    expect(competencesDeLAtelier(deux, ["syllabe"])).toHaveLength(1);
    expect(competencesDeLAtelier(deux, ["lire", "résoudre", "mémoriser", "décoder"], 2)).toHaveLength(2);
  });
});
