import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { planDesFeuilles } from "./feuillesDesSequences";
import {
  DEMARCHES_PROBLEMES_PROLONGES, problemesCartesiens, problemesComparaisonsEnChaine, problemesDeuxTransformations, problemesMixtes,
  problemesMonnaieRendue, problemesMultiplicatifs, que,
} from "./problemesProlonges";
import type { Probleme } from "./problemesBarres";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, competenceTitre: string) => ({
  domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre: "La résolution de problèmes", competenceTitre, niveau,
});

/** Chaque ligne du calcul — « a + b = c », « a × b × c = d », « 7 + 7 + 7 = 21 » — tombe juste, sans nombre négatif. */
function calculsJustes(p: Probleme): boolean {
  return p.calcul.split(" ; ").every((ligne) => {
    const [gauche, droite] = ligne.replace(/[  ](?=\d{3}\b)/g, "").split(" = ");
    const morceaux = gauche.split(" ");
    let valeur = Number(morceaux[0]);
    for (let i = 1; i < morceaux.length; i += 2) {
      const x = Number(morceaux[i + 1]);
      valeur = morceaux[i] === "+" ? valeur + x : morceaux[i] === "−" ? valeur - x : morceaux[i] === "×" ? valeur * x : valeur / x;
    }
    return Number.isFinite(valeur) && valeur === Number(droite) && valeur > 0;
  });
}

describe("les problèmes sans séquence de livret, sur la trame des livrets", () => {
  it("donnent à chaque compétence du programme sa séquence", () => {
    const cas: [string, string, string][] = [
      ["CP", "Résoudre des problèmes additifs en deux étapes (champ numérique inférieur ou égal à 30).", "deux-etapes-cp"],
      ["CP", "Résoudre des problèmes multiplicatifs en une étape (champ numérique inférieur ou égal à 30).", "multiplicatifs-cp"],
      ["CE1", "Résoudre des problèmes additifs de comparaison en une étape.", "comparaison-ce1"],
      ["CE1", "Résoudre des problèmes additifs en deux étapes.", "deux-etapes-ce1"],
      ["CE1", "Résoudre des problèmes multiplicatifs en une étape.", "multiplicatifs-ce1"],
      ["CE1", "Résoudre des problèmes mixtes en deux étapes (une étape additive et une étape multiplicative).", "mixtes-ce1"],
      ["CE2", "Résoudre des problèmes additifs en une étape de types parties-tout et comparaison.", "parties-tout-comparaison-ce2"],
      ["CE2", "Résoudre des problèmes multiplicatifs en une étape.", "multiplicatifs-ce2"],
      ["CE2", "Résoudre des problèmes mixtes en deux ou trois étapes.", "mixtes-ce2"],
      ["CE2", "Résoudre des problèmes de comparaison multiplicative en une étape.", "comparaison-multiplicative-ce2"],
      ["CE2", "Résoudre des problèmes mettant en jeu des produits cartésiens.", "produits-cartesiens-ce2"],
      // Les séquences des livrets gardent leur place.
      ["CP", "Résoudre des problèmes additifs en une étape du type parties-tout.", "parties-tout-cp"],
      ["CE2", "Résoudre des problèmes additifs en deux étapes.", "deux-etapes-ce2"],
    ];
    for (const [niveau, titre, attendue] of cas) expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
  });

  it("disent qu'elles prolongent les livrets, et citent le problème du programme", () => {
    expect(DEMARCHES_PROBLEMES_PROLONGES).toHaveLength(11);
    for (const d of DEMARCHES_PROBLEMES_PROLONGES) {
      expect(d.seances, d.id).toHaveLength(9);
      expect(d.source, d.id).toMatch(/^Trame des séquences de problèmes des livrets d'accompagnement de mathématiques \(Éduscol, 2025 — (CP|CE1|CE2), séquence n° \d/);
      expect(d.source, d.id).toContain("prolongée à cette compétence");
    }
    expect(demarcheDe("mixtes-ce1")!.seances[0].phases[0].description).toContain("« Abi achète sept litres d'huile à deux euros le litre.");
    expect(demarcheDe("produits-cartesiens-ce2")!.seances[0].phases[0].description).toContain("trois pantalons et sept teeshirts");
  });

  it("donnent une feuille à chaque séance, et des calculs qui tombent juste", () => {
    for (const d of DEMARCHES_PROBLEMES_PROLONGES) {
      const classe = d.id.endsWith("-cp") ? "CP" : d.id.endsWith("-ce1") ? "CE1" : "CE2";
      const plan = planDesFeuilles(d.id, { classe, periode: 3 })!;
      expect(plan.feuilles.map((f) => f.seance), d.id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(plan.materiel, d.id).toHaveLength(9);
      for (const graine of [1, 2]) for (const f of plan.feuilles) {
        const html = f.fabriquer(graine).html;
        expect(html, `${d.id} · ${f.titre}`).toMatch(/^<div class="pb-feuille/);
        expect(html, `${d.id} · ${f.titre}`).not.toMatch(/NaN|undefined/);
      }
      // La première feuille commence par le problème de référence.
      expect(plan.feuilles[0].fabriquer(1).html.replace(/&#39;/g, "'"), d.id).toContain(d.seances[0].phases[0].description.match(/« (.{20})/)![1]);
    }
  });

  it("tirent des problèmes justes, dans le champ de la classe", () => {
    for (const graine of [1, 2, 3, 4]) {
      const deux = problemesDeuxTransformations(30, 6, graine);
      expect(deux).toHaveLength(6);
      for (const p of deux) {
        expect(calculsJustes(p), p.calcul).toBe(true);
        // Au CP, rien au-delà de 30.
        expect(Math.max(...(p.calcul.match(/\d+/g) ?? []).map(Number))).toBeLessThanOrEqual(30);
      }
      for (const p of [...problemesMonnaieRendue(4, graine), ...problemesComparaisonsEnChaine(4, graine), ...problemesMixtes(6, graine, 2),
        ...problemesMixtes(6, graine, 3), ...problemesCartesiens(6, graine)]) {
        expect(calculsJustes(p), `${p.enonce} — ${p.calcul}`).toBe(true);
        expect(p.phrase, p.enonce).toContain(String(p.reponse));
      }
      // Trois étapes au CE2 : une feuille sur deux.
      expect(problemesMixtes(6, graine, 3).filter((p) => p.calcul.split(" ; ").length === 3).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("écrivent les calculs multiplicatifs comme la classe : additions itérées au CP, produit au CE1, division au CE2", () => {
    const cp = problemesMultiplicatifs("CP", ["tout", "nombre"], 4, 3, { parts: [2, 5], valeurs: [2, 6] });
    for (const p of cp) {
      expect(p.calcul, p.enonce).toMatch(/^\d+( \+ \d+)+ = \d+$/);
      expect(calculsJustes(p)).toBe(true);
    }
    for (const p of problemesMultiplicatifs("CE1", ["part", "nombre"], 4, 3, { parts: [2, 10], valeurs: [2, 10] })) expect(p.calcul).toMatch(/^\d+ × \d+ = \d+$/);
    expect(problemesMultiplicatifs("CE2", ["part"], 2, 3, { parts: [2, 10], valeurs: [3, 25] })[0].calcul).toContain("÷");
  });

  it("élident devant une voyelle", () => {
    expect([que("Inès"), que("Adam"), que("Tom"), que("Élise")]).toEqual(["qu'Inès", "qu'Adam", "que Tom", "qu'Élise"]);
    for (const p of problemesComparaisonsEnChaine(8, 5)) expect(p.enonce).not.toMatch(/que [AEIOUÉ]/);
  });
});
