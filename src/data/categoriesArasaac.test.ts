import { describe, it, expect } from "vitest";
import { CATEGORIES_FR, EXCLUES_PAR_DEFAUT, libelleCategorie } from "./categoriesArasaac";

// Cette table est la seule chose qui sépare l'enseignant d'une liste de 567
// étiquettes anglaises. Une clé mal orthographiée ne casse rien : elle laisse
// simplement l'anglais s'afficher, sans que personne le remarque.

describe("catégories ARASAAC", () => {
  it("traduit les catégories les plus utiles en classe", () => {
    const attendues = [
      "terrestrial animal", "wild animal", "domestic animal", "clothes", "fruit",
      "vegetable", "feeling", "human anatomy", "land transport", "toy", "furniture",
      "beverage", "family", "educational material", "color", "number",
    ];
    for (const c of attendues) {
      expect(CATEGORIES_FR[c], `catégorie « ${c} » sans traduction`).toBeTruthy();
    }
  });

  it("laisse passer une catégorie inconnue sans la masquer", () => {
    // Mieux vaut une étiquette anglaise cherchable qu'une entrée vide.
    expect(libelleCategorie("fiestas del pilar")).toBe("fiestas del pilar");
  });

  it("rend le français quand il existe", () => {
    expect(libelleCategorie("terrestrial animal")).toBe("Animaux terrestres");
  });

  it("écarte les verbes par défaut", () => {
    // ARASAAC range « baisser le pantalon » dans « clothes » : sans cette
    // exclusion, un loto de vêtements mêle objets et actions.
    expect(EXCLUES_PAR_DEFAUT).toContain("verb");
  });

  it("sait nommer ce qu'elle exclut", () => {
    for (const c of EXCLUES_PAR_DEFAUT) {
      expect(CATEGORIES_FR[c], `l'exclusion « ${c} » doit avoir un libellé`).toBeTruthy();
    }
  });

  it("ne traduit jamais deux catégories par le même libellé trompeur", () => {
    // Deux entrées identiques sont acceptables (variantes d'orthographe côté
    // ARASAAC), mais elles doivent rester rares et volontaires.
    const compte = new Map<string, string[]>();
    for (const [en, fr] of Object.entries(CATEGORIES_FR)) {
      compte.set(fr, [...(compte.get(fr) ?? []), en]);
    }
    const doublons = [...compte.entries()].filter(([, l]) => l.length > 1);
    for (const [fr, sources] of doublons) {
      expect(sources.length, `« ${fr} » traduit ${sources.join(", ")}`).toBeLessThanOrEqual(2);
    }
  });

  it("n'a ni clé vide ni libellé vide", () => {
    for (const [en, fr] of Object.entries(CATEGORIES_FR)) {
      expect(en.trim().length).toBeGreaterThan(0);
      expect(fr.trim().length, `« ${en} » a un libellé vide`).toBeGreaterThan(0);
    }
  });

  it("garde les clés en minuscules, comme la banque les fournit", () => {
    for (const en of Object.keys(CATEGORIES_FR)) {
      expect(en, `« ${en} » doit être en minuscules`).toBe(en.toLowerCase());
    }
  });
});
