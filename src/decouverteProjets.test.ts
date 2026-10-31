import { beforeEach, describe, expect, it, vi } from "vitest";

// Une classe inventée : jamais un vrai prénom dans le dépôt.
const appels: { messages: { role: string; content: string }[]; json: boolean }[] = [];
let reponse = "";
vi.mock("./api", () => ({
  api: {
    elevesList: async () => [{ id: "e1", nom: "Zéphyrin Aubépin" }],
    settingsAll: async () => ({}),
    modeleActif: async () => "mistral-medium-latest",
    mistralChat: async (messages: { role: string; content: string }[], _modele: string, json: boolean) => {
      appels.push({ messages, json });
      return reponse;
    },
  },
  newId: () => "id",
  nowIso: () => "2026-10-31T10:00:00Z",
}));

const {
  ACCUEIL_DECOUVERTE, catalogueEnBref, consigneDeLaDecouverte, decouvrirLocalement, demanderALaDecouverte, ideesDeLaReponse, lireReponseDecouverte,
} = await import("./decouverteProjets");
const { CATALOGUE } = await import("./projets");

beforeEach(() => { appels.length = 0; });

describe("découvrir les projets par la conversation", () => {
  it("sans l'IA, cherche sur l'ordinateur : les mots du message, le mois nommé d'abord", () => {
    const monnaie = decouvrirLocalement("Je voudrais travailler la monnaie");
    expect(monnaie.projets).toContain("p-marchande");
    expect(monnaie.reponse).toMatch(/^Voici \d+ projets\. Cochez ceux qui vous plaisent, puis cliquez sur un mois/);
    // « une sortie » et « en novembre » : les sorties d'abord, le mois en plus.
    const sortie = decouvrirLocalement("une sortie en octobre");
    expect(sortie.projets).toContain("p-sortie");
    expect(sortie.projets[0]).toMatch(/^p-(cueillette|mediatheque)$/);
    expect(sortie.reponse).toContain("plutôt en octobre");
    // Tout un thème, quand on ne dit que lui ; tout le catalogue, quand on le demande.
    expect(decouvrirLocalement("les sciences")).toMatchObject({ theme: "sciences", projets: [] });
    expect(decouvrirLocalement("Montrez-moi tout le catalogue")).toMatchObject({ tous: true });
    expect(decouvrirLocalement("zzz qwerty").projets).toEqual([]);
    expect(decouvrirLocalement("zzz qwerty").reponse).toMatch(/^Je n'ai rien trouvé/);
  });

  it("montre les projets choisis, tout un thème ou tout le catalogue — rien d'autre", () => {
    expect(ideesDeLaReponse({ reponse: "", projets: ["p-potager", "p-marchande"] }).map((i) => i.id)).toEqual(["p-potager", "p-marchande"]);
    expect(ideesDeLaReponse({ reponse: "", projets: [], theme: "sorties" }).every((i) => i.theme === "sorties")).toBe(true);
    expect(ideesDeLaReponse({ reponse: "", projets: [], tous: true })).toHaveLength(CATALOGUE.length);
    expect(ideesDeLaReponse({ reponse: "", projets: [] })).toEqual([]);
    expect(ACCUEIL_DECOUVERTE).toMatch(/^Que voulez-vous faire avec la classe/);
  });

  it("donne au modèle tout le catalogue, un projet par ligne, et relit sa réponse avec méfiance", () => {
    expect(catalogueEnBref().split("\n")).toHaveLength(CATALOGUE.length);
    expect(consigneDeLaDecouverte("31/10/2026")).toContain("p-potager | Le potager de l'école | sciences | plutôt en avril |");
    expect(lireReponseDecouverte('{"reponse": "Deux idées.", "projets": ["p-potager", "p-inventé", "p-potager", 3], "theme": "cuisine", "tous": "oui"}'))
      .toEqual({ reponse: "Deux idées.", projets: ["p-potager"] });
    expect(lireReponseDecouverte('{"reponse": "Les sorties.", "projets": [], "theme": "sorties"}')).toEqual({ reponse: "Les sorties.", projets: [], theme: "sorties" });
    expect(lireReponseDecouverte("Vous cherchez plutôt pour la rentrée ?")).toEqual({ reponse: "Vous cherchez plutôt pour la rentrée ?", projets: [] });
  });

  it("parle à Mistral en JSON, sans le prénom d'un élève ; l'accueil reste à l'écran", async () => {
    reponse = '{"reponse": "Pour [P1], deux projets calmes.", "projets": ["p-emotions", "p-portraits"]}';
    const r = await demanderALaDecouverte([
      { role: "assistant", content: ACCUEIL_DECOUVERTE },
      { role: "user", content: "Un projet pour aider Zéphyrin à dire ce qu'il ressent." },
    ], "31/10/2026");
    expect(appels).toHaveLength(1);
    expect(appels[0].json).toBe(true);
    expect(appels[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(JSON.stringify(appels[0].messages)).not.toContain("Zéphyrin");
    expect(r).toEqual({ reponse: "Pour Zéphyrin, deux projets calmes.", projets: ["p-emotions", "p-portraits"] });
  });
});
