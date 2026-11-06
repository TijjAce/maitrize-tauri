import { describe, expect, it } from "vitest";
import { RESSOURCES_DE_LA_FORGE, RUBRIQUES, chercherDansLaForge } from "./ressourcesDeLaForge";

describe("la liste de la Forge", () => {
  it("ne mène qu'à des sites de la Forge, en https", () => {
    for (const r of RESSOURCES_DE_LA_FORGE) {
      const u = new URL(r.url);
      expect(u.protocol).toBe("https:");
      expect(u.hostname.endsWith(".forge.apps.education.fr"), r.url).toBe(true);
    }
  });

  it("n'a ni doublon ni phrase longue, et aucun HTML", () => {
    expect(new Set(RESSOURCES_DE_LA_FORGE.map((r) => r.id)).size).toBe(RESSOURCES_DE_LA_FORGE.length);
    expect(new Set(RESSOURCES_DE_LA_FORGE.map((r) => r.url)).size).toBe(RESSOURCES_DE_LA_FORGE.length);
    for (const r of RESSOURCES_DE_LA_FORGE) {
      expect(r.quoi.length, r.nom).toBeLessThanOrEqual(70);
      expect(`${r.nom} ${r.quoi}`, r.nom).not.toMatch(/[<>]/);
    }
  });

  it("range chaque site dans une rubrique, avec au moins un niveau", () => {
    const sortes = RUBRIQUES.map((x) => x.sorte);
    for (const r of RESSOURCES_DE_LA_FORGE) {
      expect(sortes).toContain(r.sorte);
      expect(r.niveaux.length, r.nom).toBeGreaterThan(0);
    }
    expect(RESSOURCES_DE_LA_FORGE.filter((r) => r.sorte === "feuilles").length).toBeGreaterThan(10);
    expect(RESSOURCES_DE_LA_FORGE.filter((r) => r.sorte === "tableau").length).toBeGreaterThan(10);
  });

  it("se cherche sans les accents, par le nom, la phrase, le domaine ou le niveau", () => {
    expect(chercherDansLaForge("mathematickets").map((r) => r.nom)).toEqual(["Mathématickets"]);
    expect(chercherDansLaForge("francais").length).toBeGreaterThan(5);
    expect(chercherDansLaForge("maternelle").every((r) => r.niveaux.includes("Maternelle"))).toBe(true);
    expect(chercherDansLaForge("minuteur", ["feuilles"])).toEqual([]);
    expect(chercherDansLaForge("minuteur", ["tableau"]).length).toBeGreaterThan(0);
    expect(chercherDansLaForge("").length).toBe(RESSOURCES_DE_LA_FORGE.length);
  });

  it("ne charge jamais une page de la Forge dans l'application", () => {
    const composant = Object.values(import.meta.glob("./components/LaForge.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>)[0];
    expect(composant).toContain("openUrl");
    expect(composant).not.toMatch(/iframe|dangerouslySetInnerHTML|fetch\(|<webview/i);
  });
});
