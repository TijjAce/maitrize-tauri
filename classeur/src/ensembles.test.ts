// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { classeurComplet } from "./classeurComplet";
import { CATEGORIES_MAX, categoriesApres, categoriesDeLaCase, suitesDeLaFiche } from "./ensembles";
import { changerImageDePage, lireClasseur, ordreDesPages, pictoDeLaPage, supprimerPage, type Case } from "./modele";
import { depuisObz, versObz } from "./obz";

describe("les catégories proposées en haut (« proposer seulement ce qui est en bas »)", () => {
  const c = classeurComplet("", "2026-11-05T08:00:00.000Z");
  const page = (nom: string) => ordreDesPages(c).find((p) => p.nom === nom)!;
  const caseDe = (nomPage: string, mot: string): Case => page(nomPage).cases.find((k) => k?.mot === mot)!;
  const vu = (e: ReturnType<typeof categoriesApres>) => e.map((x) => `${x.nom} (${x.image ?? "sans picto"})`);

  it("après « je veux », sur sa page : manger, jouer, boire, aller, faire — les cases de la grille qui y mènent", () => {
    const e = categoriesApres(c, caseDe("Je veux dire…", "je veux"), page("Je veux").id);
    expect(vu(e)).toEqual([
      "manger (arasaac-2349)", "jouer (arasaac-2439)", "boire (arasaac-2276)", "aller (arasaac-2432)", "faire (arasaac-11749)",
    ]);
    // Chacune est une case de la page ouverte : son mot, son picto, la page qu'elle ouvre.
    for (const x of e) {
      const k = page("Je veux").cases.find((y) => y?.id === x.caseId)!;
      expect([k.mot, k.image, k.lien]).toEqual([x.nom, x.image, x.page]);
    }
  });

  it("rien quand la grille n'a pas de case qui y mène : « puzzle » sur Jouer, « bonjour » sur la page 1", () => {
    expect(categoriesApres(c, caseDe("Jouer", "puzzle"), page("Jouer").id)).toEqual([]);
    expect(categoriesApres(c, caseDe("L'essentiel", "bonjour"), c.accueil)).toEqual([]);
  });

  it("toujours une case de la page ouverte, visible, une catégorie par section, la page ouverte jamais ; cinq au plus", () => {
    let proposent = 0;
    for (const p of c.pages) for (const k of p.cases) {
      const e = categoriesApres(c, k, p.id);
      if (e.length) proposent++;
      expect(e.length).toBeLessThanOrEqual(CATEGORIES_MAX);
      expect(new Set(e.map((x) => x.section)).size).toBe(e.length);
      for (const x of e) {
        const en = p.cases.find((y) => y?.id === x.caseId);
        expect(en && !en.masquee && en.lien === x.page, `${p.nom} · ${k?.mot} → ${x.nom}`).toBe(true);
        expect(x.page).not.toBe(p.id);
      }
    }
    expect(proposent).toBeGreaterThan(40);
  });

  it("une case cachée par l'enseignant n'est pas proposée", () => {
    const jeVeux = page("Je veux");
    const cache = { ...c, pages: c.pages.map((p) => (p.id === jeVeux.id ? { ...p, cases: p.cases.map((k) => (k?.mot === "manger" ? { ...k, masquee: true } : k)) } : p)) };
    expect(categoriesApres(cache, caseDe("Je veux dire…", "je veux"), jeVeux.id).map((x) => x.nom)).not.toContain("manger");
  });

  it("une case qui finit la phrase ne propose rien", () => {
    expect(categoriesApres(c, caseDe("J'ai mal", "tête"), page("J'ai mal").id)).toEqual([]);
    expect(categoriesApres(c, null, c.accueil)).toEqual([]);
  });

  it("une catégorie retirée disparaît des propositions", () => {
    const sansManger = supprimerPage(c, page("Manger").id);
    const jeVeux = sansManger.pages.flatMap((p) => p.cases).find((k) => k?.id === caseDe("Je veux dire…", "je veux").id)!;
    expect(categoriesApres(sansManger, jeVeux, page("Je veux").id).map((x) => x.nom)).not.toContain("manger");
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
    expect(pictoDeLaPage(c, page("Les gens").id)).toBe("arasaac-34557");
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
