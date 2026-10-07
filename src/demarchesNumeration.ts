// Les démarches de la numération au cycle 2, classe par classe.
//
// Une séquence part maintenant de la compétence qu'on choisit en la créant :
// la classe de la compétence dit quelle démarche suivre, et quelles feuilles
// les ateliers fabriquent pour ses séances.
//
// Les sources :
// - le livret d'accompagnement du programme de mathématiques du CP (Éduscol,
//   2025), « Proposition de séquence n° 1 – Enseigner les nombres et la
//   numération au CP (les nombres entiers jusqu'à 59) » : huit séances, du
//   nom des dizaines entières à l'écriture en lettres ;
// - le guide « Pour enseigner les nombres, le calcul et la résolution de
//   problèmes au CP » (Éduscol, 2021), chapitre 1 : la structure de la
//   numération orale — les « repérants » et les deux comptines — pour aller
//   jusqu'à cent en période 3, comme le prévoit la progression du livret.
// Les livrets du CE1 et du CE2 (2025) ne proposent pas de séquence de
// numération. À la demande de l'enseignant, leurs séquences prolongent
// celles du CP — les mêmes étapes, avec la centaine au CE1 et le millier au
// CE2, comme le prévoient les repères de progression — et le disent.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import { fr } from "./nombres";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });

/** Ce qui change d'une classe à l'autre : les nombres, la plus grande unité, ses exemples. */
interface Palier {
  id: "cp-59" | "cp-100" | "ce1" | "ce2";
  classe: "CP" | "CE1" | "CE2";
  /** « jusqu'à 59 ». */
  jusqua: string;
  /** La plus grande unité de numération travaillée, et la précédente. */
  unite: string; unites: string; precedente: string;
  /** Sa pièce de matériel, avec son article, et celle de la précédente. */
  piece: string; pieces: string; piecePrecedente: string; unePiece: string;
  /** Tous les rangs, du plus grand au plus petit ; les regroupements qui les font ; tout le matériel. */
  rangs: string; regroupements: string; materielComplet: string;
  /** Le nombre qui sert d'exemple tout au long de la séquence, et ses écritures. */
  exemple: string; enUnites: string; enUnitesSeules: string; autreDecomposition: string; additive: string;
  autresAdditives: string; enLettres: string;
  /** Un codage dans le désordre, avec trop d'unités d'un rang, et le nombre qu'il désigne. */
  desordre: string; desordreVaut: string;
  /** Le nombre de la séance 2 du livret : sa collection, et son écriture. */
  collection: string; collectionVaut: string;
  /** Les représentations attendues à la séance 8, le nombre qu'elles désignent et son écriture en lettres. */
  representations: string; representationsDe: string; representationsEnLettres: string;
}

const PALIERS: Record<Palier["id"], Palier> = {
  "cp-59": {
    id: "cp-59", classe: "CP", jusqua: "jusqu'à 59", unite: "dizaine", unites: "dizaines", precedente: "unité",
    piece: "barre de dix cubes", pieces: "barres", piecePrecedente: "cube", unePiece: "une barre",
    rangs: "dizaines et unités", regroupements: "par dix", materielComplet: "les barres et les cubes",
    exemple: "47", enUnites: "4 dizaines et 7 unités", enUnitesSeules: "47 unités", autreDecomposition: "3 dizaines et 17 unités",
    additive: "40 + 7", autresAdditives: "40 + 5 + 2 ; 10 + 10 + 10 + 10 + 7", enLettres: "quarante-sept",
    desordre: "15 u et 3 d", desordreVaut: "45", collection: "4 dizaines et 2 unités", collectionVaut: "42",
    representations: "53, 5 d et 3 u, 3 d et 23 u, 30 + 23, 53 u, 3 u et 5 d", representationsDe: "53", representationsEnLettres: "cinquante-trois",
  },
  "cp-100": {
    id: "cp-100", classe: "CP", jusqua: "jusqu'à 100", unite: "dizaine", unites: "dizaines", precedente: "unité",
    piece: "barre de dix cubes", pieces: "barres", piecePrecedente: "cube", unePiece: "une barre",
    rangs: "dizaines et unités", regroupements: "par dix", materielComplet: "les barres et les cubes",
    exemple: "73", enUnites: "7 dizaines et 3 unités", enUnitesSeules: "73 unités", autreDecomposition: "6 dizaines et 13 unités",
    additive: "70 + 3", autresAdditives: "60 + 13 ; 10 + 10 + 10 + 10 + 10 + 10 + 10 + 3", enLettres: "soixante-treize",
    desordre: "13 u et 6 d", desordreVaut: "73", collection: "8 dizaines et 6 unités", collectionVaut: "86",
    representations: "84, 8 d et 4 u, 7 d et 14 u, 80 + 4, 84 u, 4 u et 8 d", representationsDe: "84", representationsEnLettres: "quatre-vingt-quatre",
  },
  ce1: {
    id: "ce1", classe: "CE1", jusqua: `jusqu'à ${fr(1000)}`, unite: "centaine", unites: "centaines", precedente: "dizaine",
    piece: "plaque de cent", pieces: "plaques", piecePrecedente: "barre", unePiece: "une plaque",
    rangs: "centaines, dizaines et unités", regroupements: "par dix, puis par dix dizaines", materielComplet: "les plaques, les barres et les cubes",
    exemple: "345", enUnites: "3 centaines, 4 dizaines et 5 unités", enUnitesSeules: "34 dizaines et 5 unités, ou 345 unités",
    autreDecomposition: "2 centaines, 14 dizaines et 5 unités", additive: "300 + 40 + 5", autresAdditives: "200 + 100 + 45 ; 100 + 100 + 100 + 40 + 5",
    enLettres: "trois cent quarante-cinq", desordre: "15 d, 3 c et 4 u", desordreVaut: "454",
    collection: "3 centaines, 4 dizaines et 2 unités", collectionVaut: "342",
    representations: "526, 5 c 2 d 6 u, 4 c 12 d 6 u, 52 d 6 u, 500 + 20 + 6, 6 u 2 d 5 c", representationsDe: "526", representationsEnLettres: "cinq cent vingt-six",
  },
  ce2: {
    id: "ce2", classe: "CE2", jusqua: `jusqu'à ${fr(10000)}`, unite: "millier", unites: "milliers", precedente: "centaine",
    piece: "gros cube de mille", pieces: "gros cubes", piecePrecedente: "plaque", unePiece: "un gros cube",
    rangs: "milliers, centaines, dizaines et unités", regroupements: "par dix, puis par dix dizaines, puis par dix centaines",
    materielComplet: "les gros cubes, les plaques, les barres et les cubes",
    exemple: fr(2345), enUnites: "2 milliers, 3 centaines, 4 dizaines et 5 unités", enUnitesSeules: "23 centaines, 4 dizaines et 5 unités, ou 234 dizaines et 5 unités",
    autreDecomposition: "1 millier, 13 centaines, 4 dizaines et 5 unités", additive: `${fr(2000)} + 300 + 40 + 5`,
    autresAdditives: `${fr(1000)} + ${fr(1000)} + 345 ; ${fr(2000)} + 345`, enLettres: "deux mille trois cent quarante-cinq",
    desordre: "12 c, 2 m et 5 u", desordreVaut: fr(3205), collection: "2 milliers, 3 centaines, 4 dizaines et 2 unités", collectionVaut: fr(2342),
    representations: `${fr(4526)}, 4 m 5 c 2 d 6 u, 3 m 15 c 2 d 6 u, 45 c 2 d 6 u, ${fr(4000)} + 500 + 20 + 6`, representationsDe: fr(4526),
    representationsEnLettres: "quatre mille cinq cent vingt-six",
  },
};

const SOURCE_LIVRET_CP = "Livret d'accompagnement du programme de mathématiques, CP (Éduscol, 2025), « Proposition de séquence n° 1 – Enseigner les nombres et la numération au CP (les nombres entiers jusqu'à 59) »";
const SOURCE_GUIDE_CP = "Pour enseigner les nombres, le calcul et la résolution de problèmes au CP (guide fondamental, 2021)";
const SOURCE_PROGRAMME = "programme de mathématiques du cycle 2 (2024)";
/** Ce que dit la source d'une séquence prolongée : d'où elle vient, et que l'adaptation est la nôtre. */
const adapteeDu = (classe: string, source: string) =>
  `Adaptée du CP au ${classe}, faute de séquence de numération dans le livret ${classe} (Éduscol, 2025) : ${source} ; ${SOURCE_PROGRAMME}`;

// ── La séquence du livret CP, et ses prolongements ────────────────────────

/** La séance 1 : le nom des nombres, selon la classe. */
function nomDesNombres(p: Palier): SeanceCadre {
  switch (p.id) {
    case "cp-59": return seance("Le nom des dizaines entières : vingt, trente, quarante, cinquante",
      "À la fin de cette séance, les élèves sauront nommer et écrire en chiffres les dizaines entières jusqu'à cinquante, et dire un nombre de vingt à cinquante-neuf en associant le nom d'une dizaine entière à la comptine de un à neuf.", 40, [
        ph(T1, "5 min", "Une barre de dix cubes, puis deux, trois, quatre, cinq : « Combien de dizaines ? Combien de cubes ? » Deux dizaines, c'est vingt ; trois dizaines, trente.",
          "Part de ce qui est su : les nombres de 1 à 20 et la dizaine, en période 1."),
        ph(T2, "20 min", "Montrer des dizaines entières et dire leur nom ; les lire et les écrire : 20, 30, 40, 50. Puis compter à partir d'une dizaine entière : trente, trente et un… trente-neuf, quarante — la comptine de un à neuf reprend après chaque nom de dizaine.",
          "Fait entendre la régularité : de vingt à cinquante-neuf, le premier mot dit le chiffre des dizaines, le second celui des unités."),
        ph(T3, "10 min", "La trace : 20 vingt, 30 trente, 40 quarante, 50 cinquante ; « trente-cinq s'écrit 35 : trente dit 3 dizaines, cinq dit 5 unités. »"),
        ph(T4, "5 min", "Dictée de dizaines entières, puis de nombres de vingt à cinquante-neuf, écrits en chiffres sur l'ardoise ; lecture de nombres écrits en chiffres."),
      ]);
    case "cp-100": return seance("Le nom des nombres jusqu'à cent : les repérants et les deux comptines",
      "À la fin de cette séance, les élèves sauront dire et écrire en chiffres les nombres jusqu'à cent en s'appuyant sur les repérants — vingt, trente, quarante, cinquante, soixante, quatre-vingts — et sur la petite et la grande comptine.", 40, [
        ph(T1, "5 min", "Compter de dix en dix avec des barres jusqu'à soixante : « Et sept barres ? » Soixante-dix, c'est soixante et dix : le nom ne dit pas « sept ».",
          "Le guide CP : soixante-dix et quatre-vingt-dix ne sont pas des repérants, ce qui fait la réputation irrégulière de notre comptine."),
        ph(T2, "20 min", "La structure de la numération orale : de vingt à soixante, la petite comptine (un à neuf) mène d'un repérant au suivant ; de soixante, la grande comptine (un à dix-neuf) mène à quatre-vingts ; de quatre-vingts, elle mène à cent. Lire et écrire 73, 78, 91, 99 : soixante-treize, c'est soixante et treize, 7 dizaines et 3 unités.",
          "Montre la frise des repérants du guide ; fait vérifier chaque écriture avec les barres : le mot ne dit pas toujours le chiffre des dizaines."),
        ph(T3, "10 min", "La trace : les repérants, les deux comptines, et 100 — dix dizaines, zéro unité : « 10 » accolé à « 0 »."),
        ph(T4, "5 min", "Dictée et lecture de nombres de soixante à cent, en chiffres sur l'ardoise."),
      ]);
    case "ce1": return seance("Le nom des centaines entières : cent, deux cents… neuf cents",
      "À la fin de cette séance, les élèves sauront nommer et écrire en chiffres les centaines entières jusqu'à mille, et dire un nombre jusqu'à mille en associant le nom des centaines à celui d'un nombre de un à quatre-vingt-dix-neuf.", 40, [
        ph(T1, "5 min", "Une plaque de cent, puis deux, trois : « Combien de centaines ? Combien de barres ? Combien de cubes ? » Deux centaines, c'est deux cents ; dix centaines, c'est mille.",
          "Part de ce qui est su au CP : les nombres jusqu'à cent, et 100 comme dix dizaines."),
        ph(T2, "20 min", `Montrer des centaines entières et dire leur nom ; les lire et les écrire : 100, 200… 900, ${fr(1000)}. Puis dire et écrire des nombres comme trois cent quarante-cinq : le nom des centaines, puis celui d'un nombre de un à quatre-vingt-dix-neuf.`,
          "Fait entendre la régularité : « trois cent » dit le chiffre des centaines ; « quarante-cinq » s'écrit avec les dizaines et les unités, comme au CP."),
        ph(T3, "10 min", "La trace : les centaines entières écrites en chiffres et en lettres ; « trois cent quarante-cinq s'écrit 345 : trois cents, quarante, cinq »."),
        ph(T4, "5 min", "Dictée de centaines entières, puis de nombres à trois chiffres, dont certains avec un zéro (305, 340), écrits en chiffres sur l'ardoise."),
      ]);
    case "ce2": return seance("Le nom des milliers entiers : mille, deux mille… neuf mille",
      "À la fin de cette séance, les élèves sauront nommer et écrire en chiffres les milliers entiers jusqu'à dix mille, et dire un nombre jusqu'à dix mille en associant le nom des milliers à celui d'un nombre de un à neuf cent quatre-vingt-dix-neuf.", 40, [
        ph(T1, "5 min", "Un gros cube de mille, puis deux, trois : « Combien de milliers ? Combien de plaques ? » Deux milliers, c'est deux mille ; dix milliers, c'est dix mille.",
          "Part de ce qui est su au CE1 : les nombres jusqu'à mille, et 1 000 comme dix centaines."),
        ph(T2, "20 min", `Montrer des milliers entiers et dire leur nom ; les lire et les écrire : ${fr(1000)}, ${fr(2000)}… ${fr(9000)}, ${fr(10000)}. Puis dire et écrire des nombres comme deux mille trois cent quarante-cinq : le nom des milliers, puis celui d'un nombre de un à neuf cent quatre-vingt-dix-neuf.`,
          "Fait entendre la régularité : « deux mille » dit le chiffre des milliers ; mille ne prend jamais de s. L'espace entre les milliers et les centaines aide à lire."),
        ph(T3, "10 min", `La trace : les milliers entiers écrits en chiffres et en lettres ; « deux mille trois cent quarante-cinq s'écrit ${fr(2345)} ».`),
        ph(T4, "5 min", `Dictée de milliers entiers, puis de nombres à quatre chiffres, dont certains avec des zéros (${fr(2045)}, ${fr(3400)}), écrits en chiffres sur l'ardoise.`),
      ]);
  }
}

/** La séquence du livret CP — jusqu'à 59, jusqu'à 100 — et ses prolongements au CE1 et au CE2. */
function livretDesNombres(p: Palier): Demarche {
  const cp = p.classe === "CP";
  const materiel = cp ? "des cubes emboîtables d'une même couleur, qui forment des barres de dix" : `${p.materielComplet}, ou des bûchettes en paquets`;
  const source = p.id === "cp-59" ? `${SOURCE_LIVRET_CP} ; ${SOURCE_PROGRAMME}`
    : p.id === "cp-100" ? `${SOURCE_LIVRET_CP}, prolongée jusqu'à cent comme le prévoit sa progression (période 3) ; ${SOURCE_GUIDE_CP}, chapitre 1, « Le système de numération oral utilisé en France » ; ${SOURCE_PROGRAMME}`
      : adapteeDu(p.classe, SOURCE_LIVRET_CP);
  return {
    id: `nombres-livret-${p.id}`,
    nom: `Les nombres ${p.jusqua} : la suite orale, l'écriture chiffrée, les représentations${cp ? "" : ` (${p.classe})`}`,
    famille: "Mathématiques",
    source,
    resume: `Deux systèmes de numération, et le lien entre eux : la numération orale, qu'on apprend à dire, et la numération écrite chiffrée, qui code les groupements par dix. On code en chiffres le cardinal d'une collection organisée en ${p.rangs} ; on s'entraîne jusqu'à l'automatisme ; on décompose et recompose — ${p.exemple}, c'est ${p.enUnites}, ou ${p.enUnitesSeules}, ou ${p.autreDecomposition}, ou ${p.additive} — ; puis on écrit en lettres et l'on passe d'une représentation à l'autre.${p.id === "cp-59" ? " Prérequis : en période 1, les nombres de 1 à 20 et la dizaine." : ""}`,
    seances: [
      nomDesNombres(p),
      seance("Coder en chiffres le cardinal d'une collection",
        `À la fin de cette séance, les élèves sauront coder en écriture chiffrée le cardinal d'une collection en l'organisant en un maximum de groupements — ${p.rangs} —, sans dénombrer un à un.`, 45, [
          ph(T1, "10 min", `Recherche individuelle : organiser le plus vite possible la collection posée devant soi en un maximum de groupements ${p.regroupements}, et noter sur l'ardoise le nombre de groupements de chaque sorte et le nombre d'éléments isolés (3 minutes). Puis un élève en réussite organise la collection ; le professeur verbalise « ${p.collection} », ce qui s'écrit ${p.collectionVaut}.`,
            `Les élèves en groupes, une collection différente par groupe ; ${materiel} — toujours le même matériel pour construire la numération.`),
          ph(T2, "15 min", "Organiser une autre collection et écrire le nombre d'éléments qu'elle contient, sans les dénombrer un à un.",
            "Guide qui en a besoin : il s'agit d'apprendre le codage conventionnel et l'écriture chiffrée."),
          ph(T3, "15 min", cp
            ? "Une collection s'organise en groupements de dix et en éléments isolés. Un groupement de dix, appelé dizaine, se code par une barre ou se note « d » ; un élément isolé, appelé unité, se code par un carré ou se note « u ». L'écriture chiffrée : le nombre de dizaines suivi du nombre d'unités ; sans élément isolé, le nombre de dizaines suivi d'un zéro."
            : `Dix unités font une dizaine, dix dizaines une centaine${p.classe === "CE2" ? ", dix centaines un millier" : ""}. Chaque groupement se code par son matériel ou se note : ${p.classe === "CE2" ? "« m », " : ""}« c », « d », « u ». L'écriture chiffrée : le nombre de ${p.unites}, puis celui de chaque unité plus petite, dans l'ordre ; un rang vide s'écrit zéro.`,
            "Fait verbaliser, écrit la trace avec les élèves."),
          ph(T4, "5 min", "Une collection dessinée : écrire son nombre en chiffres."),
        ]),
      seance("S'entraîner : grouper et écrire le nombre",
        `À la fin de cette séance, les élèves sauront donner rapidement l'écriture chiffrée d'un nombre représenté par une collection, déplaçable ou dessinée, ou par un codage donné dans le désordre (${p.desordre}).`, 30, [
          ph(T1, "5 min", "La procédure de la séance précédente, reprise avec qui en a besoin : grouper, écrire le nombre de chaque groupement, dans l'ordre."),
          ph(T2, "15 min", `Des supports variés : des éléments déplaçables, puis non déplaçables — on entoure les groupements —, puis des codages en ${p.classe === "CE2" ? "m, c, d et u" : p.classe === "CE1" ? "c, d et u" : "d et u"}, parfois dans le désordre ou avec plus de dix éléments d'un rang : ${p.desordre}, c'est ${p.desordreVaut}.`,
            "Le passage du déplaçable au non déplaçable, associé à la verbalisation, fait passer de l'expérience concrète à une pensée abstraite."),
          ph(T3, "5 min", `Ce qu'on retient : quand il y a plus de dix éléments d'un rang, on fait un groupement de plus au rang suivant.`),
          ph(T4, "5 min", "Dictées et lectures de nombres : des va-et-vient entre le nom du nombre et son écriture chiffrée."),
        ]),
      seance(`Décomposer et recomposer : ${p.rangs}`,
        `À la fin de cette séance, les élèves sauront décomposer un nombre ${p.jusqua} selon ses unités de numération et le recomposer, avec le matériel puis sans : ${p.exemple}, c'est ${p.enUnites}.`, 40, [
          ph(T1, "5 min", `« Montrez ${p.exemple} avec le moins d'éléments isolés possible. »`),
          ph(T2, "20 min", `Recomposer des nombres à partir du matériel ; décomposer des nombres écrits en chiffres ; dessiner ${p.materielComplet} d'un nombre donné.`,
            "D'abord avec le matériel ; ensuite, il ne sert plus qu'à valider."),
          ph(T3, "10 min", `${p.exemple}, c'est ${p.enUnites} : la place du chiffre dit ce qu'il compte.`),
          ph(T4, "5 min", `Le nombre mystère : « J'ai ${p.enUnites}, qui suis-je ? »`),
        ]),
      seance("Les unités de numération dans tous les sens",
        `À la fin de cette séance, les élèves sauront écrire un nombre de plusieurs façons en unités de numération — ${p.enUnites} ; ${p.enUnitesSeules} ; ${p.autreDecomposition} — et retrouver son écriture chiffrée.`, 45, [
          ph(T1, "5 min", `« ${p.autreDecomposition} » : est-ce le même nombre que ${p.exemple} ? On le construit avec le matériel.`),
          ph(T2, "20 min", "Produire plusieurs écritures en unités de numération d'un même nombre ; retrouver l'écriture chiffrée d'un nombre donné en unités de numération, dans l'ordre ou non, même avec plus de dix éléments d'un rang.",
            "Fait dire le nom de l'unité : c'est lui qui compte, pas la place dans la phrase."),
          ph(T3, "15 min", `Dix éléments d'un rang font un élément du rang suivant : défaire ${cp ? "une barre donne dix cubes" : `${p.unePiece} en donne dix du rang d'avant`}, et le nombre ne change pas.`),
          ph(T4, "5 min", "Par deux : l'un donne une écriture en unités de numération, l'autre écrit le nombre en chiffres."),
        ]),
      seance(`Les décompositions additives : ${p.additive}`,
        `À la fin de cette séance, les élèves sauront écrire un nombre comme la somme de ses ${cp ? "dizaines et de ses unités" : "unités de numération"} — ${p.exemple} = ${p.additive} — et passer de cette écriture à l'écriture chiffrée.`, 40, [
          ph(T1, "5 min", `${p.exemple} au tableau, avec son matériel : « Combien vaut chaque paquet ? » ${p.additive}.`),
          ph(T2, "20 min", "Écrire des nombres sous forme de décompositions additives, et retrouver l'écriture chiffrée de décompositions données, dans l'ordre ou non.",
            "Relie chaque terme au matériel : le chiffre et sa valeur."),
          ph(T3, "10 min", `La trace : ${p.exemple} = ${p.additive}.`),
          ph(T4, "5 min", "Dictée de décompositions : écrire le nombre en chiffres."),
        ]),
      seance("D'autres décompositions",
        `À la fin de cette séance, les élèves sauront trouver plusieurs décompositions additives d'un nombre (${p.autresAdditives}) et dire qu'elles désignent toutes le même nombre.`, 40, [
          ph(T1, "5 min", `« Trouvez une autre façon d'écrire ${p.exemple} avec des + » ; on rassemble les propositions.`,
            cp ? "À proposer à partir du moment où l'addition a été enseignée." : ""),
          ph(T2, "20 min", "Chercher plusieurs décompositions d'un même nombre, les vérifier avec le matériel, et les ranger : par unités de numération, par groupements, en plusieurs morceaux."),
          ph(T3, "10 min", "Toutes ces écritures désignent le même nombre ; certaines aident à calculer."),
          ph(T4, "5 min", "Le jeu du nombre caché : retrouver le nombre à partir d'une décomposition."),
        ]),
      seance("Écrire en lettres, passer d'une représentation à l'autre",
        `À la fin de cette séance, les élèves sauront donner l'écriture chiffrée du nombre d'une collection dessinée et en proposer d'autres représentations — ${p.representations} — et son écriture en lettres.`, 30, [
          ph("Activité 1", "10 min", "Sur une fiche, une collection non déplaçable : donner l'écriture chiffrée du nombre et en proposer différentes représentations.",
            "Invite les élèves en difficulté à faire un maximum de groupements en entourant, puis à dire le nombre de chaque groupement."),
          ph("Activité 2", "15 min", `Les élèves en réussite proposent l'écriture chiffrée et diverses représentations, dont l'écriture en lettres : ${p.representationsDe}, ${p.representationsEnLettres}. D'autres représentations se construisent collectivement, ou en groupes de besoin.`,
            "Alterne sa présence dans les groupes ; une partie des élèves travaille en autonomie."),
          ph("Rituel", "5 min", "Le livret des nombres : une page par nombre, qui s'enrichit peu à peu de ses écritures et de ses représentations."),
        ]),
    ],
  };
}

// ── « Grouper par dix », prolongé : la centaine, le millier ───────────────

/** La séquence du guide CP — grouper, échanger, écrire, représenter — avec la centaine au CE1, le millier au CE2. */
function groupementsProlonges(p: Palier): Demarche {
  const ce1 = p.classe === "CE1";
  const grand = ce1 ? "centaine" : "millier";
  const [leGrand, unGrand] = ce1 ? ["la centaine", "une centaine"] : ["le millier", "un millier"];
  const defi = ce1
    ? { titre: "Grouper pour dénombrer vite : le défi des très grands tas", question: "Lequel a le plus d'objets ?",
      quoi: "deux très grands tas de bûchettes ou de trombones, de 200 à 400 chacun, qui ne diffèrent que d'une dizaine", paquets: "des paquets de dix, puis des paquets de dix paquets, tenus par des élastiques", trace: "« Pour dénombrer une très grande collection, je fais des paquets de dix, puis des paquets de dix paquets : une centaine. »" }
    : { titre: "Grouper pour dénombrer : le défi des grandes livraisons", question: "Laquelle a le plus de trombones ?",
      quoi: `deux livraisons de trombones, l'une de ${fr(2345)} et l'autre de ${fr(2435)}, en cartons de mille, en boîtes de cent, en sachets de dix et en trombones seuls, montrées l'une après l'autre`, paquets: "les boîtes et les sachets, regroupés : dix boîtes de cent remplissent un carton de mille", trace: "« Dix centaines font un millier : pour dénombrer, je regroupe dix boîtes de cent en un carton de mille. »" };
  return {
    id: `groupements-${p.id}`,
    nom: `Grouper, échanger, écrire le nombre : ${leGrand} (${p.classe})`,
    famille: "Mathématiques",
    source: adapteeDu(p.classe, `${SOURCE_GUIDE_CP}, chapitre 1, « Focus | Une séquence d'apprentissage sur la numération écrite chiffrée »`),
    resume: `Le chemin de la dizaine au CP, repris avec ${leGrand} : de très grandes collections qu'on ne peut pas compter un à un obligent à grouper ${p.regroupements}, jusqu'à ${unGrand}. On écrit le nombre en codant chaque rang, on regroupe quand un rang dépasse dix, on lit les unités de numération dans tous les sens — ${p.autreDecomposition} —, puis on passe d'une représentation à l'autre.`,
    seances: [
      seance(defi.titre,
        `À la fin de cette séance, les élèves sauront organiser une très grande collection en groupements ${p.regroupements}, pour la comparer ou la dénombrer sans compter un à un.`, 45, [
          ph(T1, "5 min", `Le défi : ${defi.quoi}. « ${defi.question} Tout le monde doit trouver. »`,
            "Les quantités dépassent ce qu'on peut compter un à un dans le temps donné ; les deux collections ne sont jamais visibles ensemble."),
          ph(T2, "20 min", `Par groupes : une collection à dénombrer, et ${defi.paquets}. Les groupes s'organisent, puis disent combien ils en ont, à coup sûr.`,
            "Ne donne pas la solution ; relance : « Comment être sûr sans tout recompter ? »"),
          ph(T3, "15 min", `Les organisations comparées au tableau ; deux collections comparées groupement contre groupement. Le mot « ${grand} ». La trace : ${defi.trace}`),
          ph(T4, "5 min", "La feuille : écrire le nombre de grandes collections dessinées. Le défi revient en rituel, avec des collections déjà en partie groupées."),
        ]),
      seance(`${leGrand.replace(/^./, (x) => x.toUpperCase())} : dix ${p.precedente}s, ${p.unePiece}`,
        `À la fin de cette séance, les élèves sauront qu'${unGrand}, c'est dix ${p.precedente}s et ${ce1 ? "cent" : "mille"} unités : ${ce1 ? "la" : "le"} former, ${ce1 ? "la" : "le"} défaire, et dire combien chaque rang en contient.`, 40, [
          ph(T1, "5 min", ce1 ? "Dix barres de dix cubes, posées côte à côte : « Combien de cubes ? » Elles font une plaque de cent." : "Dix plaques de cent, empilées : « Combien de cubes ? » Elles font un gros cube de mille."),
          ph(T2, "20 min", ce1
            ? "Former des centaines avec dix barres ; défaire une plaque en dix barres, une barre en dix cubes : le nombre de cubes ne change pas. 3 plaques et 4 barres, c'est 34 barres, c'est 340 cubes."
            : `Former des milliers avec dix plaques ; défaire un gros cube en dix plaques : le nombre de cubes ne change pas. 2 gros cubes et 3 plaques, c'est 23 plaques, c'est ${fr(2300)} cubes.`),
          ph(T3, "10 min", ce1 ? "La trace, l'affiche de la classe : 1 centaine = 10 dizaines = 100 unités." : `La trace, l'affiche de la classe : 1 millier = 10 centaines = 100 dizaines = ${fr(1000)} unités.`),
          ph(T4, "5 min", ce1 ? "« Montrez-moi 2 centaines et 3 dizaines » : avec le matériel, puis en dessin." : "« Montrez-moi 1 millier et 2 centaines » : avec le matériel, puis en dessin."),
        ]),
      seance(`Écrire le nombre : ${ce1 ? "centaines, dizaines, unités" : "milliers, centaines, dizaines, unités"}`,
        `À la fin de cette séance, les élèves sauront écrire en chiffres le nombre d'une collection organisée par rangs — ${p.collection}, c'est ${p.collectionVaut} — même quand un rang est vide.`, 45, [
          ph(T1, "5 min", `Une collection au tableau : ${p.collection}. « Comment écrire avec des chiffres combien il y a d'objets ? »`),
          ph(T2, "20 min", "Écrire le nombre de chaque rang, du plus grand au plus petit, accolés. Puis des collections où un rang manque : on écrit zéro à sa place. La feuille « Lire les cubes, écrire le nombre ».",
            ce1 ? "Fait dire « trois centaines, quatre dizaines, deux unités » avant le nom du nombre : 300402 n'est pas 342." : `Fait dire les rangs avant le nom du nombre ; l'espace sépare les milliers des centaines : ${fr(2342)}.`),
          ph(T3, "15 min", ce1 ? "Bilan : dans 342, le 3 dit les centaines, le 4 les dizaines, le 2 les unités ; 305, c'est 3 centaines, 0 dizaine, 5 unités." : `Bilan : dans ${fr(2342)}, le 2 de gauche dit les milliers ; ${fr(2050)}, c'est 2 milliers, 0 centaine, 5 dizaines, 0 unité.`),
          ph(T4, "5 min", "Par deux : l'un dit un nombre en unités de numération, l'autre montre le matériel et écrit le nombre."),
        ]),
      seance(`Des collections à regrouper : plus de dix ${p.precedente}s`,
        `À la fin de cette séance, les élèves sauront dénombrer une collection où un rang dépasse dix — ${p.autreDecomposition} — en regroupant dix éléments en un du rang suivant, et écrire son nombre.`, 45, [
          ph(T1, "5 min", `Au tableau, ${p.autreDecomposition} : « Écrivez le nombre. » Certains écriront les nombres de chaque rang à la suite : on en discute.`),
          ph(T2, "20 min", `Regrouper, ou échanger, dix éléments d'un rang contre un du rang suivant : ${p.autreDecomposition}, c'est ${p.enUnites}, ${p.exemple}. La feuille « Des collections à regrouper ».`,
            "Le matériel multibase ne se défait pas : on échange."),
          ph(T3, "15 min", `Bilan : quand un rang a dix éléments ou plus, ils font un élément de plus au rang suivant.`),
          ph(T4, "5 min", ce1
            ? "Le jeu du banquier, par deux : on lance deux dés, l'un dit les barres, l'autre les cubes ; on échange dix cubes contre une barre, dix barres contre une plaque ; le premier à 3 plaques a gagné."
            : "Le jeu du banquier, par deux : on lance deux dés, l'un dit les plaques, l'autre les barres ; on échange dix barres contre une plaque, dix plaques contre un gros cube ; le premier à 3 gros cubes a gagné."),
        ]),
      seance("Les unités de numération dans tous les sens",
        `À la fin de cette séance, les élèves sauront écrire en chiffres un nombre donné en unités de numération, dans l'ordre ou non, avec plus de dix éléments d'un rang ou non : ${p.enUnites} ; ${p.enUnitesSeules}.`, 45, [
          ph(T1, "5 min", ce1 ? "« 5 unités 3 centaines 2 dizaines » au tableau : est-ce 532 ou 325 ?" : "« 5 unités 3 milliers 2 centaines » au tableau : quel nombre ?"),
          ph(T2, "20 min", "Des exercices du plus simple au plus difficile : dans l'ordre, dans le désordre, avec plus de dix éléments d'un rang. On dessine, puis on écrit en chiffres. La feuille « Faire un nombre de plusieurs façons ».",
            "D'abord avec le matériel, puis il ne sert plus qu'à valider."),
          ph(T3, "15 min", `Bilan : c'est le nom de l'unité qui compte, pas sa place dans la phrase. Un même nombre se fait de plusieurs façons : ${p.enUnites} ; ${p.autreDecomposition}.`),
          ph(T4, "5 min", `Le problème, à la mesure de la classe : il faut ${p.exemple} cubes, avec ${ce1 ? "des plaques, des barres" : "des gros cubes, des plaques, des barres"} et des cubes seuls ; trouve trois façons.`),
        ]),
      seance("D'une représentation à l'autre",
        `À la fin de cette séance, les élèves sauront passer d'une représentation d'un nombre à une autre : matériel, écriture en chiffres, nom à l'oral, unités de numération, ${p.additive}, écriture en lettres.`, 40, [
          ph(T1, "5 min", `Un même nombre montré de six façons : le matériel ; ${p.exemple} ; « ${p.enLettres} » ; ${p.enUnites} ; ${p.additive} ; ${p.enLettres} écrit en lettres.`),
          ph(T2, "20 min", "Relier des dessins de matériel à des écritures ; lire un nombre écrit en chiffres et l'écrire en lettres. La feuille « D'une représentation à l'autre ».",
            "Différencie par la taille des nombres ; le matériel reste à disposition."),
          ph(T3, "10 min", "Bilan : toutes ces écritures désignent le même nombre. L'affiche de la classe est complétée."),
          ph(T4, "5 min", "Le mémory des écritures, par deux : retrouver les cartes qui désignent le même nombre."),
        ]),
      seance("Évaluation — dénombrer et représenter les nombres",
        "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : écrire le nombre d'une collection organisée par rangs, même à regrouper, et passer d'une écriture à l'autre.", 30, [
          ph("Observation", "20 min", "Une évaluation courte : écrire en chiffres, en unités de numération et en décomposition le nombre de collections dessinées, dont certaines à regrouper.",
            "Observe les procédures : grouper, échanger, compter un à un."),
          ph("Suite", "10 min", `La remédiation au matériel pour qui en a besoin ; en rituel, montrer un nombre avec le matériel et le dire en ${p.rangs}.`),
        ]),
    ],
  };
}

// ── « Comparer », prolongé : jusqu'à mille, jusqu'à dix mille ─────────────

/** La séquence du guide CP — l'écriture chiffrée pour comparer, ranger, encadrer — avec les nombres du CE1 et du CE2. */
function comparerProlonge(p: Palier): Demarche {
  const ce1 = p.classe === "CE1";
  const [a, b] = ce1 ? ["412", "398"] : [fr(4012), fr(3998)];
  const rang = ce1 ? "centaines" : "milliers";
  const [ka, kb] = ce1 ? ["4", "3"] : ["4", "3"];
  const trace = `« ${a} est plus grand que ${b}, car dans ${a} il y a ${ka} ${rang} alors que dans ${b} il n'y en a que ${kb}. »`;
  const encadre = ce1 ? "400 < 412 < 500 ; 410 < 412 < 420" : `${fr(4000)} < ${fr(4012)} < ${fr(5000)} ; ${fr(4010)} < ${fr(4012)} < ${fr(4020)}`;
  return {
    id: `comparer-nombres-${p.id}`,
    nom: `Comparer, ranger, encadrer des nombres ${p.jusqua} grâce à leur écriture chiffrée (${p.classe})`,
    famille: "Mathématiques",
    source: adapteeDu(p.classe, `${SOURCE_GUIDE_CP}, « Une séquence d'apprentissage sur la numération écrite chiffrée » et « Le jeu dans l'apprentissage des mathématiques »`),
    resume: `Deux collections qu'on ne voit pas ensemble : pour savoir laquelle est la plus grande, on écrit leur nombre en chiffres, puis on compare les écritures en partant du rang le plus grand — ${trace} Les signes et les expressions « égal à », « supérieur à », « inférieur à », « compris entre … et … » viennent à ce moment. On compare ensuite sous toutes les écritures, en contexte et par le jeu, pour ordonner, intercaler et encadrer.`,
    seances: [
      seance("Écrire le nombre d'une collection qu'on ne voit pas",
        `À la fin de cette séance, les élèves sauront écrire en chiffres le nombre d'une grande collection organisée par rangs, pour faire connaître une quantité à qui ne la voit pas.`, 45, [
          ph(T1, "5 min", ce1
            ? "La classe en deux groupes : chacun reçoit une collection de plaques, de barres et de cubes que l'autre groupe ne voit pas. « Quel groupe a le plus de cubes ? »"
            : "La classe en deux groupes : chacun reçoit le bon d'une livraison de vis — cartons de mille, boîtes de cent, sachets de dix, vis seules — que l'autre groupe ne voit pas. « Quel groupe a reçu le plus de vis ? »",
            "Pose le problème sans dire comment le résoudre."),
          ph(T2, "20 min", "Chaque élève écrit en chiffres le nombre de sa collection, en regroupant ce qui doit l'être.",
            "Revient sur la valeur de chaque rang avec qui en a besoin ; le matériel reste à disposition."),
          ph(T3, "15 min", `Bilan : les deux écritures au tableau, ${a} et ${b}, sans montrer les collections ensemble.`,
            "Valide les écritures en disant seulement les rangs."),
          ph(T4, "5 min", "D'autres collections, en partie à regrouper : écrire leur nombre en chiffres."),
        ]),
      seance("Comparer grâce à l'écriture chiffrée : les signes et les mots pour le dire",
        `À la fin de cette séance, les élèves sauront comparer deux nombres grâce à leur écriture chiffrée, en partant du rang le plus grand, et l'écrire avec <, > ou =, en disant « supérieur à », « inférieur à », « égal à ».`, 40, [
          ph(T1, "5 min", `Les deux écritures de la séance précédente : « Lequel est le plus grand ? Écrivez-le sur l'ardoise. »`),
          ph(T2, "15 min", "Chacun répond et justifie ; qui le veut vérifie avec le matériel.", "Recense les arguments ; ne tranche pas avant la validation."),
          ph(T3, "15 min", `La validation au matériel, rang contre rang. Les signes, et les expressions « est supérieur à », « est inférieur à », « est égal à ». La trace : ${trace}`,
            "Fait verbaliser, écrit la trace avec les élèves : c'est l'affiche de la classe."),
          ph(T4, "5 min", `Lire des comparaisons écrites avec les signes : « ${b} < ${a} » se lit « ${b} est inférieur à ${a} ».`),
        ]),
      seance("Comparer sous toutes les écritures : la bataille des nombres",
        "À la fin de cette séance, les élèves sauront comparer deux nombres écrits de différentes façons — en chiffres, en unités de numération, en matériel — et placer le signe qui convient, en justifiant par les rangs.", 45, [
          ph(T1, "5 min", ce1 ? "L'affiche relue. Un exemple : « 4c 1d 2u » et « 2u 1d 4c », c'est le même nombre, 412 ; « 3c 15d » et « 450 » aussi." : `L'affiche relue. Un exemple : « 4m 1d 2u » et « ${fr(4012)} » sont le même nombre ; « 3m 15c » et « ${fr(4500)} » aussi.`),
          ph(T2, "20 min", ce1 ? "Placer =, < ou > entre des nombres écrits de façons variées ; des paires qui trompent l'œil : 412 et 421, 300 et 30, 99 et 101." : `Placer =, < ou > entre des nombres écrits de façons variées ; des paires qui trompent l'œil : ${fr(4012)} et ${fr(4102)}, ${fr(3000)} et 300, 999 et ${fr(1001)}.`,
            "Différencie par la taille des nombres ; le matériel reste à disposition pour vérifier."),
          ph(T3, "10 min", "Les erreurs discutées : regarder le chiffre de droite, ou le nombre de chiffres sans les comprendre. On compare d'abord le rang le plus grand."),
          ph(T4, "10 min", "La bataille des nombres, par deux : on pose le signe entre les deux cartes, on lit avec les mots, et l'autre demande « Comment le sais-tu ? ».",
            "Circule, écoute les justifications ; arbitre au matériel."),
        ]),
      seance("Ordonner et intercaler : la file des nombres",
        "À la fin de cette séance, les élèves sauront ranger trois, puis cinq nombres dans l'ordre croissant et dans l'ordre décroissant, et trouver un nombre qui s'intercale entre deux autres.", 40, [
          ph(T1, "5 min", "Trois cartes au tableau, à ranger du plus petit au plus grand en disant pourquoi."),
          ph(T2, "15 min", "Ranger trois, puis cinq nombres, dans l'ordre croissant puis décroissant ; écrire un nombre qui va entre deux autres.",
            "Fait dire le raisonnement : on compare rang par rang, en partant du plus grand."),
          ph(T3, "5 min", "La trace : l'ordre croissant, du plus petit au plus grand, s'écrit avec le signe < ; l'ordre décroissant avec >."),
          ph(T4, "15 min", "La file des nombres, à trois ou quatre : chacun pose sa carte avant, après ou entre deux cartes, en disant les signes."),
        ]),
      seance(`Encadrer : « compris entre … et … »`,
        `À la fin de cette séance, les élèves sauront encadrer un nombre entre deux ${rang} ou deux dizaines entières (${encadre}) et dire qu'il est « compris entre … et … ».`, 40, [
          ph(T1, "5 min", `Un nombre caché : « Il est supérieur à ${ce1 ? "400" : fr(4000)} et inférieur à ${ce1 ? "500" : fr(5000)}. » On l'écrit, et on le dit : il est compris entre ${ce1 ? "400 et 500" : `${fr(4000)} et ${fr(5000)}`}.`),
          ph(T2, "15 min", `Encadrer des nombres entre deux ${rang}, puis entre deux dizaines entières ; trouver tous les nombres compris entre deux nombres proches.`),
          ph(T3, "5 min", `La trace : encadrer un nombre, c'est trouver un nombre plus petit et un nombre plus grand ; entre deux ${rang}, le chiffre des ${rang} suffit.`),
          ph(T4, "15 min", "Le nombre caché, par deux : l'un tire une carte, l'autre propose des nombres et note chaque encadrement, jusqu'à le trouver."),
        ]),
      seance("Résoudre des problèmes de comparaison",
        "À la fin de cette séance, les élèves sauront répondre à une question de comparaison posée dans un contexte — qui en a le plus, y a-t-il assez de places — en comparant les nombres, et l'expliquer.", 40, [
          ph(T1, "5 min", ce1 ? "Un problème lu ensemble : « L'école a 412 livres, la médiathèque du quartier en a 398. Qui en a le plus ? »" : `Un problème lu ensemble : « Une salle de spectacle a ${fr(4012)} places ; ${fr(3998)} billets sont vendus. Reste-t-il des places ? »`),
          ph(T2, "20 min", "D'autres problèmes, dont certains où il faut d'abord écrire le nombre en chiffres.", "Fait écrire la comparaison avec un signe avant la réponse."),
          ph(T3, "10 min", "Mise en commun : la réponse à la question, et la comparaison qui la justifie."),
          ph(T4, "5 min", "La bataille ou la file des nombres en autonomie, avec des nombres plus grands pour qui réussit."),
        ]),
      seance("Évaluation — comparer, ranger, encadrer",
        "À la fin de cette séance, les élèves sauront montrer ce qu'ils ont acquis : comparer deux nombres avec les signes et les mots, ranger cinq nombres, en intercaler et en encadrer, sous différentes écritures.", 30, [
          ph("Observation", "20 min", "Une évaluation courte : placer les signes, ranger cinq nombres, intercaler, encadrer, un problème.",
            "Observe sans aider ; note les procédures : le rang le plus grand d'abord, le nombre de chiffres, le matériel."),
          ph("Suite", "10 min", "La remédiation au matériel pour qui en a besoin ; en rituel, le nombre caché et « supérieur, inférieur »."),
        ]),
    ],
  };
}

/** Les démarches de numération ajoutées au catalogue. */
export const DEMARCHES_NUMERATION: Demarche[] = [
  livretDesNombres(PALIERS["cp-59"]), livretDesNombres(PALIERS["cp-100"]), livretDesNombres(PALIERS.ce1), livretDesNombres(PALIERS.ce2),
  groupementsProlonges(PALIERS.ce1), groupementsProlonges(PALIERS.ce2),
  comparerProlonge(PALIERS.ce1), comparerProlonge(PALIERS.ce2),
];

/** La classe d'une démarche de numération, pour choisir ses feuilles ; rien pour une autre démarche. */
export const CLASSE_DES_DEMARCHES: Record<string, "CP" | "CE1" | "CE2"> = {
  "numeration-dizaine-cp": "CP", "comparer-nombres-cp": "CP",
  "nombres-livret-cp-59": "CP", "nombres-livret-cp-100": "CP", "nombres-livret-ce1": "CE1", "nombres-livret-ce2": "CE2",
  "groupements-ce1": "CE1", "groupements-ce2": "CE2", "comparer-nombres-ce1": "CE1", "comparer-nombres-ce2": "CE2",
};
