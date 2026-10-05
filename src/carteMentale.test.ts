import { describe, it, expect } from "vitest";
import {
  BRANCHES_MAX, HAUTEUR, IDEES_MAX, LARGEUR, REGLAGES_CARTE, blocsDesBranches, branchesPleines, cequiManque, htmlCarteMentale, idsDesImages,
  reglagesSurs, tailleDesIdees, trait, type ReglagesCarte,
} from "./carteMentale";

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const branche = (titre: string, idees: string[], id: number | null = null) =>
  ({ titre, image: { id, mot: titre }, couleur: "#1971c2", idees: idees.map((mot, i) => ({ id: 100 + i, mot })) });
const SENS: ReglagesCarte = reglagesSurs({
  centre: "Les cinq sens", image: { id: 7, mot: "sens" },
  branches: [branche("La vue", ["les yeux", "regarder"], 1), branche("L'ouïe", ["les oreilles", "écouter"]), branche("L'odorat", ["le nez", "sentir"]),
    branche("Le goût", ["la bouche", "goûter"]), branche("Le toucher", ["les mains", "toucher"])],
});

describe("la carte mentale", () => {
  it("se répare : deux branches au moins, des couleurs valides, douze idées au plus", () => {
    const r = reglagesSurs({ branches: [{ titre: "A", image: { id: null, mot: "" }, couleur: "rouge", idees: Array.from({ length: 20 }, (_, i) => ({ id: i, mot: `m${i}` })) }] });
    expect(r.branches).toHaveLength(2);
    expect(r.branches[0].couleur).toMatch(/^#[0-9a-f]{6}$/i);
    expect(r.branches[0].idees).toHaveLength(IDEES_MAX);
    expect(reglagesSurs({}).branches).toHaveLength(REGLAGES_CARTE.branches.length);
  });

  it("dit ce qui manque : le thème, deux branches", () => {
    expect(cequiManque(reglagesSurs({}))).toMatch(/thème/);
    expect(cequiManque(reglagesSurs({ centre: "Les saisons" }))).toMatch(/deux branches/);
    expect(cequiManque(SENS)).toBeNull();
    expect(branchesPleines(SENS)).toHaveLength(5);
  });

  it("place les branches en deux colonnes, dans la page, sans qu'elles se touchent ni touchent le centre", () => {
    for (let n = 2; n <= BRANCHES_MAX; n++) {
      const blocs = blocsDesBranches(n);
      expect(blocs).toHaveLength(n);
      expect(blocs.filter((b) => b.cote === "droite")).toHaveLength(Math.ceil(n / 2));
      for (const b of blocs) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.largeur).toBeLessThanOrEqual(LARGEUR);
        expect(b.y + b.hauteur).toBeLessThanOrEqual(HAUTEUR + 0.01);
        // Le centre occupe le milieu : 70 mm de large.
        expect(b.cote === "droite" ? b.x >= LARGEUR / 2 + 35 : b.x + b.largeur <= LARGEUR / 2 - 35).toBe(true);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const [a, c] = [blocs[i], blocs[j]];
        const separes = a.x + a.largeur <= c.x || c.x + c.largeur <= a.x || a.y + a.hauteur <= c.y || c.y + c.hauteur <= a.y;
        expect(separes, `${n} branches : ${i} et ${j}`).toBe(true);
      }
    }
  });

  it("relie chaque branche au centre par un trait courbe, du bord du centre au milieu de la branche", () => {
    const [b] = blocsDesBranches(4);
    const d = trait(b, 0, 2);
    const [x0] = d.slice(1).split(" C")[0].split(" ").map(Number);
    const fin = d.split(" ").slice(-2).map(Number);
    expect(Math.abs(x0 - LARGEUR / 2)).toBeLessThan(35);
    expect(fin).toEqual([b.x, Number((b.y + b.hauteur / 2).toFixed(1))]);
    expect(d).toMatch(/^M[\d.]+ [\d.]+ C/);
  });

  it("écrit les idées plus petites quand elles sont nombreuses", () => {
    expect(tailleDesIdees(2, 60)).toBe("grande");
    expect(tailleDesIdees(6, 60)).toBe("moyenne");
    expect(tailleDesIdees(12, 60)).toBe("petite");
  });

  it("s'imprime : le centre, une branche et un trait par branche, les idées avec leurs pictos — ou sans", () => {
    const images: Record<number, string> = { 1: "data:vue", 7: "data:sens", 100: "data:yeux", 101: "data:regarder" };
    const html = htmlCarteMentale(SENS, images);
    expect(compter(html, /class="cm-branche"/g)).toBe(5);
    expect(compter(html, /<path /g)).toBe(5);
    expect(compter(html, /class="cm-idee"/g)).toBe(10);
    expect(html).toContain('src="data:yeux"');
    expect(html).toContain("Les cinq sens");
    expect(html).toContain("ARASAAC");
    const sansPictos = htmlCarteMentale({ ...SENS, pictos: false, image: { id: null, mot: "" }, branches: SENS.branches.map((b) => ({ ...b, image: { id: null, mot: "" } })) }, images);
    expect(sansPictos).not.toContain("<img");
    expect(sansPictos).not.toContain("ARASAAC");
    expect(htmlCarteMentale({ ...SENS, capitales: true }, images)).toContain("cm-capitales");
    expect(idsDesImages(SENS)).toEqual(expect.arrayContaining([7, 1, 100, 101]));
    expect(idsDesImages({ ...SENS, pictos: false })).not.toContain(100);
  });
});
