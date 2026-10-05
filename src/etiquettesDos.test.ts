import { describe, it, expect } from "vitest";
import { REGLAGES_DOS, encreSur, htmlEtiquettesDos, mesures, nomAuDos, parPage, reglagesSurs, tailleDuNom } from "./etiquettesDos";

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("les étiquettes de dos de classeur", () => {
  it("ont les mesures du porte-étiquette, ou celles qu'on a prises", () => {
    expect(mesures(reglagesSurs({ format: "levier80" }))).toEqual({ largeur: 61, hauteur: 192 });
    expect(mesures(reglagesSurs({ format: "levier50" }))).toEqual({ largeur: 38, hauteur: 192 });
    expect(mesures(reglagesSurs({ format: "mesure", largeur: 28, hauteur: 140 }))).toEqual({ largeur: 28, hauteur: 140 });
    // Des mesures hors de portée se ramènent à ce qui s'imprime.
    expect(mesures(reglagesSurs({ format: "mesure", largeur: 400, hauteur: 2 }))).toEqual({ largeur: 90, hauteur: 60 });
  });

  it("se réparent : des matières sans doublon, des étiquettes en plus à la couleur valide", () => {
    const r = reglagesSurs({ format: "?", choisies: ["EPS", "EPS", "", 3 as never], autres: [{ texte: "Évaluations", couleur: "#123456" }, { texte: "x", couleur: "rouge" }] });
    expect(r.format).toBe(REGLAGES_DOS.format);
    expect(r.choisies).toEqual(["EPS"]);
    expect(r.autres).toEqual([{ texte: "Évaluations", couleur: "#123456" }]);
  });

  it("écrivent un domaine sans son numéro", () => {
    expect(nomAuDos("1. Mobiliser le langage dans toutes ses dimensions")).toBe("Mobiliser le langage dans toutes ses dimensions");
    expect(nomAuDos("Mathématiques")).toBe("Mathématiques");
  });

  it("donnent au nom la plus grande taille qui tient, sur plusieurs lignes s'il le faut", () => {
    const court = tailleDuNom("EPS", 160, 32);
    const long = tailleDuNom("Mobiliser le langage dans toutes ses dimensions", 160, 32);
    expect(court).toBeGreaterThan(long);
    expect(long).toBeGreaterThanOrEqual(5);
    for (const [texte, longueur, epaisseur] of [["Questionner le monde", 170, 32], ["Agir, s'exprimer, comprendre à travers l'activité physique", 170, 55], ["Français", 120, 22]] as const) {
      const f = tailleDuNom(texte, longueur, epaisseur);
      const lignes = Math.ceil((0.62 * f * texte.length) / (longueur * 0.9));
      expect(lignes * 1.18 * f, texte).toBeLessThanOrEqual(epaisseur);
    }
  });

  it("écrivent en blanc sur une couleur foncée, en foncé sur une couleur claire", () => {
    expect(encreSur("#1971c2")).toBe("#ffffff");
    expect(encreSur("#a16207")).toBe("#ffffff");
    expect(encreSur("#eab308")).toBe("#1c2233");
    expect(encreSur("#06b6d4")).toBe("#1c2233");
  });

  it("se rangent côte à côte sur la page A4 : deux grandes, quatre moyennes", () => {
    expect(parPage(61, 192)).toEqual({ colonnes: 2, rangees: 1 });
    expect(parPage(38, 192)).toEqual({ colonnes: 4, rangees: 1 });
    expect(parPage(30, 100)).toEqual({ colonnes: 4, rangees: 2 });
  });

  it("s'impriment une par matière, à sa couleur, avec la classe en haut et le nom de bas en haut", () => {
    const etiquettes = ["Français", "Mathématiques", "EPS", "Arts plastiques", "EMC"].map((texte, i) => ({ texte, couleur: ["#3b82f6", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"][i] }));
    const html = htmlEtiquettesDos(etiquettes, reglagesSurs({ format: "levier50", haut: "CE1 · 2026-2027" }));
    expect(compter(html, /class="dos"/g)).toBe(5);
    expect(compter(html, /<div class="page">/g)).toBe(2);
    expect(compter(html, /CE1 · 2026-2027/g)).toBe(5);
    expect(html).toContain("background:#f59e0b;color:#1c2233");
    expect(html).toContain("background:#3b82f6;color:#ffffff");
    expect(html).toMatch(/class="dos-nom" style="height:\d+(\.\d+)?mm;font-size:[\d.]+mm">Mathématiques</);
  });
});
