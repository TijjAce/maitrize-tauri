import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_FRACTIONS_PROLONGEES } from "./fractionsProlongees";
import { planDesFeuilles } from "./feuillesDesSequences";
import { fractionsAComparer, htmlComparerFractions, htmlOperationsSurFractions, operationsSurFractions, REGLAGES_FRACTIONS } from "./jeuxMaths";
import { programmationProposee } from "./programmation";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre: "Les fractions", competenceTitre, niveau,
});

describe("les fractions sans séquence détaillée, prolongées", () => {
  it("donnent à chaque compétence du programme sa séquence", () => {
    const cas: [string, string, string][] = [
      ["CE1", "Savoir interpréter, représenter, écrire et lire des fractions inférieures ou égales à 1.", "fractions-non-unitaires-ce1"],
      ["CE1", "Connaitre et utiliser les mots « dénominateur » et « numérateur ».", "fractions-non-unitaires-ce1"],
      ["CE1", "Comparer des fractions ayant le même dénominateur.", "comparer-fractions-ce1"],
      ["CE1", "Comparer des fractions dont le numérateur est 1.", "comparer-fractions-ce1"],
      ["CE1", "Additionner et soustraire des fractions de même dénominateur.", "additionner-fractions-ce1"],
      ["CE2", "Savoir établir des égalités de fractions inférieures ou égales à 1.", "egalites-fractions-ce2"],
      ["CE2", "Comparer des fractions inférieures à 1.", "comparer-fractions-ce2"],
      ["CE2", "Additionner et soustraire des fractions.", "additionner-fractions-ce2"],
      // Les séquences détaillées des livrets gardent leur place.
      ["CE1", "Savoir interpréter, représenter, écrire et lire les fractions 1/2, 1/3, 1/4, 1/5, 1/6, 1/8 et 1/10.", "fractions-unitaires-ce1"],
      ["CE2", "Partager une unité de longueur en fractions d’unité et mesurer des longueurs non entières par rapport à cette unité.", "fractions-longueurs-ce2"],
    ];
    for (const [niveau, titre, attendue] of cas) expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
  });

  it("disent de quelle séquence du livret elles sont adaptées, et ce que le livret programme", () => {
    for (const d of DEMARCHES_FRACTIONS_PROLONGEES) {
      expect(d.source, d.id).toMatch(/^Adaptée de la séquence « .+ » du livret d'accompagnement de mathématiques du (CE1|CE2) \(Éduscol, 2025\), à la demande de l'enseignant/);
      expect(d.source, d.id).toMatch(/le livret la programme : « Séquence \d/);
    }
    expect(programmationProposee({ niveau: "CE1", competenceTitre: "" }, "fractions-non-unitaires-ce1")!.periode).toBe(3);
    expect(programmationProposee({ niveau: "CE1", competenceTitre: "" }, "comparer-fractions-ce1")!.periode).toBe(4);
    expect(programmationProposee({ niveau: "CE1", competenceTitre: "" }, "additionner-fractions-ce1")!.periode).toBe(4);
  });

  it("donnent leurs feuilles et la note de matériel de chaque séance", () => {
    for (const d of DEMARCHES_FRACTIONS_PROLONGEES) {
      const plan = planDesFeuilles(d.id, { classe: d.id.endsWith("ce1") ? "CE1" : "CE2", periode: 3 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      expect(plan.feuilles.length, d.id).toBeGreaterThanOrEqual(3);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        expect(f.fabriquer(2).html, `${d.id} · ${f.titre}`).toMatch(/^<div class="feuille fr/);
      }
    }
    expect(demarcheDe("comparer-fractions-ce1")).toBeDefined();
  });

  it("comparent juste : même dénominateur, numérateur 1, un dénominateur multiple de l'autre", () => {
    for (const graine of [1, 2, 3]) {
      for (const [[k1, n1], [k2, n2]] of fractionsAComparer([3, 4, 5, 6, 8], "denominateur", 8, graine)) {
        expect(n1).toBe(n2);
        expect(k1).not.toBe(k2);
        expect(k1 < n1 && k2 < n2).toBe(true);
      }
      for (const [a, b] of fractionsAComparer([2, 3, 4, 5, 6, 8, 10], "unitaires", 6, graine)) expect([a[0], b[0], a[1] !== b[1]]).toEqual([1, 1, true]);
      for (const [[, n1], [, n2]] of fractionsAComparer([], "multiple", 8, graine)) expect(Math.max(n1, n2) % Math.min(n1, n2)).toBe(0);
    }
    // Le corrigé met le bon signe, paire après paire ; la feuille de l'élève laisse la case vide.
    for (const graine of [4, 5, 6]) {
      const r = { ...REGLAGES_FRACTIONS, materiel: ["comparer" as const], cas: "multiple" as const };
      const [eleve, corrige] = htmlComparerFractions(r, graine).split('class="page corrige"');
      const signes = [...corrige.matchAll(/class="fr-signe">([^<]*)</g)].map((m) => m[1]);
      const attendus = fractionsAComparer(r.denominateurs, "multiple", 8, graine)
        .map(([[k1, n1], [k2, n2]]) => (k1 * n2 === k2 * n1 ? "=" : k1 * n2 < k2 * n1 ? "&lt;" : "&gt;"));
      expect(signes).toEqual(attendus);
      expect([...eleve.matchAll(/class="fr-signe">([^<]*)</g)].every((m) => m[1] === "")).toBe(true);
    }
  });

  it("ajoutent et retranchent sans dépasser un, et sans résultat nul", () => {
    for (const cas of ["denominateur", "multiple"] as const) for (const graine of [1, 2, 3]) {
      const ops = operationsSurFractions([3, 4, 5, 6, 8], cas, 8, graine);
      expect(ops).toHaveLength(8);
      for (const o of ops) {
        const v = (f: [number, number]) => f[0] / f[1];
        const attendu = o.signe === "+" ? v(o.a) + v(o.b) : v(o.a) - v(o.b);
        expect(Math.abs(v(o.resultat) - attendu)).toBeLessThan(1e-9);
        expect(v(o.resultat)).toBeGreaterThan(0);
        expect(v(o.resultat)).toBeLessThanOrEqual(1);
        if (cas === "denominateur") expect(o.a[1]).toBe(o.b[1]);
      }
      // Une soustraction sur trois.
      expect(ops.filter((o) => o.signe === "−").length).toBeGreaterThanOrEqual(2);
    }
    expect(htmlOperationsSurFractions({ ...REGLAGES_FRACTIONS, materiel: ["operations"], cas: "multiple" }, 1)).toContain("les plus petites parts");
  });
});
