import { describe, it, expect } from "vitest";
import type { CommentaireEleve, ObservationEleve } from "./api";
import { appliquer, estUneCopieDuBilan, idNoteDuBilan, notesDuBilan } from "./notesDuBilan";

const eleves = [{ id: "e1", nom: "AURELIEN" }, { id: "e2", nom: "LOUISON" }, { id: "e3", nom: "Rose Martin" }];
const creneau = { id: "c1", date: "2026-10-02", heureDebut: "11:00", matiere: "Jeux collectifs", nature: "classe" as const };

describe("le bilan, jusqu'aux notes des élèves", () => {
  it("porte à chaque élève nommé les phrases qui le nomment, datées du créneau", () => {
    const { aEcrire, aRetirer, nouvelles } = notesDuBilan([], creneau,
      "AURELIEN a bien travaillé. Le jeu des déménageurs a plu. Louison a aidé Aurelien.", eleves);
    expect(aEcrire.map((n) => [n.id, n.eleveId, n.date, n.type, n.texte])).toEqual([
      [idNoteDuBilan("c1", "e1"), "e1", "2026-10-02T11:00:00", "scolaire", "Jeux collectifs : AURELIEN a bien travaillé. Louison a aidé Aurelien."],
      [idNoteDuBilan("c1", "e2"), "e2", "2026-10-02T11:00:00", "scolaire", "Jeux collectifs : Louison a aidé Aurelien."],
    ]);
    expect(aRetirer).toEqual([]);
    expect(nouvelles).toEqual(["e1", "e2"]);
  });

  it("rien pour un bilan qui ne nomme personne, ni pour un mot qui n'est pas un prénom", () => {
    expect(notesDuBilan([], creneau, "Bonne séance, tout le monde a participé.", eleves).aEcrire).toEqual([]);
    // « rose » sans majuscule est une couleur, pas Rose.
    expect(notesDuBilan([], creneau, "Nous avons peint en rose.", eleves).aEcrire).toEqual([]);
  });

  it("suit le bilan qu'on reprend : la note se met à jour, garde sa nature, et s'en va avec le prénom", () => {
    const premiere = notesDuBilan([], creneau, "AURELIEN a bien travaillé.", eleves).aEcrire;
    const classee: CommentaireEleve[] = [{ ...premiere[0], type: "comportement" }];
    // Rejoué tel quel : rien à écrire.
    expect(notesDuBilan(classee, { ...creneau }, "AURELIEN a bien travaillé.", eleves).aEcrire).toEqual([]);
    const reprise = notesDuBilan(classee, creneau, "AURELIEN a bien travaillé, sans aide.", eleves);
    expect(reprise.aEcrire.map((n) => [n.type, n.texte])).toEqual([["comportement", "Jeux collectifs : AURELIEN a bien travaillé, sans aide."]]);
    expect(reprise.nouvelles).toEqual([]);
    expect(notesDuBilan(classee, creneau, "Séance calme.", eleves)).toEqual({ aEcrire: [], aRetirer: [idNoteDuBilan("c1", "e1")], nouvelles: [] });
  });

  it("une réunion porte ses notes en « divers »", () => {
    const [n] = notesDuBilan([], { ...creneau, nature: "reunion" }, "ESS de Rose : maintien des aménagements.", eleves).aEcrire;
    expect([n.eleveId, n.type]).toEqual(["e3", "divers"]);
  });
});

describe("les fiches nées des bilans d'avant", () => {
  const fiche = (p: Partial<ObservationEleve>): ObservationEleve => ({
    id: "o", eleveId: "e1", date: "2026-10-02", creneauId: "c1", contexte: "", axe: "", domaine: "", competence: "",
    note: "AURELIEN a bien travaillé", reussites: "", difficultes: "", hypotheses: "", amenagements: "", reajustement: "",
    dateCreation: "", dateMaj: "", ...p,
  });

  it("ne retire que les copies du bilan : sans axe, sans constat, posées sur un créneau", () => {
    expect(estUneCopieDuBilan(fiche({}))).toBe(true);
    expect(estUneCopieDuBilan(fiche({ axe: "Participe aux jeux de cour" }))).toBe(false);
    expect(estUneCopieDuBilan(fiche({ reussites: "Joue avec deux camarades." }))).toBe(false);
    expect(estUneCopieDuBilan(fiche({ creneauId: null }))).toBe(false);
  });

  it("une liste à jour de ce qui a été écrit et retiré", () => {
    const a = { id: "a", v: 1 }, b = { id: "b", v: 1 };
    expect(appliquer([a, b], [{ id: "a", v: 2 }], ["b"])).toEqual([{ id: "a", v: 2 }]);
  });
});
