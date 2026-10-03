import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({ newId: () => "id" + Math.random().toString(36).slice(2, 8) }));

import {
  CIBLE_MAX, CIBLE_MIN, basculerCible, cyclerPeriode, domaineDe, etatDePeriode, niveauDe, parDomaine, basculerPeriode, comptes, ecrire, elevesConcernes, etatDuCompte, lire, marqueEleve, marqueGroupe, motDuCompte, nouveauGroupe, nouvelObjectif, objectifsDe, objectifsDuCreneau, poserSurCreneau, retirerDuCreneau, retirerGroupe, type ProgrammationIme, vide,
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

describe("supprimer un groupe", () => {
  it("rend ses élèves aux objectifs qui s'appuyaient dessus", () => {
    const suite = retirerGroupe(prog(), "g1");
    expect(suite.groupes).toEqual([]);
    expect(suite.objectifs[0].pour.sort()).toEqual([marqueEleve("e1"), marqueEleve("e2")]);
    expect(elevesConcernes(suite.objectifs[0], suite.groupes).sort()).toEqual(["e1", "e2"]);
  });

  it("ne duplique pas un élève déjà visé en direct", () => {
    const p = prog();
    p.objectifs[0].pour.push(marqueEleve("e1"));
    const suite = retirerGroupe(p, "g1");
    expect(suite.objectifs[0].pour.filter((x) => x === marqueEleve("e1"))).toHaveLength(1);
  });

  it("un groupe inconnu ne change rien", () => {
    const p = prog();
    expect(retirerGroupe(p, "zzz")).toBe(p);
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

  it("un groupe se crée avec un nom par défaut plutôt que vide", () => {
    expect(nouveauGroupe("  ").nom).toBe("Groupe");
    expect(nouveauGroupe("Langage", ["e1"]).eleveIds).toEqual(["e1"]);
  });
});

describe("programmer par créneau", () => {
  // Deux créneaux de la semaine type, avec leurs élèves — c'est le créneau
  // qui fait le groupe, comme dans l'emploi du temps réel.
  const élèvesPar = { lundi14: ["e1", "e2"], jeudi10: ["e2", "e5"] };
  const base = (): ProgrammationIme => ({ groupes: [], objectifs: [] });

  it("pose une compétence sur un créneau et l'attribue à ses élèves", () => {
    const p = poserSurCreneau(base(), "lundi14", élèvesPar.lundi14, "Lire un mot outil", "Cycle 2 › Lecture");
    expect(p.objectifs).toHaveLength(1);
    const o = p.objectifs[0];
    expect(o.competence).toBe("Lire un mot outil");
    expect(o.creneaux).toEqual(["lundi14"]);
    expect(o.pour.sort()).toEqual([marqueEleve("e1"), marqueEleve("e2")].sort());
    expect(objectifsDuCreneau(p, "lundi14")).toHaveLength(1);
    expect(objectifsDuCreneau(p, "jeudi10")).toHaveLength(0);
  });

  it("ne la pose pas deux fois sur le même créneau", () => {
    let p = poserSurCreneau(base(), "lundi14", élèvesPar.lundi14, "Lire un mot outil", "Cycle 2 › Lecture");
    p = poserSurCreneau(p, "lundi14", élèvesPar.lundi14, "  lire un mot outil ", "cycle 2 › Lecture");
    expect(p.objectifs).toHaveLength(1);
    expect(p.objectifs[0].creneaux).toEqual(["lundi14"]);
  });

  it("étend un objectif déjà posé plutôt que d'en créer un second", () => {
    let p = poserSurCreneau(base(), "lundi14", élèvesPar.lundi14, "Lire un mot outil", "Cycle 2 › Lecture");
    p = poserSurCreneau(p, "jeudi10", élèvesPar.jeudi10, "Lire un mot outil", "Cycle 2 › Lecture");
    expect(p.objectifs).toHaveLength(1);
    expect(p.objectifs[0].creneaux).toEqual(["lundi14", "jeudi10"]);
    // e5 vient du jeudi, e1 du lundi, e2 des deux : chacun compté une fois.
    expect(p.objectifs[0].pour.sort()).toEqual(
      [marqueEleve("e1"), marqueEleve("e2"), marqueEleve("e5")].sort());
    // Et le compte par élève ne la voit qu'une fois.
    expect(comptes(p, ["e1", "e2", "e5"])).toEqual({ e1: 1, e2: 1, e5: 1 });
  });

  it("en la retirant d'un créneau, garde les élèves qui la travaillent ailleurs", () => {
    let p = poserSurCreneau(base(), "lundi14", élèvesPar.lundi14, "Lire un mot outil", "Cycle 2 › Lecture");
    p = poserSurCreneau(p, "jeudi10", élèvesPar.jeudi10, "Lire un mot outil", "Cycle 2 › Lecture");
    p = retirerDuCreneau(p, "lundi14", "Lire un mot outil", "Cycle 2 › Lecture", élèvesPar);
    expect(p.objectifs).toHaveLength(1);
    expect(p.objectifs[0].creneaux).toEqual(["jeudi10"]);
    // e1 ne la travaillait que le lundi : il la perd. e2 reste, il est aussi
    // du jeudi. e5 reste.
    expect(p.objectifs[0].pour.sort()).toEqual([marqueEleve("e2"), marqueEleve("e5")].sort());
  });

  it("efface l'objectif qui ne sert plus nulle part", () => {
    let p = poserSurCreneau(base(), "lundi14", élèvesPar.lundi14, "Lire un mot outil", "Cycle 2 › Lecture");
    p = retirerDuCreneau(p, "lundi14", "Lire un mot outil", "Cycle 2 › Lecture", élèvesPar);
    expect(p.objectifs).toHaveLength(0);
  });

  it("laisse intact un objectif posé à la main, sans créneau", () => {
    const p = retirerDuCreneau(prog(), "lundi14", "Demander de l'aide", "PPI", élèvesPar);
    expect(p.objectifs).toHaveLength(2);
    expect(p.objectifs[0].pour).toEqual([marqueGroupe("g1")]);
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
