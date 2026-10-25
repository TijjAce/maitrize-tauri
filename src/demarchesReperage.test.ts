import { describe, expect, it } from "vitest";
import { DEMARCHES_REPERAGE, demarcheDuReperage, planDuReperage } from "./demarchesReperage";
import { htmlReperage, ordinalEnLettres, reglagesReperageSurs, titreReperage, type ExerciceReperage } from "./reperageNombres";
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
        // Chaque feuille vient de son atelier de Fabriquer, qui la refait telle qu'elle est.
        expect(f.atelier, `${d.id} — ${f.titre}`).toBe(d.id.startsWith("ordinaux") ? "ordinaux" : "demiDroite");
        for (const graine of [1, 2, 3]) {
          const { html, refaire } = f.fabriquer(graine);
          expect(htmlReperage((refaire as Record<string, never>)[f.atelier], graine), `${d.id} — ${f.titre}`).toBe(html);
          expect(html, `${d.id} — ${f.titre}`).toContain(`<div class="titre">${f.titre}</div>`);
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

  it("ont leurs deux ateliers dans Fabriquer, qui ne gardent que ce qui a cours à la classe", () => {
    // Les ordinaux s'arrêtent au CE1 ; le pas de la graduation commence au CE1 ; les gobelets sont du CP, les suites qui grandissent du CE1.
    expect(reglagesReperageSurs("ordinaux", { classe: "CE2", exercice: "ord-liste" })).toMatchObject({ classe: "CP", exercice: "ord-liste" });
    expect(reglagesReperageSurs("demiDroite", { classe: "CP", exercice: "dd-pas" })).toMatchObject({ classe: "CP", exercice: "dd-unites" });
    expect(reglagesReperageSurs("ordinaux", { classe: "CE1", exercice: "ord-gobelets" }).exercice).toBe("ord-file");
    expect(reglagesReperageSurs("ordinaux", { classe: "CP", exercice: "ord-suites-evolutives" }).exercice).toBe("ord-file");
    expect(reglagesReperageSurs("demiDroite", { exercice: "ord-file" as never }).exercice).toBe("dd-unites");
    // Le titre qu'on écrit remplace celui de l'exercice, sur la feuille et sur son corrigé.
    const r = reglagesReperageSurs("ordinaux", { classe: "CE1", exercice: "ord-file", titre: "La course de jeudi" });
    expect(titreReperage(r)).toBe("La course de jeudi");
    const html = htmlReperage(r, 2);
    expect(html).toContain('<div class="titre">La course de jeudi</div>');
    expect(html).toContain('<div class="titre">La course de jeudi — corrigé</div>');
    expect(titreReperage(reglagesReperageSurs("ordinaux", { classe: "CP" }))).toBe("Le train et ses wagons");
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

describe("les ordinaux du CP", () => {
  it("ne cachent jamais deux jetons sous le même gobelet", () => {
    for (let graine = 1; graine <= 400; graine++) {
      const html = htmlReperage({ exercice: "ord-gobelets", classe: "CP" }, graine);
      const g = /sous le (\S+) gobelet en partant de la gauche/.exec(html)![1];
      const d = /sous le (\S+) gobelet en partant de la droite/.exec(html)![1];
      const rang = (mot: string) => Array.from({ length: 12 }, (_, i) => i + 1).find((n) => ordinalEnLettres(n) === mot)!;
      expect(rang(g), `graine ${graine}`).not.toBe(11 - rang(d));
    }
  });

  it("accordent « personne » et « enfant » au singulier", () => {
    for (let graine = 1; graine <= 300; graine++) {
      const html = htmlReperage({ exercice: "ord-devant", classe: "CP" }, graine);
      expect(html, `graine ${graine}`).not.toMatch(/\b1 (personnes|enfants)\b/);
    }
  });
});
