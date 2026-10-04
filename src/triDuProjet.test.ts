import { describe, it, expect } from "vitest";
import { hasard } from "./hasard";
import { estUnModele, phraseDefaite, trisDuProjet } from "./triDuProjet";
import { MODELES_TRI, etiquettesSaisies } from "./triEtiquettes";

const halloween = {
  mots: ["chat", "balai", "citrouille", "fantôme", "sorcière", "lune", "araignée", "chaudron"],
  phrases: ["La sorcière a un balai.", "Nous coupons la citrouille.", "Le fantôme fait peur !"],
};

describe("les maisons du tri, avec les mots du projet", () => {
  it("range les mots par syllabes entendues, et les phrases avec leurs versions défaites", () => {
    const [syllabes, phrase] = trisDuProjet(halloween, "Halloween");
    expect(syllabes.nom).toBe("📌 Halloween — combien de syllabes ?");
    expect(syllabes.reglages.categories.map((c) => [c.titre, etiquettesSaisies(c.etiquettes)])).toEqual([
      // Les syllabes qu'on entend, comme les compte syllabes.ts : ci-trouille, a-rai-gnée.
      ["1 syllabe", ["chat", "lune"]],
      ["2 syllabes", ["balai", "citrouille", "fantôme", "chaudron"]],
      ["3 syllabes ou plus", ["sorcière", "araignée"]],
    ]);
    expect(phrase.reglages.categories[0].etiquettes).toBe(halloween.phrases.join("\n"));
    const defaites = etiquettesSaisies(phrase.reglages.categories[1].etiquettes);
    expect(defaites).toHaveLength(3);
    for (const d of defaites) {
      expect(d).not.toMatch(/[.!?]$/);
      expect(d.charAt(0)).toBe(d.charAt(0).toLocaleLowerCase("fr"));
    }
  });

  it("le même corpus redonne le même tri : un tri qu'on n'a pas retouché se reconnaît", () => {
    const a = trisDuProjet(halloween, "Halloween");
    const b = trisDuProjet(halloween, "");
    expect(estUnModele(a[1].reglages.categories, b)).toBe(true);
    expect(estUnModele(MODELES_TRI[0].reglages.categories, MODELES_TRI)).toBe(true);
    const retouche = [{ ...a[0].reglages.categories[0], etiquettes: "chat\nlune\nnuit" }, ...a[0].reglages.categories.slice(1)];
    expect(estUnModele(retouche, [...MODELES_TRI, ...b])).toBe(false);
  });

  it("rien quand le projet n'a pas de quoi trier", () => {
    expect(trisDuProjet({ mots: ["chat", "lune"], phrases: ["Une seule phrase."] }, "Petit")).toEqual([]);
    // Tous les mots dans la même maison : il n'y a rien à trier.
    expect(trisDuProjet({ mots: ["chat", "lune", "nuit", "loup"], phrases: [] }, "Nuit")).toEqual([]);
  });

  it("une phrase défaite n'est plus une phrase : autre ordre, ni majuscule ni point", () => {
    const d = phraseDefaite("Nous coupons la citrouille.", hasard(3));
    expect(d.split(" ").sort()).toEqual(["citrouille", "coupons", "la", "nous"]);
    expect(d).not.toBe("nous coupons la citrouille");
  });
});
