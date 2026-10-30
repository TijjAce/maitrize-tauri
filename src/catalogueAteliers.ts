// Le catalogue des ateliers de Fabriquer : leurs onglets, leurs familles, ce que chacun fabrique.
//
// Il vit à part de la page : d'autres écrans le lisent — la fiche d'une séquence nomme les ateliers où elle va piocher.

export const ONGLETS = [
  "jeux", "memory", "imagier", "categoriser", "suites", "vilainPetitCanard", "etiquettes", "ombres", "oeilDeLynx",
  "sons", "lotoSyllabes", "dominos", "intrus", "paires", "fluence", "voixHaute", "syllabaire", "lettres", "gestes", "motsGestes", "syllabeManquante",
  "comprehension", "lecteur", "orthographe", "ecrire", "grammaire", "oral", "tri", "phrases", "trous", "motsMeles", "cursive",
  "martiniere", "compteEstBon", "pyramides", "partieTout", "multiplicatifs", "coloriage", "collections", "problemeDuJour", "motifs", "nombres", "cubes", "billes", "abaque", "suiteNombres", "demiDroite", "ordinaux", "comparer", "calcul", "arbre", "posees", "calculCM", "soustractionPosee", "sequencesCP", "sequencesCE1", "sequencesCE2", "sequencesCM1", "sequencesCM2", "fractions", "oie", "heure", "monnaie", "mesures", "geometrie", "solides", "deplacements", "donnees", "numeration",
  "carteMentale", "taches",
  "sequentiel", "priseDeParole", "codePhrase", "codeLecture", "resolution", "modelisation", "fonction",
  "planClasse", "frise", "paysage",
  "perso",
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
  /**
   * Une séquence toute faite — ses séances et toutes leurs feuilles —, et non
   * un support qu'on fabrique pour construire ses séquences : sa carte se
   * distingue des autres (demande de l'enseignant, octobre 2026).
   */
  sequence?: true;
  /** Un dossier de séquences toutes faites — celles d'une classe — plutôt qu'une seule (demande de l'enseignant, octobre 2026). */
  dossier?: true;
}

export const FAMILLES: { id: string; libelle: string; aide: string; outils: Outil[] }[] = [
  {
    id: "sequences", libelle: "📚 Séquences toutes faites",
    aide: "Un dossier par classe : les séquences, leurs séances et toutes leurs feuilles, prêtes ; on crée la séquence d'un clic, puis on l'adapte.",
    outils: [
      { id: "sequencesCP", nom: "CP", icone: "📁", sequence: true, dossier: true,
        quoi: "Grouper par dix, les nombres jusqu'à 100, l'addition posée, les problèmes ; le code et la fluence, les premières phrases, les dictées ; le temps qui passe, le plan de la classe — en tableau, période par période, avec toutes leurs feuilles." },
      { id: "sequencesCE1", nom: "CE1", icone: "📁", sequence: true, dossier: true,
        quoi: "La centaine, la table de 7, la soustraction posée, les fractions, l'heure et la monnaie ; comprendre un texte, les dictées, le passé composé ; les grandes périodes de l'histoire — en tableau, période par période, avec toutes leurs feuilles." },
      { id: "sequencesCE2", nom: "CE2", icone: "📁", sequence: true, dossier: true,
        quoi: "Le millier, multiplier par 4, la multiplication posée, la division, les fractions égales ; lire à voix haute, l'imparfait, l'exposé ; la Préhistoire, Rome, se loger — en tableau, période par période, avec toutes leurs feuilles." },
      { id: "sequencesCM1", nom: "CM1", icone: "📁", sequence: true, dossier: true,
        quoi: "Les nombres jusqu'à 999 999, les fractions et les décimaux, le calcul, les problèmes, l'algèbre — enveloppes et balances —, la proportionnalité, les grandeurs et la géométrie ; lire, écrire, l'oral, le vocabulaire, la grammaire et la conjugaison ; le Moyen Âge, la monarchie, les explorations, 1789, se nourrir, les inégalités, se déplacer, Internet — en tableau, période par période, avec toutes leurs feuilles." },
      { id: "sequencesCM2", nom: "CM2", icone: "📁", sequence: true, dossier: true,
        quoi: "Les grands nombres, les fractions et les décimaux jusqu'aux millièmes, le calcul, les problèmes, l'algèbre, la proportionnalité, les grandeurs et la géométrie ; lire, écrire, l'oral, le vocabulaire, la grammaire, le passé simple et la phrase complexe ; la République et l'Empire, l'âge industriel, les deux guerres mondiales, la France depuis 1945, le territoire, l'eau douce, l'Union européenne — en tableau, période par période, avec toutes leurs feuilles." },
    ],
  },
  {
    id: "perso", libelle: "✨ Mes générateurs",
    aide: "Décrivez le support voulu : l'IA de Mistral en fait un générateur, que vous retouchez.",
    outils: [
      { id: "perso", nom: "Créer un générateur avec l'IA", icone: "✨", cycles: "De la maternelle au CM2",
        quoi: "Décrivez la feuille voulue. L'IA vous demande ce qui lui manque, puis la fabrique, prête à retoucher." },
    ],
  },
  {
    id: "francais", libelle: "📖 Français",
    aide: "Le langage, les sons et la lecture, comprendre et écrire, la grammaire, l'oral, les dictées.",
    outils: [
      // Langage
      { id: "jeux", nom: "Loto", icone: "🎲", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des planches et leurs cartes à découper : les pictogrammes d'un thème, ou vos propres images." },
      { id: "memory", nom: "Jeu de mémoire", icone: "🃏", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des paires à retourner : image et image, ou image et mot." },
      { id: "imagier", nom: "Imagier", icone: "📖", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Une page d'images légendées, à afficher ou à coller dans un cahier." },
      { id: "categoriser", nom: "Catégoriser les mots", icone: "🗂", pictos: true, cycles: "Cycle 1",
        quoi: "Les jeux d'Éduscol pour ranger les mots en catégories : boîtes de tri, intrus, loto aveugle, « J'appelle… », familles, mistigri — et leur séquence." },
      { id: "suites", nom: "Images séquentielles", icone: "🎞", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Remettre dans l'ordre une histoire, un geste, une recette : les images à découper et les cases à remplir, en colonne ou fléchées — des pictos ou vos photos." },
      { id: "vilainPetitCanard", nom: "Le Vilain Petit Canard — MS, GS", icone: "🦢", pictos: true, cycles: "Cycle 1", sequence: true,
        quoi: "La séquence de vocabulaire du guide Éduscol de maternelle : familles d'animaux, documentaires, émotions ou synonymots, lieux, devinettes, plan du récit, tapis de conte — et la séquence entière." },
      { id: "etiquettes", nom: "Étiquettes à catégoriser", icone: "🏷", cycles: "Cycles 2 et 3",
        quoi: "Les mots collectés en grand pour le tableau, en petit par enveloppe, et la corolle lexicale." },
      { id: "ombres", nom: "Jeu des ombres", icone: "👤", cycles: "Cycles 1 et 2",
        quoi: "Chaque image retrouve sa silhouette : à poser dessus, ou à relier. Pictogrammes ou vos propres images." },
      // Sons et lecture
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
        quoi: "Jeu de mémoire, mistigri et loto des lettres, majuscule et minuscule ; la planche de l'ophtalmologue." },
      { id: "gestes", nom: "Gestes Borel-Maisonny", icone: "🤲", cycles: "Cycles 1 et 2",
        quoi: "Vos images des gestes en cartes à découper : petites pour les mains, grandes pour le tableau — et, d'un clic, en loto ou en mémory." },
      { id: "motsGestes", nom: "Mots codés en gestes", icone: "🫱", cycles: "Cycle 2",
        quoi: "La fiche d'un son en gestes Borel-Maisonny : colorier le bon dessin, relier au bon mot, ou écrire le mot." },
      { id: "syllabeManquante", nom: "La syllabe qui manque", icone: "🧩", pictos: true, cycles: "Cycle 2",
        quoi: "Sous chaque dessin, le mot avec un trou : écrire ma, mi ou mu. Puis des mots à écrire en entier, sous l'en-tête du son et de son geste." },
      // Lecture et écriture
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
      { id: "oral", nom: "L'oral", icone: "🗣", cycles: "Cycle 2",
        quoi: "Les grilles pour raconter, présenter un exposé, dire un poème, débattre ; la carte du récit ; le poème à apprendre ; le plan d'exposé ; les cartes « Je prends la parole » ; les rôles du débat ; les registres de langue et les jeux de rôles." },
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
    id: "observation", libelle: "👁 Observation",
    aide: "Observer, comparer, retrouver : l'attention visuelle qu'on exerce avant de lire, et pendant.",
    outils: [
      { id: "oeilDeLynx", nom: "Cherche et trouve", icone: "👁", pictos: true, cycles: "Cycles 1 à 3",
        quoi: "Des modèles à retrouver dans une image pleine de dessins, et à entourer : cinq niveaux — tailles, sens, sosies, noir et blanc —, la version « combien de fois ? », et le corrigé." },
    ],
  },
  {
    id: "maths", libelle: "🔢 Mathématiques",
    aide: "Les nombres, le calcul, les problèmes, les grandeurs, la géométrie, les données — comme les programmes.",
    outils: [
      { id: "martiniere", nom: "Calcul mental", icone: "🧮", cycles: "Cycles 2 et 3",
        quoi: "Un fait numérique ou une procédure à la fois, d'après les programmes : à l'oral (La Martinière) ou en test de fluence." },
      { id: "compteEstBon", nom: "Le nombre cible", icone: "🎯", cycles: "Cycles 2 et 3",
        quoi: "Une cible, quelques nombres, les opérations permises : on cherche un chemin, une solution au corrigé." },
      { id: "pyramides", nom: "Pyramides et carrés magiques", icone: "🔺", cycles: "Cycles 2 et 3",
        quoi: "Des briques à additionner en montant, des carrés où chaque ligne fait la même somme." },
      { id: "partieTout", nom: "Problèmes partie-tout", icone: "➕", cycles: "Cycles 2 et 3",
        quoi: "Un tout et ses parties, avec leur schéma en barres." },
      { id: "multiplicatifs", nom: "Problèmes multiplicatifs", icone: "✖️", cycles: "Cycles 2 et 3",
        quoi: "Parts égales et comparaisons, avec leur schéma en barres." },
      { id: "coloriage", nom: "Coloriage magique", icone: "🎨", cycles: "Cycles 2 et 3",
        quoi: "On calcule, le résultat dit la couleur, le dessin apparaît." },
      { id: "collections", nom: "Construire des collections — maternelle", icone: "🧸", pictos: true, cycles: "Cycle 1",
        quoi: "Juste ce qu'il faut : les fiches de places, les cartes-nombres, les bons de commande et le bon panier des situations Éduscol — et leur séquence." },
      { id: "problemeDuJour", nom: "Le problème du jour — maternelle", icone: "🧳", pictos: true, cycles: "Cycle 1", sequence: true,
        quoi: "Une sorte de problème pour une période, dix minutes chaque jour : ajouter, enlever, avancer sur la piste, faire des groupes, partager — de la PS à la GS, avec les cartes du jour, l'affiche, le matériel et la grille." },
      { id: "motifs", nom: "Les motifs — maternelle", icone: "🧦", cycles: "Cycle 1",
        quoi: "Le fil à linge de la mascotte, des bandes à reproduire, compléter, prolonger, l'intrus et sa bande autocorrective, le motif qui grandit, la même règle avec d'autres dessins." },
      { id: "nombres", nom: "Cartes des nombres", icone: "🔢", cycles: "Cycles 1 et 2",
        quoi: "Chiffre, constellation, boîte de dix, mot : le même nombre sous toutes ses formes." },
      { id: "cubes", nom: "Nombres en cubes", icone: "🧱", cycles: "Cycle 2",
        quoi: "Cubes, barres de dix, plaques de cent : lire les cubes et écrire le nombre, grouper par dix, faire un nombre de plusieurs façons — du CP au CE2, avec la séquence du guide CP." },
      { id: "billes", nom: "Billes et calots", icone: "🔵", cycles: "Cycles 1 et 2",
        quoi: "Des billes dispersées à compter en faisant des paquets de dix, deux tas qui font un nombre ; un calot vaut dix billes : qui a gagné la partie ? — jusqu'à 100, avec le corrigé." },
      { id: "abaque", nom: "L'abaque", icone: "🎚", cycles: "Cycle 2",
        quoi: "Deux tiges, des jetons verts pour les unités, des rouges pour les dizaines : faire l'échange de dix jetons, lire l'abaque, dessiner les jetons d'un nombre — jusqu'à 99." },
      { id: "suiteNombres", nom: "La suite des nombres", icone: "🔟", cycles: "Cycle 2",
        quoi: "La frise à compléter, juste avant et juste après, ranger, comparer en chiffres, en mots, en abaques et en calots, le nom des nombres, les dizaines et les unités — jusqu'à 100." },
      { id: "demiDroite", nom: "La demi-droite graduée", icone: "🛤", cycles: "Cycle 2",
        quoi: "Compter les unités depuis 0, placer un nombre, lire celui d'un point, trouver le pas, les nombres qui manquent, la bande lacunaire — de un en un au CP, de dix en dix et de cent en cent au CE1, de mille en mille au CE2 — et l'évaluation." },
      { id: "ordinaux", nom: "Les nombres ordinaux", icone: "🥇", cycles: "Cycle 2 (CP, CE1)",
        quoi: "Le train et ses wagons, sous quel gobelet, l'arrivée de la course, écrire premier et 1er, devant moi et derrière moi, le rang dans une liste, les suites qui se répètent ou qui grandissent — et l'évaluation." },
      { id: "comparer", nom: "Comparer les nombres", icone: "⚖️", cycles: "Cycle 2",
        quoi: "Des cartes de nombres sous plusieurs formes et les signes <, > et = : la bataille, la file des nombres, le nombre caché — et la feuille de jeu." },
      { id: "calcul", nom: "Cartes de calcul", icone: "🃏", cycles: "Cycles 2 et 3",
        quoi: "Le calcul devant, le résultat derrière : se tester, ou la bataille des tables." },
      { id: "arbre", nom: "Arbre à calcul", icone: "🌳", cycles: "Cycle 2",
        quoi: "Ajouter deux nombres en dizaines et unités, l'arbre à compléter." },
      { id: "posees", nom: "Opérations posées", icone: "🧾", cycles: "Cycle 2",
        quoi: "Des additions, des soustractions, des multiplications dans un quadrillage — une case par chiffre, une ligne pour les retenues —, posées d'avance ou à poser, et le corrigé." },
      { id: "calculCM", nom: "Le calcul — CM1, CM2", icone: "➗", cycles: "Cycle 3 (CM1, CM2)",
        quoi: "Additions et soustractions de décimaux, multiplications, divisions en potence par un ou deux chiffres, le quotient et le reste, le partage des centaines, dizaines et unités, les parenthèses — et le corrigé." },
      { id: "soustractionPosee", nom: "La soustraction posée — CE1", icone: "➖", cycles: "Cycle 2 (CE1)", sequence: true,
        quoi: "La séquence de CE1, d'après Éduscol : chaque séance s'ouvre sur le calcul mental La Martinière ; on retire avec les barres et les cubes, on casse une dizaine, puis une centaine, avant de poser — dix séances et leurs feuilles." },
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
        quoi: "La bille et ses flèches, puis, plus dur, le robot qui avance et pivote comme dans Scratch : suivre, écrire ou corriger un code sur un quadrillage ; les cartes des positions." },
      { id: "donnees", nom: "Tableaux et diagrammes", icone: "📊", cycles: "Cycle 2",
        quoi: "Une enquête et son relevé par bâtons, le tableau, le diagramme en barres à lire ou à construire, le tableau à double entrée des formes et des couleurs, des tableaux à compléter, des problèmes." },
      { id: "numeration", nom: "Grands nombres et décimaux", icone: "💯", cycles: "Cycle 3",
        quoi: "Tableau de numération, écriture en lettres, décomposition, comparaison, encadrement." },
    ],
  },
  {
    id: "evaluer", libelle: "✅ Évaluer",
    aide: "Une question par carte, sans fioritures : savoir où en est chaque élève, en mathématiques comme en français.",
    outils: [
      { id: "taches", nom: "Cartes à tâches", icone: "🧷", cycles: "Cycles 1 à 3",
        quoi: "Des cartes à pinces et des cartes à écrire, une question chacune : solides, figures, heure, monnaie, nombres, calcul, aire, devinettes, sons, ponctuation, conjugaison… — numérotées, avec la fiche réponse, le corrigé, ou la réponse au dos pour se corriger seul." },
    ],
  },
  {
    id: "histoireGeo", libelle: "🌍 Histoire-géographie",
    aide: "Se repérer dans l'espace et dans le temps : les feuilles des séquences d'histoire et de géographie du cycle 2.",
    outils: [
      { id: "planClasse", nom: "Le plan de la classe", icone: "🗺", cycles: "Cycle 2 (CP)",
        quoi: "Le plan de votre classe vu de dessus, d'après le plan de salle : avec ou sans les noms, en couleurs avec sa légende ; la chasse au trésor ; le plan à coller ; l'évaluation ; les étiquettes des maquettes." },
      { id: "frise", nom: "Frises et calendriers", icone: "🗓", cycles: "Cycle 2",
        quoi: "La journée, la semaine et sa roue, l'année et ses saisons, le calendrier du mois, la frise de la vie, les générations ; cent ans en décennies, les grandes périodes et leurs figures ; la Préhistoire, Rome, le royaume de France — complétées ou à compléter, avec les étiquettes." },
      { id: "paysage", nom: "Lire un paysage", icone: "🏞", cycles: "Cycle 2 (CE1, CE2)",
        quoi: "La fiche à poser à côté d'une photographie : premier plan, arrière-plan, éléments naturels et construits, le nom du paysage, le croquis et sa légende — ville et village, lieux de vie du monde, se loger, travailler." },
    ],
  },
  {
    id: "aides", libelle: "🧩 Aides à la tâche",
    aide: "Structurer la tâche pour que chacun y entre et la mène au bout, d'après Cap école inclusive (Canopé).",
    outils: [
      { id: "sequentiel", nom: "Décomposer la tâche", icone: "📋", pictos: true, cycles: "De la maternelle au lycée",
        quoi: "Les étapes d'une tâche, numérotées, avec le picto de chaque geste : check-list à cocher, séquentiel visuel, logigramme ou frise ; le chaînage qui cache l'étape apprise, le soliloque." },
      { id: "priseDeParole", nom: "Préparer une prise de parole", icone: "🎤", pictos: true, cycles: "Cycles 1 à 4",
        quoi: "La carte mentale à compléter, le sujet au centre ; les mots pour enchaîner ses idées ; les cartes-images des mots-clés ; le dé à raconter." },
      { id: "codePhrase", nom: "Le code de la phrase", icone: "🖍", cycles: "Cycles 2 et 3",
        quoi: "Vos couleurs et vos marques pour analyser la phrase — groupe sujet, verbe, compléments — : la carte du code pour l'élève, la table ou le mur ; les feuilles de grammaire les reprennent." },
      { id: "codeLecture", nom: "Le code de la lecture à voix haute", icone: "🎙", cycles: "Cycles 2 et 3",
        quoi: "Vos signes et vos couleurs pour préparer une lecture — la liaison, les pauses, l'intonation, les groupes de souffle — : la carte du code pour l'élève, la table ou le mur ; les feuilles « Lire à voix haute » les reprennent." },
      { id: "resolution", nom: "Résoudre un problème pas à pas", icone: "🔎", cycles: "De l'école au collège",
        quoi: "L'énoncé travaillé en couleurs, la question à part, puis quatre étapes : ce qu'on cherche, l'égalité, la résolution, la vérification et la phrase réponse." },
      { id: "modelisation", nom: "De la figure à l'équation", icone: "🔺", cycles: "3e et 2de",
        quoi: "Un problème de géométrie traduit en équation, en six étapes balisées : lire, expliquer, découper la figure, essayer, calculer avec x, contrôler." },
      { id: "fonction", nom: "Modéliser par une fonction", icone: "📈", cycles: "Cycle 4 et lycée",
        quoi: "Une figure à géométrie variable décortiquée : le texte et la figure aux mêmes couleurs, ce qui est fixe et ce qui bouge, le rôle des points, une partie à la fois." },
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

/**
 * Les mathématiques, rangées comme les programmes et comme les lignes du
 * tableau des séquences toutes faites : vingt-sept ateliers d'un seul tenant
 * ne se lisaient plus (demande de l'enseignant, octobre 2026). Dans chaque
 * domaine, de la maternelle au cycle 3. Les fractions et les décimaux vont
 * avec les nombres, les motifs de maternelle — des formes qui se suivent —
 * avec l'espace et la géométrie.
 */
export const DOMAINES_DES_MATHS: { id: string; nom: string; outils: Onglet[] }[] = [
  { id: "nombres", nom: "Les nombres", outils: ["collections", "nombres", "billes", "cubes", "abaque", "suiteNombres", "demiDroite", "ordinaux", "comparer", "oie", "fractions", "numeration"] },
  { id: "calcul", nom: "Le calcul", outils: ["martiniere", "calcul", "arbre", "posees", "pyramides", "compteEstBon", "coloriage", "calculCM"] },
  { id: "problemes", nom: "Les problèmes", outils: ["partieTout", "multiplicatifs"] },
  { id: "grandeurs", nom: "Grandeurs et mesures", outils: ["heure", "monnaie", "mesures"] },
  { id: "geometrie", nom: "Espace et géométrie", outils: ["motifs", "geometrie", "solides", "deplacements"] },
  { id: "donnees", nom: "Données", outils: ["donnees"] },
];

/**
 * Le français, en trois parties : les trois familles d'avant, rassemblées sous
 * « Français » comme les domaines sous « Mathématiques » (demande de
 * l'enseignant, octobre 2026).
 */
export const PARTIES_DU_FRANCAIS: { id: string; nom: string; outils: Onglet[] }[] = [
  { id: "langage", nom: "Langage", outils: ["jeux", "memory", "imagier", "categoriser", "suites", "etiquettes", "ombres"] },
  { id: "sons", nom: "Sons et lecture", outils: ["sons", "lotoSyllabes", "dominos", "intrus", "paires", "fluence", "voixHaute", "syllabaire", "lettres", "gestes", "motsGestes", "syllabeManquante"] },
  { id: "ecrit", nom: "Lecture et écriture", outils: ["comprehension", "lecteur", "orthographe", "ecrire", "grammaire", "oral", "tri", "phrases", "trous", "motsMeles", "cursive"] },
];

/** Les familles qui se découpent, et leurs parties. */
const PARTIES: Record<string, { id: string; nom: string; outils: Onglet[] }[]> = { francais: PARTIES_DU_FRANCAIS, maths: DOMAINES_DES_MATHS };

/** Les parties d'une famille, quand elle en a : celles du français, les domaines des mathématiques ; ce qu'aucune ne range va dans « Autres ». */
export function partiesDeLaFamille(f: { id: string; outils: Outil[] }): { id: string; nom: string; outils: Outil[] }[] | null {
  const domaines = PARTIES[f.id];
  if (!domaines) return null;
  const parties = domaines.map((d) => ({ id: d.id, nom: d.nom, outils: d.outils.map((id) => f.outils.find((o) => o.id === id)).filter((o): o is Outil => !!o) }));
  const ranges = new Set(domaines.flatMap((d) => d.outils as string[]));
  const autres = f.outils.filter((o) => !ranges.has(o.id));
  return [...parties, { id: "autres", nom: "Autres", outils: autres }].filter((p) => p.outils.length > 0);
}

/**
 * Les familles telles que le catalogue des supports les montre : sans les
 * séquences toutes faites, qui ont leur onglet à part — on y prend une
 * séquence, quand le reste sert à créer des supports (demande de
 * l'enseignant, octobre 2026). Une famille qui n'en garde aucun s'efface.
 */
export const FAMILLES_DE_SUPPORTS = FAMILLES.map((f) => ({ ...f, outils: f.outils.filter((o) => !o.sequence) })).filter((f) => f.outils.length > 0);

/** Les séquences toutes faites, pour leur onglet : les dossiers du CP au CE2, puis les autres, dans l'ordre du catalogue. */
export const SEQUENCES_TOUTES_FAITES: Outil[] = FAMILLES.flatMap((f) => f.outils).filter((o) => o.sequence);

/** Le nom d'un atelier, avec son icône : « 🧱 Nombres en cubes » ; son identifiant s'il n'est pas au catalogue. */
export function nomDeLAtelier(id: string): string {
  const o = FAMILLES.flatMap((f) => f.outils).find((x) => x.id === id);
  return o ? `${o.icone} ${o.nom}` : id;
}
