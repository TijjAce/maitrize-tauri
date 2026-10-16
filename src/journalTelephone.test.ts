import { describe, it, expect } from "vitest";
import type { Creneau, MaterielItem, Seance, Sequence } from "./api";
import {
  aFaireDuCreneau, cleDeLaSeance, minuteurDeLaSeance,
  aidesDuCreneau, cleDuDeroulement, cleDuDeroulementDe, dureeDuMinuteur, estUneAide, estUneFicheDEleve, fichesDuCreneau, journalDes, joursPublies, minuteurDuCreneau, MINUTEURS_DES_TABLETTES,
  domaineDeLaSeance, pasDuDeroulement,
  pageDeLaConsigne, signatureDuJournal, titreDeLAide, titrePourLesTablettes,
} from "./journalTelephone";

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
      seance: "Le nom des dizaines", aides: [{ id: "m1", titre: "Ce que je vais faire — Le nom des dizaines", minuteur: 0, etape: 1 }], minuteur: 0,
      deroule: cleDuDeroulement("c2"),
    });
    // Ni séance ni fiche : pas de déroulement.
    expect(j.jours[0].creneaux[0].deroule).toBe("");
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
    // Un minuteur réglé repart aussi vers le téléphone.
    const avecMinuteur = journalDes(jours, [creneau("c1", "2026-10-12", { seanceId: "s1", minuteur: 15 })], [seance("s1", "S")], [m1]);
    expect(signatureDuJournal(avecMinuteur, [m1])).not.toBe(sig);
  });

  it("porte le minuteur des tablettes de chaque créneau, en minutes, avec ou sans aide", () => {
    const j = journalDes(["2026-10-13"], [
      creneau("c1", "2026-10-13", { heureDebut: "10:00", seanceId: "s1", minuteur: 15 }),
      creneau("c2", "2026-10-13", { heureDebut: "11:00", minuteur: 20 }),
      creneau("c3", "2026-10-13", { heureDebut: "13:30" }),
      creneau("c4", "2026-10-13", { heureDebut: "14:00", minuteur: 600 }),
    ], [seance("s1", "Se laver les mains")], [materiel("m1", "Se laver les mains", "s1", "sequentiel")]);
    expect(j.jours[0].creneaux.map((c) => [c.id, c.aides.length, c.minuteur])).toEqual([
      ["c1", 1, 15], ["c2", 0, 20], ["c3", 0, 0], ["c4", 0, 120],
    ]);
  });

  it("dit les aides qu'un créneau enverra : celles de la séance qui y est posée", () => {
    const tout = [materiel("m1", "Le séquentiel", "s1", "sequentiel"), materiel("m2", "Cubes", "s1", "cubes"), materiel("m3", "Autre", "s2", "sequentiel")];
    expect(aidesDuCreneau({ seanceId: "s1" }, tout).map((m) => m.id)).toEqual(["m1"]);
    expect(aidesDuCreneau({ seanceId: null }, tout)).toEqual([]);
    expect([minuteurDuCreneau({}), minuteurDuCreneau({ minuteur: 12.4 }), minuteurDuCreneau({ minuteur: -3 })]).toEqual([0, 12, 0]);
    // Chaque durée proposée tient dans ce que le portail du téléphone accepte : deux heures.
    expect(Math.max(...MINUTEURS_DES_TABLETTES)).toBe(120);
    expect([5, 60, 90, 125].map(dureeDuMinuteur)).toEqual(["5 min", "1 h", "1 h 30", "2 h 05"]);
  });
});

describe("la consigne d'une feuille, pour les tablettes", () => {
  const avecConsigne = (m: MaterielItem, consigne: string): MaterielItem => ({ ...m, fabricationJson: JSON.stringify({ atelier: "motsMeles", consigne }) });
  const regle = '<div class="regle"><b>La règle</b>Retrouve les mots de la liste. Entoure chaque mot trouvé.</div>';

  it("part avec la feuille posée dans une séance, sous le nom « Consigne — » et celui de la feuille", () => {
    const feuille = avecConsigne(materiel("m4", "Mots mêlés", "s1", "motsMeles"), regle);
    expect(estUneAide(feuille)).toBe(true);
    expect(titreDeLAide(feuille)).toBe("Consigne — Mots mêlés");
    // Sans consigne gardée, ou hors séance : rien ne part ; une aide à la tâche garde son nom.
    expect(estUneAide(materiel("m5", "Mots mêlés", "s1", "motsMeles"))).toBe(false);
    expect(estUneAide(avecConsigne(materiel("m6", "Mots mêlés", null, "motsMeles"), regle))).toBe(false);
    expect(titreDeLAide(materiel("m1", "Ce que je vais faire", "s1", "sequentiel"))).toBe("Ce que je vais faire");
    const j = journalDes(["2026-10-12"], [creneau("c1", "2026-10-12", { seanceId: "s1" })], [seance("s1", "Lire des mots")], [feuille]);
    expect(j.jours[0].creneaux[0].aides).toEqual([{ id: "m4", titre: "Consigne — Mots mêlés", minuteur: 0, etape: 1 }]);
  });

  it("se montre sur une page à elle : le titre, puis la règle", () => {
    expect(pageDeLaConsigne("Consigne — Mots mêlés", regle)).toBe(`<div class="page"><div class="titre">Consigne — Mots mêlés</div>${regle}</div>`);
    expect(pageDeLaConsigne("<b>", "")).toContain("&lt;b&gt;");
  });
});

describe("les fiches d'« En retard », pour les tablettes", () => {
  const fiche = (id: string, titre: string, prenom: string, plus: Record<string, unknown> = {}): MaterielItem => ({
    ...materiel(id, titre, null, "motsMeles"), pdfsJson: JSON.stringify([`${id}.pdf`]), dossier: "Fiches d'autonomie/2026-10-13",
    fabricationJson: JSON.stringify({ atelier: "motsMeles", eleve: { prenom, date: "lundi 13 octobre" }, ...plus }),
  });
  const pyramides = fiche("f1", "Les pyramides de nombres — RACHID, 13 oct.", "RACHID", { consigne: '<div class="regle">Je complète.</div>', minuteur: 10 });
  const meles = fiche("f2", "Mots mêlés — ZENON, 13 oct.", "ZENON");
  const prevu = "⏰ En autonomie :\n📄 Les pyramides de nombres — RACHID, 13 oct.\n📄 Mots mêlés — ZENON, 13 oct.";

  it("partent du créneau qui les cite, chacune avec son minuteur et son élève, après les aides de la séance", () => {
    const j = journalDes(["2026-10-13"], [
      creneau("c1", "2026-10-13", { heureDebut: "11:00", seanceId: "s1", prevu, minuteur: 20 }),
      creneau("c2", "2026-10-13", { heureDebut: "13:30", prevu: "Rituels" }),
    ], [seance("s1", "S")], [materiel("m1", "Le séquentiel", "s1", "sequentiel"), pyramides, meles, fiche("f3", "Autre — LINA, 13 oct.", "LINA")]);
    // Chaque élève a son déroulement : le rituel, la séance (son titre, faute de phases), puis ses fiches.
    expect(j.jours[0].creneaux[0].aides).toEqual([
      { id: "m1", titre: "Le séquentiel", minuteur: 20, etape: 1 },
      { id: "f1", titre: "Les pyramides de nombres — RACHID, 13 oct.", minuteur: 10, etape: 2, eleve: "RACHID" },
      { id: "f2", titre: "Mots mêlés — ZENON, 13 oct.", minuteur: 0, etape: 2, eleve: "ZENON" },
    ]);
    expect(j.jours[0].creneaux[0].deroule).toBe(cleDuDeroulement("c1"));
    expect(j.jours[0].creneaux[0].deroules).toEqual({ RACHID: cleDuDeroulementDe("c1", "RACHID"), ZENON: cleDuDeroulementDe("c1", "ZENON") });
    // Une fiche que le prévu ne cite pas reste sur le bureau.
    expect(j.jours[0].creneaux[1].aides).toEqual([]);
    expect(j.jours[0].creneaux[1].deroule).toBe("");
    expect(j.jours[0].creneaux[1].deroules).toBeUndefined();
  });

  it("donne à l'élève d'une fiche seule son déroulement : le rituel, puis elle", () => {
    const c = creneau("c1", "2026-10-13", { prevu: "📄 Mots mêlés — ZENON, 13 oct." });
    const j = journalDes(["2026-10-13"], [c], [], [meles]);
    expect(j.jours[0].creneaux[0].aides).toEqual([{ id: "f2", titre: "Mots mêlés — ZENON, 13 oct.", minuteur: 0, etape: 1, eleve: "ZENON" }]);
    // Sans séance, la classe n'a rien à dérouler ; l'élève a son déroulement.
    expect(j.jours[0].creneaux[0].deroule).toBe("");
    expect(j.jours[0].creneaux[0].deroules).toEqual({ ZENON: cleDuDeroulementDe("c1", "ZENON") });
    expect(pasDuDeroulement(c, undefined, () => [], [meles], "", "ZENON").map((p) => p.texte)).toEqual(["Rituel", "Mots mêlés"]);
  });

  it("commence toujours par le rituel — ceux du prévu par leur nom —, puis les phases de la séance ; celui d'un élève finit par ses fiches", () => {
    const seanceDuJour = { ...seance("s1", "Les mots de l'automne"), tableauDeroulement: "[]" };
    const phases = () => ["Je découvre les mots.", "Je cherche."];
    const c = creneau("c1", "2026-10-13", { seanceId: "s1", prevu: "🔁 La date\n🔁 La météo\n" + prevu });
    expect(pasDuDeroulement(c, seanceDuJour, phases, [pyramides, meles])).toEqual([
      { texte: "La date · La météo", matiere: "Rituel", rituel: true },
      { texte: "Je découvre les mots.", matiere: "" },
      { texte: "Je cherche.", matiere: "" },
    ]);
    // Celui d'un élève finit par ses fiches, et par elles seules : chacun a sa tablette.
    expect(pasDuDeroulement(c, seanceDuJour, phases, [pyramides, meles], "", "ZENON").slice(3)).toEqual([{ texte: "Mots mêlés", matiere: "", fiche: true }]);
    expect(pasDuDeroulement(c, seanceDuJour, phases, [pyramides, meles], "", "RACHID").slice(3)).toEqual([{ texte: "Les pyramides de nombres", matiere: "", fiche: true }]);
    // Sans rituel au prévu : « Rituel » ; une séance qui ne dit rien de ses phases : son titre.
    expect(pasDuDeroulement(creneau("c2", "2026-10-13", { seanceId: "s1" }), seanceDuJour, () => [], []).map((p) => p.texte))
      .toEqual(["Rituel", "Les mots de l'automne"]);
    // Les phases d'une séance portent son domaine : c'est son picto qu'elles montrent.
    expect(pasDuDeroulement(creneau("c2", "2026-10-13", { seanceId: "s1" }), seanceDuJour, phases, [], "Lecture").slice(1))
      .toEqual([{ texte: "Je découvre les mots.", matiere: "", domaine: "Lecture" }, { texte: "Je cherche.", matiere: "", domaine: "Lecture" }]);
    // Ni séance ni fiche : rien à dérouler.
    expect(pasDuDeroulement(creneau("c3", "2026-10-13", { prevu: "🔁 La date" }), undefined, phases, [pyramides])).toEqual([]);
    // Au journal : les aides de la séance prennent sa première phase ; la fiche de chaque élève suit les phases, dans son déroulement.
    const j = journalDes(["2026-10-13"], [c], [seanceDuJour], [materiel("m1", "Le séquentiel", "s1", "sequentiel"), pyramides, meles], phases);
    expect(j.jours[0].creneaux[0].aides.map((a) => [a.id, a.etape])).toEqual([["m1", 1], ["f1", 3], ["f2", 3]]);
  });

  it("montrent sur le déroulement la photo d'un support de travail, et sa matière", () => {
    const support: MaterielItem = {
      ...materiel("s9", "Le jeu des boîtes — RACHID, 13 oct.", null, "motsMeles"), pdfsJson: '["s9.pdf"]',
      fabricationJson: JSON.stringify({ atelier: "support", eleve: { prenom: "RACHID", date: "lundi 13 octobre" }, support: { photo: -2_100_000_100, matiere: "Mathématiques" } }),
    };
    const c = creneau("c1", "2026-10-13", { prevu: "📄 Le jeu des boîtes — RACHID, 13 oct.\n" + prevu });
    expect(pasDuDeroulement(c, undefined, () => [], [support, pyramides], "", "RACHID").slice(1)).toEqual([
      { texte: "Le jeu des boîtes", matiere: "Mathématiques", fiche: true, picto: -2_100_000_100 },
      { texte: "Les pyramides de nombres", matiere: "", fiche: true },
    ]);
  });

  it("se reconnaissent à leur élève, et les tablettes lisent leur titre sans lui, comme le papier", () => {
    expect([estUneFicheDEleve(pyramides), estUneFicheDEleve(materiel("m1", "x", null, "motsMeles"))]).toEqual([true, false]);
    expect(estUneFicheDEleve({ ...pyramides, pdfsJson: "[]" })).toBe(false);
    expect(fichesDuCreneau({ prevu }, [meles, pyramides]).map((m) => m.id)).toEqual(["f1", "f2"]);
    expect(titreDeLAide(pyramides)).toBe("Les pyramides de nombres — RACHID, 13 oct.");
    expect(titrePourLesTablettes(pyramides)).toBe("Les pyramides de nombres");
  });

  it("change de signature quand le minuteur d'une fiche change", () => {
    const jours = ["2026-10-13"];
    const c = [creneau("c1", "2026-10-13", { prevu })];
    const sig = signatureDuJournal(journalDes(jours, c, [], [pyramides, meles]), [pyramides, meles]);
    const plusLong = { ...pyramides, fabricationJson: (pyramides.fabricationJson ?? "").replace('"minuteur":10', '"minuteur":15') };
    expect(signatureDuJournal(journalDes(jours, c, [], [plusLong, meles]), [plusLong, meles])).not.toBe(sig);
  });
});

describe("les séances d'« En retard », pour les tablettes (demande de l'enseignant, octobre 2026)", () => {
  const conjuguer: Sequence = {
    id: "q2", titre: "Apprendre à conjuguer être et avoir au présent", matiere: "Français", cycle: "", objectifs: "", competences: "", competenceVisee: "",
    imageNom: null, couleur: "", dateCreation: "", periode: 1, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0,
    ratingDateMaj: null, projetId: null, video: "", dossier: "", nbSeancesPrevu: 6, etat: "", dateMaj: "",
  };
  const entrainer: Seance = {
    ...seance("s4", "S'entraîner et automatiser"), numero: 4, sequenceId: "q2", duree: 30,
    competences: JSON.stringify([{ domaineTitre: "Français", sousDomaineTitre: "Grammaire et orthographe" }]),
  };
  const fiche = (id: string, titre: string, prenom: string, minuteur: number): MaterielItem => ({
    ...materiel(id, titre, null, "motsMeles"), pdfsJson: JSON.stringify([`${id}.pdf`]), sequenceId: null,
    fabricationJson: JSON.stringify({ atelier: "motsMeles", eleve: { prenom, date: "vendredi 16 octobre" }, minuteur }),
  });
  const meles = fiche("f1", "Mots mêlés — RACHID, 16 oct.", "RACHID", 15);
  const prevu = [
    "Accueil.", "", "⏰ En autonomie :",
    "📚 Apprendre à conjuguer être et avoir au présent · séance 4/6 : S'entraîner et automatiser — RACHID",
    "📄 Mots mêlés — RACHID, 16 oct.",
    "📚 Apprendre à conjuguer être et avoir au présent · séance 4/6 : S'entraîner et automatiser — ZENON",
  ].join("\n");
  const c = creneau("c1", "2026-10-16", { prevu });

  it("se lisent au prévu, sous « En autonomie », à leur élève et dans l'ordre, avec les fiches", () => {
    expect(aFaireDuCreneau(c, [meles], [conjuguer], [entrainer]).map((x) => [x.eleve, x.seance?.id ?? x.fiche?.id]))
      .toEqual([["RACHID", "s4"], ["RACHID", "f1"], ["ZENON", "s4"]]);
    // La ligne du bouton 📚 posée à la main, hors du bloc d'« En retard », reste celle de la classe.
    expect(aFaireDuCreneau(creneau("c2", "2026-10-16", { prevu: "📚 Apprendre à conjuguer être et avoir au présent · séance 4/6 — RACHID" }), [], [conjuguer], [entrainer]))
      .toEqual([]);
  });

  it("partent chacune à la tablette de son élève, avec la durée de la séance pour minuteur, à sa place parmi ses fiches", () => {
    const j = journalDes(["2026-10-16"], [c], [entrainer], [meles], () => [], [conjuguer]);
    const creneauDuJour = j.jours[0].creneaux[0];
    expect(creneauDuJour.aides).toEqual([
      { id: cleDeLaSeance("s4"), titre: "S'entraîner et automatiser", minuteur: 30, etape: 1, eleve: "RACHID" },
      { id: "f1", titre: "Mots mêlés — RACHID, 16 oct.", minuteur: 15, etape: 2, eleve: "RACHID" },
      { id: cleDeLaSeance("s4"), titre: "S'entraîner et automatiser", minuteur: 30, etape: 1, eleve: "ZENON" },
    ]);
    expect(creneauDuJour.deroules).toEqual({ RACHID: cleDuDeroulementDe("c1", "RACHID"), ZENON: cleDuDeroulementDe("c1", "ZENON") });
    expect(pasDuDeroulement(c, undefined, () => [], [meles], "", "RACHID", [conjuguer], [entrainer])).toEqual([
      { texte: "Rituel", matiere: "", rituel: true },
      { texte: "S'entraîner et automatiser", matiere: "Français", fiche: true, domaine: "Grammaire et orthographe" },
      { texte: "Mots mêlés", matiere: "", fiche: true },
    ]);
    // Deux heures au plus, et rien sans durée.
    expect([minuteurDeLaSeance({ duree: 45 }), minuteurDeLaSeance({ duree: 300 }), minuteurDeLaSeance({ duree: 0 })]).toEqual([45, 120, 0]);
  });

  it("change de signature quand les étapes d'une séance envoyée changent, pas celles d'une autre", () => {
    const j = journalDes(["2026-10-16"], [c], [entrainer], [meles], () => [], [conjuguer]);
    const sig = signatureDuJournal(j, [meles], [entrainer]);
    expect(signatureDuJournal(j, [meles], [{ ...entrainer, consignes: "Je lis le verbe.\nJ'écris la bonne forme." }])).not.toBe(sig);
    expect(signatureDuJournal(j, [meles], [entrainer, { ...seance("s9", "Une autre"), consignes: "Rien." }])).toBe(sig);
  });
});

describe("le domaine d'une séance", () => {
  it("vient de sa première compétence — le sous-domaine, sinon le domaine —, sinon de celle de sa séquence", () => {
    const comp = (domaineTitre: string, sousDomaineTitre: string) => JSON.stringify([{ id: "c", referentielNom: "", domaineId: "", domaineTitre, sousDomaineTitre, competenceTitre: "" }]);
    expect(domaineDeLaSeance({ competences: comp("Français", "Lecture") })).toBe("Lecture");
    expect(domaineDeLaSeance({ competences: comp("1. Mobiliser le langage dans toutes ses dimensions", "") })).toBe("1. Mobiliser le langage dans toutes ses dimensions");
    expect(domaineDeLaSeance({ competences: "[]" }, { competences: comp("Mathématiques", "Grandeurs et mesures") })).toBe("Grandeurs et mesures");
    expect(domaineDeLaSeance({ competences: "pas du json" }, { competences: "" })).toBe("");
  });
});
