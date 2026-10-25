import { describe, expect, it } from "vitest";
import { MOTS_PAR_THEME, themesDeDepart } from "./departsEnUnClic";

const libelles = (niveau: string | null) => themesDeDepart(niveau).map((t) => t.libelle);

describe("démarrer en un clic", () => {
  it("propose des thèmes adaptés à la classe", () => {
    expect(libelles("PS, MS")).toEqual(["La ferme", "Les fruits", "Les jouets", "Les vêtements"]);
    expect(libelles("CE1")).toEqual(["Les animaux sauvages", "Les légumes", "Les transports", "Les vêtements"]);
    // Une classe à deux niveaux, moitié maternelle : ceux de la maternelle.
    expect(libelles("GS, CP")).toContain("La ferme");
    expect(libelles(null)).toEqual(["La ferme", "Les fruits", "Les transports", "Les vêtements"]);
    expect(libelles("IME")).toEqual(libelles(null));
  });

  it("pioche dans des catégories de la banque, une feuille à la fois", () => {
    for (const niveau of ["PS", "CE2", null]) {
      for (const t of themesDeDepart(niveau)) expect(t.categorie).toMatch(/^[a-z ]+$/);
    }
    expect(MOTS_PAR_THEME).toBeGreaterThanOrEqual(6);
  });
});
