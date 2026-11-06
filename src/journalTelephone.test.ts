import { describe, it, expect } from "vitest";
import type { Creneau, Jeu, MaterielItem, Seance, Sequence } from "./api";
import {
  aFaireDuCreneau, cleDeLaSeance, deLaClasse, minuteurDeLaSeance,
  aidesDuCreneau, cleDuDeroulement, cleDuDeroulementDe, dureeDuMinuteur, estUneAide, estUneFicheDEleve, fichesDuCreneau, journalDes, joursPublies, minuteurDuCreneau, MINUTEURS_DES_TABLETTES,
  domaineDeLaSeance, pasDeLEleve, pasDuDeroulement,
  pageDeLaConsigne, signatureDuJournal, titreDeLAide, titrePourLesTablettes, type ManuelDuDeroulement,
  carteSeule, pasSansPrenoms,
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

describe("ce que voit une tablette ne nomme personne", () => {
  it("une carte qui ne disait que des prénoms devient « Créneau » ; ailleurs, le prénom s'en va seul", () => {
    const noms = ["Barnabé", "Nils"];
    expect(pasSansPrenoms(carteSeule({ prevu: "", matiere: "Barnabé Nils" }), noms)).toEqual([{ texte: "Créneau", matiere: "" }]);
    expect(pasSansPrenoms([{ texte: "Lecture Barnabé", matiere: "Français — Nils", domaine: "Lecture Barnabé", eleve: "Nils" }], noms))
      .toEqual([{ texte: "Lecture", matiere: "Français", domaine: "Lecture" }]);
    expect(pasSansPrenoms([{ texte: "Le jeu de l'oie", matiere: "Maths", fiche: true }], noms)).toEqual([{ texte: "Le jeu de l'oie", matiere: "Maths", fiche: true }]);
  });

  it("la publication passe par là", () => {
    const source = Object.values(import.meta.glob("./journalTelephone.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>)[0];
    expect(source).toContain("deroulements.push({ cle, pas: pasSansPrenoms(pas,");
  });
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
    // Chaque élève a son déroulement : le rituel, la séance, puis ses fiches.
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
    expect(pasDuDeroulement(c, undefined, [meles], "", "ZENON").map((p) => p.texte)).toEqual(["Rituel", "Mots mêlés"]);
  });

  it("montre la matière et le domaine qu'une feuille fabriquée emporte, sans les deviner d'après son titre (« pas d'erreur lorsque ça crée ce que doit faire l'élève »)", () => {
    const c = creneau("c1", "2026-10-13", { prevu: "📄 Mots mêlés — ZENON, 13 oct." });
    const marquee = fiche("f2", "Mots mêlés — ZENON, 13 oct.", "ZENON", { matiere: "Français", domaine: "Lecture" });
    expect(pasDuDeroulement(c, undefined, [marquee], "", "ZENON").slice(1)).toEqual([{ texte: "Mots mêlés", matiere: "Français", domaine: "Lecture", fiche: true }]);
    // Une fiche d'avant, sans matière : comme avant, elle se retrouve au dessin, par sa sorte.
    expect(pasDuDeroulement(c, undefined, [meles], "", "ZENON").slice(1)).toEqual([{ texte: "Mots mêlés", matiere: "", fiche: true }]);
  });

  it("commence toujours par le rituel — ceux du prévu par leur nom —, puis la séance, en une étape ; celui d'un élève finit par ses fiches", () => {
    const seanceDuJour = { ...seance("s1", "Les mots de l'automne"), tableauDeroulement: "[]" };
    const c = creneau("c1", "2026-10-13", { seanceId: "s1", prevu: "🔁 La date\n🔁 La météo\n" + prevu });
    expect(pasDuDeroulement(c, seanceDuJour, [pyramides, meles])).toEqual([
      { texte: "La date · La météo", matiere: "Rituel", rituel: true },
      { texte: "Les mots de l'automne", matiere: "", seance: "s1" },
    ]);
    // Celui d'un élève finit par ses fiches, et par elles seules : chacun a sa tablette.
    expect(pasDuDeroulement(c, seanceDuJour, [pyramides, meles], "", "ZENON").slice(2)).toEqual([{ texte: "Mots mêlés", matiere: "", fiche: true }]);
    expect(pasDuDeroulement(c, seanceDuJour, [pyramides, meles], "", "RACHID").slice(2)).toEqual([{ texte: "Les pyramides de nombres", matiere: "", fiche: true }]);
    // Sans rituel au prévu : « Rituel ».
    expect(pasDuDeroulement(creneau("c2", "2026-10-13", { seanceId: "s1" }), seanceDuJour, []).map((p) => p.texte)).toEqual(["Rituel", "Les mots de l'automne"]);
    // La séance porte son domaine : c'est son picto qu'elle montre.
    expect(pasDuDeroulement(creneau("c2", "2026-10-13", { seanceId: "s1" }), seanceDuJour, [], "Lecture").slice(1))
      .toEqual([{ texte: "Les mots de l'automne", matiere: "", domaine: "Lecture", seance: "s1" }]);
    // Ni séance ni fiche : rien à dérouler.
    expect(pasDuDeroulement(creneau("c3", "2026-10-13", { prevu: "🔁 La date" }), undefined, [pyramides])).toEqual([]);
    // Au journal : les aides de la séance partent avec elle ; la fiche de chaque élève la suit, dans son déroulement.
    const j = journalDes(["2026-10-13"], [c], [seanceDuJour], [materiel("m1", "Le séquentiel", "s1", "sequentiel"), pyramides, meles]);
    expect(j.jours[0].creneaux[0].aides.map((a) => [a.id, a.etape])).toEqual([["m1", 1], ["f1", 2], ["f2", 2]]);
  });

  it("montrent sur le déroulement la photo d'un support de travail, et sa matière", () => {
    const support: MaterielItem = {
      ...materiel("s9", "Le jeu des boîtes — RACHID, 13 oct.", null, "motsMeles"), pdfsJson: '["s9.pdf"]',
      fabricationJson: JSON.stringify({ atelier: "support", eleve: { prenom: "RACHID", date: "lundi 13 octobre" }, support: { photo: -2_100_000_100, matiere: "Mathématiques" } }),
    };
    const c = creneau("c1", "2026-10-13", { prevu: "📄 Le jeu des boîtes — RACHID, 13 oct.\n" + prevu });
    expect(pasDuDeroulement(c, undefined, [support, pyramides], "", "RACHID").slice(1)).toEqual([
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
    const j = journalDes(["2026-10-16"], [c], [entrainer], [meles], [conjuguer]);
    const creneauDuJour = j.jours[0].creneaux[0];
    expect(creneauDuJour.aides).toEqual([
      { id: cleDeLaSeance("s4"), titre: "S'entraîner et automatiser", minuteur: 30, etape: 1, eleve: "RACHID" },
      { id: "f1", titre: "Mots mêlés — RACHID, 16 oct.", minuteur: 15, etape: 2, eleve: "RACHID" },
      { id: cleDeLaSeance("s4"), titre: "S'entraîner et automatiser", minuteur: 30, etape: 1, eleve: "ZENON" },
    ]);
    expect(creneauDuJour.deroules).toEqual({ RACHID: cleDuDeroulementDe("c1", "RACHID"), ZENON: cleDuDeroulementDe("c1", "ZENON") });
    expect(pasDuDeroulement(c, undefined, [meles], "", "RACHID", [conjuguer], [entrainer])).toEqual([
      { texte: "Rituel", matiere: "", rituel: true },
      { texte: "S'entraîner et automatiser", matiere: "Français", fiche: true, domaine: "Grammaire et orthographe" },
      { texte: "Mots mêlés", matiere: "", fiche: true },
    ]);
    // Deux heures au plus, et rien sans durée.
    expect([minuteurDeLaSeance({ duree: 45 }), minuteurDeLaSeance({ duree: 300 }), minuteurDeLaSeance({ duree: 0 })]).toEqual([45, 120, 0]);
  });

  it("change de signature quand les étapes d'une séance envoyée changent, pas celles d'une autre", () => {
    const j = journalDes(["2026-10-16"], [c], [entrainer], [meles], [conjuguer]);
    const sig = signatureDuJournal(j, [meles], [entrainer]);
    expect(signatureDuJournal(j, [meles], [{ ...entrainer, consignes: "Je lis le verbe.\nJ'écris la bonne forme." }])).not.toBe(sig);
    expect(signatureDuJournal(j, [meles], [entrainer, { ...seance("s9", "Une autre"), consignes: "Rien." }])).toBe(sig);
  });
});

describe("ce que le prévu cite pour la classe, sur les tablettes (demande de l'enseignant, 31 octobre 2026)", () => {
  const nombres: Sequence = {
    id: "q3", titre: "Les nombres jusqu'à 59 (CP)", matiere: "Mathématiques", cycle: "", objectifs: "", competences: "", competenceVisee: "",
    imageNom: null, couleur: "", dateCreation: "", periode: 2, annee: "2026-2027", ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0,
    ratingDateMaj: null, projetId: null, video: "", dossier: "", nbSeancesPrevu: 6, etat: "", dateMaj: "",
  };
  const dire: Seance = {
    ...seance("s5", "Dire, lire et écrire les nombres jusqu'à 59"), sequenceId: "q3",
    competences: JSON.stringify([{ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calcul" }]),
  };
  const oie: Jeu = {
    id: "j1", titre: "jeu de l’oie", typeJeu: "Société", descriptionJeu: "", regles: "", competences: "", competencesBo: "[]",
    nbJoueursMin: 2, nbJoueursMax: 4, duree: 20, ageMin: 0, rangement: "", couleur: "", dateCreation: "", imageNom: null, dossier: "",
  };
  // Le prévu tel que le bouton 📚 le pose, puis le jeu écrit à la main ; aucune séance posée sur le créneau.
  const prevu = "📚 Les nombres jusqu'à 59 (CP) · séance 1/6 : Dire, lire et écrire les nombres jusqu'à 59\njeu de l’oie\n";
  const c = creneau("c1", "2026-11-02", { heureDebut: "14:10", heureFin: "15:00", prevu });

  it("déroule après le rituel la séance de la ligne 📚, en une étape, puis le jeu, de la même matière", () => {
    expect(deLaClasse(c, undefined, [nombres], [dire], [oie]).map((x) => x.seance?.id ?? x.jeu?.id)).toEqual(["s5", "j1"]);
    // « Une séance de maths, et encore une séance de maths » : ses phases sont celles de son aide séquentielle, pas du créneau.
    expect(pasDuDeroulement(c, undefined, [], "", undefined, [nombres], [dire], [oie])).toEqual([
      { texte: "Rituel", matiere: "", rituel: true },
      { texte: "Dire, lire et écrire les nombres jusqu'à 59", matiere: "Mathématiques", domaine: "Nombres et calcul", seance: "s5" },
      { texte: "Jeu de l’oie", matiere: "Mathématiques", domaine: "Nombres et calcul" },
    ]);
    // Un jeu prend d'abord la matière et le domaine de ses compétences ; seul, sans elles, il n'est qu'un jeu.
    const avecLesSiennes = { ...oie, competencesBo: JSON.stringify([{ domaineTitre: "Mathématiques", sousDomaineTitre: "Grandeurs et mesures" }]) };
    expect(pasDuDeroulement(c, undefined, [], "", undefined, [nombres], [dire], [avecLesSiennes])[2])
      .toEqual({ texte: "Jeu de l’oie", matiere: "Mathématiques", domaine: "Grandeurs et mesures" });
    expect(pasDuDeroulement(creneau("c2", "2026-11-02", { prevu: "jeu de l’oie" }), undefined, [], "", undefined, [], [], [oie])[1])
      .toEqual({ texte: "Jeu de l’oie", matiere: "Jeu" });
  });

  it("envoie aux tablettes ce déroulement, le titre de la séance et ses aides, avec elle", () => {
    const aide = materiel("m5", "Ce que je vais faire — Les nombres jusqu'à 9", "s5", "sequentiel");
    const x = journalDes(["2026-11-02"], [c], [dire], [aide], [nombres], [oie]).jours[0].creneaux[0];
    expect([x.seance, x.deroule]).toEqual(["Dire, lire et écrire les nombres jusqu'à 59", cleDuDeroulement("c1")]);
    expect(x.aides).toEqual([{ id: "m5", titre: "Ce que je vais faire — Les nombres jusqu'à 9", minuteur: 0, etape: 1 }]);
    // Le jeu seul suffit à dérouler ; une ligne qui ne cite rien, non.
    expect(journalDes(["2026-11-02"], [creneau("c2", "2026-11-02", { prevu: "jeu de l’oie" })], [], [], [], [oie]).jours[0].creneaux[0].deroule)
      .toBe(cleDuDeroulement("c2"));
    expect(journalDes(["2026-11-02"], [creneau("c3", "2026-11-02", { prevu: "On range la classe." })], [], [], [], [oie]).jours[0].creneaux[0].deroule)
      .toBe("");
  });

  it("donne à chaque élève d'un groupe sa partie du prévu : son déroulement, et les aides des séances qu'il y trouve (2026-11-02)", () => {
    // « Fais suivre les parties sur les tablettes aussi. » Prénoms inventés : le jeu puis la séance pour l'une, le jeu seul pour l'autre.
    const aide = materiel("m5", "Ce que je vais faire — Les nombres jusqu'à 9", "s5", "sequentiel");
    const groupe = creneau("c4", "2026-11-02", {
      heureDebut: "14:10", elevesJson: '["e1","e2"]',
      prevu: "🔁 La date\nLina : jeu de l’oie\n📚 Les nombres jusqu'à 59 (CP) · séance 1/6 : Dire, lire et écrire les nombres jusqu'à 59\nTom : jeu de l’oie",
    });
    const eleves = [{ id: "e1", prenom: "Lina" }, { id: "e2", prenom: "Tom" }, { id: "e3", prenom: "Zoé" }];
    const x = journalDes(["2026-11-02"], [groupe], [dire], [aide], [nombres], [oie], eleves).jours[0].creneaux[0];
    expect(x.deroules).toEqual({ Lina: cleDuDeroulementDe("c4", "Lina"), Tom: cleDuDeroulementDe("c4", "Tom") });
    expect(pasDeLEleve(groupe, "Lina", ["Lina", "Tom"], undefined, [], "", [nombres], [dire], [oie]).map((p) => p.texte))
      .toEqual(["La date", "Jeu de l’oie", "Dire, lire et écrire les nombres jusqu'à 59"]);
    expect(pasDeLEleve(groupe, "Tom", ["Lina", "Tom"], undefined, [], "", [nombres], [dire], [oie]).map((p) => p.texte)).toEqual(["La date", "Jeu de l’oie"]);
    // L'aide de la séance part à la tablette de Lina seule, à la place de la séance dans son déroulement.
    expect(x.aides).toEqual([{ id: "m5", titre: "Ce que je vais faire — Les nombres jusqu'à 9", minuteur: 0, etape: 2, eleve: "Lina" }]);
    // La classe garde son déroulement, lu sans les prénoms ; sans les élèves, le créneau part comme avant.
    expect([x.seance, x.deroule]).toEqual(["Dire, lire et écrire les nombres jusqu'à 59", cleDuDeroulement("c4")]);
    const avant = journalDes(["2026-11-02"], [groupe], [dire], [aide], [nombres], [oie]).jours[0].creneaux[0];
    expect([avant.aides, avant.deroules]).toEqual([[{ id: "m5", titre: "Ce que je vais faire — Les nombres jusqu'à 9", minuteur: 0, etape: 2 }], undefined]);
    // Une séance à tous va à chacun, à sa place dans son déroulement ; une tête devant la ligne 📚 ne la cache pas.
    const atous = { ...groupe, prevu: "📚 Les nombres jusqu'à 59 (CP) · séance 1/6 : Dire, lire et écrire les nombres jusqu'à 59\nLina : jeu de l’oie\nTom : 📚 Les nombres jusqu'à 59 (CP) · séance 1/6 : Dire, lire et écrire les nombres jusqu'à 59" };
    expect(journalDes(["2026-11-02"], [atous], [dire], [aide], [nombres], [oie], eleves).jours[0].creneaux[0].aides.map((a) => [a.eleve, a.etape]))
      .toEqual([["Lina", 1], ["Tom", 1]]);
  });

  it("laisse à chaque élève ce qui suit « En autonomie », ne cherche pas de jeu dans la ligne 📚, et ne double pas la séance posée", () => {
    expect(deLaClasse(creneau("c2", "2026-11-02", { prevu: "⏰ En autonomie :\n" + prevu }), undefined, [nombres], [dire], [oie])).toEqual([]);
    expect(deLaClasse(c, undefined, [nombres], [dire], [{ ...oie, id: "j2", titre: "Décomposer" }]).map((x) => x.seance?.id ?? x.jeu?.id)).toEqual(["s5"]);
    expect(deLaClasse(c, dire, [nombres], [dire], []).map((x) => x.seance?.id)).toEqual(["s5"]);
    expect(aidesDuCreneau({ seanceId: "s5" }, [materiel("m5", "x", "s5", "sequentiel")], ["s5"]).map((m) => m.id)).toEqual(["m5"]);
  });
});

describe("les pages de mes manuels, sur les tablettes (demande de l'enseignant, 3 novembre 2026)", () => {
  // « Il faut pouvoir indiquer sur le manuel de quelle matière, pour que ça mette bien à jour les tablettes et les créneaux en bandes. »
  const nombres = { id: "q3", titre: "Les nombres jusqu'à 59 (CP)", matiere: "Mathématiques", competences: "" } as unknown as Sequence;
  const dire: Seance = {
    ...seance("s5", "Dire, lire et écrire les nombres jusqu'à 59"), sequenceId: "q3",
    competences: JSON.stringify([{ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres et calcul" }]),
  };
  const fichier = { titre: "Mon fichier de maths", matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes" };
  // Les pages telles que le choix des pages les pose, la séance du bouton 📚, puis une page de plus, écrite à la main.
  const prevu = "📖 Mon fichier de maths · p. 12–14\n📚 Les nombres jusqu'à 59 (CP) · séance 1/6 : Dire, lire et écrire les nombres jusqu'à 59\n📖 mon fichier de maths p 16";
  const c = creneau("c1", "2026-11-03", { prevu });

  it("fait des pages citées une tâche de la classe, à la place de leur première ligne, avec la matière et le domaine du manuel", () => {
    expect(deLaClasse(c, undefined, [nombres], [dire], [], [fichier]).map((x) => x.pages?.titre ?? x.seance?.id)).toEqual(["Mon fichier de maths", "s5"]);
    expect(pasDuDeroulement(c, undefined, [], "", undefined, [nombres], [dire], [], [], [fichier])).toEqual([
      { texte: "Rituel", matiere: "", rituel: true },
      { texte: "Mon fichier de maths · p. 12–14, 16", matiere: "Mathématiques", domaine: "Nombres, calcul et résolution de problèmes", manuel: true },
      { texte: "Dire, lire et écrire les nombres jusqu'à 59", matiere: "Mathématiques", domaine: "Nombres et calcul", seance: "s5" },
    ]);
  });

  it("sans matière au manuel, prend celle de la première séance du créneau, sinon celle du créneau ; un domaine seul ne compte pas", () => {
    expect(pasDuDeroulement(c, undefined, [], "", undefined, [nombres], [dire], [], [], [{ titre: "Mon fichier de maths" }])[1])
      .toEqual({ texte: "Mon fichier de maths · p. 12–14, 16", matiere: "Mathématiques", domaine: "Nombres et calcul", manuel: true });
    const seul = creneau("c2", "2026-11-03", { matiere: "Français", prevu: "📖 Lecture CE1 · p. 4" });
    expect(pasDuDeroulement(seul, undefined, [], "", undefined, [], [], [], [], [{ titre: "Lecture CE1", domaine: "Lecture" }])).toEqual([
      { texte: "Rituel", matiere: "", rituel: true },
      { texte: "Lecture CE1 · p. 4", matiere: "Français", manuel: true },
    ]);
    expect(pasDuDeroulement(seul, undefined, [], "", undefined, [], [], [], [], [{ titre: "Lecture CE1", matiere: "Questionner le monde" }])[1])
      .toEqual({ texte: "Lecture CE1 · p. 4", matiere: "Questionner le monde", manuel: true });
  });

  it("ne prend ni un manuel qu'il ne connaît pas, ni un passage cité du coffre-fort, ni ce qui suit « En autonomie » ; le titre d'un manuel ne cite pas de jeu", () => {
    const lignes = (prevu2: string, jeux: Jeu[] = [], manuels: ManuelDuDeroulement[] = [fichier]) =>
      deLaClasse(creneau("c3", "2026-11-03", { prevu: prevu2 }), undefined, [], [], jeux, manuels).map((x) => x.pages?.titre ?? x.jeu?.id);
    expect(lignes("📖 Cap Maths CE1 · p. 42")).toEqual([]);
    expect(lignes("📖 Mon fichier de maths · p. 12 — « Calcule. »")).toEqual([]);
    expect(lignes("📖 Mon fichier de maths")).toEqual([]);
    expect(lignes("⏰ En autonomie :\n📖 Mon fichier de maths · p. 12")).toEqual([]);
    const oie = { id: "j1", titre: "jeu de l’oie", competencesBo: "[]" } as Jeu;
    expect(lignes("📖 Le jeu de l’oie des nombres · p. 3", [oie], [{ titre: "Le jeu de l’oie des nombres" }])).toEqual(["Le jeu de l’oie des nombres"]);
  });

  it("déroule un créneau qui n'a que des pages, et les donne à l'élève dont la partie les cite", () => {
    const seul = creneau("c2", "2026-11-03", { matiere: "Français", prevu: "📖 Lecture CE1 · p. 4" });
    expect(journalDes(["2026-11-03"], [seul], [], [], [], [], [], [{ titre: "Lecture CE1" }]).jours[0].creneaux[0].deroule).toBe(cleDuDeroulement("c2"));
    expect(journalDes(["2026-11-03"], [seul], [], [], [], []).jours[0].creneaux[0].deroule).toBe("");
    // Prénoms inventés : la page de l'une, le jeu de l'autre.
    const groupe = creneau("c4", "2026-11-03", { elevesJson: '["e1","e2"]', prevu: "Prénom-Un : 📖 Mon fichier de maths · p. 12\nPrénom-Deux : jeu de l’oie" });
    const oie = { id: "j1", titre: "jeu de l’oie", competencesBo: "[]" } as Jeu;
    const parties = ["Prénom-Un", "Prénom-Deux"];
    expect(pasDeLEleve(groupe, "Prénom-Un", parties, undefined, [], "", [], [], [oie], [], [fichier]).map((p) => p.texte))
      .toEqual(["Rituel", "Mon fichier de maths · p. 12"]);
    expect(pasDeLEleve(groupe, "Prénom-Deux", parties, undefined, [], "", [], [], [oie], [], [fichier]).map((p) => p.texte))
      .toEqual(["Rituel", "Jeu de l’oie"]);
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
