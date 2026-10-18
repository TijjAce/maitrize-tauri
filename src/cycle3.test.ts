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
