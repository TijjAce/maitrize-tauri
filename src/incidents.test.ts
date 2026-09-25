import { describe, it, expect } from "vitest";
import { dureeLisible, forme, noterEchec, noterSucces, type EtatIncidents } from "./incidents";

const T0 = new Date("2026-09-25T09:00:00Z").getTime();
const min = (n: number) => T0 + n * 60_000;

describe("journal d'incidents", () => {
  it("écrit le premier échec, compte les suivants en silence", () => {
    const etat: EtatIncidents = new Map();
    expect(noterEchec(etat, "sync_deltas", "Envoi impossible : Host is down", T0))
      .toEqual(["ÉCHEC sync_deltas : Envoi impossible : Host is down"]);
    for (let i = 1; i <= 40; i++) {
      expect(noterEchec(etat, "sync_deltas", "Envoi impossible : Host is down", min(i))).toEqual([]);
    }
    expect(etat.get("sync_deltas")!.fois).toBe(41);
  });

  it("reconnaît le même incident à un chiffre près", () => {
    const etat: EtatIncidents = new Map();
    noterEchec(etat, "sync_deltas", "timeout après 4.02s", T0);
    expect(noterEchec(etat, "sync_deltas", "timeout après 4.11s", min(1))).toEqual([]);
    expect(forme("timeout après 4.02s")).toBe(forme("timeout après 4.11s"));
  });

  it("referme la série quand ça remarche", () => {
    const etat: EtatIncidents = new Map();
    noterEchec(etat, "sync_deltas", "Host is down", T0);
    noterEchec(etat, "sync_deltas", "Host is down", min(90));
    expect(noterSucces(etat, "sync_deltas")).toEqual([
      "ÉCHEC sync_deltas : la même erreur 2 fois de suite, sur 1 h 30",
    ]);
    // La série est close : la réussite suivante n'écrit rien.
    expect(noterSucces(etat, "sync_deltas")).toEqual([]);
  });

  it("ne résume pas un échec unique", () => {
    const etat: EtatIncidents = new Map();
    noterEchec(etat, "vacances_scolaires", "Réseau", T0);
    expect(noterSucces(etat, "vacances_scolaires")).toEqual([]);
  });

  it("referme la série précédente quand l'erreur change", () => {
    const etat: EtatIncidents = new Map();
    noterEchec(etat, "sync_deltas", "Host is down", T0);
    noterEchec(etat, "sync_deltas", "Host is down", min(3));
    expect(noterEchec(etat, "sync_deltas", "Phrase secrète absente", min(4))).toEqual([
      "ÉCHEC sync_deltas : la même erreur 2 fois de suite, sur 3 min",
      "ÉCHEC sync_deltas : Phrase secrète absente",
    ]);
  });

  it("suit chaque commande pour elle-même", () => {
    const etat: EtatIncidents = new Map();
    noterEchec(etat, "sync_deltas", "Host is down", T0);
    expect(noterEchec(etat, "sync_fichiers", "Host is down", T0))
      .toEqual(["ÉCHEC sync_fichiers : Host is down"]);
  });

  it("dit la durée sans compter les secondes", () => {
    expect(dureeLisible(0)).toBe("0 s");
    expect(dureeLisible(45_000)).toBe("45 s");
    expect(dureeLisible(3 * 60_000)).toBe("3 min");
    expect(dureeLisible(80 * 60_000)).toBe("1 h 20");
  });
});
