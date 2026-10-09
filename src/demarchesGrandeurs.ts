// Les grandeurs et mesures au cycle 2 : des séquences bâties sur le programme
// et les guides.
//
// Les livrets d'accompagnement n'ont pas de séquence pour les longueurs, les
// masses, les contenances, la monnaie ou les durées ; l'enseignant a demandé
// (2026-10-07) qu'on les construise depuis les guides Éduscol et le
// programme, en le disant. Les sources : le programme de mathématiques du
// cycle 2 (2024) — ses objectifs, ses exemples de réussite, ses repères de
// période, cités — ; Éduscol, « Grandeurs et mesures au cycle 2 » (2016) :
// construire la grandeur avant sa mesure, comparer directement puis
// indirectement, mesurer par report d'une unité, se faire un répertoire de
// références pour estimer, convertir sans tableau ; l'activité « Masses » de
// la même collection, pour le kilogramme ; le guide « Pour enseigner les
// nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021),
// pour la monnaie. Chaque séance suit la démarche en quatre temps des livrets.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie, type ReglagesMonnaie } from "./monnaie";
import { REGLAGES_MESURES, STYLE_MESURES, htmlMesures, type ReglagesMesures } from "./mesures";
import { REGLAGES_HEURE, STYLE_DUREES, STYLE_HEURE, htmlAtelierHeure, type ReglagesHeure } from "./heure";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

/** Une séance ordinaire : la situation, l'activité, ce qu'on retient. */
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);

const PROGRAMME = "Bâtie sur le programme de mathématiques du cycle 2 (2024) et les guides Éduscol, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement ; démarche en quatre temps des livrets";
const GRANDEURS = "Éduscol, « Grandeurs et mesures au cycle 2 » (ressources d'accompagnement, 2016)";
const MASSES = "Éduscol, « Grandeurs et mesures au cycle 2 — Activité : Masses » et évaluation « Estimations — Masses » (2016)";
const GUIDE_CP = "guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021), « Quels matériels… ? », exemple 3 : la monnaie";

/** L'évaluation qui clôt chaque séquence, puis ce qui vient ensuite. */
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 20, [
  ph("Évaluation", "15 min", `Une feuille et une situation à manipuler : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

// ── Les longueurs ─────────────────────────────────────────────────────────

const LONGUEURS_COMPARER_CP: Demarche = {
  id: "longueurs-comparer-cp", nom: "Comparer des longueurs (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Au CP, les longueurs s'appuient sur des manipulations, et la grandeur se construit avant sa mesure : le lexique — long, court, près, loin — ; comparer deux objets déplaçables en faisant coïncider une extrémité, deux objets qu'on ne peut pas déplacer avec une ficelle ou une bandelette qui reporte la longueur ; ordonner jusqu'à cinq baguettes ou bandelettes ; comparer deux segments par report d'un étalon.",
  seances: [
    trois("Long, court : comparer deux objets", "comparer la longueur de deux objets qu'on peut déplacer, en faisant coïncider une extrémité, et le dire : plus long que, plus court que.",
      "Deux crayons, deux rubans : lequel est le plus long ? Quand il n'y a aucun doute, on le voit ; quand ils sont presque pareils, il faut une méthode.",
      "Par deux, des baguettes, des bandelettes, des ficelles : on fait coïncider une extrémité, on superpose, on regarde l'autre bout. Les mots : plus long que, plus court que, aussi long que ; près, loin.",
      "Ce qu'on retient : pour comparer deux longueurs, on fait coïncider une extrémité.", "Montre le piège : deux objets qui ne partent pas du même endroit."),
    trois("Comparer sans déplacer : la ficelle", "comparer les longueurs de deux objets qu'on ne peut pas déplacer, en reportant une longueur avec une ficelle ou une bandelette.",
      "Le tableau et l'étagère ne se déplacent pas : lequel est le plus long ? Comment faire sans les bouger ?",
      "Avec une ficelle ou une bandelette, on reporte une longueur et on la compare à l'autre ; par équipes, des objets de la classe : la porte, le bureau, le banc, la fenêtre.",
      "La ficelle transporte la longueur : c'est un instrument de report."),
    seance("Ranger des baguettes", sauront("ordonner jusqu'à cinq baguettes ou cinq bandelettes selon leur longueur."), 45, [
      ph(T1, "5 min", "Cinq bandelettes de longueurs voisines : comment les ranger de la plus courte à la plus longue ?"),
      ph(T2, "25 min", "On compare deux à deux, on range ; puis, sur la feuille, des crayons qui ne commencent pas tous au même endroit : celui qui dépasse le plus n'est pas forcément le plus long.",
        "Laisse les élèves se tromper sur les crayons décalés, puis vérifiez ensemble avec une bande de papier."),
      ph(T3, "10 min", "La méthode : faire coïncider une extrémité, ou reporter avec une bande."),
      ph(T4, "5 min", "Ranger trois baguettes, seul."),
    ]),
    trois("Comparer des segments", "comparer les longueurs de deux segments en les reportant sur une bande de papier ou en comptant un étalon.",
      "Deux segments tracés qu'on ne peut pas superposer : lequel est le plus long ?",
      "On reporte chaque segment sur une bande de papier ; ou on compte combien de fois un étalon — une petite bandelette — y tient. Des segments dans tous les sens, à ranger.",
      "La trace écrite : deux façons de comparer des segments."),
    evaluation("comparer et ranger des longueurs d'objets et de segments", "Ensuite, mesurer avec la règle graduée en centimètres."),
  ],
};

const LONGUEURS_MESURER_CP: Demarche = {
  id: "longueurs-mesurer-cp", nom: "Mesurer : le centimètre et le mètre (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Mesurer, c'est reporter une unité et compter combien de fois elle tient : un étalon d'abord, puis le centimètre et la règle graduée pour mesurer et tracer des segments ; le mètre — un mètre est égal à cent centimètres — ; quelques longueurs de référence pour estimer : une trousse, plutôt 2 cm, 20 cm ou 1 m ? La hauteur de la porte, la largeur de la classe, la longueur du couloir.",
  seances: [
    trois("Mesurer avec un étalon", "mesurer une longueur en comptant combien de fois un étalon y tient, bout à bout.",
      "Combien de bandelettes pour faire la longueur du cahier ? On reporte l'étalon bout à bout, sans laisser de trou.",
      "Des bandes et des segments à mesurer avec un étalon ; deux équipes n'ont pas le même étalon et ne trouvent pas le même nombre : il faut une unité commune.",
      "Ce qu'on retient : mesurer, c'est compter combien de fois l'unité tient."),
    trois("Le centimètre et la règle graduée", "mesurer un segment en centimètres avec la règle graduée, le zéro posé sur une extrémité.",
      "Une bandelette d'un centimètre, reportée : la règle graduée, ce sont des centimètres déjà reportés. Où est le zéro ?",
      "Mesurer des segments : le zéro sur une extrémité, la règle le long du segment, on lit la graduation à l'autre extrémité.",
      "La trace écrite : mesurer avec la règle ; le symbole cm.", "Vérifie où est posé le zéro : partir de 1, ou du bord de la règle, est l'erreur la plus fréquente."),
    trois("Tracer un segment de longueur donnée", "tracer un segment d'une longueur donnée en centimètres.",
      "Tracer un segment de 7 cm : on part d'un point, on y pose le zéro.",
      "Des segments à tracer — d'abord la règle tenue par un camarade, puis seul — ; on vérifie en mesurant.",
      "On compare les tracés : la même longueur, où qu'on la trace.", "Apprends à tenir la règle d'une main et le crayon de l'autre."),
    trois("Le mètre : 1 m = 100 cm", "savoir qu'un mètre est égal à cent centimètres, et mesurer de grandes longueurs en mètres.",
      "Mesurer le couloir en centimètres ? C'est long… La règle du tableau mesure un mètre : combien de centimètres ? On compte de dix en dix.",
      "Mesurer le tableau, la classe, le couloir avec la règle d'un mètre ; compléter un mètre : 60 cm + 40 cm = 1 m.",
      "La trace écrite : 1 m = 100 cm ; le symbole m."),
    trois("Des longueurs de référence", "estimer une longueur en s'appuyant sur des longueurs connues : une trousse, plutôt 2 cm, 20 cm ou 1 m ?",
      "La largeur d'un doigt, environ 1 cm ; la règle du tableau, 1 m ; la porte de la classe, environ 2 m.",
      "Estimer, puis vérifier en mesurant : la hauteur de la porte, la largeur de la classe, la longueur du couloir ; choisir la mesure vraisemblable.",
      "L'affiche des longueurs de référence de la classe, qu'on fera vivre toute l'année."),
    evaluation("mesurer et tracer des segments en centimètres, et estimer une longueur", "Ensuite, les longueurs dans les problèmes ; les références, réutilisées en calcul mental."),
  ],
};

const LONGUEURS_MESURER_CE1: Demarche = {
  id: "longueurs-mesurer-ce1", nom: "Mesurer, comparer, estimer des longueurs (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "La règle graduée pour mesurer des segments et encadrer leur longueur entre deux nombres entiers de centimètres — « la longueur du segment est entre huit et neuf centimètres » — ; le mètre ruban pour les grandes longueurs ; comparer des longueurs ; des longueurs d'objets familiers et des distances de référence (école-mairie, école-piscine, école-terrain de sport, école-bibliothèque) pour estimer : une trousse, plutôt 2 cm, 20 cm ou 2 m ?",
  seances: [
    trois("Mesurer et encadrer", "mesurer un segment avec la règle graduée et encadrer sa longueur entre deux nombres entiers de centimètres.",
      "Rappel : poser le zéro. Et quand l'extrémité tombe entre deux graduations ? « La longueur du segment est entre huit et neuf centimètres. »",
      "Mesurer des segments, dans tous les sens ; encadrer ceux qui tombent entre deux centimètres.",
      "La trace écrite : encadrer une longueur entre deux nombres de centimètres."),
    trois("Comparer des longueurs", "comparer et ranger des longueurs, en les reportant ou en les mesurant.",
      "Des segments dans tous les sens : lequel est le plus long ? À l'œil, on hésite.",
      "Reporter avec une bande de papier, ou mesurer avec la règle ; tracer des segments de longueur donnée pour les comparer.",
      "Ce qu'on retient : comparer sans mesurer, ou en mesurant."),
    trois("Le mètre ruban", "mesurer une grande longueur avec un mètre ruban ou une règle d'un mètre graduée en centimètres.",
      "La longueur de la classe : avec le double-décimètre, c'est très long. Le mètre ruban, la règle d'un mètre.",
      "Par équipes, mesurer des longueurs de la classe et de la cour, et les noter en mètres et en centimètres.",
      "On compare les mesures des équipes : pourquoi diffèrent-elles un peu ?"),
    trois("Estimer avec des longueurs de référence", "estimer la longueur d'un objet du quotidien en s'appuyant sur des longueurs et des distances connues.",
      "Ce qu'on connaît : la règle du tableau, la porte ; et des distances : de l'école à la mairie, à la piscine, à la bibliothèque.",
      "Estimer, puis mesurer pour vérifier ; choisir la mesure vraisemblable.",
      "L'affiche des longueurs de référence s'enrichit."),
    evaluation("mesurer, encadrer, comparer et estimer des longueurs", "Ensuite, les unités m, cm, km et leurs relations."),
  ],
};

const LONGUEURS_UNITES_CE1: Demarche = {
  id: "longueurs-unites-ce1", nom: "Les unités de longueur : m, cm, km (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Le mètre, le centimètre, puis le kilomètre ; les relations 1 m = 100 cm et 1 km = 1 000 m, et des calculs comme 1 m + 46 cm = 146 cm ; choisir l'unité la mieux adaptée ; comparer des longueurs écrites dans des unités différentes. Sans écriture à virgule : elle n'est pas attendue pour les longueurs.",
  seances: [
    trois("Mètres et centimètres", "savoir que 1 m = 100 cm, et écrire une longueur en centimètres : 1 m + 46 cm = 146 cm.",
      "La règle d'un mètre et ses graduations : 1 m = 100 cm.",
      "Mesurer, puis écrire de deux façons : 1 m et 46 cm, c'est 146 cm ; 300 cm, c'est 3 m.",
      "La trace écrite : les relations entre le mètre et le centimètre."),
    trois("Le kilomètre", "savoir que 1 km = 1 000 m, et utiliser le kilomètre pour les distances.",
      "Mille mètres : combien de fois la longueur de la cour ? Le kilomètre, pour les distances : de l'école au village voisin.",
      "Des distances connues à dire en kilomètres ; des calculs : 300 m + 700 m = 1 km ; 3 km = 3 000 m.",
      "La trace écrite : 1 km = 1 000 m."),
    trois("Choisir l'unité", "choisir l'unité la mieux adaptée pour exprimer une longueur : le centimètre, le mètre ou le kilomètre.",
      "La longueur d'un crayon en kilomètres ? La distance de l'école à la ville voisine en centimètres ?",
      "Des longueurs à compléter avec l'unité qui convient ; on justifie avec les références de la classe.",
      "Ce qu'on retient : chaque unité a ses longueurs."),
    trois("Comparer des longueurs écrites autrement", "comparer et ranger des longueurs exprimées dans des unités différentes.",
      "1 m et 20 cm, ou 102 cm : laquelle est la plus longue ? On les écrit dans la même unité.",
      "Comparer avec <, > ou = ; ranger quatre longueurs écrites de façons différentes.",
      "La méthode : écrire dans la même unité avant de comparer."),
    evaluation("utiliser le mètre, le centimètre et le kilomètre, et passer de l'un à l'autre", "Ensuite, les longueurs dans les problèmes, et en géométrie pour les constructions."),
  ],
};

const LONGUEURS_UNITES_CE2: Demarche = {
  id: "longueurs-unites-ce2", nom: "Les unités de longueur, du millimètre au kilomètre (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Le mètre, le décimètre, le centimètre, le millimètre, le kilomètre. Pas de tableau de conversion au cycle 2 : on s'appuie sur les relations connues — 1 cm = 10 mm, 1 m = 1 000 mm, 6 km = 6 000 m — pour calculer avec des longueurs données dans des unités différentes : 3 cm + 4 mm = 34 mm ; 215 cm = 2 m + 1 dm + 5 cm ; 5 km + 750 m = 5 750 m. Choisir l'unité, comparer, estimer des longueurs et des distances.",
  seances: [
    trois("Le décimètre et le millimètre", "connaître le décimètre et le millimètre, et leurs relations avec le centimètre et le mètre.",
      "Le double-décimètre : 2 dm = 20 cm. Entre deux centimètres, dix petits traits : dix millimètres.",
      "Mesurer au millimètre ; trouver 1 dm et 1 m sur la règle d'un mètre ; 1 cm = 10 mm, 1 m = 1 000 mm.",
      "La trace écrite : 1 cm = 10 mm ; 1 dm = 10 cm ; 1 m = 10 dm = 100 cm = 1 000 mm ; 1 km = 1 000 m."),
    trois("Convertir sans tableau", "convertir une longueur en s'appuyant sur les relations connues : 3 cm + 4 mm = 34 mm ; 5 km + 750 m = 5 750 m.",
      "215 cm = 200 cm + 15 cm = 2 m + 15 cm = 2 m + 1 dm + 5 cm : on décompose.",
      "Des conversions cm-mm, m-dm-cm et km-m, pour calculer avec des longueurs données dans des unités différentes.",
      "Ce qu'on retient : passer par les relations connues ; pas de tableau de conversion."),
    trois("Choisir l'unité", "choisir l'unité la mieux adaptée pour exprimer une longueur, du millimètre au kilomètre.",
      "Une fourmi, une règle, une piscine, la distance jusqu'à Paris : en quelle unité ?",
      "Des longueurs à compléter avec leur unité ; on justifie avec des références.",
      "Ce qu'on retient : l'unité qui donne un nombre facile à se représenter."),
    trois("Comparer et ranger", "comparer et ranger des longueurs exprimées dans des unités différentes.",
      "72 mm ou 7 cm ? 1 m et 5 cm, ou 150 cm ?",
      "Comparer avec <, > ou = ; ranger des longueurs ; on convertit d'abord.",
      "La méthode, dite par les élèves."),
    trois("Estimer", "estimer la longueur d'un objet ou une distance en s'appuyant sur des références.",
      "Des distances de référence : de chez soi à une ville proche, à Paris ; des longueurs d'objets familiers.",
      "Estimer, puis vérifier quand c'est possible ; choisir la mesure vraisemblable.",
      "L'affiche des références de la classe."),
    evaluation("convertir, comparer et estimer des longueurs", "Ensuite, les longueurs dans les problèmes et en géométrie plane."),
  ],
};

const MESURER_TRACER_CE2: Demarche = {
  id: "mesurer-tracer-ce2", nom: "Mesurer et tracer au millimètre (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Mesurer la longueur de segments et tracer des segments de longueur donnée, les longueurs données sous différentes formes : 6 cm ; 5 cm et 3 mm ; 72 mm. Ces savoir-faire sont réinvestis en géométrie plane, dans les constructions.",
  seances: [
    trois("Mesurer au millimètre", "mesurer un segment au millimètre près et écrire sa longueur en centimètres et millimètres.",
      "Le segment tombe entre 5 et 6 cm : les millimètres disent où.",
      "Mesurer des segments, dans tous les sens ; écrire 5 cm et 3 mm, ou 53 mm.",
      "La trace écrite : 1 cm = 10 mm ; deux écritures d'une même longueur."),
    trois("Tracer un segment de longueur donnée", "tracer un segment d'une longueur donnée en centimètres et en millimètres.",
      "Tracer un segment de 72 mm : où s'arrêter sur la règle ?",
      "Des segments à tracer, les longueurs écrites de différentes façons ; on vérifie en échangeant les feuilles.",
      "On compare les tracés et on dit ce qui permet de réussir.", "Fais tenir la règle fermement, le crayon contre la règle."),
    trois("Des longueurs sous plusieurs formes", "passer d'une écriture d'une longueur à l'autre : 5 cm et 3 mm, c'est 53 mm.",
      "6 cm ; 5 cm et 3 mm ; 72 mm : quel est le plus long ?",
      "Des longueurs à écrire autrement, à comparer, à tracer.",
      "Ce qu'on retient : 10 mm font 1 cm."),
    evaluation("mesurer et tracer des segments au millimètre", "Ensuite, le périmètre, et les constructions de géométrie."),
  ],
};

const PERIMETRE_CE2: Demarche = {
  id: "perimetre-ce2", nom: "Le périmètre d'un polygone (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Le périmètre d'une figure plane est la longueur de son contour : on compare d'abord des périmètres sans règle graduée, en reportant au compas les côtés d'un polygone sur une droite, puis on détermine le périmètre en mesurant chaque côté. Pour le carré et le rectangle, aucune formule n'est enseignée, mais on sait qu'il n'est pas nécessaire de mesurer chacun des côtés.",
  seances: [
    trois("Le tour d'une figure", "savoir que le périmètre d'une figure plane est la longueur de son contour.",
      "Une ficelle fait le tour d'une figure découpée : on la déroule, on la compare à celle d'une autre figure.",
      "Des figures de formes différentes : laquelle a le plus long tour ? On ne se fie pas à l'œil : une grande figure n'a pas forcément le plus long tour.",
      "La trace écrite : le périmètre, c'est la longueur du contour."),
    trois("Comparer des périmètres au compas", "reporter au compas les côtés d'un polygone sur une droite pour obtenir un segment de la longueur de son périmètre.",
      "Deux polygones : lequel a le plus grand périmètre, sans règle graduée ?",
      "Au compas, on prend un côté, on le reporte sur la demi-droite, puis le suivant au bout… Le tour se déroule sur la ligne ; on compare les segments obtenus.",
      "Ce qu'on retient : le compas reporte des longueurs.", "Montre la tenue du compas : on le prend par la tête, sans changer l'écartement."),
    trois("Mesurer le périmètre", "déterminer le périmètre d'un polygone en mesurant chacun de ses côtés.",
      "Combien mesure le tour de ce polygone ? On mesure chaque côté.",
      "Des polygones à mesurer ; on ajoute les longueurs, et on vérifie au compas pour l'un d'eux.",
      "La trace écrite : périmètre = somme des longueurs des côtés."),
    trois("Le carré et le rectangle", "déterminer le périmètre d'un carré ou d'un rectangle sans mesurer tous ses côtés.",
      "Faut-il mesurer les quatre côtés d'un carré ? D'un rectangle ?",
      "Des carrés et des rectangles : on mesure ce qui suffit, on justifie avec les propriétés.",
      "Ce qu'on retient : les côtés opposés d'un rectangle ont la même longueur, ceux d'un carré sont tous égaux — sans formule."),
    evaluation("comparer et déterminer des périmètres", "Ensuite, le périmètre dans les problèmes."),
  ],
};

// ── Les masses ────────────────────────────────────────────────────────────

const MASSES_CP: Demarche = {
  id: "masses-cp", nom: "Lourd, léger : comparer des masses (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Les situations sur les masses s'appuient toutes sur des manipulations : le lexique lourd, léger ; soupeser deux ou trois objets d'apparence identique — des boîtes ou des bouteilles opaques — de masses clairement différentes ; ordonner deux ou trois objets avec une balance de type Roberval, par comparaison deux à deux.",
  seances: [
    trois("Soupeser", "comparer les masses de deux objets d'apparence identique en les soupesant, et dire lequel est le plus lourd.",
      "Deux boîtes pareilles : pèsent-elles pareil ? On les soupèse, une dans chaque main.",
      "Des boîtes opaques identiques, remplies de sable, de coton, de billes : on soupèse, on dit plus lourd, plus léger ; puis trois boîtes.",
      "Les mots : lourd, léger ; plus lourd que, plus léger que.", "Prévois un gros objet léger et un petit objet lourd : le plus gros n'est pas toujours le plus lourd."),
    trois("La balance", "comparer les masses de deux objets avec une balance de type Roberval.",
      "Quand on hésite en soupesant, la balance tranche : le plateau qui descend porte l'objet le plus lourd.",
      "Par groupes, comparer deux objets sur la balance, et vérifier ce qu'on avait trouvé en soupesant.",
      "La trace écrite : le dessin de la balance qui penche."),
    trois("Ranger trois objets", "ordonner les masses de deux ou trois objets par comparaison deux à deux avec la balance.",
      "Trois boîtes : laquelle est la plus légère ? On ne peut en mettre que deux sur la balance.",
      "Des pesées deux à deux, puis on range ; on lit des dessins de balances.",
      "Ce qu'on retient : si A est plus lourd que B, et B plus lourd que C, alors A est plus lourd que C."),
    evaluation("comparer et ranger des objets selon leur masse", "Ensuite, au CE1, peser en grammes et en kilogrammes."),
  ],
};

const MASSES_CE1: Demarche = {
  id: "masses-ce1", nom: "Les masses : le gramme et le kilogramme (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${MASSES}`,
  resume: "Identifier l'objet le plus léger ou le plus lourd parmi trois ou quatre, en soupesant ou avec une balance de type Roberval ; peser des objets avec des masses marquées ; 1 kg = 1 000 g ; ordonner des masses écrites autrement — 1 kg et 300 g ; 1 000 g ; 50 kg ; 2 kg et 100 g — ; des masses de référence pour estimer : un paquet de sucre pèse 1 kg, un sachet de levure environ 10 g. La séance du kilogramme suit l'activité « Masses » d'Éduscol.",
  seances: [
    trois("Le plus lourd, le plus léger", "identifier l'objet le plus léger ou le plus lourd parmi trois ou quatre, en soupesant ou avec une balance.",
      "Quatre objets de volumes proches : lequel est le plus lourd ? On soupèse, on hésite.",
      "Des pesées deux à deux à la balance Roberval ; on range ; des dessins de balances à lire.",
      "Ce qu'on retient : comparer deux à deux suffit pour ranger."),
    trois("Peser avec des masses marquées", "déterminer la masse d'un objet en grammes avec une balance et des masses marquées.",
      "La balance en équilibre : l'objet pèse autant que les masses marquées de l'autre plateau.",
      "Peser des objets de la classe ; noter les masses posées, les ajouter.",
      "La trace écrite : le gramme, g.", "La mesure est approchée : l'équilibre parfait ne s'obtient pas toujours, comme un segment qui tombe entre deux graduations."),
    seance("Le kilogramme", sauront("que 1 kg est égal à 1 000 g, et quelques objets qui pèsent environ un kilogramme."), 55, [
      ph(T1, "15 min", "« Max dit : « Toutes ces choses pèsent pareil ! ». Lola n'est pas d'accord. Qui a raison ? » Des objets d'environ un kilogramme, de tailles et de matières différentes, dans des sachets transparents : on les nomme, on les soupèse, on les range."),
      ph(T2, "15 min", "Vérifier le rangement à la balance, deux à deux ; puis peser chaque objet avec les masses marquées (deux de 500 g, aucune d'un kilogramme).",
        "Le mot « poids » des élèves peut être accepté ; l'enseignant dit « masse »."),
      ph(T3, "15 min", "Le tableau des pesées : 995 g ou 1 041 g, c'est presque 1 000 g, donc presque 1 kg. 1 kg = 1 000 g ; un litre d'eau, un paquet de sucre pèsent 1 kg ; deux cents feuilles de papier, cinq pommes, environ 1 kg."),
      ph(T4, "10 min", "La trace écrite : « Un kilogramme, c'est 1 000 grammes. Selon les objets, un kilogramme prend plus ou moins de place. »"),
    ]),
    trois("Comparer et ordonner des masses", "comparer et ordonner des masses exprimées en grammes ou en kilogrammes.",
      "1 kg et 300 g ; 1 000 g ; 50 kg ; 2 kg et 100 g : dans quel ordre ?",
      "Comparer avec <, > ou = ; ranger quatre masses écrites autrement.",
      "La méthode : écrire dans la même unité."),
    trois("Estimer des masses", "estimer la masse d'un objet du quotidien en la comparant à des masses connues.",
      "Ce qu'on sait : un paquet de sucre pèse 1 kg, un sachet de levure environ 10 g.",
      "Estimer, puis peser pour vérifier ; choisir la masse vraisemblable : le cartable, 40 g, 400 g, 4 kg ou 40 kg ?",
      "L'affiche des masses de référence de la classe."),
    evaluation("comparer, peser, ordonner et estimer des masses", "Ensuite, les masses dans les problèmes ; les références, en calcul mental."),
  ],
};

const MASSES_CE2: Demarche = {
  id: "masses-ce2", nom: "Les masses : g, kg et tonne (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${MASSES}`,
  resume: "Comparer et ordonner les masses de trois ou quatre objets, avec une balance de type Roberval ou à partir de leurs masses en kilogrammes, grammes ou tonnes ; convertir par les relations connues — 1 kg = 1 000 g, donc 5 462 g = 5 kg + 462 g ; 1 t = 1 000 kg, donc 5 350 kg = 5 t 350 kg — ; choisir l'unité ; des masses de référence pour estimer : une feuille de papier, une pomme, un dictionnaire, un seau d'eau, une voiture.",
  seances: [
    trois("Comparer et ordonner", "comparer et ordonner les masses de trois ou quatre objets avec une balance de type Roberval.",
      "Quatre objets, une balance : comment les ranger avec le moins de pesées ?",
      "Des pesées deux à deux ; des dessins de balances à lire ; le rangement.",
      "Ce qu'on retient : les pesées deux à deux, et ce qu'on en déduit."),
    trois("Peser en grammes et en kilogrammes", "déterminer une masse avec des masses marquées et l'écrire en kilogrammes et en grammes.",
      "Le melon pèse 1 kg, 200 g et 50 g : combien en tout ?",
      "Des pesées, des masses marquées à ajouter ; écrire 1 kg 250 g ou 1 250 g.",
      "La trace écrite : 1 kg = 1 000 g ; 5 462 g = 5 kg + 462 g."),
    trois("La tonne", "savoir que 1 t = 1 000 kg et convertir des masses : 5 350 kg = 5 t 350 kg.",
      "Une voiture, un éléphant, un camion : en kilogrammes, les nombres sont grands. La tonne.",
      "Des conversions par les relations connues ; des masses à comparer.",
      "La trace écrite : 1 t = 1 000 kg ; pas de tableau de conversion."),
    trois("Choisir l'unité", "choisir l'unité la mieux adaptée pour exprimer une masse : le gramme, le kilogramme ou la tonne.",
      "Une feuille de papier en tonnes ? Une voiture en grammes ?",
      "Des masses à compléter avec leur unité ; on justifie.",
      "Ce qu'on retient : chaque unité a ses objets."),
    trois("Des masses de référence", "estimer la masse d'un objet en s'appuyant sur des masses de référence.",
      "Une feuille de papier, une pomme, un dictionnaire, un seau d'eau, une voiture : combien pèsent-ils ?",
      "Estimer, choisir la masse vraisemblable, vérifier en pesant quand c'est possible.",
      "L'affiche des masses de référence s'enrichit."),
    evaluation("comparer, convertir et estimer des masses", "Ensuite, les masses dans les problèmes."),
  ],
};

// ── Les contenances ───────────────────────────────────────────────────────

const CONTENANCES_CE2: Demarche = {
  id: "contenances-ce2", nom: "Les contenances : litre, décilitre, centilitre (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Comparer des contenances, perceptivement quand elles sont clairement distinctes, par transvasements, puis avec un étalon — le nombre de verres que contient chacun de deux récipients — ; mesurer en litres, décilitres et centilitres avec un verre gradué ou une bouteille d'un litre ou d'un demi-litre ; 1 L = 10 dL = 100 cL, et 780 cL = 7 L + 80 cL ; estimer la contenance d'un verre, d'une bouteille, d'un arrosoir. Des références : la brique de lait pour le litre, la canette pour 33 cL.",
  seances: [
    trois("Comparer par transvasement", "comparer les contenances de deux ou trois récipients par des transvasements.",
      "Une bouteille haute et étroite, un saladier large : lequel contient le plus ? On ne se fie pas à la hauteur.",
      "Par groupes, avec de l'eau ou du riz : remplir l'un, verser dans l'autre ; il déborde, ou il en reste.",
      "Ce qu'on retient : la contenance, c'est ce qu'un récipient peut contenir."),
    trois("Combien de verres ?", "comparer des contenances en les mesurant avec un étalon : le nombre de verres.",
      "Trois récipients, un seul verre : combien de verres pour remplir chacun ?",
      "On remplit, on compte les verres, on range les récipients ; combien de verres de plus ?",
      "Ce qu'on retient : avec le même verre, plus il y a de verres, plus le récipient contient."),
    trois("Le litre", "mesurer une contenance en litres avec une bouteille d'un litre ou d'un demi-litre.",
      "La bouteille d'un litre, la brique de lait : le litre. Combien de litres dans le seau ?",
      "Mesurer des récipients en litres et en demi-litres ; estimer avant de mesurer.",
      "La trace écrite : le litre, L ; deux demi-litres font un litre."),
    trois("Décilitre et centilitre", "connaître le décilitre et le centilitre et savoir que 1 L = 10 dL = 100 cL.",
      "Le verre gradué : dix décilitres dans un litre ; la canette, 33 cL.",
      "Mesurer au verre gradué ; des conversions : 780 cL = 700 cL + 80 cL = 7 L + 80 cL.",
      "La trace écrite : 1 L = 10 dL = 100 cL ; 1 dL = 10 cL."),
    trois("Estimer, choisir l'unité", "estimer la contenance d'un récipient de la vie courante et choisir l'unité qui convient.",
      "Un verre, une bouteille, un arrosoir, une baignoire : combien contiennent-ils ?",
      "Choisir la contenance vraisemblable ; compléter avec L, dL ou cL.",
      "L'affiche des contenances de référence, avec les vrais récipients."),
    evaluation("comparer, mesurer, convertir et estimer des contenances", "Ensuite, les contenances dans les problèmes."),
  ],
};

// ── La monnaie ────────────────────────────────────────────────────────────

const MONNAIE_CP: Demarche = {
  id: "monnaie-cp", nom: "La monnaie : compter, payer, rendre (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GUIDE_CP}`,
  resume: "Introduite en période 2 ou 3, après le matériel multibase : un billet de dix euros n'apparaît pas comme un groupe de dix pièces d'un euro. Des montants entiers d'euros, jusqu'à cent : le lexique (pièce, billet, somme, plus cher, moins cher, rendre la monnaie) ; la valeur d'un ensemble de pièces et de billets, en organisant la monnaie par groupes de dix euros ; comparer par la valeur, non par le nombre de pièces ; constituer une somme, avec des contraintes ; des achats simulés avec des pièces et des billets fictifs, avant d'anticiper par le calcul.",
  seances: [
    trois("Pièces et billets", "reconnaître les pièces et les billets en euros, et savoir que dix pièces de 1 € ont la même valeur qu'un billet de 10 €.",
      "La caisse de la classe : des pièces et des billets pour jouer. On les nomme : une pièce de 2 €, un billet de 10 €.",
      "Échanger : dix pièces de 1 € contre un billet de 10 € ; un billet de 10 € contre deux billets de 5 €… Comme dix cubes contre une barre — mais le billet n'est pas fait de dix pièces.",
      "Les mots : pièce, billet, euro, somme ; 10 pièces de 1 € valent 1 billet de 10 €."),
    trois("Combien d'argent ?", "déterminer la valeur d'un ensemble de pièces et de billets en organisant la monnaie par groupes de dix euros.",
      "Un porte-monnaie renversé sur la table : combien d'argent ? Par où commencer ?",
      "Des porte-monnaie à compter : les billets d'abord, puis on fait des groupes de dix euros avec les pièces.",
      "La méthode : organiser la monnaie pour compter."),
    trois("Qui a le plus d'argent ?", "comparer deux ensembles de pièces et de billets par leur valeur, et non par leur nombre.",
      "Léo a sept pièces, Inès a deux billets : qui a le plus d'argent ?",
      "Des paires de porte-monnaie à comparer ; on compte la valeur de chacun.",
      "Ce qu'on retient : beaucoup de pièces, ce n'est pas forcément beaucoup d'argent."),
    trois("Payer juste", "constituer une somme donnée, avec des contraintes : le moins de pièces et de billets possible, sans pièce de 1 €.",
      "« Produire 48 € en utilisant le moins de pièces possible et le moins de billets possible. »",
      "Des sommes à constituer avec le matériel, puis avec des contraintes : « Produire 56 € […] sans utiliser de pièces de 1 €. »",
      "On compare les façons de faire : les réponses dépendent des pièces et des billets dont on dispose."),
    trois("À la marchande", "simuler des achats, payer plusieurs objets et rendre la monnaie.",
      "La marchande de la classe : des objets et leurs prix. Payer deux objets séparément, ou d'abord chercher leur valeur totale ?",
      "Par groupes, acheter, payer, rendre la monnaie avec les pièces et les billets fictifs ; puis prévoir avant de manipuler : combien la marchande va-t-elle rendre ?",
      "Les mots : plus cher, moins cher, rendre la monnaie, reste."),
    evaluation("trouver la valeur d'un ensemble de pièces et de billets, constituer une somme et rendre la monnaie", "Ensuite, la monnaie dans les problèmes, toute l'année."),
  ],
};

const MONNAIE_CE1: Demarche = {
  id: "monnaie-ce1", nom: "Euros et centimes (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GUIDE_CP}`,
  resume: "Les centimes d'euro, au plus tard en période 2 : une pièce d'un euro a la même valeur que cent pièces d'un centime ; la valeur d'un ensemble de pièces et de billets en euros et centimes ; comparer et ordonner des prix quelle que soit leur écriture — 12 €, c'est plus que 60 centimes, bien que 12 soit plus petit que 60 — ; constituer une somme sans pièce de 1 €, pour faire les euros avec des centimes ; rendre la monnaie. Le travail se poursuit à chaque période, en activités ritualisées.",
  seances: [
    trois("100 centimes = 1 €", "savoir qu'une pièce d'un euro a la même valeur que cent centimes, et faire 1 € de différentes façons.",
      "Les pièces de centimes : 1, 2, 5, 10, 20, 50 centimes. Combien en faut-il pour faire un euro ?",
      "Faire 1 € de plusieurs façons, avec les pièces fournies ; dix pièces de 10 centimes valent un euro.",
      "La trace écrite : 1 € = 100 centimes."),
    trois("Combien d'argent ?", "exprimer la valeur d'un ensemble de pièces et de billets en euros et en centimes.",
      "Des pièces d'euros et de centimes mêlées : combien en tout ?",
      "Des porte-monnaie à compter : les euros, puis les centimes ; 100 centimes font encore un euro.",
      "Ce qu'on retient : un nombre final de centimes plus petit que 100."),
    trois("Comparer, ranger des prix", "comparer des sommes et ordonner des prix quelle que soit leur écriture.",
      "Trois pièces de 2 €, ou 50 pièces de 10 centimes : qui a le plus ? 12 € ou 60 centimes ?",
      "Comparer des porte-monnaie ; ranger quatre prix écrits de façons différentes.",
      "Ce qu'on retient : comparer des valeurs, pas des nombres de pièces ni des nombres seuls."),
    trois("Constituer une somme", "constituer une somme donnée avec des euros et des centimes, même sans pièce de 1 €.",
      "Payer 3 € 40 c sans pièce de 1 € : comment faire ?",
      "Des sommes à constituer ; l'absence de pièces de 1 € oblige à faire les euros avec des pièces de 10, 20 ou 50 centimes.",
      "On compare les façons de payer."),
    trois("Rendre la monnaie", "rendre la monnaie lors d'un achat simulé.",
      "Un croissant à 95 c, payé avec une pièce de 2 € : que rend-on ?",
      "Des achats simulés avec la monnaie fictive, puis prévus par le calcul.",
      "La méthode : compléter jusqu'à ce qui a été donné."),
    evaluation("compter, comparer, constituer des sommes en euros et centimes, et rendre la monnaie", "Ensuite, en période 3, l'écriture à virgule."),
  ],
};

const MONNAIE_VIRGULE_CE1: Demarche = {
  id: "monnaie-virgule-ce1", nom: "L'écriture à virgule d'une somme d'argent (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "À partir de la période 3, de façon pratique et concrète, sans les mots dixième ou centième : la virgule est le signe qui repère le chiffre des unités d'euro. 2 € et 17 centimes s'écrit aussi 2,17 € ; 2 € et 5 centimes s'écrit 2,05 €, qu'on distingue de 2,50 € ; 85 centimes = 0,85 € ; 17 € = 17,00 € ; 1 € et 120 centimes = 2,20 €. Les rangs : centime, dizaine de centimes, centaine de centimes égale à un euro, dizaine d'euros.",
  seances: [
    trois("La virgule repère les euros", "écrire une somme en euros et centimes avec une virgule : 2 € et 17 centimes s'écrit 2,17 €.",
      "Des étiquettes de prix du magasin : 2,17 €. Que veut dire la virgule ?",
      "Passer d'une écriture à l'autre, dans les deux sens, avec la monnaie fictive pour vérifier.",
      "La trace écrite : avant la virgule, les euros ; après, les centimes."),
    trois("2,05 € ou 2,50 € ?", "distinguer l'écriture de « deux euros et cinq centimes » de celle de « deux euros et cinquante centimes ».",
      "2 € et 5 centimes : 2,5 € ? 2,05 € ? On montre les pièces.",
      "Des sommes à écrire, dont des centimes à un seul chiffre ; 17 € = 17,00 €.",
      "Ce qu'on retient : toujours deux chiffres après la virgule pour les centimes."),
    trois("Des centimes aux euros", "convertir des centimes en euros et centimes : 345 centimes = 3 € + 45 centimes = 3,45 €.",
      "200 centimes = 2 × 100 centimes = 2 € : et 345 centimes ?",
      "Des conversions dans les deux sens ; 85 centimes = 0,85 € ; 1 € et 120 centimes = 2,20 €.",
      "La trace écrite : 100 centimes = 1 €, encore et toujours."),
    trois("Ranger des prix", "ordonner des prix écrits avec ou sans virgule.",
      "2,50 € ; 250 centimes ; 2 € et 5 centimes ; 2,05 € : lesquels sont égaux ? Lequel est le plus cher ?",
      "Ranger des prix écrits de différentes façons ; les comparer.",
      "La méthode : écrire tous les prix de la même façon."),
    evaluation("écrire une somme d'argent avec une virgule et passer d'une écriture à l'autre", "Ensuite, au CE2, poser des additions et des soustractions de montants en euros."),
  ],
};

const MONNAIE_CE2: Demarche = {
  id: "monnaie-ce2", nom: "Acheter, rendre la monnaie (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Au CE2, la monnaie est un point d'appui pour l'écriture à virgule, utilisée dès la période 1 dans des exercices et des problèmes. Constituer un montant avec des pièces et des billets, les quantités disponibles servant de contraintes ; rendre la monnaie par ajouts successifs : sur 5 € pour un achat de 3,68 €, « le complément à 100 de 68 est 32, donc je rends 32 centimes pour arriver à 4 €, plus 1 € pour arriver à 5 € ». La manipulation de monnaie fictive permet de contrôler les résultats.",
  seances: [
    trois("Euros et centimes, à nouveau", "compter une somme d'argent et l'écrire avec une virgule.",
      "Des porte-monnaie et des étiquettes : on retrouve l'écriture à virgule du CE1.",
      "Compter des sommes, les écrire avec une virgule ; passer d'une écriture à l'autre.",
      "La trace écrite : centime, dizaine de centimes, euro, dizaine d'euros."),
    trois("Constituer un montant", "constituer un montant donné avec des pièces et des billets, avec des contraintes.",
      "Payer 37,45 € avec le moins de pièces et de billets possible.",
      "Des montants à constituer avec la monnaie fictive, avec ou sans certaines pièces.",
      "On compare les solutions."),
    trois("Rendre la monnaie par ajouts successifs", "rendre la monnaie en complétant jusqu'à l'euro, puis jusqu'à ce qui a été donné.",
      "Un achat de 3,68 €, payé avec un billet de 5 € : « Le complément à 100 de 68 est 32, donc je rends 32 centimes pour arriver à 4 €, plus 1 € pour arriver à 5 €. »",
      "Des achats à la marchande, puis sur la feuille ; on vérifie avec la monnaie fictive.",
      "La méthode des ajouts successifs, écrite."),
    trois("Des problèmes d'achats", "résoudre des problèmes d'achats : payer plusieurs articles et rendre la monnaie.",
      "Deux articles, un billet : combien rend-on ? D'abord le total, puis la monnaie.",
      "Des problèmes d'achats à une ou deux étapes ; l'addition posée des montants quand le calcul mental ne suffit pas.",
      "On compare les démarches."),
    evaluation("constituer un montant et rendre la monnaie", "Ensuite, l'addition et la soustraction posées de montants en euros."),
  ],
};

// ── L'heure et les durées ─────────────────────────────────────────────────

const HEURE_CP: Demarche = {
  id: "heure-cp", nom: "Lire l'heure : les heures entières (CP)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "En lien avec « Questionner le monde », et limité aux heures entières : lire sur une horloge à aiguilles trois heures, neuf heures, mais aussi midi ; placer les aiguilles pour une heure donnée du matin ou de l'après-midi ; associer des actions familières — se lever, aller à l'école, déjeuner — à des heures affichées sur des horloges.",
  seances: [
    trois("L'horloge et ses aiguilles", "reconnaître la petite aiguille des heures et la grande aiguille des minutes.",
      "Une grande horloge à aiguilles : deux aiguilles, douze nombres. Que montre chacune ?",
      "Faire tourner les aiguilles d'une horloge de la classe : quand la grande fait un tour, la petite avance d'un nombre.",
      "Ce qu'on retient : la petite aiguille montre l'heure ; à l'heure pile, la grande est sur le 12."),
    trois("Lire les heures entières", "lire une heure entière sur une horloge à aiguilles : trois heures, neuf heures, midi.",
      "La grande aiguille sur le 12 : il est quelle heure ?",
      "Des horloges à lire ; on dit l'heure, puis on l'écrit.",
      "La trace écrite : lire une heure pile."),
    trois("Placer les aiguilles", "positionner les aiguilles d'une horloge pour une heure entière donnée.",
      "Il est 4 heures : où mettre la petite aiguille ? et la grande ?",
      "Des cadrans où dessiner les aiguilles ; par deux, l'un dit une heure, l'autre la montre sur l'horloge.",
      "Ce qu'on retient : la petite aiguille, plus courte, montre les heures."),
    trois("Les moments de la journée", "associer des actions familières à des heures affichées sur des horloges.",
      "Je me lève, je vais à l'école, je déjeune : à quelle heure ?",
      "Relier des moments de la journée à leurs horloges ; les heures du matin et de l'après-midi.",
      "L'affiche de la journée de la classe, avec ses horloges."),
    evaluation("lire et placer des heures entières, et les associer aux moments de la journée", "Ensuite, au CE1, la demi-heure et les quarts d'heure."),
  ],
};

const HEURE_CE1: Demarche = {
  id: "heure-ce1", nom: "Lire l'heure : demi-heures et quarts d'heure (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Le travail sur les heures s'étend aux heures entières supérieures à douze, à la demi-heure et aux quarts d'heure, en lien avec les fractions : lire et placer les aiguilles en heures entières, en heures et demie, en heures et quart ; distinguer les heures du matin et celles de l'après-midi — « trois heures du matin », « trois heures de l'après-midi » ; « 2 heures et quart » l'après-midi, c'est 14 h 15, « 14 : 15 » sur une horloge digitale.",
  seances: [
    trois("La demi-heure", "lire et dire une heure et demie sur une horloge à aiguilles.",
      "La grande aiguille sur le 6 : elle a fait la moitié du tour. Une demi-heure.",
      "Des horloges à lire en heures et demies ; la petite aiguille est entre deux nombres.",
      "La trace écrite : une demi-heure, la moitié d'une heure ; 3 h 30, trois heures et demie."),
    trois("Les quarts d'heure", "lire une heure et quart et une heure moins le quart.",
      "La grande aiguille sur le 3 : un quart du tour. Sur le 9 : trois quarts.",
      "Des horloges à lire en quarts d'heure : 7 h 15, sept heures et quart ; 7 h 45.",
      "La trace écrite : un quart d'heure, le quart d'une heure."),
    trois("Placer les aiguilles", "positionner les aiguilles pour une heure donnée en heures entières, demies ou quarts d'heure.",
      "Il est 9 h 15 : où est la petite aiguille ? Pas tout à fait sur le 9.",
      "Des cadrans à compléter ; on échange et on vérifie.",
      "Ce qu'on retient : la petite aiguille avance avec la grande."),
    trois("Le matin et l'après-midi", "distinguer les heures du matin et celles de l'après-midi : 3 heures de l'après-midi, c'est 15 h.",
      "Trois heures du matin, trois heures de l'après-midi : la même horloge, deux heures différentes.",
      "Lire chaque horloge le matin, puis l'après-midi ; l'horloge digitale : 14 : 15.",
      "La trace écrite : après midi, on ajoute 12 : 2 heures de l'après-midi, c'est 14 h."),
    evaluation("lire et placer l'heure en heures entières, demies et quarts d'heure, le matin et l'après-midi", "Ensuite, les durées en heures et minutes."),
  ],
};

const DUREES_CE1: Demarche = {
  id: "durees-ce1", nom: "Les durées : heures et minutes (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Les unités heure et minute (h et min) et leurs relations : 1 heure = 60 minutes, une demi-heure = 30 minutes, un quart d'heure = 15 minutes ; trois quarts d'heure, c'est trois fois un quart d'heure. Mesurer la durée écoulée entre deux instants d'une même journée affichés sur une horloge — entre 8 h 30 et 8 h 45, entre 15 h 45 et 16 h 15 —, comparer des durées comme 2 heures et 130 minutes, ajouter des durées : « Mamie a passé un quart d'heure à tailler ses rosiers et une demi-heure à bêcher son potager. »",
  seances: [
    trois("Heures et minutes", "connaître les unités heure et minute et leurs relations : 1 h = 60 min.",
      "« J'ai mis cinq minutes pour réaliser cet exercice » ; « Je suis resté deux heures à la piscine » : on parle de durées.",
      "La grande aiguille fait le tour en une heure, 60 minutes ; un demi-tour, 30 minutes ; un quart de tour, 15 minutes. Deux quarts d'heure font une demi-heure.",
      "La trace écrite : 1 h = 60 min ; une demi-heure = 30 min ; un quart d'heure = 15 min."),
    trois("La durée entre deux horloges", "mesurer la durée écoulée entre deux instants affichés sur une horloge.",
      "La récréation commence à 10 h 15 et finit à 10 h 30 : combien de temps dure-t-elle ?",
      "Deux horloges, le début et la fin : on fait avancer les aiguilles d'une horloge de la classe et on compte les quarts d'heure.",
      "La méthode : avancer d'heure en heure, puis de quart d'heure en quart d'heure."),
    trois("Comparer des durées", "comparer des durées : 2 heures et 130 minutes ; de 8 h 30 à 8 h 45, et de 15 h 45 à 16 h 15.",
      "Qu'est-ce qui dure le plus longtemps : 2 heures ou 130 minutes ?",
      "Des durées à comparer, en les écrivant dans la même unité ; des durées lues sur des horloges.",
      "Ce qu'on retient : 1 heure = 60 minutes, pour comparer."),
    trois("Ajouter des durées", "ajouter ou soustraire des durées pour résoudre un problème.",
      "« Mamie a passé un quart d'heure à tailler ses rosiers et une demi-heure à bêcher son potager. Combien de temps est-elle restée dans le jardin ? »",
      "Des problèmes de durées en quarts d'heure et demi-heures ; on s'aide de l'horloge.",
      "On compare les démarches."),
    evaluation("mesurer, comparer et ajouter des durées", "Ensuite, les durées dans les problèmes et en « Questionner le monde »."),
  ],
};

const HEURE_CE2: Demarche = {
  id: "heure-ce2", nom: "Lire l'heure à la minute près (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Lire l'heure sur un cadran à aiguilles ou un affichage digital — huit heures et demie, dix heures trente-cinq, sept heures moins le quart, quatre heures moins vingt, quinze heures quarante-deux, midi — ; placer les aiguilles des heures et des minutes : cinq heures et quart, deux heures et demie, treize heures vingt, quatre heures moins le quart, six heures dix-huit minutes.",
  seances: [
    trois("De cinq en cinq minutes", "lire l'heure de cinq en cinq minutes sur une horloge à aiguilles.",
      "Chaque nombre du cadran vaut cinq minutes pour la grande aiguille : sur le 7, 35 minutes.",
      "Des horloges à lire, les minutes écrites autour du cadran pour commencer, puis sans.",
      "La trace écrite : compter de 5 en 5 avec la grande aiguille."),
    trois("Moins le quart, moins vingt", "dire une heure de deux façons : 3 h 45 ou quatre heures moins le quart ; 3 h 40 ou quatre heures moins vingt.",
      "Sept heures moins le quart : est-ce avant ou après sept heures ?",
      "Lire des horloges et dire l'heure de deux façons ; le matin et l'après-midi : 15 h 42.",
      "Ce qu'on retient : après la demie, on peut compter ce qui manque pour l'heure suivante."),
    trois("À la minute près", "lire l'heure à la minute près sur un cadran à aiguilles et sur un affichage digital.",
      "Entre deux nombres du cadran, quatre petits traits : les minutes.",
      "Des horloges à lire à la minute près ; les écrire comme sur un affichage digital.",
      "La trace écrite : lire les minutes."),
    trois("Placer les aiguilles", "positionner les aiguilles des heures et des minutes pour une heure donnée : treize heures vingt, six heures dix-huit minutes.",
      "Il est quatre heures moins le quart : où va la petite aiguille ?",
      "Des cadrans où dessiner les deux aiguilles ; on vérifie par deux.",
      "Ce qu'on retient : la petite aiguille se place entre deux heures."),
    evaluation("lire l'heure et placer les aiguilles à la minute près", "Ensuite, les durées et leurs problèmes."),
  ],
};

const DUREES_CE2: Demarche = {
  id: "durees-ce2", nom: "Durées et problèmes de durées (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${GRANDEURS}`,
  resume: "Mesurer et comparer des durées écoulées entre deux instants d'une même journée — entre 8 h 30 et 8 h 50, entre 15 h 40 et 16 h 05 — ; le nombre de minutes dans deux heures et vingt minutes ; un axe du temps orienté pour placer des instants et repérer une durée ; des problèmes à une ou deux étapes : Lucie partie à 8 h 30 et rentrée à 12 h 30, le train parti à 7 h 10 qui arrive à la deuxième gare.",
  seances: [
    trois("La durée entre deux horloges", "déterminer la durée écoulée entre deux instants affichés sur des horloges, et comparer des durées.",
      "De 8 h 30 à 8 h 50, et de 15 h 40 à 16 h 05 : laquelle de ces durées est la plus longue ?",
      "Des paires d'horloges : on compte jusqu'à l'heure ronde, puis les minutes.",
      "La méthode, écrite : par l'heure ronde."),
    trois("L'axe du temps", "placer des instants sur un axe du temps orienté et y repérer une durée.",
      "« Lucie est partie de chez elle à 8 h 30. Elle est rentrée à 12 h 30. Combien de temps est-elle sortie ? » On dessine l'axe.",
      "Placer le départ, le retour, la durée ; puis : « Lucie est sortie pendant 4 heures. Elle est rentrée à 12 h 30. À quelle heure est-elle partie ? »",
      "Ce qu'on retient : l'axe montre ce qu'on cherche — un instant ou une durée."),
    trois("Problèmes à une étape", "résoudre un problème où l'on cherche une durée, un début ou une fin.",
      "Le film commence à 14 h 15 et dure 1 h 50 : à quelle heure finit-il ?",
      "Des problèmes à une étape, avec l'axe du temps ; combien de minutes dans deux heures et vingt minutes ?",
      "On compare les démarches."),
    trois("Problèmes à deux étapes", "résoudre un problème de durées à deux étapes.",
      "« Le train est parti à 7 h 10. Il a mis 1 heure et 30 minutes pour arriver à la première gare et il est arrivé à la deuxième gare 40 minutes plus tard. À quelle heure le train est-il arrivé dans la deuxième gare ? »",
      "Des problèmes à deux étapes ; chaque étape sur l'axe du temps.",
      "La trace écrite : un problème résolu, l'axe et les calculs."),
    evaluation("mesurer des durées et résoudre des problèmes de durées", "Ensuite, les durées en « Questionner le monde » et dans les problèmes."),
  ],
};

export const DEMARCHES_GRANDEURS: Demarche[] = [
  LONGUEURS_COMPARER_CP, LONGUEURS_MESURER_CP, LONGUEURS_MESURER_CE1, LONGUEURS_UNITES_CE1, LONGUEURS_UNITES_CE2, MESURER_TRACER_CE2, PERIMETRE_CE2,
  MASSES_CP, MASSES_CE1, MASSES_CE2, CONTENANCES_CE2,
  MONNAIE_CP, MONNAIE_CE1, MONNAIE_VIRGULE_CE1, MONNAIE_CE2,
  HEURE_CP, HEURE_CE1, DUREES_CE1, HEURE_CE2, DUREES_CE2,
];

/**
 * La séquence d'une compétence des grandeurs et mesures, à sa classe ; rien
 * sinon. `cg` : la compétence générale — « les longueurs », « la monnaie »… ;
 * le tout en minuscules sans accents.
 */
export function demarcheDesGrandeurs(classe: string, cg: string, comp: string): string | null {
  if (/longueurs/.test(cg)) {
    if (classe === "cp") return /lexique|comparer des (objets|segments)/.test(comp) ? "longueurs-comparer-cp" : "longueurs-mesurer-cp";
    if (classe === "ce1") return /unites metre|unite la mieux adaptee|relations entre les unites/.test(comp) ? "longueurs-unites-ce1" : "longueurs-mesurer-ce1";
    if (classe === "ce2") return /perimetre/.test(comp) ? "perimetre-ce2" : /tracer un segment/.test(comp) ? "mesurer-tracer-ce2" : "longueurs-unites-ce2";
  }
  if (/masses/.test(cg)) return classe === "cp" ? "masses-cp" : `masses-${classe}`;
  if (/contenances/.test(cg)) return classe === "ce2" ? "contenances-ce2" : null;
  if (/monnaie/.test(cg)) {
    if (classe === "cp") return "monnaie-cp";
    if (classe === "ce1") return /ecriture a virgule/.test(comp) ? "monnaie-virgule-ce1" : "monnaie-ce1";
    if (classe === "ce2") return /montants en euro/.test(comp) ? "posees-ce2" : "monnaie-ce2";
  }
  if (/reperage dans le temps/.test(cg)) {
    if (classe === "cp") return "heure-cp";
    return /duree/.test(comp) ? `durees-${classe}` : `heure-${classe}`;
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const monnaie = (seance: number, titre: string, r: Partial<ReglagesMonnaie>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_MONNAIE, ...r };
  return {
    seance, atelier: "monnaie", titre,
    fabriquer: (g) => ({ html: htmlMonnaie(reglages, g), style: STYLE_FEUILLE + STYLE_MONNAIE, refaire: { monnaie: reglages } }),
  };
};
const mesures = (seance: number, titre: string, r: Partial<ReglagesMesures>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_MESURES, ...r };
  return {
    seance, atelier: "mesures", titre,
    fabriquer: (g) => ({ html: htmlMesures(reglages, g), style: STYLE_FEUILLE + STYLE_MESURES, refaire: { mesures: reglages } }),
  };
};
const heure = (seance: number, titre: string, r: Partial<ReglagesHeure>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_HEURE, ...r };
  return {
    seance, atelier: "heure", titre,
    fabriquer: (g) => ({ html: htmlAtelierHeure(reglages, g), style: STYLE_FEUILLE + STYLE_HEURE + STYLE_DUREES, refaire: { heure: reglages } }),
  };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "longueurs-comparer-cp": {
    feuilles: [
      mesures(2, "Le plus long crayon", { exercice: "comparerObjets", classe: "CP", combien: 5 }),
      mesures(3, "Comparer des segments", { exercice: "comparerSegments", classe: "CP", combien: 4 }),
      mesures(4, "Comparer des segments — évaluation", { exercice: "comparerSegments", classe: "CP", combien: 5 }),
    ],
    materiel: ["Des baguettes, des bandelettes, des rubans", "Des ficelles et des bandelettes de papier", "Cinq bandelettes de longueurs voisines par groupe", "Des bandes de papier ; des étalons", "Des bandes de papier"],
  },
  "longueurs-mesurer-cp": {
    feuilles: [
      mesures(1, "Mesurer des segments", { exercice: "mesurer", classe: "CP", combien: 5 }),
      mesures(2, "Tracer des segments", { exercice: "tracer", classe: "CP", combien: 5 }),
      mesures(3, "Le mètre : 1 m = 100 cm", { exercice: "convertir", grandeur: "longueur", classe: "CP", combien: 6 }),
      mesures(4, "Estimer : la bonne mesure", { exercice: "estimer", grandeur: "longueur", classe: "CP", combien: 6 }),
      mesures(5, "Mesurer des segments — évaluation", { exercice: "mesurer", classe: "CP", combien: 4 }),
    ],
    materiel: ["Des étalons : bandelettes, trombones", "Une règle graduée par élève", "Une règle graduée par élève", "La règle d'un mètre ; un mètre ruban", "L'affiche des longueurs de référence", "Une règle graduée par élève"],
  },
  "longueurs-mesurer-ce1": {
    feuilles: [
      mesures(0, "Mesurer et encadrer", { exercice: "mesurer", classe: "CE1", encadrer: true, obliques: true, combien: 6 }),
      mesures(1, "Comparer des segments", { exercice: "comparerSegments", classe: "CE1", combien: 6 }),
      mesures(1, "Tracer des segments", { exercice: "tracer", classe: "CE1", combien: 5 }),
      mesures(3, "Estimer : la bonne mesure", { exercice: "estimer", grandeur: "longueur", classe: "CE1", combien: 8 }),
      mesures(4, "Mesurer et encadrer — évaluation", { exercice: "mesurer", classe: "CE1", encadrer: true, obliques: true, combien: 5 }),
    ],
    materiel: ["Une règle graduée par élève", "Des bandes de papier ; la règle graduée", "Un mètre ruban, une règle d'un mètre par équipe", "L'affiche des longueurs de référence", "La règle graduée"],
  },
  "longueurs-unites-ce1": {
    feuilles: [
      mesures(0, "Mètres et centimètres", { exercice: "convertir", grandeur: "longueur", classe: "CE1", combien: 8 }),
      mesures(2, "Choisir l'unité", { exercice: "unites", grandeur: "longueur", classe: "CE1", combien: 8 }),
      mesures(3, "Comparer des longueurs", { exercice: "comparerMesures", grandeur: "longueur", classe: "CE1", combien: 8 }),
      mesures(3, "Ranger des longueurs", { exercice: "ordonner", grandeur: "longueur", classe: "CE1", combien: 6 }),
      mesures(4, "Les unités de longueur — évaluation", { exercice: "convertir", grandeur: "longueur", classe: "CE1", combien: 8 }),
    ],
    materiel: ["La règle d'un mètre", "Un plan du quartier ; les distances de référence", "L'affiche des longueurs de référence", "Des étiquettes de longueurs", "Les énoncés"],
  },
  "longueurs-unites-ce2": {
    feuilles: [
      mesures(1, "Convertir sans tableau", { exercice: "convertir", grandeur: "longueur", classe: "CE2", combien: 10 }),
      mesures(2, "Choisir l'unité", { exercice: "unites", grandeur: "longueur", classe: "CE2", combien: 8 }),
      mesures(3, "Comparer des longueurs", { exercice: "comparerMesures", grandeur: "longueur", classe: "CE2", combien: 8 }),
      mesures(3, "Ranger des longueurs", { exercice: "ordonner", grandeur: "longueur", classe: "CE2", combien: 6 }),
      mesures(4, "Estimer : la bonne mesure", { exercice: "estimer", grandeur: "longueur", classe: "CE2", combien: 8 }),
      mesures(5, "Les unités de longueur — évaluation", { exercice: "convertir", grandeur: "longueur", classe: "CE2", combien: 8 }),
    ],
    materiel: ["Le double-décimètre ; la règle d'un mètre", "Le cahier", "L'affiche des longueurs de référence", "Des étiquettes de longueurs", "Les distances de référence de la classe", "Les énoncés"],
  },
  "mesurer-tracer-ce2": {
    feuilles: [
      mesures(0, "Mesurer au millimètre", { exercice: "mesurer", classe: "CE2", millimetres: true, obliques: true, combien: 6 }),
      mesures(1, "Tracer des segments", { exercice: "tracer", classe: "CE2", millimetres: true, combien: 6 }),
      mesures(2, "Des longueurs sous plusieurs formes", { exercice: "comparerMesures", grandeur: "longueur", classe: "CE2", combien: 8 }),
      mesures(3, "Mesurer au millimètre — évaluation", { exercice: "mesurer", classe: "CE2", millimetres: true, obliques: true, combien: 5 }),
    ],
    materiel: ["Le double-décimètre", "Le double-décimètre", "Le cahier", "Le double-décimètre"],
  },
  "perimetre-ce2": {
    feuilles: [
      mesures(1, "Comparer des périmètres au compas", { exercice: "perimetreCompas", classe: "CE2" }),
      mesures(2, "Le périmètre d'un polygone", { exercice: "perimetre", classe: "CE2", combien: 4 }),
      mesures(3, "Le périmètre — carrés et rectangles", { exercice: "perimetre", classe: "CE2", combien: 4 }),
      mesures(4, "Le périmètre — évaluation", { exercice: "perimetre", classe: "CE2", combien: 2 }),
    ],
    materiel: ["Des figures découpées ; des ficelles", "Un compas par élève", "La règle graduée", "La règle graduée", "La règle graduée ; le compas"],
  },
  "masses-cp": {
    feuilles: [
      mesures(1, "La balance : plus lourd, plus léger", { exercice: "balances", grandeur: "masse", classe: "CP", combien: 2 }),
      mesures(2, "Ranger trois objets", { exercice: "balances", grandeur: "masse", classe: "CP", combien: 6 }),
      mesures(3, "La balance — évaluation", { exercice: "balances", grandeur: "masse", classe: "CP", combien: 4 }),
    ],
    materiel: ["Des boîtes ou des bouteilles opaques identiques, de masses différentes", "Une balance de type Roberval par groupe", "Trois boîtes et une balance par groupe", "Une balance"],
  },
  "masses-ce1": {
    feuilles: [
      mesures(0, "Le plus lourd, le plus léger", { exercice: "balances", grandeur: "masse", classe: "CE1", combien: 6 }),
      mesures(1, "Peser avec des masses marquées", { exercice: "pesees", grandeur: "masse", classe: "CE1", combien: 4 }),
      mesures(2, "Le kilogramme : 1 kg = 1 000 g", { exercice: "convertir", grandeur: "masse", classe: "CE1", combien: 8 }),
      mesures(3, "Ranger des masses", { exercice: "ordonner", grandeur: "masse", classe: "CE1", combien: 6 }),
      mesures(3, "Comparer des masses", { exercice: "comparerMesures", grandeur: "masse", classe: "CE1", combien: 8 }),
      mesures(4, "Estimer : la bonne masse", { exercice: "estimer", grandeur: "masse", classe: "CE1", combien: 8 }),
      mesures(5, "Les masses — évaluation", { exercice: "estimer", grandeur: "masse", classe: "CE1", combien: 6 }),
    ],
    materiel: ["Des objets de volumes proches ; une balance Roberval", "Des balances et des masses marquées", "Des objets d'environ un kilogramme dans des sachets transparents ; deux masses de 500 g ; des balances", "Des étiquettes de masses", "Un paquet de sucre, un sachet de levure ; l'affiche des références", "Une balance"],
  },
  "masses-ce2": {
    feuilles: [
      mesures(0, "Comparer et ordonner", { exercice: "balances", grandeur: "masse", classe: "CE2", combien: 6 }),
      mesures(1, "Peser en grammes et en kilogrammes", { exercice: "pesees", grandeur: "masse", classe: "CE2", combien: 4 }),
      mesures(2, "La tonne", { exercice: "convertir", grandeur: "masse", classe: "CE2", combien: 8 }),
      mesures(3, "Choisir l'unité", { exercice: "unites", grandeur: "masse", classe: "CE2", combien: 8 }),
      mesures(4, "Estimer : la bonne masse", { exercice: "estimer", grandeur: "masse", classe: "CE2", combien: 8 }),
      mesures(5, "Les masses — évaluation", { exercice: "convertir", grandeur: "masse", classe: "CE2", combien: 8 }),
    ],
    materiel: ["Une balance Roberval ; quatre objets", "Des balances et des masses marquées", "Le cahier", "L'affiche des masses de référence", "Une feuille, une pomme, un dictionnaire, un seau d'eau", "Les énoncés"],
  },
  "contenances-ce2": {
    feuilles: [
      mesures(1, "Combien de verres ?", { exercice: "verres", grandeur: "contenance", classe: "CE2", combien: 6 }),
      mesures(3, "Litre, décilitre, centilitre", { exercice: "convertir", grandeur: "contenance", classe: "CE2", combien: 8 }),
      mesures(4, "Estimer : la bonne contenance", { exercice: "estimer", grandeur: "contenance", classe: "CE2", combien: 8 }),
      mesures(4, "Choisir l'unité", { exercice: "unites", grandeur: "contenance", classe: "CE2", combien: 6 }),
      mesures(5, "Les contenances — évaluation", { exercice: "convertir", grandeur: "contenance", classe: "CE2", combien: 6 }),
    ],
    materiel: ["Des récipients variés ; de l'eau ou du riz", "Un verre, trois récipients par groupe", "Des bouteilles d'un litre et d'un demi-litre ; un seau", "Un verre gradué ; une canette", "Un verre, une bouteille, un arrosoir", "Les énoncés"],
  },
  "monnaie-cp": {
    feuilles: [
      monnaie(0, "Pièces et billets à découper", { exercice: "planche", jusqua: 50 }),
      monnaie(1, "Combien d'argent ?", { exercice: "valeur", jusqua: 50, combien: 6 }),
      monnaie(2, "Qui a le plus d'argent ?", { exercice: "comparer", jusqua: 50, combien: 4 }),
      monnaie(3, "Payer juste, avec le moins de pièces et de billets", { exercice: "constituer", jusqua: 100, moinsDePieces: true, combien: 6 }),
      monnaie(3, "Payer juste sans pièce de 1 €", { exercice: "constituer", jusqua: 100, sansPiecesDe1: true, combien: 6 }),
      monnaie(4, "À la marchande", { exercice: "rendre", jusqua: 20, combien: 4 }),
      monnaie(5, "Combien d'argent ? — évaluation", { exercice: "valeur", jusqua: 100, combien: 4 }),
    ],
    materiel: ["Des pièces et des billets fictifs ; des barres de dix et des cubes", "Des pièces et des billets fictifs", "Deux porte-monnaie par groupe", "Des pièces et des billets fictifs", "La marchande : des objets étiquetés, la caisse", "La monnaie fictive"],
  },
  "monnaie-ce1": {
    feuilles: [
      monnaie(0, "1 € de plusieurs façons", { exercice: "unEuro", centimes: true, combien: 6 }),
      monnaie(1, "Combien d'argent ?", { exercice: "valeur", centimes: true, jusqua: 20, combien: 6 }),
      monnaie(2, "Qui a le plus d'argent ?", { exercice: "comparer", centimes: true, jusqua: 20, combien: 4 }),
      monnaie(2, "Du moins cher au plus cher", { exercice: "ordonner", jusqua: 20, combien: 8 }),
      monnaie(3, "Payer juste sans pièce de 1 €", { exercice: "constituer", centimes: true, sansPiecesDe1: true, jusqua: 10, combien: 6 }),
      monnaie(4, "Rendre la monnaie", { exercice: "rendre", centimes: true, jusqua: 20, combien: 4 }),
      monnaie(5, "Combien d'argent ? — évaluation", { exercice: "valeur", centimes: true, jusqua: 20, combien: 4 }),
    ],
    materiel: ["Des pièces de centimes et d'un euro", "La monnaie fictive", "Deux porte-monnaie par groupe ; des étiquettes de prix", "La monnaie fictive, sans pièce de 1 €", "La marchande ; la monnaie fictive", "La monnaie fictive"],
  },
  "monnaie-virgule-ce1": {
    feuilles: [
      monnaie(0, "L'écriture à virgule", { exercice: "ecriture", jusqua: 20, combien: 8 }),
      monnaie(1, "2,05 € ou 2,50 € ?", { exercice: "ecriture", jusqua: 10, combien: 10 }),
      monnaie(2, "Des centimes aux euros", { exercice: "ecriture", jusqua: 20, combien: 12 }),
      monnaie(3, "Ranger des prix", { exercice: "ordonner", virgule: true, jusqua: 20, combien: 8 }),
      monnaie(4, "L'écriture à virgule — évaluation", { exercice: "ecriture", jusqua: 20, combien: 8 }),
    ],
    materiel: ["Des étiquettes de prix ; la monnaie fictive", "La monnaie fictive", "Des pièces de 1 c, 10 c, 1 €", "Des étiquettes de prix", "Les énoncés"],
  },
  "monnaie-ce2": {
    feuilles: [
      monnaie(0, "Combien d'argent ?", { exercice: "valeur", centimes: true, virgule: true, jusqua: 100, combien: 6 }),
      monnaie(1, "Constituer un montant", { exercice: "constituer", centimes: true, virgule: true, moinsDePieces: true, jusqua: 100, combien: 6 }),
      monnaie(2, "Rendre la monnaie", { exercice: "rendre", centimes: true, virgule: true, jusqua: 20, combien: 4 }),
      monnaie(3, "Des problèmes d'achats", { exercice: "rendre", centimes: true, virgule: true, jusqua: 50, combien: 6 }),
      monnaie(4, "Rendre la monnaie — évaluation", { exercice: "rendre", centimes: true, virgule: true, jusqua: 20, combien: 4 }),
    ],
    materiel: ["La monnaie fictive", "La monnaie fictive", "La marchande ; la monnaie fictive", "Les énoncés", "La monnaie fictive"],
  },
  "heure-cp": {
    feuilles: [
      heure(0, "Lire les heures — les aiguilles en couleur", { exercice: "horloges", precision: "heures", sens: "lire", couleurs: true, combien: 9 }),
      heure(1, "Lire les heures entières", { exercice: "horloges", precision: "heures", sens: "lire", combien: 9 }),
      heure(2, "Placer les aiguilles", { exercice: "horloges", precision: "heures", sens: "dessiner", couleurs: true, combien: 9 }),
      heure(3, "Les moments de la journée", { exercice: "moments", combien: 5 }),
      heure(4, "Lire et placer — évaluation", { exercice: "horloges", precision: "heures", sens: "mixte", combien: 6 }),
    ],
    materiel: ["Une grande horloge à aiguilles ; une horloge par élève", "Les horloges de la classe", "Une horloge par élève", "L'emploi du temps de la journée", "Une horloge par élève"],
  },
  "heure-ce1": {
    feuilles: [
      heure(0, "Les heures et demies", { exercice: "horloges", precision: "demies", sens: "lire", combien: 9 }),
      heure(1, "Les quarts d'heure", { exercice: "horloges", precision: "quarts", sens: "lire", combien: 9 }),
      heure(2, "Placer les aiguilles", { exercice: "horloges", precision: "quarts", sens: "dessiner", combien: 9 }),
      heure(3, "Le matin et l'après-midi", { exercice: "horloges", precision: "quarts", sens: "lire", apresMidi: true, combien: 9 }),
      heure(4, "Lire et placer — évaluation", { exercice: "horloges", precision: "quarts", sens: "mixte", combien: 6 }),
    ],
    materiel: ["Une horloge à aiguilles par élève ; des disques à plier en deux", "Une horloge par élève ; des disques à plier en quatre", "Une horloge par élève", "Une horloge digitale", "Une horloge par élève"],
  },
  "durees-ce1": {
    feuilles: [
      heure(1, "Combien de temps ?", { exercice: "durees", precision: "quarts", combien: 6 }),
      heure(2, "Comparer des durées", { exercice: "durees", precision: "quarts", apresMidi: true, combien: 6 }),
      heure(3, "Problèmes de durées", { exercice: "problemes", precision: "quarts", combien: 5 }),
      heure(4, "Combien de temps ? — évaluation", { exercice: "durees", precision: "quarts", combien: 4 }),
    ],
    materiel: ["Une horloge à aiguilles ; un sablier, un chronomètre", "Deux horloges par groupe", "Une horloge par élève", "Une horloge par élève", "Les énoncés"],
  },
  "heure-ce2": {
    feuilles: [
      heure(0, "De cinq en cinq minutes", { exercice: "horloges", precision: "cinq", sens: "lire", minutesAutour: true, combien: 9 }),
      heure(1, "Moins le quart, moins vingt", { exercice: "horloges", precision: "cinq", sens: "lire", apresMidi: true, combien: 9 }),
      heure(2, "À la minute près", { exercice: "horloges", precision: "minutes", sens: "lire", combien: 9 }),
      heure(3, "Placer les aiguilles", { exercice: "horloges", precision: "minutes", sens: "dessiner", combien: 9 }),
      heure(4, "Lire et placer — évaluation", { exercice: "horloges", precision: "minutes", sens: "mixte", combien: 6 }),
    ],
    materiel: ["Une horloge à aiguilles par élève", "Une horloge par élève", "Une horloge ; un affichage digital", "Une horloge par élève", "Une horloge par élève"],
  },
  "durees-ce2": {
    feuilles: [
      heure(0, "Combien de temps ?", { exercice: "durees", precision: "cinq", apresMidi: true, combien: 6 }),
      heure(1, "L'axe du temps", { exercice: "problemes", precision: "cinq", combien: 2 }),
      heure(2, "Problèmes de durées", { exercice: "problemes", precision: "cinq", combien: 4 }),
      heure(3, "Problèmes à deux étapes", { exercice: "problemes", precision: "cinq", combien: 6 }),
      heure(4, "Problèmes de durées — évaluation", { exercice: "problemes", precision: "cinq", combien: 3 }),
    ],
    materiel: ["Deux horloges par groupe", "Une bande de papier pour l'axe du temps", "Les énoncés", "Les énoncés", "Les énoncés"],
  },
};

export const estUneDemarcheDesGrandeurs = (id: string) => id in PLANS;

export function planDesGrandeurs(demarcheId: string): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
