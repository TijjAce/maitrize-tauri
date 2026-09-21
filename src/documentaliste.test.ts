import { describe, it, expect, vi, beforeEach } from "vitest";

const appels: { messages: { role: string; content: string }[] }[] = [];
let web: { texte: string; sources: { titre: string; url: string }[]; aCherche: boolean } | Error =
  { texte: "Le guide « Pour enseigner les nombres » insiste sur la décomposition.", sources: [{ titre: "Éduscol", url: "https://eduscol.education.fr/x" }], aCherche: true };

const REFERENTIEL = {
  id: "r1", nom: "Programme cycle 1", cycle: "Cycle 1", estIntegre: true, actif: true, dateAjout: "",
  donnees: JSON.stringify({
    titre: "Cycle 1",
    domaines: [{
      id: "d1", titre: "Acquérir les premiers outils mathématiques",
      sousDomaines: [
        { id: "sd1", titre: "Découvrir les nombres et leurs utilisations", competences: [
          { id: "c1", texte: "Réaliser une collection dont le cardinal est donné", niveau: "GS" },
          { id: "c2", texte: "Utiliser le dénombrement pour comparer deux quantités", niveau: "MS" },
        ] },
        { id: "sd2", titre: "Explorer des formes et des grandeurs", competences: [
          { id: "c3", texte: "Classer des objets selon un critère de longueur", niveau: "MS" },
        ] },
      ],
    }],
  }),
};
const CYCLE2 = {
  id: "r2", nom: "Programme cycle 2", cycle: "Cycle 2", estIntegre: true, actif: true, dateAjout: "",
  donnees: JSON.stringify({
    titre: "Cycle 2",
    domaines: [{ id: "d2", titre: "Nombres et calculs", sousDomaines: [
      { id: "sd3", titre: "Nommer, lire, écrire les nombres", competences: [
        { id: "c4", texte: "Dénombrer une collection jusqu'à 100", niveau: "CP" },
      ] },
    ] }],
  }),
};

vi.mock("./api", () => ({
  api: {
    referentielsList: async () => [REFERENTIEL, CYCLE2],
    settingsAll: async () => ({ niveauClasse: "GS", typeStructure: "ime" }),
    modeleActif: async () => "ministral-8b-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push({ messages });
      return "## Ce que disent les programmes\n- « Réaliser une collection dont le cardinal est donné »";
    },
    mistralRechercheWeb: async () => { if (web instanceof Error) throw web; return web; },
  },
}));

import {
  chercherDansLesProgrammes, cycleDemande, cycleDuReferentiel, demanderAuxProgrammes,
  extraitsDesProgrammes, motsCles, promptDocumentaliste, questionWeb, ressourcesEduscol,
} from "./documentaliste";

beforeEach(() => { appels.length = 0; });

describe("d'une question à des mots cherchables", () => {
  it("jette les mots qui ne cherchent rien", () => {
    const m = motsCles("Que disent les programmes sur la numération en GS ?");
    expect(m).toContain("numeration");
    expect(m).toContain("gs");
    for (const vide of ["que", "disent", "programmes", "sur", "la", "en"]) expect(m).not.toContain(vide);
  });

  it("garde les niveaux, qui sont courts mais décisifs", () => {
    expect(motsCles("écriture en CP")).toEqual(["ecriture", "cp"]);
    expect(motsCles("autonomie en IME")).toEqual(["autonomie", "ime"]);
  });

  it("reconnaît le cycle visé, par le niveau ou en toutes lettres", () => {
    expect(cycleDemande("la numération en GS")).toBe(1);
    expect(cycleDemande("le repérage dans le temps au cycle 2")).toBe(2);
    expect(cycleDemande("la proportionnalité en CM2")).toBe(3);
    expect(cycleDemande("les gestes d'écriture")).toBe(null);
  });

  it("reconnaît le cycle d'un référentiel, même dit autrement", () => {
    expect(cycleDuReferentiel({ nom: "Programme cycle 1", cycle: "Cycle 1" })).toBe(1);
    expect(cycleDuReferentiel({ nom: "Maternelle 2026", cycle: "" })).toBe(1);
    expect(cycleDuReferentiel({ nom: "Mes compétences", cycle: "" })).toBe(null);
  });
});

describe("chercher dans les référentiels installés", () => {
  it("trouve la compétence attendue et la classe en tête", () => {
    const t = chercherDansLesProgrammes([REFERENTIEL, CYCLE2], "Que disent les programmes sur la numération en GS ?");
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].chemin).toContain("Découvrir les nombres");
    // Le cycle demandé écarte le cycle 2.
    expect(t.every((x) => x.referentiel === "Programme cycle 1")).toBe(true);
  });

  it("sans cycle demandé, les deux référentiels répondent", () => {
    const t = chercherDansLesProgrammes([REFERENTIEL, CYCLE2], "dénombrer une collection");
    expect(new Set(t.map((x) => x.referentiel)).size).toBe(2);
  });

  it("un intitulé qui contient le mot passe devant un simple domaine", () => {
    const t = chercherDansLesProgrammes([REFERENTIEL], "classer des objets selon leur longueur");
    expect(t[0].texte).toContain("Classer des objets");
  });

  it("un référentiel masqué ne répond pas", () => {
    expect(chercherDansLesProgrammes([{ ...REFERENTIEL, actif: false }], "cardinal")).toEqual([]);
  });

  it("un référentiel abîmé ne fait pas tomber la recherche", () => {
    const t = chercherDansLesProgrammes([{ ...REFERENTIEL, id: "x", donnees: "{pas du json" }, REFERENTIEL], "cardinal");
    expect(t.length).toBe(1);
  });

  it("une question sans mot utile ne ramène pas tout le programme", () => {
    expect(chercherDansLesProgrammes([REFERENTIEL], "que faut-il faire ?")).toEqual([]);
  });
});

describe("les guides déjà connus de l'application", () => {
  it("propose des ressources Éduscol sur le sujet", () => {
    const r = ressourcesEduscol("la phonologie en maternelle");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.url.startsWith("https://"))).toBe(true);
  });

  it("ne propose rien pour une question sans mot utile", () => {
    expect(ressourcesEduscol("et donc ?")).toEqual([]);
  });
});

describe("la consigne", () => {
  it("impose les programmes d'abord et interdit d'inventer une compétence", () => {
    const m = promptDocumentaliste({
      question: "numération en GS", extraits: "- [Cycle 1] … — Réaliser une collection",
      ressources: [], web: "", contexte: "",
    });
    expect(m[0].content).toContain("Ordre de confiance");
    expect(m[0].content).toContain("N'en invente aucune");
    expect(m[1].content).toContain("Réaliser une collection");
  });

  it("oriente la recherche web vers les sources officielles", () => {
    const q = questionWeb("la numération en GS");
    expect(q).toContain("eduscol.education.fr");
    expect(q).toContain("Bulletin officiel");
    expect(q).toContain("Ne cite aucun blog");
  });

  it("chaque extrait porte son chemin, pour pouvoir être recopié", () => {
    const extraits = extraitsDesProgrammes([
      { id: "c1", referentiel: "Cycle 1", chemin: "Maths › Nombres", texte: "Réaliser une collection", niveau: "GS", score: 4 },
    ]);
    expect(extraits).toBe("- [Cycle 1] Maths › Nombres — (GS) Réaliser une collection");
  });
});

describe("la réponse complète", () => {
  it("part des référentiels, puis du web, et rend les deux", async () => {
    web = { texte: "Guide Éduscol…", sources: [{ titre: "Éduscol", url: "https://eduscol.education.fr/x" }], aCherche: true };
    const r = await demanderAuxProgrammes("Que disent les programmes sur la numération en GS ?");
    expect(r.competences.length).toBeGreaterThan(0);
    expect(r.sources).toHaveLength(1);
    expect(r.aCherche).toBe(true);
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).toContain("Réaliser une collection");
    expect(envoye).toContain("Guide Éduscol…");
    // Le contexte de la classe part, jamais les élèves.
    expect(appels[0].messages[0].content).toContain("ESMS");
  });

  it("si le web échoue, la réponse tient quand même aux programmes, et le dit", async () => {
    web = new Error("Ce modèle n'est pas inclus dans votre abonnement");
    const r = await demanderAuxProgrammes("la numération en GS");
    expect(r.competences.length).toBeGreaterThan(0);
    expect(r.avertissement).toContain("abonnement");
    expect(r.texte).toContain("Ce que disent les programmes");
  });

  it("sans recherche web demandée, rien ne part en ligne", async () => {
    web = new Error("ne doit pas être appelé");
    const r = await demanderAuxProgrammes("la numération en GS", { web: false });
    expect(r.avertissement).toBeUndefined();
    expect(r.aCherche).toBe(false);
  });
});
