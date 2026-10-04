import { describe, it, expect } from "vitest";
import { OPTIONS_FEUILLE, appliquerOptionsFeuille, contenuDeLaFeuille } from "./optionsFeuille";
import {
  MODELES_TRI, REGLAGES_TRI, avecAide, etiquettesDuTri, etiquettesSaisies, htmlEtiquette, htmlTri, lignesDAide, maisonsDuTri, morceaux, sansMarques,
  type ReglagesTri,
} from "./triEtiquettes";

const r = (p: Partial<ReglagesTri> = {}): ReglagesTri => ({ ...REGLAGES_TRI, ...p });

describe("les maisons du tri", () => {
  it("lit les étiquettes d'une maison, et ce qu'on y a marqué", () => {
    expect(etiquettesSaisies("Je *suis* content.\n\n  Tu   *es*  là. \n**\n")).toEqual(["Je *suis* content.", "Tu *es* là.", "**"]);
    expect(sansMarques("J'*ai* un cartable.")).toBe("J'ai un cartable.");
    // Un astérisque seul reste ce qu'il est.
    expect(sansMarques("3 * 4 = 12")).toBe("3 * 4 = 12");
    expect(morceaux("Je *suis* content.").map((m) => [m.texte, m.mot, m.ponctuation])).toEqual([
      ["J", false, true], ["e ", false, false], ["suis", true, false], [" content", false, false], [".", false, true],
    ]);
    // Sans majuscule ni point : rien à colorer de ce côté-là.
    expect(morceaux("les enfants jouent").map((m) => m.ponctuation)).toEqual([false]);
    expect(morceaux("Où est-il ?").map((m) => m.texte)).toEqual(["O", "ù est-il", " ?"]);
    expect(morceaux("")).toEqual([]);
  });

  it("colore le mot marqué, la majuscule et la ponctuation — seulement avec l'aide", () => {
    const aides = { aideMots: true, couleurMots: "#d94033", aidePonctuation: false, couleurPonctuation: "#2454e6", capitales: false };
    expect(htmlEtiquette("Je *suis* content.", aides, true)).toBe(`Je <span class="tr-mot" style="color:#d94033">suis</span> content.`);
    expect(htmlEtiquette("Je *suis* content.", aides, false)).toBe("Je suis content.");
    expect(htmlEtiquette("Je *suis* content.", { ...aides, aideMots: false }, true)).toBe("Je suis content.");
    const ponctuation = { ...aides, aideMots: false, aidePonctuation: true };
    expect(htmlEtiquette("Quel beau gâteau !", ponctuation, true))
      .toBe(`<span class="tr-ponctuation" style="color:#2454e6">Q</span>uel beau gâteau<span class="tr-ponctuation" style="color:#2454e6"> !</span>`);
    expect(htmlEtiquette("tu viens avec moi !", ponctuation, true)).toBe(`tu viens avec moi<span class="tr-ponctuation" style="color:#2454e6"> !</span>`);
    // En capitales, la majuscule ne dit plus rien ; la ponctuation garde sa couleur.
    expect(htmlEtiquette("Il pleut.", { ...ponctuation, capitales: true }, true)).toBe(`IL PLEUT<span class="tr-ponctuation" style="color:#2454e6">.</span>`);
    // Une couleur qui n'en est pas une, un texte qui porte du HTML : rien ne passe.
    expect(htmlEtiquette("*<b>*", { ...aides, couleurMots: '"><script>' }, true)).toBe(`<span class="tr-mot" style="color:#d94033">&lt;b&gt;</span>`);
  });

  it("mêle les étiquettes de toutes les maisons, de façon rejouable", () => {
    const toutes = etiquettesDuTri(r(), 3);
    expect(toutes).toHaveLength(16);
    expect(toutes.filter((e) => e.maison === 0)).toHaveLength(8);
    expect(toutes.map((e) => e.maison).join("")).not.toBe("0000000011111111");
    expect(etiquettesDuTri(r(), 3)).toEqual(toutes);
    expect(etiquettesDuTri(r({ melanger: false }), 3).map((e) => e.maison).join("")).toBe("0000000011111111");
    // Une maison vide ne compte pas ; pas plus de quatre maisons.
    const six = Array.from({ length: 6 }, (_, i) => ({ titre: `M${i}`, etiquettes: "a" }));
    expect(maisonsDuTri({ categories: [...six, { titre: " ", etiquettes: " \n" }] })).toHaveLength(4);
    expect(maisonsDuTri({ categories: [{ titre: "", etiquettes: "" }, { titre: "Seule", etiquettes: "" }] })).toHaveLength(1);
  });

  it("s'imprime : les étiquettes, les maisons avec le prénom, le corrigé", () => {
    const html = htmlTri(r(), 3);
    expect(html).toContain("Étiquettes à manipuler — ÊTRE ou AVOIR ?");
    expect(html).toContain(`<div class="consigne">Découpe les étiquettes. Lis chaque phrase et place-la dans la bonne maison.</div>`);
    expect((html.match(/class="tr-etiquette"/g) ?? []).length).toBe(16);
    // Le texte tient dans une seule enveloppe : les espaces autour du mot coloré restent.
    expect(html).toContain(`<div class="tr-etiquette"><span class="tr-texte">Je <span class="tr-mot" style="color:#d94033">suis</span> content.</span></div>`);
    expect(html).toContain("grid-template-columns: repeat(4, 1fr)");
    expect(html).toContain("<th>Verbe être</th><th>Verbe avoir</th>");
    // Huit lignes par maison, vides sur la feuille de l'élève, remplies au corrigé.
    expect((html.match(/<td><\/td>/g) ?? []).length).toBe(16);
    expect(html).toContain(`<div class="page corrige">`);
    expect(html).not.toContain("Défi");
    expect(contenuDeLaFeuille(html)).toEqual({ consigne: true, prenom: true, corrige: true });
    expect(appliquerOptionsFeuille(html, { ...OPTIONS_FEUILLE, corrige: false })).not.toContain("corrigé");
    expect(htmlTri(r(), 3)).toBe(html);
    // Trois maisons : jamais moins de trois étiquettes par ligne, pour qu'elles tiennent dans leur colonne.
    const trois = MODELES_TRI.find((m) => m.id === "types")!.reglages;
    expect(htmlTri({ ...trois, parLigne: 2 }, 1)).toContain("repeat(3, 1fr)");
  });

  it("différencie : avec ou sans l'aide, ou les deux versions à la suite", () => {
    const aidee = htmlTri(r(), 3);
    expect((aidee.match(/class="tr-mot"/g) ?? []).length).toBe(16 + 16);
    const nue = htmlTri(r({ aideMots: false }), 3);
    // Sans l'aide, les étiquettes sont nues ; le corrigé aussi, puisqu'on ne la veut pas.
    expect(nue).not.toContain("tr-mot");
    expect(nue).toContain("Je suis content.");
    const deux = htmlTri(r({ deuxVersions: true }), 3);
    expect((deux.match(/class="tr-etiquette"/g) ?? []).length).toBe(32);
    expect(deux).toContain(`<div class="tr-repere">avec l'aide</div>`);
    expect(deux).toContain(`<div class="tr-repere">sans l'aide</div>`);
    expect((deux.match(/class="tr-mot"/g) ?? []).length).toBe(16 + 16);
    // Rien de marqué, aucune aide à donner : une seule version, même si on en demande deux.
    const sansMarque = r({ deuxVersions: true, categories: [{ titre: "A", etiquettes: "un\ndeux" }, { titre: "B", etiquettes: "trois" }] });
    expect(avecAide(sansMarque)).toBe(false);
    expect(htmlTri(sansMarque, 1)).not.toContain("tr-repere");
    expect(avecAide(r({ aideMots: false, aidePonctuation: true }))).toBe(true);
  });

  it("porte une fiche d'aide quand on l'écrit", () => {
    expect(lignesDAide("Le sens : Est-ce que cela veut dire quelque chose ?\n\nSans titre")).toEqual([
      { titre: "Le sens", question: "Est-ce que cela veut dire quelque chose ?" }, { titre: "", question: "Sans titre" },
    ]);
    const phrase = MODELES_TRI.find((m) => m.id === "phrase")!.reglages;
    const html = htmlTri(phrase, 2);
    expect(html).toContain("<th>① Le sens</th>");
    expect(html).toContain("<th>④ La ponctuation</th>");
    expect(html).toContain("<b>À retenir.</b>");
    expect((html.match(/class="tr-ponctuation"/g) ?? []).length).toBeGreaterThan(16);
    expect(htmlTri(r(), 1)).not.toContain("tr-aide");
  });

  it("propose des modèles complets, chacun avec ses maisons et ses étiquettes", () => {
    expect(MODELES_TRI.map((m) => m.id)).toEqual(["etre-avoir", "phrase", "types", "temps", "nom-verbe", "nombre"]);
    for (const m of MODELES_TRI) {
      const maisons = maisonsDuTri(m.reglages);
      expect(maisons.length, m.id).toBeGreaterThanOrEqual(2);
      for (const c of maisons) expect(etiquettesSaisies(c.etiquettes).length, `${m.id} ${c.titre}`).toBeGreaterThanOrEqual(4);
      // Les maisons d'un modèle ont toutes autant d'étiquettes.
      expect(new Set(maisons.map((c) => etiquettesSaisies(c.etiquettes).length)).size, m.id).toBe(1);
      expect(htmlTri(m.reglages, 1)).toContain("Les maisons du tri");
    }
  });
});
