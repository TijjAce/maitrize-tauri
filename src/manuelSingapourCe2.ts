// Les problèmes multiplicatifs en barres, au CE2 : une séquence d'après le
// manuel de préparation au CRPE que l'enseignant a fourni dans « Adapter une
// fiche » (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de
// leçon, maths et français » (Nathan), sujet n° 15, « La méthode de Singapour
// CE2 », p. 229-243.
//
// Le manuel ne détaille qu'une séance : la cinquième d'une séquence sur la
// multiplication et la division, qu'il place en période 3 (p. 238) — le sujet,
// lui, disait la période 2 (p. 229). Elle apprend à produire et à utiliser un
// diagramme en barres pour un problème multiplicatif, en six phases (p. 239-242).
// Le manuel dit ce qui la précède — la multiplication et la division par 6, 7,
// 8 et 9 — et ce qui la suit — les techniques opératoires, de nouveaux
// problèmes avec de plus grands nombres (p. 237-238). Les phases des séances
// 1 à 4, 6 et 7 sont de Maitrize, d'après ces pages, les connaissances
// didactiques (p. 232-236) et la question du jury (p. 243), et la source le
// dit. Le texte du manuel n'est pas repris : ses phases sont dites ici avec
// nos mots, et ses problèmes gardent leurs nombres, sans prénom.
//
// Le chemin est celui de la méthode : manipuler, représenter, abstraire — les
// cubes, puis le dessin, puis l'écriture. Sa séance s'ouvre sur une courte
// activité de calcul mental La Martinière : elle garde ses cinq minutes, les
// autres séances en ont dix. Le manuel ne prévoit pas d'évaluation.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Cartes de calcul » et
// « Problèmes multiplicatifs », à ses réglages : chacune se rouvre dans le
// sien. La pratique guidée reprend les nombres du manuel — 5 × 8, 5 × 9,
// 8 × 7 —, avec l'habillage que l'atelier tire. Les six bandes d'enfants
// dessinés, l'affiche des équipes d'EPS, l'affiche bilan et la fiche de
// référence, qu'aucun atelier ne fait, sont à préparer : le matériel le dit.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { STYLE_JEUX_MATHS, cartesCalcul, htmlCartesCalcul, type ReglagesCalcul } from "./jeuxMaths";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererMultiplicatifs, type Presentation, type TypeMultiplicatif,
} from "./problemesBarres";

export const ID_SINGAPOUR_CE2 = "singapour-multiplicatifs-ce2";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental », ses tables, et ses séries — une seule en cinq minutes. */
const CALCUL_MENTAL: [objectif: string, tables: number[], series?: number][] = [
  ["ce2-table-multiplication", [2, 3, 4, 5]], ["ce2-table-multiplication", [6, 7]], ["ce2-table-multiplication", [8, 9]],
  ["ce2-produits-60", []], ["ce2-table-multiplication", [6, 7, 8, 9], 1], ["ce2-table-multiplication", [6, 7, 8, 9]], ["ce2-fois-dizaines", []],
];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const CHAQUE_JOUR = "En début de séance de numération et de calcul, chaque jour.";

export const DEMARCHE_SINGAPOUR_CE2: Demarche = {
  id: ID_SINGAPOUR_CE2,
  nom: "Les problèmes multiplicatifs en barres, à la manière de Singapour (CE2)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 15, « La méthode de Singapour CE2 », p. 229-243 : la séance 5, détaillée (p. 239-242), `
    + "sa place dans la séquence et sa période (p. 237-238) ; les phases des séances 1 à 4, 6 et 7, et leur calcul mental, ajoutées par Maitrize, "
    + "d'après les prérequis et la suite que le manuel donne (p. 237-238), ses connaissances didactiques (p. 232-236) et la question du jury (p. 243) ; "
    + "programme de mathématiques du cycle 2 (2024)",
  resume: "Au CE2, en période 3 : résoudre un problème multiplicatif avec un diagramme en barres, en suivant la méthode dite de Singapour — "
    + "manipuler, représenter, abstraire. On multiplie et l'on divise d'abord par 6, 7, 8 et 9 avec des cubes et des jetons, puis en dessinant "
    + "les paquets. La séance du manuel part d'une situation vécue en EPS, des équipes : l'enseignant montre comment passer des enfants dessinés "
    + "à des points, puis au diagramme — une case par groupe, la même valeur dans chaque case. Les élèves s'y exercent par deux, de moins en moins "
    + "aidés, puis seuls. Le même diagramme sert ensuite à diviser, puis avec de plus grands nombres. Comme à Singapour, on reste sur le sujet "
    + "plusieurs séances de suite ; le calcul mental des tables ouvre chacune.",
  visee: { intitule: /problèmes multiplicatifs en une étape/i, niveaux: ["CE2"] },
  seances: [
    seance("Des paquets égaux : multiplier par 6 et par 7",
      sauront("reconnaître des paquets égaux, les compter par une addition répétée puis par une multiplication — 4 paquets de 6, c'est 6 + 6 + 6 + 6, c'est 4 × 6 = 24 —, et retrouver les tables de 6 et de 7 à partir de celle de 5."), 50, [
        ph(LM, "10 min", `Les tables de 2 à 5, apprises au CE1 — « 4 × 3 », « 5 fois 7 » : celles qui serviront à construire les tables de 6 et de 7. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Sur le bureau, des barres de six cubes. « Combien de cubes dans quatre barres ? » On compte de six en six : 6, 12, 18, 24. On l'écrit : 6 + 6 + 6 + 6 = 24 ; quatre fois six ; 4 × 6 = 24. Puis on dessine les quatre barres, cube par cube.",
          "Le matériel d'abord, puis le dessin, puis l'écriture : c'est le chemin de la méthode — manipuler, représenter, abstraire. Fait dire « 4 fois 6 » : quatre paquets de six."),
        ph(T2, "20 min", "Par deux, avec les cubes, la table de 6 : une barre, deux barres… dix barres ; on écrit chaque résultat. Une barre de six, c'est une barre de cinq et un cube : 4 × 6, c'est 4 × 5 et encore 4, 24. Même travail pour la table de 7 : une barre de sept, c'est une barre de cinq et une barre de deux. Puis, seul, la feuille « Problèmes — des paquets de 6 ou de 7 » : dessiner les paquets, écrire l'addition, puis la multiplication.",
          "Erreurs attendues : compter les paquets au lieu des objets, ou écrire 4 + 6. Aide : refaire avec les cubes, puis dessiner. Accepte l'addition répétée, puis demande la multiplication qui lui correspond."),
        ph(T3, "5 min", "Ce qu'on retient : quand on répète la même quantité, on multiplie — 4 paquets de 6, c'est 4 × 6 = 24. L'affiche des tables de 6 et de 7, avec la façon de les retrouver."),
        ph(T4, "5 min", "Par deux, les « Cartes des tables de 6 et de 7 » : l'un montre le calcul, l'autre répond, on retourne la carte pour vérifier.",
          "Imprimées recto verso, les cartes se découpent d'avance ; elles repartent à la maison : les tables s'apprennent un peu chaque jour."),
      ]),
    seance("Multiplier par 8 et par 9 : doubler, passer par dix",
      sauront("retrouver les tables de 8 et de 9 — 3 × 8, c'est le double de 3 × 4 ; 3 × 9, c'est 3 × 10 – 3 — et résoudre des problèmes de paquets égaux par une multiplication."), 50, [
        ph(LM, "10 min", `Les tables de 6 et de 7, construites à la séance précédente — « 4 × 6 », « 7 fois 8 », « 6 fois combien font 42 ? » : dans les deux sens. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Des barres de huit cubes : « Combien dans trois barres ? » Une barre de huit, c'est deux barres de quatre : 3 × 8, c'est le double de 3 × 4, 24. Puis des barres de dix dont on enlève un cube : neuf. Trois barres de neuf, c'est trois barres de dix moins trois cubes : 30 – 3 = 27.",
          "Le matériel fait voir les deux façons de calculer : doubler, et passer par dix."),
        ph(T2, "20 min", "Par deux, avec les cubes, les tables de 8 et de 9 : on écrit chaque résultat et l'on cherche des régularités — dans la table de 9, le chiffre des dizaines monte de un quand celui des unités descend de un. Puis, seul, la feuille « Problèmes — des paquets de 8 ou de 9 ».",
          "Erreurs attendues : des résultats voisins confondus — 7 × 8 et 6 × 9, 56 et 54. Aide : la barre de dix pour la table de 9, les doubles pour celle de 8 ; la table de Pythagore affichée pour qui en a besoin."),
        ph(T3, "5 min", "Ce qu'on retient : la table de 8 se retrouve en doublant celle de 4 ; celle de 9, en passant par celle de 10 et en enlevant. L'affiche des tables est complète : 6, 7, 8 et 9."),
        ph(T4, "5 min", "Par deux, les « Cartes des tables de 8 et de 9 » : l'un montre le calcul, l'autre répond, on retourne pour vérifier ; puis on les mêle à celles de 6 et de 7."),
      ]),
    seance("Partager en parts égales : diviser par 6, 7, 8 ou 9",
      sauront("partager une collection en 6, 7, 8 ou 9 parts égales, trouver la valeur d'une part avec la table de multiplication — 42 en 7 parts, c'est 6 chacun, car 7 × 6 = 42 — et l'écrire 42 ÷ 7 = 6."), 50, [
        ph(LM, "10 min", `Les tables de 8 et de 9 — « 3 × 8 », « 9 fois 7 », « 8 fois combien font 48 ? » : chercher le nombre qui manque, c'est déjà partager. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Quarante-deux jetons à partager entre sept enfants, autant pour chacun. « Combien chacun, à votre avis ? » On distribue un à un, devant la classe : six chacun. On écrit 7 × 6 = 42, et l'on dit : 42 partagé en 7 parts égales, c'est 6 ; on l'écrit 42 ÷ 7 = 6.",
          "Fait anticiper avant de distribuer : la table de 7 donne la réponse sans tout distribuer."),
        ph(T2, "20 min", "Par deux, avec des jetons ou des cubes : des partages en 6, 7, 8 ou 9 parts égales — 48 en 8, 63 en 9, 54 en 6. On partage, on dessine les parts, on écrit la multiplication qui vérifie, puis la division. Puis, seul, la feuille « Problèmes — partager en parts égales ».",
          "Erreurs attendues : des parts inégales ; une réponse prise dans la mauvaise table. Aide : distribuer un à un ; se demander « 8 fois combien font 48 ? »."),
        ph(T3, "5 min", "Ce qu'on retient : partager en parts égales, c'est chercher la valeur d'une part. La table de multiplication la donne : 7 × 6 = 42, donc 42 ÷ 7 = 6."),
        ph(T4, "5 min", "Sur l'ardoise : « 56 en 8 parts ? », « 63 en 7 ? », « 36 en 9 ? » ; chacun dit la multiplication qui vérifie."),
      ]),
    seance("Faire des paquets : combien de paquets ?",
      sauront("trouver combien de paquets de 6, 7, 8 ou 9 on peut faire avec une collection — avec 56 cubes, 7 barres de 8, car 7 × 8 = 56 —, l'écrire 56 ÷ 8 = 7, et distinguer ce problème d'un partage."), 50, [
        ph(LM, "10 min", `Les décompositions de 60 en produits — « 60, c'est 6 fois combien ? », « 60, c'est 4 fois combien ? » : combien de fois 6 dans 60, c'est la question des paquets. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Cinquante-six cubes sur le bureau : « Combien de barres de huit peut-on faire ? » On emboîte, barre après barre : sept barres. On écrit 7 × 8 = 56, donc 56 ÷ 8 = 7. On compare avec le partage de la séance précédente : là, on savait combien de parts ; ici, on sait ce que contient chaque paquet.",
          "Fait anticiper : « Combien de barres, à votre avis ? » La table de 8 répond."),
        ph(T2, "20 min", "Par deux, avec les cubes : des paquets de 6, 7, 8 ou 9 — 54 cubes en barres de 9, 42 en barres de 6, 63 en barres de 7. On fait les paquets, on les dessine, on écrit la multiplication, puis la division. Puis, seul, la feuille « Problèmes — combien de paquets ? ».",
          "Erreur attendue : répondre par la taille d'un paquet au lieu du nombre de paquets. Aide : relire la question, montrer avec les cubes ce qu'on cherche."),
        ph(T3, "5 min", "Ce qu'on retient : deux problèmes de division — chercher la valeur d'une part, chercher le nombre de parts. Une même multiplication les résout tous les deux : 7 × 8 = 56, donc 56 ÷ 8 = 7 et 56 ÷ 7 = 8."),
        ph(T4, "5 min", "Sur l'ardoise, des problèmes dits : un partage, ou des paquets ? On dit d'abord ce qu'on cherche, puis on répond."),
      ]),
    // La séance détaillée du manuel, sa séance 5 : ses six phases, leur organisation et leur durée — le calcul mental garde ses cinq minutes.
    seance("Six équipes de huit : le diagramme en barres",
      sauront("produire et utiliser un diagramme en barres pour résoudre un problème multiplicatif : une case par groupe, la même valeur dans chaque case, le tout sous l'accolade — 6 équipes de 8 élèves, c'est 8 + 8 + 8 + 8 + 8 + 8 = 6 × 8 = 48 élèves."), 50, [
        ph(LM, "5 min", "Collectif. L'enseignant prévient : pour ce qu'on va apprendre, il faut bien savoir ses tables. Il dit un produit — « 7 × 3 », par exemple ; quelques secondes pour réfléchir ; au signal, chacun écrit le résultat sur son ardoise et la montre.",
          "Valide, repère les erreurs et corrige aussitôt."),
        ph("Phase 2 – Collectif", "5 min", "Avant la séance, en EPS : pour la balle au capitaine, quatre équipes de six joueurs — les bleus, les rouges, les verts, les jaunes —, montrées sur une affiche avec leurs prénoms. En classe, l'enseignant annonce ce qu'on apprend : résoudre des problèmes de multiplication avec des schémas en barres. On en a déjà fait pour des problèmes d'addition — un coup d'œil aux traces écrites —, mais ceux-ci sont différents. L'affiche des équipes revient au tableau : les élèves disent ce qu'elle montre, on redit le calcul, 4 × 6 = 24. Puis le nouveau problème : « Pour la prochaine rencontre sportive, l'intervenant va former 6 équipes de 8 élèves. Combien d'élèves y aura-t-il en tout ? »",
          "Vérifie que l'énoncé est compris : que fera l'intervenant, et quand ? Que nous demande-t-on ? Un mot pose-t-il problème ? Est-ce la même situation que les équipes d'EPS ? Qu'est-ce qui est pareil, qu'est-ce qui change ?"),
        ph("Phase 3 – Collectif", "10 min", "L'enseignant affiche six bandes de huit enfants dessinés, côte à côte, bord contre bord. Avec la classe, il cherche la réponse en disant chaque geste. On accepte 8 + 8 + 8 + 8 + 8 + 8, puis on écrit 6 × 8 = 48. Mais on ne peut pas dessiner les enfants de chaque problème : un point remplacera chaque enfant. Six cases de huit points, une accolade dessous, 48 en tout : c'est un diagramme en barres. On écrit : 8 + 8 + 8 + 8 + 8 + 8 = 6 × 8 = 48 ; il y aura 48 élèves en tout.",
          "Montre sa propre démarche, pas à pas, à voix haute. Présente le schéma, le commente et le justifie avec les élèves ; nomme le « diagramme en barres »."),
        ph("Phase 4 – Binômes", "15 min", "Par deux, trois problèmes, de moins en moins aidés ; la même feuille est projetée au tableau. D'abord « Pratique guidée — des points dans les cases » : le diagramme est dessiné, les points sont dans les cases ; on écrit l'addition, la multiplication, puis la phrase réponse. Puis « Pratique guidée — des cases à remplir » : une case par paquet, on y met une croix pour chaque objet, puis on calcule. Enfin « Pratique guidée — le diagramme à dessiner » : on dessine soi-même le diagramme. Une correction collective après chaque problème.",
          "Forme les binômes d'après les difficultés observées. Questionne souvent et précisément — « Que montre ce point ? », « Pourquoi tant de cases ? » —, fait reformuler et justifier, favorise les échanges entre élèves. Repère ceux qui peinent : les aide à l'oral, revient sur sa démonstration, leur donne un autre support ; accepte un autre schéma s'il est efficace."),
        ph("Phase 5 – Collectif", "5 min", "La synthèse : un problème de multiplication se résout avec un diagramme en barres — une case par groupe, la même valeur dans chaque case, le tout sous l'accolade —, puis l'addition répétée ou, mieux, la multiplication. L'affiche bilan de la classe et la fiche de référence de chacun montrent un problème résolu ainsi, celui des équipes par exemple.",
          "Confronte ce que les élèves disent avoir appris avec ce qu'il fallait apprendre. La fiche va dans le cahier de référence : on s'y reporte aux séances suivantes."),
        ph("Phase 6 – Individuel", "10 min", "Seul, la feuille « Problèmes — construire le diagramme en barres » : pour chaque problème, dessiner d'abord son diagramme en barres, puis s'en servir pour calculer et répondre. Pour qui en a besoin, « Problèmes — le diagramme à compléter » : des énoncés semblables, les cases déjà dessinées.",
          "Réunit ceux qui ont eu du mal et reprend avec eux les passages délicats : des objets à manipuler, des bandes de papier pour figurer les cases, selon les besoins."),
      ]),
    seance("Le même diagramme pour diviser",
      sauront("se servir du même diagramme en barres pour diviser — on connaît le tout et le nombre de parts, on cherche une part ; ou le tout et une part, on cherche le nombre de parts —, puis écrire la multiplication à trou et la division."), 50, [
        ph(LM, "10 min", `Les tables de 6 à 9, dans les deux sens — « 7 × 8 », « 6 fois combien font 54 ? » : chercher le facteur qui manque, c'est diviser. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Le problème des équipes, retourné : « 48 élèves forment 6 équipes égales : combien dans chaque équipe ? », puis « 48 élèves, des équipes de 8 : combien d'équipes ? » On joue la scène avec 48 cubes, puis on reprend le diagramme de la fiche de référence : le même, mais le point d'interrogation change de place — dans une case, ou sur le nombre de cases.",
          "Du réel au dessin, puis à l'écriture. Fait dire ce qu'on connaît et ce qu'on cherche avant de calculer."),
        ph(T2, "20 min", "Par deux, la feuille « Diviser — le diagramme dessiné » : le diagramme est donné ; on dit ce que cherche le « ? », on écrit la multiplication à trou, puis la division. Puis, seul, la feuille « Problèmes — multiplier ou diviser ? » : on dessine soi-même le diagramme, on y place le « ? », on calcule.",
          "Erreur attendue : multiplier les deux nombres de l'énoncé — 48 × 6. Aide : revenir au diagramme — le tout est-il connu ? — et aux cubes."),
        ph(T3, "5 min", "Ce qu'on retient, sur la fiche de référence : un seul diagramme pour trois problèmes. Le tout, c'est le nombre de parts × une part ; une part, c'est le tout ÷ le nombre de parts ; le nombre de parts, c'est le tout ÷ une part."),
        ph(T4, "5 min", "Sur l'ardoise, trois problèmes dits : on dessine vite le diagramme, on y place le « ? », puis on calcule."),
      ]),
    seance("De plus grands nombres : le diagramme ne change pas",
      sauront("résoudre des problèmes multiplicatifs avec de plus grands nombres en dessinant le même diagramme en barres, calculer en décomposant — 6 × 24, c'est 6 × 20 + 6 × 4 —, et inventer un problème qui va avec un diagramme."), 50, [
        ph(LM, "10 min", `Un chiffre fois des dizaines entières — « 6 × 20 », « 4 × 30 » : 4 fois 3 dizaines, 12 dizaines, 120. ${ROUTINE}`, CHAQUE_JOUR),
        ph(T1, "10 min", "Pour la fête de l'école, on installe 6 rangées de 24 chaises. « Combien de chaises en tout ? » On dessine le même diagramme : six cases, 24 dans chaque case. Seul le calcul change : 6 × 24, c'est 6 × 20 et 6 × 4, 120 + 24 = 144.",
          "Fait remarquer que le diagramme ne dépend pas de la taille des nombres : on n'y dessine plus de points, on écrit le nombre dans la case."),
        ph(T2, "15 min", "Seul, la feuille « Problèmes — de plus grands nombres » : dessiner le diagramme, écrire la multiplication ou la division, la calculer en ligne en décomposant, répondre par une phrase.",
          "Le diagramme est un appui, jamais une obligation : le texte officiel de 2018 le dit pour les élèves qui réussissent sans lui. Qui bute y revient, avec les cubes s'il le faut."),
        ph(T3, "5 min", "Ce qu'on retient : quels que soient les nombres, le diagramme est le même ; c'est le calcul qui change. Devant un nouveau problème, on cherche dans le cahier de référence celui qui lui ressemble : « c'est comme le problème des équipes ». Viendront ensuite la multiplication posée et des nombres plus grands encore."),
        ph(T4, "10 min", "Par deux, la feuille « Des diagrammes à raconter » : pour chaque diagramme, inventer une histoire qui va avec, l'écrire au dos de la feuille, puis la donner à résoudre à une autre paire.",
          "Inventer l'énoncé oblige à dire ce que montre chaque case : c'est le regard sur sa propre démarche que cherche la méthode. Vérifie que l'histoire a bien des parts égales."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
const martiniere = (seance: number, objectif: string, tables: number[], series = REGLAGES_MARTINIERE.series): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = {
    ...REGLAGES_MARTINIERE, niveau: "CE2", objectifs: [objectif], revision: false, tables: tables.length ? tables : REGLAGES_MARTINIERE.tables,
    forme: "oral", series, ardoises: true,
  };
  const o = objectifParId(objectif);
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${o ? libelleTravaille(o, r.tables) : objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
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

/** Ce que la feuille montre du diagramme : un cadre pour le dessiner, ses cases vides, des points dans ses cases, ou le diagramme entier. */
const A_DESSINER: Presentation = { ...PRESENTATION_COMPLETE, schema: "sans" };
const CASES_VIDES: Presentation = { ...PRESENTATION_COMPLETE, schema: "vide" };
const POINTS: Presentation = { ...PRESENTATION_COMPLETE, schema: "nombres", images: "avec-nombres", formeImages: "ronds" };
const DESSINE: Presentation = { ...PRESENTATION_COMPLETE, schema: "nombres" };
/** Le diagramme seul, sans énoncé : l'histoire est à inventer. */
const SANS_ENONCE: Presentation = { ...PRESENTATION_COMPLETE, enonce: false };

type Plage = [number, number];
const TOUT: TypeMultiplicatif[] = ["tout"];
const DIVISER: TypeMultiplicatif[] = ["part", "nombre"];
const LES_TROIS: TypeMultiplicatif[] = ["tout", "part", "nombre"];

/**
 * Des problèmes de parts égales, dans l'atelier « Problèmes multiplicatifs » : `parts`, le nombre de paquets ; `valeurs`, ce
 * que contient chacun ; `p`, ce que la feuille montre du diagramme. Il les refait, avec les mêmes réglages et le même tirage.
 */
const problemes = (seance: number, titre: string, nombre: number, types: TypeMultiplicatif[], parts: Plage, valeurs: Plage, p: Presentation): FeuilleAFabriquer => ({
  seance, atelier: "multiplicatifs", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererMultiplicatifs({ nombre, types, table: 10, parts, valeurs, enonces: p.enonce, prenoms: [] }, g), titre, p),
    style: STYLE_PROBLEMES,
    refaire: {
      multiplicatifs: { titre, nombre, prenoms: "", types, table: 10, perso: true, partsMin: parts[0], partsMax: parts[1], valeurMin: valeurs[0], valeurMax: valeurs[1] },
      "presentation:multiplicatifs": p,
    },
  }),
});

const FEUILLES: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL.map(([objectif, tables, series], s) => martiniere(s, objectif, tables, series)),
  problemes(0, "Problèmes — des paquets de 6 ou de 7", 4, TOUT, [2, 9], [6, 7], A_DESSINER),
  cartes(0, "Cartes des tables de 6 et de 7", [6, 7]),
  problemes(1, "Problèmes — des paquets de 8 ou de 9", 4, TOUT, [2, 9], [8, 9], A_DESSINER),
  cartes(1, "Cartes des tables de 8 et de 9", [8, 9]),
  // Diviser par 6, 7, 8 ou 9 : le nombre de parts du partage, puis la taille des paquets.
  problemes(2, "Problèmes — partager en parts égales", 4, ["part"], [6, 9], [2, 9], A_DESSINER),
  problemes(3, "Problèmes — combien de paquets ?", 4, ["nombre"], [2, 9], [6, 9], A_DESSINER),
  // La séance du manuel : ses trois problèmes de pratique guidée, à ses nombres — 5 × 8, 5 × 9, 8 × 7 —, puis l'entraînement.
  problemes(4, "Pratique guidée — des points dans les cases", 1, TOUT, [5, 5], [8, 8], POINTS),
  problemes(4, "Pratique guidée — des cases à remplir", 1, TOUT, [5, 5], [9, 9], CASES_VIDES),
  problemes(4, "Pratique guidée — le diagramme à dessiner", 1, TOUT, [8, 8], [7, 7], A_DESSINER),
  problemes(4, "Problèmes — construire le diagramme en barres", 4, TOUT, [3, 9], [6, 9], A_DESSINER),
  problemes(4, "Problèmes — le diagramme à compléter", 4, TOUT, [3, 9], [6, 9], CASES_VIDES),
  problemes(5, "Diviser — le diagramme dessiné", 4, DIVISER, [3, 9], [6, 9], DESSINE),
  problemes(5, "Problèmes — multiplier ou diviser ?", 6, LES_TROIS, [3, 9], [6, 9], A_DESSINER),
  problemes(6, "Problèmes — de plus grands nombres", 4, LES_TROIS, [3, 9], [12, 25], A_DESSINER),
  problemes(6, "Des diagrammes à raconter", 3, LES_TROIS, [3, 6], [6, 25], SANS_ENONCE),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; des cubes emboîtables, de quoi faire dix barres de six et dix barres de sept par binôme ; une affiche pour les tables",
  "Les ardoises ; des cubes emboîtables, en barres de huit et en barres de dix ; l'affiche des tables ; la table de Pythagore, pour qui en a besoin",
  "Les ardoises ; quarante-deux jetons pour le tableau ; des jetons ou des cubes par binôme, de quoi faire des partages jusqu'à 81",
  "Les ardoises ; cinquante-six cubes emboîtables pour le tableau ; des cubes par binôme",
  "Les ardoises et des brouillons ; le tableau interactif, pour projeter les feuilles ; l'affiche des quatre équipes de la dernière séance d'EPS, "
    + "avec les prénoms des joueurs ; six bandes de huit enfants dessinés, à préparer ; les traces écrites des problèmes additifs ; pour qui en a "
    + "besoin, des objets à manipuler et des bandes de papier pour figurer les cases ; l'affiche bilan et la fiche de référence, à préparer",
  "Les ardoises ; quarante-huit cubes ; la fiche de référence et l'affiche bilan",
  "Les ardoises ; la fiche de référence ; des cubes, pour qui en a besoin",
];

/** Les feuilles et le matériel de la séquence, séance par séance. */
export function planSingapourCe2(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
