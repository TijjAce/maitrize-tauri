// La grammaire, l'orthographe grammaticale et la conjugaison : des
// séquences bâties sur le programme de français du cycle 2 (2024) et les
// guides de lecture et d'écriture du CP et du CE1.
//
// Les livrets n'ont pas de séquence de grammaire ; l'enseignant a demandé
// (2026-10-07) qu'on la construise depuis le programme et les guides, en le
// disant. Le programme : « la démarche pédagogique est fondée sur
// l'observation et la manipulation » ; la réflexion sur la langue amorcée
// au CP « donne lieu à partir du CE1 à de premières leçons de grammaire et
// d'orthographe à partir des observations formulées par les élèves et
// validées par le professeur » ; « l'enseignement doit se fonder sur des
// énoncés simples et prototypiques ». Le guide CE1 (« La grammaire »,
// p. 92-97) donne la leçon en phases : observer et manipuler un corpus —
// classer, réécrire, surligner, recopier dans un tableau, « démonter des
// phrases » —, mettre en commun et structurer jusqu'à la trace écrite,
// consolider et automatiser, évaluer. Les feuilles viennent des ateliers
// « Grammaire et conjugaison », « Les maisons du tri », « Texte à trous » et
// « Phrases en désordre ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_GRAMMAIRE, STYLE_GRAMMAIRE, htmlGrammaire, type ReglagesGrammaire } from "./grammaire";
import { MODELES_TRI, STYLE_TRI, htmlTri } from "./triEtiquettes";
import { MODELES_TROUS, REGLAGES_TROUS, STYLE_TROUS, htmlTexteATrous } from "./texteATrous";
import { REGLAGES_PHRASES, STYLE_PHRASES, htmlPhrasesEnDesordre, phrasesEnDesordre } from "./phrasesEnDesordre";
import { PROGRAMME_FRANCAIS } from "./demarchesLecture";
import { tempsDe, type Temps } from "./conjugaison";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
/** L'entraînement : une plage courte, pour automatiser (guide CE1, p. 96-97). */
const entrainement = (titre: string, objectif: string, activite: string, retenir: string) =>
  seance(titre, sauront(objectif), 30, [ph(T1, "5 min", "La règle relue dans le cahier de références ; un exemple rappelé."), ph(T4, "20 min", activite), ph(T3, "5 min", retenir)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const GUIDE_CE1 = "guide « Pour enseigner la lecture et l'écriture au CE1 » (2019), « La grammaire », p. 92-97";
const GUIDE_CP = "guide « Pour enseigner la lecture et l'écriture au CP » (2019), p. 86-87";
const SOURCE = `${PROGRAMME_FRANCAIS} ; ${GUIDE_CE1} ; démarche en quatre temps des livrets`;
const SOURCE_CP = `${PROGRAMME_FRANCAIS} ; ${GUIDE_CP} ; ${GUIDE_CE1} ; démarche en quatre temps des livrets`;
const MANIPULER = "Fais agir : classer, réécrire, surligner, recopier dans un tableau. Le corpus montre des régularités, sans exception.";

// ── La phrase ─────────────────────────────────────────────────────────────

const PHRASE_CP: Demarche = {
  id: "phrase-cp", nom: "Qu'est-ce qu'une phrase ? (CP)", famille: "Français",
  source: SOURCE_CP,
  resume: "S'approprier progressivement la notion de phrase simple et ses trois marqueurs essentiels : majuscule initiale, ponctuation finale forte et sens ; comprendre que certains éléments fonctionnent ensemble (sujet et verbe ; déterminant, nom, adjectif). Exemples de réussite du programme : identifier les phrases d'un court texte à partir des majuscules et des différents points ; ordonner et produire une phrase simple en repérant la place des groupes.",
  seances: [
    trois("Phrase ou pas phrase ?", "dire si une suite de mots est une phrase : du sens, une majuscule, un point.",
      "Des étiquettes au tableau : « Le chat dort sur le lit. » et « Mange chat le souris. »",
      "Trier des étiquettes en deux maisons : ce qui est une phrase, ce qui n'en est pas une ; justifier chaque fois.",
      "Ce qu'on retient : une phrase a du sens ; elle commence par une majuscule et finit par un point.", MANIPULER),
    trois("Combien de phrases dans le texte ?", "repérer les phrases d'un court texte grâce aux majuscules et aux points.",
      "Un texte court au tableau : « Comment savoir où commence et où finit une phrase ? »",
      "Entourer les majuscules et les points ; souligner chaque phrase d'une couleur ; compter les phrases ; lire le texte en marquant les pauses.",
      "Ce qu'on retient : entre une majuscule et un point, une phrase."),
    trois("Remettre les mots dans l'ordre", "ordonner les mots d'une phrase simple pour qu'elle ait du sens.",
      "Les mots d'une phrase en étiquettes, mélangés.",
      "Remettre les étiquettes en ordre ; essayer d'autres ordres et dire s'ils ont du sens ; recopier la phrase.",
      "Ce qu'on retient : dans une phrase, les mots ont leur place ; certains vont ensemble."),
    entrainement("S'entraîner : écrire des phrases", "écrire une phrase qui a du sens, avec majuscule et point.",
      "Écrire une phrase à partir d'étiquettes, puis d'un mot donné ; se relire : sens, majuscule, point.",
      "Ce qu'on retient : je relis toujours ma phrase."),
    evaluation("reconnaître les phrases d'un texte et dire si une suite de mots est une phrase", "Ensuite, à chaque écrit, vérifier majuscule et point."),
  ],
};

const TYPES_FORMES: Demarche = {
  id: "types-formes-c2", nom: "Les types et les formes de phrases (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "S'appuyer sur la ponctuation pour reconnaître les trois types de phrases — déclarative, interrogative, impérative — et reconnaître les formes négative et exclamative ; au CE1, savoir effectuer des transformations ; au CE2, les produire. Exemples de réussite : au CP, manipuler les phrases déclaratives et impératives avec la forme négative et expliciter le changement de sens ; au CE2, « Jean, ferme la porte. → Jean, ne ferme pas la porte. ». En lecture à voix haute, la ponctuation guide l'intonation.",
  seances: [
    trois("Dire, demander, ordonner", "reconnaître une phrase qui dit, une phrase qui demande, une phrase qui donne un ordre.",
      "Trois phrases dites à voix haute : « Tu ranges ta chambre. Tu ranges ta chambre ? Range ta chambre. » Qu'est-ce qui change ?",
      "Trier des phrases selon ce qu'elles font ; observer le point de chacune ; ajouter la ponctuation à des phrases qui n'en ont pas ; les lire avec l'intonation.",
      "Ce qu'on retient : la phrase déclarative dit, l'interrogative demande (?), l'impérative ordonne.", MANIPULER),
    trois("La phrase qui s'exclame", "reconnaître la forme exclamative et son point.",
      "« Quelle belle journée ! » — dite avec quelle voix ?",
      "Trouver les phrases exclamatives d'un texte ; transformer des phrases déclaratives en phrases exclamatives (Que…, Comme…, Quel…).",
      "Ce qu'on retient : la phrase exclamative exprime un sentiment ; elle finit par un point d'exclamation."),
    trois("Ne… pas : la forme négative", "transformer une phrase à la forme négative avec ne… pas.",
      "« Le chat dort. » / « Le chat ne dort pas. » — qu'est-ce qui a changé, dans les mots et dans le sens ?",
      "Encadrer le verbe par ne… pas ; observer ne devant une voyelle (n'aime) ; transformer des phrases déclaratives et impératives ; dire le changement de sens.",
      "Ce qu'on retient : ne… pas entoure le verbe ; devant une voyelle, ne devient n'."),
    entrainement("S'entraîner : transformer", "passer d'un type ou d'une forme de phrase à l'autre.",
      "Transformer des phrases : en question (deux façons au CE2), à l'impératif, à la forme négative ; les lire à voix haute.",
      "Ce qu'on retient : le tableau des types et des formes, dans le cahier de références."),
    evaluation("reconnaître le type d'une phrase, la ponctuer et la transformer à la forme négative", "Ensuite, en lecture à voix haute, l'intonation suit la ponctuation."),
  ],
};

const CLASSES_DE_MOTS: Demarche = {
  id: "classes-de-mots-c2", nom: "Les classes de mots (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CP, constituer des corpus par classe de mots — noms, verbes, déterminants, adjectifs, pronoms personnels — : « Dans la boîte des noms, on trouve des noms d'animaux, de personnes, d'objets… Dans la boîte des verbes, on trouve souvent des actions. » Au CE1, différencier et nommer le déterminant, le nom commun, le nom propre, l'adjectif, le verbe, le pronom personnel sujet, en affinant les critères de reconnaissance ; au CE2, l'adverbe en plus, et la différence entre mots variables et invariables (très, si, bien, assez, aujourd'hui, demain, les adverbes en -ment).",
  seances: [
    trois("Les boîtes de mots", "trier des mots et justifier son tri.",
      "Des mots des textes de la semaine, en étiquettes : « Faisons des familles de mots qui se ressemblent. »",
      "Trier par groupes, comparer les tris, arriver aux boîtes de la classe ; pour chaque boîte, dire ce qu'on y trouve.",
      "Les critères de chaque boîte, écrits avec les élèves.", MANIPULER),
    trois("Le nom et le déterminant", "reconnaître un nom commun, un nom propre et le déterminant qui le précède.",
      "« un chat », « le chat », « mon chat », « Rex » : qu'ont-ils en commun ?",
      "Trouver les noms d'un texte ; essayer de mettre un déterminant devant ; repérer les noms propres par la majuscule ; compléter les listes de la classe.",
      "Ce qu'on retient : avant un nom commun, il y a souvent un déterminant ; un nom propre commence par une majuscule."),
    trois("Le verbe et l'adjectif", "reconnaître un verbe et un adjectif.",
      "« Le petit chat dort. » — quel mot dit ce que fait le chat ? lequel dit comment il est ?",
      "Changer le temps de la phrase pour trouver le verbe (il change) ; enlever l'adjectif, la phrase garde son sens ; trouver d'autres adjectifs pour le même nom.",
      "Ce qu'on retient : le verbe change avec le temps ; l'adjectif dit comment est le nom et s'accorde avec lui."),
    entrainement("S'entraîner : classer", "ranger des mots dans leur classe et justifier.",
      "Classer les mots d'un texte dans le tableau de la classe ; au CE2, repérer les mots invariables, les adverbes.",
      "Le tableau des classes, dans le cahier de références."),
    evaluation("ranger des mots dans leur classe", "Ensuite, utiliser le nom des classes pour expliquer les accords."),
  ],
};

const CONSTITUANTS: Demarche = {
  id: "constituants-c2", nom: "Groupe sujet, verbe, compléments (CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Identifier la phrase simple, en distinguer les principaux constituants et les nommer : le groupe sujet, le verbe et les compléments, sans distinguer ces derniers entre eux — « l'étude des compléments circonstanciels est réservée au cycle 3 ». Exemples de réussite : opérer des manipulations — substitution (« La maitresse raconte une histoire aux enfants. → Elle raconte une histoire aux enfants. → Elle la raconte aux enfants. »), déplacement (« Tous les jours, elle mange à la cantine. »), suppression (« Elle mange tous les jours. ») — en grammaire comme en production d'écrits ; au CE2, substituer un pronom au groupe nominal sujet et inversement.",
  seances: [
    trois("Démonter la phrase", "découper une phrase en groupes de mots qui vont ensemble.",
      "« La maîtresse raconte une histoire aux enfants. » en étiquettes-mots : quels mots vont ensemble ?",
      "Regrouper les mots en groupes ; essayer de déplacer, de supprimer chaque groupe ; noter ce qui reste possible.",
      "Ce qu'on retient : une phrase est faite de groupes de mots.", MANIPULER),
    trois("Le groupe sujet et le verbe", "trouver le verbe et le groupe sujet d'une phrase.",
      "« Qui raconte ? » et « Qu'est-ce qu'on dit de la maîtresse ? »",
      "Trouver le verbe : il change avec le temps, on peut l'encadrer par ne… pas ; trouver le sujet : on peut l'encadrer par « C'est… qui », le remplacer par un pronom ; souligner et entourer.",
      "Ce qu'on retient : le groupe sujet dit de qui on parle ; le verbe dit ce qu'il fait ; on ne peut pas les supprimer."),
    trois("Les compléments", "repérer les compléments : on peut souvent les déplacer ou les supprimer.",
      "« Tous les jours, elle mange à la cantine. » — « Elle mange tous les jours. »",
      "Mettre les compléments entre crochets ; les déplacer, les supprimer ; voir ce que la phrase perd en sens ; en ajouter.",
      "Ce qu'on retient : les compléments apportent des informations ; certains se déplacent ou se suppriment."),
    entrainement("S'entraîner : démonter des phrases", "souligner le groupe sujet, entourer le verbe, mettre les compléments entre crochets.",
      "Des phrases de plus en plus longues ; puis réécrire un premier jet en déplaçant ou en supprimant des groupes.",
      "Le codage de la classe, dans le cahier de références."),
    evaluation("identifier le groupe sujet, le verbe et les compléments d'une phrase", "Ensuite, à la révision des écrits, déplacer et supprimer pour améliorer."),
  ],
};

const DISCOURS: Demarche = {
  id: "discours-rapporte-ce2", nom: "La ponctuation et les paroles rapportées (CE2)", famille: "Français",
  source: SOURCE,
  resume: "Utiliser la ponctuation de fin de phrase (. ! ?) et reconnaître les marques du discours rapporté (« … ») ; repérer dans un texte les passages au discours direct. En lecture à voix haute, le changement de voix ; en production d'écrits, écrire des dialogues en tenant compte des caractéristiques des textes.",
  seances: [
    trois("Qui parle ?", "repérer les paroles d'un personnage dans un récit.",
      "Un récit avec un dialogue, lu à plusieurs voix : « Comment savoir qui parle ? »",
      "Surligner les paroles, repérer les guillemets et les verbes qui les annoncent (dit, demande, répond) ; dire qui parle.",
      "Ce qu'on retient : les paroles sont entre guillemets « … » ; un verbe dit qui parle et comment."),
    trois("Les points des paroles", "utiliser le point, le point d'interrogation et le point d'exclamation dans les paroles.",
      "Des paroles sans ponctuation : « Combien coûtent-elles » — que manque-t-il ?",
      "Ponctuer des paroles ; les lire avec l'intonation qui convient ; choisir le verbe qui annonce (demande, s'écrie, chuchote).",
      "Ce qu'on retient : la ponctuation des paroles dit comment les lire."),
    trois("Écrire un dialogue", "écrire un court dialogue avec les guillemets et les verbes de parole.",
      "Deux personnages d'un récit lu : « Que pourraient-ils se dire ? »",
      "Imaginer à l'oral, puis écrire trois répliques avec guillemets, ponctuation et verbes de parole variés ; le jouer.",
      "Ce qu'on retient : j'ouvre les guillemets avant les paroles, je les ferme après."),
    entrainement("S'entraîner : ponctuer", "ponctuer des phrases et des paroles.",
      "Remettre la ponctuation dans un court texte ; repérer les paroles ; dire qui parle.",
      "Ce qu'on retient : la ponctuation, dans le cahier de références."),
    evaluation("repérer les paroles d'un texte, dire qui parle et ponctuer des phrases", "Ensuite, écrire des dialogues dans les récits."),
  ],
};

// ── Les accords ───────────────────────────────────────────────────────────

const GENRE_NOMBRE_CP: Demarche = {
  id: "genre-nombre-cp", nom: "Masculin, féminin, singulier, pluriel (CP)", famille: "Français",
  source: SOURCE_CP,
  resume: "Comprendre les notions de masculin et de féminin, de singulier et de pluriel (« plusieurs, plus qu'un ») et se familiariser avec la chaîne d'accords (déterminant, nom, adjectif) en repérant les régularités des marques de genre et de nombre. Exemples de réussite : petit/petite, grand/grande ; deux lapins, mes amis, des pommes ; un petit garçon → une petite fille ; « un ballon rond, une balle ronde, des ballons ronds ». Le guide CP (p. 86-87) : écrire un ou une devant des mots, écrire au féminin, au pluriel, observer « Le chat miaule » au pluriel.",
  seances: [
    trois("Un seul ou plusieurs ?", "reconnaître le singulier et le pluriel grâce au déterminant et à la marque du nom.",
      "« le chat », « les chats » : qu'entend-on ? que voit-on ?",
      "Trier des groupes nominaux en singulier et pluriel ; entourer le déterminant et le -s ; constater qu'on n'entend pas le -s.",
      "Ce qu'on retient : au pluriel, le déterminant change (les, des, mes) et le nom prend souvent un -s qu'on n'entend pas.", MANIPULER),
    trois("Un garçon, une fille", "reconnaître le masculin et le féminin, et la marque -e du féminin.",
      "« un petit garçon », « une petite fille » : qu'est-ce qui change ?",
      "Trier des groupes nominaux en masculin et féminin ; écrire un ou une devant des noms ; mettre des adjectifs au féminin : on entend parfois la lettre muette (petit, petite).",
      "Ce qu'on retient : au féminin, l'adjectif prend souvent un -e."),
    trois("La chaîne d'accords", "faire changer ensemble le déterminant, le nom et l'adjectif.",
      "« un ballon rond » → « des ballons ronds » : tous les mots ont changé ?",
      "Transformer des groupes nominaux au pluriel et au féminin ; relier par des flèches les mots qui s'accordent.",
      "Ce qu'on retient : dans le groupe du nom, les mots s'accordent ensemble."),
    entrainement("S'entraîner : écrire au pluriel, au féminin", "écrire un groupe nominal au pluriel et au féminin.",
      "Les exercices du guide CP : écrire un ou une, écrire au pluriel, au féminin ; dictée de groupes nominaux (une olive, des olives).",
      "Ce qu'on retient : je regarde le déterminant pour savoir comment écrire le nom."),
    evaluation("écrire des groupes nominaux au pluriel et au féminin", "Ensuite, dans chaque dictée, les marques du pluriel et du féminin."),
  ],
};

const CHAINE_ACCORDS: Demarche = {
  id: "chaine-accords-c2", nom: "La chaîne d'accords dans le groupe nominal (CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Au CE1, reconnaître le groupe nominal (déterminant, nom, adjectif) et, en écoutant des transformations à l'oral puis en les observant à l'écrit, comprendre le lien entre ses mots dans la chaîne d'accords ; au CE2, repérer, comprendre et mettre en œuvre les marques d'accord : -s et -e réguliers, pluriels en -x et -al/-aux, féminins qui s'entendent (lecteur/lectrice, joyeux/joyeuse). Exemples de réussite : indiquer le genre et le nombre d'un déterminant ; résoudre des devinettes orthographiques — « Je suis bleue : suis-je la mer ou l'océan ? ».",
  seances: [
    trois("Le groupe nominal", "reconnaître un groupe nominal et ses mots : déterminant, nom, adjectif.",
      "« le petit chat noir » : combien de mots ? lequel est le plus important ?",
      "Repérer les groupes nominaux d'un texte ; trouver le nom noyau ; enlever, ajouter des adjectifs.",
      "Ce qu'on retient : un groupe nominal a un nom noyau, son déterminant, parfois des adjectifs.", MANIPULER),
    trois("Le nom commande", "faire varier le groupe nominal en genre et en nombre, à l'oral puis à l'écrit.",
      "« le petit chat » → « les petits chats » : à l'oral, qu'entend-on changer ? à l'écrit ?",
      "Transformer des groupes nominaux ; colorier les marques d'accord ; dire le genre et le nombre de chaque déterminant.",
      "Ce qu'on retient : le nom donne son genre et son nombre au déterminant et à l'adjectif."),
    trois("Les devinettes orthographiques", "utiliser les marques d'accord pour comprendre et justifier.",
      "« Je suis bleue : suis-je la mer ou l'océan ? »",
      "Résoudre des devinettes, en inventer ; justifier par le -e ou le -s.",
      "Ce qu'on retient : les marques d'accord donnent des indices."),
    entrainement("S'entraîner : accorder", "accorder les mots du groupe nominal, en dictée et en écriture.",
      "Transformer des groupes nominaux ; au CE2, les pluriels en -x, -aux et les féminins qui s'entendent ; dictée de groupes nominaux.",
      "Le tableau des marques d'accord, dans le cahier de références."),
    evaluation("accorder des groupes nominaux au pluriel et au féminin", "Ensuite, à chaque relecture, relier les mots de la chaîne d'accords."),
  ],
};

const SUJET_VERBE: Demarche = {
  id: "sujet-verbe-c2", nom: "Le sujet et le verbe (CP, CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Identifier la relation sujet-verbe à partir du sens et de l'observation des effets des transformations liées au temps et à la personne : au CP, observer les formes verbales fréquentes — « le chat miaule / les chats miaulent », « La voiture roule → Les voitures roulent », nous → -ons, vous → -ez, ils → -ent — ; au CE1, « Tu parles à Léa. / Léo parle à Léa. » ; au CE2, « Je joue au ballon / les enfants jouent au ballon / nous avons joué au ballon ».",
  seances: [
    trois("Qui fait l'action ?", "trouver le verbe et son sujet dans une phrase.",
      "« Le chat miaule. » — qui miaule ? Que fait le chat ?",
      "Repérer dans des phrases le verbe et celui qui fait l'action ; les relier par une flèche ; changer le sujet et voir ce qui change.",
      "Ce qu'on retient : le sujet dit qui fait l'action ; le verbe dit l'action.", MANIPULER),
    trois("Quand le sujet change, le verbe change", "accorder le verbe avec son sujet au présent.",
      "« Le chat miaule. Les chats miaulent. » — qu'entend-on ? que voit-on ?",
      "Transformer des phrases en changeant le sujet (je, tu, nous, vous, les enfants) ; classer les terminaisons ; découvrir le -nt qu'on n'entend pas.",
      "Ce qu'on retient : nous → -ons, vous → -ez, ils → -nt ; le verbe s'accorde avec son sujet."),
    trois("Le sujet loin du verbe", "trouver le vrai sujet quand d'autres mots le séparent du verbe.",
      "« Les enfants de la voisine jouent. » — qui joue ? la voisine ?",
      "Chercher le sujet avec « C'est… qui » ; le remplacer par un pronom ; accorder le verbe.",
      "Ce qu'on retient : je cherche qui fait l'action, pas le mot le plus proche."),
    entrainement("S'entraîner : accorder le verbe", "accorder le verbe avec son sujet en dictée et en écriture.",
      "Relier sujets et verbes ; transformer des phrases ; dictée de phrases (La voiture roule → Les voitures roulent).",
      "Ce qu'on retient : je relie le verbe à son sujet avant d'écrire la fin du verbe."),
    evaluation("accorder le verbe avec son sujet", "Ensuite, à chaque relecture, chercher le sujet de chaque verbe."),
  ],
};

// ── Le verbe ──────────────────────────────────────────────────────────────

const ETRE_AVOIR_CP: Demarche = {
  id: "etre-avoir-cp", nom: "Être et avoir au présent (CP)", famille: "Français",
  source: SOURCE_CP,
  resume: "Apprendre à conjuguer être et avoir au présent de l'indicatif et commencer à les mobiliser à l'écrit ; trouver l'orthographe d'une terminaison en s'appuyant sur le sens et les analogies (nous → -ons, vous → -ez, ils → -ent, tu → -s).",
  seances: [
    trois("Je suis, j'ai", "reconnaître le verbe être et le verbe avoir au présent.",
      "« Je suis content. J'ai un vélo. » — deux verbes très fréquents.",
      "Trier des phrases selon le verbe être ou avoir ; réciter les formes ; les dire avec un geste.",
      "Le tableau d'être et d'avoir au présent, affiché.", MANIPULER),
    trois("Avec chaque personne", "associer chaque pronom à la forme d'être et d'avoir qui convient.",
      "« Nous… avons ou sommes ? » — le sens aide.",
      "Compléter des phrases avec être et avoir ; vérifier en remplaçant le sujet par un pronom ; lire les phrases.",
      "Ce qu'on retient : je remplace le sujet par il, elle, ils, elles, nous ou vous pour choisir la forme."),
    entrainement("S'entraîner : être ou avoir ?", "choisir et écrire la forme d'être ou d'avoir qui convient.",
      "Le texte à trous d'être et d'avoir ; la dictée de phrases courtes.",
      "Ce qu'on retient : il a (sans accent) ; il est."),
    entrainement("Écrire avec être et avoir", "écrire des phrases avec être et avoir.",
      "Écrire une phrase sur soi avec « je suis », une avec « j'ai » ; les lire à la classe.",
      "Ce qu'on retient : être et avoir servent tout le temps."),
    evaluation("compléter des phrases avec être et avoir au présent", "Ensuite, être et avoir à chaque dictée."),
  ],
};

const VERBE_INFINITIF: Demarche = {
  id: "verbe-infinitif-c2", nom: "L'infinitif, le radical et la terminaison (CE1, CE2)", famille: "Français",
  source: SOURCE,
  resume: "Identifier le radical et la terminaison d'un verbe conjugué — du 1er groupe au CE1, des verbes au programme au CE2 — et trouver son infinitif. Exemple de réussite du programme : nommer l'infinitif d'un verbe conjugué à divers temps et à différentes personnes, en s'appuyant sur le repérage d'un radical commun : « ils plieront, tu as plié, vous pliez, elles plièrent → plier ».",
  seances: [
    trois("Un verbe, plusieurs formes", "reconnaître les formes d'un même verbe.",
      "« ils chanteront, tu as chanté, vous chantez » : un seul verbe ?",
      "Regrouper des formes verbales par verbe ; trouver ce qui ne change pas ; nommer le verbe : son infinitif.",
      "Ce qu'on retient : l'infinitif est le nom du verbe ; celui du 1er groupe finit par -er.", MANIPULER),
    trois("Le radical et la terminaison", "séparer le radical et la terminaison d'un verbe conjugué.",
      "« nous chantons » : quelle partie vient de chanter, quelle partie change avec la personne ?",
      "Tracer le trait entre radical et terminaison ; comparer avec d'autres personnes et d'autres temps.",
      "Ce qu'on retient : le radical porte le sens ; la terminaison dit la personne et le temps."),
    trois("Trouver l'infinitif", "trouver l'infinitif d'un verbe conjugué à n'importe quel temps.",
      "« Ils jouaient » — quel verbe ? Comment le trouver ?",
      "Dire « il faut… » devant le verbe (il faut jouer) ; trouver l'infinitif de formes variées ; au CE2, les verbes irréguliers (vous faites → faire, ils vont → aller).",
      "Ce qu'on retient : pour trouver l'infinitif, je dis « il faut… »."),
    entrainement("S'entraîner : infinitif, radical, terminaison", "trouver l'infinitif et séparer radical et terminaison.",
      "Des formes verbales à analyser ; des infinitifs à chercher dans le dictionnaire.",
      "Ce qu'on retient : dans le dictionnaire, on cherche le verbe à l'infinitif."),
    evaluation("trouver l'infinitif de verbes conjugués et séparer radical et terminaison", "Ensuite, chercher l'infinitif des verbes inconnus dans le dictionnaire."),
  ],
};

const TERMINAISONS: Record<Temps, { nom: string; titre: string; regle: string; reperes: string; corpus: string }> = {
  present: { nom: "le présent", titre: "Conjuguer au présent", regle: "au présent, les verbes en -er se terminent par -e, -es, -e, -ons, -ez, -ent", reperes: "maintenant, aujourd'hui, en ce moment", corpus: "« Aujourd'hui, je chante ; nous chantons ; ils chantent. »" },
  imparfait: { nom: "l'imparfait", titre: "Conjuguer à l'imparfait", regle: "à l'imparfait, tous les verbes se terminent par -ais, -ais, -ait, -ions, -iez, -aient", reperes: "autrefois, avant, quand j'étais petit", corpus: "« Autrefois, je chantais ; nous chantions ; ils chantaient. »" },
  futur: { nom: "le futur", titre: "Conjuguer au futur", regle: "au futur, les verbes en -er gardent leur infinitif et ajoutent -ai, -as, -a, -ons, -ez, -ont", reperes: "demain, plus tard, la semaine prochaine", corpus: "« Demain, je chanterai ; nous chanterons ; ils chanteront. »" },
  passeCompose: { nom: "le passé composé", titre: "Conjuguer au passé composé", regle: "le passé composé se forme avec l'auxiliaire avoir — parfois être — au présent et le participe passé : j'ai chanté, je suis allé", reperes: "hier, ce matin, la semaine dernière", corpus: "« Hier, j'ai chanté ; nous avons chanté ; ils ont chanté. »" },
};

/** Une séquence de conjugaison, au temps donné : observer, structurer, être et avoir, les irréguliers au CE2, s'entraîner. */
function conjuguer(temps: Temps): Demarche {
  const t = TERMINAISONS[temps], x = tempsDe(temps);
  return {
    id: `conjuguer-${temps === "passeCompose" ? "passe-compose" : temps}-c2`, nom: `${t.titre} (CE1, CE2)`, famille: "Français",
    source: SOURCE,
    resume: `Apprendre à conjuguer ${x.au} de l'indicatif être et avoir et les verbes du 1er groupe au CE1 ; au CE2, aussi les verbes irréguliers faire, aller, dire, venir, pouvoir, voir, vouloir, prendre. Le programme les veut « au présent, à l'imparfait, au futur puis au passé composé ». Exemples de réussite : orthographier les formes verbales en dictée et commencer à les mobiliser en écriture autonome ; des gammes d'écriture (« Simon parle à Nora./Simon parlait à Nora./Simon parlera à Nora. »).`,
    seances: [
      trois(`Observer ${t.nom}`, `reconnaître des phrases ${x.au} et les mots qui l'annoncent.`,
        `Un corpus au tableau : ${t.corpus} Quand cela se passe-t-il ?`,
        `Trier des phrases selon le moment (passé, présent, futur) ; repérer les mots repères (${t.reperes}) ; classer les formes verbales dans un tableau par personne.`,
        `Ce qu'on retient, formulé par les élèves et validé : ${t.regle}.`, MANIPULER),
      trois(`Les terminaisons ${x.du}`, `conjuguer un verbe du 1er groupe ${x.au} à toutes les personnes.`,
        "Le tableau de la veille : « Et avec un autre verbe en -er ? »",
        "Conjuguer d'autres verbes en -er, souligner les terminaisons, les comparer ; attention à manger (nous mangeons) et commencer (nous commençons).",
        "Le tableau de conjugaison, dans le cahier de références."),
      trois(`Être et avoir ${x.au}`, `conjuguer être et avoir ${x.au}.`,
        "Être et avoir, les deux verbes les plus fréquents : comment se conjuguent-ils à ce temps ?",
        `Conjuguer être et avoir ${x.au} ; les employer dans des phrases ; au CE2, conjuguer les verbes irréguliers du programme et les classer par ressemblance.`,
        "Les tableaux d'être, d'avoir et des verbes irréguliers, affichés."),
      entrainement(`S'entraîner : ${t.nom}`, `écrire des verbes ${x.au} en dictée et en écriture.`,
        `Compléter des tableaux ; transformer des phrases ${x.au} ; dictée de phrases ; gammes d'écriture.`,
        "Ce qu'on retient : je trouve le sujet, je choisis la terminaison, je relis."),
      evaluation(`conjuguer et écrire des verbes ${x.au}`, "Ensuite, réinvestir ce temps dans les écrits ; puis le temps suivant de la progression."),
    ],
  };
}

const CONJUGUER = (["present", "imparfait", "futur", "passeCompose"] as Temps[]).map(conjuguer);

export const DEMARCHES_LANGUE: Demarche[] = [PHRASE_CP, TYPES_FORMES, CLASSES_DE_MOTS, CONSTITUANTS, DISCOURS, GENRE_NOMBRE_CP, CHAINE_ACCORDS, SUJET_VERBE, ETRE_AVOIR_CP, VERBE_INFINITIF, ...CONJUGUER];

/** Le temps à conjuguer d'après la période : le présent, l'imparfait, le futur, puis le passé composé — l'ordre du programme. */
export const tempsDeLaPeriode = (periode: number): Temps => (periode <= 2 ? "present" : periode === 3 ? "imparfait" : periode === 4 ? "futur" : "passeCompose");

/**
 * La séquence de grammaire, d'orthographe grammaticale ou de conjugaison
 * d'une compétence du cycle 2 ; rien sinon. Conjuguer « au présent, à
 * l'imparfait, au futur puis au passé composé » : le temps de la période.
 */
export function demarcheDeLaLangue(classe: string, cg: string, comp: string, periode = 0): string | null {
  if (/se reperer dans la phrase simple/.test(cg)) {
    if (/discours rapporte/.test(comp)) return "discours-rapporte-ce2";
    if (/types de phrases|formes? negatives?|exclamatives?/.test(comp)) return "types-formes-c2";
    if (/classes? de mots/.test(comp)) return "classes-de-mots-c2";
    if (/constituants/.test(comp)) return "constituants-c2";
    return classe === "cp" ? "phrase-cp" : "constituants-c2";
  }
  if (/orthographe grammaticale/.test(cg)) {
    if (/etre et avoir au present/.test(comp)) return "etre-avoir-cp";
    if (/radical/.test(comp)) return "verbe-infinitif-c2";
    if (/apprendre a conjuguer/.test(comp)) {
      const t = tempsDeLaPeriode(periode || 1);
      return `conjuguer-${t === "passeCompose" ? "passe-compose" : t}-c2`;
    }
    if (/sujet-verbe|formes verbales/.test(comp)) return "sujet-verbe-c2";
    if (classe === "cp") return "genre-nombre-cp";
    return "chaine-accords-c2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const gr = (seance: number, titre: string, r: Partial<ReglagesGrammaire>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GRAMMAIRE, ...r };
  return {
    seance, atelier: "grammaire", titre,
    fabriquer: (graine) => ({ html: htmlGrammaire(reglages, graine), style: STYLE_FEUILLE + STYLE_GRAMMAIRE, refaire: { grammaire: reglages } }),
  };
};
const tri = (seance: number, modele: string): FeuilleAFabriquer => {
  const m = MODELES_TRI.find((x) => x.id === modele)!;
  return {
    seance, atelier: "tri", titre: m.reglages.titre,
    fabriquer: (graine) => ({ html: htmlTri(m.reglages, graine), style: STYLE_FEUILLE + STYLE_TRI, refaire: { tri: m.reglages } }),
  };
};
const trous = (seance: number, modele: string): FeuilleAFabriquer => {
  const m = MODELES_TROUS.find((x) => x.id === modele)!;
  const r = { ...REGLAGES_TROUS, modele: m.id, titre: m.titre, phrases: m.phrases, texteMethode: m.methode };
  return { seance, atelier: "trous", titre: m.titre, fabriquer: (graine) => ({ html: htmlTexteATrous(r, graine), style: STYLE_FEUILLE + STYLE_TROUS, refaire: { trous: r } }) };
};
const PHRASES_A_ORDONNER = ["Le chat dort sur le lit.", "Papa lit le journal.", "Les enfants jouent dans la cour.", "Lila mange une pomme rouge."];
const REGLAGES_A_ORDONNER = { ...REGLAGES_PHRASES, phrases: PHRASES_A_ORDONNER.join("\n") };
const desordre = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "phrases", titre: "Remettre les mots dans l'ordre",
  fabriquer: (graine) => ({
    html: htmlPhrasesEnDesordre(phrasesEnDesordre(PHRASES_A_ORDONNER, graine), REGLAGES_A_ORDONNER), style: STYLE_FEUILLE + STYLE_PHRASES,
    refaire: { phrases: REGLAGES_A_ORDONNER },
  }),
});

type Plan = { feuilles: FeuilleAFabriquer[]; materiel: string[] };
const conjugaisonPlan = (temps: Temps) => (classe: ClasseC2): Plan => {
  const c = classe === "CP" ? "CE1" : classe;
  return {
    feuilles: [
      tri(0, "temps"),
      gr(1, `Conjuguer ${tempsDe(temps).au}`, { exercice: "conjuguer", classe: c, temps, verbes: "chanter, jouer, manger" }),
      gr(2, `Être et avoir ${tempsDe(temps).au}`, { exercice: "conjuguer", classe: c, temps, verbes: c === "CE2" ? "être, avoir, faire, aller" : "être, avoir" }),
      // Au présent, on change la personne ; aux autres temps, on passe du présent au temps étudié.
      temps === "present"
        ? gr(3, "Le sujet et le verbe", { exercice: "sujetVerbe", classe: c })
        : gr(3, `Changer le temps : ${tempsDe(temps).nom}`, { exercice: "transformerTemps", classe: c, temps }),
      gr(4, `Conjuguer ${tempsDe(temps).au} — évaluation`, { exercice: "conjuguer", classe: c, temps }),
    ],
    materiel: ["Le corpus de phrases au tableau ; des étiquettes de phrases", "Le tableau de conjugaison vierge, en grand", "Les tableaux d'être et d'avoir", "Le cahier de références ; le cahier du jour", "Les feuilles d'évaluation"],
  };
};

const PLANS: Record<string, (classe: ClasseC2) => Plan> = {
  "phrase-cp": () => ({
    feuilles: [tri(0, "phrase"), gr(1, "Combien de phrases ?", { exercice: "phrases", classe: "CP" }), desordre(2), gr(4, "Est-ce une phrase ? — évaluation", { exercice: "estCeUnePhrase", classe: "CP" })],
    materiel: ["Des étiquettes de phrases et de non-phrases", "Le texte court au tableau ; des crayons de couleur", "Les étiquettes-mots de quelques phrases", "Des étiquettes et des mots donnés", "Les feuilles d'évaluation"],
  }),
  "types-formes-c2": (classe) => ({
    feuilles: [tri(0, "types"), gr(0, "Les types de phrases", { exercice: "types", classe }), gr(2, "La forme négative", { exercice: "negation", classe }), gr(4, "Les types de phrases — évaluation", { exercice: "types", classe })],
    materiel: ["Les trois phrases au tableau ; des étiquettes de phrases", "Un texte avec des phrases exclamatives", "Des phrases en étiquettes ; des étiquettes ne… pas", "Des phrases à transformer", "Les feuilles d'évaluation"],
  }),
  "classes-de-mots-c2": (classe) => ({
    feuilles: [tri(0, "nom-verbe"), gr(3, "Les classes de mots", { exercice: "classes", classe }), gr(4, "Les classes de mots — évaluation", { exercice: "classes", classe })],
    materiel: ["Des mots des textes de la semaine, en étiquettes", "Des noms et des déterminants en étiquettes", "Des phrases à transformer", "Le tableau des classes de la classe", "Les feuilles d'évaluation"],
  }),
  "constituants-c2": (classe) => ({
    feuilles: [desordre(0), gr(1, "Groupe sujet, verbe, compléments", { exercice: "constituants", classe }), gr(3, "Le groupe sujet et le pronom", { exercice: "pronoms", classe }), gr(4, "Groupe sujet, verbe, compléments — évaluation", { exercice: "constituants", classe })],
    materiel: ["La phrase en étiquettes-mots", "Des étiquettes « C'est… qui » et « ne… pas »", "Des crochets en couleur", "Des phrases de plus en plus longues ; un premier jet d'écriture", "Les feuilles d'évaluation"],
  }),
  "discours-rapporte-ce2": () => ({
    feuilles: [gr(0, "Les paroles rapportées", { exercice: "discours", classe: "CE2" }), gr(1, "Les types de phrases", { exercice: "types", classe: "CE2" }), gr(4, "Les paroles rapportées — évaluation", { exercice: "discours", classe: "CE2" })],
    materiel: ["Un récit avec un dialogue ; des surligneurs", "Des paroles sans ponctuation", "Deux personnages d'un récit lu", "Un texte à ponctuer", "Les feuilles d'évaluation"],
  }),
  "genre-nombre-cp": () => ({
    feuilles: [tri(0, "nombre"), gr(3, "Masculin, féminin, singulier, pluriel", { exercice: "genreNombre", classe: "CP" }), gr(4, "Masculin, féminin, singulier, pluriel — évaluation", { exercice: "genreNombre", classe: "CP" })],
    materiel: ["Des groupes nominaux en étiquettes", "Des étiquettes un, une ; des adjectifs", "Des flèches de couleur", "Le cahier du jour", "Les feuilles d'évaluation"],
  }),
  "chaine-accords-c2": (classe) => ({
    feuilles: [tri(0, "nombre"), gr(1, "La chaîne d'accords", { exercice: "chaineAccords", classe: classe === "CP" ? "CE1" : classe }), gr(4, "La chaîne d'accords — évaluation", { exercice: "chaineAccords", classe: classe === "CP" ? "CE1" : classe })],
    materiel: ["Un texte ; des surligneurs", "Des groupes nominaux à transformer", "Des devinettes au tableau", "Le cahier du jour", "Les feuilles d'évaluation"],
  }),
  "sujet-verbe-c2": (classe) => ({
    feuilles: [gr(1, "Le sujet et le verbe", { exercice: "sujetVerbe", classe }), gr(4, "Le sujet et le verbe — évaluation", { exercice: "sujetVerbe", classe })],
    materiel: ["Des phrases en étiquettes", "Des étiquettes de sujets", "Des étiquettes « C'est… qui »", "Le cahier du jour", "Les feuilles d'évaluation"],
  }),
  "etre-avoir-cp": () => ({
    feuilles: [tri(0, "etre-avoir"), trous(1, "etre-avoir"), trous(2, "gn"), gr(4, "Être et avoir au présent — évaluation", { exercice: "conjuguer", classe: "CP" })],
    materiel: ["Des étiquettes de phrases avec être et avoir", "Les étiquettes des pronoms", "Le tableau d'être et d'avoir", "Le cahier du jour", "Les feuilles d'évaluation"],
  }),
  "verbe-infinitif-c2": (classe) => ({
    feuilles: [gr(2, "L'infinitif, le radical et la terminaison", { exercice: "infinitif", classe: classe === "CP" ? "CE1" : classe }), gr(4, "L'infinitif — évaluation", { exercice: "infinitif", classe: classe === "CP" ? "CE1" : classe })],
    materiel: ["Des formes verbales en étiquettes", "Les formes d'un même verbe au tableau", "Des étiquettes « il faut… »", "Des dictionnaires", "Les feuilles d'évaluation"],
  }),
  "conjuguer-present-c2": conjugaisonPlan("present"),
  "conjuguer-imparfait-c2": conjugaisonPlan("imparfait"),
  "conjuguer-futur-c2": conjugaisonPlan("futur"),
  "conjuguer-passe-compose-c2": conjugaisonPlan("passeCompose"),
};

export const estUneDemarcheDeLangue = (id: string) => id in PLANS;

export function planDeLaLangue(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  const fabrique = PLANS[demarcheId];
  if (!fabrique) return null;
  const p = fabrique(ctx.classe);
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
