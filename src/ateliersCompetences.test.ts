import { describe, it, expect } from "vitest";
import {
  basculerCompetence, cleDesCompetences, ecrireCompetencesAtelier, lireCompetencesAtelier,
  memeCompetence,
} from "./ateliersCompetences";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const comp = (p: Partial<CompetenceSelectionnee> = {}): CompetenceSelectionnee => ({
  id: "r1|S1|c1", referentielNom: "Cycle 2", domaineId: "D1", domaineTitre: "Lire et écrire",
  sousDomaineTitre: "Identifier des mots", competenceGeneraleTitre: null,
  competenceTitre: "Décoder des syllabes simples", niveau: "CP", competenceRefId: "c1", ...p,
});

describe("les compétences d'un atelier", () => {
  it("se rangent dans un réglage partagé entre les ordinateurs", () => {
    // Le préfixe « fabriquer: » est de ceux qui voyagent : ce qu'on prépare
    // sur le bureau se retrouve sur le portable.
    expect(cleDesCompetences("coloriage")).toBe("fabriquer:competences:coloriage");
  });

  it("reconnaissent la même compétence d'un référentiel à l'autre", () => {
    expect(memeCompetence(comp(), comp())).toBe(true);
    expect(memeCompetence(comp(), comp({ competenceRefId: "c2" }))).toBe(false);
    expect(memeCompetence(comp(), comp({ referentielNom: "Cycle 3" }))).toBe(false);
    // Sans identifiant, c'est l'intitulé qui départage.
    const sansId = comp({ competenceRefId: null });
    expect(memeCompetence(sansId, comp({ competenceRefId: null }))).toBe(true);
    expect(memeCompetence(sansId, comp({ competenceRefId: null, competenceTitre: "Autre" }))).toBe(false);
  });

  it("s'ajoutent et se retirent d'un même geste", () => {
    const une = basculerCompetence([], comp());
    expect(une).toHaveLength(1);
    expect(basculerCompetence(une, comp())).toHaveLength(0);
    expect(basculerCompetence(une, comp({ competenceRefId: "c2", id: "r1|S1|c2" }))).toHaveLength(2);
  });

  it("se relisent sans faire confiance à ce qui est enregistré", () => {
    expect(lireCompetencesAtelier(null)).toEqual([]);
    expect(lireCompetencesAtelier("")).toEqual([]);
    expect(lireCompetencesAtelier("{pas du json")).toEqual([]);
    expect(lireCompetencesAtelier('{"competenceTitre":"seule"}')).toEqual([]);
    // Une ligne sans intitulé ne sert à personne.
    expect(lireCompetencesAtelier('[{"competenceTitre":"  "}]')).toEqual([]);
    const relu = lireCompetencesAtelier(ecrireCompetencesAtelier([comp()]));
    expect(relu).toEqual([comp()]);
    // Une ligne incomplète est complétée plutôt que jetée.
    const maigre = lireCompetencesAtelier('[{"competenceTitre":"Lire"}]');
    expect(maigre).toHaveLength(1);
    expect(maigre[0].niveau).toBeNull();
    expect(maigre[0].id).toBe("Lire");
  });
});
