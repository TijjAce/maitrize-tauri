import { describe, it, expect } from "vitest";
import { nouvelleSeance, nouvelleSequence, type Creneau, type Seance, type Sequence } from "./api";
import { competenceDeLaSequence, reprendreDuJournal, travauxDuJournal } from "./objectifsDuJournal";
import { comptes, marqueEleve, marqueGroupe, vide, type ProgrammationIme } from "./programmationIme";

const visee = (competenceTitre: string, competenceRefId = "") => JSON.stringify({
  id: "c", referentielNom: "BO Cycle 1", domaineId: "d", domaineTitre: "Langage", sousDomaineTitre: "Oral",
  competenceTitre, niveau: null, competenceRefId,
});
const sequence = (id: string, titre: string, competence = ""): Sequence =>
  ({ ...nouvelleSequence(), id, titre, competenceVisee: competence ? visee(competence, `ref-${id}`) : "" });
const seance = (id: string, sequenceId: string, numero: number): Seance => ({ ...nouvelleSeance(sequenceId, numero), id, titre: "" });
const creneau = (id: string, date: string, prevu: string, eleves: string[] = [], plus: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut: "09:00", heureFin: "10:00", matiere: "Langage", couleur: "blue", seanceId: null, atelierId: null,
  espaceId: null, elevesJson: JSON.stringify(eleves), nature: "classe", prevu, bilan: "", ...plus,
});

const raconter = sequence("s1", "Raconter une histoire", "Raconter une histoire entendue");
const compter = sequence("s2", "Compter jusqu'à dix", "Dénombrer une quantité jusqu'à 10");
const sansCompetence = sequence("s3", "Rituels du matin");
const sequences = [raconter, compter, sansCompetence];
const seances = [seance("se2", "s2", 1)];
const tous = ["e1", "e2", "e3"];
// P1 jusqu'au 16 octobre, P2 ensuite : assez pour suivre une date.
const periodeDe = (jour: string) => (jour < "2026-10-17" ? 1 : 2);

describe("ce que le cahier journal fait travailler", () => {
  it("la compétence visée d'une séquence, écrite comme la programmation", () => {
    expect(competenceDeLaSequence(raconter)).toEqual({
      competence: "Raconter une histoire entendue", origine: "BO Cycle 1 › Langage",
      source: { referentielNom: "BO Cycle 1", sousDomaineTitre: "Oral", competenceRefId: "ref-s1" },
    });
    expect(competenceDeLaSequence(sansCompetence)).toBeNull();
    expect(competenceDeLaSequence({ ...raconter, competenceVisee: "{abîmé" })).toBeNull();
  });

  it("une séquence citée ou posée sur un créneau va aux élèves de ce créneau, sur sa période", () => {
    const travaux = travauxDuJournal([
      creneau("c1", "2026-09-14", "📚 Raconter une histoire · séance 1", ["e1", "e2"]),
      creneau("c2", "2026-11-03", "Atelier", ["e3"], { seanceId: "se2" }),
      creneau("c3", "2026-09-15", "📚 Rituels du matin", ["e1"]),
      creneau("c4", "2026-09-16", "📚 Raconter une histoire", ["e1"], { nature: "reunion" }),
      creneau("c5", "2026-09-17", "Rien de cité", ["e1"]),
    ], sequences, seances, tous, periodeDe);
    expect(travaux.map((t) => [t.marque.split("|")[0], t.competence, t.eleveIds, t.periode, t.sequenceId])).toEqual([
      ["c1", "Raconter une histoire entendue", ["e1", "e2"], 1, "s1"],
      ["c2", "Dénombrer une quantité jusqu'à 10", ["e3"], 2, "s2"],
    ]);
  });

  it("un créneau sans élève nommé est celui de toute la classe ; des élèves disparus, de personne", () => {
    const [toute] = travauxDuJournal([creneau("c1", "2026-09-14", "📚 Raconter une histoire")], sequences, seances, tous, periodeDe);
    expect(toute.eleveIds).toEqual(tous);
    expect(travauxDuJournal([creneau("c2", "2026-09-14", "📚 Raconter une histoire", ["parti"])], sequences, seances, tous, periodeDe)).toEqual([]);
  });
});

describe("la reprise dans les objectifs par élève", () => {
  const travaux = () => travauxDuJournal([
    creneau("c1", "2026-09-14", "📚 Raconter une histoire", ["e1", "e2"]),
    creneau("c2", "2026-11-03", "📚 Raconter une histoire", ["e2", "e3"]),
  ], sequences, seances, tous, periodeDe);

  it("crée l'objectif, puis l'étend aux élèves et aux périodes des autres créneaux", () => {
    const { prog, ajoutes, completes } = reprendreDuJournal(vide(), travaux());
    expect([ajoutes, completes]).toEqual([1, 0]);
    expect(prog.objectifs).toHaveLength(1);
    const o = prog.objectifs[0];
    expect([o.competence, o.origine, o.periodes, o.sequences]).toEqual(["Raconter une histoire entendue", "BO Cycle 1 › Langage", [1, 2], ["s1"]]);
    expect(o.pour.sort()).toEqual(["eleve:e1", "eleve:e2", "eleve:e3"]);
    expect(comptes(prog, tous)).toEqual({ e1: 1, e2: 1, e3: 1 });
  });

  it("complète un objectif déjà programmé plutôt que d'en faire un second", () => {
    const deja: ProgrammationIme = {
      groupes: [{ id: "g1", nom: "Langage", eleveIds: ["e1"] }],
      objectifs: [{ id: "o1", competence: "raconter une histoire entendue", origine: "BO Cycle 1 › Langage", pour: [marqueGroupe("g1")],
        periodes: [3], atteintes: [], creneaux: [], notes: "" }],
    };
    const { prog, ajoutes, completes } = reprendreDuJournal(deja, travaux());
    expect([ajoutes, completes]).toEqual([0, 1]);
    // e1 est déjà visé par son groupe : il n'est pas ajouté une seconde fois.
    expect(prog.objectifs[0].pour).toEqual([marqueGroupe("g1"), marqueEleve("e2"), marqueEleve("e3")]);
    expect(prog.objectifs[0].periodes).toEqual([1, 2, 3]);
  });

  it("ne reprend qu'une fois : un objectif retiré ne revient qu'avec une nouvelle séance", () => {
    const premiere = reprendreDuJournal(vide(), travaux()).prog;
    expect(reprendreDuJournal(premiere, travaux())).toEqual({ prog: premiere, ajoutes: 0, completes: 0 });
    const retire = { ...premiere, objectifs: [] };
    expect(reprendreDuJournal(retire, travaux()).prog.objectifs).toEqual([]);
    const plusTard = [...travaux(), ...travauxDuJournal([creneau("c3", "2026-11-10", "📚 Raconter une histoire", ["e1"])], sequences, seances, tous, periodeDe)];
    const revenu = reprendreDuJournal(retire, plusTard);
    expect(revenu.ajoutes).toBe(1);
    expect(revenu.prog.objectifs[0].pour).toEqual([marqueEleve("e1")]);
  });
});
