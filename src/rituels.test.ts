import { describe, it, expect } from "vitest";
import { avecRituels, ecrireRituels, ligneDeRituel, lireRituels, nouveauRituel, rituelsCites, rituelsImprimes, trierRituels } from "./rituels";

const date = { id: "r1", titre: "La date", deroulement: "Pointage du jour : Aurélien, Louison.\nÉcrire la date : Ethan, Jean.", duree: 10 };
const appel = { id: "r2", titre: "L'appel", deroulement: "", duree: 0 };
const rituels = [date, appel];

describe("les rituels", () => {
  it("se relisent sans faire confiance à ce qui est enregistré", () => {
    expect(lireRituels(null)).toEqual([]);
    expect(lireRituels("{pas une liste")).toEqual([]);
    expect(lireRituels('[{"id":"a"},{"titre":"sans id"},{"id":"b","titre":"  "},{"id":"c","titre":"Météo","duree":"5.6"}]'))
      .toEqual([{ id: "c", titre: "Météo", deroulement: "", duree: 6 }]);
    expect(lireRituels(ecrireRituels(rituels))).toEqual(rituels);
    const neuf = nouveauRituel("Calcul mental");
    expect(neuf.titre).toBe("Calcul mental");
    expect(neuf.id).toHaveLength(36);
  });

  it("se posent dans le prévu sous une ligne « 🔁 titre » et s'y retrouvent", () => {
    expect(ligneDeRituel(date)).toBe("🔁 La date");
    const prevu = "🔁 La date\nLecture offerte\n  🔁  l'appel \n🔁 La date\n🔁 Inconnu";
    expect(rituelsCites(prevu, rituels).map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(rituelsCites("La date sans la marque", rituels)).toEqual([]);
    expect(rituelsCites("", rituels)).toEqual([]);
  });

  it("s'impriment sous le prévu avec leur déroulement, et se rangent par titre", () => {
    const html = rituelsImprimes([date, appel]);
    expect(html).toContain('<div class="sequence-citee-titre">🔁 La date<span class="sequence-citee-infos"> · 10 min</span></div>');
    expect(html).toContain('<div class="sequence-citee-texte">Pointage du jour : Aurélien, Louison.\nÉcrire la date : Ethan, Jean.</div>');
    // Sans déroulement ni durée : le titre seul.
    expect(html).toContain('<div class="sequence-citee rituel-cite"><div class="sequence-citee-titre">🔁 L&#39;appel</div></div>');
    expect(rituelsImprimes([])).toBe("");
    expect(trierRituels([date, appel]).map((r) => r.titre)).toEqual(["L'appel", "La date"]);
  });

  it("suivent le prévu sur le PDF de la semaine, en texte", () => {
    expect(avecRituels("🔁 La date\nLecture", rituels)).toBe("🔁 La date\nLecture\nLa date : Pointage du jour : Aurélien, Louison.\nÉcrire la date : Ethan, Jean.");
    expect(avecRituels("🔁 L'appel", rituels)).toBe("🔁 L'appel");
    expect(avecRituels("Rien", rituels)).toBe("Rien");
  });
});
