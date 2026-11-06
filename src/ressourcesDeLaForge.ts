// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Des sites de la Forge des communs numériques éducatifs : une liste de liens, rien de plus. « Lister les plus pertinents
// dans l'app, mais juste un lien, rien n'est interprété » (demande de l'enseignant, 6 novembre 2026). Maitrize ne garde ni
// n'exécute le code de ces sites ; un clic les ouvre dans le navigateur. Une sélection faite à la main et figée : aucune
// collecte, pas d'appel à la Forge, dont le robots.txt refuse l'API aux robots. Cette liste ne part jamais à Mistral : ses
// sources portent la mention « noai ».
//
// D'après la Ressourcerie (https://ressourcerie.forge.apps.education.fr/), données sous Licence Ouverte 2.0, lues le
// 6 novembre 2026, adresses vérifiées le même jour. Les phrases sont les nôtres. Chaque site reste à ses auteurs, sous sa licence.
// « feuilles » : le site sort une feuille, en PDF ou en image à imprimer, vérifié dans sa page. « tableau » : il se projette.

export type SorteDeRessource = "feuilles" | "tableau" | "adapter" | "portail" | "eleves" | "enseignant";

export type RessourceDeLaForge = {
  /** Le numéro de la Ressourcerie. */
  id: number;
  nom: string;
  url: string;
  /** Ce que le site fait, en une phrase de nos mots. */
  quoi: string;
  sorte: SorteDeRessource;
  niveaux: readonly string[];
  domaines: readonly string[];
};

/** La date de lecture de la Ressourcerie, que la Licence Ouverte demande de citer. */
export const DATE_DE_LA_SELECTION = "6 novembre 2026";
export const ADRESSE_DE_LA_RESSOURCERIE = "https://ressourcerie.forge.apps.education.fr/";

/** Les rubriques, dans l'ordre où elles se lisent : celles de Fabriquer d'abord. */
export const RUBRIQUES: readonly { sorte: SorteDeRessource; icone: string; titre: string }[] = [
  { sorte: "feuilles", icone: "🖨", titre: "Créent de vraies feuilles" },
  { sorte: "tableau", icone: "🖥", titre: "Fonctionnent au tableau" },
  { sorte: "adapter", icone: "🧩", titre: "Pour adapter et accompagner" },
  { sorte: "eleves", icone: "🎒", titre: "Pour les élèves, en autonomie" },
  { sorte: "enseignant", icone: "🧰", titre: "Pour l'enseignant" },
  { sorte: "portail", icone: "🌐", titre: "Portails" },
];

export const RESSOURCES_DE_LA_FORGE: readonly RessourceDeLaForge[] = [
  { id: 222, nom: "CartaPrint", url: "https://educajou.forge.apps.education.fr/cartaprint/", quoi: "Cartes de nomenclature : une image, un mot en trois écritures.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français", "Langues vivantes"] },
  { id: 196, nom: "Bingo Print", url: "https://educajou.forge.apps.education.fr/bingoprint/", quoi: "Des cartons de loto à partir de votre liste de mots.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français", "Langues vivantes"] },
  { id: 82, nom: "CréaCarte", url: "https://lmdbt.forge.apps.education.fr/creacarte/", quoi: "Des cartes sur mesure, composées à l'écran, puis en PDF.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 780, nom: "Keskiss'trame", url: "https://keskisstrame.forge.apps.education.fr/papeterie/", quoi: "Des papiers à imprimer : réglures, quadrillages, trames.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Arts", "Français", "Mathématiques"] },
  { id: 282, nom: "Mini Livres", url: "https://professeurherve.forge.apps.education.fr/minilivre/", quoi: "Un petit livre en PDF, à imprimer puis à plier.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français"] },
  { id: 102, nom: "Linea Print", url: "https://educajou.forge.apps.education.fr/lineaprint/", quoi: "Des droites numériques graduées à imprimer.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 209, nom: "DroiteGrad", url: "https://granjonjulien.forge.apps.education.fr/generateur-de-droites-graduees/", quoi: "Des droites graduées réglables, exportées en PDF.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 150, nom: "Mathématickets", url: "https://classeadeux.forge.apps.education.fr/mathematickets/", quoi: "Du calcul sur des tickets de caisse imprimés.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 699, nom: "Calculus", url: "https://animaths.forge.apps.education.fr/calculus/", quoi: "Des fiches de calcul mental, du CP au CM2.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 242, nom: "PDF d'images", url: "https://professeurherve.forge.apps.education.fr/pdf-multiimages/", quoi: "Un PDF composé à partir de vos images.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français", "Langues vivantes"] },
  { id: 201, nom: "Pixel-It", url: "https://lmdbt.forge.apps.education.fr/pixel-it/", quoi: "Des grilles de pixel art, à l'écran ou sur papier.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: [] },
  { id: 346, nom: "Image to PixelArt", url: "https://mathsmentales.forge.apps.education.fr/imagetopixelart/", quoi: "Une image changée en grille de pixels, à imprimer.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Arts", "Mathématiques"] },
  { id: 371, nom: "Joucard", url: "https://educajou.forge.apps.education.fr/joucard/", quoi: "Des cartes-questions, à jouer à l'écran ou à imprimer.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: [] },
  { id: 51, nom: "QR Print", url: "https://qrprint.forge.apps.education.fr/app/", quoi: "Une planche de codes QR à distribuer.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 407, nom: "e-fluenceur", url: "https://e-fluenceur.forge.apps.education.fr", quoi: "Fluence : des passations en ligne ou des fiches PDF.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 65, nom: "A4", url: "https://a4.forge.apps.education.fr", quoi: "Un texte en markdown mis en page sur une feuille A4.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 635, nom: "Livrion – Fiches de lecture", url: "https://edelcanto.forge.apps.education.fr/livrion/", quoi: "Des fiches de lecture en PDF : questions, QCM.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 814, nom: "Polyphème", url: "https://circe.forge.apps.education.fr/polypheme/", quoi: "Des tableaux de langage en PDF, préparés avec une IA.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 812, nom: "Aède", url: "https://circe.forge.apps.education.fr/aede/", quoi: "Une phrase en pictos ARASAAC, à exporter en images.", sorte: "feuilles", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 235, nom: "Cartes conjugaison/adjectif", url: "https://professeurherve.forge.apps.education.fr/cartes-conjugaison-adjectif/", quoi: "Des cartes singulier et pluriel, verbes ou adjectifs.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 210, nom: "Mots Mêlés 2000", url: "https://professeurherve.forge.apps.education.fr/motsmeles2000/", quoi: "Des mots mêlés avec vos mots, en image à imprimer.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 83, nom: "Crossbot 2000", url: "https://professeurherve.forge.apps.education.fr/crossbot2000/", quoi: "Des mots croisés avec vos mots, en image à imprimer.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 476, nom: "Le légendeur", url: "https://pyg-biomicrobio.forge.apps.education.fr/legendeur/", quoi: "Une image à légender, à exporter pour une feuille.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: [] },
  { id: 189, nom: "Ultimate Gutenberg", url: "https://professeurherve.forge.apps.education.fr/ultimategutenberg/", quoi: "Un journal de classe mis en page, en PDF.", sorte: "feuilles", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 58, nom: "Seyes", url: "https://educajou.forge.apps.education.fr/seyes/", quoi: "Une page de cahier Seyès projetée, l'écriture en cursive.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français"] },
  { id: 265, nom: "Tuxtimer", url: "https://educajou.forge.apps.education.fr/tuxtimer/", quoi: "Un minuteur de 0 à 60 minutes, à projeter.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 703, nom: "SuperTimer", url: "https://mchoyer.forge.apps.education.fr/supertimer/", quoi: "Un minuteur par groupe, avec ses étapes et ses consignes.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: [] },
  { id: 321, nom: "Chronoline", url: "https://degrangem.forge.apps.education.fr/chronoline/", quoi: "Un chronomètre à plusieurs phases, pour toute la classe.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: [] },
  { id: 245, nom: "Tuxprompt", url: "https://educajou.forge.apps.education.fr/tuxprompt/", quoi: "Un texte qui défile, comme sur un prompteur.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 449, nom: "Problem@ction", url: "https://estrade03.forge.apps.education.fr/problemaction/", quoi: "Des problèmes à projeter et à manipuler, avec leur banque.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 227, nom: "Conjugaison Flash", url: "https://classeadeux.forge.apps.education.fr/conjugaison-flash/", quoi: "Un diaporama de conjugaison pour la classe entière.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 271, nom: "ELF", url: "https://educajou.forge.apps.education.fr/elf/", quoi: "Lecture flash : une liste de mots en diaporama.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 204, nom: "Mot à mot", url: "https://mdebesse.forge.apps.education.fr/mot-a-mot/", quoi: "Des mots affichés un à un, pour la fluence.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 270, nom: "Syllabux", url: "https://educajou.forge.apps.education.fr/syllabux/", quoi: "Un syllabaire qui défile, graphèmes au choix.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 255, nom: "Graduatux", url: "https://educajou.forge.apps.education.fr/graduatux/", quoi: "Se repérer sur la droite graduée, en mode enseignant.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 262, nom: "Droite interactive", url: "https://educajou.forge.apps.education.fr/droite-interactive/", quoi: "Une droite graduée à manipuler : réglettes, ponts, marqueurs.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 263, nom: "Compteur", url: "https://educajou.forge.apps.education.fr/compteur/", quoi: "Un compteur décimal à faire tourner.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 32, nom: "Joubank", url: "https://educajou.forge.apps.education.fr/joubank/", quoi: "Des pièces et des billets à manipuler, à échanger.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 237, nom: "Horloge interactive", url: "https://thierrym.forge.apps.education.fr/horloge-ecole/", quoi: "Une horloge réglable pour apprendre l'heure.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 256, nom: "Chocomultiples", url: "https://educajou.forge.apps.education.fr/chocomultiples/", quoi: "Les multiplications en tablettes de chocolat.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 63, nom: "TuxTrios", url: "https://educajou.forge.apps.education.fr/tuxtrios/", quoi: "Additions et compléments, en séance menée par l'enseignant.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 142, nom: "Décompose ta boîte", url: "https://maitresse-titoune.forge.apps.education.fr/decompose-ta-boite/", quoi: "Décompositions et compléments, en chiffres et en dés.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 211, nom: "Cajou Fleur", url: "https://educajou.forge.apps.education.fr/joufleur/", quoi: "Un même nombre écrit de plusieurs façons, en fleur.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Mathématiques"] },
  { id: 149, nom: "Narradice", url: "https://largilliercyrille.forge.apps.education.fr/narradice/", quoi: "Des dés d'images pour inventer à l'oral ou à l'écrit.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français"] },
  { id: 754, nom: "La roue tourne", url: "https://larouetourne.forge.apps.education.fr/", quoi: "Une roue pour tirer au sort un élève ou un sujet.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 241, nom: "Météo", url: "https://professeurherve.forge.apps.education.fr/meteo-sur-eni/", quoi: "Le rituel du temps qu'il fait, à projeter.", sorte: "tableau", niveaux: ["Maternelle"], domaines: ["Questionner le monde"] },
  { id: 218, nom: "Spotlight", url: "https://educajou.forge.apps.education.fr/spotlight/", quoi: "Un cercle de lumière sur une partie d'une image.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Arts"] },
  { id: 216, nom: "Cacographie", url: "https://classeadeux.forge.apps.education.fr/cacographie/", quoi: "Des phrases à corriger ensemble, corpus fourni.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 205, nom: "Calczilla", url: "https://applis4edu.forge.apps.education.fr/calczilla/", quoi: "Atteindre un nombre cible avec les quatre opérations.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 858, nom: "Les familles de mots", url: "https://rtrevien.forge.apps.education.fr/familles-de-mots/", quoi: "Les familles de mots au TBI, avec une fiche élève.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 932, nom: "The Playground", url: "https://theplayground.forge.apps.education.fr/", quoi: "Une liste de mots changée en jeux à projeter.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 576, nom: "Projetou", url: "https://vibe-edu.forge.apps.education.fr/projetou/", quoi: "Un bureau à projeter : minuteur, sonomètre, modes de travail.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 334, nom: "La fabrique de phrase", url: "https://fabriquephrases.forge.apps.education.fr/", quoi: "Des étiquettes de mots pour construire des phrases.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 258, nom: "Rapidétik", url: "https://educajou.forge.apps.education.fr/rapidetik/", quoi: "Une phrase en étiquettes mobiles : mélangée, à trous.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 171, nom: "Fraclab", url: "https://charruauemmanuel.forge.apps.education.fr/fraclab/", quoi: "Fractions : partager une unité, choisir des parts.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 264, nom: "Automultiples", url: "https://educajou.forge.apps.education.fr/automultiples/", quoi: "Les multiples d'un nombre, pour poser une division.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 715, nom: "Glisse-Nombre", url: "https://esimon3.forge.apps.education.fr/glissenombre/", quoi: "Tableau de numération : ×10, ×100, en glissant les chiffres.", sorte: "tableau", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 644, nom: "Aérographic", url: "https://professeurherve.forge.apps.education.fr/aerographic/", quoi: "Le geste d'écriture : le tracé des lettres d'un mot.", sorte: "tableau", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP"] },
  { id: 341, nom: "LireCouleur", url: "https://lirecouleur.forge.apps.education.fr/", quoi: "La lecture en couleur, pour aider à décoder.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 685, nom: "DiKomit", url: "https://dikomit.forge.apps.education.fr/", quoi: "Chercher l'orthographe d'un mot par ses sons, clavier illustré.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 339, nom: "Écris pour moi", url: "https://educajou.forge.apps.education.fr/ecrispourmoi/", quoi: "L'orthographe d'un mot dit au micro.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 261, nom: "Lis pour moi", url: "https://educajou.forge.apps.education.fr/lispourmoi/", quoi: "Une phrase écrite changée en piste audio, avec son code QR.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 815, nom: "Volumen", url: "https://circe.forge.apps.education.fr/volumen/", quoi: "Un texte illustré en pictos ARASAAC.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP", "Français"] },
  { id: 751, nom: "Le Sémaphore", url: "https://houdoubertrand.forge.apps.education.fr/le-semaphore/", quoi: "Évaluer des élèves à besoins particuliers : radars et PDF.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: ["ASH & EBEP"] },
  { id: 813, nom: "Tiresias", url: "https://circe.forge.apps.education.fr/tiresias/", quoi: "Les emplois du temps d'un dispositif ULIS.", sorte: "adapter", niveaux: ["Élémentaire"], domaines: ["ASH & EBEP"] },
  { id: 724, nom: "M2PA", url: "https://m2pa.forge.apps.education.fr/", quoi: "Planifier une séance accessible, avec une IA.", sorte: "adapter", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 91, nom: "Éducajou", url: "https://educajou.forge.apps.education.fr", quoi: "Le portail des applications libres d'Éducajou.", sorte: "portail", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 47, nom: "Portail primaire de la Forge", url: "https://primaire.forge.apps.education.fr", quoi: "La sélection de la communauté primaire de la Forge.", sorte: "portail", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 226, nom: "Maths-en-un Cycle 2", url: "https://classeadeux.forge.apps.education.fr/maths-en-un-c2/", quoi: "Des centaines d'activités de maths, au cycle 2.", sorte: "portail", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 225, nom: "Maths-en-un Cycle 3", url: "https://classeadeux.forge.apps.education.fr/maths-en-un-c3/", quoi: "Des ressources de maths au cycle 3, par compétence.", sorte: "portail", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 246, nom: "Flashmots", url: "https://educajou.forge.apps.education.fr/flashmots/", quoi: "Mémoriser l'orthographe avec vos listes de mots.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 152, nom: "Pop Math", url: "https://educajou.forge.apps.education.fr/popmath/", quoi: "Les tables des quatre opérations, en cliquant sur des ballons.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 272, nom: "Motminot", url: "https://educajou.forge.apps.education.fr/motminot/", quoi: "Un mot à deviner chaque jour.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 267, nom: "Tétri Math", url: "https://educajou.forge.apps.education.fr/tetrimath/", quoi: "Les compléments à 10, 20, 100, en assemblant des blocs.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 219, nom: "Multi Stick", url: "https://educajou.forge.apps.education.fr/multistick/", quoi: "Les tables de multiplication, dans le désordre.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 176, nom: "Copie cachée", url: "https://maitresse-titoune.forge.apps.education.fr/copie-cachee/", quoi: "Mémoriser l'orthographe et apprendre à copier.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 316, nom: "AutoBD", url: "https://educajou.forge.apps.education.fr/autobd/", quoi: "Réaliser une bande dessinée et l'exporter en image.", sorte: "eleves", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Français", "Arts"] },
  { id: 144, nom: "L'atelier de l'écrivain", url: "https://christophe-salome.forge.apps.education.fr/atelier-ecrivain/", quoi: "Écrire en trois temps : planifier, brouillon, réviser.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 175, nom: "Fracaweb", url: "https://educajou.forge.apps.education.fr/fracaweb/", quoi: "Des fractions en barres, reliées à une droite.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 140, nom: "Ma bande unité", url: "https://lmdbt.forge.apps.education.fr/ma-bande-unite/", quoi: "Construire et comparer des fractions avec une bande unité.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Mathématiques"] },
  { id: 607, nom: "FLExique", url: "https://esimon3.forge.apps.education.fr/flexique/", quoi: "Le vocabulaire courant du FLE : imagiers, audio, exercices.", sorte: "eleves", niveaux: ["Élémentaire"], domaines: ["Français"] },
  { id: 433, nom: "Scribéo", url: "https://scribeo.forge.apps.education.fr/", quoi: "Dicter du texte, sans rien envoyer à un serveur.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 92, nom: "Face Privacy", url: "https://faceprivacy.forge.apps.education.fr/app/", quoi: "Flouter les visages d'une photo, dans le navigateur.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 641, nom: "Pablocut", url: "https://pablocut.forge.apps.education.fr/", quoi: "Retirer le fond d'une photo, dans le navigateur.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: ["Arts"] },
  { id: 639, nom: "PDF Studio", url: "https://vibe-edu.forge.apps.education.fr/pdf-studio/", quoi: "Alléger, fusionner, signer ou découper un PDF.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 269, nom: "Minimages", url: "https://educajou.forge.apps.education.fr/minimages/", quoi: "Réduire le poids d'images, dans le navigateur.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 347, nom: "Pseudonymus", url: "https://vibe-edu.forge.apps.education.fr/pseudonymus2/", quoi: "Pseudonymiser un document, sans rien transmettre.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 816, nom: "Boussole1D", url: "https://roedererphilippe.forge.apps.education.fr/boussole1d/", quoi: "Retrouver les textes officiels de l'école primaire.", sorte: "enseignant", niveaux: ["Maternelle", "Élémentaire"], domaines: [] },
  { id: 474, nom: "Recherche images", url: "https://classeadeux.forge.apps.education.fr/rechercheimages/", quoi: "Chercher des images sans publicité ni pisteur.", sorte: "enseignant", niveaux: ["Élémentaire"], domaines: [] },
  { id: 238, nom: "Mon livret maternelle", url: "https://mdebesse.forge.apps.education.fr/livret-maternelle/", quoi: "Des carnets de suivi pour la maternelle.", sorte: "enseignant", niveaux: ["Maternelle"], domaines: [] },
];

const sansAccent = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Les sites de ces rubriques dont le nom, la phrase, le domaine ou le niveau contient ce qu'on cherche ; tous sans recherche. */
export function chercherDansLaForge(recherche: string, sortes?: readonly SorteDeRessource[]): RessourceDeLaForge[] {
  const cible = sansAccent(recherche.trim());
  return RESSOURCES_DE_LA_FORGE.filter((r) => (!sortes || sortes.includes(r.sorte))
    && (!cible || sansAccent(`${r.nom} ${r.quoi} ${r.domaines.join(" ")} ${r.niveaux.join(" ")}`).includes(cible)));
}
