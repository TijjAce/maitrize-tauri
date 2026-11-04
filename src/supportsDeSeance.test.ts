import { describe, expect, it } from "vitest";
import type { Jeu, MaterielItem, OutilClasse } from "./api";
import {
  GENRES_DE_SUPPORT, chercherElements, dejaPose, elementDuRenvoi, elementsDuBureau, genreDeSupport, lireRenvoi, renvoiVers, supportsDeLaSeance,
  supportsDuCreneau, supportsImprimes,
} from "./supportsDeSeance";
import type { Seance, Sequence } from "./api";

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
    outil({ id: "o4", genre: "enseignant", titre: "Classeurs de suivi", categorie: "Suivi des élèves", lieu: "Étagère du bureau" }),
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

describe("un outil pour l'enseignant, un support comme les autres (demande de l'enseignant, 4 novembre 2026)", () => {
  it("a son nom, son icône et sa création, juste après l'outil pour l'élève", () => {
    expect(GENRES_DE_SUPPORT.map((g) => g.id).slice(0, 2)).toEqual(["outil", "enseignant"]);
    expect(genreDeSupport("enseignant")).toEqual({
      id: "enseignant", nom: "Outil pour l'enseignant", pluriel: "Outils pour l'enseignant", ico: "🧑‍🏫", nouveau: "Nouvel outil pour l'enseignant",
    });
  });

  it("se choisit sur le bureau à part des outils pour l'élève, et se pose dans la séance", () => {
    expect(elementsDuBureau("enseignant", bureau, aDesPdfs).map((e) => [e.titre, e.detail])).toEqual([["Classeurs de suivi", "Suivi des élèves · Étagère du bureau"]]);
    expect(elementsDuBureau("outil", bureau, aDesPdfs).map((e) => e.titre)).toEqual(["Bande numérique"]);
    const lien = renvoiVers({ id: "s1", sequenceId: null }, { genre: "enseignant", source: "o4" }, "Classeurs de suivi", "l1", "2026-11-04T09:00:00Z");
    expect(lireRenvoi(lien.supportJson)).toEqual({ genre: "enseignant", source: "o4" });
    expect(elementDuRenvoi({ genre: "enseignant", source: "o4" }, bureau)?.titre).toBe("Classeurs de suivi");
    // Le même numéro sous une autre sorte n'est pas lui.
    expect(elementDuRenvoi({ genre: "outil", source: "o4" }, bureau)).toBeNull();
    expect(supportsImprimes([lien], bureau)).toContain("🧑‍🏫 Classeurs de suivi");
  });
});

describe("les supports au cahier journal (demande de l'enseignant, 2026-11-01)", () => {
  const pose = (id: string, seanceId: string, genre: string, source: string) =>
    materiel({ id, seanceId, sequenceId: "q1", supportJson: JSON.stringify({ genre, source }), dateCreation: `2026-11-01T08:0${id.length}:00Z` });
  const seances = [{ id: "s1", sequenceId: "q1", numero: 1, titre: "Compter" }, { id: "s2", sequenceId: "q1", numero: 2, titre: "Ranger" }] as Seance[];
  const sequences = [{ id: "q1", titre: "Les nombres", nbSeancesPrevu: 2 }] as Sequence[];
  const liens = [pose("a", "s1", "outil", "o1"), pose("bb", "s1", "jeu", "j1"), pose("ccc", "s2", "affichage", "o2"), pose("dddd", "s2", "outil", "o1"), pose("eeeee", "s3", "materiel", "m1")];

  it("montrent ceux de la séance posée et des séances citées par leur ligne 📚, une fois chacun, sans les jeux", () => {
    expect(supportsDuCreneau({ seanceId: "s1", prevu: "" }, sequences, seances, liens).map((m) => m.id)).toEqual(["a"]);
    const avecCitee = supportsDuCreneau({ seanceId: "s1", prevu: "📚 Les nombres · séance 2/2 : Ranger" }, sequences, seances, liens);
    expect(avecCitee.map((m) => m.id)).toEqual(["a", "ccc"]);
    expect(supportsDuCreneau({ seanceId: null, prevu: "Récréation" }, sequences, seances, liens)).toEqual([]);
  });

  it("s'impriment sur une ligne, chacun avec son image, sa sorte et son nom", () => {
    const html = supportsImprimes([liens[0], liens[2]], bureau, { "outil:o1": "data:image/jpeg;base64,AAA" });
    expect(html).toContain('<img alt="" src="data:image/jpeg;base64,AAA">📏 Bande numérique<span class="support-imprime-detail"> · Nombres · Bac bleu</span>');
    expect(html).toContain("🖼 Affiche des sons");
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(supportsImprimes([], bureau)).toBe("");
  });
});
