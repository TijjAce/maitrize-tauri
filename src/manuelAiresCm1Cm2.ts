// Les aires au CM1-CM2, de la surface à la formule : une séquence d'après le
// manuel de préparation au CRPE que l'enseignant a fourni dans « Adapter une
// fiche » (octobre 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de
// leçon, maths et français » (Nathan), sujet n° 10, « Grandeurs et mesures :
// les aires CM1-CM2 », p. 159-174.
//
// Le manuel se place dans un cours double CM1-CM2 de vingt élèves, en
// période 3 (p. 159). Sa séquence a six séances : découvrir la surface et
// l'aire ; comparer des aires sans les mesurer — la séance détaillée, en sept
// phases (p. 170-173) ; estimer par pavage ou avec une surface de référence ;
// mesurer avec une unité ; passer aux unités usuelles ; découvrir les
// formules. Des problèmes tout du long. Les phases des séances 1, 3, 4, 5 et 6
// sont de Maitrize, d'après les connaissances didactiques (p. 163-167), les
// prérequis (p. 169), la conclusion et les questions du jury (p. 173-174), et
// la source le dit. Le texte du manuel n'est pas repris : ses phases sont
// dites ici avec nos mots.
//
// La séance du manuel est faite pour la classe double : les CM1 cherchent
// seuls pendant que l'enseignant est avec les CM2, puis l'inverse. Les
// séances de Maitrize gardent cette alternance. La séance détaillée s'ouvre sur le calcul mental,
// rituel d'entrée commun aux deux niveaux avec des nombres différents : chaque
// séance s'y ouvre ici, avec une fiche pour les CM1 et une pour les CM2. La
// sienne dure cinq minutes, comme dans le manuel ; les autres, dix.
//
// Ses feuilles viennent des ateliers « Calcul mental » et « Cartes à tâches »
// — l'aire et le périmètre sur quadrillage —, à ses réglages : chacune se
// rouvre dans le sien. Aucun atelier ne fait les figures à découper du manuel
// (ses planches A et B), ni des figures à comparer sans mesurer, ni l'aire en
// centimètres carrés sur un quadrillage de 1 cm : elles se préparent à la main.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type ReglagesMartiniere } from "./martiniere";
import { STYLE_CARTES_A_TACHES, cartesDeLaSerie, htmlDeLaSerie, reglagesSurs, type ReglagesCartes } from "./cartesATaches";

export const ID_AIRES_CM1_CM2 = "aires-comparer-cm1-cm2";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

type Niveau = "CM1" | "CM2";

/** Le calcul mental de chaque séance : l'objectif de l'atelier « Calcul mental » des CM1, puis celui des CM2. */
const CALCUL_MENTAL: [string, string][] = [
  ["cm1-presque-ronds", "cm2-presque-ronds"],
  ["cm1-presque-ronds", "cm2-presque-ronds"],
  ["cm1-doubles-moities", "cm2-moities-impairs"],
  ["cm1-fractions", "cm2-ecritures-decimales"],
  ["cm1-fois-10-100-1000", "cm2-decimal-fois"],
  ["cm1-distributivite", "cm2-produits-ronds"],
];
const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const DEUX_NIVEAUX = "Un calcul pour les CM1, un pour les CM2, à tour de rôle : chacun ne répond qu'aux siens. En début de séance de mathématiques, chaque jour.";

export const DEMARCHE_AIRES_CM1_CM2: Demarche = {
  id: ID_AIRES_CM1_CM2,
  nom: "Les aires : comparer, estimer, mesurer, calculer (CM1-CM2)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 10, « Grandeurs et mesures : les aires CM1-CM2 », p. 159-174 : la séquence en six séances, `
    + "pour un cours double CM1-CM2 en période 3 (p. 159 et 169), la séance 2 détaillée (p. 170-173) — ses phases 5 et 6 réunies en une —, "
    + "avec les figures du document 3 (p. 161) et les exercices du document 4 (p. 162), tiré de « Tandem Maths CM1 et CM2 » (Nathan, 2021) ; "
    + "les phases des séances 1, 3, 4, 5 et 6 et le calcul mental en tête de ces séances ajoutés par Maitrize, d'après les connaissances "
    + "didactiques (p. 163-167), les prérequis (p. 169), la conclusion et les questions du jury (p. 173-174) ; programme de mathématiques "
    + "du cycle 3 (2025)",
  resume: "Au CM1-CM2, en période 3, dans une classe double. L'aire est une grandeur nouvelle : on la distingue du périmètre, puis on compare "
    + "des surfaces sans les mesurer — on les superpose, on les découpe et on recolle les morceaux : deux figures de formes différentes peuvent "
    + "avoir la même aire. Ensuite seulement, on mesure : une surface de référence qu'on reporte, le carreau d'un quadrillage, des demis d'unité ; "
    + "puis le centimètre carré et, au CM2, le décimètre carré, le mètre carré et les formules du rectangle et du carré. Les deux niveaux "
    + "travaillent la même notion : l'enseignant est avec un groupe pendant que l'autre cherche seul. Chaque séance s'ouvre sur le "
    + "calcul mental, avec des nombres propres à chaque niveau.",
  visee: { intitule: /comparer les aires de différentes figures planes/i, niveaux: ["CM1", "CM2"] },
  seances: [
    seance("Découvrir la surface et son aire",
      sauront("distinguer la surface d'une figure, son aire — la place qu'elle occupe — et son périmètre — la longueur de son contour —, et dire qu'une figure dont on déplace les morceaux garde la même aire."), 50, [
        ph(LM, "10 min", `Ajouter ou retirer un nombre presque rond : 8, 9, 18, 19… jusqu'à 39 au CM1 — « 64 + 29 », c'est 64 + 30 – 1 ; jusqu'à 99 au CM2 — « 245 + 58 ». ${ROUTINE}`,
          DEUX_NIVEAUX),
        ph(T1, "10 min", "Une carte postale et une feuille de cahier : laquelle prend le plus de place sur la table ? On pose l'une sur l'autre. Ce qu'on recouvre, c'est la surface ; la place qu'elle prend, c'est son aire — on dit aussi son étendue. Le tour de la feuille, c'est son contour ; sa longueur, c'est le périmètre. Chacun colorie la surface d'une figure et repasse son contour en rouge.",
          "Emploie d'abord des mots qui parlent : « prendre de la place », « l'étendue ». Les mots « surface », « aire » et « périmètre » viennent ensuite, et restent au tableau."),
        ph(T2, "20 min", "Les CM1, par deux, avec un tangram rangé en carré dans sa boîte : avec les sept mêmes pièces, faire une autre figure — un bateau, une maison —, d'après un modèle. Le carré et le bateau ne se superposent pas : ont-ils la même aire ? Oui : ce sont les mêmes pièces. Puis un rectangle de papier, coupé en deux morceaux qu'on recolle autrement : l'aire n'a pas changé ; on mesure le tour avec une ficelle : il a changé. Les CM2, par deux, sur papier quadrillé : tracer tous les rectangles de 24 carreaux, puis trouver le périmètre de chacun. Même aire, des périmètres différents.",
          "Va d'un groupe à l'autre ; les consignes de chacun sont écrites au tableau. Erreur attendue : croire que plus le contour est long, plus l'aire est grande. Aides : poser une figure sur l'autre ; compter les pièces du tangram ; colorier la surface avant de mesurer le tour."),
        ph(T3, "5 min", "Ce qu'on retient, écrit avec la classe : la surface, c'est l'intérieur de la figure ; son aire, c'est la place qu'elle occupe ; son périmètre, c'est la longueur de son contour. Deux figures de formes différentes peuvent avoir la même aire. Quand on déplace les morceaux d'une figure, son aire ne change pas ; son périmètre peut changer."),
        ph(T4, "5 min", "Les cartes « Le périmètre, sur quadrillage » : suivre le contour, côté de carreau après côté de carreau, sans compter les carreaux de l'intérieur.",
          "Repère qui compte les carreaux au lieu du contour : c'est la confusion entre l'aire et le périmètre."),
      ]),
    // La séance détaillée du manuel : ses phases, leur organisation et leur durée. Sa phase 1, le calcul mental, est la phase La Martinière,
    // de cinq minutes comme dans le manuel.
    seance("Comparer des aires sans les mesurer : superposer, découper, recoller",
      sauront("comparer les aires de deux surfaces sans les mesurer, en les superposant ou en les découpant et en recollant les morceaux, et dire que deux figures de formes différentes peuvent avoir la même aire."), 50, [
        ph(LM, "5 min", "En collectif, le rituel d'entrée, commun aux deux niveaux avec des nombres différents : une série d'additions en ligne, au tableau. 316 + 59 : on peut faire 316 + 50 + 9, ou 316 + 60 – 1, ou encore 300 + 10 + 50 + 9 + 6. Les CM1 ajoutent ou retirent 8, 9, 18, 19… jusqu'à 39 ; les CM2, jusqu'à 99. Chacun écrit le résultat sur son ardoise et la lève au signal ; puis on compare les façons de calculer.",
          "Annonce que la séance commence, comme chaque jour, par le calcul mental. Fait dire les procédures et en discute avec la classe : passer par la dizaine ronde, puis ajuster ; décomposer."),
        ph("Phase 2 – Individuel", "10 min", "L'enseignant annonce le travail : aujourd'hui, les surfaces, et comment les comparer. Les CM1, chacun seul, avec les six figures de la planche A découpées d'avance : laquelle a la plus grande aire ? Y en a-t-il qui ont la même aire ? Tous les instruments sont permis, les ciseaux aussi. Chacun manipule ses figures ; on peut en parler avec son voisin. En même temps, les CM2, par deux : de combien de façons peut-on couper une feuille A4 en quatre parts de même aire ? Ceux qui ont fini prennent les cartes « Des surfaces de référence, sur quadrillage — CM2 » : trouver l'aire de chaque figure, en carreaux, puis tracer sur papier quadrillé d'autres surfaces de même aire, autant qu'on en trouve.",
          "S'assure que chacun a compris la consigne ; regarde comment chacun s'y prend, aide quelques élèves, arrête un instant la classe pour relancer la recherche. Pour certains, change les mots : « la plus grande aire », c'est « celle qui prend le plus de place ». Permettre les ciseaux pousse à découper, mais libère ceux qui n'oseraient pas couper. Erreurs attendues : juger à l'œil seulement ; croire que la figure au plus long contour a la plus grande aire."),
        ph("Phase 3 – Collectif", "5 min", "La mise en commun des CM1 : chacun donne ses réponses et dit comment il a fait ; on compare. Quand une figure tient tout entière dans une autre, on les superpose ; sinon, on découpe ce qui dépasse et on le recolle ailleurs. L'enseignant dit ce qui est juste, nomme les procédures et écrit au tableau une première synthèse.",
          "Fait expliquer chaque procédure. Veille aux morceaux recollés qui se chevauchent : le découpage-recollement peut alors tromper. Les morceaux se posent bord à bord, sans trou ni chevauchement."),
        ph("Phase 4 – Individuel", "10 min", "Les CM1, seuls : la figure bleue de la planche B et trois figures orange, A, B et C. Avec ce qu'on vient d'apprendre, chercher celles qui ont la même aire que la figure bleue. Cette fois, la consigne ne parle pas de découper. Pendant ce temps, l'enseignant fait la mise en commun des CM2 : leurs partages de la feuille A4 — quatre bandes, quatre rectangles, quatre triangles par les diagonales… — et les surfaces de même aire qu'ils ont tracées sur le quadrillage.",
          "Alterne : les CM1 cherchent seuls pendant qu'il est avec les CM2. Leur consigne est écrite au tableau ; on peut s'aider entre voisins. Aides : une figure plus simple, ou un premier découpage montré. Pour qui finit tôt, d'autres figures à comparer."),
        // Les phases 5 et 6 du manuel — une nouvelle mise en commun, puis l'institutionnalisation, cinq minutes chacune, en collectif — n'en
        // font qu'une : l'éditeur ne prend pas plus de six phases par séance.
        ph("Phases 5 et 6 – Collectif", "10 min", "Une nouvelle mise en commun : des volontaires montrent ce qu'ils ont trouvé, et comment ; la classe commente et discute. Puis l'institutionnalisation : sur la planche B agrandie, l'enseignant découpe au moins une figure pour vérifier si elle a, ou non, la même aire que la figure bleue. Ensuite, l'affiche de référence, avec des dessins : pour comparer deux surfaces, on peut les poser l'une sur l'autre, ou découper l'une et recoller ses morceaux sur l'autre ; deux figures de formes différentes peuvent avoir la même aire.",
          "Mène le débat. Prépare la planche agrandie et l'affiche avant la séance ; commente l'affiche, qui reste au mur pour les séances suivantes."),
        ph("Phase 7 – Individuel", "10 min", "L'évaluation des CM1 : des figures à comparer sans les mesurer — trouver la plus grande, dire à l'œil celles qui ont la même surface, ranger de la plus étendue à la moins étendue —, puis vérifier en découpant ou avec du papier calque. Les CM2 finissent leurs cartes et leurs tracés.",
          "Observe qui réinvestit la superposition ou le découpage-recollement. Pour ceux qui ont eu du mal, des figures plus simples, avec une aide."),
      ]),
    seance("Estimer des aires : paver avec une surface de référence",
      sauront("estimer combien de fois une surface de référence tient dans une surface, vérifier en la reportant — en pavant —, et comparer deux surfaces qu'on ne peut pas superposer en les pavant avec la même surface de référence."), 50, [
        ph(LM, "10 min", `Doubles et moitiés : le double de 35, la moitié de 70 au CM1 ; au CM2, la moitié d'un nombre impair — la moitié de 13, c'est 6,5. Deux demi-carreaux font un carreau : on s'en servira. ${ROUTINE}`,
          DEUX_NIVEAUX),
        ph(T1, "10 min", "Deux rectangles tracés au sol, loin l'un de l'autre : lequel couvre le plus de sol ? On ne peut ni les déplacer ni les découper. Chacun estime à l'œil. Puis une feuille de journal, toujours la même, devient la surface de référence : combien de fois couvre-t-elle chaque rectangle ? On estime, puis on la reporte : 3 fois pour l'un, 4 fois pour l'autre. Le second couvre le plus de sol.",
          "Fait toujours estimer avant de reporter, et écrire l'estimation."),
        ph(T2, "20 min", "Les CM1, par deux, avec des surfaces de référence en carton — un petit carré, un triangle moitié du carré, un rectangle de deux carrés — et des figures découpées : pour chaque figure, estimer combien de fois une surface de référence y tient, écrire l'estimation, puis paver — reporter la surface en traçant son contour — et compter. Ranger ensuite les figures. Les CM2, sur papier quadrillé, avec le contour d'une main ou d'une feuille d'arbre : estimer son aire en carreaux, puis l'encadrer — les carreaux entiers qui sont dedans, puis tous ceux qu'il faut pour la recouvrir.",
          "Erreurs attendues : des reports qui se chevauchent ou laissent des trous ; un carreau à moitié couvert compté pour un entier. Aides : marquer chaque report d'un trait ; colorier ce qui est compté."),
        ph(T3, "5 min", "Ce qu'on retient : pour comparer deux surfaces qu'on ne peut pas superposer, on les pave avec la même surface de référence ; celle qui en contient le plus a la plus grande aire. On estime d'abord, on vérifie ensuite. Quand on ne peut pas compter juste, on encadre."),
        ph(T4, "5 min", "Seul : ranger à l'œil trois figures tracées au tableau, de la plus petite à la plus grande aire, puis vérifier en reportant le carré de référence."),
      ]),
    seance("Mesurer une aire : l'unité",
      sauront("mesurer l'aire d'une surface avec une unité d'aire — combien de fois elle la contient, en unités et en demis d'unité —, écrire la mesure avec son unité, et dire qu'avec une autre unité, on trouve un autre nombre."), 50, [
        ph(LM, "10 min", `Les fractions usuelles : « un demi plus un quart », « un demi, c'est combien de quarts ? » au CM1 ; leur écriture décimale au CM2 — un demi, c'est 0,5 ; un quart, 0,25. Une aire peut valoir 7 unités et demie : 7,5 u. ${ROUTINE}`,
          DEUX_NIVEAUX),
        ph(T1, "10 min", "Une figure tracée sur une affiche quadrillée, au tableau : combien de carreaux ? Le carreau devient l'unité : la figure mesure 14 unités, on écrit 14 u. Puis on prend pour unité un rectangle de deux carreaux : combien d'unités, maintenant ? 7. La même aire, deux nombres : on dit toujours l'unité."),
        ph(T2, "15 min", "Par deux, des figures tracées sur papier quadrillé, avec des demi-carreaux, et trois unités découpées dans du carton à la taille du quadrillage — un carreau, un demi-carreau, un rectangle de deux carreaux : mesurer chaque figure avec chacune. On pose l'unité, on la reporte, puis on compte sur le quadrillage. Deux demi-carreaux font un carreau. Les CM2 tracent ensuite sur le quadrillage une figure de 6 u, une de 6,5 u, puis une figure d'aire double de celle d'une figure donnée.",
          "Erreurs attendues : oublier l'unité dans la réponse ; compter un demi-carreau pour un carreau ; perdre le compte. Aides : colorier ce qui est compté ; regrouper les demi-carreaux deux par deux."),
        ph(T3, "5 min", "Ce qu'on retient : mesurer une aire, c'est chercher combien de fois elle contient une unité d'aire. Le nombre dépend de l'unité : on l'écrit toujours avec elle. Une unité se partage : un demi, un quart d'unité."),
        ph(T4, "10 min", "Les cartes « L'aire en unités, sur quadrillage » : l'aire de chaque figure, un carreau valant une unité u.",
          "Sur les cartes, les carreaux ne se voient qu'autour de la figure : on prolonge les lignes du quadrillage, ou l'on compte une rangée, puis les rangées. Erreurs attendues : le périmètre pris pour l'aire, un carreau de trop."),
      ]),
    seance("Les unités usuelles : le cm², puis le dm² et le m²",
      sauront("exprimer une aire en centimètres carrés — 1 cm², c'est l'aire d'un carré de 1 cm de côté — et, au CM2, en décimètres carrés et en mètres carrés : 1 dm² = 100 cm² ; 1 m² = 100 dm²."), 50, [
        ph(LM, "10 min", `Multiplier par 10, 100 ou 1 000 : un entier au CM1 — « 37 × 100 » ; un décimal au CM2 — « 3,7 × 100 », ce que demandera 3,7 dm² en cm². ${ROUTINE}`,
          DEUX_NIVEAUX),
        ph(T1, "10 min", "La même figure, tracée sur deux quadrillages aux carreaux de tailles différentes : 6 carreaux sur l'un, 24 sur l'autre. Qui a raison ? Pour se comprendre, il faut la même unité pour tous : le carré de 1 cm de côté. Son aire, c'est un centimètre carré, 1 cm². Chacun en découpe un dans du carton."),
        ph(T2, "20 min", "Les CM1, sur papier quadrillé en centimètres : trouver l'aire de figures en cm², puis tracer des figures de 6 cm², de 10 cm² et de 4 cm² et demi. Les CM2 : un carré de 1 dm de côté, quadrillé en centimètres — combien de cm² ? 100 : 1 dm² = 100 cm². Au sol, un carré de 1 m de côté tracé au ruban adhésif : combien de carrés de 1 dm de côté y tiennent ? 1 m² = 100 dm². Puis les cartes « L'aire en mètres carrés — CM2 » : sur ces plans, chaque carreau vaut 1 m².",
          "Les CM1 tracent seuls pendant qu'il est avec les CM2, puis l'inverse. Erreur attendue : croire qu'une surface de 1 cm² est forcément un carré. Aide : couper le carré de 1 cm de côté en deux triangles et les recoller autrement : c'est toujours 1 cm²."),
        ph(T3, "5 min", "Ce qu'on retient : 1 cm² est l'aire d'un carré de 1 cm de côté ; une surface d'une autre forme peut aussi mesurer 1 cm². Au CM2 : 1 dm² = 100 cm² et 1 m² = 100 dm² ; d'une unité d'aire à la suivante, cent fois plus."),
        ph(T4, "5 min", "Choisir l'unité : l'aire d'un timbre-poste, d'une page du cahier, du sol de la classe — en cm², en dm² ou en m² ?",
          "S'appuie sur des aires de référence, qu'on garde affichées : un timbre-poste, la page du cahier, le sol de la classe."),
      ]),
    seance("L'aire du rectangle : du pavage à la formule",
      sauront("trouver l'aire d'un rectangle pavé de carrés en comptant les rangées — 4 rangées de 6 carrés, 6 × 4 —, et, au CM2, calculer l'aire d'un rectangle et d'un carré par la formule : longueur × largeur, côté × côté."), 50, [
        ph(LM, "10 min", `Multiplier : au CM1, en décomposant — « 8 × 15 », c'est 8 × 10 plus 8 × 5 ; au CM2, des dizaines et des centaines — « 30 × 40 ». ${ROUTINE}`,
          DEUX_NIVEAUX),
        ph(T1, "10 min", "Un problème : pour carreler le sol d'une salle rectangulaire, on pose 15 carreaux le long du grand mur et 8 le long du petit. Combien faut-il de carreaux en tout ? Chacun cherche : dessiner, compter, calculer. On compare : compter un à un est long ; 8 rangées de 15 carreaux, c'est 15 × 8 = 120.",
          "Accepte toutes les procédures, puis fait voir que la multiplication va plus vite."),
        ph(T2, "15 min", "Par deux, des rectangles de papier et des carrés de 1 cm de côté : paver un rectangle de 6 cm sur 4 cm, compter les carrés par rangées ; recommencer avec d'autres rectangles et remplir un tableau — la longueur, la largeur, le nombre de carrés. Les CM1 trouvent le nombre de carrés par une multiplication ; les CM2 cherchent la règle et l'écrivent.",
          "Erreurs attendues : ajouter la longueur et la largeur ; calculer le périmètre au lieu de l'aire. Aide : revenir au pavage, compter une rangée, puis les rangées."),
        ph(T3, "5 min", "Ce qu'on retient : l'aire d'un rectangle, c'est le nombre de rangées fois le nombre de carrés par rangée. Au CM2, la formule : aire du rectangle = longueur × largeur ; aire du carré = côté × côté, les deux longueurs dans la même unité. L'affiche des formules reste au mur."),
        ph(T4, "10 min", "Les cartes « L'aire des rectangles, sur quadrillage » : les carreaux d'une rangée et le nombre de rangées se lisent sur le bord ; on multiplie. Puis un problème : une salle rectangulaire mesure 6 m sur 4 m ; quelle est l'aire de son sol ? La réponse se dit en m².",
          "Ensuite, en sixième, le triangle, le disque et des figures plus complexes."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière, pour un niveau : la fiche du maître et les ardoises. */
const martiniere = (seance: number, niveau: Niveau, objectif: string): FeuilleAFabriquer => {
  // La séance du manuel n'a que cinq minutes de calcul mental : une série au lieu de deux.
  const r: ReglagesMartiniere = {
    ...REGLAGES_MARTINIERE, niveau, objectifs: [objectif], revision: false, forme: "oral", ardoises: true, ...(seance === 1 ? { series: 1 } : {}),
  };
  return {
    seance, atelier: "martiniere", titre: `Calcul mental ${niveau} — ${objectifParId(objectif)?.libelle ?? objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

/**
 * Des cartes de l'atelier « Cartes à tâches » — l'aire ou le périmètre d'une figure sur quadrillage —, à écrire, six par page, avec la
 * fiche réponse et le corrigé : l'atelier les refait, avec les mêmes réglages et le même tirage.
 */
const cartes = (
  seance: number, titre: string, classe: Niveau, type: "aire" | "perimetre", options: { formes: "toutes" | "rectangles"; unite: "u" | "m" }, combien: number,
): FeuilleAFabriquer => {
  const r: ReglagesCartes = reglagesSurs({ classe, type, format: "tache", combien, parPage: 6, marque: "", fiche: true, options: { [type]: options } });
  return {
    seance, atelier: "taches", titre,
    fabriquer: (g) => ({ html: htmlDeLaSerie(cartesDeLaSerie(r, g), r, g), style: STYLE_FEUILLE + STYLE_CARTES_A_TACHES, refaire: { cartesATaches: r } }),
  };
};

/** Les feuilles, à la classe de la séquence : son calcul mental d'abord, puis celui de l'autre niveau. */
function feuillesDeLaClasse(classe: Niveau): FeuilleAFabriquer[] {
  const autre: Niveau = classe === "CM1" ? "CM2" : "CM1";
  const calcul = CALCUL_MENTAL.flatMap(([cm1, cm2], s) => [classe, autre].map((n) => martiniere(s, n, n === "CM1" ? cm1 : cm2)));
  return [
    ...calcul,
    cartes(0, "Le périmètre, sur quadrillage", classe, "perimetre", { formes: "toutes", unite: "u" }, 4),
    // La séance du manuel : les fiches des CM2, des surfaces de référence sur un réseau quadrillé.
    cartes(1, "Des surfaces de référence, sur quadrillage — CM2", "CM2", "aire", { formes: "toutes", unite: "u" }, 6),
    cartes(3, "L'aire en unités, sur quadrillage", classe, "aire", { formes: "toutes", unite: "u" }, 6),
    cartes(4, "L'aire en mètres carrés — CM2", "CM2", "aire", { formes: "toutes", unite: "m" }, 6),
    cartes(5, "L'aire des rectangles, sur quadrillage", classe, "aire", { formes: "rectangles", unite: "u" }, 6),
  ];
}

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf les fiches du calcul mental. */
const MATERIEL = [
  "Les ardoises ; une carte postale et une feuille de cahier ; un tangram par binôme de CM1, et des modèles de figures à reproduire ; des "
    + "rectangles de papier, des ciseaux, du ruban adhésif, une ficelle ; du papier quadrillé ; des crayons de couleur",
  "Les ardoises ; le tableau interactif ; les six figures de la planche A et les quatre de la planche B (document 3 du manuel, p. 161), découpées "
    + "d'avance dans du papier épais, un jeu par CM1 ; des ciseaux, du papier calque ; des feuilles A4 et du papier quadrillé pour les CM2 ; la "
    + "planche B agrandie ; l'affiche de référence, avec ses dessins, préparée ; les figures de l'évaluation des CM1, à préparer — la plus "
    + "grande, celles qui ont la même surface, ranger de la plus étendue à la moins étendue",
  "Les ardoises ; de la craie ou du ruban adhésif, pour tracer deux rectangles au sol ; une feuille de journal ; par binôme de CM1, des surfaces de "
    + "référence en carton — un petit carré, un triangle moitié du carré, un rectangle de deux carrés — et des figures découpées ; pour les "
    + "CM2, du papier quadrillé ; un carré de carton pour le tableau",
  "Les ardoises ; une figure sur une affiche quadrillée ; des figures tracées sur papier quadrillé, avec des demi-carreaux ; par binôme, un "
    + "carreau, un demi-carreau et un rectangle de deux carreaux découpés dans du carton à la taille du quadrillage",
  "Les ardoises ; une même figure tracée sur deux quadrillages aux carreaux de tailles différentes ; du carton, des ciseaux ; du papier "
    + "quadrillé en centimètres, et des figures déjà tracées sur ce papier ; une règle ; pour les CM2, un carré de 1 dm de côté quadrillé en "
    + "centimètres, des carrés de 1 dm de côté, du ruban adhésif pour tracer 1 m² au sol",
  "Les ardoises ; des rectangles de papier et des carrés de 1 cm de côté ; du papier quadrillé en centimètres ; une règle ; l'affiche des "
    + "formules, à écrire avec les CM2",
];

/** Les feuilles et le matériel de la séquence, à sa classe : le CM1, ou le CM2. */
export function planAiresCm1Cm2(ctx: ContexteFeuilles): PlanDesFeuilles {
  const feuilles = feuillesDeLaClasse(ctx.classe === "CM2" ? "CM2" : "CM1").sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
