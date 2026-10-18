// Les thèmes d'histoire et de géographie du cours moyen, et ce que leurs
// feuilles montrent (voir histoireGeoCoursMoyen.ts).
//
// Programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai 2026,
// annexe 4), à la demande de l'enseignant (octobre 2026) : pour chaque
// thème, sa question, ses repères — sur la frise —, ses mots-clés et leur
// définition, et des exercices sur ses attendus. Les documents sont écrits
// pour Maitrize, d'après le programme et les faits établis : ils le disent
// sous leur texte. Quand le programme donne un repère qu'on doit préciser —
// 1515 pour Léonard de Vinci, 2000 pour l'euro —, la séquence le dit (voir
// cycle3HistoireGeo.ts).

import type { CarteHGCM, TraitsDeCarte } from "./cartesHistoireGeo";

export type ClasseCM = "CM1" | "CM2";

/** Un repère de la frise : sa place (une année, avec ses mois en décimales), ce qu'on lit, ce qui s'est passé. */
export interface RepereCM { date: number; quand: string; quoi: string }

/** Une bande de la frise : une période ou un règne ; au rang 2, sous la première. À placer : vide sur la frise à compléter. */
export interface BandeCM { nom: string; debut: number; fin: number; couleur: string; rang?: 1 | 2; aPlacer?: boolean }

export interface FriseCM {
  titre: string;
  debut: number;
  fin: number;
  /** L'écart entre deux graduations, en années ; ou les graduations elles-mêmes. */
  pas: number;
  graduations?: { date: number; nom: string }[];
  bandes: BandeCM[];
  reperes: RepereCM[];
}

export type ExerciceHGCM =
  | { sorte: "document"; id: string; titre: string; texte: string[]; source?: string; questions: [string, string][]; rappel?: string }
  | { sorte: "trier"; id: string; titre: string; consigne: string; colonnes: string[]; items: [string, number][]; rappel?: string }
  | { sorte: "relier"; id: string; titre: string; consigne: string; paires: [string, string][]; rappel?: string }
  /** Des étapes à remettre dans l'ordre ; leurs dates, s'il y en a, ne se montrent que dans le corrigé : on ne range pas des dates. */
  | { sorte: "ordonner"; id: string; titre: string; consigne: string; etapes: string[]; dates?: string[]; rappel?: string }
  | { sorte: "tableau"; id: string; titre: string; consigne: string; entetes: string[]; lignes: string[][]; reponses?: string[][]; rappel?: string }
  /** Une carte à compléter : ses consignes, numérotées sur la feuille ; ce qu'on y met (voir cartesHistoireGeo.ts). */
  | { sorte: "carte"; id: string; titre: string; consignes: string[]; carte: CarteHGCM; rappel?: string };

export interface ThemeHGCM {
  id: string;
  classe: ClasseCM;
  histoire: boolean;
  titre: string;
  question: string;
  frise?: FriseCM;
  /** Les mots-clés du programme, et quelques mots du thème, avec leur définition. */
  motsCles: [string, string][];
  exercices: ExerciceHGCM[];
  /** Les questions de l'évaluation, à la première personne, et ce qu'on attend. */
  evaluation: [string, string][];
  /** Les lieux à localiser sur le planisphère ou la carte de la classe : leurs étiquettes. */
  lieux?: string[];
}

/** Un jour de l'année, en années décimales : le 14 juillet 1789 tombe un peu après le milieu de 1789. */
export const jour = (annee: number, mois: number, j = 1) => annee + (mois - 1 + (j - 1) / 31) / 12;

export const SOURCE_MAITRIZE = "Texte écrit pour Maitrize, d'après le programme d'histoire-géographie du cycle 3 (2026).";

const BRUN = "#e9d8c4", JAUNE = "#f6e3a1", BLEU = "#cfe0f3", VERT = "#d8ecd0", ROSE = "#f3d1d6", MAUVE = "#e3d7f0", GRIS = "#e4e7ee";

// ── Histoire, CM1 ─────────────────────────────────────────────────────────

const MOYEN_AGE: ThemeHGCM = {
  id: "moyen-age-cm1", classe: "CM1", histoire: true, titre: "La vie quotidienne au Moyen Âge (XIe – XIIIe siècles)",
  question: "Comment les femmes et les hommes vivaient-ils au Moyen Âge ?",
  frise: {
    titre: "Le Moyen Âge (476 – 1492)", debut: 300, fin: 1600, pas: 100,
    bandes: [
      { nom: "Antiquité", debut: 300, fin: 476, couleur: JAUNE },
      { nom: "Le Moyen Âge", debut: 476, fin: 1492, couleur: BLEU, aPlacer: true },
      { nom: "Temps modernes", debut: 1492, fin: 1600, couleur: VERT },
      { nom: "XIe – XIIIe siècles", debut: 1001, fin: 1300, couleur: MAUVE, rang: 2, aPlacer: true },
    ],
    reperes: [
      { date: 476, quand: "476", quoi: "La fin de l'Empire romain d'Occident : le début du Moyen Âge" },
      { date: 910, quand: "910", quoi: "La fondation de l'abbaye de Cluny" },
      { date: 1163, quand: "1163", quoi: "Le début de la construction de Notre-Dame de Paris" },
      { date: 1492, quand: "1492", quoi: "Christophe Colomb en Amérique : la fin du Moyen Âge" },
    ],
  },
  motsCles: [
    ["l'abbaye", "Un monastère dirigé par un abbé ou une abbesse, où vivent des moines ou des moniales."],
    ["l'art roman", "L'art des églises des XIe et XIIe siècles : murs épais, petites fenêtres, voûtes en berceau."],
    ["l'art gothique", "L'art des églises à partir du XIIe siècle : arcs-boutants, croisées d'ogives, grands vitraux."],
    ["la cathédrale", "L'église de l'évêque, la plus grande église d'une ville."],
    ["le château fort", "La demeure fortifiée du seigneur."],
    ["le clergé", "L'ensemble des hommes et des femmes d'Église : prêtres, moines, moniales."],
    ["la corvée", "Le travail gratuit que les paysans doivent au seigneur."],
    ["la dîme", "La part des récoltes donnée à l'Église."],
    ["l'Église, une église", "L'Église : les chrétiens et leur clergé ; une église : le bâtiment où l'on prie."],
    ["la paroisse", "Le territoire d'un prêtre et de son église."],
    ["la paysanne, le paysan", "Celle, celui qui cultive la terre et élève des animaux."],
    ["le seigneur", "Celui qui domine une seigneurie."],
    ["la seigneurie", "Le territoire d'un seigneur et les personnes qui y vivent."],
  ],
  exercices: [
    {
      sorte: "document", id: "chateau", titre: "Le château fort et la seigneurie",
      rappel: "Le château fort protège, le seigneur y vit, il montre sa puissance. La seigneurie, c'est le territoire du seigneur et les personnes qui y vivent.",
      texte: [
        "Au Moyen Âge, le seigneur domine un territoire, la seigneurie, et les personnes qui y vivent. Au centre se dresse son château fort. Bâti sur une hauteur, entouré de murailles épaisses et de fossés, il protège : en cas d'attaque, les paysans des alentours viennent s'y réfugier avec leurs bêtes.",
        "C'est aussi là que le seigneur vit avec sa famille et ses chevaliers, dans le donjon, la plus haute tour. Le château montre enfin la puissance du seigneur : on le voit de loin.",
        "Le seigneur rend la justice et lève des taxes. Les paysans travaillent gratuitement sur ses terres plusieurs jours par an : c'est la corvée. Ils lui donnent une part de leurs récoltes, et doivent payer pour utiliser son moulin, son four et son pressoir.",
      ],
      questions: [
        ["Qu'est-ce qu'une seigneurie ?", "Le territoire que domine un seigneur, avec les personnes qui y vivent."],
        ["Je cite les trois fonctions du château fort.", "Il protège ; le seigneur y vit ; il montre sa puissance."],
        ["Pourquoi le château est-il bâti sur une hauteur ?", "Pour mieux se défendre et voir venir l'ennemi ; on le voit de loin : il montre la puissance du seigneur."],
        ["Qu'est-ce que la corvée ?", "Les jours de travail gratuit que les paysans doivent sur les terres du seigneur."],
        ["Je cite deux autres obligations des paysans envers le seigneur.", "Lui donner une part des récoltes ; payer pour utiliser son moulin, son four, son pressoir."],
      ],
    },
    {
      sorte: "relier", id: "calendrier", titre: "Le calendrier des travaux des champs",
      consigne: "Je relie chaque mois au travail des paysans.",
      rappel: "Les calendriers peints ou sculptés du Moyen Âge montrent un travail pour chaque mois : toute l'année, les paysans travaillent la terre.",
      paires: [
        ["février", "couper du bois et se chauffer"], ["mars", "tailler la vigne"], ["juin", "faucher les foins"], ["juillet", "moissonner le blé"],
        ["septembre", "vendanger le raisin"], ["octobre", "labourer et semer"], ["novembre", "mener les porcs manger les glands en forêt"], ["décembre", "tuer le cochon"],
      ],
    },
    {
      sorte: "trier", id: "obligations", titre: "Qui doit quoi ?",
      consigne: "Je lis chaque obligation des paysans. Je l'écris dans la bonne colonne : envers le seigneur, ou envers l'Église.",
      rappel: "Les paysans doivent au seigneur la corvée, des taxes et une part des récoltes ; à l'Église, la dîme et la prière.",
      colonnes: ["Envers le seigneur", "Envers l'Église"],
      items: [
        ["la corvée", 0], ["une part des récoltes", 0], ["payer pour moudre son grain au moulin", 0], ["payer pour cuire son pain au four", 0], ["être jugé à son tribunal", 0],
        ["la dîme", 1], ["aller à la messe le dimanche", 1], ["faire baptiser ses enfants", 1], ["ne pas travailler les jours de fête religieuse", 1],
      ],
    },
    {
      sorte: "document", id: "ville", titre: "La ville au Moyen Âge",
      rappel: "Derrière ses remparts, la ville vit de l'artisanat et du commerce : les ateliers, le marché, les foires. Ses habitants sont les bourgeois.",
      texte: [
        "À partir du XIe siècle, les villes grandissent. Protégées par des remparts, elles attirent des paysans venus chercher du travail.",
        "Dans les rues étroites, les artisans travaillent dans leur atelier, ouvert sur la rue : on trouve la rue des boulangers, celle des tanneurs, celle des forgerons. Les artisans d'un même métier s'organisent en corporation.",
        "Chaque semaine, le marché se tient sur la place : on y vend les produits des campagnes. Plusieurs fois par an, de grandes foires réunissent des marchands venus de loin, comme les foires de Champagne, à Troyes ou à Provins. Les habitants des villes, les bourgeois, obtiennent souvent du seigneur une charte qui leur donne des libertés.",
      ],
      questions: [
        ["Qu'est-ce qui protège la ville ?", "Les remparts."],
        ["Où travaillent les artisans ?", "Dans leur atelier, ouvert sur la rue."],
        ["Quelle est la différence entre un marché et une foire ?", "Le marché a lieu chaque semaine et vend les produits des campagnes ; la foire, plusieurs fois par an, réunit des marchands venus de loin."],
        ["Comment appelle-t-on les habitants des villes ?", "Les bourgeois."],
      ],
    },
    {
      sorte: "document", id: "eglise", titre: "L'Église au cœur de la vie",
      rappel: "L'Église encadre la vie de chacun, de la naissance à la mort. Elle aide les pauvres, soigne les malades, enseigne.",
      texte: [
        "Au Moyen Âge, presque tout le monde est chrétien. La vie de chacun est rythmée par l'Église : on est baptisé à la naissance, on se marie et on est enterré dans sa paroisse ; les cloches sonnent les heures de la prière et du travail. Le dimanche et les jours de fête, on ne travaille pas.",
        "Les hommes et les femmes d'Église forment le clergé : les prêtres, et les moines et les moniales qui vivent dans les monastères et les abbayes, comme celle de Cluny, fondée en 910.",
        "L'Église accueille les pauvres et les voyageurs, et soigne les malades à l'Hôtel-Dieu ; les moines distribuent de la nourriture aux pauvres. Elle enseigne aussi : dans les écoles des monastères et des cathédrales, on apprend à lire, à écrire et à compter. Pour tout cela, l'Église reçoit la dîme, une part des récoltes.",
      ],
      questions: [
        ["Comment appelle-t-on les hommes et les femmes d'Église ?", "Le clergé : les prêtres, les moines, les moniales."],
        ["Je relève deux moments de la vie où l'on va à l'église.", "Le baptême, le mariage, l'enterrement."],
        ["Comment l'Église aide-t-elle les pauvres et les malades ?", "Elle les accueille et les soigne à l'Hôtel-Dieu ; les moines distribuent de la nourriture."],
        ["Où peut-on apprendre à lire au Moyen Âge ?", "Dans les écoles des monastères et des cathédrales."],
        ["Qu'est-ce que la dîme ?", "La part des récoltes donnée à l'Église."],
      ],
    },
    {
      sorte: "trier", id: "roman-gothique", titre: "Art roman ou art gothique ?",
      consigne: "Je lis chaque caractéristique. Je l'écris dans la colonne de l'art roman ou de l'art gothique.",
      rappel: "L'art roman (XIe – XIIe siècles) : des murs épais, de petites fenêtres. L'art gothique (à partir du XIIe siècle) : des édifices hauts et lumineux.",
      colonnes: ["L'art roman (XIe – XIIe siècles)", "L'art gothique (à partir du XIIe siècle)"],
      items: [
        ["des murs épais", 0], ["de petites fenêtres", 0], ["des voûtes en berceau", 0], ["des arcs en plein cintre, arrondis", 0], ["un intérieur sombre", 0],
        ["des arcs-boutants", 1], ["des voûtes sur croisées d'ogives", 1], ["de grands vitraux", 1], ["des arcs brisés, pointus", 1], ["un édifice très haut et lumineux", 1], ["une grande rosace", 1],
      ],
    },
  ],
  evaluation: [
    ["Je cite les trois fonctions du château fort.", "Il protège ; le seigneur y vit ; il montre sa puissance."],
    ["Je cite deux obligations des paysans envers le seigneur, et une envers l'Église.", "La corvée, une part des récoltes, payer pour le moulin ou le four ; la dîme."],
    ["Je décris le rôle de l'Église auprès des pauvres et des malades.", "Elle les accueille, les nourrit, les soigne à l'Hôtel-Dieu ; elle enseigne aussi."],
    ["Je donne deux différences entre une église romane et une église gothique.", "Murs épais et petites fenêtres / arcs-boutants et grands vitraux ; voûte en berceau / croisée d'ogives ; sombre / lumineuse."],
  ],
};

const MONARCHIE: ThemeHGCM = {
  id: "monarchie-cm1", classe: "CM1", histoire: true, titre: "La monarchie en France (XVIe – XVIIe siècles)",
  question: "Comment le roi incarne-t-il le pouvoir aux XVIe et XVIIe siècles ?",
  frise: {
    titre: "Trois rois de France (XVIe – XVIIe siècles)", debut: 1500, fin: 1725, pas: 25,
    bandes: [
      { nom: "XVIe siècle", debut: 1500, fin: 1600, couleur: VERT },
      { nom: "XVIIe siècle", debut: 1600, fin: 1700, couleur: BLEU },
      { nom: "XVIIIe s.", debut: 1700, fin: 1725, couleur: JAUNE },
      { nom: "François Ier (1515 – 1547)", debut: 1515, fin: 1547, couleur: ROSE, rang: 2, aPlacer: true },
      { nom: "Henri IV (1589 – 1610)", debut: 1589, fin: 1610, couleur: ROSE, rang: 2, aPlacer: true },
      { nom: "Louis XIV (1643 – 1715)", debut: 1643, fin: 1715, couleur: ROSE, rang: 2, aPlacer: true },
    ],
    reperes: [
      { date: 1515, quand: "1515 – 1519", quoi: "Léonard de Vinci en France, jusqu'à sa mort" },
      { date: 1562, quand: "1562", quoi: "Le début des guerres de religion" },
      { date: 1598, quand: "1598", quoi: "L'édit de Nantes" },
      { date: 1682, quand: "1682", quoi: "La Cour s'installe à Versailles" },
    ],
  },
  motsCles: [
    ["l'artiste", "Celui ou celle qui crée des œuvres d'art : peintre, sculpteur, architecte, musicien."],
    ["le catholique", "Le chrétien fidèle au pape."],
    ["les guerres de religion", "Les guerres entre catholiques et protestants en France, de 1562 à 1598."],
    ["le mécène", "Celui qui protège et paie des artistes."],
    ["la monarchie absolue", "Un régime où le roi a tous les pouvoirs."],
    ["la noblesse", "L'ordre des nobles, qui ont des privilèges."],
    ["le protestant", "Le chrétien qui ne reconnaît pas l'autorité du pape."],
    ["la société d'ordres", "La société divisée en trois ordres : le clergé, la noblesse, le tiers état."],
    ["la Renaissance", "Le grand renouveau des arts et des sciences, venu d'Italie, aux XVe et XVIe siècles."],
  ],
  exercices: [
    {
      sorte: "document", id: "francois-leonard", titre: "François Ier et Léonard de Vinci",
      rappel: "François Ier, roi de 1515 à 1547, est un mécène : il protège les artistes de la Renaissance, comme Léonard de Vinci, et diffuse leur art en France.",
      texte: [
        "François Ier devient roi de France en 1515. Il admire les artistes italiens de la Renaissance, ce grand mouvement qui renouvelle les arts et les sciences en Europe.",
        "Il invite en France le plus célèbre d'entre eux, Léonard de Vinci, peintre, ingénieur et inventeur. Léonard arrive avec plusieurs tableaux, dont La Joconde, et s'installe au Clos Lucé, près du château d'Amboise, où le roi lui verse une pension. Il y imagine des machines et prépare des fêtes pour la Cour, jusqu'à sa mort en 1519.",
        "François Ier protège et paie les artistes : c'est un mécène. Il fait construire ou embellir des châteaux, comme Chambord et Fontainebleau, et commence la collection d'œuvres d'art qui est aujourd'hui au musée du Louvre.",
      ],
      questions: [
        ["Qu'est-ce que la Renaissance ?", "Un grand mouvement, venu d'Italie, qui renouvelle les arts et les sciences en Europe."],
        ["Qui François Ier invite-t-il en France ? Quels sont ses métiers ?", "Léonard de Vinci : peintre, ingénieur et inventeur."],
        ["Qu'est-ce qu'un mécène ?", "Celui qui protège et paie les artistes."],
        ["Je relève deux châteaux que François Ier fait construire ou embellir.", "Chambord et Fontainebleau."],
        ["Pourquoi peut-on voir La Joconde au Louvre aujourd'hui ?", "Léonard l'a apportée en France ; elle est entrée dans la collection du roi, aujourd'hui au Louvre."],
      ],
    },
    {
      sorte: "document", id: "henri-iv", titre: "Henri IV pacifie le royaume",
      rappel: "Pendant les guerres de religion, catholiques et protestants s'affrontent. Henri IV ramène la paix par l'édit de Nantes, en 1598.",
      texte: [
        "Au XVIe siècle, les chrétiens d'Europe se divisent : les catholiques restent fidèles au pape ; les protestants croient autrement et refusent son autorité. En France, catholiques et protestants se font la guerre pendant plus de trente ans : ce sont les guerres de religion. En 1572, lors du massacre de la Saint-Barthélemy, des milliers de protestants sont tués.",
        "Henri de Navarre, un protestant, devient roi en 1589 sous le nom d'Henri IV. Pour être accepté par la majorité catholique, il se convertit au catholicisme.",
        "En 1598, il signe l'édit de Nantes : les protestants peuvent pratiquer leur religion dans certains lieux, et peuvent, comme les catholiques, devenir officiers du roi. La paix revient. Henri IV est assassiné en 1610.",
      ],
      questions: [
        ["Pourquoi les Français se font-ils la guerre au XVIe siècle ?", "Catholiques et protestants s'opposent : ce sont les guerres de religion."],
        ["Quelle est la religion d'Henri de Navarre ? Pourquoi en change-t-il ?", "Il est protestant ; il devient catholique pour être accepté par la majorité catholique."],
        ["Que permet l'édit de Nantes aux protestants ?", "Pratiquer leur religion dans certains lieux, et devenir officiers du roi comme les catholiques."],
        ["Pourquoi dit-on qu'Henri IV pacifie le royaume ?", "Par l'édit de Nantes, il met fin aux guerres de religion : la paix revient."],
      ],
    },
    {
      sorte: "document", id: "versailles", titre: "Versailles, le pouvoir absolu du roi",
      rappel: "Louis XIV a tous les pouvoirs : c'est la monarchie absolue. Versailles montre sa gloire ; la Cour vit autour de lui.",
      texte: [
        "Louis XIV devient roi en 1643, à quatre ans. Quand il gouverne seul, à partir de 1661, il décide de tout : il fait les lois, rend la justice, décide de la guerre et des impôts. C'est la monarchie absolue : le roi dit tenir son pouvoir de Dieu.",
        "Il fait agrandir le château de Versailles, où la Cour s'installe en 1682. Tout y montre la gloire du roi : la galerie des Glaces, les peintures, les jardins immenses, le soleil, son emblème. Des milliers de nobles vivent à la Cour pour obtenir ses faveurs. Ils assistent à son lever, à ses repas, à son coucher, réglés comme des cérémonies : c'est l'étiquette.",
        "Les femmes ont leur place à la Cour. La reine et les princesses ont leur maison, avec leurs dames d'honneur. Des femmes organisent des fêtes, écrivent, protègent des artistes ; certaines ont l'oreille du roi, comme Madame de Maintenon, qui fonde à Saint-Cyr une école pour les jeunes filles nobles et pauvres.",
      ],
      questions: [
        ["Qu'est-ce que la monarchie absolue ?", "Le roi décide de tout : les lois, la justice, la guerre, les impôts ; il dit tenir son pouvoir de Dieu."],
        ["Je relève trois éléments de Versailles qui montrent la gloire du roi.", "La galerie des Glaces, les peintures, les jardins immenses, le soleil."],
        ["Pourquoi les nobles vivent-ils à la Cour ?", "Pour obtenir les faveurs du roi."],
        ["Je décris le rôle des femmes à la Cour.", "La reine et les princesses ont leur maison et leurs dames d'honneur ; des femmes organisent des fêtes, écrivent, protègent des artistes ; certaines conseillent le roi, comme Madame de Maintenon."],
      ],
    },
    {
      sorte: "trier", id: "ordres", titre: "La société d'ordres",
      consigne: "Je lis chaque étiquette. Je l'écris dans la colonne de l'ordre qu'elle décrit.",
      rappel: "Trois ordres : le clergé prie, la noblesse combat, le tiers état travaille. Le tiers état, surtout des paysans, est presque toute la population.",
      colonnes: ["Le clergé", "La noblesse", "Le tiers état"],
      items: [
        ["ceux qui prient", 0], ["les prêtres, les moines, les religieuses", 0], ["reçoit la dîme", 0],
        ["ceux qui combattent", 1], ["les seigneurs, les nobles de la Cour", 1], ["ne paie pas la taille, l'impôt du roi", 1],
        ["ceux qui travaillent", 2], ["les paysans, les artisans, les marchands, les bourgeois", 2], ["paie presque tous les impôts", 2], ["plus de neuf Français sur dix", 2],
      ],
    },
  ],
  evaluation: [
    ["J'écris les dates du règne de François Ier, d'Henri IV et de Louis XIV.", "François Ier : 1515 – 1547 ; Henri IV : 1589 – 1610 ; Louis XIV : 1643 – 1715."],
    ["J'explique pourquoi François Ier est un roi mécène.", "Il protège et paie des artistes de la Renaissance, comme Léonard de Vinci, et fait construire des châteaux."],
    ["J'explique comment Henri IV ramène la paix.", "Il signe l'édit de Nantes (1598), qui met fin aux guerres de religion."],
    ["J'explique comment Versailles montre le pouvoir absolu du roi.", "Tout y montre la gloire du roi : la galerie des Glaces, les jardins, le soleil ; les nobles y vivent pour obtenir ses faveurs."],
    ["Je nomme les trois ordres de la société.", "Le clergé, la noblesse, le tiers état."],
  ],
};

const EXPLORATIONS: ThemeHGCM = {
  id: "explorations-cm1", classe: "CM1", histoire: true, titre: "Explorations et conquêtes par les Européens (XVe – XVIIe siècles)",
  question: "Pourquoi les Européens explorent-ils le monde et comment cela mène-t-il à la première colonisation ?",
  frise: {
    titre: "Explorations et conquêtes (XVe – XVIIe siècles)", debut: 1450, fin: 1700, pas: 25,
    bandes: [
      { nom: "Moyen Âge", debut: 1450, fin: 1492, couleur: BLEU },
      { nom: "Temps modernes", debut: 1492, fin: 1700, couleur: VERT },
    ],
    reperes: [
      { date: 1492, quand: "1492", quoi: "Christophe Colomb débarque en Amérique" },
      { date: 1519, quand: "1519 – 1522", quoi: "L'expédition de Magellan fait le tour du monde" },
      { date: 1521, quand: "1521", quoi: "Cortés conquiert l'empire des Aztèques" },
      { date: 1534, quand: "1534", quoi: "Jacques Cartier explore le Canada" },
      { date: 1685, quand: "1685", quoi: "Le « Code noir », édit royal de Louis XIV" },
    ],
  },
  motsCles: [
    ["la boussole", "L'instrument dont l'aiguille aimantée indique le nord."],
    ["la caravelle", "Un navire léger et rapide, celui des grandes explorations."],
    ["la carte", "La représentation d'un espace : les côtes, les ports, les routes de navigation."],
    ["le commerce triangulaire", "Le commerce entre l'Europe, l'Afrique et l'Amérique, fondé sur la traite des esclaves."],
    ["l'empire colonial", "L'ensemble des territoires qu'un pays a conquis et qu'il domine."],
    ["l'esclavage", "La situation d'une personne qui appartient à une autre, comme un objet."],
    ["la plantation", "Une grande exploitation agricole des colonies, où travaillent des esclaves."],
    ["la traite", "Le commerce d'êtres humains réduits en esclavage."],
  ],
  lieux: ["l'Espagne", "le Portugal", "la France", "l'Angleterre", "le Mexique (empire des Aztèques)", "le Pérou (empire des Incas)", "le Brésil",
    "la Nouvelle-France (Canada)", "les Antilles", "l'Afrique de l'Ouest", "l'océan Atlantique", "l'océan Pacifique"],
  exercices: [
    {
      sorte: "relier", id: "inventions", titre: "Naviguer au grand large",
      consigne: "Je relie chaque invention à ce qu'elle permet.",
      rappel: "La caravelle, la boussole, l'astrolabe, le gouvernail et les cartes permettent aux Européens de s'aventurer en haute mer.",
      paires: [
        ["la caravelle", "un navire léger et rapide, qui avance même quand le vent est de côté"],
        ["la boussole", "indique le nord, même sans soleil ni étoiles"],
        ["l'astrolabe", "mesure la hauteur des astres, pour savoir où l'on est entre le nord et le sud"],
        ["le gouvernail d'étambot", "fixé à l'arrière du navire, il le dirige plus facilement"],
        ["la carte", "dessine les côtes, les ports et les routes de navigation"],
      ],
    },
    {
      sorte: "document", id: "voyages", titre: "Les grands voyages",
      rappel: "1492 : Christophe Colomb débarque en Amérique. 1519 – 1522 : l'expédition de Magellan fait le tour du monde.",
      texte: [
        "En 1492, Christophe Colomb, un navigateur génois au service des souverains d'Espagne, part vers l'ouest pour atteindre l'Asie et ses épices. Après plus de deux mois de traversée, il débarque sur une île d'Amérique, un continent que les Européens ne connaissaient pas : il croit être arrivé aux Indes.",
        "En 1519, Fernand de Magellan, un Portugais au service de l'Espagne, part avec cinq navires et environ 240 hommes. Il traverse l'Atlantique, contourne l'Amérique du Sud par le détroit qui porte aujourd'hui son nom, puis traverse l'océan Pacifique. Magellan est tué aux Philippines en 1521.",
        "Un seul navire revient en Espagne en 1522, avec 18 hommes : c'est le premier tour du monde. Il montre qu'on peut faire le tour de la Terre par la mer, et que les océans communiquent.",
      ],
      questions: [
        ["Que cherche Christophe Colomb en partant vers l'ouest ?", "Une route vers l'Asie et ses épices."],
        ["Où arrive-t-il vraiment ? Que croit-il ?", "En Amérique ; il croit être arrivé aux Indes."],
        ["Combien de navires partent avec Magellan ? Combien reviennent ?", "Cinq navires partent ; un seul revient."],
        ["Que montre ce premier tour du monde ?", "Qu'on peut faire le tour de la Terre par la mer, et que les océans communiquent."],
      ],
    },
    {
      sorte: "relier", id: "empires", titre: "Les premiers empires coloniaux en Amérique",
      consigne: "Je relie chaque pays d'Europe aux territoires qu'il domine en Amérique. Puis je les colorie sur la carte.",
      rappel: "L'Espagne et le Portugal se partagent d'abord l'Amérique ; la France, l'Angleterre et les Pays-Bas y fondent ensuite des colonies.",
      paires: [
        ["l'Espagne", "le Mexique et le Pérou, conquis sur les Aztèques et les Incas"],
        ["le Portugal", "le Brésil"],
        ["la France", "la Nouvelle-France, au Canada, et des îles des Antilles"],
        ["l'Angleterre", "des colonies sur la côte est de l'Amérique du Nord"],
      ],
    },
    {
      sorte: "carte", id: "carte-empires", titre: "Les premiers empires coloniaux en Amérique, sur la carte",
      rappel: "L'Espagne et le Portugal se partagent d'abord l'Amérique ; la France et l'Angleterre y fondent ensuite leurs colonies, au début du XVIIe siècle : Jamestown en 1607, Québec en 1608.",
      consignes: [
        "J'écris le nom des pays d'Europe, des colonies et des océans numérotés.",
        "Je colorie l'empire espagnol d'une couleur, l'empire portugais d'une autre, puis leurs cases dans la légende.",
      ],
      carte: {
        fond: "monde", cadrage: [-120, -56, 10, 62],
        colorier: [
          { nom: "l'empire espagnol", couleur: "#f2c14e", formes: ["MEX", "GTM", "BLZ", "HND", "SLV", "NIC", "CRI", "PAN", "CUB", "JAM", "DOM", "PRI", "TTO", "COL", "VEN", "ECU", "PER", "BOL", "CHL", "ARG", "PRY", "URY"] },
          { nom: "l'empire portugais", couleur: "#7cc37f", formes: ["BRA"] },
        ],
        numeros: [
          { quoi: "ESP", nom: "l'Espagne" }, { quoi: "PRT", nom: "le Portugal" }, { quoi: "FRA", nom: "la France" }, { quoi: "GBR", nom: "l'Angleterre" },
          { quoi: "quebec", nom: "Québec, en Nouvelle-France" }, { quoi: "jamestown", nom: "Jamestown, colonie anglaise" },
          { ou: [-40, 28], nom: "l'océan Atlantique" }, { ou: [-108, -12], nom: "l'océan Pacifique" },
        ],
        banque: true,
        note: "Les frontières sont celles d'aujourd'hui : au XVIe siècle, les Espagnols ne contrôlaient pas tout le territoire de ces pays.",
      },
    },
    {
      sorte: "document", id: "amerindiens", titre: "La conquête et les Amérindiens",
      rappel: "La conquête bouleverse la vie des Amérindiens : guerres, travail forcé, maladies venues d'Europe. La plus grande partie d'entre eux meurt.",
      texte: [
        "Les Espagnols arrivent en Amérique avec des chevaux, des armures et des armes à feu, que les Amérindiens ne connaissent pas. Hernán Cortés conquiert l'empire des Aztèques en 1521, Francisco Pizarro celui des Incas en 1533. Les conquérants s'emparent de l'or et de l'argent, et obligent les Amérindiens à travailler dans les mines et dans les champs.",
        "Surtout, les Européens apportent des maladies, comme la variole, contre lesquelles les Amérindiens ne sont pas protégés. En un siècle, la plus grande partie de la population amérindienne disparaît. Des religieux, comme Bartolomé de Las Casas, dénoncent ces violences.",
      ],
      questions: [
        ["Pourquoi les Espagnols battent-ils les Amérindiens ?", "Ils ont des chevaux, des armures et des armes à feu que les Amérindiens ne connaissent pas ; ils apportent aussi des maladies."],
        ["Je cite deux conséquences de la conquête pour les Amérindiens.", "Le travail forcé dans les mines et les champs ; les maladies : la plus grande partie de la population disparaît."],
        ["Qui dénonce ces violences ?", "Des religieux, comme Bartolomé de Las Casas."],
      ],
    },
    {
      sorte: "document", id: "traite", titre: "La traite et les esclaves des plantations",
      rappel: "Le commerce triangulaire relie l'Europe, l'Afrique et l'Amérique. Dans les plantations, les esclaves travaillent de force ; en 1685, le Code noir fait d'eux des biens.",
      texte: [
        "Pour remplacer les Amérindiens morts et faire travailler leurs plantations, les colons font venir des esclaves d'Afrique. Des navires partent des ports d'Europe, comme Nantes ou Bordeaux, chargés de tissus, d'armes et d'alcool, échangés en Afrique contre des captifs. Entassés dans les cales, ces hommes, ces femmes et ces enfants traversent l'Atlantique ; beaucoup meurent pendant le voyage. En Amérique, ils sont vendus aux planteurs, et les navires rentrent en Europe chargés de sucre, de tabac, de coton. C'est le commerce triangulaire.",
        "Dans les plantations de canne à sucre des Antilles, les esclaves travaillent du lever au coucher du soleil, sous la menace du fouet. Ils sont la propriété de leur maître, qui peut les vendre. En 1685, le Code noir, un édit de Louis XIV, fixe les règles de l'esclavage dans les colonies françaises : l'esclave y est considéré comme un bien.",
      ],
      questions: [
        ["Pourquoi les colons font-ils venir des esclaves d'Afrique ?", "Pour remplacer les Amérindiens morts et faire travailler les plantations."],
        ["Je décris les trois étapes du commerce triangulaire.", "De l'Europe à l'Afrique : des marchandises échangées contre des captifs ; de l'Afrique à l'Amérique : les captifs vendus comme esclaves ; de l'Amérique à l'Europe : le sucre, le tabac, le coton."],
        ["Je décris la vie des esclaves dans une plantation.", "Ils travaillent du lever au coucher du soleil, sous la menace du fouet ; ils appartiennent à leur maître, qui peut les vendre."],
        ["Qu'est-ce que le Code noir ?", "Un édit de Louis XIV (1685) qui fixe les règles de l'esclavage dans les colonies françaises : l'esclave y est un bien."],
      ],
    },
    {
      sorte: "carte", id: "carte-triangulaire", titre: "Le commerce triangulaire, sur la carte",
      rappel: "Le commerce triangulaire relie l'Europe, l'Afrique et l'Amérique : des marchandises échangées contre des captifs, les captifs vendus comme esclaves, le sucre, le tabac et le coton rapportés en Europe.",
      consignes: ["J'écris le nom des trois ports numérotés.", "J'écris, pour chaque flèche, ce que transportent les navires."],
      carte: {
        fond: "monde", cadrage: [-100, -5, 25, 55],
        numeros: [{ quoi: "nantes", nom: "Nantes" }, { quoi: "goree", nom: "Gorée" }, { quoi: "saint-domingue", nom: "Saint-Domingue" }],
        textes: [{ ou: [16, 47], texte: "EUROPE" }, { ou: [3, 20], texte: "AFRIQUE" }, { ou: [-92, 40], texte: "AMÉRIQUE" }],
        traits: [{
          sorte: "fleche", legende: "le trajet des navires",
          liste: [
            { par: ["nantes", [-7, 45.5], [-13, 38], [-19, 25], "goree"], texte: "des tissus, des armes, de l'alcool" },
            { par: ["goree", [-45, 11], "saint-domingue"], texte: "des captifs africains, vendus comme esclaves" },
            { par: ["saint-domingue", [-50, 38], "nantes"], texte: "du sucre, du tabac, du coton" },
          ],
        }],
        banque: true,
      },
    },
    {
      sorte: "trier", id: "denrees", titre: "Des denrées venues d'Amérique",
      consigne: "Je lis chaque aliment. Je l'écris dans la bonne colonne : venu d'Amérique, ou connu en Europe avant 1492.",
      rappel: "La tomate, le cacao du chocolat, le haricot, la pomme de terre, le maïs viennent d'Amérique. Le sucre de canne est produit en grand dans les plantations des colonies.",
      colonnes: ["Venu d'Amérique", "Connu en Europe avant 1492"],
      items: [
        ["la tomate", 0], ["le cacao, pour le chocolat", 0], ["le haricot", 0], ["la pomme de terre", 0], ["le maïs", 0], ["la dinde", 0], ["la vanille", 0],
        ["le blé", 1], ["le raisin", 1], ["la pomme", 1], ["le chou", 1], ["la lentille", 1], ["l'olive", 1],
      ],
    },
  ],
  evaluation: [
    ["Je cite deux inventions qui permettent de naviguer au grand large.", "La caravelle, la boussole, l'astrolabe, le gouvernail d'étambot, les cartes."],
    ["Je cite une conséquence de la conquête pour les Amérindiens.", "Le travail forcé ; les maladies : la plus grande partie d'entre eux meurt."],
    ["Je décris la vie des esclaves dans une plantation.", "Ils travaillent du lever au coucher du soleil, sous la menace du fouet ; ils appartiennent à leur maître."],
    ["Je nomme trois denrées venues des colonies d'Amérique.", "La tomate, le chocolat, le haricot, la pomme de terre, le maïs, le sucre de canne."],
  ],
};

const REVOLUTION: ThemeHGCM = {
  id: "revolution-1789-cm1", classe: "CM1", histoire: true, titre: "1789, une année révolutionnaire en France",
  question: "Comment l'année 1789 met-elle fin à la monarchie absolue et à la société d'ordres ?",
  frise: {
    titre: "L'année 1789", debut: 1789, fin: 1790, pas: 1,
    graduations: ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."].map((nom, i) => ({ date: jour(1789, i + 1), nom })),
    bandes: [{ nom: "1789", debut: 1789, fin: 1790, couleur: ROSE }],
    reperes: [
      { date: jour(1789, 3, 15), quand: "Printemps 1789", quoi: "On écrit les cahiers de doléances" },
      { date: jour(1789, 5, 5), quand: "5 mai", quoi: "L'ouverture des États généraux à Versailles" },
      { date: jour(1789, 7, 14), quand: "14 juillet", quoi: "La prise de la Bastille" },
      { date: jour(1789, 8, 4), quand: "Nuit du 4 août", quoi: "L'abolition des privilèges" },
      { date: jour(1789, 8, 26), quand: "26 août", quoi: "La Déclaration des droits de l'homme et du citoyen" },
      { date: jour(1789, 10, 5), quand: "5 – 6 octobre", quoi: "La marche des femmes à Versailles" },
    ],
  },
  motsCles: [
    ["l'Ancien Régime", "La France d'avant 1789 : un roi absolu, trois ordres, des privilèges."],
    ["la citoyenneté", "Le fait d'être citoyen, avec des droits et des devoirs."],
    ["la constitution", "Le texte qui fixe l'organisation du pouvoir."],
    ["les droits de l'Homme", "Les droits que chaque être humain a dès sa naissance."],
    ["l'égalité", "Le fait d'avoir les mêmes droits."],
    ["l'Encyclopédie", "L'ouvrage qui rassemble les savoirs de son temps, dirigé par Diderot et d'Alembert."],
    ["la liberté", "Le droit de faire tout ce qui ne nuit pas aux autres."],
    ["les Lumières", "Les philosophes du XVIIIe siècle qui défendent la raison, la liberté et la tolérance."],
    ["la Révolution", "Un bouleversement rapide et profond de la société et du pouvoir."],
    ["la souveraineté nationale", "Le principe selon lequel le pouvoir appartient à la Nation."],
  ],
  exercices: [
    {
      sorte: "document", id: "royaume-1789", titre: "Le royaume en 1789",
      rappel: "En 1789, le roi manque d'argent, le peuple a faim, le tiers état paie presque tous les impôts, et les Lumières critiquent cette société inégale.",
      texte: [
        "En 1789, le royaume de France compte environ 28 millions d'habitants ; la plupart sont des paysans. Le roi Louis XVI manque d'argent : les guerres et les dépenses de la Cour ont creusé les dettes.",
        "La récolte de 1788 a été mauvaise et l'hiver très froid : le prix du pain augmente, et beaucoup ont faim. Le tiers état paie presque tous les impôts, alors que le clergé et la noblesse ont des privilèges.",
        "Des philosophes, ceux des Lumières, critiquent depuis des années cette société inégale et le pouvoir absolu du roi. Pour trouver de l'argent, Louis XVI réunit les États généraux, des députés des trois ordres. Dans tout le royaume, on écrit des cahiers de doléances pour dire au roi ce qui ne va pas.",
      ],
      questions: [
        ["Pourquoi le roi manque-t-il d'argent ?", "À cause des guerres et des dépenses de la Cour : il a des dettes."],
        ["Pourquoi le peuple a-t-il faim en 1789 ?", "La récolte de 1788 a été mauvaise et l'hiver très froid : le prix du pain augmente."],
        ["Qui paie presque tous les impôts ?", "Le tiers état."],
        ["Qu'est-ce qu'un cahier de doléances ?", "Un cahier où l'on écrit les plaintes et les demandes adressées au roi."],
      ],
    },
    {
      sorte: "relier", id: "lumieres", titre: "Les idées des Lumières",
      consigne: "Je relie chaque philosophe des Lumières à son idée.",
      rappel: "Les Lumières défendent la raison, la liberté, l'égalité, la tolérance, et le savoir pour tous.",
      paires: [
        ["Montesquieu", "Les pouvoirs doivent être séparés : faire les lois, les faire appliquer et juger ne sont pas dans les mêmes mains."],
        ["Voltaire", "Il faut tolérer toutes les religions et lutter contre l'injustice."],
        ["Rousseau", "Le pouvoir appartient au peuple, qui fait les lois."],
        ["Diderot et d'Alembert", "Il faut rassembler tous les savoirs dans l'Encyclopédie, pour que chacun puisse s'instruire."],
        ["Émilie du Châtelet", "Les femmes doivent pouvoir étudier les sciences ; elle traduit les travaux du savant Newton."],
      ],
    },
    {
      sorte: "ordonner", id: "annee-1789", titre: "L'année 1789, dans l'ordre",
      consigne: "Je lis les évènements. J'écris dans chaque case le numéro de l'évènement, dans l'ordre : 1 pour le premier.",
      rappel: "Printemps : les cahiers de doléances et les États généraux ; 14 juillet : la Bastille ; 4 août : la fin des privilèges ; 26 août : la Déclaration ; 5 et 6 octobre : la marche des femmes.",
      etapes: [
        "On écrit les cahiers de doléances.",
        "Les États généraux s'ouvrent à Versailles.",
        "Le peuple de Paris prend la Bastille.",
        "Les députés abolissent les privilèges.",
        "Les députés votent la Déclaration des droits de l'homme et du citoyen.",
        "Les femmes de Paris marchent sur Versailles et ramènent le roi à Paris.",
      ],
      dates: ["Printemps 1789", "5 mai 1789", "14 juillet 1789", "Nuit du 4 août 1789", "26 août 1789", "5 et 6 octobre 1789"],
    },
    {
      sorte: "document", id: "declaration", titre: "La Déclaration des droits de l'homme et du citoyen",
      source: "Déclaration des droits de l'homme et du citoyen, 26 août 1789 (extraits).",
      rappel: "La Déclaration proclame la liberté et l'égalité en droits, la souveraineté de la Nation, la liberté d'opinion et d'expression.",
      texte: [
        "Article 1. Les hommes naissent et demeurent libres et égaux en droits. Les distinctions sociales ne peuvent être fondées que sur l'utilité commune.",
        "Article 2. Le but de toute association politique est la conservation des droits naturels et imprescriptibles de l'Homme. Ces droits sont la liberté, la propriété, la sûreté, et la résistance à l'oppression.",
        "Article 3. Le principe de toute Souveraineté réside essentiellement dans la Nation.",
        "Article 9. Tout homme étant présumé innocent jusqu'à ce qu'il ait été déclaré coupable […].",
        "Article 10. Nul ne doit être inquiété pour ses opinions, même religieuses […].",
        "Article 11. La libre communication des pensées et des opinions est un des droits les plus précieux de l'Homme : tout Citoyen peut donc parler, écrire, imprimer librement […].",
      ],
      questions: [
        ["Je relève les quatre droits naturels de l'article 2.", "La liberté, la propriété, la sûreté, la résistance à l'oppression."],
        ["Quel article met fin à la société d'ordres ? Pourquoi ?", "L'article 1 : les hommes naissent libres et égaux en droits ; il n'y a plus de privilèges."],
        ["À qui appartient le pouvoir, d'après l'article 3 ?", "À la Nation."],
        ["Quelle liberté l'article 11 protège-t-il ?", "La liberté d'expression : parler, écrire, imprimer librement."],
      ],
    },
    {
      sorte: "document", id: "femmes-1789", titre: "Les femmes en 1789",
      rappel: "Les 5 et 6 octobre 1789, les femmes de Paris marchent sur Versailles pour réclamer du pain et ramènent le roi à Paris.",
      texte: [
        "Le 5 octobre 1789, à Paris, le pain manque. Des milliers de femmes du peuple, des marchandes des Halles, des ouvrières, se rassemblent devant l'Hôtel de Ville, puis marchent jusqu'à Versailles, sous la pluie, pour réclamer du pain au roi. Des gardes nationaux les suivent.",
        "Le lendemain, le 6 octobre, la foule ramène à Paris le roi, la reine et leur fils : « le boulanger, la boulangère et le petit mitron ». Désormais, le roi vit à Paris, sous le regard du peuple.",
        "Des femmes ont aussi écrit pour demander l'instruction des filles et le droit de travailler. En 1791, Olympe de Gouges écrira une Déclaration des droits de la femme et de la citoyenne.",
      ],
      questions: [
        ["Pourquoi les femmes de Paris marchent-elles vers Versailles ?", "Pour réclamer du pain au roi."],
        ["Que se passe-t-il le 6 octobre ?", "La foule ramène à Paris le roi, la reine et leur fils."],
        ["Pourquoi les surnomme-t-on « le boulanger, la boulangère et le petit mitron » ?", "Le peuple espère qu'avec eux à Paris, il aura du pain."],
        ["Que demandent certaines femmes ?", "L'instruction des filles et le droit de travailler."],
      ],
    },
  ],
  evaluation: [
    ["Je cite deux idées des Lumières.", "Séparer les pouvoirs ; tolérer les religions ; le pouvoir appartient au peuple ; le savoir pour tous."],
    ["Je raconte ce que font les femmes de Paris les 5 et 6 octobre 1789.", "Elles marchent sur Versailles pour réclamer du pain et ramènent le roi à Paris."],
    ["Je cite trois droits de la Déclaration des droits de l'homme et du citoyen.", "La liberté, l'égalité en droits, la propriété, la sûreté, la résistance à l'oppression, la liberté d'opinion et d'expression."],
  ],
};

// ── Histoire, CM2 ─────────────────────────────────────────────────────────

const REPUBLIQUE_EMPIRE: ThemeHGCM = {
  id: "republique-empire-cm2", classe: "CM2", histoire: true, titre: "De la République à l'Empire (1792 – 1815)",
  question: "Comment la République et l'Empire ont-ils transformé la vie des Français et des Françaises ?",
  frise: {
    titre: "De la Révolution à l'Empire (1789 – 1815)", debut: 1789, fin: 1816, pas: 3,
    graduations: [1789, 1792, 1795, 1798, 1801, 1804, 1807, 1810, 1813, 1816].map((date) => ({ date, nom: String(date) })),
    bandes: [
      { nom: "Monarchie", debut: 1789, fin: jour(1792, 9, 21), couleur: BLEU },
      { nom: "Première République", debut: jour(1792, 9, 21), fin: jour(1804, 5, 18), couleur: ROSE, aPlacer: true },
      { nom: "Premier Empire", debut: jour(1804, 5, 18), fin: jour(1815, 6, 22), couleur: JAUNE, aPlacer: true },
      { nom: "Restauration", debut: jour(1815, 6, 22), fin: 1816, couleur: BLEU },
      { nom: "Le Consulat : Bonaparte", debut: jour(1799, 11, 9), fin: jour(1804, 5, 18), couleur: MAUVE, rang: 2, aPlacer: true },
    ],
    reperes: [
      { date: jour(1792, 3, 6), quand: "Mars 1792", quoi: "La pétition de 319 femmes (Pauline Léon) pour la garde nationale" },
      { date: jour(1792, 4, 25), quand: "Avril 1792", quoi: "La composition de La Marseillaise" },
      { date: jour(1792, 9, 21), quand: "Septembre 1792", quoi: "La naissance de la République" },
      { date: jour(1794, 2, 4), quand: "1794", quoi: "La première abolition de l'esclavage" },
      { date: jour(1802, 5, 20), quand: "1802", quoi: "Le rétablissement de l'esclavage" },
      { date: jour(1804, 12, 2), quand: "2 décembre 1804", quoi: "Le sacre de Napoléon Ier" },
    ],
  },
  motsCles: [
    ["l'empereur, l'empire", "Le souverain d'un empire ; un empire, un État qui domine de nombreux territoires."],
    ["l'esclavage", "La situation d'une personne qui appartient à une autre, comme un objet."],
    ["le Code civil", "Le recueil des lois qui règlent la vie des Français — la famille, la propriété, les contrats —, en 1804."],
    ["la liberté de la presse", "Le droit de publier journaux et livres sans censure."],
    ["le lycée", "L'établissement créé en 1802 pour former les futurs officiers et fonctionnaires."],
    ["le préfet", "Le représentant de l'État dans chaque département, depuis 1800."],
    ["la République", "Un régime sans roi, où le pouvoir appartient au peuple et à ses élus."],
  ],
  exercices: [
    {
      sorte: "document", id: "vie-politique", titre: "Les Français et les Françaises dans la vie politique",
      rappel: "Depuis 1789, les Français lisent les journaux, discutent dans les clubs, écrivent des pétitions, votent. Les femmes ne votent pas, mais elles agissent.",
      texte: [
        "Depuis 1789, les Français participent à la vie politique. Ils lisent les journaux, devenus nombreux grâce à la liberté de la presse, discutent dans les clubs et les sociétés populaires, écrivent des pétitions.",
        "En 1790 et en 1791, seuls les hommes qui paient assez d'impôts votent. En 1792, pour la première fois, tous les hommes de plus de 21 ans peuvent voter, sauf les domestiques.",
        "Les femmes n'ont pas le droit de vote, mais elles agissent. En mars 1792, Pauline Léon présente une pétition signée par 319 femmes : elles demandent le droit de s'armer pour défendre la patrie dans la garde nationale. Des femmes participent aux clubs, aux manifestations, aux fêtes révolutionnaires.",
      ],
      questions: [
        ["Je relève trois façons de participer à la vie politique depuis 1789.", "Lire les journaux, discuter dans les clubs, écrire des pétitions, voter."],
        ["Qui peut voter en 1792 ?", "Tous les hommes de plus de 21 ans, sauf les domestiques."],
        ["Les femmes peuvent-elles voter ? Comment agissent-elles ?", "Non ; elles signent des pétitions, comme celle de Pauline Léon, participent aux clubs et aux manifestations."],
      ],
    },
    {
      sorte: "document", id: "republique-1792", titre: "La chute du roi et la naissance de la République",
      rappel: "En guerre, la France se méfie du roi. Le 10 août 1792, il est renversé ; le 21 septembre 1792, la République naît.",
      texte: [
        "En 1791, Louis XVI tente de fuir à l'étranger ; il est arrêté à Varennes et ramené à Paris. Beaucoup de Français ne lui font plus confiance.",
        "En avril 1792, la France entre en guerre contre l'Autriche. À Strasbourg, Rouget de Lisle compose un chant de guerre pour l'armée du Rhin : chanté par les volontaires venus de Marseille, il devient La Marseillaise.",
        "Les armées ennemies menacent Paris, et le roi est soupçonné de les soutenir. Le 10 août 1792, les Parisiens prennent le palais des Tuileries ; le roi est arrêté. Le 21 septembre 1792, une nouvelle assemblée, la Convention, abolit la royauté : c'est la naissance de la République. Louis XVI est jugé et guillotiné en janvier 1793.",
      ],
      questions: [
        ["Pourquoi les Français ne font-ils plus confiance au roi ?", "Il a tenté de fuir à l'étranger ; on le soupçonne de soutenir les armées ennemies."],
        ["Comment La Marseillaise est-elle née ?", "C'est un chant de guerre composé à Strasbourg par Rouget de Lisle en avril 1792, chanté par les volontaires de Marseille."],
        ["Que se passe-t-il le 10 août 1792 ? Et le 21 septembre 1792 ?", "Les Parisiens prennent les Tuileries et le roi est arrêté ; la Convention abolit la royauté : la République naît."],
      ],
    },
    {
      sorte: "document", id: "abolition", titre: "Le combat pour l'abolition de l'esclavage",
      rappel: "L'esclavage est aboli en 1794, rétabli par Napoléon Bonaparte en 1802, aboli définitivement en 1848.",
      texte: [
        "Dans les colonies françaises des Antilles, des centaines de milliers d'esclaves travaillent dans les plantations. En France, la Société des amis des Noirs, fondée en 1788, demande la fin de la traite.",
        "En 1791, à Saint-Domingue, la plus riche des colonies, les esclaves se révoltent ; Toussaint Louverture devient leur chef. Le 4 février 1794, la Convention abolit l'esclavage dans toutes les colonies françaises : les anciens esclaves deviennent des citoyens.",
        "Mais en 1802, Napoléon Bonaparte rétablit l'esclavage. En Guadeloupe, des insurgés menés par Louis Delgrès, et des femmes comme Solitude, résistent ; ils sont vaincus. Saint-Domingue gagne son indépendance en 1804 : c'est Haïti. Il faudra attendre 1848 pour que l'esclavage soit aboli pour de bon.",
      ],
      questions: [
        ["Qui demande la fin de la traite en France ?", "La Société des amis des Noirs."],
        ["Que se passe-t-il à Saint-Domingue en 1791 ?", "Les esclaves se révoltent ; Toussaint Louverture devient leur chef."],
        ["Je complète : l'esclavage est aboli en …, rétabli en … par …, aboli définitivement en ….", "1794 ; 1802, par Napoléon Bonaparte ; 1848."],
      ],
    },
    {
      sorte: "ordonner", id: "bonaparte", titre: "Comment Bonaparte devient empereur",
      consigne: "Je lis les étapes. J'écris dans chaque case le numéro de l'étape, dans l'ordre : 1 pour la première.",
      rappel: "Général victorieux, Bonaparte prend le pouvoir en 1799 ; consul à vie en 1802, il est sacré empereur le 2 décembre 1804.",
      etapes: [
        "Le jeune général Bonaparte remporte des victoires en Italie.",
        "Il mène une expédition en Égypte.",
        "Par un coup d'État, il prend le pouvoir : il devient Premier consul.",
        "Il est nommé consul à vie.",
        "À Notre-Dame de Paris, il est sacré empereur des Français : Napoléon Ier.",
        "Battu à Waterloo, il est exilé sur l'île de Sainte-Hélène.",
      ],
      dates: ["1796 – 1797", "1798 – 1799", "Novembre 1799", "1802", "2 décembre 1804", "1815"],
    },
    {
      sorte: "trier", id: "reformes", titre: "Les réformes de Napoléon",
      consigne: "Je lis chaque étiquette. Je l'écris dans la bonne colonne : ce que Napoléon crée, ou ce qu'il remet en cause.",
      rappel: "Napoléon crée le Code civil, les lycées, les préfets ; mais il gouverne seul, censure la presse et rétablit l'esclavage.",
      colonnes: ["Ce que Napoléon crée", "Ce qu'il remet en cause"],
      items: [
        ["le Code civil (1804)", 0], ["les lycées (1802)", 0], ["les préfets, un par département (1800)", 0], ["la Banque de France (1800)", 0], ["la Légion d'honneur (1802)", 0],
        ["il rétablit l'esclavage (1802)", 1], ["il censure les journaux : fin de la liberté de la presse", 1], ["il gouverne seul : fin de la République", 1], ["la femme mariée doit obéir à son mari", 1],
      ],
    },
  ],
  evaluation: [
    ["Je raconte comment la République naît en 1792.", "La France est en guerre, le roi est soupçonné ; le 10 août 1792, il est renversé ; le 21 septembre, la Convention abolit la royauté."],
    ["Je raconte le combat pour l'abolition de l'esclavage.", "Révolte de Saint-Domingue (1791) ; abolition en 1794 ; rétablissement par Bonaparte en 1802 ; abolition définitive en 1848."],
    ["J'explique comment Bonaparte devient empereur.", "Général victorieux, il prend le pouvoir par un coup d'État en 1799, devient consul à vie, puis se fait sacrer empereur en 1804."],
    ["Je nomme trois réformes de Napoléon.", "Le Code civil, les lycées, les préfets, la Banque de France, le rétablissement de l'esclavage."],
  ],
};

const VERS_REPUBLIQUE: ThemeHGCM = {
  id: "vers-republique-cm2", classe: "CM2", histoire: true, titre: "Vers une France républicaine (1848 – 1914)",
  question: "Comment la France est-elle devenue une République ?",
  frise: {
    titre: "Vers une France républicaine (1848 – 1914)", debut: 1845, fin: 1915, pas: 10,
    graduations: [1845, 1855, 1865, 1875, 1885, 1895, 1905, 1915].map((date) => ({ date, nom: String(date) })),
    bandes: [
      { nom: "Monarchie", debut: 1845, fin: jour(1848, 2, 24), couleur: BLEU },
      { nom: "IIe République", debut: jour(1848, 2, 24), fin: jour(1852, 12, 2), couleur: ROSE, aPlacer: true },
      { nom: "Second Empire", debut: jour(1852, 12, 2), fin: jour(1870, 9, 4), couleur: JAUNE },
      { nom: "IIIe République", debut: jour(1870, 9, 4), fin: 1915, couleur: ROSE, aPlacer: true },
    ],
    reperes: [
      { date: jour(1848, 4, 27), quand: "1848", quoi: "Le suffrage universel masculin et l'abolition définitive de l'esclavage" },
      { date: jour(1870, 9, 4), quand: "1870", quoi: "La proclamation de la IIIe République" },
      { date: jour(1881, 7, 29), quand: "1881", quoi: "La loi sur la liberté de la presse" },
      { date: 1882, quand: "1882 – 1886", quoi: "Les lois Ferry sur l'École" },
      { date: jour(1905, 12, 9), quand: "9 décembre 1905", quoi: "La séparation des Églises et de l'État" },
    ],
  },
  motsCles: [
    ["l'abolition de l'esclavage", "La suppression de l'esclavage par la loi ; en France, définitivement en 1848."],
    ["la colonisation", "La conquête et la domination d'un territoire et de ses habitants par un pays étranger."],
    ["la démocratie", "Un régime où le peuple choisit ses dirigeants par des élections libres."],
    ["la laïcité", "Le principe qui sépare les religions et l'État : chacun est libre de croire ou de ne pas croire."],
    ["la république", "Un régime où le pouvoir n'est pas héréditaire : le chef de l'État est élu."],
    ["le suffrage universel masculin", "Le droit de vote de tous les hommes adultes."],
  ],
  lieux: ["l'Algérie", "la Tunisie", "le Maroc", "l'Afrique-Occidentale française", "l'Afrique-Équatoriale française", "Madagascar", "l'Indochine",
    "les Antilles", "la Guyane", "La Réunion", "la Nouvelle-Calédonie", "Tahiti"],
  exercices: [
    {
      sorte: "document", id: "deuxieme-republique", titre: "1848, la IIe République",
      rappel: "En 1848, la IIe République donne le droit de vote à tous les hommes et abolit définitivement l'esclavage. Elle prend fin en 1852.",
      texte: [
        "En février 1848, les Parisiens se révoltent et chassent le roi Louis-Philippe. La IIe République est proclamée. Elle prend aussitôt de grandes décisions : tous les hommes de plus de 21 ans peuvent voter, c'est le suffrage universel masculin ; le 27 avril 1848, grâce à Victor Schœlcher, l'esclavage est aboli définitivement dans les colonies françaises. Les femmes, elles, ne votent toujours pas.",
        "En décembre 1848, les Français élisent un président de la République : Louis-Napoléon Bonaparte, le neveu de Napoléon Ier. En 1851, il prend tous les pouvoirs par un coup d'État, puis se fait proclamer empereur en 1852, sous le nom de Napoléon III. La IIe République n'a duré que quatre ans.",
      ],
      questions: [
        ["Je cite deux grandes décisions de la IIe République en 1848.", "Le suffrage universel masculin ; l'abolition définitive de l'esclavage."],
        ["Qui a obtenu l'abolition de l'esclavage ?", "Victor Schœlcher."],
        ["Qui ne vote toujours pas ?", "Les femmes."],
        ["Comment la IIe République prend-elle fin ?", "Par le coup d'État de Louis-Napoléon Bonaparte en 1851 ; il devient l'empereur Napoléon III en 1852."],
      ],
    },
    {
      sorte: "relier", id: "lois", titre: "Les grandes lois de la République",
      consigne: "Je relie chaque loi à ce qu'elle permet.",
      rappel: "Les grandes lois fondent la République : le suffrage universel masculin, l'abolition de l'esclavage, la liberté de la presse, l'école gratuite, obligatoire et laïque, la laïcité.",
      paires: [
        ["1848 : le suffrage universel masculin", "Tous les hommes de plus de 21 ans votent."],
        ["1848 : l'abolition de l'esclavage", "Plus personne ne peut être esclave dans les colonies françaises."],
        ["1881 : la liberté de la presse", "Chacun peut publier un journal sans autorisation."],
        ["1882 – 1886 : les lois Ferry", "L'école primaire est gratuite, obligatoire de 6 à 13 ans, et laïque."],
        ["1905 : la séparation des Églises et de l'État", "L'État ne paie aucune religion et garantit à chacun la liberté de croire ou de ne pas croire."],
      ],
    },
    {
      sorte: "relier", id: "symboles", titre: "Les symboles de la République",
      consigne: "Je relie chaque symbole de la République à sa description.",
      rappel: "Cinq symboles : le drapeau tricolore, le 14 juillet, Marianne, la Marseillaise, la devise Liberté, Égalité, Fraternité.",
      paires: [
        ["le drapeau tricolore", "bleu, blanc, rouge : il est né pendant la Révolution"],
        ["le 14 juillet", "la fête nationale depuis 1880, en souvenir de 1789 et de 1790"],
        ["Marianne", "la femme coiffée du bonnet phrygien qui représente la République"],
        ["la Marseillaise", "l'hymne national, composé en 1792"],
        ["la devise", "Liberté, Égalité, Fraternité, écrite sur les mairies et les écoles"],
      ],
    },
    {
      sorte: "document", id: "empire-colonial", titre: "L'empire colonial français vers 1914",
      rappel: "Vers 1914, la France possède le deuxième empire colonial du monde, surtout en Afrique. Les colonisés n'ont pas les mêmes droits que les Français.",
      texte: [
        "À la fin du XIXe siècle, la France conquiert un immense empire colonial : en 1914, il est le deuxième du monde, après celui du Royaume-Uni. Il s'étend surtout en Afrique : l'Algérie, conquise à partir de 1830, la Tunisie, le Maroc, l'Afrique-Occidentale française, l'Afrique-Équatoriale française, Madagascar. En Asie, la France domine l'Indochine. Elle garde aussi ses anciennes colonies — les Antilles, la Guyane, La Réunion — et possède des îles du Pacifique, comme la Nouvelle-Calédonie et Tahiti.",
        "Les colonisés n'ont pas les mêmes droits que les Français : ils sont soumis à des lois particulières, sont souvent obligés de travailler de force, et ne votent pas. La République, qui proclame la liberté et l'égalité, ne les applique pas dans ses colonies.",
      ],
      questions: [
        ["Sur quel continent se trouve la plus grande partie de l'empire colonial français ?", "En Afrique."],
        ["Je relève trois territoires de l'empire. Je les colorie sur le planisphère.", "L'Algérie, le Maroc, la Tunisie, l'AOF, l'AEF, Madagascar, l'Indochine, les Antilles, la Guyane, La Réunion, la Nouvelle-Calédonie…"],
        ["Les colonisés ont-ils les mêmes droits que les Français ?", "Non : ils sont soumis à des lois particulières, au travail forcé, et ne votent pas."],
      ],
    },
    {
      sorte: "carte", id: "carte-empire-1914", titre: "L'empire colonial français en 1914, sur le planisphère",
      rappel: "Vers 1914, la France possède le deuxième empire colonial du monde, surtout en Afrique.",
      consignes: [
        "J'écris le nom des territoires numérotés.",
        "Je colorie la France d'une couleur, son empire colonial d'une autre, puis leurs cases dans la légende.",
      ],
      carte: {
        fond: "monde",
        colorier: [
          { nom: "la France", couleur: "#7ea7dc", formes: ["FRA"] },
          // L'Algérie, les protectorats de Tunisie et du Maroc, l'AOF, l'AEF, Madagascar et les Comores, la Côte française des Somalis,
          // l'Indochine, les vieilles colonies, le Pacifique. Le Togo et le Cameroun sont encore allemands.
          {
            nom: "l'empire colonial français", couleur: "#f0a07a",
            formes: ["DZA", "TUN", "MAR", "MRT", "SEN", "MLI", "GIN", "CIV", "BFA", "BEN", "NER", "GAB", "COG", "CAF", "TCD", "MDG", "COM", "DJI", "VNM", "LAO", "KHM", "GUF", "MTQ", "REU", "NCL", "PYF"],
          },
        ],
        numeros: [
          { quoi: "DZA", nom: "l'Algérie" }, { quoi: "TUN", nom: "la Tunisie" }, { quoi: "MAR", nom: "le Maroc" }, { quoi: "MLI", nom: "l'Afrique-Occidentale française" },
          { quoi: "TCD", nom: "l'Afrique-Équatoriale française" }, { quoi: "MDG", nom: "Madagascar" }, { quoi: "LAO", nom: "l'Indochine" }, { quoi: "GUF", nom: "la Guyane" },
          { ou: [-61.2, 15.3], nom: "les Antilles" }, { quoi: "REU", nom: "La Réunion" }, { quoi: "NCL", nom: "la Nouvelle-Calédonie" }, { ou: [-149.4, -17.65], nom: "Tahiti" },
        ],
        banque: true,
        note: "Les frontières sont celles d'aujourd'hui.",
      },
    },
  ],
  evaluation: [
    ["Je nomme deux grandes lois fondatrices de la République.", "Le suffrage universel masculin, l'abolition de l'esclavage, la liberté de la presse, les lois Ferry, la laïcité (1905)."],
    ["Je nomme les cinq symboles de la République.", "Le drapeau tricolore, le 14 juillet, Marianne, la Marseillaise, la devise Liberté, Égalité, Fraternité."],
    ["Je nomme trois territoires de l'empire colonial français vers 1914.", "L'Algérie, Madagascar, l'Indochine, l'Afrique-Occidentale française…"],
  ],
};

const AGE_INDUSTRIEL: ThemeHGCM = {
  id: "age-industriel-cm2", classe: "CM2", histoire: true, titre: "L'âge industriel en France au XIXe siècle",
  question: "Quelles sont les transformations économiques et sociales en France au XIXe siècle ?",
  frise: {
    titre: "L'âge industriel (XIXe siècle)", debut: 1800, fin: 1910, pas: 10,
    bandes: [
      { nom: "XIXe siècle", debut: 1800, fin: 1901, couleur: GRIS },
      { nom: "XXe siècle", debut: 1901, fin: 1910, couleur: BLEU },
    ],
    reperes: [
      { date: 1814, quand: "Début du XIXe s.", quoi: "Stephenson met au point la locomotive" },
      { date: 1837, quand: "1837", quoi: "La première ligne de train pour voyageurs : Paris – Saint-Germain" },
      { date: 1841, quand: "1841", quoi: "La première loi qui limite le travail des enfants" },
      { date: 1864, quand: "1864", quoi: "Le droit de grève" },
      { date: 1884, quand: "1884", quoi: "La liberté syndicale" },
      { date: 1885, quand: "1885", quoi: "Pasteur : le vaccin contre la rage" },
    ],
  },
  motsCles: [
    ["l'atelier", "Un lieu où l'on fabrique à la main ou avec quelques machines."],
    ["le bourgeois", "Celui qui vit de ses biens, d'un commerce, d'une usine ou d'un métier qualifié, en ville."],
    ["la grève", "L'arrêt collectif du travail pour obtenir quelque chose."],
    ["l'industrialisation", "Le développement des usines et des machines."],
    ["la mine", "Le lieu où l'on extrait du sous-sol le charbon ou les minerais."],
    ["l'ouvrier", "Celui qui travaille de ses mains pour un patron, contre un salaire."],
    ["le syndicat", "Une association qui défend les droits des travailleurs."],
    ["l'urbanisation", "La croissance des villes."],
    ["l'usine", "Un grand établissement où des machines fabriquent des produits en grande quantité."],
    ["le vaccin", "Un produit qui protège d'une maladie."],
  ],
  exercices: [
    {
      sorte: "document", id: "vapeur", titre: "La vapeur et le chemin de fer",
      rappel: "Au XIXe siècle, la machine à vapeur fait tourner les usines ; le chemin de fer relie les villes. On produit plus, on voyage plus vite, les villes grandissent.",
      texte: [
        "Au XIXe siècle, la machine à vapeur, qui brûle du charbon, remplace la force des bras, des animaux, du vent et de l'eau. Elle fait tourner les machines des usines, où l'on produit beaucoup plus, et moins cher : des tissus, de l'acier, des outils. On extrait toujours plus de charbon dans les mines du Nord et de la région de Saint-Étienne.",
        "Au début du siècle, l'Anglais George Stephenson met au point la locomotive. En France, la première ligne pour voyageurs relie Paris à Saint-Germain-en-Laye en 1837 ; en 1900, des dizaines de milliers de kilomètres de voies ferrées couvrent le pays. On voyage plus vite et plus loin ; les produits circulent.",
        "Les villes grandissent : des paysans viennent y chercher du travail dans les usines.",
      ],
      questions: [
        ["Quelle énergie fait tourner les machines au XIXe siècle ?", "La vapeur, produite en brûlant du charbon."],
        ["Qui a mis au point la locomotive ?", "L'Anglais George Stephenson."],
        ["Je cite deux conséquences du chemin de fer.", "On voyage plus vite et plus loin ; les produits circulent."],
        ["Pourquoi les villes grandissent-elles ?", "Des paysans viennent y chercher du travail dans les usines : c'est l'urbanisation."],
      ],
    },
    {
      sorte: "trier", id: "vie-quotidienne", titre: "La vie quotidienne change",
      consigne: "Je lis chaque étiquette. Je l'écris dans la bonne colonne : avant le XIXe siècle, ou à la fin du XIXe siècle.",
      rappel: "Les progrès techniques changent la vie quotidienne : l'éclairage, les transports, l'eau, les communications, les vêtements.",
      colonnes: ["Avant le XIXe siècle", "À la fin du XIXe siècle"],
      items: [
        ["s'éclairer à la bougie", 0], ["voyager en diligence, tirée par des chevaux", 0], ["chercher l'eau au puits ou à la fontaine", 0], ["envoyer une lettre qui met des jours à arriver", 0], ["faire peindre son portrait", 0],
        ["l'éclairage au gaz, puis à l'électricité, dans les villes", 1], ["voyager en train", 1], ["l'eau courante dans les immeubles des villes", 1], ["envoyer un télégramme, téléphoner", 1], ["se faire photographier", 1],
      ],
    },
    {
      sorte: "relier", id: "medecine", titre: "Les progrès de la médecine",
      consigne: "Je relie chaque savant à son progrès.",
      rappel: "Au XIXe siècle, on découvre les microbes, on invente des vaccins, on endort les malades pour les opérer, on voit l'intérieur du corps.",
      paires: [
        ["Louis Pasteur", "montre que les microbes causent des maladies, et met au point le vaccin contre la rage (1885)"],
        ["William Morton, dentiste américain", "endort un malade à l'éther pour l'opérer sans douleur : l'anesthésie (1846)"],
        ["Joseph Lister", "désinfecte les plaies et les instruments pendant les opérations"],
        ["Wilhelm Röntgen", "découvre les rayons X, qui permettent de voir les os (1895)"],
        ["Marie et Pierre Curie", "découvrent le radium (1898), utilisé ensuite pour soigner des cancers"],
      ],
    },
    {
      sorte: "document", id: "ouvriers", titre: "Ouvrières et ouvriers",
      rappel: "Les ouvriers travaillent longtemps, pour de faibles salaires, dans des conditions dangereuses. Ils luttent : grèves, syndicats.",
      texte: [
        "Dans les mines, les usines et les ateliers, les ouvriers et les ouvrières travaillent douze à quinze heures par jour, six jours sur sept. Le travail est dur et dangereux : coups de grisou dans les mines, accidents avec les machines.",
        "Les enfants travaillent aussi : une loi de 1841 interdit seulement de les faire travailler avant huit ans dans les grandes usines. Les salaires sont faibles ; les familles vivent souvent à plusieurs dans une seule pièce, sans eau ni chauffage.",
        "Pour améliorer leur sort, les ouvriers s'unissent. En 1864, la grève, l'arrêt collectif du travail, n'est plus un délit ; en 1884, ils peuvent créer des syndicats pour défendre leurs droits. Peu à peu, ils obtiennent des lois : l'école obligatoire éloigne les enfants des usines, la journée de travail raccourcit.",
      ],
      questions: [
        ["Je décris les conditions de travail des ouvriers.", "Douze à quinze heures par jour, six jours sur sept ; un travail dur et dangereux ; des salaires faibles."],
        ["Que dit la loi de 1841 ?", "Elle interdit de faire travailler les enfants de moins de huit ans dans les grandes usines."],
        ["Qu'est-ce qu'une grève ? Qu'est-ce qu'un syndicat ?", "L'arrêt collectif du travail ; une association qui défend les droits des travailleurs."],
      ],
    },
    {
      sorte: "document", id: "bourgeois", titre: "Bourgeoises et bourgeois",
      rappel: "Les bourgeois vivent dans le confort des beaux quartiers. La bourgeoise dirige la maison. Mais en 1900, la France reste un pays de paysans.",
      texte: [
        "Les bourgeois sont les patrons des usines, les banquiers, les grands commerçants, mais aussi les médecins, les avocats, les ingénieurs. Ils vivent dans les beaux quartiers des villes, dans de grands appartements ou des hôtels particuliers, servis par des domestiques. Ils se déplacent en voiture à cheval, vont au théâtre, à l'opéra, en vacances au bord de la mer. Leurs fils vont au lycée.",
        "La bourgeoise dirige la maison et les domestiques, s'occupe de l'éducation des enfants et reçoit. Elle ne travaille pas hors de chez elle : d'après le Code civil, la femme mariée doit obéissance à son mari. À la fin du siècle, des femmes réclament le droit de faire des études et de travailler.",
        "Mais la France reste un pays de paysans : en 1900, plus de la moitié des Français vivent à la campagne.",
      ],
      questions: [
        ["Qui sont les bourgeois ?", "Les patrons, les banquiers, les grands commerçants, les médecins, les avocats, les ingénieurs."],
        ["Je compare le logement d'une famille bourgeoise et celui d'une famille ouvrière.", "Un grand appartement, des domestiques ; une seule pièce, sans eau ni chauffage."],
        ["Je décris le rôle de la bourgeoise.", "Elle dirige la maison et les domestiques, s'occupe de l'éducation des enfants, reçoit."],
      ],
    },
  ],
  evaluation: [
    ["J'explique comment un progrès technique transforme la vie quotidienne.", "Le chemin de fer : on voyage plus vite ; l'électricité : on éclaire les villes ; l'eau courante…"],
    ["Je nomme deux progrès de la médecine.", "Le vaccin contre la rage (Pasteur), l'anesthésie, la désinfection, les rayons X."],
    ["Je décris les conditions de vie des ouvriers et leurs luttes.", "Douze à quinze heures de travail, des salaires faibles, des logements pauvres ; grèves (1864), syndicats (1884)."],
    ["Je décris la vie quotidienne des bourgeois.", "Ils vivent dans les beaux quartiers, avec des domestiques, vont au théâtre, en vacances."],
  ],
};

/**
 * Le front de l'Ouest, de la fin 1914 au printemps 1918, de la mer du Nord à
 * la Suisse — Nieuport, Ypres, Arras, l'Aisne et le Chemin des Dames, Reims,
 * l'Argonne, Verdun, le saillant de Saint-Mihiel, la Lorraine, les Vosges,
 * Thann —, et la frontière de 1871, qui laisse l'Alsace et la Moselle à
 * l'Allemagne. Tracés simplifiés, pour la carte de France.
 */
const FRONT_1914_1918: [number, number][] = [
  [2.73, 51.15], [2.86, 50.98], [2.9, 50.85], [2.93, 50.64], [2.74, 50.42], [2.8, 50.3], [2.68, 50.12], [2.76, 49.98], [2.78, 49.84], [2.76, 49.68],
  [2.96, 49.54], [3.12, 49.44], [3.33, 49.41], [3.6, 49.45], [3.86, 49.43], [4.05, 49.3], [4.45, 49.2], [4.88, 49.2], [5.12, 49.24], [5.42, 49.24],
  [5.6, 49.08], [5.54, 48.9], [5.85, 48.86], [6.05, 48.92], [6.3, 48.8], [6.55, 48.72], [6.86, 48.55], [7.04, 48.4], [7.12, 48.18], [7.19, 47.95],
  [7.15, 47.78], [7.12, 47.62], [7.17, 47.5],
];
const FRONTIERE_1871: [number, number][] = [
  [5.94, 49.5], [5.96, 49.33], [5.98, 49.2], [6.02, 49.04], [6.03, 48.95], [6.2, 48.88], [6.45, 48.76], [6.8, 48.63], [7.0, 48.53], [7.17, 48.51],
  [7.08, 48.3], [7.1, 48.2], [7.02, 48.04], [6.93, 47.92], [6.84, 47.82], [6.97, 47.68], [7.05, 47.58], [7.12, 47.5],
];

/** La carte du front : les batailles, le front à repasser, les territoires tenus par l'Allemagne. Elle sert aussi au programme de 2020. */
const CARTE_FRONT: ExerciceHGCM = {
  sorte: "carte", id: "carte-front", titre: "Le front de l'Ouest, de 1914 à 1918",
  rappel: "De la fin 1914 au printemps 1918, le front va de la mer du Nord à la Suisse. Les grandes batailles : la Marne (1914), Verdun et la Somme (1916), le Chemin des Dames (1917).",
  consignes: [
    "Je repasse en rouge la ligne de front.",
    "Je colorie les territoires tenus par l'Allemagne, puis la case de la légende.",
    "J'écris le nom des batailles numérotées.",
  ],
  carte: {
    fond: "france", cadrage: [-0.5, 46.9, 8.6, 51.4], hauteur: 110,
    numeros: [
      { ou: [3.6, 48.86], nom: "la Marne (1914)" }, { quoi: "verdun", nom: "Verdun (1916)" }, { ou: [2.85, 49.93], nom: "la Somme (1916)" },
      { ou: [3.65, 49.47], nom: "le Chemin des Dames (1917)" },
    ],
    reperes: ["paris"],
    traits: [
      { sorte: "limite", legende: "la ligne de front (fin 1914 – 1918)", liste: [{ par: FRONT_1914_1918 }] },
      { sorte: "frontiere", legende: "la frontière de 1871 à 1918", liste: [{ par: FRONTIERE_1871 }] },
    ],
    aplats: [{ nom: "les territoires tenus par l'Allemagne", couleur: "#c9b8a6", contour: [...FRONT_1914_1918, [10.5, 47.5], [10.5, 52], [2.73, 52]] }],
    banque: true,
    note: "Tracé simplifié. L'Alsace et la Moselle sont allemandes de 1871 à 1918.",
  },
};

/**
 * La ligne de démarcation de juin 1940 à novembre 1942, simplifiée : de la
 * frontière suisse près de Genève, par Dole, Chalon-sur-Saône,
 * Paray-le-Monial, Moulins, Vierzon, Loches, l'est d'Angoulême, Libourne,
 * Mont-de-Marsan et Orthez, jusqu'à la frontière espagnole près de
 * Saint-Jean-Pied-de-Port. Les deux zones la partagent ; leurs contours se
 * referment par la mer et par la Suisse, coupés ensuite à l'Hexagone.
 */
const DEMARCATION_1940: [number, number][] = [
  [5.95, 46.2], [5.75, 46.6], [5.45, 46.95], [4.85, 46.77], [4.12, 46.45], [3.33, 46.56], [2.9, 46.85], [2.07, 47.21], [1.45, 47.28], [1.0, 47.12],
  [0.78, 46.8], [0.68, 46.36], [0.4, 46.0], [0.3, 45.65], [0.0, 45.25], [-0.25, 44.92], [-0.25, 44.55], [-0.45, 44.1], [-0.5, 43.89], [-0.77, 43.49],
  [-1.24, 43.16], [-1.28, 43.1],
];
const PAR_LA_SUISSE: [number, number][] = [[10.5, 46.6], [7.0, 46.6], [6.2, 46.45]];

const CARTE_1940: ExerciceHGCM = {
  sorte: "carte", id: "carte-1940", titre: "La France coupée en deux, de 1940 à 1942",
  rappel: "L'armistice du 22 juin 1940 coupe la France en deux : la zone occupée par l'armée allemande, la zone libre, où siège à Vichy le gouvernement de Pétain. Une ligne de démarcation les sépare.",
  consignes: [
    "Je colorie la zone occupée d'une couleur, la zone libre d'une autre, puis leurs cases dans la légende.",
    "J'écris le nom des lieux numérotés.",
  ],
  carte: {
    fond: "france", cadrage: [-5.3, 41.3, 9.9, 51.3], hauteur: 120,
    numeros: [
      { quoi: "paris", nom: "Paris, en zone occupée" }, { quoi: "vichy", nom: "Vichy, où siège le gouvernement de Pétain" },
      { ou: [-0.6, 49.38], nom: "les plages du Débarquement (6 juin 1944)" }, { quoi: "chambon-sur-lignon", nom: "Le Chambon-sur-Lignon, village de Justes" },
    ],
    traits: [{ sorte: "limite", legende: "la ligne de démarcation", liste: [{ par: DEMARCATION_1940 }] }],
    aplats: [
      { nom: "la zone occupée", couleur: "#a9bfdc", contour: [...DEMARCATION_1940, [-7, 43.1], [-7, 52], [10.5, 52], ...PAR_LA_SUISSE] },
      { nom: "la zone libre", couleur: "#f3d48a", contour: [...DEMARCATION_1940, [-1.28, 41.2], [10.5, 41.2], ...PAR_LA_SUISSE] },
    ],
    banque: true,
    note: "Tracé simplifié. L'Alsace et la Moselle sont annexées par l'Allemagne ; en novembre 1942, l'armée allemande occupe toute la France.",
  },
};

const PREMIERE_GUERRE: ThemeHGCM = {
  id: "premiere-guerre-cm2", classe: "CM2", histoire: true, titre: "La France dans la Première Guerre mondiale (1914 – 1918)",
  question: "Comment la Première Guerre mondiale a-t-elle bouleversé la société française ?",
  frise: {
    titre: "La Première Guerre mondiale (1914 – 1918)", debut: 1913, fin: 1920, pas: 1,
    bandes: [
      { nom: "Paix", debut: 1913, fin: jour(1914, 8, 3), couleur: VERT },
      { nom: "La Première Guerre mondiale", debut: jour(1914, 8, 3), fin: jour(1918, 11, 11), couleur: ROSE, aPlacer: true },
      { nom: "Paix", debut: jour(1918, 11, 11), fin: 1920, couleur: VERT },
      { nom: "Mouvement", debut: jour(1914, 8, 3), fin: jour(1914, 11, 20), couleur: JAUNE, rang: 2 },
      { nom: "Guerre de position : les tranchées", debut: jour(1914, 11, 20), fin: jour(1918, 3, 21), couleur: BRUN, rang: 2, aPlacer: true },
      { nom: "Mouvement", debut: jour(1918, 3, 21), fin: jour(1918, 11, 11), couleur: JAUNE, rang: 2 },
    ],
    reperes: [
      { date: jour(1914, 8, 1), quand: "1er août 1914", quoi: "La mobilisation générale en France" },
      { date: jour(1914, 9, 6), quand: "Septembre 1914", quoi: "La bataille de la Marne" },
      { date: jour(1916, 2, 21), quand: "1916", quoi: "La bataille de Verdun, dix mois de combats" },
      { date: jour(1918, 11, 11), quand: "11 novembre 1918", quoi: "L'armistice" },
      { date: jour(1919, 6, 28), quand: "1919", quoi: "Le traité de Versailles" },
    ],
  },
  motsCles: [
    ["l'armistice", "L'accord qui arrête les combats : le 11 novembre 1918."],
    ["la guerre de mouvement", "Les armées avancent et reculent rapidement."],
    ["la guerre de position", "Les armées s'enterrent dans des tranchées ; le front ne bouge presque plus."],
    ["le poilu", "Le surnom des soldats français de la Première Guerre mondiale."],
    ["le front", "La ligne où les armées s'affrontent."],
    ["la tranchée", "Le fossé creusé où vivent et combattent les soldats."],
    ["l'arrière", "Le reste du pays, loin des combats."],
  ],
  exercices: [
    {
      sorte: "document", id: "tranchees", titre: "La vie des poilus au front",
      rappel: "Dans les tranchées, les poilus vivent dans la boue, le froid, la peur, sous les obus. À Verdun, en 1916, les combats durent dix mois.",
      texte: [
        "Après les premiers mois de 1914, les armées s'enterrent dans des tranchées, de la mer du Nord à la Suisse : c'est la guerre de position. Les soldats français, les poilus, vivent dans la boue et le froid, au milieu des rats et des poux. Ils mangent froid, dorment peu, attendent la soupe, les lettres et la relève.",
        "Les obus tombent jour et nuit ; à partir de 1915, les gaz brûlent les yeux et les poumons. Au signal, les soldats sortent de la tranchée pour l'assaut, sous le feu des mitrailleuses, vers la tranchée ennemie.",
        "À Verdun, en 1916, Français et Allemands se battent pendant dix mois : plus de 300 000 soldats y meurent. Les lettres et les carnets des poilus racontent la peur, la fatigue, la camaraderie, et la pensée de la famille restée à l'arrière.",
      ],
      questions: [
        ["Qu'est-ce que la guerre de position ?", "Les armées s'enterrent dans des tranchées ; le front ne bouge presque plus."],
        ["Je relève trois difficultés de la vie des poilus.", "La boue, le froid, les rats, les poux, les obus, les gaz, le manque de sommeil."],
        ["Combien de temps dure la bataille de Verdun ? Combien de soldats y meurent ?", "Dix mois ; plus de 300 000."],
        ["Que racontent les lettres des poilus ?", "La peur, la fatigue, la camaraderie, la pensée de la famille."],
      ],
    },
    {
      sorte: "trier", id: "mouvement-position", titre: "Guerre de mouvement ou guerre de position ?",
      consigne: "Je lis chaque étiquette. Je l'écris dans la bonne colonne : guerre de mouvement, ou guerre de position.",
      rappel: "1914 et 1918 : la guerre de mouvement. De la fin 1914 au printemps 1918 : la guerre de position, dans les tranchées.",
      colonnes: ["Guerre de mouvement", "Guerre de position"],
      items: [
        ["les armées avancent ou reculent vite", 0], ["août et septembre 1914", 0], ["la bataille de la Marne", 0], ["les offensives du printemps et de l'été 1918", 0],
        ["les soldats creusent des tranchées", 1], ["le front ne bouge presque plus", 1], ["de la fin 1914 au début de 1918", 1], ["la bataille de Verdun", 1],
      ],
    },
    CARTE_FRONT,
    {
      sorte: "document", id: "arriere", titre: "Toute la population mobilisée",
      rappel: "À l'arrière, les femmes remplacent les hommes ; les usines fabriquent des armes ; les colonies envoient des soldats et des travailleurs.",
      texte: [
        "Les hommes sont partis au front : ce sont les femmes qui les remplacent. Dans les campagnes, elles labourent, sèment, moissonnent. En ville, elles conduisent les tramways, distribuent le courrier, et des centaines de milliers d'ouvrières, les « munitionnettes », fabriquent les obus dans les usines d'armement. D'autres soignent les blessés comme infirmières.",
        "Toute l'économie travaille pour la guerre : les usines fabriquent des canons, des obus, des camions, des avions. La France fait aussi venir des soldats et des travailleurs de ses colonies : des tirailleurs sénégalais, algériens, malgaches, indochinois combattent sur le front.",
        "Les journaux, les affiches, les cartes postales, les livres pour enfants encouragent à tenir : c'est la propagande. L'État demande aux Français de lui prêter leur argent pour payer la guerre.",
      ],
      questions: [
        ["Comment les femmes participent-elles à la guerre ?", "Elles remplacent les hommes aux champs, dans les usines et les transports ; elles soignent les blessés."],
        ["Que fabriquent les usines ?", "Des canons, des obus, des camions, des avions."],
        ["Qui vient des colonies ?", "Des soldats, les tirailleurs, et des travailleurs."],
        ["Qu'est-ce que la propagande ?", "Des journaux, des affiches, des images qui encouragent la population à soutenir la guerre."],
      ],
    },
    {
      sorte: "document", id: "bilan-1918", titre: "Le bilan humain de la guerre",
      rappel: "La guerre a fait environ 10 millions de morts au combat, dont 1,4 million de Français. Chaque commune a son monument aux morts.",
      texte: [
        "La Première Guerre mondiale a fait environ 10 millions de morts au combat, dont 1,4 million de Français. Des millions de soldats reviennent blessés : certains ont perdu un bras, une jambe ; ceux qu'on appelle les « gueules cassées » ont le visage défiguré.",
        "Des centaines de milliers de femmes sont devenues veuves, et des enfants, orphelins : l'État les adopte, ce sont les « pupilles de la Nation ».",
        "Dans presque toutes les communes de France, on élève un monument aux morts, où sont gravés les noms des soldats tués. Chaque 11 novembre, on s'y rassemble pour se souvenir.",
      ],
      questions: [
        ["Combien de soldats sont morts au combat ? Combien de Français ?", "Environ 10 millions ; 1,4 million de Français."],
        ["Qui sont les « gueules cassées » ?", "Des soldats revenus avec le visage défiguré."],
        ["Qu'est-ce qu'un pupille de la Nation ?", "Un orphelin de guerre que l'État adopte."],
        ["Sur le monument aux morts de ma commune, je compte les noms des soldats de 1914 – 1918.", "La réponse dépend de la commune."],
      ],
    },
  ],
  evaluation: [
    ["Je raconte la vie des poilus dans les tranchées.", "La boue, le froid, les rats, les obus, les gaz, les assauts ; la peur et la camaraderie."],
    ["J'explique comment toute la population participe à la guerre, en particulier les femmes.", "Les femmes remplacent les hommes aux champs, dans les usines d'armement, les transports ; elles soignent ; les colonies envoient soldats et travailleurs."],
    ["Je cite le nombre de morts au combat.", "Environ 10 millions, dont 1,4 million de Français."],
  ],
};

const SECONDE_GUERRE: ThemeHGCM = {
  id: "seconde-guerre-cm2", classe: "CM2", histoire: true, titre: "La France pendant la Seconde Guerre mondiale (1939 – 1945)",
  question: "Comment la France a-t-elle vécu la défaite, l'Occupation puis la Libération ?",
  frise: {
    titre: "La France dans la Seconde Guerre mondiale (1939 – 1945)", debut: 1939, fin: 1946, pas: 1,
    bandes: [
      { nom: "« Drôle de guerre »", debut: jour(1939, 9, 3), fin: jour(1940, 5, 10), couleur: JAUNE, aPlacer: true },
      { nom: "Défaite", debut: jour(1940, 5, 10), fin: jour(1940, 6, 22), couleur: ROSE },
      { nom: "Occupation et collaboration", debut: jour(1940, 6, 22), fin: jour(1944, 6, 6), couleur: BRUN, aPlacer: true },
      { nom: "Libération", debut: jour(1944, 6, 6), fin: jour(1945, 5, 8), couleur: VERT, aPlacer: true },
      { nom: "Paix", debut: jour(1945, 5, 8), fin: 1946, couleur: BLEU },
      { nom: "Le régime de Vichy", debut: jour(1940, 7, 10), fin: jour(1944, 8, 20), couleur: GRIS, rang: 2 },
    ],
    reperes: [
      { date: jour(1939, 9, 3), quand: "3 septembre 1939", quoi: "La France et le Royaume-Uni déclarent la guerre à l'Allemagne" },
      { date: jour(1940, 6, 18), quand: "18 juin 1940", quoi: "L'appel du général de Gaulle" },
      { date: jour(1942, 7, 16), quand: "Juillet 1942", quoi: "La rafle du Vel d'Hiv" },
      { date: jour(1944, 6, 6), quand: "6 juin 1944", quoi: "Le débarquement des Alliés en Normandie" },
      { date: jour(1944, 8, 25), quand: "25 août 1944", quoi: "La libération de Paris" },
      { date: jour(1945, 5, 8), quand: "8 mai 1945", quoi: "La capitulation de l'Allemagne nazie" },
    ],
  },
  motsCles: [
    ["l'antisémitisme", "La haine des Juifs."],
    ["la collaboration", "La politique du régime de Vichy, qui aide l'Allemagne nazie."],
    ["le nazisme", "L'idéologie raciste et antisémite d'Hitler, au pouvoir en Allemagne de 1933 à 1945."],
    ["le régime de Vichy", "Le gouvernement du maréchal Pétain, installé à Vichy de 1940 à 1944."],
    ["la Résistance", "Ceux et celles qui luttent contre l'occupant allemand et contre Vichy."],
    ["l'Occupation", "La présence de l'armée allemande en France, de 1940 à 1944."],
    ["la Libération", "Le moment où la France est délivrée de l'occupant, en 1944 et 1945."],
    ["la déportation", "L'envoi de force dans des camps de concentration ou d'extermination."],
  ],
  exercices: [
    {
      sorte: "ordonner", id: "etapes-39-45", titre: "Les étapes de la guerre en France",
      consigne: "Je lis les étapes. J'écris dans chaque case le numéro de l'étape, dans l'ordre : 1 pour la première.",
      rappel: "La « drôle de guerre », la défaite de juin 1940, l'Occupation et la collaboration, la Libération.",
      etapes: [
        "La « drôle de guerre » : la France et le Royaume-Uni sont en guerre contre l'Allemagne, mais les armées attendent sans combattre.",
        "L'armée allemande envahit la France : c'est la défaite.",
        "L'armistice : la France est coupée en deux, une zone occupée et une zone libre.",
        "Le maréchal Pétain reçoit les pleins pouvoirs ; le régime de Vichy collabore avec l'Allemagne.",
        "L'armée allemande occupe toute la France.",
        "Les Alliés débarquent en Normandie : la Libération commence.",
        "L'Allemagne nazie capitule.",
      ],
      dates: ["Septembre 1939 – mai 1940", "Mai – juin 1940", "22 juin 1940", "Juillet 1940", "Novembre 1942", "6 juin 1944", "8 mai 1945"],
    },
    {
      sorte: "document", id: "occupation", titre: "Vivre sous l'Occupation",
      rappel: "Sous l'Occupation, tout manque : on vit avec des tickets de rationnement, le couvre-feu, la ligne de démarcation, la peur.",
      texte: [
        "Pendant quatre ans, l'armée allemande occupe la France. L'occupant prend une grande partie de la nourriture, du charbon, des produits des usines. Tout manque : pour acheter du pain, de la viande, du sucre, il faut des tickets de rationnement, et faire la queue des heures devant les magasins. On a froid l'hiver ; on remplace le café par de l'orge grillée, les semelles de cuir par du bois.",
        "Un couvre-feu interdit de sortir la nuit. Une ligne de démarcation sépare la zone occupée de la zone libre : il faut un laissez-passer pour la franchir. Les lettres sont lues, les journaux et la radio contrôlés.",
        "À partir de 1943, des jeunes hommes doivent partir travailler en Allemagne : c'est le Service du travail obligatoire. Beaucoup refusent, se cachent, et rejoignent les maquis de la Résistance.",
      ],
      questions: [
        ["Pourquoi tout manque-t-il ?", "L'occupant prend une grande partie de la nourriture, du charbon, des produits des usines."],
        ["Qu'est-ce qu'un ticket de rationnement ?", "Un ticket qui donne droit à une petite quantité de nourriture."],
        ["Je relève deux autres difficultés de la vie sous l'Occupation.", "Le couvre-feu, la ligne de démarcation, la censure, le Service du travail obligatoire."],
      ],
    },
    CARTE_1940,
    {
      sorte: "document", id: "resister", titre: "Résister : le général de Gaulle et Jean Moulin",
      rappel: "Le 18 juin 1940, de Gaulle appelle à continuer le combat. En France, Jean Moulin unit la Résistance.",
      texte: [
        "Le 18 juin 1940, depuis Londres, à la radio de la BBC, le général de Gaulle appelle les Français à continuer le combat : « la flamme de la résistance française ne doit pas s'éteindre et ne s'éteindra pas ». Il crée la France libre, dont les soldats combattent aux côtés des Alliés.",
        "En France, des hommes et des femmes résistent : ils impriment des journaux clandestins, cachent des personnes recherchées, transmettent des renseignements aux Alliés, sabotent des voies ferrées. Des femmes comme Lucie Aubrac ou Germaine Tillion s'engagent.",
        "Jean Moulin, envoyé par de Gaulle, unit les mouvements de résistance dans le Conseil national de la Résistance, en mai 1943. Arrêté en juin 1943, torturé, il meurt sans avoir parlé.",
      ],
      questions: [
        ["Que demande le général de Gaulle le 18 juin 1940 ?", "Il appelle les Français à continuer le combat."],
        ["Je relève trois actions des résistants.", "Imprimer des journaux clandestins, cacher des personnes, renseigner les Alliés, saboter des voies ferrées."],
        ["Quel est le rôle de Jean Moulin ?", "Il unit les mouvements de résistance dans le Conseil national de la Résistance (1943)."],
      ],
    },
    {
      sorte: "document", id: "vichy-juifs", titre: "Vichy et la persécution des Juifs",
      rappel: "Le régime de Vichy, antisémite, collabore avec l'Allemagne nazie et participe à la déportation des Juifs. Des Justes en sauvent au péril de leur vie.",
      texte: [
        "Le régime de Vichy, dirigé par le maréchal Pétain, collabore avec l'Allemagne nazie, qui veut exterminer les Juifs d'Europe. Dès octobre 1940, Vichy adopte des lois antisémites : les Juifs sont exclus de nombreux métiers, puis leurs biens sont confisqués. En zone occupée, à partir de juin 1942, ils doivent porter une étoile jaune.",
        "Les 16 et 17 juillet 1942, à Paris, la police française arrête plus de 13 000 Juifs, dont plus de 4 000 enfants ; la plupart des familles sont enfermées au Vélodrome d'Hiver : c'est la rafle du Vel d'Hiv. Ils sont ensuite déportés vers le camp d'extermination d'Auschwitz. Environ 76 000 Juifs ont été déportés de France ; très peu sont revenus. Les Tsiganes, eux, ont été internés dans des camps en France.",
        "Des Français ont caché et sauvé des Juifs, au péril de leur vie : l'État d'Israël les honore du titre de « Justes parmi les Nations ». Au Chambon-sur-Lignon, en Haute-Loire, des habitants ont accueilli et caché des milliers de personnes, dont beaucoup d'enfants juifs.",
      ],
      questions: [
        ["Qui dirige le régime de Vichy ? Avec qui collabore-t-il ?", "Le maréchal Pétain ; avec l'Allemagne nazie."],
        ["Que se passe-t-il les 16 et 17 juillet 1942 ?", "La police française arrête plus de 13 000 Juifs à Paris : c'est la rafle du Vel d'Hiv ; ils sont déportés à Auschwitz."],
        ["Qui sont les « Justes parmi les Nations » ?", "Des personnes qui ont caché et sauvé des Juifs, au péril de leur vie."],
      ],
    },
  ],
  evaluation: [
    ["Je remets dans l'ordre : la Libération, la « drôle de guerre », l'Occupation, la défaite.", "La « drôle de guerre », la défaite, l'Occupation, la Libération."],
    ["Je décris deux difficultés de la vie sous l'Occupation.", "Les tickets de rationnement, les queues, le froid, le couvre-feu, la ligne de démarcation, le travail obligatoire."],
    ["J'explique le rôle du général de Gaulle ou celui de Jean Moulin dans la Résistance.", "De Gaulle appelle à continuer le combat le 18 juin 1940 et crée la France libre ; Jean Moulin unit les mouvements de résistance en 1943."],
    ["Je cite le bilan humain de la guerre.", "Entre 60 et 70 millions de morts dans le monde, dont 6 millions de Juifs, 60 % des Juifs d'Europe."],
  ],
};

/** Les 27 pays de l'Union européenne et leur capitale ; les six fondateurs d'abord. */
export const PAYS_UE: [string, string][] = [
  ["l'Allemagne", "Berlin"], ["la Belgique", "Bruxelles"], ["la France", "Paris"], ["l'Italie", "Rome"], ["le Luxembourg", "Luxembourg"], ["les Pays-Bas", "Amsterdam"],
  ["l'Autriche", "Vienne"], ["la Bulgarie", "Sofia"], ["Chypre", "Nicosie"], ["la Croatie", "Zagreb"], ["le Danemark", "Copenhague"], ["l'Espagne", "Madrid"],
  ["l'Estonie", "Tallinn"], ["la Finlande", "Helsinki"], ["la Grèce", "Athènes"], ["la Hongrie", "Budapest"], ["l'Irlande", "Dublin"], ["la Lettonie", "Riga"],
  ["la Lituanie", "Vilnius"], ["Malte", "La Valette"], ["la Pologne", "Varsovie"], ["le Portugal", "Lisbonne"], ["la Roumanie", "Bucarest"], ["la Slovaquie", "Bratislava"],
  ["la Slovénie", "Ljubljana"], ["la Suède", "Stockholm"], ["la Tchéquie", "Prague"],
];

/** Le code de chaque pays de l'Union sur le fond de carte. */
const CODES_UE: Record<string, string> = {
  "l'Allemagne": "DEU", "la Belgique": "BEL", "la France": "FRA", "l'Italie": "ITA", "le Luxembourg": "LUX", "les Pays-Bas": "NLD", "l'Autriche": "AUT", "la Bulgarie": "BGR",
  "Chypre": "CYP", "la Croatie": "HRV", "le Danemark": "DNK", "l'Espagne": "ESP", "l'Estonie": "EST", "la Finlande": "FIN", "la Grèce": "GRC", "la Hongrie": "HUN",
  "l'Irlande": "IRL", "la Lettonie": "LVA", "la Lituanie": "LTU", "Malte": "MLT", "la Pologne": "POL", "le Portugal": "PRT", "la Roumanie": "ROU", "la Slovaquie": "SVK",
  "la Slovénie": "SVN", "la Suède": "SWE", "la Tchéquie": "CZE",
};

/** Les 27 pays sur la carte de l'Europe ; Chypre en entier, comme sur la carte de l'Union. Elle sert aussi au programme de 2020. */
const CARTE_UE: ExerciceHGCM = {
  sorte: "carte", id: "carte-ue", titre: "Les 27 pays de l'Union européenne, sur la carte",
  rappel: "Six pays fondateurs, en 1957 : l'Allemagne, la Belgique, la France, l'Italie, le Luxembourg, les Pays-Bas. Aujourd'hui, l'Union compte 27 pays.",
  consignes: [
    "J'écris le nom des six pays fondateurs, numérotés.",
    "Je colorie les pays fondateurs d'une couleur, les autres pays de l'Union européenne d'une autre, puis leurs cases dans la légende.",
  ],
  carte: {
    fond: "europe",
    colorier: [
      { nom: "les six pays fondateurs (1957)", couleur: "#7ea7dc", formes: PAYS_UE.slice(0, 6).map(([p]) => CODES_UE[p]) },
      { nom: "les 21 autres pays de l'Union européenne", couleur: "#f6d365", formes: [...PAYS_UE.slice(6).map(([p]) => CODES_UE[p]), "CYN"] },
    ],
    numeros: PAYS_UE.slice(0, 6).map(([nom]) => ({ quoi: CODES_UE[nom], nom })),
    banque: true,
  },
};

const DEPUIS_1945: ThemeHGCM = {
  id: "depuis-1945-cm2", classe: "CM2", histoire: true, titre: "La France depuis 1945 : 80 ans de transformations",
  question: "Comment expliquer la longue période de paix et de transformation depuis 1945 ?",
  frise: {
    titre: "La France depuis 1945", debut: 1940, fin: 2030, pas: 10,
    bandes: [
      { nom: "Guerre", debut: 1940, fin: jour(1945, 5, 8), couleur: BRUN },
      { nom: "", debut: jour(1945, 5, 8), fin: jour(1946, 10, 27), couleur: GRIS },
      { nom: "IVe République", debut: jour(1946, 10, 27), fin: jour(1958, 10, 4), couleur: JAUNE },
      { nom: "Ve République", debut: jour(1958, 10, 4), fin: 2030, couleur: ROSE, aPlacer: true },
    ],
    reperes: [
      { date: jour(1944, 4, 21), quand: "1944", quoi: "Le droit de vote des femmes" },
      { date: jour(1945, 10, 4), quand: "1945", quoi: "La création de la Sécurité sociale" },
      { date: jour(1957, 3, 25), quand: "1957", quoi: "Le traité de Rome crée la Communauté économique européenne" },
      { date: jour(1958, 10, 4), quand: "1958", quoi: "La fondation de la Ve République, avec le général de Gaulle" },
      { date: jour(1965, 7, 13), quand: "1965", quoi: "Les Françaises peuvent travailler et ouvrir un compte sans l'autorisation de leur époux" },
      { date: 1992, quand: "1992", quoi: "Le traité de Maastricht crée l'Union européenne" },
      { date: 2002, quand: "1999 – 2002", quoi: "L'euro remplace le franc" },
    ],
  },
  motsCles: [
    ["l'innovation", "Une invention nouvelle qui change la vie : la télévision, le téléphone portable, Internet."],
    ["le loisir", "Le temps libre, et ce qu'on y fait."],
    ["la Sécurité sociale", "L'organisme créé en 1945 qui protège contre la maladie et la vieillesse, et aide les familles."],
    ["la société de consommation", "Une société où l'on achète beaucoup de produits, souvent renouvelés."],
    ["le traité", "Un accord signé entre plusieurs États."],
    ["la Ve République", "La République fondée en 1958, celle d'aujourd'hui."],
  ],
  exercices: [
    {
      sorte: "document", id: "republique-sociale", titre: "Une République démocratique et sociale",
      rappel: "1944 : le droit de vote des femmes ; 1945 : la Sécurité sociale ; 1958 : la Ve République, fondée par le général de Gaulle.",
      texte: [
        "À la Libération, la France se reconstruit. Le 21 avril 1944, le gouvernement provisoire du général de Gaulle accorde le droit de vote aux femmes : elles votent pour la première fois en 1945.",
        "En 1945, la Sécurité sociale est créée : elle rembourse les soins des malades, verse une pension aux personnes âgées et des allocations aux familles. En 1946, une nouvelle constitution fonde la IVe République.",
        "En 1958, en pleine guerre d'Algérie, le général de Gaulle revient au pouvoir et fonde la Ve République, celle d'aujourd'hui. Le président de la République y a un rôle important ; depuis 1962, il est élu par tous les Français et toutes les Françaises.",
      ],
      questions: [
        ["En quelle année les femmes obtiennent-elles le droit de vote ?", "En 1944 ; elles votent pour la première fois en 1945."],
        ["Que fait la Sécurité sociale ?", "Elle rembourse les soins, verse des pensions aux personnes âgées et des allocations aux familles."],
        ["Quand la Ve République est-elle fondée ? Par qui ?", "En 1958, par le général de Gaulle."],
      ],
    },
    {
      sorte: "relier", id: "droits-femmes", titre: "Des droits pour les femmes",
      consigne: "Je relie chaque date au droit obtenu par les femmes.",
      rappel: "Depuis 1944, les femmes obtiennent peu à peu les mêmes droits que les hommes : voter, travailler librement, être payées autant.",
      paires: [
        ["1944", "Les femmes obtiennent le droit de vote."],
        ["1946", "La Constitution garantit aux femmes des droits égaux à ceux des hommes."],
        ["1965", "Une femme mariée peut travailler et ouvrir un compte en banque sans l'autorisation de son mari."],
        ["1972", "À travail égal, salaire égal : la loi impose la même paie aux femmes et aux hommes."],
        ["2000", "La loi sur la parité : autant de candidates que de candidats à de nombreuses élections."],
      ],
    },
    {
      sorte: "trier", id: "vie-change", titre: "La vie a changé",
      consigne: "Je lis chaque étiquette. Je l'écris dans la bonne colonne : vers 1950, ou aujourd'hui.",
      rappel: "Depuis 1945, la société s'est transformée : les transports, les appareils de la maison, les loisirs, les métiers, la façon de communiquer.",
      colonnes: ["Vers 1950", "Aujourd'hui"],
      items: [
        ["on lave le linge à la main", 0], ["la plupart des familles n'ont pas de voiture", 0], ["on écoute la radio", 0], ["on écrit des lettres", 0], ["près d'un Français sur trois travaille dans l'agriculture", 0], ["on fait ses courses chez l'épicier", 0],
        ["la machine à laver", 1], ["la plupart des familles ont une voiture", 1], ["on regarde des vidéos sur Internet", 1], ["on envoie des messages avec un téléphone portable", 1], ["moins de trois Français sur cent travaillent dans l'agriculture", 1], ["on fait ses courses au supermarché ou en ligne", 1],
      ],
    },
    {
      sorte: "document", id: "europe", titre: "Les étapes de la construction européenne",
      rappel: "1951 : le charbon et l'acier en commun ; 1957 : le traité de Rome ; 1992 : le traité de Maastricht ; 2002 : l'euro dans les porte-monnaie.",
      texte: [
        "Après deux guerres mondiales, des Européens veulent rendre la guerre impossible entre leurs pays. En 1951, six pays — la France, l'Allemagne de l'Ouest, l'Italie, la Belgique, les Pays-Bas et le Luxembourg — mettent en commun leur charbon et leur acier.",
        "En 1957, par le traité de Rome, ils créent la Communauté économique européenne : un marché commun où les marchandises circulent librement. D'autres pays les rejoignent peu à peu.",
        "En 1992, le traité de Maastricht crée l'Union européenne : ses habitants deviennent aussi citoyens européens. L'euro naît en 1999 ; en 2002, ses pièces et ses billets remplacent le franc dans les porte-monnaie. Aujourd'hui, l'Union européenne compte 27 pays.",
      ],
      questions: [
        ["Pourquoi les Européens veulent-ils s'unir après 1945 ?", "Pour rendre la guerre impossible entre leurs pays."],
        ["Quels sont les six pays fondateurs ?", "La France, l'Allemagne de l'Ouest, l'Italie, la Belgique, les Pays-Bas, le Luxembourg."],
        ["Que crée le traité de Rome en 1957 ? Et celui de Maastricht en 1992 ?", "La Communauté économique européenne ; l'Union européenne."],
      ],
    },
    CARTE_UE,
  ],
  evaluation: [
    ["Je cite un exemple de réforme sociale et un exemple de droit des femmes.", "La Sécurité sociale (1945) ; le droit de vote des femmes (1944), le droit de travailler sans l'autorisation du mari (1965)."],
    ["Je cite la date de la fondation de la Ve République.", "1958."],
    ["Je décris deux transformations de la société française depuis 1945.", "La voiture, les appareils ménagers, la télévision puis Internet, les supermarchés, les loisirs ; moins de paysans."],
    ["Je raconte deux étapes de la construction européenne.", "1957, le traité de Rome ; 1992, le traité de Maastricht ; 2002, l'euro."],
  ],
};

// ── Géographie, CM1 : la diversité des modes de vie dans le monde ─────────

/** Les huit aires régionales du thème, pays par pays : le Maghreb, ses trois pays et le Sahara occidental ; l'Afrique subsaharienne, comme la Banque mondiale. */
const AIRES_REGIONALES: CarteHGCM["colorier"] = [
  { nom: "l'Amérique du Nord", couleur: "#80b1d3", formes: ["USA", "CAN"] },
  { nom: "l'Amérique du Sud", couleur: "#b3de69", formes: ["ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUY", "PRY", "PER", "SUR", "URY", "VEN", "GUF"] },
  { nom: "l'Europe", couleur: "#bebada", formes: ["@europe"] },
  { nom: "le Maghreb", couleur: "#ffed6f", formes: ["MAR", "SAH", "DZA", "TUN"] },
  {
    nom: "l'Afrique subsaharienne", couleur: "#fdb462",
    formes: ["MRT", "SEN", "GMB", "GNB", "GIN", "SLE", "LBR", "CIV", "MLI", "BFA", "GHA", "TGO", "BEN", "NER", "NGA", "TCD", "SDN", "SDS", "ETH", "ERI", "DJI", "SOM", "SOL",
      "KEN", "UGA", "RWA", "BDI", "TZA", "CMR", "CAF", "GNQ", "GAB", "COG", "COD", "AGO", "ZMB", "MWI", "MOZ", "ZWE", "NAM", "BWA", "ZAF", "LSO", "SWZ", "MDG", "COM", "MUS"],
  },
  { nom: "l'Asie de l'Est", couleur: "#fb8072", formes: ["CHN", "JPN", "KOR", "PRK", "MNG", "TWN"] },
  { nom: "l'Asie du Sud-Est", couleur: "#fccde5", formes: ["MMR", "THA", "LAO", "KHM", "VNM", "MYS", "IDN", "BRN", "PHL", "TLS"] },
  { nom: "l'Océanie", couleur: "#8dd3c7", formes: ["AUS", "NZL", "PNG", "FJI", "SLB", "VUT", "NCL", "PYF", "WSM"] },
];

const SE_NOURRIR: ThemeHGCM = {
  id: "se-nourrir-cm1", classe: "CM1", histoire: false, titre: "Se nourrir",
  question: "Comment se nourrit-on dans le monde ?",
  motsCles: [
    ["la malnutrition", "Une alimentation déséquilibrée : il manque des aliments utiles, ou il y en a trop."],
    ["la sous-nutrition", "Le fait de ne pas manger assez pour être en bonne santé."],
    ["le produit agricole", "Un produit tel qu'il sort de la ferme : le lait, le blé, la pomme."],
    ["le produit alimentaire transformé", "Un aliment fabriqué à partir de produits agricoles : le yaourt, le pain, la compote."],
    ["la ration alimentaire", "La quantité de nourriture qu'une personne mange chaque jour."],
  ],
  lieux: ["les États-Unis (Amérique)", "la France (Europe)", "Madagascar (Afrique)", "Haïti (Amérique)", "la Côte d'Ivoire", "le Brésil", "l'Espagne", "l'Inde"],
  exercices: [
    {
      sorte: "relier", id: "provenance", titre: "D'où viennent nos aliments ?",
      consigne: "Je relie chaque aliment au pays ou à la région d'où il vient souvent. Puis je les localise sur le planisphère.",
      rappel: "Une partie de ce que nous mangeons vient de France ; une autre vient de loin : les bananes, le cacao, le café, le riz.",
      paires: [
        ["la banane", "les Antilles, la Côte d'Ivoire"],
        ["le cacao du chocolat", "la Côte d'Ivoire, le Ghana"],
        ["le café", "le Brésil, le Viêt Nam"],
        ["le riz", "l'Asie, et la Camargue en France"],
        ["l'orange", "l'Espagne, le Maroc"],
        ["le blé du pain", "les plaines de France, comme la Beauce"],
      ],
    },
    {
      sorte: "carte", id: "carte-provenance", titre: "D'où viennent nos aliments ? Sur le planisphère",
      rappel: "Une partie de ce que nous mangeons vient de France ; une autre vient de loin : les bananes, le cacao, le café, le riz.",
      consignes: ["J'écris le nom des pays et de la région d'où viennent nos aliments, à côté de leur numéro."],
      carte: {
        fond: "monde",
        numeros: [
          { quoi: "FRA", nom: "la France" }, { quoi: "ESP", nom: "l'Espagne" }, { quoi: "MAR", nom: "le Maroc" }, { quoi: "CIV", nom: "la Côte d'Ivoire" },
          { quoi: "GHA", nom: "le Ghana" }, { quoi: "BRA", nom: "le Brésil" }, { quoi: "VNM", nom: "le Viêt Nam" }, { ou: [-61.2, 15.3], nom: "les Antilles" },
        ],
        banque: true,
      },
    },
    {
      sorte: "trier", id: "agricole-transforme", titre: "Produit agricole ou produit transformé ?",
      consigne: "Je lis chaque aliment. Je l'écris dans la bonne colonne : produit agricole, ou produit alimentaire transformé.",
      rappel: "Un produit agricole sort de la ferme ; un produit transformé est fabriqué à partir de produits agricoles, souvent en usine.",
      colonnes: ["Produit agricole", "Produit alimentaire transformé"],
      items: [
        ["le lait", 0], ["le blé", 0], ["la pomme", 0], ["les fèves de cacao", 0], ["la pomme de terre", 0], ["le raisin", 0], ["la tomate", 0],
        ["le yaourt", 1], ["le pain", 1], ["la compote", 1], ["le chocolat", 1], ["les chips", 1], ["le jus de raisin", 1], ["le ketchup", 1],
      ],
    },
    {
      sorte: "ordonner", id: "chaine-yaourt", titre: "La chaîne de production d'un yaourt",
      consigne: "Je lis les étapes. J'écris dans chaque case le numéro de l'étape, dans l'ordre : 1 pour la première.",
      rappel: "Du lait de la ferme au yaourt du réfrigérateur : l'élevage, la collecte, la laiterie, l'emballage, le transport, le magasin.",
      etapes: [
        "À la ferme, l'éleveur nourrit et trait les vaches.",
        "Un camion-citerne collecte le lait à la ferme.",
        "À la laiterie, le lait est analysé, puis chauffé pour détruire les microbes.",
        "On ajoute des ferments : le lait devient yaourt dans ses pots, au chaud.",
        "Les yaourts sont refroidis, emballés et étiquetés.",
        "Des camions frigorifiques les transportent jusqu'aux magasins.",
        "Le consommateur les achète et les garde au réfrigérateur.",
      ],
    },
    {
      sorte: "document", id: "manger-monde", titre: "Manger dans le monde",
      rappel: "Dans un pays riche, on mange à sa faim, souvent trop ; dans un pays en développement, beaucoup ne mangent pas assez ou mal.",
      texte: [
        "Dans un pays riche, comme les États-Unis ou la France, la plupart des habitants mangent à leur faim. Ils achètent surtout des produits transformés, au supermarché, venus parfois de très loin. Ils mangent souvent trop de sucre, de graisses et de viande : beaucoup de personnes sont en surpoids.",
        "Dans un pays en développement, comme Madagascar ou Haïti, une grande partie de la population ne mange pas assez : c'est la sous-nutrition. D'autres mangent assez, mais pas assez varié : c'est la malnutrition. Beaucoup de familles cultivent elles-mêmes ce qu'elles mangent : du riz, du maïs, du manioc. Une mauvaise récolte, une sécheresse, un cyclone ou une guerre peuvent provoquer la faim.",
        "Dans le monde, près de 700 millions de personnes souffrent de la faim.",
      ],
      questions: [
        ["Je décris l'alimentation dans un pays riche.", "On mange à sa faim, surtout des produits transformés achetés au supermarché, souvent trop sucrés et trop gras."],
        ["Quelle est la différence entre la sous-nutrition et la malnutrition ?", "Sous-nutrition : ne pas manger assez ; malnutrition : manger de façon déséquilibrée."],
        ["Je nomme deux pays à ration alimentaire très riche et deux pays à ration insuffisante, avec leur continent.", "Les États-Unis (Amérique), la France (Europe) ; Madagascar (Afrique), Haïti (Amérique)."],
      ],
    },
    {
      sorte: "carte", id: "carte-quatre-pays", titre: "Quatre pays et leur continent, sur le planisphère",
      rappel: "Les États-Unis (Amérique) et la France (Europe) ont une ration alimentaire très riche ; à Madagascar (Afrique) et en Haïti (Amérique), beaucoup ne mangent pas assez.",
      consignes: ["J'écris le nom des quatre pays numérotés, puis celui des continents."],
      carte: {
        fond: "monde",
        numeros: [
          { quoi: "USA", nom: "les États-Unis" }, { quoi: "FRA", nom: "la France" }, { quoi: "MDG", nom: "Madagascar" }, { quoi: "HTI", nom: "Haïti" },
          { ou: [-62, -10], nom: "l'Amérique" }, { ou: [28, 54], nom: "l'Europe" }, { ou: [20, 8], nom: "l'Afrique" }, { ou: [95, 45], nom: "l'Asie" }, { ou: [134, -25], nom: "l'Océanie" },
        ],
        banque: true,
      },
    },
  ],
  evaluation: [
    ["Je décris une différence entre l'alimentation d'un pays riche et celle d'un pays en développement.", "Dans un pays riche, on mange à sa faim, souvent trop, des produits transformés ; dans un pays en développement, beaucoup ne mangent pas assez."],
    ["J'explique la différence entre un produit agricole et un produit transformé, avec un exemple.", "Le produit agricole sort de la ferme (le lait) ; le produit transformé est fabriqué à partir de lui (le yaourt)."],
    ["Je décris la chaîne de production d'un aliment.", "La ferme, la collecte, l'usine ou la laiterie, l'emballage, le transport, le magasin, le consommateur."],
  ],
};

const INEGALITES: ThemeHGCM = {
  id: "inegalites-monde-cm1", classe: "CM1", histoire: false, titre: "Les inégalités dans le monde",
  question: "Comment décrire les inégalités de niveau de vie dans le monde ?",
  motsCles: [
    ["les inégalités", "Les différences de richesse, d'accès à l'eau, à la santé, à l'école entre les personnes ou les pays."],
    ["l'aire régionale", "Une grande partie d'un continent, qui regroupe des pays voisins."],
    ["le niveau de vie", "Ce que les habitants peuvent se payer, et leurs conditions de vie."],
    ["l'eau potable", "L'eau qu'on peut boire sans danger."],
  ],
  lieux: ["l'Afrique subsaharienne", "le Maghreb", "l'Amérique du Nord", "l'Amérique du Sud", "l'Asie du Sud-Est", "l'Asie de l'Est", "l'Europe", "l'Océanie"],
  exercices: [
    {
      sorte: "relier", id: "aires", titre: "Les aires régionales",
      consigne: "Je relie chaque aire régionale à des pays qui en font partie. Puis je la colorie sur le planisphère.",
      rappel: "Huit aires régionales : l'Afrique subsaharienne, le Maghreb, l'Amérique du Nord, l'Amérique du Sud, l'Asie du Sud-Est, l'Asie de l'Est, l'Europe, l'Océanie.",
      paires: [
        ["l'Afrique subsaharienne", "le Sénégal, le Kenya"], ["le Maghreb", "le Maroc, l'Algérie, la Tunisie"], ["l'Amérique du Nord", "les États-Unis, le Canada"],
        ["l'Amérique du Sud", "le Brésil, l'Argentine"], ["l'Asie du Sud-Est", "le Viêt Nam, l'Indonésie"], ["l'Asie de l'Est", "la Chine, le Japon"],
        ["l'Europe", "la France, l'Allemagne"], ["l'Océanie", "l'Australie, la Nouvelle-Zélande"],
      ],
    },
    {
      sorte: "carte", id: "carte-aires", titre: "Les aires régionales, sur le planisphère",
      rappel: "Huit aires régionales : l'Afrique subsaharienne, le Maghreb, l'Amérique du Nord, l'Amérique du Sud, l'Asie du Sud-Est, l'Asie de l'Est, l'Europe, l'Océanie.",
      consignes: ["Je choisis une couleur pour chaque aire régionale de la légende : je colorie sa case, puis l'aire sur le planisphère."],
      carte: { fond: "monde", colorier: AIRES_REGIONALES },
    },
    {
      sorte: "document", id: "eau-potable", titre: "L'accès à l'eau potable",
      rappel: "Plus de deux milliards de personnes n'ont pas d'eau potable sûre chez elles : c'est une grande inégalité dans le monde.",
      texte: [
        "Ouvrir un robinet et boire une eau saine : en France, c'est un geste de tous les jours. Dans le monde, plus de deux milliards de personnes n'ont pas accès chez elles à une eau potable sûre.",
        "En Afrique subsaharienne, dans les villages, ce sont surtout les femmes et les filles qui vont chercher l'eau au puits, à la rivière ou à la borne-fontaine, parfois à plusieurs kilomètres : cette corvée prend des heures chaque jour, et des filles manquent l'école.",
        "L'eau sale transmet des maladies, comme le choléra ou les diarrhées, qui tuent chaque année des centaines de milliers d'enfants. Des puits, des pompes, des réseaux d'eau permettent de réduire ces inégalités.",
      ],
      questions: [
        ["Combien de personnes n'ont pas accès à une eau potable sûre ?", "Plus de deux milliards."],
        ["Qui va chercher l'eau dans les villages ? Avec quelles conséquences ?", "Les femmes et les filles ; cela prend des heures, et des filles manquent l'école."],
        ["Pourquoi l'eau sale est-elle dangereuse ?", "Elle transmet des maladies, comme le choléra et les diarrhées."],
      ],
    },
    {
      sorte: "document", id: "ecole-monde", titre: "Aller à l'école dans le monde",
      rappel: "Environ 250 millions d'enfants et de jeunes ne vont pas à l'école, surtout en Afrique subsaharienne et en Asie du Sud.",
      texte: [
        "En France, l'instruction est obligatoire de 3 à 16 ans. Dans le monde, environ 250 millions d'enfants et de jeunes ne vont pas à l'école. La plupart vivent en Afrique subsaharienne et en Asie du Sud.",
        "Certains doivent travailler pour aider leur famille ; d'autres vivent trop loin d'une école, ou dans un pays en guerre. Dans plusieurs pays, les filles sont plus souvent privées d'école que les garçons. Dans certaines classes, il y a plus de soixante élèves pour un seul enseignant, sans livres ni électricité.",
      ],
      questions: [
        ["Combien d'enfants et de jeunes ne vont pas à l'école dans le monde ?", "Environ 250 millions."],
        ["Dans quelles aires régionales vivent la plupart d'entre eux ?", "En Afrique subsaharienne et en Asie du Sud."],
        ["Je relève deux raisons pour lesquelles des enfants ne vont pas à l'école.", "Ils travaillent pour aider leur famille ; l'école est trop loin ; la guerre ; ce sont des filles."],
      ],
    },
    {
      sorte: "tableau", id: "deux-familles", titre: "Comparer deux familles",
      consigne: "J'observe les photographies de deux familles, dans deux pays. Je complète le tableau. Puis j'écris une phrase qui compare leur niveau de vie.",
      rappel: "Le logement, l'eau, l'école, la santé, les revenus : on compare le niveau de vie avec des indices précis.",
      entetes: ["", "Famille 1 : …………………", "Famille 2 : …………………"],
      lignes: [["Le pays et l'aire régionale", "", ""], ["Le logement", "", ""], ["L'accès à l'eau", "", ""], ["L'école des enfants", "", ""], ["La santé, les soins", "", ""], ["Les revenus du mois", "", ""]],
    },
  ],
  evaluation: [
    ["Je nomme trois aires régionales et un pays de chacune.", "L'Afrique subsaharienne (le Sénégal), le Maghreb (le Maroc), l'Amérique du Nord (les États-Unis)…"],
    ["Je décris une inégalité de niveau de vie dans le monde : l'accès à l'eau, à la santé ou à l'école.", "Plus de deux milliards de personnes sans eau potable sûre ; 250 millions d'enfants sans école…"],
  ],
};

const SE_DEPLACER: ThemeHGCM = {
  id: "se-deplacer-cm1", classe: "CM1", histoire: false, titre: "Se déplacer",
  question: "Comment se déplace-t-on dans le monde ?",
  motsCles: [
    ["l'avion, l'aéroport", "L'avion décolle et atterrit à l'aéroport."],
    ["le bateau, le port", "Le bateau s'amarre au port."],
    ["la marche, le trottoir", "Le piéton marche sur le trottoir et traverse au passage piéton."],
    ["le métro, la station", "Le métro s'arrête à la station."],
    ["le train, la gare", "Le train s'arrête à la gare."],
    ["le vélo, la voie cyclable", "Le vélo roule sur la piste ou la bande cyclable."],
    ["la voiture, la route", "La voiture roule sur la route et l'autoroute."],
    ["la distance en kilomètres", "La longueur du trajet."],
    ["la distance en temps", "La durée du trajet."],
  ],
  exercices: [
    {
      sorte: "tableau", id: "mes-deplacements", titre: "Mes déplacements",
      consigne: "Je complète le tableau avec mes déplacements. J'écris la distance en kilomètres et la durée du trajet.",
      rappel: "Pour dire si un lieu est loin, on donne sa distance en kilomètres, ou en temps.",
      entetes: ["", "Où je vais", "Comment j'y vais", "La distance (km)", "La durée"],
      lignes: [["Pour aller à l'école", "", "", "", ""], ["Le mercredi", "", "", "", ""], ["Le week-end", "", "", "", ""], ["Pendant les vacances", "", "", "", ""]],
    },
    {
      sorte: "document", id: "km-temps", titre: "Distance en kilomètres, distance en temps",
      rappel: "La distance en kilomètres et la distance en temps ne disent pas la même chose : tout dépend du mode de transport.",
      texte: [
        "Pour dire si un lieu est loin, on peut donner sa distance en kilomètres, ou le temps qu'il faut pour y aller. Les deux ne disent pas la même chose : 10 kilomètres, c'est environ deux heures à pied, quarante minutes à vélo, un quart d'heure en voiture sur une route dégagée.",
        "Paris et Marseille sont à environ 775 kilomètres par la route. Il faut environ 7 h 30 en voiture, un peu plus de 3 heures en TGV, 1 h 20 en avion — sans compter le trajet jusqu'à l'aéroport et l'attente avant d'embarquer.",
      ],
      questions: [
        ["Combien de temps faut-il pour faire 10 km à pied ? Et à vélo ?", "Environ deux heures à pied ; quarante minutes à vélo."],
        ["Quel mode de transport est le plus rapide entre Paris et Marseille ?", "L'avion, 1 h 20 de vol."],
        ["Pourquoi le TGV est-il parfois plus pratique que l'avion ?", "Il va de centre-ville à centre-ville, sans trajet jusqu'à l'aéroport ni longue attente."],
        ["J'écris la distance en kilomètres et la durée de mon trajet jusqu'à l'école.", "La réponse dépend de l'élève."],
      ],
    },
    {
      sorte: "relier", id: "infrastructures", titre: "Les modes de transport et leurs infrastructures",
      consigne: "Je relie chaque mode de transport à son infrastructure.",
      rappel: "Chaque mode de transport a ses infrastructures : l'avion et l'aéroport, le bateau et le port, le train et la gare…",
      paires: [
        ["l'avion", "l'aéroport"], ["le bateau", "le port"], ["le train", "la gare"], ["la voiture", "la route"], ["le métro", "la station"], ["le vélo", "la voie cyclable"], ["la marche", "le trottoir"],
      ],
    },
  ],
  evaluation: [
    ["J'associe deux modes de transport à leur infrastructure.", "L'avion et l'aéroport, le train et la gare, le bateau et le port…"],
    ["J'explique la différence entre la distance en kilomètres et la distance en temps.", "La première est la longueur du trajet, la seconde sa durée, qui dépend du mode de transport."],
    ["Je cite deux modes de déplacement pour aller près, et deux pour aller loin.", "La marche, le vélo ; le train, l'avion."],
  ],
};

/**
 * Quelques grands câbles sous-marins, d'après la carte de TeleGeography
 * (submarinecablemap.com) : leurs points d'atterrissage, et des points en mer
 * pour contourner les côtes — l'Atlantique Nord, Dunant, Southern Cross,
 * Jupiter, Curie, EllaLink, SACS, la côte ouest de l'Afrique, de Marseille à
 * Hong Kong par Suez, EASSy, Indigo.
 */
const CABLES: TraitsDeCarte["liste"] = [
  { par: ["new-york", [-40, 46], "bude"] },
  { par: ["virginia-beach", [-40, 42], "saint-hilaire-de-riez"] },
  { par: ["los-angeles", [-158, 21.4], [178.4, -18.1], "sydney"] },
  { par: ["los-angeles", [-160, 32], "tokyo"] },
  { par: ["los-angeles", [-116, 24], [-100, 12], [-88, 2], [-84, -8], [-75, -22], "valparaiso"] },
  { par: ["fortaleza", [-28, 15], "sines"] },
  { par: ["fortaleza", "luanda"] },
  { par: ["sines", [-12.5, 30.5], [-13.3, 27.9], [-16.5, 23], "dakar", [-18, 9], [-12, 3.5], [-3, 3.5], "lagos", [8, -15], "le-cap"] },
  {
    par: ["marseille", [8, 39], [12, 37.3], "port-said", [32.55, 29.9], [33.8, 27.6], [36, 23], [40, 17], "djibouti", [52, 13], "bombay", [76, 7], [80.5, 5],
      [94, 6.5], [98.8, 5.5], [101.2, 2.7], "singapour", [106, 4], [110, 10], "hong-kong"],
  },
  { par: ["djibouti", [51.5, 12.3], [52, 8], [47, 1], "mombasa", [41.5, -12], [36.5, -22], "mtunzini"] },
  { par: ["singapour", [104.8, -2.3], [105.8, -6.1], [108, -20], "perth"] },
];

const INTERNET: ThemeHGCM = {
  id: "internet-cm1", classe: "CM1", histoire: false, titre: "Communiquer dans le monde avec Internet",
  question: "Comment communique-t-on avec Internet dans le monde ?",
  motsCles: [
    ["le câble sous-marin", "Un câble posé au fond de l'océan, qui transporte les communications entre les continents."],
    ["Internet", "Le réseau mondial qui relie les ordinateurs, les téléphones et les tablettes."],
    ["le réseau", "Un ensemble de lignes qui relient des lieux entre eux."],
    ["le satellite", "Un engin qui tourne autour de la Terre et relaie les communications."],
    ["le centre de données", "Un bâtiment rempli d'ordinateurs qui gardent les données."],
    ["la zone blanche", "Un lieu sans réseau de téléphone mobile."],
  ],
  lieux: ["l'Amérique du Nord", "l'Europe", "l'Asie de l'Est", "l'Afrique subsaharienne", "l'océan Atlantique", "l'océan Pacifique", "l'océan Indien"],
  exercices: [
    {
      sorte: "tableau", id: "usages", titre: "Nos usages d'Internet",
      consigne: "Pour chaque usage d'Internet, je coche ce qui est vrai pour moi.",
      rappel: "On utilise Internet pour chercher, apprendre, écrire, regarder, jouer, appeler.",
      entetes: ["Ce que je fais avec Internet", "À la maison", "À l'école", "Jamais"],
      lignes: [["Chercher une information", "", "", ""], ["Regarder une vidéo", "", "", ""], ["Écrire un message", "", "", ""], ["Appeler en vidéo", "", "", ""], ["Jouer", "", "", ""], ["Écouter de la musique", "", "", ""]],
    },
    {
      sorte: "document", id: "fonctionnement", titre: "Comment fonctionne Internet ?",
      rappel: "Internet repose sur des câbles — sur les continents et sous les océans — et sur des satellites.",
      texte: [
        "Quand on envoie un message ou qu'on regarde une vidéo, les informations voyagent dans des câbles. Sur les continents, des câbles relient les ordinateurs, les antennes et les centres de données, ces immenses bâtiments remplis d'ordinateurs qui gardent les données et consomment beaucoup d'électricité.",
        "Pour traverser les océans, plus de 500 câbles sous-marins sont posés au fond de la mer : ils transportent presque toutes les communications entre les continents. Ils sont très nombreux entre l'Amérique du Nord, l'Europe et l'Asie de l'Est.",
        "Des satellites, qui tournent autour de la Terre, relient aussi des lieux isolés : des bateaux en mer, des îles, des villages de montagne.",
      ],
      questions: [
        ["Comment les informations traversent-elles les océans ?", "Par des câbles sous-marins."],
        ["Entre quelles aires régionales les câbles sont-ils les plus nombreux ?", "Entre l'Amérique du Nord, l'Europe et l'Asie de l'Est."],
        ["À quoi servent les satellites ?", "À relier des lieux isolés : des bateaux, des îles, des villages de montagne."],
        ["Qu'est-ce qu'un centre de données ?", "Un bâtiment rempli d'ordinateurs qui gardent les données."],
      ],
    },
    {
      sorte: "carte", id: "carte-cables", titre: "Les câbles sous-marins, sur le planisphère",
      rappel: "Internet repose sur des câbles — sur les continents et sous les océans — et sur des satellites. Les câbles sont très nombreux entre l'Amérique du Nord, l'Europe et l'Asie de l'Est.",
      consignes: ["J'écris le nom des aires régionales et des océans numérotés.", "Je repasse en rouge les câbles sous-marins."],
      carte: {
        fond: "monde",
        numeros: [
          { ou: [-100, 45], nom: "l'Amérique du Nord" }, { ou: [20, 52], nom: "l'Europe" }, { ou: [110, 36], nom: "l'Asie de l'Est" }, { ou: [22, 2], nom: "l'Afrique subsaharienne" },
          { ou: [-40, 25], nom: "l'océan Atlantique" }, { ou: [-150, 5], nom: "l'océan Pacifique" }, { ou: [78, -22], nom: "l'océan Indien" },
        ],
        traits: [{ sorte: "cable", legende: "un câble sous-marin", liste: CABLES }],
        banque: true,
        note: "Schéma : quelques grands câbles seulement, d'après la carte de TeleGeography (submarinecablemap.com) ; il y en a plus de 500.",
      },
    },
    {
      sorte: "document", id: "acces", titre: "Tout le monde n'a pas accès à Internet",
      rappel: "Environ deux personnes sur trois utilisent Internet. L'accès est inégal dans le monde, et en France aussi.",
      texte: [
        "Dans le monde, environ deux personnes sur trois utilisent Internet. En Europe et en Amérique du Nord, presque tout le monde est connecté. En Afrique subsaharienne, c'est un peu plus d'une personne sur trois : dans les campagnes, il manque souvent l'électricité, les antennes, ou l'argent pour payer un téléphone et un abonnement.",
        "En France aussi, l'accès est inégal. Les grandes villes ont la fibre et la 5G, l'Internet mobile le plus rapide ; dans certaines campagnes et en montagne, le réseau est faible, voire absent : ce sont des « zones blanches ».",
      ],
      questions: [
        ["Quelle part de la population mondiale utilise Internet ?", "Environ deux personnes sur trois."],
        ["Je nomme une aire régionale très bien reliée à Internet, et une aire faiblement reliée.", "L'Europe ou l'Amérique du Nord ; l'Afrique subsaharienne."],
        ["Pourquoi certaines régions sont-elles mal reliées ?", "Il manque l'électricité, les antennes, ou l'argent pour un téléphone et un abonnement."],
        ["Qu'est-ce qu'une zone blanche ?", "Un lieu où le réseau mobile est absent."],
      ],
    },
  ],
  evaluation: [
    ["J'explique comment Internet relie les continents.", "Par des câbles posés au fond des océans, et par des satellites."],
    ["Je décris une inégalité d'accès à Internet dans le monde.", "Presque tout le monde est connecté en Europe et en Amérique du Nord, un peu plus d'un tiers en Afrique subsaharienne."],
    ["Je décris une inégalité d'accès à Internet en France.", "La fibre et la 5G dans les villes ; des zones blanches dans certaines campagnes et en montagne."],
  ],
};

// ── Géographie, CM2 : la France, l'Union européenne ───────────────────────

/** Les dix-huit régions et leur capitale : treize dans l'Hexagone, cinq en outre-mer. */
export const REGIONS: [string, string][] = [
  ["Auvergne-Rhône-Alpes", "Lyon"], ["Bourgogne-Franche-Comté", "Dijon"], ["Bretagne", "Rennes"], ["Centre-Val de Loire", "Orléans"], ["Corse", "Ajaccio"],
  ["Grand Est", "Strasbourg"], ["Hauts-de-France", "Lille"], ["Île-de-France", "Paris"], ["Normandie", "Rouen"], ["Nouvelle-Aquitaine", "Bordeaux"],
  ["Occitanie", "Toulouse"], ["Pays de la Loire", "Nantes"], ["Provence-Alpes-Côte d'Azur", "Marseille"],
  ["Guadeloupe", "Basse-Terre"], ["Martinique", "Fort-de-France"], ["Guyane", "Cayenne"], ["La Réunion", "Saint-Denis"], ["Mayotte", "Mamoudzou"],
];

/** Les régions sur la carte, du nord au sud puis l'outre-mer : leur forme sur le fond, leur nom, leur capitale. */
const REGIONS_SUR_LA_CARTE: [string, string, string][] = [
  ["HDF", "Hauts-de-France", "lille"], ["NOR", "Normandie", "rouen"], ["IDF", "Île-de-France", "paris"], ["GES", "Grand Est", "strasbourg"], ["BRE", "Bretagne", "rennes"],
  ["PDL", "Pays de la Loire", "nantes"], ["CVL", "Centre-Val de Loire", "orleans"], ["BFC", "Bourgogne-Franche-Comté", "dijon"], ["NAQ", "Nouvelle-Aquitaine", "bordeaux"],
  ["ARA", "Auvergne-Rhône-Alpes", "lyon"], ["OCC", "Occitanie", "toulouse"], ["PAC", "Provence-Alpes-Côte d'Azur", "marseille"], ["COR", "Corse", "ajaccio"],
  ["GLP", "Guadeloupe", "basse-terre"], ["MTQ", "Martinique", "fort-de-france"], ["GUF", "Guyane", "cayenne"], ["REU", "La Réunion", "saint-denis"], ["MYT", "Mayotte", "mamoudzou"],
];

const TERRITOIRE: ThemeHGCM = {
  id: "territoire-francais-cm2", classe: "CM2", histoire: false, titre: "L'organisation du territoire français",
  question: "Comment est organisé le territoire français ?",
  motsCles: [
    ["la commune", "La plus petite division du territoire, dirigée par un maire et son conseil municipal."],
    ["le département", "Une division du territoire, avec un numéro et une préfecture ; il y en a 101."],
    ["la région", "Une grande division du territoire, avec sa capitale régionale ; il y en a 18."],
    ["le TGV", "Le train à grande vitesse, qui roule jusqu'à 320 km/h sur des lignes spéciales."],
    ["l'agglomération", "Une ville et les communes qui l'entourent, sans coupure entre les constructions."],
    ["l'autoroute", "Une route à deux fois deux voies, sans croisement, pour aller vite et loin."],
  ],
  lieux: ["Paris", "Lyon", "Marseille", "Lille", "Toulouse", "l'autoroute A1 (Paris – Lille)", "l'autoroute A6 (Paris – Lyon)", "l'autoroute A7 (Lyon – Marseille)",
    "l'autoroute A10 (Paris – Bordeaux)", "la LGV Paris – Lyon", "la LGV Paris – Lille", "la LGV Paris – Bordeaux", ...REGIONS.map(([r]) => r)],
  exercices: [
    {
      sorte: "document", id: "etoile", titre: "Un réseau en étoile",
      rappel: "Les cinq principales agglomérations : Paris, Lyon, Marseille, Lille, Toulouse. Les grands axes partent de Paris, en étoile.",
      texte: [
        "Les cinq principales agglomérations françaises sont Paris, Lyon, Marseille, Lille et Toulouse. Paris est de très loin la plus peuplée : plus de dix millions d'habitants.",
        "Les grandes autoroutes et les lignes à grande vitesse partent de Paris vers les grandes villes, comme les branches d'une étoile : vers Lille et la Belgique au nord, vers Strasbourg à l'est, vers Lyon et Marseille au sud-est, vers Bordeaux au sud-ouest, vers Rennes et Nantes à l'ouest. Le premier TGV a relié Paris à Lyon en 1981.",
        "Pour aller d'une grande ville à une autre, il est souvent plus rapide de passer par Paris.",
      ],
      questions: [
        ["Je nomme les cinq principales agglomérations françaises.", "Paris, Lyon, Marseille, Lille, Toulouse."],
        ["Pourquoi dit-on que le réseau français est en étoile ?", "Les grands axes partent de Paris vers les grandes villes, comme les branches d'une étoile."],
        ["Je relève un axe et les villes qu'il relie.", "La ligne à grande vitesse Paris – Lyon ; l'autoroute Paris – Lille…"],
      ],
    },
    {
      sorte: "document", id: "decoupage", titre: "Commune, département, région",
      rappel: "La France est découpée en communes, en départements — 101 — et en régions — 18, dont 5 en outre-mer.",
      texte: [
        "La France est découpée en communes — près de 35 000 —, dirigées chacune par un maire et un conseil municipal. Elle est aussi découpée en départements — 101 —, qui ont chacun un numéro et une préfecture, et en régions — 18, dont 5 en outre-mer —, dirigées par un conseil régional qui siège dans la capitale régionale.",
        "Chaque niveau a ses missions : la commune s'occupe des écoles maternelles et élémentaires ; le département, des collèges et des routes départementales ; la région, des lycées et des trains régionaux.",
      ],
      questions: [
        ["Combien y a-t-il de départements en France ? Et de régions ?", "101 départements ; 18 régions, dont 5 en outre-mer."],
        ["Qui s'occupe des écoles ? Des collèges ? Des lycées ?", "La commune ; le département ; la région."],
        ["Je complète : j'habite la commune de …, dans le département …, numéro …, dans la région …, dont la capitale est ….", "La réponse dépend de l'école."],
      ],
    },
    {
      sorte: "tableau", id: "regions", titre: "Les dix-huit régions et leur capitale",
      consigne: "J'écris la capitale de chaque région. Puis je colorie ma région sur la carte.",
      rappel: "Dix-huit régions : treize dans l'Hexagone, cinq en outre-mer — la Guadeloupe, la Martinique, la Guyane, La Réunion, Mayotte.",
      entetes: ["La région", "Sa capitale"],
      lignes: REGIONS.map(([r]) => [r, ""]),
      reponses: REGIONS.map(([r, c]) => [r, c]),
    },
    {
      sorte: "carte", id: "carte-regions", titre: "Les dix-huit régions, sur la carte",
      rappel: "Dix-huit régions : treize dans l'Hexagone, cinq en outre-mer. Chacune a sa capitale régionale.",
      consignes: ["J'écris le nom de chaque région à côté de son numéro.", "Je colorie ma région."],
      carte: {
        fond: "france",
        numeros: REGIONS_SUR_LA_CARTE.map(([quoi, nom]) => ({ quoi, nom })),
        points: { legende: "la capitale d'une région", lieux: REGIONS_SUR_LA_CARTE.map(([, , capitale]) => capitale) },
        banque: true,
      },
    },
    {
      sorte: "tableau", id: "deux-regions", titre: "Ma région et une autre",
      consigne: "Je complète le tableau pour ma région et pour une autre région. Puis j'écris une phrase qui les compare.",
      rappel: "Une région se décrit par sa capitale, son relief, ses grandes villes, ses activités, ses paysages.",
      entetes: ["", "Ma région : …………………", "Une autre région : …………………"],
      lignes: [["Sa capitale", "", ""], ["Son relief", "", ""], ["Ses grandes villes", "", ""], ["Ses activités", "", ""], ["Un paysage", "", ""], ["Un département et son numéro", "", ""]],
    },
    {
      sorte: "carte", id: "croquis-territoire", titre: "Croquis : les grandes agglomérations et les grands axes",
      rappel: "Les cinq principales agglomérations : Paris, Lyon, Marseille, Lille, Toulouse. Les grands axes partent de Paris, en étoile.",
      consignes: [
        "J'écris le nom des cinq grandes agglomérations numérotées.",
        "Je trace en rouge les autoroutes A1, A6, A7 et A10 ; en bleu, les lignes à grande vitesse de Paris à Lille, à Lyon et à Bordeaux, comme dans la légende.",
      ],
      carte: {
        fond: "france",
        numeros: [{ quoi: "paris", nom: "Paris" }, { quoi: "lyon", nom: "Lyon" }, { quoi: "marseille", nom: "Marseille" }, { quoi: "lille", nom: "Lille" }, { quoi: "toulouse", nom: "Toulouse" }],
        legendeNumeros: "une grande agglomération",
        reperes: ["bordeaux"],
        traits: [
          {
            sorte: "route", legende: "une autoroute", aTracer: true,
            liste: [
              { par: ["paris", "lille"], nom: "A1", decalage: -1.1 }, { par: ["paris", "lyon"], nom: "A6", decalage: -1.1 },
              { par: ["lyon", "marseille"], nom: "A7" }, { par: ["paris", "bordeaux"], nom: "A10", decalage: -1.1 },
            ],
          },
          {
            sorte: "lgv", legende: "une ligne à grande vitesse", aTracer: true,
            liste: [{ par: ["paris", "lille"], decalage: 1.1 }, { par: ["paris", "lyon"], decalage: 1.1 }, { par: ["paris", "bordeaux"], decalage: 1.1 }],
          },
        ],
        banque: true,
        note: "Un croquis simplifie : les axes y sont tracés en ligne droite.",
      },
    },
  ],
  evaluation: [
    ["Je nomme les cinq principales agglomérations françaises.", "Paris, Lyon, Marseille, Lille, Toulouse."],
    ["Je nomme cinq régions et leur capitale.", "Bretagne (Rennes), Occitanie (Toulouse), Grand Est (Strasbourg), Hauts-de-France (Lille), Normandie (Rouen)…"],
    ["J'écris le nom de ma commune, de mon département et de ma région.", "La réponse dépend de l'école."],
  ],
};

const EAU_DOUCE: ThemeHGCM = {
  id: "eau-douce-cm2", classe: "CM2", histoire: false, titre: "Les usages de l'eau douce en France",
  question: "Pourquoi gérer l'eau douce en France ?",
  motsCles: [
    ["le conflit d'usages", "Une opposition entre plusieurs utilisateurs d'une même ressource, comme l'eau."],
    ["la nappe phréatique", "L'eau de pluie stockée dans le sous-sol."],
    ["l'eau douce", "L'eau non salée des rivières, des lacs, des nappes et des glaciers."],
    ["le fleuve", "Un cours d'eau qui se jette dans la mer."],
    ["l'irrigation", "L'arrosage des champs."],
    ["la sécheresse", "Un long manque de pluie."],
  ],
  lieux: ["la Seine", "la Loire", "la Garonne", "le Rhône", "le Rhin", "le Maroni (Guyane)", "les Alpes", "les Pyrénées", "le Massif central", "le Jura", "les Vosges", "la Corse",
    "le lac du Bourget (lac naturel)", "le lac de Serre-Ponçon (lac de barrage)"],
  exercices: [
    {
      sorte: "document", id: "ressource", titre: "L'eau douce, une ressource limitée",
      rappel: "L'eau douce est rare : environ 3 % de l'eau de la Terre, surtout gelée. Avec le dérèglement climatique, les sécheresses sont plus fréquentes.",
      texte: [
        "Sur la Terre, il y a beaucoup d'eau, mais presque toute est salée : l'eau douce ne représente qu'environ 3 % de l'eau de la planète, et la plus grande partie est gelée dans les glaciers et les calottes polaires. Les êtres humains utilisent surtout l'eau des rivières, des lacs et des nappes phréatiques, l'eau stockée dans le sous-sol.",
        "En France, il pleut en moyenne assez, mais pas partout ni toute l'année. Avec le dérèglement climatique, les sécheresses sont plus fréquentes : en été, des rivières sont à sec et les nappes baissent. Les préfets peuvent alors limiter l'arrosage, le lavage des voitures ou le remplissage des piscines.",
      ],
      questions: [
        ["Quelle part de l'eau de la Terre est douce ? Où se trouve-t-elle surtout ?", "Environ 3 % ; surtout gelée dans les glaciers et les calottes polaires."],
        ["Qu'est-ce qu'une nappe phréatique ?", "L'eau stockée dans le sous-sol."],
        ["Que peut faire le préfet en cas de sécheresse ?", "Limiter l'arrosage, le lavage des voitures, le remplissage des piscines."],
      ],
    },
    {
      sorte: "relier", id: "fleuves", titre: "Les grands fleuves français",
      consigne: "Je relie chaque fleuve à une grande ville qu'il traverse. Puis je le repasse en bleu sur la carte.",
      rappel: "Six grands fleuves : la Seine, la Loire, la Garonne, le Rhône, le Rhin, et le Maroni en Guyane.",
      paires: [
        ["la Seine", "Paris"], ["la Loire", "Nantes"], ["la Garonne", "Bordeaux"], ["le Rhône", "Lyon"], ["le Rhin", "Strasbourg"], ["le Maroni", "Saint-Laurent-du-Maroni, en Guyane"],
      ],
    },
    {
      sorte: "carte", id: "carte-fleuves", titre: "Les fleuves, les massifs et deux lacs, sur la carte",
      rappel: "Six grands fleuves : la Seine, la Loire, la Garonne, le Rhône, le Rhin, le Maroni. Les massifs : les Alpes, les Pyrénées, le Massif central, le Jura, les Vosges, la Corse.",
      consignes: ["J'écris le nom des fleuves, des massifs et des lacs numérotés.", "Je repasse les fleuves en bleu ; je colorie les massifs en marron."],
      carte: {
        fond: "france", fleuves: true, massifs: true,
        numeros: [
          { quoi: "seine", nom: "la Seine" }, { quoi: "loire", nom: "la Loire" }, { quoi: "garonne", nom: "la Garonne" }, { quoi: "rhone", nom: "le Rhône" },
          { quoi: "rhin", nom: "le Rhin" }, { quoi: "maroni", nom: "le Maroni" }, { quoi: "alpes", nom: "les Alpes" }, { quoi: "pyrenees", nom: "les Pyrénées" },
          { quoi: "massif-central", nom: "le Massif central" }, { quoi: "jura", nom: "le Jura" }, { quoi: "vosges", nom: "les Vosges" }, { quoi: "corse", nom: "la Corse" },
          { quoi: "lac-du-bourget", nom: "le lac du Bourget" }, { quoi: "lac-de-serre-poncon", nom: "le lac de Serre-Ponçon" },
        ],
        banque: true,
      },
    },
    {
      sorte: "trier", id: "usages-eau", titre: "Les usages de l'eau",
      consigne: "Je lis chaque usage de l'eau. Je l'écris dans la bonne colonne.",
      rappel: "On utilise l'eau à la maison, pour l'agriculture, pour l'industrie et l'énergie, pour les loisirs et le transport.",
      colonnes: ["À la maison", "L'agriculture", "L'industrie et l'énergie", "Les loisirs et le transport"],
      items: [
        ["boire et cuisiner", 0], ["se laver", 0], ["tirer la chasse d'eau", 0],
        ["irriguer les champs de maïs", 1], ["abreuver les animaux", 1],
        ["refroidir une centrale nucléaire", 2], ["produire de l'électricité dans un barrage", 2], ["fabriquer du papier ou de l'acier", 2],
        ["se baigner, faire du canoë", 3], ["transporter des marchandises en péniche", 3], ["fabriquer de la neige pour les pistes de ski", 3],
      ],
    },
    {
      sorte: "document", id: "serre-poncon", titre: "Un conflit d'usages : le lac de Serre-Ponçon",
      rappel: "Quand l'eau manque, ses usagers — agriculteurs, villes, tourisme, production d'électricité — s'opposent : c'est un conflit d'usages. Il faut partager l'eau.",
      texte: [
        "Dans les Hautes-Alpes, le barrage de Serre-Ponçon, achevé en 1960, retient la Durance : il forme l'un des plus grands lacs artificiels d'Europe. Son eau a plusieurs usages : elle produit de l'électricité dans les centrales du barrage et de la vallée ; elle irrigue les vergers et les champs de Provence ; elle fournit l'eau potable de villes comme Marseille ; en été, le lac attire les touristes qui s'y baignent et y naviguent.",
        "Pendant la sécheresse de 2022, le niveau du lac a beaucoup baissé. Les agriculteurs avaient besoin d'eau pour arroser, les villes pour boire, les communes du lac pour le tourisme, et l'électricien pour produire du courant. Il a fallu choisir, et partager l'eau : c'est un conflit d'usages.",
      ],
      questions: [
        ["Je cite quatre usages de l'eau du lac de Serre-Ponçon.", "Produire de l'électricité, irriguer, fournir l'eau potable, le tourisme."],
        ["Que se passe-t-il pendant la sécheresse de 2022 ?", "Le niveau du lac baisse ; tous les usagers ont besoin d'eau ; il faut choisir et partager."],
        ["Qu'est-ce qu'un conflit d'usages ?", "Une opposition entre ceux qui veulent utiliser la même eau pour des usages différents."],
      ],
    },
  ],
  evaluation: [
    ["Je décris trois usages de l'eau en France.", "Boire et se laver ; irriguer les champs ; refroidir les centrales, produire de l'électricité ; les loisirs."],
    ["J'explique, avec un exemple précis, ce qu'est un conflit d'usages.", "À Serre-Ponçon, en 2022, agriculteurs, villes, tourisme et production d'électricité voulaient la même eau, devenue rare."],
    ["Je nomme trois grands fleuves et deux massifs de montagne français.", "La Seine, la Loire, la Garonne, le Rhône, le Rhin, le Maroni ; les Alpes, les Pyrénées, le Massif central, le Jura, les Vosges, la Corse."],
  ],
};

const UNION_EUROPEENNE: ThemeHGCM = {
  id: "union-europeenne-cm2", classe: "CM2", histoire: false, titre: "L'Union européenne",
  question: "Qu'est-ce que l'Union européenne ?",
  motsCles: [
    ["l'Europe", "Un continent, limité à l'est, par convention, par les monts Oural."],
    ["l'Union européenne", "L'union politique et économique de 27 États d'Europe."],
    ["le pays fondateur", "L'un des six pays qui ont créé la Communauté économique européenne en 1957."],
    ["le traité", "Un accord signé entre plusieurs États."],
    ["l'euro", "La monnaie commune d'une vingtaine de pays de l'Union européenne."],
  ],
  lieux: [...PAYS_UE.map(([p]) => p), "la Suisse", "la Norvège", "le Royaume-Uni", "les monts Oural"],
  exercices: [
    {
      sorte: "trier", id: "europe-ue", titre: "En Europe, dans l'Union européenne ?",
      consigne: "Je lis chaque pays d'Europe. Je l'écris dans la bonne colonne : dans l'Union européenne, ou hors de l'Union européenne.",
      rappel: "L'Europe est un continent ; l'Union européenne, une construction politique de 27 de ses États. Tout pays d'Europe n'est pas dans l'Union.",
      colonnes: ["Dans l'Union européenne", "En Europe, hors de l'Union européenne"],
      items: [
        ["la France", 0], ["l'Allemagne", 0], ["l'Italie", 0], ["l'Espagne", 0], ["la Pologne", 0], ["la Suède", 0], ["la Grèce", 0],
        ["la Suisse", 1], ["la Norvège", 1], ["le Royaume-Uni", 1], ["l'Islande", 1], ["la Serbie", 1], ["l'Ukraine", 1],
      ],
    },
    {
      sorte: "carte", id: "carte-continent", titre: "L'Europe, un continent",
      rappel: "L'Europe est limitée par l'océan Atlantique, l'océan Arctique, la mer Méditerranée, et à l'est, par convention, par les monts Oural et le Caucase.",
      consignes: ["J'écris le nom des océans, de la mer et des montagnes numérotés : ils limitent l'Europe."],
      carte: {
        fond: "europe", continent: true,
        numeros: [
          { ou: [-17, 46], nom: "l'océan Atlantique" }, { ou: [38, 71], nom: "l'océan Arctique" }, { ou: [5, 38.5], nom: "la mer Méditerranée" },
          { ou: [59.5, 60], nom: "les monts Oural" }, { ou: [44, 42.7], nom: "le Caucase" },
        ],
        banque: true,
      },
    },
    {
      sorte: "document", id: "qu-est-ce-que-ue", titre: "Qu'est-ce que l'Union européenne ?",
      rappel: "L'Europe, un continent d'une cinquantaine d'États ; l'Union européenne, 27 États unis par des traités : 1957, traité de Rome ; 1992, traité de Maastricht.",
      texte: [
        "L'Europe est un continent, limité par l'océan Atlantique à l'ouest, l'océan Arctique au nord, la mer Méditerranée au sud, et à l'est, par convention, par les monts Oural et le Caucase. Elle compte une cinquantaine d'États.",
        "L'Union européenne, elle, est une construction politique : 27 de ces États ont décidé de s'unir, par des traités — celui de Rome en 1957, celui de Maastricht en 1992. Ils ont des institutions communes, comme le Parlement européen, élu par les citoyens, qui siège à Strasbourg et à Bruxelles. Les personnes et les marchandises circulent librement entre la plupart de ces pays ; une vingtaine d'entre eux partagent la même monnaie, l'euro.",
        "Le drapeau de l'Union est bleu, avec un cercle de douze étoiles d'or ; sa devise est « Unie dans la diversité ». La Suisse ou la Norvège sont en Europe, mais pas dans l'Union européenne.",
      ],
      questions: [
        ["Quelle est la différence entre l'Europe et l'Union européenne ?", "L'Europe est un continent ; l'Union européenne est une union politique de 27 États."],
        ["Je cite deux pays d'Europe qui ne sont pas dans l'Union européenne.", "La Suisse, la Norvège, le Royaume-Uni…"],
        ["Où siège le Parlement européen ?", "À Strasbourg et à Bruxelles."],
        ["Je relève les dates de deux traités.", "1957, le traité de Rome ; 1992, le traité de Maastricht."],
      ],
    },
    {
      sorte: "relier", id: "fondateurs", titre: "Les six pays fondateurs",
      consigne: "Je relie chaque pays fondateur à sa capitale. Puis je le colorie sur la carte de l'Europe.",
      rappel: "Six pays fondateurs, en 1957 : l'Allemagne, la Belgique, la France, l'Italie, le Luxembourg, les Pays-Bas.",
      paires: PAYS_UE.slice(0, 6),
    },
    {
      sorte: "tableau", id: "dix-pays", titre: "Dix pays de l'Union européenne",
      consigne: "J'écris le nom de dix pays de l'Union européenne, dont les six fondateurs, et leur capitale. Puis je les colorie sur la carte.",
      rappel: "Les six fondateurs, puis par exemple l'Espagne, le Portugal, la Pologne, la Grèce, la Suède.",
      entetes: ["", "Le pays", "Sa capitale"],
      lignes: Array.from({ length: 10 }, (_, i) => [String(i + 1), "", ""]),
      reponses: PAYS_UE.slice(0, 10).map(([p, c], i) => [String(i + 1), p, c]),
    },
    CARTE_UE,
    {
      sorte: "tableau", id: "projet-europeen", titre: "L'Union européenne près de chez nous",
      consigne: "Je cherche un aménagement réalisé avec l'aide de l'Union européenne dans notre région. Je complète le tableau.",
      rappel: "Un panneau dit souvent « Projet cofinancé par l'Union européenne » sur une route, une gare, un équipement, une rénovation.",
      entetes: ["", "Ce que j'ai trouvé"],
      lignes: [["Le nom de l'aménagement", ""], ["Où se trouve-t-il ?", ""], ["À quoi sert-il ?", ""], ["Ce que l'Union européenne a donné", ""], ["Où j'ai trouvé l'information", ""]],
    },
  ],
  evaluation: [
    ["J'explique la différence entre l'Europe et l'Union européenne.", "L'Europe est un continent ; l'Union européenne, une construction politique de 27 États."],
    ["Je nomme les six pays fondateurs.", "L'Allemagne, la Belgique, la France, l'Italie, le Luxembourg, les Pays-Bas."],
    ["Je nomme quatre autres pays de l'Union européenne.", "L'Espagne, le Portugal, la Pologne, la Grèce, la Suède…"],
    ["J'écris la date du traité de Rome et celle du traité de Maastricht.", "1957 ; 1992."],
  ],
};

// ── Le CM2 du programme de 2020, encore en vigueur en 2026-2027 ───────────
//
// Les fiches Éduscol « S'approprier les différents thèmes du programme »
// (ressources d'accompagnement du cycle 3, mars 2016), pour les six thèmes
// du CM2 : leur problématique, leurs sous-thèmes, leurs pistes de mise en
// œuvre, leurs repères. Les feuilles déjà écrites pour le programme de 2026
// servent quand elles disent la même chose ; les autres sont écrites ici.

/** Un exercice d'un thème, repris tel quel dans un autre. */
const exo = (t: ThemeHGCM, id: string): ExerciceHGCM => t.exercices.find((e) => e.id === id)!;

const TEMPS_REPUBLIQUE_2020: ThemeHGCM = {
  id: "temps-republique-cm2", classe: "CM2", histoire: true, titre: "Le temps de la République (programme 2020)",
  question: "Comment les Français se sont-ils unis autour de la République ?",
  frise: {
    titre: "La République, de 1792 à aujourd'hui", debut: 1780, fin: 1970, pas: 20,
    bandes: [
      { nom: "Roi", debut: 1780, fin: jour(1792, 9, 21), couleur: BLEU },
      { nom: "Ire République", debut: jour(1792, 9, 21), fin: jour(1804, 5, 18), couleur: ROSE, aPlacer: true },
      { nom: "Empereurs et rois", debut: jour(1804, 5, 18), fin: jour(1848, 2, 24), couleur: BLEU },
      { nom: "IIe Rép.", debut: jour(1848, 2, 24), fin: jour(1852, 12, 2), couleur: ROSE },
      { nom: "Empereur", debut: jour(1852, 12, 2), fin: jour(1870, 9, 4), couleur: BLEU },
      { nom: "IIIe République", debut: jour(1870, 9, 4), fin: jour(1940, 7, 10), couleur: ROSE, aPlacer: true },
      { nom: "Vichy", debut: jour(1940, 7, 10), fin: jour(1944, 8, 25), couleur: GRIS },
      { nom: "", debut: jour(1944, 8, 25), fin: jour(1946, 10, 27), couleur: GRIS },
      { nom: "IVe R.", debut: jour(1946, 10, 27), fin: jour(1958, 10, 4), couleur: ROSE },
      { nom: "Ve République", debut: jour(1958, 10, 4), fin: 1970, couleur: ROSE, aPlacer: true },
    ],
    reperes: [
      { date: jour(1792, 9, 21), quand: "1792", quoi: "La naissance de la Ire République" },
      { date: jour(1848, 2, 24), quand: "1848", quoi: "La IIe République : le suffrage universel masculin" },
      { date: jour(1870, 9, 4), quand: "1870", quoi: "La IIIe République" },
      { date: jour(1880, 7, 6), quand: "1880", quoi: "Le 14 juillet devient la fête nationale" },
      { date: 1881.5, quand: "1881 – 1882", quoi: "Les lois de Jules Ferry sur l'école" },
      { date: jour(1905, 12, 9), quand: "1905", quoi: "La séparation des Églises et de l'État" },
      { date: jour(1944, 4, 21), quand: "1944", quoi: "Le droit de vote des femmes" },
      { date: jour(1958, 10, 4), quand: "1958", quoi: "La Ve République" },
    ],
  },
  motsCles: [
    ["la République", "Un régime sans roi ni empereur, où le pouvoir vient du peuple et de ses élus."],
    ["la démocratie", "Un régime où le peuple choisit ses dirigeants par des élections libres."],
    ["le citoyen, la citoyenne", "Celui, celle qui a des droits — voter, s'exprimer — et des devoirs — respecter la loi."],
    ["la laïcité", "Le principe qui sépare les religions et l'État : chacun est libre de croire ou de ne pas croire."],
    ["l'école gratuite, laïque et obligatoire", "L'école des lois Ferry (1881-1882), ouverte à tous les enfants de 6 à 13 ans."],
    ["la fête nationale", "Le 14 juillet, depuis 1880."],
    ["la devise", "Liberté, Égalité, Fraternité."],
    ["le suffrage universel", "Le droit de vote de tous les citoyens : les hommes en 1848, les femmes en 1944."],
  ],
  exercices: [
    {
      sorte: "document", id: "centenaire", titre: "1892 : la République fête ses cent ans",
      rappel: "La République naît en 1792 ; rois et empereurs reviennent ; à partir de 1870, la IIIe République s'installe et unit les Français autour des symboles de la Révolution.",
      texte: [
        "En septembre 1892, la France fête les cent ans de la République, née le 21 septembre 1792. Pourtant, la France n'a pas été une République pendant tout ce siècle : après la Ire République, Napoléon Ier, puis des rois, puis Napoléon III ont gouverné. La IIe République n'a duré que de 1848 à 1852.",
        "Depuis 1870, la IIIe République s'installe. Ses partisans, comme Léon Gambetta et Jules Ferry, veulent unir tous les Français autour d'elle. Ils lui donnent les symboles de la Révolution : La Marseillaise devient l'hymne national en 1879, et le 14 juillet, la fête nationale en 1880. Le drapeau tricolore est celui de la France depuis 1830. La devise « Liberté, Égalité, Fraternité » est inscrite sur les bâtiments publics. Aujourd'hui encore, Marianne représente la République sur les mairies, les pièces et les timbres.",
        "Pour le centenaire de 1892, des fêtes sont organisées dans tout le pays ; les affiches montrent Marianne et les symboles républicains.",
      ],
      questions: [
        ["Depuis combien de temps la République existe-t-elle en 1892 ?", "Cent ans : elle est née en 1792."],
        ["La France a-t-elle toujours été une République de 1792 à 1892 ? J'explique.", "Non : Napoléon Ier, des rois, puis Napoléon III ont gouverné ; la République ne s'installe durablement qu'à partir de 1870."],
        ["Je relève trois symboles de la République, avec leur date quand le texte la donne.", "La Marseillaise, hymne national en 1879 ; le 14 juillet, fête nationale en 1880 ; le drapeau tricolore, depuis 1830 ; la devise ; Marianne."],
        ["Pourquoi les républicains choisissent-ils les symboles de la Révolution ?", "Pour unir tous les Français autour de la République, héritière de 1789."],
      ],
    },
    exo(VERS_REPUBLIQUE, "symboles"),
    {
      sorte: "document", id: "ecole-ferry", titre: "L'école primaire au temps de Jules Ferry",
      rappel: "Gratuite (1881), obligatoire de 6 à 13 ans et laïque (1882), l'école de Jules Ferry instruit tous les enfants et forme des citoyens.",
      texte: [
        "Pour les républicains, instruire le peuple est la clé de la République. Avec les lois de Jules Ferry, l'école primaire publique devient gratuite en 1881, puis obligatoire de 6 à 13 ans et laïque en 1882 : la morale y remplace l'instruction religieuse. En 1886, tous les maîtres des écoles publiques sont laïcs.",
        "Dans chaque commune, on construit une école, souvent avec la mairie : c'est la mairie-école. Les filles et les garçons ont des classes séparées. La classe a son tableau noir, son poêle, ses cartes de France au mur, ses pupitres où l'on écrit à la plume et à l'encre. La journée commence par une leçon de morale. Les filles apprennent aussi la couture et la tenue de la maison. Vers 12 ans, les bons élèves passent le certificat d'études.",
        "Sur les cartes accrochées aux murs, l'empire colonial français s'étend en Afrique et en Asie : l'école apprend aussi à en être fier.",
      ],
      questions: [
        ["Que changent les lois de Jules Ferry ?", "L'école primaire publique devient gratuite, obligatoire de 6 à 13 ans et laïque."],
        ["Pourquoi les républicains veulent-ils instruire tous les enfants ?", "Pour enraciner la République et former des citoyens."],
        ["Je relève trois objets d'une classe vers 1900.", "Le tableau noir, le poêle, les cartes, les pupitres, la plume et l'encre."],
        ["Qu'apprennent les filles en plus des garçons ?", "La couture et la tenue de la maison."],
      ],
    },
    {
      sorte: "trier", id: "ecole-hier", titre: "L'école vers 1900 et aujourd'hui",
      consigne: "Je lis chaque étiquette. Je l'écris dans la bonne colonne : l'école vers 1900, ou l'école d'aujourd'hui.",
      rappel: "L'école a changé depuis 1900 : la mixité, les outils, l'instruction jusqu'à 16 ans. Elle reste au cœur de la République.",
      colonnes: ["L'école vers 1900", "L'école d'aujourd'hui"],
      items: [
        ["on écrit à la plume et à l'encre", 0], ["un poêle chauffe la classe", 0], ["les filles et les garçons sont dans des classes séparées", 0],
        ["une leçon de morale commence la journée", 0], ["le certificat d'études, vers 12 ans", 0], ["l'école est obligatoire jusqu'à 13 ans", 0],
        ["on écrit au stylo ou au clavier", 1], ["les classes sont mixtes", 1], ["l'enseignement moral et civique", 1],
        ["l'instruction est obligatoire de 3 à 16 ans", 1], ["un tableau numérique", 1], ["des tablettes ou des ordinateurs", 1],
      ],
    },
    {
      sorte: "document", id: "droits-devoirs", titre: "Des droits et des devoirs",
      rappel: "Le citoyen a des droits et des devoirs. Ils se sont étendus : le vote des hommes en 1848, celui des femmes en 1944, la Déclaration universelle des droits de l'homme en 1948.",
      texte: [
        "Dans une démocratie, les citoyens ont des droits et des devoirs. Ils ont le droit de voter, de dire ce qu'ils pensent, de croire ou de ne pas croire, de s'instruire, d'être soignés. Ils ont le devoir de respecter les lois et les autres, et de payer leurs impôts selon leurs moyens ; ils peuvent être appelés comme jurés dans un procès.",
        "Ces droits se sont étendus au fil du temps. En 1848, tous les hommes peuvent voter ; en 1944, les femmes aussi. En 1948, la Déclaration universelle des droits de l'homme, adoptée par l'Organisation des Nations unies, proclame les droits de tous les êtres humains. Aujourd'hui, en France, on vote à partir de 18 ans, et l'instruction est obligatoire de 3 à 16 ans, pour les filles comme pour les garçons.",
      ],
      questions: [
        ["Je cite deux droits et deux devoirs du citoyen.", "Voter, s'exprimer, s'instruire, être soigné ; respecter les lois et les autres, payer ses impôts, être juré."],
        ["Depuis quand les femmes votent-elles en France ?", "Depuis 1944."],
        ["Qu'est-ce que la Déclaration universelle des droits de l'homme ?", "Un texte adopté par l'ONU en 1948, qui proclame les droits de tous les êtres humains."],
      ],
    },
  ],
  evaluation: [
    ["J'explique quand la France est devenue durablement une République.", "La République naît en 1792, mais ne s'installe durablement qu'à partir de 1870, avec la IIIe République."],
    ["Je nomme trois symboles de la République.", "Le drapeau tricolore, La Marseillaise, le 14 juillet, Marianne, la devise."],
    ["J'explique le rôle de l'école de Jules Ferry pour la République.", "Gratuite, obligatoire et laïque, elle instruit tous les enfants et forme des citoyens attachés à la République."],
    ["Je cite un droit et un devoir du citoyen.", "Voter, s'exprimer ; respecter les lois, payer ses impôts."],
  ],
};

const AGE_INDUSTRIEL_2020: ThemeHGCM = {
  id: "age-industriel-2020-cm2", classe: "CM2", histoire: true, titre: "L'âge industriel en France (programme 2020)",
  question: "Comment l'industrialisation a-t-elle transformé les manières de travailler et de vivre ?",
  frise: {
    titre: "L'âge industriel en France", debut: 1750, fin: 1950, pas: 25,
    bandes: [
      { nom: "XVIIIe siècle", debut: 1750, fin: 1801, couleur: JAUNE },
      { nom: "XIXe siècle", debut: 1801, fin: 1901, couleur: GRIS },
      { nom: "XXe siècle", debut: 1901, fin: 1950, couleur: BLEU },
    ],
    reperes: [
      { date: 1770, quand: "Fin du XVIIIe s.", quoi: "La révolution industrielle commence en Angleterre" },
      { date: 1830, quand: "Après 1830", quoi: "L'industrialisation prend son essor en France" },
      { date: 1852, quand: "1852", quoi: "Le premier grand magasin : le Bon Marché, à Paris" },
      { date: 1884, quand: "1884", quoi: "La loi qui autorise les syndicats" },
      { date: jour(1906, 3, 10), quand: "1906", quoi: "La catastrophe de la mine de Courrières : plus de 1 000 morts" },
      { date: 1931, quand: "1931", quoi: "La majorité des Français vit en ville" },
    ],
  },
  motsCles: [
    ...AGE_INDUSTRIEL.motsCles,
    ["le grand magasin", "Un très grand magasin qui vend de tout, à prix fixe, né au XIXe siècle."],
    ["l'exode rural", "Le départ des habitants des campagnes vers les villes."],
  ],
  exercices: [
    {
      sorte: "document", id: "energies", titre: "Énergies et machines",
      rappel: "Le charbon et la vapeur, puis l'électricité et le pétrole, font tourner les machines : on produit plus, on va plus vite.",
      texte: [
        "Au XIXe siècle, la machine à vapeur, qui brûle du charbon, fait tourner les usines, les locomotives et les bateaux. Les ateliers et les usines produisent beaucoup plus. Les chemins de fer se développent : en 1900, ils relient toutes les grandes villes de France.",
        "À partir de 1880, deux nouvelles énergies arrivent : l'électricité, qui éclaire les villes et fait tourner les moteurs, et le pétrole, qui fait marcher le moteur des premières automobiles. Avant 1914, la France est l'un des premiers pays à fabriquer des automobiles. Dans les campagnes, les machines agricoles se répandent surtout après la Première Guerre mondiale.",
      ],
      questions: [
        ["Quelle énergie fait tourner les machines au début de l'âge industriel ?", "La vapeur, produite en brûlant du charbon."],
        ["Quelles énergies nouvelles arrivent à partir de 1880 ? À quoi servent-elles ?", "L'électricité, pour éclairer et faire tourner les moteurs ; le pétrole, pour le moteur des automobiles."],
        ["Je cite trois machines de l'âge industriel.", "La machine à vapeur, la locomotive, le bateau à vapeur, l'automobile, les machines agricoles."],
      ],
    },
    {
      sorte: "document", id: "mine", titre: "Le travail à la mine",
      rappel: "À la mine, le travail est dur et dangereux ; autour d'elle naissent des cités ouvrières ; les mineurs luttent pour de meilleures conditions.",
      texte: [
        "Avant 1914, les trois quarts des mines de charbon de France se trouvent dans le Nord et le Pas-de-Calais. Au fond, les mineurs abattent le charbon à la lumière de leur lampe ; en surface, sur le carreau de la mine, des femmes et des enfants trient le charbon remonté.",
        "Le travail est dangereux : en 1906, à Courrières, une explosion tue plus de 1 000 mineurs. Autour des mines, les compagnies construisent des cités ouvrières. Des mineurs viennent de Belgique, de Pologne, d'Italie. Les mineurs font grève pour obtenir de meilleurs salaires et moins de danger ; depuis 1874, les femmes n'ont plus le droit de travailler au fond.",
      ],
      questions: [
        ["Où se trouvent la plupart des mines de charbon de France avant 1914 ?", "Dans le Nord et le Pas-de-Calais."],
        ["Je décris le travail au fond et sur le carreau de la mine.", "Au fond, les mineurs abattent le charbon ; sur le carreau, des femmes et des enfants le trient."],
        ["Pourquoi le travail à la mine est-il dangereux ?", "Les explosions, les éboulements : à Courrières, en 1906, plus de 1 000 mineurs meurent."],
      ],
    },
    {
      sorte: "document", id: "usine-magasin", titre: "L'usine, l'atelier, le grand magasin",
      rappel: "Usine, atelier, grand magasin : des conditions de travail différentes, souvent dures ; en 1884, les syndicats sont autorisés.",
      texte: [
        "À l'usine, des centaines d'ouvriers et d'ouvrières travaillent sur des machines, aux mêmes heures, selon un règlement strict ; une erreur peut coûter une amende. Dans le textile, beaucoup de femmes et d'enfants travaillent. L'atelier, plus petit et plus ancien, reste très répandu en France : on y travaille plus longtemps, mais la discipline y est moins dure.",
        "En 1852, Aristide Boucicaut ouvre à Paris le premier grand magasin, le Bon Marché. On y vend des vêtements tout faits, à prix fixe, à une clientèle nombreuse. Des vendeuses et des vendeurs y travaillent ; des ouvrières cousent chez elles, payées à la pièce.",
        "En 1884, la loi autorise les syndicats, qui défendent les droits des travailleurs.",
      ],
      questions: [
        ["Je compare le travail à l'usine et à l'atelier.", "À l'usine, beaucoup d'ouvriers, des machines, des horaires stricts, un règlement ; à l'atelier, plus petit, des journées plus longues mais une discipline moins dure."],
        ["Qu'est-ce qu'un grand magasin ? Lequel ouvre le premier ?", "Un très grand magasin qui vend de tout, à prix fixe ; le Bon Marché, à Paris, en 1852."],
        ["Que permet la loi de 1884 ?", "Créer des syndicats pour défendre les droits des travailleurs."],
      ],
    },
    {
      sorte: "document", id: "ville", titre: "La ville industrielle",
      rappel: "Avec l'industrie, les villes grandissent et changent : gares, usines, quartiers ouvriers et bourgeois ; en 1931, la majorité des Français vit en ville.",
      texte: [
        "Avec l'industrie, les villes grandissent : en 1831, moins d'un Français sur cinq vit en ville ; en 1931, plus d'un sur deux. Des villes naissent autour d'une mine ou d'une usine, comme Decazeville, dans l'Aveyron ; d'autres se transforment, comme Le Creusot avec les usines Schneider.",
        "La ville change : on construit des gares, des ponts et des halles en métal, puis des tramways. À Paris, le préfet Haussmann fait percer de larges avenues ; beaucoup d'ouvriers partent vers la périphérie. Les villes ont des quartiers d'usines, des quartiers ouvriers pauvres, des quartiers bourgeois. Le charbon pollue l'air, mais l'eau courante, les égouts et le ramassage des ordures progressent : dans les années 1880, le préfet Poubelle impose les boîtes à ordures à Paris.",
      ],
      questions: [
        ["Quelle part des Français vit en ville en 1831 ? Et en 1931 ?", "Moins d'un sur cinq ; plus d'un sur deux."],
        ["Je cite deux villes nées ou transformées par l'industrie.", "Decazeville, Le Creusot."],
        ["Je relève deux changements dans la ville industrielle.", "Des gares, des ponts en métal, des tramways, de larges avenues, l'eau courante, les égouts, le ramassage des ordures."],
      ],
    },
    {
      sorte: "document", id: "rural", titre: "Le monde rural",
      rappel: "La France reste longtemps rurale ; les campagnes se vident, se désenclavent, se spécialisent, puis se modernisent.",
      texte: [
        "Au XIXe siècle, la France reste un pays de paysans : vers 1850, la majorité des Français travaillent la terre, et on n'a jamais cultivé autant de champs. Les campagnes sont très peuplées et souvent pauvres ; beaucoup de jeunes partent vers les villes pour devenir ouvriers ou domestiques : c'est l'exode rural.",
        "Le chemin de fer désenclave les campagnes : les produits voyagent plus loin. Peu à peu, chaque région se spécialise : la vigne, le blé, l'élevage. Les engrais et les machines agricoles se répandent surtout après la Première Guerre mondiale ; en 1932, quatre communes rurales sur cinq ont l'électricité.",
      ],
      questions: [
        ["Pourquoi beaucoup de jeunes quittent-ils les campagnes ?", "Les campagnes sont très peuplées et souvent pauvres ; en ville, ils espèrent un travail d'ouvrier ou de domestique."],
        ["Qu'est-ce que l'exode rural ?", "Le départ des habitants des campagnes vers les villes."],
        ["Je relève deux changements dans les campagnes.", "Le chemin de fer, la spécialisation des régions, les machines, les engrais, l'électricité."],
      ],
    },
    exo(AGE_INDUSTRIEL, "vie-quotidienne"),
  ],
  evaluation: [
    ["J'explique ce qu'est l'industrialisation.", "Le développement des machines et des usines, qui change la manière de produire."],
    ["Je décris le travail à la mine, à l'usine ou au grand magasin.", "Des journées longues, un travail dur et souvent dangereux, une discipline stricte ; des syndicats à partir de 1884."],
    ["J'explique comment l'industrialisation transforme la ville ou la campagne.", "Les villes grandissent, avec gares, usines et quartiers ouvriers ; les campagnes se vident et se modernisent."],
  ],
};

const GUERRES_UE_2020: ThemeHGCM = {
  id: "guerres-mondiales-ue-cm2", classe: "CM2", histoire: true, titre: "La France, des guerres mondiales à l'Union européenne (programme 2020)",
  question: "Comment les traumatismes des deux guerres mondiales sont-ils à l'origine de la recherche d'une paix durable en Europe ?",
  frise: {
    titre: "Des guerres mondiales à l'Union européenne", debut: 1910, fin: 2005, pas: 10,
    bandes: [
      { nom: "", debut: 1910, fin: jour(1914, 8, 3), couleur: VERT },
      { nom: "Guerre", debut: jour(1914, 8, 3), fin: jour(1918, 11, 11), couleur: ROSE },
      { nom: "", debut: jour(1918, 11, 11), fin: jour(1939, 9, 3), couleur: VERT },
      { nom: "Guerre", debut: jour(1939, 9, 3), fin: jour(1945, 5, 8), couleur: ROSE },
      { nom: "", debut: jour(1945, 5, 8), fin: 1951, couleur: VERT },
      { nom: "La construction européenne", debut: 1951, fin: 2005, couleur: BLEU, aPlacer: true },
    ],
    reperes: [
      { date: jour(1914, 8, 3), quand: "1914 – 1918", quoi: "La Première Guerre mondiale" },
      { date: jour(1939, 9, 3), quand: "1939 – 1945", quoi: "La Seconde Guerre mondiale" },
      { date: jour(1944, 6, 6), quand: "6 juin 1944", quoi: "Le débarquement des Alliés en Normandie" },
      { date: 1951, quand: "1951", quoi: "Le début de la construction européenne" },
      { date: jour(1957, 3, 25), quand: "1957", quoi: "Le traité de Rome" },
      { date: 1992, quand: "1992", quoi: "Le traité de Maastricht : l'Union européenne" },
    ],
  },
  motsCles: [
    ["la guerre mondiale", "Une guerre où s'affrontent des pays de tous les continents."],
    ["le poilu", "Le surnom des soldats français de la Première Guerre mondiale."],
    ["l'armistice", "L'accord qui arrête les combats : le 11 novembre 1918."],
    ["l'Occupation", "La présence de l'armée allemande en France, de 1940 à 1944."],
    ["la Résistance", "Ceux et celles qui luttent contre l'occupant et le régime de Vichy."],
    ["le génocide", "L'extermination organisée d'un peuple : celle des Juifs d'Europe pendant la Seconde Guerre mondiale."],
    ["la construction européenne", "L'union progressive des pays d'Europe, depuis 1951, pour garantir la paix."],
    ["la citoyenneté européenne", "Les droits des citoyens des pays de l'Union européenne, comme circuler librement ou élire le Parlement européen."],
  ],
  exercices: [
    exo(PREMIERE_GUERRE, "bilan-1918"),
    exo(PREMIERE_GUERRE, "tranchees"),
    CARTE_FRONT,
    exo(SECONDE_GUERRE, "occupation"),
    CARTE_1940,
    exo(SECONDE_GUERRE, "vichy-juifs"),
    {
      sorte: "tableau", id: "comparer-guerres", titre: "Deux guerres mondiales",
      consigne: "Je complète le tableau avec les documents de la séquence. Puis j'écris une phrase qui compare les deux guerres.",
      rappel: "Les deux guerres mondiales ont été d'une violence extrême : environ 18,6 millions de morts pour la première, 62 millions pour la seconde, dont une majorité de civils.",
      entetes: ["", "La Première Guerre mondiale", "La Seconde Guerre mondiale"],
      lignes: [["Les dates", "", ""], ["Les combats en France", "", ""], ["Les morts dans le monde", "", ""], ["Plus de soldats ou plus de civils tués ?", "", ""],
        ["Un évènement marquant", "", ""], ["Ce qu'elle laisse dans ma commune", "", ""]],
      reponses: [["Les dates", "1914 – 1918", "1939 – 1945"], ["Les combats en France", "Au nord et à l'est : le front, les tranchées", "La défaite de 1940, l'Occupation, puis la Libération"],
        ["Les morts dans le monde", "Environ 18,6 millions", "Environ 62 millions"], ["Plus de soldats ou plus de civils tués ?", "Plus de soldats", "Plus de civils"],
        ["Un évènement marquant", "La bataille de Verdun, en 1916", "Le débarquement du 6 juin 1944"], ["Ce qu'elle laisse dans ma commune", "Le monument aux morts", "D'autres noms sur le monument, des plaques"]],
    },
    exo(DEPUIS_1945, "europe"),
    CARTE_UE,
    {
      sorte: "document", id: "droits-europe", titre: "Des droits pour tous, une citoyenneté européenne",
      rappel: "Après 1945 : l'ONU, la Déclaration universelle des droits de l'homme (1948) ; les citoyens de l'Union européenne sont aussi citoyens européens.",
      texte: [
        "Après 1945, pour que de telles horreurs ne recommencent pas, les pays du monde fondent l'Organisation des Nations unies, l'ONU. En 1948, elle adopte la Déclaration universelle des droits de l'homme : « Tous les êtres humains naissent libres et égaux en dignité et en droits. » En 1950, des pays d'Europe signent la Convention européenne des droits de l'homme.",
        "Les citoyens des pays de l'Union européenne sont aussi citoyens européens : ils peuvent circuler, vivre, étudier et travailler dans les autres pays de l'Union, et ils élisent le Parlement européen. En 2000, l'Union adopte sa Charte des droits fondamentaux.",
      ],
      questions: [
        ["Pourquoi les pays du monde fondent-ils l'ONU en 1945 ?", "Pour que de telles horreurs ne recommencent pas, et pour maintenir la paix."],
        ["Que proclame la Déclaration universelle de 1948 ?", "Que tous les êtres humains naissent libres et égaux en dignité et en droits."],
        ["Je cite deux droits des citoyens européens.", "Circuler, vivre, étudier, travailler dans un autre pays de l'Union ; élire le Parlement européen."],
      ],
    },
  ],
  evaluation: [
    ["Je situe les deux guerres mondiales sur la frise.", "1914 – 1918 ; 1939 – 1945."],
    ["J'explique pourquoi ces deux guerres ont été d'une violence extrême.", "Des millions de morts — 18,6 puis 62 millions —, des civils tués en masse, le génocide des Juifs."],
    ["J'explique pourquoi la France s'est engagée dans la construction européenne.", "Pour rendre la guerre impossible entre les pays européens et garantir une paix durable."],
    ["Je cite deux étapes de la construction européenne.", "1951, le charbon et l'acier en commun ; 1957, le traité de Rome ; 1992, le traité de Maastricht."],
  ],
};

const SE_DEPLACER_2020: ThemeHGCM = {
  id: "se-deplacer-2020-cm2", classe: "CM2", histoire: false, titre: "Se déplacer (programme 2020)",
  question: "Quels sont les motifs, les modes et les contraintes des déplacements, au quotidien et hors du quotidien ? Quels aménagements leur sont liés ?",
  motsCles: [
    ["la mobilité", "L'ensemble des déplacements des personnes."],
    ["les déplacements quotidiens", "Ceux qu'on fait chaque jour : aller à l'école, au travail, faire les courses."],
    ["le tourisme", "Un déplacement de loisir, d'au moins une nuit hors de chez soi."],
    ["la migration", "Un déplacement pour s'installer durablement ailleurs."],
    ["l'infrastructure de transport", "Ce qu'on construit pour se déplacer : routes, voies ferrées, gares, ports, aéroports."],
    ["la distance en temps", "La durée d'un trajet, qui dépend du mode de transport."],
    ["le covoiturage", "Partager une voiture pour un même trajet."],
  ],
  lieux: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Bordeaux", "Londres", "Bruxelles", "Berlin", "Madrid", "Rome", "New York", "Tokyo", "Dakar", "Montréal"],
  exercices: [
    exo(SE_DEPLACER, "mes-deplacements"),
    exo(SE_DEPLACER, "km-temps"),
    {
      sorte: "document", id: "ailleurs", titre: "Aller à l'école ailleurs dans le monde",
      rappel: "Selon les lieux, on va à l'école à pied, à cheval, à vélo, en scooter, en car : les déplacements dépendent des distances, des infrastructures, de la richesse.",
      texte: [
        "Dans le documentaire Sur le chemin de l'école (Pascal Plisson, 2013), des enfants du Kenya, du Maroc, d'Argentine et d'Inde font chaque jour des kilomètres pour aller à l'école : à pied à travers la savane ou la montagne, à cheval, ou poussé en fauteuil roulant par ses frères.",
        "Dans de nombreux villages d'Afrique ou d'Asie, il n'y a ni car scolaire ni route goudronnée : on marche longtemps. Dans les grandes villes d'Asie, les scooters et les vélos sont partout. En France, à la campagne, on prend souvent la voiture ou le car scolaire ; en ville, on marche, on prend le bus, le métro ou le tramway.",
      ],
      questions: [
        ["Je relève trois façons d'aller à l'école dans le monde.", "À pied, à cheval, en fauteuil roulant poussé par ses frères, en scooter, à vélo, en car, en voiture, en métro."],
        ["Pourquoi certains enfants marchent-ils si longtemps ?", "L'école est loin, et il n'y a ni car scolaire ni route goudronnée."],
        ["Je compare avec mon trajet jusqu'à l'école.", "La réponse dépend de l'élève."],
      ],
    },
    exo(SE_DEPLACER, "infrastructures"),
    {
      sorte: "document", id: "aeroport", titre: "De ville en ville : un aéroport international",
      rappel: "Gares, ports, aéroports : on y change de mode de transport pour aller loin, en France, en Europe, dans le monde.",
      texte: [
        "L'aéroport de Roissy-Charles-de-Gaulle, au nord de Paris, est le plus grand aéroport de France. Des avions y relient Paris aux grandes villes d'Europe et du monde : Londres, Madrid, New York, Tokyo, Dakar, Montréal.",
        "Pour y venir, on peut prendre la voiture par l'autoroute, le RER depuis Paris, ou le TGV : une gare TGV se trouve dans l'aéroport. On y change de mode de transport. Chaque jour, des pilotes, des touristes, des familles qui rendent visite à leurs proches et des personnes qui voyagent pour leur travail s'y croisent.",
      ],
      questions: [
        ["Je relève trois moyens de transport pour aller à l'aéroport.", "La voiture, le RER, le TGV."],
        ["Pourquoi dit-on qu'on y change de mode de transport ?", "On arrive en voiture, en RER ou en train, et on repart en avion."],
        ["Pour quelles raisons voyage-t-on de ville en ville ?", "Le travail, le tourisme, les visites à la famille."],
      ],
    },
    {
      sorte: "carte", id: "carte-villes-france", titre: "Des villes repères en France",
      rappel: "Six grandes villes françaises : Paris, Lyon, Marseille, Toulouse, Lille, Bordeaux.",
      consignes: ["J'écris le nom des grandes villes numérotées.", "Je marque d'une croix le lieu où j'habite."],
      carte: {
        fond: "france",
        numeros: [{ quoi: "paris", nom: "Paris" }, { quoi: "lyon", nom: "Lyon" }, { quoi: "marseille", nom: "Marseille" }, { quoi: "toulouse", nom: "Toulouse" },
          { quoi: "lille", nom: "Lille" }, { quoi: "bordeaux", nom: "Bordeaux" }],
        legendeNumeros: "une grande ville",
        banque: true,
      },
    },
    {
      sorte: "carte", id: "carte-villes-europe", titre: "Des villes repères en Europe",
      rappel: "Des capitales européennes : Paris, Londres, Bruxelles, Berlin, Madrid, Rome.",
      consignes: ["J'écris le nom des capitales numérotées."],
      carte: {
        fond: "europe",
        numeros: [{ quoi: "paris", nom: "Paris" }, { quoi: "londres", nom: "Londres" }, { quoi: "bruxelles", nom: "Bruxelles" }, { quoi: "berlin", nom: "Berlin" },
          { quoi: "madrid", nom: "Madrid" }, { quoi: "rome", nom: "Rome" }],
        legendeNumeros: "une capitale",
        banque: true,
      },
    },
    {
      sorte: "carte", id: "carte-villes-monde", titre: "Des villes repères dans le monde",
      rappel: "De grandes villes du monde : Paris, New York, Montréal, Dakar, Tokyo.",
      consignes: ["J'écris le nom des grandes villes numérotées."],
      carte: {
        fond: "monde",
        numeros: [{ quoi: "paris", nom: "Paris" }, { quoi: "new-york", nom: "New York" }, { quoi: "montreal", nom: "Montréal" }, { quoi: "dakar", nom: "Dakar" },
          { quoi: "tokyo", nom: "Tokyo" }],
        legendeNumeros: "une grande ville",
        banque: true,
      },
    },
  ],
  evaluation: [
    ["Je cite deux raisons de se déplacer chaque jour, et deux raisons de voyager plus loin.", "Aller à l'école, au travail, faire les courses ; le tourisme, les visites à la famille, le travail."],
    ["J'explique la différence entre la distance en kilomètres et la distance en temps.", "La première est la longueur du trajet ; la seconde, sa durée, qui dépend du mode de transport."],
    ["Je nomme trois infrastructures de transport.", "Une gare, un aéroport, un port, une autoroute, une voie cyclable."],
    ["Je compare les déplacements en France et dans un autre lieu du monde.", "En France, la voiture et les transports en commun ; ailleurs, parfois de longues marches, le scooter, le vélo."],
  ],
};

const INTERNET_2020: ThemeHGCM = {
  id: "internet-2020-cm2", classe: "CM2", histoire: false, titre: "Communiquer d'un bout à l'autre du monde grâce à l'Internet (programme 2020)",
  question: "Comment l'Internet met-il les hommes et les territoires en contact ? Tous les êtres humains y ont-ils également accès ?",
  motsCles: [
    ...INTERNET.motsCles,
    ["la fracture numérique", "L'inégalité entre ceux qui ont accès à Internet et ceux qui n'y ont pas accès."],
  ],
  lieux: [...(INTERNET.lieux ?? []), "les États-Unis"],
  exercices: [
    exo(INTERNET, "usages"),
    exo(INTERNET, "fonctionnement"),
    exo(INTERNET, "carte-cables"),
    {
      sorte: "document", id: "info-en-ligne", titre: "Qui écrit ce qu'on lit sur Internet ?",
      rappel: "Sur Internet, chacun peut écrire : on vérifie d'où vient une information, et on respecte le droit à l'image.",
      texte: [
        "Sur Internet, chacun peut lire, mais aussi écrire : un article de blog, une vidéo, un commentaire. Les encyclopédies en ligne, comme Wikipédia ou, pour les jeunes, Vikidia, sont écrites et corrigées par leurs utilisateurs. C'est leur force, car chacun peut partager ce qu'il sait ; c'est aussi leur limite, car une information peut être fausse.",
        "Avant de croire une information, on se demande qui l'a écrite, quand, et si d'autres sources sérieuses disent la même chose. On ne publie pas la photo de quelqu'un sans son accord : c'est le droit à l'image. Les grandes entreprises d'Internet ont surtout leurs bureaux aux États-Unis, et elles gardent beaucoup d'informations sur leurs utilisateurs.",
      ],
      questions: [
        ["Qui écrit les articles d'une encyclopédie en ligne comme Vikidia ?", "Ses utilisateurs."],
        ["Quelles questions je me pose avant de croire une information ?", "Qui l'a écrite ? Quand ? D'autres sources sérieuses disent-elles la même chose ?"],
        ["Qu'est-ce que le droit à l'image ?", "Le droit de refuser qu'on publie sa photo sans son accord."],
      ],
    },
    exo(INTERNET, "acces"),
  ],
  evaluation: [
    ["J'explique comment Internet met en contact des personnes très éloignées.", "Les informations circulent en quelques secondes par des câbles, jusque sous les océans, et par des satellites."],
    ["Je décris l'inégal accès à Internet dans le monde et en France.", "Presque tout le monde est connecté en Europe et en Amérique du Nord, beaucoup moins en Afrique subsaharienne ; en France, des zones blanches."],
    ["Je cite une précaution à prendre avec une information trouvée sur Internet.", "Vérifier qui l'a écrite, et la comparer avec d'autres sources."],
  ],
};

const MIEUX_HABITER: ThemeHGCM = {
  id: "mieux-habiter-cm2", classe: "CM2", histoire: false, titre: "Mieux habiter (programme 2020)",
  question: "Comment mieux habiter par l'amélioration du cadre de vie et la gestion de l'environnement ?",
  motsCles: [
    ["le cadre de vie", "Tout ce qui entoure les habitants là où ils vivent : les logements, les rues, les espaces verts, les services."],
    ["la nature en ville", "Les parcs, les jardins, les arbres, les toits et les murs couverts de plantes, les berges aménagées."],
    ["le jardin partagé", "Un jardin cultivé ensemble par des habitants d'un quartier."],
    ["le tri sélectif", "Séparer ses déchets selon leur sorte, pour qu'ils soient recyclés."],
    ["le recyclage", "Transformer un déchet trié en une nouvelle matière ou un nouvel objet."],
    ["le compost", "Un engrais naturel fait avec les déchets de cuisine et de jardin."],
    ["l'écoquartier", "Un quartier construit pour limiter la pollution, laisser une place à la nature et mêler les habitants."],
    ["le développement durable", "Répondre aux besoins d'aujourd'hui sans empêcher les générations futures de répondre aux leurs."],
  ],
  exercices: [
    {
      sorte: "tableau", id: "diagnostic", titre: "Notre quartier : un diagnostic",
      consigne: "Pendant la sortie, j'observe le quartier. Je complète le tableau. Puis je propose une amélioration.",
      rappel: "Mieux habiter : un cadre de vie agréable, une place pour la nature, des déplacements faciles, des lieux de rencontre, l'environnement respecté.",
      entetes: ["", "Ce que j'observe", "Ce que je propose"],
      lignes: [["La nature : parcs, jardins, arbres", "", ""], ["Se déplacer à pied, à vélo, en bus", "", ""], ["Le tri et le recyclage des déchets", "", ""],
        ["Les lieux de rencontre et de loisirs", "", ""], ["Ce qui pourrait être plus agréable", "", ""]],
    },
    {
      sorte: "document", id: "nature-ville", titre: "La nature en ville",
      rappel: "La nature en ville abrite des animaux et des plantes, rafraîchit la ville, retient l'eau de pluie, et offre des lieux de rencontre.",
      texte: [
        "En ville, la nature a sa place : les parcs, les squares et les avenues plantées d'arbres existent depuis le XIXe siècle. Aujourd'hui, on va plus loin : des toits et des murs se couvrent de plantes, des jardins partagés réunissent les habitants d'un quartier, des berges de fleuves deviennent des promenades pour les piétons et les cyclistes, des ruches sont installées sur des toits, comme à Paris, à Nantes ou à Saint-Étienne.",
        "Les plantes abritent des oiseaux et des insectes ; elles rafraîchissent la ville en été et retiennent l'eau de pluie. Les jardins et les parcs sont aussi des lieux de rencontre et de loisirs.",
      ],
      questions: [
        ["Je relève trois façons de donner une place à la nature en ville.", "Les parcs, les toits et les murs couverts de plantes, les jardins partagés, les berges aménagées, les ruches."],
        ["À quoi sert la nature en ville ?", "Elle abrite des animaux et des plantes, rafraîchit la ville, retient l'eau de pluie ; elle offre des lieux de rencontre."],
        ["Je nomme un lieu de nature près de l'école.", "La réponse dépend de l'école."],
      ],
    },
    {
      sorte: "trier", id: "poubelles", titre: "Où va ce déchet ?",
      consigne: "Je lis chaque déchet. Je l'écris dans la colonne où il doit aller.",
      rappel: "Les consignes de tri changent un peu d'une commune à l'autre : on vérifie celles de la nôtre. Les piles et les ampoules vont dans un point de collecte.",
      colonnes: ["Le bac des emballages et des papiers", "Le verre", "Le compost, les déchets de cuisine", "Les ordures ménagères"],
      items: [
        ["une bouteille en plastique", 0], ["une canette", 0], ["un carton de céréales", 0], ["un journal", 0],
        ["un pot de confiture en verre", 1], ["une bouteille de jus en verre", 1],
        ["des épluchures de légumes", 2], ["un trognon de pomme", 2],
        ["une couche", 3], ["une brosse à dents usée", 3],
      ],
    },
    {
      sorte: "ordonner", id: "chemin-dechet", titre: "Le chemin d'une bouteille en plastique recyclée",
      consigne: "Je lis les étapes. J'écris dans chaque case le numéro de l'étape, dans l'ordre : 1 pour la première.",
      rappel: "Trier, collecter, séparer, recycler : le déchet devient une nouvelle matière.",
      etapes: [
        "La bouteille vide est jetée dans le bac de tri des emballages.",
        "Un camion de collecte sélective ramasse le contenu du bac.",
        "Au centre de tri, les déchets sont séparés selon leur matière.",
        "À l'usine de recyclage, les bouteilles sont broyées, lavées, puis fondues.",
        "Le plastique recyclé sert à fabriquer de nouveaux objets : des bouteilles, des fibres pour des vêtements.",
      ],
    },
    {
      sorte: "document", id: "ecoquartier", titre: "Habiter un écoquartier",
      rappel: "Un écoquartier limite la pollution, laisse une place à la nature, mêle les habitants et les activités ; ses habitants participent à sa vie.",
      texte: [
        "Un écoquartier est un quartier construit ou rénové pour mieux habiter. On le bâtit souvent sur une friche, un ancien terrain industriel, militaire ou portuaire : à Grenoble, l'écoquartier de Bonne est construit à la place d'une ancienne caserne.",
        "Il cherche à limiter la pollution : des bâtiments bien isolés, des énergies renouvelables, le tri des déchets, une place pour les piétons et les vélos, des jardins. Il mêle des logements de toutes sortes, pour des familles, des personnes âgées, des étudiants, avec des commerces, des bureaux et des écoles, pour qu'on puisse y vivre et y travailler sans aller loin. Les habitants participent à la vie du quartier. Depuis 2012, l'État donne un label « ÉcoQuartier » aux quartiers qui respectent ces règles.",
      ],
      questions: [
        ["Sur quels terrains construit-on souvent un écoquartier ?", "Sur des friches : d'anciens terrains industriels, militaires ou portuaires."],
        ["Je relève deux façons de limiter la pollution dans un écoquartier.", "Des bâtiments isolés, des énergies renouvelables, le tri, une place pour les piétons et les vélos, des jardins."],
        ["Pourquoi mêle-t-on logements, commerces et bureaux ?", "Pour que des habitants variés vivent ensemble, et puissent travailler sans aller loin."],
      ],
    },
  ],
  evaluation: [
    ["Je cite deux façons de donner une place à la nature en ville.", "Des parcs, des jardins partagés, des toits couverts de plantes, des berges aménagées."],
    ["J'explique pourquoi on trie et on recycle les déchets.", "Pour réutiliser les matières, économiser les ressources et limiter la pollution."],
    ["Je décris un écoquartier.", "Un quartier qui limite la pollution, laisse une place à la nature et mêle les habitants et les activités."],
    ["Je propose une amélioration pour mieux habiter notre quartier.", "La réponse dépend du quartier."],
  ],
};

/** Les six thèmes du CM2 du programme de 2020 : au choix, cette année. */
// ── Les cartes des évaluations ───────────────────────────────────────────

/** Une carte d'exercice reprise pour l'évaluation : quelques-uns de ses numéros, sans la banque des noms ; ses zones à colorier, si on les garde. */
function pourLEvaluation(e: ExerciceHGCM, garder: number[] | "tous", consigne: string, colorier = true): CarteDEvaluation {
  if (e.sorte !== "carte") throw new Error(`${e.id} n'est pas une carte`);
  const { colorier: groupes, aplats, numeros = [], ...reste } = e.carte;
  return {
    consigne,
    carte: { ...reste, numeros: garder === "tous" ? numeros : garder.map((i) => numeros[i]), banque: false, ...(colorier ? { colorier: groupes, aplats } : {}) },
  };
}

/** La carte d'une évaluation : sa consigne, et la carte, sans banque de noms. */
export interface CarteDEvaluation { consigne: string; carte: CarteHGCM }

/**
 * Les thèmes dont l'évaluation fait localiser — « localiser et nommer sur un
 * fond de carte » — : leur carte, prise à celle d'un exercice quand il y en a
 * une. Les aires régionales et le territoire français ont la leur.
 */
const CARTES_D_EVALUATION: Record<string, CarteDEvaluation> = {
  [EXPLORATIONS.id]: pourLEvaluation(exo(EXPLORATIONS, "carte-empires"), [0, 1, 4, 5], "J'écris le nom des lieux numérotés. Je colorie l'empire espagnol et l'empire portugais."),
  [VERS_REPUBLIQUE.id]: pourLEvaluation(exo(VERS_REPUBLIQUE, "carte-empire-1914"), [0, 3, 5, 6, 7], "J'écris le nom des territoires numérotés de l'empire colonial français.", false),
  [PREMIERE_GUERRE.id]: pourLEvaluation(CARTE_FRONT, "tous", "Je repasse la ligne de front. J'écris le nom des batailles numérotées.", false),
  [SECONDE_GUERRE.id]: pourLEvaluation(CARTE_1940, [0, 1], "Je colorie la zone occupée et la zone libre. J'écris le nom des villes numérotées."),
  [SE_NOURRIR.id]: pourLEvaluation(exo(SE_NOURRIR, "carte-quatre-pays"), [0, 1, 2, 3], "J'écris le nom des quatre pays numérotés."),
  [INEGALITES.id]: {
    consigne: "J'écris le nom des aires régionales numérotées.",
    carte: {
      fond: "monde",
      numeros: [
        { ou: [-100, 45], nom: "l'Amérique du Nord" }, { ou: [-60, -12], nom: "l'Amérique du Sud" }, { ou: [15, 50], nom: "l'Europe" }, { ou: [2, 30], nom: "le Maghreb" },
        { ou: [22, 2], nom: "l'Afrique subsaharienne" }, { ou: [108, 36], nom: "l'Asie de l'Est" }, { ou: [104, 14], nom: "l'Asie du Sud-Est" }, { ou: [134, -25], nom: "l'Océanie" },
      ],
    },
  },
  [INTERNET.id]: pourLEvaluation(exo(INTERNET, "carte-cables"), "tous", "J'écris le nom des aires régionales et des océans numérotés."),
  [INTERNET_2020.id]: pourLEvaluation(exo(INTERNET, "carte-cables"), "tous", "J'écris le nom des aires régionales et des océans numérotés."),
  [TERRITOIRE.id]: {
    consigne: "J'écris le nom des cinq grandes agglomérations et des régions numérotées.",
    carte: {
      fond: "france",
      numeros: [
        { quoi: "paris", nom: "Paris" }, { quoi: "lyon", nom: "Lyon" }, { quoi: "marseille", nom: "Marseille" }, { quoi: "lille", nom: "Lille" }, { quoi: "toulouse", nom: "Toulouse" },
        { quoi: "BRE", nom: "Bretagne" }, { quoi: "GES", nom: "Grand Est" }, { quoi: "OCC", nom: "Occitanie" },
      ],
      legendeNumeros: "une grande agglomération",
    },
  },
  [EAU_DOUCE.id]: pourLEvaluation(exo(EAU_DOUCE, "carte-fleuves"), [0, 1, 2, 3, 4, 6, 7, 8], "J'écris le nom des fleuves et des massifs numérotés."),
  [UNION_EUROPEENNE.id]: pourLEvaluation(CARTE_UE, "tous", "J'écris le nom des six pays fondateurs numérotés.", false),
  [GUERRES_UE_2020.id]: pourLEvaluation(CARTE_UE, "tous", "J'écris le nom des six pays fondateurs numérotés.", false),
  [SE_DEPLACER_2020.id]: pourLEvaluation(exo(SE_DEPLACER_2020, "carte-villes-france"), "tous", "J'écris le nom des grandes villes numérotées."),
};

/** La carte de l'évaluation d'un thème, s'il en a une. */
export const carteDEvaluation = (themeId: string): CarteDEvaluation | undefined => CARTES_D_EVALUATION[themeId];

export const THEMES_HG_CM_2020: ThemeHGCM[] = [TEMPS_REPUBLIQUE_2020, AGE_INDUSTRIEL_2020, GUERRES_UE_2020, SE_DEPLACER_2020, INTERNET_2020, MIEUX_HABITER];

export const THEMES_HG_CM: ThemeHGCM[] = [
  MOYEN_AGE, MONARCHIE, EXPLORATIONS, REVOLUTION,
  REPUBLIQUE_EMPIRE, VERS_REPUBLIQUE, AGE_INDUSTRIEL, PREMIERE_GUERRE, SECONDE_GUERRE, DEPUIS_1945,
  SE_NOURRIR, INEGALITES, SE_DEPLACER, INTERNET,
  TERRITOIRE, EAU_DOUCE, UNION_EUROPEENNE,
  ...THEMES_HG_CM_2020,
];

export const themeHGCM = (id: string): ThemeHGCM | undefined => THEMES_HG_CM.find((t) => t.id === id);
