import { describe, it, expect, vi, beforeEach } from "vitest";

const appels: { messages: { role: string; content: string }[] }[] = [];
let reponse = "## Bilan\n[P1] progresse.\n## Mathématiques\n[P1] dénombre jusqu'à 10.";

vi.mock("./api", () => ({
  api: {
    settingsAll: async () => ({ typeStructure: "ime" }),
    modeleActif: async () => "ministral-8b-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push({ messages });
      return reponse;
    },
  },
}));

import {
  citeLePrenom, dossierDesEcrits, ecritsDesObservations, ecritsDesReunions, ecritsDuJournal,
  lireSyntheseRedigee, nouveauxDepuis, phrasesQuiCitent, poserLaRedaction, prenomDe,
  rassembler, redigerSyntheseSuivie, resumeDesEcrits, type Ecrit,
} from "./veilleEleve";
import type { SyntheseEleve } from "./synthese";

const creneau = (p: Partial<any> = {}): any => ({
  id: "c1", date: "2026-09-15", heureDebut: "09:00", heureFin: "10:00", matiere: "Maths",
  couleur: "blue", seanceId: null, atelierId: null, espaceId: null,
  elevesJson: JSON.stringify(["e1"]), nature: "classe", prevu: "", bilan: "", ...p,
});
const reunion = (p: Partial<any> = {}): any => ({
  id: "r1", titre: "ESS", genre: "ESS", date: "2026-09-12", participants: "",
  tranchesJson: "[]", compteRendu: "", dureeS: 0, dateCreation: "", dateMaj: "", ...p,
});

beforeEach(() => { appels.length = 0; });

describe("reconnaître l'élève dans un texte", () => {
  it("un prénom, oui ; le même mot en minuscule, non", () => {
    expect(citeLePrenom("Rose a rangé le matériel.", "Rose")).toBe(true);
    expect(citeLePrenom("Il a colorié la fleur rose.", "Rose")).toBe(false);
    expect(citeLePrenom("Camille-Rose est arrivée.", "Rose")).toBe(false);
    expect(citeLePrenom("Camille a lu.", "Camille")).toBe(true);
  });

  it("ne garde d'un bilan de groupe que les phrases qui nomment l'élève", () => {
    const bilan = "Ayyûb a trié les couleurs seul. Camille a eu besoin d'aide pour tenir les ciseaux. Le groupe était calme.";
    expect(phrasesQuiCitent(bilan, "Camille")).toBe("Camille a eu besoin d'aide pour tenir les ciseaux.");
    // Rien sur lui : rien ne passe.
    expect(phrasesQuiCitent(bilan, "Louise")).toBe("");
  });

  it("découpe aussi sur les retours à la ligne", () => {
    expect(phrasesQuiCitent("Atelier cuisine\nCamille a versé seule\nAyyûb a observé", "Camille"))
      .toBe("Camille a versé seule");
  });

  it("le prénom se tire du nom complet", () => {
    expect(prenomDe("Camille Bernard")).toBe("Camille");
    expect(prenomDe("  Ayyûb  ")).toBe("Ayyûb");
  });
});

describe("ramasser ce qui est écrit", () => {
  const observations: any[] = [
    { id: "o1", date: "2026-09-16T08:00:00Z", texte: "Sait demander de l'aide.", type: "langage", eleveId: "e1" },
    { id: "o2", date: "2026-09-16T08:00:00Z", texte: "Rendez-vous orthophoniste.", type: "santé", eleveId: "e1" },
    { id: "o3", date: "2026-09-16T08:00:00Z", texte: "A partagé le matériel.", type: "comportement", eleveId: "e2" },
  ];

  it("les observations de santé restent hors de la synthèse", () => {
    const e = ecritsDesObservations(observations, "e1");
    expect(e).toHaveLength(1);
    expect(e[0].texte).toBe("Sait demander de l'aide.");
  });

  it("le cahier journal ne donne que ce qui nomme l'élève", () => {
    const e = ecritsDuJournal([
      creneau({ bilan: "Camille a compté jusqu'à 12. Ayyûb a rangé." }),
      creneau({ id: "c2", bilan: "Séance calme, tout le monde a participé." }),
    ], "e1", "Camille");
    expect(e).toHaveLength(1);
    expect(e[0].texte).toBe("Camille a compté jusqu'à 12.");
    expect(e[0].source).toBe("Cahier journal — Maths");
  });

  it("un temps de réunion n'est pas un temps de classe", () => {
    expect(ecritsDuJournal([creneau({ nature: "reunion", bilan: "Camille évoquée." })], "e1", "Camille")).toEqual([]);
  });

  it("un compte rendu de réunion compte, et à défaut les résumés de tranches", () => {
    const avecCr = ecritsDesReunions([reunion({ compteRendu: "## Décisions\n- Camille passe à la cantine le mardi." })], "Camille");
    expect(avecCr[0].texte).toContain("cantine");
    expect(avecCr[0].source).toContain("ESS");

    const avecTranches = ecritsDesReunions([reunion({
      tranchesJson: JSON.stringify([
        { id: "t1", rang: 1, debut: 0, fin: 300, resume: "- Camille progresse en lecture.", etat: "fait" },
        { id: "t2", rang: 2, debut: 300, fin: 600, resume: "—", etat: "fait" },
      ]),
    })], "Camille");
    expect(avecTranches[0].texte).toContain("progresse en lecture");
  });

  it("tout est rassemblé, du plus récent au plus ancien", () => {
    const tout = rassembler({
      observations, creneaux: [creneau({ bilan: "Camille a compté jusqu'à 12." })],
      reunions: [reunion({ compteRendu: "- Camille mange à la cantine." })],
      eleveId: "e1", nom: "Camille Bernard",
    });
    expect(tout.map((e) => e.origine)).toEqual(["observation", "journal", "reunion"]);
    expect(tout[0].date >= tout[1].date).toBe(true);
  });
});

describe("ce qui est nouveau depuis la dernière synthèse", () => {
  const ecrits: Ecrit[] = [
    { origine: "observation", date: "2026-09-20", texte: "a", source: "Observation (langage)" },
    { origine: "journal", date: "2026-09-10", texte: "b", source: "Cahier journal" },
  ];

  it("sans synthèse précédente, tout est nouveau", () => {
    expect(nouveauxDepuis(ecrits, undefined)).toHaveLength(2);
  });

  it("après une synthèse, seuls les écrits postérieurs comptent", () => {
    expect(nouveauxDepuis(ecrits, "2026-09-15T10:00:00Z")).toHaveLength(1);
  });

  it("se dit en français, au bon nombre", () => {
    expect(resumeDesEcrits(ecrits)).toBe("1 observation, 1 passage du cahier journal");
    expect(resumeDesEcrits([ecrits[0], ecrits[0]])).toBe("2 observations");
    expect(resumeDesEcrits([])).toBe("");
  });
});

describe("la rédaction", () => {
  it("découpe la réponse en bilan et en domaines, même titrés court", () => {
    const lu = lireSyntheseRedigee("## Bilan\nUn texte.\n## Mathématiques\nDeux phrases.\n## Inconnu\nIgnoré.");
    expect(lu.bilan).toBe("Un texte.");
    expect(lu.sections.maths).toBe("Deux phrases.");
    expect(Object.keys(lu.sections)).toHaveLength(1);
  });

  it("aucun camarade et aucun prénom ne part, et le prénom revient à l'arrivée", async () => {
    reponse = "## Bilan\n[P1] progresse et joue avec un camarade.";
    const r = await redigerSyntheseSuivie({
      eleve: { id: "e1", nom: "Camille Bernard" },
      autresEleves: ["Ayyûb Haddad"],
      ecrits: [{ origine: "journal", date: "2026-09-15", texte: "Camille a joué avec Ayyûb.", source: "Cahier journal" }],
      suivi: "Compétence travaillée : dénombrer.",
      periode: "du 01/09 au 21/09",
    });
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Ayyûb");
    expect(envoye).toContain("un camarade");
    expect(r.bilan).toBe("Camille progresse et joue avec un camarade.");
  });

  it("sans rien d'écrit, on n'appelle pas l'IA pour rien", async () => {
    await expect(redigerSyntheseSuivie({
      eleve: { id: "e1", nom: "Camille" }, autresEleves: [], ecrits: [], suivi: "", periode: "",
    })).rejects.toThrow();
    expect(appels).toHaveLength(0);
  });

  it("une réponse inexploitable ne remplace rien en silence", async () => {
    reponse = "Bien sûr ! Voici la synthèse.";
    await expect(redigerSyntheseSuivie({
      eleve: { id: "e1", nom: "Camille" }, autresEleves: [], ecrits: [],
      suivi: "Compétence : dénombrer.", periode: "",
    })).rejects.toThrow(/exploitable/);
  });

  it("les écrits partent datés et sourcés, et les longs sont coupés", () => {
    const long = "Camille " + "a".repeat(500);
    const d = dossierDesEcrits([{ origine: "observation", date: "2026-09-15", texte: long, source: "Observation (langage)" }]);
    expect(d.startsWith("- 15/09/2026 · Observation (langage) : ")).toBe(true);
    expect(d.length).toBeLessThan(460);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("poser la rédaction dans la synthèse", () => {
  const base: SyntheseEleve = {
    debut: "2026-09-01", fin: "2026-09-21", bilan: "Écrit à la main.",
    sections: { langage: "Déjà écrit." },
  };

  it("sans remplacement, ce que l'enseignant a écrit reste intact", () => {
    const s = poserLaRedaction(base, { bilan: "Proposé.", sections: { langage: "Proposé.", maths: "Neuf." } }, false);
    expect(s.bilan).toBe("Écrit à la main.");
    expect(s.sections.langage).toBe("Déjà écrit.");
    expect(s.sections.maths).toBe("Neuf.");
  });

  it("avec remplacement, tout est repris, et la veille repart de maintenant", () => {
    const s = poserLaRedaction(base, { bilan: "Proposé.", sections: { langage: "Proposé." } }, true);
    expect(s.bilan).toBe("Proposé.");
    expect(s.sections.langage).toBe("Proposé.");
    expect(s.vuLe).toBeTruthy();
  });
});
