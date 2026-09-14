import { describe, it, expect } from "vitest";
import {
  genererPartieTout, genererMultiplicatifs, problemePartieTout, problemeMultiplicatif, schemaSvg, largeurs,
  feuilleProblemes, blocProbleme, de, nombre, lirePrenoms,
  type ReglagesPartieTout, type ReglagesMultiplicatifs, type Probleme, type OptionsFeuille, type Schema,
} from "./problemesBarres";

const partieTout = (p: Partial<ReglagesPartieTout> = {}): ReglagesPartieTout => ({
  nombre: 8, parties: 2, inconnue: "melange", max: 20, enonces: true, prenoms: [], ...p,
});
const multiplicatifs = (p: Partial<ReglagesMultiplicatifs> = {}): ReglagesMultiplicatifs => ({
  nombre: 10, types: ["tout", "part", "nombre", "grand", "petit"], table: 10, enonces: true, prenoms: [], ...p,
});
const feuilleParDefaut: OptionsFeuille = { titre: "Problèmes", schema: "nombres", corrige: true, grandTexte: false, majuscules: false };

/** Les nombres écrits dans un texte (« 1 000 » compris). */
const nombresDe = (texte: string) =>
  (texte.match(/\d[\d  ]*/g) ?? []).map((n) => Number(n.replace(/[  ]/g, "")));

/** Les valeurs que l'énoncé doit donner, et elles seules. */
function connues(s: Schema): number[] {
  switch (s.forme) {
    case "parties": return [s.tout, ...s.parties].filter((c) => c.connue).map((c) => c.valeur);
    case "parts-egales": return [s.tout, s.part, s.nombre].filter((c) => c.connue).map((c) => c.valeur);
    case "comparaison": return [...[s.petit, s.grand].filter((c) => c.connue).map((c) => c.valeur), s.fois];
  }
}

describe("problèmes partie-tout", () => {
  it("redonne la même feuille avec la même graine", () => {
    expect(genererPartieTout(partieTout(), 42)).toEqual(genererPartieTout(partieTout(), 42));
    expect(genererPartieTout(partieTout(), 42)).not.toEqual(genererPartieTout(partieTout(), 43));
  });

  it("forme un tout égal à la somme de ses parties, dans les nombres demandés", () => {
    for (const max of [10, 20, 100, 1000]) {
      for (const parties of [2, 3]) {
        for (let g = 0; g < 40; g++) {
          const p = problemePartieTout(partieTout({ max, parties }), g, g);
          if (p.schema.forme !== "parties") throw new Error("forme inattendue");
          const somme = p.schema.parties.reduce((s, c) => s + c.valeur, 0);
          expect(somme).toBe(p.schema.tout.valeur);
          expect(p.schema.parties).toHaveLength(parties);
          expect(p.schema.tout.valeur).toBeLessThanOrEqual(max);
          // Jamais « 1 bille rouge » : les phrases sont écrites au pluriel.
          expect(Math.min(...p.schema.parties.map((c) => c.valeur))).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("cherche le tout ou une partie, en alternance si on mélange", () => {
    const feuille = genererPartieTout(partieTout({ nombre: 6 }), 7);
    feuille.forEach((p, i) => {
      if (p.schema.forme !== "parties") throw new Error("forme inattendue");
      const inconnues = [p.schema.tout, ...p.schema.parties].filter((c) => !c.connue);
      expect(inconnues).toHaveLength(1);
      expect(p.schema.tout.connue).toBe(i % 2 === 1);
      // La partie cherchée est la dernière, comme « les autres » dans l'énoncé.
      if (i % 2 === 1) expect(p.schema.parties[p.schema.parties.length - 1].connue).toBe(false);
    });
  });

  it("écrit le calcul et la réponse", () => {
    for (let g = 0; g < 30; g++) {
      const p = problemePartieTout(partieTout({ inconnue: "tout" }), g, 0);
      if (p.schema.forme !== "parties") throw new Error("forme inattendue");
      const [a, b] = p.schema.parties.map((c) => c.valeur);
      expect(p.calcul).toBe(`${nombre(a)} + ${nombre(b)} = ${nombre(a + b)}`);
      expect(p.reponse).toBe(a + b);
      const q = problemePartieTout(partieTout({ inconnue: "partie", parties: 3 }), g, 1);
      if (q.schema.forme !== "parties") throw new Error("forme inattendue");
      const [x, y, z] = q.schema.parties.map((c) => c.valeur);
      expect(q.calcul).toBe(`${nombre(x + y + z)} − ${nombre(x)} − ${nombre(y)} = ${nombre(z)}`);
      expect(q.reponse).toBe(z);
    }
  });

  it("donne dans l'énoncé les nombres connus, jamais la réponse", () => {
    for (let g = 0; g < 60; g++) {
      for (const parties of [2, 3]) {
        const p = problemePartieTout(partieTout({ parties, max: 1000 }), g, g);
        expect(nombresDe(p.enonce).sort((a, b) => a - b)).toEqual(connues(p.schema).sort((a, b) => a - b));
        expect(p.enonce.trim().endsWith("?")).toBe(true);
        expect(p.phrase).toContain(nombre(p.reponse));
      }
    }
  });

  it("écrit un français correct pour chaque situation", () => {
    const vus = new Set<string>();
    for (let g = 0; g < 400; g++) {
      const p = problemePartieTout(partieTout({ parties: 3 }), g, g);
      vus.add(p.enonce);
      expect(p.enonce).not.toMatch(/ de [aeiouyéè]/i);     // « de animaux » au lieu de « d'animaux »
      expect(p.enonce).not.toMatch(/\b(il|elle) a\b/);   // aucun pronom à accorder au prénom
      expect(p.enonce).not.toMatch(/garçons|adultes/);    // ces situations n'ont que deux parties
    }
    expect(vus.size).toBeGreaterThan(100);
    const exemple = [...vus].find((e) => e.startsWith("Dans le pré") && e.includes("en tout"));
    expect(exemple).toMatch(/^Dans le pré, il y a \d+ \p{L}+, \d+ \p{L}+ et \d+ \p{L}+\. Combien y a-t-il d'animaux en tout \?$/u);
  });

  it("prend les prénoms donnés par l'enseignant", () => {
    const prenoms = lirePrenoms("Zoé, Malo ; Zoé\n");
    expect(prenoms).toEqual(["Zoé", "Malo"]);
    const feuille = genererPartieTout(partieTout({ nombre: 12, prenoms }), 3);
    const cites = feuille.map((p) => p.enonce).join(" ");
    expect(cites).not.toMatch(/Léa|Tom|Inès|Noah/);
  });

  it("ne répète pas deux fois le même problème sur une feuille", () => {
    const feuille = genererPartieTout(partieTout({ nombre: 12, max: 10, inconnue: "tout" }), 11);
    const cles = feuille.map((p) => p.schema.forme === "parties" ? p.schema.parties.map((c) => c.valeur).sort().join("+") : "");
    expect(new Set(cles).size).toBe(12);
  });

  it("retire un seul problème sans toucher aux autres", () => {
    const avant = genererPartieTout(partieTout({ nombre: 4 }), 5);
    const apres = genererPartieTout(partieTout({ nombre: 4 }), 5, { 2: 999 });
    expect(apres[0]).toEqual(avant[0]);
    expect(apres[1]).toEqual(avant[1]);
    expect(apres[3]).toEqual(avant[3]);
    expect(apres[2]).not.toEqual(avant[2]);
  });

  it("sans énoncé, ne garde que le schéma et le calcul", () => {
    const p = problemePartieTout(partieTout({ enonces: false }), 1, 0);
    expect(p.enonce).toBe("");
    expect(p.phrase).toBe("");
    expect(p.calcul).toMatch(/=/);
  });
});

describe("problèmes multiplicatifs", () => {
  it("fait tourner les types choisis et respecte la table", () => {
    const feuille = genererMultiplicatifs(multiplicatifs({ table: 5 }), 9);
    const formes = feuille.map((p) => p.schema.forme);
    expect(formes.slice(0, 5)).toEqual(["parts-egales", "parts-egales", "parts-egales", "comparaison", "comparaison"]);
    for (const p of feuille) {
      if (p.schema.forme === "parts-egales") {
        expect(p.schema.tout.valeur).toBe(p.schema.part.valeur * p.schema.nombre.valeur);
        expect(p.schema.part.valeur).toBeLessThanOrEqual(5);
        expect(p.schema.nombre.valeur).toBeLessThanOrEqual(5);
      } else if (p.schema.forme === "comparaison") {
        expect(p.schema.grand.valeur).toBe(p.schema.petit.valeur * p.schema.fois);
        expect(p.schema.fois).toBeLessThanOrEqual(5);
        expect(p.schema.noms[0]).not.toBe(p.schema.noms[1]);
      }
    }
  });

  it("écrit le bon calcul pour chaque type", () => {
    const t = (type: ReglagesMultiplicatifs["types"][number], g: number) =>
      problemeMultiplicatif(multiplicatifs({ types: [type] }), g, 0);
    for (let g = 0; g < 40; g++) {
      const tout = t("tout", g), part = t("part", g), nb = t("nombre", g), grand = t("grand", g), petit = t("petit", g);
      if (tout.schema.forme !== "parts-egales" || part.schema.forme !== "parts-egales" || nb.schema.forme !== "parts-egales") throw new Error("forme");
      if (grand.schema.forme !== "comparaison" || petit.schema.forme !== "comparaison") throw new Error("forme");
      expect(tout.calcul).toBe(`${tout.schema.nombre.valeur} × ${tout.schema.part.valeur} = ${tout.reponse}`);
      expect(part.calcul).toBe(`${part.schema.tout.valeur} : ${part.schema.nombre.valeur} = ${part.reponse}`);
      expect(nb.calcul).toBe(`${nb.schema.tout.valeur} : ${nb.schema.part.valeur} = ${nb.reponse}`);
      expect(grand.reponse).toBe(grand.schema.grand.valeur);
      expect(petit.reponse).toBe(petit.schema.petit.valeur);
      expect(petit.calcul).toBe(`${petit.schema.grand.valeur} : ${petit.schema.fois} = ${petit.reponse}`);
    }
  });

  it("donne dans l'énoncé les nombres connus, jamais la réponse", () => {
    for (let g = 0; g < 80; g++) {
      const p = problemeMultiplicatif(multiplicatifs(), g, g);
      expect(nombresDe(p.enonce).sort((a, b) => a - b)).toEqual(connues(p.schema).sort((a, b) => a - b));
      expect(p.enonce).not.toMatch(/ de [aeiouyéèœ]/i);
      expect(p.enonce).not.toMatch(/\b(il|elle) (a|range|met|fait|pose|colle)\b/);
    }
  });

  it("garde des situations vraisemblables : pas cent élèves pour le sport", () => {
    for (let g = 0; g < 300; g++) {
      const p = problemeMultiplicatif(multiplicatifs({ types: ["tout"] }), g, 0);
      if (p.enonce.includes("équipes") && p.schema.forme === "parts-egales") expect(p.schema.tout.valeur).toBeLessThanOrEqual(30);
    }
  });
});

describe("schémas en barres", () => {
  const parties: Schema = {
    forme: "parties", tout: { valeur: 12, connue: true },
    parties: [{ valeur: 8, connue: true }, { valeur: 4, connue: false }],
  };
  const textes = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

  it("dessine le tout et ses parties comme en classe", () => {
    const svg = schemaSvg(parties, "nombres");
    expect(textes(svg)).toEqual(["TOUT", "12", "8", "PARTIE", "?", "PARTIE"]);
    // 8 et 4 : la première partie est deux fois plus longue que la seconde.
    const l = [...svg.matchAll(/<rect[^>]* width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(l[1] / l[2]).toBeCloseTo(2, 1);
  });

  it("laisse les cases vides à compléter, et remplit le corrigé", () => {
    expect(textes(schemaSvg(parties, "vide"))).toEqual(["TOUT", "PARTIE", "PARTIE"]);
    const corrige = schemaSvg(parties, "corrige");
    expect(textes(corrige)).toEqual(["TOUT", "12", "8", "PARTIE", "4", "PARTIE"]);
    expect(corrige).toContain('font-weight="700"');
  });

  it("garde lisible une toute petite partie", () => {
    const l = largeurs([2, 998], 500, 70);
    expect(l[0]).toBe(70);
    expect(l[0] + l[1]).toBeCloseTo(500);
    expect(largeurs([1, 1, 1], 150, 70)).toEqual([50, 50, 50]);
  });

  it("ne dessine pas toutes les parts quand leur nombre est la question", () => {
    const s: Schema = { forme: "parts-egales", tout: { valeur: 24, connue: true }, part: { valeur: 6, connue: true }, nombre: { valeur: 4, connue: false } };
    const svg = schemaSvg(s, "nombres");
    expect(svg).toContain("stroke-dasharray");
    expect(textes(svg)).toContain("? PARTS ÉGALES");
    expect(textes(svg).filter((t) => t === "6")).toHaveLength(2);
    expect(textes(schemaSvg(s, "corrige")).filter((t) => t === "6")).toHaveLength(4);
  });

  it("met un seul « ? » quand on cherche la valeur d'une part", () => {
    const s: Schema = { forme: "parts-egales", tout: { valeur: 24, connue: true }, part: { valeur: 6, connue: false }, nombre: { valeur: 4, connue: true } };
    expect(textes(schemaSvg(s, "nombres")).filter((t) => t === "?")).toHaveLength(1);
  });

  it("aligne les deux quantités d'une comparaison", () => {
    const s: Schema = { forme: "comparaison", petit: { valeur: 4, connue: true }, grand: { valeur: 12, connue: false }, fois: 3, noms: ["Tom", "<Léa>"] };
    const svg = schemaSvg(s, "nombres");
    expect(textes(svg)).toEqual(["Tom", "4", "&lt;Léa&gt;", "?", "× 3"]);
  });
});

describe("feuille à imprimer", () => {
  const probleme = (p: Partial<Probleme> = {}): Probleme => ({
    schema: { forme: "parties", tout: { valeur: 12, connue: false }, parties: [{ valeur: 8, connue: true }, { valeur: 4, connue: true }] },
    enonce: "<Léa> a 8 billes rouges et 4 billes bleues. Combien de billes a <Léa> en tout ?",
    calcul: "8 + 4 = 12", reponse: 12, phrase: "<Léa> a 12 billes en tout.", ...p,
  });

  it("échappe ce que l'enseignant a saisi", () => {
    const html = feuilleProblemes([probleme()], { ...feuilleParDefaut, titre: "<b>Titre</b>" });
    expect(html).not.toContain("<Léa>");
    expect(html).not.toContain("<b>Titre</b>");
    expect(html).toContain("&lt;Léa&gt; a 8 billes");
  });

  it("ajoute le corrigé sur une nouvelle page, seulement si on le demande", () => {
    expect(feuilleProblemes([probleme()], feuilleParDefaut)).toContain("pb-corrige");
    expect(feuilleProblemes([probleme()], { ...feuilleParDefaut, corrige: false })).not.toContain("pb-corrige");
    expect(feuilleProblemes([probleme()], feuilleParDefaut)).toContain("8 + 4 = 12");
  });

  it("propose un cadre pour dessiner quand le schéma n'est pas fourni", () => {
    const html = blocProbleme(probleme(), 0, { ...feuilleParDefaut, schema: "sans" });
    expect(html).toContain("pb-cadre");
    expect(html).not.toContain("<svg");
  });

  it("range les schémas seuls en deux colonnes", () => {
    const html = feuilleProblemes([probleme({ enonce: "", phrase: "" }), probleme({ enonce: "", phrase: "" })], feuilleParDefaut);
    expect(html).toContain("pb-grille");
    expect(html).not.toContain("Réponse :");
  });

  it("choisit « de » ou « d' » selon le mot", () => {
    expect(de("billes")).toBe("de billes");
    expect(de("animaux")).toBe("d'animaux");
    expect(de("œufs")).toBe("d'œufs");
    expect(de("élèves")).toBe("d'élèves");
  });
});
