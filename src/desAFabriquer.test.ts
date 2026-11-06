// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import { DE_NEUF, REGLAGES_DES, aLaRegleDuJeu, facesDuDe, htmlDes, reglagesDesSurs, titreDuDe } from "./desAFabriquer";

const animaux = ["zèbre", "lion", "girafe"].map((mot, i) => ({ mot, src: `data:image/png;base64,${"ABC"[i]}` }));

describe("les dés à fabriquer (demande de l'enseignant, 2026-11-01)", () => {
  it("ont six faces : moins de six valeurs reviennent dans l'ordre ; les nombres se font face à 7", () => {
    const couleurs = facesDuDe({ ...DE_NEUF, sorte: "couleurs", couleurs: ["rouge", "bleu", "vert"] }, []);
    expect(couleurs.map((f) => (f.sorte === "couleur" ? f.nom : ""))).toEqual(["rouge", "bleu", "vert", "rouge", "bleu", "vert"]);
    // Dans l'ordre du patron : en haut, à gauche, au centre, à droite, en bas, tout en bas.
    const points = facesDuDe({ ...DE_NEUF, sorte: "points" }, []).map((f) => (f.sorte === "nombre" ? f.n : 0));
    expect(points[2] + points[5]).toBe(7);
    expect(points[0] + points[4]).toBe(7);
    expect(points[1] + points[3]).toBe(7);
    expect(facesDuDe({ ...DE_NEUF, sorte: "images" }, animaux)).toHaveLength(6);
    expect(facesDuDe({ ...DE_NEUF, sorte: "images" }, [])).toEqual([]);
    expect(facesDuDe({ ...DE_NEUF, sorte: "mots", mots: "saute\n\ntourne\n" }, []).map((f) => (f.sorte === "mot" ? f.mot : ""))).toEqual(["saute", "tourne", "saute", "tourne", "saute", "tourne"]);
  });

  it("s'impriment en patron à sept languettes, un dé par page, puis la règle du jeu « Dessine-moi… »", () => {
    const html = htmlDes(REGLAGES_DES, [animaux, []]);
    expect(html.match(/class="de-patron"/g)).toHaveLength(2);
    expect(html.match(/class="de-languette"/g)).toHaveLength(14);
    expect(html).toContain("Dé 1 — le dé des images");
    expect(html).toContain("Dé 2 — le dé des couleurs");
    expect(html.match(/<image href="data:image\/png;base64,A"/g)).toHaveLength(2);
    expect(html).toContain('<ol class="de-regle"><li>Je lance les deux dés.</li><li>Je dessine ce que montre le premier dé, de la couleur que montre le deuxième.</li></ol>');
    expect(html).not.toMatch(/NaN|undefined|null/);
    // Un cube de 4 cm : le patron fait 3 faces et 2 languettes de large, 4 faces et une languette de haut.
    expect(html).toContain('style="width:136mm;height:168mm"');
  });

  it("s'impriment aussi en six cartes pour un dé à pochettes ; un dé sans images n'a pas de page", () => {
    const html = htmlDes({ ...REGLAGES_DES, forme: "pochettes" }, [animaux, []]);
    expect(html.match(/class="de-carte"/g)).toHaveLength(12);
    const sansImages = htmlDes(REGLAGES_DES, [[], []]);
    expect(sansImages.match(/class="de-patron"/g)).toHaveLength(1);
    expect(sansImages).not.toContain("Le jeu : dessine-moi");
    expect(htmlDes({ des: [{ ...DE_NEUF }] }, [[]])).toBe("");
  });

  it("lisent leurs réglages sans leur faire confiance, et disent leur titre", () => {
    const r = reglagesDesSurs({ des: [{ sorte: "lancer" as never, couleurs: ["gris", "rouge"], formes: [], mots: "" }, ...Array(4).fill(DE_NEUF)], taille: 9 as never });
    expect(r.des).toHaveLength(3);
    expect(r.des[0].sorte).toBe("images");
    expect(r.des[0].couleurs).toEqual(["rouge"]);
    expect(r.taille).toBe(4);
    expect(titreDuDe({ sorte: "points" }, 0, 1)).toBe("Le dé à points");
    expect(aLaRegleDuJeu({ des: [{ ...DE_NEUF, sorte: "formes" }, { ...DE_NEUF, sorte: "couleurs" }], regle: true })).toBe(true);
    expect(aLaRegleDuJeu({ des: [{ ...DE_NEUF, sorte: "couleurs" }, { ...DE_NEUF, sorte: "images" }], regle: true })).toBe(false);
  });
});
