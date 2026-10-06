// Les démarches d'enseignement : le cadre qu'une séquence reçoit à sa création.
//
// Une séquence neuve est une page blanche, et la page blanche fait perdre le
// fil : on écrit la séance 1 en détail, la séance 4 en deux lignes, et
// l'évaluation n'est jamais prévue. Les guides le disent autrement — « la
// démarche d'enseignement se compose de quatre temps pour aider l'élève à
// passer de découvertes fortuites à des apprentissages structurés et
// transférables » — mais c'est la même idée : la structure d'abord, le
// contenu ensuite.
//
// Chaque démarche ci-dessous est reprise d'un guide publié, avec ses
// formulations. On ne les réécrit pas : c'est ce qu'un inspecteur ou un
// collègue reconnaîtra. Les phases deviennent les lignes du tableau de
// déroulement de chaque séance ; les descriptions sont des consignes-cadres,
// à compléter, jamais un contenu inventé pour l'enseignant. L'objectif d'une
// séance, lui, dit ce que les élèves sauront à la fin — « À la fin de cette
// séance, les élèves sauront … » —, le contenu du guide à la suite.
//
// Sources :
// - Livrets d'accompagnement de programme, Éduscol 2025 (mathématiques CP)
//   et 2026 (français CE1) : « Temps 1 – Définition des objectifs et mise en
//   réussite ; Temps 2 – Mise en activité des élèves ; Temps 3 –
//   Institutionnalisation, retour réflexif ; Temps 4 – Automatisation,
//   réinvestissement, transfert. »
// - Éduscol, EPS cycle 2, « Concevoir un module d'apprentissage » : découverte,
//   apprentissage-entraînement, évaluation ; « au cycle 2, on peut recommander
//   des modules de 6 à 12 séances ».
// - L'enseignement explicite (Gauthier, Bissonnette ; DGESCO « Enseigner plus
//   explicitement ») : modelage, pratique guidée, pratique autonome, avec un
//   objectif annoncé au départ et une objectivation à la fin.
// - Les guides fondamentaux (Éduscol) : Pour enseigner la lecture et
//   l'écriture au CP (2019), Pour préparer l'apprentissage de la lecture et de
//   l'écriture à l'école maternelle (2020), Pour enseigner le vocabulaire à
//   l'école maternelle (2019), La grammaire du français du CP à la 6e (2022),
//   La résolution de problèmes mathématiques au cours moyen (2021), Oser les
//   langues vivantes étrangères à l'école (2019).
// - Les livrets d'accompagnement 2025-2026 (Français CP, CE1, « À partir de
//   5 ans » ; Mathématiques CP, CE1, CE2 ; Résolution de problèmes) : la
//   démarche en quatre temps, la leçon de code, le geste d'écriture, la
//   fluence par profils, le vocabulaire en trois étapes.
// - Les ressources d'accompagnement des programmes 2016-2018 : Questionner le
//   monde (canevas d'une séquence), Étude de la langue (principes généraux),
//   Écriture, Organiser l'enseignement de l'oral, Lecture et compréhension de
//   l'écrit, Grandeurs et mesures, Espace et géométrie, Histoire-géographie
//   (raisonner), EMC (débat réglé, dilemmes moraux), Arts plastiques
//   (concevoir une séquence), Éducation musicale (l'écoute, le chant),
//   Histoire des arts (approche descriptive d'une œuvre).
// - Le programme de l'école maternelle (2025) : apprendre en jouant, en
//   réfléchissant et en résolvant des problèmes, en s'exerçant, en mémorisant.
// - La construction du nombre à l'école maternelle (guide fondamental, 2023)
//   et les livrets « Avant 4 ans » et « À partir de 4 ans » (2025) : la
//   situation des voyageurs, les poupées, le dortoir des oursons.
// - « La compréhension des récits de fiction » (Éduscol, 2017) et les
//   indicateurs de progrès « Se repérer dans le temps et l'espace » (2016) :
//   raconter en entier, rejouer, faire raconter, ordonner des photographies.

import { newId, type Seance } from "./api";

/** Une ligne du tableau de déroulement, dans l'ordre de ses colonnes. */
export interface PhaseCadre {
  phase: string;
  duree: string;
  description: string;
  posture: string;
}

/** Comment commence l'objectif d'une séance : ce que les élèves sauront à la fin. */
export const DEBUT_OBJECTIF_SEANCE = "À la fin de cette séance, les élèves sauront";

/** Une séance telle que la démarche la prévoit, avant qu'on l'écrive. */
export interface SeanceCadre {
  titre: string;
  /** Ce que la séance doit obtenir : « À la fin de cette séance, les élèves sauront … », dans les mots du guide. */
  objectifs: string;
  duree: number;
  phases: PhaseCadre[];
}

/** La famille d'une démarche : le menu les groupe ainsi. */
export type Famille =
  | "Toutes disciplines" | "Français" | "Mathématiques" | "Sciences, histoire, EMC" | "Arts, EPS et langues" | "Maternelle";

export interface Demarche {
  id: string;
  nom: string;
  famille: Famille;
  /** Le guide dont elle vient, pour le dire à l'écran. */
  source: string;
  /** Ce qu'elle fait, en une phrase. */
  resume: string;
  seances: SeanceCadre[];
}

/** Les colonnes du tableau de déroulement, celles que l'éditeur propose déjà. */
export const ENTETE_TABLEAU = ["Phase", "Durée", "Description", "Posture de l'enseignant"] as const;

// ── Les quatre temps des livrets Éduscol ──────────────────────────────────

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const quatreTemps = (
  t1: string, t2: string, t3: string, t4: string, durees: [string, string, string, string],
): PhaseCadre[] => [
  { phase: T1, duree: durees[0], description: t1,
    posture: "Annonce l'objectif et le critère de réussite. Fait réussir avant de faire chercher." },
  { phase: T2, duree: durees[1], description: t2,
    posture: "Observe, guide si besoin, différencie : matériel de manipulation à disposition." },
  { phase: T3, duree: durees[2], description: t3,
    posture: "Fait verbaliser, écrit la trace avec les élèves. Traite l'erreur comme un appui." },
  { phase: T4, duree: durees[3], description: t4,
    posture: "Fait répéter en variant les supports. Reprend la procédure avec ceux qui hésitent." },
];

const EDUSCOL_QUATRE_TEMPS: Demarche = {
  id: "eduscol-quatre-temps",
  famille: "Toutes disciplines",
  nom: "Démarche en quatre temps",
  source: "Livrets d'accompagnement de programme, Éduscol 2025-2026",
  resume: "Découverte et trace écrite, entraînement différencié, évaluation courte, réinvestissement — les quatre temps dans chaque séance.",
  seances: [
    {
      titre: "Découverte et institutionnalisation",
      objectifs: "À la fin de cette séance, les élèves sauront … (l'objectif, tel qu'il sera annoncé aux élèves).\nCritère de réussite : l'élève …",
      duree: 45,
      phases: quatreTemps(
        "Très courte recherche individuelle (3 minutes) sur ardoise : …\nPuis enseignement de la procédure : un élève en réussite montre, l'enseignant verbalise.",
        "Même tâche sur un nouveau cas : …\nLes élèves font seuls ; l'enseignant guide ceux qui en ont besoin.",
        "Ce qu'on retient, dit par les élèves puis écrit : …\nTrace écrite courte, avec l'exemple travaillé.",
        "Deux ou trois cas de plus, supports variés, pour fixer le geste.",
        ["10 min", "15 min", "10 min", "10 min"],
      ),
    },
    {
      titre: "Entraînement différencié",
      objectifs: "À la fin de cette séance, les élèves sauront traiter seuls plusieurs cas de plus en plus variés, le matériel de manipulation à disposition de qui en a besoin.",
      duree: 30,
      phases: quatreTemps(
        "Rappel de la trace écrite par les élèves ; un cas résolu ensemble.",
        "Série de cas à faire seul : …\nGroupes selon la maîtrise : avec matériel, sans matériel, cas plus grands.",
        "Retour sur deux erreurs vues dans la classe : ce qu'elles apprennent.",
        "Un cas « pour voir » sur un support nouveau.",
        ["5 min", "15 min", "5 min", "5 min"],
      ),
    },
    {
      titre: "Entraînement — autonomie",
      objectifs: "À la fin de cette séance, les élèves sauront traiter plusieurs cas en autonomie, chacun selon sa maîtrise.",
      duree: 30,
      phases: quatreTemps(
        "Rappel de l'objectif ; annonce de l'évaluation à venir.",
        "Série autonome : …\nL'enseignant travaille avec le groupe qui hésite encore.",
        "Retour réflexif : « comment as-tu fait ? » — les procédures se disent.",
        "Réinvestissement dans un problème ou une situation de classe.",
        ["5 min", "15 min", "5 min", "5 min"],
      ),
    },
    {
      titre: "Évaluation courte",
      objectifs: "À la fin de cette séance, les élèves sauront où ils en sont : leurs réussites, leurs progrès et leurs besoins. Ils répondent directement à ce qu'ils trouvent facile.",
      duree: 20,
      phases: [
        { phase: T1, duree: "5 min", description: "Ce qui est attendu, dit clairement. Un exemple fait ensemble.",
          posture: "Rassure : on montre ce qu'on sait faire." },
        { phase: "Évaluation", duree: "10 min", description: "Fiche de … cas, en temps limité : …",
          posture: "Observe qui fait quoi, note les procédures." },
        { phase: T3, duree: "5 min", description: "Retour immédiat : ce qui est réussi, mis en valeur ; ce qui reste à travailler.",
          posture: "Évaluation positive : affiche les progrès d'un entraînement à l'autre." },
      ],
    },
    {
      titre: "Réinvestissement (séance courte)",
      objectifs: "À la fin de cette séance, les élèves sauront réinvestir la procédure dans d'autres situations — une séance courte, à reprendre tout au long de l'année, rituels compris.",
      duree: 15,
      phases: [
        { phase: T4, duree: "15 min", description: "Rituel ou situation nouvelle où la procédure sert : …",
          posture: "Fait le lien avec la trace écrite ; reprend avec ceux qui l'ont perdue." },
      ],
    },
  ],
};

// ── Le module d'apprentissage (Éduscol, EPS cycle 2) ──────────────────────

const EPS_MODULE: Demarche = {
  id: "eps-module",
  famille: "Arts, EPS et langues",
  nom: "Module d'apprentissage",
  source: "Éduscol, EPS cycle 2 — « Concevoir un module d'apprentissage »",
  resume: "Découverte, apprentissage-entraînement, évaluation : de six à douze séances, l'évaluation conçue dès le départ.",
  seances: [
    {
      titre: "Découverte",
      objectifs: "À la fin de cette séance, les élèves sauront se mettre en mouvement dans l'activité et prendre leurs premiers repères : une première expérience authentique, qui donne son sens au module.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "Entrée dans l'activité : …", posture: "Installe un cadre apaisé et des repères." },
        { phase: "Situation de découverte", duree: "25 min", description: "Première expérience de l'activité, telle qu'elle est : …", posture: "Observe ce que les élèves savent déjà faire — c'est l'évaluation diagnostique." },
        { phase: "Bilan", duree: "10 min", description: "Ce qu'on a compris de l'activité, ce qu'il faudra apprendre.", posture: "Fait dire, sans corriger encore." },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "À la fin de cette séance, les élèves sauront agir dans la situation qui porte les enjeux du module, dans son entier.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "La situation de référence du module : …", posture: "Relève les difficultés qui reviennent : elles font la séance suivante." },
        { phase: "Bilan", duree: "10 min", description: "Ce qui a marché, ce qui bloque.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "À la fin de cette séance, les élèves sauront mieux faire ce qui leur posait difficulté : des situations ciblées pour consolider leurs acquis ou y remédier.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "Ateliers sur les difficultés relevées : …", posture: "Différencie : chacun travaille ce qui lui manque." },
        { phase: "Retour à la situation complexe", duree: "10 min", description: "On rejoue la situation de référence : ce qui a changé.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "À la fin de cette séance, les élèves sauront mesurer leurs progrès, de retour dans la situation de référence.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "À la fin de cette séance, les élèves sauront réussir ce qui restait fragile avant l'évaluation.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Évaluation — bilan des savoirs",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont construit pendant le module, dans une situation en partie inédite et accessible à toutes et à tous.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation d'évaluation", duree: "25 min", description: "Situation proche de la situation complexe, avec une part d'inédit : …", posture: "Observe avec la grille prévue dès le début du module." },
        { phase: "Bilan du module", duree: "10 min", description: "Ce que chacun sait faire maintenant, dit par lui.", posture: "" },
      ],
    },
  ],
};

// ── L'enseignement explicite ──────────────────────────────────────────────

const explicite = (
  ouverture: string, modelage: string, guidee: string, autonome: string, cloture: string,
  durees: [string, string, string, string, string],
): PhaseCadre[] => [
  { phase: "Ouverture — objectif et rappel", duree: durees[0], description: ouverture,
    posture: "Dit ce qu'on va apprendre et à quoi ça sert. Réactive ce qu'il faut savoir avant." },
  { phase: "Modelage — « je fais »", duree: durees[1], description: modelage,
    posture: "Met un haut-parleur sur sa pensée : quoi faire, où, quand, pourquoi, comment." },
  { phase: "Pratique guidée — « nous faisons »", duree: durees[2], description: guidee,
    posture: "Fait faire avec lui, questionne, corrige aussitôt. Ne lâche que si ça tient." },
  { phase: "Pratique autonome — « vous faites »", duree: durees[3], description: autonome,
    posture: "Observe. Reprend en petit groupe ceux qui n'y arrivent pas seuls." },
  { phase: "Clôture — objectivation", duree: durees[4], description: cloture,
    posture: "Fait redire ce qu'on a appris, et quand on s'en resservira." },
];

const ENSEIGNEMENT_EXPLICITE: Demarche = {
  id: "explicite",
  famille: "Toutes disciplines",
  nom: "Enseignement explicite",
  source: "Gauthier & Bissonnette ; DGESCO, « Enseigner plus explicitement »",
  resume: "Modelage, pratique guidée, pratique autonome — par petits pas, avec de la répétition et des révisions fréquentes.",
  seances: [
    {
      titre: "Modelage et pratique guidée",
      objectifs: "À la fin de cette séance, les élèves sauront … : ils l'auront vu faire, puis l'auront fait avec l'enseignant.",
      duree: 45,
      phases: explicite(
        "Objectif annoncé : …\nRappel de ce qu'il faut savoir : …",
        "L'enseignant fait devant les élèves, en disant tout haut ce qu'il pense : …",
        "Même tâche, ensemble : les élèves proposent, l'enseignant valide pas à pas.",
        "Un cas seul, court : …",
        "Qu'a-t-on appris ? À quoi le reconnaît-on ?",
        ["5 min", "12 min", "15 min", "8 min", "5 min"],
      ),
    },
    {
      titre: "Pratique guidée puis autonome",
      objectifs: "À la fin de cette séance, les élèves sauront appliquer la procédure à des cas proches, avec de moins en moins d'aide.",
      duree: 45,
      phases: explicite(
        "Rappel de la séance précédente par les élèves.",
        "Un exemple refait rapidement, pour montrer le geste juste.",
        "Cas travaillés à deux, puis corrigés ensemble.",
        "Série de cas seul : …",
        "Ce qui est acquis, ce qui reste difficile.",
        ["5 min", "5 min", "15 min", "15 min", "5 min"],
      ),
    },
    {
      titre: "Pratique autonome et petits pas",
      objectifs: "À la fin de cette séance, les élèves sauront appliquer la procédure à un cas un peu plus complexe : une seule nouveauté, sans surcharge.",
      duree: 45,
      phases: explicite(
        "Ce qu'on sait déjà faire ; ce qu'on ajoute aujourd'hui : …",
        "Modelage de la seule nouveauté.",
        "Cas mêlant l'ancien et le nouveau, ensemble.",
        "Série seul : …",
        "Redire la procédure complète.",
        ["5 min", "8 min", "12 min", "15 min", "5 min"],
      ),
    },
    {
      titre: "Révision et évaluation",
      objectifs: "À la fin de cette séance, les élèves sauront restituer ce qui leur a été enseigné explicitement, révisé souvent pour la mémoire à long terme, puis évalué.",
      duree: 30,
      phases: [
        { phase: "Révision", duree: "10 min", description: "Reprise rapide des cas des séances précédentes.", posture: "Valorise les efforts et les stratégies : R = E × S." },
        { phase: "Évaluation", duree: "15 min", description: "Cas proches de ceux travaillés : …", posture: "Observe les stratégies, pas seulement les réponses." },
        { phase: "Clôture — objectivation", duree: "5 min", description: "Où en est-on ? Ce qu'on reverra.", posture: "" },
      ],
    },
  ],
};

// ── Les démarches propres à chaque domaine, reprises des guides ──────────
//
// Les quatre temps valent partout ; mais le guide de lecture ne parle pas
// comme celui des sciences, et l'enseignant qui prépare une séance de
// phonologie attend « segmenter, fusionner, supprimer », pas « mise en
// activité ». Chaque démarche ci-dessous suit un guide précis, nommé dans
// `source`, avec ses mots. Les descriptions sont des consignes-cadres, à
// compléter là où il y a « … ».

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre =>
  ({ phase, duree, description, posture });

// ── Français ──────────────────────────────────────────────────────────────

const LECTURE_CODE: Demarche = {
  id: "lecture-code",
  nom: "Leçon de code : syllabes, mots, phrases, dictée",
  famille: "Français",
  source: "Pour enseigner la lecture et l'écriture au CP (guide fondamental, 2019) ; livret Français CP, Éduscol 2025",
  resume: "Une leçon de code en quatre phases — les syllabes, les mots, les phrases et le texte, la dictée —, chacune en trois temps, puis l'entraînement ritualisé en groupes de besoin.",
  seances: [
    {
      titre: "Les syllabes",
      objectifs: "À la fin de cette séance, les élèves sauront lire avec précision les syllabes qui contiennent le graphème étudié : … La précision du décodage d'abord, pas la vitesse.",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Rappel des séances antérieures : les graphèmes connus, relus sur le mur sonore. Objectif : « aujourd'hui, nous apprenons à lire … ».",
          "Annonce une seule correspondance graphème-phonème à la fois. Distingue le nom de la lettre et le son qu'elle produit."),
        ph(T2, "15 min", "Lecture des combinaisons syllabiques au tableau, bien détachées du reste : …\nLecture collective, puis individuelle, puis dictée de syllabes sur l'ardoise lignée.",
          "Fait lire chaque élève. Reprend aussitôt une syllabe mal lue : on la relit, on ne la devine pas."),
        ph(T3, "5 min", "Synthèse : « Qu'avons-nous appris ? » — le graphème, son son, une syllabe exemple, écrits sur l'affiche de référence.",
          "Fait verbaliser la règle par les élèves avant de l'écrire."),
        ph(T4, "5 min", "Copie des syllabes sur le cahier, en prononçant ce qu'on écrit.",
          "Veille à la posture et à la tenue du crayon : l'écriture n'est pas un temps d'autonomie."),
      ],
    },
    {
      titre: "Les mots",
      objectifs: "À la fin de cette séance, les élèves sauront décoder, puis écrire, des mots entièrement déchiffrables avec les graphèmes connus : …",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Rappel des syllabes de la veille, relues vite. Objectif : lire et écrire les mots de la leçon."),
        ph(T2, "15 min", "Lecture des mots de la leçon (mots réguliers, puis le graphème dans des positions variées) : …\nRepérage des lettres muettes et des particularités.",
          "Fait épeler, découper en syllabes, observer les lettres muettes : ce qu'on voit et qu'on n'entend pas."),
        ph(T3, "5 min", "« Qu'avons-nous appris ? » — deux ou trois mots retenus, ajoutés à la boîte à mots."),
        ph(T4, "5 min", "Copie puis dictée de mots sur l'ardoise, à voix basse.", "Après la copie, la dictée de mots suit la même démarche."),
      ],
    },
    {
      titre: "Les phrases et le texte",
      objectifs: "À la fin de cette séance, les élèves sauront lire des phrases puis un court texte déchiffrable, et montrer qu'ils comprennent ce qu'ils lisent.",
      duree: 45,
      phases: [
        ph(T1, "5 min", "Rappel : les mots de la leçon relus en fluence. Objectif : lire des phrases, puis le texte, et le comprendre."),
        ph(T2, "20 min", "Lecture des phrases une à une, puis du texte : …\nLecture silencieuse, puis à voix haute par plusieurs élèves.",
          "Fait relire jusqu'à ce que ça s'entende : groupes de souffle, ponctuation."),
        ph(T3, "10 min", "Compréhension : reformuler, dire ce que font les personnages, ce qu'ils ressentent ; théâtraliser le texte ; inventer la suite.",
          "Questionne simplement : qui, quoi, où. Fait justifier avec le texte."),
        ph(T4, "10 min", "Copie d'une phrase du texte en prononçant ce qu'on écrit ; relecture."),
      ],
    },
    {
      titre: "La dictée",
      objectifs: "À la fin de cette séance, les élèves sauront écrire des mots et des phrases en observant et en restant attentifs : la dictée est un temps d'apprentissage, pas d'évaluation.",
      duree: 30,
      phases: [
        ph("Lecture et compréhension du texte", "5 min", "Les élèves lisent le texte de la dictée silencieusement puis à voix haute ; le professeur s'assure de la compréhension par un questionnement simple.",
          "Fait compter les phrases, les mots, les espaces, les signes de ponctuation, les syllabes."),
        ph("Copie en prononçant", "8 min", "Ils copient la dictée en prononçant tout ce qu'ils écrivent, en sautant une ligne. Ils vérifient eux-mêmes : une erreur est soulignée, le mot réécrit au-dessus.",
          "Ne raye rien : l'erreur fait partie du quotidien de l'apprenti."),
        ph("Dictée de mots puis du texte", "12 min", "Dictée de mots dans le désordre, puis dictée de tout le texte, toujours en prononçant pendant l'écriture. Vérification par les élèves à partir du texte caché puis retrouvé.",
          "Se réserve l'ultime vérification."),
        ph("Révision", "5 min", "Nouvelle dictée des mots qui ont encore fait l'objet d'une erreur, et de quelques mots des dictées précédentes."),
      ],
    },
    {
      titre: "Entraînement ritualisé en groupes de besoin",
      objectifs: "À la fin de cette séance, les élèves sauront lire plus juste et plus vite (groupes 1 et 2), ou avec une meilleure prosodie (groupes 3 et 4), selon leur profil de lecteur (mots correctement lus par minute).",
      duree: 20,
      phases: [
        ph(T4, "20 min", "Atelier guidé avec un groupe ; les autres en autonomie : lecture chronométrée de syllabes et de mots, grille de fluence, jeux de lecture.",
          "Travaille avec le groupe qui en a le plus besoin ; les groupes ne sont pas figés."),
      ],
    },
  ],
};

const LECTURE_FLUENCE: Demarche = {
  id: "lecture-fluence",
  nom: "Fluence et lecture à voix haute",
  famille: "Français",
  source: "Livrets Français CP (2025) et CE1 (2026), Éduscol — séquence n° 1",
  resume: "Une semaine type par profils de lecteurs : atelier guidé, entraînement autonome chronométré, évaluation intermédiaire — de la précision à la lecture prosodique.",
  seances: [
    {
      titre: "Jour 1 — atelier guidé : nouvelle grille de fluence",
      objectifs: "À la fin de cette séance, les élèves sauront lire la grille de la semaine (graphèmes à réviser, syllabes, pseudo-mots, mots) avec les outils pour réussir. Évaluation chronométrée sur la grille de la semaine précédente.",
      duree: 30,
      phases: [
        ph("Évaluation chronométrée", "5 min", "Relecture chronométrée de la grille précédente avec l'enseignant ; score noté.",
          "Bienveillante et exigeante : « tu as lu autant de mots et beaucoup moins hésité ; la prochaine fois, les liaisons »."),
        ph(T1, "5 min", "Le professeur écrit les graphèmes de la semaine et oralise le phonème : « ces lettres se lisent ensemble ». Consigne et attentes ; relecture des traces écrites des séances précédentes."),
        ph(T2, "15 min", "Lecture individuelle de la nouvelle grille, puis confrontation en binôme des décodages ; validation avec le professeur. Jeux d'entraînement : syllabaire, jeu de l'ascenseur, tapette à mots.",
          "Équilibre révisions et mots résistants ; listes de plus en plus longues."),
        ph(T3, "5 min", "Institutionnalisation écrite en dictée à l'adulte : « pour être sûr de la lecture d'un mot, je peux me servir du mur sonore… ; pour une lettre muette, je pense au féminin ou à un mot de la même famille »."),
      ],
    },
    {
      titre: "Jour 2 — entraînement autonome",
      objectifs: "À la fin de cette séance, les élèves sauront lire la grille plus vite, sans erreur, en trinômes : chronométreur, vérificateur, lecteur.",
      duree: 20,
      phases: [
        ph(T4, "20 min", "Lecture chronométrée de la grille en autonomie, score noté sur le tableau ; outils : chronomètre, minuteur, chuchoteur ; outils numériques quand la fluence a progressé.",
          "Travaille en atelier guidé avec un autre groupe pendant ce temps."),
      ],
    },
    {
      titre: "Jour 3 — atelier guidé : évaluation intermédiaire",
      objectifs: "À la fin de cette séance, les élèves sauront mesurer leurs progrès sur la grille du jour 1, et copier en cursive tout ou partie de la liste.",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Relecture non chronométrée de la grille (évaluation intermédiaire)."),
        ph(T2, "20 min", "Évaluation chronométrée avec l'enseignant ; copie en écriture cursive de tout ou partie de la liste ; jeux d'entraînement."),
        ph(T3, "5 min", "Synthèse des acquis, point sur les difficultés ; objectif de l'entraînement autonome du jour 4."),
      ],
    },
    {
      titre: "Jour 4 — entraînement autonome et lecture de phrases",
      objectifs: "À la fin de cette séance, les élèves sauront lire les mots de la grille dans des phrases, et préparer la lecture en binôme (lecteur / auditeur-évaluateur).",
      duree: 20,
      phases: [
        ph(T4, "20 min", "Lecture des phrases préparées ; grille d'autoévaluation : on entend les espaces, la ponctuation, les liaisons.",
          "Donne un « coup d'avance » aux élèves proches du groupe supérieur : les phrases du lendemain."),
      ],
    },
    {
      titre: "Prosodie — lire avec expressivité",
      objectifs: "À la fin de cette séance, les élèves sauront lire avec expressivité : par groupes de souffle, en respectant la ponctuation et les liaisons, la voix au service du sens (groupes 3 et 4).",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Rappel des apprentissages ; lecture par le professeur du texte en accentuant ce qui est travaillé : liaisons, pauses entre groupes de souffle, articulation.",
          "Donne à entendre une lecture experte : c'est la référence."),
        ph(T2, "20 min", "Lecture individuelle, puis lecture oralisée d'un élève et échanges ; d'un second…\nMise en commun en dictée à l'adulte : « pour marquer les liaisons, je repère… ».",
          "Retours immédiats ; les conclusions enrichissent la grille d'évaluation."),
        ph(T3, "5 min", "« Qu'avez-vous appris aujourd'hui ? » ; mise en perspective : « demain, vous relirez par deux en suivant ces conseils »."),
      ],
    },
  ],
};

const COMPREHENSION: Demarche = {
  id: "comprehension",
  nom: "Comprendre un texte",
  famille: "Français",
  source: "Éduscol, Français cycle 2 — « Lecture et compréhension de l'écrit » (2017) ; programmes 2026",
  resume: "Une démarche explicite pour découvrir et comprendre un texte : guidée puis autonome, avec reformulation, rappel du récit, stratégies enseignées et écriture associée.",
  seances: [
    {
      titre: "Découverte guidée du texte",
      objectifs: "À la fin de cette séance, les élèves sauront parcourir le texte avec rigueur et dans l'ordre, identifier les informations clés, les relier et formuler des hypothèses.",
      duree: 45,
      phases: [
        ph("Avant la lecture", "10 min", "Prédictions à partir du titre, des images, de l'auteur : de quoi va parler le texte ? Ce qu'on sait déjà de cet univers.",
          "Fait dire les hypothèses, les note pour y revenir."),
        ph("Lecture par étapes", "20 min", "Lecture (par le professeur ou par les élèves) en s'arrêtant : reformuler ce qui vient d'être lu — qui, où, quand ; les mots inconnus affrontés dans le contexte.",
          "Guide : « qu'est-ce qu'on a compris jusque-là ? » ; fait relier les informations."),
        ph("Rappel du récit", "10 min", "Raconter l'histoire (« racontage ») avec ses mots, dans l'ordre ; retour aux hypothèses."),
        ph("Ce qu'on retient", "5 min", "Comment a-t-on fait pour comprendre ? La stratégie nommée."),
      ],
    },
    {
      titre: "Une stratégie enseignée explicitement",
      objectifs: "À la fin de cette séance, les élèves sauront utiliser une stratégie de compréhension (faire des liens, inférer, se représenter la scène, repérer les substituts…) et dire comment on comprend un texte.",
      duree: 30,
      phases: [
        ph("Objectif et modelage", "10 min", "La stratégie est nommée ; le professeur lit un extrait court et dit tout haut comment il comprend.", "Montre à voir comment on comprend."),
        ph("Pratique guidée", "15 min", "Même stratégie sur un nouvel extrait court, ensemble puis en binômes ; justification avec le texte."),
        ph("Retour", "5 min", "Quand utiliser cette stratégie ? Ajoutée à l'affiche des stratégies."),
      ],
    },
    {
      titre: "Lecture autonome et questions",
      objectifs: "À la fin de cette séance, les élèves sauront découvrir seuls un texte plus simple, se poser des questions et y répondre en cherchant des indices dans le texte.",
      duree: 30,
      phases: [
        ph("Lecture autonome", "10 min", "Lecture silencieuse d'un texte à la portée des élèves."),
        ph("Questions élaborées par les élèves", "15 min", "Les élèves proposent les questions importantes pour comprendre l'histoire ; confrontation ; réponses justifiées par des indices du texte.",
          "Centre sur les éléments essentiels et l'articulation chronologique et logique, pas sur le détail."),
        ph("Reformulation", "5 min", "Choisir la bonne reformulation ou le bon résumé parmi plusieurs."),
      ],
    },
    {
      titre: "Représenter pour comprendre",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont compris par une représentation : dessin, mise en scène, jeu théâtral, titres de paragraphes.",
      duree: 30,
      phases: [
        ph("Choisir une représentation", "5 min", "Dessiner la scène, mettre en scène avec des marionnettes, jouer le dialogue, titrer les paragraphes."),
        ph("Réaliser", "15 min", "Par groupes, avec le texte sous les yeux.", "Fait vérifier dans le texte ce que la représentation affirme."),
        ph("Confronter", "10 min", "Les représentations comparées : ce qui est dans le texte, ce qui a été inventé."),
      ],
    },
    {
      titre: "Écrire à partir du texte",
      objectifs: "À la fin de cette séance, les élèves sauront écrire à partir du texte : inventer la suite, écrire ce que pense un personnage, résumer.",
      duree: 30,
      phases: [
        ph("Planifier", "5 min", "Ce qu'on va écrire, à partir de ce qu'on a compris."),
        ph("Écrire", "20 min", "Écrit court, outils de la classe à disposition."),
        ph("Lire ses écrits", "5 min", "Quelques textes lus : sont-ils cohérents avec l'histoire ?"),
      ],
    },
  ],
};

const ECRITURE_GESTE: Demarche = {
  id: "ecriture-geste",
  nom: "Geste d'écriture et copie",
  famille: "Français",
  source: "Pour enseigner la lecture et l'écriture au CP (guide fondamental, 2019) ; livrets Français CP et « À partir de 5 ans », Éduscol 2025",
  resume: "Le schéma type d'une séance d'écriture : la lettre présentée et tracée devant les élèves, reproduite dans l'espace, sur la table, sur l'ardoise, puis sur le cahier — et des stratégies de copie.",
  seances: [
    {
      titre: "Tracer une lettre",
      objectifs: "À la fin de cette séance, les élèves sauront tracer la lettre … et la relier aux autres, le geste mémorisé par le corps avant le cahier. Deux séances quotidiennes de 10 à 20 minutes selon la période.",
      duree: 20,
      phases: [
        ph(T1, "5 min", "Rituel de motricité fine (pianoter, toucher les doigts avec le pouce, marcher avec deux doigts). Objectif explicité et points de vigilance : « aujourd'hui, nous apprenons à bien tracer … ». Le professeur trace plusieurs fois au tableau en verbalisant chaque geste.",
          "Verbalise le geste : « on tourne comme pour le a, on remonte… »."),
        ph(T2, "8 min", "Les élèves forment la lettre à vide, dans l'espace, avec le doigt ; puis sur la table ; puis sur l'ardoise en verbalisant le geste.",
          "Guide le geste main à main si besoin ; corrige les tenues de crayon."),
        ph(T3, "7 min", "Entraînement sur le cahier, en vocalisant à voix basse ce qu'on écrit ; les élèves entourent leurs tracés les plus réussis.",
          "Vérifie l'assise, l'appui de l'avant-bras, les pieds au sol, la tenue du crayon. L'écriture n'est jamais un temps d'autonomie."),
      ],
    },
    {
      titre: "Enchaîner les lettres",
      objectifs: "À la fin de cette séance, les élèves sauront lier les lettres pour écrire des syllabes puis des mots avec fluidité, en levant le crayon le moins possible.",
      duree: 20,
      phases: [
        ph(T1, "5 min", "Rappel des lettres connues ; le professeur modélise l'enchaînement au tableau, plusieurs fois, en vocalisant les sons."),
        ph(T2, "8 min", "Enchaînements dans l'espace puis sur l'ardoise : … (syllabes, puis mots courts).",
          "Fait verbaliser où l'on lève le crayon : lettres rondes, barres du t, points, cédilles en fin de mot."),
        ph(T3, "7 min", "Écriture des syllabes et mots sur le cahier préparé, avec vocalisation ; confrontation au modèle."),
      ],
    },
    {
      titre: "Copier avec des stratégies",
      objectifs: "À la fin de cette séance, les élèves sauront copier rapidement et sans erreur une phrase déjà lue : découper en empans, repérer les difficultés, respecter la présentation.",
      duree: 20,
      phases: [
        ph(T1, "5 min", "Lecture et relecture de la phrase à copier ; repérage des difficultés graphiques et orthographiques (lettres muettes) ; le professeur modélise une manière de copier en verbalisant.",
          "Montre l'empan : on garde en mémoire un groupe de syllabes ou de mots, on écrit sans lever le crayon."),
        ph(T2, "10 min", "Copie sur le cahier ; le modèle est effacé puis placé au fond de la classe : on se retourne le moins possible (on compte les retours au modèle).",
          "Circule, consolide une stratégie enseignée."),
        ph(T3, "5 min", "Relecture ; échange des cahiers en binôme pour vérifier ; retour collectif : recours au modèle et erreurs comparés."),
      ],
    },
    {
      titre: "Gamme d'écriture ritualisée",
      objectifs: "À la fin de cette séance, les élèves sauront tracer avec plus d'aisance les lettres, les enchaînements et les mots de la semaine : le geste entretenu chaque jour.",
      duree: 10,
      phases: [
        ph("Gamme", "10 min", "Une ligne de chaque : lettre, enchaînement, mot ; on vocalise ce qu'on écrit.",
          "Reprend impérativement les tenues de crayon problématiques : crayon à trois faces, guide-doigts, lettres rugueuses si besoin."),
      ],
    },
  ],
};

const ECRITURE_REDIGER: Demarche = {
  id: "ecriture-rediger",
  nom: "Produire un écrit : planifier, mettre en texte, réviser",
  famille: "Français",
  source: "Éduscol, Français cycles 2 et 3 — « L'écriture » (2018) ; livrets Français CM1-CM2 (2025)",
  resume: "Les trois opérations de l'acte d'écriture — planification, mise en texte, révision — dans une séquence qui va de l'écrit court quotidien au projet d'écriture avec destinataire.",
  seances: [
    {
      titre: "Planifier : quel écrit, pour qui, pour quoi ?",
      objectifs: "À la fin de cette séance, les élèves sauront ce qu'ils vont écrire, pour qui et pour quoi : le but, le genre, le destinataire, ce qu'il faut dire et comment le dire.",
      duree: 30,
      phases: [
        ph("Contextualiser", "10 min", "La situation d'écriture présentée : quel écrit ? pour quoi faire ? pour qui ? Qu'est-ce que l'élève en a compris ?",
          "Ritualise cette phase : elle aide les élèves en difficulté à voir comment l'écrit s'élabore."),
        ph("Chercher ce qu'on va dire", "15 min", "Idées collectées, mots et formules notés (répertoires, textes lus) ; en dictée à l'adulte au début du cycle 2.",
          "Transcrit, fait reformuler, relit, fait valider."),
        ph("Organiser", "5 min", "Dans quel ordre ? Un plan en deux ou trois points, ou la phrase du jour décidée ensemble."),
      ],
    },
    {
      titre: "Mettre en texte",
      objectifs: "À la fin de cette séance, les élèves sauront écrire un premier jet en s'appuyant sur les outils de la classe (répertoires, affiches, textes) : de l'écriture tâtonnée à la composition.",
      duree: 30,
      phases: [
        ph("Rappel du projet", "5 min", "Ce qu'on écrit, pour qui ; les outils disponibles."),
        ph("Écriture du premier jet", "20 min", "Écriture individuelle, les outils sous les yeux ; ceux qui bloquent disent d'abord ce qu'ils veulent écrire.",
          "S'intéresse d'abord à ce que l'élève veut dire : bienveillance, pari sur des compétences en devenir."),
        ph("Lecture à un pair", "5 min", "Chacun lit son texte à un camarade : est-ce qu'on comprend ?"),
      ],
    },
    {
      titre: "Réviser et améliorer",
      objectifs: "À la fin de cette séance, les élèves sauront revenir sur leur écrit, à distance, pour l'améliorer : l'adéquation au projet d'abord, puis le point d'orthographe travaillé en classe.",
      duree: 30,
      phases: [
        ph("Révision collective", "10 min", "Un texte projeté et amélioré ensemble : ce qui manque pour comprendre, ce qui ne correspond pas au projet.",
          "Fait adopter la position du lecteur qui ne comprend pas."),
        ph("Révision en binômes", "15 min", "Avec un guide de révision élaboré collectivement ; consigne de révision ciblée sur le point orthographique travaillé.",
          "Les autres erreurs sont traitées par l'enseignant."),
        ph("Ce qu'on a amélioré", "5 min", "Avant / après lus à voix haute."),
      ],
    },
    {
      titre: "Réécrire et publier",
      objectifs: "À la fin de cette séance, les élèves sauront réécrire leur texte et le mettre au propre pour son destinataire : l'aboutissement du projet d'écriture.",
      duree: 30,
      phases: [
        ph("Réécriture", "20 min", "Prise en compte des révisions ; mise au propre, manuscrite ou tapée."),
        ph("Publication", "10 min", "Le texte donné à lire, affiché, envoyé, lu à voix haute.", "Un destinataire réel : pas le professeur."),
      ],
    },
    {
      titre: "Écrit court quotidien",
      objectifs: "À la fin de cette séance, les élèves sauront écrire chaque jour un texte court — phrase du jour, jogging d'écriture, charade, légende —, sans réécriture.",
      duree: 10,
      phases: [
        ph("Écrit court", "10 min", "Consigne variée chaque jour ; on écrit, on lit deux ou trois productions.", "Minore l'évaluation ; multiplie les contextes."),
      ],
    },
  ],
};

const ORAL: Demarche = {
  id: "oral",
  nom: "Enseigner l'oral en quatre étapes",
  famille: "Français",
  source: "Éduscol, Français cycles 2 et 3 — « Organiser l'enseignement de l'oral » (2018)",
  resume: "Production initiale enregistrée, repérage et analyse des compétences, situations d'apprentissage ciblées, production finale évaluée sur les critères construits — pour un genre d'oral : récit, exposé, débat…",
  seances: [
    {
      titre: "Production initiale",
      objectifs: "À la fin de cette séance, les élèves sauront où ils en sont dans le genre d'oral retenu (récit, exposé, débat, interview…) : une première production, enregistrée ou filmée, qui sert de point de départ.",
      duree: 30,
      phases: [
        ph("Lancement", "5 min", "Le projet d'oral présenté : ce qu'on va apprendre à faire, pour qui."),
        ph("Production initiale", "20 min", "Chaque élève (ou groupe) produit ; on enregistre, on filme.",
          "Observe et prend des notes ; évalue avec un référentiel de compétences du genre."),
        ph("Premier retour", "5 min", "Ce qui a été facile, difficile."),
      ],
    },
    {
      titre: "Repérage et analyse des compétences",
      objectifs: "À la fin de cette séance, les élèves sauront ce qui fait un bon récit, un bon exposé ou un bon débat, et en garderont une trace écrite.",
      duree: 30,
      phases: [
        ph("Écoute des productions", "10 min", "Quelques enregistrements écoutés ; référentiel de compétences en lien avec le type d'oral.",
          "Fait écouter : qu'est-ce qui aide à comprendre ? qu'est-ce qui gêne ?"),
        ph("Analyse", "15 min", "Critères dégagés avec les élèves : contenu, organisation, voix, regard, langue."),
        ph("Trace écrite", "5 min", "L'analyse écrite, mobilisée ensuite dans les rituels d'ouverture."),
      ],
    },
    {
      titre: "Situations d'apprentissage",
      objectifs: "À la fin de cette séance, les élèves sauront mieux mettre en œuvre une compétence de l'oral qu'il fallait renforcer, en sachant à quoi elle sert.",
      duree: 30,
      phases: [
        ph("Rituel d'ouverture", "5 min", "Relecture de la trace écrite : ce qu'on travaille aujourd'hui."),
        ph("Situation ciblée", "20 min", "Un exercice sur une compétence (enchaîner les étapes d'un récit, parler assez fort, regarder l'auditoire…) ; en groupes, avec retours.",
          "Fait évoluer la trace écrite de l'étape 2."),
        ph("Bilan", "5 min", "Ce qu'on a amélioré."),
      ],
    },
    {
      titre: "Situations d'apprentissage (suite)",
      objectifs: "À la fin de cette séance, les élèves sauront mettre en œuvre une deuxième compétence, et l'intégrer à une production complète.",
      duree: 30,
      phases: [
        ph("Rituel d'ouverture", "5 min", "Relecture de la trace écrite."),
        ph("Situation ciblée", "20 min", "Une autre compétence travaillée, puis une production complète d'entraînement."),
        ph("Bilan", "5 min", "Ce qu'il reste à améliorer avant la production finale."),
      ],
    },
    {
      titre: "Production finale",
      objectifs: "À la fin de cette séance, les élèves sauront mesurer leurs progrès avec les critères de réussite de la trace écrite, commenter leur production et observer celles des autres.",
      duree: 30,
      phases: [
        ph("Production finale", "20 min", "Chacun produit à nouveau, enregistré.", "Évalue avec les critères construits ; compare avec la production initiale."),
        ph("Commentaires", "10 min", "Les élèves commentent leurs productions et observent celles des pairs."),
      ],
    },
  ],
};

const VOCABULAIRE: Demarche = {
  id: "vocabulaire",
  nom: "Vocabulaire : rencontrer, structurer, réactiver",
  famille: "Français",
  source: "Livrets Français CP (2025), CE1 (2026) et « À partir de 5 ans » (2025), Éduscol ; Pour enseigner le vocabulaire à l'école maternelle (guide fondamental, 2019)",
  resume: "Trois étapes : apporter en contexte des mots nouveaux, structurer le lexique par la catégorisation, réactiver les mots dans des activités orales et écrites qui permettent la mémorisation.",
  seances: [
    {
      titre: "Étape 1 — rencontrer les mots en contexte",
      objectifs: "À la fin de cette séance, les élèves sauront comprendre et employer les mots rencontrés en contexte (littérature, projet de classe, autre discipline). Corpus visé : … (les mots à acquérir par tous en gras).",
      duree: 20,
      phases: [
        ph("Rencontre", "15 min", "Au fil de la lecture ou de l'activité, les mots sont entendus, employés, expliqués en situation.",
          "Anticipe les mots qu'il veut faire comprendre et utiliser ; verbalise, reformule."),
        ph("Collecte", "5 min", "Prise de notes par le professeur en vue des outils individuels ou collectifs (affiche, boîte à mots)."),
      ],
    },
    {
      titre: "Étape 2 — catégoriser",
      objectifs: "À la fin de cette séance, les élèves sauront regrouper, classer et trier les mots collectés selon le sens (familles, contraires, synonymes) ou la forme, et justifier leurs choix.",
      duree: 60,
      phases: [
        ph("Temps 1 – Mise en réussite", "15 min", "Rappel de ce qu'on étudie en vocabulaire (« je réfléchis au sens des mots, j'observe comment ils sont fabriqués »). Quinze mots affichés sur étiquettes ; un élève amorce une catégorisation et justifie ; la classe valide.",
          "Des mots 100 % déchiffrables, sinon illustrés. Justifie pourquoi il valide ou non."),
        ph("Temps 2 – Activité différenciée", "20 min", "Par trinômes, une enveloppe du même jeu d'étiquettes : se mettre d'accord sur une catégorisation, être capable de la justifier.",
          "Groupes selon le degré d'acquisition ; quantité de mots adaptée ; images pour les non-décodeurs."),
        ph("Temps 3 – Institutionnalisation", "20 min", "Productions affichées et comparées ; débat pour un classement commun ; le professeur verbalise : « courir, course, coureur sont de la même famille… ». Trace écrite.",
          "Si les élèves sont fatigués, diffère le temps 3 à une séance proche."),
      ],
    },
    {
      titre: "Étape 2 — institutionnaliser et enrichir",
      objectifs: "À la fin de cette séance, les élèves sauront relier les mots en réseaux de sens et de forme, et en ajouter de nouveaux à leur outil de référence, individuel ou collectif.",
      duree: 30,
      phases: [
        ph("Rappel", "5 min", "Les catégories retenues relues."),
        ph("Enrichir", "15 min", "Nouveaux mots ajoutés aux catégories (dérivés, contraires, synonymes) ; corolle lexicale ou affiche complétée."),
        ph("Outil individuel", "10 min", "Chaque élève complète son cahier de mots : mot, catégorie, phrase, dessin."),
      ],
    },
    {
      titre: "Étape 3 — réactiver par le jeu",
      objectifs: "À la fin de cette séance, les élèves sauront retrouver et employer les mots du corpus en jouant. La mémorisation passe par un apprentissage répété à intervalles réguliers.",
      duree: 15,
      phases: [
        ph("Jeu", "15 min", "Loto, memory, mime, devinettes, « quart d'heure des mots » ; les mots prononcés dans un contexte pertinent.",
          "Emploie intentionnellement les mots dans la vie de la classe ; y revient à quelques jours puis à quelques semaines."),
      ],
    },
    {
      titre: "Étape 3 — réinvestir à l'oral et à l'écrit",
      objectifs: "À la fin de cette séance, les élèves sauront employer les mots du corpus à l'oral puis à l'écrit : légender une image, écrire une phrase, raconter.",
      duree: 30,
      phases: [
        ph("À l'oral", "10 min", "Raconter, décrire avec les mots du corpus ; reformuler une histoire lue avec ses mots."),
        ph("À l'écrit", "15 min", "Écrire une phrase, légender une photographie, compléter un texte à trous."),
        ph("Évaluation", "5 min", "Grille : mots compris, mots employés à l'oral, à l'écrit."),
      ],
    },
  ],
};

const GRAMMAIRE: Demarche = {
  id: "grammaire",
  nom: "Leçon de grammaire : observer, manipuler, structurer, automatiser",
  famille: "Français",
  source: "Éduscol, « Principes généraux pour l'étude de la langue » (2018) ; La grammaire du français du CP à la 6e (guide fondamental, 2022)",
  resume: "Chercher, manipuler, comparer et observer un corpus ; formuler la régularité et la structurer ; s'entraîner et automatiser par des activités courtes et régulières ; consolider en groupes de besoin ; transférer en écriture.",
  seances: [
    {
      titre: "Observer et trier un corpus",
      objectifs: "À la fin de cette séance, les élèves sauront classer et trier des éléments choisis pour le fait de langue étudié (…), en justifiant, pour en comprendre le fonctionnement.",
      duree: 45,
      phases: [
        ph(T1, "5 min", "Objectif annoncé ; corpus de phrases ou de groupes de mots, prototypiques, adaptés à ce que la grammaire scolaire peut analyser.",
          "Étoffe le corpus en fonction du fait de langue à observer : les régularités doivent sauter aux yeux."),
        ph(T2, "20 min", "Tri et classement en groupes, avec justification : « c'est comme… ».",
          "Fait dire les critères ; accepte les classements à condition qu'ils soient justifiés."),
        ph(T3, "15 min", "Mise en commun ; la régularité dégagée et formulée avec le métalangage de la terminologie officielle."),
        ph(T4, "5 min", "Un élément nouveau à classer."),
      ],
    },
    {
      titre: "Manipuler pour vérifier",
      objectifs: "À la fin de cette séance, les élèves sauront identifier et vérifier en manipulant : comparer, remplacer, déplacer, supprimer, ajouter.",
      duree: 30,
      phases: [
        ph("Rappel", "5 min", "La régularité relue ; les manipulations connues."),
        ph("Manipulations", "20 min", "Sur des phrases : remplacer, déplacer, supprimer, ajouter — que se passe-t-il ? La propriété observée.",
          "Fait raisonner à voix haute : « si je remplace… alors… »."),
        ph("Critères retenus", "5 min", "Les critères de manipulation notés : ce qui permet de reconnaître …"),
      ],
    },
    {
      titre: "Structurer : la leçon",
      objectifs: "À la fin de cette séance, les élèves sauront énoncer la leçon construite ensemble, avec des exemples types et les manipulations qui permettent de vérifier.",
      duree: 30,
      phases: [
        ph("Formulation", "10 min", "Ce qu'il faut retenir, dit par les élèves puis écrit.",
          "Se tient aux cas prototypiques ; écarte les cas complexes hors de portée de la grammaire scolaire."),
        ph("Trace écrite", "15 min", "Règle, exemples, manipulation de vérification ; outil de référence (mémo)."),
        ph("Un cas", "5 min", "Application immédiate sur un exemple."),
      ],
    },
    {
      titre: "S'entraîner et automatiser",
      objectifs: "À la fin de cette séance, les élèves sauront appliquer la notion plus sûrement : écrire sous la dictée, analyser des graphies, argumenter.",
      duree: 20,
      phases: [
        ph("Rituel", "15 min", "Dictée courte (une phrase) ; analyse des graphies, erronées ou non ; solutions alternatives plausibles argumentées avec le métalangage.",
          "Donne sa place au raisonnement en toute occasion."),
        ph("Retour", "5 min", "Ce qui a été réussi ; la règle relue."),
      ],
    },
    {
      titre: "Consolider en groupes de besoin",
      objectifs: "À la fin de cette séance, les élèves sauront appliquer la notion là où ils hésitaient encore, en groupe restreint.",
      duree: 20,
      phases: [
        ph("Groupe de besoin", "20 min", "Reprise avec matériel (étiquettes, phrases à manipuler) pour ceux qui hésitent ; exercices plus ouverts pour les autres."),
      ],
    },
    {
      titre: "Transférer en écriture",
      objectifs: "À la fin de cette séance, les élèves sauront mobiliser la notion à bon escient quand ils écrivent seuls, avec une vigilance orthographique sur le point travaillé.",
      duree: 30,
      phases: [
        ph("Écrire", "15 min", "Production courte où la notion est nécessaire."),
        ph("Relire avec vigilance", "10 min", "Repérer dans son texte les cas concernés, vérifier par la manipulation apprise.",
          "Apprend à faire preuve de vigilance orthographique, quotidiennement."),
        ph("Bilan", "5 min", "Ce que la leçon a permis de corriger."),
      ],
    },
  ],
};

// ── Mathématiques ─────────────────────────────────────────────────────────

const PROBLEMES: Demarche = {
  id: "problemes",
  nom: "Résolution de problèmes : comprendre, modéliser, calculer, répondre",
  famille: "Mathématiques",
  source: "La résolution de problèmes mathématiques au cours moyen (guide fondamental, 2021) ; livrets Mathématiques CP-CE2 et « Résolution de problèmes », Éduscol 2025",
  resume: "Un enseignement structuré : des problèmes de référence résolus en quatre phases, le schéma en barres pour modéliser, l'institutionnalisation par des problèmes types résolus, et des problèmes presque chaque jour.",
  seances: [
    {
      titre: "Problème de référence — les quatre phases",
      objectifs: "À la fin de cette séance, les élèves sauront résoudre un problème de … (parties-tout, comparaison, …) en quatre phases : comprendre, modéliser, calculer, répondre.",
      duree: 45,
      phases: [
        ph(T1, "10 min", "Rappel d'un problème résolu de la même catégorie ; objectif annoncé. Lecture du problème ; comprendre : raconter l'histoire avec ses mots, ce qu'on sait, ce qu'on cherche.",
          "Fait reformuler l'histoire avant tout calcul ; matériel pour ceux qui en ont besoin."),
        ph(T2, "20 min", "Modéliser : un schéma en barres qui relie les données et ce qui est cherché ; calculer (calcul mental ou posé) ; répondre : une phrase, et la vraisemblance du résultat.",
          "Un temps individuel d'appropriation avant tout échange ; puis mise en commun des procédures."),
        ph(T3, "10 min", "Institutionnalisation : le problème type résolu, avec son schéma et son calcul, copié dans le cahier de leçons.",
          "Construit la trace avec la classe, à partir d'une production d'élève projetée."),
        ph(T4, "5 min", "Un problème analogue, seul."),
      ],
    },
    {
      titre: "Entraînement — problèmes analogues",
      objectifs: "À la fin de cette séance, les élèves sauront reconnaître, dans un nouveau problème, un problème déjà résolu ; matériel et schémas pour qui en a besoin.",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Relecture du problème type du cahier de leçons."),
        ph(T2, "20 min", "Trois ou quatre problèmes de la même catégorie, données variées (texte, nombres) ; en individuel puis à deux.",
          "Différencie sur trois curseurs : la structure du problème, le texte de l'énoncé, le champ numérique."),
        ph(T3, "5 min", "Mise en commun d'une erreur : comprendre ou modéliser ?"),
      ],
    },
    {
      titre: "Séance courte — procédé La Martinière",
      objectifs: "À la fin de cette séance, les élèves sauront répondre rapidement à des problèmes simples : huit problèmes en une vingtaine de minutes, réponse sur l'ardoise, correction immédiate.",
      duree: 20,
      phases: [
        ph("Problèmes rapides", "20 min", "Chaque problème lu deux fois ; réflexion ; réponse à l'ardoise au signal ; correction et justification immédiates.",
          "Une dizaine de problèmes par semaine au minimum."),
      ],
    },
    {
      titre: "Problèmes en deux étapes",
      objectifs: "À la fin de cette séance, les élèves sauront planifier les étapes d'une résolution, et dire ce que représente chaque résultat intermédiaire.",
      duree: 45,
      phases: [
        ph(T1, "10 min", "Un problème en deux étapes présenté : lire, identifier la question, analyser les données — pas de « mot-clé »."),
        ph(T2, "20 min", "Un schéma par étape ; résultats intermédiaires nommés ; résolution.", "Limite les raisonnements superficiels fondés sur des mots-clés."),
        ph(T3, "10 min", "Trace : la démarche en deux étapes."),
        ph(T4, "5 min", "Un problème seul."),
      ],
    },
    {
      titre: "Créer des problèmes",
      objectifs: "À la fin de cette séance, les élèves sauront écrire un problème en respectant des contraintes : un autre regard sur la question et sur l'intention de l'auteur.",
      duree: 30,
      phases: [
        ph("Contraintes", "5 min", "Catégorie imposée, nombres imposés, ou un schéma donné."),
        ph("Écriture", "15 min", "Écrire l'histoire et la question ; le résoudre."),
        ph("Échange", "10 min", "Problèmes échangés et résolus par un camarade."),
      ],
    },
    {
      titre: "Évaluation",
      objectifs: "À la fin de cette séance, les élèves sauront où ils en sont dans chaque phase de la résolution, sur trois ou quatre problèmes de la séquence.",
      duree: 20,
      phases: [
        ph("Évaluation", "15 min", "Problèmes à résoudre seul, schéma attendu."),
        ph("Retour", "5 min", "Analyse des productions : la phase qui bloque."),
      ],
    },
  ],
};

// Le plan de séquence des guides Éduscol : « Pour enseigner les nombres, le
// calcul et la résolution de problèmes au CP », focus « Une séquence de
// calcul » — une pratique quotidienne d'au moins quinze minutes, des séances
// courtes qui alternent avec des longues ; une séance longue en trois temps,
// échauffement, entraînement (dont le procédé La Martinière), recherche ; une
// courte, les deux premiers. « Le calcul en ligne au cycle 3 » nomme les
// quatre étapes : découverte jusqu'à la trace écrite, appropriation et
// entraînement, réinvestissement, évaluation — où chacun voit ses progrès.
const CALCUL_MENTAL: Demarche = {
  id: "calcul-mental-martiniere",
  nom: "Calcul mental : procédé La Martinière",
  famille: "Mathématiques",
  source: "Éduscol, « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (focus « Une séquence de calcul ») et « Le calcul en ligne au cycle 3 » ; programmes de mathématiques 2024-2025",
  resume: "Un fait numérique ou une procédure à la fois, en quatre étapes : la découverte, en séance longue, jusqu'à la trace écrite ; l'appropriation puis l'entraînement en séances courtes et quotidiennes, au procédé La Martinière — énoncé deux fois, réflexion sans écrire, « Écrivez ! », « Montrez ! », correction — ; le réinvestissement dans de petits problèmes ; l'évaluation par la fluence, où chacun voit ses progrès. Chaque séance s'ouvre sur un échauffement que tous réussissent.",
  seances: [
    {
      titre: "Découverte — séance longue",
      objectifs: "À la fin de cette séance, les élèves sauront trouver le fait ou appliquer la procédure visés : ils les auront cherchés, auront comparé les démarches, retenu la plus sûre et la plus rapide, et l'auront écrite.",
      duree: 45,
      phases: [
        ph("Échauffement", "5 min", "Une activité très courte qui réactive un fait déjà su — un furet, trois calculs à l'ardoise — : tous réussissent."),
        ph("Entraînement", "10 min", "Au procédé La Martinière, les faits sur lesquels s'appuie la procédure du jour (pour les presque-doubles : les doubles)."),
        ph("Recherche", "20 min", "Un calcul à chercher seul, d'abord avec le matériel — cubes, boîte de dix, bande numérique, quadrillage… — en disant ce qu'on fait, puis sans, l'écrit permis sur le cahier de recherche ; mise en commun : chacun montre et dit sa démarche, juste ou non ; on compare les procédures et on les hiérarchise — la plus sûre, la plus rapide, et quand elle marche.",
          "Écrit ce que dit l'élève sans l'interpréter ; cherche avec la classe la cause des erreurs."),
        ph("Trace écrite", "10 min", "La procédure retenue, son domaine d'efficacité et un exemple, écrits juste : cahier de leçons ou affiche de la classe."),
      ],
    },
    {
      titre: "Appropriation — La Martinière (1)",
      objectifs: "À la fin de cette séance, les élèves sauront donner le fait ou appliquer la procédure à l'oral, en disant comment ils calculent.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Les faits d'appui de la procédure, révisés à l'ardoise."),
        ph("Série La Martinière", "10 min", "Dix calculs. Chacun est dit deux fois ; réflexion sans écrire, cinq secondes ; « Écrivez ! » — la réponse, rien d'autre ; « Montrez ! » — les ardoises se lèvent ensemble ; la réponse est dite, on corrige, on passe au suivant.",
          "Fait expliciter une procédure toutes les trois ou quatre questions ; note les erreurs qui reviennent."),
      ],
    },
    {
      titre: "Entraînement — La Martinière (2)",
      objectifs: "À la fin de cette séance, les élèves sauront retrouver le fait ou la procédure sous d'autres formes : égalités à trou, nombres plus grands, énoncés en mots.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Trois calculs de la veille."),
        ph("Série La Martinière", "10 min", "Une nouvelle série, variée : égalités à trou, nombres plus grands.",
          "Différencie par le temps de réflexion ou la difficulté des calculs ; le matériel reste sous la main de qui en a besoin."),
      ],
    },
    {
      titre: "Automatisation — La Martinière (3)",
      objectifs: "À la fin de cette séance, les élèves sauront répondre vite et juste : le fait ou la procédure leur seront devenus automatiques.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Un fait voisin, en furet ou à l'ardoise."),
        ph("Série La Martinière", "10 min", "Une série au temps de réflexion raccourci ; chacun note son score.",
          "Les plus à l'aise calculent sans écrire les étapes : l'automatisation n'est pas visée au même moment pour tous."),
      ],
    },
    {
      titre: "Réinvestissement — petits problèmes",
      objectifs: "À la fin de cette séance, les élèves sauront utiliser le fait ou la procédure dans un autre contexte : de petits problèmes, un jeu.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "La fluence du jour : une série courte, écrite, en temps limité."),
        ph("Problèmes", "10 min", "Deux ou trois petits problèmes qui appellent la procédure, à l'ardoise ; ou un jeu par deux — cartes de calcul, le compte est bon."),
      ],
    },
    {
      titre: "Évaluation finale",
      objectifs: "À la fin de cette séance, les élèves sauront ce qu'ils ont acquis et verront leurs progrès : la fluence en temps limité, l'attendu de fin d'année en tête ; des calculs sans limite de temps ; une procédure expliquée ; un problème.",
      duree: 20,
      phases: [
        ph("Évaluation", "12 min", "Seul : d'abord la partie en temps limité, puis les calculs, l'explication et le problème, sans limite de temps."),
        ph("Correction", "5 min", "Corrigé projeté ; chacun compte ses réussites et reporte son score de fluence sur sa fiche de suivi."),
        ph("Suite", "3 min", "Le bilan : acquis, en cours d'acquisition, à reprendre ; le fait reviendra plus tard dans des séries de révision, pour s'ancrer."),
      ],
    },
  ],
};

const GEOMETRIE_GRANDEURS: Demarche = {
  id: "geometrie-grandeurs",
  nom: "Manipuler, construire, institutionnaliser",
  famille: "Mathématiques",
  source: "Éduscol, « Grandeurs et mesures au cycle 2 » et « Espace et géométrie au cycle 3 » (2016)",
  resume: "Des situations concrètes, la manipulation d'objets réels et d'instruments, des constructions et des écrits intermédiaires, puis l'institutionnalisation — un écrit de savoir qu'on réutilise — et des problèmes de la vie courante.",
  seances: [
    {
      titre: "Manipuler et comparer",
      objectifs: "À la fin de cette séance, les élèves sauront comparer directement, trier et décrire avec leurs mots la grandeur ou l'objet géométrique, en manipulant des objets réels.",
      duree: 45,
      phases: [
        ph(T1, "5 min", "Situation concrète empruntée à la vie courante : … Objectif annoncé."),
        ph(T2, "25 min", "Manipulation : comparer (soupeser, transvaser, superposer, juxtaposer bout à bout), trier, ranger ; verbalisation.",
          "La manipulation est un échafaudage, pas une fin : fait dire ce qu'on fait et pourquoi."),
        ph(T3, "10 min", "Mise en commun : le vocabulaire spécifique introduit en situation."),
        ph(T4, "5 min", "Une comparaison de plus."),
      ],
    },
    {
      titre: "Construire et représenter",
      objectifs: "À la fin de cette séance, les élèves sauront tracer, construire, reproduire avec les instruments (règle, équerre, compas, gabarit), ou mesurer avec l'unité et l'instrument.",
      duree: 45,
      phases: [
        ph(T1, "5 min", "Rappel ; la tâche de construction ou de mesure : …"),
        ph(T2, "25 min", "Construction ou mesure individuelle ; description écrite ou schéma ; comparaison des résultats.",
          "La manipulation physique des instruments contribue à la compréhension : ne la remplace pas trop tôt."),
        ph(T3, "10 min", "Ce qui a permis de réussir : les gestes, les vérifications."),
        ph(T4, "5 min", "Une construction de plus."),
      ],
    },
    {
      titre: "Institutionnaliser",
      objectifs: "À la fin de cette séance, les élèves sauront la définition, la propriété ou la référence à retenir (un litre, c'est la brique de lait ; un kilogramme, c'est …) : l'écrit de savoir vient après les constructions.",
      duree: 30,
      phases: [
        ph("Formulation", "10 min", "Ce qu'on a établi, dit par les élèves.", "Figures non prototypiques dans la trace : le carré n'est pas toujours posé sur un côté."),
        ph("Trace écrite et affichage", "15 min", "Définition ou propriété ; références concrètes ; affichage fonctionnel avec les objets réels."),
        ph("Réutiliser", "5 min", "La trace utilisée pour répondre à une question."),
      ],
    },
    {
      titre: "Réinvestir dans des problèmes",
      objectifs: "À la fin de cette séance, les élèves sauront résoudre des problèmes de grandeurs ou de figures : chercher, modéliser, représenter, raisonner, calculer, communiquer.",
      duree: 45,
      phases: [
        ph(T1, "5 min", "Un problème de la vie courante : …"),
        ph(T2, "25 min", "Résolution individuelle puis en groupes ; représentation de la situation.",
          "Lit les productions avec les six compétences : l'élève a-t-il raisonné ? modélisé ?"),
        ph(T3, "10 min", "Mise en commun des démarches."),
        ph(T4, "5 min", "Un problème court."),
      ],
    },
    {
      titre: "Automatiser",
      objectifs: "À la fin de cette séance, les élèves sauront reconnaître, nommer, estimer, convertir et tracer plus vite, en gammes courtes et régulières.",
      duree: 15,
      phases: [
        ph("Gamme", "15 min", "Rituel : estimer une longueur, reconnaître une figure, lire une mesure."),
      ],
    },
  ],
};

// ── Sciences, histoire-géographie, EMC ────────────────────────────────────

const INVESTIGATION: Demarche = {
  id: "investigation",
  nom: "Démarche d'investigation",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, Questionner le monde — « Repères pour la mise en œuvre d'une séquence » (2016) ; Sciences et technologie cycle 3",
  resume: "Cinq moments essentiels : la situation de départ et le questionnement, les hypothèses et la conception de l'investigation, l'investigation conduite par les élèves, l'acquisition et la structuration des connaissances, la communication.",
  seances: [
    {
      titre: "Situation de départ et questionnement",
      objectifs: "À la fin de cette séance, les élèves sauront formuler la question à étudier, après avoir exprimé et confronté leurs conceptions initiales.",
      duree: 45,
      phases: [
        ph("Situation de départ", "15 min", "Phénomène, objet, document, sortie : … Réactions, premières questions.",
          "Choisit la situation pour son caractère productif et son lien avec le programme."),
        ph("Formulation du questionnement", "20 min", "Les questions reformulées pour s'assurer de leur sens, recentrées sur le champ scientifique ; conceptions initiales notées (dessins, phrases).",
          "Guide sans occulter les conceptions initiales ; choisit la question productive et le justifie."),
        ph("Question retenue", "10 min", "La question de la séquence écrite au cahier d'expériences."),
      ],
    },
    {
      titre: "Hypothèses et conception de l'investigation",
      objectifs: "À la fin de cette séance, les élèves sauront formuler des hypothèses, et concevoir ce qui permettra de les valider ou de les invalider.",
      duree: 45,
      phases: [
        ph("Hypothèses en groupes", "15 min", "Formulation orale puis écrite : « que va-t-il se passer selon moi ? pour quelles raisons ? ».",
          "Gère les groupements ; consignes sur les rôles dans le groupe."),
        ph("Protocole", "20 min", "Élaboration des protocoles (expérience, construction, observation, recherche documentaire) : textes et schémas.",
          "Fait préciser ce qu'on garde et ce qu'on fait varier."),
        ph("Mise en commun", "10 min", "Les protocoles comparés ; matériel listé."),
      ],
    },
    {
      titre: "Investigation",
      objectifs: "À la fin de cette séance, les élèves sauront mener l'investigation qu'ils ont conçue : expérimentation, réalisation matérielle, observation, recherche documentaire ou enquête.",
      duree: 45,
      phases: [
        ph("Rappel", "5 min", "Hypothèses et protocoles relus."),
        ph("Investigation", "30 min", "Par groupes : débat interne sur la mise en œuvre, contrôle des paramètres, description (schémas, écrits), conditions relevées pour reproduire.",
          "Circule ; fait noter les traces personnelles au cahier d'expériences."),
        ph("Premiers résultats", "10 min", "Résultats notés, comparés avec les prévisions."),
      ],
    },
    {
      titre: "Structuration des connaissances",
      objectifs: "À la fin de cette séance, les élèves sauront formuler les connaissances nouvelles, après avoir comparé les résultats des groupes et les avoir confrontés au savoir établi.",
      duree: 45,
      phases: [
        ph("Comparaison des résultats", "15 min", "Résultats des groupes mis en relation ; causes d'un éventuel désaccord ; expériences complémentaires proposées."),
        ph("Confrontation au savoir établi", "15 min", "Documents, à des niveaux de formulation accessibles.", "Fait distinguer ce qu'on a observé et ce qu'on sait maintenant."),
        ph("Formulation écrite", "15 min", "Les connaissances nouvelles écrites par les élèves avec l'aide du maître ; trace au cahier."),
      ],
    },
    {
      titre: "Communication",
      objectifs: "À la fin de cette séance, les élèves sauront communiquer leur résultat dans une production : texte, graphique, maquette, document multimédia.",
      duree: 30,
      phases: [
        ph("Production", "20 min", "Par groupes, une production pour une autre classe, les familles, l'affichage."),
        ph("Présentation", "10 min", "Présentation orale ; questions."),
      ],
    },
  ],
};

const ENQUETE_HISTOIRE_GEO: Demarche = {
  id: "enquete-histoire-geo",
  nom: "Enquête en histoire-géographie",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, Histoire-géographie cycle 3 — « Raisonner, justifier une démarche » (2017) et « S'approprier les thèmes du programme » (2016)",
  resume: "Mettre les élèves en situation d'enquête : questionnement et hypothèses, analyse des documents et des traces, élaboration de l'explication — avec le récit de l'enseignant, la frise et la carte.",
  seances: [
    {
      titre: "Questionnement et hypothèses",
      objectifs: "À la fin de cette séance, les élèves sauront poser la question de la séquence, et proposer des réponses à partir de ce qu'ils connaissent.",
      duree: 45,
      phases: [
        ph("Situation initiale", "10 min", "Document d'accroche, trace, lieu, objet : … La question de la séquence.",
          "Part d'un exemple proche des élèves quand c'est possible."),
        ph("Représentations et hypothèses", "25 min", "Ce qu'on croit savoir ; hypothèses formulées et enrichies avec des ressources proposées.",
          "Les réponses restent des hypothèses tant qu'elles n'ont pas été discutées et amendées par le groupe."),
        ph("Fil directeur", "10 min", "Les hypothèses notées ; ce qu'il faudra vérifier."),
      ],
    },
    {
      titre: "Analyse des documents",
      objectifs: "À la fin de cette séance, les élèves sauront prélever des informations dans des documents, des traces, une étude de cas, pour vérifier leurs hypothèses.",
      duree: 45,
      phases: [
        ph("Documents", "10 min", "Corpus présenté : nature, auteur, date, lieu."),
        ph("Étude en groupes", "25 min", "Lecture guidée ; données triées et hiérarchisées ; ce qui confirme ou infirme les hypothèses.",
          "Introduit la démarche de questionnement sur les documents : qui, quand, pour qui, pourquoi."),
        ph("Mise en commun", "10 min", "Les faits établis ; ce qui reste incertain."),
      ],
    },
    {
      titre: "Récit et mise en perspective",
      objectifs: "À la fin de cette séance, les élèves sauront replacer l'exemple étudié dans son contexte, sur la frise chronologique et sur la carte.",
      duree: 30,
      phases: [
        ph("Récit", "15 min", "Récit historique ou description géographique par l'enseignant.", "Distingue l'histoire de la fiction ; nomme les acteurs."),
        ph("Repères", "15 min", "Frise, carte de la région et carte de France complétées ; changement d'échelle."),
      ],
    },
    {
      titre: "Élaboration de l'explication",
      objectifs: "À la fin de cette séance, les élèves sauront rassembler les faits établis sous une forme choisie : texte, croquis, chronologie, schéma fléché.",
      duree: 30,
      phases: [
        ph("Explication", "20 min", "Trace écrite élaborée avec les élèves, en réponse à la question de la séquence.", "Fait justifier chaque étape de la démarche."),
        ph("Relecture", "10 min", "Vocabulaire et repères à retenir."),
      ],
    },
    {
      titre: "Évaluation",
      objectifs: "À la fin de cette séance, les élèves sauront répondre à une question proche en justifiant leur démarche à partir d'un document.",
      duree: 20,
      phases: [
        ph("Évaluation", "20 min", "Un document nouveau ; une question ; la réponse justifiée."),
      ],
    },
  ],
};

const EMC_DEBAT: Demarche = {
  id: "emc-debat",
  nom: "Débat réglé et dilemme moral",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, Ressources EMC — « Le débat (réglé ou argumenté) » et « Les dilemmes moraux » (2015)",
  resume: "Le débat s'insère dans une séquence : choix de la question, recherche et élaboration de l'argumentaire, débat avec des rôles et des règles, bilan réflexif — et le dilemme moral en six étapes.",
  seances: [
    {
      titre: "Choix de la question et lancement",
      objectifs: "À la fin de cette séance, les élèves sauront formuler une question qui fait débat, entre des positions également défendables.",
      duree: 30,
      phases: [
        ph("Émergence", "15 min", "Document d'accroche, représentations, fait de vie scolaire ou d'actualité ; premier débat non préparé pour identifier la question.",
          "Écarte une question trop passionnelle : la mise à distance est nécessaire."),
        ph("Question retenue", "10 min", "La question formulée ; ce qu'il faudra savoir pour en débattre."),
        ph("Règles", "5 min", "Règles de prise de parole co-élaborées avec les élèves."),
      ],
    },
    {
      titre: "Recherche et argumentaire",
      objectifs: "À la fin de cette séance, les élèves sauront distinguer leur position, les arguments qui l'étayent et les exemples, et anticiper les contre-arguments.",
      duree: 45,
      phases: [
        ph("Recherche", "20 min", "Documents, entretiens, rencontres ; corpus exploité."),
        ph("Argumentaire", "20 min", "Position, arguments, exemples ; contre-arguments et réponses.", "Apprentissage explicite : distingue l'argument de l'exemple."),
        ph("Préparation", "5 min", "Rôles distribués : modérateur, secrétaire, évaluateurs."),
      ],
    },
    {
      titre: "Le débat",
      objectifs: "À la fin de cette séance, les élèves sauront exprimer leur point de vue dans un échange réglé, écouter, comprendre celui des autres et chercher à convaincre en argumentant.",
      duree: 45,
      phases: [
        ph("Ouverture", "5 min", "Le modérateur pose et problématise la question ; rappel des règles ; disposition en U ou en cercle."),
        ph("Débat", "30 min", "Prises de parole distribuées et régulées ; le secrétaire consigne les arguments ; les évaluateurs observent.",
          "S'exprime le moins possible ; observe les compétences ; signale tout argument non recevable du point de vue des valeurs."),
        ph("Clôture", "10 min", "Le modérateur clôt ; réponse commune si possible."),
      ],
    },
    {
      titre: "Dilemme moral",
      objectifs: "À la fin de cette séance, les élèves sauront choisir ce que devrait faire le personnage d'un dilemme — « que devrait faire … ? » — et justifier leur choix.",
      duree: 45,
      phases: [
        ph("Présentation du contexte", "5 min", "Supports : texte, extrait de journal, de film, image."),
        ph("Découverte du dilemme", "5 min", "Court texte lu ; vérification de la compréhension par tous."),
        ph("Ouverture de la discussion", "10 min", "Question lue au groupe ; réponse en sous-groupes, orale ou écrite."),
        ph("Débat", "20 min", "Les élèves présentent et confrontent leurs points de vue en argumentant ; accès à d'autres types de raisonnement que le leur.",
          "Fait expliciter les raisons du choix ; aide à penser et ne pense pas à la place de l'élève."),
        ph("Élargissement", "5 min", "Le problème sous d'autres angles, avec des circonstances nouvelles qui modifient l'histoire."),
      ],
    },
    {
      titre: "Bilan réflexif",
      objectifs: "À la fin de cette séance, les élèves sauront dire ce qu'ils ont appris, en confrontant leur auto-évaluation aux retours des évaluateurs et du groupe.",
      duree: 20,
      phases: [
        ph("Auto-évaluation", "5 min", "Chacun : ce que j'ai fait, ce que j'ai compris de l'autre."),
        ph("Retours", "10 min", "Retours des évaluateurs, bilan collectif constructif."),
        ph("Institutionnalisation", "5 min", "Les notions et valeurs en jeu, écrites."),
      ],
    },
  ],
};

// ── Arts, langues vivantes ────────────────────────────────────────────────

const ARTS_PLASTIQUES: Demarche = {
  id: "arts-plastiques",
  nom: "Arts plastiques : incitation, pratique, verbalisation",
  famille: "Arts, EPS et langues",
  source: "Éduscol, « Concevoir et mettre en œuvre une séquence d'enseignement en arts plastiques aux cycles 2 et 3 » (2016)",
  resume: "Trois invariants : des incitations de diverses natures, des approches et des modalités de travail variées, des acquisitions techniques, notionnelles et culturelles — d'une pratique intuitive à un projet personnel, mis en mots et confronté aux œuvres.",
  seances: [
    {
      titre: "Incitation et pratique exploratoire",
      objectifs: "À la fin de cette séance, les élèves sauront explorer la question travaillée dans une première pratique intuitive, à partir d'une incitation : …",
      duree: 45,
      phases: [
        ph("Incitation", "5 min", "Proposition donnée ; matériaux et outils à disposition.", "Installe une ambiance propice à la recherche ; ne montre pas de modèle à reproduire."),
        ph("Pratique exploratoire", "30 min", "Chacun explore, expérimente, essaie ; micro-projet personnel.", "Observe, relance par une question, n'intervient pas sur la production."),
        ph("Premiers mots", "10 min", "Productions regardées ensemble : ce qu'on a fait, comment."),
      ],
    },
    {
      titre: "Verbalisation et références",
      objectifs: "À la fin de cette séance, les élèves sauront mettre en mots leur pratique (éléments du langage plastique), et rapprocher les productions des autres et des œuvres d'artistes de la question travaillée.",
      duree: 30,
      phases: [
        ph("Verbalisation", "15 min", "Ce que j'ai fait, ce que j'ai cherché, ce que je vois chez les autres ; vocabulaire introduit.",
          "Par la verbalisation et ses questions, fait prendre conscience des objectifs d'apprentissage."),
        ph("Références artistiques", "15 min", "Deux ou trois œuvres qui ont travaillé la même question ; ce qu'elles ont choisi.",
          "Met en relation la pratique des élèves et celle des artistes, sans hiérarchie."),
      ],
    },
    {
      titre: "Pratique réfléchie : projet personnel",
      objectifs: "À la fin de cette séance, les élèves sauront développer une intention et y répondre, par des choix (matériaux, formats, gestes) et des techniques à son service.",
      duree: 45,
      phases: [
        ph("Intention", "5 min", "Chacun dit ce qu'il veut faire, à partir de la séance précédente."),
        ph("Réalisation", "30 min", "Projet mené ; technique apportée quand elle sert l'intention.", "Aide à tenir l'intention ; apporte la technique à ce moment-là."),
        ph("Regard", "10 min", "Où en est-on ? Ce qu'il reste à faire."),
      ],
    },
    {
      titre: "Finalisation et exposition",
      objectifs: "À la fin de cette séance, les élèves sauront présenter leur production, regarder celles des autres et échanger : la diversité des réponses possibles à la question.",
      duree: 30,
      phases: [
        ph("Finalisation", "10 min", "Derniers choix ; un titre."),
        ph("Exposition", "15 min", "Productions accrochées ; chacun présente la sienne ; échanges.", "Fait dire la diversité des réponses ; trace de la question travaillée."),
        ph("Trace", "5 min", "Photo, mots, référence dans le cahier d'arts."),
      ],
    },
  ],
};

const MUSIQUE: Demarche = {
  id: "musique",
  nom: "Éducation musicale : écouter, chanter, explorer",
  famille: "Arts, EPS et langues",
  source: "Éduscol, Éducation musicale cycles 2 et 3 — « L'écoute : principes de mise en œuvre » et « Le chant » (2016)",
  resume: "Une séance d'écoute en trois phases (découverte, approfondissement, consolidation), des séances de chant préparées par des échauffements corporels et vocaux, l'expressivité, l'exploration et le partage.",
  seances: [
    {
      titre: "Écoute — découverte, approfondissement, consolidation",
      objectifs: "À la fin de cette séance, les élèves sauront reconnaître l'œuvre écoutée et en décrire quelques éléments de langage musical, après l'avoir rencontrée, réécoutée et mémorisée.",
      duree: 30,
      phases: [
        ph("Découverte", "5 min", "Première écoute : réactions spontanées, ressentis.", "Ne guide pas encore : laisse émerger."),
        ph("Approfondissement", "20 min", "Écoutes réitérées avec une consigne précise : questionnement et verbalisation, geste, mise en mouvement, représentation graphique, pratique rythmique.",
          "Fait repérer les éléments caractéristiques ; varie les modalités d'une séance à l'autre."),
        ph("Consolidation", "5 min", "Ce qu'on retient (titre, ce qu'on a entendu) ; prolongements possibles."),
      ],
    },
    {
      titre: "Chant — apprendre un chant",
      objectifs: "À la fin de cette séance, les élèves sauront chanter le chant … : échauffement, découverte, apprentissage phrase par phrase, mise en chœur.",
      duree: 30,
      phases: [
        ph("Reprise d'un chant connu", "5 min", "Un ou deux chants appris repris : plaisir et mémoire."),
        ph("Échauffement corporel et vocal", "5 min", "Posture, respiration, jeux vocaux en lien avec le chant.",
          "Connaît bien le chant : style, structure, passages difficiles ; transpose si la tessiture est trop grave."),
        ph("Découverte et apprentissage", "15 min", "Écoute du chant ; apprentissage par phrases ou par couplets, en écho ; passages difficiles repris."),
        ph("Mise en chœur", "5 min", "Le chant entier, ensemble ; tenir sa place dans le groupe."),
      ],
    },
    {
      titre: "Chanter avec expressivité",
      objectifs: "À la fin de cette séance, les élèves sauront interpréter le chant : nuances, intentions, diction au service du sens, le corps, le visage et le regard mobilisés.",
      duree: 30,
      phases: [
        ph("Échauffement et reprise", "5 min", "Corps et voix ; le chant repris."),
        ph("Jeux d'expression", "10 min", "Mimer les émotions, se tenir dans le chœur, présent et attentif."),
        ph("Interprétation", "10 min", "Nuances et intentions choisies ensemble ; enregistrement écouté pour ajuster.", "L'enregistrement sert l'autoévaluation, pas la diffusion."),
        ph("Bilan", "5 min", "Ce qui s'entend maintenant."),
      ],
    },
    {
      titre: "Explorer et créer",
      objectifs: "À la fin de cette séance, les élèves sauront explorer leur voix, les sons, les objets sonores, et organiser une courte production qu'ils sauront coder.",
      duree: 30,
      phases: [
        ph("Exploration", "10 min", "Jeux vocaux, objets sonores, corps : que peut-on produire ?"),
        ph("Création", "15 min", "Par groupes : une courte séquence sonore organisée (début, fin, contraste) ; codage graphique.", "Donne une contrainte simple ; fait décider et coder."),
        ph("Écoute des productions", "5 min", "Présentation, écoute, un mot chacun."),
      ],
    },
    {
      titre: "Partager",
      objectifs: "À la fin de cette séance, les élèves sauront chanter pour d'autres, et argumenter un jugement sur une musique en respectant le point de vue des autres.",
      duree: 20,
      phases: [
        ph("Production", "10 min", "Chanter pour une autre classe, les parents, un moment de l'école."),
        ph("Échange", "10 min", "Ce qu'on a ressenti, ce qu'on a réussi ; cahier de chant complété."),
      ],
    },
  ],
};

const HISTOIRE_DES_ARTS: Demarche = {
  id: "histoire-des-arts",
  nom: "Rencontre avec l'œuvre : identifier, analyser, situer",
  famille: "Arts, EPS et langues",
  source: "Éduscol, Histoire des arts cycle 3 — « Approche descriptive d'une œuvre en classe par l'observation collective » (2016)",
  resume: "Une démarche descriptive qui part des remarques spontanées de la classe : identifier ce que l'œuvre représente ou exprime, analyser ses caractéristiques techniques et formelles, la situer dans ses usages et son contexte.",
  seances: [
    {
      titre: "Observer et décrire",
      objectifs: "À la fin de cette séance, les élèves sauront décrire l'œuvre … avec un vocabulaire simple, et donner un avis sur ce qu'elle représente ou exprime.",
      duree: 30,
      phases: [
        ph("Question de départ", "5 min", "« De quoi s'agit-il ? » — l'œuvre projetée ou présentée, sans le cartel.", "Organise l'échange : premier tour de table."),
        ph("Description collective", "20 min", "Ce que je perçois : formes, personnages, matériaux, couleurs ; propositions reprises pour construire le savoir.",
          "Reprend les propositions, demande des précisions, relance, réoriente une hypothèse erronée."),
        ph("Le cartel", "5 min", "Auteur, titre, date, dimensions, matériaux, lieu de conservation."),
      ],
    },
    {
      titre: "Analyser",
      objectifs: "À la fin de cette séance, les élèves sauront dégager les principales caractéristiques techniques et formelles de l'œuvre, et dire ce qui, dans l'œuvre, leur fait comprendre ce qu'ils comprennent.",
      duree: 30,
      phases: [
        ph("Rappel", "5 min", "Ce qu'on a vu."),
        ph("Analyse guidée", "20 min", "Formes, composition, espace, couleurs, lumière, gestes, matériaux ; le sens qui s'en dégage ; hypothèses argumentées.",
          "Arrête l'échange quand une notion essentielle est décryptée ; donne les connaissances au bon moment."),
        ph("Ce qu'on retient", "5 min", "Deux ou trois caractéristiques écrites."),
      ],
    },
    {
      titre: "Situer",
      objectifs: "À la fin de cette séance, les élèves sauront relier l'œuvre à ses usages et au contexte historique et culturel de sa création, et la placer sur la frise.",
      duree: 30,
      phases: [
        ph("Usages", "10 min", "Pour quoi cette œuvre a-t-elle été réalisée ? Pour qui ? Où était-elle ?"),
        ph("Contexte", "15 min", "Période, aire géographique, ce qui se passait alors ; mise en relation avec une autre œuvre.",
          "Fait émettre une proposition argumentée avant de donner la réponse."),
        ph("Frise", "5 min", "L'œuvre placée sur la frise de la classe."),
      ],
    },
    {
      titre: "Garder trace et pratiquer",
      objectifs: "À la fin de cette séance, les élèves sauront garder une trace écrite courte avec le vocabulaire, et dire ce qui les touche, après une découverte par la pratique (croquis, prise de vue).",
      duree: 30,
      phases: [
        ph("Croquis", "15 min", "Dessiner pour observer et comprendre : forme générale, structure, détail."),
        ph("Trace écrite", "10 min", "Cartel, deux phrases : ce qu'elle représente, ce qui la caractérise."),
        ph("Ce qui nous touche", "5 min", "Chacun un mot : on ne commence pas par « j'aime / j'aime pas », on finit par ce qu'on ressent."),
      ],
    },
  ],
};

const LANGUES_VIVANTES: Demarche = {
  id: "langues-vivantes",
  nom: "Langue vivante : rituels, découverte, mémorisation, appropriation",
  famille: "Arts, EPS et langues",
  source: "Oser les langues vivantes étrangères à l'école (guide pour l'enseignement des langues vivantes, Éduscol 2019)",
  resume: "Les moments clés communs à toute séance de langue : rituels de début, découverte de la thématique ou rappel, mémorisation par la répétition et le jeu, appropriation par des ateliers de manipulation, mise en voix — dans une séquence fédérée par un projet.",
  seances: [
    {
      titre: "Découverte",
      objectifs: "À la fin de cette séance, les élèves sauront comprendre puis répéter les premiers énoncés de la thématique …, à partir d'un support authentique.",
      duree: 30,
      phases: [
        ph("Rituels de début de séance", "5 min", "Salutations, date, météo, comment on se sent — exclusivement en langue cible.",
          "Repères sûrs et évolutifs ; le rituel répond à un objectif d'apprentissage."),
        ph("Découverte de la thématique", "10 min", "Support audio, vidéo, album, comptine ; anticipation (thème, lexique) ; compréhension guidée avec des aides visuelles.",
          "Anticipe et présente le fait de langue de façon explicite."),
        ph("Mémorisation par la répétition et le jeu", "12 min", "Répétition en chœur, en groupe, en chaîne ; jeux de mémoire (cartes-images, « what's missing? »)."),
        ph("Bilan", "3 min", "« Que savons-nous dire maintenant ? »"),
      ],
    },
    {
      titre: "Entraînement",
      objectifs: "À la fin de cette séance, les élèves sauront réutiliser la langue travaillée, après l'avoir manipulée en ateliers : production imitée, puis guidée.",
      duree: 30,
      phases: [
        ph("Rituels", "5 min", "Rituels, dont ceux en lien avec l'apprentissage en cours."),
        ph("Rappel, rebrassage", "5 min", "Ce qu'on sait dire depuis la séance précédente."),
        ph("Ateliers de manipulation", "15 min", "Travail en binômes, jeux collectifs, questions-réponses guidées : de nombreuses occasions de mise en contact et de production.",
          "Diversifie les modalités : collectif, binômes, groupes ; réception, production, réflexion sur la langue."),
        ph("Bilan", "5 min", "Ce qu'on a appris."),
      ],
    },
    {
      titre: "Production",
      objectifs: "À la fin de cette séance, les élèves sauront produire en continu ou en interaction, de l'imitation à la production libre, et transférer à d'autres contextes.",
      duree: 30,
      phases: [
        ph("Rituels", "5 min", "Rituels."),
        ph("Rappel", "5 min", "Rebrassage rapide."),
        ph("Mise en voix, interprétation", "15 min", "Saynète, comptine, dialogue, présentation (fiche d'identité, animal…) ; production en interaction.",
          "Corrige la prononciation et le rythme par l'imitation ; valorise la prise de parole."),
        ph("Bilan", "5 min", "Ce qu'on sait dire et faire en fin de séance."),
      ],
    },
    {
      titre: "Réinvestissement — projet",
      objectifs: "À la fin de cette séance, les élèves sauront réaliser la tâche finale : une situation de communication qui réinvestit ce qui a été travaillé (présentation, enregistrement, échange avec des correspondants).",
      duree: 30,
      phases: [
        ph("Rituels", "5 min", "Rituels."),
        ph("Tâche finale", "20 min", "Production pour un destinataire : autre classe, correspondants, enregistrement."),
        ph("Retour", "5 min", "Comment remobiliser ce qu'on a appris à moyen et à long terme."),
      ],
    },
    {
      titre: "Rebrassage court",
      objectifs: "À la fin de cette séance, les élèves sauront retrouver le lexique et les structures déjà travaillés, entretenus par quelques minutes de rituel et de jeu.",
      duree: 10,
      phases: [
        ph("Rituel et jeu", "10 min", "Salutations, date, un jeu rapide sur le lexique en cours.", "Renforce l'exposition à la langue : rituels, EPS, moments de classe."),
      ],
    },
  ],
};

// ── Maternelle ────────────────────────────────────────────────────────────

const MATERNELLE_MODALITES: Demarche = {
  id: "maternelle-modalites",
  nom: "Apprendre en jouant, en réfléchissant, en s'exerçant, en mémorisant",
  famille: "Maternelle",
  source: "Programme de l'école maternelle (2025) — les modalités d'apprentissage ; livret d'accompagnement « À partir de 5 ans » (2025)",
  resume: "Les quatre modalités du programme, articulées dans une même séquence, et l'atelier dirigé en trois temps du livret : mise en réussite, activité différenciée, retour.",
  seances: [
    {
      titre: "Découvrir en jouant",
      objectifs: "À la fin de cette séance, les élèves sauront jouer au jeu … en respectant ses règles et ses rôles : un jeu structuré qui vise explicitement l'apprentissage, pour agir sur le réel en autonomie.",
      duree: 30,
      phases: [
        ph("Présentation du jeu", "5 min", "Règle expliquée en montrant ; consigne reformulée par les élèves."),
        ph("Jeu", "20 min", "Temps suffisant pour déployer l'activité de jeu : symbolique, de construction, de manipulation, collectif.",
          "Observe les élèves lorsqu'ils jouent afin de mieux les connaître ; encourage le langage en situation."),
        ph("Ce qu'on a fait", "5 min", "Évocation : à quoi a-t-on joué, qu'a-t-on réussi ?"),
      ],
    },
    {
      titre: "Réfléchir et résoudre un problème concret",
      objectifs: "À la fin de cette séance, les élèves sauront chercher la solution d'un problème concret à leur portée, en s'appuyant sur des situations vécues et sur ce qu'ils connaissent.",
      duree: 30,
      phases: [
        ph("Le problème", "5 min", "Situation concrète mise en scène, avec du matériel : …", "Propose un problème à leur portée ; dit ce qu'on cherche."),
        ph("Tâtonnements", "15 min", "Essais, réponses proposées, vérification par la manipulation.",
          "Accompagne les tâtonnements ; s'appuie sur les essais et les erreurs pour initier les échanges entre élèves."),
        ph("Échanges", "10 min", "Les cheminements dits ; ce qui a marché."),
      ],
    },
    {
      titre: "S'exercer",
      objectifs: "À la fin de cette séance, les élèves sauront refaire avec plus d'assurance ce qu'ils connaissent déjà, dans des conditions variées : la stabilisation demande de nombreuses répétitions.",
      duree: 20,
      phases: [
        ph("Objectif expliqué", "3 min", "Ce qu'on est en train d'apprendre, le sens des efforts demandés."),
        ph("Entraînement", "14 min", "Atelier de répétition, supports variés, auto-entraînement pour les plus grands.", "Fait percevoir les progrès réalisés."),
        ph("Progrès", "3 min", "Ce qu'on réussit mieux qu'avant."),
      ],
    },
    {
      titre: "Se remémorer et mémoriser",
      objectifs: "À la fin de cette séance, les élèves sauront évoquer les activités vécues, et dire la comptine, la chanson ou le récit travaillés, mémorisés par des expositions répétées.",
      duree: 15,
      phases: [
        ph("Évocation", "7 min", "Qu'a-t-on fait, appris ? Photos, traces, affichages.", "S'exprime dans une langue riche, adaptée et explicite."),
        ph("Mémorisation", "8 min", "Comptine, chanson ou récit repris ; répéter, reformuler."),
      ],
    },
    {
      titre: "Atelier dirigé en trois temps",
      objectifs: "À la fin de cette séance, les élèves sauront … (ce que vise l'atelier) : un atelier en petit groupe avec le professeur — mise en réussite, activité différenciée, retour —, pendant que les autres sont en ateliers autonomes ou semi-dirigés.",
      duree: 30,
      phases: [
        ph("Temps 1 – Mise en réussite : découvrir, observer", "10 min", "Le professeur montre, verbalise, rappelle le travail précédent, présente l'objectif ; les élèves font avec lui.",
          "Dit la consigne en montrant ; fait reformuler."),
        ph("Temps 2 – Activité différenciée", "15 min", "Chacun fait, sur des supports adaptés ; guidage main à main si besoin.", "Observe, guide, verbalise ou fait verbaliser."),
        ph("Temps 3 – Retour", "5 min", "Ce qu'on a appris ; productions valorisées ; trace collective."),
      ],
    },
  ],
};

const seancePhono = (titre: string, objectifs: string, jeu1: string, jeu2: string, posture: string): SeanceCadre => ({
  titre, objectifs, duree: 20,
  phases: [
    ph("Rappel et objectif", "3 min", "Ce qu'on a appris la dernière fois ; ce qu'on va apprendre : on s'intéresse aux sons des mots, pas à leur sens.",
      "Explique ce qu'ils sont en train d'apprendre ; le sens ne doit pas parasiter l'objectif."),
    ph("Jeu 1", "8 min", jeu1, posture),
    ph("Jeu 2", "7 min", jeu2, "Petit groupe homogène ; retours immédiats."),
    ph("Bilan", "2 min", "« Qu'avons-nous appris ? » ; ce qu'on refera demain."),
  ],
});

const PHONOLOGIE: Demarche = {
  id: "phonologie",
  nom: "Conscience phonologique : syllabes, rimes, phonèmes",
  famille: "Maternelle",
  source: "Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle (guide fondamental, 2020)",
  resume: "Un enseignement explicite, structuré et progressif, en séances courtes et fréquentes en petits groupes : segmenter, dénombrer, discriminer, localiser, puis manipuler les syllabes ; entendre les rimes ; discriminer et manipuler les phonèmes, en lien avec les lettres.",
  seances: [
    seancePhono("Segmenter et dénombrer les syllabes",
      "À la fin de cette séance, les élèves sauront frapper, scander et fusionner les syllabes de mots familiers, les dénombrer et les comparer.",
      "Frapper les syllabes des prénoms en sautant ou avec un instrument ; scander une comptine.",
      "« Loto » : piocher une image, scander et dénombrer les syllabes, poser sur la case au bon nombre ; « Devine à qui je pense » à partir du codage des syllabes.",
      "Commence par la syllabe : l'unité la plus facilement perceptible."),
    seancePhono("Discriminer et localiser une syllabe",
      "À la fin de cette séance, les élèves sauront repérer une syllabe dans une suite ou dans des mots, la localiser (début, milieu, fin) et trouver l'intrus.",
      "« La chasse à la syllabe » : lever la main dès qu'on entend « to » dans des syllabes, des mots, une phrase.",
      "« Loto des syllabes », « domino des syllabes », « trouver l'intrus » (bateau, banane, tapis, ballon).",
      "La tâche est plus aisée quand la syllabe est au début ou à la fin du mot."),
    seancePhono("Manipuler les syllabes",
      "À la fin de cette séance, les élèves sauront inverser, supprimer, doubler ou ajouter une syllabe, et trouver une règle de transformation.",
      "« Dis le mot lapin, j'enlève la, que reste-t-il ? » ; doubler la dernière syllabe (mototo, chapeaupeau).",
      "Inverser les syllabes de mots bisyllabiques ; ajouter une syllabe définie au début ou à la fin ; poursuivre une suite selon la règle.",
      "Les procédures comprises sur la syllabe seront remobilisées sur les phonèmes."),
    seancePhono("Entendre les rimes et les phonèmes",
      "À la fin de cette séance, les élèves sauront repérer ce qui « sonne » pareil (rimes, assonances), distinguer deux mots qui diffèrent d'un phonème, étirer et fusionner les phonèmes.",
      "Comptines à rimes ; mots qui riment associés ; paires pain/bain, poule/boule, four/tour.",
      "« Qui suis-je ? » : retrouver « ami » à partir de « aaaa-mmmm-iiii » ; bruiter les lettres de son prénom.",
      "Multi-sensoriel : gestes, lettres, images ; entraînement explicite en petits groupes homogènes."),
    seancePhono("Discriminer et manipuler un phonème",
      "À la fin de cette séance, les élèves sauront repérer un phonème, le localiser, le coder, l'ajouter, le supprimer ou le substituer, et le relier à sa lettre.",
      "« La chasse au phonème » (/f/), « loto des phonèmes », « trouver l'intrus » (soleil, serpent, valise, sac).",
      "« Dans plouf, je retire /f/, que reste-t-il ? » ; « pour moto je dis roto » ; « la chasse aux lettres » : retrouver la lettre du phonème bruité dans son prénom.",
      "Les entraînements sont plus efficaces quand ils portent sur le lien lettres-sons."),
  ],
};

// « Organiser les mots en catégorie et en réseau » (programme 2025). Le
// programme donne les quatre étapes de toute séquence de vocabulaire —
// apporter de nouveaux mots, structurer le lexique, faire mémoriser par des
// activités dédiées, réutiliser —, le guide « Pour enseigner le vocabulaire
// à l'école maternelle » l'univers de référence qui les précède et des
// séances courtes (« de 10 minutes en début de petite section à 20 minutes en
// grande section ») ; le livret « À partir de 5 ans » la séance de
// catégorisation en trois temps ; la fiche « Catégoriser » (2023) les jeux,
// âge par âge, et ce qu'on observe.
const CATEGORISER: Demarche = {
  id: "categoriser-maternelle",
  nom: "Catégoriser les mots : apporter, structurer, mémoriser, réutiliser",
  famille: "Maternelle",
  source: "Programme de l'école maternelle (2025) ; Pour enseigner le vocabulaire à l'école maternelle (guide fondamental, 2021) ; fiche « Catégoriser : de la catégorisation d'objets à la catégorisation de mots », Éduscol 2023 ; livret « À partir de 5 ans » (2025)",
  resume: "Les mots rencontrés d'abord dans un univers de référence, avec les objets réels puis leurs images ; triés, classés, puis nommés en catégories, avec l'affichage pour trace ; mémorisés dans des jeux courts et répétés — loto des catégories, « J'appelle… », jeu des familles, mistigri — ; réutilisés dans les espaces jeux et les devinettes ; observés à distance, sur une grille, et revus un mois plus tard.",
  seances: [
    {
      titre: "Étape 1 — Apporter les mots, en contexte",
      objectifs: "À la fin de cette séance, les élèves sauront nommer chaque objet du corpus par un mot précis, le décrire et dire à quoi il sert — l'objet réel, puis son image.",
      duree: 20,
      phases: [
        ph("Univers de référence", "10 min", "Dans un coin jeux — dînette, marchande, poupées — ou avec de vrais objets : manipuler, nommer, dire à quoi ça sert.",
          "Prononce le mot précis, puis sollicite les élèves pour qu'ils l'emploient."),
        ph("Les cartes-images", "10 min", "Les mêmes objets en images : les nommer, les décrire, dire où on les a rencontrés. Le professeur note les mots dits.",
          "Collecte les mots en vue des outils de la classe ; repère ceux qu'aucun élève ne connaît."),
      ],
    },
    {
      titre: "Étape 2 — Structurer : trier et classer",
      objectifs: "À la fin de cette séance, les élèves sauront regrouper les images du corpus : trouver l'intrus, compléter une catégorie, proposer une catégorisation, et justifier leurs choix.",
      duree: 20,
      phases: [
        ph("Temps 1 – Mise en réussite", "5 min", "L'objectif annoncé : regrouper les mots pour mieux les retenir. Les images nommées, puis une première catégorisation collective, validée par le professeur.",
          "Montre ce qui est attendu avant de laisser chercher."),
        ph("Temps 2 – Activité différenciée", "10 min", "Par deux, selon les besoins : retirer l'intrus, compléter une catégorie commencée, ou classer seul les images dans les boîtes.",
          "Observe les échanges, aide ponctuellement ; garde une trace de chaque groupe (photo, barquette)."),
        ph("Temps 3 – Institutionnalisation", "5 min", "Mise en commun : les catégories sont débattues, justifiées, validées ; le professeur met en mots ce qu'on a appris aujourd'hui.",
          "Si l'effort a été grand, fait le bilan plus tard — mais dans la même journée."),
      ],
    },
    {
      titre: "Étape 2 — Nommer les catégories, garder la trace",
      objectifs: "À la fin de cette séance, les élèves sauront donner son nom à chaque catégorie — le mot qui les dit toutes — et l'enrichir de mots nouveaux ; l'affichage des catégories de la classe en garde la trace.",
      duree: 15,
      phases: [
        ph("Nommer", "5 min", "Chaque catégorie reçoit son nom : « les fruits », « les vêtements » ; en grande section, ses sous-catégories."),
        ph("Enrichir", "5 min", "D'autres mots rejoignent chaque catégorie ; un intrus glissé fait interroger les propriétés des objets.",
          "Fait dire la forme, l'usage, la provenance : ce qui fait qu'un objet est de la catégorie."),
        ph("La trace", "5 min", "L'affichage des catégories, construit avec les élèves : il servira de référence pour jouer et pour réviser."),
      ],
    },
    {
      titre: "Étape 3 — Mémoriser : le loto des catégories",
      objectifs: "À la fin de cette séance, les élèves sauront retrouver les mots appris et les ranger dans leur catégorie en jouant. Séance courte et ritualisée, à reprendre plusieurs jours de suite, puis à intervalles plus espacés.",
      duree: 15,
      phases: [
        ph("Rappel", "3 min", "On relit l'affichage : chaque catégorie, ses mots."),
        ph("Le loto aveugle", "10 min", "Chacun sa plaque ; on pioche une carte, on la nomme, on la pose sur la plaque de sa catégorie en disant pourquoi.",
          "En petit groupe ; reprend le mot juste, fait répéter la phrase entière."),
        ph("Bilan", "2 min", "Les mots appris ; ceux qui résistent reviendront dans les jeux."),
      ],
    },
    {
      titre: "Étape 3 — Mémoriser : jouer avec les catégories",
      objectifs: "À la fin de cette séance, les élèves sauront nommer chaque carte et justifier chaque choix dans des jeux à règles : « J'appelle… », le jeu des familles, le mistigri.",
      duree: 15,
      phases: [
        ph("Rappel", "3 min", "La règle du jeu, dite en montrant ; un tour joué ensemble."),
        ph("Jeu", "10 min", "« J'appelle tout ce qui se mange ! », « Dans la famille des fruits, je voudrais la pomme », ou les paires du mistigri.",
          "Fait employer la catégorie dans une phrase : « La pomme et la banane, ce sont des fruits. »"),
        ph("Bilan", "2 min", "Ce qu'on a réussi ; le jeu reste en accès libre."),
      ],
    },
    {
      titre: "Étape 4 — Réutiliser les mots",
      objectifs: "À la fin de cette séance, les élèves sauront réemployer les mots et les catégories dans d'autres contextes : les espaces jeux, les devinettes, une dictée à l'adulte.",
      duree: 20,
      phases: [
        ph("Dans les espaces jeux", "10 min", "Ranger la dînette par catégories, faire les courses chez les marchands, préparer le sac de la poupée : employer les mots appris."),
        ph("Devinettes", "10 min", "« C'est un fruit jaune et long : qu'est-ce que c'est ? » Les élèves devinent, puis inventent leurs devinettes.",
          "Fait dire la catégorie et ce qui distingue l'objet dans une phrase complète."),
      ],
    },
    {
      titre: "Évaluation — observer, à distance",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : nommer les images, trouver l'intrus, classer, nommer les catégories. Le professeur vérifie un mois plus tard que le corpus est mémorisé.",
      duree: 15,
      phases: [
        ph("Observation", "12 min", "En petit groupe ou seul avec l'élève, avec les cartes-images : nommer, trier, retirer l'intrus, nommer les catégories ; la grille se remplit.",
          "Observe sans aider ; note les mots à retravailler."),
        ph("Suite", "3 min", "Les mots à retravailler reviennent dans les jeux ; l'observation se refait un mois plus tard."),
      ],
    },
  ],
};

// « Constituer une collection d'un cardinal donné » (programme 2025). Le guide
// « La construction du nombre à l'école maternelle » (2023) donne la
// situation des voyageurs — une seule réserve, éloignée, un seul voyage, un
// quai pour différer la validation — et ses variables : la disposition des
// places, le nombre de trajets, la formulation à autrui. Les livrets
// « Avant 4 ans » et « À partir de 4 ans » (2025) en font deux séquences —
// les poupées et leurs pommes, le dortoir des oursons et la mascotte à qui
// l'on commande par écrit —, chaque séance en quatre temps : la même
// situation reprise, une contrainte de plus à chaque fois.
const COLLECTIONS: Demarche = {
  id: "collections-maternelle",
  nom: "Construire des collections de cardinal donné : juste ce qu'il faut",
  famille: "Maternelle",
  source: "Programme de l'école maternelle (2025) ; La construction du nombre à l'école maternelle (guide fondamental, 2023) ; livrets d'accompagnement « Avant 4 ans » et « À partir de 4 ans » (2025), Acquisition des premiers outils mathématiques",
  resume: "Une situation de référence — les poupées et leurs pommes, le dortoir des oursons, les voyageurs — reprise de séance en séance, une contrainte de plus à chaque fois : la réserve d'abord à portée de main, puis éloignée ; plusieurs trajets, puis un seul ; des places en rangée, en constellation, en vrac, en deux groupes ; la quantité dite ou montrée sur les doigts, puis commandée à la mascotte, à l'oral et par écrit. On valide en posant un objet sur chaque place ; on observe chacun, à distance.",
  seances: [
    {
      titre: "Découvrir la situation : un objet par place",
      objectifs: "À la fin de cette séance, les élèves sauront mettre juste ce qu'il faut d'objets pour qu'il y en ait un sur chaque place — pas de place sans objet, pas d'objet sans place —, la réserve à portée de main, et dire s'ils ont réussi.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "La situation mise en scène : « Voici des poupées qui ont faim : chaque poupée doit avoir une pomme dans son assiette. » Le critère de réussite dit, puis montré : un essai réussi, un essai raté.",
          "Montre comment jouer ; simule une réussite et un échec pour que chacun sache se valider seul."),
        ph("Temps 2 – Mise en activité différenciée", "10 min", "Chacun sa fiche de places, la réserve à côté : un objet sur chaque place. Les fiches changent, avec de plus en plus de places.",
          "Met en mots ce que fait l'élève : « une pomme, et encore une pomme… »."),
        ph("Temps 3 – Institutionnalisation", "5 min", "« Il y a autant de pommes que d'assiettes. » Le professeur nomme les petites quantités : « deux, c'est un et encore un »."),
      ],
    },
    {
      titre: "La réserve s'éloigne : plusieurs trajets, puis un seul",
      objectifs: "À la fin de cette séance, les élèves sauront aller chercher dans une réserve éloignée juste ce qu'il faut d'objets pour les places de leur fiche — d'abord en plusieurs trajets, puis en un seul — en gardant la quantité en mémoire sur leurs doigts ou par le nom du nombre.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Le jeu rappelé ; la nouvelle contrainte : la réserve est loin, la fiche reste au fond de la boîte, on rapporte les objets dans un panier."),
        ph("Temps 2 – Mise en activité différenciée", "10 min", "Plusieurs trajets permis, puis un seul. Ce qu'on rapporte attend devant la boîte : « Penses-tu avoir juste ce qu'il faut ? » — puis on pose un objet sur chaque place.",
          "Diffère la validation : la pensée précède l'action. Fait montrer la quantité sur les doigts avant le départ."),
        ph("Temps 3 – Institutionnalisation", "5 min", "Les façons de se souvenir, dites et comparées : un doigt levé par place, la quantité vue d'un coup d'œil, « deux et encore un », le nom du nombre."),
      ],
    },
    {
      titre: "Un seul trajet : des places disposées autrement",
      objectifs: "À la fin de cette séance, les élèves sauront rapporter en un seul trajet juste ce qu'il faut d'objets, quelle que soit la disposition des places — en rangée, en constellation, en vrac, en deux groupes —, en reconnaissant la quantité, en la décomposant ou en comptant.",
      duree: 25,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Une fiche déjà réussie, puis une fiche nouvelle : « Comment vas-tu savoir combien il en faut ? »"),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "Des fiches selon ce que chacun sait déjà : petites quantités vues d'un coup d'œil, constellations du dé, places en vrac à dénombrer, deux groupes (« quatre et encore un »).",
          "Attribue les fiches d'après la cardinalité acquise ; questionne avant le départ : « Combien vas-tu en chercher ? Comment le sais-tu ? »"),
        ph("Temps 3 – Institutionnalisation", "5 min", "Les procédures efficaces mises en évidence, la plus sûre d'abord ; les fiches réussies affichées avec leur nombre.",
          "S'appuie sur des photos du jeu pour aider à se souvenir."),
        ph("Temps 4 – Automatisation, réinvestissement", "3 min", "Le jeu reste dans l'espace mathématiques, avec d'autres fiches, pour s'entraîner seul ou à deux."),
      ],
    },
    {
      titre: "« Donne-moi… » : la quantité dite ou montrée",
      objectifs: "À la fin de cette séance, les élèves sauront constituer une collection dont la quantité est dite, montrée sur les doigts ou par une constellation : « Donne-moi trois voitures », « Mets dans la boîte autant de jetons qu'il y a de points ».",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "« Donne-moi trois voitures » : le professeur prend les voitures une à une en disant « une voiture, et encore une voiture, et encore une voiture : ça fait trois voitures »."),
        ph("Temps 2 – Mise en activité différenciée", "10 min", "Par deux : l'un tire une carte-nombre — points, doigts, et le chiffre pour les plus grands — et passe commande ; l'autre constitue la collection ; on vérifie sur la carte.",
          "Varie la nature et la taille des objets : trois éléphants, c'est trois comme trois fourmis."),
        ph("Temps 3 – Institutionnalisation", "5 min", "Les écritures d'un même nombre rapprochées : trois doigts, trois points, « trois »."),
      ],
    },
    {
      titre: "Commander à la mascotte",
      objectifs: "À la fin de cette séance, les élèves sauront commander à quelqu'un d'autre juste ce qu'il faut d'objets : à l'oral, puis — à partir de 4 ans — par un message que la mascotte peut lire, le nombre écrit en chiffres.",
      duree: 25,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "La nouvelle contrainte : on ne va plus chercher soi-même, on commande à la mascotte, qui ne comprend que le nombre dit — puis écrit, sans parler."),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "Chacun trouve combien de places a sa fiche, dit le nombre, puis l'écrit sur son bon de commande, en s'aidant de la bande numérique et d'une pince à linge ; la mascotte livre, on vérifie sur les places.",
          "Fait dire le nombre avant de l'écrire ; accepte d'abord dessins et traits, puis amène au code que tout le monde comprend : les chiffres."),
        ph("Temps 3 – Institutionnalisation", "5 min", "« Pour être compris de tous, on écrit le nombre en chiffres. » La bande numérique collective reste affichée."),
        ph("Temps 4 – Automatisation, réinvestissement", "3 min", "D'autres fiches, d'autres commandes, en autonomie."),
      ],
    },
    {
      titre: "Réinvestir dans un autre contexte",
      objectifs: "À la fin de cette séance, les élèves sauront constituer juste ce qu'il faut d'objets dans une situation nouvelle — mettre la table, distribuer les pinceaux, commander les pièces d'une construction — et, en grande section, réunir deux collections pour trouver le bon panier.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "La situation nouvelle, mise en scène ; la règle rappelée : juste ce qu'il faut, pas plus, pas moins."),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "Des objets moins figuratifs — jetons, cubes — et d'autres contextes. En grande section, « le bon panier » : un message (quatre œufs verts et cinq rouges), le panier qui a juste ce qu'il faut d'œufs.",
          "Remplace peu à peu les figurines par des jetons : on va vers le nombre."),
        ph("Temps 3 – Institutionnalisation", "3 min", "Ce qui reste vrai d'une situation à l'autre : on cherche combien il en faut, puis on prend ce nombre-là."),
      ],
    },
    {
      titre: "Évaluation — observer chacun",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : rapporter en un seul trajet juste ce qu'il faut d'objets, répondre à « Donne-moi… », passer commande — jusqu'à trois ou quatre, six, puis dix selon l'âge.",
      duree: 15,
      phases: [
        ph("Observation", "12 min", "Seul avec l'élève : une fiche de places, la réserve éloignée, un seul trajet ; puis « Donne-moi… ». La grille se remplit : la réussite et la procédure.",
          "Observe sans aider ; note la procédure : un à un, d'un coup d'œil, en décomposant, en comptant."),
        ph("Suite", "3 min", "Des rituels pour continuer : aller chercher juste ce qu'il faut de pinceaux ou de ballons pour un groupe, le nombre caché sur la bande, les nombres dits et montrés sur les doigts."),
      ],
    },
  ],
};

// « S'approprier la notion de chronologie » (programme 2025) : ordonner des
// moments vécus, restituer la chronologie d'une histoire simple, ordonner
// les étapes d'un processus — et le dire avec les mots du temps de l'âge.
// La ressource Éduscol « La compréhension des récits de fiction » (2017)
// donne la démarche du récit : le résumer en donnant sa fin, le raconter et
// le lire plusieurs fois, jamais en morceaux, en faire manipuler les
// personnages et rejouer les scènes — c'est ainsi que la chronologie
// s'acquiert —, puis le faire raconter en petit groupe dès la moyenne
// section, le professeur ajoutant les mots qui relient. Les indicateurs de
// progrès (2016) font ordonner des photographies de ce qu'on a vécu, et en
// parler ; les livrets de 2025, chaque séance en quatre temps.
const CHRONOLOGIE: Demarche = {
  id: "chronologie-maternelle",
  nom: "Ordonner et raconter : la chronologie en images",
  famille: "Maternelle",
  source: "Programme de l'école maternelle (2025), « S'approprier la notion de chronologie » ; Éduscol, « La compréhension des récits de fiction : apprentissages et enseignement » (2017) et indicateurs de progrès « Se repérer dans le temps et l'espace » (2016) ; livrets d'accompagnement de 2025",
  resume: "Une suite d'abord vécue ou entendue plusieurs fois — une activité de la classe photographiée, une histoire racontée en entier et rejouée, un geste de tous les jours —, puis ordonnée ensemble au tableau, en petit groupe avec les cartes, seul sur la fiche, enfin sans aide ; racontée à chaque fois avec les mots du temps de l'âge : « d'abord… après » ; « au début, ensuite, pour finir » ; « d'abord, ensuite, puis, enfin ». On valide avec ce qu'on a vécu ou lu ; on observe chacun, à distance.",
  seances: [
    {
      titre: "Vivre ou entendre la suite",
      objectifs: "À la fin de cette séance, les élèves sauront dire ce qui se passe dans la suite étudiée — l'activité vécue, l'histoire entendue, le geste fait — : au moins comment elle commence et comment elle finit.",
      duree: 20,
      phases: [
        ph("Vivre ou entendre", "12 min", "L'activité vécue en petit groupe et photographiée à chaque étape ; ou l'histoire résumée en donnant sa fin, puis racontée et lue en entier, jamais en morceaux.",
          "Met en mots chaque étape pendant qu'elle se fait ; raconte la même histoire plusieurs fois, les jours suivants."),
        ph("Rejouer", "5 min", "Avec les personnages, les objets, des marottes : on refait les actions, dans l'ordre.", "Fait dire « d'abord », « après »."),
        ph("Ce qu'on retient", "3 min", "Comment cela commence, comment cela finit."),
      ],
    },
    {
      titre: "Ordonner ensemble, au tableau",
      objectifs: "À la fin de cette séance, les élèves sauront remettre dans l'ordre, avec la classe, les grandes images de la suite, en disant pourquoi l'une vient avant l'autre.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Les grandes images en désordre au tableau : on les nomme, on les décrit. « Par laquelle tout commence ? »"),
        ph("Temps 2 – Mise en activité", "10 min", "Chacun vient placer une image et dit pourquoi : « Avant, il faut… ». On vérifie avec l'album, les photos de la classe, ou en refaisant l'action.",
          "Accepte les essais ; fait vérifier plutôt que donner la réponse."),
        ph("Temps 3 – Institutionnalisation", "5 min", "On raconte toute la suite, les mots du temps posés sous les images. L'affiche reste au mur."),
      ],
    },
    {
      titre: "Ordonner en petit groupe, avec les cartes",
      objectifs: "À la fin de cette séance, les élèves sauront poser dans l'ordre les cartes de la suite sur les cases fléchées, puis la raconter à un camarade.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "3 min", "L'affiche de la dernière fois : on la raconte ensemble."),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "Par deux ou trois : les cartes mêlées, la bande fléchée. On pose chaque carte sur sa case, on vérifie, puis on raconte.",
          "Différencie : moins de cartes, l'affiche visible ou cachée, la première carte donnée."),
        ph("Temps 3 – Institutionnalisation", "5 min", "Ce qui aide à trouver l'ordre : ce qu'il faut avoir fait avant ; ce qui change d'une image à l'autre."),
      ],
    },
    {
      titre: "Raconter avec les mots du temps",
      objectifs: "À la fin de cette séance, les élèves sauront raconter la suite en entier et dans l'ordre, avec les mots du temps de leur âge : « d'abord… après » ; « au début, ensuite, pour finir » ; « d'abord, ensuite, puis, enfin ».",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Le professeur raconte en montrant les images ; les mots du temps sont mis en valeur, montrés sur leurs étiquettes."),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "En petit groupe, chacun raconte à son tour, image après image ; en grande section, la classe dicte la suite au professeur.",
          "Ajoute les mots qui relient — « alors », « quand soudain », « le lendemain » — et fait reprendre la phrase entière."),
        ph("Temps 3 – Institutionnalisation", "3 min", "On relit ce qui a été dit ou dicté ; le texte rejoint l'affiche."),
      ],
    },
    {
      titre: "Seul, coller dans l'ordre",
      objectifs: "À la fin de cette séance, les élèves sauront remettre seuls les images de la suite dans l'ordre sur leur fiche, puis la raconter.",
      duree: 20,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "3 min", "La consigne montrée sur une fiche agrandie : découper, ordonner sans coller, vérifier, puis coller."),
        ph("Temps 2 – Mise en activité différenciée", "12 min", "Chacun découpe, ordonne, fait vérifier ou vérifie avec l'affiche, puis colle.",
          "Fait raconter avant de coller ; aide au découpage sans donner l'ordre."),
        ph("Temps 3 – Institutionnalisation", "5 min", "Quelques élèves racontent leur fiche ; on compare les fiches entre elles."),
      ],
    },
    {
      titre: "Sans aide : ordonner et raconter",
      objectifs: "À la fin de cette séance, les élèves sauront ordonner la suite sans l'affiche ni les mots écrits, et la raconter d'eux-mêmes avec les mots du temps.",
      duree: 15,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "3 min", "L'affiche est cachée : qui se souvient de la suite ?"),
        ph("Temps 2 – Mise en activité", "9 min", "La bande sans les mots : chacun ordonne ses cartes, puis raconte à un camarade."),
        ph("Temps 4 – Réinvestissement, transfert", "3 min", "Une autre suite du même genre — un autre geste, une autre histoire, une recette — pour transférer ce qu'on a appris."),
      ],
    },
    {
      titre: "Évaluation — observer chacun",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : ordonner seuls les images de la suite, dire comment elle commence et finit, la raconter avec les mots du temps, dire pourquoi une image vient avant une autre.",
      duree: 15,
      phases: [
        ph("Observation", "12 min", "Seul avec l'élève : les cartes mêlées ; il les ordonne, puis raconte. La grille se remplit.",
          "Observe sans aider ; note les mots du temps employés."),
        ph("Suite", "3 min", "Revenir sur la suite quelques semaines plus tard ; l'affiche reste au mur pour se la rappeler."),
      ],
    },
  ],
};

/** L'ordre des familles à l'écran : le général d'abord, puis par domaine. */
export const FAMILLES: Famille[] = [
  "Toutes disciplines", "Français", "Mathématiques", "Sciences, histoire, EMC", "Arts, EPS et langues", "Maternelle",
];

// « Comparer, encadrer, intercaler des nombres entiers en utilisant les
// symboles =, < et > » (programme de mathématiques du cycle 2, 2024, CP). Le
// guide « Pour enseigner les nombres, le calcul et la résolution de problèmes
// au CP » (Éduscol, 2021) en donne la séquence, « Une séquence
// d'apprentissage sur la numération écrite chiffrée » (p. 40-46) : deux
// collections qu'on ne peut voir simultanément, dont on écrit le nombre en
// chiffres pour communiquer ; puis la comparaison grâce à ces écritures, et
// la trace « 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors
// que dans 68 il y a seulement 6 dizaines » ; le réinvestissement sous des
// écritures variées et en contexte ; enfin ordonner, intercaler, encadrer,
// « en diversifiant les contextes : par le jeu ». Il demande de faire
// verbaliser plutôt que d'appliquer une règle, et de valider au matériel.
const COMPARER_NOMBRES: Demarche = {
  id: "comparer-nombres-cp",
  nom: "Comparer, ranger, encadrer des nombres grâce à leur écriture chiffrée",
  famille: "Mathématiques",
  source: "Pour enseigner les nombres, le calcul et la résolution de problèmes au CP (guide fondamental, 2021), « Une séquence d'apprentissage sur la numération écrite chiffrée » et « Le jeu dans l'apprentissage des mathématiques » ; programme de mathématiques du cycle 2 (2024)",
  resume: "Deux collections qu'on ne voit pas ensemble : pour savoir laquelle a le plus d'éléments, on écrit leur nombre en chiffres, en groupant par dix, puis on compare les écritures — « 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68 il y a seulement 6 dizaines ». Les signes < et > viennent à ce moment. On compare ensuite sous toutes les écritures (5d 1u, 3u 4d, 5d 17u), en contexte et par le jeu — la bataille, la file des nombres, le nombre caché —, pour ordonner, intercaler et encadrer. On fait dire le raisonnement, on valide au matériel, dizaine contre dizaine.",
  seances: [
    {
      titre: "Écrire le nombre d'une collection qu'on ne voit pas",
      objectifs: "À la fin de cette séance, les élèves sauront écrire en chiffres le nombre d'objets d'une collection en l'organisant en dizaines et en unités, pour faire connaître une quantité à qui ne la voit pas.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "La classe en deux groupes : les uns ont une feuille de ronds rouges, les autres une feuille de ronds bleus, et aucun ne voit celle de l'autre groupe. Le problème : « Sur quelle feuille y a-t-il le plus de ronds ? » Pour le savoir, il faut faire connaître la quantité de sa feuille.",
          "Pose le problème sans dire comment le résoudre. Les quantités dépassent la comptine apprise en classe : compter un à un ne suffit plus."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Chaque élève écrit avec des chiffres le nombre de ronds de sa feuille : il entoure des paquets de dix, compte les dizaines, puis les unités restantes.",
          "Revient sur la signification des chiffres avec qui en a besoin : chacun ne voit que la collection de sa couleur. Le matériel de numération reste à disposition."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "Bilan d'étape : chaque collection affichée l'une après l'autre, jamais ensemble. Trois procédures comparées : compter un à un, trop long et peu sûr ; compter de dix en dix, qui donne le nom du nombre mais pas encore son écriture ; grouper par dix et écrire les dizaines puis les unités, accessible à tous. Au tableau ne restent que les écritures : « 7 dizaines 1 unité » — 71 ; « 6 dizaines 8 unités » — 68.",
          "Valide les écritures sans montrer les collections, en disant seulement les dizaines et les unités."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "D'autres collections, en partie groupées par dix : écrire leur nombre en chiffres."),
      ],
    },
    {
      titre: "Comparer grâce à l'écriture chiffrée : les signes < et >",
      objectifs: "À la fin de cette séance, les élèves sauront comparer deux nombres grâce à leur écriture chiffrée, en comparant d'abord les dizaines, et l'écrire avec les signes < et >.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Au tableau, les deux écritures de la séance précédente. Le professeur montre 71 en disant « sept dizaines et une unité », puis 68 en disant « six dizaines et huit unités », sans prononcer le nom des nombres : « Écrivez sur l'ardoise le nombre le plus grand. »"),
        ph("Temps 2 – Mise en activité des élèves", "15 min", "Chacun répond et justifie ; qui le veut vérifie avec son matériel de numération. On attend : « 71, c'est 7 dizaines et une unité, il y a plus de 7 dizaines ; 68, c'est 6 dizaines et 8 unités, il y a donc moins de 7 dizaines. »",
          "Recense les réponses et les arguments ; ne tranche pas avant la validation."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "La validation : les deux collections enfin affichées ensemble, puis le matériel aimanté au tableau, dizaine contre dizaine, unité contre unité. Les signes < et > s'introduisent ici ; on peut d'abord faire entourer le nombre le plus grand. La trace : « Tu peux comparer les nombres grâce à leur écriture chiffrée. 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68 il y a seulement 6 dizaines. »",
          "Fait verbaliser, écrit la trace avec les élèves : c'est l'affiche de la classe."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Lire des comparaisons écrites avec les signes : « 47 < 52 » se lit « 47 est plus petit que 52 »."),
      ],
    },
    {
      titre: "Comparer sous toutes les écritures : la bataille des nombres",
      objectifs: "À la fin de cette séance, les élèves sauront comparer deux nombres écrits de différentes façons — en chiffres, en dizaines et unités, en barres et en cubes — et placer le signe =, < ou > qui convient, en justifiant par les dizaines.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "L'affiche relue. Un exemple montré : « 3u 4d » et « 34 », c'est le même nombre, 3 dizaines et 4 unités ; puis « 5d 17u » et « 6d »."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Les exercices du guide : « À chaque fois, entoure le nombre le plus grand et écris ensuite le symbole qui convient : =, < ou >. Tu peux, si tu le veux, vérifier tes réponses avec le matériel de numération. » Des paires qui trompent l'œil : 47 et 74, 70 et 7, 9 et 41. Un problème : 68 élèves et un car de 75 places.",
          "Différencie par la taille des nombres et par les écritures ; le matériel reste à disposition pour vérifier."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "10 min", "Les erreurs discutées : regarder le chiffre de droite, croire que 47 et 74 sont pareils. On redit : on compare d'abord les dizaines — et l'on ne récite pas une règle sans la comprendre."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "10 min", "La bataille des nombres, par deux : on pose le signe entre les deux cartes, on lit, et l'autre demande « Comment le sais-tu ? ». On écrit trois comparaisons sur la feuille de jeu.",
          "Circule, écoute les justifications ; arbitre au matériel."),
      ],
    },
    {
      titre: "Ordonner et intercaler : la file des nombres",
      objectifs: "À la fin de cette séance, les élèves sauront ranger trois, puis cinq nombres dans l'ordre croissant et dans l'ordre décroissant, et trouver un nombre qui s'intercale entre deux autres.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "« Ce qu'on sait faire pour deux nombres, on le fait pour trois. » Trois cartes au tableau, à ranger du plus petit au plus grand en disant pourquoi."),
        ph("Temps 2 – Mise en activité des élèves", "15 min", "Ranger trois, puis cinq nombres, dans l'ordre croissant puis décroissant ; écrire un nombre qui va entre deux autres ; placer des nombres sur la bande numérique.",
          "Fait dire le raisonnement plutôt qu'une règle : « 9, c'est moins d'une dizaine ; 45, c'est plus de 4 dizaines. »"),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "5 min", "La trace : ranger dans l'ordre croissant, c'est du plus petit au plus grand ; on l'écrit avec le signe < : 12 < 19 < 34."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "15 min", "La file des nombres, à trois ou quatre : chacun pose sa carte dans la file — avant, après, ou entre deux cartes — en disant les signes. On recopie la file sur la feuille de jeu."),
      ],
    },
    {
      titre: "Encadrer : entre deux dizaines, entre deux nombres",
      objectifs: "À la fin de cette séance, les élèves sauront encadrer un nombre entre deux dizaines (30 < 34 < 40) ou entre le nombre d'avant et celui d'après, et retrouver sa place sur la bande numérique.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Un nombre caché sous un gobelet : « Il est plus grand que 30 et plus petit que 40. » On l'écrit : 30 < ? < 40."),
        ph("Temps 2 – Mise en activité des élèves", "15 min", "Encadrer des nombres entre deux dizaines, puis entre le nombre d'avant et celui d'après ; compléter une bande numérique d'une dizaine à la suivante, puis placer des nombres sur une demi-droite graduée de un en un."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "5 min", "La trace : encadrer un nombre, c'est trouver un nombre plus petit et un nombre plus grand ; entre deux dizaines, le chiffre des dizaines suffit."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "15 min", "Le nombre caché, par deux : l'un tire une carte sans la montrer, l'autre propose un nombre et note chaque encadrement sur la feuille de jeu, jusqu'à le trouver."),
      ],
    },
    {
      titre: "Résoudre des problèmes de comparaison",
      objectifs: "À la fin de cette séance, les élèves sauront répondre à une question de comparaison posée dans un contexte — qui en a le plus, y a-t-il assez de places — en comparant les nombres, et l'expliquer.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Un problème lu ensemble : « Aaron a 49 trombones dans sa trousse et Mia en a 53. Qui de Aaron ou de Mia a le plus de trombones ? »"),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "D'autres problèmes, dont celui du guide : « 68 élèves doivent partir au cinéma. Le car arrive, il peut transporter 75 élèves. Tous les élèves pourront-ils être transportés ? Explique pourquoi. »",
          "Fait écrire la comparaison avec un signe avant la réponse ; le matériel valide."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "10 min", "Mise en commun : la réponse à la question, et la comparaison qui la justifie."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "La bataille ou la file des nombres en autonomie, avec des nombres plus grands pour qui réussit."),
      ],
    },
    {
      titre: "Évaluation — comparer, ranger, encadrer",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : comparer deux nombres avec =, < et >, ranger cinq nombres, en intercaler et en encadrer, sous différentes écritures.",
      duree: 30,
      phases: [
        ph("Observation", "20 min", "Une évaluation courte : placer les signes, ranger cinq nombres, intercaler, encadrer, un problème. Pendant un jeu, écouter les justifications de chacun.",
          "Observe sans aider ; note les procédures : la dizaine, le nom du nombre, la bande numérique."),
        ph("Suite", "10 min", "La remédiation au matériel pour qui en a besoin ; en rituel, le nombre caché sur la bande et « plus grand, plus petit »."),
      ],
    },
  ],
};

// « Connaitre et utiliser diverses représentations d'un nombre et passer de
// l'une à l'autre », « Comparer et dénombrer des collections en les
// organisant » (programme de mathématiques du cycle 2, 2024). Le guide « Pour
// enseigner les nombres, le calcul et la résolution de problèmes au CP »
// (Éduscol, 2021) en donne le chemin, chapitre 1 et chapitre 4 : la dizaine
// d'abord, par un jeu de comparaison rapide où l'on groupe par cinq puis par
// dix ; la dizaine comme dix unités, avec des cubes emboîtables d'une même
// couleur ; l'écriture chiffrée qui code les dizaines puis les unités ; des
// collections partiellement groupées, à regrouper ; les unités de numération
// dans tous les sens (5 dizaines 6 unités, 6 unités 5 dizaines, 4 dizaines
// 16 unités) ; puis toutes les représentations, jusqu'à l'écriture en
// lettres. Le matériel multibase vient une fois la dizaine comprise.
const NUMERATION_DIZAINE: Demarche = {
  id: "numeration-dizaine-cp",
  nom: "Grouper par dix, écrire le nombre, passer d'une représentation à l'autre",
  famille: "Mathématiques",
  source: "Pour enseigner les nombres, le calcul et la résolution de problèmes au CP (guide fondamental, 2021), chapitre 1 « Quels systèmes de numération enseigner, pourquoi et comment ? » et chapitre 4 sur les matériels ; programme de mathématiques du cycle 2 (2024)",
  resume: "La dizaine d'abord : comparer très vite deux collections oblige à grouper par cinq, puis par dix. Avec des cubes emboîtables d'une seule couleur, une barre, c'est dix cubes, et on la défait. On écrit le nombre d'une collection en codant les dizaines puis les unités qui restent : 3 barres et 4 cubes, c'est 34. Des collections déjà en partie groupées, avec plus de dix cubes isolés, obligent à regrouper ; les unités de numération se lisent dans tous les sens — 6 unités 5 dizaines, 4 dizaines 16 unités. On passe enfin d'une représentation à l'autre : matériel, chiffres, nom, unités de numération, 30 + 4, lettres. Au CE1 et au CE2, le même chemin avec la centaine et le millier.",
  seances: [
    {
      titre: "Grouper pour dénombrer vite : le jeu des collections",
      objectifs: "À la fin de cette séance, les élèves sauront organiser une collection en groupes de cinq, puis de dix, pour comparer ou dénombrer sans compter un à un.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Le jeu du guide : deux collections de jetons montrées quelques secondes, puis cachées. « Où y a-t-il le plus de jetons ? » D'abord moins de quatre jetons, pour comprendre le jeu.",
          "Montre assez vite pour qu'on ne puisse pas compter un à un."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Neuf jetons de chaque côté, en désordre : tout le monde doit trouver, et c'est l'échec. La classe cherche une organisation : des groupes de cinq, comme sur le dé. Puis treize et quatorze jetons : plusieurs groupes de cinq. Puis quarante-deux et quarante-trois : deux groupes de cinq accolés font dix.",
          "La réussite doit être collective : c'est l'échec du premier essai qui pose le problème."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "Bilan : grouper par dix permet de comparer et de dénombrer sans compter un à un. Le mot « dizaine » est introduit. La feuille : entourer des paquets de dix cubes, puis écrire le nombre.",
          "Valide en mettant les groupes en correspondance, dizaine contre dizaine."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "D'autres collections en vrac à grouper par dix, en autonomie ; le jeu reprend en rituel les jours suivants."),
      ],
    },
    {
      titre: "La dizaine : dix cubes, une barre",
      objectifs: "À la fin de cette séance, les élèves sauront qu'une dizaine, c'est dix unités : former une barre de dix cubes, la défaire, et dire combien de dizaines et d'unités contient une collection.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Des cubes emboîtables d'une seule couleur : « Faites des barres de dix cubes. »",
          "Une seule couleur au début : la dizaine se voit comme dix cubes pareils."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Chacun forme des barres de dix avec ses cubes, compte les barres et les cubes qui restent ; puis casse une barre : il y a toujours le même nombre de cubes. 34 cubes, c'est 3 barres et 4 cubes, ou 2 barres et 14 cubes.",
          "Parle de dizaines aussi quand les cubes ne sont pas assemblés : dix cubes isolés font une dizaine."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "10 min", "La trace, l'affiche de la classe : dix cubes, c'est une barre, une dizaine ; 1 dizaine = 10 unités."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "« Montrez-moi 2 dizaines et 3 unités » : avec les cubes, puis avec les doigts de deux élèves et d'un troisième."),
      ],
    },
    {
      titre: "Écrire le nombre : les dizaines, puis les unités",
      objectifs: "À la fin de cette séance, les élèves sauront écrire en chiffres le nombre d'une collection de barres et de cubes : le chiffre des dizaines, puis celui des unités — 3 barres et 4 cubes, c'est 34.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Une collection au tableau : 3 barres et 4 cubes. « Comment écrire avec des chiffres combien il y a de cubes ? »"),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "La procédure du guide : organiser la collection en un maximum de dizaines, écrire le nombre de dizaines, puis celui des unités qui restent, accolés dans cet ordre. La feuille « Lire les cubes, écrire le nombre ».",
          "Fait dire « trois dizaines et quatre unités » avant le nom du nombre : l'écriture chiffrée n'est pas l'oral recopié, d'où des erreurs comme 304."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "Bilan : 34, c'est 3 dizaines et 4 unités ; le chiffre de gauche dit les dizaines. Pourquoi 23 n'est pas 32 : on construit les deux collections et on les compare."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Par deux : l'un dit « 4 dizaines 2 unités », l'autre montre le matériel et écrit 42 sur l'ardoise."),
      ],
    },
    {
      titre: "Des collections à regrouper : plus de dix unités",
      objectifs: "À la fin de cette séance, les élèves sauront dénombrer une collection partiellement groupée — 5 dizaines et 18 unités — en regroupant dix unités en une dizaine, et écrire son nombre.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Au tableau, 5 barres et 18 cubes : « Écrivez le nombre de cubes. » Certains écriront 518 : on en discute."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Regrouper dix cubes en une barre, ou échanger dix cubes contre une barre : 6 barres et 8 cubes, 68. La feuille « Des collections à regrouper ».",
          "Le matériel multibase ne se défait pas : on échange dix cubes contre une barre. Il vient une fois la dizaine comprise."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "Bilan : quand il y a plus de dix unités, elles font une dizaine de plus. 5 dizaines 18 unités = 6 dizaines 8 unités = 68."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Le jeu du banquier, par deux : on lance le dé, on prend autant de cubes, on échange dix cubes contre une barre ; le premier à 5 barres a gagné."),
      ],
    },
    {
      titre: "Les unités de numération dans tous les sens",
      objectifs: "À la fin de cette séance, les élèves sauront écrire en chiffres un nombre donné en unités de numération, dans l'ordre ou non, avec plus de dix unités ou non : 5 dizaines 6 unités, 6 unités 5 dizaines, 4 dizaines 16 unités.",
      duree: 45,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "« 6 unités 5 dizaines » au tableau : est-ce 65 ou 56 ?"),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Les exercices du guide, du plus simple au plus difficile : 5 dizaines 6 unités ; 6 unités 5 dizaines ; 4 dizaines 16 unités ; 16 unités 4 dizaines. On dessine les cubes, puis on écrit en chiffres. La feuille « Faire un nombre de plusieurs façons ».",
          "D'abord avec le matériel, puis le matériel ne sert plus qu'à valider."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "15 min", "Bilan : c'est le nom de l'unité qui compte, pas sa place dans la phrase ; dix unités font une dizaine. Un même nombre se fait de plusieurs façons : 3 barres et 4 cubes, 2 barres et 14 cubes, 34 cubes."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Le problème du programme, à la mesure de la classe : il faut 34 cubes, avec des barres de dix et des cubes seuls ; trouve trois façons."),
      ],
    },
    {
      titre: "D'une représentation à l'autre",
      objectifs: "À la fin de cette séance, les élèves sauront passer d'une représentation d'un nombre à une autre : barres et cubes, écriture en chiffres, nom à l'oral, unités de numération, 30 + 4, écriture en lettres.",
      duree: 40,
      phases: [
        ph("Temps 1 – Définition des objectifs et mise en réussite", "5 min", "Un même nombre montré de six façons : 3 barres et 4 cubes ; 34 ; « trente-quatre » ; 3 dizaines 4 unités ; 30 + 4 ; trente-quatre écrit en lettres."),
        ph("Temps 2 – Mise en activité des élèves", "20 min", "Relier des dessins de cubes à des écritures ; lire un nombre écrit en chiffres et l'écrire en lettres. La feuille « D'une représentation à l'autre ».",
          "Différencie par la taille des nombres ; le matériel reste à disposition."),
        ph("Temps 3 – Institutionnalisation, retour réflexif", "10 min", "Bilan : toutes ces écritures désignent le même nombre. L'affiche de la classe est complétée."),
        ph("Temps 4 – Automatisation, réinvestissement, transfert", "5 min", "Le mémory des écritures, par deux : retrouver les cartes qui désignent le même nombre."),
      ],
    },
    {
      titre: "Évaluation — dénombrer et représenter les nombres",
      objectifs: "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : écrire le nombre d'une collection de barres et de cubes, même à regrouper, et passer d'une écriture à l'autre.",
      duree: 30,
      phases: [
        ph("Observation", "20 min", "Une évaluation courte : écrire en chiffres, en unités de numération et en décomposition le nombre de collections dessinées, dont certaines à regrouper.",
          "Observe les procédures : grouper par dix, compter un à un, échanger."),
        ph("Suite", "10 min", "La remédiation au matériel pour qui en a besoin ; en rituel, montrer un nombre en barres et en cubes, et le dire en dizaines et unités."),
      ],
    },
  ],
};

export const DEMARCHES: Demarche[] = [
  EDUSCOL_QUATRE_TEMPS, ENSEIGNEMENT_EXPLICITE,
  LECTURE_CODE, LECTURE_FLUENCE, COMPREHENSION, ECRITURE_GESTE, ECRITURE_REDIGER, ORAL, VOCABULAIRE, GRAMMAIRE,
  PROBLEMES, CALCUL_MENTAL, GEOMETRIE_GRANDEURS,
  INVESTIGATION, ENQUETE_HISTOIRE_GEO, EMC_DEBAT,
  ARTS_PLASTIQUES, MUSIQUE, HISTOIRE_DES_ARTS, EPS_MODULE, LANGUES_VIVANTES,
  MATERNELLE_MODALITES, PHONOLOGIE, CATEGORISER, COLLECTIONS, CHRONOLOGIE, COMPARER_NOMBRES, NUMERATION_DIZAINE,
];

export const demarcheDe = (id: string) => DEMARCHES.find((d) => d.id === id);

/** Les démarches groupées par famille, pour un menu qui se lit. */
export const demarchesParFamille = () =>
  FAMILLES.map((famille) => ({ famille, demarches: DEMARCHES.filter((d) => d.famille === famille) }))
    .filter((g) => g.demarches.length > 0);

/** Ce qu'il faut savoir d'une compétence pour lui proposer une démarche. */
export interface CibleDemarche {
  domaineTitre: string;
  sousDomaineTitre?: string | null;
  competenceTitre?: string | null;
}

const plat = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * La démarche à proposer d'après la compétence visée.
 *
 * Le référentiel dit le cycle, le domaine dit la discipline, le sous-domaine
 * dit le guide — « Lecture » n'appelle pas la même démarche que « Grammaire
 * et orthographe » —, et l'intitulé de la compétence tranche quand un
 * sous-domaine en cache deux : « Lecture » au cycle 2, c'est le code ou la
 * fluence ou la compréhension. Rien ne s'impose : c'est une proposition,
 * le menu reste ouvert.
 */
export function demarcheSuggeree(cible: CibleDemarche | string, referentielNom = ""): Demarche {
  const c = typeof cible === "string" ? { domaineTitre: cible } : cible;
  return demarcheDe(idSuggere(plat(c.domaineTitre), plat(c.sousDomaineTitre), plat(c.competenceTitre), plat(referentielNom)))
    ?? DEMARCHES[0];
}

function idSuggere(dom: string, sd: string, comp: string, ref: string): string {
  if (/\beps\b|physique et sportive|activite(s)? physique/.test(`${dom} ${sd}`)) return "eps-module";
  const maternelle = /cycle 1|maternelle/.test(ref)
    || /mobiliser le langage|premiers outils mathematiques|explorer le monde|se reperer dans le temps et l'espace/.test(dom);
  if (maternelle) {
    if (/oral a l'ecrit|apprendre a ecrire|principe alphabetique|phonolog/.test(sd) || /syllabe|phoneme|rime\b/.test(comp)) return "phonologie";
    if (/organiser les mots|mots en categorie/.test(comp)) return "categoriser-maternelle";
    if (/cardinal donne/.test(comp)) return "collections-maternelle";
    if (/chronologie|deroulement d.evenements|etapes d.un processus|ordonner entre eux des moments/.test(comp)) return "chronologie-maternelle";
    if (/vocabulaire|lexique|mots nouveaux/.test(`${sd} ${comp}`)) return "vocabulaire";
    if (/plastique|arts visuels/.test(sd)) return "arts-plastiques";
    if (/univers sonore/.test(sd)) return "musique";
    if (/resoudre des problemes/.test(sd)) return "problemes";
    if (/solides|formes planes|grandeurs|motifs/.test(sd)) return "geometrie-grandeurs";
    if (/vivant|matiere|objets/.test(`${dom} ${sd}`)) return "investigation";
    return "maternelle-modalites";
  }
  if (/francais/.test(dom)) {
    if (/^lecture/.test(sd)) {
      if (/decod|encod|syllab|grapheme|correspondance|\bcgp\b|lettres?\b/.test(comp)) return "lecture-code";
      if (/fluen|voix haute|expressiv|prosod|mots par minute|mclm/.test(comp)) return "lecture-fluence";
      return "comprehension";
    }
    if (/^ecriture/.test(sd)) return /geste|cursive|copi|trac|lisib|\bmain\b|clavier|fluide/.test(comp) ? "ecriture-geste" : "ecriture-rediger";
    if (/^oral/.test(sd)) return "oral";
    if (/vocabulaire/.test(sd)) return "vocabulaire";
    if (/grammaire|orthographe|langue/.test(sd)) return "grammaire";
    return "eduscol-quatre-temps";
  }
  if (/mathematiques/.test(dom)) {
    if (/grandeurs|geometrie|espace/.test(sd)) return "geometrie-grandeurs";
    if (/donnees|probabilit|proportionnalite/.test(sd) || /probleme/.test(comp)) return "problemes";
    // Dénombrer en groupant par dix, passer d'une représentation du nombre à l'autre : le chemin du guide CP, de la dizaine
    // aux unités de numération — au cycle 2 ; le cycle 3 travaille les grands nombres et les décimaux autrement.
    if (/denombrer|representations? d.un nombre|unites de numeration|valeur des chiffres|cardinal donne/.test(comp)
      && !/fraction|decima/.test(comp) && !/cycle 3/.test(ref)) return "numeration-dizaine-cp";
    // Comparer, ranger, encadrer des entiers : la séquence du guide CP, par l'écriture chiffrée — pas les fractions ni les décimaux.
    if (/comparer|encadrer|intercaler|ordonner des nombres|ranger des nombres|ordre (de)?croissant/.test(comp) && !/fraction|decima/.test(comp)) return "comparer-nombres-cp";
    // Un fait numérique ou une procédure de calcul : ce qui s'entraîne chaque jour au procédé La Martinière.
    if (/calcul mental/.test(sd) || /mental|faits? numeriques|tables? (d'addition|de multiplication)|complements?\b|dizaine superieure|doubles?\b|moities?\b|ajouter ou soustraire|retrancher|calculer? (en ligne|de tete)/.test(comp)) return "calcul-mental-martiniere";
    return "eduscol-quatre-temps";
  }
  if (/sciences|technologie|questionner le monde/.test(dom)) return "investigation";
  if (/histoire|geographie/.test(dom)) return "enquete-histoire-geo";
  if (/moral et civique|\bemc\b/.test(dom)) return "emc-debat";
  if (/artistique|\barts\b/.test(dom)) {
    if (/musical|musique/.test(sd)) return "musique";
    if (/histoire des arts/.test(sd)) return "histoire-des-arts";
    return "arts-plastiques";
  }
  if (/langues? vivante/.test(dom)) return "langues-vivantes";
  return "eduscol-quatre-temps";
}

/** Le tableau de déroulement d'une séance : l'en-tête, puis une ligne par phase. */
export function tableauDesPhases(phases: PhaseCadre[]): string[][] {
  return [
    [...ENTETE_TABLEAU],
    ...phases.map((p) => [p.phase, p.duree, p.description, p.posture]),
  ];
}

/**
 * Les séances que le cadre pose sur une séquence.
 *
 * Numérotées à la suite de ce qui existe déjà : poser un cadre sur une
 * séquence qui a une séance ne la renumérote pas. Le déroulement libre reste
 * vide — c'est le tableau qui porte la structure, et le texte reste à
 * l'enseignant.
 */
export function seancesDuCadre(demarche: Demarche, sequenceId: string, depuis = 1): Seance[] {
  return demarche.seances.map((s, i) => ({
    id: newId(),
    titre: s.titre,
    numero: depuis + i,
    objectifs: s.objectifs,
    competences: "[]",
    deroulement: "",
    materiel: "",
    duree: s.duree,
    date: null,
    tableauDeroulement: JSON.stringify(tableauDesPhases(s.phases)),
    imagesDeroulement: "[]",
    bilan: "",
    bilanDate: null,
    sequenceId,
    dateMaj: "",
  }));
}

/** Ce que la fiche annonce avant de poser le cadre : « 5 séances, 2 h 20 ». */
export function resumeDuCadre(demarche: Demarche): string {
  const n = demarche.seances.length;
  const total = demarche.seances.reduce((acc, s) => acc + s.duree, 0);
  const h = Math.floor(total / 60);
  const min = total % 60;
  const duree = h ? `${h} h${min ? ` ${String(min).padStart(2, "0")}` : ""}` : `${min} min`;
  return `${n} séance${n > 1 ? "s" : ""}, ${duree} au total`;
}
