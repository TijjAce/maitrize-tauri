import { describe, it, expect } from "vitest";
import { demarcheDe } from "./demarches";
import { ateliersRattaches, classeDe, feuilleRattachee, niveauDeComparer, niveauDesCubes, planDesFeuilles, type ClasseC2 } from "./feuillesDesSequences";
import { CLASSE_DES_DEMARCHES } from "./demarchesNumeration";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const comp = (niveau: string, competenceTitre: string, competenceRefId: string): CompetenceSelectionnee => ({
  id: competenceRefId, referentielNom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)", domaineId: "MA", domaineTitre: "Mathématiques",
  sousDomaineTitre: "Nombres, calcul et résolution de problèmes", competenceGeneraleTitre: "Les nombres entiers", competenceTitre, niveau, competenceRefId,
});

describe("les feuilles qu'une séquence pioche dans les ateliers", () => {
  it("donnent à chaque démarche de numération ses feuilles et son matériel, à la classe de la séquence", () => {
    for (const [id, classe] of Object.entries(CLASSE_DES_DEMARCHES)) for (const periode of [1, 2, 4]) {
      const plan = planDesFeuilles(id, { classe: classe as ClasseC2, periode })!;
      const d = demarcheDe(id)!;
      const quoi = `${id} · P${periode}`;
      expect(plan, quoi).not.toBeNull();
      expect(plan.materiel, quoi).toHaveLength(d.seances.length);
      expect(plan.materiel.every((m) => m.trim().length > 0), quoi).toBe(true);
      expect(plan.feuilles.length, quoi).toBeGreaterThanOrEqual(6);
      for (const f of plan.feuilles) {
        expect(f.seance, `${quoi} · ${f.titre}`).toBeLessThan(d.seances.length);
        const { html, style } = f.fabriquer(3);
        expect(html, `${quoi} · ${f.titre}`).toContain('<div class="feuille');
        expect(style, `${quoi} · ${f.titre}`).toContain(".feuille");
      }
    }
    expect(planDesFeuilles("eduscol-quatre-temps", { classe: "CP", periode: 2 })).toBeNull();
  });

  it("prend les nombres de la classe : au CP ceux de la période, au CE1 les centaines, au CE2 les milliers", () => {
    expect(niveauDesCubes("numeration-dizaine-cp", { classe: "CP", periode: 1 })).toBe("cp-19");
    expect(niveauDesCubes("numeration-dizaine-cp", { classe: "CP", periode: 2 })).toBe("cp-59");
    expect(niveauDesCubes("numeration-dizaine-cp", { classe: "CP", periode: 4 })).toBe("cp-100");
    // La séquence du livret garde ses nombres, quelle que soit la période.
    expect(niveauDesCubes("nombres-livret-cp-59", { classe: "CP", periode: 4 })).toBe("cp-59");
    expect(niveauDesCubes("groupements-ce1", { classe: "CE1", periode: 1 })).toBe("ce1");
    expect(niveauDesCubes("groupements-ce2", { classe: "CE2", periode: 3 })).toBe("ce2");
    expect(niveauDeComparer({ classe: "CP", periode: 1 })).toBe("cp-30");
    expect(niveauDeComparer({ classe: "CE2", periode: 1 })).toBe("ce2");
    // Les titres sont ceux de la classe : au CE1, on n'entoure pas des paquets de dix dans un tas en vrac.
    const titres = (id: string, classe: ClasseC2) => planDesFeuilles(id, { classe, periode: 3 })!.feuilles.map((f) => f.titre);
    expect(titres("numeration-dizaine-cp", "CP")).toContain("Grouper par dix, puis écrire le nombre");
    expect(titres("groupements-ce1", "CE1")).toContain("Écrire le nombre d'une collection");
    expect(titres("groupements-ce1", "CE1")).not.toContain("Grouper par dix, puis écrire le nombre");
    // La note du matériel nomme les feuilles comme elles s'impriment.
    const livret = planDesFeuilles("nombres-livret-ce2", { classe: "CE2", periode: 2 })!;
    expect(livret.materiel[1]).toContain("« Écrire le nombre d'une collection »");
    expect(livret.materiel[1]).toContain("gros cubes de mille");
  });

  it("lit la classe d'une compétence, et rien hors du cycle 2", () => {
    expect(classeDe("CE1")).toBe("CE1");
    expect(classeDe("ce2")).toBe("CE2");
    expect(classeDe("GS")).toBeNull();
    expect(classeDe(null)).toBeNull();
  });

  it("pioche les jeux rattachés à la compétence, pour tous les niveaux ou pour sa classe seulement", () => {
    const construire = comp("CP", "Construire des collections de cardinal donné.", "c2.MA.1.1.cp.02");
    const ailleurs = comp("CE2", "Construire des collections de cardinal donné.", "c2.MA.1.1.ce2.02");
    const liste = (...c: CompetenceSelectionnee[]) => JSON.stringify(c);
    const reglages: Record<string, string> = {
      "fabriquer:competences:nombres": liste(construire),
      "fabriquer:competences:oeilDeLynx:CP": liste(construire),
      // Rattaché au CE2 : pas au CP, même si la compétence s'appelle pareil.
      "fabriquer:competences:oie:CE2": liste(construire),
      // Un objectif qui n'est pas une classe — une procédure de calcul mental — vaut partout.
      "fabriquer:competences:martiniere:cp-complements-10": liste(construire),
      "fabriquer:competences:cubes:CE2": liste(ailleurs),
      "fabriquer:consigne:nombres": "Découpe les cartes.",
    };
    const trouves = ateliersRattaches(reglages, construire);
    expect(trouves.map((a) => a.atelier).sort()).toEqual(["martiniere", "nombres", "oeilDeLynx"]);
    expect(trouves.find((a) => a.atelier === "nombres")!.fabricable).toBe(true);
    expect(trouves.find((a) => a.atelier === "oeilDeLynx")!.fabricable).toBe(false);
    expect(ateliersRattaches(reglages, ailleurs).map((a) => a.atelier)).toEqual(["cubes"]);
  });

  it("fabrique la feuille d'un jeu rattaché, à la classe de la séquence quand il en a une", () => {
    const cubes = feuilleRattachee("cubes", 4, { classe: "CE1", periode: 2 })!;
    expect(cubes.seance).toBe(4);
    expect(cubes.titre).toBe("Nombres en cubes");
    // La légende du CE1 montre la plaque de cent.
    expect(cubes.fabriquer(1).html).toContain("= 100</span>");
    expect(feuilleRattachee("comparer", 2, { classe: "CP", periode: 2 })!.fabriquer(1).html).toContain('<div class="feuille');
    expect(feuilleRattachee("nombres", 0, null)!.fabriquer(1).html).toContain("Cartes des nombres");
    expect(feuilleRattachee("oeilDeLynx", 0, null)).toBeNull();
  });
});
