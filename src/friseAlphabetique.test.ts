import { describe, it, expect } from "vitest";
import { MOTS_DE_LA_FRISE, REGLAGES_FRISE, htmlFrise, motDuDessin, motsDesLettres, reglagesFriseSurs, styleFrise, titreFrise } from "./friseAlphabetique";

describe("la frise alphabétique (programmes de 2024 et de l'école maternelle)", () => {
  it("a un mot pour chaque lettre, et lit ceux qu'on écrit, de toutes les façons", () => {
    expect(Object.keys(MOTS_DE_LA_FRISE)).toHaveLength(26);
    for (const [lettre, mot] of Object.entries(MOTS_DE_LA_FRISE)) expect(mot.normalize("NFD").charAt(0), lettre).toBe(lettre);
    const mots = motsDesLettres("a avion\nB : bateau\nchat\nd\n\n  E – éléphant ");
    expect([mots.a, mots.b, mots.c, mots.d, mots.e, mots.f]).toEqual(["avion", "bateau", "chat", "", "éléphant", "fleur"]);
    expect(motDuDessin("wagon")).toBe("wagonnet");
    expect(motDuDessin("avion")).toBe("avion");
    expect(reglagesFriseSurs(null)).toEqual(REGLAGES_FRISE);
    expect(reglagesFriseSurs({ ecritures: [] }).ecritures).toEqual(["capitale", "script", "cursive"]);
    expect(reglagesFriseSurs({ ecritures: ["cursive", "capitale"] }).ecritures).toEqual(["capitale", "cursive"]);
  });

  it("met chaque lettre dans ses trois écritures, avec son mot et son dessin", () => {
    const html = htmlFrise({}, { avion: "data:image/png;base64,AAAA" });
    expect(html.match(/class="ab-case"/g)).toHaveLength(26);
    expect(html).toContain('<span class="ab-l ab-capitale">A</span><span class="ab-l ab-script">a</span><span class="ab-l ab-cursive">a</span>');
    expect(html).toContain("<b>a</b>vion");
    expect(html.match(/class="ab-dessin"/g)).toHaveLength(1);
    expect(html).toContain("ARASAAC");
    // Sans dessin, pas de mention.
    expect(htmlFrise({ images: false }, { avion: "data:x" })).not.toContain("ARASAAC");
    // Les voyelles en rouge, les consonnes en bleu.
    const couleurs = htmlFrise({ voyelles: true });
    expect(couleurs).toContain('style="--ab-couleur:#d33a32"');
    expect(couleurs).toContain('style="--ab-couleur:#2a6fd6"');
  });

  it("s'imprime en frise, en lettres d'une page, ou en bandes pour la table de l'élève", () => {
    expect(htmlFrise({ format: "frise", parPage: 6 }).match(/class="page ab-page-frise/g)).toHaveLength(5);
    expect(htmlFrise({ format: "frise", parPage: 7 }).match(/class="page ab-page-frise/g)).toHaveLength(4);
    expect(htmlFrise({ format: "lettre" }).match(/class="page ab-page-lettre/g)).toHaveLength(26);
    const bandes = htmlFrise({ format: "bande" });
    expect(bandes.match(/class="ab-bande/g)).toHaveLength(2);
    expect(bandes.match(/class="ab-case"/g)).toHaveLength(52);
    expect(styleFrise({ format: "frise" })).toContain("landscape");
    expect(styleFrise({ format: "lettre" })).not.toContain("landscape");
    expect(titreFrise({ format: "bande" })).toBe("La bande alphabétique");
  });
});
