import { describe, it, expect } from "vitest";
import { NIVEAUX_CUBES, REGLAGES_CUBES, reglagesCubesSurs, type IdNiveauCubes, type ReglagesCubes } from "./cubesNumeration";
import {
  DEMARCHE_CUBES, FEUILLES_DE_LA_SEQUENCE_CUBES, htmlDeLaFeuilleCubes, materielDesSeancesCubes, objectifsDeLaSequenceCubes, reglagesDeLaFeuille,
  titreDeLaSequenceCubes,
} from "./sequenceCubes";
import { demarcheDe } from "./demarches";

const r = (p: Partial<ReglagesCubes> = {}) => reglagesCubesSurs({ ...REGLAGES_CUBES, ...p });

describe("la séquence des nombres en cubes", () => {
  it("met au moins une feuille dans chacune des sept séances de la démarche, à chaque niveau", () => {
    const demarche = demarcheDe(DEMARCHE_CUBES)!;
    expect(demarche.seances).toHaveLength(7);
    for (let i = 0; i < demarche.seances.length; i++) expect(FEUILLES_DE_LA_SEQUENCE_CUBES.some((f) => f.seance === i), `séance ${i + 1}`).toBe(true);
    for (const niv of NIVEAUX_CUBES) for (const f of FEUILLES_DE_LA_SEQUENCE_CUBES) {
      expect(htmlDeLaFeuilleCubes(f.quoi, r({ niveau: niv.id }), 3), `${niv.id} ${f.quoi}`).toContain('<div class="feuille');
    }
  });

  it("donne à chaque séance sa feuille : en vrac au CP, toute à regrouper, dans tous les sens", () => {
    expect(reglagesDeLaFeuille("grouper", r({ niveau: "cp-59" })).reglages.exercice).toBe("grouper");
    // De grands tas, comme ceux du défi : au moins jusqu'à 59, même en début d'année.
    expect(reglagesDeLaFeuille("grouper", r({ niveau: "cp-30" })).reglages.niveau).toBe("cp-59");
    expect(reglagesDeLaFeuille("grouper", r({ niveau: "cp-100" })).reglages.niveau).toBe("cp-100");
    // Des centaines de cubes ne se sèment pas : au CE1, on écrit le nombre d'une collection.
    expect(reglagesDeLaFeuille("grouper", r({ niveau: "ce1" })).reglages.exercice).toBe("ecrire");
    expect(reglagesDeLaFeuille("regrouper", r()).part).toBe(1);
    const unites = reglagesDeLaFeuille("unites", r()).reglages;
    expect([unites.exercice, unites.aRegrouper, unites.desordre]).toEqual(["dessiner", true, true]);
    // La feuille garde le niveau et les couleurs de l'atelier.
    const garde = reglagesDeLaFeuille("ecrire", r({ niveau: "ce2", memeCouleur: true })).reglages;
    expect([garde.niveau, garde.memeCouleur]).toEqual(["ce2", true]);
    expect(htmlDeLaFeuilleCubes("affiche", r({ niveau: "cp-30" }), 1)).toContain("Ce qu'on retient — les nombres en cubes");
  });

  it("dit ce qu'elle vise et ce qu'il faut préparer, aux nombres de la classe", () => {
    const cas: [IdNiveauCubes, string][] = [["cp-100", "jusqu'à 100 (CP)"], ["ce1", "jusqu'à 1 000 (CE1)"], ["ce2", "jusqu'à 10 000 (CE2)"]];
    for (const [niveau, fin] of cas) expect(titreDeLaSequenceCubes(r({ niveau })).replace(/\u202f/g, " ")).toContain(fin);
    expect(objectifsDeLaSequenceCubes(r({ niveau: "ce1" }))).toContain("centaines, dizaines et unités");
    expect(materielDesSeancesCubes(r())).toHaveLength(7);
    expect(materielDesSeancesCubes(r({ niveau: "cp-30" }))[1]).toContain("cubes emboîtables d'une seule couleur");
    expect(materielDesSeancesCubes(r({ niveau: "ce1" }))[0]).toContain("plaques de cent");
  });
});
