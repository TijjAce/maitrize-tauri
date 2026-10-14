import { describe, it, expect } from "vitest";
import { domainesParMatiere, formeDuNom, lirePictosMatieres, motsDuNom, pictoChoisi } from "./pictosDesMatieres";

describe("les pictos des matières et des domaines", () => {
  it("comparent les noms sans numéro, sans accents ni majuscules", () => {
    expect(formeDuNom("5. Se repérer dans le temps et l'espace")).toBe("se reperer dans le temps et l espace");
    expect(formeDuNom("Écriture")).toBe(formeDuNom("ecriture"));
  });

  it("se relisent sans faire confiance à ce qui est enregistré : un numéro de la banque, ou une photo", () => {
    expect(lirePictosMatieres(JSON.stringify({
      "Français": { id: 36367, mot: "français" }, "Lecture": { id: null, mot: "", photo: "photo-1.jpg" },
      "Vide": { id: null, mot: "rien" }, "": { id: 3 }, "Faux": "36367", "Texte": { id: "12" },
    }))).toEqual({ "Français": { id: 36367, mot: "français" }, "Lecture": { id: null, mot: "", photo: "photo-1.jpg" } });
    expect([lirePictosMatieres(""), lirePictosMatieres("pas du json"), lirePictosMatieres("[1]")]).toEqual([{}, {}, {}]);
  });

  it("se retrouvent sous le nom des référentiels, même écrit autrement", () => {
    const choix = { "5. Se repérer dans le temps et l'espace": { id: 3071, mot: "calendrier" } };
    expect(pictoChoisi(choix, "Se repérer dans le temps et l'espace")?.id).toBe(3071);
    expect(pictoChoisi(choix, "Lecture")).toBeNull();
  });

  it("cherchent dans la banque des mots sûrs d'abord, puis le nom et ses morceaux — jamais un picto aux mots espagnols", () => {
    expect(motsDuNom("Rituel")[0]).toBe("calendrier");
    expect(motsDuNom("Espace et géométrie")).toEqual(["quadrillage", "espace et géométrie", "géométrie"]);
    expect(motsDuNom("Nombres, calcul et résolution de problèmes").slice(0, 3)).toEqual(["nombres", "nombres, calcul et résolution de problèmes", "calcul"]);
    expect(motsDuNom("Histoire-Géographie")).not.toContain("histoire");
    expect(motsDuNom("Français")).toEqual(["français"]);
  });

  it("rangent les domaines des référentiels actifs sous leur matière, une fois chacun", () => {
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
