// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { MATIERES_DES_FEUILLES, lireMatiereDeFeuille, matiereEnClair, matiereParDefaut } from "./matiereDesFeuilles";

describe("la matière d'une feuille fabriquée (« chaque PDF généré doit avoir sa matière », l'enseignant, 2026-11-03)", () => {
  it("vient de la famille de l'atelier : les mathématiques et leur domaine, le français et le sien", () => {
    expect(matiereParDefaut("heure", ["CE1"])).toEqual({ matiere: "Mathématiques", domaine: "Grandeurs et mesures" });
    expect(matiereParDefaut("pyramides", ["CE1"])).toEqual({ matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" });
    expect(matiereParDefaut("geometrie", ["CE2"])?.domaine).toBe("Espace et géométrie");
    expect(matiereParDefaut("donnees", ["CM1"])?.domaine).toBe("Organisation et gestion de données");
    expect(matiereParDefaut("cursive", ["CP"])).toEqual({ matiere: "Français", domaine: "Écriture" });
    expect(matiereParDefaut("lotoSyllabes", ["CP"])).toEqual({ matiere: "Français", domaine: "Lecture" });
    expect(matiereParDefaut("grammaire", ["CE2"])?.domaine).toBe("Grammaire et orthographe");
    expect(matiereParDefaut("imagier", ["CE1"])?.domaine).toBe("Langage oral");
    // Une classe sans niveau : les matières de l'élémentaire.
    expect(matiereParDefaut("calcul")?.matiere).toBe("Mathématiques");
  });

  it("prend les matières de la maternelle quand toute la classe en est, et l'histoire-géographie au CM", () => {
    expect(matiereParDefaut("nombres", ["MS", "GS"])).toEqual({ matiere: "Structurer sa pensée", domaine: "Acquérir les premiers outils mathématiques" });
    expect(matiereParDefaut("imagier", ["PS"])?.matiere).toBe("Mobiliser le langage");
    expect(matiereParDefaut("nombres", ["GS", "CP"])?.matiere).toBe("Mathématiques");
    expect(matiereParDefaut("frise", ["CM1"])?.matiere).toBe("Histoire-Géographie");
    expect(matiereParDefaut("frise", ["CE1"])?.matiere).toBe("Questionner le monde");
    expect(matiereParDefaut("paysage", ["GS"])?.matiere).toBe("Explorer le monde");
  });

  it("ne dit rien pour ce qui n'a pas de matière en propre : les générateurs de l'enseignant, les affichages, les aides", () => {
    for (const atelier of ["perso", "carteMentale", "sequentiel", "taches", "sequencesCP", "inconnu"]) expect(matiereParDefaut(atelier, ["CE1"]), atelier).toBeNull();
  });

  it("relit un choix enregistré, et l'écrit en clair ; les temps qui ne sont pas des matières n'en sont pas", () => {
    expect(lireMatiereDeFeuille('{"matiere":"EPS","domaine":""}')).toEqual({ matiere: "EPS", domaine: "" });
    expect(lireMatiereDeFeuille({ matiere: " Mathématiques ", domaine: "Grandeurs et mesures" })).toEqual({ matiere: "Mathématiques", domaine: "Grandeurs et mesures" });
    for (const brut of ["", "pas du JSON", '{"domaine":"x"}', null, 3]) expect(lireMatiereDeFeuille(brut)).toBeNull();
    expect(matiereEnClair({ matiere: "Mathématiques", domaine: "Grandeurs et mesures" })).toBe("Mathématiques · Grandeurs et mesures");
    expect(matiereEnClair(null)).toBe("");
    expect(MATIERES_DES_FEUILLES).toContain("Français");
    expect(MATIERES_DES_FEUILLES).not.toContain("Récréation");
  });
});
