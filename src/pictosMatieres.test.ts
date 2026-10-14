import { describe, it, expect } from "vitest";
import { MATIERES } from "./api";
import {
  MATIERES_EN_PICTOS, MOTS_DES_MATIERES, domainesParMatiere, etiquetteDeMatiere, formeDuNom, matieresAvecPicto, motsDeLaMatiere, motsDuNom, pictoChoisi,
  pictosDesMatieresProposes,
} from "./pictosMatieres";

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

describe("les domaines en pictos", () => {
  it("se comparent sans numéro, sans accents ni majuscules", () => {
    expect(formeDuNom("5. Se repérer dans le temps et l'espace")).toBe("se reperer dans le temps et l espace");
    expect(formeDuNom("Écriture")).toBe(formeDuNom("ecriture"));
  });

  it("retrouvent leur picto sous le nom des référentiels, même écrit autrement", () => {
    const choix = { "5. Se repérer dans le temps et l'espace": 3071, "Mathématiques": "sclera:maths" };
    expect(pictoChoisi(choix, "Se repérer dans le temps et l'espace")).toBe(3071);
    expect(pictoChoisi(choix, "Mathématiques")).toBe("sclera:maths");
    expect(pictoChoisi(choix, "Lecture")).toBeNull();
  });

  it("cherchent dans la banque les mots de la matière, ou pour un domaine des mots sûrs, puis son nom — jamais un picto aux mots espagnols", () => {
    expect(motsDuNom("Rituel")).toEqual(MOTS_DES_MATIERES["Rituel"]);
    expect(motsDuNom("Espace et géométrie")).toEqual(["quadrillage", "espace et géométrie", "géométrie"]);
    expect(motsDuNom("Nombres, calcul et résolution de problèmes").slice(0, 3)).toEqual(["nombres", "nombres, calcul et résolution de problèmes", "calcul"]);
    expect(motsDuNom("Grandeurs et mesures")).toContain("mesure");
    expect(motsDuNom("Se situer dans l'histoire")).not.toContain("histoire");
  });

  it("se rangent sous leur matière, depuis les référentiels actifs, une fois chacun", () => {
    const ref = (actif: boolean, domaines: unknown) => ({ actif, donnees: JSON.stringify({ domaines }) });
    const cycle2 = [
      { titre: "Français", sousDomaines: [{ titre: "Lecture" }, { titre: "Écriture" }] },
      { titre: "Mathématiques", sousDomaines: [{ titre: "Grandeurs et mesures" }] },
      { titre: "Histoire-géographie", sousDomaines: [{ titre: "Se situer dans l'espace" }] },
    ];
    const cycle1 = [{ titre: "1. Mobiliser le langage dans toutes ses dimensions", sousDomaines: [{ titre: "L'oral" }] }];
    expect(domainesParMatiere([ref(true, cycle2), ref(true, cycle2), ref(true, cycle1), ref(false, [{ titre: "Français", sousDomaines: [{ titre: "Oral" }] }])])).toEqual({
      "Français": ["Lecture", "Écriture"],
      "Mathématiques": ["Grandeurs et mesures"],
      "Histoire-Géographie": ["Se situer dans l'espace"],
      "Mobiliser le langage": ["1. Mobiliser le langage dans toutes ses dimensions", "L'oral"],
    });
    expect(domainesParMatiere([{ actif: true, donnees: "pas du json" }])).toEqual({});
  });
});
