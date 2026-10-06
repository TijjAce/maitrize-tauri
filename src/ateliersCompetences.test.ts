import { describe, it, expect } from "vitest";
import {
  basculerCompetence, cleDesCompetences, ecrireCompetencesAtelier, lireCompetencesAtelier,
  memeCompetence,
  competencesParObjectif, objectifsDesAteliers, propositionsDesAteliers, unionDesCompetences,
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

describe("les compétences par objectif", () => {
  const c = (titre: string, ref = "R") => ({
    id: titre, referentielNom: ref, domaineId: "d", domaineTitre: "D", sousDomaineTitre: "S",
    competenceGeneraleTitre: null, competenceTitre: titre, niveau: null, competenceRefId: null,
  });

  it("se rangent sous l'atelier, objectif par objectif", () => {
    expect(cleDesCompetences("martiniere")).toBe("fabriquer:competences:martiniere");
    expect(cleDesCompetences("martiniere", "cp-complements-10")).toBe("fabriquer:competences:martiniere:cp-complements-10");
  });

  it("se relisent d'un coup depuis les réglages, sans les listes vides ni celles des autres ateliers", () => {
    const reglages = {
      [cleDesCompetences("martiniere", "cp-complements-10")]: JSON.stringify([c("Compléments à 10")]),
      [cleDesCompetences("martiniere", "cm2-decimaux")]: "[]",
      [cleDesCompetences("martiniere")]: JSON.stringify([c("Atelier")]),
      [cleDesCompetences("martinierebis", "x")]: JSON.stringify([c("Autre")]),
      "autre:cle": "x",
    };
    const par = competencesParObjectif(reglages, "martiniere");
    expect(Object.keys(par)).toEqual(["cp-complements-10"]);
    expect(par["cp-complements-10"][0].competenceTitre).toBe("Compléments à 10");
  });

  it("s'unissent sans répéter la même compétence", () => {
    const u = unionDesCompetences([[c("A"), c("B")], [c("B"), c("C")], []]);
    expect(u.map((x) => x.competenceTitre)).toEqual(["A", "B", "C"]);
  });

  it("gardent en mémoire les objectifs que chaque atelier travaille à l'écran", () => {
    let appels = 0;
    const off = objectifsDesAteliers.abonner(() => { appels++; });
    objectifsDesAteliers.publier("martiniere", [{ id: "cp-complements-10", libelle: "Compléments à 10" }]);
    objectifsDesAteliers.publier("martiniere", [{ id: "cp-complements-10", libelle: "Compléments à 10" }]);
    expect(objectifsDesAteliers.lire("martiniere").map((o) => o.id)).toEqual(["cp-complements-10"]);
    expect(objectifsDesAteliers.lire("tri")).toEqual([]);
    expect(appels).toBe(1);
    objectifsDesAteliers.publier("martiniere", []);
    expect(objectifsDesAteliers.lire("martiniere")).toEqual([]);
    expect(appels).toBe(2);
    off();
  });

  it("gardent ce qu'un atelier propose pour l'objectif à l'écran, sans prévenir pour rien", () => {
    let appels = 0;
    const off = propositionsDesAteliers.abonner(() => { appels++; });
    propositionsDesAteliers.publier("cubes", "CP", [comp()]);
    // Les mêmes compétences, retrouvées une seconde fois dans le référentiel : rien n'a changé.
    propositionsDesAteliers.publier("cubes", "CP", [comp({ id: "autre" })]);
    expect(appels).toBe(1);
    expect(propositionsDesAteliers.lire("cubes", "CP").map((c) => c.competenceRefId)).toEqual(["c1"]);
    // Une proposition pour le CP ne vaut pas pour le CE1.
    expect(propositionsDesAteliers.lire("cubes", "CE1")).toEqual([]);
    expect(propositionsDesAteliers.lire("tri")).toEqual([]);
    propositionsDesAteliers.publier("cubes", "CE1", [comp({ competenceRefId: "c2", niveau: "CE1" })]);
    expect(propositionsDesAteliers.lire("cubes", "CP")).toEqual([]);
    expect(appels).toBe(2);
    propositionsDesAteliers.publier("cubes", "", []);
    expect(propositionsDesAteliers.lire("cubes", "CE1")).toEqual([]);
    expect(appels).toBe(3);
    propositionsDesAteliers.publier("cubes", "", []);
    expect(appels).toBe(3);
    off();
  });
});
