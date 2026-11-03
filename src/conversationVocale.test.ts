import { describe, it, expect } from "vitest";
import { CONSIGNE_ORALE, morceauxALire, questionFinie, texteALire } from "./conversationVocale";

describe("parler avec l'Assistant à voix haute (demande de l'enseignant, 3 novembre 2026)", () => {
  it("envoie la question après une seconde et demie de silence, une fois qu'on a parlé — même tout bas", () => {
    expect(questionFinie({ parole: 0, silence: 5 })).toBe(false);
    expect(questionFinie({ parole: 2, silence: 1 })).toBe(false);
    expect(questionFinie({ parole: 2, silence: 1.5 })).toBe(true);
    expect(questionFinie({ parole: 0.2, silence: 3 })).toBe(false);
  });

  it("lit une réponse sans sa mise en forme : ni dièses, ni astérisques, ni emoji, les listes et les tableaux en phrases", () => {
    const md = "## Trois idées\n\n- **Les dés** : pour compter.\n- Un *jeu* de cartes\n1. La [bande numérique](https://exemple.fr)\n\n"
      + "| Séance | Durée |\n|---|---|\n| Découverte | 30 min |\n\n✨ Bonne séance ! `code`";
    const lu = texteALire(md);
    expect(lu).not.toMatch(/[#*|`[\]✨]|https/);
    expect(lu).toBe("Trois idées. Les dés : pour compter. Un jeu de cartes. La bande numérique. Séance, Durée. Découverte, 30 min. Bonne séance ! code");
    expect(texteALire("")).toBe("");
    // Un mot_composé et un nombre avec des étoiles de multiplication ne perdent pas leur sens.
    expect(texteALire("3 * 4 = 12")).toBe("3 4 = 12");
  });

  it("découpe ce qu'elle lit en morceaux que la voix accepte, aux fins de phrase", () => {
    const phrase = (n: number) => `Phrase numéro ${n} qui dit quelque chose d'utile à l'enseignant.`;
    const long = Array.from({ length: 40 }, (_, i) => phrase(i + 1)).join(" ");
    const morceaux = morceauxALire(long, 300);
    expect(morceaux.every((m) => m.length <= 300)).toBe(true);
    expect(morceaux.every((m) => /\.$/.test(m))).toBe(true);
    expect(morceaux.join(" ")).toBe(long);
    // Une phrase sans fin, trop longue : coupée aux virgules, puis aux mots, sans rien perdre.
    const sansFin = Array.from({ length: 80 }, (_, i) => `mot${i},`).join(" ");
    const coupee = morceauxALire(sansFin, 100);
    expect(coupee.every((m) => m.length <= 100)).toBe(true);
    expect(coupee.join(" ").replace(/\s+/g, " ")).toBe(sansFin);
    expect(morceauxALire("")).toEqual([]);
  });

  it("demande des réponses faites pour l'oral", () => {
    expect(CONSIGNE_ORALE).toMatch(/deux à quatre phrases courtes/);
    expect(CONSIGNE_ORALE).toMatch(/sans liste, sans tableau, sans emoji/);
  });
});
