import { describe, expect, it } from "vitest";
import { REGLAGES_FAMILLES, decompositions, htmlFamilles, reglagesFamillesSurs, titreFamilles } from "./famillesAddition";
import { BILLE_BLEUE, BILLE_ROUGE } from "./numerationCP";

/** Le texte de la feuille, sans ses balises. */
const texte = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
/** Les billes d'une couleur : chacune a son rond, à sa couleur. */
const billes = (html: string, hex: string) => html.split(`fill="${hex}"`).length - 1;

describe("les familles d'addition (demande de l'enseignant, 2026-11-01)", () => {
  it("ont chaque décomposition une fois, la plus petite partie d'abord ; 0 seulement si on le demande", () => {
    expect(decompositions(7)).toEqual([[1, 6], [2, 5], [3, 4]]);
    expect(decompositions(7, true)).toEqual([[0, 7], [1, 6], [2, 5], [3, 4]]);
    expect(decompositions(8)).toEqual([[1, 7], [2, 6], [3, 5], [4, 4]]);
    expect(decompositions(10, true)).toHaveLength(6);
  });

  it("font une maison par nombre, chacune sur sa page, avec les deux sens côte à côte et le double seul", () => {
    const html = htmlFamilles(REGLAGES_FAMILLES);
    expect(html.match(/class="page fa-page"/g)).toHaveLength(3);
    const t = texte(html);
    for (const n of [7, 8, 9]) expect(t).toContain(`La famille du ${n}`);
    expect(t).toContain("3 + 4 = 7");
    expect(t).toContain("4 + 3 = 7");
    expect(t.match(/4 \+ 4 = 8/g)).toHaveLength(1);
    expect(t).toContain("5 + 4 = 9");
    expect(t).not.toMatch(/0 \+|NaN|undefined|null/);
    // L'autre écriture, et 0 au premier étage.
    const autre = texte(htmlFamilles({ nombres: [7], ecriture: "decomposition", avecZero: true }));
    expect(autre).toContain("7 = 0 + 7");
    expect(autre).toContain("7 = 7 + 0");
    expect(autre).toContain("7 = 4 + 3");
  });

  it("dessinent autant de billes que le nombre, les bleues pour la première partie, les rouges pour la seconde", () => {
    // 5 : 1 + 4, 4 + 1, 2 + 3, 3 + 2 — dix bleues et dix rouges ; chaque chiffre à la couleur de ses billes.
    const html = htmlFamilles({ nombres: [5] });
    expect(billes(html, BILLE_BLEUE)).toBe(10);
    expect(billes(html, BILLE_ROUGE)).toBe(10);
    expect(html).toContain('<span class="fa-a">2</span> + <span class="fa-b">3</span> = 5');
    // Dix billes tiennent dans leur case : le pas se resserre ; peu d'étages, de plus grosses billes.
    const largeurs = (html: string) => [...html.matchAll(/class="fa-billes" viewBox="0 0 ([\d.]+) /g)].map((m) => Number(m[1]));
    for (const l of largeurs(htmlFamilles({ nombres: [10], avecZero: true }))) expect(l).toBeLessThanOrEqual(80);
    expect(Math.max(...largeurs(htmlFamilles({ nombres: [7] })))).toBeGreaterThan(Math.max(...largeurs(htmlFamilles({ nombres: [7], avecZero: true })) ) - 1);
    expect(htmlFamilles({ nombres: [7] })).toContain("--fa-ecrit:18mm");
    expect(htmlFamilles({ nombres: [9] })).toContain("--fa-ecrit:13.95mm");
  });

  it("lisent leurs réglages sans leur faire confiance, et disent leur titre", () => {
    expect(reglagesFamillesSurs({ nombres: [9, 1, 11, 7, 7, "x" as unknown as number] }).nombres).toEqual([7, 9]);
    expect(reglagesFamillesSurs({ nombres: [] }).nombres).toEqual([7, 8, 9]);
    expect(reglagesFamillesSurs(null)).toEqual(REGLAGES_FAMILLES);
    expect(reglagesFamillesSurs({ titre: "  " }).titre).toBe("La famille du");
    expect(titreFamilles(REGLAGES_FAMILLES)).toBe("Les familles du 7, du 8 et du 9");
    expect(titreFamilles({ nombres: [7], titre: "La famille du" })).toBe("La famille du 7");
    expect(titreFamilles({ nombres: [7, 8, 9], titre: "La maison du" })).toBe("La maison du 7, 8 et 9");
    expect(htmlFamilles({ nombres: [6], titre: "La maison <du>" })).toContain("La maison &lt;du&gt; 6");
  });
});
