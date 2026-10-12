import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { PHOTOS_MATERIEL, creditMateriel, photoDuMateriel } from "./photosMateriel";
import { MATERIEL_REEL } from "./materielDeClasse";

describe("les photographies du matériel de la classe", () => {
  it("ont chacune leur fichier, un matériel connu, une licence libre et leur page d'origine", () => {
    const connus = new Set(MATERIEL_REEL.map((m) => m.id));
    expect(PHOTOS_MATERIEL.length).toBeGreaterThan(20);
    for (const p of PHOTOS_MATERIEL) {
      expect(connus.has(p.id), p.id).toBe(true);
      expect(existsSync(`src/assets/materiel/${p.id}.jpg`), p.id).toBe(true);
      expect(p.licence, p.id).toMatch(/^(CC0|CC BY(-SA)? [\d.]+( [A-Z]{2})?|Public domain)$/);
      expect(p.page, p.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(photoDuMateriel(p.id)?.adresse, p.id).toBeTruthy();
    }
    expect(new Set(PHOTOS_MATERIEL.map((p) => p.id)).size).toBe(PHOTOS_MATERIEL.length);
    expect(photoDuMateriel("monnaie")).toBeNull();
  });

  it("disent leur auteur et leur licence, comme la licence le demande", () => {
    expect(creditMateriel(PHOTOS_MATERIEL.find((p) => p.id === "regles")!)).toBe("Photo : Estabiano, domaine public, Wikimedia Commons.");
    expect(creditMateriel(PHOTOS_MATERIEL.find((p) => p.id === "balance")!)).toBe("Photo : Nikodem Nijaki, licence CC BY-SA 3.0, Wikimedia Commons.");
  });
});
