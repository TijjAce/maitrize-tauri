import { describe, expect, it } from "vitest";
import type { Ecart, ElementPasse, EtatPasse } from "./api";
import {
  avecEnClair, bilanDesEcarts, deQuand, elementsRanges, etiquette, libelleEnClair, motifEnClair, nomDeLaChose, quandEnClair, rangerLesEtats,
} from "./revenirEnArriere";

const etat = (nom: string, date: string, motif = "auto"): EtatPasse => ({ nom, date, motif, octets: 1 });
const maintenant = new Date(2026, 9, 20, 15, 0, 0); // mardi 20 octobre 2026, 15 h

describe("revenir en arrière", () => {
  it("range les états par rangée, du plus récent au plus ancien", () => {
    const rangees = rangerLesEtats([
      etat("a", "2026-10-20T09:05:00"),
      etat("b", "2026-10-20T14:05:00"),
      etat("c", "2026-10-19T17:40:00"),
      etat("d", "2026-10-13T17:40:00"),
      etat("e", "2026-08-31T12:00:00"),
      etat("f", "2026-10-20T00:58:02", "avant-v1.6.32"),
    ], maintenant);
    expect(rangees.map((r) => [r.titre, r.etats.map((e) => e.nom)])).toEqual([
      ["Aujourd'hui", ["b", "a", "f"]],
      ["Hier", ["c"]],
      ["Ce mois-ci", ["d"]],
      ["Plus ancien", ["e"]],
    ]);
  });

  it("dit chaque état en clair", () => {
    expect(quandEnClair(etat("a", "2026-10-20T14:05:00"), maintenant)).toBe("aujourd'hui à 14:05");
    expect(quandEnClair(etat("c", "2026-10-19T09:12:00"), maintenant)).toBe("hier à 09:12");
    expect(quandEnClair(etat("d", "2026-10-13T17:40:00"), maintenant)).toBe("mardi 13 octobre à 17:40");
    expect(quandEnClair(etat("j", "2026-10-18", "jour"), maintenant)).toBe("dimanche 18 octobre, en début de journée");
    expect(etiquette(etat("a", "2026-10-20T14:05:00"), maintenant)).toBe("14:05");
    expect(deQuand(etat("c", "2026-10-19T09:12:00"), maintenant)).toBe("d'hier à 09:12");
    expect(deQuand(etat("d", "2026-10-13T17:40:00"), maintenant)).toBe("du mardi 13 octobre à 17:40");
    expect(motifEnClair("avant-v1.6.33")).toBe("avant le passage à la 1.6.33");
    expect(motifEnClair("avant-retour")).toBe("avant un retour en arrière");
    expect(motifEnClair("auto")).toBe("");
  });

  it("dit ce qu'un retour changerait, les plus grosses tables d'abord", () => {
    const e = (table: string, extra: Partial<Ecart>): Ecart => ({
      table, revenues: 0, parties: 0, changees: 0, exemplesRevenues: [], exemplesParties: [], exemplesChangees: [], ...extra,
    });
    const bilan = bilanDesEcarts([
      e("sequences", { revenues: 1, exemplesRevenues: ["Les nombres"], changees: 2, exemplesChangees: ["Lire", "Écrire"] }),
      e("projets", { parties: 1, exemplesParties: ["Le cirque"] }),
      e("creneaux", { changees: 14, exemplesChangees: ["2026-10-19 · Lecture"] }),
    ]);
    expect(bilan.revenues).toEqual(["1 séquence (Les nombres)"]);
    expect(bilan.parties).toEqual(["1 projet (Le cirque)"]);
    expect(bilan.changees).toEqual(["14 créneaux (19/10 · Lecture…)", "2 séquences (Lire, Écrire)"]);
  });

  it("dit ce qu'on peut reprendre seul, les éléments supprimés d'abord", () => {
    const el = (table: string, libelle: string, supprime: boolean, avec: [string, number][] = []): ElementPasse => ({ table, id: libelle, libelle, supprime, avec });
    const { supprimes, modifies } = elementsRanges([
      el("seances", "Compter", false),
      el("sequences", "Les nombres", true, [["seances", 8]]),
      el("projets", "Le potager", true),
      el("sequences", "Les fractions", false),
      el("creneaux", "2026-10-19 · Lecture", false),
    ]);
    expect(supprimes.map((e) => e.libelle)).toEqual(["Le potager", "Les nombres"]);
    expect(modifies.map((e) => e.libelle)).toEqual(["Les fractions", "Compter", "2026-10-19 · Lecture"]);
    expect(nomDeLaChose("sequences")).toBe("séquence");
    expect(nomDeLaChose("inconnue")).toBe("élément");
    expect(libelleEnClair(modifies[2])).toBe("19/10 · Lecture");
    expect(avecEnClair([["seances", 8]])).toBe("8 séances");
    expect(avecEnClair([["commentaires_eleve", 2], ["documents_eleve", 1]])).toBe("2 observations et 1 dossier d'élève");
    expect(avecEnClair([])).toBe("");
    expect(motifEnClair("avant-reprise")).toBe("avant la reprise d'un élément");
    expect(motifEnClair("avant-synchro")).toBe("avant un gros envoi de l'autre ordinateur");
  });
});
