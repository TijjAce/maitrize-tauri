import { describe, it, expect } from "vitest";
import {
  CODE_PAR_DEFAUT, CONSTITUANTS, EXEMPLES_CODE, NIVEAUX_CODE, REGLAGES_CARTE_CODE, actifsPour, cartesParPage, etapeDuCode, exemplesPour,
  htmlCodeDeLaPhrase, lireCode, marquer, phraseAnalysee, phraseSansAnalyse, reglagesCarteSurs, type CodeDeLaPhrase,
} from "./codeDeLaPhrase";
import { htmlGrammaire } from "./grammaire";

const autre: CodeDeLaPhrase = {
  ...CODE_PAR_DEFAUT,
  sujet: { couleur: "violet", marque: "double" },
  verbe: { couleur: "orange", marque: "surligner" },
  complement: { couleur: "rose", marque: "crochets" },
};
const ids = (l: { id: string }[]) => l.map((c) => c.id);

describe("le code de la phrase, d'après les programmes du CP à la 6e", () => {
  it("se relit réparé : ce qui manque ou ne se connaît pas reprend le code proposé", () => {
    expect(lireCode(undefined)).toEqual(CODE_PAR_DEFAUT);
    expect(lireCode({ sujet: { couleur: "violet", marque: "double" }, verbe: { couleur: "fuchsia", marque: "clignoter" } })).toEqual({
      ...CODE_PAR_DEFAUT, sujet: { couleur: "violet", marque: "double" },
    });
  });

  it("montre à chaque niveau ce que le programme y fait apprendre, sous le nom qu'il lui donne", () => {
    expect(ids(actifsPour("CP", "groupes"))).toEqual(["sujet", "verbe"]);
    expect(actifsPour("CP", "groupes")[0].libelle).toBe("Le sujet");
    expect(actifsPour("CE1", "groupes")[0].libelle).toBe("Le groupe sujet");
    // Au cycle 2, des compléments qu'on ne distingue pas encore.
    expect(ids(actifsPour("CE2", "groupes"))).toEqual(["sujet", "verbe", "complement", "gn"]);
    expect(ids(actifsPour("CM1", "groupes"))).toEqual(["sujet", "verbe", "gn", "cod", "coi", "cc", "epithete"]);
    expect(ids(actifsPour("CM2", "groupes"))).toEqual(["sujet", "verbe", "gn", "cod", "coi", "cc", "epithete", "attribut", "complementNom"]);
    expect(ids(actifsPour("CP", "classes"))).toEqual(["nom", "determinant", "adjectif", "pronom"]);
    expect(ids(actifsPour("CE2", "classes"))).toContain("adverbe");
    expect(ids(actifsPour("CE1", "classes"))).not.toContain("adverbe");
    expect(ids(actifsPour("CM1", "classes"))).toContain("conjonctionCoordination");
    expect(ids(actifsPour("CM2", "classes"))).toEqual(expect.arrayContaining(["preposition", "conjonctionSubordination"]));
    expect(CONSTITUANTS.map((c) => c.id)).not.toEqual(expect.arrayContaining(["complementPhrase"]));
    expect(CONSTITUANTS.every((c) => /\[[a-zA-Z]+:/.test(c.exemple) && c.abrev)).toBe(true);
  });

  it("se lit en noir et blanc : dans une famille, à chaque niveau, chaque élément a sa marque propre", () => {
    for (const n of NIVEAUX_CODE) {
      for (const f of ["groupes", "classes"] as const) {
        const formes = actifsPour(n, f).map((c) => (c.defaut.marque === "etiquette" ? `étiquette ${c.abrev}` : c.defaut.marque));
        expect(new Set(formes).size, `${n} ${f} : ${formes.join(", ")}`).toBe(formes.length);
      }
    }
  });

  it("dit ce qu'il faut faire, pour chaque marque, et la couleur par son nom", () => {
    expect(etapeDuCode(CODE_PAR_DEFAUT, "sujet")).toBe("Souligne le groupe sujet en bleu.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "verbe")).toBe("Entoure le verbe en rouge.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "complement", "le complément")).toBe("Encadre le complément en vert.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "cc")).toBe("Souligne le complément circonstanciel d'un trait ondulé, en orange.");
    expect(etapeDuCode(CODE_PAR_DEFAUT, "nom")).toBe("Écris « N » sous les noms, en bleu.");
    expect(etapeDuCode(autre, "sujet")).toBe("Souligne deux fois le groupe sujet en violet.");
    expect(etapeDuCode(autre, "verbe")).toBe("Surligne le verbe en orange.");
  });

  it("marque les mots en ligne, et chaque niveau avec ce qu'il connaît", () => {
    expect(marquer(CODE_PAR_DEFAUT, "sujet", "Le chat")).toBe('<span class="cp-sujet" style="border-bottom:2.5px solid #1d4ed8;padding-bottom:1px">Le chat</span>');
    expect(marquer(autre, "complement", "la souris & le fromage")).toBe('<span class="cp-complement"><b style="color:#db2777">[</b>la souris &amp; le fromage<b style="color:#db2777">]</b></span>');
    expect(marquer(CODE_PAR_DEFAUT, "determinant", "le")).toMatch(/^<span class="cp-determinant"[^>]*>le<span [^>]*color:#1f9a48">Dét<\/span><\/span>$/);
    const p = "[S:Le chat] [V:boit] [COD:son lait] [CC:ce matin].";
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CE1")).toContain('<span class="cp-complement" style="border:2px solid #1f9a48;padding:0 1mm">son lait</span>');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CE2")).toContain('<span class="cp-complement" style="border:2px solid #1f9a48;padding:0 1mm">ce matin</span>');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CM1")).toContain('class="cp-cod"');
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CM1")).toContain('class="cp-cc"');
    // Ce que le niveau ne connaît pas encore reste sans marque : au CP, pas de compléments.
    expect(phraseAnalysee(p, CODE_PAR_DEFAUT, "CP")).toMatch(/> son lait ce matin\.$/);
    expect(phraseSansAnalyse(EXEMPLES_CODE[2].phrase)).toBe("Ce matin, Léa prépare un gâteau.");
    expect(exemplesPour("CE1").length).toBeLessThan(exemplesPour("CM2").length);
  });

  it("imprime sa carte : moins de cartes par page quand le code s'allonge ; les indices et les éléments au choix", () => {
    const compter = (h: string) => (h.match(/class="cp-carte"/g) ?? []).length;
    const groupesCP = { ...REGLAGES_CARTE_CODE, niveau: "CP" as const, familles: ["groupes" as const] };
    expect(cartesParPage(groupesCP)).toBe(4);
    expect(compter(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, groupesCP))).toBe(4);
    expect(cartesParPage({ ...groupesCP, niveau: "CE1" })).toBe(2);
    expect(cartesParPage({ ...REGLAGES_CARTE_CODE, niveau: "CM1" })).toBe(1);
    expect(cartesParPage({ ...groupesCP, format: "bandeau" })).toBe(3);
    // Une longue affiche : chaque famille sur sa page.
    expect(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...REGLAGES_CARTE_CODE, format: "affiche", niveau: "6e" }).split('class="page"').length - 1).toBe(2);
    const sansVerbe = htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...groupesCP, caches: ["verbe"], indices: false });
    expect(sansVerbe).not.toContain(">Le verbe<");
    expect(sansVerbe).not.toContain("cp-indice");
    expect(htmlCodeDeLaPhrase(CODE_PAR_DEFAUT, { ...groupesCP, format: "affiche" })).toContain("« C&#39;est… qui »");
    expect(reglagesCarteSurs({ format: "poster" as never, exemple: 9, niveau: "CM9" as never, caches: ["inconnu", "verbe"] }))
      .toEqual({ ...REGLAGES_CARTE_CODE, caches: ["verbe"] });
  });

  it("guide la feuille de grammaire : sa consigne et son corrigé suivent le code, au niveau de la classe", () => {
    const html = htmlGrammaire({ exercice: "constituants", classe: "CE1", temps: "present", verbes: "" }, 4, autre);
    expect(html).toContain("Souligne deux fois le groupe sujet en violet. Surligne le verbe en orange. Mets les compléments entre crochets, en rose.");
    expect(html).toContain("Mets le complément entre crochets, en rose. Puis écris la phrase sans le complément.");
    expect(html).toContain("border-bottom:4.5px double #7c3aed");
    // Au CE2, les compléments ne sont pas encore distingués.
    const ce2 = htmlGrammaire({ exercice: "constituants", classe: "CE2", temps: "present", verbes: "" }, 4, CODE_PAR_DEFAUT);
    expect(ce2).toContain("Souligne le groupe sujet en bleu. Entoure le verbe en rouge. Encadre les compléments en vert.");
    expect(ce2).not.toContain("cp-cc");
    // Au CP, le sujet et le verbe seulement.
    const cp = htmlGrammaire({ exercice: "constituants", classe: "CP", temps: "present", verbes: "" }, 4, CODE_PAR_DEFAUT);
    expect(cp).toContain("Le sujet et le verbe dans la phrase");
    expect(cp).toContain("Souligne le sujet en bleu. Entoure le verbe en rouge.");
    expect(cp).not.toContain("sans le complément");
    expect(cp).not.toContain("cp-complement");
  });
});
