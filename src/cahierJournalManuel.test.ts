import { describe, it, expect } from "vitest";
import {
  imagesDuTexte, ligneDeCompetence, ligneDeManuel, ligneDuManuel, marqueurImage, poserImage, protegerImages,
  restaurerImages, retirerImage,
} from "./cahierJournal";

describe("citer un manuel dans le prévu", () => {
  it("écrit le manuel et sa page, et le passage s'il est surligné", () => {
    expect(ligneDeManuel("Cap Maths CE1", 42)).toBe("📖 Cap Maths CE1 · p. 42");
    expect(ligneDeManuel("Cap Maths CE1", 42, "  Compare  les\nnombres ")).toBe("📖 Cap Maths CE1 · p. 42 — « Compare les nombres »");
    // Une page inconnue ne laisse pas « p. 0 » derrière elle.
    expect(ligneDeManuel("", 0)).toBe("📖 Manuel");
  });

  it("pose l'image sous la ligne du manuel, une seule fois", () => {
    const ligne = ligneDeManuel("Cap Maths CE1", 42);
    const prevu = `Rituels\n${ligne}\nCalcul mental`;
    const avec = poserImage(prevu, "p42.png", ligne);
    expect(avec).toBe(`Rituels\n${ligne}\n${marqueurImage("p42.png")}\nCalcul mental`);
    // Reposer la même image ne la met pas deux fois.
    expect(poserImage(avec, "p42.png", ligne)).toBe(avec);
    // Sans ligne où s'accrocher, elle va à la fin.
    expect(poserImage("Rituels", "p42.png")).toBe(`Rituels\n${marqueurImage("p42.png")}`);
    expect(poserImage("", "p42.png")).toBe(marqueurImage("p42.png"));
  });

  it("retrouve les images du texte, et les retire sans laisser de trou", () => {
    const texte = `Rituels ${marqueurImage("a.png")}\n${marqueurImage("b.png")}\nCalcul`;
    expect(imagesDuTexte(texte)).toEqual(["a.png", "b.png"]);
    expect(retirerImage(texte, "b.png")).toBe(`Rituels ${marqueurImage("a.png")}\nCalcul`);
    expect(retirerImage(texte, "a.png")).toBe(`Rituels\n${marqueurImage("b.png")}\nCalcul`);
    expect(imagesDuTexte("Rien ici")).toEqual([]);
  });

  it("reconnaît la ligne qui cite déjà cette page, pour y accrocher l'image", () => {
    const avecPassage = `Rituels\n${ligneDeManuel("Cap Maths CE1", 42, "Compare les nombres")}`;
    expect(ligneDuManuel(avecPassage, "Cap Maths CE1", 42)).toBe(ligneDeManuel("Cap Maths CE1", 42, "Compare les nombres"));
    expect(ligneDuManuel(avecPassage, "Cap Maths CE1", 43)).toBeNull();
    expect(ligneDuManuel("Rituels", "Cap Maths CE1", 42)).toBeNull();
  });
});

describe("poser une compétence dans le prévu", () => {
  it("écrit la compétence, son niveau et son référentiel", () => {
    expect(ligneDeCompetence("Lire les nombres jusqu'à 100", "Cycle 2")).toBe("🎯 Lire les nombres jusqu'à 100 (Cycle 2)");
    expect(ligneDeCompetence("  Compter   en avançant ", "", "CP")).toBe("🎯 [CP] Compter en avançant");
    expect(ligneDeCompetence("   ", "Cycle 2")).toBe("");
  });
});

describe("corriger un prévu qui contient des images", () => {
  it("met les images de côté, puis les remet à leur place", () => {
    const avant = `Rituels ${marqueurImage("a3f.png")}\nCalcul ${marqueurImage("b7.png")}`;
    const { texte, images } = protegerImages(avant);
    expect(texte).toBe("Rituels [IMG1]\nCalcul [IMG2]");
    expect(images).toEqual(["a3f.png", "b7.png"]);
    expect(restaurerImages("Rituels [IMG1]\nCalculs [IMG2]", images))
      .toBe(`Rituels ${marqueurImage("a3f.png")}\nCalculs ${marqueurImage("b7.png")}`);
  });

  it("rattrape une image que l'IA aurait perdue, et ignore un jeton inventé", () => {
    expect(restaurerImages("Rituels", ["a.png"])).toBe(`Rituels\n${marqueurImage("a.png")}`);
    expect(restaurerImages("Rituels [IMG9]", ["a.png"])).toBe(`Rituels\n${marqueurImage("a.png")}`);
    expect(restaurerImages("Rien", [])).toBe("Rien");
  });
});
