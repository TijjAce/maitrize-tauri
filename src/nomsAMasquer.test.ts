// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { beforeEach, describe, expect, it, vi } from "vitest";

let eleves: { nom: string }[] | Error = [];
let reglages: Record<string, string> = {};
vi.mock("./api", () => ({
  api: {
    elevesList: async () => { if (eleves instanceof Error) throw eleves; return eleves; },
    settingsAll: async () => ({ ...reglages }),
    settingGet: async (cle: string) => reglages[cle] ?? null,
    settingSet: async (cle: string, valeur: string) => { reglages[cle] = valeur; },
  },
}));

import { masquerSurLesEleves, nomsAMasquer, pourLaVoix, retenirLesReperes } from "./nomsAMasquer";

beforeEach(() => { eleves = [{ nom: "Barnabé" }]; reglages = {}; });

describe("ce qui part sur les élèves (« continue de vérifier pour l'anonymisation », 6 novembre 2026)", () => {
  it("sans la liste des élèves, rien ne part", async () => {
    eleves = new Error("base illisible");
    await expect(masquerSurLesEleves(["Barnabé lit."])).rejects.toThrow("rien n'est envoyé");
    await expect(nomsAMasquer()).rejects.toThrow("rien n'est envoyé");
  });

  it("un nom repéré une fois reste masqué quand il revient sans ce qui le désignait", async () => {
    const premier = await masquerSurLesEleves(["Son frère Thaddée viendra, Mme Roussel aussi. Elle habite à Sarcelles."]);
    expect(premier.textes[0]).not.toMatch(/Thaddée|Roussel|Sarcelles/);
    await retenirLesReperes(premier.table);
    // La réponse restaurée repart au tour suivant, ou à la passe suivante d'une réunion.
    const second = await masquerSurLesEleves(["Thaddée viendra. Roussel accompagne l'élève depuis Sarcelles."]);
    expect(second.textes[0]).not.toMatch(/Thaddée|Roussel|Sarcelles/);
  });

  it("ce qui est repéré ne se masque qu'à sa majuscule, et seulement sur les élèves", async () => {
    const premier = await masquerSurLesEleves(["Mme Bouleau vient."]);
    await retenirLesReperes(premier.table);
    expect((await masquerSurLesEleves(["Un bouleau, Mme Bouleau."])).textes[0]).toBe("Un bouleau, Mme [P1].");
    expect(await nomsAMasquer()).not.toContain("Bouleau");
  });

  it("une voix ne reçoit jamais un nom : un son ne se restaure pas", async () => {
    const premier = await masquerSurLesEleves(["Son frère Thaddée vient."]);
    await retenirLesReperes(premier.table);
    expect(await pourLaVoix("Barnabé a lu avec Thaddée.")).toBe("une personne a lu avec une personne.");
    expect(await pourLaVoix("Lire une histoire.")).toBe("Lire une histoire.");
  });

  it("l'Assistant ne donne à la voix et au système que du masqué", () => {
    const assistant = Object.values(import.meta.glob("./pages/Assistant.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>)[0];
    expect(assistant).toContain("pourLaVoix(t)");
    expect(assistant).not.toContain("api.voixLire(t)");
    expect(assistant).not.toContain("consigneDuDocument(doc.nom)");
    expect(assistant).toMatch(/masquerSurLesEleves\(\[memoire, consigne\.contexte, doc\?\.nom/);
  });
});
