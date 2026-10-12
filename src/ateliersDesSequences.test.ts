import { describe, it, expect } from "vitest";
import { ateliersDeLaSequence, rattacherLesAteliersDesSequences } from "./ateliersDesSequences";
import { cleDesCompetences, lireCompetencesAtelier, liensParCompetence, identiteCompetence } from "./ateliersCompetences";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const C2 = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const C1 = "Cycle 1 — Programme 2025 (v2)";
const ligne = (p: Partial<CompetenceSelectionnee>): CompetenceSelectionnee => ({
  id: p.competenceRefId ?? "x", referentielNom: C2, domaineId: "d", domaineTitre: "Mathématiques",
  sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre: null,
  competenceTitre: "", niveau: "CP", competenceRefId: "x", ...p,
});

describe("les ateliers des séquences", () => {
  it("reprend l'atelier dont la séquence de la compétence fabrique les feuilles", () => {
    // Grouper par dix au CP : la séquence prend ses feuilles dans les cubes.
    expect(ateliersDeLaSequence(ligne({ competenceTitre: "Construire des collections de cardinal donné.", competenceRefId: "c2-1" }))).toContain("cubes");
    // Comparer, ranger : « Comparer les nombres ».
    expect(ateliersDeLaSequence(ligne({ competenceTitre: "Ordonner des nombres dans l’ordre croissant ou décroissant.", competenceRefId: "c2-2" })))
      .toContain("comparer");
    // En maternelle, la séquence qui naît de l'atelier « Construire des collections ».
    expect(ateliersDeLaSequence(ligne({
      referentielNom: C1, domaineTitre: "4. Acquérir les premiers outils mathématiques", sousDomaineTitre: "Découvrir les nombres",
      competenceTitre: "Construire des collections de cardinal donné.", niveau: "MS", competenceRefId: "c1-1",
    }))).toEqual(["collections"]);
  });

  it("ne rattache rien quand la séquence ne fabrique pas de feuilles", () => {
    expect(ateliersDeLaSequence(ligne({
      domaineTitre: "Éducation physique et sportive", sousDomaineTitre: "Courir, sauter, lancer", competenceTitre: "Courir vite.", competenceRefId: "eps",
    }))).toEqual([]);
  });

  it("écrit dans la liste « tous niveaux » des ateliers, une seule fois, et le dit", () => {
    const comps = [
      ligne({ competenceTitre: "Construire des collections de cardinal donné.", competenceRefId: "c2-1" }),
      ligne({ competenceTitre: "Ordonner des nombres dans l’ordre croissant ou décroissant.", competenceRefId: "c2-2" }),
    ];
    const deja = { [cleDesCompetences("cubes", "CP")]: JSON.stringify([comps[0]]) };
    const { ecrit, liens, competences } = rattacherLesAteliersDesSequences(deja, comps);
    // Déjà rattachée aux cubes par la liste du CP : rien de plus pour elle de ce côté.
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("cubes")]).map((c) => c.competenceRefId)).not.toContain("c2-1");
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("comparer")]).map((c) => c.competenceRefId)).toContain("c2-2");
    expect(liens).toBeGreaterThan(0);
    expect(competences).toBeGreaterThan(0);
    const apres = liensParCompetence({ ...deja, ...ecrit });
    expect(apres.get(identiteCompetence(C2, "c2-2"))?.some((l) => l.atelier === "comparer")).toBe(true);
    // Une seconde fois : rien de nouveau.
    expect(rattacherLesAteliersDesSequences({ ...deja, ...ecrit }, comps)).toEqual({ ecrit: {}, liens: 0, competences: 0 });
  });
});
