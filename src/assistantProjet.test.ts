import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjetClasse } from "./api";

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
  accueilDuProjet, appliquerLaReponse, consigneDeLAssistant, demanderALAssistant, ficheDuProjet, lireReponseAssistant, moisLu,
} = await import("./assistantProjet");

const projet = (x: Partial<ProjetClasse> = {}): ProjetClasse => ({
  id: "p1", titre: "", descriptif: "", couleur: "indigo", dateCreation: "", annee: "2026-2027", imageNom: null, mois: "11", semaine: "",
  etat: "idee", etapesJson: "[]", domaines: "", origine: "", mots: "", phrases: "", ...x,
});

beforeEach(() => { appels.length = 0; });

describe("l'assistant d'un projet", () => {
  it("accueille un projet neuf par une question, un projet commencé par ce qu'on veut changer", () => {
    expect(accueilDuProjet(projet({ titre: "Nouveau projet" }))).toMatch(/^Racontez-moi votre projet/);
    expect(accueilDuProjet(projet({ titre: "La soupe de citrouille" }))).toMatch(/^« La soupe de citrouille » : que voulez-vous changer/);
  });

  it("lit la fiche telle qu'elle est : le moment, les étapes cochées, le corpus", () => {
    const f = ficheDuProjet(projet({
      titre: "La soupe", mois: "11", semaine: "2026-11-16",
      etapesJson: JSON.stringify([{ texte: "Acheter la citrouille", faite: true }, { texte: "Cuisiner", faite: false }]), mots: "citrouille\nsoupe",
    }), "2026-2027");
    expect(f).toContain("Moment : novembre, semaine du 16 au 20");
    expect(f).toContain("1. Acheter la citrouille (faite) ; 2. Cuisiner");
    expect(f).toContain("2 mots (citrouille, soupe)");
    expect(consigneDeLAssistant(projet(), "2026-2027", "31/10/2026")).toMatch(/objet JSON[\s\S]*Aujourd'hui : 31\/10\/2026/);
  });

  it("relit la réponse avec méfiance : ce qui ne se lit pas ne change rien", () => {
    const r = lireReponseAssistant('Voici : {"reponse": "C\'est noté.", "titre": "  La soupe  de citrouille ", "mois": "décembre", '
      + '"semaine": "2026-12-09", "etapes": ["Choisir la recette", "", 3, "Cuisiner"], "corpus": "tout", "motsAjoutes": ["louche"]} Fin.', "2026-2027", "11");
    expect(r).toEqual({ reponse: "C'est noté.", titre: "La soupe de citrouille", mois: "12", semaine: "2026-12-07", etapes: ["Choisir la recette", "Cuisiner"], motsAjoutes: ["louche"] });
    // Une semaine sans mois se range dans le mois qu'elle donne ; « » : tout le mois.
    expect(lireReponseAssistant('{"reponse": "Bien.", "semaine": "2026-11-18"}', "2026-2027", "11")).toEqual({ reponse: "Bien.", mois: "11", semaine: "2026-11-16" });
    expect(lireReponseAssistant('{"reponse": "Bien.", "semaine": ""}', "2026-2027", "11").semaine).toBe("");
    // Du texte sans JSON : il se dit tel quel, sans rien changer.
    expect(lireReponseAssistant("Pouvez-vous préciser ?", "2026-2027", "11")).toEqual({ reponse: "Pouvez-vous préciser ?" });
    expect(lireReponseAssistant('{"titre": "Sans réponse"}', "2026-2027", "11").reponse).toMatch(/C'est noté/);
    expect([moisLu("11"), moisLu(3), moisLu("nov."), moisLu("Juillet"), moisLu("13")]).toEqual(["11", "03", "11", undefined, undefined]);
  });

  it("range la réponse dans la fiche : une étape gardée reste cochée, un autre mois remet la semaine à « tout le mois »", () => {
    const p = projet({ titre: "La soupe", mois: "11", semaine: "2026-11-16", mots: "citrouille\nsoupe",
      etapesJson: JSON.stringify([{ texte: "Acheter la citrouille", faite: true }]) });
    const suite = appliquerLaReponse(p, { reponse: "", mois: "12", etapes: ["acheter la citrouille", "Cuisiner"], motsAjoutes: ["Louche", "soupe"], motsRetires: ["citrouille"] });
    expect([suite.mois, suite.semaine]).toEqual(["12", ""]);
    expect(JSON.parse(suite.etapesJson)).toEqual([{ texte: "acheter la citrouille", faite: true }, { texte: "Cuisiner", faite: false }]);
    expect(suite.mots).toBe("soupe\nLouche");
    expect(appliquerLaReponse(p, { reponse: "Bien." })).toBe(p);
    expect(appliquerLaReponse(p, { reponse: "", semaine: "2026-11-23" }).semaine).toBe("2026-11-23");
  });

  it("parle à Mistral en JSON, sans le prénom d'un élève, et le lui rend dans sa réponse", async () => {
    reponse = '{"reponse": "[P1] aimera la soupe, c\'est noté.", "titre": "La soupe de citrouille"}';
    const r = await demanderALAssistant(projet({ titre: "Nouveau projet" }), "2026-2027",
      [{ role: "assistant", content: "Racontez-moi votre projet." }, { role: "user", content: "Une soupe de citrouille en novembre, Zéphyrin adore ça." }], "31/10/2026");
    expect(appels).toHaveLength(1);
    expect(appels[0].json).toBe(true);
    // L'accueil reste à l'écran : la conversation part de l'enseignant.
    expect(appels[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(JSON.stringify(appels[0].messages)).not.toContain("Zéphyrin");
    expect(appels[0].messages[1].content).toContain("[P1]");
    expect(r).toEqual({ reponse: "Zéphyrin aimera la soupe, c'est noté.", titre: "La soupe de citrouille" });
  });
});
