// Les grandeurs et mesures au cours moyen : longueurs et périmètre, masses,
// contenances, aires, angles, heure et durées. Aucun livret d'accompagnement
// n'en propose de séquence : elles sont bâties, en le disant, sur le
// programme de mathématiques du cycle 3 (2025) et ses exemples de réussite,
// dont elles reprennent les situations — 3 cm + 4 mm = 34 mm = 3,4 cm ; le
// rectangle de 8 cm et de 27 cm de périmètre ; l'aire encadrée entre 18 et 36
// carreaux ; la durée de 8 h 52 min à 11 h 37 min, par étapes, « sans
// algorithme posé en base soixante ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_GRANDEURS_CM, STYLE_GRANDEURS_CM, htmlGrandeursCM, type ExerciceGrandeurs, type GrandeurCM } from "./grandeursCoursMoyen";
import { REGLAGES_MESURES, STYLE_MESURES, htmlMesures, type ExerciceMesures, type Grandeur } from "./mesures";
import { REGLAGES_HEURE, STYLE_DUREES, STYLE_HEURE, htmlAtelierHeure } from "./heure";

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
const NUMERATION = "Le lien avec les unités de numération : kilo, c'est mille ; hecto, cent ; déca, dix ; déci, centi, milli, le dixième, le centième, le millième.";

// ── Les longueurs et le périmètre (CM1) ──────────────────────────────────

const LONGUEURS_CM1: Demarche = {
  id: "longueurs-cm1", nom: "Les longueurs : du millimètre au kilomètre (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Les préfixes kilo, hecto, déca, déci, centi et milli, et les relations entre le mètre, ses multiples et ses sous-multiples, en lien avec les unités de numération : 1 dm = 10 cm et 1 cm = 0,1 dm. Les écritures d'une même longueur — 3 cm + 4 mm = 34 mm = 3,4 cm ; 215 cm = 2 m + 15 cm = 2,15 m ; ½ km = 500 m ; ¾ m = 75 cm —, ranger 33 m, 56,8 cm, 0,2 km et 2,7 dam, ajouter 8,2 m et 0,43 dam ; choisir l'unité, et estimer à partir de longueurs de référence — Paris-Lyon, environ 400 km à vol d'oiseau.",
  seances: [
    seance("Les unités, du millimètre au kilomètre", sauront("passer d'une unité de longueur à une autre, comme on passe d'une unité de numération à une autre."), 45, [
      ph(T1, "10 min", "Mesurer la longueur du couloir : en mètres ? en centimètres ? Que veulent dire « kilo » et « milli » ?"),
      ph(T2, "25 min", "Le tableau des unités, aligné sur celui de la numération ; les écritures d'une même longueur : 34 mm, 3 cm + 4 mm, 3,4 cm.", NUMERATION),
      ph(T3, "10 min", "Ce qu'on retient : d'une unité à la suivante, dix fois plus, ou dix fois moins."),
    ]),
    seance("Ranger, ajouter des longueurs", sauront("ranger et ajouter des longueurs données dans des unités différentes."), 45, [
      ph(T1, "10 min", "33 m ; 56,8 cm ; 0,2 km ; 2,7 dam : laquelle est la plus longue ?"),
      ph(T2, "25 min", "Tout écrire dans la même unité, puis ranger ; ajouter 8,2 m et 0,43 dam."),
      ph(T3, "10 min", "Ce qu'on retient : on compare et on calcule dans la même unité."),
    ]),
    seance("Choisir l'unité, estimer", sauront("choisir l'unité qui convient et estimer une longueur à partir de longueurs connues."), 45, [
      ph(T1, "10 min", "Des références de la classe : la largeur de la porte, un pas, le tour de la cour, la distance de l'école à la mairie."),
      ph(T2, "25 min", "Choisir l'unité pour une fourmi, une piscine, une ville ; estimer des distances — Paris-Lyon, environ 400 km à vol d'oiseau, le nord et le sud de l'Hexagone, environ 1 000 km — puis vérifier sur une carte."),
      ph(T3, "10 min", "Le répertoire des longueurs de référence, affiché."),
    ]),
    evaluation("passer d'une unité à l'autre, ranger, choisir l'unité", "Ensuite, le périmètre ; les conversions reviennent en calcul mental."),
  ],
};

const PERIMETRE_CM1: Demarche = {
  id: "perimetre-cm1", nom: "Le périmètre d'un polygone (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Le périmètre est la longueur du contour ; pour un polygone, la somme des longueurs de ses côtés. Reporter au compas les côtés d'un polygone sur une droite, pour obtenir un segment de même longueur que le périmètre et comparer des périmètres ; mesurer les côtés à la règle graduée ; savoir que pour le carré et le rectangle, il n'est pas nécessaire de mesurer chaque côté — sans qu'aucune formule soit enseignée ; résoudre des problèmes, comme construire un rectangle ABCD de côté [AB] de 8 cm et de périmètre 27 cm.",
  seances: [
    seance("Le tour d'une figure, au compas", sauront("dire ce qu'est le périmètre et comparer des périmètres en reportant les côtés au compas."), 45, [
      ph(T1, "10 min", "Deux polygones : lequel a le plus long tour ? On ne peut pas les superposer."),
      ph(T2, "25 min", "Reporter chaque côté au compas sur une demi-droite, l'un au bout de l'autre : le tour se déroule en un segment."),
      ph(T3, "10 min", "Ce qu'on retient : le périmètre, c'est la longueur du contour."),
    ]),
    seance("Mesurer pour calculer", sauront("calculer le périmètre d'un polygone en mesurant ses côtés à la règle graduée."), 45, [
      ph(T2, "35 min", "Mesurer chaque côté, au millimètre, puis ajouter ; vérifier avec le report au compas."),
      ph(T3, "10 min", "Ce qu'on retient : pour un polygone, le périmètre est la somme des longueurs des côtés."),
    ]),
    seance("Sans tout mesurer", sauront("calculer un périmètre à partir des longueurs données et des codes de la figure."), 45, [
      ph(T1, "10 min", "Un rectangle : faut-il mesurer les quatre côtés ? Un carré ?"),
      ph(T2, "25 min", "Des figures codées, pas en vraie grandeur : les côtés de même longueur portent les mêmes petits traits.", "Aucune formule n'est enseignée : on écrit la somme des quatre côtés."),
      ph(T3, "10 min", "Ce qu'on retient : les codes disent quels côtés ont la même longueur."),
    ]),
    seance("Des problèmes de périmètre", sauront("résoudre des problèmes mettant en jeu les côtés d'un polygone et son périmètre."), 45, [
      ph(T1, "10 min", "Un rectangle ABCD : [AB] mesure 8 cm, son périmètre 27 cm. Comment le construire ?"),
      ph(T2, "25 min", "Des enclos, des carrés de périmètre donné, le tour d'un stade : un dessin à main levée, puis les calculs."),
      ph(T3, "10 min", "On compare les démarches."),
    ]),
    evaluation("calculer des périmètres et résoudre des problèmes de périmètre", "Ensuite, les aires : deux figures de même périmètre peuvent avoir des aires différentes."),
  ],
};

// ── Les masses et les contenances (CM1) ──────────────────────────────────

const MASSES_CM1: Demarche = {
  id: "masses-cm1", nom: "Les masses : du milligramme à la tonne (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Les préfixes et les relations entre le gramme, ses multiples et ses sous-multiples — 1 kg = 10 hg, 1 hg = 0,1 kg —, et la tonne : 6,2 t = 6 200 kg. Les écritures d'une même masse — 3 g + 5 cg = 305 cg = 3,05 g ; ½ t = 500 kg ; ¼ kg = 250 g —, ranger 0,33 t et 565 kg, ajouter 8,2 kg et 840 g ; choisir l'unité, estimer à partir de masses de référence.",
  seances: [
    seance("Les unités de masse", sauront("passer d'une unité de masse à une autre, de la tonne au milligramme."), 45, [
      ph(T1, "10 min", "Une boîte de comprimés, un paquet de sucre, un camion : quelle unité ?"),
      ph(T2, "25 min", "Le tableau des unités, aligné sur celui de la numération ; la tonne, mille kilogrammes ; les écritures d'une même masse.", NUMERATION),
      ph(T3, "10 min", "Ce qu'on retient : d'une unité à la suivante, dix fois plus, ou dix fois moins ; 1 t = 1 000 kg."),
    ]),
    seance("Ranger, ajouter des masses", sauront("ranger et ajouter des masses données dans des unités différentes."), 45, [
      ph(T2, "35 min", "0,33 t et 565 kg : laquelle est la plus lourde ? 8,2 kg et 840 g : combien en tout ? Tout dans la même unité."),
      ph(T3, "10 min", "Ce qu'on retient : on compare et on calcule dans la même unité."),
    ]),
    seance("Choisir l'unité, estimer", sauront("choisir l'unité qui convient et estimer une masse à partir de masses connues."), 45, [
      ph(T1, "10 min", "Soupeser : un litre d'eau, un paquet de farine de 1 kg, une feuille, un cartable."),
      ph(T2, "25 min", "Choisir l'unité, estimer, puis peser pour vérifier, à la balance de la classe."),
      ph(T3, "10 min", "Le répertoire des masses de référence, affiché."),
    ]),
    evaluation("passer d'une unité de masse à l'autre, ranger, choisir l'unité", "Ensuite, des problèmes de masses, mêlés aux autres."),
  ],
};

const CONTENANCES_CM1: Demarche = {
  id: "contenances-cm1", nom: "Les contenances : du millilitre à l'hectolitre (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Comparer la contenance de deux ou trois récipients par transvasement, mesurer et préparer un volume de liquide au verre gradué, estimer la contenance d'un verre, d'une bouteille, d'un arrosoir. Puis les unités, du millilitre à l'hectolitre, en lien avec la numération — 1 cL = 10 mL, 1 mL = 0,1 cL — : 23 dL en litres, 6,4 L en centilitres, ranger jusqu'à quatre contenances, calculer 1 L − 25 cL.",
  seances: [
    seance("Comparer, mesurer des contenances", sauront("comparer des contenances par transvasement et mesurer avec un verre gradué."), 45, [
      ph(T1, "10 min", "Trois récipients : lequel contient le plus ? On transvase."),
      ph(T2, "25 min", "Remplir avec un même verre, compter les verres ; lire un verre gradué, préparer 25 cL d'eau."),
      ph(T3, "10 min", "Ce qu'on retient : la contenance, c'est ce qu'un récipient peut contenir."),
    ]),
    seance("Les unités de contenance", sauront("passer d'une unité de contenance à une autre, du millilitre à l'hectolitre."), 45, [
      ph(T2, "35 min", "Le tableau des unités ; 23 dL, c'est 2,3 L ; 6,4 L, c'est 640 cL ; ½ L, c'est 50 cL.", NUMERATION),
      ph(T3, "10 min", "Ce qu'on retient : d'une unité à la suivante, dix fois plus, ou dix fois moins."),
    ]),
    seance("Ranger, calculer", sauront("ranger et calculer des contenances données dans des unités différentes."), 45, [
      ph(T2, "35 min", "Ranger quatre contenances ; 1 L − 25 cL ; choisir l'unité, estimer la contenance d'un arrosoir, d'une baignoire."),
      ph(T3, "10 min", "Le répertoire des contenances de référence, affiché."),
    ]),
    evaluation("comparer et convertir des contenances", "Ensuite, des problèmes de contenances, mêlés aux autres."),
  ],
};

// ── Les aires ─────────────────────────────────────────────────────────────

const AIRES_CM1: Demarche = {
  id: "aires-cm1", nom: "Les aires : comparer, compter, encadrer, le cm² (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Comparer des aires sans les mesurer — à l'œil quand c'est net, par superposition, par découpage et recollement —, puis les déterminer sur un quadrillage, en carreaux entiers et en demi-carreaux, et encadrer l'aire d'une surface quelconque — entre 18 et 36 carreaux. Différencier aire et périmètre : deux figures peuvent avoir la même aire et des périmètres différents. Enfin le centimètre carré, l'aire d'un carré de 1 cm de côté.",
  seances: [
    seance("Comparer sans mesurer", sauront("comparer des aires par superposition, par découpage et recollement."), 45, [
      ph(T1, "10 min", "Deux surfaces découpées : laquelle prend le plus de place ? On les superpose."),
      ph(T2, "25 min", "Quand on ne peut pas superposer : découper l'une et recoller les morceaux sur l'autre."),
      ph(T3, "10 min", "Ce qu'on retient : l'aire, c'est la place qu'occupe une surface ; on peut la découper sans la changer."),
    ]),
    seance("Compter les carreaux", sauront("déterminer une aire en carreaux entiers et en demi-carreaux."), 45, [
      ph(T2, "35 min", "Des figures sur quadrillage : compter les carreaux, puis les demi-carreaux deux par deux."),
      ph(T3, "10 min", "Ce qu'on retient : l'aire se mesure avec une unité, ici le carreau."),
    ]),
    seance("Encadrer une aire", sauront("encadrer l'aire d'une surface quelconque en s'appuyant sur un quadrillage."), 45, [
      ph(T2, "35 min", "Les carreaux entiers à l'intérieur, puis tous ceux qu'il faut pour la recouvrir : l'aire est entre les deux."),
      ph(T3, "10 min", "Ce qu'on retient : quand on ne peut pas compter juste, on encadre."),
    ]),
    seance("Aire et périmètre", sauront("distinguer l'aire et le périmètre d'une figure."), 45, [
      ph(T1, "10 min", "Deux rectangles de 12 carreaux : ont-ils le même tour ?"),
      ph(T2, "25 min", "Pour chaque figure, l'aire en carreaux et le périmètre en côtés de carreau ; comparer."),
      ph(T3, "10 min", "Ce qu'on retient : même aire ne veut pas dire même périmètre."),
    ]),
    seance("Le centimètre carré", sauront("utiliser le centimètre carré pour exprimer une aire."), 45, [
      ph(T1, "10 min", "Tracer un carré de 1 cm de côté : c'est 1 cm²."),
      ph(T2, "25 min", "Des figures sur un quadrillage de 1 cm : leur aire en cm², avec les demi-carreaux."),
      ph(T3, "10 min", "Ce qu'on retient : 1 cm² est l'aire d'un carré de 1 cm de côté."),
    ]),
    evaluation("déterminer et encadrer des aires, en carreaux et en cm²", "Ensuite, au CM2, le dm², le m², et l'aire du rectangle."),
  ],
};

const AIRES_CM2: Demarche = {
  id: "aires-cm2", nom: "Les aires : cm², dm², m² et l'aire du rectangle (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Reprendre le pavage et l'encadrement du CM1 — entre 20,5 et 32 carreaux, avec les demi-carreaux —, différencier aire et périmètre, puis les unités : 1 cm², l'aire d'un carré de 1 cm de côté ; 1 m² = 100 dm² et 1 dm² = 100 cm², justifiés en découpant un carré de 1 m de côté en cent carrés de 1 dm de côté ; convertir 3,7 dm² en cm². Enfin l'aire d'un carré ou d'un rectangle aux côtés entiers, justifiée par le pavage en carrés de 1 cm de côté.",
  seances: [
    seance("Paver, encadrer", sauront("déterminer une aire par pavage et l'encadrer sur un quadrillage."), 45, [
      ph(T2, "35 min", "Des figures sur quadrillage, des carreaux et des demi-carreaux ; une surface quelconque, à encadrer."),
      ph(T3, "10 min", "Ce qu'on retient : l'aire se compte dans une unité ; quand on ne peut pas compter juste, on encadre."),
    ]),
    seance("Les unités d'aire", sauront("utiliser le cm², le dm² et le m², et passer de l'une à l'autre."), 45, [
      ph(T1, "10 min", "Un carré de 1 dm de côté, découpé en carrés de 1 cm de côté : combien ?"),
      ph(T2, "25 min", "1 dm² = 100 cm², 1 m² = 100 dm² ; tracer 1 m² au sol ; convertir 3,7 dm² en cm²."),
      ph(T3, "10 min", "Ce qu'on retient : d'une unité d'aire à la suivante, cent fois plus."),
    ]),
    seance("L'aire du rectangle", sauront("déterminer l'aire d'un carré ou d'un rectangle dont les côtés sont des nombres entiers de centimètres."), 45, [
      ph(T1, "10 min", "Un rectangle de 6 cm sur 4 cm : combien de carrés de 1 cm de côté pour le paver ?"),
      ph(T2, "25 min", "Paver, puis compter par rangées : 4 rangées de 6 carrés ; le produit des deux côtés."),
      ph(T3, "10 min", "Ce qu'on retient : l'aire d'un rectangle, c'est le nombre de rangées fois le nombre de carrés par rangée."),
    ]),
    seance("Aire et périmètre", sauront("distinguer l'aire et le périmètre, et savoir que l'une peut grandir quand l'autre diminue."), 30, [
      ph(T2, "25 min", "Des figures à comparer : même aire, périmètres différents ; une figure d'aire plus grande et de périmètre plus petit."),
      ph(T3, "5 min", "On garde un exemple au cahier."),
    ]),
    evaluation("déterminer des aires, les convertir, calculer l'aire d'un rectangle", "Ensuite, en sixième, l'aire du triangle et du disque."),
  ],
};

// ── Les angles ────────────────────────────────────────────────────────────

const ANGLES_CM1: Demarche = {
  id: "angles-cm1", nom: "Les angles : nommer, reconnaître, comparer (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Le lexique des angles — sommet, côtés, angle droit, aigu, obtus — et leurs notations : une lettre minuscule, trois lettres majuscules dont celle du sommet au milieu, ou la seule lettre du sommet quand il n'y a pas d'ambiguïté. Dire sans matériel, quand il n'y a aucun doute, qu'un angle est aigu ou obtus, ou plus grand qu'un autre ; sinon l'équerre, ou un gabarit qu'on fabrique ; savoir que la longueur des côtés ne compte pas.",
  seances: [
    seance("Le sommet, les côtés", sauront("désigner un angle, son sommet et ses côtés."), 45, [
      ph(T1, "10 min", "Des angles dans la classe : le coin du cahier, les aiguilles, les ciseaux ouverts."),
      ph(T2, "25 min", "Tracer des angles, nommer leur sommet et leurs côtés ; les notations : l'angle ABC, l'angle B."),
      ph(T3, "10 min", "Ce qu'on retient : un angle a un sommet et deux côtés ; la lettre du sommet est au milieu."),
    ]),
    seance("Aigu, droit, obtus", sauront("dire si un angle est aigu, droit ou obtus, à l'œil puis avec l'équerre."), 45, [
      ph(T2, "35 min", "Trier des angles ; quand on hésite, l'équerre décide ; fabriquer un angle droit par pliage."),
      ph(T3, "10 min", "Ce qu'on retient : plus petit que l'angle droit, il est aigu ; plus grand, il est obtus."),
    ]),
    seance("Comparer avec un gabarit", sauront("comparer des angles avec un gabarit, sans tenir compte de la longueur des côtés."), 45, [
      ph(T1, "10 min", "Un angle aux longs côtés et un angle aux côtés courts : lequel est le plus grand ?"),
      ph(T2, "25 min", "Fabriquer un gabarit sur papier calque, le poser sur l'autre angle ; prolonger les côtés ne change pas l'angle."),
      ph(T3, "10 min", "Ce qu'on retient : un angle, c'est l'écartement de ses côtés, pas leur longueur."),
    ]),
    evaluation("nommer, reconnaître et comparer des angles", "Ensuite, en géométrie, les angles droits des figures usuelles."),
  ],
};

const ANGLES_CM2: Demarche = {
  id: "angles-cm2", nom: "Les angles : construire, le degré (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Reprendre le lexique, les notations et la comparaison des angles du CM1, puis construire avec des gabarits un angle égal à la somme de deux angles, ou deux, trois fois plus grand qu'un angle donné ; construire par pliage la moitié d'un angle. Le degré, unité conventionnelle : l'angle droit mesure 90°, sa moitié 45° ; et « tourner vers la gauche de 90° » pour programmer un robot ou un lutin dans Scratch.",
  seances: [
    seance("Nommer, reconnaître, comparer", sauront("nommer des angles, les reconnaître et les comparer avec un gabarit."), 45, [
      ph(T2, "35 min", "Les notations, les angles aigus, droits, obtus ; comparer avec un gabarit, même quand les côtés n'ont pas la même longueur."),
      ph(T3, "10 min", "Ce qu'on retient : un angle, c'est l'écartement de ses côtés."),
    ]),
    seance("Construire avec des gabarits", sauront("construire un angle égal à la somme de deux angles, ou deux ou trois fois plus grand."), 45, [
      ph(T1, "10 min", "Deux gabarits, â et b̂ : comment obtenir un angle égal aux deux réunis ?"),
      ph(T2, "25 min", "Poser les gabarits côte à côte, sommet contre sommet ; reporter trois fois le même ; plier un angle en deux pour sa moitié."),
      ph(T3, "10 min", "Ce qu'on retient : on ajoute des angles en les accolant."),
    ]),
    seance("Le degré", sauront("savoir qu'un angle droit mesure 90° et en déduire d'autres mesures."), 45, [
      ph(T1, "10 min", "Plier un angle droit en deux : combien mesure la moitié, si l'angle droit mesure 90° ?"),
      ph(T2, "25 min", "45°, 180°, 135° ; programmer un robot ou un lutin : « tourner vers la gauche de 90° »."),
      ph(T3, "10 min", "Ce qu'on retient : l'unité de mesure des angles est le degré ; l'angle droit mesure 90°."),
    ]),
    evaluation("comparer, construire des angles et utiliser le degré", "Ensuite, en sixième, le rapporteur."),
  ],
};

// ── L'heure et les durées ─────────────────────────────────────────────────

const DUREES_CM1: Demarche = {
  id: "heure-durees-cm1", nom: "L'heure et les durées (CM1)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Lire l'heure à la minute sur un cadran à aiguilles et sur un affichage digital, placer les aiguilles pour 9 h 25 min ; les unités de durée et leurs relations — jour, heure, minute ; une demi-heure, un quart d'heure, trois quarts d'heure. Mesurer la durée entre 8 h 52 min et 11 h 37 min, et résoudre des problèmes en une ou deux étapes — un trajet de 7 h 47 min à 8 h 16 min, une étape cycliste, un train —, sur un axe chronologique, de tête, par étapes : aucun algorithme posé en base soixante.",
  seances: [
    seance("Lire l'heure, placer les aiguilles", sauront("lire l'heure à la minute et placer les aiguilles pour une heure donnée."), 45, [
      ph(T1, "10 min", "La petite aiguille, la grande aiguille ; l'affichage digital de la classe."),
      ph(T2, "25 min", "Lire des cadrans à la minute, dessiner les aiguilles ; une demi-heure, un quart d'heure, trois quarts d'heure."),
      ph(T3, "10 min", "Ce qu'on retient : 1 h = 60 min ; une demi-heure, 30 min ; un quart d'heure, 15 min."),
    ]),
    seance("La durée entre deux instants", sauront("calculer la durée entre deux instants, par étapes sur un axe du temps."), 45, [
      ph(T1, "10 min", "De 8 h 52 min à 11 h 37 min : combien de temps ?"),
      ph(T2, "25 min", "L'axe du temps : jusqu'à l'heure ronde, puis d'heure en heure, puis les minutes ; on calcule de tête.", "Aucun algorithme posé en base soixante n'est attendu."),
      ph(T3, "10 min", "Ce qu'on retient : on avance par étapes, en passant par les heures rondes."),
    ]),
    seance("Des problèmes de durées", sauront("résoudre des problèmes de durées en une ou deux étapes."), 45, [
      ph(T2, "35 min", "Un horaire de bus, un programme de cinéma : la durée, l'heure de départ, l'heure d'arrivée ; un axe pour chaque problème."),
      ph(T3, "10 min", "On compare les axes tracés."),
    ]),
    evaluation("lire l'heure, calculer des durées et résoudre des problèmes", "Ensuite, au CM2, les secondes."),
  ],
};

const DUREES_CM2: Demarche = {
  id: "heure-durees-cm2", nom: "L'heure et les durées, à la seconde (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Lire l'heure sur un cadran à trois aiguilles — la petite, la grande, la trotteuse — et sur un affichage digital, en heures, minutes et secondes ; les relations entre jour, heure, minute et seconde : le nombre de secondes dans deux heures et vingt minutes. Mesurer la durée entre 8 h 52 min 27 s et 11 h 37 min 18 s, et résoudre des problèmes en une ou plusieurs étapes — un marathon, une étape cycliste, un triathlon —, sur un axe chronologique, de tête, par étapes.",
  seances: [
    seance("La trotteuse", sauront("lire et placer les aiguilles à la seconde."), 45, [
      ph(T1, "10 min", "Un chronomètre, une horloge à trotteuse : que compte l'aiguille fine ?"),
      ph(T2, "25 min", "Lire des cadrans à la seconde ; dessiner les trois aiguilles."),
      ph(T3, "10 min", "Ce qu'on retient : 1 min = 60 s, comme 1 h = 60 min."),
    ]),
    seance("Jours, heures, minutes, secondes", sauront("passer d'une unité de durée à une autre."), 45, [
      ph(T2, "35 min", "Combien de secondes dans 2 h 20 min ? Combien de minutes et de secondes dans 250 s ?"),
      ph(T3, "10 min", "Ce qu'on retient : on passe par les minutes."),
    ]),
    seance("Des durées à la seconde", sauront("calculer une durée entre deux instants donnés à la seconde."), 45, [
      ph(T2, "35 min", "De 8 h 52 min 27 s à 11 h 37 min 18 s : la minute ronde, l'heure ronde, puis les heures, les minutes et les secondes, sur l'axe."),
      ph(T3, "10 min", "Ce qu'on retient : on avance par étapes rondes."),
    ]),
    seance("Des problèmes de durées", sauront("résoudre des problèmes de durées en une ou plusieurs étapes."), 45, [
      ph(T2, "35 min", "Un marathon, une étape cycliste, un triathlon dont il manque une épreuve : un axe, des étapes, de tête."),
      ph(T3, "10 min", "On compare les axes."),
    ]),
    evaluation("lire l'heure à la seconde, convertir et calculer des durées", "Ensuite, des durées dans les problèmes de la semaine."),
  ],
};

export const DEMARCHES_GRANDEURS_CM: Demarche[] = [
  LONGUEURS_CM1, PERIMETRE_CM1, MASSES_CM1, CONTENANCES_CM1, AIRES_CM1, AIRES_CM2, ANGLES_CM1, ANGLES_CM2, DUREES_CM1, DUREES_CM2,
];

/** La séquence d'une compétence de grandeurs et mesures du cours moyen ; rien sinon. En minuscules sans accents. */
export function demarcheDesGrandeursCM(classe: string, cg: string, comp: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  const cm1 = classe === "cm1";
  if (/longueurs/.test(cg)) return /perimetre|polygone/.test(comp) ? "perimetre-cm1" : "longueurs-cm1";
  if (/masses/.test(cg)) return "masses-cm1";
  if (/contenances/.test(cg)) return "contenances-cm1";
  if (/aires/.test(cg)) return cm1 ? "aires-cm1" : "aires-cm2";
  if (/angles/.test(cg)) return cm1 ? "angles-cm1" : "angles-cm2";
  if (/temps|durees/.test(cg)) return cm1 ? "heure-durees-cm1" : "heure-durees-cm2";
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Une feuille de l'atelier « Grandeurs et mesures — CM1, CM2 », qui la refait avec les mêmes réglages et le même tirage. */
const grandeurs = (seance: number, titre: string, classe: "CM1" | "CM2", exercices: ExerciceGrandeurs[], grandeur: GrandeurCM = "longueur", combien = 6): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GRANDEURS_CM, classe, exercices, grandeur, combien, titre };
  return {
    seance, atelier: "grandeursCM", titre,
    fabriquer: (g) => ({ html: htmlGrandeursCM(reglages, g), style: STYLE_FEUILLE + STYLE_GRANDEURS_CM, refaire: { grandeursCM: reglages } }),
  };
};

/** Une feuille de l'atelier « Mesures » qui convient au CM1 telle quelle — le périmètre à la règle, au compas, les verres —, avec la source du cycle 3. */
const SOURCE_DU_CYCLE_2 = "Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Grandeurs et mesures au cycle 2 », 2016.";
const mesures = (seance: number, titre: string, exercice: ExerciceMesures, grandeur: Grandeur = "longueur"): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_MESURES, exercice, grandeur, classe: "CE2" as const, millimetres: true, combien: 4 };
  return {
    seance, atelier: "mesures", titre,
    fabriquer: (g) => ({
      html: htmlMesures(reglages, g).replace(SOURCE_DU_CYCLE_2, "Programme de mathématiques du cycle 3, 2025 ; exemples de réussite du CM1 (Éduscol, 2025)."),
      style: STYLE_FEUILLE + STYLE_MESURES,
    }),
  };
};

/** Les horloges à la minute de l'atelier « Lire l'heure ». */
const horloges = (seance: number, titre: string): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_HEURE, exercice: "horloges" as const, precision: "minutes" as const, sens: "mixte" as const, combien: 9, apresMidi: true };
  return { seance, atelier: "heure", titre, fabriquer: (g) => ({ html: htmlAtelierHeure(reglages, g), style: STYLE_FEUILLE + STYLE_HEURE + STYLE_DUREES, refaire: { heure: reglages } }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "longueurs-cm1": {
    feuilles: [
      grandeurs(0, "Les unités de longueur", "CM1", ["convertir"], "longueur", 8),
      grandeurs(1, "Ranger, ajouter des longueurs", "CM1", ["ranger", "calculer"], "longueur", 5),
      grandeurs(2, "Choisir l'unité, estimer", "CM1", ["unite", "estimer"], "longueur", 6),
      grandeurs(3, "Les longueurs — évaluation", "CM1", ["convertir", "ranger", "unite"], "longueur", 5),
    ],
    materiel: ["Un mètre ruban, un double décimètre ; le tableau des unités aligné sur la numération", "Le tableau des unités", "Une carte de France ; le répertoire des longueurs de référence", "Les énoncés"],
  },
  "perimetre-cm1": {
    feuilles: [
      mesures(0, "Comparer des périmètres au compas", "perimetreCompas"),
      mesures(1, "Le périmètre, avec la règle", "perimetre"),
      grandeurs(2, "Le périmètre, sans tout mesurer", "CM1", ["perimetre"], "longueur", 4),
      grandeurs(3, "Des problèmes de périmètre", "CM1", ["perimetre-probleme"], "longueur", 4),
      grandeurs(4, "Le périmètre — évaluation", "CM1", ["perimetre", "perimetre-probleme"], "longueur", 3),
    ],
    materiel: ["Des polygones découpés ; un compas", "Une règle graduée", "Les figures codées", "Une règle, une équerre, pour construire le rectangle", "Les énoncés"],
  },
  "masses-cm1": {
    feuilles: [
      grandeurs(0, "Les unités de masse", "CM1", ["convertir"], "masse", 8),
      grandeurs(1, "Ranger, ajouter des masses", "CM1", ["ranger", "calculer"], "masse", 5),
      grandeurs(2, "Choisir l'unité, estimer", "CM1", ["unite", "estimer"], "masse", 6),
      grandeurs(3, "Les masses — évaluation", "CM1", ["convertir", "ranger", "unite"], "masse", 5),
    ],
    materiel: ["Des emballages et leur masse ; le tableau des unités", "Le tableau des unités", "Une balance, un paquet de 1 kg, des objets à soupeser", "Les énoncés"],
  },
  "contenances-cm1": {
    feuilles: [
      mesures(0, "Combien de verres ?", "verres", "contenance"),
      grandeurs(1, "Les unités de contenance", "CM1", ["convertir"], "contenance", 8),
      grandeurs(2, "Ranger, calculer, estimer", "CM1", ["ranger", "calculer", "estimer"], "contenance", 4),
      grandeurs(3, "Les contenances — évaluation", "CM1", ["convertir", "ranger", "unite"], "contenance", 5),
    ],
    materiel: ["Des récipients, de l'eau, un même verre ; un verre gradué", "Le tableau des unités", "Une bouteille de 1 L, un verre de 25 cL", "Les énoncés"],
  },
  "aires-cm1": {
    feuilles: [
      grandeurs(1, "Compter les carreaux", "CM1", ["aire-pavage"], "longueur", 4),
      grandeurs(2, "Encadrer une aire", "CM1", ["aire-encadrer"], "longueur", 4),
      grandeurs(3, "Aire et périmètre", "CM1", ["aire-perimetre"], "longueur", 4),
      grandeurs(4, "Le centimètre carré", "CM1", ["aire-cm2"], "longueur", 4),
      grandeurs(5, "Les aires — évaluation", "CM1", ["aire-pavage", "aire-cm2"], "longueur", 2),
    ],
    materiel: ["Des surfaces découpées, des ciseaux, de la colle", "Du papier quadrillé", "Du papier quadrillé", "Du papier quadrillé", "Une règle ; du papier quadrillé en centimètres", "Les énoncés"],
  },
  "aires-cm2": {
    feuilles: [
      grandeurs(0, "Paver, encadrer", "CM2", ["aire-pavage", "aire-encadrer"], "longueur", 3),
      grandeurs(1, "Les unités d'aire", "CM2", ["aire-convertir"], "longueur", 8),
      grandeurs(2, "L'aire du rectangle", "CM2", ["aire-rectangle"], "longueur", 4),
      grandeurs(3, "Aire et périmètre", "CM2", ["aire-perimetre"], "longueur", 4),
      grandeurs(4, "Les aires — évaluation", "CM2", ["aire-rectangle", "aire-convertir"], "longueur", 4),
    ],
    materiel: ["Du papier quadrillé", "Un carré de 1 dm de côté, quadrillé en centimètres ; du ruban adhésif pour tracer 1 m² au sol", "Une règle ; des carrés de 1 cm de côté", "Du papier quadrillé", "Une règle"],
  },
  "angles-cm1": {
    feuilles: [
      grandeurs(0, "Nommer un angle", "CM1", ["angles-nommer"], "longueur", 6),
      grandeurs(1, "Aigu, droit ou obtus ?", "CM1", ["angles-nature"], "longueur", 6),
      grandeurs(2, "Comparer des angles", "CM1", ["angles-comparer"], "longueur", 6),
      grandeurs(3, "Les angles — évaluation", "CM1", ["angles-nature", "angles-comparer"], "longueur", 4),
    ],
    materiel: ["Une règle", "Une équerre ; une feuille à plier", "Du papier calque, des ciseaux, pour les gabarits", "Une équerre, du papier calque"],
  },
  "angles-cm2": {
    feuilles: [
      grandeurs(0, "Nommer et reconnaître des angles", "CM2", ["angles-nommer", "angles-nature"], "longueur", 4),
      grandeurs(1, "Comparer des angles", "CM2", ["angles-comparer"], "longueur", 6),
      grandeurs(2, "Le degré", "CM2", ["angles-degres"], "longueur", 8),
      grandeurs(3, "Les angles — évaluation", "CM2", ["angles-nature", "angles-degres"], "longueur", 4),
    ],
    materiel: ["Une règle, une équerre", "Du papier calque, des ciseaux, pour les gabarits", "Des feuilles à plier ; un robot ou Scratch", "Une équerre"],
  },
  "heure-durees-cm1": {
    feuilles: [
      horloges(0, "Lire l'heure, placer les aiguilles"),
      grandeurs(1, "La durée entre deux instants", "CM1", ["durees"], "longueur", 6),
      grandeurs(2, "Des problèmes de durées", "CM1", ["durees-problemes"], "longueur", 3),
      grandeurs(3, "L'heure et les durées — évaluation", "CM1", ["durees", "durees-problemes"], "longueur", 3),
    ],
    materiel: ["Une horloge à aiguilles de la classe", "Une frise du temps à graduer", "Des horaires de bus, un programme de cinéma", "Les énoncés"],
  },
  "heure-durees-cm2": {
    feuilles: [
      grandeurs(0, "Lire l'heure à la seconde", "CM2", ["horloges-secondes"], "longueur", 6),
      grandeurs(1, "Jours, heures, minutes, secondes", "CM2", ["durees-convertir"], "longueur", 6),
      grandeurs(2, "Des durées à la seconde", "CM2", ["durees"], "longueur", 5),
      grandeurs(3, "Des problèmes de durées", "CM2", ["durees-problemes"], "longueur", 4),
      grandeurs(4, "L'heure et les durées — évaluation", "CM2", ["durees-convertir", "durees-problemes"], "longueur", 3),
    ],
    materiel: ["Un chronomètre, une horloge à trotteuse", "Les relations entre les unités, affichées", "Une frise du temps", "Les résultats d'une course", "Les énoncés"],
  },
};

export const estUneDemarcheDesGrandeursCM = (id: string) => id in PLANS;

export function planDesGrandeursCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
