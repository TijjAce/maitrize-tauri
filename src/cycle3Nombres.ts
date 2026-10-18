// Les nombres au cours moyen : les entiers, les fractions, les décimaux.
//
// L'enseignant a demandé le cycle 3 (octobre 2026), comme le cycle 2 : chaque
// compétence a sa séquence, et ses feuilles. Les livrets d'accompagnement du
// CM1 et du CM2 (Éduscol, 2026) n'ont qu'une séquence sur ces notions —
// « Opérer sur des fractions : additionner et soustraire », au CM2 — ; les
// autres sont bâties, comme au cycle 2 et en le disant, sur le programme de
// mathématiques du cycle 3 (BO n° 16 du 17 avril 2025) et sur ses exemples de
// réussite (Éduscol, « Exemples pour la mise en œuvre des programmes », CM1
// et CM2, 2025), avec la démarche en quatre temps des livrets. Le matériel
// multibase et les bandes de papier restent sous la main de qui en a besoin :
// le programme le veut ainsi au cours moyen.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_FRACTIONS, STYLE_JEUX_MATHS, htmlFractions, type ReglagesFractions } from "./jeuxMaths";
import { REGLAGES_NOMBRES_CM, STYLE_NOMBRES_CM, htmlNombresCM, type ReglagesNombresCM } from "./nombresCoursMoyen";
import { REGLAGES_NUMERATION, STYLE_NUMERATION, htmlNumeration, type ReglagesNumeration } from "./numeration";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const evaluation = (quoi: string, ensuite: string, duree = 30) => seance("Évaluation", sauront(`${quoi}, seuls.`), duree, [
  ph("Évaluation", `${duree - 5} min`, `La feuille d'évaluation : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const PROGRAMME_C3 = "Bâtie sur le programme de mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025) — le livret d'accompagnement n'a pas de séquence pour cette notion — ; démarche en quatre temps des livrets";
const MANIPULER = "Le matériel reste à disposition : certains élèves en ont encore besoin pour comprendre.";

// ── Les entiers ──────────────────────────────────────────────────────────

const NUMERATION_CM1: Demarche = {
  id: "numeration-cm1", nom: "Les unités de numération, jusqu'à 9 999 (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Pendant les deux premières périodes, le programme s'en tient aux nombres d'au plus quatre chiffres : on revoit les unités de numération et leurs relations — un millier, c'est dix centaines, cent dizaines, mille unités —, la valeur des chiffres et les écritures d'un nombre. Exemples de réussite : dénombrer une collection partiellement organisée, faite de 17 unités, 8 dizaines, 31 centaines et 2 milliers ; dire combien de cartons de mille filtres on livre.",
  seances: [
    seance("Des collections organisées", sauront("dénombrer une collection organisée en milliers, centaines, dizaines et unités, même quand un groupement compte plus de dix éléments."), 45, [
      ph(T1, "10 min", "Une collection de matériel multibase : 2 cubes de mille, 31 plaques, 8 barres, 17 cubes. « Combien en tout ? »"),
      ph(T2, "25 min", "Par groupes, des collections à dénombrer, puis à construire pour un nombre donné ; on échange dix plaques contre un cube, dix barres contre une plaque.", MANIPULER),
      ph(T3, "10 min", "La trace écrite : dix unités d'un rang font une unité du rang suivant ; 31 centaines, c'est 3 milliers et 1 centaine."),
    ]),
    seance("Les relations entre les unités", sauront("dire combien de dizaines, de centaines ou d'unités il y a dans un nombre, et résoudre un problème de paquets de dix, cent ou mille."), 45, [
      ph(T1, "10 min", "« Combien de dizaines dans 3 450 ? » — 345, pas 5 : la question n'est pas le chiffre des dizaines."),
      ph(T2, "25 min", "Des problèmes de rangement : 3 420 crayons en boîtes de dix, en cartons de cent ; combien de boîtes pleines ? On écrit la réponse avec les unités de numération."),
      ph(T3, "10 min", "Ce qu'on retient : le nombre de dizaines, c'est le nombre qu'on lit jusqu'au chiffre des dizaines."),
    ]),
    seance("Les écritures d'un nombre", sauront("passer d'une écriture d'un nombre à une autre : les chiffres, les lettres, les unités de numération, les décompositions."), 45, [
      ph(T1, "10 min", "Dictée de nombres sur l'ardoise : 4 096, 3 705… puis l'inverse, lire un nombre écrit."),
      ph(T2, "25 min", "Pour un même nombre, toutes ses écritures : 3 605 = 3 milliers 6 centaines 5 unités = 36 centaines 5 unités = 3 000 + 600 + 5 = (3 × 1 000) + (6 × 100) + (5 × 1)."),
      ph(T3, "10 min", "L'affiche des écritures d'un nombre ; l'écriture en lettres, avec les traits d'union."),
    ]),
    seance("La valeur des chiffres", sauront("dire la valeur d'un chiffre selon sa place, avec le tableau de numération."), 30, [
      ph(T2, "25 min", "Le tableau de numération : placer des nombres, dire ce que vaut chaque chiffre ; le zéro qui garde la place."),
      ph(T3, "5 min", "Ce qu'on retient : un chiffre vaut dix fois plus d'un rang à l'autre, vers la gauche."),
    ]),
    evaluation("dénombrer, écrire et décomposer des nombres jusqu'à 9 999", "Ensuite, les nombres de cinq et six chiffres, en période 3."),
  ],
};

const GRANDS_NOMBRES_CM1: Demarche = {
  id: "grands-nombres-cm1", nom: "Les nombres jusqu'à 999 999 (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Deux rangs nouveaux, les dizaines et les centaines de milliers : la classe des mille. Exemples de réussite : écrire en chiffres un nombre dicté, le lire, l'écrire en lettres ; connaître ses écritures — 34 605, 3 dizaines de milliers 4 milliers 6 centaines 5 unités, 34 milliers et 605 unités, 30 000 + 4 000 + 600 + 5 — ; laisser un espace entre les trois chiffres de droite et les autres.",
  seances: [
    seance("Au-delà de 9 999", sauront("lire et écrire les nombres de cinq et six chiffres, avec la classe des mille."), 45, [
      ph(T1, "10 min", "Des nombres de la vie : le nombre de spectateurs d'un stade, d'habitants d'une ville. Comment les lit-on ?"),
      ph(T2, "25 min", "On compte de mille en mille, de dix mille en dix mille ; on découvre la classe des mille dans le tableau ; on lit, on écrit, on dicte."),
      ph(T3, "10 min", "La trace écrite : les classes des unités et des mille, trois chiffres chacune ; l'espace qui les sépare."),
    ]),
    seance("Le tableau de numération par classes", sauront("placer un nombre dans le tableau de numération et dire la valeur de chacun de ses chiffres."), 45, [
      ph(T1, "10 min", "Un nombre écrit sans espace : 304506. Est-il facile à lire ? Le tableau aide."),
      ph(T2, "25 min", "Placer des nombres dans le tableau, puis répondre : combien de milliers dans 345 210 ? combien de centaines ?"),
      ph(T3, "10 min", "Ce qu'on retient : le nombre de milliers se lit jusqu'au chiffre des milliers."),
    ]),
    seance("Décomposer", sauront("décomposer un nombre de six chiffres de plusieurs façons."), 45, [
      ph(T2, "35 min", "Décompositions additives et multiplicatives, en unités de numération : 34 605 = 34 milliers et 605 unités = 60 dizaines et 34 milliers et 5 unités…"),
      ph(T3, "10 min", "Toutes les écritures d'un même nombre, au tableau."),
    ]),
    seance("Écrire en lettres", sauront("écrire en lettres un nombre jusqu'à 999 999, et l'écrire en chiffres sous la dictée."), 30, [
      ph(T2, "25 min", "Écrire en lettres, avec les traits d'union ; mille ne prend jamais de s ; dictée de nombres."),
      ph(T3, "5 min", "Le répertoire des mots-nombres, affiché."),
    ]),
    evaluation("lire, écrire, décomposer des nombres jusqu'à 999 999", "Ensuite, comparer et ranger ces nombres, les placer sur une demi-droite graduée."),
  ],
};

const COMPARER_NOMBRES_CM1: Demarche = {
  id: "comparer-nombres-cm1", nom: "Comparer, ranger, encadrer les nombres jusqu'à 999 999 (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Comprendre et utiliser « égal à », « supérieur à », « inférieur à », « compris entre … et … » ; comparer, encadrer, intercaler avec =, < et > ; ordonner. Exemples de réussite : ordonner cinq nombres dans l'ordre croissant ou décroissant ; placer un nombre sur une portion de demi-droite graduée de un en un, de dix en dix… jusqu'à cent mille en cent mille.",
  seances: [
    seance("Comparer deux nombres", sauront("comparer deux nombres jusqu'à 999 999 en regardant d'abord le nombre de chiffres, puis chiffre à chiffre."), 45, [
      ph(T1, "10 min", "345 210 et 99 999 : lequel est le plus grand ? Pourquoi ce n'est pas le nombre de « gros chiffres »."),
      ph(T2, "25 min", "Comparer des paires de nombres ; les mots « supérieur à », « inférieur à », et les signes ; des nombres qui ne diffèrent que d'un chiffre."),
      ph(T3, "10 min", "La méthode, en deux étapes : le nombre de chiffres ; sinon, chiffre à chiffre en partant de la gauche."),
    ]),
    seance("Ranger", sauront("ranger cinq nombres dans l'ordre croissant ou décroissant."), 30, [
      ph(T2, "25 min", "Des étiquettes-nombres à ranger, puis des listes à écrire avec < ou >."),
      ph(T3, "5 min", "On vérifie avec la méthode de comparaison."),
    ]),
    seance("Encadrer, intercaler", sauront("encadrer un nombre au millier, à la dizaine de mille, et intercaler un nombre entre deux autres."), 45, [
      ph(T1, "10 min", "« Compris entre 34 000 et 35 000 » : quels nombres conviennent ?"),
      ph(T2, "25 min", "Encadrer à l'unité de numération demandée ; trouver un nombre compris entre deux nombres donnés."),
      ph(T3, "10 min", "Ce qu'on retient : encadrer au millier, c'est trouver les deux milliers entiers qui l'entourent."),
    ]),
    seance("La demi-droite graduée", sauront("placer des nombres et lire les nombres de points sur une demi-droite graduée."), 45, [
      ph(T1, "10 min", "Une demi-droite graduée de mille en mille : où placer 34 500 ?"),
      ph(T2, "25 min", "Lire l'abscisse de points sur des demi-droites graduées de dix en dix, de cent en cent, de mille en mille ; repérer d'abord le pas."),
      ph(T3, "10 min", "Ce qu'on retient : avant de lire, je trouve de combien on avance d'une graduation à la suivante."),
    ]),
    evaluation("comparer, ranger, encadrer et placer des nombres jusqu'à 999 999", "Ensuite, ces nombres dans les problèmes ; et les décimaux, qu'on compare à leur tour."),
  ],
};

const MULTIPLES_CM1: Demarche = {
  id: "multiples-cm1", nom: "Multiples et diviseurs (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "La notion de multiple, rencontrée au cycle 2, est réactivée. Seuls les critères de divisibilité par 2, par 5 et par 10 sont au programme ; sinon, on s'appuie sur les tables, ou l'on fait une division ou une multiplication. Exemples de réussite : 141 n'est pas un multiple de 2, car il est impair ; 72 est un multiple de 9, car 8 × 9 = 72 ; 3 est un diviseur de 141, car 3 × 47 = 141 ; Marius peut-il ranger ses 75 billes dans 10, 2, 5, 7 ou 3 sachets ?",
  seances: [
    seance("Les multiples de 2, de 5 et de 10", sauront("reconnaître un multiple de 2, de 5 ou de 10 à son chiffre des unités."), 45, [
      ph(T1, "10 min", "On écrit au tableau les nombres de la table de 2, de 5, de 10 : que remarque-t-on sur leur dernier chiffre ?"),
      ph(T2, "25 min", "Trier des nombres : multiples de 2, de 5, de 10 ; un nombre peut être dans plusieurs boîtes."),
      ph(T3, "10 min", "La trace écrite des trois critères."),
    ]),
    seance("Multiple de… ?", sauront("dire si un nombre est un multiple d'un nombre jusqu'à 10, avec les tables ou une division."), 45, [
      ph(T1, "10 min", "72 est-il un multiple de 9 ? Et 141, un multiple de 7 ?"),
      ph(T2, "25 min", "Des nombres à tester : par la table quand on la connaît, sinon par essais de multiplications ou par une division ; on écrit la preuve : 72 = 8 × 9 ; 141 = 7 × 20 + 1."),
      ph(T3, "10 min", "Ce qu'on retient : un multiple de 7 s'écrit 7 × un nombre entier ; si la division laisse un reste, ce n'en est pas un."),
    ]),
    seance("Diviseur de… ?", sauront("dire si un nombre jusqu'à 10 est un diviseur d'un nombre donné, et résoudre un problème de partage en sachets."), 45, [
      ph(T1, "10 min", "Le problème de Marius : peut-il ranger ses 75 billes dans 10 sachets ? dans 5 ? dans 3 ?"),
      ph(T2, "25 min", "Des problèmes de partage et de groupement ; « 3 est un diviseur de 75 » et « 75 est un multiple de 3 », deux façons de dire la même chose."),
      ph(T3, "10 min", "Le vocabulaire, multiple et diviseur, dans le cahier de leçons."),
    ]),
    evaluation("reconnaître des multiples et des diviseurs, et le justifier", "Ensuite, ces connaissances pour comparer et ajouter des fractions."),
  ],
};

// ── Les fractions ────────────────────────────────────────────────────────

const FRACTIONS_CM1: Demarche = {
  id: "fractions-cm1", nom: "Les fractions plus grandes que 1 (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dès la période 1, les fractions s'étendent au-delà de 1. Exemples de réussite : sept quarts s'écrit 7/4, c'est sept fois un quart ; 7/4 = 1 + 3/4 ; 2 + 2/3 = 8/3 ; 16/3 est compris entre 5 et 6, parce que 15/3 = 5 et 18/3 = 6 ; placer et repérer des fractions sur une demi-droite graduée — l'abscisse d'un point est la mesure de sa distance à l'origine.",
  seances: [
    seance("Sept quarts", sauront("représenter et écrire une fraction plus grande que 1, et la lire : sept quarts, c'est sept fois un quart."), 45, [
      ph(T1, "10 min", "Des pizzas partagées en quarts : on prend sept parts. Combien de pizzas ? Comment l'écrire ?"),
      ph(T2, "25 min", "Avec des bandes unités pliées en quarts, en tiers : construire des longueurs de 7/4, 5/3, 9/4 de l'unité ; les nommer, les écrire."),
      ph(T3, "10 min", "La trace écrite : 7/4 = 7 × 1/4 ; quand le numérateur dépasse le dénominateur, la fraction est plus grande que 1.", MANIPULER),
    ]),
    seance("Un entier et une fraction", sauront("écrire une fraction plus grande que 1 comme un entier plus une fraction plus petite que 1, et l'inverse."), 45, [
      ph(T1, "10 min", "Sept quarts de pizza, c'est quatre quarts plus trois quarts : une pizza et trois quarts."),
      ph(T2, "25 min", "Passer de 9/4 à 2 + 1/4 et de 2 + 2/3 à 8/3, en s'appuyant sur 4/4 = 1, 3/3 = 1 ; puis avec les tables : 21/8 = 16/8 + 5/8 = 2 + 5/8."),
      ph(T3, "10 min", "Ce qu'on retient : je cherche combien de fois l'unité, puis ce qui reste."),
    ]),
    seance("Encadrer entre deux entiers", sauront("encadrer une fraction entre deux nombres entiers qui se suivent."), 30, [
      ph(T1, "5 min", "16/3 : entre quels entiers ? La table de 3 aide : 15/3 = 5 et 18/3 = 6."),
      ph(T2, "20 min", "Des fractions à encadrer, en écrivant la preuve."),
      ph(T3, "5 min", "La méthode, dans le cahier de leçons."),
    ]),
    seance("La demi-droite graduée", sauront("placer une fraction sur une demi-droite graduée, et repérer un point par une fraction ou par un entier plus une fraction."), 45, [
      ph(T1, "10 min", "Une demi-droite graduée en quarts : où est 7/4 ? Est-ce aussi 1 + 3/4 ?"),
      ph(T2, "25 min", "Placer des points, lire leur abscisse ; un même point, plusieurs écritures : 2 + 2/3, 8/3, 3 − 1/3."),
      ph(T3, "10 min", "Ce qu'on retient : l'abscisse d'un point, c'est sa distance à l'origine, mesurée avec l'unité."),
    ]),
    evaluation("écrire, décomposer, encadrer et placer des fractions plus grandes que 1", "Ensuite, comparer, additionner et soustraire des fractions, tout au long de l'année."),
  ],
};

const COMPARER_FRACTIONS_CM1: Demarche = {
  id: "comparer-fractions-cm1", nom: "Comparer, additionner et soustraire des fractions (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Comparer des fractions de même dénominateur, de même numérateur, ou dont l'un des dénominateurs est un multiple connu de l'autre ; additionner et soustraire dans ces mêmes cas. Exemples de réussite : expliquer que 6/8 = 3/4 — « des parts deux fois plus petites, deux fois plus de parts » — ; comparer 5/12 et 5/8, 7/4 et 19/12 ; calculer 3/2 + 7/4 ; résoudre des problèmes additifs avec des fractions simples. Chaque changement de dénominateur se justifie à l'oral.",
  seances: [
    seance("Des fractions égales", sauront("expliquer pourquoi deux fractions sont égales, comme 6/8 et 3/4."), 45, [
      ph(T1, "10 min", "Deux bandes : l'une pliée en quarts, l'autre en huitièmes. Trois quarts et six huitièmes : la même longueur ?"),
      ph(T2, "25 min", "Trouver des fractions égales avec les bandes, puis par le raisonnement : un huitième, c'est la moitié d'un quart."),
      ph(T3, "10 min", "Ce qu'on retient : des parts deux fois plus petites, il en faut deux fois plus.", MANIPULER),
    ]),
    seance("Comparer des fractions", sauront("comparer deux fractions et justifier sa réponse."), 45, [
      ph(T1, "10 min", "5/12 et 5/8 : le même nombre de parts — lesquelles sont les plus grandes ?"),
      ph(T2, "25 min", "Comparer : même dénominateur, même numérateur, puis un dénominateur multiple de l'autre — 7/4 et 19/12, en écrivant 7/4 = 21/12."),
      ph(T3, "10 min", "Les trois cas, et leur raison, dans le cahier de leçons."),
    ]),
    seance("Additionner et soustraire : le même dénominateur", sauront("additionner et soustraire des fractions de même dénominateur, en disant le calcul avec des mots."), 30, [
      ph(T1, "5 min", "6 dixièmes + 3 dixièmes = 9 dixièmes, comme 6 oranges + 3 oranges = 9 oranges."),
      ph(T2, "20 min", "Des sommes et des différences, dites puis écrites ; des résultats plus grands que 1, écrits aussi comme un entier plus une fraction."),
      ph(T3, "5 min", "Ce qu'on retient : on ajoute des parts de même taille ; le dénominateur ne change pas."),
    ]),
    seance("Des dénominateurs différents", sauront("additionner et soustraire deux fractions dont un dénominateur est un multiple de l'autre."), 45, [
      ph(T1, "10 min", "3/2 + 7/4 : des demis et des quarts — on ne peut pas ajouter des pommes et des voitures."),
      ph(T2, "25 min", "Écrire d'abord les deux fractions avec le même dénominateur, en le justifiant : 3/2 = 6/4 ; puis calculer ; des problèmes avec des fractions simples."),
      ph(T3, "10 min", "La méthode, en deux étapes, et la phrase qui la justifie."),
    ]),
    evaluation("comparer, additionner et soustraire des fractions", "Ensuite, ces calculs dans les problèmes et le calcul mental (relations entre fractions usuelles)."),
  ],
};

const FRACTION_QUANTITE_CM1: Demarche = {
  id: "fraction-quantite-cm1", nom: "Une fraction d'une quantité ou d'une grandeur (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Au CM1, la fraction devient un opérateur, pour les fractions unitaires : un tiers de douze œufs, un dixième de 500 g de farine, un cinquième de 60 kg de sable, un quart de 10 m. L'élève répond à l'oral ou à l'écrit, sans égalité mathématique, et justifie : « Pour trouver un tiers de douze œufs, je partage en trois parts égales ; comme douze, c'est trois fois quatre, cela fait quatre œufs. » ; un schéma aide à reconnaître la division.",
  seances: [
    seance("Un tiers de douze œufs", sauront("trouver une fraction unitaire d'une quantité en partageant en parts égales."), 45, [
      ph(T1, "10 min", "Douze œufs dans une boîte : on en prend un tiers. Combien ?"),
      ph(T2, "25 min", "Avec des jetons, puis un schéma en barre : partager en 2, 3, 4, 5 parts égales et prendre une part ; on dit la phrase qui justifie."),
      ph(T3, "10 min", "Ce qu'on retient : un tiers de 12, c'est 12 partagé en 3 parts égales : 4.", MANIPULER),
    ]),
    seance("Des grandeurs", sauront("trouver une fraction unitaire d'une masse, d'une longueur, d'un prix."), 45, [
      ph(T1, "10 min", "Un quart de 10 m de ruban : la moitié de la moitié — 5 m, puis 2 m et demi."),
      ph(T2, "25 min", "Un dixième de 500 g, un cinquième de 60 kg, un quart de 100 m : chacun explique sa méthode."),
      ph(T3, "10 min", "Un quart, c'est la moitié de la moitié ; un dixième, c'est diviser par dix."),
    ]),
    seance("Des problèmes", sauront("résoudre un problème où l'on prend une fraction d'une quantité."), 30, [
      ph(T2, "25 min", "Des problèmes de recettes, de partages, de distances ; on écrit la réponse par une phrase."),
      ph(T3, "5 min", "On compare les schémas des uns et des autres."),
    ]),
    evaluation("trouver une fraction unitaire d'une quantité ou d'une grandeur", "Ensuite, au CM2, des fractions non unitaires : deux tiers de 12 €."),
  ],
};

const FRACTIONS_CM2: Demarche = {
  id: "fractions-cm2", nom: "Les fractions : écrire, encadrer, comparer, placer (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dès la période 1, dans la continuité du CM1 : les fractions plus grandes que 1 et leurs écritures — un entier plus une fraction —, l'encadrement entre deux entiers, la comparaison, la demi-droite graduée. Les dénominateurs vont jusqu'à 60, et jusqu'à 1 000 pour les fractions décimales.",
  seances: [
    seance("Les écritures d'une fraction", sauront("passer d'une fraction plus grande que 1 à un entier plus une fraction, et l'inverse."), 45, [
      ph(T1, "10 min", "Neuf quarts : 9/4, 9 × 1/4, 2 + 1/4 — toutes les écritures d'un même nombre."),
      ph(T2, "25 min", "Décomposer et recomposer des fractions, avec les tables : 37/8 = 32/8 + 5/8 = 4 + 5/8."),
      ph(T3, "10 min", "L'affiche des écritures d'une fraction."),
    ]),
    seance("Encadrer et comparer", sauront("encadrer une fraction entre deux entiers et comparer deux fractions en justifiant."), 45, [
      ph(T1, "10 min", "29/6 : entre 4 et 5, parce que 24/6 = 4 et 30/6 = 5."),
      ph(T2, "25 min", "Encadrer, puis comparer : même numérateur, même dénominateur, dénominateurs multiples l'un de l'autre."),
      ph(T3, "10 min", "Les méthodes, rappelées et justifiées."),
    ]),
    seance("La demi-droite graduée", sauront("placer des fractions et repérer des points d'une demi-droite graduée."), 45, [
      ph(T2, "35 min", "Des demi-droites graduées en tiers, en sixièmes, en huitièmes : placer, lire, écrire de deux façons."),
      ph(T3, "10 min", "Ce qu'on retient : les fractions s'intercalent entre les entiers."),
    ]),
    evaluation("écrire, encadrer, comparer et placer des fractions", "Ensuite, additionner et soustraire des fractions, la séquence du livret."),
  ],
};

/** La séquence du livret du CM2 : « Opérer sur des fractions : additionner et soustraire ». */
const OPERER_FRACTIONS_CM2: Demarche = {
  id: "operer-fractions-cm2", nom: "Opérer sur des fractions : additionner et soustraire (CM2)", famille: "Mathématiques",
  source: "Livret d'accompagnement de mathématiques du CM2 (Éduscol, 2026), proposition de séquence n° 1 « Opérer sur des fractions : additionner et soustraire »",
  resume: "La séquence du livret : additionner, puis soustraire des fractions dont les dénominateurs sont différents, l'un multiple de l'autre. On manipule des bandes, on représente, on verbalise — 6 dixièmes + 3 dixièmes = 9 dixièmes ; « je ne peux pas ajouter 3 pommes et 1 voiture » — ; la procédure de mise au même dénominateur est explicitée pas à pas, puis automatisée par des séances courtes ; des problèmes la réinvestissent.",
  seances: [
    seance("Additionner des fractions (focus 1 du livret)", sauront("additionner deux fractions de dénominateurs différents, l'un multiple de l'autre, en les écrivant d'abord avec le même dénominateur."), 40, [
      ph("Temps 1 – Mise en activité", "10 min", "Le problème d'Arthur : trois quarts de baguette pour un sandwich, une demi-baguette pour l'autre. Quelle fraction de baguette en tout ? Trois minutes de recherche sur l'ardoise, réponse en lettres ou en chiffres.",
        "Une réponse comme 4/6 — numérateurs et dénominateurs ajoutés — montre qu'on n'a pas donné de sens à l'écriture : on y revient par la verbalisation."),
      ph("Temps 2 – Explicitation de la procédure", "20 min", "L'enseignant plie des bandes et pense à voix haute : « 3 quarts + 1 demi : je ne peux pas ajouter 3 pommes et 1 voiture. Un demi, c'est deux quarts. 3 quarts + 2 quarts = 5 quarts. » Les fractions sont écrites en toutes lettres, puis en chiffres."),
      ph("Temps 3 – Ce qu'on retient", "10 min", "La procédure, écrite : j'écris les deux fractions avec le même dénominateur, je le justifie, puis j'ajoute les parts.", MANIPULER),
    ]),
    seance("S'entraîner à additionner (à refaire autant que de besoin)", sauront("additionner des fractions de dénominateurs différents, de moins en moins guidés."), 15, [
      ph(T4, "15 min", "Des séries d'items additifs ; le guidage diminue d'une séance à l'autre, jusqu'à l'automatisation."),
    ]),
    seance("Des problèmes", sauront("résoudre des problèmes dont les données sont des fractions simples, puis avec trois dénominateurs différents."), 20, [
      ph(T2, "20 min", "Pratique autonome sur des situations problèmes ; la deuxième fois, trois dénominateurs différents."),
    ]),
    seance("Soustraire des fractions (focus 2 du livret)", sauront("soustraire deux fractions de dénominateurs différents, l'un multiple de l'autre."), 40, [
      ph("Temps 1 – Mise en activité", "10 min", "Un triangle dont on connaît le périmètre et deux côtés, en fractions de mètre : combien mesure le troisième côté ?"),
      ph("Temps 2 – Explicitation de la procédure", "20 min", "Comme pour l'addition : le même dénominateur d'abord, justifié, puis on retire des parts de même taille."),
      ph("Temps 3 – Ce qu'on retient", "10 min", "La procédure de la soustraction, à côté de celle de l'addition."),
    ]),
    seance("S'entraîner à soustraire et additionner", sauront("soustraire et additionner des fractions sans aide."), 15, [
      ph(T4, "15 min", "Des séries d'items soustractifs et additifs mêlés, en séances courtes."),
    ]),
    seance("Des problèmes, encore", sauront("résoudre seuls des problèmes proches de celui du triangle."), 20, [
      ph(T2, "20 min", "Pratique autonome ; chacun écrit sa réponse par une phrase."),
    ]),
  ],
};

const PRODUIT_FRACTION_CM2: Demarche = {
  id: "produit-fraction-cm2", nom: "Le produit d'un entier et d'une fraction ; une fraction d'une quantité (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Calculer le produit d'un entier et d'une fraction — 3 fois deux cinquièmes, c'est six cinquièmes — ; déterminer une fraction d'une quantité ou d'une grandeur, non unitaire désormais : deux tiers de 12 €, trois quarts de 100 m.",
  seances: [
    seance("Trois fois deux cinquièmes", sauront("calculer le produit d'un entier et d'une fraction, en le disant avec des mots."), 45, [
      ph(T1, "10 min", "3 × 2/5 : trois fois deux cinquièmes, c'est 2/5 + 2/5 + 2/5."),
      ph(T2, "25 min", "Des produits à calculer, à dire, à représenter avec des bandes ; des résultats plus grands que 1 écrits aussi comme un entier plus une fraction."),
      ph(T3, "10 min", "Ce qu'on retient : multiplier une fraction par un entier, c'est multiplier le nombre de parts."),
    ]),
    seance("Deux tiers de 12 €", sauront("trouver une fraction quelconque d'une quantité : une part, puis autant de parts que le dit le numérateur."), 45, [
      ph(T1, "10 min", "Un tiers de 12 €, on sait : 4 €. Et deux tiers ?"),
      ph(T2, "25 min", "Des fractions de quantités et de grandeurs : trois quarts de 100 m, deux cinquièmes de 30 billes, avec un schéma en barre."),
      ph(T3, "10 min", "La méthode : je partage, puis je prends autant de parts que le numérateur."),
    ]),
    seance("Des problèmes", sauront("résoudre des problèmes où l'on prend une fraction d'une quantité."), 30, [
      ph(T2, "25 min", "Recettes, distances, budgets ; la réponse par une phrase."),
      ph(T3, "5 min", "On compare les schémas."),
    ]),
    evaluation("calculer le produit d'un entier et d'une fraction, et une fraction d'une quantité", "Ensuite, en sixième, multiplier une fraction par un entier, en général."),
  ],
};

// ── Les décimaux ─────────────────────────────────────────────────────────

const FRACTIONS_DECIMALES_CM1: Demarche = {
  id: "fractions-decimales-cm1", nom: "Les fractions décimales : dixièmes et centièmes (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dès la période 2, les nombres décimaux sont introduits sous la forme de fractions décimales, avant l'écriture à virgule. Exemples de réussite : 1 = 10/10 = 100/100 et 1/10 = 10/100 ; représenter 143/100 par une longueur ou une aire ; passer de 417/100 à 4 + 17/100, puis à 4 + 1/10 + 7/100 ; placer une fraction décimale sur une demi-droite graduée ; comparer et ranger des fractions décimales.",
  seances: [
    seance("Dixièmes et centièmes", sauront("dire ce que sont un dixième et un centième d'unité, et que 1/10 = 10/100."), 45, [
      ph(T1, "10 min", "Une bande unité partagée en dix, un carré partagé en cent : un dixième, un centième."),
      ph(T2, "25 min", "Représenter des fractions décimales avec les bandes et les carrés ; constater que dix centièmes font un dixième."),
      ph(T3, "10 min", "La trace écrite : 1 = 10/10 = 100/100 ; 1/10 = 10/100.", MANIPULER),
    ]),
    seance("Plus grandes que 1", sauront("écrire une fraction décimale plus grande que 1 comme un entier plus une fraction décimale, et la décomposer en dixièmes et centièmes."), 45, [
      ph(T1, "10 min", "417/100 : combien d'unités entières ? 400/100 = 4."),
      ph(T2, "25 min", "417/100 = 4 + 17/100 = 4 + 1/10 + 7/100 : décomposer, puis recomposer d'autres fractions."),
      ph(T3, "10 min", "Ce qu'on retient : les dixièmes et les centièmes, comme des unités de numération après l'unité."),
    ]),
    seance("La demi-droite graduée en dixièmes", sauront("placer une fraction décimale sur une demi-droite graduée et repérer un point par une fraction décimale."), 45, [
      ph(T2, "35 min", "Des demi-droites graduées en dixièmes : placer 7/10, 13/10, 2 + 4/10 ; lire l'abscisse de points."),
      ph(T3, "10 min", "Ce qu'on retient : entre deux entiers, dix dixièmes."),
    ]),
    seance("Comparer, ranger", sauront("comparer, encadrer et ranger des fractions décimales."), 30, [
      ph(T2, "25 min", "Comparer 34/10 et 304/100 en les écrivant avec le même dénominateur ; ranger ; encadrer entre deux entiers."),
      ph(T3, "5 min", "On justifie avec 1/10 = 10/100."),
    ]),
    evaluation("lire, décomposer, placer et comparer des fractions décimales", "Ensuite, l'écriture à virgule, qui code cette décomposition."),
  ],
};

const NOMBRES_DECIMAUX_CM1: Demarche = {
  id: "nombres-decimaux-cm1", nom: "L'écriture à virgule (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "L'écriture à virgule est réintroduite comme le codage d'une décomposition en fractions décimales : 35,78 code 35 + 7/10 + 8/100. Au CM1, jusqu'aux centièmes. On passe d'une écriture à l'autre, on lit, on place dans le tableau de numération.",
  seances: [
    seance("Une écriture plus courte", sauront("écrire avec une virgule un nombre donné par sa décomposition en fractions décimales, et l'inverse."), 45, [
      ph(T1, "10 min", "35 + 7/10 + 8/100 : c'est long à écrire. La virgule le code : 35,78."),
      ph(T2, "25 min", "Passer de la décomposition à l'écriture à virgule et retour, avec des zéros : 4 + 5/100 = 4,05."),
      ph(T3, "10 min", "La trace écrite : le premier chiffre après la virgule compte les dixièmes, le second les centièmes."),
    ]),
    seance("Le tableau de numération", sauront("placer un nombre décimal dans le tableau de numération et dire la valeur de ses chiffres."), 45, [
      ph(T2, "35 min", "Des décimaux dans le tableau, avec les colonnes des dixièmes et des centièmes ; dire « 35 unités et 78 centièmes »."),
      ph(T3, "10 min", "Ce qu'on retient : la virgule sépare la partie entière de la partie décimale."),
    ]),
    seance("Lire et écrire", sauront("lire un nombre décimal de plusieurs façons et l'écrire sous la dictée."), 30, [
      ph(T2, "25 min", "« 4 virgule 17 », « 4 unités et 17 centièmes » : les lectures qui ont un sens ; dictée de décimaux ; des prix, des longueurs."),
      ph(T3, "5 min", "Les décimaux dans la vie : la monnaie, les mesures."),
    ]),
    evaluation("passer d'une écriture d'un nombre décimal à une autre", "Ensuite, comparer, ranger, arrondir et placer des décimaux."),
  ],
};

const COMPARER_DECIMAUX_CM1: Demarche = {
  id: "comparer-decimaux-cm1", nom: "Comparer, ranger, arrondir les décimaux (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Placer un nombre décimal sur une demi-droite graduée et repérer un point par un décimal ; donner la partie entière et l'arrondi à l'unité ; comparer, encadrer, intercaler et ranger des décimaux écrits avec une virgule, en utilisant =, < et >.",
  seances: [
    seance("La demi-droite graduée", sauront("placer un décimal sur une demi-droite graduée en dixièmes et lire l'abscisse d'un point."), 45, [
      ph(T1, "10 min", "Entre 3 et 4, dix graduations : où est 3,7 ?"),
      ph(T2, "25 min", "Placer des décimaux, lire des abscisses, sur des demi-droites graduées en dixièmes."),
      ph(T3, "10 min", "Ce qu'on retient : chaque graduation vaut un dixième."),
    ]),
    seance("Partie entière et arrondi", sauront("donner la partie entière d'un décimal et son arrondi à l'unité."), 30, [
      ph(T2, "25 min", "Avec la demi-droite : de quel entier 3,7 est-il le plus près ? Partie entière, arrondi, pour des prix et des mesures."),
      ph(T3, "5 min", "Ce qu'on retient : l'arrondi à l'unité, c'est l'entier le plus proche."),
    ]),
    seance("Comparer", sauront("comparer deux décimaux, même quand ils n'ont pas le même nombre de chiffres après la virgule."), 45, [
      ph(T1, "10 min", "3,5 et 3,47 : « 47 est plus grand que 5 » — vrai ? On revient aux dixièmes et aux centièmes."),
      ph(T2, "25 min", "Comparer en écrivant les centièmes : 3,50 et 3,47 ; d'abord les parties entières, puis les dixièmes, puis les centièmes."),
      ph(T3, "10 min", "La méthode, avec l'erreur qu'elle évite."),
    ]),
    seance("Ranger, encadrer, intercaler", sauront("ranger des décimaux, les encadrer et intercaler un décimal entre deux autres."), 30, [
      ph(T2, "25 min", "Ranger des prix, des longueurs ; trouver un nombre entre 2,3 et 2,4."),
      ph(T3, "5 min", "Entre deux décimaux, on en trouve toujours un autre."),
    ]),
    evaluation("placer, arrondir, comparer et ranger des décimaux", "Ensuite, calculer avec les décimaux : le calcul mental, puis les opérations posées."),
  ],
};

const DECIMAUX_CM2: Demarche = {
  id: "decimaux-cm2", nom: "Les décimaux jusqu'aux millièmes (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Dès la période 1, les décimaux reviennent, en écritures fractionnaires et à virgule ; leur étude s'étend aux millièmes. Relations entre unités, dixièmes, centièmes et millièmes ; décomposer, passer d'une écriture à l'autre, lire, écrire.",
  seances: [
    seance("Les millièmes", sauront("dire ce qu'est un millième et les relations entre unités, dixièmes, centièmes et millièmes."), 45, [
      ph(T1, "10 min", "Un centième partagé en dix : un millième. Combien de millièmes dans une unité ?"),
      ph(T2, "25 min", "1 = 1 000/1 000 ; 1/10 = 100/1 000 ; 1/100 = 10/1 000 : des conversions entre unités de numération décimales."),
      ph(T3, "10 min", "Le tableau de numération s'allonge d'une colonne."),
    ]),
    seance("Décomposer et écrire", sauront("passer d'une fraction décimale à sa décomposition et à l'écriture à virgule, et l'inverse."), 45, [
      ph(T2, "35 min", "2 345/1 000 = 2 + 345/1 000 = 2 + 3/10 + 4/100 + 5/1 000 = 2,345 ; puis l'inverse, avec des zéros."),
      ph(T3, "10 min", "Ce qu'on retient : chaque chiffre après la virgule a sa valeur."),
    ]),
    seance("Lire et écrire", sauront("lire et écrire des décimaux jusqu'aux millièmes, et les placer dans le tableau."), 30, [
      ph(T2, "25 min", "Dictée de décimaux ; le tableau de numération ; des mesures en kilogrammes, en kilomètres."),
      ph(T3, "5 min", "Les lectures qui ont un sens."),
    ]),
    evaluation("écrire, décomposer et lire des décimaux jusqu'aux millièmes", "Ensuite, comparer, ranger, arrondir."),
  ],
};

const COMPARER_DECIMAUX_CM2: Demarche = {
  id: "comparer-decimaux-cm2", nom: "Comparer, ranger, arrondir, placer les décimaux (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Placer un décimal sur une demi-droite graduée et repérer un point par un décimal ; partie entière et arrondi à l'unité ; comparer, encadrer, intercaler et ordonner des décimaux, jusqu'aux millièmes.",
  seances: [
    seance("La demi-droite graduée", sauront("placer des décimaux et lire des abscisses sur une demi-droite graduée."), 45, [
      ph(T2, "35 min", "Des demi-droites graduées en dixièmes, puis un zoom en centièmes ; placer, lire."),
      ph(T3, "10 min", "Ce qu'on retient : je trouve le pas avant de lire."),
    ]),
    seance("Comparer, ranger", sauront("comparer et ranger des décimaux jusqu'aux millièmes."), 45, [
      ph(T1, "10 min", "2,7 et 2,695 : lequel est le plus grand ?"),
      ph(T2, "25 min", "Comparer rang par rang ; ranger des listes ; intercaler."),
      ph(T3, "10 min", "La méthode, et l'erreur « plus de chiffres, plus grand »."),
    ]),
    seance("Partie entière et arrondi", sauront("donner la partie entière et l'arrondi à l'unité d'un décimal."), 30, [
      ph(T2, "25 min", "Des mesures et des prix à arrondir ; estimer un résultat avant de calculer."),
      ph(T3, "5 min", "L'arrondi, l'entier le plus proche."),
    ]),
    evaluation("placer, comparer, ranger et arrondir des décimaux", "Ensuite, les décimaux dans le calcul et les problèmes."),
  ],
};

const GRANDS_NOMBRES_CM2: Demarche = {
  id: "grands-nombres-cm2", nom: "Les nombres jusqu'à 999 999 999 (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Trois rangs nouveaux : les millions, les dizaines et les centaines de millions. Pendant les deux premières périodes, les entiers restent ceux du CM1 — six chiffres au plus — ; la classe des millions vient ensuite. Lire, écrire, décomposer, la valeur des chiffres et les relations entre unités de numération.",
  seances: [
    seance("La classe des millions", sauront("lire et écrire des nombres jusqu'à 999 999 999."), 45, [
      ph(T1, "10 min", "La population d'un pays, la distance de la Terre au Soleil en kilomètres : comment les lire ?"),
      ph(T2, "25 min", "Le tableau à trois classes ; lire, écrire, dicter des nombres de sept à neuf chiffres."),
      ph(T3, "10 min", "La trace écrite : millions, mille, unités ; trois chiffres par classe."),
    ]),
    seance("Les relations entre unités", sauront("dire combien de milliers ou de millions il y a dans un nombre, et décomposer de plusieurs façons."), 45, [
      ph(T2, "35 min", "Combien de milliers dans 34 506 000 ? Décompositions additives, multiplicatives, en unités de numération."),
      ph(T3, "10 min", "Ce qu'on retient : un million, c'est mille milliers."),
    ]),
    seance("Écrire en lettres", sauront("écrire en lettres un grand nombre."), 30, [
      ph(T2, "25 min", "Million prend un s au pluriel, mille jamais ; les traits d'union."),
      ph(T3, "5 min", "Le répertoire des mots-nombres."),
    ]),
    evaluation("lire, écrire et décomposer des nombres jusqu'à 999 999 999", "Ensuite, comparer et ranger ces nombres."),
  ],
};

const COMPARER_NOMBRES_CM2: Demarche = {
  id: "comparer-nombres-cm2", nom: "Comparer, ranger, encadrer, placer les grands nombres (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Comparer, encadrer, intercaler avec =, < et > ; ordonner ; placer des nombres et repérer des points sur une demi-droite graduée — jusqu'aux centaines de millions.",
  seances: [
    seance("Comparer et ranger", sauront("comparer et ranger des nombres jusqu'à 999 999 999."), 45, [
      ph(T2, "35 min", "Comparer par le nombre de chiffres, puis chiffre à chiffre ; ranger des populations, des distances."),
      ph(T3, "10 min", "La méthode, rappelée."),
    ]),
    seance("Encadrer, intercaler", sauront("encadrer un grand nombre au million, à la centaine de mille, et en intercaler."), 45, [
      ph(T2, "35 min", "Encadrer à l'unité demandée ; trouver des nombres compris entre deux autres."),
      ph(T3, "10 min", "Ce qu'on retient : encadrer au million, ce sont les deux millions entiers qui l'entourent."),
    ]),
    seance("La demi-droite graduée", sauront("placer des grands nombres et lire des points sur une demi-droite graduée."), 30, [
      ph(T2, "25 min", "Des demi-droites graduées de mille en mille, de cent mille en cent mille ; trouver le pas, puis lire."),
      ph(T3, "5 min", "On vérifie avec un nombre écrit."),
    ]),
    evaluation("comparer, ranger, encadrer et placer de grands nombres", "Ensuite, ces nombres dans les problèmes."),
  ],
};

const MULTIPLES_DIVISEURS_CM2: Demarche = {
  id: "multiples-diviseurs-cm2", nom: "Diviseurs et multiples communs (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Les notions de diviseur et de multiple sont renforcées, pour comparer, additionner et soustraire des fractions : déterminer si un nombre jusqu'à 10 est un diviseur d'un nombre donné ; des diviseurs d'un nombre jusqu'à 100, tous les diviseurs d'un nombre jusqu'à 30 ; les diviseurs communs à deux nombres jusqu'à 30, des multiples communs à deux nombres inférieurs à 15.",
  seances: [
    seance("Diviseur, multiple", sauront("dire si un nombre est un diviseur ou un multiple d'un autre, et le justifier."), 45, [
      ph(T1, "10 min", "84 et 7 : « 7 est un diviseur de 84 », « 84 est un multiple de 7 »."),
      ph(T2, "25 min", "Des paires à tester, avec les tables, les critères de 2, 5 et 10, ou une division."),
      ph(T3, "10 min", "Le vocabulaire et les critères, dans le cahier de leçons."),
    ]),
    seance("Tous les diviseurs", sauront("trouver tous les diviseurs d'un nombre jusqu'à 30."), 45, [
      ph(T1, "10 min", "Ranger 24 jetons en rectangles : combien de rangées possibles ?"),
      ph(T2, "25 min", "Chercher les diviseurs par paires : 1 × 24, 2 × 12, 3 × 8, 4 × 6 ; pour d'autres nombres."),
      ph(T3, "10 min", "Ce qu'on retient : les diviseurs vont par paires ; on s'arrête quand elles se croisent."),
    ]),
    seance("Diviseurs et multiples communs", sauront("trouver les diviseurs communs à deux nombres et des multiples communs."), 45, [
      ph(T2, "35 min", "Les diviseurs communs à 18 et 24 ; des multiples communs à 4 et 6 — utiles pour mettre deux fractions au même dénominateur."),
      ph(T3, "10 min", "Le lien avec les fractions."),
    ]),
    evaluation("trouver des diviseurs et des multiples, communs ou non", "Ensuite, ces connaissances pour les fractions."),
  ],
};

export const DEMARCHES_NOMBRES_CM: Demarche[] = [
  NUMERATION_CM1, GRANDS_NOMBRES_CM1, COMPARER_NOMBRES_CM1, MULTIPLES_CM1,
  FRACTIONS_CM1, COMPARER_FRACTIONS_CM1, FRACTION_QUANTITE_CM1, FRACTIONS_DECIMALES_CM1, NOMBRES_DECIMAUX_CM1, COMPARER_DECIMAUX_CM1,
  GRANDS_NOMBRES_CM2, COMPARER_NOMBRES_CM2, MULTIPLES_DIVISEURS_CM2,
  FRACTIONS_CM2, OPERER_FRACTIONS_CM2, PRODUIT_FRACTION_CM2, DECIMAUX_CM2, COMPARER_DECIMAUX_CM2,
];

/**
 * La séquence d'une compétence des nombres du cours moyen ; rien sinon. En
 * minuscules sans accents. Au CM1, la numération des deux premières périodes
 * s'en tient à quatre chiffres : la même compétence a donc sa séquence de
 * période 1, puis celle des grands nombres.
 */
export function demarcheDesNombresCM(classe: string, cg: string, comp: string, periode = 0): string | null {
  if (classe === "cm1") {
    if (/fractions? decimales?|unites simples, dixiemes|dixiemes et centiemes/.test(comp)) return "fractions-decimales-cm1";
    if (/ecriture a virgule|passer d.une ecriture/.test(comp) && !/placer|partie entiere|arrondi|comparer/.test(comp)) return "nombres-decimaux-cm1";
    if (/nombres? decima/.test(comp) || /partie entiere|arrondi/.test(comp)) return "comparer-decimaux-cm1";
    if (/fraction d.une quantite/.test(comp)) return "fraction-quantite-cm1";
    if (/comparer des fractions|additionner et soustraire des fractions/.test(comp)) return "comparer-fractions-cm1";
    if (/fraction/.test(comp)) return "fractions-cm1";
    if (/multiples? de 2|multiple d.un nombre|diviseur/.test(comp)) return "multiples-cm1";
    if (/suite ecrite|999 999/.test(comp)) return "grands-nombres-cm1";
    if (/egal a|comparer, encadrer|ordonner des nombres|demi-droite graduee/.test(comp)) return "comparer-nombres-cm1";
    if (/nombres entiers/.test(cg) || /denombrer|cardinal donne|unites de numeration|valeur des chiffres|representations d.un nombre/.test(comp)) {
      return periode >= 3 ? "grands-nombres-cm1" : "numeration-cm1";
    }
  }
  if (classe === "cm2") {
    if (/fractions? decimales?|unites simples, dixiemes|millieme/.test(comp)) return "decimaux-cm2";
    if (/ecriture a virgule|passer d.une ecriture/.test(comp) && !/placer|partie entiere|arrondi|comparer/.test(comp)) return "decimaux-cm2";
    if (/nombres? decima/.test(comp) || /partie entiere|arrondi/.test(comp)) return "comparer-decimaux-cm2";
    if (/additionner et soustraire des fractions/.test(comp)) return "operer-fractions-cm2";
    if (/produit d.un entier et d.une fraction|fraction d.une quantite/.test(comp)) return "produit-fraction-cm2";
    if (/fraction/.test(comp)) return "fractions-cm2";
    if (/diviseur|multiple/.test(comp)) return "multiples-diviseurs-cm2";
    if (/comparer, encadrer|ordonner des nombres|demi-droite graduee/.test(comp)) return "comparer-nombres-cm2";
    if (/nombres entiers/.test(cg) || /suite ecrite|unites de numeration|valeur des chiffres|representations d.un nombre/.test(comp)) return "grands-nombres-cm2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Une feuille de l'atelier « Grands nombres et décimaux », telle que l'atelier la refait. */
const numeration = (seance: number, titre: string, r: Partial<ReglagesNumeration>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_NUMERATION, ...r };
  return {
    seance, atelier: "numeration", titre,
    fabriquer: (g) => ({ html: htmlNumeration(reglages, g), style: STYLE_FEUILLE + STYLE_NUMERATION, refaire: { numeration: reglages } }),
  };
};

/** Une feuille des exercices du cours moyen : fractions, décimaux, demi-droite, multiples. */
const exercices = (seance: number, titre: string, r: Partial<ReglagesNombresCM>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_NOMBRES_CM, ...r, titre };
  return {
    seance, atelier: "numeration", titre,
    fabriquer: (g) => ({ html: htmlNombresCM(reglages, g), style: STYLE_FEUILLE + STYLE_NOMBRES_CM }),
  };
};

/** Le matériel de l'atelier « Fractions » : les bandes à plier, les cartes, la règle graduée. */
const fractions = (seance: number, titre: string, r: Partial<ReglagesFractions>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_FRACTIONS, ...r };
  return {
    seance, atelier: "fractions", titre,
    fabriquer: (g) => ({ html: htmlFractions(reglages, g), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { fractions: reglages } }),
  };
};

const CM1 = { classe: "CM1" as const };
const CM2 = { classe: "CM2" as const };

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "numeration-cm1": {
    feuilles: [
      numeration(1, "Le tableau de numération, jusqu'à 9 999", { decimaux: false, jusqua: 10000, exercices: ["tableau"], combien: 6 }),
      numeration(2, "Les écritures d'un nombre", { decimaux: false, jusqua: 10000, exercices: ["lettres", "decomposition"], combien: 5 }),
      numeration(3, "La valeur des chiffres", { decimaux: false, jusqua: 10000, exercices: ["tableau", "decomposition"], combien: 5 }),
      numeration(4, "Les nombres jusqu'à 9 999 — évaluation", { decimaux: false, jusqua: 10000, exercices: ["tableau", "lettres", "decomposition"], combien: 4 }),
    ],
    materiel: ["Le matériel multibase : cubes de mille, plaques, barres, cubes", "Des boîtes et des cartons dessinés au tableau", "Les ardoises", "Le tableau de numération, affiché", "Les énoncés"],
  },
  "grands-nombres-cm1": {
    feuilles: [
      numeration(0, "Lire et écrire les nombres jusqu'à 999 999", { decimaux: false, jusqua: 1_000_000, exercices: ["lettres"], combien: 5 }),
      numeration(1, "Le tableau de numération, jusqu'à 999 999", { decimaux: false, jusqua: 1_000_000, exercices: ["tableau"], combien: 6 }),
      numeration(2, "Décomposer les grands nombres", { decimaux: false, jusqua: 1_000_000, exercices: ["decomposition"], combien: 6 }),
      numeration(3, "Écrire les nombres en lettres", { decimaux: false, jusqua: 1_000_000, exercices: ["lettres"], combien: 6 }),
      numeration(4, "Les nombres jusqu'à 999 999 — évaluation", { decimaux: false, jusqua: 1_000_000, exercices: ["tableau", "lettres", "decomposition"], combien: 4 }),
    ],
    materiel: ["Des nombres de la vie : spectateurs, habitants ; les ardoises", "Le tableau de numération par classes, affiché", "Le cahier", "Le répertoire des mots-nombres", "Les énoncés"],
  },
  "comparer-nombres-cm1": {
    feuilles: [
      numeration(0, "Comparer les nombres jusqu'à 999 999", { decimaux: false, jusqua: 1_000_000, exercices: ["comparer"], combien: 8 }),
      exercices(1, "Ranger les nombres", { ...CM1, exercices: ["ranger"], combien: 2, ranger: { sorte: "entiers", jusqua: 999_999 } }),
      numeration(2, "Encadrer les nombres", { decimaux: false, jusqua: 1_000_000, exercices: ["encadrer"], combien: 6 }),
      exercices(3, "La demi-droite graduée", { ...CM1, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "entiers" } }),
      exercices(4, "Comparer, ranger, placer — évaluation", { ...CM1, exercices: ["ranger", "demi-droite"], combien: 3, ranger: { sorte: "entiers", jusqua: 999_999 }, demiDroite: { sorte: "entiers" } }),
    ],
    materiel: ["Des étiquettes-nombres", "Les étiquettes-nombres à ranger", "Le tableau de numération", "Une demi-droite graduée au tableau", "Les énoncés"],
  },
  "multiples-cm1": {
    feuilles: [
      exercices(1, "Multiple de… ? diviseur de… ?", { ...CM1, exercices: ["multiples"], combien: 8 }),
      exercices(3, "Multiples et diviseurs — évaluation", { ...CM1, exercices: ["multiples"], combien: 6 }),
    ],
    materiel: ["Les tables de multiplication, affichées", "Les tables", "Des jetons et des sachets, pour le problème des billes", "Les énoncés"],
  },
  "fractions-cm1": {
    feuilles: [
      fractions(0, "Des bandes unités à plier", { materiel: ["bandes"], denominateurs: [2, 3, 4] }),
      exercices(1, "Un entier et une fraction", { ...CM1, exercices: ["fraction-en-somme", "somme-en-fraction"], combien: 6 }),
      exercices(2, "Encadrer une fraction", { ...CM1, exercices: ["encadrer-fraction"], combien: 8 }),
      exercices(3, "La demi-droite graduée — des fractions", { ...CM1, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "fractions" } }),
      exercices(4, "Les fractions plus grandes que 1 — évaluation", { ...CM1, exercices: ["fraction-en-somme", "encadrer-fraction", "demi-droite"], combien: 4, demiDroite: { sorte: "fractions" } }),
    ],
    materiel: ["Des bandes de papier de la longueur de l'unité, à plier ; des pizzas dessinées", "Les bandes pliées", "Les tables de multiplication", "Une demi-droite graduée au tableau", "Les énoncés"],
  },
  "comparer-fractions-cm1": {
    feuilles: [
      fractions(0, "Des bandes pour comparer", { materiel: ["bandes"], denominateurs: [2, 4, 8] }),
      exercices(1, "Comparer des fractions", { ...CM1, exercices: ["comparer-fractions"], combien: 8 }),
      exercices(2, "Additionner et soustraire — le même dénominateur", { ...CM1, exercices: ["ajouter-fractions"], combien: 8, memeDenominateur: true }),
      exercices(3, "Additionner et soustraire — des dénominateurs différents", { ...CM1, exercices: ["ajouter-fractions"], combien: 8 }),
      exercices(4, "Comparer et calculer — évaluation", { ...CM1, exercices: ["comparer-fractions", "ajouter-fractions"], combien: 5 }),
    ],
    materiel: ["Des bandes unités, pliées en quarts et en huitièmes", "Les bandes", "Des oranges dessinées, pour dire le calcul", "Les bandes, sous la main de qui en a besoin", "Les énoncés"],
  },
  "fraction-quantite-cm1": {
    feuilles: [
      exercices(0, "La fraction d'une quantité", { ...CM1, exercices: ["fraction-d-une-quantite"], combien: 6, unitaires: true }),
      exercices(1, "La fraction d'une grandeur", { ...CM1, exercices: ["fraction-d-une-quantite"], combien: 8, unitaires: true }),
      exercices(3, "La fraction d'une quantité — évaluation", { ...CM1, exercices: ["fraction-d-une-quantite"], combien: 6, unitaires: true }),
    ],
    materiel: ["Des jetons, une boîte d'œufs dessinée", "Une ficelle de 10 m, une balance", "Le cahier", "Les énoncés"],
  },
  "fractions-decimales-cm1": {
    feuilles: [
      fractions(0, "La règle graduée en dixièmes", { materiel: ["regle"], graduation: 10 }),
      exercices(2, "La demi-droite graduée en dixièmes", { ...CM1, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "fractions", denominateur: 10 } }),
      exercices(4, "Les fractions décimales — évaluation", { ...CM1, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "fractions", denominateur: 10 } }),
    ],
    materiel: ["Des bandes partagées en dix, des carrés de cent", "Les bandes et les carrés", "Une demi-droite graduée en dixièmes, au tableau", "Les étiquettes de fractions décimales", "Les énoncés"],
  },
  "nombres-decimaux-cm1": {
    feuilles: [
      exercices(0, "D'une écriture à l'autre", { ...CM1, exercices: ["decimale-en-virgule", "virgule-en-decimale"], combien: 5, decimales: 2 }),
      numeration(1, "Le tableau de numération — les décimaux", { decimaux: true, jusqua: 1000, decimales: 2, exercices: ["tableau", "decomposition"], combien: 5 }),
      numeration(2, "Lire et écrire les décimaux", { decimaux: true, jusqua: 1000, decimales: 2, exercices: ["lettres"], combien: 5 }),
      exercices(3, "L'écriture à virgule — évaluation", { ...CM1, exercices: ["decimale-en-virgule", "virgule-en-decimale"], combien: 4, decimales: 2 }),
    ],
    materiel: ["Les bandes et les carrés de la séquence précédente", "Le tableau de numération, avec les dixièmes et les centièmes", "Des prix et des mesures", "Les énoncés"],
  },
  "comparer-decimaux-cm1": {
    feuilles: [
      exercices(0, "La demi-droite graduée — des décimaux", { ...CM1, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "decimaux" } }),
      exercices(1, "Partie entière et arrondi", { ...CM1, exercices: ["partie-entiere-arrondi"], combien: 8, decimales: 2 }),
      numeration(2, "Comparer les décimaux", { decimaux: true, jusqua: 100, decimales: 2, exercices: ["comparer"], combien: 8 }),
      exercices(3, "Ranger les décimaux", { ...CM1, exercices: ["ranger"], combien: 2, ranger: { sorte: "decimaux", jusqua: 10 }, decimales: 2 }),
      exercices(4, "Les décimaux — évaluation", { ...CM1, exercices: ["demi-droite", "partie-entiere-arrondi", "ranger"], combien: 4, demiDroite: { sorte: "decimaux" }, ranger: { sorte: "decimaux", jusqua: 10 }, decimales: 2 }),
    ],
    materiel: ["Une demi-droite graduée en dixièmes, au tableau", "La demi-droite", "Le tableau de numération", "Des étiquettes de prix", "Les énoncés"],
  },
  "grands-nombres-cm2": {
    feuilles: [
      numeration(0, "Les nombres jusqu'à 999 999 999", { decimaux: false, jusqua: 1_000_000_000, exercices: ["tableau"], combien: 6 }),
      numeration(1, "Décomposer les grands nombres", { decimaux: false, jusqua: 1_000_000_000, exercices: ["decomposition"], combien: 6 }),
      numeration(2, "Écrire les grands nombres en lettres", { decimaux: false, jusqua: 1_000_000_000, exercices: ["lettres"], combien: 6 }),
      numeration(3, "Les grands nombres — évaluation", { decimaux: false, jusqua: 1_000_000_000, exercices: ["tableau", "lettres", "decomposition"], combien: 4 }),
    ],
    materiel: ["Des nombres de la vie ; le tableau de numération à trois classes", "Le cahier", "Le répertoire des mots-nombres", "Les énoncés"],
  },
  "comparer-nombres-cm2": {
    feuilles: [
      numeration(0, "Comparer les grands nombres", { decimaux: false, jusqua: 1_000_000_000, exercices: ["comparer"], combien: 8 }),
      exercices(0, "Ranger les grands nombres", { ...CM2, exercices: ["ranger"], combien: 2, ranger: { sorte: "entiers", jusqua: 999_999_999 } }),
      numeration(1, "Encadrer les grands nombres", { decimaux: false, jusqua: 1_000_000_000, exercices: ["encadrer"], combien: 6 }),
      exercices(2, "La demi-droite graduée", { ...CM2, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "entiers" } }),
      exercices(3, "Comparer, ranger, placer — évaluation", { ...CM2, exercices: ["ranger", "demi-droite"], combien: 3, ranger: { sorte: "entiers", jusqua: 999_999_999 }, demiDroite: { sorte: "entiers" } }),
    ],
    materiel: ["Des étiquettes-nombres : populations, distances", "Le tableau de numération", "Une demi-droite graduée au tableau", "Les énoncés"],
  },
  "multiples-diviseurs-cm2": {
    feuilles: [
      exercices(0, "Diviseur de… ? multiple de… ?", { ...CM2, exercices: ["multiples"], combien: 8 }),
      exercices(1, "Tous les diviseurs", { ...CM2, exercices: ["diviseurs"], combien: 6 }),
      exercices(3, "Diviseurs et multiples — évaluation", { ...CM2, exercices: ["multiples", "diviseurs"], combien: 4 }),
    ],
    materiel: ["Les tables de multiplication", "Des jetons à ranger en rectangles", "Le cahier", "Les énoncés"],
  },
  "fractions-cm2": {
    feuilles: [
      exercices(0, "Les écritures d'une fraction", { ...CM2, exercices: ["fraction-en-somme", "somme-en-fraction"], combien: 6 }),
      exercices(1, "Encadrer et comparer", { ...CM2, exercices: ["encadrer-fraction", "comparer-fractions"], combien: 6 }),
      exercices(2, "La demi-droite graduée — des fractions", { ...CM2, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "fractions" } }),
      exercices(3, "Les fractions — évaluation", { ...CM2, exercices: ["fraction-en-somme", "encadrer-fraction", "comparer-fractions", "demi-droite"], combien: 3, demiDroite: { sorte: "fractions" } }),
    ],
    materiel: ["Des bandes unités", "Les tables de multiplication", "Une demi-droite graduée au tableau", "Les énoncés"],
  },
  "operer-fractions-cm2": {
    feuilles: [
      fractions(0, "Des bandes pour additionner", { materiel: ["bandes"], denominateurs: [2, 4, 8] }),
      exercices(1, "Additionner des fractions", { ...CM2, exercices: ["ajouter-fractions"], combien: 8 }),
      exercices(4, "Soustraire et additionner des fractions", { ...CM2, exercices: ["ajouter-fractions"], combien: 10 }),
    ],
    materiel: ["Des bandes de papier à plier ; les ardoises", "Les bandes, sous la main de qui en a besoin", "Les énoncés de problèmes", "Un triangle dessiné, ses côtés en fractions de mètre", "Les bandes", "Les énoncés de problèmes"],
  },
  "produit-fraction-cm2": {
    feuilles: [
      exercices(0, "Le produit d'un entier et d'une fraction", { ...CM2, exercices: ["produit-fraction"], combien: 8 }),
      exercices(1, "La fraction d'une quantité", { ...CM2, exercices: ["fraction-d-une-quantite"], combien: 8, unitaires: false }),
      exercices(3, "Produit et fraction d'une quantité — évaluation", { ...CM2, exercices: ["produit-fraction", "fraction-d-une-quantite"], combien: 5, unitaires: false }),
    ],
    materiel: ["Des bandes de papier", "Des jetons ; un schéma en barre au tableau", "Le cahier", "Les énoncés"],
  },
  "decimaux-cm2": {
    feuilles: [
      numeration(0, "Les millièmes dans le tableau", { decimaux: true, jusqua: 1000, decimales: 3, exercices: ["tableau"], combien: 6 }),
      exercices(1, "D'une écriture à l'autre", { ...CM2, exercices: ["decimale-en-virgule", "virgule-en-decimale"], combien: 5, decimales: 3 }),
      numeration(2, "Lire et écrire les décimaux", { decimaux: true, jusqua: 1000, decimales: 3, exercices: ["lettres", "decomposition"], combien: 5 }),
      exercices(3, "Les décimaux — évaluation", { ...CM2, exercices: ["decimale-en-virgule", "virgule-en-decimale"], combien: 4, decimales: 3 }),
    ],
    materiel: ["Le tableau de numération, avec les millièmes", "Le cahier", "Des mesures en kilogrammes et en kilomètres", "Les énoncés"],
  },
  "comparer-decimaux-cm2": {
    feuilles: [
      exercices(0, "La demi-droite graduée — des décimaux", { ...CM2, exercices: ["demi-droite"], combien: 4, demiDroite: { sorte: "decimaux" } }),
      numeration(1, "Comparer les décimaux", { decimaux: true, jusqua: 100, decimales: 3, exercices: ["comparer"], combien: 8 }),
      exercices(1, "Ranger les décimaux", { ...CM2, exercices: ["ranger"], combien: 2, ranger: { sorte: "decimaux", jusqua: 10 }, decimales: 3 }),
      exercices(2, "Partie entière et arrondi", { ...CM2, exercices: ["partie-entiere-arrondi"], combien: 8, decimales: 3 }),
      exercices(3, "Les décimaux — évaluation", { ...CM2, exercices: ["demi-droite", "ranger", "partie-entiere-arrondi"], combien: 4, demiDroite: { sorte: "decimaux" }, ranger: { sorte: "decimaux", jusqua: 10 }, decimales: 3 }),
    ],
    materiel: ["Une demi-droite graduée au tableau", "Le tableau de numération", "Des mesures et des prix", "Les énoncés"],
  },
};

export const estUneDemarcheDesNombresCM = (id: string) => id in PLANS;

export function planDesNombresCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
