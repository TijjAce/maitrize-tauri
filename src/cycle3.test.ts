import { describe, expect, it } from "vitest";
import cycle3 from "../src-tauri/referentiels/competences_cycle3.json";
import { demarcheSuggeree, type CibleDemarche } from "./demarches";
import { classeDe, planDesFeuilles, type ClasseC3 } from "./feuillesDesSequences";

// Le cycle 3 de l'école — le CM1 et le CM2 —, demandé par l'enseignant (octobre 2026) : chaque compétence a sa séquence
// et ses feuilles, comme au cycle 2. Ces tests parcourent le référentiel entier de Maitrize.

const REF = cycle3.titre;

/** Le référentiel tel qu'on le lit : un sous-domaine range ses compétences par compétence générale. */
interface Referentiel3 {
  titre: string;
  domaines: { titre: string; sousDomaines: { titre: string; competencesGenerales?: { titre: string; competences: { texte: string; niveau: string }[] }[] }[] }[];
}
const REFERENTIEL = cycle3 as unknown as Referentiel3;

interface CompetenceDuReferentiel { cible: CibleDemarche; classe: ClasseC3 }

/** Les compétences d'une discipline du référentiel du cycle 3, avec leur sous-domaine et leur compétence générale. */
function competences(discipline: string): CompetenceDuReferentiel[] {
  const sortie: CompetenceDuReferentiel[] = [];
  for (const dom of REFERENTIEL.domaines) {
    if (dom.titre !== discipline) continue;
    for (const sd of dom.sousDomaines) {
      for (const cg of sd.competencesGenerales ?? []) {
        for (const c of cg.competences) {
          const classe = classeDe(c.niveau);
          if (classe !== "CM1" && classe !== "CM2") continue;
          sortie.push({
            classe,
            cible: { domaineTitre: dom.titre, sousDomaineTitre: sd.titre, competenceGeneraleTitre: cg.titre, competenceTitre: c.texte, niveau: c.niveau },
          });
        }
      }
    }
  }
  return sortie;
}

const MATHS = competences("Mathématiques");

describe("le calcul mental du cycle 3", () => {
  const CALCUL_MENTAL = MATHS.filter((c) => /calcul mental/i.test(c.cible.competenceGeneraleTitre ?? ""));

  it("donne à chaque compétence la séquence La Martinière, avec les objectifs de l'atelier qui la travaillent", () => {
    expect(CALCUL_MENTAL.length).toBe(29);
    for (const { cible, classe } of CALCUL_MENTAL) {
      const d = demarcheSuggeree(cible, REF);
      // Multiplier par 5 au CM1 a la séquence du livret d'accompagnement.
      if (classe === "CM1" && /multiplier un nombre entier par 5/i.test(cible.competenceTitre ?? "")) continue;
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toBe("calcul-mental-martiniere");
      const plan = planDesFeuilles(d.id, { classe, periode: 1, competence: cible.competenceTitre ?? "" });
      expect(plan?.feuilles.length, `${classe} — ${cible.competenceTitre}`).toBeGreaterThan(0);
      const premiere = plan!.feuilles[0].fabriquer(7);
      expect(premiere.html.length, `${classe} — ${cible.competenceTitre}`).toBeGreaterThan(200);
    }
  });
});

describe("les nombres du cours moyen : entiers, fractions, décimaux", () => {
  const NOMBRES = MATHS.filter((c) => /nombres entiers|fractions|nombres décimaux/i.test(c.cible.competenceGeneraleTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, qui dit sa source", () => {
    expect(NOMBRES.length).toBeGreaterThan(60);
    for (const { cible, classe } of NOMBRES) {
      for (const periode of [1, 3]) {
        const d = demarcheSuggeree(cible, REF, periode);
        expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
        expect(d.source, d.id).toMatch(/programme de mathématiques du cycle 3 \(2025\)|Livret d'accompagnement de mathématiques du CM2/);
      }
    }
    // Au CM1, la numération s'en tient à quatre chiffres pendant les deux premières périodes.
    const unites = NOMBRES.find((c) => c.classe === "CM1" && /relations entre les unités de numération/.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(unites.cible, REF, 1).id).toBe("numeration-cm1");
    expect(demarcheSuggeree(unites.cible, REF, 3).id).toBe("grands-nombres-cm1");
    // Au CM2, additionner des fractions : la séquence du livret.
    const operer = NOMBRES.find((c) => c.classe === "CM2" && /additionner et soustraire des fractions/i.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(operer.cible, REF).id).toBe("operer-fractions-cm2");
  });

  it("fabriquent leurs feuilles, sans nombre faux, avec leur corrigé", () => {
    const vues = new Set<string>();
    for (const { cible, classe } of NOMBRES) for (const periode of [1, 3]) {
      const d = demarcheSuggeree(cible, REF, periode);
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode, competence: cible.competenceTitre ?? "" })!;
      expect(plan.feuilles.length, d.id).toBeGreaterThan(0);
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const [k, f] of plan.feuilles.entries()) {
        for (const graine of [1, 2, 3]) {
          const { html } = f.fabriquer(graine + k);
          expect(html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object/);
          expect(f.seance, `${d.id} — ${f.titre}`).toBeLessThan(d.seances.length);
        }
      }
    }
    expect(vues.size).toBe(18);
  });
});

describe("le calcul du cours moyen : estimer, les parenthèses, le calcul posé", () => {
  const OPERATIONS = MATHS.filter((c) => /quatre opérations/i.test(c.cible.competenceGeneraleTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, avec ses feuilles justes", () => {
    expect(OPERATIONS.length).toBe(11);
    const vues = new Set<string>();
    for (const { cible, classe } of OPERATIONS) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const f of plan.feuilles) for (const graine of [1, 2]) expect(f.fabriquer(graine).html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity/);
    }
    expect(vues.size).toBe(8);
  });

  it("posent des divisions dont le corrigé est juste, la virgule du quotient comprise", async () => {
    const { htmlCalculCM, REGLAGES_CALCUL_CM } = await import("./calculCoursMoyen");
    for (const dividende of ["entier", "decimal"] as const) {
      for (let g = 1; g <= 40; g++) {
        const corrige = htmlCalculCM({ ...REGLAGES_CALCUL_CM, classe: "CM2", exercice: "division-decimale", combien: 4, posees: true, dividende }, g).split('class="page corrige"')[1];
        for (const m of corrige.matchAll(/<div class="cm-enligne">([^<]*) ÷ (\d) = <b>([^<]*)<\/b>/g)) {
          const nombre = (s: string) => Number(s.replace(/\s| | /g, "").replace(",", "."));
          expect(nombre(m[3]), m[0]).toBeCloseTo(nombre(m[1]) / Number(m[2]), 9);
        }
      }
    }
  });
});

describe("les problèmes, l'algèbre et la proportionnalité du cours moyen", () => {
  const PROBLEMES = MATHS.filter((c) => /résolution de problèmes|algèbre|proportionnalité/i.test(c.cible.competenceGeneraleTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, avec ses feuilles", () => {
    expect(PROBLEMES.length).toBe(30);
    const vues = new Set<string>();
    for (const { cible, classe } of PROBLEMES) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      expect(d.source, d.id).toMatch(/programme de mathématiques du cycle 3 \(2025\)|Livret d'accompagnement de mathématiques du CM[12]/);
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} — ${f.titre}`).toBeLessThan(d.seances.length);
        // Ni nombre faux, ni « 2,0 » : un entier s'écrit sans virgule.
        for (const graine of [1, 2, 3]) expect(f.fabriquer(graine).html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object|\d,0+(?!\d)/);
      }
    }
    expect(vues.size).toBe(17);
    // Les deux séquences des livrets : l'algèbre au CM1, la proportionnalité au CM2.
    const inconnu = PROBLEMES.find((c) => c.classe === "CM1" && /valeur d.un nombre inconnu/.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(inconnu.cible, REF).id).toBe("algebre-cm1");
    const resoudre = PROBLEMES.find((c) => c.classe === "CM2" && /résoudre un problème de proportionnalité/i.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(resoudre.cible, REF).id).toBe("proportionnalite-cm2");
  });

  it("écrivent au corrigé des calculs tous justes", async () => {
    const { problemesCM } = await import("./problemesCoursMoyen");
    const { htmlAlgebre, EXERCICES_ALGEBRE } = await import("./algebreCoursMoyen");
    const NOMBRE = String.raw`\d{1,3}(?:[   ]\d{3})*(?:,\d+)?`;
    const OPERATION = new RegExp(String.raw`(?<![\d,/(])(\(?${NOMBRE}(?:\s[+−×÷]\s\(?${NOMBRE}\)?)+)\s=\s(${NOMBRE})(?![\d/])`, "g");
    const lire = (t: string) => Number(t.replace(/[   ]/g, "").replace(",", "."));
    // a op b op c…, × et ÷ d'abord ; une parenthèse ouvrante se calcule en premier.
    const valeur = (expr: string): number => {
      const dedans = /\(([^()]*)\)/.exec(expr);
      if (dedans) return valeur(expr.replace(dedans[0], String(valeur(dedans[1])).replace(".", ",")));
      const morceaux = expr.trim().split(/\s([+−×÷])\s/);
      const termes: (number | string)[] = [lire(morceaux[0])];
      for (let i = 1; i < morceaux.length; i += 2) {
        const x = lire(morceaux[i + 1]);
        if (morceaux[i] === "×" || morceaux[i] === "÷") { const g = termes.pop() as number; termes.push(morceaux[i] === "×" ? g * x : g / x); } else termes.push(morceaux[i], x);
      }
      let v = termes[0] as number;
      for (let i = 1; i < termes.length; i += 2) v = termes[i] === "+" ? v + (termes[i + 1] as number) : v - (termes[i + 1] as number);
      return v;
    };
    let verifiees = 0;
    const verifier = (texte: string, ou: string) => {
      for (const m of texte.matchAll(OPERATION)) {
        verifiees++;
        expect(valeur(m[1]), `${ou} : ${m[0]}`).toBeCloseTo(lire(m[2]), 6);
      }
    };
    const sortes = ["partie-tout", "comparaison", "deux-etapes", "comparaison-deux-etapes", "parts-egales", "comparaison-multiplicative", "mixte",
      "denombrement", "optimisation", "algorithme", "proportionnalite", "proportionnalite-deux-etapes", "proportionnalite-additive", "proportionnalite-combinee"] as const;
    for (const classe of ["CM1", "CM2"] as const) {
      for (const sorte of sortes) for (let g = 1; g <= 25; g++) {
        for (const pb of problemesCM({ classe, sortes: [sorte], combien: 4 }, g)) verifier(pb.calcul, `${classe} ${sorte} ${g}`);
      }
      // Les égalités à trou se vérifient à part : leurs « … » comblés ne sont pas des calculs écrits.
      for (const { id } of EXERCICES_ALGEBRE.filter((e) => e.id !== "egalites")) for (let g = 1; g <= 25; g++) {
        const corrige = htmlAlgebre({ classe, exercices: [id], combien: 6 }, g).split('class="page corrige"')[1]
          .replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        verifier(corrige, `${classe} ${id} ${g}`);
      }
    }
    expect(verifiees).toBeGreaterThan(3000);
  });
});
