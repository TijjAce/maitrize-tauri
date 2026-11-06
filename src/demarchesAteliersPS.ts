// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les ateliers de manipulation en petite section ────────────────────────
//
// L'enseignant l'a demandé (4 novembre 2026), avec le document d'Amandine
// Frison, PEMF à l'école de Villette, « Exemples d'ateliers de manipulation de
// type Montessori — maternelle » (DSDEN de la Savoie) : « rajoute le matériel
// présent dans ce pdf, fais des séances pour la petite section à partir de
// tout ça ».
//
// Le document décrit une cinquantaine d'ateliers — vie pratique, éducation
// sensorielle, éducation intellectuelle —, chacun avec son matériel, sa
// consigne et ses objectifs. Ses ateliers deviennent ici cinq séquences de
// petite section, une par geste ou par domaine, rangées dans le dossier PS
// des séquences toutes faites. Leur matériel est au catalogue « Le matériel
// de la classe » (materielDeClasse.ts), et chaque séance le rappelle.
//
// La progression et les mots des séances sont de Maitrize, d'après le
// programme de l'école maternelle (2025) : un premier contact « à mains
// nues », puis les outils (p. 61) ; le passage « d'une exploration libre à une
// utilisation maitrisée » des objets (p. 60) ; des tâches dont la difficulté
// et la précision correspondent au développement moteur (p. 61) ; « dire ce
// qu'on fait » (PS). Et sa mise en garde : les petits objets présentent un
// risque d'étouffement (p. 60) — en petite section, de gros objets d'abord,
// et les graines seulement sous le regard de l'adulte. Chaque atelier se
// montre à un petit groupe, se refait autant de fois qu'on veut, et finit
// rangé : le plateau revient prêt pour le suivant.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";

export const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
export const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
export const seance = (titre: string, objectif: string, duree: number, phases: PhaseCadre[], consignes?: string[]): SeanceCadre =>
  ({ titre, objectifs: sauront(objectif), duree, phases, ...(consignes ? { consignes } : {}) });

export const SAVOIE = "Amandine Frison, PEMF, école de Villette, « Exemples d'ateliers de manipulation de type Montessori — maternelle » (DSDEN de la Savoie)";
export const PROGRAMME = "programme de l'école maternelle (2025)";

/** Ce que l'adulte fait quand il montre un atelier : le même geste, lentement, et peu de mots. */
export const MONTRER = "Montre lentement, en entier — prendre le plateau, faire, ranger —, en nommant les objets et ce qu'on fait ; laisse faire ensuite sans corriger le geste.";
/** Ranger fait partie de l'atelier. */
export const RANGER = ph("Ranger", "3 min", "Chacun remet son plateau en ordre, éponge ce qui a coulé, le rapporte à sa place : il est prêt pour le suivant.",
  "Fait dire ce qu'on a fait : « J'ai versé », « J'ai vissé ».");
/** La dernière séance de chaque séquence : les plateaux connus, en autonomie, et l'observation de chacun. */
export const observer = (quoi: string, grille: string): SeanceCadre => seance("Les plateaux en autonomie — observer chacun",
  `choisir un plateau connu, le mener jusqu'au bout et le ranger : ${quoi}`, 25, [
    ph("Choisir", "3 min", "Les plateaux des séances précédentes sont sur l'étagère : chacun en choisit un, puis un autre quand il a rangé le premier."),
    ph("Faire, seul", "17 min", `L'adulte observe un élève à la fois, sans aider : ${grille}`,
      "Note ce qu'il voit ; montre de nouveau à qui en a besoin, un autre jour, sans le dire devant les autres."),
    ph("Dire ce qu'on a fait", "5 min", "En petit groupe, chacun montre son plateau et dit ce qu'il a fait, avec le nom des objets."),
  ]);

// ── 1. Verser, transvaser, pincer ──

const VERSER: Demarche = {
  id: "ateliers-verser-ps",
  nom: "Verser, transvaser, pincer : les ateliers de vie pratique",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir le monde de la matière et des objets » (p. 60-61) : « Transporter de l'eau, des grains, des objets, effectuer des transvasements »`,
  resume: "Des plateaux qu'on découvre un à un : à mains nues d'abord, avec les outils ensuite. Transvaser de la semoule et de l'eau, verser d'une carafe dans un gobelet, puis jusqu'au trait du verre ; transvaser à la seringue et à l'entonnoir, déposer des gouttes à la pipette ; saisir des noix avec une grosse pince, accrocher des pinces à linge au bol de leur couleur. L'adulte montre, chacun refait autant qu'il veut, puis range ; on nomme les objets et ce qu'on fait, et l'on observe chacun.",
  seances: [
    seance("Transvaser à mains nues", "remplir et vider des récipients à pleines mains, dans la semoule et dans l'eau, et dire ce qu'ils font : je remplis, je vide, ça coule.", 20, [
      ph("Explorer", "10 min", "Au bac à semoule, puis au bac à eau : on plonge les mains, on remplit, on vide, on fait couler entre les doigts.",
        "Met des mots sur chaque geste — remplir, vider, verser, couler, plein, vide — sans rien demander de réussir."),
      ph("Avec des récipients", "7 min", "Des gobelets, des bols, des cuillères : on transvase d'un récipient à l'autre, on montre ce qui est plein, ce qui est vide.",
        "Fait comparer : « Lequel est plein ? »"),
      ph("Ranger", "3 min", "On vide, on essuie avec l'éponge, on range les récipients."),
    ], ["Je plonge les mains.", "Je remplis le gobelet.", "Je vide le gobelet.", "J'essuie avec l'éponge."]),
    seance("Verser de l'eau dans un gobelet", "verser l'eau d'une petite carafe dans un gobelet sans en renverser, et éponger s'il en coule.", 20, [
      ph("Montrer", "4 min", "Au petit groupe, l'adulte présente le plateau : la carafe à deux mains, le bec au-dessus du gobelet, verser doucement, poser, éponger, ranger.", MONTRER),
      ph("Refaire", "13 min", "Chacun son tour, puis seul : on verse, on remet l'eau dans la carafe, on recommence autant de fois qu'on veut."),
      RANGER,
    ], ["Je prends la carafe à deux mains.", "Je verse doucement dans le gobelet.", "J'éponge si ça coule.", "Je range le plateau."]),
    seance("Verser jusqu'au trait", "arrêter leur geste quand l'eau arrive au trait marqué sur le verre.", 20, [
      ph("Montrer", "4 min", "Le verre porte un trait de couleur : l'adulte verse en regardant le trait, et s'arrête juste là. « Stop, c'est le trait. »", MONTRER),
      ph("Refaire", "13 min", "Chacun verse jusqu'au trait, vérifie en regardant le verre à hauteur des yeux, vide et recommence ; des verres marqués plus ou moins haut.",
        "Fait regarder le trait avant de verser ; ne remplit pas à la place de l'élève."),
      RANGER,
    ], ["Je regarde le trait.", "Je verse doucement.", "Je m'arrête au trait.", "J'éponge et je range."]),
    seance("Transvaser avec une seringue, un entonnoir, une pipette", "aspirer et pousser l'eau avec une seringue, verser dans une bouteille avec un entonnoir, et déposer quelques gouttes avec une pipette.", 25, [
      ph("Montrer", "5 min", "Trois plateaux, un à la fois : la seringue — tirer pour aspirer, pousser pour vider — ; l'entonnoir posé sur la bouteille ; la pipette qu'on presse au-dessus des alvéoles d'eau colorée.", MONTRER),
      ph("Refaire", "16 min", "Chacun essaie les trois outils et cherche celui qui va le mieux : pour remplir la bouteille, pour mettre une seule goutte.",
        "Demande « Avec quoi c'est plus facile ? » ; accepte toutes les réponses essayées."),
      ph("Ranger", "4 min", "On vide, on éponge, on remet chaque outil sur son plateau."),
    ], ["Je tire pour aspirer l'eau.", "Je pousse pour la vider.", "Je mets l'entonnoir sur la bouteille.", "Je presse la pipette : une goutte.", "Je range."]),
    seance("Saisir avec une grosse pince", "prendre une à une des noix avec une grosse pince et en poser une dans chaque alvéole d'une boîte.", 20, [
      ph("Montrer", "4 min", "L'adulte serre la pince — à escargots ou à glace — sur une noix, la soulève, la pose dans une alvéole, une seule par case.", MONTRER),
      ph("Refaire", "13 min", "Chacun remplit la boîte, une noix par case, puis la vide de la même façon dans le bol.",
        "Des noix entières en petite section, plutôt que des noisettes ou des graines : le programme rappelle le risque d'étouffement des petits objets. Reste à côté du groupe."),
      RANGER,
    ], ["Je serre la pince sur la noix.", "Je la pose dans une case.", "Une noix dans chaque case.", "Je range."]),
    seance("Accrocher des pinces à linge", "ouvrir une pince à linge entre le pouce et l'index et l'accrocher au bord du bol de sa couleur.", 20, [
      ph("Montrer", "4 min", "L'adulte prend une pince à linge rouge, la presse entre le pouce et l'index, l'accroche au bord du bol rouge.", MONTRER),
      ph("Refaire", "13 min", "Chacun accroche toutes les pinces, chacune au bol de sa couleur, puis les décroche pour la suivante.",
        "Nomme les couleurs avec l'élève ; pour qui n'arrive pas à presser, une pince plus souple."),
      RANGER,
    ], ["Je presse la pince.", "Je l'accroche au bol de la même couleur.", "Je décroche et je range."]),
    observer("verser, transvaser ou pincer.",
      "verse-t-il sans renverser ? s'arrête-t-il au trait ? choisit-il l'outil qui convient ? tient-il la pince entre le pouce et l'index ? range-t-il le plateau ? nomme-t-il les objets ?"),
  ],
};

// ── 2. Ouvrir, fermer, visser, enfiler ──

const OUVRIR: Demarche = {
  id: "ateliers-ouvrir-ps",
  nom: "Ouvrir, fermer, visser, enfiler : les ateliers de vie pratique",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir les objets et les matériaux », avant 4 ans (p. 61) : « Utiliser des objets, connaitre leur nom et leur fonction »`,
  resume: "Les gestes des objets de tous les jours, un plateau à la fois : trouver le couvercle qui va avec chaque boîte, visser et dévisser des flacons, ouvrir un cadenas avec sa clé, fermer une fermeture éclair et des boutons, enfiler des élastiques sur un tube et passer une chenille dessus-dessous, retrouver deux chaussettes pareilles. Les objets se nomment, leur usage se dit ; les plus petits — vis, écrous — attendent la moyenne section.",
  seances: [
    seance("Le couvercle qui va", "trouver le couvercle qui va avec chaque boîte ou chaque bocal, et le fermer.", 20, [
      ph("Montrer", "4 min", "Trois boîtes de tailles et de formes différentes, leurs couvercles mélangés : l'adulte essaie, « trop grand », « trop petit », « celui-là va », et ferme.", MONTRER),
      ph("Refaire", "13 min", "Chacun ouvre toutes les boîtes, mélange les couvercles, puis referme chaque boîte avec le sien.",
        "Commence par trois boîtes très différentes ; en ajoute quand c'est réussi."),
      RANGER,
    ], ["J'ouvre les boîtes.", "Je cherche le bon couvercle.", "Je ferme chaque boîte.", "Je range."]),
    seance("Visser et dévisser", "dévisser le bouchon d'un flacon et le revisser, en trouvant celui qui lui va.", 20, [
      ph("Montrer", "4 min", "L'adulte tient le flacon d'une main, tourne le bouchon de l'autre : « Je dévisse », puis « Je visse » dans l'autre sens.", MONTRER),
      ph("Refaire", "13 min", "Des flacons et des bouteilles de tailles différentes : chacun dévisse tout, puis revisse chaque bouchon sur le sien.",
        "Montre de nouveau le sens à qui tourne à l'envers ; de gros bouchons d'abord."),
      RANGER,
    ], ["Je tiens le flacon.", "Je dévisse le bouchon.", "Je trouve le bon bouchon.", "Je revisse."]),
    seance("Les cadenas et leurs clés", "ouvrir un cadenas avec sa clé, en essayant les clés jusqu'à trouver la bonne, puis le refermer.", 20, [
      ph("Montrer", "4 min", "Trois ou quatre cadenas de tailles différentes, leurs clés à côté : l'adulte essaie une clé, « elle ne va pas », une autre, « elle tourne », le cadenas s'ouvre ; il le referme.", MONTRER),
      ph("Refaire", "13 min", "Chacun ouvre tous les cadenas, puis les referme ; les clés se mélangent pour le suivant.",
        "Peu de cadenas en petite section ; plus tard, une clé de trop pour chercher davantage."),
      RANGER,
    ], ["Je prends une clé.", "J'essaie dans le cadenas.", "Il s'ouvre : je le referme.", "Je range les clés."]),
    seance("Les fermetures", "ouvrir et fermer une fermeture éclair, des boutons-pression et de gros boutons, sur un cadre puis sur leur manteau.", 25, [
      ph("Montrer", "5 min", "Sur les cadres d'habillage, l'adulte ouvre et ferme : tenir le bas, remonter la fermeture ; presser les boutons-pression ; passer le bouton dans la boutonnière.", MONTRER),
      ph("Refaire", "15 min", "Chacun ouvre et ferme chaque cadre ; puis, au vestiaire, son propre manteau.",
        "Le programme donne cet exemple pour avant 4 ans : « remonter la fermeture éclair de son manteau ». Aide à engager la fermeture, sans faire à la place."),
      ph("Ranger", "5 min", "Les cadres reviennent fermés sur l'étagère ; on dit ce qu'on sait faire maintenant."),
    ], ["Je tiens le bas.", "Je remonte la fermeture.", "Je presse les boutons.", "Je passe le bouton dans le trou."]),
    seance("Enfiler et tisser", "enfiler des élastiques sur un tube et les faire glisser, puis passer une chenille dessus, dessous, entre les barreaux d'une grille.", 20, [
      ph("Montrer", "4 min", "L'adulte ouvre un élastique avec les doigts, l'enfile sur le tube en mousse, le fait glisser ; puis passe une chenille au-dessus d'un barreau, au-dessous du suivant.", MONTRER),
      ph("Refaire", "13 min", "Chacun enfile ses élastiques sans qu'ils se touchent, puis tisse une chenille dans la grille.",
        "Dit « dessus », « dessous » à chaque barreau ; laisse recommencer sans corriger."),
      RANGER,
    ], ["J'ouvre l'élastique.", "Je l'enfile sur le tube.", "Je passe la chenille dessus, puis dessous.", "Je range."]),
    seance("Les paires de chaussettes", "retrouver deux chaussettes pareilles et les accrocher ensemble avec une pince à linge.", 20, [
      ph("Montrer", "4 min", "Dans le panier, des chaussettes de couleurs et de motifs différents : l'adulte en prend une, cherche la même, les accroche ensemble.", MONTRER),
      ph("Refaire", "13 min", "Chacun fait toutes les paires, puis les décroche et les remet dans le panier.",
        "Fait dire pourquoi elles vont ensemble : « Elles sont pareilles, toutes les deux rouges avec des étoiles. »"),
      RANGER,
    ], ["Je prends une chaussette.", "Je cherche la même.", "Je les accroche avec la pince.", "Je range."]),
    observer("ouvrir, fermer, visser ou enfiler.",
      "trouve-t-il le couvercle, le bouchon, la clé qui va ? visse-t-il dans le bon sens ? ferme-t-il une fermeture éclair, un bouton ? nomme-t-il les objets et dit-il à quoi ils servent ?"),
  ],
};

// ── 3. Les sens ──

const SENS: Demarche = {
  id: "ateliers-sens-ps",
  nom: "Toucher, écouter, sentir, regarder : les ateliers des sens",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation sensorielle ; ${PROGRAMME}, « Découvrir le corps humain et la santé », avant 4 ans (p. 60) : « Découvrir les sens utilisés lors d'expériences sensorielles variées »`,
  resume: "Un sens à la fois : retrouver par le toucher un objet connu caché dans un sac ; trouver deux tissus pareils les yeux fermés ; deviner ce que contient un ballon ; rassembler les boîtes qui font le même bruit, puis celles qui ont la même odeur ; associer et nommer les couleurs. On dit ce qu'on sent — doux, rugueux, mou, dur — et avec quoi on l'a découvert.",
  seances: [
    seance("Le sac à toucher", "retrouver, sans le voir, un objet connu de la classe caché dans un sac, et le nommer.", 20, [
      ph("Montrer", "4 min", "Les objets de la classe sont sur la table, nommés ensemble ; l'adulte en glisse un dans le sac, le palpe sans regarder, dit ce qu'il sent, le nomme, le sort.", MONTRER),
      ph("Refaire", "13 min", "À tour de rôle : la main dans le sac, on cherche l'objet que le camarade a nommé, ou l'on dit ce qu'on touche avant de le sortir.",
        "Le programme donne cet exemple pour avant 4 ans : « identifier parmi d'autres un objet connu et caché dans un sac ou dans une boite par le toucher »."),
      RANGER,
    ], ["Je mets la main dans le sac.", "Je touche sans regarder.", "Je dis ce que c'est.", "Je le sors pour vérifier."]),
    seance("Doux, rugueux : les tissus", "trouver, les yeux fermés, deux morceaux de tissu pareils au toucher, et dire s'ils sont doux ou rugueux.", 20, [
      ph("Montrer", "4 min", "Des carrés de tissu par paires — doux, rugueux, lisse, épais — : l'adulte les touche, dit ce qu'il sent, en cherche deux pareils, les yeux fermés.", MONTRER),
      ph("Refaire", "13 min", "Chacun forme les paires en regardant, puis les yeux bandés ou fermés.",
        "Apporte les mots : doux, rugueux, lisse, piquant, mou ; le programme fait trier « selon des propriétés perceptibles par les sens »."),
      RANGER,
    ], ["Je ferme les yeux.", "Je touche un tissu.", "Je cherche le même.", "Je dis : doux ou rugueux."]),
    seance("Les ballons à toucher", "deviner en le palpant ce que contient un ballon, et le poser sous l'image qui correspond.", 20, [
      ph("Montrer", "4 min", "Des ballons de baudruche remplis par l'adulte — farine, graines, gel — et la planche de leurs images : l'adulte palpe un ballon, « c'est mou », et le pose sous l'image.", MONTRER),
      ph("Refaire", "13 min", "Chacun palpe, compare, pose chaque ballon sous son image ; on vérifie ensemble.",
        "Prépare les ballons à l'avance, bien fermés ; reste avec le groupe : un ballon qui éclate laisse de petits morceaux."),
      RANGER,
    ], ["Je presse le ballon.", "Je dis : mou, dur, ça bouge.", "Je le pose sous la bonne image."]),
    seance("Les boîtes sonores", "secouer des boîtes fermées et rassembler les deux qui font le même bruit.", 20, [
      ph("Montrer", "4 min", "Des boîtes opaques remplies par paires — graines, sable, rien du tout — : l'adulte en secoue une près de son oreille, puis une autre, « pareil » ou « pas pareil ».", MONTRER),
      ph("Refaire", "13 min", "Chacun cherche les paires ; on vérifie en ouvrant les boîtes à la fin.",
        "Trois paires en petite section ; des bruits très différents d'abord. Le programme fait « manipuler et faire sonner des objets de différentes matières »."),
      RANGER,
    ], ["Je secoue la boîte.", "J'écoute.", "Je cherche celle qui fait le même bruit."]),
    seance("Les boîtes à odeurs", "sentir des boîtes et en associer deux qui ont la même odeur.", 20, [
      ph("Montrer", "4 min", "Des boîtes à odeurs par paires, deux couleurs de couvercles : l'adulte sent une boîte rouge, cherche parmi les jaunes celle qui sent pareil.", MONTRER),
      ph("Refaire", "13 min", "Chacun forme les paires ; on nomme les odeurs qu'on reconnaît.",
        "Des odeurs connues — orange, chocolat, vanille — ; trois paires d'abord."),
      RANGER,
    ], ["Je sens une boîte rouge.", "Je sens les boîtes jaunes.", "Je mets ensemble les deux qui sentent pareil."]),
    seance("Les couleurs", "associer des objets et des cartes de même couleur, et nommer quelques couleurs.", 20, [
      ph("Montrer", "4 min", "Le loto des couleurs, ou des bonshommes et leurs haltères de quatre couleurs : l'adulte pose chaque élément sur sa couleur et la nomme.", MONTRER),
      ph("Refaire", "13 min", "Chacun associe les couleurs ; puis on cherche dans la classe un objet de chaque couleur.",
        "Des couleurs franches en petite section — rouge, jaune, bleu, vert — ; les nuances viendront plus tard."),
      RANGER,
    ], ["Je prends une carte.", "Je la pose sur la même couleur.", "Je dis le nom de la couleur."]),
    seance("Avec quoi on l'a découvert — observer chacun", "dire ce qu'ils ont découvert avec leurs mains, leurs oreilles, leur nez et leurs yeux, et réussir seuls un atelier des sens.", 25, [
      ph("Se souvenir", "5 min", "Les plateaux des séances sont montrés un à un : « Avec quoi on a trouvé ? Avec les mains, avec les oreilles, avec le nez, avec les yeux. »"),
      ph("Faire, seul", "15 min", "Chacun choisit un plateau et le mène jusqu'au bout. L'adulte observe un élève à la fois : retrouve-t-il l'objet du sac, les paires de tissus, de sons, d'odeurs, les couleurs ? emploie-t-il doux, rugueux, mou, dur ?",
        "Note ce qu'il voit, sans aider."),
      ph("Ranger", "5 min", "Les plateaux reviennent prêts ; chacun dit celui qu'il a préféré, et pourquoi."),
    ]),
  ],
};

// ── 4. Les tailles ──

const TAILLES: Demarche = {
  id: "ateliers-tailles-ps",
  nom: "Empiler, emboîter, ranger par taille, trier",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation sensorielle et intellectuelle ; ${PROGRAMME}, « Explorer des grandeurs : la longueur, la masse », avant 4 ans (p. 48) : « Comparer des objets selon leur longueur »`,
  resume: "Des objets à ranger du plus grand au plus petit : une tour de cubes qui tient, des boîtes et des poupées gigognes, des pommes de trois tailles sur leurs trois pommiers, des bâtons alignés du plus court au plus long ; puis trier par couleur, et faire comme un modèle avec des formes. Le programme fait d'abord percevoir une différence quand elle est très grande, puis aligner pour comparer.",
  seances: [
    seance("Une tour qui tient", "empiler des cubes du plus grand au plus petit pour faire une tour qui tient.", 20, [
      ph("Montrer", "4 min", "Quatre cubes de tailles très différentes : l'adulte pose le plus grand, puis cherche « le plus grand de ceux qui restent », jusqu'au plus petit.", MONTRER),
      ph("Refaire", "13 min", "Chacun construit sa tour, la défait, recommence ; si elle tombe, on cherche pourquoi.",
        "Laisse essayer l'ordre au hasard : la tour qui tombe montre l'erreur mieux qu'un mot."),
      RANGER,
    ], ["Je prends le plus grand cube.", "Je pose le plus grand de ceux qui restent.", "Jusqu'au plus petit.", "Je range."]),
    seance("Emboîter", "emboîter des boîtes ou des poupées gigognes, de la plus petite à la plus grande.", 20, [
      ph("Montrer", "4 min", "L'adulte ouvre les poupées gigognes, les aligne de la plus grande à la plus petite, puis les referme l'une dans l'autre.", MONTRER),
      ph("Refaire", "13 min", "Chacun emboîte les cubes gigognes, puis les poupées ; on les aligne ensuite pour les montrer.",
        "Trois ou quatre pièces d'abord ; davantage pour qui réussit vite."),
      RANGER,
    ], ["J'ouvre les poupées.", "Je les range de la plus grande à la plus petite.", "Je les remets l'une dans l'autre."]),
    seance("Les pommes et les pommiers", "poser chaque pomme sur le pommier de sa taille : les grosses, les moyennes, les petites.", 20, [
      ph("Montrer", "4 min", "La planche des trois pommiers — un gros, un moyen, un petit — et les pommes de trois tailles : l'adulte compare une pomme aux autres, la pose sur son arbre.", MONTRER),
      ph("Refaire", "13 min", "Chacun accroche toutes les pommes ; on vérifie en les posant l'une contre l'autre.",
        "Le programme fait « répartir des briques en trois groupes selon leur longueur » : ici, trois groupes de pommes."),
      RANGER,
    ], ["Je prends une pomme.", "Je regarde : grosse, moyenne ou petite.", "Je l'accroche sur le bon pommier."]),
    seance("Du plus court au plus long", "ranger trois à cinq bâtons du plus court au plus long, en les alignant d'un même côté.", 20, [
      ph("Montrer", "4 min", "Des bâtons de longueurs très différentes : l'adulte les pose bout contre le bord de la table, et les range en escalier.", MONTRER),
      ph("Refaire", "13 min", "Chacun range ses bâtons ; puis des longueurs plus proches, qu'on aligne pour comparer.",
        "Le programme demande d'abord de « percevoir visuellement qu'un objet est plus long qu'un autre lorsque leurs longueurs sont très différentes », puis de les mettre à la même origine."),
      RANGER,
    ], ["Je pose les bâtons contre le bord.", "Je les range du plus court au plus long.", "Je regarde l'escalier."]),
    seance("Trier par couleur", "ranger des objets dans la case de leur couleur.", 20, [
      ph("Montrer", "4 min", "La boîte à compartiments, une couleur par case ; des objets ou des images de quatre couleurs : l'adulte en pose un dans sa case, en nommant la couleur.", MONTRER),
      ph("Refaire", "13 min", "Chacun trie tout ; puis on vérifie case par case, en nommant.",
        "Des objets assez gros en petite section ; on vide la boîte pour le suivant."),
      RANGER,
    ], ["Je prends un objet.", "Je regarde sa couleur.", "Je le mets dans la case de sa couleur."]),
    seance("Faire comme le modèle", "poser des formes de couleur sur un modèle pour faire pareil.", 20, [
      ph("Montrer", "4 min", "Un modèle simple de trois ou quatre formes : l'adulte pose chaque forme exactement dessus, en cherchant la bonne couleur et la bonne forme.", MONTRER),
      ph("Refaire", "13 min", "Chacun reproduit le modèle en posant dessus ; puis, pour qui réussit, à côté du modèle.",
        "Le programme, avant 4 ans : « Reproduire des assemblages de solides ou de formes planes »."),
      RANGER,
    ], ["Je regarde le modèle.", "Je pose la même forme dessus.", "Je vérifie : c'est pareil."]),
    observer("ranger par taille, trier ou reproduire.",
      "range-t-il du plus grand au plus petit ? aligne-t-il pour comparer ? trie-t-il par couleur ? reproduit-il le modèle ? emploie-t-il grand, petit, long, court ?"),
  ],
};

// ── 5. Tracer et écrire ──

const TRACER: Demarche = {
  id: "ateliers-tracer-ps",
  nom: "Tracer du doigt, retrouver les lettres de son prénom",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${PROGRAMME}, « Se préparer à apprendre à écrire », avant 4 ans (p. 17) : « Participer aux activités de motricité générale, de motricité fine et aux exercices de graphismes » ; « S'exercer au graphisme artistique » (p. 28)`,
  resume: "Laisser des traces avant de tracer : du doigt dans la semoule, avec un outil dans la pâte à modeler, sur une pochette de gel ; suivre une piste graphique en regardant où va le feutre ; puis suivre du doigt les lettres de son prénom, et les retrouver parmi des lettres mobiles. Tout s'efface, tout se recommence.",
  seances: [
    seance("Des traces dans la semoule", "laisser des traces du doigt dans la semoule — taper, frotter, griffer — et les effacer pour recommencer.", 20, [
      ph("Montrer", "4 min", "Le plateau de semoule : l'adulte tapote, frotte, griffe avec un doigt, puis secoue doucement le plateau pour tout effacer.", MONTRER),
      ph("Refaire", "13 min", "Chacun essaie les gestes, montre ses traces, efface, recommence ; des lignes, des ronds, des points.",
        "Le programme, avant 4 ans : « découvrir les traces produites par un geste particulier … dans du sable (caresser, tapoter, frotter, griffer, etc.) »."),
      RANGER,
    ], ["Je trace avec mon doigt.", "Je regarde la trace.", "Je secoue pour effacer.", "Je recommence."]),
    seance("Tracer dans la pâte à modeler", "étaler la pâte au rouleau et y tracer des lignes avec un outil.", 20, [
      ph("Montrer", "4 min", "L'adulte étale la pâte au rouleau, puis y trace des lignes avec une baguette, une fourchette, un bâtonnet.", MONTRER),
      ph("Refaire", "13 min", "Chacun étale sa pâte, trace, regarde les traces de chaque outil, roule pour effacer.",
        "Fait comparer les traces : « Celle-ci fait trois lignes ! »"),
      RANGER,
    ], ["J'étale la pâte.", "Je trace avec l'outil.", "Je regarde la trace."]),
    seance("Suivre un chemin du doigt", "suivre du doigt un chemin, sur une pochette de gel, sans en sortir.", 20, [
      ph("Montrer", "4 min", "Une pochette fermée remplie de gel, un chemin dessiné sous elle : l'adulte appuie et suit le chemin du doigt, le gel garde la trace un instant.", MONTRER),
      ph("Refaire", "13 min", "Chacun suit les chemins — droits, puis en vagues —, en regardant son doigt.",
        "Le programme, avant 4 ans : « Guider son geste par le regard lorsqu'il trace ou écrit »."),
      RANGER,
    ], ["Je pose mon doigt au début.", "Je suis le chemin.", "Je regarde mon doigt.", "J'arrive au bout."]),
    seance("Les pistes graphiques", "tracer un trait sur une piste, au feutre effaçable, sans en sortir, en regardant où va le feutre.", 20, [
      ph("Montrer", "4 min", "Une piste plastifiée — une route, un toboggan — : l'adulte trace du début à la fin sans sortir, puis efface avec le chiffon.", MONTRER),
      ph("Refaire", "13 min", "Chacun trace, efface, recommence ; des pistes plus étroites pour qui réussit.",
        "Le programme donne cet exemple : « Tracer à deux des lignes verticales sur un support tel qu'une piste graphique »."),
      RANGER,
    ], ["Je mets le feutre au début.", "Je trace sans sortir de la piste.", "J'efface avec le chiffon."]),
    seance("Les lettres douces de mon prénom", "suivre du doigt, dans le sens des flèches, les lettres capitales de leur prénom.", 20, [
      ph("Montrer", "4 min", "Les lettres douces à suivre du doigt : l'adulte suit la première lettre d'un prénom, dans le sens de la flèche, en la nommant.", MONTRER),
      ph("Refaire", "13 min", "Chacun retrouve les lettres de son prénom, les suit du doigt, les nomme avec l'adulte.",
        "Le programme, en petite section : « Reconnaitre et nommer certaines lettres de son prénom écrit en capitales »."),
      RANGER,
    ], ["Je trouve une lettre de mon prénom.", "Je la suis avec mon doigt.", "Je dis son nom."]),
    seance("Retrouver les lettres de mon prénom", "poser les lettres mobiles de leur prénom sur leur étiquette, dans l'ordre.", 20, [
      ph("Montrer", "4 min", "L'étiquette d'un prénom en capitales et des lettres mobiles : l'adulte cherche la première lettre, la pose dessus, puis la suivante.", MONTRER),
      ph("Refaire", "13 min", "Chacun reconstitue son prénom sur son étiquette ; puis, pour qui réussit, à côté de l'étiquette.",
        "Peu de lettres à chercher d'abord : celles du prénom, et une ou deux de plus."),
      RANGER,
    ], ["Je regarde mon étiquette.", "Je cherche la première lettre.", "Je la pose dessus.", "La suivante, jusqu'au bout."]),
    observer("tracer ou retrouver les lettres de son prénom.",
      "trace-t-il en regardant son geste ? reste-t-il sur la piste ? suit-il la lettre dans le sens de la flèche ? reconnaît-il, nomme-t-il des lettres de son prénom ?"),
  ],
};

/** Les cinq séquences de petite section, d'après les ateliers du document. */
export const DEMARCHES_ATELIERS_PS: Demarche[] = [VERSER, OUVRIR, SENS, TAILLES, TRACER];

/** La compétence que chacune vise, à sa section : celle que le programme nomme en petite section. */
export const VISEES_ATELIERS_PS: Record<string, RegExp> = {
  [VERSER.id]: /Explorer quelques caractéristiques des solides et des liquides/i,
  [OUVRIR.id]: /Utiliser des objets, connaitre leur nom et leur fonction/i,
  [SENS.id]: /Découvrir les sens utilisés lors d.expériences sensorielles/i,
  [TAILLES.id]: /Comparer des objets selon leur longueur/i,
  [TRACER.id]: /Participer aux activités de motricité générale, de motricité fine/i,
};

for (const d of DEMARCHES_ATELIERS_PS) d.visee = { intitule: VISEES_ATELIERS_PS[d.id], niveaux: ["PS"] };
