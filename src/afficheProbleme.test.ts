// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, expect, it } from "vitest";
import {
  CATEGORIES, REGLAGES_AFFICHE_PROBLEME, erreurDesNombres, htmlAfficheProbleme, nombresAbsents, problemeDeLAffiche,
  reglagesAfficheProblemeSurs, titreAfficheProbleme,
} from "./afficheProbleme";

describe("L'affiche du problème de référence", () => {
  it("reprend d'abord l'exemple du guide CP : les billes rouges et bleues de Léo", () => {
    const p = problemeDeLAffiche(REGLAGES_AFFICHE_PROBLEME)!;
    expect(p.enonce).toBe("Léo a 7 billes rouges et 5 billes bleues. Combien de billes a Léo en tout ?");
    expect(p.calcul).toBe("7 + 5 = 12");
    expect(p.phrase).toBe("Léo a 12 billes en tout.");
    expect(p.comprendre).toBe("On connaît les deux parties. On cherche le tout.");
  });

  it("dit d'abord qui en a le plus devant une comparaison, comme le guide CP", () => {
    const plus = problemeDeLAffiche({ categorie: "plus", nombres: [37, 6] })!;
    expect(plus.enonce).toBe("Lucie a 37 billes. Léo a 6 billes de plus que Lucie. Combien de billes a Léo ?");
    expect(plus.calcul).toBe("37 + 6 = 43");
    expect(plus.comprendre).toBe("Qui a le plus de billes ? Léo. On cherche la plus grande quantité.");
    expect(plus.schema).toEqual({
      forme: "ecart", ecart: 6, grand: { nom: "Léo", valeur: 43, connue: false }, petit: { nom: "Lucie", valeur: 37, connue: true },
    });
    const moins = problemeDeLAffiche({ categorie: "moins", nombres: [43, 6] })!;
    expect(moins.enonce).toBe("Lucie a 43 billes. Léo a 6 billes de moins que Lucie. Combien de billes a Léo ?");
    expect(moins.calcul).toBe("43 − 6 = 37");
    expect(moins.comprendre).toMatch(/^Qui a le plus de billes \? Lucie\./);
  });

  it("fait de chaque sorte un problème juste, quelle que soit l'histoire", () => {
    for (const c of CATEGORIES) {
      for (const graine of [0, 1, 2, 3, 4, 5]) {
        const p = problemeDeLAffiche({ categorie: c.id, nombres: c.defaut, graine })!;
        expect(p, `${c.id} / ${graine}`).not.toBeNull();
        // Le calcul donne la réponse, et la phrase la dit.
        expect(p.calcul.split("=").pop()!.trim(), c.id).toBe(String(p.reponse));
        expect(p.phrase, c.id).toContain(String(p.reponse));
        // L'énoncé dit les deux nombres de la classe, et pas la réponse.
        expect(nombresAbsents(p.enonce, { nombres: c.defaut }), c.id).toEqual([]);
        if (!c.defaut.includes(p.reponse)) expect(p.enonce.match(/\d+/g)?.map(Number), c.id).not.toContain(p.reponse);
      }
    }
  });

  it("refuse les nombres qui ne font pas un problème de la sorte", () => {
    expect(erreurDesNombres({ categorie: "partie", nombres: [5, 7] })).toMatch(/plus petite que le tout/);
    expect(erreurDesNombres({ categorie: "parts-valeur", nombres: [25, 4] })).toBe("25 ne se partage pas en 4 parts égales.");
    expect(erreurDesNombres({ categorie: "parts-valeur", nombres: [24, 4] })).toBe("");
    expect(erreurDesNombres({ categorie: "fois-moins", nombres: [13, 3] })).not.toBe("");
    expect(problemeDeLAffiche({ categorie: "retrait", nombres: [5, 9] })).toBeNull();
    expect(htmlAfficheProbleme({ categorie: "retrait", nombres: [5, 9] })).not.toContain("pa-page");
  });

  it("imprime les textes de la classe à la place de ceux de Maitrize, échappés", () => {
    const html = htmlAfficheProbleme({ enonce: "Léo a 7 billes <rouges> et 5 bleues.", phrase: "Il en a 12.", nom: "Le problème des billes" });
    expect(html).toContain("Léo a 7 billes &lt;rouges&gt; et 5 bleues.");
    expect(html).toContain("Il en a 12.");
    expect(html).toContain("Le problème des billes");
    expect(html).toContain("7 + 5 = 12");
    expect(nombresAbsents("Léo a 7 billes.", { nombres: [7, 5] })).toEqual([5]);
    expect(nombresAbsents("Il y a 1 000 billes et 250 sacs.", { nombres: [1000, 250] })).toEqual([]);
  });

  it("suit les étapes du guide, et se range en largeur si on le demande", () => {
    const html = htmlAfficheProbleme({});
    const etapes = [...html.matchAll(/class="pa-nom">([^<]+)</g)].map((m) => m[1]);
    expect(etapes).toEqual(["Le problème", "Je comprends", "Je représente", "Je calcule", "Je réponds"]);
    expect(htmlAfficheProbleme({ etapeComprendre: false })).not.toContain("Je comprends");
    expect(htmlAfficheProbleme({ format: "paysage" })).toContain("pa-paysage");
    expect(titreAfficheProbleme({})).toBe("Problème de référence · Parties et tout · On cherche le tout");
  });

  it("répare des réglages abîmés", () => {
    expect(reglagesAfficheProblemeSurs(null)).toEqual(REGLAGES_AFFICHE_PROBLEME);
    const r = reglagesAfficheProblemeSurs({ categorie: "nimporte" as never, nombres: [-3, 2.6] as never, prenoms: ["", "Inès"] });
    expect(r.categorie).toBe("reunion");
    expect(r.nombres).toEqual([1, 3]);
    expect(r.prenoms).toEqual(["Léo", "Inès"]);
  });
});
