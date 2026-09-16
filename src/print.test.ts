import { describe, it, expect } from "vitest";
import { dataUrlImage, documentImprimable, escapeHtml } from "./print";

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
