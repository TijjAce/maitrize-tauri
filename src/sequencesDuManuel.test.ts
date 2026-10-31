import { describe, expect, it } from "vitest";
import cycle1 from "../src-tauri/referentiels/competences_cycle1_2025.json";
import cycle2 from "../src-tauri/referentiels/competences_cycle2.json";
import cycle3 from "../src-tauri/referentiels/competences_cycle3.json";
import { livreDe } from "./bibliothequeDemarches";
import { FAMILLES as FAMILLES_D_ATELIERS } from "./catalogueAteliers";
import { demarcheDe } from "./demarches";
import { planDesFeuilles, type Classe } from "./feuillesDesSequences";
import { programmationProposee } from "./programmation";
import { SEQUENCES_DU_MANUEL, type SequenceDuManuel } from "./sequencesDuManuel";
import { DOMAINES, PHASE_LA_MARTINIERE, classesDeLaDemarche, domaineDeLaDemarche, repereDeLaDemarche, sequencesToutesFaites } from "./sequencesToutesFaites";

/** Les compétences des programmes, avec leur niveau, telles que l'application les embarque. */
type Comp = { texte: string; niveau?: string | null };
type Ref = { domaines: { sousDomaines?: { competences?: Comp[]; competencesGenerales?: { competences?: Comp[] }[] }[] }[] };
const competencesDe = (refs: unknown[]) => refs.flatMap((r) => (r as Ref).domaines.flatMap((d) => (d.sousDomaines ?? []).flatMap((sd) =>
  [...(sd.competences ?? []), ...(sd.competencesGenerales ?? []).flatMap((cg) => cg.competences ?? [])])));
const competences = competencesDe([cycle2, cycle3]);
const deLaMaternelle = competencesDe([cycle1]);

const enMaternelle = (s: SequenceDuManuel) => s.demarche.famille === "Maternelle";

/** D'où elle vient, et ce que chaque séance promet. */
function sourceEtSeances(s: SequenceDuManuel) {
  const d = s.demarche;
  expect(demarcheDe(d.id)).toBe(d);
  // Le manuel et ses pages ; ce que Maitrize ajoute est dit.
  expect(d.source).toMatch(/Réussir mon CRPE.*Nathan.*sujet n° \d+.*p\. \d+-\d+/);
  expect(d.source).toMatch(/Maitrize/);
  // Chaque séance tient dans sa durée, et dit ce que les élèves sauront.
  expect(d.seances.length).toBeGreaterThan(1);
  for (const x of d.seances) {
    expect(x.objectifs, x.titre).toMatch(/^À la fin de cette séance/);
    expect(x.phases.length, x.titre).toBeGreaterThan(0);
    expect(x.phases.reduce((n, p) => n + (parseInt(p.duree, 10) || 0), 0), x.titre).toBe(x.duree);
  }
}

describe("les séquences d'après le manuel du CRPE de l'enseignant, une par sujet", () => {
  for (const s of SEQUENCES_DU_MANUEL.filter((x) => !enMaternelle(x))) {
    const { demarche: d, domaine } = s;
    it(`${d.nom} : d'où elle vient, sa classe, son domaine, ses séances`, () => {
      sourceEtSeances(s);
      const classes = classesDeLaDemarche(d);
      expect(classes.length, d.nom).toBeGreaterThan(0);
      expect(DOMAINES.map((x) => x.id)).toContain(domaine);
      expect(domaineDeLaDemarche(d)?.id).toBe(domaine);
      // La compétence qu'elle sert : une, et une seule, à chacune de ses classes.
      expect(d.visee, d.nom).toBeDefined();
      for (const niveau of d.visee!.niveaux ?? classes) {
        const trouvees = competences.filter((c) => (c.niveau ?? "") === niveau && d.visee!.intitule.test(c.texte));
        expect(trouvees.map((c) => c.texte), `${d.nom} au ${niveau}`).toHaveLength(1);
      }
      // Elle est parmi les séquences toutes faites de chacune de ses classes.
      for (const c of classes) expect(sequencesToutesFaites().some((x) => x.cle === `${d.id}:${c}`), `${d.id}:${c}`).toBe(true);
    });

    it(`${d.nom} : ses feuilles viennent des ateliers de Fabriquer, et ses séances les nomment`, () => {
      for (const classe of classesDeLaDemarche(d) as Classe[]) {
        const periode = repereDeLaDemarche(d.id, classe)?.periode ?? 3;
        const plan = planDesFeuilles(d.id, { classe, periode, competence: "" })!;
        expect(plan.materiel, d.nom).toHaveLength(d.seances.length);
        expect(plan.feuilles.length, d.nom).toBeGreaterThan(0);
        for (const f of plan.feuilles) {
          for (const g of [3, 11]) {
            const { html, refaire } = f.fabriquer(g);
            expect(html.length, f.titre).toBeGreaterThan(200);
            expect(refaire, `${f.titre} : l'atelier ${f.atelier} la refait`).toBeDefined();
          }
          if (f.atelier === "martiniere") continue;
          const texte = d.seances[f.seance].phases.map((p) => p.description).join(" ");
          expect(texte, `${d.nom}, séance ${f.seance + 1}`).toContain(`« ${f.titre} »`);
        }
      }
    });

    it(`${d.nom} : sa période, celle que le manuel donne, citée`, () => {
      for (const classe of classesDeLaDemarche(d) as Classe[]) {
        const repere = repereDeLaDemarche(d.id, classe);
        if (repere) expect(repere.raison).toMatch(/^Manuel « Réussir mon CRPE/);
      }
      // Le calcul mental en tête, d'elle-même ou d'office : jamais à moitié.
      const ouvertes = d.seances.filter((x) => x.phases[0]?.phase === PHASE_LA_MARTINIERE).length;
      expect([0, d.seances.length]).toContain(ouvertes);
    });
  }
});

describe("celles de grande section, rangées avec la maternelle", () => {
  const nomsDesAteliers = FAMILLES_D_ATELIERS.flatMap((f) => f.outils.map((o) => o.nom));
  for (const s of SEQUENCES_DU_MANUEL.filter(enMaternelle)) {
    const d = s.demarche;
    it(`${d.nom} : d'où elle vient, la compétence de 2025 qu'elle sert, son livre dans la bibliothèque`, () => {
      sourceEtSeances(s);
      expect(d.nom).toMatch(/\(GS\)$/);
      // Ni domaine ni classe du CP au CM2 : elle est dans le dossier de la grande section (31 octobre 2026).
      expect(s.domaine).toBeUndefined();
      expect(classesDeLaDemarche(d)).toEqual([]);
      expect(sequencesToutesFaites().filter((x) => x.demarche.id === d.id).map((x) => x.classe)).toEqual(["GS"]);
      for (const x of d.seances) expect(x.phases.some((p) => p.phase === PHASE_LA_MARTINIERE), x.titre).toBe(false);
      // Une compétence du programme de 2025, et une seule, en grande section.
      const trouvees = deLaMaternelle.filter((c) => c.niveau === "GS" && d.visee!.intitule.test(c.texte));
      expect(trouvees.map((c) => c.texte), d.nom).toHaveLength(1);
      // Une séquence du rayon de la maternelle, à la couleur de sa matière, avec son image.
      const l = livreDe(d);
      expect([l.rayon, l.sorte, l.matiere]).toEqual(["sequences:Maternelle", "sequence", s.matiere]);
      expect(l.icone).not.toBe("🧸");
      // La période que le manuel donne, citée, quand une séquence de grande section la prend.
      const p = programmationProposee({ niveau: "GS", competenceTitre: "" }, d.id);
      if (p?.periode) expect(p.raison).toMatch(/^Manuel « Réussir mon CRPE/);
    });

    it(`${d.nom} : son matériel, séance par séance, et les ateliers de Fabriquer qu'elle nomme`, () => {
      // En maternelle, pas de feuilles : le contexte d'une classe n'y sert pas.
      const plan = s.plan({ classe: "CP", periode: 3, competence: "" });
      expect(plan.feuilles).toEqual([]);
      expect(plan.materiel).toHaveLength(d.seances.length);
      const texte = d.seances.flatMap((x) => x.phases.map((p) => p.description)).join(" ");
      for (const [, nom] of texte.matchAll(/l'atelier « ([^»]+) » de Fabriquer/g)) {
        expect(nomsDesAteliers.some((n) => n.startsWith(nom)), nom).toBe(true);
      }
    });
  }
});
