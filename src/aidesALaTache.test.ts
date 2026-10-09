import { describe, it, expect } from "vitest";
import {
  ETAPE_REDIRE, ETAPE_VERIFIER, REGLAGES_FONCTION, REGLAGES_MODELISATION, REGLAGES_PAROLE, REGLAGES_RESOLUTION, REGLAGES_SEQUENTIEL,
  EXEMPLES_RESOLUTION, branchesDeLaParole, etapesDeLaFiche, etapesDeLaSeance, etapesDesPhases, facesDuDe, htmlFonction, htmlModelisation,
  htmlPriseDeParole, htmlResolution, htmlSequentiel, motsDeLaParole, reglagesParoleSurs, reglagesSequentielSurs, sequentielDeLaSeance,
  versionsDuChainage,
} from "./aidesALaTache";
import { sansReferences } from "./references";

const sans = () => null;

describe("décomposer la tâche", () => {
  it("encadre la tâche : la consigne redite en tête, la vérification à la fin", () => {
    expect(etapesDeLaFiche({ etapes: [" A ", "", "B"], redire: true, verifier: true })).toEqual([ETAPE_REDIRE, "A", "B", ETAPE_VERIFIER]);
    expect(etapesDeLaFiche({ etapes: ["A"], redire: false, verifier: false })).toEqual(["A"]);
  });

  it("cache, version après version, l'étape apprise : de la première, ou de la dernière", () => {
    const r = { etapes: ["A", "B", "C"], redire: true, verifier: true };
    // La consigne redite est l'étape 0 : on ne la cache jamais, ni la vérification.
    expect(versionsDuChainage({ ...r, chainage: "avant" }).map((v) => [...v])).toEqual([[], [1], [1, 2], [1, 2, 3]]);
    expect(versionsDuChainage({ ...r, chainage: "arriere" }).map((v) => [...v])).toEqual([[], [3], [3, 2], [3, 2, 1]]);
    expect(versionsDuChainage({ ...r, chainage: "aucun" })).toHaveLength(1);
  });

  it("imprime une check-list numérotée, avec ses cases, et une page par version du chaînage", () => {
    const r = { ...REGLAGES_SEQUENTIEL, chainage: "avant" as const, soliloque: true };
    const etapes = etapesDeLaFiche(r);
    const html = htmlSequentiel(r, etapes.map(() => null), {});
    // La version complète, puis une par étape de la tâche, puis le soliloque.
    expect(html.match(/class="page"/g)).toHaveLength(1 + r.etapes.length + 1);
    expect(html).toContain("Ce dont j'ai besoin");
    expect(html).toContain('<span class="at-num">1</span>');
    expect(html.match(/class="at-case"/g)?.length).toBeGreaterThanOrEqual(etapes.length);
    expect(html).toContain("Je m'en souviens…");
    expect(html).toContain("Pour l'adulte — le soliloque");
    // La source se montre derrière le « ? », pas sur le papier.
    expect(sansReferences(html)).not.toContain("reseau-canope.fr");
    expect(html).toContain("reseau-canope.fr");
  });

  it("pose le picto de chaque étape, et la mention de sa banque", () => {
    const r = { ...REGLAGES_SEQUENTIEL, redire: false, verifier: false, etapes: ["Je colle.", "Je range."] };
    const html = htmlSequentiel(r, [2511, null], { 2511: "data:image/png;base64,AAA" });
    expect(html).toContain('<img class="at-picto" src="data:image/png;base64,AAA"');
    expect(html).toContain("at-picto at-sans");
    expect(html).toContain("ARASAAC");
  });

  it("met les étapes sur une frise, une sur deux au-dessus de la flèche", () => {
    const r = { ...REGLAGES_SEQUENTIEL, forme: "frise" as const, redire: false, verifier: false, pictos: false, etapes: ["Un", "Deux", "Trois"] };
    const html = htmlSequentiel(r, [null, null, null], {});
    expect(html).toContain('class="at-frise"');
    const haut = html.slice(html.indexOf("at-frise-haut"), html.indexOf("at-axe"));
    expect(haut).toContain("Un");
    expect(haut).toContain("Trois");
    expect(haut).not.toContain("Deux");
  });

  it("passe le séquentiel visuel au scénario des supports visuels", () => {
    const r = { ...REGLAGES_SEQUENTIEL, forme: "sequentiel" as const, redire: false, verifier: false, etapes: ["Je colle."] };
    const html = htmlSequentiel(r, ["sclera:coller.png"], { "sclera:coller.png": "data:image/png;base64,BBB" });
    expect(html).toContain("sv-scenario");
    // L'image d'une banque d'appoint passe comme une photo, et sa banque est citée.
    expect(html).toContain("data:image/png;base64,BBB");
    expect(html).toContain("Sclera");
  });

  it("se relit avec méfiance", () => {
    const r = reglagesSequentielSurs({ etapes: ["a", 3, "b"], forme: "inconnue", chainage: "arriere", cases: "oui" });
    expect(r.etapes).toEqual(["a", "b"]);
    expect(r.forme).toBe("liste");
    expect(r.chainage).toBe("arriere");
    expect(r.cases).toBe(true);
    expect(reglagesSequentielSurs(null)).toEqual(REGLAGES_SEQUENTIEL);
  });
});

describe("le séquentiel d'une séance", () => {
  it("dit les phases à l'élève, une action par phase, sans redite", () => {
    expect(etapesDesPhases([
      "Temps 1 – Définition des objectifs et mise en réussite", "Temps 2 – Mise en activité des élèves",
      "Temps 3 – Institutionnalisation, retour réflexif", "Temps 4 – Automatisation, réinvestissement, transfert",
    ])).toEqual(["J'écoute ce que je vais apprendre.", "Je travaille.", "J'apprends ce qu'il faut retenir.", "Je travaille seul."]);
    expect(etapesDesPhases(["Rappel", "Trois problèmes à l'ardoise", "Problèmes dans le cahier", "Bilan"]))
      .toEqual(["Je me rappelle ce que je sais déjà.", "Je cherche.", "Je dis ce que j'ai fait et j'écoute les autres."]);
    expect(etapesDesPhases(["Évaluation", "", "Vingt égalités en deux minutes"])).toEqual(["Je montre ce que je sais faire.", "Vingt égalités en deux minutes."]);
  });

  it("prend les consignes de la séance quand elle en a, ses phases sinon", () => {
    const tableau = JSON.stringify([["Phase", "Durée", "Description", "Posture"], ["Rappel", "5 min", "", ""], ["Évaluation", "20 min", "", ""]]);
    expect(etapesDeLaSeance({ tableauDeroulement: tableau })).toEqual(["Je me rappelle ce que je sais déjà.", "Je montre ce que je sais faire."]);
    expect(etapesDeLaSeance({ tableauDeroulement: tableau, consignes: "Découpe.\nColle." })).toEqual(["Découpe.", "Colle."]);
    expect(etapesDeLaSeance({ tableauDeroulement: "pas du json" })).toEqual([]);
    const r = sequentielDeLaSeance("Séance 1 — Les doubles", ["Je cherche."]);
    expect(r).toMatchObject({ titre: "Séance 1 — Les doubles", etapes: ["Je cherche."], forme: "liste", redire: false, verifier: false });
  });
});

describe("préparer une prise de parole", () => {
  it("prend les branches du modèle, et des mots pour les cartes et le dé", () => {
    expect(branchesDeLaParole(REGLAGES_PAROLE).map((b) => b.titre)).toEqual(["Qui ?", "Quoi ?", "Où ?", "Quand ?"]);
    expect(facesDuDe({ de: "questions", mots: [] }).map((f) => f.titre)).toEqual(["Qui ?", "Quoi ?", "Où ?", "Quand ?", "Comment ?", "Pourquoi ?"]);
    expect(facesDuDe({ de: "mots", mots: ["été", "hiver"] }).map((f) => f.titre)).toEqual(["été", "hiver", "été", "hiver", "été", "hiver"]);
    expect(facesDuDe({ de: "mots", mots: [] })).toEqual([]);
    expect(motsDeLaParole({ ...REGLAGES_PAROLE, de: "aucun" })).toEqual(["qui", "quoi ?", "où", "quand", "printemps", "été", "automne", "hiver", "arbre", "neige"]);
  });

  it("garde des branches du modèle, deux au moins", () => {
    expect(reglagesParoleSurs({ modele: "appris", branches: ["Qui ?"] }).branches).toEqual(["J'ai appris…", "Je fais comme ça", "Un exemple", "Je me demande…"]);
    expect(reglagesParoleSurs({ modele: "presenter", branches: ["Où ?", "Quand ?", "Inventée"] }).branches).toEqual(["Où ?", "Quand ?"]);
  });

  it("imprime la carte mentale à compléter, puis, sur une autre page, les enchaînements, les cartes et le dé", () => {
    const pictoDe = (mot: string) => (mot === "qui" ? 9853 : mot === "été" ? 1234 : null);
    const images = { 9853: "data:image/png;base64,QQQ", 1234: "data:image/png;base64,EEE" };
    const html = htmlPriseDeParole({ ...REGLAGES_PAROLE, de: "questions" }, pictoDe, images);
    expect(html).toContain("cm-carte");
    expect(html).toContain("Qui ?");
    expect(html).toContain("data:image/png;base64,QQQ");
    expect(html).toContain("at-apres-carte");
    expect(html).toContain("Pour enchaîner mes idées");
    expect(html).toContain("data:image/png;base64,EEE");
    expect(html).toContain("<svg");
    expect(sansReferences(html)).not.toContain("reseau-canope.fr");
    // Sans carte, la fiche a son titre, et pas de saut avant elle.
    const seule = htmlPriseDeParole({ ...REGLAGES_PAROLE, carte: false }, sans, {});
    expect(seule).toContain("Je prépare ma prise de parole");
    expect(seule).not.toContain("at-apres-carte");
  });
});

describe("résoudre un problème", () => {
  it("garde les quatre étapes, avec x au collège et « ? » à l'école", () => {
    const ecole = htmlResolution(REGLAGES_RESOLUTION);
    expect(ecole).toContain("Que cherche-t-on ?");
    expect(ecole).toContain("Je l'écris avec un <b>?</b>");
    expect(ecole).toContain("Je calcule");
    expect(ecole).toContain("Je vérifie et je conclus");
    expect(ecole).toContain("La question, sous mes yeux");
    expect(ecole).toContain("J'entoure la question.");
    const college = htmlResolution({ ...REGLAGES_RESOLUTION, niveau: "college", ...EXEMPLES_RESOLUTION.college, couleurs: false, questionAPart: false });
    expect(college).toContain("On l'appelle <b>x</b>");
    expect(college).toContain("Mon équation");
    expect(college).toContain("Lina et Sami");
    expect(college).not.toContain("J'entoure la question.");
    expect(college).not.toContain("La question, sous mes yeux");
  });
});

describe("de la figure à l'équation, et la fonction", () => {
  it("balise les six phases, sur deux pages", () => {
    const html = htmlModelisation(REGLAGES_MODELISATION);
    for (let i = 1; i <= 6; i++) expect(html).toContain(`<span class="at-num">${i}</span>`);
    expect(html.match(/class="page"/g)).toHaveLength(2);
    expect(html).toContain("J'essaie AE =");
    expect(html).toContain("En découpant");
    expect(htmlModelisation({ ...REGLAGES_MODELISATION, essais: false, decoupage: false })).not.toContain("En découpant");
  });

  it("décortique la figure, puis le tableau de valeurs et le repère, à la demande", () => {
    const html = htmlFonction(REGLAGES_FONCTION);
    expect(html).toContain("Ce qui est fixe, ce qui bouge");
    expect(html).toContain("Premiers rôles");
    expect(html).toContain("x, c'est <b>AM</b>");
    expect(html).toContain("at-valeurs");
    expect(html).toContain("at-repere");
    const court = htmlFonction({ ...REGLAGES_FONCTION, tableau: false, repere: false });
    expect(court).not.toContain("at-valeurs");
    expect(court).not.toContain("Je calcule des valeurs");
  });
});
