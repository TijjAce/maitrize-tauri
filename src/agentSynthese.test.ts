import { beforeEach, describe, expect, it, vi } from "vitest";
import { DISPOSITIFS } from "./data/dispositifs";

// Une classe inventée : l'élève, un camarade, et l'AESH dans les contacts de l'établissement.
const ELEVES = [{ id: "e1", nom: "Zéphyrin Aubépin", niveau: "CP" }, { id: "e2", nom: "Anatole Brisebois", niveau: "CP" }];
const premierAmenagement = (() => {
  const c = DISPOSITIFS.find((d) => d.id === "pap")!.sections.flatMap((s) => s.champs).find((x) => x.t === "grille")!;
  return { id: c.id, item: c.t === "grille" ? c.items[0] : "" };
})();
const DOCUMENTS: Record<string, string> = {
  "dispositif:pap": JSON.stringify({ responsables: "M. et Mme Lointain", adresse: "1 rue des Lilas", pointsAppui: "Secret du médecin", [premierAmenagement.id]: { "0:1": true } }),
  "dispositif:pai": JSON.stringify({ pathologie: "Asthme sévère" }),
  "dispositif:ppre": JSON.stringify({ objectifs: [["Lire 20 mots", "sans aide", "décembre"]], actions: [["Lecture en binôme", "Ondine", "lundi"]] }),
  ppi: JSON.stringify({
    besoins: "Des repères visuels", amenagements: "L'emploi du temps en pictos", prisesEnCharge: [{ id: "p", intitule: "Orthophonie", creneau: "mardi" }],
    objectifs: [{ id: "o", domaine: "Lecture", intitule: "Reconnaître son prénom", critere: "", echeance: "", statut: "atteint", notes: "" }],
    bilans: [{ id: "b1", date: "2026-10-01", texte: "Bon début d'année" }, { id: "b2", date: "2025-06-01", texte: "Bilan de l'an dernier" }],
  }),
  gevasco: JSON.stringify({
    adresse: "1 rue des Lilas", tel: "06 00 00 00 00", niveauApprentissages: "Début de CP", acquisitions: "nonatteintes",
    cadres: { Lecture: { obstacles: "La fatigue", appuis: "Les images" } }, natureDifficultes: "Un trouble nommé", perspectives: "Une ULIS", remarquesFamille: "Rien",
  }),
};
const appels: { role: string; content: string }[][] = [];

vi.mock("./api", () => ({
  api: {
    elevesList: async () => ELEVES,
    settingsAll: async () => ({ "etab:soignants": "Ondine (AESH)" }),
    commentairesList: async () => [
      { id: "o1", date: "2026-10-05", texte: "Zéphyrin a lu seul la consigne, avec Ondine à côté.", type: "observation", eleveId: "e1" },
      { id: "o2", date: "2026-10-06", texte: "Il a toussé toute la matinée.", type: "santé", eleveId: "e1" },
    ],
    observationsList: async () => [{
      id: "g1", eleveId: "e1", date: "2026-10-08", creneauId: null, contexte: "", axe: "Communication", domaine: "Langage", competence: "",
      note: "", reussites: "Demande de l'aide", difficultes: "", hypotheses: "", amenagements: "Des pictos", reajustement: "", dateCreation: "", dateMaj: "",
    }],
    creneauxList: async () => [{
      id: "c1", date: "2026-10-09", heureDebut: "09:00", heureFin: "10:00", matiere: "Maths", couleur: "", seanceId: null, atelierId: null,
      espaceId: null, elevesJson: JSON.stringify(["e1"]), nature: "classe", prevu: "", bilan: "Zéphyrin a compté jusqu'à 10. Anatole l'a aidé.",
    }],
    documentEleveGet: async (_id: string, type: string) => DOCUMENTS[type] ?? null,
    evaluationsList: async () => [],
    notesEleveList: async () => [],
    reunionsList: async () => [{
      id: "r1", titre: "ESS", genre: "ESS", date: "2026-10-12", participants: "", tranchesJson: "[]",
      compteRendu: "Zéphyrin participe davantage. Ondine l'accompagne le matin.", dureeS: 0, dateCreation: "", dateMaj: "",
    }],
    modeleActif: async () => "mistral-medium-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push(messages);
      return "## Bilan\n[P1] progresse, avec [P2] à ses côtés.\n## Mathématiques\n[P1] compte jusqu'à 10.";
    },
  },
}));

import { AgentArrete, ETAPES_DE_L_AGENT, lancerLAgent, partFaite, texteDesPlans, texteDuGevasco, texteDuPpi, type AvancementDeLAgent } from "./agentSynthese";

beforeEach(() => { appels.length = 0; });

const lancer = (arrete?: () => boolean) => {
  const pas: AvancementDeLAgent[] = [];
  const promesse = lancerLAgent({
    eleve: ELEVES[0], autresEleves: ["Anatole Brisebois"], debut: "2026-08-01", fin: "2026-10-20", periode: "du 01/08/2026 au 20/10/2026",
    surAvancement: (av) => pas.push(av), arrete, pas: 0,
  });
  return { pas, promesse };
};

describe("l'agent de synthèse", () => {
  it("lit chaque source dans l'ordre, et la barre avance jusqu'au bout", async () => {
    const { pas, promesse } = lancer();
    const { redige, lus } = await promesse;
    expect(pas.map((p) => p.etape)).toEqual([...ETAPES_DE_L_AGENT.keys(), ETAPES_DE_L_AGENT.length]);
    const trouves = pas[pas.length - 1].trouves;
    expect(trouves).toMatchObject({ dossier: 1, observations: 1, grille: 1, journal: 1, reunions: 1 });
    expect(trouves.plans).toBeGreaterThan(0);
    expect(trouves.ppi).toBe(4);
    expect(lus).toBeGreaterThan(8);
    // L'élève revient sous son prénom, l'adulte sous le sien.
    expect(redige.bilan).toBe("Zéphyrin progresse, avec Ondine à ses côtés.");
    expect(Object.keys(redige.sections)).toHaveLength(1);
  });

  it("envoie la pédagogie de chaque source, sans nom, sans santé, sans coordonnées", async () => {
    await lancer().promesse;
    expect(appels).toHaveLength(1);
    const envoye = appels[0].map((m) => m.content).join("\n");
    for (const present of ["[P1]", "[P2]", "un camarade", "Demande de l'aide", "compté jusqu'à 10", "Lire 20 mots", premierAmenagement.item,
      "Reconnaître son prénom", "Bon début d'année", "Les images", "Début de CP", "participe davantage", "Niveau : CP"]) {
      expect(envoye, present).toContain(present);
    }
    for (const absent of ["Zéphyrin", "Ondine", "Anatole", "toussé", "Asthme", "Orthophonie", "1 rue des Lilas", "06 00", "Lointain",
      "Secret du médecin", "Un trouble nommé", "Une ULIS", "Bilan de l'an dernier"]) {
      expect(envoye, absent).not.toContain(absent);
    }
  });

  it("s'arrête quand on l'arrête, sans rien envoyer", async () => {
    await expect(lancer(() => true).promesse).rejects.toBeInstanceOf(AgentArrete);
    expect(appels).toHaveLength(0);
  });

  it("compte la lecture pour 60 % de la barre, la rédaction pour le reste", () => {
    const lectures = ETAPES_DE_L_AGENT.length - 1;
    expect(partFaite(0)).toBe(0);
    expect(partFaite(lectures)).toBeCloseTo(0.6);
    expect(partFaite(lectures, 0.5)).toBeCloseTo(0.8);
    expect(partFaite(lectures, 3)).toBeCloseTo(0.98);
    expect(partFaite(ETAPES_DE_L_AGENT.length)).toBe(1);
  });

  it("ne garde des documents que ce qui est pédagogique", () => {
    expect(texteDesPlans({ pai: DOCUMENTS["dispositif:pai"] })).toBe("");
    expect(texteDesPlans({ pap: DOCUMENTS["dispositif:pap"] })).toContain(premierAmenagement.item);
    expect(texteDuPpi(null, "", "")).toBe("");
    expect(texteDuGevasco("pas du json")).toBe("");
    expect(texteDuGevasco(DOCUMENTS.gevasco)).toContain("Acquisitions du cycle : pas encore atteintes");
  });
});
