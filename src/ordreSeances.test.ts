import { describe, it, expect } from "vitest";
import { decalee, deplacee, numerotationAbimee, ordonnees, renumerotees } from "./ordreSeances";

const s = (id: string, numero: number, titre = "") => ({ id, numero, titre });
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe("l'ordre d'affichage", () => {
  it("range par numéro", () => {
    expect(ids(ordonnees([s("c", 3), s("a", 1), s("b", 2)]))).toEqual(["a", "b", "c"]);
  });

  it("à numéro égal, garde l'ordre reçu plutôt que d'en inventer un", () => {
    // Deux séances numéro 1 après un import : la liste ne doit pas danser.
    expect(ids(ordonnees([s("a", 1), s("b", 1), s("c", 1)]))).toEqual(["a", "b", "c"]);
  });
});

describe("déplacer une séance", () => {
  const liste = [s("a", 1), s("b", 2), s("c", 3), s("d", 4)];

  it("la pose à la place visée, en décalant les autres", () => {
    // Glisser « d » sur « b » : d prend la place de b, b et c descendent.
    expect(ids(deplacee(liste, "d", "b"))).toEqual(["a", "d", "b", "c"]);
  });

  it("vers le bas aussi", () => {
    expect(ids(deplacee(liste, "a", "c"))).toEqual(["b", "c", "a", "d"]);
  });

  it("déplace, et n'échange pas", () => {
    // L'ancien comportement troquait deux numéros : « a » et « c » auraient
    // permuté en laissant « b » où il était.
    expect(ids(deplacee(liste, "a", "c"))).not.toEqual(["c", "b", "a", "d"]);
  });

  it("une séance posée sur elle-même, ou inconnue, ne bouge rien", () => {
    expect(ids(deplacee(liste, "a", "a"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(deplacee(liste, "zzz", "b"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(deplacee(liste, "a", "zzz"))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("monter et descendre d'un cran", () => {
  const liste = [s("a", 1), s("b", 2), s("c", 3)];

  it("monte", () => { expect(ids(decalee(liste, "b", -1))).toEqual(["b", "a", "c"]); });
  it("descend", () => { expect(ids(decalee(liste, "b", 1))).toEqual(["a", "c", "b"]); });

  it("ne sort pas de la liste", () => {
    expect(ids(decalee(liste, "a", -1))).toEqual(["a", "b", "c"]);
    expect(ids(decalee(liste, "c", 1))).toEqual(["a", "b", "c"]);
  });
});

describe("renuméroter", () => {
  it("rend 1, 2, 3… et seulement ce qui change", () => {
    const rangees = [s("b", 2), s("a", 1), s("c", 3)];
    const ecrire = renumerotees(rangees);
    // « c » est déjà troisième : inutile de le réécrire.
    expect(ecrire.map((x) => [x.id, x.numero])).toEqual([["b", 1], ["a", 2]]);
  });

  it("ne réécrit rien quand l'ordre est déjà juste", () => {
    expect(renumerotees([s("a", 1), s("b", 2)])).toEqual([]);
  });

  it("répare les doublons et les trous", () => {
    const ecrire = renumerotees(ordonnees([s("a", 1), s("b", 1), s("c", 5)]));
    expect(ecrire.map((x) => x.numero)).toEqual([2, 3]);
  });

  it("garde tout le reste de la séance intact", () => {
    const [premier] = renumerotees([s("b", 7, "Le cerveau")]);
    expect(premier).toEqual({ id: "b", numero: 1, titre: "Le cerveau" });
  });
});

describe("repérer une numérotation abîmée", () => {
  it("dit vrai sur des doublons ou des trous", () => {
    expect(numerotationAbimee([s("a", 1), s("b", 1)])).toBe(true);
    expect(numerotationAbimee([s("a", 1), s("b", 5)])).toBe(true);
  });

  it("dit faux sur une liste saine, même mal triée à l'entrée", () => {
    expect(numerotationAbimee([s("b", 2), s("a", 1)])).toBe(false);
    expect(numerotationAbimee([])).toBe(false);
  });
});
