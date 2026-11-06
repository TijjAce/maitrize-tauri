// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { nouvelleSeance, nouvelleSequence, type Creneau, type Seance } from "./api";
import { tempsDeLaSeance } from "./documentSeance";
import { creneauDArrivee, heureEnLettres, lireDemande, memeMatiere, planDuReport, type Arrivee, type Calendrier } from "./reportsDuTelephone";
import type { SlotEdt } from "./organisation";

// Novembre 2026 : le lundi 2, le mardi 3, le mercredi 4, le vendredi 6, le lundi 9 ; le mercredi 11 est férié.
const creneau = (id: string, date: string, heureDebut: string, matiere: string, champs: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut, heureFin: "", matiere, couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...champs,
});
const slot = (jour: string, heureDebut: string, titre: string): SlotEdt => ({ id: `${jour}-${heureDebut}`, jour, heureDebut, heureFin: "10:00", titre, couleur: "" });
const calendrier: Calendrier = { feries: { "2026-11-11": "Armistice 1918" }, vacances: [] };
const sansEdt = () => [];

const sequence = { ...nouvelleSequence(), id: "seq", titre: "Les nombres jusqu'à 20", matiere: "Mathématiques", nbSeancesPrevu: 6 };
const seance = (id: string, titre: string, numero: number, deroulement = ""): Seance =>
  ({ ...nouvelleSeance("seq", numero), id, titre, deroulement });
const enTemps = [
  "Objectif : dénombrer jusqu'à 20.",
  "## Temps 1 – Rituel du nombre (5 min)", "Le nombre du jour.",
  "## Temps 2 – Découverte (15 min)", "Les boîtes de dix.",
  "## Temps 3 – Recherche (15 min)", "Par deux.",
  "## Temps 4 – Mise en commun (10 min)", "Au tableau.",
].join("\n");
const s3 = seance("s3", "Compter par dizaines", 3, enTemps);
const s5 = seance("s5", "Les doubles", 5);

describe("reporter une séance depuis le téléphone (demande de l'enseignant, 4 novembre 2026)", () => {
  it("lit la demande du téléphone, et les temps d'une séance tels qu'il les propose", () => {
    expect(lireDemande('{"jour":"2026-11-02","seance":"Compter","temps":[{"rang":2,"titre":"Temps 3 – Recherche"},{"x":1}]}'))
      .toEqual({ jour: "2026-11-02", seance: "Compter", temps: [{ rang: 2, titre: "Temps 3 – Recherche" }] });
    expect(lireDemande('{"jour":"2026-11-02"}')).toEqual({ jour: "2026-11-02", seance: "", temps: [] });
    expect(lireDemande("pas du json")).toBeNull();
    expect(lireDemande('{"seance":"x"}')).toBeNull();
    expect(tempsDeLaSeance(s3)).toEqual(["Temps 1 – Rituel du nombre", "Temps 2 – Découverte", "Temps 3 – Recherche", "Temps 4 – Mise en commun"]);
    // Une séance d'avant, en tableau : une phase par ligne.
    const tableau = { ...s5, tableauDeroulement: JSON.stringify([["Phase", "Durée", "Déroulement"], ["Découverte", "10", "…"], ["Entraînement", "20", "…"]]) };
    expect(tempsDeLaSeance(tableau)).toEqual(["Découverte", "Entraînement"]);
    expect(tempsDeLaSeance(s5)).toEqual([]);
    expect(tempsDeLaSeance(undefined)).toEqual([]);
    expect(heureEnLettres("09:00")).toBe("9 h");
    expect(heureEnLettres("13:30")).toBe("13 h 30");
    expect(heureEnLettres("")).toBe("");
    expect(memeMatiere("Mathématiques", " mathematiques ")).toBe(true);
    expect(memeMatiere("", "")).toBe(false);
  });

  it("va au prochain créneau de la même matière, dès le lendemain, un jour de classe", () => {
    const lundi = creneau("l", "2026-11-02", "09:00", "Mathématiques");
    // Le lendemain a son créneau de maths : c'est lui, même s'il est l'après-midi.
    const mardi = [creneau("m1", "2026-11-03", "09:00", "Lecture"), creneau("m2", "2026-11-03", "14:00", "Mathématiques")];
    expect(creneauDArrivee(lundi, [lundi, ...mardi], sansEdt, calendrier)?.creneau.id).toBe("m2");
    // Un jour rempli sans maths passe son tour ; un jour férié aussi ; le week-end aussi.
    const tard = [creneau("m1", "2026-11-03", "09:00", "Lecture"), creneau("j", "2026-11-05", "10:00", "mathematiques")];
    expect(creneauDArrivee(lundi, tard, sansEdt, calendrier)?.creneau.id).toBe("j");
    const mardi10 = creneau("t", "2026-11-10", "09:00", "Mathématiques");
    expect(creneauDArrivee(mardi10, [creneau("f", "2026-11-11", "09:00", "Mathématiques"), creneau("j", "2026-11-12", "09:00", "Mathématiques")], sansEdt, calendrier)?.creneau.id).toBe("j");
    const vendredi = creneau("v", "2026-11-06", "09:00", "Mathématiques");
    expect(creneauDArrivee(vendredi, [creneau("s", "2026-11-07", "09:00", "Mathématiques"), creneau("l9", "2026-11-09", "09:00", "Mathématiques")], sansEdt, calendrier)?.creneau.id).toBe("l9");
    // En vacances : après elles.
    const toussaint: Calendrier = { feries: {}, vacances: [{ description: "Vacances", debut: "2026-11-03", fin: "2026-11-09" }] };
    expect(creneauDArrivee(lundi, [creneau("m2", "2026-11-03", "09:00", "Mathématiques"), creneau("l9", "2026-11-09", "09:00", "Mathématiques")], sansEdt, toussaint)?.creneau.id).toBe("l9");
  });

  it("prend le créneau de l'emploi du temps pour un jour que le planning n'a pas encore rempli, et rien au-delà de trois semaines", () => {
    const lundi = creneau("l", "2026-11-02", "09:00", "Mathématiques");
    const edt = () => [slot("Mardi", "08:30", "Lecture"), slot("Mardi", "10:15", "Mathématiques")];
    const a = creneauDArrivee(lundi, [lundi], edt, calendrier);
    expect(a?.nouveau).toBe(true);
    expect(a?.creneau).toMatchObject({ date: "2026-11-03", heureDebut: "10:15", heureFin: "10:00", matiere: "Mathématiques", seanceId: null, prevu: "" });
    // Sans créneau de cette matière, ni au planning ni à l'emploi du temps : rien.
    expect(creneauDArrivee(lundi, [lundi], () => [slot("Mardi", "08:30", "Lecture")], calendrier)).toBeNull();
    expect(creneauDArrivee(lundi, [creneau("loin", "2026-11-30", "09:00", "Mathématiques")], sansEdt, calendrier)).toBeNull();
  });

  const vers = (c: Creneau, nouveau = false): Arrivee => ({ creneau: c, nouveau });
  const tous = [s3, s5];
  const sequences = [sequence];

  it("reporte toute la séance : elle quitte son créneau, qui dit où elle est partie, et se pose au lendemain", () => {
    const source = creneau("l", "2026-11-02", "09:00", "Mathématiques", { seanceId: "s3", bilan: "Absents : deux." });
    const plan = planDuReport({ jour: "2026-11-02", temps: [] }, source, vers(creneau("m", "2026-11-03", "14:00", "Mathématiques", { prevu: "Fiche p. 12" })), tous, sequences);
    if ("erreur" in plan) throw new Error(plan.erreur);
    expect(plan.source.seanceId).toBeNull();
    expect(plan.source.bilan).toBe("Absents : deux.\n↪ « Compter par dizaines » reportée au mardi 3 novembre, 14 h.");
    expect(plan.arrivee.seanceId).toBe("s3");
    expect(plan.arrivee.prevu).toBe("↪ Séance reportée du lundi 2 novembre.\nFiche p. 12");
    expect(plan.resume).toBe("« Compter par dizaines » reportée au mardi 3 novembre, 14 h.");
    // Tous les temps cochés : c'est toute la séance.
    const tousLesTemps = tempsDeLaSeance(s3).map((titre, rang) => ({ rang, titre }));
    const meme = planDuReport({ jour: "2026-11-02", temps: tousLesTemps }, source, vers(creneau("m", "2026-11-03", "14:00", "Mathématiques")), tous, sequences);
    expect("erreur" in meme ? null : meme.source.seanceId).toBeNull();
  });

  it("cite la séance par la ligne 📚 quand le créneau du lendemain a déjà la sienne ; citée au prévu, sa ligne s'en va", () => {
    const occupe = creneau("m", "2026-11-03", "14:00", "Mathématiques", { seanceId: "s5" });
    const posee = planDuReport({ jour: "2026-11-02" }, creneau("l", "2026-11-02", "09:00", "Mathématiques", { seanceId: "s3" }), vers(occupe), tous, sequences);
    if ("erreur" in posee) throw new Error(posee.erreur);
    expect(posee.arrivee.seanceId).toBe("s5");
    expect(posee.arrivee.prevu).toBe("↪ Séance reportée du lundi 2 novembre.\n📚 Les nombres jusqu'à 20 · séance 3/6 : Compter par dizaines");
    // La séance citée par le prévu : sa ligne quitte le créneau, le reste du prévu y reste.
    const source = creneau("l", "2026-11-02", "09:00", "Mathématiques", { prevu: "Rituel : la date\n📚 Les nombres jusqu'à 20 · séance 3/6 : Compter par dizaines\nFiche p. 12" });
    const citee = planDuReport({ jour: "2026-11-02" }, source, vers(creneau("m", "2026-11-03", "14:00", "Mathématiques")), tous, sequences);
    if ("erreur" in citee) throw new Error(citee.erreur);
    expect(citee.source.prevu).toBe("Rituel : la date\nFiche p. 12");
    expect(citee.source.seanceId).toBeNull();
    expect(citee.arrivee.seanceId).toBe("s3");
  });

  it("reporte quelques temps : la séance reste à son créneau, et le lendemain dit les temps à reprendre", () => {
    const source = creneau("l", "2026-11-02", "09:00", "Mathématiques", { seanceId: "s3" });
    const demande = { jour: "2026-11-02", temps: [{ rang: 2, titre: "Temps 3 – Recherche" }, { rang: 3, titre: "Temps 4 – Mise en commun" }] };
    const plan = planDuReport(demande, source, vers(creneau("n", "2026-11-03", "10:15", "Mathématiques"), true), tous, sequences);
    if ("erreur" in plan) throw new Error(plan.erreur);
    expect(plan.source.seanceId).toBe("s3");
    expect(plan.source.bilan).toBe("↪ Reporté au mardi 3 novembre, 10 h 15 : Temps 3 – Recherche ; Temps 4 – Mise en commun.");
    expect(plan.arrivee.seanceId).toBe("s3");
    expect(plan.arrivee.prevu).toBe("↪ Suite de la séance du lundi 2 novembre : Temps 3 – Recherche ; Temps 4 – Mise en commun.");
    expect(plan.nouveau).toBe(true);
    expect(plan.resume).toBe("2 temps de « Compter par dizaines » reportés au mardi 3 novembre, 10 h 15 (créneau ajouté d'après l'emploi du temps).");
    // Un temps renommé depuis : retrouvé par son rang.
    const renomme = planDuReport({ jour: "2026-11-02", temps: [{ rang: 3, titre: "Temps 4 – Bilan" }] }, source, vers(creneau("n", "2026-11-03", "10:15", "Mathématiques")), tous, sequences);
    expect("erreur" in renomme ? "" : renomme.arrivee.prevu).toBe("↪ Suite de la séance du lundi 2 novembre : Temps 4 – Mise en commun.");
  });

  it("sans séance, reporte le prévu ; sans rien, ne reporte rien", () => {
    const source = creneau("l", "2026-11-02", "09:00", "Lecture", { prevu: "Fiche de lecture p. 12\nLecture offerte" });
    const plan = planDuReport({ jour: "2026-11-02" }, source, vers(creneau("m", "2026-11-03", "09:00", "Lecture", { prevu: "Dictée" })), tous, sequences);
    if ("erreur" in plan) throw new Error(plan.erreur);
    expect(plan.source.prevu).toBe("");
    expect(plan.source.bilan).toBe("↪ Prévu reporté au mardi 3 novembre, 9 h.");
    expect(plan.arrivee.prevu).toBe("↪ Reporté du lundi 2 novembre :\nFiche de lecture p. 12\nLecture offerte\nDictée");
    expect(planDuReport({ jour: "2026-11-02" }, creneau("l", "2026-11-02", "09:00", "Lecture"), vers(creneau("m", "2026-11-03", "09:00", "Lecture")), tous, sequences))
      .toEqual({ erreur: "Rien à reporter : le créneau n'avait ni séance ni prévu." });
  });
});
