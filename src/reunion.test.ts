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
  TRANCHE_S, dureeLisible, ecrireTranches, horodatage, lireTranches, nomDeLaReunion,
  promptCompteRendu, promptTranche, redigerCompteRendu, restantAvantLaCoupe, resumerTranche,
  riendedit, texteACopier, nettoyer, type Tranche,
} from "./reunion";

const tranche = (p: Partial<Tranche> = {}): Tranche => ({
  id: "t1", rang: 1, debut: 0, fin: TRANCHE_S, transcription: "", resume: "", etat: "fait", ...p,
});

beforeEach(() => { appels.length = 0; });

describe("le fil des tranches", () => {
  it("dit où l'on en est dans la réunion", () => {
    expect(horodatage({ debut: 0, fin: 300 })).toBe("00:00 → 05:00");
    expect(horodatage({ debut: 3600, fin: 3720 })).toBe("60:00 → 62:00");
  });

  it("compte ce qui reste avant la prochaine coupe", () => {
    expect(restantAvantLaCoupe(0)).toBe(TRANCHE_S);
    expect(restantAvantLaCoupe(297)).toBe(3);
    // Une tranche qui a dépassé (transcription lente) n'affiche pas un négatif.
    expect(restantAvantLaCoupe(320)).toBe(0);
  });

  it("dit la durée écoutée comme on la prononce", () => {
    expect(dureeLisible(300)).toBe("5 min");
    expect(dureeLisible(3900)).toBe("1 h 05");
  });
});

describe("ce qui est enregistré", () => {
  it("n'enregistre pas une tranche encore en cours de traitement", () => {
    const json = ecrireTranches([
      tranche({ id: "a", resume: "- Un point." }),
      tranche({ id: "b", rang: 2, etat: "transcription" }),
    ]);
    expect(JSON.parse(json)).toHaveLength(1);
    expect(JSON.parse(json)[0].id).toBe("a");
  });

  it("une tranche relue n'est plus « en cours » : son audio n'existe plus", () => {
    // Une application fermée pendant la transcription laissait cet état.
    const lues = lireTranches(JSON.stringify([{ id: "a", rang: 1, etat: "transcription", resume: "- Oui." }]));
    expect(lues[0].etat).toBe("fait");
  });

  it("un échec reste un échec après relecture", () => {
    const lues = lireTranches(JSON.stringify([{ id: "a", rang: 1, etat: "echec", erreur: "Réseau" }]));
    expect(lues[0].etat).toBe("echec");
    expect(lues[0].erreur).toBe("Réseau");
  });

  it("un enregistrement abîmé ne casse pas l'écran", () => {
    expect(lireTranches("")).toEqual([]);
    expect(lireTranches("{pas du json")).toEqual([]);
    expect(lireTranches('{"rang":1}')).toEqual([]);
    expect(lireTranches('[null, 3, "x"]')).toEqual([]);
  });

  it("retrouve les bornes d'une tranche écrite sans elles", () => {
    const lues = lireTranches(JSON.stringify([{ id: "a", rang: 3, resume: "- Un point." }]));
    expect(lues[0].debut).toBe(2 * TRANCHE_S);
    expect(lues[0].fin).toBe(3 * TRANCHE_S);
  });
});

describe("cinq minutes sans rien d'utile", () => {
  it("reconnaît un résumé vide, quel que soit le tiret du modèle", () => {
    expect(riendedit("")).toBe(true);
    expect(riendedit("—")).toBe(true);
    expect(riendedit(" - ")).toBe(true);
    expect(riendedit("- La date de l'ESS est fixée.")).toBe(false);
  });
});

describe("les consignes envoyées au modèle", () => {
  it("le résumé d'une tranche interdit d'inventer et prévoit le silence", () => {
    const m = promptTranche("ESS", "Camille", "euh… donc… on disait");
    const systeme = m[0].content;
    expect(systeme).toContain("ESS");
    expect(systeme).toContain("N'invente rien");
    expect(systeme).toMatch(/réponds exactement : —/);
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
  it("aucun prénom d'élève ne part dans le résumé d'une tranche", async () => {
    reponse = "- [P1] a besoin d'un temps calme le matin.";
    const texte = await resumerTranche("Camille Bernard a besoin d'un temps calme le matin.",
      { genre: "ESS", titre: "Camille" });
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Bernard");
    // Et le prénom revient dans le texte gardé ici.
    expect(texte).toBe("- Camille a besoin d'un temps calme le matin.");
  });

  it("le compte rendu masque aussi les prénoms, et n'assemble que ce qui dit quelque chose", async () => {
    reponse = "## Points abordés\n- [P1] progresse en lecture.";
    const texte = await redigerCompteRendu(
      { genre: "ESS", titre: "Camille", date: "2026-09-21", participants: "" },
      [tranche({ resume: "- Camille Bernard progresse en lecture." }),
       tranche({ id: "t2", rang: 2, resume: "—" })],
    );
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Bernard");
    expect(envoye).not.toContain("—");
    // Le compte rendu gardé ici porte le vrai nom, plus aucun marqueur.
    expect(texte).toContain("Camille");
    expect(texte).not.toMatch(/\[P\d+\]/);
  });

  it("le titre de la réunion ne trahit pas l'élève dont on parle", async () => {
    // « ESS de Camille Bernard » part dans la consigne : il doit être masqué
    // avec la même table que la transcription.
    reponse = "- Point noté.";
    await resumerTranche("On parle de la cantine.", { genre: "ESS", titre: "ESS de Camille Bernard" });
    const envoye = appels[0].messages.map((m) => m.content).join("\n");
    expect(envoye).not.toContain("Camille");
    expect(envoye).not.toContain("Bernard");
    expect(envoye).toContain("[P1]");
  });

  it("sans aucun résumé utile, on ne fait pas d'appel pour rien", async () => {
    await expect(redigerCompteRendu(
      { genre: "ESS", titre: "", date: "", participants: "" },
      [tranche({ resume: "—" })],
    )).rejects.toThrow();
    expect(appels).toHaveLength(0);
  });
});

describe("ce qu'on emporte", () => {
  const reunion = {
    id: "r1", titre: "ESS de Camille", genre: "ESS", date: "2026-09-21",
    participants: "Directrice", tranchesJson: "[]", compteRendu: "", dureeS: 3900,
    dateCreation: "", dateMaj: "",
  };

  it("copie le compte rendu avec son en-tête", () => {
    const t = texteACopier({ ...reunion, compteRendu: "## Décisions\n- Maintien en ULIS." }, []);
    expect(t).toContain("ESS de Camille");
    expect(t).toContain("1 h 05");
    expect(t).toContain("Participants : Directrice");
    expect(t).toContain("- Maintien en ULIS.");
  });

  it("à défaut de compte rendu, copie les résumés horodatés", () => {
    const t = texteACopier(reunion, [tranche({ resume: "- Un point." }), tranche({ id: "t2", rang: 2, resume: "—" })]);
    expect(t).toContain("[00:00 → 05:00]");
    expect(t).toContain("- Un point.");
    expect(t).not.toContain("—\n");
  });

  it("une réunion sans titre garde un nom dans la liste", () => {
    expect(nomDeLaReunion({ titre: "", genre: "Conseil d'école", date: "2026-09-21" })).toBe("Conseil d'école");
    expect(nomDeLaReunion({ titre: "  ", genre: "", date: "" })).toBe("Réunion");
  });
});
