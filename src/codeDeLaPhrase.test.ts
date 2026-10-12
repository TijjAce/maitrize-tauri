import { describe, it, expect } from "vitest";
import {
  CODE_PAR_DEFAUT, CONSTITUANTS, EXEMPLES_CODE, REGLAGES_CARTE_CODE, actifsPour, cartesParPage, etapeDuCode, exemplesPour, htmlCodeDeLaPhrase,
  lireCode, marquer, phraseAnalysee, phraseSansAnalyse, reglagesCarteSurs, type CodeDeLaPhrase,
} from "./codeDeLaPhrase";
import { htmlGrammaire } from "./grammaire";

const autre: CodeDeLaPhrase = {
  ...CODE_PAR_DEFAUT,
  sujet: { couleur: "violet", marque: "double" },
  verbe: { couleur: "orange", marque: "surligner" },
  complement: { couleur: "rose", marque: "crochets" },
};
const ids = (l: { id: string }[]) => l.map((c) => c.id);

describe("le code de la phrase, du CP à la 6e", () => {
  it("se relit réparé : ce qui manque ou ne se connaît pas reprend le code proposé", () => {
    expect(lireCode(undefined)).toEqual(CODE_PAR_DEFAUT);
    expect(lireCode({ sujet: { couleur: "violet", marque: "double" }, verbe: { couleur: "fuchsia", marque: "clignoter" } })).toEqual({
      ...CODE_PAR_DEFAUT, sujet: { couleur: "violet", marque: "double" },
    });
  });

  it("montre à chaque niveau ce qu'on y apprend : les compléments se précisent au CE2, puis au cycle 3", () => {
    expect(ids(actifsPour("CP", "groupes"))).toEqual(["sujet", "verbe", "complement"]);
    expect(ids(actifsPour("CE2", "groupes"))).toEqual(["sujet", "verbe", "complementVerbe", "complementPhrase"]);
    expect(ids(actifsPour("CM1", "groupes"))).toEqual(["sujet", "verbe", "cod", "coi", "complementPhrase", "attribut", "complementNom"]);
    expect(ids(actifsPour("CP", "classes"))).toEqual(["nom", "determinant"]);
    expect(ids(actifsPour("CE1", "classes"))).toEqual(["nom", "determinant", "adjectif", "pronom"]);
    expect(ids(actifsPour("6e", "classes"))).toContain("conjonctionSubordination");
    expect(ids(actifsPour("CM2", "classes"))).not.toContain("conjonctionSubordination");
    // Deux éléments d'un même niveau ne se confondent pas : couleur ou marque, l'une au moins diffère.
    for (const n of ["CP", "CE1", "CE2", "CM1", "CM2", "6e"] as const) {
      for (const f of ["groupes", "classes"] as const) {
        const codes = actifsPour(n, f).map((c) => `${c.defaut.couleur}/${c.defaut.marque}`);
        expect(new Set(codes).size, `${n} ${f}`).toBe(codes.length);
      }
    }
    expect(CONSTITUANTS.every((c) => /\[[a-zA-Z]+:/.test(c.exemple))).toBe(true);
  });

  it("dit ce qu'il faut faire, pour chaque marque, et la couleur par son nom", () => {
    expect(etapeDuCode(CODE_PAR_DEFAUT, "sujet")).toBe("Souligne le groupe sujet en bleu.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "verbe")).toBe("Entoure le verbe en rouge.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "complement", "le complément")).toBe("Encadre le complément en vert.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "complementPhrase", "les compléments de phrase")).toBe("Mets les compléments de phrase entre crochets, en orange.");
    expect(etapeDuCode(autre, "sujet")).toBe("Souligne deux fois le groupe sujet en violet.");
    expect(etapeDuCode(autre, "verbe")).toBe("Surligne le verbe en orange.");
  });

  it("marque les mots en ligne, et chaque niveau avec ce qu'il connaît", () => {
    expect(marquer(CODE_PAR_DEFAUT, "sujet", "Le chat")).toBe('<span class="cp-sujet" style="border-bottom:2.5px solid #1d4ed8;padding-bottom:1px">Le chat</span>');
    expect(marquer(autre, "complement", "la souris & le fromage")).toBe('<span class="cp-complement"><b style="color:#db2777">[</b>la souris &amp; le fromage<b style="color:#db2777">]</b></span>');
    const p = "[S:Le chat] [V:boit] [COD:son lait] [CP:ce matin].";
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CE1")).toContain('<span class="cp-complement" style="border:2px solid #1f9a48;padding:0 1mm">son lait</span>');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CE2")).toContain('class="cp-complementVerbe"');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CE2")).toContain('class="cp-complementPhrase"');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CM1")).toContain('class="cp-cod"');
    // Ce que le niveau ne connaît pas encore reste sans marque.
    expect(phraseAnalysee("[S:Le chat] [V:semble] [A:content].", CODE_PAR_DEFAUT, "CE1")).toMatch(/> content\.$/);
    expect(phraseSansAnalyse(EXEMPLES_CODE[2].phrase)).toBe("Ce matin, Léa prépare un gâteau.");
    expect(exemplesPour("CE1").length).toBeLessThan(exemplesPour("CM1").length);
  });

  it("imprime sa carte : moins de cartes par page quand le code s'allonge ; les indices et les éléments au choix", () => {
    const compter = (h: string) => (h.match(/class="cp-carte"/g) ?? []).length;
    const groupesCE1 = { ...REGLAGES_CARTE_CODE, familles: ["groupes" as const] };
    expect(cartesParPage(groupesCE1)).toBe(4);
    expect(compter(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, groupesCE1))).toBe(4);
    expect(cartesParPage(REGLAGES_CARTE_CODE)).toBe(2);
    expect(cartesParPage({ ...REGLAGES_CARTE_CODE, niveau: "CM1" })).toBe(1);
    expect(cartesParPage({ ...groupesCE1, format: "bandeau" })).toBe(3);
    expect(cartesParPage({ ...REGLAGES_CARTE_CODE, format: "affiche", niveau: "6e" })).toBe(1);
    const sansVerbe = htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...groupesCE1, caches: ["verbe"], indices: false });
    expect(sansVerbe).not.toContain(">Le verbe<");
    expect(sansVerbe).not.toContain("cp-indice");
    expect(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...REGLAGES_CARTE_CODE, format: "affiche" })).toContain("« C&#39;est… qui »");
    expect(reglagesCarteSurs({ format: "poster" as never, exemple: 9, niveau: "CM9" as never, caches: ["inconnu", "verbe"] }))
      .toEqual({ ...REGLAGES_CARTE_CODE, caches: ["verbe"] });
  });

  it("guide la feuille de grammaire : sa consigne et son corrigé suivent le code, au niveau de la classe", () => {
    const html = htmlGrammaire({ exercice: "constituants", classe: "CE1", temps: "present", verbes: "" }, 4, autre);
    expect(html).toContain("Souligne deux fois le groupe sujet en violet. Surligne le verbe en orange. Mets les compléments entre crochets, en rose.");
    expect(html).toContain("Mets le complément entre crochets, en rose. Puis écris la phrase sans le complément.");
    expect(html).toContain("border-bottom:4.5px double #7c3aed");
    const ce2 = htmlGrammaire({ exercice: "constituants", classe: "CE2", temps: "present", verbes: "" }, 4, CODE_PAR_DEFAUT);
    expect(ce2).toContain("Encadre les compléments du verbe en vert. Mets les compléments de phrase entre crochets, en orange.");
    expect(ce2).toContain('class="cp-complementPhrase"');
  });
});
