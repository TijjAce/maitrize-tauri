import { describe, expect, it } from "vitest";
import { DEMARCHES_REPERAGE, demarcheDuReperage, planDuReperage } from "./demarchesReperage";
import { htmlReperage, ordinalEnLettres, type ExerciceReperage } from "./reperageNombres";
import { periodeDeLaDemarche } from "./sequencesToutesFaites";
import { periodeProposee } from "./periodesProposees";

describe("la demi-droite graduée et les nombres ordinaux du cycle 2", () => {
  it("écrivent les ordinaux comme on les écrit : troisième, cinquième, neuvième, vingt et unième, quatre-vingtième", () => {
    const attendus: [number, string][] = [
      [1, "premier"], [2, "deuxième"], [3, "troisième"], [4, "quatrième"], [5, "cinquième"], [6, "sixième"], [9, "neuvième"], [11, "onzième"],
      [17, "dix-septième"], [20, "vingtième"], [21, "vingt et unième"], [48, "quarante-huitième"], [71, "soixante et onzième"], [80, "quatre-vingtième"],
      [81, "quatre-vingt-unième"], [89, "quatre-vingt-neuvième"], [100, "centième"],
    ];
    for (const [n, mot] of attendus) expect(ordinalEnLettres(n), String(n)).toBe(mot);
  });

  it("donnent à chaque compétence la séquence de sa classe", () => {
    expect(demarcheDuReperage("cp", "savoir placer des nombres sur une demi-droite graduee de un en un.")).toBe("demi-droite-cp");
    expect(demarcheDuReperage("ce2", "savoir placer des nombres sur une demi-droite graduee.")).toBe("demi-droite-ce2");
    expect(demarcheDuReperage("cp", "reperer un rang ou une position dans une file orientee ou dans une liste d’objets ou de personnes.")).toBe("ordinaux-cp");
    expect(demarcheDuReperage("ce1", "connaitre les nombres ordinaux jusqu’a cent.")).toBe("ordinaux-ce1");
    expect(demarcheDuReperage("ce2", "connaitre les nombres ordinaux.")).toBeNull();
    expect(demarcheDuReperage("cm1", "placer des nombres sur une demi-droite graduee")).toBeNull();
  });

  it("ont, à chaque séance, leurs feuilles et leur matériel, avec un corrigé et des consignes à la première personne", () => {
    expect(DEMARCHES_REPERAGE.map((d) => d.id)).toEqual(["demi-droite-cp", "demi-droite-ce1", "demi-droite-ce2", "ordinaux-cp", "ordinaux-ce1"]);
    for (const d of DEMARCHES_REPERAGE) {
      expect(d.nom, d.id).toMatch(/\((CP|CE1|CE2)\)$/);
      expect(d.source, d.id).toMatch(/^Bâtie sur le programme de mathématiques du cycle 2 \(2024\)/);
      const plan = planDuReperage(d.id)!;
      expect(plan.materiel.length, d.id).toBe(d.seances.length);
      // Chaque séance a au moins une feuille, sauf aucune ; la dernière est l'évaluation.
      for (let s = 0; s < d.seances.length; s++) expect(plan.feuilles.some((f) => f.seance === s), `${d.id} — séance ${s + 1}`).toBe(true);
      expect(d.seances[d.seances.length - 1].titre, d.id).toBe("Évaluation");
      for (const f of plan.feuilles) {
        for (const graine of [1, 2, 3]) {
          const { html } = f.fabriquer(graine);
          expect(html, `${d.id} — ${f.titre}`).not.toMatch(/NaN|undefined|Infinity|\[object/);
          expect(html, `${d.id} — ${f.titre}`).toContain('class="page corrige"');
          for (const consigne of html.match(/<div class="regle">[^<]*/g) ?? []) expect(consigne.replace('<div class="regle">', ""), `${d.id} — ${f.titre}`).toMatch(/^(Je |J'|La |Les |Vingt |Dans )/);
        }
      }
      // Une période pour le tableau des séquences : citée, ou proposée par Maitrize.
      const classe = d.id.endsWith("cp") ? "CP" : d.id.endsWith("ce1") ? "CE1" : "CE2";
      expect(periodeDeLaDemarche(d.id, classe) ?? periodeProposee(d.id, classe)?.periode, d.id).toBeGreaterThan(0);
    }
  });

  it("corrigent juste : les nombres des points, le pas, les rangs et les termes des suites", () => {
    const corrige = (exercice: ExerciceReperage, classe: "CP" | "CE1" | "CE2", graine = 4) => htmlReperage({ exercice, classe }, graine).split('class="page corrige"')[1];
    // Le pas d'une portion de demi-droite se lit dans le corrigé : un, dix, cent ou mille.
    expect(corrige("dd-pas", "CE2")).toMatch(/Le pas : <b>(1|10|100|1 000)<\/b>/);
    // Les suites du programme : la dix-neuvième lettre de ABAB… est A, le septième nombre de 1, 3, 5… est 13.
    for (let g = 1; g <= 6; g++) {
      const html = corrige("ord-suites", "CP", g);
      if (/dix-neuvième lettre/.test(html)) expect(html).toMatch(/dix-neuvième lettre \?[\s\S]*?Réponse : <b>A<\/b>/);
      if (/septième nombre/.test(html)) expect(html).toMatch(/septième nombre \?[\s\S]*?Réponse : <b>13<\/b>/);
    }
    // Les suites évolutives : le onzième nombre de 1, 2, 4, 7, 11, 16… est 56 ; le neuvième de 1, 2, 4, 8, 16… est 256.
    const evolutives = corrige("ord-suites-evolutives", "CE1");
    expect(evolutives).toMatch(/onzième nombre \?[\s\S]*?Réponse : <b>56<\/b>/);
    expect(evolutives).toMatch(/neuvième nombre \?[\s\S]*?Réponse : <b>256<\/b>/);
    expect(evolutives).toMatch(/vingtième symbole \?[\s\S]*?Réponse : <b>la croix<\/b>/);
    // Un problème de rang du CE1 : avant le quarante-huitième, quarante-sept.
    const devant = corrige("ord-devant", "CE1", 1);
    const m = devant.match(/avant le ([a-zé -]+) coureur \?<div class="rp-reponse">(\d+) cyclistes/);
    if (m) expect(ordinalEnLettres(Number(m[2]) + 1)).toBe(m[1]);
  });
});
