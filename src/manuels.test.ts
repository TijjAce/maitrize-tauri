import { describe, it, expect } from "vitest";
import {
  OPTIONS_PAR_DEFAUT, ajouterPagePhoto, consigneExtraction, consigneReadaptation, ficheDepuisLExercice, htmlFicheAdaptee,
  indexAvec, indexSans, lireExercices, lireFicheAdaptee, lireIndex, lireManuel, ecrireManuel, nouveauManuel, resumeDe, retirerPage,
  texteExercice, appliquerClassement, classementDeLaReponse, consigneClassement, domaineConnu, exercicesAClasser, exercicesDeLaNotion,
  notionsRangees, estUneEtape, fusionnerExercices, type ExerciceManuel, type Manuel,
} from "./manuels";

const ex = (numero: string, consigne: string, contenu: string): ExerciceManuel => ({ id: "e", numero, titre: "", consigne, contenu, type: "calcul", notion: "" });

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

  it("dit au modèle qu'un bloc fait un seul exercice, même en plusieurs consignes", () => {
    const c = consigneExtraction("CE2");
    expect(c).toContain("UN SEUL exercice");
    expect(c).toContain("« Puis… »");
    expect(c).toContain('"titre"');
  });

  it("réunit les étapes que le modèle a rendues à part : même titre, « Puis… », même numéro", () => {
    // La page « J'accorde l'adjectif avec le nom » : trois consignes, un exercice.
    const rep = JSON.stringify([
      { numero: "Pour commencer", titre: "J'accorde l'adjectif avec le nom", consigne: "Finis de les colorier.", contenu: "", type: "langue" },
      { numero: "", titre: "", consigne: "Puis complète les phrases avec les adjectifs de couleur qui conviennent.", contenu: "Louis a une chemise …\nBastien a …", type: "langue" },
      { numero: "", titre: "J'accorde l'adjectif avec le nom", consigne: "Souligne quatre groupes nominaux.", contenu: "", type: "langue" },
      { numero: "2", titre: "", consigne: "Accorde les adjectifs.", contenu: "des fleurs (bleu)", type: "langue" },
      { numero: "2", titre: "", consigne: "", contenu: "des chats (noir)", type: "langue" },
      { numero: "", titre: "", consigne: "Recopie la phrase.", contenu: "", type: "ecriture" },
    ]);
    const lus = lireExercices(rep);
    expect(lus.map((e) => [e.numero, e.titre, e.consigne.split("\n").length, e.contenu.split("\n").filter(Boolean).length])).toEqual([
      ["Pour commencer", "J'accorde l'adjectif avec le nom", 3, 2],
      ["2", "", 1, 2],
      ["", "", 1, 0],
    ]);
    expect(texteExercice(lus[0])).toContain("« J'accorde l'adjectif avec le nom » Finis de les colorier. Puis complète");
  });

  it("ne réunit pas deux exercices qui se suivent sans rien de commun", () => {
    const a = { ...ex("", "Lis le texte.", ""), titre: "Le loup" };
    expect(estUneEtape(a, { ...ex("", "Recopie la phrase.", ""), titre: "" })).toBe(false);
    expect(estUneEtape(a, { ...ex("Je m'entraîne", "Puis écris.", ""), titre: "" })).toBe(false);
    expect(estUneEtape(a, { ...ex("", "Ensuite, écris la fin.", ""), titre: "" })).toBe(true);
    expect(fusionnerExercices({ ...a, notion: "n1" }, { ...ex("", "Ensuite, écris.", "la fin"), titre: "" })).toMatchObject({ titre: "Le loup", consigne: "Lis le texte.\nEnsuite, écris.", contenu: "la fin", notion: "n1" });
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

describe("le classement des exercices par notion", () => {
  const exo = (id: string, numero: string, consigne: string, notion = ""): ExerciceManuel =>
    ({ id, numero, titre: "", consigne, contenu: "", type: "langue", notion });
  const manuel = (): Manuel => ({
    ...nouveauManuel("Pépites CE2", "telephone", "2026-10-04"), niveau: "CE2",
    pages: [
      { id: "p1", numero: 1, fichier: "a.jpg", extraitLe: "2026-10-04", exercices: [exo("e1", "1", "Souligne le sujet de chaque verbe."), exo("e2", "2", "Lis le texte et réponds.")] },
      { id: "p2", numero: 2, fichier: "b.jpg", extraitLe: "2026-10-04", exercices: [exo("e3", "4", "Accorde le verbe avec son sujet."), exo("e4", "5", "Écris les noms composés.")] },
    ],
  });

  it("demande au modèle de ranger chaque exercice, avec les notions déjà retenues", () => {
    const m = manuel();
    const lot = exercicesAClasser(m);
    expect(lot.map((x) => [x.page, x.exercice.id])).toEqual([[1, "e1"], [1, "e2"], [2, "e3"], [2, "e4"]]);
    const deja = [{ id: "n1", titre: "Accorder le verbe avec son sujet", domaine: "Grammaire", competences: [] }];
    const demande = consigneClassement(m, lot, deja).map((x) => x.content).join("\n");
    expect(demande).toContain("N1 · Grammaire · Accorder le verbe avec son sujet");
    expect(demande).toContain("E3 (p. 2, ex. 4) Accorde le verbe avec son sujet.");
    expect(demande).toContain("(niveau CE2)");
  });

  it("relit une réponse bavarde, et écarte ce qui ne se rattache à rien", () => {
    const reponse = `Voici le classement :
\`\`\`json
{"notions":[
  {"id":"N1","titre":"Accorder le verbe avec son sujet","domaine":"grammaire","exercices":["E1","E3"]},
  {"id":"nouvelle","titre":"Comprendre un texte lu","domaine":"Lecture","exercices":["E2", "E9", "x"]},
  {"id":"nouvelle","titre":"Les noms composés","domaine":"Lexique","exercices":[4]},
  {"id":"nouvelle","titre":"","domaine":"Lecture","exercices":["E2"]},
  {"id":"N7","titre":"","domaine":"","exercices":["E1"]}
]}
\`\`\``;
    expect(classementDeLaReponse(reponse, 4, 1)).toEqual([
      { notion: 0, titre: "Accorder le verbe avec son sujet", domaine: "Grammaire", exercices: [0, 2] },
      { notion: null, titre: "Comprendre un texte lu", domaine: "Lecture", exercices: [1] },
      { notion: null, titre: "Les noms composés", domaine: "Autre", exercices: [3] },
    ]);
    expect(classementDeLaReponse("pas de JSON", 4, 0)).toEqual([]);
    expect(domaineConnu("ESPACE ET GÉOMÉTRIE")).toBe("Espace et géométrie");
  });

  it("range les exercices : une notion retenue se reprend, un titre déjà là se rejoint, un exercice ne se range qu'une fois", () => {
    const deja = { id: "n1", titre: "Accorder le verbe avec son sujet", domaine: "Grammaire", competences: [] };
    const m = { ...manuel(), notions: [deja] };
    const lot = exercicesAClasser(m);
    let k = 0;
    const suite = appliquerClassement(m, lot, [
      { notion: 0, titre: "", domaine: "Grammaire", exercices: [0] },
      { notion: null, titre: "accorder le verbe avec son sujet !", domaine: "Grammaire", exercices: [2] },
      { notion: null, titre: "Comprendre un texte lu", domaine: "Lecture", exercices: [1, 0] },
    ], m.notions, () => `neuve${++k}`);
    expect(suite.notions.map((n) => n.id)).toEqual(["n1", "neuve1"]);
    expect(suite.pages.flatMap((p) => p.exercices.map((e) => [e.id, e.notion]))).toEqual([["e1", "n1"], ["e2", "neuve1"], ["e3", "n1"], ["e4", ""]]);
    expect(exercicesAClasser(suite).map((x) => x.exercice.id)).toEqual(["e4"]);
    expect(exercicesDeLaNotion(suite, "n1").map((x) => [x.page, x.exercice.numero])).toEqual([[1, "1"], [2, "4"]]);
    // Les domaines dans leur ordre : la lecture avant la grammaire.
    expect(notionsRangees(suite).map((n) => n.titre)).toEqual(["Comprendre un texte lu", "Accorder le verbe avec son sujet"]);
  });

  it("garde notions et compétences en se relisant ; un exercice rangé dans une notion disparue redevient à classer", () => {
    const comp = { id: "c1", referentielNom: "Cycle 2", domaineId: "FR", domaineTitre: "Français", sousDomaineTitre: "Étude de la langue", competenceTitre: "Identifier le verbe et le sujet" };
    const m: Manuel = { ...manuel(), notions: [{ id: "n1", titre: "Accorder le verbe", domaine: "grammaire", competences: [comp] }] };
    m.pages[0].exercices[0].notion = "n1";
    m.pages[0].exercices[1].notion = "disparue";
    const relu = lireManuel(ecrireManuel(m))!;
    expect(relu.notions).toEqual([{ id: "n1", titre: "Accorder le verbe", domaine: "Grammaire", competences: [expect.objectContaining({ competenceTitre: "Identifier le verbe et le sujet" })] }]);
    expect(relu.pages[0].exercices.map((e) => e.notion)).toEqual(["n1", ""]);
    // Un manuel d'avant le classement se relit sans notion.
    const { notions: _sans, ...ancien } = manuel();
    expect(lireManuel(JSON.stringify(ancien))!.notions).toEqual([]);
  });
});
