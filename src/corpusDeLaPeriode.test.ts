import { describe, expect, it } from "vitest";
import {
  candidatsDeLaPeriode, ceQuOnTravaille, choisirLeCorpus, dechiffrableEnPeriode, niveauDuCorpus, syllabesAuPlus,
} from "./corpusDeLaPeriode";
import { hasard } from "./hasard";
import { nbSyllabes, type MotImage } from "./jeuxSons";
import { sonDuMot } from "./lotosDesSons";

const enMots = (l: string[]): MotImage[] => l.map((mot, i) => ({ id: i + 1, mot }));

describe("les mots de la période (demande de l'enseignant, 31 octobre 2026)", () => {
  it("prend la mesure de la plus jeune classe, et allonge les mots au fil de l'année", () => {
    expect(niveauDuCorpus(["CP", "GS"])).toBe("GS");
    expect(niveauDuCorpus(["CE1"])).toBe("CE1");
    expect(niveauDuCorpus([])).toBe("GS");
    expect([1, 2, 5].map((p) => syllabesAuPlus("GS", p))).toEqual([2, 3, 4]);
    expect([1, 3, 4].map((p) => syllabesAuPlus("MS", p))).toEqual([2, 2, 3]);
    expect([1, 2, 4].map((p) => syllabesAuPlus("CP", p))).toEqual([2, 3, 4]);
  });

  it("au CP, n'écrit en gestes que des mots qu'on sait déchiffrer à la fin de la période ; les jeux à l'oral n'en demandent pas tant", () => {
    const p1 = candidatsDeLaPeriode("CP", 1, { sorte: "geste", son: "" });
    const p5 = candidatsDeLaPeriode("CP", 5, { sorte: "geste", son: "" });
    expect(p1.length).toBeGreaterThan(10);
    expect(p5.length).toBeGreaterThan(p1.length);
    expect(p1.every((m) => dechiffrableEnPeriode(m, 1))).toBe(true);
    expect(p1.every((m) => nbSyllabes({ id: null, mot: m }, false) <= 2)).toBe(true);
    const oral = candidatsDeLaPeriode("CP", 1, { sorte: "syllabes", maximum: 4 });
    expect(oral.some((m) => !dechiffrableEnPeriode(m, 1))).toBe(true);
  });

  it("garde en début d'année les attaques d'une seule consonne, et au premier son celles qu'on peut tenir", () => {
    const attaques = candidatsDeLaPeriode("GS", 2, { sorte: "son", unite: "attaque" });
    expect(attaques.length).toBeGreaterThan(20);
    expect(attaques.every((m) => !sonDuMot(m, "attaque")!.cle.includes("."))).toBe(true);
    expect(candidatsDeLaPeriode("GS", 5, { sorte: "son", unite: "attaque" }).some((m) => sonDuMot(m, "attaque")!.cle.includes("."))).toBe(true);
    const premiers = candidatsDeLaPeriode("GS", 1, { sorte: "son", unite: "phonemeAttaque" }).map((m) => sonDuMot(m, "phonemeAttaque")!.cle);
    expect(premiers.length).toBeGreaterThan(10);
    expect(premiers.some((c) => ["p", "t", "k", "b", "d", "g"].includes(c))).toBe(false);
  });

  it("groupe les mots pour que le jeu marche", () => {
    const r = hasard(7);
    const sons = choisirLeCorpus(enMots(candidatsDeLaPeriode("GS", 3, { sorte: "son", unite: "rime" })), { sorte: "son", unite: "rime" }, 18, r);
    expect(sons.length).toBe(18);
    const parRime = new Map<string, number>();
    for (const m of sons) parRime.set(sonDuMot(m.mot, "rime")!.cle, (parRime.get(sonDuMot(m.mot, "rime")!.cle) ?? 0) + 1);
    expect([...parRime.values()].every((n) => n >= 2)).toBe(true);
    // Une planche de 9 cases demande 9 rimes différentes : deux mots chacune.
    const neuf = choisirLeCorpus(enMots(candidatsDeLaPeriode("GS", 3, { sorte: "son", unite: "rime" })), { sorte: "son", unite: "rime", differents: 9 }, 18, r);
    expect(new Set(neuf.map((m) => sonDuMot(m.mot, "rime")!.cle)).size).toBeGreaterThanOrEqual(9);
    // Le loto des syllabes : autant de mots d'une, de deux, de trois syllabes.
    const syll = choisirLeCorpus(enMots(candidatsDeLaPeriode("GS", 3, { sorte: "syllabes", maximum: 3 })), { sorte: "syllabes", maximum: 3 }, 18, r);
    const comptes = [1, 2, 3].map((k) => syll.filter((m) => nbSyllabes(m, false) === k).length);
    expect(Math.max(...comptes) - Math.min(...comptes)).toBeLessThanOrEqual(1);
    // L'intrus : des lignes de trois mots qui commencent pareil, puis des intrus.
    const intrus = choisirLeCorpus(enMots(candidatsDeLaPeriode("GS", 3, { sorte: "intrus", mode: "attaque" })), { sorte: "intrus", mode: "attaque" }, 24, r);
    expect(intrus.length).toBe(24);
    expect(ceQuOnTravaille({ sorte: "son", unite: "attaque" })).toBe("les attaques");
    expect(ceQuOnTravaille({ sorte: "intrus", mode: "rime" })).toBe("la dernière syllabe");
  });
});
