import { describe, it, expect } from "vitest";
import type { CategorieArasaac, ChatMessage } from "./api";
import { DEMANDE_CORPUS } from "./corpusIa";
import {
  devinerLesThemes, formesAChercher, motsDeLaBanque, motsPorteurs, preparerLeCorpus, racine, reserverLaPreparation,
  resumeDeLaPreparation, singulier, themesParLibelle, themesParPictos, themesProposables, titreExploitable, type ServicesCorpus,
} from "./corpusAuto";

const cat = (nom: string, nombre: number): CategorieArasaac => ({ nom, nombre });
const CATEGORIES = [
  cat("terrestrial animal", 120), cat("domestic animal", 80), cat("animal anatomy", 30), cat("wild animal", 60),
  cat("clothes", 50), cat("verb", 500), cat("food", 200), cat("vegetable", 40), cat("gardening", 25),
  cat("core vocabulary-object", 90), cat("fiestas del pilar", 12), cat("dinosaur", 4),
];

describe("les mots d'un projet", () => {
  it("se ramènent au singulier, sans accent", () => {
    expect(singulier("animaux")).toBe("animal");
    expect(singulier("Légumes")).toBe("légume");
    expect(singulier("noix")).toBe("noi");
    // Trois lettres : on n'y touche pas.
    expect(singulier("bus")).toBe("bus");
    expect(racine("Légumes")).toBe("legume");
    expect(racine("animaux")).toBe("animal");
  });

  it("gardent les mots porteurs, sans les mots outils ni ceux de tous les projets", () => {
    expect(motsPorteurs("Les animaux de la ferme : chaque élève de la classe adopte un animal.")).toEqual(["animaux", "ferme", "adopte"]);
    expect(motsPorteurs("")).toEqual([]);
  });

  it("se cherchent dans la banque au pluriel et au singulier", () => {
    expect(formesAChercher("Les légumes du jardin")).toEqual(["légumes", "légume", "jardin"]);
  });
});

describe("deviner les thèmes", () => {
  it("par le libellé : la tête du libellé d'abord, puis les catégories les plus fournies", () => {
    expect(themesParLibelle("Les animaux", CATEGORIES)).toEqual(["terrestrial animal", "domestic animal", "wild animal", "animal anatomy"]);
    expect(themesParLibelle("Le jardin de l'école", CATEGORIES)).toEqual(["gardening"]);
    expect(themesParLibelle("La soupe", CATEGORIES)).toEqual([]);
    expect(themesParLibelle("", CATEGORIES)).toEqual([]);
  });

  it("par les pictogrammes : les catégories comptées par la banque, si elles font un thème", () => {
    const comptes = [cat("food", 3), cat("verb", 9), cat("vegetable", 5), cat("dinosaur", 8), cat("core vocabulary-object", 2)];
    expect(themesParPictos(comptes, CATEGORIES)).toEqual(["vegetable", "food"]);
  });

  it("ne propose que des thèmes : ni grammaire, ni vocabulaire noyau, ni catégorie inconnue ou trop petite", () => {
    expect(themesProposables(CATEGORIES).map((c) => c.nom))
      .toEqual(["food", "animal anatomy", "domestic animal", "wild animal", "terrestrial animal", "gardening", "vegetable", "clothes"]);
  });
});

describe("piocher les mots", () => {
  const pictos = [
    { id: 1, mot: "vache" }, { id: 2, mot: "vache" }, { id: 3, mot: "poule" }, { id: 4, mot: "cochon d'Inde" },
    { id: 5, mot: "2 chevaux" }, { id: 6, mot: "âne" }, { id: 7, mot: "mouton (animal)" }, { id: 8, mot: "chèvre" },
  ];
  it("prend un mot par image, écarte ce qui n'est pas un mot, et range par ordre alphabétique", () => {
    const tous = motsDeLaBanque(pictos, 10, 1);
    expect(tous).toEqual(["âne", "chèvre", "cochon d'Inde", "poule", "vache"]);
  });
  it("tire le nombre demandé, toujours le même pour la même graine", () => {
    const a = motsDeLaBanque(pictos, 3, 7);
    expect(a).toHaveLength(3);
    expect(motsDeLaBanque(pictos, 3, 7)).toEqual(a);
    expect(new Set(a).size).toBe(3);
  });
});

/** Une banque et une IA de test, dont on règle les réponses. */
function services(x: Partial<ServicesCorpus> & { reponse?: string }): ServicesCorpus & { envoyes: ChatMessage[][] } {
  const envoyes: ChatMessage[][] = [];
  return {
    banqueInstallee: async () => true,
    categories: async () => CATEGORIES,
    themesDesMots: async () => [],
    selection: async () => [],
    chercher: async () => [],
    chat: async (m) => { envoyes.push(m); if (x.reponse === undefined) throw new Error("pas de clé"); return x.reponse; },
    noms: async () => ["Apolline Durand"],
    ...x,
    envoyes,
  };
}

describe("préparer le corpus", () => {
  const projet = { titre: "Les animaux", descriptif: "Apolline adopte un animal.", domaines: "Sciences", etapes: ["Choisir l'animal"] };

  it("prend les mots dans les thèmes de la banque, et fait écrire les phrases avec eux", async () => {
    const s = services({
      selection: async (themes) => { expect(themes).toEqual(["terrestrial animal", "domestic animal", "wild animal"]); return [{ id: 1, mot: "vache" }, { id: 2, mot: "poule" }, { id: 3, mot: "âne" }]; },
      reponse: "PHRASES\nLa vache mange de l'herbe.\nLa poule pond un œuf.",
    });
    const r = await preparerLeCorpus(projet, { ...DEMANDE_CORPUS, phrases: 2 }, s, 1);
    expect(r).toEqual({
      mots: ["âne", "poule", "vache"], phrases: ["La vache mange de l'herbe.", "La poule pond un œuf."],
      themes: ["terrestrial animal", "domestic animal", "wild animal"], origineMots: "banque", sansIa: false,
    });
    // Une seule demande, pour les phrases seulement, avec les mots ; le prénom masqué.
    expect(s.envoyes).toHaveLength(1);
    const [systeme, user] = s.envoyes[0];
    expect(systeme.content).toContain("seulement les phrases");
    expect(systeme.content).not.toContain("« MOTS »");
    expect(user.content).toContain("Les mots du projet : âne, poule, vache");
    expect(user.content).not.toContain("Apolline");
    expect(user.content).toContain("[P1] adopte un animal.");
  });

  it("sans thème par le libellé, suit les pictogrammes qui portent les mots du projet", async () => {
    const s = services({
      themesDesMots: async (mots) => { expect(mots).toContain("soupe"); return [cat("food", 4), cat("verb", 2)]; },
      selection: async (themes) => { expect(themes).toEqual(["food"]); return [{ id: 1, mot: "soupe" }, { id: 2, mot: "pain" }]; },
    });
    const r = await preparerLeCorpus({ ...projet, titre: "La soupe", descriptif: "" }, { ...DEMANDE_CORPUS, phrases: 0 }, s, 1);
    expect(r.mots).toEqual(["pain", "soupe"]);
    expect(r.themes).toEqual(["food"]);
    expect(r.phrases).toEqual([]);
    expect(s.envoyes).toHaveLength(0);
  });

  it("faute de thème, garde les pictogrammes qui portent les mots ; faute d'IA, pas de phrases", async () => {
    const s = services({ chercher: async (mot) => (mot === "soupe" ? [{ id: 1, mot: "soupe" }, { id: 2, mot: "soupe de légumes" }] : []) });
    const r = await preparerLeCorpus({ ...projet, titre: "La soupe", descriptif: "" }, DEMANDE_CORPUS, s, 1);
    expect(r.mots).toEqual(["soupe", "soupe de légumes"]);
    expect(r.origineMots).toBe("banque");
    expect(r.themes).toEqual([]);
    expect(r.sansIa).toBe(true);
    expect(resumeDeLaPreparation(r, DEMANDE_CORPUS)).toContain("les phrases attendent l'IA");
  });

  it("sans banque, l'IA donne les mots et les phrases", async () => {
    const s = services({ banqueInstallee: async () => false, reponse: "MOTS\nvache\npoule\nPHRASES\nLa vache dort." });
    const r = await preparerLeCorpus(projet, DEMANDE_CORPUS, s, 1);
    expect(r).toEqual({ mots: ["vache", "poule"], phrases: ["La vache dort."], themes: [], origineMots: "ia", sansIa: false });
    expect(s.envoyes[0][0].content).toContain("Réponds en deux parties");
    expect(resumeDeLaPreparation(r, DEMANDE_CORPUS)).toContain("écrits par l'IA");
  });

  it("sans banque ni IA, ne donne rien — et le dit", async () => {
    const s = services({ banqueInstallee: async () => false });
    const r = await preparerLeCorpus(projet, DEMANDE_CORPUS, s, 1);
    expect(r).toEqual({ mots: [], phrases: [], themes: [], origineMots: "aucune", sansIa: true });
    expect(resumeDeLaPreparation(r, DEMANDE_CORPUS)).toContain("l'IA n'est pas réglée");
  });

  it("respecte les thèmes choisis par l'enseignant", async () => {
    const s = services({ selection: async (themes) => (themes[0] === "clothes" ? [{ id: 1, mot: "pantalon" }] : []) });
    const r = await preparerLeCorpus(projet, { ...DEMANDE_CORPUS, phrases: 0 }, s, 1, ["clothes"]);
    expect(r.mots).toEqual(["pantalon"]);
    expect(r.themes).toEqual(["clothes"]);
  });

  it("devine les thèmes sans en prendre plus de trois", async () => {
    const s = services({});
    expect(await devinerLesThemes({ titre: "Les animaux", descriptif: "" }, s)).toEqual(["terrestrial animal", "domestic animal", "wild animal"]);
    expect(await devinerLesThemes({ titre: "Les animaux", descriptif: "" }, services({ banqueInstallee: async () => false }))).toEqual([]);
  });
});

describe("une seule préparation automatique", () => {
  it("se réserve une fois par projet et par titre, pour un corpus vide et un vrai titre", () => {
    expect(titreExploitable("Nouveau projet")).toBe(false);
    expect(titreExploitable("Le")).toBe(false);
    expect(titreExploitable(" Les animaux ")).toBe(true);
    expect(reserverLaPreparation("p1", "Les animaux", true)).toBe(true);
    expect(reserverLaPreparation("p1", "Les animaux", true)).toBe(false);
    expect(reserverLaPreparation("p1", "Les animaux de la ferme", true)).toBe(true);
    expect(reserverLaPreparation("p2", "Les animaux", false)).toBe(false);
    expect(reserverLaPreparation("p3", "Nouveau projet", true)).toBe(false);
  });
});
