// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import {
  LETTRES_A_VALEURS, REGLAGES_VALEUR_LETTRES, VALEURS, htmlValeurLettres, motEnCouleur, motsADessiner, motsDeLaRegle, motsHorsDeLaRegle,
  placesDeLaRegle, prononciations, reglagesValeurLettresSurs, sonsAffiches, titreValeurLettres,
} from "./valeurDesLettres";

const regle = (id: string) => Object.values(VALEURS).flatMap((sons) => sons.flatMap((s) => s.regles)).find((r) => r.id === id)!;

describe("La valeur des lettres c, g et s", () => {
  it("dit, comme le programme du CE1, que c se prononce k ou ss, g j ou g, s ss ou z", () => {
    expect(prononciations("c")).toBe("[k] ou [s]");
    expect(prononciations("g")).toBe("[g] ou [j]");
    expect(prononciations("s")).toBe("[s] ou [z]");
  });

  it("range chacun de ses mots sous une règle qui s'y voit", () => {
    for (const l of LETTRES_A_VALEURS) {
      for (const son of VALEURS[l]) {
        for (const g of son.regles) expect(motsHorsDeLaRegle(g, { mots: {} }), g.id).toEqual([]);
      }
    }
  });

  it("trouve la lettre là où la règle vaut, et seulement là", () => {
    expect(placesDeLaRegle(regle("c-k-aou"), "cochon")).toEqual([0]);
    expect(placesDeLaRegle(regle("c-k-consonne"), "crocodile")).toEqual([0]);
    expect(placesDeLaRegle(regle("c-s-eiy"), "crocodile")).toEqual([]);
    expect(placesDeLaRegle(regle("s-z"), "maison")).toEqual([3]);
    expect(placesDeLaRegle(regle("s-z"), "poisson")).toEqual([]);
    expect(placesDeLaRegle(regle("s-ss"), "poisson")).toEqual([3]);
    expect(placesDeLaRegle(regle("s-muet"), "souris")).toEqual([5]);
    expect(placesDeLaRegle(regle("s-debut"), "souris")).toEqual([0]);
    expect(placesDeLaRegle(regle("g-gu"), "figue")).toEqual([2]);
    expect(placesDeLaRegle(regle("g-muet"), "doigt")).toEqual([3]);
    // « chat » : le c est dans le digramme ch, pas devant une consonne.
    expect(motsHorsDeLaRegle(regle("c-k-consonne"), { mots: { "c-k-consonne": "clé, chat" } })).toEqual(["chat"]);
  });

  it("met la lettre en couleur et souligne celle qui décide", () => {
    expect(motEnCouleur(regle("c-k-aou"), "canard")).toBe('<span class="vl-l">c</span><span class="vl-c">a</span>nard');
    expect(motEnCouleur(regle("c-s-cedille"), "garçon")).toBe('gar<span class="vl-l">ç</span><span class="vl-c">o</span>n');
    expect(motEnCouleur(regle("s-z"), "rose")).toBe('r<span class="vl-c">o</span><span class="vl-l">s</span><span class="vl-c">e</span>');
    expect(motEnCouleur(regle("s-consonne"), "veste")).toBe('ve<span class="vl-l">s</span><span class="vl-c">t</span>e');
    expect(motEnCouleur(regle("g-ge"), "Pigeon")).toBe('Pi<span class="vl-l">ge</span><span class="vl-c">o</span>n');
  });

  it("lit les mots de la classe, et le mot de la famille où la lettre muette s'entend", () => {
    expect(motsDeLaRegle(regle("c-muet"), { mots: {} })[0]).toEqual({ mot: "blanc", famille: "blanche" });
    const html = htmlValeurLettres({ lettres: ["c"] });
    expect(html).toContain('<span class="vl-famille">blanche</span>');
    expect(motsDeLaRegle(regle("c-k-fin"), { mots: { "c-k-fin": "sac ; lac\nbec, parc, roc, troc" } }).map((m) => m.mot)).toEqual(["sac", "lac", "bec", "parc", "roc"]);
  });

  it("montre les lettres muettes et les digrammes sur demande", () => {
    expect(sonsAffiches("c", { muettes: true, digrammes: false }).map((s) => s.son)).toEqual(["[k]", "[s]", "muet"]);
    expect(sonsAffiches("g", { muettes: false, digrammes: true }).map((s) => s.son)).toEqual(["[g]", "[j]", "gn"]);
    expect(htmlValeurLettres({ lettres: ["s"], digrammes: true })).not.toContain("violet");
  });

  it("fait une page par lettre, ou quatre petites par planche pour le cahier", () => {
    expect(htmlValeurLettres({}).match(/class="page"/g)).toHaveLength(3);
    const cahier = htmlValeurLettres({ lettres: ["g"], format: "cahier" });
    expect(cahier.match(/vl-petit/g)).toHaveLength(4);
    expect(titreValeurLettres({})).toBe("Les lettres c, g et s");
    expect(titreValeurLettres({ lettres: ["g"] })).toBe("La lettre g");
  });

  it("met les dessins et la mention d'ARASAAC quand il y en a", () => {
    expect(motsADessiner({ lettres: ["s"] })).toEqual(expect.arrayContaining(["sapin", "poisson", "oiseau", "souris"]));
    const html = htmlValeurLettres({ lettres: ["s"] }, { sapin: "data:image/png;base64,AAAA" });
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain("ARASAAC");
    expect(htmlValeurLettres({ lettres: ["s"] })).not.toContain("ARASAAC");
  });

  it("répare des réglages abîmés", () => {
    expect(reglagesValeurLettresSurs(null)).toEqual(REGLAGES_VALEUR_LETTRES);
    const r = reglagesValeurLettresSurs({ lettres: ["x", "s"] as never, mots: { "s-z": "rose", inconnue: "x" } as never, format: "?" as never });
    expect(r.lettres).toEqual(["s"]);
    expect(r.mots).toEqual({ "s-z": "rose" });
    expect(r.format).toBe("mur");
  });
});
