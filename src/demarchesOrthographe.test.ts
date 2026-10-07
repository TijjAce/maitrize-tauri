import { describe, it, expect } from "vitest";
import { demarcheSuggeree } from "./demarches";
import { DEMARCHES_ORTHOGRAPHE } from "./demarchesOrthographe";
import { planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import {
  CHOIX_MULTIPLES, EXERCICES_ORTHOGRAPHE, LETTRES_MUETTES, PIEGEES, REGLAGES_ORTHOGRAPHE, VALEURS, choixDe, escalier, htmlOrthographe, motsDuTexte, phrasesDuTexte, signesDePonctuation, syllabesEcrites, type Classe,
} from "./orthographe";
import { hasard } from "./hasard";

const REF = "Cycle 2 — CP, CE1, CE2 (programmes 2026)";
const cible = (niveau: string, sd: string, cg: string, competenceTitre: string) => ({ domaineTitre: "Français", sousDomaineTitre: sd, competenceGeneraleTitre: cg, competenceTitre, niveau });

/** Les compétences « Encoder puis écrire sous dictée » et « Mémoriser l'orthographe des mots » du référentiel. */
const COMPETENCES: [string, string, string, string, string][] = [
  ["CP", "Écriture", "Encoder puis écrire sous dictée", "Encoder des syllabes simples puis des mots selon la progression des CGP. (dès le début de l’année)", "cgp-deux-jours-cp"],
  ["CP", "Écriture", "Encoder puis écrire sous dictée", "Écrire des mots dictés avec des lettres muettes apprises (mettre en relation des morphogrammes lexicaux et grammaticaux). (dès la fin de la 2e période)", "dictees-cp"],
  ["CP", "Écriture", "Encoder puis écrire sous dictée", "Écrire sous la dictée des mots et des phrases. (en fin d’année)", "dictees-cp"],
  ["CE1", "Écriture", "Encoder puis écrire sous dictée", "Orthographier correctement les mots fréquents, réguliers puis irréguliers.", "dictees-ce1"],
  ["CE1", "Écriture", "Encoder puis écrire sous dictée", "Réaliser des accords en genre et en nombre dans le groupe nominal (article, nom, adjectif) et dans le groupe verbal (marque de pluriel des verbes = nt).", "dictees-ce1"],
  ["CE2", "Écriture", "Encoder puis écrire sous dictée", "Orthographier correctement les mots fréquents, réguliers et irréguliers et des phrases selon les accords étudiés dans le cadre de dictées. (à la fin de l’année)", "dictees-ce2"],
  ["CP", "Vocabulaire", "Mémoriser l’orthographe des mots", "Mémoriser l’orthographe des mots réguliers fréquemment rencontrés et du lexique le plus couramment employé et pouvoir les écrire sous la dictée, en lien avec les correspondances graphophonémiques (CGP) étudiées.", "mots-frequents-c2"],
  ["CP", "Vocabulaire", "Mémoriser l’orthographe des mots", "Identifier et nommer les accents.", "accents-c2"],
  ["CP", "Vocabulaire", "Mémoriser l’orthographe des mots", "Connaitre la valeur sonore de certaines lettres (s – c – g) et la composition de certains graphèmes selon la lettre qui suit (an/am, en/em, on/om, in/im), en fonction du contexte et dans des mots fréquemment rencontrés.", "valeur-des-lettres-c2"],
  ["CP", "Vocabulaire", "Mémoriser l’orthographe des mots", "Être capable de comprendre la présence d’une lettre muette finale à l’aide d’un mot de la même famille : chat/chaton, gros/grossir, etc.", "familles-orthographe-c2"],
  ["CE1", "Vocabulaire", "Mémoriser l’orthographe des mots", "Mémoriser l’orthographe des mots réguliers et irréguliers fréquemment rencontrés et du lexique le plus couramment employé.", "mots-frequents-c2"],
  ["CE1", "Vocabulaire", "Mémoriser l’orthographe des mots", "Tenir compte des accents.", "accents-c2"],
  ["CE1", "Vocabulaire", "Mémoriser l’orthographe des mots", "Classer par analogie et mémoriser les mots les plus fréquents comportant des graphèmes à prononciation variable : s prononcé –ss ou –z, c prononcé –ss ou –k, g prononcé –j ou –g.", "valeur-des-lettres-c2"],
  ["CE1", "Vocabulaire", "Mémoriser l’orthographe des mots", "Être capable d’anticiper une lettre muette finale à l’aide d’un mot de la même famille : blanc/blanche, sang/sanguin, etc.", "familles-orthographe-c2"],
  ["CE2", "Vocabulaire", "Mémoriser l’orthographe des mots", "Écrire correctement sous la dictée les mots réguliers et irréguliers fréquemment rencontrés.", "mots-frequents-c2"],
  ["CE2", "Vocabulaire", "Mémoriser l’orthographe des mots", "Tenir compte des accents.", "accents-c2"],
  ["CE2", "Vocabulaire", "Mémoriser l’orthographe des mots", "S’appuyer sur des critères morphologiques (radical, préfixe et suffixe) et analogiques pour orthographier correctement les mots.", "familles-orthographe-c2"],
];
const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180];

describe("les dictées et l'orthographe des mots : des séquences bâties sur le programme et les guides", () => {
  it("donnent à chaque compétence sa séquence ; encoder selon la progression reste au livret", () => {
    for (const [niveau, sd, cg, titre, attendue] of COMPETENCES) expect(demarcheSuggeree(cible(niveau, sd, cg, titre), REF).id, `${niveau} — ${titre}`).toBe(attendue);
    for (const d of DEMARCHES_ORTHOGRAPHE) expect(COMPETENCES.some((c) => c[4] === d.id), d.id).toBe(true);
  });

  it("disent leurs sources, ont des séances bien formées et leurs feuilles à chaque classe et période", () => {
    for (const d of DEMARCHES_ORTHOGRAPHE) {
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de français du cycle 2 \(2024\)/);
      expect(d.source, d.id).toMatch(/guide « Pour enseigner la lecture et l'écriture au (CP|CE1) »/);
      for (const s of d.seances) {
        expect(s.objectifs, `${d.id} · ${s.titre}`).toMatch(/^À la fin de cette séance, les élèves sauront /);
        expect(s.phases.length).toBeLessThanOrEqual(6);
        expect(s.phases.reduce((t, p) => t + parseInt(p.duree, 10), 0), `${d.id} · ${s.titre}`).toBeLessThanOrEqual(s.duree);
        for (const p of s.phases) expect(DUREES).toContain(parseInt(p.duree, 10));
      }
      const classes: ClasseC2[] = d.id.endsWith("-cp") ? ["CP"] : d.id.endsWith("-ce1") ? ["CE1"] : d.id.endsWith("-ce2") ? ["CE2"] : ["CP", "CE1", "CE2"];
      for (const classe of classes) for (const periode of [1, 3, 5]) {
        const plan = planDesFeuilles(d.id, { classe, periode })!;
        expect(plan.materiel, d.id).toHaveLength(d.seances.length);
        for (const f of plan.feuilles) {
          expect(f.seance).toBeLessThan(d.seances.length);
          const html = f.fabriquer(2).html;
          expect(html, `${d.id} ${classe} · ${f.titre}`).toMatch(/^<div class="feuille or">/);
          expect(html, `${d.id} ${classe} · ${f.titre}`).not.toMatch(/NaN|undefined|null/);
        }
      }
    }
    // La dictée de mots du CP prend les mots du graphème de la période : de 4 en début d'année à 10 à la fin.
    const debut = planDesFeuilles("dictees-cp", { classe: "CP", periode: 1 })!.feuilles.find((f) => f.titre === "La dictée de mots")!.fabriquer(1).html;
    const fin = planDesFeuilles("dictees-cp", { classe: "CP", periode: 5 })!.feuilles.find((f) => f.titre === "La dictée de mots")!.fabriquer(1).html;
    expect(debut.split('class="page corrige"')[0].match(/class="or-num"/g)).toHaveLength(4);
    expect(fin.split('class="page corrige"')[0].match(/class="or-num"/g)!.length).toBeGreaterThanOrEqual(8);
  });
});

describe("l'atelier « Orthographe et dictées »", () => {
  it("compte comme le guide CP et monte l'escalier du guide CE1", () => {
    const t = "Assise sur le sable, Lisa lit le journal.";
    expect(motsDuTexte(t)).toHaveLength(8);
    expect(motsDuTexte("L'enfant joue.")).toHaveLength(3);
    expect(signesDePonctuation(t)).toBe(2);
    expect(phrasesDuTexte("Le chat dort. Il ronfle !")).toHaveLength(2);
    expect(escalier("escalier")).toEqual(["es", "esca", "escalier"]);
    expect(syllabesEcrites("maintenant")).toEqual(["main", "te", "nant"]);
    expect(syllabesEcrites("beaucoup")).toEqual(["beau", "coup"]);
  });

  it("a des données justes : une bonne forme par choix, des fausses dictées mot pour mot, des mots à leur son", () => {
    for (const classe of ["CP", "CE1", "CE2"] as Classe[]) {
      for (const p of CHOIX_MULTIPLES[classe]) {
        const { juste, html } = choixDe(p, hasard(1));
        expect(juste, p).not.toMatch(/[{}|]/);
        expect(html).toContain("or-choix");
      }
      for (const p of PIEGEES[classe]) {
        // Même nombre de mots : les erreurs se comptent mot à mot.
        expect(p.faux.split(" ").length, p.faux).toBe(p.juste.split(" ").length);
        expect(p.faux).not.toBe(p.juste);
      }
      for (const [mot, famille] of LETTRES_MUETTES[classe]) expect(famille.startsWith(mot.slice(0, -1)) || famille.startsWith(mot.slice(0, 3)), `${mot}/${famille}`).toBe(true);
    }
    // Un mot n'est jamais rangé sous deux sons.
    for (const l of ["s", "c", "g"] as const) {
      const [a, b] = VALEURS[l].sons;
      expect(a.mots.filter((m) => b.mots.includes(m)), l).toEqual([]);
    }
  });

  it("imprime chaque exercice, à chaque classe, avec son corrigé", () => {
    for (const e of EXERCICES_ORTHOGRAPHE) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const graine of [1, 2, 3]) {
      const html = htmlOrthographe({ ...REGLAGES_ORTHOGRAPHE, exercice: e.id, classe }, graine);
      expect(html, `${e.id} ${classe}`).toMatch(/^<div class="feuille or">/);
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined|null/);
      if (e.id !== "memoriser") expect(html, `${e.id} ${classe}`).toContain('class="page corrige"');
    }
    // Les mots de l'enseignant passent avant ceux de la classe.
    expect(htmlOrthographe({ ...REGLAGES_ORTHOGRAPHE, exercice: "dicteeDeMots", mots: "girafe\nguitare\npigeon\ngâteau" }, 1)).toContain("guitare");
    // La fausse dictée annonce le nombre d'erreurs et leur nature, sans dire où.
    expect(htmlOrthographe({ ...REGLAGES_ORTHOGRAPHE, exercice: "piegee", classe: "CE1" }, 1)).toMatch(/contient \d erreurs sur/);
  });
});
