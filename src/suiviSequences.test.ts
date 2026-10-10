import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({
  newId: () => "id" + Math.random().toString(36).slice(2, 8),
  nowIso: () => "2026-09-30T10:00:00.000Z",
  anneeScolaireActuelle: () => "2026-2027",
}));

import type { Creneau, Seance, Sequence } from "./api";
import {
  avancement, bornesDeLAnnee, ilYA, jourProche, joursEntre, libelleDuPassage, libelleDuSuivi, passagesParSequence, rangerParActivite,
  suiviDeLaSequence, suivisDesSequences,
} from "./suiviSequences";

const sequence = (id: string, titre: string, p: Partial<Sequence> = {}): Sequence => ({
  id, titre, matiere: "Français", cycle: "", objectifs: "", competences: "", competenceVisee: "", imageNom: null, couleur: "blue",
  dateCreation: "2026-09-01T10:00:00.000Z", periode: 1, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0,
  ratingDateMaj: null, projetId: null, video: "", dossier: "", nbSeancesPrevu: 0, etat: "", dateMaj: "", ...p,
});
const seance = (id: string, sequenceId: string, numero: number, titre: string): Seance => ({
  id, titre, numero, objectifs: "", competences: "", deroulement: "", materiel: "", duree: 45, date: null, tableauDeroulement: "[]",
  imagesDeroulement: "[]", bilan: "", bilanDate: null, sequenceId, dateMaj: "",
});
const creneau = (id: string, date: string, p: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut: "09:00", heureFin: "10:00", matiere: "Français", couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...p,
});

const AUJOURDHUI = "2026-09-30";
const fractions = sequence("q1", "Les fractions décimales", { nbSeancesPrevu: 4 });
const jardin = sequence("q2", "Le jardin de l'école");
const seances = [
  seance("a", "q1", 1, "Partager une pizza"), seance("b", "q1", 2, "Les dixièmes"), seance("c", "q1", 3, "Placer sur la droite"), seance("d", "q1", 4, "Comparer"),
  seance("j", "q2", 1, "Semer"),
];

describe("les passages en classe", () => {
  it("se lisent dans les créneaux : la séance posée, ou la séquence citée dans le prévu", () => {
    const creneaux = [
      creneau("c1", "2026-09-10", { seanceId: "a" }),
      creneau("c2", "2026-09-14", { prevu: "📚 Les fractions décimales — séance 2 : Les dixièmes\nAtelier cubes", bilan: "Bien compris." }),
      creneau("c3", "2026-09-16", { prevu: "Retour sur les fractions décimales" }),
      creneau("c4", "2026-09-17", { nature: "reunion", prevu: "Les fractions décimales en réunion" }),
      creneau("c5", "2026-09-18", { seanceId: "b", prevu: "📚 Les fractions décimales — séance 2 : Les dixièmes" }),
    ];
    const par = passagesParSequence(creneaux, [fractions, jardin], seances);
    expect(par.get("q2")).toBeUndefined();
    expect(par.get("q1")!.map((p) => `${p.date}:${p.seance?.numero ?? "-"}`)).toEqual(["2026-09-10:1", "2026-09-14:2", "2026-09-16:-", "2026-09-18:2"]);
    expect(par.get("q1")![1].bilan).toBe("Bien compris.");
  });
});

describe("l'état d'une séquence", () => {
  const siennes = seances.filter((s) => s.sequenceId === "q1");

  it("est « en préparation » tant qu'aucune séance n'est passée en classe", () => {
    const s = suiviDeLaSequence({ ...fractions, dateMaj: "2026-09-28T09:00:00.000Z" }, siennes, [], AUJOURDHUI);
    expect(s.etat).toBe("preparation");
    expect(s.suivante?.numero).toBe(1);
    expect(libelleDuSuivi(s, AUJOURDHUI)).toBe("En préparation · modifiée il y a 2 jours");
    expect(avancement(s)).toBe(0);
  });

  it("est « en classe » dès la première séance faite, et dit la prochaine", () => {
    const passages = passagesParSequence([
      creneau("c1", "2026-09-10", { seanceId: "a" }), creneau("c2", "2026-09-24", { seanceId: "b" }), creneau("c3", "2026-10-01", { seanceId: "c" }),
    ], [fractions], seances).get("q1")!;
    const s = suiviDeLaSequence(fractions, siennes, passages, AUJOURDHUI);
    expect(s.etat).toBe("classe");
    expect(s.faites.map((x) => x.numero)).toEqual([1, 2]);
    expect(s.demarreeLe).toBe("2026-09-10");
    expect(s.prochain?.date).toBe("2026-10-01");
    expect(s.suivante?.numero).toBe(3);
    expect(avancement(s)).toBe(0.5);
    expect(libelleDuSuivi(s, AUJOURDHUI)).toBe("En classe depuis le 10/09 · séance 2/4 · prochaine demain");
  });

  it("garde les jours où elle a été posée dans le cahier journal, faits et à venir, chacun en une étiquette", () => {
    const passages = passagesParSequence([
      creneau("c1", "2026-09-10", { seanceId: "a" }), creneau("c2", "2026-10-01", { seanceId: "c", heureDebut: "14:10" }),
      creneau("c3", "2026-10-08", { prevu: "📚 Les fractions décimales" }),
    ], [fractions], seances).get("q1")!;
    const s = suiviDeLaSequence(fractions, siennes, passages, AUJOURDHUI);
    expect(s.passages.map((p) => p.date)).toEqual(["2026-09-10"]);
    expect(s.aVenir.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-08"]);
    expect([...s.passages, ...s.aVenir].map(libelleDuPassage)).toEqual(["jeu. 10/09 · 9h00 · séance 1", "jeu. 01/10 · 14h10 · séance 3", "jeu. 08/10 · 9h00"]);
  });

  it("compte la séance d'aujourd'hui comme faite, et dit quand rien n'est posé", () => {
    const passages = passagesParSequence([creneau("c1", AUJOURDHUI, { seanceId: "a" })], [fractions], seances).get("q1")!;
    const s = suiviDeLaSequence(fractions, siennes, passages, AUJOURDHUI);
    expect(s.etat).toBe("classe");
    expect(libelleDuSuivi(s, AUJOURDHUI)).toBe("En classe depuis le 30/09 · séance 1/4 · aucune séance posée");
  });

  it("est « terminée » quand toutes les séances prévues sont faites", () => {
    const passages = passagesParSequence(
      ["a", "b", "c", "d"].map((id, i) => creneau(`c${i}`, `2026-09-1${i + 1}`, { seanceId: id })), [fractions], seances).get("q1")!;
    const s = suiviDeLaSequence(fractions, siennes, passages, AUJOURDHUI);
    expect(s.etat).toBe("terminee");
    expect(s.suivante).toBeNull();
    expect(libelleDuSuivi(s, AUJOURDHUI)).toBe("Terminée le 14/09 · 4 séances");
  });

  it("passe « en pause » après trois semaines sans suite ni séance posée", () => {
    const passages = passagesParSequence([creneau("c1", "2026-09-01", { seanceId: "a" })], [fractions], seances).get("q1")!;
    const s = suiviDeLaSequence(fractions, siennes, passages, AUJOURDHUI);
    expect(s.etat).toBe("pause");
    expect(libelleDuSuivi(s, AUJOURDHUI)).toBe("En pause · dernière séance il y a 4 semaines · séance 1/4");
    // Une séance posée plus tard la remet en classe.
    const avecSuite = passagesParSequence([creneau("c1", "2026-09-01", { seanceId: "a" }), creneau("c2", "2026-10-06", { seanceId: "b" })], [fractions], seances).get("q1")!;
    expect(suiviDeLaSequence(fractions, siennes, avecSuite, AUJOURDHUI).etat).toBe("classe");
  });

  it("obéit à ce que l'enseignant a tranché", () => {
    const passages = passagesParSequence([creneau("c1", "2026-09-28", { seanceId: "a" })], [fractions], seances).get("q1")!;
    expect(suiviDeLaSequence({ ...fractions, etat: "terminee" }, siennes, passages, AUJOURDHUI).etat).toBe("terminee");
    const pause = suiviDeLaSequence({ ...fractions, etat: "pause" }, siennes, [], AUJOURDHUI);
    expect(pause.etat).toBe("pause");
    expect(pause.manuel).toBe("pause");
    expect(libelleDuSuivi(pause, AUJOURDHUI)).toBe("En pause");
  });

  it("compte les séances écrites quand rien n'est prévu, et ne se termine pas sans nombre prévu", () => {
    const passages = passagesParSequence([creneau("c1", "2026-09-28", { seanceId: "j" })], [jardin], seances).get("q2")!;
    const s = suiviDeLaSequence(jardin, seances.filter((x) => x.sequenceId === "q2"), passages, AUJOURDHUI);
    expect(s.prevues).toBe(1);
    expect(s.etat).toBe("terminee");
    const sansSeance = suiviDeLaSequence(sequence("q3", "Sans séance écrite"), [], passages, AUJOURDHUI);
    expect(sansSeance.etat).toBe("classe");
    expect(libelleDuSuivi(sansSeance, AUJOURDHUI)).toBe("En classe depuis le 28/09 · 1 séance faite · aucune séance posée");
  });

  it("se calcule pour toutes les séquences d'un coup, et se range par activité", () => {
    const creneaux = [creneau("c1", "2026-09-20", { seanceId: "j" }), creneau("c2", "2026-09-25", { seanceId: "a" })];
    const tout = suivisDesSequences([fractions, jardin, sequence("q3", "Brouillon", { dateMaj: "2026-09-29T08:00:00.000Z" })], seances, creneaux, AUJOURDHUI);
    expect([...tout.values()].map((s) => `${s.sequence.id}:${s.etat}`)).toEqual(["q1:classe", "q2:terminee", "q3:preparation"]);
    expect(rangerParActivite([...tout.values()]).map((s) => s.sequence.id)).toEqual(["q1", "q2", "q3"]);
  });
});

describe("les dates qu'on lit", () => {
  it("comptent les jours, et les disent comme on parle", () => {
    expect(joursEntre("2026-09-28", "2026-09-30")).toBe(2);
    expect(joursEntre("2026-10-02", "2026-09-30")).toBe(-2);
    expect(ilYA("2026-09-30T08:00:00.000Z", AUJOURDHUI)).toBe("aujourd'hui");
    expect(ilYA("2026-09-29", AUJOURDHUI)).toBe("hier");
    expect(ilYA("2026-09-25", AUJOURDHUI)).toBe("il y a 5 jours");
    expect(ilYA("2026-09-09", AUJOURDHUI)).toBe("il y a 3 semaines");
    expect(ilYA("2026-06-30", AUJOURDHUI)).toBe("il y a 3 mois");
    expect(ilYA("2024-09-30", AUJOURDHUI)).toBe("il y a 2 ans");
    expect(ilYA("2026-10-01", AUJOURDHUI)).toBe("demain");
    expect(jourProche("2026-09-30", AUJOURDHUI)).toBe("aujourd'hui");
    expect(jourProche("2026-10-01", AUJOURDHUI)).toBe("demain");
    expect(jourProche("2026-10-02", AUJOURDHUI)).toBe("vendredi 2");
    expect(jourProche("2026-10-12", AUJOURDHUI)).toBe("12/10");
  });

  it("bornent l'année scolaire du 1er août au 31 juillet", () => {
    expect(bornesDeLAnnee("2026-2027")).toEqual(["2026-08-01", "2027-07-31"]);
    expect(bornesDeLAnnee("")[0].endsWith("-08-01")).toBe(true);
  });
});
