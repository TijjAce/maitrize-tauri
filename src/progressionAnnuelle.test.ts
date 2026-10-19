import { describe, expect, it } from "vitest";
import type { ProgressionAnnuelle } from "./api";
import {
  avecCase, casesDeLaColonne, copieDesColonnes, datesDeLaSemaine, deplacerColonne, enJson, lireEtat, memeEtat,
  nombreDeSemaines, progressionDe, remettreColonne, sansColonne, semainesDeLaPeriode, sourcesDeColonnes, titreConnu,
  titresProposes, LA_CLASSE, niveauxDeLaPeriode, cleNiveauAjoute,
} from "./progressionAnnuelle";

const NIVEAUX = ["TPS", "PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"];
const prog = (annee: string, niveau: string, periode: number, colonnes: { id: string; titre: string }[] = [], cellules = {}): ProgressionAnnuelle => ({
  id: `${annee}-${niveau}-${periode}`, annee, niveau, periode,
  colonnesJson: JSON.stringify(colonnes.map((c) => ({ ...c, couleur: "blue" }))), cellulesJson: JSON.stringify(cellules),
});

describe("la progression annuelle", () => {
  it("se lit sans tomber sur un JSON abîmé, et ne garde pas les cases vides", () => {
    expect(lireEtat({ colonnesJson: "{pas du json", cellulesJson: "[]" })).toEqual({ colonnes: [], cellules: {} });
    const e = lireEtat({ colonnesJson: '[{"id":"c1","titre":"EPS","couleur":"red"},{"titre":"sans id"}]', cellulesJson: '{"w1_c1":"Courir","w2_c1":""}' });
    expect(e.colonnes.map((c) => c.titre)).toEqual(["EPS"]);
    expect(e.cellules).toEqual({ w1_c1: "Courir" });
    expect(JSON.parse(enJson(avecCase(e, 1, "c1", "")).cellulesJson)).toEqual({});
    // La base range les cases par clé : le même état, dans un autre ordre, reste le même.
    expect(memeEtat({ colonnes: [], cellules: { w2_a: "x", w1_a: "y" } }, { colonnes: [], cellules: { w1_a: "y", w2_a: "x", w3_a: "" } })).toBe(true);
    expect(memeEtat({ colonnes: [], cellules: { w1_a: "y" } }, { colonnes: [], cellules: { w1_a: "z" } })).toBe(false);
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
  });

  it("montre sous la classe les niveaux de la période : ceux qui y ont une progression et ceux qu'on vient d'ajouter", () => {
    const liste = [
      prog("2026-2027", "CM1", 1, [{ id: "a", titre: "EPS" }]),
      prog("2026-2027", "CP", 1),                                   // vide : retirée, elle ne se montre plus
      prog("2026-2027", "CE1", 2, [{ id: "b", titre: "EPS" }]),     // une autre période
      prog("2025-2026", "CM2", 1, [{ id: "c", titre: "EPS" }]),     // une autre année
    ];
    expect(niveauxDeLaPeriode(NIVEAUX, liste, "2026-2027", 1, [cleNiveauAjoute("2026-2027", 1, "GS"), cleNiveauAjoute("2026-2027", 2, "PS")]))
      .toEqual(["GS", "CM1"]);
    expect(niveauxDeLaPeriode(NIVEAUX, [], "2026-2027", 1, [])).toEqual([]);
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
    const e = { colonnes: [{ id: "a", titre: "EPS", couleur: "red" }, { id: "b", titre: "Rituel", couleur: "indigo" }], cellules: { w1_a: "Courir", w1_b: "Météo" } };
    const sans = sansColonne(e, "a");
    expect(sans).toEqual({ colonnes: [e.colonnes[1]], cellules: { w1_b: "Météo" } });
    const remise = remettreColonne({ ...sans, cellules: { ...sans.cellules, w2_b: "Calendrier" } }, e.colonnes[0], 0, casesDeLaColonne(e, "a"));
    expect(remise.colonnes.map((c) => c.id)).toEqual(["a", "b"]);
    expect(remise.cellules).toEqual({ w1_a: "Courir", w1_b: "Météo", w2_b: "Calendrier" });
    expect(deplacerColonne(e, "a", 1).colonnes.map((c) => c.id)).toEqual(["b", "a"]);
    expect(deplacerColonne(e, "a", -1)).toBe(e);
  });
});
