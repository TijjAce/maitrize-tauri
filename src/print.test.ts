import { describe, it, expect } from "vitest";
import { colonnesDuTableau, dataUrlImage, documentImprimable, escapeHtml, partDeColonne } from "./print";

describe("documents imprimables", () => {
  it("gardent les couleurs à l'impression et dans le PDF", () => {
    const html = documentImprimable("EDT", "<p>x</p>");
    expect(html).toContain("print-color-adjust: exact");
    expect(html).toContain("-webkit-print-color-adjust: exact");
  });
  it("échappent le titre", () => {
    expect(documentImprimable("<b>", "")).toContain(`<title>${escapeHtml("<b>")}</title>`);
  });
});

describe("images imprimées", () => {
  it("portent le type de leur fichier", () => {
    expect(dataUrlImage("photo.JPG", "AAA")).toBe("data:image/jpeg;base64,AAA");
    expect(dataUrlImage("schema.png", "BBB")).toBe("data:image/png;base64,BBB");
    expect(dataUrlImage("dessin.svg", "CCC")).toBe("data:image/svg+xml;base64,CCC");
    expect(dataUrlImage("sans-extension", "DDD")).toBe("data:image/png;base64,DDD");
  });
});

describe("largeur des colonnes d'un tableau de déroulement", () => {
  it("donne la place au texte, pas à la durée", () => {
    expect(partDeColonne("Durée")).toBeLessThan(partDeColonne("Phase"));
    expect(partDeColonne("Phase")).toBeLessThan(partDeColonne("Posture de l'enseignant"));
    expect(partDeColonne("Posture de l'enseignant")).toBeLessThan(partDeColonne("Description"));
    // Les accents et la casse ne changent rien.
    expect(partDeColonne("DÉROULEMENT")).toBe(partDeColonne("description"));
    // Une colonne inconnue prend une part moyenne.
    expect(partDeColonne("Trucs")).toBe(2);
  });

  it("répartit les largeurs en pourcentages qui font cent", () => {
    const html = colonnesDuTableau(["Phase", "Durée", "Description", "Posture de l'enseignant"]);
    const parts = [...html.matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(parts.length).toBe(4);
    expect(Math.round(parts.reduce((a, b) => a + b, 0))).toBe(100);
    // La description tient la plus grande place, la durée la plus petite.
    expect(Math.max(...parts)).toBe(parts[2]);
    expect(Math.min(...parts)).toBe(parts[1]);
    expect(colonnesDuTableau([])).toBe("");
  });
});
