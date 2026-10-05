import { describe, it, expect, afterEach } from "vitest";
import { avecCouleurChoisie, couleurParDefaut, couleurPourMatiere, matiereDuDomaine, setMatiereOverrides, teinteCreneau, teinteSequence, couleurHex, COULEURS } from "./api";

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

  it("un domaine du référentiel prend la couleur de sa matière, et le choix qu'on lui a fait", () => {
    // La séquence porte le domaine de sa compétence, écrit en entier.
    expect(matiereDuDomaine("1. Mobiliser le langage dans toutes ses dimensions")).toBe("Mobiliser le langage");
    expect(couleurPourMatiere("1. Mobiliser le langage dans toutes ses dimensions")).toBe("blue");
    expect(teinteSequence({ matiere: "1. Mobiliser le langage dans toutes ses dimensions", couleur: "green" })).toBe(couleurHex.blue);
    setMatiereOverrides({ "Mobiliser le langage": "purple" });
    expect(couleurPourMatiere("1. Mobiliser le langage dans toutes ses dimensions")).toBe("purple");
    // Les autres domaines de maternelle, ceux de 2025 compris, et ceux des cycles 2 et 3.
    const attendus: [string, string][] = [
      ["2. Agir, s'exprimer, comprendre à travers l'activité physique", "Activité physique"],
      ["3. Agir, s'exprimer, comprendre à travers des activités artistiques", "Activités artistiques"],
      ["3. Agir, s'exprimer, comprendre à travers les activités artistiques", "Activités artistiques"],
      ["4. Acquérir les premiers outils mathématiques", "Structurer sa pensée"],
      ["5. Explorer le monde", "Explorer le monde"],
      ["5. Se repérer dans le temps et l'espace", "Explorer le monde"],
      ["6. Découvrir le monde du vivant, de la matière et des objets", "Explorer le monde"],
      ["Sciences et technologie", "Sciences et techno."],
      ["Histoire-géographie", "Histoire-Géographie"],
      ["Enseignement moral et civique", "EMC"],
      ["Éducation physique et sportive", "EPS"],
      ["Enseignements artistiques", "Arts plastiques"],
      ["Langues vivantes étrangères et régionales", "LVE / Anglais"],
    ];
    for (const [domaine, matiere] of attendus) expect(matiereDuDomaine(domaine), domaine).toBe(matiere);
    // Une matière de la liste et un intitulé de l'emploi du temps restent eux-mêmes.
    for (const m of ["Mobiliser le langage", "Français", "domaine 1", "Sensoriel - domaine 1,3", "Mathématiques renforcement"]) expect(matiereDuDomaine(m), m).toBeNull();
  });

  it("un domaine peut avoir sa couleur à lui ; reprendre celle de sa matière efface ce choix", () => {
    const choix = { "Mobiliser le langage": "red" };
    const domaine = "1. Mobiliser le langage dans toutes ses dimensions";
    // Le bleu par défaut de la matière n'est pas celui qu'il prend : on le retient.
    expect(avecCouleurChoisie(choix, domaine, "blue")).toEqual({ ...choix, [domaine]: "blue" });
    // Le rouge de sa matière, il l'a déjà : rien à retenir.
    expect(avecCouleurChoisie({ ...choix, [domaine]: "blue" }, domaine, "red")).toEqual(choix);
    setMatiereOverrides({ ...choix, [domaine]: "teal" });
    expect(couleurPourMatiere(domaine)).toBe("teal");
    expect(couleurPourMatiere("Mobiliser le langage")).toBe("red");
  });

  it("toute couleur par défaut se choisit dans la palette", () => {
    for (const intitule of ["domaine 1", "Sensoriel - domaine 1,3", "Lecture Borel Maisonny", "Synthèse", "invité"]) {
      expect(COULEURS).toContain(couleurParDefaut(intitule));
    }
  });
});
