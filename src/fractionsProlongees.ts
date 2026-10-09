// Les fractions sans séquence détaillée dans les livrets, prolongées.
//
// Le livret CE1 programme cinq séquences de fractions dans l'année et en
// détaille une — les fractions unitaires — ; le livret CE2 en programme cinq
// et détaille celle des longueurs (voir demarchesProblemes.ts). Pour les
// autres — les fractions non unitaires, comparer, ajouter et retrancher au
// CE1 ; les égalités, comparer, ajouter et retrancher au CE2 —, l'enseignant a
// demandé (2026-10-07) de prolonger les livrets : on suit la démarche de la
// séquence détaillée — manipuler, plier, colorier, nommer, puis écrire, et
// jouer —, sur ce que le livret programme, et la séquence le dit.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_FRACTIONS, STYLE_JEUX_MATHS, htmlFractions, type ReglagesFractions } from "./jeuxMaths";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const ADAPTEE = (classe: "CE1" | "CE2", detaillee: string, programmee: string) =>
  `Adaptée de la séquence « ${detaillee} » du livret d'accompagnement de mathématiques du ${classe} (Éduscol, 2025), à la demande de l'enseignant, faute de séquence détaillée pour cette compétence ; le livret la programme : « ${programmee} »`;

const UN_PROBLEME_ET_L_EVALUATION = (probleme: string, evaluation: string) => seance("Des problèmes, et l'évaluation",
  sauront("utiliser les fractions pour raisonner sur un problème, et montrer ce qu'ils savent faire seuls."), 30, [
    ph("Un problème court", "15 min", `En binômes, puis avec l'enseignant : ${probleme} Des schémas, du matériel pour vérifier ; une trace dans le cahier.`),
    ph("Évaluation", "15 min", evaluation),
  ]);

const NON_UNITAIRES_CE1: Demarche = {
  id: "fractions-non-unitaires-ce1",
  nom: "Des fractions plus grandes : trois quarts, deux tiers… (CE1)",
  famille: "Mathématiques",
  source: ADAPTEE("CE1", "Enseigner les fractions", "Séquence 3 : interpréter, représenter, lire les fractions non unitaires inférieures ou égales à 1."),
  resume: "La séquence 3 que programme le livret CE1, en période 3, sur la démarche de la séquence des fractions unitaires : on prend plusieurs parts du tout partagé — trois quarts, c'est trois parts quand le tout est partagé en quatre parts égales —, jusqu'au tout lui-même — quatre quarts ; on les écrit en lettres puis en chiffres, et l'on apprend les mots numérateur et dénominateur, que la séquence des fractions unitaires n'introduisait pas encore.",
  seances: [
    seance("Plusieurs parts : fabriquer un memory", sauront("représenter et nommer une fraction de plusieurs parts — trois quarts, deux tiers — en partageant une surface en parts égales."), 55, [
      ph(T1, "10 min", "Les fractions unitaires rappelées, avec leurs cartes. Le projet : de nouvelles cartes de memory, avec plusieurs parts coloriées. L'enseignant montre : un carré plié en quatre parts égales, trois parts coloriées : « trois quarts du carré » — un quart, un quart et encore un quart.",
        "Montre la partie dont on parle, et d'un geste le tout."),
      ph(T2, "30 min", "Chacun représente deux tiers, trois quarts, trois huitièmes… sur des carrés, des rectangles, des disques — en pliant, puis en coloriant —, colle l'image sur une carte et écrit la fraction en lettres.",
        "Des binômes tuteur-tutoré pour les pliages ; des formes en réserve pour recommencer."),
      ph(T3, "15 min", "Des cartes d'élèves, nommées et justifiées : « trois quarts, c'est trois parts quand le tout est partagé en quatre parts égales » ; une affiche."),
    ]),
    seance("Jouer au memory des fractions", sauront("associer une fraction écrite en lettres et ses images, et la nommer."), 15, [
      ph("Jeux en groupes", "15 min", "Trois fois quinze minutes, en ateliers : l'appariement cartes visibles, le memory, un jeu autocorrectif ; une mise en commun après chaque jeu.")]),
    seance("Jusqu'au tout", sauront("reconnaître une fraction égale à un — quatre quarts, huit huitièmes — et une fraction plus petite que un."), 45, [
      ph(T2, "35 min", "Colorier toutes les parts d'un tout partagé : quatre quarts, huit huitièmes — c'est le tout, c'est un. Puis des fractions où il reste des parts à colorier : elles sont plus petites que un."),
      ph(T3, "10 min", "Ce qu'on retient : une fraction est égale à un quand on prend toutes les parts du tout."),
    ]),
    seance("Écrire en chiffres : numérateur et dénominateur", sauront("écrire et lire en chiffres une fraction inférieure ou égale à un, et nommer son numérateur et son dénominateur."), 55, [
      ph(T1, "15 min", "L'écriture des fractions unitaires rappelée ; l'enseignant écrit trois quarts : 3/4, et nomme : le dénominateur, 4, dit en combien de parts égales le tout est partagé ; le numérateur, 3, combien de parts on prend.",
        "Ne lis jamais « trois sur quatre » : on dit « trois quarts »."),
      ph(T2, "30 min", "Chacun écrit en chiffres les fractions de ses cartes, puis les relit."),
      ph(T3, "10 min", "La trace écrite : une fraction en lettres, en chiffres, en image ; le numérateur et le dénominateur nommés."),
    ]),
    seance("Jouer avec les écritures en chiffres", sauront("associer une écriture en chiffres, son nom et son image."), 15, [
      ph("Jeux en groupes", "15 min", "L'appariement, le memory, le jeu autocorrectif recto-verso, avec les écritures en chiffres.")]),
    UN_PROBLEME_ET_L_EVALUATION("« Tom a mangé trois huitièmes du gâteau, Léa deux huitièmes. Ont-ils mangé tout le gâteau ? »",
      "Représenter, interpréter, écrire et lire des fractions inférieures ou égales à un ; nommer le numérateur et le dénominateur."),
  ],
};

const COMPARER_CE1: Demarche = {
  id: "comparer-fractions-ce1",
  nom: "Comparer des fractions (CE1)",
  famille: "Mathématiques",
  source: ADAPTEE("CE1", "Enseigner les fractions", "Séquence 4 : comparer des fractions unitaires ou de même dénominateur."),
  resume: "La séquence 4 que programme le livret CE1 — dès la période 4, « dans des cas simples », dit le programme — : des fractions d'un même tout partagé de la même façon — on compte les parts prises — ; des fractions unitaires — plus il y a de parts, plus chacune est petite, ce que la séquence des fractions unitaires faisait déjà observer —, avec des bandes de même longueur, puis la bataille des fractions.",
  seances: [
    seance("Même dénominateur : on compte les parts", sauront("comparer deux fractions de même dénominateur, et écrire <, > ou =."), 45, [
      ph(T1, "10 min", "Deux bandes de même longueur, partagées en cinq : deux cinquièmes, quatre cinquièmes ; laquelle est la plus grande ? On colorie, on compare."),
      ph(T2, "25 min", "Par deux, des paires de fractions de même dénominateur : colorier sur les bandes, comparer, écrire <, > ou =."),
      ph(T3, "10 min", "Ce qu'on retient : quand le tout est partagé de la même façon, la plus grande fraction prend le plus de parts."),
    ]),
    seance("Numérateur 1 : plus il y a de parts, plus elles sont petites", sauront("comparer deux fractions unitaires — un quart, un huitième —, et dire pourquoi."), 45, [
      ph(T1, "10 min", "Un huitième ou un quart du même rectangle ? Les cartes du memory le montrent : un huitième, c'est la moitié d'un quart."),
      ph(T2, "25 min", "Des paires de fractions unitaires à colorier sur des bandes de même longueur, et à comparer."),
      ph(T3, "10 min", "La trace écrite : plus il y a de parts égales dans le tout, plus chaque part est petite."),
    ]),
    seance("La bataille des fractions", sauront("comparer vite deux fractions en regardant leurs dessins."), 15, [
      ph("Jeu en groupes", "15 min", "Chacun retourne une carte ; la plus grande fraction remporte le pli ; on s'aide des dessins pour comparer.")]),
    seance("Ranger des fractions", sauront("ranger trois ou quatre fractions de la plus petite à la plus grande."), 20, [
      ph(T2, "15 min", "Ranger des fractions de même dénominateur, puis des fractions unitaires, avec leurs bandes."),
      ph(T3, "5 min", "On compare les rangements, on dit comment on a fait."),
    ]),
    UN_PROBLEME_ET_L_EVALUATION("« Léa a mangé deux huitièmes de la tarte, Tom trois huitièmes : qui en a mangé le plus ? »",
      "Comparer des fractions de même dénominateur et des fractions unitaires, et le justifier."),
  ],
};

const AJOUTER_CE1: Demarche = {
  id: "additionner-fractions-ce1",
  nom: "Ajouter et retrancher des fractions de même dénominateur (CE1)",
  famille: "Mathématiques",
  source: ADAPTEE("CE1", "Enseigner les fractions", "Séquence 5 : additionner ou soustraire des fractions de même dénominateur."),
  resume: "La séquence 5 que programme le livret CE1, en période 4 : ajouter des parts d'un même tout — deux huitièmes et trois huitièmes, cinq huitièmes —, en enlever, avec les bandes, puis par l'écriture en chiffres ; le résultat reste inférieur ou égal à un.",
  seances: [
    seance("Ajouter des parts", sauront("ajouter deux fractions de même dénominateur en ajoutant les parts."), 45, [
      ph(T1, "10 min", "Une bande partagée en huit : on colorie deux huitièmes, puis trois huitièmes d'une autre couleur ; combien de huitièmes en tout ?"),
      ph(T2, "25 min", "Des sommes à calculer, la bande pour s'aider : 2/8 + 3/8 = 5/8."),
      ph(T3, "10 min", "Ce qu'on retient : on ajoute des parts de même taille ; le dénominateur ne change pas."),
    ]),
    seance("Enlever des parts", sauront("retrancher une fraction d'une autre de même dénominateur."), 45, [
      ph(T1, "10 min", "Cinq sixièmes coloriés ; on en enlève deux : combien en reste-t-il ?"),
      ph(T2, "25 min", "Des différences à calculer, avec les bandes."),
      ph(T3, "10 min", "Ce qu'on retient : on enlève des parts de même taille."),
    ]),
    seance("S'entraîner à l'ardoise", sauront("ajouter et retrancher des fractions de même dénominateur, de plus en plus sans les bandes."), 15, [
      ph("À l'ardoise", "15 min", "Des sommes et des différences dites ou écrites au tableau ; on vérifie avec les bandes.")]),
    seance("Des problèmes", sauront("utiliser une somme ou une différence de fractions pour résoudre un problème."), 30, [
      ph(T2, "25 min", "« Une tarte est partagée en six parts égales. Inès en mange deux, Tom une. Quelle fraction de la tarte ont-ils mangée ? Quelle fraction reste-t-il ? » Des schémas, des bandes."),
      ph(T3, "5 min", "Une trace dans le cahier."),
    ]),
    seance("Évaluation", sauront("ajouter et retrancher seuls des fractions de même dénominateur."), 20, [
      ph("Évaluation", "20 min", "Des sommes et des différences de fractions, et un problème.")]),
  ],
};

const EGALITES_CE2: Demarche = {
  id: "egalites-fractions-ce2",
  nom: "Des fractions égales (CE2)",
  famille: "Mathématiques",
  source: ADAPTEE("CE2", "Mesurer des longueurs en utilisant les fractions", "Séquence 2 - Établir des égalités de fractions (fractions d'un tout)."),
  resume: "La séquence 2 que programme le livret CE2 : les fractions d'un tout réinvesties pour établir des égalités — un demi, c'est deux quarts, c'est quatre huitièmes —, en pliant des bandes unités comme dans la séquence détaillée du livret, puis en les rangeant dans un répertoire.",
  seances: [
    seance("Plier : un demi, deux quarts, quatre huitièmes", sauront("montrer avec des bandes pliées qu'un demi, deux quarts et quatre huitièmes sont égaux, et l'écrire."), 45, [
      ph(T1, "10 min", "Trois bandes unités de même longueur : l'une pliée en deux, l'autre en quatre, la troisième en huit."),
      ph(T2, "25 min", "Colorier un demi, deux quarts, quatre huitièmes ; superposer les bandes : les longueurs coloriées sont les mêmes."),
      ph(T3, "10 min", "La trace écrite : 1/2 = 2/4 = 4/8."),
    ]),
    seance("Les tiers, les sixièmes, les douzièmes", sauront("trouver des fractions égales à un tiers, à deux tiers."), 45, [
      ph(T2, "35 min", "La même démarche avec des bandes partagées en trois, en six, en douze : un tiers, c'est deux sixièmes, c'est quatre douzièmes."),
      ph(T3, "10 min", "La trace écrite s'enrichit."),
    ]),
    seance("Un répertoire des fractions égales", sauront("chercher toutes les fractions égales à une fraction donnée, et justifier."), 45, [
      ph(T2, "35 min", "Des bandes partagées en 2, 3, 4, 5, 6, 8, 10, 12 parts ; on cherche toutes les fractions égales à un demi, à un tiers, à un quart…"),
      ph(T3, "10 min", "Un répertoire collectif, affiché."),
    ]),
    seance("Le memory des fractions égales", sauront("reconnaître vite deux fractions égales."), 15, [
      ph("Jeu en groupes", "15 min", "Un memory où deux fractions égales font une paire — un demi et deux quarts —, les bandes pour vérifier.")]),
    UN_PROBLEME_ET_L_EVALUATION("« Léa a mangé la moitié de sa pizza, Tom quatre huitièmes de la sienne, de même taille. Lequel en a mangé le plus ? »",
      "Établir des égalités de fractions, et les justifier par des bandes."),
  ],
};

const COMPARER_CE2: Demarche = {
  id: "comparer-fractions-ce2",
  nom: "Comparer des fractions inférieures à 1 (CE2)",
  famille: "Mathématiques",
  source: ADAPTEE("CE2", "Mesurer des longueurs en utilisant les fractions", "Séquence 4 - Comparer des fractions de même numérateur, ou dont l'une des fractions a un dénominateur multiple du dénominateur de l'autre."),
  resume: "La séquence 4 que programme le livret CE2, après celle des longueurs : la règle graduée en fractions d'une unité sert à comparer — des fractions égales tombent sur la même graduation, on les range dans l'ordre —, puis on compare des fractions de même numérateur, ou dont l'un des dénominateurs est un multiple de l'autre.",
  seances: [
    seance("Sur la règle graduée", sauront("placer des fractions d'unité sur une règle graduée et les comparer."), 45, [
      ph(T1, "10 min", "La règle graduée en huitièmes d'unité, construite dans la séquence des longueurs."),
      ph(T2, "25 min", "Tracer, puis comparer des longueurs en quarts et en huitièmes d'unité : la plus longue est la plus grande fraction ; deux fractions égales tombent sur la même graduation."),
      ph(T3, "10 min", "Ce qu'on retient : sur la règle, les fractions sont rangées dans l'ordre."),
    ]),
    seance("Un dénominateur multiple de l'autre", sauront("comparer deux fractions dont un dénominateur est un multiple de l'autre, en les écrivant avec les mêmes parts."), 45, [
      ph(T1, "10 min", "Trois quarts ou cinq huitièmes ? On écrit trois quarts en huitièmes — six huitièmes —, et l'on compare."),
      ph(T2, "25 min", "Des paires de fractions à comparer, avec les bandes de même longueur."),
      ph(T3, "10 min", "Ce qu'on retient : on change les grandes parts en petites parts, puis on compte."),
    ]),
    seance("Même numérateur", sauront("comparer deux fractions de même numérateur."), 45, [
      ph(T2, "35 min", "Deux tiers ou deux cinquièmes ? Les parts sont plus petites en cinquièmes : deux tiers est plus grand ; on vérifie avec les bandes."),
      ph(T3, "10 min", "La trace écrite : même numérateur, plus de parts, plus petite fraction."),
    ]),
    seance("La bataille des fractions", sauront("comparer vite deux fractions."), 15, [
      ph("Jeu en groupes", "15 min", "La bataille des fractions, en quarts et en huitièmes ; les bandes pour vérifier.")]),
    UN_PROBLEME_ET_L_EVALUATION("« La bande rouge mesure trois quarts d'unité, la bleue cinq huitièmes. Laquelle est la plus longue ? »",
      "Comparer des fractions inférieures à un, et justifier."),
  ],
};

const AJOUTER_CE2: Demarche = {
  id: "additionner-fractions-ce2",
  nom: "Ajouter et retrancher des fractions (CE2)",
  famille: "Mathématiques",
  source: ADAPTEE("CE2", "Mesurer des longueurs en utilisant les fractions", "Séquence 5 - Additionner et soustraire des fractions."),
  resume: "La séquence 5 que programme le livret CE2 : ajouter et retrancher des fractions inférieures à un, de même dénominateur ou dont l'un des dénominateurs est un multiple de l'autre, en s'appuyant sur les fractions d'un tout et sur les fractions d'unité — des segments mis bout à bout.",
  seances: [
    seance("Des longueurs bout à bout", sauront("ajouter deux fractions d'unité de même dénominateur en mettant les segments bout à bout."), 45, [
      ph(T1, "10 min", "Un quart d'unité, puis deux quarts, bout à bout sur la règle : trois quarts. La course des nageurs ajoutait déjà des fractions."),
      ph(T2, "25 min", "Des sommes et des différences de même dénominateur, avec la règle graduée et les bandes."),
      ph(T3, "10 min", "Ce qu'on retient : on ajoute, ou on enlève, des parts de même taille."),
    ]),
    seance("Des dénominateurs différents", sauront("ajouter ou retrancher deux fractions dont un dénominateur est un multiple de l'autre."), 45, [
      ph(T1, "10 min", "Un demi et un quart : un demi, c'est deux quarts ; 2/4 + 1/4 = 3/4."),
      ph(T2, "25 min", "Des sommes et des différences, en écrivant d'abord les deux fractions avec les mêmes parts."),
      ph(T3, "10 min", "La trace écrite, avec un exemple."),
    ]),
    seance("S'entraîner", sauront("calculer ces sommes et ces différences de plus en plus sans support."), 15, [
      ph("À l'ardoise", "15 min", "Des sommes et des différences dites ou écrites ; on vérifie sur la règle.")]),
    seance("Des problèmes", sauront("résoudre un problème avec une somme ou une différence de fractions."), 30, [
      ph(T2, "25 min", "« La bande rouge mesure trois huitièmes d'unité, la bleue un quart. Quelle longueur mesurent-elles mises bout à bout ? »"),
      ph(T3, "5 min", "Une trace dans le cahier."),
    ]),
    seance("Évaluation", sauront("ajouter et retrancher seuls des fractions."), 20, [
      ph("Évaluation", "20 min", "Des sommes et des différences de fractions, et un problème.")]),
  ],
};

export const DEMARCHES_FRACTIONS_PROLONGEES: Demarche[] = [NON_UNITAIRES_CE1, COMPARER_CE1, AJOUTER_CE1, EGALITES_CE2, COMPARER_CE2, AJOUTER_CE2];

/** La séquence prolongée pour une compétence de fractions, à sa classe ; rien sinon. En minuscules sans accents. */
export function demarcheProlongeeDeFractions(classe: string, comp: string): string | null {
  if (classe === "ce1") {
    if (/fractions inferieures ou egales a 1|les mots .{0,3}denominateur/.test(comp)) return "fractions-non-unitaires-ce1";
    if (/comparer des fractions/.test(comp)) return "comparer-fractions-ce1";
    if (/additionner et soustraire des fractions/.test(comp)) return "additionner-fractions-ce1";
  }
  if (classe === "ce2") {
    if (/egalites de fractions/.test(comp)) return "egalites-fractions-ce2";
    if (/comparer des fractions/.test(comp)) return "comparer-fractions-ce2";
    if (/additionner et soustraire des fractions/.test(comp)) return "additionner-fractions-ce2";
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

function feuille(seance: number, titre: string, r: Partial<ReglagesFractions>): FeuilleAFabriquer {
  const reglages: ReglagesFractions = { ...REGLAGES_FRACTIONS, ...r };
  return {
    seance, atelier: "fractions", titre,
    fabriquer: (graine) => ({ html: htmlFractions(reglages, graine), style: STYLE_FEUILLE + STYLE_JEUX_MATHS, refaire: { fractions: reglages } }),
  };
}

const TOUTES = [2, 3, 4, 5, 6, 8, 10];

const FEUILLES: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "fractions-non-unitaires-ce1": {
    feuilles: [
      feuille(1, "Cartes des fractions — en lettres et en images", { materiel: ["cartes"], denominateurs: [2, 3, 4], representations: ["lettres", "disque", "bande"] }),
      feuille(3, "Cartes des fractions — en chiffres et en images", { materiel: ["cartes"], denominateurs: [3, 4, 8], representations: ["chiffres", "disque"] }),
      feuille(4, "Jeu de mémoire des fractions — en chiffres, en lettres", { materiel: ["cartes"], denominateurs: [2, 3, 4, 6], representations: ["chiffres", "lettres"] }),
    ],
    materiel: [
      "Des carrés, des rectangles, des disques découpés ; des cartes vierges ; de la colle", "Les jeux de memory fabriqués", "Des formes partagées, des crayons de couleur",
      "Les cartes de la séance 1", "Les jeux de memory", "Les énoncés ; l'évaluation",
    ],
  },
  "comparer-fractions-ce1": {
    feuilles: [
      feuille(0, "Comparer des fractions — même dénominateur", { materiel: ["comparer"], denominateurs: [3, 4, 5, 6, 8], cas: "denominateur" }),
      feuille(1, "Comparer des fractions — numérateur 1", { materiel: ["comparer"], denominateurs: TOUTES, cas: "unitaires" }),
      feuille(2, "Cartes de la bataille des fractions", { materiel: ["cartes"], denominateurs: TOUTES, representations: ["chiffres", "bande"], unitaires: true }),
      feuille(4, "Comparer des fractions — évaluation", { materiel: ["comparer"], denominateurs: [4, 5, 6, 8], cas: "denominateur" }),
    ],
    materiel: ["Des bandes de même longueur ; des crayons de couleur", "Les cartes du memory ; des bandes", "Les cartes, un jeu par groupe", "Des étiquettes de fractions à ranger", "Les énoncés ; l'évaluation"],
  },
  "additionner-fractions-ce1": {
    feuilles: [
      feuille(0, "Ajouter des fractions de même dénominateur", { materiel: ["operations"], denominateurs: [4, 5, 6, 8, 10], cas: "denominateur" }),
      feuille(1, "Ajouter et retrancher des fractions", { materiel: ["operations"], denominateurs: [3, 4, 6, 8], cas: "denominateur" }),
      feuille(4, "Ajouter et retrancher des fractions — évaluation", { materiel: ["operations"], denominateurs: [4, 5, 6, 8], cas: "denominateur" }),
    ],
    materiel: ["Des bandes partagées ; deux couleurs", "Des bandes partagées", "Les ardoises ; des bandes", "Les énoncés", "L'évaluation"],
  },
  "egalites-fractions-ce2": {
    feuilles: [
      feuille(0, "Bandes unités à plier", { materiel: ["bandes"] }),
      feuille(2, "Cartes des fractions — demis, quarts, huitièmes", { materiel: ["cartes"], denominateurs: [2, 4, 8], representations: ["chiffres", "bande"] }),
      feuille(3, "Jeu de mémoire des fractions égales", { materiel: ["cartes"], denominateurs: [2, 3, 4, 6], representations: ["chiffres", "bande"] }),
      feuille(4, "Comparer des fractions — égales ou non", { materiel: ["comparer"], cas: "multiple" }),
    ],
    materiel: ["Des bandes unités de même longueur à plier ; des crayons de couleur", "Des bandes partagées en trois, six, douze", "Des bandes partagées en 2 à 12 parts ; une affiche", "Les cartes, un jeu par groupe", "Les énoncés ; l'évaluation"],
  },
  "comparer-fractions-ce2": {
    feuilles: [
      feuille(0, "Règle graduée en huitièmes d'unité", { materiel: ["regle"], graduation: 8 }),
      feuille(1, "Comparer des fractions — un dénominateur multiple de l'autre", { materiel: ["comparer"], cas: "multiple" }),
      feuille(3, "Cartes de la bataille des fractions", { materiel: ["cartes"], denominateurs: [2, 4, 8], representations: ["chiffres", "bande"] }),
      feuille(4, "Comparer des fractions — évaluation", { materiel: ["comparer"], cas: "multiple" }),
    ],
    materiel: ["La règle graduée en huitièmes ; des segments à comparer", "Des bandes de même longueur", "Des bandes partagées en tiers et en cinquièmes", "Les cartes, un jeu par groupe", "Les énoncés ; l'évaluation"],
  },
  "additionner-fractions-ce2": {
    feuilles: [
      feuille(0, "Règle graduée en quarts d'unité", { materiel: ["regle"], graduation: 4 }),
      feuille(0, "La course des nageurs", { materiel: ["nageurs"], graduation: 4 }),
      feuille(1, "Ajouter et retrancher des fractions — dénominateurs multiples", { materiel: ["operations"], cas: "multiple" }),
      feuille(4, "Ajouter et retrancher des fractions — évaluation", { materiel: ["operations"], cas: "multiple" }),
    ],
    materiel: ["La règle graduée ; une feuille A3 par groupe de trois pour la course", "Des bandes de même longueur", "Les ardoises ; la règle", "Les énoncés", "L'évaluation"],
  },
};

export const estUneDemarcheDeFractionsProlongee = (id: string) => id in FEUILLES;

export function planDesFractionsProlongees(demarcheId: string): PlanDesFeuilles | null {
  const p = FEUILLES[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
