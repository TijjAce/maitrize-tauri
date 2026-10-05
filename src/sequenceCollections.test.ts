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
  couleurPourMatiere: () => "orange",
}));
vi.mock("./impressionAtelier", () => ({
  poserDansUneSeance: async (atelier: string, titre: string, html: string, _style: string, seanceId: string, sequenceId: string) => {
    enregistres.feuilles.push({ atelier, titre, html, seanceId, sequenceId });
  },
}));
vi.mock("./vacances", () => ({ chargerVacances: async () => [], periodeDuJour: () => 1 }));

import type { Referentiel } from "./api";
import { REGLAGES_COLLECTIONS, reglagesDuNiveau, reglagesSurs, type ReglagesCollections } from "./collections";
import { DEBUT_OBJECTIF_SEANCE, demarcheDe } from "./demarches";
import {
  DEMARCHE_COLLECTIONS, FEUILLES_DE_LA_SEQUENCE, competenceDuProgramme, creerLaSequenceDeCollections, feuillesPour, materielDesSeances,
  objectifsDeLaSequence, titreDeLaSequence,
} from "./sequenceCollections";

const r = (niveau: ReglagesCollections["niveau"], m: Partial<ReglagesCollections> = {}) =>
  reglagesSurs({ ...REGLAGES_COLLECTIONS, niveau, ...reglagesDuNiveau(niveau), ...m });

const referentiel = (nom: string, actif: boolean): Referentiel => ({
  id: nom, nom, cycle: "Cycle 1", estIntegre: true, actif, dateAjout: "",
  donnees: JSON.stringify({ domaines: [{ id: "D4", titre: "4. Acquérir les premiers outils mathématiques", sousDomaines: [{
    id: "D4.SD1", titre: "Découvrir les nombres", competencesGenerales: [{ id: "D4.SD1.CG1", titre: "Exprimer une quantité par un nombre", competences: [
      { id: `${nom}-PS-d`, texte: "Dénombrer une collection d'objets (jusqu'à trois voire quatre", niveau: "PS" },
      { id: `${nom}-PS`, texte: "Constituer une collection (jusqu'à trois, voir quatre objets) d'un cardinal donné", niveau: "PS" },
      { id: `${nom}-MS`, texte: "Constituer une collection d'un cardinal donné (jusqu'à six objets)", niveau: "MS" },
      { id: `${nom}-GS`, texte: "Constituer une collection d'un cardinal donné (jusqu'à 10, voir au-delà)", niveau: "GS" },
    ] }],
  }] }] }),
});

describe("la séquence pour construire des collections", () => {
  beforeEach(() => { enregistres.sequences = []; enregistres.seances = []; enregistres.feuilles = []; });

  it("suit la démarche de maternelle : chaque feuille a sa séance, chaque séance sa note de matériel", () => {
    const d = demarcheDe(DEMARCHE_COLLECTIONS)!;
    expect(d.famille).toBe("Maternelle");
    for (const f of FEUILLES_DE_LA_SEQUENCE) expect(f.seance).toBeLessThan(d.seances.length);
    for (const niveau of ["PS", "MS", "GS"] as const) expect(materielDesSeances(r(niveau))).toHaveLength(d.seances.length);
    for (const s of d.seances) expect(s.objectifs.startsWith(`${DEBUT_OBJECTIF_SEANCE} `)).toBe(true);
  });

  it("donne les feuilles de l'âge : l'écrit à partir de 4 ans, le bon panier en grande section", () => {
    const formes = (niveau: ReglagesCollections["niveau"]) => feuillesPour(r(niveau)).map((f) => f.forme);
    expect(formes("PS")).toEqual(["fiches", "fiches", "fiches", "cartes", "fiches", "evaluation"]);
    expect(formes("MS")).toEqual(["fiches", "fiches", "fiches", "cartes", "bons", "bande", "fiches", "evaluation"]);
    expect(formes("GS")).toEqual(["fiches", "fiches", "fiches", "cartes", "bons", "bande", "panier", "evaluation"]);
    // Des quantités d'un seul objet : pas de bon panier, il réunit deux collections.
    expect(feuillesPour(r("GS", { de: 1, a: 1 })).map((f) => f.forme)).not.toContain("panier");
  });

  it("se nomme d'après sa situation, et vise ce que le programme attend à cet âge", () => {
    expect(titreDeLaSequence(r("MS"))).toBe("Construire des collections : le dortoir des oursons (MS)");
    expect(titreDeLaSequence(r("PS"))).toBe("Construire des collections : les poupées à table (PS)");
    expect(objectifsDeLaSequence(r("GS"))).toMatch(/^Constituer une collection d'un cardinal donné, jusqu'à 10 : .*de voyageurs.* GS, à partir de 5 ans : /);
  });

  it("trouve la compétence du programme à cet âge, quelle que soit sa formulation", () => {
    const refs = [referentiel("Cycle 1 — École maternelle (v1)", true), referentiel("Cycle 1 — Programme 2025 (v2)", true)];
    expect(competenceDuProgramme(refs, "PS")!.competenceRefId).toBe("Cycle 1 — Programme 2025 (v2)-PS");
    const ms = competenceDuProgramme(refs, "MS")!;
    expect(ms.competenceTitre).toBe("Constituer une collection d'un cardinal donné (jusqu'à six objets)");
    expect(ms.domaineTitre).toBe("4. Acquérir les premiers outils mathématiques");
    expect(competenceDuProgramme([referentiel("Cycle 1 — Programme 2025", false)], "GS")).toBeNull();
  });

  it("crée la séquence, ses sept séances avec leur matériel, et range chaque feuille dans la sienne", async () => {
    const vise = competenceDuProgramme([referentiel("Cycle 1 — Programme 2025 (v2)", true)], "MS")!;
    const { sequence, feuilles } = await creerLaSequenceDeCollections(r("MS"), "", [vise], { 2304: "data:lit", 4945: "data:ourson" });
    expect(sequence.titre).toBe("Construire des collections : le dortoir des oursons (MS)");
    expect(sequence.matiere).toBe("4. Acquérir les premiers outils mathématiques");
    expect(sequence.cycle).toBe("Cycle 1");
    expect(enregistres.seances).toHaveLength(7);
    expect(enregistres.seances.every((s) => s.materiel && s.competences.includes("cardinal donné"))).toBe(true);
    expect(feuilles).toBe(8);
    expect(enregistres.feuilles.every((f) => f.atelier === "collections" && f.sequenceId === sequence.id)).toBe(true);
    const dans = (i: number) => enregistres.feuilles.filter((f) => f.seanceId === enregistres.seances[i].id).map((f) => f.titre);
    expect(dans(0)).toEqual(["Les fiches de places — en rangée"]);
    expect(dans(2)).toEqual(["Les fiches de places — en vrac et en deux groupes"]);
    expect(dans(4)).toEqual(["Les bons de commande", "La bande numérique"]);
    expect(dans(5)).toEqual(["Les fiches de places — des ronds, pour des jetons"]);
    // La séance des ronds n'a pas de lits dessinés : on va vers l'abstraction.
    const ronds = enregistres.feuilles.find((f) => f.titre.includes("des ronds"))!.html;
    expect(ronds).toContain('class="cl-rond"');
    expect(ronds).not.toContain('class="cl-dessin"');
  });
});
