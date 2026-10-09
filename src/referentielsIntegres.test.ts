import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { memeCompetence } from "./ateliersCompetences";
import { demarcheSuggeree } from "./demarches";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const FICHIERS = ["competences_cycle1.json", "competences_cycle1_2025.json", "competences_cycle2.json", "competences_cycle3.json"];
const lire = (f: string) => JSON.parse(readFileSync(`src-tauri/referentiels/${f}`, "utf8")) as {
  domaines: { titre: string; sousDomaines: { titre: string }[] }[];
};

describe("les référentiels embarqués", () => {
  it("ne donnent jamais le même titre à deux parties d'un domaine", () => {
    for (const f of FICHIERS) {
      for (const d of lire(f).domaines) {
        const titres = d.sousDomaines.map((sd) => sd.titre.trim().toLowerCase());
        expect(new Set(titres).size, `${f} — ${d.titre}`).toBe(titres.length);
      }
    }
  });

  it("titrent le domaine 1 du cycle 1 comme le programme : l'oral, puis lire, puis écrire", () => {
    for (const f of ["competences_cycle1.json", "competences_cycle1_2025.json"]) {
      expect(lire(f).domaines[0].sousDomaines.map((sd) => sd.titre)).toEqual([
        "Acquérir le langage oral",
        "Passer de l'oral à l'écrit : se préparer à apprendre à lire",
        "Passer de l'oral à l'écrit : se préparer à apprendre à écrire",
      ]);
    }
  });
});

describe("une compétence déjà choisie", () => {
  const avant: CompetenceSelectionnee = {
    id: "x", referentielNom: "Cycle 1 — Programme 2025 (v2)", domaineId: "D1", domaineTitre: "1. Mobiliser le langage dans toutes ses dimensions",
    sousDomaineTitre: "Acquérir le langage oral", competenceTitre: "Scander les syllabes d'un mot", competenceRefId: "d82ad7a9",
  };

  it("se reconnaît à son identifiant, même quand le titre de sa partie a été corrigé", () => {
    const apres = { ...avant, id: "y", sousDomaineTitre: "Passer de l'oral à l'écrit : se préparer à apprendre à lire" };
    expect(memeCompetence(avant, apres)).toBe(true);
    expect(memeCompetence(avant, { ...apres, competenceRefId: "autre" })).toBe(false);
    expect(memeCompetence(avant, { ...apres, referentielNom: "Cycle 1 — École maternelle (v1)" })).toBe(false);
  });

  it("garde ses démarches : la partie « lire » ne bascule pas en phonologie, la partie « écrire » y reste", () => {
    const lireTitre = "Passer de l'oral à l'écrit : se préparer à apprendre à lire";
    const sug = (sd: string, cg: string, comp: string) => demarcheSuggeree({ ...avant, sousDomaineTitre: sd, competenceGeneraleTitre: cg, competenceTitre: comp, niveau: "MS" }, avant.referentielNom, 1).id;
    expect(sug(lireTitre, "Écouter et comprendre différentes formes d'écrits", "Comprendre des histoires et l'enchainement des actions")).toBe("maternelle-modalites");
    expect(sug(lireTitre, "S'éveiller à la diversité linguistique", "Participer à des jeux dans une autre langue")).toBe("maternelle-modalites");
    expect(sug(lireTitre, "Acquérir les habiletés phonologiques et le principe alphabétique", "Scander les syllabes d'un mot")).toBe("phonologie");
    expect(sug("Passer de l'oral à l'écrit : se préparer à apprendre à écrire", "Produire de premiers écrits", "Écrire son prénom")).toBe("phonologie");
  });
});
