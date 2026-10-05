import { describe, it, expect } from "vitest";
import {
  JEUX_DE_CATEGORIES, OBSERVABLES, REGLAGES_CATEGORISER, categoriesDuJeu, cequiManque, famillesDuJeu, htmlCategoriser, idsDesImages,
  lignesIntrus, motDeLaCategorie, motsDuJeu, motsPourLImage, normaliserCategories, pairesDuMistigri, reglagesDuNiveau,
  type Categorie, type ReglagesCategoriser,
} from "./categoriser";
import { hasard } from "./hasard";

const cat = (nom: string, image: number | null, mots: string[], debut: number, extra: Partial<Categorie> = {}): Categorie =>
  ({ nom, image, appel: "", intrus: false, mots: mots.map((mot, i) => ({ id: debut + i, mot })), ...extra });

const FRUITS = cat("Les fruits", 900, ["pomme", "banane", "poire", "orange", "fraise", "cerise"], 100);
const LEGUMES = cat("Les légumes", 901, ["carotte", "salade", "poireau", "chou", "radis"], 200);
const VETEMENTS = cat("Les vêtements", 902, ["pull", "robe", "bonnet"], 300, { appel: "tout ce qu'on met pour s'habiller" });
const INTRUS = cat("Les intrus", null, ["baignoire"], 400, { intrus: true });

const IMAGES = Object.fromEntries([...idsDesImages([FRUITS, LEGUMES, VETEMENTS, INTRUS])].map((id) => [id, `data:image/png;base64,I${id}`]));
const r = (m: Partial<ReglagesCategoriser>): ReglagesCategoriser => ({ ...REGLAGES_CATEGORISER, categories: [FRUITS, LEGUMES, VETEMENTS], ...m });
const compter = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const feuille = (m: Partial<ReglagesCategoriser>) => htmlCategoriser(r(m), IMAGES, hasard(7));

describe("les catégories de mots", () => {
  it("se réparent : rien de ce qu'un fichier abîmé laisse ne fait tomber l'atelier", () => {
    expect(normaliserCategories(null)).toEqual([]);
    expect(normaliserCategories("x")).toEqual([]);
    const lues = normaliserCategories([{ nom: "Les fruits", image: 3, mots: [{ id: 4, mot: "pomme" }, null, { mot: "" }, { id: "x", mot: "poire" }], intrus: "oui" }, 7]);
    expect(lues[0]).toEqual({ nom: "Les fruits", image: 3, appel: "", intrus: false, mots: [{ id: 4, mot: "pomme" }, { id: null, mot: "poire" }] });
    expect(lues[1]).toEqual({ nom: "", image: null, appel: "", intrus: false, mots: [] });
    expect(normaliserCategories(Array.from({ length: 12 }, () => ({}))).length).toBe(8);
  });

  it("trouvent l'image de leur nom : le mot qui les dit toutes", () => {
    expect(motDeLaCategorie("Les fruits")).toBe("fruits");
    expect(motDeLaCategorie("Les animaux de la ferme")).toBe("ferme");
    expect(motDeLaCategorie("La famille de chaussure")).toBe("chaussure");
    expect(motDeLaCategorie("Chez le boulanger")).toBe("boulanger");
    expect(motsPourLImage("Les animaux à poils")).toEqual(["poils", "poil"]);
    expect(motsPourLImage("Les animaux")).toEqual(["animaux", "animal"]);
    expect(motsPourLImage("")).toEqual([]);
  });

  it("suivent l'âge : nommées pour les petits, nommées par l'élève en grande section", () => {
    expect(reglagesDuNiveau("PS")).toEqual({ nommer: true, lignes: 3, parLigne: 3 });
    expect(reglagesDuNiveau("GS").nommer).toBe(false);
    expect(reglagesDuNiveau("GS").lignes).toBeGreaterThan(reglagesDuNiveau("MS").lignes);
  });
});

describe("les exemples tout prêts", () => {
  it("viennent de la fiche, avec au moins deux catégories de deux mots, et sans les mots au mauvais dessin", () => {
    expect(JEUX_DE_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(JEUX_DE_CATEGORIES.map((j) => j.id)).size).toBe(JEUX_DE_CATEGORIES.length);
    for (const j of JEUX_DE_CATEGORIES) {
      expect(j.source.length, j.id).toBeGreaterThan(10);
      expect(j.niveaux.length, j.id).toBeGreaterThan(0);
      expect(j.categories.filter((c) => !c.intrus && c.mots.length >= 2).length, j.id).toBeGreaterThanOrEqual(2);
      for (const c of j.categories) expect(c.nom.trim(), j.id).not.toBe("");
      // Dans la banque, ces mots-là ont d'abord un autre dessin : un bâton, un bateau, une poubelle, un feu tricolore, des grains bruns, un bol.
      for (const mot of ["baguette", "paquebot", "seau", "feu", "maïs", "salade"]) expect(motsDuJeu(j), `${j.id} : ${mot}`).not.toContain(mot);
    }
    // Chaque âge a les siens, et de quoi choisir.
    for (const n of ["PS", "MS", "GS"] as const) expect(JEUX_DE_CATEGORIES.filter((j) => j.niveaux.includes(n)).length, n).toBeGreaterThanOrEqual(6);
    expect(JEUX_DE_CATEGORIES.some((j) => j.id === "saisons")).toBe(true);
  });

  it("deviennent des catégories avec les images trouvées ; un mot sans image garde son mot", () => {
    const j = JEUX_DE_CATEGORIES.find((x) => x.id === "fruits-legumes")!;
    expect(motsDuJeu(j)).toContain("fruits");
    const cs = categoriesDuJeu(j, { fruits: 4653, pomme: 2462 });
    expect(cs[0].image).toBe(4653);
    expect(cs[0].mots[0]).toEqual({ id: 2462, mot: "pomme" });
    expect(cs[0].mots[1]).toEqual({ id: null, mot: "banane" });
    expect(categoriesDuJeu(JEUX_DE_CATEGORIES.find((x) => x.id === "familles-maisons")!, {}).some((c) => c.intrus)).toBe(true);
    // Un picto donné par son numéro n'est pas cherché : la salle de bain, plutôt que la porte du premier dessin.
    const maison = JEUX_DE_CATEGORIES.find((x) => x.id === "maison")!;
    expect(categoriesDuJeu(maison, {}).find((c) => c.nom === "La salle de bain")!.image).toBe(33954);
    expect(motsDuJeu(maison)).not.toContain("33954");
    // Une catégorie sans picto garde son nom seul.
    expect(categoriesDuJeu(JEUX_DE_CATEGORIES.find((x) => x.id === "se-mange")!, { manger: 2349 }).map((c) => c.image)).toEqual([2349, null]);
  });
});

describe("ce qui se fabrique", () => {
  it("l'intrus : dans chaque ligne, des images d'une catégorie et une seule d'ailleurs", () => {
    const lignes = lignesIntrus([FRUITS, LEGUMES, VETEMENTS], 6, 4, hasard(3));
    expect(lignes).toHaveLength(6);
    for (const l of lignes) {
      expect(l.mots).toHaveLength(4);
      expect(l.mots.filter((m) => l.categorie.mots.includes(m))).toHaveLength(3);
      expect(l.categorie.mots).not.toContain(l.intrus);
      expect(l.mots).toContain(l.intrus);
    }
    // Les catégories passent à tour de rôle ; celle de trois images aussi, avec des lignes de quatre.
    expect(new Set(lignes.map((l) => l.categorie.nom)).size).toBe(3);
    // Le même tirage redonne les mêmes lignes.
    expect(lignesIntrus([FRUITS, LEGUMES], 4, 3, hasard(9))).toEqual(lignesIntrus([FRUITS, LEGUMES], 4, 3, hasard(9)));
    // Une catégorie seule n'a pas d'intrus à recevoir.
    expect(lignesIntrus([FRUITS], 3, 3, hasard(1))).toEqual([]);
  });

  it("le mistigri : des paires d'une même catégorie ; le jeu des familles : trois cartes au moins, six au plus", () => {
    const paires = pairesDuMistigri([FRUITS, LEGUMES, VETEMENTS, INTRUS]);
    expect(paires).toHaveLength(3 + 2 + 1);
    for (const p of paires) expect(p.categorie.mots).toEqual(expect.arrayContaining([p.a, p.b]));
    const familles = famillesDuJeu([FRUITS, cat("Deux", null, ["a", "b"], 500), INTRUS]);
    expect(familles.map((f) => f.nom)).toEqual(["Les fruits"]);
    expect(famillesDuJeu([cat("Huit", null, ["a", "b", "c", "d", "e", "f", "g", "h"], 600)])[0].mots).toHaveLength(6);
  });

  it("dit ce qui manque quand le jeu ne peut pas se faire", () => {
    expect(cequiManque(r({ categories: [] }))).toMatch(/catégories/);
    expect(cequiManque(r({ forme: "tri", categories: [FRUITS] }))).toMatch(/deux catégories/);
    expect(cequiManque(r({ forme: "tri" }))).toBeNull();
    expect(cequiManque(r({ forme: "familles", categories: [FRUITS, cat("Deux", null, ["a", "b"], 500)] }))).toMatch(/familles/);
    expect(cequiManque(r({ forme: "mistigri", categories: [cat("A", null, ["a", "b"], 1), cat("B", null, ["c", "d"], 3)] }))).toMatch(/trois paires/);
    expect(cequiManque(r({ forme: "evaluation", categories: [FRUITS] }))).toBeNull();
  });
});

describe("les feuilles", () => {
  it("le tri : une boîte par catégorie, toutes les images à découper — les intrus compris —, et ce qui va où", () => {
    const html = htmlCategoriser(r({ forme: "tri", categories: [FRUITS, LEGUMES, VETEMENTS, INTRUS] }), IMAGES, hasard(7));
    expect(compter(html, /class="ct-boite[ "]/g)).toBe(3);
    expect(compter(html, /class="carte ct-carte/g)).toBe(6 + 5 + 3 + 1);
    expect(html).toContain("des images ne vont dans aucune boîte");
    expect(html).toMatch(/class="page corrige"[\s\S]*Les intrus[\s\S]*baignoire/);
    expect(html).toContain("Prénom :");
    expect(html).toContain("I900");
    // En maisons, chacune a son toit.
    expect(compter(feuille({ forme: "tri", maisons: true }), /class="ct-toit"/g)).toBe(3);
  });

  it("en grande section, l'élève nomme les catégories : les boîtes n'ont ni nom ni image", () => {
    const html = feuille({ forme: "tri", nommer: false });
    expect(compter(html, /Son nom : /g)).toBe(3);
    expect(html).not.toContain("I900\"");
    expect(html).toContain("donne un nom à chaque boîte");
  });

  it("l'intrus : les lignes demandées, la consigne de l'âge, le corrigé", () => {
    const ps = feuille({ forme: "intrus", niveau: "PS", lignes: 3, parLigne: 3 });
    expect(compter(ps, /class="ct-ligne"/g)).toBe(3);
    expect(compter(ps, /class="ct-case"/g)).toBe(9);
    expect(ps).toContain("entoure-la.");
    expect(feuille({ forme: "intrus", niveau: "GS" })).toContain("explique pourquoi");
    expect(ps).toMatch(/class="page corrige"/);
  });

  it("le loto aveugle : une plaque par catégorie, une case par image, les cartes à piocher", () => {
    const html = feuille({ forme: "loto" });
    expect(compter(html, /class="ct-plaque"/g)).toBe(3);
    expect(compter(html, /class="ct-case-vide"/g)).toBe(6 + 5 + 3);
    expect(compter(html, /class="carte ct-carte/g)).toBe(14);
    expect(html).toContain("Règle du jeu");
    // Six cases au plus par plaque : la première pleine a gagné, les cartes en trop restent dans la pioche.
    const grande = htmlCategoriser(r({ forme: "loto", categories: [cat("Huit", null, ["a", "b", "c", "d", "e", "f", "g", "h"], 600), LEGUMES] }), IMAGES, hasard(1));
    expect(compter(grande, /class="ct-case-vide"/g)).toBe(6 + 5);
  });

  it("J'appelle… : une carte d'appel par catégorie, avec ce que dit le meneur", () => {
    const html = feuille({ forme: "appelle" });
    expect(compter(html, /class="ct-appel"/g)).toBe(3);
    expect(html).toContain("tout ce qu&#39;on met pour s&#39;habiller");
    expect(html).toContain("Les fruits");
  });

  it("le jeu des familles et le mistigri : leurs cartes, et la règle", () => {
    const familles = feuille({ forme: "familles" });
    expect(compter(familles, /class="ct-famille"/g)).toBe(6 + 5 + 3);
    expect(compter(familles, /class="ici"/g)).toBe(14);
    const mistigri = feuille({ forme: "mistigri" });
    expect(compter(mistigri, /class="carte ct-carte/g)).toBe((3 + 2 + 1) * 2 + 1);
    expect(mistigri).toContain("Mistigri");
    expect(mistigri).toMatch(/class="page corrige"/);
  });

  it("l'affichage : une page par catégorie, le mot sous chaque image ; la grille : les observables de l'âge", () => {
    const affiche = feuille({ forme: "affiche" });
    expect(compter(affiche, /class="page ct-affiche"/g)).toBe(3);
    expect(compter(affiche, /class="ct-affiche-mot"/g)).toBe(14);
    const grille = feuille({ forme: "evaluation", niveau: "GS" });
    for (const o of OBSERVABLES.GS) expect(grille).toContain(o);
    expect(compter(grille, /<tr><td><\/td>/g)).toBe(12);
    // La grille ne porte pas d'images : pas de mention d'ARASAAC.
    expect(grille).not.toContain("ARASAAC");
    expect(feuille({ forme: "cartes" })).toContain("ARASAAC");
  });
});
