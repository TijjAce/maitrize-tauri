// ── Les périodes que Maitrize propose, faute de texte ──────────────────────
//
// Ni le programme ni les textes d'Éduscol — livrets, guides, repères
// annuels — ne datent la géométrie, les grandeurs hors monnaie, les données,
// l'oral, la plupart de la grammaire… (relevé d'octobre 2026, voir
// programmation.ts). L'enseignant a demandé qu'elles prennent quand même
// leur place dans le tableau des séquences toutes faites : Maitrize leur
// propose une période, ligne par ligne, et le dit — « Suggestion Maitrize »
// en haut de la séquence, et sa raison commence par « Suggestion de Maitrize ». Une ligne se répartit sur l'année, du plus
// simple au plus complexe ou du proche au lointain, autour des séquences que
// les textes datent. L'enseignant change une période en glissant la séquence.

import type { Classe } from "./feuillesDesSequences";

export interface PeriodeProposee { periode: number; raison: string }

const PROPOSITION = "Suggestion de Maitrize : ni le programme ni les guides ne la datent. ";

/** Une ligne du tableau : sa raison, et la période de chacune de ses séquences. */
const ligne = (raison: string, periodes: Record<string, number>): Record<string, PeriodeProposee> =>
  Object.fromEntries(Object.entries(periodes).map(([id, periode]) => [id, { periode, raison: PROPOSITION + raison[0].toUpperCase() + raison.slice(1) }]));

const CORPUS = "le programme veut que « le professeur enseigne quatre corpus par période au CP, cinq au CE1 puis six au CE2 » : "
  + "la séquence commence à la rentrée, puis se reprend chaque période avec un autre corpus.";
const ORAL = "les règles de l'échange à la rentrée ; puis écouter et adapter sa façon de parler, raconter, dire un poème — le Printemps "
  + "des poètes est en mars — ; l'exposé en fin d'année.";
const COMPRENDRE = "la compréhension et les livres de la classe dès la rentrée ; puis les stratégies une à une — mots inconnus, reprises, "
  + "inférences —, avec une œuvre complète et les personnages des contes ; les genres et les types de textes en fin d'année.";

export const PERIODES_PROPOSEES: Record<Classe, Record<string, PeriodeProposee>> = {
  CP: {
    ...ligne("une grandeur par période, dans l'ordre du programme : comparer des longueurs à la rentrée, puis les mesurer à la règle ; "
      + "les masses ; l'heure en fin d'année. La monnaie garde la période 2 que lui donne le programme.",
    { "longueurs-comparer-cp": 1, "longueurs-mesurer-cp": 3, "masses-cp": 4, "heure-cp": 5 }),
    ...ligne("de l'espace proche aux figures, dans la continuité de la maternelle : se repérer, puis se déplacer dans la classe ; "
      + "les solides et leurs assemblages ; les figures planes et les alignements ; enfin les tracés sur quadrillage.",
    { "positions-cp": 1, "deplacements-cp": 2, "solides-cp": 3, "assemblages-cp": 3, "figures-cp": 4, "alignements-cp": 4, "reproduire-cp": 5 }),
    ...ligne("le tableau à double entrée d'abord, qui prolonge les tris de la maternelle ; l'enquête et son diagramme en barres "
      + "quand les nombres jusqu'à cent sont connus — en période 3 au plus tard, d'après le programme.",
    { "double-entree-cp": 2, "donnees-cp": 4 }),
    ...ligne("aller vers les livres et les contes dès la rentrée, sur des textes entendus ; les stratégies — mots inconnus, reprises, "
      + "inférences — à mesure que les élèves lisent seuls, « à partir de la 3e période de CP » d'après le programme ; les types de textes en fin d'année.",
    { "lieux-de-lecture-c2": 1, "personnages-types-c2": 1, "mots-inconnus-c2": 2, "reprises-c2": 3, "inferences-c2": 4, "types-et-genres-c2": 5 }),
    ...ligne("le programme la veut « tout au long de l'année » : la séquence qui installe la méthode vient à la rentrée.", { "mots-frequents-c2": 1 }),
    ...ligne("après la phrase de la rentrée : ses types, avec la ponctuation, et les classes de mots, avant le genre, le nombre et le sujet "
      + "du verbe, que les textes mettent en période 3 ; être et avoir au présent ensuite.",
    { "types-formes-c2": 2, "classes-de-mots-c2": 2, "etre-avoir-cp": 4 }),
    ...ligne(CORPUS, { "vocabulaire-cp": 1 }),
    ...ligne("les règles de l'échange à la rentrée ; puis écouter, raconter, dire un poème — le Printemps des poètes est en mars — ; "
      + "les registres de langue en fin d'année.",
    { "echanger-c2": 1, "ecouter-comprendre-c2": 2, "raconter-c2": 3, "dire-un-poeme-c2": 4, "registres-c2": 5 }),
    ...ligne("le calendrier dès la rentrée, avec les rituels ; le jour, la nuit et les saisons ; puis situer des évènements — "
      + "la séquence de la Petite Sirène le fait autrement, plus tard dans l'année.",
    { "temps-represente-cp": 1, "temps-naturel-cp": 2, "situer-evenements-cp": 3, "petite-sirene-cp": 4 }),
    ...ligne("du proche au lointain : la classe à la rentrée, l'école et le quartier, puis le globe et le planisphère.",
      { "classe-espace-organise-cp": 1, "ecole-quartier-cp": 3, "representations-monde-cp": 5 }),
  },
  CE1: {
    ...ligne("après le symbole × de la période 1, avec la table de 2 et les doubles, que le livret du CE1 met en périodes 1 et 2.", { "parite-ce1": 2 }),
    ...ligne("commencés en fin de CP — en périodes 4 ou 5, d'après le guide du CP —, les problèmes de comparaison reviennent en période 2, "
      + "entre les problèmes en deux étapes et les parties-tout.", { "comparaison-ce1": 2 }),
    ...ligne("une grandeur à la fois, dans l'ordre du programme : mesurer des longueurs avant leurs unités (période 2), les masses, "
      + "puis l'heure et les durées. La monnaie garde les périodes du programme.",
    { "longueurs-mesurer-ce1": 1, "masses-ce1": 3, "heure-ce1": 4, "durees-ce1": 5 }),
    ...ligne("de l'espace aux figures : se repérer dans l'école et le quartier, coder des déplacements, les solides et leurs assemblages, "
      + "les figures, puis les tracés à la règle, à l'équerre et au compas.",
    { "positions-ce1": 1, "deplacements-ce1": 2, "solides-ce1": 3, "assemblages-ce1": 3, "figures-ce1": 4, "construire-ce1": 5 }),
    ...ligne("quand les nombres jusqu'à mille sont connus — en période 2 au plus tard, d'après le programme —, pour des diagrammes à graduer.",
      { "donnees-ce1": 3 }),
    ...ligne(COMPRENDRE, {
      "comprendre-ce1": 1, "lieux-de-lecture-c2": 1, "mots-inconnus-c2": 2, "oeuvre-complete-c2": 2,
      "reprises-c2": 3, "personnages-types-c2": 3, "inferences-c2": 4, "types-et-genres-c2": 5,
    }),
    ...ligne("le programme la veut « au cours des périodes 1 à 5 » ; la période 1 a déjà trois séquences d'écriture.", { "transformer-un-texte-c2": 2 }),
    ...ligne("les dictées dès la rentrée ; puis la mémorisation des mots fréquents, les accents et les familles de mots, une notion par période.",
      { "dictees-ce1": 1, "mots-frequents-c2": 2, "accents-c2": 3, "familles-orthographe-c2": 4 }),
    ...ligne("de la phrase aux accords, à côté des temps que le programme ordonne : les types de phrases, les classes de mots et l'infinitif "
      + "du verbe, le sujet et le verbe, la chaîne d'accords du groupe nominal, puis les constituants de la phrase.",
    { "types-formes-c2": 1, "classes-de-mots-c2": 2, "verbe-infinitif-c2": 2, "sujet-verbe-c2": 3, "chaine-accords-c2": 4, "constituants-c2": 5 }),
    ...ligne(CORPUS, { "vocabulaire-ce1": 1 }),
    ...ligne(ORAL, { "echanger-c2": 1, "ecouter-comprendre-c2": 2, "registres-c2": 2, "raconter-c2": 3, "dire-un-poeme-c2": 4, "expose-c2": 5 }),
    ...ligne("du passé proche au passé lointain : le lexique du temps, les traces du passé autour de l'école, puis les grandes périodes sur la frise.",
      { "passe-proche-lointain-ce1": 1, "traces-passe-ce1": 3, "grandes-periodes-ce1": 5 }),
    ...ligne("du proche au lointain : les marchés d'ici et d'ailleurs, une ville par ses paysages et son plan, puis les lieux de vie "
      + "du monde et le peuplement de la Terre.",
    { "marches-ce1": 1, "lion-a-paris-ce1": 2, "lieux-de-vie-ce1": 4, "terre-peuplee-ce1": 5 }),
  },
  CE2: {
    ...ligne("pour les élèves qui n'ont pas encore automatisé les correspondances graphème-phonème : dès la rentrée, comme au CE1.",
      { "precision-vitesse-ce1": 1 }),
    ...ligne("le calcul mental de la rentrée : le double du double, sur les doubles du CE1.", { "multiplier-par-4-ce2": 1 }),
    ...ligne("les repères annuels de 2019 font chercher le quotient et le reste d'une division « à partir de la période 3 ».", { "division-ce2": 3 }),
    ...ligne("après les problèmes multiplicatifs du début d'année : la comparaison multiplicative en période 2, les produits cartésiens "
      + "en période 4, avec la multiplication posée.", { "comparaison-multiplicative-ce2": 2, "produits-cartesiens-ce2": 4 }),
    ...ligne("entre les égalités de fractions du début du CE2 et les fractions d'une longueur de la période 3 : comparer en période 2 ; "
      + "additionner et soustraire en période 4.", { "comparer-fractions-ce2": 2, "additionner-fractions-ce2": 4 }),
    ...ligne("une grandeur à la fois, dans l'ordre du programme : les longueurs — unités, tracés, périmètre —, les masses, l'heure et "
      + "les durées, puis les contenances. La monnaie garde sa période 1.",
    { "longueurs-unites-ce2": 1, "mesurer-tracer-ce2": 2, "perimetre-ce2": 2, "masses-ce2": 3, "heure-ce2": 4, "durees-ce2": 4, "contenances-ce2": 5 }),
    ...ligne("des solides aux figures : nommer les solides, construire le cube par son patron, les polygones, les tracés sur tout support, "
      + "puis la symétrie.", { "solides-ce2": 1, "patron-cube-ce2": 2, "figures-ce2": 3, "construire-ce2": 4, "symetrie-ce2": 5 }),
    ...ligne("après les problèmes qui lisent des tableaux et des graphiques dès le début de l'année : produire les siens, avec une échelle.",
      { "donnees-ce2": 2 }),
    ...ligne(COMPRENDRE, {
      "comprendre-ce2": 1, "lieux-de-lecture-c2": 1, "mots-inconnus-c2": 2, "oeuvre-complete-c2": 2,
      "reprises-c2": 3, "personnages-types-c2": 3, "inferences-c2": 4, "types-et-genres-c2": 5,
    }),
    ...ligne("le programme veut ces compétences développées « tout au long de l'année » : la méthode s'installe à la rentrée.",
      { "ecrire-un-texte-c2": 1 }),
    ...ligne("une fois la méthode d'écriture installée : retravailler un texte, en milieu d'année.", { "transformer-un-texte-c2": 3 }),
    ...ligne("la mémorisation des mots fréquents dès la rentrée, puis les accents et les familles de mots ; les dictées ont la période "
      + "que leur donne le programme.", { "mots-frequents-c2": 1, "accents-c2": 2, "familles-orthographe-c2": 3 }),
    ...ligne("de la phrase aux accords, à côté des temps que le programme ordonne : les types de phrases, les classes de mots, l'infinitif "
      + "et les paroles rapportées, le sujet et le verbe, la chaîne d'accords du groupe nominal, puis les constituants de la phrase.",
    {
      "types-formes-c2": 1, "classes-de-mots-c2": 2, "verbe-infinitif-c2": 2, "discours-rapporte-ce2": 2,
      "sujet-verbe-c2": 3, "chaine-accords-c2": 4, "constituants-c2": 5,
    }),
    ...ligne(CORPUS, { "vocabulaire-ce2": 1 }),
    ...ligne(ORAL, { "echanger-c2": 1, "ecouter-comprendre-c2": 2, "registres-c2": 2, "raconter-c2": 3, "dire-un-poeme-c2": 4, "expose-c2": 5 }),
    ...ligne("du proche au lointain : le quartier comparé à un village, se loger et travailler en France, la répartition de la population, "
      + "puis les transports dans le monde.",
    { "quartier-village-ce2": 1, "se-loger-ce2": 2, "travailler-ce2": 3, "population-france-ce2": 4, "transports-ce2": 5 }),
  },
  CM1: {
    ...ligne("après les nombres de cinq et six chiffres, que le programme fait aborder à partir de la période 3 : les comparer, les ranger, "
      + "les placer sur la demi-droite.", { "comparer-nombres-cm1": 4 }),
    ...ligne("avec les tables de multiplication revues en début d'année, avant les fractions qu'on compare et qu'on additionne.", { "multiples-cm1": 2 }),
    ...ligne("estimer d'abord, pour contrôler chaque calcul posé ; la division après la multiplication posée de la rentrée ; les décimaux "
      + "posés après l'écriture à virgule de la période 3, puis multipliés par un entier.",
    { "estimer-calculer-cm1": 2, "division-cm1": 2, "posees-decimaux-cm1": 3, "multiplication-decimal-cm1": 4 }),
    ...ligne("après la reprise, à la rentrée, des deux procédures qu'elle demande — multiplier par 10, prendre la moitié — : le livret veut "
      + "qu'on les réactive d'abord.", { "multiplier-par-5-cm1": 2 }),
    ...ligne("après les fractions plus grandes que 1 de la période 1, les comparer et les additionner — le programme veut les fractions "
      + "« tout au long de l'année » —, puis prendre une fraction d'une quantité, avec la division.",
    { "comparer-fractions-cm1": 2, "fraction-quantite-cm1": 4 }),
    ...ligne("après les fractions décimales de la période 2, l'écriture à virgule qui les code — « introduits sous la forme de fractions "
      + "décimales puis exprimés avec une écriture à virgule », dit le programme — ; puis comparer, arrondir, ranger.",
    { "nombres-decimaux-cm1": 3, "comparer-decimaux-cm1": 4 }),
    ...ligne("dans la continuité du cycle 2, les problèmes additifs en une étape dès la rentrée, avec les décimaux et les fractions que le "
      + "programme fait rencontrer dès la période 1 ; puis ceux en deux ou trois étapes.", { "problemes-additifs-cm1": 1, "problemes-etapes-cm1": 3 }),
    ...ligne("avec les tables de multiplication revues et la division de la période 2 ; puis les problèmes qui mêlent les quatre opérations.",
      { "problemes-multiplicatifs-cm1": 2, "problemes-mixtes-cm1": 4 }),
    ...ligne("après les problèmes additifs et multiplicatifs, dont la séquence du livret réutilise le sens des opérations ; les égalités à trou "
      + "après les procédures de calcul mental qu'elles mobilisent ; les suites en fin d'année.", { "algebre-cm1": 3, "egalites-programmes-cm1": 4, "suites-cm1": 5 }),
    ...ligne("en fin d'année, quand la multiplication et la division sont sûres : reconnaître la proportionnalité et l'utiliser une fois ; "
      + "et les problèmes à chercher, qui demandent d'organiser sa recherche.", { "proportionnalite-cm1": 5, "denombrer-optimiser-cm1": 5 }),
    ...ligne("les angles dès la rentrée, qui ne demandent aucun calcul ; l'heure et les durées ensuite ; les longueurs et le périmètre avec "
      + "l'écriture à virgule de la période 3, qui code les sous-multiples du mètre ; puis les masses, les contenances et les aires.",
    { "angles-cm1": 1, "heure-durees-cm1": 2, "longueurs-cm1": 3, "perimetre-cm1": 3, "masses-cm1": 4, "contenances-cm1": 5, "aires-cm1": 5 }),
    ...ligne("les droites et les solides dès la rentrée ; les déplacements ensuite ; les figures usuelles et le patron du cube quand les "
      + "droites perpendiculaires et parallèles sont sûres ; le cercle et les constructions, qui les réunissent ; la symétrie et les "
      + "assemblages de cubes en fin d'année.",
    { "droites-cm1": 1, "solides-cm1": 1, "deplacements-cm1": 2, "figures-cm1": 3, "patrons-cube-cm1": 3, "cercle-cm1": 4, "constructions-cm1": 4, "symetrie-cm1": 5, "assemblages-cubes-cm1": 5 }),
    ...ligne("les données en période 4, quand les grands nombres permettent de graduer les axes ; les probabilités en fin d'année, après la "
      + "moitié et les fractions, qui justifient « une chance sur deux ».", { "donnees-cm1": 4, "probabilites-cm1": 5 }),
    ...ligne("la lecture fluide et la compréhension dès la rentrée — le programme veut qu'on lise et qu'on comprenne chaque jour — ; les œuvres "
      + "aussi, pour en lire sept dans l'année ; la lecture à voix haute préparée ensuite, quand la mesure de la fluidité a donné ses repères ; "
      + "les documents au milieu de l'année, avec la géographie et les sciences.",
    { "fluence-cm1": 1, "comprendre-cm1": 1, "oeuvre-cm1": 1, "voix-haute-cm1": 2, "documents-cm1": 3 }),
    ...ligne("la copie, les écrits de travail et l'écriture quotidienne dès la rentrée — le programme veut qu'on écrive tous les jours — ; "
      + "raconter et expliquer ensuite ; le brouillon, la cohérence et la révision quand les premiers écrits longs sont là.",
    { "copie-cm1": 1, "ecrits-travail-cm1": 1, "ecrire-chaque-jour-cm1": 1, "raconter-expliquer-cm1": 2, "reviser-cm1": 3 }),
    ...ligne("la phrase, ses types et ses formes, puis le verbe et son sujet dès la rentrée ; les compléments ensuite ; les classes de mots "
      + "et le groupe nominal au milieu de l'année, avant la chaîne d'accords ; l'accord du sujet et du verbe avec celui du participe "
      + "passé, une fois le passé composé étudié. La conjugaison suit l'année : le présent, l'imparfait et le futur d'abord, le passé "
      + "composé ensuite, les verbes dont le radical change en fin d'année.",
    { "phrase-types-cm1": 1, "verbe-sujet-cm1": 1, "complements-cm1": 2, "present-imparfait-futur-cm1": 2, "classes-mots-cm1": 3, "groupe-nominal-cm1": 3,
      "accords-gn-cm1": 4, "passe-compose-cm1": 4, "accord-sujet-verbe-cm1": 5, "radical-cm1": 5 }),
  },
  CM2: {
    ...ligne("après les millions, qui viennent en période 3 : les comparer, les ranger, les placer.", { "comparer-nombres-cm2": 4 }),
    ...ligne("estimer dès la rentrée, pour contrôler les calculs de l'année ; multiplier les décimaux, rencontrés dès la période 1, "
      + "puis les diviser.", { "estimer-calculer-cm2": 1, "multiplication-decimal-cm2": 2, "division-decimale-cm2": 3 }),
    ...ligne("dès la rentrée, pour les fractions : le programme renforce diviseurs et multiples « en vue de leur utilisation lors de travaux "
      + "sur les fractions ».", { "multiples-diviseurs-cm2": 1 }),
    ...ligne("après les écritures et la comparaison des fractions de la période 1 : les additionner et les soustraire, la séquence du livret ; "
      + "puis le produit d'un entier et d'une fraction.", { "operer-fractions-cm2": 2, "produit-fraction-cm2": 3 }),
    ...ligne("après les écritures des décimaux jusqu'aux millièmes, rencontrés dès la période 1 : placer, comparer, arrondir.",
      { "comparer-decimaux-cm2": 2 }),
    ...ligne("dès la rentrée, des problèmes additifs dans la continuité du CM1 ; les multiplicatifs avec la multiplication des décimaux ; "
      + "puis les problèmes mixtes.", { "problemes-additifs-cm2": 1, "problemes-multiplicatifs-cm2": 2, "problemes-mixtes-cm2": 3 }),
    ...ligne("les égalités à trou et les programmes de calcul tôt dans l'année, avec le calcul mental ; les problèmes algébriques après les "
      + "problèmes multiplicatifs ; les suites en fin d'année.", { "egalites-programmes-cm2": 2, "algebre-cm2": 3, "suites-cm2": 5 }),
    ...ligne("après les problèmes multiplicatifs et mixtes, la séquence du livret, qui réactive d'abord ce qu'on a fait au CM1 ; et les "
      + "recherches de toutes les solutions en fin d'année, avant les algorithmes de sixième.", { "proportionnalite-cm2": 4, "chercher-cm2": 5 }),
    ...ligne("les durées à la seconde tôt dans l'année ; les angles et le degré au printemps ; les unités d'aire et l'aire du rectangle "
      + "en fin d'année, quand la multiplication des décimaux est sûre.", { "heure-durees-cm2": 2, "angles-cm2": 4, "aires-cm2": 5 }),
    ...ligne("les droites et les solides dès la rentrée ; les figures et les patrons ensuite ; le cercle et les constructions, qui les "
      + "réunissent ; la symétrie et les déplacements au printemps ; les assemblages et leurs vues en fin d'année.",
    { "droites-cm2": 1, "solides-cm2": 1, "figures-cm2": 2, "patrons-cm2": 2, "cercle-cm2": 3, "constructions-cm2": 3, "symetrie-cm2": 4, "deplacements-cm2": 4, "assemblages-cubes-cm2": 5 }),
    ...ligne("les données au milieu de l'année, avec les fractions qui font lire un diagramme circulaire.", { "donnees-cm2": 3 }),
    ...ligne("la lecture fluide et la compréhension dès la rentrée — le programme veut qu'on lise et qu'on comprenne chaque jour — ; les œuvres "
      + "aussi, pour en lire sept dans l'année ; la mise en voix ensuite ; les documents composites et rapprochés au milieu de l'année, avec "
      + "l'histoire, la géographie et les sciences.",
    { "fluence-cm2": 1, "comprendre-cm2": 1, "oeuvre-cm2": 1, "voix-haute-cm2": 2, "documents-cm2": 3 }),
    ...ligne("la copie, les écrits de travail et l'écriture quotidienne dès la rentrée — le programme veut qu'on écrive tous les jours — ; "
      + "décrire et dialoguer ensuite ; le brouillon, la cohérence et la révision quand les récits s'allongent.",
    { "copie-cm2": 1, "ecrits-travail-cm2": 1, "ecrire-chaque-jour-cm2": 1, "decrire-dialoguer-cm2": 2, "reviser-cm2": 3 }),
    ...ligne("consolider à la rentrée la phrase et le sujet, même inversé ; les compléments et l'attribut ensuite, puis le groupe nominal "
      + "et les accords qu'ils commandent ; les conjonctions de subordination et la phrase complexe en fin d'année, avant la "
      + "proposition de sixième. Le passé simple tôt, pour les récits lus ; les temps composés et l'accord du participe passé ensuite ; "
      + "les radicaux en fin d'année.",
    { "phrase-types-cm2": 1, "sujet-inverse-cm2": 1, "complements-cm2": 2, "passe-simple-cm2": 2, "groupe-nominal-cm2": 3, "accords-gn-cm2": 3,
      "accord-sujet-verbe-cm2": 3, "temps-composes-cm2": 4, "classes-mots-cm2": 4, "phrase-complexe-cm2": 5, "radical-cm2": 5 }),
  },
};

/** La période que Maitrize propose à une séquence qu'aucun texte ne date, et pourquoi ; rien pour les autres. */
export const periodeProposee = (demarcheId: string, classe: Classe): PeriodeProposee | null => PERIODES_PROPOSEES[classe]?.[demarcheId] ?? null;
