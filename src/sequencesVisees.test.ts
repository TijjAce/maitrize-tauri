import { describe, it, expect } from "vitest";
import { cleDeVisee, infobulleVisee, sequencesParCompetence, titresVisant } from "./sequencesVisees";
import { nouvelleSequence, type Sequence } from "./api";

const visee = (competenceRefId: string, titre = "Lire", referentielNom = "Cycle 2", sousDomaineTitre = "Lecture") =>
  JSON.stringify({ referentielNom, sousDomaineTitre, competenceRefId, competenceTitre: titre, domaineTitre: "Français" });

const seq = (id: string, titre: string, competenceVisee: string): Sequence =>
  ({ ...nouvelleSequence(), id, titre, competenceVisee });

describe("les compétences déjà visées", () => {
  it("relient chaque compétence aux séquences qui la visent", () => {
    const parCle = sequencesParCompetence([
      seq("s1", "Les nombres jusqu'à 59", visee("c1")),
      seq("s2", "Lecture du soir", visee("c1")),
      seq("s3", "Courir vite", visee("c2")),
    ]);
    const c1 = { referentielNom: "Cycle 2", sousDomaineTitre: "Lecture", competenceRefId: "c1", competenceTitre: "Lire" };
    expect(titresVisant(parCle, c1)).toEqual(["Les nombres jusqu'à 59", "Lecture du soir"]);
    expect(titresVisant(parCle, { ...c1, competenceRefId: "c9" })).toEqual([]);
    expect(infobulleVisee(titresVisant(parCle, c1))).toBe("Déjà visée par : Les nombres jusqu'à 59 · Lecture du soir");
    expect(infobulleVisee([])).toBe("");
  });

  it("écartent la séquence qu'on modifie : elle ne se vise pas elle-même", () => {
    const parCle = sequencesParCompetence([seq("s1", "La mienne", visee("c1")), seq("s2", "L'autre", visee("c1"))], "s1");
    expect(titresVisant(parCle, { referentielNom: "Cycle 2", sousDomaineTitre: "Lecture", competenceRefId: "c1", competenceTitre: "" }))
      .toEqual(["L'autre"]);
  });

  it("distinguent deux référentiels qui reprennent le même identifiant", () => {
    const parCle = sequencesParCompetence([seq("s1", "Cycle 2", visee("c1")), seq("s2", "Cycle 3", visee("c1", "Lire", "Cycle 3"))]);
    expect(titresVisant(parCle, { referentielNom: "Cycle 3", sousDomaineTitre: "Lecture", competenceRefId: "c1", competenceTitre: "" }))
      .toEqual(["Cycle 3"]);
    // Sans identifiant, c'est l'intitulé qui compte, casse et espaces mis à part.
    expect(cleDeVisee({ referentielNom: "R", sousDomaineTitre: "S", competenceRefId: null, competenceTitre: "  Lire un mot " }))
      .toBe(cleDeVisee({ referentielNom: "R", sousDomaineTitre: "S", competenceTitre: "lire un mot" }));
  });

  it("ignorent une compétence visée illisible ou vide, et un titre en double", () => {
    const parCle = sequencesParCompetence([
      seq("s1", "Cassée", "{pas du json"), seq("s2", "Vide", ""), seq("s3", "Sans rien", JSON.stringify({ domaineTitre: "X" })),
      seq("s4", "Deux fois", visee("c1")), seq("s5", "Deux fois", visee("c1")), seq("s6", "   ", visee("c1")),
    ]);
    expect(parCle.size).toBe(1);
    expect([...parCle.values()][0]).toEqual(["Deux fois", "Séquence sans titre"]);
  });
});
