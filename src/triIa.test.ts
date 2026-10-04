import { describe, it, expect } from "vitest";
import { marquesDeLaReponse, promptMarquerVerbes, promptRangerEtiquettes, promptTransposer, rangementDeLaReponse, transpositionDeLaReponse } from "./triIa";

describe("marquer les verbes avec l'IA", () => {
  it("envoie les phrases nues, une par ligne, et dit de ne rien changer", () => {
    const messages = promptMarquerVerbes(["Je *suis* content.", "Il a un vélo."]);
    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(messages[1].content).toBe("Je suis content.\nIl a un vélo.");
    expect(messages[0].content).toContain("entourant d'astérisques le verbe conjugué");
    expect(messages[0].content).toContain("Ne change aucun mot");
  });

  it("ne garde que les lignes recopiées à la lettre", () => {
    const phrases = ["Je suis content.", "Il a un vélo.", "Hier.", "Nous avons des livres.", "J’ai un cartable."];
    const reponse = "Voici :\n1. Je *suis* content.\n- Il *a* un beau vélo.\nHier.\nNous *avons* des livres.\nJ'*ai* un cartable.\n";
    const { phrases: sortie, marquees } = marquesDeLaReponse(reponse, phrases);
    expect(sortie).toEqual([
      "Je *suis* content.",
      // Le modèle a ajouté un mot : on garde la phrase de l'enseignant.
      "Il a un vélo.",
      // Pas de verbe : rien à marquer.
      "Hier.",
      "Nous *avons* des livres.",
      // L'apostrophe de l'enseignant revient.
      "J’*ai* un cartable.",
    ]);
    expect(marquees).toBe(3);
  });

  it("laisse ce qui était marqué à la main quand le modèle ne propose rien de sûr", () => {
    const { phrases, marquees } = marquesDeLaReponse("n'importe quoi", ["Tu *es* là.", "Elle chante."]);
    expect(phrases).toEqual(["Tu *es* là.", "Elle chante."]);
    expect(marquees).toBe(0);
    expect(marquesDeLaReponse("", []).phrases).toEqual([]);
    // Une proposition remplace la marque posée à la main.
    expect(marquesDeLaReponse("Hier, j'*ai joué* au ballon.", ["Hier, j'*ai* joué au ballon."]).phrases).toEqual(["Hier, j'*ai joué* au ballon."]);
  });
});

describe("ranger les étiquettes du projet avec l'IA", () => {
  it("numérote les maisons et donne les étiquettes nues", () => {
    const [systeme, user] = promptRangerEtiquettes(["Nom", "Verbe"], ["citrouille", "*couper*"]);
    expect(systeme.content).toContain("le numéro de la maison");
    expect(user.content).toBe("Maisons :\n1. Nom\n2. Verbe\n\nÉtiquettes :\ncitrouille\ncouper");
  });

  it("range ce que le modèle a recopié à la lettre, et rend le reste", () => {
    const etiquettes = ["citrouille", "couper", "Nous coupons la citrouille.", "soupe", "2 carottes", "chaud"];
    const reponse = [
      "1\tcitrouille",
      "2. couper",
      "0\tNous coupons la citrouille.",   // aucune maison : à la main
      "1 - la soupe",                     // déformée : à la main
      "1\t2 carottes",                    // une étiquette qui commence par un chiffre
      "3\tchaud",                         // une maison qui n'existe pas
      "1\tcitrouille",                    // en double : une seule fois
    ].join("\n");
    expect(rangementDeLaReponse(reponse, 2, etiquettes)).toEqual({
      parMaison: [["citrouille", "2 carottes"], ["couper"]],
      ecartees: ["Nous coupons la citrouille.", "soupe", "chaud"],
    });
  });

  it("ne range rien d'une réponse vide", () => {
    expect(rangementDeLaReponse("", 2, ["a"])).toEqual({ parMaison: [[], []], ecartees: ["a"] });
  });
});

describe("transposer un modèle au thème du projet", () => {
  it("demande des étiquettes sur le patron des exemples, avec les mots du thème", () => {
    const [systeme, demande] = promptTransposer(
      [{ titre: "Verbe être", exemples: ["Je *suis* content.", "Tu *es* à l'école."] }, { titre: "Verbe avoir", exemples: ["J'*ai* un cartable."] }],
      "Halloween", ["citrouille", "sorcière"], 8, 2);
    expect(systeme.content).toContain("cycle 2");
    expect(systeme.content).toContain("8 étiquettes par maison");
    expect(demande.content).toBe("Maisons :\n1. Verbe être — exemples : Je *suis* content. / Tu *es* à l'école.\n2. Verbe avoir — exemples : J'*ai* un cartable.\n\nThème : Halloween\nMots du thème : citrouille, sorcière");
  });

  it("garde chaque étiquette dans sa maison ; écarte le reste, les doublons et le trop-plein", () => {
    const reponse = [
      "Voici les étiquettes :",
      "1\tLa sorcière *est* sur son balai.",
      "2\tLe fantôme *a* un drap blanc.",
      "1. Nous *sommes* déguisés.",
      "3\tUne maison qui n'existe pas.",
      "2\tle fantôme *a* un drap blanc.",
      "1\tLa citrouille *est orange.",
      "2 - J'*ai* une lanterne.",
      "1\tTu *es* une momie.",
    ].join("\n");
    expect(transpositionDeLaReponse(reponse, 2, 2)).toEqual([
      ["La sorcière *est* sur son balai.", "Nous *sommes* déguisés."],
      ["Le fantôme *a* un drap blanc.", "J'*ai* une lanterne."],
    ]);
  });
});
