import { describe, it, expect } from "vitest";
import {
  CONSIGNE_ORALE, SANS_MOT_NOUVEAU_MS, SILENCE_APRES_LA_PHRASE_S, SILENCE_EN_SUSPENS_S, lecteurAuFil, morceauxALire, pretALire, questionFinie, texteALire,
} from "./conversationVocale";

describe("parler avec l'Assistant à voix haute (demande de l'enseignant, 3 novembre 2026)", () => {
  it("envoie la question dès que la phrase est finie : vite si Voxtral l'a ponctuée, un peu plus tard sinon — même tout bas", () => {
    const parle = (silence: number) => ({ parole: 2, silence });
    expect(questionFinie(parle(SILENCE_APRES_LA_PHRASE_S), "Comment travailler la fluence ?", 500)).toBe(true);
    expect(questionFinie(parle(SILENCE_APRES_LA_PHRASE_S), "Comment travailler la", 500)).toBe(false);
    expect(questionFinie(parle(SILENCE_EN_SUSPENS_S), "Comment travailler la", 500)).toBe(true);
    // « Laisse quelques millisecondes de plus » (5 novembre 2026) : 0,8 s de silence ne suffit plus, 1,1 s, si.
    expect(SILENCE_APRES_LA_PHRASE_S).toBe(1.1);
    expect(SILENCE_EN_SUSPENS_S).toBe(1.6);
    expect(questionFinie(parle(0.8), "Comment travailler la fluence ?", 500)).toBe(false);
    expect(questionFinie(parle(1.3), "Comment travailler la", 500)).toBe(false);
    // Rien de dit, ou à peine un souffle : rien ne part.
    expect(questionFinie(parle(5), "", 5000)).toBe(false);
    expect(questionFinie({ parole: 0.2, silence: 3 }, "Bon", 500)).toBe(false);
    // La prise de son n'a rien vu : plus aucun mot depuis un moment suffit.
    expect(questionFinie({ parole: 0, silence: 0 }, "Comment faire ?", SANS_MOT_NOUVEAU_MS.ponctuee)).toBe(true);
    expect(questionFinie({ parole: 0, silence: 0 }, "Comment faire ?", 1200)).toBe(false);
    expect(questionFinie({ parole: 0, silence: 0 }, "Comment faire", SANS_MOT_NOUVEAU_MS.ponctuee)).toBe(false);
    expect(questionFinie({ parole: 0, silence: 0 }, "Comment faire", SANS_MOT_NOUVEAU_MS.enSuspens)).toBe(true);
  });

  it("lit la réponse pendant qu'elle s'écrit : la première phrase avant la fin, chaque morceau une fois, dans l'ordre", async () => {
    expect(pretALire("Bien sûr. Commencez par", false)).toBe("Bien sûr.".length);
    expect(pretALire("Il mesure 3.5 cm", false)).toBe(0);
    expect(pretALire("Bien sûr. Commencez par", true)).toBe("Bien sûr. Commencez par".length);
    const demandes: string[] = [];
    const joues: string[] = [];
    let debuts = 0;
    const l = lecteurAuFil({
      voix: async (t) => { demandes.push(t); return `audio:${t}`; },
      jouer: async (a) => { joues.push(a); await new Promise((r) => setTimeout(r, 5)); },
      surDebut: () => { debuts++; },
    });
    l.suivre("Bien sûr. Commencez", false);
    await new Promise((r) => setTimeout(r, 1));
    // La première phrase part avant que la réponse soit finie.
    expect(demandes).toEqual(["Bien sûr."]);
    l.suivre("Bien sûr. Commencez par une **lecture modèle**, puis", false);
    l.suivre("Bien sûr. Commencez par une **lecture modèle**, puis faites lire les élèves à deux.", true);
    await l.fin;
    expect(demandes).toEqual(["Bien sûr.", "Commencez par une lecture modèle, puis faites lire les élèves à deux."]);
    expect(joues).toEqual(demandes.map((t) => `audio:${t}`));
    expect(debuts).toBe(1);
  });

  it("se tait d'un coup quand on l'arrête, et passe un morceau dont la voix échoue", async () => {
    const joues: string[] = [];
    const erreurs: unknown[] = [];
    const l = lecteurAuFil({
      voix: async (t) => { if (t.startsWith("Deux")) throw new Error("voix"); return t; },
      jouer: async (a) => { joues.push(a); },
      surErreur: (e) => erreurs.push(e),
    });
    // Les phrases arrivent une à une, comme la réponse s'écrit : chacune son morceau.
    l.suivre("Une phrase. ", false);
    l.suivre("Une phrase. Deux phrases. ", false);
    l.suivre("Une phrase. Deux phrases. Trois phrases.", true);
    await l.fin;
    expect(joues).toEqual(["Une phrase.", "Trois phrases."]);
    expect(erreurs).toHaveLength(1);
    const dun = lecteurAuFil({ voix: async (t) => t, jouer: async (a) => { joues.push(a); } });
    joues.length = 0;
    dun.suivre("Tout d'un coup. Une suite. Et une fin.", true);
    await dun.fin;
    expect(joues).toEqual(["Tout d'un coup.", "Une suite. Et une fin."]);
    const muet = lecteurAuFil({ voix: async (t) => t, jouer: async () => { await new Promise((r) => setTimeout(r, 50)); } });
    muet.suivre("Une phrase. Deux phrases.", false);
    muet.arreter();
    await muet.fin;
    muet.suivre("Une phrase. Deux phrases. Trois.", true);
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
