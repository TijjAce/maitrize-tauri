import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import {
  NIVEAUX, REGLAGES_COMPARER, barresEtCubes, convient, ecrireForme, exempleDuSavoir, faceDeCarte, htmlComparer, niveauParId, paquet,
  phraseDuSavoir, reglagesComparerSurs, ressemblant, type FormeNombre, type IdNiveau, type ReglagesComparer,
} from "./comparerNombres";

const r = (p: Partial<ReglagesComparer> & { jusqua?: number } = {}) => reglagesComparerSurs({ ...REGLAGES_COMPARER, ...p });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const niv = (id: IdNiveau) => niveauParId(id);
// Les milliers se séparent d'une espace fine insécable ; les attentes s'écrivent avec une espace simple.
const sp = (t: string) => t.replace(/\u202f/g, " ");
const CP = niv("cp-100"), CE1 = niv("ce1"), CE2 = niv("ce2"), CM1 = niv("cm1-grands"), CM2 = niv("cm2-grands");
const DEC1 = niv("cm1-decimaux"), DEC2 = niv("cm2-decimaux");

describe("comparer les nombres, de la maternelle au CM2", () => {
  it("suit la progression des programmes, cycle par cycle", () => {
    expect(NIVEAUX.map((n) => n.id)).toEqual([
      "c1-avant4", "c1-4ans", "c1-5ans", "cp-30", "cp-59", "cp-100", "ce1", "ce2", "cm1-entiers", "cm1-grands", "cm1-decimaux", "cm2-grands", "cm2-decimaux",
    ]);
    // Avant 4 ans, des quantités qui diffèrent au moins du simple au double ; puis six, puis dix.
    expect(niv("c1-avant4").valeurs).toEqual([1, 2, 4, 8]);
    expect([niv("c1-4ans").max, niv("c1-5ans").max]).toEqual([6, 10]);
    // 59 en période 2, 100 en période 3 au CP ; mille au CE1, dix mille au CE2.
    expect(["cp-30", "cp-59", "cp-100", "ce1", "ce2"].map((id) => niv(id as IdNiveau).max)).toEqual([30, 59, 100, 1000, 10000]);
    // Quatre chiffres en périodes 1 et 2 du CM1, six ensuite, neuf au CM2 ; centièmes, puis millièmes.
    expect([niv("cm1-entiers").max, CM1.max, CM2.max]).toEqual([9999, 999999, 999999999]);
    expect([DEC1.decimales, DEC2.decimales]).toEqual([2, 3]);
    for (const n of NIVEAUX) expect(n.parDefaut.every((f) => n.formes.includes(f)), n.id).toBe(true);
  });

  it("écrit un nombre sous les formes du guide et du programme, à chaque niveau", () => {
    expect(["unites", "desordre", "plusDeDix", "somme", "lettres"].map((f) => ecrireForme(47, f as FormeNombre, CP)))
      .toEqual(["4d 7u", "7u 4d", "3d 17u", "40 + 7", "quarante-sept"]);
    expect(ecrireForme(60, "unites", CP)).toBe("6d");
    expect(ecrireForme(13, "plusDeDix", CP)).toBe("13u");
    // Au CE1, les centaines : 635, c'est aussi 5 centaines et 13 dizaines et 5 unités.
    expect(["unites", "desordre", "plusDeDix", "somme"].map((f) => ecrireForme(635, f as FormeNombre, CE1)))
      .toEqual(["6c 3d 5u", "5u 3d 6c", "5c 13d 5u", "600 + 30 + 5"]);
    expect(ecrireForme(1000, "unites", CE1)).toBe("10c");
    expect(ecrireForme(4635, "plusDeDix", CE2)).toBe("3m 16c 3d 5u");
    expect(sp(ecrireForme(4635, "somme", CE2))).toBe("4 000 + 600 + 30 + 5");
    expect(sp(ecrireForme(456789, "chiffres", CM1))).toBe("456 789");
    expect(ecrireForme(456789, "classes", CM1)).toBe("456 mille 789");
    expect(ecrireForme(12000345, "classes", CM2)).toBe("12 millions 345");
    // Les grands nombres se décomposent par classes.
    expect(sp(ecrireForme(8701978, "somme", CM2))).toBe("8 000 000 + 701 000 + 978");
    expect(sp(ecrireForme(456789, "somme", CM1))).toBe("456 000 + 789");
    expect(convient(456000, "somme", CM1)).toBe(false);
    // Un nombre de neuf chiffres s'écrit plus petit qu'un nombre de deux, pour tenir dans sa carte.
    expect(faceDeCarte({ n: 590515724, forme: "chiffres" }, CM2)).toContain('class="cn-chiffres cn-t3"');
    // Les décimaux, en centièmes : 345 vaut 3,45 ; un zéro au bout ne s'écrit pas.
    expect(["virgule", "fraction", "fractions", "unitesDec", "lettres"].map((f) => ecrireForme(345, f as FormeNombre, DEC1)))
      .toEqual(["3,45", "345/100", "3 + 4/10 + 5/100", "3 unités 4 dixièmes 5 centièmes", "trois unités et quarante-cinq centièmes"]);
    expect(ecrireForme(350, "virgule", DEC1)).toBe("3,5");
    expect(ecrireForme(350, "fraction", DEC1)).toBe("35/10");
    expect(ecrireForme(7, "virgule", DEC1)).toBe("0,07");
    expect(sp(ecrireForme(3456, "fractions", DEC2))).toBe("3 + 4/10 + 5/100 + 6/1 000");
    // Toutes les formes ne vont pas à tous les nombres.
    expect(convient(40, "desordre", CP)).toBe(false);
    expect(convient(7, "plusDeDix", CP)).toBe(false);
    expect(convient(600, "somme", CE1)).toBe(false);
    expect(convient(300, "fraction", DEC1)).toBe(false);
    expect(convient(999, "classes", CM1)).toBe(false);
  });

  it("dessine les cartes : points, doigts, barres et cubes, plaques, fractions", () => {
    expect(compter(barresEtCubes(3, 17), /<rect /g)).toBe(3 + 17);
    expect(faceDeCarte({ n: 47, forme: "vrac" }, CP)).toContain("3 barres de dix et 17 cubes");
    expect(faceDeCarte({ n: 47, forme: "chiffres" }, CP)).toBe('<div class="cn-chiffres">47</div>');
    // Au CE1, des plaques de cent : 635 pas tout groupé, c'est 5 centaines, 13 dizaines, 5 unités.
    expect(faceDeCarte({ n: 635, forme: "vrac" }, CE1)).toContain('aria-label="5 centaines, 13 dizaines, 5 unités"');
    const maternelle = niv("c1-5ans");
    expect(compter(faceDeCarte({ n: 6, forme: "enVrac" }, maternelle), /<circle /g)).toBe(6);
    expect(faceDeCarte({ n: 6, forme: "constellation" }, maternelle)).toContain("cl-points");
    expect(faceDeCarte({ n: 7, forme: "doigts" }, maternelle)).toContain("cl-doigts cl-deux");
    expect(faceDeCarte({ n: 345, forme: "fraction" }, DEC1)).toContain('<span class="cn-frac"><span>345</span><span>100</span></span>');
  });

  it("trouve des nombres qui se ressemblent sans être égaux, comme ceux où l'on se trompe", () => {
    const alea = hasard(3);
    for (let essai = 0; essai < 200; essai++) {
      const n = 1 + Math.floor(alea() * 100);
      const v = ressemblant(n, CP, alea);
      if (v == null) continue;
      expect(v).not.toBe(n);
      const [d, u, dv, uv] = [Math.floor(n / 10), n % 10, Math.floor(v / 10), v % 10];
      expect((dv === u && uv === d) || (dv === d + 1 && uv <= 2 && u >= 7) || dv === d || (u === 0 && v === d), `${n} et ${v}`).toBe(true);
    }
    for (const niveau of [CE1, CE2, CM1, CM2, DEC1, DEC2]) {
      for (let essai = 0; essai < 100; essai++) {
        const n = niveau.min + Math.floor(alea() * (niveau.max - niveau.min));
        const v = ressemblant(n, niveau, alea);
        if (v == null) continue;
        expect(v !== n && v >= niveau.min && v <= niveau.max, `${niveau.id} : ${n} et ${v}`).toBe(true);
      }
    }
    // 3,5 : 3,4…, 3,05, 3,6 ou 3,4 — plus de chiffres n'est pas plus grand.
    const pieges = new Set(Array.from({ length: 60 }, () => ressemblant(350, DEC1, alea)));
    expect([...pieges].some((v) => v != null && v > 340 && v < 350)).toBe(true);
    expect(pieges.has(305)).toBe(true);
    // Avant 4 ans, une autre quantité, toujours au moins du simple au double.
    for (let i = 0; i < 20; i++) expect([2, 4, 8]).toContain(ressemblant(1, niv("c1-avant4"), alea));
  });

  it("fait un paquet où chaque nombre est deux fois, sous des formes qui lui vont, à chaque niveau", () => {
    for (const n of NIVEAUX) {
      for (const cartes of [24, 48]) {
        const reglages = r({ niveau: n.id, cartes, formes: n.formes });
        const p = paquet(reglages, 7);
        expect(p, n.id).toHaveLength(cartes);
        const parNombre = new Map<number, number>();
        for (const c of p) {
          expect(c.n >= n.min && c.n <= n.max && (!n.valeurs || n.valeurs.includes(c.n)), `${n.id} ${c.n}`).toBe(true);
          expect(convient(c.n, c.forme, n), `${n.id} ${c.n} ${c.forme}`).toBe(true);
          parNombre.set(c.n, (parNombre.get(c.n) ?? 0) + 1);
        }
        // Chaque nombre a sa paire ; en maternelle, chaque quantité revient plusieurs fois.
        expect([...parNombre.values()].every((k) => k % 2 === 0), n.id).toBe(true);
      }
    }
    expect(paquet(r(), 11)).toEqual(paquet(r(), 11));
    expect(paquet(r(), 11)).not.toEqual(paquet(r(), 12));
  });

  it("dit ce qu'on retient avec les nombres du niveau", () => {
    expect(exempleDuSavoir(CP)).toEqual([71, 68]);
    expect(exempleDuSavoir(niv("cp-59"))).toEqual([51, 48]);
    expect(exempleDuSavoir(niv("cp-30"))).toEqual([21, 18]);
    expect(phraseDuSavoir(CP)).toBe("71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68 il y a seulement 6 dizaines.");
    expect(phraseDuSavoir(niv("cp-30"))).toContain("1 dizaine.");
    expect(phraseDuSavoir(CE1)).toBe("412 est plus grand que 398, car dans 412 il y a 4 centaines alors que dans 398 il y a seulement 3 centaines.");
    expect(sp(phraseDuSavoir(CE2))).toBe("4 012 est plus grand que 3 998, car dans 4 012 il y a 4 milliers alors que dans 3 998 il y a seulement 3 milliers.");
    expect(sp(phraseDuSavoir(CM1))).toMatch(/^100 000 est plus grand que 99 999 : il a plus de chiffres\./);
    expect(phraseDuSavoir(DEC1)).toMatch(/^3,5 est plus grand que 3,45 : .*Le nombre de chiffres après la virgule ne dit pas lequel est le plus grand\.$/);
    expect(phraseDuSavoir(niv("c1-4ans"))).toBe("Je compte : six points, quatre points. Six, c'est plus que quatre : il y a plus de points sur la première carte.");
  });

  it("imprime la règle, les cartes, les signes et la feuille de jeu — sans signes en maternelle", () => {
    const html = htmlComparer(paquet(r({ niveau: "cp-100" }), 5), r({ niveau: "cp-100" }));
    expect(html).toContain("<b>La bataille des nombres</b>");
    expect(html).toContain("<b>La file des nombres</b>");
    expect(html).toContain("<b>Le nombre caché</b>");
    expect(html).toContain("« Comment le sais-tu ? »");
    expect(compter(html, /class="cn-signe"/g)).toBe(12);
    expect(html).toContain("Ma feuille de jeu");
    expect(compter(html, /<div class="carte">/g)).toBe(32 + 12);
    // Au CE1, les exemples sont du CE1 ; pour vérifier, des plaques, des barres et des cubes.
    const ce1 = htmlComparer(paquet(r({ niveau: "ce1" }), 5), r({ niveau: "ce1" }));
    expect(ce1).toContain("« 325 est plus petit que 352 »");
    expect(ce1).toContain("229 &lt; 234 &lt; 243");
    expect(ce1).toContain("centaine contre centaine");
    // Les décimaux : on compare virgule sous virgule.
    expect(htmlComparer(paquet(r({ niveau: "cm1-decimaux" }), 5), r({ niveau: "cm1-decimaux" }))).toContain("« 3,45 est plus petit que 3,5 »");
    // En maternelle : la bataille des points, ni signes ni feuille de jeu, même cochés.
    const ms = htmlComparer(paquet(r({ niveau: "c1-4ans", formes: ["constellation", "doigts"] }), 5), r({ niveau: "c1-4ans", signes: true, feuilleDeJeu: true }));
    expect(ms).toContain("<b>La bataille des points</b>");
    expect(ms).toContain("<b>La file des points</b>");
    expect(ms).not.toContain("cn-signe\"");
    expect(ms).not.toContain("Ma feuille de jeu");
    expect(ms).not.toContain("&gt;");
    // Elle cite le programme de maternelle — en référence, qui ne s'imprime pas.
    expect(ms).toContain('<span class="reference">Programme de l&#39;école maternelle (2025)');
    // Avant 4 ans, la bataille seule, d'un coup d'œil.
    expect(htmlComparer(paquet(r({ niveau: "c1-avant4" }), 5), r({ niveau: "c1-avant4" }))).not.toContain("La file des points");
    expect(htmlComparer(paquet(r(), 5), r({ grandes: true }))).toContain('class="feuille cn cn-grandes"');
  });

  it("répare des réglages abîmés, et reprend l'ancien champ du CP", () => {
    expect(r({ niveau: undefined, jusqua: 59 }).niveau).toBe("cp-59");
    const s = reglagesComparerSurs({ niveau: "cm9" as never, formes: ["lettres", "inconnue" as never], cartes: 7, pieges: "oui" as never, titre: 3 as never });
    expect(s.niveau).toBe("cp-30");
    expect(s.formes).toEqual(["lettres"]);
    expect(s.cartes).toBe(32);
    expect(s.pieges).toBe(true);
    expect(s.titre).toBe("Comparer les nombres");
    // Une forme que le niveau ne connaît pas s'en va ; sans forme, celles qu'il propose.
    expect(reglagesComparerSurs({ niveau: "cm1-decimaux", formes: ["cubes"] }).formes).toEqual(["virgule", "fraction", "fractions"]);
  });
});
