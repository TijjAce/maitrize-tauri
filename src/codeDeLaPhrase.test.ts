import { describe, it, expect } from "vitest";
import {
  CODE_PAR_DEFAUT, EXEMPLES_CODE, REGLAGES_CARTE_CODE, etapeDuCode, htmlCodeDeLaPhrase, lireCode, marquer, phraseAnalysee, phraseSansAnalyse,
  reglagesCarteSurs, type CodeDeLaPhrase,
} from "./codeDeLaPhrase";
import { htmlGrammaire } from "./grammaire";

const autre: CodeDeLaPhrase = {
  sujet: { couleur: "violet", marque: "double" },
  verbe: { couleur: "orange", marque: "surligner" },
  complement: { couleur: "rose", marque: "crochets" },
};

describe("le code de la phrase", () => {
  it("se relit réparé : ce qui manque ou ne se connaît pas reprend le code proposé", () => {
    expect(lireCode(undefined)).toEqual(CODE_PAR_DEFAUT);
    expect(lireCode({ sujet: { couleur: "violet", marque: "double" }, verbe: { couleur: "fuchsia", marque: "clignoter" } })).toEqual({
      ...CODE_PAR_DEFAUT, sujet: { couleur: "violet", marque: "double" },
    });
  });

  it("dit ce qu'il faut faire, pour chaque marque, et la couleur par son nom", () => {
    expect(etapeDuCode(CODE_PAR_DEFAUT, "sujet")).toBe("Souligne le groupe sujet en bleu.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "verbe")).toBe("Entoure le verbe en rouge.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "complement", "le complément")).toBe("Encadre le complément en vert.");
    expect(etapeDuCode(autre, "sujet")).toBe("Souligne deux fois le groupe sujet en violet.");
    expect(etapeDuCode(autre, "verbe")).toBe("Surligne le verbe en orange.");
    expect(etapeDuCode(autre, "complement")).toBe("Mets les compléments entre crochets, en rose.");
  });

  it("marque les mots en ligne : la marque et la couleur, sans feuille de style à transmettre", () => {
    expect(marquer(CODE_PAR_DEFAUT, "sujet", "Le chat")).toBe('<span class="cp-sujet" style="border-bottom:2.5px solid #1d4ed8;padding-bottom:1px">Le chat</span>');
    expect(marquer(autre, "complement", "la souris & le fromage")).toBe('<span class="cp-complement"><b style="color:#db2777">[</b>la souris &amp; le fromage<b style="color:#db2777">]</b></span>');
    expect(phraseAnalysee("[S:Le chat] [V:boit] [C:son lait].", CODE_PAR_DEFAUT)).toMatch(/^<span class="cp-sujet"[^>]*>Le chat<\/span> <span class="cp-verbe"[^>]*>boit<\/span> <span class="cp-complement"[^>]*>son lait<\/span>\.$/);
    expect(phraseSansAnalyse(EXEMPLES_CODE[2])).toBe("Ce matin, Léa prépare un gâteau.");
  });

  it("imprime sa carte : quatre par page, trois bandeaux, ou une affiche ; les indices au choix", () => {
    const compter = (h: string) => (h.match(/class="cp-carte"/g) ?? []).length;
    expect(compter(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, REGLAGES_CARTE_CODE))).toBe(4);
    expect(compter(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...REGLAGES_CARTE_CODE, format: "bandeau" }))).toBe(3);
    const affiche = htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...REGLAGES_CARTE_CODE, format: "affiche" });
    expect(compter(affiche)).toBe(1);
    expect(affiche).toContain("« C&#39;est… qui »");
    expect(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...REGLAGES_CARTE_CODE, indices: false })).not.toContain("cp-indice");
    expect(reglagesCarteSurs({ format: "poster" as never, exemple: 9 })).toEqual(REGLAGES_CARTE_CODE);
  });

  it("guide la feuille de grammaire : sa consigne et son corrigé suivent le code de la classe", () => {
    const html = htmlGrammaire({ exercice: "constituants", classe: "CE1", temps: "present", verbes: "" }, 4, autre);
    expect(html).toContain("Souligne deux fois le groupe sujet en violet. Surligne le verbe en orange. Mets les compléments entre crochets, en rose.");
    expect(html).toContain("Mets le complément entre crochets, en rose. Puis écris la phrase sans le complément.");
    expect(html).toContain('<b style="color:#db2777">[</b>');
    expect(html).toContain("border-bottom:4.5px double #7c3aed");
  });
});
