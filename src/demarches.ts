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
// à compléter, jamais un contenu inventé pour l'enseignant.
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

import { newId, type Seance } from "./api";

/** Une ligne du tableau de déroulement, dans l'ordre de ses colonnes. */
export interface PhaseCadre {
  phase: string;
  duree: string;
  description: string;
  posture: string;
}

/** Une séance telle que la démarche la prévoit, avant qu'on l'écrive. */
export interface SeanceCadre {
  titre: string;
  /** Ce que la séance doit obtenir, dans les mots du guide. */
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
      objectifs: "Objectif : … (à écrire tel qu'il sera annoncé aux élèves).\nCritère de réussite : l'élève …",
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
      objectifs: "Effectuer seul plusieurs cas de plus en plus variés. Matériel de manipulation à disposition de qui en a besoin.",
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
      objectifs: "Les élèves, progressivement selon leur maîtrise, effectuent plusieurs cas de manière autonome.",
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
      objectifs: "Évaluation courte et fréquente : identifier réussites, progrès et besoins. Les élèves savent qu'ils peuvent répondre directement pour ce qu'ils trouvent facile.",
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
      objectifs: "Séance courte, tout au long de l'année : la procédure réinvestie dans d'autres situations, rituels compris.",
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
      objectifs: "Mettre les élèves « en mouvement », leur permettre de prendre des repères, de construire du sens par une première expérience authentique.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "Entrée dans l'activité : …", posture: "Installe un cadre apaisé et des repères." },
        { phase: "Situation de découverte", duree: "25 min", description: "Première expérience de l'activité, telle qu'elle est : …", posture: "Observe ce que les élèves savent déjà faire — c'est l'évaluation diagnostique." },
        { phase: "Bilan", duree: "10 min", description: "Ce qu'on a compris de l'activité, ce qu'il faudra apprendre.", posture: "Fait dire, sans corriger encore." },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "La situation porteuse des enjeux de formation du module, dans son entier.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "La situation de référence du module : …", posture: "Relève les difficultés qui reviennent : elles font la séance suivante." },
        { phase: "Bilan", duree: "10 min", description: "Ce qui a marché, ce qui bloque.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "Des situations ciblées visant à consolider des acquis ou à remédier aux difficultés constatées.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "Ateliers sur les difficultés relevées : …", posture: "Différencie : chacun travaille ce qui lui manque." },
        { phase: "Retour à la situation complexe", duree: "10 min", description: "On rejoue la situation de référence : ce qui a changé.", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situation complexe",
      objectifs: "Retour à la situation de référence : mesurer les progrès.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situation complexe", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Apprentissage — situations ciblées",
      objectifs: "Consolider ce qui reste fragile avant l'évaluation.",
      duree: 45,
      phases: [
        { phase: "Mise en train", duree: "10 min", description: "…", posture: "" },
        { phase: "Situations ciblées", duree: "25 min", description: "…", posture: "" },
        { phase: "Bilan", duree: "10 min", description: "…", posture: "" },
      ],
    },
    {
      titre: "Évaluation — bilan des savoirs",
      objectifs: "Bilan des savoirs construits par les élèves. La situation d'évaluation est attentive à deux choses : la part d'inédit par rapport aux entraînements, et l'accessibilité pour toutes et tous.",
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
      objectifs: "À la fin de la séance, l'élève sait … Il l'a vu faire, puis fait avec l'enseignant.",
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
      objectifs: "Répéter la procédure sur des cas proches, en réduisant l'aide.",
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
      objectifs: "Un pas de plus vers le complexe, sans surcharge : une seule nouveauté.",
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
      objectifs: "Révision fréquente pour la mémoire à long terme, puis évaluation de ce qui a été enseigné explicitement.",
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
      objectifs: "Lire avec précision les syllabes qui contiennent le graphème étudié : … L'objectif est la précision du décodage, pas la vitesse.",
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
      objectifs: "Décoder des mots entièrement déchiffrables avec les graphèmes connus : … puis les écrire.",
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
      objectifs: "Lire des phrases puis un court texte déchiffrable ; comprendre ce qu'on lit et le manifester.",
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
      objectifs: "Apprendre à écrire des mots et des phrases en développant l'observation et l'attention : la dictée est un temps d'apprentissage, pas d'évaluation.",
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
      objectifs: "Automatiser : précision et vitesse de lecture pour les groupes 1 et 2, prosodie pour les groupes 3 et 4 — selon le profil de lecteur (mots correctement lus par minute).",
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
      objectifs: "Découvrir la grille de la semaine (graphèmes à réviser, syllabes, pseudo-mots, mots) et les outils pour réussir. Évaluation chronométrée sur la grille de la semaine précédente.",
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
      objectifs: "Lire la grille le plus vite possible, sans erreur, en trinômes : chronométreur, vérificateur, lecteur.",
      duree: 20,
      phases: [
        ph(T4, "20 min", "Lecture chronométrée de la grille en autonomie, score noté sur le tableau ; outils : chronomètre, minuteur, chuchoteur ; outils numériques quand la fluence a progressé.",
          "Travaille en atelier guidé avec un autre groupe pendant ce temps."),
      ],
    },
    {
      titre: "Jour 3 — atelier guidé : évaluation intermédiaire",
      objectifs: "Mesurer les progrès sur la grille du jour 1 et consolider ; copier en cursive tout ou partie de la liste.",
      duree: 30,
      phases: [
        ph(T1, "5 min", "Relecture non chronométrée de la grille (évaluation intermédiaire)."),
        ph(T2, "20 min", "Évaluation chronométrée avec l'enseignant ; copie en écriture cursive de tout ou partie de la liste ; jeux d'entraînement."),
        ph(T3, "5 min", "Synthèse des acquis, point sur les difficultés ; objectif de l'entraînement autonome du jour 4."),
      ],
    },
    {
      titre: "Jour 4 — entraînement autonome et lecture de phrases",
      objectifs: "Réinvestir la grille dans des phrases ; préparer la lecture par binôme (lecteur / auditeur-évaluateur).",
      duree: 20,
      phases: [
        ph(T4, "20 min", "Lecture des phrases préparées ; grille d'autoévaluation : on entend les espaces, la ponctuation, les liaisons.",
          "Donne un « coup d'avance » aux élèves proches du groupe supérieur : les phrases du lendemain."),
      ],
    },
    {
      titre: "Prosodie — lire avec expressivité",
      objectifs: "Lire par groupes de souffle, respecter la ponctuation et les liaisons, mettre la voix au service du sens (groupes 3 et 4).",
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
      objectifs: "Parcourir le texte de manière rigoureuse et ordonnée, identifier les informations clés et les relier ; formuler des hypothèses.",
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
      objectifs: "Faire émerger une stratégie de compréhension (faire des liens, inférer, se représenter la scène, repérer les substituts…) et montrer comment on comprend un texte.",
      duree: 30,
      phases: [
        ph("Objectif et modelage", "10 min", "La stratégie est nommée ; le professeur lit un extrait court et dit tout haut comment il comprend.", "Montre à voir comment on comprend."),
        ph("Pratique guidée", "15 min", "Même stratégie sur un nouvel extrait court, ensemble puis en binômes ; justification avec le texte."),
        ph("Retour", "5 min", "Quand utiliser cette stratégie ? Ajoutée à l'affiche des stratégies."),
      ],
    },
    {
      titre: "Lecture autonome et questions",
      objectifs: "Découvrir seul un texte plus simple ; élaborer des questions ; répondre en cherchant des indices dans le texte.",
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
      objectifs: "Manifester sa compréhension par des représentations : dessin, mise en scène, jeu théâtral, titres de paragraphes.",
      duree: 30,
      phases: [
        ph("Choisir une représentation", "5 min", "Dessiner la scène, mettre en scène avec des marionnettes, jouer le dialogue, titrer les paragraphes."),
        ph("Réaliser", "15 min", "Par groupes, avec le texte sous les yeux.", "Fait vérifier dans le texte ce que la représentation affirme."),
        ph("Confronter", "10 min", "Les représentations comparées : ce qui est dans le texte, ce qui a été inventé."),
      ],
    },
    {
      titre: "Écrire à partir du texte",
      objectifs: "Associer lecture et écriture : inventer la suite, écrire ce que pense un personnage, résumer.",
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
      objectifs: "Tracer la lettre … et la relier aux autres : le geste mémorisé par le corps avant le cahier. Deux séances quotidiennes de 10 à 20 minutes selon la période.",
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
      objectifs: "Lier les lettres pour écrire des syllabes puis des mots avec fluidité, en levant le crayon le moins possible.",
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
      objectifs: "Copier rapidement et sans erreur une phrase préalablement lue : découper en empans, repérer les difficultés, respecter la présentation.",
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
      objectifs: "Entretenir le geste : lettres, enchaînements et mots de la semaine, chaque jour.",
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
      objectifs: "Se construire une vue d'ensemble du texte : le but, le genre, le destinataire, ce qu'on doit dire et comment le dire.",
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
      objectifs: "Écrire un premier jet en s'appuyant sur les outils de la classe (répertoires, affiches, textes) : de l'écriture tâtonnée à la composition.",
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
      objectifs: "Revenir sur l'écrit produit, différé dans le temps : l'adéquation au projet d'abord, puis le point d'orthographe travaillé en classe.",
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
      objectifs: "Le texte réécrit et mis au propre pour son destinataire : le chef-d'œuvre du projet d'écriture.",
      duree: 30,
      phases: [
        ph("Réécriture", "20 min", "Prise en compte des révisions ; mise au propre, manuscrite ou tapée."),
        ph("Publication", "10 min", "Le texte donné à lire, affiché, envoyé, lu à voix haute.", "Un destinataire réel : pas le professeur."),
      ],
    },
    {
      titre: "Écrit court quotidien",
      objectifs: "Écrire chaque jour, dès le CP : phrase du jour, jogging d'écriture, charade, légende — sans réécriture, l'évaluation au long cours.",
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
      objectifs: "Une première production dans le genre d'oral retenu (récit, exposé, débat, interview…), enregistrée ou filmée : elle sert de point de départ.",
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
      objectifs: "Écouter les productions, repérer ce qui fait un bon récit / exposé / débat ; garder une trace écrite de l'analyse.",
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
      objectifs: "Des situations d'enseignement correspondant aux compétences à renforcer ; les élèves associés au sens et au but.",
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
      objectifs: "Une deuxième compétence renforcée ; entraînement à la production complète.",
      duree: 30,
      phases: [
        ph("Rituel d'ouverture", "5 min", "Relecture de la trace écrite."),
        ph("Situation ciblée", "20 min", "Une autre compétence travaillée, puis une production complète d'entraînement."),
        ph("Bilan", "5 min", "Ce qu'il reste à améliorer avant la production finale."),
      ],
    },
    {
      titre: "Production finale",
      objectifs: "Mesurer les progrès : évaluation prenant appui sur les critères de réussite adossés à la trace écrite ; commenter ses productions, observer celles des pairs.",
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
      objectifs: "Découvrir les mots en contexte (littérature, projet de classe, autre discipline) et les collecter. Corpus visé : … (les mots à acquérir par tous en gras).",
      duree: 20,
      phases: [
        ph("Rencontre", "15 min", "Au fil de la lecture ou de l'activité, les mots sont entendus, employés, expliqués en situation.",
          "Anticipe les mots qu'il veut faire comprendre et utiliser ; verbalise, reformule."),
        ph("Collecte", "5 min", "Prise de notes par le professeur en vue des outils individuels ou collectifs (affiche, boîte à mots)."),
      ],
    },
    {
      titre: "Étape 2 — catégoriser",
      objectifs: "Structurer le lexique : regrouper, classer, trier les mots collectés selon le sens (familles, contraires, synonymes) ou la forme, en justifiant.",
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
      objectifs: "Construire les réseaux sémantiques et morphologiques, enrichir le corpus initial ; outil de référence individuel ou collectif.",
      duree: 30,
      phases: [
        ph("Rappel", "5 min", "Les catégories retenues relues."),
        ph("Enrichir", "15 min", "Nouveaux mots ajoutés aux catégories (dérivés, contraires, synonymes) ; corolle lexicale ou affiche complétée."),
        ph("Outil individuel", "10 min", "Chaque élève complète son cahier de mots : mot, catégorie, phrase, dessin."),
      ],
    },
    {
      titre: "Étape 3 — réactiver par le jeu",
      objectifs: "Entraîner et manipuler le corpus pour le mémoriser : la mémorisation passe par un apprentissage répété à intervalles réguliers.",
      duree: 15,
      phases: [
        ph("Jeu", "15 min", "Loto, memory, mime, devinettes, « quart d'heure des mots » ; les mots prononcés dans un contexte pertinent.",
          "Emploie intentionnellement les mots dans la vie de la classe ; y revient à quelques jours puis à quelques semaines."),
      ],
    },
    {
      titre: "Étape 3 — réinvestir à l'oral et à l'écrit",
      objectifs: "Transférer : employer les mots dans une production orale puis écrite (légender une image, écrire une phrase, raconter).",
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
      objectifs: "Comprendre un fonctionnement par l'analogie : classer, trier des éléments choisis pour le fait de langue étudié (…), avec justification.",
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
      objectifs: "Utiliser systématiquement la comparaison, le remplacement et les autres manipulations syntaxiques (déplacement, suppression, ajout) pour identifier et vérifier.",
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
      objectifs: "Institutionnaliser : la leçon co-construite, avec des exemples prototypiques et les manipulations qui permettent de vérifier.",
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
      objectifs: "Activités collectives courtes et régulières de réinvestissement : écrire sous la dictée, analyser les graphies proposées, argumenter.",
      duree: 20,
      phases: [
        ph("Rituel", "15 min", "Dictée courte (une phrase) ; analyse des graphies, erronées ou non ; solutions alternatives plausibles argumentées avec le métalangage.",
          "Donne sa place au raisonnement en toute occasion."),
        ph("Retour", "5 min", "Ce qui a été réussi ; la règle relue."),
      ],
    },
    {
      titre: "Consolider en groupes de besoin",
      objectifs: "Situations de structuration en groupes restreints pour les élèves ayant les mêmes besoins.",
      duree: 20,
      phases: [
        ph("Groupe de besoin", "20 min", "Reprise avec matériel (étiquettes, phrases à manipuler) pour ceux qui hésitent ; exercices plus ouverts pour les autres."),
      ],
    },
    {
      titre: "Transférer en écriture",
      objectifs: "Mobiliser la notion à bon escient en écriture autonome : vigilance orthographique sur le point travaillé.",
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
      objectifs: "Résoudre un problème de … (parties-tout, comparaison, …) en quatre phases : comprendre, modéliser, calculer, répondre.",
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
      objectifs: "Faire des analogies entre un nouveau problème et les problèmes résolus précédemment ; matériel et schémas pour qui en a besoin.",
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
      objectifs: "Huit problèmes en une vingtaine de minutes : réponse rapide sur l'ardoise, correction immédiate — nourrir la mémoire des problèmes résolus.",
      duree: 20,
      phases: [
        ph("Problèmes rapides", "20 min", "Chaque problème lu deux fois ; réflexion ; réponse à l'ardoise au signal ; correction et justification immédiates.",
          "Une dizaine de problèmes par semaine au minimum."),
      ],
    },
    {
      titre: "Problèmes en deux étapes",
      objectifs: "Planifier les étapes de résolution ; qualifier les résultats intermédiaires (ce que représente chaque grandeur).",
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
      objectifs: "Écrire un problème avec des contraintes : un autre regard sur la question et sur l'intention de l'auteur.",
      duree: 30,
      phases: [
        ph("Contraintes", "5 min", "Catégorie imposée, nombres imposés, ou un schéma donné."),
        ph("Écriture", "15 min", "Écrire l'histoire et la question ; le résoudre."),
        ph("Échange", "10 min", "Problèmes échangés et résolus par un camarade."),
      ],
    },
    {
      titre: "Évaluation",
      objectifs: "Trois ou quatre problèmes de la séquence : identifier réussites et besoins, phase par phase.",
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
      objectifs: "Construire le fait ou la procédure visés : les chercher, expliciter et comparer les démarches, retenir la plus sûre et la plus rapide, l'écrire.",
      duree: 45,
      phases: [
        ph("Échauffement", "5 min", "Une activité très courte qui réactive un fait déjà su — un furet, trois calculs à l'ardoise — : tous réussissent."),
        ph("Entraînement", "10 min", "Au procédé La Martinière, les faits sur lesquels s'appuie la procédure du jour (pour les presque-doubles : les doubles)."),
        ph("Recherche", "20 min", "Un calcul à chercher seul, l'écrit permis sur le cahier de recherche ; mise en commun : chacun montre et dit sa démarche, juste ou non ; on compare les procédures et on les hiérarchise — la plus sûre, la plus rapide, et quand elle marche.",
          "Écrit ce que dit l'élève sans l'interpréter ; cherche avec la classe la cause des erreurs."),
        ph("Trace écrite", "10 min", "La procédure retenue, son domaine d'efficacité et un exemple, écrits juste : cahier de leçons ou affiche de la classe."),
      ],
    },
    {
      titre: "Appropriation — La Martinière (1)",
      objectifs: "S'approprier le fait ou la procédure : une série courte, à l'oral, en disant comment on calcule.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Les faits d'appui de la procédure, révisés à l'ardoise."),
        ph("Série La Martinière", "10 min", "Dix calculs. Chacun est dit deux fois ; réflexion sans écrire, cinq secondes ; « Écrivez ! » — la réponse, rien d'autre ; « Montrez ! » — les ardoises se lèvent ensemble ; la réponse est dite, on corrige, on passe au suivant.",
          "Fait expliciter une procédure toutes les trois ou quatre questions ; note les erreurs qui reviennent."),
      ],
    },
    {
      titre: "Entraînement — La Martinière (2)",
      objectifs: "Entraîner le fait ou la procédure sous d'autres formes : égalités à trou, nombres plus grands, énoncé en mots.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Trois calculs de la veille."),
        ph("Série La Martinière", "10 min", "Une nouvelle série, variée : égalités à trou, nombres plus grands.",
          "Différencie par le temps de réflexion ou la difficulté des calculs ; le matériel reste sous la main de qui en a besoin."),
      ],
    },
    {
      titre: "Automatisation — La Martinière (3)",
      objectifs: "Restituer vite et juste : que le fait ou la procédure deviennent automatiques.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "Un fait voisin, en furet ou à l'ardoise."),
        ph("Série La Martinière", "10 min", "Une série au temps de réflexion raccourci ; chacun note son score.",
          "Les plus à l'aise calculent sans écrire les étapes : l'automatisation n'est pas visée au même moment pour tous."),
      ],
    },
    {
      titre: "Réinvestissement — petits problèmes",
      objectifs: "Retrouver le fait ou la procédure dans un autre contexte : de petits problèmes, un jeu.",
      duree: 15,
      phases: [
        ph("Échauffement", "5 min", "La fluence du jour : une série courte, écrite, en temps limité."),
        ph("Problèmes", "10 min", "Deux ou trois petits problèmes qui appellent la procédure, à l'ardoise ; ou un jeu par deux — cartes de calcul, le compte est bon."),
      ],
    },
    {
      titre: "Évaluation — test de fluence",
      objectifs: "Mesurer et voir ses progrès : combien de calculs justes en temps limité, l'attendu de fin d'année en tête.",
      duree: 15,
      phases: [
        ph("Test", "5 min", "Une série écrite en temps limité, seul."),
        ph("Correction", "5 min", "Corrigé projeté ; chacun compte ses réussites et les reporte sur sa fiche de suivi."),
        ph("Suite", "5 min", "Ce qui est su, ce qui reste à reprendre ; le fait reviendra plus tard dans des séries de révision, pour s'ancrer."),
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
      objectifs: "Donner du sens à la grandeur ou à l'objet géométrique par la manipulation d'objets réels : comparer directement, trier, décrire avec ses mots.",
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
      objectifs: "Tracer, construire, reproduire avec les instruments (règle, équerre, compas, gabarit) ou mesurer avec l'unité et l'instrument ; produire des écrits intermédiaires.",
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
      objectifs: "L'écrit de savoir arrive après les constructions : définition, propriété, référence (un litre, c'est la brique de lait ; un kilogramme, c'est …).",
      duree: 30,
      phases: [
        ph("Formulation", "10 min", "Ce qu'on a établi, dit par les élèves.", "Figures non prototypiques dans la trace : le carré n'est pas toujours posé sur un côté."),
        ph("Trace écrite et affichage", "15 min", "Définition ou propriété ; références concrètes ; affichage fonctionnel avec les objets réels."),
        ph("Réutiliser", "5 min", "La trace utilisée pour répondre à une question."),
      ],
    },
    {
      titre: "Réinvestir dans des problèmes",
      objectifs: "Résoudre des problèmes relatifs aux grandeurs ou aux figures : chercher, modéliser, représenter, raisonner, calculer, communiquer.",
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
      objectifs: "Gammes courtes et régulières : reconnaître, nommer, estimer, convertir, tracer vite.",
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
      objectifs: "Une situation qui conduit à un questionnement productif ; les conceptions initiales exprimées et confrontées.",
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
      objectifs: "Formuler des hypothèses, concevoir ce qui permettra de les valider ou de les invalider.",
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
      objectifs: "Expérimentation directe, réalisation matérielle, observation, recherche documentaire ou enquête — l'action directe des élèves privilégiée.",
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
      objectifs: "Comparer et mettre en relation les résultats des groupes ; confronter au savoir établi ; formuler les connaissances nouvelles.",
      duree: 45,
      phases: [
        ph("Comparaison des résultats", "15 min", "Résultats des groupes mis en relation ; causes d'un éventuel désaccord ; expériences complémentaires proposées."),
        ph("Confrontation au savoir établi", "15 min", "Documents, à des niveaux de formulation accessibles.", "Fait distinguer ce qu'on a observé et ce qu'on sait maintenant."),
        ph("Formulation écrite", "15 min", "Les connaissances nouvelles écrites par les élèves avec l'aide du maître ; trace au cahier."),
      ],
    },
    {
      titre: "Communication",
      objectifs: "Réaliser une production destinée à communiquer le résultat : texte, graphique, maquette, document multimédia.",
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
      objectifs: "Poser la question de la séquence ; proposer des réponses à partir de ce qu'on connaît et de ses représentations.",
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
      objectifs: "Les hypothèses deviennent des faits quand elles se fondent sur des données vérifiées : documents, traces, étude de cas.",
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
      objectifs: "Le récit de l'enseignant replace l'exemple dans son contexte ; repères sur la frise chronologique et sur la carte.",
      duree: 30,
      phases: [
        ph("Récit", "15 min", "Récit historique ou description géographique par l'enseignant.", "Distingue l'histoire de la fiction ; nomme les acteurs."),
        ph("Repères", "15 min", "Frise, carte de la région et carte de France complétées ; changement d'échelle."),
      ],
    },
    {
      titre: "Élaboration de l'explication",
      objectifs: "Rassembler l'ensemble des faits sous une forme choisie : texte, croquis, chronologie, schéma fléché.",
      duree: 30,
      phases: [
        ph("Explication", "20 min", "Trace écrite élaborée avec les élèves, en réponse à la question de la séquence.", "Fait justifier chaque étape de la démarche."),
        ph("Relecture", "10 min", "Vocabulaire et repères à retenir."),
      ],
    },
    {
      titre: "Évaluation",
      objectifs: "Répondre à une question proche en justifiant sa démarche à partir d'un document.",
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
      objectifs: "Faire émerger une question qui permet la controverse, entre des positions également défendables : dimension sociale, cognitive, psychologique.",
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
      objectifs: "Distinguer et articuler la position prise, les arguments qui l'étayent et les exemples ; anticiper les contre-arguments.",
      duree: 45,
      phases: [
        ph("Recherche", "20 min", "Documents, entretiens, rencontres ; corpus exploité."),
        ph("Argumentaire", "20 min", "Position, arguments, exemples ; contre-arguments et réponses.", "Apprentissage explicite : distingue l'argument de l'exemple."),
        ph("Préparation", "5 min", "Rôles distribués : modérateur, secrétaire, évaluateurs."),
      ],
    },
    {
      titre: "Le débat",
      objectifs: "Exprimer son point de vue dans un échange régi par des règles, écouter, comprendre le point de vue de l'autre, chercher à convaincre en argumentant.",
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
      objectifs: "Un court scénario, un protagoniste confronté à un choix, une question en termes de devoir — « que devrait faire … ? » : choisir et justifier.",
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
      objectifs: "Auto-évaluation confrontée aux retours des évaluateurs et du groupe ; institutionnalisation des savoirs en jeu.",
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
      objectifs: "Une incitation (mot, image, objet, contrainte, matériau) qui enclenche une pratique intuitive autour de la question travaillée : …",
      duree: 45,
      phases: [
        ph("Incitation", "5 min", "Proposition donnée ; matériaux et outils à disposition.", "Installe une ambiance propice à la recherche ; ne montre pas de modèle à reproduire."),
        ph("Pratique exploratoire", "30 min", "Chacun explore, expérimente, essaie ; micro-projet personnel.", "Observe, relance par une question, n'intervient pas sur la production."),
        ph("Premiers mots", "10 min", "Productions regardées ensemble : ce qu'on a fait, comment."),
      ],
    },
    {
      titre: "Verbalisation et références",
      objectifs: "Mettre en mots la pratique (éléments du langage plastique), recevoir les productions des autres élèves et des œuvres d'artistes liées à la question.",
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
      objectifs: "Développer une intention et y répondre : des choix (matériaux, formats, gestes) et des acquisitions techniques au service de l'intention.",
      duree: 45,
      phases: [
        ph("Intention", "5 min", "Chacun dit ce qu'il veut faire, à partir de la séance précédente."),
        ph("Réalisation", "30 min", "Projet mené ; technique apportée quand elle sert l'intention.", "Aide à tenir l'intention ; apporte la technique à ce moment-là."),
        ph("Regard", "10 min", "Où en est-on ? Ce qu'il reste à faire."),
      ],
    },
    {
      titre: "Finalisation et exposition",
      objectifs: "Achever, présenter, regarder, échanger : la diversité des réponses possibles à la question.",
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
      objectifs: "Écouter une œuvre : rencontre sensible, affinement de la perception et appropriation d'éléments de langage musical, mémorisation.",
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
      objectifs: "Apprendre le chant … : échauffement, découverte, apprentissage par phrases, mise en chœur.",
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
      objectifs: "Interpréter : nuances, intentions, diction au service du sens ; mobiliser le corps, le visage, le regard.",
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
      objectifs: "Explorer sa voix, les sons, les objets sonores ; imaginer et organiser une courte production ; la coder.",
      duree: 30,
      phases: [
        ph("Exploration", "10 min", "Jeux vocaux, objets sonores, corps : que peut-on produire ?"),
        ph("Création", "15 min", "Par groupes : une courte séquence sonore organisée (début, fin, contraste) ; codage graphique.", "Donne une contrainte simple ; fait décider et coder."),
        ph("Écoute des productions", "5 min", "Présentation, écoute, un mot chacun."),
      ],
    },
    {
      titre: "Partager",
      objectifs: "Chanter pour d'autres ; échanger, argumenter un jugement sur une musique en respectant le point de vue des autres.",
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
      objectifs: "Identifier : donner un avis sur ce que représente ou exprime l'œuvre … ; décrire avec un vocabulaire simple.",
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
      objectifs: "Dégager, par l'observation ou l'écoute, les principales caractéristiques techniques et formelles ; ce que je comprends, et ce qui dans l'œuvre fait que je comprends cela.",
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
      objectifs: "Relier les caractéristiques de l'œuvre à des usages et au contexte historique et culturel de sa création ; la placer sur la frise.",
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
      objectifs: "Une trace écrite courte avec le vocabulaire ; une découverte par la pratique (croquis, prise de vue) ; ce qui nous touche.",
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
      objectifs: "Découvrir la thématique … à partir d'un support authentique ; comprendre puis répéter les premiers énoncés.",
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
      objectifs: "Rebrasser et s'approprier la langue travaillée grâce à différents ateliers de manipulation ; production imitée puis guidée.",
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
      objectifs: "Produire en continu ou en interaction : de la production imitée à la production libre dans l'interaction, pour transférer à d'autres contextes.",
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
      objectifs: "La tâche finale du scénario pédagogique : une situation de communication qui réinvestit ce qui a été travaillé (présentation, enregistrement, échange avec des correspondants).",
      duree: 30,
      phases: [
        ph("Rituels", "5 min", "Rituels."),
        ph("Tâche finale", "20 min", "Production pour un destinataire : autre classe, correspondants, enregistrement."),
        ph("Retour", "5 min", "Comment remobiliser ce qu'on a appris à moyen et à long terme."),
      ],
    },
    {
      titre: "Rebrassage court",
      objectifs: "Réactiver régulièrement : quelques minutes de rituel et de jeu pour entretenir le lexique et les structures.",
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
      objectifs: "Un jeu structuré qui vise explicitement l'apprentissage … : exercer son autonomie, agir sur le réel, expérimenter des règles et des rôles.",
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
      objectifs: "Un problème à la portée des élèves : mettre en lien des situations vécues, faire appel à ses connaissances, élaborer des propositions de résolution.",
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
      objectifs: "Reprendre des processus connus dans des conditions variées : la stabilisation nécessite de nombreuses répétitions.",
      duree: 20,
      phases: [
        ph("Objectif expliqué", "3 min", "Ce qu'on est en train d'apprendre, le sens des efforts demandés."),
        ph("Entraînement", "14 min", "Atelier de répétition, supports variés, auto-entraînement pour les plus grands.", "Fait percevoir les progrès réalisés."),
        ph("Progrès", "3 min", "Ce qu'on réussit mieux qu'avant."),
      ],
    },
    {
      titre: "Se remémorer et mémoriser",
      objectifs: "Temps d'évocation des activités et des expériences ; mémoriser comptines, chansons, récits par des expositions répétées.",
      duree: 15,
      phases: [
        ph("Évocation", "7 min", "Qu'a-t-on fait, appris ? Photos, traces, affichages.", "S'exprime dans une langue riche, adaptée et explicite."),
        ph("Mémorisation", "8 min", "Comptine, chanson ou récit repris ; répéter, reformuler."),
      ],
    },
    {
      titre: "Atelier dirigé en trois temps",
      objectifs: "Un atelier en petit groupe avec le professeur — mise en réussite, activité différenciée, retour — pendant que les autres sont en ateliers autonomes ou semi-dirigés.",
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
      "Frapper, scander, fusionner les syllabes de mots familiers ; les dénombrer et comparer.",
      "Frapper les syllabes des prénoms en sautant ou avec un instrument ; scander une comptine.",
      "« Loto » : piocher une image, scander et dénombrer les syllabes, poser sur la case au bon nombre ; « Devine à qui je pense » à partir du codage des syllabes.",
      "Commence par la syllabe : l'unité la plus facilement perceptible."),
    seancePhono("Discriminer et localiser une syllabe",
      "Repérer une syllabe dans une suite, dans des mots ; la localiser (début, milieu, fin) ; trouver l'intrus.",
      "« La chasse à la syllabe » : lever la main dès qu'on entend « to » dans des syllabes, des mots, une phrase.",
      "« Loto des syllabes », « domino des syllabes », « trouver l'intrus » (bateau, banane, tapis, ballon).",
      "La tâche est plus aisée quand la syllabe est au début ou à la fin du mot."),
    seancePhono("Manipuler les syllabes",
      "Inverser, supprimer, doubler, ajouter une syllabe ; trouver une règle de transformation.",
      "« Dis le mot lapin, j'enlève la, que reste-t-il ? » ; doubler la dernière syllabe (mototo, chapeaupeau).",
      "Inverser les syllabes de mots bisyllabiques ; ajouter une syllabe définie au début ou à la fin ; poursuivre une suite selon la règle.",
      "Les procédures comprises sur la syllabe seront remobilisées sur les phonèmes."),
    seancePhono("Entendre les rimes et les phonèmes",
      "Repérer ce qui « sonne » pareil : rimes, assonances ; distinguer deux mots qui diffèrent d'un phonème ; étirer et fusionner les phonèmes.",
      "Comptines à rimes ; mots qui riment associés ; paires pain/bain, poule/boule, four/tour.",
      "« Qui suis-je ? » : retrouver « ami » à partir de « aaaa-mmmm-iiii » ; bruiter les lettres de son prénom.",
      "Multi-sensoriel : gestes, lettres, images ; entraînement explicite en petits groupes homogènes."),
    seancePhono("Discriminer et manipuler un phonème",
      "Repérer un phonème, le localiser, le coder ; ajouter, supprimer, substituer un phonème ; relier au lien oral-écrit : la lettre.",
      "« La chasse au phonème » (/f/), « loto des phonèmes », « trouver l'intrus » (soleil, serpent, valise, sac).",
      "« Dans plouf, je retire /f/, que reste-t-il ? » ; « pour moto je dis roto » ; « la chasse aux lettres » : retrouver la lettre du phonème bruité dans son prénom.",
      "Les entraînements sont plus efficaces quand ils portent sur le lien lettres-sons."),
  ],
};

/** L'ordre des familles à l'écran : le général d'abord, puis par domaine. */
export const FAMILLES: Famille[] = [
  "Toutes disciplines", "Français", "Mathématiques", "Sciences, histoire, EMC", "Arts, EPS et langues", "Maternelle",
];

export const DEMARCHES: Demarche[] = [
  EDUSCOL_QUATRE_TEMPS, ENSEIGNEMENT_EXPLICITE,
  LECTURE_CODE, LECTURE_FLUENCE, COMPREHENSION, ECRITURE_GESTE, ECRITURE_REDIGER, ORAL, VOCABULAIRE, GRAMMAIRE,
  PROBLEMES, CALCUL_MENTAL, GEOMETRIE_GRANDEURS,
  INVESTIGATION, ENQUETE_HISTOIRE_GEO, EMC_DEBAT,
  ARTS_PLASTIQUES, MUSIQUE, HISTOIRE_DES_ARTS, EPS_MODULE, LANGUES_VIVANTES,
  MATERNELLE_MODALITES, PHONOLOGIE,
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
