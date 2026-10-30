// Reconnaître les formes planes et reproduire des figures avec le tangram, en
// grande section : une séquence d'après le manuel de préparation au CRPE que
// l'enseignant a fourni dans « Adapter une fiche » (octobre 2026) — « Réussir
// mon CRPE, oral 2025-2026, épreuve de leçon, maths et français » (Nathan),
// sujet n° 5, « Formes et grandeurs GS » (sujet du CRPE 2023), p. 95-107.
//
// Le sujet laisse le choix entre les formes, les grandeurs et les suites
// organisées : le manuel prend les formes planes, avec le tangram, et met sa
// séance en période 3 (p. 103). Il ne découpe pas la séquence en séances ; il
// dit ce que la grande section fait du tangram après la petite et la moyenne
// section (p. 102), les activités de la séquence et ce qu'elles visent
// (p. 103), et que le tangram a pu être découpé dans le grand carré lors de
// séances antérieures (p. 104). Sa séance détaillée — un atelier
// dirigé de six élèves, cinq tâches de difficulté croissante (p. 104-106) —
// vient au terme de la séquence et sert d'évaluation (p. 107) : elle est ici
// la dernière. Les six séances qui la précèdent sont de Maitrize, d'après ces
// tableaux, les connaissances didactiques (p. 97-100) et l'analyse des
// documents du corpus (p. 100-102), et la source le dit. Le manuel annonce
// vingt minutes pour sa séance, mais ses phases en font vingt-cinq : c'est
// leur somme qu'on garde. Le texte du manuel n'est pas repris : ses phases et
// ses consignes sont dites ici avec nos mots.
//
// Des ateliers tournants, en groupes de six, de vingt à vingt-cinq minutes,
// la classe réunie au coin regroupement pour commencer et pour finir. Les
// variables qui différencient sont celles du manuel : le nombre de pièces,
// les contours intérieurs dessinés ou non, des pièces en couleur ou toutes
// noires, un modèle à la même taille ou non. Comme toute séquence de
// maternelle, elle n'a pas de feuilles : Fabriquer n'a pas d'atelier du
// tangram, et les modèles se préparent à la main, plastifiés (voir
// MATERIEL). Seul l'atelier « Jeu des ombres » sert, à la séance 5 : il fait
// l'ombre des créations de la classe, photographiées à la séance 3.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { PlanDesFeuilles } from "./feuillesDesSequences";

export const ID_FORMES_GRANDEURS_GS = "formes-tangram-gs";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

const RETOUR = "Retour au coin regroupement";

export const DEMARCHE_FORMES_GRANDEURS_GS: Demarche = {
  id: ID_FORMES_GRANDEURS_GS,
  nom: "Le tangram : reconnaître les formes, reproduire des figures (GS)",
  famille: "Maternelle",
  source: `D'après ${MANUEL}, sujet n° 5, « Formes et grandeurs GS » (sujet du CRPE 2023), p. 95-107 : la séance détaillée, en cinq phases `
    + "(p. 104-106), qui vient au terme de la séquence et sert d'évaluation (p. 107), et sa période (p. 103) ; les séances 1 à 6 et leurs phases "
    + "ajoutées par Maitrize, d'après la progression du tangram de la PS à la GS (p. 102), les activités de la séquence et les compétences qu'elles "
    + "visent (p. 103), le choix du matériel (p. 104), les connaissances didactiques (p. 97-100) et l'analyse des documents du corpus — dont "
    + "l'article de M.-J. Perrin-Glorian, « Jouer avec des formes en maternelle » (2015) — (p. 96 et 100-102) ; l'atelier « Jeu des ombres » "
    + "de la séance 5 ajouté par Maitrize ; programme de l'école maternelle (2025)",
  resume: "En grande section, en période 3 : reconnaître les formes planes et reproduire des figures avec les sept pièces du tangram. On trie "
    + "d'abord des formes plates de toutes sortes, posées dans tous les sens — un carré tourné reste un carré. Chacun découpe son tangram dans le "
    + "grand carré, nomme et compare ses pièces, puis joue avec elles : des créations libres, des défis. On recouvre ensuite des modèles où chaque "
    + "pièce est dessinée, puis des silhouettes ; on reproduit à côté du modèle, puis d'après un modèle plus petit. La dernière séance, celle du "
    + "manuel, enchaîne des tâches de plus en plus difficiles : elle sert de bilan, et chacun y reçoit l'aide que ses erreurs demandent. Des "
    + "ateliers dirigés de six élèves, de vingt à vingt-cinq minutes. Ce qui différencie : le nombre de pièces, les contours intérieurs dessinés "
    + "ou non, des pièces en couleur ou toutes noires, la taille du modèle. Chacun dit ce qu'il fait : le nom des formes, les gestes — tourner, "
    + "retourner, poser —, les positions — à côté, contre, au-dessus.",
  visee: { intitule: /reproduire des assemblages de solides \(au maximum/i, niveaux: ["GS"] },
  seances: [
    seance("Trier les formes planes : carrés, rectangles, triangles, disques",
      sauront("reconnaître et trier des carrés, des rectangles, des triangles et des disques, quels que soient leur couleur, leur taille et leur position, les nommer, et dire ce qui les distingue : le nombre de côtés, des côtés de même longueur, un bord tout rond."), 20, [
        ph("Regroupement – Le sac à formes", "5 min", "Un élève glisse la main dans le sac, touche une forme plate sans la voir et la décrit : des côtés droits ou un bord rond, combien de pointes. La classe devine ; on sort la forme et on la nomme. On recommence avec deux ou trois formes.",
          "Donne le mot exact et le fait redire dans une phrase : un disque, plutôt qu'un rond ; un sommet, c'est chacune des pointes, pas seulement celle du haut. Note qui décrit, qui ne fait que nommer."),
        ph("Atelier dirigé – Trier", "10 min", "Six élèves autour d'une corbeille de formes plates mêlées — blocs logiques, formes en carton, pièces de tangram —, de toutes les couleurs, de toutes les tailles, posées dans tous les sens. D'abord, chacun met ensemble ce qui va ensemble et dit pourquoi. Puis on ne regarde plus que la forme : une barquette pour les carrés, une pour les rectangles, une pour les triangles, une pour les disques. Chacun range une forme et dit pourquoi elle va là.",
          "Ramène à la forme celui qui trie par la couleur ou par la taille. Pose un carré sur sa pointe : est-ce encore un carré ? Erreurs attendues : le carré tourné appelé losange ou mis à part, le triangle pointe en bas refusé, un rectangle appelé carré. Aide : suivre les côtés du doigt en les comptant ; poser une forme sur une autre pour les comparer ; tourner la forme pour la reposer sur un côté."),
        ph(RETOUR, "5 min", "Le groupe montre ses barquettes à la classe. On colle sur l'affiche des formes un carré, un rectangle, un triangle et un disque, chacun dans plusieurs positions : le carré posé sur un côté, puis sur une pointe ; le triangle pointe en haut, puis pointe en bas.",
          "Fait dire ce qui ne change pas quand on tourne une forme. L'affiche reste au mur pour toute la séquence."),
      ]),
    seance("Les sept pièces du tangram",
      sauront("découper les sept pièces d'un tangram dans le grand carré, les compter et les nommer — deux grands triangles, un triangle moyen, deux petits triangles, un carré, un parallélogramme —, et trouver, en les posant l'une sur l'autre, celles qui sont pareilles."), 20, [
        ph("Regroupement – Le grand carré", "5 min", "Un grand carré de carton, le tangram tracé dessus : quelles formes voit-on dans ce carré ? On les montre du doigt, on les compte, on les nomme : des triangles, un carré, et une drôle de pièce, ni carré ni triangle — le parallélogramme.",
          "Accepte d'abord les mots des élèves, puis donne le mot juste. Repère qui voit le carré au milieu des triangles, qui voit des triangles de trois tailles."),
        ph("Atelier dirigé – Découper et comparer", "10 min", "Chacun a son grand carré imprimé sur du papier épais, les traits bien marqués, et découpe les sept pièces en suivant les traits. Puis on compare en posant une pièce sur l'autre : les deux petits triangles sont pareils, les deux grands aussi ; le moyen est entre les deux.",
          "Aide au découpage : on tourne la feuille, pas les ciseaux. Le découpage exerce la main, et les formes s'apprennent en passant. Erreurs attendues : un trait coupé de travers, une pièce coupée en deux, le triangle moyen confondu avec un grand. Les pièces découpées ne sont jamais parfaites : pour reproduire des figures, on prendra des pièces prédécoupées."),
        ph(RETOUR, "5 min", "Chacun range ses pièces dans une enveloppe à son nom en les comptant et en les nommant : ce tangram est à lui, pour jouer. On montre un tangram prédécoupé, en carton plastifié ou du commerce : les mêmes pièces, plus solides — on s'en servira aux séances suivantes.",
          "Fait dire le grand triangle, le triangle moyen, le petit triangle, le carré, le parallélogramme ; accepte encore une description à la place du mot."),
      ]),
    seance("Jouer avec les pièces : des créations libres, puis des défis",
      sauront("assembler les pièces du tangram sans les poser l'une sur l'autre, côté contre côté ou sommet contre sommet, faire un carré, un triangle ou un parallélogramme avec les deux petits triangles, tourner ou retourner une pièce pour qu'elle trouve sa place, et dire comment ils ont fait."), 25, [
        ph("Regroupement – La règle du jeu", "5 min", "Les noms des sept pièces, rappelés avec le tangram prédécoupé. La règle du tangram : les pièces se touchent, mais ne montent jamais l'une sur l'autre. L'enseignant montre deux pièces qui se touchent par un côté entier, puis par une pointe seulement : un sommet.",
          "Montre en disant ce qu'il fait : je pose, je tourne, je retourne, je glisse contre. Les élèves redisent les gestes."),
        ph("Jeu – Créations libres", "5 min", "Chacun fait ce qu'il veut avec ses sept pièces — une maison, un animal, un personnage —, lui donne un nom et dit quelles pièces il a prises.",
          "Photographie chaque création, de haut, sur une feuille blanche : les photos serviront à la séance 5. Observe qui pose des pièces l'une sur l'autre, qui n'emploie que les triangles."),
        ph("Atelier dirigé – Les défis", "10 min", "Des défis de plus en plus difficiles. Avec les deux petits triangles, faire un carré, puis un triangle, puis un parallélogramme, et vérifier en posant dessus la vraie pièce. Avec le triangle moyen et les deux petits, faire un triangle aussi grand que le grand triangle. Comparer des côtés en les mettant l'un contre l'autre : le côté du carré est aussi long que le petit côté du petit triangle.",
          "Fait dire les gestes — tourner, retourner, glisser, poser contre — et les positions — à côté, au-dessus, en dessous. Le parallélogramme ne trouve parfois sa place qu'une fois retourné : le faire essayer. Laisse chercher avant d'aider ; différencie par le nombre de pièces et par le défi donné."),
        ph(RETOUR, "5 min", "Le groupe montre à la classe une création et un défi réussi, en disant comment il a fait : avec deux petits triangles, on peut faire un carré. Les photos des créations sont affichées.",
          "Reprend le mot juste et fait redire la phrase entière."),
      ]),
    seance("Recouvrir un modèle : on voit chaque pièce",
      sauront("recouvrir un modèle dont les contours des pièces sont dessinés : choisir chaque pièce d'après sa forme et sa taille, la tourner jusqu'à ce qu'elle tombe juste, de trois pièces jusqu'aux sept, et dire comment ils ont trouvé."), 20, [
        ph("Regroupement – Un modèle à recouvrir", "5 min", "Un modèle simple de quatre pièces, chaque pièce dessinée, au milieu du cercle : quelles pièces faut-il ? On les nomme, on les compte, puis un élève les pose dessus. Chaque pièce doit cacher sa forme exactement : rien ne dépasse, aucun blanc ne reste.",
          "Montre comment vérifier, en suivant du doigt le bord de chaque pièce."),
        ph("Atelier dirigé – Recouvrir les modèles", "10 min", "Chacun a sa boîte de sept pièces et des modèles plastifiés, à la taille des pièces, de plus en plus difficiles : trois pièces, puis cinq, puis les sept. On cherche la pièce, on la tourne, on la pose sur sa forme. Pour aider : les pièces en couleur et le modèle aux mêmes couleurs ; ou un modèle en petit livre, une pièce de plus à chaque page.",
          "Observe par quelle pièce chacun commence — les grandes d'abord ? — et les erreurs : le triangle moyen à la place d'un grand, une pièce mal tournée, le parallélogramme qu'il faut retourner. Une aide à la fois : nommer la pièce, la montrer, la poser avec l'élève. Les pièces dont les côtés suivent les bords de la feuille se reconnaissent mieux : commencer par elles. Donne la couleur à qui en a besoin, et la retire dès que possible."),
        ph(RETOUR, "5 min", "Chacun dit comment il a fait : par quelle pièce il a commencé, comment il a su où la mettre. Ce qu'on retient : on commence par les grandes pièces ; on tourne la pièce jusqu'à ce qu'elle tombe juste ; le parallélogramme, parfois, se retourne.",
          "Reprend les mots justes — côté, sommet, tourner, retourner — et les fait redire."),
      ]),
    seance("Recouvrir une silhouette : on ne voit plus les pièces",
      sauront("recouvrir une silhouette sans contours intérieurs : imaginer où vont les pièces qu'ils connaissent, essayer, corriger, puis vérifier avec le même modèle, les contours des pièces dessinés."), 20, [
        ph("Regroupement – Les ombres de nos créations", "5 min", "Les photos des créations de la séance 3 sont passées dans l'atelier « Jeu des ombres » de Fabriquer, qui fait de chacune une ombre noire. Chaque photo retrouve son ombre. Dans l'ombre, voit-on encore les pièces ?",
          "Fait dire ce que l'ombre cache — les traits entre les pièces, les couleurs — et ce qu'elle garde : le tour de la figure, ses pointes, ses bords droits."),
        ph("Atelier dirigé – La silhouette", "10 min", "Chacun a une silhouette noire plastifiée, à la taille des pièces, et juste les pièces qu'il faut : quatre d'abord, puis les sept. On cherche où chaque pièce peut aller — une pointe de la silhouette appelle souvent un triangle —, on essaie, on corrige.",
          "Observe comment chacun cherche : il voit les pièces dans la silhouette avant de les poser ; il essaie et corrige ; ou il place une ou deux pièces en tâtonnant, puis voit où vont les autres. Erreurs attendues : une pièce qui dépasse, un blanc qui reste, un grand triangle là où il fallait deux petits. Aide : moins de pièces ; montrer un instant le modèle aux contours dessinés ; poser la première pièce avec l'élève."),
        ph(RETOUR, "5 min", "On compare les façons de chercher. Puis chacun vérifie avec le même modèle, les contours des pièces dessinés : chaque pièce est-elle à sa place ? Une autre solution qui couvre tout, sans rien dépasser, est juste aussi.",
          "Fait dire comment on a trouvé ; met en valeur celui qui a d'abord vu les pièces dans sa tête."),
      ]),
    seance("À côté du modèle, puis d'après un modèle plus petit",
      sauront("reproduire une figure de tangram à côté de son modèle, en gardant la forme, la taille et le sens de chaque pièce et en faisant se toucher les bons côtés et les bons sommets, puis d'après un modèle plus petit où chaque pièce est dessinée."), 25, [
        ph("Regroupement – Construire à côté", "5 min", "Un modèle posé sur la table, une feuille blanche à côté : cette fois, on construit la figure à côté du modèle, pas dessus. Un élève montre comment faire : il pose la pièce sur le modèle pour être sûr de sa forme, de sa taille et de son sens, puis la fait glisser à côté sans la tourner.",
          "Met des mots sur ce qui change : le modèle ne tient plus les pièces ; il faut voir soi-même quels côtés sont alignés, quels sommets se touchent."),
        ph("Atelier dirigé – À côté du modèle", "10 min", "Chacun reproduit, à côté de son modèle — à la même taille, chaque pièce dessinée —, une figure de quatre pièces, puis de sept. On peut toujours poser une pièce sur le modèle pour la vérifier, avant de la mettre à côté.",
          "Erreurs attendues : une pièce qui tourne pendant qu'on la déplace, des pièces décalées, un trou entre deux pièces. Aide : revenir au modèle, une pièce à la fois ; moins de pièces."),
        ph("Atelier dirigé – Un modèle plus petit", "5 min", "Pour qui a réussi : une figure dessinée plus petite que les pièces, chaque pièce visible. On reconnaît chaque pièce à sa forme et à sa taille par rapport aux autres — le grand triangle reste le plus grand —, puis on la place comme sur le dessin.",
          "Sans les contours des pièces, ce serait trop difficile en maternelle : le modèle les montre toutes. Les autres continuent à côté du modèle, avec moins de pièces."),
        ph(RETOUR, "5 min", "Un élève fait une figure de trois ou quatre pièces ; un camarade la reproduit à côté, devant le groupe, en disant ce qu'il fait : je mets le carré contre le grand triangle, à côté de sa pointe.",
          "Fait employer les mots des positions — à côté, contre, au-dessus, en dessous — et ceux des gestes."),
      ]),
    // La séance détaillée du manuel : ses cinq phases, leur organisation et leur durée.
    seance("Recouvrir des modèles de plus en plus difficiles : le bilan",
      sauront("reproduire une figure en posant les pièces d'un tangram sur son modèle : reconnaître chaque pièce, la prendre à la bonne taille, la tourner dans le bon sens, et recouvrir des figures entières, avec puis sans les contours des pièces."), 25, [
        ph("Phase 1 – Individuel", "5 min", "Recherche. Les sept pièces d'un tangram, étalées sur la table : « Ce jeu, vous le connaissez ? Montrez-moi un carré. Et un triangle ? » L'enseignant montre un triangle : comment s'appelle cette forme, à quoi la reconnaît-on ? Puis le parallélogramme : et celle-ci ? Ensuite, les pièces de six tangrams noirs, étalées ; chacun a une boîte devant lui et y met un carré, puis un grand triangle, un petit, un moyen, et enfin le parallélogramme, ni carré ni triangle, jusqu'à avoir les sept. Dernière tâche : sur sa fiche, les sept pièces sont dessinées en désordre, tournées dans tous les sens ; chacun pose chaque pièce sur la forme qui est la même.",
          "Recueille les réponses et les rectifie si besoin. Erreurs attendues : une forme mal reconnue ; la bonne forme, mais pas la bonne taille ; une pièce mal orientée ; le parallélogramme ; du mal à dire comment on a fait."),
        ph("Phase 2 – Collectif", "2 min", "Validation. L'enseignant montre les fiches l'une après l'autre ; chacun dit comment il a fait. Puis le groupe regarde la fiche d'un élève qui s'est trompé : qu'en pense-t-on ? Chacun donne son avis sur les erreurs, et leur auteur les corrige.",
          "Choisit une fiche qui a une ou plusieurs erreurs ; fait expliquer l'erreur par les autres, puis corriger par celui qui l'a faite."),
        ph("Phase 3 – Individuel", "3 min", "Recherche. Sur une nouvelle fiche, une fusée faite des sept pièces : quatre sont en couleur, trois en noir. « Trouvez dans votre boîte les trois pièces noires du dessin, et posez-les à leur place. » Il faut à la fois la bonne forme, la bonne taille et le bon sens. L'enseignant valide ; on reparle des façons de faire.",
          "Erreurs attendues : la tâche laissée en route, un triangle trop grand ou trop petit, des pièces mal tournées."),
        ph("Phase 4 – Individuel", "5 min", "Nouvelle recherche : recouvrir deux figures entières avec toutes les pièces du tangram. D'abord un voilier dont les contours intérieurs sont dessinés, puis un autre voilier, en silhouette, sans contours intérieurs.",
          "Erreurs attendues, sans doute celles des travaux d'élèves du corpus : les pièces dont on voit le tour bien reconnues, mais plus ou moins bien tournées ; une partie de la figure à couvrir de deux triangles qu'on ne sait pas décomposer ; dans la silhouette, des essais au hasard, des pièces qui dépassent, des blancs qui restent."),
        ph("Phase 5 – Individuel", "10 min", "Jeux et remédiation. Qui a réussi reçoit d'autres figures à finir de recouvrir, ou invente une figure qu'un camarade devra reproduire : on les montrera au groupe, puis on les affichera dans la classe. Qui a eu du mal reçoit une tâche plus simple : une fiche de deux ou trois pièces au lieu de sept, avec des pièces en couleur pour les plus en difficulté ; pour qui bute sur le parallélogramme, un parallélogramme plastifié et une fiche où il est dessiné plusieurs fois, tourné ou retourné : « Pose ta pièce sur chaque forme du dessin, pour la cacher tout entière. » Pour finir, l'enseignant montre au groupe les productions de la phase, et l'on range le matériel.",
          "Étaye chacun selon ses erreurs. Après les erreurs de la phase 3 : moins de pièces à placer, une ou deux ; des pièces en couleur, retrouvées sur le modèle complet en couleur ; une pièce à la fois. Les jours suivants, l'accueil laisse quelques minutes pour reprendre avec un élève ce qui résiste."),
      ]),
  ],
};

// ── Le matériel des séances ───────────────────────────────────────────────

/** Ce qu'il faut préparer, séance par séance ; en maternelle, la séquence n'a pas de feuilles : les modèles se font à la main. */
const MATERIEL = [
  "Un sac opaque ; une corbeille de formes plates mêlées — blocs logiques, formes en carton, pièces de tangram —, de toutes les couleurs et de "
    + "toutes les tailles ; quatre barquettes ; une grande feuille pour l'affiche des formes, et de la colle",
  "Un grand carré de carton, le tangram tracé dessus ; pour chacun, un grand carré de tangram imprimé sur du papier épais, les traits bien "
    + "marqués, des ciseaux et une enveloppe à son nom ; un tangram prédécoupé — en carton plastifié ou du commerce — à montrer",
  "Un tangram prédécoupé par élève ; des feuilles blanches et l'appareil photo de la classe, pour photographier les créations",
  "Les tangrams prédécoupés, en noir et en couleur ; des modèles plastifiés à la taille des pièces, chaque pièce dessinée, de trois, de cinq et "
    + "de sept pièces ; les mêmes modèles en couleur ; un modèle en petit livre, une pièce de plus à chaque page",
  "Les photos des créations de la séance 3 et leurs ombres, faites dans l'atelier « Jeu des ombres » ; les tangrams prédécoupés ; des "
    + "silhouettes noires plastifiées, à la taille des pièces, de quatre et de sept pièces, et les mêmes modèles aux contours dessinés",
  "Les tangrams prédécoupés ; des modèles à la taille des pièces, chaque pièce dessinée, de quatre et de sept pièces ; des modèles dessinés plus "
    + "petits, chaque pièce visible ; une feuille blanche par élève, pour construire à côté",
  "Six tangrams noirs et des pièces en couleur ; six boîtes ; pour chacun, la fiche des sept pièces dessinées en désordre, la fusée aux trois "
    + "pièces noires, le voilier aux contours dessinés et le voilier en silhouette ; pour la remédiation, des fiches de deux ou trois pièces, un "
    + "parallélogramme plastifié et sa fiche de parallélogrammes tournés ou retournés, la fusée toute en couleur ; d'autres figures à finir de "
    + "recouvrir, pour qui a réussi",
];

/** Le matériel de la séquence, une ligne par séance ; pas de feuilles, comme toute séquence de maternelle. */
export function planFormesGrandeursGs(): PlanDesFeuilles {
  return { feuilles: [], materiel: MATERIEL.map((m) => `${m}.`) };
}
