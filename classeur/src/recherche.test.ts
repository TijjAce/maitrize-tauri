import { describe, expect, it } from "vitest";
import index from "./donnees/arasaac-fr.json";
import { chercherDans, plier, type EntreeIndex } from "./recherche";

const INDEX = index as unknown as EntreeIndex[];

describe("chercher un picto sur l'appareil, dans l'index embarqué d'ARASAAC", () => {
  it("embarque l'index entier, ceux qu'ARASAAC marque « sexe » ou « violence » compris (demande de l'enseignant)", () => {
    expect(INDEX.length).toBeGreaterThan(13650);
    // « Parfois il faut pouvoir interdire à l'enfant d'avoir des comportements violents » : ces mots-là se trouvent.
    for (const mot of ["frapper", "mordre", "pousser"]) expect(chercherDans(INDEX, mot).length, mot).toBeGreaterThan(0);
    for (const [id, mots, nature] of INDEX.slice(0, 50)) {
      expect(Number.isInteger(id)).toBe(true);
      expect(mots.length).toBeGreaterThan(0);
      expect(nature).toBeGreaterThanOrEqual(1);
    }
  });

  it("trouve le mot exact d'abord, sans tenir compte des accents ni des majuscules", () => {
    expect(plier("  Été  à l’École ")).toBe("ete a l'ecole");
    for (const mot of ["manger", "boire", "vouloir", "toilettes", "maison"]) {
      const r = chercherDans(INDEX, mot);
      expect(r.length, mot).toBeGreaterThan(0);
      expect(plier(r[0].mot), mot).toBe(plier(mot));
    }
    expect(plier(chercherDans(INDEX, "ECOLE")[0].mot)).toBe("ecole");
  });

  it("donne la nature du mot, pour la couleur de la case : un verbe pour « manger »", () => {
    expect(chercherDans(INDEX, "manger")[0].nature).toBe(3);
  });

  it("ne rend rien pour rien, et quarante pictos au plus", () => {
    expect(chercherDans(INDEX, "  ")).toEqual([]);
    expect(chercherDans(INDEX, "a").length).toBeLessThanOrEqual(40);
    expect(chercherDans(INDEX, "zzqqxx")).toEqual([]);
  });
});
