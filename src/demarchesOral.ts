// L'oral : des séquences bâties sur le programme de français du cycle 2
// (2024) et la démarche Éduscol « Organiser l'enseignement de l'oral ».
//
// Les livrets n'ont pas de séquence d'oral, et les guides de lecture et
// d'écriture du CP et du CE1 n'en parlent qu'au service de la compréhension
// — raconter, reformuler, débattre sur les textes : ni récitation, ni exposé,
// ni débat réglé. L'enseignant a demandé (2026-10-07) qu'on bâtisse les
// séquences depuis le programme et les guides, en le disant. Chaque séquence
// suit donc la démarche d'Éduscol déjà proposée pour l'oral — une production
// initiale, les critères dégagés ensemble, des situations d'apprentissage
// ciblées, une production finale évaluée sur ces critères —, appliquée à la
// compétence choisie, avec les objectifs et les exemples de réussite du
// programme, cités. Écouter pour comprendre suit les lectures offertes des
// guides de lecture : le professeur dit l'objectif avant d'écouter, lit
// sans montrer les illustrations, puis on fait raconter.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { POEMES, REGLAGES_ORAL, STYLE_ORAL, htmlOral, type ReglagesOral } from "./oral";
import { REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension, type ReglagesComprehension } from "./comprehension";
import { REGLAGES_VOIX_HAUTE, STYLE_VOIX_HAUTE, htmlVoixHaute } from "./lectureVoixHaute";
import { texteDe } from "./textesDeComprehension";
import { PROGRAMME_FRANCAIS } from "./demarchesLecture";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);

// Les quatre étapes d'Éduscol, appliquées à un genre d'oral.
const initiale = (titre: string, objectif: string, consigne: string) => seance(titre, sauront(objectif), 30, [
  ph("Lancement", "5 min", "Le projet d'oral présenté : ce qu'on va apprendre à faire, pour qui."),
  ph("Production initiale", "20 min", consigne, "Enregistre ou filme ; observe avec la grille, sans corriger encore."),
  ph("Premier retour", "5 min", "Ce qui a été facile, difficile : chacun le dit."),
]);
const criteres = (titre: string, objectif: string, analyse: string) => seance(titre, sauront(objectif), 30, [
  ph("Écoute des productions", "10 min", "Quelques enregistrements écoutés : qu'est-ce qui aide à comprendre ? qu'est-ce qui gêne ?"),
  ph("Analyse", "15 min", analyse),
  ph("Trace écrite", "5 min", "La grille des critères, construite avec les élèves, affichée."),
]);
const atelier = (titre: string, objectif: string, situation: string, bilan: string, posture = "") => seance(titre, sauront(objectif), 30, [
  ph("Rituel d'ouverture", "5 min", "La grille relue : ce qu'on travaille aujourd'hui."),
  ph("Situation ciblée", "20 min", situation, posture),
  ph("Bilan", "5 min", bilan),
]);
const finale = (titre: string, objectif: string, consigne: string) => seance(titre, sauront(objectif), 30, [
  ph("Production finale", "20 min", consigne, "Évalue avec les critères construits ; compare avec la production initiale."),
  ph("Commentaires", "10 min", "Chacun commente sa production avec la grille ; les camarades disent ce qui est réussi."),
]);

const ORAL_EDUSCOL = "démarche Éduscol « Organiser l'enseignement de l'oral », cycles 2 et 3 (2018) : production initiale, critères, situations d'apprentissage, production finale";
const SOURCE = `${PROGRAMME_FRANCAIS} ; ${ORAL_EDUSCOL}`;
const SOURCE_ECOUTE = `${PROGRAMME_FRANCAIS} ; guides « Pour enseigner la lecture et l'écriture » au CP (2019), les lectures offertes, p. 48-50, et au CE1 (2019), le texte long lu par le professeur, p. 54-60 ; démarche en quatre temps des livrets`;

const ECOUTER: Demarche = {
  id: "ecouter-comprendre-c2", nom: "Écouter pour comprendre (CP, CE1, CE2)", famille: "Français",
  source: SOURCE_ECOUTE,
  resume: "Au CP, comprendre un message entendu de quelques minutes et en mémoriser les informations importantes ; au CE1, maintenir une attention active pendant quelques minutes pour repérer, mémoriser, classer ou ordonner ; au CE2, relier entre elles plusieurs informations d'un message de plus en plus long (5 minutes au plus), en évaluant son degré de compréhension. Exemples de réussite : réaliser l'action demandée par une consigne, une recette, une règle du jeu ; répondre, après plusieurs écoutes d'un récit, à « Que raconte ce texte ? », et d'un documentaire, à « Quelles informations as-tu retenues ? » ; récapituler une leçon en ordonnant les informations ; écouter une histoire et en inventer la fin. Le professeur « énonce clairement les objectifs aux élèves, y compris en situation d'écoute ».",
  seances: [
    trois("Écouter une consigne, la réaliser", "écouter une consigne, une recette ou une règle, et faire ce qu'elle demande.",
      "L'objectif dit avant d'écouter : « Je vais lire une recette une seule fois ; à vous de la réaliser. »",
      "Écouter la recette ou la règle du jeu ; la redire à son voisin dans l'ordre ; la réaliser ; vérifier ensemble ce qui a été oublié.",
      "Ce qu'on retient : pour bien écouter, je regarde celui qui parle et je me redis les étapes dans ma tête."),
    trois("Que raconte ce texte ?", "écouter un récit et dire ce qu'il raconte.",
      "« Écoutez bien : à la fin, vous me raconterez l'histoire. » Le professeur lit sans montrer les illustrations.",
      "Deux écoutes ; après la seconde, raconter à plusieurs, dans l'ordre ; répondre aux questions sur la feuille ; au CE1, remettre les moments dans l'ordre.",
      "Ce qu'on retient : « Je me fais le film de l'histoire pendant que j'écoute. »", "Montrer les illustrations nuit à la compréhension du message oral (guide CE1, p. 54)."),
    trois("Quelles informations as-tu retenues ?", "écouter un documentaire et en retenir les informations importantes.",
      "Avant d'écouter : ce que je sais déjà du sujet ; ce que je veux apprendre.",
      "Écouter un documentaire lu ou enregistré, deux fois ; noter après coup trois informations ; les comparer, les classer.",
      "Ce qu'on retient : les informations nouvelles, rangées dans un tableau."),
    trois("Relier, ordonner, imaginer la suite", "relier les informations d'un message plus long, et dire ce qu'on a compris et ce qui a manqué.",
      "Un récit plus long, ou l'interview d'un artiste ou d'un scientifique.",
      "Écouter, reformuler l'essentiel ; ordonner les étapes ; au CE2, s'arrêter avant la fin et inventer la fin ; chacun dit s'il a tout compris, presque tout, un peu.",
      "Ce qu'on retient : ce qui m'aide à rester attentif."),
    seance("Évaluation", sauront("écouter un texte et répondre aux questions, seuls."), 30, [
      ph("Évaluation", "25 min", "Une feuille : le texte lu deux fois par le professeur, puis les questions."),
      ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Ensuite, chaque semaine, une lecture offerte et un temps d'écoute active dans toutes les disciplines."),
    ]),
  ],
};

const RACONTER: Demarche = {
  id: "raconter-c2", nom: "Raconter, décrire, expliquer (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CP, mener une brève production orale pour rapporter, raconter, décrire ou expliquer, avec quelques organisateurs du discours et le lexique appris, et s'écouter pour progresser ; au CE1, utiliser à l'oral l'ensemble des temps verbaux pour raconter, décrire, expliquer, comparer ou exposer. Exemples de réussite : raconter avec ses propres mots une histoire entendue, « en utilisant des connecteurs tels que parce que, alors, ensuite » ; « d'abord, pour commencer, ensuite, donc, par conséquent, enfin, pour terminer, pour conclure » ; présenter une démarche scientifique avec le lexique appris. Le guide CP : la carte du récit et le rappel à tour de rôle avec un mot imposé (p. 52-53, p. 105).",
  seances: [
    initiale("Raconter une première fois", "où ils en sont pour raconter une histoire connue : une première production enregistrée.",
      "Chacun raconte à un petit groupe une histoire lue en classe ; on enregistre."),
    criteres("Ce qui fait un bon récit oral", "ce qui fait un bon récit oral : l'ordre, les mots pour enchaîner, la voix, le regard.",
      "Critères dégagés avec les élèves : raconter dans l'ordre, dire qui sont les personnages, enchaîner (parce que, alors, ensuite), parler assez fort, regarder ses camarades."),
    atelier("La carte du récit", "préparer un récit avec la carte du récit et raconter dans l'ordre.",
      "Remplir la carte du récit — qui ? où ? quand ? quel est le problème ? qu'arrive-t-il ? quelle est la solution ? — puis raconter à tour de rôle en plaçant un mot imposé ; au CE1, raconter au passé.",
      "Les mots pour enchaîner, ajoutés à la grille."),
    atelier("Décrire, expliquer", "décrire une image et expliquer comment on a fait, avec les mots appris.",
      "Décrire une image à un camarade qui ne la voit pas ; expliquer une expérience de sciences ou une construction : d'abord, ensuite, donc, enfin ; s'écouter sur l'enregistrement et reformuler.",
      "Ce qu'on retient : je me mets à la place de celui qui écoute."),
    finale("Raconter de nouveau", "mesurer leurs progrès en racontant de nouveau, avec les critères de la grille.",
      "Chacun raconte une nouvelle histoire, enregistré ; on compare avec la première fois."),
  ],
};

const POEME: Demarche = {
  id: "dire-un-poeme-c2", nom: "Dire un poème, un texte appris (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Oraliser un texte mémorisé ou préparé en tenant compte de son auditoire. Le programme : « Le professeur fait mémoriser une dizaine de poèmes par an, de longueur et de complexité (lexique, syntaxe, structure) progressives » ; exemple de réussite au CP : « Il restitue un poème en articulant distinctement et d'une voix audible. » Les livrets de français travaillent la prosodie — liaisons, pauses, groupes de souffle, ton — que la récitation reprend.",
  seances: [
    initiale("Découvrir le poème", "écouter, comprendre et dire une première fois un poème.",
      "Le professeur dit le poème ; on en parle — ce qu'il raconte, ses images, ses rimes ; chacun dit les premiers vers ; on enregistre."),
    criteres("Ce qui fait bien dire un poème", "ce qui fait bien dire un poème : savoir par cœur, articuler, une voix audible, les pauses, le regard.",
      "Critères dégagés avec les élèves, à partir des enregistrements et d'une lecture modèle du professeur."),
    atelier("Apprendre par cœur", "apprendre un poème vers par vers, strophe par strophe.",
      "Lire, cacher, redire ; se faire une image par vers ; associer un geste ; s'entraîner à deux, l'un dit, l'autre suit le texte.",
      "Ce qu'on retient : mes façons d'apprendre un poème."),
    atelier("Dire pour être écouté", "dire un poème en articulant, avec les pauses, les liaisons et le ton.",
      "Coder les pauses et les liaisons ; dire le poème plus fort, plus doucement, plus vite, plus lentement ; choisir le ton qui va avec ; au CE2, chercher à capter l'attention de son public.",
      "Ce qu'on retient : ma voix fait vivre le poème."),
    finale("Le récital", "dire le poème appris devant un public.",
      "Chacun dit son poème devant la classe, ou une autre classe ; on enregistre ; le poème rejoint le cahier de poésie, illustré."),
  ],
};

const EXPOSE: Demarche = {
  id: "expose-c2", nom: "Présenter un exposé (CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CE1, utiliser les critères définis pour évaluer sa prestation ou celle des autres et progresser dans différents types de discours ; au CE2, mener une production orale de plus en plus longue et structurée pour raconter, expliquer, argumenter, justifier, et maintenir l'intérêt de son auditoire. Exemples de réussite : réinvestir les tournures et les postures apprises, pendant 5 minutes au plus au CE1 ; au CE2, « Il présente un exposé de quelques minutes construit en classe en prenant appui sur un support », explique un raisonnement, évite les tics verbaux et les mots familiers, varie les connecteurs. Le programme : « Dans l'année, chaque élève s'exerce régulièrement à une brève présentation orale ou un exposé en petit ou grand groupe. »",
  seances: [
    initiale("Présenter une première fois", "où ils en sont pour présenter un sujet à la classe : une minute sur un objet ou un sujet familier.",
      "Chacun présente en une minute un objet apporté ou un sujet qu'il connaît ; on enregistre."),
    criteres("Ce qui fait un bon exposé", "ce qui fait un bon exposé : annoncer le sujet, suivre un plan, parler sans lire, conclure, regarder le public.",
      "Critères dégagés avec les élèves ; observer un exposé modèle du professeur."),
    atelier("Le plan et les fiches-mémo", "préparer un exposé avec un plan et des mots-clés.",
      "Choisir un sujet travaillé en classe ; chercher les informations ; faire le plan — pour commencer, trois parties, pour conclure — ; noter des mots-clés, pas des phrases.",
      "Ce qu'on retient : je note des mots-clés pour parler, pas un texte à lire."),
    atelier("Parler avec un support, répondre aux questions", "présenter avec un support et répondre aux questions du public.",
      "S'entraîner à deux, avec le support (affiche, objet, images) ; le camarade pose des questions ; varier les connecteurs ; chasser les « euh » et les mots familiers.",
      "Ce qu'on retient : j'intéresse mon public — une image, un exemple, une question."),
    finale("L'exposé", "présenter un exposé de quelques minutes et l'évaluer avec la grille.",
      "Chacun présente son exposé à la classe, avec son support ; questions du public ; grille remplie par l'élève, un camarade, le professeur."),
  ],
};

const ECHANGER: Demarche = {
  id: "echanger-c2", nom: "Échanger, débattre en respectant la parole des autres (CP, CE1, CE2)", famille: "Français",
  source: `${SOURCE} ; guides « Pour enseigner la lecture et l'écriture » au CP (2019), p. 84-85, et au CE1 (2019), p. 54-56 : les débats sur les textes`,
  resume: "Au CP, participer aux échanges en respectant les règles, en écoutant les autres et en donnant son avis ; au CE1, respecter le propos au cours des échanges ; au CE2, tenir compte de ce qui a déjà été dit. Exemples de réussite et expressions du programme : attendre la fin d'une prise de parole pour parler ; « Je souhaite prendre la parole pour… ; Je suis d'accord… » ; « Je ne suis pas d'accord avec… ; Je ne partage pas l'avis de… » ; reformuler ce qu'a dit un camarade — « Pour compléter ce qu'a dit… ; Je souhaite revenir sur ce qu'a dit… ; Pour reprendre les propos de… ». Les guides de lecture font débattre « sur ce qu'ils comprennent et interprètent » des textes.",
  seances: [
    initiale("Un premier échange", "où ils en sont pour échanger : une discussion sur une question tirée d'un texte lu.",
      "Une question qui partage la classe, tirée d'un album lu (« Le loup avait-il raison ? ») ; on discute ; on enregistre."),
    criteres("Les règles de l'échange", "les règles qui permettent à chacun de parler et d'être écouté.",
      "Écouter un extrait : qui a parlé ? qui a été coupé ? a-t-on parlé du sujet ? Les règles écrites ensemble : attendre la fin, demander la parole, rester dans le sujet, donner son avis et dire pourquoi."),
    atelier("Les mots pour prendre la parole", "utiliser les expressions de la classe pour donner son avis, être d'accord ou non.",
      "Les cartes « Je prends la parole » : chacun pose la carte de ce qu'il veut dire avant de parler ; au CE2, reformuler ce qu'a dit le camarade avant de répondre.",
      "Les expressions de la classe, affichées."),
    atelier("Chacun son rôle", "tenir un rôle dans l'échange : président, gardien du temps, reformulateur, observateur.",
      "Un échange organisé avec des rôles qui tournent ; l'observateur note qui a parlé et aide ceux qui ne l'ont pas encore fait.",
      "Ce qu'on retient : chacun a sa place dans l'échange.", "Sollicite les plus réservés pour reprendre ce qui a été dit (guide CE1, p. 56)."),
    finale("Le débat", "mener un échange sur une question en respectant les règles et la parole des autres.",
      "Un débat sur une nouvelle question ; les rôles tenus ; grille remplie ; on compare avec le premier échange."),
  ],
};

const REGISTRES: Demarche = {
  id: "registres-c2", nom: "Parler selon la situation : les registres de langue (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CP, prendre conscience des écarts de niveau de langue selon les situations — « Il mesure que l'on ne parle pas de la même manière en classe et dans la cour » ; au CE1, adapter le registre (familier, courant, soutenu) à la situation : conversation entre pairs, dialogue avec un adulte connu, une personnalité inconnue ; au CE2, utiliser un registre et adopter des postures adaptées aux situations proposées, en jeux de rôles. Exemple de réussite : participer à des jeux de rôle et adapter son registre « de façon appropriée (vocabulaire et syntaxe) ».",
  seances: [
    initiale("Une même demande, deux personnes", "où ils en sont : demander la même chose à un camarade, puis à la directrice.",
      "Jeu de rôle : demander un objet à un camarade, puis à un adulte de l'école qu'on connaît peu ; on enregistre."),
    criteres("Ce qui change selon la personne", "ce qui change quand on parle à un camarade ou à un adulte : les mots, les phrases, le ton.",
      "Comparer les deux demandes : les mots (rigoler, rire), la négation complète, « tu » ou « vous », la formule de politesse ; nommer les registres familier, courant, soutenu."),
    atelier("Classer et transformer", "reconnaître le registre d'une phrase et la dire dans un autre registre.",
      "Classer des phrases en familier, courant, soutenu ; redire une phrase familière en registre courant, puis soutenu.",
      "Ce qu'on retient : à l'école, on parle en registre courant ; avec un adulte qu'on connaît peu, on peut être soutenu."),
    atelier("Les jeux de rôles", "jouer une scène en choisissant le registre qui convient à la situation.",
      "Tirer une carte de situation — à qui parle-t-on ? de quoi ? — ; jouer la scène à deux ; les spectateurs disent si le registre convient.",
      "Ce qu'on retient : je choisis mes mots selon la personne à qui je parle."),
    finale("Les scènes", "jouer des scènes en adaptant registre et posture.",
      "Chaque binôme joue deux scènes de registres différents ; la classe évalue avec la grille."),
  ],
};

export const DEMARCHES_ORAL: Demarche[] = [ECOUTER, RACONTER, POEME, EXPOSE, ECHANGER, REGISTRES];

/** La séquence d'oral d'une compétence du cycle 2 ; rien sinon. */
export function demarcheDeLOral(sd: string, cg: string, comp: string): string | null {
  if (!/^oral/.test(sd)) return null;
  if (/ecouter pour comprendre/.test(cg)) return "ecouter-comprendre-c2";
  if (/participer a des echanges/.test(cg)) return /registre|niveau de langue/.test(comp) ? "registres-c2" : "echanger-c2";
  if (/dire pour etre compris/.test(cg)) {
    if (/texte memorise|oraliser/.test(comp)) return "dire-un-poeme-c2";
    if (/criteres|plus longue et structuree|interet de son auditoire/.test(comp)) return "expose-c2";
    return "raconter-c2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const ol = (seance: number, titre: string, r: Partial<ReglagesOral>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ORAL, ...r };
  return { seance, atelier: "oral", titre, fabriquer: (graine) => ({ html: htmlOral(reglages, graine), style: STYLE_FEUILLE + STYLE_ORAL }) };
};
const cx = (seance: number, titre: string, r: Partial<ReglagesComprehension>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_COMPREHENSION, ...r };
  return { seance, atelier: "comprehension", titre, fabriquer: (graine) => ({ html: htmlComprehension(reglages, graine), style: STYLE_FEUILLE + STYLE_COMPREHENSION }) };
};
/** Le poème de la classe, ses vers à coder : pauses et liaisons (atelier « Lire à voix haute »). */
const poemeACoder = (seance: number, classe: ClasseC2): FeuilleAFabriquer => {
  const vers = POEMES[classe].vers.filter((v) => v.trim());
  const r = { ...REGLAGES_VOIX_HAUTE, exercice: classe === "CP" ? "ponctuation" as const : "liaisons" as const, classe, phrases: vers.join("\n"), codees: false, combien: vers.length };
  return { seance, atelier: "voixHaute", titre: `${POEMES[classe].titre} — coder pour bien dire`, fabriquer: (graine) => ({ html: htmlVoixHaute(r, graine), style: STYLE_FEUILLE + STYLE_VOIX_HAUTE }) };
};

/** Les textes à écouter de chaque classe : une recette ou une règle, un récit, un documentaire, un texte pour l'évaluation. */
const A_ECOUTER: Record<ClasseC2, [string, string, string, string]> = {
  CP: ["salade", "chaton", "herisson", "pique-nique"],
  CE1: ["pateasel", "renardeau", "abeille", "bonnet"],
  CE2: ["regle-jeu", "concours", "migrations", "grenier"],
};

type Plan = { feuilles: FeuilleAFabriquer[]; materiel: string[] };

const PLANS: Record<string, (classe: ClasseC2) => Plan> = {
  "ecouter-comprendre-c2": (classe) => {
    const [consigne, recit, doc, evalu] = A_ECOUTER[classe];
    return {
      feuilles: [
        cx(0, `${texteDe(consigne)!.titre} — j'écoute et je comprends`, { exercice: "ecoute", classe, texte: consigne }),
        cx(1, `${texteDe(recit)!.titre} — j'écoute et je comprends`, { exercice: "ecoute", classe, texte: recit }),
        cx(2, `${texteDe(doc)!.titre} — j'écoute et je comprends`, { exercice: "ecoute", classe, texte: doc }),
        cx(4, `${texteDe(evalu)!.titre} — évaluation`, { exercice: "ecoute", classe, texte: evalu }),
      ],
      materiel: ["Le matériel de la recette ou du jeu", "Le récit, lu sans montrer les illustrations", "Un tableau à trois colonnes pour classer les informations", "Un récit plus long, ou une interview enregistrée", "Les feuilles d'évaluation"],
    };
  },
  "raconter-c2": (classe) => ({
    feuilles: [ol(1, "Raconter — ma grille", { exercice: "grille", classe, genre: "raconter" }), ol(2, "Raconter une histoire", { exercice: "raconter", classe }), ol(4, "Raconter — ma grille, la production finale", { exercice: "grille", classe, genre: "raconter" })],
    materiel: ["Un enregistreur ou une tablette ; une histoire lue en classe", "Les enregistrements ; une affiche pour la grille", "La carte du récit ; les mots imposés à découper", "Une image à décrire ; le matériel d'une expérience", "Un enregistreur ; une nouvelle histoire"],
  }),
  "dire-un-poeme-c2": (classe) => ({
    feuilles: [ol(0, `${POEMES[classe].titre} — le poème à dire`, { exercice: "poeme", classe }), ol(1, "Dire un poème — ma grille", { exercice: "grille", classe, genre: "poeme" }), poemeACoder(3, classe), ol(4, "Dire un poème — ma grille, le récital", { exercice: "grille", classe, genre: "poeme" })],
    materiel: ["Le poème, en grand ; un enregistreur", "Les enregistrements ; une affiche pour la grille", "Le poème découpé en vers", "Des crayons pour coder", "Le cahier de poésie ; de quoi illustrer"],
  }),
  "expose-c2": (classe) => ({
    feuilles: [ol(1, "Présenter un exposé — ma grille", { exercice: "grille", classe, genre: "expose" }), ol(2, "Préparer un exposé", { exercice: "planExpose", classe }), ol(4, "Présenter un exposé — ma grille, l'exposé", { exercice: "grille", classe, genre: "expose" })],
    materiel: ["Un objet ou une image apportés par chacun ; un enregistreur", "Un exposé modèle du professeur ; une affiche pour la grille", "Des documents sur les sujets choisis", "Les supports : affiches, objets, images", "Les supports ; les grilles"],
  }),
  "echanger-c2": (classe) => ({
    feuilles: [ol(1, "Échanger, débattre — ma grille", { exercice: "grille", classe, genre: "debat" }), ol(2, "Je prends la parole", { exercice: "expressions", classe }), ol(3, "Les rôles de l'échange", { exercice: "roles", classe }), ol(4, "Échanger, débattre — ma grille, le débat", { exercice: "grille", classe, genre: "debat" })],
    materiel: ["Un album lu ; une question qui partage la classe ; un enregistreur", "L'enregistrement ; une affiche pour les règles", "Les cartes à découper", "Les cartes des rôles ; un sablier", "Une nouvelle question"],
  }),
  "registres-c2": (classe) => ({
    feuilles: [ol(2, classe === "CP" ? "Dans la cour, en classe" : "Familier, courant, soutenu", { exercice: "registres", classe }), ol(3, "Les jeux de rôles", { exercice: "situations", classe }), ol(4, "Les registres — ma grille", { exercice: "grille", classe, genre: "debat" })],
    materiel: ["Un objet à demander ; un enregistreur", "Les enregistrements, au tableau", "Des phrases en étiquettes", "Les cartes de situations à découper", "Les cartes ; les grilles"],
  }),
};

export const estUneDemarcheDOral = (id: string) => id in PLANS;

export function planDeLOral(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const fabrique = PLANS[demarcheId];
  if (!fabrique) return null;
  const p = fabrique(ctx.classe);
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
