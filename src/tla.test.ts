import { describe, it, expect } from "vitest";
import {
  NATURES, nouveauGabarit, redimensionner,
  casesPerdues, poser, remplies, verifier, lireGabarit, echanger,
  PALETTES, PALETTE_DEFAUT, apparence, dupliquer, lirePalette, pourImpression,
  accueilDu, pagesDuClasseur, classeurPourImpression, licenceDeLImage,
} from "./tla";
import type { CaseTla, Gabarit, PaletteTla } from "./api";

// Un tableau de langage vaut par la stabilité de ses emplacements : l'élève
// atteint un mot sans le chercher parce qu'il est toujours à la même case.
// Ces tests protègent cette propriété, que rien à l'écran ne rend visible.

const mot = (m: string, id = 1): CaseTla => ({ pictoId: id, fichier: `${id}.png`, mot: m, nature: "nom" });

function garni(): Gabarit {
  // Grille 4 × 3 avec trois mots posés en (0,0), (3,0) et (1,2).
  let g = nouveauGabarit(4, 3);
  g = poser(g, 0, mot("je", 10));
  g = poser(g, 3, mot("encore", 11));
  g = poser(g, 9, mot("fini", 12));
  return g;
}

const coord = (g: Gabarit, c: number, l: number) => g.cases[l * g.colonnes + c];

describe("gabarit de tableau de langage", () => {
  it("crée une grille complète", () => {
    const g = nouveauGabarit(6, 5);
    expect(g.cases).toHaveLength(30);
    expect(g.cases.every((c) => c.pictoId === null)).toBe(true);
  });

  it("échange deux cases glissées l'une sur l'autre, sans toucher aux autres", () => {
    const avant = garni();
    const apres = echanger(avant, 0, 9);
    expect(coord(apres, 0, 0).mot).toBe("fini");
    expect(coord(apres, 1, 2).mot).toBe("je");
    expect(coord(apres, 3, 0).mot).toBe("encore");
    expect(remplies(apres)).toBe(3);
    // Le gabarit d'origine reste intact.
    expect(coord(avant, 0, 0).mot).toBe("je");
  });

  it("déplace un mot glissé sur une case vide, et ignore un glisser sans effet", () => {
    const avant = garni();
    const apres = echanger(avant, 3, 1);
    expect(coord(apres, 1, 0).mot).toBe("encore");
    expect(coord(apres, 3, 0).pictoId).toBeNull();
    expect(echanger(avant, 2, 2)).toBe(avant);
    expect(echanger(avant, 0, 99)).toBe(avant);
    expect(echanger(avant, -1, 0)).toBe(avant);
  });

  it("agrandir ne déplace aucune case posée", () => {
    // Le piège : réempiler les cases de gauche à droite décalerait tout.
    const avant = garni();
    const apres = redimensionner(avant, 6, 4);
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 3, 0).mot).toBe("encore");
    expect(coord(apres, 1, 2).mot).toBe("fini");
    expect(apres.cases).toHaveLength(24);
  });

  it("rétrécir puis réagrandir conserve ce qui est resté dans le cadre", () => {
    const avant = garni();
    const apres = redimensionner(redimensionner(avant, 3, 3), 4, 3);
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 1, 2).mot).toBe("fini");
    expect(coord(apres, 3, 0).pictoId).toBeNull(); // sorti du cadre, perdu
  });

  it("annonce les cases perdues avant de rétrécir", () => {
    const g = garni();
    expect(casesPerdues(g, 3, 3)).toBe(1);  // « encore » en colonne 3
    expect(casesPerdues(g, 4, 2)).toBe(1);  // « fini » en ligne 2
    expect(casesPerdues(g, 3, 2)).toBe(2);
    expect(casesPerdues(g, 4, 3)).toBe(0);
    expect(casesPerdues(g, 8, 6)).toBe(0);
  });

  it("poser une case ne touche pas les autres", () => {
    const g = garni();
    const apres = poser(g, 5, mot("aide", 13));
    expect(coord(apres, 0, 0).mot).toBe("je");
    expect(coord(apres, 3, 0).mot).toBe("encore");
    expect(remplies(apres)).toBe(4);
  });

  it("compte les cases remplies, pas les cases réservées", () => {
    expect(remplies(nouveauGabarit(4, 3))).toBe(0);
    expect(remplies(garni())).toBe(3);
  });
});

describe("contrôle d'un gabarit", () => {
  it("accepte un gabarit sain", () => {
    expect(verifier(garni())).toEqual([]);
  });

  it("refuse une grille qui ne correspond pas au nombre de cases", () => {
    const g = { ...garni(), colonnes: 5 };
    expect(verifier(g).join(" ")).toMatch(/5 × 3/);
  });

  it("refuse un pictogramme sans mot", () => {
    // Le mot est lu à voix haute par l'adulte : une case muette ne sert à rien.
    const g = poser(garni(), 1, { pictoId: 9, fichier: "9.png", mot: "  ", nature: "nom" });
    expect(verifier(g).join(" ")).toMatch(/sans mot/);
  });

  it("refuse un tableau sans nom", () => {
    expect(verifier({ ...garni(), nom: " " }).join(" ")).toMatch(/nom/);
  });
});

describe("import d'un gabarit", () => {
  it("relit un gabarit exporté à l'identique", () => {
    const g = garni();
    const relu = lireGabarit(JSON.stringify(g));
    expect(relu.colonnes).toBe(g.colonnes);
    expect(relu.lignes).toBe(g.lignes);
    expect(relu.cases.map((c) => c.mot)).toEqual(g.cases.map((c) => c.mot));
  });

  it("donne un identifiant neuf, pour ne pas écraser un tableau existant", () => {
    const g = garni();
    expect(lireGabarit(JSON.stringify(g)).id).not.toBe(g.id);
  });

  it("refuse un fichier incohérent plutôt que de le rafistoler", () => {
    // Un gabarit réparé de travers décalerait les cases : c'est exactement le
    // défaut que le tableau doit ne jamais avoir.
    expect(() => lireGabarit(JSON.stringify({ nom: "X", colonnes: 4, lignes: 3, cases: [] })))
      .toThrow(/4 × 3/);
  });

  it("refuse un fichier qui n'est pas un gabarit", () => {
    expect(() => lireGabarit("{}")).toThrow();
  });

  it("ramène une nature inconnue sur « nom »", () => {
    const json = JSON.stringify({
      nom: "X", colonnes: 1, lignes: 1,
      cases: [{ pictoId: 3, fichier: "3.png", mot: "chat", nature: "bidule" }],
    });
    expect(lireGabarit(json).cases[0].nature).toBe("nom");
  });
});

describe("code couleur", () => {
  it("donne une couleur distincte à chaque nature", () => {
    const vues = new Set(NATURES.map((n) => n.couleur));
    expect(vues.size).toBe(NATURES.length);
  });

});

describe("couleurs au choix", () => {
  const vives = PALETTES.find((p) => p.id === "vives")!.palette;
  const sans: PaletteTla = { ...PALETTE_DEFAUT, mode: "aucune" };
  const verbe: CaseTla = { pictoId: 4, fichier: "4.png", mot: "aller", nature: "verbe" };

  it("donne à chaque nature une couleur distincte, dans chaque jeu de couleurs", () => {
    for (const { id, palette } of PALETTES.filter((p) => p.id !== "aucune")) {
      const vues = new Set(NATURES.map((n) => palette.couleurs[n.id]));
      expect(vues.size, id).toBe(NATURES.length);
    }
    // Les questions ont la leur.
    expect(NATURES.some((n) => n.id === "question")).toBe(true);
  });

  it("pose la couleur sur le fond, sur le cadre, ou nulle part", () => {
    expect(apparence(verbe, PALETTE_DEFAUT)).toEqual({ fond: PALETTE_DEFAUT.couleurs.verbe, bord: "" });
    expect(apparence(verbe, vives)).toEqual({ fond: "#ffffff", bord: vives.couleurs.verbe });
    expect(apparence(verbe, sans)).toEqual({ fond: "#ffffff", bord: "" });
  });

  it("laisse la couleur forcée d'une case l'emporter, même sur un tableau sans couleur", () => {
    const rouge = { ...verbe, couleur: "#E5484D" };
    expect(apparence(rouge, PALETTE_DEFAUT).fond).toBe("#e5484d");
    expect(apparence(rouge, sans).fond).toBe("#e5484d");
    expect(apparence(rouge, vives)).toEqual({ fond: "#ffffff", bord: "#e5484d" });
    // Une couleur mal écrite ne compte pas.
    expect(apparence({ ...verbe, couleur: "rouge" }, PALETTE_DEFAUT).fond).toBe(PALETTE_DEFAUT.couleurs.verbe);
  });

  it("relit des couleurs gardées sans se laisser abîmer", () => {
    expect(lirePalette(null)).toEqual(PALETTE_DEFAUT);
    expect(lirePalette("du texte")).toEqual(PALETTE_DEFAUT);
    const relue = lirePalette({ mode: "bordure", couleurs: { verbe: "#00AA00", nom: "orange", inconnue: "#123456" } });
    expect(relue.mode).toBe("bordure");
    expect(relue.couleurs.verbe).toBe("#00aa00");
    expect(relue.couleurs.nom).toBe(PALETTE_DEFAUT.couleurs.nom);
    expect(Object.keys(relue.couleurs).sort()).toEqual(NATURES.map((n) => n.id).sort());
    expect(lirePalette({ mode: "fluo" }).mode).toBe("fond");
  });
});

describe("impression", () => {
  it("donne à chaque case son fond et son cadre, et va chercher le fichier des photos de Mes pictos", () => {
    let g = nouveauGabarit(3, 1);
    g = poser(g, 0, { pictoId: 12, fichier: "/arasaac/12.png", mot: "je", nature: "personne" });
    g = poser(g, 1, { pictoId: -2_100_000_005, fichier: "", mot: "les ciseaux", nature: "nom", masquee: true });
    g = poser(g, 2, { pictoId: -2_100_000_009, fichier: "", mot: "la cantine", nature: "nom" });
    const vives = PALETTES.find((p) => p.id === "vives")!.palette;
    const fichiers: Record<number, string> = { [-2_100_000_005]: "photo-ph1.jpg" };
    const imprime = pourImpression({ ...g, couleurs: vives, placeMot: "dessus" }, vives, (id) => fichiers[id], "Sclera");
    expect(imprime.cases[0]).toMatchObject({ fichier: "/arasaac/12.png", fond: "#ffffff", bord: vives.couleurs.personne });
    expect(imprime.cases[1]).toMatchObject({ fichier: "photo-ph1.jpg", masquee: true });
    // Une photo retirée de Mes pictos depuis : la case garde son mot, sans image.
    expect(imprime.cases[2].fichier).toBe("");
    expect(imprime.placeMot).toBe("dessus");
    expect(imprime.mentions).toBe("Sclera");
    // Les couleurs voyagent par les cases, pas par le gabarit.
    expect("couleurs" in imprime).toBe(false);
  });
});

describe("tableau dupliqué, tableau importé", () => {
  it("duplique un tableau pour un autre élève, sans partager ses cases", () => {
    const g = { ...garni(), couleurs: { ...PALETTE_DEFAUT, mode: "bordure" as const } };
    const copie = dupliquer(g);
    expect(copie.id).not.toBe(g.id);
    expect(copie.nom).toBe(`${g.nom} (copie)`);
    expect(copie.cases.map((c) => c.mot)).toEqual(g.cases.map((c) => c.mot));
    copie.cases[0].mot = "tu";
    copie.couleurs!.couleurs.verbe = "#000000";
    expect(g.cases[0].mot).toBe("je");
    expect(g.couleurs.couleurs.verbe).toBe(PALETTE_DEFAUT.couleurs.verbe);
  });

  it("relit les couleurs, les cases masquées et la place du mot d'un tableau importé", () => {
    const json = JSON.stringify({
      nom: "Cuisine", colonnes: 2, lignes: 1, placeMot: "aucune", corpsMot: 40,
      couleurs: { mode: "aucune", couleurs: {} },
      cases: [
        { pictoId: 3, fichier: "3.png", mot: "chat", nature: "question", couleur: "#AABBCC", masquee: true },
        { pictoId: 4, fichier: "4.png", mot: "chien", nature: "nom", couleur: "javascript:alert(1)", masquee: "oui" },
      ],
    });
    const g = lireGabarit(json);
    expect(g.cases[0]).toMatchObject({ nature: "question", couleur: "#aabbcc", masquee: true });
    expect(g.cases[1].couleur).toBeUndefined();
    expect(g.cases[1].masquee).toBeUndefined();
    expect(g.couleurs?.mode).toBe("aucune");
    expect(g.placeMot).toBe("aucune");
    expect(g.corpsMot).toBe(16);
  });
});

describe("le classeur à pages liées", () => {
  // L'accueil mène au repas et aux jeux ; le repas, à la boisson et, en retour, à l'accueil ; les jeux aussi y reviennent.
  const page = (nom: string) => ({ ...nouveauGabarit(3, 2), nom });
  const accueil = page("Accueil"), repas = page("Le repas"), jeux = page("Les jeux"), boire = page("Boire"), seul = page("Seul");
  accueil.cases[0] = { ...mot("manger", 1), lien: repas.id };
  accueil.cases[1] = { ...mot("jouer", 2), lien: jeux.id };
  accueil.cases[2] = { ...mot("perdu", 3), lien: "un-tableau-supprime" };
  repas.cases[0] = { ...mot("boire", 4), lien: boire.id };
  repas.cases[5] = { ...mot("retour", 5), lien: accueil.id };
  jeux.cases[5] = { ...mot("retour", 5), lien: accueil.id };
  boire.cases[0] = { pictoId: -2_100_000_007, fichier: "", mot: "mon verre", nature: "nom" };
  // Rangés comme l'écran les garde, dans l'ordre de leur création — mais l'accueil n'a pas à être le premier.
  const tous = [seul, accueil, repas, jeux, boire];

  it("part de l'accueil et prend chaque page une fois, dans l'ordre où les cases y mènent", () => {
    expect(pagesDuClasseur(accueil, tous).map((g) => g.nom)).toEqual(["Accueil", "Le repas", "Les jeux", "Boire"]);
    expect(pagesDuClasseur(seul, tous).map((g) => g.nom)).toEqual(["Seul"]);
  });

  it("retrouve l'accueil depuis n'importe quelle page, même quand des cases y reviennent", () => {
    expect(accueilDu(boire, tous).nom).toBe("Accueil");
    expect(accueilDu(jeux, tous).nom).toBe("Accueil");
    expect(accueilDu(repas, tous).nom).toBe("Accueil");
    expect(accueilDu(seul, tous).nom).toBe("Seul");
  });

  it("numérote les pages et porte dans chaque case liée le numéro de sa page, et la licence de son image", () => {
    const pages = pagesDuClasseur(accueil, tous);
    const imprimees = classeurPourImpression(pages, () => PALETTE_DEFAUT, () => "photo-verre.jpg", () => "");
    expect(imprimees.map((p) => [p.numero, p.total])).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
    expect(imprimees[0].cases[0].pageLiee).toBe(2);
    expect(imprimees[0].cases[1].pageLiee).toBe(3);
    // Un tableau supprimé : la case ne mène plus nulle part.
    expect(imprimees[0].cases[2].pageLiee).toBeUndefined();
    expect(imprimees[1].cases[5].pageLiee).toBe(1);
    expect(imprimees[0].cases[0].licence?.type).toBe("CC BY-NC-SA 4.0");
    expect(imprimees[3].cases[0]).toMatchObject({ fichier: "photo-verre.jpg", licence: { type: "private", auteur: "L'enseignant" } });
    expect(imprimees[0].cases[3].licence).toBeUndefined();
    expect(licenceDeLImage(-600_000_001)?.auteur).toBe("The Makaton Charity");
  });

  it("n'importe pas les liens d'un tableau venu d'un fichier : ses pages ne viennent pas avec lui", () => {
    const g = lireGabarit(JSON.stringify({ nom: "Accueil", colonnes: 1, lignes: 1, cases: [{ pictoId: 1, fichier: "1.png", mot: "manger", nature: "verbe", lien: "ailleurs" }] }));
    expect(g.cases[0].lien).toBeUndefined();
  });
});
