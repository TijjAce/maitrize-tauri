// La division euclidienne au CM1 : une séquence d'après le manuel de
// préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 4, « Division euclidienne CM1 »,
// p. 77-94.
//
// Le sujet demande la deuxième séance : celle qui précède l'apprentissage de
// l'algorithme. Le manuel découpe la séquence en cinq séances, pour les
// périodes 3 et 4 (p. 90) : des problèmes de partage qui réactivent la
// division partition ; la procédure experte, présentée à partir d'un
// problème — sa séance, détaillée en six phases de dix minutes (p. 91-93) ;
// l'algorithme, avec un diviseur à un chiffre, puis à deux ; l'entraînement,
// l'évaluation et les remédiations. Les phases des séances 1, 3, 4 et 5 sont
// de Maitrize, d'après ses prérequis (p. 90-91), ses connaissances
// didactiques (p. 82-88) et les questions du jury (p. 94) : la source le dit.
// Le texte du manuel n'est pas repris : ses phases sont dites ici avec nos
// mots, et son problème des pirates garde ses nombres, sans prénom.
//
// Sa séance s'ouvre sur dix minutes de calcul en ligne — un facteur à
// trouver, « combien de fois », un reste —, que le manuel range avec le
// calcul mental : elle devient ici le calcul mental La Martinière, et chaque
// séance s'ouvre de même, sur ce que la division demande.
//
// L'algorithme est celui que le manuel retient : on partage les centaines,
// puis les dizaines, puis les unités — une plaque qui reste devient dix
// barres —, et la potence écrit ces partages. Le programme de 2025 s'en
// tient, au CM1, au diviseur à un chiffre : la séance 4 va plus loin, comme
// le manuel, et le dit. À côté de « La division euclidienne posée (CM1) »
// (cycle3Calcul.ts), bâtie sur le programme, celle-ci part du partage.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Le calcul — CM1,
// CM2 » — le quotient et le reste en ligne, les partages, les divisions en
// potence —, « Problèmes multiplicatifs », « Résoudre un problème pas à
// pas », « Opérations posées », « Nombres en cubes », « Cartes de calcul » et
// « Grands nombres et décimaux », à leurs réglages : chacune se rouvre dans
// le sien. Le dessin du trésor et l'affiche de la méthode n'en ont pas : on
// les écrit au tableau.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_POSEES, STYLE_POSEES, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererMultiplicatifs, type TypeMultiplicatif,
} from "./problemesBarres";
import { STYLE_AIDES, htmlResolution, reglagesResolutionSurs } from "./aidesALaTache";
import { REGLAGES_CUBES, STYLE_CUBES, exercicesCubes, htmlCubes, reglagesCubesSurs } from "./cubesNumeration";
import { STYLE_JEUX_MATHS, cartesCalcul, htmlCartesCalcul, type ReglagesCalcul } from "./jeuxMaths";
import { REGLAGES_NUMERATION, STYLE_NUMERATION, htmlNumeration, type ReglagesNumeration } from "./numeration";
import { REGLAGES_CALCUL_CM, STYLE_CALCUL_CM, htmlCalculCM, type ReglagesCalculCM } from "./calculCoursMoyen";

export const ID_DIVISION_EUCLIDIENNE_CM1 = "division-euclidienne-cm1";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const CHAQUE_JOUR = "En début de séance de numération et de calcul, chaque jour.";

export const DEMARCHE_DIVISION_EUCLIDIENNE_CM1: Demarche = {
  id: ID_DIVISION_EUCLIDIENNE_CM1,
  nom: "La division euclidienne par partages successifs (CM1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 4, « Division euclidienne CM1 », p. 77-94 : la séquence en cinq séances et sa période (p. 90), `
    + "la séance 2, détaillée en six phases (p. 91-93), dont le calcul en ligne devient le calcul mental ; les phases des séances 1, 3, 4 et 5 "
    + "et le calcul mental en tête de chacune ajoutés par Maitrize, d'après les prérequis (p. 90-91), les connaissances didactiques (p. 82-88) "
    + "et les questions du jury (p. 94) ; programme de mathématiques du cycle 3 (2025)",
  resume: "Au CM1, en périodes 3 et 4 : la division euclidienne d'un entier par un entier, construite par partages successifs — les centaines, "
    + "puis les dizaines, puis les unités — avant la potence. Le sens vient d'un problème de partage : quatre pirates se partagent un trésor de "
    + "6 coffres de 10 bourses, de 7 bourses de 10 pièces d'or et de 2 pièces. On cherche d'abord à sa façon ; puis le matériel multibase rejoue "
    + "le partage — une plaque qui reste devient dix barres, une barre dix cubes. Chacun a 168 pièces : 672 = 4 × 168 ; avec 841 ÷ 5, un cube "
    + "reste, qu'on ne partage pas. Avant, une séance de problèmes de partage réactive le sens et les procédures ; après, la potence avec un "
    + "diviseur à un chiffre, puis à deux — au-delà du programme de 2025, qui s'en tient au CM1 au diviseur à un chiffre —, l'entraînement, "
    + "l'évaluation et les remédiations. Le calcul mental ouvre chaque séance : la technique demande les tables dans les deux sens.",
  visee: { intitule: /divisions euclidiennes avec un diviseur à un chiffre/i, niveaux: ["CM1"] },
  seances: [
    seance("Partager à parts égales : chercher la valeur d'une part",
      sauront("résoudre un problème de partage à parts égales — chercher la valeur d'une part — de plusieurs façons : distribuer, ajouter ou retirer plusieurs fois le même nombre, essayer des multiplications ; et écrire le résultat par une égalité : 96 = 4 × 24, ou 75 = 4 × 18 + 3."), 50, [
        ph(LM, "10 min", `Une table de multiplication, un facteur à trouver — « 7 × … = 35 », « 42, c'est 6 fois combien ? » : partager, c'est souvent chercher dans les tables. ${ROUTINE}`,
          CHAQUE_JOUR),
        ph(T1, "10 min", "Un partage en vrai : pour chaque groupe de quatre, une boîte de 72 jetons. « Partagez-les à parts égales : combien chacun ? » On distribue un par un, ou par paquets ; chacun compte sa part et l'écrit sur l'ardoise.",
          "Observe les façons de distribuer : un par un, par deux, par paquets de cinq ou de dix. Fait dire pourquoi les paquets vont plus vite, et ce qu'on fait des jetons qui restent."),
        ph(T2, "15 min", "La feuille « Problèmes — partager à parts égales » : quatre partages, avec de plus grands nombres. Chacun cherche à sa façon — dessiner, ajouter ou retirer plusieurs fois, essayer des multiplications —, puis écrit l'égalité qui répond : 96 = 4 × 24. Mise en commun : on compare les procédures, de la plus longue à la plus rapide.",
          "Le matériel reste à disposition. Deux obstacles à guetter : faire un bon premier essai — 10 chacun, ce n'est pas assez ; 30, c'est trop — et, dans une addition répétée, compter combien de fois on a ajouté. Relie chaque procédure à la multiplication à trou : 4 × … = 96."),
        ph(T3, "5 min", "Ce qu'on retient : partager à parts égales, c'est chercher la valeur d'une part ; on cherche combien de fois le nombre de parts, et l'on écrit 96 = 4 × 24. S'il reste des objets qu'on ne peut plus partager, on l'écrit aussi : 75 = 4 × 18 + 3 ; le reste est plus petit que 4.",
          "On n'écrit pas 75 ÷ 4 = 18 reste 3 : l'égalité dit tout."),
        ph(T4, "10 min", "Pour partager de grands nombres, on partagera les centaines, puis les dizaines, puis les unités. 672, c'est 6 centaines, 7 dizaines et 2 unités ; c'est aussi 5 centaines, 17 dizaines et 2 unités, ou 67 dizaines et 2 unités. On le montre avec le matériel multibase, puis la feuille « Faire un nombre de plusieurs façons ».",
          "Une plaque s'échange contre dix barres, une barre contre dix cubes : le partage de la séance suivante le demandera. Fait distinguer le chiffre des dizaines de 672, 7, et son nombre de dizaines, 67."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée ; le calcul en ligne qui l'ouvre devient le calcul mental.
    seance("Le trésor des pirates : partager les centaines, les dizaines, les unités",
      sauront("trouver le résultat d'une division par partages successifs : partager les centaines, puis les dizaines, puis les unités, en changeant en dizaines les centaines qui restent et en unités les dizaines qui restent ; écrire le résultat par une égalité : 672 = 4 × 168, 841 = 5 × 168 + 1."), 60, [
        ph(LM, "10 min", "L'enseignant dit ce qu'on va apprendre, et pourquoi ces calculs : ils préparent la suite. Des calculs de formes variées, dits et écrits au tableau — « 6 × … = 36 », « 49, c'est combien de fois 7 ? », « 47 = (9 × …) + … » : chacun écrit le résultat sur son ardoise et la lève au signal. Correction collective. Le manuel les donne aussi en ligne, sur une fiche : la feuille « Calcul en ligne — le quotient et le reste ».",
          "Différencie : une aide individuelle, la table de multiplication sous les yeux, des nombres plus petits, ou la recherche à deux."),
        ph("Phase 2 – Individuel", "10 min", "Recherche. Chacun reçoit la feuille « Le trésor des pirates » et la lit seul : quatre pirates se partagent à parts égales un trésor de 6 coffres, 7 bourses et 2 pièces d'or ; un coffre contient 10 bourses, une bourse 10 pièces. Combien de pièces d'or pour chacun ?",
          "S'assure que la situation est comprise : un coffre, c'est 10 bourses, donc 100 pièces. Procédures possibles : des essais qu'on ajuste en encadrant — 100 chacun, ce n'est pas assez ; 200, c'est trop — ; certains partageront déjà les coffres, puis les bourses, puis les pièces."),
        ph("Phase 3 – Collectif", "10 min", "Mise en commun. Des volontaires montrent leur solution et disent comment ils ont fait ; chaque proposition est discutée. Puis l'enseignant annonce la suite : vérifier les résultats, et apprendre la technique de la division.",
          "Mène le débat et gère les échanges ; c'est la classe qui valide."),
        ph("Phase 4 – Groupes de 4 élèves", "10 min", "Nouvelle recherche, avec le matériel multibase. Chaque groupe reçoit 6 plaques, 7 barres et 2 cubes — 6 centaines, 7 dizaines et 2 unités — et les partage à parts égales entre ses quatre membres.",
          "Veille au lien entre le matériel et le problème : la plaque, c'est le coffre ; la barre, la bourse ; le cube, la pièce. Erreur la plus fréquente : partager ce qui se partage tout de suite — 4 plaques et 4 barres — et laisser le reste. Aide, s'il le faut, à échanger une plaque contre dix barres, une barre contre dix cubes, pour finir le partage."),
        ph("Phase 5 – Collectif", "10 min", "Mise en commun : on confronte les façons de faire, on valide — 168 pièces chacun, 672 = 4 × 168 — et l'on présente la méthode, étape par étape. Les 6 centaines pour 4 : 1 chacun, il en reste 2. Ces 2 centaines font 20 dizaines ; avec les 7, 27 dizaines : 6 chacun, il en reste 3. Ces 3 dizaines font 30 unités ; avec les 2, 32 unités : 8 chacun. Puis une autre manipulation, 841 ÷ 5 : un cube reste, qu'on ne partage pas. 841 = 5 × 168 + 1.",
          "Écrit chaque partage, et ce qui reste, sur l'affiche de la méthode. Fait dire qu'après les centaines, il y a deux sortes de dizaines à partager : celles qu'on voyait, et celles qui viennent des centaines restantes. Le reste, plus petit que le diviseur, ne se partage pas dans la division euclidienne."),
        ph("Phase 6 – Individuel", "10 min", "Entraînement : des divisions à faire seul, par partages successifs, sur la feuille « Partager les centaines, les dizaines, les unités ». Selon son niveau, chacun garde ce qui l'aide : le dessin des coffres, des bourses et des pièces, celui du matériel multibase, à côté de chaque tableau, ou les lettres C, D, U.",
          "Observe qui partage seul et qui revient au matériel. Selon les difficultés : des nombres plus petits ; un matériel plus explicite — de grandes enveloppes de dix petites, de dix pièces chacune — ; le calcul mental à reprendre."),
      ]),
    seance("La potence : diviser par un nombre à un chiffre",
      sauront("poser et calculer en potence la division euclidienne d'un entier par un nombre à un chiffre : prévoir le nombre de chiffres du quotient, partager rang par rang en abaissant le chiffre suivant ; nommer dividende, diviseur, quotient et reste, et vérifier par l'égalité : 256 = 9 × 28 + 4."), 55, [
        ph(LM, "10 min", `Une table à l'envers, les divisions — « 35 ÷ 7 », « 48 ÷ 6 » : chaque étape de la potence en demande une. ${ROUTINE}`,
          CHAQUE_JOUR),
        ph(T1, "10 min", "Des partages à la potence : on reprend 672 ÷ 4 avec le matériel et l'affiche de la méthode, et l'on écrit chaque partage dans la potence. 6 centaines pour 4 : 1, il en reste 2. J'abaisse les 7 dizaines : 27 dizaines pour 4, 6, il en reste 3. J'abaisse les 2 unités : 32 pour 4, 8. On nomme : 672 est le dividende, 4 le diviseur, 168 le quotient, 0 le reste.",
          "Garde le matériel à côté de l'écrit : abaisser, c'est ajouter les dizaines qu'on voyait à celles qui viennent des centaines restantes."),
        ph(T2, "20 min", "Poser des divisions, d'abord ensemble — 584 ÷ 3, 256 ÷ 9, 1 548 ÷ 7, 841 ÷ 5 —, puis seul, sur la feuille « Divisions en potence — par un chiffre ». D'abord, combien de chiffres au quotient ? Dans 256 ÷ 9, 2 centaines pour 9, on ne peut pas : on prend 25 dizaines, et le quotient a deux chiffres. Puis, à chaque étape : combien de fois le diviseur ? On multiplie, on soustrait, on abaisse le chiffre suivant.",
          "Les lettres C, D, U pour le quotient, le matériel et la table de multiplication pour qui en a besoin. Erreurs attendues : un chiffre oublié au quotient, un reste plus grand que le diviseur, une soustraction fausse. On pose les soustractions ; qui les fait de tête peut s'en passer."),
        ph(T3, "5 min", "Ce qu'on retient, sur l'affiche : on prévoit le nombre de chiffres du quotient ; à chaque étape, on cherche combien de fois le diviseur, on soustrait, on abaisse le chiffre suivant ; le reste est toujours plus petit que le diviseur. On écrit 256 = 9 × 28 + 4."),
        ph(T4, "10 min", "Vérifier une division : avec le diviseur, le quotient et le reste, on retrouve le dividende — 9 × 28 + 4 = 256. La feuille « Multiplications posées, pour vérifier » : des multiplications par un nombre à un chiffre, comme celles des vérifications.",
          "Une vérification qui ne redonne pas le dividende : on cherche l'étape fausse."),
      ]),
    seance("La potence : diviser par un nombre à deux chiffres",
      sauront("poser une division par un nombre à deux chiffres : prévoir le nombre de chiffres du quotient en multipliant le diviseur par 10, 100 ou 1 000, écrire à côté les produits du diviseur qui servent, puis calculer le quotient et le reste : 785 = 25 × 31 + 10."), 50, [
        ph(LM, "10 min", `Multiplier un nombre par 10, 100 ou 1 000 — « 27 × 100 », « 25 × 10 » : de quoi prévoir le nombre de chiffres du quotient. ${ROUTINE}`,
          CHAQUE_JOUR),
        ph(T1, "10 min", "785 ÷ 25 : combien de chiffres au quotient ? 25 × 10 = 250 et 25 × 100 = 2 500 : le quotient est entre 10 et 100, il a deux chiffres. On écrit à côté les produits de 25 qui serviront : 25, 50, 75, 100.",
          "Le programme de 2025 n'attend au CM1 qu'un diviseur à un chiffre : cette séance va plus loin, comme le manuel. On peut la garder pour ceux qui sont prêts, ou pour la fin de l'année."),
        ph(T2, "20 min", "On pose : 78 dizaines pour 25, 3 fois — 75 —, il en reste 3. J'abaisse le 5 : 35 pour 25, 1 fois, il reste 10. 785 = 25 × 31 + 10. Puis d'autres divisions, sur la feuille « Divisions en potence — par deux chiffres », et pour qui est prêt 7 805 ÷ 27, ce qu'on attend en fin d'école : 27 × 9 = 243 et 27 × 8 = 216 s'écrivent à côté. La feuille « Multiplications posées — deux chiffres par un chiffre » : les calculs qu'on fait à côté de la potence.",
          "Des essais mieux ciblés par un encadrement : 27 × 9 = 243 est le plus grand produit qui ne dépasse pas 245. Autorise les produits écrits à côté ; encourage à poser les soustractions. Les tables en aide-mémoire pour qui en a besoin."),
        ph(T3, "5 min", "Ce qu'on retient : avec un diviseur à deux chiffres, on prévoit le nombre de chiffres du quotient, on écrit à côté les produits du diviseur, et l'on pose comme avant ; le reste est toujours plus petit que le diviseur."),
        ph(T4, "5 min", "Une division à poser seul, 936 ÷ 12, puis à vérifier par l'égalité : 936 = 12 × 78."),
      ]),
    seance("Entraînement, évaluation, remédiations",
      sauront("poser et calculer seuls des divisions euclidiennes par un nombre à un chiffre, vérifier chacune par l'égalité, et s'en servir pour chercher la valeur d'une part ou le nombre de parts ; ceux qui en ont besoin reprennent les tables et la numération."), 55, [
        ph(LM, "10 min", `Multiplier un nombre à un chiffre par des dizaines ou des centaines — « 4 × 200 », « 9 × 20 » : les essais de la potence. ${ROUTINE}`,
          CHAQUE_JOUR),
        ph(T4, "10 min", "La feuille « Problèmes — partager ou grouper » : chercher la valeur d'une part, ou le nombre de parts — combien de boîtes ? —, puis écrire l'égalité. La même division répond aux deux.",
          "Fait dire ce qu'on cherche avant de calculer : la valeur d'une part, ou combien de parts."),
        ph("Évaluation", "20 min", "Seul, sans aide, la feuille « Divisions en potence — évaluation » : quatre divisions à poser et à calculer, par un nombre à un chiffre — dont une où le premier chiffre du dividende est plus petit que le diviseur, et une avec un zéro au quotient, comme 824 ÷ 4 —, et l'égalité qui vérifie chacune.",
          "Observe sans aider : qui prévoit le nombre de chiffres du quotient, qui oublie le zéro du quotient, qui se trompe dans les tables ou dans les soustractions."),
        ph("Remédiations", "15 min", "Pour qui en a besoin : refaire un partage avec le matériel multibase, ou avec des enveloppes et des pièces ; les tables, avec la feuille « Cartes de calcul — tables de 6 à 9 » ; la numération, avec la feuille « Décomposer les nombres ». Les autres : des divisions plus longues, et des problèmes. Ensuite, un entraînement court et régulier ; au CM2, on partagera aussi le reste : la division décimale.",
          "Reprend avec le matériel ce que l'évaluation a montré. Pour passer à la division décimale, il faudra un reste qu'on peut partager en dixièmes et en centièmes : des euros, des mètres."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. Plusieurs objectifs : une révision. */
const martiniere = (seance: number, objectifs: string[], tables: number[] = [], titre?: string): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = {
    ...REGLAGES_MARTINIERE, niveau: "CM1", objectifs, revision: objectifs.length > 1, tables: tables.length ? tables : REGLAGES_MARTINIERE.tables, forme: "oral", ardoises: true,
  };
  const o = objectifParId(objectifs[0]);
  return {
    seance, atelier: "martiniere", titre: titre ?? `Calcul mental — ${o ? libelleTravaille(o, tables) : objectifs[0]}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

const PRESENTATION_SANS_SCHEMA = { ...PRESENTATION_COMPLETE, schema: "sans" as const };
/** Quatre problèmes de l'atelier multiplicatif, aux plages choisies : il les refait, avec les mêmes réglages et le même tirage. */
const problemes = (seance: number, titre: string, types: TypeMultiplicatif[], parts: [number, number], valeurs: [number, number]): FeuilleAFabriquer => ({
  seance, atelier: "multiplicatifs", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererMultiplicatifs({ nombre: 4, types, table: 10, parts, valeurs, enonces: true, prenoms: [] }, g), titre, PRESENTATION_SANS_SCHEMA),
    style: STYLE_PROBLEMES,
    refaire: {
      multiplicatifs: { titre, nombre: 4, prenoms: "", types, table: 10, perso: true, partsMin: parts[0], partsMax: parts[1], valeurMin: valeurs[0], valeurMax: valeurs[1] },
      "presentation:multiplicatifs": PRESENTATION_SANS_SCHEMA,
    },
    graine: g,
  }),
});

/** Le problème des pirates dans l'atelier « Résoudre un problème pas à pas » : l'énoncé en couleurs, la question à part, les quatre étapes. */
const TRESOR = reglagesResolutionSurs({
  niveau: "ecole",
  enonce: "Quatre pirates ont pris un trésor sur un autre navire.\nIls le partagent à parts égales.\nLe trésor : 6 coffres, 7 bourses et 2 pièces d'or.\n"
    + "Dans un coffre, il y a 10 bourses.\nDans une bourse, il y a 10 pièces d'or.",
  question: "Combien de pièces d'or chaque pirate recevra-t-il ?",
  couleurs: true, questionAPart: true,
});
const tresor = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "resolution", titre: "Le trésor des pirates",
  fabriquer: () => ({ html: htmlResolution(TRESOR), style: STYLE_FEUILLE + STYLE_AIDES, refaire: { resolution: TRESOR } }),
});

const posees = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages: ReglagesPosees = { ...REGLAGES_POSEES, ...r };
  return {
    seance, atelier: "posees", titre,
    fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES, refaire: { operationsPosees: reglages } }),
  };
};

/** Un nombre de trois chiffres fait de plusieurs façons, en plaques, barres et cubes : le niveau « jusqu'à 1 000 » de l'atelier. */
const CUBES_FACONS = reglagesCubesSurs({
  ...REGLAGES_CUBES, titre: "Faire un nombre de plusieurs façons", exercice: "facons", niveau: "ce1", nombre: 4,
  memeCouleur: false, legende: true, numeros: true, retenir: false, desordre: false,
});
const facons = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "cubes", titre: CUBES_FACONS.titre,
  fabriquer: (g) => ({ html: htmlCubes(exercicesCubes(CUBES_FACONS, g), CUBES_FACONS, g), style: STYLE_FEUILLE + STYLE_JEUX_MATHS + STYLE_CUBES, refaire: { cubes: CUBES_FACONS } }),
});

const TABLES_6_A_9: ReglagesCalcul = { operation: "x", tables: [6, 7, 8, 9], rectoVerso: true, melanger: true };
const cartesDesTables = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "calcul", titre: "Cartes de calcul — tables de 6 à 9",
  fabriquer: (g) => ({ html: htmlCartesCalcul(cartesCalcul(TABLES_6_A_9, g), TABLES_6_A_9), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { cartesCalcul: TABLES_6_A_9 } }),
});

const DECOMPOSER: ReglagesNumeration = { ...REGLAGES_NUMERATION, decimaux: false, jusqua: 10000, exercices: ["decomposition"], combien: 6 };
const decomposer = (seance: number): FeuilleAFabriquer => ({
  seance, atelier: "numeration", titre: "Décomposer les nombres",
  fabriquer: (g) => ({ html: htmlNumeration(DECOMPOSER, g), style: STYLE_FEUILLE + STYLE_NUMERATION, refaire: { numeration: DECOMPOSER } }),
});

/** Une feuille de l'atelier « Le calcul — CM1, CM2 » : il la refait, avec les mêmes réglages et le même tirage. */
const calcul = (seance: number, titre: string, r: Partial<ReglagesCalculCM>): FeuilleAFabriquer => {
  const reglages: ReglagesCalculCM = { ...REGLAGES_CALCUL_CM, classe: "CM1", ...r, titre };
  return {
    seance, atelier: "calculCM", titre,
    fabriquer: (g) => ({ html: htmlCalculCM(reglages, g), style: STYLE_FEUILLE + STYLE_CALCUL_CM, refaire: { calculCM: reglages } }),
  };
};

const FEUILLES: FeuilleAFabriquer[] = [
  // Le calcul mental de chaque séance : les tables, dans les deux sens, puis ce que demandent les essais de la potence.
  martiniere(0, ["cm1-table-multiplication"], [6, 7, 8, 9]),
  martiniere(1, ["cm1-table-multiplication", "cm1-tables-envers"], [4, 5, 6, 7, 9], "Calcul mental — Tables de multiplication et divisions : 4, 5, 6, 7, 9"),
  martiniere(2, ["cm1-tables-envers"], [6, 7, 8, 9]),
  martiniere(3, ["cm1-fois-10-100-1000"]),
  martiniere(4, ["cm1-fois-dizaines-centaines"]),
  problemes(0, "Problèmes — partager à parts égales", ["part"], [3, 9], [11, 25]),
  facons(0),
  // La séance du manuel : son calcul en ligne, l'énoncé des pirates, et les partages de l'entraînement, le matériel dessiné à côté.
  calcul(1, "Calcul en ligne — le quotient et le reste", { exercice: "quotient-reste", combien: 10 }),
  tresor(1),
  calcul(1, "Partager les centaines, les dizaines, les unités", { exercice: "division-partages", combien: 3, materiel: true }),
  calcul(2, "Divisions en potence — par un chiffre", { exercice: "division-euclidienne", diviseur: 1, combien: 4, posees: true }),
  posees(2, "Multiplications posées, pour vérifier", { operation: "×", chiffres: 3, chiffresDuSecond: 1, retenue: "melange", combien: 6, posees: true }),
  calcul(3, "Divisions en potence — par deux chiffres", { exercice: "division-euclidienne", diviseur: 2, combien: 4, posees: true }),
  posees(3, "Multiplications posées — deux chiffres par un chiffre", { operation: "×", chiffres: 2, chiffresDuSecond: 1, retenue: "melange", combien: 6, posees: true }),
  calcul(4, "Divisions en potence — évaluation", { exercice: "division-euclidienne", diviseur: 1, combien: 4, posees: false, difficultes: true }),
  problemes(4, "Problèmes — partager ou grouper", ["part", "nombre"], [3, 9], [11, 30]),
  cartesDesTables(4),
  decomposer(4),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; une boîte de 72 jetons par groupe de quatre ; le matériel multibase — plaques, barres, cubes —, à disposition",
  "Les ardoises ; par groupe de quatre, 6 plaques, 7 barres et 2 cubes du matériel multibase, et de quoi échanger — une vingtaine de barres, "
    + "une trentaine de cubes — ; au tableau, 8 plaques, 4 barres et 1 cube pour 841 ÷ 5 ; le dessin du trésor — 6 coffres, 7 bourses, 2 pièces — "
    + "à projeter ou à dessiner ; l'affiche de la méthode, à écrire avec la classe ; "
    + "pour la remédiation, des enveloppes et des pièces — de grandes enveloppes de dix petites, de dix pièces chacune",
  "Les ardoises ; le matériel multibase et l'affiche de la méthode ; les divisions à poser, au tableau ; les tables de multiplication en aide-mémoire",
  "Les ardoises ; les divisions à poser, au tableau ; les tables de multiplication en aide-mémoire",
  "Les ardoises ; pour la remédiation, le matériel multibase, des enveloppes et des pièces",
];

/** Les feuilles et le matériel de la séquence. */
export function planDivisionEuclidienneCm1(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
