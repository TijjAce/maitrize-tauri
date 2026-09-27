import { describe, it, expect } from "vitest";
import {
  depuisReferentiel, depuisDocument, nettoyerExtrait, ajouterCompetences, lireCompetences, parSource, correspond,
  depuisProgrammation, synchroniserProgrammation, sourceProgrammation,
} from "./competencesTravaillees";
import { marqueEleve, marqueGroupe, objectifsDe, type Objectif, type ProgrammationIme } from "./programmationIme";
import { PROGRAMMES_OFFICIELS, nomDansLeCoffre } from "./data/programmesOfficiels";

const sel = (id: string, texte: string) => ({
  id: "x", referentielNom: "Cycle 2 — CP, CE1, CE2 (programmes 2026)", domaineId: "fr", domaineTitre: "Français",
  sousDomaineTitre: "Lecture et compréhension de l’écrit", competenceGeneraleTitre: "Identifier des mots",
  competenceTitre: texte, niveau: "CP", competenceRefId: id,
});

describe("depuisReferentiel", () => {
  it("garde la source, le chemin et le niveau", () => {
    const c = depuisReferentiel(sel("fr-1", "Décoder des mots réguliers"), "2026-09-14");
    expect(c).toMatchObject({
      texte: "Décoder des mots réguliers", source: "Cycle 2 — CP, CE1, CE2 (programmes 2026)",
      chemin: "Français › Lecture et compréhension de l’écrit › Identifier des mots", niveau: "CP",
      statut: "encours", citeeLe: "2026-09-14", page: "",
    });
  });
});

describe("depuisDocument", () => {
  it("cite un passage avec sa page, mise en page retirée", () => {
    const c = depuisDocument("• Lire à voix haute\n  un texte court   ", { id: "d1", nom: "Cycle 2 — Français" }, 12, "2026-09-14");
    expect(c).toMatchObject({ texte: "Lire à voix haute un texte court", source: "Cycle 2 — Français", page: "12", documentId: "d1" });
  });
});

describe("nettoyerExtrait", () => {
  it("retire puces, retours à la ligne et césures invisibles", () => {
    expect(nettoyerExtrait("– Comprendre\nun texte lu par l’adulte.\n\n")).toBe("Comprendre un texte lu par l’adulte.");
    expect(nettoyerExtrait("appren­tissage")).toBe("apprentissage");
  });
  it("garde un tiret qui fait partie du texte", () => {
    expect(nettoyerExtrait("Le nombre 10-20 et peut-être")).toBe("Le nombre 10-20 et peut-être");
  });
});

describe("ajouterCompetences", () => {
  it("n'ajoute pas deux fois la même compétence et garde le statut déjà posé", () => {
    const a = { ...depuisReferentiel(sel("fr-1", "Décoder"), "2026-09-01"), statut: "acquise" as const, date: "2026-09-10" };
    const { liste, ajoutees } = ajouterCompetences([a], [
      depuisReferentiel(sel("fr-1", "Décoder"), "2026-09-14"),
      depuisReferentiel(sel("fr-2", "Encoder"), "2026-09-14"),
      depuisDocument("Décoder", { id: "d", nom: "Autre source" }, 3, "2026-09-14"),
    ]);
    expect(ajoutees).toBe(2);
    expect(liste[0]).toMatchObject({ statut: "acquise", date: "2026-09-10" });
  });
  it("reconnaît un passage déjà cité malgré accents, casse et espaces", () => {
    const doc = { id: "d", nom: "BO" };
    const { ajoutees } = ajouterCompetences([depuisDocument("Écrire  son prénom", doc, 1, "")], [depuisDocument("ecrire son PRÉNOM", doc, 2, "")]);
    expect(ajoutees).toBe(0);
  });
  it("ignore une citation vide", () => {
    expect(ajouterCompetences([], [depuisDocument("  \n ", { id: "d", nom: "BO" }, 1, "")]).ajoutees).toBe(0);
  });
});

describe("lireCompetences", () => {
  it("relit une liste enregistrée et tolère un contenu abîmé", () => {
    const c = depuisReferentiel(sel("fr-1", "Décoder"), "2026-09-14");
    expect(lireCompetences(JSON.stringify([c]))).toEqual([c]);
    expect(lireCompetences("pas du json")).toEqual([]);
    expect(lireCompetences(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(lireCompetences(JSON.stringify([{ texte: "X", statut: "bizarre" }]))[0].statut).toBe("encours");
  });
});

describe("parSource / correspond", () => {
  it("regroupe par source dans l'ordre d'apparition", () => {
    const doc = { id: "d", nom: "BO" };
    const l = [depuisDocument("a", doc, 1, ""), depuisReferentiel(sel("1", "b"), ""), depuisDocument("c", doc, 2, "")];
    expect(parSource(l).map(([s, cs]) => [s, cs.length])).toEqual([["BO", 2], ["Cycle 2 — CP, CE1, CE2 (programmes 2026)", 1]]);
  });
  it("cherche sans accents ni casse", () => {
    expect(correspond("Résoudre des problèmes", "resoudre PROB")).toBe(true);
    expect(correspond("Résoudre des problèmes", "")).toBe(true);
    expect(correspond("Lire", "écrire")).toBe(false);
  });
});

describe("programmes officiels", () => {
  it("ont des adresses PDF officielles uniques et des noms distincts dans le coffre", () => {
    const urls = PROGRAMMES_OFFICIELS.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => /^https:\/\/([a-z.]+\.)?education\.gouv\.fr\/.+\.pdf$/.test(u))).toBe(true);
    const noms = PROGRAMMES_OFFICIELS.map(nomDansLeCoffre);
    expect(new Set(noms).size).toBe(noms.length);
  });
});

describe("les objectifs de la programmation, suivis dans les compétences travaillées", () => {
  const objectif = (id: string, competence: string, pour: string[], periodes: number[] = [1, 2]): Objectif =>
    ({ id, competence, origine: "Cycle 2 › Lecture", pour, periodes, atteintes: [], creneaux: [], notes: "" });
  const prog: ProgrammationIme = {
    groupes: [{ id: "g1", nom: "Lecteurs", eleveIds: ["e1", "e2"] }],
    objectifs: [
      objectif("o1", "Décoder des mots réguliers", [marqueGroupe("g1")]),
      objectif("o2", "Dénombrer jusqu'à 10", [marqueEleve("e3")], [3]),
      objectif("o3", "Demander de l'aide", [marqueEleve("e1")], []),
    ],
  };

  it("reprennent ce qui concerne l'élève, groupes compris, non abordé au départ", () => {
    const { liste, ajoutees } = synchroniserProgrammation([], objectifsDe(prog, "e1"), "2026-2027", "2026-09-27");
    expect(ajoutees).toBe(2);
    expect(liste.map((c) => c.texte)).toEqual(["Décoder des mots réguliers", "Demander de l'aide"]);
    expect(liste[0]).toMatchObject({ source: "Programmation 2026-2027", chemin: "Cycle 2 › Lecture · périodes 1, 2", objectifId: "o1", statut: "nonabordee", citeeLe: "2026-09-27" });
    expect(liste[1].chemin).toBe("Cycle 2 › Lecture");
    expect(sourceProgrammation("2026-2027")).toBe("Programmation 2026-2027");
  });

  it("ne doublent pas ce qui est déjà là, et gardent le statut et les notes", () => {
    const deja = { ...depuisProgrammation(prog.objectifs[0], "2026-2027", "2026-09-01"), statut: "acquise" as const, date: "2026-09-20", notes: "avec le syllabaire" };
    const r = synchroniserProgrammation([deja], objectifsDe(prog, "e1"), "2026-2027", "2026-09-27");
    expect(r.ajoutees).toBe(1);
    expect(r.misesAJour).toBe(0);
    expect(r.liste[0]).toMatchObject({ statut: "acquise", date: "2026-09-20", notes: "avec le syllabaire", objectifId: "o1" });
    // Une seconde passe ne change plus rien.
    const r2 = synchroniserProgrammation(r.liste, objectifsDe(prog, "e1"), "2026-2027", "2026-09-28");
    expect(r2.ajoutees + r2.misesAJour).toBe(0);
    expect(r2.liste).toHaveLength(2);
  });

  it("suivent l'objectif si son intitulé change, et laissent ce qui a disparu", () => {
    const avant = depuisProgrammation(prog.objectifs[0], "2026-2027", "2026-09-01");
    const modifie: Objectif = { ...prog.objectifs[0], competence: "Décoder des mots réguliers et irréguliers", periodes: [1, 2, 3] };
    const r = synchroniserProgrammation([avant], [modifie], "2026-2027", "2026-09-27");
    expect(r.misesAJour).toBe(1);
    expect(r.ajoutees).toBe(0);
    expect(r.liste[0]).toMatchObject({ id: avant.id, texte: "Décoder des mots réguliers et irréguliers", chemin: "Cycle 2 › Lecture · périodes 1, 2, 3" });
    // L'objectif o3 n'est plus dans la programmation : sa compétence reste.
    const r3 = synchroniserProgrammation([avant, depuisProgrammation(prog.objectifs[2], "2026-2027", "2026-09-01")], [modifie], "2026-2027", "2026-09-27");
    expect(r3.liste).toHaveLength(2);
  });

  it("relisent l'identifiant d'objectif, et le distinguent d'une citation du référentiel", () => {
    const c = depuisProgrammation(prog.objectifs[1], "2026-2027", "2026-09-27");
    const relu = lireCompetences(JSON.stringify([c]));
    expect(relu[0].objectifId).toBe("o2");
    // Une compétence citée du BO n'a pas d'objectif : ajouter l'objectif ne la double pas s'il a le même texte et la même source, mais ici les sources diffèrent.
    const bo = depuisReferentiel(sel("m-1", "Dénombrer jusqu'à 10"), "2026-09-01");
    expect(ajouterCompetences([bo], [c]).ajoutees).toBe(1);
  });
});
