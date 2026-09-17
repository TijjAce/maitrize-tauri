import { describe, it, expect } from "vitest";
import { alerteDeLEssai, essaiNecessaire } from "./verifSauvegarde";
import type { VerifSauvegarde } from "./api";

const essai = (p: Partial<VerifSauvegarde> = {}): VerifSauvegarde => ({
  cle: "maitrize/sauvegarde-2026-09-16-073102.enc", sauvegarde: "2026-09-16-073102",
  essai: "2026-09-17T08:00:00Z", octets: 1200, lisible: true, lignes: [["eleves", 84]],
  fichiers: 3, alertes: [], message: "Relue sans erreur : 84 lignes.", ...p,
});

describe("essai de restauration", () => {
  it("refait un essai au bout d'un mois, jamais avant", () => {
    const maintenant = new Date("2026-09-17T08:00:00Z");
    expect(essaiNecessaire("", maintenant)).toBe(true);
    expect(essaiNecessaire("pas une date", maintenant)).toBe(true);
    expect(essaiNecessaire("2026-09-10T08:00:00Z", maintenant)).toBe(false);
    expect(essaiNecessaire("2026-08-10T08:00:00Z", maintenant)).toBe(true);
  });

  it("ne dit rien quand tout va bien, et parle quand ça ne va pas", () => {
    expect(alerteDeLEssai(essai())).toBe("");
    expect(alerteDeLEssai(essai({ lisible: false, message: "La phrase secrète ne correspond pas." })))
      .toContain("2026-09-16");
    expect(alerteDeLEssai(essai({ alertes: ["Aucun(e) élèves dans la sauvegarde."] })))
      .toContain("Aucun(e) élèves");
  });
});
