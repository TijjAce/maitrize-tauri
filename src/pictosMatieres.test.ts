import { describe, it, expect } from "vitest";
import { MATIERES } from "./api";
import { MATIERES_EN_PICTOS, MOTS_DES_MATIERES, etiquetteDeMatiere, matieresAvecPicto, motsDeLaMatiere, pictosDesMatieresProposes } from "./pictosMatieres";

describe("les matières en pictos", () => {
  it("prennent tout le planning, sauf « Autre », chacune avec ses mots pour ARASAAC", () => {
    expect(MATIERES_EN_PICTOS).toEqual(MATIERES.filter((m) => m !== "Autre"));
    for (const m of MATIERES_EN_PICTOS) expect(MOTS_DES_MATIERES[m]?.length, m).toBeGreaterThan(0);
    expect(motsDeLaMatiere("Inconnue")).toEqual(["inconnue"]);
  });

  it("proposent le picto de la matière avant celui de ce qui s'y fait", () => {
    const trouves = [
      { id: 2714, mot: "compter", scolaire: true },
      { id: 10260, mot: "mathématiques" },
      { id: 32705, mot: "anglais" },
      { id: 2315, mot: "chanter", scolaire: false },
    ];
    // « compter » est un dessin de la classe : il ne passe pas pour autant devant les mathématiques.
    expect(pictosDesMatieresProposes(["Mathématiques", "LVE / Anglais", "Éducation musicale", "EMC"], trouves))
      .toEqual({ "Mathématiques": 10260, "LVE / Anglais": 32705, "Éducation musicale": 2315 });
    // Au cycle 1, « Structurer sa pensée », c'est d'abord compter.
    expect(pictosDesMatieresProposes(["Structurer sa pensée"], trouves)).toEqual({ "Structurer sa pensée": 2714 });
  });

  it("s'écrivent sans abréviation et se rangent dans l'ordre du planning", () => {
    expect(etiquetteDeMatiere("LVE / Anglais")).toBe("Anglais");
    expect(etiquetteDeMatiere("Sciences et techno.")).toBe("Sciences et technologie");
    expect(etiquetteDeMatiere("EPS")).toBe("EPS");
    expect(matieresAvecPicto({ EPS: 1, "Français": 2, Autre: 3 })).toEqual(["Français", "EPS"]);
  });
});
