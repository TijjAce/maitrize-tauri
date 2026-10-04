import { describe, it, expect } from "vitest";
import {
  OPTIONS_PAR_DEFAUT, ajouterPagePhoto, consigneLectureEncadre, consigneReadaptation, enTexte, estLu, exerciceEncadre, exercicesParCompetence,
  exercicesQuiTravaillent, ficheDepuisLExercice, htmlFicheAdaptee, indexAvec, indexSans, lireExerciceDeLEncadre, lireFicheAdaptee, lireIndex, lireManuel,
  ecrireManuel, nomExercice, nouveauManuel, resumeDe, retirerPage, texteExercice, type ExerciceManuel, type Manuel,
} from "./manuels";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";

const ex = (numero: string, consigne: string, contenu: string): ExerciceManuel =>
  ({ id: "e", numero, titre: "", consigne, contenu, type: "calcul", competences: [] });
const comp = (competenceTitre: string, competenceRefId = competenceTitre): CompetenceSelectionnee => ({
  id: `c-${competenceRefId}`, referentielNom: "Cycle 3 — CM1, CM2 (programmes 2026)", domaineId: "FR", domaineTitre: "Français",
  sousDomaineTitre: "Étude de la langue", competenceGeneraleTitre: null, competenceTitre, niveau: null, competenceRefId,
});

describe("un manuel", () => {
  it("naît vide par photos, ou avec ses pages par PDF, et se relit tel quel", () => {
    const tel = nouveauManuel("  ", "telephone", "2026-09-27");
    expect(tel.titre).toBe("Manuel du 2026-09-27");
    expect(tel.pages).toEqual([]);
    const pdf = nouveauManuel("Maths CE1", "pdf", "2026-09-27", "abc.pdf", 3);
    expect(pdf.pages.map((p) => p.numero)).toEqual([1, 2, 3]);
    expect(pdf.pages.every((p) => p.fichier === "" && p.exercices.length === 0)).toBe(true);
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

  it("se relit avec ses exercices encadrés, leurs compétences et leur modèle simplifié", () => {
    const fiche = { titre: "Accorder l'adjectif", consigne: "Colorie.", exemple: "", items: ["une chemise bleue"], aide: "" };
    const e: ExerciceManuel = {
      ...exerciceEncadre({ x: 0.1, y: 0.2, l: 0.5, h: 0.3 }, "e1"), consigne: "Finis de les colorier.", type: "langue",
      competences: [comp("Accorder l'adjectif avec le nom")],
      modele: { fiche, options: { ...OPTIONS_PAR_DEFAUT, items: 3 }, faitLe: "2026-10-04" },
    };
    const m: Manuel = { ...nouveauManuel("Cléo", "telephone", "2026-10-04"), pages: [{ id: "p", numero: 1, fichier: "a.jpg", exercices: [e] }] };
    expect(lireManuel(ecrireManuel(m))).toEqual(m);
  });

  it("un manuel d'avant garde la compétence que ses exercices tenaient de leur notion", () => {
    const ancien = {
      id: "m", titre: "Cléo", source: "telephone", fichierPdf: "", niveau: "CM1", creeLe: "2026-09-28",
      notions: [{ id: "n1", titre: "Accorder le verbe", domaine: "Grammaire", competences: [comp("Accorder le verbe avec son sujet")] }],
      pages: [{ id: "p", numero: 1, fichier: "a.jpg", extraitLe: "2026-10-04", exercices: [
        { id: "e1", numero: "1", consigne: "Accorde.", contenu: "", type: "langue", notion: "n1" },
        { id: "e2", numero: "2", consigne: "Lis.", contenu: "", type: "lecture", notion: "" },
      ] }],
    };
    const relu = lireManuel(JSON.stringify(ancien))!;
    expect(relu.pages[0].exercices.map((e) => e.competences.map((c) => c.competenceTitre))).toEqual([["Accorder le verbe avec son sujet"], []]);
    expect("notions" in relu).toBe(false);
  });
});

describe("lire un encadré, puis le simplifier", () => {
  it("demande de lire l'encadré tel qu'il est écrit, toutes ses consignes comprises", () => {
    const c = consigneLectureEncadre("CM1");
    expect(c).toContain("UN exercice");
    expect(c).toContain("niveau CM1");
    expect(c).toContain("TOUTES les consignes");
    expect(c).toContain("jamais un objet");
  });

  it("lit l'exercice de l'encadré, enveloppé ou non, et met en lignes ce qui vient en tableau", () => {
    const lu = lireExerciceDeLEncadre(`Voici :\n\`\`\`json\n${JSON.stringify({
      numero: "2", titre: "Je fais attention à la logique des textes",
      consigne: ["Lis attentivement le texte pour bien comprendre.", "Puis barre ce qui n'est pas logique.", "À droite, corrige le texte en écrivant les bons mots."],
      contenu: "Tiloann a demandé à Maroussia :\n« Avec qui tu te marieras quand tu seras grande ?\n– Avec toi.", type: "lecture",
    })}\n\`\`\``);
    expect(lu).toMatchObject({ numero: "2", titre: "Je fais attention à la logique des textes", type: "lecture" });
    expect(lu!.consigne.split("\n")).toHaveLength(3);
    expect(lu!.contenu.split("\n")).toHaveLength(3);
    expect(lireExerciceDeLEncadre(JSON.stringify({ exercice: { numero: "3", consigne: "Entoure les homonymes." } }))).toMatchObject({ numero: "3", consigne: "Entoure les homonymes." });
    expect(lireExerciceDeLEncadre("rien")).toBeNull();
  });

  it("garde les mots d'un item rendu en objet, au lieu d'imprimer « [object Object] »", () => {
    // Ce que le modèle a rendu sur la page 27 : l'exemple et les items en objets.
    const f = lireFicheAdaptee(JSON.stringify({
      titre: "Comprendre et corriger les réponses",
      consigne: ["Lis le dialogue.", "Barre les réponses qui n'ont pas de sens.", "Écris le bon mot à droite."],
      exemple: { phrase: "– Une tout en bois.", correction: "Une maison en bois." },
      items: [{ phrase: "– Combien ?", reponse: "Deux et demi." }, "– Pourquoi deux et demi ?", ["– Parce que deux", "c'est pas assez."]],
      aide: null,
    }));
    expect(f).toEqual({
      titre: "Comprendre et corriger les réponses",
      consigne: "Lis le dialogue.\nBarre les réponses qui n'ont pas de sens.\nÉcris le bon mot à droite.",
      exemple: "– Une tout en bois. → Une maison en bois.",
      items: ["– Combien ? → Deux et demi.", "– Pourquoi deux et demi ?", "– Parce que deux ; c'est pas assez."],
      aide: "",
    });
    expect(JSON.stringify(f)).not.toContain("[object Object]");
    expect(enTexte({ a: { b: "x" }, c: 2 })).toBe("x → 2");
  });

  it("un modèle enregistré avec « [object Object] » est à refaire", () => {
    const abime = { titre: "T", consigne: "C", exemple: "[object Object]", items: ["[object Object]"], aide: "" };
    const e = { ...exerciceEncadre({ x: 0, y: 0, l: 1, h: 1 }, "e"), consigne: "Lis.", modele: { fiche: abime, options: OPTIONS_PAR_DEFAUT, faitLe: "" } };
    const m: Manuel = { ...nouveauManuel("Cléo", "telephone", "2026-10-04"), pages: [{ id: "p", numero: 1, fichier: "a.jpg", exercices: [e] }] };
    expect(lireManuel(ecrireManuel(m))!.pages[0].exercices[0].modele).toBeUndefined();
  });

  it("garde toutes les tâches : plusieurs consignes deviennent des étapes numérotées", () => {
    const html = htmlFicheAdaptee({ titre: "Le dialogue", consigne: "1. Lis le dialogue.\n2. Barre ce qui n'a pas de sens.\n3. Écris le bon mot.", exemple: "", items: ["– Avec toi."], aide: "" },
      OPTIONS_PAR_DEFAUT, { manuel: "Cléo", page: 27, numero: "2" });
    expect(html).toContain('<ol class="fa-consigne fa-etapes"><li>Lis le dialogue.</li><li>Barre ce qui n&#39;a pas de sens.</li><li>Écris le bon mot.</li></ol>');
    expect(htmlFicheAdaptee({ titre: "", consigne: "Lis.", exemple: "", items: [], aide: "" }, OPTIONS_PAR_DEFAUT, { manuel: "M", page: 1, numero: "" }))
      .toContain('<div class="fa-consigne">Lis.</div>');
  });

  it("sait si un exercice a été lu, et lui trouve un nom court", () => {
    const vide = exerciceEncadre({ x: 0, y: 0, l: 1, h: 1 });
    expect(estLu(vide)).toBe(false);
    expect(nomExercice(vide)).toBe("Exercice à lire");
    const lu = { ...vide, consigne: "Accorde les adjectifs.\nPuis recopie.", titre: "" };
    expect(estLu(lu)).toBe(true);
    expect(nomExercice(lu)).toBe("Accorde les adjectifs.");
    expect(nomExercice({ ...lu, modele: { fiche: { titre: "Accorder", consigne: "c", exemple: "", items: [], aide: "" }, options: OPTIONS_PAR_DEFAUT, faitLe: "" } })).toBe("Accorder");
  });
});

describe("réécrire un exercice d'après son texte", () => {
  const e = ex("4", "Calcule les additions puis entoure les résultats pairs.", "12 + 7 = …\n25 + 9 = …\n33 + 8 = …\n41 + 6 = …\n50 + 12 = …\n61 + 3 = …");

  it("dit au modèle ce qu'on veut, et rien de plus", () => {
    const msgs = consigneReadaptation(e, { ...OPTIONS_PAR_DEFAUT, items: 4, etapes: true, precision: "avec des jetons" }, "CE1");
    expect(msgs[0].role).toBe("system");
    const u = msgs[1].content;
    expect(u).toContain("Garde TOUTES les tâches");
    expect(u).toContain("deux actions font deux lignes");
    expect(u).toContain("jamais un objet");
    expect(u).toContain("au plus 4 items");
    expect(u).toContain("étapes numérotées");
    expect(u).toContain("avec des jetons");
    expect(u).toContain("12 + 7 = …");
    const sans = consigneReadaptation(e, { ...OPTIONS_PAR_DEFAUT, simplifier: false, exemple: false, items: 0, zonesReponse: false }, "").pop()!.content;
    expect(sans).not.toContain("UNE action");
    expect(sans).toContain("Garde TOUTES les tâches");
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
    expect(texteExercice(e)).toBe("4 · Calcule les additions puis entoure les résultats pairs. — 12 + 7 = … ; 25 + 9 = … ; 33 + 8 = … ; 41 + 6 = … ; 50 + 12 = … ; 61 + 3 = …");
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

describe("les exercices d'une compétence", () => {
  const adjectif = comp("Accorder l'adjectif avec le nom");
  const verbe = comp("Accorder le verbe avec son sujet");
  const manuel = (titre: string, exos: ExerciceManuel[]): Manuel =>
    ({ ...nouveauManuel(titre, "telephone", "2026-10-04"), pages: [{ id: `${titre}-p1`, numero: 1, fichier: "a.jpg", exercices: exos }] });
  const a = manuel("Cléo", [
    { ...ex("1", "Accorde.", ""), id: "a1", competences: [adjectif] },
    { ...ex("2", "Accorde le verbe.", ""), id: "a2", competences: [verbe, adjectif] },
    { ...ex("3", "Lis.", ""), id: "a3" },
  ]);
  const b = manuel("Pépites", [{ ...ex("7", "Colorie.", ""), id: "b1", competences: [{ ...adjectif, id: "autre-id" }] }]);

  it("retrouve, dans tous les manuels, ceux qui travaillent une compétence", () => {
    const trouves = exercicesQuiTravaillent([a, b], (c) => c.competenceRefId === adjectif.competenceRefId);
    expect(trouves.map((t) => [t.manuel.titre, t.page.numero, t.exercice.id])).toEqual([["Cléo", 1, "a1"], ["Cléo", 1, "a2"], ["Pépites", 1, "b1"]]);
    expect(exercicesQuiTravaillent([a, b], () => false)).toEqual([]);
  });

  it("range les exercices d'un manuel par compétence, et dit ceux qui n'en ont pas", () => {
    const { groupes, sans } = exercicesParCompetence(a);
    expect(groupes.map((g) => [g.competence.competenceTitre, g.exercices.map((x) => x.exercice.id)])).toEqual([
      ["Accorder l'adjectif avec le nom", ["a1", "a2"]],
      ["Accorder le verbe avec son sujet", ["a2"]],
    ]);
    expect(sans.map((x) => x.exercice.id)).toEqual(["a3"]);
  });
});
