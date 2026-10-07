import { describe, it, expect } from "vitest";
import { demarcheDe, demarcheSuggeree } from "./demarches";
import { DEMARCHES_DONNEES } from "./demarchesDonnees";
import { planDesFeuilles } from "./feuillesDesSequences";
import { programmationProposee } from "./programmation";
import { EXERCICES_DONNEES, REGLAGES_DONNEES, casesACacher, enqueteAuHasard, htmlDonnees, pasDeLAxe, questionsSur, tableauTransports, type Classe } from "./donnees";
import { hasard } from "./hasard";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const OGD = "Organisation et gestion de données";
const cible = (niveau: string, competenceTitre: string) => ({ domaineTitre: "Mathématiques", sousDomaineTitre: OGD, competenceGeneraleTitre: OGD, competenceTitre, niveau });

const COMPETENCES: [string, string, string][] = [
  ["CP", "Collecter des données et présenter ces données sous forme d’un tableau ou d’un diagramme en barres.", "donnees-cp"],
  ["CP", "Construire et compléter un tableau à double entrée.", "double-entree-cp"],
  ["CE1", "Produire un tableau ou un diagramme en barres pour présenter des données recueillies.", "donnees-ce1"],
  ["CE1", "Lire et interpréter les données d’un diagramme en barres. Lire et interpréter les données d’un tableau à double entrée.", "donnees-ce1"],
  ["CE2", "Produire un tableau ou un diagramme en barres pour présenter des données recueillies.", "donnees-ce2"],
  ["CE2", "Lire et interpréter les données d’un tableau à double entrée ou d’un diagramme en barres.", "donnees-ce2"],
  ["CE2", "Résoudre des problèmes en utilisant les données d’un tableau à double entrée ou d’un diagramme en barre.", "problemes-donnees-ce2"],
];

describe("l'organisation et la gestion de données, bâties sur le programme", () => {
  it("donnent à chaque compétence sa séquence, disent leurs sources et donnent leurs feuilles", () => {
    for (const [niveau, titre, attendue] of COMPETENCES) {
      expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
      expect(programmationProposee({ niveau, competenceTitre: titre }, attendue)!.periode).toBeNull();
    }
    expect(demarcheDe("problemes-donnees-ce2")!.resume).toContain("école Poséidon");
    for (const d of DEMARCHES_DONNEES) {
      expect(d.source).toMatch(/^Bâtie sur le programme de mathématiques du cycle 2 \(2024\)/);
      const classe = d.id.endsWith("-cp") ? "CP" : d.id.endsWith("-ce1") ? "CE1" : "CE2";
      const plan = planDesFeuilles(d.id, { classe, periode: 2 })!;
      expect(plan.materiel, d.id).toHaveLength(d.seances.length);
      for (const f of plan.feuilles) for (const graine of [1, 2, 3]) {
        const html = f.fabriquer(graine).html;
        expect(html).toMatch(/^<div class="feuille/);
        expect(html, `${d.id} · ${f.titre}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });
});

describe("les tableaux et les diagrammes", () => {
  it("tirent des enquêtes à la mesure de chaque classe, avec un seul « plus » et un seul « moins »", () => {
    const alea = hasard(6);
    for (let i = 0; i < 40; i++) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) {
      const e = enqueteAuHasard(alea, classe);
      const total = e.effectifs.reduce((s, x) => s + x, 0);
      expect(e.valeurs.length).toBeGreaterThanOrEqual(2);
      expect(e.valeurs.length).toBeLessThanOrEqual(5);
      if (classe === "CP") expect(total).toBeLessThan(40);
      if (classe === "CE1") { expect(total).toBeLessThan(100); expect(Math.max(...e.effectifs)).toBeLessThanOrEqual(20); }
      const trie = [...e.effectifs].sort((a, b) => b - a);
      expect(trie[0]).not.toBe(trie[1]);
      expect(trie[trie.length - 1]).not.toBe(trie[trie.length - 2]);
      for (const q of questionsSur(e, classe, alea)) expect(q.reponse.length).toBeGreaterThan(0);
    }
    expect(pasDeLAxe(18)).toBe(1);
    expect(pasDeLAxe(45)).toBe(5);
    expect(pasDeLAxe(90)).toBe(10);
  });

  it("cachent des cases qu'on retrouve toutes par les totaux", () => {
    const alea = hasard(2);
    for (let k = 0; k < 20; k++) {
      tableauTransports(alea);
      const caches = new Set(casesACacher(alea));
      // On résout : une ligne, ou une colonne, qui n'a plus qu'une inconnue.
      const lignes = ["0", "1", "2", "3", "t"], colonnes = ["0", "1", "t"];
      for (let tour = 0; tour < 20 && caches.size; tour++) {
        for (const l of lignes) { const inconnues = colonnes.filter((c) => caches.has(`${l},${c}`)); if (inconnues.length === 1) caches.delete(`${l},${inconnues[0]}`); }
        for (const c of colonnes) { const inconnues = lignes.filter((l) => caches.has(`${l},${c}`)); if (inconnues.length === 1) caches.delete(`${inconnues[0]},${c}`); }
      }
      expect(caches.size).toBe(0);
    }
  });

  it("impriment chaque exercice avec son corrigé", () => {
    for (const e of EXERCICES_DONNEES) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) {
      const html = htmlDonnees({ ...REGLAGES_DONNEES, exercice: e.id, classe }, 5);
      expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|Infinity/);
    }
    // Au CP, le diagramme est fait de cubes : une case par élève.
    expect(htmlDonnees({ ...REGLAGES_DONNEES, exercice: "lireDiagramme", classe: "CP" }, 1).match(/<rect /g)!.length).toBeGreaterThan(8);
  });
});
