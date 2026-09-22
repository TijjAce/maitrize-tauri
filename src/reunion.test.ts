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
  PHRASES_PAR_RESUME, TRANCHE_S, ajouterAuTexte, assezPourResumer, convertirAnciennes,
  decouperEnPhrases, dureeLisible, ecrireResumes, horodatage, lireResumes, lireTranches,
  nettoyer, nomDeLaReunion, phrasesEnAttente, promptCompteRendu, promptPassage,
  redigerCompteRendu, repereDuResume, resumerPassage, riendedit, texteACopier, type Resume,
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

describe("le rythme des résumés", () => {
  it("attend dix phrases, pas une de moins", () => {
    expect(assezPourResumer(9)).toBe(false);
    expect(assezPourResumer(PHRASES_PAR_RESUME)).toBe(true);
    expect(assezPourResumer(12)).toBe(true);
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
    const t = texteACopier({ ...reunion, compteRendu: "## Décisions\n- Maintien en ULIS." }, []);
    expect(t).toContain("ESS de Camille");
    expect(t).toContain("1 h 05");
    expect(t).toContain("Participants : Directrice");
    expect(t).toContain("- Maintien en ULIS.");
  });

  it("à défaut de compte rendu, copie les résumés avec leur repère", () => {
    const t = texteACopier(reunion, [resume({ quand: 300 }), resume({ id: "r2", rang: 2, de: 10, a: 20, texte: "—" })]);
    expect(t).toContain("[5 min · phrases 1–10]");
    expect(t).toContain("- Un point.");
    expect(t).not.toContain("—\n");
  });

  it("une réunion sans titre garde un nom dans la liste", () => {
    expect(nomDeLaReunion({ titre: "", genre: "Conseil d'école", date: "2026-09-21" })).toBe("Conseil d'école");
    expect(nomDeLaReunion({ titre: "  ", genre: "", date: "" })).toBe("Réunion");
  });
});
