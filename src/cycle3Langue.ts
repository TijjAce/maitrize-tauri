// La grammaire, l'orthographe grammaticale et la conjugaison du cours moyen.
//
// Les livrets d'accompagnement de français s'arrêtent au CE2 : ces séquences
// sont bâties, en le disant, sur le programme de français du cycle 3 (2025)
// et ses exemples de réussite du CM1 et du CM2. Le programme structure les
// temps d'apprentissage : « une introduction de la notion ; des rétroactions
// sur les éléments déjà connus ; des observations/comparaisons/manipulations
// […] ; une restitution collective pour aboutir à une institutionnalisation
// qui donne lieu à une trace écrite », puis des exercices d'application,
// d'entraînement et de consolidation — exercices, dictées, gammes
// d'écriture, productions d'écrits. Ce sont les quatre temps des livrets.
// Les corpus vont des cas les plus canoniques aux spécificités. Les feuilles
// viennent de grammaireCoursMoyen.ts.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_GRAMMAIRE_CM, STYLE_GRAMMAIRE_CM, htmlGrammaireCM, type ExerciceGrammaireCM } from "./grammaireCoursMoyen";
import type { TempsCM } from "./conjugaisonCM";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
/** Une séance de découverte : la situation, l'observation et la manipulation du corpus, ce qu'on retient. */
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = MANIPULER) =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
/** L'entraînement : une plage courte, pour stabiliser et automatiser. */
const entrainement = (titre: string, objectif: string, activite: string, retenir: string) =>
  seance(titre, sauront(objectif), 30, [ph(T1, "5 min", "La trace écrite relue dans le cahier de références ; un exemple rappelé."), ph(T4, "20 min", activite), ph(T3, "5 min", retenir)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

export const PROGRAMME_FRANCAIS_C3 = "Bâtie sur le programme de français du cycle 3 (2025) et ses exemples de réussite du CM1 et du CM2 (Éduscol, 2025), faute de livret d'accompagnement de français au cours moyen ; temps d'apprentissage du programme, en quatre temps comme les livrets";
const MANIPULER = "Le corpus part des cas les plus canoniques ; les élèves trient, classent, comparent, manipulent — déplacer, supprimer, remplacer, ajouter, encadrer — et formulent ce qu'ils observent.";

// ── La phrase : types, formes, interrogation ─────────────────────────────

const phraseTypes = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "phrase-types-cm1", nom: "Les types et les formes de phrases ; poser une question (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Identifier les trois types de phrases — déclaratif, interrogatif, impératif — et les formes négative et exclamative, et comprendre leurs effets dans un texte ; transformer des phrases d'un type à un autre, d'une forme à une autre, à l'oral puis à l'écrit ; poser une question de trois façons : l'intonation, « est-ce que », l'inversion du sujet, avec le trait d'union et le -t- quand il le faut (« Mange-t-il des fruits ? », exemples de réussite du CM1). Le corpus vient des textes lus : un dialogue, une recette, une lettre.",
  seances: [
    trois("Trois types de phrases", "reconnaître une phrase déclarative, interrogative ou impérative, et dire ce qu'elle fait.",
      "Un court texte qui mêle les trois types — un dialogue du livre lu, une recette. Que fait chaque phrase : elle raconte, elle demande, elle donne un ordre ?",
      "Classer les phrases du corpus en trois colonnes ; repérer la ponctuation et le verbe à l'impératif ; transformer une phrase d'un type à l'autre, à l'oral puis à l'écrit.",
      "Ce qu'on retient : la phrase déclarative dit, l'interrogative demande, l'impérative ordonne ou conseille. La trace écrite va dans le cahier de références."),
    trois("Les formes négative et exclamative", "mettre une phrase à la forme négative ou exclamative et en dire l'effet.",
      "Deux phrases du texte : « Il a compris. » et « Il n'a pas compris. » Qu'est-ce qui change ?",
      "Repérer les mots de la négation — ne … pas, ne … jamais, ne … plus, ne … rien — ; mettre des phrases à la forme négative, puis exclamative ; les lire à voix haute pour en entendre l'effet.",
      "Ce qu'on retient : la négation encadre le verbe, et l'auxiliaire aux temps composés ; la phrase exclamative dit un sentiment : « Comme il est grand ! »"),
    trois("Poser une question de trois façons", "poser une question par l'intonation, avec « est-ce que » et par l'inversion du sujet.",
      "À l'oral, la même question de trois façons : « Tu viens ? », « Est-ce que tu viens ? », « Viens-tu ? » Laquelle dit-on à un camarade ? Laquelle écrit-on dans une lettre ?",
      "Transformer des phrases déclaratives en questions, à l'oral puis à l'écrit ; observer l'inversion, le trait d'union, le -t- quand le verbe finit par une voyelle — « Mange-t-il des fruits ? » — ; aux temps composés, l'inversion avec l'auxiliaire : « Avez-vous compris ? »",
      "Ce qu'on retient : trois façons de poser une question ; le point d'interrogation ; le -t- entre deux voyelles."),
    entrainement("S'entraîner : transformer des phrases", "transformer une phrase d'un type ou d'une forme à l'autre.",
      "Transformer des phrases d'un type ou d'une forme à l'autre ; écrire les questions qu'on poserait à un personnage du livre lu.",
      "Ce qu'on retient : je relis la ponctuation de chaque phrase."),
    evaluation("identifier le type et la forme de phrases, et poser une question de trois façons", "Ensuite, en production d'écrits : le dialogue d'un personnage qui pose des questions."),
  ],
} : {
  id: "phrase-types-cm2", nom: "Types et formes de phrases, interrogation : des corpus plus complexes (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Consolider les objectifs du CM1 avec des corpus de plus en plus complexes : transformer, à l'oral et à l'écrit, une phrase déclarative en phrase interrogative en reprenant le sujet par un pronom après le verbe, ou entre l'auxiliaire et le participe aux temps composés, avec le trait d'union et le -t- euphonique : « Le facteur est-il passé ? La directrice viendra-t-elle avec nous ? » (exemples de réussite du CM2) ; varier les types et les formes de phrases dans ses écrits pour en donner le ton.",
  seances: [
    trois("Questionner un personnage", "poser une question en reprenant le sujet par un pronom après le verbe.",
      "Les questions d'une interview, ou d'un dialogue du roman lu : comment sont-elles construites ?",
      "Transformer des phrases déclaratives en questions de trois façons ; quand le sujet est un nom, le reprendre par un pronom : « Le facteur est-il passé ? » ; aux temps composés, le pronom vient entre l'auxiliaire et le participe.",
      "Ce qu'on retient : l'inversion, avec le sujet repris par un pronom, le trait d'union et le -t-."),
    trois("Types et formes dans un texte", "dire l'effet du type et de la forme des phrases dans un texte, et les varier.",
      "Une page du roman lu : où sont les phrases exclamatives, négatives, impératives ? Quel effet ?",
      "Relever et classer ; transformer un passage à la forme négative, puis exclamative ; écrire les répliques d'un personnage en colère, inquiet, curieux.",
      "Ce qu'on retient : le type et la forme des phrases donnent le ton d'un texte."),
    entrainement("S'entraîner : l'interview d'un personnage", "écrire des questions variées, justes et ponctuées.",
      "Écrire l'interview d'un personnage du livre lu : dix questions, de trois façons ; échanger, répondre.",
      "Ce qu'on retient : je vérifie le trait d'union, le -t- et le point d'interrogation."),
    evaluation("transformer des phrases d'un type et d'une forme à l'autre, et poser des questions par l'inversion", "Ensuite, en production d'écrits : les dialogues du récit."),
  ],
};

// ── Le verbe, le sujet, les compléments ──────────────────────────────────

const VERBE_SUJET_CM1: Demarche = {
  id: "verbe-sujet-cm1", nom: "Le verbe conjugué et le groupe sujet (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Consolider l'identification du verbe conjugué — il change avec le temps, s'encadre par ne … pas, et l'on retrouve son infinitif — et du groupe sujet, par l'encadrement « c'est … qui » et le remplacement par un pronom ; reconnaître le sujet quelle que soit sa nature : un pronom personnel, un nom propre, un groupe nominal, plusieurs noms. Se familiariser ainsi avec les notions de nature et de fonction ; le verbe est le pivot de la phrase (exemples de réussite du CM1).",
  seances: [
    trois("Le verbe, pivot de la phrase", "trouver le verbe conjugué d'une phrase et son infinitif.",
      "Une phrase au tableau, qu'on dit hier, aujourd'hui, demain : quel mot change ?",
      "Repérer le verbe conjugué par le changement de temps et l'encadrement ne … pas ; retrouver son infinitif — « il prend », prendre — ; trier les verbes d'un texte selon leur infinitif et leur temps.",
      "Ce qu'on retient : le verbe change avec le temps ; il s'encadre par ne … pas ; son infinitif est son nom dans le dictionnaire."),
    trois("Le groupe sujet", "trouver le groupe sujet par l'encadrement et le remplacement par un pronom.",
      "« Le jardinier arrose les rosiers. » Qui arrose ? On encadre : « C'est le jardinier qui arrose les rosiers. »",
      "Encadrer le sujet par « c'est … qui » ; le remplacer par un pronom — il, elle, ils, elles — et inversement ; souligner le verbe et le sujet dans un corpus.",
      "Ce qu'on retient : le sujet dit qui fait l'action ou de qui l'on parle ; il commande l'accord du verbe."),
    trois("Le sujet, quelle que soit sa nature", "reconnaître un sujet, qu'il soit un pronom, un nom propre, un groupe nominal ou plusieurs noms.",
      "Quatre phrases dont le sujet est un pronom, un nom propre, un groupe nominal, plusieurs noms : qu'ont-ils en commun ?",
      "Classer les sujets du corpus selon leur nature ; remplacer chacun par un pronom ; écrire des phrases aux sujets de natures différentes.",
      "Ce qu'on retient : être sujet, c'est une fonction ; un pronom, un nom propre, un groupe nominal, c'est une nature."),
    entrainement("S'entraîner : le verbe et le sujet", "trouver le verbe et le sujet dans un paragraphe.",
      "Souligner le verbe et le sujet de phrases, puis d'un paragraphe du texte lu ; donner l'infinitif de chaque verbe.",
      "Ce qu'on retient : je cherche d'abord le verbe, puis son sujet."),
    evaluation("trouver le verbe conjugué et son infinitif, et le groupe sujet, quelle que soit sa nature", "Ensuite, en révision de texte : relire en vérifiant chaque verbe et son sujet."),
  ],
};

const SUJET_INVERSE_CM2: Demarche = {
  id: "sujet-inverse-cm2", nom: "Le sujet, même inversé ; nature et fonction (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Consolider l'identification du groupe sujet, du groupe verbal et des groupes circonstanciels ; identifier le sujet inversé dans des cas simples, d'abord dans des phrases interrogatives (« Où est passé le chat ? Veux-tu venir avec nous ? »), puis dans des phrases déclaratives (« Au loin brille la lumière d'un phare ») ; distinguer la nature d'un groupe — ce qu'il est — de sa fonction — ce qu'il fait dans la phrase : une même nature peut avoir plusieurs fonctions, une même fonction peut être tenue par des natures diverses (exemples de réussite du CM2).",
  seances: [
    trois("Où est le sujet ?", "trouver le sujet d'une phrase, même placé après le verbe.",
      "« Au loin brille la lumière d'un phare. » Qui brille ? On encadre : « C'est la lumière d'un phare qui brille. »",
      "Repérer le sujet de phrases interrogatives, puis de phrases déclaratives où il suit le verbe ; remettre la phrase dans l'ordre habituel pour vérifier ; accorder le verbe.",
      "Ce qu'on retient : le sujet peut être placé après le verbe ; « c'est … qui » le trouve toujours."),
    trois("Nature et fonction", "distinguer la nature d'un groupe et sa fonction dans la phrase.",
      "« Le chat dort. » « Je caresse le chat. » « le chat » : même nature, même fonction ?",
      "Pour des groupes soulignés, écrire la nature, puis la fonction ; trouver une même fonction tenue par des natures différentes — un nom propre, un groupe nominal, un pronom sujets.",
      "Ce qu'on retient : la nature d'un mot ne change pas ; sa fonction dépend de la phrase. Le verbe est le pivot de la phrase."),
    entrainement("S'entraîner : analyser une phrase", "analyser une phrase simple en groupes, avec leur nature et leur fonction.",
      "Analyser des phrases d'un texte lu : le groupe sujet, le groupe verbal, les groupes circonstanciels ; la nature et la fonction de chaque groupe.",
      "Ce qu'on retient : je trouve le verbe, puis le sujet, puis les compléments."),
    evaluation("identifier le sujet, même inversé, et distinguer nature et fonction", "Ensuite, en révision de texte : l'accord du verbe avec un sujet inversé."),
  ],
};

const COMPLEMENTS_CM1: Demarche = {
  id: "complements-cm1", nom: "Compléments d'objet et compléments circonstanciels (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Distinguer le complément d'objet du complément circonstanciel par les manipulations — le circonstanciel se déplace et se supprime, le complément d'objet non — ; identifier les groupes circonstanciels, sans les distinguer ; puis, dans des phrases prototypiques sans ambiguïté, différencier le complément d'objet direct, construit sans préposition, du complément d'objet indirect, introduit par à ou de. Les manipulations — déplacement, suppression, remplacement, ajout, encadrement — deviennent des habiletés au service de l'écriture.",
  seances: [
    trois("Déplacer, supprimer : le groupe circonstanciel", "repérer un groupe circonstanciel parce qu'il se déplace et se supprime.",
      "« Le boulanger prépare le pain pendant la nuit. » Que peut-on déplacer ? supprimer ?",
      "Par deux, des bandes de phrases découpées en groupes : déplacer, supprimer, et dire si la phrase garde son sens ; colorier les groupes qui bougent.",
      "Ce qu'on retient : le groupe circonstanciel se déplace et se supprime ; il dit quand, où, comment, pourquoi."),
    trois("Le complément d'objet", "distinguer le complément d'objet du complément circonstanciel.",
      "« Le boulanger prépare. » Il manque quelque chose : le complément du verbe.",
      "Trier les compléments du corpus : ceux qu'on ne peut ni déplacer ni supprimer, ceux qu'on peut ; remplacer les compléments d'objet par un pronom — le, la, les.",
      "Ce qu'on retient : le complément d'objet complète le verbe ; il ne se déplace pas et, souvent, ne se supprime pas."),
    trois("COD ou COI ?", "différencier le complément d'objet direct et le complément d'objet indirect.",
      "« Le chien suit Noé. » « Le chien obéit à Noé. » Quelle différence ?",
      "Classer des compléments d'objet : sans préposition, ou introduits par à ou de ; dans des phrases prototypiques, sans ambiguïté.",
      "Ce qu'on retient : le COD est construit directement ; le COI est introduit par à ou de."),
    entrainement("S'entraîner : les manipulations au service de l'écriture", "enrichir ou alléger une phrase par les compléments.",
      "Enrichir une phrase en ajoutant des groupes circonstanciels, puis alléger un texte en en supprimant ; souligner et nommer les compléments.",
      "Ce qu'on retient : déplacer un complément circonstanciel en tête varie les débuts de phrases."),
    evaluation("distinguer complément d'objet et complément circonstanciel, et le COD du COI", "Ensuite, en production d'écrits : varier ses débuts de phrases par un groupe circonstanciel."),
  ],
};

const COMPLEMENTS_CM2: Demarche = {
  id: "complements-cm2", nom: "COD, COI, attribut du sujet ; compléments circonstanciels de temps, de lieu, de cause (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Différencier le complément d'objet direct, construit directement après le verbe, du complément d'objet indirect, construit à l'aide d'une préposition ; différencier l'attribut du sujet, relié au sujet par un verbe comme être, devenir, sembler, rester, et le complément d'objet ; distinguer et nommer précisément les compléments circonstanciels de temps, de lieu et de cause ; mobiliser les manipulations syntaxiques pour produire, améliorer et réviser ses écrits.",
  seances: [
    trois("COD ou COI ?", "différencier le COD et le COI, et les remplacer par un pronom.",
      "Rappel du CM1 : « Le chien suit Noé. » « Le chien obéit à Noé. »",
      "Classer les compléments d'objet d'un corpus plus complexe ; les remplacer par un pronom — le, la, les ; lui, leur.",
      "Ce qu'on retient : le COD est construit directement ; le COI, avec une préposition."),
    trois("L'attribut du sujet", "distinguer l'attribut du sujet du complément d'objet.",
      "« Ma tante est infirmière. » « Ma tante soigne les malades. » Le groupe après le verbe est-il un complément d'objet ?",
      "Repérer les verbes d'état — être, devenir, sembler, paraître, rester — ; remplacer le verbe par « être » pour vérifier ; distinguer attribut et COD.",
      "Ce qu'on retient : l'attribut dit comment est le sujet ; un verbe d'état le relie au sujet, et il s'accorde avec lui."),
    trois("Temps, lieu, cause", "nommer les compléments circonstanciels de temps, de lieu et de cause.",
      "« À cause du brouillard, l'avion reste au sol. » Que dit chaque groupe ?",
      "Classer les compléments circonstanciels : quand ? où ? pourquoi ? ; les déplacer, les supprimer ; en ajouter pour enrichir un récit.",
      "Ce qu'on retient : les compléments circonstanciels de temps, de lieu, de cause se déplacent et se suppriment."),
    entrainement("S'entraîner : améliorer un texte", "améliorer un texte en déplaçant, ajoutant ou supprimant des compléments.",
      "Améliorer un texte en déplaçant, ajoutant ou supprimant des compléments ; analyser les compléments de phrases d'un texte lu.",
      "Ce qu'on retient : les manipulations m'aident à réviser mes écrits."),
    evaluation("distinguer COD, COI, attribut du sujet et compléments circonstanciels de temps, de lieu, de cause", "Ensuite, en production d'écrits : situer un récit dans le temps et dans l'espace."),
  ],
};

// ── Les classes de mots ───────────────────────────────────────────────────

const CLASSES_MOTS_CM1: Demarche = {
  id: "classes-mots-cm1", nom: "Les classes de mots : déterminants, adverbes, conjonctions, pronoms (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Identifier et nommer les déterminants — articles définis et indéfinis, déterminants possessifs et démonstratifs —, les conjonctions de coordination, les adverbes les plus fréquents, invariables, qu'on compile au fil des rencontres ; distinguer les pronoms personnels sujets des pronoms personnels compléments, et remplacer un groupe nominal sujet ou objet par un pronom. Catégoriser un corpus de mots selon leur classe, en listes ou en tableau (exemples de réussite du CM1).",
  seances: [
    trois("Les déterminants", "nommer les déterminants et leurs variations.",
      "Des groupes nominaux du texte lu : quels petits mots annoncent le nom ?",
      "Trier les déterminants : articles définis, indéfinis, déterminants possessifs, démonstratifs ; observer leurs variations — mon amie, et non « ma amie » ; cet oiseau.",
      "Ce qu'on retient : le tableau des déterminants, dans le cahier de références."),
    trois("Les adverbes et les conjonctions de coordination", "repérer les adverbes, invariables, et les conjonctions de coordination.",
      "« Il dort souvent. » « Il dort toujours. » « Il dort très peu. » Ces mots changent-ils au pluriel ?",
      "Repérer les adverbes d'un texte et les classer — temps, lieu, manière, quantité — sur une affiche qu'on enrichira ; relier deux phrases par mais, ou, et, donc, or, ni, car.",
      "Ce qu'on retient : l'adverbe est invariable ; les conjonctions de coordination relient des mots ou des phrases."),
    trois("Les pronoms personnels sujets et compléments", "distinguer les pronoms sujets et compléments, et remplacer un groupe nominal par un pronom.",
      "« Malik promène son chien. Il le promène. » Que remplacent « il » et « le » ?",
      "Remplacer des groupes nominaux sujets, puis objets, par des pronoms ; trier les pronoms : sujets — je, tu, il… —, compléments — me, te, le, la, les…",
      "Ce qu'on retient : le pronom remplace un nom ou un groupe nominal ; le pronom complément se place devant le verbe."),
    entrainement("S'entraîner : la classe des mots", "classer tous les mots d'une phrase.",
      "Classer tous les mots d'une phrase, puis d'un paragraphe, dans un tableau ; compléter l'affiche des adverbes.",
      "Ce qu'on retient : la classe d'un mot se trouve à sa place dans la phrase."),
    evaluation("nommer la classe des mots d'une phrase et remplacer un groupe nominal par un pronom", "Ensuite, les adverbes rencontrés dans les lectures s'ajoutent à l'affiche."),
  ],
};

const CLASSES_MOTS_CM2: Demarche = {
  id: "classes-mots-cm2", nom: "Prépositions, conjonctions de subordination, pronoms personnels (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Identifier et nommer les prépositions et les conjonctions de subordination, en lien avec les phrases complexes ; reconnaître les deux sortes de pronoms personnels, sujets et compléments, et les pronoms compléments d'objet ; connaître les variations du pronom personnel — personne, nombre, fonction — et retrouver l'antécédent d'un pronom objet dans des phrases simples ; catégoriser tous les mots d'un corpus selon leur classe (exemples de réussite du CM2).",
  seances: [
    trois("Les prépositions", "repérer les prépositions, invariables, qui introduisent un groupe.",
      "« le chat de ma voisine », « dans la cour », « avec nos amis » : quel petit mot relie ?",
      "Repérer les prépositions d'un texte — à, de, dans, sur, avec, pour, sans, par, en… — ; observer qu'elles sont invariables et introduisent un groupe ; en dresser la liste de référence.",
      "Ce qu'on retient : la préposition, invariable, introduit un complément."),
    trois("Les conjonctions de subordination", "repérer les conjonctions de subordination et relier deux phrases.",
      "« Quand la cloche sonne, les élèves rangent leurs affaires. » Combien de verbes conjugués ?",
      "Relier deux phrases par quand, si, parce que, lorsque, puisque, comme ; les distinguer des conjonctions de coordination.",
      "Ce qu'on retient : la conjonction de subordination relie une partie de la phrase à une autre, dans une phrase complexe."),
    trois("Les pronoms personnels et leur antécédent", "remplacer un complément d'objet par un pronom et retrouver ce qu'un pronom remplace.",
      "« Léa a cueilli des fleurs. Elle les offre à sa mère. » Qui est « elle » ? Que sont « les » ?",
      "Remplacer des compléments d'objet par le, la, les, lui, leur ; retrouver l'antécédent de chaque pronom d'un paragraphe ; classer les pronoms selon leur personne, leur nombre, leur fonction.",
      "Ce qu'on retient : le tableau des pronoms personnels, sujets et compléments."),
    entrainement("S'entraîner : la classe des mots", "classer tous les mots d'un corpus de phrases.",
      "Classer tous les mots d'un corpus de phrases ; trouver dans un paragraphe tous les mots d'une à trois classes données.",
      "Ce qu'on retient : je justifie la classe de chaque mot."),
    evaluation("nommer la classe des mots et retrouver l'antécédent d'un pronom", "Ensuite, la phrase complexe."),
  ],
};

// ── Le groupe nominal et les accords ──────────────────────────────────────

const groupeNominal = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "groupe-nominal-cm1", nom: "Le groupe nominal : le nom noyau et l'épithète (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Repérer des groupes nominaux dans une phrase simple et nommer leurs éléments : déterminant + nom ; déterminant + nom + adjectif ; déterminant + adjectif + nom ; repérer et nommer le nom noyau ; aborder la notion d'épithète, l'adjectif qui complète le nom noyau.",
  seances: [
    trois("Repérer les groupes nominaux", "repérer les groupes nominaux d'une phrase et dire comment ils sont construits.",
      "Une phrase du texte lu : quels groupes de mots désignent une personne, un animal, une chose ?",
      "Encadrer les groupes nominaux d'un paragraphe ; les remplacer par un pronom pour vérifier ; les classer selon leur construction.",
      "Ce qu'on retient : un groupe nominal a un nom pour noyau, avec un déterminant ; il peut avoir un adjectif."),
    trois("Le nom noyau et l'épithète", "trouver le nom noyau et les adjectifs épithètes d'un groupe nominal.",
      "« un petit chien noir » : quel mot ne peut-on pas supprimer ?",
      "Supprimer, ajouter des adjectifs ; trouver le nom noyau ; enrichir des groupes nominaux pour décrire un personnage.",
      "Ce qu'on retient : l'adjectif épithète complète le nom noyau, avant ou après lui ; on peut le supprimer."),
    entrainement("S'entraîner : enrichir un groupe nominal", "enrichir des groupes nominaux pour décrire.",
      "Écrire le portrait d'un personnage avec des groupes nominaux enrichis ; souligner chaque nom noyau.",
      "Ce qu'on retient : le nom noyau, puis ce qui le complète."),
    evaluation("repérer le nom noyau et les adjectifs épithètes d'un groupe nominal", "Ensuite, la chaîne d'accords dans le groupe nominal."),
  ],
} : {
  id: "groupe-nominal-cm2", nom: "Les expansions du nom : épithète, complément du nom ; épithète ou attribut (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Aborder la notion d'expansion du nom : l'adjectif et le groupe nominal prépositionnel ; repérer les groupes nominaux prépositionnels, leur préposition, et nommer leur fonction : complément du nom ; différencier l'adjectif épithète, dans le groupe nominal, et l'adjectif attribut du sujet, relié au sujet par un verbe — l'adjectif ne peut pas être attribut dans un groupe nominal (exemples de réussite du CM2).",
  seances: [
    trois("Enrichir le nom", "repérer les expansions du nom : l'adjectif épithète et le complément du nom.",
      "« une robe », « une robe rouge », « une robe à fleurs » : comment enrichit-on le nom ?",
      "Trier des groupes nominaux : avec un adjectif, avec un complément du nom ; repérer la préposition ; enrichir des noms pour décrire un objet mystère.",
      "Ce qu'on retient : le nom noyau peut avoir des expansions : l'adjectif épithète et le complément du nom, introduit par une préposition."),
    trois("Épithète ou attribut ?", "distinguer l'adjectif épithète et l'adjectif attribut du sujet.",
      "« Le ciel gris annonce la pluie. » « Le ciel devient gris. » Même adjectif, même fonction ?",
      "Classer les adjectifs d'un corpus, puis d'un court texte : dans le groupe nominal, ou après un verbe d'état ; les accorder.",
      "Ce qu'on retient : l'épithète est dans le groupe nominal ; l'attribut est relié au sujet par un verbe."),
    entrainement("S'entraîner : décrire avec précision", "enrichir des noms par des épithètes et des compléments du nom.",
      "Décrire un lieu du roman lu avec des expansions du nom ; analyser les groupes nominaux d'un passage.",
      "Ce qu'on retient : chaque expansion précise le nom noyau."),
    evaluation("repérer le nom noyau et ses expansions, et distinguer épithète et attribut", "Ensuite, la chaîne d'accords dans le groupe nominal et avec l'attribut."),
  ],
};

const accordsGN = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "accords-gn-cm1", nom: "Ce qui varie, et la chaîne d'accords dans le groupe nominal (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Identifier les classes de mots qui varient — déterminant, nom, adjectif, pronom personnel, verbe — et selon quoi : le genre, le nombre, la personne, le temps ; retenir les variations des déterminants ; repérer le donneur d'accord du groupe nominal, le nom noyau ; transformer en genre et en nombre des groupes nominaux, isolés puis dans des phrases, et justifier chaque variation (« un petit ours, une petite ourse », exemples de réussite du CM1) ; s'aider de ses outils de référence.",
  seances: [
    trois("Qu'est-ce qui varie ?", "dire quelles classes de mots varient, et selon quoi.",
      "« un petit ours » et « des petites ourses » : qu'est-ce qui a changé ?",
      "Faire varier des groupes nominaux en genre et en nombre, des verbes en personne et en temps ; classer dans un tableau ce qui varie et selon quoi ; retenir les variations des déterminants.",
      "Ce qu'on retient : le déterminant, le nom, l'adjectif varient en genre et en nombre ; le pronom et le verbe, en personne ; le verbe, en temps."),
    trois("Le nom noyau donne l'accord", "accorder le déterminant et l'adjectif avec le nom noyau, et le justifier.",
      "« des fleurs jaunes » : qui donne le pluriel à « jaunes » ?",
      "Transformer des groupes nominaux isolés, puis dans des phrases ; justifier chaque marque : « jaunes » prend un s parce que « fleurs » est au pluriel.",
      "Ce qu'on retient : le nom noyau est le donneur d'accord ; le déterminant et l'adjectif prennent son genre et son nombre."),
    entrainement("S'entraîner : la chaîne d'accords", "réaliser la chaîne d'accords du groupe nominal en écrivant.",
      "Des dictées courtes de groupes nominaux, puis de phrases ; vérifier chaque chaîne avec son outil de référence.",
      "Ce qu'on retient : je relis chaque groupe nominal à partir de son nom noyau."),
    evaluation("transformer des groupes nominaux en genre et en nombre et justifier les accords", "Ensuite, à chaque dictée et chaque écrit, vérifier la chaîne d'accords du groupe nominal."),
  ],
} : {
  id: "accords-gn-cm2", nom: "La chaîne d'accords dans le groupe nominal ; des variations particulières (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Consolider l'identification des classes de mots qui varient et la chaîne d'accords dans le groupe nominal pour les cas les plus réguliers ; rencontrer en contexte quelques variations particulières, en lien avec l'orthographe lexicale — -al, -aux ; -eau, -eaux ; -eur, -euse ; -teur, -trice ; -if, -ive —, les compiler et les mémoriser ; utiliser ses outils de référence, construits en classe puis traditionnels ; appliquer la chaîne d'accords en dictée et en écrivant, au premier jet puis à la révision.",
  seances: [
    trois("La chaîne d'accords, en dictée", "justifier chaque accord du groupe nominal.",
      "Une dictée de phrases : les élèves expliquent chaque marque.",
      "Transformer des groupes nominaux et des phrases en genre et en nombre ; justifier chaque accord ; corriger une dictée à l'aide de son outil.",
      "Ce qu'on retient : le nom noyau donne son genre et son nombre au déterminant et aux adjectifs."),
    trois("Des variations particulières", "écrire les pluriels et les féminins particuliers étudiés.",
      "« un animal, des animaux » ; « un acteur, une actrice » : la règle habituelle suffit-elle ?",
      "Classer des noms et des adjectifs selon leur pluriel ou leur féminin particulier ; compiler une affiche ; transformer des groupes nominaux.",
      "Ce qu'on retient : les variations particulières, dans le cahier de références."),
    entrainement("S'entraîner : écrire juste", "appliquer la chaîne d'accords au premier jet et à la révision.",
      "Des dictées et des écrits courts ; relire chaque chaîne d'accords au premier jet, puis à la révision.",
      "Ce qu'on retient : je relis chaque groupe nominal à partir de son nom noyau."),
    evaluation("accorder les groupes nominaux, y compris les variations particulières étudiées", "Ensuite, à chaque écrit, la relecture de la chaîne d'accords."),
  ],
};

const accordSujetVerbe = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "accord-sujet-verbe-cm1", nom: "L'accord du sujet et du verbe ; le participe passé avec être (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Repérer le sujet du verbe, notamment le nom noyau du groupe nominal sujet ; accorder le verbe avec son sujet en mémorisant les marques de personne des temps étudiés ; accorder le participe passé avec le sujet quand l'auxiliaire est être ; distinguer les variations du verbe de celles du nom (« il élève / tu élèves / elles élèvent ; une élève / des élèves ») ; transformer des phrases en faisant varier le temps ou le sujet, en respectant toutes les chaînes d'accords.",
  seances: [
    trois("Le verbe s'accorde avec le nom noyau", "accorder le verbe avec le nom noyau du groupe sujet.",
      "« Le chat de mes voisins dort / dorment ? » Qui dort ?",
      "Trouver le nom noyau du groupe sujet ; choisir la forme du verbe ; transformer des phrases en changeant le sujet ; plusieurs noms font un sujet pluriel.",
      "Ce qu'on retient : le verbe s'accorde avec le nom noyau du groupe sujet."),
    trois("Nom ou verbe ?", "distinguer un nom d'un verbe qui s'écrivent de la même façon, et les accorder.",
      "« Une élève lit. » « Le berger élève des moutons. » Est-ce le même mot ?",
      "Classer des homonymes : nom ou verbe ; les faire varier — au pluriel, le nom prend -s, le verbe -nt avec ils — ; justifier.",
      "Ce qu'on retient : le nom varie en nombre, le verbe en personne."),
    trois("Le participe passé avec être", "accorder le participe passé avec le sujet quand l'auxiliaire est être.",
      "« Les filles sont arrivées. » « Les garçons sont arrivés. » Qu'est-ce qui change ?",
      "Accorder le participe passé avec le sujet : -e au féminin, -s au pluriel ; transformer des phrases au passé composé en changeant le sujet.",
      "Ce qu'on retient : avec être, le participe passé s'accorde avec le sujet."),
    entrainement("S'entraîner : transformer, accorder", "transformer des phrases en respectant toutes les chaînes d'accords.",
      "Des phrases à transformer — un autre sujet, un autre temps — en respectant toutes les chaînes d'accords ; une courte dictée.",
      "Ce qu'on retient : je relis chaque verbe en cherchant son sujet."),
    evaluation("accorder le verbe et le participe passé avec le sujet", "Ensuite, en révision de texte : vérifier l'accord de chaque verbe."),
  ],
} : {
  id: "accord-sujet-verbe-cm2", nom: "L'accord du verbe avec un sujet inversé ; l'accord de l'attribut (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Repérer les groupes sujets inversés, dans des phrases simples puis dans des cas plus complexes, pour réaliser la chaîne d'accords sujet-verbe quelle que soit la place du sujet ; conjointement à la notion d'attribut du sujet, accorder l'attribut avec le sujet ; transformer des phrases puis un court texte en faisant varier le temps et le sujet, en respectant toutes les chaînes d'accords (exemples de réussite du CM2).",
  seances: [
    trois("Le sujet placé après le verbe", "accorder un verbe dont le sujet est placé après lui.",
      "« Dans la forêt vivaient des loups. » Pourquoi « vivaient » prend-il -ent ?",
      "Trouver le sujet inversé et accorder le verbe ; remettre la phrase dans l'ordre habituel pour vérifier ; transformer : un loup, des loups.",
      "Ce qu'on retient : je cherche toujours le sujet, même après le verbe, avant d'accorder."),
    trois("L'accord de l'attribut", "accorder l'attribut avec le sujet.",
      "« Ces pommes semblent mûres. » Qui donne son accord à « mûres » ?",
      "Accorder l'attribut avec le sujet ; transformer des phrases en changeant le sujet ; repérer les attributs d'un court texte.",
      "Ce qu'on retient : l'attribut du sujet s'accorde avec le sujet, comme le verbe."),
    trois("Transformer un court texte", "récrire un court texte en changeant le sujet et le temps, sans oublier un accord.",
      "Un court texte au présent, avec « le loup » : on le récrit avec « les loups », puis à l'imparfait.",
      "Récrire en faisant varier le sujet et le temps ; vérifier chaque chaîne : groupe nominal, verbe, attribut, participe.",
      "Ce qu'on retient : une transformation touche toutes les chaînes d'accords."),
    entrainement("S'entraîner : dictées et révision", "réaliser toutes les chaînes d'accords en écrivant.",
      "Des dictées ; la révision de son texte, chaîne par chaîne.",
      "Ce qu'on retient : je relis une chaîne d'accords à la fois."),
    evaluation("accorder le verbe avec son sujet, même inversé, et l'attribut avec le sujet", "Ensuite, à chaque écrit, la relecture des accords."),
  ],
};

// ── La conjugaison ────────────────────────────────────────────────────────

const PRESENT_IMPARFAIT_FUTUR_CM1: Demarche = {
  id: "present-imparfait-futur-cm1", nom: "Le présent, l'imparfait, le futur : radical, marque de temps, marque de personne (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Mémoriser le présent, l'imparfait et le futur d'être et d'avoir, des verbes du premier et du deuxième groupe et de faire, aller, dire, venir, pouvoir, voir, vouloir, prendre ; identifier dans la terminaison la marque de temps — -ai- ou -i- à l'imparfait, -r- au futur — et la marque de personne ; reconnaître ces temps dans de courts paragraphes ; utiliser et enrichir ses outils de référence.",
  seances: [
    trois("Le présent : les marques de personne", "séparer le radical et la terminaison, et connaître les marques de personne du présent.",
      "Un verbe de chaque groupe au présent, au tableau : qu'est-ce qui ne change pas ? qu'est-ce qui change ?",
      "Séparer le radical et la terminaison ; comparer chanter, finir, prendre ; repérer les marques de personne — -e, -es, -e ; -s, -s, -t ; -ons, -ez, -ent — ; conjuguer les verbes irréguliers et les mémoriser.",
      "Ce qu'on retient : le radical porte le sens ; la terminaison, la personne. Le tableau du présent, dans le cahier de références."),
    trois("L'imparfait : la marque -ai-, -i-", "isoler la marque de temps de l'imparfait et conjuguer à l'imparfait.",
      "« je chantais », « nous chantions » : qu'y a-t-il entre le radical et la marque de personne ?",
      "Décomposer des formes de l'imparfait : chant-ai-s, chant-i-ons ; conjuguer ; repérer l'imparfait dans un texte.",
      "Ce qu'on retient : à l'imparfait, la marque de temps est -ai- ou -i- ; les marques de personne sont -s, -s, -t, -ons, -ez, -ent, pour tous les verbes."),
    trois("Le futur : la marque -r-", "isoler la marque de temps du futur et conjuguer au futur.",
      "« je chanterai », « je finirai », « je prendrai » : quelle lettre revient ?",
      "Décomposer : chante-r-ai, fini-r-ai ; conjuguer les verbes réguliers, puis être, avoir, faire, aller, venir, pouvoir, voir, vouloir, dont le radical change : je serai, j'irai, je viendrai…",
      "Ce qu'on retient : au futur, la marque de temps est -r- ; les marques de personne sont -ai, -as, -a, -ons, -ez, -ont."),
    trois("Reconnaître les temps dans un texte", "reconnaître le présent, l'imparfait, le futur et le passé composé dans un court paragraphe.",
      "Un paragraphe qui mêle présent, imparfait, futur et passé composé : quand se passe chaque action ?",
      "Pour chaque verbe : son temps, son infinitif ; justifier par la marque de temps ; récrire un passage à un autre temps.",
      "Ce qu'on retient : la marque de temps dit le temps du verbe."),
    entrainement("S'entraîner : conjuguer", "conjuguer au présent, à l'imparfait et au futur, de mémoire.",
      "Conjuguer à toutes les personnes, avec ses outils puis de mémoire ; des dictées de formes verbales.",
      "Ce qu'on retient : je vérifie la marque de temps, puis la marque de personne."),
    evaluation("conjuguer au présent, à l'imparfait et au futur, et décomposer une forme verbale", "Ensuite, le passé composé."),
  ],
};

const PASSE_COMPOSE_CM1: Demarche = {
  id: "passe-compose-cm1", nom: "Le passé composé : l'auxiliaire et le participe ; la forme négative (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Connaître la composition du passé composé en deux parties, l'auxiliaire être ou avoir au présent et le participe passé ; repérer un verbe au passé composé dans sa totalité et retrouver son infinitif ; le conjuguer pour être, avoir, les verbes du premier et du deuxième groupe et les huit verbes irréguliers ; le mettre à la forme négative en plaçant ne … pas autour de l'auxiliaire.",
  seances: [
    trois("Deux parties : l'auxiliaire et le participe", "repérer un verbe au passé composé en entier et retrouver son infinitif.",
      "« Hier, j'ai vendu trois cents baguettes. » Où est le verbe ? En combien de mots ?",
      "Souligner les verbes au passé composé d'un texte, en entier ; séparer l'auxiliaire et le participe ; retrouver l'infinitif ; trier : avec avoir, avec être.",
      "Ce qu'on retient : le passé composé, c'est l'auxiliaire avoir ou être au présent et le participe passé : chanté, fini, pris…"),
    trois("Conjuguer au passé composé", "conjuguer au passé composé les verbes étudiés.",
      "Les participes passés des verbes étudiés : -é, -i, -u, -is, -it…",
      "Conjuguer à toutes les personnes ; avec être, accorder le participe avec le sujet ; mémoriser les participes irréguliers : fait, dit, pris, venu, pu, vu, voulu, allé.",
      "Ce qu'on retient : le tableau du passé composé et de ses participes, dans le cahier de références."),
    trois("La forme négative au passé composé", "mettre un verbe au passé composé à la forme négative.",
      "« Il a compris. » « Il n'a pas compris. » Où se placent ne et pas ?",
      "Mettre des phrases à la forme négative, avec ne … pas, ne … jamais, ne … plus, ne … rien ; élider ne devant une voyelle.",
      "Ce qu'on retient : ne … pas encadre l'auxiliaire."),
    entrainement("S'entraîner : raconter au passé composé", "raconter un évènement passé au passé composé.",
      "Raconter sa journée d'hier au passé composé, à l'oral puis à l'écrit ; relire les participes.",
      "Ce qu'on retient : l'auxiliaire, puis le participe, accordé avec être."),
    evaluation("conjuguer au passé composé et le mettre à la forme négative", "Ensuite, en production d'écrits : le récit d'un évènement vécu."),
  ],
};

const PASSE_SIMPLE_CM2: Demarche = {
  id: "passe-simple-cm2", nom: "Le passé simple : marques de temps et de personne (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Mémoriser le passé simple d'être et d'avoir, des verbes du premier et du deuxième groupe et de faire, aller, dire, venir, pouvoir, voir, vouloir, prendre ; isoler ses marques de temps — -ai, -a-, -â-, -è-, -i-, -î-, -u-, -û-, -in-, -în- — et de personne (exemples de réussite du CM2) ; le reconnaître dans les récits lus, aux côtés de l'imparfait, et l'employer dans ses récits.",
  seances: [
    trois("Le temps des récits", "reconnaître le passé simple dans un récit et le distinguer de l'imparfait.",
      "Le début d'un conte : « Il était une fois… Un jour, le loup arriva… » Quels temps ?",
      "Repérer les verbes au passé simple d'un récit ; trouver leur infinitif ; comparer avec l'imparfait : l'action qui arrive, le décor qui dure.",
      "Ce qu'on retient : le passé simple raconte les actions du récit, l'imparfait le décor."),
    trois("Les marques du passé simple", "isoler les marques de temps et de personne du passé simple.",
      "« il chanta », « il finit », « il vint », « il voulut » : quelles voyelles ?",
      "Décomposer des formes : chant-a, fin-i-t, v-in-t, voul-u-t ; classer les verbes selon leur marque de temps ; conjuguer à toutes les personnes.",
      "Ce qu'on retient : les marques de temps et de personne du passé simple, dans le cahier de références."),
    trois("Conjuguer au passé simple", "conjuguer au passé simple les verbes étudiés.",
      "Les verbes à mémoriser : être, avoir, faire, aller, dire, venir, pouvoir, voir, vouloir, prendre.",
      "Conjuguer, d'abord à la troisième personne, puis à toutes ; récrire un court récit au passé simple.",
      "Ce qu'on retient : au pluriel, -èrent pour les verbes en -er ; -irent, -urent, -inrent pour les autres."),
    entrainement("S'entraîner : écrire la suite d'un conte", "employer le passé simple et l'imparfait dans un récit.",
      "Écrire la suite d'un conte au passé simple et à l'imparfait ; relire les terminaisons.",
      "Ce qu'on retient : l'action au passé simple, le décor à l'imparfait."),
    evaluation("conjuguer au passé simple et décomposer ses formes", "Ensuite, le plus-que-parfait."),
  ],
};

const TEMPS_COMPOSES_CM2: Demarche = {
  id: "temps-composes-cm2", nom: "Le passé composé et le plus-que-parfait ; l'accord du participe passé (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Connaître la composition des temps composés — l'auxiliaire au présent pour le passé composé, à l'imparfait pour le plus-que-parfait, puis le participe passé — et les distinguer par la conjugaison de l'auxiliaire ; mémoriser le plus-que-parfait des verbes étudiés ; accorder le participe passé avec le sujet quand l'auxiliaire est être, et avec le COD placé avant le verbe quand l'auxiliaire est avoir ; mettre un verbe à la forme négative aux temps composés.",
  seances: [
    trois("Deux temps composés", "distinguer le passé composé et le plus-que-parfait par leur auxiliaire.",
      "« Le loup avait marché toute la nuit. Il est arrivé au village. » Quelle différence ?",
      "Classer des formes : l'auxiliaire au présent ou à l'imparfait ; conjuguer au plus-que-parfait ; dans un récit au passé, l'action d'avant.",
      "Ce qu'on retient : le passé composé, l'auxiliaire au présent ; le plus-que-parfait, l'auxiliaire à l'imparfait."),
    trois("L'accord du participe passé", "accorder le participe passé avec être et avec avoir.",
      "« Les pommes que j'ai achetées. » « J'ai acheté des pommes. » Pourquoi -es d'un côté ?",
      "Avec être, accorder avec le sujet ; avec avoir, chercher le COD : placé avant, on accorde ; placé après, non. Des phrases prototypiques, avec les verbes étudiés.",
      "Ce qu'on retient : avec être, l'accord avec le sujet ; avec avoir, avec le COD placé avant le verbe."),
    entrainement("S'entraîner : la forme négative aux temps composés", "mettre un verbe aux temps composés à la forme négative.",
      "Mettre à la forme négative des phrases au passé composé et au plus-que-parfait ; ne … pas encadre l'auxiliaire.",
      "Ce qu'on retient : la négation encadre l'auxiliaire, à tous les temps composés."),
    evaluation("conjuguer aux temps composés, les distinguer, accorder le participe passé et mettre à la forme négative", "Ensuite, en production d'écrits : le plus-que-parfait pour raconter ce qui s'était passé avant."),
  ],
};

const radical = (classe: "CM1" | "CM2"): Demarche => classe === "CM1" ? {
  id: "radical-cm1", nom: "Les verbes dont le radical change (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Mettre en évidence les variations du radical de certains verbes du premier groupe : un e muet ou un é à l'avant-dernière syllabe (je lève, nous levons ; je cède, nous cédons), les verbes en -yer (je nettoie), en -eler et -eter (j'appelle, je jette), en -cer et -ger (nous commençons, nous mangeons) ; s'appuyer sur l'oral, qui fait entendre le changement, et sur ses outils de référence.",
  seances: [
    trois("J'entends le changement", "trouver la règle des verbes dont le radical change devant une syllabe muette.",
      "« je lève, nous levons » ; « j'appelle, nous appelons » : on les dit à voix haute.",
      "Classer des formes conjuguées selon la variation de leur radical ; trouver la règle de chaque famille.",
      "Ce qu'on retient : devant une syllabe muette, le e devient è, le é devient è ; appeler et jeter doublent leur consonne ; le y devient i."),
    trois("Le c et le g devant a et o", "conjuguer les verbes en -cer et en -ger.",
      "« nous commençons », « nous mangeons » : pourquoi un ç ? pourquoi un e ?",
      "Conjuguer des verbes en -cer et en -ger au présent et à l'imparfait ; lire à voix haute pour vérifier le son.",
      "Ce qu'on retient : le c prend une cédille et le g garde un e devant a et o, pour garder leur son."),
    entrainement("S'entraîner : les radicaux qui changent", "conjuguer de mémoire les verbes dont le radical change.",
      "Conjuguer ces verbes au présent et au futur ; compléter le tableau des verbes à radical variable du cahier de références.",
      "Ce qu'on retient : je dis le verbe à voix haute avant de l'écrire."),
    evaluation("conjuguer les verbes dont le radical change", "Ensuite, au CM2, les radicaux des verbes du troisième groupe."),
  ],
} : {
  id: "radical-cm2", nom: "Les radicaux des verbes du premier et du troisième groupe (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Consolider les variations du radical des verbes du premier groupe — e muet ou é à l'avant-dernière syllabe, -yer, -eler et -eter, -cer et -ger — et repérer les différentes formes du radical d'être, d'avoir et des verbes du troisième groupe étudiés : faire, aller, pouvoir, dire, venir, voir, vouloir, prendre (« je viens, nous venons, ils viennent »).",
  seances: [
    trois("Combien de radicaux ?", "repérer les radicaux d'un verbe du troisième groupe.",
      "« je viens, nous venons, ils viennent » : combien de radicaux pour venir ?",
      "Conjuguer les verbes du troisième groupe au présent et compter leurs radicaux ; comparer avec le futur — je viendrai — et le passé simple — je vins.",
      "Ce qu'on retient : les verbes du troisième groupe ont plusieurs radicaux ; le tableau du cahier de références les donne."),
    trois("Les verbes du premier groupe, en révision", "conjuguer les verbes du premier groupe dont le radical change.",
      "Rappel du CM1 : je lève, j'appelle, je nettoie, nous mangeons.",
      "Conjuguer à des temps variés ; classer les verbes par famille de variation.",
      "Ce qu'on retient : la règle de chaque famille de verbes."),
    entrainement("S'entraîner : les radicaux", "conjuguer de mémoire les verbes à plusieurs radicaux.",
      "Des dictées de formes verbales ; compléter le tableau des radicaux.",
      "Ce qu'on retient : je cherche le bon radical, puis la terminaison."),
    evaluation("conjuguer les verbes dont le radical change, du premier et du troisième groupe", "Ensuite, en sixième, d'autres verbes du troisième groupe."),
  ],
};

// ── La phrase complexe (CM2) ──────────────────────────────────────────────

const PHRASE_COMPLEXE_CM2: Demarche = {
  id: "phrase-complexe-cm2", nom: "Phrase simple, phrase complexe (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Distinguer phrase simple et phrase complexe à partir du repérage des verbes conjugués : une phrase simple n'a qu'un verbe conjugué, une phrase complexe en a plusieurs ; repérer les mots qui relient ses parties — conjonctions de coordination et de subordination — ; produire des phrases complexes pour lier ses idées.",
  seances: [
    trois("Combien de verbes conjugués ?", "dire si une phrase est simple ou complexe en comptant ses verbes conjugués.",
      "« Le chien aboie. Le chat s'enfuit. » et « Le chien aboie et le chat s'enfuit. » Combien de phrases ? de verbes ?",
      "Souligner les verbes conjugués d'un corpus ; trier les phrases : simples, complexes ; repérer les mots qui relient : et, mais, quand, si, parce que.",
      "Ce qu'on retient : une phrase simple a un seul verbe conjugué ; une phrase complexe en a plusieurs."),
    trois("Lier ses idées", "relier des phrases simples en une phrase complexe.",
      "Deux phrases simples au tableau : comment les relier ?",
      "Relier des phrases simples par une conjonction de coordination ou de subordination ; observer le sens de chaque mot de liaison ; améliorer un texte trop haché.",
      "Ce qu'on retient : les conjonctions relient les parties d'une phrase complexe et disent le lien entre les idées : le temps, la cause, la condition."),
    entrainement("S'entraîner : simple ou complexe ?", "repérer et écrire des phrases complexes.",
      "Repérer les phrases complexes d'un texte lu ; récrire un passage en liant les phrases.",
      "Ce qu'on retient : je compte les verbes conjugués."),
    evaluation("distinguer phrase simple et phrase complexe", "Ensuite, en sixième, la proposition."),
  ],
};

export const DEMARCHES_LANGUE_CM: Demarche[] = [
  phraseTypes("CM1"), VERBE_SUJET_CM1, COMPLEMENTS_CM1, CLASSES_MOTS_CM1, groupeNominal("CM1"), accordsGN("CM1"), accordSujetVerbe("CM1"),
  PRESENT_IMPARFAIT_FUTUR_CM1, PASSE_COMPOSE_CM1, radical("CM1"),
  phraseTypes("CM2"), SUJET_INVERSE_CM2, COMPLEMENTS_CM2, CLASSES_MOTS_CM2, groupeNominal("CM2"), accordsGN("CM2"), accordSujetVerbe("CM2"),
  PASSE_SIMPLE_CM2, TEMPS_COMPOSES_CM2, radical("CM2"), PHRASE_COMPLEXE_CM2,
];

/**
 * La séquence d'une compétence de grammaire, d'orthographe grammaticale ou
 * de conjugaison du cours moyen ; en minuscules sans accents.
 */
export function demarcheDeLaLangueCM(classe: string, cg: string, comp: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  const cm1 = classe === "cm1";
  if (/trois types de phrases/.test(cg)) return `phrase-types-${classe}`;
  if (/phrase complexe/.test(cg)) return "phrase-complexe-cm2";
  if (/chaine d.accords|classes de mots subissant des variations/.test(cg)) return `accords-gn-${classe}`;
  if (/groupe nominal/.test(cg)) return `groupe-nominal-${classe}`;
  if (/selon leur nature/.test(cg)) return `classes-mots-${classe}`;
  // Nature et fonction : au CM1, le sujet quelle que soit sa nature ; au CM2, avec le sujet inversé.
  if (/et de fonction/.test(cg)) return cm1 ? "verbe-sujet-cm1" : "sujet-inverse-cm2";
  if (/analyser une phrase simple/.test(cg)) {
    if (cm1) return /verbe conjugue|groupe sujet|types de sujets/.test(comp) ? "verbe-sujet-cm1" : "complements-cm1";
    return /sujet inverse|types de sujets|groupe sujet/.test(comp) ? "sujet-inverse-cm2" : "complements-cm2";
  }
  if (/accorder le sujet et le verbe/.test(cg)) return !cm1 && /conjugaisons a memoriser/.test(comp) ? "passe-simple-cm2" : `accord-sujet-verbe-${classe}`;
  if (/maitrise de la conjugaison/.test(cg)) {
    if (/radical/.test(comp)) return `radical-${classe}`;
    if (cm1) return /conjugaisons a memoriser/.test(comp) || !/passe compose|forme negative/.test(comp) ? "present-imparfait-futur-cm1" : "passe-compose-cm1";
    return /marque de temps/.test(comp) ? "passe-simple-cm2" : "temps-composes-cm2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const gm = (seance: number, titre: string, classe: "CM1" | "CM2", exercices: ExerciceGrammaireCM[], combien = 6, temps?: TempsCM[]): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GRAMMAIRE_CM, classe, exercices, combien, titre, ...(temps ? { temps } : {}) };
  return { seance, atelier: "grammaire", titre, fabriquer: (g) => ({ html: htmlGrammaireCM(reglages, g), style: STYLE_FEUILLE + STYLE_GRAMMAIRE_CM }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "phrase-types-cm1": {
    feuilles: [
      gm(0, "Les types et les formes de phrases", "CM1", ["types-formes"]),
      gm(2, "Poser une question de trois façons", "CM1", ["interrogation"], 4),
      gm(3, "Transformer des phrases", "CM1", ["types-formes", "interrogation"], 4),
      gm(4, "Types, formes, questions — évaluation", "CM1", ["types-formes", "interrogation"], 4),
    ],
    materiel: ["Un court texte au tableau : un dialogue, une recette", "Des phrases du texte lu, au tableau", "Des phrases déclaratives à transformer, au tableau", "Le cahier de références ; le livre lu", "Les feuilles d'évaluation"],
  },
  "phrase-types-cm2": {
    feuilles: [
      gm(0, "Poser une question : l'inversion", "CM2", ["interrogation"], 5),
      gm(1, "Les types et les formes de phrases", "CM2", ["types-formes"]),
      gm(3, "Types, formes, questions — évaluation", "CM2", ["types-formes", "interrogation"], 4),
    ],
    materiel: ["Une interview ou un dialogue du roman lu, projeté", "Une page du roman lu", "Le livre lu ; le cahier de références", "Les feuilles d'évaluation"],
  },
  "verbe-sujet-cm1": {
    feuilles: [
      gm(0, "Le verbe : son temps, son infinitif", "CM1", ["temps-verbes"], 4),
      gm(1, "Le groupe sujet", "CM1", ["sujet"], 6),
      gm(2, "Encadrer, remplacer le sujet", "CM1", ["manipulations"], 4),
      gm(4, "Le verbe et le sujet — évaluation", "CM1", ["sujet", "temps-verbes"], 4),
    ],
    materiel: ["Une phrase au tableau", "Des étiquettes de phrases ; des crayons de couleur", "Quatre phrases au tableau ; des étiquettes-sujets", "Un paragraphe du texte lu", "Les feuilles d'évaluation"],
  },
  "sujet-inverse-cm2": {
    feuilles: [
      gm(0, "Le sujet, même inversé", "CM2", ["sujet"], 6),
      gm(1, "Nature et fonction", "CM2", ["nature-fonction"], 6),
      gm(3, "Le sujet, nature et fonction — évaluation", "CM2", ["sujet", "nature-fonction"], 4),
    ],
    materiel: ["Des phrases au tableau ; des étiquettes de groupes", "Des phrases au tableau, des groupes soulignés", "Des phrases d'un texte lu", "Les feuilles d'évaluation"],
  },
  "complements-cm1": {
    feuilles: [
      gm(0, "Déplacer, supprimer", "CM1", ["manipulations"], 4),
      gm(1, "Le complément d'objet", "CM1", ["complements"], 6),
      gm(2, "COD ou COI ?", "CM1", ["complements", "pronoms"], 4),
      gm(4, "Les compléments — évaluation", "CM1", ["complements", "manipulations"], 4),
    ],
    materiel: ["Des bandes de phrases découpées en groupes ; des ciseaux", "Des phrases incomplètes au tableau", "Des phrases prototypiques au tableau", "Un texte court à enrichir", "Les feuilles d'évaluation"],
  },
  "complements-cm2": {
    feuilles: [
      gm(0, "COD ou COI ?", "CM2", ["complements", "pronoms"], 4),
      gm(1, "L'attribut du sujet", "CM2", ["complements"], 6),
      gm(2, "Temps, lieu, cause", "CM2", ["manipulations", "complements"], 4),
      gm(4, "Les compléments — évaluation", "CM2", ["complements", "nature-fonction"], 4),
    ],
    materiel: ["Des phrases au tableau", "Des phrases avec être, devenir, sembler, rester", "Des étiquettes de compléments : quand ? où ? pourquoi ?", "Un texte à améliorer", "Les feuilles d'évaluation"],
  },
  "classes-mots-cm1": {
    feuilles: [
      gm(0, "Les déterminants", "CM1", ["determinants"], 8),
      gm(1, "Les classes de mots", "CM1", ["classes"], 4),
      gm(2, "Les pronoms personnels", "CM1", ["pronoms"], 6),
      gm(4, "Les classes de mots — évaluation", "CM1", ["classes", "pronoms"], 4),
    ],
    materiel: ["Des groupes nominaux du texte lu, au tableau", "Une affiche des adverbes, à enrichir", "Des phrases au tableau", "Un paragraphe du texte lu ; l'affiche des adverbes", "Les feuilles d'évaluation"],
  },
  "classes-mots-cm2": {
    feuilles: [
      gm(0, "Les classes de mots : les prépositions", "CM2", ["classes"], 4),
      gm(1, "Les conjonctions de subordination", "CM2", ["classes", "phrase-complexe"], 4),
      gm(2, "Les pronoms personnels et leur antécédent", "CM2", ["pronoms"], 5),
      gm(4, "Les classes de mots — évaluation", "CM2", ["classes", "pronoms"], 4),
    ],
    materiel: ["Un texte au tableau ; la liste des prépositions à construire", "Des phrases à relier, au tableau", "Un paragraphe au tableau", "Un corpus de phrases", "Les feuilles d'évaluation"],
  },
  "groupe-nominal-cm1": {
    feuilles: [
      gm(0, "Le nom noyau et l'épithète", "CM1", ["groupe-nominal"], 6),
      gm(1, "Enrichir le groupe nominal", "CM1", ["groupe-nominal", "determinants"], 4),
      gm(3, "Le groupe nominal — évaluation", "CM1", ["groupe-nominal"], 6),
    ],
    materiel: ["Une phrase du texte lu, au tableau", "Des étiquettes de déterminants, de noms, d'adjectifs", "Une image de personnage à décrire", "Les feuilles d'évaluation"],
  },
  "groupe-nominal-cm2": {
    feuilles: [
      gm(0, "Les expansions du nom", "CM2", ["groupe-nominal"], 6),
      gm(1, "Épithète ou attribut ?", "CM2", ["groupe-nominal", "complements"], 4),
      gm(3, "Les expansions du nom — évaluation", "CM2", ["groupe-nominal"], 6),
    ],
    materiel: ["Des groupes nominaux au tableau ; un objet mystère", "Des phrases au tableau", "Une page du roman lu", "Les feuilles d'évaluation"],
  },
  "accords-gn-cm1": {
    feuilles: [
      gm(0, "Les variations des déterminants", "CM1", ["determinants"], 8),
      gm(1, "La chaîne d'accords", "CM1", ["accords-gn"], 6),
      gm(3, "La chaîne d'accords — évaluation", "CM1", ["accords-gn"], 6),
    ],
    materiel: ["Des groupes nominaux à transformer, au tableau", "Le cahier de références", "Les dictées ; l'outil de référence", "Les feuilles d'évaluation"],
  },
  "accords-gn-cm2": {
    feuilles: [
      gm(0, "La chaîne d'accords", "CM2", ["accords-gn"], 6),
      gm(1, "Des variations particulières", "CM2", ["accords-gn", "determinants"], 4),
      gm(3, "La chaîne d'accords — évaluation", "CM2", ["accords-gn"], 6),
    ],
    materiel: ["Une dictée de phrases", "Une affiche des variations particulières, à compléter", "Les dictées ; les outils de référence", "Les feuilles d'évaluation"],
  },
  "accord-sujet-verbe-cm1": {
    feuilles: [
      gm(0, "Le verbe s'accorde avec le nom noyau", "CM1", ["sujet-verbe"], 6),
      gm(2, "Le participe passé avec être", "CM1", ["participe"], 6),
      gm(3, "Transformer, accorder", "CM1", ["sujet-verbe", "participe"], 4),
      gm(4, "L'accord du sujet et du verbe — évaluation", "CM1", ["sujet-verbe", "participe"], 4),
    ],
    materiel: ["Des phrases au tableau", "Des étiquettes de mots homonymes : nom ou verbe", "Des phrases au passé composé, au tableau", "Une courte dictée", "Les feuilles d'évaluation"],
  },
  "accord-sujet-verbe-cm2": {
    feuilles: [
      gm(0, "Le sujet placé après le verbe", "CM2", ["sujet-verbe"], 6),
      gm(1, "L'accord de l'attribut et du participe", "CM2", ["sujet-verbe", "participe"], 4),
      gm(4, "Les accords — évaluation", "CM2", ["sujet-verbe", "participe"], 4),
    ],
    materiel: ["Des phrases au tableau", "Des phrases avec un verbe d'état", "Un court texte à récrire", "Une dictée ; un texte à réviser", "Les feuilles d'évaluation"],
  },
  "present-imparfait-futur-cm1": {
    feuilles: [
      gm(0, "Conjuguer au présent", "CM1", ["conjuguer"], 8, ["present"]),
      gm(1, "L'imparfait : la marque -ai-, -i-", "CM1", ["marques", "conjuguer"], 4, ["imparfait"]),
      gm(2, "Le futur : la marque -r-", "CM1", ["marques", "conjuguer"], 4, ["futur"]),
      gm(3, "Le temps des verbes d'un texte", "CM1", ["temps-verbes"], 6),
      gm(4, "Conjuguer au présent, à l'imparfait, au futur", "CM1", ["conjuguer"], 6, ["present", "imparfait", "futur"]),
      gm(5, "Présent, imparfait, futur — évaluation", "CM1", ["conjuguer", "marques"], 6, ["present", "imparfait", "futur"]),
    ],
    materiel: ["Trois verbes au tableau ; le cahier de références", "Des formes de l'imparfait au tableau", "Des formes du futur au tableau", "Un paragraphe au tableau", "Les outils de référence", "Les feuilles d'évaluation"],
  },
  "passe-compose-cm1": {
    feuilles: [
      gm(0, "Le passé composé dans un texte", "CM1", ["temps-verbes"], 4),
      gm(1, "Conjuguer au passé composé", "CM1", ["conjuguer", "participe"], 4, ["passeCompose"]),
      gm(2, "La forme négative au passé composé", "CM1", ["negation-composee"], 6),
      gm(4, "Le passé composé — évaluation", "CM1", ["conjuguer", "negation-composee"], 4, ["passeCompose"]),
    ],
    materiel: ["Un court texte au passé composé, au tableau", "Le tableau des participes passés", "Des phrases au tableau", "Le cahier du jour", "Les feuilles d'évaluation"],
  },
  "passe-simple-cm2": {
    feuilles: [
      gm(0, "Le temps des récits", "CM2", ["temps-verbes"], 6),
      gm(1, "Les marques du passé simple", "CM2", ["marques"], 6),
      gm(2, "Conjuguer au passé simple", "CM2", ["conjuguer"], 8, ["passeSimple"]),
      gm(4, "Le passé simple — évaluation", "CM2", ["conjuguer", "marques"], 6, ["passeSimple"]),
    ],
    materiel: ["Le début d'un conte, projeté", "Des formes du passé simple au tableau", "Le tableau des verbes à mémoriser", "Le début d'un conte à continuer", "Les feuilles d'évaluation"],
  },
  "temps-composes-cm2": {
    feuilles: [
      gm(0, "Passé composé ou plus-que-parfait ?", "CM2", ["pc-pqp", "conjuguer"], 4, ["plusQueParfait"]),
      gm(1, "L'accord du participe passé", "CM2", ["participe"], 6),
      gm(2, "La forme négative aux temps composés", "CM2", ["negation-composee"], 6),
      gm(3, "Les temps composés — évaluation", "CM2", ["pc-pqp", "participe", "negation-composee"], 4),
    ],
    materiel: ["Un extrait de récit au tableau", "Des phrases au tableau", "Des phrases à transformer", "Les feuilles d'évaluation"],
  },
  "radical-cm1": {
    feuilles: [
      gm(0, "Les verbes dont le radical change", "CM1", ["radicaux"], 6),
      gm(2, "Les radicaux qui changent — entraînement", "CM1", ["radicaux"], 8),
      gm(3, "Les radicaux qui changent — évaluation", "CM1", ["radicaux"], 6),
    ],
    materiel: ["Des formes conjuguées au tableau", "Des verbes en -cer et en -ger au tableau", "Le tableau des verbes à radical variable", "Les feuilles d'évaluation"],
  },
  "radical-cm2": {
    feuilles: [
      gm(0, "Les radicaux du troisième groupe", "CM2", ["radicaux"], 4),
      gm(1, "Les radicaux du premier groupe", "CM2", ["radicaux"], 6),
      gm(3, "Les radicaux — évaluation", "CM2", ["radicaux"], 6),
    ],
    materiel: ["Des verbes du troisième groupe au tableau", "Le tableau des verbes à radical variable", "Le tableau des radicaux", "Les feuilles d'évaluation"],
  },
  "phrase-complexe-cm2": {
    feuilles: [
      gm(0, "Phrase simple ou phrase complexe ?", "CM2", ["phrase-complexe"], 6),
      gm(1, "Les mots qui relient", "CM2", ["phrase-complexe", "classes"], 4),
      gm(3, "La phrase complexe — évaluation", "CM2", ["phrase-complexe"], 6),
    ],
    materiel: ["Des phrases au tableau", "Des phrases simples à relier", "Un texte lu ; un passage à récrire", "Les feuilles d'évaluation"],
  },
};

export const estUneDemarcheDeLangueCM = (id: string) => id in PLANS;

export function planDeLaLangueCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
