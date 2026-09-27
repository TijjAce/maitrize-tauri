import { describe, it, expect } from "vitest";
import {
  OPTIONS_PAR_DEFAUT, ajouterPagePhoto, consigneExtraction, consigneReadaptation, ficheDepuisLExercice, htmlFicheAdaptee,
  indexAvec, indexSans, lireExercices, lireFicheAdaptee, lireIndex, lireManuel, ecrireManuel, nouveauManuel, resumeDe, retirerPage,
  texteExercice, type ExerciceManuel,
} from "./manuels";

const ex = (numero: string, consigne: string, contenu: string): ExerciceManuel => ({ id: "e", numero, consigne, contenu, type: "calcul" });

describe("un manuel", () => {
  it("naît vide par photos, ou avec ses pages par PDF, et se relit tel quel", () => {
    const tel = nouveauManuel("  ", "telephone", "2026-09-27");
    expect(tel.titre).toBe("Manuel du 2026-09-27");
    expect(tel.pages).toEqual([]);
    const pdf = nouveauManuel("Maths CE1", "pdf", "2026-09-27", "abc.pdf", 3);
    expect(pdf.pages.map((p) => p.numero)).toEqual([1, 2, 3]);
    expect(pdf.pages.every((p) => p.fichier === "" && p.exercices.length === 0 && p.extraitLe === "")).toBe(true);
    expect(lireManuel(ecrireManuel(pdf))).toEqual(pdf);
    expect(lireManuel("{pas du json")).toBeNull();
    expect(lireManuel(JSON.stringify({ id: "x", pages: [{ exercices: [{ consigne: "Lis.", type: "nimporte" }] }] }))!.pages[0].exercices[0].type).toBe("autre");
  });

  it("gagne ses pages photographiées dans l'ordre, et les renumérote quand on en retire", () => {
    let m = nouveauManuel("Photos", "telephone", "2026-09-27");
    m = ajouterPagePhoto(ajouterPagePhoto(m, "a.jpg"), "b.jpg");
    expect(m.pages.map((p) => [p.numero, p.fichier])).toEqual([[1, "a.jpg"], [2, "b.jpg"]]);
    m = retirerPage(m, m.pages[0].id);
    expect(m.pages.map((p) => [p.numero, p.fichier])).toEqual([[1, "b.jpg"]]);
  });

  it("tient son index, le plus récent d'abord", () => {
    const a = nouveauManuel("A", "pdf", "2026-09-01");
    const b = ajouterPagePhoto(nouveauManuel("B", "telephone", "2026-09-27"), "p.jpg");
    let index = indexAvec(indexAvec([], a), b);
    expect(index.map((x) => x.titre)).toEqual(["B", "A"]);
    expect(resumeDe(b)).toMatchObject({ pages: 1, exercices: 0, source: "telephone" });
    index = indexAvec(index, { ...a, titre: "A bis" });
    expect(index).toHaveLength(2);
    expect(index[1].titre).toBe("A bis");
    expect(indexSans(index, a.id).map((x) => x.id)).toEqual([b.id]);
    expect(lireIndex(JSON.stringify(index))).toEqual(index);
    expect(lireIndex("nope")).toEqual([]);
  });
});

describe("relire les exercices d'une page", () => {
  it("demande une transcription fidèle, en JSON", () => {
    const c = consigneExtraction("CE1");
    expect(c).toContain("niveau CE1");
    expect(c).toContain("N'invente rien");
    expect(c).toContain("[image");
    expect(c).toContain("calcul, probleme, lecture");
  });

  it("lit le tableau du modèle, quoi qu'il y ait autour, et écarte le vide", () => {
    const rep = `Voici les exercices :\n\`\`\`json\n[{"numero":"3","consigne":"Calcule.","contenu":"12 + 7 = …\\n25 + 9 = …","type":"calcul"},{"numero":"","consigne":"","contenu":""},{"consigne":"Recopie la phrase.","type":"bizarre"}]\n\`\`\``;
    const lus = lireExercices(rep);
    expect(lus).toHaveLength(2);
    expect(lus[0]).toMatchObject({ numero: "3", consigne: "Calcule.", contenu: "12 + 7 = …\n25 + 9 = …", type: "calcul" });
    expect(lus[1].type).toBe("autre");
    expect(lireExercices("rien")).toEqual([]);
    expect(lireExercices("[]")).toEqual([]);
    expect(texteExercice(lus[0])).toBe("3 · Calcule. — 12 + 7 = … ; 25 + 9 = …");
  });
});

describe("réadapter un exercice", () => {
  const e = ex("4", "Calcule les additions puis entoure les résultats pairs.", "12 + 7 = …\n25 + 9 = …\n33 + 8 = …\n41 + 6 = …\n50 + 12 = …\n61 + 3 = …");

  it("dit au modèle ce qu'on veut, et rien de plus", () => {
    const msgs = consigneReadaptation(e, { ...OPTIONS_PAR_DEFAUT, items: 4, etapes: true, precision: "avec des jetons" }, "CE1");
    expect(msgs[0].role).toBe("system");
    const u = msgs[1].content;
    expect(u).toContain("au plus 4 items");
    expect(u).toContain("étapes numérotées");
    expect(u).toContain("avec des jetons");
    expect(u).toContain("12 + 7 = …");
    const sans = consigneReadaptation(e, { ...OPTIONS_PAR_DEFAUT, simplifier: false, exemple: false, items: 0, zonesReponse: false }, "").pop()!.content;
    expect(sans).not.toContain("UNE action");
    expect(sans).not.toContain("exemple entièrement fait");
    expect(sans).not.toContain("au plus");
  });

  it("lit la fiche renvoyée, et sait s'en passer", () => {
    const f = lireFicheAdaptee(`{"titre":"Additionner","consigne":"Calcule.","exemple":"12 + 7 = 19","items":["25 + 9 = …","33 + 8 = …"],"aide":"Des jetons."}`);
    expect(f).toEqual({ titre: "Additionner", consigne: "Calcule.", exemple: "12 + 7 = 19", items: ["25 + 9 = …", "33 + 8 = …"], aide: "Des jetons." });
    expect(lireFicheAdaptee("{}")).toBeNull();
    expect(lireFicheAdaptee("pas de json")).toBeNull();
    const brute = ficheDepuisLExercice(e, { ...OPTIONS_PAR_DEFAUT, items: 2 });
    expect(brute.items).toEqual(["12 + 7 = …", "25 + 9 = …"]);
    expect(ficheDepuisLExercice(e, { ...OPTIONS_PAR_DEFAUT, items: 0 }).items).toHaveLength(6);
  });

  it("imprime la fiche avec sa consigne encadrée, ses lignes de réponse et son origine", () => {
    const html = htmlFicheAdaptee({ titre: "Additionner", consigne: "Calcule.", exemple: "12 + 7 = 19", items: ["25 + 9 = …", "33 + 8 = …"], aide: "Des jetons." },
      OPTIONS_PAR_DEFAUT, { manuel: "Maths CE1", page: 12, numero: "4" });
    expect(html).toContain('class="fa gros"');
    expect(html).toContain("Calcule.");
    expect((html.match(/fa-reponse/g) ?? []).length).toBe(2);
    expect(html).toContain("Maths CE1 · p. 12 · ex. 4");
    expect(html).toContain("Pour l'adulte");
    const sobre = htmlFicheAdaptee({ titre: "", consigne: "Lis.", exemple: "", items: ["a <b>"], aide: "" }, { ...OPTIONS_PAR_DEFAUT, grosCaracteres: false, zonesReponse: false }, { manuel: "M", page: 1, numero: "" });
    expect(sobre).not.toContain("fa-reponse");
    expect(sobre).toContain("a &lt;b&gt;");
    expect(sobre).toContain("Exercice");
  });
});
