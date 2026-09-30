import { describe, it, expect } from "vitest";
import type { ProjetClasse } from "./api";
import {
  aUnCorpus, choixDeProjets, corpusDe, ecritALaMain, estDuMoment, lignesDuCorpus, projetParDefaut, projetsDuMoment,
  resumeDuCorpus, texteDuCorpus,
} from "./corpusProjet";

const projet = (x: Partial<ProjetClasse>): ProjetClasse => ({
  id: x.titre ?? "p", titre: "Projet", descriptif: "", couleur: "indigo", dateCreation: "2026-09-01T10:00:00.000Z",
  annee: "2026-2027", imageNom: null, mois: "10", semaine: "", etat: "idee", etapesJson: "[]", domaines: "", origine: "",
  mots: "", phrases: "", ...x,
});

// Un mercredi d'octobre 2026, dans la semaine du lundi 12.
const quand = new Date(2026, 9, 14, 10, 0, 0);

describe("le corpus d'un projet", () => {
  it("se lit ligne par ligne, sans vide ni doublon", () => {
    expect(lignesDuCorpus("  citrouille \n\nsoupe\nCitrouille\n  \nlouche  à  soupe")).toEqual(["citrouille", "soupe", "louche à soupe"]);
    expect(lignesDuCorpus("")).toEqual([]);
    expect(texteDuCorpus(["a", "b"])).toBe("a\nb");
  });

  it("est vide pour un projet sans corpus, ou sans projet", () => {
    expect(corpusDe(null)).toEqual({ mots: [], phrases: [] });
    expect(aUnCorpus(projet({}))).toBe(false);
    expect(aUnCorpus(projet({ phrases: "Nous coupons la citrouille." }))).toBe(true);
    expect(corpusDe(projet({ mots: "citrouille\nsoupe", phrases: "Nous coupons la citrouille." })))
      .toEqual({ mots: ["citrouille", "soupe"], phrases: ["Nous coupons la citrouille."] });
  });

  it("se résume en une ligne", () => {
    expect(resumeDuCorpus({ mots: ["a", "b"], phrases: ["c"] })).toBe("2 mots · 1 phrase");
    expect(resumeDuCorpus({ mots: ["a"], phrases: [] })).toBe("1 mot");
    expect(resumeDuCorpus({ mots: [], phrases: [] })).toBe("pas encore de corpus");
  });
});

describe("le projet du moment", () => {
  const soupe = projet({ titre: "La soupe", mois: "10", mots: "citrouille\nsoupe" });
  const marche = projet({ titre: "Le marché", mois: "12", mots: "euro" });
  const sortie = projet({ titre: "La sortie", mois: "10", semaine: "2026-10-12" });
  const autreSemaine = projet({ titre: "Autre semaine", mois: "10", semaine: "2026-10-05", mots: "x" });
  const lAnDernier = projet({ titre: "L'an dernier", mois: "10", annee: "2025-2026", mots: "vieux" });
  const fini = projet({ titre: "Fini", mois: "10", etat: "fait", mots: "fini" });

  it("est posé sur la semaine où l'on est, ou sur le mois quand il tient le mois", () => {
    expect(estDuMoment(soupe, quand)).toBe(true);
    expect(estDuMoment(marche, quand)).toBe(false);
    expect(estDuMoment(sortie, quand)).toBe(true);
    expect(estDuMoment(autreSemaine, quand)).toBe(false);
    // Le dimanche appartient encore à la semaine du lundi 12.
    expect(estDuMoment(sortie, new Date(2026, 9, 18, 22, 0, 0))).toBe(true);
  });

  it("met la semaine avant le mois, et ce qui se mène avant ce qui est fini ; l'an dernier ne compte pas", () => {
    const du = projetsDuMoment([fini, marche, soupe, lAnDernier, autreSemaine, sortie], quand);
    expect(du.map((p) => p.titre)).toEqual(["La sortie", "La soupe", "Fini"]);
  });

  it("retient de lui-même le premier du moment qui a un corpus, sinon le premier", () => {
    expect(projetParDefaut([marche, soupe, sortie], quand)?.titre).toBe("La soupe");
    expect(projetParDefaut([marche, sortie], quand)?.titre).toBe("La sortie");
    expect(projetParDefaut([marche], quand)).toBeNull();
    expect(projetParDefaut([], quand)).toBeNull();
  });

  it("propose les projets de l'année, ceux du moment en tête, puis dans l'ordre de l'année scolaire", () => {
    const janvier = projet({ titre: "Janvier", mois: "01" });
    const septembre = projet({ titre: "Septembre", mois: "09" });
    const choix = choixDeProjets([janvier, marche, lAnDernier, soupe, septembre, sortie], quand);
    expect(choix.map((c) => `${c.projet.titre}${c.duMoment ? " *" : ""}`))
      .toEqual(["La soupe *", "La sortie *", "Septembre", "Le marché", "Janvier"]);
  });
});

describe("ce que l'enseignant a écrit de sa main", () => {
  const exemple = "chat\nchien\nlapin";
  const corpus = [["citrouille", "soupe"], ["euro", "pièce"]];

  it("n'est ni vide, ni l'exemple, ni le corpus d'un projet", () => {
    expect(ecritALaMain("", exemple, corpus)).toBe(false);
    expect(ecritALaMain("  \n", exemple, corpus)).toBe(false);
    expect(ecritALaMain("chat\nchien\nlapin", exemple, corpus)).toBe(false);
    expect(ecritALaMain("citrouille\nsoupe\n", exemple, corpus)).toBe(false);
    expect(ecritALaMain("euro\npièce", exemple, corpus)).toBe(false);
  });

  it("l'est dès qu'un mot diffère", () => {
    expect(ecritALaMain("citrouille\nsoupe\nlouche", exemple, corpus)).toBe(true);
    expect(ecritALaMain("chat\nchien", exemple, corpus)).toBe(true);
    expect(ecritALaMain("mes mots", exemple, [])).toBe(true);
  });
});
