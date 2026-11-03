import { describe, it, expect } from "vitest";
import {
  avecLaSerie, citationDansLaPage, consigneDuQuiz, cycleDeLaClasse, debutDeLaCitation, demandeDeCorrection, demandeDuQuiz, derniereSerie,
  estUnGuideEnPdf, lireHistorique, lireLaCorrection, lireLesQuestions, nettoyerLaPage, pageInterrogeable, pageTronquee, pagesAEssayer,
  pagesDejaVues, pointsDuVerdict, scoreEnClair, type PageLue, type QuestionOuverte,
} from "./quizDesGuides";

// Une page de guide écrite pour l'essai, dans le ton d'Éduscol.
const PAGE_12 = "La lecture à voix haute par l'enseignant est un moment quotidien de la classe. Elle permet aux élèves "
  + "d'entendre une langue plus riche que celle de l'oral spontané, et de comprendre des textes qu'ils ne sauraient pas encore lire seuls. "
  + "Le maître choisit des textes résistants, les lit plusieurs fois et explicite les liens entre les personnages. "
  + "Les élèves reformulent l'histoire avec leurs mots : la reformulation est le premier outil de la compréhension. "
  + "Il est recommandé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit. "
  + "Après la lecture, un échange collectif permet de vérifier ce que chacun a compris et de revenir sur les passages difficiles. "
  + "La lecture offerte se prolonge par des activités d'écriture, qui donnent aux élèves l'occasion de réemployer le vocabulaire du texte. "
  + "Le carnet de lecteur garde la trace des titres entendus et des impressions de chacun, pour que les élèves voient leur parcours de lecteur.";
const PAGE_14 = "La fluence se travaille chaque jour, par des lectures répétées de textes courts que les élèves connaissent déjà. "
  + "Chaque séance commence par une lecture modèle de l'enseignant, puis les élèves lisent à deux, l'un écoutant l'autre. "
  + "On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période, et l'on montre ses progrès à l'élève. "
  + "La prosodie, c'est-à-dire le respect des groupes de souffle et de la ponctuation, est travaillée dès que le décodage devient sûr. "
  + "Les élèves les plus lents bénéficient d'un temps supplémentaire, en petit groupe, avec des textes adaptés à leur niveau. "
  + "Les familles peuvent être associées par de courtes lectures à la maison, sur des textes déjà travaillés en classe et maîtrisés.";
const pages: PageLue[] = [{ numero: 12, texte: PAGE_12 }, { numero: 14, texte: PAGE_14 }];

const choix = (o: Record<string, unknown> = {}) => ({
  sorte: "choix", page: 12, question: "Que recommande le guide pendant la lecture à voix haute ?",
  propositions: ["Ne pas multiplier les questions", "Poser une question par phrase", "Faire lire chaque élève à son tour", "Interdire la reformulation"],
  bonne: "Ne pas multiplier les questions", explication: "Les élèves doivent pouvoir suivre le fil du récit.",
  citation: "Il est recommandé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit.", ...o,
});

describe("le quiz des guides Éduscol (demande de l'enseignant, 3 novembre 2026)", () => {
  it("recolle les mots coupés en fin de ligne, et ne garde que les pages de texte suivi", () => {
    expect(nettoyerLaPage("la compré-\nhension des  élèves\n  en lecture")).toBe("la compréhension des élèves en lecture");
    // Un trait d'union entre deux noms propres, ou devant une capitale, reste.
    expect(nettoyerLaPage("Saint-\nÉtienne")).toBe("Saint- Étienne");
    expect(pageInterrogeable(PAGE_12)).toBe(true);
    expect(pageInterrogeable("Sommaire")).toBe(false);
    const sommaire = Array.from({ length: 30 }, (_, i) => `Chapitre ${i + 1} : la lecture et la compréhension des textes ........ ${i * 3 + 4}`).join(" ");
    expect(pageInterrogeable(sommaire)).toBe(false);
    const chiffres = Array.from({ length: 200 }, (_, i) => `${i * 17} % ${i}`).join(" ");
    expect(pageInterrogeable(chiffres)).toBe(false);
    expect(pageTronquee(PAGE_12, 400).endsWith("personnages.")).toBe(true);
    expect(pageTronquee(PAGE_12, 400).length).toBeLessThanOrEqual(400);
    expect(pageTronquee("court.")).toBe("court.");
  });

  it("essaie d'abord les pages que les séries d'avant n'ont pas prises, au hasard de la graine", () => {
    const ordre = pagesAEssayer(10, [3, 4], 7);
    expect([...ordre].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ordre.slice(-2).sort()).toEqual([3, 4]);
    expect(pagesAEssayer(10, [3, 4], 7)).toEqual(ordre);
    expect(pagesAEssayer(10, [3, 4], 8)).not.toEqual(ordre);
    expect(pagesAEssayer(0, [], 1)).toEqual([]);
  });

  it("donne à Mistral les pages sous leur numéro, et lui demande la phrase qui justifie chaque réponse", () => {
    const demande = demandeDuQuiz(pages);
    expect(demande.startsWith("[Page 12]\nLa lecture à voix haute")).toBe(true);
    expect(demande).toContain("\n\n[Page 14]\nLa fluence");
    const consigne = consigneDuQuiz("Pour enseigner la lecture et l'écriture au CP");
    expect(consigne).toContain("« Pour enseigner la lecture et l'écriture au CP »");
    expect(consigne).toMatch(/recopiée mot pour mot/);
    expect(consigne).toMatch(/4 questions à choix/);
  });

  it("retrouve la citation dans la page, même recopiée de travers, et montre celle du guide", () => {
    const exacte = "Il est recommandé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit.";
    expect(citationDansLaPage(exacte, PAGE_12)).toBe(exacte);
    // Un mot changé, la casse, une apostrophe courbe : c'est la phrase du guide qui revient.
    expect(citationDansLaPage("il est conseillé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit", PAGE_12))
      .toBe(exacte);
    expect(citationDansLaPage("Les élèves reformulent l’histoire avec leurs mots", PAGE_12)).toBe("Les élèves reformulent l'histoire avec leurs mots");
    // Une phrase que la page ne dit pas, ou trop courte pour prouver quoi que ce soit : rien.
    expect(citationDansLaPage("Il faut corriger chaque erreur de lecture à voix haute immédiatement devant la classe.", PAGE_12)).toBeNull();
    expect(citationDansLaPage("la lecture", PAGE_12)).toBeNull();
    expect(debutDeLaCitation(exacte)).toBe("Il est recommandé de ne pas");
  });

  it("ne garde que les questions qui se vérifient, mélange les propositions, et finit par une question ouverte", () => {
    const ouverte = {
      sorte: "ouverte", page: 14, question: "Comment mesurer les progrès en fluence ?",
      attendu: "En comptant les mots lus correctement en une minute, plusieurs fois par période.",
      citation: "On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période",
    };
    const brut = JSON.stringify({ questions: [
      ouverte,
      choix(),
      // La citation est sur la page 14, pas la 12 : la question prend la bonne page.
      choix({ question: "Comment lisent les élèves en fluence ?", page: 12, propositions: ["À deux", "Seuls", "En silence", "Par écrit"], bonne: "À deux",
        citation: "puis les élèves lisent à deux, l'un écoutant l'autre" }),
      // Une citation inventée, une bonne réponse absente, deux propositions identiques, « toutes les réponses » : écartées.
      choix({ question: "Q inventée ?", citation: "La lecture à voix haute doit durer exactement quinze minutes chaque matin avant la récréation." }),
      choix({ question: "Q sans bonne ?", bonne: "Autre chose" }),
      choix({ question: "Q en double ?", propositions: ["Ne pas multiplier les questions", "ne pas multiplier les questions !", "Lire", "Écrire"] }),
      choix({ question: "Q fourre-tout ?", propositions: ["Ne pas multiplier les questions", "Lire", "Écrire", "Toutes les réponses sont justes"] }),
      // La même question deux fois : une seule.
      choix(),
    ] });
    const qs = lireLesQuestions(brut, pages, 3);
    expect(qs.map((q) => [q.sorte, q.page])).toEqual([["choix", 12], ["choix", 14], ["ouverte", 14]]);
    const premiere = qs[0];
    if (premiere.sorte !== "choix") throw new Error("une question à choix d'abord");
    expect(premiere.propositions[premiere.bonne]).toBe("Ne pas multiplier les questions");
    expect([...premiere.propositions].sort()).toEqual([...choix().propositions].sort());
    // Selon la graine, la bonne réponse change de place : le modèle ne la met plus toujours en tête.
    const places = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((g) => (lireLesQuestions(brut, pages, g)[0] as { bonne: number }).bonne));
    expect(places.size).toBeGreaterThan(1);
    expect((qs[2] as QuestionOuverte).citation).toBe("On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période");
    // Ce qui ne se lit pas ne donne rien ; un JSON noyé dans du texte se lit.
    expect(lireLesQuestions("pas du JSON", pages, 1)).toEqual([]);
    expect(lireLesQuestions(`Voici :\n${JSON.stringify({ questions: [choix()] })}\nBonne lecture.`, pages, 1)).toHaveLength(1);
  });

  it("garde au plus une question ouverte, et pas plus de questions qu'une série n'en compte", () => {
    const beaucoup = Array.from({ length: 7 }, (_, i) => choix({ question: `Question ${i} ?` }));
    const ouverte = (q: string) => ({ sorte: "ouverte", page: 12, question: q, attendu: "Reformuler.", citation: "Les élèves reformulent l'histoire avec leurs mots" });
    const qs = lireLesQuestions(JSON.stringify({ questions: [...beaucoup, ouverte("O1 ?"), ouverte("O2 ?")] }), pages, 1);
    expect(qs.map((q) => q.sorte)).toEqual(["choix", "choix", "choix", "choix", "ouverte"]);
    expect(lireLesQuestions(JSON.stringify({ questions: beaucoup }), pages, 1)).toHaveLength(5);
  });

  it("fait corriger la question ouverte d'après l'attendu et la phrase du guide", () => {
    const q: QuestionOuverte = { sorte: "ouverte", question: "Comment ?", attendu: "En comptant.", citation: "On compte.", page: 14 };
    expect(demandeDeCorrection(q, "  En les comptant  ")).toBe("Question : Comment ?\nRéponse attendue : En comptant.\nPhrase du guide (p. 14) : « On compte. »\n\nRéponse de l'enseignant : En les comptant");
    expect(lireLaCorrection('{"verdict": "en partie", "retour": "Il manque la fréquence."}')).toEqual({ verdict: "en partie", retour: "Il manque la fréquence." });
    expect(lireLaCorrection('{"verdict": "A revoir", "retour": ""}')?.verdict).toBe("à revoir");
    expect(lireLaCorrection('{"verdict": "peut-être"}')).toBeNull();
    expect(lireLaCorrection("rien")).toBeNull();
    expect([pointsDuVerdict("juste"), pointsDuVerdict("en partie"), pointsDuVerdict("à revoir")]).toEqual([1, 0.5, 0]);
  });

  it("garde les séries faites : le dernier score d'un guide, et les pages déjà prises", () => {
    const url = "https://eduscol.education.gouv.fr/guide.pdf";
    let h = lireHistorique(null);
    h = avecLaSerie(h, { url, titre: "Guide", date: "2026-11-03", points: 3.5, sur: 5, pages: [12, 14] });
    h = avecLaSerie(h, { url: "autre", titre: "Autre", date: "2026-11-03", points: 5, sur: 5, pages: [2] });
    h = avecLaSerie(h, { url, titre: "Guide", date: "2026-11-04", points: 4, sur: 5, pages: [14, 20] });
    expect(lireHistorique(JSON.stringify(h))).toEqual(h);
    expect(derniereSerie(h, url)?.points).toBe(4);
    expect(derniereSerie(h, "inconnu")).toBeUndefined();
    expect(pagesDejaVues(h, url)).toEqual([12, 14, 20]);
    expect(scoreEnClair(3.5, 5)).toBe("3,5 / 5");
    expect(lireHistorique('[{"url": "x", "points": 9, "sur": 5, "pages": [1, -2, "3"]}, {"url": "", "points": 1, "sur": 5}, 4]'))
      .toEqual([{ url: "x", titre: "", date: "", points: 5, sur: 5, pages: [1] }]);
    expect(lireHistorique("{abîmé")).toEqual([]);
  });

  it("propose d'abord les guides du cycle de la classe, et seulement des PDF", () => {
    expect(cycleDeLaClasse(["CP", "CE1"])).toBe("Cycle 2");
    expect(cycleDeLaClasse(["GS"])).toBe("Cycle 1");
    expect(cycleDeLaClasse(["GS", "CP"])).toBe("");
    expect(cycleDeLaClasse([])).toBe("");
    expect(estUnGuideEnPdf("https://eduscol.education.gouv.fr/document/1234/download")).toBe(true);
    expect(estUnGuideEnPdf("https://eduscol.education.gouv.fr/guide.pdf")).toBe(true);
    expect(estUnGuideEnPdf("https://eduscol.education.gouv.fr/1234/ecole-inclusive")).toBe(false);
  });
});
