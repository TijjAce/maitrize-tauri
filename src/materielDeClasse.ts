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

export type FamilleMateriel = "nombres" | "grandeurs" | "geometrie" | "temps" | "sciences" | "monde" | "arts";

export const FAMILLES_MATERIEL: { id: FamilleMateriel; libelle: string }[] = [
  { id: "nombres", libelle: "Nombres et calcul" },
  { id: "grandeurs", libelle: "Grandeurs et mesures" },
  { id: "geometrie", libelle: "Espace et géométrie" },
  { id: "temps", libelle: "Le temps" },
  { id: "sciences", libelle: "Sciences et technologie" },
  { id: "monde", libelle: "Se repérer dans le monde" },
  { id: "arts", libelle: "Arts, corps et matière" },
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
    ateliers: ["cubes", "nombres", "comparer", "martiniere", "numeration"],
    appel: /denombr|collection|groupe(r|ment)s?\b.*dix|dizaine|composer et decomposer|decompos(er|ition)s? de nombres|quantite/,
    domaine: MATHS,
    source: `${GUIDE_CP} : « l'utilisation et la manipulation de supports adaptés (cubes, frise numérique, cartes à points, etc.) » ; ${MATERNELLE} : « Manipuler et verbaliser des compositions et des décompositions de nombres ».`,
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
    nom: "Des objets à comparer en longueur : baguettes, bandes, ficelles, crayons",
    usage: "Comparer directement, ranger, produire un objet de même longueur, puis comparer à l'aide d'un intermédiaire.",
    irremplacable: "",
    imprime: { atelier: "mesures", quoi: "des bandes et des segments à comparer" },
    ateliers: ["mesures"],
    appel: /comparer (directement |indirectement )?des (longueurs|segments)|selon (leur|sa) longueur|objets? rectilignes?|de meme longueur qu/,
    domaine: MATHS,
    source: `${MATERNELLE} : « Comparer directement des longueurs d'objets rectilignes » (MS) ; ${MATHS_C2} : « Comparer des objets selon leur longueur » (CP).`,
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
    nom: "Des aimants, et des objets en métal et en d'autres matières",
    usage: "Chercher ce que l'aimant attire, s'en servir pour fabriquer un objet qui répond à un besoin.",
    irremplacable: "Un aimant attire, une image non.",
    ateliers: [],
    appel: /magnetisme|aimants?/,
    domaine: SCIENCES,
    source: `${MATERNELLE} : « Fabriquer un objet en réponse à un besoin en exploitant des propriétés de matériaux ou des phénomènes physiques (équilibre, magnétisme…) » (GS).`,
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
