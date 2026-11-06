// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import {
  avecLeursNumeros, decalageImprime, numeroEnTete,
  chiffresAbsents, consigneDeVerification, demandeDeVerification, extraitUtile, fidele, partRetrouvee, phraseCherchable, questionsFideles,
  apresLaReponse, avecLaSerie, citationDansLaPage, consigneDuQuiz, couvertureDuGuide, cycleDeLaClasse, debutDeLaCitation, demandeDeCorrection,
  demandeDuQuiz, derniereSerie, estUnGuideEnPdf, fichesDues, lireARevoir, lireHistorique, lireLaCorrection, lireLesQuestions, melangee,
  nettoyerLaPage, pageInterrogeable, pageTronquee, pagesAEssayer, pagesDejaVues, pagesDuTheme, plusJours, pointsDuVerdict, progresDuQuiz,
  racinesDuTheme, sansLaQuestion, scoreDuTheme, scoreEnClair,
  type FicheARevoir, type PageLue, type QuestionAChoix, type QuestionOuverte,
} from "./quizDesGuides";
import { hasard } from "./hasard";
import { aplatir, occurrences, texteSuivi } from "./rechercheDansPdf";

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
    expect(consigne).toMatch(/N'inventez rien : ni situation de classe, ni âge, ni chiffre/);
    expect(consigne).toMatch(/« pourquoi » dit en une phrase/);
  });

  it("retrouve la citation dans la page, même recopiée de travers, et montre celle du guide", () => {
    const exacte = "Il est recommandé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit.";
    expect(citationDansLaPage(exacte, PAGE_12)).toBe(exacte);
    // Un mot changé, la casse, une apostrophe courbe : c'est la phrase du guide qui revient.
    expect(citationDansLaPage("il est conseillé de ne pas multiplier les questions pendant la lecture, pour que les élèves suivent le fil du récit", PAGE_12))
      .toBe(exacte);
    expect(citationDansLaPage("Les élèves reformulent l’histoire avec leurs mots", PAGE_12))
      .toBe("Les élèves reformulent l'histoire avec leurs mots : la reformulation est le premier outil de la compréhension.");
    // Un morceau pris au milieu d'une phrase s'étend à la phrase entière, ponctuation comprise.
    expect(citationDansLaPage("explicite les liens entre les personnages", PAGE_12))
      .toBe("Le maître choisit des textes résistants, les lit plusieurs fois et explicite les liens entre les personnages.");
    expect(citationDansLaPage("on s'arrête ici pour voir", "Que faire ? on s'arrête ici pour voir la suite ? Oui."))
      .toBe("on s'arrête ici pour voir la suite ?");
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
    expect((qs[2] as QuestionOuverte).citation).toBe("On mesure les progrès en comptant les mots lus correctement en une minute, trois fois par période, et l'on montre ses progrès à l'élève.");
    // Ce qui ne se lit pas ne donne rien ; un JSON noyé dans du texte se lit.
    expect(lireLesQuestions("pas du JSON", pages, 1)).toEqual([]);
    expect(lireLesQuestions(`Voici :\n${JSON.stringify({ questions: [choix()] })}\nBonne lecture.`, pages, 1)).toHaveLength(1);
  });

  it("garde au plus une question ouverte, et pas plus de questions qu'une série n'en compte", () => {
    // Des questions distinctes, dans les mots de la page — un chiffre que la page n'a pas les ferait écarter.
    const debuts = ["Que", "Pourquoi", "Comment", "Quand", "Où", "Qui", "Avec quoi"];
    const beaucoup = debuts.map((d) => choix({ question: `${d} la lecture à voix haute aide-t-elle la compréhension ?` }));
    const ouverte = (d: string) => ({ sorte: "ouverte", page: 12, question: `${d} la reformulation sert-elle la compréhension, selon le guide ?`,
      attendu: "Reformuler l'histoire avec ses mots.", citation: "Les élèves reformulent l'histoire avec leurs mots" });
    const qs = lireLesQuestions(JSON.stringify({ questions: [...beaucoup, ouverte("Pourquoi"), ouverte("Comment")] }), pages, 1);
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

  it("lit pour chaque proposition pourquoi elle est juste ou fausse, et le garde avec elle quand elles se mélangent (« améliore encore »)", () => {
    const propositions = [
      { texte: "Ne pas multiplier les questions", juste: true, pourquoi: "Les élèves suivent ainsi le fil du récit." },
      { texte: "Poser une question par phrase", juste: false, pourquoi: "Le guide dit l'inverse : peu de questions pendant la lecture." },
      { texte: "Faire lire chaque élève à son tour", juste: false, pourquoi: "C'est l'enseignant qui lit." },
      { texte: "Interdire la reformulation", juste: false, pourquoi: "La reformulation est le premier outil de la compréhension." },
    ];
    const avecPourquoi = choix({ bonne: undefined, propositions });
    for (const graine of [1, 2, 3, 4, 5]) {
      const q = lireLesQuestions(JSON.stringify({ questions: [avecPourquoi] }), pages, graine)[0] as QuestionAChoix;
      expect(q.propositions[q.bonne]).toBe("Ne pas multiplier les questions");
      expect(q.pourquoi[q.bonne]).toBe("Les élèves suivent ainsi le fil du récit.");
      expect(q.pourquoi[q.propositions.indexOf("Faire lire chaque élève à son tour")]).toBe("C'est l'enseignant qui lit.");
    }
    // Deux propositions marquées justes, ou aucune sans « bonne » : la question ne se corrigerait pas.
    const deuxJustes = choix({ bonne: undefined, propositions: propositions.map((p, i) => ({ ...p, juste: i < 2 })) });
    const aucune = choix({ bonne: undefined, propositions: propositions.map((p) => ({ ...p, juste: false })) });
    expect(lireLesQuestions(JSON.stringify({ questions: [deuxJustes, aucune] }), pages, 1)).toEqual([]);
    // L'ancienne forme — des textes et la bonne recopiée — se lit toujours, sans « pourquoi ».
    expect((lireLesQuestions(JSON.stringify({ questions: [choix()] }), pages, 1)[0] as QuestionAChoix).pourquoi).toEqual(["", "", "", ""]);
    // Un nouveau mélange, pour revoir la question : la bonne et les « pourquoi » suivent.
    const q = lireLesQuestions(JSON.stringify({ questions: [avecPourquoi] }), pages, 1)[0] as QuestionAChoix;
    const encore = melangee(q, hasard(99));
    expect(encore.propositions[encore.bonne]).toBe(q.propositions[q.bonne]);
    expect(encore.propositions.map((p, i) => [p, encore.pourquoi[i]]).sort()).toEqual(q.propositions.map((p, i) => [p, q.pourquoi[i]]).sort());
    expect(encore.pourquoi[encore.bonne]).toBe(q.pourquoi[q.bonne]);
  });

  it("fait revenir une question manquée le jour même, puis trois et sept jours après chaque bonne réponse, jusqu'à ce qu'elle soit sue", () => {
    const guide = { titre: "Guide", url: "https://eduscol.education.gouv.fr/guide.pdf" };
    const q = lireLesQuestions(JSON.stringify({ questions: [choix()] }), pages, 1)[0];
    expect(plusJours("2026-11-03", 3)).toBe("2026-11-06");
    expect(plusJours("2026-10-24", 7)).toBe("2026-10-31");
    // Réussie du premier coup : rien à revoir.
    expect(apresLaReponse([], guide, q, 1, "2026-11-03")).toEqual([]);
    let fiches: FicheARevoir[] = apresLaReponse([], guide, q, 0, "2026-11-03");
    expect(fiches).toEqual([{ guide, question: q, boite: 1, echeance: "2026-11-03" }]);
    expect(fichesDues(fiches, "2026-11-03")).toHaveLength(1);
    fiches = apresLaReponse(fiches, guide, q, 1, "2026-11-03");
    expect(fiches.map((f) => [f.boite, f.echeance])).toEqual([[2, "2026-11-06"]]);
    expect(fichesDues(fiches, "2026-11-05")).toEqual([]);
    expect(fichesDues(fiches, "2026-11-06")).toHaveLength(1);
    fiches = apresLaReponse(fiches, guide, q, 1, "2026-11-06");
    expect(fiches.map((f) => [f.boite, f.echeance])).toEqual([[3, "2026-11-13"]]);
    // À moitié juste : retour au début ; puis trois réussites d'affilée, et elle est sue.
    fiches = apresLaReponse(fiches, guide, q, 0.5, "2026-11-13");
    expect(fiches.map((f) => [f.boite, f.echeance])).toEqual([[1, "2026-11-13"]]);
    for (const jour of ["2026-11-13", "2026-11-16", "2026-11-23"]) fiches = apresLaReponse(fiches, guide, q, 1, jour);
    expect(fiches).toEqual([]);
    // La même question, écrite autrement en casse, ne se double pas.
    const deux = apresLaReponse(apresLaReponse([], guide, q, 0, "2026-11-03"), guide, { ...q, question: q.question.toUpperCase() }, 0, "2026-11-04");
    expect(deux).toHaveLength(1);
    // Relue telle qu'enregistrée ; ce qui est abîmé s'en va.
    const relues = lireARevoir(JSON.stringify([...deux, { guide, question: { sorte: "choix", question: "?" }, boite: 1, echeance: "2026-11-03" }, { boite: 9 }]));
    expect(relues).toEqual(deux);
    expect(lireARevoir("{abîmé")).toEqual([]);
  });

  it("dit combien de pages d'un guide les séries ont déjà travaillées", () => {
    const url = "https://eduscol.education.gouv.fr/guide.pdf";
    expect(couvertureDuGuide([], url)).toBeNull();
    const h = [
      { url, titre: "Guide", date: "2026-11-03", points: 3, sur: 5, pages: [12, 14, 20], total: 48 },
      { url, titre: "Guide", date: "2026-11-04", points: 4, sur: 5, pages: [14, 21, 30], total: 48 },
    ];
    expect(couvertureDuGuide(h, url)).toEqual({ vues: 5, total: 48 });
    expect(lireHistorique(JSON.stringify(h))[0].total).toBe(48);
    expect(couvertureDuGuide([{ ...h[0], total: undefined }], url)).toBeNull();
  });

  it("révise un thème : les pages qui en parlent d'abord, et des questions sur lui (« continue l'amélioration »)", () => {
    expect(racinesDuTheme("La fluence")).toEqual(["fluenc"]);
    expect(racinesDuTheme("compréhension orale des élèves")).toEqual(["compre", "oral"]);
    expect(racinesDuTheme("dys")).toEqual(["dys"]);
    expect(racinesDuTheme("comment faire en classe ?")).toEqual([]);
    // La page 14 parle de fluence, la 12 non ; la prosodie aussi est sur la 14.
    expect(scoreDuTheme(PAGE_14, racinesDuTheme("fluence"))).toBeGreaterThan(100);
    expect(scoreDuTheme(PAGE_12, racinesDuTheme("fluence"))).toBe(0);
    expect(pagesDuTheme(pages, "la fluence", [])).toEqual([14]);
    expect(pagesDuTheme(pages, "la reformulation", [])).toEqual([12]);
    expect(pagesDuTheme(pages, "géométrie", [])).toEqual([]);
    // Deux pages qui en parlent : celle qu'aucune série n'a prise d'abord, puis la plus riche.
    const lecture = [{ numero: 3, texte: PAGE_12 }, { numero: 9, texte: PAGE_14 }];
    const avant = pagesDuTheme(lecture, "lecture des textes", []);
    expect(avant).toHaveLength(2);
    expect(pagesDuTheme(lecture, "lecture des textes", [avant[0]])).toEqual([avant[1], avant[0]]);
    const consigne = consigneDuQuiz("Guide", 5, "  la   fluence ");
    expect(consigne).toContain("L'enseignant veut réviser ce thème : « la fluence ».");
    expect(consigneDuQuiz("Guide")).not.toContain("réviser ce thème");
  });

  it("écarte une question mal posée, et dit où l'on en est, toutes séries confondues", () => {
    const guide = { titre: "Guide", url: "u" };
    const q = lireLesQuestions(JSON.stringify({ questions: [choix()] }), pages, 1)[0];
    const fiches = apresLaReponse([], guide, q, 0, "2026-11-03");
    expect(sansLaQuestion(fiches, "u", q.question.toLowerCase())).toEqual([]);
    expect(sansLaQuestion(fiches, "autre", q.question)).toHaveLength(1);
    expect(progresDuQuiz([], fiches)).toBeNull();
    const h = [
      { url: "u", titre: "Guide", date: "2026-11-03", points: 3.5, sur: 5, pages: [] },
      { url: "v", titre: "Autre", date: "2026-11-03", points: 4, sur: 4, pages: [] },
    ];
    expect(progresDuQuiz(h, fiches)).toEqual({ series: 2, pourcentage: 83, enRevision: 1 });
  });

  it("n'invente rien : une situation que la page ne décrit pas est écartée (« il faut pas qu'il hallucine », 2026-11-03)", () => {
    // Une page écrite pour l'essai, à la manière d'un programme : une énumération à tirets.
    const page28 = "Les élèves dessinent sur des supports variés (forme, texture, taille, plan vertical ou incliné) selon leur âge et leur habileté ; "
      + "– les élèves, par la dictée à l'adulte, peuvent dater, voire légender leurs dessins pour les comparer dans la durée et percevoir leurs progrès ; "
      + "– les élèves disposent de temps au cours desquels ils peuvent dessiner librement. "
      + "L'enseignant organise un espace où les productions restent visibles, et les élèves y reviennent pour les commenter ensemble. "
      + "Il varie les outils, les gestes et les formats, et il fait observer des œuvres pour enrichir les représentations des élèves.";
    const pages28: PageLue[] = [{ numero: 28, texte: page28 }];
    const citation = "– les élèves, par la dictée à l'adulte, peuvent dater, voire légender leurs dessins pour les comparer dans la durée et percevoir leurs progrès ;";
    const inventee = {
      sorte: "choix", page: 28,
      question: "Un élève de 3 ans dessine librement et montre son dessin à la classe. Que préconise le guide pour valoriser son travail et l'aider à progresser ?",
      propositions: [
        { texte: "Lui proposer de dater et légender son dessin avec l'aide de l'enseignant pour comparer ses progrès dans la durée", juste: true, pourquoi: "" },
        { texte: "Lui montrer des œuvres pour qu'il s'en inspire", juste: false, pourquoi: "" },
        { texte: "Lui faire recopier un modèle", juste: false, pourquoi: "" },
        { texte: "Lui demander de dessiner le même sujet plusieurs fois", juste: false, pourquoi: "" },
      ],
      explication: "La dictée à l'adulte permet de dater et légender.", citation,
    };
    const fideleQ = { ...inventee, question: "Que permet la dictée à l'adulte pour les dessins des élèves ?",
      propositions: [{ ...inventee.propositions[0], texte: "Dater et légender leurs dessins pour les comparer dans la durée" }, ...inventee.propositions.slice(1)] };
    // Le chiffre, l'âge : absents de la page.
    expect(chiffresAbsents(inventee.question, page28)).toBe(true);
    expect(chiffresAbsents("Que font les élèves de trois ans ?", "Les élèves de trois ans dessinent.")).toBe(false);
    expect(chiffresAbsents("Au CE1, trois fois par période", "En CE1, on mesure trois fois par période.")).toBe(false);
    expect(chiffresAbsents("Au CE2 ?", "En CE1, on mesure.")).toBe(true);
    // Les mots de la question ne viennent pas de la page : « montre », « valoriser »…
    expect(partRetrouvee("montre son dessin à la classe pour valoriser son travail", page28)).toBeLessThan(0.6);
    expect(fidele(inventee.question.replace("de 3 ans ", ""), inventee.propositions[0].texte, citation, page28)).toBe(false);
    expect(fidele(fideleQ.question, fideleQ.propositions[0].texte, citation, page28)).toBe(true);
    const qs = lireLesQuestions(JSON.stringify({ questions: [inventee, fideleQ] }), pages28, 1);
    expect(qs.map((q) => q.question)).toEqual([fideleQ.question]);
    // La correction ne montre que le tiret qui porte la réponse.
    expect(qs[0].citation).toBe("les élèves, par la dictée à l'adulte, peuvent dater, voire légender leurs dessins pour les comparer dans la durée et percevoir leurs progrès");
    expect(extraitUtile("Une phrase. Une autre phrase sans rapport.", "rien à voir")).toBe("Une phrase. Une autre phrase sans rapport.");
  });

  it("lit le texte d'un PDF comme on le lit : les mots coupés en morceaux se recollent, la phrase se retrouve dans le lecteur", () => {
    const m = (str: string, x: number, y: number, width: number, hasEOL = false) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10, hasEOL });
    expect(texteSuivi([m("les élèves peu", 0, 700, 70), m("ven", 70.5, 700, 18), m("t", 88.6, 700, 4), m("dater", 95, 700, 25, true), m("leurs dessins", 0, 688, 60)]))
      .toBe("les élèves peuvent dater\nleurs dessins");
    // Sur la même ligne, un écart d'un espace sépare deux mots ; un changement de ligne, sans fin de ligne marquée, aussi.
    expect(texteSuivi([m("au", 0, 700, 10), m("cours", 13, 700, 25), m("des", 0, 650, 15)])).toBe("au cours\ndes");
    // Le lecteur cherche dans le texte brut, où le mot reste coupé : on lui donne des mots qu'il y trouve.
    const brut = "les élèves , par la dictée à l'adulte, peu ven t dater, voire légender leurs dessins ";
    const phrase = "les élèves, par la dictée à l'adulte, peuvent dater, voire légender leurs dessins";
    const cherche = phraseCherchable(phrase, brut);
    expect(cherche).not.toBe("");
    expect(occurrences(aplatir([brut]).texte, cherche).length).toBeGreaterThan(0);
    expect(phraseCherchable("rien de tout cela ici", brut)).toBe("");
  });

  it("dit le numéro que la page imprime, quand il diffère de son rang dans le PDF", () => {
    // Le programme de maternelle : sa 28e page imprime « 27 » en tête.
    const lues: PageLue[] = [{ numero: 28, texte: "27 Conditions favorables aux apprentissages" }, { numero: 12, texte: "11 Produire des discours variés" },
      { numero: 40, texte: "39 Ou encore, si un certain nombre" }];
    expect(decalageImprime(lues)).toBe(1);
    expect(avecLeursNumeros(lues, 1).map((p) => p.etiquette)).toEqual(["27", "11", "39"]);
    // Une seule page, ou des chiffres qui ne s'accordent pas : rien de sûr.
    expect(decalageImprime([lues[0]])).toBeNull();
    expect(decalageImprime([{ numero: 28, texte: "27 a" }, { numero: 12, texte: "3 b" }, { numero: 30, texte: "12 c" }])).toBeNull();
    // Un nombre trop loin du rang n'est pas un numéro de page ; le même numéro que le rang ne change rien.
    expect(numeroEnTete("1998 Une date en tête", 5)).toBeUndefined();
    expect(decalageImprime([{ numero: 5, texte: "5 a" }, { numero: 6, texte: "b 6" }])).toBe(0);
    expect(avecLeursNumeros(lues, 0)).toEqual(lues);
    // Une étiquette donnée par le PDF lui-même reste.
    expect(avecLeursNumeros([{ numero: 3, texte: "", etiquette: "ii" }], 1)[0].etiquette).toBe("ii");
  });

  it("fait relire le test par Mistral, page en main, et ne garde que ce qu'il tient pour fidèle", () => {
    const qs = lireLesQuestions(JSON.stringify({ questions: [choix(), choix({ question: "Comment lisent les élèves en fluence ?", page: 14,
      propositions: ["À deux", "Seuls", "En silence", "Par écrit"], bonne: "À deux", citation: "puis les élèves lisent à deux, l'un écoutant l'autre" })] }), pages, 1);
    expect(qs).toHaveLength(2);
    expect(consigneDeVerification("Guide")).toMatch(/au moindre doute, la question n'est pas fidèle/);
    const demande = demandeDeVerification(pages, qs);
    expect(demande).toContain("[Page 12]");
    expect(demande).toContain("Question 2 (page 14) : Comment lisent les élèves en fluence ?\nBonne réponse : À deux");
    expect(questionsFideles('{"questions": [{"numero": 1, "fidele": false, "raison": "invente"}, {"numero": 2, "fidele": true}]}', qs)).toEqual([qs[1]]);
    // Une question qu'elle ne nomme pas, ou une réponse illisible : rien n'est tenu pour sûr.
    expect(questionsFideles('{"questions": [{"numero": 2, "fidele": true}]}', qs)).toEqual([qs[1]]);
    expect(questionsFideles("illisible", qs)).toEqual([]);
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
