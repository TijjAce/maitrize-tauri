import { describe, it, expect } from "vitest";
import { REGLAGES_MOTS_MELES, casesDesMots, grilleMotsMeles, htmlMotsMeles, lettresDuMot, motsSaisis } from "./motsMeles";

const mots = motsSaisis(REGLAGES_MOTS_MELES.mots);

describe("les mots mêlés", () => {
  it("lisent les mots saisis, sans accents ni tirets dans la grille", () => {
    expect(lettresDuMot("grand-père")).toBe("GRANDPERE");
    expect(lettresDuMot("l'école")).toBe("LECOLE");
    expect(lettresDuMot("cœur")).toBe("COEUR");
    expect(motsSaisis("chat, Chat\nchien;  \nâne")).toEqual(["chat", "chien", "âne"]);
  });

  it("placent chaque mot, lisible dans sa direction, et remplissent le reste", () => {
    const g = grilleMotsMeles(mots, REGLAGES_MOTS_MELES, 5);
    expect(g.taille).toBe(10);
    expect(g.oublies).toEqual([]);
    expect(g.places).toHaveLength(10);
    for (const m of g.places) {
      expect([[1, 0], [0, 1]]).toContainEqual([m.dx, m.dy]);
      const lu = Array.from({ length: m.lettres.length }, (_, i) => g.cases[m.y + m.dy * i][m.x + m.dx * i]).join("");
      expect(lu).toBe(m.lettres);
    }
    for (const ligne of g.cases) for (const c of ligne) expect(c).toMatch(/^[A-Z]$/);
    expect(grilleMotsMeles(mots, REGLAGES_MOTS_MELES, 5)).toEqual(g);
    expect(grilleMotsMeles(mots, REGLAGES_MOTS_MELES, 6).cases).not.toEqual(g.cases);
  });

  it("agrandissent la grille pour le mot le plus long, et savent les diagonales et l'envers", () => {
    const g = grilleMotsMeles(["anticonstitutionnel", "chat"], { ...REGLAGES_MOTS_MELES, taille: 8 }, 1);
    expect(g.taille).toBe(19);
    expect(g.oublies).toEqual([]);
    const d = grilleMotsMeles(mots, { ...REGLAGES_MOTS_MELES, diagonales: true, inverses: true, taille: 12 }, 3);
    expect(d.oublies).toEqual([]);
    const directions = new Set(d.places.map((m) => `${m.dx},${m.dy}`));
    expect(directions.size).toBeGreaterThan(2);
    for (const m of d.places) {
      const lu = Array.from({ length: m.lettres.length }, (_, i) => d.cases[m.y + m.dy * i][m.x + m.dx * i]).join("");
      expect(lu).toBe(m.lettres);
    }
    // Trop de mots pour une petite grille : on dit ceux qui n'ont pas trouvé place.
    const serree = grilleMotsMeles(Array.from({ length: 19 }, (_, i) => "abcdefghijklmnopqrstuvwxyz".slice(i, i + 8)), { ...REGLAGES_MOTS_MELES, taille: 5 }, 1);
    expect(serree.oublies.length).toBeGreaterThan(0);
  });

  it("s'impriment avec la liste, puis le corrigé où les mots ressortent", () => {
    const g = grilleMotsMeles(mots, REGLAGES_MOTS_MELES, 5);
    const html = htmlMotsMeles([g], REGLAGES_MOTS_MELES);
    expect((html.match(/<td/g) ?? []).length).toBe(2 * 100);
    expect((html.match(/mm-trouve/g) ?? []).length).toBe(casesDesMots(g).size);
    expect(html).toContain("<span>ÂNE</span>");
    expect(html).toContain("de gauche à droite et de haut en bas.");
    const minuscules = htmlMotsMeles([g], { ...REGLAGES_MOTS_MELES, capitales: false, liste: false, inverses: true });
    expect(minuscules).not.toContain("mm-liste");
    expect(minuscules).toMatch(/<td>[a-z]<\/td>/);
    expect(minuscules).toContain("et parfois à l'envers");
    const deux = htmlMotsMeles([g, grilleMotsMeles(mots, REGLAGES_MOTS_MELES, 6)], REGLAGES_MOTS_MELES);
    expect((deux.match(/class="page"/g) ?? []).length).toBe(2);
    expect((deux.match(/class="page corrige"/g) ?? []).length).toBe(2);
    expect(deux).toContain("corrigé de la grille 2");
  });
});
