import { describe, it, expect } from "vitest";
import { nouveauJeu, type Jeu } from "./api";
import { infosDuJeu, jeuxCites, motsCompares, nomSousLeCurseur, questionRegle, reglesImprimees, texteSimple } from "./jeuxCites";

const jeu = (id: string, titre: string, regles = "", p: Partial<Jeu> = {}): Jeu => ({ ...nouveauJeu(), id, titre, regles, ...p });
const titres = (jeux: Jeu[]) => jeux.map((j) => j.titre);

describe("jeux cités dans un texte", () => {
  const ludotheque = [
    jeu("hg", "Halli Galli"), jeu("sk", "Skyjo"), jeu("me", "Memory (animaux)"), jeu("do", "Les dominos"),
    jeu("uno", "Uno"), jeu("unoj", "Uno Junior"), jeu("oie", "Jeu de l'oie"), jeu("js", "Jungle Speed"),
    jeu("qw", "Qwirkle"), jeu("go", "Go"),
  ];

  it("retrouve les jeux du prévu, écrits comme on les prononce, dans l'ordre du texte", () => {
    expect(titres(jeuxCites("-hali gali\n-skyjo\n-mémory", ludotheque))).toEqual(["Halli Galli", "Skyjo", "Memory (animaux)"]);
  });

  it("accepte les mots collés ou séparés, le pluriel et l'article", () => {
    expect(titres(jeuxCites("halligalli puis junglespeed", ludotheque))).toEqual(["Halli Galli", "Jungle Speed"]);
    expect(titres(jeuxCites("Partie de domino avec Adam", ludotheque))).toEqual(["Les dominos"]);
    expect(titres(jeuxCites("le jeu de l’oie des couleurs", ludotheque))).toEqual(["Jeu de l'oie"]);
  });

  it("supporte une faute de frappe dans un nom long, pas dans un nom court", () => {
    expect(titres(jeuxCites("Quirkle en autonomie", ludotheque))).toEqual(["Qwirkle"]);
    expect(jeuxCites("skyja", ludotheque)).toEqual([]);
  });

  it("préfère le nom le plus long quand deux se recouvrent", () => {
    expect(titres(jeuxCites("uno junior à 3", ludotheque))).toEqual(["Uno Junior"]);
    expect(titres(jeuxCites("uno, puis uno junior", ludotheque))).toEqual(["Uno", "Uno Junior"]);
  });

  it("ne cite chaque jeu qu'une fois et ne voit pas de jeu dans les mots ordinaires", () => {
    expect(titres(jeuxCites("skyjo ; bilan du skyjo", ludotheque))).toEqual(["Skyjo"]);
    expect(jeuxCites("On y va, go ! Évaluation diagnostique, calcul mental", ludotheque)).toEqual([]);
    expect(jeuxCites("", ludotheque)).toEqual([]);
    expect(jeuxCites("skyjo", [])).toEqual([]);
  });

  it("compare sans accents, majuscules ni lettres doublées", () => {
    expect(motsCompares("Mémory HALLI-galli Œuf")).toEqual(["memori", "hali", "gali", "oeuf"]);
  });
});

describe("le jeu à ajouter à la ludothèque", () => {
  const prevu = "-hali gali\n- skyjo.\n2) Mémory des émotions\nÉvaluation diagnostique de lecture et d'écriture, fiche n°3";

  it("prend la ligne du curseur, sans puce ni ponctuation", () => {
    expect(nomSousLeCurseur(prevu, 3, 3)).toBe("Hali gali");
    expect(nomSousLeCurseur(prevu, 0, 0)).toBe("Hali gali");
    expect(nomSousLeCurseur(prevu, prevu.indexOf("skyjo") + 2, prevu.indexOf("skyjo") + 2)).toBe("Skyjo");
    expect(nomSousLeCurseur(prevu, prevu.indexOf("Mémory"), prevu.indexOf("Mémory"))).toBe("Mémory des émotions");
  });

  it("préfère le passage sélectionné", () => {
    const debut = prevu.indexOf("Mémory");
    expect(nomSousLeCurseur(prevu, debut, debut + "Mémory".length)).toBe("Mémory");
  });

  it("ne propose rien pour une ligne trop longue pour un nom de jeu", () => {
    expect(nomSousLeCurseur(prevu, prevu.length - 2, prevu.length - 2)).toBe("");
    expect(nomSousLeCurseur("", 0, 0)).toBe("");
  });
});

describe("règles à l'impression", () => {
  it("montre la règle des jeux qui en ont une, échappée, avec leurs infos", () => {
    const html = reglesImprimees([
      jeu("sk", "Skyjo", "Retourner 2 cartes.\nLe plus petit total gagne <vraiment>.", { nbJoueursMin: 2, nbJoueursMax: 8, duree: 30, rangement: "Bac 3" }),
      jeu("hg", "Halli Galli", "  "),
    ]);
    expect(html).toContain("🎲 Règle — Skyjo");
    expect(html).toContain("2 à 8 joueurs · 30 min · 📦 Bac 3");
    expect(html).toContain("Le plus petit total gagne &lt;vraiment&gt;.");
    expect(html).not.toContain("Halli Galli");
    expect(reglesImprimees([jeu("hg", "Halli Galli")])).toBe("");
  });

  it("écrit l'effectif au singulier quand il le faut", () => {
    expect(infosDuJeu(jeu("so", "Solitaire", "", { nbJoueursMin: 1, nbJoueursMax: 1, duree: 0 }))).toBe("1 joueur");
  });
});

describe("règle cherchée en ligne", () => {
  it("ne demande que le nom du jeu", () => {
    const q = questionRegle("  Skyjo ");
    expect(q).toContain("« Skyjo »");
    expect(q).not.toMatch(/élève|prénom/i);
  });

  it("rend une réponse mise en forme en texte simple", () => {
    expect(texteSimple("### But du jeu\n**Être le plus rapide** à sonner [1].\n\n\n* Chacun retourne une carte\n• On sonne à 5 fruits【3†source】\nVoir [la règle](https://exemple.fr)"))
      .toBe("But du jeu\nÊtre le plus rapide à sonner.\n\n- Chacun retourne une carte\n- On sonne à 5 fruits\nVoir la règle");
  });
});
