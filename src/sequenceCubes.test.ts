import { describe, it, expect } from "vitest";
import { NIVEAUX_CUBES, REGLAGES_CUBES, reglagesCubesSurs, type IdNiveauCubes, type ReglagesCubes } from "./cubesNumeration";
import {
  DEMARCHE_CUBES, FEUILLES_DE_LA_SEQUENCE_CUBES, competencesProposees, htmlDeLaFeuilleCubes, materielDesSeancesCubes, objectifsDeLaSequenceCubes,
  reglagesDeLaFeuille, titreDeLaSequenceCubes,
} from "./sequenceCubes";
import { demarcheDe } from "./demarches";
import type { Referentiel } from "./api";

const r = (p: Partial<ReglagesCubes> = {}) => reglagesCubesSurs({ ...REGLAGES_CUBES, ...p });

// Les compétences de numération du programme de cycle 2, telles que le référentiel les range : une par classe.
const PROGRAMME: [string, string][] = [
  ["CP", "Comparer et dénombrer des collections en les organisant."],
  ["CP", "Construire des collections de cardinal donné."],
  ["CP", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre."],
  ["CP", "Connaitre la valeur des chiffres en fonction de leur position (unités, dizaines)."],
  ["CE1", "Dénombrer des collections en les organisant."],
  ["CE1", "Construire des collections de cardinal donné."],
  ["CE1", "Connaitre et utiliser la relation entre unités et dizaines, entre dizaines et centaines, entre unités et centaines."],
  ["CE1", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre."],
  ["CE2", "Dénombrer des collections."],
  ["CE2", "Construire des collections de cardinal donné."],
  ["CE2", "Connaitre et utiliser les relations entre les unités de numération."],
  ["CE2", "Connaitre et utiliser diverses représentations d’un nombre et passer de l’une à l’autre."],
];
const referentiel = (actif = true): Referentiel => ({
  id: "c2", nom: "Cycle 2 — Programme 2024", cycle: "Cycle 2", estIntegre: true, actif, dateAjout: "",
  donnees: JSON.stringify({ domaines: [{ id: "M", titre: "Mathématiques", sousDomaines: [{
    titre: "Nombres et calcul", competences: PROGRAMME.map(([niveau, texte], i) => ({ id: `n${i}`, texte, niveau })),
  }] }] }),
});
const proposees = (p: Partial<ReglagesCubes>, ailleurs = [] as ReturnType<typeof competencesProposees>) =>
  competencesProposees([referentiel()], r(p), ailleurs);
const intitules = (liste: ReturnType<typeof competencesProposees>) => liste.map((c) => `${c.niveau} ${c.competenceTitre.split(" ").slice(0, 4).join(" ")}`);

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

describe("ce que l'atelier des cubes propose de retenir", () => {
  it("propose les compétences de la classe choisie, jamais celles d'une autre", () => {
    expect(intitules(proposees({ niveau: "cp-19", exercice: "dessiner", aRegrouper: false })))
      .toEqual(["CP Connaitre et utiliser diverses", "CP Construire des collections de"]);
    expect(intitules(proposees({ niveau: "ce1", exercice: "dessiner", aRegrouper: false })))
      .toEqual(["CE1 Connaitre et utiliser diverses", "CE1 Construire des collections de"]);
    for (const niveau of NIVEAUX_CUBES) for (const exercice of ["ecrire", "relier", "dessiner", "facons"] as const) {
      const liste = proposees({ niveau: niveau.id, exercice });
      expect(liste.length, `${niveau.id} ${exercice}`).toBeGreaterThanOrEqual(2);
      expect(liste.every((c) => c.niveau === niveau.classe), `${niveau.id} ${exercice}`).toBe(true);
    }
  });

  it("dit ce que chaque exercice travaille, et les échanges quand on regroupe", () => {
    // Écrire le nombre d'une collection à regrouper : dénombrer, et la valeur des chiffres au CP…
    expect(intitules(proposees({ niveau: "cp-59", exercice: "ecrire", aRegrouper: true })))
      .toEqual(["CP Connaitre et utiliser diverses", "CP Comparer et dénombrer des", "CP Connaitre la valeur des"]);
    // … la relation entre les unités au CE1 et au CE2.
    expect(intitules(proposees({ niveau: "ce1", exercice: "ecrire", aRegrouper: true })))
      .toEqual(["CE1 Connaitre et utiliser diverses", "CE1 Dénombrer des collections en", "CE1 Connaitre et utiliser la"]);
    expect(intitules(proposees({ niveau: "ce2", exercice: "facons", aRegrouper: false })))
      .toEqual(["CE2 Connaitre et utiliser diverses", "CE2 Construire des collections de", "CE2 Connaitre et utiliser les"]);
    // Grouper des cubes en vrac pour les compter, c'est dénombrer.
    expect(intitules(proposees({ niveau: "cp-59", exercice: "grouper" })))
      .toEqual(["CP Connaitre et utiliser diverses", "CP Comparer et dénombrer des"]);
  });

  it("donne, à la classe choisie, l'équivalent de ce qu'on avait retenu à une autre", () => {
    // Une compétence du CE1 retenue pour l'atelier : au CP, c'est celle du CP qu'on propose.
    const duCe1 = proposees({ niveau: "ce1", exercice: "dessiner", aRegrouper: false })[1];
    expect(duCe1.niveau).toBe("CE1");
    const auCp = proposees({ niveau: "cp-19", exercice: "ecrire", aRegrouper: false }, [duCe1]);
    expect(intitules(auCp)).toEqual(["CP Connaitre et utiliser diverses", "CP Comparer et dénombrer des", "CP Construire des collections de"]);
    // Ce qui n'a pas d'équivalent ne s'invente pas.
    const ailleurs = { ...duCe1, competenceTitre: "Résoudre des problèmes en utilisant des nombres." };
    expect(proposees({ niveau: "cp-19", exercice: "ecrire", aRegrouper: false }, [ailleurs])).toHaveLength(2);
  });

  it("ne propose rien sans référentiel actif", () => {
    expect(competencesProposees([], r())).toEqual([]);
    expect(competencesProposees([referentiel(false)], r())).toEqual([]);
  });
});
