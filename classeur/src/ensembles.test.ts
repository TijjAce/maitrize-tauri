import { describe, expect, it } from "vitest";
import { classeurComplet } from "./classeurComplet";
import { CATEGORIES_MAX, categoriesApres, categoriesDeLaCase, suitesDeLaFiche } from "./ensembles";
import { changerImageDePage, lireClasseur, ordreDesPages, pictoDeLaPage, supprimerPage, type Case } from "./modele";
import { depuisObz, versObz } from "./obz";

describe("les catégories proposées en haut (« que des propositions de catégories avec des pictos représentatifs »)", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");
  const page = (nom: string) => ordreDesPages(c).find((p) => p.nom === nom)!;
  const caseDe = (nomPage: string, mot: string): Case => page(nomPage).cases.find((k) => k?.mot === mot)!;
  const vu = (e: ReturnType<typeof categoriesApres>) => e.map((x) => `${x.nom} (${x.image ?? "sans picto"})`);

  it("après « je veux » : Manger, Jouer, Boire, Aller — chacune avec le picto de sa case des catégories", () => {
    const e = categoriesApres(c, caseDe("Je veux dire…", "je veux"), page("Je veux").id);
    expect(e.map((x) => x.nom).slice(0, 4)).toEqual(["Manger", "Jouer", "Boire", "Aller"]);
    expect(vu(e).slice(0, 4)).toEqual(["Manger (arasaac-2349)", "Jouer (arasaac-2439)", "Boire (arasaac-2276)", "Aller (arasaac-2432)"]);
    // La bande ne montre plus les pictos d'une catégorie : seulement la catégorie.
    expect(Object.keys(e[0]).sort()).toEqual(["image", "nom", "page", "poids", "section"]);
  });

  it("« Les gens » a son picto, celui de la page des catégories", () => {
    expect(vu(categoriesApres(c, caseDe("L'essentiel", "bonjour"), c.accueil))).toEqual(["Les gens (arasaac-34557)"]);
    expect(pictoDeLaPage(c, page("Les gens").id)).toBe("arasaac-34557");
  });

  it("toute catégorie qu'une case peut proposer a un picto", () => {
    const proposees = new Set(c.pages.flatMap((p) => p.cases.flatMap((k) => (k?.suites ?? []).map((s) => s.page))));
    expect(proposees.size).toBeGreaterThan(10);
    for (const id of proposees) expect(pictoDeLaPage(c, id), c.pages.find((p) => p.id === id)?.nom).toMatch(/^arasaac-\d+$/);
  });

  it("une page qui n'est pas dans l'index prend le picto de la case qui y mène ; la deuxième page d'une section, celui de la première", () => {
    const jeVeux = c.pages.flatMap((p) => p.cases).find((k) => k?.mot === "je veux" && k.lien === page("Je veux").id)!;
    expect(pictoDeLaPage(c, page("Je veux").id)).toBe(jeVeux.image);
    const classe2 = ordreDesPages(c).filter((p) => p.nom === "En classe")[1];
    expect(pictoDeLaPage(c, classe2.id)).toBe(pictoDeLaPage(c, page("En classe").id));
  });

  it("une catégorie par section, la page ouverte jamais ; cinq au plus", () => {
    for (const p of c.pages) for (const k of p.cases) {
      const e = categoriesApres(c, k, p.id);
      expect(e.length).toBeLessThanOrEqual(CATEGORIES_MAX);
      expect(new Set(e.map((x) => x.section)).size).toBe(e.length);
      expect(e.some((x) => x.page === p.id)).toBe(false);
    }
    const e = categoriesApres(c, caseDe("Je veux dire…", "je veux"), page("Manger").id);
    expect(e.map((x) => x.nom)).not.toContain("Manger");
  });

  it("une case qui finit la phrase ne propose rien", () => {
    expect(categoriesApres(c, caseDe("J'ai mal", "tête"), page("J'ai mal").id)).toEqual([]);
    expect(categoriesApres(c, null, c.accueil)).toEqual([]);
  });

  it("une catégorie retirée disparaît des propositions", () => {
    const sansManger = supprimerPage(c, page("Manger").id);
    const jeVeux = sansManger.pages.flatMap((p) => p.cases).find((k) => k?.id === caseDe("Je veux dire…", "je veux").id)!;
    expect(categoriesApres(sansManger, jeVeux, page("Je veux").id).map((x) => x.nom)).not.toContain("Manger");
  });
});

describe("le picto d'une catégorie (« chaque catégorie doit pouvoir avoir un picto »)", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");
  const gens = ordreDesPages(c).find((p) => p.nom === "Les gens")!;

  it("se choisit pour une page, se garde, et se retire pour reprendre celui de la case qui y mène", () => {
    const choisi = changerImageDePage(c, gens.id, "photo-ma-classe");
    expect(pictoDeLaPage(choisi, gens.id)).toBe("photo-ma-classe");
    const relu = lireClasseur(JSON.stringify(choisi))!;
    expect(relu.pages.find((p) => p.id === gens.id)!.image).toBe("photo-ma-classe");
    expect(pictoDeLaPage(changerImageDePage(choisi, gens.id, undefined), gens.id)).toBe("arasaac-34557");
  });

  it("voyage dans l'archive OBZ", () => {
    const choisi = changerImageDePage(c, gens.id, "photo-ma-classe");
    const { textes, images } = versObz(choisi, { "photo-ma-classe": "data:image/jpeg;base64,AAAA" });
    const { classeur, images: lues } = depuisObz({ textes, images }, "Relu");
    const page = classeur.pages.find((p) => p.nom === "Les gens")!;
    expect(page.image).toBeTruthy();
    expect(lues[page.image!]).toBe("AAAA");
  });
});

describe("les catégories choisies par l'enseignant, dans la fiche d'une case", () => {
  it("le rang fait le poids, la première d'abord ; une catégorie en double ne compte qu'une fois ; cinq au plus", () => {
    const suites = suitesDeLaFiche(["a", "b", "a", "c", "d", "e", "f"]);
    expect(suites.map((s) => s.page)).toEqual(["a", "b", "c", "d", "e"]);
    expect(suites[0].poids).toBeGreaterThan(suites[1].poids);
    expect(suites.every((s) => !("cases" in s))).toBe(true);
    expect(suitesDeLaFiche([])).toEqual([]);
  });

  it("relit les catégories d'une case dans l'ordre de leur poids", () => {
    expect(categoriesDeLaCase([{ page: "b", poids: 0.2 }, { page: "a", poids: 0.8 }])).toEqual(["a", "b"]);
    expect(categoriesDeLaCase(undefined)).toEqual([]);
  });
});
