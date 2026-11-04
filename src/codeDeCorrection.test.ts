import { describe, expect, it } from "vitest";
import {
  ERREURS, REGLAGES_CODE_CORRECTION, htmlCodeCorrection, reglagesCodeCorrectionSurs, titreCodeCorrection,
} from "./codeDeCorrection";

const codes = (html: string) => [...html.matchAll(/class="cc-code">([^<]+)</g)].map((m) => m[1]);

describe("Le code de correction des écrits", () => {
  it("s'en tient au CE1 à ce que dit le guide : les sons, le dictionnaire, les deux accords", () => {
    expect(REGLAGES_CODE_CORRECTION.types).toEqual(["son", "dictionnaire", "gn", "verbe"]);
    expect(codes(htmlCodeCorrection({}))).toEqual(["S", "D", "GN", "V"]);
  });

  it("ajoute les homophones et le découpage des mots sur demande, dans l'ordre", () => {
    expect(codes(htmlCodeCorrection({ types: ["decoupage", "son", "homophones"] }))).toEqual(["S", "H", "/"]);
  });

  it("prend les codes et les couleurs de la classe", () => {
    const html = htmlCodeCorrection({ codes: { son: "🔊", verbe: "" }, couleurs: { son: "#123456", gn: "rouge" } });
    expect(codes(html)).toEqual(["🔊", "D", "GN", "V"]);
    expect(html).toContain("--cc-teinte:#123456");
    expect(html).toContain(`--cc-teinte:${ERREURS.find((e) => e.id === "gn")!.couleur}`);
  });

  it("montre ce que l'élève fait pour corriger, et un exemple, ou non", () => {
    const html = htmlCodeCorrection({});
    expect(html).toContain("Je trouve le verbe et son sujet.");
    expect(html).toContain('<span class="cc-faux">les enfants joue</span>');
    expect(htmlCodeCorrection({ strategies: false })).not.toContain("cc-strategies");
    expect(htmlCodeCorrection({ exemples: false })).not.toContain("cc-exemple");
  });

  it("garde chaque exemple juste d'un côté et faux de l'autre", () => {
    for (const e of ERREURS) expect(e.exemple[0], e.id).not.toBe(e.exemple[1]);
  });

  it("fait une page pour le mur, ou quatre petites pour le cahier", () => {
    expect(htmlCodeCorrection({ format: "cahier" }).match(/cc-petit/g)).toHaveLength(4);
    expect(titreCodeCorrection({})).toBe("Je corrige mon écrit");
    expect(titreCodeCorrection({ titre: "Mon code" })).toBe("Mon code");
    expect(htmlCodeCorrection({ titre: "<b>" })).toContain("&lt;b&gt;");
  });

  it("répare des réglages abîmés", () => {
    expect(reglagesCodeCorrectionSurs(null)).toEqual(REGLAGES_CODE_CORRECTION);
    expect(reglagesCodeCorrectionSurs({ types: [] }).types).toEqual(REGLAGES_CODE_CORRECTION.types);
    expect(reglagesCodeCorrectionSurs({ codes: { son: "ABCDEFG" } }).codes.son).toBe("ABCD");
  });
});
