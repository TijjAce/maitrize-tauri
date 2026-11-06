import { describe, expect, it } from "vitest";
import type { ChatMessage } from "./api";
import {
  A_CHOISIR, BESOINS_DU_NIVEAU_1, FICHE_PRETE, LA_METHODE, LEVIERS_DU_NIVEAU_2, TOURS_DE_QUESTIONS_MAX, auPlus, consigneDeLEntretien, consigneDeLaFiche, conversationDuCadre,
  demandeDePreparation, ficheEnMarkdown, fusionnerLeConnu, lignesDuConnu, lireFiche, lireJson, lireLEntretien, matiereDeLaFiche, nonPrecise, parleAMistral, phrasesDe, prochaineQuestion, questionDeConfirmation, recapitulatif,
  redigerLaFiche, relireLeConnu, reponseALaConfirmation, resumeDuConnu, seancesDeLaFiche, sequenceDeLaFiche, suiteDeLEntretien, tourDuCadre, type ConnuDuCadre, type FicheDeSeance,
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
  niveau3: [{ domaine: "cognitif", obstacle: "Garder les étapes en mémoire le temps de la tâche.", manifestation: "Il s'arrête après le premier pli.", besoin: "Besoin d'un repère pour suivre les étapes", objectif_vise: "Écrire une fraction simple.", degre: "accommodement", adaptation: "Une carte-étapes posée sur la table.", aide: "Elle libère la mémoire.", vigilance: "Elle se retire peu à peu." }],
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
  const connu: ConnuDuCadre = { niveau: "CP" };
  const questions = (tour: number): ChatMessage => ({ role: "assistant", content: "Quel sujet ?", cadre: { etape: "questions", sorte: "sequence", tour, connu, posees: { niveau: 1 } } });
  const recap: ChatMessage = { role: "assistant", content: "Si j'ai bien compris…", cadre: { etape: "recap", sorte: "sequence", tour: 9, connu, posees: {} } };
  const ficheFaite: ChatMessage = { role: "assistant", content: "# Fiche", cadre: { etape: "fiche", sorte: "sequence", fiche: fiche().fiche, notes: [] } };
  const demande: ChatMessage = { role: "user", content: "une séquence sur les fractions" };

  it("demande confirmation avant de démarrer ; « oui », et ça démarre", () => {
    expect(tourDuCadre([], "une séquence sur les fractions")).toEqual({ genre: "confirmer", sorte: "sequence" });
    expect(tourDuCadre([demande, confirmation], "oui")).toEqual({ genre: "cadrer", sorte: "sequence", tour: 1, seule: true, connu: {}, posees: {} });
    expect(tourDuCadre([demande, confirmation], "oui, en CE2")).toMatchObject({ genre: "cadrer", seule: false });
    expect(questionDeConfirmation("sequence")).toMatch(/quelques questions/);
  });

  it("répond comme d'habitude après un « non »", () => {
    expect(tourDuCadre([demande, confirmation], "non")).toEqual({ genre: "decline", seule: true });
    expect(tourDuCadre([demande, confirmation], "non, juste des idées")).toEqual({ genre: "decline", seule: false });
  });

  it("prend pour un oui ce qui continue de décrire, pas ce qui pose une question", () => {
    expect(tourDuCadre([demande, confirmation], "en CM1, avec des bandes de papier")).toMatchObject({ genre: "cadrer", tour: 1 });
    expect(tourDuCadre([demande, confirmation], "Là, vas-y.")).toMatchObject({ genre: "cadrer", tour: 1 });
    expect(tourDuCadre([demande, confirmation], "ça coûte combien ?")).toEqual({ genre: "normal" });
  });

  it("continue l'entretien tant qu'il le faut, sans s'arrêter à la deuxième réponse", () => {
    // Le premier essai de l'enseignant : après « Les mathématiques », la rédaction partait sans le sujet.
    expect(tourDuCadre([questions(2)], "Les mathématiques.")).toEqual({ genre: "cadrer", sorte: "sequence", tour: 3, seule: false, connu, posees: { niveau: 1 } });
    expect(tourDuCadre([questions(TOURS_DE_QUESTIONS_MAX - 1)], "45 minutes")).toMatchObject({ genre: "cadrer" });
    // Un garde-fou, très loin.
    expect(tourDuCadre([questions(TOURS_DE_QUESTIONS_MAX)], "45 minutes")).toEqual({ genre: "rediger", sorte: "sequence", connu });
  });

  it("ne rédige que sur un ordre clair : répondre « vas-y » à une proposition, ou « je ne sais pas », n'arrête rien", () => {
    for (const t of ["Rédige maintenant", "rédigez", "c'est bon", "ça suffit", "passe à la rédaction", "Bon, tu peux y aller"]) expect(tourDuCadre([questions(1)], t), t).toMatchObject({ genre: "rediger" });
    for (const t of ["vas-y", "je ne sais pas", "peu importe", "oui", "non"]) expect(tourDuCadre([questions(1)], t), t).toMatchObject({ genre: "cadrer" });
    expect(tourDuCadre([questions(1)], "laisse tomber")).toEqual({ genre: "abandon" });
  });

  it("attend le « oui » du récapitulatif ; une correction relance l'entretien", () => {
    expect(tourDuCadre([recap], "oui")).toEqual({ genre: "rediger", sorte: "sequence", connu });
    expect(tourDuCadre([recap], "vas-y")).toEqual({ genre: "rediger", sorte: "sequence", connu });
    expect(tourDuCadre([recap], "oui mais six séances")).toMatchObject({ genre: "cadrer", tour: 10 });
    expect(tourDuCadre([recap], "plutôt 30 minutes")).toMatchObject({ genre: "cadrer", tour: 10 });
    expect(tourDuCadre([recap], "laisse tomber")).toEqual({ genre: "abandon" });
  });

  it("garde ce qu'il sait dans une conversation d'avant cette version", () => {
    const vieille: ChatMessage = { role: "assistant", content: "?", cadre: { etape: "questions", sorte: "seance", tour: 1 } };
    expect(tourDuCadre([vieille], "en CP")).toEqual({ genre: "cadrer", sorte: "seance", tour: 2, seule: false, connu: {}, posees: {} });
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

describe("l'entretien", () => {
  const tout: ConnuDuCadre = {
    niveau: "CP", matiere: "Mathématiques", sujet: "les nombres jusqu'à 10", objectif: "dénombrer une collection", criteres: "il pointe chaque objet une fois",
    nb_seances: "5", duree: "45 min", prerequis: "compter jusqu'à 5", support: "des cubes", demarche: "situation-problème", organisation: "24 élèves, une AESH",
  };
  const u = (content: string): ChatMessage => ({ role: "user", content });
  const lu = (o = {}) => ({ connu: {}, cible: "", question: "", ...o });

  it("suit l'ordre : ce qu'on fait, ce qu'ils savent, comment, et les élèves à la fin", () => {
    const ordre: string[] = [];
    let c: ConnuDuCadre = {};
    for (let q = prochaineQuestion(c, "sequence", {}); q; q = prochaineQuestion(c, "sequence", {})) {
      ordre.push(q.base);
      c = { ...c, [q.base]: q.base === "eleves_signales" ? "non" : "x" };
    }
    expect(ordre).toEqual(["niveau", "matiere", "sujet", "objectif", "criteres", "nb_seances", "duree", "prerequis", "support", "demarche", "organisation", "eleves_signales"]);
  });

  it("demande la place dans la séquence pour une séance, pas un nombre de séances", () => {
    const q = prochaineQuestion({ ...tout, nb_seances: undefined, duree: undefined }, "seance", {});
    expect(q?.base).toBe("place");
  });

  it("creuse pour un élève, dans l'ordre de M2PA, et propose d'en prévoir un autre", () => {
    const base: ConnuDuCadre = { ...tout, eleves_signales: "oui" };
    const suite = (eleves: ConnuDuCadre["eleves"], autre?: string) => prochaineQuestion({ ...base, eleves, autre_eleve: autre }, "sequence", {})?.cle;
    expect(suite(undefined)).toBe("vu#0");
    expect(suite([{ vu: "a" }])).toBe("ailleurs#0");
    expect(suite([{ vu: "a", ailleurs: "b" }])).toBe("appuis#0");
    expect(suite([{ vu: "a", ailleurs: "b", appuis: "c" }])).toBe("besoin#0");
    const complet = { vu: "a", ailleurs: "b", appuis: "c", besoin: "d" };
    expect(suite([complet])).toBe("autre_eleve#1");
    expect(suite([complet], "non")).toBeUndefined();
    expect(suite([complet], "oui")).toBe("vu#1");
    expect(suite([complet, { vu: "e" }])).toBe("ailleurs#1");
    expect(prochaineQuestion({ ...tout, eleves_signales: "non" }, "sequence", {})).toBeNull();
    expect(prochaineQuestion({ ...tout, eleves_signales: "aucun" }, "sequence", {})).toBeNull();
  });

  it("ne repose pas sans fin une question restée sans réponse", () => {
    expect(prochaineQuestion({}, "sequence", { niveau: 1 })?.base).toBe("niveau");
    expect(prochaineQuestion({}, "sequence", { niveau: 2 })?.base).toBe("matiere");
  });

  it("rejoue le premier essai : « Les mathématiques » n'est pas un sujet, et il le redemande au lieu de rédiger", () => {
    const conversation = [u("Oui, on va faire une séquence aujourd'hui."), u("Alors pour des niveaux CP"), u("Les mathématiques.")];
    const e = suiteDeLEntretien({
      sorte: "sequence", avant: { niveau: "CP" }, posees: {}, conversation,
      lu: lu({ connu: { niveau: "CP", matiere: "Mathématiques", sujet: "Mathématiques" } }),
    });
    expect(e.connu).toEqual({ niveau: "CP", matiere: "Mathématiques" });
    expect(e.question).toBe("Sur quoi précisément ?");
    expect(e.posees).toEqual({ sujet: 1 });
  });

  it("garde la question du modèle quand elle porte sur ce qui manque, ou sur ce qui va avec", () => {
    const avec = (cible: string, avant: ConnuDuCadre = { niveau: "CP" }) => suiteDeLEntretien({ sorte: "sequence", avant, posees: {}, conversation: [], lu: lu({ cible, question: "Sa question ?" }) }).question;
    expect(avec("matiere")).toBe("Sa question ?");
    expect(avec("sujet")).toBe("Sa question ?");
    expect(avec("objectif", { niveau: "CP", matiere: "Maths", sujet: A_CHOISIR })).toBe("Sa question ?");
    // Il saute une étape : c'est la nôtre qui part.
    expect(avec("support")).toBe("Dans quelle matière ?");
    expect(avec("")).toBe("Dans quelle matière ?");
  });

  it("l'empêche de s'arrêter trop tôt ; s'arrête quand tout est là", () => {
    const tot = suiteDeLEntretien({ sorte: "sequence", avant: { niveau: "CP" }, posees: {}, conversation: [], lu: lu() });
    expect(tot.question).toBe("Dans quelle matière ?");
    const fin = suiteDeLEntretien({ sorte: "sequence", avant: { ...tout, eleves_signales: "non" }, posees: { niveau: 1 }, conversation: [u("les nombres jusqu'à 10, 5 séances de 45 min, ils savent compter jusqu'à 5")], lu: lu() });
    expect(fin.question).toBeNull();
    expect(fin.posees).toEqual({ niveau: 1 });
  });

  it("refuse un diagnostic dans les hypothèses", () => {
    const avant: ConnuDuCadre = { ...tout, eleves_signales: "oui", eleves: [{ vu: "a", ailleurs: "b", appuis: "c" }] };
    const conversation = [u("les nombres jusqu'à 10, 5 séances de 45 min, ils savent compter jusqu'à 5")];
    const juste = suiteDeLEntretien({ sorte: "sequence", avant, posees: {}, conversation, lu: lu({ cible: "besoin", question: "Besoin d'un repère pour agir, ou besoin de temps pour finir ?" }) });
    expect(juste.question).toMatch(/Besoin d'un repère/);
    const faux = suiteDeLEntretien({ sorte: "sequence", avant, posees: {}, conversation, lu: lu({ cible: "besoin", question: "Serait-il dyspraxique ?" }) });
    expect(faux.question).toBe("De quoi cet élève a-t-il besoin, et pour quoi faire ?");
  });

  it("ne croit pas le modèle sur parole : ni un sujet, ni un chiffre que personne n'a dit", () => {
    const dit = [u("Les mathématiques."), u("en CP")];
    expect(relireLeConnu({ sujet: "les fractions", nb_seances: "5", matiere: "Mathématiques" }, dit)).toEqual({ matiere: "Mathématiques" });
    expect(relireLeConnu({ sujet: "les nombres", nb_seances: "6" }, [u("sur les nombres, en six"), u("6 séances")])).toEqual({ sujet: "les nombres", nb_seances: "6" });
    expect(relireLeConnu({ sujet: "l'addition" }, [u("les additions")]).sujet).toBe("l'addition");
    // Dit à voix haute, un nombre s'écrit en toutes lettres.
    expect(relireLeConnu({ nb_seances: "4", duree: "30 min" }, [u("quatre séances de trente minutes")])).toEqual({ nb_seances: "4", duree: "30 min" });
    expect(relireLeConnu({ duree: "45 min" }, [u("trois quarts d'heure")]).duree).toBe("45 min");
    expect(relireLeConnu({ duree: "1 h" }, [u("une heure")]).duree).toBe("1 h");
    // « jusqu'à 10 » ne dit pas 5 séances.
    expect(relireLeConnu({ nb_seances: "5" }, [u("les nombres jusqu'à 10 en CM1")]).nb_seances).toBeUndefined();
    // Sa proposition acceptée vaut pour lui.
    const accepte: ChatMessage[] = [{ role: "assistant", content: "Je propose les nombres jusqu'à 10 : ça vous va ?" }, u("oui")];
    expect(relireLeConnu({ sujet: "les nombres jusqu'à 10" }, accepte).sujet).toBe("les nombres jusqu'à 10");
    const refuse: ChatMessage[] = [{ role: "assistant", content: "Je propose les nombres jusqu'à 10 : ça vous va ?" }, u("non")];
    expect(relireLeConnu({ sujet: "les nombres jusqu'à 10" }, refuse).sujet).toBeUndefined();
    // Il s'en remet à l'Assistant : c'est une réponse.
    expect(relireLeConnu({ sujet: A_CHOISIR }, []).sujet).toBe(A_CHOISIR);
    for (const m of ["maths", "Mathématiques", "le français", "EPS"]) expect(relireLeConnu({ sujet: m, matiere: "Mathématiques" }, [u(m)]).sujet, m).toBeUndefined();
  });

  it("n'oublie rien d'un tour à l'autre, élèves compris", () => {
    const f = fusionnerLeConnu({ niveau: "CP", eleves: [{ vu: "a" }] }, { matiere: "Maths", eleves: [{ ailleurs: "b" }] });
    expect(f).toEqual({ niveau: "CP", matiere: "Maths", eleves: [{ vu: "a", ailleurs: "b" }] });
    expect(fusionnerLeConnu({ niveau: "CP" }, {})).toEqual({ niveau: "CP" });
    // Un élève de plus : la question d'un suivant se reposera.
    const deux = fusionnerLeConnu({ autre_eleve: "oui", eleves: [{ vu: "a" }] }, { eleves: [{ vu: "a" }, { vu: "b" }] });
    expect(deux.autre_eleve).toBeUndefined();
    expect(deux.eleves).toHaveLength(2);
  });

  it("lit la réponse du modèle, et n'y prend pas « non précisé » pour une réponse", () => {
    const l = lireLEntretien(JSON.stringify({
      connu: { niveau: "CP", matiere: "non précisé", sujet: "", duree: "Non renseignée", objectif: "?", prerequis: "à préciser", support: "à choisir", eleves_signales: "non", eleves: [{ vu: "[P1] lâche les jetons", besoin: "" }, {}] },
      cible: "objectif", question: "Pour [P1] ?",
    }), (t) => t.replace("[P1]", "Sam"));
    expect(l.connu).toEqual({ niveau: "CP", support: "à choisir", eleves_signales: "non", eleves: [{ vu: "Sam lâche les jetons" }] });
    expect(l.cible).toBe("objectif");
    expect(l.question).toBe("Pour Sam ?");
    expect(lireLEntretien("illisible", (t) => t)).toEqual({ connu: {}, cible: "", question: "" });
    // Le modèle n'écrit pas toujours la clé telle quelle.
    expect(lireLEntretien('{"cible":"eleves[0].vu"}', (t) => t).cible).toBe("vu");
    expect(lireLEntretien('{"cible":"matiere et sujet"}', (t) => t).cible).toBe("sujet");
  });

  it("résume ce qui est noté ; récapitule avant de rédiger, élèves compris", () => {
    expect(resumeDuConnu({ niveau: "CP", matiere: "Mathématiques", sujet: A_CHOISIR, nb_seances: "5 séances", duree: "45 min" })).toBe("CP · Mathématiques · 5 séances · 45 min");
    expect(resumeDuConnu({})).toBe("");
    const r = recapitulatif({ ...tout, support: A_CHOISIR, eleves_signales: "oui", eleves: [{ vu: "lâche les jetons", appuis: "aime compter", besoin: "Besoin d'un appui pour saisir" }] }, "sequence");
    expect(r).toMatch(/^\*\*Si j'ai bien compris/);
    expect(r).toContain("- Sujet : les nombres jusqu'à 10.");
    expect(r).toContain("- Support : à mon choix.");
    expect(r).toContain("- Un élève : on voit : lâche les jetons ; ce qui l'aide : aime compter ; retenu : Besoin d'un appui pour saisir.");
    expect(r).toMatch(/Je rédige \?$/);
    expect(lignesDuConnu({ ...tout, eleves_signales: "non", eleves: [{ vu: "x" }] }, "sequence").join()).not.toContain("Un élève");
    expect(lignesDuConnu({ place: "au début" }, "seance").join()).toContain("Place dans la séquence");
  });

  it("dit ce que l'Assistant a dû choisir seul", () => {
    expect(nonPrecise(tout, "sequence")).toBeNull();
    expect(nonPrecise({ niveau: "CP", sujet: A_CHOISIR }, "sequence")).toBe("Choisi par l'Assistant, à vérifier : la matière, le sujet, l'objectif, le nombre de séances, la durée, les prérequis.");
    expect(nonPrecise({ ...tout, nb_seances: undefined }, "seance")).toBeNull();
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

  it("mène l'entretien : une question, en vouvoyant, sur ce qui manque, et ce qui est déjà établi", () => {
    const c = consigneDeLEntretien("sequence", '{"niveau":"CP"}', { materiel: "- des cubes", programmes: "- un attendu" });
    expect(c).toMatch(/Tu le vouvoies/);
    expect(c).toMatch(/Une seule question à la fois/);
    expect(c).toMatch(/propose au lieu de demander/);
    expect(c).toContain('{"niveau":"CP"}');
    for (const t of ["des cubes", "un attendu", "nb_seances", "Besoin de … pour …", "sans prénom ni diagnostic", "à choisir"]) expect(c).toContain(t);
    expect(consigneDeLEntretien("seance", "{}", {})).toContain('"place"');
    expect(consigneDeLEntretien("seance", "{}", {})).not.toContain("nb_seances");
  });

  it("passe à la rédaction ce qui est établi", () => {
    expect(consigneDeLaFiche("sequence", { etabli: "Niveau : CP." })).toMatch(/à respecter tel quel[\s\S]*Niveau : CP\./);
    expect(consigneDeLaFiche("sequence", {})).not.toMatch(/à respecter tel quel/);
  });
});

describe("ce que Mistral répond", () => {
  const sansMasque = (t: string) => t;

  it("lit le JSON, même entouré de texte, et refuse le reste", () => {
    expect(lireJson('Voici : {"a":1} !')).toEqual({ a: 1 });
    expect(lireJson("pas de JSON")).toBeNull();
    expect(lireJson("[1,2]")).toBeNull();
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

  it("vérifie la fiche d'après l'entretien : le nombre de séances, la durée, les élèves", () => {
    expect(lireFiche(reponse(), "sequence", PERMIS, { nb_seances: "2 séances" }).problemes).toEqual([]);
    expect(lireFiche(reponse(), "sequence", PERMIS, { nb_seances: "5" }).problemes.join()).toMatch(/demandé 5 séances : il y en a 2/);
    expect(lireFiche(reponse(), "sequence", PERMIS, { nb_seances: A_CHOISIR }).problemes).toEqual([]);
    expect(lireFiche(reponse(), "sequence", PERMIS, { duree: "30 minutes" }).fiche.seances.map((x) => x.duree)).toEqual([30, 30]);
    expect(lireFiche(reponse(), "sequence", PERMIS, { duree: "1 h" }).fiche.seances[0].duree).toBe(60);
    expect(lireFiche(reponse(), "sequence", PERMIS, { eleves_signales: "oui", eleves: [{ vu: "a" }, { vu: "b" }] }).problemes.join()).toMatch(/signalé 2 élèves : le niveau 3 en compte 1/);
    expect(lireFiche(reponse(), "sequence", PERMIS, { eleves_signales: "oui", eleves: [{ vu: "a" }] }).problemes).toEqual([]);
  });

  it("refuse un obstacle collé à la matière, comme au premier essai", () => {
    const f = fiche({
      objectif_apprentissage: "À la fin de cette séquence, les élèves sauront dénombrer une collection.",
      niveau3: [{ obstacle: "Difficulté à manipuler les jetons pour dénombrer", besoin: "Besoin d'un appui pour saisir", adaptation: "Une carte." }],
    });
    expect(f.problemes.join()).toMatch(/parle de la matière \(denombrer\)/);
    expect(fiche({ niveau3: [{ obstacle: "Coordonner ses deux mains pour saisir de petits objets", besoin: "Besoin d'un appui pour saisir", adaptation: "Une carte." }] }).problemes).toEqual([]);
  });

  it("demande un besoin bien formé, et oublie un domaine qui n'en est pas un", () => {
    expect(fiche({ niveau3: [{ obstacle: "Garder ses repères", besoin: "Des cartes", adaptation: "Une carte." }] }).problemes.join()).toMatch(/s'écrit « Besoin de … pour … »/);
    expect(fiche({ niveau3: [{ domaine: "médical", obstacle: "Garder ses repères", besoin: "Besoin d'un repère pour agir", adaptation: "Une carte." }] }).fiche.niveau3[0].domaine).toBe("");
    expect(fiche().fiche.niveau3[0].domaine).toBe("cognitif");
  });

  it("refuse « féliciter » comme ce qui est prévu au niveau 1", () => {
    const f = fiche({ niveau1: BESOINS_DU_NIVEAU_1.map((besoin, i) => ({ besoin, reponse: i === 2 ? "Féliciter les efforts, même petits." : `Pour ${besoin} : un affichage.` })) });
    expect(f.problemes.join()).toMatch(/« féliciter »[\s\S]*Sentiment de compétence/);
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
    expect(md).toContain("**Garder les étapes en mémoire le temps de la tâche.** (cognitif)");
    expect(md).toContain("- Ce qu'on voit : Il s'arrête après le premier pli.");
    expect(md).toContain("- Adaptation (accommodement) : Une carte-étapes posée sur la table.");
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
