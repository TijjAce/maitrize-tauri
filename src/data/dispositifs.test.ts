import { describe, it, expect } from "vitest";
import { DISPOSITIFS, type Champ } from "./dispositifs";

// Les dispositifs sont décrits en données : un écran générique les affiche,
// les enregistre et les imprime. Une coquille dans ce fichier ne provoque
// aucune erreur de compilation — elle se traduit par un champ qui écrase
// silencieusement un autre, ou par une grille sans case. D'où ces garde-fous.

const champsDe = (d: (typeof DISPOSITIFS)[number]): Champ[] =>
  d.sections.flatMap((s) => s.champs);

describe("catalogue des dispositifs", () => {
  it("contient les quatre dispositifs attendus", () => {
    expect(DISPOSITIFS.map((d) => d.id).sort()).toEqual(["pai", "pap", "ppre", "pps"]);
  });

  it("donne à chacun un identifiant unique", () => {
    const ids = DISPOSITIFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(DISPOSITIFS.map((d) => [d.id, d] as const))("dispositif %s", (_id, d) => {
  it("est nommé et présenté", () => {
    expect(d.nom.trim()).not.toBe("");
    expect(d.nomLong.trim()).not.toBe("");
    expect(d.sousTitre.trim()).not.toBe("");
  });

  it("a au moins une section, chacune titrée et non vide", () => {
    expect(d.sections.length).toBeGreaterThan(0);
    for (const s of d.sections) {
      expect(s.titre.trim(), `section sans titre dans ${d.id}`).not.toBe("");
      expect(s.champs.length, `section « ${s.titre} » vide`).toBeGreaterThan(0);
    }
  });

  it("n'utilise jamais deux fois le même identifiant de champ", () => {
    // Deux champs partageant un id écriraient dans la même case : la saisie
    // de l'un effacerait l'autre, sans le moindre message.
    const ids = champsDe(d).map((c) => c.id);
    const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(doublons, `identifiants en double dans ${d.id}`).toEqual([]);
  });

  it("étiquette tous ses champs", () => {
    for (const c of champsDe(d)) {
      expect(c.label.trim(), `champ ${c.id} sans étiquette`).not.toBe("");
      expect(c.id.trim(), `champ sans identifiant dans ${d.id}`).not.toBe("");
    }
  });

  it("donne des colonnes et des items à chaque grille", () => {
    for (const c of champsDe(d)) {
      if (c.t !== "grille") continue;
      expect(c.colonnes.length, `grille ${c.id} sans colonne`).toBeGreaterThan(0);
      expect(c.items.length, `grille ${c.id} sans item`).toBeGreaterThan(0);
      expect(c.items.every((i) => i.trim() !== ""), `item vide dans ${c.id}`).toBe(true);
    }
  });

  it("donne des colonnes et au moins une ligne à chaque liste", () => {
    for (const c of champsDe(d)) {
      if (c.t !== "liste") continue;
      expect(c.colonnes.length, `liste ${c.id} sans colonne`).toBeGreaterThan(0);
      expect(c.lignes, `liste ${c.id} sans ligne`).toBeGreaterThan(0);
    }
  });
});

describe("champs communs", () => {
  it("nomme identiquement les champs pré-remplissables", () => {
    // Le bouton « Pré-remplir » cherche ces identifiants exacts : les
    // renommer dans un seul dispositif casserait le pré-remplissage sans
    // que rien ne le signale.
    for (const d of DISPOSITIFS) {
      const ids = champsDe(d).map((c) => c.id);
      expect(ids, `${d.id} doit porter le champ « etablissement »`).toContain("etablissement");
      expect(ids, `${d.id} doit porter le champ « anneeScolaire »`).toContain("anneeScolaire");
    }
  });
});
