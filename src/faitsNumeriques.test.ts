import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { NIVEAUX, OBJECTIFS, RUBRIQUES, objectifParId, objectifsDuNiveau, tirerCalcul, virgule, type Calcul } from "./faitsNumeriques";

const propre = (t: string) => t.replace(/ /g, "");
const nombre = (t: string) => Number(propre(t).replace(",", ".").replace("−", "-"));
const calculer = (a: number, signe: string, b: number) => (signe === "+" ? a + b : signe === "−" ? a - b : signe === "×" ? a * b : a / b);
const proche = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/** Rejoue une égalité : vrai si la réponse bouche le trou, `null` si la forme n'est pas de l'arithmétique simple. */
function juste(c: Calcul): boolean | null {
  const e = propre(c.ecrit), r = nombre(c.reponse);
  let m = e.match(/^([\d,]+) ([+−×÷]) ([\d,]+) = …$/);
  if (m) return proche(calculer(nombre(m[1]), m[2], nombre(m[3])), r);
  m = e.match(/^([\d,]+) ([+×]) … = ([\d,]+)$/);
  if (m) return proche(calculer(nombre(m[1]), m[2], r), nombre(m[3]));
  m = e.match(/^([\d,]+) = ([\d,]+) ([+×]) …$/);
  if (m) return proche(calculer(nombre(m[2]), m[3], r), nombre(m[1]));
  m = e.match(/^double de ([\d,]+) = …$/);
  if (m) return proche(2 * nombre(m[1]), r);
  m = e.match(/^double de … = ([\d,]+)$/);
  if (m) return proche(2 * r, nombre(m[1]));
  m = e.match(/^moitié de ([\d,]+) = …$/);
  if (m) return proche(nombre(m[1]) / 2, r);
  m = e.match(/^moitié de … = ([\d,]+)$/);
  if (m) return proche(r / 2, nombre(m[1]));
  m = e.match(/^(\d+)\/(\d+) de (\d+) = …$/);
  if (m) return proche((Number(m[3]) / Number(m[2])) * Number(m[1]), r);
  m = e.match(/^(\d+) \+ (\d+)\/(\d+) = …$/);
  if (m) return proche(Number(m[1]) + Number(m[2]) / Number(m[3]), r);
  m = e.match(/^(\d+)\/(\d+) = …$/);
  if (m) return proche(Number(m[1]) / Number(m[2]), r);
  return null;
}

/** La valeur d'une écriture : un entier, un décimal, une fraction. */
const valeur = (t: string) => { const [n, d] = propre(t).split("/"); return d ? nombre(n) / nombre(d) : nombre(n); };

describe("le catalogue des faits numériques", () => {
  it("couvre les six classes et les trois rubriques du programme", () => {
    expect(NIVEAUX.map((n) => n.id)).toEqual(["CP", "CE1", "CE2", "CM1", "CM2", "6e"]);
    expect(RUBRIQUES.map((r) => r.id)).toEqual(["faits", "numeration", "procedures"]);
    for (const n of NIVEAUX) {
      const siens = objectifsDuNiveau(n.id);
      expect(siens.length, n.id).toBeGreaterThanOrEqual(5);
      for (const r of RUBRIQUES) expect(siens.some((o) => o.rubrique === r.id), `${n.id} ${r.id}`).toBe(true);
    }
    // Un identifiant par objectif, un libellé pour chacun.
    expect(new Set(OBJECTIFS.map((o) => o.id)).size).toBe(OBJECTIFS.length);
    for (const o of OBJECTIFS) { expect(o.libelle.trim()).not.toBe(""); expect(o.id.startsWith(o.niveau.toLowerCase())).toBe(true); }
    expect(objectifParId("cp-complements-10")?.libelle).toBe("Compléments à 10");
    expect(objectifParId("inconnu")).toBeUndefined();
  });

  it("donne les fluences que le programme chiffre", () => {
    expect(objectifParId("cp-tables-addition")?.fluence).toBe("8 égalités à trou en une minute");
    expect(objectifParId("ce1-tables-addition")?.fluence).toBe("12 égalités à trou en une minute");
    expect(objectifParId("ce1-table-multiplication")?.fluence).toBe("8 égalités à trou en une minute");
    expect(objectifParId("ce2-tables-addition")?.fluence).toBe("15 égalités à trou en une minute");
    expect(objectifParId("ce2-table-multiplication")?.fluence).toBe("12 égalités à trou en une minute");
    expect(NIVEAUX.map((n) => n.procedures)).toEqual(["9 résultats en trois minutes", "12 résultats en trois minutes", "15 résultats en trois minutes", "", "", ""]);
  });

  it("tire, pour chaque objectif, des égalités à un seul trou dont la réponse est juste", () => {
    for (const o of OBJECTIFS) {
      const alea = hasard(o.id.length * 97 + 3);
      let verifies = 0;
      for (let i = 0; i < 150; i++) {
        const c = tirerCalcul(o, alea, o.tables ? [o.tables[1]] : []);
        expect(c.objectif).toBe(o.id);
        expect((c.ecrit.match(/…/g) ?? []).length, `${o.id} : ${c.ecrit}`).toBe(1);
        expect(c.dire.trim(), o.id).not.toBe("");
        expect(c.reponse.trim(), `${o.id} : ${c.ecrit}`).not.toBe("");
        expect(c.reponse, `${o.id} : ${c.ecrit}`).not.toMatch(/NaN|undefined|Infinity|e[+-]\d/);
        const verdict = juste(c);
        if (verdict !== null) { expect(verdict, `${o.id} : ${c.ecrit} → ${c.reponse}`).toBe(true); verifies++; }
      }
      // Hors fractions, tout se rejoue.
      if (!/fraction|ecritures|quarts|unites-decimales/.test(o.id)) expect(verifies, o.id).toBe(150);
    }
  });

  it("reste dans le champ numérique de la classe, et ne donne jamais de résultat négatif", () => {
    const plafonds: Record<string, number> = { CP: 100, CE1: 1000, CE2: 10000 };
    for (const o of OBJECTIFS) {
      const alea = hasard(o.id.length * 31 + 7);
      for (let i = 0; i < 150; i++) {
        const c = tirerCalcul(o, alea, o.tables ? [...o.tables] : []);
        const nombres = [...propre(`${c.ecrit} ${c.reponse}`).matchAll(/\d+(?:,\d+)?/g)].map((m) => nombre(m[0]));
        expect(`${c.ecrit} ${c.reponse}`, o.id).not.toContain("−…");
        expect(nombre(c.reponse.split("/")[0]), `${o.id} : ${c.ecrit}`).toBeGreaterThanOrEqual(0);
        // Jamais au-delà des millièmes — des centièmes au CM1.
        const decimales = Math.max(0, ...[...propre(`${c.ecrit} ${c.reponse}`).matchAll(/,(\d+)/g)].map((m) => m[1].length));
        expect(decimales, `${o.id} : ${c.ecrit} → ${c.reponse}`).toBeLessThanOrEqual(o.niveau === "CM1" ? 2 : 3);
        if (plafonds[o.niveau]) for (const n of nombres) expect(n, `${o.id} : ${c.ecrit} → ${c.reponse}`).toBeLessThanOrEqual(plafonds[o.niveau]);
      }
    }
  });

  it("travaille la table qu'on choisit, et celle-là seulement", () => {
    const alea = hasard(5);
    const o = objectifParId("ce1-table-multiplication")!;
    for (let i = 0; i < 100; i++) {
      const c = tirerCalcul(o, alea, [7]);
      expect(propre(c.ecrit), c.ecrit).toMatch(/(^7 × )|(= 7 × …$)/);
    }
    const envers = objectifParId("cm1-tables-envers")!;
    for (let i = 0; i < 50; i++) expect(tirerCalcul(envers, alea, [6]).ecrit).toMatch(/ ÷ 6 = …$/);
    // Une table qui n'existe pas pour cet objectif : on retombe sur la première.
    expect(tirerCalcul(o, alea, [42]).ecrit).toMatch(/(^2 × )|(= 2 × …$)/);
    const addition = objectifParId("cp-table-addition")!;
    for (let i = 0; i < 50; i++) expect(propre(tirerCalcul(addition, alea, [5]).ecrit)).toMatch(/(^5 \+ )|(= 5 \+ …$)/);
  });

  it("écrit les fractions usuelles sans se tromper", () => {
    for (const id of ["cm1-fractions", "cm2-fractions", "6e-quarts-demis"]) {
      const alea = hasard(9);
      for (let i = 0; i < 60; i++) {
        const c = tirerCalcul(objectifParId(id)!, alea, []);
        const e = propre(c.ecrit);
        const m = e.match(/^(\S+) ([+−]) (\S+) = …$/);
        if (m) expect(proche(calculer(valeur(m[1]), m[2], valeur(m[3])), valeur(c.reponse)), `${e} → ${c.reponse}`).toBe(true);
        const n = e.match(/^(\S+) = …\/(\d+)$/);
        if (n) expect(proche(valeur(n[1]), nombre(c.reponse) / Number(n[2])), `${e} → ${c.reponse}`).toBe(true);
        expect(m || n || e === "10/10 = …", e).toBeTruthy();
      }
    }
    for (const id of ["cm1-ecritures-decimales", "6e-fractions-decimales", "6e-unites-decimales"]) {
      const alea = hasard(4);
      for (let i = 0; i < 60; i++) {
        const c = tirerCalcul(objectifParId(id)!, alea, []);
        const e = propre(c.ecrit);
        const gauche = e.split(" = ")[0], droite = e.split(" = ")[1];
        const produit = gauche.match(/^(\d+) × (\S+)$/);
        const g = produit ? Number(produit[1]) * valeur(produit[2]) : valeur(gauche);
        const d = valeur(droite.replace("…", propre(c.reponse)));
        expect(proche(g, d), `${e} → ${c.reponse}`).toBe(true);
      }
    }
  });

  it("écrit les décimaux sans zéro qui traîne", () => {
    expect(virgule(345, 100)).toBe("3,45");
    expect(virgule(350, 100)).toBe("3,5");
    expect(virgule(300, 100)).toBe("3");
    expect(virgule(5, 100)).toBe("0,05");
    expect(virgule(35, 10)).toBe("3,5");
    expect(virgule(123456, 100)).toBe("1 234,56");
    expect(virgule(1, 1000)).toBe("0,001");
  });
});
