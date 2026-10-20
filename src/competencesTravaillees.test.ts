import { describe, it, expect } from "vitest";
import {
  nettoyerExtrait, lireCompetences, correspond, sourceProgrammation,
} from "./competencesTravaillees";
import { PROGRAMMES_OFFICIELS, nomDansLeCoffre } from "./data/programmesOfficiels";

describe("nettoyerExtrait", () => {
  it("retire puces, retours à la ligne et césures invisibles", () => {
    expect(nettoyerExtrait("– Comprendre\nun texte lu par l’adulte.\n\n")).toBe("Comprendre un texte lu par l’adulte.");
    expect(nettoyerExtrait("appren­tissage")).toBe("apprentissage");
  });
  it("garde un tiret qui fait partie du texte", () => {
    expect(nettoyerExtrait("Le nombre 10-20 et peut-être")).toBe("Le nombre 10-20 et peut-être");
  });
});

describe("lireCompetences", () => {
  it("relit une liste enregistrée et tolère un contenu abîmé", () => {
    expect(lireCompetences("pas du json")).toEqual([]);
    expect(lireCompetences(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(lireCompetences(JSON.stringify([{ texte: "X", statut: "bizarre" }]))[0].statut).toBe("encours");
  });
});

describe("parSource / correspond", () => {
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

describe("une compétence reprise de la programmation", () => {
  it("dit de quelle programmation elle vient", () => {
    expect(sourceProgrammation("2026-2027")).toBe("Programmation 2026-2027");
  });
});
