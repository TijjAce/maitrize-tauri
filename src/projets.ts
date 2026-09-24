// ── Les projets de classe, mois par mois ──────────────────────────────────
//
// Un projet tient une classe debout : il donne une raison aux séances, un
// horizon aux élèves, et de quoi raconter l'année aux familles. Mais il se
// décide en septembre pour l'année, ou un dimanche soir pour le mois — et
// c'est là qu'on sèche.
//
// D'où ce catalogue : des projets qui se mènent vraiment, rangés par le mois
// qui leur va, avec leurs étapes. On en prend un, il devient le sien, et l'on
// coche. Rien n'oblige à suivre la liste : un projet s'écrit aussi de zéro.

import { newId, nowIso, type ProjetClasse } from "./api";

export type { ProjetClasse };

/**
 * Les mois de l'année scolaire, dans l'ordre où on les vit.
 *
 * L'abrégé est celui de l'usage — « sept. », « avr. » —, pas les quatre
 * premières lettres, qui donnaient « Octo » et « Déce ».
 */
export const MOIS: { num: string; nom: string; abrege: string }[] = [
  { num: "09", nom: "Septembre", abrege: "sept." }, { num: "10", nom: "Octobre", abrege: "oct." },
  { num: "11", nom: "Novembre", abrege: "nov." }, { num: "12", nom: "Décembre", abrege: "déc." },
  { num: "01", nom: "Janvier", abrege: "janv." }, { num: "02", nom: "Février", abrege: "févr." },
  { num: "03", nom: "Mars", abrege: "mars" }, { num: "04", nom: "Avril", abrege: "avr." },
  { num: "05", nom: "Mai", abrege: "mai" }, { num: "06", nom: "Juin", abrege: "juin" },
];

/** Une idée du catalogue : ce qu'on propose, pas ce qu'on impose. */
export interface IdeeProjet {
  id: string;
  /** Le mois qui lui va le mieux — un conseil, pas une règle. */
  mois: string;
  theme: Theme;
  titre: string;
  /** Ce que c'est, en une phrase qu'on peut dire aux élèves. */
  pitch: string;
  domaines: string[];
  etapes: string[];
}

/** Une étape d'un projet mené : on la coche, on la déplace, on la réécrit. */
export interface Etape { texte: string; faite: boolean }

export type Etat = "idee" | "encours" | "fait";

export const ETATS: { id: Etat; nom: string }[] = [
  { id: "idee", nom: "À faire" },
  { id: "encours", nom: "En cours" },
  { id: "fait", nom: "Terminé" },
];

// ── Le catalogue ──────────────────────────────────────────────────────────
//
// Quatre-vingt-dix projets, par thème, avec le mois qui leur va le mieux —
// mais rien n'y oblige : on les pose où l'on veut dans l'année. Chacun se
// mène en classe ordinaire comme en IME ; c'est le niveau d'exigence qui
// change, pas le projet. Les étapes sont écrites pour être cochées : au
// présent, et concrètes.

export type Theme =
  | "vivre" | "langage" | "maths" | "sciences" | "arts"
  | "corps" | "autonomie" | "sorties" | "fetes";

export const THEMES: { id: Theme; nom: string; ico: string }[] = [
  { id: "vivre", nom: "Vivre ensemble", ico: "🤝" },
  { id: "langage", nom: "Langage & écrit", ico: "✏️" },
  { id: "maths", nom: "Nombres & monnaie", ico: "🔢" },
  { id: "sciences", nom: "Sciences & nature", ico: "🌿" },
  { id: "arts", nom: "Arts & culture", ico: "🎨" },
  { id: "corps", nom: "Corps & santé", ico: "🤸" },
  { id: "autonomie", nom: "Autonomie & vie quotidienne", ico: "🏠" },
  { id: "sorties", nom: "Sorties & découvertes", ico: "🚌" },
  { id: "fetes", nom: "Fêtes & saisons", ico: "🎉" },
];

export const nomDuTheme = (t: string) => THEMES.find((x) => x.id === t)?.nom ?? "Autre";
export const icoDuTheme = (t: string) => THEMES.find((x) => x.id === t)?.ico ?? "•";

/** Écrit une idée sans dérouler dix lignes : domaines et étapes séparés par « | ». */
const p = (
  id: string, mois: string, theme: Theme, titre: string, pitch: string,
  domaines: string, etapes: string,
): IdeeProjet => ({
  id, mois, theme, titre, pitch,
  domaines: domaines.split("|").map((x) => x.trim()),
  etapes: etapes.split("|").map((x) => x.trim()),
});

export const CATALOGUE: IdeeProjet[] = [
  // ── Vivre ensemble ──
  p("p-portraits", "09", "vivre", "Qui suis-je ?", "Chacun fabrique son portrait — photo, prénom, ce qu'il aime — et la porte de la classe accueille tout le monde.",
    "Langage oral|Arts|Vivre ensemble", "Photographier chaque élève|Dicter trois choses que j'aime|Fabriquer le portrait|Présenter le sien au groupe"),
  p("p-regles", "09", "vivre", "Les règles de la classe", "On écrit ensemble ce qui permet de bien travailler, plutôt que de lire une liste affichée d'avance.",
    "EMC|Langage oral", "Lister ce qui gêne et ce qui aide|Choisir cinq règles, pas plus|Illustrer chaque règle par une photo|Signer l'affiche et la relire chaque lundi"),
  p("p-metiers-classe", "09", "vivre", "Les métiers de la classe", "Distribuer, arroser, effacer : chaque semaine, chacun tient un rôle et le rend.",
    "Responsabilité|Lecture|Autonomie", "Lister ce qu'il y a à faire|Fabriquer le tableau des métiers|Tourner chaque semaine|Dire ce qui a été difficile"),
  p("p-conseil", "10", "vivre", "Le conseil d'élèves", "Un quart d'heure par semaine où l'on dit ce qui va, ce qui ne va pas, et ce qu'on propose.",
    "EMC|Langage oral|Coopération", "Installer la boîte à mots|Apprendre à demander la parole|Tenir le conseil chaque vendredi|Noter et afficher les décisions"),
  p("p-parrainage", "11", "vivre", "Le parrainage entre classes", "Chaque élève parraine un plus jeune : on lit, on joue, on accompagne.",
    "Vivre ensemble|Lecture|Estime de soi", "Trouver la classe partenaire|Former les binômes|Préparer une activité à deux|Se retrouver une fois par mois"),
  p("p-emotions", "10", "vivre", "L'imagier des émotions", "Photographier les visages de la classe pour dire ce qu'on ressent avec autre chose qu'un cri.",
    "EMC|Langage oral|Arts", "Nommer les émotions|Mimer et photographier|Fabriquer la roue des émotions|S'en servir à l'accueil"),
  p("p-coin-calme", "11", "vivre", "Le coin calme", "Aménager un endroit où l'on peut aller souffler, et écrire ensemble comment on s'en sert.",
    "EMC|Autorégulation|Arts", "Choisir l'endroit|Fabriquer ce qu'on y met|Écrire les règles du coin|Y aller quand on en a besoin"),
  p("p-difference", "01", "vivre", "Pareils et différents", "Des albums, des rencontres, et ce qu'on en retient : la différence se raconte mieux qu'elle ne s'explique.",
    "EMC|Langage oral|Littérature", "Lire trois albums sur la différence|Chercher ce qui nous rassemble|Rencontrer une association|Fabriquer l'affiche de la classe"),
  p("p-solidarite", "12", "vivre", "La collecte solidaire", "Collecter pour une association du coin, compter, porter, et voir à quoi ça sert.",
    "EMC|Mathématiques|Autonomie", "Choisir l'association|Écrire l'appel aux familles|Trier et compter les dons|Aller les porter"),
  p("p-mediateurs", "02", "vivre", "Les médiateurs de cour", "Apprendre à séparer deux camarades sans crier, et le faire pour de vrai à la récréation.",
    "EMC|Langage oral|Coopération", "Jouer des disputes en classe|Apprendre les trois questions du médiateur|Fabriquer le brassard|Assurer le tour de médiation"),

  // ── Langage & écrit ──
  p("p-bibliotheque", "09", "langage", "Notre coin lecture", "Installer, ranger et faire vivre la bibliothèque de la classe — et devenir celui qui la tient.",
    "Lecture|Tri et classement|Autonomie", "Trier les livres par genre|Fabriquer les étiquettes des bacs|Écrire la règle d'emprunt|Tenir le cahier d'emprunt"),
  p("p-correspondance", "11", "langage", "Une classe correspondante", "Écrire à une autre classe, attendre la réponse, et découvrir qu'on écrit pour être lu.",
    "Écrit|Géographie|Vivre ensemble", "Trouver la classe et se présenter|Écrire la lettre collective|Préparer un colis|Répondre à ce qui arrive"),
  p("p-livre", "04", "langage", "Le livre de la classe", "Une histoire écrite et illustrée par tous, imprimée pour de vrai, empruntée par les familles.",
    "Production d'écrit|Arts|Lecture", "Inventer l'histoire en dictée à l'adulte|Découper en pages|Illustrer|Imprimer, relier et lire ailleurs"),
  p("p-journal", "10", "langage", "Le journal de l'école", "Quatre pages par trimestre : des articles, des photos, et des lecteurs qui attendent.",
    "Écrit|Numérique|Coopération", "Choisir les rubriques|Enquêter et écrire|Mettre en page|Distribuer aux familles"),
  p("p-radio", "01", "langage", "La radio de la classe", "Enregistrer une émission de cinq minutes : chronique, interview, musique.",
    "Langage oral|Numérique|Écoute", "Écrire le conducteur|S'entraîner à lire à voix haute|Enregistrer|Diffuser aux autres classes"),
  p("p-poesie", "03", "langage", "Le mur de poésie", "Une poésie par semaine, apprise, dite, et affichée dans le couloir.",
    "Littérature|Langage oral|Mémoire", "Choisir les poésies ensemble|Apprendre et dire|Illustrer|Afficher et changer chaque semaine"),
  p("p-abecedaire", "02", "langage", "L'abécédaire de la classe", "Une lettre, un mot, une photo : l'alphabet fabriqué avec ce qui nous entoure.",
    "Lecture|Arts|Vocabulaire", "Chercher un mot par lettre|Photographier l'objet|Fabriquer la page|Relier l'abécédaire"),
  p("p-contes", "12", "langage", "Raconter un conte", "Apprendre un conte par cœur et aller le raconter aux plus jeunes, sans livre.",
    "Langage oral|Littérature|Mémoire", "Choisir le conte|Le raconter avec des images|S'entraîner à deux|Aller le raconter"),
  p("p-recettes", "05", "langage", "Le livre de recettes", "Chacun apporte une recette de chez lui ; on la cuisine, on la photographie, on l'écrit.",
    "Écrit|Cuisine|Cultures", "Recueillir les recettes des familles|Cuisiner en classe|Photographier les étapes|Fabriquer le livre"),
  p("p-mots-valises", "03", "langage", "La boîte à mots nouveaux", "Chaque mot rencontré qui plaît entre dans la boîte, et ressort le vendredi.",
    "Vocabulaire|Écrit|Mémoire", "Fabriquer la boîte|Y glisser les mots de la semaine|Les relire le vendredi|Les réutiliser dans une phrase"),

  // ── Nombres & monnaie ──
  p("p-marchande", "04", "maths", "La marchande", "Un vrai coin marchand dans la classe : étiqueter, acheter, payer, rendre la monnaie.",
    "Monnaie|Langage oral|Autonomie", "Installer le coin et étiqueter|Fabriquer la monnaie|Jouer les rôles à tour de rôle|Aller acheter pour de vrai"),
  p("p-marche", "12", "maths", "Le petit marché de Noël", "Fabriquer, afficher les prix, vendre aux familles et compter la recette.",
    "Monnaie|Fabrication|Langage oral", "Fabriquer les objets|Fixer et écrire les prix|Préparer le stand|Vendre et compter la caisse"),
  p("p-cantine", "10", "maths", "Combien à la cantine ?", "Compter les présents, les absents, les repas : un rituel de nombres qui sert vraiment.",
    "Dénombrement|Lecture de tableau|Autonomie", "Faire l'appel chaque matin|Compter les repas|Reporter sur le tableau|Porter le chiffre au bureau"),
  p("p-calendrier", "09", "maths", "Le calendrier de la classe", "Fabriquer le calendrier de l'année et y poser les anniversaires, les sorties, les vacances.",
    "Se repérer dans le temps|Nombres|Arts", "Fabriquer les douze mois|Placer les anniversaires|Marquer vacances et sorties|Barrer les jours écoulés"),
  p("p-mesures", "03", "maths", "On mesure tout", "La classe, les élèves, la cour : mesurer, comparer, ranger du plus petit au plus grand.",
    "Mesures|Comparaison|Écrit", "Mesurer les élèves|Mesurer la classe et la cour|Comparer et ranger|Refaire en juin et comparer"),
  p("p-budget", "05", "maths", "Le budget de la sortie", "Savoir combien coûte une sortie, ce qu'il faut réunir, et comment on y arrive.",
    "Monnaie|Calcul|Autonomie", "Lister ce qu'il faut payer|Additionner|Chercher comment financer|Vérifier après la sortie"),
  p("p-jeux-maths", "11", "maths", "Le rallye mathématiques", "Des défis affichés dans le couloir, une équipe par classe, et un classement.",
    "Résolution de problèmes|Coopération", "Choisir les défis|Former les équipes|Chercher chaque semaine|Afficher les résultats"),
  p("p-galette", "01", "maths", "La galette à partager", "Une recette, un partage en parts égales, et la couronne à fabriquer.",
    "Mathématiques|Cuisine|Arts", "Lire la recette et acheter|Préparer et cuire|Partager en parts égales|Fabriquer la couronne"),
  p("p-kermesse", "06", "maths", "La kermesse de la classe", "Des stands tenus par les élèves : expliquer la règle, encaisser, remettre en jeu.",
    "Coopération|Monnaie|Langage oral", "Inventer les stands|Fabriquer le matériel|Tenir son stand à deux|Ranger et compter"),
  p("p-horloge", "02", "maths", "L'heure de la classe", "Fabriquer une horloge, marquer les moments de la journée, et savoir quand on fait quoi.",
    "Se repérer dans le temps|Lecture de l'heure", "Fabriquer l'horloge|Photographier chaque moment|Associer heure et activité|Annoncer les changements"),

  // ── Sciences & nature ──
  p("p-semis", "11", "sciences", "Le jardin d'intérieur", "Des semis sur le rebord de la fenêtre : arroser, observer, mesurer, et voir que ça pousse.",
    "Sciences|Mesures|Responsabilité", "Semer lentilles ou blé|Tenir le tour d'arrosage|Mesurer chaque semaine|Comparer selon la lumière"),
  p("p-bulbe", "03", "sciences", "Du bulbe à la fleur", "Planter, mesurer chaque semaine, photographier, et voir le temps passer sur une tige.",
    "Sciences|Mesures|Patience", "Planter les bulbes|Mesurer et photographier|Tenir le graphique|Offrir ou replanter la fleur"),
  p("p-oiseaux", "01", "sciences", "Les oiseaux de l'hiver", "Une mangeoire à la fenêtre, et le comptage des visiteurs chaque matin.",
    "Sciences|Dénombrement|Observation", "Fabriquer la mangeoire|Reconnaître cinq oiseaux|Compter chaque jour|Faire le tableau du mois"),
  p("p-cueillette", "10", "sciences", "La cueillette d'automne", "Une sortie, un sac, et tout ce qu'on rapporte devient un herbier et un coin nature.",
    "Sciences|Vocabulaire|Motricité fine", "Préparer la sortie|Ramasser feuilles et fruits|Trier par forme et couleur|Coller et nommer dans l'herbier"),
  p("p-potager", "04", "sciences", "Le potager de l'école", "Un carré de terre, des semis, de la patience — et une récolte qu'on mange.",
    "Sciences|Responsabilité|Cuisine", "Préparer le carré|Semer et étiqueter|Arroser et désherber|Récolter et cuisiner"),
  p("p-meteo", "09", "sciences", "La météo de la classe", "Relever le temps chaque jour, tenir le tableau, et voir les saisons apparaître.",
    "Sciences|Lecture de tableau|Rituel", "Fabriquer les symboles|Relever chaque matin|Remplir le tableau du mois|Comparer les mois"),
  p("p-eau", "05", "sciences", "L'eau dans tous ses états", "Glace, liquide, vapeur : des expériences simples et ce qu'on en déduit.",
    "Sciences|Écrit|Observation", "Faire geler et fondre|Faire s'évaporer|Dessiner ce qu'on observe|Écrire ce qu'on a compris"),
  p("p-dechets", "02", "sciences", "Où vont nos déchets ?", "Peser ce que la classe jette, trier, et réduire pour de vrai.",
    "Sciences|EMC|Mesures", "Peser la poubelle d'une semaine|Installer le tri|Visiter la déchetterie|Repeser un mois plus tard"),
  p("p-elevage", "03", "sciences", "L'élevage de la classe", "Phasmes, escargots ou vers de terre : nourrir, observer, tenir le carnet.",
    "Sciences|Responsabilité|Écrit", "Installer le terrarium|Nourrir à tour de rôle|Observer et dessiner|Relâcher à la fin"),
  p("p-ciel", "01", "sciences", "Le jour et la nuit", "Pourquoi il fait noir plus tôt : observer, noter l'heure du coucher du soleil, comprendre.",
    "Sciences|Mesures|Se repérer dans le temps", "Noter l'heure du coucher chaque semaine|Fabriquer le tableau|Manipuler globe et lampe|Expliquer à une autre classe"),

  // ── Arts & culture ──
  p("p-ombres", "04", "arts", "Le théâtre d'ombres", "Un album connu, des silhouettes en carton, un drap et une lampe.",
    "Arts|Langage oral|Coopération", "Choisir l'album|Fabriquer les silhouettes|Répéter derrière le drap|Jouer devant une autre classe"),
  p("p-exposition", "05", "arts", "L'exposition de la classe", "Accrocher ce qu'on a produit toute l'année et accueillir les visiteurs comme au musée.",
    "Arts|Langage oral|Estime de soi", "Choisir les travaux|Écrire les cartels|Accrocher et éclairer|Faire visiter, en guide"),
  p("p-fresque", "03", "arts", "La fresque du couloir", "Un grand mur, un projet commun, et la trace qui reste après nous.",
    "Arts|Coopération|Motricité", "Choisir le thème|Dessiner la maquette|Peindre par équipes|Inaugurer avec l'école"),
  p("p-musique", "11", "arts", "L'orchestre de la classe", "Fabriquer ses instruments, trouver un rythme, et jouer ensemble sans se marcher dessus.",
    "Musique|Fabrication|Écoute", "Fabriquer les instruments|Trouver un rythme commun|Répéter|Jouer devant une classe"),
  p("p-landart", "10", "arts", "Land art dans la cour", "Des feuilles, des cailloux, une photo : de l'art qui ne dure pas et qu'on garde en image.",
    "Arts|Sciences|Photographie", "Regarder des œuvres de land art|Ramasser dans la cour|Composer à plusieurs|Photographier et afficher"),
  p("p-musee", "02", "arts", "Le musée de la classe", "Chacun apporte un objet qui compte pour lui, écrit son cartel, et le musée ouvre.",
    "Arts|Écrit|Langage oral", "Choisir l'objet|Écrire le cartel|Installer les vitrines|Ouvrir aux familles"),
  p("p-photo", "05", "arts", "Le défi photo", "Un mot par semaine — « rond », « haut », « vieux » — et une photo pour y répondre.",
    "Arts|Numérique|Vocabulaire", "Choisir les mots|Photographier dans l'école|Choisir la meilleure|Afficher la série"),
  p("p-danse", "06", "arts", "La danse de l'école", "Une chorégraphie simple apprise par tous, dansée dans la cour en fin d'année.",
    "EPS|Musique|Coopération", "Choisir la musique|Apprendre les pas|Répéter avec les autres classes|Danser dans la cour"),
  p("p-cinema", "01", "arts", "Le film d'animation", "Vingt-quatre images par seconde, des personnages en pâte à modeler, et beaucoup de patience.",
    "Arts|Numérique|Langage oral", "Écrire l'histoire en trois plans|Fabriquer décors et personnages|Photographier image par image|Monter et projeter"),
  p("p-spectacle", "12", "arts", "Un moment pour les familles", "Trois chants, une danse, et le trac : préparer quelque chose à offrir.",
    "Musique|Langage oral|EPS", "Choisir les chants|Répéter chaque jour|Fabriquer les invitations|Jouer devant les familles"),

  // ── Corps & santé ──
  p("p-parcours", "02", "corps", "Le parcours de motricité", "Les élèves conçoivent le parcours, le dessinent, le montent, puis le font passer aux autres.",
    "EPS|Repérage dans l'espace|Langage oral", "Dessiner le parcours|Installer comme sur le plan|Expliquer les règles|Chronométrer et améliorer"),
  p("p-corps", "02", "corps", "Mon corps, mon squelette", "Nommer ce qu'on a sous la peau, tracer sa silhouette en vrai, et prendre soin de soi.",
    "Sciences|Vocabulaire|Santé", "Tracer les silhouettes au sol|Nommer les parties du corps|Observer un squelette|Parler du sommeil et des repas"),
  p("p-petitdej", "11", "corps", "Le petit déjeuner de la classe", "Préparer et partager un vrai petit déjeuner, et parler de ce qui nous fait tenir la matinée.",
    "Santé|Cuisine|Mathématiques", "Lister ce qu'on mange le matin|Faire les courses|Préparer ensemble|Parler de ce qui nourrit"),
  p("p-relaxation", "01", "corps", "Le calme du matin", "Cinq minutes de respiration et d'étirements pour entrer dans la journée.",
    "Santé|Autorégulation|EPS", "Apprendre trois exercices|Fabriquer les cartes|Faire le rituel chaque matin|Dire ce que ça change"),
  p("p-velo", "05", "corps", "Savoir rouler", "Le vélo ou la trottinette dans la cour : équilibre, freinage, règles de circulation.",
    "EPS|Sécurité routière|Autonomie", "Vérifier le matériel et le casque|Travailler l'équilibre|Installer un parcours de rue|Rouler dehors en groupe"),
  p("p-natation", "03", "corps", "Le projet piscine", "Préparer le cycle : le vestiaire, l'eau, la peur — et ce qu'on saura à la fin.",
    "EPS|Autonomie|Langage oral", "Préparer le sac et le vestiaire|Nommer les peurs|Fixer son objectif|Faire le bilan de son cycle"),
  p("p-hygiene", "10", "corps", "Se laver les mains, vraiment", "Une affiche fabriquée par la classe, et un rituel qui tient toute l'année.",
    "Santé|Écrit|Autonomie", "Observer ce qui reste sur les mains|Apprendre les six gestes|Fabriquer l'affiche|Tenir le rituel"),
  p("p-jeuxcour", "09", "corps", "Les jeux de la cour", "Apprendre et transmettre des jeux collectifs, pour que la récréation ne soit pas un désert.",
    "EPS|Coopération|Langage oral", "Apprendre cinq jeux|Écrire les règles|Tracer au sol|Apprendre aux plus jeunes"),
  p("p-carnaval", "02", "corps", "Le carnaval", "Fabriquer son masque, défiler dans l'école, et se voir autrement.",
    "Arts|Langage oral|Vivre ensemble", "Choisir son personnage|Fabriquer masque et costume|Préparer le défilé|Défiler et photographier"),
  p("p-cinqsens", "12", "corps", "Les cinq sens", "Des ateliers pour goûter, sentir, toucher les yeux bandés — et mettre des mots dessus.",
    "Sciences|Vocabulaire|Langage oral", "Installer un atelier par sens|Passer dans chaque atelier|Décrire ce qu'on perçoit|Fabriquer la boîte à toucher"),

  // ── Autonomie & vie quotidienne ──
  p("p-soupe", "10", "autonomie", "La soupe de la classe", "De la liste de courses au bol partagé : peser, éplucher, cuire, goûter.",
    "Mesures|Lecture de consigne|Autonomie", "Lire la recette en images|Écrire la liste de courses|Peser et éplucher|Cuisiner et goûter"),
  p("p-transports", "05", "autonomie", "Prendre le bus", "Lire un horaire, reconnaître sa ligne, valider son titre : une compétence pour la vie.",
    "Autonomie|Lecture|Mathématiques", "Regarder lignes et arrêts|Lire l'horaire|Faire le trajet en groupe|Refaire en petits groupes"),
  p("p-courses", "03", "autonomie", "Faire les courses", "Une liste, un caddie, une caisse : acheter pour la classe, du début à la fin.",
    "Monnaie|Lecture|Autonomie", "Écrire la liste|Repérer les rayons|Payer en caisse|Ranger et vérifier"),
  p("p-linge", "01", "autonomie", "Le linge de la classe", "Laver, étendre, plier les serviettes et les tabliers : des gestes qui servent partout.",
    "Autonomie|Motricité fine|Responsabilité", "Trier le linge|Lancer la machine|Étendre et plier|Tenir le tour de rôle"),
  p("p-telephone", "04", "autonomie", "Téléphoner", "Appeler pour demander un horaire, réserver, ou prévenir : préparer, oser, recommencer.",
    "Langage oral|Autonomie|Écrit", "Écrire ce qu'on va dire|S'entraîner à deux|Appeler pour de vrai|Noter la réponse"),
  p("p-courrier", "11", "autonomie", "Le courrier", "Affranchir, adresser, poster — et suivre une lettre jusqu'à son arrivée.",
    "Écrit|Autonomie|Géographie", "Écrire la lettre|Copier l'adresse|Acheter le timbre|Poster et attendre la réponse"),
  p("p-rangement", "09", "autonomie", "Chaque chose à sa place", "Photographier, étiqueter, ranger : une classe où l'on retrouve ce qu'on cherche.",
    "Autonomie|Tri et classement|Lecture", "Photographier chaque bac rangé|Fabriquer les étiquettes|Ranger ensemble|Vérifier chaque vendredi"),
  p("p-secours", "02", "autonomie", "Apprendre à alerter", "Le 15, le 18, le 112 : qui appeler, quoi dire, et s'entraîner pour de vrai.",
    "Santé|Langage oral|EMC", "Apprendre les numéros|Écrire ce qu'on doit dire|S'entraîner à deux|Fabriquer l'affiche"),
  p("p-cuisine", "12", "autonomie", "L'atelier cuisine du mois", "Une recette par mois, du plus simple au plus long, avec la fiche en images.",
    "Cuisine|Lecture de consigne|Mesures", "Choisir la recette du mois|Faire les courses|Cuisiner en petits groupes|Écrire la fiche en images"),
  p("p-agenda", "09", "autonomie", "Mon agenda à moi", "Tenir son agenda, noter ce qui arrive, préparer son sac la veille.",
    "Se repérer dans le temps|Écrit|Autonomie", "Personnaliser son agenda|Noter chaque jour|Préparer le sac la veille|Vérifier à deux le vendredi"),

  // ── Sorties & découvertes ──
  p("p-quartier", "05", "sorties", "Le plan du quartier", "Sortir, repérer, photographier, puis fabriquer la maquette de ce qu'on a vu.",
    "Se repérer dans l'espace|Motricité fine|Vocabulaire", "Marcher et photographier|Repérer sur un plan|Fabriquer la maquette|Y placer les lieux connus"),
  p("p-sortie", "03", "sorties", "Préparer une sortie", "La ferme, le musée, la médiathèque : ce sont les élèves qui préparent, pas seulement qui suivent.",
    "Autonomie|Langage oral|Se repérer", "Choisir le lieu et le trajet|Écrire les questions|Préparer le sac et les règles|Raconter au retour"),
  p("p-mediatheque", "10", "sorties", "La médiathèque, pour de vrai", "S'inscrire, choisir, emprunter, rendre : devenir lecteur au-dehors.",
    "Lecture|Autonomie|Vivre ensemble", "Visiter et rencontrer le bibliothécaire|S'inscrire|Emprunter un livre chacun|Rendre à la date"),
  p("p-metiers", "03", "sorties", "Les métiers autour de nous", "Faire venir quelqu'un qui travaille, l'interroger, et comprendre à quoi mènent les apprentissages.",
    "EMC|Langage oral|Orientation", "Lister les métiers connus|Préparer l'interview|Mener l'entretien|Afficher la fiche du métier"),
  p("p-ferme", "04", "sorties", "Une journée à la ferme", "Voir, toucher, nourrir : ce que les images ne remplacent pas.",
    "Sciences|Langage oral|Autonomie", "Choisir la ferme et écrire|Préparer les questions|Passer la journée|Fabriquer l'album de la sortie"),
  p("p-marcher", "06", "sorties", "La randonnée de fin d'année", "Marcher ensemble une demi-journée, avec son sac et son pique-nique.",
    "EPS|Autonomie|Sciences", "Choisir le parcours|Préparer le sac|Marcher et observer|Raconter en photos"),
  p("p-patrimoine", "05", "sorties", "Le monument de la ville", "Une visite, un croquis, une maquette : ce qui tient debout depuis longtemps.",
    "Histoire|Arts|Langage oral", "Visiter le monument|Croquer sur place|Chercher son histoire|Fabriquer la maquette"),
  p("p-cinema-sortie", "01", "sorties", "Aller au cinéma", "Le trajet, le billet, le noir, et ce qu'on en dit après.",
    "Autonomie|Langage oral|Arts", "Choisir le film|Préparer le trajet|Voir le film|En débattre en classe"),
  p("p-pompiers", "11", "sorties", "La caserne des pompiers", "Voir le camion, le matériel, et rencontrer ceux qui viennent quand ça va mal.",
    "EMC|Sécurité|Langage oral", "Écrire pour demander la visite|Préparer les questions|Visiter|Raconter aux autres classes"),
  p("p-gare", "02", "sorties", "La gare et le train", "Lire un tableau d'affichage, composter, monter : un trajet en vrai.",
    "Autonomie|Lecture|Mathématiques", "Lire les horaires|Acheter le billet|Faire un trajet court|Raconter le voyage"),

  // ── Fêtes & saisons ──
  p("p-avent", "12", "fetes", "Le calendrier des défis", "Chaque jour, une enveloppe : un défi coopératif à relever en dix minutes.",
    "EMC|Motricité|Coopération", "Écrire vingt-quatre défis|Fabriquer les enveloppes|Relever le défi du jour|Noter les réussites"),
  p("p-voeux", "01", "fetes", "Les cartes de vœux", "Écrire à quelqu'un qu'on aime, mettre l'adresse, et poster soi-même.",
    "Écrit|Geste graphique|Autonomie", "Choisir à qui écrire|Fabriquer la carte|Copier l'adresse|Aller à la boîte aux lettres"),
  p("p-souvenirs", "11", "fetes", "La boîte à souvenirs", "Chaque semaine, la classe choisit une trace à garder — et en juin, on ouvre la boîte.",
    "Se repérer dans le temps|Écrit|Mémoire", "Décorer la boîte|Choisir une trace le vendredi|Dicter la légende|Relire le mois écoulé"),
  p("p-anniversaires", "09", "fetes", "Les anniversaires de l'année", "Un gâteau par mois, une bougie, et le calendrier qui sert à quelque chose.",
    "Se repérer dans le temps|Cuisine|Vivre ensemble", "Placer les anniversaires|Fabriquer la couronne|Cuisiner le gâteau du mois|Chanter ensemble"),
  p("p-printemps", "03", "fetes", "Le réveil du printemps", "Sortir, regarder ce qui change, et fabriquer la décoration de la classe.",
    "Sciences|Arts|Vocabulaire", "Observer les bourgeons|Photographier chaque semaine|Fabriquer les décors|Comparer avec l'hiver"),
  p("p-fetefamilles", "06", "fetes", "La fête des familles", "Inviter, accueillir, servir : la classe reçoit pour de vrai.",
    "Vivre ensemble|Cuisine|Langage oral", "Écrire les invitations|Préparer le buffet|Accueillir et servir|Ranger ensemble"),
  p("p-film", "06", "fetes", "Le film de l'année", "Les photos de l'année, remises dans l'ordre et commentées par ceux qui y étaient.",
    "Se repérer dans le temps|Langage oral|Numérique", "Choisir les photos de chaque mois|Les remettre dans l'ordre|Enregistrer les commentaires|Projeter aux familles"),
  p("p-reussites", "06", "fetes", "Mon livret de réussites", "Chacun choisit ce dont il est fier cette année et le présente — c'est lui qui parle de lui.",
    "Estime de soi|Écrit|Langage oral", "Retrouver ses travaux|Choisir cinq réussites|Écrire pourquoi|Présenter son livret"),
  p("p-halloween", "10", "fetes", "La nuit et les monstres", "Des albums qui font peur, des masques, et le plaisir d'avoir peur pour de faux.",
    "Littérature|Arts|Langage oral", "Lire trois albums|Fabriquer son monstre|Inventer une histoire|La raconter dans le noir"),
  p("p-nouvelan", "01", "fetes", "Les nouvelles années du monde", "Le nouvel an chinois, le nouvel an juif : d'autres calendriers, d'autres fêtes.",
    "Cultures|Géographie|Arts", "Chercher trois nouvels ans|Situer les pays|Fabriquer une décoration|Goûter une spécialité"),
];

// ── Lire le catalogue ─────────────────────────────────────────────────────

/** Le mois de l'année scolaire où l'on se trouve, au format « 09 ». */
export function moisCourant(quand = new Date()): string {
  return String(quand.getMonth() + 1).padStart(2, "0");
}

/** Le nom du mois, tel qu'on le dit. */
export const nomDuMois = (num: string) => MOIS.find((m) => m.num === num)?.nom ?? "Hors année";

/** Les idées d'un mois donné. */
export const ideesDuMois = (mois: string) => CATALOGUE.filter((i) => i.mois === mois);

/**
 * Les idées qui répondent à une recherche, sans accents ni casse.
 *
 * On cherche dans le titre, la phrase et les domaines : « monnaie » doit
 * remonter le marché de Noël comme la marchande, qui ne portent pas le mot
 * dans leur titre.
 */
export function chercherIdees(recherche: string, aplatir: (s: string) => string): IdeeProjet[] {
  const q = aplatir(recherche).trim();
  if (!q) return [];
  const mots = q.split(/\s+/).filter(Boolean);
  return CATALOGUE.filter((i) => {
    const foin = aplatir([i.titre, i.pitch, i.domaines.join(" ")].join(" "));
    return mots.every((mot) => foin.includes(mot));
  });
}

// ── L'année, semaine par semaine ──────────────────────────────────────────

/**
 * L'année civile d'un mois de l'année scolaire.
 *
 * « 2026-2027 » : septembre est en 2026, janvier en 2027. Sans cela, poser un
 * projet en janvier le renverrait huit mois en arrière.
 */
export function anneeDuMois(anneeScolaire: string, mois: string): number {
  const [debut, fin] = anneeScolaire.split("-").map(Number);
  const maintenant = new Date().getFullYear();
  return Number(mois) >= 8 ? (debut || maintenant) : (fin || maintenant + 1);
}

/** Une semaine de classe : son lundi, et ce qu'on lit dessus. */
export interface Semaine { iso: string; label: string }

/**
 * Les semaines d'un mois : un lundi par ligne, du premier au dernier.
 *
 * On ne retient que les lundis qui tombent dans le mois : une semaine à
 * cheval appartient au mois où elle commence, comme dans un agenda.
 */
export function semainesDuMois(anneeScolaire: string, mois: string): Semaine[] {
  const an = anneeDuMois(anneeScolaire, mois);
  const m = Number(mois) - 1;
  const sortie: Semaine[] = [];
  const d = new Date(an, m, 1);
  // Reculer jusqu'au lundi, puis avancer de sept en sept.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  while (d.getMonth() !== m || d.getFullYear() !== an) d.setDate(d.getDate() + 7);
  while (d.getMonth() === m && d.getFullYear() === an) {
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 4);
    sortie.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      label: `${d.getDate()} au ${fin.getDate()}`,
    });
    d.setDate(d.getDate() + 7);
  }
  return sortie;
}

// ── Mener un projet ───────────────────────────────────────────────────────

/** Relit les étapes enregistrées ; une valeur abîmée n'en perd pas le reste. */
export function lireEtapes(json: string): Etape[] {
  try {
    const v = JSON.parse(json || "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((x): Etape[] => {
      if (typeof x === "string") return [{ texte: x, faite: false }];
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      return [{ texte: typeof o.texte === "string" ? o.texte : "", faite: o.faite === true }];
    }).filter((e) => e.texte.trim() !== "");
  } catch {
    return [];
  }
}

export const ecrireEtapes = (e: Etape[]) => JSON.stringify(e);

/** Un projet neuf, à partir d'une idée du catalogue. */
export function depuisIdee(idee: IdeeProjet, annee: string): ProjetClasse {
  return {
    id: newId(), titre: idee.titre, descriptif: idee.pitch, couleur: "indigo",
    dateCreation: nowIso(), annee, imageNom: null, mois: idee.mois, semaine: "", etat: "idee",
    etapesJson: ecrireEtapes(idee.etapes.map((texte) => ({ texte, faite: false }))),
    domaines: idee.domaines.join(", "), origine: idee.id,
  };
}

/** Un projet neuf, écrit de zéro. */
export function projetVierge(mois: string, annee: string): ProjetClasse {
  return {
    id: newId(), titre: "", descriptif: "", couleur: "indigo", dateCreation: nowIso(),
    annee, imageNom: null, mois, semaine: "", etat: "idee", etapesJson: "[]", domaines: "", origine: "",
  };
}

/**
 * Pose un projet sur un mois, ou sur une semaine précise.
 *
 * Poser sur une semaine fixe aussi le mois : les deux ne peuvent pas se
 * contredire, et c'est le mois qui range la liste.
 */
export function placer(p: ProjetClasse, mois: string, semaine = ""): ProjetClasse {
  return { ...p, mois, semaine };
}

/** Où en est un projet : les étapes cochées sur le total. */
export function avancement(etapes: Etape[]): { faites: number; total: number; part: number } {
  const total = etapes.length;
  const faites = etapes.filter((e) => e.faite).length;
  return { faites, total, part: total === 0 ? 0 : faites / total };
}

/**
 * L'état que le projet devrait porter, vu ses étapes.
 *
 * Personne ne pense à changer l'état : il se déduit de ce qu'on coche. Un
 * projet qu'on a déclaré terminé le reste, même s'il garde une étape en
 * suspens — c'est le seul cas où l'enseignant a dit quelque chose.
 */
export function etatDeduit(etat: string, etapes: Etape[]): Etat {
  if (etat === "fait") return "fait";
  const { faites, total } = avancement(etapes);
  if (total > 0 && faites === total) return "fait";
  return faites > 0 ? "encours" : (etat === "encours" ? "encours" : "idee");
}

/** Les projets d'un mois, puis ceux qui n'en ont pas. */
export function rangerParMois(projets: ProjetClasse[]): { mois: string; projets: ProjetClasse[] }[] {
  const groupes = MOIS.map((m) => ({ mois: m.num, projets: projets.filter((p) => p.mois === m.num) }));
  const sansMois = projets.filter((p) => !MOIS.some((m) => m.num === p.mois));
  return sansMois.length ? [...groupes, { mois: "", projets: sansMois }] : groupes;
}
