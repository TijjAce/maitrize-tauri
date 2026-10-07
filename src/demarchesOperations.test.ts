import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_OPERATIONS } from "./demarchesOperations";
import { planDesFeuilles } from "./feuillesDesSequences";
import { REGLAGES_POSEES, enLigne, htmlOperationsPosees, operationsPosees } from "./operationsPosees";
import { programmationProposee } from "./programmation";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre: "Les quatre opérations", competenceTitre, niveau,
});

const COMPETENCES: [string, string, string][] = [
  ["CP", "Comprendre le sens de l’addition et de la soustraction.", "sens-addition-soustraction-cp"],
  ["CP", "Comprendre et utiliser les symboles « + », « - » et « = ».", "sens-addition-soustraction-cp"],
  ["CP", "Poser et effectuer des additions en colonnes.", "addition-posee-cp"],
  ["CP", "Comprendre le sens de la multiplication.", "sens-multiplication-cp"],
  ["CE1", "Poser et effectuer des additions et des soustractions en colonnes.", "posees-ce1"],
  ["CE1", "Comprendre et utiliser le symbole « × ».", "multiplication-ce1"],
  ["CE1", "Comprendre et savoir que la multiplication est commutative.", "multiplication-ce1"],
  ["CE1", "Connaitre la notion de parité d’un nombre.", "parite-ce1"],
  ["CE2", "Comprendre et utiliser les mots « terme », « somme » et « différence ».", "mots-operations-ce2"],
  ["CE2", "Poser et effectuer des additions et des soustractions en colonnes.", "posees-ce2"],
  ["CE2", "Comprendre et utiliser les mots « facteur », « produit » et « multiple ».", "mots-operations-ce2"],
  ["CE2", "Comprendre le sens de la division et utiliser le symbole « ÷ ».", "division-ce2"],
  ["CE2", "Poser et effectuer des multiplications d’un nombre à deux ou trois chiffres par un nombre à un ou deux chiffres.", "multiplication-posee-ce2"],
];

describe("les quatre opérations, bâties sur le programme et les guides", () => {
  it("donnent à chaque compétence du programme sa séquence", () => {
    for (const [niveau, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
  });

  it("disent leurs sources, et proposent la période que le programme donne", () => {
    for (const d of DEMARCHES_OPERATIONS) expect(d.source, d.id).toMatch(/^Bâtie sur le programme de mathématiques du cycle 2 \(2024\) et les guides Éduscol, à la demande de l'enseignant/);
    expect(demarcheDe("addition-posee-cp")!.source).toContain("Comment enseigner l'addition posée ?");
    const periode = (niveau: string, titre: string, id: string) => programmationProposee({ niveau, competenceTitre: titre }, id)!.periode;
    expect(periode("CP", "Poser et effectuer des additions en colonnes.", "addition-posee-cp")).toBe(4);
    expect(periode("CE1", "Poser et effectuer des additions et des soustractions en colonnes.", "posees-ce1")).toBe(3);
    expect(periode("CE2", COMPETENCES[12][1], "multiplication-posee-ce2")).toBe(4);
  });

  it("donnent leurs feuilles et la note de matériel de chaque séance", () => {
    for (const d of DEMARCHES_OPERATIONS) {
      const classe = d.id.endsWith("-cp") ? "CP" : d.id.endsWith("-ce1") ? "CE1" : "CE2";
      const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} · ${f.titre}`).toBeLessThan(d.seances.length);
        const html = f.fabriquer(3).html;
        expect(html, `${d.id} · ${f.titre}`).toMatch(/^<div class="(pb-)?feuille/);
        expect(html, `${d.id} · ${f.titre}`).not.toMatch(/NaN|undefined/);
      }
    }
    // La parité se trie dans les maisons « pair » et « impair ».
    const tri = planDesFeuilles("parite-ce1", { classe: "CE1", periode: 2 })!.feuilles[0].fabriquer(2).html;
    expect(tri).toContain("pair");
    expect(tri).toContain("impair");
  });
});

describe("les opérations posées", () => {
  it("tombent juste, avec ou sans retenue comme on l'a demandé", () => {
    for (const graine of [1, 2, 3]) {
      for (const retenue of ["sans", "avec"] as const) {
        for (const p of operationsPosees({ ...REGLAGES_POSEES, operation: "+", chiffres: 2, retenue, combien: 6 }, graine)) {
          expect(p.resultat).toBe(p.termes[0] + p.termes[1]);
          const unites = (p.termes[0] % 10) + (p.termes[1] % 10), dizaines = Math.floor(p.termes[0] / 10) % 10 + Math.floor(p.termes[1] / 10) % 10;
          expect(unites >= 10 || dizaines + (unites >= 10 ? 1 : 0) >= 10, `${p.termes.join(" + ")}`).toBe(retenue === "avec");
        }
      }
      for (const p of operationsPosees({ ...REGLAGES_POSEES, operation: "−", chiffres: 3, retenue: "melange", combien: 6 }, graine)) {
        expect(p.resultat).toBe(p.termes[0] - p.termes[1]);
        expect(p.resultat).toBeGreaterThan(0);
      }
      // Trois termes : un nombre à un chiffre au milieu, comme 28 + 8 + 56.
      for (const p of operationsPosees({ ...REGLAGES_POSEES, operation: "+", troisTermes: true, combien: 6 }, graine)) {
        expect(p.termes).toHaveLength(3);
        expect(p.termes[1]).toBeLessThan(10);
        expect(p.resultat).toBe(p.termes[0] + p.termes[1] + p.termes[2]);
      }
      // La multiplication : jusqu'à 10 000, et jamais par une dizaine entière.
      for (const p of operationsPosees({ ...REGLAGES_POSEES, operation: "×", chiffres: 3, chiffresDuSecond: 2, combien: 6 }, graine)) {
        expect(p.resultat).toBe(p.termes[0] * p.termes[1]);
        expect(p.resultat).toBeLessThanOrEqual(10000);
        expect(p.termes[1] % 10).not.toBe(0);
      }
    }
  });

  it("s'impriment posées ou à poser, avec leur corrigé et les euros", () => {
    const aPoser = htmlOperationsPosees({ ...REGLAGES_POSEES, posees: false, combien: 3 }, 4);
    const [eleve, corrige] = aPoser.split('class="page corrige"');
    expect(eleve).toContain("Pose, puis calcule");
    expect(eleve).toContain('class="op-enligne"');
    expect(corrige).toMatch(/= <b>\d+<\/b>/);
    expect(enLigne(1235, true)).toBe("12,35 €");
    expect(enLigne(5480, false)).toBe("5 480");
    const euros = htmlOperationsPosees({ ...REGLAGES_POSEES, operation: "+", chiffres: 4, euros: true, combien: 3, posees: false }, 2);
    expect(euros).toMatch(/\d+,\d\d €/);
  });
});
