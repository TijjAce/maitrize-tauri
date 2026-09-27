import { describe, it, expect } from "vitest";
import {
  casesAColorier, consigne, couleursDuMotif, fabriquerColoriage, MOTIFS, operationPour,
  resultatsDesCouleurs, REGLAGES_PAR_DEFAUT, type Operation,
} from "./coloriageMagique";
import { hasard } from "./problemesBarres";

const calcule = (expr: string): number => {
  const m = /^(\d+) ([+−×]) (\d+)$/.exec(expr);
  if (!m) throw new Error(`calcul illisible : « ${expr} »`);
  const [a, b] = [Number(m[1]), Number(m[3])];
  return m[2] === "+" ? a + b : m[2] === "−" ? a - b : a * b;
};

describe("les motifs", () => {
  it("sont des carrés de huit sur huit, sans caractère inattendu", () => {
    for (const m of MOTIFS) {
      expect(m.grille, m.nom).toHaveLength(8);
      for (const ligne of m.grille) {
        expect(ligne.length, `${m.nom} : « ${ligne} »`).toBe(8);
        expect(/^[.123]+$/.test(ligne), `${m.nom} : « ${ligne} »`).toBe(true);
      }
    }
  });

  it("donnent une feuille d'une longueur raisonnable", () => {
    for (const m of MOTIFS) {
      const n = casesAColorier(m);
      // Assez pour que le dessin se lise, pas au point d'y passer l'après-midi.
      expect(n, m.nom).toBeGreaterThan(20);
      expect(n, m.nom).toBeLessThan(56);
      expect(couleursDuMotif(m).length, m.nom).toBeGreaterThan(0);
    }
  });

  it("n'ont pas deux identifiants ni deux noms pareils", () => {
    expect(new Set(MOTIFS.map((m) => m.id)).size).toBe(MOTIFS.length);
    expect(new Set(MOTIFS.map((m) => m.nom)).size).toBe(MOTIFS.length);
  });
});

describe("les calculs", () => {
  it("tombent toujours sur le résultat voulu", () => {
    const r = hasard(7);
    for (const op of ["addition", "soustraction", "melange"] as Operation[]) {
      for (let resultat = 2; resultat <= 10; resultat++) {
        for (let i = 0; i < 20; i++) {
          expect(calcule(operationPour(resultat, op, 10, 2, r)), `${op} → ${resultat}`).toBe(resultat);
        }
      }
    }
  });

  it("ne dépassent pas le plafond, même en soustrayant", () => {
    const r = hasard(11);
    for (let i = 0; i < 200; i++) {
      const expr = operationPour(6, "soustraction", 10, 2, r);
      expect(calcule(expr)).toBe(6);
      expect(Number(/^(\d+)/.exec(expr)![1])).toBeLessThanOrEqual(10);
    }
  });

  it("restent dans la table demandée, dans un sens ou dans l'autre", () => {
    const r = hasard(3);
    const vus = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const expr = operationPour(42, "multiplication", 10, 7, r);
      expect(calcule(expr)).toBe(42);
      expect(expr === "7 × 6" || expr === "6 × 7", expr).toBe(true);
      vus.add(expr);
    }
    // Les deux écritures sortent : sinon toutes les cases d'une couleur
    // porteraient le même calcul, recopié vingt fois.
    expect(vus.size).toBe(2);
    for (const resultat of [2, 4, 6, 8, 20]) {
      expect(calcule(operationPour(resultat, "multiplication", 10, 2, r))).toBe(resultat);
    }
  });
});

describe("la feuille", () => {
  it("donne une couleur par résultat, et jamais deux fois le même", () => {
    for (let graine = 1; graine <= 40; graine++) {
      for (const m of MOTIFS) {
        const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: m.id }, graine);
        const resultats = c.legende.map((l) => l.resultat);
        expect(new Set(resultats).size, `${m.nom} graine ${graine}`).toBe(resultats.length);
      }
    }
  });

  it("met dans chaque case un calcul qui donne la couleur de sa case", () => {
    const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: "maison", operation: "melange", plafond: 20 }, 42);
    const attendu = new Map(c.legende.map((l) => [l.couleur.id, l.resultat]));
    let calculs = 0;
    c.lignes.forEach((ligne, y) => ligne.forEach((caseC, x) => {
      const attenduIci = c.motif.grille[y][x];
      if (attenduIci === ".") {
        expect(caseC.calcul).toBe("");
        expect(caseC.couleur).toBe("");
        return;
      }
      calculs += 1;
      expect(caseC.couleur).toBe(attenduIci);
      expect(calcule(caseC.calcul), `case ${x},${y}`).toBe(attendu.get(attenduIci));
    }));
    expect(calculs).toBe(casesAColorier(c.motif));
  });

  it("rend la même feuille à graine égale, une autre sinon", () => {
    const a = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 5);
    const b = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 5);
    const c = fabriquerColoriage(REGLAGES_PAR_DEFAUT, 6);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("supporte un motif qu'on ne connaît pas", () => {
    const c = fabriquerColoriage({ ...REGLAGES_PAR_DEFAUT, motif: "licorne" }, 1);
    expect(c.motif.id).toBe(MOTIFS[0].id);
  });

  it("ne manque jamais de résultats pour les couleurs", () => {
    // Trois couleurs, et des additions jusqu'à 10 : neuf résultats possibles.
    const pris = resultatsDesCouleurs(couleursDuMotif(MOTIFS[1]), "addition", 10, 2, hasard(9));
    expect(new Set(pris).size).toBe(couleursDuMotif(MOTIFS[1]).length);
  });

  it("dit à l'élève ce qu'on attend de lui", () => {
    expect(consigne(REGLAGES_PAR_DEFAUT)).toContain("colorie");
    expect(consigne({ ...REGLAGES_PAR_DEFAUT, operation: "multiplication", table: 7 })).toContain("table de 7");
    expect(consigne(REGLAGES_PAR_DEFAUT)).toContain("reste blanche");
  });
});
