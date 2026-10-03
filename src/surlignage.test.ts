import { describe, it, expect } from "vitest";
import { prenomsNommes, segmentsDuBilan } from "./surlignage";

const classe = ["AURELIEN", "LOUISON", "Rose"];
const enClair = (texte: string) => segmentsDuBilan(texte, classe).map((s) => (s.genre ? `[${s.genre}:${s.texte}]` : s.texte)).join("");

describe("ce que le bilan montre en couleur", () => {
  it("la phrase qui nomme un élève, et son prénom plus fort ; le reste tel quel", () => {
    expect(enClair("AURELIEN a bien travaillé. Le jeu a plu à tous."))
      .toBe("[nom:AURELIEN][phrase: a bien travaillé.] Le jeu a plu à tous.");
    expect(enClair("Bonne séance.\n  Louison a aidé Aurelien  \nFin"))
      .toBe("Bonne séance.\n  [nom:Louison][phrase: a aidé ][nom:Aurelien]  \nFin");
  });

  it("redonne le texte au caractère près, retours à la ligne compris", () => {
    const texte = "Rose a rangé !\n\nLa salle était calme…  AURELIEN aussi\n";
    expect(segmentsDuBilan(texte, classe).map((s) => s.texte).join("")).toBe(texte);
    expect(segmentsDuBilan("", classe)).toEqual([]);
  });

  it("un mot qui n'est pas un prénom reste sans couleur", () => {
    expect(enClair("Nous avons peint en rose.")).toBe("Nous avons peint en rose.");
    expect(enClair("ROSELINE a chanté.")).toBe("ROSELINE a chanté.");
  });

  it("dit qui recevra une note, dans l'ordre de la classe", () => {
    expect(prenomsNommes("Louison et AURELIEN ont joué.", classe)).toEqual(["AURELIEN", "LOUISON"]);
    expect(prenomsNommes("Séance calme.", classe)).toEqual([]);
  });
});
