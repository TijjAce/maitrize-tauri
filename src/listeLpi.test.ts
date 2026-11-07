// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { AMENAGEMENTS_LPI, NIVEAUX_LPI, ONGLETS_LPI, POINTS_ET_DIFFICULTES_LPI } from "./data/amenagementsLPI";
import { DISPOSITIFS } from "./data/dispositifs";
import { texteDesPlans } from "./agentSynthese";
import {
  amenagementsVides, appuisVides, basculerAmenagement, basculerLigne, deplacerAmenagement, estRetenu, htmlDesAmenagements,
  htmlDesAppuis, ligneRetenue, lireAmenagements, lireAppuis, niveauLpiDe, poserAutre, poserLigneAutre, preciserAmenagement,
  retirerAmenagement, texteAutre, texteDesAmenagements, texteDesAppuis, texteLigneAutre,
  type ChoixAmenagements, type ChoixAppuis,
} from "./listeLpi";

const vide: ChoixAmenagements = { retenus: [] };
const rien: ChoixAppuis = { appuis: [], difficultes: [] };
const brut = (t: string) => t;

describe("la liste officielle, telle que relevée", () => {
  // Les nombres du PDF de février 2026 : une liste tronquée ou mal découpée se verrait ici.
  it("garde chaque rubrique de chaque niveau, avec son nombre d'aménagements", () => {
    const compte = (n: keyof typeof AMENAGEMENTS_LPI) => AMENAGEMENTS_LPI[n].map((r) => r.items.length);
    expect(compte("maternelle")).toEqual([14, 26, 13, 12]);
    expect(AMENAGEMENTS_LPI.elementaire).toHaveLength(7);
    expect(AMENAGEMENTS_LPI.second).toHaveLength(8);
    const total = NIVEAUX_LPI.reduce((n, { id }) => n + compte(id).reduce((a, b) => a + b, 0), 0);
    expect(total).toBe(372);
  });

  it("n'a ni libellé vide, ni numéro resté collé, ni pied de page, ni doublon dans une rubrique", () => {
    for (const { id } of NIVEAUX_LPI) {
      for (const r of AMENAGEMENTS_LPI[id]) {
        expect(new Set(r.items).size, `${id} / ${r.titre}`).toBe(r.items.length);
        for (const t of r.items) {
          expect(t.trim().length, r.titre).toBeGreaterThan(8);
          expect(t).not.toMatch(/^\d+\./);
          expect(t).not.toMatch(/février 2026|au sein du LPI/);
        }
      }
    }
  });

  it("range la maternelle sur deux onglets, les autres niveaux sur les trois du LPI", () => {
    const onglets = (n: keyof typeof AMENAGEMENTS_LPI) => [...new Set(AMENAGEMENTS_LPI[n].map((r) => r.onglet))];
    expect(onglets("maternelle")).toEqual(ONGLETS_LPI.slice(0, 2));
    expect(onglets("elementaire")).toEqual([...ONGLETS_LPI]);
    expect(onglets("second")).toEqual([...ONGLETS_LPI]);
  });

  it("donne à chaque point d'appui la difficulté qui lui répond", () => {
    expect(POINTS_ET_DIFFICULTES_LPI).toHaveLength(12);
    expect(POINTS_ET_DIFFICULTES_LPI.flatMap((s) => s.paires)).toHaveLength(55);
    for (const s of POINTS_ET_DIFFICULTES_LPI) {
      for (const p of s.paires) {
        expect(p.appui.trim(), s.titre).not.toBe("");
        expect(p.difficulte.trim(), s.titre).not.toBe("");
        expect(p.appui).not.toBe(p.difficulte);
      }
    }
  });
});

describe("le niveau de la liste", () => {
  it("se déduit de la classe de l'élève", () => {
    for (const n of ["PS", "MS", "GS", "ms", "Petite section"]) expect(niveauLpiDe(n), n).toBe("maternelle");
    for (const n of ["CP", "CE1", "CE2", "CM1", "CM2"]) expect(niveauLpiDe(n), n).toBe("elementaire");
    for (const n of ["6e", "3e", "Collège", "SEGPA"]) expect(niveauLpiDe(n), n).toBe("second");
  });

  it("revient à l'élémentaire si la classe ne dit rien", () => {
    for (const n of ["", null, undefined, "IME", "groupe bleu"]) expect(niveauLpiDe(n)).toBe("elementaire");
  });
});

describe("les aménagements retenus", () => {
  const trois = ["A", "B", "C"].reduce((c, t) => basculerAmenagement(c, "R", t), vide);

  it("se cochent et se décochent, dans l'ordre où on les coche", () => {
    expect(trois.retenus.map((r) => r.texte)).toEqual(["A", "B", "C"]);
    expect(estRetenu(trois, "R", "B")).toBe(true);
    const sansB = basculerAmenagement(trois, "R", "B");
    expect(sansB.retenus.map((r) => r.texte)).toEqual(["A", "C"]);
    expect(estRetenu(sansB, "R", "B")).toBe(false);
  });

  it("distinguent deux rubriques qui portent le même libellé", () => {
    const c = basculerAmenagement(basculerAmenagement(vide, "R1", "A"), "R2", "A");
    expect(c.retenus).toHaveLength(2);
    expect(estRetenu(basculerAmenagement(c, "R1", "A"), "R2", "A")).toBe(true);
  });

  it("changent d'ordre, sans sortir de la liste", () => {
    expect(deplacerAmenagement(trois, 2, -1).retenus.map((r) => r.texte)).toEqual(["A", "C", "B"]);
    expect(deplacerAmenagement(trois, 0, 1).retenus.map((r) => r.texte)).toEqual(["B", "A", "C"]);
    expect(deplacerAmenagement(trois, 0, -1)).toBe(trois);
    expect(deplacerAmenagement(trois, 2, 1)).toBe(trois);
  });

  it("gardent leur précision quand ils changent de place, et se retirent", () => {
    const c = preciserAmenagement(trois, 1, "en lecture");
    expect(deplacerAmenagement(c, 1, -1).retenus[0]).toMatchObject({ texte: "B", precision: "en lecture" });
    expect(retirerAmenagement(c, 1).retenus.map((r) => r.texte)).toEqual(["A", "C"]);
  });

  it("acceptent trois champs libres par rubrique, et un champ vidé sort de la liste", () => {
    let c = poserAutre(vide, "R", 0, "Lire à voix basse");
    c = poserAutre(c, "R", 2, "Autre idée");
    expect(texteAutre(c, "R", 0)).toBe("Lire à voix basse");
    expect(texteAutre(c, "R", 1)).toBe("");
    expect(c.retenus).toHaveLength(2);
    c = poserAutre(c, "R", 0, "Lire à voix haute");
    expect(c.retenus.map((r) => r.texte)).toEqual(["Lire à voix haute", "Autre idée"]);
    c = poserAutre(c, "R", 0, "   ");
    expect(c.retenus.map((r) => r.texte)).toEqual(["Autre idée"]);
  });

  it("un champ libre n'est jamais pris pour le libellé officiel du même nom", () => {
    const c = poserAutre(vide, "R", 0, "A");
    expect(estRetenu(c, "R", "A")).toBe(false);
    const avec = basculerAmenagement(c, "R", "A");
    expect(avec.retenus).toHaveLength(2);
    expect(basculerAmenagement(avec, "R", "A").retenus).toEqual([{ rubrique: "R", texte: "A", autre: 0 }]);
  });
});

describe("les points d'appui et difficultés retenus", () => {
  it("se cochent de chaque côté sans se mêler", () => {
    const c = basculerLigne(basculerLigne(rien, "appuis", "S", "Lit"), "difficultes", "S", "Ne lit pas");
    expect(ligneRetenue(c, "appuis", "S", "Lit")).toBe(true);
    expect(ligneRetenue(c, "difficultes", "S", "Lit")).toBe(false);
    expect(basculerLigne(c, "appuis", "S", "Lit").appuis).toEqual([]);
  });

  it("acceptent un champ libre par sous-domaine, et un champ vidé sort de la liste", () => {
    let c = poserLigneAutre(rien, "appuis", "S", "Aime les cartes");
    expect(texteLigneAutre(c, "appuis", "S")).toBe("Aime les cartes");
    c = poserLigneAutre(c, "appuis", "S", "Aime les atlas");
    expect(c.appuis).toEqual([{ sousDomaine: "S", texte: "Aime les atlas", autre: true }]);
    expect(appuisVides(poserLigneAutre(c, "appuis", "S", ""))).toBe(true);
  });
});

describe("ce qui est enregistré", () => {
  it("un document ancien ou abîmé donne un choix vide, sans planter", () => {
    for (const v of [undefined, null, "texte", 3, {}, { retenus: "non" }, { retenus: [null, 1, { texte: "sans rubrique" }] }]) {
      expect(amenagementsVides(lireAmenagements(v))).toBe(true);
    }
    for (const v of [undefined, null, "texte", {}, { appuis: 3, difficultes: [{}] }]) {
      expect(appuisVides(lireAppuis(v))).toBe(true);
    }
  });

  it("un choix passe par JSON sans rien perdre, ordre compris", () => {
    const c = preciserAmenagement(poserAutre(basculerAmenagement(vide, "R", "A"), "R", 1, "B"), 0, "p");
    expect(lireAmenagements(JSON.parse(JSON.stringify({ ...c, niveau: "second" })))).toEqual({ ...c, niveau: "second" });
  });
});

describe("à l'impression et pour l'agent de synthèse", () => {
  const c = preciserAmenagement(basculerAmenagement(basculerAmenagement(vide, "R1", "A <b>"), "R2", "B"), 0, "p & q");

  it("imprime dans l'ordre choisi, en échappant ce qui est écrit", () => {
    const echappe = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = htmlDesAmenagements(c, echappe);
    expect(html).toContain("A &lt;b&gt;");
    expect(html).toContain("p &amp; q");
    expect(html).not.toContain("<b>");
    expect(html.indexOf("A &lt;b&gt;")).toBeLessThan(html.indexOf(">B "));
    expect(htmlDesAmenagements(vide, brut)).toBe("");
  });

  it("range points d'appui et difficultés par sous-domaine", () => {
    let a = basculerLigne(rien, "appuis", "S1", "Lit");
    a = basculerLigne(a, "appuis", "S1", "Écrit");
    a = basculerLigne(a, "difficultes", "S2", "Compte mal");
    const html = htmlDesAppuis(a, brut);
    expect(html).toContain("<b>S1 :</b> Lit ; Écrit");
    expect(html).toContain("Difficultés");
    expect(html).toContain("<b>S2 :</b> Compte mal");
    expect(htmlDesAppuis(rien, brut)).toBe("");
  });

  it("donne une ligne de texte", () => {
    expect(texteDesAmenagements(c)).toBe("A <b> (p & q) ; B");
    expect(texteDesAppuis(basculerLigne(rien, "difficultes", "S", "Compte mal"))).toBe("Difficultés : Compte mal");
  });

  it("la synthèse d'un élève reprend ce que son PAP a retenu", () => {
    const doc = {
      lpiAppuis: basculerLigne(rien, "appuis", "S", "Travaille seul"),
      lpiAmenagements: basculerAmenagement(vide, "R", "Accorder un temps majoré à l'écrit"),
    };
    const texte = texteDesPlans({ pap: JSON.stringify(doc) });
    expect(texte).toContain("Travaille seul");
    expect(texte).toContain("Accorder un temps majoré à l'écrit");
  });
});

describe("les plans qui portent la liste", () => {
  const champ = (id: string, t: string) => DISPOSITIFS.find((d) => d.id === id)!.sections.flatMap((s) => s.champs).filter((c) => c.t === t);

  it("le PAP et le PPRE ont les points d'appui et les aménagements, le PPS ses aménagements", () => {
    for (const id of ["pap", "ppre"]) {
      expect(champ(id, "appuis"), id).toHaveLength(1);
      expect(champ(id, "amenagements"), id).toHaveLength(1);
    }
    expect(champ("pps", "amenagements")).toHaveLength(1);
    expect(champ("pai", "amenagements")).toHaveLength(0);
  });

  it("le PAP garde les grilles de 2015 pour ce qui y est déjà écrit", () => {
    const pap = DISPOSITIFS.find((d) => d.id === "pap")!;
    const repliees = pap.sections.filter((s) => s.repliee);
    expect(repliees.length).toBeGreaterThan(0);
    expect(repliees.every((s) => s.champs.some((c) => c.t === "grille"))).toBe(true);
  });
});
