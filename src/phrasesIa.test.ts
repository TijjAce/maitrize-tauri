import { describe, it, expect } from "vitest";
import { DEMANDE_PHRASES, phrasesDeLaReponse, promptPhrases } from "./phrasesIa";

describe("les phrases demandées à l'IA", () => {
  it("disent le thème, le cycle, le nombre et la longueur — et rien de la classe", () => {
    const messages = promptPhrases({ ...DEMANDE_PHRASES, theme: "la ferme", combien: 8, motsMax: 5 });
    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(messages[1].content).toBe("8 phrases sur le thème : la ferme, 5 mots au plus chacune.");
    expect(messages[0].content).toContain("cycle 2");
    expect(messages[0].content).toContain("entre 3 et 5 mots");
    expect(messages[0].content).toContain("une par ligne");
    expect(promptPhrases({ ...DEMANDE_PHRASES, cycle: 3 })[0].content).toContain("cycle 3");
    expect(promptPhrases(DEMANDE_PHRASES)[1].content).toBe("6 phrases, 6 mots au plus chacune.");
    // Des valeurs absurdes reviennent dans les bornes.
    expect(promptPhrases({ ...DEMANDE_PHRASES, combien: 999, motsMax: 0 })[1].content).toBe("20 phrases, 6 mots au plus chacune.");
  });

  it("relisent la réponse : une phrase par ligne, sans numéros, tirets, guillemets ni doublons", () => {
    const rep = "Voici les phrases :\n1. Le chat dort.\n2) « La poule pond un œuf »\n- le coq chante le matin\n• Le chat dort.\n\n```\nOù est la vache ?\n```\nMaman\n";
    expect(phrasesDeLaReponse(rep)).toEqual(["Le chat dort.", "La poule pond un œuf.", "Le coq chante le matin.", "Où est la vache ?"]);
    expect(phrasesDeLaReponse("")).toEqual([]);
  });
});
