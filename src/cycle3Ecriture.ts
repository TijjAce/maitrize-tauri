// L'écriture au cours moyen : copier, écrire pour réfléchir et apprendre,
// produire des écrits variés, écrire chaque jour, préparer et améliorer ses
// textes.
//
// Bâties, en le disant, sur le programme de français du cycle 3 (2025) et ses
// exemples de réussite du CM1 et du CM2 : les livrets d'accompagnement de
// français s'arrêtent au CE2. Le programme demande d'écrire tous les jours
// — copie, écrits courts, dictées, productions personnelles —, des séances
// dédiées à la production — planification, brouillon, révision —, le
// regard des pairs et l'écriture collective ; au cours moyen, la
// normalisation porte sur l'accord dans le groupe nominal, l'accord du sujet
// et du verbe, l'attribut du sujet. Les feuilles viennent de
// ecritureCoursMoyen.ts.

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { PROGRAMME_FRANCAIS_C3 } from "./cycle3Langue";
import { REGLAGES_ECRITURE_CM, STYLE_ECRITURE_CM, htmlEcritureCM, type ExerciceEcritureCM } from "./ecritureCoursMoyen";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
const entrainement = (titre: string, objectif: string, activite: string, retenir: string) =>
  seance(titre, sauront(objectif), 30, [ph(T1, "5 min", "Ce qu'on a retenu, rappelé par les élèves ; l'objectif du jour."), ph(T4, "20 min", activite), ph(T3, "5 min", retenir)]);
const rituel = (titre: string, objectif: string, duree: number, activite: string) => seance(titre, sauront(objectif), duree, [ph(T4, `${duree} min`, activite)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);
const ECRIRE_ENSEMBLE = "L'adulte écrit devant les élèves en pensant à voix haute, ses hésitations comprises ; les écrits se lisent, se commentent et se comparent.";

// ── Copier ────────────────────────────────────────────────────────────────

const copie = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `copie-${classe.toLowerCase()}`, nom: `Copier avec des stratégies ; présenter son texte (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: `Copier et produire des textes ; acquérir des stratégies de copie. Exemples de réussite : recopier de façon lisible, régulière et soignée un texte d'une ${cm2 ? "vingtaine" : "quinzaine"} de lignes ou de vers, rapidement et sans erreur d'orthographe ni de ponctuation — en copie différée, au verso d'une feuille — ; ${cm2 ? "présenter un texte personnel en veillant à sa lisibilité et à sa mise en forme ; utiliser le clavier, avec é, è, à" : "valoriser un texte qu'on a rédigé par une mise en forme lisible et soignée ; écrire au clavier"}. La copie est quotidienne : poèmes, leçons, extraits.`,
    seances: [
      trois("Les stratégies de copie", "copier par groupes de mots, de mémoire, et vérifier.",
        "Deux élèves copient la même phrase : l'un lettre à lettre, l'autre par groupes de mots. Qui va le plus vite, sans erreur ?",
        "Apprendre la copie différée : lire un groupe de mots, le dire dans sa tête, le cacher, l'écrire de mémoire, vérifier ; copier un poème au verso de la feuille ; compter ses erreurs.",
        "Ce qu'on retient : je copie par groupes de mots, de mémoire, puis je vérifie mot à mot.", "L'adulte montre la copie différée à voix haute ; il ne corrige pas à la place de l'élève : l'élève retrouve ses erreurs."),
      rituel("Copier vite et bien (chaque jour)", "copier un texte court, lisiblement et sans erreur.", 15,
        "Chaque jour, une copie courte en copie différée : un poème, une leçon, une phrase du livre lu ; de temps en temps, chronométrée."),
      trois("Mettre en valeur son texte", "recopier un texte au propre, lisible et soigné, à la main ou au clavier.",
        "Un texte qu'on a écrit, à recopier au propre pour l'afficher ou l'offrir : comment le rendre lisible et beau ?",
        `Recopier son texte au propre : le titre, les marges, les paragraphes, une écriture régulière ; ou le taper au clavier${cm2 ? ", avec é, è, à" : ", sans caractères spéciaux"}.`,
        "Ce qu'on retient : un texte soigné se lit facilement et fait honneur à son auteur."),
      evaluation(`copier un texte d'une ${cm2 ? "vingtaine" : "quinzaine"} de lignes, en copie différée, sans erreur`, "Ensuite, la copie quotidienne continue : poèmes, leçons, extraits."),
    ],
  };
};

// ── Écrire pour réfléchir et apprendre ────────────────────────────────────

const ecritsDeTravail = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `ecrits-travail-${classe.toLowerCase()}`, nom: `Écrire pour réfléchir, apprendre et mémoriser (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Écrire pour comparer deux documents ; produire des écrits réflexifs courts pour expliquer un point de vue intégrant plusieurs documents ; reformuler l'essentiel d'une leçon, y compris par un schéma ; produire des écrits courts pour appliquer une règle de grammaire ou réemployer le lexique. Exemples de réussite : lister les ressemblances et les différences entre des documents de toutes les disciplines ; relier ses idées — l'ajout, la cause, l'opposition — ; comparer son schéma à ceux des autres pour l'améliorer ; manipuler les groupes nominaux de phrases inventées pour jouer avec les accords."
      : "Écrire pour repérer et trier les informations pertinentes ; produire des écrits réflexifs courts pour expliquer un point de vue ; reformuler, avec l'aide du professeur et des pairs, l'essentiel d'une leçon ; produire des écrits courts pour appliquer une règle de grammaire ou réemployer le lexique. Exemples de réussite : surligner, classer en listes les indications de temps, de lieu, les caractéristiques d'un personnage ; répondre par une ou deux phrases à « Que penses-tu de… ? » ; proposer une phrase, une liste de mots pour l'essentiel d'une leçon, et construire le bilan collectif ; réemployer les synonymes vus en classe.",
    seances: [
      cm2
        ? trois("Comparer deux textes", "écrire les ressemblances et les différences entre deux textes.",
          "Une fable et un récit qui parlent tous deux d'entraide : en quoi se ressemblent-ils ?",
          "Lister au brouillon les ressemblances et les différences — le genre, les personnages, ce qui arrive, la leçon — ; les classer dans le tableau ; écrire ce que les deux textes apprennent.",
          "Ce qu'on retient : comparer, c'est dire ce qui rapproche et ce qui distingue, avec des mots qui relient : comme, alors que, au contraire.")
        : trois("Repérer et trier", "repérer et classer les informations d'un texte.",
          "Un texte et trois couleurs : que peut-on chercher ?",
          "Surligner les indications de temps, les lieux, ce qu'on apprend d'un personnage ; les classer en listes ; lister les étapes du récit.",
          "Ce qu'on retient : écrire une liste aide à comprendre et à retenir."),
      trois(cm2 ? "Un point de vue nuancé" : "Expliquer son point de vue", cm2 ? "donner un avis nuancé, appuyé sur plusieurs documents." : "donner son avis en quelques phrases et le justifier.",
        cm2 ? "« Je pense que… pourtant… » : à quoi sert ce « pourtant » ?" : "« Que penses-tu de… ? » : comment répondre en quelques phrases ?",
        cm2 ? "Écrire deux à quatre phrases pour donner son avis, le nuancer et s'appuyer sur deux textes ; lire les réponses, les comparer, les améliorer."
          : "Écrire deux à quatre phrases pour donner son avis et le justifier par le texte ; lire les réponses, les comparer.",
        cm2 ? "Ce qu'on retient : un avis nuancé pèse le pour et le contre ; je cite mes documents." : "Ce qu'on retient : Je pense que… parce que… ; je m'appuie sur le texte."),
      entrainement(cm2 ? "La leçon en un schéma" : "Ce que j'ai appris", cm2 ? "reformuler l'essentiel d'une leçon en phrases et en schéma." : "reformuler l'essentiel d'une leçon avec ses mots.",
        cm2 ? "À la fin d'une leçon, écrire l'essentiel en une phrase et en un schéma ; comparer son schéma à ceux des autres et chercher ce qui manque ; construire le bilan collectif."
          : "À la fin d'une leçon, écrire l'essentiel en une phrase, les mots importants, un exemple ; comparer avec son voisin ; construire le bilan collectif.",
        "Ce qu'on retient : redire la leçon avec mes mots, c'est me l'approprier."),
      rituel("Les écrits courts (chaque semaine)", "appliquer une règle ou réemployer des mots appris en quelques phrases.", 20,
        `Des écrits courts, d'une à cinq phrases, pour appliquer une règle — l'accord, le pronom, ${cm2 ? "le sujet inversé, l'attribut, l'incise" : "le complément, le participe passé"} — ou réemployer les mots appris ; relus, puis corrigés.`),
    ],
  };
};

// ── Produire des écrits variés ────────────────────────────────────────────

const RACONTER_EXPLIQUER_CM1: Demarche = {
  id: "raconter-expliquer-cm1", nom: "Raconter, expliquer (CM1)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Découvrir et explorer des situations variées d'écriture : raconter, expliquer. Exemples de réussite : raconter en quelques lignes une sortie de la classe, élaborer une notice de construction, en respectant la chronologie des évènements ; réfléchir à un univers de référence — le conte, les grands explorateurs, le cycle de vie des plantes — et s'adapter à la visée de l'écrit ; mobiliser dès le brouillon les outils d'écriture.",
  seances: [
    trois("Raconter : préparer son récit", "préparer un récit au brouillon et écrire un premier jet.",
      "Une sortie de la classe, ou un récit à inventer dans un univers connu — le conte, les explorateurs — : qu'allons-nous raconter ?",
      "Au brouillon : qui, où, quand, les évènements dans l'ordre, les mots utiles ; écrire le premier jet en sautant une ligne.",
      "Ce qu'on retient : un récit suit l'ordre des évènements, avec des connecteurs de temps.", ECRIRE_ENSEMBLE),
    trois("Raconter : améliorer son récit", "améliorer son récit avec la grille de relecture et les conseils d'un camarade.",
      "Deux premiers jets lus à la classe : qu'est-ce qui marche ? Que faudrait-il changer ?",
      "Relire avec la grille ; recevoir le conseil d'un camarade ; récrire un passage ; recopier au propre.",
      "Ce qu'on retient : un texte se construit en plusieurs versions."),
    trois("Expliquer : la notice", "écrire une notice de fabrication qu'un camarade peut suivre.",
      "Une notice mal faite : le camarade qui la suit se trompe. Pourquoi ?",
      "Écrire une notice : le matériel, les étapes dans l'ordre, une action par étape, un schéma ; un camarade la teste, et l'on corrige ce qui l'a bloqué.",
      "Ce qu'on retient : une explication suit l'ordre des étapes, avec des mots précis."),
    evaluation("raconter un évènement en respectant l'ordre, ou expliquer une fabrication", "Ensuite, raconter et expliquer dans toutes les disciplines : le compte rendu de sortie, l'expérience de sciences."),
  ],
};

const DECRIRE_DIALOGUER_CM2: Demarche = {
  id: "decrire-dialoguer-cm2", nom: "Décrire, dialoguer (CM2)", famille: "Français",
  source: PROGRAMME_FRANCAIS_C3,
  resume: "Découvrir et manipuler des situations variées d'écriture : décrire, dialoguer. Exemples de réussite : intégrer une ou plusieurs phrases de description en choisissant le temps approprié ; distinguer le récit du dialogue, ponctuer correctement ses passages dialogués, indiquer qui parle et faire des incises ; enrichir des passages de son texte d'une courte description, d'un petit passage dialogué, sur les conseils des pairs et de l'enseignant.",
  seances: [
    trois("Décrire un lieu", "décrire un paysage avec un ordre et des mots précis, au temps qui convient.",
      "Une photographie de paysage : que voit-on, de près à loin ?",
      "Lister les mots — noms, adjectifs, compléments du nom, verbes qui situent — ; écrire la description à l'imparfait, comme dans un récit.",
      "Ce qu'on retient : un ordre de description, des mots précis, l'imparfait dans le récit.", ECRIRE_ENSEMBLE),
    trois("Écrire un dialogue", "écrire un dialogue ponctué, où l'on sait qui parle.",
      "Un dialogue du roman lu : comment sait-on qui parle ?",
      "Observer les guillemets, les tirets, les incises ; écrire le dialogue de deux personnages, au moins six répliques ; relire la ponctuation avec la liste.",
      "Ce qu'on retient : les guillemets, le tiret à chaque changement de personnage, les incises."),
    trois("Enrichir son récit", "enrichir un récit d'une description et d'un dialogue.",
      "Un récit sans description ni dialogue : que lui manque-t-il ?",
      "Écrire la suite d'un récit, ou reprendre le sien, en y ajoutant une courte description et un petit passage dialogué, sur les conseils d'un camarade.",
      "Ce qu'on retient : la description et le dialogue font vivre le récit."),
    evaluation("écrire une description et un dialogue dans un récit", "Ensuite, des récits plus longs, de plus en plus autonomes."),
  ],
};

const ecrireChaqueJour = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `ecrire-chaque-jour-${classe.toLowerCase()}`, nom: `Écrire chaque jour des textes personnels (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Écrire au quotidien des textes personnels : nuancer un avis, imaginer une suite de texte enrichie d'un court dialogue ou d'une description, formuler les étapes d'une expérience de sciences. Exemples de réussite : « Je pense que… pourtant… Je ressens… D'un autre côté… » ; « Nous avons rencontré tel problème… Nous avons supposé que… Nous avons fait… Nous avons observé… Nous avons conclu que… »."
      : "Écrire au quotidien des textes personnels : donner son avis, imaginer une suite de texte, formuler des hypothèses. Exemples de réussite : des écrits courts très fréquents pour exprimer un point de vue, une émotion — « Je pense que… Je ressens… » — ; formuler une hypothèse face à un problème de sciences — « Je suppose que… ».",
    seances: [
      seance("Le carnet d'écriture", sauront("écrire chaque jour quelques lignes personnelles dans son carnet."), 30, [
        ph(T1, "5 min", "Chacun reçoit son carnet d'écriture : on y écrit chaque jour, un peu, pour soi d'abord."),
        ph(T4, "20 min", cm2 ? "Écrire un avis nuancé — pourtant, d'un autre côté — ; une émotion ; les étapes d'une expérience de sciences : nous avons supposé, fait, observé, conclu."
          : "Écrire un avis, une émotion — Je pense que… Je ressens… — ; une hypothèse en sciences — Je suppose que… — ; la suite d'une histoire."),
        ph(T3, "5 min", "Ce qu'on retient : écrire chaque jour rend l'écriture facile."),
      ]),
      trois("Imaginer la suite", cm2 ? "imaginer la suite d'un récit, avec un dialogue et une description." : "imaginer la suite d'un récit en gardant ses personnages.",
        "Le début d'un récit : que va-t-il arriver ?",
        `Écrire la suite en gardant les personnages et le temps${cm2 ? ", avec un court dialogue et une description" : ""} ; lire quelques suites à la classe.`,
        "Ce qu'on retient : une suite cohérente garde les personnages, le lieu et le temps du début."),
      rituel("Écrire chaque jour", "écrire quelques lignes personnelles chaque jour.", 10,
        "Quelques lignes dans le carnet d'écriture : un avis, une émotion, une hypothèse, la suite d'une histoire."),
      entrainement("Partager ses écrits", "lire un de ses écrits et recevoir un avis bienveillant.",
        "Quelques volontaires lisent un texte de leur carnet ; on dit ce qu'on a aimé, puis on donne un conseil.",
        "Ce qu'on retient : partager ses écrits donne envie d'écrire encore."),
    ],
  };
};

const reviser = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `reviser-${classe.toLowerCase()}`, nom: `Préparer et améliorer son texte : brouillon, cohérence, codes de l'écrit (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Utiliser le brouillon pour préparer son texte ; appliquer les principes de la cohérence textuelle ; faire preuve d'autonomie dans le respect des codes de l'écrit ; améliorer son texte à partir des pistes de l'enseignant, des pairs et de son autoévaluation. Exemples de réussite : les connecteurs logiques et temporels ; les pronoms démonstratifs contre les répétitions ; le sujet inversé et l'attribut accordés ; la virgule de l'apostrophe, de l'incise, de la juxtaposition ; la lecture différée de son texte avec une grille de relecture."
      : "Utiliser le brouillon pour préparer son texte ; exercer sa vigilance quant aux codes de l'écrit ; prendre conscience des composantes de la cohérence textuelle ; améliorer son texte à partir des pistes de l'enseignant et des pairs. Exemples de réussite : des chaînes anaphoriques cohérentes, chaque pronom ayant son référent ; le verbe accordé avec le sujet ; les phrases délimitées, la ponctuation forte choisie pour son effet ; la virgule qui énumère ou qui insiste ; formuler et écouter des conseils, utiliser les outils d'écriture et la grille de relecture.",
    seances: [
      trois("Le brouillon", "préparer un texte au brouillon : idées, plan, mots utiles.",
        "Le brouillon d'un écrivain, avec ses ratures : à quoi sert-il ?",
        "Préparer un texte au brouillon : la liste des idées, le plan, les mots utiles, les outils — dictionnaire, fiches, cahier — ; écrire le premier jet en sautant une ligne.",
        "Ce qu'on retient : le brouillon sert à chercher, à essayer, à corriger.", ECRIRE_ENSEMBLE),
      trois("La cohérence du texte", cm2 ? "éviter les répétitions et relier ses phrases par des connecteurs." : "remplacer les répétitions par des reprises claires.",
        "Un texte plein de répétitions : qu'est-ce qui gêne ?",
        `Remplacer les répétitions par des pronoms ou d'autres noms ; vérifier que chaque pronom renvoie à quelqu'un ; garder le même temps${cm2 ? " ; choisir les connecteurs ; employer celui-ci, celle de" : ""}.`,
        "Ce qu'on retient : les reprises et les connecteurs rendent le texte clair."),
      trois("Les codes de l'écrit", "relire la ponctuation et les accords de son texte.",
        "Une phrase sans ponctuation ni accord : que faut-il corriger ?",
        cm2 ? "Ponctuer : l'apostrophe, l'incise, la juxtaposition ; vérifier les accords — le groupe nominal, le verbe avec un sujet même inversé, l'attribut."
          : "Délimiter les phrases et choisir la ponctuation forte selon l'effet voulu ; la virgule qui énumère, qui insiste ; vérifier les accords dans le groupe nominal et entre le sujet et le verbe.",
        "Ce qu'on retient : je relis une chaîne d'accords à la fois."),
      trois("Améliorer son texte", "améliorer son texte avec la grille de relecture.",
        "Mon premier jet et la grille de relecture de la classe.",
        `Relire avec la grille, seul${cm2 ? " le lendemain, à froid," : ""} puis avec un binôme ; choisir ce qu'on améliore ; récrire le passage ; comparer les deux versions.`,
        "Ce qu'on retient : mon texte a progressé d'une version à l'autre."),
      evaluation("relire et améliorer un texte avec la grille", "Ensuite, chaque écrit long passe par le brouillon et la relecture."),
    ],
  };
};

export const DEMARCHES_ECRITURE_CM: Demarche[] = [
  copie("CM1"), ecritsDeTravail("CM1"), RACONTER_EXPLIQUER_CM1, ecrireChaqueJour("CM1"), reviser("CM1"),
  copie("CM2"), ecritsDeTravail("CM2"), DECRIRE_DIALOGUER_CM2, ecrireChaqueJour("CM2"), reviser("CM2"),
];

/** La séquence d'une compétence d'écriture du cours moyen ; en minuscules sans accents. */
export function demarcheDeLEcritureCM(classe: string, cg: string, comp: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/ecrire a la main/.test(cg)) return `copie-${classe}`;
  if (/ecrire pour reflechir/.test(cg)) return `ecrits-travail-${classe}`;
  if (/produire des ecrits varies/.test(cg)) {
    if (/situations variees/.test(comp)) return classe === "cm1" ? "raconter-expliquer-cm1" : "decrire-dialoguer-cm2";
    if (/textes personnels/.test(comp)) return `ecrire-chaque-jour-${classe}`;
    return `reviser-${classe}`;
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const ew = (seance: number, titre: string, classe: "CM1" | "CM2", exercice: ExerciceEcritureCM, texte = ""): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ECRITURE_CM, classe, exercice, texte };
  return { seance, atelier: exercice === "copie" ? "cursive" : "ecrire", titre, fabriquer: (g) => ({ html: htmlEcritureCM(reglages, g), style: STYLE_FEUILLE + STYLE_ECRITURE_CM }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "copie-cm1": {
    feuilles: [ew(0, "Je copie un poème", "CM1", "copie", "pommier-cm1"), ew(3, "Je copie une fable — évaluation", "CM1", "copie", "lion-rat-cm2")],
    materiel: ["Un poème à copier ; un cache", "Le cahier de copie ; un poème, une leçon ou un extrait", "Le texte à mettre au propre ; un ordinateur", "Les feuilles d'évaluation ; un chronomètre"],
  },
  "copie-cm2": {
    feuilles: [ew(0, "Je copie un poème", "CM2", "copie", "demain-cm2"), ew(3, "Je copie une fable — évaluation", "CM2", "copie", "lion-rat-cm2")],
    materiel: ["Un poème à copier ; un cache", "Le cahier de copie ; un poème, une leçon ou un extrait", "Le texte à mettre au propre ; un ordinateur", "Les feuilles d'évaluation ; un chronomètre"],
  },
  "ecrits-travail-cm1": {
    feuilles: [ew(0, "Je trie les informations", "CM1", "trier"), ew(1, "Je donne mon point de vue", "CM1", "point-de-vue"), ew(2, "Ce que j'ai appris", "CM1", "bilan"), ew(3, "Les écrits courts", "CM1", "ecrits-courts")],
    materiel: ["Un texte et trois surligneurs", "Les textes lus en classe", "Le cahier de leçons", "Le cahier d'écrivain"],
  },
  "ecrits-travail-cm2": {
    feuilles: [ew(0, "Je compare deux textes", "CM2", "comparer"), ew(1, "Je donne mon point de vue", "CM2", "point-de-vue"), ew(2, "Ce que j'ai appris", "CM2", "bilan"), ew(3, "Les écrits courts", "CM2", "ecrits-courts")],
    materiel: ["Les deux textes, projetés", "Les textes lus en classe", "Le cahier de leçons", "Le cahier d'écrivain"],
  },
  "raconter-expliquer-cm1": {
    feuilles: [ew(0, "Je raconte", "CM1", "raconter"), ew(1, "Je relis et j'améliore mon texte", "CM1", "relecture"), ew(2, "La notice de fabrication", "CM1", "expliquer"), ew(3, "Je raconte — évaluation", "CM1", "raconter")],
    materiel: ["Les photographies de la sortie, ou un univers de conte", "Les premiers jets ; la grille de relecture", "Du papier, des ciseaux, de quoi fabriquer", "Les feuilles d'évaluation"],
  },
  "decrire-dialoguer-cm2": {
    feuilles: [ew(0, "Je décris un paysage", "CM2", "decrire"), ew(1, "J'écris un dialogue", "CM2", "dialoguer"), ew(2, "J'imagine la suite", "CM2", "suite"), ew(3, "Je décris un paysage — évaluation", "CM2", "decrire")],
    materiel: ["Une photographie de paysage projetée", "Un dialogue du roman lu", "Le début d'un récit", "Les feuilles d'évaluation"],
  },
  "ecrire-chaque-jour-cm1": {
    feuilles: [ew(0, "Je donne mon point de vue", "CM1", "point-de-vue"), ew(1, "J'imagine la suite", "CM1", "suite")],
    materiel: ["Un carnet d'écriture par élève", "Le début d'un récit", "Le carnet d'écriture", "Le carnet d'écriture"],
  },
  "ecrire-chaque-jour-cm2": {
    feuilles: [ew(0, "Je donne mon point de vue", "CM2", "point-de-vue"), ew(1, "J'imagine la suite", "CM2", "suite")],
    materiel: ["Un carnet d'écriture par élève", "Le début d'un récit", "Le carnet d'écriture", "Le carnet d'écriture"],
  },
  "reviser-cm1": {
    feuilles: [ew(0, "Je prépare mon récit", "CM1", "raconter"), ew(1, "La cohérence du texte", "CM1", "coherence"), ew(2, "Les écrits courts", "CM1", "ecrits-courts"), ew(3, "Je relis et j'améliore mon texte", "CM1", "relecture"), ew(4, "Je relis et j'améliore — évaluation", "CM1", "relecture")],
    materiel: ["Le brouillon d'un écrivain, projeté ; le dictionnaire", "Un texte plein de répétitions, au tableau", "Une phrase sans ponctuation ni accord, au tableau", "Les premiers jets ; la grille de relecture", "Un texte à améliorer ; la grille"],
  },
  "reviser-cm2": {
    feuilles: [ew(0, "Je prépare mon récit", "CM2", "raconter"), ew(1, "La cohérence du texte", "CM2", "coherence"), ew(2, "Les écrits courts", "CM2", "ecrits-courts"), ew(3, "Je relis et j'améliore mon texte", "CM2", "relecture"), ew(4, "Je relis et j'améliore — évaluation", "CM2", "relecture")],
    materiel: ["Le brouillon d'un écrivain, projeté ; le dictionnaire", "Un texte plein de répétitions, au tableau", "Une phrase sans ponctuation ni accord, au tableau", "Les premiers jets de la veille ; la grille de relecture", "Un texte à améliorer ; la grille"],
  },
};

export const estUneDemarcheDEcritureCM = (id: string) => id in PLANS;

export function planDeLEcritureCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
