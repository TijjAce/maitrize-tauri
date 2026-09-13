import { describe, it, expect } from "vitest";
import { documentImprimable, escapeHtml } from "./print";

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
