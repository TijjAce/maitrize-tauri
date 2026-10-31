import { beforeEach, describe, expect, it, vi } from "vitest";

// Une classe inventée : l'élève, un camarade, un élève dont on ne sait rien, et l'AESH dans les contacts de l'établissement.
const ELEVES = [
  { id: "e1", nom: "Zéphyrin Aubépin", niveau: "CP" },
  { id: "e2", nom: "Anatole Brisebois", niveau: "CP" },
  { id: "e3", nom: "Philémon Carillon", niveau: "GS", nonVerbal: true },
];
const DOCUMENTS: Record<string, string> = {
  synthese: JSON.stringify({
    debut: "2026-08-01", fin: "2026-10-30",
    bilan: "Zéphyrin progresse en lecture ; il demande de l'aide à Ondine.",
    sections: { vivre: "Il range seul son casier, et attend son tour avec un sablier.", langage: "Il nomme les images de l'imagier." },
  }),
  "dispositif:pap": JSON.stringify({ responsables: "M. et Mme Lointain", adresse: "1 rue des Lilas" }),
  "dispositif:pai": JSON.stringify({ pathologie: "Asthme sévère" }),
  ppi: JSON.stringify({ besoins: "Des repères visuels", amenagements: "L'emploi du temps en pictos" }),
};
const appels: { role: string; content: string }[][] = [];
let reponse = "";

vi.mock("./api", () => ({
  api: {
    elevesList: async () => ELEVES,
    settingsAll: async () => ({ "etab:soignants": "Ondine (AESH)" }),
    commentairesList: async () => [
      { id: "o1", date: "2026-10-05", texte: "Zéphyrin a joué au memory avec Anatole.", type: "observation", eleveId: "e1" },
      { id: "o2", date: "2026-10-06", texte: "Il a toussé toute la matinée.", type: "santé", eleveId: "e1" },
    ],
    observationsList: async () => [],
    creneauxList: async () => [],
    documentEleveGet: async (id: string, type: string) => (id === "e1" ? DOCUMENTS[type] ?? null : null),
    evaluationsList: async () => [],
    notesEleveList: async () => [],
    reunionsList: async () => [],
    modeleActif: async () => "mistral-medium-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push(messages);
      return reponse;
    },
  },
}));

import { POINTS_A_SAVOIR, lireASavoir, redigerASavoir, texteDeLaSynthese } from "./aSavoirDesEleves";

beforeEach(() => {
  appels.length = 0;
  reponse = "Communication / langage : [P1] montre les pictos pour demander. Il aime raconter.\n"
    + "**Social** : joue volontiers avec un camarade.\n- Niveau : début de CP, il lit des syllabes.\nMétéo : beau temps.\n"
    + "Comportement / régulation : le sablier l'aide à attendre son tour";
});

const rediger = (i: number) => redigerASavoir({
  eleve: ELEVES[i], autresEleves: ELEVES.filter((_, k) => k !== i).map((e) => e.nom), debut: "2026-08-01", fin: "2026-10-30",
});

describe("« À savoir » : ce que l'agent dit de chaque élève à la personne qui remplace", () => {
  it("demande les cinq points, sa synthèse en tête, sans nom, sans santé ni famille", async () => {
    await rediger(0);
    expect(appels).toHaveLength(1);
    const [systeme, demande] = appels[0];
    for (const p of POINTS_A_SAVOIR) expect(systeme.content).toContain(`« ${p.point} : »`);
    expect(systeme.content).toMatch(/cinq lignes au plus/);
    expect(demande.content).toMatch(/Sa synthèse, écrite pour l'enseignant :\nBilan : \[P1\] progresse en lecture/);
    expect(demande.content).toContain("Il range seul son casier");
    expect(demande.content).toContain("Classe de l'élève : CP");
    const envoye = appels[0].map((m) => m.content).join("\n");
    for (const interdit of ["Zéphyrin", "Aubépin", "Anatole", "Ondine", "toussé", "Asthme", "Lointain", "Lilas"]) expect(envoye, interdit).not.toContain(interdit);
    expect(envoye).toContain("un camarade");
  });

  it("garde une phrase par point, avec sa majuscule, dans l'ordre de la feuille, le prénom revenu", async () => {
    expect(await rediger(0)).toEqual([
      { point: "Communication / langage", texte: "Zéphyrin montre les pictos pour demander." },
      { point: "Social", texte: "Joue volontiers avec un camarade." },
      { point: "Niveau", texte: "Début de CP, il lit des syllabes." },
      { point: "Comportement / régulation", texte: "Le sablier l'aide à attendre son tour." },
    ]);
  });

  it("ne demande rien pour un élève dont on ne sait que la classe", async () => {
    expect(await rediger(1)).toEqual([]);
    // Qui ne parle pas : le dossier le dit, sans appel.
    expect(await rediger(2)).toEqual([{ point: "Communication / langage", texte: "Ne s'exprime pas oralement." }]);
    expect(appels).toHaveLength(0);
  });

  it("lit les réponses : puces, numéros et gras tolérés, un point une fois, cinq au plus", () => {
    const lu = lireASavoir([
      "1. **Comportement / régulation** : se calme au coin lecture. Puis il revient.",
      "2) Autonomie : s'habille seul",
      "• Le social : cherche les adultes.",
      "Social : une seconde fois.",
      "Langage et communication : parle par mots isolés !",
      "Le niveau de l'élève : lit des mots simples.",
      "Remarque : rien d'autre.",
    ].join("\n"));
    expect(lu.map((p) => p.point)).toEqual(["Communication / langage", "Social", "Autonomie / vie quotidienne", "Niveau", "Comportement / régulation"]);
    expect(lu.map((p) => p.texte)).toEqual(["Parle par mots isolés !", "Cherche les adultes.", "S'habille seul.", "Lit des mots simples.", "Se calme au coin lecture."]);
    expect(lireASavoir("Bonjour.\nVoici ce que je sais.")).toEqual([]);
  });

  it("lit la synthèse enregistrée : le bilan, puis chaque domaine écrit", () => {
    expect(texteDeLaSynthese(DOCUMENTS.synthese)).toBe(
      "Bilan : Zéphyrin progresse en lecture ; il demande de l'aide à Ondine.\n"
      + "Langage oral et écrit — français : Il nomme les images de l'imagier.\n"
      + "Vivre ensemble, autonomie et comportement : Il range seul son casier, et attend son tour avec un sablier.",
    );
    expect(texteDeLaSynthese(null)).toBe("");
    expect(texteDeLaSynthese("{abîmé")).toBe("");
  });
});
