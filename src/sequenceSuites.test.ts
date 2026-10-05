import { describe, it, expect, vi, beforeEach } from "vitest";

const enregistres = { sequences: [] as any[], seances: [] as any[], feuilles: [] as any[] };
let compteur = 0;
vi.mock("./api", () => ({
  api: {
    sequenceSave: async (s: unknown) => { enregistres.sequences.push(s); },
    seanceSave: async (s: unknown) => { enregistres.seances.push(s); },
  },
  newId: () => `id-${++compteur}`,
  nowIso: () => "2026-10-05T08:00:00.000Z",
  anneeScolaireActuelle: () => "2026-2027",
  couleurPourMatiere: () => "green",
}));
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string) => {
    enregistres.feuilles.push({ atelier, titre, html, seanceId, sequenceId });
  },
}));
vi.mock("./vacances", () => ({ chargerVacances: async () => [], periodeDuJour: () => 2 }));

import type { Referentiel } from "./api";
import { REGLAGES_SUITES, reglagesSurs, type ReglagesSuites } from "./suitesImages";
import { DEBUT_OBJECTIF_SEANCE, demarcheDe } from "./demarches";
import {
  DEMARCHE_SUITES, FEUILLES_DE_LA_SEQUENCE, competenceDuProgramme, creerLaSequenceDeSuites, feuillesPour, materielDesSeances,
  objectifsDeLaSequence, titreDeLaSequence,
} from "./sequenceSuites";

const BONHOMME = [{ id: 3135, mot: "il neige" }, { id: 6627, mot: "on s'habille" }, { id: 24891, mot: "une boule de neige" }, { id: 3131, mot: "le bonhomme de neige" }];
const r = (m: Partial<ReglagesSuites> = {}) => reglagesSurs({ ...REGLAGES_SUITES, titre: "Le bonhomme de neige", etapes: BONHOMME, ...m });

const referentiel = (nom: string, actif: boolean): Referentiel => ({
  id: nom, nom, cycle: "Cycle 1", estIntegre: true, actif, dateAjout: "",
  donnees: JSON.stringify({ domaines: [{ id: "D5", titre: "5. Se repérer dans le temps et l'espace", sousDomaines: [{
    id: "D5.SD1", titre: "Se repérer dans le temps", competencesGenerales: [{ id: "D5.SD1.CG2", titre: "S'approprier la notion de chronologie", competences: [
      { id: `${nom}-PS-rituels`, texte: "Ordonner entre eux des moments rituels vécus.", niveau: "PS" },
      { id: `${nom}-PS`, texte: "Comprendre et restituer le déroulement d'évènements quotidiens au sein d'une histoire simple.", niveau: "PS" },
      { id: `${nom}-MS`, texte: "Restituer la chronologie des actions majeures d'une histoire simple.", niveau: "MS" },
      { id: `${nom}-GS`, texte: "Repérer les différentes étapes d'un processus ou d'un évènement vécu et les ordonner.", niveau: "GS" },
    ] }],
  }] }] }),
});

describe("la séquence pour ordonner et raconter", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("suit la démarche de maternelle : chaque feuille a sa séance, chaque séance sa note de matériel", () => {
    const d = demarcheDe(DEMARCHE_SUITES)!;
    expect(d.famille).toBe("Maternelle");
    expect(d.seances).toHaveLength(7);
    for (const f of FEUILLES_DE_LA_SEQUENCE) expect(f.seance).toBeLessThan(d.seances.length);
    for (const niveau of ["PS", "MS", "GS"] as const) expect(materielDesSeances(r({ niveau }))).toHaveLength(d.seances.length);
    for (const s of d.seances) expect(s.objectifs.startsWith(`${DEBUT_OBJECTIF_SEANCE} `)).toBe(true);
  });

  it("donne toutes ses feuilles dès qu'il y a deux images ; la grille seule sinon", () => {
    expect(feuillesPour(r()).map((f) => f.forme)).toEqual(["affichage", "bande", "colonnes", "bande", "evaluation"]);
    expect(feuillesPour(r({ etapes: [BONHOMME[0]] })).map((f) => f.forme)).toEqual(["evaluation"]);
  });

  it("se nomme d'après sa suite, et vise la chronologie avec les mots du temps de l'âge", () => {
    expect(titreDeLaSequence(r({ niveau: "MS" }))).toBe("Ordonner et raconter : le bonhomme de neige (MS)");
    expect(titreDeLaSequence(r({ titre: "" }))).toBe("Ordonner et raconter : une suite d'images (MS)");
    expect(objectifsDeLaSequence(r({ niveau: "GS" }))).toMatch(/^S'approprier la notion de chronologie : remettre dans l'ordre « Le bonhomme de neige » .*d'abord, ensuite, puis, enfin\. GS, à partir de 5 ans : /);
    expect(objectifsDeLaSequence(r({ niveau: "MS" }))).toContain("au début, ensuite, pour finir");
  });

  it("trouve la compétence de chronologie de chaque âge, dans le référentiel actif", () => {
    const refs = [referentiel("Cycle 1 — Programme 2025 (v2)", true)];
    expect(competenceDuProgramme(refs, "PS")!.competenceRefId).toBe("Cycle 1 — Programme 2025 (v2)-PS");
    expect(competenceDuProgramme(refs, "MS")!.competenceTitre).toBe("Restituer la chronologie des actions majeures d'une histoire simple.");
    expect(competenceDuProgramme(refs, "GS")!.competenceTitre).toMatch(/^Repérer les différentes étapes d'un processus/);
    expect(competenceDuProgramme([referentiel("Cycle 1 — Programme 2025", false)], "MS")).toBeNull();
  });

  it("crée la séquence, ses sept séances avec leur matériel, et range chaque feuille dans la sienne", async () => {
    const vise = competenceDuProgramme([referentiel("Cycle 1 — Programme 2025 (v2)", true)], "MS")!;
    const images = { 3135: "data:neige", 6627: "data:habiller", 24891: "data:boule", 3131: "data:bonhomme" };
    const { sequence, feuilles } = await creerLaSequenceDeSuites(r({ niveau: "MS" }), "", [vise], images);
    expect(sequence.titre).toBe("Ordonner et raconter : le bonhomme de neige (MS)");
    expect(sequence.matiere).toBe("5. Se repérer dans le temps et l'espace");
    expect(enregistres.seances).toHaveLength(7);
    expect(enregistres.seances.every((s) => s.materiel && s.competences.includes("chronologie"))).toBe(true);
    expect(feuilles).toBe(5);
    expect(enregistres.feuilles.every((f) => f.atelier === "suites" && f.sequenceId === sequence.id)).toBe(true);
    const dans = (i: number) => enregistres.feuilles.filter((f) => f.seanceId === enregistres.seances[i].id).map((f) => f.titre);
    expect(dans(0)).toEqual([]);
    expect(dans(1)).toEqual(["Les grandes images"]);
    expect(dans(2)).toEqual(["La bande fléchée"]);
    expect(dans(4)).toEqual(["La fiche en colonnes"]);
    expect(dans(5)).toEqual(["La bande fléchée — sans les mots"]);
    expect(dans(6)).toEqual(["La grille d'observation"]);
    // Sans les mots : ni mots du temps ni numéros près des cases.
    const sansMots = enregistres.feuilles.find((f) => f.titre.includes("sans les mots"))!.html;
    expect(sansMots).not.toContain("si-repere\">Au début");
    expect(sansMots).not.toContain("si-numero");
  });
});
