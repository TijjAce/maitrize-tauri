// ── Le matériel de la classe : ce que le papier ne remplace pas ───────────
//
// Fabriquer imprime beaucoup de matériel : des cubes à découper, des pièces
// et des billets « pour jouer », des horloges à lire, des balances dessinées.
// Mais une balance dessinée ne pèse rien, un sablier imprimé ne coule pas, et
// le courant ne passe pas sur une feuille. Les programmes le disent eux-mêmes
// en nommant les objets — « en les soupesant ou en utilisant une balance »,
// « un thermomètre à liquide », « un verre gradué », « en manipulant un globe
// terrestre ».
//
// Ce catalogue rassemble le matériel réel que les textes officiels nomment,
// avec ce qu'on en fait, ce que le papier ne peut pas en imiter, et ce que
// Fabriquer en imprime quand une version papier aide. Il se rattache aux
// compétences par les mots de leur intitulé, et aux ateliers qui s'en servent.
// L'enseignant y coche ce que sa classe possède, et dit où c'est rangé : les
// séances le rappellent — « à sortir », ou « à se procurer ».

export type FamilleMateriel = "nombres" | "grandeurs" | "geometrie" | "temps" | "sciences" | "monde" | "arts" | "viePratique" | "sens" | "ecrit";

export const FAMILLES_MATERIEL: { id: FamilleMateriel; libelle: string }[] = [
  { id: "nombres", libelle: "Nombres et calcul" },
  { id: "grandeurs", libelle: "Grandeurs et mesures" },
  { id: "geometrie", libelle: "Espace et géométrie" },
  { id: "temps", libelle: "Le temps" },
  { id: "sciences", libelle: "Sciences et technologie" },
  { id: "monde", libelle: "Se repérer dans le monde" },
  { id: "arts", libelle: "Arts, corps et matière" },
  { id: "viePratique", libelle: "Vie pratique et motricité fine" },
  { id: "sens", libelle: "Les sens" },
  { id: "ecrit", libelle: "Tracer et écrire" },
];

export interface MaterielReel {
  id: string;
  /** Ce qu'il faut avoir en classe. */
  nom: string;
  famille: FamilleMateriel;
  /** Ce qu'on en fait. */
  usage: string;
  /** Pourquoi le papier ne le remplace pas ; vide quand une feuille peut en tenir lieu. */
  irremplacable: string;
  /** Ce que Fabriquer en imprime, quand une version papier aide : l'atelier, et ce qu'il fait. */
  imprime?: { atelier: string; quoi: string };
  /** Les ateliers de Fabriquer qui s'en servent. */
  ateliers: string[];
  /** Les compétences qui l'appellent, par les mots de leur intitulé (sans accents, en minuscules). */
  appel: RegExp;
  /** Le domaine où ces mots valent, quand ils diraient autre chose ailleurs. */
  domaine?: RegExp;
  /** Le texte officiel qui le nomme. */
  source: string;
}

const MATHS_C2 = "Programme de mathématiques du cycle 2 (BO n° 41 du 31 octobre 2024)";
const SCIENCES_C2 = "Programme de sciences et technologie du cycle 2 (BO n° 24 du 11 juin 2026)";
const HG_C2 = "Programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)";
const MATERNELLE = "Programme de l'école maternelle (2025)";
const GUIDE_CP = "Éduscol, « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (2021)";
/**
 * Les ateliers de manipulation de cycle 1 que l'enseignant a donnés (4 novembre 2026, « rajoute le matériel présent dans
 * ce pdf ») : une cinquantaine d'ateliers, chacun avec son matériel, sa consigne, ses objectifs. Le matériel est regroupé
 * ici par geste ; les ateliers deviennent les séances de petite section (voir demarchesAteliersPS.ts).
 */
const SAVOIE = "Amandine Frison, PEMF, école de Villette, « Exemples d'ateliers de manipulation de type Montessori — maternelle » (DSDEN de la Savoie)";
const OBJETS = /objets|matiere|monde/;

// Les domaines où les mots d'un appel valent : « solides » parle de géométrie
// en mathématiques, et de l'eau en sciences.
const SCIENCES = /science|vivant|matiere|objets/;
const MATHS = /math/;
const MESURES = /math|science/;

export const MATERIEL_REEL: MaterielReel[] = [
  // ── Nombres et calcul ──
  {
    id: "numeration", famille: "nombres",
    nom: "Des cubes emboîtables, des bûchettes et des élastiques, des jetons, des boîtes de dix",
    usage: "Dénombrer, grouper par dix, composer et décomposer : on manipule et on dit ce qu'on fait avant d'écrire.",
    irremplacable: "",
    imprime: { atelier: "cubes", quoi: "les barres de dix et les cubes à découper, et les feuilles qui les font lire" },
    ateliers: ["cubes", "billes", "abaque", "nombres", "comparer", "martiniere", "numeration", "soustractionPosee"],
    appel: /denombr|collection|groupe(r|ment)s?\b.*dix|dizaine|composer (et|ou) decomposer|decompos(er|ition)s? de nombres|quantite/,
    domaine: MATHS,
    source: `${GUIDE_CP} : « l'utilisation et la manipulation de supports adaptés (cubes, frise numérique, cartes à points, etc.) » ; ${MATERNELLE} : « Manipuler et verbaliser des compositions et des décompositions de nombres ».`,
  },
  {
    id: "abaque", famille: "nombres",
    nom: "Un abaque triangulaire : dix tiges de un à dix anneaux, en escalier",
    usage: "Compter jusqu'à dix, voir qu'on passe d'un nombre au suivant en ajoutant un anneau, ranger et comparer les quantités.",
    irremplacable: "Les anneaux s'enfilent un à un : la main compte avec la voix, et l'escalier des nombres se construit sous les yeux. La feuille ne montre que l'escalier déjà fait.",
    ateliers: ["nombres", "collections", "comparer"],
    appel: /suite orale des nombres|ajoutant un au nombre precedent/,
    domaine: MATHS,
    source: `${MATERNELLE} : « Comprendre que dans la suite orale des nombres, chaque nombre s'obtient en ajoutant un au nombre précédent ».`,
  },
  {
    id: "boulier", famille: "nombres",
    nom: "Un boulier : des tiges de dix perles, cinq d'une couleur et cinq d'une autre",
    usage: "Montrer un nombre d'un geste, le lire d'un coup d'œil par cinq et par dix, calculer en faisant glisser les perles : compléments à la dizaine, doubles et moitiés, passage de la dizaine.",
    irremplacable: "Les perles glissent : on ajoute et on retire sans rien effacer, et le nombre se lit par cinq et par dix sans compter. Une feuille ne bouge pas.",
    ateliers: ["martiniere", "calcul", "cubes", "comparer", "soustractionPosee"],
    appel: /diverses representations d.un nombre|complement d.un nombre a la dizaine|doubles et les moities/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Connaitre et utiliser diverses représentations d'un nombre et passer de l'une à l'autre » ; « Trouver le complément d'un nombre à la dizaine supérieure » ; « Connaitre les doubles et les moitiés de nombres usuels ».`,
  },
  {
    id: "monnaie", famille: "nombres",
    nom: "Des pièces et des billets factices, une caisse, des étiquettes de prix",
    usage: "Simuler des achats, constituer une somme, comparer deux porte-monnaie, rendre la monnaie.",
    irremplacable: "",
    imprime: { atelier: "monnaie", quoi: "des pièces et des billets « pour jouer » à découper" },
    ateliers: ["monnaie"],
    appel: /monnaie|pieces? et (de )?billets|pieces? de monnaie|en euros?\b|achats?\b/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Simuler des achats en manipulant des pièces et des billets fictifs. Rendre la monnaie » (CP).`,
  },
  // ── Grandeurs et mesures ──
  {
    id: "balance", famille: "grandeurs",
    nom: "Une balance à plateaux et des masses marquées",
    usage: "Comparer deux objets en les soupesant, puis départager avec la balance ; équilibrer avec des masses marquées pour mesurer.",
    irremplacable: "Le papier ne pèse rien : soupeser, équilibrer, peser demandent de vrais objets et une vraie balance. Les balances dessinées de Fabriquer exercent seulement à lire une pesée.",
    imprime: { atelier: "mesures", quoi: "des balances dessinées à lire, après la pesée" },
    ateliers: ["mesures"],
    appel: /\bmasses?\b|\bpeser\b|soupes|plus lourd|plus leger|\bbalance\b/,
    source: `${MATHS_C2} : « en les soupesant ou en utilisant une balance pour les peser » (CE1) ; ${SCIENCES_C2} : « Mesurer les masses des objets avec une balance » (CE1) ; ${MATERNELLE} : « Comparer les masses de deux objets » (MS).`,
  },
  {
    id: "massesReference", famille: "grandeurs",
    nom: "Des objets du quotidien à soupeser : un paquet d'un kilo, une plaquette de 250 g, une pomme…",
    usage: "Se faire une idée de ce que pèsent 1 kg, 500 g, 100 g, pour estimer la masse d'un objet.",
    irremplacable: "Une masse se sent dans la main : aucune image ne la donne.",
    ateliers: ["mesures"],
    appel: /masses? de reference|estimer la masse/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Disposer de quelques masses de référence. Estimer la masse d'objets du quotidien en gramme ou en kilogramme » (CE1).`,
  },
  {
    id: "longueurs", famille: "grandeurs",
    nom: "Des objets à comparer en longueur : baguettes, bandes, ficelles, crayons ; des barres rouges de 10 cm à 1 m, des bûchettes et des pailles coupées",
    usage: "Comparer directement, ranger, produire un objet de même longueur, puis comparer à l'aide d'un intermédiaire.",
    irremplacable: "",
    imprime: { atelier: "mesures", quoi: "des bandes et des segments à comparer" },
    ateliers: ["mesures"],
    appel: /comparer (directement |indirectement )?des (longueurs|segments)|selon (leur|sa) longueur|objets? rect.?lignes?|de meme longueur qu/,
    domaine: MATHS,
    source: `${MATERNELLE} : « Comparer directement des longueurs d'objets rectilignes » (MS) ; ${MATHS_C2} : « Comparer des objets selon leur longueur » (CP) ; ${SAVOIE} : les barres, les bûchettes et les pailles à ranger de la plus petite à la plus grande.`,
  },
  {
    id: "regles", famille: "grandeurs",
    nom: "Des règles graduées, un double-mètre, un mètre de couturière",
    usage: "Mesurer un segment ou un objet, tracer un segment de longueur donnée, se donner des longueurs de référence (1 m, 10 cm).",
    irremplacable: "Une règle imprimée change d'échelle à la photocopie : pour mesurer, une vraie règle graduée.",
    imprime: { atelier: "mesures", quoi: "des segments à leur taille réelle, à mesurer et à tracer" },
    ateliers: ["mesures", "geometrie"],
    appel: /regle graduee|mesurer (la longueur|des longueurs)|longueurs? de reference|\bmetres?\b(?! carres?)|centimetres?\b(?! carres?)|tracer un segment|perimetre|distance/,
    domaine: MESURES,
    source: `${MATHS_C2} : « Savoir mesurer la longueur d'un segment en utilisant une règle graduée » (CP) ; « Disposer de quelques longueurs de référence » (CE2).`,
  },
  {
    id: "recipients", famille: "grandeurs",
    nom: "Des récipients : verres gradués, bouteilles d'un litre et d'un demi-litre, pichets, entonnoir — et de l'eau ou du sable",
    usage: "Transvaser pour comparer des contenances, mesurer un volume de liquide.",
    irremplacable: "Le papier ne contient rien : transvaser demande des récipients et de l'eau.",
    imprime: { atelier: "mesures", quoi: "des verres dessinés à lire, après le transvasement" },
    ateliers: ["mesures"],
    appel: /contenance|volumes? de liquide|verre gradue|\blitres?\b|recipient/,
    domaine: MESURES,
    source: `${SCIENCES_C2} : « Comparer des volumes de liquide en utilisant un verre gradué ou en utilisant un récipient de contenance connue comme une bouteille d'un litre ou d'un demi-litre » (CE2) ; ${MATHS_C2} : « Comparer les contenances de différents objets » (CE2).`,
  },
  {
    id: "croissance", famille: "grandeurs",
    nom: "Une toise ou un mètre ruban au mur, un pèse-personne",
    usage: "Suivre la croissance de chacun : la taille, la masse, la pointure, mesurées et notées au fil de l'année.",
    irremplacable: "On ne se mesure pas sur une feuille : il faut de vrais instruments.",
    ateliers: [],
    appel: /croissance du corps|croissance de differentes personnes|a sa croissance|pointure|instruments de mesure pour suivre/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Utiliser des instruments de mesure pour suivre la croissance du corps » ; « (taille, masse, pointure) » (CE1).`,
  },
  // ── Espace et géométrie ──
  {
    id: "solides", famille: "geometrie",
    nom: "Des solides en bois ou en plastique — cube, pavé, boule, cylindre, cône, pyramide — et un sac à toucher",
    usage: "Reconnaître, nommer, trier les solides, compter faces, sommets et arêtes, les reconnaître au toucher.",
    irremplacable: "Un solide se prend en main et se fait rouler : une image n'en montre jamais toutes les faces.",
    imprime: { atelier: "solides", quoi: "les solides en perspective, les faces à découper et les patrons du cube" },
    ateliers: ["solides"],
    appel: /solides?\b|\bcubes?\b.*pave|pave|boule|cylindre|\bcone\b|pyramide/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Reconnaitre les solides usuels suivants : cube, boule, cône, cylindre, pavé » (CP) ; ${MATERNELLE} : « Reconnaitre et classer des solides » (MS).`,
  },
  {
    id: "construction", famille: "geometrie",
    nom: "Des jeux de construction : cubes emboîtables, briques, planchettes",
    usage: "Construire des cubes et des pavés, reproduire un assemblage d'après un modèle ou une photo.",
    irremplacable: "Un assemblage se construit en volume : la feuille ne donne que le modèle à reproduire.",
    imprime: { atelier: "solides", quoi: "des assemblages de cubes à reproduire" },
    ateliers: ["solides"],
    appel: /assemblages? de (solides|cubes|pieces)|construire (des cubes|un cube|un pave)|constructions? (simples )?(a partir de |de )pieces/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Construire et reproduire des assemblages de solides à partir d'un modèle en trois dimensions ou de représentations planes » (CP) ; ${MATERNELLE} : « Réaliser des constructions simples à partir de pièces solides » (PS).`,
  },
  {
    id: "instrumentsTrace", famille: "geometrie",
    nom: "Des équerres, des compas, des règles",
    usage: "Vérifier un alignement, un angle droit, tracer un cercle, reporter une longueur avec le compas.",
    irremplacable: "Un compas, une équerre se manipulent : la feuille n'en donne que le dessin. Seul le gabarit d'angle droit se plie dans une feuille.",
    imprime: { atelier: "geometrie", quoi: "des figures à reproduire et à vérifier" },
    ateliers: ["geometrie"],
    appel: /equerre|compas|angles? droits?|alignement|cercle/,
    domaine: MATHS,
    source: `${MATHS_C2} : « Utiliser la règle graduée, l'équerre et le compas comme instruments de tracé » (CE1).`,
  },
  {
    id: "robot", famille: "geometrie",
    nom: "Un robot de sol programmable, et un quadrillage au sol",
    usage: "Programmer un déplacement avec des consignes simples — avancer, tourner, reculer — et voir le robot l'exécuter.",
    irremplacable: "Un robot fait ce qu'on a programmé, et seulement cela : c'est ce qui fait voir l'erreur. À défaut, un camarade joue le robot sur un quadrillage au sol.",
    imprime: { atelier: "deplacements", quoi: "les quadrillages, les flèches et les codes à suivre ou à corriger" },
    ateliers: ["deplacements"],
    appel: /robot|programm(er|ant) un deplacement|deplacements? sur (un )?quadrillage/,
    domaine: /science|math|espace/,
    source: `${SCIENCES_C2} : « Commander un robot avec des consignes simples en programmant un déplacement » (CE1).`,
  },
  // ── Le temps ──
  {
    id: "horloge", famille: "temps",
    nom: "Une horloge à aiguilles au mur, et des horloges d'apprentissage aux aiguilles mobiles",
    usage: "Lire l'heure, placer les aiguilles, voir une durée s'écouler entre deux instants.",
    irremplacable: "Une horloge dessinée ne tourne pas : voir le temps passer demande une vraie horloge.",
    imprime: { atelier: "heure", quoi: "des horloges à lire et des cadrans où dessiner les aiguilles" },
    ateliers: ["heure"],
    appel: /horloge|lire l.heure|aiguilles/,
    source: `${MATHS_C2} : « Lire sur une horloge à aiguilles une heure donnée en heures entières » ; « Positionner les aiguilles d'une horloge » (CP).`,
  },
  {
    id: "durees", famille: "temps",
    nom: "Un sablier, un minuteur, un chronomètre, une montre, un réveil",
    usage: "Éprouver des durées — trois minutes de sablier, une minute de silence — et comparer les outils qui mesurent le temps.",
    irremplacable: "Une durée se vit : un sablier qui coule, un minuteur qui sonne.",
    ateliers: ["heure", "frise"],
    appel: /sablier|pendule|\bmontre\b|reveil|chronom|minuteur|\bdurees?\b/,
    domaine: /math|histoire|geographie|temps|science/,
    source: `${HG_C2} : « Observer et utiliser des outils de mesure du temps : sablier, pendule, montre et réveil (analogiques et numériques) » (CP) ; ${MATHS_C2} : « Comparer, estimer, mesurer des durées » (CE2).`,
  },
  {
    id: "calendrier", famille: "temps",
    nom: "Un calendrier mural, un éphéméride, la roue des jours",
    usage: "Se repérer chaque jour — la date, la semaine, le mois — et y placer les événements de la classe.",
    irremplacable: "",
    imprime: { atelier: "frise", quoi: "le calendrier du mois, la roue des jours, la semaine, l'année" },
    ateliers: ["frise"],
    appel: /calendrier|ephemeride|roue des jours|jours de la semaine|mois de l.annee/,
    source: `${HG_C2} : « Utiliser divers types de calendriers : emploi du temps de la journée, éphéméride, calendrier, roue des jours » (CP).`,
  },
  // ── Sciences et technologie ──
  {
    id: "thermometre", famille: "sciences",
    nom: "Un thermomètre à liquide, dans la classe et dehors",
    usage: "Lire la température chaque jour, comparer le dedans et le dehors, suivre l'eau qui gèle et qui fond.",
    irremplacable: "Un thermomètre dessiné ne monte pas : la température se lit sur un vrai.",
    ateliers: [],
    appel: /thermometre|temperature/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Lire la valeur de la température avec un thermomètre à liquide » (CP).`,
  },
  {
    id: "eau", famille: "sciences",
    nom: "De l'eau, des glaçons, des récipients transparents, du sel, du sucre, des objets qui flottent ou coulent",
    usage: "Faire geler et fondre, dissoudre, faire flotter ou couler : voir l'eau changer d'état.",
    irremplacable: "Un glaçon qui fond ne s'imprime pas.",
    ateliers: [],
    appel: /de l.eau|etats? (physiques?|solides?|liquides?)|solidification|fusion|dissou|flott|des solides et des liquides|volumes? d(e |.un )liquide|melange/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Observer le changement d'état physique de l'eau (solide et liquide) et sa réversibilité » (CE1) ; ${MATERNELLE} : « Découvrir et observer la fusion et la solidification de l'eau » (PS).`,
  },
  {
    id: "circuit", famille: "sciences",
    nom: "Des piles, des ampoules sur douille, des interrupteurs, des fils",
    usage: "Réaliser un circuit à une boucle, voir la lampe s'allumer quand il se ferme.",
    irremplacable: "Le courant ne passe pas sur le papier : il faut fermer un vrai circuit.",
    ateliers: [],
    appel: /circuit|electri|ampoule|\bpiles?\b|interrupteur/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Réaliser un circuit électrique à une boucle associant un générateur (pile), un interrupteur, un récepteur (ampoule) » (CE1).`,
  },
  {
    id: "vivant", famille: "sciences",
    nom: "Des loupes et des boîtes-loupes, des graines, du terreau et des pots, un élevage",
    usage: "Observer le vivant, le faire pousser, suivre son développement au fil des semaines.",
    irremplacable: "Le vivant s'observe vivant : une graine qui germe, un escargot qui avance.",
    ateliers: [],
    appel: /plantes?\b|graines?|germ|animal|animaux|vivant|elevage/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} (le vivant) ; ${MATERNELLE} (explorer le monde du vivant).`,
  },
  {
    id: "corps", famille: "sciences",
    nom: "Un squelette articulé ou une maquette du bras — et le corps des élèves",
    usage: "Repérer les os, les articulations, les muscles qui permettent un mouvement.",
    irremplacable: "",
    ateliers: [],
    appel: /maquette simple|squelette|articulations?|mouvement corporel/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Repérer sur soi et sur une maquette simple les éléments permettant la réalisation d'un mouvement corporel » (CP).`,
  },
  {
    id: "aimants", famille: "sciences",
    nom: "Des aimants, et des objets en métal et en d'autres matières ; des bâtonnets aimantés et leurs billes de métal",
    usage: "Chercher ce que l'aimant attire, s'en servir pour fabriquer un objet qui répond à un besoin.",
    irremplacable: "Un aimant attire, une image non.",
    ateliers: [],
    appel: /magnetisme|aimants?/,
    domaine: SCIENCES,
    source: `${MATERNELLE} : « Fabriquer un objet en réponse à un besoin en exploitant des propriétés de matériaux ou des phénomènes physiques (équilibre, magnétisme…) » (GS) ; ${SAVOIE} : créer des figures avec des bâtonnets aimantés.`,
  },
  {
    id: "objetsTechniques", famille: "sciences",
    nom: "Des objets techniques à démonter et à remonter, des jeux d'assemblage",
    usage: "Identifier les pièces d'un objet, comprendre comment elles s'assemblent, en réaliser des assemblages simples.",
    irremplacable: "Un objet se démonte pièce à pièce : le schéma vient après.",
    ateliers: [],
    appel: /objets? techniques?|assemblages? simples|pieces d.un objet/,
    domaine: SCIENCES,
    source: `${SCIENCES_C2} : « Identifier les différentes pièces d'un objet technique en réalisant des assemblages simples » (CE2).`,
  },
  // ── Se repérer dans le monde ──
  {
    id: "globe", famille: "monde",
    nom: "Un globe terrestre et une lampe de poche",
    usage: "Faire tourner la Terre devant la lampe : le jour, la nuit ; suivre les océans et les continents tout autour.",
    irremplacable: "Le jour et la nuit se comprennent en tournant un globe devant une lampe ; un planisphère aplatit la Terre.",
    ateliers: [],
    appel: /globe|jour et (de )?la nuit|continents?|oceans?/,
    source: `${HG_C2} : « Expliquer l'alternance du jour et de la nuit en manipulant un globe terrestre » ; « identifier les continents par la manipulation d'un globe terrestre / le planisphère » (CP).`,
  },
  {
    id: "cartes", famille: "monde",
    nom: "Un planisphère au mur, des cartes, le plan de l'école",
    usage: "Situer la classe, l'école, la ville, le pays ; passer du globe au planisphère.",
    irremplacable: "",
    imprime: { atelier: "planClasse", quoi: "le plan de la classe, à lire et à compléter" },
    ateliers: ["planClasse", "paysage"],
    appel: /planisphere|\bcartes?\b|\bplans?\b/,
    domaine: /geographie|espace|monde/,
    source: `${HG_C2} (des représentations du monde) ; ${MATERNELLE} : « Reconnaitre quelques espaces géographiques sur un planisphère » (GS).`,
  },
  // ── Arts, corps et matière ──
  {
    id: "musique", famille: "arts",
    nom: "Des instruments de percussion — tambourins, maracas, claves, xylophone — et des objets sonores",
    usage: "Explorer les sons, en produire, créer un paysage sonore.",
    irremplacable: "Un son se produit, il ne s'imprime pas.",
    ateliers: [],
    appel: /instruments?\b|sonores?|produire des sons/,
    domaine: /musi|sonore|artisti/,
    source: `${MATERNELLE} : « Produire des sons à partir de son corps, d'objets et d'instruments » (MS).`,
  },
  {
    id: "matieres", famille: "arts",
    nom: "Des matériaux à toucher et à transformer — pâte à modeler, argile, papier, tissu, bois — et des outils",
    usage: "Reconnaître et comparer des matériaux, les transformer avec les mains ou des outils, fabriquer un objet.",
    irremplacable: "Une matière se touche et se transforme : la feuille ne la montre qu'en image.",
    ateliers: [],
    appel: /materiaux|materiau|fabriquer un objet|outils? ou des objets/,
    domaine: /matiere|objets|artisti/,
    source: `${MATERNELLE} : « Reconnaitre et comparer des matériaux usuels à partir de perceptions sensorielles » (PS) ; « Expérimenter la diversité des outils, des supports, des matériaux » (MS).`,
  },
  {
    id: "motricite", famille: "arts",
    nom: "Du matériel de motricité : ballons, cerceaux, plots, tapis, bancs",
    usage: "Lancer, se déplacer, s'équilibrer, manipuler des objets volumineux.",
    irremplacable: "Le corps apprend en bougeant.",
    ateliers: [],
    appel: /lancer|equilibres?|objets volumineux|se deplacer|deplacements? varies/,
    domaine: /physique|sportive/,
    source: `${MATERNELLE} : « Manipuler et lancer des objets avec des intentions motrices différentes » (PS) ; « Développer de nouveaux équilibres » (PS).`,
  },
  // ── Vie pratique et motricité fine : les ateliers de manipulation de cycle 1 ──
  {
    id: "transvasement", famille: "viePratique",
    nom: "Des carafes et des verres marqués d'un trait, des seringues, un entonnoir, des pipettes, de l'eau colorée et une éponge",
    usage: "Verser sans renverser et s'arrêter au trait, transvaser l'eau avec l'outil qui convient, déposer quelques gouttes ; éponger, puis ranger le plateau.",
    irremplacable: "L'eau se verse, déborde et s'éponge : une image ne coule pas.",
    ateliers: ["sequentiel"],
    appel: /quelques caracteristiques des solides et des liquides|transvas|verser de l.eau|outils ou des objets adaptes|risques lies a certains objets/,
    domaine: OBJETS,
    source: `${SAVOIE} : ateliers de vie pratique ; ${MATERNELLE} : « Transporter de l'eau, des grains, des objets, effectuer des transvasements, permet de ressentir le caractère pesant de la matière » (p. 60).`,
  },
  {
    id: "pinces", famille: "viePratique",
    nom: "Des pinces de toutes sortes — à escargots, à glace, à épiler, à linge —, des noix, des graines à trier, des boîtes à alvéoles et des bols de couleur",
    usage: "Saisir avec l'outil et poser un objet par case, trier des graines, accrocher les pinces à linge au bol de leur couleur. En petite section, de gros objets — des noix — plutôt que des graines, sous le regard de l'adulte.",
    irremplacable: "La main apprend à pincer en pinçant.",
    ateliers: ["sequentiel"],
    appel: /motricite fine|utiliser des objets, connaitre leur nom|outils ou des objets adaptes|risques lies a certains objets/,
    domaine: /ecrire|objets|matiere|monde/,
    source: `${SAVOIE} : ateliers de vie pratique et d'éducation sensorielle ; ${MATERNELLE} : « Participer aux activités de motricité générale, de motricité fine et aux exercices de graphismes » (avant 4 ans, p. 17), et le risque des « petits objets qui présentent des risques d'étouffement en cas d'ingestion » (p. 60).`,
  },
  {
    id: "fermetures", famille: "viePratique",
    nom: "Des bocaux et des flacons avec leur couvercle, des cadenas et leurs clés, des cadres d'habillage — fermeture éclair, boutons-pression, boutons —, des lacets à nouer, des vis, des boulons et leurs écrous",
    usage: "Ouvrir et fermer, visser et dévisser, trouver le couvercle ou la clé qui va, boutonner, nouer : les gestes des objets de tous les jours. Les vis et les écrous, plus petits, après la petite section.",
    irremplacable: "Un couvercle se visse, une clé tourne dans un cadenas : le geste ne s'apprend que sur l'objet.",
    ateliers: ["sequentiel"],
    appel: /utiliser des objets, connaitre leur nom|outils ou des objets adaptes|solution technique/,
    domaine: OBJETS,
    source: `${SAVOIE} : ateliers de vie pratique ; ${MATERNELLE} : « Utiliser des objets, connaitre leur nom et leur fonction » ; « remonter la fermeture éclair de son manteau » (avant 4 ans, p. 61).`,
  },
  {
    id: "enfilage", famille: "viePratique",
    nom: "Un tube en mousse et des élastiques, une grille et des chenilles, des trombones, des paires de chaussettes, des pinces à linge et un panier",
    usage: "Enfiler et faire glisser, passer dessus puis dessous les barreaux, accrocher des trombones, retrouver deux chaussettes pareilles et les accrocher ensemble.",
    irremplacable: "Enfiler, tisser, accrocher : ce sont des gestes de la main, sur de vrais objets.",
    ateliers: ["sequentiel"],
    appel: /motricite fine|outils ou des objets adaptes|solution technique/,
    domaine: /ecrire|langage|objets|matiere/,
    source: `${SAVOIE} : ateliers de vie pratique ; ${MATERNELLE} : « Participer aux activités de motricité générale, de motricité fine et aux exercices de graphismes » (avant 4 ans, p. 17).`,
  },
  {
    id: "decoupage", famille: "viePratique",
    nom: "Des ciseaux adaptés, des bandes de papier à découper — d'un coup, sur un trait, en rond —, de la colle, un taille-crayon et des crayons usagés",
    usage: "Découper une bande d'un coup de ciseaux, puis en suivant un trait ; coller ses formes comme on veut ; tailler un crayon au-dessus d'une barquette.",
    irremplacable: "Le papier se coupe et le crayon se taille : on apprend l'outil sur la matière.",
    ateliers: ["sequentiel"],
    appel: /transformations? de materiaux|actions mecaniques|risques lies a certains objets/,
    domaine: OBJETS,
    source: `${SAVOIE} : ateliers de vie pratique ; ${MATERNELLE} : « Repérer des transformations de matériaux sous l'effet d'actions mécaniques avec les mains ou avec des outils » ; « découper avec des ciseaux adaptés » (avant 4 ans, p. 61).`,
  },
  // ── Les sens ──
  {
    id: "toucher", famille: "sens",
    nom: "Des sacs à toucher et des objets en double, des tissus de textures variées, des ballons remplis de matières — graines, farine, gel — et leurs images",
    usage: "Retrouver par le toucher un objet caché, deux tissus pareils, ce que contient un ballon ; dire doux, rugueux, mou, dur.",
    irremplacable: "Doux, rugueux, mou : cela se sent au bout des doigts, pas sur une image.",
    imprime: { atelier: "imagier", quoi: "les images des objets et des matières, pour poser chaque ballon ou chaque sac sous la sienne" },
    ateliers: ["imagier"],
    appel: /sens utilises lors d.experiences sensorielles|perceptions sensorielles|par le toucher|nommer des organes sensoriels/,
    domaine: /vivant|matiere|objets|monde/,
    source: `${SAVOIE} : ateliers d'éducation sensorielle ; ${MATERNELLE} : « Découvrir les sens utilisés lors d'expériences sensorielles variées » ; « Identifier parmi d'autres un objet connu et caché dans un sac ou dans une boite par le toucher » (avant 4 ans, p. 60).`,
  },
  {
    id: "sonsOdeurs", famille: "sens",
    nom: "Des boîtes sonores et des boîtes à odeurs, par paires",
    usage: "Secouer et écouter, ou sentir, puis rassembler les deux boîtes qui font le même bruit ou qui ont la même odeur.",
    irremplacable: "Un son, une odeur ne s'impriment pas.",
    ateliers: [],
    appel: /sens utilises lors d.experiences sensorielles|possibilites sonores de son corps, d.objets|nommer des organes sensoriels/,
    domaine: /vivant|sonore|artisti|monde/,
    source: `${SAVOIE} : ateliers d'éducation sensorielle ; ${MATERNELLE} : « Manipuler et faire sonner des objets de différentes matières (pots, couvercles, bouteilles etc.) » (avant 4 ans, p. 31).`,
  },
  {
    id: "couleurs", famille: "sens",
    nom: "Un loto des couleurs, des planches de nuances et leurs pinces à linge, des bonshommes et leurs haltères de quatre couleurs, une boîte à compartiments et des images à trier",
    usage: "Associer et nommer les couleurs, puis leurs nuances ; trier des objets et des images dans la case de leur couleur.",
    irremplacable: "",
    imprime: { atelier: "afficheCouleurs", quoi: "l'affichage référent de chaque couleur, avec les choses de cette couleur" },
    ateliers: ["afficheCouleurs"],
    appel: /reconnaitre, trier et classer des objets|nommer des organes sensoriels/,
    domaine: /math|vivant/,
    source: `${SAVOIE} : ateliers d'éducation sensorielle ; ${MATERNELLE} : « Reconnaitre, trier et classer des objets selon leur forme » (p. 46) — le tri par la couleur vient d'abord.`,
  },
  // ── Tailles, formes et nombres ──
  {
    id: "taillesGigognes", famille: "grandeurs",
    nom: "Des cubes à empiler et à emboîter, des poupées gigognes, des pommes de trois tailles et leurs trois pommiers",
    usage: "Empiler du plus grand au plus petit, emboîter, ranger par taille, répartir en trois groupes : les grosses, les moyennes, les petites.",
    irremplacable: "Un gros cube ne tient pas sur un petit : la tour tombe, et l'on comprend. Un dessin ne tombe pas.",
    ateliers: ["mesures"],
    appel: /comparer des objets selon leur (longueur|taille)|selon leur taille|par ordre de taille|ordonner des objets rect.?lignes/,
    domaine: MATHS,
    source: `${SAVOIE} : ateliers d'éducation sensorielle et intellectuelle ; ${MATERNELLE} : « superposer trois briques par ordre décroissant de longueur afin de construire un escalier et de répartir des briques en trois groupes selon leur longueur » (avant 4 ans, p. 48).`,
  },
  {
    id: "formesModeles", famille: "geometrie",
    nom: "Des formes de couleur, des bâtonnets et des pions à poser d'après un modèle, un tangram et ses fiches",
    usage: "Faire pareil que le modèle : poser dessus, puis à côté ; reproduire un assemblage, l'organisation d'un petit ensemble d'objets dans l'espace.",
    irremplacable: "Les pièces se tournent, se retournent et se posent : la fiche ne donne que le modèle.",
    imprime: { atelier: "tangram", quoi: "les pièces et les modèles à reproduire" },
    ateliers: ["tangram", "motifs"],
    appel: /reproduire des assemblages|reproduire un motif|organisation dans l.espace/,
    domaine: MATHS,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Reproduire des assemblages de solides ou de formes planes » (avant 4 ans, p. 47).`,
  },
  {
    id: "blocsLogiques", famille: "geometrie",
    nom: "Des blocs logiques : des formes de tailles, de couleurs et d'épaisseurs différentes",
    usage: "Trier et classer selon la forme, la couleur, la taille ; en faire le contour au crayon et inventer un graphisme dedans.",
    irremplacable: "Une forme se reconnaît aussi au toucher, les yeux fermés.",
    ateliers: [],
    appel: /trier et classer des (objets|formes)|visuellement et tactilement/,
    domaine: MATHS,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Reconnaitre visuellement et tactilement des objets de même forme » (p. 46).`,
  },
  {
    id: "collectionsPinces", famille: "nombres",
    nom: "Un disque de collections — des coccinelles de 1 à 6 — et des pinces à linge portant les chiffres",
    usage: "Compter les coccinelles d'une case et y accrocher la pince du bon chiffre : jusqu'à trois en petite section, jusqu'à six ensuite.",
    irremplacable: "La pince s'accroche et se décroche : on essaie, on vérifie, on recommence.",
    ateliers: ["collections", "nombres"],
    appel: /associer une quantite, le nom d.un nombre et une ecriture chiffree/,
    domaine: MATHS,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Associer une quantité, le nom d'un nombre et une écriture chiffrée » (p. 38).`,
  },
  // ── Tracer et écrire ──
  {
    id: "tracerDoigt", famille: "ecrit",
    nom: "Un plateau de semoule, des pochettes de gel à tracer, de la pâte à modeler et un rouleau, des pistes graphiques plastifiées, un feutre effaçable et un chiffon, des tracettes",
    usage: "Laisser des traces du doigt et les effacer pour recommencer, tracer dans la pâte, suivre une piste sans en sortir, contourner une tracette.",
    irremplacable: "La trace s'efface d'un geste : on recommence sans gâcher de feuille, et le doigt sent le chemin.",
    imprime: { atelier: "repertoireGraphique", quoi: "les signes à reproduire, tracés en bande" },
    ateliers: ["repertoireGraphique"],
    appel: /motricite fine et aux exercices de graphismes|guider son geste par le regard|gestes et commencer a les associer|tracer des lettres capitales|ligature/,
    domaine: /ecrire|langage|artisti|visuels/,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Découvrir les traces produites par un geste particulier sur une feuille enduite de peinture ou dans du sable (caresser, tapoter, frotter, griffer, etc.) » (avant 4 ans, p. 28).`,
  },
  {
    id: "lettresMobiles", famille: "ecrit",
    nom: "Des lettres mobiles — en mousse, aimantées sur un support de métal, à encastrer —, des lettres douces à suivre du doigt, des roues des lettres et leurs pinces",
    usage: "Retrouver les lettres de son prénom et les poser sur son étiquette, suivre du doigt le sens du tracé, associer capitales, script et cursive.",
    irremplacable: "Une lettre qu'on tient se tourne et se compare ; une lettre douce se suit du doigt.",
    imprime: { atelier: "etiquettesPrenoms", quoi: "l'étiquette du prénom, en capitales, en script et en cursive" },
    ateliers: ["etiquettesPrenoms", "friseAlphabetique", "lettres"],
    appel: /lettres de son prenom|nom des lettres|correspondance entre les lettres|trois graphies|tracer des lettres capitales|graphies d.une meme lettre/,
    domaine: /lire|ecrire|langage/,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Reconnaitre et nommer certaines lettres de son prénom écrit en capitales » (p. 13).`,
  },
  {
    id: "marionnettesDoigts", famille: "ecrit",
    nom: "Des marionnettes à doigts",
    usage: "Faire vivre les personnages d'une comptine ou d'une histoire, chaque doigt bougeant seul.",
    irremplacable: "Les doigts animent les personnages : la motricité fine et le récit vont ensemble.",
    ateliers: [],
    appel: /comptines?\b|oralisation d.un court texte/,
    domaine: /langage|sonore|artisti/,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Dire ou chanter une comptine, en même temps que les professeurs et en reproduisant la gestuelle (Toc, toc, toc Monsieur Pouce ; Petit escargot) » (avant 4 ans, p. 31).`,
  },
  {
    id: "imagesSons", famille: "ecrit",
    nom: "Des cartes images, avec ou sans le son à entendre, et leur planche de correction",
    usage: "Ranger chaque image du côté où l'on entend le son, ou de l'autre ; vérifier seul avec la planche.",
    irremplacable: "",
    imprime: { atelier: "lotoPhonemesAttaque", quoi: "des images à trier selon le son qu'on entend" },
    ateliers: ["lotoPhonemesAttaque", "intrus"],
    appel: /identifier les sons de la langue|discriminer des (sons|phonemes)/,
    domaine: /lire|langage/,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « Identifier les sons de la langue, lors de situations d'écoute proposées par le professeur » (p. 12).`,
  },
  {
    id: "dessinsGuides", famille: "ecrit",
    nom: "Une ardoise blanche, son feutre, et des modèles de dessin pas à pas",
    usage: "Dessiner un animal en suivant, étape par étape, les traits du modèle.",
    irremplacable: "",
    ateliers: [],
    appel: /s.exercer au dessin/,
    domaine: /artisti|visuels/,
    source: `${SAVOIE} : ateliers d'éducation intellectuelle ; ${MATERNELLE} : « S'exercer au dessin pour développer son habileté motrice » (p. 27).`,
  },
];

/** Un texte tel que les appels le lisent : en minuscules, sans accents, les apostrophes droites. */
export const sansAccents = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’`]/g, "'");

/** Ce qu'une compétence dit d'elle-même : son intitulé, et son domaine. */
export interface CompetenceLue { texte: string; domaine?: string }

/** Le matériel réel qu'appellent ces compétences, dans l'ordre du catalogue. */
export function materielPourCompetences(competences: CompetenceLue[]): MaterielReel[] {
  const lues = competences.map((c) => ({ texte: sansAccents(c.texte), domaine: sansAccents(c.domaine ?? "") }));
  return MATERIEL_REEL.filter((m) => lues.some((c) => m.appel.test(c.texte) && (!m.domaine || !c.domaine || m.domaine.test(c.domaine))));
}

/** Ce que des compétences choisies disent d'elles-mêmes : leur intitulé, et leur domaine. */
export const competencesLues = (cs: { competenceTitre: string; domaineTitre?: string | null; sousDomaineTitre?: string | null }[]): CompetenceLue[] =>
  cs.map((c) => ({ texte: c.competenceTitre, domaine: [c.domaineTitre, c.sousDomaineTitre].filter(Boolean).join(" › ") }));

/** Le matériel réel dont se sert un atelier de Fabriquer. */
export const materielDeLAtelier = (atelier: string): MaterielReel[] =>
  MATERIEL_REEL.filter((m) => m.ateliers.includes(atelier) || m.imprime?.atelier === atelier);

// ── Ce que la classe possède ───────────────────────────────────────────────

/** Ce que la classe a, et où c'est rangé. */
export interface DansLaClasse { a: boolean; lieu: string }
export type Inventaire = Record<string, DansLaClasse>;

/** Où se garde l'inventaire — préfixe « fabriquer: », donc partagé entre les ordinateurs. */
export const CLE_INVENTAIRE = "fabriquer:materiel-classe";

/** Émis quand l'inventaire change : les notes ouvertes se relisent. */
export const EVT_INVENTAIRE = "maitrize:materiel-classe";

/** L'inventaire enregistré, tel qu'on peut s'y fier : les seuls identifiants du catalogue. */
export function lireInventaire(brut: string | null | undefined): Inventaire {
  if (!brut) return {};
  let lu: unknown;
  try { lu = JSON.parse(brut); } catch { return {}; }
  if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
  const connus = new Set(MATERIEL_REEL.map((m) => m.id));
  const sortie: Inventaire = {};
  for (const [id, v] of Object.entries(lu as Record<string, unknown>)) {
    if (!connus.has(id) || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    sortie[id] = { a: o.a === true, lieu: typeof o.lieu === "string" ? o.lieu.trim().slice(0, 120) : "" };
  }
  return sortie;
}

export const ecrireInventaire = (inv: Inventaire) => JSON.stringify(inv);

/** Le nom d'un matériel, en minuscule au début : il se lit dans une phrase. */
const enPhrase = (m: MaterielReel) => m.nom.charAt(0).toLowerCase() + m.nom.slice(1);

/**
 * La note du matériel réel que ces compétences appellent, l'inventaire de la
 * classe relu par `lire` : ce que les séances d'une séquence rappellent,
 * comme celles qu'on crée depuis une compétence. Vide sans matériel ; sans
 * inventaire lisible, tout est « à se procurer ».
 */
export async function noteDuMaterielDesCompetences(
  cs: { competenceTitre: string; domaineTitre?: string | null; sousDomaineTitre?: string | null }[], lire: (cle: string) => Promise<string | null>,
): Promise<string> {
  const materiel = materielPourCompetences(competencesLues(cs));
  if (!materiel.length) return "";
  let brut: string | null = null;
  try { brut = await lire(CLE_INVENTAIRE); } catch { /* l'inventaire ne se lit pas : on fait sans */ }
  return noteDuMaterielReel(materiel, lireInventaire(brut));
}

/**
 * La note d'une séance : le matériel réel à sortir — avec où il est rangé —,
 * et celui que la classe n'a pas encore, à se procurer, avec ce que le papier
 * n'en remplace pas. Vide sans matériel.
 */
export function noteDuMaterielReel(materiel: MaterielReel[], inv: Inventaire): string {
  if (!materiel.length) return "";
  const aSortir = materiel.filter((m) => inv[m.id]?.a);
  const aTrouver = materiel.filter((m) => !inv[m.id]?.a);
  const lignes: string[] = [];
  if (aSortir.length) {
    lignes.push(`Matériel de la classe à sortir : ${aSortir.map((m) => `${enPhrase(m)}${inv[m.id]?.lieu ? ` (${inv[m.id].lieu})` : ""}`).join(" ; ")}.`);
  }
  if (aTrouver.length) {
    const titre = aSortir.length ? "À se procurer" : "Matériel de la classe";
    lignes.push(`${titre} : ${aTrouver.map((m) => `${enPhrase(m)}${m.irremplacable ? " — le papier ne le remplace pas" : ""}`).join(" ; ")}.`);
  }
  return lignes.join("\n");
}
