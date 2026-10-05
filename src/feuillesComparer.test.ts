import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { REGLAGES_COMPARER, convient, reglagesComparerSurs, type ReglagesComparer } from "./comparerNombres";
import {
  htmlComparerLesEcritures, htmlDeuxCollections, htmlEncadrer, htmlEvaluation, htmlOrdonnerIntercaler, htmlProblemes, pairesAComparer,
  problemesDeComparaison, semerDesRonds, signeEntre,
} from "./feuillesComparer";
import { DEMARCHE_COMPARER, FEUILLES_DE_LA_SEQUENCE, htmlDeLaFeuille, materielDesSeances, objectifsDeLaSequence } from "./sequenceComparer";
import { demarcheDe } from "./demarches";

const r = (p: Partial<ReglagesComparer> = {}) => reglagesComparerSurs({ ...REGLAGES_COMPARER, ...p });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const corrige = (html: string) => html.slice(html.indexOf('class="page corrige'));
const lignesDuCorrige = (html: string) => [...corrige(html).matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
const CHAMPS = [30, 59, 100] as const;

describe("les feuilles de la séquence « comparer les nombres »", () => {
  it("sème les ronds de deux collections, sans qu'ils se touchent", () => {
    const svg = semerDesRonds(71, "#e8402f", 3);
    const centres = [...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(centres).toHaveLength(71);
    for (let i = 0; i < centres.length; i++) for (let j = i + 1; j < centres.length; j++) {
      expect(Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1])).toBeGreaterThan(7.6);
    }
    // Jusqu'à 100, les nombres du guide : 71 ronds rouges et 68 bleus.
    const html = htmlDeuxCollections(r({ jusqua: 100 }), 5);
    expect(compter(html, /<circle /g)).toBe(71 + 68);
    expect(html).toContain("Les ronds rouges");
    expect(html).toContain("Les ronds bleus");
    expect(corrige(html)).toContain("<b>71</b> — 7 dizaines 1 unité");
    expect(compter(htmlDeuxCollections(r({ jusqua: 30 }), 5), /<circle /g)).toBe(21 + 18);
  });

  it("fait comparer des paires qui piègent, dont une égalité sous deux formes", () => {
    for (const jusqua of CHAMPS) {
      const reglages = r({ jusqua, formes: ["chiffres", "unites", "desordre", "plusDeDix", "cubes"] });
      const paires = pairesAComparer(reglages, hasard(jusqua), 10);
      expect(paires).toHaveLength(10);
      const egales = paires.filter((p) => p.a.n === p.b.n);
      expect(egales).toHaveLength(1);
      expect(egales[0].a.forme).not.toBe(egales[0].b.forme);
      for (const p of paires) for (const c of [p.a, p.b]) {
        expect(c.n >= 1 && c.n <= jusqua, `${c.n}`).toBe(true);
        expect(convient(c.n, c.forme), `${c.n} ${c.forme}`).toBe(true);
      }
    }
    // Le corrigé dit le bon signe à chaque fois, et la réponse au problème du car.
    const html = htmlComparerLesEcritures(r({ jusqua: 59 }), 8);
    expect(compter(html, /class="fc-paire"/g)).toBe(10);
    const lignes = lignesDuCorrige(html);
    for (const l of lignes.slice(0, 10)) {
      const [, x, s, y] = /<b>(\d+) ([<>=]) (\d+)<\/b>/.exec(l)!;
      expect(signeEntre(Number(x), Number(y))).toBe(s);
    }
    expect(lignes[10]).toMatch(/^Le car : \d+ [<>] \d+ — (oui|non)/);
  });

  it("fait ranger, intercaler et encadrer, avec les réponses justes", () => {
    for (const jusqua of CHAMPS) {
      const lignes = lignesDuCorrige(htmlOrdonnerIntercaler(r({ jusqua }), jusqua));
      for (const l of lignes.slice(0, 3)) {
        const n = l.split(" < ").map(Number);
        expect(n).toEqual([...n].sort((a, b) => a - b));
      }
      const decroissant = lignes[3].split(" > ").map(Number);
      expect(decroissant).toHaveLength(5);
      expect(decroissant).toEqual([...decroissant].sort((a, b) => b - a));
      for (const l of lignes.slice(4)) {
        const [, a, b, liste] = /^Entre (\d+) et (\d+) : (.+)$/.exec(l)!;
        expect(liste.split(", ").map(Number).every((x) => x > Number(a) && x < Number(b))).toBe(true);
      }
      const encadrer = htmlEncadrer(r({ jusqua }), jusqua + 1);
      for (const l of lignesDuCorrige(encadrer).slice(0, 8)) {
        const [, a, n, b] = /^(\d+) < (\d+) < (\d+)$/.exec(l)!;
        expect(Number(a) < Number(n) && Number(n) < Number(b) && Number(b) <= jusqua + 10).toBe(true);
      }
      // Les bandes numériques vont d'une dizaine à la suivante, sans dépasser le champ, quatre cases à remplir.
      expect(compter(encadrer, /<span><\/span>/g)).toBe(8);
      for (const [, debut] of encadrer.matchAll(/La bande de (\d+) à/g)) expect(Number(debut) + 10).toBeLessThanOrEqual(jusqua);
    }
  });

  it("pose des problèmes de comparaison, avec des réponses qui suivent les nombres", () => {
    const alea = hasard(4);
    for (let i = 0; i < 30; i++) {
      const [aaron, car, boites, chaises] = problemesDeComparaison(alea, 59);
      expect(aaron.a).not.toBe(aaron.b);
      expect(aaron.reponse).toBe(aaron.a > aaron.b ? "Aaron a le plus de trombones." : "Mia a le plus de trombones.");
      expect(car.reponse.startsWith(car.a <= car.b ? "Oui" : "Non")).toBe(true);
      expect(boites.reponse).toBe(boites.a < boites.b ? "La boîte rouge." : "La boîte bleue.");
      expect(chaises.reponse.startsWith(chaises.b >= chaises.a ? "Oui" : "Non")).toBe(true);
      for (const p of [aaron, car, boites, chaises]) expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(59);
    }
    const html = htmlProblemes(r(), 2);
    expect(compter(html, /class="fc-probleme"/g)).toBe(4);
    expect(html).toContain("trombones dans sa trousse");
    const evaluation = htmlEvaluation(r(), 2);
    expect(compter(evaluation, /class="fc-consigne"/g)).toBe(5);
    expect(evaluation).toContain('class="page corrige fc-corrige"');
  });

  it("range une feuille au moins dans chacune des sept séances de la démarche", () => {
    const demarche = demarcheDe(DEMARCHE_COMPARER)!;
    expect(demarche.seances).toHaveLength(7);
    for (let i = 0; i < demarche.seances.length; i++) expect(FEUILLES_DE_LA_SEQUENCE.some((f) => f.seance === i), `séance ${i + 1}`).toBe(true);
    for (const f of FEUILLES_DE_LA_SEQUENCE) expect(htmlDeLaFeuille(f.quoi, r(), 3), f.quoi).toContain('<div class="feuille');
    expect(materielDesSeances(r())).toHaveLength(7);
    expect(materielDesSeances(r({ jusqua: 30 }))[0]).toContain("21 rouges");
    expect(objectifsDeLaSequence(r({ jusqua: 100 }))).toContain("« 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68 il y a seulement 6 dizaines »");
  });
});
