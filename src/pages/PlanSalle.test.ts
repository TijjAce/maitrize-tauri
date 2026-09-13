import { describe, it, expect } from "vitest";
import { idsDuCreneau, remplirPlacesLibres, nomsDesPlaces, profilDuCreneau, planDuCreneau, assisDansProfil } from "./PlanSalle";
import type { Creneau, Eleve } from "../api";

const eleve = (id: string): Eleve => ({
  id, nom: id.toUpperCase(), niveau: "", present: true, ine: "",
  dateNaissance: "", photoFichier: null,
});
const CLASSE = ["a", "b", "c"].map(eleve);

const creneau = (elevesJson: string): Creneau => ({
  id: "c1", date: "2026-08-24", heureDebut: "09:00", heureFin: "10:30",
  matiere: "Scolarité", couleur: "teal", seanceId: null, atelierId: null,
  espaceId: null, elevesJson, nature: "classe", prevu: "", bilan: "",
});

describe("idsDuCreneau", () => {
  it("rend le groupe restreint quand il y en a un", () => {
    expect(idsDuCreneau(creneau('["a","c"]'), CLASSE)).toEqual(["a", "c"]);
  });

  it("rend toute la classe quand aucun élève n'est coché", () => {
    expect(idsDuCreneau(creneau("[]"), CLASSE)).toEqual(["a", "b", "c"]);
  });

  it("écarte un élève supprimé resté dans la liste", () => {
    expect(idsDuCreneau(creneau('["a","disparu"]'), CLASSE)).toEqual(["a"]);
  });

  it("rend une salle vide si le groupe ne contient que des inconnus", () => {
    // Volontaire : un groupe restreint dont les élèves n'existent plus n'est
    // pas la classe entière. Retomber sur tout le monde installerait dans la
    // salle des élèves qui n'ont jamais été affectés à ce créneau.
    expect(idsDuCreneau(creneau('["disparu"]'), CLASSE)).toEqual([]);
  });

  it("ne casse pas sur un JSON illisible", () => {
    expect(idsDuCreneau(creneau("{pas du json"), CLASSE)).toEqual(["a", "b", "c"]);
  });

  it("rend une liste vide sans créneau", () => {
    expect(idsDuCreneau(undefined, CLASSE)).toEqual([]);
  });
});

describe("remplirPlacesLibres", () => {
  // Deux rangées : p1 p2 devant, p3 p4 derrière.
  const PLACES = [
    { id: "p3", x: 10, y: 200 }, { id: "p1", x: 10, y: 100 },
    { id: "p4", x: 90, y: 200 }, { id: "p2", x: 90, y: 100 },
  ];
  const tousPresents = (id: string | undefined) => !!id;

  it("remplit dans l'ordre de lecture, quel que soit l'ordre des places", () => {
    const out = remplirPlacesLibres(PLACES, {}, ["a", "b", "c"], tousPresents);
    expect(out).toEqual({ p1: "a", p2: "b", p3: "c" });
  });

  it("ne déloge personne d'une place déjà occupée", () => {
    const out = remplirPlacesLibres(PLACES, { p1: "z" }, ["a"], tousPresents);
    expect(out.p1).toBe("z");
    expect(out.p2).toBe("a");
  });

  it("réutilise la place d'un élève absent de ce créneau", () => {
    // « z » n'est pas présent : sa place compte comme libre.
    const present = (id: string | undefined) => id !== "z";
    const out = remplirPlacesLibres(PLACES, { p1: "z" }, ["a"], present);
    expect(out.p1).toBe("a");
  });

  it("laisse debout les élèves en trop plutôt que d'écraser", () => {
    const out = remplirPlacesLibres(PLACES.slice(0, 2), {}, ["a", "b", "c"], tousPresents);
    expect(Object.keys(out)).toHaveLength(2);
    expect(Object.values(out)).not.toContain("c");
  });

  it("ne modifie pas l'occupation reçue", () => {
    const occupation = { p1: "z" };
    remplirPlacesLibres(PLACES, occupation, ["a"], tousPresents);
    expect(occupation).toEqual({ p1: "z" });
  });

  it("ne fait rien quand il n'y a personne à placer", () => {
    expect(remplirPlacesLibres(PLACES, { p1: "z" }, [], tousPresents)).toEqual({ p1: "z" });
  });
});

describe("nomsDesPlaces", () => {
  const pl = (id: string, x: number, y: number, label = "") =>
    ({ id, type: "place" as const, x, y, w: 70, h: 70, label });

  it("numérote dans l'ordre de lecture, pas dans l'ordre de création", () => {
    const noms = nomsDesPlaces([pl("c", 90, 200), pl("a", 10, 100), pl("b", 90, 100)]);
    expect([noms.a, noms.b, noms.c]).toEqual(["Place 1", "Place 2", "Place 3"]);
  });

  it("préfère l'étiquette saisie", () => {
    const noms = nomsDesPlaces([pl("a", 10, 10, "Îlot 1·1"), pl("b", 90, 10)]);
    expect(noms).toEqual({ a: "Îlot 1·1", b: "Place 2" });
  });

  it("ignore une étiquette qui n'est que des espaces", () => {
    expect(nomsDesPlaces([pl("a", 10, 10, "   ")]).a).toBe("Place 1");
  });
});

describe("profilDuCreneau", () => {
  const profils = [
    { id: "p1", nom: "Frontal", elements: [] },
    { id: "p2", nom: "Îlots", elements: [] },
  ];
  const base = { profils, plans: {}, plansMatiere: {}, profilCreneau: {}, profilMatiere: {} };
  const c = creneau("[]");

  it("retient l'agencement donné au créneau", () => {
    expect(profilDuCreneau({ ...base, profilCreneau: { c1: "p2" } }, c)?.nom).toBe("Îlots");
  });

  it("retombe sur celui de la matière", () => {
    expect(profilDuCreneau({ ...base, profilMatiere: { "Scolarité": "p2" } }, c)?.nom).toBe("Îlots");
  });

  it("le choix du créneau prime sur celui de la matière", () => {
    const etat = { ...base, profilCreneau: { c1: "p1" }, profilMatiere: { "Scolarité": "p2" } };
    expect(profilDuCreneau(etat, c)?.nom).toBe("Frontal");
  });

  it("prend le premier agencement à défaut", () => {
    expect(profilDuCreneau(base, c)?.nom).toBe("Frontal");
  });

  it("ne rend rien sans agencement du tout", () => {
    expect(profilDuCreneau({ ...base, profils: [] }, c)).toBeUndefined();
  });

  it("ignore un agencement supprimé et n'invente pas de remplaçant", () => {
    // Le créneau pointe vers un agencement disparu : mieux vaut rien
    // qu'un plan pris dans une autre disposition.
    expect(profilDuCreneau({ ...base, profilCreneau: { c1: "effacé" } }, c)).toBeUndefined();
  });
});

describe("planDuCreneau", () => {
  const plan = { places: { s1: "a" }, notes: {} };
  const base = { profils: [], plans: {}, plansMatiere: {}, profilCreneau: {}, profilMatiere: {} };

  it("rend le plan propre au créneau", () => {
    expect(planDuCreneau({ ...base, plans: { c1: plan } }, creneau("[]"))).toEqual(plan);
  });

  it("hérite de celui de la matière", () => {
    expect(planDuCreneau({ ...base, plansMatiere: { "Scolarité": plan } }, creneau("[]"))).toEqual(plan);
  });

  it("rend un plan vide sans créneau", () => {
    expect(planDuCreneau(base, undefined)).toEqual({ places: {}, notes: {} });
  });
});

describe("assisDansProfil", () => {
  const places = [{ id: "i1" }, { id: "i2" }];
  const tous = (id: string | undefined) => !!id;

  it("compte les élèves assis sur les places de cet agencement", () => {
    const plan = { places: { i1: "a", i2: "b" }, notes: {} };
    expect(assisDansProfil(places, plan, tous)).toHaveLength(2);
  });

  it("ignore les places d'un autre agencement", () => {
    // « s1 » vient d'une autre disposition : la compter afficherait
    // « 3 placés sur 2 présents ».
    const plan = { places: { i1: "a", s1: "b" }, notes: {} };
    expect(assisDansProfil(places, plan, tous)).toEqual([["i1", "a"]]);
  });

  it("ignore un élève absent du créneau", () => {
    const plan = { places: { i1: "a", i2: "absent" }, notes: {} };
    expect(assisDansProfil(places, plan, (id) => id === "a")).toEqual([["i1", "a"]]);
  });

  it("rend une liste vide pour un agencement sans place", () => {
    expect(assisDansProfil([], { places: { i1: "a" }, notes: {} }, tous)).toEqual([]);
  });
});
