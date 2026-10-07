import { describe, it, expect } from "vitest";
import { demarcheSuggeree } from "./demarches";
import { DEMARCHES_ORAL } from "./demarchesOral";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { CRITERES, EXERCICES_ORAL, EXPRESSIONS, GENRES, POEMES, REGISTRES, REGLAGES_ORAL, htmlOral, type Classe } from "./oral";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, cg: string, competenceTitre: string) => ({ domaineTitre: "Français", sousDomaineTitre: "Oral", competenceGeneraleTitre: cg, competenceTitre, niveau });

/** Les seize compétences d'oral du référentiel. */
const COMPETENCES: [string, string, string, string][] = [
  ["CP", "Écouter pour comprendre", "Comprendre un message entendu de quelques minutes et mémoriser quelques informations importantes.", "ecouter-comprendre-c2"],
  ["CE1", "Écouter pour comprendre", "Maintenir une attention active pendant quelques minutes pour repérer, mémoriser, classer ou ordonner les informations importantes entendues à l’oral.", "ecouter-comprendre-c2"],
  ["CE2", "Écouter pour comprendre", "Repérer, mémoriser et relier entre elles plusieurs informations importantes pour construire la cohérence d’un message entendu de plus en plus long et complexe (5 minutes maximum), en évaluant son degré de compréhension.", "ecouter-comprendre-c2"],
  ["CP", "Dire pour être compris", "Mener une brève production orale pour rapporter, raconter, décrire ou expliquer, en utilisant quelques organisateurs du discours et en mobilisant le lexique appris.", "raconter-c2"],
  ["CP", "Dire pour être compris", "S’écouter pour progresser et proposer des reformulations.", "raconter-c2"],
  ["CP", "Dire pour être compris", "Oraliser un texte mémorisé ou préparé en tenant compte de son auditoire.", "dire-un-poeme-c2"],
  ["CE1", "Dire pour être compris", "Utiliser à l’oral l’ensemble des temps verbaux pour raconter, décrire, expliquer, comparer ou exposer.", "raconter-c2"],
  ["CE1", "Dire pour être compris", "Utiliser les critères définis pour évaluer sa prestation ou celle des autres et progresser dans la production de différents types de discours.", "expose-c2"],
  ["CE2", "Dire pour être compris", "Mener une production orale de plus en plus longue et structurée pour raconter, expliquer, argumenter, justifier.", "expose-c2"],
  ["CE2", "Dire pour être compris", "Maintenir l’intérêt de son auditoire lors des différentes prestations orales.", "expose-c2"],
  ["CP", "Participer à des échanges", "Participer aux échanges en respectant les règles, en écoutant les autres et en donnant son avis.", "echanger-c2"],
  ["CP", "Participer à des échanges", "Prendre conscience des écarts de niveau de langue selon les situations de communication.", "registres-c2"],
  ["CE1", "Participer à des échanges", "Respecter le propos au cours des échanges au sein d’un groupe.", "echanger-c2"],
  ["CE1", "Participer à des échanges", "Adapter le registre de langue utilisé (familier, courant, soutenu) à la situation de communication proposée : conversation entre pairs, dialogue avec un adulte connu, une personnalité inconnue, etc.", "registres-c2"],
  ["CE2", "Participer à des échanges", "Tenir compte de ce qui a déjà été dit lors des interventions au sein d’un groupe.", "echanger-c2"],
  ["CE2", "Participer à des échanges", "Utiliser un registre de langue et adopter des postures adaptées aux situations proposées (jeux de rôles).", "registres-c2"],
];
const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];

describe("l'oral : des séquences bâties sur le programme et la démarche d'Éduscol", () => {
  it("donnent à chaque compétence sa séquence", () => {
    for (const [niveau, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    for (const d of DEMARCHES_ORAL) expect(COMPETENCES.some((c) => c[3] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources, ont des séances bien formées et leurs feuilles à chaque classe", () => {
    for (const d of DEMARCHES_ORAL) {
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de français du cycle 2 \(2024\)/);
      if (d.id !== "ecouter-comprendre-c2") expect(d.source, d.id).toContain("« Organiser l'enseignement de l'oral »");
      for (const s of d.seances) {
        expect(s.objectifs, `${d.id} · ${s.titre}`).toMatch(/^À la fin de cette séance, les élèves sauront /);
        expect(s.phases.length).toBeLessThanOrEqual(6);
        expect(s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0), `${d.id} · ${s.titre}`).toBeLessThanOrEqual(s.duree);
        for (const p of s.phases) expect(DUREES).toContain(parseInt(p.duree, 10));
      }
      for (const classe of ["CP", "CE1", "CE2"] as ClasseC2[]) {
        const plan = planDesFeuilles(d.id, { classe, periode: 2 })!;
        expect(plan.materiel, d.id).toHaveLength(d.seances.length);
        expect(plan.feuilles.length).toBeGreaterThan(0);
        for (const f of plan.feuilles) {
          expect(f.seance).toBeLessThan(d.seances.length);
          const html = f.fabriquer(1).html;
          expect(html, `${d.id} ${classe} · ${f.titre}`).toMatch(/^<div class="feuille/);
          expect(html, `${d.id} ${classe} · ${f.titre}`).not.toMatch(/NaN|undefined|null/);
        }
      }
    }
  });
});

describe("l'atelier « Oral »", () => {
  it("imprime chaque feuille, pour chaque classe et chaque genre", () => {
    for (const e of EXERCICES_ORAL) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const g of GENRES) {
      const html = htmlOral({ ...REGLAGES_ORAL, exercice: e.id, classe, genre: g.id }, 2);
      expect(html, `${e.id} ${classe} ${g.id}`).toMatch(/^<div class="feuille ol">/);
      expect(html, `${e.id} ${classe} ${g.id}`).not.toMatch(/NaN|undefined|null/);
    }
  });

  it("reprend les expressions du programme et garde un registre par façon de dire", () => {
    expect(EXPRESSIONS.CP.slice(0, 2)).toEqual(["Je souhaite prendre la parole pour…", "Je suis d'accord…"]);
    expect(EXPRESSIONS.CE1.slice(0, 2)).toEqual(["Je ne suis pas d'accord avec…", "Je ne partage pas l'avis de…"]);
    expect(EXPRESSIONS.CE2.slice(0, 3)).toEqual(["Pour compléter ce qu'a dit…", "Je souhaite revenir sur ce qu'a dit…", "Pour reprendre les propos de…"]);
    for (const t of REGISTRES) expect(new Set(t).size).toBe(3);
    for (const g of GENRES) for (const c of ["CP", "CE1", "CE2"] as Classe[]) expect(CRITERES[g.id][c].length).toBeGreaterThanOrEqual(5);
    // Les poèmes : six vers au CP et au CE1 ; au CE2, le poème du texte à comprendre, ses strophes.
    expect(POEMES.CP.vers).toHaveLength(6);
    expect(POEMES.CE2.vers.filter((v) => v.trim())).toHaveLength(16);
    // Au CP, deux colonnes : la cour et la classe.
    expect(htmlOral({ ...REGLAGES_ORAL, exercice: "registres", classe: "CP" }, 1)).toContain("Dans la cour");
  });
});
