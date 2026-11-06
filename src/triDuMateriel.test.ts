// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { FAMILLES_MATERIEL, MATERIEL_REEL, lireInventaire, ecrireInventaire } from "./materielDeClasse";
import { cartesATrier, dansLaClasse, decider, reprendre, sensDuGeste } from "./triDuMateriel";

describe("le tri du matériel, carte par carte", () => {
  it("présente tout le catalogue, famille par famille", () => {
    const cartes = cartesATrier({});
    expect(cartes).toHaveLength(MATERIEL_REEL.length);
    const rangs = cartes.map((m) => FAMILLES_MATERIEL.findIndex((f) => f.id === m.famille));
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });

  it("ne reprend pas ce qui est déjà dit, oui ou non", () => {
    let inv = decider({}, MATERIEL_REEL[0].id, true);
    inv = decider(inv, MATERIEL_REEL[1].id, false);
    const ids = cartesATrier(inv).map((m) => m.id);
    expect(ids).not.toContain(MATERIEL_REEL[0].id);
    expect(ids).not.toContain(MATERIEL_REEL[1].id);
    expect(ids).toHaveLength(MATERIEL_REEL.length - 2);
    expect(dansLaClasse(inv)).toBe(1);
  });

  it("garde où c'est rangé quand on change d'avis, et rend la carte quand on revient", () => {
    const id = MATERIEL_REEL[0].id;
    expect(decider({ [id]: { a: true, lieu: "armoire" } }, id, false)[id]).toEqual({ a: false, lieu: "armoire" });
    const repris = reprendre(decider({}, id, true), id);
    expect(repris[id]).toBeUndefined();
    expect(cartesATrier(repris).map((m) => m.id)).toContain(id);
  });

  it("écrit un inventaire que les séances savent relire", () => {
    const inv = decider(decider({}, MATERIEL_REEL[0].id, true), MATERIEL_REEL[1].id, false);
    expect(lireInventaire(ecrireInventaire(inv))).toEqual(inv);
  });

  it("comprend le geste : assez loin, ou plus court mais vif ; sinon la carte revient", () => {
    expect(sensDuGeste(200, 0.1)).toBe("oui");
    expect(sensDuGeste(-200, 0.1)).toBe("non");
    expect(sensDuGeste(60, 0.8)).toBe("oui");
    expect(sensDuGeste(-60, 0.8)).toBe("non");
    expect(sensDuGeste(60, 0.1)).toBeNull();
    expect(sensDuGeste(10, 3)).toBeNull();
    expect(sensDuGeste(0, 0)).toBeNull();
  });
});
