import { describe, expect, it } from "vitest";
import { REGLAGES_GEOMETRIE, grilleSvg, htmlGeometrie } from "./geometrie";

const compter = (html: string, motif: string) => html.split(motif).length - 1;

describe("reproduire une figure avec un repère orthonormé (demande de l'enseignant, octobre 2026)", () => {
  it("sans repère, la grille est celle d'avant : un millimètre de marge tout autour", () => {
    const g = grilleSvg(8, 8, 6, "quadrille", "");
    expect(g).toContain('viewBox="0 0 50.00 50.00"');
    expect(g).toContain('<g transform="translate(1 1)">');
    expect(g).not.toContain("ge-axe");
  });

  it("pose l'origine en bas à gauche, deux axes fléchés, et un numéro à chaque nœud, un carreau pour unité", () => {
    const g = grilleSvg(8, 8, 6, "quadrille", "", true);
    // De la place à gauche et en bas pour les nombres, en haut et à droite pour les flèches.
    expect(g).toContain('viewBox="0 0 58.00 58.00"');
    expect(g).toContain('<g transform="translate(6 4)">');
    expect(compter(g, 'class="ge-axe"')).toBe(2);
    expect(compter(g, "<path ")).toBe(2);
    // 0 à 8 sous l'axe des abscisses, 1 à 8 le long de celui des ordonnées : le 0 de l'origine une seule fois.
    const nombres = [...g.matchAll(/class="ge-graduation"[^>]*>(\d+)</g)].map((m) => Number(m[1]));
    expect(nombres).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8]);
    // Le 2 des ordonnées est à la hauteur de la deuxième ligne en partant du bas (y = 52 − 12, plus le décalage du texte).
    expect(g).toContain('x="4.40" y="41.10" font-size="3.2" font-family="Helvetica, Arial, sans-serif" text-anchor="end" fill="#1c2233">2<');
    // Le papier pointé a le même repère.
    expect(compter(grilleSvg(8, 8, 7, "pointe", "", true), 'class="ge-axe"')).toBe(2);
  });

  it("met le même repère sur le modèle, la grille de l'élève et le calque, et dit comment s'en servir", () => {
    const avec = htmlGeometrie({ ...REGLAGES_GEOMETRIE, exercice: "reproduire", combien: 3, repere: true }, 7);
    // Trois figures : le modèle et la reproduction, puis le calque et sa grille — deux axes chacune.
    expect(compter(avec, 'class="ge-axe"')).toBe(2 * 2 * 3 * 2);
    expect(avec).toContain("Lis chaque coin de la figure sur les deux axes");
    const sans = htmlGeometrie({ ...REGLAGES_GEOMETRIE, exercice: "reproduire", combien: 3 }, 7);
    expect(sans).not.toContain("ge-axe");
    expect(sans).toContain("Compte les carreaux");
    // Un réglage gardé d'avant, sans repère : la feuille d'avant.
    const { repere: _sansRepere, ...ancien } = REGLAGES_GEOMETRIE;
    expect(htmlGeometrie(ancien, 7)).toBe(sans);
  });
});
