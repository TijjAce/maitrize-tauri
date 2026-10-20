import { describe, expect, it } from "vitest";
import { chercherRaccourcis, raccourcisClavier } from "./raccourcis";

const touches = (mac: boolean) => raccourcisClavier(mac).flatMap((g) => g.raccourcis.flatMap((r) => r.touches));

describe("les raccourcis clavier", () => {
  it("s'écrivent comme sur le clavier de l'ordinateur", () => {
    expect(touches(true)).toContain("⌘K");
    expect(touches(true).some((t) => t.includes("Ctrl"))).toBe(false);
    expect(touches(false)).toContain("Ctrl+K");
    expect(touches(false).some((t) => t.includes("⌘"))).toBe(false);
  });

  it("ne promettent sur Windows que ce qui y répond", () => {
    // Le menu au clavier exige ⌘ : il n'existe que sur Mac.
    expect(touches(true)).toContain("⌘⌥↓");
    expect(touches(false).some((t) => t.includes("↓") && t.includes("Alt"))).toBe(false);
  });

  it("se cherchent par ce qu'ils font, l'endroit ou les touches, sans accents", () => {
    const groupes = raccourcisClavier(true);
    const annuler = chercherRaccourcis(groupes, "annuler");
    expect(annuler.map((g) => g.ou)).toEqual(["Organisation › Progression et Programmation", "CAA › Tableaux de langage"]);
    expect(chercherRaccourcis(groupes, "selection").flatMap((g) => g.raccourcis).length).toBeGreaterThan(1);
    expect(chercherRaccourcis(groupes, "⌘F")[0].raccourcis[0].quoi).toBe("Chercher dans le document");
    expect(chercherRaccourcis(groupes, "")).toBe(groupes);
    expect(chercherRaccourcis(groupes, "introuvable")).toEqual([]);
  });
});
