// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { ajouterPage, ajouterPageSuivante, fairePageDesCategories, nouveauClasseur, nouvellePage, numeroDePage, ordreDesPages, poserCase } from "./modele";
import { depuisObz, enHex, enRgb, versObz } from "./obz";

const PNG = "iVBORw0KGgo=";

/** Une archive telle que Maitrize l'écrit (tla_obz.rs). */
const DE_MAITRIZE = {
  textes: {
    "manifest.json": JSON.stringify({ format: "open-board-0.1", root: "boards/page1.obf", paths: { boards: { page1: "boards/page1.obf", page2: "boards/page2.obf" }, images: { image1: "images/image1.png" } } }),
    "boards/page1.obf": JSON.stringify({
      format: "open-board-0.1", id: "page1", locale: "fr", name: "Accueil",
      buttons: [
        { id: "1-1", label: "manger", background_color: "rgb(253, 230, 201)", border_color: "rgb(140, 140, 150)", image_id: "image1", load_board: { id: "page2", path: "boards/page2.obf" } },
        { id: "1-3", label: "encore", background_color: "rgb(255, 255, 255)", border_color: "rgb(140, 140, 150)", hidden: true },
      ],
      grid: { rows: 2, columns: 2, order: [["1-1", null], ["1-3", null]] },
      images: [{ id: "image1", path: "images/image1.png", content_type: "image/png", license: { type: "CC BY-NC-SA" } }],
    }),
    "boards/page2.obf": JSON.stringify({
      format: "open-board-0.1", id: "page2", name: "Manger",
      buttons: [{ id: "2-1", label: "fini", vocalization: "J'ai fini", load_board: { id: "page1", path: "boards/page1.obf" } }],
      grid: { rows: 1, columns: 2, order: [["2-1", null]] }, images: [],
    }),
  },
  images: { "images/image1.png": PNG },
};

describe("le format ouvert des tableaux, comme Maitrize l'écrit", () => {
  it("lit les couleurs du format, et les écrit", () => {
    expect(enHex("rgb(253, 230, 201)")).toBe("#fde6c9");
    expect(enHex("rgba(0,0,0,0.5)")).toBe("#000000");
    expect(enHex("#ABCDEF")).toBe("#abcdef");
    expect(enHex("bleu")).toBeUndefined();
    expect(enRgb("#fde6c9", "x")).toBe("rgb(253, 230, 201)");
    expect(enRgb(undefined, "rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
  });

  it("reprend un classeur de Maitrize : ses pages, ses liens, ses couleurs, ses cases cachées, ses images", () => {
    const { classeur, images } = depuisObz(DE_MAITRIZE, "Le classeur de la classe");
    expect(classeur.nom).toBe("Le classeur de la classe");
    expect(classeur.pages.map((p) => p.nom)).toEqual(["Accueil", "Manger"]);
    const [accueil, manger] = classeur.pages;
    expect(classeur.accueil).toBe(accueil.id);
    expect(accueil.lignes).toBe(2);
    expect(accueil.cases.map((k) => k?.mot ?? null)).toEqual(["manger", null, "encore", null]);
    expect(accueil.cases[0]).toMatchObject({ lien: manger.id, fond: "#fde6c9" });
    expect(accueil.cases[0]?.bord).toBeUndefined();
    expect(accueil.cases[2]?.masquee).toBe(true);
    expect(manger.cases[0]).toMatchObject({ mot: "fini", dire: "J'ai fini", lien: accueil.id });
    const imageId = accueil.cases[0]!.image!;
    expect(imageId).toMatch(/^image-/);
    expect(images[imageId]).toBe(PNG);
    expect(() => depuisObz({ textes: {}, images: {} }, "x")).toThrow(/aucun tableau/);
  });

  it("écrit l'accueil en premier, et se relit à l'identique : mots, phrases, liens, couleurs, cases cachées, images", () => {
    let c = nouveauClasseur("Classeur", 2, 3);
    const veux = nouvellePage("Je veux", 1, 2);
    c = ajouterPage(c, veux);
    const accueil = c.accueil;
    c = poserCase(c, accueil, 0, { id: "a", mot: "je veux", lien: veux.id, fond: "#d9f0d4", bord: "#2e9b3e", image: "arasaac-1" });
    c = poserCase(c, accueil, 4, { id: "b", mot: "aide", dire: "J'ai besoin d'aide", masquee: true });
    c = poserCase(c, veux.id, 1, { id: "c", mot: "boire", image: "arasaac-1" });
    const f = versObz({ ...c, pages: [...c.pages].reverse() }, { "arasaac-1": `data:image/png;base64,${PNG}` });
    const manifeste = JSON.parse(f.textes["manifest.json"]);
    expect(manifeste.root).toBe("boards/page1.obf");
    expect(JSON.parse(f.textes["boards/page1.obf"]).name).toBe("Accueil");
    // La même image, posée deux fois, n'entre qu'une fois dans l'archive ; elle garde sa licence.
    expect(Object.keys(f.images)).toEqual(["images/image1.png"]);
    expect(JSON.parse(f.textes["boards/page1.obf"]).images[0].license.type).toBe("CC BY-NC-SA");
    const { classeur: relu } = depuisObz(f, "Relu");
    const [a, v] = relu.pages;
    expect(a.cases[0]).toMatchObject({ mot: "je veux", lien: v.id, fond: "#d9f0d4", bord: "#2e9b3e" });
    expect(a.cases[4]).toMatchObject({ mot: "aide", dire: "J'ai besoin d'aide", masquee: true });
    expect(v.cases.map((k) => k?.mot ?? null)).toEqual([null, "boire"]);
    // Le picto d'ARASAAC garde son numéro, à l'aller (le champ « symbol ») comme au retour.
    expect(JSON.parse(f.textes["boards/page1.obf"]).images[0].symbol).toEqual({ set: "arasaac", filename: "1.png" });
    expect(a.cases[0]?.image).toBe("arasaac-1");
    expect(v.cases[1]?.image).toBe("arasaac-1");
  });

  it("garde les sections et la page des catégories, que les autres applications laissent de côté", () => {
    let c = nouveauClasseur("Livre", 1, 2);
    const manger = nouvellePage("Manger", 1, 2);
    const cat = nouvellePage("Catégories", 1, 2);
    c = ajouterPageSuivante(ajouterPage(c, manger), manger.id, nouvellePage("Manger (suite)", 1, 2));
    c = fairePageDesCategories(ajouterPage(c, cat), cat.id);
    c = poserCase(c, c.accueil, 0, { id: "a", mot: "manger", lien: manger.id });
    const f = versObz(c, {});
    expect(JSON.parse(f.textes["boards/page3.obf"]).ext_maitrize_suite).toBe(true);
    expect(JSON.parse(f.textes["boards/page2.obf"]).ext_maitrize_suite).toBeUndefined();
    const { classeur: retour } = depuisObz(f, "Retour");
    expect(ordreDesPages(retour).map((p) => `${numeroDePage(retour, p.id)} ${p.nom}`)).toEqual(["1 Accueil", "2a Manger", "2b Manger (suite)", "3 Catégories"]);
    expect(retour.pages.find((p) => p.id === retour.categories)?.nom).toBe("Catégories");
  });
});

