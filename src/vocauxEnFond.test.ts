import { describe, it, expect, vi, beforeEach } from "vitest";

const etat = { liste: [] as { id: string; etat: string }[], appels: [] as string[], rate: new Set<string>() };
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("./api", () => ({
  api: {
    vocauxList: async () => etat.liste.map((v) => ({ ...v })),
    vocalTranscrire: async (id: string) => {
      etat.appels.push(id);
      const v = etat.liste.find((x) => x.id === id)!;
      if (etat.rate.has(id)) { v.etat = "echec"; throw new Error("moteur occupé"); }
      v.etat = "transcrit";
      return v;
    },
  },
}));

import { EVT_VOCAUX, prochainATranscrire, retranscrire, transcrireCeQuiAttend, vocalEnCours } from "./vocauxEnFond";

const evenements: string[] = [];
beforeEach(() => {
  etat.liste = []; etat.appels = []; etat.rate = new Set(); evenements.length = 0;
  // Pas de fenêtre sous Node : une cible d'événements en tient lieu.
  const cible = new EventTarget();
  cible.addEventListener(EVT_VOCAUX, () => evenements.push(vocalEnCours()));
  vi.stubGlobal("window", cible);
});

describe("le prochain vocal à transcrire", () => {
  it("prend les vocaux reçus d'abord, puis une fois chaque échec", () => {
    const vocaux = [{ id: "e1", etat: "echec" }, { id: "t1", etat: "transcrit" }, { id: "r1", etat: "recu" }, { id: "r2", etat: "recu" }];
    expect(prochainATranscrire(vocaux, new Set())).toBe("r1");
    expect(prochainATranscrire(vocaux, new Set(["r1"]))).toBe("r2");
    expect(prochainATranscrire(vocaux, new Set(["r1", "r2"]))).toBe("e1");
    expect(prochainATranscrire(vocaux, new Set(["r1", "r2", "e1"]))).toBe("");
    expect(prochainATranscrire([], new Set())).toBe("");
  });
});

describe("la transcription en tâche de fond", () => {
  it("transcrit tout ce qui attend, un vocal après l'autre, et le dit à l'écran", async () => {
    etat.liste = [{ id: "a", etat: "recu" }, { id: "b", etat: "transcrit" }, { id: "c", etat: "recu" }];
    await transcrireCeQuiAttend();
    expect(etat.appels).toEqual(["a", "c"]);
    expect(etat.liste.map((v) => v.etat)).toEqual(["transcrit", "transcrit", "transcrit"]);
    // Un signal au début et à la fin de chaque vocal : l'écran sait lequel est en cours.
    expect(evenements).toEqual(["a", "", "c", ""]);
    expect(vocalEnCours()).toBe("");
  });

  it("ne reprend pas en boucle un vocal qui échoue — mais le reprend à la demande", async () => {
    etat.liste = [{ id: "x", etat: "recu" }, { id: "y", etat: "recu" }];
    etat.rate = new Set(["x"]);
    await transcrireCeQuiAttend();
    expect(etat.appels).toEqual(["x", "y"]);
    expect(etat.liste.map((v) => v.etat)).toEqual(["echec", "transcrit"]);
    // Un nouveau passage ne le retente pas de lui-même.
    await transcrireCeQuiAttend();
    expect(etat.appels).toEqual(["x", "y"]);
    // « Réessayer » le fait repartir.
    etat.rate = new Set();
    retranscrire("x");
    await vi.waitFor(() => expect(etat.liste[0].etat).toBe("transcrit"));
    expect(etat.appels).toEqual(["x", "y", "x"]);
  });

  it("ne lance pas deux chaînes à la fois", async () => {
    etat.liste = [{ id: "seul", etat: "recu" }];
    await Promise.all([transcrireCeQuiAttend(), transcrireCeQuiAttend(), transcrireCeQuiAttend()]);
    expect(etat.appels).toEqual(["seul"]);
  });
});
