import { describe, it, expect } from "vitest";
import type { Creneau, MaterielItem, Seance } from "./api";
import { estUneAide, journalDes, joursPublies, signatureDuJournal } from "./journalTelephone";

const creneau = (id: string, date: string, p: Partial<Creneau> = {}): Creneau => ({
  id, date, heureDebut: "09:00", heureFin: "10:00", matiere: "Mathématiques", couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: "[]", nature: "classe", prevu: "", bilan: "", ...p,
});
const seance = (id: string, titre: string): Seance => ({
  id, titre, numero: 1, objectifs: "", competences: "", deroulement: "", materiel: "", duree: 45, date: null, tableauDeroulement: "[]",
  imagesDeroulement: "[]", bilan: "", bilanDate: null, sequenceId: "q1", dateMaj: "",
});
const materiel = (id: string, titre: string, seanceId: string | null, atelier: string): MaterielItem => ({
  id, titre, descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
  imagesJson: "[]", pdfsJson: "[]", dateCreation: "", seanceId, sequenceId: "q1", dossier: "", videosJson: "[]", coffreJson: "[]",
  fabricationJson: JSON.stringify({ atelier, memoires: {} }),
});

describe("le cahier journal pour le téléphone", () => {
  it("couvre deux semaines en arrière et deux en avant, jour par jour", () => {
    const jours = joursPublies(new Date(2026, 9, 10));
    expect(jours).toHaveLength(28);
    expect(jours[0]).toBe("2026-09-26");
    expect(jours[14]).toBe("2026-10-10");
    expect(jours[27]).toBe("2026-10-23");
  });

  it("donne à chaque créneau son prévu, son bilan, sa séance et les aides à la tâche de sa séance", () => {
    const j = journalDes(["2026-10-12", "2026-10-13"], [
      creneau("c2", "2026-10-12", { heureDebut: "14:10", heureFin: "15:00", seanceId: "s1", prevu: "📚 Les dizaines", bilan: "Bien." }),
      creneau("c1", "2026-10-12", { prevu: "Rituels" }),
      creneau("c9", "2026-10-20"),
    ], [seance("s1", "Le nom des dizaines")], [
      materiel("m1", "Ce que je vais faire — Le nom des dizaines", "s1", "sequentiel"),
      materiel("m2", "Nombres en cubes", "s1", "cubes"),
      materiel("m3", "Une aide sur le bureau", null, "sequentiel"),
    ]);
    expect(j.jours.map((x) => x.jour)).toEqual(["2026-10-12", "2026-10-13"]);
    expect(j.jours[0].creneaux.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(j.jours[0].creneaux[1]).toEqual({
      id: "c2", debut: "14:10", fin: "15:00", matiere: "Mathématiques", prevu: "📚 Les dizaines", bilan: "Bien.",
      seance: "Le nom des dizaines", aides: [{ id: "m1", titre: "Ce que je vais faire — Le nom des dizaines" }],
    });
    // Un jour sans créneau figure vide : c'est un jour sans classe, pas un silence.
    expect(j.jours[1].creneaux).toEqual([]);
  });

  it("ne prend pour aide que la feuille d'un atelier d'aides posée dans une séance", () => {
    expect(estUneAide(materiel("a", "x", "s1", "priseDeParole"))).toBe(true);
    expect(estUneAide(materiel("b", "x", "s1", "cubes"))).toBe(false);
    expect(estUneAide(materiel("c", "x", null, "sequentiel"))).toBe(false);
    expect(estUneAide({ ...materiel("d", "x", "s1", "sequentiel"), fabricationJson: "" })).toBe(false);
  });

  it("change de signature quand un créneau ou une aide citée change, pas pour un matériel sans rapport", () => {
    const jours = ["2026-10-12"];
    const m1 = materiel("m1", "Aide", "s1", "sequentiel");
    const base = journalDes(jours, [creneau("c1", "2026-10-12", { seanceId: "s1" })], [seance("s1", "S")], [m1]);
    const sig = signatureDuJournal(base, [m1]);
    expect(signatureDuJournal(base, [m1, materiel("m9", "Autre", "s9", "cubes")])).toBe(sig);
    const autreAide = { ...m1, fabricationJson: JSON.stringify({ atelier: "sequentiel", memoires: { sequentiel: { titre: "x" } } }) };
    expect(signatureDuJournal(base, [autreAide])).not.toBe(sig);
    const autreBilan = journalDes(jours, [creneau("c1", "2026-10-12", { seanceId: "s1", bilan: "Fait." })], [seance("s1", "S")], [m1]);
    expect(signatureDuJournal(autreBilan, [m1])).not.toBe(sig);
  });
});
