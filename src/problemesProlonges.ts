// Les problèmes sans séquence dans les livrets, sur la trame des livrets.
//
// Les livrets d'accompagnement (Éduscol, 2025) détaillent trois séquences de
// résolution de problèmes : les parties-tout au CP et au CE1, les problèmes en
// deux étapes au CE2 (voir demarchesProblemes.ts). Pour les autres compétences
// du programme — deux étapes au CP et au CE1, comparaison, multiplicatifs,
// mixtes, comparaison multiplicative, produits cartésiens —, l'enseignant a
// demandé (2026-10-07) de prolonger les livrets : on suit leur trame — un
// problème de référence enseigné, des séances courtes d'analogies à l'ardoise,
// des entraînements individuels, une évaluation intermédiaire, puis la même
// famille mêlée à d'autres, une évaluation —, et le problème de référence est
// l'exemple que le programme de 2024 donne pour cette compétence, cité tel
// quel. La séquence le dit dans sa source.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { hasard } from "./hasard";
import { choisir, entier } from "./nombres";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererMultiplicatifs, genererPartieTout, nombre,
  type Presentation, type Probleme, type Schema, type Situation, type TypeMultiplicatif,
} from "./problemesBarres";
import { HABILLAGES_CE1, problemesDeComparaison, problemesDuLivret } from "./problemesDesLivrets";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const n = nombre;

const ARDOISE = "Une séance collective et rythmée, sur l'ardoise : le problème de référence est rappelé, son affiche à l'appui, et ce qu'on attend — l'opération et le résultat. Pour chaque problème, l'énoncé est dit ou projeté ; deux ou trois minutes de recherche seul ; la correction s'écrit au tableau sous la dictée d'un élève, et l'analogie se dit : « Résoudre ce problème, c'est comme résoudre le problème de… » ; la phrase réponse se dit à l'oral.";

// ── La trame ──────────────────────────────────────────────────────────────

interface Prolongement {
  id: string;
  classe: "CP" | "CE1" | "CE2";
  nom: string;
  /** La séquence du livret dont on suit la trame. */
  livret: string;
  /** La famille de problèmes, telle qu'on la nomme dans les objectifs : « un problème multiplicatif en une étape ». */
  famille: string;
  /** Ce que la séquence fait apprendre, en une phrase. */
  apprendre: string;
  /** Le problème de référence, cité du programme, et sa résolution enseignée. */
  reference: string;
  resolution: string;
  /** La représentation enseignée : des croix, le schéma en barres, un tableau… */
  representation: string;
  /** Les autres familles auxquelles on mêle ces problèmes, en fin de séquence. */
  meles: string;
}

function trame(p: Prolongement): Demarche {
  const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
  return {
    id: p.id, nom: p.nom, famille: "Mathématiques",
    source: `Trame des séquences de problèmes des livrets d'accompagnement de mathématiques (Éduscol, 2025 — ${p.livret}), prolongée à cette compétence, qui n'y a pas de séquence ; le problème de référence est l'exemple du programme de mathématiques du cycle 2 (2024).`,
    resume: `${p.apprendre} La trame des séquences de problèmes des livrets : un problème de référence — celui du programme —, des séances courtes d'analogies, des entraînements, une évaluation intermédiaire ; puis ces problèmes mêlés à d'autres, et l'évaluation. Neuf séances.`,
    seances: [
      seance("Le problème de référence", sauront(`résoudre ${p.famille}, en le représentant par ${p.representation}, et en écrivant les calculs et la phrase réponse.`), 45, [
        ph(T1, "15 min", `La séquence est annoncée. Le problème de référence, celui du programme : « ${p.reference} » Lu, raconté par un élève, la question dite par un autre ; trois minutes de recherche seul, sur l'ardoise. Puis l'enseignement de la procédure : ${p.resolution}`,
          "Valorise les procédures justes mais longues, et dis pourquoi on en apprend une plus sûre."),
        ph(T2, "20 min", "Dans le cahier d'entraînement, chacun à son rythme, des problèmes qui ressemblent beaucoup au problème de référence ; tous font au moins les deux premiers.",
          "Regroupe ceux qui ne se lancent pas : du matériel pour jouer l'histoire, puis la représenter ; une phrase réponse à compléter pour qui peine à l'écrire."),
        ph(T3, "10 min", "Un élève corrige un problème au tableau ; on dit ce qu'on a appris ; la trace écrite de référence va dans le cahier de leçons et sur une affiche."),
      ]),
      seance("Entraînement court (1)", sauront(`reconnaître, sous le même habillage, un problème de la même famille que le problème de référence.`), 15, [
        ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : la même famille, le même habillage.`)]),
      seance("Entraînement court (2)", sauront("reconnaître la même famille sous des habillages différents."), 15, [
        ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : la même famille, des habillages variés.`)]),
      seance("Entraînement individuel (1)", sauront(`résoudre seuls ${p.famille}.`), 30, [
        ph("Problèmes dans le cahier", "30 min", "Une liste de problèmes de la même famille, seul, dans le cahier d'entraînement ; habillages variés.",
          "Différencie par le nombre de problèmes et l'accompagnement.")]),
      seance("Évaluation intermédiaire et remédiation", sauront("dire s'ils résolvent seuls ces problèmes, ou s'ils ont besoin de s'entraîner encore."), 20, [
        ph("Problèmes, seul", "10 min", "Deux ou trois problèmes semblables à ceux des premières séances, le cahier de leçons fermé."),
        ph("Remédiation", "10 min", "Un relevé : comprendre, modéliser, calculer, répondre ; pour qui en a besoin, une reprise en petit groupe ou en APC, avec du matériel."),
      ]),
      seance("Une famille parmi d'autres (1)", sauront(`reconnaître ${p.famille} parmi d'autres problèmes, et décider du calcul.`), 15, [
        ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : ces problèmes mêlés à ${p.meles}.`)]),
      seance("Une famille parmi d'autres (2)", sauront("dire, avant de calculer, ce qu'on cherche et ce qu'on va calculer d'abord."), 15, [
        ph("Trois problèmes à l'ardoise", "15 min", `${ARDOISE} Ici : de nouveau ces problèmes, mêlés à ${p.meles}.`)]),
      seance("Entraînement individuel (2)", sauront("résoudre seuls ces problèmes parmi d'autres."), 30, [
        ph("Problèmes dans le cahier", "30 min", `Une liste de problèmes mêlés — ceux de la séquence et ${p.meles} —, seul, dans le cahier d'entraînement.`,
          "Différencie par le nombre de problèmes et l'accompagnement.")]),
      seance("Évaluation", sauront(`résoudre seuls ${p.famille}, parmi d'autres problèmes.`), 20, [
        ph("Problèmes, seul", "15 min", "Des problèmes semblables à ceux de toute la séquence."),
        ph(T4, "5 min", "Ensuite, tout au long de l'année, au moins dix problèmes par semaine, comme le demande le programme — certains brefs, dits à l'oral, la réponse sur l'ardoise."),
      ]),
    ],
  };
}

const LIVRET_CP = "CP, séquence n° 3 « Résoudre des problèmes additifs du type parties-tout »";
const LIVRET_CE1 = "CE1, séquence n° 4 « Résoudre des problèmes additifs du type parties-tout »";
const LIVRET_CE2 = "CE2, séquence n° 3 « Résoudre des problèmes additifs en deux étapes au CE2 »";

const PROLONGEMENTS: Prolongement[] = [
  {
    id: "deux-etapes-cp", classe: "CP", nom: "Problèmes additifs en deux étapes, jusqu'à 30 (CP)", livret: LIVRET_CP,
    famille: "un problème additif en deux étapes",
    apprendre: "Résoudre un problème qui demande deux calculs — deux transformations à la suite, ou un tout fait de trois parties —, avec des nombres jusqu'à 30.",
    reference: "Il y avait 29 enfants dans un bus. Au premier arrêt, 12 enfants sont descendus. Au deuxième arrêt, 7 enfants sont montés. Combien y a-t-il d'enfants dans le bus maintenant ?",
    resolution: "on joue l'histoire avec des cubes, arrêt par arrêt ; d'abord le premier arrêt : 29 – 12 = 17 ; puis le deuxième : 17 + 7 = 24 ; un calcul par ligne, et la phrase réponse.",
    representation: "des cubes ou un dessin, étape par étape", meles: "des problèmes en une étape",
  },
  {
    id: "multiplicatifs-cp", classe: "CP", nom: "Problèmes multiplicatifs, jusqu'à 30 (CP)", livret: LIVRET_CP,
    famille: "un problème de parts égales",
    apprendre: "Chercher le tout fait de plusieurs parts égales, le nombre de parts ou la valeur d'une part, avec des nombres jusqu'à 30, en représentant les objets par des croix ou des ronds, et par des additions itérées.",
    reference: "Paul apporte 3 paquets de biscuits. Il y a 7 biscuits dans chaque paquet. Combien y a-t-il de biscuits en tout ?",
    resolution: "les biscuits de chaque paquet représentés par des croix — trois lignes de sept — et dénombrés, de un en un ou en groupant par dix ; ou 7 + 7 + 7 = 21. Puis un partage : 24 élèves en équipes de 4 — vingt-quatre croix, des groupes de quatre entourés, et l'on compte les groupes.",
    representation: "des croix ou des ronds, des groupes entourés", meles: "des problèmes additifs",
  },
  {
    id: "comparaison-ce1", classe: "CE1", nom: "Problèmes de comparaison en une étape (CE1)", livret: LIVRET_CE1,
    famille: "un problème de comparaison",
    apprendre: "Chercher la plus grande ou la plus petite de deux valeurs comparées — « de plus », « de moins » —, ou l'écart entre elles, avec un schéma à deux barres.",
    reference: "Léo a 188 billes. Lucie en a 75 de plus que Léo. Combien Lucie a-t-elle de billes ?",
    resolution: "deux barres, une par enfant — celle de Lucie plus longue, puisqu'elle en a plus — ; l'écart, 75, au bout de la barre de Léo ; Lucie a autant que Léo, et 75 de plus : 188 + 75 = 263 ; la phrase réponse. Attention aux énoncés trompeurs : « de plus » ne veut pas toujours dire une addition.",
    representation: "un schéma à deux barres et l'écart", meles: "des problèmes parties-tout",
  },
  {
    id: "deux-etapes-ce1", classe: "CE1", nom: "Problèmes additifs en deux étapes (CE1)", livret: LIVRET_CE1,
    famille: "un problème additif en deux étapes",
    apprendre: "Résoudre un problème qui demande deux calculs, en faisant un schéma pour chaque étape.",
    reference: "Dans la bibliothèque de classe, il y a 83 livres. Le professeur en apporte 18 de plus. Les élèves en empruntent 27. Combien y a-t-il de livres dans la bibliothèque de classe ?",
    resolution: "un schéma pour chaque étape : d'abord le tout après l'apport, 83 + 18 = 101 ; puis ce qui reste après les emprunts, 101 – 27 = 74 ; un calcul par ligne, chacun remis en contexte, et la phrase réponse.",
    representation: "un schéma en barres pour chaque étape", meles: "des problèmes en une étape",
  },
  {
    id: "multiplicatifs-ce1", classe: "CE1", nom: "Problèmes multiplicatifs en une étape (CE1)", livret: LIVRET_CE1,
    famille: "un problème de parts égales",
    apprendre: "Chercher le tout fait de parts égales, le nombre de parts ou la valeur d'une part, en s'appuyant, selon la période et les nombres, sur le matériel, des croix, un schéma en barres ou le calcul mental.",
    reference: "Paul apporte huit paquets de biscuits. Il y a sept biscuits dans chaque paquet. Combien y a-t-il de biscuits en tout ?",
    resolution: "un schéma en barres : huit cases de 7, le tout cherché au-dessus ; 8 fois 7, 56 — par la table, ou en ajoutant. Puis un partage : 60 élèves en équipes de 5 — le même schéma, le nombre de cases cherché.",
    representation: "des croix ou un schéma en barres", meles: "des problèmes additifs",
  },
  {
    id: "mixtes-ce1", classe: "CE1", nom: "Problèmes mixtes en deux étapes (CE1)", livret: LIVRET_CE1,
    famille: "un problème mixte en deux étapes",
    apprendre: "Résoudre un problème qui demande une étape multiplicative et une étape additive.",
    reference: "Abi achète sept litres d'huile à deux euros le litre. Elle donne vingt euros au vendeur. Combien le vendeur va-t-il lui rendre ?",
    resolution: "d'abord le prix de l'huile : 7 fois 2 €, 14 € ; puis la monnaie rendue : 20 – 14 = 6 € ; un schéma pour chaque étape, un calcul par ligne, et la phrase réponse.",
    representation: "un schéma en barres pour chaque étape", meles: "des problèmes en une étape, additifs ou multiplicatifs",
  },
  {
    id: "parties-tout-comparaison-ce2", classe: "CE2", nom: "Problèmes en une étape : parties-tout et comparaison (CE2)", livret: LIVRET_CE1,
    famille: "un problème additif en une étape, parties-tout ou comparaison",
    apprendre: "Résoudre, en les distinguant, des problèmes parties-tout et des problèmes de comparaison, avec des nombres plus grands que 1 000, en s'appuyant si nécessaire sur un schéma en barres.",
    reference: "Dans l'école, il y a 111 garçons et 257 filles. Combien de filles y a-t-il de plus que de garçons ?",
    resolution: "deux barres, les garçons et les filles ; l'écart est cherché : 257 – 111 = 146. Puis un problème parties-tout — une barre partagée en deux — : on compare les deux schémas.",
    representation: "un schéma en barres", meles: "des problèmes en deux étapes",
  },
  {
    id: "multiplicatifs-ce2", classe: "CE2", nom: "Problèmes multiplicatifs en une étape (CE2)", livret: LIVRET_CE2,
    famille: "un problème de parts égales",
    apprendre: "Chercher le tout, le nombre de parts ou la valeur d'une part, avec un schéma en barres si cela aide et les tables de multiplication ; le tout avec de plus grands nombres, les partages avec un champ réduit.",
    reference: "La maitresse de CE2 a acheté six dictionnaires pour la classe. Elle a payé 72 €. Quel est le prix d'un dictionnaire ?",
    resolution: "un schéma en barres : 72 € en tout, six cases égales, le prix d'une case cherché ; 6 fois combien font 72 ? La table de 6 : 12 € ; 72 ÷ 6 = 12 ; la phrase réponse.",
    representation: "un schéma en barres", meles: "des problèmes additifs",
  },
  {
    id: "mixtes-ce2", classe: "CE2", nom: "Problèmes mixtes en deux ou trois étapes (CE2)", livret: LIVRET_CE2,
    famille: "un problème mixte en deux ou trois étapes",
    apprendre: "Résoudre des problèmes qui demandent des additions, des soustractions et des multiplications, en deux ou trois étapes, avec des nombres inférieurs à 100.",
    reference: "Dans un restaurant, il y a 4 tables de 6 personnes et 7 tables de 4 personnes. Combien ce restaurant peut-il recevoir de clients ?",
    resolution: "trois étapes : les grandes tables, 4 × 6 = 24 ; les petites, 7 × 4 = 28 ; en tout, 24 + 28 = 52 ; un schéma par étape, chaque calcul remis en contexte.",
    representation: "un schéma pour chaque étape", meles: "des problèmes en une étape",
  },
  {
    id: "comparaison-multiplicative-ce2", classe: "CE2", nom: "Problèmes de comparaison multiplicative (CE2)", livret: LIVRET_CE2,
    famille: "un problème de comparaison multiplicative",
    apprendre: "Comprendre « fois plus » et « fois moins », et les distinguer de « de plus » et « de moins ».",
    reference: "Une trottinette coute quatre fois plus cher qu'un casque. Le casque coute 32 €. Combien coute la trottinette ?",
    resolution: "« quatre fois plus » n'est pas « 4 de plus » : deux barres, celle du casque, et celle de la trottinette faite de quatre fois la barre du casque ; 32 × 4 = 128 € ; la phrase réponse.",
    representation: "deux barres, l'une faite de plusieurs fois l'autre", meles: "des problèmes de comparaison additive — « de plus », « de moins »",
  },
  {
    id: "produits-cartesiens-ce2", classe: "CE2", nom: "Problèmes de produits cartésiens (CE2)", livret: LIVRET_CE2,
    famille: "un problème de produit cartésien",
    apprendre: "Dénombrer toutes les façons d'associer un élément de chaque ensemble, avec un tableau à double entrée, puis un arbre quand il y a plus de deux ensembles.",
    reference: "Une poupée est livrée avec trois pantalons et sept teeshirts. De combien de façons est-il possible d'habiller la poupée ?",
    resolution: "un tableau : les pantalons en lignes, les teeshirts en colonnes, une tenue par case ; on compte les cases — 21 —, ou 3 × 7. Puis, avec trois ensembles — le clown, ses deux chapeaux, trois teeshirts et deux pantalons —, un arbre : douze costumes.",
    representation: "un tableau à double entrée ou un arbre", meles: "des problèmes de parts égales",
  },
];

export const DEMARCHES_PROBLEMES_PROLONGES: Demarche[] = PROLONGEMENTS.map(trame);

/**
 * La séquence prolongée pour une compétence de résolution de problèmes, à sa classe ; rien sinon. En minuscules
 * sans accents, comme les compare la suggestion des démarches.
 */
export function demarcheProlongeeDeProblemes(classe: string, comp: string): string | null {
  if (!/resoudre des problemes/.test(comp)) return null;
  if (classe === "cp") {
    if (/additifs en deux etapes/.test(comp)) return "deux-etapes-cp";
    if (/multiplicatifs en une etape/.test(comp)) return "multiplicatifs-cp";
  }
  if (classe === "ce1") {
    if (/de comparaison en une etape/.test(comp)) return "comparaison-ce1";
    if (/additifs en deux etapes/.test(comp)) return "deux-etapes-ce1";
    if (/multiplicatifs en une etape/.test(comp)) return "multiplicatifs-ce1";
    if (/mixtes/.test(comp)) return "mixtes-ce1";
  }
  if (classe === "ce2") {
    if (/parties-tout et comparaison/.test(comp)) return "parties-tout-comparaison-ce2";
    if (/multiplicatifs en une etape/.test(comp)) return "multiplicatifs-ce2";
    if (/mixtes/.test(comp)) return "mixtes-ce2";
    if (/comparaison multiplicative/.test(comp)) return "comparaison-multiplicative-ce2";
    if (/produits cartesiens/.test(comp)) return "produits-cartesiens-ce2";
  }
  return null;
}

// ── Les générateurs qui manquaient ────────────────────────────────────────

const situation = (): Situation => ({ forme: "parties", contexte: 0, categories: [0, 1], qui: "" });
const parties = (tout: number, a: number, b: number, inconnue: "tout" | "b"): Schema => ({
  forme: "parties", tout: { valeur: tout, connue: inconnue !== "tout" }, parties: [{ valeur: a, connue: true }, { valeur: b, connue: inconnue !== "b" }],
});
const partsEgales = (nombreDeParts: number, part: number, cherche: "tout" | "part" | "nombre"): Schema => ({
  forme: "parts-egales", tout: { valeur: nombreDeParts * part, connue: cherche !== "tout" }, part: { valeur: part, connue: cherche !== "part" },
  nombre: { valeur: nombreDeParts, connue: cherche !== "nombre" },
});
const probleme = (schema: Schema, enonce: string, calcul: string, reponse: number, phrase: string): Probleme =>
  ({ schema, situation: schema.forme === "parties" ? situation() : { forme: "parts-egales", contexte: 0, qui: "" }, enonce, calcul, reponse, phrase });

/** Le tirage d'une liste de problèmes, sans doublon d'énoncé. */
function tirer(combien: number, graine: number, un: (alea: () => number, rang: number) => Probleme | null): Probleme[] {
  const alea = hasard(graine);
  const sortie: Probleme[] = [];
  const vus = new Set<string>();
  for (let essai = 0; sortie.length < combien && essai < 300; essai++) {
    const p = un(alea, sortie.length);
    if (!p || vus.has(p.enonce)) continue;
    vus.add(p.enonce);
    sortie.push(p);
  }
  return sortie;
}

/** « que Tom », « qu'Inès ». */
export const que = (nom: string) => (/^[AEIOUÉÈ]/.test(nom) ? `qu'${nom}` : `que ${nom}`);

const PRENOMS: [string, "il" | "elle"][] = [["Léa", "elle"], ["Tom", "il"], ["Inès", "elle"], ["Noah", "il"], ["Jade", "elle"], ["Adam", "il"], ["Lina", "elle"], ["Sacha", "il"]];

/** Deux transformations à la suite : des montées et des descentes, des apports et des emprunts, des gains et des pertes. */
export function problemesDeuxTransformations(max: number, combien: number, graine: number): Probleme[] {
  return tirer(combien, graine, (alea) => {
    const depart = entier(alea, Math.ceil(max / 3), max - 3);
    const plus1 = alea() < 0.5, plus2 = alea() < 0.5;
    const t1 = entier(alea, 2, Math.max(2, Math.floor(max / 3))), t2 = entier(alea, 2, Math.max(2, Math.floor(max / 3)));
    const milieu = plus1 ? depart + t1 : depart - t1;
    const fin = plus2 ? milieu + t2 : milieu - t2;
    if (milieu < 1 || fin < 1 || milieu > max || fin > max) return null;
    // Des habillages à la mesure des nombres : un bus, des billes jusqu'à 60 ; une salle de spectacle, une collection au-delà.
    const grands = max > 60;
    const contexte = choisir(alea, grands ? ["spectacle", "bibliotheque", "images"] as const : ["bus", "bibliotheque", "billes"] as const);
    const [qui, pronom] = choisir(alea, PRENOMS);
    const lieu = grands ? "de l'école" : "de la classe";
    const verbe = (plus: boolean, t: number) => contexte === "bus" ? `${n(t)} personnes ${plus ? "sont montées" : "sont descendues"}`
      : contexte === "spectacle" ? `${n(t)} spectateurs ${plus ? "sont entrés" : "sont sortis"}`
        : contexte === "bibliotheque" ? (plus ? `le professeur en apporte ${n(t)}` : `les élèves en empruntent ${n(t)}`)
          : plus ? `${pronom} en gagne ${n(t)}` : `${pronom} en perd ${n(t)}`;
    const objets = contexte === "images" ? "images" : "billes";
    const enonce = contexte === "bus"
      ? `Il y avait ${n(depart)} personnes dans un bus. Au premier arrêt, ${verbe(plus1, t1)}. Au deuxième arrêt, ${verbe(plus2, t2)}. Combien y a-t-il de personnes dans le bus maintenant ?`
      : contexte === "spectacle"
        ? `Dans la salle de spectacle, il y avait ${n(depart)} spectateurs. Avant le début, ${verbe(plus1, t1)}. À l'entracte, ${verbe(plus2, t2)}. Combien y a-t-il de spectateurs dans la salle maintenant ?`
        : contexte === "bibliotheque"
          ? `Dans la bibliothèque ${lieu}, il y a ${n(depart)} livres. Le lundi, ${verbe(plus1, t1)}. Le mardi, ${verbe(plus2, t2)}. Combien y a-t-il de livres dans la bibliothèque maintenant ?`
          : `${qui} a ${n(depart)} ${objets}. ${contexte === "images" ? "La première semaine" : "À la première récréation"}, ${verbe(plus1, t1)}. ${contexte === "images" ? "La deuxième" : "À la deuxième"}, ${verbe(plus2, t2)}. Combien ${objets === "images" ? "d'images" : "de billes"} a ${qui} maintenant ?`;
    const phrase = contexte === "bus" ? `Il y a ${n(fin)} personnes dans le bus.` : contexte === "spectacle" ? `Il y a ${n(fin)} spectateurs dans la salle.`
      : contexte === "bibliotheque" ? `Il y a ${n(fin)} livres dans la bibliothèque.` : `${qui} a ${n(fin)} ${objets}.`;
    const calcul = `${n(depart)} ${plus1 ? "+" : "−"} ${n(t1)} = ${n(milieu)} ; ${n(milieu)} ${plus2 ? "+" : "−"} ${n(t2)} = ${n(fin)}`;
    const schema = plus2 ? parties(fin, milieu, t2, "tout") : parties(milieu, t2, fin, "b");
    return probleme(schema, enonce, calcul, fin, phrase);
  });
}

/** Des achats et la monnaie rendue : « Il donne un billet de 50 €. Combien le vendeur va-t-il lui rendre ? » */
export function problemesMonnaieRendue(combien: number, graine: number): Probleme[] {
  return tirer(combien, graine, (alea) => {
    const [qui] = choisir(alea, PRENOMS);
    const [a, b] = [entier(alea, 3, 30), entier(alea, 3, 30)];
    const billet = choisir(alea, [20, 50, 100].filter((x) => x > a + b));
    if (!billet) return null;
    const [objetA, objetB] = choisir(alea, [["un livre", "un jeu"], ["une tarte", "un gâteau"], ["un ballon", "une corde à sauter"], ["un cahier", "une trousse"]]);
    const total = a + b, rendu = billet - total;
    return probleme(parties(billet, total, rendu, "b"),
      `${qui} achète ${objetA} à ${n(a)} € et ${objetB} à ${n(b)} €. ${qui} donne un billet de ${n(billet)} €. Combien le vendeur va-t-il lui rendre ?`,
      `${n(a)} + ${n(b)} = ${n(total)} ; ${n(billet)} − ${n(total)} = ${n(rendu)}`, rendu, `Le vendeur va lui rendre ${n(rendu)} €.`);
  });
}

/** Deux comparaisons à la suite : « Noé a 6 € de plus qu'Elsa. Martin a 2 € de moins que Noé. » */
export function problemesComparaisonsEnChaine(combien: number, graine: number): Probleme[] {
  const TRIOS: [string, string, string][] = [["Elsa", "Noé", "Martin"], ["Inès", "Tom", "Jade"], ["Lina", "Adam", "Emma"]];
  return tirer(combien, graine, (alea) => {
    const [a, b, c] = choisir(alea, TRIOS);
    const x = entier(alea, 20, 400), e1 = 10 * entier(alea, 1, 9), e2 = entier(alea, 2, 30);
    const plus1 = alea() < 0.6, plus2 = alea() < 0.5;
    const y = plus1 ? x + e1 : x - e1, z = plus2 ? y + e2 : y - e2;
    if (y < 5 || z < 5) return null;
    return probleme(plus2 ? parties(z, y, e2, "tout") : parties(y, e2, z, "b"),
      `${a} a ${n(x)} € dans sa tirelire. ${b} a ${n(e1)} € ${plus1 ? "de plus" : "de moins"} ${que(a)}. ${c} a ${n(e2)} € ${plus2 ? "de plus" : "de moins"} ${que(b)}. Quelle somme d'argent a ${c} ?`,
      `${n(x)} ${plus1 ? "+" : "−"} ${n(e1)} = ${n(y)} ; ${n(y)} ${plus2 ? "+" : "−"} ${n(e2)} = ${n(z)}`, z, `${c} a ${n(z)} € dans sa tirelire.`);
  });
}

/** Des problèmes mixtes : une étape multiplicative, puis une ou deux étapes additives. */
export function problemesMixtes(combien: number, graine: number, etapes: 2 | 3): Probleme[] {
  return tirer(combien, graine, (alea, rang) => {
    const [qui, pronom] = choisir(alea, PRENOMS);
    const sorte = (etapes === 3 && rang % 2 === 1) ? 3 : entier(alea, 0, 2);
    if (sorte === 0) {
      // Acheter plusieurs fois la même chose, et la monnaie.
      const p = entier(alea, 2, 9), prix = entier(alea, 2, 9), total = p * prix;
      const billet = [10, 20, 50, 100].find((x) => x > total);
      if (!billet) return null;
      return probleme(parties(billet, total, billet - total, "b"),
        `${qui} achète ${n(p)} cahiers à ${n(prix)} € l'un. ${qui} donne ${n(billet)} € au vendeur. Combien le vendeur va-t-il lui rendre ?`,
        `${n(p)} × ${n(prix)} = ${n(total)} ; ${n(billet)} − ${n(total)} = ${n(billet - total)}`, billet - total, `Le vendeur va lui rendre ${n(billet - total)} €.`);
    }
    if (sorte === 1) {
      // Des paquets en plus de ce qu'on a.
      const p = entier(alea, 2, 9), q = choisir(alea, [5, 6, 8, 10]), deja = entier(alea, 3, 30), total = p * q + deja;
      return probleme(parties(total, deja, p * q, "tout"),
        `${qui} a ${n(deja)} cartes. ${pronom === "il" ? "Il" : "Elle"} achète ${n(p)} paquets de ${n(q)} cartes. Combien de cartes a ${qui} maintenant ?`,
        `${n(p)} × ${n(q)} = ${n(p * q)} ; ${n(deja)} + ${n(p * q)} = ${n(total)}`, total, `${qui} a ${n(total)} cartes.`);
    }
    if (sorte === 2) {
      // Des boîtes, et ce qu'on distribue.
      const p = entier(alea, 2, 9), q = choisir(alea, [6, 8, 10, 12]), donnes = entier(alea, 3, p * q - 2), reste = p * q - donnes;
      return probleme(parties(p * q, donnes, reste, "b"),
        `La maîtresse a ${n(p)} boîtes de ${n(q)} crayons. Elle en distribue ${n(donnes)} aux élèves. Combien de crayons lui reste-t-il ?`,
        `${n(p)} × ${n(q)} = ${n(p * q)} ; ${n(p * q)} − ${n(donnes)} = ${n(reste)}`, reste, `Il lui reste ${n(reste)} crayons.`);
    }
    // Trois étapes : deux produits, puis la somme — le restaurant du programme.
    const [a, b] = [entier(alea, 2, 9), choisir(alea, [4, 6, 8])];
    const [c, d] = [entier(alea, 2, 9), choisir(alea, [2, 4, 5])];
    if (b === d) return null;
    const total = a * b + c * d;
    return probleme(parties(total, a * b, c * d, "tout"),
      `Pour la fête de l'école, on installe ${n(a)} tables de ${n(b)} personnes et ${n(c)} tables de ${n(d)} personnes. Combien de personnes peuvent s'asseoir ?`,
      `${n(a)} × ${n(b)} = ${n(a * b)} ; ${n(c)} × ${n(d)} = ${n(c * d)} ; ${n(a * b)} + ${n(c * d)} = ${n(total)}`, total, `${n(total)} personnes peuvent s'asseoir.`);
  });
}

/** Des produits cartésiens : un élément de chaque ensemble ; deux ensembles, parfois trois. */
export function problemesCartesiens(combien: number, graine: number): Probleme[] {
  const DEUX: [string, string, string, string, (r: number) => string][] = [
    ["Au glacier, on choisit un cornet parmi", "sortes de cornets", "et un parfum parmi", "parfums. Combien de glaces différentes peut-on composer ?", (r) => `On peut composer ${n(r)} glaces différentes.`],
    ["Pour habiller sa poupée, Léa a", "pantalons", "et", "teeshirts. De combien de façons peut-elle l'habiller ?", (r) => `Elle peut l'habiller de ${n(r)} façons.`],
    ["À la cantine, on choisit une entrée parmi", "entrées", "et un dessert parmi", "desserts. Combien de menus différents peut-on composer ?", (r) => `On peut composer ${n(r)} menus différents.`],
    ["Pour un sandwich, on choisit un pain parmi", "sortes de pains", "et une garniture parmi", "garnitures. Combien de sandwichs différents peut-on faire ?", (r) => `On peut faire ${n(r)} sandwichs différents.`],
  ];
  return tirer(combien, graine, (alea, rang) => {
    if (rang % 4 === 3) {
      const [a, b, c] = [2, entier(alea, 2, 3), 2];
      return probleme(partsEgales(a * b, c, "tout"),
        `Pour se déguiser, un clown a ${n(a)} chapeaux, ${n(b)} teeshirts et ${n(c)} pantalons. Combien de costumes différents, avec un chapeau, un teeshirt et un pantalon, peut-il faire ?`,
        `${n(a)} × ${n(b)} × ${n(c)} = ${n(a * b * c)}`, a * b * c, `Il peut faire ${n(a * b * c)} costumes différents.`);
    }
    const [debut, premiers, milieu, fin, phrase] = choisir(alea, DEUX);
    const a = entier(alea, 2, 5), b = entier(alea, 3, 7);
    return probleme(partsEgales(a, b, "tout"), `${debut} ${n(a)} ${premiers} ${milieu} ${n(b)} ${fin}`, `${n(a)} × ${n(b)} = ${n(a * b)}`, a * b, phrase(a * b));
  });
}

/** Les problèmes multiplicatifs de l'atelier, le calcul écrit comme la classe l'écrit : additions itérées au CP, produit au CE1. */
export function problemesMultiplicatifs(classe: "CP" | "CE1" | "CE2", types: TypeMultiplicatif[], combien: number, graine: number, plages: { parts: [number, number]; valeurs: [number, number] }): Probleme[] {
  return genererMultiplicatifs({ nombre: combien, types, table: 10, ...plages, enonces: true, prenoms: [] }, graine).map((p) => {
    if (classe === "CE2" || p.schema.forme !== "parts-egales") return p;
    const s = p.schema;
    const calcul = classe === "CP"
      ? `${Array.from({ length: s.nombre.valeur }, () => n(s.part.valeur)).join(" + ")} = ${n(s.tout.valeur)}`
      : `${n(s.nombre.valeur)} × ${n(s.part.valeur)} = ${n(s.tout.valeur)}`;
    return { ...p, calcul };
  });
}

// ── Les feuilles des séquences prolongées ────────────────────────────────

/** Le problème de référence de chaque séquence, avec son schéma et son corrigé. */
const REFERENCES: Record<string, Probleme> = {
  "deux-etapes-cp": probleme(parties(24, 17, 7, "tout"), PROLONGEMENTS[0].reference, "29 − 12 = 17 ; 17 + 7 = 24", 24, "Il y a 24 enfants dans le bus maintenant."),
  "multiplicatifs-cp": probleme(partsEgales(3, 7, "tout"), PROLONGEMENTS[1].reference, "7 + 7 + 7 = 21", 21, "Il y a 21 biscuits en tout."),
  "comparaison-ce1": probleme(parties(263, 188, 75, "tout"), PROLONGEMENTS[2].reference, "188 + 75 = 263", 263, "Lucie a 263 billes."),
  "deux-etapes-ce1": probleme(parties(101, 27, 74, "b"), PROLONGEMENTS[3].reference, "83 + 18 = 101 ; 101 − 27 = 74", 74, "Il y a 74 livres dans la bibliothèque de classe."),
  "multiplicatifs-ce1": probleme(partsEgales(8, 7, "tout"), PROLONGEMENTS[4].reference, "8 × 7 = 56", 56, "Il y a 56 biscuits en tout."),
  "mixtes-ce1": probleme(parties(20, 14, 6, "b"), PROLONGEMENTS[5].reference, "7 × 2 = 14 ; 20 − 14 = 6", 6, "Le vendeur va lui rendre 6 €."),
  "parties-tout-comparaison-ce2": probleme(parties(257, 111, 146, "b"), PROLONGEMENTS[6].reference, "257 − 111 = 146", 146, "Il y a 146 filles de plus que de garçons."),
  "multiplicatifs-ce2": probleme(partsEgales(6, 12, "part"), PROLONGEMENTS[7].reference, "72 ÷ 6 = 12", 12, "Un dictionnaire coute 12 €."),
  "mixtes-ce2": probleme(parties(52, 24, 28, "tout"), PROLONGEMENTS[8].reference, "4 × 6 = 24 ; 7 × 4 = 28 ; 24 + 28 = 52", 52, "Le restaurant peut recevoir 52 clients."),
  "comparaison-multiplicative-ce2": {
    schema: { forme: "comparaison", petit: { valeur: 32, connue: true }, grand: { valeur: 128, connue: false }, fois: 4, noms: ["le casque", "la trottinette"] },
    situation: { forme: "comparaison", objets: 0, noms: ["le casque", "la trottinette"] },
    enonce: PROLONGEMENTS[9].reference, calcul: "32 × 4 = 128", reponse: 128, phrase: "La trottinette coute 128 €.",
  },
  "produits-cartesiens-ce2": probleme(partsEgales(3, 7, "tout"), PROLONGEMENTS[10].reference, "3 × 7 = 21", 21, "On peut habiller la poupée de 21 façons."),
};

type Tirage = (graine: number, combien: number) => Probleme[];

/** Ce que chaque séquence fait tirer : sa famille, et ce qu'on y mêle à la fin. */
const FAMILLES: Record<string, { famille: Tirage; autres: Tirage }> = {
  "deux-etapes-cp": {
    famille: (g, k) => [...problemesDeuxTransformations(30, k - Math.floor(k / 3), g),
      ...genererPartieTout({ nombre: Math.floor(k / 3), parties: 3, inconnue: "partie", max: 30, min: 15, enonces: true, prenoms: [] }, g + 1)],
    autres: (g, k) => genererPartieTout({ nombre: k, parties: 2, inconnue: "melange", max: 30, min: 10, enonces: true, prenoms: [] }, g),
  },
  "multiplicatifs-cp": {
    famille: (g, k) => problemesMultiplicatifs("CP", ["tout", "nombre", "tout"], k, g, { parts: [2, 5], valeurs: [2, 6] }),
    autres: (g, k) => genererPartieTout({ nombre: k, parties: 2, inconnue: "melange", max: 30, min: 10, enonces: true, prenoms: [] }, g),
  },
  "comparaison-ce1": {
    famille: (g, k) => problemesDeComparaison(["billes", "pommes", "longueurs", "billes"], k, g, () => 1, 900),
    autres: (g, k) => problemesDuLivret(HABILLAGES_CE1, ["brigands", "oiseaux", "legumes"], ["partie", "tout", "reste"], k, { min: 120, max: 980 }, g),
  },
  "deux-etapes-ce1": {
    famille: (g, k) => [...problemesDeuxTransformations(999, Math.ceil(k / 3), g), ...problemesMonnaieRendue(Math.ceil(k / 3), g + 1),
      ...problemesComparaisonsEnChaine(k - 2 * Math.ceil(k / 3), g + 2)].slice(0, k),
    autres: (g, k) => problemesDuLivret(HABILLAGES_CE1, ["brigands", "oiseaux", "legumes"], ["partie", "tout", "ajoute"], k, { min: 120, max: 980 }, g),
  },
  "multiplicatifs-ce1": {
    famille: (g, k) => problemesMultiplicatifs("CE1", ["tout", "nombre", "tout", "part"], k, g, { parts: [2, 10], valeurs: [2, 10] }),
    autres: (g, k) => problemesDuLivret(HABILLAGES_CE1, ["brigands", "oiseaux"], ["partie", "tout"], k, { min: 120, max: 980 }, g),
  },
  "mixtes-ce1": {
    famille: (g, k) => problemesMixtes(k, g, 2),
    autres: (g, k) => [...problemesMultiplicatifs("CE1", ["tout"], Math.ceil(k / 2), g, { parts: [2, 10], valeurs: [2, 10] }),
      ...problemesDuLivret(HABILLAGES_CE1, ["brigands"], ["partie"], Math.floor(k / 2), { min: 120, max: 980 }, g + 1)],
  },
  "parties-tout-comparaison-ce2": {
    famille: (g, k) => [...genererPartieTout({ nombre: Math.ceil(k / 2), parties: 2, inconnue: "melange", max: 9999, min: 1200, enonces: true, prenoms: [] }, g),
      ...problemesDeComparaison(["billes", "pommes", "longueurs"], Math.floor(k / 2), g + 1, () => 1, 5000)],
    autres: (g, k) => problemesDeComparaison(["billes", "monnaie", "pommes"], k, g, () => 2),
  },
  "multiplicatifs-ce2": {
    famille: (g, k) => problemesMultiplicatifs("CE2", ["tout", "part", "nombre"], k, g, { parts: [2, 10], valeurs: [3, 25] }),
    autres: (g, k) => genererPartieTout({ nombre: k, parties: 2, inconnue: "melange", max: 1000, min: 120, enonces: true, prenoms: [] }, g),
  },
  "mixtes-ce2": {
    famille: (g, k) => problemesMixtes(k, g, 3),
    autres: (g, k) => [...problemesMultiplicatifs("CE2", ["tout", "part"], Math.ceil(k / 2), g, { parts: [2, 9], valeurs: [3, 12] }),
      ...genererPartieTout({ nombre: Math.floor(k / 2), parties: 2, inconnue: "melange", max: 100, min: 30, enonces: true, prenoms: [] }, g + 1)],
  },
  "comparaison-multiplicative-ce2": {
    famille: (g, k) => problemesMultiplicatifs("CE2", ["grand", "petit"], k, g, { parts: [2, 6], valeurs: [3, 30] }),
    autres: (g, k) => problemesDeComparaison(["billes", "monnaie", "pommes"], k, g, () => 1),
  },
  "produits-cartesiens-ce2": {
    famille: (g, k) => problemesCartesiens(k, g),
    autres: (g, k) => problemesMultiplicatifs("CE2", ["tout"], k, g, { parts: [2, 9], valeurs: [3, 9] }),
  },
};

/** Mêler : les problèmes de la séquence, un sur deux, avec ceux d'autres familles. */
const meles = (f: { famille: Tirage; autres: Tirage }): Tirage => (g, k) => {
  const a = f.famille(g, Math.ceil(k / 2)), b = f.autres(g + 7, Math.floor(k / 2));
  return Array.from({ length: a.length + b.length }, (_, i) => (i % 2 === 0 ? a[i / 2] : b[(i - 1) / 2])).filter(Boolean);
};

const presentation = (schema: Presentation["schema"]): Presentation => ({ ...PRESENTATION_COMPLETE, schema });

export const estUneDemarcheProlongee = (id: string) => id in FAMILLES;

export function planDesProblemesProlonges(demarcheId: string): PlanDesFeuilles | null {
  const f = FAMILLES[demarcheId];
  const reference = REFERENCES[demarcheId];
  if (!f || !reference) return null;
  // Au CP, un cadre pour dessiner ; au CE1 et au CE2, le schéma à compléter d'abord, puis à faire soi-même.
  const cp = demarcheId.endsWith("-cp");
  const debut: Presentation["schema"] = cp ? "sans" : "vide";
  const feuille = (seance: number, titre: string, schema: Presentation["schema"], problemes: (g: number) => Probleme[]): FeuilleAFabriquer => ({
    seance, atelier: demarcheId.includes("multiplicati") || demarcheId.includes("cartesien") ? "multiplicatifs" : "partieTout", titre,
    fabriquer: (g) => ({ html: feuilleProblemes(problemes(g), titre, presentation(schema)), style: STYLE_PROBLEMES }),
  });
  const feuilles: FeuilleAFabriquer[] = [
    feuille(0, "Problèmes — le problème de référence", debut, (g) => [reference, ...f.famille(g, 4)]),
    feuille(1, "Problèmes à l'ardoise — la même famille", debut, (g) => f.famille(g, 3)),
    feuille(2, "Problèmes à l'ardoise — d'autres habillages", debut, (g) => f.famille(g + 3, 3)),
    feuille(3, "Problèmes — entraînement", debut, (g) => f.famille(g, 6)),
    feuille(4, "Évaluation intermédiaire", "sans", (g) => f.famille(g, 3)),
    feuille(5, "Problèmes à l'ardoise — parmi d'autres", "sans", (g) => meles(f)(g, 3)),
    feuille(6, "Problèmes à l'ardoise — parmi d'autres (2)", "sans", (g) => meles(f)(g + 5, 3)),
    feuille(7, "Problèmes — tout mêlé", "sans", (g) => meles(f)(g, 6)),
    feuille(8, "Évaluation — problèmes", "sans", (g) => meles(f)(g, 5)),
  ];
  const ardoise = "Les ardoises";
  const cahier = "Le cahier d'entraînement";
  return {
    feuilles,
    materiel: [
      `Du matériel pour jouer l'histoire ; le cahier de leçons et le cahier d'entraînement ; la feuille « ${feuilles[0].titre} »`,
      `${ardoise} ; la feuille « ${feuilles[1].titre} »`, `${ardoise} ; la feuille « ${feuilles[2].titre} »`, `${cahier} ; la feuille « ${feuilles[3].titre} »`,
      `Les énoncés à distribuer ; la feuille « ${feuilles[4].titre} »`, `${ardoise} ; la feuille « ${feuilles[5].titre} »`, `${ardoise} ; la feuille « ${feuilles[6].titre} »`,
      `${cahier} ; la feuille « ${feuilles[7].titre} »`, `Les énoncés à distribuer ; la feuille « ${feuilles[8].titre} »`,
    ].map((m) => `${m}.`),
  };
}
