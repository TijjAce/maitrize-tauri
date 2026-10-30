// Les fractions simples, au CM1 : une séquence d'après le manuel de
// préparation au CRPE que l'enseignant a fourni dans « Adapter une fiche »
// (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon,
// maths et français » (Nathan), sujet n° 7, « Fractions simples CM1 »,
// p. 120-132.
//
// Le sujet demande la première séance d'une séquence de quatre : découvrir
// les fractions simples et introduire leur écriture (p. 120). Le manuel la
// détaille en six phases (p. 129-131), et place l'arrivée des fractions
// simples en période 1 (p. 128). Il ne détaille pas les trois autres séances :
// leurs phases sont de Maitrize, d'après ce qu'il en dit — le codage et le
// décodage sur des formes variées, la bande unité pour mesurer, les fractions
// plus grandes que l'unité (p. 126-128), la suite qu'annonce son oral
// (p. 131-132) — et d'après les attendus de fin de CM1 de son corpus (p. 123).
// La dernière évalue, comme le veut sa conclusion, la compétence « utiliser
// les fractions simples dans des activités de mesure ». La source le dit. Le
// texte du manuel n'est pas repris : ses phases sont dites ici avec nos mots,
// et ses problèmes n'ont pas de prénom.
//
// Pas de calcul mental en tête de séance : la séance du manuel n'en a pas, et
// les séquences de fractions n'en reçoivent pas d'office.
//
// À côté de la séquence « Les fractions plus grandes que 1 (CM1) »
// (cycle3Nombres.ts), bâtie sur le programme, qui part des quarts pour aller
// jusqu'à la demi-droite graduée, celle-ci fait découvrir la fraction
// elle-même.
//
// Ses feuilles viennent toutes de l'atelier « Fractions » — les segments à
// mesurer et à tracer, la bande unité, la règle graduée en quarts, les cartes,
// la course des nageurs —, à ses réglages : chacune se rouvre dans le sien.
// Les images de la première séance — bouteilles, minuteurs, verres — et ses
// problèmes de baguettes et de chocolat ne viennent d'aucun atelier : on les
// montre, ou on les écrit au tableau.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_FRACTIONS, STYLE_JEUX_MATHS, htmlFractions, type ReglagesFractions } from "./jeuxMaths";

export const ID_FRACTIONS_SIMPLES_CM1 = "fractions-simples-cm1";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

export const DEMARCHE_FRACTIONS_SIMPLES_CM1: Demarche = {
  id: ID_FRACTIONS_SIMPLES_CM1,
  nom: "Les fractions simples : partager, écrire, mesurer (CM1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 7, « Fractions simples CM1 », p. 120-132 : la séquence en quatre séances et l'objectif de la première (p. 120), `
    + "sa période (p. 128), la séance de découverte détaillée en six phases (p. 129-131) ; les phases des séances 2, 3 et 4 ajoutées par Maitrize, "
    + "d'après les connaissances didactiques du manuel (p. 124-128), les attendus de fin de CM1 de son corpus (p. 123), sa conclusion et son oral "
    + "(p. 131-132) ; programme de mathématiques du cycle 3 (2025)",
  resume: "Au CM1, en période 1 : la découverte des fractions simples. On part de ce que les élèves disent déjà — un demi-litre, un quart d'heure, "
    + "un verre à moitié plein — pour arriver à l'écriture : 3/4, ce sont trois parts d'une unité partagée en quatre parts égales. Les élèves font "
    + "eux-mêmes leurs partages — des pizzas dessinées, des formes de papier, des bandes unités pliées en deux, en quatre, en huit — et rencontrent "
    + "tout de suite des fractions plus grandes que l'unité : une pizza et demie, cinq baguettes pour quatre amis. Le travail en binôme domine, pour "
    + "confronter les représentations. Après la séance de découverte, détaillée par le manuel, on code et on décode des fractions sur des formes "
    + "variées, on mesure des longueurs avec la bande unité et la règle graduée en quarts, puis on évalue l'usage des fractions dans la mesure.",
  visee: { intitule: /représenter, écrire et lire des fractions$/i, niveaux: ["CM1"] },
  seances: [
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée.
    seance("Du demi-litre aux trois quarts : écrire une fraction",
      sauront("lire, écrire et représenter une fraction simple, plus petite ou plus grande que l'unité — trois quarts, cinq huitièmes, trois demis —, en partageant eux-mêmes l'unité en parts égales ; mesurer une longueur avec une bande unité ; dire la part de chacun quand le reste d'un partage se partage : trois baguettes pour quatre, c'est 3/4 de baguette chacun."), 50, [
        ph("Phase 1 – Collectif", "10 min", "Trois images au tableau, l'une après l'autre, pour faire dire demi et quart. Deux bouteilles : que contient chacune ? Combien de petites pour remplir la grande ? Un litre, un demi-litre. Deux minuteurs, une part en rouge : combien de temps passe ? Une demi-heure, un quart d'heure ; combien de demi-heures dans une heure, de quarts d'heure dans une heure, dans une demi-heure ? Trois verres d'eau : celui du milieu est à moitié plein — un demi-verre, et deux demi-verres font un verre — ; celui de droite en a le quart, la moitié du précédent ; celui de gauche, les trois quarts. Enfin, un verre vide au tableau et l'écriture 3/4 : un élève vient tracer le niveau de l'eau.",
          "Montre les images une à une, jamais ensemble — ou les vrais objets, si on les a : une bouteille d'un litre, une d'un demi-litre, un minuteur, trois verres d'eau. Ces mots de la vie courante ne sont pas connus de tous : repère qui se tait, le fait parler, ou le met en binôme avec un camarade qui l'aidera. Pour le verre aux trois quarts, deux démarches attendues : un trait posé au jugé, d'un coup d'œil ; ou la hauteur partagée en quatre parts égales, à vue ou en mesurant, dont on prend trois."),
        ph("Phase 2 – Collectif", "10 min", "Sur l'ardoise, un dessin après l'autre, à la demande de l'enseignant : une pizza entière ; la moitié d'une pizza ; un quart de pizza ; trois quarts de pizza. Puis une demi-pizza, qu'on écrit aussi 1/2 pizza ; puis une pizza et demie. On lève l'ardoise après chaque dessin.",
          "Ne donne aucune pizza partagée d'avance : chacun fait lui-même ses parts, et les veut égales. Fait lier les mots et l'écriture : la moitié, un demi, 1/2. Erreur attendue : des parts de tailles différentes. Une pizza et demie dépasse l'unité : il faut dessiner une deuxième pizza."),
        ph("Phase 3 – Individuel", "5 min", "Sur le cahier de brouillon, chacun dessine 5/8 d'une pizza, puis 5/4 et 3/2 d'une pizza. Un élève qui a réussi vient dessiner au tableau et explique : on partage l'unité en parts égales — huit —, on colorie les parts qu'on prend — cinq —, on écrit 5/8 de la pizza.",
          "Choisit pour le tableau un élève en réussite. Erreurs attendues : 5/4 dessiné dans une seule pizza ; trois moitiés prises sur deux pizzas et lues 3/4 — l'élève prend tout le dessin pour l'unité, et croit qu'une fraction est toujours plus petite que 1. On revient à l'unité, une pizza : pour 5/4, il en faut une deuxième. Aide : plier un disque de papier en deux, en quatre, en huit."),
        ph("Phase 4 – Binômes", "5 min", "On mesure avec une bande unité : la feuille « Mesurer des segments en quarts d'unité ». On découpe la bande unité, on la plie en deux puis en quatre, on la reporte sur chaque segment, et l'on écrit sa longueur en fraction de l'unité, comme 3/4 u ou 3/2 u.",
          "Les binômes confrontent leurs mesures et leurs façons de faire. Fait dire les deux écritures d'une longueur plus grande que l'unité : 1 u + 2/4 u, ce sont six quarts d'unité, ou trois demis — deux quarts font un demi — : 3/2 u. Pour tenir les cinq minutes, la bande unité peut être découpée d'avance ; qui n'a pas fini achève la feuille plus tard."),
        ph("Phase 5 – Binômes", "10 min", "Cinq minutes de recherche, cinq de correction. Quatre amis se partagent trois baguettes, à parts égales : quelle est la part de chacun ? Même question avec cinq baguettes.",
          "Laisse dessiner les baguettes ; des bandes de papier les figurent pour qui veut couper. On coupe chacune en quatre : chacun a trois quarts de baguette, 3/4. Avec cinq : une baguette entière chacun, puis la dernière se coupe en quatre — le reste se partage — : 5/4 = 1 + 1/4."),
        ph("Phase 6 – Binômes", "10 min", "Cinq minutes de recherche, cinq de correction. Une tablette de chocolat a 24 carrés : combien de carrés en font les trois quarts ?",
          "Pour qui en a besoin, une tablette dessinée — quatre rangées de six carrés — à partager. Un quart de la tablette, c'est 24 partagé en 4 : 6 carrés ; trois quarts, trois fois plus : 18 carrés."),
      ]),
    seance("Partager soi-même : coder et décoder",
      sauront("partager eux-mêmes en parts égales des surfaces de formes variées — disque, carré, rectangle, triangle —, écrire la fraction d'une part coloriée et représenter une fraction donnée, plus petite ou plus grande que l'unité ; nommer le numérateur et le dénominateur."), 45, [
        ph(T1, "10 min", "Au tableau, trois quarts en lettres, en chiffres — 3/4 — et en dessin. On nomme : le dénominateur, 4, dit en combien de parts égales on a partagé l'unité ; le numérateur, 3, combien de parts on prend. Puis un rectangle coupé en trois parts de tailles différentes, l'une coloriée, marquée 1/3 : est-ce un tiers ?",
          "Fait lire 3/4 « trois quarts », jamais « trois sur quatre » : longtemps, l'élève voit dans 3/4 deux nombres, et non un seul. Un tiers, c'est l'une de trois parts égales : le rectangle du tableau n'en montre pas."),
        ph(T2, "20 min", "Par deux, des formes de papier — disques, carrés, rectangles, triangles — qu'on partage soi-même, en pliant ou en traçant. Coder : l'un partage et colorie, l'autre écrit la fraction coloriée. Décoder : on tire une fraction — 1/2, 1/4, 3/4, 2/3, 5/8, 3/2, 5/4 — et on la représente sur la forme de son choix ; pour 3/2 et 5/4, une forme ne suffit pas.",
          "Varie les formes : qui n'a partagé que des disques ne sait pas forcément partager un carré ou un triangle. Les pliages en deux successifs donnent les demis, les quarts, les huitièmes ; pour les tiers, un gabarit ou un tracé mesuré. Fait vérifier dans le binôme : les parts sont-elles égales ?"),
        ph(T3, "10 min", "Ce qu'on retient, dans le cahier : une fraction s'écrit en lettres, en chiffres, en dessin ; 3/4 = 1/4 + 1/4 + 1/4. Une fraction peut dépasser l'unité : 3/2, ce sont trois demis, une unité et demie. Au tableau, deux disques coupés en deux, trois moitiés coloriées : on écrit 3/2 de disque, et non 3/4 — l'unité, c'est un disque.",
          "Le piège des deux disques : qui prend tout le dessin pour l'unité croit qu'une fraction est toujours plus petite que 1."),
        ph(T4, "5 min", "Le jeu de mémoire, par deux, avec les cartes de la feuille « Cartes des fractions — en chiffres, en lettres, en images » : une paire, c'est la même fraction sous deux formes. On y rejoue en atelier les jours suivants.",
          "Les cartes montrent des formes déjà partagées : elles viennent après les partages des élèves. Cartes face visible d'abord, pour apprendre. Deux quarts et un demi couvrent la même part du disque : on le remarque, sans en faire encore une leçon."),
      ]),
    seance("Mesurer avec la bande unité : au-delà de l'unité",
      sauront("mesurer une longueur avec une bande unité pliée en deux, en quatre, en huit, ou avec la règle graduée en quarts ; écrire cette mesure par une fraction plus petite ou plus grande que l'unité — 7/4 u, c'est 1 u + 3/4 u — ; situer une fraction entre deux entiers."), 45, [
        ph(T1, "10 min", "Les réglettes : l'orange vaut deux unités. Que valent la jaune, la blanche, la rose, la marron ? On les pose bout à bout. La jaune vaut une unité ; la blanche, un cinquième ; la rose, quatre cinquièmes ; la marron, une unité et trois cinquièmes — huit cinquièmes —, ou deux unités moins deux cinquièmes.",
          "Sans réglettes, des bandes de papier de 10, 5, 1, 4 et 8 cm. L'unité n'est pas donnée : on la cherche — deux jaunes font l'orange."),
        ph(T2, "20 min", "Par deux, une bande vierge de la feuille « Bandes unités à plier » : on la plie en deux, en quatre, en huit, on marque les plis, et l'on mesure des objets de la classe — un crayon, une gomme, un cahier. Puis la règle de la feuille « Règle graduée en quarts d'unité », collée d'avance sur du carton — une autre unité, plus petite —, pour mesurer les segments de la feuille « Mesurer des segments avec la règle ». Chaque longueur s'écrit de deux façons : 1 u + 3/4 u, ou 7/4 u.",
          "Les dénominateurs 2, 4 et 8 naissent des pliages en deux successifs. Fait compter les parts à voix haute : un quart, deux quarts… sept quarts. La règle, c'est la bande unité reportée trois fois, et graduée."),
        ph(T3, "10 min", "Ce qu'on retient : 1/4 + 1/4 + 1/4 + 1/4 + 1/4 = 5/4 ; 3 × 1/2 = 3/2. Une fraction est plus grande que 1 quand son numérateur dépasse son dénominateur : 5/4 = 1 + 1/4, entre 1 et 2. Sur la règle, chaque fraction a sa place entre deux entiers.",
          "Peu à peu, 3/4 u devient 3/4 : la mesure d'une longueur devient un nombre, qu'on situe parmi les entiers."),
        ph(T4, "5 min", "Sur l'ardoise : dix-sept baguettes pour quatre amis, à parts égales. Chacun en a quatre, et un quart de la dernière : 17/4 = 4 + 1/4 ; 17/4 est entre 4 et 5.",
          "Le reste se partage : c'est ainsi que naît une fraction plus grande que 1."),
      ]),
    seance("Évaluation et remédiations",
      sauront("utiliser seuls les fractions simples pour mesurer et tracer des longueurs ; ceux qui en ont besoin reprennent le partage de l'unité en parts égales."), 45, [
        ph("Évaluation", "25 min", "La feuille « Mesurer et tracer en quarts d'unité — évaluation » : mesurer des segments avec la bande unité ou la règle graduée en quarts, puis tracer des segments de longueur donnée, plus petits ou plus grands que l'unité.",
          "Observe sans aider : qui reporte mal la bande, qui compte les traits de la règle au lieu des parts, qui oublie l'unité entière d'une longueur plus grande que u."),
        ph("Remédiations", "20 min", "Pour qui en a besoin : plier de nouveau la bande unité et mesurer en disant les parts — un quart, deux quarts… — ; partager encore des formes de papier. Les autres : la feuille « La course des nageurs », par groupes de trois — on tire une longueur et on la trace au bout de la précédente, avec la règle ; le premier au bord a gagné. Ensuite, les fractions plus grandes que 1 et la demi-droite graduée.",
          "Reprend avec les bandes et les formes ce que l'évaluation a montré."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Une feuille de l'atelier « Fractions », à ses réglages : il la refait telle quelle, au même tirage. */
const fractions = (seance: number, titre: string, r: Partial<ReglagesFractions>): FeuilleAFabriquer => {
  const reglages: ReglagesFractions = { ...REGLAGES_FRACTIONS, ...r };
  return {
    seance, atelier: "fractions", titre,
    fabriquer: (g) => ({ html: htmlFractions(reglages, g), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { fractions: reglages } }),
  };
};

const FEUILLES: FeuilleAFabriquer[] = [
  // La séance du manuel : des segments à mesurer avec la bande unité, pliée en quatre, qui est sur la feuille.
  fractions(0, "Mesurer des segments en quarts d'unité", { materiel: ["mesurer"], graduation: 4 }),
  // Quatre formes de chaque fraction — en chiffres, en lettres, un disque, une bande — : deux paires par fraction.
  fractions(1, "Cartes des fractions — en chiffres, en lettres, en images", { materiel: ["cartes"], denominateurs: [2, 3, 4], representations: ["chiffres", "lettres", "disque", "bande"] }),
  fractions(2, "Bandes unités à plier", { materiel: ["bandes"] }),
  fractions(2, "Règle graduée en quarts d'unité", { materiel: ["regle"], graduation: 4 }),
  fractions(2, "Mesurer des segments avec la règle", { materiel: ["mesurer"], graduation: 4 }),
  fractions(3, "Mesurer et tracer en quarts d'unité — évaluation", { materiel: ["mesurer", "tracer"], graduation: 4 }),
  fractions(3, "La course des nageurs", { materiel: ["nageurs"], graduation: 4 }),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après. */
const MATERIEL = [
  "Trois images à montrer l'une après l'autre — une bouteille d'un litre et une d'un demi-litre ; deux minuteurs, sur une demi-heure et sur un quart d'heure ; "
    + "trois verres remplis aux trois quarts, à moitié, au quart —, ou les vrais objets ; un verre vide dessiné au tableau ; les ardoises et le cahier de brouillon ; "
    + "des disques de papier à plier ; des ciseaux ; des bandes de papier pour figurer les baguettes ; une tablette de 24 carrés dessinée, pour qui en a besoin",
  "Par binôme, des formes de papier à plier et à découper — disques, carrés, rectangles, triangles — et des crayons de couleur ; des étiquettes de fractions à tirer : "
    + "1/2, 1/4, 3/4, 2/3, 5/8, 3/2, 5/4 ; au tableau, un rectangle coupé en trois parts inégales et deux disques coupés en deux ; les cartes, découpées d'avance, un jeu par binôme",
  "Des réglettes Cuisenaire — ou des bandes de papier de 10, 5, 1, 4 et 8 cm — ; des objets de la classe à mesurer ; la règle graduée, découpée et collée d'avance sur du carton, une par élève ; les ardoises",
  "La règle graduée en quarts de la séance 3 ; des bandes unités et des formes de papier pour la remédiation ; une feuille A3 par groupe de trois pour la course des nageurs",
];

/** Les feuilles et le matériel de la séquence. */
export function planFractionsSimplesCm1(): PlanDesFeuilles {
  const materiel = MATERIEL.map((debut, s) => {
    const f = FEUILLES.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles: [...FEUILLES], materiel };
}
