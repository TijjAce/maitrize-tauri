// La symétrie axiale au CE2 : une séquence d'après le manuel de préparation
// au CRPE que l'enseignant a fourni dans « Adapter une fiche » (octobre
// 2026) — « Réussir mon CRPE, oral 2025-2026, épreuve de leçon, maths et
// français » (Nathan), sujet n° 11, « Symétrie axiale CE2 », p. 175-188.
//
// Le manuel place la séquence en période 3 et la découpe en cinq séances
// (p. 175) : reconnaître des figures symétriques ; trouver et tracer l'axe ;
// compléter une figure sur quadrillage ou papier pointé, l'axe parallèle aux
// bords de la feuille ; puis l'axe oblique ; puis sans quadrillage ni points.
// Il détaille la troisième en six phases (p. 183-186). Elle s'ouvre sur cinq
// minutes de calcul mental La Martinière — combien de dizaines, de centaines
// dans un nombre : la division par 10 et par 100, le travail de la période —,
// qui ouvre ici chaque séance, en dix minutes pour les autres. Les phases des
// séances 1, 2, 4 et 5 sont de Maitrize, d'après ce que le manuel dit de la
// progression, des procédures et des erreurs des élèves (p. 178-183) ; la
// sixième, l'évaluation et les remédiations, d'après ce qu'il en propose
// (p. 187). La source le dit. Le texte du manuel n'est pas repris : ses
// phases sont dites ici avec nos mots.
//
// Le fil de la séquence : manipuler d'abord — plier, découper, décalquer et
// retourner le calque, poser un miroir —, puis compter les carreaux de chaque
// point jusqu'à l'axe, et autant de l'autre côté. Deux erreurs à guetter : la
// figure glissée au lieu d'être retournée, et les carreaux comptés depuis le
// bord de la feuille plutôt que depuis l'axe.
//
// Ses feuilles viennent des ateliers « Calcul mental », « Géométrie » et
// « Se repérer, se déplacer », à ses réglages : chacune se rouvre dans le
// sien. Aucun atelier ne dessine encore les figures justes ou fausses de la
// séance 3, l'axe en diagonale des carreaux, ni la moitié de figure sur
// papier uni : l'enseignant les prépare, et le matériel le dit.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { objectifParId } from "./faitsNumeriques";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, libelleTravaille, type ReglagesMartiniere } from "./martiniere";
import { REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type ReglagesGeometrie } from "./geometrie";
import { REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements, type ReglagesDeplacements } from "./deplacements";

export const ID_SYMETRIE_CE2 = "symetrie-axiale-ce2";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

const MANUEL = "« Réussir mon CRPE — Oral 2025-2026, épreuve de leçon, Maths · Français » (D. Motteau, C. Jegaden, A.-R. Morel, S. Méric-Pons ; Nathan)";

const ROUTINE = "L'enseignant dit le calcul ; après un court temps de réflexion, chacun écrit le résultat sur son ardoise et la lève au signal.";
const PERIODE_3 = "En début de séance, chaque jour. En période 3, le calcul mental prépare la division : par 10 et par 100 d'abord, puis par d'autres nombres.";

export const DEMARCHE_SYMETRIE_CE2: Demarche = {
  id: ID_SYMETRIE_CE2,
  nom: "La symétrie axiale : reconnaître et compléter une figure (CE2)",
  famille: "Mathématiques",
  source: `D'après ${MANUEL}, sujet n° 11, « Symétrie axiale CE2 », p. 175-188 : la séquence en cinq séances et sa période (p. 175), `
    + "la séance 3 détaillée, calcul mental compris (p. 183-186) ; les phases des séances 1, 2, 4 et 5, la séance d'évaluation et de remédiation, "
    + "et le calcul mental en tête de ces séances ajoutés par Maitrize, d'après ce que le manuel dit de la progression, des procédures, des erreurs "
    + "des élèves et de l'évaluation (p. 178-183 et 187) ; programme de mathématiques du cycle 2 (2024)",
  resume: "Au CE2, en période 3 : reconnaître une figure symétrique, trouver et tracer son axe, puis compléter une figure par symétrie — sur quadrillage "
    + "ou papier pointé, l'axe suivant les lignes, puis de biais, enfin sans quadrillage. On manipule d'abord : plier, découper, décalquer et retourner "
    + "le calque, poser un miroir. Le quadrillage permet ensuite de compter les carreaux de chaque point jusqu'à l'axe, et d'en compter autant de "
    + "l'autre côté. Deux erreurs à guetter : la figure glissée au lieu d'être retournée, et les carreaux comptés depuis le bord de la feuille plutôt "
    + "que depuis l'axe ; c'est en pliant qu'on voit le mieux son erreur. Le calcul mental ouvre chaque séance : la division par 10 et par 100, "
    + "puis par d'autres nombres, le travail de la période.",
  visee: { intitule: /une figure simple pour la rendre symétrique/i, niveaux: ["CE2"] },
  seances: [
    seance("Reconnaître une figure symétrique",
      sauront("dire si un objet ou une figure est symétrique, et le vérifier en pliant, en découpant ou avec un calque qu'on retourne : les deux moitiés se superposent exactement."), 50, [
        ph(LM, "10 min", `Multiplier par 10 ou par 100 — « 10 fois 34 », « 100 fois 7 » : les unités deviennent des dizaines, ou des centaines. ${ROUTINE}`, PERIODE_3),
        ph(T1, "5 min", "Des objets et des photos sur la table : un papillon, une feuille d'arbre, un masque, la façade d'un bâtiment, un panneau. « Qu'ont-ils de pareil ? » On cherche la ligne qui partage chacun en deux moitiés pareilles.",
          "Fait dire ce que chacun voit ; les mots viendront à la fin de la séance."),
        ph(T2, "20 min", "Par deux, on fabrique : une tache de peinture sur une moitié de feuille, on plie, on déplie ; une feuille pliée en deux, on découpe une forme sur le pli — un sapin, un masque —, on déplie. Puis on trie des formes découpées : peut-on les plier en deux moitiés qui se superposent ? Enfin la feuille « Figures symétriques ou non ? » : on décalque chaque figure et on plie le calque ; si les deux moitiés se superposent, on trace le pli en rouge, sinon on barre la figure.",
          "Le calque, les ciseaux et la peinture restent à disposition. Erreur attendue : une figure presque symétrique, jugée symétrique à l'œil ; c'est le pliage qui tranche."),
        ph(T3, "10 min", "Ce qu'on retient : une figure est symétrique quand on peut la plier en deux parties qui se superposent exactement ; la ligne du pli s'appelle l'axe de symétrie. On le vérifie en pliant, ou avec un calque qu'on retourne.",
          "Écrit la trace avec les élèves, illustrée par leurs taches de peinture et leurs découpages."),
        ph(T4, "5 min", "Chercher, dans la classe et dans la cour, des objets symétriques ; les lettres capitales de son prénom : lesquelles le sont ?"),
      ]),
    seance("Trouver et tracer l'axe de symétrie",
      sauront("trouver le ou les axes de symétrie d'une figure — en pliant, au calque ou au miroir — et les tracer à la règle ; une figure peut en avoir un, plusieurs, ou aucun."), 50, [
        ph(LM, "10 min", `La table de 10 dans les deux sens — « 10 fois 6 », « 70, c'est 10 fois combien ? » : combien de dizaines dans 70. ${ROUTINE}`, PERIODE_3),
        ph(T1, "5 min", "Un grand rectangle de papier : où le plier pour que les deux moitiés se superposent ? Des élèves essaient : en long, en large… et en suivant la diagonale ? On plie pour voir.",
          "Laisse essayer la diagonale : le pliage montre qu'elle n'est pas un axe."),
        ph(T2, "20 min", "Par deux, des figures découpées : un carré, un cœur, une lettre H, un triangle quelconque. Chercher chaque pli qui fait se superposer les deux moitiés, le marquer au crayon. Pour une figure qu'on ne découpe pas : la décalquer et retourner le calque jusqu'à ce qu'il coïncide, ou poser un miroir debout. Puis la feuille « Les axes de symétrie » : tracer chaque axe en rouge, à la règle ; barrer les figures qui n'en ont pas.",
          "Aide : revenir au découpage et au pliage. Erreurs attendues : la diagonale du rectangle prise pour un axe ; un seul axe trouvé au carré ; l'axe tracé à main levée."),
        ph(T3, "10 min", "Ce qu'on retient : l'axe de symétrie partage la figure en deux parties qui se superposent quand on plie. Une figure peut avoir un axe, plusieurs — le rectangle en a deux, le carré quatre — ou aucun. On le trace à la règle.",
          "Complète la trace écrite de la séance 1 ; fait employer les mots justes : axe de symétrie, figure symétrique."),
        ph(T4, "5 min", "Les lettres capitales de l'alphabet : lesquelles ont un axe ? Lesquelles en ont deux ? On vérifie au miroir."),
      ]),
    // La séance détaillée du manuel : ses six phases, leur organisation et leur durée — ses cinq minutes de calcul mental en tête.
    seance("Compléter une figure sur quadrillage : l'axe suit les lignes",
      sauront("compléter une figure par symétrie sur un quadrillage, l'axe suivant une ligne du quadrillage : compter les carreaux de chaque point jusqu'à l'axe, en compter autant de l'autre côté, relier les points à la règle ; puis vérifier en pliant ou au calque."), 50, [
        ph(LM, "5 min", "En collectif, au procédé La Martinière : « Combien de dizaines dans 75 ? dans 38 ? », puis « Combien de centaines dans 456 ? dans 217 ? » Ensuite, des calculs en ligne, écrits : 37 = (… × 10) + … ; 512 = (… × 100) + … On met en commun.",
          "Fait dire les procédures : dans 75, il y a 7 dizaines, et il reste 5. Le calcul mental de la période : trouver le quotient et le reste d'une division, en commençant par 10 et par 100."),
        ph("Phase 2 – Individuel puis binômes", "10 min", "L'enseignant annonce le but de la séance ; on relit ensemble les mots de la dernière trace écrite. Chacun reçoit des figures sur quadrillage, avec des axes tracés : certaines sont symétriques par rapport à leur axe, d'autres non. Consigne : en rouge, repasser chaque axe qui est un vrai axe de symétrie. Puis, par deux : comparer, repérer les figures sur lesquelles on n'est pas d'accord, essayer de convaincre l'autre, et écrire l'argument qu'on lui a donné.",
          "Les fiches mêlent des constructions justes et fausses : longueurs mal reportées, figure glissée ou tournée au lieu d'être retournée, ou les deux. Les axes suivent les lignes du quadrillage ; certaines figures sont loin de l'axe. Erreur attendue : deux figures simplement glissées, prises pour symétriques, surtout quand elles ne touchent pas l'axe."),
        ph("Phase 3 – Collectif", "10 min", "Les figures sont projetées au tableau ; on débat des arguments. « Comment savoir si deux figures sont symétriques ? » Les réponses attendues : à l'œil ; en pliant sur l'axe, les deux côtés se superposent ; en décalquant un côté et en retournant le calque ; avec un miroir posé debout sur l'axe ; en comptant les carreaux.",
          "Mène le débat. Fait préciser le comptage : on compte quoi, depuis où, jusqu'où ? — de chaque point jusqu'à l'axe. C'est en pliant que l'élève voit le mieux son erreur : les deux côtés ne se superposent pas."),
        ph("Phase 4 – Travail individuel", "10 min", "Deux groupes. Ceux qui n'ont pas fait d'erreur en phase 2 : la feuille « Compléter par symétrie sur papier pointé ». Les autres : la feuille « Compléter par symétrie », sur quadrillage, où la figure terminée ressemble à un objet connu — un sapin, une fusée —, ce qui aide à la prévoir. Chacun complète les figures pour qu'elles soient symétriques par rapport à l'axe rouge.",
          "Fait dire la méthode point par point, sur les nœuds du quadrillage. Erreurs attendues : des tracés qui quittent les lignes, des nœuds reliés dans le désordre, une longueur mal reportée, un segment orienté du mauvais côté. Le manuel donne au premier groupe des figures abstraites ; ici, c'est le papier pointé, sans lignes, qui corse la tâche."),
        ph("Phase 5 – Collectif", "10 min", "La correction au tableau, les figures du quadrillage d'abord : on montre les nœuds utilisés ; le calque retourné vérifie dans quel sens part chaque segment. Puis les figures du papier pointé, de la même façon.",
          "Amène chacun à faire la procédure dans sa tête : de chaque nœud jusqu'à l'axe, puis autant de l'autre côté."),
        ph("Phase 6 – Collectif", "5 min", "La trace écrite s'ajoute aux précédentes : pour compléter une figure par symétrie sur un quadrillage, je compte combien de carreaux séparent chaque point de l'axe ; je place son symétrique à autant de carreaux, de l'autre côté de l'axe ; je relie les points à la règle, dans le même ordre. Un dessin l'accompagne.",
          "Écrit la trace avec la classe ; l'affiche, préparée, reste au mur."),
      ]),
    seance("Compléter une figure : l'axe de biais",
      sauront("compléter une figure par symétrie quand l'axe est oblique — le quadrillage posé de biais, puis l'axe en diagonale des carreaux —, en comptant à partir de l'axe et non du bord de la feuille ; vérifier au calque."), 50, [
        ph(LM, "10 min", `La table de 5 dans les deux sens — « 5 fois 7 », « 35, c'est 5 fois combien ? » —, puis « Dans 37, combien de fois 5 ? Combien reste-t-il ? » : le quotient et le reste, comme pour les dizaines. ${ROUTINE}`, PERIODE_3),
        ph(T1, "10 min", "Une figure à compléter sur quadrillage, découpée et collée de biais au tableau : l'axe n'est plus parallèle aux bords. « Qu'est-ce qui change ? » Rien, pour qui compte les carreaux le long des lignes du quadrillage, à partir de l'axe.",
          "Fait redire la méthode de la séance 3 ; montre qu'on ne se repère pas au bord de la feuille."),
        ph(T2, "20 min", "La feuille « Compléter par symétrie, le quadrillage de biais » : chacun découpe les figures, les colle de biais sur une feuille blanche, puis les complète. Ensuite, des figures dont l'axe coupe les carreaux en diagonale : de chaque nœud, on suit la diagonale des carreaux jusqu'à l'axe, puis on continue d'autant. On vérifie au calque, retourné sur l'axe.",
          "L'axe oblique demande de se représenter la figure dans sa tête : les erreurs sont nombreuses, et c'est attendu. Erreurs attendues : compter à partir du bord de la feuille ; garder l'orientation de la figure, comme si on la glissait. Aides : tourner la feuille pour remettre l'axe droit, puis la replacer ; le calque."),
        ph(T3, "5 min", "Ce qu'on retient : que l'axe soit droit ou de biais, on compte à partir de l'axe, jamais à partir du bord de la feuille. Quand l'axe coupe les carreaux en diagonale, on compte les carreaux traversés en diagonale."),
        ph(T4, "5 min", "Par deux, sur papier pointé : l'un place un point près d'un axe de biais, l'autre place son symétrique ; on vérifie au calque."),
      ]),
    seance("Compléter une figure sans quadrillage",
      sauront("compléter une figure par symétrie sur papier uni, en pliant et en piquant, ou en retournant un calque, puis vérifier en pliant : chaque point a son symétrique de l'autre côté de l'axe, à la même distance."), 50, [
        ph(LM, "10 min", `Les tables de 2, de 5 et de 10 dans les deux sens — « 45, c'est 5 fois combien ? » —, puis « Dans 23, combien de fois 2 ? Combien reste-t-il ? » ${ROUTINE}`, PERIODE_3),
        ph(T1, "10 min", "La moitié d'un dessin et son axe sur une feuille blanche — un sapin, une tête de clown. Plus de carreaux pour compter : comment faire ? Les idées de la classe : plier et repasser par transparence, contre la vitre ; piquer ; décalquer.",
          "Recueille les idées ; chacune s'essaie."),
        ph(T2, "20 min", "Sur des moitiés de figures préparées : le pliage et le piquage — on plie sur l'axe, on pique chaque sommet avec une épingle à travers les deux épaisseurs, on déplie, on relie les trous à la règle ; puis le calque — on décalque la moitié et l'axe, on retourne le calque en remettant l'axe sur l'axe, on repasse en appuyant. Enfin une figure à main levée, vérifiée en pliant.",
          "Les productions à main levée sont souvent approximatives : le pliage le montre. Aide : une feuille quadrillée glissée dessous, par transparence, pour qui a encore besoin de compter. Pour qui va vite : l'équerre et la règle graduée, comme au cycle 3."),
        ph(T3, "5 min", "Ce qu'on retient : sans quadrillage, le pliage, le piquage ou le calque retourné donnent l'autre moitié ; chaque point a son symétrique de l'autre côté de l'axe, à la même distance. On vérifie toujours en pliant."),
        ph(T4, "5 min", "Réinvestir : des décorations découpées sur le pli pour la classe, des masques pour le carnaval ; en arts plastiques, un motif symétrique."),
      ]),
    seance("Évaluation et remédiations",
      sauront("compléter seuls une figure par symétrie, tracer les axes d'une figure, repérer une construction fausse et employer les mots axe de symétrie et figure symétrique ; ceux qui en ont besoin reprennent le pliage, le calque et les déplacements sur quadrillage."), 45, [
        ph(LM, "10 min", `Multiplier par 10 ou par 100, et l'inverse — « 100 fois 8 », « Combien de dizaines dans 64 ? » ${ROUTINE}`, PERIODE_3),
        ph("Évaluation", "20 min", "La feuille « Compléter par symétrie — évaluation », puis la feuille « Les axes de symétrie — évaluation ». Enfin, sur des constructions fausses que l'enseignant a dessinées, dire ce qui ne va pas, avec les mots axe de symétrie et figure symétrique.",
          "Observe sans aider : qui compte à partir du bord, qui glisse la figure au lieu de la retourner, qui relie les nœuds dans le désordre."),
        ph("Remédiations", "15 min", "Pour qui en a besoin : revenir au pliage et au calque, sur des figures qui touchent l'axe ; se repérer sur le quadrillage avec la feuille « Le code de la bille » : écrire le chemin, case par case. Les autres : des figures loin de l'axe, ou de biais. Ensuite, la symétrie revient en arts plastiques et dans les décorations de la classe.",
          "Reprend avec la manipulation ce que l'évaluation a montré."),
      ]),
  ],
};

// ── Les feuilles des séances ──────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
const martiniere = (seance: number, objectif: string, tables: number[] = REGLAGES_MARTINIERE.tables): FeuilleAFabriquer => {
  const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: "CE2", objectifs: [objectif], revision: false, tables, forme: "oral", ardoises: true };
  const o = objectifParId(objectif);
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${o ? libelleTravaille(o, tables) : objectif}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

/** Une feuille de l'atelier « Géométrie », à ses réglages : il la refait avec les mêmes et le même tirage. */
const geometrie = (seance: number, titre: string, r: Partial<ReglagesGeometrie>): FeuilleAFabriquer => {
  const reglages: ReglagesGeometrie = { ...REGLAGES_GEOMETRIE, classe: "CE2", ...r };
  return {
    seance, atelier: "geometrie", titre,
    fabriquer: (g) => ({ html: htmlGeometrie(reglages, g), style: STYLE_FEUILLE + STYLE_GEOMETRIE, refaire: { geometrie: reglages } }),
  };
};

/** Une feuille de l'atelier « Se repérer, se déplacer » : ses classes s'arrêtent au CE1, que la remédiation reprend. */
const deplacements = (seance: number, titre: string, r: Partial<ReglagesDeplacements>): FeuilleAFabriquer => {
  const reglages: ReglagesDeplacements = { ...REGLAGES_DEPLACEMENTS, ...r };
  return {
    seance, atelier: "deplacements", titre,
    fabriquer: (g) => ({ html: htmlDeplacements(reglages, g), style: STYLE_FEUILLE + STYLE_DEPLACEMENTS, refaire: { deplacements: reglages } }),
  };
};

const FEUILLES: FeuilleAFabriquer[] = [
  // Le calcul mental de chaque séance : multiplier par 10 et par 100, la table de 10, puis le quotient et le reste par 5, par 2.
  martiniere(0, "ce2-fois-10-100"),
  martiniere(1, "ce2-table-multiplication", [10]),
  martiniere(2, "ce2-fois-10-100"),
  martiniere(3, "ce2-table-multiplication", [5]),
  martiniere(4, "ce2-table-multiplication", [2, 5, 10]),
  martiniere(5, "ce2-fois-10-100"),
  geometrie(0, "Figures symétriques ou non ?", { exercice: "axes", combien: 8 }),
  geometrie(1, "Les axes de symétrie", { exercice: "axes", combien: 12 }),
  // La séance du manuel : deux niveaux de fiches pour la phase 4 — le papier pointé pour ceux qui ont réussi, les figures qui ressemblent à un objet pour les autres.
  geometrie(2, "Compléter par symétrie sur papier pointé", { exercice: "symetrie", support: "pointe", combien: 2 }),
  geometrie(2, "Compléter par symétrie", { exercice: "symetrie", support: "quadrille", combien: 2 }),
  geometrie(3, "Compléter par symétrie, le quadrillage de biais", { exercice: "symetrie", support: "quadrille", combien: 4 }),
  geometrie(5, "Compléter par symétrie — évaluation", { exercice: "symetrie", support: "quadrille", combien: 3 }),
  geometrie(5, "Les axes de symétrie — évaluation", { exercice: "axes", combien: 8 }),
  deplacements(5, "Le code de la bille", { exercice: "fusee", classe: "CE1", mode: "coder", combien: 4 }),
];

/** Ce qu'il faut préparer, séance par séance ; les feuilles sont nommées après, sauf la fiche du calcul mental. */
const MATERIEL = [
  "Les ardoises ; des objets et des photos, symétriques ou non — un papillon, une feuille d'arbre, un masque, une façade, un panneau — ; de la peinture, "
    + "des feuilles à plier, des ciseaux ; du papier calque",
  "Les ardoises ; un grand rectangle de papier ; par deux, des figures découpées à plier — un carré, un cœur, une lettre H, un triangle quelconque — ; "
    + "du papier calque, des miroirs ; la règle",
  "Les ardoises ; le tableau numérique, pour projeter les figures ; du papier calque, des ciseaux, des miroirs ; pour la phase 2, des figures sur "
    + "quadrillage avec leurs axes, symétriques ou non, à préparer ; l'affiche de la trace écrite, avec son dessin, à préparer",
  "Les ardoises ; des ciseaux, de la colle et des feuilles blanches, pour poser le quadrillage de biais ; des figures à compléter dont l'axe coupe les "
    + "carreaux en diagonale, à préparer ; du papier calque ; du papier pointé",
  "Les ardoises ; des moitiés de figures sur papier uni, avec leur axe, à préparer ; des épingles ou la pointe du compas ; du papier calque ; la règle",
  "Les ardoises ; des constructions fausses à corriger, à préparer ; pour la remédiation, du papier calque, des miroirs, des figures découpées à plier",
];

/** Les feuilles et le matériel de la séquence. */
export function planSymetrieCe2(): PlanDesFeuilles {
  const feuilles = [...FEUILLES].sort((a, b) => a.seance - b.seance);
  const materiel = MATERIEL.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s && x.atelier !== "martiniere").map((x) => `« ${x.titre} »`);
    if (!f.length) return `${debut}.`;
    const liste = f.length > 1 ? `${f.slice(0, -1).join(", ")} et ${f[f.length - 1]}` : f[0];
    return `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${liste}.`;
  });
  return { feuilles, materiel };
}
