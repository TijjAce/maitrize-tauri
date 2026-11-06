// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import type { Creneau, DocumentCoffre, DocumentEleve, EdtTypique, Eleve, ProgrammationFinale, ProgressionAnnuelle, Seance, Sequence } from "./api";
import { planDuTravail, type DonneesTravail } from "./copieDuTravail";
import { lundiDe, anneeScolaireDe } from "./organisationHtml";

// Des élèves inventés : jamais un vrai prénom dans le dépôt.
const eleve = (id: string, nom: string, extra: Partial<Eleve> = {}): Eleve => ({
  id, nom, niveau: "CP", present: true, ine: "", dateNaissance: "", photoFichier: null, ...extra,
});
const creneau = (id: string, date: string, extra: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut: "09:00", heureFin: "10:00", matiere: "Lecture", couleur: "blue", seanceId: null, atelierId: null,
  espaceId: null, elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...extra,
});
const vide = (): DonneesTravail => ({
  eleves: [], commentaires: [], notes: [], evaluations: [], documents: [], papiers: [], progressionsEleve: [], observations: [],
  creneaux: [], sequences: [], seances: [], edts: [], progressions: [], programmations: [], coffre: [],
});
const sequence = (id: string, titre: string, extra: Partial<Sequence> = {}): Sequence => ({
  id, titre, matiere: "Mathématiques", cycle: "", objectifs: "", competences: "", competenceVisee: "", imageNom: null, couleur: "blue",
  dateCreation: "2026-09-01T10:00:00.000Z", periode: 1, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0,
  ratingDateMaj: null, projetId: null, video: "", dossier: "", nbSeancesPrevu: 0, etat: "", dateMaj: "", ...extra,
});
const seance = (id: string, sequenceId: string, numero: number, objectifs: string): Seance => ({
  id, titre: `Séance ${numero}`, numero, objectifs, competences: "", deroulement: "", materiel: "", duree: 40, date: null,
  tableauDeroulement: "[]", imagesDeroulement: "[]", bilan: "", bilanDate: null, sequenceId, dateMaj: "",
});
const grille = (eleveId: string, sequenceId: string, donnees: object): DocumentEleve => ({
  id: `${eleveId}-${sequenceId}`, eleveId, typeDoc: `grille-sequence:${sequenceId}`, donnees: JSON.stringify(donnees), dateMaj: "",
});

describe("la copie du travail", () => {
  it("donne à chaque élève son dossier, sa photo et ses papiers", () => {
    const d = vide();
    d.eleves = [eleve("e2", "Élève Deux"), eleve("e1", "Élève Un", { photoFichier: "abc.jpg" }), eleve("e3", "Élève Un")];
    d.commentaires = [{ id: "c1", date: "2026-10-01", texte: "A trié les couleurs seul.", type: "scolaire", eleveId: "e1" }];
    d.papiers = [{ id: "p1", intitule: "Autorisation de sortie.pdf", eleveId: "e1", type: "", nomFichier: "x1.pdf", note: "", dateAjout: "" }];
    const plan = planDuTravail(d);
    const chemins = plan.fichiers.map((f) => f.chemin);
    expect(chemins).toContain("Élèves/Élève Deux/Dossier.html");
    expect(chemins).toContain("Élèves/Élève Un/Dossier.html");
    // Deux élèves du même nom ne se mélangent pas.
    expect(chemins).toContain("Élèves/Élève Un (2)/Dossier.html");
    expect(chemins).toContain("Élèves/Élève Un/Photo.jpg");
    expect(chemins).toContain("Élèves/Élève Un/Papiers/Autorisation de sortie.pdf");
    const dossier = plan.fichiers.find((f) => f.chemin === "Élèves/Élève Un/Dossier.html")!;
    expect(dossier.source.genre).toBe("contenu");
    if (dossier.source.genre === "contenu") expect(dossier.source.creer()).toContain("A trié les couleurs seul.");
  });

  it("ne refait une page que si ses données changent", () => {
    const d = vide();
    d.eleves = [eleve("e1", "Élève Un")];
    const avant = planDuTravail(d).fichiers[0].empreinte;
    expect(planDuTravail(d).fichiers[0].empreinte).toBe(avant);
    d.commentaires = [{ id: "c1", date: "2026-10-01", texte: "Nouveau.", type: "scolaire", eleveId: "e1" }];
    expect(planDuTravail(d).fichiers[0].empreinte).not.toBe(avant);
    // L'observation d'un autre élève ne change rien à la sienne.
    const apres = planDuTravail(d).fichiers[0].empreinte;
    d.commentaires.push({ id: "c2", date: "2026-10-02", texte: "Autre.", type: "scolaire", eleveId: "e9" });
    expect(planDuTravail(d).fichiers[0].empreinte).toBe(apres);
  });

  it("range l'organisation : emploi du temps, progression par période, programmations", () => {
    const d = vide();
    d.edts = [
      { id: "t1", annee: "2026-2027", slotsJson: JSON.stringify([{ id: "s1", jour: "Lundi", heureDebut: "08:30", heureFin: "09:00", titre: "Accueil", couleur: "cyan" }]) },
      { id: "t2", annee: "IME:2026-08-31", slotsJson: "[]" },
    ] as EdtTypique[];
    const prog = (niveau: string, periode: number, cellules = {}): ProgressionAnnuelle => ({
      id: `${niveau}${periode}`, annee: "2026-2027", periode, niveau,
      colonnesJson: JSON.stringify([{ id: "c1", titre: "EPS", couleur: "red" }]), cellulesJson: JSON.stringify(cellules),
    });
    d.progressions = [prog("", 1, { w1_c1: "Courir" }), prog("GS", 1, { w1_c1: "Ramper" }), { ...prog("", 2), colonnesJson: "[]" }];
    d.programmations = [
      { id: "g1", annee: "2026-2027", niveau: "", enseignant: "", estImportee: false, lignesJson: JSON.stringify([{ id: "l1", estDomaine: false, label: "Lecture", p1: "Albums", p2: "", p3: "", p4: "", p5: "" }]) },
      { id: "g2", annee: "2026-2027", niveau: "CP", enseignant: "Collègue", estImportee: true, lignesJson: "[]" },
    ] as ProgrammationFinale[];
    const plan = planDuTravail(d);
    const chemins = plan.fichiers.map((f) => f.chemin);
    expect(chemins).toEqual([
      "Organisation/Emploi du temps 2026-2027.html",
      "Organisation/Progression 2026-2027/Période 1.html",
      "Organisation/Programmation 2026-2027.html",
    ]);
    const p1 = plan.fichiers[1];
    if (p1.source.genre === "contenu") {
      const html = p1.source.creer();
      expect(html).toContain("Courir");
      expect(html.indexOf("Courir")).toBeLessThan(html.indexOf("GS"));
      expect(html).toContain("Ramper");
    }
  });

  it("range la progression d'un élève dans son dossier, pas avec celle de la classe", () => {
    const d = vide();
    d.eleves = [eleve("e1", "Élève Un")];
    const prog = (niveau: string, texte: string): ProgressionAnnuelle => ({
      id: niveau, annee: "2026-2027", periode: 2, niveau,
      colonnesJson: JSON.stringify([{ id: "c1", titre: "Lecture", couleur: "blue" }]), cellulesJson: JSON.stringify({ w1_c1: texte }),
    });
    d.progressions = [prog("", "Albums"), prog("eleve:e1", "Les sons [a]"), prog("eleve:parti", "Rien")];
    const plan = planDuTravail(d);
    const chemins = plan.fichiers.map((f) => f.chemin);
    expect(chemins).toContain("Élèves/Élève Un/Progression 2026-2027 P2.html");
    expect(chemins).toContain("Organisation/Progression 2026-2027/Période 2.html");
    // Celle d'un élève parti ne se copie plus.
    expect(chemins.filter((c) => c.includes("Progression"))).toHaveLength(2);
    const creer = (chemin: string) => { const f = plan.fichiers.find((x) => x.chemin === chemin)!; return f.source.genre === "contenu" ? f.source.creer() : ""; };
    expect(creer("Élèves/Élève Un/Progression 2026-2027 P2.html")).toContain("Les sons [a]");
    const classe = creer("Organisation/Progression 2026-2027/Période 2.html");
    expect(classe).toContain("Albums");
    expect(classe).not.toContain("Les sons");
    expect(classe).not.toContain("eleve:");
  });

  it("fait une page par semaine du cahier journal, rangée par année scolaire, et recopie le coffre", () => {
    const d = vide();
    d.creneaux = [
      creneau("k1", "2026-09-08", { prevu: "Lecture d'album", bilan: "Bonne écoute." }),
      creneau("k2", "2026-09-10", { seanceId: "s1" }),
      creneau("k3", "2026-09-11"), // rien à dire : pas de page pour lui seul
      creneau("k4", "2027-01-05", { bilan: "Reprise." }),
    ];
    d.seances = [{ id: "s1", titre: "Les sons [a]" } as DonneesTravail["seances"][number]];
    d.coffre = [{ id: "d1", nom: "Règlement intérieur.pdf", nomFichier: "r1.pdf", tailleOctets: 1, dateAjout: "" }] as DocumentCoffre[];
    const chemins = planDuTravail(d).fichiers.map((f) => f.chemin);
    expect(chemins).toEqual([
      "Cahier journal/2026-2027/Semaine du 2026-09-07.html",
      "Cahier journal/2026-2027/Semaine du 2027-01-04.html",
      "Ressources/Règlement intérieur.pdf",
    ]);
    const semaine = planDuTravail(d).fichiers[0];
    if (semaine.source.genre === "contenu") {
      const html = semaine.source.creer();
      expect(html).toContain("Lecture d&#39;album");
      expect(html).toContain("Les sons [a]");
    }
    expect(lundiDe("2026-09-13")).toBe("2026-09-07");
    expect(anneeScolaireDe("2027-07-31")).toBe("2026-2027");
  });

  it("range la grille d'une séquence finie depuis une semaine, avec les seuls élèves observés", () => {
    const d = vide();
    d.eleves = [eleve("e1", "Élève Un"), eleve("e2", "Élève Deux"), eleve("e3", "Élève Trois", { present: false })];
    d.sequences = [
      sequence("q1", "Trier et ranger", { niveau: "GS", nbSeancesPrevu: 2 }),
      sequence("q2", "Compter jusqu'à 10", { nbSeancesPrevu: 3 }),
    ];
    d.seances = [
      seance("a", "q1", 1, "À la fin de cette séance, les élèves sauront trier des objets par couleur."),
      seance("b", "q1", 2, "À la fin de cette séance, les élèves sauront ranger trois objets du plus petit au plus grand."),
      seance("c", "q2", 1, "À la fin de cette séance, les élèves sauront compter jusqu'à 5."),
    ];
    // q1 : ses deux séances faites, la dernière le 9 octobre ; q2 : en classe.
    d.creneaux = [
      creneau("k1", "2026-10-05", { seanceId: "a" }), creneau("k2", "2026-10-09", { seanceId: "b" }),
      creneau("k3", "2026-10-12", { seanceId: "c" }),
    ];
    // Élève Trois, parti depuis, a été observé ; Élève Deux ne l'a pas été.
    d.documents = [
      grille("e1", "q1", { a: { n: 3 }, b: { n: 2, aide: "geste" } }), grille("e3", "q1", { a: { n: 1 } }),
      grille("e2", "q1", {}), grille("e1", "q2", { c: { n: 2 } }),
    ];
    // Six jours après la dernière séance, on l'observe encore : rien n'est rangé.
    d.aujourdHui = "2026-10-15";
    expect(planDuTravail(d).fichiers.some((f) => f.chemin.startsWith("Grilles d'observables/"))).toBe(false);
    d.aujourdHui = "2026-10-20";
    const plan = planDuTravail(d);
    const rangees = plan.fichiers.filter((f) => f.chemin.startsWith("Grilles d'observables/")).map((f) => f.chemin);
    // q2 est encore en classe : sa grille reste à l'écran.
    expect(rangees).toEqual(["Grilles d'observables/2026-2027/Trier et ranger.html"]);
    const page = plan.fichiers.find((f) => f.chemin === rangees[0])!;
    if (page.source.genre !== "contenu") throw new Error("une page attendue");
    const html = page.source.creer();
    expect(html).toContain("Élève Un");
    expect(html).toContain("Élève Trois");
    expect(html).not.toContain("Élève Deux");
    expect(html).toContain("Ranger trois objets du plus petit au plus grand");
    expect(html).toContain("du 05/10 au 09/10");
    // La grille n'est pas recopiée, illisible, dans le dossier de l'élève.
    const dossier = plan.fichiers.find((f) => f.chemin === "Élèves/Élève Un/Dossier.html")!;
    if (dossier.source.genre !== "contenu") throw new Error("une page attendue");
    expect(dossier.source.creer()).not.toMatch(/grille-sequence|Grille-sequence/i);
  });
});
