import { describe, it, expect, vi, beforeEach } from "vitest";

const appels: { messages: { role: string; content: string }[] }[] = [];
let reponse = "- L'orientation en ULIS est évoquée.\n- La famille demande un temps de cantine.";

vi.mock("./api", () => ({
  MODELE_TACHES: "ministral-8b-latest",
  api: {
    elevesList: async () => [{ nom: "Camille Bernard" }, { nom: "Ayyûb Haddad" }],
    modeleActif: async () => "ministral-8b-latest",
    mistralChat: async (messages: { role: string; content: string }[]) => {
      appels.push({ messages });
      return reponse;
    },
  },
}));

import {
  PHRASES_PAR_RANGEMENT, SECONDES_PAR_RELECTURE, RUBRIQUES, TRANCHE_S, ajouterAuTexte,
  assezPourRelire, assezPourResumer, convertirAnciennes,
  decouperEnPhrases, dureeLisible, ecrirePlan, ecrireResumes, fusionnerPlan, horodatage,
  lirePlan, lireResumes, lireTranches, mettreAuPropre, nettoyer, nomDeLaReunion, promptRelecture,
  relireLeDocument,
  phrasesEnAttente, planVide, promptCompteRendu, promptPassage, promptRangement, rangerLeDocument, redigerCompteRendu,
  repereDuResume, resumerPassage, riendedit, sansMarqueursOrphelins, texteACopier, type Resume,
} from "./reunion";

const resume = (p: Partial<Resume> = {}): Resume => ({
  id: "r1", rang: 1, de: 0, a: 10, texte: "- Un point.", etat: "fait", ...p,
});

beforeEach(() => { appels.length = 0; });

describe("découper le texte en phrases", () => {
  it("coupe sur la ponctuation forte et les retours à la ligne", () => {
    expect(decouperEnPhrases("Bonjour. Ça va ? Oui !")).toEqual(["Bonjour.", "Ça va ?", "Oui !"]);
    expect(decouperEnPhrases("Premier point\nDeuxième point")).toEqual(["Premier point", "Deuxième point"]);
    expect(decouperEnPhrases("   ")).toEqual([]);
  });

  it("garde une phrase inachevée : la réunion continue", () => {
    expect(decouperEnPhrases("On commence. Et ensuite")).toEqual(["On commence.", "Et ensuite"]);
  });
});

describe("le rythme des deux agents", () => {
  it("range dès la première phrase : la parole brute ne traîne pas à l'écran", () => {
    expect(assezPourResumer(0)).toBe(false);
    expect(assezPourResumer(PHRASES_PAR_RANGEMENT)).toBe(true);
    expect(assezPourResumer(12)).toBe(true);
  });

  it("relit l'ensemble toutes les cinq minutes, pas avant", () => {
    expect(assezPourRelire(299)).toBe(false);
    expect(assezPourRelire(SECONDES_PAR_RELECTURE)).toBe(true);
    // Une dizaine d'appels pour une heure de réunion : le quota tient.
    expect(3600 / SECONDES_PAR_RELECTURE).toBeLessThanOrEqual(12);
  });

  it("ne propose que les phrases pas encore résumées", () => {
    const texte = "Un. Deux. Trois. Quatre.";
    expect(phrasesEnAttente(texte, [])).toEqual({ de: 0, phrases: ["Un.", "Deux.", "Trois.", "Quatre."] });
    expect(phrasesEnAttente(texte, [resume({ de: 0, a: 2 })])).toEqual({ de: 2, phrases: ["Trois.", "Quatre."] });
  });

  it("un texte raccourci à la main ne bloque pas les résumés suivants", () => {
    // Le repère dépassait la fin du texte : plus rien n'était jamais résumé.
    expect(phrasesEnAttente("Un. Deux.", [resume({ de: 0, a: 40 })])).toEqual({ de: 2, phrases: [] });
  });
});

describe("le texte qui s'écrit", () => {
  it("colle les morceaux transcrits, en séparant les phrases", () => {
    expect(ajouterAuTexte("", "Bonjour à tous.")).toBe("Bonjour à tous.");
    expect(ajouterAuTexte("Bonjour à tous.", "On commence.")).toBe("Bonjour à tous. On commence.");
    // Un morceau qui finit sans point ne doit pas coller au suivant.
    expect(ajouterAuTexte("Je disais que", "donc on reprend.")).toBe("Je disais que. donc on reprend.");
    expect(ajouterAuTexte("Un texte.", "   ")).toBe("Un texte.");
  });
});

describe("ce qui est enregistré", () => {
  it("un résumé encore en cours n'est pas enregistré comme tel", () => {
    const json = ecrireResumes([resume({ id: "a" }), resume({ id: "b", rang: 2, etat: "encours" })]);
    expect(JSON.parse(json)).toHaveLength(1);
    expect(JSON.parse(json)[0].id).toBe("a");
  });

  it("un résumé relu n'est plus « en cours », un échec reste un échec", () => {
    expect(lireResumes(JSON.stringify([{ id: "a", rang: 1, de: 0, a: 10, etat: "encours" }]))[0].etat).toBe("fait");
    expect(lireResumes(JSON.stringify([{ id: "a", rang: 1, etat: "echec", erreur: "Réseau" }]))[0].etat).toBe("echec");
  });

  it("un enregistrement abîmé ne casse pas l'écran", () => {
    expect(lireResumes("")).toEqual([]);
    expect(lireResumes("{pas du json")).toEqual([]);
    expect(lireResumes('[null, 3, "x"]')).toEqual([]);
  });

  it("garde le moment où le résumé a été fait, quand il y en a un", () => {
    const lus = lireResumes(ecrireResumes([resume({ quand: 720 })]));
    expect(lus[0].quand).toBe(720);
    expect(repereDuResume(lus[0])).toBe("12 min · phrases 1–10");
    // Un texte tapé au clavier n'a pas de minute à afficher.
    expect(repereDuResume(resume({ de: 10, a: 20 }))).toBe("phrases 11–20");
  });
});

describe("relire une réunion d'avant", () => {
  it("refait un texte suivi et des résumés posés sur les phrases", () => {
    const anciennes = JSON.stringify([
      { id: "t1", rang: 1, debut: 0, fin: 300, transcription: "Bonjour. On commence.", resume: "- Ouverture.", etat: "fait" },
      { id: "t2", rang: 2, debut: 300, fin: 600, transcription: "La cantine du mardi.", resume: "- Cantine.", etat: "fait" },
    ]);
    const { texte, resumes } = convertirAnciennes(anciennes);
    expect(texte).toBe("Bonjour. On commence. La cantine du mardi.");
    expect(resumes.map((r) => [r.de, r.a])).toEqual([[0, 2], [2, 3]]);
    expect(resumes[1].quand).toBe(600);
    expect(resumes[0].texte).toBe("- Ouverture.");
  });

  it("une réunion sans tranches ne donne rien à convertir", () => {
    expect(convertirAnciennes("[]")).toEqual({ texte: "", resumes: [] });
  });

  it("les anciennes tranches se relisent toujours", () => {
    const t = lireTranches(JSON.stringify([{ id: "a", rang: 1, resume: "- Un point." }]));
    expect(t[0].debut).toBe(0);
    expect(t[0].fin).toBe(TRANCHE_S);
    expect(horodatage(t[0])).toBe("00:00 → 05:00");
  });
});

describe("un passage sans rien d'utile", () => {
  it("reconnaît un résumé vide, quel que soit le tiret du modèle", () => {
    expect(riendedit("")).toBe(true);
    expect(riendedit("—")).toBe(true);
    expect(riendedit(" - ")).toBe(true);
    expect(riendedit("- La date de l'ESS est fixée.")).toBe(false);
  });
});

describe("les consignes envoyées au modèle", () => {
  it("le résumé d'un passage interdit d'inventer et prévoit le vide", () => {
    const m = promptPassage("ESS", "Camille", "euh… donc… on disait");
    expect(m[0].content).toContain("ESS");
    expect(m[0].content).toContain("N'invente rien");
    expect(m[0].content).toMatch(/réponds exactement : —/);
    expect(m[1].content).toBe("euh… donc… on disait");
  });

  it("le compte rendu est structuré et porte l'en-tête de la réunion", () => {
    const m = promptCompteRendu({
      genre: "Conseil de cycle", titre: "Programmations", date: "2026-09-21",
      participants: "Directrice, CPC", resumes: "- Un point.",
    });
    expect(m[0].content).toContain("## Ce que je dois faire");
    expect(m[1].content).toContain("Type : Conseil de cycle");
    expect(m[1].content).toContain("Participants : Directrice, CPC");
  });

  it("retire les balises de code que les modèles ajoutent parfois", () => {
    expect(nettoyer("```\n- Un point.\n```")).toBe("- Un point.");
  });
});

describe("ce qui part chez Mistral", () => {
  it("aucun prénom d'élève ne part dans le résumé d'un passage", async () => {
    reponse = "- [P1] a besoin d'un temps calme le matin.";
    const texte = await resumerPassage("Camille Bernard a besoin d'un temps calme le matin.",
      { genre: "ESS", titre: "Camille" });
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Bernard");
    expect(texte).toBe("- Camille a besoin d'un temps calme le matin.");
  });

  it("le titre de la réunion ne trahit pas l'élève dont on parle", async () => {
    reponse = "- Point noté.";
    await resumerPassage("On parle de la cantine.", { genre: "ESS", titre: "ESS de Camille Bernard" });
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Bernard");
    expect(envoye).toContain("[P1]");
  });

  it("le compte rendu masque aussi les prénoms, et n'assemble que ce qui dit quelque chose", async () => {
    reponse = "## Points abordés\n- [P1] progresse en lecture.";
    const texte = await redigerCompteRendu(
      { genre: "ESS", titre: "Camille", date: "2026-09-21", participants: "" },
      [resume({ texte: "- Camille Bernard progresse en lecture." }),
       resume({ id: "r2", rang: 2, de: 10, a: 20, texte: "—" })],
    );
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Bernard");
    expect(envoye).not.toContain("—");
    expect(texte).toContain("Camille");
    expect(texte).not.toMatch(/\[P\d+\]/);
  });

  it("sans aucun résumé utile, on ne fait pas d'appel pour rien", async () => {
    await expect(redigerCompteRendu(
      { genre: "ESS", titre: "", date: "", participants: "" },
      [resume({ texte: "—" })],
    )).rejects.toThrow();
    expect(appels).toHaveLength(0);
  });
});

describe("ce qu'on emporte", () => {
  const reunion = {
    id: "r1", titre: "ESS de Camille", genre: "ESS", date: "2026-09-21",
    participants: "Directrice", tranchesJson: "[]", texte: "", resumesJson: "[]",
    compteRendu: "", dureeS: 3900, dateCreation: "", dateMaj: "",
  };

  it("dit la durée écoutée comme on la prononce", () => {
    expect(dureeLisible(300)).toBe("5 min");
    expect(dureeLisible(3900)).toBe("1 h 05");
  });

  it("copie le compte rendu avec son en-tête", () => {
    const t = texteACopier({ ...reunion, compteRendu: "## Décisions\n- Maintien en ULIS." });
    expect(t).toContain("ESS de Camille");
    expect(t).toContain("1 h 05");
    expect(t).toContain("Participants : Directrice");
    expect(t).toContain("- Maintien en ULIS.");
  });

  it("à défaut de compte rendu, on emporte ce qui a été dit", () => {
    const t = texteACopier({ ...reunion, texte: "Bonjour. On commence." });
    expect(t).toContain("ESS de Camille");
    expect(t).toContain("Bonjour. On commence.");
  });

  it("une réunion sans titre garde un nom dans la liste", () => {
    expect(nomDeLaReunion({ titre: "", genre: "Conseil d'école", date: "2026-09-21" })).toBe("Conseil d'école");
    expect(nomDeLaReunion({ titre: "  ", genre: "", date: "" })).toBe("Réunion");
  });
});

describe("le compte rendu vivant", () => {
  const PLAN = [
    "## Points abordés",
    "- La cantine du mardi.",
    "## Décisions",
    "- Rien à signaler",
    "## Ce que je dois faire",
    "- Prévenir la cantine.",
    "## À revoir",
    "- Rien à signaler",
  ].join("\n");

  it("se lit et se réécrit sans rien perdre", () => {
    const plan = lirePlan(PLAN);
    expect(plan["Points abordés"]).toEqual(["La cantine du mardi."]);
    expect(plan["Ce que je dois faire"]).toEqual(["Prévenir la cantine."]);
    // Réécrit, il garde les quatre rubriques, dans l'ordre.
    const reecrit = ecrirePlan(plan);
    for (const r of RUBRIQUES) expect(reecrit).toContain(`## ${r}`);
    expect(lirePlan(reecrit)["Points abordés"]).toEqual(["La cantine du mardi."]);
  });

  it("ignore ce qui n'est pas une rubrique connue", () => {
    const plan = lirePlan("## Divers\n- Hors sujet.\n## Décisions\n- Essai accepté.");
    expect(plan["Divers"]).toBeUndefined();
    expect(plan["Décisions"]).toEqual(["Essai accepté."]);
  });

  it("un compte rendu qui ne dit rien est reconnu comme vide", () => {
    expect(planVide(lirePlan(ecrirePlan({})))).toBe(true);
    expect(planVide(lirePlan(PLAN))).toBe(false);
  });

  it("une réponse tronquée n'efface pas la réunion", () => {
    // Le modèle ne renvoie que « Décisions » : le reste doit survivre.
    const fusion = fusionnerPlan(lirePlan(PLAN), lirePlan("## Décisions\n- Essai à la cantine."));
    expect(fusion["Décisions"]).toEqual(["Essai à la cantine."]);
    expect(fusion["Points abordés"]).toEqual(["La cantine du mardi."]);
    expect(fusion["Ce que je dois faire"]).toEqual(["Prévenir la cantine."]);
  });

  it("une rubrique vidée exprès peut le rester quand elle était déjà vide", () => {
    const fusion = fusionnerPlan(lirePlan(ecrirePlan({})), lirePlan("## Points abordés\n- Un point."));
    expect(fusion["Points abordés"]).toEqual(["Un point."]);
    expect(fusion["Décisions"]).toEqual([]);
  });

  it("la consigne demande de ranger le vrac de la fin, pas d'empiler", () => {
    const m = promptRangement({ genre: "ESS", titre: "Camille", document: PLAN + "\n\nOn décide l'essai." });
    expect(m[0].content).toContain("rangé");
    expect(m[0].content).toContain("fusionne");
    expect(m[0].content).toContain("déplace une ligne");
    expect(m[0].content).toContain("N'invente rien");
    expect(m[0].content).toContain("fais-la disparaître de la fin");
    expect(m[1].content).toContain("On décide l'essai.");
  });

  it("range le document, sans qu'aucun prénom ne sorte", async () => {
    reponse = "## Points abordés\n- La cantine du mardi pour [P1].\n## Décisions\n- Essai accepté.\n## Ce que je dois faire\n- Prévenir la cantine.\n## À revoir\n- Rien à signaler";
    const suite = await rangerLeDocument(
      "## Points abordés\n- La cantine de Camille Bernard.\n## Décisions\n- Rien à signaler\n## Ce que je dois faire\n- Rien à signaler\n## À revoir\n- Rien à signaler\n\nOn accepte l'essai pour Camille Bernard.",
      { genre: "ESS", titre: "ESS de Camille Bernard" },
    );
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Bernard");
    expect(suite).toContain("Camille");
    expect(suite).toContain("Essai accepté.");
    expect(suite).not.toMatch(/\[P\d+\]/);
  });

  it("un document vide n'appelle pas l'IA pour rien", async () => {
    expect(await rangerLeDocument("   ", { genre: "ESS", titre: "" })).toBe("   ");
    expect(appels).toHaveLength(0);
  });

  it("une réponse inexploitable ne remplace pas le compte rendu", async () => {
    reponse = "Bien sûr ! Voici le compte rendu mis à jour.";
    await expect(rangerLeDocument("On parle de la cantine.", { genre: "ESS", titre: "" }))
      .rejects.toThrow(/exploitable/);
  });

  it("la mise au propre refuse un compte rendu encore vide", async () => {
    await expect(mettreAuPropre(
      { genre: "ESS", titre: "", date: "", participants: "" }, ecrirePlan({}),
    )).rejects.toThrow(/vide/);
    expect(appels).toHaveLength(0);
  });

  it("la mise au propre masque les prénoms et rend le texte relu", async () => {
    reponse = "## Points abordés\n- Cantine du mardi pour [P1].";
    const propre = await mettreAuPropre(
      { genre: "ESS", titre: "ESS de Camille Bernard", date: "2026-09-22", participants: "Directrice" },
      "## Points abordés\n- Cantine de Camille Bernard.\n## Décisions\n- Rien à signaler\n## Ce que je dois faire\n- Rien à signaler\n## À revoir\n- Rien à signaler",
    );
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Bernard");
    expect(propre).toContain("Camille");
  });
});

describe("la relecture de fond", () => {
  const BAVARD = [
    "## Points abordés",
    "- La cantine du mardi est évoquée.",
    "- On reparle de la cantine, le mardi.",
    "## Décisions",
    "- Essai accepté.",
    "## Ce que je dois faire",
    "- Prévenir la cantine.",
    "## À revoir",
    "- Rien à signaler",
  ].join("\n");

  it("la consigne dit de resserrer sans rien perdre", () => {
    const m = promptRelecture({ genre: "ESS", titre: "Camille", document: BAVARD });
    expect(m[0].content).toContain("Resserre");
    expect(m[0].content).toContain("fusionne");
    expect(m[0].content).toContain("Ne supprime jamais une décision");
    expect(m[0].content).toContain("Ne rajoute rien");
    expect(m[1].content).toContain("La cantine du mardi");
  });

  it("resserre le document, sans qu'aucun prénom ne sorte", async () => {
    reponse = "## Points abordés\n- Cantine du mardi pour [P1].\n## Décisions\n- Essai accepté.\n## Ce que je dois faire\n- Prévenir la cantine.\n## À revoir\n- Rien à signaler";
    const suite = await relireLeDocument(
      BAVARD.replace("La cantine du mardi", "La cantine de Camille Bernard le mardi"),
      { genre: "ESS", titre: "ESS de Camille Bernard" },
    );
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Bernard");
    expect(suite).toContain("Camille");
    expect(suite.split("\n").filter((l) => l.includes("antine")).length).toBeLessThan(3);
  });

  it("un compte rendu encore vide ne part pas en relecture", async () => {
    const vide = "## Points abordés\n- Rien à signaler";
    expect(await relireLeDocument(vide, { genre: "ESS", titre: "" })).toBe(vide);
    expect(appels).toHaveLength(0);
  });

  it("une relecture illisible laisse le compte rendu intact", async () => {
    // Le filet de `fusionnerPlan` : rien ne revient, donc rien ne bouge. Une
    // relecture ratée ne doit jamais coûter une réunion.
    reponse = "Voici le compte rendu resserré.";
    const suite = await relireLeDocument(BAVARD, { genre: "ESS", titre: "" });
    expect(lirePlan(suite)["Points abordés"]).toHaveLength(2);
    expect(lirePlan(suite)["Décisions"]).toEqual(["Essai accepté."]);
  });
});

describe("les marqueurs qui n'ont pas de nom derrière", () => {
  it("un « [P1] » inventé par le modèle ne reste pas à l'écran", () => {
    // Vu en vrai : une réunion sans aucun élève cité, et « - [P1] : préciser
    // la question » dans le compte rendu.
    expect(sansMarqueursOrphelins("- [P1] : préciser la question sur l'IA."))
      .toBe("- préciser la question sur l'IA.");
    expect(sansMarqueursOrphelins("La question de [P1] reste ouverte."))
      .toBe("La question de une personne reste ouverte.");
  });

  it("un texte sans marqueur n'est pas touché", () => {
    const propre = "## Décisions\n- Essai à la cantine le mardi.";
    expect(sansMarqueursOrphelins(propre)).toBe(propre);
  });
});
