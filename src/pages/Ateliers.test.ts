import { describe, it, expect } from "vitest";
import { jeuAccepte } from "./Ateliers";
import { CATEGORIES_EVALUATION, CATEGORIES_OUTIL, categoriesDuGenre, nouveauJeu, nouvelOutil, type Jeu } from "../api";

const jeu = (p: Partial<Jeu>): Jeu => ({ ...nouveauJeu(), ...p });

describe("jeuAccepte", () => {
  const uno = jeu({ titre: "Uno", typeJeu: "Cartes", nbJoueursMin: 2, nbJoueursMax: 6, dossier: "Langage" });

  it("ne filtre rien sans critère", () => {
    expect(jeuAccepte(uno, {})).toBe(true);
    expect(jeuAccepte(uno, { typeJeu: "", joueurs: "", dossier: "" })).toBe(true);
  });

  it("retient un jeu dont l'intervalle couvre l'effectif", () => {
    expect(jeuAccepte(uno, { joueurs: "4" })).toBe(true);
  });

  it("accepte les deux bornes de l'intervalle", () => {
    expect(jeuAccepte(uno, { joueurs: "2" })).toBe(true);
    expect(jeuAccepte(uno, { joueurs: "6" })).toBe(true);
  });

  it("écarte un effectif hors de l'intervalle", () => {
    expect(jeuAccepte(uno, { joueurs: "1" })).toBe(false);
    expect(jeuAccepte(uno, { joueurs: "8" })).toBe(false);
  });

  it("traite un jeu solo", () => {
    const solo = jeu({ nbJoueursMin: 1, nbJoueursMax: 1 });
    expect(jeuAccepte(solo, { joueurs: "1" })).toBe(true);
    expect(jeuAccepte(solo, { joueurs: "2" })).toBe(false);
  });

  it("filtre par type", () => {
    expect(jeuAccepte(uno, { typeJeu: "Cartes" })).toBe(true);
    expect(jeuAccepte(uno, { typeJeu: "Plateau" })).toBe(false);
  });

  it("filtre par dossier", () => {
    expect(jeuAccepte(uno, { dossier: "Langage" })).toBe(true);
    expect(jeuAccepte(uno, { dossier: "Motricité" })).toBe(false);
  });

  it("combine les critères", () => {
    expect(jeuAccepte(uno, { typeJeu: "Cartes", joueurs: "3", dossier: "Langage" })).toBe(true);
    expect(jeuAccepte(uno, { typeJeu: "Cartes", joueurs: "9", dossier: "Langage" })).toBe(false);
  });

  it("ignore un effectif illisible plutôt que de tout masquer", () => {
    expect(jeuAccepte(uno, { joueurs: "abc" })).toBe(false);
  });
});

describe("nouveauJeu", () => {
  it("propose un intervalle de joueurs cohérent", () => {
    const j = nouveauJeu();
    expect(j.nbJoueursMin).toBeLessThanOrEqual(j.nbJoueursMax);
  });

  it("est retenu par le filtre à son effectif minimum", () => {
    const j = nouveauJeu();
    expect(jeuAccepte(j, { joueurs: String(j.nbJoueursMin) })).toBe(true);
  });
});

describe("les trois sortes de fiches de classe", () => {
  it("part d'une évaluation vide, sans élève ni période", () => {
    const ev = nouvelOutil("evaluation");
    expect(ev.genre).toBe("evaluation");
    expect(ev.categorie).toBe(CATEGORIES_EVALUATION[0]);
    // La période est propre aux affichages ; les élèves aux outils.
    expect(ev.periode).toBe("");
    expect(ev.elevesJson).toBe("[]");
    // La compétence et le sujet, vides, attendent d'être choisis.
    expect(ev.competencesBo).toBe("[]");
    expect(ev.documentsJson).toBe("[]");
  });

  it("propose à chaque sorte ses propres catégories", () => {
    expect(categoriesDuGenre("outil")).toEqual(CATEGORIES_OUTIL);
    expect(categoriesDuGenre("evaluation")).toEqual(CATEGORIES_EVALUATION);
    expect(nouvelOutil("outil").couleur).not.toBe(nouvelOutil("evaluation").couleur);
  });
});
