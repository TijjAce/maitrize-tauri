import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../api";

// La banque de l'essai : des mots exacts, comme arasaac_par_mots.
const BANQUE: Record<string, number> = { chat: 1, cheval: 2, oiseau: 3, chou: 4, "œuf": 5, chaton: 6, poule: 7, poussin: 8 };
const appels: { messages: ChatMessage[]; json: boolean }[] = [];
let reponses: (string | Error)[] = [];

vi.mock("../api", () => ({
  api: {
    arasaacParMots: vi.fn(async (mots: string[]) => [
      mots.filter((m) => m in BANQUE).map((m) => ({ id: BANQUE[m], mot: m, fichier: "" })),
      mots.filter((m) => !(m in BANQUE)),
    ]),
    mistralChat: vi.fn(async (messages: ChatMessage[], _modele: string, json = false) => {
      appels.push({ messages: messages.map((m) => ({ ...m })), json });
      const r = reponses.shift();
      if (r instanceof Error) throw r;
      return r ?? "";
    }),
    modeleActif: vi.fn(async () => "ministral-8b-latest"),
  },
  newId: () => "nouveau",
  nowIso: () => "2026-10-19T10:00:00.000Z",
}));
// Une photo prise par l'enseignant, gardée dans Mes pictos sous « le lapereau ».
vi.mock("../mesPictos", async (avant) => ({
  ...(await avant<typeof import("../mesPictos")>()),
  lireMesPictos: vi.fn(async () => [{ id: -5, mot: "le lapereau", fichier: "lapereau.jpg", origine: "photo", date: "2026-10-01" }]),
}));
// Un prénom inventé, pour l'essai : il ne doit jamais partir chez Mistral.
vi.mock("../nomsAMasquer", () => ({ nomsAMasquer: vi.fn(async () => ["Pimprenelle"]) }));

import { creerAvecLIA, pictosPourLesMots, retoucherAvecLIA } from "./GenerateursPerso";

const RECETTE = {
  nom: "Les petits des animaux", icone: "🐣", quoi: "Relier les animaux à leurs petits.", classe: "CP", moment: "entrainement",
  blocs: [{ sorte: "relier", consigne: "Je relie chaque animal à son petit.", paires: [["chat", "chaton"], ["poule", "poussin"], ["lapin", "lapereau"]], combien: 3 }],
};

beforeEach(() => { appels.length = 0; reponses = []; });

describe("les images des mots d'un générateur", () => {
  it("prennent le mot exact, puis sans article ou au singulier, puis la photo gardée", async () => {
    const trouves = await pictosPourLesMots(["chat", "le chat", "chevaux", "oiseaux", "choux", "oeuf", "lapereau", "zèbre", ""]);
    expect(Object.fromEntries(trouves.map((p) => [p.mot, p.id]))).toEqual({
      chat: 1, "le chat": 1, chevaux: 2, oiseaux: 3, choux: 4, oeuf: 5, lapereau: -5,
    });
  });
});

describe("ce qu'on demande à Mistral", () => {
  it("part sans les prénoms, en mode JSON, et revient avec ses images", async () => {
    reponses = [JSON.stringify(RECETTE)];
    const g = await creerAvecLIA("Pour Pimprenelle : relier les animaux à leurs petits.", "CP");
    expect(appels).toHaveLength(1);
    expect(appels[0].json).toBe(true);
    expect(JSON.stringify(appels[0].messages)).not.toContain("Pimprenelle");
    expect(appels[0].messages[1].content).toContain("[P1]");
    expect(g.demande).toBe("Pour Pimprenelle : relier les animaux à leurs petits.");
    const relier = g.blocs[0];
    expect(relier.sorte === "relier" && relier.paires.map(([a, b]) => [a.id, b.id])).toEqual([[1, 6], [7, 8], [null, -5]]);
  });

  it("redemande sans le mode JSON quand le modèle le refuse, puis une seconde fois si la réponse n'est pas lisible", async () => {
    reponses = [new Error("Mistral a refusé la demande (code 400) : response_format"), "Je ne sais pas.", `Voici : ${JSON.stringify(RECETTE)}`];
    const g = await creerAvecLIA("Relier les animaux à leurs petits.", "CP");
    expect(appels.map((a) => a.json)).toEqual([true, false, false]);
    expect(g.nom).toBe("Les petits des animaux");
    reponses = ["Non.", "Toujours pas."];
    await expect(creerAvecLIA("Relier les animaux.", "CP")).rejects.toThrow(/pas proposé d'exercice lisible/);
    // Une autre erreur — le réseau, la clé — ne se rattrape pas.
    reponses = [new Error("Clé API Mistral refusée.")];
    await expect(creerAvecLIA("Relier les animaux.", "CP")).rejects.toThrow("Clé API Mistral refusée.");
  });

  it("retouche sans perdre les images choisies", async () => {
    reponses = [JSON.stringify(RECETTE)];
    const g = await creerAvecLIA("Relier les animaux à leurs petits.", "CP");
    const avecPhoto = { ...g, blocs: g.blocs.map((b) => (b.sorte === "relier" ? { ...b, paires: b.paires.map(([a, c]) => [a.mot === "chat" ? { id: null, mot: "chat", photo: "chat.jpg" } : a, c] as typeof b.paires[number]) } : b)) };
    reponses = [JSON.stringify({ ...RECETTE, blocs: [{ ...RECETTE.blocs[0], paires: [...RECETTE.blocs[0].paires, ["cheval", "poulain"]] }] })];
    const r = await retoucherAvecLIA(avecPhoto, "Ajoute le cheval.");
    expect(r.id).toBe(g.id);
    const relier = r.blocs[0];
    expect(relier.sorte === "relier" && relier.paires[0][0]).toEqual({ id: null, mot: "chat", photo: "chat.jpg" });
    expect(relier.sorte === "relier" && relier.paires[3].map((e) => e.id)).toEqual([2, null]);
  });
});
