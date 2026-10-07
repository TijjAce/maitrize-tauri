// Les démarches de la résolution de problèmes et des fractions au cycle 2,
// d'après les livrets d'accompagnement du programme de mathématiques
// (Éduscol, 2025) :
// - CP, « Proposition de séquence n° 3 – Résoudre des problèmes additifs du
//   type parties-tout portant sur des nombres allant jusqu'à 100 » : chercher
//   une partie, en représentant les nombres par des dizaines et des unités ;
// - CE1, « Proposition de séquence n° 4 – Résoudre des problèmes additifs du
//   type parties-tout » : le schéma en barres ;
// - CE2, « Proposition de séquence n° 3 – Résoudre des problèmes additifs en
//   deux étapes au CE2 » : une comparaison, puis le tout ;
// - CE1, « Proposition de séquence n° 1 – Enseigner les fractions » : les
//   fractions unitaires, de l'image à l'écriture en chiffres ;
// - CE2, « Proposition de séquence n° 1 – Mesurer des longueurs en utilisant
//   les fractions » : la bande unité, puis la règle graduée.
// On les suit séance par séance, avec leurs problèmes de référence.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });

const LIVRET = (classe: string, n: number, titre: string) =>
  `Éduscol, livret d'accompagnement du programme de mathématiques du ${classe} (2025), « Proposition de séquence n° ${n} – ${titre} »`;

/** La séance courte des livrets : trois problèmes à l'ardoise, l'analogie avec le problème de référence dite à voix haute. */
const ARDOISE = "Une séance collective et rythmée. Le problème de référence est rappelé, son affiche à l'appui, et ce qu'on attend : l'opération et le résultat. Pour chaque problème, l'énoncé est projeté ou dit ; deux ou trois minutes de recherche seul ; la correction s'écrit au tableau sous la dictée d'un élève, et l'analogie se dit : « Résoudre ce problème, c'est comme résoudre le problème de… » ; la phrase réponse se dit à l'oral.";

// ── CP : chercher une partie, jusqu'à 100 ─────────────────────────────────

const PARTIES_TOUT_CP: Demarche = {
  id: "parties-tout-cp",
  nom: "Problèmes parties-tout jusqu'à 100 : chercher une partie (CP)",
  famille: "Mathématiques",
  source: LIVRET("CP", 3, "Résoudre des problèmes additifs du type parties-tout portant sur des nombres allant jusqu'à 100"),
  resume: "La séquence du livret CP, en fin de période 3 ou en période 4, après celle où l'on cherchait le tout : on apprend à chercher une partie — ce qui reste après un retrait, puis l'autre partie d'une collection —, en représentant les nombres par des dizaines et des unités, d'abord sans puis en cassant une dizaine ; puis on mêle les problèmes où l'on cherche le tout et ceux où l'on cherche une partie. Quatorze séances, longues et courtes.",
  seances: [
    seance("Chercher une partie (1) : les cerises de Zoé",
      "À la fin de cette séance, les élèves sauront résoudre un problème où l'on cherche ce qui reste après un retrait, en représentant les nombres par des dizaines et des unités, et en écrivant la soustraction.",
      40, [
        ph(T1, "20 min", "Après le tout, une partie : la séquence est annoncée. Le premier problème se joue avec un panier et des cubes : « Il y a 56 cerises dans un panier » — cinq dizaines et six unités — ; « Zoé enlève quatorze cerises » — un élève enlève une dizaine et quatre unités ; « Combien de cerises y a-t-il dans le panier maintenant ? ». Trois minutes sur l'ardoise. Puis l'enseignement de la procédure, sur l'histoire dessinée en trois vignettes : dessiner cinq dizaines et six unités, colorier et entourer une dizaine et quatre unités ; on cherche l'autre partie, on fait une soustraction : 56 – 14 ; on compte les cubes non entourés : 42 ; la phrase réponse ; on vérifie en dénombrant les cubes du panier. La trace écrite va dans le cahier de leçons.",
          "Entoure la partie enlevée plutôt que de la barrer : cette représentation vaudra pour tous les problèmes parties-tout."),
        ph(T2, "15 min", "Dans le cahier d'entraînement, chacun à son rythme, des problèmes qui ressemblent beaucoup à celui de la leçon : « Il y a 43 cerises dans un panier. Zoé enlève 21 cerises… » ; puis un retrait de dizaines entières (20 poires) ; des nombres un peu plus grands pour les plus rapides. L'objectif : que tous résolvent les deux premiers.",
          "Regroupe quelques minutes ceux qui ne se lancent pas : le matériel pour jouer l'histoire, puis la représenter sur l'ardoise. Une phrase réponse à compléter pour qui peine à l'écrire."),
        ph(T3, "5 min", "Un élève corrige au tableau le retrait des 20 poires : on entoure deux dizaines, et aucune unité — le rôle du zéro. On l'a résolu comme le problème de la leçon : on connaît le tout et une partie, on cherche l'autre partie, on fait une soustraction."),
      ]),
    seance("Entraînement court (1)",
      "À la fin de cette séance, les élèves sauront reconnaître, dans un autre problème de retrait, le problème des cerises de Zoé, et le résoudre de la même façon.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : chercher ce qui reste après un retrait, sans casser de dizaine.`, "Simule la situation avec les cubes en dizaines et unités quand il le faut.")]),
    seance("Entraînement court (2) : une collection en deux parties",
      "À la fin de cette séance, les élèves sauront chercher une partie quand une collection est faite de deux parties : les élèves sous le préau, et les autres.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : un retrait, puis — c'est nouveau — une collection décomposée en deux parties ; sans casser de dizaine ; paniers de fruits, autobus, cour de récréation.`)]),
    seance("Chercher une partie (2) : casser une dizaine",
      "À la fin de cette séance, les élèves sauront chercher une partie quand il faut casser une dizaine en dix unités pour pouvoir enlever.",
      40, [
        ph(T1, "20 min", "L'énoncé codé est projeté, puis dit par des élèves : « Il y a 43 élèves en récréation. 27 élèves jouent sous le préau. Les autres élèves jouent dans la cour. Combien d'élèves y a-t-il dans la cour ? » Recherche seul. Correction collective avec les cubes : quatre dizaines et trois unités ; enlever deux dizaines et sept unités — mais il n'y a que trois unités ! On casse une dizaine pour avoir dix unités. 43 – 27 = 16 ; il y a 16 élèves dans la cour. La trace écrite va dans le cahier de leçons."),
        ph(T2, "15 min", "Dans le cahier d'entraînement, chacun à son rythme, des problèmes semblables.",
          "Regroupe ceux qui ne se lancent pas, avec le matériel."),
        ph(T3, "5 min", "Ce qu'on a appris : quand il n'y a pas assez d'unités, on casse une dizaine."),
      ]),
    seance("Entraînement court (3)",
      "À la fin de cette séance, les élèves sauront chercher ce qui reste après un retrait, qu'il faille ou non casser une dizaine.",
      15, [ph("Deux problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : chercher ce qui reste, avec et sans cassage de dizaine, en alternance.`)]),
    seance("Entraînement court (4)",
      "À la fin de cette séance, les élèves sauront chercher l'autre partie d'une collection, qu'il faille ou non casser une dizaine.",
      15, [ph("Deux problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : une collection en deux parties, avec et sans cassage ; fruits, autobus, cour de récréation, espaces sportifs.`)]),
    seance("Évaluation intermédiaire et remédiation",
      "À la fin de cette séance, les élèves sauront dire s'ils résolvent seuls les problèmes où l'on cherche une partie, ou s'ils ont besoin de s'entraîner encore.",
      20, [
        ph("Deux problèmes, seul", "10 min", "Le cahier de leçons fermé, les affiches cachées ; les énoncés codés sont distribués et dits : « Il y a 58 élèves en récréation. 26 élèves jouent sous le préau. Les autres jouent dans la cour. Combien d'élèves y a-t-il dans la cour ? » ; « Il y a 45 cerises dans un panier. Zoé enlève 18 cerises. Combien de cerises y a-t-il dans le panier maintenant ? »",
          "Rassure : ce sont des problèmes semblables à ceux des séances précédentes ; il s'agit de se tester."),
        ph("Relevé et remédiation", "10 min", "Un relevé par élève : comprendre, numération, modéliser (58 – 26, 45 – 18), calculer (32 ; 27, en cassant une dizaine), répondre. Remédiation en APC ou en petit groupe, avec du matériel tangible — des pingouins dans un igloo, d'abord en jouant l'action avec de petits nombres."),
      ]),
    seance("Le tout ou une partie ? (1)",
      "À la fin de cette séance, les élèves sauront distinguer les problèmes où l'on cherche le tout — une addition — de ceux où l'on cherche une partie — une soustraction.",
      30, [ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes, seul, dans le cahier d'entraînement : la valeur finale après un ajout ou un retrait ; un même habillage pour tous, pour se concentrer sur la structure.",
        "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Le tout ou une partie ? (2)",
      "À la fin de cette séance, les élèves sauront trouver la valeur finale après un ajout ou un retrait.",
      10, [ph("Deux ou trois problèmes à l'ardoise", "10 min", `${ARDOISE} Ici : la valeur finale après un ajout ou un retrait.`)]),
    seance("Le tout ou une partie ? (3)",
      "À la fin de cette séance, les élèves sauront chercher le tout ou une partie d'une collection décomposée en deux.",
      10, [ph("Deux ou trois problèmes à l'ardoise", "10 min", `${ARDOISE} Ici : le tout ou une partie d'une collection décomposée en deux parties.`)]),
    seance("Le tout ou une partie ? (4) : ce qu'on a ajouté",
      "À la fin de cette séance, les élèves sauront chercher, après un ajout, la valeur finale ou ce qu'on a ajouté.",
      10, [ph("Deux ou trois problèmes à l'ardoise", "10 min", `${ARDOISE} Ici : après un ajout, la valeur finale, ou — c'est nouveau — ce qu'on a ajouté.`)]),
    seance("Le tout ou une partie ? (5) : ajouts et retraits",
      "À la fin de cette séance, les élèves sauront chercher ce qu'on a ajouté ou retiré, comme une partie d'un tout.",
      10, [ph("Deux ou trois problèmes à l'ardoise", "10 min", `${ARDOISE} Ici : ce qu'on a ajouté ou retiré, ou la valeur finale après un ajout — « les personnes qui montent dans le bus forment une partie des personnes qui sont dans le bus maintenant ».`)]),
    seance("Le tout ou une partie ? (6) : tout mêlé",
      "À la fin de cette séance, les élèves sauront résoudre, mêlés, tous les problèmes parties-tout de la séquence.",
      30, [ph("Problèmes dans le cahier", "30 min", "Le rebrassage des séances précédentes, seul, dans le cahier d'entraînement.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Évaluation — bilan de fin de séquence",
      "À la fin de cette séance, les élèves sauront résoudre seuls des problèmes parties-tout jusqu'à 100, en cherchant le tout ou une partie.",
      20, [
        ph("Problèmes, seul", "15 min", "Des problèmes semblables à ceux de toute la séquence."),
        ph(T4, "5 min", "Ensuite, tout au long de l'année : des problèmes de temps en temps, par exemple dans le créneau du calcul mental, sur l'ardoise ou dans le cahier d'entraînement."),
      ]),
  ],
};

// ── CE1 : le schéma en barres ─────────────────────────────────────────────

const PARTIES_TOUT_CE1: Demarche = {
  id: "parties-tout-ce1",
  nom: "Problèmes parties-tout : le schéma en barres (CE1)",
  famille: "Mathématiques",
  source: LIVRET("CE1", 4, "Résoudre des problèmes additifs du type parties-tout"),
  resume: "La séquence du livret CE1, en période 3 ou 4, quand les nombres jusqu'à 1 000 et la soustraction posée sont là : on apprend à représenter un problème parties-tout par un schéma en barres — une grande barre, deux parties —, pour décider du calcul. D'abord deux collections réunies, puis des retraits et des ajouts dont on cherche la valeur finale, la transformation ou la valeur de départ : tous des problèmes parties-tout. Douze séances.",
  seances: [
    seance("Le schéma en barres : les coffres des brigands",
      "À la fin de cette séance, les élèves sauront représenter un problème parties-tout par un schéma en barres, et décider grâce à lui s'il faut chercher le tout — une addition — ou une partie — une soustraction.",
      45, [
        ph(T1, "15 min", "La séquence est annoncée : des problèmes avec deux parties et un tout, mais avec des nombres plus grands — dessiner le matériel serait trop long : on apprend un nouveau schéma. Le problème de référence : 146 pièces rangées dans deux coffres, 34 dans le coffre rouge ; combien dans le coffre bleu ? Lu en silence puis à voix haute, raconté par un élève, la question dite par un autre ; trois minutes de recherche. Puis l'enseignement : une barre pour chaque coffre, une ligne pour le tout et 146 ; 34 dans la barre rouge, un point d'interrogation dans la bleue ; parmi les 146 pièces, deux parties : je prends le tout, j'enlève la partie connue : 146 – 34 = 112, posée ; la phrase réponse."),
        ph(T2, "20 min", "Dans le cahier d'entraînement, chacun à son rythme : un problème semblable ; puis un problème où l'on cherche le tout — sans « en tout » dans la question, pour ne pas reconnaître l'addition à ce seul mot ; pour les plus rapides, une soustraction avec retenue, et un dernier problème.",
          "Regroupe ceux qui ne se lancent pas : du matériel de numération et deux boîtes pour jouer l'histoire, puis le schéma en barres."),
        ph(T3, "10 min", "Correction collective du problème où l'on cherche le tout ; deux traces écrites de référence — chercher une partie, chercher le tout — dans le cahier de leçons et sur une affiche."),
      ]),
    seance("Entraînement court (1) : des oiseaux migrateurs",
      "À la fin de cette séance, les élèves sauront représenter par un schéma en barres une collection faite de deux sortes d'objets, et chercher le tout ou une partie.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : une collection faite de deux sous-catégories — des hirondelles et des cigognes, des oiseaux migrateurs (L'Afrique de Zigomar).`)]),
    seance("Entraînement court (2) : des légumes",
      "À la fin de cette séance, les élèves sauront reconnaître la même structure sous un autre habillage.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des navets, des carottes, des poireaux… (Zigomar n'aime pas les légumes).`)]),
    seance("Entraînement individuel (1)",
      "À la fin de cette séance, les élèves sauront résoudre seuls, avec le schéma en barres, des problèmes où deux collections sont réunies.",
      30, [ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes, seul, dans le cahier d'entraînement : chercher le tout ou une partie ; habillages variés.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Évaluation intermédiaire et remédiation",
      "À la fin de cette séance, les élèves sauront dire s'ils résolvent seuls ces problèmes, ou s'ils ont besoin de s'entraîner encore.",
      20, [ph("Problèmes, seul", "20 min", "Des problèmes semblables à ceux des quatre premières séances. Puis une remédiation pour qui en a besoin.")]),
    seance("Analogies (1) : des retraits",
      "À la fin de cette séance, les élèves sauront voir un retrait comme un problème parties-tout, et le représenter par le même schéma en barres.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : après un retrait, la valeur finale, ce qu'on a retiré, ou la valeur de départ — les brigands encore.`)]),
    seance("Analogies (2) : des retraits",
      "À la fin de cette séance, les élèves sauront chercher n'importe laquelle des trois valeurs d'un retrait.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des retraits, avec les oiseaux de Zigomar.`)]),
    seance("Entraînement individuel (2) : des retraits",
      "À la fin de cette séance, les élèves sauront résoudre seuls des problèmes de retrait, quelle que soit la valeur cherchée.",
      30, [ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes de retrait : la valeur finale, la valeur retirée, la valeur de départ ; habillages variés.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Analogies (3) : des ajouts",
      "À la fin de cette séance, les élèves sauront voir un ajout comme un problème parties-tout.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : après un ajout, la valeur finale, ce qu'on a ajouté, ou la valeur de départ — les brigands.`)]),
    seance("Analogies (4) : des ajouts",
      "À la fin de cette séance, les élèves sauront chercher n'importe laquelle des trois valeurs d'un ajout.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des ajouts, avec les oiseaux de Zigomar.`)]),
    seance("Entraînement individuel (3) : ajouts et retraits",
      "À la fin de cette séance, les élèves sauront résoudre seuls des ajouts et des retraits mêlés.",
      30, [ph("Problèmes dans le cahier", "30 min", "Ajouts et retraits mêlés ; on cherche l'une des trois valeurs.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Évaluation",
      "À la fin de cette séance, les élèves sauront résoudre seuls des problèmes parties-tout, réunions, ajouts et retraits, avec un schéma en barres.",
      20, [
        ph("Problèmes, seul", "15 min", "Des problèmes semblables à ceux de toute la séquence."),
        ph(T4, "5 min", "Ensuite, tout au long de l'année, dans le créneau du calcul mental par exemple : des problèmes de réunion et de transformation, sur l'ardoise ou dans le cahier."),
      ]),
  ],
};

// ── CE2 : deux étapes, une comparaison puis le tout ──────────────────────

const DEUX_ETAPES_CE2: Demarche = {
  id: "deux-etapes-ce2",
  nom: "Problèmes en deux étapes : une comparaison, puis le tout (CE2)",
  famille: "Mathématiques",
  source: LIVRET("CE2", 3, "Résoudre des problèmes additifs en deux étapes au CE2"),
  resume: "La séquence du livret CE2 : deux valeurs sont comparées, on connaît l'une et l'écart, on cherche le tout — « Léo a 37 billes. Lucie a 20 billes de plus que Léo. Combien de billes ont-ils en tout ? ». Un schéma — deux barres, l'écart, le tout — et deux étapes : d'abord la deuxième valeur, en se demandant si c'est la plus grande ou la plus petite, puis le tout. Des énoncés discordants dès le début ; puis ces problèmes se mêlent à ceux en une étape, avec la monnaie, les longueurs, les durées. Onze séances.",
  seances: [
    seance("Une nouvelle famille de problèmes : les billes de Léo et Lucie",
      "À la fin de cette séance, les élèves sauront résoudre un problème où l'on compare deux valeurs et où l'on cherche le tout : d'abord la deuxième valeur, puis le tout.",
      50, [
        ph(T1, "25 min", "La séquence est annoncée. Le problème : « Léo a 37 billes. Lucie a 20 billes de plus que Léo. Combien de billes ont-ils en tout ? » — trois minutes de recherche seul. Puis deux élèves jouent la scène avec le matériel en dizaines et unités : Lucie a autant que Léo, et vingt de plus ; « ils », c'est Léo et Lucie. Le schéma : une barre par enfant, l'écart par une double flèche, le tout et son point d'interrogation. Deux étapes : Lucie a le plus, donc une addition : 37 + 20 = 57 ; puis le tout : 37 + 57 = 94 ; chaque calcul est remis en contexte. La trace écrite, 10 minutes, dans le cahier de leçons.",
          "Laisse d'abord passer l'erreur d'ajouter les deux nombres de l'énoncé ; fais jouer la scène à ceux qui l'ont faite."),
        ph(T2, "20 min", "Quatre problèmes semblables dans le cahier d'entraînement, chacun à son rythme ; tous font au moins les deux premiers.",
          "Un calcul par ligne : 37 + 20 n'est pas égal à 57 + 37. Regroupe ceux qui peinent, avec le matériel puis le schéma."),
        ph(T3, "5 min", "Correction d'un problème discordant — « Maël a 44 billes. Maël a 10 billes de plus que Lou. » : qui a le plus ? Maël ; donc pour Lou, une soustraction, 44 – 10 = 34, puis 44 + 34 = 78. Ce qu'on a appris : la question porte sur le tout ; d'abord la deuxième valeur, puis le tout."),
      ]),
    seance("Entraînement court (1) : des analogies",
      "À la fin de cette séance, les élèves sauront reconnaître la même structure sous des habillages différents.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : la même structure qu'à la première séance, des quantités, des habillages variés.`)]),
    seance("Évaluation intermédiaire et remédiation",
      "À la fin de cette séance, les élèves sauront dire s'ils résolvent seuls ces problèmes en deux étapes.",
      30, [
        ph("Deux problèmes, seul", "10 min", "Deux problèmes semblables à ceux des séances 1 et 2."),
        ph("Remédiation", "20 min", "En petits groupes ou en APC, avec du matériel tangible, pour ceux qui ne parviennent pas encore à modéliser."),
      ]),
    seance("Entraînement court (2) : la monnaie",
      "À la fin de cette séance, les élèves sauront reconnaître la même structure avec des sommes d'argent.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : la même structure, avec de la monnaie — des ardoises effacées.`)]),
    seance("Une ou deux étapes ? (1) : la monnaie",
      "À la fin de cette séance, les élèves sauront dire s'il faut une ou deux étapes, et laquelle faire d'abord.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des problèmes en une étape — parties-tout ou comparaison — alternent avec les problèmes en deux étapes ; avec de la monnaie.`)]),
    seance("Une ou deux étapes ? (2) : des pommes",
      "À la fin de cette séance, les élèves sauront planifier leur solution : « Que vais-je calculer d'abord ? »",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : une ou deux étapes, avec des pommes.`)]),
    seance("Entraînement individuel (1)",
      "À la fin de cette séance, les élèves sauront résoudre seuls des problèmes en une ou deux étapes, avec des quantités et de la monnaie.",
      30, [ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes, seul : une ou deux étapes ; quantités et monnaie, habillages variés.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Une ou deux étapes ? (3) : des longueurs",
      "À la fin de cette séance, les élèves sauront reconnaître ces structures avec des longueurs.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des longueurs — des bandes de papier.`)]),
    seance("Une ou deux étapes ? (4) : des durées",
      "À la fin de cette séance, les élèves sauront reconnaître ces structures avec des durées.",
      15, [ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : des durées — l'emploi du temps de la classe.`)]),
    seance("Entraînement individuel (2)",
      "À la fin de cette séance, les élèves sauront résoudre seuls ces problèmes, quelle que soit la grandeur.",
      30, [ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes, seul : quantités, monnaie, longueurs, durées — la visite d'une exposition.", "Différencie par le nombre de problèmes et l'accompagnement.")]),
    seance("Évaluation — bilan de fin de séquence",
      "À la fin de cette séance, les élèves sauront résoudre seuls des problèmes en deux étapes — une comparaison, puis le tout — et reconnaître celui qui n'en demande qu'une.",
      30, [
        ph("Cinq problèmes, seul", "25 min", "Cinq problèmes semblables à ceux de la séquence : en deux étapes, avec un intrus, un problème de comparaison en une étape."),
        ph(T4, "5 min", "Ensuite, régulièrement, dans le créneau du calcul mental par exemple : des grandeurs variées — masses et contenances aussi —, des énoncés discordants."),
      ]),
  ],
};

// ── CE1 : les fractions unitaires ─────────────────────────────────────────

const FRACTIONS_CE1: Demarche = {
  id: "fractions-unitaires-ce1",
  nom: "Les fractions unitaires : de l'image à l'écriture en chiffres (CE1)",
  famille: "Mathématiques",
  source: LIVRET("CE1", 1, "Enseigner les fractions"),
  resume: "La séquence du livret CE1, en période 2, après « moitié, demi, quart » : on représente un demi, un quart, un huitième, puis un tiers et un sixième, un cinquième et un dixième, en partageant des surfaces en parts égales ; on les nomme et on les écrit en lettres, en fabriquant des cartes de memory ; puis l'écriture en chiffres arrive comme un événement : « un huitième » s'écrit 1/8 et se lit « un huitième », jamais « un sur huit ». Des problèmes courts tout au long, un test à mi-séquence.",
  seances: [
    seance("Un demi, un quart, un huitième : fabriquer un memory",
      "À la fin de cette séance, les élèves sauront représenter un demi, un quart et un huitième d'une surface en la partageant en parts égales, et les nommer.",
      55, [
        ph(T1, "10 min", "Rappel des fractions connues — un demi, un quart —, associées à des images. Le projet : fabriquer ensemble des jeux de memory, une fraction en mots avec une image. L'enseignant montre : la carte « un quart » ; un carré plié bord à bord, deux moitiés, puis quatre parties égales ; une part coloriée : « un quart du carré ».",
          "Montre précisément la part dont on parle, et d'un geste le tout ; nomme chacune des parts : « un quart, un quart, un quart et encore un quart »."),
        ph(T2, "30 min", "Chacun partage un carré en huit parts égales ; on compare les solutions — huit parts égales, verticales ou non. Puis chacun fabrique ses quatre cartes : « un demi », « un quart », « un huitième » et « un », sur des carrés, des rectangles, des disques ou des « éventails » (des demi-disques).",
          "Forme des binômes tuteur-tutoré ; garde des formes et des cartes vierges pour plusieurs essais. Le demi-disque est un tout : on ne le dit pas « moitié de disque »."),
        ph(T3, "15 min", "Des cartes d'élèves, nommées et justifiées : « Un huitième du tout, c'est une part quand ce tout est partagé en huit parts égales. » On compare : une fraction s'interprète par rapport à son tout ; une même fraction d'un même tout peut avoir des formes différentes ; plus il y a de parts, plus elles sont petites. Une affiche avec les cartes en plus."),
      ]),
    seance("Jouer au memory des fractions",
      "À la fin de cette séance, les élèves sauront associer une fraction écrite en lettres et ses images, et la nommer.",
      15, [ph("Jeux en groupes", "15 min", "Trois fois quinze minutes, en ateliers : avec l'enseignant, le memory — d'abord cartes visibles, pour reconstituer les paires, puis cartes retournées, en nommant les fractions — ; en autonomie, de nouvelles images pour le cahier, ou des entraînements. Une mise en commun après chaque jeu. Des jeux autocorrectifs recto-verso, fabriqués avec une partie des cartes, pour s'entraîner en classe ou à la maison.",
        "Fais verbaliser : « cette partie, c'est un quart du disque, parce que… »")]),
    seance("Un tiers et un sixième",
      "À la fin de cette séance, les élèves sauront représenter et nommer un tiers et un sixième d'un disque, d'un hexagone, d'une autre figure.",
      45, [
        ph(T2, "35 min", "Un disque marqué en trois parts égales : on colorie une part, « un tiers » — le t de « tiers » comme celui de « trois ». Le même disque, chaque tiers plié en deux : six parts égales, « un sixième ». Un hexagone régulier partagé pour colorier un sixième, puis un tiers, en regroupant les sixièmes deux par deux. Au tableau, les six triangles de l'hexagone recomposent un losange, un trapèze : « Combien de triangles pour le tout ? Quelle fraction du tout est ce triangle ? »",
          "Encourage l'entraide quand le geste est difficile."),
        ph(T3, "10 min", "Dans le cahier : une page pour « un tiers », une page en regard pour « un sixième », complétées au fil de l'année."),
      ]),
    seance("Un cinquième et un dixième : le répertoire",
      "À la fin de cette séance, les élèves sauront représenter un cinquième et un dixième sur une bande, et décrire un partage : un dixième, c'est la moitié d'un cinquième.",
      45, [
        ph(T2, "35 min", "Un répertoire de fractions sur des bandes rectangulaires : d'abord les fractions connues, en pliant ; puis un cinquième — dans « cinquième » on entend « cinq » — sur une bande déjà tracée en cinq, le pliage étant peu précis ; puis un dixième, chaque cinquième partagé en deux."),
        ph(T3, "10 min", "Ce qu'on a vu sur les partages : un dixième, c'est la moitié d'un cinquième — sans encore écrire d'égalité entre fractions."),
      ]),
    seance("Des problèmes, et le test de mi-séquence",
      "À la fin de cette séance, les élèves sauront utiliser les fractions pour raisonner sur un problème de la vie courante, et montrer ce qu'ils savent en représenter, interpréter et écrire en lettres.",
      30, [
        ph("Un problème court", "15 min", "En binômes puis avec l'enseignant : « J'ai bu la moitié de ma gourde », dit Lucie ; « Moi aussi, pourtant il me reste plus d'eau que toi ! » — pourquoi est-ce possible ? Ou la marelle partagée en cinq cases, chacune coupée en deux : un dixième de la piste ? Des schémas, du matériel ; une trace dans le cahier."),
        ph("Test de mi-séquence", "15 min", "Représenter — un demi-carré par pliage ou en traçant —, interpréter des images, écrire en lettres les fractions étudiées."),
      ]),
    seance("Écrire les fractions en chiffres",
      "À la fin de cette séance, les élèves sauront écrire et lire en chiffres les fractions unitaires 1/2, 1/3, 1/4, 1/5, 1/6, 1/8 et 1/10.",
      55, [
        ph(T1, "20 min", "Réactiver : les huit fractions connues écrites en lettres, des images ; « Montre un sixième du tout. » Le projet : de nouvelles cartes de memory, et apprendre à écrire les fractions en chiffres. Chacun colorie une seule part de chaque disque partagé — un demi, un tiers… un dixième, et le disque entier —, puis l'associe à la fraction en lettres. L'enseignant montre : le disque en cinq parts égales, une part coloriée ; sur la carte « un cinquième », il écrit 1/5, de haut en bas, et le relit : « un cinquième ».",
          "Ne lis jamais « un sur cinq » : la fraction n'est pas deux nombres juxtaposés. Demande « comment se lit la fraction ? », pas « comment s'écrit-elle ? »."),
        ph(T2, "25 min", "La paire du « un » ensemble ; puis chacun écrit en chiffres les autres fractions sur ses cartes, et les associe à leurs disques."),
        ph(T3, "10 min", "La trace écrite : chaque fraction en lettres, en chiffres et en image."),
      ]),
    seance("Jouer avec les écritures fractionnaires",
      "À la fin de cette séance, les élèves sauront associer une écriture en chiffres, son nom et ses images.",
      15, [ph("Jeux en groupes", "15 min", "Trois fois quinze minutes : le jeu d'appariement cartes visibles, puis le memory, et le jeu autocorrectif recto-verso.")]),
    seance("Des problèmes, et l'évaluation",
      "À la fin de cette séance, les élèves sauront représenter, interpréter, écrire et lire les fractions unitaires, en lettres et en chiffres.",
      30, [
        ph("Un problème court", "15 min", "Les écritures fractionnaires servent à raisonner et à communiquer : Elsa partage un tiramisu « en trois parts » — mais chacune est-elle un tiers ?"),
        ph("Évaluation", "15 min", "Représenter, interpréter, écrire et lire les fractions unitaires, en lettres et en chiffres."),
      ]),
  ],
};

// ── CE2 : mesurer des longueurs avec des fractions ───────────────────────

const LONGUEURS_CE2: Demarche = {
  id: "fractions-longueurs-ce2",
  nom: "Mesurer des longueurs avec des fractions d'unité (CE2)",
  famille: "Mathématiques",
  source: LIVRET("CE2", 1, "Mesurer des longueurs en utilisant les fractions"),
  resume: "La séquence détaillée du livret CE2, à partir de la période 3 : quand les entiers ne suffisent plus pour comparer deux longueurs, on partage une bande unité en quatre, puis en dix ; on retrouve l'unité à partir d'une de ses fractions ; on construit une règle graduée en quarts, puis en dixièmes, pour mesurer et tracer ; on se sert d'égalités de fractions. « Le crayon a pour longueur 2 unités et un quart d'unité. » Six séances.",
  seances: [
    seance("La bande unité partagée en quatre",
      "À la fin de cette séance, les élèves sauront mesurer une longueur avec une bande unité pliée en quatre, et l'écrire : 1 u + 3/4 u.",
      55, [
        ph(T1, "25 min", "Les règles rangées, on mesure par report d'une bande de papier : le banc fait 8 unités, le tableau est entre 5 et 6 unités. Mais la fenêtre aussi : laquelle est la plus longue ? On partage la bande unité : pliée en quatre parties égales, elle donne le quart d'unité ; « le tableau est long comme 5 unités et 1 quart d'unité ». L'enseignant montre deux procédures : reporter le quart d'unité, bande pliée ; ou déplier la bande et compter les quarts.",
          "Fais vérifier que les parts sont égales : des parts inégales permettent de comparer, pas de mesurer en fractions."),
        ph(T2, "20 min", "La planche des crayons à mesurer, avec sa bande unité : chacun mesure, en unités et quarts d'unité, puis écrit : « Le crayon A a pour longueur une unité et trois quarts d'unité » — 1 u + 3/4 u."),
        ph(T3, "10 min", "L'affiche « Utiliser les fractions pour mesurer des longueurs » se complète : l'encadrement, puis la mesure en unités et quarts d'unité."),
      ]),
    seance("La bande unité partagée en dix",
      "À la fin de cette séance, les élèves sauront mesurer une longueur avec une bande unité partagée en dix parties égales.",
      45, [
        ph(T2, "35 min", "Dans le prolongement : une bande unité partagée en dix parties égales pour mesurer des longueurs ; les mesures s'écrivent en unités et dixièmes d'unité."),
        ph(T3, "10 min", "On compare les deux partages : dix dixièmes, comme quatre quarts, font une unité."),
      ]),
    seance("Retrouver l'unité",
      "À la fin de cette séance, les élèves sauront construire une bande de la longueur de l'unité à partir d'une bande dont on connaît la mesure.",
      45, [
        ph(T2, "35 min", "Une bande mesure, par exemple, trois quarts d'unité : comment fabriquer la bande unité ? On partage, on reporte, on vérifie."),
        ph(T3, "10 min", "Ce qu'on a appris : connaître une fraction de l'unité permet de retrouver l'unité."),
      ]),
    seance("Construire une règle graduée en quarts",
      "À la fin de cette séance, les élèves sauront construire une règle graduée en quarts d'unité et l'utiliser pour mesurer : « Le segment a pour longueur 1 unité + 3/4 d'unité. »",
      55, [
        ph(T1, "15 min", "Comparer des segments selon leur longueur : la bande unité ne suffit plus, il faut un instrument."),
        ph(T2, "30 min", "Chacun construit une règle graduée en quarts de l'unité donnée, et mesure les segments ; la course des nageurs fait tracer des segments bout à bout, chacun de la longueur de sa carte.",
          "Rappelle qu'une ligne bien droite va plus loin qu'une ligne brisée."),
        ph(T3, "10 min", "L'affiche se complète : sur la règle, les fractions se placent entre les entiers."),
      ]),
    seance("Tracer avec une règle graduée en dixièmes",
      "À la fin de cette séance, les élèves sauront tracer, avec une règle graduée en dixièmes d'unité, des segments de longueur inférieure, égale ou supérieure à une unité.",
      45, [
        ph(T2, "35 min", "Une unité de longueur étant donnée, une règle graduée en dixièmes : tracer des segments de longueurs données, plus petits, égaux ou plus grands qu'une unité."),
        ph(T3, "10 min", "Correction : on mesure les segments des voisins avec sa propre règle."),
      ]),
    seance("Des égalités de fractions pour tracer",
      "À la fin de cette séance, les élèves sauront se servir d'égalités de fractions pour tracer un segment avec une règle graduée en huitièmes.",
      30, [
        ph(T2, "25 min", "Avec une règle graduée en huitièmes, tracer des segments dont les longueurs sont données en demis ou en quarts d'unité : il faut d'abord trouver combien de huitièmes cela fait."),
        ph(T3, "5 min", "Les égalités utilisées s'écrivent : un demi d'unité, c'est quatre huitièmes d'unité."),
      ]),
  ],
};

export const DEMARCHES_PROBLEMES: Demarche[] = [PARTIES_TOUT_CP, PARTIES_TOUT_CE1, DEUX_ETAPES_CE2, FRACTIONS_CE1, LONGUEURS_CE2];

/** La classe de chaque démarche des livrets. */
export const CLASSE_DES_DEMARCHES_PROBLEMES: Record<string, "CP" | "CE1" | "CE2"> = {
  "parties-tout-cp": "CP", "parties-tout-ce1": "CE1", "deux-etapes-ce2": "CE2", "fractions-unitaires-ce1": "CE1", "fractions-longueurs-ce2": "CE2",
};

/**
 * La séquence d'un livret pour une compétence de résolution de problèmes ou
 * de fractions, à sa classe ; rien sinon. En minuscules sans accents.
 */
export function demarcheDuLivretDeProblemes(classe: string, competence: string): string | null {
  if (classe === "cp" && /problemes additifs en une etape du type parties-tout/.test(competence)) return "parties-tout-cp";
  if (classe === "ce1" && /problemes additifs en une etape de type parties-tout/.test(competence)) return "parties-tout-ce1";
  if (classe === "ce2" && /problemes additifs en deux etapes/.test(competence)) return "deux-etapes-ce2";
  if (classe === "ce1" && /fractions 1\/2, 1\/3/.test(competence)) return "fractions-unitaires-ce1";
  if (classe === "ce2" && /unite de longueur en fractions/.test(competence)) return "fractions-longueurs-ce2";
  return null;
}
