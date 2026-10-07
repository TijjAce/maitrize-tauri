import { describe, it, expect } from "vitest";
import { demarcheDe } from "./demarches";
import { planDesFeuilles } from "./feuillesDesSequences";
import { EXERCICES_VOIX_HAUTE, FABLE, PHRASES_DE_LA_CLASSE, REGLAGES_VOIX_HAUTE, avecLiaisons, htmlVoixHaute, liaison, liaisonsDe, phrasesDe, type Classe } from "./lectureVoixHaute";

describe("lire à voix haute", () => {
  it("code les liaisons comme les livrets : les‿endives sont‿amères, le petit‿éléphant a un gros‿appétit", () => {
    expect(liaisonsDe("Les endives sont amères.")).toEqual(["les‿endives", "sont‿amères"]);
    expect(liaisonsDe("Le petit éléphant a un gros appétit.")).toEqual(["petit‿éléphant", "gros‿appétit"]);
    expect(liaisonsDe("Les hirondelles reviennent au printemps.")).toEqual(["les‿hirondelles"]);
    expect(liaisonsDe("Mon ami a vu un âne et trois oies.")).toEqual(["mon‿ami", "un‿âne", "trois‿oies"]);
    // Pas de liaison devant « et », devant un h aspiré, ni par-dessus la ponctuation.
    expect(liaison("un", "et")).toBe(false);
    expect(liaison("les", "haricots")).toBe(false);
    expect(liaison("beau,", "il")).toBe(false);
    expect(avecLiaisons("Les endives sont amères.", true)).toContain('Les<span class="vh-liaison">‿</span>endives');
    // Chaque phrase de la classe se lit sans erreur, et les groupes de souffle disparaissent du texte lu.
    for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const p of PHRASES_DE_LA_CLASSE[classe]) expect(avecLiaisons(p, true)).not.toContain("|");
  });

  it("prend les phrases de l'enseignant, ou celles de la classe", () => {
    expect(phrasesDe({ ...REGLAGES_VOIX_HAUTE, phrases: "Une phrase.\n\nUne autre | phrase." }, 1)).toEqual(["Une phrase.", "Une autre | phrase."]);
    expect(phrasesDe({ ...REGLAGES_VOIX_HAUTE, classe: "CE1", combien: 4 }, 2)).toHaveLength(4);
  });

  it("imprime chaque exercice ; le corrigé suit quand l'élève code", () => {
    for (const e of EXERCICES_VOIX_HAUTE) for (const classe of ["CP", "CE1", "CE2"] as Classe[]) for (const codees of [true, false]) {
      const html = htmlVoixHaute({ ...REGLAGES_VOIX_HAUTE, exercice: e.id, classe, codees }, 3);
      expect(html, `${e.id} ${classe}`).not.toMatch(/NaN|undefined/);
      const corrige = html.includes('class="page corrige"');
      expect(corrige, `${e.id} ${classe} ${codees}`).toBe(!codees && !["grille", "fable", "lignes"].includes(e.id));
    }
    expect(FABLE).toHaveLength(14);
    expect(htmlVoixHaute({ ...REGLAGES_VOIX_HAUTE, exercice: "fable" }, 1)).toContain("Nenni.");
  });

  it("donne leurs feuilles aux séquences de prosodie et de lecture expressive", () => {
    for (const [id, classe] of [["prosodie-cp", "CP"], ["prosodie-ce1", "CE1"], ["lecture-expressive-ce2", "CE2"]] as const) {
      const plan = planDesFeuilles(id, { classe, periode: 2 })!;
      expect(plan.materiel, id).toHaveLength(demarcheDe(id)!.seances.length);
      expect(plan.feuilles.length, id).toBeGreaterThan(0);
      for (const f of plan.feuilles) expect(f.fabriquer(1).html, `${id} · ${f.titre}`).toMatch(/^<div class="feuille vh/);
    }
  });
});
