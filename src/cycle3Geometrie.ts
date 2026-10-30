// L'espace et la géométrie au cours moyen : les droites, le cercle, les
// figures usuelles, les constructions, la symétrie, les solides et leurs
// patrons, les déplacements et les assemblages de cubes. Aucun livret
// d'accompagnement n'en propose de séquence : elles sont bâties, en le
// disant, sur le programme de mathématiques du cycle 3 (2025) et ses exemples
// de réussite, dont elles reprennent les situations — « cette figure est un
// rectangle, car c'est un quadrilatère qui a quatre angles droits » ; le
// rectangle ABCD de 7 cm sur 3 cm ; le cercle de centre A qui passe par le
// milieu de [AB] ; le gros cube dont on a retiré des petits cubes.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_GEOMETRIE_CM, STYLE_GEOMETRIE_CM, htmlGeometrieCM, type ExerciceGeometrieCM } from "./geometrieCoursMoyen";
import { REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type ExerciceGeometrie } from "./geometrie";
import { REGLAGES_SOLIDES, STYLE_SOLIDES, htmlSolides, type ExerciceSolides } from "./solides";
import { REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements, type ModeCodage } from "./deplacements";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `La feuille d'évaluation : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);

const PROGRAMME_C3 = "Bâtie sur le programme de mathématiques du cycle 3 (2025) et ses exemples de réussite (Éduscol, 2025) — le livret d'accompagnement n'a pas de séquence pour cette notion — ; démarche en quatre temps des livrets";
const OUTILS = "Chacun a sa règle graduée, son équerre et son compas ; l'enseignant montre le geste au tableau, avec les instruments du tableau.";

// ── Les droites ───────────────────────────────────────────────────────────

const droites = (classe: "CM1" | "CM2"): Demarche => ({
  id: `droites-${classe.toLowerCase()}`, nom: `Droites perpendiculaires et parallèles (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: `Le vocabulaire — point, droite, segment, demi-droite, milieu d'un segment, droites sécantes — et les codes des angles droits et des longueurs égales${classe === "CM2" ? ", puis les symboles ⊥, //, ∈ et ∉" : ""}. Deux droites perpendiculaires se coupent en formant quatre angles droits ; deux droites parallèles ne se coupent pas : deux droites sont soit parallèles, soit sécantes, même quand leur point d'intersection n'est pas sur la feuille. Reconnaître, vérifier à l'équerre, puis tracer la perpendiculaire et la parallèle à une droite passant par un point ; deux droites perpendiculaires à une même droite sont parallèles.`,
  seances: [
    seance("Points, droites, segments", sauront(`nommer un point, une droite, un segment, une demi-droite, et lire les codes d'une figure${classe === "CM2" ? ", avec les symboles ⊥, //, ∈ et ∉" : ""}.`), 45, [
      ph(T1, "10 min", "Un segment s'arrête à ses extrémités ; une droite ne s'arrête pas ; une demi-droite part d'un point. Comment les distinguer sur un dessin ?"),
      ph(T2, "25 min", "Nommer ce qui est tracé : (AB), [AB], [AB) ; placer le milieu d'un segment ; lire les codes des angles droits et des longueurs égales.", OUTILS),
      ph(T3, "10 min", "La trace écrite : les notations, et les codes."),
    ]),
    seance("Des droites perpendiculaires", sauront("reconnaître des droites perpendiculaires, et tracer à l'équerre la perpendiculaire à une droite passant par un point."), 45, [
      ph(T1, "10 min", "Ces deux droites forment-elles un angle droit ? À l'œil quand c'est net ; sinon, l'équerre décide."),
      ph(T2, "25 min", "Trier des paires de droites ; tracer la perpendiculaire à (d) passant par A, le point sur la droite ou hors de la droite.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : deux droites perpendiculaires se coupent en formant quatre angles droits."),
    ]),
    seance("Des droites parallèles", sauront("reconnaître des droites parallèles et tracer à l'équerre la parallèle à une droite passant par un point."), 45, [
      ph(T1, "10 min", "Deux droites qui ne se coupent pas sur la feuille sont-elles parallèles ? Et si on les prolonge ?"),
      ph(T2, "25 min", "Parallèles ou sécantes ; tracer deux perpendiculaires à une même droite : elles sont parallèles ; puis la parallèle à (d) passant par A, en deux perpendiculaires.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : deux droites sont soit parallèles, soit sécantes ; deux droites perpendiculaires à une même droite sont parallèles."),
    ]),
    evaluation("reconnaître et tracer des droites perpendiculaires et parallèles", "Ensuite, les figures usuelles : leurs côtés perpendiculaires, leurs côtés parallèles."),
  ],
});

// ── Le cercle ─────────────────────────────────────────────────────────────

const cercle = (classe: "CM1" | "CM2"): Demarche => ({
  id: `cercle-${classe.toLowerCase()}`, nom: `Le cercle et le disque (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Le vocabulaire du cercle et du disque — centre, rayon, diamètre, corde, arc de cercle — et leur définition par la distance : le cercle de centre A qui passe par B, c'est l'ensemble des points situés à la même distance de A que B ; le disque de centre A et de rayon 4 cm, l'ensemble des points situés à 4 cm au plus de A. Tracer des cercles au compas, d'un rayon ou d'un diamètre donnés.",
  seances: [
    seance("Centre, rayon, diamètre", sauront("nommer le centre, un rayon, un diamètre, une corde et un arc d'un cercle."), 45, [
      ph(T1, "10 min", "Tracer un cercle avec une ficelle, au sol : qu'est-ce qui reste toujours pareil ?"),
      ph(T2, "25 min", "Au compas : le centre, un rayon, un diamètre — deux rayons alignés —, une corde, un arc ; les nommer sur des figures.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : tous les points du cercle sont à la même distance du centre ; le diamètre mesure deux rayons."),
    ]),
    seance("Le cercle et le disque", sauront("dire si un point est sur un cercle, dans le disque ou dehors, en mesurant sa distance au centre."), 45, [
      ph(T1, "10 min", "Des points autour d'un centre O : lesquels sont à 3 cm de O ? À 3 cm au plus ?"),
      ph(T2, "25 min", "Mesurer au compas ou à la règle ; tracer le cercle, colorier le disque ; le cercle de centre A qui passe par B.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : le cercle, ce sont les points à la distance donnée ; le disque, ceux qui en sont au plus à cette distance."),
    ]),
    evaluation("utiliser le vocabulaire du cercle et tracer des cercles", "Ensuite, des cercles dans les constructions."),
  ],
});

// ── Les figures ───────────────────────────────────────────────────────────

const figures = (classe: "CM1" | "CM2"): Demarche => ({
  id: `figures-${classe.toLowerCase()}`, nom: `Les figures usuelles : les nommer, dire pourquoi (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: `Polygone, triangle, quadrilatère${classe === "CM2" ? ", pentagone, hexagone" : ""} ; triangle rectangle, isocèle, équilatéral ; carré, rectangle, losange${classe === "CM2" ? ", trapèze, trapèze rectangle" : ""} ; côté, sommet, angle d'un polygone, diagonale, longueur et largeur du rectangle. Nommer une figure en s'appuyant à la fois sur ses propriétés — prélevées aux instruments ou lues sur les codes — et sur les définitions : « cette figure est un rectangle, car c'est un quadrilatère qui a quatre angles droits » ; et dire ce qu'elle n'est pas : « ce n'est pas un carré, car ses côtés n'ont pas tous la même longueur ».${classe === "CM2" ? " Distinguer une définition d'une propriété : un quadrilatère dont les côtés opposés ont la même longueur n'est pas forcément un rectangle." : ""}`,
  seances: [
    seance("Les triangles", sauront("nommer un triangle rectangle, isocèle ou équilatéral, en s'appuyant sur sa définition."), 45, [
      ph(T1, "10 min", "Des triangles découpés : les trier ; sur quoi s'appuie-t-on ?"),
      ph(T2, "25 min", "Vérifier les angles droits à l'équerre, les longueurs au compas ou à la règle ; lire les codes ; nommer.", OUTILS),
      ph(T3, "10 min", "Les définitions, écrites : un triangle rectangle a un angle droit ; isocèle, deux côtés de même longueur ; équilatéral, trois."),
    ]),
    seance("Les quadrilatères", sauront(`nommer un carré, un rectangle, un losange${classe === "CM2" ? ", un trapèze, un trapèze rectangle" : ""}, en s'appuyant sur leurs définitions.`), 45, [
      ph(T1, "10 min", "Un carré est-il un rectangle ? Un losange ? Que dit la définition ?"),
      ph(T2, "25 min", `Vérifier les angles droits, les côtés de même longueur${classe === "CM2" ? ", les côtés parallèles" : ""} ; nommer, puis justifier par écrit : « c'est un …, car c'est un … qui a … ».`, OUTILS),
      ph(T3, "10 min", "Les définitions, et les propriétés : les côtés opposés d'un rectangle sont parallèles et de même longueur."),
    ]),
    seance("Dire pourquoi", sauront("justifier qu'une figure est, ou n'est pas, d'une certaine nature."), 45, [
      ph(T2, "35 min", "Des figures codées et non codées : « c'est un losange, car… » ; « ce n'est pas un carré, car… ». Un élève justifie, un autre vérifie aux instruments."),
      ph(T3, "10 min", classe === "CM2" ? "Ce qu'on retient : une définition suffit pour affirmer ; une propriété, non." : "Ce qu'on retient : on nomme avec une définition, et on la vérifie aux instruments ou avec les codes."),
    ]),
    evaluation("nommer des figures usuelles et justifier", "Ensuite, construire ces figures."),
  ],
});

// ── Les constructions ─────────────────────────────────────────────────────

const constructions = (classe: "CM1" | "CM2"): Demarche => ({
  id: `constructions-${classe.toLowerCase()}`, nom: `Reproduire, construire, ${classe === "CM2" ? "écrire " : ""}un programme de construction (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: classe === "CM1"
    ? "Reproduire des figures usuelles sur papier quadrillé, à main levée ou à la règle ; construire sur papier uni un rectangle ABCD de 7 cm sur 3 cm, un carré KLMN de 8 cm de côté et le cercle de diamètre [LM], un triangle RST rectangle en R tel que RS = 10 cm et RT = 6 cm, en codant les angles droits et les longueurs égales ; suivre un programme de construction — « Trace un rectangle ABCD tel que AB = 5 cm et BC = 3 cm. Trace le cercle de centre A qui passe par le milieu du côté [AB]. » —, aussi avec un logiciel de géométrie dynamique."
    : "Construire sur papier uni un triangle ABC rectangle en A tel que AB = 7 cm et BC = 10 cm, un losange KLMN de 10 cm de côté dont la diagonale [KM] mesure 8 cm et le cercle de centre L de rayon 6 cm, un triangle RST isocèle et rectangle en R tel que RS = 7,4 cm, en codant les figures ; suivre un programme de construction, sur papier ou avec un logiciel de géométrie dynamique ; et, dans des cas simples, écrire le programme de construction d'une figure donnée.",
  seances: [
    seance(classe === "CM1" ? "Reproduire sur quadrillage" : "Construire sur papier uni", sauront(classe === "CM1" ? "reproduire une figure sur papier quadrillé ou pointé." : "construire une figure à partir de ses mesures, sur papier uni, et la coder."), 45, [
      ph(T1, "10 min", classe === "CM1" ? "Un modèle et une grille : par où commencer ? Repérer les sommets sur les nœuds." : "Un triangle rectangle dont on connaît un côté de l'angle droit et l'hypoténuse : dans quel ordre tracer ?"),
      ph(T2, "25 min", classe === "CM1" ? "Reproduire, puis vérifier au calque." : "Construire, coder les angles droits et les longueurs égales, vérifier aux instruments.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : on commence par ce qui est connu, et on vérifie à la fin."),
    ]),
    seance(classe === "CM1" ? "Construire sur papier uni" : "Suivre un programme de construction", sauront(classe === "CM1" ? "construire un rectangle, un carré, un triangle rectangle et un cercle de mesures données, et les coder." : "construire une figure en suivant un programme de construction."), 45, [
      ph(T2, "35 min", classe === "CM1" ? "Les constructions des exemples de réussite : le rectangle de 7 cm sur 3 cm, le carré et le cercle de diamètre [LM], le triangle rectangle en R." : "Des programmes : des droites perpendiculaires ou parallèles passant par un point, des cercles de centre donné, des polygones usuels.", OUTILS),
      ph(T3, "10 min", "On superpose les constructions au calque pour les comparer."),
    ]),
    seance(classe === "CM1" ? "Suivre un programme de construction" : "Écrire un programme de construction", sauront(classe === "CM1" ? "construire une figure en suivant un programme de construction." : "écrire le programme de construction d'une figure, dans des cas simples."), 45, [
      ph(T1, "10 min", classe === "CM1" ? "« Trace un rectangle ABCD tel que AB = 5 cm et BC = 3 cm. Trace le cercle de centre A qui passe par le milieu du côté [AB]. »" : "Une figure à faire construire par un camarade qui ne la voit pas : que faut-il lui dire ?"),
      ph(T2, "25 min", classe === "CM1" ? "Lire tout le programme, puis construire étape par étape ; cocher chaque étape faite." : "Écrire le programme, l'échanger, construire celui du voisin, comparer avec la figure de départ.", OUTILS),
      ph(T3, "10 min", "Ce qu'on retient : un programme dit les étapes dans l'ordre, avec les noms des points et les mesures."),
    ]),
    seance("Avec un logiciel de géométrie dynamique", sauront("construire une figure à partir d'un programme de construction, avec un logiciel de géométrie dynamique."), 45, [
      ph(T2, "35 min", "Le même programme, au logiciel : on déplace un point, la figure garde ses propriétés si elle a été bien construite."),
      ph(T3, "10 min", "Ce qu'on retient : une figure bien construite résiste au déplacement de ses points."),
    ]),
    evaluation(classe === "CM1" ? "construire des figures et suivre un programme de construction" : "construire des figures et écrire un programme de construction", "Ensuite, en sixième, des constructions plus longues."),
  ],
});

// ── La symétrie ───────────────────────────────────────────────────────────

const symetrie = (classe: "CM1" | "CM2"): Demarche => ({
  id: `symetrie-${classe.toLowerCase()}`, nom: `La symétrie axiale (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: classe === "CM1"
    ? "Reconnaître les figures qui ont un ou plusieurs axes de symétrie, et le vérifier par pliage ; compléter une figure sur quadrillage ou papier pointé pour qu'elle soit symétrique par rapport à une droite verticale ou horizontale ; construire sur quadrillage le symétrique d'un point, d'un segment, puis d'un triangle, par rapport à une droite verticale ou horizontale qui ne le coupe pas, et vérifier en pliant."
    : "Construire sur papier quadrillé le symétrique d'une figure quelconque par rapport à une droite verticale, horizontale ou une diagonale du quadrillage, quand la droite ne coupe pas la figure, et vérifier en pliant la feuille le long de la droite.",
  seances: classe === "CM1" ? [
    seance("Les axes de symétrie", sauront("reconnaître si une figure a un ou plusieurs axes de symétrie, et le vérifier par pliage."), 45, [
      ph(T1, "10 min", "Plier une figure découpée pour que les deux parties se superposent : combien de façons ?"),
      ph(T2, "25 min", "Chercher les axes de figures et de lettres ; vérifier par pliage."),
      ph(T3, "10 min", "Ce qu'on retient : un axe de symétrie partage la figure en deux parties qui se superposent par pliage."),
    ]),
    seance("Compléter par symétrie", sauront("compléter une figure sur quadrillage pour qu'elle soit symétrique par rapport à une droite."), 45, [
      ph(T2, "35 min", "Compter les carreaux de chaque point jusqu'à l'axe, et autant de l'autre côté ; plier pour vérifier."),
      ph(T3, "10 min", "Ce qu'on retient : un point et son symétrique sont à la même distance de l'axe, de part et d'autre."),
    ]),
    seance("Le symétrique d'une figure", sauront("construire sur quadrillage le symétrique d'un point, d'un segment, d'un triangle."), 45, [
      ph(T2, "35 min", "Les sommets d'abord, un par un, puis les côtés ; l'axe ne coupe pas la figure."),
      ph(T3, "10 min", "On plie la feuille le long de l'axe pour vérifier."),
    ]),
    evaluation("compléter une figure et construire un symétrique sur quadrillage", "Ensuite, au CM2, l'axe en diagonale du quadrillage."),
  ] : [
    seance("Reprendre la symétrie du CM1", sauront("compléter une figure par symétrie par rapport à une droite verticale ou horizontale."), 45, [
      ph(T2, "35 min", "Compléter des figures sur quadrillage ; plier pour vérifier."),
      ph(T3, "10 min", "Ce qu'on retient : un point et son symétrique sont à la même distance de l'axe."),
    ]),
    seance("Un axe en diagonale", sauront("construire le symétrique d'une figure par rapport à une diagonale du quadrillage."), 45, [
      ph(T1, "10 min", "L'axe suit les diagonales des carreaux : comment compter les carreaux jusqu'à lui ?"),
      ph(T2, "25 min", "Pour chaque sommet, suivre la diagonale perpendiculaire à l'axe, de carreau en carreau ; puis les côtés."),
      ph(T3, "10 min", "On plie la feuille le long de l'axe pour vérifier."),
    ]),
    evaluation("construire le symétrique d'une figure sur quadrillage", "Ensuite, en sixième, la symétrie sur papier uni."),
  ],
});

// ── Les solides et les patrons ────────────────────────────────────────────

const solides = (classe: "CM1" | "CM2"): Demarche => ({
  id: `solides-${classe.toLowerCase()}`, nom: `Les solides : nommer, décrire${classe === "CM1" ? ", construire" : ""} (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: "Reconnaître et nommer, parmi un ensemble de solides, les cubes, les pavés, les boules, les cylindres, les cônes, les pyramides et les prismes droits ; décrire un cube, un pavé, une pyramide ou un prisme droit avec ses faces — carrés, rectangles, triangles, autres polygones —, ses sommets et ses arêtes : les faces d'une pyramide sont des triangles qui ont un sommet commun, sauf sa base ; celles d'un prisme droit, deux bases superposables et des faces latérales rectangulaires. Des recherches d'intrus, des jeux de Kim et du portrait ; associer un solide manipulé à ses représentations" + (classe === "CM1" ? " ; assembler des faces pour construire un cube, un pavé, une pyramide ou un prisme droit." : "."),
  seances: [
    seance("Nommer les solides", sauront("nommer les solides usuels, le prisme droit compris, et les reconnaître sur un dessin."), 45, [
      ph(T1, "10 min", "Le sac à solides : un jeu de Kim — on en retire un, lequel manque ?"),
      ph(T2, "25 min", "Trier les solides de la classe ; associer chacun à sa photographie et à sa représentation en perspective."),
      ph(T3, "10 min", "L'affiche des solides et de leurs noms."),
    ]),
    seance("Faces, sommets, arêtes", sauront("décrire un cube, un pavé, une pyramide et un prisme droit par leurs faces, leurs sommets et leurs arêtes."), 45, [
      ph(T2, "35 min", "Compter en marquant ce qu'on a compté ; la nature des faces : carrés, rectangles, triangles ; la base d'une pyramide, les bases d'un prisme droit."),
      ph(T3, "10 min", "Le tableau des solides, au cahier."),
    ]),
    seance("Le portrait, l'intrus", sauront("reconnaître un solide à sa description et justifier avec le vocabulaire."), 45, [
      ph(T2, "35 min", "Le jeu du portrait : poser des questions avec le vocabulaire — faces, sommets, arêtes ; chercher l'intrus d'une série, et dire pourquoi."),
      ph(T3, "10 min", "Ce qu'on retient : on décrit un solide par ses faces, ses sommets et ses arêtes."),
    ]),
    ...(classe === "CM1" ? [seance("Construire un solide", sauront("assembler des faces pour construire un cube, un pavé ou une pyramide."), 45, [
      ph(T2, "35 min", "À partir d'un modèle ou d'une description, choisir les faces et les assembler au ruban adhésif."),
      ph(T3, "10 min", "On compare les constructions au modèle."),
    ])] : []),
    evaluation("nommer et décrire des solides", "Ensuite, les patrons."),
  ],
});

const patrons = (classe: "CM1" | "CM2"): Demarche => ({
  id: classe === "CM1" ? "patrons-cube-cm1" : "patrons-cm2", nom: classe === "CM1" ? "Le patron du cube (CM1)" : "Les patrons du cube et du pavé (CM2)", famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: classe === "CM1"
    ? "Dire si un assemblage de carrés est un patron d'un cube, et justifier une réponse négative ; construire sur quadrillage un patron d'un cube d'arête donnée ; sur un patron, repérer les faces qui seront opposées en les coloriant de la même couleur, en manipulant au besoin ; compléter une amorce de patron, avec du matériel puis sur quadrillage."
    : "Reconnaître et construire un patron du cube ; dire si un assemblage de rectangles est un patron d'un pavé, et justifier une réponse négative par le nombre de faces, leur nature et leur position ; sur un patron de pavé, colorier de la même couleur les rectangles qui seront des faces opposées.",
  seances: [
    seance("Est-ce un patron du cube ?", sauront("dire si un assemblage de six carrés est un patron du cube, et justifier."), 45, [
      ph(T1, "10 min", "Un cube en carton qu'on déplie : combien de faces ? Comment sont-elles reliées ?"),
      ph(T2, "25 min", "Des assemblages de six carrés à découper et à plier : lesquels se referment en cube ? Pourquoi les autres non ?"),
      ph(T3, "10 min", "Ce qu'on retient : six carrés ne suffisent pas, il faut qu'aucune face ne se superpose à une autre."),
    ]),
    seance("Les faces opposées", sauront("repérer sur un patron les faces qui seront opposées."), 45, [
      ph(T2, "35 min", "Colorier de la même couleur les faces opposées, puis plier pour vérifier ; compléter une amorce de patron."),
      ph(T3, "10 min", "Ce qu'on retient : deux faces séparées par une seule face, dans une rangée, seront opposées."),
    ]),
    seance(classe === "CM1" ? "Construire un patron du cube" : "Le patron du pavé", sauront(classe === "CM1" ? "construire sur quadrillage un patron d'un cube d'arête donnée." : "dire si un assemblage de rectangles est un patron d'un pavé, et colorier ses faces opposées."), 45, [
      ph(T2, "35 min", classe === "CM1" ? "Tracer un patron d'un cube de 3 cm d'arête, le découper, le plier." : "Un pavé qu'on déplie : trois paires de rectangles identiques ; des assemblages à juger, puis un patron à construire.", OUTILS),
      ph(T3, "10 min", classe === "CM1" ? "On compare les patrons trouvés : il y en a onze." : "Ce qu'on retient : un patron de pavé a six faces, deux à deux identiques, chacune à sa place."),
    ]),
    evaluation(classe === "CM1" ? "reconnaître et construire un patron du cube" : "reconnaître des patrons du cube et du pavé", "Ensuite, en sixième, les patrons du prisme droit."),
  ],
});

// ── Les déplacements et les assemblages de cubes ──────────────────────────

const deplacements = (classe: "CM1" | "CM2"): Demarche => ({
  id: `deplacements-${classe.toLowerCase()}`, nom: `Coder et décoder des déplacements (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: `Le vocabulaire des déplacements — avancer, reculer, tourner d'un quart de tour à gauche, pivoter d'un quart de tour à droite${classe === "CM2" ? ", tourner de 90° à droite" : ""}, faire demi-tour — ; représenter sur un quadrillage, ou sur le plan d'une ville, un déplacement donné en langage naturel ou codé ; décrire un déplacement entre un départ et une arrivée en produisant des instructions${classe === "CM2" ? ", en tenant compte de contraintes sur le trajet" : ""} ; programmer un robot, s'il y en a un.`,
  seances: [
    seance("Suivre des instructions", sauront("tracer sur un quadrillage le déplacement que décrit une suite d'instructions."), 45, [
      ph(T1, "10 min", "Dans la cour : « avance de trois pas, tourne d'un quart de tour à gauche… » ; où arrive-t-on ?"),
      ph(T2, "25 min", "Le robot sur quadrillage : suivre le code, pas à pas, en tournant la feuille si besoin ; le plan du quartier et ses rues."),
      ph(T3, "10 min", "Ce qu'on retient : tourner se fait sur place ; à gauche et à droite dépendent du sens du robot."),
    ]),
    seance("Écrire les instructions", sauront("écrire la suite d'instructions qui mène d'un départ à une arrivée."), 45, [
      ph(T2, "35 min", `Écrire le code d'un trajet ; ${classe === "CM2" ? "passer par une case imposée, éviter un obstacle ; " : ""}l'échanger avec un voisin, qui le suit pour vérifier.`),
      ph(T3, "10 min", "On compare des codes différents pour un même trajet."),
    ]),
    seance("Trouver l'erreur, programmer", sauront("trouver l'erreur d'un programme et programmer un déplacement."), 45, [
      ph(T2, "35 min", "Un code qui ne mène pas à l'arrivée : où est l'erreur ? Puis programmer le robot de la classe, ou un lutin dans Scratch."),
      ph(T3, "10 min", "Ce qu'on retient : on teste le programme pas à pas pour trouver l'erreur."),
    ]),
    evaluation("coder et décoder des déplacements", "Ensuite, des programmes dans Scratch."),
  ],
});

const assemblages = (classe: "CM1" | "CM2"): Demarche => ({
  id: `assemblages-cubes-${classe.toLowerCase()}`, nom: `Les assemblages de cubes${classe === "CM2" ? " et leurs vues" : ""} (${classe})`, famille: "Mathématiques",
  source: PROGRAMME_C3,
  resume: classe === "CM1"
    ? "Résoudre des problèmes de dénombrement sur des assemblages de cubes : combien de petits cubes dans ce solide, ceux qu'on voit et ceux qu'on ne voit pas ? Compter par couches, par rangées, par colonnes."
    : "Combien de petits cubes a-t-on retirés du gros cube ? Puis les vues d'un assemblage : reconnaître la vue de face, de dessus, de droite et de gauche, retrouver l'assemblage qui correspond à des vues, tracer les vues d'un assemblage, et construire un assemblage d'après ses vues.",
  seances: [
    seance("Compter les cubes", sauront(classe === "CM1" ? "dénombrer les cubes d'un assemblage, même ceux qu'on ne voit pas." : "dénombrer les cubes d'un assemblage, et ceux qu'on a retirés d'un gros cube."), 45, [
      ph(T1, "10 min", "Un pavé de cubes construit devant la classe : combien de cubes ? Comment en être sûr sans le démonter ?"),
      ph(T2, "25 min", "Des assemblages dessinés : compter par couches ou par colonnes, construire pour vérifier."),
      ph(T3, "10 min", "Ce qu'on retient : on organise le comptage — couche par couche."),
    ]),
    seance(classe === "CM1" ? "Construire et compter" : "Les vues d'un assemblage", sauront(classe === "CM1" ? "construire un assemblage d'après un dessin et compter ses cubes." : "reconnaître et tracer la vue de face, de dessus, de droite et de gauche d'un assemblage."), 45, [
      ph(T2, "35 min", classe === "CM1" ? "Construire des assemblages d'après leur dessin, puis les compter." : "Tourner autour d'un assemblage posé sur la table ; associer les vues ; tracer les vues sur quadrillage ; construire d'après des vues."),
      ph(T3, "10 min", classe === "CM1" ? "On compare les constructions aux dessins." : "Ce qu'on retient : la vue de gauche et la vue de droite sont symétriques l'une de l'autre."),
    ]),
    evaluation(classe === "CM1" ? "dénombrer les cubes d'un assemblage" : "dénombrer les cubes et reconnaître les vues d'un assemblage", "Ensuite, en sixième, les volumes."),
  ],
});

export const DEMARCHES_GEOMETRIE_CM: Demarche[] = (["CM1", "CM2"] as const).flatMap((c) => [
  droites(c), cercle(c), figures(c), constructions(c), symetrie(c), solides(c), patrons(c), deplacements(c), assemblages(c),
]);

/** La séquence d'une compétence d'espace et géométrie du cours moyen ; rien sinon. En minuscules sans accents. */
export function demarcheDeLaGeometrieCM(classe: string, cg: string, comp: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/geometrie plane/.test(cg)) {
    if (/symetri/.test(comp)) return `symetrie-${classe}`;
    if (/cercle et un disque/.test(comp)) return `cercle-${classe}`;
    if (/figures suivantes|proprietes de parallelisme/.test(comp)) return `figures-${classe}`;
    if (/reproduire ou construire|construire une figure|programme de construction/.test(comp)) return `constructions-${classe}`;
    return `droites-${classe}`;
  }
  if (/solides/.test(cg)) return /patron/.test(comp) ? (classe === "cm1" ? "patrons-cube-cm1" : "patrons-cm2") : `solides-${classe}`;
  if (/dans l.espace/.test(cg)) return /assemblages de cubes/.test(comp) ? `assemblages-cubes-${classe}` : `deplacements-${classe}`;
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const SOURCES_DU_CYCLE_2: [string, string][] = [
  ["Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Espace et géométrie au cycle 2 ».", "Programme de mathématiques du cycle 3, 2025 ; exemples de réussite du CM1 et du CM2 (Éduscol, 2025)."],
  ["Programme de mathématiques du cycle 2, 2024 ; Éduscol, « Initiation à la programmation aux cycles 2 et 3 », 2016.", "Programme de mathématiques du cycle 3, 2025 ; Éduscol, « Initiation à la programmation aux cycles 2 et 3 », 2016."],
];
const sourceDuCycle3 = (html: string) => SOURCES_DU_CYCLE_2.reduce((h, [a, b]) => h.split(a).join(b), html);

/** Une feuille de l'atelier « Espace et géométrie — CM1, CM2 », qui la refait avec les mêmes réglages et le même tirage. */
const geometrieCM = (seance: number, titre: string, classe: "CM1" | "CM2", exercices: ExerciceGeometrieCM[], combien = 4): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GEOMETRIE_CM, classe, exercices, combien, titre };
  return {
    seance, atelier: "geometrieCM", titre,
    fabriquer: (g) => ({ html: htmlGeometrieCM(reglages, g), style: STYLE_FEUILLE + STYLE_GEOMETRIE_CM, refaire: { geometrieCM: reglages } }),
  };
};
/** Une feuille de l'atelier « Géométrie » qui convient au CM telle quelle, avec la source du cycle 3. */
const geometrie2 = (seance: number, titre: string, exercice: ExerciceGeometrie, niveau: "lignes" | "diagonales" | "obliques" = "obliques"): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_GEOMETRIE, exercice, classe: "CE2" as const, niveau, combien: 3 };
  return { seance, atelier: "geometrie", titre, fabriquer: (g) => ({ html: sourceDuCycle3(htmlGeometrie(reglages, g)), style: STYLE_FEUILLE + STYLE_GEOMETRIE }) };
};
const solides2 = (seance: number, titre: string, exercice: ExerciceSolides, solide: "cube" | "pavé" | "pyramide" = "cube"): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_SOLIDES, exercice, classe: "CE2" as const, cachees: true, solide, combien: 8 };
  return { seance, atelier: "solides", titre, fabriquer: (g) => ({ html: sourceDuCycle3(htmlSolides(reglages, g)), style: STYLE_FEUILLE + STYLE_SOLIDES }) };
};
const robot = (seance: number, titre: string, mode: ModeCodage): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_DEPLACEMENTS, exercice: "robot" as const, classe: "CE1" as const, mode, combien: 4 };
  return { seance, atelier: "deplacements", titre, fabriquer: (g) => ({ html: sourceDuCycle3(htmlDeplacements(reglages, g)), style: STYLE_FEUILLE + STYLE_DEPLACEMENTS }) };
};

function plans(c: "CM1" | "CM2"): Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> {
  const k = c.toLowerCase();
  return {
    [`droites-${k}`]: {
      feuilles: [
        geometrieCM(0, "Points, droites, segments ; les codes", c, ["vocabulaire"]),
        geometrieCM(1, "Des droites perpendiculaires", c, ["perpendiculaires"], 4),
        geometrieCM(2, "Des droites parallèles", c, ["paralleles"], 4),
        geometrieCM(3, "Les droites — évaluation", c, ["perpendiculaires", "paralleles"], 2),
      ],
      materiel: ["Une règle graduée ; le tableau des notations", "Une équerre, une règle", "Une équerre, une règle", "Une équerre, une règle"],
    },
    [`cercle-${k}`]: {
      feuilles: [
        geometrieCM(0, "Le cercle et le disque", c, ["cercle"]),
        geometrie2(1, "Tracer des cercles au compas", "cercles"),
        geometrieCM(2, "Le cercle — évaluation", c, ["cercle"]),
      ],
      materiel: ["Une ficelle et une craie, dans la cour ; un compas", "Un compas, une règle graduée", "Un compas, une règle graduée"],
    },
    [`figures-${k}`]: {
      feuilles: [
        geometrieCM(0, "Nommer des triangles et des quadrilatères", c, ["figures"], 4),
        geometrieCM(1, "Les quadrilatères", c, ["figures"], 4),
        geometrieCM(2, "Dire pourquoi", c, ["figures"], 6),
        geometrieCM(3, "Les figures — évaluation", c, ["figures"], 4),
      ],
      materiel: ["Des triangles découpés ; une équerre, un compas", "Des quadrilatères découpés ; une équerre, un compas, une règle", "Une équerre, un compas, une règle", "Une équerre, un compas, une règle"],
    },
    [`constructions-${k}`]: {
      feuilles: c === "CM1" ? [
        geometrie2(0, "Reproduire sur quadrillage", "reproduire"),
        geometrieCM(1, "Construire sur papier uni", c, ["constructions"], 2),
        geometrie2(2, "Suivre un programme de construction", "construire"),
        geometrieCM(4, "Les constructions — évaluation", c, ["constructions"], 2),
      ] : [
        geometrieCM(0, "Construire sur papier uni", c, ["constructions"], 2),
        geometrie2(1, "Suivre un programme de construction", "construire"),
        geometrieCM(2, "Écrire un programme de construction", c, ["programme"], 2),
        geometrieCM(4, "Les constructions — évaluation", c, ["constructions"], 2),
      ],
      materiel: ["Du papier quadrillé et pointé, du papier calque", "Une règle graduée, une équerre, un compas ; du papier uni", "Une règle graduée, une équerre, un compas", "Un logiciel de géométrie dynamique", "Une règle graduée, une équerre, un compas"],
    },
    [`symetrie-${k}`]: {
      feuilles: c === "CM1" ? [
        geometrie2(0, "Les axes de symétrie", "axes"),
        geometrie2(1, "Compléter par symétrie", "symetrie"),
        geometrieCM(2, "Le symétrique d'une figure", c, ["symetrique"], 2),
        geometrieCM(3, "La symétrie — évaluation", c, ["symetrique"], 2),
      ] : [
        geometrie2(0, "Compléter par symétrie", "symetrie"),
        geometrieCM(1, "Le symétrique d'une figure", c, ["symetrique"], 3),
        geometrieCM(2, "La symétrie — évaluation", c, ["symetrique"], 2),
      ],
      materiel: c === "CM1"
        ? ["Des figures découpées et des lettres à plier", "Du papier quadrillé", "Du papier quadrillé", "Du papier quadrillé"]
        : ["Du papier quadrillé", "Du papier quadrillé", "Du papier quadrillé"],
    },
    [`solides-${k}`]: {
      feuilles: [
        geometrieCM(0, "Nommer les solides", c, ["solides"], 8),
        geometrieCM(1, "Faces, sommets, arêtes", c, ["faces"]),
        solides2(2, "Le jeu du portrait", "portrait"),
        ...(c === "CM1" ? [solides2(3, "Les faces à découper et assembler", "faces", "pavé")] : []),
        geometrieCM(c === "CM1" ? 4 : 3, "Les solides — évaluation", c, ["solides", "faces"], 6),
      ],
      materiel: [
        "Le sac à solides, un prisme droit compris", "Les solides de la classe", "Les solides de la classe ; les cartes du portrait",
        ...(c === "CM1" ? ["Du ruban adhésif, des ciseaux"] : []), "Les solides de la classe",
      ],
    },
    [c === "CM1" ? "patrons-cube-cm1" : "patrons-cm2"]: {
      feuilles: [
        solides2(0, "Est-ce un patron du cube ?", "patrons"),
        geometrieCM(1, "Les faces opposées", c, ["patron-cube"], 3),
        c === "CM1" ? solides2(2, "Le patron du cube à construire", "patronCube") : geometrieCM(2, "Le patron du pavé", c, ["patron-pave"]),
        geometrieCM(3, "Les patrons — évaluation", c, c === "CM1" ? ["patron-cube"] : ["patron-cube", "patron-pave"], 2),
      ],
      materiel: ["Un cube en carton à déplier ; des ciseaux", "Des crayons de couleur ; des ciseaux", c === "CM1" ? "Du papier quadrillé, des ciseaux, de la colle" : "Une boîte en forme de pavé à déplier", "Des crayons de couleur"],
    },
    [`deplacements-${k}`]: {
      feuilles: [robot(0, "Le robot : suivre le code", "decoder"), robot(1, "Le robot : écrire le code", "coder"), robot(2, "Le robot : trouver l'erreur", "corriger"), robot(3, "Les déplacements — évaluation", "coder")],
      materiel: ["La cour, pour jouer le robot ; le quadrillage", "Le quadrillage", "Un robot de sol, ou Scratch", "Le quadrillage"],
    },
    [`assemblages-cubes-${k}`]: {
      feuilles: c === "CM1" ? [
        geometrieCM(0, "Compter les cubes", c, ["cubes-compter"]),
        solides2(1, "Des assemblages de cubes à construire", "assemblages"),
        geometrieCM(2, "Les assemblages — évaluation", c, ["cubes-compter"]),
      ] : [
        geometrieCM(0, "Compter les cubes", c, ["cubes-compter"]),
        geometrieCM(1, "Les vues d'un assemblage", c, ["vues"]),
        geometrieCM(2, "Les assemblages — évaluation", c, ["cubes-compter", "vues"]),
      ],
      materiel: ["Des cubes emboîtables", "Des cubes emboîtables", "Des cubes emboîtables"],
    },
  };
}

const PLANS = { ...plans("CM1"), ...plans("CM2") };

export const estUneDemarcheDeLaGeometrieCM = (id: string) => id in PLANS;

export function planDeLaGeometrieCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
