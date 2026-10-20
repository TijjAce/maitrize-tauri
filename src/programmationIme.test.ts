import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({ newId: () => "id" + Math.random().toString(36).slice(2, 8) }));

import {
  CIBLE_MAX, CIBLE_MIN, basculerCible, cyclerPeriode, domaineDe, etatDePeriode, niveauDe, parDomaine, basculerPeriode, comptes, ecrire, elevesConcernes, etatDuCompte, lire, marqueEleve, marqueGroupe, motDuCompte, nouvelObjectif, objectifsDe, type ProgrammationIme, vide,
} from "./programmationIme";

const prog = (): ProgrammationIme => ({
  groupes: [{ id: "g1", nom: "Langage", eleveIds: ["e1", "e2"] }],
  objectifs: [
    { id: "o1", competence: "Demander de l'aide", origine: "PPI", pour: [marqueGroupe("g1")],
      periodes: [1, 2], atteintes: [], creneaux: [], notes: "" },
    { id: "o2", competence: "Dénombrer jusqu'à 10", origine: "BO", pour: [marqueEleve("e3")],
      periodes: [3], atteintes: [], creneaux: [], notes: "" },
  ],
});

describe("qui est concerné par un objectif", () => {
  it("déplie les groupes", () => {
    const p = prog();
    expect(elevesConcernes(p.objectifs[0], p.groupes).sort()).toEqual(["e1", "e2"]);
    expect(elevesConcernes(p.objectifs[1], p.groupes)).toEqual(["e3"]);
  });

  it("un élève visé deux fois ne compte qu'une fois", () => {
    // Sans cela, son tableau annonçait seize objectifs pour douze.
    const p = prog();
    p.objectifs[0].pour.push(marqueEleve("e1"));
    expect(elevesConcernes(p.objectifs[0], p.groupes).sort()).toEqual(["e1", "e2"]);
  });

  it("un groupe disparu ne fait pas tomber la lecture", () => {
    const o = { ...prog().objectifs[0], pour: [marqueGroupe("inconnu")] };
    expect(elevesConcernes(o, [])).toEqual([]);
  });

  it("les objectifs d'un élève se retrouvent", () => {
    const p = prog();
    expect(objectifsDe(p, "e1").map((o) => o.id)).toEqual(["o1"]);
    expect(objectifsDe(p, "e3").map((o) => o.id)).toEqual(["o2"]);
    expect(objectifsDe(p, "e9")).toEqual([]);
  });
});

describe("compter par élève", () => {
  it("compte à travers les groupes, et connaît les élèves sans objectif", () => {
    expect(comptes(prog(), ["e1", "e2", "e3", "e4"])).toEqual({ e1: 1, e2: 1, e3: 1, e4: 0 });
  });

  it("dit où l'on en est, en français", () => {
    expect(etatDuCompte(0)).toBe("vide");
    expect(etatDuCompte(CIBLE_MIN - 1)).toBe("peu");
    expect(etatDuCompte(CIBLE_MIN)).toBe("bon");
    expect(etatDuCompte(CIBLE_MAX)).toBe("bon");
    expect(etatDuCompte(CIBLE_MAX + 1)).toBe("trop");
    expect(motDuCompte(7)).toContain("il en manque 3");
    expect(motDuCompte(0)).toContain("10 à 15");
  });
});

describe("modifier un objectif", () => {
  it("ajoute puis retire une cible", () => {
    let o = nouvelObjectif();
    o = basculerCible(o, marqueEleve("e1"));
    expect(o.pour).toEqual([marqueEleve("e1")]);
    o = basculerCible(o, marqueEleve("e1"));
    expect(o.pour).toEqual([]);
  });

  it("range les périodes, et oublie une réussite sur une période retirée", () => {
    let o = nouvelObjectif();
    o = basculerPeriode(o, 3);
    o = basculerPeriode(o, 1);
    expect(o.periodes).toEqual([1, 3]);
    o = { ...o, atteintes: [1, 3] };
    o = basculerPeriode(o, 3);
    expect(o.periodes).toEqual([1]);
    expect(o.atteintes).toEqual([1]);
  });
});

describe("l'enregistrement", () => {
  it("fait l'aller-retour sans rien perdre", () => {
    const p = prog();
    expect(lire(ecrire(p))).toEqual(p);
  });

  it("un enregistrement abîmé rend une programmation vide, pas une erreur", () => {
    expect(lire("pas du json")).toEqual(vide());
    expect(lire("")).toEqual(vide());
    expect(lire("[]")).toEqual(vide());
  });

  it("jette ce qui n'a pas de sens sans perdre le reste", () => {
    const lu = lire(JSON.stringify({
      groupes: [null, { nom: "Sans id", eleveIds: ["e1", 7] }],
      objectifs: [{ competence: "Lire", periodes: [1, 9, "x"], atteintes: [1], pour: ["eleve:e1", 3] }],
    }));
    expect(lu.groupes).toHaveLength(1);
    expect(lu.groupes[0].eleveIds).toEqual(["e1"]);
    expect(lu.groupes[0].id).toBeTruthy();
    expect(lu.objectifs[0].periodes).toEqual([1]);
    expect(lu.objectifs[0].pour).toEqual(["eleve:e1"]);
  });

});

describe("la programmation en tableau", () => {
  const objectif = (id: string, origine: string) => ({ ...nouvelObjectif(), id, competence: id, origine });

  it("lit le domaine et le niveau dans la provenance d'une compétence", () => {
    const o = objectif("a", "Cycle 2 — CP, CE1, CE2 (programmes 2026) › Français › CP");
    expect([domaineDe(o), niveauDe(o)]).toEqual(["Français", "CP"]);
    expect([domaineDe(objectif("b", "PPI")), niveauDe(objectif("b", "PPI"))]).toEqual(["", ""]);
    expect([domaineDe(objectif("c", "BO · Cycle 1 › Langage")), niveauDe(objectif("c", "BO · Cycle 1 › Langage"))]).toEqual(["Langage", ""]);
  });

  it("range par domaine, dans l'ordre d'apparition, les objectifs écrits à la main à la fin", () => {
    const groupes = parDomaine([
      objectif("libre", "PPI"), objectif("f1", "C2 › Français › CP"), objectif("m1", "C2 › Mathématiques › CE1"),
      objectif("f2", "C2 › Français › CE1"), objectif("vide", ""),
    ]);
    expect(groupes.map((g) => [g.domaine, g.objectifs.map((o) => o.id)])).toEqual([
      ["Français", ["f1", "f2"]], ["Mathématiques", ["m1"]], ["", ["libre", "vide"]],
    ]);
  });

  it("une case de période passe de rien à prévue, à atteinte, puis à rien", () => {
    let o = objectif("a", "");
    const etats = [];
    for (let i = 0; i < 3; i++) { o = cyclerPeriode(o, 2); etats.push(etatDePeriode(o, 2)); }
    expect(etats).toEqual(["prevue", "atteinte", ""]);
    expect([o.periodes, o.atteintes]).toEqual([[], []]);
  });
});
