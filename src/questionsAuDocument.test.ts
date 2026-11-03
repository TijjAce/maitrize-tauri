import { describe, it, expect } from "vitest";
import {
  NE_LE_DIT_PAS, bilanDesCitations, consigneDuDocument, demandeDuDocument, neLeDitPas, passagesDuDocument, passagesPourLaQuestion, verifierLesCitations,
} from "./questionsAuDocument";
import type { PageLue } from "./quizDesGuides";

// Un document écrit pour l'essai : trois pages, la deuxième imprimée « 2 » sur la troisième page du PDF.
const pages: PageLue[] = [
  { numero: 1, texte: "Guide d'essai. Sommaire et présentation du guide." },
  { numero: 2, etiquette: "1", texte: "La lecture à voix haute par l'enseignant est un moment quotidien de la classe. "
    + "Il est recommandé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit." },
  { numero: 3, etiquette: "2", texte: "La fluence se travaille chaque jour, par des lectures répétées de textes courts. "
    + "On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période." },
];

describe("demander à un document du coffre-fort (demande de l'enseignant, 3 novembre 2026)", () => {
  it("découpe le document en passages, chacun sous le numéro que sa page imprime", () => {
    const passages = passagesDuDocument(pages);
    expect(passages.map((p) => [p.page, p.affiche])).toEqual([[1, "1"], [2, "1"], [3, "2"]]);
    const petits = passagesDuDocument(pages, 90);
    expect(petits.length).toBeGreaterThan(3);
    expect(petits.every((p) => p.texte.length <= 130)).toBe(true);
  });

  it("envoie les passages qui parlent de la question ; à défaut, des passages de tout le document", () => {
    const passages = passagesDuDocument(pages);
    expect(passagesPourLaQuestion(passages, "Comment mesurer la fluence ?").map((p) => p.page)).toEqual([3]);
    // La page qui partage le plus de mots passe en tête ; celle qui n'en partage qu'un vient avec, à sa place dans le document.
    expect(passagesPourLaQuestion(passages, "Faut-il poser des questions pendant la lecture à voix haute ?", 1).map((p) => p.page)).toEqual([2]);
    expect(passagesPourLaQuestion(passages, "Faut-il poser des questions pendant la lecture à voix haute ?").map((p) => p.page)).toEqual([2, 3]);
    expect(passagesPourLaQuestion(passages, "Résume", 2).map((p) => p.page)).toEqual([1, 2]);
    expect(passagesPourLaQuestion([], "x")).toEqual([]);
    const demande = demandeDuDocument(passagesPourLaQuestion(passages, "la fluence"), "  Comment mesurer la fluence ?  ");
    expect(demande).toBe("[p. 2]\nLa fluence se travaille chaque jour, par des lectures répétées de textes courts. "
      + "On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période.\n\nQuestion : Comment mesurer la fluence ?");
  });

  it("demande des citations mot pour mot avec leur page, et rien d'inventé", () => {
    const c = consigneDuDocument("Guide d'essai");
    expect(c).toContain("« Guide d'essai »");
    expect(c).toMatch(/recopiée mot pour mot entre guillemets français, suivie de sa page/);
    expect(c).toContain(NE_LE_DIT_PAS);
    expect(neLeDitPas("Le document ne le dit pas.")).toBe(true);
    expect(neLeDitPas("le document ne le dit pas, hélas")).toBe(true);
    expect(neLeDitPas("Le document dit ceci.")).toBe(false);
  });

  it("retrouve chaque citation dans le document, et signale celle qu'il ne retrouve pas", () => {
    const reponse = "Il ne faut pas multiplier les questions : « Il est recommandé de ne pas multiplier les questions pendant la lecture » (p. 1). "
      + "La fluence se mesure : « On mesure les progrès en comptant les mots lus correctement en une minute » (p. 1). "
      + "Et : « Il faut corriger chaque erreur devant toute la classe » (p. 2). Le mot « fluence » (p. 2) revient.";
    const v = verifierLesCitations(reponse, pages);
    // La deuxième citation est sur la page imprimée « 2 », pas « 1 » : retrouvée quand même ; la troisième, inventée.
    expect([v.verifiees, v.introuvables]).toEqual([2, 1]);
    expect(v.texte).toContain("« Il faut corriger chaque erreur devant toute la classe » (p. 2) ⚠️ *(citation introuvable dans le document)*");
    expect(v.texte.match(/introuvable/g)).toHaveLength(1);
    expect(verifierLesCitations("Sans citation.", pages)).toEqual({ texte: "Sans citation.", verifiees: 0, introuvables: 0 });
  });

  it("dit sous la réponse ce qui a été retrouvé, ce qui ne l'a pas été, et qu'une réponse sans citation n'est pas vérifiée", () => {
    expect(bilanDesCitations({ verifiees: 2, introuvables: 0 }, "Guide")).toBe("📖 2 citations retrouvées dans « Guide ».");
    expect(bilanDesCitations({ verifiees: 1, introuvables: 0 }, "Guide")).toBe("📖 1 citation retrouvée dans « Guide ».");
    expect(bilanDesCitations({ verifiees: 0, introuvables: 1 }, "Guide")).toBe("⚠️ 1 citation introuvable dans « Guide » : à vérifier.");
    expect(bilanDesCitations({ verifiees: 2, introuvables: 1 }, "Guide"))
      .toBe("📖 2 citations retrouvées dans « Guide » ; ⚠️ 1 introuvable : à vérifier.");
    expect(bilanDesCitations({ verifiees: 0, introuvables: 0 }, "Guide")).toBe("⚠️ Cette réponse ne cite pas « Guide » : rien ne la vérifie.");
  });
});
