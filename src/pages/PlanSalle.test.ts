import { describe, it, expect } from "vitest";
import { idsDuCreneau, remplirPlacesLibres } from "./PlanSalle";
import type { Creneau, Eleve } from "../api";

const eleve = (id: string): Eleve => ({
  id, nom: id.toUpperCase(), niveau: "", present: true, ine: "",
  dateNaissance: "", photoFichier: null,
});
const CLASSE = ["a", "b", "c"].map(eleve);

const creneau = (elevesJson: string): Creneau => ({
  id: "c1", date: "2026-08-24", heureDebut: "09:00", heureFin: "10:30",
  matiere: "Scolarité", couleur: "teal", seanceId: null, atelierId: null,
  espaceId: null, elevesJson,
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
