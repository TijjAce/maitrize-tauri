import { describe, it, expect, vi, beforeEach } from "vitest";

const etat = {
  liste: [] as { id: string; etat: string; debut?: string }[], appels: [] as string[], rate: new Set<string>(),
  sansSon: new Set<string>(), toasts: [] as { message: string; action?: string }[],
};
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("./components/Toaster", () => ({
  toast: (message: string, opts: { action?: { label: string } } = {}) => { etat.toasts.push({ message, action: opts.action?.label }); },
}));
vi.mock("./api", () => ({
  api: {
    vocauxList: async () => etat.liste.map((v) => ({ ...v })),
    vocalTranscrire: async (id: string) => {
      etat.appels.push(id);
      const v = etat.liste.find((x) => x.id === id)!;
      if (etat.rate.has(id)) { v.etat = "echec"; throw new Error("moteur occupé"); }
      // Comme côté Rust : un son disparu marque le vocal, qui revient sans erreur.
      v.etat = etat.sansSon.has(id) ? "perdu" : "transcrit";
      return { ...v };
    },
  },
}));

import { EVT_VOCAUX, prochainATranscrire, retranscrire, transcrireCeQuiAttend, vocalEnCours } from "./vocauxEnFond";

const evenements: string[] = [];
beforeEach(() => {
  etat.liste = []; etat.appels = []; etat.rate = new Set(); etat.sansSon = new Set(); etat.toasts = []; evenements.length = 0;
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

  it("ne prend jamais un vocal perdu, même avec la mémoire vide d'une réouverture", () => {
    expect(prochainATranscrire([{ id: "p1", etat: "perdu" }], new Set())).toBe("");
    expect(prochainATranscrire([{ id: "p1", etat: "perdu" }, { id: "e1", etat: "echec" }], new Set())).toBe("e1");
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

  it("dit une fois qu'une dictée a perdu son son, et ne la reprend plus — même à la réouverture", async () => {
    etat.liste = [{ id: "p", etat: "recu", debut: "2026-10-14T10:18:18" }, { id: "q", etat: "recu" }];
    etat.sansSon = new Set(["p"]);
    await transcrireCeQuiAttend();
    expect(etat.appels).toEqual(["p", "q"]);
    expect(etat.liste.map((v) => v.etat)).toEqual(["perdu", "transcrit"]);
    expect(etat.toasts).toEqual([{
      message: "La dictée du mercredi 14 octobre à 10h18 n'a plus son enregistrement : elle ne peut pas être transcrite.",
      action: "Voir",
    }]);
    // L'application se rouvre : la mémoire des essais repart de zéro, et le vocal perdu ne repart pas.
    vi.resetModules();
    const rouverte = await import("./vocauxEnFond");
    await rouverte.transcrireCeQuiAttend();
    expect(etat.appels).toEqual(["p", "q"]);
    expect(etat.toasts).toHaveLength(1);
  });

  it("ne lance pas deux chaînes à la fois", async () => {
    etat.liste = [{ id: "seul", etat: "recu" }];
    await Promise.all([transcrireCeQuiAttend(), transcrireCeQuiAttend(), transcrireCeQuiAttend()]);
    expect(etat.appels).toEqual(["seul"]);
  });
});
