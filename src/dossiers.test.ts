import { describe, it, expect } from "vitest";
import {
  arbre, aplatir, deplacementValide, estDans, normaliser, parent, renommerChemin,
} from "./dossiers";

const el = (dossier: string, id = dossier + Math.random()) => ({ id, dossier });

describe("chemins", () => {
  it("nettoie ce qui est saisi", () => {
    expect(normaliser("  Français / Lecture  ")).toBe("Français/Lecture");
    expect(normaliser("//Français//")).toBe("Français");
    expect(normaliser("   ")).toBe("");
  });

  it("connaît son parent", () => {
    expect(parent("Français/Lecture/Sons")).toBe("Français/Lecture");
    expect(parent("Français")).toBe("");
  });

  it("sait ce qu'un dossier contient", () => {
    expect(estDans("Français/Lecture", "Français")).toBe(true);
    expect(estDans("Français", "Français")).toBe(true);
    expect(estDans("Mathématiques", "Français")).toBe(false);
    // Piège : un nom qui commence pareil n'est pas dedans.
    expect(estDans("Francophonie", "Français")).toBe(false);
    expect(estDans("n'importe quoi", "")).toBe(true);
  });
});

describe("arbre", () => {
  it("crée les dossiers intermédiaires", () => {
    // Sans cela l'arbre a des trous et « Français » serait inatteignable.
    const a = arbre([el("Français/Lecture/Sons")]);
    expect(a).toHaveLength(1);
    expect(a[0].chemin).toBe("Français");
    expect(a[0].enfants[0].chemin).toBe("Français/Lecture");
    expect(a[0].enfants[0].enfants[0].nom).toBe("Sons");
  });

  it("compte le direct et le total", () => {
    const a = arbre([el("Français"), el("Français/Lecture"), el("Français/Lecture")]);
    expect(a[0].directs).toBe(1);
    expect(a[0].total).toBe(3);
    expect(a[0].enfants[0].directs).toBe(2);
  });

  it("ignore ce qui n'est rangé nulle part", () => {
    expect(arbre([el(""), el("   ")])).toEqual([]);
  });

  it("range les dossiers par ordre alphabétique français", () => {
    const a = arbre([el("Écriture"), el("Arts"), el("Zoologie")]);
    expect(a.map((n) => n.nom)).toEqual(["Arts", "Écriture", "Zoologie"]);
  });

  it("ne compte pas deux fois un même dossier", () => {
    const a = arbre([el("Maths"), el("Maths")]);
    expect(a).toHaveLength(1);
    expect(a[0].total).toBe(2);
  });
});

describe("dépliage", () => {
  it("ne montre que les dossiers ouverts", () => {
    const a = arbre([el("Français/Lecture"), el("Maths")]);
    expect(aplatir(a, new Set()).map((n) => n.chemin)).toEqual(["Français", "Maths"]);
    expect(aplatir(a, new Set(["Français"])).map((n) => n.chemin))
      .toEqual(["Français", "Français/Lecture", "Maths"]);
  });
});

describe("renommage", () => {
  it("emmène les sous-dossiers", () => {
    // Sans cela, les sous-dossiers se retrouveraient orphelins à la racine.
    expect(renommerChemin("Français/Lecture", "Français", "Langage")).toBe("Langage/Lecture");
    expect(renommerChemin("Français", "Français", "Langage")).toBe("Langage");
  });

  it("laisse les autres tranquilles", () => {
    expect(renommerChemin("Maths/Calcul", "Français", "Langage")).toBe("Maths/Calcul");
    expect(renommerChemin("Francophonie", "Français", "Langage")).toBe("Francophonie");
  });
});

describe("déplacement", () => {
  it("refuse de mettre un dossier dans lui-même", () => {
    // Le chemin se contiendrait lui-même et le dossier disparaîtrait.
    expect(deplacementValide("Français", "Français")).toBe(false);
    expect(deplacementValide("Français", "Français/Lecture")).toBe(false);
  });

  it("refuse un déplacement sans effet", () => {
    expect(deplacementValide("Français/Lecture", "Français")).toBe(false);
  });

  it("accepte un déplacement vers un autre dossier", () => {
    expect(deplacementValide("Français/Lecture", "Maths")).toBe(true);
    expect(deplacementValide("Français/Lecture", "")).toBe(true);
  });
});
