import { describe, it, expect } from "vitest";
import {
  basculerCompetence, cleDesCompetences, ecrireCompetencesAtelier, lireCompetencesAtelier,
  memeCompetence,
  competencesParObjectif, objectifsDesAteliers, propositionsDesAteliers, unionDesCompetences,
  detacherAtelier, detacherDeLaListe, identiteCompetence, liensParCompetence, niveauxDeLaLigne, nombreDeCompetences, rattacherAtelier, vautPourLeNiveau,
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

describe("le catalogue par compétence", () => {
  const ligne = (refId: string, titre = refId, niveau: string | null = "CP"): CompetenceSelectionnee => ({
    id: refId, referentielNom: "Cycle 2", domaineId: "d", domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres",
    competenceGeneraleTitre: null, competenceTitre: titre, niveau, competenceRefId: refId,
  });
  const reglages = {
    [cleDesCompetences("coloriage")]: ecrireCompetencesAtelier([ligne("a"), ligne("b")]),
    [cleDesCompetences("cubes", "CP")]: ecrireCompetencesAtelier([ligne("a")]),
    [cleDesCompetences("martiniere", "cp-complements-10")]: ecrireCompetencesAtelier([ligne("b"), { ...ligne("ancienne"), competenceRefId: null }]),
    [cleDesCompetences("trous")]: "[]",
    "fabriquer:rangement": "usage",
  };

  it("relit chaque compétence avec ses ateliers, et la liste qui les rattache", () => {
    const liens = liensParCompetence(reglages);
    expect(liens.get(identiteCompetence("Cycle 2", "a"))).toEqual([{ atelier: "coloriage", objectif: "" }, { atelier: "cubes", objectif: "CP" }]);
    expect(liens.get(identiteCompetence("Cycle 2", "b"))).toEqual([{ atelier: "coloriage", objectif: "" }, { atelier: "martiniere", objectif: "cp-complements-10" }]);
    // Une ligne gardée sans identifiant ne se retrouve pas dans l'arbre.
    expect([...liens.keys()].some((k) => k.includes("ancienne"))).toBe(false);
    expect(nombreDeCompetences(reglages)).toEqual({ coloriage: 2, cubes: 1, martiniere: 1 });
  });

  it("rattache à la liste « tous niveaux », une fois", () => {
    const ecrit = rattacherAtelier(reglages, "trous", ligne("c"));
    expect(Object.keys(ecrit)).toEqual([cleDesCompetences("trous")]);
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("trous")]).map((c) => c.competenceRefId)).toEqual(["c"]);
    // Déjà là, même par une liste de classe : rien à écrire.
    expect(rattacherAtelier(reglages, "cubes", ligne("a"))).toEqual({});
  });

  it("détache de toutes les listes de l'atelier, et seulement des siennes", () => {
    const tout = { ...reglages, [cleDesCompetences("cubes")]: ecrireCompetencesAtelier([ligne("a"), ligne("d")]) };
    const ecrit = detacherAtelier(tout, "cubes", ligne("a"));
    expect(Object.keys(ecrit).sort()).toEqual([cleDesCompetences("cubes"), cleDesCompetences("cubes", "CP")].sort());
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("cubes")]).map((c) => c.competenceRefId)).toEqual(["d"]);
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("cubes", "CP")])).toEqual([]);
    expect(detacherAtelier(tout, "trous", ligne("a"))).toEqual({});
  });

  it("détache d'un seul générateur de l'enseignant, sans toucher aux autres", () => {
    const tout = {
      [cleDesCompetences("perso", "g1")]: ecrireCompetencesAtelier([ligne("a"), ligne("d")]),
      [cleDesCompetences("perso", "g2")]: ecrireCompetencesAtelier([ligne("a")]),
    };
    const ecrit = detacherDeLaListe(tout, cleDesCompetences("perso", "g1"), ligne("a"));
    expect(Object.keys(ecrit)).toEqual([cleDesCompetences("perso", "g1")]);
    expect(lireCompetencesAtelier(ecrit[cleDesCompetences("perso", "g1")]).map((c) => c.competenceRefId)).toEqual(["d"]);
    expect(detacherDeLaListe(tout, cleDesCompetences("perso", "g3"), ligne("a"))).toEqual({});
  });

  it("lit les niveaux d'une ligne : seul, en plage, ou tout le cycle", () => {
    expect(niveauxDeLaLigne("CE1")).toEqual(["CE1"]);
    expect(niveauxDeLaLigne("CP-CE2")).toEqual(["CP", "CE1", "CE2"]);
    expect(niveauxDeLaLigne("")).toEqual([]);
    expect(vautPourLeNiveau("CP-CE2", "CE1")).toBe(true);
    expect(vautPourLeNiveau("CM1-CM2", "CE2")).toBe(false);
    expect(vautPourLeNiveau(null, "GS")).toBe(true);
    expect(vautPourLeNiveau("CE1", "")).toBe(true);
    expect(vautPourLeNiveau("CE1", "CP")).toBe(false);
  });
});
