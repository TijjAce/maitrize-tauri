import { describe, expect, it } from "vitest";
import { NOMBRES_DE_10_A_20, planDixAVingt } from "./demarcheDixAVingt";
import { demarchesPour, demarcheDe } from "./demarches";
import { planDesFeuilles } from "./feuillesDesSequences";
import { htmlAbaque, htmlBilles, htmlSuite } from "./numerationCP";
import { repereDeLaDemarche } from "./sequencesToutesFaites";

describe("la connaissance des nombres de 10 à 20, d'après le manuel du CRPE de l'enseignant", () => {
  it("dit d'où elle vient, ce qui est ajouté, et sert la valeur des chiffres au CP, en période 2", () => {
    const d = demarcheDe("nombres-10-20-cp")!;
    expect(d).toBe(NOMBRES_DE_10_A_20);
    expect(d.nom).toBe("La connaissance des nombres de 10 à 20 (CP)");
    expect(d.source).toMatch(/Réussir mon CRPE.*Nathan.*p\. 40-43/);
    expect(d.source).toMatch(/séances 5 et 6 ajoutées par Maitrize/);
    expect(d.seances).toHaveLength(6);
    // La séance 4 du manuel : six phases, leur forme de travail, leur durée.
    const s4 = d.seances[3];
    expect(s4.phases.map((p) => p.phase)).toEqual(["Phase 1 – Collectif", "Phase 2 – Individuel", "Phase 3 – Collectif", "Phase 4 – Binômes", "Phase 5 – Binômes", "Phase 6 – Individuel"]);
    expect(s4.phases.map((p) => parseInt(p.duree, 10))).toEqual([5, 10, 2, 10, 5, 10]);
    expect(s4.objectifs).toMatch(/selon sa place/);
    // On la propose à côté de la séquence du livret, pour la valeur des chiffres au CP — pas au CE1.
    const cible = (niveau: string) => ({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes",
      competenceTitre: "Connaitre la valeur des chiffres en fonction de leur position (unités, dizaines).", niveau });
    expect(demarchesPour(cible("CP"), "", 2).map((x) => x.id)).toEqual(["nombres-livret-cp-59", "nombres-10-20-cp"]);
    expect(demarchesPour(cible("CE1"), "", 2).map((x) => x.id)).not.toContain("nombres-10-20-cp");
    // La période : celle que le manuel donne, citée.
    const repere = repereDeLaDemarche("nombres-10-20-cp", "CP")!;
    expect(repere.periode).toBe(2);
    expect(repere.raison).toMatch(/^Manuel « Réussir mon CRPE .+ : « avec des élèves de CP en période 2 »$/);
  });

  it("prend ses feuilles dans les ateliers de Fabriquer, et chacune s'y rouvre telle qu'elle est", () => {
    const plan = planDesFeuilles("nombres-10-20-cp", { classe: "CP", periode: 2 })!;
    expect(plan.materiel).toHaveLength(6);
    for (let s = 0; s < 6; s++) expect(plan.feuilles.some((f) => f.seance === s), `séance ${s + 1}`).toBe(true);
    expect(plan.feuilles.map((f) => `${f.seance + 1} ${f.atelier} ${f.titre}`)).toEqual([
      "1 billes Combien de billes ?", "1 billes Deux tas de billes",
      "2 billes Un paquet de dix", "2 cubes Lire les cubes, écrire le nombre",
      "3 suiteNombres De 10 à 16 : le nom et l'écriture",
      "4 billes Combien de billes ?", "4 billes Qui a gagné ?", "4 abaque L'abaque à deux tiges", "4 suiteNombres La frise jusqu'à 20",
      "5 suiteNombres Comparer et ranger de 10 à 20",
      "6 billes Évaluation — les nombres de 10 à 20",
    ]);
    // Les cubes jusqu'à 19 : « dix et quelques », pas les nombres jusqu'à 59 de la période 2.
    expect(plan.feuilles.find((f) => f.atelier === "cubes")!.fabriquer(1).refaire).toMatchObject({ cubes: { niveau: "cp-19" } });
    // Rouverte dans son atelier, avec ses réglages et son tirage, une feuille est la même.
    const refont: Record<string, (r: never, g: number) => string> = { billes: htmlBilles, abaque: htmlAbaque, suiteNombres: htmlSuite };
    for (const f of plan.feuilles.filter((x) => refont[x.atelier] && !/Évaluation/.test(x.titre))) {
      for (const g of [3, 8]) {
        const { html, refaire } = f.fabriquer(g);
        expect(Object.keys(refaire ?? {}), f.titre).toEqual([f.atelier]);
        expect(refont[f.atelier]((refaire as Record<string, never>)[f.atelier], g), f.titre).toBe(html);
      }
    }
    // L'évaluation n'est qu'à la séquence : aucun atelier ne la refait.
    expect(plan.feuilles.find((f) => /Évaluation/.test(f.titre))!.fabriquer(1).refaire).toBeUndefined();
    expect(plan.materiel[0]).toMatch(/les feuilles « Combien de billes \? » et « Deux tas de billes »\.$/);
    expect(plan.materiel[3]).toMatch(/« Combien de billes \? », « Qui a gagné \? », « L'abaque à deux tiges » et « La frise jusqu'à 20 »\.$/);
    expect(planDixAVingt().feuilles).toHaveLength(10);
  });

  it("nomme dans chaque séance les feuilles qu'elle donne", () => {
    const plan = planDesFeuilles("nombres-10-20-cp", { classe: "CP", periode: 2 })!;
    for (const f of plan.feuilles.filter((x) => !/Évaluation/.test(x.titre))) {
      const texte = NOMBRES_DE_10_A_20.seances[f.seance].phases.map((p) => p.description).join(" ");
      expect(texte, f.titre).toContain(`« ${f.titre} »`);
    }
  });
});
