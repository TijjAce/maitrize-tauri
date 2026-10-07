// Comprendre un texte, devenir lecteur : des séquences bâties sur le
// programme de français du cycle 2 (2024) et les guides.
//
// Les livrets d'accompagnement n'ont de séquence ni pour la compréhension ni
// pour le parcours de lecteur ; l'enseignant a demandé (2026-10-07) qu'on
// les construise depuis le programme et les guides Éduscol, en le disant.
// Le programme en donne les objectifs et les exemples de réussite, cités :
// au CP, dégager le sens global d'un texte entendu ou lu, se repérer dans la
// chaîne anaphorique, comprendre l'implicite, justifier ses réponses par un
// retour au texte, lire seul un texte d'une dizaine de lignes ; au CE1, une
// quinzaine de lignes, des stratégies pour les mots inconnus ; au CE2, une
// vingtaine de lignes, des textes narratifs, poétiques, documentaires ou
// théâtraux. Le professeur « structure fermement les séances de
// compréhension » ; il lit chaque semaine des textes plus longs et
// résistants. Devenir lecteur : 5 à 10 œuvres complètes par an, les
// personnages-types, la mise en réseau, choisir ses livres, fréquenter des
// lieux de lecture. Chaque séance suit la démarche en quatre temps des
// livrets ; les feuilles viennent des ateliers « Comprendre un texte » et
// « Carnet de lecteur ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension, type ReglagesComprehension } from "./comprehension";
import { REGLAGES_LECTEUR, STYLE_LECTEUR, htmlLecteur, type ReglagesLecteur } from "./carnetDeLecteur";
import { texteDe } from "./textesDeComprehension";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

export const PROGRAMME_FRANCAIS = "Bâtie sur le programme de français du cycle 2 (2024) et les guides Éduscol, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement";
const COMPRENDRE = `${PROGRAMME_FRANCAIS} ; guides « Pour enseigner la lecture et l'écriture » au CP (2019), « Comprendre en lisant », p. 48-55, et au CE1 (2019), « Quels supports et quelle méthode pour comprendre les textes ? », p. 35-62 ; démarche en quatre temps des livrets`;
const LECTEUR = `${PROGRAMME_FRANCAIS} ; « Devenir lecteur » et « Le parcours de lecteur et la culture littéraire » ; guides « Pour enseigner la lecture et l'écriture » au CP (2019), p. 54-55 (le carnet, le journal de lecteur), et au CE1 (2019), p. 40-42 (les lectures personnelles) ; démarche en quatre temps des livrets`;

// ── Comprendre un texte : une séquence par classe ─────────────────────────

const COMPRENDRE_CP: Demarche = {
  id: "comprendre-cp", nom: "Comprendre un texte entendu, puis lu seul (CP)", famille: "Français",
  source: COMPRENDRE,
  resume: "Dégager le sens global d'un texte entendu ou lu de façon autonome, justifier ses réponses par un retour au texte, puis lire et comprendre seul un texte narratif, informatif ou prescriptif d'une dizaine de lignes. Le professeur lit chaque semaine des textes plus longs et résistants ; « à partir de la 3e période de CP », les élèves acquièrent les stratégies de compréhension sur des textes qu'ils ont eux-mêmes décodés. Exemples de réussite du programme : construire une représentation mentale au fur et à mesure de la lecture, la chronologie et les lieux d'un récit, les informations d'un texte informatif simple, les éléments qui répondent aux questions du professeur, vérifier sa compréhension entre pairs en retournant au texte.",
  seances: [
    trois("Écouter et se faire le film de l'histoire", "construire une représentation mentale d'un récit entendu et dire ce que raconte le texte.",
      "Le professeur annonce l'objectif avant de lire : « Pendant que je lis, faites-vous le film de l'histoire dans votre tête ; à la fin, vous me direz ce que raconte ce texte. »",
      "Lecture à voix haute du professeur, en deux fois. À chaque arrêt, les élèves disent ce qu'ils voient dans leur film : qui, où, ce qui se passe. Après la seconde lecture, la question du programme : « Que raconte ce texte ? » ; chacun dessine une scène, qu'on confronte au texte.",
      "Ce qu'on retient, dit par les élèves et écrit par le professeur : « Pour comprendre, je me fais le film de l'histoire et je le vérifie avec le texte. »",
      "Lis avec expressivité ; reformule les réponses en insistant sur la syntaxe."),
    trois("Les moments et les lieux du récit", "raconter un récit dans l'ordre et en nommer les lieux.",
      "Le texte de la veille, relu : « Qu'est-ce qui arrive d'abord ? et ensuite ? Où sommes-nous ? »",
      "Rappel du récit à plusieurs : on raconte l'histoire dans l'ordre, avec ses mots. Puis, seul, numéroter les moments de l'histoire ; à deux, comparer et revenir au texte quand on n'est pas d'accord.",
      "La frise des moments de l'histoire, affichée ; les mots pour raconter : d'abord, ensuite, puis, à la fin."),
    trois("Répondre en revenant au texte", "trouver la ligne du texte qui répond à une question, et la montrer.",
      "Une question du professeur : « Où est la réponse ? » On découvre que les lignes du texte sont numérotées : on peut dire où on l'a trouvée.",
      "Lecture autonome d'un texte déchiffrable d'une dizaine de lignes. Des affirmations à déclarer vraies ou fausses, en montrant la ligne qui le prouve (guide CP, p. 84-85) ; puis des questions : la relire, chercher dans le texte, écrire la réponse et le numéro de la ligne. En binôme, comparer ; en cas de désaccord, on relit la ligne ensemble.",
      "Ce qu'on retient : « Pour répondre, je relis la question, je cherche dans le texte, je montre la ligne qui le dit. »",
      "Ne valide pas une réponse sans la ligne qui la prouve."),
    trois("Lire un documentaire, une recette", "repérer les informations d'un texte informatif simple et faire ce que demande un texte prescriptif.",
      "Un documentaire sur un animal et une recette, côte à côte : « Lequel raconte une histoire ? Lequel nous apprend quelque chose ? Lequel nous dit quoi faire ? »",
      "Lire le documentaire et répondre aux questions en donnant la ligne : où vit l'animal, ce qu'il mange. Lire la recette, puis la réaliser en suivant les étapes dans l'ordre.",
      "Ce qu'on retient : un récit raconte une histoire ; un documentaire donne des informations ; une recette dit quoi faire, étape par étape."),
    evaluation("lire un texte d'une dizaine de lignes et répondre aux questions en donnant la ligne qui prouve",
      "Ensuite, les reprises (« qui est il ? ») et les inférences ; et, chaque semaine, la lecture par le professeur d'un texte résistant."),
  ],
};

const COMPRENDRE_CE1: Demarche = {
  id: "comprendre-ce1", nom: "Comprendre un texte d'une quinzaine de lignes (CE1)", famille: "Français",
  source: COMPRENDRE,
  resume: "Dégager le sens global d'un texte lu de façon autonome, « à la suite d'une séance dédiée à la compréhension » ; justifier ses réponses par un retour au texte ; lire et comprendre seul un texte narratif, informatif ou prescriptif d'une quinzaine de lignes. Exemples de réussite du programme : restituer les enchaînements logiques et chronologiques d'un récit, expliciter les émotions des personnages, donner un titre au texte, le résumer oralement, réaliser ce que demande un texte prescriptif, prendre l'habitude de relire seul un texte ou un passage pour mieux le comprendre, rechercher et repérer une information.",
  seances: [
    trois("Lire seul et se faire le film", "lire seul un texte, s'en faire une représentation et la confronter à celle des autres.",
      "L'objectif annoncé : « Vous allez lire seuls ce texte ; ensuite, vous me raconterez le film que vous vous êtes fait. »",
      "Deux lectures silencieuses sans s'arrêter, la seconde pour chercher qui sont les personnages et comment le texte les nomme ; surligner les mots non compris. Rappel collectif : « de qui, de quoi parle-t-on ? » ; quand deux films diffèrent, on revient au texte, ligne par ligne. Vrai, faux ou je ne peux pas savoir ; les questions, réponses justifiées par la ligne.",
      "Le professeur reformule tout le texte et dit comment il a fait pour le comprendre (guide CE1, p. 43-46). Ce qu'on retient : « Quand je ne suis pas sûr, je relis le passage. »"),
    trois("Raconter, résumer, donner un titre", "restituer les enchaînements d'un récit, le résumer à l'oral et lui donner un titre.",
      "Un texte sans son titre : « Quel titre lui donneriez-vous ? »",
      "Remettre les moments du récit dans l'ordre et dire ce qui relie l'un à l'autre (parce que, alors, donc). Choisir le bon résumé parmi trois et dire ce qui ne va pas dans les autres ; résumer à l'oral ; proposer un titre, le comparer à celui de l'auteur.",
      "Ce qu'on retient : un résumé dit l'essentiel, dans l'ordre, en peu de mots ; un titre dit de quoi parle le texte."),
    trois("Les émotions des personnages", "expliciter ce que ressent un personnage en s'appuyant sur ce qu'il fait et ce qu'il dit.",
      "« Comment se sent le personnage ici ? Comment le sais-tu ? » — ce n'est pas toujours écrit.",
      "Relire les passages, souligner les indices — un geste, une parole, la ponctuation —, nommer l'émotion avec un mot précis de la boîte à émotions ; puis la question ouverte : « Aurais-tu agi comme lui ? Pourquoi ? »",
      "Ce qu'on retient : ce que fait et dit un personnage montre ce qu'il ressent."),
    trois("Relire pour trouver une information", "relire un documentaire pour rechercher et repérer une information précise.",
      "Une question précise sur un documentaire : « Faut-il tout relire ? »",
      "Repérer la partie du texte qui en parle, la relire, répondre en citant la ligne ; dire ce que le texte nous a appris.",
      "Ce qu'on retient : pour trouver une information, je cherche le passage qui en parle, puis je le relis."),
    trois("Faire ce que dit le texte", "lire une recette ou une règle et la réaliser.",
      "Le matériel sur la table : « Le texte va nous dire quoi faire. »",
      "Lire la recette ou la règle ; repérer le matériel, les étapes, les verbes qui donnent des ordres ; la réaliser en groupes, le texte sous les yeux, en vérifiant chaque étape.",
      "Ce qu'on retient : un texte prescriptif se lit étape par étape, et on vérifie en le faisant."),
    evaluation("lire un texte d'une quinzaine de lignes, le résumer et répondre aux questions en donnant la ligne qui prouve",
      "Ensuite, les reprises, les inférences et les mots inconnus."),
  ],
};

const COMPRENDRE_CE2: Demarche = {
  id: "comprendre-ce2", nom: "Comprendre des textes variés d'une vingtaine de lignes (CE2)", famille: "Français",
  source: COMPRENDRE,
  resume: "Lire et dégager le sens d'un texte narratif, poétique, documentaire ou théâtral, lu seul ou par un adulte, en s'appuyant sur les caractéristiques de ces textes ; revenir au texte pour identifier et comprendre les éléments complexes ; lire et comprendre seul un texte d'une vingtaine de lignes. Exemples de réussite du programme : identifier les évènements, les personnages et les lieux d'un récit ; verbaliser ce que la lecture d'un documentaire a appris ; donner un titre, résumer oralement ; utiliser titres, sous-titres et paragraphes ; expliciter les émotions et les ressorts psychologiques des personnages ; face à une non-compréhension, relire la phrase, le paragraphe, poursuivre la lecture, chercher dans le dictionnaire.",
  seances: [
    trois("Un récit : évènements, personnages, lieux", "identifier les évènements, les personnages et les lieux d'un récit et les relier.",
      "« Qui ? Où ? Que se passe-t-il ? » : la carte du récit au tableau.",
      "Lecture autonome ; remplir la carte du récit ; remettre les moments dans l'ordre ; répondre aux questions en citant la ligne. Échange entre pairs : on accepte de changer d'avis en revenant au texte.",
      "Ce qu'on retient : un récit, ce sont des personnages, des lieux, des évènements reliés par des causes."),
    trois("Un documentaire : ce que j'ai appris", "lire un documentaire en s'appuyant sur ses titres et ses paragraphes, et dire ce qu'il nous a appris.",
      "Avant de lire : ce que je sais déjà du sujet, ce que je voudrais savoir.",
      "Lire paragraphe par paragraphe ; donner un titre à chacun ; répondre aux questions ; écrire trois choses apprises.",
      "Ce qu'on retient : dans un documentaire, les titres et les paragraphes disent où chercher."),
    trois("Un poème, une scène de théâtre", "lire un poème et une scène de théâtre en s'appuyant sur leurs caractéristiques.",
      "Deux textes qui ne se présentent pas comme un récit : à quoi le voit-on ?",
      "Le poème : les vers, les strophes, les rimes, les images — que veut dire « les gouttières jouent du tambour » ? La scène : les personnages, les répliques, les didascalies ; la lire à plusieurs voix. Questions sur chacun.",
      "Ce qu'on retient : on lit un poème pour ses images et sa musique ; une pièce de théâtre est faite pour être jouée : les didascalies disent comment."),
    trois("Quand je ne comprends pas", "s'apercevoir qu'on ne comprend pas, et savoir quoi faire.",
      "Un passage difficile : le professeur montre à voix haute comment il fait quand il ne comprend pas.",
      "Sur un texte qui résiste — une règle du jeu à plusieurs étapes —, repérer ce qu'on ne comprend pas ; essayer les stratégies : relire la phrase, le paragraphe, poursuivre la lecture, chercher le mot dans le dictionnaire, utiliser les outils de la classe. Répondre aux questions difficiles en expliquant le chemin suivi.",
      "L'affiche « Quand je ne comprends pas, je… », complétée par les élèves.", "Verbalise ton propre chemin de lecteur : c'est le modèle."),
    trois("Les ressorts des personnages", "expliquer pourquoi un personnage agit comme il le fait.",
      "« Pourquoi le personnage fait-il cela ? Qu'est-ce qui le pousse ? »",
      "Repérer ce que ressent le personnage à deux moments du récit, avec l'indice ; expliquer ses raisons en reliant les indices du texte et ce qu'on sait déjà ; débattre : l'interprétation est-elle permise par le texte ?",
      "Ce qu'on retient : pour comprendre un personnage, je relie ce qu'il fait, ce qu'il ressent et ce qu'il veut."),
    evaluation("lire un texte d'une vingtaine de lignes et répondre aux questions en justifiant par le texte",
      "Ensuite, différencier les types de textes ; et chaque semaine, des textes résistants lus par le professeur."),
  ],
};

// ── Les stratégies : du CP au CE2 ─────────────────────────────────────────

const REPRISES: Demarche = {
  id: "reprises-c2", nom: "Qui est qui ? La chaîne des reprises (CP, CE1, CE2)", famille: "Français",
  source: COMPRENDRE,
  resume: "Se repérer dans la chaîne anaphorique, « qui relie un nom à sa ou ses reprise(s) pronominale(s) ou à d'autres noms de sens équivalent » ; au CE1 et au CE2, « s'appuyer sur le sens du texte pour résoudre des ambigüités ». Le professeur « met en évidence, au sein de la chaîne anaphorique, le lien qui existe entre un nom et sa reprise par un pronom ou un autre nom ». Exemple de réussite du CP : relier le lion / il / le fauve / le roi de la savane.",
  seances: [
    trois("Le lion, il, le fauve : un même animal", "reconnaître qu'un même personnage peut être désigné par son nom, par un pronom ou par un autre nom.",
      "Au tableau : « Le lion dort. Il ronfle. Le fauve ouvre un œil. Le roi de la savane rugit. » — « Combien y a-t-il d'animaux ? »",
      "Repérer les mots qui désignent le lion, les colorier de la même couleur. Puis, dans un court texte, chercher tous les mots qui désignent le héros, chacun avec sa couleur.",
      "Ce qu'on retient : un personnage peut être repris par un pronom (il, elle, le, lui) ou par un autre nom (le fauve) : c'est toujours lui."),
    trois("Les petits mots qui remplacent", "trouver ce que désigne un pronom en relisant la phrase et celle d'avant.",
      "« Elle les a posées sur la table » : qui est elle ? que sont les ?",
      "« Luc est ami avec Anne. Il a d'autres amis. Elle n'en a qu'un seul. » : souligner les noms propres et les pronoms, établir les correspondances (guide CE1, p. 47-48). Puis, pour chaque mot souligné du texte, relire la phrase et celle d'avant, proposer, vérifier en remplaçant le pronom par sa réponse : la phrase garde-t-elle son sens ?",
      "Ce qu'on retient : « un pronom est un petit mot qui remplace le nom » ; je cherche toujours le personnage qu'il remplace (guide CE1, p. 53)."),
    trois("D'autres noms pour le même personnage", "relier un personnage aux autres noms qui le désignent dans un récit.",
      "Roux, le renardeau, le plus petit : un seul personnage ?",
      "Relever dans un récit tous les noms qui désignent chaque personnage ; les classer dans un tableau à une colonne par personnage ; réécrire une phrase en remplaçant le nom par un autre nom de la liste.",
      "Ce qu'on retient : un auteur change de mot pour ne pas se répéter ; je relie tous ces mots au même personnage."),
    trois("Quand on hésite entre deux personnages", "lever une ambiguïté en s'appuyant sur le sens du texte.",
      "« Léo a prêté son vélo à Sami. Il était très content. » — Qui est content ?",
      "Des phrases à deux personnages et un seul « il » : chercher qui est désigné, en s'appuyant sur le sens — qui a une raison d'être content ? —, et en lisant la suite. Au CP, à l'oral ; au CE1 et au CE2, à l'écrit, en justifiant.",
      "Ce qu'on retient : quand deux personnages sont possibles, je cherche celui qui a du sens, et je lis la suite pour vérifier."),
    evaluation("dire qui ou ce que désignent les mots soulignés d'un texte nouveau",
      "Ensuite, à chaque lecture, la question « qui est-ce ? » ; et en production d'écrits, varier les reprises pour éviter les répétitions."),
  ],
};

const INFERENCES: Demarche = {
  id: "inferences-c2", nom: "Ce qui n'est pas écrit : les inférences (CP, CE1, CE2)", famille: "Français",
  source: COMPRENDRE,
  resume: "Comprendre ce qui est implicite : au CP, des inférences simples ; au CE1, « dans des cas simples » ; au CE2, « en s'appuyant sur des indices explicites et sur ses propres connaissances ». Exemples de réussite : au CP, « J'ai pris mon parapluie » → le temps est pluvieux, et comprendre les émotions des personnages grâce au questionnement ouvert du professeur (« À votre avis, pourquoi… ? Auriez-vous agi comme ce personnage ? ») ; au CE1, expliciter son raisonnement pour inférer ; au CE2, expliciter les inférences.",
  seances: [
    trois("Comprendre sans que ce soit écrit", "trouver ce qu'une phrase laisse comprendre sans le dire.",
      "« J'ai pris mon parapluie. » — Quel temps fait-il ? Ce n'est pas écrit… et pourtant on le sait.",
      "Des phrases de tous les jours et des devinettes : dire ce qu'on comprend, puis l'indice qui l'a fait comprendre et ce qu'on savait déjà. Au CP, à l'oral ; ensuite, à l'écrit.",
      "Ce qu'on retient : « Pour comprendre ce qui n'est pas écrit, je relie un indice du texte à ce que je sais déjà. »"),
    trois("L'indice, ce que je sais, donc…", "expliquer son raisonnement : l'indice du texte, ce qu'on sait déjà, ce qu'on en conclut.",
      "Le professeur montre à voix haute comment il trouve une réponse qui n'est pas écrite.",
      "Sur un récit, pour chaque question « Je réfléchis » : écrire la ligne de l'indice, ce que je sais déjà, donc la réponse. À deux, comparer les chemins.",
      "Le cadre « L'indice — ce que je sais — donc », affiché.", "Fais dire le chemin, pas seulement la réponse."),
    trois("Pourquoi le personnage agit-il ainsi ?", "comprendre les causes et les émotions qui ne sont pas écrites dans un récit.",
      "« À votre avis, pourquoi… ? » — la question ouverte du programme.",
      "Relever ce que fait et dit le personnage, nommer ce qu'il ressent, l'expliquer ; dire si on aurait agi comme lui, et pourquoi.",
      "Ce qu'on retient : ce que fait un personnage montre ce qu'il ressent et ce qu'il veut."),
    trois("Je comprends, et je le prouve", "distinguer une inférence permise par le texte d'une invention.",
      "Deux réponses à la même question : laquelle le texte permet-il ?",
      "Juger des affirmations : vrai, faux ou « je ne peux pas savoir » (le tableau à trois colonnes du guide CE1, p. 53) ; répondre aux questions dont la réponse n'est pas écrite, puis confronter les réponses : chacune est-elle prouvée par un indice ? Écarter celles que le texte contredit.",
      "Ce qu'on retient : une inférence s'appuie toujours sur un indice du texte."),
    evaluation("répondre à des questions dont la réponse n'est pas écrite, en donnant l'indice",
      "Ensuite, à chaque lecture, au moins une question « Je réfléchis »."),
  ],
};

const MOTS_INCONNUS: Demarche = {
  id: "mots-inconnus-c2", nom: "Le sens des mots inconnus (CP, CE1, CE2)", famille: "Français",
  source: COMPRENDRE,
  resume: "Au CP, identifier les mots inconnus d'un texte et chercher à leur donner un sens — « il émet une hypothèse sur le mot clairière dans un texte documentaire sur la forêt » ; au CE1, développer des stratégies pour élucider le sens des mots et des expressions inconnus, prendre appui sur la morphologie et sur le contexte, consulter un dictionnaire adapté ; au CE2, adopter une posture active par rapport au vocabulaire inconnu, avec le contexte et le sens des principaux affixes.",
  seances: [
    trois("Repérer les mots qu'on ne comprend pas", "repérer dans un texte les mots qu'on ne comprend pas.",
      "« Un mot que l'on ne comprend pas, ça arrive à tous les lecteurs. Que fait-on ? »",
      "Lire un texte et souligner au crayon les mots inconnus ; les mettre en commun ; chercher ceux qui empêchent de comprendre l'histoire et ceux dont on peut se passer.",
      "Ce qu'on retient : un bon lecteur remarque les mots qu'il ne comprend pas."),
    trois("Le sens par le contexte", "trouver le sens d'un mot inconnu grâce à la phrase, à celle d'avant et à celle d'après.",
      "« La chauve-souris géante d'Inde est frugivore. Elle se nourrit surtout de mangues, figues, goyaves et bananes. » — Que veut dire frugivore ?",
      "Pour chaque mot : relire la phrase, celle d'avant et celle d'après ; proposer un sens ; le remplacer par un mot connu et vérifier que la phrase garde son sens ; choisir le bon sens parmi trois.",
      "Ce qu'on retient : « Je relis autour du mot, je propose, je remplace pour vérifier. »"),
    trois("La famille du mot", "s'appuyer sur la famille d'un mot et sur ses préfixes et suffixes pour en trouver le sens.",
      "Souriceaux, invisible, replanter : qu'est-ce qui nous aide, dans le mot lui-même ?",
      "Trouver le mot connu caché dans le mot inconnu ; le sens des préfixes et suffixes déjà rencontrés (re-, in-, dé-, -eau, -ette) ; en déduire le sens, puis le vérifier dans la phrase.",
      "Ce qu'on retient : un mot inconnu cache souvent un mot connu."),
    trois("Le dictionnaire pour vérifier", "vérifier dans un dictionnaire adapté le sens supposé d'un mot et choisir le sens qui convient.",
      "Notre hypothèse sur un mot : comment être sûr ?",
      "Chercher le mot par l'ordre alphabétique ; lire l'article ; quand il y a plusieurs sens, choisir celui qui convient à la phrase du texte.",
      "Ce qu'on retient : le dictionnaire vérifie ; c'est la phrase du texte qui dit quel sens choisir."),
    evaluation("trouver le sens de mots inconnus dans un texte et dire ce qui a aidé",
      "Ensuite, à chaque lecture, la chasse aux mots inconnus ; les mots trouvés rejoignent le répertoire de la classe."),
  ],
};

const TYPES_ET_GENRES: Demarche = {
  id: "types-et-genres-c2", nom: "Récit, documentaire, recette, poème, théâtre : types et genres (CP, CE1, CE2)", famille: "Français",
  source: COMPRENDRE,
  resume: "Au CP, différencier le type narratif du type informatif ; au CE1, se familiariser aux différents genres et types de textes et reconnaître, à l'écoute, les grandes caractéristiques d'un conte, d'une fable, d'un poème ; au CE2, différencier le type narratif du type informatif et prescriptif, et les caractéristiques des genres les plus courants : poésie, théâtre, récit.",
  seances: [
    trois("Trier des livres et des textes", "trier des livres et des textes selon ce qu'ils font : raconter, informer, dire quoi faire.",
      "Une caisse de livres de la bibliothèque : albums, documentaires, livres de recettes, recueils de poèmes.",
      "Par groupes, trier les livres et dire pourquoi ; comparer les tris ; arriver aux trois familles : ceux qui racontent une histoire, ceux qui apprennent quelque chose, ceux qui disent quoi faire.",
      "L'affiche des types de textes, un exemple sous chacun."),
    trois("Les indices de chaque type", "reconnaître le type d'un texte grâce à des indices.",
      "Trois débuts de textes, sans image : « Comment savoir ce que c'est ? »",
      "Lire des extraits ; relever les indices — des personnages, « il était une fois » ; des titres, des informations ; une liste de matériel, des étapes, des verbes qui donnent des ordres — ; classer les extraits.",
      "Ce qu'on retient : les indices de chaque type, écrits sur l'affiche."),
    trois("Conte, fable, poème, théâtre", "reconnaître un conte, une fable, un poème et une scène de théâtre à leurs caractéristiques.",
      "Le professeur lit le début d'un conte, d'une fable, d'un poème : « Les avez-vous reconnus ? »",
      "Écouter puis lire des débuts ; associer chacun à son genre ; dire l'indice — « Il était une fois », des animaux et une morale, des vers et des rimes, des répliques et des didascalies.",
      "La carte des genres, avec un titre lu en classe pour chacun."),
    trois("Lire selon le type", "s'appuyer sur le type du texte pour mieux le lire.",
      "Une recette ou une règle de jeu à lire pour de vrai.",
      "Lire le texte prescriptif en repérant sa structure : le but, le matériel, les étapes ; répondre aux questions ; réaliser.",
      "Ce qu'on retient : on ne lit pas une recette comme une histoire."),
    evaluation("reconnaître le type de textes nouveaux et dire l'indice",
      "Ensuite, à chaque nouveau livre de la classe, la question : quel type, quel genre ?"),
  ],
};

// ── Devenir lecteur ───────────────────────────────────────────────────────

const OEUVRE_COMPLETE: Demarche = {
  id: "oeuvre-complete-c2", nom: "Lire une œuvre complète et la mettre en réseau (CP, CE1, CE2)", famille: "Français",
  source: LECTEUR,
  resume: "Lire 5 à 10 œuvres complètes et variées dans l'année — au CE2, de manière autonome —, issues principalement du patrimoine, mais aussi de la littérature de jeunesse : contes d'Andersen, de Mme d'Aulnoy, des frères Grimm, de Mme Leprince de Beaumont, de Perrault, fables de La Fontaine, récits de la mythologie, poèmes, théâtre, albums. Relier ses lectures à son expérience et les relier entre elles (mise en réseau) ; garder la mémoire de ses lectures dans un carnet. Au CE1, l'élève « commence à écrire à propos de ses lectures : il exprime ses goûts et préférences, est capable d'écrire un bref résumé ou d'inventer une autre fin ».",
  seances: [
    trois("Entrer dans l'œuvre", "découvrir une œuvre par sa couverture, son titre, son auteur, et faire des hypothèses.",
      "Le livre caché, puis sa couverture : le titre, l'auteur, l'illustrateur, l'éditeur.",
      "Faire des hypothèses sur l'histoire à partir du titre et de l'illustration ; lire la quatrième de couverture ; les noter pour y revenir. Ouvrir la page du carnet de lecteur.",
      "Ce qu'on retient : ce que la couverture nous apprend, et ce qu'on attend de l'histoire."),
    trois("Lire par épisodes", "lire un épisode, le raconter et anticiper la suite.",
      "Le rappel de l'épisode précédent, raconté par un élève.",
      "Au CP, lecture par le professeur ; au CE1, lecture partagée ; au CE2, lecture autonome du chapitre. Raconter l'épisode, revenir aux hypothèses, imaginer la suite.",
      "Une phrase par épisode dans le carnet ou sur l'affiche de la classe."),
    trois("Les personnages et leur parcours", "caractériser un personnage par ses actions et ses paroles.",
      "« Comment est le héros ? Comment le sait-on ? »",
      "Relever ce que fait et dit le personnage ; choisir des mots pour son caractère et les prouver ; remplir sa carte d'identité ; dire comment il change au fil de l'histoire.",
      "La carte d'identité du personnage, affichée."),
    trois("Mettre en réseau", "relier l'œuvre à d'autres lectures et à sa propre expérience.",
      "« Ce livre vous fait-il penser à un autre ? à quelque chose que vous avez vécu ? »",
      "Comparer l'œuvre à deux ou trois livres du réseau — même personnage, même auteur, même thème — dans un tableau : ce qui est pareil, ce qui change ; relier une situation du livre à son expérience.",
      "Le tableau du réseau, affiché près du coin lecture."),
    trois("Garder la mémoire, donner son avis", "garder la trace d'une lecture et dire son avis en le justifiant.",
      "Le carnet de lecteur : « Qu'est-ce qu'on voudra se rappeler de ce livre dans un an ? »",
      "Remplir la page du carnet : titre, auteur, résumé, passage préféré, avis justifié ; au CE1, inventer une autre fin ; au CE2, répondre aux questions ouvertes des camarades.",
      "Ce qu'on retient : un avis se justifie par le livre lui-même."),
  ],
};

const PERSONNAGES_TYPES: Demarche = {
  id: "personnages-types-c2", nom: "Les personnages-types des contes (CP, CE1, CE2)", famille: "Français",
  source: LECTEUR,
  resume: "Repérer et reconnaître des types de personnages : l'élève est capable « de caractériser les personnages, de les comparer et de reconnaître des types récurrents dans la littérature de jeunesse » ; au CE2, il « connaît les caractéristiques de personnages-types de plus en plus diversifiés » et « dispose de références construites sur des réseaux de textes ». Le loup, l'ogre, la sorcière, la fée, le roi, le petit héros malin, le renard rusé : lus dans les contes de Perrault, des frères Grimm, d'Andersen et les fables de La Fontaine.",
  seances: [
    trois("Le loup dans les contes", "caractériser le loup à partir de plusieurs contes lus.",
      "Le Petit Chaperon rouge, Le Loup et les Sept Chevreaux, Les Trois Petits Cochons : quel personnage ont-ils en commun ?",
      "Relire les passages où le loup apparaît ; relever ce qu'il fait, ce qu'il dit, ce qu'il veut ; comparer d'un conte à l'autre dans le tableau du réseau.",
      "Ce qu'on retient : dans les contes, le loup est affamé et rusé, et il se fait souvent rouler à la fin."),
    trois("Caractériser un personnage", "choisir des mots précis pour le caractère d'un personnage et les prouver par le texte.",
      "« Le loup est méchant » : peut-on dire plus précis ?",
      "Chercher des mots pour le caractère — rusé, gourmand, cruel, naïf ; au CE1, jaloux, ambitieux ; au CE2, irritable, placide — ; chaque mot avec sa preuve dans le texte ; remplir la carte d'identité.",
      "Les mots du caractère, au répertoire de la classe."),
    trois("D'autres personnages-types", "reconnaître l'ogre, la sorcière, la fée, le roi, le petit héros malin.",
      "Un conte nouveau, lu par le professeur : « Avez-vous déjà rencontré ces personnages ? »",
      "Lire ou écouter des contes ; compléter le tableau des personnages-types : comment est souvent chacun, où on l'a rencontré ; au CP, relier chaque personnage à ce qu'il fait souvent.",
      "Le tableau des personnages-types, affiché, complété au fil de l'année."),
    trois("Quand le personnage change", "reconnaître un personnage-type détourné et dire ce qui change.",
      "Un album où le loup est gentil, peureux ou ridicule : « Est-ce le loup des contes ? »",
      "Comparer le personnage détourné au personnage-type ; dire ce qui étonne, ce qui fait rire ; expliquer pourquoi l'auteur a fait ce choix.",
      "Ce qu'on retient : un auteur peut jouer avec ce que le lecteur attend du personnage."),
    evaluation("reconnaître des personnages-types et dire comment ils sont souvent",
      "Ensuite, le réseau s'enrichit à chaque conte lu ; et en production d'écrits, inventer un conte avec ses personnages-types."),
  ],
};

const LIEUX_DE_LECTURE: Demarche = {
  id: "lieux-de-lecture-c2", nom: "Aller vers les livres : choisir, emprunter, présenter (CP, CE1, CE2)", famille: "Français",
  source: LECTEUR,
  resume: "Aller vers les livres et en choisir à titre personnel ; au CE1, faire preuve d'initiative en empruntant des livres selon ses goûts et présenter une lecture à ses camarades ; fréquenter régulièrement des lieux de lecture — médiathèque, bibliothèque, BCD, coin lecture de la classe — et rencontrer des acteurs du livre. Le professeur « permet l'échange autour des livres au sein de la classe et en dehors de la classe » ; l'élève consigne ses lectures dans un carnet de lecteur.",
  seances: [
    trois("Découvrir la bibliothèque", "se repérer dans une bibliothèque et en connaître les règles.",
      "La visite de la BCD ou de la médiathèque : « Où trouver un album ? un documentaire sur les animaux ? »",
      "Explorer les espaces ; découvrir le classement — albums, romans, contes, documentaires, poésie — ; chercher un livre demandé ; apprendre les règles de l'emprunt.",
      "Le plan de la bibliothèque, dessiné ensemble."),
    trois("Comment choisir un livre", "choisir un livre en s'appuyant sur des indices : couverture, titre, résumé, auteur, premières pages.",
      "« Comment choisissez-vous un livre ? »",
      "Chacun en choisit un, explique pourquoi ; on liste les indices utilisés ; essayer un livre en lisant les premières pages ; le reposer s'il ne plaît pas, et dire pourquoi.",
      "Ce qu'on retient : les indices qui aident à choisir, cochés sur sa feuille."),
    trois("Emprunter et lire chez soi", "emprunter un livre, le lire chez soi et en garder la trace.",
      "Le carnet des emprunts : la date, le titre, l'avis.",
      "Emprunter ; noter son emprunt ; au retour, remplir la page du carnet de lecteur et dire en une phrase ce qu'on en a pensé.",
      "Ce qu'on retient : chaque livre lu laisse une trace dans le carnet."),
    trois("Présenter un livre à la classe", "présenter un livre à ses camarades pour leur donner envie de le lire.",
      "Le professeur présente un livre qu'il aime : qu'a-t-il dit ? dans quel ordre ?",
      "Préparer sa présentation avec le plan — je vous présente, c'est l'histoire de, mon passage préféré, je vous le conseille — ; s'entraîner à deux ; présenter ; les camarades évaluent avec la grille.",
      "Ce qu'on retient : présenter sans raconter la fin ; lire un passage préparé."),
    trois("Rencontrer un acteur du livre", "préparer et mener une rencontre avec un acteur du livre : bibliothécaire, auteur, illustrateur, libraire.",
      "« Qui fabrique les livres ? Qui les fait connaître ? »",
      "Préparer des questions ; mener la rencontre ; garder la trace de ce qu'on a appris sur le métier et sur les livres.",
      "La trace de la rencontre, affichée au coin lecture."),
  ],
};

export const DEMARCHES_LECTURE: Demarche[] = [COMPRENDRE_CP, COMPRENDRE_CE1, COMPRENDRE_CE2, REPRISES, INFERENCES, MOTS_INCONNUS, TYPES_ET_GENRES, OEUVRE_COMPLETE, PERSONNAGES_TYPES, LIEUX_DE_LECTURE];

/**
 * La séquence de lecture d'une compétence du cycle 2 : comprendre un texte,
 * devenir lecteur ; rien sinon. Tout est en minuscules sans accents.
 */
export function demarcheDeLaLecture(classe: string, cg: string, comp: string): string | null {
  if (/comprendre un texte/.test(cg)) {
    if (/anaphorique/.test(comp)) return "reprises-c2";
    if (/implicite|inference/.test(comp)) return "inferences-c2";
    if (/inconnu/.test(comp)) return "mots-inconnus-c2";
    if (/differencier le type/.test(comp)) return "types-et-genres-c2";
    return classe === "cp" ? "comprendre-cp" : classe === "ce1" ? "comprendre-ce1" : classe === "ce2" ? "comprendre-ce2" : null;
  }
  if (/devenir lecteur/.test(cg)) {
    if (/types? de personnages/.test(comp)) return "personnages-types-c2";
    if (/genres et types/.test(comp)) return "types-et-genres-c2";
    if (/aller vers les livres|empruntant|lieux de lecture/.test(comp)) return "lieux-de-lecture-c2";
    return "oeuvre-complete-c2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const cx = (seance: number, r: Partial<ReglagesComprehension>, titre?: string): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_COMPREHENSION, ...r };
  const t = reglages.texte ? texteDe(reglages.texte) : undefined;
  return {
    seance, atelier: "comprehension", titre: titre ?? (t ? t.titre : "Comprendre un texte"),
    fabriquer: (graine) => ({ html: htmlComprehension(reglages, graine), style: STYLE_FEUILLE + STYLE_COMPREHENSION }),
  };
};
const cl = (seance: number, titre: string, r: Partial<ReglagesLecteur>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_LECTEUR, ...r };
  return { seance, atelier: "lecteur", titre, fabriquer: (graine) => ({ html: htmlLecteur(reglages, graine), style: STYLE_FEUILLE + STYLE_LECTEUR }) };
};

/** Les textes de chaque classe, dans l'ordre où les séquences des stratégies les prennent : récits d'abord. */
const RECITS: Record<ClasseC2, string[]> = {
  CP: ["chaton", "cabane", "escargot", "pique-nique"],
  CE1: ["gouter", "phare", "renardeau", "bonnet"],
  CE2: ["concours", "loup-ce2", "theatre", "grenier"],
};
const PRESCRIPTIF: Record<ClasseC2, string> = { CP: "salade", CE1: "pateasel", CE2: "regle-jeu" };

type Plan = { feuilles: FeuilleAFabriquer[]; materiel: string[] };

const PLANS: Record<string, (classe: ClasseC2) => Plan> = {
  "comprendre-cp": () => ({
    feuilles: [
      cx(0, { exercice: "ecoute", classe: "CP", texte: "chaton" }, "Le chaton perdu — j'écoute et je comprends"),
      cx(1, { exercice: "moments", classe: "CP", texte: "cabane" }, "La cabane — les moments de l'histoire"),
      cx(2, { exercice: "vraiFaux", classe: "CP", texte: "escargot" }, "Le petit escargot — vrai ou faux ?"),
      cx(2, { exercice: "questions", classe: "CP", texte: "escargot" }, "Le petit escargot — je comprends le texte"),
      cx(3, { exercice: "questions", classe: "CP", texte: "herisson" }, "Le hérisson — je comprends le texte"),
      cx(3, { exercice: "questions", classe: "CP", texte: "salade" }, "La salade de fruits — je comprends le texte"),
      cx(4, { exercice: "questions", classe: "CP", texte: "pique-nique" }, "Le pique-nique — évaluation"),
    ],
    materiel: ["Un album ou un conte plus long, lu par le professeur ; des feuilles pour dessiner", "Le texte de la veille, en grand", "Le texte en grand, lignes numérotées", "Les ingrédients de la recette", "Les feuilles d'évaluation"],
  }),
  "comprendre-ce1": () => ({
    feuilles: [
      cx(0, { exercice: "vraiFaux", classe: "CE1", texte: "phare" }, "La lumière du phare — vrai ou faux ?"),
      cx(0, { exercice: "questions", classe: "CE1", texte: "phare" }, "La lumière du phare — je comprends le texte"),
      cx(1, { exercice: "sensGlobal", classe: "CE1", texte: "gouter" }, "De quoi parle le texte ? — résumé et titre"),
      cx(1, { exercice: "moments", classe: "CE1", texte: "gouter" }, "Le goûter disparu — les moments de l'histoire"),
      cx(2, { exercice: "emotions", classe: "CE1", texte: "renardeau" }, "Le renardeau trop curieux — ce que ressentent les personnages"),
      cx(3, { exercice: "questions", classe: "CE1", texte: "abeille" }, "La vie des abeilles — je comprends le texte"),
      cx(4, { exercice: "questions", classe: "CE1", texte: "pateasel" }, "Fabriquer de la pâte à sel — je comprends le texte"),
      cx(5, { exercice: "questions", classe: "CE1", texte: "bonnet" }, "Le bonnet de Zoé — évaluation"),
    ],
    materiel: ["Le texte, lignes numérotées", "Le texte sans son titre", "La boîte à émotions", "Le texte en grand ; des surligneurs", "Le matériel de la recette : farine, sel, eau, un bol", "Les feuilles d'évaluation"],
  }),
  "comprendre-ce2": () => ({
    feuilles: [
      cx(0, { exercice: "questions", classe: "CE2", texte: "concours" }, "Le concours de cerfs-volants — je comprends le texte"),
      cx(0, { exercice: "moments", classe: "CE2", texte: "concours" }, "Le concours de cerfs-volants — les moments"),
      cx(1, { exercice: "questions", classe: "CE2", texte: "migrations" }, "Le grand voyage des hirondelles — je comprends le texte"),
      cx(2, { exercice: "questions", classe: "CE2", texte: "poeme-pluie" }, "Il pleut sur la ville — je comprends le poème"),
      cx(2, { exercice: "questions", classe: "CE2", texte: "theatre" }, "Le roi qui ne voulait pas se coucher — je comprends la scène"),
      cx(3, { exercice: "questions", classe: "CE2", texte: "regle-jeu" }, "La course aux trésors — je comprends la règle"),
      cx(3, { exercice: "motInconnu", classe: "CE2" }, "Le mot inconnu — je cherche le sens"),
      cx(4, { exercice: "emotions", classe: "CE2", texte: "loup-ce2" }, "Le loup qui avait peur du noir — ce que ressentent les personnages"),
      cx(4, { exercice: "inferences", classe: "CE2", texte: "loup-ce2" }, "Le loup qui avait peur du noir — ce qui n'est pas écrit"),
      cx(5, { exercice: "questions", classe: "CE2", texte: "grenier" }, "Le secret du grenier — évaluation"),
    ],
    materiel: ["La carte du récit, au tableau", "Ce que je sais, ce que je veux savoir : le tableau", "Le poème et la scène, en grand", "Des dictionnaires ; l'affiche « Quand je ne comprends pas »", "Le cadre « L'indice — ce que je sais — donc »", "Les feuilles d'évaluation"],
  }),
  "reprises-c2": (classe) => {
    const [a, b, c, d] = RECITS[classe];
    return {
      feuilles: [
        cx(0, { exercice: "reprises", classe, texte: a }, `${texteDe(a)!.titre} — qui est qui ?`),
        cx(1, { exercice: "reprises", classe, texte: b }, `${texteDe(b)!.titre} — qui est qui ?`),
        cx(2, { exercice: "questions", classe, texte: c, questions: "reprise" }, `${texteDe(c)!.titre} — les reprises`),
        cx(4, { exercice: "reprises", classe, texte: d }, `${texteDe(d)!.titre} — évaluation`),
      ],
      materiel: ["Les phrases du lion au tableau ; des crayons de couleur", "Le texte en grand", "Un tableau à une colonne par personnage", "Des phrases à deux personnages, au tableau", "Les feuilles d'évaluation"],
    };
  },
  "inferences-c2": (classe) => {
    const [a, b, c, d] = RECITS[classe];
    return {
      feuilles: [
        cx(1, { exercice: "inferences", classe, texte: a }, `${texteDe(a)!.titre} — ce qui n'est pas écrit`),
        cx(2, { exercice: "emotions", classe, texte: b }, `${texteDe(b)!.titre} — ce que ressentent les personnages`),
        cx(3, { exercice: "vraiFaux", classe, texte: c }, `${texteDe(c)!.titre} — vrai, faux ou je ne peux pas savoir`),
        cx(3, { exercice: "questions", classe, texte: c, questions: "inférence" }, `${texteDe(c)!.titre} — je réfléchis`),
        cx(4, { exercice: "inferences", classe, texte: d }, `${texteDe(d)!.titre} — évaluation`),
      ],
      materiel: ["Des phrases de tous les jours et des devinettes", "Le cadre « L'indice — ce que je sais — donc », en grand", "La boîte à émotions", "Deux réponses à comparer, au tableau", "Les feuilles d'évaluation"],
    };
  },
  "mots-inconnus-c2": (classe) => ({
    feuilles: [
      cx(1, { exercice: "motInconnu", classe, texte: RECITS[classe][0] }, "Le mot inconnu — le sens par le contexte"),
      cx(4, { exercice: "motInconnu", classe, texte: RECITS[classe][3] }, "Le mot inconnu — évaluation"),
    ],
    materiel: ["Un texte riche en mots nouveaux ; des crayons à papier", "Des phrases au tableau, le mot inconnu en couleur", "Des mots dérivés au tableau", "Des dictionnaires adaptés", "Les feuilles d'évaluation"],
  }),
  "types-et-genres-c2": (classe) => ({
    feuilles: [
      cx(1, { exercice: "typesDeTextes", classe }, "Quel type de texte ?"),
      cl(2, "Quel genre de texte ?", { exercice: "genres", classe }),
      cx(3, { exercice: "questions", classe, texte: PRESCRIPTIF[classe] }, `${texteDe(PRESCRIPTIF[classe])!.titre} — je comprends le texte`),
      cx(4, { exercice: "typesDeTextes", classe }, "Quel type de texte ? — évaluation"),
    ],
    materiel: ["Une caisse de livres variés de la bibliothèque", "Des débuts de textes, sans image ; l'affiche des types", "Un conte, une fable, un poème, une pièce de théâtre", "Le matériel de la recette ou du jeu", "Les feuilles d'évaluation"],
  }),
  "oeuvre-complete-c2": (classe) => ({
    feuilles: [
      cl(0, "Mon carnet de lecteur", { exercice: "fiche", classe }),
      cl(2, "La carte d'identité d'un personnage", { exercice: "personnage", classe }),
      cl(3, "La mise en réseau", { exercice: "reseau", classe }),
    ],
    materiel: ["L'œuvre, un exemplaire par élève ou en grand ; sa couverture cachée", "L'œuvre ; l'affiche des épisodes", "Les passages où le personnage apparaît", "Deux ou trois livres du réseau", "Le carnet de lecteur"],
  }),
  "personnages-types-c2": (classe) => ({
    feuilles: [
      cl(0, "Le loup dans les contes — la mise en réseau", { exercice: "reseau", classe, theme: "Le loup dans les contes" }),
      cl(1, "La carte d'identité d'un personnage", { exercice: "personnage", classe }),
      cl(2, "Les personnages-types des contes", { exercice: "personnagesTypes", classe }),
      cl(4, "Les personnages-types — évaluation", { exercice: "personnagesTypes", classe }),
    ],
    materiel: ["Trois contes avec un loup", "Le répertoire des mots du caractère", "Des contes de Perrault, des frères Grimm, d'Andersen", "Un album où le loup est détourné", "Les feuilles d'évaluation"],
  }),
  "lieux-de-lecture-c2": (classe) => ({
    feuilles: [
      cl(1, "Choisir un livre ; le carnet des emprunts", { exercice: "emprunts", classe }),
      cl(2, "Mon carnet de lecteur", { exercice: "fiche", classe }),
      cl(3, "Présenter un livre à la classe", { exercice: "presenter", classe }),
    ],
    materiel: ["La visite de la BCD ou de la médiathèque, prévue avec le ou la bibliothécaire", "Une sélection de livres variés", "Le carnet de lecteur ; le cahier de liaison pour l'emprunt", "Le livre qu'on présente", "Les questions préparées ; l'invité"],
  }),
};

export const estUneDemarcheDeLecture = (id: string) => id in PLANS;

export function planDeLaLecture(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const fabrique = PLANS[demarcheId];
  if (!fabrique) return null;
  const p = fabrique(ctx.classe);
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
