import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { REGLAGES_COMPARER, convient, niveauParId, reglagesComparerSurs, type IdNiveau, type ReglagesComparer } from "./comparerNombres";
import {
  htmlComparerLesEcritures, htmlDeuxCollections, htmlEncadrer, htmlEvaluation, htmlOrdonnerIntercaler, htmlProblemes, pairesAComparer,
  problemesDeComparaison, semerDesRonds, signeEntre, uniteDEncadrement,
} from "./feuillesComparer";
import { DEMARCHE_COMPARER, FEUILLES_DE_LA_SEQUENCE, htmlDeLaFeuille, materielDesSeances } from "./sequenceComparer";
import { demarcheDe } from "./demarches";

const r = (p: Partial<ReglagesComparer> = {}) => reglagesComparerSurs({ ...REGLAGES_COMPARER, ...p });
const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;
const corrige = (html: string) => html.slice(html.indexOf('class="page corrige'));
/** Les lignes du corrigé, les signes et les espaces des milliers rendus lisibles : « 1 234 < 1 243 ». */
const lignesDuCorrige = (html: string) => [...corrige(html).matchAll(/<li>(.*?)<\/li>/g)]
  .map((m) => m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/ /g, " "));
const nombre = (t: string) => Number(t.replace(/\s/g, ""));
const DU_CYCLE_2: IdNiveau[] = ["cp-30", "cp-59", "cp-100", "ce1", "ce2"];

describe("les feuilles de la séquence « comparer les nombres »", () => {
  it("sème les ronds de deux collections au CP, sans qu'ils se touchent", () => {
    const svg = semerDesRonds(71, "#e8402f", 3);
    const centres = [...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(centres).toHaveLength(71);
    for (let i = 0; i < centres.length; i++) for (let j = i + 1; j < centres.length; j++) {
      expect(Math.hypot(centres[i][0] - centres[j][0], centres[i][1] - centres[j][1])).toBeGreaterThan(7.6);
    }
    // Jusqu'à 100, les nombres du guide : 71 ronds rouges et 68 bleus.
    const html = htmlDeuxCollections(r({ niveau: "cp-100" }), 5);
    expect(compter(html, /<circle /g)).toBe(71 + 68);
    expect(html).toContain("Les ronds rouges");
    expect(corrige(html)).toContain("<b>71</b> — 7 dizaines 1 unité");
    expect(compter(htmlDeuxCollections(r({ niveau: "cp-30" }), 5), /<circle /g)).toBe(21 + 18);
  });

  it("donne au CE1 des collections en plaques, barres et cubes, et au CE2 une livraison", () => {
    // 412 avec une centaine défaite : 3 plaques, 11 barres, 2 cubes ; 398 au plus juste.
    const ce1 = htmlDeuxCollections(r({ niveau: "ce1" }), 5);
    expect(ce1).toContain('aria-label="412"');
    expect(ce1).toContain("Combien de cubes en tout ?");
    expect(corrige(ce1)).toContain("<b>412</b> — 4 centaines 1 dizaine 2 unités");
    const ce2 = htmlDeuxCollections(r({ niveau: "ce2" }), 5);
    expect(ce2).toContain("<li>3 caisses de 1 000 vis</li><li>10 cartons de 100 vis</li><li>1 boîte de 10 vis</li><li>2 vis seules</li>");
    expect(ce2).toContain("Combien de vis en tout ?");
  });

  it("fait comparer des paires qui piègent, dont une égalité sous deux formes, à chaque niveau du cycle 2", () => {
    for (const id of DU_CYCLE_2) {
      const niv = niveauParId(id);
      const reglages = r({ niveau: id, formes: niv.formes });
      const paires = pairesAComparer(reglages, hasard(niv.max), 10);
      expect(paires).toHaveLength(10);
      const egales = paires.filter((p) => p.a.n === p.b.n);
      expect(egales).toHaveLength(1);
      expect(egales[0].a.forme).not.toBe(egales[0].b.forme);
      for (const p of paires) for (const c of [p.a, p.b]) {
        expect(c.n >= 1 && c.n <= niv.max, `${id} ${c.n}`).toBe(true);
        expect(convient(c.n, c.forme, niv), `${id} ${c.n} ${c.forme}`).toBe(true);
      }
      // Le corrigé dit le bon signe à chaque fois, et la réponse au problème.
      const lignes = lignesDuCorrige(htmlComparerLesEcritures(reglages, 8));
      for (const l of lignes.slice(0, 10)) {
        const [, x, s, y] = /<b>([\d ]+) ([<>=]) ([\d ]+)<\/b>/.exec(l)!;
        expect(signeEntre(nombre(x), nombre(y))).toBe(s);
      }
      expect(lignes[10]).toMatch(/^(Le car|La salle) : [\d ]+ [<>] [\d ]+ — (oui|non)/);
    }
  });

  it("fait ranger, intercaler et encadrer, avec les réponses justes", () => {
    for (const id of DU_CYCLE_2) {
      const niv = niveauParId(id);
      const lignes = lignesDuCorrige(htmlOrdonnerIntercaler(r({ niveau: id }), niv.max));
      for (const l of lignes.slice(0, 3)) {
        const n = l.split(" < ").map(nombre);
        expect(n).toEqual([...n].sort((a, b) => a - b));
      }
      const decroissant = lignes[3].split(" > ").map(nombre);
      expect(decroissant).toHaveLength(5);
      expect(decroissant).toEqual([...decroissant].sort((a, b) => b - a));
      for (const l of lignes.slice(4)) {
        const [, a, b] = /^Entre ([\d ]+) et ([\d ]+) : /.exec(l)!;
        expect(nombre(b) - nombre(a)).toBeGreaterThanOrEqual(2);
      }
      // On encadre entre deux dizaines au CP, deux centaines au CE1, deux milliers au CE2.
      const { pas } = uniteDEncadrement(niv);
      const encadrer = htmlEncadrer(r({ niveau: id }), niv.max + 1);
      expect(encadrer).toContain(`Encadre chaque nombre entre deux ${uniteDEncadrement(niv).nom}.`);
      for (const l of lignesDuCorrige(encadrer).slice(0, 4)) {
        const [, a, n, b] = /^([\d ]+) < ([\d ]+) < ([\d ]+)$/.exec(l)!;
        expect(nombre(a) % pas === 0 && nombre(b) - nombre(a) === pas && nombre(a) < nombre(n) && nombre(n) < nombre(b), l).toBe(true);
      }
      // Les bandes numériques vont d'une dizaine à la suivante, sans dépasser le niveau, quatre cases à remplir.
      expect(compter(encadrer, /<span><\/span>/g)).toBe(8);
      for (const [, debut] of encadrer.replace(/ /g, "").matchAll(/La bande de (\d+) à/g)) expect(Number(debut) + 10).toBeLessThanOrEqual(niv.max);
    }
    expect(uniteDEncadrement(niveauParId("ce1"))).toEqual({ pas: 100, nom: "centaines" });
  });

  it("pose des problèmes de comparaison, avec des réponses qui suivent les nombres", () => {
    const alea = hasard(4);
    for (const id of ["cp-59", "ce1", "ce2"] as IdNiveau[]) {
      const niv = niveauParId(id);
      for (let i = 0; i < 20; i++) {
        const [aaron, salle, jours, perles] = problemesDeComparaison(alea, niv);
        expect(aaron.a).not.toBe(aaron.b);
        expect(aaron.reponse).toMatch(new RegExp(`^${aaron.a > aaron.b ? "Aaron" : "Mia"} a le plus`));
        expect(salle.reponse.startsWith(salle.a <= salle.b ? "Oui" : "Non")).toBe(true);
        expect(perles.reponse.startsWith(perles.b >= perles.a ? "Oui" : "Non")).toBe(true);
        for (const p of [aaron, salle, jours, perles]) expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(niv.max);
      }
    }
    // Au CP, les trombones et le car du programme et du guide ; au-delà de cent, des timbres et une salle.
    expect(htmlProblemes(r({ niveau: "cp-59" }), 2)).toContain("trombones dans sa trousse");
    expect(htmlProblemes(r({ niveau: "ce1" }), 2)).toContain("timbres dans sa collection");
    const evaluation = htmlEvaluation(r({ niveau: "ce2" }), 2);
    expect(compter(evaluation, /class="fc-consigne"/g)).toBe(5);
    expect(evaluation).toContain("Encadre chaque nombre entre deux milliers.");
  });

  it("met une feuille au moins dans chacune des sept séances, à chaque niveau du cycle 2", () => {
    const demarche = demarcheDe(DEMARCHE_COMPARER)!;
    expect(demarche.seances).toHaveLength(7);
    for (let i = 0; i < demarche.seances.length; i++) expect(FEUILLES_DE_LA_SEQUENCE.some((f) => f.seance === i), `séance ${i + 1}`).toBe(true);
    for (const id of DU_CYCLE_2) for (const f of FEUILLES_DE_LA_SEQUENCE) expect(htmlDeLaFeuille(f.quoi, r({ niveau: id }), 3), `${id} ${f.quoi}`).toContain('<div class="feuille');
    expect(materielDesSeances(r())).toHaveLength(7);
    expect(materielDesSeances(r({ niveau: "cp-30" }))[0]).toContain("21 rouges");
    expect(materielDesSeances(r({ niveau: "ce1" }))[0]).toContain("plaques, barres et cubes");
  });
});
