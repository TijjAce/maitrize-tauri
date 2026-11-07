// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { DISPOSITIFS } from "./data/dispositifs";
import { AMENAGEMENTS_LPI, POINTS_ET_DIFFICULTES_LPI } from "./data/amenagementsLPI";
import {
  champsDesEtapes, etapesDuReport, peutSeReporter, reportVide, texteDeLaLigne, texteDuBloc, texteDuReport,
} from "./reporterLpi";

const RUBRIQUE = AMENAGEMENTS_LPI.elementaire[0];
const AUTRE_ONGLET = AMENAGEMENTS_LPI.elementaire.find((r) => r.onglet === "Formation de la personne et du citoyen")!;
const titres = (id: string) => etapesDuReport(id, {}).map((e) => e.titre);

describe("les étapes du LPI", () => {
  it("existent pour le PAP, le PPRE et le PPS, pas pour le PAI, absent du LPI", () => {
    expect(["pap", "ppre", "pps"].every(peutSeReporter)).toBe(true);
    expect(peutSeReporter("pai")).toBe(false);
    expect(etapesDuReport("pai", {})).toEqual([]);
  });

  it("suivent l'ordre des fiches du ministère", () => {
    expect(titres("pap")).toEqual(["Avis médical", "Informations préliminaires", "Analyse pédagogique", "Mise en œuvre", "Bilan"]);
    expect(titres("ppre")).toEqual(["Informations préliminaires", "Points d'appui", "Difficultés", "Mise en œuvre", "Bilan"]);
    expect(titres("pps")).toEqual(["Situation de l'élève", "Emploi du temps", "Priorités, objectifs et préconisations", "Notifications de la CDAPH", "Aménagements et adaptations"]);
  });

  it("ne citent que des champs qui existent dans le plan", () => {
    for (const id of ["pap", "ppre", "pps"]) {
      const connus = DISPOSITIFS.find((d) => d.id === id)!.sections.flatMap((s) => s.champs).map((c) => c.id);
      for (const c of champsDesEtapes(id)) expect(connus, `${id} : ${c}`).toContain(c);
    }
  });

  it("disent que le plan est vide tant que rien n'est écrit", () => {
    expect(reportVide(etapesDuReport("pap", {}))).toBe(true);
    expect(reportVide(etapesDuReport("pap", { classe: "  " }))).toBe(true);
    expect(reportVide(etapesDuReport("pap", { classe: "CP" }))).toBe(false);
  });
});

describe("ce qui se coche", () => {
  const valeurs = {
    lpiAmenagements: {
      retenus: [
        { rubrique: AUTRE_ONGLET.titre, texte: AUTRE_ONGLET.items[0] },
        { rubrique: RUBRIQUE.titre, texte: RUBRIQUE.items[1], precision: " en lecture " },
        { rubrique: RUBRIQUE.titre, texte: "Prévoir un coin calme", autre: 0 },
      ],
    },
  };
  const bloc = () => etapesDuReport("pap", valeurs).find((e) => e.titre === "Mise en œuvre")!.blocs[0];

  it("donne le chemin du LPI : l'onglet, puis la rubrique, sans répéter un même nom", () => {
    expect(AUTRE_ONGLET.onglet).toBe(AUTRE_ONGLET.titre);
    expect(bloc().groupes.map((g) => g.chemin)).toEqual([
      AUTRE_ONGLET.titre,
      `${RUBRIQUE.onglet} › ${RUBRIQUE.titre}`,
    ]);
  });

  it("garde la place choisie dans le plan, même rangé par rubrique", () => {
    const [premier, second] = bloc().groupes;
    expect(premier.lignes[0].rang).toBe(1);
    expect(second.lignes.map((l) => l.rang)).toEqual([2, 3]);
  });

  it("sépare la précision et signale ce qui s'écrit à la main", () => {
    const lignes = bloc().groupes[1].lignes;
    expect(lignes[0].precision).toBe("en lecture");
    expect(lignes[1]).toMatchObject({ autre: true, texte: "Prévoir un coin calme" });
  });

  it("met les points d'appui et les difficultés dans une seule étape pour le PAP, deux pour le PPRE", () => {
    const s = POINTS_ET_DIFFICULTES_LPI[0];
    const v = { lpiAppuis: { appuis: [{ sousDomaine: s.titre, texte: s.paires[0].appui }], difficultes: [{ sousDomaine: s.titre, texte: s.paires[1].difficulte }] } };
    const analyse = etapesDuReport("pap", v).find((e) => e.titre === "Analyse pédagogique")!;
    expect(analyse.blocs.map((b) => b.titre)).toEqual(["Points d'appui", "Difficultés"]);
    expect(analyse.blocs[0].groupes[0].chemin).toBe(`${s.domaine} › ${s.titre}`);
    const ppre = etapesDuReport("ppre", v);
    expect(ppre.find((e) => e.titre === "Points d'appui")!.blocs.map((b) => b.titre)).toEqual(["Points d'appui"]);
    expect(ppre.find((e) => e.titre === "Difficultés")!.blocs.map((b) => b.titre)).toEqual(["Difficultés"]);
  });

  it("prévient au-delà de trois domaines, pas avant", () => {
    const domaines = [...new Set(POINTS_ET_DIFFICULTES_LPI.map((s) => s.domaine))];
    const sousDe = (d: string) => POINTS_ET_DIFFICULTES_LPI.find((s) => s.domaine === d)!;
    const avec = (n: number) => ({ lpiAppuis: { appuis: domaines.slice(0, n).map((d) => ({ sousDomaine: sousDe(d).titre, texte: sousDe(d).paires[0].appui })), difficultes: [] } });
    const alerte = (n: number) => etapesDuReport("ppre", avec(n)).find((e) => e.titre === "Points d'appui")!.blocs[0].alerte;
    expect(alerte(3)).toBeUndefined();
    expect(alerte(4)).toContain("4 domaines");
  });
});

describe("ce qui se colle", () => {
  it("range chaque champ dans son étape, sans les champs vides", () => {
    const e = etapesDuReport("pps", { classe: "CE1", tempsScolarisation: "24 h", aideHumaine: "AESH", materiel: "  ", soins: "SESSAD" });
    const textes = (t: string) => e.find((x) => x.titre === t)!.textes.map((l) => l.texte);
    expect(textes("Situation de l'élève")).toEqual(["CE1"]);
    expect(textes("Emploi du temps")).toEqual(["24 h"]);
    expect(textes("Notifications de la CDAPH")).toEqual(["AESH"]);
  });

  it("écrit les lignes d'un tableau avec le nom de leurs colonnes", () => {
    const e = etapesDuReport("ppre", { objectifs: [["Lire une phrase", "", "Noël"], ["", "", ""]] });
    expect(e.find((x) => x.titre === "Mise en œuvre")!.textes).toEqual([
      { libelle: "Objectifs prioritaires", texte: "Objectif : Lire une phrase · Échéance : Noël" },
    ]);
  });

  it("numérote plusieurs lignes, et prévient au-delà de trois objectifs", () => {
    const rangs = (n: number) => Array.from({ length: n }, (_, i) => [`Objectif ${i}`, "", ""]);
    const trois = etapesDuReport("ppre", { objectifs: rangs(3) }).find((x) => x.titre === "Mise en œuvre")!;
    expect(trois.textes.map((t) => t.libelle)).toEqual(["Objectifs prioritaires 1", "Objectifs prioritaires 2", "Objectifs prioritaires 3"]);
    expect(trois.alerte).toBeUndefined();
    expect(etapesDuReport("ppre", { objectifs: rangs(4) }).find((x) => x.titre === "Mise en œuvre")!.alerte).toContain("4 objectifs");
  });

  it("n'oublie pas ce qui est coché sur l'ancien formulaire", () => {
    const grille = DISPOSITIFS.find((d) => d.id === "pap")!.sections.flatMap((s) => s.champs).find((c) => c.t === "grille")!;
    if (grille.t !== "grille") throw new Error("pas une grille");
    const e = etapesDuReport("pap", { [grille.id]: { "0:1": true } }).find((x) => x.titre === "Mise en œuvre")!;
    expect(e.textes[0].libelle).toContain("Formulaire de 2015");
    expect(e.textes[0].texte).toBe(grille.items[0]);
  });

  it("résiste à un document abîmé", () => {
    for (const v of [{ objectifs: "non" }, { objectifs: [1, null, ["x"]] }, { classe: 3 }, { lpiAmenagements: "non", lpiAppuis: 5 }]) {
      expect(() => etapesDuReport("ppre", v as Record<string, unknown>)).not.toThrow();
    }
  });
});

describe("le texte à garder sous les yeux", () => {
  const valeurs = { classe: "CP", lpiAmenagements: { retenus: [{ rubrique: RUBRIQUE.titre, texte: "Lire à deux", autre: 1, precision: "le matin" }] } };

  it("écrit une ligne à cocher", () => {
    expect(texteDeLaLigne({ rang: 2, texte: "Aménager un espace de répit" })).toBe("2. Aménager un espace de répit");
    expect(texteDeLaLigne({ texte: "Travaille seul" })).toBe("- Travaille seul");
    expect(texteDeLaLigne({ rang: 1, texte: "Lire à deux", autre: true, precision: "le matin" })).toBe("1. Autre : Lire à deux (préciser : le matin)");
  });

  it("écrit un bloc avec ses chemins", () => {
    const b = etapesDuReport("pap", valeurs).find((e) => e.titre === "Mise en œuvre")!.blocs[0];
    expect(texteDuBloc(b)).toBe(`Adaptations et aménagements\n${RUBRIQUE.onglet} › ${RUBRIQUE.titre}\n1. Autre : Lire à deux (préciser : le matin)`);
  });

  it("écrit tout le plan, sans les étapes vides ni aucun nom d'élève", () => {
    const t = texteDuReport("PAP : à reporter dans le LPI", etapesDuReport("pap", valeurs));
    expect(t.startsWith("PAP : à reporter dans le LPI\n\n1. Avis médical\nClasse : CP")).toBe(true);
    expect(t).toContain("4. Mise en œuvre");
    expect(t).not.toContain("Informations préliminaires");
    expect(t).not.toContain("Analyse pédagogique");
  });
});
