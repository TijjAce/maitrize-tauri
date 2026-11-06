// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import {
  ATELIERS_DES_CARTES, LISTES_DE_LANGUE, MODELES_CARTES, MOTS_REPERES, SORTES_CARTES, htmlCartes, lignesDe, lireCartes, motAvecGrapheme,
  motDeLaFamille, motsADessinerCartes, pagesDuMur, reglagesCartesSurs, sorteDeLAtelier, teinteDe, type SorteCartes,
} from "./affichesACartes";

/** Une image pour chaque mot à dessiner : de quoi compter les pages comme si la banque avait tout. */
const imagesDe = (sorte: SorteCartes, lignes?: string) =>
  Object.fromEntries(motsADessinerCartes(sorte, lignes ? { lignes } : {}).map((m) => [m, "data:image/png;base64,AA=="]));

const pages = (sorte: SorteCartes, lignes?: string, colonnes?: number) => {
  const r = reglagesCartesSurs(sorte, { ...(lignes ? { lignes } : {}), ...(colonnes ? { colonnes } : {}) });
  return pagesDuMur(r, MODELES_CARTES[sorte], lireCartes(sorte, r.lignes), imagesDe(sorte, lignes)).length;
};

describe("les affiches à cartes (« fais-les tous », 4 novembre 2026)", () => {
  it("chaque sorte a son atelier, et chaque atelier retrouve sa sorte", () => {
    for (const s of SORTES_CARTES) expect(sorteDeLAtelier(ATELIERS_DES_CARTES[s])).toBe(s);
    expect(sorteDeLAtelier("carteMentale")).toBeUndefined();
    expect(new Set(Object.values(ATELIERS_DES_CARTES)).size).toBe(SORTES_CARTES.length);
  });

  it("chaque affiche de départ s'imprime, sans trou ni « undefined », avec ses dessins et leur mention", () => {
    for (const s of SORTES_CARTES) {
      const html = htmlCartes(s, {}, imagesDe(s));
      expect(html, s).not.toMatch(/undefined|NaN|\[object/);
      expect(html, s).toMatch(/class="page ak-(page|planche)"/);
      if (motsADessinerCartes(s, {}).length) expect(html, s).toContain("ARASAAC");
      // Sans la banque : ni image ni mention.
      const sans = htmlCartes(s, {});
      expect(sans, s).not.toContain("<img");
      expect(sans, s).not.toContain("ARASAAC");
    }
  });

  it("chaque affiche de départ tient où on l'attend : une page, une par couleur, deux pour les mots invariables", () => {
    const attendu: Partial<Record<SorteCartes, number>> = { couleurs: 4, invariables: 2 };
    for (const s of SORTES_CARTES) expect(pages(s), s).toBe(attendu[s] ?? 1);
    // Chaque liste toute prête aussi : une page.
    for (const s of SORTES_CARTES) {
      for (const l of MODELES_CARTES[s].listes ?? []) expect(pages(s, l.lignes, l.colonnes), `${s} › ${l.id}`).toBe(l.id === "tout" ? 4 : 1);
    }
  });

  it("chaque mot-repère porte son graphème, qui s'y colore", () => {
    for (const m of MOTS_REPERES) expect(motAvecGrapheme(m.graphemes, m.mot), `${m.graphemes} › ${m.mot}`).toContain(`class="ak-g"`);
    expect(motAvecGrapheme("au, eau", "bateau")).toBe(`bat<span class="ak-g">eau</span>`);
    expect(motAvecGrapheme("c, k, qu", "canard")).toBe(`<span class="ak-g">c</span>anard`);
    // Les cinq périodes, dans l'ordre de la progression, sans graphème oublié.
    expect(new Set(MOTS_REPERES.map((m) => m.periode))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("chaque mot des listes analogiques et des maisons a le graphème de sa liste", () => {
    for (const e of lireCartes("listes", MODELES_CARTES.listes.lignes)) {
      if (e.forme !== "liste") continue;
      for (const mot of e.mots) expect(motAvecGrapheme(e.racine, mot), `${e.racine} › ${mot}`).toContain(`class="ak-g"`);
    }
    const gs = MODELES_CARTES.maisons.listes?.find((l) => l.id === "gs");
    for (const e of lireCartes("maisons", gs?.lignes ?? "")) {
      if (e.forme !== "maison") continue;
      for (const x of e.mots) expect(x.mot.toLowerCase(), `${e.son} › ${x.mot}`).toContain(e.son);
    }
  });

  it("les maisons de l'anglais cherchent le dessin sous le mot français, ou s'en passent", () => {
    const anglais = MODELES_CARTES.maisons.listes?.find((l) => l.id === "anglais");
    const [pig] = lireCartes("maisons", anglais?.lignes ?? "");
    expect(pig).toEqual({ forme: "maison", son: "/ɪ/ pig", mots: [
      { mot: "pig", picto: "cochon" }, { mot: "fish", picto: "poisson" }, { mot: "milk", picto: "lait" }, { mot: "six", picto: "" }] });
    expect(motsADessinerCartes("maisons", { lignes: anglais?.lignes })).not.toContain("six");
  });

  it("chaque mot d'une famille montre en gras ce qu'il partage avec le premier", () => {
    for (const e of lireCartes("familles", MODELES_CARTES.familles.lignes)) {
      if (e.forme !== "famille") continue;
      for (const mot of e.mots) expect(motDeLaFamille(e.racine, mot), `${e.racine} › ${mot}`).toMatch(/<b>.{3,}<\/b>/);
    }
    expect(motDeLaFamille("terre", "enterrer")).toBe("en<b>terre</b>r");
    expect(motDeLaFamille("chant", "chanson")).toBe("<b>chan</b>son");
  });

  it("chaque exemple de calcul est juste, et chaque comparaison vraie", () => {
    const valeur = (expression: string): number => {
      const e = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").trim();
      expect(e, expression).toMatch(/^[\d\s+\-*/]+$/);
      return Function(`"use strict"; return (${e});`)() as number;
    };
    const exemples = [MODELES_CARTES.calcul.lignes, ...(MODELES_CARTES.calcul.listes ?? []).map((l) => l.lignes)].join("\n");
    let egalites = 0;
    for (const e of lireCartes("calcul", exemples)) {
      if (e.forme !== "etape") continue;
      for (const chaine of e.detail.split(";")) {
        const membres = chaine.split("=").map(valeur);
        for (const v of membres) expect(v, chaine).toBe(membres[0]);
        egalites++;
      }
    }
    expect(egalites).toBeGreaterThan(15);
    let comparaisons = 0;
    for (const e of lireCartes("comparer", MODELES_CARTES.comparer.lignes)) {
      if (e.forme !== "etape") continue;
      for (const [, a, signe, b] of e.detail.matchAll(/(\d+)\s*([<>])\s*(\d+)/g)) {
        expect(signe === "<" ? Number(a) < Number(b) : Number(a) > Number(b), `${a} ${signe} ${b}`).toBe(true);
        comparaisons++;
      }
    }
    expect(comparaisons).toBe(5);
  });

  it("lit chaque forme de ligne : carte, son, paire, famille, maison, groupe", () => {
    expect(lireCartes("consignes", "Entoure | entourer\n\n# Les crayons\nLis")).toEqual([
      { forme: "carte", texte: "Entoure", picto: "entourer", detail: "" },
      { forme: "groupe", titre: "Les crayons" },
      { forme: "carte", texte: "Lis", picto: "lis", detail: "" },
    ]);
    expect(lireCartes("langue", "Monday | - | lundi")).toEqual([{ forme: "carte", texte: "Monday", picto: "", detail: "lundi" }]);
    expect(lireCartes("sons", "ou | loup | animal")).toEqual([{ forme: "son", graphemes: "ou", mot: "loup", picto: "animal" }]);
    expect(lireCartes("contraires", "grand / petit\nseul")).toEqual([{ forme: "paire", a: "grand", b: "petit" }]);
    expect(lireCartes("familles", "dent : dentiste, dentifrice")).toEqual([{ forme: "famille", racine: "dent", mots: ["dentiste", "dentifrice"] }]);
    expect(lireCartes("demarche", "Je cherche | loupe | J'observe.")).toEqual([{ forme: "etape", texte: "Je cherche", picto: "loupe", detail: "J'observe." }]);
  });

  it("les réglages se bornent à ce que l'affiche sait faire", () => {
    expect(reglagesCartesSurs("consignes", { colonnes: 12 }).colonnes).toBe(6);
    expect(reglagesCartesSurs("consignes", { colonnes: 0 }).colonnes).toBe(1);
    // Des étapes ne se découpent pas en étiquettes, et vont une par ligne.
    expect(reglagesCartesSurs("demarche", { format: "etiquettes", colonnes: 3 })).toMatchObject({ format: "mur", colonnes: 1 });
    expect(reglagesCartesSurs("coins", {}).format).toBe("etiquettes");
    expect(reglagesCartesSurs("consignes", { format: "pas un format" as never }).format).toBe("mur");
    expect(reglagesCartesSurs("consignes", { lignes: "x".repeat(10000) }).lignes).toHaveLength(6000);
  });

  it("les grandes étiquettes vont par quatre ; le cahier met quatre fois la page en petit", () => {
    const etiquettes = htmlCartes("consignes", { format: "etiquettes" });
    expect(etiquettes.match(/class="page ak-planche"/g)).toHaveLength(5);
    const cahier = htmlCartes("demarche", { format: "cahier" });
    expect(cahier.match(/class="ak-petit"/g)).toHaveLength(4);
    // Les émotions gardent leur force en étiquettes : 3 sur 4 pour « en colère ».
    expect(htmlCartes("emotions", { format: "etiquettes" })).toContain(`aria-label="3 sur 4"`);
  });

  it("une page par couleur, chacune avec sa pastille", () => {
    const html = htmlCartes("couleurs", {}, imagesDe("couleurs"));
    expect(html.match(/ak-groupe-page/g)).toHaveLength(4);
    expect(html).toContain(`background: #d33a32`);
    expect(teinteDe("Le rouge")).toBe("#d33a32");
    expect(teinteDe("L'orange")).toBe("#f08a24");
    expect(teinteDe("L’orange")).toBe("#f08a24");
    expect(teinteDe("Pour dire où")).toBeNull();
  });

  it("les listes toutes prêtes du coin langue ont chacune un titre et des cartes", () => {
    for (const l of LISTES_DE_LANGUE) {
      expect(l.titre.trim()).not.toBe("");
      expect(lireCartes("langue", l.lignes).length, l.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("estime large les lignes d'un texte, mot à mot", () => {
    expect(lignesDe("", 50, 7)).toBe(1);
    expect(lignesDe("Lis", 50, 7)).toBe(1);
    expect(lignesDe("Distribuer le matériel", 38, 5.2)).toBe(2);
    // Un mot plus long que la ligne se coupe.
    expect(lignesDe("anticonstitutionnellement", 20, 5)).toBeGreaterThan(3);
    // Les capitales sont plus larges.
    expect(lignesDe("le coin", 28, 6)).toBe(1);
    expect(lignesDe("LE COIN", 28, 6, true)).toBe(2);
  });

  it("échappe ce qu'on écrit", () => {
    const html = htmlCartes("consignes", { lignes: "<b>Lis</b> | -", titre: "<script>" });
    expect(html).not.toContain("<b>Lis</b>");
    expect(html).not.toContain("<script>");
  });
});
