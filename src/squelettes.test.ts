import { describe, it, expect } from "vitest";
import {
  SQUELETTES, NOYAU, NATURE_DU_ROLE, squelettePour, roleDeLaCase,
  plan, placesDuTheme, motsDuNoyau, type Role,
} from "./squelettes";
import { tableauSurTheme } from "./tla";
import type { PictoArasaac } from "./api";

// Ce que ces tests protègent tient en une phrase : un TLA n'est pas un
// tableau de choix. S'il ne contenait que des noms, on pourrait désigner un
// objet mais ni demander, ni questionner, ni commenter, ni refuser.

describe("structure d'un tableau de langage", () => {
  it("donne toujours de quoi faire autre chose que désigner", () => {
    for (const s of SQUELETTES) {
      const roles = new Set(plan(s).map((c) => c.role));
      expect(roles.has("pronom"), `${s.label} sans pronom`).toBe(true);
      expect(roles.has("verbe"), `${s.label} sans verbe`).toBe(true);
      expect(roles.size, `${s.label} n'a que des noms`).toBeGreaterThan(2);
    }
  });

  it("laisse de la place au thème sans lui donner le tableau", () => {
    for (const s of SQUELETTES) {
      const total = s.colonnes * s.lignes;
      const noms = placesDuTheme(s);
      expect(noms, `${s.label} n'a aucune place pour le thème`).toBeGreaterThan(0);
      expect(noms, `${s.label} est un tableau de choix déguisé`).toBeLessThan(total / 2);
    }
  });

  it("remplit toutes les cases de la grille", () => {
    for (const s of SQUELETTES) {
      expect(plan(s), s.label).toHaveLength(s.colonnes * s.lignes);
    }
  });

  it("suit l'ordre de la phrase française, de gauche à droite", () => {
    // Les pronoms précèdent les verbes, qui précèdent les noms.
    for (const s of SQUELETTES) {
      const colonneDe = (r: Role) => s.roles.findIndex((pile) => pile.includes(r));
      const [p, v, n] = [colonneDe("pronom"), colonneDe("verbe"), colonneDe("nom")];
      expect(p, `${s.label} : pronoms après les verbes`).toBeLessThan(v);
      expect(v, `${s.label} : verbes après les noms`).toBeLessThan(n);
    }
  });

  it("ne pose jamais deux fois le même mot du noyau", () => {
    for (const s of SQUELETTES) {
      const mots = plan(s).map((c) => c.mot).filter(Boolean);
      expect(new Set(mots).size, s.label).toBe(mots.length);
    }
  });

  it("garde les deux dispositions publiées telles quelles", () => {
    // 12 et 20 cases sont les exemples de l'article de référence : elles ne
    // doivent pas dériver au fil des retouches.
    const douze = SQUELETTES.find((s) => s.colonnes === 4 && s.lignes === 3)!;
    expect(douze.documente).toBe(true);
    expect(douze.roles).toEqual([["question", "pronom"], ["verbe"], ["nom"], ["adjectif"]]);
    const vingt = SQUELETTES.find((s) => s.colonnes === 5 && s.lignes === 4)!;
    expect(vingt.documente).toBe(true);
    expect(vingt.roles).toEqual([["question", "social"], ["pronom"], ["verbe"], ["petit mot", "nom"], ["adjectif"]]);
  });
});

describe("stabilité du noyau entre les tableaux", () => {
  it("place les mots récurrents à la même case quel que soit le thème", () => {
    // JE, TU, ENCORE et FINI reviennent d'un tableau à l'autre : c'est leur
    // emplacement constant qui permet de les atteindre sans les chercher.
    const s = squelettePour(5, 4);
    const noyau = new Map<string, PictoArasaac>(
      motsDuNoyau(s).map((m, i) => [m, { id: i + 1, mot: m, fichier: `${i}.png` }]),
    );
    const theme = (n: number, decalage: number): PictoArasaac[] =>
      Array.from({ length: n }, (_, i) => ({ id: 900 + decalage + i, mot: `t${i}`, fichier: "" }));
    const a = tableauSurTheme(s, "Cuisine", noyau, theme(placesDuTheme(s), 0));
    const b = tableauSurTheme(s, "Piscine", noyau, theme(placesDuTheme(s), 50));
    for (const mot of ["je", "tu", "encore", "fini"]) {
      const ia = a.cases.findIndex((c) => c.mot === mot);
      const ib = b.cases.findIndex((c) => c.mot === mot);
      expect(ia, `« ${mot} » absent du tableau`).toBeGreaterThanOrEqual(0);
      expect(ib, `« ${mot} » n'est pas à la même case d'un tableau à l'autre`).toBe(ia);
    }
  });

  it("laisse la case vide quand un mot du noyau manque, sans décaler les suivants", () => {
    const s = squelettePour(4, 3);
    const mots = motsDuNoyau(s);
    const complet = new Map<string, PictoArasaac>(
      mots.map((m, i) => [m, { id: i + 1, mot: m, fichier: "" }]),
    );
    const troue = new Map(complet);
    troue.delete("vouloir");
    const a = tableauSurTheme(s, "T", complet, []);
    const b = tableauSurTheme(s, "T", troue, []);
    const iVouloir = a.cases.findIndex((c) => c.mot === "vouloir");
    expect(b.cases[iVouloir].pictoId).toBeNull();
    expect(b.cases.filter((c) => c.mot === "aller").length).toBe(1);
    const iAller = a.cases.findIndex((c) => c.mot === "aller");
    expect(b.cases[iAller].mot).toBe("aller");
  });

  it("colore chaque case selon le rôle de sa colonne", () => {
    const s = squelettePour(5, 4);
    const noyau = new Map<string, PictoArasaac>(
      motsDuNoyau(s).map((m, i) => [m, { id: i + 1, mot: m, fichier: "" }]),
    );
    const g = tableauSurTheme(s, "T", noyau, []);
    const iJe = g.cases.findIndex((c) => c.mot === "je");
    expect(g.cases[iJe].nature).toBe(NATURE_DU_ROLE.pronom);
    const iAller = g.cases.findIndex((c) => c.mot === "aller");
    expect(g.cases[iAller].nature).toBe(NATURE_DU_ROLE.verbe);
  });

  it("produit une grille cohérente avec la taille annoncée", () => {
    for (const s of SQUELETTES) {
      const g = tableauSurTheme(s, "T", new Map(), []);
      expect(g.cases.length, s.label).toBe(g.colonnes * g.lignes);
    }
  });
});

describe("vocabulaire noyau", () => {
  it("couvre les natures qu'un tableau doit offrir", () => {
    for (const r of ["question", "pronom", "verbe", "petit mot", "adjectif", "social"] as Role[]) {
      expect(NOYAU[r].length, `le noyau « ${r} » est vide`).toBeGreaterThan(0);
    }
  });

  it("contient les mots qui reviennent d'un tableau à l'autre", () => {
    const tous = Object.values(NOYAU).flat();
    for (const m of ["je", "tu", "encore", "fini", "oui", "non"]) {
      expect(tous, `« ${m} » manque au noyau`).toContain(m);
    }
  });

  it("emploie les libellés exacts de la banque", () => {
    // La résolution est exacte : « quoi » au lieu de « quoi ? » ne trouverait
    // aucun pictogramme et laisserait la case vide sans le dire.
    expect(NOYAU.question).toContain("quoi ?");
  });

  it("associe chaque rôle à une nature d'affichage", () => {
    for (const r of Object.keys(NOYAU) as Role[]) {
      expect(NATURE_DU_ROLE[r], `rôle « ${r} » sans couleur`).toBeTruthy();
    }
  });
});

describe("choix du squelette", () => {
  it("rend la disposition exacte quand elle existe", () => {
    expect(squelettePour(5, 4).label).toMatch(/20 cases/);
  });

  it("rend la plus proche sinon, plutôt que rien", () => {
    expect(squelettePour(7, 7)).toBeTruthy();
    expect(squelettePour(1, 1)).toBeTruthy();
  });

  it("attribue un rôle à chaque case de chaque squelette", () => {
    for (const s of SQUELETTES) {
      for (let l = 0; l < s.lignes; l++) {
        for (let c = 0; c < s.colonnes; c++) {
          expect(roleDeLaCase(s, c, l), `${s.label} case ${c},${l}`).toBeTruthy();
        }
      }
    }
  });
});
