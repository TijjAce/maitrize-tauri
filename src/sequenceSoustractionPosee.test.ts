import { describe, expect, it } from "vitest";
import { REGLAGES_POSEES, cassagesDe, operationsPosees, type ReglagesPosees } from "./operationsPosees";
import {
  CALCUL_MENTAL_DES_SEANCES, DEMARCHE_SOUSTRACTION_POSEE, FEUILLES_SOUSTRACTION_POSEE, MATERIEL_SOUSTRACTION_POSEE, graineDeLaFeuille, htmlRetraits, retraits,
} from "./sequenceSoustractionPosee";
import { FAMILLES, ONGLETS } from "./catalogueAteliers";
import { couleursDe } from "./cubesNumeration";
import { REGLAGES_CUBES } from "./cubesNumeration";

const seances = DEMARCHE_SOUSTRACTION_POSEE.seances;

describe("la soustraction posée au CE1, séquence toute faite (demande de l'enseignant, octobre 2026)", () => {
  it("ouvre chaque séance sur le calcul mental La Martinière, avec sa feuille", () => {
    expect(seances).toHaveLength(10);
    for (const s of seances) expect(s.phases[0].phase, s.titre).toBe("Calcul mental — procédé La Martinière");
    const martinieres = FEUILLES_SOUSTRACTION_POSEE.filter((f) => f.atelier === "martiniere").map((f) => f.seance);
    expect(martinieres).toEqual(seances.map((_, i) => i));
    expect(CALCUL_MENTAL_DES_SEANCES).toHaveLength(seances.length);
    expect(MATERIEL_SOUSTRACTION_POSEE).toHaveLength(seances.length);
  });

  it("fait manipuler avant de poser : retirer, puis échanger, avec le matériel, avant la première soustraction posée", () => {
    expect(seances[0].titre).toMatch(/Retirer/);
    expect(seances[1].titre).toMatch(/Échanger/);
    for (const s of seances.slice(0, 4)) expect(s.phases.map((p) => p.description).join(" "), s.titre).toMatch(/matériel/);
    const premierePosee = Math.min(...FEUILLES_SOUSTRACTION_POSEE.filter((f) => f.atelier === "posees").map((f) => f.seance));
    expect(premierePosee).toBe(2);
    // Chaque cassage se fait sur le dessin du matériel avant de se poser.
    expect(FEUILLES_SOUSTRACTION_POSEE.filter((f) => /Je casse/.test(f.titre)).map((f) => f.seance)).toEqual([3, 6]);
  });

  it("casse une dizaine, puis une centaine, séparément, avant de mêler les deux", () => {
    expect([...cassagesDe(52, 27)]).toEqual([1]);
    expect([...cassagesDe(145, 92)]).toEqual([2]);
    expect([...cassagesDe(331, 214)]).toEqual([1]);
    expect([...cassagesDe(302, 128)].sort()).toEqual([1, 2]);
    expect([...cassagesDe(59, 48)]).toEqual([]);
    const reglagesDe = (seance: number): ReglagesPosees => {
      const f = FEUILLES_SOUSTRACTION_POSEE.find((x) => x.seance === seance && x.atelier === "posees")!;
      return (f.fabriquer(1).refaire as { operationsPosees: ReglagesPosees }).operationsPosees;
    };
    const attendus: [number, number[]][] = [[5, [1]], [6, [2]], [7, [1, 2]]];
    for (const [seance, casses] of attendus) {
      const r = reglagesDe(seance);
      for (let g = 1; g <= 5; g++) {
        const ops = operationsPosees({ ...REGLAGES_POSEES, ...r }, g);
        expect(ops).toHaveLength(r.combien);
        for (const o of ops) expect([...cassagesDe(o.termes[0], o.termes[1])].sort(), `${o.termes.join(" − ")}`).toEqual(casses);
      }
    }
  });

  it("fait retirer sur le dessin du matériel — sans casser, en cassant une dizaine, ou une centaine — et donne le corrigé à part", () => {
    for (let g = 1; g <= 10; g++) {
      for (const x of retraits("retirer", 6, g)) expect(cassagesDe(x.a, x.b).size).toBe(0);
      for (const x of retraits("dizaine", 4, g)) expect([...cassagesDe(x.a, x.b)]).toEqual([1]);
      for (const x of retraits("centaine", 4, g)) expect([...cassagesDe(x.a, x.b)]).toEqual([2]);
    }
    const html = htmlRetraits("dizaine", [{ a: 52, b: 27 }], couleursDe({ ...REGLAGES_CUBES, memeCouleur: false }));
    expect(html).toContain("On a 52. On retire 27 : 2 barres et 7 cubes.");
    expect(html).toContain("52 – 27 = ……………");
    expect(html).toContain('class="page corrige"');
    expect(html).toContain("52 – 27 = <b>25</b>");
    expect((html.match(/<svg/g) ?? []).length).toBe(2);
  });

  it("fabrique chacune de ses feuilles, et l'aperçu tire comme la création", () => {
    for (const [i, f] of FEUILLES_SOUSTRACTION_POSEE.entries()) {
      const { html, style } = f.fabriquer(graineDeLaFeuille(42, i));
      expect(html.length, f.titre).toBeGreaterThan(200);
      expect(style.length, f.titre).toBeGreaterThan(50);
      expect(f.seance, f.titre).toBeLessThan(seances.length);
    }
    expect(graineDeLaFeuille(42, 3)).toBe(graineDeLaFeuille(42, 3));
    expect(graineDeLaFeuille(42, 3)).not.toBe(graineDeLaFeuille(42, 4));
  });

  it("se présente dans Fabriquer comme une séquence toute faite", () => {
    const outil = FAMILLES.flatMap((f) => f.outils).find((o) => o.id === "soustractionPosee");
    expect(outil?.sequence).toBe(true);
    expect((ONGLETS as readonly string[]).includes("soustractionPosee")).toBe(true);
  });
});
