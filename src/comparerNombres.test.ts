import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import {
  FORMES, REGLAGES_COMPARER, barresEtCubes, convient, ecrireForme, exempleDuSavoir, faceDeCarte, htmlComparer, paquet, reglagesComparerSurs,
  ressemblant, type FormeNombre, type ReglagesComparer,
} from "./comparerNombres";

const r = (p: Partial<ReglagesComparer> = {}) => reglagesComparerSurs({ ...REGLAGES_COMPARER, ...p });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const TOUTES = FORMES.map((f) => f.id);

describe("comparer les nombres", () => {
  it("écrit un nombre sous les formes du guide", () => {
    expect(ecrireForme(47, "unites")).toBe("4d 7u");
    expect(ecrireForme(60, "unites")).toBe("6d");
    expect(ecrireForme(7, "unites")).toBe("7u");
    expect(ecrireForme(34, "desordre")).toBe("4u 3d");
    expect(ecrireForme(67, "plusDeDix")).toBe("5d 17u");
    expect(ecrireForme(13, "plusDeDix")).toBe("13u");
    expect(ecrireForme(47, "somme")).toBe("40 + 7");
    expect(ecrireForme(47, "lettres")).toBe("quarante-sept");
    // « 7u 4d » demande des dizaines et des unités ; « 3d 17u », une dizaine à défaire.
    expect(convient(40, "desordre")).toBe(false);
    expect(convient(7, "plusDeDix")).toBe(false);
    expect(convient(7, "vrac")).toBe(false);
    expect(convient(7, "cubes")).toBe(true);
  });

  it("dessine les barres et les cubes, par rangées de cinq", () => {
    const svg = barresEtCubes(3, 17);
    // Une barre : son cadre et neuf traits ; un cube : un carré.
    expect(compter(svg, /<rect /g)).toBe(3 + 17);
    expect(svg).toContain('aria-label="3 barres de dix et 17 cubes"');
    expect(barresEtCubes(1, 1)).toContain('aria-label="1 barre de dix et 1 cube"');
    expect(faceDeCarte({ n: 47, forme: "vrac" })).toContain("3 barres de dix et 17 cubes");
    expect(faceDeCarte({ n: 47, forme: "cubes" })).toContain("4 barres de dix et 7 cubes");
    expect(faceDeCarte({ n: 47, forme: "chiffres" })).toBe('<div class="cn-chiffres">47</div>');
  });

  it("trouve des nombres qui se ressemblent sans être égaux", () => {
    const alea = hasard(3);
    for (let essai = 0; essai < 200; essai++) {
      const n = 1 + Math.floor(alea() * 100);
      const v = ressemblant(n, 100, alea);
      if (v == null) continue;
      expect(v).not.toBe(n);
      expect(v >= 1 && v <= 100).toBe(true);
      const [d, u, dv, uv] = [Math.floor(n / 10), n % 10, Math.floor(v / 10), v % 10];
      const inverse = dv === u && uv === d;
      const dizaineVoisine = dv === d + 1 && uv <= 2 && u >= 7;
      const memeDizaine = dv === d;
      const dizaineEtChiffre = u === 0 && v === d;
      expect(inverse || dizaineVoisine || memeDizaine || dizaineEtChiffre, `${n} et ${v}`).toBe(true);
    }
    // 47 et 74, oui ; 31 inversé dépasse 30.
    expect(ressemblant(13, 30, () => 0)).not.toBe(31);
  });

  it("fait un paquet où chaque nombre est deux fois, sous des formes qui lui vont", () => {
    for (const jusqua of [30, 59, 100] as const) {
      for (const cartes of [24, 48]) {
        const reglages = r({ jusqua, cartes, formes: TOUTES });
        const p = paquet(reglages, 7);
        expect(p).toHaveLength(cartes);
        const parNombre = new Map<number, FormeNombre[]>();
        for (const c of p) {
          expect(c.n >= 1 && c.n <= jusqua, `${c.n}`).toBe(true);
          expect(convient(c.n, c.forme), `${c.n} ${c.forme}`).toBe(true);
          parNombre.set(c.n, [...(parNombre.get(c.n) ?? []), c.forme]);
        }
        expect([...parNombre.values()].every((formes) => formes.length === 2)).toBe(true);
        // Deux formes différentes dès qu'il y en a deux qui conviennent.
        expect([...parNombre.values()].filter(([a, b]) => a !== b).length).toBeGreaterThan(cartes / 2 - 3);
      }
    }
    // Le même tirage se réimprime à l'identique ; un autre tirage change le paquet.
    expect(paquet(r(), 11)).toEqual(paquet(r(), 11));
    expect(paquet(r(), 11)).not.toEqual(paquet(r(), 12));
  });

  it("imprime la règle, le savoir à retenir, les cartes, les signes et la feuille de jeu", () => {
    expect(exempleDuSavoir(100)).toEqual([71, 68]);
    expect(exempleDuSavoir(59)).toEqual([51, 48]);
    expect(exempleDuSavoir(30)).toEqual([21, 18]);
    const reglages = r({ jusqua: 100 });
    const html = htmlComparer(paquet(reglages, 5), reglages);
    expect(html).toContain("71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68 il y a seulement 6 dizaines.");
    expect(html).toContain("<b>La bataille des nombres</b>");
    expect(html).toContain("<b>La file des nombres</b>");
    expect(html).toContain("<b>Le nombre caché</b>");
    expect(html).toContain("« Comment le sais-tu ? »");
    expect(compter(html, /class="cn-signe"/g)).toBe(12);
    expect(html).toContain("est plus petit que</div>");
    expect(html).toContain("Ma feuille de jeu");
    // 32 cartes de nombres et 12 signes, en cartes à découper.
    expect(compter(html, /<div class="carte">/g)).toBe(32 + 12);
    // Au champ de la période 1, les exemples restent sous 30.
    const p1 = htmlComparer(paquet(r({ jusqua: 30 }), 5), r({ jusqua: 30 }));
    expect(p1).toContain("21 est plus grand que 18, car dans 21 il y a 2 dizaines alors que dans 18 il y a seulement 1 dizaine.");
    expect(p1).toContain("« 17 est plus petit que 21 »");
    // Sans la règle, les signes ni la feuille de jeu : les cartes seules.
    const seules = htmlComparer(paquet(r(), 5), r({ regle: false, signes: false, feuilleDeJeu: false }));
    expect(seules).not.toContain("cn-savoir");
    expect(seules).not.toContain("cn-signe\"");
    expect(seules).not.toContain("Ma feuille de jeu");
    expect(htmlComparer(paquet(r(), 5), r({ grandes: true }))).toContain('class="feuille cn cn-grandes"');
  });

  it("répare des réglages abîmés", () => {
    const s = reglagesComparerSurs({ jusqua: 42 as never, formes: ["lettres", "inconnue" as never], cartes: 7, pieges: "oui" as never, titre: 3 as never });
    expect(s.jusqua).toBe(30);
    expect(s.formes).toEqual(["lettres"]);
    expect(s.cartes).toBe(32);
    expect(s.pieges).toBe(true);
    expect(s.titre).toBe("Comparer les nombres");
    expect(reglagesComparerSurs({ formes: [] }).formes).toEqual(["chiffres"]);
  });
});
