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

  it("font la table d'un nombre et la table de Pythagore, chaque partie à sa couleur (« un générateur des tables d'addition »)", () => {
    const tables = texte(htmlFamilles({ forme: "table", nombres: [1, 7] }));
    expect(tables).toContain("La table du 1");
    expect(tables).toContain("7 + 1 = 8");
    expect(tables).toContain("7 + 10 = 17");
    expect(tables).not.toContain("7 + 0");
    expect(texte(htmlFamilles({ forme: "table", nombres: [7], avecZero: true }))).toContain("7 + 0 = 7");
    expect(htmlFamilles({ forme: "table", nombres: [7] })).toContain('<span class="fa-a">7</span> + <span class="fa-b">3</span> = 10');
    expect(titreFamilles({ forme: "table", nombres: [7, 8], titre: "La famille du" })).toBe("Les tables du 7 et du 8");
    // La table de Pythagore : une seule page, 10 sur 10 (11 sur 11 avec le 0), les doubles en couleur.
    const pyth = htmlFamilles({ forme: "pythagore" });
    expect(pyth.match(/class="page fa-page"/g)).toHaveLength(1);
    expect(pyth.match(/fa-pyth-case/g)).toHaveLength(100);
    expect(pyth.match(/fa-pyth-double/g)).toHaveLength(10);
    expect(htmlFamilles({ forme: "pythagore", avecZero: true }).match(/fa-pyth-case/g)).toHaveLength(121);
    expect(titreFamilles({ forme: "pythagore", nombres: [7], titre: "La famille du" })).toBe("La table d'addition");
    // La maison commence à 2 : 1 n'a pas de famille.
    expect(reglagesFamillesSurs({ forme: "maison", nombres: [1, 7] }).nombres).toEqual([7]);
    expect(reglagesFamillesSurs({ forme: "table", nombres: [1, 7] }).nombres).toEqual([1, 7]);
  });

  it("se font pour l'élève : quatre par planche, à découper et à coller dans le cahier (« rajoute outil pour l'élève »)", () => {
    const html = htmlFamilles({ forme: "table", nombres: [7, 8], format: "eleve" });
    expect(html.match(/class="page fa-planche"/g)).toHaveLength(2);
    expect(html.match(/class="fa-petit"/g)).toHaveLength(8);
    expect(html).not.toContain('class="page fa-page"');
    expect(reglagesFamillesSurs({ format: "eleve" }).format).toBe("eleve");
    expect(reglagesFamillesSurs({ format: "rien" as never }).format).toBe("mur");
  });
});

