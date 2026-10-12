// L'histoire et la géographie au cycle 2 : une séquence par thème.
//
// Une séquence part de la compétence qu'on choisit (voir
// feuillesDesSequences.ts) ; ici, la compétence d'histoire-géographie trouve
// la séquence de son thème, telle que le programme de 2026 le découpe — une
// séquence répond à la question du thème. La classe vue comme un espace
// qu'on représente suit la séquence Éduscol que l'enseignant a fournie en
// octobre 2026 ; le temps au CP, les séquences Éduscol de 2016 « Se situer
// dans le temps » ; les autres thèmes sont bâtis sur le programme, à sa
// demande, et le disent. Toutes piochent leurs feuilles dans les ateliers
// de Fabriquer : le plan de la classe, les frises et calendriers, la
// lecture de paysage, les étiquettes des mots du thème.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_PLAN_CLASSE, STYLE_PLAN_CLASSE, htmlPlanClasse, reglagesPlanSurs, type FeuillePlan, type ReglagesPlanClasse } from "./planDeLaClasse";
import { REGLAGES_FRISE, STYLE_FRISE, htmlFrise, reglagesFriseSurs, type ModeleFrise } from "./frisesTemps";
import { REGLAGES_PAYSAGE, STYLE_PAYSAGE, htmlPaysage, reglagesPaysageSurs, type FamillePaysage, type ReglagesPaysage } from "./lireUnPaysage";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "./etiquettes";
import { documentsDesSeances } from "./documentsHistoireGeo";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

// ── La classe, un espace organisé qui se représente (CP) ──────────────────

const LA_CLASSE: Demarche = {
  id: "classe-espace-organise-cp",
  nom: "La classe, un espace organisé qui se représente (CP)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Se situer dans l'espace – Explorer les organisations du monde » : "
    + "« La classe, un espace organisé qui se représente », séquence au CP (introduction ; séances 2, 5 et 7)",
  resume: "De la photographie au plan : reconnaître la classe et la décrire, la dessiner, la représenter en maquette, se repérer dans les "
    + "maquettes des autres puis dans leur photographie vue de dessus, faire le plan avec des formes collées et une légende, et lire le plan "
    + "pour se repérer et se déplacer — la chasse au trésor, « Où est Charlie ? », l'évaluation. Passer d'un espace vu de sa place à un "
    + "espace vu de dessus, objectif et partagé.",
  seances: [
    seance("La classe en photographies",
      sauront("reconnaître leur classe sur des photographies, dire à quoi on la reconnaît — le mobilier et sa disposition —, et d'où la photographie a été prise."), 45, [
        ph("Trier les photographies", "15 min", "Des photographies de classes : la nôtre, et d'autres classes de l'école. Lesquelles sont celles de notre classe ? Comment le sait-on ?",
          "Observer finement l'environnement familier : prendre des indices dans la réalité et sur les photographies, trier les informations."),
        ph("Ce qui fait notre classe", "15 min", "Établir ensemble la liste des éléments caractéristiques de la classe ; elle reste affichée pour la suite.",
          "Ce qui dure — le mobilier, sa place — compte plus que ce qui passe."),
        ph("D'où a-t-on pris la photo ?", "15 min", "Dire où se tenait le photographe ; essayer de photographier toute la classe d'un seul coup.",
          "La notion de point de vue : passer d'un espace autour de soi à un espace qu'on décrit pour tous."),
      ]),
    seance("Dessiner la classe",
      sauront("représenter la classe par un dessin où on la reconnaît, en choisissant les éléments importants et une façon de les représenter."), 40, [
        ph("Rappel", "5 min", "Comment savait-on que les photographies étaient celles de notre classe ? Le mobilier et sa disposition. Photographier toute la classe n'a pas marché."),
        ph("Dessiner toute la classe", "30 min", "Seul, sur une feuille A4 au crayon de papier, dessiner toute la classe pour qu'on puisse la reconnaître ; la liste des éléments importants est affichée.",
          "Une étape difficile : renoncer à ce qui passe (les affichages, les trousses), trouver comment dessiner ce qu'on voit de sa place, puis une façon symbolique de représenter chaque élément."),
      ]),
    seance("Une maquette de la classe (1)",
      sauront("choisir des objets pour représenter les éléments de la classe, et expliquer leurs choix."), 45, [
        ph("Fabriquer, en groupes", "35 min", "En demi-classe, par groupes : commencer une maquette de la classe avec le matériel mis à disposition, en choisissant à bon escient l'objet qui représente chaque élément.",
          "Des expériences simples, faites par tous — explorer, manipuler, fabriquer — : elles font parler."),
        ph("Expliquer ses choix", "10 min", "Pourquoi cet objet pour la table, pour le bureau, pour l'étagère ?", "Argumenter, expliquer ses choix, décrire l'espace."),
      ]),
    seance("Une maquette de la classe (2)",
      sauront("placer les éléments de la classe les uns par rapport aux autres dans la maquette, et le dire."), 45, [
        ph("Placer, en groupes", "35 min", "Terminer la maquette : manipuler et échanger pour trouver la place de chaque élément — à côté de, devant, derrière, entre, près de, loin de."),
        ph("Décrire", "10 min", "Où est le bureau ? la porte ? ma place ? Chaque groupe décrit sa maquette.", "Le vocabulaire de l'espace, dit et redit."),
      ]),
    seance("Se repérer dans les maquettes",
      sauront("se repérer dans une représentation de la classe qu'ils n'ont pas faite, et comprendre que chacun a son point de vue."), 45, [
        ph("Repérage dans les maquettes", "25 min", "Les maquettes, installées où l'on peut tourner autour : on les commente (un meuble mal placé, un oubli). Chacun pose l'étiquette de son prénom sur sa place, "
          + "dans chaque maquette. Puis, autour d'une seule maquette, des jeux de repérage : poser un livre sur la table d'un camarade, mettre la poubelle à côté d'un meuble, "
          + "dire ce que voit quelqu'un qui entre par la porte, faire suivre à la figurine un chemin inventé par un camarade.",
          "Cinq groupes, un auteur de chaque maquette dans chacun. Chacun dépasse son point de vue : les autres ont le leur, et un point de vue commun existe."),
        ph("La maquette vue de dessus", "20 min", "La photographie d'une maquette prise de dessus, projetée : ses auteurs expliquent leurs choix et la corrigent ; on se repère sur ce document en deux dimensions. "
          + "Un code couleur apparaît pour le mobilier.",
          "Chacun peut avoir la photographie, pour l'annoter : un début de légende, un élément oublié."),
      ]),
    seance("De la maquette au plan",
      sauront("passer d'une représentation en volume à une représentation plane, et construire une légende simple."), 45, [
        ph("Entourer", "10 min", "Sur la photographie de la maquette vue de dessus, entourer chaque élément : la place qu'il occupe au sol."),
        ph("Faire le plan", "25 min", "Faire un plan avec des formes de papier à coller à leur place : une forme par meuble, une barre pour le tableau.",
          "Le code couleur de la séance précédente : la même couleur pour la même sorte de meuble."),
        ph("La légende", "10 min", "Construire la légende : ce que veut dire chaque forme, chaque couleur. Ce document a un nom : c'est un plan."),
      ]),
    seance("Lire le plan de la classe — évaluation",
      sauront("lire le plan de la classe et faire le lien avec la réalité : repérer des éléments imposés et tracer un chemin décrit."), 50, [
        ph("Rappels", "10 min", "Qu'avions-nous fait ? Des formes collées sur une feuille : ce n'est plus une maquette, c'est un plan. Aujourd'hui, on vérifie qu'on sait s'y repérer."),
        ph("La chasse au trésor", "15 min", "Des étiquettes-mots, cachées dans la classe, forment une phrase mystère ; le plan projeté montre les cachettes. Un élève cherche ; s'il bute, "
          + "un camarade l'aide par un indice, sans aller chercher le mot à sa place.",
          "Réussir : dire où est le message en lisant le plan ; aller dans la bonne zone ; prendre des repères fins ; aider par un indice utile."),
        ph("« Où est Charlie ? »", "10 min", "Deux élèves sortent ; un autre cache la figurine et marque la cachette sur le plan ; les deux élèves reviennent et la cherchent.",
          "Sur le plan, les meubles n'ont pas leur nom ; une aide : le même plan avec sa légende."),
        ph("Évaluation individuelle", "15 min", "Chacun a le plan de la classe et une fiche de consignes, lues à voix haute : colorier, dessiner, écrire, tracer un chemin.",
          "Lire les consignes à voix haute évite que la lecture ne fasse échouer la géographie."),
      ]),
  ],
};

// ── Les séquences Éduscol de 2016, au choix ───────────────────────────────
//
// « Questionner le monde » (2016) : des séquences que le programme de 2020,
// encore en vigueur en CE1-CE2 en 2026-2027, porte toujours. Elles ne sont
// pas la séquence d'un thème de 2026 : on les choisit dans le menu des
// déroulements, comme la Petite Sirène.

// « Se situer dans l'espace » et « Comprendre qu'un espace est organisé » : Un lion à Paris (CE1), le
// quartier comparé à un village (CE2).

const LION_A_PARIS_CE1: Demarche = {
  id: "lion-a-paris-ce1",
  nom: "Découvrir une ville par ses paysages et son plan : Un lion à Paris (CE1)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Se situer dans l'espace – Explorer les organisations du monde » : "
    + "« Séquence au CE1 à partir de l'album Un lion à Paris » (introduction ; séances 1 à 8, dont 2-a et 2-b) ; "
    + "programme 2020, encore en vigueur en CE1-CE2 en 2026-2027",
  resume: "Un album pour découvrir une ville qu'on n'a jamais visitée : le voyage du lion de Béatrice Alemagna dans Paris, remis en ordre sur "
    + "une frise ; ses lieux retrouvés sur Internet avec leur vrai nom et associés à leur photographie ; puis cherchés sur un plan simplifié, "
    + "sur un plan détaillé grâce à leur adresse, jusqu'à l'itinéraire du lion. Un espace qu'on n'a pas vécu ne se connaît que par les "
    + "documents, photographies et plans : on apprend à les lire, et à distinguer la fiction de la réalité. La séquence vient après un "
    + "premier travail sur le plan, celui de la cour ou de l'école.",
  seances: [
    seance("Découvrir l'album",
      sauront("raconter le voyage du lion et nommer avec leurs mots les lieux de Paris qu'il traverse."), 40, [
        ph("Ce qu'on sait de Paris", "10 min", "On annonce qu'on va parler de Paris. Les élèves disent ce qu'ils en savent ; l'enseignant note leurs idées "
          + "sur une affiche, qui reste visible toute la séquence."),
        ph("La couverture", "5 min", "Décrire la première de couverture : un lion se regarde dans l'eau d'un fleuve. Ce lion sera le personnage "
          + "principal d'une histoire qui se passe à Paris."),
        ph("Lire et comprendre", "20 min", "L'enseignant lit l'histoire d'une traite, sans montrer les illustrations. Chacun reçoit le texte, transcrit "
          + "en quinze petits textes espacés ; on le relit pas à pas, et l'on questionne : où est le lion ? que voit-il ? que voit-on ? Les noms "
          + "proposés pour chaque lieu sont notés sur une affiche collective ; on dessine ce qu'évoquent certains passages, comme le fleuve qui "
          + "coupe la ville.",
          "Une activité reprise chaque jour pendant une semaine : c'est la lecture de la semaine. Insister sur les lieux, sur ce que voit le lion."),
      ]),
    seance("La frise du voyage",
      sauront("remettre dans l'ordre les étapes du voyage du lion, en prenant des indices dans l'image et dans le texte."), 40, [
        ph("Coller dans l'ordre", "20 min", "Rappeler quelques situations et quelques lieux de l'histoire. Par deux, avec un jeu d'illustrations de "
          + "l'album et une grande feuille : coller les illustrations dans l'ordre pour refaire le chemin du lion, et noter sous chaque image le "
          + "nom du lieu dont on se souvient.",
          "Nommer les lieux avec ce qu'on sait et avec ses propres mots."),
        ph("Mise en commun", "20 min", "Toujours la même question : « Où est le lion ? » En cas de doute, chercher des indices dans le texte. "
          + "L'enseignant construit la frise au tableau et y inscrit le nom de chaque lieu, tel que l'album le donne.",
          "Toutes les images ne sont pas reproduites : faire imaginer ce qui se passe entre deux images — le lion dans la rue, au bord du fleuve. "
          + "La frise fait travailler la succession : avant, après."),
      ]),
    seance("Les sentiments du lion",
      sauront("écrire un texte qui raconte le voyage du lion et dit ce qu'il ressent, sans recopier l'album."), 40, [
        ph("Écrire", "40 min", "Production d'écrit : chacun rédige un texte qui montre les sentiments du lion pendant son voyage.",
          "Les critères de réussite : ne pas recopier le texte de l'album ; dire les émotions du lion avec le vocabulaire étudié en classe ; écrire "
          + "des phrases correctes. Les textes d'élèves que cite le document suivent les étapes de la frise."),
      ]),
    seance("De la fiction à la réalité",
      sauront("chercher si les lieux de l'album existent vraiment, les reconnaître sur des photographies grâce à des indices, et leur donner leur vrai nom."), 55, [
        ph("Fiction ou réalité ?", "10 min", "Se remémorer les lieux vus par le lion. Un lion qui se promène dans Paris, c'est une histoire ; mais ses "
          + "lieux sont-ils vrais ? On les compare à l'affiche de la première séance. Le « château blanc » existe-t-il ? Comment le vérifier sans "
          + "aller à Paris ? Les élèves pensent à une carte, à Internet : on cherchera des lieux réels sur un site."),
        ph("Chercher les vrais lieux", "30 min", "En salle informatique, par deux, sur un site des monuments de Paris qui offre un mur d'images : "
          + "retrouver chaque lieu de l'album. Sur la liste des lieux, noter qu'il existe et son vrai nom : le château blanc devient la basilique "
          + "du Sacré-Cœur.",
          "Certains lieux sont faciles, comme la tour Eiffel ; d'autres trompent : le Sacré-Cœur pris pour les Invalides, le premier pont venu. "
          + "Faire observer plus finement et chercher des preuves — la barrière en fer du pont des Arts, le bâtiment au toit arrondi au bout. "
          + "Agrandir les photographies aide ; peu d'élèves lisent les textes."),
        ph("Mise en commun", "10 min", "Était-ce facile ? Quels lieux a-t-on reconnus tout de suite ? Comment a-t-on trouvé les autres ? On fixe les "
          + "vrais noms : l'usine est Beaubourg, le Centre Georges-Pompidou, un musée ; la gare de Lyon ; le café de Flore, dont le nom est écrit "
          + "sur le store ; la station de métro Châtelet ; le pont des Arts.",
          "Les informations lues sur le site sont exactes : le dire. Échanger sur les façons de chercher : lire une légende, un nom sur une image, "
          + "partir de ce qu'on sait — la Joconde est au Louvre."),
        ph("Paris vu d'en haut", "5 min", "Quelques vues de Paris, sur le site de la tour Eiffel : la ville est grande, et ses monuments sont "
          + "dispersés sur un vaste territoire. Où sont-ils ? La question de la localisation est lancée."),
      ]),
    seance("Illustrations et photographies",
      sauront("associer chaque illustration de l'album à la photographie du lieu réel, en repérant leurs points communs et en lisant le nom du lieu."), 50, [
        ph("Associer, par deux", "40 min", "Rappeler la recherche en salle informatique et faire dire le lien entre les illustrations et les vraies "
          + "photographies : quelqu'un a pris ces photos à Paris, donc ces lieux existent. Par deux, coller à côté de chaque illustration du cahier "
          + "la photographie qui lui correspond : c'est la trace écrite de la recherche.",
          "Les élèves s'aident des images en couleur de leur cahier et du tableau des vrais noms ; ils lisent surtout les noms. Le mot station, qui "
          + "sert pour le métro comme pour la gare, prête à confusion."),
        ph("Comment l'auteure a-t-elle fait ?", "10 min", "Une correction collective, rapide. Puis chercher comment l'auteure a fait ses "
          + "illustrations pour qu'on retrouve les vrais lieux : elle a visité Paris, pris des photos, dessiné ce qu'elle a vu. Elle a peut-être "
          + "vu la statue du lion de la place Denfert-Rochereau avant d'imaginer son histoire.",
          "Profiter de la correction pour cette réflexion : elle relie la fiction et la réalité."),
      ]),
    seance("Le plan simplifié de Paris",
      sauront("repérer sur un plan simplifié de Paris les lieux visités par le lion, et dire ce que ce plan ne montre pas."), 45, [
        ph("Où sont ces lieux ?", "10 min", "Les lieux de l'album existent : comment savoir où ils sont, si l'on voulait les visiter ? Les élèves pensent "
          + "au GPS, à Internet ; certains au plan, vu sur le site des monuments. On va apprendre à lire un plan : chacun reçoit un plan touristique "
          + "du centre de Paris."),
        ph("Entourer les lieux du lion", "15 min", "Seul, chercher des points de repère et entourer sur le plan les lieux vus par le lion.",
          "Un plan choisi pour sa simplicité : les monuments y sont dessinés. Il ne montre que cinq lieux sur dix, mais c'est une étape dans un "
          + "long apprentissage, la lecture de plan."),
        ph("Mise en commun", "20 min", "Le plan est projeté ; l'élève interrogé déplace à l'ordinateur des cercles préparés pour entourer les "
          + "monuments. Le tableau des lieux se remplit : le Louvre, la tour Eiffel, Beaubourg, le Sacré-Cœur et la Seine sont trouvés ; la gare "
          + "de Lyon, le café de Flore, la station Châtelet, le pont des Arts et la place Denfert-Rochereau ne le sont pas.",
          "La recherche fait lire d'autres mots : le Trocadéro, plusieurs musées, le Stade de France, l'héliport. Faire observer : un indice dit ce "
          + "que sont les gros ronds noirs, des gares ; l'une est la gare de Lyon, mais laquelle ?"),
      ]),
    seance("Le grand plan de Paris",
      sauront("se repérer sur un plan détaillé à partir de lieux connus, et localiser un lieu grâce à son adresse."), 45, [
        ph("Un plan plus grand", "5 min", "Le premier plan ne montre pas tout : il est trop petit, il en faut un plus grand, avec plus d'indications. "
          + "La visite virtuelle a fait voir que la ville est immense."),
        ph("Les lieux déjà trouvés", "15 min", "Sur le nouveau plan, entourer d'abord les quatre lieux déjà trouvés, en cherchant ce qui ressemble au "
          + "premier plan : la Seine coupe la ville en deux, le Sacré-Cœur est en haut, la tour Eiffel à gauche, le Louvre et Beaubourg au centre, "
          + "au-dessus de la Seine.",
          "Se familiariser avec un document complexe : ces premiers repères guident les localisations suivantes."),
        ph("L'adresse", "10 min", "Un plan si riche ne se lit pas sans savoir où chercher. L'enseignant prend un exemple hors du vécu des élèves : "
          + "« Si je vous invitais chez moi pour mon anniversaire, sauriez-vous venir ? » La notion d'adresse se dégage peu à peu."),
        ph("Chercher l'adresse, trouver la rue", "15 min", "Pour chaque lieu manquant — le café de Flore, le pont des Arts, la station Châtelet, "
          + "la place Denfert-Rochereau —, taper son nom dans un moteur de recherche et ouvrir la carte ; cartes.gouv.fr, l'ancien Géoportail, convient aussi. Sur la "
          + "carte projetée, zoomer pour lire, dézoomer pour se repérer ; puis trouver la rue sur le plan.",
          "Un repérage ardu : le plan n'est pas encore maîtrisé, et ces jeunes lecteurs ne savent pas encore quelles indications déchiffrer."),
      ]),
    seance("L'itinéraire du lion",
      sauront("tracer sur un plan un itinéraire qui suit les rues, et dire ce que sont une rue, un boulevard, une allée, une impasse, un arrondissement."), 45, [
        ph("Les étapes du lion", "5 min", "Rappeler les étapes du lion dans la ville ; l'enseignant les écrit au tableau. Entre deux lieux, le lion "
          + "s'est déplacé : des pointillés figurent son chemin."),
        ph("Lire le plan", "10 min", "Le plan où tous les lieux sont repérés est projeté : par où le lion a-t-il pu passer pour aller d'un lieu à "
          + "l'autre ? On l'observe de plus près : les couleurs montrent les quartiers de Paris, les arrondissements ; les rues ont un nom. Définir "
          + "ensemble la rue, le boulevard, l'allée, l'impasse. Le chemin qu'on suit par les rues est un itinéraire."),
        ph("Tracer l'itinéraire", "20 min", "Par deux, tracer un itinéraire possible de la gare de Lyon à la place Denfert-Rochereau, en passant par "
          + "toutes les étapes et en suivant les rues.",
          "Les élèves remarquent parfois d'autres monuments sur le plan, que l'auteure aurait pu dessiner : l'Opéra, l'Arc de triomphe."),
        ph("D'autres monuments", "10 min", "L'album Paris Pop Up montre des monuments de Paris en trois dimensions : les localiser sur son plan.",
          "Une activité informelle dans le document : elle peut se faire à un autre moment."),
      ]),
    seance("Évaluation",
      sauront("définir les mots de la ville, et dire ce qu'ils ont appris en argumentant et en justifiant leurs choix."), 75, [
        ph("Évaluation écrite", "15 min", "Pour chaque mot, chacun écrit une définition ou fait un dessin qui montre qu'il a compris : un quartier, "
          + "une ville, un rond-point, une place, une rue, un bâtiment, un centre-ville, un pont, un fleuve.",
          "D'autres pistes, pour la lecture du plan : sur le plan simplifié, entourer les monuments vus par le lion et d'autres qu'il aurait pu "
          + "voir ; prouver par des détails qu'une photographie montre le pont des Arts ; sur le grand plan, tracer un itinéraire et citer deux "
          + "rues empruntées."),
        ph("Entretiens en petits groupes", "60 min", "Par groupes de cinq ou six, un entretien d'un quart d'heure avec l'enseignant ; les groupes "
          + "tournent, les autres élèves travaillent en autonomie. Les questions : se souvient-on de l'album ? qu'a-t-on aimé, ou pas ? qu'a-t-on "
          + "appris ? Puis des rappels — Paris, la salle informatique, les illustrations et les photographies, les lieux du lion, le petit et le "
          + "grand plan — ; l'itinéraire : le lion s'est-il perdu ? Enfin, quelle histoire semblable inventerait-on : qui se promène, où, comment "
          + "se repérer ?",
          "Aider à mémoriser, à reformuler, à clarifier les notions ; faire dépasser la description de son action pour argumenter et justifier. "
          + "Le document propose aussi un transfert : la classe a imaginé un lion dans sa propre ville, Roubaix, et en a lu le plan."),
      ]),
  ],
};

// ── Le quartier comparé à un village (CE2) ────────────────────────────────

const QUARTIER_VILLAGE_CE2: Demarche = {
  id: "quartier-village-ce2",
  nom: "Le quartier comparé à un village (CE2)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Explorer les organisations du monde – Comprendre qu'un espace est organisé » : "
    + "« L'organisation spatiale du quartier comparée à celle d'un village », séquence au CE2 (introduction ; séances 1, 2, 3a à 3c, 4a et 4b, "
    + "5a à 5c ; évaluations n° 1 et n° 2) ; programme 2020, encore en vigueur en CE1-CE2 en 2026-2027",
  resume: "Ce que les élèves savent de leur quartier devient une grille de lecture — habiter, circuler, acheter, se divertir, apprendre, les "
    + "espaces verts — ; une sortie la vérifie, puis on passe des dessins du trajet à un plan collectif, au plan cadastral, à la photographie "
    + "aérienne et aux angles de vue. Avec la même grille, on observe un village — Maroilles, dans le Nord, pour la classe de Lille — et l'on "
    + "compare : un espace est organisé par une société pour ses activités. Dans une école rurale, on part du village et on le compare avec un "
    + "quartier de la ville la plus proche.",
  seances: [
    seance("Ce qu'on sait du quartier",
      sauront("dire ce qu'il y a dans leur quartier et le classer selon l'usage qu'on en fait : c'est le début d'une grille de lecture."), 40, [
        ph("Ce que chacun sait", "20 min", "« Aujourd'hui, nous allons chercher comment est notre quartier. » Sur une fiche préparée, chacun écrit ce "
          + "qui lui vient à l'esprit : des mots-clés, des phrases, des croquis, des dessins.",
          "Ce que les élèves savent du quartier vient surtout de leurs pratiques, de leurs expériences, de leurs observations."),
        ph("Mise en commun", "5 min", "Plusieurs élèves disent leurs propositions ; l'enseignant note au tableau les bonnes idées pour représenter "
          + "tout le quartier et s'y repérer."),
        ph("Classer, par deux", "10 min", "Par deux, chercher un classement de toutes ces idées, puis en discuter. Les élèves citent surtout des "
          + "objets — maisons, rues, magasins — et les trient selon l'usage qu'ils en ont : habiter, circuler, la nature, ce qui se paie. La grille "
          + "se formalise au tableau : les habitations, la circulation, les commerces, les loisirs, les lieux pour apprendre, les espaces verts.",
          "D'autres fonctions du quartier ne sont pas vues : ne pas insister. La grille guidera l'observation pendant la sortie ; elle est faite "
          + "pour être enrichie."),
        ph("Ce qu'on retient", "5 min", "Un résumé : que retient-on de notre classement ? C'est la trace écrite, notre grille de lecture de "
          + "l'espace. Puis les questions qu'on se pose sur le quartier : comment les vérifier ? Par une sortie, avec des appareils photo."),
      ]),
    seance("La sortie dans le quartier",
      sauront("relever des points de repère le long d'un trajet, dessiner un élément du paysage, et retrouver d'où une photographie a été prise."), 90, [
        ph("Avant le départ", "5 min", "L'enseignant donne rapidement l'itinéraire. Chacun prendra une photographie. Il faut tout observer : au "
          + "retour, chacun représentera le quartier. On peut prendre des notes et dessiner.",
          "Un espace peu vaste d'abord : dans la classe du document, la pluie a coupé la sortie en deux ; les premières représentations ont "
          + "montré qu'il valait mieux réfléchir d'abord sur ce trajet, plus court."),
        ph("Le trajet et ses repères", "40 min", "S'arrêter plusieurs fois pour observer et décrire des éléments du paysage, qui deviennent des "
          + "points de repère le long du trajet : dans la classe du document, une maison très ancienne et un immeuble récent, un carrefour, un "
          + "magasin de pianos, la place du marché, le théâtre. En chemin, chaque élève prend une photographie.",
          "Les arrêts aident à mémoriser le trajet et à organiser l'espace. Pour la photographie, éviter les vues trop rapprochées, sur un seul "
          + "objet : elle doit montrer d'autres éléments."),
        ph("Le croquis d'observation", "20 min", "Dans un lieu calme et assez grand — un carrefour, un jardin public —, chacun choisit un élément du "
          + "paysage et le dessine. On peut aussi dessiner un élément comme si on le voyait d'au-dessus : la fontaine de la place, par exemple.",
          "Se concentrer sur un lieu pour en voir les détails : c'est un début de lecture de paysage, repris plus loin dans la séquence."),
        ph("Les angles de vue", "25 min", "Faire observer les éléments proches, grands et détaillés, et les éléments éloignés, plus petits, visibles "
          + "en entier mais sans détails — on les mesure, bras tendu, avec un crayon ; tendre les bras devant soi, en biais, matérialise l'angle de "
          + "vue. Avec trois ou quatre photographies "
          + "prises avant la sortie, chercher d'où le photographe les a prises ; on peut y ajouter un minuscule détail à débusquer.",
          "Les enfants perçoivent sans s'arrêter, sauf si quelque chose les surprend ou si on leur demande d'être attentifs : ces jeux les obligent "
          + "à observer finement."),
      ]),
    seance("Raconter et dessiner la sortie",
      sauront("raconter le trajet de la sortie avec ses repères, et en faire une première représentation."), 40, [
        ph("Se remémorer la sortie", "10 min", "Raviver les souvenirs : distribuer les photographies de la sortie dans l'ordre où elles ont été prises "
          + "— chacun reconnaît la sienne, on dit ce qu'on y voit, l'enseignant note les points de repère au tableau — ; ou raconter ensemble les "
          + "étapes, ce qu'on a observé, les anecdotes, les yeux fermés pour se « remettre sur le terrain ».",
          "Autre choix, celui de la classe du document : un écrit de travail qui raconte la sortie — texte, dessin, schéma, carte mentale —, puis "
          + "une mise en commun et la liste des repères. Compter alors 30 minutes."),
        ph("Représenter le quartier", "30 min", "Chacun représente le quartier pour qu'on voie le chemin parcouru et ce qu'on a vu.",
          "Ce premier essai pose la question du point de vue qui montre le mieux un vaste espace. Moins de la moitié des élèves tentent un plan ; la "
          + "plupart gardent la vue de paysage ; des repères s'accrochent à une ligne, sans relations entre eux. Les détails et les noms de rues "
          + "montrent qu'on a bien observé."),
      ]),
    seance("Vers un plan du quartier",
      sauront("lire la représentation d'un camarade, y trouver de bonnes idées, et construire ensemble un plan du quartier vu de dessus et orienté."), 50, [
        ph("Lire le dessin du voisin", "20 min", "Échanger son dessin avec son voisin et le lire, avec une consigne : trouver de bonnes idées pour "
          + "représenter le quartier parcouru. On dresse la liste des bonnes idées à reprendre pour montrer tout le quartier.",
          "Une lecture constructive : on comprend qu'on peut porter un autre point de vue sur l'espace. Attention : pour beaucoup, la meilleure "
          + "idée reste la vue de paysage, plus jolie que la vue de dessus, qui cache les détails."),
        ph("Le plan collectif", "30 min", "Au tableau, en appliquant les bonnes idées, construire un plan du quartier : une étape entre les dessins "
          + "et le plan cadastral. On commence par l'école — un carré, vu d'en haut, avec son nom —, puis on fait dessiner la rue : c'est orienter "
          + "le bâtiment, la rue d'un côté, la cour de l'autre. Les autres repères se placent ensuite.",
          "Travailler au tableau oblige à s'orienter ; l'école orientée, chacun peut s'orienter et placer les autres repères. Garder ce plan sur un "
          + "support durable : il resservira pour les angles de vue."),
      ]),
    seance("Le plan cadastral",
      sauront("orienter le plan cadastral du quartier, y situer l'école, et y marquer l'itinéraire de la sortie."), 40, [
        ph("Un repère connu", "5 min", "Chacun reçoit un extrait du plan cadastral du quartier et y cherche quelque chose de connu : il faut lire les "
          + "indications, surtout les noms de rues. Un musée, une place, une rue se trouvent vite."),
        ph("Orienter le plan", "10 min", "Au vidéoprojecteur : ceux qui ont trouvé la rue de l'école aident à situer l'école, et chacun la colorie. "
          + "Puis on oriente le plan : imaginer un tout petit bonhomme dans « l'école du plan », et tourner le plan pour que la vraie rue et la "
          + "petite rue du plan soient du même côté.",
          "Tant que le plan ne correspond pas à la réalité, les élèves ne peuvent pas s'y projeter pour s'orienter. Un capuchon de stylo figure le "
          + "bonhomme ; une petite figurine aide ceux qui ont du mal."),
        ph("Marquer l'itinéraire", "15 min", "Seul, marquer sur le plan l'itinéraire de la sortie."),
        ph("Mise en commun", "10 min", "À tour de rôle, au poste ordinateur, placer un segment sur chaque rue parcourue.",
          "Les élèves cherchent le nom des rues et ne marquent souvent que la portion où il est écrit : faire marquer chaque rue sur toute sa "
          + "longueur visible."),
      ]),
    seance("Les photographies du trajet",
      sauront("ranger dans l'ordre du trajet des photographies prises sur le terrain, et retrouver les rues et quelques repères sur une photographie aérienne."), 45, [
        ph("Ordonner les photographies", "20 min", "Quelques photographies qui jalonnent le parcours, sur une planche : les découper et les coller dans "
          + "l'ordre où elles ont été prises. Il faut se remémorer le trajet et les paysages vus, et lire les détails de chaque image.",
          "Une lecture très fine, surtout en ville, où les rues se ressemblent. Différencier par le choix des photographies données. Certains "
          + "numérotent, d'autres écrivent le nom des rues."),
        ph("Mise en commun", "10 min", "Chacun vérifie qu'il a bien ordonné toutes les photographies.",
          "Bien mémoriser le trajet prépare les repérages sur la photographie aérienne et sur le plan."),
        ph("La photographie aérienne", "15 min", "Chacun reçoit la photographie aérienne verticale du quartier : la même portion d'espace que le plan "
          + "cadastral. L'enseignant ne dit rien et laisse découvrir. Une partie de la photographie est projetée : les élèves viennent à "
          + "l'ordinateur y placer le nom des rues et des symboles — un rectangle rouge pour l'école, un M pour le métro, Prf pour la préfecture.",
          "Continuer à lire le plan, avec un autre type de représentation de l'espace."),
      ]),
    seance("Les angles de vue",
      sauront("dire ce qu'est un angle de vue, et associer des photographies du quartier aux angles de vue tracés sur le plan."), 40, [
        ph("Rappel de la sortie", "10 min", "Sur la place, pendant la sortie, les éléments proches étaient grands et détaillés, ceux du fond bien plus "
          + "petits : mesuré bras tendu avec un crayon, le musée ne faisait qu'un demi-crayon. Tout ce qu'on voit droit devant soi tient dans un "
          + "angle : on le refait, bras tendus en biais. On l'appelle aussi le champ de vision."),
        ph("Le petit bonhomme du plan", "10 min", "Sur le plan collectif construit au tableau, l'enseignant place un petit bonhomme — un point rouge "
          + "— qui regarde devant lui — une flèche. Que voit-il ? La place du marché. Un élève trace l'angle de vue qui correspond."),
        ph("Retrouver les angles de vue", "15 min", "Chacun reçoit une planche de neuf photographies de la sortie et un extrait du plan cadastral où "
          + "l'enseignant a tracé des angles de vue. Retrouver chaque angle de vue et le mettre en couleur sur la planche."),
        ph("Vérifier", "5 min", "La vérification se fait ensemble, au vidéoprojecteur."),
      ]),
    seance("Lire le plan — évaluation",
      sauront("placer seuls, en lisant le plan, des repères du quartier sur sa photographie aérienne."), 30, [
        ph("Renseigner la photographie aérienne", "30 min", "Avec le plan du quartier, renseigner la photographie aérienne qui lui correspond : coller "
          + "au bon endroit des étiquettes préparées — l'école, des places, un théâtre, des rues, l'église, la poste — et compléter la légende. À "
          + "l'ordinateur, on place les étiquettes sur l'écran.",
          "À mi-parcours : sait-on orienter un plan et y trouver des repères ? Les étiquettes évitent que l'écriture gêne. Qui ne place que les "
          + "repères retrouvés de mémoire a du mal à orienter le plan et la photographie, et ne cherche pas assez les détails : reprendre avec lui "
          + "l'orientation, les repères, la lecture des deux documents ensemble. Fixer les documents : s'ils bougent, on perd le fil du repérage."),
      ]),
    seance("Observer un village",
      sauront("observer les photographies d'un village avec la grille de lecture du quartier, et noter ce qu'ils voient dans une carte mentale."), 55, [
        ph("Et un village ?", "10 min", "Afficher la grille de la première séance, ce qu'on a observé dans le quartier, et se remémorer les éléments "
          + "vus. Tous les lieux de vie ressemblent-ils à ce quartier ? On peut aussi vivre à la campagne : c'est plus petit, il y a plus de nature. "
          + "On va comparer le quartier avec un village, avec les catégories déjà construites.",
          "Le document utilise la carte mentale, que la classe pratique souvent ; un tableau convient aussi bien — complété d'une autre couleur "
          + "pour le village, ou un second tableau aux mêmes colonnes."),
        ph("Le village en photographies", "45 min", "En salle informatique : observer les photographies du village et noter ce qu'on voit pour "
          + "chaque rubrique — les habitations, les voies de circulation, les commerces, les espaces verts, les monuments, les services. Une carte "
          + "mentale est commencée avec les critères du quartier ; une fiche explique comment ouvrir le logiciel.",
          "Les photographies doivent montrer tous les aspects du village. Choisir un village que les élèves connaissent, assez grand pour avoir "
          + "des services : Éduscol prend Maroilles, dans le Nord, 1 429 habitants en 2012. Compter avec le peu d'aisance des CE2 au clavier ; "
          + "le logiciel, lui, est vite compris."),
      ]),
    seance("Comparer le quartier et le village",
      sauront("comparer le quartier et le village critère par critère, et situer chacun : une ville, la campagne, une région, la France."), 60, [
        ph("Mise en commun", "40 min", "Mettre en commun, rubrique par rubrique, ce qu'on a observé du village.",
          "Dans la classe du document, faute d'ordinateurs ce jour-là, elle se fait au tableau."),
        ph("Des critères de comparaison", "20 min", "La carte mentale, remise au propre avec le logiciel, est distribuée. Comment a-t-on comparé ? "
          + "Avec les rubriques utilisées depuis le début : les habitations, les commerces, les espaces verts, la circulation, les monuments, les "
          + "services, les loisirs. Les branches principales de la carte sont des critères de comparaison : au village, plus d'espaces verts, "
          + "moins de commerces, moins de sortes de voies. Puis situer : notre quartier est un quartier d'une ville, dans une région, en France ; "
          + "le village est à la campagne, dans la même région.",
          "Les élèves énoncent les rubriques sans difficulté ; l'enjeu est de les voir comme des critères."),
      ]),
    seance("Le village vu d'en haut",
      sauront("retrouver des repères sur le plan et les photographies aériennes d'un village, et dire ce qui distingue un village d'un quartier de ville, au-delà d'une liste."), 90, [
        ph("Trois documents", "10 min", "Chacun reçoit trois documents du village : une photographie aérienne verticale, comme celle du quartier ; un "
          + "plan ; une photographie aérienne oblique, qui montre son paysage. Les reconnaître : les photographies sont prises avec un appareil, d'un "
          + "point de vue dominant ; le plan est fabriqué, dessiné."),
        ph("Des repères communs", "20 min", "Trouver des points de repère sur les trois documents. L'église, bien visible sur la vue oblique, est "
          + "difficile à trouver sur le plan et sur la vue verticale : l'enseignant donne une clé, sa place par rapport aux routes, qui fait "
          + "découvrir le figuré du plan. On la marque d'un rectangle rouge sur la photographie, puis on passe au repère proposé par un autre élève."),
        ph("L'écrit de travail", "10 min", "Chacun écrit pour revenir sur ces activités de comparaison."),
        ph("Comparer sans énumérer", "20 min", "Avec les critères écrits au tableau et les mots de la carte mentale, formuler des comparaisons, en "
          + "allant vers ce qui caractérise la ville : sa taille, sa variété, sa mobilité.",
          "Dépasser les premières formulations, « dans le village il y a ceci et cela » : c'est difficile pour les élèves."),
        ph("La trace écrite", "20 min", "La construire à partir des écrits de travail : de courts paragraphes, dans un tableau à deux colonnes, le "
          + "quartier et le village, qui fait apparaître les critères. Le quartier fait partie d'une ville, de plus de 2 000 habitants ; le village, "
          + "à la campagne, en a moins. Puis les habitations, les commerces et les services, les loisirs, les voies de circulation, les espaces verts."),
        ph("Situer dans la région", "5 min", "Localiser le quartier et le village à l'échelle de la région, avec cartes.gouv.fr, l'ancien Géoportail : les limites "
          + "administratives, et même la distance entre le village et la ville."),
      ]),
    seance("Le quartier et le village — évaluation",
      sauront("définir seuls un quartier et un village, les comparer avec les critères vus en classe, et placer une légende en lisant une carte."), 45, [
        ph("Revoir les critères", "10 min", "Revoir ensemble les critères de comparaison vus en classe, avant le travail individuel."),
        ph("Comparer", "20 min", "Chacun définit le quartier et le village, puis compare le quartier avec un village grâce aux critères vus en "
          + "classe : un texte, un tableau ou une carte mentale, au choix. D'autres questions portent sur un nouveau village à étudier, et sur ce "
          + "qui caractérise un village et un quartier de ville."),
        ph("Lire la carte", "15 min", "En s'aidant de la carte, placer au bon endroit, sur le document fourni, les noms et les symboles de la légende."),
      ]),
  ],
};

// « Comparer des modes de vie » : les marchés (CE1), les transports (CE2).

const MARCHES_CE1: Demarche = {
  id: "marches-ce1",
  nom: "Les marchés, ici et ailleurs (CE1)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Explorer les organisations du monde – Comparer quelques modes de vie des hommes et "
    + "des femmes, et quelques représentations du monde » : « Les marchés », séquence au CE1 (introduction « Comparer des modes de vie » ; introduction de "
    + "la séquence ; séances 1 à 5 et leurs annexes « Le marché près de chez nous » et « Les mots du marché » ; évaluation) ; programme 2020, encore en "
    + "vigueur en CE1-CE2 en 2026-2027",
  resume: "Une discussion à visée philosophique sur la différence, à partir de Jean de la Lune ; le marché près de chez soi, décrit avec ce qu'on en sait, "
    + "puis vérifié au marché ou sur des photographies ; des marchés du Cambodge, de Tunisie, du Burkina Faso et du Brésil, découverts en photographies et "
    + "présentés en courts exposés ; le témoignage d'une Cambodgienne ; puis la comparaison, dite avec « alors que » et « comme ». L'alimentation, par le "
    + "marché : comparer pour mieux comprendre ce qui est familier, sans créer de stéréotypes.",
  seances: [
    seance("Discussion à visée philosophique",
      sauront("formuler des questions que l'histoire de Jean de la Lune laisse ouvertes, en débattre en écoutant et en argumentant, et dire en une phrase "
        + "ce que la différence nous apporte."), 50, [
        ph("Lire l'album", "10 min", "L'enseignant lit Jean de la Lune, de Tomi Ungerer : l'album pose la question de la différence.",
          "La séance suit la méthode de Claudine Leleux, Apprentis philosophes : des discussions à visée philosophique à partir de contes."),
        ph("Raconter l'histoire", "5 min", "Les élèves racontent l'histoire : c'est ainsi qu'ils montrent ce qu'ils ont compris."),
        ph("Poser des questions", "10 min", "Formuler des questions de type philosophique, auxquelles l'histoire ne répond pas explicitement. Par exemple : "
          + "serait-il intéressant d'être tous pareils ? Que nous apporte la différence ?"),
        ph("Discuter", "15 min", "Chacun exprime ses idées et son point de vue, et argumente ; on cherche ensemble des réponses.",
          "L'enseignant aide les élèves à prendre de la distance avec l'histoire ; si besoin, il relance pour faire formuler d'autres réponses ou nuancer les propos."),
        ph("Une phrase pour conclure", "10 min", "Chacun écrit une phrase qui résume la discussion — sa sagesse individuelle, selon le mot de Claudine Leleux —, "
          + "à partir de la structure « Si nous étions tous pareils, … »."),
      ]),
    seance("Le marché près de chez soi",
      sauront("dire où se tient le marché près de chez eux, ce qu'on y vend, qui vend et qui achète, et comment les aliments y sont transportés, conservés "
        + "et présentés."), 60, [
        ph("Rappel et projet", "5 min", "Rappeler les conclusions de la discussion sur la différence ; présenter les objectifs de la séquence : décrire le marché "
          + "près de chez nous, pour le comparer ensuite à d'autres marchés du monde."),
        ph("Ce que l'on sait", "10 min", "Chacun écrit ce qui caractérise, pour lui, un marché alimentaire près de chez soi.",
          "Le recueil individuel et écrit implique chaque élève ; il donne à l'enseignant de quoi conduire la séance."),
        ph("Mettre en commun", "10 min", "Mettre en commun et classer les réponses ; chercher d'autres caractéristiques : les personnes (vendeurs et acheteurs), "
          + "les objets (la balance, la caisse enregistreuse), le lieu (des halles, une place, les trottoirs).",
          "Veiller au vocabulaire juste. Souligner les désaccords et ce qu'on ignore : ils justifient l'enquête."),
        ph("Enquêter", "20 min", "Deux façons, au choix : la sortie au marché le plus proche de l'école ; ou, en binômes, un corpus de photographies à observer "
          + "et à commenter, pour répondre aux questions restées ouvertes.",
          "La sortie se prépare : répartir ce qu'on cherche (les aliments vendus, leur présentation), définir les tâches, rappeler les règles de politesse et de "
            + "respect des personnes. Pour les photographies, un corpus différent par binôme donne son sens au travail coopératif."),
        ph("Écrire ensemble", "15 min", "Confronter les écrits pour stabiliser les réponses et expliciter le vocabulaire ; rédiger ensemble la description du "
          + "marché près de chez nous, puis la copier.",
          "La fiche Éduscol « Le marché près de chez nous » donne un exemple de ce texte, avec les mots du marché illustrés."),
      ]),
    seance("Des marchés, ailleurs dans le monde",
      sauront("décrire un marché d'un autre pays d'après des photographies — le lieu, les aliments vendus, leur présentation — et le comparer au marché "
        + "près de chez eux."), 60, [
        ph("Se rappeler", "5 min", "Réactiver ce qu'on a appris : des devinettes, des images à associer à des mots, ou simplement un rappel, avec la synthèse "
          + "de la séance précédente projetée."),
        ph("Situer, supposer", "10 min", "Redire l'enjeu de la séance et ce qui la relie aux précédentes. L'enseignant situe sur le planisphère de la classe "
          + "les pays étudiés — le Cambodge, la Tunisie, le Burkina Faso, le Brésil — ; les élèves font des hypothèses sur ce qu'on trouve sur un marché "
          + "dans chacun."),
        ph("Observer, écrire", "15 min", "Chaque groupe reçoit des photographies des marchés d'un même pays. Après échanges et hypothèses, chacun commente "
          + "une image en quelques phrases : le lieu du marché, les aliments vendus, leur présentation."),
        ph("Courts exposés", "15 min", "Chaque groupe choisit trois photographies — le lieu, un aliment, sa présentation — et les présente ; on lit les "
          + "commentaires écrits, les échanges les affinent. L'enseignant remplit un tableau qui compare chaque marché au marché local.",
          "Les observations des élèves affinent le questionnement."),
        ph("Confronter", "10 min", "Après tous les exposés, confronter les résultats aux représentations du début : pointer quelques différences "
          + "emblématiques que les élèves n'avaient pas imaginées. Chacun complète son tableau, la fiche « Les mots du marché » : près de chez nous, "
          + "ailleurs dans le monde."),
        ph("Les questions qui restent", "5 min", "Choisir le marché qui a suscité le plus de réactions, pour l'approfondir ; noter les questions des élèves "
          + "et leurs propositions de réponses.",
          "Ces questions servent à bâtir le QCM de la séance suivante. Dans la séquence Éduscol, c'est le marché du Cambodge : le témoignage de la "
            + "séance 4 porte sur lui."),
      ]),
    seance("Le marché au Cambodge",
      sauront("prélever des informations dans le témoignage oral d'une Cambodgienne pour répondre à leurs questions sur le marché au Cambodge, et écrire "
        + "ce qu'ils en ont appris."), 50, [
        ph("Réactiver", "5 min", "Se rappeler le marché cambodgien à l'aide de l'exposé du groupe."),
        ph("Lire le QCM", "10 min", "Lire et expliciter un questionnaire à choix multiples, bâti sur les questions et les propositions de réponses de la "
          + "séance précédente.", "Le QCM prépare à prélever des informations dans l'interview."),
        ph("Écouter le témoignage", "20 min", "L'interview de Mara Zahnd, une Cambodgienne : une première écoute en entier, puis une écoute fractionnée, qui "
          + "laisse le temps de s'approprier, de s'exprimer et de questionner ; la dernière écoute sert à cocher les réponses du QCM."),
        ph("Écrire ce qu'on a appris", "10 min", "Chacun rédige un court texte sur ce qu'il a appris du marché cambodgien."),
        ph("Une ressemblance, une différence", "5 min", "Pour engager la comparaison, les élèves disent une ressemblance et une différence avec le marché "
          + "local de France métropolitaine ; l'enseignant les écrit au tableau. Par exemple : au Cambodge, le marché est flottant ; chez nous, il se "
          + "tient sous des halles, sur une place ou dans la rue.", "Cette phase introduit la séance suivante."),
      ]),
    seance("Comparer les marchés",
      sauront("dire une différence entre un marché en France et un marché d'un autre pays avec « alors que », et une ressemblance avec « comme »."), 45, [
        ph("Souligner les différences", "10 min", "Sur le tableau des marchés complété en séance 3, chacun souligne les différences entre le marché local, en "
          + "France métropolitaine, et le marché du pays étudié en groupe ; on les partage, l'enseignant les souligne au tableau."),
        ph("Dire une différence", "15 min", "À l'oral, chacun dit en une phrase une différence entre un marché en France et un marché à l'étranger, avec "
          + "« alors que » — ou « tandis que » ; sur ce modèle, des phrases sont écrites au tableau.",
          "Des débuts de phrases, proposés à ceux qui en ont besoin, lèvent les blocages."),
        ph("Dire une ressemblance", "10 min", "Une phrase avec l'adverbe « comme », par exemple : « Au Brésil comme en France, le marché a lieu dans la rue. »"),
        ph("La trace écrite", "10 min", "Chacun rédige une trace écrite sur le vocabulaire et les connaissances acquis en découvrant les marchés du monde.",
          "L'évaluation se fait en observant le travail effectif des élèves."),
      ]),
  ],
};

// ── Les moyens de transport dans le monde (CE2) ───────────────────────────

const TRANSPORTS_CE2: Demarche = {
  id: "transports-ce2",
  nom: "Les moyens de transport dans le monde (CE2)",
  famille: "Sciences, histoire, EMC",
  source: "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Explorer les organisations du monde – Comparer quelques modes de vie des hommes et "
    + "des femmes, et quelques représentations du monde » : « Les transports », séquence au CE2 (introduction « Comparer des modes de vie » ; introduction "
    + "de la séquence ; séances 1 à 5 et les annexes des séances 2 et 3) ; programme 2020, encore en vigueur en CE1-CE2 en 2026-2027",
  resume: "Un album, Le génie du pousse-pousse, pour se demander si l'on se déplace partout comme chez nous, et un projet d'écriture ; les moyens de transport "
    + "de l'Europe, listés, devinés, placés sur la carte ; ceux de l'Asie, de l'Afrique, de l'Amérique et de l'Océanie, cherchés sur Internet par groupes, "
    + "comparés à ceux de l'Europe puis présentés à la classe ; enfin, une aventure inventée, où un personnage se déplace avec un moyen de transport "
    + "emblématique du lieu de l'histoire. Comparer pour décrire les différences, sans stéréotypes.",
  seances: [
    seance("Le génie du pousse-pousse",
      sauront("dire ce qu'ils ont compris du Génie du pousse-pousse, y compris ce que le texte laisse entendre, en justifiant leur point de vue, et "
        + "situer la Chine sur un planisphère en nommant son continent, l'Asie."), 45, [
        ph("Lire l'album", "15 min", "L'enseignant lit à voix haute Le génie du pousse-pousse, de Jean-Côme Noguès, illustré par Anne Romby.",
          "L'album est étudié pour lui-même ; il ouvre aussi la question des transports dans le monde, et donne son sens à la séquence par un projet d'écriture."),
        ph("Comprendre", "15 min", "Échanger sur la compréhension du texte : les interactions entre élèves et les questions de l'enseignant sur l'implicite "
          + "font saisir la portée morale de l'histoire."),
        ph("La Chine, en Asie", "10 min", "Introduire, ou reprendre, la notion de continent : situer la Chine sur un planisphère et nommer son continent.",
          "Cinq continents seront nommés et repérés au fil de la séquence ; l'Antarctique peut être mentionné, mais il n'est pas étudié."),
        ph("Le projet", "5 min", "Présenter le projet : découvrir les moyens de transport du monde, pour écrire en fin de séquence une courte histoire "
          + "inspirée de l'album, avec obligatoirement un enfant et un moyen de transport choisi.",
          "La question qui guide la séquence : « est-ce que les habitants se déplacent dans leur pays comme on le fait chez nous ? »"),
      ]),
    seance("Les moyens de transport en Europe",
      sauront("nommer les moyens de transport les plus courants en Europe, et situer quelques transports caractéristiques sur une carte de l'Europe."), 45, [
        ph("Lister", "10 min", "En binômes, lister tous les moyens de transport auxquels on pense. L'enseignant consigne les représentations de la classe "
          + "dans un tableau et montre le dessin de chaque véhicule, choisi à l'avance.",
          "Une évaluation diagnostique : ce que les élèves savent déjà, pour l'accroître et le structurer."),
        ph("Devinettes", "15 min", "Des devinettes font trouver les transports oubliés — le métro, le taxi, le tramway, la motoneige, le ski, les chiens de "
          + "traîneau — ou trop peu détaillés : le bus à impériale, le voilier, le ferry-boat, la gondole. Chaque transport trouvé est montré en "
          + "photographie ou en dessin.",
          "Pour le métro, par exemple : un transport des grandes capitales d'Europe, qui ressemble à un train mais circule surtout sous terre."),
        ph("La fiche", "5 min", "Sur la fiche des moyens de transport européens, écrire le nom de chacun en face de son image."),
        ph("La trace écrite", "10 min", "Avec la carte de l'Europe, rédiger une trace écrite en dictée à l'adulte ; chacun la recopie dans le cahier de cet "
          + "apprentissage."),
        ph("Préparer l'enquête", "5 min", "Montrer la carte que les recherches des groupes compléteront ; former les groupes ; un élève de chaque groupe "
          + "tire au sort le continent à étudier : l'Asie, l'Afrique, l'Amérique ou l'Océanie."),
      ]),
    seance("Les transports d'un autre continent",
      sauront("trouver sur Internet les moyens de transport les plus courants d'un continent — l'Asie, l'Afrique, l'Amérique ou l'Océanie — et dire "
        + "lesquels sont identiques à ceux de l'Europe, lesquels en diffèrent."), 60, [
        ph("La question de départ", "5 min", "« Selon vous, comment se déplace-t-on en Asie ? » — ou sur le continent du groupe. Les représentations "
          + "initiales sont dictées à l'adulte.",
          "Au moins quatre groupes, un continent chacun ; mieux vaut ne pas les faire travailler tous en même temps, pour accompagner au mieux chaque recherche."),
        ph("Chercher sur Internet", "20 min", "Par deux, chercher des photographies de moyens de transport du continent, avec une double consigne : retrouver "
          + "ceux qu'on a vus en Europe, repérer ceux qui sont différents.",
          "Un usage responsable d'Internet. L'enseignant fait dire les ressemblances et les différences avec l'Europe, et confronter aux représentations "
            + "du début : on découvre ce qu'on n'imaginait pas — en Asie, la place des deux-roues."),
        ph("Le tableau, la mise en commun", "15 min", "Le groupe remplit un tableau : les transports identiques à ceux de l'Europe, les transports "
          + "différents — pour l'Asie, l'éléphant, le pousse-pousse, le tuk-tuk, le dromadaire, l'âne, la jonque. L'enseignant montre les photographies "
          + "qui correspondent aux découvertes et précise ce qu'est chaque véhicule.",
          "Tout ne pourra pas être illustré : amener les élèves à identifier les transports les plus caractéristiques."),
        ph("La carte du continent", "5 min", "Placer la sélection de photographies autour d'une carte vierge du continent."),
        ph("La trace écrite", "15 min", "Rédiger en dictée à l'adulte ce qu'on a appris sur les moyens de transport du continent ; le titre est choisi en "
          + "dernier. Chacun copie la synthèse dans son cahier, la carte collée en vis-à-vis."),
      ]),
    seance("Mise en commun des savoirs",
      sauront("présenter à la classe les moyens de transport du continent étudié, en se faisant entendre et comprendre, et comparer ceux de l'Asie, "
        + "de l'Afrique, de l'Amérique et de l'Océanie."), 45, [
        ph("Les exposés", "35 min", "Chaque groupe présente son continent en un court exposé illustré : il lit sa trace écrite à la classe et montre ses "
          + "photographies, au tableau ou au TNI.",
          "Dire pour être entendu et compris. Comparer sans créer de stéréotypes, ni laisser croire que le climat ou le relief décident de tout : on "
            + "s'adapte au climat (la motoneige), on détourne aussi les contraintes (un tunnel sous la montagne)."),
        ph("Le texte et la carte", "10 min", "L'enseignant distribue le texte qui rassemble toutes les traces écrites, et une carte des moyens de transport "
          + "les plus caractéristiques, pour les mémoriser."),
      ]),
    seance("Écrire une aventure",
      sauront("écrire une histoire d'environ une demi-page, inspirée du Génie du pousse-pousse, où un personnage se déplace avec un moyen de transport "
        + "emblématique du lieu, puis l'améliorer et l'illustrer."), 75, [
        ph("Rappeler le projet", "5 min", "Le projet annoncé à la première séance : une aventure inspirée de l'album, vécue par un personnage — un enfant, "
          + "disait l'annonce — qui se déplace avec un moyen de transport assez emblématique du lieu de l'histoire."),
        ph("Écrire", "30 min", "Chacun rédige un texte d'invention d'environ une demi-page.",
          "Un texte cohérent, organisé, ponctué, pertinent pour sa visée et son destinataire."),
        ph("Améliorer", "20 min", "Améliorer son texte, notamment l'orthographe, en tenant compte des indications données."),
        ph("Illustrer", "20 min", "Illustrer le texte par une production plastique : dessin, peinture, collage.",
          "Expérimenter, produire, créer : mettre en œuvre un projet artistique."),
      ]),
  ],
};

// ── Les autres thèmes : bâtis sur le programme ────────────────────────────
//
// Pour les thèmes qu'aucune séquence Éduscol ne détaille, la séquence suit le
// programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026) : elle
// répond à la question du thème — « la séquence apporte une réponse à cette
// interrogation » —, une séance par objectif ou par attendu, ses repères
// remobilisés, ses mots-clés au tableau, et une évaluation sur ses attendus.
// Chaque séance part d'une question, fait chercher dans des documents, des
// observations, des manipulations, et fixe ce qu'on retient sur la frise, la
// carte ou le planisphère de la classe.

const PROGRAMME = "Bâtie sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026, annexe 3), à la demande de l'enseignant : "
  + "la question du thème, ses objectifs, ses attendus, ses repères et ses mots-clés";

const Q = "La question", C = "Chercher", R = "Ce qu'on retient";
/** Une séance en trois temps : la question, la recherche, ce qu'on retient — sur la frise, la carte, l'affiche. */
const etape = (titre: string, objectif: string, question: string, chercher: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(Q, "10 min", question), ph(C, "25 min", chercher, posture), ph(R, "10 min", retenir)]);
const evaluation = (quoi: string, repere: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille, les consignes lues à voix haute : ${quoi}.`),
  ph(R, "5 min", `${repere} Les repères se remobilisent souvent : on y reviendra.`),
]);

// Histoire, CP — sans durée imposée : ses dimensions se travaillent ensemble, toute l'année.

const TEMPS_NATUREL_CP: Demarche = {
  id: "temps-naturel-cp", nom: "Les manifestations naturelles du temps (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment des manifestations naturelles permettent-elles d'observer le temps qui passe ? » Le jour et la nuit qui alternent, "
    + "expliqués avec un globe terrestre et une lampe ; les saisons, leurs caractéristiques là où vit l'élève, et leur retour chaque année.",
  seances: [
    etape("Le jour et la nuit", "dire ce qu'on fait le jour et la nuit, et que le jour et la nuit reviennent sans cesse.",
      "Pourquoi fait-il nuit ? Ce que les élèves en pensent.",
      "Trier des images de ce qu'on fait le jour et la nuit ; observer le ciel à plusieurs moments : le Soleil, la Lune, la lumière.",
      "Le jour, puis la nuit, puis le jour : ils alternent. Les mots : jour, nuit."),
    etape("Le globe et la lampe", "expliquer l'alternance du jour et de la nuit en manipulant un globe terrestre.",
      "Comment la Terre peut-elle être éclairée d'un côté et dans le noir de l'autre ?",
      "Dans la pénombre, une lampe pour le Soleil, un globe, une gommette sur la France : on fait tourner le globe ; la gommette passe "
        + "de la lumière à l'ombre. Chaque élève manipule et explique.",
      "La Terre tourne sur elle-même : c'est sa rotation. Un tour : un jour et une nuit.", "Faire dire avec le globe en main : la manipulation porte l'explication."),
    etape("Les saisons autour de nous", "nommer les saisons et donner leurs caractéristiques, là où ils vivent.",
      "Comment sait-on que la saison change ?",
      "Observer un même arbre de la cour, des photographies d'un même lieu au fil de l'année ; noter le temps qu'il fait, les vêtements, "
        + "la durée du jour, les activités.",
      "Le printemps, l'été, l'automne, l'hiver, et ce qui les caractérise ici. Le mot-clé : saisons."),
    etape("Les saisons reviennent", "ordonner les saisons dans l'année et savoir qu'elles reviennent chaque année.",
      "Après l'hiver, que vient-il ? Et ensuite ?",
      "Placer les saisons sur la roue de l'année, avec leurs mois ; comparer avec un lieu où les saisons sont différentes — un territoire "
        + "d'outre-mer, par exemple.",
      "La roue de l'année : quatre saisons qui reviennent. Les saisons dépendent du lieu où l'on vit."),
    evaluation("expliquer le jour et la nuit avec un globe, nommer les saisons et donner leurs caractéristiques", "La roue des saisons reste affichée."),
  ],
};

// Le temps représenté et les évènements situés : les séquences Éduscol de 2016
// « Se situer dans le temps », que l'enseignant a fournies — deux albums pour
// passer d'un temps ressenti à un temps mesuré, un parcours sonore pour situer
// les évènements les uns par rapport aux autres, et les rituels des rythmes
// cycliques. Ce qu'elles ne couvrent pas — la journée et ses heures, la frise
// de la vie, les générations — suit le programme, et la source le dit.

const SE_SITUER_2016 = "Éduscol, ressources 2016 — Questionner le monde, cycle 2, « Se situer dans le temps »";

const TEMPS_REPRESENTE_CP: Demarche = {
  id: "temps-represente-cp", nom: "Les représentations humaines du temps (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Passer d'un temps ressenti à un temps mesuré » (séances 1 à 3), les outils de mesure de la séquence `
    + "« Situer les événements les uns par rapport aux autres » (séances 1 et 5) et les rituels de « Identifier les rythmes cycliques du temps » (CP et CE1) ; "
    + "l'évaluation bâtie sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)",
  resume: "« Comment les hommes et les femmes se repèrent-ils dans le temps ? Comment le représentent-ils ? » Deux albums pour passer d'un temps "
    + "ressenti à un temps mesuré — François et le temps, Le petit voleur de temps — et des jeux de langage sur les mots du temps ; les outils qui "
    + "mesurent le temps, essayés ; le programme de la journée et l'horloge ; puis les rituels qui font voir le temps qui revient — les jours, les "
    + "mois — et celui qui ne revient pas — les années.",
  seances: [
    seance("François et le temps",
      sauront("dire qu'une attente semble longue ou courte selon ce qu'on vit, et qu'une montre permet de mesurer ce temps pour tous."), 50, [
        ph("Découvrir l'album", "10 min", "La couverture de François et le temps (Christine Naumann-Villemin) est décrite : les élèves font des hypothèses sur l'histoire."),
        ph("Lire et comprendre", "20 min", "Un élève dont la lecture est fluide lit l'histoire à ses camarades ; on confronte les interprétations, on explique les implicites "
          + "et les mots qui structurent le temps.", "S'identifier à François : passer d'un temps ressenti à un temps mesuré, et voir que des objets du quotidien servent à le mesurer."),
        ph("Les mots du temps", "20 min", "Relever et classer le lexique du temps : le temps ressenti (attendre, s'ennuyer, patienter), l'ordre (d'abord, juste avant, "
          + "maintenant), la date et l'heure (aujourd'hui, ce soir, il est 8 heures), les objets qui mesurent le temps (montre, pendule, réveil, sablier, clepsydre), "
          + "les bruits qui le scandent (tic-tac, la cloche).", "Le classement reste affiché : il sert toute la séquence."),
      ]),
    seance("Jeux de langage en ateliers",
      sauront("employer les mots qui opposent et ordonnent le temps — avant, après, tôt, tard, en avance, en retard — et se repérer dans les jours, les mois et les saisons."), 75, [
        ph("Présenter le nouvel album", "15 min", "Le petit voleur de temps (Nathalie Minne) est présenté par ses illustrations, en lien avec François et le temps."),
        ph("Les ateliers, 10 minutes chacun", "40 min", "Des cartes de questions : le jeu des contraires (avant / après, un court instant / un long moment, ralentir / accélérer…) ; "
          + "se repérer dans la semaine du voleur de temps (« Nous sommes mardi, ils ont rendez-vous jeudi : combien de nuits ? ») ; le jour, la nuit et les saisons "
          + "(« À quel moment cela se passe-t-il si les feuilles tombent ? ») ; expliquer des expressions (« être en retard », « se souvenir », « programmer »).",
          "Les trois premiers ateliers se font en autonomie, avec un élève bon lecteur ; la réponse des questions fermées est sur la carte : on cherche à se questionner et à échanger."),
        ph("Regroupement", "10 min", "Ce que chaque atelier a fait dire, et les mots nouveaux, ajoutés au classement de la première séance."),
      ]),
    seance("Le petit voleur de temps",
      sauront("situer les évènements de l'histoire sur un calendrier, et dire pourquoi on a besoin de mesurer le temps."), 45, [
        ph("Le lundi, point de départ", "10 min", "Avant de lire, le calendrier de la classe : le lundi est le début du récit."),
        ph("Lire, et faire avancer les personnages", "25 min", "Pendant la lecture, un élève déplace les deux personnages aimantés sur le calendrier, au fil des "
          + "évènements ; l'horloge aide à comprendre les minutes « volées ».", "La séance est filée sur une semaine : relire l'album plusieurs fois affine la compréhension."),
        ph("Comprendre et redire", "10 min", "Les inférences du texte ; raconter et expliquer avec les mots du temps."),
      ]),
    seance("Mesurer le temps : quel outil ?",
      sauront("observer et utiliser des outils de mesure du temps — sablier, pendule, montre, réveil, analogiques et numériques — et dire lequel convient à quelle durée."), 45, [
        ph("Estimer, puis mesurer", "15 min", "Estimer la durée d'une activité de la classe, puis la mesurer avec un chronomètre, une montre, l'horloge : on note les résultats pour les confronter."),
        ph("Quel outil pour quelle durée ?", "20 min", "Essayer un sablier, un réveil, une montre, un chronomètre, l'horloge — et, si on en a, une clepsydre, un métronome : "
          + "ce que chacun permet, ce qu'il empêche, lequel mesure les secondes, les minutes, les heures.", "Les élèves proposent, essaient, expliquent les problèmes rencontrés."),
        ph("Ce qu'on retient", "10 min", "Les outils et leur nom : sablier, pendule, montre, réveil, chronomètre. Les mots seconde, minute, heure."),
      ]),
    seance("Le programme de la journée",
      sauront("établir le programme de la journée avec des étiquettes, se repérer à l'aide d'une horloge, et savoir que la journée est divisée en heures."), 30, [
        ph("Le programme du jour", "15 min", "Avec des étiquettes, établir le programme de la journée ; le placer à côté de l'horloge de la classe : à quelle heure ?"),
        ph("La journée en heures", "15 min", "Une journée, ce sont vingt-quatre heures ; le jour et la nuit s'y partagent. Le programme de la semaine, sur le même modèle."),
      ]),
    seance("Rituel : quel jour sommes-nous ?",
      sauront("écrire la date du jour avec le calendrier, nommer et ordonner les jours de la semaine, et employer hier, avant-hier, demain."), 15, [
        ph("La date au tableau", "10 min", "Un binôme écrit la date du jour pour la classe, aidé d'une frise numérique pour les quantièmes et du calendrier pour les jours de la semaine.",
          "Repris chaque jour : c'est le rituel qui installe le temps cyclique."),
        ph("Hier, aujourd'hui, demain", "5 min", "Se repérer dans la succession des jours — la roue des jours, la semaine linéaire — avec les temps qui vont avec : passé, présent, futur.",
          "L'enseignant reformule pour corriger les temps de la conjugaison."),
      ]),
    seance("Rituel : le mois et l'année",
      sauront("savoir que l'année est divisée en mois, le mois en semaines et en jours, et que les années se suivent sans revenir."), 20, [
        ph("Le calendrier", "10 min", "Identifier le mois, le jour, le quantième ; « En quelle année sommes-nous ? » Les mois reviennent, les années se suivent : le temps ne revient pas.",
          "Chaque journée passée est rayée : le temps qui organise la classe revient — les jours, les mois — et pourtant il ne revient pas."),
        ph("La frise des mois", "10 min", "Compter les mois jusqu'à la fin de l'année ; y reporter ce qui rythme la classe : anniversaires, sorties, commémorations."),
      ]),
    evaluation("nommer et ordonner les jours de la semaine et les mois, et dire avec quoi on mesure le temps", "Le calendrier et la roue des jours restent au mur."),
  ],
};

/** Les deux premières séances de la séquence Éduscol « Situer les événements les uns par rapport aux autres » : le parcours sonore. */
const PARCOURS_ECOUTE = seance("Le parcours sonore",
  sauront("situer les évènements d'un parcours les uns par rapport aux autres — avant, après, en même temps — et les représenter sur une bande."), 45, [
    ph("Écouter le parcours", "15 min", "Un enregistrement : un personnage se déplace sur un chemin. Les élèves identifient ses rencontres et les étapes de son parcours ; "
      + "on réécoute pour vérifier les hypothèses.", "Décrire, expliquer, débattre de l'antériorité, de la postériorité, de la simultanéité."),
    ph("Estimer les durées", "10 min", "Estimer la durée des étapes, puis la mesurer avec un chronomètre, une montre, l'horloge ; noter les résultats pour les confronter."),
    ph("Représenter le chemin", "20 min", "Sur une bande de papier, dessiner le chemin du personnage : ses rencontres, les lieux, dans l'ordre ; du ruban adhésif et des ciseaux "
      + "pour rectifier.", "L'enseignant vérifie la compréhension, fait dire la chronologie avec les mots du temps ; les représentations corrigées deviennent des références."),
  ]);
const PARCOURS_COMPARER = seance("Comparer nos chemins",
  sauront("décrire leur représentation, justifier leurs choix, et repérer la simultanéité et la durée."), 45, [
    ph("Présenter son chemin", "15 min", "Chacun décrit sa bande et justifie ses choix ; la classe questionne, commente, valide."),
    ph("En même temps, plus longtemps", "15 min", "L'enseignant juxtapose deux ou trois représentations — un même instant codé de deux façons, une erreur d'ordre — "
      + "et fait demander des explications.", "Faire émerger la continuité et la succession, l'antériorité et la postériorité, la simultanéité."),
    ph("Mesurer le temps", "15 min", "Des outils de mesure proposés par les élèves, essayés en situation : lequel dit combien de temps a duré chaque étape ?",
      "Prolongement : mesurer chaque jour la durée d'une tâche de la classe."),
  ]);

const SITUER_EVENEMENTS_CP: Demarche = {
  id: "situer-evenements-cp", nom: "Situer des évènements dans le temps (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Situer les événements les uns par rapport aux autres » (séances 1 et 2, le parcours sonore) et les rituels `
    + "de « Identifier les rythmes cycliques du temps » (le calendrier, la frise des mois, le cahier de textes) ; la journée, la frise de la vie, les "
    + "générations et l'évaluation bâties sur le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)",
  resume: "« Comment situer des évènements dans le temps ? » Un parcours sonore, écouté puis représenté sur une bande, pour situer des évènements les uns "
    + "par rapport aux autres — avant, après, en même temps — et en mesurer la durée ; le calendrier de la classe pour situer et planifier, avec hier, "
    + "aujourd'hui, demain ; la frise de la journée et celle de la vie de l'élève ; les générations, à partir d'exemples d'arbres généalogiques. "
    + "Le passé ne revient pas.",
  seances: [
    PARCOURS_ECOUTE,
    PARCOURS_COMPARER,
    seance("Le calendrier de la classe",
      sauront("situer et planifier sur un calendrier des évènements particuliers ou récurrents, avec les temps verbaux et les marqueurs du temps."), 45, [
        ph("La frise des mois", "15 min", "Reporter sur la frise des mois ce qui rythme la classe — les anniversaires, les sorties, une commémoration, un projet."),
        ph("Se projeter", "20 min", "« Quel jour serons-nous le prochain jour d'école ? » Le calendrier pour compter : dans combien de jours ? il y a combien de jours ? "
          + "Écrire dans le cahier de textes ce qu'on prévoit.", "Hier, avant-hier, il y a un mois ; demain, après-demain, dans un mois — avec le passé, le présent, le futur."),
        ph("Ce qu'on retient", "10 min", "Le calendrier sert à se souvenir et à prévoir."),
      ]),
    etape("La frise de la journée", "compléter une frise chronologique de la journée, avec ce qui se passe avant, en même temps et après.",
      "Que fait-on avant la récréation ? Pendant ? Après ?",
      "Ordonner des photographies d'une journée de classe ; compléter la frise de la journée, comme on avait représenté le chemin du parcours sonore.",
      "Antériorité, simultanéité, postériorité : avant, en même temps, après."),
    etape("La frise de ma vie", "compléter une frise chronologique de leur vie, et comprendre qu'on ne revient pas en arrière.",
      "Qu'est-ce qui s'est passé depuis notre naissance ?",
      "Placer sur une frise, une case par année, des photographies ou des dessins : la naissance, les premiers pas, l'entrée à l'école.",
      "Le temps passé ne revient pas : la frise va dans un seul sens.", "Chaque famille donne ce qu'elle veut : un dessin remplace une photographie."),
    etape("Les générations", "se repérer à travers les générations, à partir d'exemples d'arbres généalogiques.",
      "Qui est né avant qui ? Les parents ? Les grands-parents ?",
      "Lire l'arbre généalogique d'une famille d'un album ou d'une famille célèbre ; compléter un arbre ; placer les générations sur une frise.",
      "Les générations : les grands-parents, les parents, les enfants.", "On part d'exemples : l'arbre d'une famille étudiée, pas forcément celle de l'élève."),
    evaluation("situer des évènements sur le calendrier et sur une frise, avec hier, aujourd'hui, demain, avant, après", "Le calendrier et la frise de la classe continuent de vivre."),
  ],
};

/** La séquence Éduscol entière, croisée avec l'éducation musicale : à choisir dans le menu des déroulements. */
const PETITE_SIRENE_CP: Demarche = {
  id: "petite-sirene-cp", nom: "Situer les évènements : la valise sonore de la Petite Sirène (CP)", famille: "Sciences, histoire, EMC",
  source: `${SE_SITUER_2016} : la séquence « Situer les événements les uns par rapport aux autres » (présentation et séances 1 à 5), croisée avec l'éducation musicale`,
  resume: "Un parcours sonore écouté puis dessiné sur une bande ; les chemins comparés, pour faire émerger l'antériorité, la simultanéité, la durée ; "
    + "puis un projet : la valise sonore que la Petite Sirène emportera sur terre — des sons de la mer choisis, un chef d'orchestre, une frise-partition "
    + "où un trait vaut une seconde, et les outils qui mesurent ces secondes. Un premier pas vers une frise.",
  seances: [
    PARCOURS_ECOUTE,
    PARCOURS_COMPARER,
    seance("Le chef d'orchestre",
      sauront("identifier, dans une production sonore, ce qui se passe en même temps, et la durée de chaque son."), 45, [
        ph("Choisir les sons de la mer", "15 min", "Le conte de la Petite Sirène, lu et écouté avant : choisir des instruments ou des objets qui sonnent comme la mer — "
          + "pour l'eau, une paille, un fouet, une fourchette ; pour le vent, des papiers ; pour les poissons, une boîte à musique, la voix."),
        ph("Jouer, diriger", "20 min", "Un élève est le chef d'orchestre : il fait démarrer les groupes d'instruments dans l'ordre qu'il veut, les arrête, les fait repartir. "
          + "Un deuxième, puis un troisième prend sa place ; on enregistre.", "Les gestes du chef d'orchestre font voir la simultanéité et la durée."),
        ph("Écouter et comparer", "10 min", "Écouter les enregistrements : quel objet fait ce son ? Lesquels sonnent en même temps ? Combien de temps chacun ?"),
      ]),
    seance("La frise-partition",
      sauront("coder sur une partition les sons, leur durée et leur simultanéité, de façon que tous puissent la lire."), 45, [
        ph("Ce qui a gêné", "10 min", "Expliquer ce qu'on a déjà fait, et les difficultés : des dessins trop détaillés, des durées qu'on ne distingue pas, la simultanéité, "
          + "le besoin de réécouter."),
        ph("Coder la partition", "25 min", "Sur une frise-partition — une ligne par son —, trouver un codage compréhensible de tous, et y marquer les durées et ce qui sonne "
          + "en même temps.", "L'enseignant fixe les contraintes : le nombre de groupes d'instruments, les notions, les codages obligatoires ; il favorise l'entraide."),
        ph("Un trait, une seconde", "10 min", "Lire les partitions : quand chaque trait vaut une seconde, la partition devient une frise qu'on peut compter.",
          "La séance peut s'interrompre et reprendre au fil du projet."),
      ]),
    seance("Mesurer les durées pour jouer",
      sauront("dire pourquoi il faut mesurer les durées, et choisir l'outil qui mesure les secondes."), 45, [
        ph("Le chef d'orchestre se trompe", "10 min", "L'enseignant joue les partitions en amplifiant ce qui manque — les durées oubliées, un passage trop rapide : "
          + "la valise sonore n'est plus harmonieuse. Il faut mesurer."),
        ph("Quel outil ?", "20 min", "Sablier, clepsydre, horloge, réveil, téléphone, chronomètre, métronome, cadran solaire, montre : on essaie ceux qu'on a, on dit ce qui "
          + "empêche, on trouve celui qui mesure les secondes.", "Les élèves émettent des hypothèses sur l'usage qui convient à chaque outil."),
        ph("Jouer et enregistrer", "15 min", "Des codages précis choisis ensemble ; la partition est jouée et enregistrée, en lien avec l'éducation musicale."),
      ]),
  ],
};

// Histoire, CE1 — sans durée imposée.

const PASSE_PROCHE_CE1: Demarche = {
  id: "passe-proche-lointain-ce1", nom: "Du passé proche au passé lointain (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment situer des évènements dans le passé ? » Le lexique du temps — hier, autrefois, il y a dix jours, dix ans, cent ans — ; "
    + "des évènements récents et des évènements plus anciens sur une frise graduée ; les années, les décennies, les siècles, les millénaires.",
  seances: [
    etape("Hier et autrefois", "employer le lexique relatif au temps : hier, autrefois, il y a…",
      "Hier, c'est loin ? Et autrefois ?",
      "Trier des photographies, des objets d'aujourd'hui et d'autrefois ; dire de quand ils datent avec les mots du temps.",
      "Les mots : hier, autrefois, il y a dix jours, il y a dix ans, il y a cent ans."),
    etape("Des années aux millénaires", "dire ce que sont une année, une décennie, un siècle, un millénaire.",
      "Dix ans, cent ans, mille ans : comment le dire ?",
      "Construire les unités : dix années font une décennie, cent années un siècle, mille années un millénaire ; les compter sur une bande graduée.",
      "Année, décennie, siècle, millénaire."),
    etape("La frise de cent ans", "positionner sur une frise des évènements récents et des évènements plus anciens.",
      "Qu'est-ce qui est arrivé il y a peu ? Il y a longtemps ?",
      "Sur une frise de cent ans graduée en décennies, placer des évènements proches de la vie de l'élève et d'autres plus anciens.",
      "Le passé proche, le passé lointain : la frise les met en ordre."),
    etape("Plus loin encore", "situer un objet ou un monument très ancien par rapport à aujourd'hui.",
      "Ce château, cette église, ce pont : de quand datent-ils ?",
      "Chercher l'âge d'un monument proche de l'école ; comparer avec la frise de cent ans : il faut une frise plus longue.",
      "Des siècles, des millénaires : le temps long."),
    evaluation("employer les mots du temps et placer des évènements proches et lointains sur une frise", "La frise de la classe s'allonge."),
  ],
};

const GRANDES_PERIODES_CE1: Demarche = {
  id: "grandes-periodes-ce1", nom: "Les grandes périodes de l'histoire (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment les hommes et les femmes construisent-ils des repères temporels pour situer des évènements dans un temps historique ? » "
    + "Une première représentation du temps long ; les cinq grandes périodes, par convention en Europe — Préhistoire, Antiquité, Moyen Âge, "
    + "Temps modernes, époque contemporaine — ; une ou deux figures, femme ou homme, par période.",
  seances: [
    etape("Un temps très long", "se représenter un temps très long et comprendre qu'on le découpe pour s'y repérer.",
      "Comment ranger tout le passé, depuis les premiers êtres humains ?",
      "Dérouler une longue bande : où placer les premiers êtres humains, les châteaux forts, nos grands-parents ? On découpe le temps en périodes.",
      "Le temps long ; les historiens le découpent en grandes périodes."),
    etape("Les cinq grandes périodes", "repérer et nommer les grandes périodes de l'histoire, et leurs dates de début et de fin.",
      "Quelles sont les grandes périodes ? Où commencent-elles ?",
      "Compléter la frise des grandes périodes : leur nom, leurs dates, par convention en Europe.",
      "Préhistoire, Antiquité, Moyen Âge, Temps modernes, époque contemporaine."),
    etape("Des figures de chaque période", "situer sur la frise des figures de chaque période historique.",
      "Qui a vécu au Moyen Âge ? À l'époque contemporaine ?",
      "Des récits, des images : une ou deux figures, femme ou homme, par période ; les placer sur la frise.",
      "Une figure, une période : la frise se peuple.", "Une attention particulière aux femmes."),
    etape("Mémoriser la frise", "retrouver de mémoire l'ordre des périodes et la place des figures.",
      "Sans regarder : quelle période vient après l'Antiquité ?",
      "Jeux de repérage sur la frise : avant, après, dans quelle période ; replacer des étiquettes mélangées.",
      "La frise, au mur, se relit souvent."),
    evaluation("repérer les grandes périodes sur une frise et y situer des figures", "La frise des périodes reste au mur jusqu'au CE2."),
  ],
};

const TRACES_PASSE_CE1: Demarche = {
  id: "traces-passe-ce1", nom: "Les traces du passé (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment connait-on le passé ? » Le passé laisse des traces — fossiles, ossements, grottes, ruines, monuments, objets, écrits, "
    + "images, œuvres d'art, témoignages — autour de l'école et dans les documents ; on les identifie, on les situe dans le temps ; les "
    + "métiers d'archéologue, d'archiviste, d'historien et d'historienne.",
  seances: [
    etape("Comment connait-on le passé ?", "dire que le passé laisse des traces.",
      "Comment sait-on comment on vivait autrefois ?",
      "Ce que les élèves en pensent ; une trace de l'environnement proche — un monument, une plaque, un vieil objet — : qu'est-ce qu'elle nous apprend ?",
      "Le passé laisse des traces : on les étudie pour le connaitre."),
    etape("Toutes sortes de traces", "identifier des traces du passé de natures différentes.",
      "Un fossile, une ruine, une lettre, un tableau : sont-ce des traces du passé ?",
      "Trier des documents : fossiles, ossements, grottes, ruines, monuments, objets, écrits, images, œuvres d'art, témoignages.",
      "Les traces du passé, et leur nom."),
    etape("Situer les traces dans le temps", "situer des traces du passé sur la frise des grandes périodes.",
      "De quelle période vient cette trace ?",
      "Placer des traces sur la frise des grandes périodes, en s'aidant des indices qu'elles donnent.",
      "Chaque trace a sa place dans le temps."),
    etape("Ceux qui étudient le passé", "dire ce que font l'archéologue, l'archiviste, l'historien et l'historienne.",
      "Qui cherche les traces ? Qui les étudie ?",
      "Des documents, une vidéo, une visite : fouiller, conserver, lire les archives, raconter le passé.",
      "Archéologue, archiviste, historien, historienne."),
    evaluation("identifier des traces du passé et les situer dans le temps", "La frise s'enrichit des traces étudiées."),
  ],
};

// Histoire, CE2 — l'ordre et les périodes que le programme recommande.

const PREHISTOIRE_CE2: Demarche = {
  id: "prehistoire-ce2", nom: "Paléolithique et Néolithique (CE2, période 1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les évolutions des modes de vie à la Préhistoire ? » Le mode de vie nomade des chasseurs-cueilleurs au Paléolithique, "
    + "l'art pariétal ; le mode de vie sédentaire au Néolithique — agriculture, élevage, premiers métaux. Repères : la naissance de "
    + "l'agriculture vers 10 000 – 9000 av. J.-C., Ötzi en 3200 av. J.-C., l'écriture vers 3000 av. J.-C., un site préhistorique en France.",
  seances: [
    etape("Avant l'écriture", "situer la Préhistoire sur la frise et dire qu'on la connait par des traces.",
      "Comment connait-on des gens qui n'écrivaient pas ?",
      "Revenir à la frise des grandes périodes ; des traces de la Préhistoire : outils, ossements, peintures.",
      "La Préhistoire : avant l'écriture, connue par les traces."),
    etape("Des chasseurs-cueilleurs nomades", "décrire le mode de vie des chasseurs-cueilleurs au Paléolithique.",
      "Comment vivaient les premiers êtres humains ?",
      "Des documents : se nourrir (chasse, pêche, cueillette), s'abriter, se déplacer en suivant les animaux, fabriquer des outils.",
      "Le Paléolithique : des chasseurs-cueilleurs nomades."),
    etape("L'art des grottes", "décrire une peinture pariétale ou une gravure rupestre.",
      "Que nous disent les peintures des grottes ?",
      "Observer une peinture pariétale d'un site français : ce qu'elle montre, comment elle a été faite, où.",
      "L'art pariétal, l'art rupestre ; un site archéologique en France."),
    etape("Les premiers agriculteurs", "décrire le mode de vie sédentaire au Néolithique.",
      "Pourquoi les êtres humains se sont-ils installés ?",
      "Des documents : cultiver, élever, construire des villages, faire des poteries, utiliser les premiers métaux.",
      "Le Néolithique : des agriculteurs sédentaires."),
    etape("Ce qui a changé", "expliquer les différences de mode de vie entre le Paléolithique et le Néolithique.",
      "Qu'est-ce qui a changé entre les deux ?",
      "Un tableau à deux colonnes : se nourrir, s'abriter, se déplacer, fabriquer ; placer les repères sur la frise — l'agriculture, Ötzi, l'écriture.",
      "Nomadisme et sédentarité ; les repères de la Préhistoire."),
    evaluation("décrire et comparer les modes de vie du Paléolithique et du Néolithique, et situer les repères", "La frise de la Préhistoire, au mur."),
  ],
};

const ROME_CE2: Demarche = {
  id: "rome-gaule-ce2", nom: "Vivre à Rome et en Gaule romaine (CE2, périodes 2 et 3)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment vivait-on à Rome et dans l'empire ? » La vie quotidienne à Rome — se loger, se nourrir, se déplacer, se divertir — ; "
    + "une société hiérarchisée ; l'empire à son apogée et la Gaule dans l'empire ; la Gaule romaine, qui mêle les cultures gauloise et romaine. "
    + "Repères : Alésia en 52 av. J.-C., le règne d'Auguste, un site gallo-romain.",
  seances: [
    etape("Rome et son empire", "repérer sur une carte l'étendue de l'empire romain à son apogée, et y localiser la Gaule.",
      "Jusqu'où s'étendait l'empire romain ?",
      "Sur une carte, colorier l'empire à son apogée autour de la Méditerranée ; situer Rome, puis la Gaule.",
      "L'empire romain à son apogée ; la Gaule dans l'empire."),
    etape("Se loger et se nourrir à Rome", "décrire la vie quotidienne des habitants de Rome : se loger, se nourrir.",
      "Comment vivaient les habitantes et les habitants de Rome ?",
      "Des documents : la maison des riches et les immeubles des pauvres, les repas, le marché.",
      "Vivre à Rome : des façons de vivre très différentes."),
    etape("Se déplacer et se divertir", "décrire comment on se déplaçait et se divertissait à Rome.",
      "Que faisait-on à Rome pour se divertir ?",
      "Des documents : les voies, les thermes, l'amphithéâtre, les jeux, le théâtre.",
      "Thermes, amphithéâtre : des lieux de vie commune."),
    etape("Des monuments et leur usage", "définir l'usage d'un monument ou d'un aménagement caractéristique de Rome.",
      "À quoi servaient le forum, le temple, l'aqueduc ?",
      "Associer chaque monument à son usage : forum, temple, aqueduc, thermes, amphithéâtre, palais, villa.",
      "Les monuments de Rome et leur usage."),
    etape("Une société hiérarchisée", "dire que la société romaine est hiérarchisée.",
      "Tous les habitants de Rome avaient-ils les mêmes droits ?",
      "Des documents : les citoyens, les femmes, les esclaves, les étrangers ; ce que chacun peut faire ou non.",
      "Une société inégale : des hommes, des femmes, des esclaves, des étrangers."),
    etape("La Gaule romaine", "expliquer que le monde gallo-romain mêle les cultures gauloise et romaine.",
      "Que devient la Gaule après Alésia ?",
      "Le siège d'Alésia en 52 av. J.-C. ; un site gallo-romain : ce qui est romain, ce qui reste gaulois ; placer les repères sur la frise.",
      "Gallo-romain : un mélange de cultures. Alésia, Auguste sur la frise."),
    evaluation("localiser l'empire et la Gaule, dire l'usage de monuments, expliquer ce qu'est la Gaule romaine", "Les repères rejoignent la frise de la classe."),
  ],
};

const ROYAUME_CE2: Demarche = {
  id: "royaume-france-ce2", nom: "La construction du royaume de France (CE2, périodes 4 et 5)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment les Capétiens et les Valois ont-ils construit le royaume de France ? » Les grandes étapes de la construction du royaume, "
    + "sur des cartes ; le sacre ; les moyens d'affirmer l'autorité du roi — impôt, monnaie, guerre — ; les dynasties, quelques rois et de "
    + "grandes figures féminines. Repères : l'élection d'Hugues Capet en 987, la guerre de Cent Ans aux XIVe et XVe siècles.",
  seances: [
    etape("Un roi élu", "situer l'élection d'Hugues Capet et le petit domaine royal sur une carte.",
      "Comment Hugues Capet devient-il roi en 987 ?",
      "Un récit ; une carte du royaume vers l'an mil : le domaine du roi, petit, au milieu des grands seigneurs.",
      "987 : l'élection d'Hugues Capet ; les Capétiens."),
    etape("Le royaume s'agrandit", "repérer les grandes étapes de la construction du royaume de France à partir de cartes.",
      "Comment le domaine du roi grandit-il ?",
      "Comparer des cartes successives du domaine royal : par la guerre, les mariages, les héritages, les achats.",
      "Les grandes étapes de la construction du royaume."),
    etape("Le sacre", "décrire la cérémonie du sacre.",
      "Pourquoi le roi est-il sacré ?",
      "Une enluminure, un récit : la cathédrale de Reims, l'onction, la couronne, les objets du sacre.",
      "Le sacre : le roi tient son pouvoir de Dieu."),
    etape("Affirmer son autorité", "citer les moyens utilisés par les rois de France pour affirmer leur autorité.",
      "Comment le roi se fait-il obéir dans tout le royaume ?",
      "Des documents : l'impôt, la monnaie royale, l'armée et la guerre, la justice, les officiers du roi.",
      "Impôt, monnaie, guerre : les moyens du roi."),
    etape("Rois et reines", "nommer et situer sur une frise les dynasties royales, quelques rois et quelques grandes figures féminines.",
      "Qui a régné ? Qui a gouverné aux côtés des rois ?",
      "Des récits : Philippe Auguste, Aliénor d'Aquitaine, Blanche de Castille ; les placer, avec les Capétiens et les Valois, sur la frise.",
      "Dynastie : Capétiens, puis Valois.", "Une attention particulière aux femmes."),
    etape("La guerre de Cent Ans", "situer la guerre de Cent Ans et dire ce qu'elle change pour le royaume.",
      "Pourquoi une guerre si longue ?",
      "Un récit et une carte : le royaume disputé aux XIVe et XVe siècles ; la fin de la guerre.",
      "La guerre de Cent Ans : XIVe et XVe siècles."),
    evaluation("décrire le sacre, citer les moyens du roi, situer les dynasties et les repères sur la frise", "La frise de la classe arrive à la fin du Moyen Âge."),
  ],
};

// Géographie, CP — des clés pour se repérer.

const ECOLE_QUARTIER_CP: Demarche = {
  id: "ecole-quartier-cp", nom: "Autour de l'école : l'école, le quartier, un trajet (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Comment se repérer dans la classe, dans l'école et dans son espace proche ? » Après la classe, l'école : ses lieux et leur usage, "
    + "s'y déplacer avec un plan ; autour de l'école, les repères du quartier ou de la commune ; un trajet, décrit et représenté. Les mots "
    + "pour se positionner : à gauche, à droite, devant, derrière, à côté.",
  seances: [
    etape("Les lieux de l'école", "nommer les lieux de l'école et décrire leur usage.",
      "Que trouve-t-on dans notre école ? À quoi sert chaque lieu ?",
      "Visiter l'école, photographier ses lieux — la cour, les couloirs, les sanitaires, le réfectoire, le portail — ; dire à quoi chacun sert.",
      "Les lieux de l'école et leur usage."),
    etape("Le plan de l'école", "se repérer et se déplacer dans l'école en utilisant un plan.",
      "Comment trouver son chemin dans l'école avec un plan ?",
      "Situer les photographies sur le plan de l'école ; un jeu de piste : suivre sur le plan, puis dans l'école.",
      "Le plan : l'école vue de dessus. À gauche, à droite, devant, derrière."),
    etape("Autour de l'école", "identifier des repères autour de l'école.",
      "Qu'y a-t-il autour de l'école ?",
      "Une sortie : repérer les carrefours, les commerces, les bâtiments publics, les panneaux ; les photographier ; les situer sur un plan du quartier.",
      "Les repères du quartier ou de la commune."),
    etape("Un trajet", "décrire et représenter un trajet entre un lieu proche et l'école.",
      "Comment aller de l'école au gymnase, à la mairie, à la bibliothèque ?",
      "Décrire un trajet avec ses repères et les mots de position ; le tracer sur le plan du quartier.",
      "Un trajet : un départ, des repères, une arrivée."),
    evaluation("lire le plan de l'école, nommer ses lieux et décrire un trajet", "Le plan du quartier reste affiché."),
  ],
};

const REPRESENTATIONS_MONDE_CP: Demarche = {
  id: "representations-monde-cp", nom: "Des représentations du monde (CP)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quels sont les principaux repères à l'échelle mondiale ? » Les terres émergées et les océans sur le globe ; passer du globe "
    + "au planisphère, et pourquoi ; les continents et les océans — Atlantique, Pacifique, Indien — ; le nord, le sud, l'est, l'ouest ; la "
    + "France, hexagonale et ultramarine ; le monde est peuplé : les grands foyers de peuplement.",
  seances: [
    etape("Le globe", "distinguer les terres émergées et les océans sur un globe, et comprendre que les océans se rejoignent.",
      "Qu'y a-t-il sur la Terre ? Plus de terres ou plus d'eau ?",
      "Manipuler un globe : les terres, les océans ; suivre du doigt un océan jusqu'à un autre.",
      "Les terres émergées, les océans, qui se rejoignent."),
    etape("Du globe au planisphère", "reconnaitre un planisphère et dire pourquoi on passe du globe au planisphère.",
      "Comment voir toute la Terre d'un coup ?",
      "Comparer le globe et le planisphère : ce qu'on voit, ce qui est déformé ; pourquoi le planisphère se range et s'affiche.",
      "Le planisphère : la Terre à plat."),
    etape("Continents et océans", "reconnaitre et localiser les continents et les océans sur un planisphère.",
      "Comment s'appellent les continents ? les océans ?",
      "Placer les étiquettes des continents et des océans sur le planisphère et sur le globe ; le nord, le sud, l'est, l'ouest.",
      "Les continents ; les océans Atlantique, Pacifique, Indien ; les points cardinaux."),
    etape("La France dans le monde", "situer la France, hexagonale et ultramarine.",
      "Où est la France sur le planisphère ?",
      "Situer la France hexagonale et les territoires d'outre-mer sur le planisphère et sur le globe.",
      "La France, hexagonale et ultramarine."),
    etape("Le monde est peuplé", "localiser les grands foyers de peuplement.",
      "Où vivent la plupart des êtres humains ?",
      "Comparer une carte de la population et le planisphère : où les êtres humains sont nombreux, où ils sont rares.",
      "Les grands foyers de peuplement."),
    evaluation("reconnaitre un planisphère, localiser les continents, les océans et la France", "Le planisphère de la classe accompagne toute l'année."),
  ],
};

// Géographie, CE1 — où vivent les êtres humains ?

const TERRE_PEUPLEE_CE1: Demarche = {
  id: "terre-peuplee-ce1", nom: "La Terre est peuplée (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Où les êtres humains vivent-ils dans le monde ? » Les grands foyers de peuplement, remobilisés depuis le CP ; les principales villes "
    + "du monde — une ville très peuplée de chaque continent — ; la différence entre ville et campagne, par les paysages.",
  seances: [
    etape("Les grands foyers de peuplement", "localiser les grands foyers de peuplement sur un planisphère.",
      "Où les êtres humains sont-ils les plus nombreux ?",
      "Remobiliser le planisphère du CP ; une carte de la population : colorier les grands foyers.",
      "Les grands foyers de peuplement : de fortes densités."),
    etape("De grandes villes dans le monde", "mémoriser et localiser une ville très peuplée de chaque continent.",
      "Quelles sont les plus grandes villes du monde ?",
      "Des photographies de grandes villes ; placer leurs étiquettes sur le planisphère, une par continent.",
      "Une ville très peuplée de chaque continent."),
    etape("Ville ou village ?", "expliquer la différence entre ville et village à partir de paysages.",
      "À quoi reconnait-on une ville ? un village ?",
      "Lire des paysages de ville, de village, de campagne : les bâtiments, les rues, les champs, les habitants.",
      "Ville, village, campagne."),
    evaluation("localiser les foyers de peuplement et des grandes villes, et expliquer la différence entre ville et village", "Les villes rejoignent le planisphère de la classe."),
  ],
};

const LIEUX_DE_VIE_CE1: Demarche = {
  id: "lieux-de-vie-ce1", nom: "Découvrir les lieux où vivent les êtres humains (CE1)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les caractéristiques principales des lieux de vie des êtres humains ? » Lire un paysage — premier plan, arrière-plan — ; "
    + "les trois grandes zones climatiques ; les forêts, les prairies, les déserts ; les montagnes, les plaines, les plateaux et les vallées ; "
    + "les fleuves et les rivières ; des milieux différents, où vivent des êtres humains.",
  seances: [
    etape("Lire un paysage", "décrire un paysage à partir d'une photographie ou d'une observation directe.",
      "Que voit-on sur cette photographie ?",
      "Observer un paysage : le premier plan, l'arrière-plan, ce que la nature a fait, ce que les êtres humains ont construit ; le dessiner.",
      "Premier plan, arrière-plan : décrire un paysage."),
    etape("Climat et météo", "caractériser et localiser les trois grandes zones climatiques.",
      "Fait-il chaud partout sur la Terre ?",
      "Distinguer la météo du jour et le climat ; colorier sur le planisphère la zone tropicale, la zone tempérée, la zone froide ; y placer les territoires français.",
      "Zone tropicale, zone tempérée, zone froide."),
    etape("Forêts, prairies, déserts", "reconnaitre une forêt tempérée et une forêt tropicale, un désert chaud et un désert froid, une prairie et une savane.",
      "Toutes les forêts se ressemblent-elles ?",
      "Comparer des paysages ; localiser la forêt amazonienne, celle du bassin du Congo, la forêt indonésienne, une forêt proche ; le Sahara et l'Antarctique.",
      "Les grands types de végétation, et où ils sont."),
    etape("Montagnes, plaines, plateaux, vallées", "caractériser les types de relief et localiser les grandes chaines de montagne.",
      "Comment le sol de la Terre est-il fait ?",
      "Une maquette ou des photographies : montagne, plaine, plateau, vallée ; localiser les Andes, les Alpes, l'Atlas, l'Himalaya, les Rocheuses.",
      "Les reliefs ; cinq massifs montagneux."),
    etape("Fleuves et rivières", "dire la différence entre un fleuve et une rivière, et localiser quelques grands fleuves.",
      "Où va l'eau d'une rivière ?",
      "Suivre une rivière jusqu'au fleuve, et le fleuve jusqu'à la mer ; localiser l'Amazone, le Mississippi, le Nil, et un fleuve proche.",
      "Une rivière se jette dans une rivière ou dans un fleuve ; un fleuve, dans la mer."),
    etape("Des milieux différents", "comprendre que les êtres humains vivent dans des milieux différents.",
      "Peut-on vivre partout ?",
      "Comparer des paysages habités de chaque zone : comment on s'y loge, comment on s'y déplace, comment on s'y nourrit.",
      "Des êtres humains vivent dans des milieux très différents."),
    evaluation("caractériser et localiser les zones climatiques, les végétations, les reliefs et les grands fleuves, et décrire un paysage", "Les repères rejoignent le planisphère."),
  ],
};

// Géographie, CE2 — vivre en France.

const POPULATION_FRANCE_CE2: Demarche = {
  id: "population-france-ce2", nom: "L'inégale répartition de la population en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Où vit la population en France ? » Sur une carte de France : les espaces de fortes et de faibles densités ; les cinq premières "
    + "agglomérations et, le cas échéant, celle qui est proche de l'école ; les grands massifs et les grands fleuves, hexagonaux et ultramarins.",
  seances: [
    etape("Où vit-on en France ?", "localiser sur une carte de France les espaces de fortes et de faibles densités.",
      "Les Français vivent-ils partout de la même façon ?",
      "Lire une carte des densités : où l'on est nombreux, où l'on est peu ; colorier, avec une légende.",
      "Fortes densités, faibles densités : la population est inégalement répartie."),
    etape("Les grandes agglomérations", "localiser et nommer les cinq principales agglomérations, et celle qui est proche de l'école.",
      "Quelles sont les plus grandes villes de France ?",
      "Placer les cinq premières agglomérations sur la carte de France, et la plus proche de l'école.",
      "Les cinq premières agglomérations de France."),
    etape("Montagnes et fleuves de France", "localiser et nommer les grandes chaines de montagne et quelques grands fleuves de France.",
      "Où sont les montagnes et les fleuves de France ?",
      "Placer les Alpes, la Corse, le Jura, le Massif central, les Pyrénées, les Vosges, un massif ultramarin ; la Garonne, la Loire, le Maroni, le Rhin, le Rhône, la Seine.",
      "Les massifs et les fleuves de France."),
    evaluation("localiser sur une carte de France les densités, les agglomérations, les massifs et les fleuves", "La carte de France reste affichée."),
  ],
};

const SE_LOGER_CE2: Demarche = {
  id: "se-loger-ce2", nom: "Se loger en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les principales caractéristiques des espaces résidentiels en France ? » Reconnaitre et décrire les éléments des "
    + "espaces résidentiels, par leurs paysages : un centre-ville historique, un quartier récent d'habitation, un grand ensemble, un "
    + "lotissement pavillonnaire, un village.",
  seances: [
    etape("Où habitons-nous ?", "décrire l'espace résidentiel où ils habitent.",
      "À quoi ressemble le lieu où nous habitons ?",
      "Ce que les élèves en disent ; des photographies du quartier ou du village : immeubles, maisons, rues, commerces, espaces verts.",
      "Les éléments d'un espace résidentiel."),
    etape("Le centre-ville historique et le village", "reconnaitre et décrire un centre-ville historique et un village.",
      "Qu'est-ce qui rend un centre-ville ancien, un village, reconnaissables ?",
      "Lire deux paysages : les bâtiments anciens, les rues étroites, la place, l'église, les commerces ; le village et sa campagne.",
      "Centre-ville historique, village."),
    etape("Le grand ensemble et le quartier récent", "reconnaitre et décrire un grand ensemble et un quartier récent d'habitation.",
      "Pourquoi de si grands immeubles ?",
      "Lire deux paysages : les tours et les barres, les espaces verts, les parkings ; un quartier récent et ses logements.",
      "Grand ensemble, quartier récent d'habitation."),
    etape("Le lotissement pavillonnaire", "reconnaitre et décrire un lotissement pavillonnaire.",
      "Toutes ces maisons qui se ressemblent : où est-ce ?",
      "Lire un paysage : les maisons individuelles, les jardins, les rues en boucle, loin du centre.",
      "Lotissement pavillonnaire."),
    etape("Comparer les espaces résidentiels", "comparer les paysages résidentiels et les reconnaitre.",
      "Comment reconnaitre chaque espace résidentiel ?",
      "Trier des photographies ; faire le croquis d'un paysage avec sa légende.",
      "Cinq paysages résidentiels, leurs éléments."),
    evaluation("reconnaitre et décrire les éléments d'un espace résidentiel", "Les paysages restent affichés."),
  ],
};

const TRAVAILLER_CE2: Demarche = {
  id: "travailler-ce2", nom: "Travailler en France (CE2)", famille: "Sciences, histoire, EMC", source: PROGRAMME,
  resume: "« Quelles sont les principales caractéristiques paysagères des activités en France ? » Reconnaitre et décrire un paysage industriel, "
    + "agricole, d'activité commerciale, de quartier d'affaires, de station touristique — littorale ou de montagne.",
  seances: [
    etape("Où travaille-t-on ?", "dire que les activités marquent les paysages.",
      "Où travaillent les adultes autour de nous ?",
      "Ce que les élèves en savent ; des photographies de lieux de travail : qu'y fait-on ?",
      "Les activités laissent leur marque dans les paysages."),
    etape("Les paysages agricoles", "reconnaitre et décrire un paysage agricole.",
      "Qu'est-ce qu'une exploitation agricole ?",
      "Lire un paysage : les champs, les prés, la ferme, les serres, les machines.",
      "Paysage agricole, exploitation agricole."),
    etape("Les paysages industriels", "reconnaitre et décrire un paysage industriel.",
      "Que fabrique-t-on dans une usine ?",
      "Lire un paysage : l'usine, les entrepôts, les routes, la voie ferrée, le port.",
      "Paysage industriel, usine."),
    etape("Commerces et bureaux", "reconnaitre et décrire un paysage d'activité commerciale et un quartier d'affaires.",
      "Où fait-on ses courses ? Où sont les bureaux ?",
      "Lire deux paysages : le centre commercial et son parking ; les tours de bureaux.",
      "Activité commerciale, quartier d'affaires."),
    etape("Les stations touristiques", "reconnaitre et décrire une station touristique, littorale ou de montagne.",
      "Pourquoi tant d'hôtels au même endroit ?",
      "Lire un paysage : la plage ou les pistes, les hôtels, les commerces, les remontées mécaniques.",
      "Station touristique, littorale ou de montagne."),
    evaluation("reconnaitre et décrire les paysages des activités", "Les paysages restent affichés."),
  ],
};

export const DEMARCHES_HISTOIRE_GEO: Demarche[] = [
  TEMPS_NATUREL_CP, TEMPS_REPRESENTE_CP, SITUER_EVENEMENTS_CP, PETITE_SIRENE_CP, PASSE_PROCHE_CE1, GRANDES_PERIODES_CE1, TRACES_PASSE_CE1,
  PREHISTOIRE_CE2, ROME_CE2, ROYAUME_CE2,
  LA_CLASSE, ECOLE_QUARTIER_CP, REPRESENTATIONS_MONDE_CP, TERRE_PEUPLEE_CE1, LIEUX_DE_VIE_CE1, POPULATION_FRANCE_CE2, SE_LOGER_CE2, TRAVAILLER_CE2,
  LION_A_PARIS_CE1, QUARTIER_VILLAGE_CE2, MARCHES_CE1, TRANSPORTS_CE2,
];

/**
 * La séquence d'une compétence d'histoire-géographie, à sa classe ; rien
 * quand Éduscol n'en propose pas (la démarche d'enquête générale la prend).
 * Les intitulés arrivent en minuscules, sans accents.
 */
export function demarcheHistoireGeo(classe: string, sd: string, cg: string, comp: string): string | null {
  const histoire = /histoire/.test(sd), geographie = /geographie/.test(sd);
  const theme = (motif: RegExp) => motif.test(cg);
  if (histoire) {
    if (classe === "cp") {
      if (theme(/manifestations naturelles/)) return TEMPS_NATUREL_CP.id;
      if (theme(/representations humaines du temps/)) return TEMPS_REPRESENTE_CP.id;
      if (theme(/situer des evenements/)) return SITUER_EVENEMENTS_CP.id;
    }
    if (classe === "ce1") {
      if (theme(/passe proche/)) return PASSE_PROCHE_CE1.id;
      if (theme(/grandes periodes/)) return GRANDES_PERIODES_CE1.id;
      if (theme(/traces du passe/)) return TRACES_PASSE_CE1.id;
    }
    if (classe === "ce2") {
      if (theme(/paleolithique|neolithique/)) return PREHISTOIRE_CE2.id;
      if (theme(/rome|gaule romaine/)) return ROME_CE2.id;
      if (theme(/royaume de france/)) return ROYAUME_CE2.id;
    }
  }
  if (geographie) {
    if (classe === "cp") {
      // La classe, son plan, ses angles de vue : la séquence Éduscol ; l'école, le quartier, le trajet : celle du programme.
      if (theme(/autour de l.ecole/)) return /organisation de la classe|plan de la classe|angles? de vue/.test(comp) ? LA_CLASSE.id : ECOLE_QUARTIER_CP.id;
      if (theme(/representations du monde/)) return REPRESENTATIONS_MONDE_CP.id;
    }
    if (classe === "ce1") {
      if (theme(/terre est peuplee/)) return TERRE_PEUPLEE_CE1.id;
      if (theme(/lieux ou vivent/)) return LIEUX_DE_VIE_CE1.id;
    }
    if (classe === "ce2") {
      if (theme(/inegale repartition/)) return POPULATION_FRANCE_CE2.id;
      if (theme(/se loger/)) return SE_LOGER_CE2.id;
      if (theme(/travailler en france/)) return TRAVAILLER_CE2.id;
    }
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/** Une feuille de l'atelier « Le plan de la classe », avec la salle de la classe quand on la connaît. */
const planClasse = (seance: number, titre: string, feuille: FeuillePlan, plus: Partial<ReglagesPlanClasse> = {}) =>
  (ctx: ContexteFeuilles | null): FeuilleAFabriquer => {
    const r = reglagesPlanSurs({
      ...REGLAGES_PLAN_CLASSE, ...plus, feuille,
      elements: ctx?.salle?.elements ?? [], agencement: ctx?.salle?.agencement ?? "", prenoms: ctx?.prenoms ?? [],
    });
    return {
      seance, atelier: "planClasse", titre,
      fabriquer: (g) => ({ html: htmlPlanClasse(r, g), style: STYLE_FEUILLE + STYLE_PLAN_CLASSE, refaire: { planClasse: r } }),
    };
  };

const PLANS: Record<string, { feuilles: ((ctx: ContexteFeuilles | null) => FeuilleAFabriquer)[]; materiel: string[] }> = {
  [LA_CLASSE.id]: {
    feuilles: [
      planClasse(4, "Les étiquettes pour les maquettes", "etiquettes"),
      planClasse(5, "Le plan à coller", "symbolique"),
      planClasse(6, "Le plan de la classe, avec sa légende", "plan", { noms: false, couleurs: true }),
      planClasse(6, "La chasse au trésor", "tresor", { noms: false, couleurs: false }),
      planClasse(6, "Lire le plan de la classe — évaluation", "evaluation", { noms: false, couleurs: false }),
    ],
    materiel: [
      "Des photographies de la classe et d'autres classes de l'école ; un appareil photo ; une affiche pour la liste des éléments",
      "La liste affichée des éléments importants de la classe ; des feuilles blanches A4, des crayons de papier",
      "Du matériel pour les maquettes — boîtes, cubes, petits objets, carton — et une base par groupe",
      "Les maquettes commencées, le même matériel",
      "Les maquettes, repérées par des lettres ; le reste du matériel ; une figurine ; un appareil photo pour les vues de dessus",
      "La photographie de chaque maquette vue de dessus ; des ciseaux, de la colle, des crayons de couleur",
      "Le plan projeté ; les étiquettes de la phrase mystère, cachées avant l'arrivée des élèves ; la figurine, « Charlie »",
    ],
  },
};

/** L'année scolaire en cours : celle qui a commencé en septembre. */
function anneeScolaire(): { debut: number; mois: (periode: number) => { mois: number; annee: number } } {
  const maintenant = new Date();
  const debut = maintenant.getMonth() >= 7 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  // Le premier mois de chaque période : septembre, novembre, janvier, mars, mai.
  const MOIS_DES_PERIODES = [8, 10, 0, 2, 4];
  return {
    debut,
    mois: (periode) => {
      const mois = MOIS_DES_PERIODES[Math.min(4, Math.max(0, periode - 1))];
      return { mois, annee: mois >= 8 ? debut : debut + 1 };
    },
  };
}

/** Une feuille de l'atelier « Frises et calendriers ». */
const frise = (seance: number, titre: string, modele: ModeleFrise, aCompleter = true) => (ctx: ContexteFeuilles | null): FeuilleAFabriquer => {
  const annee = anneeScolaire();
  const { mois, annee: an } = annee.mois(ctx?.periode ?? 1);
  // Au CP, les élèves sont nés six ans avant la rentrée.
  const r = reglagesFriseSurs({ ...REGLAGES_FRISE, modele, aCompleter, mois, annee: an, naissance: annee.debut - 6 });
  return { seance, atelier: "frise", titre, fabriquer: () => ({ html: htmlFrise(r), style: STYLE_FEUILLE + STYLE_FRISE, refaire: { frise: r } }) };
};

/** Une feuille de l'atelier « Lire un paysage », avec sa photographie (voir photosPaysages), qui s'y met à l'impression. */
const paysage = (seance: number, titre: string, famille: FamillePaysage, plus: Partial<ReglagesPaysage> = {}) => (): FeuilleAFabriquer => {
  const r = reglagesPaysageSurs({ ...REGLAGES_PAYSAGE, ...plus, famille });
  return { seance, atelier: "paysage", titre, fabriquer: () => ({ html: htmlPaysage(r), style: STYLE_FEUILLE + STYLE_PAYSAGE, refaire: { paysage: r } }) };
};

/** Les étiquettes des mots-clés et des repères du thème, grandes pour le tableau et petites pour les enveloppes : l'atelier « Étiquettes ». */
const motsCles = (seance: number, theme: string, mots: string[]) => (): FeuilleAFabriquer => {
  const r = { ...REGLAGES_ETIQUETTES, pictos: false, corolle: false, titreCorolle: theme };
  return {
    seance, atelier: "etiquettes", titre: `Les mots du thème — ${theme}`,
    fabriquer: () => ({ html: htmlEtiquettes(mots.map((mot) => ({ id: null, mot })), {}, r), style: STYLE_FEUILLE + STYLE_ETIQUETTES }),
  };
};

const CONTINENTS = ["l'Afrique", "l'Amérique", "l'Antarctique", "l'Asie", "l'Europe", "l'Océanie"];
const OCEANS = ["l'océan Atlantique", "l'océan Pacifique", "l'océan Indien"];

const PLANS_DES_THEMES: Record<string, { feuilles: ((ctx: ContexteFeuilles | null) => FeuilleAFabriquer)[]; materiel: string[] }> = {
  [TEMPS_NATUREL_CP.id]: {
    feuilles: [
      frise(0, "Ma journée", "journee"),
      motsCles(1, "Le jour et la nuit", ["le globe terrestre", "le jour", "la nuit", "la rotation de la Terre", "le Soleil", "la Lune"]),
      frise(3, "L'année et les saisons", "annee"),
      frise(4, "Les saisons — évaluation", "annee"),
    ],
    materiel: [
      "Des images de ce qu'on fait le jour et la nuit", "Un globe terrestre, une lampe, une gommette ; la pénombre",
      "Des photographies d'un même lieu aux quatre saisons ; l'arbre de la cour", "La roue de l'année ; des photographies d'un lieu d'outre-mer",
      "Un globe et une lampe pour l'oral",
    ],
  },
  [TEMPS_REPRESENTE_CP.id]: {
    feuilles: [
      motsCles(0, "Les mots du temps", ["attendre", "s'ennuyer", "patienter", "bientôt", "d'abord", "juste avant", "maintenant", "aujourd'hui", "ce soir",
        "la montre", "la pendule", "le réveil", "le sablier", "la clepsydre"]),
      motsCles(3, "Mesurer le temps", ["le sablier", "la pendule", "la montre", "le réveil", "le chronomètre", "la seconde", "la minute", "l'heure"]),
      frise(4, "Ma journée", "journee"),
      frise(5, "La semaine", "semaine"),
      frise(6, "L'année", "annee"),
      frise(6, "Le calendrier du mois", "calendrier", false),
      frise(7, "La semaine — évaluation", "semaine"),
    ],
    materiel: [
      "L'album François et le temps (Christine Naumann-Villemin, éd. Kaléidoscope, 2010) ; une affiche pour classer les mots du temps",
      "L'album Le petit voleur de temps (Nathalie Minne, éd. Casterman, 2014) ; les cartes de questions des quatre ateliers, la réponse des questions fermées écrite dessus",
      "L'album Le petit voleur de temps ; le calendrier de la classe et deux personnages aimantés ; l'horloge",
      "Des outils pour mesurer le temps : sablier, réveil, montre, chronomètre, l'horloge — et, si possible, une clepsydre ou un métronome",
      "Les étiquettes des moments de la journée ; l'horloge de la classe",
      "Le calendrier, la roue des jours, une frise numérique ; le tableau pour écrire la date",
      "Le calendrier du mois, la frise des mois",
      "",
    ],
  },
  [SITUER_EVENEMENTS_CP.id]: {
    feuilles: [
      frise(2, "Le calendrier du mois", "calendrier"),
      frise(3, "Ma journée", "journee"),
      frise(4, "La frise de ma vie", "vie"),
      frise(5, "Les générations", "generations"),
    ],
    materiel: [
      "Un parcours sonore enregistré — Éduscol prend la piste 1 de « Promenade sonore dans la campagne » (L'atelier des images et des sons, Nathan), "
        + "un autre convient — ; un chronomètre, une montre ; des bandes de papier, du ruban adhésif, des ciseaux",
      "Les chemins dessinés ; deux ou trois productions choisies, affichées ou projetées ; des outils pour mesurer le temps",
      "Le calendrier de la classe, la frise des mois ; les étiquettes hier, aujourd'hui, demain ; le cahier de textes",
      "Des photographies d'une journée de classe",
      "Des photographies ou des dessins apportés par les familles, à leur gré",
      "L'arbre généalogique d'une famille d'un album ou d'une famille célèbre",
      "",
    ],
  },
  [PETITE_SIRENE_CP.id]: {
    feuilles: [
      motsCles(1, "Situer les évènements", ["avant", "après", "en même temps", "pendant", "d'abord", "ensuite", "enfin", "la durée"]),
    ],
    materiel: [
      "Un parcours sonore enregistré — Éduscol prend la piste 1 de « Promenade sonore dans la campagne » (L'atelier des images et des sons, Nathan), "
        + "un autre convient — ; un chronomètre, une montre ; des bandes de papier, du ruban adhésif, des ciseaux",
      "Les chemins dessinés ; deux ou trois productions choisies, affichées ou projetées ; des outils pour mesurer le temps",
      "Le conte de la Petite Sirène, lu et écouté avant ; des objets sonores — pailles, fouets, fourchettes, papiers, une boîte à musique — ; de quoi enregistrer",
      "Les enregistrements ; de grandes feuilles pour les frises-partitions, une ligne par son",
      "Les partitions choisies ; des outils pour mesurer le temps — sablier, réveil, montre, chronomètre, et si possible un métronome — ; de quoi enregistrer",
    ],
  },
  [PASSE_PROCHE_CE1.id]: {
    feuilles: [
      motsCles(0, "Les mots du temps", ["hier", "autrefois", "aujourd'hui", "il y a dix jours", "il y a dix ans", "il y a cent ans", "une année", "une décennie", "un siècle", "un millénaire"]),
      frise(2, "Une frise de cent ans", "tempsLong"),
      frise(4, "Une frise de cent ans — évaluation", "tempsLong"),
    ],
    materiel: [
      "Des photographies et des objets d'aujourd'hui et d'autrefois", "Une longue bande graduée", "", "Des photographies d'un monument proche", "",
    ],
  },
  [GRANDES_PERIODES_CE1.id]: {
    feuilles: [
      frise(1, "Les grandes périodes", "periodes"),
      frise(3, "Les grandes périodes, pour le mur", "periodes", false),
      frise(4, "Les grandes périodes — évaluation", "periodes"),
    ],
    materiel: ["Une longue bande de papier", "", "Des récits et des images des figures de chaque période", "", ""],
  },
  [TRACES_PASSE_CE1.id]: {
    feuilles: [
      motsCles(1, "Les traces du passé", ["des fossiles", "des ossements", "une grotte", "des ruines", "un monument", "un objet", "un écrit", "une image", "une œuvre d'art", "un témoignage",
        "l'archéologue", "l'archiviste", "l'historien", "l'historienne"]),
      frise(2, "Les grandes périodes", "periodes"),
    ],
    materiel: ["Une trace proche de l'école : photographie, objet", "Des documents de toutes sortes", "La frise des grandes périodes", "Des documents, une vidéo sur ces métiers", ""],
  },
  [PREHISTOIRE_CE2.id]: {
    feuilles: [
      frise(0, "La Préhistoire", "prehistoire"),
      motsCles(4, "La Préhistoire", ["l'agriculture", "l'art pariétal", "l'art rupestre", "le Néolithique", "le nomadisme", "le Paléolithique", "la sédentarité"]),
      frise(5, "La Préhistoire — évaluation", "prehistoire"),
    ],
    materiel: ["La frise des grandes périodes", "Des documents sur la vie des chasseurs-cueilleurs", "Une peinture pariétale d'un site français",
      "Des documents sur les premiers villages", "Un tableau à deux colonnes", ""],
  },
  [ROME_CE2.id]: {
    feuilles: [
      motsCles(0, "Rome et son empire", ["Rome", "la Gaule", "la mer Méditerranée", "l'empire romain"]),
      motsCles(3, "Les monuments de Rome", ["l'amphithéâtre", "l'aqueduc", "le forum", "le palais", "le temple", "les thermes", "la villa", "gallo-romain"]),
      frise(5, "Rome et la Gaule romaine", "rome"),
      frise(6, "Rome et la Gaule romaine — évaluation", "rome"),
    ],
    materiel: ["Une carte de l'empire à son apogée", "Des documents sur les maisons et les repas", "Des documents sur les voies, les thermes, les jeux",
      "Des images des monuments", "Des documents sur la société romaine", "Des documents sur un site gallo-romain", ""],
  },
  [ROYAUME_CE2.id]: {
    feuilles: [
      motsCles(3, "Le royaume de France", ["la dynastie", "la guerre", "l'impôt", "la monarchie", "la monnaie", "le royaume", "le sacre"]),
      frise(4, "Le royaume de France", "royaume"),
      frise(6, "Le royaume de France — évaluation", "royaume"),
    ],
    materiel: ["Une carte du royaume vers l'an mil", "Des cartes successives du domaine royal", "Une enluminure du sacre", "Des documents sur l'impôt, la monnaie, l'armée",
      "Des récits sur Philippe Auguste, Aliénor d'Aquitaine, Blanche de Castille", "Une carte de la guerre de Cent Ans", ""],
  },
  [ECOLE_QUARTIER_CP.id]: {
    feuilles: [
      motsCles(0, "Les lieux de l'école", ["la classe", "la cour de récréation", "les couloirs", "les sanitaires", "le réfectoire", "le portail", "la bibliothèque", "le gymnase"]),
      motsCles(3, "Se positionner", ["à gauche", "à droite", "au-dessus", "en dessous", "devant", "derrière", "à côté", "le plan", "la rue", "le trajet"]),
    ],
    materiel: ["Un appareil photo", "Le plan de l'école ; les photographies des lieux", "Un plan du quartier ; un appareil photo", "Le plan du quartier, des crayons de couleur", ""],
  },
  [REPRESENTATIONS_MONDE_CP.id]: {
    feuilles: [
      motsCles(2, "Continents et océans", [...CONTINENTS, ...OCEANS, "le nord", "le sud", "l'est", "l'ouest", "la France"]),
    ],
    materiel: ["Un globe terrestre", "Le globe et le planisphère de la classe", "Le planisphère et le globe", "Le planisphère, le globe ; la France et l'outre-mer",
      "Une carte de la population du monde", "Un planisphère muet"],
  },
  [TERRE_PEUPLEE_CE1.id]: {
    feuilles: [
      motsCles(1, "De grandes villes du monde", ["Tokyo (Asie)", "Lagos (Afrique)", "Mexico (Amérique)", "São Paulo (Amérique)", "Paris (Europe)", "Sydney (Océanie)"]),
      paysage(2, "Ville, village ou campagne ?", "villeVillage", { photo: "village" }),
    ],
    materiel: ["Une carte de la population du monde, le planisphère", "Des photographies de grandes villes", "Des photographies de ville, de village et de campagne", ""],
  },
  [LIEUX_DE_VIE_CE1.id]: {
    feuilles: [
      paysage(0, "Je lis un paysage", "monde", { photo: "vallee" }),
      motsCles(2, "Les repères du monde", ["la zone tropicale", "la zone tempérée", "la zone froide", "la forêt amazonienne", "la forêt du bassin du Congo",
        "la forêt indonésienne", "le Sahara", "l'Antarctique", "l'Amazone", "le Mississippi", "le Nil", "les Andes", "les Alpes", "l'Atlas", "l'Himalaya", "les Rocheuses"]),
      paysage(6, "Je lis un paysage — évaluation", "monde", { croquis: false, photo: "savane" }),
    ],
    materiel: ["Une photographie de paysage, ou une sortie", "Le planisphère, des crayons de couleur", "Des photographies de forêts, de déserts, de prairies, de savanes",
      "Des photographies de reliefs, une maquette", "Le planisphère", "Des photographies de lieux de vie", "Une photographie de paysage"],
  },
  [POPULATION_FRANCE_CE2.id]: {
    feuilles: [
      motsCles(1, "Les repères de la France", ["Paris", "Lyon", "Marseille", "Lille", "Toulouse", "les Alpes", "la Corse", "le Jura", "le Massif central", "les Pyrénées",
        "les Vosges", "la Garonne", "la Loire", "le Maroni", "le Rhin", "le Rhône", "la Seine", "forte densité", "faible densité"]),
    ],
    materiel: ["Une carte des densités de population", "Une carte de France muette", "La carte de France", ""],
  },
  [SE_LOGER_CE2.id]: {
    feuilles: [
      paysage(1, "Je lis un paysage résidentiel", "residentiel", { photo: "centre-ville" }),
      paysage(4, "Je lis un paysage résidentiel — croquis", "residentiel", { elements: false, photo: "lotissement" }),
      motsCles(4, "Se loger", ["le centre-ville", "le grand ensemble", "le lotissement pavillonnaire", "le quartier récent", "le village"]),
      paysage(5, "Je lis un paysage résidentiel — évaluation", "residentiel", { croquis: false, photo: "grand-ensemble" }),
    ],
    materiel: ["Des photographies du quartier ou du village", "Des photographies d'un centre-ville ancien et d'un village", "Des photographies d'un grand ensemble et d'un quartier récent",
      "Des photographies d'un lotissement", "Des photographies à trier", "Une photographie d'un espace résidentiel"],
  },
  [TRAVAILLER_CE2.id]: {
    feuilles: [
      paysage(1, "Je lis un paysage d'activités", "activites", { photo: "agricole" }),
      motsCles(4, "Travailler", ["l'exploitation agricole", "l'usine", "le centre commercial", "le quartier d'affaires", "la station touristique"]),
      paysage(5, "Je lis un paysage d'activités — évaluation", "activites", { croquis: false, photo: "station-littorale" }),
    ],
    materiel: ["Des photographies de lieux de travail", "Des photographies de paysages agricoles", "Des photographies de paysages industriels",
      "Des photographies d'un centre commercial et d'un quartier d'affaires", "Des photographies de stations touristiques", "Une photographie de paysage"],
  },
  [LION_A_PARIS_CE1.id]: {
    feuilles: [
      motsCles(4, "Les lieux du lion", ["la gare de Lyon", "le café de Flore", "la station de métro Châtelet", "le pont des Arts", "la Seine",
        "le Centre Georges-Pompidou (Beaubourg)", "le musée du Louvre", "la basilique du Sacré-Cœur", "la tour Eiffel", "la place Denfert-Rochereau"]),
      motsCles(7, "La ville et son plan", ["une ville", "un centre-ville", "un quartier", "un arrondissement", "un bâtiment", "une place", "un rond-point",
        "une rue", "un boulevard", "une allée", "une impasse", "un pont", "un fleuve", "un plan", "une adresse", "un itinéraire"]),
    ],
    materiel: [
      "L'album Un lion à Paris (Béatrice Alemagna, éd. Autrement Jeunesse, 2006) ; une affiche pour ce que les élèves savent de Paris, une autre "
        + "pour les noms des lieux ; le texte de l'album transcrit en quinze petits textes espacés, un par élève",
      "L'album ; par binôme, un jeu d'illustrations de l'album en petit format, une feuille A3, de la colle",
      "L'album Un lion à Paris",
      "L'album, les frises chronologiques ; la liste des lieux visités par le lion, par binôme ; la salle informatique et un site de photographies des monuments de Paris — Éduscol citait "
        + "monumentsdeparis.net, qui ne répond plus en 2026 — ; l'affiche de la première séance ; des vues de Paris, sur le site de la tour Eiffel",
      "L'album ; quelques illustrations de l'album, réduites, et les photographies des mêmes lieux, photocopiées ; les cahiers, de la colle ; le "
        + "tableau des vrais noms des lieux",
      "L'album ; un plan touristique simplifié du centre de Paris, où les monuments sont dessinés, un par élève ; le même plan projeté, avec des "
        + "cercles à déplacer à l'ordinateur",
      "Un plan plus détaillé de Paris, un par élève ; un ordinateur relié au vidéoprojecteur, un moteur de recherche et sa carte, ou cartes.gouv.fr (l'ancien Géoportail)",
      "L'album ; le plan détaillé, projeté, avec tous les lieux repérés ; des copies en noir et blanc de ce plan ; deux feuilles format affiche ; "
        + "l'album Paris Pop Up (Dominique Ehrhard, Carole Saturno, éd. Grandes Personnes, 2015)",
      "L'album ; le cahier de chaque élève, avec ses traces écrites ; les affiches, la frise, les photographies ; pour les autres pistes, les deux "
        + "plans de Paris et des photographies de monuments et de ponts",
    ],
  },
  [QUARTIER_VILLAGE_CE2.id]: {
    feuilles: [
      motsCles(9, "Le quartier et le village", ["le quartier", "la ville", "le village", "la campagne", "les habitations", "les voies de circulation",
        "les commerces", "les services", "les loisirs", "les monuments", "les espaces verts"]),
    ],
    materiel: [
      "Une fiche pour recueillir ce que chacun sait du quartier : mots-clés, phrases, croquis, dessins",
      "De quoi prendre des notes ; un appareil photo, pour une photographie par élève ; trois ou quatre photographies du quartier prises avant la "
        + "sortie, photocopiées",
      "Les photographies de la sortie, dans l'ordre où elles ont été prises ; une feuille blanche par élève, ou le cahier de travail",
      "Les représentations de la sortie ; un support durable pour le plan collectif, qui resservira",
      "Un extrait du plan cadastral du quartier par élève — cartes.gouv.fr, l'ancien Géoportail, en fournit — ; des feutres ; un vidéoprojecteur ; une petite "
        + "figurine pour ceux qui en ont besoin",
      "Quelques photographies de la sortie, réduites et photocopiées en une planche par élève ; une feuille blanche, des ciseaux, de la colle ; un "
        + "extrait de la photographie aérienne verticale du quartier par élève ; un vidéoprojecteur",
      "Le plan collectif construit au tableau ; par élève, une planche de neuf photographies de la sortie et un extrait du plan cadastral où sont "
        + "tracés les angles de vue ; un vidéoprojecteur",
      "Le plan du quartier et sa photographie aérienne ; des étiquettes à coller et une légende, préparées ; de la colle, ou un ordinateur",
      "La grille de la première séance ; la salle informatique ; des photographies du village — Panoramax ou Google Street View en donnent — et des informations "
        + "sur les sites de la mairie, de l'office de tourisme, des annuaires en ligne ; un logiciel de carte mentale en ligne — Éduscol utilise "
        + "Framindmap — et la fiche pour l'ouvrir",
      "La carte mentale du village, remise au propre et distribuée",
      "Par élève, une photographie aérienne verticale, un plan et une photographie aérienne oblique du village — cartes.gouv.fr en fournit — ; "
        + "cartes.gouv.fr, projeté, pour situer le quartier et le village",
      "Une carte et le document où placer les noms et les symboles de sa légende ; des documents sur un autre village",
    ],
  },
  [MARCHES_CE1.id]: {
    feuilles: [
      motsCles(1, "Le marché", ["des halles", "une place", "la rue", "les trottoirs", "un commerçant", "un acheteur", "un étal", "une cagette", "une vitrine",
        "un camion réfrigéré", "une balance", "une caisse enregistreuse"]),
    ],
    materiel: [
      "L'album Jean de la Lune, de Tomi Ungerer (L'École des loisirs)",
      "La sortie au marché le plus proche de l'école, préparée, ou des corpus de photographies de marchés, un différent par binôme (le document Éduscol "
        + "« Recherche coopérative d'informations ») ; la fiche Éduscol « Le marché près de chez nous »",
      "La synthèse de la séance 2, à projeter ; le planisphère de la classe, une carte du monde ; des photographies de marchés du Cambodge, de Tunisie, "
        + "du Burkina Faso et du Brésil, un pays par groupe (le document Éduscol « Les marchés dans le monde ») ; la fiche Éduscol « Les mots du marché »",
      "L'exposé du groupe sur le Cambodge ; le QCM bâti sur les questions des élèves, ou la fiche Éduscol « Le QCM » ; la vidéo du témoignage de "
        + "Mara Zahnd et sa transcription",
      "Les tableaux « Les mots du marché » complétés en séance 3 ; des débuts de phrases, pour ceux qui en ont besoin",
    ],
  },
  [TRANSPORTS_CE2.id]: {
    feuilles: [
      motsCles(0, "Les continents", ["l'Europe", "l'Afrique", "l'Asie", "l'Amérique", "l'Océanie", "l'Antarctique"]),
      motsCles(1, "Les moyens de transport en Europe", ["la voiture", "le camion", "le train", "le vélo", "la moto", "le scooter", "le bateau", "l'avion",
        "l'hélicoptère", "le bus", "la trottinette", "le camping-car", "la caravane", "le métro", "le taxi", "le tramway", "la motoneige", "le ski",
        "les chiens de traîneau", "le bus à impériale", "le voilier", "le ferry-boat", "la gondole"]),
    ],
    materiel: [
      "L'album Le génie du pousse-pousse (Jean-Côme Noguès, illustrations d'Anne Romby, Milan, 2001) ; un planisphère, une carte des continents",
      "Des dessins de chaque véhicule, choisis à l'avance ; des photographies — le métro et un scooter à Paris, des taxis à Barcelone, un bus à impériale "
        + "à Londres, une famille à vélo aux Pays-Bas, une gondole à Venise — ; la fiche Éduscol de synthèse « Les moyens de transport en Europe » ; une "
        + "carte de l'Europe ; la carte que les groupes compléteront",
      "Des ordinateurs reliés à Internet, ou le TNI ; des photographies des transports de chaque continent (l'annexe Éduscol de la séance 3) ; une carte "
        + "vierge du continent de chaque groupe ; le cahier",
      "Les cartes, les photographies et les traces écrites des groupes ; le TNI ou le tableau ; le texte qui rassemble toutes les traces écrites ; la carte "
        + "des moyens de transport les plus caractéristiques",
      "L'album ; de quoi dessiner, peindre ou coller",
    ],
  },
};

export const estUneDemarcheHistoireGeo = (id: string) => id in PLANS || id in PLANS_DES_THEMES;

export function planHistoireGeo(demarcheId: string, ctx: ContexteFeuilles | null): PlanDesFeuilles | null {
  const p = PLANS[demarcheId] ?? PLANS_DES_THEMES[demarcheId];
  if (!p) return null;
  const feuilles = p.feuilles.map((f) => f(ctx));
  const materiel = p.materiel.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    const lesFeuilles = f.length ? `${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(", ")}` : "";
    if (!debut) return lesFeuilles ? `${lesFeuilles.charAt(0).toUpperCase()}${lesFeuilles.slice(1)}.` : "";
    return lesFeuilles ? `${debut} ; ${lesFeuilles}.` : `${debut}.`;
  });
  // Les documents trouvés en ligne pour chaque séance : ce qu'on projette, ce qu'on peut imprimer.
  const documents = documentsDesSeances(demarcheId, materiel.length);
  return { feuilles, materiel, ...(documents.some(Boolean) ? { documents } : {}) };
}
