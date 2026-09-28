import { describe, it, expect } from "vitest";
import { REGLAGES_PHRASES, etiquettesDePhrase, htmlPhrasesEnDesordre, phrasesEnDesordre, phrasesSaisies } from "./phrasesEnDesordre";

describe("les phrases en désordre", () => {
  it("découpent la phrase en étiquettes, la ponctuation avec le mot ou seule", () => {
    expect(etiquettesDePhrase("Le chat dort sur le canapé.")).toEqual(["Le", "chat", "dort", "sur", "le", "canapé."]);
    expect(etiquettesDePhrase("Où est mon cartable ?")).toEqual(["Où", "est", "mon", "cartable", "?"]);
    expect(phrasesSaisies("  Une phrase.\n\n  Deux.  \n")).toEqual(["Une phrase.", "Deux."]);
  });

  it("mélangent sans jamais laisser l'ordre, et se rejouent", () => {
    const phrases = phrasesSaisies(REGLAGES_PHRASES.phrases);
    const liste = phrasesEnDesordre(phrases, 4);
    expect(liste).toHaveLength(4);
    for (const p of liste) {
      expect([...p.etiquettes].sort()).toEqual([...etiquettesDePhrase(p.phrase)].sort());
      expect(p.etiquettes.join(" ")).not.toBe(p.phrase);
    }
    expect(phrasesEnDesordre(phrases, 4)).toEqual(liste);
    // Deux mots identiques : aucun ordre n'est différent, on n'insiste pas.
    expect(phrasesEnDesordre(["oui oui"], 1)[0].etiquettes).toEqual(["oui", "oui"]);
  });

  it("s'impriment six par page, avec la ligne pour coller et le corrigé", () => {
    const liste = phrasesEnDesordre(phrasesSaisies(REGLAGES_PHRASES.phrases), 4);
    const html = htmlPhrasesEnDesordre(liste, REGLAGES_PHRASES);
    expect((html.match(/class="pe-etiquette"/g) ?? []).length).toBe(6 + 6 + 7 + 5);
    expect((html.match(/class="pe-ligne"/g) ?? []).length).toBe(4);
    expect(html).toContain("<li>Le chat dort sur le canapé.</li>");
    const sans = htmlPhrasesEnDesordre(liste, { ...REGLAGES_PHRASES, lignes: false, capitales: true });
    expect(sans).not.toContain("pe-ligne");
    expect(sans).toContain("<li>LE CHAT DORT SUR LE CANAPÉ.</li>");
    expect(sans).toContain('<span class="pe-etiquette">CANAPÉ.</span>');
  });
});
