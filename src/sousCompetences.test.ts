import { describe, it, expect } from "vitest";
import { SOURCE_MANUELLE, ajouterManuelle, competenceManuelle, consigneSousCompetences, estManuelle, lireSousCompetences } from "./sousCompetences";

describe("une compétence écrite à la main", () => {
  it("se rattache à la séquence et se reconnaît", () => {
    const c = competenceManuelle("  Reconnaître son prénom   parmi trois étiquettes ", { domaineTitre: "Français", competenceVisee: "Identifier des mots" });
    expect(c).toMatchObject({ referentielNom: SOURCE_MANUELLE, domaineTitre: "Français", sousDomaineTitre: "Identifier des mots", competenceTitre: "Reconnaître son prénom parmi trois étiquettes", competenceRefId: null });
    expect(c.id).toBeTruthy();
    expect(estManuelle(c)).toBe(true);
    expect(estManuelle({ ...c, competenceRefId: "fr-1" })).toBe(false);
  });

  it("ne s'ajoute pas deux fois, ni vide", () => {
    let comps = ajouterManuelle([], "Poser une addition sans retenue");
    comps = ajouterManuelle(comps, "poser une addition sans retenue.");
    comps = ajouterManuelle(comps, "   ");
    expect(comps).toHaveLength(1);
    comps = ajouterManuelle(comps, "Poser une addition avec retenue");
    expect(comps.map((c) => c.competenceTitre)).toEqual(["Poser une addition sans retenue", "Poser une addition avec retenue"]);
  });
});

describe("les sous-compétences proposées par l'assistant", () => {
  it("reçoivent la compétence visée, l'objectif et ce qui est déjà là", () => {
    const msgs = consigneSousCompetences({
      competenceVisee: "Décoder des mots réguliers", domaineTitre: "Français", cycle: "Cycle 2", titreSeance: "Les syllabes en ma, mi, mo",
      objectifs: "Lire des syllabes simples", dejaLa: ["Associer lettre et son", ""],
    });
    expect(msgs[0].role).toBe("system");
    const u = msgs[1].content;
    expect(u).toContain("Décoder des mots réguliers");
    expect(u).toContain("(Français), Cycle 2");
    expect(u).toContain("Lire des syllabes simples");
    expect(u).toContain("- Associer lettre et son");
    expect(u).toContain("tableau JSON");
    // Sans rien de déjà visé, la rubrique n'apparaît pas.
    expect(consigneSousCompetences({ competenceVisee: "", domaineTitre: "", cycle: "", titreSeance: "", objectifs: "", dejaLa: [] })[1].content).not.toContain("à ne pas redire");
  });

  it("relisent le tableau, nettoient, dédoublonnent et s'arrêtent à huit", () => {
    const rep = `Voici :\n["1. Reconnaître la lettre m", "Reconnaître la lettre m", {"texte": "- Lire la syllabe ma"}, "", 42, "Lire la syllabe mi", "a", "b", "c", "d", "e", "f"]`;
    const lus = lireSousCompetences(rep);
    expect(lus.slice(0, 3)).toEqual(["Reconnaître la lettre m", "Lire la syllabe ma", "Lire la syllabe mi"]);
    expect(lus).toHaveLength(8);
    expect(lireSousCompetences("rien")).toEqual([]);
    expect(lireSousCompetences("{}")).toEqual([]);
  });
});
