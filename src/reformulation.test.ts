import { describe, it, expect, vi, beforeEach } from "vitest";

const appels: { messages: { role: string; content: string }[] }[] = [];
vi.mock("./api", () => ({
  api: {
    elevesList: async () => [{ nom: "Apolline Martin" }, { nom: "Léo Dubois" }],
    modeleActif: async () => "ministral-8b-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push({ messages });
      // Le modèle reformule en gardant les marqueurs.
      return "« [P1] a lu un texte seule, puis elle a aidé [P2]. »";
    },
  },
}));

import { reformuler, consigne, nettoyerReponse, STYLES } from "./reformulation";

beforeEach(() => { appels.length = 0; });

describe("reformuler", () => {
  it("aucun nom d'élève ne part vers l'IA, et les noms reviennent dans la proposition", async () => {
    const p = await reformuler("Apolline Martin lit seule. Elle aide Léo.", "reformuler");
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    for (const nom of ["Apolline", "Martin", "Léo"]) expect(envoye).not.toContain(nom);
    expect(p.texte).toBe("Apolline Martin a lu un texte seule, puis elle a aidé Léo.");
    expect(p.nomsMasques).toBe(2);
    expect(p.nomsAbsents).toEqual([]);
  });
});

describe("consigne", () => {
  it("chaque style a sa consigne, et toutes interdisent d'inventer et gardent les marqueurs", () => {
    for (const s of STYLES) {
      const c = consigne(s.id);
      expect(c).toContain("N'invente rien");
      expect(c).toContain("[P1]");
    }
    expect(consigne("corriger")).toContain("uniquement l'orthographe");
  });
});

describe("nettoyerReponse", () => {
  it("retire les guillemets englobants et les annonces", () => {
    expect(nettoyerReponse("« Texte propre. »")).toBe("Texte propre.");
    expect(nettoyerReponse("Voici le texte reformulé :\nTexte propre.")).toBe("Texte propre.");
    expect(nettoyerReponse("```\nTexte propre.\n```")).toBe("Texte propre.");
  });
  it("garde des guillemets qui ne sont qu'une citation", () => {
    expect(nettoyerReponse("Il a dit « bonjour » puis « merci ».")).toBe("Il a dit « bonjour » puis « merci ».");
  });
});
