// Lire un programme de construction, au CM1 : une séquence d'après le manuel
// de préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 14, « Espace et géométrie CM1 »
// (sujet du CRPE 2023), p. 217-228.
//
// Le manuel place la séquence en fin d'année, en période 5 (p. 217 et 222),
// et la découpe en cinq séances (p. 222-223) : découvrir un programme de
// construction, la séance qu'il détaille (p. 225-227) ; faire correspondre
// consignes et figures, remettre des consignes dans l'ordre ; compléter des
// consignes, puis des figures commencées ; s'entraîner, et chercher un trésor
// sur une carte ; l'évaluation. Les élèves n'y sont que récepteurs : ils
// lisent des programmes, ils n'en écrivent pas — ce sera pour le CM2. Sa
// séance de découverte s'ouvre sur cinq minutes de calcul mental, sur les
// décimaux de la période : le calcul mental La Martinière ouvre ici les cinq,
// sur dix minutes. Ses phases 6 et 7, courtes, n'en font qu'une : une séance
// tient en six phases au plus. Les phases des séances 2 à 5 sont de Maitrize,
// d'après ce que le manuel dit de ces séances, des prérequis, des activités
// qu'il propose et des questions du jury (p. 220 et 222-228), et la source le
// dit. Le texte du manuel n'est pas repris : ses phases sont dites ici avec
// nos mots.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Espace et
// géométrie — CM1, CM2 » — un programme et ses quatre figures en vraie
// grandeur, un programme en bandes à remettre dans l'ordre, des programmes à
// suivre étape par étape, leur corrigé à la taille réelle pour le superposer —,
// « Géométrie » — les cercles et les figures à compléter, réglés au CE2 —,
// « Texte à trous » et « Les maisons du tri », à leurs réglages : chacune se
// rouvre dans le sien. La carte au trésor n'a pas de générateur :
// l'enseignant la prépare, le matériel le dit.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type ReglagesGeometrie } from "./geometrie";
import { REGLAGES_TROUS, STYLE_TROUS, htmlTexteATrous, reglagesTrousSurs } from "./texteATrous";
import { REGLAGES_TRI, STYLE_TRI, htmlTri, type ReglagesTri } from "./triEtiquettes";
import { REGLAGES_GEOMETRIE_CM, STYLE_GEOMETRIE_CM, htmlGeometrieCM, type ExerciceGeometrieCM, type ReglagesGeometrieCM } from "./geometrieCoursMoyen";

export const ID_ESPACE_GEOMETRIE_CM1 = "programme-construction-cm1";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental » qu'elle travaille, sur les nombres de la période 5. */
const CALCUL_MENTAL = ["cm1-ecritures-decimales", "cm1-rang-par-rang", "cm1-fractions", "cm1-decimal-fois-10", "cm1-decimal-divise-10"];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const SANS_LIEN = "Un court moment, sans lien avec la géométrie : les nombres de la période, comme à la séance de découverte.";

export const DEMARCHE_ESPACE_GEOMETRIE_CM1: Demarche = {
  id: ID_ESPACE_GEOMETRIE_CM1,
  nom: "Lire un programme de construction (CM1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 14, « Espace et géométrie CM1 » (CRPE 2023), p. 217-228 : la séquence en cinq séances et sa période (p. 217 et 222-223), `
    + "la séance de découverte détaillée (p. 225-227), ses phases 6 et 7 réunies en une ; les phases des séances 2 à 5 et le calcul mental en tête de "
    + "chaque séance — cinq minutes au manuel, à la découverte, dix ici — ajoutés par Maitrize, d'après le plan de la séquence, les prérequis, les "
    + "activités proposées et les questions du jury (p. 220 et 222-228) ; programme de mathématiques du cycle 3 (2025)",
  resume: "En fin de CM1, en période 5 : lire un programme pour construire une figure. Un programme de construction est une suite de consignes courtes, "
    + "à l'impératif, dans l'ordre où on les exécute ; elles nomment des objets de géométrie, pas les gestes des instruments. La séance de découverte "
    + "fait choisir, parmi quatre figures, celle qui suit un programme, puis construire une figure à main levée, aux instruments sur papier calque, et "
    + "valider en superposant. Ensuite : faire correspondre une figure et son programme, remettre des consignes dans l'ordre ; compléter des consignes, "
    + "puis des figures commencées ; s'entraîner sur des figures de plus en plus complexes, et chercher un trésor sur une carte ; l'évaluation. Les "
    + "élèves lisent des programmes sans en écrire : ce sera pour le CM2. Le calcul mental ouvre chaque séance, sur les décimaux et les fractions de la période.",
  visee: { intitule: /construire une figure géométrique composée/i, niveaux: ["CM1"] },
  seances: [
    // La séance détaillée du manuel : son calcul mental — cinq minutes au manuel, dix ici, comme en tête de chaque séance —, puis ses phases,
    // leur organisation et leur durée.
    seance("Découvrir un programme de construction",
      sauront("dire ce qu'est un programme de construction — des consignes, dans l'ordre, pour construire une figure —, reconnaître la figure qui suit un programme, et construire une figure simple d'après son programme, à main levée puis aux instruments."), 55, [
        ph(LM, "10 min", "Individuel, puis collectif : ranger des nombres décimaux. Au tableau, des nombres écrits de plusieurs façons — 7/10, 2 + 4/100, 2,5… « Lesquels sont compris entre 2 et 3 ? » Chacun les écrit sur son ardoise et la lève au signal. Puis des écritures décimales de fractions usuelles, dites par l'enseignant.",
          "Un court moment, sans lien avec la géométrie mais avec les nombres de la période : les décimaux. Fait dire comment on sait : 2 + 4/100, c'est 2,04 ; 7/10, c'est 0,7, moins que 2."),
        ph("Phase 2 – Collectif", "5 min", "Présentation de la séquence : lire des programmes de construction. Retour sur ce que chacun a écrit avant la séance — un programme de construction, pour moi, c'est… On écarte ce qui ne va pas, on en débat. Au tableau, quelques programmes, et un ou deux intrus à reconnaître. Puis la définition, affichée : un programme de construction est une suite de consignes, rangées dans l'ordre où on les exécute, pour construire une figure.",
          "Avant la séance — la veille, ou le matin —, a fait écrire à chacun ce qu'est, selon lui, un programme de construction. Mène le débat ; apporte la définition et l'affiche."),
        ph("Phase 3 – Binômes puis collectif", "10 min", "Recherche, par deux : un programme et quatre figures, ceux de la feuille « Un programme, quatre figures », ou ceux du manuel. « Trace un triangle équilatéral ; nomme-le ART. Trace le segment [AH], perpendiculaire au côté [RT]. Place le point M, milieu du côté [AT]. Trace le segment [RM]. » Quelle figure suit exactement le programme ? Pour chacune des autres, on écrit pourquoi elle ne convient pas. Mise en commun : le triangle n'est pas équilatéral ; les points ne sont pas aux sommets ; [AH] n'est pas perpendiculaire à [RT] ; M n'est pas au milieu ; [RM] manque.",
          "Le travail par deux fait échanger et justifier les choix. Valide les réponses, revient sur la figure exacte et dit l'erreur de chacune des autres ; reprend les codes : la marque de l'angle droit, les traits des longueurs égales."),
        ph("Phase 4 – Individuel", "10 min", "Nouvelle recherche. Un programme, au tableau et sur une fiche par élève : « Trace un carré ABCD. Trace ses diagonales. Appelle O leur point d'intersection. Trace le cercle de centre O et de rayon OA. » Pourquoi est-ce un programme de construction ? On repère les verbes — tracer, appeler — et les mots de la géométrie : carré, diagonale, intersection, cercle, centre, rayon. Puis chacun construit la figure à main levée, sans instrument, sur une feuille blanche, avec ses codes.",
          "Pose la question vite, à l'oral. Aide à s'approprier le programme : les verbes d'abord, puis chaque mot de la géométrie. Rappelle les codes avant de laisser construire."),
        ph("Phase 5 – Binômes puis collectif", "10 min", "Mise en commun : par deux, on compare ses figures ; on note — ou on retient — les erreurs vues. Puis la vraie figure, aux instruments, sur papier calque, avec une contrainte de plus : les côtés du carré ABCD mesurent 6 cm. D'abord, la liste des instruments utiles : le crayon, la règle graduée — ou l'équerre graduée —, l'équerre, le compas.",
          "Erreurs attendues : un rectangle, ou une autre figure, au lieu d'un carré ; des oublis — le nom des points, le code des angles droits ; des diagonales mal tracées ; un cercle qui n'a pas le rayon demandé : il passe par A, mais pas par B, C et D."),
        // Les phases 6 et 7 du manuel, cinq minutes chacune, n'en font qu'une : une séance tient en six phases au plus (voir demarches.test.ts).
        ph("Phases 6 et 7 – Binôme, individuel, puis collectif", "10 min", "Validation : par deux, on superpose ses figures, on cherche les erreurs et on les corrige. Puis chacun reçoit la construction exacte, la superpose à la sienne et corrige s'il le faut. Ensemble : quelles erreurs avez-vous vues ? La liste s'écrit au tableau. Institutionnalisation : on revient à la définition, puis on affiche ce qu'il faut faire pour suivre un programme — lire tout le programme ; vérifier le sens de chaque mot, verbe ou mot de géométrie, au besoin dans le cahier des leçons ; tracer d'abord à main levée, consigne après consigne ; préparer ses instruments ; construire en gardant l'ordre des consignes ; tracer avec soin et précision.",
          "Un moment très riche pour toutes les compétences de la séquence : laisse les binômes argumenter. Écrit au tableau les erreurs que la classe dit. Fait formuler les étapes par les élèves avant de les écrire : l'affiche servira toute la séquence."),
      ]),
    seance("Une figure, des programmes : choisir, ordonner",
      sauront("dire si un programme permet de construire une figure, en le suivant consigne après consigne, et remettre dans l'ordre les consignes d'un programme."), 55, [
        ph(LM, "10 min", `Ajouter ou retirer des unités, des dixièmes, des centièmes à un nombre décimal — « 4,35 + 0,1 », « 12,48 – 0,02 ». ${ROUTINE}`, SANS_LIEN),
        ph(T1, "10 min", "Une figure au tableau — un rectangle ABCD, ses diagonales, le milieu E du côté [AD] et un demi-cercle de diamètre [AD], hors du rectangle — et trois programmes qui ne diffèrent que par le demi-cercle : de diamètre [AB], [AE] ou [AD]. Lequel permet de construire la figure ? Chacun lit les trois ; on suit chaque programme jusqu'au bout pour décider.",
          "Seul le troisième convient, et il ne dit pas de quel côté du rectangle tracer le demi-cercle : un bon programme ne laisse aucun doute. Rappelle l'affiche de la première séance."),
        ph(T2, "20 min", "Par deux, un programme découpé en bandes, une consigne par bande, mélangées : la feuille « Remettre un programme dans l'ordre », ou celui-ci : « Trace un carré ABCD de 6 cm de côté. Place le point I, milieu du côté [AB]. Trace le cercle de centre I qui passe par A. Trace les segments [ID] et [IC]. » On remet les bandes dans l'ordre, puis on construit pour vérifier, comme à la première séance : à main levée d'abord, puis aux instruments, sur papier calque — le compas devient nécessaire. On superpose à la figure de l'enseignant.",
          "Fait dire ce qui impose l'ordre : on ne place pas I avant d'avoir le côté [AB], ni le cercle avant son centre. Aide : la figure finie, montrée à qui bloque."),
        ph(T3, "5 min", "Ce qu'on retient : un programme donne toutes les consignes, dans l'ordre où on les exécute ; une consigne oubliée, déplacée ou vague change la figure, ou en permet plusieurs."),
        ph(T4, "10 min", "La feuille « Quels gestes pour quelle consigne ? » : sous chaque consigne, ranger dans l'ordre les gestes qui l'exécutent, à la règle, au compas ou à l'équerre.",
          "Un programme dit ce qu'on construit, pas comment tenir l'instrument : ces gestes, chacun doit les connaître pour suivre un programme."),
      ]),
    seance("Compléter des consignes, compléter des figures",
      sauront("compléter un programme de construction avec les mots justes de la géométrie, la figure sous les yeux, et terminer une figure commencée en suivant sa consigne."), 50, [
        ph(LM, "10 min", `Les relations entre fractions usuelles — « un demi plus un quart », « un demi, c'est combien de dixièmes ? ». ${ROUTINE}`, SANS_LIEN),
        ph(T1, "10 min", "Au tableau, une figure construite et son programme, où des mots manquent : « Trace un … ABCD. Trace ses deux … » Ensemble, on cherche le mot juste en regardant la figure, et on dit pourquoi.",
          "Fait justifier chaque mot par la figure : quatre côtés de même longueur et quatre angles droits, c'est un carré."),
        ph(T2, "20 min", "La feuille « Compléter un programme de construction » : la figure est au tableau ; on découpe les étiquettes, on essaie, puis on colle chaque mot à sa place — trois étiquettes ne servent pas. Puis la feuille « Compléter des figures sur papier uni » : la figure est commencée, la consigne dit ce qu'il faut terminer, à la règle graduée et à l'équerre.",
          "Aides : le répertoire illustré des mots de la géométrie ; des figures plus simples ; le début des tracés déjà fait ; l'aide de l'enseignant ou d'un camarade."),
        ph(T3, "5 min", "Ce qu'on retient : chaque mot de la géométrie désigne un objet précis — un rayon n'est pas un diamètre, un côté n'est pas un sommet ; pour terminer une figure, on suit sa consigne et on vérifie aux instruments.",
          "En français, à côté : reconnaître un programme de construction parmi d'autres textes, relever ses mots et ses verbes à l'impératif."),
        ph(T4, "5 min", "Une consigne lue par l'enseignant, un tracé à main levée sur l'ardoise : « Trace un segment [AB] ; place son milieu I. » « Trace le cercle de centre I qui passe par A. » On compare les ardoises."),
      ]),
    seance("S'entraîner, et chercher un trésor",
      sauront("construire seuls, aux instruments, des figures de plus en plus complexes d'après leur programme, et suivre un programme pour retrouver un lieu sur une carte."), 55, [
        ph(LM, "10 min", `Multiplier un nombre décimal par 10 — « 3,7 × 10 », « 0,45 × 10 » : chaque chiffre prend une valeur dix fois plus grande. ${ROUTINE}`, SANS_LIEN),
        ph(T1, "10 min", "L'affiche de la première séance, relue : comment suivre un programme. Puis la feuille « Tracer des cercles au compas » : une consigne, un tracé — le centre, et le point par où passe le cercle, ou son rayon.",
          "Fait réussir avant de faire chercher : une seule consigne à la fois."),
        ph(T2, "20 min", "La feuille « Programmes de construction » : de la figure la plus simple à la plus complexe, sur la feuille blanche, aux instruments ; un tracé à main levée d'abord, si on en a besoin ; on code les angles droits et les côtés de même longueur. On valide en superposant le corrigé, imprimé à la taille réelle sur un calque.",
          "Différencie : des figures plus simples, le début des tracés déjà fait, le répertoire des mots de la géométrie, l'aide de l'enseignant ou d'un camarade."),
        ph(T3, "5 min", "Ce qu'on retient : plus la figure est complexe, plus l'ordre compte ; on relit chaque consigne avant de tracer, et on vérifie chaque tracé."),
        ph(T4, "10 min", "La carte au trésor : sur la carte d'une île, un programme mène au trésor — joindre deux repères de la carte, placer un milieu, tracer une perpendiculaire ou un cercle ; le trésor est là où les tracés se coupent. Par deux, on construit, on marque le trésor, puis on compare.",
          "La carte valide d'elle-même : un tracé juste mène au trésor. Les binômes qui trouvent des endroits différents relisent le programme ensemble."),
      ]),
    seance("Évaluation",
      sauront("montrer, seuls, qu'ils savent lire un programme pour construire une figure : construire aux instruments en suivant les consignes dans l'ordre, coder la figure, et compléter un programme avec les mots justes."), 55, [
        ph(LM, "10 min", `Diviser un nombre décimal par 10 — « 45,6 : 10 », « 3,2 : 10 ». ${ROUTINE}`, SANS_LIEN),
        ph("Évaluation", "35 min", "La feuille « Programmes de construction — évaluation » : construire chaque figure aux instruments, sur la feuille blanche, et la coder. Puis la feuille « Compléter un programme — évaluation », la figure au tableau.",
          "Observe sans aider : qui lit tout le programme avant de tracer, qui garde l'ordre des consignes, qui prend le bon instrument, qui code. Ce que l'évaluation montre décide des reprises."),
        ph(T4, "10 min", "Dans la vie de tous les jours : quelqu'un demande le chemin de la bibliothèque. Par deux, à l'oral, on se donne les indications, claires et dans l'ordre ; l'autre les suit sur le plan du quartier. Au CM2, on écrira soi-même des programmes de construction.",
          "Fait le lien : un programme de construction, comme un itinéraire, se suit consigne après consigne."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
const martiniere = (seance: number, objectif: string): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: "CM1", objectifs: [objectif], revision: false, forme: "oral", ardoises: true };
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${objectifParId(objectif)?.libelle ?? objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

/** Une feuille de l'atelier « Géométrie », à sa classe la plus haute, le CE2 : il la rouvre telle quelle. */
const geometrie = (seance: number, titre: string, r: Partial<ReglagesGeometrie>): FeuilleAFabriquer => {
  const reglages: ReglagesGeometrie = { ...REGLAGES_GEOMETRIE, classe: "CE2", ...r };
  return {
    seance, atelier: "geometrie", titre,
    fabriquer: (g) => ({ html: htmlGeometrie(reglages, g), style: STYLE_FEUILLE + STYLE_GEOMETRIE, refaire: { geometrie: reglages } }),
  };
};

/** Une feuille de l'atelier « Espace et géométrie — CM1, CM2 », au CM1 : il la refait, avec les mêmes réglages et le même tirage. */
const geometrieCM = (seance: number, titre: string, exercices: ExerciceGeometrieCM[], combien: number): FeuilleAFabriquer => {
  const r: ReglagesGeometrieCM = { ...REGLAGES_GEOMETRIE_CM, classe: "CM1", exercices, combien, titre };
  return {
    seance, atelier: "geometrieCM", titre,
    fabriquer: (g) => ({ html: htmlGeometrieCM(r, g), style: STYLE_FEUILLE + STYLE_GEOMETRIE_CM, refaire: { geometrieCM: r } }),
  };
};

/** La façon de vérifier un mot collé : la figure, au tableau, le dit. */
const VERIFIER = "Je regarde la figure au tableau. Je relis la consigne avec le mot choisi. Je réponds : la consigne dit-elle ce que montre la figure ?";

/** Un programme dont on a retiré des mots de la géométrie, dans l'atelier « Texte à trous » : ses étiquettes, et des mots en trop. */
const trous = (seance: number, titre: string, phrases: string[], autres: string[]): FeuilleAFabriquer => {
  const r = reglagesTrousSurs({ ...REGLAGES_TROUS, modele: "", titre, phrases: phrases.join("\n"), texteMethode: VERIFIER, autres: autres.join(", ") });
  return { seance, atelier: "trous", titre, fabriquer: (g) => ({ html: htmlTexteATrous(r, g), style: STYLE_FEUILLE + STYLE_TROUS, refaire: { trous: r } }) };
};

/** La figure de la découverte, reprise : le carré, ses diagonales, et deux cercles. */
const PROGRAMME_A_COMPLETER = [
  "Trace un *carré* ABCD de 6 cm de côté.",
  "Trace les *diagonales* [AC] et [BD] du carré.",
  "Appelle O le point d'*intersection* des diagonales.",
  "Trace le *cercle* de *centre* O qui passe par A.",
  "Place le point I, *milieu* du *côté* [AB].",
  "Trace le cercle de centre I et de *rayon* 3 cm.",
];
const PROGRAMME_D_EVALUATION = [
  "Trace un *segment* [AB] de 8 cm.",
  "Place le point O, *milieu* du segment [AB].",
  "Trace la droite *perpendiculaire* au segment [AB] qui passe par O.",
  "Trace le *cercle* de centre O et de *diamètre* [AB].",
  "Appelle C et D les points où le cercle coupe la *droite*.",
  "Trace le *quadrilatère* ACBD.",
];

/**
 * Trois consignes d'un programme, et les gestes qui les exécutent, à ranger
 * sous la leur, dans l'atelier « Les maisons du tri » : un programme dit ce
 * qu'on construit ; les gestes, chacun les sait. Sans modèle de l'atelier — il
 * ne lui prête pas la compétence d'être et d'avoir.
 */
const GESTES: ReglagesTri = {
  ...REGLAGES_TRI, modele: "", titre: "Quels gestes pour quelle consigne ?",
  consigne: "Découpe les étiquettes. Chaque geste sert à exécuter l'une des trois consignes : range-le sous la sienne, dans l'ordre où on le fait.",
  categories: [
    { titre: "Trace un segment [AB] de 6 cm.",
      etiquettes: "Je marque le point A et j'y pose le 0 de la règle graduée.\nJe marque le point B en face de la graduation 6.\nJe trace le long de la règle, de A jusqu'à B." },
    { titre: "Trace le cercle de centre O qui passe par A.",
      etiquettes: "Je pique la pointe sèche du compas sur le point O.\nJ'écarte le compas jusqu'à ce que la mine touche le point A.\nJe fais tourner le compas sans changer son écartement." },
    { titre: "Trace la droite perpendiculaire à (d) qui passe par A.",
      etiquettes: "Je pose un côté de l'angle droit de l'équerre le long de la droite (d).\nJe fais glisser l'équerre jusqu'à ce que l'autre côté touche le point A.\nJe trace le long de cet autre côté de l'angle droit." },
  ],
  aideMots: false, aidePonctuation: false, deuxVersions: false, parLigne: 3, taille: "normale", capitales: false, melanger: true,
  aide: "L'instrument : Quel instrument ce geste demande-t-il ?\nLa consigne : Ce geste construit-il ce que dit la consigne ?",
  aRetenir: "Une consigne d'un programme dit ce qu'il faut construire. Les gestes avec la règle, le compas ou l'équerre disent comment le faire : ils ne s'écrivent pas dans le programme.",
};

const FEUILLES: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL.map((objectif, s) => martiniere(s, objectif)),
  // La séance de découverte : un programme et ses quatre figures, en vraie grandeur.
  geometrieCM(0, "Un programme, quatre figures", ["programme-figures"], 1),
  geometrieCM(1, "Remettre un programme dans l'ordre", ["programme-ordre"], 1),
  { seance: 1, atelier: "tri", titre: GESTES.titre, fabriquer: (g) => ({ html: htmlTri(GESTES, g), style: STYLE_FEUILLE + STYLE_TRI, refaire: { tri: GESTES } }) },
  trous(2, "Compléter un programme de construction", PROGRAMME_A_COMPLETER, ["triangle", "diamètre", "sommet"]),
  geometrie(2, "Compléter des figures sur papier uni", { exercice: "completer", uni: true, combien: 4 }),
  geometrie(3, "Tracer des cercles au compas", { exercice: "cercles", combien: 4 }),
  geometrieCM(3, "Programmes de construction", ["programme-etapes"], 2),
  geometrieCM(4, "Programmes de construction — évaluation", ["programme-etapes"], 2),
  trous(4, "Compléter un programme — évaluation", PROGRAMME_D_EVALUATION, ["rayon", "triangle"]),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; ce que chacun a écrit, avant la séance, sur les programmes de construction ; au tableau ou au TBI, les nombres du calcul mental, "
    + "quelques programmes et leurs intrus, la définition à afficher ; par binôme, du papier calque "
    + "pour comparer les quatre figures ; le programme du carré ABCD, au tableau et sur une fiche par élève ; du papier blanc et du papier calque ; le crayon, "
    + "la règle graduée, l'équerre et le compas ; pour chacun, la construction exacte — le carré de 6 cm de côté —, à superposer ; le matériel d'affichage",
  "Les ardoises ; la figure et ses trois programmes, au tableau ; par binôme, "
    + "la figure de l'enseignant sur calque ; du papier calque ; la règle graduée, l'équerre et le compas ; des ciseaux et de la colle",
  "Les ardoises ; la figure du programme à compléter, construite au tableau ou projetée ; la règle graduée et l'équerre ; des ciseaux et de la colle ; "
    + "le répertoire illustré des mots de la géométrie",
  "Les ardoises ; l'affiche de la première séance ; la règle graduée, l'équerre et le compas ; du papier blanc et du papier calque ; par binôme, "
    + "une carte au trésor et son programme, préparés",
  "Les ardoises ; la règle graduée, l'équerre et le compas ; des ciseaux et de la colle ; la figure du programme à compléter, au tableau ; le plan du quartier",
];

/** Les feuilles et le matériel de la séquence. */
export function planEspaceGeometrieCm1(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
