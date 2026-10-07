// Les démarches du calcul mental au cycle 2, d'après les livrets.
//
// Les livrets d'accompagnement du programme de mathématiques (Éduscol, 2025)
// proposent, pour quelques compétences de calcul mental, une séquence entière :
// - CP, « Proposition de séquence n° 2 – Apprendre des procédures de calcul
//   mental (ajouter deux nombres inférieurs à 100 en CP) » : l'arbre à calcul ;
// - CE1, « Proposition de séquence n° 2 – Apprendre des procédures de calcul
//   mental : ajouter 9, 19 ou 29 » ;
// - CE1, « Proposition de séquence n° 3 – Construire et mémoriser à long terme
//   la table de 7 (multiplication) » ;
// - CE2, « Proposition de séquence n° 2 – Multiplier un nombre par 4 ».
// On les suit séance par séance, avec leurs calculs. Les autres compétences de
// calcul mental gardent la démarche du guide CP (« Une séquence de calcul ») :
// le procédé La Martinière, un fait ou une procédure à la fois.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });

const LIVRET = (classe: string, n: number, titre: string) =>
  `Éduscol, livret d'accompagnement du programme de mathématiques du ${classe} (2025), « Proposition de séquence n° ${n} – ${titre} »`;

// ── CP : ajouter deux nombres inférieurs à 100, l'arbre à calcul ─────────

const ARBRE_CP: Demarche = {
  id: "arbre-a-calcul-cp",
  nom: "Ajouter deux nombres inférieurs à 100 : l'arbre à calcul (CP)",
  famille: "Mathématiques",
  source: LIVRET("CP", 2, "Apprendre des procédures de calcul mental (ajouter deux nombres inférieurs à 100 en CP)"),
  resume: "La séquence du livret CP, à partir de la période 3 et avant l'addition posée, dont elle prépare le sens : on découvre l'arbre à calcul — décomposer les deux nombres en dizaines et unités, ajouter les dizaines entre elles et les unités entre elles, recomposer —, on s'entraîne jusqu'à pouvoir s'en passer, puis l'évaluation chronométrée : 6 à 9 calculs en 3 minutes. Prérequis : ajouter des dizaines entières à un nombre (13 + 20).",
  seances: [
    seance("Découverte de l'arbre à calcul",
      "À la fin de cette séance, les élèves sauront additionner deux nombres inférieurs à 100 à l'aide d'un arbre à calcul : décomposer en dizaines et unités, ajouter les dizaines entre elles et les unités entre elles, échanger dix unités contre une dizaine, recomposer le nombre.",
      45, [
        ph(T1, "15 min", "Au tableau : 34 + 17. Trois minutes au plus pour chercher, seul, en binôme ou en groupe. Mise en commun très rapide : dessiner 34 et 17 jetons, ou les barres et les cubes, c'est juste, mais long. Puis l'arbre à calcul, en verbalisant : « 34, c'est 3 dizaines et 4 unités : j'écris 30 et 4 ; 17, c'est 10 et 7. J'ajoute les dizaines entre elles : 40 ; les unités entre elles : 11. 4 dizaines, 1 dizaine et 1 unité : 51. » Validation avec les cubes et les barres de dix.",
          "Met en valeur la procédure d'un élève qui s'en est approché : « Je vais vous montrer comment il a procédé. »"),
        ph(T2, "20 min", "28 + 26 seul, puis corrigé ensemble avec l'arbre : la bonne réponse, ici, c'est la bonne utilisation de la procédure. Puis, l'un après l'autre sur l'ardoise, corrigés au tableau par des élèves : 17 + 33, 24 + 27, 35 + 13, 15 + 27, 31 + 12, 34 + 18 — en évitant les nombres qui se terminent par 9.",
          "Ceux qui sont à l'aise font la série en autonomie ; le matériel reste à disposition de qui en a besoin."),
        ph(T3, "10 min", "« Qu'avons-nous appris ? » La trace écrite, dans le cahier de mathématiques : l'arbre de 34 + 17 = 51, et la procédure."),
      ]),
    seance("Entraînement avec l'arbre (1)",
      "À la fin de cette séance, les élèves sauront appliquer seuls la procédure de l'arbre à calcul, et commenceront à s'en passer pour les calculs qu'ils trouvent faciles.",
      30, [
        ph(T1, "5 min", "Au tableau, 24 + 38 : un élève construit l'arbre, ou le dicte à l'enseignant qui l'écrit."),
        ph(T2, "15 min", "27 + 26, puis 36 + 15, sur l'ardoise, corrigés ensemble. Puis la fiche : 24 + 12 ; 15 + 22 ; 25 + 17 ; 14 + 27 ; 31 + 14 ; 34 + 23 ; 27 + 26 ; 24 + 27 ; 36 + 17. Qui a bien compris l'arbre peut calculer dans sa tête et n'écrire que le résultat, ou un résultat intermédiaire.",
          "Corrige directement sur la feuille de chaque élève."),
        ph(T3, "5 min", "Retour sur les difficultés : un nouvel arbre, construit ensemble."),
        ph(T4, "5 min", "Le temps commence à se limiter : environ une minute par calcul.",
          "Aux élèves encore fragiles, moins de calculs — 3, 4 ou 6 —, dont des calculs avec retenue : le même objectif pour tous."),
      ]),
    seance("Entraînement avec l'arbre (2)",
      "À la fin de cette séance, les élèves sauront ajouter deux nombres inférieurs à 100 plus vite, l'arbre tracé ou seulement pensé.",
      30, [
        ph(T1, "5 min", "Un calcul au tableau ; un élève rappelle la procédure."),
        ph(T2, "15 min", "La même séance, avec d'autres nombres : quelques calculs sur l'ardoise, corrigés ensemble, puis une nouvelle fiche, en temps limité.",
          "En APC ou pendant l'entraînement, reprend avec le matériel, comme à la première séance, ceux qui ne maîtrisent pas encore la procédure."),
        ph(T3, "5 min", "Retour sur les difficultés rencontrées."),
        ph(T4, "5 min", "Les cartes autocorrectives — le calcul au recto, le résultat au verso — rejoignent un coin d'entraînement en autonomie, avec une ardoise, pour l'accueil et les moments libres."),
      ]),
    seance("Évaluation chronométrée",
      "À la fin de cette séance, les élèves sauront ajouter deux nombres inférieurs à 100 en temps limité : 6 à 9 calculs justes en 3 minutes.",
      15, [
        ph(T1, "3 min", "On le dit explicitement : tracer l'arbre n'est pas obligatoire ; pour les calculs qu'on trouve faciles, on peut additionner dans sa tête et n'écrire que le résultat."),
        ph(T2, "5 min", "La fiche : 6 à 9 calculs, en 3 minutes."),
        ph(T3, "7 min", "Correction ; chacun note son nombre de calculs réussis, pour voir ses progrès d'une fois sur l'autre.",
          "Une évaluation positive : elle met en valeur les progrès d'un entraînement à l'autre."),
      ]),
    seance("Réinvestissement — séances courtes",
      "À la fin de cette séance, les élèves sauront utiliser la procédure ailleurs : en rituel, et pour trouver le tout d'un problème partie-tout.",
      15, [
        ph(T4, "15 min", "Tout au long de l'année, en séances plus courtes : quelques calculs, l'arbre tracé ou non ; et des problèmes partie-tout où l'on cherche le tout, résolus avec la procédure."),
      ]),
  ],
};

// ── CE1 : ajouter 9, 19 ou 29 ─────────────────────────────────────────────

const AJOUTER_19_CE1: Demarche = {
  id: "ajouter-9-19-29-ce1",
  nom: "Ajouter 9, 19 ou 29 : ajouter 10, 20 ou 30, retirer 1 (CE1)",
  famille: "Mathématiques",
  source: LIVRET("CE1", 2, "Apprendre des procédures de calcul mental : ajouter 9, 19 ou 29"),
  resume: "La séquence du livret CE1, à partir de la période 2 : pour ajouter 19, on ajoute 20 et on retire 1 — deux dizaines de plus, une unité de moins — ; puis 29 ; et l'on apprend quand la procédure n'est pas utile : quand le nombre se termine par 0 ou 1 (30 + 19 = 49). Huit séances, jusqu'à l'évaluation : 12 calculs en 3 minutes. Prérequis du CP : ajouter 9 (ajouter 10, retirer 1) et ajouter des dizaines entières.",
  seances: [
    seance("Découverte : ajouter 19",
      "À la fin de cette séance, les élèves sauront ajouter 19 à un nombre en ajoutant 20 puis en retirant 1 : deux dizaines de plus, une unité de moins.",
      45, [
        ph(T1, "15 min", "Au tableau : 58 + 19 — « Nous allons apprendre à ajouter 19 à un nombre rapidement. » Trois minutes au plus pour chercher seul, sur l'ardoise. Les procédures sont dites : justes, mais longues. Puis la procédure, verbalisée et schématisée : « 19, c'est 20 – 1 ; 58 + 20 = 78, 78 – 1 = 77. » Validation avec le matériel : un cube ajouté fait de 19 deux dizaines ; à la fin, on l'enlève.",
          "Si un élève a ajouté 20 puis retiré 1, sa procédure est mise en valeur à ce moment précis."),
        ph(T2, "20 min", "Des nombres pour lesquels la procédure est la plus efficace : 26 + 19, 47 + 19, 73 + 19, 62 + 19, 132 + 19, sur l'ardoise, avec les écritures intermédiaires ; on entoure le résultat. Puis 77 + 19, 24 + 19, 39 + 19, et 115 + 19, 131 + 19, 164 + 19, corrigés au tableau, le matériel pour valider si besoin.",
          "Les élèves à l'aise font en autonomie : 17 + 19 ; 54 + 19 ; 69 + 19 ; 115 + 19 ; 132 + 19 ; 125 + 19."),
        ph(T3, "10 min", "« Que venons-nous d'apprendre ? » La trace écrite : « Pour ajouter 19 à un nombre, j'ajoute 20 et je retire 1, ou j'ajoute 2 dizaines et je retire 1 unité. 58 + 19 = 58 + 20 – 1 = 77. »"),
      ]),
    seance("Entraînement guidé puis autonome",
      "À la fin de cette séance, les élèves sauront ajouter 19 seuls, de tête ou en notant un résultat intermédiaire.",
      30, [
        ph(T1, "5 min", "Au tableau, 24 + 19 : la procédure est rappelée ; un élève fait le calcul, ou le dicte à l'enseignant."),
        ph(T2, "15 min", "87 + 19, puis 236 + 19, corrigés aussitôt. Puis la fiche : 84 + 19 ; 115 + 19 ; 125 + 19 ; 264 + 19 ; 131 + 19 ; 234 + 19 ; 257 + 19 ; 304 + 19 ; 536 + 19 ; 482 + 19 ; 507 + 19 ; 633 + 19. Qui maîtrise calcule de tête et n'écrit que le résultat, entouré.",
          "Aux élèves fragiles, moins de calculs : 3, 4 ou 6."),
        ph(T3, "5 min", "Retour sur les difficultés : un nouveau calcul, fait ensemble."),
        ph(T4, "5 min", "La séance se refait avec d'autres nombres tant qu'il le faut ; le temps se limite peu à peu : une minute par calcul d'abord, 12 calculs en 3 minutes à la fin de la séquence.",
          "En APC, reprend la procédure avec le matériel, comme à la première séance."),
      ]),
    seance("Quand la procédure n'est pas utile",
      "À la fin de cette séance, les élèves sauront reconnaître les nombres pour lesquels la procédure n'est pas utile : quand le nombre se termine par 0 ou 1, on ajoute 19 directement.",
      30, [
        ph(T1, "5 min", "Deux ou trois calculs pour se remettre la procédure en tête."),
        ph(T2, "15 min", "Des calculs dont le nombre se termine par 0 ou 1, mêlés aux autres : 30 + 19 se fait directement — 49."),
        ph(T3, "10 min", "Institutionnalisation : la trace écrite s'enrichit — « Si le nombre se termine par 0 ou 1, il n'est pas nécessaire d'appliquer cette procédure. On peut ajouter directement 19. Par exemple : 30 + 19 = 49. »"),
      ]),
    seance("Entraînement : des calculs mélangés (1)",
      "À la fin de cette séance, les élèves sauront choisir, calcul après calcul, d'ajouter 20 et de retirer 1, ou d'ajouter 19 directement.",
      20, [
        ph(T4, "20 min", "Des calculs mélangeant des nombres qui se terminent par 0 ou 1 et tous les autres, sur l'ardoise puis sur fiche, en temps limité."),
      ]),
    seance("Entraînement : des calculs mélangés (2)",
      "À la fin de cette séance, les élèves sauront ajouter 19 vite et juste, quel que soit le nombre.",
      20, [
        ph(T4, "20 min", "La même séance, avec d'autres nombres ; le temps se raccourcit."),
      ]),
    seance("Ajouter 29",
      "À la fin de cette séance, les élèves sauront ajouter 29 à un nombre en ajoutant 30 puis en retirant 1.",
      30, [
        ph(T1, "10 min", "L'enseignement de la procédure, comme pour 19 : 58 + 29 = 58 + 30 – 1 = 87 — trois dizaines de plus, une unité de moins."),
        ph(T2, "15 min", "Entraînement sur ajouter 29 uniquement."),
        ph(T3, "5 min", "La trace écrite se complète : « Pour ajouter 29 à un nombre, j'ajoute 30 et je retire 1, ou j'ajoute 3 dizaines et je retire une unité. 58 + 29 = 58 + 30 – 1 = 87. »"),
      ]),
    seance("Entraînement : ajouter 9, 19 et 29",
      "À la fin de cette séance, les élèves sauront ajouter 9, 19 ou 29 à un nombre, en choisissant la procédure selon les nombres.",
      20, [
        ph(T4, "20 min", "Des calculs mêlant + 9, + 19 et + 29, sur l'ardoise puis sur fiche. Les cartes autocorrigées — + 9, + 19, + 29 mélangés — rejoignent le coin d'entraînement."),
      ]),
    seance("Renforcement et évaluation",
      "À la fin de cette séance, les élèves sauront ajouter 9 ou 19 en temps limité : 12 calculs en 3 minutes.",
      30, [
        ph(T1, "5 min", "Quelques calculs de renforcement, corrigés ensemble."),
        ph(T2, "15 min", "L'évaluation sur fiche, en temps limité : d'abord l'ajout de 19, puis les stratégies mêlées — ajouter 10 ou 20 et retirer 1, ou ajouter 9 ou 19 directement. En CE1, 12 calculs en 3 minutes."),
        ph(T3, "5 min", "Correction ; chacun voit son score."),
        ph(T4, "5 min", "Ensuite, en rituel plusieurs fois par semaine : une douzaine de calculs mêlant les procédures apprises — ajouter 9, puis 19, puis 29 —, en alternance avec les tables de multiplication."),
      ]),
  ],
};

// ── CE1 : la table de 7 ───────────────────────────────────────────────────

const TABLE_DE_7_CE1: Demarche = {
  id: "table-de-7-ce1",
  nom: "Construire et mémoriser la table de 7 (CE1)",
  famille: "Mathématiques",
  source: LIVRET("CE1", 3, "Construire et mémoriser à long terme la table de 7 (multiplication)"),
  resume: "La séquence du livret CE1, en période 3, après les tables de 2, 3, 4, 5, 6 et 10 : la table se construit sur ce qu'on sait déjà — la commutativité donne 0 × 7 à 6 × 7, la distributivité les trois résultats nouveaux, 7 × 7, 8 × 7 et 9 × 7 — ; elle se mémorise en cherchant les résultats de tête (la récupération en mémoire), en disant toujours l'opération avec son résultat — « 3 fois 7, 21 » —, d'abord de façon massée, puis espacée. Fin de CE1 : 8 égalités en une minute.",
  seances: [
    seance("Construire la table de 7",
      "À la fin de cette séance, les élèves sauront retrouver les résultats de la table de 7 — par la commutativité, grâce aux tables connues — et construire les nouveaux : 7 × 7 = 49, 8 × 7 = 56, 9 × 7 = 63.",
      50, [
        ph(T1, "15 min", "L'objectif est annoncé : construire la table de 7. Point sur les tables construites, dans la table de Pythagore. La table de 7 est écrite en colonne au tableau, sans résultats ; 0 × 7, 1 × 7… 6 × 7 sont donnés à l'oral, retrouvés si besoin à partir de résultats connus ; chacun est validé par une phrase que la classe répète : « 3 fois 7, 21 »."),
        ph(T2, "25 min", "Seul, par la méthode de son choix — schéma, cubes emboîtables, jetons — : 7 × 7, 8 × 7, 9 × 7. Pour 7 × 7, après 3 minutes : « 7 × 7, c'est 5 × 7 + 2 × 7, 35 + 14, soit 49 » ; la classe répète « 7 fois 7, 49 ». 8 fois 7, c'est le double de 4 fois 7 ; 9 fois 7, une fois 7 de moins que 10 fois 7. Puis la table se récite, dans l'ordre et dans le désordre, des résultats effacés peu à peu — ceux des tables connues d'abord.",
          "Évite de passer systématiquement par l'addition itérée : réactive les procédures de calcul mental apprises. La manipulation aide les plus fragiles à visualiser l'opération."),
        ph(T3, "10 min", "La trace écrite : la table de 7, dans le cahier."),
      ]),
    seance("Mémoriser la table — en binômes",
      "À la fin de cette séance, les élèves sauront réciter la table de 7 et vérifier celle d'un camarade.",
      10, [
        ph("Lire, puis se tester à deux", "10 min", "Le même jour que la première séance : chacun lit la table de 7 à voix basse dans son cahier, environ 2 minutes. Puis en binôme, cahiers fermés : chacun l'écrit sur son ardoise ; l'un lit ses calculs un par un et annonce les résultats, l'autre vérifie sur son cahier et lui donne le bon résultat s'il le faut ; on échange les rôles."),
      ]),
    seance("Mémoriser la table — à l'ardoise, le cahier ouvert",
      "À la fin de cette séance, les élèves sauront retrouver un résultat de la table de 7, en s'aidant de leur cahier s'ils l'ont oublié.",
      10, [
        ph("À l'ardoise", "10 min", "Un calcul de la table ; chacun écrit le résultat et lève l'ardoise au signal ; un élève le dit ; l'enseignant répète le calcul et son résultat — « 3 fois 7, 21 » —, la classe le redit. On peut regarder dans son cahier : le but est de mémoriser, pas d'évaluer, et mieux vaut retrouver le résultat que ne rien écrire.",
          "Associe toujours, de près, l'opération et son résultat : les tables relèvent de la mémoire verbale."),
      ]),
    seance("Mémoriser la table — à l'ardoise, sans le cahier",
      "À la fin de cette séance, les élèves sauront donner de mémoire les résultats de la table de 7, dans les deux ordres : sept fois quatre, quatre fois sept.",
      10, [
        ph("À l'ardoise", "10 min", "Comme la veille, sans le cahier ; les calculs se disent dans les deux ordres, grâce à la commutativité : sept fois quatre, ou quatre fois sept."),
      ]),
    seance("Exercices de mémorisation (1)",
      "À la fin de cette séance, les élèves sauront donner les résultats de la table de 7 à l'oral et les écrire, sans les chercher longtemps.",
      15, [
        ph("Étape 1 — cinq calculs à l'oral", "5 min", "Cinq calculs de la table, en 5 minutes, comme aux séances précédentes : l'ardoise levée au signal, un élève répond, la classe redit le calcul et son résultat."),
        ph("Étape 2 — dix calculs sur fiche", "10 min", "Dix calculs, énoncés deux fois chacun ; les élèves notent les résultats sur la fiche. Correction collective : pour chaque calcul, un élève donne le résultat, l'enseignant l'écrit et le redit — « 3 fois 7, 21 »."),
      ]),
    seance("Exercices de mémorisation (2)",
      "À la fin de cette séance, les élèves sauront donner les résultats de la table de 7 plus sûrement encore, à l'oral et par écrit.",
      15, [
        ph("Étape 1 — cinq calculs à l'oral", "5 min", "Cinq autres calculs, avec correction et mémorisation du résultat entre chaque calcul."),
        ph("Étape 2 — dix calculs sur fiche", "10 min", "Dix calculs énoncés deux fois, notés sur la fiche ; correction collective, le calcul redit avec son résultat."),
      ]),
    seance("Jeux de mémorisation — la table de 7",
      "À la fin de cette séance, les élèves sauront retrouver vite un résultat de la table de 7 en jouant.",
      40, [
        ph("Jeu des cartes, en binômes", "40 min", "Les cartes imprimées recto-verso : l'un désigne une carte, l'autre doit donner le résultat du calcul avant qu'elle soit retournée. D'autres jeux conviennent — un jeu de l'oie ou des dominos des tables — : l'important est de chercher le résultat d'une opération."),
      ]),
    seance("Jeux de mémorisation — plusieurs tables",
      "À la fin de cette séance, les élèves sauront retrouver un résultat de la table de 7 parmi ceux d'autres tables.",
      40, [
        ph("Jeux en binômes", "40 min", "Comme la séance précédente, avec des jeux qui mêlent plusieurs tables — les tables de 5, 6 et 7, par exemple."),
      ]),
    seance("Entraînement sur fiche — la table de 7",
      "À la fin de cette séance, les élèves sauront compléter des égalités de la table de 7 dans les deux sens, en temps limité.",
      10, [
        ph("Vingt égalités en deux minutes", "5 min", "Une fiche de vingt égalités à compléter — 2 × 7 = … ; … × 7 = 28 — : deux minutes pour en faire le plus possible. Séance proposée chaque jour pendant une semaine environ."),
        ph("Correction", "5 min", "Chacun corrige ses résultats. L'objectif de fin de CE1 : 8 égalités en une minute."),
      ]),
    seance("Entraînement sur fiche — plusieurs tables",
      "À la fin de cette séance, les élèves sauront compléter des égalités qui mêlent la table de 7 à d'autres tables, en temps limité.",
      10, [
        ph("Vingt égalités en deux minutes", "5 min", "Vingt égalités qui mêlent les tables — 5, 6 et 7 —, deux minutes. Séance proposée chaque jour pendant une semaine."),
        ph("Correction", "5 min", "Chacun corrige ses résultats à l'aide de sa leçon."),
      ]),
    seance("Entraînement sur fiche — une semaine plus tard",
      "À la fin de cette séance, les élèves sauront retrouver la table de 7 une semaine après : l'entraînement espacé l'ancre en mémoire.",
      10, [
        ph("Vingt égalités en deux minutes", "5 min", "Comme la séance « la table de 7 », une semaine plus tard."),
        ph("Correction", "5 min", "Chacun corrige ses résultats."),
      ]),
    seance("Entraînement sur fiche — trois semaines plus tard",
      "À la fin de cette séance, les élèves sauront retrouver les résultats de plusieurs tables trois semaines après.",
      10, [
        ph("Vingt égalités en deux minutes", "5 min", "Comme la séance « plusieurs tables », trois semaines plus tard."),
        ph("Correction", "5 min", "Chacun corrige ses résultats à l'aide de sa leçon."),
      ]),
    seance("Évaluation",
      "À la fin de cette séance, les élèves sauront compléter en temps limité les égalités de la table de 7, mêlées à d'autres tables.",
      10, [
        ph("Test de fluence", "5 min", "La fiche, en temps limité, comme aux séances d'entraînement : le nombre de résultats corrects en un temps donné."),
        ph("Correction", "5 min", "Chacun compte ses résultats corrects et voit ses progrès. Les tables reviennent ensuite tout au long de l'année, et au CE2."),
      ]),
  ],
};

// ── CE2 : multiplier un nombre par 4 ──────────────────────────────────────

const FOIS_4_CE2: Demarche = {
  id: "multiplier-par-4-ce2",
  nom: "Multiplier un nombre par 4 : le double du double (CE2)",
  famille: "Mathématiques",
  source: LIVRET("CE2", 2, "Multiplier un nombre par 4"),
  resume: "La séquence du livret CE2 : pour multiplier par 4, on multiplie par 2, puis encore par 2 — le double du double. D'abord avec des nombres dont les doubles sont connus (35, 45, 150…), puis d'autres ; on apprend aussi quand une autre procédure va plus vite — la table de 4, les dizaines entières, la distributivité. Six séances, jusqu'au réinvestissement ; fin de CE2 : 15 résultats corrects en moins de 3 minutes. Le programme y ajoute multiplier par 8 : doubler trois fois.",
  seances: [
    seance("Découverte : le double du double",
      "À la fin de cette séance, les élèves sauront multiplier un nombre inférieur à 100 par 4 en le multipliant deux fois de suite par 2, en notant au besoin le résultat intermédiaire.",
      45, [
        ph(T1, "20 min", "Le problème, au tableau, 5 minutes : « La directrice de l'école veut commander des livres pour mettre dans les bibliothèques des 4 classes de l'école. Elle prévoit d'acheter 35 livres par classe. Combien de livres va-t-elle commander ? » Recherche sur l'ardoise, les cubes emboîtables à disposition. Puis l'enseignement de la procédure, 15 minutes : les procédures sont dites, les plus lentes et les plus risquées soulignées ; 4 fois 35, c'est 2 fois 2 fois 35 : 2 × 35 = 70, 2 × 70 = 140 — avec le matériel au tableau, en verbalisant.",
          "Valorise aussi la distributivité si elle vient — 4 × 30 + 4 × 5 — : elle reste très efficace."),
        ph(T2, "15 min", "Quelques calculs à l'ardoise, avec la procédure : 4 × 45, 4 × 150, 4 × 16, 4 × 250…",
          "Le matériel, ou sa représentation sur l'ardoise, sécurise qui en a besoin ; un appui à limiter peu à peu, gardé pour valider."),
        ph(T3, "10 min", "La trace écrite : « Pour multiplier un nombre par 4, on peut le multiplier par 2 puis de nouveau par 2. 4 × 45 = 2 × 2 × 45 = 2 × 90 = 180. »"),
      ]),
    seance("Entraînement à l'ardoise",
      "À la fin de cette séance, les élèves sauront appliquer le double du double, calcul après calcul.",
      15, [
        ph("Rappel", "3 min", "La procédure, rappelée : le double du double."),
        ph("Calculs à l'ardoise", "12 min", "Des calculs donnés un par un, corrigés ensemble au tableau avec la procédure, sur des nombres dont les doubles sont connus : 11, 12, 16, 17, 30, 35, 40, 45, 50, 60, 75, 110, 120, 150, 160, 170, 250, 300, 350, 400, 450, 500, 600, 750, 1 500, 2 500."),
      ]),
    seance("Entraînement sur fiche",
      "À la fin de cette séance, les élèves sauront multiplier par 4 de plus en plus vite.",
      15, [
        ph("Rappel", "3 min", "La procédure, rappelée."),
        ph("Calculs sur fiche", "12 min", "Quelques calculs sur fiche, en temps limité — 3 calculs en 3 minutes, puis davantage dans le même temps, selon les réussites — ; on élargit aux nombres dont le chiffre des unités est compris entre 1 et 5.",
          "Ces séances courtes peuvent devenir des rituels."),
      ]),
    seance("Évaluation intermédiaire",
      "À la fin de cette séance, les élèves sauront multiplier par 4 par le double du double en temps limité : 6 à 9 calculs en 3 minutes.",
      15, [
        ph("Fiche chronométrée", "5 min", "Quand tous les élèves maîtrisent la procédure : une fiche de 6 à 9 calculs × 4, en 3 minutes. Le temps limité valide l'efficacité de la procédure, et fait abandonner l'addition réitérée."),
        ph("Correction", "10 min", "Correction ; on repère ceux qui ont compris la procédure et ceux qui ont encore besoin d'explications.",
          "Habitue tous les élèves au chronomètre, tout au long de l'année : les études montrent que les filles en sont plus affectées."),
      ]),
    seance("Renforcement : choisir sa procédure",
      "À la fin de cette séance, les élèves sauront choisir leur procédure selon le nombre : la table de 4, les dizaines entières, le double du double ou la distributivité.",
      30, [
        ph(T2, "20 min", "D'autres nombres que ceux des premières séances — 18, par exemple —, pour lesquels plusieurs stratégies sont possibles, verbalisées et comparées : 4 × 18 = 4 × 2 × 9 = 8 × 9 = 72 ; 2 × 18 = 36, puis 2 × 36 = 72 ; 4 × 20 – 4 × 2 = 80 – 8 = 72 ; 4 × 10 + 4 × 8 = 40 + 32 = 72."),
        ph(T3, "10 min", "La trace écrite se complète des cas particuliers : « Pour multiplier par 4 des dizaines entières : 4 × 20, c'est 4 fois deux dizaines, donc 8 dizaines ou 80. Pour multiplier par 4 des nombres inférieurs à 10, on utilise la table de multiplication par 4 : 4 × 8 = 32. »"),
      ]),
    seance("Réinvestissement — séances très courtes",
      "À la fin de cette séance, les élèves sauront mêler sur une même fiche le double du double, les dizaines entières et la table de 4.",
      10, [
        ph(T4, "10 min", "En rituel : des fiches qui mêlent les dizaines entières, la table de 4 et la procédure × 2 × 2 ; puis, tout au long de l'année, des séances de renforcement et des évaluations chronométrées, pour stabiliser la procédure. Fin de CE2 : 15 résultats corrects en moins de 3 minutes."),
      ]),
  ],
};

export const DEMARCHES_CALCUL: Demarche[] = [ARBRE_CP, AJOUTER_19_CE1, TABLE_DE_7_CE1, FOIS_4_CE2];

/** La classe de chaque démarche des livrets. */
export const CLASSE_DES_DEMARCHES_CALCUL: Record<string, "CP" | "CE1" | "CE2"> = {
  "arbre-a-calcul-cp": "CP", "ajouter-9-19-29-ce1": "CE1", "table-de-7-ce1": "CE1", "multiplier-par-4-ce2": "CE2",
};

/**
 * La séquence d'un livret pour une compétence de calcul mental, quand il y en
 * a une à sa classe ; rien sinon. `classe` et `competence` sont en minuscules
 * sans accents, comme les compare la suggestion des démarches.
 */
export function demarcheDuLivretDeCalcul(classe: string, competence: string): string | null {
  if (classe === "cp" && /ajouter deux nombres inferieurs a 100/.test(competence)) return "arbre-a-calcul-cp";
  if (classe === "ce1" && /ajouter 9, 19 (ou|et) 29/.test(competence)) return "ajouter-9-19-29-ce1";
  if (classe === "ce1" && /connaitre dans les deux sens les tables de multiplication/.test(competence)) return "table-de-7-ce1";
  if (classe === "ce2" && /multiplier un nombre (entier )?par 4/.test(competence)) return "multiplier-par-4-ce2";
  return null;
}
