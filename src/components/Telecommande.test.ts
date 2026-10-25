import { beforeEach, describe, expect, it, vi } from "vitest";

// La fenêtre de la télécommande, sans Tauri ni écran : l'API répond d'ici, et Mistral dit ce qu'on lui fait dire.
const reglages: Record<string, string> = {};
let reponseDeMistral = "";
vi.mock("../api", async (importOriginal) => {
  const o = await importOriginal<typeof import("../api")>();
  return {
    ...o,
    api: {
      ...o.api,
      elevesList: async () => [{ id: "e1", nom: "Barnabé Lune" }],
      settingGet: async (cle: string) => reglages[cle] ?? null,
      mistralChat: async () => reponseDeMistral,
      recherche: async () => [],
      sequencesList: async () => [], seancesList: async () => [], jeuxList: async () => [],
      outilsClasseList: async () => [], textesList: async () => [], dossiersBureau: async () => [],
      commentaireSave: async () => {},
    },
  };
});

import { decider, executer } from "./Telecommande";

describe("la fenêtre de la télécommande", () => {
  beforeEach(() => {
    for (const cle of Object.keys(reglages)) delete reglages[cle];
    vi.stubGlobal("window", { dispatchEvent: () => true, location: { hash: "#/caa" }, history: { back: () => {} }, innerHeight: 800 });
    vi.stubGlobal("document", { querySelector: () => null, scrollingElement: null });
  });

  it("une page des élèves attend le « oui » du téléphone ; le « non » n'affiche rien", async () => {
    const nav = vi.fn();
    const q = await executer("Va dans les réglages", nav);
    expect(q).toMatchObject({ ok: true, aConfirmer: "Afficher « Réglages » au tableau ?" });
    expect(nav).not.toHaveBeenCalled();
    expect(await decider(q.id!, false, nav)).toMatchObject({ fait: "Rien n'est affiché." });
    expect(nav).not.toHaveBeenCalled();
    const encore = await executer("Va dans les réglages", nav);
    expect(await decider(encore.id!, true, nav)).toMatchObject({ ok: true, fait: "Réglages : affiché." });
    expect(nav).toHaveBeenCalledWith("/reglages");
    // Une question ne sert qu'une fois.
    expect(await decider(encore.id!, true, nav)).toMatchObject({ ok: false });
  });

  it("une page de la classe s'affiche tout de suite", async () => {
    const nav = vi.fn();
    expect(await executer("Affiche le plan de travail", nav)).toMatchObject({ ok: true, fait: "Plan de travail : affiché." });
    expect(nav).toHaveBeenCalledWith("/plan");
  });

  it("avec Mistral, la suite de la phrase attend le « oui », puis se fait dans l'ordre", async () => {
    reglages["telecommande:mistral"] = "oui";
    reponseDeMistral = JSON.stringify({ actions: [{ action: "page", page: "Réglages" }, { action: "page", page: "Plan de travail" }] });
    const nav = vi.fn();
    const q = await executer("Va dans les réglages puis dans le plan de travail", nav);
    expect(q).toMatchObject({ aConfirmer: "Afficher « Réglages » au tableau ?" });
    expect(nav).not.toHaveBeenCalled();
    const r = await decider(q.id!, true, nav);
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/reglages", "/plan"]);
    expect(r).toMatchObject({ ok: true, fait: "Réglages : affiché. Plan de travail : affiché." });
  });
});
