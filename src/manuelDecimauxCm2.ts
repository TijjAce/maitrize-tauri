// L'addition de deux nombres décimaux, au CM2 : une séquence d'après le manuel
// de préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 8, « Nombres décimaux CM2 »,
// p. 133-146.
//
// Le sujet part d'un calcul en ligne, 12,47 + 2,7, et des erreurs de trois
// élèves : les nombres alignés à droite comme des entiers, la partie entière
// et la partie décimale ajoutées chacune de son côté, onze dixièmes laissés
// dans leur colonne. Le manuel n'écrit pas de plan de séquence : il détaille
// une séance de remédiation en six phases (p. 143-145), qui vient après une
// évaluation, et ne donne pas de période. Les séances 1, 2, 3 et 5 sont de
// Maitrize, d'après ce qu'il dit des prérequis (p. 142), de ses choix
// didactiques et pédagogiques (p. 142-143), de sa conclusion (p. 145) et des
// questions du jury (p. 146) — le zéro qui compte, une autre grandeur que la
// longueur —, et la source le dit. La séquence en deux séances de son corpus
// (document 3) n'est pas suivie : le manuel lui reproche de montrer la
// technique sans problème à résoudre. Le texte du manuel n'est pas repris : ses
// phases sont dites ici avec nos mots, ses élèves n'ont pas de prénom, et son
// problème de grillage a un autre habillage.
//
// Sa séance s'ouvre sur une dictée de nombres, pas sur du calcul mental :
// aucune phase La Martinière n'est écrite ici. Maitrize l'ajoute d'office en
// tête de chaque séance des décimaux (voir sequencesToutesFaites.ts).
//
// Au CM2, le programme de 2025 range « Ajouter deux nombres décimaux… » dans
// le calcul mental ; l'addition posée des décimaux est au CM1. La séquence sert
// cette compétence, et se range avec les décimaux.
//
// Ses feuilles viennent des ateliers « Grands nombres et décimaux », « Comparer
// les nombres », « Calcul mental », « Opérations posées » et « La monnaie », à
// leurs réglages : chacune se rouvre dans le sien. Aucun atelier ne fait encore
// d'additions de décimaux dont les parties décimales n'ont pas la même
// longueur, ni de problèmes à données décimales : les calculs du manuel
// s'écrivent au tableau.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_COMPARER, STYLE_COMPARER, htmlComparer, paquet, reglagesComparerSurs, type FormeNombre } from "./comparerNombres";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type FormeEntrainement, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie, type ReglagesMonnaie } from "./monnaie";
import { REGLAGES_NUMERATION, STYLE_NUMERATION, htmlNumeration, type ReglagesNumeration } from "./numeration";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";

export const ID_DECIMAUX_CM2 = "addition-decimaux-cm2";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

export const DEMARCHE_DECIMAUX_CM2: Demarche = {
  id: ID_DECIMAUX_CM2,
  nom: "Additionner deux nombres décimaux (CM2)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 8, « Nombres décimaux CM2 », p. 133-146 : l'analyse des erreurs et la séance de remédiation détaillée `
    + "(p. 141-145) ; les séances 1, 2, 3 et 5 ajoutées par Maitrize, d'après les prérequis, les choix didactiques, la conclusion et les questions "
    + "du jury que le manuel donne (p. 142-146), et le document « Le nombre au cycle 3 » (Éduscol) qu'il cite (p. 133-134) ; "
    + "programme de mathématiques du cycle 3 (2025)",
  resume: "Au CM2, additionner deux décimaux dont les parties décimales n'ont pas le même nombre de chiffres : 12,47 + 2,7. Le manuel part de "
    + "trois erreurs relevées dans un calcul en ligne — les nombres alignés à droite comme des entiers, la partie entière et la partie décimale "
    + "ajoutées chacune de son côté, onze dixièmes laissés dans leur colonne — et leur répond par une séance de remédiation : un problème de "
    + "grillage autour d'un jardin de 12,76 m sur 8,9 m, le tableau des longueurs, les nombres bien dits — 12 m et 76 cm, 12 unités et "
    + "76 centièmes — et les fractions décimales : 16/10 = 1 + 6/10. Avant, on apprend à dire les décimaux, puis à additionner des longueurs "
    + "mises bout à bout, et un calcul en ligne fait le point ; après, le zéro qui compte, et d'autres grandeurs que la longueur : les prix, "
    + "les masses.",
  visee: { intitule: /Ajouter deux nombres décimaux/i, niveaux: ["CM2"] },
  seances: [
    seance("Dire les décimaux pour les comprendre",
      sauront("lire un décimal en disant ce que vaut chaque chiffre — 35,48, c'est 35 unités et 48 centièmes, ou 35 unités, 4 dixièmes et 8 centièmes —, l'écrire sous la dictée, le placer dans le tableau de numération et l'écrire avec des fractions décimales : 2,47 = 2 + 4/10 + 7/100."), 45, [
        ph(T1, "10 min", "Un mètre ruban déroulé au tableau. On y montre 2 m et 5 cm : comment l'écrire en mètres ? 2,05 m — 2 mètres et 5 centièmes de mètre. D'autres longueurs prises sur le ruban — 1,5 m ; 1,25 m ; 0,75 m — se lisent avec leurs unités.",
          "Dit les nombres avec leurs unités — « 2 mètres et 5 centièmes de mètre » — plutôt que « deux virgule zéro cinq », qui laisse croire à deux entiers séparés par une virgule."),
        ph(T2, "20 min", "Dictée sur l'ardoise de décimaux dits par leurs unités : « 7 unités et 4 dixièmes », « 12 unités et 9 centièmes », « 6 dixièmes »… Chaque nombre va ensuite dans le tableau de numération, un chiffre par colonne, puis s'écrit en fractions : 12,09 = 12 + 9/100. Le carré de cent fait voir qu'une colonne est un dixième, un petit carré un centième : la feuille « Le carré de cent et les bandes unités ». Seul, la feuille « Lire, écrire, décomposer les décimaux ».",
          "Erreurs attendues : « six dixièmes » écrit 6,10 ; 45/100 lu 45,100 ; le dixième pris pour la dizaine, le centième pour la centaine ; dans 3,284, le 2 appelé chiffre des centaines, comme dans 284. Aide : revenir au ruban, au carré de cent, au tableau."),
        ph(T3, "10 min", "Ce qu'on retient : la virgule sépare les unités des dixièmes ; chaque chiffre vaut selon sa colonne ; 1 unité = 10 dixièmes, 1 dixième = 10 centièmes. Un même nombre s'écrit de plusieurs façons : 2,47 = 247/100 = 2 + 47/100 = 2 + 4/10 + 7/100.",
          "Écrit la trace avec les élèves ; chacun lit un nombre de deux façons qui ont du sens."),
        ph(T4, "5 min", "Par deux, « La bataille des décimaux » : chaque carte montre un décimal à virgule, en fraction décimale, en somme de fractions, en unités de numération ou en lettres ; le même nombre sous deux formes fait une égalité. Le jeu reste en autonomie les jours suivants.",
          "Fait justifier : « 4 unités et 6 dixièmes, c'est 4,6 »."),
      ]),
    seance("Des longueurs bout à bout : additionner deux décimaux",
      sauront("additionner deux décimaux en ajoutant les unités aux unités, les dixièmes aux dixièmes, les centièmes aux centièmes, et dire l'échange : dix dixièmes font une unité."), 45, [
        ph(T1, "10 min", "Deux rubans mis bout à bout : 1,45 m et 0,8 m. Quelle longueur en tout ? Chacun écrit son estimation, puis on mesure : 2,25 m. Les résultats proposés sont confrontés à la mesure.",
          "Laisse venir les réponses : la mesure tranche. 1,53 m — les nombres alignés à droite, ou les deux parties ajoutées à part — et 1,125 m — douze dixièmes laissés dans leur colonne — se discutent : le ruban dépasse 2 m."),
        ph(T2, "20 min", "Par groupes, des bandes de papier mesurées au mètre ruban : on calcule la longueur de deux bandes mises bout à bout, puis on vérifie en mesurant. On dessine le calcul sur le carré de cent : les dixièmes avec les dixièmes, et une unité de plus quand ils dépassent dix. Puis on l'écrit en disant les unités : 1 unité et 45 centièmes, plus 8 dixièmes… La feuille « Ajouter deux décimaux — chercher, expliquer ».",
          "Fait dire l'échange : « 12 dixièmes, c'est 1 unité et 2 dixièmes ». Un zéro peut compléter : 0,8 = 0,80. Le matériel reste sous la main."),
        ph(T3, "10 min", "Ce qu'on retient, sur l'affiche : on ajoute les chiffres de même rang — unités, dixièmes, centièmes. Dans le tableau, une colonne ne garde qu'un chiffre : dix dixièmes font une unité, qu'on met en retenue. Posée, l'addition met la virgule sous la virgule, comme les entiers mettent les unités sous les unités.",
          "Relie à la technique des entiers que la classe connaît déjà : on n'en change pas, on la dit avec des dixièmes et des centièmes."),
        ph(T4, "5 min", "Sur l'ardoise : 2,6 + 0,7 ; 3,25 + 1,5 ; 4 + 0,35. On dit chaque résultat avec ses unités."),
      ]),
    seance("Évaluation : calculer en ligne",
      sauront("montrer ce qu'ils savent faire seuls : ajouter en ligne deux décimaux, ou un entier et un décimal, et expliquer leur calcul — même quand les parties décimales n'ont pas le même nombre de chiffres, comme 12,47 + 2,7."), 30, [
        ph("Évaluation", "25 min", "La feuille « Calcul en ligne — évaluation » : des sommes en temps limité, puis sans limite de temps, et un calcul à expliquer. Puis trois calculs écrits au tableau, à faire en ligne sur la même feuille : 12,47 + 2,7 ; 5,6 + 3,85 ; 6,8 + 2,57.",
          "Observe sans aider. Garde les copies : on relève les erreurs par sorte — les nombres alignés à droite comme des entiers, la partie décimale ajoutée à part, dix dixièmes ou plus laissés dans leur colonne."),
        ph(T3, "5 min", "Chacun dit comment il a calculé 12,47 + 2,7. Tous les résultats trouvés s'écrivent au tableau, sans trancher : la séance suivante y revient.",
          "Repère qui décompose déjà : 12,47 + 2 = 14,47, puis 14,47 + 0,7 = 15,17."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée.
    seance("Le grillage du jardin : une séance de remédiation",
      sauront("additionner en ligne deux décimaux dont les parties décimales n'ont pas le même nombre de chiffres — 12,76 + 8,9 = 21,66 —, en disant la valeur de chaque chiffre, en s'aidant du tableau des longueurs et en échangeant dix dixièmes contre une unité."), 55, [
        ph("Phase 1 – Collectif", "5 min", "L'enseignant dit des décimaux ; chacun les écrit en chiffres sur l'ardoise. Puis une liste de décimaux écrite au tableau : on les lit à voix haute.",
          "Fait dire les nombres par leurs unités — « 8 unités et 9 dixièmes », « 12 unités et 76 centièmes ». Repère qui confond encore dixième et dizaine."),
        ph("Phase 2 – Groupes de quatre", "10 min", "Un problème en plusieurs étapes, cherché par groupes sur une affiche, avec les traces de recherche et les calculs : « Un maraîcher veut entourer de grillage un jardin rectangulaire de 12,76 m de long sur 8,9 m de large. Le grillage se vend au mètre — on ne coupe pas un mètre —, 4,50 € le mètre. Combien va-t-il payer ? »",
          "Fait des groupes plutôt homogènes, pour rester au plus près de ce que chacun sait faire ; le travail à quatre fait dire les nombres. Laisse chercher : les trois erreurs relevées à l'évaluation vont revenir dans les calculs."),
        ph("Phase 3 – Collectif", "10 min", "Les groupes montrent leurs démarches ; on les compare. L'enseignant en explicite une : ce que veut dire 12,76 m — 12 m et 76 cm, ou 12 m, 7 dm et 6 cm : 12 mètres et 76 centièmes de mètre ; le demi-périmètre, puis le périmètre ; la longueur de grillage à acheter ; le prix. Il donne le résultat attendu, 198 € : chaque groupe dit si le sien est juste.",
          "Mène la confrontation ; dit les nombres avec leurs unités de longueur. Ne reprend pas encore les calculs faux : la phase suivante y revient."),
        ph("Phase 4 – Individuel puis collectif", "15 min", "Retour au premier calcul : 12,76 + 8,9. Quatre résultats sont proposés — 20,85 ; 13,65 ; 20,166 ; 21,66 — : chacun recopie sur l'ardoise celui qu'il croit juste. On vérifie dans le tableau des longueurs — dizaines de mètres, mètres, décimètres, centimètres, millimètres. Un élève qui a réussi place la virgule après les mètres, dit pourquoi, et écrit les deux nombres l'un sous l'autre. Un élève qui a laissé 16 dixièmes dans leur colonne fait l'addition au tableau. On complète par des zéros. Une colonne ne garde qu'un chiffre : 16 dm = 10 dm + 6 dm = 1 m + 6 dm, et 16/10 = 10/10 + 6/10 = 1 + 6/10. On place la retenue, puis on refait le calcul en ligne en disant les unités de numération ou les longueurs.",
          "Chaque résultat faux vient d'une erreur relevée : 20,85, les parties entière et décimale ajoutées chacune à part ; 13,65, les nombres alignés à droite comme des entiers ; 20,166, les 16 dixièmes laissés dans leur colonne. Fait dire par les élèves qui ont réussi qu'une colonne ne peut pas garder deux chiffres ; envoie au tableau un élève qui a fait la troisième erreur. Aides : la mesure, le tableau, l'écriture en fractions."),
        ph("Phase 5 – Individuel", "5 min", "21,66 + 21,66, en ligne : chacun montre son résultat sur l'ardoise. Puis quelques minutes pour finir le problème. L'enseignant conclut avec la classe : le périmètre mesure 43,32 m ; il faut acheter 44 m de grillage ; 44 × 4,50 € = 198 €.",
          "Termine les derniers calculs devant la classe : le grillage se vend au mètre entier, d'où 44 m."),
        ph("Phase 6 – Individuel", "10 min", "Seul : deux additions à poser en colonnes, 13,25 + 4,72 et 7,46 + 3,1, puis quatre en ligne : 4,36 + 2,21 ; 3,75 + 1,2 ; 2,8 + 4,35 ; 3,52 + 2,5. Qui a fini prend la feuille « Additions posées — des prix » ou la feuille « Calcul en ligne — des décimaux ».",
          "Différencie selon les erreurs de chacun : qui en fait encore une reprend avec l'enseignant le tableau des longueurs et les fractions décimales ; les autres avancent seuls."),
      ]),
    seance("Quand le zéro compte : des prix et des masses",
      sauront("additionner des prix et des masses écrits avec une virgule, compléter un décimal par des zéros sans changer sa valeur — 2,5 € = 2,50 € — et garder le zéro qui compte : 2,05 €, ce n'est pas 2,5 €."), 45, [
        ph(T1, "10 min", "Avec des pièces et des billets pour jouer, on paie 2 € et 5 centimes, puis 2 € et 50 centimes. Comment écrire ces deux prix ? 2,05 € ; 2,50 €, qui s'écrit aussi 2,5 €. Où le zéro compte-t-il ? La feuille « Pièces et billets à découper ».",
          "C'est la difficulté que la séance du grillage laissait de côté : on y vient quand l'addition est sûre. Fait dire que 5 centimes, ce sont 5 centièmes d'euro."),
        ph(T2, "20 min", "Des achats : on ajoute deux prix avec les pièces, puis en ligne, puis posés, la virgule sous la virgule — 3,75 € + 1,8 € ; 12,05 € + 4,95 €. La feuille « Euros et centimes : l'écriture à virgule », puis la feuille « Additions de prix à poser ». Une autre grandeur : deux paquets pesés sur la balance, 1,25 kg et 0,8 kg. Combien en tout ? 2,05 kg.",
          "Fait comparer les grandeurs : un prix a toujours deux chiffres après la virgule, ce qui cache la difficulté des parties décimales de longueurs différentes ; une masse en kilogrammes en a souvent trois — 1,250 kg. Le matériel reste sous la main."),
        ph(T3, "10 min", "Ce qu'on retient : on peut écrire des zéros à la fin de la partie décimale sans changer le nombre — 2,5 = 2,50 = 2,500 ; un zéro entre la virgule et un chiffre, lui, compte — 2,05 n'est pas 2,5. Prix, longueurs et masses s'additionnent de la même façon : les unités avec les unités, les dixièmes avec les dixièmes.",
          "Écrit la trace avec les élèves, à côté de celle des longueurs."),
        ph(T4, "5 min", "Un problème dit, résolu sur l'ardoise : un livre à 8,95 € et un cahier à 2,5 €. Combien faut-il payer ? On vérifie avec les pièces : 11,45 €."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Une feuille de l'atelier « Calcul mental », dans la forme voulue — matériel, découverte, test écrit, évaluation —, au CM2. */
const calculMental = (seance: number, titre: string, objectifs: string[], forme: FormeEntrainement): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: "CM2", objectifs, revision: objectifs.length > 1, forme };
  return {
    seance, atelier: "martiniere", titre,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

/** Une feuille de l'atelier « Grands nombres et décimaux ». */
const numeration = (seance: number, titre: string, r: Partial<ReglagesNumeration>): FeuilleAFabriquer => {
  const reglages: ReglagesNumeration = { ...REGLAGES_NUMERATION, ...r };
  return {
    seance, atelier: "numeration", titre,
    fabriquer: (g) => ({ html: htmlNumeration(reglages, g), style: STYLE_FEUILLE + STYLE_NUMERATION, refaire: { numeration: reglages } }),
  };
};

/** Les cartes de l'atelier « Comparer les nombres », aux décimaux du CM2 : un même nombre sous deux formes, la règle, les signes, la feuille de jeu. */
const cartesDecimaux = (seance: number, titre: string, formes: FormeNombre[]): FeuilleAFabriquer => {
  const r = reglagesComparerSurs({ ...REGLAGES_COMPARER, titre, niveau: "cm2-decimaux", formes });
  return {
    seance, atelier: "comparer", titre,
    fabriquer: (g) => ({ html: htmlComparer(paquet(r, g), r), style: STYLE_FEUILLE + STYLE_COMPARER, refaire: { comparer: r } }),
  };
};

/** Des additions de l'atelier « Opérations posées » : des montants en euros, deux chiffres après la virgule. */
const additionsDePrix = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages: ReglagesPosees = { ...REGLAGES_POSEES, operation: "+", euros: true, ...r };
  return {
    seance, atelier: "posees", titre,
    fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES, refaire: { operationsPosees: reglages } }),
  };
};

/** Une feuille de l'atelier « La monnaie ». */
const monnaie = (seance: number, titre: string, r: Partial<ReglagesMonnaie>): FeuilleAFabriquer => {
  const reglages: ReglagesMonnaie = { ...REGLAGES_MONNAIE, ...r };
  return {
    seance, atelier: "monnaie", titre,
    fabriquer: (g) => ({ html: htmlMonnaie(reglages, g), style: STYLE_FEUILLE + STYLE_MONNAIE, refaire: { monnaie: reglages } }),
  };
};

/** Le calcul en ligne de la séquence : deux décimaux à un chiffre après la virgule, et un entier ajouté à un décimal — la décomposition qui réussit. */
const EN_LIGNE = ["cm2-somme-decimaux", "cm2-entier-decimal-retenue"];

const FEUILLES: FeuilleAFabriquer[] = [
  calculMental(0, "Le carré de cent et les bandes unités", ["cm2-ecritures-decimales"], "materiel"),
  numeration(0, "Lire, écrire, décomposer les décimaux", { decimaux: true, jusqua: 100, decimales: 2, exercices: ["tableau", "lettres", "decomposition"], combien: 5 }),
  cartesDecimaux(0, "La bataille des décimaux", ["virgule", "fraction", "fractions", "unitesDec", "lettres"]),
  calculMental(1, "Ajouter deux décimaux — chercher, expliquer", ["cm2-somme-decimaux"], "decouverte"),
  calculMental(2, "Calcul en ligne — évaluation", EN_LIGNE, "evaluation"),
  // La séance du manuel : ses calculs s'écrivent au tableau ; ces deux feuilles, pour qui a fini.
  additionsDePrix(3, "Additions posées — des prix", { chiffres: 4, retenue: "melange", combien: 6, posees: true }),
  calculMental(3, "Calcul en ligne — des décimaux", EN_LIGNE, "ecrit"),
  monnaie(4, "Pièces et billets à découper", { exercice: "planche", jusqua: 50, centimes: true }),
  monnaie(4, "Euros et centimes : l'écriture à virgule", { exercice: "ecriture", jusqua: 50, combien: 10 }),
  additionsDePrix(4, "Additions de prix à poser", { chiffres: 3, retenue: "avec", combien: 6, posees: false }),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après. */
const MATERIEL = [
  "Un mètre ruban, déroulé au tableau ; les ardoises ; le tableau de numération jusqu'aux centièmes, affiché",
  "Deux rubans, de 1,45 m et de 0,8 m ; par groupe, des bandes de papier de longueurs données et un mètre ruban ; les carrés de cent de la séance 1 ; "
    + "une affiche pour ce qu'on retient ; les ardoises",
  "Les trois calculs à écrire au tableau en fin d'évaluation (12,47 + 2,7 ; 5,6 + 3,85 ; 6,8 + 2,57) ; les copies, gardées pour le relevé des erreurs",
  "Les ardoises ; par groupe de quatre, l'énoncé du problème du grillage, une affiche et des feutres ; au TBI ou au tableau, le tableau des longueurs — "
    + "dizaines de mètres, mètres, décimètres, centimètres, millimètres —, à remplir devant la classe",
  "Une balance et deux paquets, de 1,25 kg et de 0,8 kg ; des étiquettes de prix ; les ardoises",
];

/** Les feuilles et le matériel de la séquence. */
export function planDecimauxCm2(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
