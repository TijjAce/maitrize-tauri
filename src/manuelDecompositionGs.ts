// Les décompositions additives des nombres de 2 à 9, en grande section : une
// séquence d'après le manuel de préparation au CRPE que l'enseignant a fourni
// dans « Adapter une fiche » (octobre 2026) — « Réussir mon CRPE, oral
// 2025-2026, épreuve de leçon, maths et français » (Nathan), sujet n° 6,
// « Décomposition additive GS », p. 108-119.
//
// Le sujet demande un atelier pour douze élèves de grande section, en
// période 4 (p. 108) ; le manuel le détaille (p. 116-119) : c'est la séance 2
// de la séquence, six phases de cinq minutes où la classe fabrique un album à
// calculer. Sur chaque page, un nombre — son chiffre, le dé, les doigts — et
// des oiseaux perchés sur trois fils ; le dernier quart de la feuille se
// replie, comme une porte, et cache une partie des oiseaux. Le manuel dit ce
// qui précède — revoir les façons de montrer un nombre de 1 à 9 : le chiffre,
// le dé, le domino, les doigts ; savoir surcompter (p. 108 et 115) — et ce
// qui suit : un atelier peinture pour la couverture, puis l'album rangé dans
// la bibliothèque de la classe (p. 119). Il ne prévoit pas d'évaluation. Les
// phases des séances 1, 3 et 4 sont de Maitrize, d'après ces passages, ses
// choix pédagogiques (p. 116), ses connaissances didactiques (p. 111-114) et
// la question du jury sur la façon de faire vivre l'album, et la source le
// dit. Le texte du manuel n'est pas repris : ses phases sont dites ici avec
// nos mots, et une seule phrase en est citée.
//
// Le manuel, écrit sur le programme de 2021, vise un attendu de fin de
// cycle : dire combien il faut ajouter ou enlever pour obtenir une quantité
// jusqu'à dix. Au programme de 2025, la séquence sert « Composer ou
// décomposer des nombres inférieurs ou égaux à dix », en grande section.
//
// En maternelle, Maitrize ne fabrique pas de feuilles pour une séquence : le
// matériel de chaque séance est dans ses phases, et la note du matériel le
// reprend. Trois ateliers de Fabriquer y servent, nommés dans leur phase :
// « Cartes des nombres » pour le jeu des paires de la séance 1, « Construire
// des collections » pour les cartes que l'on tire à la séance 2, « Le
// problème du jour » pour continuer, chaque jour, après la séance 4. La page
// vierge de l'album — quatre cases, trois fils, deux traits de pliage —,
// aucun atelier ne la fait : elle se trace à la main.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { PlanDesFeuilles } from "./feuillesDesSequences";

export const ID_DECOMPOSITION_GS = "decomposition-additive-gs";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

const REGROUPEMENT = "Regroupement – Collectif";
const RETOUR = "Retour au coin regroupement";

export const DEMARCHE_DECOMPOSITION_GS: Demarche = {
  id: ID_DECOMPOSITION_GS,
  nom: "Décomposer les nombres de 2 à 9 : l'album à calculer (GS)",
  famille: "Maternelle",
  source: `D'après ${MANUEL}, sujet n° 6, « Décomposition additive GS », p. 108-119 : l'atelier de la séance 2, détaillé (p. 116-119), `
    + "sa période (p. 108), ce qui le précède et ce qui le suit (p. 108, 115 et 119) ; les séances 1, 3 et 4 et leurs phases ajoutées par Maitrize, "
    + "d'après les prérequis, les choix pédagogiques, la conclusion et la question du jury (p. 115-119) ; programme de l'école maternelle (2025)",
  resume: "En grande section, en période 4 : un atelier dirigé de douze élèves fabrique un album à calculer. Chaque page montre un nombre — son "
    + "chiffre, le dé, les doigts — et des oiseaux perchés sur trois fils ; le dernier quart de la feuille se replie, comme une porte, et cache "
    + "une partie des oiseaux : combien en voit-on, combien se cachent ? En faisant les pages eux-mêmes, par deux, les élèves mémorisent les "
    + "décompositions des nombres de 2 à 9, et passent du surcomptage au calcul. Avant, on revoit les façons de montrer un nombre de 1 à 9 ; "
    + "après, on peint la couverture, puis l'album rejoint la bibliothèque de la classe, où l'on joue avec lui jusqu'à dire les décompositions "
    + "sans compter.",
  visee: { intitule: /composer ou décomposer des nombres inférieurs ou égaux à dix/i, niveaux: ["GS"] },
  seances: [
    seance("Un nombre, plusieurs façons de le montrer",
      sauront("reconnaître et montrer un nombre de 1 à 9 de plusieurs façons — son chiffre, les points du dé, le domino, les doigts —, passer d'une façon à l'autre, et trouver combien un domino a de points en surcomptant à partir d'une face."), 30, [
        ph(REGROUPEMENT, "5 min", "Le nombre éclair : l'adulte montre un court instant une face de dé, un domino, une carte-chiffre ou ses doigts. Chacun montre le même nombre sur ses doigts, puis le dit.",
          "Montre trop vite pour qu'on compte un à un : on reconnaît d'un coup d'œil. Au-delà de cinq, fait dire « cinq et encore deux » : la main pleine, et deux doigts."),
        ph("Manipulation – Par deux", "10 min", "Des dominos jusqu'à neuf points. Chacun en retourne un et dit combien il a de points : il reconnaît une face, puis compte la suite à partir d'elle — « cinq… six, sept ». Il prend autant de jetons dans la boîte et pose la carte-chiffre à côté. Le voisin vérifie.",
          "Observe qui recompte tout, qui part d'une face ; montre qu'on va plus vite en partant de la plus grande. Aide : un jeton sur chaque point."),
        ph("Jeu – Par deux", "10 min", "Le jeu des paires : des cartes de 1 à 9, face cachée, les unes en chiffres, les autres en points du dé. On en retourne deux ; si elles montrent le même nombre, on les garde en disant comment on le sait. Les cartes : l'atelier « Cartes des nombres » de Fabriquer, réglé de 1 à 9.",
          "Fait justifier chaque paire. Moins de cartes — de 1 à 6 — pour qui ne reconnaît pas encore les constellations."),
        ph(RETOUR, "5 min", "Ce qu'on retient : un même nombre se montre de plusieurs façons. Huit, c'est le chiffre 8, la main pleine et trois doigts, le domino cinq et trois. L'affiche des nombres de 1 à 9 se complète.",
          "Garde l'affiche au mur : elle servira à faire les pages de l'album."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée.
    seance("Fabriquer l'album à calculer : les oiseaux sur les fils",
      sauront("trouver combien d'oiseaux la porte cache quand on en voit une partie, pour un nombre de 3 à 9, et dire la décomposition — sept oiseaux, c'est cinq oiseaux et deux oiseaux — ; chaque binôme a fait deux pages de l'album à calculer de la classe, pour mémoriser les décompositions des nombres de 2 à 9."), 30, [
        ph("Phase 1 – Collectif", "5 min", "Au tableau, projetée ou affichée, une image : six oiseaux perchés sur trois fils. « Il y a combien d'oiseaux sur les fils ? » Chacun compte dans sa tête. Puis l'adulte montre un album à compter jusqu'à 6, avec des oiseaux sur un fil, comme ceux de la bibliothèque de la classe. Il le feuillette ; à chaque page, les élèves disent combien il y a d'oiseaux : ils lisent le chiffre, reconnaissent le dé, ou comptent.",
          "Fait dire comment on a trouvé. Observe qui reconnaît le nombre d'un coup d'œil, qui compte un à un."),
        ph("Phase 2 – Collectif", "5 min", "L'adulte annonce le projet : la classe va fabriquer un album à calculer. Il montre la page du 3, faite d'avance : le chiffre, le dé, les doigts, trois oiseaux sur les fils. Il replie la porte — le dernier quart de la feuille — : un oiseau disparaît. « Trois oiseaux, c'est deux oiseaux et un oiseau » ; au tableau : 2 et 1, ou 2 + 1. Puis une autre page du 3, porte fermée : on n'y voit qu'un oiseau. « Derrière la porte, il y en a combien ? » Les élèves répondent ; il ouvre : un oiseau et deux oiseaux, 1 et 2, 1 + 2.",
          "Décrit la page case par case : le chiffre, le dé, les doigts, les oiseaux, la case du bas. Laisse répondre avant d'ouvrir. Lit 2 + 1 « deux et un » : le signe + ne s'étudie qu'au CP."),
        ph("Phase 3 – Binômes", "5 min", "Six binômes. Chacun reçoit une page vierge — les quatre cases, les trois fils, les traits de pliage — et tire une carte parmi celles que l'adulte tend : 4, 5, 6, 7, 8 ou 9. Il fait la page de son nombre : d'abord les cases bleues — le chiffre, le dé, les doigts. Puis il va chercher les gommettes d'oiseaux sur la table du fond, en un seul trajet, juste ce qu'il faut, et les colle sur les fils où il veut, les deux élèves d'accord ; mais, porte fermée, des oiseaux doivent rester cachés. Les cartes : l'atelier « Construire des collections » de Fabriquer, les cartes-nombres de 4 à 9, le chiffre seul.",
          "Forme les binômes d'avance : un élève plus sûr avec un autre, pour l'entraide. Vérifie les cases avant le départ vers les oiseaux ; au-delà de six, deux dés. Erreurs attendues : trop ou trop peu d'oiseaux rapportés — on compare avec la carte ; tous les oiseaux du côté qu'on voit — on ferme la porte pour s'en apercevoir. Aide : la carte du même nombre avec les points et les doigts."),
        ph("Phase 4 – Binômes", "5 min", "Quand le binôme est d'accord, il ferme la porte. Sur l'ardoise, il écrit le nombre d'oiseaux qu'il voit, puis le nombre d'oiseaux cachés. Il remplit enfin la case vide du bas : pour sept, par exemple, 5 + 2. La page finie, on l'échange avec un autre binôme, qui dit s'il est d'accord.",
          "Passe d'un binôme à l'autre ; fait dire la phrase entière : « sept oiseaux, c'est cinq oiseaux et deux oiseaux ». Erreur attendue : rouvrir la porte pour compter les oiseaux cachés — on écrit d'abord, on vérifie après. La case du bas est la plus difficile : on dit la décomposition avant de l'écrire ; la page du 3 sert de modèle."),
        ph("Phase 5 – Binômes", "5 min", "Une seconde page, pour le même nombre, mais avec un autre nombre d'oiseaux visibles. Les binômes retournent chercher les gommettes et la font seuls. L'adulte valide chaque page, ou non, puis lit à voix haute les décompositions nouvelles.",
          "Dit pourquoi une page est refusée : le même partage que la première, ou pas le bon nombre d'oiseaux en tout. Observe qui trouve un autre partage sans recompter."),
        ph("Phase 6 – Collectif", "5 min", "L'adulte rassemble les pages, porte fermée, en tas au milieu de la table. On va les ranger dans l'ordre : il les pose, mais ce sont les élèves qui disent par laquelle commencer, puis laquelle suit. À chaque page, il la montre porte fermée, puis ouverte, et dit le nombre et sa décomposition. Les pages rangées, il les agrafe. Il annonce la suite : demain, un atelier peinture fera la couverture, avec tous les nombres dessinés partout, dans tous les sens.",
          "Fait justifier l'ordre : quatre vient après trois. Les deux pages d'un même nombre se suivent. Observe qui dit la décomposition avant que la porte s'ouvre."),
      ]),
    seance("La couverture de l'album",
      sauront("relire l'album à calculer — porte fermée, dire combien d'oiseaux se cachent ; porte ouverte, vérifier —, nommer les oiseaux des pages, et écrire les chiffres de 1 à 9 en disant leur nom, pour décorer la couverture."), 30, [
        ph(REGROUPEMENT, "5 min", "On relit l'album fait la veille, page après page : porte fermée, on dit combien d'oiseaux se cachent ; porte ouverte, on vérifie et l'on dit la décomposition.",
          "Laisse répondre avant d'ouvrir chaque porte ; note qui répond sans compter."),
        ph("Langage – Collectif", "5 min", "Les oiseaux des gommettes : on les décrit — la couleur, le bec, la queue — et l'on dit le nom de ceux qu'on connaît, avec un imagier ou un documentaire sur les oiseaux.",
          "Dit le mot précis et le fait redire dans une phrase."),
        ph("Atelier peinture – Petits groupes", "15 min", "La couverture : chacun peint ou dessine des chiffres de 1 à 9 partout sur la grande feuille — en haut, en bas, droits ou penchés, grands ou petits —, en disant leur nom. Tous les chiffres doivent y être.",
          "Le modèle des chiffres reste sous les yeux ; veille au sens du tracé. Fait vérifier qu'aucun chiffre ne manque."),
        ph(RETOUR, "5 min", "Le titre de l'album, dicté à l'adulte, s'écrit sur la couverture, qu'on agrafe à l'album. L'album rejoint la bibliothèque de la classe, à côté des albums à compter.",
          "Dit quand on pourra le lire : à l'accueil, seul ou à deux."),
      ]),
    seance("Jouer avec l'album à calculer",
      sauront("dire combien d'objets sont cachés quand on en voit une partie, pour un nombre jusqu'à 9 — en comptant d'abord, puis de mémoire —, et trouver toutes les façons de faire un nombre en deux parties : cinq, c'est un et quatre, deux et trois, trois et deux, quatre et un."), 30, [
        ph(REGROUPEMENT, "5 min", "Le jeu du gobelet : l'adulte montre sept jetons, puis en cache une partie sous un gobelet. On voit les autres : combien y en a-t-il dessous ? Chacun répond avec ses doigts ; on soulève pour vérifier. On recommence avec d'autres nombres.",
          "Laisse chercher avant de soulever. Fait dire comment on le sait : en comptant sur ses doigts, ou parce qu'on s'en souvient."),
        ph("Jeu – Par deux", "10 min", "Avec l'album : l'un ouvre une page, porte fermée ; l'autre lit le nombre, dit combien d'oiseaux se cachent, puis ouvre la porte pour vérifier. On change de rôle à chaque page. Puis le même jeu avec le gobelet et autant de jetons que le nombre de la carte tirée.",
          "Observe qui répond sans compter — la décomposition est mémorisée —, qui surcompte sur ses doigts, qui ouvre la porte pour compter : on le note pour le suivi des apprentissages."),
        ph("Manipulation – Par deux", "10 min", "Les pages qui manquent : avec les jetons, le binôme cherche toutes les façons de faire le nombre de sa carte en deux parties, puis regarde lesquelles l'album a déjà. Pour une qui manque, il fait une page, comme à la séance 2 : les cases, les gommettes, la décomposition.",
          "Fait remarquer que cinq et deux, deux et cinq, font sept tous les deux, mais pas la même page ; on peut partir du plus grand. La carte du 2 fait la page qui manque encore : une seule façon, un et un."),
        ph(RETOUR, "5 min", "Ce qu'on retient : sept, c'est six et un, cinq et deux, quatre et trois… On finit par le dire sans compter. Sous la dictée, l'adulte écrit les façons de faire chaque nombre ; l'affiche reste près de l'album, qui retourne dans la bibliothèque de la classe. Pour continuer, chaque jour, le problème du jour — combien en a-t-on ajouté, ou enlevé ? — avec les oiseaux sur la branche : l'atelier « Le problème du jour » de Fabriquer.",
          "Reprend les jours suivants les décompositions qui résistent, avec l'album et le gobelet."),
      ]),
  ],
};

// ── Le matériel des séances ───────────────────────────────────────────────

/** Ce qu'il faut préparer, séance par séance : en maternelle, aucune feuille fabriquée, tout est dans les phases. */
const MATERIEL = [
  "Un dé, des dominos et des cartes-chiffres de 1 à 9 pour le nombre éclair ; par binôme, des dominos jusqu'à neuf points, une boîte de jetons, "
    + "les cartes-chiffres, et les cartes du jeu des paires, de 1 à 9, en chiffres et en points du dé (atelier « Cartes des nombres » de Fabriquer) ; "
    + "l'affiche des nombres de 1 à 9",
  "Pour l'atelier de douze : une image de six oiseaux sur trois fils, à projeter ou à afficher ; un album à compter jusqu'à 6, avec des oiseaux "
    + "sur un fil ; deux pages du 3, faites d'avance ; douze pages vierges, tracées à la main — une feuille carrée, quatre cases aux coins dont "
    + "trois bleues, trois fils, le pli de la porte au dernier quart et le trait de ce qu'elle cache ; les cartes 4 à 9, le chiffre seul, et les "
    + "mêmes avec les points et les doigts, pour aider (atelier « Construire des collections » de Fabriquer, les cartes-nombres) ; une boîte de "
    + "gommettes d'oiseaux sur une table au fond de la classe ; les ardoises ; une agrafeuse",
  "L'album à calculer de la veille ; un imagier ou un documentaire sur les oiseaux ; une grande feuille pour la couverture, de la peinture, "
    + "des pinceaux, des feutres ; le modèle des chiffres de 1 à 9 ; une agrafeuse",
  "Sept jetons et un gobelet pour le regroupement ; par binôme, neuf jetons, un gobelet et une carte de 2 à 9 ; l'album à calculer ; "
    + "des pages vierges et les gommettes d'oiseaux pour les pages qui manquent ; une grande feuille pour l'affiche des façons de faire chaque nombre",
];

/** Le plan de la séquence : en maternelle, aucune feuille ; une ligne de matériel par séance. */
export function planDecompositionGs(): PlanDesFeuilles {
  return { feuilles: [], materiel: MATERIEL.map((m) => `${m}.`) };
}
