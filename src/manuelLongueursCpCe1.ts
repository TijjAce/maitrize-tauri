// Comparer et mesurer des longueurs au CP-CE1, jusqu'à la règle graduée : une
// séquence d'après le manuel de préparation au CRPE que l'enseignant a fourni
// dans « Adapter une fiche » (octobre 2026) — « Réussir mon CRPE, oral
// 2025-2026, épreuve de leçon, maths et français » (Nathan), sujet n° 9,
// « Longueurs CP-CE1 », p. 147-158.
//
// Le manuel bâtit la séquence en quatre séances, une par document de son
// corpus (p. 147-150), tirés d'un fichier de CP : comparer des segments qu'on
// ne peut pas déplacer ; établir ce qu'il faut pour bien mesurer — la séance
// détaillée, en huit phases (p. 156-158) ; mesurer avec une unité U pour
// comparer et ranger ; fabriquer une règle graduée en U et s'en servir. Il ne
// lui donne ni période ni évaluation. Les phases des séances 1, 3 et 4 sont de
// Maitrize, d'après son analyse des documents (p. 155), les prérequis, les
// connaissances didactiques (p. 150-154) et les questions du jury (p. 158), et
// la source le dit. Le texte du manuel n'est pas repris : ses phases sont
// dites ici avec nos mots, et ses exemples n'ont pas de prénom.
//
// Le choix du manuel : on ne montre pas la règle graduée, elle naît de ce
// qu'il faut pour bien mesurer — une même unité, partir de l'origine, des
// unités alignées bout à bout —, avec une unité choisie par la classe. Le
// centimètre vient après. La séquence sert « Savoir mesurer la longueur d'un
// segment en utilisant une règle graduée », au CP comme au CE1.
//
// Ses feuilles viennent des ateliers « Mesures » (comparer des segments, le
// plus long crayon) et « La demi-droite graduée » (compter les unités depuis
// 0), à la classe de la séquence : chacune se rouvre dans le sien. Aucun
// atelier ne mesure avec une unité choisie : le dessin des quatre bureaux de
// la séance 2 et les segments à mesurer en U se préparent à la main.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { REGLAGES_MESURES, STYLE_MESURES, htmlMesures, type ReglagesMesures } from "./mesures";
import { STYLE_REPERAGE, htmlReperage, reglagesReperageSurs, titreReperage } from "./reperageNombres";

export const ID_LONGUEURS_CP_CE1 = "longueurs-mesurage-cp-ce1";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

export const DEMARCHE_LONGUEURS_CP_CE1: Demarche = {
  id: ID_LONGUEURS_CP_CE1,
  nom: "Comparer, mesurer des longueurs : de l'unité à la règle graduée (CP-CE1)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 9, « Longueurs CP-CE1 », p. 147-158 : la séquence en quatre séances, une par document du corpus `
    + "— tirés de « Pour comprendre les mathématiques — CP » (Hachette Éducation, 1999) — (p. 147-150 et 155), la séance 2 détaillée (p. 156-158) ; "
    + "les phases des séances 1, 3 et 4 ajoutées par Maitrize, d'après l'analyse des documents, les prérequis, les connaissances didactiques "
    + "et les questions du jury (p. 150-158) ; programme de mathématiques du cycle 2 (2024)",
  resume: "Au CP-CE1, on ne montre pas la règle graduée : elle naît de ce qu'il faut pour bien mesurer. On compare d'abord des longueurs qu'on "
    + "ne peut pas rapprocher, avec une bande de papier. Puis des mesures en pas qui ne s'accordent pas font trouver trois règles : une même "
    + "unité pour tous, partir de l'origine, des unités alignées bout à bout, sans trou. On mesure et on range des segments avec une unité U "
    + "en carton ; enfin, chacun gradue sa propre règle depuis un 0 et s'en sert : on ne compte plus les unités, on lit un nombre. Le centimètre "
    + "vient ensuite, quand la classe a compris pourquoi il faut une unité commune.",
  visee: { intitule: /mesurer la longueur d.un segment en utilisant une règle graduée/i, niveaux: ["CP", "CE1"] },
  seances: [
    seance("Comparer des longueurs qu'on ne peut pas rapprocher",
      sauront("comparer deux longueurs qu'on ne peut pas mettre côte à côte en reportant l'une sur une bande de papier, ranger des segments du plus court au plus long, et tracer un segment plus long ou plus court qu'un segment donné."), 45, [
        ph(T1, "10 min", "Deux crayons, puis deux rubans : lequel est le plus long ? On les pose côte à côte, un bout contre l'autre, comme en grande section. Puis deux tables aux deux bouts de la classe, la porte et le tableau : on ne peut pas les rapprocher. Chacun dit d'abord ce qu'il pense, à l'œil.",
          "Rappelle le prérequis : on fait partir les deux objets du même point. Fait anticiper avant de vérifier."),
        ph(T2, "20 min", "Par groupes, une bande de papier, une ficelle ou un bâton : on y reporte une longueur, on la porte jusqu'à l'autre. Le bâton dépasse la première table, pas la seconde : la première est la plus courte. Puis des segments tracés au tableau, dans tous les sens : on marque sur la bande les deux bouts de l'un, en partant du bout de la bande, et l'on pose la bande sur l'autre. La feuille « Comparer des segments » : ranger les segments du plus court au plus long.",
          "Erreurs attendues : la bande qui ne part pas d'une extrémité, ou posée de travers ; un segment penché jugé à l'œil. Aide : marquer au crayon, sur la bande, les deux bouts du segment."),
        ph(T3, "10 min", "Ce qu'on retient : pour comparer deux longueurs qu'on ne peut pas rapprocher, on reporte l'une sur une bande, depuis son bout, puis on pose la bande sur l'autre. La bande transporte la longueur. Ce qui compte, c'est la longueur : ni la place du segment, ni sa direction."),
        ph(T4, "5 min", "Dans le cahier, un segment tracé d'avance : chacun trace un segment plus long, puis un plus court, et vérifie avec sa bande.",
          "Le tracé à la règle se travaille aussi en géométrie : l'alignement, la ligne droite."),
      ]),
    // La séance détaillée du manuel : ses huit phases, leur organisation et leur durée.
    seance("Bien mesurer : une même unité, l'origine, des unités bout à bout",
      sauront("dire et appliquer ce qu'il faut pour bien mesurer une longueur et la comparer à une autre : une même unité pour tous, partir de l'origine, aligner les unités bout à bout, sans trou ni chevauchement."), 55, [
        // Les phases 1 et 2, puis 3 et 4, de cinq minutes chacune, vont deux par deux : l'éditeur tient six phases.
        ph("Phases 1 et 2 – Individuel, puis collectif", "10 min", "En sortant en récréation, chacun a reçu une question : « En combien de pas traverse-t-on le préau, dans sa largeur ? » — on a montré ce qu'est un pas. De retour en classe, chacun écrit son nombre de pas sur l'ardoise et la lève. Quelques élèves disent comment ils ont compté. Puis les résultats vont au tableau : ils ne sont pas les mêmes. Qui a raison ? Pourquoi ? On en débat.",
          "Lit quelques résultats à voix haute et s'étonne qu'ils soient si différents ; demande comment chacun a fait. On entend : à petits pas, à grands pas. Mène le débat sans trancher : la classe commence à voir que, pour bien mesurer, il faut bien s'y prendre."),
        ph("Phases 3 et 4 – Collectif", "10 min", "Deux élèves mesurent la longueur de la classe — ou une ligne tracée au sol — en pas ou en longueurs de pied. L'un trouve par exemple 20, l'autre 25 : la même longueur, deux nombres. Premier constat : quand on compte pour comparer des longueurs, on mesure ; il faut alors la même longueur de référence. Puis deux bandes presque de la même longueur, tracées ou collées par l'enseignant pendant la récréation, loin l'une de l'autre : aux deux bouts de la classe, ou dans la cour, sous le préau. « De ces deux bandes, laquelle est la plus longue ? Et sans aucun instrument, comment en être sûr ? » Les élèves proposent ; un ou deux font ce qui est proposé, et l'on conclut sur la façon de comparer des longueurs en les mesurant. Au TBI, trois étiquettes illustrées apparaissent une à une : une même longueur de référence, l'unité ; partir du début, l'origine ; des unités bien alignées, mises bout à bout.",
          "Choisit pour mesurer deux élèves aux pieds nettement différents, pour un écart bien visible. Recueille les propositions, fait agir un ou deux élèves, affiche chaque étiquette quand la classe la trouve. On propose souvent les pieds : rappelle les deux résultats qu'on vient de trouver."),
        ph("Phase 5 – Binômes (CP/CE1)", "5 min", "Par deux, un CP avec un CE1 : le dessin de quatre bureaux pareils, mesurés par quatre enfants, deux avec des crayons, deux avec des gommes. Quelle mesure chacun a-t-il trouvée ? On compte : 7 et 8 crayons pour les deux premiers, 14 et 9 gommes pour les deux autres. Pourquoi ne trouvent-ils pas pareil ?",
          "Fait expliquer avec le dessin : l'un ne part pas du bord du bureau et le dépasse ; l'autre laisse des trous entre ses gommes. Aide : refaire la mesure avec de vrais crayons et de vraies gommes, sur un bureau."),
        ph("Phase 6 – Collectif", "10 min", "La synthèse, avec les dessins des bureaux : pour bien mesurer des longueurs et pouvoir les comparer, on prend la même longueur de référence, l'unité ; on part bien du début, l'origine ; on aligne les unités, collées l'une à l'autre. Les trois étiquettes et les dessins font la trace écrite du cahier du jour.",
          "Fait formuler par les élèves, écrit avec eux ; l'affiche reste en vue pour les séances suivantes. Fait dire aussi : le même bureau mesure 7 crayons ou 14 gommes — une autre unité donne un autre nombre."),
        ph("Phase 7 – Binômes", "10 min", "Par deux, avec des pailles en papier toutes pareilles : mesurer la hauteur de quatre objets de la classe qu'on ne peut pas déplacer — l'armoire, le bureau de l'enseignant, le radiateur, le rebord de la fenêtre —, puis les ranger du moins haut au plus haut.",
          "Vérifie les trois règles : partir du sol, des pailles bien droites, bout à bout. Erreurs attendues : un trou ou un chevauchement entre deux pailles, la première qui ne touche pas le sol. Aide : l'un tient la paille, l'autre marque son bout d'un doigt."),
        ph("Phase 8 – Individuel", "10 min", "Seul, la feuille « Ranger trois segments » : mesurer chaque segment avec l'unité U, en la reportant bout à bout depuis une extrémité, puis ranger les trois segments du plus court au plus long. La consigne de la feuille propose aussi la bande de papier : elle départage deux segments presque égaux.",
          "Observe qui applique les trois règles : c'est le bilan de la séance. Aide : marquer chaque report d'un petit trait ; pour deux segments de mesures voisines, la bande de papier tranche."),
      ]),
    seance("Mesurer avec une unité pour comparer et ranger",
      sauront("mesurer une longueur en reportant une unité U et en comptant les reports, écrire sa mesure — 5 U —, et comparer ou ranger des longueurs d'après leurs mesures, prises avec la même unité."), 45, [
        ph(T1, "10 min", "On relit l'affiche des trois règles. Au tableau, une affiche : quatre segments dans tous les sens, loin les uns des autres. « Comment les ranger, sans les comparer deux à deux avec une bande ? » L'idée vient : les mesurer tous avec la même unité, puis comparer les nombres. Avant de mesurer, chacun estime : combien de fois l'unité, à ton avis ?",
          "Fait anticiper : un résultat estimé, puis vérifié."),
        ph(T2, "20 min", "Chacun reprend son unité U, le petit rectangle de carton de la séance 2. Ensemble, on mesure les segments de l'affiche : un élève reporte U, la classe compte. Puis, par deux, ceux du cahier : on reporte U depuis une extrémité, on marque chaque report d'un trait, on compte, on écrit « a mesure 5 U ». Enfin la feuille « Le plus long crayon » : les crayons ne commencent pas tous au même endroit ; on mesure chacun en U, de son bout à sa pointe, et on les range du plus court au plus long.",
          "Erreurs attendues : partir à côté de l'extrémité, laisser un trou ou faire chevaucher deux reports, perdre le compte. Aide : marquer chaque report d'un trait au crayon, puis compter les traits."),
        ph(T3, "10 min", "Ce qu'on retient : mesurer une longueur, c'est compter combien de fois l'unité y tient, bout à bout, depuis une extrémité. Avec la même unité, la plus grande mesure va avec le plus long segment : on range les longueurs en rangeant les nombres. On écrit la mesure avec son unité : 5 U."),
        ph(T4, "5 min", "Un bureau mesure 7 crayons ; un autre enfant le mesure avec son propre crayon et trouve 10. Son crayon est-il plus court ? Plus l'unité est petite, plus on en compte. Et un segment de 2 U, un autre de 4 U : l'un est deux fois plus long que l'autre.",
          "Fait vérifier avec les crayons de la classe, posés bout à bout."),
      ]),
    seance("Fabriquer sa règle graduée et s'en servir",
      sauront("fabriquer une règle graduée en reportant l'unité U depuis un trait marqué 0, mesurer un segment en posant le 0 sur une extrémité et en lisant le nombre à l'autre, et tracer un segment de longueur donnée en U."), 50, [
        ph(T1, "5 min", "« Reporter l'unité à chaque fois, c'est long, et l'on se trompe : comment faire ? » L'idée vient de reporter l'unité une fois pour toutes sur une bande, et d'y écrire les nombres : on va fabriquer sa règle.",
          "Laisse venir l'idée ; la règle de la classe n'est montrée qu'à la fin."),
        ph(T2, "25 min", "Chacun plie une feuille pour avoir un bord bien droit — ou prend une bande de papier. Un trait près du bout : c'est le 0, l'origine. On reporte U depuis ce trait, on marque chaque report d'un trait et l'on écrit sous chaque trait le nombre d'unités depuis le 0 : 1, 2, 3… La règle est faite. On s'en sert : mesurer les segments tracés dans le cahier, le 0 posé sur une extrémité, puis écrire leurs noms du plus court au plus long ; tracer un segment de 4 U ; sur le quadrillage, tracer un segment de 15 carreaux et le mesurer.",
          "Vérifie l'origine et les reports : bout à bout, alignés, tous de la même longueur. Erreur attendue : poser le bord de la règle, et non le 0, sur l'extrémité du segment. Aide : colorier le trait du 0."),
        ph(T3, "10 min", "Ce qu'on retient : la règle fait tout ce qu'on a appris. L'origine, c'est le 0 ; l'unité y est reportée bout à bout, bien alignée ; sous chaque trait, le nombre d'unités depuis le 0. On ne compte plus les unités : on lit le nombre. Sur la règle de la classe aussi, il y a un 0, et il n'est pas au bord."),
        ph(T4, "10 min", "La feuille « Compter les unités depuis 0 » : sur la demi-droite graduée, compter les unités du 0 jusqu'à chaque point, puis écrire son nombre.",
          "Ensuite viennent une unité commune à tous, le centimètre, puis le mètre : la règle de la classe se lit comme celle qu'on a fabriquée."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** La classe de la séquence pour ses ateliers : le CP, ou le CE1. */
type ClasseDeLaSequence = "CP" | "CE1";

/** Une feuille de l'atelier « Mesures », à ses réglages : il la refait avec les mêmes et le même tirage. */
const mesures = (seance: number, titre: string, r: Partial<ReglagesMesures>): FeuilleAFabriquer => {
  const reglages: ReglagesMesures = { ...REGLAGES_MESURES, grandeur: "longueur", ...r };
  return {
    seance, atelier: "mesures", titre,
    fabriquer: (g) => ({ html: htmlMesures(reglages, g), style: STYLE_FEUILLE + STYLE_MESURES, refaire: { mesures: reglages } }),
  };
};

/** La feuille de l'atelier « La demi-droite graduée » qui compte les unités depuis 0, à la classe de la séquence. */
const unitesDepuisZero = (seance: number, classe: ClasseDeLaSequence): FeuilleAFabriquer => {
  const r = reglagesReperageSurs("demiDroite", { exercice: "dd-unites", classe });
  return {
    seance, atelier: "demiDroite", titre: titreReperage(r),
    fabriquer: (g) => ({ html: htmlReperage(r, g), style: STYLE_FEUILLE + STYLE_REPERAGE, refaire: { demiDroite: r } }),
  };
};

/** Les feuilles, à la classe : au CE1, un segment ou un crayon de plus à ranger. */
const feuillesDeLaClasse = (classe: ClasseDeLaSequence): FeuilleAFabriquer[] => {
  const combien = classe === "CP" ? 4 : 5;
  return [
    mesures(0, "Comparer des segments", { exercice: "comparerSegments", classe, combien }),
    // La séance du manuel : trois segments à mesurer avec l'unité U, puis à ranger.
    mesures(1, "Ranger trois segments", { exercice: "comparerSegments", classe, combien: 3 }),
    mesures(2, "Le plus long crayon", { exercice: "comparerObjets", classe, combien }),
    unitesDepuisZero(3, classe),
  ];
};

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après. */
const MATERIEL = [
  "Deux crayons, deux rubans ; par groupe, une bande de papier, une ficelle et un bâton ; deux tables éloignées, la porte et le tableau à comparer ; "
    + "dans chaque cahier, un segment tracé d'avance",
  "Les ardoises ; pendant la récréation, deux bandes presque de la même longueur, tracées ou collées loin l'une de l'autre ; les trois étiquettes "
    + "illustrées, prêtes au TBI ; par binôme, le dessin des quatre bureaux mesurés aux crayons et aux gommes, à préparer ; des pailles en papier "
    + "toutes pareilles ; une unité U en carton par élève, la même pour tous ; des bandes de papier",
  "L'affiche des trois règles ; une affiche de quatre segments tracés dans tous les sens ; dans chaque cahier, des segments tracés d'avance ; "
    + "l'unité U de chacun ; des bandes de papier ; des crayons pour la classe",
  "Une feuille ou une bande de papier par élève, à plier ; l'unité U ; dans chaque cahier, des segments à mesurer ; du papier quadrillé ; la règle "
    + "graduée de la classe",
];

/** Les feuilles et le matériel de la séquence, à sa classe : le CP, ou le CE1. */
export function planLongueursCpCe1(ctx: ContexteFeuilles): PlanDesFeuilles {
  const feuilles = feuillesDeLaClasse(ctx.classe === "CP" ? "CP" : "CE1").sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
