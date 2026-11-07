// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { commentairesDuTableau, ligneCochee, poserCase, sansTrous, TABLEAUX_GEVA } from "./gevasco";

const vide = () => ({ nom: "" });

describe("les listes du GEVA-Sco", () => {
  it("n'ont plus de trous : une ligne absente devient une ligne vide", () => {
    // La troisième ligne écrite seule, puis relue de la base : les deux premières sont « null ».
    const relue = JSON.parse(JSON.stringify(Object.assign([], { 2: { nom: "Autre responsable" } })));
    expect(relue).toEqual([null, null, { nom: "Autre responsable" }]);
    expect(sansTrous(relue, vide)).toEqual([{ nom: "" }, { nom: "" }, { nom: "Autre responsable" }]);
  });

  it("s'allongent jusqu'à la ligne qu'on écrit", () => {
    const liste = sansTrous([{ nom: "A" }], vide, 3);
    expect(liste).toHaveLength(3);
    expect(liste[0]).toEqual({ nom: "A" });
    expect(liste.every(Boolean)).toBe(true);
  });

  it("tiennent bon sans liste du tout", () => {
    expect(sansTrous(undefined, vide)).toEqual([]);
    expect(sansTrous(null, vide, 1)).toEqual([{ nom: "" }]);
  });
});

describe("les conditions de scolarisation du GEVA-Sco", () => {
  const vide = { coches: {}, plans: {}, accompagnements: {}, materiel: {} };

  it("cochent une ligne à la main, ou d'elle-même quand elle a un commentaire", () => {
    expect(ligneCochee(vide, "plans", "PAI")).toBe(false);
    expect(ligneCochee({ ...vide, coches: { PAI: true } }, "plans", "PAI")).toBe(true);
    expect(ligneCochee({ ...vide, plans: { PAI: "Depuis mars" } }, "plans", "PAI")).toBe(true);
    expect(ligneCochee({ ...vide, plans: { PAI: "  " } }, "plans", "PAI")).toBe(false);
  });

  it("ont une case « Autres » par tableau", () => {
    expect(TABLEAUX_GEVA.every((t) => t.lignes.includes("Autres"))).toBe(true);
    const coches = poserCase({}, "plans", "Autres", true);
    expect(ligneCochee({ ...vide, coches }, "plans", "Autres")).toBe(true);
    expect(ligneCochee({ ...vide, coches }, "materiel", "Autres")).toBe(false);
    expect(ligneCochee({ ...vide, accompagnements: { Autres: "Orthophonie" } }, "plans", "Autres")).toBe(false);
  });

  it("gardent l'ancienne case commune, jusqu'à ce qu'on touche à celle du tableau", () => {
    const ancien = { ...vide, coches: { Autres: true } };
    expect(TABLEAUX_GEVA.every((t) => ligneCochee(ancien, t.id, "Autres"))).toBe(true);
    const decochee = { ...ancien, coches: poserCase(ancien.coches, "plans", "Autres", false) };
    expect(ligneCochee(decochee, "plans", "Autres")).toBe(false);
    expect(ligneCochee(decochee, "materiel", "Autres")).toBe(true);
  });

  it("ne garde pas les autres lignes sous une clé à part", () => {
    expect(poserCase({}, "materiel", "Transport", true)).toEqual({ Transport: true });
  });

  it("réunissent les commentaires, une ligne par dispositif", () => {
    expect(commentairesDuTableau(["PAI", "Autres"], { Autres: " Tutorat ", PAI: "Depuis mars", Ailleurs: "non" })).toBe("PAI : Depuis mars\nAutres : Tutorat");
    expect(commentairesDuTableau(["PAI"], undefined)).toBe("");
  });

  it("résistent à un document abîmé", () => {
    const abime = { coches: null, plans: null } as unknown as typeof vide;
    expect(ligneCochee(abime, "plans", "PAI")).toBe(false);
  });
});
