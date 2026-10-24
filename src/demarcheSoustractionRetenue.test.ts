import { describe, expect, it } from "vitest";
import { SOUSTRACTION_AVEC_RETENUE } from "./demarcheSoustractionRetenue";
import { demarchesPour, demarcheDe } from "./demarches";
import { planDesFeuilles } from "./feuillesDesSequences";
import { PHASE_LA_MARTINIERE, planToutFait, repereDeLaDemarche, sequencesToutesFaites } from "./sequencesToutesFaites";

describe("la soustraction posée avec retenue, d'après le manuel du CRPE de l'enseignant", () => {
  it("dit d'où elle vient, ce qui est ajouté, et sert les opérations posées au CE1, en période 3", () => {
    const d = demarcheDe("soustraction-retenue-ce1")!;
    expect(d).toBe(SOUSTRACTION_AVEC_RETENUE);
    expect(d.nom).toBe("La soustraction posée avec retenue (CE1)");
    expect(d.source).toMatch(/Réussir mon CRPE.*Nathan.*sujet n° 2.*p\. 44-62/);
    expect(d.source).toMatch(/séances 1, 3 et 4 et le calcul mental en tête de chaque séance ajoutés par Maitrize/);
    expect(d.seances.map((s) => s.titre)).toEqual([
      "Des problèmes pour additionner ou soustraire", "Le problème des timbres : casser une dizaine", "Casser ou pas : s'entraîner", "Évaluation et remédiations",
    ]);
    // La séance du manuel : cinq phases, leur organisation, leur durée — le calcul mental en tête.
    const s2 = d.seances[1];
    expect(s2.phases.map((p) => p.phase)).toEqual([PHASE_LA_MARTINIERE, "Phase 2 – Groupes de 2 ou 3", "Phase 3 – Collectif", "Phase 4 – Collectif", "Phase 5 – Individuel"]);
    expect(s2.phases.map((p) => parseInt(p.duree, 10))).toEqual([10, 10, 5, 5, 10]);
    expect(s2.duree).toBe(40);
    expect(s2.phases[1].description).toMatch(/52 ; elle en donne 18/);
    expect(s2.phases[3].description).toMatch(/12 – 8 = 4 ; il reste 4 dizaines, 4 – 1 = 3/);
    expect(s2.phases[4].description).toMatch(/65 – 37/);
    // Chaque séance s'ouvre sur le calcul mental, et ses phases tiennent dans sa durée.
    for (const s of d.seances) {
      expect(s.phases[0].phase, s.titre).toBe(PHASE_LA_MARTINIERE);
      expect(s.phases.reduce((n, p) => n + parseInt(p.duree, 10), 0), s.titre).toBe(s.duree);
    }
    // On la propose après la séquence du programme, pour les opérations posées au CE1 — pas au CE2.
    const cible = (niveau: string) => ({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes",
      competenceTitre: "Poser et effectuer des additions et des soustractions en colonnes.", niveau });
    expect(demarchesPour(cible("CE1"), "", 3).map((x) => x.id)).toEqual(["posees-ce1", "soustraction-retenue-ce1"]);
    expect(demarchesPour(cible("CE2"), "", 3).map((x) => x.id)).not.toContain("soustraction-retenue-ce1");
    // La période : celle que le manuel donne, citée.
    const repere = repereDeLaDemarche("soustraction-retenue-ce1", "CE1")!;
    expect(repere.periode).toBe(3);
    expect(repere.raison).toMatch(/^Manuel « Réussir mon CRPE .+ p\. 56 : « La séquence se situe en période 3 »$/);
  });

  it("prend ses feuilles dans les ateliers de Fabriquer, le calcul mental de chaque séance d'abord", () => {
    const plan = planDesFeuilles("soustraction-retenue-ce1", { classe: "CE1", periode: 3 })!;
    expect(plan.feuilles.map((f) => `${f.seance + 1} ${f.atelier} ${f.titre}`)).toEqual([
      "1 martiniere Calcul mental — Tables d'addition, dans les deux sens",
      "1 partieTout Problèmes — le tout ou une partie", "1 posees Additions posées, avec retenue", "1 posees Soustractions posées, sans retenue",
      "2 martiniere Calcul mental — Tables d'addition, dans les deux sens", "2 posees Soustractions posées — casser une dizaine",
      "3 martiniere Calcul mental — Soustraire un nombre à un chiffre",
      "3 posees Soustractions à poser — casser ou pas ?", "3 partieTout Problèmes — chercher une partie",
      "4 martiniere Calcul mental — Ajouter ou soustraire des dizaines, des centaines entières",
      "4 posees Soustractions à poser — évaluation", "4 cubes Faire un nombre de plusieurs façons",
    ]);
    // Toutes se refont dans leur atelier (voir refaireDansLAtelier.test.ts) ; les nombres restent sous 100.
    for (const f of plan.feuilles) {
      const { refaire } = f.fabriquer(5);
      expect(refaire, f.titre).toBeDefined();
      if (f.atelier === "posees") expect((refaire as any).operationsPosees.chiffres, f.titre).toBe(2);
    }
    expect(plan.feuilles.find((f) => f.atelier === "cubes")!.fabriquer(1).refaire).toMatchObject({ cubes: { niveau: "ce1" } });
    // Chaque séance nomme les feuilles qu'elle donne ; le matériel aussi, sauf la fiche du calcul mental.
    for (const f of plan.feuilles.filter((x) => x.atelier !== "martiniere")) {
      const texte = SOUSTRACTION_AVEC_RETENUE.seances[f.seance].phases.map((p) => p.description).join(" ");
      expect(texte, f.titre).toContain(`« ${f.titre} »`);
      expect(plan.materiel[f.seance], f.titre).toContain(`« ${f.titre} »`);
    }
    expect(plan.materiel).toHaveLength(4);
    expect(plan.materiel[1]).toMatch(/^Les ardoises ; des jetons ; par groupe de 2 ou 3, cinq enveloppes fermées de dix timbres/);
    expect(plan.materiel.join(" ")).not.toMatch(/Calcul mental/);
  });

  it("se range parmi les séquences toutes faites du CE1, dans le calcul : la séance des mots, puis les quatre du manuel, avec ou sans le calcul mental", () => {
    const s = sequencesToutesFaites().find((x) => x.cle === "soustraction-retenue-ce1:CE1")!;
    expect(s.domaine.id).toBe("calcul");
    // Elle pose des problèmes : elle s'ouvre, comme toutes, sur la séance de leurs mots (voir motsDesProblemes.ts).
    const avec = planToutFait(SOUSTRACTION_AVEC_RETENUE, "CE1", 3);
    expect(avec.calculMental).toBe(true);
    expect(avec.demarche.seances.map((x) => x.titre)).toEqual(["Les mots des problèmes", ...SOUSTRACTION_AVEC_RETENUE.seances.map((x) => x.titre)]);
    expect(avec.demarche.seances.map((x) => x.duree)).toEqual([45, 45, 40, 45, 45]);
    // Sa feuille se fait à la création, d'après les énoncés ; le matériel l'annonce déjà, et les feuilles du manuel passent d'une séance.
    expect(avec.plan.materiel[0]).toContain("la feuille « Les mots des problèmes »");
    expect(avec.plan.feuilles.some((f) => f.seance === 0)).toBe(false);
    expect(avec.plan.feuilles.find((f) => f.atelier === "partieTout")!.seance).toBe(1);
    const sans = planToutFait(SOUSTRACTION_AVEC_RETENUE, "CE1", 3, { calculMental: false });
    expect(sans.calculMental).toBe(false);
    expect(sans.demarche.seances.map((x) => x.duree)).toEqual([45, 35, 30, 35, 35]);
    expect(sans.demarche.seances.every((x) => x.phases[0].phase !== PHASE_LA_MARTINIERE)).toBe(true);
    expect(sans.plan.feuilles.some((f) => f.atelier === "martiniere")).toBe(false);
  });
});
