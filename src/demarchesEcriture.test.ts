import { describe, it, expect } from "vitest";
import { demarcheSuggeree } from "./demarches";
import { DEMARCHES_ECRITURE } from "./demarchesEcriture";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { A_TRANSFORMER, EXERCICES_ECRIRE, ORAL_ECRIT, REGLAGES_ECRIRE, htmlEcrire, relie, type Classe } from "./ecrire";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, competenceTitre: string) => ({ domaineTitre: "Français", sousDomaineTitre: "Écriture", competenceGeneraleTitre: "Produire des écrits", competenceTitre, niveau });

/** Les compétences « Produire des écrits » du référentiel. */
const COMPETENCES: [string, string, string][] = [
  ["CP", "Écrire des graphèmes, des syllabes, des mots puis quelques phrases avec l’aide du professeur à partir des mots connus et déchiffrés. Les activités de dictées à l’adulte sont poursuivies. (dès le début de l’année)", "ecrire-phrases-cp"],
  ["CP", "Produire des écrits courts porteurs de sens, d’une à cinq lignes, en articulation avec l’apprentissage de la lecture. (dès la 2e période)", "ecrire-phrases-cp"],
  ["CP", "S’appuyer sur les textes de lecture pour les transformer sur quelques points seulement (écrire à la façon de, ajouter un épisode, etc.). (dès la 2e période)", "transformer-un-texte-c2"],
  ["CP", "Produire des écrits courts porteurs de sens d’une à cinq lignes en articulation avec l’apprentissage de la lecture. (en fin d’année)", "ecrire-phrases-cp"],
  ["CP", "Commencer à acquérir une méthodologie de production écrite : planification, mise en mots avec vigilance orthographique, relectures et révisions. (en fin d’année)", "ecrire-un-texte-c2"],
  ["CP", "Repérer les dysfonctionnements de son texte par la relecture à voix haute du professeur ou grâce à des outils d’aide construits à cet effet. (en fin d’année)", "ecrire-un-texte-c2"],
  ["CE1", "Rédiger une phrase simple à partir d’une phrase prototypique, en changeant un puis plusieurs mots. (dès les premières semaines)", "phrase-prototypique-ce1"],
  ["CE1", "Écrire un texte court de une à trois phrases. (dès la période 1)", "phrase-prototypique-ce1"],
  ["CE1", "Insérer des connecteurs pour rendre cohérent l’enchainement de plusieurs phrases. (au cours des périodes 1 à 5)", "connecteurs-ce1"],
  ["CE1", "Retravailler un texte (issu de lecture et/ou d’écriture) en fonction d’une ou deux contraintes d’écriture. (au cours des périodes 1 à 5)", "transformer-un-texte-c2"],
  ["CE1", "Continuer à acquérir une méthodologie de production écrite : planification, mise en mots avec vigilance orthographique, révision après retours immédiats du professeur. (au cours des périodes 1 à 5)", "ecrire-un-texte-c2"],
  ["CE1", "Écrire un texte de six ou sept phrases maximum en assurant la cohérence syntaxique et logique du texte produit. (en fin d’année)", "ecrire-un-texte-c2"],
  ["CE2", "Développer tout au long de l’année les compétences qui lui permettront en fin d’année : d’écrire pour transmettre un message, une émotion, une information, etc., à un destinataire ; de rédiger quelques phrases qui permettent d’entrainer les automatismes appris en grammaire et orthographe ; d’écrire un texte d’une dizaine de lignes de différents types et relevant des différents enseignements : respecter la syntaxe, les règles orthographiques étudiées, réemployer un lexique précis et prendre en compte des contraintes d’écriture ; de relire son texte méthodiquement.", "ecrire-un-texte-c2"],
];
const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];

describe("produire des écrits : des séquences bâties sur le programme et les guides", () => {
  it("donnent à chaque compétence sa séquence", () => {
    for (const [niveau, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    for (const d of DEMARCHES_ECRITURE) expect(COMPETENCES.some((c) => c[2] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources, ont des séances bien formées et leurs feuilles", () => {
    for (const d of DEMARCHES_ECRITURE) {
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de français du cycle 2 \(2024\)/);
      expect(d.source, d.id).toContain("« La rédaction », p. 77-89");
      for (const s of d.seances) {
        expect(s.objectifs, `${d.id} · ${s.titre}`).toMatch(/^À la fin de cette séance, les élèves sauront /);
        expect(s.phases.length).toBeLessThanOrEqual(6);
        expect(s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0), `${d.id} · ${s.titre}`).toBeLessThanOrEqual(s.duree);
        for (const p of s.phases) expect(DUREES).toContain(parseInt(p.duree, 10));
      }
      const classes: ClasseC2[] = d.id.endsWith("-cp") ? ["CP"] : d.id.endsWith("-ce1") ? ["CE1"] : ["CP", "CE1", "CE2"];
      for (const classe of classes) {
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

describe("l'atelier « Écrire »", () => {
  it("imprime chaque feuille, à chaque classe", () => {
    for (const e of EXERCICES_ECRIRE) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const graine of [1, 2]) {
      const html = htmlEcrire({ ...REGLAGES_ECRIRE, exercice: e.id, classe }, graine);
      expect(html, `${e.id} ${classe}`).toMatch(/^<div class="feuille ec">/);
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|null/);
    }
  });

  it("reprend les exemples du programme et du guide, et élide « parce que »", () => {
    expect(A_TRANSFORMER.CP[0].texte).toBe("Jacques a un canari jaune.");
    expect(A_TRANSFORMER.CE1[0].exemple).toBe("Les grosses poules sont dans la cour de la maison.");
    expect(ORAL_ECRIT.find((x) => x.phrase === "Emma court. Lucie court.")!.ecrit).toBe("Emma et Lucie courent.");
    expect(relie("parce que", "Il a gagné la course.")).toBe("<b>parce qu'</b>il a gagné la course.");
    expect(relie("mais", "Il pleuvait.")).toBe("<b>mais</b> il pleuvait.");
    expect(htmlEcrire({ ...REGLAGES_ECRIRE, exercice: "manipulations" }, 1)).toContain("L&#39;élève trace un cercle dans la cour.");
  });
});
