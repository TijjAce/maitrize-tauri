// Les problèmes, l'algèbre et la proportionnalité au cours moyen.
//
// Deux séquences viennent des livrets d'accompagnement (Éduscol, 2026) : au
// CM1, « Initiation au raisonnement algébrique » — les cartes et les
// enveloppes, puis la balance à plateaux — ; au CM2, « Résoudre un problème
// de proportionnalité » — la linéarité multiplicative, puis additive. Les
// autres sont bâties, en le disant, sur le programme de mathématiques du
// cycle 3 (2025) et ses exemples de réussite, dont elles reprennent les
// situations. La résolution de problèmes suit le modèle en quatre phases du
// programme — comprendre, modéliser, calculer, répondre — ; les élèves en
// traitent au moins dix par semaine, dont des problèmes élémentaires à l'oral.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_ALGEBRE, STYLE_ALGEBRE, htmlAlgebre, type ExerciceAlgebre, type ReglagesAlgebre } from "./algebreCoursMoyen";
import { REGLAGES_PROBLEMES_CM, STYLE_PROBLEMES_CM, htmlProblemesCM, type ReglagesProblemesCM, type SorteProblemeCM } from "./problemesCoursMoyen";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `La feuille d'évaluation : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const PROGRAMME_C3 = "Bâtie sur le programme de mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025) — le livret d'accompagnement n'a pas de séquence pour cette notion — ; démarche en quatre temps des livrets";
const QUATRE_PHASES = "Les quatre phases du programme : comprendre — redire l'histoire avec ses mots —, modéliser — un schéma, l'opération —, calculer, répondre — et se demander si c'est possible.";
const REGULER = "« Le nombre trouvé est plus grand que le tout : est-ce possible ? » — la régulation, à chaque problème.";

// ── Les problèmes ────────────────────────────────────────────────────────

const ADDITIFS_CM1: Demarche = {
  id: "problemes-additifs-cm1", nom: "Problèmes additifs en une étape : parties-tout et comparaison (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dans la continuité du cycle 2, des problèmes additifs en une étape — parties-tout, comparaison —, avec des décimaux et des fractions, en s'appuyant si besoin sur un schéma en barres. Les exemples de réussite : 6 kg de fruits dont 3,4 kg de pommes, quelle masse de poires ? ; une fille de 1,61 m qui mesure 13 cm de plus que son camarade ; deux bandes de papier, l'une de 37 dixièmes de centimètre, l'autre de 4 cm et 3 dixièmes.",
  seances: [
    seance("Parties-tout, avec des décimaux", sauront("résoudre un problème parties-tout avec des décimaux, à l'aide d'un schéma en barres."), 45, [
      ph(T1, "10 min", "Les pommes et les poires : le problème lu deux fois, redit par un élève avec ses mots ; de quoi parle-t-on, que cherche-t-on ?"),
      ph(T2, "25 min", "Le schéma en barres : le tout, les parties, ce qu'on connaît, ce qu'on cherche ; puis l'opération, le calcul, la phrase réponse.", QUATRE_PHASES),
      ph(T3, "10 min", "Ce qu'on retient : on cherche une partie, on soustrait ; on cherche le tout, on ajoute."),
    ]),
    seance("Comparer : de plus, de moins", sauront("résoudre un problème de comparaison additive, même quand l'énoncé dit « plus » et qu'il faut soustraire."), 45, [
      ph(T1, "10 min", "« Elle mesure 1,61 m, 13 cm de plus que lui » : qui est le plus grand ? Faut-il ajouter ? Et les unités ?"),
      ph(T2, "25 min", "Des problèmes de comparaison ; on dessine les deux barres et l'écart ; les bandes de papier en dixièmes de centimètre.", REGULER),
      ph(T3, "10 min", "Ce qu'on retient : ce n'est pas un mot de l'énoncé qui dit l'opération, c'est l'histoire."),
    ]),
    seance("S'entraîner", sauront("résoudre seuls des problèmes additifs en une étape, de toutes sortes."), 30, [
      ph(T4, "25 min", "Des problèmes mêlés ; des problèmes élémentaires à l'oral, la réponse sur l'ardoise."),
      ph(T3, "5 min", "On compare deux schémas d'un même problème."),
    ]),
    evaluation("résoudre des problèmes additifs en une étape", "Ensuite, des problèmes en deux ou trois étapes ; au moins dix problèmes par semaine."),
  ],
};

const ETAPES_CM1: Demarche = {
  id: "problemes-etapes-cm1", nom: "Problèmes additifs en deux ou trois étapes (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes additifs en plusieurs étapes, sur de grands entiers et des décimaux, et des comparaisons en deux étapes : la valeur de l'un, l'écart, et les deux réunis. Les exemples de réussite : 17 km parcourus en 1 h 30 min, dont 8,4 km la première demi-heure et 3,8 km la deuxième — et la dernière ? ; « Léo a 25,60 €. Lucie a 7,55 € de plus que Léo. Combien d'euros les deux enfants ont-ils en tout ? », avec un schéma en barres.",
  seances: [
    seance("Une question intermédiaire", sauront("trouver la question intermédiaire d'un problème en deux étapes."), 45, [
      ph(T1, "10 min", "Les trois demi-heures : que faut-il savoir d'abord ?"),
      ph(T2, "25 min", "Écrire la question intermédiaire, puis la résoudre ; le schéma montre les deux étapes.", QUATRE_PHASES),
      ph(T3, "10 min", "Ce qu'on retient : avant de calculer, je me demande ce que je dois trouver d'abord."),
    ]),
    seance("Comparer en deux étapes", sauront("résoudre un problème de comparaison qui demande une étape de plus."), 45, [
      ph(T1, "10 min", "Léo et Lucie : deux barres, l'écart, puis le tout."),
      ph(T2, "25 min", "Des problèmes de comparaison en deux étapes, avec des euros, des longueurs."),
      ph(T3, "10 min", "On garde la trace d'un schéma en barres à deux étapes."),
    ]),
    seance("S'entraîner", sauront("résoudre seuls des problèmes en deux ou trois étapes."), 30, [
      ph(T4, "25 min", "Des problèmes mêlés ; chacun écrit ses calculs et sa phrase réponse.", REGULER),
      ph(T3, "5 min", "On compare des démarches."),
    ]),
    evaluation("résoudre des problèmes additifs en deux ou trois étapes", "Ensuite, des problèmes qui mêlent les quatre opérations."),
  ],
};

const MULTIPLICATIFS_CM1: Demarche = {
  id: "problemes-multiplicatifs-cm1", nom: "Problèmes multiplicatifs : parts égales et « fois plus » (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes multiplicatifs de type parties-tout en une étape, sur un champ numérique plus étendu qu'au cycle 2 — six dictionnaires à 17,85 € l'un, avec leur schéma — : chercher le tout, la valeur d'une part, le nombre de parts. Puis la comparaison multiplicative : comprendre « fois plus » et « fois moins », les distinguer de « de plus » et « de moins », et résoudre en deux étapes — la trottinette quatre fois plus chère que le casque à 32 € : combien pour les deux ?",
  seances: [
    seance("Des parts égales", sauront("résoudre un problème de parts égales : chercher le tout, la valeur d'une part ou le nombre de parts."), 45, [
      ph(T1, "10 min", "Six dictionnaires à 17,85 € : combien en tout ? Le schéma : six cases égales."),
      ph(T2, "25 min", "Des problèmes où l'on cherche le tout, une part, le nombre de parts ; le schéma, puis l'opération.", QUATRE_PHASES),
      ph(T3, "10 min", "Ce qu'on retient : le tout, c'est le nombre de parts fois la valeur d'une part."),
    ]),
    seance("Fois plus, fois moins", sauront("comprendre « fois plus » et « fois moins », et les distinguer de « de plus » et « de moins »."), 45, [
      ph(T1, "10 min", "« 3 fois plus cher » et « 3 € de plus » : la même chose ?"),
      ph(T2, "25 min", "Des barres : celle du casque, celle de la trottinette faite de quatre barres du casque ; des problèmes en une étape."),
      ph(T3, "10 min", "Ce qu'on retient : « fois plus » se calcule par une multiplication, « fois moins » par une division."),
    ]),
    seance("Comparer en deux étapes", sauront("résoudre un problème de comparaison multiplicative en deux étapes."), 30, [
      ph(T2, "25 min", "La trottinette et le casque : combien pour les deux ? Le schéma montre les cinq barres.", REGULER),
      ph(T3, "5 min", "On compare les schémas."),
    ]),
    evaluation("résoudre des problèmes de parts égales et de comparaison multiplicative", "Ensuite, des problèmes qui mêlent les opérations."),
  ],
};

const MIXTES_CM1: Demarche = {
  id: "problemes-mixtes-cm1", nom: "Problèmes mixtes en deux ou trois étapes (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes qui engagent additions, soustractions, multiplications et divisions, comme celui du programme : trois pains aux raisins de 210 g chacun et deux bouteilles d'eau de 1,6 kg chacune — quelle masse en tout ? On y croise les grandeurs et leurs unités.",
  seances: [
    seance("Plusieurs opérations", sauront("résoudre un problème qui demande des multiplications puis une addition."), 45, [
      ph(T1, "10 min", "Les pains et les bouteilles : par quoi commencer ? Et les unités ?"),
      ph(T2, "25 min", "Écrire les étapes, chacune avec son unité ; convertir quand il le faut.", QUATRE_PHASES),
      ph(T3, "10 min", "Ce qu'on retient : une étape, une question, un calcul, une unité."),
    ]),
    seance("Des achats", sauront("résoudre un problème d'achats en trois étapes : les prix, le total, la monnaie rendue."), 45, [
      ph(T2, "35 min", "Des cahiers et des stylos, un billet : combien dépense-t-on, combien rend-on ?", REGULER),
      ph(T3, "10 min", "On garde un problème type au cahier."),
    ]),
    evaluation("résoudre des problèmes mixtes en deux ou trois étapes", "Ensuite, ces problèmes chaque semaine, avec des grandeurs variées."),
  ],
};

const DENOMBRER_CM1: Demarche = {
  id: "denombrer-optimiser-cm1", nom: "Dénombrer, optimiser : des problèmes à chercher (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes de dénombrement qui ne se résolvent pas d'une seule opération : présenter les éléments pour les compter tous, une seule fois — un tableau, un arbre, une liste organisée : habiller un ours en peluche avec six tee-shirts et trois pantalons, les sommes de deux dés, les dominos de 0 à 4. Et des problèmes d'optimisation, où l'on cherche la meilleure solution parmi plusieurs qui respectent plusieurs contraintes : avec 10 fils, 48 perles blanches, 47 vertes et 25 rouges, combien de bracelets au plus, s'il en faut 5, 6 et 3 par bracelet ?",
  seances: [
    seance("Un tableau, un arbre", sauront("dénombrer les façons d'associer deux choix avec un tableau ou un arbre."), 45, [
      ph(T1, "10 min", "L'ours, les tee-shirts, les pantalons : combien de tenues ? Chacun cherche à sa façon."),
      ph(T2, "25 min", "Comparer les recherches : celles qui oublient, celles qui comptent deux fois ; le tableau et l'arbre."),
      ph(T3, "10 min", "Ce qu'on retient : j'organise ma recherche pour tout trouver, une seule fois."),
    ]),
    seance("Une liste organisée", sauront("dresser une liste organisée : les sommes de deux dés, les dominos."), 45, [
      ph(T2, "35 min", "Les sommes de deux dés dans un tableau à double entrée ; les dominos, en commençant par ceux qui ont 0, puis 1, sans redire."),
      ph(T3, "10 min", "Ce qu'on retient : une liste dans un ordre choisi évite les doublons."),
    ]),
    seance("Optimiser", sauront("trouver le plus grand nombre possible quand plusieurs contraintes s'imposent."), 45, [
      ph(T1, "10 min", "Les bracelets : 10 fils en permettent 10, les perles blanches 9, les vertes 7, les rouges 8. Combien en tout ?"),
      ph(T2, "25 min", "Des bracelets, des gâteaux et leurs provisions, des boîtes à remplir : ce que permet chaque contrainte, puis le plus petit nombre ; et quand il faut tout ranger, une boîte de plus pour le reste."),
      ph(T3, "10 min", "Ce qu'on retient : c'est la contrainte la plus forte qui décide."),
    ]),
    evaluation("dénombrer en organisant sa recherche, et optimiser", "Ensuite, au CM2, les recherches de toutes les solutions, qui préparent aux algorithmes."),
  ],
};

const ADDITIFS_CM2: Demarche = {
  id: "problemes-additifs-cm2", nom: "Problèmes additifs en une ou plusieurs étapes (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes additifs en une ou plusieurs étapes, avec un schéma en barres ou un déplacement sur un axe. Les exemples de réussite : un reblochon à 9 €, du beaufort à 13,85 € et un camembert, un billet de 50 € et 21,45 € rendus — le prix du camembert ? ; ce qu'on avait en partant, après 40 € retirés et un rôti à 17,80 € ; la part de pizza qu'on garde après en avoir donné cinq douzièmes et un quart ; « Léo et Lucie ont 43,40 € à eux deux, Lucie a 7,80 € de plus » : combien chacun ?",
  seances: [
    seance("Une étape, puis plusieurs", sauront("résoudre des problèmes additifs en une ou plusieurs étapes, avec un schéma."), 45, [
      ph(T1, "10 min", "Les fromages : redire l'histoire ; que sait-on, que cherche-t-on ?"),
      ph(T2, "25 min", "Des problèmes parties-tout, de comparaison, en plusieurs étapes ; un schéma en barres, ou un axe quand l'histoire se déroule dans le temps.", QUATRE_PHASES),
      ph(T3, "10 min", "Ce qu'on retient : le schéma montre ce que je connais et ce que je cherche."),
    ]),
    seance("S'entraîner", sauront("résoudre seuls des problèmes additifs variés."), 30, [
      ph(T4, "25 min", "Des problèmes mêlés : des décimaux, des fractions, le total et l'écart de deux nombres.", REGULER),
      ph(T3, "5 min", "On compare deux démarches."),
    ]),
    evaluation("résoudre des problèmes additifs en une ou plusieurs étapes", "Ensuite, au moins dix problèmes par semaine."),
  ],
};

const MULTIPLICATIFS_CM2: Demarche = {
  id: "problemes-multiplicatifs-cm2", nom: "Problèmes multiplicatifs et comparaison multiplicative (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes multiplicatifs de type parties-tout en une étape, sur un champ numérique plus étendu qu'au CM1 : la valeur d'une part — six dictionnaires payés 73,20 € —, et le nombre de parts quand une part vaut au plus 10 — des sandwichs à 7 € pour une recette de 2 611 €. Et des problèmes de comparaison multiplicative en plusieurs étapes : une trottinette quatre fois plus chère que le casque, 161,25 € pour les deux — combien coûte la trottinette ?",
  seances: [
    seance("Parts égales", sauront("résoudre des problèmes de parts égales avec des décimaux et de grands nombres."), 45, [
      ph(T2, "35 min", "Chercher le tout, une part, le nombre de parts ; le schéma, l'opération, la phrase.", QUATRE_PHASES),
      ph(T3, "10 min", "Le lien entre multiplication et division, rappelé."),
    ]),
    seance("Fois plus, fois moins", sauront("résoudre des problèmes de comparaison multiplicative en une ou plusieurs étapes."), 45, [
      ph(T2, "35 min", "Des barres qui se répètent : la trottinette, c'est quatre barres du casque, et les deux ensemble cinq barres ; « 4 fois plus » et « 4 de plus » distingués.", REGULER),
      ph(T3, "10 min", "Ce qu'on retient : fois plus, je multiplie ; fois moins, je divise ; et le schéma dit en combien de parts égales partager."),
    ]),
    evaluation("résoudre des problèmes multiplicatifs et de comparaison multiplicative", "Ensuite, des problèmes mixtes en plusieurs étapes."),
  ],
};

const MIXTES_CM2: Demarche = {
  id: "problemes-mixtes-cm2", nom: "Problèmes mixtes en plusieurs étapes (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes en plusieurs étapes qui mêlent les quatre opérations, comme celui du programme : trois pains aux raisins à 1,35 € l'un et sept chaussons aux pommes, un billet de 20 € et 7,90 € rendus — quel est le prix d'un chausson ?",
  seances: [
    seance("Les étapes d'un problème", sauront("organiser la résolution d'un problème en plusieurs étapes."), 45, [
      ph(T2, "35 min", "Chaque étape : sa question, son calcul, son unité ; des achats, des masses, des prix à retrouver.", QUATRE_PHASES),
      ph(T3, "10 min", "Un problème type, gardé au cahier."),
    ]),
    seance("S'entraîner", sauront("résoudre seuls des problèmes mixtes."), 30, [
      ph(T4, "25 min", "Des problèmes mêlés.", REGULER),
      ph(T3, "5 min", "On compare les démarches."),
    ]),
    evaluation("résoudre des problèmes mixtes en plusieurs étapes", "Ensuite, des problèmes chaque semaine."),
  ],
};

const CHERCHER_CM2: Demarche = {
  id: "chercher-cm2", nom: "Dénombrer, optimiser, chercher toutes les solutions (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des problèmes de dénombrement — une pièce lancée trois fois de suite, des dominos de 0 à 6 —, d'optimisation — combien d'étagères au plus avec 6 planches de 5 m, 40 équerres et 120 vis, s'il faut une planche de 2 m, 2 équerres et 9 vis par étagère ? — et des problèmes qui préparent aux algorithmes : chercher toutes les solutions qui vérifient des conditions, en organisant sa recherche pour n'en oublier aucune — les rectangles d'aire 60 cm² aux côtés entiers, 100 œufs à ranger dans des boîtes de 6 et de 10, des groupes d'un nombre impair d'élèves dans une classe de 30.",
  seances: [
    seance("Dénombrer", sauront("dénombrer avec un tableau, un arbre ou une liste organisée."), 45, [
      ph(T2, "35 min", "La pièce lancée trois fois, un arbre ; les dominos jusqu'à 6, une liste organisée ; des menus à composer."),
      ph(T3, "10 min", "Ce qu'on retient : un ordre choisi, pour tout trouver une seule fois."),
    ]),
    seance("Optimiser", sauront("trouver le plus grand nombre possible quand plusieurs contraintes s'imposent."), 30, [
      ph(T2, "25 min", "Les étagères : ce que permettent les planches, les équerres, les vis ; des gâteaux et leurs provisions, des boîtes à remplir."),
      ph(T3, "5 min", "C'est la contrainte la plus forte qui décide."),
    ]),
    seance("Toutes les solutions", sauront("chercher toutes les solutions d'un problème, en essayant tous les cas dans l'ordre."), 45, [
      ph(T1, "10 min", "Les rectangles d'aire 60 cm² : en connaît-on un ? deux ? Tous ?"),
      ph(T2, "25 min", "Essayer toutes les largeurs dans l'ordre ; les boîtes de 6 et de 10 ; les groupes impairs ; on note chaque essai.", "On prépare ainsi les algorithmes : une méthode qui essaie tous les cas sans en oublier."),
      ph(T3, "10 min", "Ce qu'on retient : je sais que j'ai tout trouvé parce que j'ai essayé tous les cas."),
    ]),
    evaluation("dénombrer, optimiser et chercher toutes les solutions", "Ensuite, en sixième, les algorithmes avec un logiciel de programmation."),
  ],
};

// ── L'algèbre ────────────────────────────────────────────────────────────

/** La séquence du livret du CM1 : « Initiation au raisonnement algébrique ». */
const ALGEBRE_CM1: Demarche = {
  id: "algebre-cm1", nom: "Initiation au raisonnement algébrique : enveloppes et balances (CM1)", famille: "Mathématiques",
  source: "Livret d'accompagnement de mathématiques du CM1 (Éduscol, 2026), proposition de séquence n° 2 « Initiation au raisonnement algébrique »",
  resume: "La séquence du livret : trouver la valeur d'un nombre inconnu. Avec des cartes et des enveloppes, puis une balance à plateaux, on distingue les situations du champ additif de celles du champ multiplicatif, et l'on écrit deux égalités : celle de la situation, 42 = 17 + 25, et celle du calcul, 42 − 17 = 25. Puis les situations qui combinent les deux, dont les étapes de résolution sont enseignées explicitement : retirer la même masse de chaque côté, puis partager. Enfin d'autres contextes, des prix, des contenances.",
  seances: [
    seance("Des cartes et des enveloppes (focus 1 du livret)", sauront("trouver le nombre de cartes d'une enveloppe et associer chaque situation à son opération."), 40, [
      ph(T1, "15 min", "Marion a 27 cartes, Azaria 3 enveloppes qui en contiennent autant : combien par enveloppe ? Deux ou trois minutes sur l'ardoise ; on ouvre les enveloppes pour vérifier. L'enseignant écrit 27 = 3 × 9 et 27 ÷ 3 = 9. Puis Théo, une enveloppe et 17 cartes, et Léa, 42 cartes : 42 = 17 + 25 et 42 − 17 = 25.",
        "Des items volontairement simples : le retour porte sur l'opération et sa verbalisation, pas sur la réponse."),
      ph(T2, "15 min", "Des problèmes semblables, projetés un par un, deux minutes chacun sur l'ardoise, corrigés à mesure ; puis deux dans les cahiers. L'opération à retrouver compte plus que le résultat."),
      ph(T3, "10 min", "La trace écrite garde les deux situations et leurs égalités : une seule quantité inconnue répétée, on divise ; ajoutée à des cartes connues, on soustrait."),
    ]),
    seance("S'entraîner (et plus si besoin)", sauront("associer chaque situation à son opération, en le disant."), 15, [
      ph(T4, "15 min", "Deux items sur l'ardoise, l'un multiplicatif, l'autre additif ; puis une série dans les cahiers — « 36 cartes, c'est 4 enveloppes », « 1 enveloppe et 18 cartes, c'est 37 cartes »… —, une table d'appui pour qui en a besoin. Dix minutes les fois suivantes.",
        "La verbalisation, en appui sur la trace écrite, fait le lien vers l'automatisation : on y revient tant que les élèves n'associent pas situations et opérations."),
    ]),
    seance("La balance à plateaux", sauront("lire une balance à l'équilibre comme une égalité et trouver la masse d'une boîte mystère."), 30, [
      ph(T1, "10 min", "Sept boîtes mystère identiques font l'équilibre avec 91 g : peut-on trouver la masse d'une boîte ? « C'est comme les enveloppes et les cartes. » Puis une boîte et 8 g contre 32 g."),
      ph(T2, "15 min", "Des situations semblables sur feuille ; une balance de Roberval, des cubes emboîtables et des boîtes mystère pour qui a besoin de manipuler : si j'ajoute 5 cubes sur ce plateau, que faire pour garder l'équilibre ?"),
      ph(T3, "5 min", "Le retour porte sur le choix des opérations plus que sur les erreurs de calcul ; la balance devient la situation de référence des égalités."),
    ]),
    seance("Des situations qui combinent (focus 2 du livret)", sauront("résoudre une situation qui combine champ additif et champ multiplicatif, étape par étape."), 40, [
      ph(T1, "10 min", "Deux énoncés de la séance 3 rappelés. Puis : d'un côté 900 g, de l'autre deux boîtes mystère et 600 g — quelle est la masse d'une boîte ? On retire d'abord 600 g de chaque côté, puis on partage."),
      ph(T2, "20 min", "D'abord très guidés, puis en autonomie : 80 g et 2 boîtes contre 200 g ; 925 g et 10 boîtes contre 2 725 g ; 670 g contre 250 g et 7 boîtes ; 228 g et 5 boîtes contre 478 g."),
      ph(T3, "10 min", "L'affichage construit avec les élèves : 1) je retire la même masse de chaque côté pour garder l'équilibre ; 2) je divise la masse restante par le nombre de boîtes. L'item le plus difficile est repris, étape par étape."),
    ]),
    seance("S'entraîner : des QCM (et plus si besoin)", sauront("choisir la bonne réponse et la justifier."), 10, [
      ph(T4, "10 min", "Des items en QCM projetés l'un après l'autre, avec un temps pour la verbalisation : chacun justifie son choix."),
    ]),
    seance("D'autres contextes", sauront("trouver un nombre inconnu dans des problèmes de prix et de contenances."), 40, [
      ph(T2, "30 min", "Des prix, des contenances : chacun fait le lien avec les enveloppes et les balances ; l'enseignant mime l'égalité, ses mains en guise de plateaux, et veille à la grandeur en jeu — le prix de la banane, pas sa masse."),
      ph(T3, "10 min", "Ces items reviennent, espacés : après la séance 5, quinze jours plus tard, un mois, puis deux mois plus tard."),
    ]),
  ],
};

const EGALITES_CM1: Demarche = {
  id: "egalites-programmes-cm1", nom: "Égalités à trou et programmes de calcul (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Le signe = n'est pas seulement entre une opération et son résultat : il relie deux expressions égales. Les exemples de réussite, de tête : 347 = 20 + … ; 5 760 − … = 5 360 ; 2 × 137 × 5 = 137 × … ; 144 + 7 = 142 + … ; et à l'écrit : 748 + … = 1 200. Puis exécuter un programme de calcul de deux étapes au plus — choisir un nombre, ajouter 2, multiplier par 4 —, qu'on peut coder dans Scratch ou un tableur pour vérifier.",
  seances: [
    seance("Le signe égal", sauront("trouver le nombre manquant d'une égalité, en regardant les deux côtés."), 45, [
      ph(T1, "10 min", "144 + 7 = 142 + … : beaucoup écrivent 151. Les deux côtés valent-ils autant ?"),
      ph(T2, "25 min", "Des égalités à trou, de tête puis à l'écrit ; on cherche ce qui change d'un côté à l'autre plutôt que de tout calculer."),
      ph(T3, "10 min", "Ce qu'on retient : = veut dire « vaut autant que »."),
    ]),
    seance("Un programme de calcul", sauront("exécuter un programme de calcul de deux étapes pour plusieurs nombres."), 45, [
      ph(T1, "10 min", "Choisir 5, ajouter 2, multiplier par 4 : 28. Et pour 7 ?"),
      ph(T2, "25 min", "Des programmes appliqués à plusieurs nombres, dans un tableau ; on peut les coder dans Scratch ou un tableur, en faisant apparaître les étapes, pour vérifier."),
      ph(T3, "10 min", "Ce qu'on retient : on suit les étapes dans l'ordre, chacune sur le résultat de la précédente."),
    ]),
    evaluation("trouver le nombre manquant d'une égalité et exécuter un programme de calcul", "Ensuite, au CM2, des programmes de trois étapes, et produire le sien."),
  ],
};

const SUITES_CM1: Demarche = {
  id: "suites-cm1", nom: "Suites de nombres et de motifs (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Identifier et formuler la règle d'une suite de nombres pour la poursuivre de trois termes — 3 ; 7 ; 11 ; 15 ; 4 ; 12 ; 36 ; 108 ; 80 ; 85 ; 83 ; 88 —, et accepter qu'une suite ait plusieurs règles : pour 1 ; 2 ; 6 ; 7 ; 11 ; 12 ; 16, ajouter 5 deux rangs plus loin, ou ajouter 1 puis 4. Poursuivre une suite de motifs et dire comment le nombre d'éléments d'une étape se déduit de la précédente : « trois de plus », « le numéro de l'étape de plus ».",
  seances: [
    seance("Des suites de nombres", sauront("trouver la règle d'une suite de nombres, l'écrire, et donner les trois termes suivants."), 45, [
      ph(T1, "10 min", "3 ; 7 ; 11 ; 15… et après ? Comment le sait-on ?"),
      ph(T2, "25 min", "Des suites à poursuivre : ajouter, multiplier, alterner ; on formule la règle avec des mots ; deux règles pour 1 ; 2 ; 6 ; 7 ; 11 ; 12 ; 16."),
      ph(T3, "10 min", "Ce qu'on retient : une règle se vérifie sur tous les termes donnés."),
    ]),
    seance("Des suites de motifs", sauront("poursuivre une suite de motifs et prévoir le nombre d'éléments des étapes suivantes."), 45, [
      ph(T1, "10 min", "Trois étapes dessinées : combien de carrés à l'étape 4 ? On la dessine pour vérifier."),
      ph(T2, "25 min", "Des motifs qui grandissent ; on écrit le nombre d'éléments de chaque étape, et ce qui s'ajoute."),
      ph(T3, "10 min", "Ce qu'on retient : je cherche ce qui change d'une étape à la suivante."),
    ]),
    evaluation("poursuivre des suites de nombres et de motifs", "Ensuite, au CM2, le nombre d'éléments d'une étape lointaine."),
  ],
};

const ALGEBRE_CM2: Demarche = {
  id: "algebre-cm2", nom: "Problèmes algébriques : balances et nombres inconnus (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des nombres inconnus représentés par des lettres ou des symboles : des balances à l'équilibre, et deux pesées pour deux objets inconnus — des paires de ciseaux et des crayons. Puis des relations entre plusieurs inconnues, avec un schéma en barres : 179 billes rouges, vertes et bleues, quatre fois plus de rouges que de vertes et 17 vertes de moins que de bleues — combien de chaque couleur ?",
  seances: [
    seance("Des balances", sauront("trouver la masse d'un objet à partir d'une ou de deux balances à l'équilibre."), 45, [
      ph(T2, "35 min", "Retirer la même masse des deux côtés, puis partager ; deux pesées : d'une balance à l'autre, seuls des crayons ont changé, et la différence des masses dit leur masse."),
      ph(T3, "10 min", "Ce qu'on retient : l'équilibre se garde si l'on fait la même chose des deux côtés."),
    ]),
    seance("Des inconnues reliées", sauront("trouver des nombres inconnus avec un schéma en barres, en défaisant les calculs."), 45, [
      ph(T2, "35 min", "Les billes : une barre pour les vertes, quatre pour les rouges, une et 17 pour les bleues ; 179 − 17, puis le partage en six. « J'ai choisi un nombre N et calculé 3 × (2 + N) : j'ai trouvé 27. »"),
      ph(T3, "10 min", "Ce qu'on retient : le schéma relie les inconnues ; je défais les calculs dans l'ordre inverse."),
    ]),
    evaluation("trouver des nombres inconnus dans des problèmes algébriques", "Ensuite, en sixième, les premières équations."),
  ],
};

const EGALITES_CM2: Demarche = {
  id: "egalites-programmes-cm2", nom: "Égalités à trou, exécuter et produire un programme de calcul (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Des égalités à trou dont les membres ont au plus deux opérations — (2 × …) − 5 = 23 ; 8 + (2 × …) = 11 ; 144 + 237 = … + 239 — ; exécuter un programme de calcul de trois étapes au plus — ajouter 2, multiplier par 4, retirer 3 —, et en produire un.",
  seances: [
    seance("Des égalités à deux opérations", sauront("trouver le nombre manquant d'une égalité dont un membre a deux opérations."), 45, [
      ph(T2, "35 min", "Des égalités à trou, de tête puis à l'écrit ; on raisonne sur les deux côtés et les propriétés des opérations."),
      ph(T3, "10 min", "Ce qu'on retient : = veut dire « vaut autant que »."),
    ]),
    seance("Exécuter, produire", sauront("exécuter un programme de calcul de trois étapes, et en écrire un."), 45, [
      ph(T2, "35 min", "Des programmes appliqués à des nombres, dans un tableau ; chacun écrit un programme qui mène d'un nombre à un autre, et le fait exécuter par son voisin ; Scratch ou un tableur pour vérifier."),
      ph(T3, "10 min", "Ce qu'on retient : un programme, c'est des étapes dans un ordre ; changer l'ordre change le résultat."),
    ]),
    evaluation("trouver le nombre manquant et utiliser des programmes de calcul", "Ensuite, des programmes codés dans Scratch."),
  ],
};

const SUITES_CM2: Demarche = {
  id: "suites-cm2", nom: "Suites de nombres et de motifs : une étape lointaine (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Poursuivre des suites de nombres aux règles plus complexes — 3 ; 7 ; 12 ; 18 ; 7 ; 12 ; 22 ; 42 ; 7 ; 15 ; 31 ; 63 ; 127, où l'on prend le double et ajoute 1, ou ajoute 8, puis 16, puis 32 — ; trouver un terme lointain quand on ajoute toujours le même nombre — le 100e de 5 ; 8 ; 11 ; 14, c'est 2 + 100 × 3 = 302 — ; et le nombre d'éléments d'une suite de motifs pour une étape donnée, en le reliant au rang de l'étape.",
  seances: [
    seance("Des règles plus complexes", sauront("trouver la règle d'une suite et la poursuivre."), 45, [
      ph(T2, "35 min", "Des suites où l'on ajoute, multiplie, alterne, et où l'on fait deux calculs : le double, plus 1 ; deux règles pour 7 ; 15 ; 31 ; 63."),
      ph(T3, "10 min", "Ce qu'on retient : je vérifie ma règle sur tous les termes."),
    ]),
    seance("Une étape lointaine", sauront("trouver un terme de rang éloigné et le nombre d'éléments à l'étape 10 d'une suite de motifs, sans tout dessiner."), 45, [
      ph(T1, "10 min", "Le 100e nombre de 5 ; 8 ; 11 ; 14 ; 17 : un tableau, la place et la valeur, 2 + 1 × 3, 2 + 2 × 3…"),
      ph(T2, "25 min", "Des suites et des motifs : relier le numéro de l'étape au nombre d'éléments."),
      ph(T3, "10 min", "Ce qu'on retient : je cherche le lien entre le rang et le nombre d'éléments."),
    ]),
    evaluation("poursuivre des suites et trouver le nombre d'éléments d'une étape donnée", "Ensuite, en sixième, les expressions littérales."),
  ],
};

// ── La proportionnalité ──────────────────────────────────────────────────

const PROPORTIONNALITE_CM1: Demarche = {
  id: "proportionnalite-cm1", nom: "Reconnaître et résoudre des problèmes de proportionnalité (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dire et justifier si deux grandeurs sont proportionnelles — « à quarante ans, on n'est pas deux fois plus grand qu'à vingt ans » ; « s'il y a trois fois plus de manuels dans la pile, elle est trois fois plus lourde » — ; puis résoudre un problème en utilisant une seule fois la linéarité pour la multiplication : cinq manuels identiques pèsent 2 kg, combien en pèsent quinze ? 400 g de cerises coûtent 7 €, combien coûtent 200 g ? Et le dire : « si j'achète deux fois moins de cerises, cela coûte deux fois moins cher ».",
  seances: [
    seance("Proportionnelles ou non ?", sauront("dire si deux grandeurs sont proportionnelles, et le justifier."), 45, [
      ph(T1, "10 min", "À quarante ans, est-on deux fois plus grand qu'à vingt ans ?"),
      ph(T2, "25 min", "Des situations à trier : proportionnelles ou non ; chacun justifie par « deux fois plus de…, deux fois plus de… »."),
      ph(T3, "10 min", "Ce qu'on retient : deux grandeurs sont proportionnelles quand, si l'une est multipliée par un nombre, l'autre l'est aussi."),
    ]),
    seance("Deux fois plus, trois fois moins", sauront("résoudre un problème de proportionnalité en multipliant ou en divisant une seule fois."), 45, [
      ph(T1, "10 min", "Cinq manuels pèsent 2 kg ; et quinze ? « Quinze manuels, c'est trois fois plus que cinq : la pile est trois fois plus lourde. »"),
      ph(T2, "25 min", "Des manuels, des cerises au poids, des crêpes, des allumettes bout à bout : on dit chaque fois la phrase qui justifie."),
      ph(T3, "10 min", "La trace écrite : la phrase type, avec un exemple."),
    ]),
    evaluation("reconnaître une situation de proportionnalité et résoudre un problème en une étape", "Ensuite, au CM2, la séquence du livret : des problèmes en deux étapes."),
  ],
};

/** La séquence du livret du CM2 : « Résoudre un problème de proportionnalité ». */
const PROPORTIONNALITE_CM2: Demarche = {
  id: "proportionnalite-cm2", nom: "Résoudre un problème de proportionnalité (CM2)", famille: "Mathématiques",
  source: "Livret d'accompagnement de mathématiques du CM2 (Éduscol, 2026), proposition de séquence n° 2 « Résoudre un problème de proportionnalité »",
  resume: "La séquence du livret, centrée sur des problèmes qu'on résout de tête ou par écrit selon les nombres : réactiver la linéarité multiplicative du CM1, l'utiliser deux fois quand les nombres ne sont pas multiples l'un de l'autre — 6 cubes pèsent 16 kg, combien en pèsent 15 ? —, découvrir la linéarité additive avec un schéma en barres — 4 écharpes coûtent 52 €, 9 en coûtent 117 €, et 13 ? —, puis combiner les deux procédures en choisissant selon les nombres. Le programme ajoute le passage par l'unité, quand aucune relation simple n'apparaît : 3 plaques de carton font 24 mm, et 5 plaques ?",
  seances: [
    seance("Réactiver les acquis du CM1", sauront("résoudre un problème de proportionnalité en utilisant une fois la linéarité multiplicative."), 25, [
      ph(T2, "20 min", "Des énoncés projetés l'un après l'autre, la réponse sur l'ardoise : les crêpes — 5 œufs pour 6 personnes, et pour 12 ? —, 200 g de cerises à 3 €, la farine pour 6 personnes quand il en faut 800 g pour 12, Léa qui roule 3 km en 10 minutes, les allumettes, la carte. Après chaque énoncé, la phrase imposée : « 12 personnes, c'est 2 fois plus que 6 personnes ; il faudra donc 2 fois plus d'œufs, 10 œufs. »",
        "Des nombres très simples, pour se centrer sur la procédure ; pas de trace écrite : la séance est faite de verbalisation."),
      ph(T3, "5 min", "On redit la phrase type."),
    ]),
    seance("Deux étapes, la linéarité multiplicative (focus 1 du livret)", sauront("résoudre un problème de proportionnalité en deux étapes quand les nombres ne sont pas multiples l'un de l'autre."), 40, [
      ph(T1, "10 min", "6 cubes identiques pèsent 16 kg : combien pèsent 15 de ces cubes ? Chacun cherche seul, sans aide ni calculatrice."),
      ph(T2, "20 min", "Le retour : « 15 cubes, c'est combien de fois plus que 6 ? Cela ne se fait pas en une étape. » On passe par 3 cubes, deux fois moins, puis cinq fois plus ; la trace écrite garde chaque étape, avec des caches pour d'autres problèmes. Puis, l'un après l'autre : 6 puzzles à 150 €, et 15 ? ; 22 porte-clés à 99 €, et 33 ? ; 140 sucettes pour 35 €, combien pour 15 € ?",
        "Pour qui en a besoin, des cadres qui matérialisent les étapes de la résolution."),
      ph(T3, "10 min", "Le bilan : des retours sur l'application de la procédure."),
    ]),
    seance("Consolider (et plus si besoin)", sauront("résoudre des problèmes de proportionnalité en deux étapes dans des contextes variés."), 20, [
      ph(T4, "20 min", "Des énoncés proches de la séance 2, dans les cahiers ; la verbalisation, en appui sur la trace écrite et ses caches, à chaque retour. Selon les besoins : le nombre de problèmes, les nombres, l'autonomie."),
    ]),
    seance("La linéarité additive (focus 2 du livret)", sauront("résoudre un problème de proportionnalité en ajoutant deux quantités connues."), 40, [
      ph(T1, "10 min", "Des écharpes toutes au même prix : 4 coûtent 52 €, 9 coûtent 117 €. Et 13 ? L'enseignant annonce une nouvelle procédure."),
      ph(T2, "20 min", "Le schéma en barres : 13 écharpes, c'est 4 écharpes et 9 écharpes, donc 52 € et 117 €, les unités dans les calculs. Puis les tours de cubes emboîtables : 6 cubes font 9 cm, 20 cubes 30 cm ; et 26, 14, 46, 32 cubes ? « Je connais pour 20, je connais pour 6, je dois atteindre 46 : comment faire ? »"),
      ph(T3, "10 min", "Le retour s'appuie sur le schéma, qui reste affiché. Une séance 4 bis de 15 minutes, avec des énoncés proches, suit."),
    ]),
    seance("Combiner les deux procédures", sauront("résoudre un problème en deux étapes en choisissant et en combinant les procédures selon les nombres."), 40, [
      ph(T1, "10 min", "10 pots de riz au lait coûtent 22 € ; et 15 pots ? 5 pots, deux fois moins : 11 € ; puis 15 pots, trois fois plus que 5 — ou 10 pots et 5 pots : 33 €."),
      ph(T2, "25 min", "20 tubes de dentifrice à 35 €, et 24 ? ; 20 tasses à 44 €, et 15 ? ; une voiture qui consomme 16 L pour 200 km, et pour 250 km ? ; un camion, 24 L pour 200 km, et pour 150 km ?",
        "Selon les élèves : aucun étayage ; les étapes données — « tu commences par diviser…, puis tu additionnes… » — ; ou les deux combinaisons imposées."),
      ph(T3, "5 min", "Ce qu'on retient : je choisis la procédure selon les nombres de l'énoncé, sans chercher forcément la valeur d'un seul objet."),
    ]),
    seance("Automatiser (et plus si besoin)", sauront("résoudre vite des problèmes de proportionnalité à deux étapes."), 15, [
      ph(T4, "15 min", "Selon les problèmes : sur l'ardoise comme à la séance 1, ou dans les cahiers comme à la séance 3. Ces séances reviennent, espacées : après la séance 5, quinze jours plus tard, un mois, deux mois. Pour aller plus loin, dix minutes pour trouver le plus de prix possibles d'écharpes."),
    ]),
  ],
};

export const DEMARCHES_PROBLEMES_CM: Demarche[] = [
  ADDITIFS_CM1, ETAPES_CM1, MULTIPLICATIFS_CM1, MIXTES_CM1, DENOMBRER_CM1,
  ADDITIFS_CM2, MULTIPLICATIFS_CM2, MIXTES_CM2, CHERCHER_CM2,
  ALGEBRE_CM1, EGALITES_CM1, SUITES_CM1, ALGEBRE_CM2, EGALITES_CM2, SUITES_CM2,
  PROPORTIONNALITE_CM1, PROPORTIONNALITE_CM2,
];

/** La séquence d'une compétence de problèmes, d'algèbre ou de proportionnalité du cours moyen ; rien sinon. En minuscules sans accents. */
export function demarcheDesProblemesCM(classe: string, cg: string, comp: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  const cm1 = classe === "cm1";
  if (/proportionnalite/.test(cg)) return cm1 ? "proportionnalite-cm1" : "proportionnalite-cm2";
  if (/algebre/.test(cg)) {
    if (/suite/.test(comp)) return cm1 ? "suites-cm1" : "suites-cm2";
    if (/egalite a trou|programme de calcul/.test(comp)) return cm1 ? "egalites-programmes-cm1" : "egalites-programmes-cm2";
    return cm1 ? "algebre-cm1" : "algebre-cm2";
  }
  if (/resolution de problemes/.test(cg)) {
    if (/denombrement|optimisation|algorithmes/.test(comp)) return cm1 ? "denombrer-optimiser-cm1" : "chercher-cm2";
    if (/mixtes/.test(comp)) return cm1 ? "problemes-mixtes-cm1" : "problemes-mixtes-cm2";
    if (/multiplicati/.test(comp)) return cm1 ? "problemes-multiplicatifs-cm1" : "problemes-multiplicatifs-cm2";
    if (cm1 && /deux ou trois etapes/.test(comp)) return "problemes-etapes-cm1";
    if (/additifs/.test(comp)) return cm1 ? "problemes-additifs-cm1" : "problemes-additifs-cm2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** L'atelier de Fabriquer le plus proche d'une feuille : les problèmes partie-tout, multiplicatifs, ou la résolution pas à pas. */
const ADDITIVES: SorteProblemeCM[] = ["partie-tout", "comparaison", "deux-etapes", "comparaison-deux-etapes"];
const atelierDesProblemes = (sortes: SorteProblemeCM[]) =>
  sortes.every((s) => ADDITIVES.includes(s)) ? "partieTout"
    : sortes.every((s) => s === "parts-egales" || s === "comparaison-multiplicative" || s.includes("proportionnalite")) ? "multiplicatifs"
      : "resolution";
/** Les égalités, les programmes et les suites relèvent du calcul ; les nombres inconnus, de la résolution pas à pas. */
const atelierDeLAlgebre = (exercices: ExerciceAlgebre[]) =>
  exercices.every((e) => e === "egalites" || e === "programme" || e === "suite-nombres" || e === "suite-motifs") ? "martiniere" : "resolution";

const problemes = (seance: number, titre: string, r: Partial<ReglagesProblemesCM> & { sortes: SorteProblemeCM[] }): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_PROBLEMES_CM, ...r, titre };
  return { seance, atelier: atelierDesProblemes(r.sortes), titre, fabriquer: (g) => ({ html: htmlProblemesCM(reglages, g), style: STYLE_FEUILLE + STYLE_PROBLEMES_CM }) };
};
const algebre = (seance: number, titre: string, r: Partial<ReglagesAlgebre> & { exercices: ExerciceAlgebre[] }): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ALGEBRE, ...r, titre };
  return { seance, atelier: atelierDeLAlgebre(r.exercices), titre, fabriquer: (g) => ({ html: htmlAlgebre(reglages, g), style: STYLE_FEUILLE + STYLE_ALGEBRE }) };
};
const CM1 = { classe: "CM1" as const };
const CM2 = { classe: "CM2" as const };

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "problemes-additifs-cm1": {
    feuilles: [
      problemes(0, "Problèmes parties-tout", { ...CM1, sortes: ["partie-tout"], combien: 3 }),
      problemes(1, "Problèmes de comparaison", { ...CM1, sortes: ["comparaison"], combien: 3 }),
      problemes(2, "Problèmes additifs — entraînement", { ...CM1, sortes: ["partie-tout", "comparaison"], combien: 3 }),
      problemes(3, "Problèmes additifs — évaluation", { ...CM1, sortes: ["comparaison", "partie-tout"], combien: 4 }),
    ],
    materiel: ["Les ardoises ; une affiche du schéma en barres", "Deux bandes de papier pour figurer l'écart", "Les ardoises, pour les problèmes à l'oral", "Les énoncés"],
  },
  "problemes-etapes-cm1": {
    feuilles: [
      problemes(0, "Problèmes en deux étapes", { ...CM1, sortes: ["deux-etapes"], combien: 3 }),
      problemes(1, "Comparer en deux étapes", { ...CM1, sortes: ["comparaison-deux-etapes"], combien: 3 }),
      problemes(2, "Problèmes en plusieurs étapes — entraînement", { ...CM1, sortes: ["deux-etapes", "comparaison-deux-etapes"], combien: 3 }),
      problemes(3, "Problèmes en plusieurs étapes — évaluation", { ...CM1, sortes: ["comparaison-deux-etapes", "deux-etapes"], combien: 4 }),
    ],
    materiel: ["Les ardoises", "Le schéma en barres, affiché", "Le cahier", "Les énoncés"],
  },
  "problemes-multiplicatifs-cm1": {
    feuilles: [
      problemes(0, "Problèmes de parts égales", { ...CM1, sortes: ["parts-egales"], combien: 3 }),
      problemes(1, "Fois plus, fois moins", { ...CM1, sortes: ["comparaison-multiplicative"], combien: 3 }),
      problemes(2, "Comparer en deux étapes", { ...CM1, sortes: ["comparaison-multiplicative"], combien: 3 }),
      problemes(3, "Problèmes multiplicatifs — évaluation", { ...CM1, sortes: ["parts-egales", "comparaison-multiplicative"], combien: 4 }),
    ],
    materiel: ["Les tables de multiplication", "Des bandes de papier de même longueur", "Le cahier", "Les énoncés"],
  },
  "problemes-mixtes-cm1": {
    feuilles: [
      problemes(0, "Problèmes mixtes", { ...CM1, sortes: ["mixte"], combien: 3 }),
      problemes(1, "Des achats", { ...CM1, sortes: ["mixte"], combien: 3 }),
      problemes(2, "Problèmes mixtes — évaluation", { ...CM1, sortes: ["mixte"], combien: 4 }),
    ],
    materiel: ["Une balance, des emballages", "Des tickets de caisse", "Les énoncés"],
  },
  "denombrer-optimiser-cm1": {
    feuilles: [
      problemes(0, "Dénombrer", { ...CM1, sortes: ["denombrement"], combien: 3 }),
      problemes(1, "Une liste organisée", { ...CM1, sortes: ["denombrement"], combien: 3 }),
      problemes(2, "Optimiser", { ...CM1, sortes: ["optimisation"], combien: 3 }),
      problemes(3, "Dénombrer et optimiser — évaluation", { ...CM1, sortes: ["denombrement", "optimisation"], combien: 4 }),
    ],
    materiel: ["Des vêtements de poupée découpés, pour qui en a besoin", "Deux dés ; des dominos", "Des fils et des perles, pour qui veut essayer", "Les énoncés"],
  },
  "problemes-additifs-cm2": {
    feuilles: [
      problemes(0, "Problèmes additifs", { ...CM2, sortes: ["partie-tout", "comparaison", "deux-etapes"], combien: 3 }),
      problemes(1, "Problèmes additifs — entraînement", { ...CM2, sortes: ["comparaison-deux-etapes", "deux-etapes", "partie-tout"], combien: 3 }),
      problemes(2, "Problèmes additifs — évaluation", { ...CM2, sortes: ["deux-etapes", "comparaison", "comparaison-deux-etapes"], combien: 4 }),
    ],
    materiel: ["Les ardoises ; le schéma en barres et l'axe, affichés", "Le cahier", "Les énoncés"],
  },
  "problemes-multiplicatifs-cm2": {
    feuilles: [
      problemes(0, "Problèmes de parts égales", { ...CM2, sortes: ["parts-egales"], combien: 3 }),
      problemes(1, "Fois plus, fois moins", { ...CM2, sortes: ["comparaison-multiplicative"], combien: 3 }),
      problemes(2, "Problèmes multiplicatifs — évaluation", { ...CM2, sortes: ["parts-egales", "comparaison-multiplicative"], combien: 4 }),
    ],
    materiel: ["Les tables", "Des bandes de papier", "Les énoncés"],
  },
  "problemes-mixtes-cm2": {
    feuilles: [
      problemes(0, "Problèmes mixtes", { ...CM2, sortes: ["mixte"], combien: 3 }),
      problemes(1, "Problèmes mixtes — entraînement", { ...CM2, sortes: ["mixte"], combien: 3 }),
      problemes(2, "Problèmes mixtes — évaluation", { ...CM2, sortes: ["mixte"], combien: 4 }),
    ],
    materiel: ["Des emballages, des tickets de caisse", "Le cahier", "Les énoncés"],
  },
  "chercher-cm2": {
    feuilles: [
      problemes(0, "Dénombrer", { ...CM2, sortes: ["denombrement"], combien: 3 }),
      problemes(1, "Optimiser", { ...CM2, sortes: ["optimisation"], combien: 3 }),
      problemes(2, "Chercher toutes les solutions", { ...CM2, sortes: ["algorithme"], combien: 3 }),
      problemes(3, "Chercher — évaluation", { ...CM2, sortes: ["denombrement", "algorithme", "optimisation"], combien: 3 }),
    ],
    materiel: ["Une pièce de monnaie ; des dominos", "Les énoncés", "Du papier quadrillé, pour les rectangles", "Les énoncés"],
  },
  "algebre-cm1": {
    feuilles: [
      algebre(0, "Des cartes et des enveloppes", { ...CM1, exercices: ["enveloppes"], combien: 4 }),
      algebre(1, "Cartes et enveloppes — entraînement", { ...CM1, exercices: ["enveloppes"], combien: 6 }),
      algebre(2, "La balance à plateaux", { ...CM1, exercices: ["balance"], combien: 4 }),
      algebre(3, "Des balances qui combinent", { ...CM1, exercices: ["balance-combinee"], combien: 4 }),
      algebre(5, "D'autres contextes", { ...CM1, exercices: ["contextes"], combien: 6 }),
    ],
    materiel: [
      "Des enveloppes et des cartes, comme celles du livret ; les ardoises", "Les ardoises ; la trace écrite de la séance 1, une table d'appui",
      "Une balance de Roberval, des cubes emboîtables et des boîtes mystère identiques", "La planche de balances vierges, pour créer d'autres situations",
      "Les items en QCM, en diaporama", "Des étiquettes de prix, des bouteilles",
    ],
  },
  "egalites-programmes-cm1": {
    feuilles: [
      algebre(0, "Les égalités à trou", { ...CM1, exercices: ["egalites"], combien: 8 }),
      algebre(1, "Les programmes de calcul", { ...CM1, exercices: ["programme"], combien: 2 }),
      algebre(2, "Égalités et programmes — évaluation", { ...CM1, exercices: ["egalites", "programme"], combien: 6 }),
    ],
    materiel: ["Les ardoises", "Un ordinateur avec Scratch ou un tableur, pour vérifier", "Les énoncés"],
  },
  "suites-cm1": {
    feuilles: [
      algebre(0, "Des suites de nombres", { ...CM1, exercices: ["suite-nombres"], combien: 5 }),
      algebre(1, "Des suites de motifs", { ...CM1, exercices: ["suite-motifs"], combien: 1 }),
      algebre(2, "Les suites — évaluation", { ...CM1, exercices: ["suite-nombres", "suite-motifs"], combien: 3 }),
    ],
    materiel: ["Les ardoises", "Des carrés en papier ou des cubes, pour construire les motifs", "Les énoncés"],
  },
  "algebre-cm2": {
    feuilles: [
      algebre(0, "Des balances", { ...CM2, exercices: ["balance-combinee"], combien: 4 }),
      algebre(1, "Des inconnues reliées", { ...CM2, exercices: ["je-pense"], combien: 4 }),
      algebre(2, "Nombres inconnus — évaluation", { ...CM2, exercices: ["balance-combinee", "je-pense"], combien: 2 }),
    ],
    materiel: ["Une balance à plateaux, des objets identiques, des masses marquées", "Le schéma en barres, affiché", "Les énoncés"],
  },
  "egalites-programmes-cm2": {
    feuilles: [
      algebre(0, "Les égalités à trou", { ...CM2, exercices: ["egalites"], combien: 8 }),
      algebre(1, "Exécuter et produire un programme", { ...CM2, exercices: ["programme"], combien: 2 }),
      algebre(2, "Égalités et programmes — évaluation", { ...CM2, exercices: ["egalites", "programme"], combien: 6 }),
    ],
    materiel: ["Les ardoises", "Scratch ou un tableur", "Les énoncés"],
  },
  "suites-cm2": {
    feuilles: [
      algebre(0, "Des suites de nombres", { ...CM2, exercices: ["suite-nombres"], combien: 5 }),
      algebre(1, "Une étape lointaine", { ...CM2, exercices: ["suite-motifs"], combien: 1 }),
      algebre(2, "Les suites — évaluation", { ...CM2, exercices: ["suite-nombres", "suite-motifs"], combien: 3 }),
    ],
    materiel: ["Les ardoises", "Des carrés en papier", "Les énoncés"],
  },
  "proportionnalite-cm1": {
    feuilles: [
      problemes(0, "Proportionnelles ou non ?", { ...CM1, sortes: ["identifier-proportionnalite"], combien: 3 }),
      problemes(1, "Deux fois plus, trois fois moins", { ...CM1, sortes: ["proportionnalite"], combien: 3 }),
      problemes(2, "La proportionnalité — évaluation", { ...CM1, sortes: ["proportionnalite", "identifier-proportionnalite"], combien: 4 }),
    ],
    materiel: ["Des situations à trier, sur étiquettes", "Une pile de manuels identiques et une balance", "Les énoncés"],
  },
  "proportionnalite-cm2": {
    feuilles: [
      problemes(1, "Deux étapes : la linéarité multiplicative", { ...CM2, sortes: ["proportionnalite-deux-etapes"], combien: 3 }),
      problemes(2, "Deux étapes — consolider", { ...CM2, sortes: ["proportionnalite-deux-etapes"], combien: 3 }),
      problemes(3, "La linéarité additive", { ...CM2, sortes: ["proportionnalite-additive"], combien: 3 }),
      problemes(4, "Combiner les procédures", { ...CM2, sortes: ["proportionnalite-combinee"], combien: 3 }),
      problemes(5, "Automatiser", { ...CM2, sortes: ["proportionnalite-deux-etapes", "proportionnalite-additive", "proportionnalite-combinee"], combien: 3 }),
    ],
    materiel: [
      "Les ardoises ; les énoncés projetés", "La trace écrite et ses caches ; des cadres pour les étapes, pour qui en a besoin", "Le cahier",
      "Des cubes emboîtables, pour qui veut construire les tours", "Le cahier", "Les ardoises ou les cahiers",
    ],
  },
};

export const estUneDemarcheDesProblemesCM = (id: string) => id in PLANS;

export function planDesProblemesCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
