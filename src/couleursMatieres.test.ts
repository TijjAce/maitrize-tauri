import { describe, it, expect, afterEach } from "vitest";
import { avecCouleurChoisie, couleurParDefaut, couleurPourMatiere, setMatiereOverrides, teinteCreneau, couleurHex, COULEURS } from "./api";

describe("couleurs choisies", () => {
  afterEach(() => setMatiereOverrides({}));

  it("un intitulé garde la couleur que l'enseignant lui a choisie", () => {
    const defaut = couleurParDefaut("domaine 4");
    const autre = COULEURS.find((c) => c !== defaut)!;
    const choix = avecCouleurChoisie({}, "domaine 4", autre);
    expect(choix).toEqual({ "domaine 4": autre });
    setMatiereOverrides(choix);
    expect(couleurPourMatiere("domaine 4")).toBe(autre);
    // Les autres intitulés ne bougent pas.
    expect(couleurPourMatiere("Mathématiques renforcement")).toBe(couleurParDefaut("Mathématiques renforcement"));
  });

  it("revenir à la couleur par défaut efface le choix", () => {
    const choix = avecCouleurChoisie({ "domaine 4": "gray", Lecture: "red" }, "domaine 4", couleurParDefaut("domaine 4"));
    expect(choix).toEqual({ Lecture: "red" });
    expect(avecCouleurChoisie({ Lecture: "red" }, "Lecture", "")).toEqual({});
  });

  it("un créneau prend la couleur de son intitulé, même choisie après sa création", () => {
    const creneau = { matiere: "domaine 4", couleur: couleurParDefaut("domaine 4") };
    setMatiereOverrides({ "domaine 4": "brown" });
    expect(teinteCreneau(creneau)).toBe(couleurHex.brown);
    expect(teinteCreneau({ matiere: "", couleur: "teal" })).toBe(couleurHex.teal);
  });

  it("toute couleur par défaut se choisit dans la palette", () => {
    for (const intitule of ["domaine 1", "Sensoriel - domaine 1,3", "Lecture Borel Maisonny", "Synthèse", "invité"]) {
      expect(COULEURS).toContain(couleurParDefaut(intitule));
    }
  });
});
