import { describe, expect, it } from "vitest";
import type { ChatMessage } from "./api";
import {
  BESOINS_DU_NIVEAU_1, FICHE_PRETE, LA_METHODE, LEVIERS_DU_NIVEAU_2, TOURS_DE_QUESTIONS_MAX, auPlus, consigneDeLaFiche, consigneDesQuestions, conversationDuCadre,
  demandeDePreparation, ficheEnMarkdown, lireFiche, lireJson, lireLesQuestions, matiereDeLaFiche, messageDesQuestions, parleAMistral, phrasesDe, questionDeConfirmation,
  redigerLaFiche, reponseALaConfirmation, seancesDeLaFiche, sequenceDeLaFiche, tourDuCadre, type FicheDeSeance,
} from "./cadreDeSeance";
import { CHAMP_POSTURE, champDe, lireSeance } from "./documentSeance";
import { markdownVersHtml } from "./documentIa";

/** Une fiche comme Mistral devrait la rendre. */
const reponse = (o: Record<string, unknown> = {}) => ({
  titre: "Les fractions simples", niveau: "CM1", matiere: "Mathématiques", demarche: "Situation-problème", notion: "La fraction comme partage",
  objectif_pedagogique: "Permettre à l'élève de partager une unité.", objectif_apprentissage: "À la fin de cette séquence, les élèves sauront écrire une fraction simple.",
  prerequis: "Compter jusqu'à cent.", obstacles_possibles: "Garder en mémoire les étapes du partage.", criteres_reussite: "L'élève écrit la fraction d'un partage. Il explique son choix.",
  attendus: ["Comprendre et utiliser la notion de fractions simples"],
  seances: [
    { titre: "Partager une bande", duree: 45, objectif: "À la fin de cette séance, les élèves sauront partager une bande.", supports: "bandes de papier ; ciseaux",
      phases: [{ temps: "5 min", phase: "Mise en situation", enseignant: "Il montre une bande. Il pose le problème.", eleves: "Ils cherchent par deux.", observable: "Ils plient la bande." }] },
    { titre: "Écrire la fraction", duree: 40, objectif: "À la fin de cette séance, les élèves sauront écrire une fraction.", supports: "ardoises",
      phases: [{ temps: "10 minutes", phase: "Recherche", enseignant: "Il observe.", eleves: "Ils écrivent.", observable: "Ils notent la fraction." }] },
  ],
  vigilance: "La fraction n'est pas deux nombres séparés.",
  niveau1: BESOINS_DU_NIVEAU_1.map((besoin) => ({ besoin, reponse: `Pour ${besoin} : un repère affiché au tableau.` })),
  niveau2: LEVIERS_DU_NIVEAU_2.map((levier) => ({ levier, reponse: `Pour ${levier} : des bandes déjà pliées, à portée de tous.` })),
  niveau3: [{ obstacle: "Garder les étapes en mémoire le temps de la tâche.", besoin: "Besoin d'un repère pour suivre les étapes", objectif_vise: "Écrire une fraction simple.", adaptation: "Une carte-étapes posée sur la table.", aide: "Elle libère la mémoire.", vigilance: "Elle se retire peu à peu." }],
  ...o,
});
const PERMIS = ["Comprendre et utiliser la notion de fractions simples."];
const fiche = (o = {}, sorte: "seance" | "sequence" = "sequence") => lireFiche(reponse(o), sorte, PERMIS);

describe("reconnaître une séance ou une séquence demandée", () => {
  it("reconnaît ce qui se demande, dit ou écrit", () => {
    for (const t of [
      "Propose-moi une séquence de 5 séances sur les fractions en CM1.", "fais-moi une séquence sur le cycle de l'eau", "je voudrais une séquence pour mes CP",
      "Une séquence sur les volcans", "séquence sur les doubles en CE1", "tu peux me faire trois séances sur les volcans ?", "Je cherche des séances de motricité",
      "Bah, euh, prépare-moi une séquence sur la météo",
    ]) expect(demandeDePreparation(t), t).toBe("sequence");
    for (const t of [
      "je voudrais préparer une séance de lecture pour mes CP", "j'ai besoin d'une séance sur les doubles", "Propose une séance de remédiation", "Aide-moi à préparer ma prochaine séance de maths",
      "prépare ma séance de demain", "séance de lecture en CP", "il me faut une petite séance sur les syllabes",
    ]) expect(demandeDePreparation(t), t).toBe("seance");
  });

  it("laisse passer tout le reste", () => {
    for (const t of [
      "c'est quoi une séquence ?", "Qu'est-ce qu'une séance décrochée ?", "reformule l'objectif de ma séance", "Idées de différenciation pour un élève en difficulté en numération.",
      "Donne 3 ateliers autonomes de lecture pour des CP.", "pendant une séance de lecture, un élève s'agite, que faire ?", "comment organiser une séance de sport ?", "Quelle est la durée d'une séance ?",
      "Parle-moi de ton système", "merci",
    ]) expect(demandeDePreparation(t), t).toBeNull();
  });
});

describe("le « oui » et le « non »", () => {
  it("lit un oui ou un non, dits de toutes les façons", () => {
    for (const t of ["oui", "Oui.", "ouais", "Bah oui", "vas-y", "d'accord", "ok merci", "c'est parti", "Allez"]) expect(reponseALaConfirmation(t, "sequence").genre, t).toBe("oui");
    for (const t of ["non", "Non merci", "nan", "pas maintenant", "laisse tomber"]) expect(reponseALaConfirmation(t, "sequence").genre, t).toBe("non");
    expect(reponseALaConfirmation("les fractions en CM1", "sequence").genre).toBe("autre");
  });

  it("garde ce qui précise la demande, et laisse changer de sorte", () => {
    expect(reponseALaConfirmation("oui", "sequence").seule).toBe(true);
    expect(reponseALaConfirmation("oui merci", "sequence").seule).toBe(true);
    expect(reponseALaConfirmation("oui, mais en CE2", "sequence").seule).toBe(false);
    expect(reponseALaConfirmation("non, plutôt une séance", "sequence")).toMatchObject({ genre: "oui", sorte: "seance", seule: false });
    expect(reponseALaConfirmation("plutôt une séquence", "seance")).toMatchObject({ genre: "oui", sorte: "sequence" });
    expect(reponseALaConfirmation("oui, 5 séances", "sequence")).toMatchObject({ genre: "oui", sorte: "sequence" });
  });
});

describe("le fil de la conversation", () => {
  const confirmation: ChatMessage = { role: "assistant", content: questionDeConfirmation("sequence"), cadre: { etape: "confirmation", sorte: "sequence" } };
  const questions = (tour: number): ChatMessage => ({ role: "assistant", content: "Quel niveau ?", cadre: { etape: "questions", sorte: "sequence", tour } });
  const ficheFaite: ChatMessage = { role: "assistant", content: "# Fiche", cadre: { etape: "fiche", sorte: "sequence", fiche: fiche().fiche, notes: [] } };
  const demande: ChatMessage = { role: "user", content: "une séquence sur les fractions" };

  it("demande confirmation avant de démarrer ; « oui », et ça démarre", () => {
    expect(tourDuCadre([], "une séquence sur les fractions")).toEqual({ genre: "confirmer", sorte: "sequence" });
    expect(tourDuCadre([demande, confirmation], "oui")).toEqual({ genre: "cadrer", sorte: "sequence", tour: 1, seule: true });
    expect(tourDuCadre([demande, confirmation], "oui, en CE2")).toEqual({ genre: "cadrer", sorte: "sequence", tour: 1, seule: false });
  });

  it("répond comme d'habitude après un « non »", () => {
    expect(tourDuCadre([demande, confirmation], "non")).toEqual({ genre: "decline", seule: true });
    expect(tourDuCadre([demande, confirmation], "non, juste des idées")).toEqual({ genre: "decline", seule: false });
  });

  it("prend pour un oui ce qui continue de décrire, pas ce qui pose une question", () => {
    expect(tourDuCadre([demande, confirmation], "en CM1, avec des bandes de papier")).toMatchObject({ genre: "cadrer", tour: 1 });
    expect(tourDuCadre([demande, confirmation], "ça coûte combien ?")).toEqual({ genre: "normal" });
  });

  it("repose des questions deux fois au plus, puis rédige ; on peut aussi l'en dispenser, ou tout laisser", () => {
    expect(tourDuCadre([questions(1)], "en CM1")).toEqual({ genre: "cadrer", sorte: "sequence", tour: 2, seule: false });
    expect(tourDuCadre([questions(TOURS_DE_QUESTIONS_MAX)], "45 minutes")).toEqual({ genre: "rediger", sorte: "sequence" });
    for (const t of ["Rédige maintenant", "vas-y", "je ne sais pas", "peu importe"]) expect(tourDuCadre([questions(1)], t), t).toEqual({ genre: "rediger", sorte: "sequence" });
    expect(tourDuCadre([questions(1)], "laisse tomber")).toEqual({ genre: "abandon" });
    // « Non » répond à la question : il n'abandonne rien.
    expect(tourDuCadre([questions(1)], "non")).toMatchObject({ genre: "cadrer" });
  });

  it("retouche la fiche quand on demande un changement, et laisse le reste à la conversation", () => {
    expect(tourDuCadre([ficheFaite], "mets 4 séances plutôt que 2")).toMatchObject({ genre: "retoucher", sorte: "sequence" });
    expect(tourDuCadre([ficheFaite], "merci beaucoup")).toEqual({ genre: "normal" });
    expect(tourDuCadre([ficheFaite], "fais-moi une séance sur les volcans")).toEqual({ genre: "confirmer", sorte: "seance" });
    const loin: ChatMessage[] = [ficheFaite, { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }, { role: "assistant", content: "d" }];
    expect(tourDuCadre(loin, "mets 4 séances")).toEqual({ genre: "normal" });
  });

  it("n'envoie ni la confirmation, ni le « oui » seul ; coupe les longues réponses", () => {
    const oui: ChatMessage = { role: "user", content: "oui", cadre: { etape: "reponse" } };
    expect([demande, confirmation, oui].filter(parleAMistral)).toEqual([demande]);
    const long: ChatMessage = { role: "assistant", content: "x".repeat(4000) };
    const conv = conversationDuCadre([demande, confirmation, oui, long, { role: "user", content: "suite" }]);
    expect(conv.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(conv[1].content.length).toBeLessThan(1600);
    // Ni le cadre, ni la voix : seulement ce qui se dit.
    expect(Object.keys(conv[0])).toEqual(["role", "content"]);
  });
});

describe("ce que Mistral reçoit", () => {
  it("donne la méthode et ses auteurs, le format, ce qu'on sait de la classe, les programmes", () => {
    const c = consigneDeLaFiche("sequence", { contexte: "Classe de CM1", memoire: "souvenir", materiel: "- une balance", programmes: "- attendu" });
    expect(c).toContain(LA_METHODE);
    expect(c).toContain("Ryckebusch, Carra et Cadalen, 2026");
    for (const b of [...BESOINS_DU_NIVEAU_1, ...LEVIERS_DU_NIVEAU_2]) expect(c).toContain(b);
    for (const t of ["Classe de CM1", "souvenir", "une balance", "- attendu", "de 4 à 6"]) expect(c).toContain(t);
    expect(consigneDeLaFiche("seance", {})).toContain("une seule entrée");
    expect(consigneDeLaFiche("seance", {})).not.toContain("Contexte de la classe");
  });

  it("n'impose pas de démarche, à la différence de M2PA", () => {
    expect(LA_METHODE).toMatch(/si l'enseignant en dit une/);
    expect(LA_METHODE).not.toMatch(/socio-constructiviste/);
  });

  it("demande moins de questions au second tour, et les élèves une seule fois", () => {
    expect(consigneDesQuestions("sequence", 1, {})).toMatch(/au plus deux questions/);
    expect(consigneDesQuestions("sequence", 1, {})).toMatch(/sans prénom ni diagnostic/);
    expect(consigneDesQuestions("sequence", 2, {})).toMatch(/au plus une question/);
    expect(consigneDesQuestions("sequence", 2, {})).not.toMatch(/sans prénom ni diagnostic/);
  });
});

describe("ce que Mistral répond", () => {
  const sansMasque = (t: string) => t;

  it("lit le JSON, même entouré de texte, et refuse le reste", () => {
    expect(lireJson('Voici : {"a":1} !')).toEqual({ a: 1 });
    expect(lireJson("pas de JSON")).toBeNull();
    expect(lireJson("[1,2]")).toBeNull();
  });

  it("lit les questions : deux au plus, avec les vrais noms", () => {
    const q = lireLesQuestions('{"compris":"Pour [P1].","questions":["a ?","b ?","c ?"]}', (t) => t.replace("[P1]", "Sam"));
    expect(q).toEqual({ compris: "Pour Sam.", questions: ["a ?", "b ?"] });
    expect(lireLesQuestions("illisible", sansMasque)).toEqual({ compris: "", questions: [] });
    expect(messageDesQuestions(q)).toBe("Pour Sam.\n\n- a ?\n- b ?");
    expect(messageDesQuestions({ compris: "Compris.", questions: ["seule ?"] })).toBe("Compris.\n\nseule ?");
  });

  it("compte les phrases sans se laisser prendre aux abréviations", () => {
    expect(phrasesDe("Un. Deux ! Trois ?")).toEqual(["Un.", "Deux !", "Trois ?"]);
    expect(phrasesDe("Voir p. 12 du livre, ex. : Une bande. Puis un autre.")).toHaveLength(2);
    expect(phrasesDe("Il dit 3.5 et 4.")).toHaveLength(1);
    expect(auPlus("Un. Deux. Trois.", 2)).toBe("Un. Deux.");
    expect(auPlus("", 2)).toBe("");
  });

  it("tient le plafond de phrases, sans redemander", () => {
    const f = fiche({ obstacles_possibles: "Un. Deux. Trois.", vigilance: "A. B. C. D." });
    expect(f.fiche.obstacles).toBe("Un. Deux.");
    expect(f.fiche.vigilance).toBe("A. B.");
    expect(f.problemes).toEqual([]);
  });

  it("remet les huit besoins dans l'ordre, sous leur nom, même renommés ou mélangés", () => {
    const f = fiche({ niveau1: [...BESOINS_DU_NIVEAU_1].reverse().map((besoin) => ({ besoin: `Le besoin : ${besoin}`, reponse: `pour ${besoin}.` })) });
    expect(f.fiche.niveau1.map((b) => b.besoin)).toEqual([...BESOINS_DU_NIVEAU_1]);
    expect(f.fiche.niveau1[0].reponse).toBe("pour Sécurisation.");
    expect(f.problemes).toEqual([]);
    const places = fiche({ niveau1: BESOINS_DU_NIVEAU_1.map((_, i) => ({ besoin: `n° ${i}`, reponse: `r${i}.` })) });
    expect(places.fiche.niveau1[7]).toEqual({ besoin: "Automatisation", reponse: "r7." });
  });

  it("signale ce qui manque aux niveaux 1 et 2, et les séances absentes", () => {
    expect(fiche({ niveau1: [{ besoin: "Sécurisation", reponse: "Oui." }] }).problemes.join()).toMatch(/niveau 1.*Sens des apprentissages/);
    expect(fiche({ niveau2: [] }).problemes.join()).toMatch(/niveau 2.*Contenus, Processus, Productions/);
    expect(fiche({ seances: [] }).problemes.join()).toMatch(/aucune séance/);
    expect(fiche({ seances: [reponse().seances[0]] }).problemes.join()).toMatch(/plusieurs séances/);
    expect(fiche({ seances: [reponse().seances[0]] }, "seance").problemes).toEqual([]);
    expect(fiche({ seances: [{ titre: "x", phases: [] }, { titre: "y", phases: [] }] }).problemes.join()).toMatch(/séance 1 n'a aucune phase/);
  });

  it("refuse les formules creuses, les diagnostics, et les difficultés dans les critères", () => {
    expect(fiche({ niveau2: LEVIERS_DU_NIVEAU_2.map((levier) => ({ levier, reponse: "Adapter les consignes." })) }).problemes.join()).toMatch(/formule creuse/);
    const avec = fiche({ niveau3: [{ obstacle: "Il est autiste et dyslexique.", adaptation: "Une carte." }] });
    expect(avec.problemes.join()).toMatch(/diagnostic \(autiste, dyslexique\)/);
    expect(fiche({ criteres_reussite: "L'élève surmonte ses difficultés." }).problemes.join()).toMatch(/critères de réussite/);
  });

  it("ne garde que les attendus retrouvés dans les programmes, et le dit", () => {
    const f = fiche({ attendus: ["Comprendre et utiliser la notion de fractions simples", "Un attendu inventé de toutes pièces"] });
    expect(f.fiche.attendus).toEqual(["Comprendre et utiliser la notion de fractions simples"]);
    expect(f.notes.join()).toMatch(/Un attendu du programme retiré/);
    expect(lireFiche(reponse(), "sequence", []).fiche.attendus).toEqual([]);
    // Un bout de mot se trouve partout : il ne prouve rien.
    expect(fiche({ attendus: ["a", "fractions simples"] })).toMatchObject({ fiche: { attendus: [] }, notes: [expect.stringMatching(/2 attendus/)] });
    // Un extrait assez long, si : la citation n'a pas à être entière.
    expect(fiche({ attendus: ["utiliser la notion de fractions"] }).fiche.attendus).toHaveLength(1);
  });

  it("lit une durée et un temps de phase, même mal dits", () => {
    const f = fiche().fiche;
    expect(f.seances[1].phases[0].temps).toBe("10 min");
    expect(fiche({ seances: [{ titre: "a", duree: "beaucoup", phases: [{ phase: "p", temps: "un moment" }] }, reponse().seances[1]] }).fiche.seances[0]).toMatchObject({ duree: 45, phases: [{ temps: "" }] });
  });

  it("demande une correction, une seule, et prend ce qui vient", async () => {
    const appels: unknown[][] = [];
    const reponses = [JSON.stringify(reponse({ niveau2: [] })), JSON.stringify(reponse())];
    const r = await redigerLaFiche({
      sorte: "sequence", messages: [{ role: "system", content: "s" }], permis: PERMIS, rendre: sansMasque,
      appeler: async (m) => { appels.push(m); return reponses.shift()!; },
    });
    expect(appels).toHaveLength(2);
    expect(JSON.stringify(appels[1])).toMatch(/Corrige seulement ceci/);
    expect("fiche" in r && r.fiche.niveau2.every((l) => l.reponse)).toBe(true);
  });

  it("ne redemande rien si la fiche est bonne ; garde la fiche et dit ce qui reste après une correction ratée", async () => {
    let n = 0;
    const appeler = async () => { n++; return JSON.stringify(reponse({ niveau2: [] })); };
    const r = await redigerLaFiche({ sorte: "sequence", messages: [], permis: PERMIS, rendre: sansMasque, appeler });
    expect(n).toBe(2);
    expect("notes" in r && r.notes.join()).toMatch(/niveau 2/);
    let m = 0;
    await redigerLaFiche({ sorte: "sequence", messages: [], permis: PERMIS, rendre: sansMasque, appeler: async () => { m++; return JSON.stringify(reponse()); } });
    expect(m).toBe(1);
  });

  it("échoue en le disant si rien n'est lisible, deux fois", async () => {
    await expect(redigerLaFiche({ sorte: "seance", messages: [], permis: [], rendre: sansMasque, appeler: async () => "pas de JSON" })).rejects.toThrow(/pas pu être rédigée/);
  });

  it("demande de ne nommer aucun élève ; s'il insiste, le dit", async () => {
    const reponses = [JSON.stringify(reponse({ vigilance: "Pour [P1], attention." })), JSON.stringify(reponse())];
    const bonne = await redigerLaFiche({ sorte: "sequence", messages: [], permis: PERMIS, rendre: sansMasque, appeler: async () => reponses.shift()! });
    expect("notes" in bonne && bonne.notes).toEqual([]);
    expect(reponses).toHaveLength(0);
    const entetee = await redigerLaFiche({ sorte: "sequence", messages: [], permis: PERMIS, rendre: sansMasque, appeler: async () => JSON.stringify(reponse({ vigilance: "Pour [P1], attention." })) });
    expect("notes" in entetee && entetee.notes.join()).toMatch(/nomme un élève/);
  });

  it("répond à une simple question sans toucher à la fiche", async () => {
    const r = await redigerLaFiche({ sorte: "seance", messages: [], permis: [], rendre: (t) => t.replace("[P1]", "Sam"), appeler: async () => '{"reponse":"Pour [P1], oui."}' });
    expect(r).toEqual({ reponse: "Pour Sam, oui." });
  });

  it("rend les vrais noms, partout dans la fiche, après avoir lu le JSON", async () => {
    const r = await redigerLaFiche({
      sorte: "sequence", messages: [], permis: PERMIS, rendre: (t) => t.replace("[P1]", 'Sam "le grand"'),
      appeler: async () => JSON.stringify(reponse({ niveau3: [{ obstacle: "Pour [P1], les étapes s'oublient.", adaptation: "Une carte." }] })),
    });
    expect("fiche" in r && r.fiche.niveau3[0].obstacle).toBe('Pour Sam "le grand", les étapes s\'oublient.');
  });
});

describe("ce qu'on fait de la fiche", () => {
  const f: FicheDeSeance = fiche().fiche;

  it("s'affiche et s'imprime : le déroulé et les niveaux en tableaux, les crédits en bas", () => {
    const md = ficheEnMarkdown(f, "sequence");
    expect(md).toContain("# Les fractions simples");
    expect(md).toContain("CM1 · Mathématiques · 2 séances · Situation-problème");
    expect(md).toContain("## Séance 2 : Écrire la fraction (40 min)");
    expect(md).toContain("« Comprendre et utiliser la notion de fractions simples »");
    expect(md).toMatch(/M2PA \(Ryckebusch, Carra et Cadalen, 2026\)/);
    const html = markdownVersHtml(md, { titres: "chat" });
    expect(html.match(/<table>/g)).toHaveLength(4);
    for (const b of BESOINS_DU_NIVEAU_1) expect(html).toContain(b);
    expect(ficheEnMarkdown(fiche({ seances: [reponse().seances[0]] }, "seance").fiche, "seance")).toContain("## Le déroulé (45 min)");
    // « Besoin : Besoin de… » se lirait mal.
    expect(md).toContain("- Besoin d'un repère pour suivre les étapes");
    expect(md).not.toContain("Besoin : Besoin");
  });

  it("ne casse pas un tableau avec une barre", () => {
    const g = fiche({ niveau2: LEVIERS_DU_NIVEAU_2.map((levier) => ({ levier, reponse: "A | B." })) }).fiche;
    expect(ficheEnMarkdown(g, "sequence")).toContain("| Contenus | A / B. |");
  });

  it("devient une vraie séquence : la matière de l'application, le cycle, le nombre de séances", () => {
    const s = sequenceDeLaFiche(f, 3);
    expect(s).toMatchObject({ titre: "Les fractions simples", matiere: "Mathématiques", cycle: "Cycle 3", niveau: "CM1", periode: 3, nbSeancesPrevu: 2, objectifs: f.objectifApprentissage });
    expect(sequenceDeLaFiche({ ...f, niveau: "IME", matiere: "Cuisine" }, 1)).toMatchObject({ niveau: "", cycle: "", matiere: "" });
    expect(matiereDeLaFiche("mathematiques")).toBe("Mathématiques");
    expect(matiereDeLaFiche("Sciences")).toBe("Sciences et techno.");
  });

  it("devient de vraies séances, avec leurs phases en cartes et la posture de l'enseignant", () => {
    const [a, b] = seancesDeLaFiche(f, "seq", 4);
    expect(a).toMatchObject({ sequenceId: "seq", numero: 4, titre: "Partager une bande", materiel: "bandes de papier ; ciseaux", duree: 45 });
    expect(b.numero).toBe(5);
    const { phases } = lireSeance(a.deroulement);
    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({ titre: "Mise en situation", duree: "5 min", deroulement: "Ils cherchent par deux." });
    expect(champDe(phases[0], CHAMP_POSTURE)).toBe("Il montre une bande. Il pose le problème.");
    expect(champDe(phases[0], "Ce qu'on observe")).toBe("Ils plient la bande.");
    expect(JSON.parse(a.tableauDeroulement).length).toBeGreaterThan(0);
  });

  it("a de quoi se dire à voix haute, sans lire la fiche", () => {
    expect(FICHE_PRETE).toMatch(/à l'écran/);
  });
});
