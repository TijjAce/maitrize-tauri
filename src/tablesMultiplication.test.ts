import { describe, it, expect } from "vitest";
import {
  REGLAGES_MULTIPLICATION, ecritureDuProduit, htmlMultiplication, rectangleDePoints, reglagesMultiplicationSurs, titreMultiplication,
} from "./tablesMultiplication";

const texte = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("les tables de multiplication à afficher (programme de mathématiques du cycle 2, 2024)", () => {
  it("lit des réglages abîmés sans se tromper, et garde toujours une table", () => {
    expect(reglagesMultiplicationSurs(null)).toEqual(REGLAGES_MULTIPLICATION);
    const r = reglagesMultiplicationSurs({ tables: [7, 3, 3, 12, -1], forme: "pythagore", ecriture: "egalite", points: false });
    expect(r.tables).toEqual([3, 7]);
    expect([r.forme, r.ecriture, r.points]).toEqual(["pythagore", "egalite", false]);
    expect(reglagesMultiplicationSurs({ tables: [] }).tables).toEqual(REGLAGES_MULTIPLICATION.tables);
  });

  it("écrit chaque produit dans les deux sens, comme le programme le demande", () => {
    expect(texte(ecritureDuProduit(3, 4, "produit")).trim()).toBe("3 × 4 = 12");
    expect(texte(ecritureDuProduit(3, 4, "inverse")).trim()).toBe("4 × 3 = 12");
    expect(texte(ecritureDuProduit(3, 4, "egalite")).trim()).toBe("12 = 3 × 4");
  });

  it("fait une page par table, de 3 × 1 à 3 × 10, chaque produit avec son rectangle de n rangées de k points", () => {
    const html = htmlMultiplication({ tables: [3], forme: "table" });
    expect(html.match(/class="page tm-page"/g)).toHaveLength(1);
    expect(texte(html)).toContain("La table de 3");
    expect(texte(html)).toContain("3 × 1 = 3");
    expect(texte(html)).toContain("3 × 10 = 30");
    expect(texte(html)).not.toContain("3 × 0 = 0");
    expect(texte(htmlMultiplication({ tables: [3], avecZero: true }))).toContain("3 × 0 = 0");
    // 3 × 4 : trois rangées de quatre points.
    expect(rectangleDePoints(3, 4, 18).match(/<circle/g)?.length ?? 0).toBeGreaterThanOrEqual(12);
    expect(rectangleDePoints(0, 4, 18)).toBe("");
    // Sans les points, rien que les écritures.
    expect(htmlMultiplication({ tables: [3], points: false })).not.toContain("tm-points");
    // Pour l'élève : quatre fois sur la planche.
    expect(htmlMultiplication({ tables: [2, 5], format: "eleve" }).match(/class="tm-petit"/g)).toHaveLength(8);
  });

  it("croise toutes les tables dans celle de Pythagore, les tables choisies en couleur et les carrés sur la diagonale", () => {
    const html = htmlMultiplication({ forme: "pythagore", tables: [7] });
    expect(texte(html)).toContain("La table de Pythagore");
    // 10 × 10 produits, sans le 0.
    expect(html.match(/class="tm-case[^"]*"/g)).toHaveLength(100);
    expect(html.match(/tm-carre/g)).toHaveLength(10);
    // La ligne et la colonne du 7 : 19 cases.
    expect(html.match(/tm-choisie/g)).toHaveLength(19);
    expect(htmlMultiplication({ forme: "pythagore", avecZero: true }).match(/class="tm-case[^"]*"/g)).toHaveLength(121);
  });

  it("donne au document un titre qui dit ce qu'il contient", () => {
    expect(titreMultiplication({ forme: "table", tables: [3], titre: "La table de" })).toBe("La table de 3");
    expect(titreMultiplication({ forme: "table", tables: [2, 5, 10], titre: "La table de" })).toBe("Les tables de 2, 5 et 10");
    expect(titreMultiplication({ forme: "pythagore", tables: [2], titre: "La table de" })).toBe("La table de Pythagore");
  });
});
