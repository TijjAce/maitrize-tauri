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
        for (const graine of [1, 2, 3]) expect(f.fabriquer(graine).html.replace(/<svg[\s\S]*?<\/svg>/g, ""), `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object|\d,0+(?!\d)/);
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

describe("les grandeurs et mesures du cours moyen", () => {
  const GRANDEURS = MATHS.filter((c) => /^Grandeurs/.test(c.cible.sousDomaineTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, avec ses feuilles", () => {
    expect(GRANDEURS.length).toBe(44);
    const vues = new Set<string>();
    for (const { cible, classe } of GRANDEURS) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      expect(d.source, d.id).toMatch(/programme de mathématiques du cycle 3 \(2025\)/);
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} — ${f.titre}`).toBeLessThan(d.seances.length);
        for (const graine of [1, 2, 3]) {
          const { html } = f.fabriquer(graine);
          // Le texte, hors des dessins, dont les coordonnées s'écrivent « 35,0 ».
          expect(html.replace(/<svg[\s\S]*?<\/svg>/g, ""), `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object|\d,0+(?!\d)/);
          // Une feuille reprise du cycle 2 cite le programme du cycle 3.
          expect(html, `${d.id} — ${f.titre}`).not.toMatch(/cycle 2/);
        }
      }
    }
    expect(vues.size).toBe(10);
    const perimetre = GRANDEURS.find((c) => c.classe === "CM1" && /périmètre d.un polygone en utilisant/.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(perimetre.cible, REF).id).toBe("perimetre-cm1");
  });

  it("convertissent et calculent juste, les durées comprises", async () => {
    const { htmlGrandeursCM, EXERCICES_GRANDEURS } = await import("./grandeursCoursMoyen");
    const NOMBRE = String.raw`\d{1,3}(?:[   ]\d{3})*(?:,\d+)?`;
    const UNITE = "km|hm|dam|m|dm|cm|mm|t|kg|hg|dag|g|dg|cg|mg|hL|daL|L|dL|cL|mL|m²|dm²|cm²";
    const FACTEUR: Record<string, number> = { km: 1e3, hm: 1e2, dam: 10, m: 1, dm: 0.1, cm: 0.01, mm: 0.001, t: 1e6, kg: 1e3, hg: 1e2, dag: 10, g: 1, dg: 0.1, cg: 0.01, mg: 0.001,
      hL: 100, daL: 10, L: 1, dL: 0.1, cL: 0.01, mL: 0.001, "m²": 1, "dm²": 0.01, "cm²": 0.0001 };
    const lire = (t: string) => Number(t.replace(/[   ]/g, "").replace(",", "."));
    const secondes = (t: string) => { const m = /(?:(\d+) h)?\s?(?:(\d+) min)?\s?(?:(\d+) s)?/.exec(t.trim())!; return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0); };
    let verifies = 0;
    for (const classe of ["CM1", "CM2"] as const) for (const grandeur of ["longueur", "masse", "contenance"] as const) for (const { id } of EXERCICES_GRANDEURS) for (let g = 1; g <= 12; g++) {
      const corrige = htmlGrandeursCM({ classe, grandeur, exercices: [id], combien: 6 }, g).split('class="page corrige"')[1]
        .replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      for (const m of corrige.matchAll(new RegExp(String.raw`(?<![+−] |[\d,]|\d[   ])(${NOMBRE}) (${UNITE}) = (${NOMBRE}) (${UNITE})(?![A-Za-z\d²])`, "g"))) {
        verifies++;
        expect(lire(m[3]) * FACTEUR[m[4]], m[0]).toBeCloseTo(lire(m[1]) * FACTEUR[m[2]], 6);
      }
      for (const m of corrige.matchAll(/De ([\d hmins]+?) à ([\d hmins]+?) : .*?En tout : ([\d hmins]+?)(?= De |$)/g)) {
        verifies++;
        expect(secondes(m[3]), m[0]).toBe(secondes(m[2]) - secondes(m[1]));
      }
    }
    expect(verifies).toBeGreaterThan(500);
  });
});

describe("l'espace et la géométrie du cours moyen", () => {
  const GEOMETRIE = MATHS.filter((c) => /^Espace et géométrie/.test(c.cible.sousDomaineTitre ?? "") || /^Espace et géométrie/.test(c.cible.domaineTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, avec ses feuilles", () => {
    expect(GEOMETRIE.length).toBe(44);
    const vues = new Set<string>();
    for (const { cible, classe } of GEOMETRIE) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      expect(d.source, d.id).toMatch(/programme de mathématiques du cycle 3 \(2025\)/);
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const f of plan.feuilles) {
        expect(f.seance, `${d.id} — ${f.titre}`).toBeLessThan(d.seances.length);
        for (const graine of [1, 2, 3]) {
          const { html } = f.fabriquer(graine);
          expect(html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object/);
          expect(html, `${d.id} — ${f.titre}`).not.toMatch(/cycle 2/);
        }
      }
    }
    expect(vues.size).toBe(18);
    const symetrie = GEOMETRIE.find((c) => c.classe === "CM2" && /diagonale du quadrillage/.test(c.cible.competenceTitre ?? ""))!;
    expect(demarcheSuggeree(symetrie.cible, REF).id).toBe("symetrie-cm2");
  });

  it("connaît les onze patrons du cube et les faces opposées de chacun", async () => {
    const { PATRONS_DU_CUBE, facesDuPatron } = await import("./geometrieCoursMoyen");
    expect(PATRONS_DU_CUBE).toHaveLength(11);
    expect(new Set(PATRONS_DU_CUBE.map((p) => JSON.stringify(p))).size).toBe(11);
    for (const p of PATRONS_DU_CUBE) expect(new Set(facesDuPatron(p)).size, JSON.stringify(p)).toBe(6);
    // La croix : le carré du haut et celui du bas sont opposés.
    const croix = facesDuPatron([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]])!;
    expect(Number(croix[0]) + Number(croix[5])).toBe(7);
  });
});

describe("les données et les probabilités du cours moyen", () => {
  const DONNEES = MATHS.filter((c) => /gestion de données|probabilités/i.test(c.cible.competenceGeneraleTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, celles des livrets pour les probabilités", async () => {
    expect(DONNEES.length).toBe(18);
    const vues = new Set<string>();
    for (const { cible, classe } of DONNEES) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id, `${classe} — ${cible.competenceTitre}`).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      if (/probabilités/i.test(cible.competenceGeneraleTitre ?? "")) expect(d.source, d.id).toMatch(new RegExp(`Livret d'accompagnement de mathématiques du ${classe}.*séquence n° 3`));
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      for (const f of plan.feuilles) for (const graine of [1, 2, 3]) {
        const { html } = f.fabriquer(graine);
        expect(html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object|cycle 2/);
      }
    }
    expect(vues.size).toBe(4);
    // Le programme date le début des probabilités au CM2.
    const { periodeDeLaDemarche } = await import("./sequencesToutesFaites");
    expect(periodeDeLaDemarche("probabilites-cm2", "CM2")).toBe(2);
  });
});

describe("les mathématiques du cours moyen, en entier", () => {
  it("donnent à chaque compétence du CM1 et du CM2 une séquence propre au cours moyen", () => {
    expect(MATHS.length).toBeGreaterThan(200);
    for (const { cible, classe } of MATHS) {
      const d = demarcheSuggeree(cible, REF);
      expect(d.id === "calcul-mental-martiniere" || new RegExp(`-${classe.toLowerCase()}$`).test(d.id), `${classe} — ${cible.competenceTitre} : ${d.id}`).toBe(true);
    }
  });
});

const FRANCAIS = competences("Français");

describe("la grammaire, l'orthographe grammaticale et la conjugaison du cours moyen", () => {
  const LANGUE = FRANCAIS.filter((c) => /grammaire/i.test(c.cible.sousDomaineTitre ?? ""));

  it("donnent à chaque compétence une séquence de sa classe, bâtie sur le programme du cycle 3, avec ses feuilles", async () => {
    const { DEMARCHES_LANGUE_CM } = await import("./cycle3Langue");
    const { domaineDeLaDemarche } = await import("./sequencesToutesFaites");
    const { periodeProposee } = await import("./periodesProposees");
    expect(LANGUE.length).toBeGreaterThan(60);
    const vues = new Set<string>();
    for (const { cible, classe } of LANGUE) {
      const d = demarcheSuggeree(cible, REF);
      expect(DEMARCHES_LANGUE_CM.map((x) => x.id), `${classe} — ${cible.competenceTitre} : ${d.id}`).toContain(d.id);
      expect(d.id).toMatch(new RegExp(`-${classe.toLowerCase()}$`));
      expect(d.source).toMatch(/programme de français du cycle 3 \(2025\)/);
      if (vues.has(d.id)) continue;
      vues.add(d.id);
      const plan = planDesFeuilles(d.id, { classe, periode: 3, competence: cible.competenceTitre ?? "" })!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      expect(plan.feuilles.length, d.id).toBeGreaterThan(1);
      expect(Math.max(...plan.feuilles.map((f) => f.seance)), d.id).toBeLessThan(d.seances.length);
      for (const f of plan.feuilles) for (const graine of [1, 2, 3]) {
        const { html } = f.fabriquer(graine);
        expect(html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object|cycle 2/);
        expect(html, `${d.id} — ${f.titre}`).toContain('class="page corrige"');
      }
      expect(domaineDeLaDemarche(d)?.id, d.id).toBe("langue");
      // Aucun texte ne date la grammaire du cours moyen : Maitrize propose une période, et le dit.
      expect(periodeProposee(d.id, classe)?.raison, d.id).toMatch(/^Suggestion de Maitrize/);
    }
    // Chaque séquence répond à au moins une compétence.
    expect([...vues].sort()).toEqual(DEMARCHES_LANGUE_CM.map((x) => x.id).sort());
  });

  it("décomposent les formes verbales comme les exemples de réussite, et conjuguent juste", async () => {
    const { marques, conjugaisonCM, formesCM } = await import("./conjugaisonCM");
    expect(marques("chanter", "imparfait", 0)).toEqual({ radical: "chant", temps: "ai", personne: "s" });
    expect(marques("chanter", "imparfait", 3)).toEqual({ radical: "chant", temps: "i", personne: "ons" });
    expect(marques("finir", "futur", 0)).toEqual({ radical: "fini", temps: "r", personne: "ai" });
    expect(marques("chanter", "passeSimple", 0)).toEqual({ radical: "chant", temps: "ai", personne: "" });
    expect(marques("chanter", "passeSimple", 5)).toEqual({ radical: "chant", temps: "è", personne: "rent" });
    expect(marques("venir", "passeSimple", 2)).toEqual({ radical: "v", temps: "in", personne: "t" });
    expect(marques("venir", "passeSimple", 3)).toEqual({ radical: "v", temps: "în", personne: "mes" });
    expect(conjugaisonCM("appeler", "present")).toEqual(["j'appelle", "tu appelles", "il appelle", "nous appelons", "vous appelez", "ils appellent"]);
    expect(conjugaisonCM("nettoyer", "futur")[0]).toBe("je nettoierai");
    expect(conjugaisonCM("lever", "futur")[3]).toBe("nous lèverons");
    expect(conjugaisonCM("manger", "imparfait")[5]).toBe("ils mangeaient");
    expect(conjugaisonCM("commencer", "present")[3]).toBe("nous commençons");
    expect(formesCM("aller", "plusQueParfait")[5]).toBe("étaient allés");
    expect(formesCM("prendre", "passeSimple")).toEqual(["pris", "pris", "prit", "prîmes", "prîtes", "prirent"]);
    // Le futur des verbes en -é- s'écrit de deux façons depuis les rectifications de 1990 : on ne le donne pas.
    expect(() => formesCM("céder", "futur")).toThrow();
  });
});
