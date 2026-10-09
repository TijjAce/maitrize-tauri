// L'histoire et la géographie au cycle 2 : une séquence par thème.
//
// Une séquence part de la compétence qu'on choisit (voir
// feuillesDesSequences.ts) ; ici, la compétence d'histoire-géographie trouve
// la séquence de son thème, telle que le programme de 2026 le découpe — une
// séquence répond à la question du thème. La classe vue comme un espace
// qu'on représente suit la séquence Éduscol que l'enseignant a fournie en
// octobre 2026 ; le temps au CP, les séquences Éduscol de 2016 « Se situer
// dans le temps » ; les autres thèmes sont bâtis sur le programme, à sa
// demande, et le disent. Toutes piochent leurs feuilles dans les ateliers
// de Fabriquer : le plan de la classe, les frises et calendriers, la
// lecture de paysage, les étiquettes des mots du thème.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_PLAN_CLASSE, STYLE_PLAN_CLASSE, htmlPlanClasse, reglagesPlanSurs, type FeuillePlan, type ReglagesPlanClasse } from "./planDeLaClasse";
import { REGLAGES_FRISE, STYLE_FRISE, htmlFrise, reglagesFriseSurs, type ModeleFrise } from "./frisesTemps";
import { REGLAGES_PAYSAGE, STYLE_PAYSAGE, htmlPaysage, reglagesPaysageSurs, type FamillePaysage, type ReglagesPaysage } from "./lireUnPaysage";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "./etiquettes";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

// ── La classe, un espace organisé qui se représente (CP) ──────────────────

const LA_CLASSE: Demarche = {
  id: "classe-espace-organise-cp",
  nom: "La classe, un espace organisé qui se représente (CP)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Se situer dans l'espace – Explorer les organisations du monde » : "
    + "« La classe, un espace organisé qui se représente », séquence au CP (introduction ; séances 2, 5 et 7)",
  resume: "De la photographie au plan : reconnaître la classe et la décrire, la dessiner, la représenter en maquette, se repérer dans les "
    + "maquettes des autres puis dans leur photographie vue de dessus, faire le plan avec des formes collées et une légende, et lire le plan "
    + "pour se repérer et se déplacer — la chasse au trésor, « Où est Charlie ? », l'évaluation. Passer d'un espace vu de sa place à un "
    + "espace vu de dessus, objectif et partagé.",
  seances: [
    seance("La classe en photographies",
      sauront("reconnaître leur classe sur des photographies, dire à quoi on la reconnaît — le mobilier et sa disposition —, et d'où la photographie a été prise."), 45, [
        ph("Trier les photographies", "15 min", "Des photographies de classes : la nôtre, et d'autres classes de l'école. Lesquelles sont celles de notre classe ? Comment le sait-on ?",
          "Observer finement l'environnement familier : prendre des indices dans la réalité et sur les photographies, trier les informations."),
        ph("Ce qui fait notre classe", "15 min", "Établir ensemble la liste des éléments caractéristiques de la classe ; elle reste affichée pour la suite.",
          "Ce qui dure — le mobilier, sa place — compte plus que ce qui passe."),
        ph("D'où a-t-on pris la photo ?", "15 min", "Dire où se tenait le photographe ; essayer de photographier toute la classe d'un seul coup.",
          "La notion de point de vue : passer d'un espace autour de soi à un espace qu'on décrit pour tous."),
      ]),
    seance("Dessiner la classe",
      sauront("représenter la classe par un dessin où on la reconnaît, en choisissant les éléments importants et une façon de les représenter."), 40, [
        ph("Rappel", "5 min", "Comment savait-on que les photographies étaient celles de notre classe ? Le mobilier et sa disposition. Photographier toute la classe n'a pas marché."),
        ph("Dessiner toute la classe", "30 min", "Seul, sur une feuille A4 au crayon de papier, dessiner toute la classe pour qu'on puisse la reconnaître ; la liste des éléments importants est affichée.",
          "Une étape difficile : renoncer à ce qui passe (les affichages, les trousses), trouver comment dessiner ce qu'on voit de sa place, puis une façon symbolique de représenter chaque élément."),
      ]),
    seance("Une maquette de la classe (1)",
      sauront("choisir des objets pour représenter les éléments de la classe, et expliquer leurs choix."), 45, [
        ph("Fabriquer, en groupes", "35 min", "En demi-classe, par groupes : commencer une maquette de la classe avec le matériel mis à disposition, en choisissant à bon escient l'objet qui représente chaque élément.",
          "Des expériences simples, faites par tous — explorer, manipuler, fabriquer — : elles font parler."),
        ph("Expliquer ses choix", "10 min", "Pourquoi cet objet pour la table, pour le bureau, pour l'étagère ?", "Argumenter, expliquer ses choix, décrire l'espace."),
      ]),
    seance("Une maquette de la classe (2)",
      sauront("placer les éléments de la classe les uns par rapport aux autres dans la maquette, et le dire."), 45, [
        ph("Placer, en groupes", "35 min", "Terminer la maquette : manipuler et échanger pour trouver la place de chaque élément — à côté de, devant, derrière, entre, près de, loin de."),
        ph("Décrire", "10 min", "Où est le bureau ? la porte ? ma place ? Chaque groupe décrit sa maquette.", "Le vocabulaire de l'espace, dit et redit."),
      ]),
    seance("Se repérer dans les maquettes",
      sauront("se repérer dans une représentation de la classe qu'ils n'ont pas faite, et comprendre que chacun a son point de vue."), 45, [
        ph("Repérage dans les maquettes", "25 min", "Les maquettes, installées où l'on peut tourner autour : on les commente (un meuble mal placé, un oubli). Chacun pose l'étiquette de son prénom sur sa place, "
          + "dans chaque maquette. Puis, autour d'une seule maquette, des jeux de repérage : poser un livre sur la table d'un camarade, mettre la poubelle à côté d'un meuble, "
          + "dire ce que voit quelqu'un qui entre par la porte, faire suivre à la figurine un chemin inventé par un camarade.",
          "Cinq groupes, un auteur de chaque maquette dans chacun. Chacun dépasse son point de vue : les autres ont le leur, et un point de vue commun existe."),
        ph("La maquette vue de dessus", "20 min", "La photographie d'une maquette prise de dessus, projetée : ses auteurs expliquent leurs choix et la corrigent ; on se repère sur ce document en deux dimensions. "
          + "Un code couleur apparaît pour le mobilier.",
          "Chacun peut avoir la photographie, pour l'annoter : un début de légende, un élément oublié."),
      ]),
    seance("De la maquette au plan",
      sauront("passer d'une représentation en volume à une représentation plane, et construire une légende simple."), 45, [
        ph("Entourer", "10 min", "Sur la photographie de la maquette vue de dessus, entourer chaque élément : la place qu'il occupe au sol."),
        ph("Faire le plan", "25 min", "Faire un plan avec des formes de papier à coller à leur place : une forme par meuble, une barre pour le tableau.",
          "Le code couleur de la séance précédente : la même couleur pour la même sorte de meuble."),
        ph("La légende", "10 min", "Construire la légende : ce que veut dire chaque forme, chaque couleur. Ce document a un nom : c'est un plan."),
      ]),
    seance("Lire le plan de la classe — évaluation",
      sauront("lire le plan de la classe et faire le lien avec la réalité : repérer des éléments imposés et tracer un chemin décrit."), 50, [
        ph("Rappels", "10 min", "Qu'avions-nous fait ? Des formes collées sur une feuille : ce n'est plus une maquette, c'est un plan. Aujourd'hui, on vérifie qu'on sait s'y repérer."),
        ph("La chasse au trésor", "15 min", "Des étiquettes-mots, cachées dans la classe, forment une phrase mystère ; le plan projeté montre les cachettes. Un élève cherche ; s'il bute, "
          + "un camarade l'aide par un indice, sans aller chercher le mot à sa place.",
          "Réussir : dire où est le message en lisant le plan ; aller dans la bonne zone ; prendre des repères fins ; aider par un indice utile."),
        ph("« Où est Charlie ? »", "10 min", "Deux élèves sortent ; un autre cache la figurine et marque la cachette sur le plan ; les deux élèves reviennent et la cherchent.",
          "Sur le plan, les meubles n'ont pas leur nom ; une aide : le même plan avec sa légende."),
        ph("Évaluation individuelle", "15 min", "Chacun a le plan de la classe et une fiche de consignes, lues à voix haute : colorier, dessiner, écrire, tracer un chemin.",
          "Lire les consignes à voix haute évite que la lecture ne fasse échouer la géographie."),
      ]),
  ],
};

// ── Les autres thèmes : bâtis sur le programme ────────────────────────────
//
// Pour les thèmes qu'aucune séquence Éduscol ne détaille, la séquence suit le
// programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026) : elle
// répond à la question du thème — « la séquence apporte une réponse à cette
// interrogation » —, une séance par objectif ou par attendu, ses repères
// remobilisés, ses mots-clés au tableau, et une évaluation sur ses attendus.
// Chaque séance part d'une question, fait chercher dans des documents, des
// observations, des manipulations, et fixe ce qu'on retient sur la frise, la
// carte ou le planisphère de la classe.

const PROGRAMME = "Bâtie sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026, annexe 3), à la demande de l'enseignant : "
  + "la question du thème, ses objectifs, ses attendus, ses repères et ses mots-clés";

const Q = "La question", C = "Chercher", R = "Ce qu'on retient";
/** Une séance en trois temps : la question, la recherche, ce qu'on retient — sur la frise, la carte, l'affiche. */
const etape = (titre: string, objectif: string, question: string, chercher: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(Q, "10 min", question), ph(C, "25 min", chercher, posture), ph(R, "10 min", retenir)]);
const evaluation = (quoi: string, repere: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille, les consignes lues à voix haute : ${quoi}.`),
  ph(R, "5 min", `${repere} Les repères se remobilisent souvent : on y reviendra.`),
]);

// Histoire, CP — sans durée imposée : ses dimensions se travaillent ensemble, toute l'année.

const TEMPS_NATUREL_CP: Demarche = {
  id: "temps-naturel-cp", nom: "Les manifestations naturelles du temps (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment des manifestations naturelles permettent-elles d'observer le temps qui passe ? » Le jour et la nuit qui alternent, "
    + "expliqués avec un globe terrestre et une lampe ; les saisons, leurs caractéristiques là où vit l'élève, et leur retour chaque année.",
  seances: [
    etape("Le jour et la nuit", "dire ce qu'on fait le jour et la nuit, et que le jour et la nuit reviennent sans cesse.",
      "Pourquoi fait-il nuit ? Ce que les élèves en pensent.",
      "Trier des images de ce qu'on fait le jour et la nuit ; observer le ciel à plusieurs moments : le Soleil, la Lune, la lumière.",
      "Le jour, puis la nuit, puis le jour : ils alternent. Les mots : jour, nuit."),
    etape("Le globe et la lampe", "expliquer l'alternance du jour et de la nuit en manipulant un globe terrestre.",
      "Comment la Terre peut-elle être éclairée d'un côté et dans le noir de l'autre ?",
      "Dans la pénombre, une lampe pour le Soleil, un globe, une gommette sur la France : on fait tourner le globe ; la gommette passe "
        + "de la lumière à l'ombre. Chaque élève manipule et explique.",
      "La Terre tourne sur elle-même : c'est sa rotation. Un tour : un jour et une nuit.", "Faire dire avec le globe en main : la manipulation porte l'explication."),
    etape("Les saisons autour de nous", "nommer les saisons et donner leurs caractéristiques, là où ils vivent.",
      "Comment sait-on que la saison change ?",
      "Observer un même arbre de la cour, des photographies d'un même lieu au fil de l'année ; noter le temps qu'il fait, les vêtements, "
        + "la durée du jour, les activités.",
      "Le printemps, l'été, l'automne, l'hiver, et ce qui les caractérise ici. Le mot-clé : saisons."),
    etape("Les saisons reviennent", "ordonner les saisons dans l'année et savoir qu'elles reviennent chaque année.",
      "Après l'hiver, que vient-il ? Et ensuite ?",
      "Placer les saisons sur la roue de l'année, avec leurs mois ; comparer avec un lieu où les saisons sont différentes — un territoire "
        + "d'outre-mer, par exemple.",
      "La roue de l'année : quatre saisons qui reviennent. Les saisons dépendent du lieu où l'on vit."),
    evaluation("expliquer le jour et la nuit avec un globe, nommer les saisons et donner leurs caractéristiques", "La roue des saisons reste affichée."),
  ],
};

// Le temps représenté et les évènements situés : les séquences Éduscol de 2016
// « Se situer dans le temps », que l'enseignant a fournies — deux albums pour
// passer d'un temps ressenti à un temps mesuré, un parcours sonore pour situer
// les évènements les uns par rapport aux autres, et les rituels des rythmes
// cycliques. Ce qu'elles ne couvrent pas — la journée et ses heures, la frise
// de la vie, les générations — suit le programme, et la source le dit.

const SE_SITUER_2016 = "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Se situer dans le temps »";

const TEMPS_REPRESENTE_CP: Demarche = {
  id: "temps-represente-cp", nom: "Les représentations humaines du temps (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Passer d'un temps ressenti à un temps mesuré » (séances 1 à 3), les outils de mesure de la séquence `
    + "« Situer les événements les uns par rapport aux autres » (séances 1 et 5) et les rituels de « Identifier les rythmes cycliques du temps » (CP et CE1) ; "
    + "l'évaluation bâtie sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)",
  resume: "« Comment les hommes et les femmes se repèrent-ils dans le temps ? Comment le représentent-ils ? » Deux albums pour passer d'un temps "
    + "ressenti à un temps mesuré — François et le temps, Le petit voleur de temps — et des jeux de langage sur les mots du temps ; les outils qui "
    + "mesurent le temps, essayés ; le programme de la journée et l'horloge ; puis les rituels qui font voir le temps qui revient — les jours, les "
    + "mois — et celui qui ne revient pas — les années.",
  seances: [
    seance("François et le temps",
      sauront("dire qu'une attente semble longue ou courte selon ce qu'on vit, et qu'une montre permet de mesurer ce temps pour tous."), 50, [
        ph("Découvrir l'album", "10 min", "La couverture de François et le temps (Christine Naumann-Villemin) est décrite : les élèves font des hypothèses sur l'histoire."),
        ph("Lire et comprendre", "20 min", "Un élève dont la lecture est fluide lit l'histoire à ses camarades ; on confronte les interprétations, on explique les implicites "
          + "et les mots qui structurent le temps.", "S'identifier à François : passer d'un temps ressenti à un temps mesuré, et voir que des objets du quotidien servent à le mesurer."),
        ph("Les mots du temps", "20 min", "Relever et classer le lexique du temps : le temps ressenti (attendre, s'ennuyer, patienter), l'ordre (d'abord, juste avant, "
          + "maintenant), la date et l'heure (aujourd'hui, ce soir, il est 8 heures), les objets qui mesurent le temps (montre, pendule, réveil, sablier, clepsydre), "
          + "les bruits qui le scandent (tic-tac, la cloche).", "Le classement reste affiché : il sert toute la séquence."),
      ]),
    seance("Jeux de langage en ateliers",
      sauront("employer les mots qui opposent et ordonnent le temps — avant, après, tôt, tard, en avance, en retard — et se repérer dans les jours, les mois et les saisons."), 75, [
        ph("Présenter le nouvel album", "15 min", "Le petit voleur de temps (Nathalie Minne) est présenté par ses illustrations, en lien avec François et le temps."),
        ph("Les ateliers, 10 minutes chacun", "40 min", "Des cartes de questions : le jeu des contraires (avant / après, un court instant / un long moment, ralentir / accélérer…) ; "
          + "se repérer dans la semaine du voleur de temps (« Nous sommes mardi, ils ont rendez-vous jeudi : combien de nuits ? ») ; le jour, la nuit et les saisons "
          + "(« À quel moment cela se passe-t-il si les feuilles tombent ? ») ; expliquer des expressions (« être en retard », « se souvenir », « programmer »).",
          "Les trois premiers ateliers se font en autonomie, avec un élève bon lecteur ; la réponse des questions fermées est sur la carte : on cherche à se questionner et à échanger."),
        ph("Regroupement", "10 min", "Ce que chaque atelier a fait dire, et les mots nouveaux, ajoutés au classement de la première séance."),
      ]),
    seance("Le petit voleur de temps",
      sauront("situer les évènements de l'histoire sur un calendrier, et dire pourquoi on a besoin de mesurer le temps."), 45, [
        ph("Le lundi, point de départ", "10 min", "Avant de lire, le calendrier de la classe : le lundi est le début du récit."),
        ph("Lire, et faire avancer les personnages", "25 min", "Pendant la lecture, un élève déplace les deux personnages aimantés sur le calendrier, au fil des "
          + "évènements ; l'horloge aide à comprendre les minutes « volées ».", "La séance est filée sur une semaine : relire l'album plusieurs fois affine la compréhension."),
        ph("Comprendre et redire", "10 min", "Les inférences du texte ; raconter et expliquer avec les mots du temps."),
      ]),
    seance("Mesurer le temps : quel outil ?",
      sauront("observer et utiliser des outils de mesure du temps — sablier, pendule, montre, réveil, analogiques et numériques — et dire lequel convient à quelle durée."), 45, [
        ph("Estimer, puis mesurer", "15 min", "Estimer la durée d'une activité de la classe, puis la mesurer avec un chronomètre, une montre, l'horloge : on note les résultats pour les confronter."),
        ph("Quel outil pour quelle durée ?", "20 min", "Essayer un sablier, un réveil, une montre, un chronomètre, l'horloge — et, si on en a, une clepsydre, un métronome : "
          + "ce que chacun permet, ce qu'il empêche, lequel mesure les secondes, les minutes, les heures.", "Les élèves proposent, essaient, expliquent les problèmes rencontrés."),
        ph("Ce qu'on retient", "10 min", "Les outils et leur nom : sablier, pendule, montre, réveil, chronomètre. Les mots seconde, minute, heure."),
      ]),
    seance("Le programme de la journée",
      sauront("établir le programme de la journée avec des étiquettes, se repérer à l'aide d'une horloge, et savoir que la journée est divisée en heures."), 30, [
        ph("Le programme du jour", "15 min", "Avec des étiquettes, établir le programme de la journée ; le placer à côté de l'horloge de la classe : à quelle heure ?"),
        ph("La journée en heures", "15 min", "Une journée, ce sont vingt-quatre heures ; le jour et la nuit s'y partagent. Le programme de la semaine, sur le même modèle."),
      ]),
    seance("Rituel : quel jour sommes-nous ?",
      sauront("écrire la date du jour avec le calendrier, nommer et ordonner les jours de la semaine, et employer hier, avant-hier, demain."), 15, [
        ph("La date au tableau", "10 min", "Un binôme écrit la date du jour pour la classe, aidé d'une frise numérique pour les quantièmes et du calendrier pour les jours de la semaine.",
          "Repris chaque jour : c'est le rituel qui installe le temps cyclique."),
        ph("Hier, aujourd'hui, demain", "5 min", "Se repérer dans la succession des jours — la roue des jours, la semaine linéaire — avec les temps qui vont avec : passé, présent, futur.",
          "L'enseignant reformule pour corriger les temps de la conjugaison."),
      ]),
    seance("Rituel : le mois et l'année",
      sauront("savoir que l'année est divisée en mois, le mois en semaines et en jours, et que les années se suivent sans revenir."), 20, [
        ph("Le calendrier", "10 min", "Identifier le mois, le jour, le quantième ; « En quelle année sommes-nous ? » Les mois reviennent, les années se suivent : le temps ne revient pas.",
          "Chaque journée passée est rayée : le temps qui organise la classe revient — les jours, les mois — et pourtant il ne revient pas."),
        ph("La frise des mois", "10 min", "Compter les mois jusqu'à la fin de l'année ; y reporter ce qui rythme la classe : anniversaires, sorties, commémorations."),
      ]),
    evaluation("nommer et ordonner les jours de la semaine et les mois, et dire avec quoi on mesure le temps", "Le calendrier et la roue des jours restent au mur."),
  ],
};

/** Les deux premières séances de la séquence Éduscol « Situer les événements les uns par rapport aux autres » : le parcours sonore. */
const PARCOURS_ECOUTE = seance("Le parcours sonore",
  sauront("situer les évènements d'un parcours les uns par rapport aux autres — avant, après, en même temps — et les représenter sur une bande."), 45, [
    ph("Écouter le parcours", "15 min", "Un enregistrement : un personnage se déplace sur un chemin. Les élèves identifient ses rencontres et les étapes de son parcours ; "
      + "on réécoute pour vérifier les hypothèses.", "Décrire, expliquer, débattre de l'antériorité, de la postériorité, de la simultanéité."),
    ph("Estimer les durées", "10 min", "Estimer la durée des étapes, puis la mesurer avec un chronomètre, une montre, l'horloge ; noter les résultats pour les confronter."),
    ph("Représenter le chemin", "20 min", "Sur une bande de papier, dessiner le chemin du personnage : ses rencontres, les lieux, dans l'ordre ; du ruban adhésif et des ciseaux "
      + "pour rectifier.", "L'enseignant vérifie la compréhension, fait dire la chronologie avec les mots du temps ; les représentations corrigées deviennent des références."),
  ]);
const PARCOURS_COMPARER = seance("Comparer nos chemins",
  sauront("décrire leur représentation, justifier leurs choix, et repérer la simultanéité et la durée."), 45, [
    ph("Présenter son chemin", "15 min", "Chacun décrit sa bande et justifie ses choix ; la classe questionne, commente, valide."),
    ph("En même temps, plus longtemps", "15 min", "L'enseignant juxtapose deux ou trois représentations — un même instant codé de deux façons, une erreur d'ordre — "
      + "et fait demander des explications.", "Faire émerger la continuité et la succession, l'antériorité et la postériorité, la simultanéité."),
    ph("Mesurer le temps", "15 min", "Des outils de mesure proposés par les élèves, essayés en situation : lequel dit combien de temps a duré chaque étape ?",
      "Prolongement : mesurer chaque jour la durée d'une tâche de la classe."),
  ]);

const SITUER_EVENEMENTS_CP: Demarche = {
  id: "situer-evenements-cp", nom: "Situer des évènements dans le temps (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Situer les événements les uns par rapport aux autres » (séances 1 et 2, le parcours sonore) et les rituels `
    + "de « Identifier les rythmes cycliques du temps » (le calendrier, la frise des mois, le cahier de textes) ; la journée, la frise de la vie, les "
    + "générations et l'évaluation bâties sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)",
  resume: "« Comment situer des évènements dans le temps ? » Un parcours sonore, écouté puis représenté sur une bande, pour situer des évènements les uns "
    + "par rapport aux autres — avant, après, en même temps — et en mesurer la durée ; le calendrier de la classe pour situer et planifier, avec hier, "
    + "aujourd'hui, demain ; la frise de la journée et celle de la vie de l'élève ; les générations, à partir d'exemples d'arbres généalogiques. "
    + "Le passé ne revient pas.",
  seances: [
    PARCOURS_ECOUTE,
    PARCOURS_COMPARER,
    seance("Le calendrier de la classe",
      sauront("situer et planifier sur un calendrier des évènements particuliers ou récurrents, avec les temps verbaux et les marqueurs du temps."), 45, [
        ph("La frise des mois", "15 min", "Reporter sur la frise des mois ce qui rythme la classe — les anniversaires, les sorties, une commémoration, un projet."),
        ph("Se projeter", "20 min", "« Quel jour serons-nous le prochain jour d'école ? » Le calendrier pour compter : dans combien de jours ? il y a combien de jours ? "
          + "Écrire dans le cahier de textes ce qu'on prévoit.", "Hier, avant-hier, il y a un mois ; demain, après-demain, dans un mois — avec le passé, le présent, le futur."),
        ph("Ce qu'on retient", "10 min", "Le calendrier sert à se souvenir et à prévoir."),
      ]),
    etape("La frise de la journée", "compléter une frise chronologique de la journée, avec ce qui se passe avant, en même temps et après.",
      "Que fait-on avant la récréation ? Pendant ? Après ?",
      "Ordonner des photographies d'une journée de classe ; compléter la frise de la journée, comme on avait représenté le chemin du parcours sonore.",
      "Antériorité, simultanéité, postériorité : avant, en même temps, après."),
    etape("La frise de ma vie", "compléter une frise chronologique de leur vie, et comprendre qu'on ne revient pas en arrière.",
      "Qu'est-ce qui s'est passé depuis notre naissance ?",
      "Placer sur une frise, une case par année, des photographies ou des dessins : la naissance, les premiers pas, l'entrée à l'école.",
      "Le temps passé ne revient pas : la frise va dans un seul sens.", "Chaque famille donne ce qu'elle veut : un dessin remplace une photographie."),
    etape("Les générations", "se repérer à travers les générations, à partir d'exemples d'arbres généalogiques.",
      "Qui est né avant qui ? Les parents ? Les grands-parents ?",
      "Lire l'arbre généalogique d'une famille d'un album ou d'une famille célèbre ; compléter un arbre ; placer les générations sur une frise.",
      "Les générations : les grands-parents, les parents, les enfants.", "On part d'exemples : l'arbre d'une famille étudiée, pas forcément celle de l'élève."),
    evaluation("situer des évènements sur le calendrier et sur une frise, avec hier, aujourd'hui, demain, avant, après", "Le calendrier et la frise de la classe continuent de vivre."),
  ],
};

/** La séquence Éduscol entière, croisée avec l'éducation musicale : à choisir dans le menu des déroulements. */
const PETITE_SIRENE_CP: Demarche = {
  id: "petite-sirene-cp", nom: "Situer les évènements : la valise sonore de la Petite Sirène (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Situer les événements les uns par rapport aux autres » (présentation et séances 1 à 5), croisée avec l'éducation musicale`,
  resume: "Un parcours sonore écouté puis dessiné sur une bande ; les chemins comparés, pour faire émerger l'antériorité, la simultanéité, la durée ; "
    + "puis un projet : la valise sonore que la Petite Sirène emportera sur terre — des sons de la mer choisis, un chef d'orchestre, une frise-partition "
    + "où un trait vaut une seconde, et les outils qui mesurent ces secondes. Un premier pas vers une frise.",
  seances: [
    PARCOURS_ECOUTE,
    PARCOURS_COMPARER,
    seance("Le chef d'orchestre",
      sauront("identifier, dans une production sonore, ce qui se passe en même temps, et la durée de chaque son."), 45, [
        ph("Choisir les sons de la mer", "15 min", "Le conte de la Petite Sirène, lu et écouté avant : choisir des instruments ou des objets qui sonnent comme la mer — "
          + "pour l'eau, une paille, un fouet, une fourchette ; pour le vent, des papiers ; pour les poissons, une boîte à musique, la voix."),
        ph("Jouer, diriger", "20 min", "Un élève est le chef d'orchestre : il fait démarrer les groupes d'instruments dans l'ordre qu'il veut, les arrête, les fait repartir. "
          + "Un deuxième, puis un troisième prend sa place ; on enregistre.", "Les gestes du chef d'orchestre font voir la simultanéité et la durée."),
        ph("Écouter et comparer", "10 min", "Écouter les enregistrements : quel objet fait ce son ? Lesquels sonnent en même temps ? Combien de temps chacun ?"),
      ]),
    seance("La frise-partition",
      sauront("coder sur une partition les sons, leur durée et leur simultanéité, de façon que tous puissent la lire."), 45, [
        ph("Ce qui a gêné", "10 min", "Expliquer ce qu'on a déjà fait, et les difficultés : des dessins trop détaillés, des durées qu'on ne distingue pas, la simultanéité, "
          + "le besoin de réécouter."),
        ph("Coder la partition", "25 min", "Sur une frise-partition — une ligne par son —, trouver un codage compréhensible de tous, et y marquer les durées et ce qui sonne "
          + "en même temps.", "L'enseignant fixe les contraintes : le nombre de groupes d'instruments, les notions, les codages obligatoires ; il favorise l'entraide."),
        ph("Un trait, une seconde", "10 min", "Lire les partitions : quand chaque trait vaut une seconde, la partition devient une frise qu'on peut compter.",
          "La séance peut s'interrompre et reprendre au fil du projet."),
      ]),
    seance("Mesurer les durées pour jouer",
      sauront("dire pourquoi il faut mesurer les durées, et choisir l'outil qui mesure les secondes."), 45, [
        ph("Le chef d'orchestre se trompe", "10 min", "L'enseignant joue les partitions en amplifiant ce qui manque — les durées oubliées, un passage trop rapide : "
          + "la valise sonore n'est plus harmonieuse. Il faut mesurer."),
        ph("Quel outil ?", "20 min", "Sablier, clepsydre, horloge, réveil, téléphone, chronomètre, métronome, cadran solaire, montre : on essaie ceux qu'on a, on dit ce qui "
          + "empêche, on trouve celui qui mesure les secondes.", "Les élèves émettent des hypothèses sur l'usage qui convient à chaque outil."),
        ph("Jouer et enregistrer", "15 min", "Des codages précis choisis ensemble ; la partition est jouée et enregistrée, en lien avec l'éducation musicale."),
      ]),
  ],
};

// Histoire, CE1 — sans durée imposée.

const PASSE_PROCHE_CE1: Demarche = {
  id: "passe-proche-lointain-ce1", nom: "Du passé proche au passé lointain (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment situer des évènements dans le passé ? » Le lexique du temps — hier, autrefois, il y a dix jours, dix ans, cent ans — ; "
    + "des évènements récents et des évènements plus anciens sur une frise graduée ; les années, les décennies, les siècles, les millénaires.",
  seances: [
    etape("Hier et autrefois", "employer le lexique relatif au temps : hier, autrefois, il y a…",
      "Hier, c'est loin ? Et autrefois ?",
      "Trier des photographies, des objets d'aujourd'hui et d'autrefois ; dire de quand ils datent avec les mots du temps.",
      "Les mots : hier, autrefois, il y a dix jours, il y a dix ans, il y a cent ans."),
    etape("Des années aux millénaires", "dire ce que sont une année, une décennie, un siècle, un millénaire.",
      "Dix ans, cent ans, mille ans : comment le dire ?",
      "Construire les unités : dix années font une décennie, cent années un siècle, mille années un millénaire ; les compter sur une bande graduée.",
      "Année, décennie, siècle, millénaire."),
    etape("La frise de cent ans", "positionner sur une frise des évènements récents et des évènements plus anciens.",
      "Qu'est-ce qui est arrivé il y a peu ? Il y a longtemps ?",
      "Sur une frise de cent ans graduée en décennies, placer des évènements proches de la vie de l'élève et d'autres plus anciens.",
      "Le passé proche, le passé lointain : la frise les met en ordre."),
    etape("Plus loin encore", "situer un objet ou un monument très ancien par rapport à aujourd'hui.",
      "Ce château, cette église, ce pont : de quand datent-ils ?",
      "Chercher l'âge d'un monument proche de l'école ; comparer avec la frise de cent ans : il faut une frise plus longue.",
      "Des siècles, des millénaires : le temps long."),
    evaluation("employer les mots du temps et placer des évènements proches et lointains sur une frise", "La frise de la classe s'allonge."),
  ],
};

const GRANDES_PERIODES_CE1: Demarche = {
  id: "grandes-periodes-ce1", nom: "Les grandes périodes de l'histoire (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment les hommes et les femmes construisent-ils des repères temporels pour situer des évènements dans un temps historique ? » "
    + "Une première représentation du temps long ; les cinq grandes périodes, par convention en Europe — Préhistoire, Antiquité, Moyen Âge, "
    + "Temps modernes, époque contemporaine — ; une ou deux figures, femme ou homme, par période.",
  seances: [
    etape("Un temps très long", "se représenter un temps très long et comprendre qu'on le découpe pour s'y repérer.",
      "Comment ranger tout le passé, depuis les premiers êtres humains ?",
      "Dérouler une longue bande : où placer les premiers êtres humains, les châteaux forts, nos grands-parents ? On découpe le temps en périodes.",
      "Le temps long ; les historiens le découpent en grandes périodes."),
    etape("Les cinq grandes périodes", "repérer et nommer les grandes périodes de l'histoire, et leurs dates de début et de fin.",
      "Quelles sont les grandes périodes ? Où commencent-elles ?",
      "Compléter la frise des grandes périodes : leur nom, leurs dates, par convention en Europe.",
      "Préhistoire, Antiquité, Moyen Âge, Temps modernes, époque contemporaine."),
    etape("Des figures de chaque période", "situer sur la frise des figures de chaque période historique.",
      "Qui a vécu au Moyen Âge ? À l'époque contemporaine ?",
      "Des récits, des images : une ou deux figures, femme ou homme, par période ; les placer sur la frise.",
      "Une figure, une période : la frise se peuple.", "Une attention particulière aux femmes."),
    etape("Mémoriser la frise", "retrouver de mémoire l'ordre des périodes et la place des figures.",
      "Sans regarder : quelle période vient après l'Antiquité ?",
      "Jeux de repérage sur la frise : avant, après, dans quelle période ; replacer des étiquettes mélangées.",
      "La frise, au mur, se relit souvent."),
    evaluation("repérer les grandes périodes sur une frise et y situer des figures", "La frise des périodes reste au mur jusqu'au CE2."),
  ],
};

const TRACES_PASSE_CE1: Demarche = {
  id: "traces-passe-ce1", nom: "Les traces du passé (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment connait-on le passé ? » Le passé laisse des traces — fossiles, ossements, grottes, ruines, monuments, objets, écrits, "
    + "images, œuvres d'art, témoignages — autour de l'école et dans les documents ; on les identifie, on les situe dans le temps ; les "
    + "métiers d'archéologue, d'archiviste, d'historien et d'historienne.",
  seances: [
    etape("Comment connait-on le passé ?", "dire que le passé laisse des traces.",
      "Comment sait-on comment on vivait autrefois ?",
      "Ce que les élèves en pensent ; une trace de l'environnement proche — un monument, une plaque, un vieil objet — : qu'est-ce qu'elle nous apprend ?",
      "Le passé laisse des traces : on les étudie pour le connaitre."),
    etape("Toutes sortes de traces", "identifier des traces du passé de natures différentes.",
      "Un fossile, une ruine, une lettre, un tableau : sont-ce des traces du passé ?",
      "Trier des documents : fossiles, ossements, grottes, ruines, monuments, objets, écrits, images, œuvres d'art, témoignages.",
      "Les traces du passé, et leur nom."),
    etape("Situer les traces dans le temps", "situer des traces du passé sur la frise des grandes périodes.",
      "De quelle période vient cette trace ?",
      "Placer des traces sur la frise des grandes périodes, en s'aidant des indices qu'elles donnent.",
      "Chaque trace a sa place dans le temps."),
    etape("Ceux qui étudient le passé", "dire ce que font l'archéologue, l'archiviste, l'historien et l'historienne.",
      "Qui cherche les traces ? Qui les étudie ?",
      "Des documents, une vidéo, une visite : fouiller, conserver, lire les archives, raconter le passé.",
      "Archéologue, archiviste, historien, historienne."),
    evaluation("identifier des traces du passé et les situer dans le temps", "La frise s'enrichit des traces étudiées."),
  ],
};

// Histoire, CE2 — l'ordre et les périodes que le programme recommande.

const PREHISTOIRE_CE2: Demarche = {
  id: "prehistoire-ce2", nom: "Paléolithique et Néolithique (CE2, période 1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les évolutions des modes de vie à la Préhistoire ? » Le mode de vie nomade des chasseurs-cueilleurs au Paléolithique, "
    + "l'art pariétal ; le mode de vie sédentaire au Néolithique — agriculture, élevage, premiers métaux. Repères : la naissance de "
    + "l'agriculture vers 10 000 – 9000 av. J.-C., Ötzi en 3200 av. J.-C., l'écriture vers 3000 av. J.-C., un site préhistorique en France.",
  seances: [
    etape("Avant l'écriture", "situer la Préhistoire sur la frise et dire qu'on la connait par des traces.",
      "Comment connait-on des gens qui n'écrivaient pas ?",
      "Revenir à la frise des grandes périodes ; des traces de la Préhistoire : outils, ossements, peintures.",
      "La Préhistoire : avant l'écriture, connue par les traces."),
    etape("Des chasseurs-cueilleurs nomades", "décrire le mode de vie des chasseurs-cueilleurs au Paléolithique.",
      "Comment vivaient les premiers êtres humains ?",
      "Des documents : se nourrir (chasse, pêche, cueillette), s'abriter, se déplacer en suivant les animaux, fabriquer des outils.",
      "Le Paléolithique : des chasseurs-cueilleurs nomades."),
    etape("L'art des grottes", "décrire une peinture pariétale ou une gravure rupestre.",
      "Que nous disent les peintures des grottes ?",
      "Observer une peinture pariétale d'un site français : ce qu'elle montre, comment elle a été faite, où.",
      "L'art pariétal, l'art rupestre ; un site archéologique en France."),
    etape("Les premiers agriculteurs", "décrire le mode de vie sédentaire au Néolithique.",
      "Pourquoi les êtres humains se sont-ils installés ?",
      "Des documents : cultiver, élever, construire des villages, faire des poteries, utiliser les premiers métaux.",
      "Le Néolithique : des agriculteurs sédentaires."),
    etape("Ce qui a changé", "expliquer les différences de mode de vie entre le Paléolithique et le Néolithique.",
      "Qu'est-ce qui a changé entre les deux ?",
      "Un tableau à deux colonnes : se nourrir, s'abriter, se déplacer, fabriquer ; placer les repères sur la frise — l'agriculture, Ötzi, l'écriture.",
      "Nomadisme et sédentarité ; les repères de la Préhistoire."),
    evaluation("décrire et comparer les modes de vie du Paléolithique et du Néolithique, et situer les repères", "La frise de la Préhistoire, au mur."),
  ],
};

const ROME_CE2: Demarche = {
  id: "rome-gaule-ce2", nom: "Vivre à Rome et en Gaule romaine (CE2, périodes 2 et 3)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment vivait-on à Rome et dans l'empire ? » La vie quotidienne à Rome — se loger, se nourrir, se déplacer, se divertir — ; "
    + "une société hiérarchisée ; l'empire à son apogée et la Gaule dans l'empire ; la Gaule romaine, qui mêle les cultures gauloise et romaine. "
    + "Repères : Alésia en 52 av. J.-C., le règne d'Auguste, un site gallo-romain.",
  seances: [
    etape("Rome et son empire", "repérer sur une carte l'étendue de l'empire romain à son apogée, et y localiser la Gaule.",
      "Jusqu'où s'étendait l'empire romain ?",
      "Sur une carte, colorier l'empire à son apogée autour de la Méditerranée ; situer Rome, puis la Gaule.",
      "L'empire romain à son apogée ; la Gaule dans l'empire."),
    etape("Se loger et se nourrir à Rome", "décrire la vie quotidienne des habitants de Rome : se loger, se nourrir.",
      "Comment vivaient les habitantes et les habitants de Rome ?",
      "Des documents : la maison des riches et les immeubles des pauvres, les repas, le marché.",
      "Vivre à Rome : des façons de vivre très différentes."),
    etape("Se déplacer et se divertir", "décrire comment on se déplaçait et se divertissait à Rome.",
      "Que faisait-on à Rome pour se divertir ?",
      "Des documents : les voies, les thermes, l'amphithéâtre, les jeux, le théâtre.",
      "Thermes, amphithéâtre : des lieux de vie commune."),
    etape("Des monuments et leur usage", "définir l'usage d'un monument ou d'un aménagement caractéristique de Rome.",
      "À quoi servaient le forum, le temple, l'aqueduc ?",
      "Associer chaque monument à son usage : forum, temple, aqueduc, thermes, amphithéâtre, palais, villa.",
      "Les monuments de Rome et leur usage."),
    etape("Une société hiérarchisée", "dire que la société romaine est hiérarchisée.",
      "Tous les habitants de Rome avaient-ils les mêmes droits ?",
      "Des documents : les citoyens, les femmes, les esclaves, les étrangers ; ce que chacun peut faire ou non.",
      "Une société inégale : des hommes, des femmes, des esclaves, des étrangers."),
    etape("La Gaule romaine", "expliquer que le monde gallo-romain mêle les cultures gauloise et romaine.",
      "Que devient la Gaule après Alésia ?",
      "Le siège d'Alésia en 52 av. J.-C. ; un site gallo-romain : ce qui est romain, ce qui reste gaulois ; placer les repères sur la frise.",
      "Gallo-romain : un mélange de cultures. Alésia, Auguste sur la frise."),
    evaluation("localiser l'empire et la Gaule, dire l'usage de monuments, expliquer ce qu'est la Gaule romaine", "Les repères rejoignent la frise de la classe."),
  ],
};

const ROYAUME_CE2: Demarche = {
  id: "royaume-france-ce2", nom: "La construction du royaume de France (CE2, périodes 4 et 5)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment les Capétiens et les Valois ont-ils construit le royaume de France ? » Les grandes étapes de la construction du royaume, "
    + "sur des cartes ; le sacre ; les moyens d'affirmer l'autorité du roi — impôt, monnaie, guerre — ; les dynasties, quelques rois et de "
    + "grandes figures féminines. Repères : l'élection d'Hugues Capet en 987, la guerre de Cent Ans aux XIVe et XVe siècles.",
  seances: [
    etape("Un roi élu", "situer l'élection d'Hugues Capet et le petit domaine royal sur une carte.",
      "Comment Hugues Capet devient-il roi en 987 ?",
      "Un récit ; une carte du royaume vers l'an mil : le domaine du roi, petit, au milieu des grands seigneurs.",
      "987 : l'élection d'Hugues Capet ; les Capétiens."),
    etape("Le royaume s'agrandit", "repérer les grandes étapes de la construction du royaume de France à partir de cartes.",
      "Comment le domaine du roi grandit-il ?",
      "Comparer des cartes successives du domaine royal : par la guerre, les mariages, les héritages, les achats.",
      "Les grandes étapes de la construction du royaume."),
    etape("Le sacre", "décrire la cérémonie du sacre.",
      "Pourquoi le roi est-il sacré ?",
      "Une enluminure, un récit : la cathédrale de Reims, l'onction, la couronne, les objets du sacre.",
      "Le sacre : le roi tient son pouvoir de Dieu."),
    etape("Affirmer son autorité", "citer les moyens utilisés par les rois de France pour affirmer leur autorité.",
      "Comment le roi se fait-il obéir dans tout le royaume ?",
      "Des documents : l'impôt, la monnaie royale, l'armée et la guerre, la justice, les officiers du roi.",
      "Impôt, monnaie, guerre : les moyens du roi."),
    etape("Rois et reines", "nommer et situer sur une frise les dynasties royales, quelques rois et quelques grandes figures féminines.",
      "Qui a régné ? Qui a gouverné aux côtés des rois ?",
      "Des récits : Philippe Auguste, Aliénor d'Aquitaine, Blanche de Castille ; les placer, avec les Capétiens et les Valois, sur la frise.",
      "Dynastie : Capétiens, puis Valois.", "Une attention particulière aux femmes."),
    etape("La guerre de Cent Ans", "situer la guerre de Cent Ans et dire ce qu'elle change pour le royaume.",
      "Pourquoi une guerre si longue ?",
      "Un récit et une carte : le royaume disputé aux XIVe et XVe siècles ; la fin de la guerre.",
      "La guerre de Cent Ans : XIVe et XVe siècles."),
    evaluation("décrire le sacre, citer les moyens du roi, situer les dynasties et les repères sur la frise", "La frise de la classe arrive à la fin du Moyen Âge."),
  ],
};

// Géographie, CP — des clés pour se repérer.

const ECOLE_QUARTIER_CP: Demarche = {
  id: "ecole-quartier-cp", nom: "Autour de l'école : l'école, le quartier, un trajet (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment se repérer dans la classe, dans l'école et dans son espace proche ? » Après la classe, l'école : ses lieux et leur usage, "
    + "s'y déplacer avec un plan ; autour de l'école, les repères du quartier ou de la commune ; un trajet, décrit et représenté. Les mots "
    + "pour se positionner : à gauche, à droite, devant, derrière, à côté.",
  seances: [
    etape("Les lieux de l'école", "nommer les lieux de l'école et décrire leur usage.",
      "Que trouve-t-on dans notre école ? À quoi sert chaque lieu ?",
      "Visiter l'école, photographier ses lieux — la cour, les couloirs, les sanitaires, le réfectoire, le portail — ; dire à quoi chacun sert.",
      "Les lieux de l'école et leur usage."),
    etape("Le plan de l'école", "se repérer et se déplacer dans l'école en utilisant un plan.",
      "Comment trouver son chemin dans l'école avec un plan ?",
      "Situer les photographies sur le plan de l'école ; un jeu de piste : suivre sur le plan, puis dans l'école.",
      "Le plan : l'école vue de dessus. À gauche, à droite, devant, derrière."),
    etape("Autour de l'école", "identifier des repères autour de l'école.",
      "Qu'y a-t-il autour de l'école ?",
      "Une sortie : repérer les carrefours, les commerces, les bâtiments publics, les panneaux ; les photographier ; les situer sur un plan du quartier.",
      "Les repères du quartier ou de la commune."),
    etape("Un trajet", "décrire et représenter un trajet entre un lieu proche et l'école.",
      "Comment aller de l'école au gymnase, à la mairie, à la bibliothèque ?",
      "Décrire un trajet avec ses repères et les mots de position ; le tracer sur le plan du quartier.",
      "Un trajet : un départ, des repères, une arrivée."),
    evaluation("lire le plan de l'école, nommer ses lieux et décrire un trajet", "Le plan du quartier reste affiché."),
  ],
};

const REPRESENTATIONS_MONDE_CP: Demarche = {
  id: "representations-monde-cp", nom: "Des représentations du monde (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quels sont les principaux repères à l'échelle mondiale ? » Les terres émergées et les océans sur le globe ; passer du globe "
    + "au planisphère, et pourquoi ; les continents et les océans — Atlantique, Pacifique, Indien — ; le nord, le sud, l'est, l'ouest ; la "
    + "France, hexagonale et ultramarine ; le monde est peuplé : les grands foyers de peuplement.",
  seances: [
    etape("Le globe", "distinguer les terres émergées et les océans sur un globe, et comprendre que les océans se rejoignent.",
      "Qu'y a-t-il sur la Terre ? Plus de terres ou plus d'eau ?",
      "Manipuler un globe : les terres, les océans ; suivre du doigt un océan jusqu'à un autre.",
      "Les terres émergées, les océans, qui se rejoignent."),
    etape("Du globe au planisphère", "reconnaitre un planisphère et dire pourquoi on passe du globe au planisphère.",
      "Comment voir toute la Terre d'un coup ?",
      "Comparer le globe et le planisphère : ce qu'on voit, ce qui est déformé ; pourquoi le planisphère se range et s'affiche.",
      "Le planisphère : la Terre à plat."),
    etape("Continents et océans", "reconnaitre et localiser les continents et les océans sur un planisphère.",
      "Comment s'appellent les continents ? les océans ?",
      "Placer les étiquettes des continents et des océans sur le planisphère et sur le globe ; le nord, le sud, l'est, l'ouest.",
      "Les continents ; les océans Atlantique, Pacifique, Indien ; les points cardinaux."),
    etape("La France dans le monde", "situer la France, hexagonale et ultramarine.",
      "Où est la France sur le planisphère ?",
      "Situer la France hexagonale et les territoires d'outre-mer sur le planisphère et sur le globe.",
      "La France, hexagonale et ultramarine."),
    etape("Le monde est peuplé", "localiser les grands foyers de peuplement.",
      "Où vivent la plupart des êtres humains ?",
      "Comparer une carte de la population et le planisphère : où les êtres humains sont nombreux, où ils sont rares.",
      "Les grands foyers de peuplement."),
    evaluation("reconnaitre un planisphère, localiser les continents, les océans et la France", "Le planisphère de la classe accompagne toute l'année."),
  ],
};

// Géographie, CE1 — où vivent les êtres humains ?

const TERRE_PEUPLEE_CE1: Demarche = {
  id: "terre-peuplee-ce1", nom: "La Terre est peuplée (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Où les êtres humains vivent-ils dans le monde ? » Les grands foyers de peuplement, remobilisés depuis le CP ; les principales villes "
    + "du monde — une ville très peuplée de chaque continent — ; la différence entre ville et campagne, par les paysages.",
  seances: [
    etape("Les grands foyers de peuplement", "localiser les grands foyers de peuplement sur un planisphère.",
      "Où les êtres humains sont-ils les plus nombreux ?",
      "Remobiliser le planisphère du CP ; une carte de la population : colorier les grands foyers.",
      "Les grands foyers de peuplement : de fortes densités."),
    etape("De grandes villes dans le monde", "mémoriser et localiser une ville très peuplée de chaque continent.",
      "Quelles sont les plus grandes villes du monde ?",
      "Des photographies de grandes villes ; placer leurs étiquettes sur le planisphère, une par continent.",
      "Une ville très peuplée de chaque continent."),
    etape("Ville ou village ?", "expliquer la différence entre ville et village à partir de paysages.",
      "À quoi reconnait-on une ville ? un village ?",
      "Lire des paysages de ville, de village, de campagne : les bâtiments, les rues, les champs, les habitants.",
      "Ville, village, campagne."),
    evaluation("localiser les foyers de peuplement et des grandes villes, et expliquer la différence entre ville et village", "Les villes rejoignent le planisphère de la classe."),
  ],
};

const LIEUX_DE_VIE_CE1: Demarche = {
  id: "lieux-de-vie-ce1", nom: "Découvrir les lieux où vivent les êtres humains (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les caractéristiques principales des lieux de vie des êtres humains ? » Lire un paysage — premier plan, arrière-plan — ; "
    + "les trois grandes zones climatiques ; les forêts, les prairies, les déserts ; les montagnes, les plaines, les plateaux et les vallées ; "
    + "les fleuves et les rivières ; des milieux différents, où vivent des êtres humains.",
  seances: [
    etape("Lire un paysage", "décrire un paysage à partir d'une photographie ou d'une observation directe.",
      "Que voit-on sur cette photographie ?",
      "Observer un paysage : le premier plan, l'arrière-plan, ce que la nature a fait, ce que les êtres humains ont construit ; le dessiner.",
      "Premier plan, arrière-plan : décrire un paysage."),
    etape("Climat et météo", "caractériser et localiser les trois grandes zones climatiques.",
      "Fait-il chaud partout sur la Terre ?",
      "Distinguer la météo du jour et le climat ; colorier sur le planisphère la zone tropicale, la zone tempérée, la zone froide ; y placer les territoires français.",
      "Zone tropicale, zone tempérée, zone froide."),
    etape("Forêts, prairies, déserts", "reconnaitre une forêt tempérée et une forêt tropicale, un désert chaud et un désert froid, une prairie et une savane.",
      "Toutes les forêts se ressemblent-elles ?",
      "Comparer des paysages ; localiser la forêt amazonienne, celle du bassin du Congo, la forêt indonésienne, une forêt proche ; le Sahara et l'Antarctique.",
      "Les grands types de végétation, et où ils sont."),
    etape("Montagnes, plaines, plateaux, vallées", "caractériser les types de relief et localiser les grandes chaines de montagne.",
      "Comment le sol de la Terre est-il fait ?",
      "Une maquette ou des photographies : montagne, plaine, plateau, vallée ; localiser les Andes, les Alpes, l'Atlas, l'Himalaya, les Rocheuses.",
      "Les reliefs ; cinq massifs montagneux."),
    etape("Fleuves et rivières", "dire la différence entre un fleuve et une rivière, et localiser quelques grands fleuves.",
      "Où va l'eau d'une rivière ?",
      "Suivre une rivière jusqu'au fleuve, et le fleuve jusqu'à la mer ; localiser l'Amazone, le Mississippi, le Nil, et un fleuve proche.",
      "Une rivière se jette dans une rivière ou dans un fleuve ; un fleuve, dans la mer."),
    etape("Des milieux différents", "comprendre que les êtres humains vivent dans des milieux différents.",
      "Peut-on vivre partout ?",
      "Comparer des paysages habités de chaque zone : comment on s'y loge, comment on s'y déplace, comment on s'y nourrit.",
      "Des êtres humains vivent dans des milieux très différents."),
    evaluation("caractériser et localiser les zones climatiques, les végétations, les reliefs et les grands fleuves, et décrire un paysage", "Les repères rejoignent le planisphère."),
  ],
};

// Géographie, CE2 — vivre en France.

const POPULATION_FRANCE_CE2: Demarche = {
  id: "population-france-ce2", nom: "L'inégale répartition de la population en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Où vit la population en France ? » Sur une carte de France : les espaces de fortes et de faibles densités ; les cinq premières "
    + "agglomérations et, le cas échéant, celle qui est proche de l'école ; les grands massifs et les grands fleuves, hexagonaux et ultramarins.",
  seances: [
    etape("Où vit-on en France ?", "localiser sur une carte de France les espaces de fortes et de faibles densités.",
      "Les Français vivent-ils partout de la même façon ?",
      "Lire une carte des densités : où l'on est nombreux, où l'on est peu ; colorier, avec une légende.",
      "Fortes densités, faibles densités : la population est inégalement répartie."),
    etape("Les grandes agglomérations", "localiser et nommer les cinq principales agglomérations, et celle qui est proche de l'école.",
      "Quelles sont les plus grandes villes de France ?",
      "Placer les cinq premières agglomérations sur la carte de France, et la plus proche de l'école.",
      "Les cinq premières agglomérations de France."),
    etape("Montagnes et fleuves de France", "localiser et nommer les grandes chaines de montagne et quelques grands fleuves de France.",
      "Où sont les montagnes et les fleuves de France ?",
      "Placer les Alpes, la Corse, le Jura, le Massif central, les Pyrénées, les Vosges, un massif ultramarin ; la Garonne, la Loire, le Maroni, le Rhin, le Rhône, la Seine.",
      "Les massifs et les fleuves de France."),
    evaluation("localiser sur une carte de France les densités, les agglomérations, les massifs et les fleuves", "La carte de France reste affichée."),
  ],
};

const SE_LOGER_CE2: Demarche = {
  id: "se-loger-ce2", nom: "Se loger en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les principales caractéristiques des espaces résidentiels en France ? » Reconnaitre et décrire les éléments des "
    + "espaces résidentiels, par leurs paysages : un centre-ville historique, un quartier récent d'habitation, un grand ensemble, un "
    + "lotissement pavillonnaire, un village.",
  seances: [
    etape("Où habitons-nous ?", "décrire l'espace résidentiel où ils habitent.",
      "À quoi ressemble le lieu où nous habitons ?",
      "Ce que les élèves en disent ; des photographies du quartier ou du village : immeubles, maisons, rues, commerces, espaces verts.",
      "Les éléments d'un espace résidentiel."),
    etape("Le centre-ville historique et le village", "reconnaitre et décrire un centre-ville historique et un village.",
      "Qu'est-ce qui rend un centre-ville ancien, un village, reconnaissables ?",
      "Lire deux paysages : les bâtiments anciens, les rues étroites, la place, l'église, les commerces ; le village et sa campagne.",
      "Centre-ville historique, village."),
    etape("Le grand ensemble et le quartier récent", "reconnaitre et décrire un grand ensemble et un quartier récent d'habitation.",
      "Pourquoi de si grands immeubles ?",
      "Lire deux paysages : les tours et les barres, les espaces verts, les parkings ; un quartier récent et ses logements.",
      "Grand ensemble, quartier récent d'habitation."),
    etape("Le lotissement pavillonnaire", "reconnaitre et décrire un lotissement pavillonnaire.",
      "Toutes ces maisons qui se ressemblent : où est-ce ?",
      "Lire un paysage : les maisons individuelles, les jardins, les rues en boucle, loin du centre.",
      "Lotissement pavillonnaire."),
    etape("Comparer les espaces résidentiels", "comparer les paysages résidentiels et les reconnaitre.",
      "Comment reconnaitre chaque espace résidentiel ?",
      "Trier des photographies ; faire le croquis d'un paysage avec sa légende.",
      "Cinq paysages résidentiels, leurs éléments."),
    evaluation("reconnaitre et décrire les éléments d'un espace résidentiel", "Les paysages restent affichés."),
  ],
};

const TRAVAILLER_CE2: Demarche = {
  id: "travailler-ce2", nom: "Travailler en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les principales caractéristiques paysagères des activités en France ? » Reconnaitre et décrire un paysage industriel, "
    + "agricole, d'activité commerciale, de quartier d'affaires, de station touristique — littorale ou de montagne.",
  seances: [
    etape("Où travaille-t-on ?", "dire que les activités marquent les paysages.",
      "Où travaillent les adultes autour de nous ?",
      "Ce que les élèves en savent ; des photographies de lieux de travail : qu'y fait-on ?",
      "Les activités laissent leur marque dans les paysages."),
    etape("Les paysages agricoles", "reconnaitre et décrire un paysage agricole.",
      "Qu'est-ce qu'une exploitation agricole ?",
      "Lire un paysage : les champs, les prés, la ferme, les serres, les machines.",
      "Paysage agricole, exploitation agricole."),
    etape("Les paysages industriels", "reconnaitre et décrire un paysage industriel.",
      "Que fabrique-t-on dans une usine ?",
      "Lire un paysage : l'usine, les entrepôts, les routes, la voie ferrée, le port.",
      "Paysage industriel, usine."),
    etape("Commerces et bureaux", "reconnaitre et décrire un paysage d'activité commerciale et un quartier d'affaires.",
      "Où fait-on ses courses ? Où sont les bureaux ?",
      "Lire deux paysages : le centre commercial et son parking ; les tours de bureaux.",
      "Activité commerciale, quartier d'affaires."),
    etape("Les stations touristiques", "reconnaitre et décrire une station touristique, littorale ou de montagne.",
      "Pourquoi tant d'hôtels au même endroit ?",
      "Lire un paysage : la plage ou les pistes, les hôtels, les commerces, les remontées mécaniques.",
      "Station touristique, littorale ou de montagne."),
    evaluation("reconnaitre et décrire les paysages des activités", "Les paysages restent affichés."),
  ],
};

export const DEMARCHES_HISTOIRE_GEO: Demarche[] = [
  TEMPS_NATUREL_CP, TEMPS_REPRESENTE_CP, SITUER_EVENEMENTS_CP, PETITE_SIRENE_CP, PASSE_PROCHE_CE1, GRANDES_PERIODES_CE1, TRACES_PASSE_CE1,
  PREHISTOIRE_CE2, ROME_CE2, ROYAUME_CE2,
  LA_CLASSE, ECOLE_QUARTIER_CP, REPRESENTATIONS_MONDE_CP, TERRE_PEUPLEE_CE1, LIEUX_DE_VIE_CE1, POPULATION_FRANCE_CE2, SE_LOGER_CE2, TRAVAILLER_CE2,
];

/**
 * La séquence d'une compétence d'histoire-géographie, à sa classe ; rien
 * quand Éduscol n'en propose pas (la démarche d'enquête générale la prend).
 * Les intitulés arrivent en minuscules, sans accents.
 */
export function demarcheHistoireGeo(classe: string, sd: string, cg: string, comp: string): string | null {
  const histoire = /histoire/.test(sd), geographie = /geographie/.test(sd);
  const theme = (motif: RegExp) => motif.test(cg);
  if (histoire) {
    if (classe === "cp") {
      if (theme(/manifestations naturelles/)) return TEMPS_NATUREL_CP.id;
      if (theme(/representations humaines du temps/)) return TEMPS_REPRESENTE_CP.id;
      if (theme(/situer des evenements/)) return SITUER_EVENEMENTS_CP.id;
    }
    if (classe === "ce1") {
      if (theme(/passe proche/)) return PASSE_PROCHE_CE1.id;
      if (theme(/grandes periodes/)) return GRANDES_PERIODES_CE1.id;
      if (theme(/traces du passe/)) return TRACES_PASSE_CE1.id;
    }
    if (classe === "ce2") {
      if (theme(/paleolithique|neolithique/)) return PREHISTOIRE_CE2.id;
      if (theme(/rome|gaule romaine/)) return ROME_CE2.id;
      if (theme(/royaume de france/)) return ROYAUME_CE2.id;
    }
  }
  if (geographie) {
    if (classe === "cp") {
      // La classe, son plan, ses angles de vue : la séquence Éduscol ; l'école, le quartier, le trajet : celle du programme.
      if (theme(/autour de l.ecole/)) return /organisation de la classe|plan de la classe|angles? de vue/.test(comp) ? LA_CLASSE.id : ECOLE_QUARTIER_CP.id;
      if (theme(/representations du monde/)) return REPRESENTATIONS_MONDE_CP.id;
    }
    if (classe === "ce1") {
      if (theme(/terre est peuplee/)) return TERRE_PEUPLEE_CE1.id;
      if (theme(/lieux ou vivent/)) return LIEUX_DE_VIE_CE1.id;
    }
    if (classe === "ce2") {
      if (theme(/inegale repartition/)) return POPULATION_FRANCE_CE2.id;
      if (theme(/se loger/)) return SE_LOGER_CE2.id;
      if (theme(/travailler en france/)) return TRAVAILLER_CE2.id;
    }
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Une feuille de l'atelier « Le plan de la classe », avec la salle de la classe quand on la connaît. */
const planClasse = (seance: number, titre: string, feuille: FeuillePlan, plus: Partial<ReglagesPlanClasse> = {}) =>
  (ctx: ContexteFeuilles | null): FeuilleAFabriquer => {
    const r = reglagesPlanSurs({
      ...REGLAGES_PLAN_CLASSE, ...plus, feuille,
      elements: ctx?.salle?.elements ?? [], agencement: ctx?.salle?.agencement ?? "", prenoms: ctx?.prenoms ?? [],
    });
    return {
      seance, atelier: "planClasse", titre,
      fabriquer: (g) => ({ html: htmlPlanClasse(r, g), style: STYLE_FEUILLE + STYLE_PLAN_CLASSE, refaire: { planClasse: r } }),
    };
  };

const PLANS: Record<string, { feuilles: ((ctx: ContexteFeuilles | null) => FeuilleAFabriquer)[]; materiel: string[] }> = {
  [LA_CLASSE.id]: {
    feuilles: [
      planClasse(4, "Les étiquettes pour les maquettes", "etiquettes"),
      planClasse(5, "Le plan à coller", "symbolique"),
      planClasse(6, "Le plan de la classe, avec sa légende", "plan", { noms: false, couleurs: true }),
      planClasse(6, "La chasse au trésor", "tresor", { noms: false, couleurs: false }),
      planClasse(6, "Lire le plan de la classe — évaluation", "evaluation", { noms: false, couleurs: false }),
    ],
    materiel: [
      "Des photographies de la classe et d'autres classes de l'école ; un appareil photo ; une affiche pour la liste des éléments",
      "La liste affichée des éléments importants de la classe ; des feuilles blanches A4, des crayons de papier",
      "Du matériel pour les maquettes — boîtes, cubes, petits objets, carton — et une base par groupe",
      "Les maquettes commencées, le même matériel",
      "Les maquettes, repérées par des lettres ; le reste du matériel ; une figurine ; un appareil photo pour les vues de dessus",
      "La photographie de chaque maquette vue de dessus ; des ciseaux, de la colle, des crayons de couleur",
      "Le plan projeté ; les étiquettes de la phrase mystère, cachées avant l'arrivée des élèves ; la figurine, « Charlie »",
    ],
  },
};

/** L'année scolaire en cours : celle qui a commencé en septembre. */
function anneeScolaire(): { debut: number; mois: (periode: number) => { mois: number; annee: number } } {
  const maintenant = new Date();
  const debut = maintenant.getMonth() >= 7 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  // Le premier mois de chaque période : septembre, novembre, janvier, mars, mai.
  const MOIS_DES_PERIODES = [8, 10, 0, 2, 4];
  return {
    debut,
    mois: (periode) => {
      const mois = MOIS_DES_PERIODES[Math.min(4, Math.max(0, periode - 1))];
      return { mois, annee: mois >= 8 ? debut : debut + 1 };
    },
  };
}

/** Une feuille de l'atelier « Frises et calendriers ». */
const frise = (seance: number, titre: string, modele: ModeleFrise, aCompleter = true) => (ctx: ContexteFeuilles | null): FeuilleAFabriquer => {
  const annee = anneeScolaire();
  const { mois, annee: an } = annee.mois(ctx?.periode ?? 1);
  // Au CP, les élèves sont nés six ans avant la rentrée.
  const r = reglagesFriseSurs({ ...REGLAGES_FRISE, modele, aCompleter, mois, annee: an, naissance: annee.debut - 6 });
  return { seance, atelier: "frise", titre, fabriquer: () => ({ html: htmlFrise(r), style: STYLE_FEUILLE + STYLE_FRISE, refaire: { frise: r } }) };
};

/** Une feuille de l'atelier « Lire un paysage ». */
const paysage = (seance: number, titre: string, famille: FamillePaysage, plus: Partial<ReglagesPaysage> = {}) => (): FeuilleAFabriquer => {
  const r = reglagesPaysageSurs({ ...REGLAGES_PAYSAGE, ...plus, famille });
  return { seance, atelier: "paysage", titre, fabriquer: () => ({ html: htmlPaysage(r), style: STYLE_FEUILLE + STYLE_PAYSAGE, refaire: { paysage: r } }) };
};

/** Les étiquettes des mots-clés et des repères du thème, grandes pour le tableau et petites pour les enveloppes : l'atelier « Étiquettes ». */
const motsCles = (seance: number, theme: string, mots: string[]) => (): FeuilleAFabriquer => {
  const r = { ...REGLAGES_ETIQUETTES, pictos: false, corolle: false, titreCorolle: theme };
  return {
    seance, atelier: "etiquettes", titre: `Les mots du thème — ${theme}`,
    fabriquer: () => ({ html: htmlEtiquettes(mots.map((mot) => ({ id: null, mot })), {}, r), style: STYLE_FEUILLE + STYLE_ETIQUETTES }),
  };
};

const CONTINENTS = ["l'Afrique", "l'Amérique", "l'Antarctique", "l'Asie", "l'Europe", "l'Océanie"];
const OCEANS = ["l'océan Atlantique", "l'océan Pacifique", "l'océan Indien"];

const PLANS_DES_THEMES: Record<string, { feuilles: ((ctx: ContexteFeuilles | null) => FeuilleAFabriquer)[]; materiel: string[] }> = {
  [TEMPS_NATUREL_CP.id]: {
    feuilles: [
      frise(0, "Ma journée", "journee"),
      motsCles(1, "Le jour et la nuit", ["le globe terrestre", "le jour", "la nuit", "la rotation de la Terre", "le Soleil", "la Lune"]),
      frise(3, "L'année et les saisons", "annee"),
      frise(4, "Les saisons — évaluation", "annee"),
    ],
    materiel: [
      "Des images de ce qu'on fait le jour et la nuit", "Un globe terrestre, une lampe, une gommette ; la pénombre",
      "Des photographies d'un même lieu aux quatre saisons ; l'arbre de la cour", "La roue de l'année ; des photographies d'un lieu d'outre-mer",
      "Un globe et une lampe pour l'oral",
    ],
  },
  [TEMPS_REPRESENTE_CP.id]: {
    feuilles: [
      motsCles(0, "Les mots du temps", ["attendre", "s'ennuyer", "patienter", "bientôt", "d'abord", "juste avant", "maintenant", "aujourd'hui", "ce soir",
        "la montre", "la pendule", "le réveil", "le sablier", "la clepsydre"]),
      motsCles(3, "Mesurer le temps", ["le sablier", "la pendule", "la montre", "le réveil", "le chronomètre", "la seconde", "la minute", "l'heure"]),
      frise(4, "Ma journée", "journee"),
      frise(5, "La semaine", "semaine"),
      frise(6, "L'année", "annee"),
      frise(6, "Le calendrier du mois", "calendrier", false),
      frise(7, "La semaine — évaluation", "semaine"),
    ],
    materiel: [
      "L'album François et le temps (Christine Naumann-Villemin, éd. Kaléidoscope, 2010) ; une affiche pour classer les mots du temps",
      "L'album Le petit voleur de temps (Nathalie Minne, éd. Casterman, 2014) ; les cartes de questions des quatre ateliers, la réponse des questions fermées écrite dessus",
      "L'album Le petit voleur de temps ; le calendrier de la classe et deux personnages aimantés ; l'horloge",
      "Des outils pour mesurer le temps : sablier, réveil, montre, chronomètre, l'horloge — et, si possible, une clepsydre ou un métronome",
      "Les étiquettes des moments de la journée ; l'horloge de la classe",
      "Le calendrier, la roue des jours, une frise numérique ; le tableau pour écrire la date",
      "Le calendrier du mois, la frise des mois",
      "",
    ],
  },
  [SITUER_EVENEMENTS_CP.id]: {
    feuilles: [
      frise(2, "Le calendrier du mois", "calendrier"),
      frise(3, "Ma journée", "journee"),
      frise(4, "La frise de ma vie", "vie"),
      frise(5, "Les générations", "generations"),
    ],
    materiel: [
      "Un parcours sonore enregistré — Éduscol prend la piste 1 de « Promenade sonore dans la campagne » (L'atelier des images et des sons, Nathan), "
        + "un autre convient — ; un chronomètre, une montre ; des bandes de papier, du ruban adhésif, des ciseaux",
      "Les chemins dessinés ; deux ou trois productions choisies, affichées ou projetées ; des outils pour mesurer le temps",
      "Le calendrier de la classe, la frise des mois ; les étiquettes hier, aujourd'hui, demain ; le cahier de textes",
      "Des photographies d'une journée de classe",
      "Des photographies ou des dessins apportés par les familles, à leur gré",
      "L'arbre généalogique d'une famille d'un album ou d'une famille célèbre",
      "",
    ],
  },
  [PETITE_SIRENE_CP.id]: {
    feuilles: [
      motsCles(1, "Situer les évènements", ["avant", "après", "en même temps", "pendant", "d'abord", "ensuite", "enfin", "la durée"]),
    ],
    materiel: [
      "Un parcours sonore enregistré — Éduscol prend la piste 1 de « Promenade sonore dans la campagne » (L'atelier des images et des sons, Nathan), "
        + "un autre convient — ; un chronomètre, une montre ; des bandes de papier, du ruban adhésif, des ciseaux",
      "Les chemins dessinés ; deux ou trois productions choisies, affichées ou projetées ; des outils pour mesurer le temps",
      "Le conte de la Petite Sirène, lu et écouté avant ; des objets sonores — pailles, fouets, fourchettes, papiers, une boîte à musique — ; de quoi enregistrer",
      "Les enregistrements ; de grandes feuilles pour les frises-partitions, une ligne par son",
      "Les partitions choisies ; des outils pour mesurer le temps — sablier, réveil, montre, chronomètre, et si possible un métronome — ; de quoi enregistrer",
    ],
  },
  [PASSE_PROCHE_CE1.id]: {
    feuilles: [
      motsCles(0, "Les mots du temps", ["hier", "autrefois", "aujourd'hui", "il y a dix jours", "il y a dix ans", "il y a cent ans", "une année", "une décennie", "un siècle", "un millénaire"]),
      frise(2, "Une frise de cent ans", "tempsLong"),
      frise(4, "Une frise de cent ans — évaluation", "tempsLong"),
    ],
    materiel: [
      "Des photographies et des objets d'aujourd'hui et d'autrefois", "Une longue bande graduée", "", "Des photographies d'un monument proche", "",
    ],
  },
  [GRANDES_PERIODES_CE1.id]: {
    feuilles: [
      frise(1, "Les grandes périodes", "periodes"),
      frise(3, "Les grandes périodes, pour le mur", "periodes", false),
      frise(4, "Les grandes périodes — évaluation", "periodes"),
    ],
    materiel: ["Une longue bande de papier", "", "Des récits et des images des figures de chaque période", "", ""],
  },
  [TRACES_PASSE_CE1.id]: {
    feuilles: [
      motsCles(1, "Les traces du passé", ["des fossiles", "des ossements", "une grotte", "des ruines", "un monument", "un objet", "un écrit", "une image", "une œuvre d'art", "un témoignage",
        "l'archéologue", "l'archiviste", "l'historien", "l'historienne"]),
      frise(2, "Les grandes périodes", "periodes"),
    ],
    materiel: ["Une trace proche de l'école : photographie, objet", "Des documents de toutes sortes", "La frise des grandes périodes", "Des documents, une vidéo sur ces métiers", ""],
  },
  [PREHISTOIRE_CE2.id]: {
    feuilles: [
      frise(0, "La Préhistoire", "prehistoire"),
      motsCles(4, "La Préhistoire", ["l'agriculture", "l'art pariétal", "l'art rupestre", "le Néolithique", "le nomadisme", "le Paléolithique", "la sédentarité"]),
      frise(5, "La Préhistoire — évaluation", "prehistoire"),
    ],
    materiel: ["La frise des grandes périodes", "Des documents sur la vie des chasseurs-cueilleurs", "Une peinture pariétale d'un site français",
      "Des documents sur les premiers villages", "Un tableau à deux colonnes", ""],
  },
  [ROME_CE2.id]: {
    feuilles: [
      motsCles(0, "Rome et son empire", ["Rome", "la Gaule", "la mer Méditerranée", "l'empire romain"]),
      motsCles(3, "Les monuments de Rome", ["l'amphithéâtre", "l'aqueduc", "le forum", "le palais", "le temple", "les thermes", "la villa", "gallo-romain"]),
      frise(5, "Rome et la Gaule romaine", "rome"),
      frise(6, "Rome et la Gaule romaine — évaluation", "rome"),
    ],
    materiel: ["Une carte de l'empire à son apogée", "Des documents sur les maisons et les repas", "Des documents sur les voies, les thermes, les jeux",
      "Des images des monuments", "Des documents sur la société romaine", "Des documents sur un site gallo-romain", ""],
  },
  [ROYAUME_CE2.id]: {
    feuilles: [
      motsCles(3, "Le royaume de France", ["la dynastie", "la guerre", "l'impôt", "la monarchie", "la monnaie", "le royaume", "le sacre"]),
      frise(4, "Le royaume de France", "royaume"),
      frise(6, "Le royaume de France — évaluation", "royaume"),
    ],
    materiel: ["Une carte du royaume vers l'an mil", "Des cartes successives du domaine royal", "Une enluminure du sacre", "Des documents sur l'impôt, la monnaie, l'armée",
      "Des récits sur Philippe Auguste, Aliénor d'Aquitaine, Blanche de Castille", "Une carte de la guerre de Cent Ans", ""],
  },
  [ECOLE_QUARTIER_CP.id]: {
    feuilles: [
      motsCles(0, "Les lieux de l'école", ["la classe", "la cour de récréation", "les couloirs", "les sanitaires", "le réfectoire", "le portail", "la bibliothèque", "le gymnase"]),
      motsCles(3, "Se positionner", ["à gauche", "à droite", "au-dessus", "en dessous", "devant", "derrière", "à côté", "le plan", "la rue", "le trajet"]),
    ],
    materiel: ["Un appareil photo", "Le plan de l'école ; les photographies des lieux", "Un plan du quartier ; un appareil photo", "Le plan du quartier, des crayons de couleur", ""],
  },
  [REPRESENTATIONS_MONDE_CP.id]: {
    feuilles: [
      motsCles(2, "Continents et océans", [...CONTINENTS, ...OCEANS, "le nord", "le sud", "l'est", "l'ouest", "la France"]),
    ],
    materiel: ["Un globe terrestre", "Le globe et le planisphère de la classe", "Le planisphère et le globe", "Le planisphère, le globe ; la France et l'outre-mer",
      "Une carte de la population du monde", "Un planisphère muet"],
  },
  [TERRE_PEUPLEE_CE1.id]: {
    feuilles: [
      motsCles(1, "De grandes villes du monde", ["Tokyo (Asie)", "Lagos (Afrique)", "Mexico (Amérique)", "São Paulo (Amérique)", "Paris (Europe)", "Sydney (Océanie)"]),
      paysage(2, "Ville, village ou campagne ?", "villeVillage"),
    ],
    materiel: ["Une carte de la population du monde, le planisphère", "Des photographies de grandes villes", "Des photographies de ville, de village et de campagne", ""],
  },
  [LIEUX_DE_VIE_CE1.id]: {
    feuilles: [
      paysage(0, "Je lis un paysage", "monde"),
      motsCles(2, "Les repères du monde", ["la zone tropicale", "la zone tempérée", "la zone froide", "la forêt amazonienne", "la forêt du bassin du Congo",
        "la forêt indonésienne", "le Sahara", "l'Antarctique", "l'Amazone", "le Mississippi", "le Nil", "les Andes", "les Alpes", "l'Atlas", "l'Himalaya", "les Rocheuses"]),
      paysage(6, "Je lis un paysage — évaluation", "monde", { croquis: false }),
    ],
    materiel: ["Une photographie de paysage, ou une sortie", "Le planisphère, des crayons de couleur", "Des photographies de forêts, de déserts, de prairies, de savanes",
      "Des photographies de reliefs, une maquette", "Le planisphère", "Des photographies de lieux de vie", "Une photographie de paysage"],
  },
  [POPULATION_FRANCE_CE2.id]: {
    feuilles: [
      motsCles(1, "Les repères de la France", ["Paris", "Lyon", "Marseille", "Lille", "Toulouse", "les Alpes", "la Corse", "le Jura", "le Massif central", "les Pyrénées",
        "les Vosges", "la Garonne", "la Loire", "le Maroni", "le Rhin", "le Rhône", "la Seine", "forte densité", "faible densité"]),
    ],
    materiel: ["Une carte des densités de population", "Une carte de France muette", "La carte de France", ""],
  },
  [SE_LOGER_CE2.id]: {
    feuilles: [
      paysage(1, "Je lis un paysage résidentiel", "residentiel"),
      paysage(4, "Je lis un paysage résidentiel — croquis", "residentiel", { elements: false }),
      motsCles(4, "Se loger", ["le centre-ville", "le grand ensemble", "le lotissement pavillonnaire", "le quartier récent", "le village"]),
      paysage(5, "Je lis un paysage résidentiel — évaluation", "residentiel", { croquis: false }),
    ],
    materiel: ["Des photographies du quartier ou du village", "Des photographies d'un centre-ville ancien et d'un village", "Des photographies d'un grand ensemble et d'un quartier récent",
      "Des photographies d'un lotissement", "Des photographies à trier", "Une photographie d'un espace résidentiel"],
  },
  [TRAVAILLER_CE2.id]: {
    feuilles: [
      paysage(1, "Je lis un paysage d'activités", "activites"),
      motsCles(4, "Travailler", ["l'exploitation agricole", "l'usine", "le centre commercial", "le quartier d'affaires", "la station touristique"]),
      paysage(5, "Je lis un paysage d'activités — évaluation", "activites", { croquis: false }),
    ],
    materiel: ["Des photographies de lieux de travail", "Des photographies de paysages agricoles", "Des photographies de paysages industriels",
      "Des photographies d'un centre commercial et d'un quartier d'affaires", "Des photographies de stations touristiques", "Une photographie de paysage"],
  },
};

export const estUneDemarcheHistoireGeo = (id: string) => id in PLANS || id in PLANS_DES_THEMES;

export function planHistoireGeo(demarcheId: string, ctx: ContexteFeuilles | null): PlanDesFeuilles | null {
  const p = PLANS[demarcheId] ?? PLANS_DES_THEMES[demarcheId];
  if (!p) return null;
  const feuilles = p.feuilles.map((f) => f(ctx));
  const materiel = p.materiel.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    const lesFeuilles = f.length ? `${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(", ")}` : "";
    if (!debut) return lesFeuilles ? `${lesFeuilles.charAt(0).toUpperCase()}${lesFeuilles.slice(1)}.` : "";
    return lesFeuilles ? `${debut} ; ${lesFeuilles}.` : `${debut}.`;
  });
  return { feuilles, materiel };
}
