// La technique de la multiplication, au CE2 : une séquence d'après le manuel
// de préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 3, « Multiplication CE2 », p. 63-76.
//
// Le manuel découpe la séquence en sept séances (p. 63) : le sens et les
// propriétés ; un nombre à deux, puis à trois chiffres par un chiffre ; un
// nombre à deux chiffres par un nombre inférieur, puis supérieur à 20 ;
// l'entraînement ; l'évaluation sommative. Il place la quatrième en période 4
// et la détaille en sept phases (p. 73-75) ; l'éditeur n'en prend que six :
// ses phases 5 et 6, de cinq minutes chacune, n'en font qu'une. Cette séance
// s'ouvre sur le calcul mental : il ouvre ici les sept séances, au procédé La
// Martinière, en dix minutes — le manuel lui en donne cinq ; dans Maitrize, le
// calcul mental d'une séquence de calcul dure dix minutes, et se retire d'un
// geste. Les phases des
// autres séances sont de Maitrize, d'après ce que le manuel dit des
// propriétés, des représentations — les paquets, le rectangle, le
// quadrillage —, des prérequis, des obstacles et de la suite (p. 67-72 et
// 76), et la source le dit. Le texte du manuel n'est pas repris : ses phases
// sont dites ici avec nos mots, et ses problèmes — la caisse du magasin, les
// choux du maraîcher — sont reformulés, sans prénom.
//
// Il existe déjà « La multiplication posée (CE2) » (demarchesOperations.ts),
// bâtie sur le programme ; celle-ci est celle du manuel, pour la même
// compétence. Ses feuilles viennent des ateliers « Calcul mental »,
// « Opérations posées », « Problèmes multiplicatifs » et « Cartes de calcul »,
// à ses réglages : chacune se rouvre dans le sien. L'atelier des opérations
// posées tire le second facteur à deux chiffres entre 11 et 39 : la feuille de
// la séance 4 ne reste pas toujours sous 20. La fiche de l'énoncé des choux,
// dessinés en rectangle, et le quadrillage de 34 × 23 carreaux, qu'aucun
// atelier ne dessine, sont à préparer : le matériel le dit.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererMultiplicatifs, type TypeMultiplicatif,
} from "./problemesBarres";
import { STYLE_JEUX_MATHS, cartesCalcul, htmlCartesCalcul, type ReglagesCalcul } from "./jeuxMaths";

export const ID_MULTIPLICATION_CE2 = "technique-multiplication-ce2";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental » qu'elle travaille, et ses tables s'il en demande. */
const CALCUL_MENTAL: [string, number[]][] = [
  ["ce2-fois-10-100", []], ["ce2-produit-11-99", []], ["ce2-fois-4-8", []], ["ce2-table-multiplication", [3, 4, 5, 7]],
  ["ce2-fois-dizaines", []], ["ce2-table-multiplication", [6, 7, 8, 9]], ["ce2-produits-60", []],
];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const CHAQUE_JOUR = "En début de séance de numération et de calcul, chaque jour.";

export const DEMARCHE_MULTIPLICATION_CE2: Demarche = {
  id: ID_MULTIPLICATION_CE2,
  nom: "La technique de la multiplication, des paquets au quadrillage (CE2)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 3, « Multiplication CE2 », p. 63-76 : la séquence en sept séances et sa période (p. 63), `
    + "la séance 4, détaillée (p. 73-75), le problème de la caisse de la séance 1 (p. 72) et le quadrillage coupé en quatre de la séance 5 (p. 76) ; "
    + "les phases des séances 1 à 3 et 5 à 7, et le calcul mental en tête de chaque séance — celui de la séance 4 porté de cinq à dix minutes —, "
    + "ajoutés par Maitrize, d'après ce que le manuel dit des propriétés, des représentations, des prérequis, des obstacles et de la suite (p. 67-72 et 76) ; "
    + "programme de mathématiques du cycle 2 (2024)",
  resume: "Au CE2, en période 4 : la technique de la multiplication posée, construite sur ses propriétés — on décompose, on multiplie par 10, on additionne. "
    + "Des paquets répétés font comprendre la multiplication par un chiffre : 39 × 6, c'est 6 fois 3 dizaines et 6 fois 9 unités. Le rectangle, puis le "
    + "quadrillage, font comprendre celle par deux chiffres : 26 rangées de 15 choux, c'est 26 × 10 plus 26 × 5 ; un quadrillage de 54 sur 36, coupé en "
    + "quatre, prépare la multiplication par un nombre plus grand que 20. Puis on s'entraîne en cherchant d'où viennent les erreurs, et l'on évalue la "
    + "technique et son emploi dans des problèmes. Le calcul mental ouvre chaque séance : la technique demande les tables et la multiplication par 10.",
  visee: { intitule: /effectuer des multiplications d.un nombre à deux ou trois chiffres/i, niveaux: ["CE2"] },
  seances: [
    seance("Le sens et les propriétés de la multiplication",
      sauront("reconnaître une multiplication dans des rangées, des paquets égaux ou des sauts réguliers, l'écrire avec ×, et calculer en s'appuyant sur ses propriétés : 3 × 6 = 6 × 3 ; 27 × 10, c'est 27 dizaines ; 36 × 20, c'est 36 × 2, puis × 10."), 50, [
        ph(LM, "10 min", `Multiplier par 10 ou par 100 — « 27 × 10 », « 6 × 100 », « 45 × 10 » : 27 × 10, c'est 27 dizaines, 270. ${ROUTINE}`,
          "Pour dicter 2 × 14, dit « deux fois quatorze » : c'est la formulation la plus sûre. Fait justifier le zéro : on l'écrit à droite du nombre — on ne l'ajoute pas, ajouter zéro ne change rien."),
        ph(T1, "10 min", "Avec des jetons, trois rangées de six : « Combien ? » Les uns voient 3 fois 6, les autres 6 fois 3 ; on tourne la feuille : c'est le même rectangle. Puis six sacs de trois cubes ; puis six sauts de 3 sur la file numérique. Chaque fois, on dessine ce qu'on a fait, puis on l'écrit : 3 × 6 = 6 × 3 = 18.",
          "Le matériel d'abord, puis le dessin, puis l'écriture. Le rectangle est la représentation qui montre le mieux que l'ordre des facteurs ne change pas le résultat."),
        ph(T2, "15 min", "Par groupes de trois, le problème de la caisse : « Le soir, on compte l'argent de la caisse d'un magasin : 19 pièces de 2 €, 14 billets de 5 €, 24 billets de 10 €, 36 billets de 20 €, 23 billets de 50 € et 34 billets de 100 €. Combien d'argent y a-t-il dans la caisse ? » Chaque groupe calcule chaque ligne, puis le total, et écrit comment il a fait.",
          "Fait expliquer chaque procédure : 19 × 2, le double de 19 ; 14 × 5, la moitié de 14 × 10 ; 24 × 10, 24 dizaines ; 36 × 20, 36 × 2, puis × 10 ; 23 × 50, la moitié de 23 × 100. Des billets factices pour qui veut voir. La caisse contient 5 618 €."),
        ph(T3, "5 min", "Ce qu'on retient, sur une affiche : multiplier, c'est répéter une même quantité ; 3 × 6 = 6 × 3, on choisit l'ordre le plus commode ; 14 × 5, c'est 10 × 5 plus 4 × 5 ; multiplier par 10, c'est changer les unités en dizaines ; multiplier par 20, c'est multiplier par 2, puis par 10."),
        ph(T4, "10 min", "Seul, la feuille « Problèmes — des paquets égaux » : lire l'énoncé, écrire la multiplication, la calculer en ligne, répondre par une phrase.",
          "Accepte l'addition répétée, puis fait écrire la multiplication qui lui correspond. Beaucoup de petits paquets se calculent mieux dans l'autre ordre : 14 × 6, c'est 6 × 14."),
      ]),
    seance("Un nombre à deux chiffres par un chiffre",
      sauront("poser et calculer la multiplication d'un nombre à deux chiffres par un nombre à un chiffre, en commençant par les unités, et ajouter la retenue après avoir multiplié."), 50, [
        ph(LM, "10 min", `Le produit d'un nombre à deux chiffres par un chiffre, en décomposant — « 23 × 4 », c'est 20 × 4 et 3 × 4 : 80 et 12, 92. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Six paquets pareils, chacun de 3 barres de dix et de 9 cubes : « Combien de cubes en tout ? » On rassemble : 6 fois 3 dizaines, 18 dizaines ; 6 fois 9 unités, 54 unités. 54 unités, c'est 5 dizaines et 4 unités : en tout, 23 dizaines et 4 unités, 234.",
          "Des paquets répétés autant de fois que le dit le multiplicateur : c'est ce qui montre le mieux la multiplication par un chiffre. On manipule, puis on dessine les paquets."),
        ph(T2, "20 min", "Du dessin au calcul en ligne : 39 × 6 = (30 × 6) + (9 × 6) = 180 + 54 = 234. Puis l'enseignant pose la multiplication en disant chaque étape, les unités d'abord : « 6 fois 9, 54 : j'écris 4, je retiens 5. 6 fois 3, 18, et 5 de retenue, 23. » Chacun en pose d'autres sur l'ardoise, puis la feuille « Multiplications posées — deux chiffres par un chiffre ».",
          "Fait dire ce que vaut la retenue : 5 dizaines. Erreur attendue : ajouter la retenue avant de multiplier — 6 fois 8 au lieu de 6 fois 3, plus 5. Les tables restent affichées pour qui en a besoin."),
        ph(T3, "5 min", "Ce qu'on retient, sur l'affiche de la technique : on multiplie chaque chiffre, en commençant par les unités ; la retenue s'écrit en petit, à la même place dans toutes les classes de l'école, et on l'ajoute après avoir multiplié."),
        ph(T4, "5 min", "Sur l'ardoise, en ligne, en commençant par les unités : 42 × 3, 51 × 4, 63 × 3."),
      ]),
    seance("Un nombre à trois chiffres par un chiffre",
      sauront("poser et calculer la multiplication d'un nombre à trois chiffres par un nombre à un chiffre, avec une ou deux retenues, et contrôler le résultat par un ordre de grandeur."), 50, [
        ph(LM, "10 min", `Multiplier par 4 ou par 8 en doublant — « 17 × 4 » : le double de 17, 34 ; le double de 34, 68. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Avec les plaques de cent, les barres et les cubes : quatre paquets de 136. On met tout ensemble : 4 plaques, 12 barres, 24 cubes. On échange : 24 cubes, c'est 2 barres et 4 cubes ; 14 barres, c'est 1 plaque et 4 barres. Il y a 5 plaques, 4 barres et 4 cubes : 544.",
          "Chaque échange annonce une retenue : on le dit en le faisant."),
        ph(T2, "20 min", "On pose 136 × 4 en suivant les échanges : « 4 fois 6, 24 : j'écris 4, je retiens 2. 4 fois 3, 12, et 2, 14 : j'écris 4, je retiens 1. 4 fois 1, 4, et 1, 5. » Puis la feuille « Multiplications posées — trois chiffres par un chiffre ».",
          "Erreurs attendues : la retenue oubliée, ou gardée d'un rang à l'autre ; avec un zéro au milieu — 207 × 4 —, 4 fois 0, c'est 0, mais on ajoute la retenue. Le matériel reste à disposition."),
        ph(T3, "5 min", "Ce qu'on retient : la même technique, avec un rang de plus — les unités, les dizaines, les centaines ; chaque retenue s'ajoute au produit suivant. Un ordre de grandeur pour vérifier : 136 × 4, c'est entre 100 × 4 et 200 × 4."),
        ph(T4, "5 min", "On vérifie 136 × 4 en doublant deux fois : 272, puis 544. Sur l'ardoise, chacun calcule de même 125 × 4 et 213 × 4, posés puis en doublant."),
      ]),
    // La séance détaillée du manuel : ses phases, leur organisation et leur durée — le calcul mental porté à dix minutes.
    seance("Les choux du maraîcher : multiplier par un nombre inférieur à 20",
      sauront("calculer le produit d'un nombre à deux chiffres par un nombre à deux chiffres inférieur à 20 en le décomposant — 26 × 15, c'est 26 × 10 plus 26 × 5 —, et le poser en colonnes : une ligne pour les unités, une pour la dizaine, puis leur somme."), 55, [
        ph(LM, "10 min", "Toute la classe, à l'oral : compter de 3 en 3 et de 5 en 5, en avançant ou en reculant — à partir de 60, par exemple ; dans des séries de cinq nombres affichées au tableau, trouver ceux qui ne sont pas dans la table de 4, de 7… Chacun écrit sa réponse sur l'ardoise et la lève au signal. Puis deux ou trois multiplications posées d'un nombre à deux chiffres par un chiffre, pour réactiver la technique.",
          "Réactive les tables dont la séance aura besoin. Aide : la table de Pythagore affichée, ou la calculatrice, pour qui ne sait pas encore ses tables."),
        ph("Phase 2 – Individuel puis petits groupes", "10 min", "Le problème, projeté au tableau et sur une fiche pour chacun, où les choux sont dessinés en rectangle : « Un maraîcher a fait 26 rangées de choux, avec 15 choux dans chaque rangée. Combien de choux y a-t-il dans son champ ? » Chacun cherche seul, cinq minutes ; puis, par groupes de quatre, on compare ses résultats, on se met d'accord, et l'on écrit sa démarche et sa réponse sur une feuille A3.",
          "Lit l'énoncé, le fait lire, le reformule, questionne pour s'assurer qu'il est compris ; puis observe, commente, aide. Procédures attendues : compter un à un ; entourer des paquets de dix choux ; ajouter 26 + 26 + … ; écrire 26 × 15 ou 15 × 26, mais se tromper en calculant, en ligne ou en colonnes ; écrire 26 × 15 = (26 × 10) + (26 × 5), ou une autre décomposition."),
        ph("Phase 3 – Groupes", "10 min", "Chaque groupe présente sa réponse et sa façon de faire ; on en débat. Puis l'enseignant montre sa résolution : il coupe le rectangle de choux en deux blocs, 26 × 10 et 26 × 5, et écrit 26 × 15 = 26 × 10 + 26 × 5. On calcule 5 × 26 de plusieurs façons — de tête, en ligne, posé, à la calculatrice — et 10 × 26 : c'est 26 × 10, 26 paquets de dix ou 26 dizaines, 260. Une première disposition en colonnes : 130, puis 260, puis la somme, 390.",
          "Mène le débat : valide ou invalide les résultats, demande les avantages et les inconvénients de chaque procédure. Montre le découpage sur l'image projetée."),
        ph("Phase 4 – Collectif", "10 min", "Au tableau, 26 × 5 posé, pour rappel : un élève dit tout haut chaque étape — 5 fois 6, 30 : on écrit 0 aux unités, on retient 3 ; 5 fois 2, 10, plus la retenue, 13, qu'on écrit à gauche du 0. Puis 26 × 10 = 260, et la façon de multiplier par 10. Enfin 26 × 15 posé en entier : la ligne de 26 × 5, la ligne de 26 × 10, la somme, 390.",
          "Effectue l'opération complète en disant chaque étape de l'algorithme ; montre d'où vient chaque ligne dans le rectangle de choux."),
        // Six phases au plus dans l'éditeur : les phases 5 (binômes) et 6 (groupes) du manuel, de cinq minutes chacune, n'en font
        // qu'une ici — durées additionnées, descriptions et postures mises bout à bout.
        ph("Phases 5 et 6 – Binômes, puis groupes", "10 min", "Par deux, poser et calculer 34 × 16 dans un quadrillage : 34 × 6 = 204, 34 × 10 = 340, 544. On relève les erreurs ; on dit le rôle de la retenue, et sa place. "
          + "Puis, en groupes, une nouvelle recherche : trouver par le calcul le nombre de carreaux d'un quadrillage de 34 × 23. Le nouvel obstacle est nommé : multiplier par 20 — on multiplie par 2, puis par 10. Un élève vient faire l'opération au tableau, avec la procédure de son choix : 34 × 3 = 102, 34 × 20 = 680, 782.",
          "Fait expliquer les erreurs : la retenue oubliée, ajoutée avant de multiplier, ou gardée pour la seconde ligne ; le zéro oublié sur la ligne de 34 × 10. "
          + "Puis nomme vite le nouvel obstacle et aide à réinvestir le produit par un multiple de 10 : 34 × 2 = 68, puis × 10, 680. Explicite ensuite l'algorithme d'un nombre à deux chiffres par un nombre à deux chiffres."),
        ph("Phase 7 – Individuel", "5 min", "Seul, sans aide : les deux multiplications de la feuille « Multiplications posées — par un nombre à deux chiffres ». Elles serviront de première évaluation.",
          "Observe attentivement les productions ; repère ceux qui ont des difficultés, et les aide."),
      ]),
    seance("Multiplier par un nombre plus grand que 20",
      sauront("poser et calculer la multiplication d'un nombre à deux chiffres par un nombre à deux chiffres plus grand que 20 : une ligne pour les unités, une ligne pour les dizaines, qui commence par un zéro, chacune avec ses retenues."), 50, [
        ph(LM, "10 min", `Un nombre à un chiffre fois des dizaines entières — « 4 × 30 » : 4 fois 3 dizaines, 12 dizaines, 120. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Par groupe, un rectangle de 54 sur 36 carreaux, découpé dans du papier quadrillé : « Combien de carreaux ? » On le coupe le long des lignes en quatre morceaux — 50 × 30, 4 × 30, 50 × 6, 4 × 6 —, on calcule chacun, puis la somme : 1 500 + 120 + 300 + 24 = 1 944.",
          "Les produits de dizaines se calculent avec les propriétés : 50 × 30, c'est 50 × 3, puis × 10 ; 4 × 30, c'est aussi 30 × 4. Le quadrillage garde le sens de chaque morceau."),
        ph(T2, "20 min", "Des morceaux à la multiplication posée : on les réunit deux à deux — 54 × 6 = 324 et 54 × 30 = 1 620 —, puis on pose 54 × 36 : une ligne pour 54 × 6, une ligne pour 54 × 30, qui commence par un zéro, et la somme, 1 944. On pose d'abord avec l'enseignant, pas à pas, puis seul : la feuille « Multiplications posées — par deux chiffres, avec retenues ».",
          "Guide pas à pas, puis de moins en moins, une fois le sens compris. Erreurs attendues : le zéro oublié au début de la seconde ligne ; une retenue de la première ligne reprise dans la seconde ; une retenue ajoutée avant de multiplier."),
        ph(T3, "5 min", "Ce qu'on retient, sur l'affiche de la technique : multiplier par 36, c'est multiplier par 6, puis par 30, et ajouter ; la seconde ligne commence par un zéro, car on multiplie des dizaines ; chaque ligne a ses retenues."),
        ph(T4, "5 min", "Sur l'ardoise, 47 × 23 et 65 × 32, avec un ordre de grandeur pour vérifier : 47 × 23, c'est environ 50 × 20, 1 000."),
      ]),
    seance("S'entraîner et chercher les erreurs",
      sauront("poser seuls des multiplications par un ou deux chiffres, trouver et corriger une erreur — une retenue, un zéro, une table —, et vérifier un résultat par un ordre de grandeur."), 50, [
        ph(LM, "10 min", `Les tables de 6, 7, 8 et 9, dans les deux sens — « 7 × 8 », « 6 fois combien font 54 ? » : celles dont la technique a le plus besoin. ${ROUTINE}`,
          "Une table oubliée se reconstruit à partir d'un résultat connu : 6 × 5, c'est 5 × 5 et encore 5. On la dit « une fois six, deux fois six… » : cet ordre aide à retrouver un résultat."),
        ph(T1, "10 min", "Des multiplications fausses, projetées au visualiseur : une retenue oubliée, une retenue ajoutée avant de multiplier, le zéro oublié sur la ligne des dizaines, une addition à la place d'une multiplication, une erreur de table. Par deux, on trouve l'erreur, on dit d'où elle vient, on corrige.",
          "Prend les erreurs dans les cahiers de la classe, sans nom. Chercher d'où vient une erreur fait plus progresser que la corriger."),
        ph(T2, "15 min", "Chacun pose et calcule : la feuille « Multiplications à poser ». Avant de calculer, un ordre de grandeur ; après, on compare.",
          "Différencie : la table de Pythagore affichée, ou la calculatrice, pour qui ne sait pas encore ses tables ; un guidage pas à pas pour qui hésite sur la technique."),
        ph(T3, "5 min", "Ce qu'on retient : la liste des erreurs à éviter, affichée près de la technique, et l'ordre de grandeur pour vérifier."),
        ph(T4, "10 min", "Au choix de l'enseignant : par deux, les « Cartes des tables de 6 à 9 » — l'un montre le calcul, l'autre répond, on retourne la carte pour vérifier — ; ou seul, la feuille « Problèmes — multiplier par un nombre à deux chiffres ».",
          "Les cartes pour qui bute encore sur les tables ; les problèmes pour les autres : lire, écrire la multiplication, la poser, répondre par une phrase."),
      ]),
    seance("Évaluation sommative et remédiations",
      sauront("poser et calculer seuls des multiplications d'un nombre à trois chiffres par un chiffre et de deux nombres à deux chiffres, et s'en servir pour résoudre des problèmes ; ceux qui en ont besoin reprennent le sens avec le matériel et le quadrillage."), 50, [
        ph(LM, "10 min", `Les décompositions de 60 en produits — « 60, c'est 4 fois combien ? », « 60, c'est 6 fois combien ? » ${ROUTINE}`, CHAQUE_JOUR),
        ph("Évaluation", "30 min", "Seul : les feuilles « Multiplications à poser — évaluation, par un chiffre » et « Multiplications à poser — évaluation, par deux chiffres », puis « Problèmes — évaluation » : lire, écrire la multiplication, la poser, répondre par une phrase.",
          "Observe sans aider : qui oublie une retenue ou l'ajoute avant de multiplier, qui oublie le zéro de la seconde ligne, qui se trompe dans les tables, qui additionne au lieu de multiplier."),
        ph("Remédiations", "10 min", "Pour qui en a besoin, on revient au sens : les paquets de barres et de cubes, le quadrillage découpé, le calcul en ligne, puis le calcul posé, guidé pas à pas ; la table de Pythagore pour les tables. Les autres : de nouveaux problèmes. Ensuite, un entraînement court et régulier toute l'année : la technique sera reprise au début du cycle 3, puis avec les nombres décimaux.",
          "Reprend avec le matériel ce que l'évaluation a montré."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
const martiniere = (seance: number, objectif: string, tables: number[]): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = {
    ...REGLAGES_MARTINIERE, niveau: "CE2", objectifs: [objectif], revision: false, tables: tables.length ? tables : REGLAGES_MARTINIERE.tables, forme: "oral", ardoises: true,
  };
  const o = objectifParId(objectif);
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${o ? libelleTravaille(o, r.tables) : objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

/** Des multiplications dans le quadrillage de l'atelier « Opérations posées », posées d'avance ou à poser. */
const posees = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages: ReglagesPosees = { ...REGLAGES_POSEES, operation: "×", ...r };
  return {
    seance, atelier: "posees", titre,
    fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES, refaire: { operationsPosees: reglages } }),
  };
};

/** Les tables, recto-verso : le calcul devant, le résultat derrière (atelier « Cartes de calcul »). */
const cartes = (seance: number, titre: string, tables: number[]): FeuilleAFabriquer => {
  const r: ReglagesCalcul = { operation: "x", tables, rectoVerso: true, melanger: true };
  return {
    seance, atelier: "calcul", titre,
    fabriquer: (g) => ({ html: htmlCartesCalcul(cartesCalcul(r, g), r), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { cartesCalcul: r } }),
  };
};

const PRESENTATION_SANS_SCHEMA = { ...PRESENTATION_COMPLETE, schema: "sans" as const };
const TOUT: TypeMultiplicatif[] = ["tout"];
/**
 * Des problèmes de parts égales — on cherche le tout —, dans l'atelier « Problèmes multiplicatifs » : `parts`, le nombre
 * de paquets ; `valeurs`, ce que contient chacun. Il les refait, avec les mêmes réglages et le même tirage, à `decalage`
 * près de la graine : l'évaluation tire à part.
 */
const problemes = (seance: number, titre: string, nombre: number, parts: [number, number], valeurs: [number, number], decalage = 0): FeuilleAFabriquer => ({
  seance, atelier: "multiplicatifs", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererMultiplicatifs({ nombre, types: TOUT, table: 10, parts, valeurs, enonces: true, prenoms: [] }, g + decalage), titre, PRESENTATION_SANS_SCHEMA),
    style: STYLE_PROBLEMES,
    refaire: {
      multiplicatifs: { titre, nombre, prenoms: "", types: TOUT, table: 10, perso: true, partsMin: parts[0], partsMax: parts[1], valeurMin: valeurs[0], valeurMax: valeurs[1] },
      "presentation:multiplicatifs": PRESENTATION_SANS_SCHEMA,
    },
    graine: g + decalage,
  }),
});

const FEUILLES: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL.map(([objectif, tables], s) => martiniere(s, objectif, tables)),
  // Beaucoup de petits paquets — 14 boîtes de 6 crayons — : l'ordre des facteurs compte pour calculer, pas pour le résultat.
  problemes(0, "Problèmes — des paquets égaux", 4, [11, 19], [2, 9]),
  posees(1, "Multiplications posées — deux chiffres par un chiffre", { chiffres: 2, chiffresDuSecond: 1, retenue: "melange", combien: 6 }),
  posees(2, "Multiplications posées — trois chiffres par un chiffre", { chiffres: 3, chiffresDuSecond: 1, retenue: "avec", combien: 6 }),
  // La séance du manuel : les deux multiplications de la fin, sans aide.
  posees(3, "Multiplications posées — par un nombre à deux chiffres", { chiffres: 2, chiffresDuSecond: 2, retenue: "avec", combien: 2 }),
  posees(4, "Multiplications posées — par deux chiffres, avec retenues", { chiffres: 2, chiffresDuSecond: 2, retenue: "avec", combien: 6 }),
  posees(5, "Multiplications à poser", { chiffres: 2, chiffresDuSecond: 2, retenue: "avec", combien: 6, posees: false }),
  cartes(5, "Cartes des tables de 6 à 9", [6, 7, 8, 9]),
  // Des paquets de 11 à 19 : la multiplication par un nombre inférieur à 20 de la séance 4.
  problemes(5, "Problèmes — multiplier par un nombre à deux chiffres", 4, [11, 39], [11, 19]),
  posees(6, "Multiplications à poser — évaluation, par un chiffre", { chiffres: 3, chiffresDuSecond: 1, retenue: "avec", combien: 3, posees: false }),
  posees(6, "Multiplications à poser — évaluation, par deux chiffres", { chiffres: 2, chiffresDuSecond: 2, retenue: "avec", combien: 3, posees: false }),
  problemes(6, "Problèmes — évaluation", 3, [11, 39], [11, 19], 1),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; des jetons, de quoi faire trois rangées de six, et six sacs de trois cubes ; la file numérique ; quelques billets factices ; une affiche pour ce qu'on retient",
  "Les ardoises ; par groupe, six paquets pareils de 3 barres de dix et 9 cubes ; les tables de multiplication affichées ; une affiche pour la technique",
  "Les ardoises ; les plaques de cent, les barres de dix et les cubes — de quoi faire quatre paquets de 136 —, à disposition",
  "Les ardoises ; le tableau interactif, pour projeter l'énoncé, le rectangle de choux et le quadrillage de 34 × 23 carreaux ; pour chacun, la fiche de l'énoncé "
    + "avec les 26 rangées de 15 choux dessinées, à préparer ; une feuille A3 par groupe de quatre ; du papier quadrillé pour poser 34 × 16 ; "
    + "la table de Pythagore affichée et des calculatrices, pour qui en a besoin",
  "Les ardoises ; par groupe, un rectangle de 54 sur 36 carreaux découpé dans du papier quadrillé, et des ciseaux ; l'affiche de la technique",
  "Les ardoises ; des multiplications fausses prises dans les cahiers, pour le visualiseur ; la table de Pythagore ; des calculatrices",
  "Les ardoises ; pour la remédiation, les barres et les cubes, du papier quadrillé, la table de Pythagore",
];

/** Les feuilles et le matériel de la séquence, séance par séance. */
export function planMultiplicationCe2(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
