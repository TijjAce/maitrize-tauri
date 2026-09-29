import { describe, it, expect } from "vitest";
import { marquesDeLaReponse, promptMarquerVerbes } from "./triIa";

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
