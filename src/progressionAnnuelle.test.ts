import { describe, expect, it } from "vitest";
import type { ProgressionAnnuelle } from "./api";
import {
  cleOrdreDesTableaux, dansLOrdre, deplacerTableau, lireOrdreDesTableaux, renommerDansLOrdre,
  avecCase, casesDeLaColonne, copieDesColonnes, datesDeLaSemaine, deplacerColonne, enJson, lireEtat, memeEtat,
  nombreDeSemaines, progressionDe, remettreColonne, sansColonne, semainesDeLaPeriode, sourcesDeColonnes, titreConnu,
  titresProposes, LA_CLASSE, niveauxDeLaProgression, cleNiveauAjoute, tableauSansNiveau, avecSeances, ETAT_VIDE,
} from "./progressionAnnuelle";

const NIVEAUX = ["TPS", "PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"];
const prog = (annee: string, niveau: string, periode: number, colonnes: { id: string; titre: string }[] = [], cellules = {}): ProgressionAnnuelle => ({
  id: `${annee}-${niveau}-${periode}`, annee, niveau, periode,
  colonnesJson: JSON.stringify(colonnes.map((c) => ({ ...c, couleur: "blue" }))), cellulesJson: JSON.stringify(cellules),
});

describe("la progression annuelle", () => {
  it("se lit sans tomber sur un JSON abîmé, et ne garde pas les cases vides", () => {
    expect(lireEtat({ colonnesJson: "{pas du json", cellulesJson: "[]" })).toEqual(ETAT_VIDE);
    const e = lireEtat({ colonnesJson: '[{"id":"c1","titre":"EPS","couleur":"red"},{"titre":"sans id"}]', cellulesJson: '{"w1_c1":"Courir","w2_c1":""}' });
    expect(e.colonnes.map((c) => c.titre)).toEqual(["EPS"]);
    expect(e.cellules).toEqual({ w1_c1: "Courir" });
    expect(JSON.parse(enJson(avecCase(e, 1, "c1", "")).cellulesJson)).toEqual({});
    // La base range les cases par clé : le même état, dans un autre ordre, reste le même.
    expect(memeEtat({ ...ETAT_VIDE, cellules: { w2_a: "x", w1_a: "y" } }, { ...ETAT_VIDE, cellules: { w1_a: "y", w2_a: "x", w3_a: "" } })).toBe(true);
    expect(memeEtat({ ...ETAT_VIDE, cellules: { w1_a: "y" } }, { ...ETAT_VIDE, cellules: { w1_a: "z" } })).toBe(false);
  });

  it("trouve la progression d'une année, d'un niveau et d'une période ; celles d'avant valent pour tous les niveaux", () => {
    const liste = [prog("2026-2027", "", 1), prog("2026-2027", "CP", 1), { ...prog("2026-2027", "", 2), niveau: undefined as unknown as string }];
    expect(progressionDe(liste, "2026-2027", "CP", 1)?.id).toBe("2026-2027-CP-1");
    expect(progressionDe(liste, "2026-2027", "", 1)?.id).toBe("2026-2027--1");
    expect(progressionDe(liste, "2026-2027", "", 2)).toBeDefined();
    expect(progressionDe(liste, "2026-2027", "CE1", 1)).toBeUndefined();
  });

  it("compte les semaines de la période, du lundi au vendredi, une rentrée un mardi comprise", () => {
    // P1 2026-2027 : rentrée le mardi 1er septembre, vacances le samedi 17 octobre.
    const s = semainesDeLaPeriode({ numero: 1, debut: "2026-09-01", fin: "2026-10-16" });
    expect(s).toHaveLength(7);
    expect(datesDeLaSemaine(s[0])).toBe("1–4 sept.");
    expect(datesDeLaSemaine(s[4])).toBe("28 sept. – 2 oct.");
    expect(datesDeLaSemaine(s[6])).toBe("12–16 oct.");
  });

  it("ne cache jamais une semaine remplie, même au-delà du calendrier", () => {
    expect(nombreDeSemaines(7, {})).toBe(7);
    expect(nombreDeSemaines(0, {})).toBe(8);
    expect(nombreDeSemaines(7, { w9_c1: "Fête de l'école" })).toBe(9);
    expect(nombreDeSemaines(7, { w9_c1: "  " })).toBe(7);
    // Une semaine où l'on n'a placé qu'une séance compte aussi.
    expect(nombreDeSemaines(7, {}, { w10_c1: ["s1"] })).toBe(10);
  });

  it("place des séances dans une case, sans doublon, et les relit telles quelles", () => {
    const e = avecSeances(ETAT_VIDE, 3, "c1", ["s1", "s2", "s1"]);
    expect(e.seances).toEqual({ w3_c1: ["s1", "s2"] });
    const json = enJson(e);
    expect(lireEtat({ ...json }).seances).toEqual({ w3_c1: ["s1", "s2"] });
    expect(memeEtat(e, avecSeances(e, 3, "c1", ["s1"]))).toBe(false);
    expect(avecSeances(e, 3, "c1", []).seances).toEqual({});
    // Un JSON abîmé ou des identifiants qui n'en sont pas ne font rien tomber.
    expect(lireEtat({ colonnesJson: "[]", cellulesJson: "{}", seancesJson: '{"w1_a":[1,"s9",""],"w2_a":"x"}' }).seances).toEqual({ w1_a: ["s9"] });
  });

  it("montre les niveaux de l'année à chaque période : ceux qui ont une progression et ceux qu'on vient d'ajouter", () => {
    const liste = [
      prog("2026-2027", "CM1", 1, [{ id: "a", titre: "EPS" }]),
      prog("2026-2027", "CP", 1),                                   // vide : retirée, elle ne se montre plus
      prog("2026-2027", "CE1", 2, [{ id: "b", titre: "EPS" }]),     // une autre période : le niveau vaut pour l'année
      prog("2025-2026", "CM2", 1, [{ id: "c", titre: "EPS" }]),     // une autre année
    ];
    expect(niveauxDeLaProgression(NIVEAUX, liste, "2026-2027", [cleNiveauAjoute("2026-2027", "GS"), cleNiveauAjoute("2027-2028", "PS")]))
      .toEqual(["GS", "CE1", "CM1"]);
    expect(niveauxDeLaProgression(NIVEAUX, [], "2026-2027", [])).toEqual([]);
    // Le tableau sans niveau : tant qu'il n'y a pas de niveau, ou qu'il a quelque chose dans l'année.
    expect(tableauSansNiveau(liste, "2026-2027", ["CE1", "CM1"])).toBe(false);
    expect(tableauSansNiveau([], "2026-2027", [])).toBe(true);
    expect(tableauSansNiveau([...liste, prog("2026-2027", "", 3, [{ id: "d", titre: "Rituel" }])], "2026-2027", ["CE1", "CM1"])).toBe(true);
  });

  it("tire les titres des matières, des domaines et des intitulés, chacun une fois, et les filtre sans accents", () => {
    const sources = [
      { groupe: "Matières", titres: ["EPS", "Mathématiques", "Temps calme"] },
      { groupe: "Domaines", titres: ["Nombres et calculs", "mathematiques"] },
      { groupe: "Emploi du temps", titres: ["Temps calme", "Piscine", " "] },
    ];
    expect(titresProposes(sources).map((g) => g.titres)).toEqual([["EPS", "Mathématiques", "Temps calme"], ["Nombres et calculs"], ["Piscine"]]);
    expect(titresProposes(sources, "math")).toEqual([{ groupe: "Matières", titres: ["Mathématiques"] }]);
    expect(titreConnu(sources, "piscine")).toBe(true);
    expect(titreConnu(sources, "Domaine")).toBe(false);
  });

  it("propose de reprendre les colonnes de la période la plus proche, puis d'un autre niveau, sans leurs cases", () => {
    const liste = [
      prog("2026-2027", "CP", 1, [{ id: "a", titre: "EPS" }], { w1_a: "Courir" }),
      prog("2026-2027", "CP", 4, [{ id: "b", titre: "Rituel" }]),
      prog("2026-2027", "", 2, [{ id: "c", titre: "Temps calme" }]),
      prog("2026-2027", "CE1", 2, [{ id: "d", titre: "Français" }]),
    ];
    const sources = sourcesDeColonnes(liste, "2026-2027", "CP", 2);
    expect(sources.map((s) => s.libelle)).toEqual(["P1", LA_CLASSE]);
    expect(sources[0].colonnes.map((c) => c.titre)).toEqual(["EPS"]);
    let n = 0;
    expect(copieDesColonnes(sources[0].colonnes, () => `neuf${++n}`)).toEqual([{ id: "neuf1", titre: "EPS", couleur: "blue" }]);
    expect(sourcesDeColonnes(liste, "2026-2027", "CP", 1)).toEqual([]);
  });

  it("retire une colonne avec ses cases, la remet à sa place, la déplace", () => {
    const e = {
      colonnes: [{ id: "a", titre: "EPS", couleur: "red" }, { id: "b", titre: "Rituel", couleur: "indigo" }],
      cellules: { w1_a: "Courir", w1_b: "Météo" }, seances: { w2_a: ["s1"] },
    };
    const sans = sansColonne(e, "a");
    expect(sans).toEqual({ colonnes: [e.colonnes[1]], cellules: { w1_b: "Météo" }, seances: {} });
    const remise = remettreColonne({ ...sans, cellules: { ...sans.cellules, w2_b: "Calendrier" } }, e.colonnes[0], 0, casesDeLaColonne(e, "a"));
    expect(remise.colonnes.map((c) => c.id)).toEqual(["a", "b"]);
    expect(remise.cellules).toEqual({ w1_a: "Courir", w1_b: "Météo", w2_b: "Calendrier" });
    expect(remise.seances).toEqual({ w2_a: ["s1"] });
    expect(deplacerColonne(e, "a", 1).colonnes.map((c) => c.id)).toEqual(["b", "a"]);
    expect(deplacerColonne(e, "a", -1)).toBe(e);
  });
});

describe("l'ordre des tableaux de l'année", () => {
  it("range les tableaux dans l'ordre choisi ; un niveau nouveau vient après, dans l'ordre de l'école", () => {
    expect(dansLOrdre(["", "CP", "CE1"], [])).toEqual(["", "CP", "CE1"]);
    expect(dansLOrdre(["", "CP", "CE1"], ["CE1", "", "CP"])).toEqual(["CE1", "", "CP"]);
    expect(dansLOrdre(["", "CP", "CE1", "CE2"], ["CE1", "CP"])).toEqual(["CE1", "CP", "", "CE2"]);
    // Un niveau retiré de l'année ne laisse pas de trou.
    expect(dansLOrdre(["", "CE1"], ["CE1", "CP", ""])).toEqual(["CE1", ""]);
  });

  it("monte et descend d'une place, sans sortir de la liste", () => {
    expect(deplacerTableau(["", "CP", "CE1"], "CE1", -1)).toEqual(["", "CE1", "CP"]);
    expect(deplacerTableau(["", "CP", "CE1"], "", 1)).toEqual(["CP", "", "CE1"]);
    expect(deplacerTableau(["", "CP"], "", -1)).toEqual(["", "CP"]);
    expect(deplacerTableau(["", "CP"], "CP", 1)).toEqual(["", "CP"]);
    expect(deplacerTableau(["", "CP"], "CM2", 1)).toEqual(["", "CP"]);
  });

  it("garde sa place à un tableau qui change de niveau, et se lit sans erreur", () => {
    expect(renommerDansLOrdre(["CP", "", "CE1"], "CP", "CE2")).toEqual(["CE2", "", "CE1"]);
    expect(renommerDansLOrdre(["CP", "", "CE2"], "CP", "CE2")).toEqual(["CE2", ""]);
    expect(renommerDansLOrdre(["", "CE1"], "CP", "CE2")).toEqual(["", "CE1"]);
    expect(lireOrdreDesTableaux('["CE1",""]')).toEqual(["CE1", ""]);
    expect(lireOrdreDesTableaux("pas du json")).toEqual([]);
    expect(lireOrdreDesTableaux(null)).toEqual([]);
    expect(cleOrdreDesTableaux("2026-2027")).toBe("ordreDesTableaux:2026-2027");
  });
});
