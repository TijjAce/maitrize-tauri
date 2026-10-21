import { describe, expect, it } from "vitest";
import type { Jeu, MaterielItem, OutilClasse } from "./api";
import {
  chercherElements, dejaPose, elementDuRenvoi, elementsDuBureau, lireRenvoi, renvoiVers, supportsDeLaSeance,
} from "./supportsDeSeance";

const outil = (p: Partial<OutilClasse>): OutilClasse => ({
  id: "o", genre: "outil", titre: "", categorie: "", usage: "", competencesBo: "[]", consignes: "", lieu: "", periode: "",
  elevesJson: "[]", documentsJson: "[]", imageNom: null, couleur: "", dossier: "", dateCreation: "", ...p,
});
const jeu = (p: Partial<Jeu>): Jeu => ({
  id: "j", titre: "", typeJeu: "Société", descriptionJeu: "", regles: "", competences: "", competencesBo: "[]",
  nbJoueursMin: 2, nbJoueursMax: 4, duree: 20, ageMin: 5, rangement: "", couleur: "", dateCreation: "", imageNom: null, dossier: "", ...p,
});
const materiel = (p: Partial<MaterielItem>): MaterielItem => ({
  id: "m", titre: "", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "",
  cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: "2026-10-21T08:00:00Z", seanceId: null, sequenceId: null,
  dossier: "", videosJson: "[]", coffreJson: "[]", ...p,
});
const aDesPdfs = (m: MaterielItem) => JSON.parse(m.pdfsJson).length > 0;

const bureau = {
  outils: [
    outil({ id: "o1", titre: "Bande numérique", categorie: "Nombres", lieu: "Bac bleu" }),
    outil({ id: "o2", genre: "affichage", titre: "Affiche des sons" }),
    outil({ id: "o3", genre: "evaluation", titre: "Évaluation des doubles" }),
  ],
  jeux: [jeu({ id: "j1", titre: "Halli Galli", duree: 15 })],
  materiel: [
    materiel({ id: "m1", titre: "Jetons de couleur", descriptionMateriel: "Cent jetons\nen bois" }),
    materiel({ id: "m2", titre: "Fiche des sons", pdfsJson: '["a.pdf"]' }),
    materiel({ id: "m3", titre: "Dans une séance", seanceId: "s9" }),
  ],
};

describe("les supports d'une séance", () => {
  it("renvoient à un élément du bureau, qui y reste", () => {
    const lien = renvoiVers({ id: "s1", sequenceId: "q1" }, { genre: "outil", source: "o1" }, "Bande numérique", "l1", "2026-10-21T09:00:00Z");
    expect([lien.seanceId, lien.sequenceId, lien.titre, lien.pdfsJson]).toEqual(["s1", "q1", "Bande numérique", "[]"]);
    expect(lireRenvoi(lien.supportJson)).toEqual({ genre: "outil", source: "o1" });
    expect(elementDuRenvoi({ genre: "outil", source: "o1" }, bureau)?.detail).toBe("Nombres · Bac bleu");
    // Parti du bureau : la ligne garde son titre, l'élément n'est plus là.
    expect(elementDuRenvoi({ genre: "jeu", source: "parti" }, bureau)).toBeNull();
  });

  it("ne confondent ni une feuille ni un renvoi abîmé avec un support", () => {
    expect(lireRenvoi("")).toBeNull();
    expect(lireRenvoi('{"genre":"fusée","source":"x"}')).toBeNull();
    expect(lireRenvoi('{"genre":"jeu"}')).toBeNull();
    const feuille = materiel({ id: "f", seanceId: "s1", pdfsJson: '["f.pdf"]' });
    const lien = renvoiVers({ id: "s1", sequenceId: null }, { genre: "jeu", source: "j1" }, "Halli Galli", "l1", "2026-10-21T09:00:00Z");
    expect(supportsDeLaSeance([feuille, lien], "s1").map((m) => m.id)).toEqual(["l1"]);
    expect(dejaPose([lien], { genre: "jeu", source: "j1" })).toBe(true);
    expect(dejaPose([lien], { genre: "outil", source: "j1" })).toBe(false);
  });

  it("se choisissent sur le bureau par sorte ; le matériel à PDF reste une feuille", () => {
    expect(elementsDuBureau("outil", bureau, aDesPdfs).map((e) => e.titre)).toEqual(["Bande numérique"]);
    expect(elementsDuBureau("affichage", bureau, aDesPdfs).map((e) => e.titre)).toEqual(["Affiche des sons"]);
    expect(elementsDuBureau("jeu", bureau, aDesPdfs)[0].detail).toBe("Société · 15 min · 2–4 joueurs");
    // Ni la feuille PDF (elle se copie), ni le matériel d'une séance.
    const mat = elementsDuBureau("materiel", bureau, aDesPdfs);
    expect(mat.map((e) => [e.titre, e.detail])).toEqual([["Jetons de couleur", "Cent jetons"]]);
  });

  it("se cherchent sans accents, mot par mot", () => {
    const tous = elementsDuBureau("evaluation", bureau, aDesPdfs);
    expect(chercherElements(tous, "evaluation doubles").map((e) => e.titre)).toEqual(["Évaluation des doubles"]);
    expect(chercherElements(tous, "triples")).toEqual([]);
  });
});
