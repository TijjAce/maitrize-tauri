import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentaireEleve, Creneau, ObservationEleve } from "./api";
import type { Vocal } from "./vocaux";

const etat = {
  vocaux: [] as Vocal[],
  creneaux: [] as Creneau[],
  observations: [] as ObservationEleve[],
  journal: [] as { id: string; prevu: string; bilan: string }[],
  effaces: [] as string[],
  fiches: [] as ObservationEleve[],
  notes: [] as CommentaireEleve[],
  toasts: [] as string[],
  pointsAjoutes: [] as string[],
};
vi.mock("./components/Toaster", () => ({ toast: (message: string) => { etat.toasts.push(message); } }));
vi.mock("./api", () => ({
  newId: (() => { let n = 0; return () => `id${++n}`; })(),
  nowIso: () => "2026-10-03T21:00:00.000Z",
  texteErreur: (e: unknown) => String(e),
  api: {
    vocauxList: async () => etat.vocaux.map((v) => ({ ...v })),
    creneauxList: async (debut: string, fin: string) =>
      etat.creneaux.filter((c) => c.date.slice(0, 10) >= debut && c.date.slice(0, 10) <= fin).map((c) => ({ ...c })),
    creneauJournalSave: async (id: string, prevu: string, bilan: string) => {
      etat.journal.push({ id, prevu, bilan });
      etat.creneaux = etat.creneaux.map((c) => (c.id === id ? { ...c, prevu, bilan } : c));
    },
    vocalDelete: async (id: string) => { etat.effaces.push(id); etat.vocaux = etat.vocaux.filter((v) => v.id !== id); },
    notesRapidesAjouter: async (texte: string) => { etat.pointsAjoutes.push(texte); return etat.pointsAjoutes.map((t) => `- ${t}`).join("\n"); },
    observationsList: async () => etat.observations,
    elevesList: async () => [{ id: "e1", nom: "Ayub Martin" }, { id: "e2", nom: "Nour Ben" }],
    seancesList: async () => [],
    observationSave: async (o: ObservationEleve) => { etat.fiches.push(o); return o; },
    commentairesList: async () => etat.notes,
    commentaireSave: async (n: CommentaireEleve) => { etat.notes = [...etat.notes.filter((x) => x.id !== n.id), n]; return n; },
    commentaireDelete: async (id: string) => { etat.notes = etat.notes.filter((x) => x.id !== id); },
  },
}));

import { aQuelqueChoseADire, aVerser, verserCeQuiEstPret } from "./versementDesVocaux";
import { EVT_NOTE_AJOUTEE, type NoteAjoutee } from "./notesRapides";
import { enAttente } from "./journalEnAttente";

const creneau = (id: string, heureDebut: string, heureFin: string, matiere: string, plus: Partial<Creneau> = {}): Creneau => ({
  id, date: "2026-10-02", heureDebut, heureFin, matiere, couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...plus,
});
const vocal = (id: string, debut: string, texte: string, plus: Partial<Vocal> = {}): Vocal => ({
  id, fichier: `vocal-${id}.wav`, debut, dureeS: 6, texte, etat: "transcrit", erreur: "", creneauId: "", dateCreation: "", ...plus,
});

beforeEach(() => {
  etat.vocaux = []; etat.creneaux = []; etat.observations = []; etat.journal = []; etat.effaces = []; etat.fiches = []; etat.notes = []; etat.toasts = [];
  etat.pointsAjoutes = [];
  enAttente.clear();
  // Pas de fenêtre sous Node : une cible d'événements en tient lieu.
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("CustomEvent", class extends Event { detail: unknown; constructor(t: string, o?: { detail?: unknown }) { super(t); this.detail = o?.detail; } });
});

describe("ce qui peut se verser", () => {
  it("un texte fait seulement de passages inaudibles ne dit rien", () => {
    expect(aQuelqueChoseADire("On a joué au jeu collectif.")).toBe(true);
    expect(aQuelqueChoseADire("  […] […] ")).toBe(false);
    expect(aQuelqueChoseADire("")).toBe(false);
  });

  it("une dictée transcrite va au créneau choisi sur le téléphone, sinon à celui de l'heure", () => {
    const jeux = creneau("c1", "11:00", "12:00", "Jeux collectifs");
    const lecture = creneau("c2", "09:00", "10:00", "Lecture");
    const { prets, sansCreneau } = aVerser([
      vocal("v1", "2026-10-02T21:05:00", "Avec Ayub, ça s'est bien passé.", { creneauId: "c1" }),
      vocal("v2", "2026-10-02T09:30:00", "Lecture à deux voix."),
      vocal("v3", "2026-10-02T18:00:00", "Rien à cette heure-là."),
      vocal("v4", "2026-10-02T09:30:00", "", { etat: "recu" }),
      vocal("v5", "2026-10-02T09:30:00", "[…]"),
    ], [jeux, lecture]);
    expect(prets.map((p) => `${p.vocal.id}→${p.creneau.id}`)).toEqual(["v1→c1", "v2→c2"]);
    expect(sansCreneau.map((v) => v.id)).toEqual(["v3"]);
  });
});

describe("le versement automatique", () => {
  it("verse à la suite du bilan, porte aux notes des élèves ce qui les nomme, efface la dictée et l'annonce", async () => {
    etat.creneaux = [creneau("c1", "11:00", "12:00", "Jeux collectifs", { bilan: "Écrit à la main.", elevesJson: '["e1","e2"]' })];
    etat.vocaux = [
      vocal("v1", "2026-10-02T21:05:00", "On a joué au jeu collectif avec Ayub et ça s'est bien passé.", { creneauId: "c1" }),
      vocal("n1", "2026-10-02T11:20:00", "Nour a gagné deux fois.", { dureeS: 0 }),
      vocal("v3", "2026-10-02T18:00:00", "Sans créneau."),
    ];
    await verserCeQuiEstPret();
    // Rien n'est écrasé : ce qui était écrit reste, la dictée puis la note suivent.
    expect(etat.creneaux[0].bilan).toBe("Écrit à la main.\nOn a joué au jeu collectif avec Ayub et ça s'est bien passé.\nNour a gagné deux fois.");
    expect(etat.effaces).toEqual(["v1", "n1"]);
    // Chaque élève nommé reçoit une note : ce qui le nomme, et rien d'autre. Aucune fiche ne naît.
    const note = (eleve: string) => etat.notes.find((n) => n.eleveId === eleve)?.texte ?? "";
    expect(note("e1")).toBe("Jeux collectifs : On a joué au jeu collectif avec Ayub et ça s'est bien passé.");
    expect(note("e2")).toBe("Jeux collectifs : Nour a gagné deux fois.");
    expect(etat.fiches).toEqual([]);
    // Ce qui est versé s'annonce ; ce qui n'a pas de créneau aussi, une seule fois.
    expect(etat.toasts.filter((t) => t.includes("versée dans le bilan de 11:00 Jeux collectifs"))).toHaveLength(2);
    expect(etat.toasts.filter((t) => t.includes("pas trouvé de créneau"))).toHaveLength(1);
    await verserCeQuiEstPret();
    expect(etat.toasts.filter((t) => t.includes("pas trouvé de créneau"))).toHaveLength(1);
    expect(etat.vocaux.map((v) => v.id)).toEqual(["v3"]);
  });

  it("ne touche pas un bilan qu'on est en train de taper", async () => {
    vi.useFakeTimers();
    etat.creneaux = [creneau("c1", "11:00", "12:00", "Jeux collectifs")];
    etat.vocaux = [vocal("v1", "2026-10-02T11:10:00", "Dictée.")];
    enAttente.set("c1", async () => {});
    await verserCeQuiEstPret();
    expect(etat.journal).toEqual([]);
    // La frappe enregistrée, le versement repasse de lui-même.
    enAttente.clear();
    await vi.advanceTimersByTimeAsync(16_000);
    expect(etat.creneaux[0].bilan).toBe("Dictée.");
    vi.useRealTimers();
  });
});

describe("ce que le téléphone envoie aux notes rapides", () => {
  it("devient un point des notes rapides, sans chercher de créneau, puis s'efface", async () => {
    etat.creneaux = [creneau("c1", "10:00", "11:00", "Maths")];
    etat.vocaux = [
      vocal("v1", "2026-10-02T10:12:00", "Acheter des feutres", { destination: "notes" }),
      vocal("n1", "2026-10-02T10:20:00", "Photocopier la fiche", { destination: "notes", dureeS: 0, fichier: "" }),
      vocal("v2", "2026-10-02T10:30:00", "On a compté jusqu'à 30."),
    ];
    const vus: NoteAjoutee[] = [];
    window.addEventListener(EVT_NOTE_AJOUTEE, (e) => { vus.push((e as CustomEvent<NoteAjoutee>).detail); });
    await verserCeQuiEstPret();
    expect(etat.pointsAjoutes).toEqual(["Acheter des feutres", "Photocopier la fiche"]);
    expect(etat.effaces).toEqual(["v1", "n1", "v2"]);
    // Le bilan du créneau n'a reçu que ce qui allait au cahier journal.
    expect(etat.journal.map((j) => j.bilan)).toEqual(["On a compté jusqu'à 30."]);
    // Le panneau ouvert reçoit les notes telles qu'elles sont, et le point.
    expect(vus.map((v) => v.texte)).toEqual(["Acheter des feutres", "Photocopier la fiche"]);
    expect(vus[1].notes).toBe("- Acheter des feutres\n- Photocopier la fiche");
    expect(etat.toasts.filter((t) => t.includes("aux notes rapides"))).toEqual([
      "Dictée ajoutée aux notes rapides : « Acheter des feutres »",
      "Note ajoutée aux notes rapides : « Photocopier la fiche »",
    ]);
  });

  it("n'attend pas de créneau, et ne se signale pas comme perdu", async () => {
    const pourLesNotes = vocal("v1", "2026-10-04T20:00:00", "Rendre les cahiers", { destination: "notes" });
    expect(aVerser([pourLesNotes], [])).toEqual({ prets: [], sansCreneau: [] });
    // Rien à écrire : il reste dans Réglages › Téléphone, sans rien ajouter.
    etat.vocaux = [vocal("v2", "2026-10-04T20:00:00", "[…]", { destination: "notes" })];
    await verserCeQuiEstPret();
    expect(etat.pointsAjoutes).toEqual([]);
    expect(etat.effaces).toEqual([]);
    expect(etat.toasts).toEqual([]);
  });
});
