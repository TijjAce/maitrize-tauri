// La proportionnalité au CM1 : une séquence d'après le manuel de préparation
// au CRPE que l'enseignant a fourni dans « Adapter une fiche » (octobre 2026)
// — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon, maths et français »
// (Nathan), sujet n° 12, « Proportionnalité CM1 », p. 189-202.
//
// Le manuel découpe la séquence en cinq séances, sur les périodes 1 et 2
// (p. 189) : la linéarité additive, la linéarité multiplicative,
// l'institutionnalisation, l'entraînement, l'évaluation. Il détaille la
// première en quatre phases (p. 199-201) : la même boisson d'eau et de sirop
// dans un récipient deux fois plus grand, le prix des pommes de terre, puis
// des situations qui sont ou non de proportionnalité. Elle ne s'ouvre pas sur
// le calcul mental : la séquence n'en a pas. Les phases des séances 2 à 5
// sont de Maitrize, d'après ce que le manuel dit de ces séances, son corpus —
// les bandes de papier du « Nombre au cycle 3 », les attendus du CM1 — et ses
// connaissances didactiques (p. 189-197 et 201-202), et la source le dit. Le
// texte du manuel n'est pas repris : ses phases sont dites ici avec nos mots,
// sans les prénoms de ses exemples.
//
// La séquence sert « Savoir résoudre un problème de proportionnalité », au
// CM1. Le matériel réel y vient avant le dessin et l'écriture : des bandes de
// papier mises bout à bout, des manuels et des cailloux qu'on pèse, des tours
// de cubes qu'on mesure, des pièces pour jouer.
//
// Aucun atelier de Fabriquer ne fait encore de problèmes de proportionnalité.
// Les feuilles viennent des ateliers « Problèmes multiplicatifs » — fois plus,
// fois moins : la brique du raisonnement multiplicatif — et « La monnaie », à
// leurs réglages ; chacune se rouvre dans le sien. La feuille de la boisson,
// les énoncés et l'évaluation restent à faire à la main.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie, type ReglagesMonnaie } from "./monnaie";
import {
  PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererMultiplicatifs, type Presentation, type TypeMultiplicatif,
} from "./problemesBarres";

export const ID_PROPORTIONNALITE_CM1 = "linearite-cm1";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

export const DEMARCHE_PROPORTIONNALITE_CM1: Demarche = {
  id: ID_PROPORTIONNALITE_CM1,
  nom: "La proportionnalité : reconnaître, ajouter, multiplier (CM1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 12, « Proportionnalité CM1 », p. 189-202 : la séquence en cinq séances et sa période (p. 189), `
    + "la séance 1, détaillée (p. 199-201) ; les phases des séances 2 à 5 et le matériel réel proposé en aide ajoutés par Maitrize, d'après ce que "
    + "le manuel dit de ces séances, son corpus — attendus de fin d'année et repères de progression du CM1, « Le nombre au cycle 3 » (Éduscol) — "
    + "et ses connaissances didactiques (p. 189-197 et 201-202) ; programme de mathématiques du cycle 3 (2025)",
  resume: "Au CM1, en périodes 1 et 2 : reconnaître une situation de proportionnalité et la traiter par les propriétés de linéarité, avant le "
    + "retour à l'unité. On part d'une boisson à deux ingrédients plutôt que d'une recette : pour la même boisson dans un récipient deux fois "
    + "plus grand, il faut deux fois plus de sirop. Le prix de 8 kg de pommes de terre, c'est celui de 3 kg et celui de 5 kg : on ajoute. Des "
    + "bandes de papier mises bout à bout font passer d'ajouter à multiplier — trois fois plus de bleues, trois fois plus de rouges —, et le "
    + "matériel tranche. Puis on institutionnalise, on s'entraîne en choisissant selon les nombres, on rencontre des situations qui ne sont pas "
    + "de proportionnalité, et l'on évalue.",
  visee: { intitule: /résoudre un problème de proportionnalité/i, niveaux: ["CM1"] },
  seances: [
    // La séance détaillée du manuel : ses quatre phases, leur organisation et leur durée.
    seance("La même boisson : reconnaître et ajouter",
      sauront("reconnaître une situation de proportionnalité à son contexte — la même boisson, le même prix au kilo —, la traiter en ajoutant : 3 kg et 5 kg, c'est 8 kg, donc 6 € et 10 €, c'est 16 € ; et dire quand une situation n'en est pas une."), 45, [
        ph("Phase 1 – Binômes", "10 min", "La feuille, distribuée d'avance : pour une boisson sucrée, on mélange de l'eau et du sirop dans un récipient d'un litre, on remue, on goûte. Un second récipient, de deux litres, est vide : il faut y faire la même boisson en traçant un seul trait, la hauteur du sirop, et seulement une fois le binôme d'accord. Cinq minutes de recherche, cinq d'échange : les traits sont affichés au tableau. Puis le débat : comment être sûr que c'est la même boisson ?",
          "Affiche tous les traits, puis mène le débat jusqu'au constat : il faudrait goûter. Démarches attendues : mesurer à la règle et tracer le sirop à la même hauteur, ce qui ne marche pas — le second récipient est plus étroit — ; tracer un peu plus haut, sans savoir de combien. Pour qui a besoin de voir : un vrai récipient d'un litre, de l'eau et du sirop, montrés avant la feuille. Le manuel reste sur le dessin ; goûter les deux boissons peut se faire dans une séance avant celle-ci."),
        ph("Phase 2 – Binômes", "10 min", "Le même problème, avec des nombres : dans un récipient d'un litre, on verse d'abord 10 cL de sirop ; combien en verser pour la même boisson dans un récipient de deux litres ? Le tableau des données : 1 L de boisson, 10 cL de sirop ; 2 L, une case vide, qu'on ne remplit qu'une fois d'accord. Cinq minutes de recherche, cinq de confrontation. Puis : et pour 3 L ? Pour 4 L ?",
          "Fait dire les premiers mots de la notion : même boisson, mêmes proportions ; deux litres, c'est le double d'un litre, il faut donc le double de sirop, 20 cL. Prolonge à 3 et 4 litres."),
        ph("Phase 3 – Binômes", "10 min", "Le problème des pommes de terre : 3 kg coûtent 6 € et 5 kg coûtent 10 € ; combien coûtent 8 kg ? Chaque binôme fait un tableau qui résume la situation, puis résout. Cinq minutes de recherche, cinq de confrontation : les résultats, puis les démarches. Au tableau : 5 kg, 3 kg, 8 kg ; 10 €, 6 €, 16 € ; et les flèches « + » : 5 + 3 = 8, donc 10 + 6 = 16.",
          "Fait discuter 16 € selon le chemin suivi. Met en évidence ce qui fait la proportionnalité : le kilo coûte toujours le même prix, quelle que soit la quantité achetée. Erreur attendue, celle que le manuel décrit pour des croissants : ajouter au prix de 5 kg le nombre de kilos, 10 + 3, au lieu du prix de 3 kg."),
        ph("Phase 4 – Individuel", "15 min", "Seul, sur l'ardoise ou au brouillon : quatre problèmes aux nombres simples, projetés l'un après l'autre, chacun suivi d'un débat. Des boules d'acier prises au hasard : 5 pèsent 3 kg, 10 pèsent 5 kg ; et 15 ? On ne peut pas savoir, elles n'ont pas toutes la même masse. 4 croissants coûtent 3 € et 7 croissants 5 € : combien pour 6 ? Pas de proportionnalité. Un gâteau de 1 kg demande 500 g de farine : et un gâteau de 2 kg ? 1 kg, si c'est le même gâteau. 3 croissants coûtent 3 € et 6 croissants 6 € : combien pour 9 ? 9 €.",
          "Après chaque problème, fait dire s'il y a proportionnalité, et pourquoi. Pour les croissants à 3 € et 5 €, deux chemins donnent deux prix différents pour 6 croissants, 4 € ou 4,50 € : ce n'est pas de la proportionnalité. Constitue ensuite des groupes d'après les réussites de chacun."),
      ]),
    seance("Trois fois plus de bandes : multiplier",
      sauront("traiter une situation de proportionnalité en multipliant les deux quantités par le même nombre — trois fois plus de bandes bleues, trois fois plus de bandes rouges —, et dire pourquoi ajouter le même nombre aux deux ne marche pas."), 45, [
        ph(T1, "10 min", "Le matériel d'abord : des bandes de papier bleues et rouges ; trois bleues mises bout à bout ont la longueur de deux rouges. « Combien de rouges pour la longueur de six bleues ? » Chaque binôme écrit sa réponse sur l'ardoise, puis la vérifie avec les bandes : quatre.",
          "Annonce l'objectif : une autre façon de garder les proportions. Fait dire les deux chemins : six bleues, c'est trois et trois, donc deux et deux rouges, comme à la séance 1 ; c'est aussi deux fois trois bleues, donc deux fois deux rouges."),
        ph(T2, "15 min", "Par deux, des nombres plus grands : 15 bleues ? 12 rouges, combien de bleues ? 42 bleues ? On anticipe, puis on vérifie avec les bandes tant qu'on en a assez. On dessine ensuite les tas — 15 bleues, c'est 5 tas de 3 bleues, donc 5 tas de 2 rouges — et l'on écrit la réponse dans un tableau à deux lignes. Pour 42, les bandes manquent et le dessin est long : 42, c'est 14 fois 3, il faut 14 fois 2 rouges, 28. Puis un prix : 2 croissants coûtent 1,50 € ; combien coûtent 6 croissants ? Et 10 ? Pour qui en a besoin, les pièces de la feuille « Pièces et billets à découper » : on pose trois fois le même tas.",
          "Erreur attendue, celle du modèle additif : six bleues valent cinq rouges, parce qu'on a retiré 1 comme de 3 à 2. On la met en débat, et les bandes tranchent. Avec de grands nombres, ajouter devient long : c'est là que multiplier sert."),
        ph(T3, "10 min", "Ce qu'on retient : quand une quantité est multipliée par 2, par 3 ou par 10, l'autre l'est aussi. Dans le tableau, la même flèche « × 3 » relie deux colonnes, en haut et en bas. Ajouter le même nombre aux deux lignes ne garde pas les proportions.",
          "« Trois fois plus » gêne certains élèves : on ne voit pas toujours ce que « fois » et « plus » font ensemble. On le montre avec les bandes : trois fois plus long, c'est trois longueurs pareilles, bout à bout."),
        ph(T4, "10 min", "La feuille « Fois plus, fois moins » : quatre problèmes, le schéma en barres à compléter. Trois fois plus se dessine comme les bandes : trois barres pareilles.",
          "Les bandes restent sur les tables ; fait lire chaque schéma avant de calculer."),
      ]),
    seance("Ce qu'on retient : reconnaître, ajouter, multiplier",
      sauront("dire si une situation est de proportionnalité et le justifier — si l'une des quantités double, l'autre double-t-elle ? —, puis trouver une quantité en ajoutant deux colonnes connues ou en multipliant, et l'écrire dans un tableau."), 45, [
        ph(T1, "10 min", "Les tableaux des séances 1 et 2, affichés : la boisson, les pommes de terre et leurs flèches « + », les bandes et leurs flèches « × ». Qu'ont ces situations en commun ? L'objectif : savoir quand on peut ajouter ou multiplier, et comment.",
          "Fait redire chaque façon de faire par un élève, avec ses mots."),
        ph(T2, "20 min", "Reconnaître, avec du vrai : une pile de manuels identiques, pesée avec 1, 2 puis 4 manuels ; des cailloux pris au hasard, pesés par deux, puis par quatre. Pour chaque pesée : si le nombre double, la masse double-t-elle ? On range au tableau : proportionnel, pas proportionnel. Puis des situations dites, la réponse sur l'ardoise : l'âge et la taille d'un enfant ; une carte de piscine à 20 € l'année, puis 2 € par entrée ; des baguettes toutes au même prix.",
          "Le contexte décide souvent : il faut dire ce qui reste pareil — le même manuel, le même prix. Erreur attendue : croire que tout ce qui grandit ensemble est proportionnel. La piscine le montre : 10 entrées coûtent 40 €, 20 entrées 60 €, pas le double."),
        ph(T3, "10 min", "La trace écrite, construite ensemble : deux quantités sont proportionnelles quand, si l'une est multipliée par 2, par 3…, l'autre l'est aussi. Pour trouver une quantité, on ajoute deux colonnes connues : 3 kg et 5 kg, c'est 8 kg, donc 6 € et 10 €, c'est 16 €. Ou l'on multiplie : 6 croissants, c'est 3 fois 2 croissants, donc 3 fois 1,50 €. Chaque exemple garde son tableau et ses flèches.",
          "Affiche aussi, barrée, l'erreur que le manuel signale : pour 8 croissants, 1,50 + 6 = 7,50 — on a ajouté le nombre de croissants au lieu de leur prix. La bonne réponse : 1,50 + 4,50 = 6 €."),
        ph(T4, "5 min", "Sur l'ardoise : des briques identiques ; 7 briques pèsent 14 kg et 3 briques 6 kg. Combien pèsent 10 briques ? Et 20 ? On lève l'ardoise ; un élève dit comment il a fait."),
      ]),
    seance("S'entraîner : ajouter ou multiplier ?",
      sauront("choisir selon les nombres d'ajouter ou de multiplier pour résoudre un problème de proportionnalité, et compléter un tableau de proportionnalité."), 45, [
        ph(T1, "10 min", "Des cubes emboîtables : une tour de 3 cubes et une tour de 5 cubes, mesurées à la règle. Sans construire : combien mesure une tour de 8 cubes ? De 6 cubes ? De 30 cubes ? On construit celles de 8 et de 6 pour vérifier.",
          "Fait dire le chemin de chaque réponse : 8, c'est 3 et 5 ; 6, c'est 2 fois 3 ; 30, c'est 10 fois 3."),
        ph(T2, "20 min", "Par deux, des problèmes projetés l'un après l'autre, chacun avec son tableau. Une bouteille coûte 2 € : le prix de 2, 4, 6, 8, 10, 15, 20 et 50 bouteilles. 10 briques identiques pèsent 20 kg : combien pèsent 25 briques ? Vrai ou faux : si 5 L d'essence coûtent 8 €, 15 L coûtent 24 €. Deux magasins vendent les mêmes stylos, l'un 4 pour 2 €, l'autre 6 pour 2,50 € : où sont-ils le moins chers ?",
          "Les petits nombres se traitent en ajoutant, les grands en multipliant. Erreur attendue, le modèle additif : 4 stylos coûtent 2 €, donc 6 stylos 4 €, parce qu'on a ajouté 2 en haut et en bas. Aides : les pièces de la séance 2, les tours de cubes, un tableau déjà tracé. Pour les stylos, chercher le prix de 12 stylos dans chaque magasin : 6 € et 5 €."),
        ph(T3, "10 min", "On compare les façons de résoudre un même problème — les briques : 25, c'est 10, 10 et 5 ; ou 5 fois 5 — et l'on garde au cahier un problème résolu de deux façons.",
          "Aucune façon n'est la seule bonne : on choisit celle que les nombres rendent simple."),
        ph(T4, "5 min", "Sur l'ardoise, deux situations dites : proportionnelles ou non ? Le prix des places de cinéma, quand toutes coûtent le même prix ; le nombre de buts marqués et le nombre de matchs joués."),
      ]),
    seance("Évaluation et remédiations",
      sauront("reconnaître seuls une situation de proportionnalité et la traiter en ajoutant ou en multipliant ; ceux qui en ont besoin reprennent avec le matériel."), 45, [
        ph("Évaluation", "25 min", "Seul, sans aide. Vrai ou faux, en justifiant : si 4 billes identiques pèsent 20 g, 8 de ces billes pèsent 40 g ; un enfant qui mesure 1 m 30 cm à 9 ans mesurera 2 m 60 cm à 18 ans. Un tableau à compléter : un cahier coûte 3 €, le prix de 2, 5, 10 et 20 cahiers. Deux problèmes : 4 m de tissu coûtent 12 € et 3 m coûtent 9 €, combien coûtent 7 m ? Pour 2 L de boisson, il faut 20 cL de sirop : combien pour 6 L ?",
          "Observe sans aider : qui reconnaît, qui ajoute, qui multiplie, qui ajoute le même nombre en haut et en bas."),
        ph("Remédiations", "20 min", "Pour qui en a besoin, reprendre avec le matériel — les bandes, les tours de cubes, les pièces — en disant « deux fois plus de…, deux fois plus de… ». Les autres : deux magasins vendent les mêmes cahiers, 3 pour 4 € ou 5 pour 6 € ; où sont-ils le moins chers ? Ensuite, le retour à l'unité — le prix d'un seul objet —, que le manuel veut voir venir assez vite.",
          "Reprend avec le matériel ce que l'évaluation a montré."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Des problèmes de l'atelier « Problèmes multiplicatifs » : il les refait, avec les mêmes réglages et le même tirage. */
const multiplicatifs = (
  seance: number, titre: string, types: TypeMultiplicatif[], nombre: number, parts: [number, number], valeurs: [number, number], presentation: Presentation,
): FeuilleAFabriquer => ({
  seance, atelier: "multiplicatifs", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererMultiplicatifs({ nombre, types, table: 10, parts, valeurs, enonces: presentation.enonce, prenoms: [] }, g), titre, presentation),
    style: STYLE_PROBLEMES,
    refaire: {
      multiplicatifs: { titre, nombre, prenoms: "", types, table: 10, perso: true, partsMin: parts[0], partsMax: parts[1], valeurMin: valeurs[0], valeurMax: valeurs[1] },
      "presentation:multiplicatifs": presentation,
    },
  }),
});

const monnaie = (seance: number, titre: string, r: Partial<ReglagesMonnaie>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_MONNAIE, ...r };
  return {
    seance, atelier: "monnaie", titre,
    fabriquer: (g) => ({ html: htmlMonnaie(reglages, g), style: STYLE_FEUILLE + STYLE_MONNAIE, refaire: { monnaie: reglages } }),
  };
};

const FEUILLES: FeuilleAFabriquer[] = [
  // Les pièces, pour poser trois fois le même tas : elles resservent à la séance 4.
  monnaie(1, "Pièces et billets à découper", { exercice: "planche", jusqua: 20, centimes: true }),
  // « Trois fois plus », « trois fois moins », le schéma en barres à compléter : deux à cinq fois, de petites quantités.
  multiplicatifs(1, "Fois plus, fois moins", ["grand", "petit"], 4, [2, 5], [3, 20], { ...PRESENTATION_COMPLETE, schema: "vide" }),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après. */
const MATERIEL = [
  "La feuille des deux récipients, à dessiner, une par binôme : un récipient d'un litre, son eau et son sirop ; un récipient de deux litres, vide, "
    + "plus étroit et plus haut ; les problèmes des phases 2 à 4, à projeter ; les ardoises et des brouillons ; pour qui a besoin de voir, "
    + "un récipient transparent, de l'eau et du sirop",
  "Des bandes de papier découpées, bleues de 10 cm et rouges de 15 cm — trois bleues font la longueur de deux rouges —, une vingtaine de bleues "
    + "et une quinzaine de rouges par binôme ; les ardoises",
  "Les tableaux des séances 1 et 2, gardés ; une balance de cuisine, une pile de manuels identiques et des cailloux de tailles différentes ; "
    + "une affiche pour la trace écrite ; les ardoises",
  "Des cubes emboîtables et une règle par binôme ; les pièces et les billets de la séance 2 ; les problèmes, à projeter ; les ardoises ; le cahier",
  "L'évaluation, à écrire ; pour les remédiations, les bandes, les cubes et les pièces",
];

/** Les feuilles et le matériel de la séquence. */
export function planProportionnaliteCm1(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
