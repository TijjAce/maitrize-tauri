import { describe, it, expect } from "vitest";
import { moteurDeLaDictee, paroleMinimale, plafondDuMorceau, sortieDeLAudio } from "./transcription";
import { LACUNE, texteDeLaDictee } from "./dictee";

describe("où se transcrit une dictée au micro", () => {
  it("reste sur l'ordinateur dès qu'un modèle y est, quel que soit le réglage des réunions", () => {
    expect(moteurDeLaDictee(true, null)).toEqual({ moteur: "local" });
    expect(moteurDeLaDictee(true, "ligne")).toEqual({ moteur: "local" });
    expect(moteurDeLaDictee(true, "local")).toEqual({ moteur: "local" });
  });

  it("part en ligne sans modèle — sauf si l'enseignant a choisi le local : on le lui dit plutôt que d'envoyer", () => {
    expect(moteurDeLaDictee(false, null)).toEqual({ moteur: "ligne" });
    expect(moteurDeLaDictee(false, "ligne")).toEqual({ moteur: "ligne" });
    expect(moteurDeLaDictee(false, undefined)).toEqual({ moteur: "ligne" });
    const refus = moteurDeLaDictee(false, "local");
    expect("erreur" in refus && refus.erreur).toContain("Aucun modèle de transcription");
  });

  it("coupe plus court et dit autre chose de l'audio quand tout reste ici", () => {
    expect(paroleMinimale("local")).toBeLessThan(paroleMinimale("ligne"));
    expect(plafondDuMorceau("local")).toBeLessThan(plafondDuMorceau("ligne"));
    expect(sortieDeLAudio("local")).toContain("n'en sort pas");
    expect(sortieDeLAudio("ligne")).toContain("Mistral");
  });
});

describe("le texte d'une dictée transcrite phrase à phrase", () => {
  it("remet les phrases bout à bout, dans l'ordre de la parole", () => {
    expect(texteDeLaDictee([" Léa a lu seule. ", "", "Elle a relu."], null)).toEqual({ texte: "Léa a lu seule. Elle a relu.", erreur: null });
    // Rien n'a été dit : ni texte, ni erreur.
    expect(texteDeLaDictee([], null)).toEqual({ texte: "", erreur: null });
    expect(texteDeLaDictee(["", " "], null)).toEqual({ texte: "", erreur: null });
  });

  it("laisse une lacune là où le moteur a échoué, et rend l'erreur quand rien n'a pu s'écrire", () => {
    expect(texteDeLaDictee(["Bonjour.", LACUNE, "À demain."], "Décodage impossible")).toEqual({ texte: `Bonjour. ${LACUNE} À demain.`, erreur: null });
    expect(texteDeLaDictee([LACUNE, LACUNE], "Décodage impossible")).toEqual({ texte: "", erreur: "Décodage impossible" });
    expect(texteDeLaDictee([LACUNE], null)).toEqual({ texte: "", erreur: "Transcription impossible." });
  });
});
