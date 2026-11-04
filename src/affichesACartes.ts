// ── Les affiches à cartes ─────────────────────────────────────────────────
//
// « Cherche sur Éduscol et les guides les affichages qui peuvent être créés »,
// puis « fais-les tous » (l'enseignant, 4 novembre 2026).
//
// Beaucoup des affichages que décrivent les programmes et les guides sont des
// collections de cartes : un mot, son dessin, parfois une précision ; ou des
// étapes, une par ligne. Un seul moteur les fabrique tous, chaque sorte avec
// ses cartes de départ, que l'enseignant change ligne à ligne ; d'où vient
// chaque sorte est dit sous le « ? » de son atelier (sourcesDesAteliers.ts).
//
// Une ligne par carte. « mot | picto | précision » : le picto est le mot sous
// lequel on cherche le dessin (le mot lui-même par défaut, « - » pour aucun).
// Les sons : « graphèmes | mot » ; les contraires : « grand / petit » ; les
// familles et les listes : « dent : dentiste, dentifrice » ; les maisons :
// « a | avion, ananas », et « pig=cochon » pour chercher le dessin sous un
// autre mot ; « # titre » ouvre un groupe.
//
// Les hauteurs sont fixées, et calculées d'avance : la page de l'aperçu est
// celle qui sort de l'imprimante, sans rangée coupée ni titre seul en bas.

import { ATTRIBUTION_ARASAAC, feuille } from "./cartesImprimables";
import { escapeHtml } from "./print";

export type SorteCartes =
  | "consignes" | "sons" | "listes" | "maisons" | "responsabilites" | "coins" | "regles" | "langue"
  | "invariables" | "contraires" | "familles" | "couleurs" | "emotions" | "comprehension"
  | "demarche" | "animal" | "calcul" | "comparer";

/** L'atelier de chaque sorte, dans le catalogue de Fabriquer (catalogueAteliers.ts). */
export const ATELIERS_DES_CARTES: Record<SorteCartes, string> = {
  consignes: "afficheConsignes", sons: "afficheSons", listes: "afficheListes", maisons: "afficheMaisons",
  responsabilites: "afficheResponsabilites", coins: "afficheCoins", regles: "afficheRegles", langue: "afficheLangue",
  invariables: "afficheInvariables", contraires: "afficheContraires", familles: "afficheFamilles", couleurs: "afficheCouleurs",
  emotions: "afficheEmotions", comprehension: "afficheComprehension", demarche: "afficheDemarche", animal: "afficheAnimal",
  calcul: "afficheCalcul", comparer: "afficheComparer",
};

/** La sorte d'un atelier, s'il en est une. */
export const sorteDeLAtelier = (atelier: string): SorteCartes | undefined =>
  (Object.keys(ATELIERS_DES_CARTES) as SorteCartes[]).find((s) => ATELIERS_DES_CARTES[s] === atelier);

export const SORTES_CARTES: SorteCartes[] = [
  "consignes", "sons", "listes", "maisons", "responsabilites", "coins", "regles", "langue", "invariables", "contraires", "familles",
  "couleurs", "emotions", "comprehension", "demarche", "animal", "calcul", "comparer",
];

type Forme = "carte" | "son" | "paire" | "famille" | "liste" | "maison" | "etape";

/** Pour le mur ; en petit, quatre par page, pour le cahier ; ou de grandes étiquettes, quatre par page, à poser où il faut. */
export type FormatCartes = "mur" | "cahier" | "etiquettes";

/** Une liste toute prête : « Remplir avec… » ; ses cartes par rangée, si ce ne sont pas celles de l'affiche. */
export interface ListeDeCartes { id: string; nom: string; titre: string; lignes: string; colonnes?: number }

export interface ModeleCartes {
  sorte: SorteCartes;
  titre: string;
  forme: Forme;
  lignes: string;
  colonnes: number;
  /** D'autres listes de départ ; la première est celle de `lignes`. */
  listes?: ListeDeCartes[];
  /** Ce qu'on imprime d'abord : les coins s'étiquettent un à un. */
  format?: FormatCartes;
  /** Chaque groupe sur sa page : une affiche par couleur. */
  pageParGroupe?: boolean;
  /** Les étapes sont numérotées. */
  numeros?: boolean;
  /** Une place sous chaque carte, pour l'étiquette d'un prénom ou une pince. */
  place?: boolean;
  /** Une case vide à côté de chaque étape, à remplir avec la classe. */
  aRemplir?: boolean;
  /** Dans un groupe, les cartes vont du plus faible au plus fort : des points le montrent. */
  gradation?: boolean;
  /** Les verbes des consignes : leurs pictos viennent d'abord du lexique de l'enseignant (CAA). */
  verbes?: boolean;
  /** Ce qu'on écrit, une ligne par carte : rappelé sous le « ? ». */
  syntaxe: string;
}

/**
 * Les mots-repères des sons, dans l'ordre de la progression du CP (voir
 * progressionCgp.ts) : un mot que les élèves connaissent, que la banque
 * dessine, où le graphème se voit.
 */
export const MOTS_REPERES: { periode: 1 | 2 | 3 | 4 | 5; graphemes: string; mot: string; /** Le mot sous lequel la banque dessine celui-ci : sous « feu », un feu tricolore. */ picto?: string }[] = [
  { periode: 1, graphemes: "a", mot: "ananas" }, { periode: 1, graphemes: "é", mot: "école" }, { periode: 1, graphemes: "i", mot: "igloo" },
  { periode: 1, graphemes: "o", mot: "orange" }, { periode: 1, graphemes: "u", mot: "lune" }, { periode: 1, graphemes: "l", mot: "lion" },
  { periode: 1, graphemes: "r", mot: "robot" }, { periode: 1, graphemes: "f", mot: "fleur" }, { periode: 1, graphemes: "j", mot: "jupe" },
  { periode: 1, graphemes: "ou", mot: "loup" }, { periode: 1, graphemes: "e", mot: "cheval" }, { periode: 1, graphemes: "eu", mot: "feu", picto: "flamme" },
  { periode: 2, graphemes: "v", mot: "vélo" }, { periode: 2, graphemes: "ch", mot: "chat" }, { periode: 2, graphemes: "p", mot: "pomme" },
  { periode: 2, graphemes: "t", mot: "tomate" }, { periode: 2, graphemes: "b", mot: "ballon" }, { periode: 2, graphemes: "d", mot: "dé" },
  { periode: 2, graphemes: "m", mot: "moto" }, { periode: 2, graphemes: "n", mot: "nuage" }, { periode: 2, graphemes: "gn", mot: "montagne" },
  { periode: 2, graphemes: "z", mot: "zèbre" }, { periode: 2, graphemes: "s, ss", mot: "poisson" },
  { periode: 3, graphemes: "c, k, qu", mot: "canard" }, { periode: 3, graphemes: "g, gu", mot: "guitare" }, { periode: 3, graphemes: "un", mot: "lundi" },
  { periode: 3, graphemes: "an, am", mot: "éléphant" }, { periode: 3, graphemes: "en, em", mot: "dent" }, { periode: 3, graphemes: "on, om", mot: "mouton" },
  { periode: 3, graphemes: "in, im", mot: "lapin" }, { periode: 3, graphemes: "oi", mot: "roi" }, { periode: 3, graphemes: "oin", mot: "poing" },
  { periode: 3, graphemes: "ui", mot: "nuit" }, { periode: 3, graphemes: "y", mot: "pyjama" }, { periode: 3, graphemes: "â", mot: "âne" },
  { periode: 3, graphemes: "au, eau", mot: "bateau" }, { periode: 3, graphemes: "œu", mot: "œuf" }, { periode: 3, graphemes: "è, ê", mot: "tête" },
  { periode: 4, graphemes: "ai, ei", mot: "maison" }, { periode: 4, graphemes: "ez, er", mot: "nez" }, { periode: 4, graphemes: "h", mot: "hibou" },
  { periode: 4, graphemes: "ph", mot: "phoque" }, { periode: 4, graphemes: "c, ç", mot: "cerise" }, { periode: 4, graphemes: "g, ge", mot: "girafe" },
  { periode: 4, graphemes: "x", mot: "taxi" }, { periode: 4, graphemes: "ain, ein", mot: "pain" }, { periode: 4, graphemes: "ien", mot: "chien" },
  { periode: 4, graphemes: "y", mot: "crayon" }, { periode: 4, graphemes: "ail", mot: "éventail" }, { periode: 4, graphemes: "eil", mot: "soleil" },
  { periode: 4, graphemes: "euil", mot: "écureuil" },
  { periode: 5, graphemes: "ill", mot: "papillon" }, { periode: 5, graphemes: "w", mot: "kiwi" },
];

export type PeriodeDesSons = 1 | 2 | 3 | 4 | 5 | "tout";

export const lignesDesSons = (periode: PeriodeDesSons) =>
  MOTS_REPERES.filter((m) => periode === "tout" || m.periode === periode).map((m) => `${m.graphemes} | ${m.mot}${m.picto ? ` | ${m.picto}` : ""}`).join("\n");

const LISTES_DES_SONS: ListeDeCartes[] = ([1, 2, 3, 4, 5, "tout"] as PeriodeDesSons[]).map((p) => ({
  id: String(p), nom: p === "tout" ? "Toute l'année" : `Période ${p}`, titre: "Les mots-repères des sons", lignes: lignesDesSons(p),
}));

/** Le coin langue : la météo, les saisons, les couleurs, les jours, les mois, les nombres, les lieux de l'école ; « bonjour » dans les langues de la classe. */
export const LISTES_DE_LANGUE: ListeDeCartes[] = [
  { id: "meteo", nom: "La météo", titre: "What's the weather like?", lignes: "sunny | soleil | il fait beau\nrainy | pluie | il pleut\ncloudy | nuage | c'est nuageux\nwindy | vent | il y a du vent\nsnowy | neige | il neige\nfoggy | brouillard | il y a du brouillard" },
  { id: "saisons", nom: "Les saisons", titre: "The seasons", lignes: "spring | printemps | le printemps\nsummer | été | l'été\nautumn | automne | l'automne\nwinter | hiver | l'hiver" },
  { id: "couleurs", nom: "Les couleurs", titre: "Colours", colonnes: 4, lignes: "red | rouge | rouge\nblue | bleu | bleu\ngreen | vert | vert\nyellow | jaune | jaune\norange | orange | orange\npink | rose | rose\npurple | violet | violet\nbrown | marron | marron\nblack | noir | noir\nwhite | blanc | blanc\ngrey | gris | gris" },
  { id: "jours", nom: "Les jours", titre: "The days of the week", lignes: "Monday | - | lundi\nTuesday | - | mardi\nWednesday | - | mercredi\nThursday | - | jeudi\nFriday | - | vendredi\nSaturday | - | samedi\nSunday | - | dimanche" },
  { id: "mois", nom: "Les mois", titre: "The months", lignes: "January | - | janvier\nFebruary | - | février\nMarch | - | mars\nApril | - | avril\nMay | - | mai\nJune | - | juin\nJuly | - | juillet\nAugust | - | août\nSeptember | - | septembre\nOctober | - | octobre\nNovember | - | novembre\nDecember | - | décembre" },
  { id: "nombres", nom: "Les nombres", titre: "Numbers", lignes: "one | - | 1\ntwo | - | 2\nthree | - | 3\nfour | - | 4\nfive | - | 5\nsix | - | 6\nseven | - | 7\neight | - | 8\nnine | - | 9\nten | - | 10" },
  { id: "lieux", nom: "Les lieux de l'école", titre: "Our school", lignes: "classroom | classe | la classe\ncanteen | cantine | la cantine\nplayground | cour | la cour\ntoilets | toilettes | les toilettes\nlibrary | bibliothèque | la bibliothèque\ngym | gymnase | le gymnase\noffice | bureau | le bureau\nnurse's office | infirmerie | l'infirmerie" },
  { id: "bonjour", nom: "« Bonjour » dans les langues de la classe", titre: "Bonjour !", lignes: "Hello | - | anglais\nHallo | - | allemand\nHola | - | espagnol\nCiao | - | italien\nOlá | - | portugais\nMarhaba | - | arabe\nMerhaba | - | turc\nDzień dobry | - | polonais\nBună ziua | - | roumain\nNǐ hǎo | - | chinois" },
];

const sansPicto = (mots: string[]) => mots.map((m) => `${m} | -`);
const lignes = (...l: string[]) => l.join("\n");

export const MODELES_CARTES: Record<SorteCartes, ModeleCartes> = {
  consignes: {
    sorte: "consignes", titre: "Les verbes des consignes", forme: "carte", colonnes: 4, verbes: true,
    syntaxe: "« Entoure | entourer » : le mot de la consigne, puis le verbe dont on prend le picto — celui de votre lexique des consignes s'il y en a un.",
    lignes: lignes("Lis | lire", "Écris | écrire", "Recopie | recopier", "Écoute | écouter", "Observe | observer", "Entoure | entourer", "Souligne | souligner",
      "Barre | barrer", "Colorie | colorier", "Relie | relier", "Coche | cocher", "Complète | compléter", "Découpe | découper", "Colle | coller",
      "Dessine | dessiner", "Compte | compter", "Calcule | calculer", "Range | ranger", "Classe | classer", "Cherche | chercher"),
  },
  sons: {
    sorte: "sons", titre: "Les mots-repères des sons", forme: "son", colonnes: 4, listes: LISTES_DES_SONS,
    syntaxe: "« ou | loup » : le graphème, puis le mot-repère, où il se colore ; « ou | loup | animal » cherche le dessin sous un autre mot.",
    lignes: lignesDesSons(1),
  },
  listes: {
    sorte: "listes", titre: "Les listes de mots", forme: "liste", colonnes: 3,
    syntaxe: "« ien : chien, bien, rien » : le graphème, puis les mots qui l'ont ; il s'y colore.",
    lignes: lignes("ien : chien, bien, rien, combien, musicien, gardien", "oin : loin, coin, point, moins, besoin, shampoing",
      "ill : fille, bille, quille, chenille, famille, gorille", "gn : montagne, campagne, araignée, champignon, ligne, cygne",
      "ail : rail, travail, éventail, paille, bataille, médaille", "eil : soleil, réveil, orteil, abeille, oreille, bouteille",
      "euil : fauteuil, écureuil, chevreuil, feuille, portefeuille", "tion : récréation, opération, addition, punition, attention, potion"),
  },
  maisons: {
    sorte: "maisons", titre: "Les maisons des sons", forme: "maison", colonnes: 3,
    listes: [
      { id: "gs", nom: "Les maisons des sons", titre: "Les maisons des sons", lignes: lignes("a | avion, ananas, arbre, abeille", "i | igloo, lit, souris, tapis",
        "o | orange, olive, os, moto", "l | lion, lune, lapin, livre", "r | robot, rat, roi, renard", "m | moto, maison, mouton, main") },
      { id: "anglais", nom: "Les maisons des sons de l'anglais", titre: "The sound houses", lignes: lignes("/ɪ/ pig | pig=cochon, fish=poisson, milk=lait, six=-",
        "/aɪ/ five | five=-, bike=vélo, kite=cerf-volant, nine=-", "/iː/ tree | tree=arbre, green=vert, sheep=mouton, three=-") },
    ],
    syntaxe: "« a | avion, ananas » : le son sur le toit, puis les mots de la maison ; « pig=cochon » cherche le dessin sous un autre mot, « six=- » s'en passe.",
    lignes: lignes("a | avion, ananas, arbre, abeille", "i | igloo, lit, souris, tapis", "o | orange, olive, os, moto", "l | lion, lune, lapin, livre",
      "r | robot, rat, roi, renard", "m | moto, maison, mouton, main"),
  },
  responsabilites: {
    sorte: "responsabilites", titre: "Les responsabilités de la classe", forme: "carte", colonnes: 4, place: true,
    syntaxe: "« Arroser les plantes | arroser » : la responsabilité, puis le mot du picto. La case vide attend l'étiquette d'un prénom.",
    lignes: lignes("Distribuer le matériel | distribuer", "Ramasser les cahiers | cahier", "Effacer le tableau | tableau noir", "Arroser les plantes | arroser",
      "Éteindre la lumière | éteindre la lumière", "Ranger la bibliothèque | livres", "Donner la date | calendrier", "Dire la météo | météo",
      "Le facteur | facteur", "Le chef de rang | rang", "Fermer la porte | fermer la porte", "Balayer | balayer"),
  },
  coins: {
    sorte: "coins", titre: "Les coins de la classe", forme: "carte", colonnes: 4, format: "etiquettes",
    listes: [
      { id: "coins", nom: "Les coins de la classe", titre: "Les coins de la classe", lignes: lignes("Le coin lecture | lire", "Le coin écriture | écrire",
        "Le coin écoute | écouter", "Le coin jeux | jouer", "Le coin peinture | pinceau", "Le coin construction | cubes", "Le coin cuisine | cuisine",
        "Le coin calme | calme", "L'ordinateur | ordinateur", "Les marionnettes | marionnette", "Le bac à sable | bac à sable", "Le vestiaire | portemanteau") },
      { id: "rangement", nom: "Les étiquettes de rangement", titre: "Les étiquettes de rangement", lignes: lignes("Les crayons | crayon", "Les feutres | feutre",
        "Les ciseaux | ciseaux", "La colle | colle", "La peinture | peinture", "Les pinceaux | pinceau", "Les gommes | gomme", "Les cahiers | cahier",
        "Les livres | livre", "Les jeux | jeu", "Les puzzles | puzzle", "La pâte à modeler | pâte à modeler", "Les perles | perle", "Les cubes | cubes",
        "Les déguisements | déguisement", "Les feuilles | feuille") },
    ],
    syntaxe: "« Le coin lecture | lire » : le nom du coin ou de la boîte, puis le mot du picto.",
    lignes: lignes("Le coin lecture | lire", "Le coin écriture | écrire", "Le coin écoute | écouter", "Le coin jeux | jouer", "Le coin peinture | pinceau",
      "Le coin construction | cubes", "Le coin cuisine | cuisine", "Le coin calme | calme", "L'ordinateur | ordinateur",
      "Les marionnettes | marionnette", "Le bac à sable | bac à sable", "Le vestiaire | portemanteau"),
  },
  regles: {
    sorte: "regles", titre: "Nos règles de vie", forme: "etape", colonnes: 1,
    listes: [
      { id: "droits", nom: "Nos droits et nos devoirs", titre: "Nos règles de vie", lignes: lignes("# J'ai le droit de…", "m'exprimer | parler", "jouer | jouer",
        "apprendre | apprendre", "me tromper | se tromper", "# Je dois…", "attendre mon tour | attendre", "partager les objets | partager", "ranger | ranger",
        "respecter le matériel | matériel") },
      { id: "classe", nom: "Les règles de la classe", titre: "Les règles de la classe", lignes: lignes("Je lève le doigt pour parler | lever la main",
        "J'écoute celui qui parle | écouter", "Je chuchote | chuchoter", "Je marche dans la classe | marcher", "Je range mon matériel | ranger",
        "Je prends soin des livres | livre", "Je partage | partager", "J'attends mon tour | attendre", "J'aide les autres | aider") },
    ],
    syntaxe: "« Je chuchote | chuchoter » : la règle, puis le mot du picto ; « # Je dois… » ouvre un groupe.",
    lignes: lignes("# J'ai le droit de…", "m'exprimer | parler", "jouer | jouer", "apprendre | apprendre", "me tromper | se tromper", "# Je dois…",
      "attendre mon tour | attendre", "partager les objets | partager", "ranger | ranger", "respecter le matériel | matériel"),
  },
  langue: {
    sorte: "langue", titre: LISTES_DE_LANGUE[0].titre, forme: "carte", colonnes: 3, listes: LISTES_DE_LANGUE,
    syntaxe: "« sunny | soleil | il fait beau » : le mot dans la langue, le mot du picto, la précision.",
    lignes: LISTES_DE_LANGUE[0].lignes,
  },
  invariables: {
    sorte: "invariables", titre: "Les mots invariables", forme: "carte", colonnes: 4,
    syntaxe: "« dans » : le mot, avec son picto ; « ici | - » : sans picto ; « # Pour dire où » ouvre un groupe — par le sens ou par la ressemblance, jamais en vrac.",
    lignes: lignes("# Pour dire où", ...sansPicto(["ici", "là-bas"]), "loin", "près", "dans", "sur", "sous", "devant", "derrière", "dedans", "dehors",
      "# Pour dire quand", ...sansPicto(["hier", "aujourd'hui", "demain", "avant", "après", "pendant", "maintenant", "toujours", "jamais", "souvent",
        "parfois", "longtemps"]),
      "# Des mots qui se ressemblent", ...sansPicto(["tôt", "bientôt", "aussitôt", "plutôt"]),
      "# Pour dire comment, combien", ...sansPicto(["bien", "mal", "vite", "très", "trop", "beaucoup", "peu", "assez"]),
      "# Pour relier", ...sansPicto(["et", "mais", "ou", "donc", "car", "puis", "avec", "sans", "pour", "parce que"])),
  },
  contraires: {
    sorte: "contraires", titre: "Les contraires", forme: "paire", colonnes: 2,
    syntaxe: "« grand / petit » : les deux contraires, de la même classe de mots, chacun avec son dessin.",
    lignes: lignes("grand / petit", "chaud / froid", "ouvert / fermé", "plein / vide", "propre / sale", "lourd / léger", "jour / nuit", "mouillé / sec"),
  },
  familles: {
    sorte: "familles", titre: "Les familles de mots", forme: "famille", colonnes: 3,
    syntaxe: "« dent : dentiste, dentifrice » : le mot, puis ceux de sa famille ; ce qu'ils ont en commun se met en gras.",
    lignes: lignes("dent : dentiste, dentifrice, dentier", "jardin : jardinier, jardiner, jardinage", "chant : chanter, chanteur, chanson",
      "fleur : fleuriste, fleurir, fleuri", "lait : laitier, laitage, laiteux", "terre : terrain, terrier, enterrer"),
  },
  couleurs: {
    sorte: "couleurs", titre: "Les couleurs", forme: "carte", colonnes: 2, pageParGroupe: true,
    syntaxe: "« # Le rouge » ouvre la page d'une couleur ; puis une chose de cette couleur par ligne, avec son dessin.",
    lignes: lignes("# Le rouge", "fraise", "tomate", "coccinelle", "cerise", "pomme", "coquelicot", "# Le jaune", "banane", "citron", "poussin", "soleil",
      "maïs", "tournesol", "# Le bleu", "ciel", "mer", "baleine", "dauphin", "myrtille", "piscine", "# Le vert", "grenouille", "feuille", "sapin", "salade",
      "concombre", "brocoli"),
  },
  emotions: {
    sorte: "emotions", titre: "Les émotions", forme: "carte", colonnes: 4, gradation: true,
    syntaxe: "« # La colère » ouvre un groupe ; puis ses mots, du plus faible au plus fort : « agacé », « fâché », « furieux ».",
    lignes: lignes("# La joie", "content", "joyeux", "ravi", "# La tristesse", "déçu | -", "triste", "malheureux | -",
      "# La colère", "agacé", "fâché", "en colère", "furieux", "# La peur", "inquiet", "effrayé", "terrifié | -"),
  },
  comprehension: {
    sorte: "comprehension", titre: "Écrire pour mieux comprendre", forme: "etape", colonnes: 1,
    syntaxe: "« Je prends des notes | noter » : ce qu'on fait, puis le mot du picto ; « # Pendant la lecture » ouvre un groupe.",
    lignes: lignes("# Avant de lire", "Je prévois comment je vais lire | planifier", "Je rappelle ce que je sais déjà | penser",
      "J'entre dans l'univers du texte | livre", "# Pendant la lecture", "Je cherche ce qui me bloque | problème", "Je prends des notes | noter",
      "J'écris mes hypothèses et mes questions | question", "# Après la lecture", "Je garde une trace | garder", "Je partage ma lecture | partager",
      "J'invente, j'imite, je crée | créer"),
  },
  demarche: {
    sorte: "demarche", titre: "Je mène une enquête", forme: "etape", colonnes: 1, numeros: true,
    syntaxe: "« Je propose mes idées | penser | Je pense que… » : l'étape, le mot du picto, ce qu'on fait.",
    lignes: lignes("Je me pose une question | question | Qu'est-ce que je veux savoir ?", "Je propose mes idées | penser | Je pense que… parce que…",
      "Je cherche : j'expérimente, j'observe, je lis des documents | expérience | Je note ce que je fais et ce que je vois.",
      "Je compare et je conclus | réponse | Mon idée était-elle juste ? Qu'ai-je trouvé ?",
      "Je retiens et je partage | apprendre | J'écris ce que j'ai appris et je le présente."),
  },
  animal: {
    sorte: "animal", titre: "L'escargot", forme: "etape", colonnes: 1, aRemplir: true,
    syntaxe: "« Ce qu'il mange | manger » : la rubrique, puis le mot du picto ; la case se remplit avec la classe — dessins, photos, mots.",
    lignes: lignes("Les étapes de sa vie | grandir", "Son corps | corps", "Comment il se déplace | marcher", "Ce qu'il mange | manger", "Où il vit | maison"),
  },
  calcul: {
    sorte: "calcul", titre: "Les familles de calculs", forme: "etape", colonnes: 1,
    listes: [
      { id: "familles", nom: "Les familles de calculs (CP)", titre: "Les familles de calculs", lignes: lignes(
        "Les suivants : ajouter 1, c'est dire le nombre d'après | - | 3 + 1 = 4 ; 5 + 1 = 6", "Ajouter 10 | - | 10 + 5 = 15 ; 2 + 10 = 12",
        "Les doubles | - | 2 + 2 = 4 ; 3 + 3 = 6 ; 8 + 8 = 16", "Les compléments à 10 | - | 2 + 8 = 10 ; 4 + 6 = 10",
        "Les presque-doubles : le double, et un de plus ou de moins | - | 6 + 7 = 6 + 6 + 1 = 13 ; 6 + 5 = 6 + 6 − 1 = 11",
        "Les sommes plus petites que 10 | - | 3 + 6 = 9 ; 7 + 2 = 9", "Le passage par 10 : je fais 10, puis j'ajoute le reste | - | 8 + 5 = 8 + 2 + 3 = 13",
        "Je commence par le plus grand nombre | - | 2 + 9 = 9 + 2 = 11") },
      { id: "vite", nom: "Pour calculer vite (CE1, CE2)", titre: "Pour calculer vite", lignes: lignes(
        "Ajouter 10 : le chiffre des dizaines augmente de 1 | - | 34 + 10 = 44", "Ajouter 9 : j'ajoute 10, puis j'enlève 1 | - | 37 + 9 = 37 + 10 − 1 = 46",
        "Enlever 9 : j'enlève 10, puis j'ajoute 1 | - | 52 − 9 = 52 − 10 + 1 = 43", "Ajouter 11 : j'ajoute 10, puis 1 | - | 25 + 11 = 25 + 10 + 1 = 36",
        "Multiplier par 10 : les unités deviennent des dizaines | - | 23 × 10 = 230",
        "Multiplier par 5 : je multiplie par 10, puis je prends la moitié | - | 14 × 5 = 140 ÷ 2 = 70") },
    ],
    syntaxe: "« Ajouter 9 : j'ajoute 10, puis j'enlève 1 | - | 37 + 9 = 37 + 10 − 1 = 46 » : la procédure, « - » pour aucun picto, l'exemple.",
    lignes: lignes("Les suivants : ajouter 1, c'est dire le nombre d'après | - | 3 + 1 = 4 ; 5 + 1 = 6", "Ajouter 10 | - | 10 + 5 = 15 ; 2 + 10 = 12",
      "Les doubles | - | 2 + 2 = 4 ; 3 + 3 = 6 ; 8 + 8 = 16", "Les compléments à 10 | - | 2 + 8 = 10 ; 4 + 6 = 10",
      "Les presque-doubles : le double, et un de plus ou de moins | - | 6 + 7 = 6 + 6 + 1 = 13 ; 6 + 5 = 6 + 6 − 1 = 11",
      "Les sommes plus petites que 10 | - | 3 + 6 = 9 ; 7 + 2 = 9", "Le passage par 10 : je fais 10, puis j'ajoute le reste | - | 8 + 5 = 8 + 2 + 3 = 13",
      "Je commence par le plus grand nombre | - | 2 + 9 = 9 + 2 = 11"),
  },
  comparer: {
    sorte: "comparer", titre: "Pour comparer deux nombres", forme: "etape", colonnes: 1,
    syntaxe: "« Je compare d'abord les dizaines | - | 71 > 68 » : ce qu'on fait, « - » pour aucun picto, l'exemple.",
    lignes: lignes("Je compare d'abord les dizaines | - | 71 > 68 : 7 dizaines, c'est plus que 6 dizaines.",
      "Si les dizaines sont les mêmes, je compare les unités | - | 45 < 48 : 5 unités, c'est moins que 8 unités.",
      "Un nombre à deux chiffres est plus grand qu'un nombre à un seul chiffre | - | 12 > 9",
      "< se lit « est plus petit que », > se lit « est plus grand que » | - | 3 < 5 ; 5 > 3"),
  },
};

// ── Les réglages ──

export interface ReglagesCartes {
  titre: string;
  lignes: string;
  colonnes: number;
  pictos: boolean;
  /** Les mots en capitales, comme les premières étiquettes de maternelle. */
  capitales: boolean;
  format: FormatCartes;
}

export const reglagesCartesParDefaut = (sorte: SorteCartes): ReglagesCartes => {
  const m = MODELES_CARTES[sorte];
  return { titre: m.titre, lignes: m.lignes, colonnes: m.colonnes, pictos: true, capitales: false, format: m.format ?? "mur" };
};

export const enEtapes = (sorte: SorteCartes) => MODELES_CARTES[sorte].forme === "etape";

export function reglagesCartesSurs(sorte: SorteCartes, brut: Partial<ReglagesCartes> | null | undefined): ReglagesCartes {
  const d = reglagesCartesParDefaut(sorte);
  const o = (brut && typeof brut === "object" ? brut : {}) as Partial<ReglagesCartes>;
  const colonnes = typeof o.colonnes === "number" && Number.isFinite(o.colonnes) ? Math.max(1, Math.min(6, Math.round(o.colonnes))) : d.colonnes;
  const format: FormatCartes = o.format === "mur" || o.format === "cahier" || (o.format === "etiquettes" && !enEtapes(sorte)) ? o.format : d.format;
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  return {
    titre: typeof o.titre === "string" ? o.titre.slice(0, 80) : d.titre,
    lignes: typeof o.lignes === "string" ? o.lignes.slice(0, 6000) : d.lignes,
    colonnes: enEtapes(sorte) ? 1 : colonnes,
    pictos: oui(o.pictos, d.pictos),
    capitales: oui(o.capitales, d.capitales),
    format,
  };
}

// ── Les cartes ──

type CarteSimple = { forme: "carte" | "etape"; texte: string; picto: string; detail: string };
type MotDessine = { mot: string; picto: string };
export type Carte =
  | CarteSimple
  | { forme: "son"; graphemes: string; mot: string; picto: string }
  | { forme: "paire"; a: string; b: string }
  | { forme: "famille" | "liste"; racine: string; mots: string[] }
  | { forme: "maison"; son: string; mots: MotDessine[] };
export type Element = Carte | { forme: "groupe"; titre: string };

/** Le mot sous lequel on cherche un dessin : celui qu'on a écrit, le texte sinon ; « - » : aucun. */
const pictoDe = (ecrit: string | undefined, texte: string) => {
  const p = (ecrit ?? "").trim();
  return p === "-" ? "" : (p || texte).toLowerCase();
};

/** « racine : a, b, c » : ce qui précède les deux-points, puis la liste. */
function racineEtMots(ligne: string, combien: number): { racine: string; mots: string[] } {
  const deux = ligne.indexOf(":");
  const racine = (deux < 0 ? ligne : ligne.slice(0, deux)).trim();
  const mots = (deux < 0 ? "" : ligne.slice(deux + 1)).split(",").map((m) => m.trim()).filter(Boolean).slice(0, combien);
  return { racine, mots };
}

/** Les cartes d'une saisie, une ligne chacune, selon la forme de l'affiche. */
export function lireCartes(sorte: SorteCartes, saisie: string): Element[] {
  const forme = MODELES_CARTES[sorte].forme;
  return saisie.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 120).flatMap((ligne): Element[] => {
    if (ligne.startsWith("#")) return ligne.slice(1).trim() ? [{ forme: "groupe", titre: ligne.slice(1).trim() }] : [];
    const parts = ligne.split("|").map((x) => x.trim());
    switch (forme) {
      case "son": return parts[0] && parts[1] ? [{ forme: "son", graphemes: parts[0], mot: parts[1], picto: pictoDe(parts[2], parts[1]) }] : [];
      case "paire": {
        const [a, b] = ligne.split(/\s*[/|]\s*/);
        return a && b ? [{ forme: "paire", a, b }] : [];
      }
      case "famille":
      case "liste": {
        const { racine, mots } = racineEtMots(ligne, forme === "liste" ? 8 : 6);
        return racine ? [{ forme, racine, mots }] : [];
      }
      case "maison": {
        const barre = ligne.indexOf("|");
        const son = (barre < 0 ? ligne : ligne.slice(0, barre)).trim();
        const mots = (barre < 0 ? "" : ligne.slice(barre + 1)).split(",").map((m) => m.trim()).filter(Boolean).slice(0, 8).map((m) => {
          const egal = m.indexOf("=");
          return egal < 0 ? { mot: m, picto: m.toLowerCase() } : { mot: m.slice(0, egal).trim(), picto: pictoDe(m.slice(egal + 1), m.slice(0, egal).trim()) };
        }).filter((m) => m.mot);
        return son ? [{ forme: "maison", son, mots }] : [];
      }
      default: return parts[0] ? [{ forme, texte: parts[0], picto: pictoDe(parts[1], parts[0]), detail: parts[2] ?? "" }] : [];
    }
  });
}

/** Les mots dont une carte cherche le dessin. */
function dessinsDe(e: Element): string[] {
  switch (e.forme) {
    case "groupe":
    case "liste": return [];
    case "paire": return [e.a.toLowerCase(), e.b.toLowerCase()];
    case "famille": return [e.racine.toLowerCase()];
    case "maison": return e.mots.map((m) => m.picto).filter(Boolean);
    default: return e.picto ? [e.picto] : [];
  }
}

/** Les mots dont on cherche le dessin, une fois chacun. */
export function motsADessinerCartes(sorte: SorteCartes, brut: Partial<ReglagesCartes>): string[] {
  const r = reglagesCartesSurs(sorte, brut);
  return r.pictos ? [...new Set(lireCartes(sorte, r.lignes).flatMap(dessinsDe))] : [];
}

/** Le mot, son graphème en couleur : le plus long des graphèmes qu'on y trouve. */
export function motAvecGrapheme(graphemes: string, mot: string): string {
  const liste = graphemes.split(",").map((g) => g.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length);
  const bas = mot.toLowerCase();
  for (const g of liste) {
    const i = bas.indexOf(g);
    if (i >= 0) return `${escapeHtml(mot.slice(0, i))}<span class="ak-g">${escapeHtml(mot.slice(i, i + g.length))}</span>${escapeHtml(mot.slice(i + g.length))}`;
  }
  return escapeHtml(mot);
}

/** Un mot de la famille, la partie qu'il partage avec le premier en gras : trois lettres au moins, au début ou dedans. */
export function motDeLaFamille(racine: string, mot: string): string {
  const a = racine.toLowerCase(), b = mot.toLowerCase();
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  if (n >= 3) return `<b>${escapeHtml(mot.slice(0, n))}</b>${escapeHtml(mot.slice(n))}`;
  // « terre » dans « enterrer » : le radical au milieu du mot.
  for (let l = a.length; l >= 3; l--) {
    const i = b.indexOf(a.slice(0, l));
    if (i > 0) return `${escapeHtml(mot.slice(0, i))}<b>${escapeHtml(mot.slice(i, i + l))}</b>${escapeHtml(mot.slice(i + l))}`;
  }
  return escapeHtml(mot);
}

/** La couleur que nomme un titre de groupe — « Le rouge » —, pour sa pastille. */
const TEINTES: Record<string, string> = {
  rouge: "#d33a32", jaune: "#f2c200", bleu: "#2a6fd6", vert: "#2e9e4f", orange: "#f08a24", rose: "#f06aa8",
  violet: "#8e44ad", marron: "#8b5a2b", noir: "#1c2233", blanc: "#ffffff", gris: "#9aa0b4",
};
export function teinteDe(titre: string): string | null {
  const mot = titre.toLowerCase().replace(/^(le|la|les|l'|l’)\s*/, "").replace(/[^a-zàâçéèêëîïôûùüÿœ]/g, "");
  return TEINTES[mot] ?? null;
}

// ── Les mesures ──
//
// Tout se compte en millimètres : la page utile (182 × 250 mm, la place que
// prennent les autres affiches), l'écart entre les rangées, le titre. La
// taille du dessin et de l'écrit suit la largeur des cartes ; la hauteur d'une
// rangée, sa plus grande carte — de quoi savoir d'avance ce qui tient sur une
// page.

const LARGEUR = 182;
const HAUTEUR = 250;
const ECART = 3;
const TITRE = 15;
const GROUPE = 10;
const GROUPE_PAGE = 16;
/** Le cadre d'une carte : 3 mm de marge en haut et en bas, ses bords. */
const CADRE = 7.2;
/** Les points de la gradation, sous le mot. */
const FORCE = 5;

export const largeurDeCarte = (colonnes: number) => (LARGEUR - ECART * (colonnes - 1)) / colonnes;

/** Le dessin et l'écrit d'une carte, en mm, selon sa largeur ; une paire partage sa carte en deux. */
export function taillesDesCartes(colonnes: number, forme: Forme = "carte"): { largeur: number; dessin: number; ecrit: number } {
  const largeur = largeurDeCarte(colonnes);
  const dessin = Math.min(48, largeur * 0.58);
  const ecrit = Math.max(4.5, Math.min(8, largeur * 0.12));
  if (forme !== "paire") return { largeur, dessin, ecrit };
  const moitie = (largeur - 13.2) / 2;
  return { largeur, dessin: Math.min(dessin * 0.8, moitie), ecrit: Math.max(4, Math.min(ecrit, moitie * 0.22)) };
}

/** Les maisons : le toit, et chaque mot dans sa case, son dessin au-dessus. */
export function taillesDesMaisons(colonnes: number): { toit: number; case: number; dessin: number; ecrit: number } {
  const largeur = largeurDeCarte(colonnes);
  const kase = (largeur - 6) / 2;
  return { toit: Math.min(24, largeur * 0.3), case: kase, dessin: Math.min(24, kase * 0.62), ecrit: Math.max(3.8, Math.min(6, kase * 0.17)) };
}

/**
 * Les lignes qu'un texte prend dans une largeur, mot à mot : une estimation
 * large, 0,6 em par lettre en gras (0,72 en capitales). Un mot trop long pour
 * la ligne se coupe.
 */
export function lignesDe(texte: string, largeur: number, taille: number, capitales = false): number {
  const lettre = (capitales ? 0.72 : 0.6) * taille;
  const place = Math.max(lettre, largeur);
  let n = 1;
  let x = 0;
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const l = mot.length * lettre;
    if (x > 0 && x + lettre + l <= place) { x += lettre + l; continue; }
    if (x > 0) n++;
    n += Math.ceil(l / place) - 1;
    x = l % place || place;
  }
  return n;
}

type ADessin = (cle: string) => boolean;

/** La hauteur d'une carte, en mm. */
export function hauteurDeCarte(e: Carte, m: ModeleCartes, colonnes: number, aDessin: ADessin, capitales = false): number {
  const { largeur, dessin, ecrit } = taillesDesCartes(colonnes, m.forme);
  const dedans = largeur - 5.2;
  const lignesDu = (t: string, l: number, taille: number) => lignesDe(t, l, taille, capitales);
  switch (e.forme) {
    case "son":
      return CADRE + lignesDu(e.graphemes, dedans, ecrit * 1.5) * ecrit * 1.5 + 1.5 + (aDessin(e.picto) ? dessin + 1.5 : 0) + lignesDu(e.mot, dedans, ecrit) * ecrit * 1.15;
    case "paire": {
      const moitie = (largeur - 13.2) / 2;
      const d = aDessin(e.a.toLowerCase()) || aDessin(e.b.toLowerCase()) ? dessin + 1 : 0;
      return CADRE + d + Math.max(lignesDu(e.a, moitie, ecrit), lignesDu(e.b, moitie, ecrit)) * ecrit * 1.15;
    }
    // L'en-tête, son filet (2 mm), l'écart (1,5 mm) et la marge de la liste (1,5 mm), puis un mot par ligne.
    case "famille":
      return CADRE + Math.max(aDessin(e.racine.toLowerCase()) ? dessin * 0.45 : 0, lignesDu(e.racine, dedans - 15, ecrit * 1.1) * ecrit * 1.1 * 1.15) + 5
        + e.mots.reduce((h, x) => h + lignesDu(x, dedans - 5, ecrit * 0.8) * ecrit * 0.8 * 1.4, 0);
    case "liste":
      return CADRE + lignesDu(e.racine, dedans, ecrit * 1.3) * ecrit * 1.3 * 1.15 + 5
        + e.mots.reduce((h, x) => h + lignesDu(x, dedans - 5, ecrit * 0.85) * ecrit * 0.85 * 1.35, 0);
    case "maison": {
      const t = taillesDesMaisons(colonnes);
      const avecDessin = e.mots.some((x) => aDessin(x.picto));
      const rangees = Math.ceil(Math.max(1, e.mots.length) / 2);
      return t.toit + 1.2 + 4 + rangees * ((avecDessin ? t.dessin + 1 : 0) + t.ecrit * 1.15 * 2 + 2);
    }
    default:
      return CADRE + (aDessin(e.picto) ? dessin + 1.5 : 0) + lignesDu(e.texte, dedans, ecrit) * ecrit * 1.15
        + (e.detail ? 1.5 + lignesDe(e.detail, dedans, ecrit * 0.6) * ecrit * 0.6 * 1.25 : 0) + (m.place ? 1.5 + 10 : 0)
        + (m.gradation ? FORCE : 0);
  }
}

/** Les étapes : la taille de leur titre et de leur détail ; la colonne du texte quand une case les suit. */
const ETAPE_TITRE = 6.5;
const ETAPE_DETAIL = 5;
const ETAPE_COLONNE = 72;

/** Le dessin des étapes : aussi grand que possible pour qu'elles tiennent sur une page, entre 12 et 28 mm. */
export function dessinDesEtapes(n: number, groupes: number, avecTitre: boolean): number {
  const parEtape = (HAUTEUR - (avecTitre ? TITRE : 0) - groupes * GROUPE - ECART * (n - 1)) / Math.max(1, n) - CADRE;
  return Math.max(12, Math.min(28, parEtape));
}

export function hauteurDEtape(e: CarteSimple, m: ModeleCartes, dessin: number, capitales = false): number {
  const texte = m.aRemplir ? ETAPE_COLONNE - (dessin ? dessin + 4 : 0)
    : LARGEUR - 9.2 - (dessin ? dessin + 4 : 0) - (m.numeros ? 15 : 0);
  const titre = lignesDe(e.texte, texte, ETAPE_TITRE, capitales) * ETAPE_TITRE * 1.2;
  const detail = e.detail ? 1 + lignesDe(e.detail, texte, ETAPE_DETAIL) * ETAPE_DETAIL * 1.3 : 0;
  return CADRE + Math.max(dessin, m.numeros ? 11 : 0, titre + detail);
}

/** Le titre tient sur une ligne : il rapetisse s'il est long. */
export const tailleDuTitre = (titre: string) => Math.max(5, Math.min(8.5, 176 / (Math.max(1, titre.length) * 0.6)));

// ── L'affiche ──

const img = (cle: string, images: Record<string, string>, classe = "ak-picto") =>
  (cle && images[cle] ? `<img class="${classe}" src="${escapeHtml(images[cle])}" alt="">` : "");

/** Le rang d'une carte dans son groupe, pour la gradation : 2 sur 4. */
type Force = { rang: number; sur: number };

function forceHtml(f: Force | undefined): string {
  if (!f) return "";
  return `<div class="ak-force" aria-label="${f.rang} sur ${f.sur}">${Array.from({ length: f.sur }, (_, i) => `<span${i < f.rang ? ` class="ak-plein"` : ""}></span>`).join("")}</div>`;
}

function carteHtml(e: Carte, m: ModeleCartes, images: Record<string, string>, rang: number, style = "", force?: Force): string {
  const s = style ? ` style="${style}"` : "";
  switch (e.forme) {
    case "son":
      return `<div class="ak-carte ak-son"><div class="ak-graphemes">${escapeHtml(e.graphemes)}</div>${img(e.picto, images)}`
        + `<div class="ak-mot">${motAvecGrapheme(e.graphemes, e.mot)}</div></div>`;
    case "paire":
      return `<div class="ak-carte ak-paire"><div class="ak-moitie">${img(e.a.toLowerCase(), images)}<div class="ak-mot">${escapeHtml(e.a)}</div></div>`
        + `<div class="ak-contre">≠</div><div class="ak-moitie">${img(e.b.toLowerCase(), images)}<div class="ak-mot">${escapeHtml(e.b)}</div></div></div>`;
    case "famille":
      return `<div class="ak-carte ak-famille"><div class="ak-racine">${img(e.racine.toLowerCase(), images, "ak-picto ak-mini")}<span>${escapeHtml(e.racine)}</span></div>`
        + `<ul>${e.mots.map((x) => `<li>${motDeLaFamille(e.racine, x)}</li>`).join("")}</ul></div>`;
    case "liste":
      return `<div class="ak-carte ak-famille ak-liste"><div class="ak-graphemes">${escapeHtml(e.racine)}</div>`
        + `<ul>${e.mots.map((x) => `<li>${motAvecGrapheme(e.racine, x)}</li>`).join("")}</ul></div>`;
    case "maison":
      return `<div class="ak-maison"><div class="ak-toit"><span>${escapeHtml(e.son)}</span></div><div class="ak-murs">`
        + e.mots.map((x) => `<div class="ak-chambre">${img(x.picto, images, "ak-picto ak-dessin-maison")}<div class="ak-mot">${motAvecGrapheme(e.son.replace(/\/[^/]*\/|\s.*$/g, "") || e.son, x.mot)}</div></div>`).join("")
        + `</div></div>`;
    case "etape":
      return `<div class="ak-etape${m.aRemplir ? " ak-a-remplir" : ""}"${s}>${m.numeros ? `<div class="ak-num">${rang}</div>` : ""}`
        + `<div class="ak-tete">${img(e.picto, images)}<div class="ak-texte"><div class="ak-titre-etape">${escapeHtml(e.texte)}</div>`
        + `${e.detail ? `<div class="ak-detail">${escapeHtml(e.detail)}</div>` : ""}</div></div>${m.aRemplir ? `<div class="ak-zone"></div>` : ""}</div>`;
    default:
      return `<div class="ak-carte">${img(e.picto, images)}<div class="ak-mot">${escapeHtml(e.texte)}</div>`
        + `${e.detail ? `<div class="ak-detail">${escapeHtml(e.detail)}</div>` : ""}${m.place ? `<div class="ak-place"></div>` : ""}${forceHtml(force)}</div>`;
  }
}

/** Les cartes, par groupe : ce qui précède le premier titre forme un groupe sans titre. */
function enGroupes(elements: Element[]): { titre: string; cartes: Carte[] }[] {
  const groupes: { titre: string; cartes: Carte[] }[] = [];
  for (const e of elements) {
    if (e.forme === "groupe") groupes.push({ titre: e.titre, cartes: [] });
    else {
      if (!groupes.length) groupes.push({ titre: "", cartes: [] });
      groupes[groupes.length - 1].cartes.push(e);
    }
  }
  return groupes;
}

function titreDeGroupe(titre: string, grand: boolean): string {
  const teinte = teinteDe(titre);
  return `<div class="ak-groupe${grand ? " ak-groupe-page" : ""}">${teinte ? `<span class="ak-pastille" style="background: ${teinte}"></span>` : ""}${escapeHtml(titre)}</div>`;
}

/**
 * Les pages de l'affiche, en blocs de hauteur connue : le titre en haut de la
 * première, les groupes et leurs rangées à la suite, sans couper une rangée
 * ni laisser un titre de groupe seul en bas d'une page.
 */
export function pagesDuMur(r: ReglagesCartes, m: ModeleCartes, elements: Element[], images: Record<string, string>): string[] {
  const aDessin: ADessin = (cle) => Boolean(cle && images[cle]);
  const titre = r.titre.trim();
  const pages: string[][] = [[]];
  let reste = HAUTEUR - (titre ? TITRE : 0);
  const nouvellePage = () => { pages.push([]); reste = HAUTEUR; };
  const poser = (bloc: string, hauteur: number, besoin = hauteur) => {
    if (besoin > reste + 0.01 && pages[pages.length - 1].length) nouvellePage();
    pages[pages.length - 1].push(bloc);
    reste -= hauteur + ECART;
  };
  const groupes = enGroupes(elements);
  const poserLeTitre = (g: { titre: string }, suite: number) => {
    if (!g.titre) return;
    if (m.pageParGroupe && pages[pages.length - 1].length) nouvellePage();
    const h = m.pageParGroupe ? GROUPE_PAGE : GROUPE;
    poser(titreDeGroupe(g.titre, Boolean(m.pageParGroupe)), h - ECART, h + suite);
  };
  const enTete = (blocs: string[], k: number) =>
    (k === 0 && titre ? `<div class="ak-titre" style="font-size: ${tailleDuTitre(titre).toFixed(1)}mm">${escapeHtml(titre)}</div>` : "") + blocs.join("");
  let rang = 0;
  if (m.forme === "etape") {
    const etapes = elements.filter((e): e is CarteSimple => e.forme === "etape");
    const nGroupes = groupes.filter((g) => g.titre).length;
    // À côté d'une case à remplir, le dessin reste petit : la case est l'essentiel.
    const dessin = etapes.some((e) => aDessin(e.picto)) ? Math.min(m.aRemplir ? 24 : 28, dessinDesEtapes(etapes.length, nGroupes, Boolean(titre))) : 0;
    // Une case à remplir : les étapes se partagent la page.
    const part = m.aRemplir ? (HAUTEUR - (titre ? TITRE : 0) - nGroupes * GROUPE - ECART * (etapes.length - 1)) / Math.max(1, etapes.length) : 0;
    for (const g of groupes) {
      const premiere = g.cartes[0] as CarteSimple | undefined;
      poserLeTitre(g, premiere ? Math.max(part, hauteurDEtape(premiere, m, dessin, r.capitales)) : 0);
      for (const e of g.cartes as CarteSimple[]) {
        const h = Math.max(part, hauteurDEtape(e, m, dessin, r.capitales));
        poser(carteHtml(e, m, images, ++rang, `height: ${h.toFixed(1)}mm`), h);
      }
    }
    return pages.map((blocs, k) => `<div class="ak-page" style="--ak-dessin-etape: ${dessin.toFixed(1)}mm">${enTete(blocs, k)}</div>`);
  }
  const c = r.colonnes;
  // Chaque rangée prend la hauteur de sa plus grande carte.
  const hauteur = (cartes: Carte[]) => Math.max(0, ...cartes.map((e) => hauteurDeCarte(e, m, c, aDessin, r.capitales)));
  for (const g of groupes) {
    poserLeTitre(g, g.cartes.length ? hauteur(g.cartes.slice(0, c)) : 0);
    for (let i = 0; i < g.cartes.length; i += c) {
      const rangee = g.cartes.slice(i, i + c);
      const h = hauteur(rangee);
      const cartes = rangee.map((e, k) => carteHtml(e, m, images, ++rang, "", m.gradation ? { rang: i + k + 1, sur: g.cartes.length } : undefined)).join("");
      poser(`<div class="ak-rangee" style="grid-template-columns: repeat(${c}, minmax(0, 1fr)); height: ${h.toFixed(1)}mm">${cartes}</div>`, h);
    }
  }
  const { dessin, ecrit } = taillesDesCartes(c, m.forme);
  const t = taillesDesMaisons(c);
  const variables = m.forme === "maison"
    ? `--ak-toit: ${t.toit.toFixed(1)}mm; --ak-dessin-maison: ${t.dessin.toFixed(1)}mm; --ak-ecrit: ${t.ecrit.toFixed(1)}mm`
    : `--ak-dessin: ${dessin.toFixed(1)}mm; --ak-ecrit: ${ecrit.toFixed(1)}mm`;
  return pages.map((blocs, k) => `<div class="ak-page" style="${variables}">${enTete(blocs, k)}</div>`);
}

/**
 * L'affiche entière. `mention` est ce qu'exigent les licences des pictos
 * posés — ARASAAC par défaut ; celle des pictos du lexique, s'il y en a.
 */
export function htmlCartes(sorte: SorteCartes, brut: Partial<ReglagesCartes>, images: Record<string, string> = {}, mention = ATTRIBUTION_ARASAAC): string {
  const r = reglagesCartesSurs(sorte, brut);
  const m = MODELES_CARTES[sorte];
  const elements = lireCartes(sorte, r.lignes);
  const vues = r.pictos ? images : {};
  const credit = elements.flatMap(dessinsDe).some((cle) => vues[cle]) ? mention : "";
  const classe = `ak${r.capitales ? " ak-capitales" : ""}`;
  if (!elements.some((e) => e.forme !== "groupe")) return feuille(`<div class="page ak-page"><div class="ak-vide">Écrivez une carte par ligne.</div></div>`, classe);
  if (r.format === "etiquettes") {
    const pages: string[] = [];
    const cartes = enGroupes(elements).flatMap((g) => g.cartes.map((e, i) => ({ e, force: m.gradation ? { rang: i + 1, sur: g.cartes.length } : undefined })));
    for (let i = 0; i < cartes.length; i += 4) {
      pages.push(`<div class="page ak-planche${m.forme === "maison" ? " ak-planche-maisons" : ""}">`
        + cartes.slice(i, i + 4).map(({ e, force }, k) => carteHtml(e, m, vues, i + k + 1, "", force)).join("") + `</div>`);
    }
    return feuille(pages.join("") + credit, classe);
  }
  const pages = pagesDuMur(r, m, elements, vues);
  if (r.format === "cahier") {
    return feuille(pages.map((p) => `<div class="page ak-cahier">${`<div class="ak-petit">${p}</div>`.repeat(4)}</div>`).join("") + credit, classe);
  }
  return feuille(pages.map((p) => p.replace(`<div class="ak-page"`, `<div class="page ak-page"`)).join("") + credit, classe);
}

export const titreCartes = (sorte: SorteCartes, brut: Partial<ReglagesCartes>) =>
  reglagesCartesSurs(sorte, brut).titre.trim() || MODELES_CARTES[sorte].titre;

const NOIR = "#1c2233";
const BLEU = "#2a6fd6";
const ROUGE = "#d33a32";
const POLICE_SCRIPT = `"Andika", "Andika New Basic", "Century Gothic", "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

// La page imprimée prend toute la page utile : avec la marge du document
// (32 px de chaque côté, 28 en haut, voir print.ts), une affiche de 182 mm
// débordait, et le navigateur la réduisait en la décentrant ; une page pleine
// envoyait la mention des pictos seule sur une feuille de plus.
export const STYLE_CARTES = `
  @media print { body { padding: 0; } }
  .feuille.ak { color: ${NOIR}; font-family: ${POLICE_SCRIPT}; }
  .feuille.ak .ak-page { width: 182mm; margin: 0 auto; box-sizing: border-box; }
  .feuille.ak .ak-titre { height: 12mm; font-weight: 800; text-align: center; line-height: 12mm; margin: 0 0 3mm;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .feuille.ak .ak-groupe { display: flex; align-items: center; gap: 2.5mm; height: 7mm; box-sizing: border-box; font-size: 5.5mm; line-height: 1;
    font-weight: 800; color: ${BLEU}; margin: 0 0 3mm; border-bottom: 0.5mm solid #d5dae6; }
  .feuille.ak .ak-groupe-page { height: 13mm; font-size: 7.5mm; color: ${NOIR}; border-bottom-width: 0.8mm; }
  .feuille.ak .ak-pastille { flex: none; width: 0.9em; height: 0.9em; border-radius: 1.5mm; border: 0.4mm solid #9aa0b4; box-sizing: border-box; }
  /* La rangée garde sa hauteur : une carte trop pleine se coupe plutôt que de pousser la suite. */
  .feuille.ak .ak-rangee { display: grid; grid-template-rows: minmax(0, 1fr); gap: 3mm; margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ak .ak-carte { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; text-align: center;
    border: 0.6mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 2mm; box-sizing: border-box; min-width: 0; overflow: hidden; }
  .feuille.ak .ak-picto { width: var(--ak-dessin, 28mm); height: var(--ak-dessin, 28mm); object-fit: contain; margin: 0; flex: 0 1 auto; min-height: 0; }
  .feuille.ak .ak-mini { width: calc(var(--ak-dessin, 28mm) * 0.45); height: calc(var(--ak-dessin, 28mm) * 0.45); flex: none; }
  .feuille.ak .ak-mot { font-size: var(--ak-ecrit, 7mm); font-weight: 700; line-height: 1.15; overflow-wrap: break-word; max-width: 100%; }
  .feuille.ak .ak-detail { font-size: calc(var(--ak-ecrit, 7mm) * 0.6); color: #4a5068; line-height: 1.25; overflow-wrap: break-word; max-width: 100%; }
  .feuille.ak .ak-place { flex: none; width: 80%; height: 10mm; border: 0.5mm dashed #9aa0b4; border-radius: 2mm; box-sizing: border-box; }
  .feuille.ak .ak-graphemes { font-size: calc(var(--ak-ecrit, 7mm) * 1.5); font-weight: 800; color: ${ROUGE}; line-height: 1; }
  .feuille.ak .ak-g { color: ${ROUGE}; font-weight: 800; }
  .feuille.ak .ak-force { display: flex; gap: 1.2mm; flex: none; }
  .feuille.ak .ak-force span { width: 3mm; height: 3mm; border-radius: 50%; border: 0.4mm solid ${BLEU}; box-sizing: border-box; }
  .feuille.ak .ak-force span.ak-plein { background: ${BLEU}; }
  .feuille.ak .ak-paire { flex-direction: row; justify-content: space-around; gap: 2mm; }
  .feuille.ak .ak-moitie { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; min-width: 0; flex: 1; height: 100%; }
  .feuille.ak .ak-contre { flex: none; font-size: 7mm; font-weight: 800; color: #9aa0b4; }
  .feuille.ak .ak-famille { align-items: stretch; justify-content: flex-start; text-align: left; padding: 3mm; }
  .feuille.ak .ak-racine { display: flex; align-items: center; gap: 2mm; font-size: calc(var(--ak-ecrit, 7mm) * 1.1); font-weight: 800; color: ${BLEU};
    border-bottom: 0.5mm solid #d5dae6; padding-bottom: 1.5mm; line-height: 1.15; }
  .feuille.ak .ak-famille ul { margin: 1.5mm 0 0; padding-left: 5mm; font-size: calc(var(--ak-ecrit, 7mm) * 0.8); line-height: 1.4; }
  .feuille.ak .ak-famille b { color: ${BLEU}; }
  .feuille.ak .ak-liste .ak-graphemes { font-size: calc(var(--ak-ecrit, 7mm) * 1.3); line-height: 1.15; text-align: center;
    border-bottom: 0.5mm solid #d5dae6; padding-bottom: 1.5mm; }
  .feuille.ak .ak-liste ul { font-size: calc(var(--ak-ecrit, 7mm) * 0.85); line-height: 1.35; font-weight: 600; }
  /* La maison d'un son : le son sur le toit, chaque mot dans sa chambre. */
  .feuille.ak .ak-maison { display: flex; flex-direction: column; min-width: 0; height: 100%; box-sizing: border-box; }
  .feuille.ak .ak-toit { flex: none; height: var(--ak-toit, 18mm); background: ${ROUGE}; clip-path: polygon(50% 0, 100% 100%, 0 100%);
    display: flex; align-items: flex-end; justify-content: center; color: #fff; font-weight: 800; font-size: calc(var(--ak-toit, 18mm) * 0.42);
    line-height: 1; padding-bottom: 1mm; box-sizing: border-box; }
  .feuille.ak .ak-murs { flex: 1; display: grid; grid-template-columns: 1fr 1fr; align-content: start; gap: 2mm 1mm; border: 0.6mm solid #cfd4e2;
    border-top: none; padding: 2mm 1mm; box-sizing: border-box; min-height: 0; overflow: hidden; }
  /* Un mot sans dessin s'aligne sur ceux de sa rangée qui en ont un. */
  .feuille.ak .ak-chambre { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 1mm; text-align: center; min-width: 0; }
  .feuille.ak .ak-dessin-maison { width: var(--ak-dessin-maison, 16mm); height: var(--ak-dessin-maison, 16mm); flex: none; }
  .feuille.ak .ak-chambre .ak-mot { font-size: var(--ak-ecrit, 5mm); }
  /* Les étapes : le dessin et le texte, et parfois une case à remplir. */
  .feuille.ak .ak-etape { display: flex; align-items: center; gap: 4mm; border: 0.6mm solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 3mm;
    box-sizing: border-box; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .feuille.ak .ak-tete { display: flex; align-items: center; gap: 4mm; flex: 1; min-width: 0; }
  .feuille.ak .ak-etape .ak-picto { width: var(--ak-dessin-etape, 22mm); height: var(--ak-dessin-etape, 22mm); flex: none; }
  .feuille.ak .ak-a-remplir { align-items: stretch; }
  .feuille.ak .ak-a-remplir .ak-tete { flex: none; width: ${ETAPE_COLONNE}mm; }
  .feuille.ak .ak-zone { flex: 1; border: 0.5mm dashed #9aa0b4; border-radius: 2mm; }
  .feuille.ak .ak-num { flex: none; width: 11mm; height: 11mm; border-radius: 50%; background: ${BLEU}; color: #fff; font-weight: 800; font-size: 6mm;
    display: flex; align-items: center; justify-content: center; }
  .feuille.ak .ak-texte { flex: 1; min-width: 0; }
  .feuille.ak .ak-titre-etape { font-size: ${ETAPE_TITRE}mm; font-weight: 800; line-height: 1.2; }
  .feuille.ak .ak-etape .ak-detail { font-size: ${ETAPE_DETAIL}mm; margin-top: 1mm; color: #34394d; line-height: 1.3; }
  .feuille.ak .ak-vide { color: #687087; font-size: 5mm; padding: 10mm 0; text-align: center; }
  .feuille.ak.ak-capitales .ak-mot, .feuille.ak.ak-capitales .ak-titre-etape, .feuille.ak.ak-capitales .ak-famille li { text-transform: uppercase; }
  /* De grandes étiquettes : quatre par page, à découper. */
  .feuille.ak .ak-planche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 4mm; width: 182mm; height: 250mm; margin: 0 auto;
    box-sizing: border-box; --ak-dessin: 58mm; --ak-ecrit: 9mm; --ak-toit: 26mm; --ak-dessin-maison: 26mm; }
  .feuille.ak .ak-planche .ak-carte { border: 0.6mm dashed #9aa0b4; }
  .feuille.ak .ak-planche .ak-paire { --ak-dessin: 34mm; --ak-ecrit: 7mm; }
  .feuille.ak .ak-planche .ak-paire .ak-picto { max-width: 100%; }
  .feuille.ak .ak-planche-maisons { --ak-ecrit: 6mm; }
  /* Pour le cahier : la page du mur en petit, quatre fois, dans son pointillé de découpe. */
  .feuille.ak .ak-cahier { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); width: 182mm; height: 250mm; margin: 0 auto;
    box-sizing: border-box; }
  .feuille.ak .ak-petit { zoom: 0.48; outline: 1mm dashed #9aa0b4; outline-offset: -1.5mm; box-sizing: border-box; overflow: hidden; padding-top: 3mm; }
`;
