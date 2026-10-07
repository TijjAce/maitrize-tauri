// Le catalogue des ateliers de Fabriquer : leurs onglets, leurs familles, ce que chacun fabrique.
//
// Il vit à part de la page : d'autres écrans le lisent — la fiche d'une séquence nomme les ateliers où elle va piocher.

export const ONGLETS = [
  "jeux", "memory", "imagier", "categoriser", "suites", "etiquettes", "ombres", "oeilDeLynx",
  "sons", "lotoSyllabes", "dominos", "intrus", "paires", "fluence", "voixHaute", "syllabaire", "lettres", "gestes", "motsGestes", "syllabeManquante",
  "comprehension", "lecteur", "orthographe", "ecrire", "grammaire", "tri", "phrases", "trous", "motsMeles", "cursive",
  "martiniere", "compteEstBon", "pyramides", "partieTout", "multiplicatifs", "coloriage", "collections", "nombres", "cubes", "comparer", "calcul", "arbre", "posees", "fractions", "oie", "heure", "monnaie", "mesures", "geometrie", "solides", "deplacements", "donnees", "numeration",
  "carteMentale",
] as const;
export type Onglet = typeof ONGLETS[number];

/**
 * Les ateliers, rangés par famille.
 *
 * Une rangée d'onglets s'allonge à chaque nouveau générateur et finit par ne
 * plus rien dire : « 🎲 Loto » ne dit pas ce qu'on obtient, et il faut ouvrir
 * pour savoir. La page s'ouvre donc sur les ateliers eux-mêmes, chacun disant
 * ce qu'il fabrique — puis l'on entre dans celui qu'on veut.
 */
export interface Outil {
  id: Onglet;
  nom: string;
  icone: string;
  /** Ce qu'on obtient, en une phrase : c'est la question qu'on se pose. */
  quoi: string;
  /** Vrai si l'atelier a besoin de la banque de pictogrammes. */
  pictos?: boolean;
  /** Pour qui : « Cycle 2 », « Cycles 2 et 3 »… */
  cycles?: string;
}

export const FAMILLES: { id: string; libelle: string; aide: string; outils: Outil[] }[] = [
  {
    id: "langage", libelle: "🗣 Langage",
    aide: "Vocabulaire et désignation à partir des pictogrammes.",
    outils: [
      { id: "jeux", nom: "Loto", icone: "🎲", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des planches et leurs cartes à découper : les pictogrammes d'un thème, ou vos propres images." },
      { id: "memory", nom: "Mémory", icone: "🃏", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des paires à retourner : image et image, ou image et mot." },
      { id: "imagier", nom: "Imagier", icone: "📖", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Une page d'images légendées, à afficher ou à coller dans un cahier." },
      { id: "categoriser", nom: "Catégoriser les mots", icone: "🗂", pictos: true, cycles: "Cycle 1",
        quoi: "Les jeux d'Éduscol pour ranger les mots en catégories : boîtes de tri, intrus, loto aveugle, « J'appelle… », familles, mistigri — et leur séquence." },
      { id: "suites", nom: "Images séquentielles", icone: "🎞", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Remettre dans l'ordre une histoire, un geste, une recette : les images à découper et les cases à remplir, en colonne ou fléchées — des pictos ou vos photos." },
      { id: "etiquettes", nom: "Étiquettes à catégoriser", icone: "🏷", cycles: "Cycles 2 et 3",
        quoi: "Les mots collectés en grand pour le tableau, en petit par enveloppe, et la corolle lexicale." },
      { id: "ombres", nom: "Jeu des ombres", icone: "👤", cycles: "Cycles 1 et 2",
        quoi: "Chaque image retrouve sa silhouette : à poser dessus, ou à relier. Pictogrammes ou vos propres images." },
    ],
  },
  {
    id: "observation", libelle: "👁 Observation",
    aide: "Observer, comparer, retrouver : l'attention visuelle qu'on exerce avant de lire, et pendant.",
    outils: [
      { id: "oeilDeLynx", nom: "Œil de lynx", icone: "👁", pictos: true, cycles: "Cycles 1 à 3",
        quoi: "Des modèles à retrouver dans une image pleine de dessins, et à entourer : cinq niveaux — tailles, sens, sosies, noir et blanc —, la version « combien de fois ? », et le corrigé." },
    ],
  },
  {
    id: "sons", libelle: "🔤 Sons et lecture",
    aide: "Ce que les guides de lecture font manipuler : syllabes, sons, lettres, fluence.",
    outils: [
      { id: "sons", nom: "Fiches de sons", icone: "🔤", cycles: "Cycle 2",
        quoi: "Syllabes, mots à lire, à entourer, à compléter — une fiche par graphème." },
      { id: "lotoSyllabes", nom: "Loto des syllabes", icone: "🎯", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des cases qui imposent un nombre de syllabes : on pioche une image, on scande, on compte." },
      { id: "dominos", nom: "Dominos des syllabes", icone: "🁡", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "La fin d'une image commence la suivante : micro – crocodile." },
      { id: "intrus", nom: "Chasse à l'intrus", icone: "🔍", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Trois mots qui commencent pareil, un intrus à entourer : bateau, banane, tapis, ballon." },
      { id: "paires", nom: "Paires de mots proches", icone: "👂", pictos: true, cycles: "Cycle 2",
        quoi: "Mouche / mousse, chou / joue : les cartes du trésor et du téléphone." },
      { id: "fluence", nom: "Grille de fluence", icone: "⏱", cycles: "Cycles 2 et 3",
        quoi: "Syllabes, pseudo-mots et mots à lire en une minute, le score noté chaque jour — à l'étape choisie de la progression des guides CP et CE1." },
      { id: "voixHaute", nom: "Lire à voix haute", icone: "🎙", cycles: "Cycle 2",
        quoi: "Des phrases à préparer, codées ou à coder — liaisons, ponctuation et intonation, phrase sur plusieurs lignes, groupes de souffle —, la grille du binôme, le texte partition de la fable du CE2." },
      { id: "syllabaire", nom: "Syllabaire", icone: "🛗", cycles: "Cycle 2",
        quoi: "Le jeu de l'ascenseur : deux bandes qui glissent, la syllabe apparaît." },
      { id: "lettres", nom: "Les lettres", icone: "🔠", cycles: "Cycles 1 et 2",
        quoi: "Mémory, mistigri et loto des lettres, majuscule et minuscule ; la planche de l'ophtalmologue." },
      { id: "gestes", nom: "Gestes Borel-Maisonny", icone: "🤲", cycles: "Cycles 1 et 2",
        quoi: "Vos images des gestes en cartes à découper : petites pour les mains, grandes pour le tableau — et, d'un clic, en loto ou en mémory." },
      { id: "motsGestes", nom: "Mots codés en gestes", icone: "🫱", cycles: "Cycle 2",
        quoi: "La fiche d'un son en gestes Borel-Maisonny : colorier le bon dessin, relier au bon mot, ou écrire le mot." },
      { id: "syllabeManquante", nom: "La syllabe qui manque", icone: "🧩", pictos: true, cycles: "Cycle 2",
        quoi: "Sous chaque dessin, le mot avec un trou : écrire ma, mi ou mu. Puis des mots à écrire en entier, sous l'en-tête du son et de son geste." },
    ],
  },
  {
    id: "ecrit", libelle: "✍️ Lecture et écriture",
    aide: "Des textes à comprendre, le carnet de lecteur, les dictées, la production d'écrits, la grammaire ; des mots et des phrases à manipuler : étiquettes à trier, phrases à remettre en ordre, textes à trous, mots mêlés ; et l'écriture cursive.",
    outils: [
      { id: "comprehension", nom: "Comprendre un texte", icone: "📖", cycles: "Cycle 2",
        quoi: "Des récits, documentaires, règles, poèmes et scènes de théâtre à la longueur de chaque classe, lignes numérotées : questions à justifier, résumé, moments du récit, reprises, inférences, émotions, mots inconnus, types de textes, écoute — et le corrigé." },
      { id: "lecteur", nom: "Carnet de lecteur", icone: "📚", cycles: "Cycle 2",
        quoi: "La page du carnet pour chaque livre lu, la carte d'identité d'un personnage, les personnages-types des contes, la mise en réseau, présenter un livre, choisir un livre, reconnaître les genres." },
      { id: "orthographe", nom: "Orthographe et dictées", icone: "✏️", cycles: "Cycle 2",
        quoi: "Les dictées des guides — préparée, de mots, phrase du jour, à choix multiples, autodictée, à trous, piégée — et mémoriser l'orthographe des mots : cartes et escalier, listes analogiques, lettre muette, s, c, g, m devant m, b, p, accents." },
      { id: "ecrire", nom: "Écrire", icone: "📝", cycles: "Cycle 2",
        quoi: "Les gammes sur une phrase modèle, des mots imposés, déplacer-ajouter-remplacer-supprimer, de l'oral à l'écrit, le jogging d'écriture, transformer un texte, ajouter un épisode, les connecteurs, le brouillon, la grille de relecture, la lettre." },
      { id: "grammaire", nom: "Grammaire et conjugaison", icone: "🧩", cycles: "Cycle 2",
        quoi: "La phrase, ses types et ses formes, les classes de mots, groupe sujet, verbe et compléments, les paroles rapportées ; la chaîne d'accords, le sujet et le verbe ; les tableaux de conjugaison, changer le temps, l'infinitif." },
      { id: "tri", nom: "Les maisons du tri", icone: "🏠", cycles: "Cycles 2 et 3",
        quoi: "Des étiquettes à découper et le tableau où les ranger : être ou avoir, phrase ou pas, nom ou verbe. Le verbe en couleur pour qui en a besoin." },
      { id: "phrases", nom: "Phrases en désordre", icone: "✂️", cycles: "Cycle 2",
        quoi: "Les mots d'une phrase sur des étiquettes mélangées : on découpe, on remet en ordre, on colle." },
      { id: "trous", nom: "Texte à trous", icone: "🔳", cycles: "Cycles 2 et 3",
        quoi: "Des phrases dont on a retiré le verbe — être, avoir, ou le mot de votre choix : les étiquettes, de la taille des cases, s'essaient, se vérifient et se collent." },
      { id: "motsMeles", nom: "Mots mêlés", icone: "🔎", cycles: "Cycles 2 et 3",
        quoi: "Les mots de la semaine cachés dans une grille de lettres, la liste dessous, le corrigé à la suite." },
      { id: "cursive", nom: "Écriture cursive", icone: "🖋", cycles: "Cycle 2",
        quoi: "Des modèles en cursive et des lignes à réglure de 3, 2,5 ou 2 mm : la lettre du jour, des syllabes et des mots, ou une phrase en script à copier." },
    ],
  },
  {
    id: "maths", libelle: "🔢 Mathématiques",
    aide: "Du calcul mental, des problèmes à la structure choisie, des cartes, des pistes, et des calculs qui font apparaître un dessin.",
    outils: [
      { id: "martiniere", nom: "Calcul mental", icone: "🧮", cycles: "Cycles 2 et 3",
        quoi: "Un fait numérique ou une procédure à la fois, d'après les programmes : à l'oral (La Martinière) ou en test de fluence." },
      { id: "compteEstBon", nom: "Le compte est bon", icone: "🎯", cycles: "Cycles 2 et 3",
        quoi: "Une cible, quelques nombres, les opérations permises : on cherche un chemin, une solution au corrigé." },
      { id: "pyramides", nom: "Pyramides et carrés magiques", icone: "🔺", cycles: "Cycles 2 et 3",
        quoi: "Des briques à additionner en montant, des carrés où chaque ligne fait la même somme." },
      { id: "partieTout", nom: "Problèmes partie-tout", icone: "➕", cycles: "Cycles 2 et 3",
        quoi: "Un tout et ses parties, avec leur schéma en barres." },
      { id: "multiplicatifs", nom: "Problèmes multiplicatifs", icone: "✖️", cycles: "Cycles 2 et 3",
        quoi: "Parts égales et comparaisons, avec leur schéma en barres." },
      { id: "coloriage", nom: "Coloriage magique", icone: "🎨", cycles: "Cycles 2 et 3",
        quoi: "On calcule, le résultat dit la couleur, le dessin apparaît." },
      { id: "collections", nom: "Construire des collections", icone: "🧸", pictos: true, cycles: "Cycle 1",
        quoi: "Juste ce qu'il faut : les fiches de places, les cartes-nombres, les bons de commande et le bon panier des situations Éduscol — et leur séquence." },
      { id: "nombres", nom: "Cartes des nombres", icone: "🔢", cycles: "Cycles 1 et 2",
        quoi: "Chiffre, constellation, boîte de dix, mot : le même nombre sous toutes ses formes." },
      { id: "cubes", nom: "Nombres en cubes", icone: "🧱", cycles: "Cycle 2",
        quoi: "Cubes, barres de dix, plaques de cent : lire les cubes et écrire le nombre, grouper par dix, faire un nombre de plusieurs façons — du CP au CE2, avec la séquence du guide CP." },
      { id: "comparer", nom: "Comparer les nombres", icone: "⚖️", cycles: "Cycle 2",
        quoi: "Des cartes de nombres sous plusieurs formes et les signes <, > et = : la bataille, la file des nombres, le nombre caché — et la feuille de jeu." },
      { id: "calcul", nom: "Cartes de calcul", icone: "🃏", cycles: "Cycles 2 et 3",
        quoi: "Le calcul devant, le résultat derrière : se tester, ou la bataille des tables." },
      { id: "arbre", nom: "Arbre à calcul", icone: "🌳", cycles: "Cycle 2",
        quoi: "Ajouter deux nombres en dizaines et unités, l'arbre à compléter." },
      { id: "posees", nom: "Opérations posées", icone: "🧾", cycles: "Cycle 2",
        quoi: "Des additions, des soustractions, des multiplications dans un quadrillage — une case par chiffre, une ligne pour les retenues —, posées d'avance ou à poser, et le corrigé." },
      { id: "fractions", nom: "Fractions", icone: "🍰", cycles: "Cycle 3",
        quoi: "Cartes, bandes à plier, règle graduée en quarts ou en dixièmes, course des nageurs." },
      { id: "oie", nom: "Jeu de l'oie", icone: "🎲", cycles: "Cycles 1 et 2",
        quoi: "Une piste au dé, avec des nombres, des lettres ou des syllabes, et le patron du dé." },
      { id: "heure", nom: "Lire l'heure", icone: "🕰", cycles: "Cycles 2 et 3",
        quoi: "Des horloges à lire, des cadrans où dessiner les aiguilles — heures pile, demies, quarts, cinq minutes, à la minute — ; la durée entre deux horloges, des problèmes de durées, les moments de la journée." },
      { id: "monnaie", nom: "La monnaie", icone: "💶", cycles: "Cycle 2",
        quoi: "Des pièces et des billets « pour jouer » à découper ; compter un porte-monnaie, payer juste, comparer, ranger des prix, rendre la monnaie, l'écriture à virgule." },
      { id: "mesures", nom: "Mesures", icone: "📏", cycles: "Cycle 2",
        quoi: "Longueurs, masses, contenances : comparer, mesurer et tracer des segments à leur taille réelle, la balance, les masses marquées, les verres ; choisir l'unité, estimer, convertir, le périmètre." },
      { id: "geometrie", nom: "Géométrie", icone: "📐", cycles: "Cycle 2",
        quoi: "Reproduire sur quadrillage ou papier pointé et vérifier au calque, compléter un carré, reconnaître les figures, les alignements, les angles droits, le compas, les programmes de construction, la symétrie." },
      { id: "solides", nom: "Les solides", icone: "🧊", cycles: "Cycle 2",
        quoi: "Des solides en perspective à nommer, les objets et leur forme, faces, sommets et arêtes, le jeu du portrait, l'intrus ; les faces à découper, les patrons du cube, des assemblages de cubes à construire." },
      { id: "deplacements", nom: "Se repérer, se déplacer", icone: "🧭", cycles: "Cycle 2",
        quoi: "La fusée et ses flèches, le robot qui avance et pivote, sur un quadrillage : suivre, écrire ou corriger un code ; les cartes des positions." },
      { id: "donnees", nom: "Tableaux et diagrammes", icone: "📊", cycles: "Cycle 2",
        quoi: "Une enquête et son relevé par bâtons, le tableau, le diagramme en barres à lire ou à construire, le tableau à double entrée des formes et des couleurs, des tableaux à compléter, des problèmes." },
      { id: "numeration", nom: "Grands nombres et décimaux", icone: "💯", cycles: "Cycle 3",
        quoi: "Tableau de numération, écriture en lettres, décomposition, comparaison, encadrement." },
    ],
  },
  {
    id: "affichages", libelle: "📌 Affichages",
    aide: "Ce qui se met au mur de la classe : la carte mentale d'un thème, d'une notion, d'une leçon.",
    outils: [
      { id: "carteMentale", nom: "Carte mentale", icone: "🧠", pictos: true, cycles: "Cycles 1 à 3",
        quoi: "Le thème au centre, ses branches autour, chacune à sa couleur avec ses idées en mots et en images : l'affiche de la classe, en A4 ou agrandie en A3." },
    ],
  },
];

/** Le nom d'un atelier, avec son icône : « 🧱 Nombres en cubes » ; son identifiant s'il n'est pas au catalogue. */
export function nomDeLAtelier(id: string): string {
  const o = FAMILLES.flatMap((f) => f.outils).find((x) => x.id === id);
  return o ? `${o.icone} ${o.nom}` : id;
}
