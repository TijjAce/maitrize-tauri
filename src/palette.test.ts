import { describe, it, expect } from "vitest";
import {
  RECENTS_GARDES, ajouterRecent, classer, lireRecents, note, ouverture, type Classable,
} from "./palette";

const cmd = (id: string, label: string, sous?: string, donnee = false): Classable =>
  ({ id, label, sous, donnee });

describe("chercher sans les accents", () => {
  it("« eleves » trouve « Élèves » — c'était le défaut", () => {
    expect(note(cmd("a", "Élèves"), "eleves")).not.toBeNull();
    expect(note(cmd("b", "Synthèse GS"), "synthese")).not.toBeNull();
    expect(note(cmd("c", "Séquence : le temps qui passe"), "sequence")).not.toBeNull();
  });

  it("ce qui ne colle pas ne remonte pas", () => {
    expect(note(cmd("a", "Élèves"), "planning")).toBeNull();
  });

  it("tous les mots doivent répondre, dans n'importe quel ordre", () => {
    const c = cmd("a", "Synthèse d'un élève", "Élèves · Évaluation sommative");
    expect(note(c, "eleve synthese")).not.toBeNull();
    expect(note(c, "synthese eleve")).not.toBeNull();
    expect(note(c, "synthese jeu")).toBeNull();
  });

  it("sans recherche, tout répond à égalité", () => {
    expect(note(cmd("a", "Élèves"), "")).toBe(0);
    expect(note(cmd("b", "Planning"), "   ")).toBe(0);
  });
});

describe("le classement", () => {
  it("un début de libellé passe devant un mot au milieu", () => {
    const l = classer([
      cmd("milieu", "Ouvrir le planning de la semaine"),
      cmd("debut", "Planning"),
    ], "planning");
    expect(l[0].id).toBe("debut");
  });

  it("un début de mot passe devant une occurrence noyée dans le texte", () => {
    const l = classer([
      cmd("noye", "Réorganiser mes affaires de classe"),
      cmd("mot", "Plan de classe"),
    ], "classe");
    expect(l[0].id).toBe("mot");
  });

  it("le titre exact d'une donnée passe devant une action vaguement proche", () => {
    // Le défaut d'avant : les actions passaient toujours en premier.
    const l = classer([
      cmd("action", "Générer une séquence (IA)", "Action · assistant"),
      cmd("seq", "Les fractions", "Séquence", true),
    ], "les fractions");
    expect(l[0].id).toBe("seq");
  });

  it("le sous-titre compte moins que le libellé", () => {
    const l = classer([
      cmd("sous", "Papiers des élèves", "Élèves"),
      cmd("label", "Élèves", "Aller à"),
    ], "eleves");
    expect(l[0].id).toBe("label");
  });

  it("à note égale, ce qui a déjà servi passe devant", () => {
    const cmds = [cmd("a", "Plan de salle"), cmd("b", "Plan de travail")];
    expect(classer(cmds, "plan", ["b"])[0].id).toBe("b");
    expect(classer(cmds, "plan", [])[0].id).toBe("a");
  });

  it("une recherche vide garde l'ordre d'origine", () => {
    const cmds = [cmd("a", "Un"), cmd("b", "Deux"), cmd("c", "Trois")];
    expect(classer(cmds, "").map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("ce qui a déjà servi", () => {
  it("se relit, et un enregistrement abîmé ne casse rien", () => {
    expect(lireRecents('["a","b"]')).toEqual(["a", "b"]);
    expect(lireRecents("pas du json")).toEqual([]);
    expect(lireRecents(null)).toEqual([]);
    expect(lireRecents('[1, null, "c"]')).toEqual(["c"]);
  });

  it("remonte en tête sans se dupliquer, et ne grossit pas sans fin", () => {
    expect(ajouterRecent(["a", "b"], "b")).toEqual(["b", "a"]);
    let l: string[] = [];
    for (let i = 0; i < 20; i++) l = ajouterRecent(l, "c" + i);
    expect(l).toHaveLength(RECENTS_GARDES);
    expect(l[0]).toBe("c19");
  });
});

describe("l'ouverture, sans rien taper", () => {
  const cmds = [cmd("journal", "Cahier journal"), cmd("demain", "Préparer demain"),
    cmd("seq", "Nouvelle séquence"), cmd("autre", "Plan de salle")];

  it("montre ce qu'on fait d'habitude, puis les départs francs", () => {
    const l = ouverture(cmds, ["autre"], ["journal", "demain", "seq"]);
    expect(l.map((c) => c.id)).toEqual(["autre", "journal", "demain", "seq"]);
  });

  it("ne répète pas une commande à la fois récente et proposée", () => {
    const l = ouverture(cmds, ["journal"], ["journal", "demain"]);
    expect(l.map((c) => c.id)).toEqual(["journal", "demain"]);
  });

  it("ignore une commande disparue de l'application", () => {
    expect(ouverture(cmds, ["supprimee"], ["journal"]).map((c) => c.id)).toEqual(["journal"]);
  });

  it("sans rien connu, l'ouverture n'invente pas de liste", () => {
    expect(ouverture(cmds, [], [])).toEqual([]);
  });
});

describe("les PDF du coffre-fort", () => {
  // Un PDF s'appelle comme son fichier : des tirets, des soulignés, des
  // chiffres collés au texte. Ce qu'on tape, c'est un ou deux mots du titre.
  const coffre = [
    cmd("pdf1", "programme-cycle-2-BO-2020", "Coffre-fort · PDF", true),
    cmd("pdf2", "Guide_référentiel_maths_GS", "Coffre-fort · PDF", true),
    cmd("pdf3", "Évaluations nationales CP 2024", "Coffre-fort · PDF", true),
    cmd("nav", "Ressources", "Aller à"),
  ];

  it("trouve un titre au milieu d'un nom de fichier", () => {
    expect(classer(coffre, "cycle").map((c) => c.id)).toEqual(["pdf1"]);
    expect(classer(coffre, "bo 2020").map((c) => c.id)).toEqual(["pdf1"]);
  });

  it("se passe des accents et des soulignés", () => {
    expect(classer(coffre, "referentiel").map((c) => c.id)).toEqual(["pdf2"]);
    expect(classer(coffre, "evaluations").map((c) => c.id)).toEqual(["pdf3"]);
  });

  it("à note égale, la commande passe devant le document", () => {
    const l = classer([...coffre, cmd("pdf4", "Ressources", "Coffre-fort · PDF", true)], "ressources");
    expect(l[0].id).toBe("nav");
  });

  it("un PDF déjà ouvert remonte", () => {
    const l = classer(coffre, "2", ["pdf3"]);
    expect(l[0].id).toBe("pdf3");
  });
});
