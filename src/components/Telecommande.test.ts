import { beforeEach, describe, expect, it, vi } from "vitest";

// La fenêtre de la télécommande, sans Tauri ni écran : l'API répond d'ici, et Mistral dit ce qu'on lui fait dire.
const reglages: Record<string, string> = {};
let reponseDeMistral = "";
// Ce que la télécommande crée, et ce qu'« annule » retire.
const sequencesCreees: { id: string; titre: string; matiere: string; niveau?: string; periode: number; cycle: string }[] = [];
const seancesCreees: { id: string; titre: string; numero: number; sequenceId: string | null; date: string | null; duree: number }[] = [];
const retirees: string[] = [];
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
      sequencesList: async () => [{ id: "q-v", titre: "Les volcans" }],
      seancesList: async (id?: string) => (id === "q-v" ? [{ id: "s1", numero: 1 }, { id: "s2", numero: 2 }] : []),
      jeuxList: async () => [],
      outilsClasseList: async () => [], textesList: async () => [], dossiersBureau: async () => [],
      commentaireSave: async () => {},
      referentielsList: async () => [],
      sequenceSave: async (s: (typeof sequencesCreees)[number]) => { sequencesCreees.push(s); },
      seanceSave: async (s: (typeof seancesCreees)[number]) => { seancesCreees.push(s); },
      sequenceDelete: async (id: string) => { retirees.push(id); },
      seanceDelete: async (id: string) => { retirees.push(id); },
    },
  };
});

import { decider, executer } from "./Telecommande";

describe("la fenêtre de la télécommande", () => {
  beforeEach(() => {
    for (const cle of Object.keys(reglages)) delete reglages[cle];
    for (const l of [sequencesCreees, seancesCreees, retirees]) l.length = 0;
    vi.stubGlobal("window", {
      dispatchEvent: () => true, location: { hash: "#/caa" }, history: { back: () => {} }, innerHeight: 800, setTimeout: globalThis.setTimeout,
    });
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

  it("crée une séquence après le « oui » seulement, l'affiche, et « annule » la retire", async () => {
    const nav = vi.fn();
    const phrase = "Crée une séquence de sciences sur les volcans au CM1 en période 2";
    const q = await executer(phrase, nav);
    expect(q).toMatchObject({ ok: true, aConfirmer: "Créer la séquence « Les volcans » (Sciences et techno., CM1, période 2) ?" });
    expect(await decider(q.id!, false, nav)).toMatchObject({ fait: "Rien n'est créé." });
    expect(sequencesCreees).toEqual([]);
    const encore = await executer(phrase, nav);
    expect(await decider(encore.id!, true, nav)).toMatchObject({ ok: true, fait: "Séquence « Les volcans » créée. « Annule » la retire." });
    expect(sequencesCreees).toMatchObject([{ titre: "Les volcans", matiere: "Sciences et techno.", niveau: "CM1", periode: 2, cycle: "Cycle 3" }]);
    expect(nav).toHaveBeenLastCalledWith(`/sequences/${sequencesCreees[0].id}`);
    expect(await executer("Annule", nav)).toMatchObject({ ok: true, fait: "Annulé." });
    await new Promise((r) => setTimeout(r, 0));
    expect(retirees).toEqual([sequencesCreees[0].id]);
  });

  it("ajoute une séance à la suite de la séquence nommée, à son jour ; sans séquence, il la demande", async () => {
    const nav = vi.fn();
    const q = await executer("Ajoute une séance de 50 minutes à la séquence des volcans : les éruptions", nav);
    expect(q).toMatchObject({ aConfirmer: "Créer la séance 3 « Les éruptions » dans « Les volcans », 50 min ?" });
    await decider(q.id!, true, nav);
    expect(seancesCreees).toMatchObject([{ titre: "Les éruptions", numero: 3, sequenceId: "q-v", duree: 50, date: null }]);
    expect(nav).toHaveBeenLastCalledWith(`/seances/${seancesCreees[0].id}`);
    // La séquence affichée, quand la phrase n'en nomme pas.
    window.location.hash = "#/sequences/q-v";
    expect(await executer("Crée une séance", nav)).toMatchObject({ aConfirmer: "Créer la séance 3 dans « Les volcans » ?" });
    window.location.hash = "#/caa";
    expect(await executer("Crée une séance", nav)).toMatchObject({ ok: false, fait: expect.stringMatching(/^Dans quelle séquence \?/) });
    expect(await executer("Ajoute une séance à la séquence des pirates", nav)).toMatchObject({ ok: false, fait: "Aucune séquence ne s'appelle « des pirates »." });
  });

  it("une séquence toute faite : celle que son titre nomme, à sa classe et sa période ; sinon il demande laquelle", async () => {
    const nav = vi.fn();
    expect(await executer("Crée la séquence toute faite de la symétrie au CE2", nav))
      .toMatchObject({ ok: false, fait: "Laquelle ? « La symétrie axiale », « La symétrie axiale : reconnaître et compléter une figure ». Dites quelques mots de son titre." });
    const q = await executer("Crée la séquence toute faite de la technique de la multiplication au CE2", nav);
    expect(q).toMatchObject({
      ok: true, aConfirmer: expect.stringMatching(/^Créer la séquence toute faite « La technique de la multiplication, des paquets au quadrillage \(CE2\) » \(période 4\) : \d+ séances et leurs feuilles \?$/),
    });
    expect(await decider(q.id!, false, nav)).toMatchObject({ fait: "Rien n'est créé." });
    expect(await executer("Crée la séquence toute faite des volcans", nav)).toMatchObject({ ok: false, fait: "Aucune séquence toute faite ne parle de « Les volcans »." });
  }, 60_000);
});

