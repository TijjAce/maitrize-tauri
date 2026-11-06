// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import type { Creneau, Seance, Sequence } from "./api";
import {
  AIDES, COLONNES_A_NOMMER, ECHELLE_LSU, ECHELLE_MATERNELLE, aObserver, ceQuIlsSauront, cleDeLaGrille, echelleDe, elevesDeLaSequence,
  estUneGrille, htmlGrilleObservables, lireGrille, niveauSuivant, observablesDeLaSequence,
} from "./grillesObservables";

const seance = (id: string, numero: number, objectifs: string) => ({ id, numero, titre: `Séance ${numero}`, objectifs });

const sequence = (id: string, titre: string): Sequence => ({
  id, titre, matiere: "Mathématiques", cycle: "", objectifs: "", competences: "", competenceVisee: "", imageNom: null, couleur: "blue",
  dateCreation: "2026-09-01T10:00:00.000Z", periode: 2, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0,
  ratingDateMaj: null, projetId: null, video: "", dossier: "", nbSeancesPrevu: 0, etat: "", dateMaj: "",
});
const seanceDe = (id: string, sequenceId: string, numero: number, titre: string): Seance => ({
  id, titre, numero, objectifs: "", competences: "", deroulement: "", materiel: "", duree: 40, date: null, tableauDeroulement: "[]",
  imagesDeroulement: "[]", bilan: "", bilanDate: null, sequenceId, dateMaj: "",
});
const creneau = (id: string, p: Partial<Creneau> = {}): Creneau => ({
  id, date: "2026-10-12", heureDebut: "09:00", heureFin: "10:00", matiere: "Mathématiques", couleur: "blue", seanceId: null, atelierId: null,
  espaceId: null, elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...p,
});

describe("les grilles d'observables des séquences (demande de l'enseignant, 31 octobre 2026)", () => {
  it("font de l'objectif de chaque séance un observable, dans l'ordre des séances", () => {
    const obs = observablesDeLaSequence([
      seance("s2", 2, "À la fin de cette séance, les élèves sauront placer la forme dans la bonne case du tableau — 8 essais sur 10."),
      seance("s1", 1, "À la fin de cette séance, les élèves sauront ranger une forme dans le bac de sa forme."),
      seance("s3", 3, ""),
    ]);
    expect(obs.map((o) => [o.id, o.numero, o.texte])).toEqual([
      ["s1", 1, "Ranger une forme dans le bac de sa forme"],
      ["s2", 2, "Placer la forme dans la bonne case du tableau — 8 essais sur 10"],
    ]);
    // Un objectif écrit en liste : une ligne par élément.
    expect(ceQuIlsSauront("- Nommer les couleurs.\n- Trier par couleur ;")).toEqual(["Nommer les couleurs", "Trier par couleur"]);
    expect(observablesDeLaSequence([seance("s1", 1, "1. Compter jusqu'à 5\n2. Montrer 3 avec ses doigts")]).map((o) => o.id)).toEqual(["s1:1", "s1:2"]);
  });

  it("prennent l'échelle du carnet de suivi en maternelle, celle du LSU ensuite, et cyclent au clic", () => {
    expect(echelleDe({ cycle: "", niveau: "GS" })).toBe(ECHELLE_MATERNELLE);
    expect(echelleDe({ cycle: "Cycle 1", niveau: "" })).toBe(ECHELLE_MATERNELLE);
    expect(echelleDe({ cycle: "Cycle 2", niveau: "CP" })).toBe(ECHELLE_LSU);
    expect(ECHELLE_MATERNELLE.map((x) => x.libelle)).toEqual(["Ne réussit pas encore", "En voie de réussite", "Réussit souvent"]);
    expect([undefined, 1, 2, 3].map((n) => niveauSuivant(n, ECHELLE_MATERNELLE))).toEqual([1, 2, 3, undefined]);
    expect(niveauSuivant(4, ECHELLE_LSU)).toBeUndefined();
    expect(cleDeLaGrille("q1")).toBe("grille-sequence:q1");
  });

  it("s'impriment vierges pour noter à la main, ou remplies, l'aide marquée d'une lettre", () => {
    const observables = observablesDeLaSequence([seance("s1", 1, "À la fin de cette séance, les élèves sauront trier <b>")]);
    const eleves = [{ id: "e1", nom: "Prénom-Un" }, { id: "e2", nom: "Prénom-Deux" }];
    const valeurs = { e1: { s1: { n: 3, aide: "geste" } } };
    const remplie = htmlGrilleObservables({ titre: "La séquence", sous: "CP · P2", observables, eleves, valeurs, echelle: ECHELLE_LSU });
    expect(remplie).toContain("Trier &lt;b&gt;");
    expect(remplie).toContain(`background:${ECHELLE_LSU[2].couleur}`);
    expect(remplie).toContain(`<em>${AIDES.find((a) => a.id === "geste")!.lettre}</em>`);
    const vierge = htmlGrilleObservables({ titre: "La séquence", sous: "", observables, eleves, valeurs, echelle: ECHELLE_LSU, vierge: true });
    expect(vierge).not.toContain("<em>");
    expect(vierge.match(/class="go-case"><\/td>/g)).toHaveLength(2);
  });

  it("n'ont pour colonnes que les élèves qui ont eu l'une de ses séances au cahier journal", () => {
    const tableau = sequence("q1", "Le tableau à double entrée");
    const jardin = sequence("q2", "Le jardin de l'école");
    const sequences = [tableau, jardin];
    const seances = [seanceDe("s1", "q1", 1, "Trier"), seanceDe("s2", "q1", 2, "Le tableau"), seanceDe("j1", "q2", 1, "Semer")];
    const classe = ["Un", "Deux", "Trois", "Quatre", "Cinq"].map((n, i) => ({ id: `e${i + 1}`, nom: `Prénom-${n} Exemple` }));
    const creneaux = [
      // La séance posée sur le créneau d'un groupe : ses élèves.
      creneau("c1", { seanceId: "s1", elevesJson: JSON.stringify(["e1", "e2", "e9"]) }),
      // Un créneau de toute la classe, la ligne 📚 au nom d'un élève, comme l'écrit « En retard » : lui seul.
      creneau("c2", { prevu: "Rituel\n📚 Le tableau à double entrée · séance 2/5 : Le tableau — Prénom-Trois" }),
      // Une autre séquence, une réunion : personne.
      creneau("c3", { seanceId: "j1", elevesJson: JSON.stringify(["e4"]), prevu: "📚 Le jardin de l'école · séance 1/3 : Semer" }),
      creneau("c4", { seanceId: "s2", elevesJson: JSON.stringify(["e5"]), nature: "reunion" }),
    ];
    // e9 n'est plus de la classe.
    expect([...elevesDeLaSequence(tableau, creneaux, sequences, seances, classe)].sort()).toEqual(["e1", "e2", "e3"]);
    expect([...elevesDeLaSequence(jardin, creneaux, sequences, seances, classe)]).toEqual(["e4"]);
    // La séquence citée dans le prévu d'un créneau de toute la classe, sans nom : toute la classe.
    const toute = [...creneaux, creneau("c5", { prevu: "Suite de la séquence le tableau a double entree" })];
    expect(elevesDeLaSequence(tableau, toute, sequences, seances, classe).size).toBe(5);
    // Pas encore au cahier journal : personne, et la grille vierge garde des colonnes à nommer à la main.
    expect(elevesDeLaSequence(sequence("q3", "Les nombres jusqu'à 10"), toute, sequences, seances, classe).size).toBe(0);
    const vierge = htmlGrilleObservables({
      titre: "Les nombres jusqu'à 10", sous: "", observables: observablesDeLaSequence([seance("n1", 1, "Compter jusqu'à 10")]),
      eleves: [], valeurs: {}, echelle: ECHELLE_LSU, vierge: true,
    });
    expect(vierge.match(/class="go-eleve"/g)).toHaveLength(COLONNES_A_NOMMER);
    expect(vierge.match(/class="go-case"/g)).toHaveLength(COLONNES_A_NOMMER);
  });

  it("ne montrent que les séquences en cours : en classe, ou finies depuis moins d'une semaine", () => {
    const jour = "2026-11-01";
    expect(aObserver({ etat: "classe", derniereLe: "2026-10-30" }, jour)).toBe(true);
    expect(aObserver({ etat: "terminee", derniereLe: "2026-10-28" }, jour)).toBe(true);
    expect(aObserver({ etat: "terminee", derniereLe: "2026-10-20" }, jour)).toBe(false);
    expect(aObserver({ etat: "pause", derniereLe: "2026-09-20" }, jour)).toBe(false);
    expect(aObserver({ etat: "preparation", derniereLe: null }, jour)).toBe(false);
    expect(aObserver(undefined, jour)).toBe(false);
    expect(estUneGrille(cleDeLaGrille("q1"))).toBe(true);
    expect(estUneGrille("ppi")).toBe(false);
    expect(lireGrille('{"s1":{"n":2}}')).toEqual({ s1: { n: 2 } });
    expect(lireGrille("[1]")).toEqual({});
    expect(lireGrille("pas du JSON")).toEqual({});
  });
});
