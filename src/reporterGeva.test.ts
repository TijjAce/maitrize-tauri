// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { DOMAINES, type GevaData } from "./gevasco";
import { numerosDesEtapes, reportVide, texteDuReport, tropLong } from "./reporterLpi";
import { etapesDuGeva, nomDuGeva, rappelDuGeva } from "./reporterGeva";

const doc = (p: Partial<GevaData> = {}) => ({
  type: "premiere", coches: {}, plans: {}, accompagnements: {}, materiel: {}, edt: {}, activites: {}, cadres: {},
  participants: [], parcours: [], responsables: [], ...p,
}) as GevaData;

const partie = (d: GevaData, sous: string) => {
  const e = etapesDuGeva(d).find((x) => (x.sous ?? x.titre) === sous);
  if (!e) throw new Error(`pas de partie « ${sous} »`);
  return e;
};
const lignes = (d: GevaData, sous: string) => partie(d, sous).blocs.flatMap((b) => b.groupes.flatMap((g) => g.lignes.map((l) => l.texte)));
const textes = (d: GevaData, sous: string) => partie(d, sous).textes.map((t) => t.texte);

const ACTIVITES = "Activités de l'élève : ";
const MOBILITE = `${ACTIVITES}Mobilité, manipulation`;

describe("les écrans du LPI", () => {
  it("suivent la fiche de la première demande", () => {
    expect(etapesDuGeva(doc()).map((e) => e.sous ?? e.titre)).toEqual([
      "Réunion équipe éducative",
      "Points saillants liés à la scolarisation",
      "Conditions actuelles : Plan ou projets formalisés",
      "Évaluation de la scolarité",
      "Emploi du temps",
      `${ACTIVITES}Tâches et exigences générales, relation avec autrui`,
      `${ACTIVITES}Entretien personnel`,
      MOBILITE,
      `${ACTIVITES}Communication`,
      `${ACTIVITES}Tâches et exigences en relation avec la scolarité`,
      "Observations et perspectives",
      "Remarques de l'élève et de la famille",
      "Autres remarques",
    ]);
  });

  it("gardent quatre étapes, numérotées une seule fois", () => {
    const etapes = etapesDuGeva(doc());
    expect([...new Set(etapes.map((e) => e.titre))]).toEqual(["Réunion équipe éducative", "Scolarisation", "Observations", "Remarques"]);
    expect(new Set(numerosDesEtapes(etapes))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("ajoutent au réexamen le dossier MDPH et le bilan de la période", () => {
    const d = doc({ type: "reexamen", numDossier: "0012", bilanDispositifs: "ULIS deux heures", bilanAmenagements: "Textes agrandis" });
    expect(textes(d, "Réunion équipe éducative")).toEqual(["0012"]);
    expect(textes(d, "Bilan de la période écoulée")).toEqual(["Textes agrandis", "ULIS deux heures"]);
    expect(etapesDuGeva(doc({ numDossier: "0012", bilanDispositifs: "ULIS" })).map((e) => e.sous)).not.toContain("Bilan de la période écoulée");
    expect(textes(doc({ numDossier: "0012" }), "Réunion équipe éducative")).toEqual([]);
  });

  it("ne demandent le PPRE, le PAP et l'homogénéité du niveau que pour une première demande", () => {
    const sousDe = (d: GevaData) => etapesDuGeva(d).map((e) => e.sous);
    expect(partie(doc(), "Conditions actuelles : Plan ou projets formalisés").aSaisir).toContain("PPRE");
    expect(partie(doc(), "Évaluation de la scolarité").aSaisir).toContain("homogène");
    expect(sousDe(doc({ type: "reexamen" }))).not.toContain("Conditions actuelles : Plan ou projets formalisés");
    expect(partie(doc({ type: "reexamen" }), "Évaluation de la scolarité").aSaisir).toBeUndefined();
  });

  it("nomment le document et ce qui suit la finalisation", () => {
    expect(nomDuGeva("premiere")).toBe("GEVA-Sco 1re demande");
    expect(nomDuGeva("reexamen")).toBe("GEVA-Sco réexamen");
    expect(rappelDuGeva("premiere")).toContain("dossier MDPH");
    expect(rappelDuGeva("reexamen")).toContain("enseignant référent");
  });
});

describe("la réunion", () => {
  it("donne la date au format du LPI et chaque participant sous sa fonction", () => {
    const d = doc({ dateReunion: "2026-11-20", participants: [{ id: "1", nom: "Participant Un", fonction: "Enseignant" }, { id: "2", nom: "Participant Deux", fonction: "" }, { id: "3", nom: "", fonction: "AESH" }] });
    expect(partie(d, "Réunion équipe éducative").textes).toEqual([
      { libelle: "Date de la réunion", texte: "20/11/2026" },
      { libelle: "Enseignant", texte: "Participant Un" },
      { libelle: "Participant", texte: "Participant Deux" },
    ]);
  });
});

describe("les conditions de scolarisation", () => {
  const d = doc({
    coches: { PAI: true, "Autres:accompagnements": true, SAPAD: true, "Outils de communication": true },
    plans: { PAI: "Depuis la rentrée" },
    accompagnements: { "CAMPS / CMP / CMPP": "Une fois par semaine" },
    materiel: { "Aménagements et adaptations pédagogiques": "Place devant", "Mobilier et petits matériels": "Plan incliné" },
  });

  it("met chaque tableau dans sa partie, dans l'ordre de l'écran", () => {
    expect(etapesDuGeva(d).map((e) => e.sous).filter((s) => s?.startsWith("Conditions"))).toEqual([
      "Conditions actuelles : Plan ou projets formalisés",
      "Conditions actuelles : Accompagnement et soins",
      "Conditions actuelles : Aménagements et adaptations pédagogiques",
      "Conditions actuelles : Conditions matérielles",
    ]);
  });

  it("dit ce qui se coche, sous les noms du LPI", () => {
    expect(lignes(d, "Conditions actuelles : Plan ou projets formalisés")).toEqual(["PAI"]);
    expect(lignes(d, "Conditions actuelles : Accompagnement et soins")).toEqual(["APADHE (SAPAD)", "CAMPS, CMP ou CMPP", "Autres"]);
    expect(lignes(d, "Conditions actuelles : Conditions matérielles")).toEqual(["Outils de communication", "Mobilier et petits matériels"]);
  });

  it("donne les précisions d'un tableau en un seul texte", () => {
    expect(textes(d, "Conditions actuelles : Plan ou projets formalisés")).toEqual(["PAI : Depuis la rentrée"]);
    expect(textes(d, "Conditions actuelles : Accompagnement et soins")).toEqual(["CAMPS / CMP / CMPP : Une fois par semaine"]);
  });

  it("sort les aménagements du matériel : le LPI leur donne une zone à part", () => {
    expect(textes(d, "Conditions actuelles : Aménagements et adaptations pédagogiques")).toEqual(["Place devant"]);
    expect(textes(d, "Conditions actuelles : Conditions matérielles")).toEqual(["Mobilier et petits matériels : Plan incliné"]);
    expect(lignes(d, "Conditions actuelles : Conditions matérielles")).not.toContain("Aménagements et adaptations pédagogiques");
  });

  it("prévient au réexamen quand un soin coché n'a pas ses précisions", () => {
    const s = "Conditions actuelles : Accompagnement et soins";
    const reexamen = { type: "reexamen" as const, coches: { RASED: true } };
    expect(partie(doc(reexamen), s).alerte).toContain("Obligatoire");
    expect(partie(doc({ ...reexamen, accompagnements: { RASED: "Deux fois par semaine" } }), s).alerte).toBeUndefined();
    expect(partie(doc({ coches: { RASED: true } }), s).alerte).toBeUndefined();
  });
});

describe("l'évaluation et l'emploi du temps", () => {
  it("traduit les acquisitions en la question du LPI", () => {
    const question = (a: GevaData["acquisitions"]) => lignes(doc({ acquisitions: a }), "Évaluation de la scolarité");
    expect(question("atteintes")[0]).toMatch(/: Oui$/);
    expect(question("nonatteintes")[0]).toMatch(/: Non$/);
    expect(question("")).toEqual([]);
  });

  it("rassemble le parcours, à ajouter si utile", () => {
    const d = doc({ parcours: [{ id: "1", annee: "2024-2025", scolarisation: "CP" }, { id: "2", annee: "", scolarisation: "" }, { id: "3", annee: "2025-2026", scolarisation: "CE1" }] });
    expect(textes(d, "Évaluation de la scolarité")).toEqual(["2024-2025 : CP\n2025-2026 : CE1"]);
  });

  it("donne chaque case remplie de l'emploi du temps", () => {
    const d = doc({ edt: { Lundi: { matin: "Classe", midi: "", apresmidi: "SESSAD" } } });
    expect(partie(d, "Emploi du temps").textes).toEqual([
      { libelle: "Lundi matin", texte: "Classe" },
      { libelle: "Lundi après-midi", texte: "SESSAD" },
    ]);
    expect(partie(d, "Emploi du temps").alerte).toBeUndefined();
    expect(partie(doc(), "Emploi du temps").alerte).toContain("Obligatoire");
  });
});

describe("les activités", () => {
  const mobilite = DOMAINES.find((x) => x.id === "mobilite")!.activites;
  const code = (c: string) => ({ code: c, obstacles: "", appuis: "" }) as GevaData["activites"][string];

  it("traduit chaque cote dans les mots du LPI", () => {
    const d = doc({ activites: { m1: code("A"), m2: code("B"), m3: code("D"), m4: code("SO") } });
    expect(lignes(d, MOBILITE)).toEqual([
      `${mobilite[0].label} : Activité réalisée, sans difficulté et seul`,
      `${mobilite[1].label} : Activité réalisée, avec des difficultés ponctuelles et/ou une aide ponctuelle`,
      `${mobilite[2].label} : Activité non réalisée`,
      `${mobilite[3].label} : Sans objet`,
    ]);
    expect(lignes(doc({ activites: { m1: code("C") } }), MOBILITE)[0]).toContain("difficultés régulières");
  });

  it("nomme le cadre des obstacles comme l'écran de chaque document", () => {
    const cadres = { mobilite: { obstacles: "Escaliers", appuis: "Rampe" } };
    expect(partie(doc({ cadres }), MOBILITE).textes.map((t) => t.libelle)).toEqual(["Obstacles à la réalisation de l'activité", "Points d'appui et commentaires"]);
    expect(partie(doc({ type: "reexamen", cadres }), MOBILITE).textes.map((t) => t.libelle)).toEqual(["Nature des difficultés rencontrées", "Points d'appui et commentaires"]);
  });

  it("garde l'accessibilité du bâti avec les obstacles de la mobilité", () => {
    const d = doc({ accessibiliteBati: "partielle", cadres: { mobilite: { obstacles: "Escaliers", appuis: "" } } });
    expect(textes(d, MOBILITE)).toEqual(["Accessibilité du bâti : partielle\nEscaliers"]);
  });

  it("compte ce qui n'est pas coté, et réclame les deux cadres d'un C ou d'un D", () => {
    expect(partie(doc(), MOBILITE).alerte).toBe("4 activités pas encore cotées ici.");
    const trois = { m1: code("A"), m2: code("A"), m3: code("A") };
    expect(partie(doc({ activites: trois }), MOBILITE).alerte).toBe("1 activité pas encore cotée ici.");
    const tout = { ...trois, m4: code("D") };
    expect(partie(doc({ activites: tout }), MOBILITE).alerte).toBe("Activité cotée C ou D : les deux cadres sont à remplir.");
    expect(partie(doc({ activites: tout, cadres: { mobilite: { obstacles: "a", appuis: "" } } }), MOBILITE).alerte).toContain("deux cadres");
    expect(partie(doc({ activites: tout, cadres: { mobilite: { obstacles: "a", appuis: "b" } } }), MOBILITE).alerte).toBeUndefined();
  });

  it("réunit évolutions et perspectives dans la seule zone du LPI", () => {
    expect(textes(doc({ evolutions: "Progrès en lecture", perspectives: "Viser le CE1" }), "Observations et perspectives")).toEqual(["Progrès en lecture\n\nViser le CE1"]);
    expect(partie(doc(), "Observations et perspectives").alerte).toContain("Obligatoire");
  });
});

describe("ce qui se colle", () => {
  it("prévient quand un texte dépasse sa zone", () => {
    const t = (n: number, cle: "evolutions" | "remarquesProfessionnels", s: string) => partie(doc({ [cle]: "x".repeat(n) }), s).textes[0];
    expect(tropLong(t(1000, "evolutions", "Observations et perspectives"))).toBe("");
    expect(tropLong(t(1001, "evolutions", "Observations et perspectives"))).toBe("1001 caractères : 1000 au plus dans le LPI.");
    expect(tropLong(t(501, "remarquesProfessionnels", "Autres remarques"))).toBe("501 caractères : 500 au plus dans le LPI.");
    expect(partie(doc({ niveauApprentissages: "x" }), "Évaluation de la scolarité").textes[0].max).toBe(3000);
  });

  it("ne reprend ni identité ni coordonnées : le livret les connaît déjà", () => {
    const secret = "NE-PAS-COPIER";
    const d = doc({
      adresse: secret, cp: secret, ville: secret, tel: secret, courriel: secret, dateNaissance: secret, representants: secret,
      etablissement: secret, classe: secret, etabRue: secret, etabCp: secret, etabVille: secret,
      responsables: [{ id: "1", civilite: "", nom: secret, rue: secret, cp: secret, ville: secret, tel: secret, courriel: secret }],
      evolutions: "Progrès",
    });
    expect(texteDuReport("GEVA-Sco", etapesDuGeva(d))).not.toContain(secret);
  });

  it("écrit tout le document, chaque étape une seule fois", () => {
    const t = texteDuReport("GEVA-Sco : à reporter", etapesDuGeva(doc({ referentNom: "Référent Exemple", niveauApprentissages: "CE1", evolutions: "Progrès" })));
    expect(t.match(/^2\. Scolarisation$/gm)).toHaveLength(1);
    expect(t).toContain("2. Scolarisation\nPoints saillants liés à la scolarisation\nEnseignant référent : nom : Référent Exemple");
    expect(t).toContain("3. Observations\nObservations et perspectives");
    expect(t).not.toContain("Réunion équipe éducative");
  });

  it("dit qu'il n'y a rien à reporter tant que rien n'est écrit", () => {
    expect(reportVide(etapesDuGeva(doc()))).toBe(true);
    expect(reportVide(etapesDuGeva(doc({ evolutions: "  " })))).toBe(true);
    expect(reportVide(etapesDuGeva(doc({ evolutions: "Progrès" })))).toBe(false);
  });

  it("résiste à un document abîmé", () => {
    const abimes = [
      { participants: "non", parcours: 3, edt: "x", activites: 5, cadres: null, plans: null, accompagnements: undefined, materiel: 7, coches: null },
      { participants: [null, { nom: 3, fonction: {} }], parcours: [null], edt: { Lundi: null }, activites: { m1: null, m2: { code: "Z" } }, cadres: { mobilite: null } },
      { acquisitions: "autre", dateReunion: 12, evolutions: {} },
    ];
    for (const a of abimes) {
      expect(() => etapesDuGeva(doc(a as unknown as Partial<GevaData>))).not.toThrow();
      expect(() => etapesDuGeva(doc({ ...(a as unknown as Partial<GevaData>), type: "reexamen" }))).not.toThrow();
    }
  });
});
