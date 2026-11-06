// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// ── Les ateliers de manipulation en moyenne et en grande section ───────────
//
// L'enseignant l'a demandé (4 novembre 2026), après les cinq séquences de
// petite section (demarchesAteliersPS.ts) : « décline pour la MS et la GS ».
//
// Les plateaux du document d'Amandine Frison (DSDEN de la Savoie) deviennent
// ici dix séquences, cinq par section, faites des ateliers plus fins que le
// document propose : la pince à épiler et les graines, huit cadenas et des
// clés pièges, les vis et les écrous, les nœuds, les nuances de couleur, les
// bûchettes et les barres rouges, le tangram, les roues des lettres en trois
// graphies, le prénom en cursive dans la semoule.
//
// Chacune vise l'objectif que le programme de l'école maternelle (2025) donne
// à son âge — « à partir de 4 ans » pour la moyenne section, « à partir de
// 5 ans » pour la grande — et en reprend les exemples de réussite. En grande
// section, le programme ne fixe plus d'objectif sur les organes des sens : la
// séquence des sens y devient celle des lettres, faite des ateliers du
// document où l'on touche, pose et associe les lettres.
//
// La mise en garde du programme vaut toujours (p. 60) : outils qui pincent ou
// coupent, petits objets qui présentent un risque d'étouffement. Les graines,
// les noisettes, les vis et les trombones se manipulent sous le regard de
// l'adulte, qui les compte avant et après ; en grande section, prévenir ces
// risques devient l'objet d'une séquence.

import type { Demarche } from "./demarches";
import { MONTRER, PROGRAMME, RANGER, SAVOIE, observer, ph, seance } from "./demarchesAteliersPS";

// ══ Moyenne section ═══════════════════════════════════════════════════════

// ── 1. Verser, transvaser, pincer ──

const VERSER_MS: Demarche = {
  id: "ateliers-verser-ms",
  nom: "Verser, transvaser, pincer : l'outil qui convient",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir les objets et les matériaux », à partir de 4 ans (p. 61) : « Désigner et utiliser des outils ou des objets adaptés à une situation et à une action technique »`,
  resume: "Les plateaux de la petite section, plus fins, et un choix à faire : verser dans un verre, un bol ou une bouteille en s'adaptant au récipient ; choisir entre la carafe, l'entonnoir, la seringue et le compte-gouttes, et dire pourquoi ; déposer une goutte dans chaque alvéole ; transvaser des noisettes à la pince à glace, puis des haricots un à un à la pince à épiler ; trier deux sortes de graines. Chacun nomme l'outil et ce qu'il fait ; l'adulte compte les graines avant et après.",
  seances: [
    seance("Verser dans des récipients différents", "verser d'une carafe dans un verre, un bol et une bouteille sans renverser, en adaptant leur geste à chaque récipient.", 25, [
      ph("Montrer", "5 min", "Un verre, un bol, une bouteille au goulot étroit : l'adulte verse dans chacun, plus ou moins vite, et s'arrête devant la bouteille : « Ça va déborder : il me faut l'entonnoir. »", MONTRER),
      ph("Refaire", "17 min", "Chacun verse dans les trois récipients, remet l'eau dans la carafe, recommence ; l'entonnoir est sur le plateau, pour qui en a besoin.",
        "Fait dire ce qui change : « Pour le bol, je peux verser vite ; pour la bouteille, je prends l'entonnoir. »"),
      RANGER,
    ], ["Je verse doucement dans le verre.", "Je verse dans le bol.", "Pour la bouteille, je prends l'entonnoir.", "J'éponge et je range."]),
    seance("Quel outil pour quoi faire ?", "choisir parmi la carafe, l'entonnoir, la seringue et le compte-gouttes celui qui convient à une tâche, le nommer et dire pourquoi.", 25, [
      ph("Présenter les tâches", "5 min", "Trois cartes de tâches — remplir la bouteille, mettre une goutte dans chaque alvéole, passer l'eau d'un gobelet à l'autre sans le soulever — et les quatre outils, nommés ensemble.",
        "Le programme donne un exemple de ce choix : prendre, « parmi l'emporte-pièce, les ciseaux ou un couteau en bois, ce qui convient le mieux » pour faire des sablés identiques."),
      ph("Essayer", "17 min", "Chacun tire une tâche, choisit un outil, essaie ; si ça ne va pas, il en essaie un autre. Puis il dit son choix : « J'ai pris la seringue, parce que… »",
        "Accepte les essais qui échouent : c'est l'essai qui montre l'outil qui convient. Fait nommer l'outil, pas seulement le montrer."),
      RANGER,
    ], ["Je regarde la carte : ce qu'il faut faire.", "Je choisis un outil.", "J'essaie.", "Je dis pourquoi il convient."]),
    seance("Une goutte dans chaque alvéole", "presser un compte-gouttes pour déposer une seule goutte d'eau colorée dans chaque alvéole, en arrêtant leur geste.", 25, [
      ph("Montrer", "5 min", "Le bac à alvéoles et l'eau colorée : l'adulte presse la poire dans l'eau, relâche pour aspirer, puis presse doucement au-dessus d'une alvéole — une goutte — et s'arrête.", MONTRER),
      ph("Refaire", "17 min", "Chacun met une goutte dans chaque alvéole, puis deux dans chacune ; ou une rangée d'une couleur, une rangée d'une autre.",
        "Le document vise ici à « verser en respectant une limite » : une goutte, pas plus."),
      RANGER,
    ], ["Je presse la poire dans l'eau.", "Je relâche : l'eau monte.", "Je presse doucement : une goutte.", "Une goutte dans chaque alvéole."]),
    seance("Les noisettes et la pince à glace", "saisir des noisettes une à une avec une pince à glace et en poser une dans chaque alvéole.", 25, [
      ph("Montrer", "5 min", "L'adulte serre la pince à glace sur une noisette, la soulève, la pose dans une alvéole ; il montre comment tenir la pince pour que la noisette ne glisse pas.", MONTRER),
      ph("Refaire", "17 min", "Chacun remplit la boîte, une noisette par alvéole, puis la vide de la même façon dans le bol ; on compte les noisettes avant et après.",
        "Le programme rappelle le risque d'étouffement des petits objets : l'adulte reste à côté du groupe, et les noisettes ne quittent pas le plateau."),
      RANGER,
    ], ["Je serre la pince sur une noisette.", "Je la pose dans une alvéole.", "Une noisette dans chaque alvéole.", "Je compte et je range."]),
    seance("Un haricot à la fois : la pince à épiler", "pincer un seul haricot avec une pince à épiler et le déposer dans une alvéole : un haricot par case.", 25, [
      ph("Montrer", "5 min", "L'adulte tient la pince à épiler entre le pouce et l'index, attrape un seul haricot et le pose dans une alvéole.", MONTRER),
      ph("Refaire", "17 min", "Chacun remplit les alvéoles, un haricot par case — autant de haricots que de cases —, puis les remet dans le bol.",
        "Le document vise la « correspondance terme à terme » et la coordination de l'œil et de la main. Les graines restent sous le regard de l'adulte."),
      RANGER,
    ], ["Je tiens la pince entre le pouce et l'index.", "J'attrape un seul haricot.", "Je le pose dans une case.", "Un haricot dans chaque case."]),
    seance("Trier les graines", "trier des haricots rouges et des pois chiches, avec la cuillère ou la pince, chacun dans son bol.", 25, [
      ph("Montrer", "5 min", "Les graines mélangées dans un récipient, deux bols vides : l'adulte prend un pois chiche à la pince, le pose dans un bol, un haricot rouge dans l'autre, en disant le nom de chaque graine.", MONTRER),
      ph("Refaire", "17 min", "Chacun trie tout le récipient ; il essaie la cuillère, puis la pince, et dit laquelle convient le mieux pour prendre une seule graine.",
        "Fait vérifier le tri à la fin : « Il n'y a que des pois chiches dans ce bol ? » On recompte les graines avant de ranger."),
      RANGER,
    ], ["Je prends une graine.", "Pois chiche ou haricot rouge ?", "Je la mets dans son bol.", "Je vérifie et je range."]),
    observer("verser, transvaser, pincer ou trier, avec l'outil qui convient.",
      "s'adapte-t-il au récipient ? choisit-il l'outil qui convient et sait-il le nommer — l'entonnoir, la seringue, le compte-gouttes, la pince à glace, la pince à épiler ? s'arrête-t-il à une goutte ? prend-il une seule graine ? trie-t-il sans erreur ? range-t-il ?"),
  ],
};

// ── 2. Ouvrir, visser, boutonner, nouer, accrocher ──

const OUVRIR_MS: Demarche = {
  id: "ateliers-ouvrir-ms",
  nom: "Ouvrir, visser, boutonner, nouer, accrocher : l'objet qui va",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir les objets et les matériaux », à partir de 4 ans (p. 61) : « Désigner et utiliser des outils ou des objets adaptés à une situation et à une action technique »`,
  resume: "Chaque objet a son partenaire : huit cadenas et leurs huit clés ; des flacons et des bocaux dont il faut trouver le bouchon ou le couvercle, à la bonne taille et au bon pas de vis ; de grosses vis et leurs écrous ; les cadres d'habillage, des boutons-pression aux boutons moyens ; un nœud simple autour d'un gros tube ; des trombones à accrocher dans chaque case d'un carton, puis en chaîne de couleurs. On nomme l'objet, on dit à quoi il sert.",
  seances: [
    seance("Huit cadenas, huit clés", "ouvrir huit cadenas de tailles différentes en cherchant pour chacun la clé qui va, puis les refermer.", 25, [
      ph("Montrer", "5 min", "Les huit cadenas fermés, les clés en vrac : l'adulte compare une clé à la serrure — trop grande, trop petite —, essaie, en prend une autre, ouvre, referme.", MONTRER),
      ph("Refaire", "17 min", "Chacun ouvre tous les cadenas, pose chaque clé à côté de son cadenas, puis les referme ; les clés se mélangent pour le suivant.",
        "Trois ou quatre cadenas en petite section ; huit maintenant, comme dans le document. Fait dire comment on reconnaît la bonne clé."),
      RANGER,
    ], ["Je prends une clé.", "Je regarde la taille de la serrure.", "J'essaie : elle tourne, le cadenas s'ouvre.", "Je referme et je range."]),
    seance("Le bon bouchon, le bon couvercle", "visser sur chaque flacon et chaque bocal le bouchon ou le couvercle qui lui va, d'après sa taille et son pas de vis.", 25, [
      ph("Montrer", "5 min", "Flacons et bocaux ouverts, bouchons et couvercles mélangés : l'adulte compare un bouchon au goulot, le pose, tourne : « Il ne serre pas : ce n'est pas le bon. » Il en essaie un autre.", MONTRER),
      ph("Refaire", "17 min", "Chacun ferme tous les flacons et tous les bocaux, puis les rouvre pour le suivant.",
        "Fait sentir la différence : le bon bouchon se visse et serre ; un autre tourne dans le vide ou n'entre pas."),
      RANGER,
    ], ["Je prends un bouchon.", "Je cherche le flacon de sa taille.", "Je visse : il serre.", "Je dévisse pour le suivant."]),
    seance("Les grosses vis et leurs écrous", "visser chaque écrou sur la vis qui lui correspond, puis le dévisser.", 25, [
      ph("Montrer", "5 min", "De grosses vis et leurs écrous, de diamètres différents : l'adulte tient la vis d'une main, engage l'écrou de l'autre, tourne jusqu'en haut, puis dévisse.", MONTRER),
      ph("Refaire", "17 min", "Chacun trouve l'écrou de chaque vis, le visse jusqu'à la tête, puis les défait.",
        "De grosses pièces en moyenne section ; les vis, les boulons et les écrous papillons de toutes tailles viendront en grande section. On compte les pièces avant et après."),
      RANGER,
    ], ["Je tiens la vis.", "Je pose l'écrou au bout.", "Je tourne jusqu'en haut.", "Je dévisse et je range."]),
    seance("Boutonner, fermer : les cadres d'habillage", "fermer et ouvrir une fermeture éclair longue, des boutons-pression et des boutons moyens.", 25, [
      ph("Montrer", "5 min", "Sur les cadres, l'adulte engage la fermeture éclair et la remonte jusqu'en haut ; il presse les boutons-pression ; il pousse un bouton à moitié dans la boutonnière, puis le tire de l'autre côté.", MONTRER),
      ph("Refaire", "17 min", "Chacun ferme et ouvre chaque cadre, en commençant par celui qu'il connaît ; puis la veste de la poupée, ou son propre gilet.",
        "Le document vise à « maitriser les différents types de fermeture » : les petits boutons attendront la grande section."),
      RANGER,
    ], ["J'engage la fermeture.", "Je la remonte jusqu'en haut.", "Je pousse le bouton dans la boutonnière.", "Je le tire de l'autre côté."]),
    seance("Le nœud simple", "faire un nœud simple avec une bande de tissu autour d'un gros tube, et le défaire.", 25, [
      ph("Montrer", "5 min", "Le gros tube en carton et deux bandes de tissu, l'une large, l'autre étroite : l'adulte passe la bande autour du tube, croise les deux bouts, passe l'un dessous, tire : « Le nœud tient. »", MONTRER),
      ph("Refaire", "17 min", "Chacun fait un nœud avec la bande large, puis avec l'étroite ; il le défait et recommence.",
        "Dit chaque geste — croiser, passer dessous, tirer — ; la boucle et le lacet viendront en grande section."),
      RANGER,
    ], ["Je passe la bande autour du tube.", "Je croise les deux bouts.", "Je passe un bout dessous.", "Je tire : le nœud tient."]),
    seance("Les trombones", "accrocher un trombone dans chaque case d'un carton quadrillé, puis faire une chaîne de trombones en alternant deux couleurs.", 25, [
      ph("Montrer", "5 min", "L'adulte écarte un trombone, le glisse sur le bord du carton, dans une case ; puis il accroche un trombone à un autre : rouge, bleu, rouge, bleu.", MONTRER),
      ph("Refaire", "17 min", "Chacun garnit toutes les cases du carton, retire les trombones, puis fait sa chaîne de couleurs.",
        "Des trombones de plusieurs tailles, comme le propose le document : les plus gros d'abord. Petits objets : l'adulte les compte avant et après."),
      RANGER,
    ], ["J'écarte le trombone.", "Je l'accroche dans une case.", "Un trombone dans chaque case.", "Je fais ma chaîne : rouge, bleu, rouge, bleu."]),
    observer("ouvrir, visser, boutonner, nouer ou accrocher.",
      "trouve-t-il la clé, le bouchon, l'écrou qui va ? visse-t-il dans le bon sens et jusqu'au bout ? ferme-t-il une fermeture éclair, un bouton ? fait-il un nœud qui tient ? nomme-t-il l'objet et dit-il à quoi il sert ?"),
  ],
};

// ── 3. Les organes des sens ──

const SENS_MS: Demarche = {
  id: "ateliers-sens-ms",
  nom: "Les yeux, les oreilles, le nez, les mains : à chaque organe son sens",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation sensorielle ; ${PROGRAMME}, « Découvrir le corps humain et la santé », à partir de 4 ans (p. 60) : « Identifier et nommer des organes sensoriels et les modalités de perception associées »`,
  resume: "Les ateliers sensoriels, plus fins, et à chaque fois l'organe qu'on nomme : retrouver deux sacs qui cachent le même objet, puis sa photo ; apparier des tissus les yeux bandés et dire ce qu'on sent ; associer les œufs sonores qui font le même bruit ; six paires de boîtes à odeurs ; des pinces à linge sur la bonne nuance de couleur. On finit par associer chaque organe à son sens — les yeux et la vue, le nez et l'odorat, la langue et le goût, la peau et le toucher, l'oreille et l'audition —, comme dans les exemples du programme.",
  seances: [
    seance("Deux sacs pareils", "retrouver par le toucher deux sacs qui cachent le même objet, puis associer l'objet à sa photo.", 25, [
      ph("Montrer", "5 min", "Dix sacs de tissu fermés, qui cachent cinq paires d'objets de la classe : l'adulte palpe un sac, dit ce qu'il sent — « c'est rond, c'est dur » —, cherche le sac qui cache le même objet, puis ouvre pour vérifier.", MONTRER),
      ph("Refaire", "17 min", "Chacun forme les cinq paires, vérifie en ouvrant, puis pose chaque objet sur sa photo.",
        "Fait dire avec quoi on a trouvé : « avec mes mains ». Le document associe aussi l'objet à « la photo de la forme »."),
      RANGER,
    ], ["Je touche un sac.", "Je dis ce que je sens.", "Je cherche le sac pareil.", "J'ouvre pour vérifier."]),
    seance("Les tissus, les yeux bandés", "retrouver, les yeux bandés, deux tissus de même texture, et nommer ce qu'ils sentent : doux, rugueux, lisse, épais.", 25, [
      ph("Montrer", "5 min", "Des paires de tissus de textures différentes : l'adulte, les yeux bandés, touche un tissu, dit ce qu'il sent, cherche le même.", MONTRER),
      ph("Refaire", "17 min", "Chacun apparie les tissus les yeux ouverts, puis bandés ; il dit ce qu'il sent avant de vérifier.",
        "Le document vise à « nommer les impressions tactiles ressenties » : apporte les mots, puis fait dire « la peau » et « le toucher »."),
      RANGER,
    ], ["Je mets le bandeau.", "Je touche un tissu.", "Je cherche le même.", "Je dis : doux, rugueux, lisse."]),
    seance("Les œufs sonores", "secouer des œufs sonores et associer les deux qui font le même bruit, en disant qu'ils écoutent avec leurs oreilles.", 25, [
      ph("Montrer", "5 min", "Des œufs sonores, ou des petites boîtes opaques remplies de graines différentes, par paires : l'adulte en secoue un près de son oreille, puis un autre : « Pareil. »", MONTRER),
      ph("Refaire", "17 min", "Chacun forme les paires et les fait vérifier par un camarade ; à la fin, on ouvre les boîtes pour voir ce qui fait le bruit.",
        "Plus de paires qu'en petite section, et des bruits plus proches. Fait dire : « J'écoute avec mes oreilles. »"),
      RANGER,
    ], ["Je secoue un œuf.", "J'écoute.", "Je cherche celui qui fait le même bruit.", "Je les pose ensemble."]),
    seance("Six paires de boîtes à odeurs", "sentir une à une des boîtes et associer, parmi six paires, les deux qui ont la même odeur.", 25, [
      ph("Montrer", "5 min", "Deux séries de six boîtes, l'une à couvercle rouge, l'autre à couvercle jaune : l'adulte sent une boîte rouge, puis les jaunes une à une, et pose ensemble les deux qui sentent pareil.", MONTRER),
      ph("Refaire", "17 min", "Chacun forme les six paires ; on nomme les odeurs qu'on reconnaît.",
        "Des odeurs de tous les jours. Fait dire : « Je sens avec mon nez. »"),
      RANGER,
    ], ["Je sens une boîte rouge.", "Je sens les boîtes jaunes, une à une.", "Je pose ensemble les deux qui sentent pareil."]),
    seance("Les nuances de couleur", "accrocher chaque pince à linge sur la bonne nuance d'une couleur, et dire laquelle est plus claire, laquelle plus foncée.", 25, [
      ph("Montrer", "5 min", "Une planche de nuances — du bleu le plus clair au plus foncé — et les pinces à linge de ces nuances : l'adulte compare une pince aux cases, l'accroche sur la sienne.", MONTRER),
      ph("Refaire", "17 min", "Chacun garnit une planche, puis celle d'une autre couleur ; au loto des couleurs, il associe les étiquettes et les nomme.",
        "Les nuances viennent après les couleurs franches de la petite section : fait dire « plus clair », « plus foncé », et « je regarde avec mes yeux »."),
      RANGER,
    ], ["Je prends une pince.", "Je cherche la même nuance.", "Je l'accroche.", "Je dis : plus clair, plus foncé."]),
    seance("À chaque organe son sens", "associer chaque organe à ce qu'il permet de percevoir : les yeux et la vue, le nez et l'odorat, la langue et le goût, la peau et le toucher, l'oreille et l'audition.", 25, [
      ph("Se souvenir", "5 min", "Les plateaux de la séquence sont posés en rond ; pour chacun, on dit ce qu'on a fait et avec quoi : « Les tissus, avec les mains. »"),
      ph("Associer", "12 min", "Les images des organes sont sur la table : chacun pose devant chaque plateau l'image de l'organe qui sert, puis on nomme le sens.",
        "Le programme donne cet exemple de réussite : « Associer les yeux et la vue, le nez et l'odorat, la langue et le gout, la peau et le toucher, l'oreille et l'audition »."),
      ph("Goûter", "8 min", "Au moment de la collation, on goûte un aliment sucré, puis un salé : « Je goûte avec ma langue. »",
        "En tenant compte des allergies connues et des projets d'accueil individualisés."),
    ], ["Je regarde le plateau.", "Je dis avec quoi on a trouvé.", "Je pose l'image de l'organe.", "Je dis le nom du sens."]),
    observer("retrouver par le toucher, l'ouïe, l'odorat ou la vue, et dire avec quel organe.",
      "apparie-t-il les sacs, les tissus, les sons, les odeurs, les nuances ? nomme-t-il ce qu'il sent — doux, rugueux, plus clair, plus foncé ? associe-t-il l'organe et le sens ?"),
  ],
};

// ── 4. Ranger par taille et par longueur ──

const TAILLES_MS: Demarche = {
  id: "ateliers-tailles-ms",
  nom: "Ranger par taille et par longueur, faire comme le modèle",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation sensorielle et intellectuelle ; ${PROGRAMME}, « Explorer des grandeurs : la longueur, la masse », à partir de 4 ans (p. 48) : « Ordonner des objets rectilignes selon leur longueur et verbaliser le résultat » ; « Explorer les solides et les formes planes » (p. 47) : « Reproduire des assemblages de solides ou de formes planes (au maximum cinq) »`,
  resume: "Six cubes en tour, puis emboîtés ; des poupées gigognes alignées de la plus grande à la plus petite ; des bûchettes, puis des pailles, rangées du plus court au plus long à partir d'une même ligne, et des pailles de même longueur à retrouver ; des bâtons et des pions posés comme sur un modèle de cinq éléments au plus. On dit le résultat : « plus long que », « plus court que », « de même longueur que ».",
  seances: [
    seance("Six cubes : la tour et l'escalier", "empiler six cubes du plus grand au plus petit, puis les emboîter, et dire lequel est plus grand que l'autre.", 25, [
      ph("Montrer", "5 min", "Les six cubes mélangés : l'adulte cherche le plus grand, le pose, puis « le plus grand de ceux qui restent », jusqu'au plus petit ; puis il les emboîte, du plus petit au plus grand.", MONTRER),
      ph("Refaire", "17 min", "Chacun construit sa tour, la défait, emboîte les cubes ; puis il les aligne en escalier.",
        "Le programme donne cet exemple à partir de 4 ans : « superposer six briques par ordre décroissant de taille afin de construire un escalier »."),
      RANGER,
    ], ["Je cherche le plus grand cube.", "Je pose le plus grand de ceux qui restent.", "Jusqu'au plus petit.", "Je les emboîte et je range."]),
    seance("Les poupées gigognes, en rang", "ouvrir les poupées gigognes, les ranger de la plus grande à la plus petite, puis les remboîter.", 25, [
      ph("Montrer", "5 min", "L'adulte ouvre toutes les poupées, les aligne de la plus grande à la plus petite en disant « plus grande que », puis les referme l'une dans l'autre.", MONTRER),
      ph("Refaire", "17 min", "Chacun les aligne, vérifie en les comparant deux à deux, les remboîte ; cinq ou six pièces maintenant.",
        "Fait situer chacune : « Elle est plus petite que celle-là et plus grande que celle-ci. »"),
      RANGER,
    ], ["J'ouvre toutes les poupées.", "Je les range de la plus grande à la plus petite.", "Je les remets l'une dans l'autre."]),
    seance("Les bûchettes, à la même origine", "ranger des bûchettes du plus court au plus long en posant leurs bouts sur une même ligne, et le dire.", 25, [
      ph("Montrer", "5 min", "Des bûchettes de longueurs proches : l'adulte les pose au hasard — « on ne voit pas laquelle est la plus longue » —, puis pousse leurs bouts contre le bord du plateau et les range en escalier.", MONTRER),
      ph("Refaire", "17 min", "Chacun range quatre bûchettes, puis six ; il montre la plus longue, la plus courte, et compare deux voisines.",
        "Le programme : « Déplacer des objets pour les mettre à la même origine que l'un d'eux afin de comparer leur longueur lorsqu'elles diffèrent de peu »."),
      RANGER,
    ], ["Je pose les bouts contre le bord.", "Je cherche la plus courte.", "Puis la plus courte de celles qui restent.", "Je dis : plus long que, plus court que."]),
    seance("Les pailles : trois groupes et des pareilles", "classer des pailles de couleurs différentes en trois groupes selon leur longueur, et retrouver celles qui ont la même longueur.", 25, [
      ph("Montrer", "5 min", "Des pailles coupées en trois longueurs, de plusieurs couleurs : l'adulte les compare deux à deux, bout contre bout, et fait trois tas : les longues, les moyennes, les courtes.", MONTRER),
      ph("Refaire", "17 min", "Chacun fait ses trois groupes sans se laisser tromper par la couleur, puis cherche deux pailles de même longueur.",
        "Le programme fait classer « quatre bandes de papier différant à la fois par leur longueur et par leur couleur » et dire « plus long que », « plus court que », « de même longueur que »."),
      RANGER,
    ], ["Je compare deux pailles, bout contre bout.", "Je fais trois tas : longues, moyennes, courtes.", "Je cherche deux pailles de même longueur."]),
    seance("Faire comme le modèle : les bâtons", "poser des bâtons en bois sur un modèle, puis à côté, pour reproduire une figure de cinq bâtons au plus.", 25, [
      ph("Montrer", "5 min", "Une fiche modèle de quatre ou cinq bâtons : l'adulte pose chaque bâton exactement sur son trait, puis refait la figure à côté de la fiche.", MONTRER),
      ph("Refaire", "17 min", "Chacun reproduit un modèle par-dessus, puis le même à côté ; il en choisit un autre.",
        "Le programme, à partir de 4 ans : « Reproduire un modèle (puzzle, pavage, assemblage de solides) comportant jusqu'à cinq éléments »."),
      RANGER,
    ], ["Je choisis un modèle.", "Je pose chaque bâton sur son trait.", "Je refais la figure à côté.", "Je compare : c'est pareil."]),
    seance("Les pions d'après un modèle de couleurs", "poser des pions de quatre couleurs sur une plaque comme sur un modèle, par-dessus, puis à côté.", 25, [
      ph("Montrer", "5 min", "La plaque, les pions de quatre couleurs et un modèle en couleurs : l'adulte pose chaque pion sur la case de sa couleur ; puis il refait le modèle sur une plaque vide, à côté, en regardant où est chaque pion.", MONTRER),
      ph("Refaire", "17 min", "Chacun reproduit un modèle par-dessus, puis à côté ; il vérifie case par case.",
        "Le document y voit du tri de couleurs et du « repérage spatial » : fait dire où va le pion — en haut, à côté du rouge, au bout de la ligne."),
      RANGER,
    ], ["Je regarde le modèle.", "Je pose le pion de la même couleur au même endroit.", "Je vérifie case par case."]),
    observer("ranger par taille ou par longueur, ou reproduire un modèle.",
      "range-t-il six cubes, cinq ou six poupées ? met-il les bûchettes à la même origine ? classe-t-il les pailles sans se laisser tromper par la couleur ? dit-il « plus long que », « plus court que », « de même longueur que » ? reproduit-il le modèle à côté ?"),
  ],
};

// ── 5. Tracer les lettres capitales et les chiffres ──

const TRACER_MS: Demarche = {
  id: "ateliers-tracer-ms",
  nom: "Tracer les lettres capitales et les chiffres, approcher la cursive",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${PROGRAMME}, « Passer de l'oral à l'écrit : se préparer à apprendre à écrire », à partir de 4 ans (p. 18) : « Tracer des lettres capitales » ; « S'initier aux tracés de l'écriture cursive » ; « Connaitre le nom des lettres », à partir de 4 ans (p. 13)`,
  resume: "Les lettres sous les doigts avant le crayon : suivre les lettres douces dans le sens des flèches ; écrire son prénom en capitales dans la semoule ; tracer les chiffres du doigt sur une pochette de gel, en suivant le modèle ; poser l'alphabet aimanté dans l'ordre ; poser les lettres scriptes à côté des capitales ; puis des boucles et des ponts dans la semoule, premiers tracés de la cursive. Tout s'efface et se recommence.",
  seances: [
    seance("Les lettres douces, dans le sens des flèches", "suivre du doigt, dans le sens des flèches, les lettres capitales de leur prénom, puis celles d'un mot de la classe, en les nommant.", 25, [
      ph("Montrer", "5 min", "L'adulte pose son doigt sur le point de départ d'une lettre douce, suit les flèches en disant chaque trait, puis nomme la lettre.", MONTRER),
      ph("Refaire", "17 min", "Chacun suit toutes les lettres de son prénom, les yeux ouverts, puis fermés, et les nomme ; puis celles d'un mot de la classe.",
        "Le document vise à « percevoir tactilement la forme des lettres » et à suivre « la trajectoire de l'écriture ». Nomme chaque lettre, à chaque fois."),
      RANGER,
    ], ["Je pose mon doigt sur le point de départ.", "Je suis les flèches.", "Je dis le nom de la lettre.", "La suivante."]),
    seance("Mon prénom en capitales dans la semoule", "écrire leur prénom en capitales dans la semoule, d'après leur étiquette, en respectant le sens des tracés.", 25, [
      ph("Montrer", "5 min", "L'étiquette du prénom posée au bord du plateau : l'adulte trace la première lettre du doigt, en regardant le modèle, la nomme, puis trace la suivante à sa droite.", MONTRER),
      ph("Refaire", "17 min", "Chacun écrit son prénom, efface en secouant le plateau, recommence ; puis un mot de la classe.",
        "Le programme, à partir de 4 ans : « Copier en lettres capitales son prénom et/ou d'autres mots du répertoire de mots familiers de la classe »."),
      RANGER,
    ], ["Je regarde mon étiquette.", "J'écris la première lettre avec mon doigt.", "J'écris la suivante, à droite.", "Je secoue pour effacer."]),
    seance("Les chiffres dans le gel", "tracer du doigt, sur une pochette de gel, les chiffres de 1 à 6 en suivant le sens du modèle, et dire le nombre.", 25, [
      ph("Montrer", "5 min", "La pochette de gel posée sur le modèle d'un chiffre : l'adulte part du point de départ et suit le tracé en disant le nombre ; puis il montre autant de doigts.", MONTRER),
      ph("Refaire", "17 min", "Chacun choisit un chiffre, le trace sur le modèle, puis sans le modèle ; il dit le nombre et montre autant de doigts.",
        "Le programme, à partir de 4 ans (p. 39) : « Écrire en chiffres les nombres de un à six », une fois le sens des quantités installé."),
      RANGER,
    ], ["Je choisis un chiffre.", "Je pose mon doigt au départ.", "Je suis le modèle.", "Je dis le nombre."]),
    seance("L'alphabet aimanté", "poser les lettres capitales aimantées dans l'ordre de l'alphabet, d'après un modèle, et en nommer le plus possible.", 25, [
      ph("Montrer", "5 min", "Le support en métal et la bande modèle de l'alphabet : l'adulte cherche le A, le pose sous le modèle, puis le B, en nommant chaque lettre.", MONTRER),
      ph("Refaire", "17 min", "Chacun pose les lettres dans l'ordre, en suivant le modèle ; il nomme celles qu'il connaît, puis celles de son prénom.",
        "Le document vise à « reproduire un modèle alphabétique » ; nommer toutes les lettres de l'alphabet viendra en grande section."),
      RANGER,
    ], ["Je regarde le modèle.", "Je cherche le A.", "Je pose les lettres dans l'ordre.", "Je dis celles que je connais."]),
    seance("Les scriptes à côté des capitales", "poser chaque lettre script en mousse à côté de la lettre capitale qui lui correspond, et les nommer.", 25, [
      ph("Montrer", "5 min", "La fiche de l'alphabet en capitales et les lettres scriptes en mousse : l'adulte prend le a, cherche le A, pose l'un à côté de l'autre : « C'est la même lettre, écrite autrement. »", MONTRER),
      ph("Refaire", "17 min", "Chacun associe les lettres de son prénom, puis d'autres ; on vérifie ensemble.",
        "Le programme, à partir de 4 ans : « Connaitre la correspondance entre les lettres scriptes majuscules et minuscules et les lettres cursives minuscules » ; les cursives viendront ensuite."),
      RANGER,
    ], ["Je prends une lettre en mousse.", "Je cherche la même en capitale.", "Je la pose à côté.", "Je dis son nom."]),
    seance("Boucles et ponts dans la semoule", "tracer dans la semoule des boucles, des ponts et des vagues sans lever le doigt, en respectant le sens du tracé : les premiers gestes de la cursive.", 25, [
      ph("Montrer", "5 min", "Une bande modèle de motifs — boucles, ponts, vagues — : l'adulte trace chaque motif du doigt dans la semoule, sans lever le doigt, en disant le geste : « Je monte, je tourne, je redescends. »", MONTRER),
      ph("Refaire", "17 min", "Chacun reproduit les motifs sans lever le doigt ; puis, s'il est prêt, une lettre cursive de son prénom, sur le modèle.",
        "Le programme introduit l'écriture cursive « en moyenne section ou lorsque l'enfant est prêt » ; le document fait « reproduire un motif graphique en respectant le sens du tracé »."),
      RANGER,
    ], ["Je regarde le modèle.", "Je trace sans lever le doigt.", "Je respecte le sens.", "Je secoue pour effacer."]),
    observer("tracer, retrouver ou associer des lettres et des chiffres.",
      "suit-il la lettre dans le sens des flèches ? écrit-il son prénom en capitales, de gauche à droite ? trace-t-il les chiffres dans le bon sens ? nomme-t-il les lettres de son prénom ? associe-t-il script et capitale ? trace-t-il une boucle sans lever le doigt ?"),
  ],
};

// ══ Grande section ════════════════════════════════════════════════════════

// ── 1. Les outils sans danger ──

/** En grande section, chaque plateau finit par sa règle de sécurité, dite par la classe. */
const regle = (texte: string) => ph("Dire la règle", "5 min", texte, "Elle rejoint l'affiche des règles de sécurité de la classe.");

const VERSER_GS: Demarche = {
  id: "ateliers-verser-gs",
  nom: "Verser, pincer, découper, tailler : les outils sans danger",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir les objets et les matériaux », à partir de 5 ans (p. 62) : « Identifier et prévenir les risques liés à certains objets » ; les risques que nomme « Découvrir le monde de la matière et des objets » (p. 60)`,
  resume: "Les gestes précis de la grande section, et le danger que chacun peut faire courir, dit et prévenu : verser jusqu'au trait et éponger ce qui coule, pour ne pas glisser ; le nombre de gouttes demandé, pas plus, au compte-gouttes ; une graine à la fois à la pince à épiler, sans rien porter à la bouche ; trier les graines à la cuillère ou à la pince ; découper des bandes et des ronds aux ciseaux ; tailler un crayon au-dessus de la barquette. Chaque plateau finit par sa règle de sécurité, que la classe affiche.",
  seances: [
    seance("Verser sans renverser, éponger pour ne pas glisser", "verser jusqu'au trait dans des verres marqués et dans une bouteille avec l'entonnoir, et éponger aussitôt ce qui coule, en disant pourquoi.", 30, [
      ph("Montrer", "5 min", "L'adulte verse jusqu'au trait, puis laisse couler un peu d'eau par terre : « Si je la laisse, quelqu'un peut glisser. » Il éponge tout de suite.", MONTRER),
      ph("Refaire", "20 min", "Chacun verse dans des verres marqués à des hauteurs différentes, puis dans la bouteille avec l'entonnoir ; il éponge ce qui coule, sur la table comme par terre.",
        "Le programme cite ce risque : « risque de chute dans le cas de manipulation d'eau »."),
      regle("On dit ensemble la règle du plateau : « L'eau qui coule, je l'éponge tout de suite. »"),
    ], ["Je verse jusqu'au trait.", "Pour la bouteille, je prends l'entonnoir.", "Si ça coule, j'éponge tout de suite.", "Je range."]),
    seance("Le compte-gouttes : le nombre demandé, pas plus", "déposer au compte-gouttes, dans chaque alvéole, le nombre de gouttes que porte sa carte, en arrêtant leur geste.", 30, [
      ph("Montrer", "5 min", "Devant chaque alvéole, une carte porte un nombre de 1 à 5 : l'adulte aspire l'eau colorée, compte les gouttes à voix haute, s'arrête au bon nombre.", MONTRER),
      ph("Refaire", "20 min", "Chacun dépose dans chaque alvéole autant de gouttes que sa carte le dit, puis vérifie avec un camarade.",
        "Le document vise à « verser en respectant une limite » ; on rappelle avant de commencer que l'eau colorée ne se boit pas."),
      regle("« Ce qui est sur le plateau ne va pas à la bouche. »"),
    ], ["Je regarde le nombre.", "J'aspire l'eau.", "Je compte les gouttes.", "Je m'arrête au bon nombre."]),
    seance("La pince à épiler et les graines", "saisir une à une des graines avec une pince à épiler, une par alvéole, sans en perdre ni en porter à la bouche.", 30, [
      ph("Montrer", "5 min", "L'adulte compte les graines avec le groupe, puis les dépose une à une, la pince tenue entre le pouce et l'index ; à la fin, il recompte : « Il n'en manque aucune. »", MONTRER),
      ph("Refaire", "20 min", "Chacun remplit les alvéoles, puis les vide dans le bol ; on recompte les graines avant de ranger.",
        "Le programme met en garde contre les « petits objets qui présentent des risques d'étouffement en cas d'ingestion » : on dit pourquoi on compte."),
      regle("« Les graines restent sur le plateau ; on les compte avant et après. »"),
    ], ["Je compte les graines.", "Je tiens la pince entre le pouce et l'index.", "Une graine dans chaque alvéole.", "Je recompte avant de ranger."]),
    seance("Trier les graines : la cuillère ou la pince ?", "trier des pois chiches et des haricots rouges en choisissant l'outil qui convient, et dire pourquoi.", 30, [
      ph("Montrer", "5 min", "Le mélange de graines et deux bols : l'adulte essaie la cuillère — elle prend plusieurs graines à la fois —, puis la pince — une seule, celle qu'on veut.", MONTRER),
      ph("Refaire", "20 min", "Chacun trie le mélange avec l'outil de son choix, en change s'il veut, et explique : « La pince, parce qu'elle prend une seule graine. »",
        "Le document vise à « trier selon un critère » et à « pincer entre l'index et le pouce »."),
      regle("On recompte, on range ; chacun dit l'outil qu'il a choisi, et pourquoi."),
    ], ["Je choisis la cuillère ou la pince.", "Je mets les pois chiches dans un bol.", "Les haricots rouges dans l'autre.", "Je dis pourquoi j'ai choisi cet outil."]),
    seance("Découper et coller", "découper aux ciseaux une bande sur ses traits et un rond sur son contour, en tenant les ciseaux sans danger, puis coller leurs formes comme ils le veulent.", 30, [
      ph("Montrer", "5 min", "L'adulte montre comment on porte les ciseaux — fermés, la pointe vers le bas, dans la main —, puis découpe une bande sur un trait, en ouvrant grand et en fermant jusqu'au bout ; puis un rond, en tournant la feuille plutôt que les ciseaux.", MONTRER),
      ph("Refaire", "20 min", "Chacun découpe des bandes — traits droits, puis en vagues —, puis des ronds, et colle ses formes sur une feuille comme il le veut.",
        "Le programme range les « outils qui pincent ou coupent » parmi les risques : des ciseaux adaptés à chaque main, gauchers compris."),
      regle("« Je porte les ciseaux fermés, la pointe vers le bas. Je coupe loin de mes doigts. »"),
    ], ["Je porte les ciseaux fermés.", "J'ouvre grand, je ferme jusqu'au bout.", "Pour le rond, je tourne la feuille.", "Je colle mes formes comme je veux."]),
    seance("Tailler un crayon", "tailler un crayon au-dessus de la barquette, jeter les rognures et dire pourquoi on ne met jamais le doigt dans le taille-crayon.", 30, [
      ph("Montrer", "5 min", "L'adulte tient le taille-crayon au-dessus de la barquette, tourne le crayon, regarde la pointe, s'arrête ; il vide les rognures à la poubelle. Il montre la lame : « Elle coupe le bois ; elle coupe aussi les doigts. »", MONTRER),
      ph("Refaire", "20 min", "Chacun taille les crayons du plateau, s'arrête quand la pointe est faite, vide la barquette.",
        "Le document propose des crayons de couleur usagés : on peut les tailler jusqu'au bout."),
      regle("« Je tourne le crayon au-dessus de la barquette ; je ne mets jamais le doigt dans le taille-crayon. »"),
    ], ["Je tiens le taille-crayon au-dessus de la barquette.", "Je tourne le crayon.", "Je m'arrête quand la pointe est faite.", "Je jette les rognures à la poubelle."]),
    observer("verser, pincer, trier, découper ou tailler, sans danger.",
      "verse-t-il jusqu'au trait, éponge-t-il ce qui coule ? compte-t-il ses gouttes et ses graines ? tient-il la pince entre le pouce et l'index ? porte-t-il les ciseaux fermés ? tourne-t-il le crayon au-dessus de la barquette ? dit-il le danger, et la règle qui l'évite ?"),
  ],
};

// ── 2. À quoi sert chaque partie ──

const OUVRIR_GS: Demarche = {
  id: "ateliers-ouvrir-gs",
  nom: "Visser, ouvrir, boutonner, nouer : à quoi sert chaque partie",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers de vie pratique ; ${PROGRAMME}, « Découvrir les objets et les matériaux », à partir de 5 ans (p. 61) : « Associer une solution technique à une fonction technique »`,
  resume: "Comprendre à quoi sert chaque partie d'un objet, en s'en servant : l'arrosoir du programme — sa poignée, son réservoir, sa pomme — ; des vis et des boulons de diamètres différents, des écrous simples ou papillons ; huit cadenas et des clés pièges ; les cadres d'habillage jusqu'aux petits boutons ; le nœud et la boucle ; des trombones de toutes tailles sur un carton quadrillé. À chaque plateau, on dit ce que fait l'objet, et ce qui, en lui, le permet.",
  seances: [
    seance("L'arrosoir : la poignée, le réservoir, la pomme", "dire à quoi sert chaque partie d'un arrosoir — le porter, contenir l'eau, la répartir —, en s'en servant.", 25, [
      ph("Observer", "5 min", "Un arrosoir, avec et sans sa pomme : on le nomme, on montre ses parties ; chacun dit ce qu'il croit qu'elles font."),
      ph("Essayer", "15 min", "Au jardin ou au bac à eau : on le porte plein, par la poignée, puis sans ; on arrose avec la pomme, puis sans : « Avec la pomme, l'eau tombe en pluie. »",
        "Le programme donne cet exemple : « Identifier et comprendre que la poignée de l'arrosoir sert à le transporter, que le réservoir sert à contenir l'eau et que la pomme sert à mieux répartir l'eau »."),
      ph("Dire", "5 min", "Sur la photo de l'arrosoir, chaque partie reçoit son étiquette et sa fonction : « La pomme sert à répartir l'eau. »"),
    ], ["Je porte l'arrosoir par la poignée.", "Je le remplis : l'eau est dans le réservoir.", "J'arrose avec la pomme.", "Je dis à quoi sert chaque partie."]),
    seance("Le bon écrou pour chaque vis", "visser chaque vis ou chaque boulon dans l'écrou de son diamètre, et dire à quoi servent les ailes d'un écrou papillon.", 25, [
      ph("Montrer", "5 min", "Des vis et des boulons de diamètres différents, des écrous simples et papillons : l'adulte essaie un écrou — il n'entre pas, « trop petit » —, un autre — il ne serre pas, « trop grand » —, puis le bon, qui se visse.", MONTRER),
      ph("Refaire", "17 min", "Chacun visse chaque vis à son écrou, puis les défait ; il tourne un écrou papillon avec les doigts, puis un écrou simple, et compare.",
        "Fait dire ce que permet la forme : « Les ailes servent à tourner l'écrou avec les doigts. » Petites pièces : comptées avant et après."),
      RANGER,
    ], ["Je prends une vis.", "Je cherche l'écrou qui va.", "Je visse jusqu'au bout.", "Je dévisse et je compte les pièces."]),
    seance("Les cadenas et les clés pièges", "ouvrir huit cadenas en écartant les clés qui ne vont à aucun, et dire à quoi on reconnaît la bonne clé.", 25, [
      ph("Montrer", "5 min", "Les huit cadenas, leurs clés et deux ou trois clés pièges : l'adulte essaie une clé piège dans chaque cadenas — elle n'entre pas, ou ne tourne pas — et la pose à part : « Elle n'ouvre rien. »", MONTRER),
      ph("Refaire", "17 min", "Chacun ouvre tous les cadenas, met les clés pièges de côté, referme ; on compare les clés : leurs dents ne sont pas les mêmes.",
        "Le document ajoute ces clés pièges pour faire évoluer l'atelier. Fait dire pourquoi une seule clé ouvre : sa forme va avec la serrure."),
      RANGER,
    ], ["J'essaie une clé.", "Elle ne tourne pas : j'en prends une autre.", "Les clés qui n'ouvrent rien, je les pose à part.", "Je referme les cadenas."]),
    seance("Les petits boutons et les fermetures longues", "boutonner de petits boutons et fermer une longue fermeture éclair, et dire à quoi servent la boutonnière et le curseur.", 25, [
      ph("Montrer", "5 min", "Sur les cadres d'habillage, l'adulte boutonne de petits boutons, puis ferme la longue fermeture : « Le curseur fait entrer les dents l'une dans l'autre ; la boutonnière est juste assez grande pour le bouton. »", MONTRER),
      ph("Refaire", "17 min", "Chacun ferme et ouvre chaque cadre, des plus gros boutons aux plus petits ; puis son manteau, seul, avant la récréation.",
        "Fait chercher pourquoi le bouton ne sort pas tout seul : la boutonnière est juste à sa taille."),
      RANGER,
    ], ["Je pousse le bouton dans la boutonnière.", "Je le tire de l'autre côté.", "J'engage la fermeture.", "Je monte le curseur jusqu'en haut."]),
    seance("Le nœud et la boucle", "faire un nœud simple, puis une boucle, autour d'un gros tube, et dire pourquoi la boucle se défait d'un seul geste.", 25, [
      ph("Montrer", "5 min", "Le gros tube en carton, deux bandes de tissu de largeurs différentes et un lacet : l'adulte fait un nœud simple avec la bande large, puis une boucle avec le lacet : « Je tire sur un bout : tout se défait. »", MONTRER),
      ph("Refaire", "17 min", "Chacun fait un nœud simple avec chaque bande, puis s'essaie à la boucle avec le lacet ; il compare : le nœud tient, la boucle tient et se défait vite.",
        "Dit chaque étape dans l'ordre et la fait redire : les mots aident à s'en souvenir."),
      RANGER,
    ], ["Je fais un nœud : croiser, passer dessous, tirer.", "Je fais une boucle avec un bout.", "Je fais le tour avec l'autre et je le passe dans le trou.", "Je tire sur les deux boucles."]),
    seance("Les trombones de toutes tailles", "accrocher dans chaque case d'un carton quadrillé un trombone de la bonne taille, et dire ce qui le fait tenir.", 25, [
      ph("Montrer", "5 min", "Des trombones de tailles différentes, un carton quadrillé fin et un plus épais : l'adulte glisse un petit trombone sur le fin, un grand sur l'épais : « Il serre le carton entre ses boucles. »", MONTRER),
      ph("Refaire", "17 min", "Chacun garnit les cases, choisit la taille qui tient, puis décroche et range les trombones par taille.",
        "Le document fait varier la taille des trombones : fait dire lequel tient le mieux sur le carton épais, et pourquoi."),
      RANGER,
    ], ["J'écarte le trombone.", "Je le glisse sur le bord de la case.", "Un trombone dans chaque case.", "Je les range par taille."]),
    observer("visser, ouvrir, boutonner, nouer ou accrocher, et dire à quoi sert chaque partie.",
      "trouve-t-il l'écrou, la clé qui va ? écarte-t-il les clés pièges ? boutonne-t-il les petits boutons ? fait-il un nœud, une boucle ? dit-il à quoi sert une partie de l'objet — la poignée, les ailes de l'écrou, la boutonnière ?"),
  ],
};

// ── 3. Les lettres, en trois graphies ──

const LETTRES_GS: Demarche = {
  id: "ateliers-lettres-gs",
  nom: "Les lettres en trois graphies, les sons dans les mots",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${PROGRAMME}, « Connaitre le nom des lettres », à partir de 5 ans (p. 14) : « Connaitre les différentes graphies d'une même lettre (majuscule lettre capitale ; minuscules scriptes ; cursives) »`,
  resume: "Les lettres qu'on touche, qu'on pose et qu'on associe : l'alphabet aimanté dans l'ordre, sans modèle pour qui peut ; les lettres scriptes à côté des capitales ; sur les roues des lettres, les pinces des scriptes sur les capitales, puis celles des cursives sur les scriptes ; les cartes-sons à ranger selon qu'on entend le son ou non, avec leur planche de correction ; un prénom épelé à un camarade, qui le compose. En grande section, le programme ne fixe plus d'objectif sur les organes des sens : les ateliers sensoriels du document y deviennent ceux des lettres.",
  seances: [
    seance("L'alphabet aimanté, dans l'ordre", "poser les vingt-six lettres capitales aimantées dans l'ordre de l'alphabet, avec puis sans modèle, en les nommant.", 25, [
      ph("Montrer", "5 min", "L'adulte pose le A, le B, le C sur le support en métal en les nommant, regarde le modèle quand il hésite — « Après le J ? » —, puis cache le modèle.", MONTRER),
      ph("Refaire", "17 min", "Chacun pose tout l'alphabet avec le modèle, puis un morceau sans le modèle ; il vérifie en le découvrant.",
        "Le programme, à partir de 5 ans : « Connaitre le nom des lettres de l'alphabet »."),
      RANGER,
    ], ["Je prends le A.", "Je pose les lettres dans l'ordre.", "Je dis leur nom.", "Je vérifie avec le modèle."]),
    seance("Les scriptes à côté des capitales", "poser chaque lettre script à côté de sa capitale sur la fiche de l'alphabet, et nommer les lettres.", 25, [
      ph("Montrer", "5 min", "La fiche de l'alphabet en capitales et les lettres scriptes en mousse : l'adulte prend le g, hésite avec le q, pose le g à côté du G : « G, g : même nom, autre forme. »", MONTRER),
      ph("Refaire", "17 min", "Chacun pose les scriptes sur toute la fiche, nomme chaque paire ; on vérifie ensemble les lettres qui se ressemblent.",
        "Le document vise à « établir la correspondance capitales/scripts »."),
      RANGER,
    ], ["Je prends une lettre script.", "Je cherche sa capitale.", "Je la pose à côté.", "Je dis son nom."]),
    seance("Les roues des lettres : script sur capitale", "accrocher chaque pince portant une lettre script sur la lettre capitale qui lui correspond, sur la roue.", 25, [
      ph("Montrer", "5 min", "La roue des capitales et les pinces des scriptes : l'adulte prend la pince du e, cherche le E, l'accroche, et nomme la lettre.", MONTRER),
      ph("Refaire", "17 min", "Chacun garnit toute la roue, puis la fait vérifier par un camarade ; on lit ensemble les lettres de la roue.",
        "Fait dire le nom de chaque lettre en l'accrochant ; une roue de moins de lettres pour qui débute."),
      RANGER,
    ], ["Je prends une pince.", "Je cherche la capitale qui va.", "J'accroche la pince.", "Je dis le nom de la lettre."]),
    seance("Les roues des lettres : cursive sur script", "accrocher chaque pince portant une lettre cursive sur la lettre script qui lui correspond, et distinguer b et d, p et q grâce à la cursive.", 25, [
      ph("Montrer", "5 min", "La roue des scriptes et les pinces des cursives : l'adulte accroche le b cursif sur le b, puis montre le d : « En cursive, on ne peut pas les confondre. »", MONTRER),
      ph("Refaire", "17 min", "Chacun garnit la roue ; puis on cherche les lettres qui se ressemblent en script — b, d, p, q — et on les écrit du doigt en cursive.",
        "Le programme, à partir de 5 ans : « Distinguer des lettres visuellement proches (b/d, c/e/o, p/q) grâce à leur écriture cursive et les nommer correctement »."),
      RANGER,
    ], ["Je prends une pince cursive.", "Je cherche la lettre script qui va.", "J'accroche la pince.", "Je dis le nom de la lettre."]),
    seance("Les cartes-sons : j'entends, je n'entends pas", "ranger des cartes images selon qu'ils entendent ou non un son dans le mot, et vérifier avec la planche de correction.", 25, [
      ph("Montrer", "5 min", "Le son du jour — /f/, par exemple — et les cartes images : l'adulte dit le nom de l'image lentement, en prolongeant les sons, puis pose la carte dans la famille « j'entends » ou « je n'entends pas ».", MONTRER),
      ph("Refaire", "17 min", "Chacun range les cartes, puis vérifie seul avec la planche de correction ; il redit les mots où il s'est trompé.",
        "D'abord des sons qu'on peut prolonger : le programme fait prolonger « les phonèmes (voyelles, consonnes fricatives : s/r/f/v/j/ch et liquide : l) »."),
      RANGER,
    ], ["Je dis le nom de l'image lentement.", "J'entends le son, ou pas ?", "Je pose la carte dans sa famille.", "Je vérifie avec la planche."]),
    seance("Épeler, composer", "épeler leur prénom ou un mot connu à un camarade qui le compose avec les lettres mobiles, puis le retrouver dans les trois graphies.", 25, [
      ph("Montrer", "5 min", "L'adulte épelle un mot de la classe, lettre après lettre ; un élève cherche chaque lettre mobile et compose le mot ; on compare au modèle.", MONTRER),
      ph("Refaire", "17 min", "Deux par deux : l'un épelle son prénom, l'autre le compose ; on change. Puis on retrouve le même prénom écrit en capitales, en script et en cursive sur les étiquettes de la classe.",
        "Le programme : « Épeler les lettres d'un mot connu afin qu'un tiers puisse l'écrire » ; « Reconnaitre et nommer toutes les lettres d'un mot écrit dans les trois graphies »."),
      RANGER,
    ], ["J'épelle mon prénom, lettre après lettre.", "Mon camarade le compose.", "On vérifie avec l'étiquette.", "On change de rôle."]),
    observer("poser, associer ou épeler des lettres, ou ranger des cartes-sons.",
      "pose-t-il l'alphabet dans l'ordre, sans modèle ? associe-t-il capitale, script et cursive ? distingue-t-il b et d, p et q ? entend-il le son dans le mot ? épelle-t-il son prénom ?"),
  ],
};

// ── 4. Ranger cinq longueurs, reproduire le tangram ──

const TAILLES_GS: Demarche = {
  id: "ateliers-tailles-gs",
  nom: "Ranger cinq longueurs, reporter, reproduire le tangram",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation sensorielle et intellectuelle ; ${PROGRAMME}, « Explorer des grandeurs : la longueur, la masse », à partir de 5 ans (p. 48) : « Ordonner des objets rectilignes selon leur longueur (au maximum cinq) » ; « Explorer les solides et les formes planes » (p. 47) : « Reproduire des assemblages de solides (au maximum cinq) et de formes planes (au maximum huit) »`,
  resume: "Les barres rouges rangées cinq par cinq, à la même origine ; des pailles comparées sur une bande témoin quand on ne peut pas les rapprocher ; une paille coupée de même longueur qu'une autre ; le tangram de sept pièces sur ses fiches, avec les traits puis sans ; des bâtons et des pions posés à côté d'un modèle. On dit le résultat, et comment on a fait.",
  seances: [
    seance("Les barres rouges, cinq par cinq", "ranger cinq barres de la plus courte à la plus longue, à la même origine, et dire le résultat.", 25, [
      ph("Montrer", "5 min", "Cinq des dix barres rouges, au sol, en désordre : l'adulte aligne leurs bouts contre le mur, cherche la plus courte, puis la plus courte de celles qui restent : « Elle est plus longue que celle-ci, plus courte que celle-là. »", MONTRER),
      ph("Refaire", "17 min", "Chacun range cinq barres, puis cinq autres, plus proches en longueur ; il vérifie en passant la main le long de l'escalier.",
        "Le programme fixe en grande section « au maximum cinq » objets à ordonner : on prend les barres du document cinq par cinq."),
      RANGER,
    ], ["J'aligne les bouts contre le mur.", "Je cherche la plus courte.", "Puis la plus courte de celles qui restent.", "Je dis : plus courte que, plus longue que."]),
    seance("La bande témoin", "reporter sur une bande de papier la longueur de pailles qu'on ne peut pas rapprocher, pour les comparer et les ranger.", 25, [
      ph("Montrer", "5 min", "Des pailles fixées sur des cartons, posés loin les uns des autres : on ne peut pas les mettre côte à côte. L'adulte pose une bande de papier contre la première, marque sa longueur d'un trait, puis va comparer avec la suivante.", MONTRER),
      ph("Refaire", "17 min", "Chacun reporte trois, puis cinq longueurs sur sa bande, d'un trait chacune ; il range les cartons d'après sa bande et vérifie.",
        "Le programme, à partir de 5 ans : « Utiliser une bande témoin pour y reporter différentes longueurs afin de les comparer »."),
      RANGER,
    ], ["Je pose ma bande contre la paille.", "Je marque sa longueur d'un trait.", "Je compare avec les autres.", "Je les range."]),
    seance("Une paille de même longueur", "couper une paille de la même longueur qu'une paille modèle, et vérifier en les mettant côte à côte.", 25, [
      ph("Montrer", "5 min", "L'adulte pose la paille modèle contre une paille plus longue, bout contre bout, marque d'un trait où elle s'arrête, coupe et vérifie : « De même longueur. »", MONTRER),
      ph("Refaire", "17 min", "Chacun reçoit une paille modèle, en coupe une de même longueur, vérifie ; puis un camarade vérifie à son tour.",
        "Le programme, à partir de 5 ans : « Produire un objet rectiligne de même longueur qu'un objet donné ». Les ciseaux se portent fermés, la pointe vers le bas."),
      RANGER,
    ], ["Je mets les deux pailles bout contre bout.", "Je marque où s'arrête le modèle.", "Je coupe sur le trait.", "Je vérifie : de même longueur."]),
    seance("Le tangram, avec les traits", "recouvrir un modèle du tangram dont les pièces sont dessinées, en tournant et en retournant les pièces.", 25, [
      ph("Montrer", "5 min", "Les sept pièces du tangram et une fiche où chaque pièce est tracée : l'adulte cherche la pièce qui va dans chaque forme, la tourne jusqu'à ce qu'elle tombe juste, et nomme les triangles et le carré.", MONTRER),
      ph("Refaire", "17 min", "Chacun recouvre une fiche, puis une autre, avec plus de pièces ; il nomme les pièces qu'il pose.",
        "Le document propose des fiches « avec ou sans traits pour aider » : avec, d'abord."),
      RANGER,
    ], ["Je choisis une fiche.", "Je cherche la pièce qui va.", "Je la tourne, je la retourne.", "Elle tombe juste : la suivante."]),
    seance("Le tangram, sans les traits", "reproduire une silhouette du tangram dont les pièces ne sont pas dessinées, avec les sept pièces.", 25, [
      ph("Montrer", "5 min", "Une silhouette pleine, sans aucun trait : l'adulte pose d'abord les grands triangles, regarde ce qui reste, essaie, retire, recommence.", MONTRER),
      ph("Refaire", "17 min", "Chacun reproduit une silhouette sur la fiche, puis d'après un modèle plus petit ; il s'aide d'une fiche avec les traits s'il est bloqué.",
        "Le programme, à partir de 5 ans : des assemblages « de formes planes (au maximum huit) » — le tangram en compte sept —, d'après un modèle « non nécessairement à l'échelle »."),
      RANGER,
    ], ["Je regarde la silhouette.", "Je pose d'abord les grands triangles.", "J'essaie les autres pièces.", "Je vérifie : rien ne dépasse."]),
    seance("À côté du modèle : les bâtons et les pions", "reproduire à côté d'un modèle une figure de bâtons et un dessin de pions de couleur, sans poser dessus.", 25, [
      ph("Montrer", "5 min", "Une fiche modèle de bâtons et une de pions : l'adulte reproduit chacune à côté, en vérifiant chaque élément : « Ce bâton touche celui-ci ; ce pion est au bout de la ligne. »", MONTRER),
      ph("Refaire", "17 min", "Chacun reproduit un modèle de bâtons, puis de pions, à côté de la fiche ; un camarade compare.",
        "Le document fait réaliser le modèle « par-dessus ou à côté » : à côté maintenant, en disant où est chaque élément."),
      RANGER,
    ], ["Je regarde le modèle.", "Je pose le premier élément à côté.", "Je regarde où va le suivant.", "Je compare avec le modèle."]),
    observer("ranger des longueurs ou reproduire un modèle.",
      "aligne-t-il les bouts avant de comparer ? range-t-il cinq longueurs ? se sert-il de la bande témoin ? coupe-t-il une paille de même longueur ? reproduit-il le tangram sans les traits ? reproduit-il un modèle à côté ? dit-il comment il a fait ?"),
  ],
};

// ── 5. Écrire son prénom en cursive, tracer à la règle ──

const TRACER_GS: Demarche = {
  id: "ateliers-tracer-gs",
  nom: "Écrire son prénom en cursive, tracer à la règle, inventer des graphismes",
  famille: "Maternelle",
  source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${PROGRAMME}, « Passer de l'oral à l'écrit : se préparer à apprendre à écrire », à partir de 5 ans (p. 18) : « Travailler la ligature entre deux lettres » ; « Tracer des lettres en écriture cursive, les enchainer » ; « Explorer les solides et les formes planes » (p. 47) : « S'approprier la règle comme outil de tracé »`,
  resume: "Le prénom en cursive dans la semoule, sur le modèle puis de mémoire ; deux lettres liées, sans lever le doigt ; les nombres de 1 à 10 tracés du doigt sur la pochette de gel ; des lignes à la règle et des formes aux tracettes ; le contour d'un bloc logique, garni de graphismes inventés ; un animal dessiné pas à pas sur l'ardoise. Tout s'efface et se recommence avant d'aller sur le papier.",
  seances: [
    seance("Mon prénom en cursive dans la semoule", "écrire leur prénom en cursive dans la semoule, en enchaînant les lettres, sur le modèle puis de mémoire.", 25, [
      ph("Montrer", "5 min", "L'étiquette du prénom en cursive au bord du plateau : l'adulte trace la première lettre, enchaîne la suivante sans lever le doigt, en disant le geste ; il efface et recommence sans regarder le modèle.", MONTRER),
      ph("Refaire", "17 min", "Chacun écrit son prénom sur le modèle, plusieurs fois ; puis il cache l'étiquette, l'écrit de mémoire, et compare.",
        "Le programme, à partir de 5 ans : « Mémoriser et automatiser le tracé des lettres en cursive et leur enchainement pour écrire son prénom sans modèle »."),
      RANGER,
    ], ["Je regarde mon prénom en cursive.", "Je trace la première lettre.", "J'enchaîne la suivante sans lever le doigt.", "Je cache le modèle et j'essaie."]),
    seance("Enchaîner deux lettres", "tracer dans la semoule ou sur le gel deux lettres cursives liées — le, la, li, ma, mo — en soignant la liaison.", 25, [
      ph("Montrer", "5 min", "L'adulte trace un l, puis montre où commence la liaison vers le e : « Je ne lève pas le doigt : je remonte et j'attache le e. »", MONTRER),
      ph("Refaire", "17 min", "Chacun trace les paires de lettres de la bande modèle, puis celles qu'il trouve dans son prénom.",
        "Le programme, à partir de 5 ans : « Travailler la ligature entre deux lettres »."),
      RANGER,
    ], ["Je trace la première lettre.", "Je ne lève pas le doigt.", "J'attache la deuxième.", "Je recommence avec une autre paire."]),
    seance("Les nombres de 1 à 10 dans le gel", "tracer du doigt, sur la pochette de gel, les nombres de 1 à 10 en suivant le sens du modèle.", 25, [
      ph("Montrer", "5 min", "La pochette posée sur le modèle : l'adulte trace le 7 en partant du point de départ, en disant le nombre ; puis le 10 : « un 1, puis un 0 ».", MONTRER),
      ph("Refaire", "17 min", "Chacun trace les nombres dans l'ordre, puis ceux qu'on lui dit ; il les trace ensuite sans le modèle.",
        "Le programme, à partir de 5 ans (p. 41) : « Écrire en chiffres les nombres de un à dix »."),
      RANGER,
    ], ["Je pose mon doigt au point de départ.", "Je suis le modèle.", "Je dis le nombre.", "Je le trace sans le modèle."]),
    seance("Tracer à la règle et aux tracettes", "tenir une règle à plat pour tracer un trait droit au crayon, et tracer des formes avec des tracettes.", 25, [
      ph("Montrer", "5 min", "L'adulte pose la règle, l'appuie de toute la main à plat, trace le long du bord sans s'arrêter ; puis il fait le tour d'une forme de la tracette.", MONTRER),
      ph("Refaire", "17 min", "Chacun relie des points à la règle, trace des lignes qui se croisent, puis des formes aux tracettes ; il colorie ce qu'il a fait.",
        "Le programme, à partir de 5 ans : « Utiliser la règle pour effectuer des tracés »."),
      RANGER,
    ], ["J'appuie la règle avec toute ma main.", "Je trace le long du bord.", "Je ne m'arrête pas.", "Je fais le tour de la forme."]),
    seance("Contours et graphismes", "faire le contour d'un bloc logique, puis remplir la forme de graphismes de leur choix.", 25, [
      ph("Montrer", "5 min", "L'adulte tient le bloc à plat, en fait le tour au crayon, puis garnit l'intérieur de lignes, de boucles, de points pris dans le répertoire graphique de la classe.", MONTRER),
      ph("Refaire", "17 min", "Chacun choisit trois formes, en fait le contour, invente un graphisme pour chacune.",
        "Le programme, à partir de 5 ans : « Créer de nouveaux motifs » ; le document y cherche un « geste précis et adapté »."),
      RANGER,
    ], ["Je tiens le bloc à plat.", "J'en fais le tour au crayon.", "Je choisis un graphisme.", "Je remplis la forme."]),
    seance("Dessiner pas à pas", "dessiner un animal sur l'ardoise en suivant un modèle, étape par étape.", 25, [
      ph("Montrer", "5 min", "Le modèle de dessin en étapes : l'adulte fait la première étape, la compare, puis la suivante, en nommant les formes : un rond pour la tête, deux triangles pour les oreilles.", MONTRER),
      ph("Refaire", "17 min", "Chacun choisit un animal et le dessine étape par étape sur l'ardoise, efface, recommence, puis en dessine un sans le modèle.",
        "Le document y fait « expérimenter les procédés du dessin »."),
      RANGER,
    ], ["Je choisis un animal.", "Je fais la première étape.", "Je regarde le modèle.", "L'étape suivante, jusqu'au bout."]),
    observer("écrire son prénom en cursive, tracer à la règle ou dessiner.",
      "écrit-il son prénom en cursive sans modèle ? enchaîne-t-il deux lettres ? trace-t-il les nombres dans le bon sens ? tient-il la règle à plat ? invente-t-il un graphisme ? suit-il les étapes d'un dessin ?"),
  ],
};

/** Les cinq séquences de moyenne section, d'après les ateliers du document. */
export const DEMARCHES_ATELIERS_MS: Demarche[] = [VERSER_MS, OUVRIR_MS, SENS_MS, TAILLES_MS, TRACER_MS];
/** Les cinq de grande section : les lettres y remplacent les sens. */
export const DEMARCHES_ATELIERS_GS: Demarche[] = [VERSER_GS, OUVRIR_GS, LETTRES_GS, TAILLES_GS, TRACER_GS];

/** La compétence que chacune vise, à sa section : celle que le programme nomme à cet âge. */
export const VISEES_ATELIERS_MS_GS: Record<string, { intitule: RegExp; section: "MS" | "GS" }> = {
  [VERSER_MS.id]: { intitule: /Désigner et utiliser des outils ou des objets adaptés/i, section: "MS" },
  [OUVRIR_MS.id]: { intitule: /Désigner et utiliser des outils ou des objets adaptés/i, section: "MS" },
  [SENS_MS.id]: { intitule: /Identifier et nommer des organes sensoriels/i, section: "MS" },
  [TAILLES_MS.id]: { intitule: /Ordonner des objets rectilignes selon leur longueur/i, section: "MS" },
  [TRACER_MS.id]: { intitule: /Tracer des lettres capitales/i, section: "MS" },
  [VERSER_GS.id]: { intitule: /Identifier et prévenir les risques liés à certains objets/i, section: "GS" },
  [OUVRIR_GS.id]: { intitule: /Associer une solution technique à une fonction technique/i, section: "GS" },
  [LETTRES_GS.id]: { intitule: /Connaitre les différentes graphies d.une même lettre/i, section: "GS" },
  // Le référentiel de grande section écrit « rectlignes ».
  [TAILLES_GS.id]: { intitule: /Ordonner des objets rect.?lignes selon leur longueur/i, section: "GS" },
  [TRACER_GS.id]: { intitule: /travailler la ligature entre deux lettres/i, section: "GS" },
};

for (const d of [...DEMARCHES_ATELIERS_MS, ...DEMARCHES_ATELIERS_GS]) {
  const { intitule, section } = VISEES_ATELIERS_MS_GS[d.id];
  d.visee = { intitule, niveaux: [section] };
}
