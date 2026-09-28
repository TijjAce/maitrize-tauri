import { describe, it, expect } from "vitest";
import { REGLAGES_HEURE, autreLecture, heures, horlogeSvg, htmlHeure, lireHeure } from "./heure";

describe("lire l'heure", () => {
  it("tire des heures à la précision demandée, toutes différentes", () => {
    const pile = heures(REGLAGES_HEURE, 1);
    expect(pile).toHaveLength(9);
    for (const t of pile) { expect(t.m).toBe(0); expect(t.h).toBeGreaterThanOrEqual(1); expect(t.h).toBeLessThanOrEqual(12); }
    expect(new Set(pile.map(lireHeure)).size).toBe(9);
    const cinq = heures({ ...REGLAGES_HEURE, precision: "cinq", apresMidi: true, combien: 24 }, 2);
    for (const t of cinq) { expect(t.m % 5).toBe(0); expect(t.h).toBeLessThanOrEqual(23); }
    expect(new Set(cinq.map(lireHeure)).size).toBe(24);
    // Douze heures pile le matin : au-delà, on repasse.
    expect(heures({ ...REGLAGES_HEURE, combien: 15 }, 3)).toHaveLength(15);
    expect(heures(REGLAGES_HEURE, 1)).toEqual(pile);
  });

  it("écrit l'heure comme au tableau, et sait l'autre lecture du cadran", () => {
    expect(lireHeure({ h: 7, m: 5 })).toBe("7 h 05");
    expect(lireHeure({ h: 12, m: 30 })).toBe("12 h 30");
    expect(autreLecture({ h: 7, m: 30 })).toEqual({ h: 19, m: 30 });
    expect(autreLecture({ h: 19, m: 30 })).toEqual({ h: 7, m: 30 });
  });

  it("dessine le cadran, avec ou sans aiguilles", () => {
    const avec = horlogeSvg({ h: 3, m: 0 });
    expect(avec).toContain('class="he-heures"');
    expect(avec).toContain('class="he-minutes"');
    // À trois heures, la petite aiguille pointe à droite, la grande en haut.
    expect(avec).toMatch(/he-heures" x1="50" y1="50" x2="72\.0" y2="50\.0"/);
    expect(avec).toMatch(/he-minutes" x1="50" y1="50" x2="50\.0" y2="14\.0"/);
    expect((avec.match(/<text/g) ?? []).length).toBe(12);
    expect(horlogeSvg(null)).not.toContain("he-heures");
  });

  it("s'imprime en cartes, avec le corrigé et les deux lectures l'après-midi", () => {
    const liste = heures(REGLAGES_HEURE, 4);
    const html = htmlHeure(liste, REGLAGES_HEURE);
    expect((html.match(/class="he-carte"/g) ?? []).length).toBe(9);
    expect((html.match(/he-heures/g) ?? []).length).toBe(9);
    expect(html).toContain("Lire l'heure — corrigé");
    const dessiner = htmlHeure(liste, { ...REGLAGES_HEURE, sens: "dessiner" });
    expect(dessiner).not.toContain("he-heures");
    expect(dessiner).toContain("Dessine les aiguilles : <b>");
    const mixte = htmlHeure(liste, { ...REGLAGES_HEURE, sens: "mixte" });
    expect((mixte.match(/he-heures/g) ?? []).length).toBe(5);
    const pm = htmlHeure([{ h: 19, m: 30 }], { ...REGLAGES_HEURE, apresMidi: true });
    expect(pm).toContain("<b>7 h 30 ou 19 h 30</b>");
    expect(pm).toContain("après-midi : ......... h .........");
  });
});
