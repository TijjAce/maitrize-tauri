// L'espace et la géométrie au cycle 2 : des séquences bâties sur le programme
// et les guides.
//
// Les livrets d'accompagnement n'ont pas de séquence pour les solides, la
// géométrie plane ou le repérage dans l'espace ; l'enseignant a demandé
// (2026-10-07) qu'on les construise depuis les guides Éduscol et le
// programme, en le disant. Les sources : le programme de mathématiques du
// cycle 2 (2024), ses objectifs et ses exemples de réussite, cités ; Éduscol,
// « Espace et géométrie au cycle 2 » (document d'accompagnement des
// programmes, 2002) — des situations finalisées où l'élève valide lui-même :
// retrouver un objet caché, construire un objet superposable, utiliser un
// plan ; reproduire sur quadrillage et superposer un calque ; des solides aux
// figures planes — ; Éduscol, « Initiation à la programmation aux cycles 2
// et 3 » (2016) : la fusée, la tournée du facteur, les robots. Chaque séance
// suit la démarche en quatre temps des livrets.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type ReglagesGeometrie } from "./geometrie";
import { REGLAGES_SOLIDES, STYLE_SOLIDES, htmlSolides, type ReglagesSolides } from "./solides";
import { REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements, type ReglagesDeplacements } from "./deplacements";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);

const PROGRAMME = "Bâtie sur le programme de mathématiques du cycle 2 (2024) et les guides Éduscol, à la demande de l'enseignant, faute de séquence dans les livrets d'accompagnement ; démarche en quatre temps des livrets";
const ESPACE = "Éduscol, « Espace et géométrie au cycle 2 » (document d'accompagnement des programmes, 2002)";
const PROGRAMMATION = "Éduscol, « Initiation à la programmation aux cycles 2 et 3 » (2016)";
const LANGAGE = "Parle avec précision et fais reprendre les mots justes : le vocabulaire prend son sens dans la manipulation.";

const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 20, [
  ph("Évaluation", "15 min", `Une feuille et une situation à manipuler : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

// ── Les solides ───────────────────────────────────────────────────────────

const SOLIDES_CP: Demarche = {
  id: "solides-cp", nom: "Les solides : trier, nommer, construire (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "À partir d'objets tangibles et d'une verbalisation précise : trier des solides selon un critère, puis les classer — les cubes, les pavés, les cylindres, les boules, les autres —, sur des critères visuels : au CP, le cube n'est pas considéré comme un pavé. Reconnaître la boule, le cube, le cône, le cylindre, le pavé dans son environnement — une boîte à chaussures a la forme d'un pavé, une boîte de conserve celle d'un cylindre, une balle de tennis celle d'une boule — ; nommer le cube, le pavé et la boule ; décrire leurs faces ; assembler les faces d'un cube ou d'un pavé pour le reproduire.",
  seances: [
    trois("Trier des solides", "trier des solides selon un critère : ceux qui roulent et ceux qui ne roulent pas, puis les classer en plusieurs groupes.",
      "Une collection de solides et d'objets de la classe : se ressemblent-ils ? Comment les ranger ?",
      "Par groupes, trier : ceux qui roulent, ceux qui ne roulent pas ; puis classer en plusieurs groupes, et dire son critère.",
      "Les groupes de la classe, photographiés : les cubes, les pavés, les boules, les cylindres, les cônes.", LANGAGE),
    trois("Reconnaître et nommer", "reconnaître le cube, le pavé, la boule, le cylindre et le cône, et nommer le cube, le pavé et la boule.",
      "Le sac à solides : on en touche un sans le voir, on le décrit, on devine.",
      "Des solides et leurs dessins : colorier les cubes, les pavés, les boules ; retrouver les cylindres et les cônes. Un cube n'est pas un pavé.",
      "L'affiche des solides, avec leurs noms."),
    trois("Les objets et leur forme", "repérer des solides dans son environnement : une boîte à chaussures a la forme d'un pavé.",
      "Une boîte à chaussures, une boîte de conserve, une balle de tennis : à quel solide ressemblent-elles ?",
      "Chercher dans la classe des objets qui ont la forme d'un cube, d'un pavé, d'une boule, d'un cylindre, d'un cône ; relier des objets à leur forme.",
      "L'affiche s'enrichit des objets de la classe."),
    trois("Les faces du cube et du pavé", "décrire un cube ou un pavé en parlant de ses faces : leur nombre et leur forme.",
      "On pose le cube sur un tampon encreur : son empreinte est un carré. Et les autres faces ? Et le pavé ?",
      "Faire l'empreinte de chaque face ; compter les faces en les marquant d'une gommette ; carrés ou rectangles ?",
      "La trace écrite : le cube a six faces, des carrés ; le pavé a six faces, des rectangles."),
    trois("Construire un cube, un pavé", "reproduire un cube ou un pavé en assemblant ses faces.",
      "Le modèle sur la table ; des faces découpées, en vrac : lesquelles prendre pour le reproduire ?",
      "Choisir les faces, les assembler avec du ruban adhésif, comparer avec le modèle.",
      "Ce qu'on a vérifié : six faces, chacune à la bonne forme et à la bonne taille."),
    evaluation("reconnaître, nommer et décrire des solides", "Ensuite, au CE1, les sommets et les arêtes."),
  ],
};

const SOLIDES_CE1: Demarche = {
  id: "solides-ce1", nom: "Les solides : faces, sommets, arêtes (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Reconnaître et nommer le cube, la boule, le pavé, le cône, la pyramide, le cylindre ; décrire un cube, un pavé ou une pyramide avec les mots face, sommet et arête, et dénombrer : un pavé, un cube ou une pyramide à base carrée étant donné, le nommer, décrire ses faces, donner le nombre de ses arêtes et de ses sommets. Des recherches d'intrus, des jeux de Kim, des jeux du portrait ; des solides associés à leurs photographies ou à leurs représentations en perspective cavalière, que les élèves ne dessinent pas ; construire un polyèdre en assemblant ses faces, ou ses arêtes et ses sommets.",
  seances: [
    trois("Reconnaître et nommer", "reconnaître et nommer le cube, la boule, le pavé, le cône, la pyramide et le cylindre.",
      "Le jeu de Kim : six solides sur un plateau, on en retire un pendant que les yeux sont fermés. Lequel manque ?",
      "Associer les solides à leurs photographies et à leurs dessins en perspective ; écrire leurs noms.",
      "L'affiche des solides et de leurs noms."),
    trois("Faces, sommets, arêtes", "dénombrer les faces, les sommets et les arêtes d'un cube, d'un pavé, d'une pyramide.",
      "Combien de faces a le cube ? On compte, on recompte, on n'est pas d'accord : comment ne rien oublier ?",
      "Compter en marquant d'une gommette ce qui est déjà compté ; remplir le tableau des faces, des sommets et des arêtes.",
      "La trace écrite : face, sommet, arête, sur un cube dessiné ; le tableau de la classe."),
    seance("Le jeu du portrait", sauront("retrouver un solide à partir de sa description, et le décrire avec les mots face, sommet, arête."), 45, [
      ph(T1, "10 min", "Le professeur choisit un solide en secret. Les élèves, par groupes, préparent des questions — on ne répond que par oui ou non."),
      ph(T2, "25 min", "Questions et réponses au tableau : « A-t-il des faces carrées ? », « Roule-t-il ? » ; puis c'est un élève qui choisit, et le professeur qui questionne, pour introduire les mots qui manquent. Les devinettes du « Qui suis-je ? ».",
        "Les questions écrites au tableau gardent la trace de ce qu'on sait déjà."),
      ph(T3, "10 min", "Les bonnes questions : celles qui portent sur les faces, les sommets, les arêtes."),
    ]),
    trois("Cherche l'intrus", "trouver l'intrus dans une collection de solides et justifier avec le vocabulaire.",
      "Quatre solides, un intrus : lequel, et pourquoi ?",
      "Des rangées de solides et de dessins ; barrer l'intrus et dire pourquoi : ses faces, ses sommets, roule-t-il ?",
      "On compare les raisons : il y a parfois plusieurs bonnes réponses."),
    trois("Construire un polyèdre", "reproduire un cube, un pavé ou une pyramide en assemblant ses faces, ou ses arêtes et ses sommets.",
      "Le modèle : une pyramide à base carrée. Avec quoi la construire ?",
      "Assembler des faces découpées avec du ruban adhésif ; ou des pailles pour les arêtes et de la pâte à modeler pour les sommets ; compter ce qu'il a fallu.",
      "Ce que la construction apprend : autant de pailles que d'arêtes, autant de boules de pâte que de sommets."),
    evaluation("nommer des solides et dénombrer leurs faces, sommets et arêtes", "Ensuite, au CE2, les pyramides et les patrons du cube."),
  ],
};

const SOLIDES_CE2: Demarche = {
  id: "solides-ce2", nom: "Les solides : nommer et justifier (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Nommer un cube, une boule, un pavé, un cône, une pyramide ou un cylindre, et justifier sa nature par le nombre et la nature de ses faces, le nombre de ses sommets et de ses arêtes ; les faces d'une pyramide sont des triangles qui ont un sommet commun, sauf peut-être une, la base, un polygone de trois côtés ou plus. Les représentations en perspective : des faces, des arêtes, des sommets ne se voient pas, et les arêtes cachées sont parfois en pointillés. Construire un cube, un pavé ou une pyramide, en assemblant ses faces ou avec des tiges.",
  seances: [
    trois("Nommer et justifier", "nommer un solide et justifier sa nature par ses faces, ses sommets et ses arêtes.",
      "« C'est un cube, parce que… » : qu'est-ce qui prouve qu'un solide est un cube ?",
      "Des solides et leurs dessins : les nommer, et justifier chaque fois par les faces.",
      "La trace écrite : le portrait de chaque solide."),
    trois("Les pyramides", "reconnaître une pyramide : des faces triangulaires qui ont un sommet commun, et une base.",
      "Une pyramide à base carrée, une autre à base triangulaire : sont-elles de la même famille ?",
      "Dénombrer les faces, les sommets, les arêtes de plusieurs pyramides ; comparer selon leur base.",
      "Ce qu'on retient : la base, et des triangles qui se rejoignent en un sommet."),
    trois("Ce qui ne se voit pas", "identifier un solide connu sur une représentation en perspective, même quand des arêtes sont cachées.",
      "Sur le dessin d'un cube, combien de faces voit-on ? Et sur le vrai cube posé devant soi ?",
      "Des dessins en perspective, des arêtes cachées en pointillés : nommer les solides, compter ce qu'on ne voit pas.",
      "Ce qu'on retient : le dessin ne montre pas tout ; les pointillés montrent ce qui est caché."),
    trois("Le jeu du portrait", "décrire un solide avec précision pour le faire reconnaître.",
      "« J'ai cinq sommets et huit arêtes. Qui suis-je ? »",
      "Résoudre des devinettes ; en écrire pour les autres groupes.",
      "Les devinettes réussies : celles qui ne conviennent qu'à un seul solide."),
    trois("Construire avec des tiges", "construire un cube, un pavé ou une pyramide avec des tiges, ou en assemblant ses faces.",
      "Un pavé à construire : combien de tiges ? de quelles longueurs ?",
      "Construire avec des tiges et des connecteurs, ou des faces à assembler ; vérifier avec le modèle.",
      "On relie la construction au dénombrement : douze arêtes, huit sommets."),
    evaluation("nommer, décrire et justifier la nature de solides", "Ensuite, le patron du cube."),
  ],
};

const PATRON_CUBE_CE2: Demarche = {
  id: "patron-cube-ce2", nom: "Le patron du cube (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Dire si un assemblage de polygones est ou non un patron d'un cube, en argumentant sur le nombre de faces, leur nature et leur position les unes par rapport aux autres. La question est toujours posée à partir d'assemblages de polygones manipulables, pour vérifier ensuite la réponse par des pliages effectifs. Construire un cube à partir d'un patron.",
  seances: [
    trois("Déplier un cube", "décrire ce que devient un cube quand on le déplie le long de quelques arêtes.",
      "Une boîte cubique qu'on découpe le long de quelques arêtes : à plat, que voit-on ?",
      "Déplier des boîtes, compter les faces de l'assemblage obtenu ; le redessiner sur papier quadrillé.",
      "Ce qu'on retient : six carrés, reliés par leurs côtés."),
    trois("Est-ce un patron ?", "dire si un assemblage de six carrés est un patron du cube, et le justifier.",
      "Six carrés en ligne : est-ce un patron du cube ?",
      "Des assemblages de six carrés : prévoir, en imaginant le pliage ; argumenter — deux carrés ne doivent pas venir sur la même face.",
      "On note les prévisions de la classe, avant de vérifier."),
    trois("Vérifier en pliant", "vérifier une prévision en découpant et en pliant l'assemblage.",
      "Les prévisions de la séance d'avant : qui avait raison ?",
      "Découper les assemblages, les plier, constater ; chercher d'autres patrons du cube.",
      "L'affiche des patrons trouvés par la classe — il y en a onze."),
    trois("Construire un cube", "construire un cube à partir d'un patron.",
      "Pour fermer le cube, il faut coller : où mettre les languettes ?",
      "Découper le patron et ses languettes, plier, coller ; vérifier : six faces, huit sommets, douze arêtes.",
      "On compare les cubes : tous superposables ?"),
    evaluation("reconnaître les patrons du cube et construire un cube", "Ensuite, au cycle 3, les patrons du pavé."),
  ],
};

// ── La géométrie plane ────────────────────────────────────────────────────

const FIGURES_CP: Demarche = {
  id: "figures-cp", nom: "Les figures planes : reconnaître, nommer, décrire (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "À partir de manipulations — les pièces d'un tangram, des figures découpées dans du carton — : reconnaître le disque, le carré, le rectangle et le triangle dans un assemblage et dans son environnement proche ; les nommer ; une première description avec les mots sommet et côté, et une justification : le nombre de côtés, les côtés de même longueur du carré et du rectangle ; dire des relations entre les formes : « Il y a deux triangles qui forment un rectangle. »",
  seances: [
    trois("Des formes à trier", "trier des formes planes et reconnaître le disque, le carré, le rectangle et le triangle.",
      "Les pièces d'un tangram et des formes en carton, en vrac : lesquelles vont ensemble ?",
      "Par groupes, trier les formes et dire pourquoi ; retrouver ces formes dans la classe.",
      "Les familles de formes, affichées.", LANGAGE),
    trois("Nommer les figures", "nommer le disque, le carré, le rectangle et le triangle.",
      "On montre une forme : son nom ?",
      "Des figures dans toutes les positions, à colorier selon leur nom ; un carré posé sur la pointe reste un carré.",
      "L'affiche des figures et de leurs noms."),
    trois("Sommets et côtés", "compter les sommets et les côtés d'un polygone, et justifier : un carré a quatre côtés de même longueur.",
      "Combien de « coins » a le triangle ? On dit : des sommets ; et des côtés.",
      "Compter les sommets et les côtés de figures découpées ; comparer les côtés d'un carré, d'un rectangle, en les superposant ou avec une bande.",
      "La trace écrite : le carré, le rectangle, le triangle, leurs sommets et leurs côtés."),
    trois("Des formes dans un assemblage", "décrire un assemblage de formes : deux triangles qui forment un rectangle, deux carrés qui ont un côté commun.",
      "Deux triangles du tangram : peut-on faire un carré ? un rectangle ?",
      "Réaliser des assemblages, puis les décrire à un camarade qui doit les refaire sans les voir.",
      "Les phrases qui ont permis de réussir."),
    evaluation("reconnaître, nommer et décrire des figures planes", "Ensuite, reproduire et construire sur quadrillage."),
  ],
};

const ALIGNEMENTS_CP: Demarche = {
  id: "alignements-cp", nom: "Points alignés et droites (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "D'abord sur des objets réels — dans la cour, aligner des plots pour délimiter une zone ; viser : quand trois arbres sont alignés, le plus proche cache les deux autres —, puis sur des points représentés par de petites croix sur une feuille : dire si trois points sont alignés, à l'œil quand c'est évident, avec la règle sinon ; tracer à la règle une droite passant par deux points, horizontale, verticale ou oblique.",
  seances: [
    trois("Des plots alignés dans la cour", "aligner des objets réels et vérifier un alignement en visant.",
      "Dans la cour, deux plots : où poser le troisième pour qu'ils soient alignés ?",
      "Chacun place sa quille dans l'alignement ; on vérifie en visant — on ne voit plus que la quille la plus proche — et avec une ficelle tendue.",
      "Ce qu'on retient : être alignés, c'est être le long d'une même ligne droite.", "La ficelle tendue deviendra la règle sur la feuille."),
    trois("Des points alignés sur la feuille", "dire si trois points sont alignés, en vérifiant avec la règle quand ce n'est pas évident.",
      "Trois petites croix : alignées ou non ? À l'œil, on hésite parfois.",
      "Poser la règle sur deux points : le troisième est-il le long de la règle ? Des points à trier : alignés, pas alignés.",
      "La règle sert à vérifier."),
    trois("Tracer une droite à la règle", "tracer à la règle une droite qui passe par deux points.",
      "Tracer une ligne bien droite qui passe par deux points : comment faire ?",
      "Tenir la règle d'une main, tracer de l'autre ; des droites horizontales, verticales, obliques ; elles dépassent les points.",
      "Ce qu'on retient : la règle pour tracer ; une droite continue des deux côtés.", "Montre la tenue de la règle : les doigts écartés au milieu, sans gêner le crayon."),
    evaluation("reconnaître des points alignés et tracer une droite", "Ensuite, la règle pour reproduire des figures."),
  ],
};

const REPRODUIRE_CP: Demarche = {
  id: "reproduire-cp", nom: "Reproduire et construire sur quadrillage (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Tracer des figures simples avec des gabarits et des pochoirs ; reproduire, compléter et construire des carrés, des rectangles, des triangles et des assemblages de ces figures, d'abord à main levée puis à la règle, sur papier quadrillé ou pointé : les côtés suivent les lignes du quadrillage. Compléter un rectangle dont deux côtés consécutifs sont tracés, un carré dont un côté est tracé. On vérifie en superposant un calque : « ensuite, nous superposerons le calque pour voir si votre dessin est bien exactement pareil que le modèle ».",
  seances: [
    trois("Gabarits et pochoirs", "tracer des carrés, des rectangles, des triangles, des cercles avec des gabarits et des pochoirs.",
      "Des gabarits et des pochoirs : comment faire le contour bien net ?",
      "Tracer le contour des gabarits, à l'intérieur des pochoirs ; composer des dessins avec ces formes, et les nommer.",
      "Ce qu'on retient : tenir le gabarit sans qu'il bouge."),
    trois("Reproduire sur quadrillage", "reproduire une figure sur quadrillage en comptant les carreaux, et la vérifier avec un calque.",
      "Un modèle sur quadrillage : faire « pareil », exactement. Comment le vérifier ? Avec le calque.",
      "Reproduire, puis échanger avec son voisin et prévoir ce que montrera le calque ; superposer le calque.",
      "Ce qu'on retient : les traits suivent les lignes ; on compte les carreaux ; on repère le point de départ.", "Les erreurs de comptage aux « coins » sont fréquentes : fais compter les carreaux, pas les traits."),
    trois("Compléter un carré, un rectangle", "compléter un carré dont un côté est tracé, et un rectangle dont deux côtés consécutifs sont tracés.",
      "Un côté d'un carré : comment trouver les autres ?",
      "Des carrés et des rectangles à compléter sur quadrillage, à la règle ; vérifier les longueurs en comptant.",
      "La trace écrite : le carré a quatre côtés de même longueur ; le rectangle, ses côtés opposés de même longueur."),
    trois("Sur papier pointé", "reproduire une figure sur papier pointé.",
      "Plus de lignes, seulement des points : comment s'y retrouver ?",
      "Reproduire des figures et des assemblages sur papier pointé ; vérifier au calque.",
      "Ce qu'on retient : on compte les intervalles entre les points."),
    evaluation("reproduire et compléter des figures sur quadrillage", "Ensuite, au CE1, des figures dont les côtés sont obliques."),
  ],
};

const FIGURES_CE1: Demarche = {
  id: "figures-ce1", nom: "Carré, rectangle, triangle rectangle, cercle (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Le vocabulaire géométrique, introduit en situation — côté, sommet, angle, segment, milieu, angle droit, disque, cercle, centre — ; reconnaître, nommer et décrire le carré, le rectangle, le triangle, le triangle rectangle et le cercle, et justifier par le nombre de côtés, les égalités de longueur et les angles droits : « Ce n'est pas un rectangle car l'un de ses angles n'est pas droit. » Un rectangle a quatre sommets, quatre angles droits, quatre côtés, et ses côtés opposés ont la même longueur. L'équerre et la règle le confirment.",
  seances: [
    trois("Le vocabulaire des figures", "utiliser à bon escient les mots côté, sommet, angle, segment, point.",
      "Le jeu du portrait : une figure cachée, des questions pour la trouver. « Il a quatre coins » : on dira « sommets ».",
      "Décrire des figures pour qu'un camarade les retrouve, puis les trace.",
      "La trace écrite : une figure légendée.", LANGAGE),
    trois("Reconnaître et nommer", "reconnaître et nommer le carré, le rectangle, le triangle, le triangle rectangle et le disque.",
      "Des figures dans toutes les positions : lesquelles sont des carrés ?",
      "Nommer des figures découpées puis tracées ; les classer.",
      "L'affiche des figures, dans plusieurs positions."),
    trois("Carré et rectangle : leurs propriétés", "dire les propriétés du carré et du rectangle : leurs angles droits, leurs côtés de même longueur.",
      "Avec l'équerre, on cherche les angles droits d'un rectangle : combien ? Et ses côtés ?",
      "Vérifier à l'équerre et à la règle ; écrire le portrait du carré et du rectangle.",
      "La trace écrite : un rectangle a quatre angles droits et ses côtés opposés ont la même longueur ; un carré, quatre angles droits et quatre côtés de même longueur."),
    trois("Ce n'est pas un carré, parce que…", "justifier qu'une figure n'est pas un carré ou un rectangle par une propriété qui lui manque.",
      "Des carrés et des « presque-carrés » : à l'œil, on se trompe.",
      "Trier des figures, puis vérifier avec l'équerre et la règle ; écrire la raison : « Ce n'est pas un rectangle car l'un de ses angles n'est pas droit. »",
      "Ce qu'on retient : la vérité géométrique, ce n'est pas ce qu'on voit, c'est ce qu'on vérifie."),
    evaluation("reconnaître, nommer, décrire des figures et justifier", "Ensuite, tracer à la règle, à l'équerre et au compas."),
  ],
};

const CONSTRUIRE_CE1: Demarche = {
  id: "construire-ce1", nom: "Tracer et construire : règle, équerre, compas (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Les tracés à la règle, à l'équerre et au compas demandent un apprentissage spécifique et un entraînement régulier. La règle pour vérifier des alignements ; l'angle droit au gabarit en carton, puis à l'équerre — et dire, quand il n'y a aucun doute, s'il est aigu ou obtus — ; le code de l'angle droit ; le compas pour tracer le cercle de centre donné qui passe par un point ; le milieu d'un segment, par pliage ; compléter ou tracer un carré, un rectangle, un triangle rectangle sur papier quadrillé, pointé ou uni, les côtés suivant les lignes ou obliques.",
  seances: [
    trois("L'angle droit : gabarit, puis équerre", "reconnaître un angle droit avec un gabarit puis avec l'équerre, et dire si un angle est aigu ou obtus.",
      "Le coin d'une feuille pliée en quatre : un gabarit d'angle droit. Où trouve-t-on des angles droits dans la classe ?",
      "Chercher des angles droits avec le gabarit, puis l'équerre ; classer des angles : droit, plus petit (aigu), plus grand (obtus).",
      "La trace écrite : l'angle droit, l'angle aigu, l'angle obtus.", "Montre comment placer l'équerre : son angle droit sur le sommet, un côté le long d'un côté."),
    trois("Trouver et coder les angles droits", "repérer les angles droits d'une figure avec l'équerre et les coder.",
      "Ce polygone a-t-il des angles droits ? Combien ?",
      "Chercher les angles droits de figures variées et les coder d'un petit carré.",
      "Le code de l'angle droit, sur l'affiche."),
    trois("Compléter un carré, un rectangle", "compléter un carré ou un rectangle sur quadrillage, ses côtés suivant les lignes ou obliques.",
      "Un côté oblique d'un carré, sur le quadrillage : comment tracer les autres ?",
      "Des carrés, des rectangles, des triangles rectangles à compléter ; vérifier à l'équerre et à la règle.",
      "Ce qu'on retient : pour un carré, il faut des côtés de même longueur et des angles droits."),
    trois("Le compas", "tracer au compas le cercle de centre donné qui passe par un point donné.",
      "Tracer un rond bien régulier autour d'un point : à main levée, c'est difficile.",
      "Apprendre à tenir le compas ; tracer des cercles de centre O passant par A ; trouver le milieu d'un segment par pliage.",
      "La trace écrite : le cercle, son centre.", "Le compas se tient par sa tête ; on pique la pointe, on tourne sans changer l'écartement."),
    trois("Reproduire un assemblage", "reproduire sur quadrillage une figure dont les côtés passent en diagonale par les nœuds.",
      "Un segment qui traverse les carreaux en diagonale : comment le reproduire ?",
      "Reproduire des figures — maison, losange, flèche — en repérant les nœuds ; vérifier au calque.",
      "Ce qu'on retient : on repère les deux extrémités sur les nœuds, puis on trace."),
    evaluation("tracer et vérifier avec la règle, l'équerre et le compas", "Ensuite, au CE2, des constructions sur papier uni."),
  ],
};

const FIGURES_CE2: Demarche = {
  id: "figures-ce2", nom: "Les polygones, le losange, et justifier (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Le vocabulaire : polygone, triangle, quadrilatère, pentagone, hexagone ; carré, rectangle, losange, triangle rectangle ; diagonale, longueur et largeur du rectangle ; disque, cercle, centre, rayon, diamètre ; angle droit, aigu, obtus. Reconnaître, nommer et décrire ces figures, et justifier par le nombre et la longueur des côtés et les angles droits : un losange a quatre côtés de même longueur ; un quadrilatère est un polygone qui a quatre côtés et quatre sommets ; « Ce n'est pas un carré car l'un de ses angles n'est pas un angle droit. »",
  seances: [
    trois("Les polygones", "nommer les polygones selon leur nombre de côtés : triangle, quadrilatère, pentagone, hexagone.",
      "Des figures qui ont 3, 4, 5, 6 côtés : comment les appeler ?",
      "Trier des polygones par nombre de côtés ; nommer et décrire.",
      "La trace écrite : polygone, triangle, quadrilatère, pentagone, hexagone."),
    trois("Le losange", "reconnaître un losange : un quadrilatère qui a quatre côtés de même longueur.",
      "Un carré qu'on « écrase » : ses côtés gardent leur longueur ; est-ce encore un carré ?",
      "Chercher les losanges parmi des quadrilatères, vérifier à la règle ; comparer carré et losange.",
      "Ce qu'on retient : le losange a quatre côtés de même longueur ; le carré aussi, avec en plus quatre angles droits."),
    trois("Propriétés et justification", "justifier la nature d'un quadrilatère par une de ses propriétés.",
      "« Ce n'est pas un carré car… » : terminer la phrase.",
      "Des quadrilatères à identifier avec la règle et l'équerre ; écrire les justifications.",
      "Les justifications de la classe, affichées."),
    trois("Le cercle : centre, rayon, diamètre", "utiliser les mots centre, rayon et diamètre, et tracer un cercle de rayon donné.",
      "Un cercle, son centre : la distance du centre au cercle est-elle partout la même ?",
      "Tracer des cercles de centre et de rayon donnés ; repérer rayon et diamètre.",
      "La trace écrite : le cercle, le centre, le rayon, le diamètre."),
    evaluation("reconnaître, nommer et justifier la nature des figures", "Ensuite, construire sur papier uni."),
  ],
};

const CONSTRUIRE_CE2: Demarche = {
  id: "construire-ce2", nom: "Reproduire et construire sur tout support (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Reproduire sur papier quadrillé des figures usuelles, à main levée ou à la règle ; construire sur papier uni avec la règle graduée, l'équerre et le compas : un rectangle de longueur 7 cm et de largeur 3 cm ; un carré de 6 cm de côté et un cercle de rayon 4 cm ayant pour centre un de ses sommets ; un triangle rectangle dont les côtés de l'angle droit mesurent 10 cm et 4 cm. Coder les angles droits et les segments de même longueur.",
  seances: [
    trois("Reproduire sur quadrillage", "reproduire sur quadrillage une figure dont aucun côté ne suit les lignes.",
      "Un triangle dont aucun côté n'est sur une ligne du quadrillage : par où commencer ?",
      "Repérer les sommets sur les nœuds, compter les déplacements — tant de carreaux à droite, tant vers le haut — ; vérifier au calque.",
      "Ce qu'on retient : chaque sommet sur son nœud."),
    trois("Le rectangle sur papier uni", "tracer un rectangle de dimensions données sur papier uni, avec la règle et l'équerre.",
      "Sans quadrillage, comment avoir des angles droits ?",
      "Terminer des rectangles commencés, puis en tracer de dimensions données ; vérifier les angles et les longueurs.",
      "La méthode écrite : un côté, l'angle droit à l'équerre, la longueur à la règle…"),
    trois("Programmes de construction", "construire une figure à partir d'un programme de construction.",
      "« Un carré dont les côtés ont pour longueur 6 cm et un cercle de rayon 4 cm ayant pour centre un des sommets du carré. »",
      "Lire, construire, vérifier par superposition avec la figure du maître.",
      "Les étapes qui ont permis de réussir."),
    trois("Coder une figure", "coder les angles droits et les côtés de même longueur, et lire une figure codée.",
      "Deux figures qui se ressemblent ; le codage dit ce qui est sûr.",
      "Coder les figures tracées ; construire une figure d'après son codage.",
      "La trace écrite : les codes de l'angle droit et des longueurs égales."),
    evaluation("reproduire et construire des figures avec les instruments", "Ensuite, au cycle 3, les programmes de construction."),
  ],
};

const SYMETRIE_CE2: Demarche = {
  id: "symetrie-ce2", nom: "La symétrie axiale (CE2)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Reconnaître si une figure possède un ou plusieurs axes de symétrie, par pliage ou avec du papier calque, sur des représentations d'objets usuels — cœur, carreau, pique, trèfle, cerf-volant, rectangle, panneaux routiers, lettres majuscules — et tracer ces axes ; compléter une figure pour la rendre symétrique en s'appuyant sur le pliage, puis sur une feuille quadrillée ou pointée, l'axe étant vertical ou horizontal.",
  seances: [
    trois("Plier pour trouver un axe", "reconnaître, par pliage, qu'une figure a un axe de symétrie.",
      "Une figure découpée : peut-on la plier pour que les deux moitiés se superposent exactement ?",
      "Plier des figures découpées ; marquer le pli quand les moitiés coïncident ; certaines en ont plusieurs, d'autres aucun.",
      "La trace écrite : l'axe de symétrie, la ligne de pliage."),
    trois("Les axes des objets usuels", "repérer et tracer les axes de symétrie d'objets usuels, de panneaux, de lettres.",
      "Le panneau « sens interdit », la lettre H, un cœur : combien d'axes ?",
      "Chercher les axes avec un calque qu'on retourne, ou par pliage ; les tracer à la règle.",
      "L'affiche des figures et de leurs axes."),
    trois("Compléter en pliant", "compléter une figure pour la rendre symétrique en s'appuyant sur le pliage.",
      "Une moitié de papillon dessinée, la feuille pliée : comment obtenir l'autre moitié ?",
      "Pliage et piquage, papier calque : obtenir la moitié manquante, puis la dessiner sans plier.",
      "Ce qu'on retient : le symétrique d'un point est de l'autre côté de l'axe, à la même distance."),
    trois("Compléter sur quadrillage", "compléter une figure sur quadrillage ou papier pointé pour la rendre symétrique, l'axe vertical ou horizontal.",
      "Le quadrillage aide : combien de carreaux jusqu'à l'axe ?",
      "Des figures à compléter, l'axe vertical puis horizontal ; vérifier par pliage.",
      "La méthode : compter les carreaux jusqu'à l'axe, et autant de l'autre côté."),
    evaluation("reconnaître des axes de symétrie et compléter une figure symétrique", "Ensuite, au cycle 3, construire le symétrique d'une figure."),
  ],
};

// ── Le repérage dans l'espace ─────────────────────────────────────────────

const POSITIONS_CP: Demarche = {
  id: "positions-cp", nom: "Se repérer dans la classe (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Le vocabulaire des positions relatives — gauche, droite ; sur, sous, entre, devant, derrière, au-dessus, en dessous —, en situation : retrouver un objet ou un élève dont la position a été décrite ; retrouver un objet caché, des boîtes identiques, des émetteurs qui décrivent sans montrer et des récepteurs qui cherchent ; repérer la position de ses camarades sur un plan de la classe, retrouver un objet caché indiqué sur un plan ; reconnaître, parmi trois photographies, celle qui correspond à une maquette.",
  seances: [
    trois("Les mots des positions", "utiliser gauche, droite, sur, sous, entre, devant, derrière, au-dessus, en dessous pour situer des objets.",
      "« Le ballon est derrière le bureau, sous la chaise » : on le trouve ?",
      "Placer des objets selon une consigne, décrire des positions ; des cartes de formes à retrouver d'après leur description.",
      "Les mots, illustrés par des photographies de la classe.", LANGAGE),
    seance("Retrouver l'objet caché", sauront("donner et suivre des indications précises pour retrouver un objet caché."), 45, [
      ph(T1, "10 min", "Des boîtes identiques dans la classe ; un objet caché dans l'une, en l'absence de deux élèves. Les autres leur donnent des indications — sans montrer du doigt."),
      ph(T2, "25 min", "Émetteurs et récepteurs à tour de rôle ; des boîtes de part et d'autre d'un même repère obligent à préciser : devant ou derrière le bloc bleu ?",
        "Introduis les mots qui manquent — « entre » — et fais-les réutiliser."),
      ph(T3, "10 min", "Ce qu'il faut pour un bon message : un repère, et le bon mot."),
    ]),
    trois("Le plan de la classe", "repérer sa place et celle de ses camarades sur un plan de la classe, et y retrouver un objet caché.",
      "Le plan de la classe vu d'en haut : où est la porte ? le tableau ? ma table ?",
      "Placer les photographies des élèves sur le plan ; retrouver l'objet caché marqué d'une croix sur le plan.",
      "Ce qu'on retient : il faut orienter le plan comme la classe."),
    trois("Photographies et maquette", "reconnaître la photographie qui correspond à une maquette placée devant soi.",
      "Trois photographies de la même maquette, prises de trois places : laquelle correspond à ce que je vois ?",
      "Comparer les photographies et la maquette, en équipes ; vérifier en allant se placer.",
      "Ce qu'on retient : ce qu'on voit dépend de l'endroit où l'on est."),
    evaluation("situer des objets et se repérer sur un plan de la classe", "Ensuite, décrire et coder des déplacements."),
  ],
};

const DEPLACEMENTS_CP: Demarche = {
  id: "deplacements-cp", nom: "Se déplacer et coder un déplacement (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${PROGRAMMATION}`,
  resume: "Se déplacer dans la classe et décrire ses déplacements en s'orientant et avec des repères ; les instructions avancer, reculer, tourner à droite, tourner à gauche, monter, descendre ; coder un déplacement qu'un autre élève effectue — « avancer de deux pas, tourner à droite, reculer de trois pas » — ; représenter sur un plan de la classe un itinéraire effectué ; sur un quadrillage, la fusée et ses flèches ; si un robot est disponible, le programmer sur un tapis quadrillé : « avancer d'une case », « pivoter d'un quart de tour à droite », « pivoter d'un quart de tour à gauche » — au plus dix instructions, dont deux virages.",
  seances: [
    trois("Avancer, reculer, tourner", "comprendre et utiliser les instructions avancer, reculer, tourner à droite, tourner à gauche.",
      "Dans la salle de motricité ou la cour : « avance de trois pas, tourne à droite… » ; où arrive-t-on ?",
      "Par deux, l'un donne les instructions, l'autre les exécute ; on échange les rôles.",
      "Les instructions, sur des étiquettes."),
    trois("Coder pour un camarade", "coder un déplacement qu'un autre élève doit effectuer.",
      "Un trajet dans la classe, de la porte au coin lecture : comment le dire sans le montrer ?",
      "Écrire un code avec les étiquettes ; un camarade l'exécute : arrive-t-il au bon endroit ?",
      "Ce qu'on retient : le code doit être précis — combien de pas, quel côté."),
    trois("L'itinéraire sur le plan", "représenter sur un plan de la classe un itinéraire qu'on a effectué.",
      "J'ai suivi un chemin dans la classe : comment le montrer sur le plan ?",
      "Faire un trajet, puis le tracer sur le plan ; un camarade le refait d'après le plan.",
      "Le plan garde la trace du chemin."),
    trois("La fusée sur le quadrillage", "suivre et écrire un code de flèches sur un quadrillage.",
      "La fusée et son code : une flèche, une case.",
      "Décoder, tracer le chemin ; puis écrire le code d'un chemin tracé ; vérifier à deux.",
      "Ce qu'on retient : une flèche par case, dans le bon ordre."),
    trois("Le robot", "suivre un programme d'instructions — avancer d'une case, pivoter d'un quart de tour — sur un tapis quadrillé.",
      "Le robot regarde devant lui : « pivoter », c'est tourner sur place.",
      "Programmer le robot — ou un élève-robot — sur le tapis ; suivre des programmes sur la feuille, au plus dix instructions et deux virages.",
      "La différence entre la fusée et le robot : pour le robot, la droite dépend de là où il regarde.", "Laisse tourner la feuille, ou se mettre à la place du robot."),
    evaluation("suivre et produire un codage de déplacement", "Ensuite, au CE1, des programmes plus longs."),
  ],
};

const ASSEMBLAGES_CP: Demarche = {
  id: "assemblages-cp", nom: "Des assemblages de cubes (CP)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Construire et reproduire des assemblages de cubes et de pavés à partir d'un modèle physique en trois dimensions ou d'une photographie ; décrire un assemblage pour le faire reproduire, avec les mots des positions : sur, sous, à côté, devant, derrière.",
  seances: [
    trois("Reproduire un modèle", "reproduire un assemblage de cubes à partir d'un modèle posé devant soi.",
      "Un assemblage de cubes sur la table : construire le même.",
      "Reproduire des modèles de plus en plus grands ; poser sa construction à côté du modèle pour vérifier.",
      "Ce qu'on retient : regarder le modèle de face, de côté, de dessus."),
    trois("D'après une image", "construire un assemblage de cubes d'après une photographie ou un dessin.",
      "Le modèle n'est plus là : seulement son image.",
      "Construire d'après des cartes-modèles ; compter les cubes ; vérifier à deux.",
      "Ce qu'on retient : sur l'image, on voit les faces de devant, de dessus, de côté."),
    trois("Décrire pour faire construire", "décrire un assemblage pour qu'un camarade le construise sans le voir.",
      "Derrière un écran, un modèle ; mon camarade doit faire le même sans le voir.",
      "Décrire avec les mots des positions ; comparer les deux constructions.",
      "Les mots qui ont aidé : sur, sous, à côté, devant, derrière, à droite, à gauche."),
    evaluation("reproduire des assemblages de cubes", "Ensuite, au CE1, des assemblages sur deux rangées."),
  ],
};

const POSITIONS_CE1: Demarche = {
  id: "positions-ce1", nom: "Se repérer dans l'école et le quartier (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Enrichir le lexique — à gauche, à droite ; sur, sous, entre, devant, derrière, au-dessus, en dessous ; près, loin — et établir des relations entre des espaces familiers et leurs représentations : maquettes, plans, photographies. Produire un plan de l'école où l'on place sa classe, la cantine, les toilettes, le bureau du directeur ou de la directrice ; représenter sur un plan ou une photographie aérienne du quartier des lieux connus : école, mairie, bibliothèque, piscine, boulangerie.",
  seances: [
    trois("Les mots des positions", "situer des personnes et des objets avec précision : à gauche, à droite, entre, près, loin.",
      "« La bibliothèque est près de l'école, la piscine est loin » : comment le dire avec précision ?",
      "Des cartes de formes à retrouver d'après leur description ; décrire une position pour un camarade.",
      "Les mots des positions, avec leurs exemples.", LANGAGE),
    seance("Le plan de l'école", sauront("produire un plan de l'école et y placer des lieux connus."), 55, [
      ph(T1, "10 min", "Une visite de l'école, appareil photo en main : la classe, la cantine, les toilettes, le bureau du directeur ou de la directrice."),
      ph(T2, "30 min", "Par groupes, dessiner le plan vu d'en haut, placer les photographies ; un autre groupe le contrôle en parcourant l'école.",
        "Les élèves « rabattent » volontiers murs et meubles : la maquette et la photographie vue de dessus aident à imaginer la vue d'en haut."),
      ph(T3, "15 min", "Le plan de la classe, mis au propre : les lieux, leur légende."),
    ]),
    trois("Le quartier sur un plan", "repérer sur un plan ou une photographie aérienne du quartier des lieux connus.",
      "La photographie aérienne du quartier : où est l'école ?",
      "Repérer la mairie, la bibliothèque, la piscine, la boulangerie ; tracer un trajet connu.",
      "Ce qu'on retient : le plan représente vu d'en haut, en plus petit."),
    trois("Des points de vue", "reconnaître ce que voit quelqu'un placé ailleurs que soi.",
      "Trois objets sur une table, quatre places autour : de quelle place a-t-on pris cette photographie ?",
      "Par équipes, associer des vues aux places ; un éclaireur va vérifier.",
      "Ce qu'on retient : il faut se mettre à la place de l'autre."),
    evaluation("situer des lieux sur un plan et décrire des positions", "Ensuite, coder des déplacements sur un plan."),
  ],
};

const DEPLACEMENTS_CE1: Demarche = {
  id: "deplacements-ce1", nom: "Coder des déplacements, programmer (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${PROGRAMMATION}`,
  resume: "Comprendre, utiliser et produire une suite d'instructions qui codent un déplacement : représenter sur un plan de l'école ou du quartier un itinéraire effectué ; coder un déplacement qu'un autre élève trace sur un plan ; sur quadrillage, des déplacements absolus — la fusée — puis relatifs, qui dépendent de l'orientation de celui qui se déplace ; si un robot est disponible, le programmer avec « avancer de », « pivoter d'un quart de tour à droite », « pivoter d'un quart de tour à gauche » : au plus quinze instructions, dont quatre virages.",
  seances: [
    trois("L'itinéraire sur le plan", "représenter sur un plan un itinéraire effectué, et en suivre un.",
      "Un trajet dans l'école : comment le noter pour qu'un autre le refasse ?",
      "Tracer son itinéraire sur le plan ; un camarade le suit.",
      "Ce qu'on retient : les repères et les virages."),
    trois("La fusée : coder et décoder", "écrire et suivre un code de flèches sur quadrillage.",
      "Le code de la fusée : une flèche, une case, dans une direction fixe.",
      "Écrire le code d'un chemin tracé ; tracer le chemin d'un code ; échanger pour vérifier.",
      "Ce qu'on retient : un code précis donne un seul chemin."),
    trois("Corriger un code", "trouver et corriger l'erreur d'un code.",
      "La fusée n'arrive pas à l'étoile : où est l'erreur ?",
      "Des codes faux à corriger ; dire comment on a trouvé.",
      "La méthode : suivre le code pas à pas, et comparer avec le chemin."),
    trois("Le robot : déplacements relatifs", "suivre un programme où les virages dépendent de l'orientation du robot.",
      "Le robot regarde vers la gauche de la feuille : pour lui, où est sa droite ?",
      "Suivre des programmes ; jouer au robot sur un tapis quadrillé ; comparer avec les flèches de la fusée.",
      "Ce qu'on retient : pivoter fait tourner sur place ; la droite du robot n'est pas forcément la mienne.", "Les élèves non latéralisés ont besoin de se mettre à la place du robot."),
    trois("Programmer le robot", "écrire le programme d'un déplacement, au plus quinze instructions dont quatre virages.",
      "Amener le robot jusqu'à l'étoile : quel programme ?",
      "Écrire des programmes, les tester sur le tapis ou avec le robot, les corriger.",
      "On compare des programmes différents pour le même trajet."),
    evaluation("comprendre et produire un codage de déplacement", "Ensuite, au cycle 3, programmer sur écran."),
  ],
};

const ASSEMBLAGES_CE1: Demarche = {
  id: "assemblages-ce1", nom: "Des assemblages de cubes et de pavés (CE1)", famille: "Mathématiques",
  source: `${PROGRAMME} ; ${ESPACE}`,
  resume: "Construire des assemblages de cubes et de pavés à partir d'un modèle physique en trois dimensions ou d'une représentation plane — une photographie, une représentation en perspective cavalière — ; décrire un assemblage avec un vocabulaire spatial précis pour le faire construire.",
  seances: [
    trois("Reproduire un modèle", "reproduire un assemblage de cubes et de pavés posé devant soi.",
      "Un assemblage sur deux rangées : celle de devant, celle de derrière.",
      "Reproduire des modèles ; vérifier en les tournant ensemble.",
      "Ce qu'on retient : regarder de devant, de côté, de dessus."),
    trois("D'après une représentation en perspective", "construire un assemblage d'après une photographie ou une représentation en perspective cavalière.",
      "Sur le dessin, certains cubes sont derrière d'autres : comment le voit-on ?",
      "Construire d'après des cartes-modèles ; compter les cubes ; comparer avec le dessin.",
      "Ce qu'on retient : le dessin montre les faces de devant, de dessus et de droite."),
    trois("Décrire pour faire construire", "décrire un assemblage pour qu'un camarade le construise sans le voir.",
      "Derrière un écran, un modèle à faire construire.",
      "Décrire avec précision ; comparer les constructions ; améliorer les descriptions.",
      "Les mots qui ont permis de réussir."),
    evaluation("construire des assemblages d'après des représentations", "Ensuite, au CE2, les solides et leurs représentations."),
  ],
};

export const DEMARCHES_GEOMETRIE: Demarche[] = [
  SOLIDES_CP, SOLIDES_CE1, SOLIDES_CE2, PATRON_CUBE_CE2,
  FIGURES_CP, ALIGNEMENTS_CP, REPRODUIRE_CP, FIGURES_CE1, CONSTRUIRE_CE1, FIGURES_CE2, CONSTRUIRE_CE2, SYMETRIE_CE2,
  POSITIONS_CP, DEPLACEMENTS_CP, ASSEMBLAGES_CP, POSITIONS_CE1, DEPLACEMENTS_CE1, ASSEMBLAGES_CE1,
];

/**
 * La séquence d'une compétence de l'espace et de la géométrie, à sa classe ;
 * rien sinon. `cg` : « les solides », « la geometrie plane », « le reperage
 * dans l'espace » ; le tout en minuscules sans accents.
 */
export function demarcheDeLaGeometrie(classe: string, cg: string, comp: string): string | null {
  if (/solides/.test(cg)) {
    if (classe === "ce2" && /patron/.test(comp)) return "patron-cube-ce2";
    return /^(cp|ce1|ce2)$/.test(classe) ? `solides-${classe}` : null;
  }
  if (/geometrie plane/.test(cg)) {
    if (classe === "cp") return /alignement|la regle comme instrument/.test(comp) ? "alignements-cp" : /construire un carre/.test(comp) ? "reproduire-cp" : "figures-cp";
    if (classe === "ce1") return /reproduire ou construire|regle pour verifier|instruments de trace|code pour les angles droits/.test(comp) ? "construire-ce1" : "figures-ce1";
    if (classe === "ce2") return /symetri/.test(comp) ? "symetrie-ce2" : /reproduire ou construire|codage/.test(comp) ? "construire-ce2" : "figures-ce2";
  }
  if (/reperage dans l.espace/.test(cg)) {
    if (classe !== "cp" && classe !== "ce1") return null;
    if (/assemblages/.test(comp)) return `assemblages-${classe}`;
    if (/deplacement|itineraire/.test(comp)) return `deplacements-${classe}`;
    return `positions-${classe}`;
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const geometrie = (seance: number, titre: string, r: Partial<ReglagesGeometrie>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GEOMETRIE, ...r };
  return {
    seance, atelier: "geometrie", titre,
    fabriquer: (g) => ({ html: htmlGeometrie(reglages, g), style: STYLE_FEUILLE + STYLE_GEOMETRIE, refaire: { geometrie: reglages } }),
  };
};
const solides = (seance: number, titre: string, r: Partial<ReglagesSolides>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_SOLIDES, ...r };
  return {
    seance, atelier: "solides", titre,
    fabriquer: (g) => ({ html: htmlSolides(reglages, g), style: STYLE_FEUILLE + STYLE_SOLIDES, refaire: { solides: reglages } }),
  };
};
const deplacements = (seance: number, titre: string, r: Partial<ReglagesDeplacements>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DEPLACEMENTS, ...r };
  return {
    seance, atelier: "deplacements", titre,
    fabriquer: (g) => ({ html: htmlDeplacements(reglages, g), style: STYLE_FEUILLE + STYLE_DEPLACEMENTS, refaire: { deplacements: reglages } }),
  };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "solides-cp": {
    feuilles: [
      solides(1, "Reconnaître les solides", { exercice: "nommer", classe: "CP", combien: 8 }),
      solides(2, "Les objets et leur forme", { exercice: "objets", classe: "CP", combien: 8 }),
      solides(4, "Les faces d'un cube", { exercice: "faces", classe: "CP", solide: "cube" }),
      solides(4, "Les faces d'un pavé", { exercice: "faces", classe: "CP", solide: "pavé" }),
      solides(5, "Reconnaître les solides — évaluation", { exercice: "nommer", classe: "CP", combien: 8 }),
    ],
    materiel: ["Une collection de solides et d'objets de la classe", "Le sac à solides ; l'affiche", "Des boîtes et des objets apportés par les élèves", "Des cubes, des pavés ; un tampon encreur ; des gommettes", "Des modèles ; du ruban adhésif", "Des solides"],
  },
  "solides-ce1": {
    feuilles: [
      solides(0, "Reconnaître les solides", { exercice: "nommer", classe: "CE1", combien: 12 }),
      solides(1, "Faces, sommets, arêtes", { exercice: "denombrer", classe: "CE1" }),
      solides(2, "Qui suis-je ?", { exercice: "portrait", classe: "CE1", combien: 6 }),
      solides(3, "Cherche l'intrus", { exercice: "intrus", classe: "CE1", combien: 4 }),
      solides(4, "Les faces d'une pyramide", { exercice: "faces", classe: "CE1", solide: "pyramide" }),
      solides(5, "Faces, sommets, arêtes — évaluation", { exercice: "denombrer", classe: "CE1" }),
    ],
    materiel: ["Des solides sur un plateau ; un foulard", "Des cubes, des pavés, des pyramides ; des gommettes", "Les solides de la classe", "Des solides", "Des pailles et de la pâte à modeler ; du ruban adhésif", "Des solides"],
  },
  "solides-ce2": {
    feuilles: [
      solides(0, "Reconnaître les solides", { exercice: "nommer", classe: "CE2", combien: 12 }),
      solides(1, "Faces, sommets, arêtes", { exercice: "denombrer", classe: "CE2", cachees: true }),
      solides(2, "Ce qui ne se voit pas", { exercice: "nommer", classe: "CE2", cachees: true, combien: 12 }),
      solides(3, "Qui suis-je ?", { exercice: "portrait", classe: "CE2", combien: 8, cachees: true }),
      solides(4, "Les faces d'une pyramide", { exercice: "faces", classe: "CE2", solide: "pyramide" }),
      solides(5, "Cherche l'intrus — évaluation", { exercice: "intrus", classe: "CE2", cachees: true, combien: 4 }),
    ],
    materiel: ["Des solides", "Des pyramides de bases différentes", "Des solides et leurs dessins", "Les solides de la classe", "Des tiges et des connecteurs", "Des solides"],
  },
  "patron-cube-ce2": {
    feuilles: [
      solides(1, "Est-ce un patron du cube ?", { exercice: "patrons", classe: "CE2", combien: 6 }),
      solides(2, "D'autres assemblages à plier", { exercice: "patrons", classe: "CE2", combien: 8 }),
      solides(3, "Le patron du cube", { exercice: "patronCube", classe: "CE2" }),
      solides(4, "Est-ce un patron du cube ? — évaluation", { exercice: "patrons", classe: "CE2", combien: 6 }),
    ],
    materiel: ["Des boîtes cubiques à déplier ; du papier quadrillé", "Des ciseaux", "Des ciseaux ; des carrés en carton", "Des ciseaux, de la colle", "Des ciseaux"],
  },
  "figures-cp": {
    feuilles: [
      geometrie(1, "Reconnaître et nommer les figures", { exercice: "trier", classe: "CP", combien: 12 }),
      geometrie(4, "Les figures — évaluation", { exercice: "trier", classe: "CP", combien: 8 }),
    ],
    materiel: ["Des tangrams ; des formes en carton", "Les formes ; l'affiche", "Des formes découpées ; des bandes de papier", "Des tangrams", "Des crayons de couleur"],
  },
  "alignements-cp": {
    feuilles: [
      geometrie(1, "Des points alignés", { exercice: "alignements", classe: "CP", combien: 6 }),
      geometrie(2, "Tracer des droites", { exercice: "alignements", classe: "CP", combien: 4 }),
      geometrie(3, "Des points alignés — évaluation", { exercice: "alignements", classe: "CP", combien: 4 }),
    ],
    materiel: ["Des plots, des quilles, une ficelle", "Une règle par élève", "Une règle par élève", "Une règle"],
  },
  "reproduire-cp": {
    feuilles: [
      geometrie(1, "Reproduire sur quadrillage", { exercice: "reproduire", classe: "CP", niveau: "lignes", support: "quadrille", combien: 3 }),
      geometrie(2, "Compléter un carré, un rectangle", { exercice: "completer", classe: "CP", support: "quadrille", combien: 4 }),
      geometrie(3, "Reproduire sur papier pointé", { exercice: "reproduire", classe: "CP", niveau: "lignes", support: "pointe", combien: 3 }),
      geometrie(4, "Reproduire — évaluation", { exercice: "reproduire", classe: "CP", niveau: "lignes", support: "quadrille", combien: 3 }),
    ],
    materiel: ["Des gabarits et des pochoirs", "La règle ; le calque de vérification", "La règle", "La règle ; le calque", "La règle ; le calque"],
  },
  "figures-ce1": {
    feuilles: [
      geometrie(1, "Reconnaître et nommer les figures", { exercice: "trier", classe: "CE1", combien: 12 }),
      geometrie(2, "Les angles droits", { exercice: "anglesDroits", classe: "CE1", combien: 6 }),
      geometrie(3, "Carrés et presque-carrés", { exercice: "trier", classe: "CE1", combien: 12 }),
      geometrie(4, "Les figures — évaluation", { exercice: "trier", classe: "CE1", combien: 8 }),
    ],
    materiel: ["Des figures cachées dans une enveloppe", "Des figures découpées", "L'équerre et la règle", "Des carrés et des presque-carrés découpés ; l'équerre", "L'équerre et la règle"],
  },
  "construire-ce1": {
    feuilles: [
      geometrie(0, "Droit, aigu ou obtus ?", { exercice: "angles", classe: "CE1", combien: 9 }),
      geometrie(1, "Les angles droits", { exercice: "anglesDroits", classe: "CE1", combien: 6 }),
      geometrie(2, "Compléter un carré, un rectangle", { exercice: "completer", classe: "CE1", support: "quadrille", combien: 6 }),
      geometrie(3, "Tracer des cercles", { exercice: "cercles", classe: "CE1", combien: 4 }),
      geometrie(4, "Reproduire sur quadrillage", { exercice: "reproduire", classe: "CE1", niveau: "diagonales", support: "quadrille", combien: 3 }),
      geometrie(5, "Compléter sur papier uni — évaluation", { exercice: "completer", classe: "CE1", uni: true, combien: 4 }),
    ],
    materiel: ["Des feuilles à plier en quatre ; l'équerre", "L'équerre", "La règle et l'équerre", "Un compas par élève", "La règle ; le calque", "La règle et l'équerre"],
  },
  "figures-ce2": {
    feuilles: [
      geometrie(0, "Reconnaître et nommer les figures", { exercice: "trier", classe: "CE2", combien: 12 }),
      geometrie(2, "Les angles droits", { exercice: "anglesDroits", classe: "CE2", combien: 6 }),
      geometrie(3, "Tracer des cercles", { exercice: "cercles", classe: "CE2", combien: 4 }),
      geometrie(4, "Les figures — évaluation", { exercice: "trier", classe: "CE2", combien: 8 }),
    ],
    materiel: ["Des polygones découpés", "Des quadrilatères articulés ; la règle", "La règle et l'équerre", "Le compas", "La règle, l'équerre, le compas"],
  },
  "construire-ce2": {
    feuilles: [
      geometrie(0, "Reproduire sur quadrillage", { exercice: "reproduire", classe: "CE2", niveau: "obliques", support: "quadrille", combien: 3 }),
      geometrie(1, "Compléter sur papier uni", { exercice: "completer", classe: "CE2", uni: true, combien: 4 }),
      geometrie(2, "Programmes de construction", { exercice: "construire", classe: "CE2", combien: 3 }),
      geometrie(3, "Coder les angles droits", { exercice: "anglesDroits", classe: "CE2", combien: 6 }),
      geometrie(4, "Programmes de construction — évaluation", { exercice: "construire", classe: "CE2", combien: 2 }),
    ],
    materiel: ["La règle ; le calque", "La règle graduée et l'équerre", "La règle, l'équerre, le compas", "L'équerre", "La règle, l'équerre, le compas"],
  },
  "symetrie-ce2": {
    feuilles: [
      geometrie(1, "Les axes de symétrie", { exercice: "axes", classe: "CE2", combien: 12 }),
      geometrie(3, "Compléter par symétrie", { exercice: "symetrie", classe: "CE2", support: "quadrille", combien: 4 }),
      geometrie(3, "Compléter par symétrie sur papier pointé", { exercice: "symetrie", classe: "CE2", support: "pointe", combien: 4 }),
      geometrie(4, "Compléter par symétrie — évaluation", { exercice: "symetrie", classe: "CE2", support: "quadrille", combien: 2 }),
    ],
    materiel: ["Des figures découpées à plier", "Du papier calque ; des ciseaux", "Des feuilles à plier ; une épingle ; du papier calque", "La règle", "La règle"],
  },
  "positions-cp": {
    feuilles: [
      deplacements(0, "Où sont les formes ?", { exercice: "positions", classe: "CP", combien: 5 }),
      deplacements(4, "Où sont les formes ? — évaluation", { exercice: "positions", classe: "CP", combien: 4 }),
    ],
    materiel: ["Des objets de la classe", "Des boîtes identiques ; un objet à cacher ; des blocs de couleur", "Le plan de la classe ; les photographies des élèves", "Une maquette ; trois photographies", "Le plan de la classe"],
  },
  "deplacements-cp": {
    feuilles: [
      deplacements(3, "La fusée", { exercice: "fusee", classe: "CP", mode: "decoder", combien: 4 }),
      deplacements(3, "Le code de la fusée", { exercice: "fusee", classe: "CP", mode: "coder", combien: 4 }),
      deplacements(4, "Le robot", { exercice: "robot", classe: "CP", mode: "decoder", combien: 4 }),
      deplacements(5, "La fusée — évaluation", { exercice: "fusee", classe: "CP", mode: "coder", combien: 2 }),
    ],
    materiel: ["La salle de motricité ou la cour", "Des étiquettes d'instructions", "Le plan de la classe", "Un quadrillage au sol", "Un tapis quadrillé ; un robot, s'il y en a un", "Un quadrillage"],
  },
  "assemblages-cp": {
    feuilles: [
      solides(1, "Des assemblages à construire", { exercice: "assemblages", classe: "CP", combien: 6 }),
      solides(3, "Des assemblages — évaluation", { exercice: "assemblages", classe: "CP", combien: 4 }),
    ],
    materiel: ["Des cubes emboîtables ; des modèles", "Des cubes emboîtables", "Des cubes ; un écran en carton", "Des cubes emboîtables"],
  },
  "positions-ce1": {
    feuilles: [
      deplacements(0, "Où sont les formes ?", { exercice: "positions", classe: "CE1", combien: 6 }),
      deplacements(4, "Où sont les formes ? — évaluation", { exercice: "positions", classe: "CE1", combien: 4 }),
    ],
    materiel: ["Des cartes de positions", "Un appareil photo ; de grandes feuilles", "Un plan et une photographie aérienne du quartier", "Trois objets ; des vues dessinées", "Le plan de l'école"],
  },
  "deplacements-ce1": {
    feuilles: [
      deplacements(1, "Le code de la fusée", { exercice: "fusee", classe: "CE1", mode: "coder", combien: 4 }),
      deplacements(1, "La fusée", { exercice: "fusee", classe: "CE1", mode: "decoder", combien: 4 }),
      deplacements(2, "Corriger le code", { exercice: "fusee", classe: "CE1", mode: "corriger", combien: 4 }),
      deplacements(3, "Le robot", { exercice: "robot", classe: "CE1", mode: "decoder", combien: 4 }),
      deplacements(4, "Programmer le robot", { exercice: "robot", classe: "CE1", mode: "coder", combien: 4 }),
      deplacements(5, "Le robot — évaluation", { exercice: "robot", classe: "CE1", mode: "decoder", combien: 2 }),
    ],
    materiel: ["Le plan de l'école", "Un quadrillage", "Des codes à corriger", "Un tapis quadrillé ; un robot, s'il y en a un", "Le robot ou un élève-robot", "Un quadrillage"],
  },
  "assemblages-ce1": {
    feuilles: [
      solides(1, "Des assemblages à construire", { exercice: "assemblages", classe: "CE1", combien: 6 }),
      solides(3, "Des assemblages — évaluation", { exercice: "assemblages", classe: "CE1", combien: 4 }),
    ],
    materiel: ["Des cubes et des pavés ; des modèles", "Des cubes emboîtables", "Des cubes ; un écran en carton", "Des cubes emboîtables"],
  },
};

export const estUneDemarcheDeGeometrie = (id: string) => id in PLANS;

export function planDeLaGeometrie(demarcheId: string): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
