// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { ajouterDictee } from "./CahierJournal";

describe("ajouterDictee", () => {
  it("remplit un champ vide", () => {
    expect(ajouterDictee("", "  Lecture d’album. ")).toBe("Lecture d’album.");
  });
  it("ajoute une phrase à la suite, avec un point si besoin", () => {
    expect(ajouterDictee("Rituels", "Puzzle 12 pièces.")).toBe("Rituels. Puzzle 12 pièces.");
    expect(ajouterDictee("Rituels.", "Puzzle.")).toBe("Rituels. Puzzle.");
  });
  it("une dictée vide ne change rien", () => {
    expect(ajouterDictee("Rituels", "   ")).toBe("Rituels");
  });
});
