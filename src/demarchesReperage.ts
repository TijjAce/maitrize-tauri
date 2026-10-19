// La demi-droite graduée et les nombres ordinaux au cycle 2 : des séquences
// bâties sur le programme.
//
// Ni les livrets d'accompagnement ni les guides n'ont de séquence pour ces
// deux notions ; l'enseignant les avait laissées « pour plus tard », puis a
// demandé de les faire (octobre 2026). Le programme de mathématiques du
// cycle 2 (2024) en donne les exemples de réussite, cités ; le guide « Pour
// enseigner les nombres, le calcul et la résolution de problèmes au CP »
// (Éduscol, 2021) donne la frise numérique de la classe, d'où vient la
// demi-droite, et l'aspect ordinal du nombre — « l'ordre dans un rang, une
// file, une liste » —, en périodes 3 à 5. Chaque séance suit la démarche en
// quatre temps des livrets ; ses feuilles viennent des ateliers « La
// demi-droite graduée » et « Les nombres ordinaux » de Fabriquer
// (reperageNombres.ts), où chacune se rouvre telle qu'elle est.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import {
  STYLE_REPERAGE, atelierDeLExercice, htmlReperage, reglagesReperageSurs, titreReperage, type ClasseReperage, type ExerciceReperage,
} from "./reperageNombres";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const quatre = (titre: string, objectif: string, situation: string, activite: string, retenir: string, entrainement: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "20 min", activite, posture), ph(T3, "10 min", retenir), ph(T4, "5 min", entrainement)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "20 min", `Une feuille : ${quoi}.`, "Observe sans aider ; note qui compte les graduations ou les rangs un à un, qui raisonne."),
  ph(T4, "10 min", ensuite),
]);

const PROGRAMME = "Bâtie sur le programme de mathématiques du cycle 2 (2024) et ses exemples de réussite, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement ; démarche en quatre temps des livrets";
const GUIDE_CP = "le guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021)";

// ── La demi-droite graduée ────────────────────────────────────────────────

const DEMI_DROITE_CP: Demarche = {
  id: "demi-droite-cp", nom: "La demi-droite graduée de un en un (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; la frise numérique, d'après ${GUIDE_CP}`,
  resume: "Associer un nombre à un point sur une demi-droite graduée « en faisant le lien avec la distance qui sépare ce point de l'origine du repère » : "
    + "de la frise numérique de la classe, où chaque nombre a sa case, à la demi-droite, où il a son trait ; l'unité reportée depuis 0, comme on "
    + "construit une règle graduée — le programme en fait le point d'appui — ; puis placer des nombres, lire celui d'un point, retrouver ceux qui "
    + "manquent, de 0 à 20, puis sur une portion jusqu'à cent.",
  seances: [
    quatre("De la frise numérique à la demi-droite", "dire que le nombre d'un point de la demi-droite graduée est le nombre d'unités qui le séparent de 0.",
      "La frise numérique de la classe : chaque nombre a sa case. Au tableau, une demi-droite : un trait au départ, 0, puis des graduations. « Où mettre 3 ? Pourquoi ? »",
      "Au sol ou au tableau, reporter une bande-unité depuis 0 : un bond, 1 ; deux bonds, 2… ; écrire le nombre sous chaque graduation. Puis la feuille : compter les unités de 0 jusqu'à chaque point.",
      "Ce qu'on retient : sur la demi-droite, le nombre d'un point dit combien d'unités le séparent de 0. Le point 7 est à sept unités de 0.",
      "Montrer un nombre sur la demi-droite de la classe, les yeux fermés puis ouverts.", "Fais compter les bonds, pas les traits : le 0 ne se compte pas."),
    quatre("Construire sa demi-droite, comme une règle", "construire une demi-droite graduée de un en un en reportant une unité depuis 0.",
      "La règle graduée de la classe : où est le 0 ? Que mesure l'écart entre deux graduations ? « Nous allons fabriquer notre propre règle. »",
      "Sur une bande de papier, reporter une bande-unité depuis 0, tracer chaque graduation, écrire les nombres ; comparer les bandes : les graduations tombent aux mêmes nombres. Puis écrire les nombres qui manquent sous des graduations.",
      "Ce qu'on retient : une demi-droite graduée commence à 0 ; les graduations sont toutes à la même distance, une unité ; on écrit les nombres dans l'ordre.",
      "Lire sur la règle graduée de la classe le nombre de quelques graduations.", "Vérifie le report de l'unité : bout à bout, sans trou ni chevauchement."),
    quatre("Placer des nombres", "placer un nombre jusqu'à 20 sur une demi-droite graduée de un en un.",
      "« Place le 12. » Un élève le place au tableau, la classe vérifie : de combien d'unités est-il loin de 0 ? De 10 ?",
      "Placer des nombres sur des demi-droites où seuls quelques nombres sont écrits : 0, 5, 10, 15, 20, puis 0, 10, 20. Partir du nombre écrit le plus proche.",
      "Ce qu'on retient : pour placer 12, je pars de 10 et j'avance de deux graduations ; je n'ai pas besoin de tout compter depuis 0.",
      "Le nombre caché : un point au tableau, on dit son nombre.", "Encourage à partir du nombre écrit le plus proche plutôt que de 0."),
    quatre("Lire le nombre d'un point", "trouver le nombre d'un point sur une demi-droite graduée de un en un.",
      "Un point A sur la demi-droite, sans son nombre : « Quel est son nombre ? Comment le savoir sans tout compter ? »",
      "Lire le nombre de points sur des demi-droites où quelques nombres sont écrits ; justifier : « 10, puis encore trois graduations : 13. »",
      "Ce qu'on retient : je cherche le nombre écrit le plus proche, et je compte les graduations jusqu'au point, en avançant ou en reculant.",
      "Des points à lire au tableau, très vite, avec l'ardoise."),
    quatre("Jusqu'à cent : une portion de demi-droite", "placer et lire des nombres jusqu'à cent sur une portion de demi-droite, et compléter une bande de nombres.",
      "Une demi-droite qui commence à 40 : « Où est passé le 0 ? » Elle continue à gauche, en pointillés : on n'en montre qu'un morceau.",
      "Placer, lire, écrire les nombres qui manquent sur des portions — de 40 à 60, de 70 à 90 — ; compléter une bande numérique où des nombres manquent.",
      "Ce qu'on retient : sur un morceau de demi-droite, je m'appuie sur les nombres écrits ; d'une graduation à la suivante, on avance de un.",
      "Compléter oralement la bande : « 47, 48, … »"),
    evaluation("placer des nombres sur une demi-droite graduée de un en un, lire le nombre d'un point, écrire les nombres qui manquent",
      "La demi-droite de la classe reste affichée ; en rituel, un point à lire chaque matin. Ensuite, au CE1, de dix en dix et de cent en cent."),
  ],
};

const DEMI_DROITE_CE1: Demarche = {
  id: "demi-droite-ce1", nom: "La demi-droite graduée : de un en un, de dix en dix, de cent en cent (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Placer un nombre, ou déterminer le nombre correspondant à un point sur une demi-droite graduée « de un en un, ou de dix en dix, ou de cent "
    + "en cent » ; faire le lien entre le nombre associé à un point et la distance entre ce point et l'origine, « en lien étroit avec la mesure de "
    + "longueurs à l'aide d'une règle graduée » ; positionner des nombres manquants sur une demi-droite ou une bande lacunaire — 391, 392, 393, "
    + "…, 396 —, comme dans les exemples du programme.",
  seances: [
    quatre("La règle graduée est une demi-droite", "dire que le nombre d'un point est sa distance à l'origine, comme sur la règle graduée.",
      "La règle graduée en centimètres : où est le 0 ? Le segment de 7 cm va de 0 à 7. Sur la demi-droite, le point 7 est à sept unités de 0.",
      "Compter les unités de 0 jusqu'à des points ; mesurer des segments à la règle, puis lire des points sur une demi-droite de un en un.",
      "Ce qu'on retient : le nombre d'un point, c'est le nombre d'unités entre 0 et ce point.",
      "Tracer à la règle des segments de longueur donnée, en partant du 0."),
    quatre("De dix en dix, de cent en cent : trouver le pas", "trouver de combien on avance d'une graduation à la suivante — le pas — et écrire les nombres qui manquent.",
      "Deux nombres écrits sous deux graduations voisines : 470 et 480. « Que vaut la graduation suivante ? Et celle d'avant ? »",
      "Sur des portions de demi-droite, trouver le pas à partir de deux graduations voisines — 470 et 480, 242 et 243 — puis écrire les nombres des cases, à droite et à gauche.",
      "Ce qu'on retient : d'une graduation à la suivante, on avance toujours du même pas : de un, de dix, de cent. Je le trouve en comparant deux nombres voisins.",
      "Des comptines de dix en dix, de cent en cent, à partir d'un nombre donné, en avant et en arrière.", "Fais vérifier le pas sur deux intervalles avant de compléter."),
    quatre("Placer des nombres", "placer un nombre jusqu'à mille sur une demi-droite graduée de dix en dix ou de cent en cent.",
      "« Place 350 sur la demi-droite de 0 à 1 000, graduée de cent en cent. » Entre 300 et 400 : au milieu.",
      "Placer des nombres sur des demi-droites graduées de dix en dix, de cent en cent, de un en un sur une portion ; partir du nombre écrit le plus proche.",
      "Ce qu'on retient : je cherche d'abord le pas, puis le nombre écrit le plus proche, et j'avance de pas en pas.",
      "Placer des nombres dictés sur la demi-droite de la classe."),
    quatre("Lire et compléter", "lire le nombre d'un point et écrire les nombres manquants sous les graduations.",
      "Trois points sur une demi-droite graduée de dix en dix ; deux nombres seulement sont écrits.",
      "Lire le nombre de points, puis écrire les nombres qui manquent dans les cases, sur des demi-droites de un en un, de dix en dix, de cent en cent.",
      "Ce qu'on retient : lire un point, c'est compter les pas depuis un nombre écrit.",
      "Le nombre caché au tableau, à l'ardoise."),
    quatre("La bande des nombres", "intercaler et positionner des nombres manquants sur une bande lacunaire.",
      "La bande du programme : 391, 392, 393, …, …, 396, 397, 398. « Quels nombres manquent ? »",
      "Compléter des bandes de un en un, de dix en dix, de cent en cent ; dire le pas de chaque bande.",
      "Ce qu'on retient : sur une bande, comme sur la demi-droite, on avance toujours du même pas.",
      "Des bandes à compléter oralement, en avant et en arrière."),
    evaluation("placer des nombres sur une demi-droite graduée, lire le nombre d'un point, écrire les nombres qui manquent, compléter une bande",
      "La demi-droite de la classe reste affichée ; en rituel, une portion de demi-droite à compléter. Ensuite, au CE2, de mille en mille."),
  ],
};

const DEMI_DROITE_CE2: Demarche = {
  id: "demi-droite-ce2", nom: "La demi-droite graduée, jusqu'à 10 000 (CE2)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Placer un nombre ou déterminer le nombre correspondant à un point « sur une portion de demi-droite graduée de un en un, ou de dix en dix, ou "
    + "de cent en cent, ou de mille en mille » ; faire le lien entre le nombre associé à un point et sa distance à l'origine ; positionner des "
    + "nombres manquants — 2 391, 2 392, 2 393, …, 2 396 — : les exemples du programme du CE2.",
  seances: [
    quatre("Trouver le pas", "trouver le pas d'une demi-droite graduée — de un, de dix, de cent ou de mille — à partir de deux graduations voisines.",
      "Deux nombres sous deux graduations voisines : 4 000 et 5 000 ; puis 4 300 et 4 400. « De combien avance-t-on ? »",
      "Sur des portions de demi-droite, trouver le pas, puis écrire les nombres des cases, à droite et à gauche des nombres écrits.",
      "Ce qu'on retient : d'une graduation à la suivante, on avance toujours du même pas ; je le trouve en comparant deux nombres voisins.",
      "Des comptines de mille en mille, de cent en cent, à partir d'un nombre donné."),
    quatre("Placer des nombres", "placer un nombre jusqu'à 10 000 sur une demi-droite graduée.",
      "« Place 6 500 sur la demi-droite de 0 à 10 000, graduée de mille en mille. »",
      "Placer des nombres sur des demi-droites graduées de mille en mille, de cent en cent, de dix en dix, de un en un sur une portion.",
      "Ce qu'on retient : je cherche le pas, puis le nombre écrit le plus proche, et j'avance de pas en pas.",
      "Placer des nombres dictés sur la demi-droite de la classe."),
    quatre("Lire le nombre d'un point", "trouver le nombre d'un point sur une portion de demi-droite graduée.",
      "Un point entre 7 000 et 8 000, sur une demi-droite graduée de cent en cent.",
      "Lire le nombre de points sur des portions de demi-droite ; justifier par le pas et le nombre écrit le plus proche.",
      "Ce qu'on retient : lire un point, c'est compter les pas depuis un nombre écrit.",
      "Des points à lire au tableau, à l'ardoise."),
    quatre("Les nombres qui manquent", "écrire les nombres manquants sur une demi-droite graduée et sur une bande lacunaire.",
      "La bande du programme : 2 391, 2 392, 2 393, …, 2 396, 2 397, 2 398.",
      "Écrire les nombres des cases sur des demi-droites ; compléter des bandes de un en un, de dix en dix, de cent en cent, de mille en mille.",
      "Ce qu'on retient : sur une bande comme sur la demi-droite, le même pas d'une case à la suivante.",
      "Des bandes à compléter oralement, en avant et en arrière."),
    evaluation("placer des nombres sur une demi-droite graduée, lire le nombre d'un point, écrire les nombres qui manquent, compléter une bande",
      "En rituel, une portion de demi-droite à compléter. Au cycle 3, la demi-droite accueillera les fractions et les décimaux."),
  ],
};

// ── Les nombres ordinaux ──────────────────────────────────────────────────

const ORDINAUX_CP: Demarche = {
  id: "ordinaux-cp", nom: "Les nombres ordinaux : premier, deuxième… vingtième (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; l'aspect ordinal du nombre et sa période, d'après ${GUIDE_CP}`,
  resume: "Les nombres ordinaux jusqu'à « vingtième » : indiquer une position dans une file — « La voiture blanche est la quatrième voiture » — ; "
    + "choisir une origine et un sens quand les objets n'en ont pas — « Le jeton est caché sous le sixième gobelet en partant de la gauche » — ; le "
    + "rang d'un nombre dans une liste ; le lien entre le rang et le nombre d'éléments qui précèdent — « Je suis le troisième dans la file. Combien y "
    + "a-t-il de personnes devant moi ? » — ; les suites de symboles, de lettres, de nombres. Le guide CP met le « repérage d'un rang ou d'une "
    + "position » en périodes 3 à 5, à côté de l'aspect cardinal du nombre.",
  seances: [
    quatre("La file : premier, deuxième, troisième…", "indiquer la position de quelqu'un ou de quelque chose dans une file : premier, deuxième, troisième…",
      "La file pour sortir en récréation : qui est le premier ? le troisième ? Et le dernier ? « Comment le dire sans montrer du doigt ? »",
      "Former des files de cinq à dix élèves ; chacun dit son rang ; le meneur demande : « Que le quatrième lève la main. » Puis le train de la feuille : la locomotive devant, les wagons derrière.",
      "Ce qu'on retient : dans une file, on compte depuis le début ; le premier, le deuxième, le troisième… On écrit 1er, 2e, 3e.",
      "Le jeu du chef de file, à l'oral.", "Fais dire le rang et le compter à voix haute depuis la tête de la file."),
    quatre("Écrire les nombres ordinaux", "écrire les rangs en chiffres — 1er, 2e — et en lettres — premier, deuxième — jusqu'à vingtième.",
      "Le podium d'une course : 1er, 2e, 3e. « Comment écrit-on troisième ? cinquième ? neuvième ? »",
      "Construire l'affiche des rangs : premier, deuxième… vingtième, sous la frise numérique ; repérer les mots qui changent : cinq, cinquième ; neuf, neuvième. Puis écrire des rangs en chiffres et en lettres.",
      "Ce qu'on retient : premier s'écrit 1er ; les autres prennent ième : deuxième, 2e.",
      "Dictée de rangs à l'ardoise."),
    quatre("D'où part-on ? La gauche ou la droite", "choisir une origine et un sens pour compter dans une rangée d'objets qui n'en a pas.",
      "Dix gobelets retournés, un jeton caché sous l'un. « Il est sous le sixième gobelet. » Deux élèves soulèvent deux gobelets différents : qui a raison ?",
      "Le jeu des gobelets, par deux : l'un cache le jeton et dit « le troisième en partant de la droite », l'autre le trouve. Puis la feuille des gobelets.",
      "Ce qu'on retient : quand les objets n'ont pas de sens, je dis d'où je pars : « le sixième en partant de la gauche ».",
      "Le jeu des gobelets en autonomie.", "Fais toujours préciser le point de départ."),
    quatre("Devant moi, derrière moi", "dire combien de personnes sont devant ou derrière quelqu'un dans une file, à partir de son rang.",
      "Le problème du programme : « Il y a six personnes qui font la queue à la caisse. Je suis le troisième dans la file. Combien y a-t-il de personnes devant moi ? »",
      "Jouer la file pour vérifier ; puis résoudre des problèmes de file, en dessinant la file si on en a besoin.",
      "Ce qu'on retient : devant le troisième, il y a deux personnes : le rang moins un.",
      "Des problèmes de file à l'oral, joués par la classe.", "Laisse dessiner la file : c'est la preuve."),
    quatre("Le rang d'un nombre dans une liste", "dire le rang d'un nombre dans une liste, et le nombre qui occupe un rang donné.",
      "La liste du programme : 2, 6, 10, 14, 18. « 10 est en quelle position ? Quel est le quatrième nombre ? »",
      "Répondre aux deux questions pour plusieurs listes : la position d'un nombre, le nombre d'une position.",
      "Ce qu'on retient : je compte les nombres de la liste depuis le premier, à gauche.",
      "Des listes au tableau, à l'ardoise."),
    quatre("Les suites : quel est le vingtième ?", "trouver le terme d'un rang donné dans une suite de symboles, de lettres ou de nombres.",
      "« Dans la suite ABABAB…, quelle est la dix-neuvième lettre ? » On cherche ensemble le motif qui se répète.",
      "Continuer des suites jusqu'au rang demandé — vingtième symbole, dix-neuvième lettre, septième nombre de 1, 3, 5, 7, 9… — et répondre.",
      "Ce qu'on retient : je trouve le motif qui se répète, je continue la suite en comptant les rangs jusqu'à celui qu'on demande.",
      "Inventer une suite et poser la question à son voisin."),
    evaluation("indiquer et écrire un rang, colorier un objet d'un rang donné, résoudre un problème de file, trouver le terme d'une suite",
      "L'affiche des rangs reste au mur ; en rituel, la file du matin. Ensuite, au CE1, les rangs jusqu'à cent."),
  ],
};

const ORDINAUX_CE1: Demarche = {
  id: "ordinaux-ce1", nom: "Les nombres ordinaux jusqu'à cent, les suites (CE1)", famille: "Mathématiques",
  source: PROGRAMME,
  resume: "Les nombres ordinaux jusqu'à cent : « Lors d'une course en EPS, l'élève sait ranger les coureurs dans l'ordre correspondant à leur arrivée, se "
    + "situer et situer les autres par rapport à lui-même » ; « Dans une étape du Tour de France parcourue par 167 cyclistes, l'élève sait dire "
    + "combien de cyclistes sont arrivés avant le quarante-huitième coureur » ; le rang d'un nombre dans une liste ; les suites répétitives — la "
    + "quatre-vingt-neuvième lettre de ABABAB… — puis évolutives — le onzième nombre de 1, 2, 4, 7, 11, 16… —, les exemples du programme.",
  seances: [
    quatre("La course : l'ordre d'arrivée", "ranger des coureurs dans l'ordre d'arrivée, se situer et situer les autres, et écrire les rangs jusqu'à cent.",
      "Après une course d'EPS : « Qui est arrivé premier ? Toi, quel est ton rang ? Qui est arrivé juste avant toi ? »",
      "Ranger les dossards dans l'ordre d'arrivée, répondre aux questions de la course ; écrire des rangs en chiffres et en lettres : vingt et unième, quatre-vingtième, centième.",
      "Ce qu'on retient : le rang dit la position ; on l'écrit 21e, vingt et unième.",
      "Dictée de rangs à l'ardoise."),
    quatre("Combien avant, combien après ?", "trouver combien sont arrivés avant ou après un coureur, à partir de son rang.",
      "Le problème du programme : « Dans une étape du Tour de France parcourue par 167 cyclistes, combien de cyclistes sont arrivés avant le quarante-huitième coureur ? »",
      "Résoudre des problèmes de rang : avant, après, entre deux coureurs ; dessiner une file courte pour vérifier la règle sur de petits nombres.",
      "Ce qu'on retient : avant le quarante-huitième, il y en a quarante-sept : le rang moins un ; après lui, le nombre de coureurs moins son rang.",
      "Des problèmes de rang à l'oral.", "Fais vérifier la règle sur une file de cinq avant de l'appliquer à 167."),
    quatre("Le rang d'un nombre dans une liste", "dire le rang d'un nombre dans une liste, et le nombre qui occupe un rang donné.",
      "Une liste de nombres de cinq en cinq : « En quelle position est 45 ? Quel est le septième nombre ? »",
      "Répondre aux deux questions pour plusieurs listes ; chercher un raccourci quand la liste avance toujours du même nombre.",
      "Ce qu'on retient : je compte les nombres depuis le premier ; si la liste avance d'un même pas, je peux compter de pas en pas.",
      "Des listes au tableau, à l'ardoise."),
    quatre("Les suites répétitives", "trouver le terme d'un rang donné — jusqu'au centième — dans une suite qui répète un motif.",
      "« Dans la suite ABABAB…, quelle est la quatre-vingt-neuvième lettre ? » Trop long à écrire ? Une grille de dix colonnes : chaque colonne garde la même lettre.",
      "Continuer les suites dans des grilles dont les colonnes suivent le motif ; trouver la colonne du rang demandé ; vérifier en continuant la suite.",
      "Ce qu'on retient : un motif de deux, de trois, de quatre éléments revient toujours ; je cherche où tombe le rang dans le motif.",
      "Inventer une suite répétitive et poser une question de rang."),
    quatre("Les suites évolutives", "trouver le terme d'un rang donné dans une suite qui grandit selon une règle.",
      "« Dans la suite 1, 2, 4, 7, 11, 16…, quel est le onzième nombre ? » De combien grandit-elle à chaque fois ?",
      "Chercher la règle — on ajoute 1, puis 2, puis 3… ; on double — ; continuer la suite jusqu'au rang demandé ; la suite triangle, croix, triangle, croix, croix…",
      "Ce qu'on retient : je cherche comment la suite passe d'un terme au suivant, puis je continue jusqu'au rang demandé.",
      "Des suites évolutives à l'oral."),
    evaluation("répondre à des questions sur l'ordre d'arrivée, résoudre un problème de rang, trouver le terme d'une suite",
      "En rituel, une suite au tableau et une question de rang. Au CE2, les suites se poursuivent dans le calcul."),
  ],
};

export const DEMARCHES_REPERAGE: Demarche[] = [DEMI_DROITE_CP, DEMI_DROITE_CE1, DEMI_DROITE_CE2, ORDINAUX_CP, ORDINAUX_CE1];

/** La séquence d'une compétence de demi-droite ou d'ordinaux, à sa classe ; rien sinon. En minuscules sans accents. */
export function demarcheDuReperage(classe: string, comp: string): string | null {
  if (!/^(cp|ce1|ce2)$/.test(classe)) return null;
  if (/demi-droite graduee/.test(comp)) return `demi-droite-${classe}`;
  if (classe !== "ce2" && /ordinaux|rang (d.un objet|ou une position)|file orientee/.test(comp)) return `ordinaux-${classe}`;
  return null;
}

// ── Les feuilles des séances ──────────────────────────────────────────────

/**
 * Une feuille de la séquence, faite par son atelier de Fabriquer — « La
 * demi-droite graduée » ou « Les nombres ordinaux » —, qui la rouvre telle
 * qu'elle est.
 */
const feuille = (seance: number, exercice: ExerciceReperage, classe: ClasseReperage): FeuilleAFabriquer => {
  const atelier = atelierDeLExercice(exercice);
  const r = reglagesReperageSurs(atelier, { exercice, classe });
  return { seance, atelier, titre: titreReperage(r), fabriquer: (g) => ({ html: htmlReperage(r, g), style: STYLE_FEUILLE + STYLE_REPERAGE, refaire: { [atelier]: r } }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "demi-droite-cp": {
    feuilles: [
      feuille(0, "dd-unites", "CP"), feuille(1, "dd-manquants", "CP"),
      feuille(2, "dd-placer", "CP"), feuille(3, "dd-lire", "CP"),
      feuille(4, "bande-lacunaire", "CP"), feuille(5, "dd-evaluation", "CP"),
    ],
    materiel: [
      "La frise numérique de la classe ; une grande demi-droite au tableau ou au sol, une bande-unité",
      "Une bande de papier et une bande-unité par élève ; la règle graduée de la classe",
      "La demi-droite de la classe",
      "La demi-droite de la classe ; les ardoises",
      "Une portion de demi-droite au tableau, de 40 à 60 ; la frise numérique",
      "",
    ],
  },
  "demi-droite-ce1": {
    feuilles: [
      feuille(0, "dd-unites", "CE1"), feuille(1, "dd-pas", "CE1"),
      feuille(2, "dd-placer", "CE1"), feuille(3, "dd-lire", "CE1"),
      feuille(3, "dd-manquants", "CE1"), feuille(4, "bande-lacunaire", "CE1"),
      feuille(5, "dd-evaluation", "CE1"),
    ],
    materiel: [
      "La règle graduée de chacun ; une demi-droite de un en un au tableau",
      "Des portions de demi-droite au tableau ; les ardoises",
      "La demi-droite de la classe, de 0 à 1 000",
      "Des demi-droites au tableau ; les ardoises",
      "La bande lacunaire du programme au tableau",
      "",
    ],
  },
  "demi-droite-ce2": {
    feuilles: [
      feuille(0, "dd-pas", "CE2"), feuille(1, "dd-placer", "CE2"),
      feuille(2, "dd-lire", "CE2"), feuille(3, "dd-manquants", "CE2"),
      feuille(3, "bande-lacunaire", "CE2"), feuille(4, "dd-evaluation", "CE2"),
    ],
    materiel: [
      "Des portions de demi-droite au tableau ; les ardoises",
      "La demi-droite de la classe, de 0 à 10 000",
      "Des demi-droites au tableau ; les ardoises",
      "La bande lacunaire du programme au tableau",
      "",
    ],
  },
  "ordinaux-cp": {
    feuilles: [
      feuille(0, "ord-file", "CP"), feuille(1, "ord-ecrire", "CP"),
      feuille(2, "ord-gobelets", "CP"), feuille(3, "ord-devant", "CP"),
      feuille(4, "ord-liste", "CP"), feuille(5, "ord-suites", "CP"),
      feuille(6, "ord-evaluation", "CP"),
    ],
    materiel: [
      "La cour ou le couloir, pour former des files ; des crayons de couleur",
      "Une affiche pour les rangs, sous la frise numérique",
      "Dix gobelets opaques et un jeton par paire ; des crayons de couleur",
      "Des chaises pour jouer la file",
      "Des listes de nombres au tableau ; les ardoises",
      "Des lettres et des formes aimantées pour construire les suites au tableau",
      "",
    ],
  },
  "ordinaux-ce1": {
    feuilles: [
      feuille(0, "ord-file", "CE1"), feuille(0, "ord-ecrire", "CE1"),
      feuille(1, "ord-devant", "CE1"), feuille(2, "ord-liste", "CE1"),
      feuille(3, "ord-suites", "CE1"), feuille(4, "ord-suites-evolutives", "CE1"),
      feuille(5, "ord-evaluation", "CE1"),
    ],
    materiel: [
      "Une course d'EPS et les dossards ; des crayons de couleur",
      "Des chaises pour jouer une file courte",
      "Des listes de nombres au tableau ; les ardoises",
      "Des lettres et des formes aimantées ; une grille de dix colonnes au tableau",
      "Des suites au tableau",
      "",
    ],
  },
};

export const estUneDemarcheDuReperage = (id: string) => id in PLANS;

export function planDuReperage(demarcheId: string): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return debut ? `${debut}.` : "";
    const feuilles = `${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}`;
    return debut ? `${debut} ; ${feuilles}.` : `${feuilles[0].toUpperCase()}${feuilles.slice(1)}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
